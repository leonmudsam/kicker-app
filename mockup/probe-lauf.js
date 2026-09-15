// Der Lauf über die erfundene Probeliga (`probe-liga.js`): spielt sie Tag für
// Tag nach, lässt an jedem Tag den echten Generator laufen, persistiert wie
// die App und rechnet nach, was der Feed daraus zeigt — und was verloren geht.
//
//   node mockup/probe-lauf.js            # Bericht auf der Konsole
//   node mockup/probe-lauf.js --json     # dazu .probe.json
//
// Die Liga ist erfunden und wird nie eingetragen. Sie ist so gebaut, dass alles
// vorkommt, was der Feed zeigen können muss — bis hin zu den zwei legendären
// Auszeichnungen, die Breaking auslösen.
'use strict';
const fs = require('fs');
const ROOT = '/home/user/kicker-app';
const {baueProbeLiga} = require(__dirname + '/probe-liga.js');
const L = baueProbeLiga(20260913);
const NAMEN = L.NAMEN, IDS = L.IDS;
const name = id => NAMEN[IDS.indexOf(id)] || '?';

const html = fs.readFileSync(ROOT + '/dist/index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let mm, blocks = []; while((mm = re.exec(html))) blocks.push(mm[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);

globalThis.__NOW = new Date('2026-09-13T23:30:00').getTime();
const RealDate = Date;
const uhr = () => Number(process.hrtime.bigint() / 1000000n);
class FakeDate extends RealDate {
  constructor(...a){ if(a.length === 0) super(globalThis.__NOW); else super(...a); }
  static now(){ return globalThis.__NOW; }
}
globalThis.Date = FakeDate;
const el = () => ({ style:{}, classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){},
  querySelector(){return null}, querySelectorAll(){return []}, setAttribute(){}, getAttribute(){return null},
  insertAdjacentHTML(){}, focus(){}, click(){}, scrollIntoView(){}, dataset:{}, children:[], innerHTML:'', textContent:'' });
globalThis.window = { addEventListener(){}, removeEventListener(){}, location:{href:'',hash:'',reload(){}},
  matchMedia:() => ({matches:false, addEventListener(){}, addListener(){}}), navigator:{}, scrollTo(){},
  setTimeout, clearTimeout, history:{pushState(){},replaceState(){},back(){}}, innerWidth:430, innerHeight:932 };
globalThis.document = { getElementById:() => el(), querySelector:() => null, querySelectorAll:() => [],
  createElement:() => el(), body:el(), documentElement:el(), addEventListener(){}, removeEventListener(){},
  head:el(), visibilityState:'visible', title:'' };
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k] ?? null}, setItem(k, v){this._d[k] = String(v)},
  removeItem(k){delete this._d[k]}, clear(){this._d = {}} };
Object.defineProperty(globalThis, 'navigator', {configurable:true, writable:true,
  value:{ onLine:true, userAgent:'node', serviceWorker:{register(){return Promise.resolve()}},
          clipboard:{writeText(){return Promise.resolve()}} }});
globalThis.location = window.location;
globalThis.fetch = () => Promise.resolve({ok:true, json:() => Promise.resolve({}), text:() => Promise.resolve('')});
const ch = () => new Proxy(function(){}, {get(_, p){return p === 'then' ? undefined : ch()}, apply(){return ch()}});
globalThis.supabase = { createClient: () => ({from:() => ch(), channel:() => ch(), removeChannel(){}, rpc:() => ch()}) };
globalThis.alert = () => {}; globalThis.confirm = () => true; globalThis.prompt = () => null;
globalThis.requestAnimationFrame = f => setTimeout(f, 0);

eval(code);
const K = globalThis.__k;
K.eval(`
  players = ${JSON.stringify(L.spieler)};
  matches = ${JSON.stringify(L.matches)};
  seasons = ${JSON.stringify(L.seasons)};
  invalidateCache();
  const _rc = simulateEloWithSliders(matches);
  const _d = {}; _rc.history.forEach(h=>{_d[h.matchId]=h.deltas;});
  matches.forEach(m=>{ m.deltas=_d[m.id]||{}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s=>{
    const snap=_g.seasonEndElos[s.id]||{}, pl=_g.seasonPlayed[s.id]||{};
    const top=Object.keys(pl).filter(id=>pl[id]>0)
      .map(id=>({id,elo:Math.round(snap[id]??cfg.start_elo),wins:0,losses:0}))
      .sort((a,b)=>b.elo-a.elo);
    s.top_elo=JSON.stringify(top.slice(0,3)); s.player_id=top[0]?top[0].id:null;
  });
  invalidateCache();
  unlocked = true;
  globalThis.ALLE = matches.slice();
  'bereit'`);

const tagKey = ms => { const d = new RealDate(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0'); };
const alleTs = L.matches.map(m => new RealDate(m.created_at).getTime());
const spieltage = [...new Set(alleTs.map(tagKey))].sort();
const letzterMs = Math.max(...alleTs);

// ── Der Lauf: die letzten zwanzig Kalendertage ──────────────────────
// Die Vorgeschichte muss nicht Tag für Tag nachgespielt werden; sie steht
// ohnehin in `matches`. Gebraucht wird der Verlauf des Fensters, das der Feed
// zeigt, plus ein paar Tage Anlauf, damit die Persistenz stimmt.
const db = new Map();
const laeufe = [];
let genZeit = 0, genLaeufe = 0;
for(let i = 19; i >= 0; i--){
  const d = new RealDate(letzterMs - i * 86400000); d.setHours(23, 30, 0, 0);
  const jetzt = d.getTime();
  globalThis.__NOW = jetzt;
  K.eval(`matches = ALLE.filter(m=>new Date(m.created_at).getTime() <= ${jetzt}); invalidateCache(); 1`);
  let roh = [];
  const t0 = uhr();
  try { roh = K.eval('JSON.parse(JSON.stringify(_buildStories()))'); }
  catch(e){ console.error('Generator', tagKey(jetzt), String(e).slice(0, 200)); }
  genZeit += uhr() - t0; genLaeufe++;
  const neu = [];
  roh.forEach(s => { if(!db.has(s.id)){ db.set(s.id, s); neu.push(s); } });
  const ab = jetzt - 14 * 86400000;
  const fenster = [...db.values()].filter(s => new RealDate(s.when).getTime() >= ab)
    .sort((a, b) => new RealDate(b.when) - new RealDate(a.when));
  let feed = [];
  try {
    feed = K.eval(`(function(){ _cache._consolFrom=null; _cache._frischVon=null;
      var l = ${JSON.stringify(fenster)};
      return JSON.parse(JSON.stringify(_consolidateStories(_newsTexteAuffrischen(l))
        .slice(0, NEWS_LIMITS.total)));
    })()`);
  } catch(e){ console.error('Feed', tagKey(jetzt), String(e).slice(0, 300)); }
  laeufe.push({tag:tagKey(jetzt), jetzt, neu, feed, fenster:fenster.length});
}

// ── Der Bericht ─────────────────────────────────────────────────────
const letzter = laeufe[laeufe.length - 1];
const typ = s => (s.dataRef || {}).type || '-';
const istTafel = s => s.cat === 'tafel' || (s.dataRef || {}).quelle === 'tafel';
const brk = s => { try { return !!K.eval(`_isBreaking(${JSON.stringify(s)})`); } catch(e){ return false; } };

console.log('\n══ PROBELIGA ══');
console.log(NAMEN.length + ' Spieler · ' + L.matches.length + ' Partien · '
  + spieltage.length + ' Spieltage · ' + spieltage[0] + ' bis ' + spieltage[spieltage.length - 1]);
console.log('Vorgeschichte ' + L.vorgeschichte + ' Partien, Schaufenster '
  + (L.matches.length - L.vorgeschichte) + ' Partien');
console.log('Generator: ' + Math.round(genZeit / genLaeufe) + ' ms je Lauf ('
  + genLaeufe + ' Läufe, ' + genZeit + ' ms gesamt)');

// Welche Karte steht im Feed, und was ist verloren gegangen?
const imFeed = new Set(letzter.feed.map(s => s.id));
const gebuendelt = new Map();
letzter.feed.forEach(s => ((s.dataRef || {}).teile || [])
  .forEach(t => gebuendelt.set(t.titel || t.label, s.title)));
const ab14 = letzter.jetzt - 14 * 86400000;
const fenster = [...db.values()].filter(s => new RealDate(s.when).getTime() >= ab14);

console.log('\n══ DER FEED AM LETZTEN TAG ══   ' + letzter.feed.length + ' Karten aus '
  + fenster.length + ' gebildeten');
const proTag = {};
fenster.forEach(s => { const k = tagKey(new RealDate(s.when).getTime());
  (proTag[k] = proTag[k] || {roh:[], feed:[]}).roh.push(s); });
letzter.feed.forEach(s => { const k = tagKey(new RealDate(s.when).getTime());
  (proTag[k] = proTag[k] || {roh:[], feed:[]}).feed.push(s); });
Object.keys(proTag).sort().reverse().forEach(k => {
  const g = proTag[k];
  const tf = g.feed.filter(istTafel).length;
  const am = g.feed.filter(s => typ(s) === 'ambient').length;
  const sp = g.feed.length - tf - am;
  const partien = L.matches.filter(m => tagKey(new RealDate(m.created_at).getTime()) === k).length;
  console.log('\n── ' + k + '  ' + partien + ' Partien · gebildet ' + g.roh.length
    + ' · Feed ' + g.feed.length + ' (Tafel ' + tf + ' / Spieltag ' + sp + ' / Fun ' + am + ')');
  g.feed.slice().sort((a, b) => (b.prio || 0) - (a.prio || 0)).forEach(s => {
    console.log('   ✓ ' + String(s.prio).padStart(3) + ' ' + (brk(s) ? 'B ' : '  ')
      + (typ(s) + ((s.dataRef || {}).quelle ? '/' + s.dataRef.quelle : '')).padEnd(22)
      + String(s.title).slice(0, 64));
    ((s.dataRef || {}).teile || []).forEach(t =>
      console.log('        · ' + String(t.titel || t.label || '').slice(0, 70)));
  });
  g.roh.filter(s => !imFeed.has(s.id)).sort((a, b) => (b.prio || 0) - (a.prio || 0)).forEach(s => {
    const wo = gebuendelt.get(s.title);
    console.log('   ' + (wo ? 'B' : '·') + ' ' + String(s.prio).padStart(3) + '   '
      + typ(s).padEnd(22) + String(s.title).slice(0, 64)
      + (wo ? '' : '   ← WEG'));
  });
});

// Welche Sorten gehen wie oft verloren?
console.log('\n══ WAS VERLOREN GEHT ══');
const weg = {}, drin = {}, bund = {};
fenster.forEach(s => {
  const t = typ(s);
  if(imFeed.has(s.id)) drin[t] = (drin[t] || 0) + 1;
  else if(gebuendelt.has(s.title)) bund[t] = (bund[t] || 0) + 1;
  else weg[t] = (weg[t] || 0) + 1;
});
[...new Set([...Object.keys(drin), ...Object.keys(bund), ...Object.keys(weg)])]
  .sort((a, b) => (weg[b] || 0) - (weg[a] || 0))
  .forEach(t => console.log('  ' + t.padEnd(20)
    + ' Feed ' + String(drin[t] || 0).padStart(3)
    + ' · Zeile ' + String(bund[t] || 0).padStart(3)
    + ' · weg ' + String(weg[t] || 0).padStart(3)));

// Breaking: kam es vor?
console.log('\n══ BREAKING ══');
const brkAlle = fenster.filter(brk);
if(!brkAlle.length) console.log('  keine Breaking-Karte gebildet');
brkAlle.forEach(s => console.log('  ' + (imFeed.has(s.id) ? 'im Feed ' : 'WEG     ')
  + typ(s).padEnd(18) + String(s.title).slice(0, 60)));

// Zeigt eine Tafel-Karte eine Partie, in der ihre Leute gar nicht spielten?
console.log('\n══ PASST DIE PARTIE ZU DEN NAMEN? ══');
let falsch = 0;
fenster.forEach(s => {
  const d = s.dataRef || {};
  if(!d.matchId) return;
  const m = L.matches.find(x => x.id === d.matchId);
  if(!m) return;
  const drinM = new Set([m.a1, m.a2, m.b1, m.b2]);
  const ids = d.playerIds || (d.pid ? [d.pid] : []) || [];
  if(!ids.length) return;
  if(!ids.some(p => drinM.has(p))){
    falsch++;
    if(falsch <= 8) console.log('  ' + typ(s).padEnd(18) + String(s.title).slice(0, 48)
      + '  → ' + [m.a1, m.a2].map(name).join('/') + ' ' + m.score_a + ':' + m.score_b + ' '
      + [m.b1, m.b2].map(name).join('/'));
  }
});
console.log('  ' + falsch + ' Karten zeigen eine Partie ohne ihre eigenen Namen');

if(process.argv.includes('--json')){
  fs.writeFileSync(__dirname + '/.probe.json', JSON.stringify({
    spieler:NAMEN.length, partien:L.matches.length, spieltage:spieltage.length,
    generatorMs:Math.round(genZeit / genLaeufe),
    laeufe:laeufe.map(l => ({tag:l.tag, neu:l.neu.length, feed:l.feed.length})),
    letzterFeed:letzter.feed, fenster
  }, null, 1));
  console.log('\n.probe.json geschrieben');
}

// Die Zeitgeber der App laufen weiter und rufen `loadAll` gegen eine
// Attrappe von Supabase. Der Bericht steht, also Schluss.
process.exit(0);
