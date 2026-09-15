// Der Lauf: spielt die ECHTEN Partien der Liga Spieltag fuer Spieltag nach,
// laesst an jedem Tag den echten Generator laufen, persistiert wie die App
// (erste Insert-Zeit gewinnt) und rechnet danach nach, was der Feed daraus
// zeigt. Ergebnis ist `.story-logik.json`, aus der `story-logik-seite.js`
// die Tafel baut.
//
//   node mockup/story-logik-lauf.js && node mockup/story-logik-seite.js
//
// Kein Browser: die Seite braucht keine gerenderte Geometrie, nur Zahlen.
// Der Rumpf ist derselbe wie in den Testsuiten (tests/ambient.test.js) —
// dieselbe Datei, dieselben Fixtures, damit die Zahlen hier und dort
// dasselbe bedeuten.
'use strict';
const fs = require('fs');
const ROOT = '/home/user/kicker-app';
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const packed = fs.readFileSync(ROOT + '/tests/fixtures/matches.txt', 'utf8').trim();
const realMatches = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4 + k] === 0 ? 'atk' : 'def';
  return { id:'m' + String(i).padStart(4, '0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3),
    score_a:f[8], score_b:f[9], winner:f[10] === 0 ? 'A' : 'B',
    exp_a:f[11] / 1000, created_at:new Date(f[12] * 1000).toISOString(), deltas:{} };
});

const html = fs.readFileSync(ROOT + '/dist/index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = []; while((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);

// Die Uhr ist beweglich: der Lauf stellt sie auf jeden Spieltag.
globalThis.__NOW = new Date('2026-08-27T12:00:00Z').getTime();
const RealDate = Date;
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
// `navigator` hat in Node nur einen Getter; im strikten Modus wirft eine
// Zuweisung darauf, statt sie still zu verschlucken.
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
  players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5, avatar_id:null})))};
  matches = ${JSON.stringify(realMatches)};
  matches.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  seasons = [
    {id:'2026-05',label:'Mai 2026',start_date:'2026-04-30',end_date:'2026-05-31'},
    {id:'2026-06',label:'Juni 2026',start_date:'2026-05-31',end_date:'2026-06-30'},
    {id:'2026-07',label:'Juli 2026',start_date:'2026-06-30',end_date:'2026-07-31'}
  ];
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

const tagKey = ms => { const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0'); };
const alleTs = K.eval('ALLE.map(m=>new Date(m.created_at).getTime())');
const spieltage = [...new Set(alleTs.map(tagKey))].sort();
const letzterMs = Math.max(...alleTs);
const ersterMs = Math.min(...alleTs);

// ── Der Lauf ────────────────────────────────────────────────────────
// Jeden Kalendertag der Ligageschichte um 23:30. Die Datenbank wird wie in
// der App gefuellt: dieselbe ID kommt nur einmal hinein, und die erste
// Insert-Zeit gewinnt. Danach ist der Feed genau das, was `getStoriesCache`
// daraus macht.
const db = new Map();
const proTagGebildet = {};   // Tag → Zahl der neu gebildeten Karten
const laeufe = [];
for(let t = ersterMs; t <= letzterMs + 86400000; t += 86400000){
  const d = new Date(t); d.setHours(23, 30, 0, 0);
  const jetzt = d.getTime();
  globalThis.__NOW = jetzt;
  K.eval(`matches = ALLE.filter(m=>new Date(m.created_at).getTime() <= ${jetzt}); invalidateCache(); 1`);
  let roh = [];
  try { roh = K.eval('JSON.parse(JSON.stringify(_buildStories()))'); }
  catch(e){ console.error('Generator', tagKey(jetzt), String(e).slice(0, 120)); }
  let neu = 0;
  roh.forEach(s => { if(!db.has(s.id)){ db.set(s.id, s); neu++; } });
  proTagGebildet[tagKey(jetzt)] = neu;
  const ab = jetzt - 14 * 86400000;
  const fenster = [...db.values()].filter(s => new Date(s.when).getTime() >= ab)
    .sort((a, b) => new Date(b.when) - new Date(a.when));
  let feed = [];
  try {
    feed = K.eval(`(function(){ _cache._consolFrom=null; _cache._frischVon=null;
      var l = ${JSON.stringify(fenster)};
      return JSON.parse(JSON.stringify(_consolidateStories(_newsTexteAuffrischen(l))
        .slice(0, NEWS_LIMITS.total)));
    })()`);
  } catch(e){ console.error('Feed', tagKey(jetzt), String(e).slice(0, 200)); }
  laeufe.push({tag:tagKey(jetzt), jetzt, neu, fenster:fenster.length, feed});
  if(laeufe.length % 20 === 0) console.error('  …' + tagKey(jetzt));
}

// ── Was daraus wurde ────────────────────────────────────────────────
const letzter = laeufe[laeufe.length - 1];
const typVon = s => (s.dataRef || {}).type || '-';
const istTafel = s => s.cat === 'tafel' || (s.dataRef || {}).quelle === 'tafel';
const gewicht = s => typVon(s) === 'sammel'
  ? Math.max(1, ((s.dataRef || {}).teile || []).length) : 1;

// Je Typ: wie oft gebildet, wie oft im Feed sichtbar, wie oft gebuendelt.
const gebildet = {}, sichtbar = {}, gebuendelt = {};
[...db.values()].forEach(s => { const t = typVon(s); gebildet[t] = (gebildet[t] || 0) + 1; });
const gesehenImFeed = new Set(), gesehenGebuendelt = new Set();
laeufe.forEach(l => l.feed.forEach(s => {
  gesehenImFeed.add(s.id);
  ((s.dataRef || {}).teile || []).forEach(teil => {
    // Die Zeile eines Bundles nennt ihren Typ mit.
    if(teil.typ) gesehenGebuendelt.add(teil.typ + ' ' + teil.titel);
  });
}));
[...db.values()].forEach(s => {
  const t = typVon(s);
  if(gesehenImFeed.has(s.id)) sichtbar[t] = (sichtbar[t] || 0) + 1;
  else if(gesehenGebuendelt.has(t + ' ' + s.title)) gebuendelt[t] = (gebuendelt[t] || 0) + 1;
});

// Die Sammelkarten entstehen erst beim Anzeigen und stehen deshalb in
// keiner Datenbank. Gezaehlt werden sie ueber alle Laeufe, je Achse, mit der
// Zahl der Zeilen, die sie tragen.
const sammelKarten = {};
{
  const gesehen = new Set();
  laeufe.forEach(l => l.feed.forEach(s => {
    if(typVon(s) !== 'sammel' || gesehen.has(s.id)) return;
    gesehen.add(s.id);
    const q = (s.dataRef || {}).quelle || 'spiel';
    const n = ((s.dataRef || {}).teile || []).length;
    const e = sammelKarten[q] || (sammelKarten[q] = {karten:0, zeilen:0, groesste:0});
    e.karten++; e.zeilen += n; e.groesste = Math.max(e.groesste, n);
  }));
}

// Karten je Tag im letzten Fenster, getrennt nach Haelfte.
const fensterTage = [];
{
  const proTag = {};
  letzter.feed.forEach(s => { const k = tagKey(new Date(s.when).getTime());
    (proTag[k] = proTag[k] || []).push(s); });
  Object.keys(proTag).sort().forEach(k => {
    const l = proTag[k];
    let tafel = 0, spiel = 0, fun = 0;
    l.forEach(s => { if(typVon(s) === 'ambient') fun += 1;
      else if(istTafel(s)) tafel += gewicht(s); else spiel += gewicht(s); });
    fensterTage.push({tag:k, karten:l.length, tafel, spiel, fun,
      spieltag: !!K.eval(`_newsTagMs('${k}').length`),
      typen:l.map(typVon),
      zeilen:l.map(s => ({typ:typVon(s), quelle:(s.dataRef || {}).quelle || '',
        titel:s.title, text:s.desc, prio:s.prio,
        uhr:new Date(s.when).toTimeString().slice(0, 5),
        teile:((s.dataRef || {}).teile || []).map(x => x.titel)}))});
  });
}

// Die Verteilung ueber die ganze Ligageschichte: wie viele Karten trug ein
// Spieltag im Schnitt, wie viele ein stiller Tag.
const verteilung = (() => {
  const spieltagKarten = [], stillKarten = [];
  laeufe.forEach(l => {
    const k = l.tag;
    const n = l.feed.filter(s => tagKey(new Date(s.when).getTime()) === k).length;
    if(spieltage.indexOf(k) >= 0) spieltagKarten.push(n); else stillKarten.push(n);
  });
  const med = a => { if(!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y); const i = Math.floor(b.length / 2);
    return b.length % 2 ? b[i] : Math.round((b[i - 1] + b[i]) / 2); };
  return {
    spieltage: spieltage.length, tage: laeufe.length,
    spieltagMedian: med(spieltagKarten), spieltagMax: Math.max(0, ...spieltagKarten),
    stillMedian: med(stillKarten), stillMax: Math.max(0, ...stillKarten),
    leereSpieltage: spieltagKarten.filter(n => n === 0).length
  };
})();

// Die Zahlen, die im Code stehen — nicht abgeschrieben, sondern gelesen.
const konstanten = JSON.parse(K.eval('JSON.stringify({limits:NEWS_LIMITS, prio:STORY_PRIO,'
  + ' fenster:NEWS_FENSTER_TAGE, slots:AMBIENT_SLOTS, abendAb:AMBIENT_ABEND_AB,'
  + ' badgeMarken:NEWS_BADGE_MARKEN, form:{fenster:FORM_FENSTER, basis:FORM_BASIS_MIN,'
  + ' vorsprung:FORM_VORSPRUNG}, abgemeldet:STORY_ABGEMELDET,'
  + ' laeuftAb:[...STORY_LAEUFT_AB]})'));

const aus = {
  gebaut: new RealDate().toISOString().slice(0, 16).replace('T', ' '),
  partien: realMatches.length, spieler: NAMES.length,
  erster: spieltage[0], letzter: spieltage[spieltage.length - 1],
  konstanten, gebildet, sichtbar, gebuendelt, sammelKarten, verteilung, fensterTage,
  dbGesamt: db.size,
  feedLetzter: letzter.feed.length
};
fs.writeFileSync(__dirname + '/.story-logik.json', JSON.stringify(aus, null, 1));
console.log('Spieltage ' + verteilung.spieltage + ' · gebildet ' + db.size
  + ' · im letzten Fenster ' + letzter.feed.length + ' Karten');
