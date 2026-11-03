// Langlebigkeit der Stories: was die App erzählt, wenn die Liga Jahre alt
// ist. Die 616 echten Partien bis Oktober stehen neunmal hintereinander,
// jedes Mal 23 Wochen später, mit vertauschten Spielern und jedem vierten
// Ergebnis gedreht: gut vier Jahre, über fünftausend Partien, fast fünfzig
// Monate. Die letzten 150 Tage — mit einem Jahreswechsel darin — laufen Tag
// für Tag durch den Generator der App wie in `story-logik-lauf.js`, und von
// jeder Art Karte werden die Fälle mit dem längsten Text und der längsten
// Zahl gezeichnet, Karte und Blatt.
//
//   node tools/build.mjs && node mockup/langlebig-lauf.js && node mockup/langlebig-pruef.js
//
// Ergebnis ist `.langlebig.json` (nicht eingecheckt): je Art die Beispiele,
// dazu die Laufzeit des Generators je Tag und jeder Satz, der mit vielen
// Jahren nicht mehr stimmt (Wochen statt Monaten, Zahlen ohne Trennpunkt).
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {createRuntime} = require(path.join(ROOT, 'tests', 'runtime.js'));

const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const basis = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'oktober.txt'), 'utf8').trim().split(';').map(row => row.split(',').map(Number));
const KOPIEN = 9, VERSATZ = 161 * 864e5;
// Ein fester Zufall, damit jeder Lauf dieselbe Liga baut.
const zufall = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const liga = [];
for(let k = 0; k < KOPIEN; k++){
  const r = zufall(1000 + k), p = i => IDS[(i + k * 5) % 12];
  basis.forEach((f, i) => {
    const pos = j => f[4 + j] === 0 ? 'atk' : 'def', dreh = k > 0 && r() < .25;
    const sa = dreh ? f[9] : f[8], sb = dreh ? f[8] : f[9], aw = dreh ? f[10] !== 0 : f[10] === 0;
    liga.push({id:'l' + k + String(i).padStart(4, '0'), a1:p(f[0]), a2:p(f[1]), b1:p(f[2]), b2:p(f[3]),
      a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3), score_a:sa, score_b:sb,
      winner:aw ? 'A' : 'B', exp_a:f[11] / 1000, created_at:new Date(f[12] * 1000 + k * VERSATZ).toISOString(), deltas:{}});
  });
}
liga.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
const pad = n => String(n).padStart(2, '0');
const tagKey = ms => { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const ersterMs = Date.parse(liga[0].created_at), letzterMs = Date.parse(liga[liga.length - 1].created_at);
const monate = [];
for(let d = new Date(new Date(ersterMs).getFullYear(), new Date(ersterMs).getMonth(), 1); d.getTime() <= letzterMs; d = new Date(d.getFullYear(), d.getMonth() + 1, 1))
  monate.push(d.getFullYear() + '-' + pad(d.getMonth() + 1));

const {K, setNow} = createRuntime();
setNow(letzterMs + 864e5);
const t0 = Date.now();
K(`players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5, avatar_id:null})))};
  matches = ${JSON.stringify(liga)};
  globalThis.ALLE = matches.slice();
  seasons = ${JSON.stringify(monate)}.map(id => ({id, label:seasonLabel(id), start_date:'', end_date:''}));
  invalidateCache();
  const _d = new Map(simulateEloWithSliders(matches).history.map(h => [h.matchId, h.deltas]));
  matches.forEach(m => { m.deltas = _d.get(m.id) || {}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s => { const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
    const top = Object.keys(pl).filter(id => pl[id] > 0)
      .map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0})).sort((a, b) => b.elo - a.elo);
    s.top_elo = JSON.stringify(top.slice(0, 3)); s.player_id = top[0] ? top[0].id : null; });
  // Abgeschlossene Monate sind in der Datenbank eingefroren (\`titles\`),
  // und die App liest sie, statt sie zu rechnen. Ohne das maß der Lauf
  // drei Sekunden je Tag für Monate, die kein Gerät mehr rechnet.
  invalidateCache(); seasons.forEach(s => { s.titles = _freezeSeasonTitles(s.id); });
  globalThis.ALLE_SAISONS = seasons.slice();
  globalThis.DB = new Map();
  invalidateCache(); 0`);
const aufbau = Date.now() - t0;
console.error(`${liga.length} Partien, ${monate.length} Monate, ${tagKey(ersterMs)} bis ${tagKey(letzterMs)} · Aufbau ${aufbau} ms`);

const FORM_JS = `(s => { const d = s.dataRef || {}, t = d.type || '-';
  if(t === 'sammel') return 'sammel:' + (d.quelle || 'spiel');
  if(t === 'ehrung') return 'ehrung:' + (d.periode || 'runde');
  if(t === 'ambient') return 'ambient:' + (d.sub || '');
  return t; })`;
// Was mit Jahren nicht mehr stimmt: eine Dauer in Wochen ab zehn (dann sind
// es Monate), eine fünfstellige Zahl ohne Trennpunkt.
const PRUEF = [
  {id:'wochen', name:'Dauer in Wochen statt Monaten', re:/\b(\d{2,}) Wochen\b/},
  {id:'zahl', name:'Zahl ab 10 000 ohne Trennpunkt', re:/\b\d{5,}\b/},
  {id:'tage', name:'Dauer in Tagen über ein Jahr', re:/\b([4-9]\d\d|\d{4,}) Tage/}
];
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
const arten = {}, laufzeit = [], befunde = [];
const start = new Date(new Date(letzterMs - 150 * 864e5).toDateString());
for(let d0 = start; d0.getTime() <= letzterMs + 864e5; d0 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1)){
  const jetzt = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 23, 59, 40).getTime();
  setNow(jetzt);
  let r = null;
  try {
    r = JSON.parse(K(`(() => {
      matches = ALLE.filter(m => new Date(m.created_at).getTime() <= ${jetzt});
      seasons = ALLE_SAISONS.filter(s => seasonEnd(s.id).getTime() < ${jetzt});
      invalidateCache();
      _cache._stories = [...DB.values()].sort(_storyFolge);
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      // Die Uhr der Laufzeit steht (\`setNow\`): gemessen wird mit \`performance\`.
      const t0 = performance.now();
      _buildStories().forEach(s => { if(!DB.has(s.id)) DB.set(s.id, s); });
      const gen = Math.round(performance.now() - t0);
      const ab = newsAnzeigeAb(${jetzt});
      _cache._stories = [...DB.values()].filter(s => new Date(s.when).getTime() >= ab && new Date(s.when).getTime() <= ${jetzt}).sort(_storyFolge);
      _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
      const t1 = performance.now(), feed = getStoriesCache(), kons = Math.round(performance.now() - t1);
      return JSON.stringify({gen, kons, feed:feed.map(s => ({id:s.id, form:${FORM_JS}(s), title:s.title || '', desc:s.desc || '', when:new Date(s.when).getTime()}))});
    })()`));
  } catch(e){ console.error('Tag', tagKey(jetzt), String(e).slice(0, 160)); continue; }
  laufzeit.push({tag:tagKey(jetzt), gen:r.gen, kons:r.kons, feed:r.feed.length});
  const neu = [];
  r.feed.forEach(s => {
    const text = s.title + ' · ' + s.desc;
    PRUEF.forEach(p => { const m = text.match(p.re); if(m && !befunde.some(b => b.id === p.id && b.form === s.form)) befunde.push({id:p.id, name:p.name, form:s.form, treffer:m[0], text}); });
    // Die längste Zahl und der längste Text je Art.
    const ziffern = Math.max(0, ...(text.match(/\d[\d.]*/g) || []).map(x => x.replace(/\./g, '').length));
    const a = arten[s.form] || (arten[s.form] = {n:0, laenge:null, zahl:null, ids:new Set()});
    if(!a.ids.has(s.id)){ a.ids.add(s.id); a.n++; }
    if(!a.laenge || text.length > a.laenge.text.length) neu.push(['laenge', s, text]);
    if(!a.zahl || ziffern > a.zahl.ziffern) neu.push(['zahl', s, text, ziffern]);
  });
  if(neu.length){
    const bilder = JSON.parse(K(`(() => { const st = getStoriesCache();
      return JSON.stringify(${JSON.stringify([...new Set(neu.map(x => x[1].id))])}.map(id => { const s = st.find(x => x.id === id); if(!s) return null;
        let karte = '', blatt = '', ndKlasse = '';
        try { karte = _newsCardHtmlM2(s, false, false, ''); } catch(e){ karte = ''; }
        try { openNewsDetail(id); } catch(e){}
        try { const nd = document.getElementById('nd'); blatt = nd.innerHTML || ''; ndKlasse = nd.className || ''; nd.innerHTML = ''; } catch(e){}
        return {id, karte, blatt, ndKlasse};
      })); })()`));
    const je = Object.fromEntries(bilder.filter(Boolean).map(b => [b.id, b]));
    neu.forEach(([was, s, text, ziffern]) => { const b = je[s.id]; if(!b) return;
      arten[s.form][was] = {id:s.id, tag:tagKey(s.when), title:s.title, desc:s.desc, text, ziffern:ziffern || 0, karte:b.karte, blatt:b.blatt, ndKlasse:b.ndKlasse}; });
  }
  if(laufzeit.length % 25 === 0){ console.error(`  … ${tagKey(jetzt)} · ${DB_GROESSE()} Zeilen · ${Math.round((Date.now() - t0) / 1000)} s`); speichern(); }
}
speichern();
function DB_GROESSE(){ return K('DB.size'); }
// Unterwegs gespeichert: ein Tag kostet mit fünftausend Partien gut zwanzig
// Sekunden, und ein abgebrochener Lauf soll nicht alles verlieren.
function speichern(){
  const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
  const CSS = (html.slice(0, html.indexOf('</head>')).match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || []).map(s => s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n');
  const zahlen = JSON.parse(K(`JSON.stringify((() => { const st = allPlayerStats() || {}; return {spiele:Math.max(...Object.values(st).map(x => x.games || 0)),
    siege:Math.max(...Object.values(st).map(x => x.wins || 0)), monate:seasons.length}; })())`));
  fs.writeFileSync(path.join(__dirname, '.langlebig.json'), JSON.stringify({liga:{partien:liga.length, von:tagKey(ersterMs), bis:tagKey(letzterMs), monate:monate.length, aufbau}, zahlen,
    laufzeit, befunde, arten:Object.fromEntries(Object.entries(arten).map(([k, a]) => [k, {n:a.n, laenge:a.laenge, zahl:a.zahl}])), css:CSS}));
}

const g = laufzeit.map(x => x.gen).sort((a, b) => a - b);
console.log(`${Object.keys(arten).length} Arten · Generator je Tag Median ${g[g.length >> 1]} ms, höchstens ${g[g.length - 1]} ms · ${befunde.length} Befunde im Text · ${Math.round((Date.now() - t0) / 1000)} s`);
befunde.forEach(b => console.log(`  ${b.name} · ${b.form} · „${b.treffer}“ · ${b.text.slice(0, 120)}`));
