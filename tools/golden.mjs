// Vergleich zweier Fassungen der App: dieselben Partien, derselbe Zeitpunkt,
// dieselbe Zeitzone — und dann jede Rechnung und jede Ansicht nebeneinander.
//
//   node tools/golden.mjs                       aktueller Bau gegen HEAD
//   node tools/golden.mjs --basis=b44d78f       gegen einen bestimmten Stand
//   node tools/golden.mjs --schnell             nur Szenario S1, ohne Story-Blätter
//
// Wozu: ein Umbau, der „nichts ändern" soll, muss das beweisen. Die Suiten
// prüfen Zusicherungen, die jemand aufgeschrieben hat; dieser Vergleich prüft
// alles, was die App zeigt und rechnet, auch das, woran niemand gedacht hat.
// Die Referenz ist nicht eingecheckt: `index.html` ist in jedem Commit schon
// das gebaute Ergebnis, `git show <basis>:index.html` holt sie zurück. Der
// Abzug der Basis liegt danach in `.golden/` (nicht versioniert) und wird
// wiederverwendet, solange Basis und Werkzeug gleich sind.
//
// Ein Unterschied wird NIE durch eine neue Normalisierung weggeregelt. Er
// heißt: der Code ändert etwas, oder die Stelle wird nicht vereinheitlicht.
// Normalisiert wird nur, was zwischen zwei Läufen DERSELBEN Fassung schwankt
// (Blob-Adressen) oder für den Vergleich zu groß ist (Daten-Adressen).
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--'+k+'=')); return a ? a.slice(k.length+3) : d; };
const SCHNELL = process.argv.includes('--schnell');
const BASIS = arg('basis', 'HEAD');
const NEU = arg('neu', fs.existsSync(path.join(ROOT,'dist/index.html')) ? path.join(ROOT,'dist/index.html') : path.join(ROOT,'index.html'));

const {createHarness, fixtures} = require('./performance.cjs');
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

// ── Szenarien ────────────────────────────────────────────────────────────
// Zeitpunkte absolut in UTC, gelesen in Europe/Berlin: Tagesgrenze,
// Wochenwechsel, Monatswechsel samt 15-Uhr-Slot und Winterzeit sind genau
// die Stellen, an denen UTC-Tag und Ortstag auseinanderlaufen.
const P = fixtures.players, IDS = fixtures.ids;
const SZENARIEN = [
  {id:'S1', jetzt:Date.UTC(2026,7,26,19,0), voll:true},
  {id:'S2', jetzt:Date.UTC(2026,7,30,22,30)},   // Montag 31.08., 00:30 Berlin
  {id:'S3', jetzt:Date.UTC(2026,8,1,13,1)},     // 01.09., 15:01 Berlin
  {id:'S4', jetzt:Date.UTC(2026,7,26,19,0), daten:{     // ein Ruheständler, ein Ausgeblendeter
    players:P.map((p,i) => i===3 ? {...p, retired_at:'2026-07-15T12:00:00.000Z'} : i===11 ? {...p, hidden:true} : p)}},
  {id:'S5', jetzt:Date.UTC(2026,7,26,19,0), daten:{matches:[], seasons:[]}},
  {id:'S6', jetzt:Date.UTC(2026,9,25,11,0)},    // 25.10., Winterzeit
].filter(s => !SCHNELL || s.id === 'S1');

// ── Vorspann: Attrappe mit Schreibprotokoll und Blob-Register ────────────
// Jeder Schreibzugriff auf die Datenbank wird mitgeschrieben: ein Umbau darf
// auch dort nichts Neues verlangen. Blob-Adressen bekommen eine Kennung aus
// ihrem Inhalt, weil `URL.createObjectURL` bei jedem Lauf eine neue vergibt.
const VORAPP = `(() => {
  window.__schreib = [];
  const kette = (pfad) => new Proxy(function(){}, {
    get(_, p){ return p === 'then' ? undefined : kette(pfad.concat(String(p))); },
    apply(_, __, args){
      const letzte = pfad[pfad.length-1];
      if(['insert','update','upsert','delete','rpc'].includes(letzte)) {
        let a; try { a = JSON.stringify(args); } catch(e) { a = '?'; }
        window.__schreib.push(pfad.join('.') + '(' + a + ')');
      }
      return kette(pfad.concat('()'));
    }
  });
  window.supabase = {createClient: () => ({
    from: t => kette(['from:'+t]), channel: () => kette(['channel']),
    rpc: (...a) => { window.__schreib.push('rpc(' + JSON.stringify(a) + ')'); return kette(['rpc()']); },
    removeChannel(){} })};
  window.__blobs = [];
  const orig = URL.createObjectURL.bind(URL);
  URL.createObjectURL = b => { const u = orig(b); window.__blobs.push([u, b]); return u; };
})();`;

// ── Serialisieren im Browser ─────────────────────────────────────────────
// Map, Set, NaN, ±Infinity, -0 und undefined überleben JSON nicht und
// würden als gleich gelten, obwohl sie es nicht sind.
const SER = `window.__ser = (wert) => {
  const gesehen = new WeakSet();
  const geh = v => {
    if(v === undefined) return {'§':'undefined'};
    if(typeof v === 'number'){
      if(Number.isNaN(v)) return {'§':'NaN'};
      if(!Number.isFinite(v)) return {'§':v > 0 ? 'Inf' : '-Inf'};
      if(Object.is(v, -0)) return {'§':'-0'};
      return v;
    }
    if(typeof v === 'function') return {'§':'fn'};
    if(v === null || typeof v !== 'object') return v;
    if(gesehen.has(v)) return {'§':'zyklus'};
    gesehen.add(v);
    let r;
    if(v instanceof Map) r = {'§map': [...v.entries()].map(([k, x]) => [geh(k), geh(x)])};
    else if(v instanceof Set) r = {'§set': [...v].map(geh)};
    else if(v instanceof Date) r = {'§date': v.getTime()};
    else if(Array.isArray(v)) r = v.map(geh);
    else if(typeof Node !== 'undefined' && v instanceof Node) r = {'§':'node'};
    else { r = {}; for(const k of Object.keys(v)) r[k] = geh(v[k]); }
    gesehen.delete(v);
    return r;
  };
  return JSON.stringify(geh(wert));
};`;

// ── Rechnungen ───────────────────────────────────────────────────────────
// Alles, was eine Ansicht oder eine Story liest. Die Story-IDs stehen
// eigens: sie sind gespeichert, und eine andere ID ist eine neue Zeile.
const RECHNEN = `(() => {
  const out = {};
  const t = (k, f) => { try { out[k] = window.__ser(f()); } catch(e) { out[k] = 'FEHLER: ' + (e && e.message); } };
  const pids = players.map(p => p.id);
  const sids = [...new Set([currentSeason().id, ...seasons.map(s => s.id)])];
  t('getGlobalSim', () => getGlobalSim());
  t('playerStats', () => pids.map(id => playerStats(id)));
  t('allPlayerStats', () => allPlayerStats());
  t('teamStats', () => teamStats());
  t('teamStatsFromMatches', () => teamStatsFromMatches(matches));
  t('periodPlayerStats', () => ['all','season','week','month'].map(p => periodPlayerStats(p)));
  t('matchesInPeriod', () => ['all','season','week','month'].map(p => matchesInPeriod(p).map(m => m.id)));
  t('streaks', () => [currentStreaks(matches,true), currentStreaks(matches,false), longestStreaks(matches), longestLossStreaks(matches),
    pids.map(id => [longestPlayerStreak(id, matches), longestPlayerStreakInfo(id, matches)])]);
  t('awards', () => [getCachedAwardRankings('season'), getCachedAwardRankings('week'), getCachedAwardRankings('all'),
    ...sids.map(s => getCachedAwardRankings('season', s))]);
  t('badges', () => [getBadgeEarnedCache(), pids.map(id => getCachedBadges(id))]);
  t('periodWinner', () => [_periodWinnerMap(matches,'day'), _periodWinnerMap(matches,'week')]);
  t('ranks', () => [getAllPlayerRanks(), pids.map(id => getPlayerRank(id))]);
  t('prestige', () => [prestigeTabelle(), pids.map(id => prestigeOf(id))]);
  t('chroniken', () => [allChronicles(), CHRONICLES.map(c => chronicleRang(c.id))]);
  t('seasonTitles', () => sids.map(s => [s, seasonTitles(s), saisonRekorde(s)]));
  t('positionsverlauf', () => sids.map(s => getSeasonPositionHistory(s)));
  t('pastSeasons', () => allPastSeasons());
  t('fingerabdruck', () => pids.map(id => fingerabdruck(id)));
  t('stories', () => { const s = _buildStories(); return s.map(x => ({id:x.id, type:x.type, when:x.when, prio:x.prio, title:x.title, desc:x.desc, dataRef:x.dataRef})); });
  t('storyIds', () => _buildStories().map(x => x.id).sort());
  t('konsolidiert', () => { _cache._stories = _buildStories(); _cache._consolFrom = null; _cache._frischVon = null;
    return _consolidateStories(getStoriesCache()).map(x => ({id:x.id, type:x.type, when:x.when, title:x.title, desc:x.desc})); });
  return out;
})()`;

// ── Ansichten ────────────────────────────────────────────────────────────
// Jeder Reiter in jeder Auswahl, dann die Blätter. Eine Ansicht wird erst
// gelesen, wenn ihr Markup zwei Takte lang stillsteht: manche Blätter
// rechnen nach dem Öffnen nach (Rekordverlauf, Feed in Portionen).
function ansichten(voll){
  const a = [];
  const tab = (name, vorher) => a.push({name:'reiter/'+name, js:`closeSheet(true);${vorher};render();`, sel:'#main'});
  for(const per of ['season','week','month','all']) for(const m of ['elo','winrate','goaldiff','prestige'])
    tab(`liga-${per}-${m}`, `tab='ranking';period='${per}';rankMetric='${m}';ligaSicht='spieler';ligaSeasonId=null;einblickOffen=''`);
  tab('liga-duos', `tab='ranking';period='season';ligaSicht='duos';ligaSeasonId=null`);
  tab('liga-einblicke', `tab='ranking';period='all';rankMetric='elo';ligaSicht='spieler';einblickOffen='ruhe_liga'`);
  tab('liga-saisons', `tab='ranking';period='season';ligaSicht='spieler';rankMetric='elo';ligaSeasonId=(seasons[0]||{}).id||null`);
  for(const m of ['atk','def']) for(const s of ['wr','wins'])
    tab(`positionen-${m}-${s}`, `tab='positions';rankMetric='${m}';posSort='${s}';einblickOffen='rollen ruhe_pos'`);
  for(const v of ['best','worst']) for(const s of ['wr','gd','elo'])
    tab(`teams-${v}-${s}`, `tab='teams';teamView='${v}';teamSort='${s}';teamSearch='';einblickOffen='netz ruhe_teams'`);
  for(const p of ['season','week']) tab(`awards-${p}`, `tab='awards';awView='awards';awPeriod='${p}';awSeasonId=null;awWeekStart=null`);
  tab('awards-alte-saison', `tab='awards';awView='awards';awPeriod='season';awSeasonId=(seasons[0]||{}).id||null`);
  for(const k of ['','koennen','form','mark','fuegung','shame']) tab(`rekorde-${k||'alle'}`, `tab='awards';awView='rekorde';rekKammer='${k}'`);
  tab('chronik', `tab='awards';awView='chronik';einblickOffen='ruhe_chronik'`);
  tab('verlauf', `tab='history';histFilter='all';_histPage=0`);
  tab('verlauf-spieler', `tab='history';histFilter=players[8]&&players[8].id;_histPage=0`);
  tab('eingabe', `tab='match'`);
  tab('einstellungen', `tab='settings'`);
  const blatt = (name, js) => a.push({name:'blatt/'+name, js:`closeSheet(true);${js}`, sel:'#sheet'});
  blatt('news-feed', `_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;openNewsFeed();_newsFeedRest(true)`);
  blatt('liga-chronik', `showLigaChronik()`);
  blatt('rangsystem', `showRangSystem()`);
  for(const i of IDS.keys()){
    const id = IDS[i];
    blatt(`profil/${i}`, `showPlayer('${id}')`);
    if(!voll) continue;
    blatt(`laufbahn/${i}`, `showLaufbahn('${id}')`);
    blatt(`prestige-regeln/${i}`, `showPrestigeRegeln('${id}')`);
    blatt(`badges/${i}`, `showPlayerBadges('${id}')`);
    blatt(`bilanzen/${i}`, `showPlayerH2HList('${id}')`);
    blatt(`saisons/${i}`, `showPlayerSeasons('${id}')`);
    a.push({name:`popover/${i}`, js:`closeSheet(true);showPlayerBadges('${id}');`, sel:'#bp', jede:`BADGES.map(b=>b.id)`, jedeJs:`showBadgePopover(X,'${id}')`});
  }
  if(!voll) return a;
  a.push({name:'rekord', jede:`CHRONICLES.map(c=>c.id)`, jedeJs:`closeSheet(true);showChronicle(X)`, sel:'#sheet'});
  a.push({name:'disziplin', jede:`DISZIPLINEN.filter(d=>d.monat).flatMap(d=>[...new Set([currentSeason().id,...seasons.map(s=>s.id)])].map(s=>[d.id,s]))`,
    jedeJs:`closeSheet(true);showDisziplin(X[0],X[1])`, sel:'#sheet'});
  a.push({name:'saisontafel', jede:`[...new Set([currentSeason().id,...seasons.map(s=>s.id)])]`, jedeJs:`closeSheet(true);showSeasonTable(X)`, sel:'#sheet'});
  a.push({name:'award', jede:`Object.keys(AWARD_META)`, jedeJs:`closeSheet(true);showAward(X)`, sel:'#sheet'});
  a.push({name:'h2h', jede:`players.flatMap((p,i)=>players.slice(i+1).map(q=>[p.id,q.id]))`, jedeJs:`closeSheet(true);showH2H(X[0],X[1])`, sel:'#sheet'});
  a.push({name:'team', jede:`[...new Set(matches.flatMap(m=>[[m.a1,m.a2].sort().join('|'),[m.b1,m.b2].sort().join('|')]))].slice(0,40).map(k=>k.split('|'))`,
    jedeJs:`closeSheet(true);showTeam(X[0],X[1])`, sel:'#sheet'});
  a.push({name:'partie', jede:`matches.filter((m,i)=>i%5===0||i>=matches.length-20).map(m=>m.id)`, jedeJs:`closeSheet(true);showMatchDetail(X)`, sel:'#sheet'});
  a.push({name:'saisonrueckblick', jede:`seasons.map(s=>s.id)`, jedeJs:`closeSheet(true);showSeasonRecap(seasons.find(s=>s.id===X))`, sel:'#sheet'});
  blatt('wochenrueckblick', `showPotwRecap()`);
  blatt('tagesrueckblick', `showPotdRecap()`);
  a.push({name:'positionsverlauf', jede:`[...new Set([currentSeason().id,...seasons.map(s=>s.id)])]`, jedeJs:`closeSheet(true);showPositionHistory(X)`, sel:'#sheet'});
  a.push({name:'story', jede:`(_cache._stories=_buildStories(),_cache._consolFrom=null,_cache._frischVon=null,_consolidateStories(getStoriesCache()).map(s=>s.id))`,
    jedeJs:`closeSheet(true);openNewsDetail(X)`, sel:'#nd'});
  return a;
}

// Liest ein Element, sobald es zwei Takte lang unverändert ist (höchstens
// anderthalb Sekunden). Ein fester Takt wäre entweder zu kurz für den
// Rekordverlauf oder bei achthundert Blättern zu lang.
const LESEN = `async (sel) => {
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const el = () => document.querySelector(sel);
  let alt = null, gleich = 0;
  for(let i = 0; i < 60 && gleich < 2; i++){
    await raf(); await new Promise(r => setTimeout(r, 15));
    const h = el() ? el().innerHTML : '';
    if(h === alt) gleich++; else { gleich = 0; alt = h; }
  }
  return alt;
}`;

// crypto.subtle gibt es auf einer Seite ohne sichere Herkunft nicht; der
// Inhalt kommt deshalb nach Node und wird dort gehasht.
async function blobKennungen(page){
  const roh = await page.evaluate(async () => {
    const m = [];
    for(const [u, b] of window.__blobs) m.push([u, await b.text()]);
    return m;
  });
  return Object.fromEntries(roh.map(([u, t]) => [u, 'blob:#' + sha1(t)]));
}

function normal(text, blobs){
  return text
    .replace(/blob:[^"')\s&]+/g, u => blobs[u] || 'blob:#unbekannt')
    .replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]{200,}/g, d => 'data:#' + sha1(d))
    .replace(/data:image\/svg\+xml[^"')]{300,}/g, d => 'data:svg#' + sha1(d));
}

async function abzug(html){
  // Die Version ist ein Hash über den Inhalt: jede Fassung trägt eine andere,
  // und die Einstellungen zeigen sie. Sie ist der eine Unterschied, der sein
  // MUSS; verglichen wird alles andere.
  const version = (html.match(/const BUILD_VERSION=['"]([^'"]+)['"]/) || [])[1];
  const dump = {};
  for(const sz of SZENARIEN){
    const daten = sz.daten ? {players:fixtures.players, matches:fixtures.matches, seasons:fixtures.seasons, ...sz.daten} : null;
    const {browser, page, K, errors} = await createHarness({
      html, jetzt:sz.jetzt, daten, vorApp:VORAPP + SER,
      kontext:{timezoneId:'Europe/Berlin', locale:'de-DE', reducedMotion:'reduce'}});
    try{
      const r = await K(RECHNEN);
      const roh = {};
      for(const [k, v] of Object.entries(r)) roh[`${sz.id}/rechnen/${k}`] = v;
      const lies = await page.evaluateHandle(`(${LESEN})`);
      const views = ansichten(sz.voll && !SCHNELL);
      for(const v of views){
        if(v.jede){
          const liste = JSON.parse(await K(`JSON.stringify(${v.jede})`));
          if(v.js) await K(v.js);
          for(const x of liste){
            const key = `${sz.id}/${v.name}/${Array.isArray(x) ? x.join('~') : x}`;
            try{
              await K(v.jedeJs.replace(/\bX\b/g, JSON.stringify(x)));
              roh[key] = await page.evaluate(([f, s]) => f(s), [lies, v.sel]);
            }catch(e){ roh[key] = 'FEHLER: ' + e.message.split('\n')[0]; }
          }
          continue;
        }
        const key = `${sz.id}/${v.name}`;
        try{
          await K(v.js);
          roh[key] = await page.evaluate(([f, s]) => f(s), [lies, v.sel]);
        }catch(e){ roh[key] = 'FEHLER: ' + e.message.split('\n')[0]; }
      }
      roh[`${sz.id}/css`] = sha1(await page.evaluate(() => [...document.querySelectorAll('style')].map(s => s.textContent).join('\n')));
      roh[`${sz.id}/schreibzugriffe`] = JSON.stringify(await page.evaluate(() => window.__schreib));
      roh[`${sz.id}/seitenfehler`] = JSON.stringify(errors);
      const blobs = await blobKennungen(page);
      for(const [k, v] of Object.entries(roh)) dump[k] = normal(version ? String(v).split(version).join('VERSION') : String(v), blobs);
      console.error(`  ${sz.id}: ${Object.keys(roh).length} Einträge`);
    } finally { await browser.close(); }
  }
  return dump;
}

// Zeigt den ersten Unterschied mit Umfeld. HTML wird an Tag-Grenzen
// umbrochen, damit die Stelle lesbar ist und nicht eine Zeile von 80 kB.
function unterschied(a, b){
  if(a === undefined) return '  fehlt in der Basis';
  if(b === undefined) return '  fehlt in der neuen Fassung';
  let i = 0; while(i < a.length && a[i] === b[i]) i++;
  const um = s => s.slice(Math.max(0, i-160), i+160).replace(/></g, '>\n      <');
  return `  ab Zeichen ${i}:\n    vorher: ${um(a)}\n    nachher: ${um(b)}`;
}

const WERKZEUG = sha1(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8') + fs.readFileSync(path.join(ROOT,'tools/performance.cjs'), 'utf8') + (SCHNELL ? 's' : 'v'));
const rev = execSync(`git rev-parse ${BASIS}`, {cwd:ROOT}).toString().trim();
const dir = path.join(ROOT, '.golden'); fs.mkdirSync(dir, {recursive:true});
const basisDatei = path.join(dir, `${rev.slice(0,10)}-${WERKZEUG}.json`);
let basis;
if(fs.existsSync(basisDatei)) { basis = JSON.parse(fs.readFileSync(basisDatei, 'utf8')); console.error(`Basis ${rev.slice(0,10)} aus dem Zwischenspeicher.`); }
else {
  console.error(`Basis ${rev.slice(0,10)} wird abgezogen …`);
  basis = await abzug(execSync(`git show ${rev}:index.html`, {cwd:ROOT, maxBuffer:64<<20}).toString());
  fs.writeFileSync(basisDatei, JSON.stringify(basis));
}
console.error(`Neue Fassung ${path.relative(ROOT, NEU)} wird abgezogen …`);
const neu = await abzug(fs.readFileSync(NEU, 'utf8'));

const schluessel = [...new Set([...Object.keys(basis), ...Object.keys(neu)])];
const anders = schluessel.filter(k => basis[k] !== neu[k]);
const fehler = schluessel.filter(k => String(neu[k]).startsWith('FEHLER') || (k.endsWith('/seitenfehler') && neu[k] !== '[]'));
console.log(`${schluessel.length} Einträge verglichen, ${anders.length} verschieden.`);
for(const k of anders.slice(0, 30)) console.log(`\n✗ ${k}\n${unterschied(basis[k], neu[k])}`);
if(anders.length > 30) console.log(`\n… und ${anders.length - 30} weitere: ${anders.slice(30, 80).join(', ')}`);
if(fehler.length) console.log(`\nHinweis: ${fehler.length} Einträge mit Fehler in der neuen Fassung (gleich in der Basis, sonst oben): ${fehler.slice(0, 10).join(', ')}`);
process.exit(anders.length ? 1 : 0);
