// Prüft das neue Chronik-System (§13.4b) und den Avatar-Ring (§13.7)
// gegen die echten 466 Matches der Liga.
const fs = require('fs');
const DIR = __dirname;
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const packed = fs.readFileSync(DIR + '/fixtures/matches.txt', 'utf8').trim();
const realMatches = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4+k] === 0 ? 'atk' : 'def';
  return { id:'m'+String(i).padStart(4,'0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3),
    score_a:f[8], score_b:f[9], winner:f[10]===0?'A':'B',
    exp_a:f[11]/1000, created_at:new Date(f[12]*1000).toISOString(), deltas:{} };
});

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = []; while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a,b)=>b.length-a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);

// Fester Zeitpunkt: 27.08.2026, damit August die laufende Saison ist.
const FIXED = new Date('2026-08-27T12:00:00Z').getTime();
const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...a){ if(a.length===0) super(FIXED); else super(...a); }
  static now(){ return FIXED; }
}
globalThis.Date = FakeDate;

const el = () => ({ style:{}, classList:{add(){},remove(){},contains(){return false}},
  addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){},
  querySelector(){return null}, querySelectorAll(){return []}, setAttribute(){}, getAttribute(){return null},
  insertAdjacentHTML(){}, focus(){}, click(){}, scrollIntoView(){}, dataset:{}, children:[], innerHTML:'', textContent:'' });
globalThis.window = { addEventListener(){}, removeEventListener(){}, location:{href:'',hash:'',reload(){}},
  matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}), navigator:{}, scrollTo(){}, setTimeout, clearTimeout,
  history:{pushState(){},replaceState(){},back(){}}, innerWidth:430, innerHeight:932 };
globalThis.document = { getElementById:()=>el(), querySelector:()=>null, querySelectorAll:()=>[],
  createElement:()=>el(), body:el(), documentElement:el(), addEventListener(){}, removeEventListener(){},
  head:el(), visibilityState:'visible', title:'' };
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)},
  removeItem(k){delete this._d[k]}, clear(){this._d={}} };
globalThis.navigator = { onLine:true, userAgent:'node', serviceWorker:{ register(){return Promise.resolve()} }, clipboard:{writeText(){return Promise.resolve()}} };
globalThis.location = window.location;
globalThis.fetch = () => Promise.resolve({ ok:true, json:()=>Promise.resolve({}), text:()=>Promise.resolve('') });
const ch = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:ch()}, apply(){return ch()}});
globalThis.supabase = { createClient: () => ({ from:()=>ch(), channel:()=>ch(), removeChannel(){}, rpc:()=>ch() }) };
globalThis.alert = ()=>{}; globalThis.confirm = ()=>true; globalThis.prompt = ()=>null;
globalThis.requestAnimationFrame = (f)=>setTimeout(f,0);

eval(code);
const K = globalThis.__k;

K.eval(`
  players = ${JSON.stringify(NAMES.map((n,i)=>({id:IDS[i],name:n,hidden:false,elo:0,atk:0.5,avatar_id:null})))};
  matches = ${JSON.stringify(realMatches)};
  matches.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  seasons = [
    {id:'2026-05',label:'Mai 2026',start_date:'2026-04-30',end_date:'2026-05-31'},
    {id:'2026-06',label:'Juni 2026',start_date:'2026-05-31',end_date:'2026-06-30'},
    {id:'2026-07',label:'Juli 2026',start_date:'2026-06-30',end_date:'2026-07-31'}
  ];
  invalidateCache();
  // DB-First: die App aggregiert m.deltas. Der Export hat keine → einmal
  // mit den Slidern nachrechnen und in die Matches schreiben.
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
`);

let fails = 0, checks = 0;
const ok = (c, l, x) => { checks++; if(!c){ fails++; console.log('  ✗ ' + l + (x?'  ['+x+']':'')); } else console.log('  ok    ' + l + (x?'  ('+x+')':'')); };
const nm = id => NAMES[IDS.indexOf(id)] || id;

// Hilfsfunktion: Ambient-Stories fuer einen gegebenen Zeitpunkt bauen, mit
// einem vorgegebenen Bestand an schon persistierten Stories.
function build(iso, existing){
  return K.eval(`(function(){
    _cache._stories = ${JSON.stringify(existing || [])}.map(s => Object.assign({}, s, {when:new Date(s.when)}));
    return _buildAmbientStories(new Date(${JSON.stringify(iso)}), pmap(), id=>pname(id))
      .map(s => ({id:s.id, when:s.when.toISOString(), sub:s.dataRef.sub, title:s.title,
                  pids:(s.dataRef.ambientPids||(s.dataRef.ambientPid?[s.dataRef.ambientPid]:[]))}));
  })()`);
}

console.log('=== 1. NACHSCHUB FUELLT LUECKEN ===');
const NOW = '2026-08-27T20:30:00Z';   // nach beiden Slots des Tages (lokal)
const fresh = build(NOW, []);
console.log('  Slots aus leerem Bestand: ' + fresh.length);
fresh.forEach(s => console.log('    ' + s.id + '  ' + s.when.slice(0,16) + '  ' + s.sub));
// Der 10-Uhr-Slot steht an jedem Tag, der 19-Uhr-Slot nur an Tagen ohne
// Partie: keine der 466 Partien hat vor 10 Uhr angefangen, die letzte um
// 18 Uhr. Am Abend eines Spieltags ist alles vom Tag interessanter als eine
// Zahl, die seit Wochen gilt.
const _spieltage = new Set(K.eval('matches.map(m=>{const d=new Date(m.created_at); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");})'));
const _tageImFenster = [];
for(let b = K.eval('AMBIENT_BACKFILL_DAYS'); b >= 0; b--){
  const d = new Date(new Date(NOW).getTime() - b*86400000);
  _tageImFenster.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));
}
const _erwartet = _tageImFenster.length + _tageImFenster.filter(d => !_spieltage.has(d)).length;
ok(fresh.length === _erwartet,
   'ein 10-Uhr-Slot je Tag, ein 19-Uhr-Slot nur an spielfreien Tagen', fresh.length + ' von ' + _erwartet);
_tageImFenster.filter(d => _spieltage.has(d)).forEach(d =>
  ok(!fresh.some(s => s.id === 'ambient_' + d + '_19'), 'am Spieltag ' + d + ' schweigt der Abend-Slot'));
ok(new Set(fresh.map(s=>s.id)).size === fresh.length, 'keine doppelten IDs');
ok(fresh.every(s => /^ambient_\d{4}-\d{2}-\d{2}_(10|19)$/.test(s.id)), 'ID-Schema unveraendert');

console.log('\n=== 2. WHEN LIEGT AUF DEM ECHTEN SLOT ===');
fresh.forEach(s => {
  const m = /^ambient_(\d{4}-\d{2}-\d{2})_(\d+)$/.exec(s.id);
  const d = new Date(s.when);
  ok(d.getHours() === +m[2], s.id + ': when trifft die Slot-Stunde', d.toISOString());
  ok(d.getTime() <= new Date(NOW).getTime(), s.id + ': liegt nicht in der Zukunft');
});
const sorted = fresh.map(s=>new Date(s.when).getTime());
ok(sorted.every((t,i)=>i===0||t>=sorted[i-1]), 'chronologisch aufsteigend erzeugt');

console.log('\n=== 3. IDEMPOTENZ ===');
// Was schon persistiert ist, wird nicht noch einmal erzeugt.
const asStored = fresh.map(s => ({id:s.id, when:s.when, dataRef:{type:'ambient', sub:s.sub,
  ambientPids:s.pids}}));
const second = build(NOW, asStored);
ok(second.length === 0, 'zweiter Lauf erzeugt nichts mehr', second.length + '');
// Nur der Abend-Slot von vorgestern fehlt → genau der kommt nach.
const gapId = fresh[fresh.length-3] ? fresh[fresh.length-3].id : null;
const withGap = asStored.filter(s => s.id !== gapId);
const filled = build(NOW, withGap);
ok(filled.length === 1 && filled[0].id === gapId, 'einzelne Luecke wird gezielt gefuellt',
   filled.map(s=>s.id).join(','));

console.log('\n=== 4. DETERMINISMUS ===');
// Derselbe Slot muss denselben Inhalt liefern, egal ob er am Tag selbst oder
// drei Tage spaeter nachgetragen wird.
// Der Vergleich muss bei GLEICHER Vorgeschichte laufen. Gegen einen leeren
// Verlauf zu bauen ist etwas anderes: der Nachschub weicht absichtlich aus,
// was zuletzt lief, und trifft dann eine andere — ebenso richtige — Wahl.
// Die Zusage lautet: derselbe Slot, dieselbe Vorgeschichte, derselbe Inhalt.
const _pruefId = (fresh.find(s => /_19$/.test(s.id)) || fresh[0]).id;
const lateSlot = fresh.find(s => s.id === _pruefId);
const ohneDiesen = asStored.filter(s => s.id !== _pruefId);
const sameSlot = build(NOW, ohneDiesen).find(s => s.id === _pruefId);
if(lateSlot && sameSlot){
  ok(lateSlot.sub === sameSlot.sub && lateSlot.title === sameSlot.title,
     'Nachtrag == Original (Typ und Text)', lateSlot.sub + ' / ' + sameSlot.sub);
} else {
  ok(false, 'Slot ' + _pruefId + ' in beiden Laeufen vorhanden');
}
const again = build(NOW, []);
ok(JSON.stringify(again) === JSON.stringify(fresh), 'zwei identische Laeufe, identisches Ergebnis');

console.log('\n=== 5. ROTATION BLEIBT ===');
const subs = fresh.map(s=>s.sub);
ok(new Set(subs).size === subs.length, 'kein Fun-Fact-Typ zweimal im Nachschub',
   subs.join(', '));
const perDay = {};
fresh.forEach(s => { const d = s.id.slice(8,18); (perDay[d] = perDay[d] || []).push(s.sub); });
Object.keys(perDay).forEach(d => ok(new Set(perDay[d]).size === perDay[d].length,
  d + ': 10 und 19 Uhr zeigen verschiedene Typen'));
const heads = {};
fresh.forEach(s => s.pids.forEach(p => heads[p] = (heads[p]||0)+1));
const worst = Object.keys(heads).sort((a,b)=>heads[b]-heads[a])[0];
console.log('  Koepfe: ' + Object.keys(heads).map(p=>nm(p)+'×'+heads[p]).join(', '));
ok(!worst || heads[worst] <= 2, 'kein Spieler dominiert den Nachschub',
   worst ? nm(worst)+'×'+heads[worst] : '—');

console.log('\n=== 6. ZUKUENFTIGE SLOTS BLEIBEN ZU ===');
const morning = build('2026-08-27T11:30:00Z', []);   // nach 10:00, vor 19:00 lokal
ok(!morning.some(s => s.id === 'ambient_2026-08-27_19'), 'der heutige 19-Uhr-Slot wartet noch');
ok(morning.some(s => s.id === 'ambient_2026-08-27_10'), 'der heutige 10-Uhr-Slot ist da');
// Am 26.08. wurde gespielt, also gibt es dort keinen Abend-Slot. Nachgetragen
// wird der letzte spielfreie Abend im Fenster.
const _freierAbend = _tageImFenster.filter(d => !_spieltage.has(d) && d < '2026-08-27').pop();
if(_freierAbend) ok(morning.some(s => s.id === 'ambient_' + _freierAbend + '_19'),
  'der Abend-Slot eines spielfreien Vortags wird nachgetragen', _freierAbend);
else ok(!morning.some(s => /2026-08-2[456]_19$/.test(s.id)), 'kein Abend-Slot an Spieltagen');

console.log('\n=== 6. BLICKRICHTUNG DER SLOTS ===');
// 10:00 schaut nach vorn, 19:00 zurueck. Die Rolle ist ein Vorzug, kein
// Verbot — geprueft wird, dass der Vorzug in der Praxis auch greift.
const rolle = k => K.eval(`_ambientRolleVon(${JSON.stringify(k)}) || 'beides'`);
let verkehrt = [];
fresh.forEach(s => {
  const h = +/_(\d+)$/.exec(s.id)[1];
  const r = rolle(s.sub);
  if(r !== 'beides' && r !== (h < 15 ? 'stand' : 'geschichte')) verkehrt.push(s.id + ':' + s.sub);
});
ok(verkehrt.length === 0, 'kein Slot bekommt die falsche Blickrichtung', verkehrt.join(' '));

console.log('\n=== 7. RUECKBLICKE MIT FESTEM TERMIN ===');
// Der Halbzeit-Rueckblick haengt nicht am Losverfahren: am 15. um 19:00
// belegt er den Slot, egal was sonst gezogen haette.
const halb = build('2026-08-15T19:30:00', []).find(s => s.id === 'ambient_2026-08-15_19');
ok(!!halb && halb.sub === 'rueckblick_halbzeit',
   'der 15. um 19:00 gehoert dem Halbzeit-Rueckblick', halb ? halb.sub : 'kein Slot');
ok(!!halb && /Halbzeit im/.test(halb.title), 'und traegt die passende Ueberschrift',
   halb ? halb.title : '');
// Am 14. darf er nicht kommen.
const vorher = build('2026-08-14T19:30:00', []).find(s => s.id === 'ambient_2026-08-14_19');
ok(!vorher || vorher.sub !== 'rueckblick_halbzeit', 'am 14. nicht',
   vorher ? vorher.sub : '—');

console.log('\n=== 8. DIE NEUEN PRESTIGE-KARTEN ===');
const neuKeys = ['prestige_fuehrung','prestige_schwelle','prestige_schritt',
                 'insignium_stand','titelband_stand','rueckblick_halbzeit','rueckblick_jahr'];
const gebaut = JSON.parse(K.eval(`(function(){
  const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?';
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const rng = _ambientRng(_ambientHash('test'));
  const out = {};
  ${JSON.stringify(neuKeys)}.forEach(k => {
    const t = T.find(x => x.key === k);
    if(!t){ out[k] = {fehlt:true}; return; }
    let r = null, err = null;
    try { r = t.make(rng); } catch(e){ err = e.message; }
    out[k] = r ? {title:r.title, desc:r.desc, ref:r.dataRef||{}} : {leer:true, err};
  });
  return JSON.stringify(out);
})()`));
neuKeys.forEach(k => ok(!gebaut[k].fehlt, 'Template ' + k + ' ist im Pool'));
neuKeys.forEach(k => ok(!gebaut[k].err, 'Template ' + k + ' laeuft ohne Fehler', gebaut[k].err || ''));
// Alle ausser dem Jahresrueckblick muessen auf den echten Daten etwas liefern:
// 2025 hat die Liga noch nicht gespielt, also ist `null` dort das richtige.
neuKeys.filter(k => k !== 'rueckblick_jahr')
  .forEach(k => ok(!gebaut[k].leer, 'Template ' + k + ' liefert eine Karte'));
ok(gebaut.rueckblick_jahr.leer, 'der Jahresrueckblick schweigt ohne Vorjahr');
['prestige_fuehrung','prestige_schwelle','prestige_schritt','titelband_stand']
  .forEach(k => ok(gebaut[k].ref && gebaut[k].ref.prestige === true,
    k + ' zeigt das Insignium als Bild'));
neuKeys.filter(k => !gebaut[k].leer).forEach(k =>
  ok(!/undefined|NaN|\[object/.test(gebaut[k].title + gebaut[k].desc),
     k + ' sauber formuliert', gebaut[k].desc));

console.log('\n=== 9. BREAKING: NUR DAS SELTENSTE ===');
// Breaking heisst: extrem seltene Auszeichnung oder echtes Ereignis. Ein
// Countdown gehoert nicht dazu — `season_endgame` („Noch 5 Tage") war zeitweise
// die EINZIGE Breaking-Karte im Feed und meldete dabei nichts, was passiert war.
const br = t => K.eval(`_isBreaking({dataRef:${JSON.stringify(t)}})`);
[['lead_change'],['elo_record'],['streak_record'],['season_recap'],['rekord_erstmals']]
  .forEach(([t]) => ok(br({type:t}) === true, 'Breaking: ' + t));
ok(br({type:'badge_unlocked', rarity:'legendary'}) === true, 'Breaking: legendaeres Badge');
ok(br({type:'insignium_stufe', oben:true}) === true, 'Breaking: Lorbeerreif und Ordensstern');
ok(br({type:'insignium_stufe', oben:false}) === false, 'die unteren Stufen sind kein Breaking');
ok(br({type:'badge_unlocked', rarity:'rare'}) === false, 'ein seltenes Badge reicht nicht');
ok(br({type:'season_endgame'}) === false, 'ein Countdown ist kein Ereignis');
ok(br({type:'rekord_geholt'}) === false, 'ein Halterwechsel allein ist kein Breaking');
ok(br({type:'chronik_monat'}) === false, 'die Monatschronik ist kein Breaking');
ok(br({type:'top_clash'}) === false, 'top_clash ist kein Breaking mehr');
ok(br({type:'giant_slayer'}) === false, 'giant_slayer ist kein Breaking mehr');
ok(br({type:'potd'}) === false, 'Alltag bleibt Alltag');

console.log('\n=== 9b. DIE EWIGE TAFEL MELDET SICH ===');
// Der ganze Awards-Reiter kam im Feed nicht vor: wer einen Liga-Rekord
// uebernahm, eine Monatschronik holte oder eine Insignium-Stufe erreichte,
// erfuhr es nur, wenn er selbst nachsah.
const _tafel = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const typ = t => roh.filter(s => (s.dataRef||{}).type === t);
  const rek = roh.filter(s => ((s.dataRef||{}).type || '').indexOf('rekord_') === 0);
  return {
    rekorde: rek.length,
    ausbau: typ('rekord_gesteigert').length,
    // Ein Rekord ist nur dann eine Meldung, wenn sich die ANGEZEIGTE Zahl
    // aendert. Sonst stand neunmal „X baut seinen Rekord aus" mit derselben
    // Zahl wie vorher.
    ausbauStumm: typ('rekord_gesteigert').filter(s => {
      const d = s.dataRef || {}; return !d.ev; }).length,
    kammer: rek.every(s => (s.dataRef||{}).kammer !== 'shame'),
    kat: rek.every(s => s.cat === 'tafel'),
    gesichter: rek.every(s => _newsPids(s).length > 0),
    insignium: typ('insignium_stufe').length,
    insGesicht: typ('insignium_stufe').every(s => _newsPids(s).length > 0),
    chronik: typ('chronik_monat').length + typ('chronik_erstling').length,
    // Jede neue Karte nennt eine Zahl und bleibt ohne Platzhalter.
    sauber: roh.filter(s => s.cat === 'tafel').every(s => {
      const txt = (s.title || '') + ' ' + (s.desc || '');
      const hatZahl = txt.split('').some(c => c >= '0' && c <= '9');
      return hatZahl && txt.indexOf('undefined') < 0 && txt.indexOf('NaN') < 0
          && txt.indexOf('[object') < 0;
    })
  };
})())`));
ok(_tafel.rekorde > 0, 'ein Halterwechsel wird gemeldet', _tafel.rekorde + ' Rekord-Karten');
ok(_tafel.ausbau <= 2, 'hoechstens zwei „ausgebaut" je Lauf', _tafel.ausbau + '');
ok(_tafel.kammer, 'Schattenseiten meldet der Feed nicht');
ok(_tafel.kat, 'Rekorde stehen in der Kammer „Ewige Tafel"');
ok(_tafel.gesichter, 'jede Rekordkarte zeigt ihren Halter [§C33]');
ok(_tafel.insignium > 0, 'eine neue Insignium-Stufe wird gemeldet', _tafel.insignium + '');
ok(_tafel.insGesicht, 'die Insignium-Karte zeigt den Traeger');
ok(_tafel.chronik > 0, 'die Monatschronik wird gemeldet', _tafel.chronik + '');
ok(_tafel.sauber, 'jede Tafel-Karte nennt eine Zahl und traegt keinen Platzhalter');

console.log('\n=== 9c. RUECKBLICKE SIND VOM FEED AUS ERREICHBAR ===');
// `showPotwRecap` und `showPotdRecap` sind gebaut und oeffnen sich am
// richtigen Tag von selbst — vom Feed aus fuehrte kein Weg dorthin. Wer die
// Karte drei Tage spaeter liest, kam an die Auswertung nicht mehr heran.
const _rueck = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const einer = t => roh.find(s => (s.dataRef||{}).type === t) || null;
  const body = s => { try { return s ? _newsDetailBody(s) : ''; } catch(e){ return 'FEHLER ' + e.message; } };
  // Der Wochenrueckblick steht seit dem Umbau als EINE Karte am Sonntag um
  // 23:00. Spieler der Woche, Team der Woche und die vier Superlative sind
  // ihre Zeilen, keine eigenen Karten mehr.
  const wo = einer('woche');
  const teile = wo ? ((wo.dataRef||{}).teile || []) : [];
  const tw = teile.find(t => t.art === 'team') || null;
  return {
    potw: body(einer('potw')).indexOf('data-recap="potw"') >= 0,
    potd: body(einer('potd')).indexOf('data-recap="potd"') >= 0,
    hatPotw: !!einer('potw'), hatPotd: !!einer('potd'),
    hatWoche: !!wo,
    wocheStunde: wo ? new Date(wo.when).getHours() : -1,
    wocheTag: wo ? new Date(wo.when).getDay() : -1,
    wocheTeile: teile.length,
    wocheArten: teile.map(t => t.art),
    wocheGesicht: wo ? _newsPids(wo).length : 0,
    teamWoche: !!tw,
    // Das Duo kommt aus derselben Rechnung wie der Teams-Tab.
    teamWocheGesicht: tw ? (tw.pids||[]).length : 0,
    wocheRueck: body(wo).indexOf('data-recap="potw"') >= 0
  };
})())`));
ok(!_rueck.hatPotw || _rueck.potw, 'die Karte „Spieler der Woche" fuehrt zum Rueckblick');
ok(!_rueck.hatPotd || _rueck.potd, 'die Karte „Spieler des Tages" fuehrt zum Rueckblick');
ok(_rueck.hatWoche, 'der Wochenrueckblick steht als eine Karte');
ok(!_rueck.hatWoche || _rueck.wocheTag === 0, 'die Wochenkarte steht am Sonntag', _rueck.wocheTag);
ok(!_rueck.hatWoche || _rueck.wocheStunde === 23, 'die Wochenkarte steht um 23:00', _rueck.wocheStunde);
ok(!_rueck.hatWoche || _rueck.wocheTeile >= 2, 'sie traegt mehrere Wertungen',
   _rueck.wocheTeile + ': ' + _rueck.wocheArten.join(', '));
ok(!_rueck.hatWoche || _rueck.wocheGesicht > 0, 'die Wochenkarte zeigt ein Gesicht [§C33]', _rueck.wocheGesicht);
ok(_rueck.teamWoche, 'das Team der Woche ist eine ihrer Zeilen');
ok(!_rueck.teamWoche || _rueck.teamWocheGesicht === 2, 'das Team der Woche zeigt beide Gesichter [§C33]',
   _rueck.teamWocheGesicht + '');
ok(!_rueck.hatWoche || _rueck.wocheRueck, 'die Wochenkarte fuehrt in den Wochen-Rueckblick');

console.log('\n=== 10. DER FEED [§C33] ===');
// Der Feed war die einzige Ansicht der App, in der ein Spieler nur ein Name
// war — kein Gesicht, kein Wappen. Und er trug elf Kategoriefarben, in denen
// Gold nichts Besonderes mehr hiess. Diese vier Zusicherungen halten beides.
const _feed = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null;
  const sichtbar = getStoriesCache();
  const zaehl = {};
  sichtbar.forEach(s => { const t=(s.dataRef&&s.dataRef.type)||'-'; zaehl[t]=(zaehl[t]||0)+1; });
  return {
    roh: roh.length, sichtbar: sichtbar.length,
    // Gemessen wird die Verteilung ueber die EREIGNISSE, nicht ueber die
    // Karten: eine Sammelkarte buendelt bis zu vier davon, und wer sie als
    // eine zaehlt, bestraft genau die Buendelung.
    ereignisse: sichtbar.reduce((n, s) => {
      const t = ((s.dataRef||{}).teile||[]); return n + (t.length > 1 ? t.length : 1); }, 0),
    // Wer in der Geschichte vorkommt, bekommt sein Gesicht.
    mitSpieler: sichtbar.filter(s => _newsPids(s).length > 0).length,
    ohneGesicht: sichtbar.filter(s => _newsPids(s).length > 0 && !_newsGesichtHtml(s)).length,
    wappen: sichtbar.filter(s => _newsGesichtHtml(s).indexOf('class="ins"') >= 0).length,
    // Keine Ausrufezeichen [CLAUDE.md §7].
    rufe: roh.filter(s => /!/.test(s.title||'') || /!/.test(s.desc||''))
             .map(s => s.title).slice(0, 5),
    // Kein Typ haeuft sich.
    // Die Typen sammel und woche sind ausgenommen: jede Sammelkarte gehoert zu einer
    // anderen Partie oder einem anderen Tag, und die Wochenkarte gibt es je
    // Woche genau einmal. Sie zu deckeln hiesse, eine Buendelung zu bestrafen.
    haeufung: Object.keys(zaehl).filter(t => zaehl[t] > 2 &&
      ['ambient','group','lead_change','elo_record','streak_record',
       'season_recap','season_endgame','sammel','woche'].indexOf(t) < 0)
      .map(t => t + '×' + zaehl[t]),
    // Doppelte Schlagzeilen: zweimal dieselbe Zeile ist eine Zeile zu viel.
    doppelt: (function(){
      const g = {}; sichtbar.forEach(s => { g[s.title]=(g[s.title]||0)+1; });
      return Object.keys(g).filter(t => g[t] > 1);
    })(),
    // Und zweimal derselbe Text erst recht nicht — „Eine grosse Rivalitaet —
    // die Liga liebt's" stand wortgleich unter zwei Karten untereinander.
    doppelText: (function(){
      const g = {}; sichtbar.forEach(s => { g[s.desc]=(g[s.desc]||0)+1; });
      return Object.keys(g).filter(t => t && g[t] > 1);
    })(),
    // Nichts steht zweimal DIREKT untereinander: zwei gleiche Sorten in Folge
    // lesen sich als eine Karte mit einem Tippfehler.
    // Zwei gleiche Sorten direkt untereinander lesen sich als eine Karte mit
    // einem Tippfehler. Ueber einen TAGESWECHSEL hinweg gilt das nicht: dort
    // steht ein Tageskopf dazwischen, und die Chronologie hat Vorrang vor der
    // Auflockerung — eine Karte, die den Tag wechselt, stuende unter dem
    // falschen Kopf.
    nachbarn: (function(){
      const tg = x => { const d = new Date(x.when);
        return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
      let n = 0;
      // Eine Sammelkarte traegt die Sorte ihres Kopfs: zwei Buendel derselben
      // Minute sind der Fall, den die Buendelung gerade verhindert, und zwei
      // Sammelkarten mit verschiedenen Koepfen sehen nicht gleich aus.
      const art = x => { const d = x.dataRef || {};
        return d.type === 'sammel' ? (d.kopfTyp || 'sammel') : d.type; };
      for(let i = 1; i < sichtbar.length; i++){
        const a = art(sichtbar[i-1]), b = art(sichtbar[i]);
        if(a && a === b && tg(sichtbar[i-1]) === tg(sichtbar[i])) n++;
      }
      return n;
    })(),
    // Und die Gegenrechnung: der Feed ist wirklich chronologisch.
    ausDerReihe: (function(){
      let n = 0;
      for(let i = 1; i < sichtbar.length; i++){
        if(new Date(sichtbar[i].when) > new Date(sichtbar[i-1].when)) n++;
      }
      return n;
    })(),
    // Wie ungleich sind die Gesichter verteilt? Vorher stand ein Spieler auf
    // neun von einunddreissig Karten und ein anderer auf einer.
    gesichter: (function(){
      const g = {}; sichtbar.forEach(s => _newsPids(s).forEach(id => { g[id]=(g[id]||0)+1; }));
      const w = Object.keys(g).map(k => g[k]).sort((x,y) => y-x);
      // Wer gewertet ist, muss auch vorkommen. Das ist die staerkere Frage als
      // die nach dem Spitzenreiter: der Feed darf jemanden feiern, aber er
      // darf niemanden uebergehen.
      const zahl = {};
      matches.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(id) zahl[id]=(zahl[id]||0)+1; }));
      const gewertet = Object.keys(zahl).filter(id => pmap()[id] && !pmap()[id].hidden && zahl[id] >= 20);
      return {koepfe: Object.keys(g).length, max: w[0] || 0,
              gewertet: gewertet.length, ohne: gewertet.filter(id => !g[id]).map(id => pmap()[id].name)};
    })(),
    // Kann ein Spieler mit wenigen Partien ueberhaupt vorkommen? Gefragt ist
    // die MOEGLICHKEIT, nicht der Treffer an diesem Tag.
    kleinsteMoeglich: (function(){
      const zahl = {};
      matches.forEach(m => [m.a1,m.a2,m.b1,m.b2].forEach(id => { if(id) zahl[id]=(zahl[id]||0)+1; }));
      const wenig = Object.keys(zahl).filter(id => pmap()[id] && zahl[id] >= 5 && zahl[id] < 30);
      // Der Fun-Fact-Topf verlangt fuenf Partien — mehr nicht.
      return wenig.length ? wenig.every(id => zahl[id] >= 5) : true;
    })()
  };
})())`));

ok(_feed.doppelText.length === 0, 'keine zwei Karten tragen denselben Text',
   _feed.doppelText.slice(0, 2).join(' | ') || 'keine');
ok(_feed.nachbarn === 0, 'keine zwei Karten derselben Sorte am selben Tag direkt untereinander',
   _feed.nachbarn + ' Paare');
ok(_feed.ausDerReihe === 0, 'der Feed steht chronologisch, von neu nach alt',
   _feed.ausDerReihe + ' Karten aus der Reihe');
// Gefragt ist, ob jemand den Feed BEHERRSCHT. Gezaehlt wird deshalb gegen die
// Zahl der EREIGNISSE, nicht gegen die der Karten: eine Sammelkarte fasst bis
// zu vier Meldungen zusammen, und wer auf ihr steht, steht auf einer Karte,
// die vier Dinge erzaehlt. Gemessen an den Karten kam der Spitzenwert auf
// 9 von 23 (39 %), an den Ereignissen auf 9 von 35 (26 %) — dieselbe Person,
// dieselbe Woche, zwei Nenner. Der Nenner, der die Frage beantwortet, ist der
// zweite.
ok(_feed.gesichter.max <= Math.max(4, Math.ceil(_feed.ereignisse / 3)),
   'kein Spieler steht auf einem Drittel aller Ereignisse',
   _feed.gesichter.max + ' von ' + _feed.ereignisse);
// Die Gegenrechnung, damit die Buendelung keine Beherrschung verstecken kann:
// die HAELFTE der Karten bleibt in jedem Fall die Grenze.
ok(_feed.gesichter.max <= Math.ceil(_feed.sichtbar / 2),
   'und auf keiner Haelfte der Karten',
   _feed.gesichter.max + ' von ' + _feed.sichtbar);
// Der Deckel je Sorte darf niemanden ganz verschwinden lassen: die dritte
// Duo-Pleitenserie fiel weg, und mit ihr die einzige Karte, auf der die
// beiden Beteiligten in dieser Woche ueberhaupt standen. Gemessen fehlten
// danach drei von zwoelf Spielern.
const _nachhol = JSON.parse(K.eval(`JSON.stringify((function(){
  const jetzt = Date.now();
  const l = [];
  // Vier gleichartige Karten: der Deckel laesst zwei stehen. Die vierte
  // gehoert zwei Leuten, die sonst nirgends vorkommen.
  for(let i = 0; i < 4; i++) l.push({
    id:'ts_' + i, title:'Serie ' + i, desc:'Text ' + i, cat:'team', ic:'flame',
    prio:7, when:new Date(jetzt - i * 86400000 * 5).toISOString(),
    dataRef:{type:'team_streak', a:players[i*2].id, b:players[i*2+1].id,
             playerIds:[players[i*2].id, players[i*2+1].id], streak:0}});
  const raus = _consolidateStories(l);
  const drin = new Set();
  raus.forEach(s => { try { (_newsPids(s)||[]).forEach(p => drin.add(p)); } catch(e){} });
  return {karten:raus.length, spieler:drin.size};
})())`));
ok(_nachhol.karten > 2, 'der Deckel holt zurueck, was sonst ganz fehlte',
   _nachhol.karten + ' Karten');
ok(_nachhol.spieler === 8, 'und damit steht jeder Beteiligte wieder im Feed',
   _nachhol.spieler + ' von 8');

ok(_feed.gesichter.ohne.length === 0,
   'jeder gewertete Spieler kommt im Feed vor',
   _feed.gesichter.ohne.join(', ') || (_feed.gesichter.gewertet + ' gewertet, alle dabei'));
ok(_feed.gesichter.koepfe >= 8, 'der Feed zeigt viele verschiedene Gesichter',
   _feed.gesichter.koepfe + ' Köpfe');
ok(_feed.kleinsteMoeglich === true,
   'auch ein Spieler mit wenigen Partien kann eine Story bekommen');
console.log('  ' + _feed.roh + ' erzeugt, ' + _feed.sichtbar + ' im Feed · '
  + _feed.mitSpieler + ' mit Spieler, davon ' + _feed.wappen + ' mit Wappen');

ok(_feed.ohneGesicht === 0,
   'jede Story mit Spieler traegt sein Gesicht',
   _feed.ohneGesicht + ' ohne');
ok(_feed.wappen > 0,
   'die Einzelspieler-Karten tragen das Wappen wie ueberall sonst',
   _feed.wappen + ' von ' + _feed.mitSpieler);
ok(_feed.rufe.length === 0,
   'keine Ausrufezeichen in Schlagzeile oder Text',
   _feed.rufe.join(' | ') || 'keine');
ok(_feed.haeufung.length === 0,
   'kein Story-Typ steht mehr als zweimal im Feed',
   _feed.haeufung.join(', ') || 'keiner');
ok(_feed.doppelt.length === 0,
   'keine zwei Karten mit derselben Schlagzeile',
   _feed.doppelt.join(' | ') || 'keine');


console.log('\n=== 11. DER TAGESPLAN ===');
// Drei Uhrzeiten haben sich geaendert, alle drei mit einem Grund.
const _plan = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const s = _consolidateStories(roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when)));
  const potd = s.filter(x => (x.dataRef||{}).type === 'potd');
  const chr  = s.filter(x => (x.dataRef||{}).type === 'chronik_monat');
  const tagVon = m => { const d = new Date(m.created_at);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const spieltage = new Set(matches.map(tagVon));
  const kVon = w => { const d = new Date(w);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  return {
    // Der Spieler des Tages steht um 23:59 an dem Tag, an dem gespielt wurde.
    potdZeit: potd.map(x => new Date(x.when).getHours()+':'+String(new Date(x.when).getMinutes()).padStart(2,'0')),
    potdAmSpieltag: potd.every(x => spieltage.has(kVon(x.when))),
    // Die Chronik erscheint mit dem Monatswechsel, nicht am Vormittag danach.
    chrZeit: chr.map(x => new Date(x.when).getHours()+':'+new Date(x.when).getMinutes()),
    chrErster: chr.every(x => new Date(x.when).getDate() === 1),
    // Die Sammelkarte muss wirklich buendeln: jede Zeile, die sie traegt,
    // stand vorher als eigene Karte im Feed und darf jetzt nicht mehr daneben
    // stehen. Ohne diese Gegenrechnung misst die Zusicherung nichts.
    sammel: s.filter(x => (x.dataRef||{}).type === 'sammel')
             .map(x => ((x.dataRef||{}).teile||[]).length),
    sammelErsetzt: (function(){
      const titelImFeed = new Set(s.filter(x => (x.dataRef||{}).type !== 'sammel').map(x => x.title));
      let daneben = 0;
      s.filter(x => (x.dataRef||{}).type === 'sammel').forEach(x => {
        ((x.dataRef||{}).teile || []).forEach(t => { if(titelImFeed.has(t.titel)) daneben++; });
      });
      return daneben;
    })(),
    // Wie viele Karten haette der Feed ohne die Buendelung?
    ohneSammel: s.reduce((n, x) => n + ((x.dataRef||{}).type === 'sammel'
      ? (((x.dataRef||{}).teile||[]).length) : 1), 0),
    mitSammel: s.length
  };
})())`));
ok(_plan.potdZeit.every(t => t === '23:59'), 'der Spieler des Tages steht um 23:59',
   _plan.potdZeit.join(', ') || 'keiner');
ok(_plan.potdAmSpieltag, 'und zwar an dem Tag, an dem gespielt wurde');
ok(_plan.chrZeit.every(t => t === '0:0'), 'die Chronik erscheint um 00:00',
   _plan.chrZeit.join(', ') || 'keine');
ok(_plan.chrErster, 'am ersten Tag des Folgemonats');
ok(_plan.sammel.length > 0, 'es gibt Sammelkarten', _plan.sammel.length + '');
ok(_plan.sammel.every(n => n >= 2 && n <= 4), 'eine Sammelkarte traegt zwei bis vier Zeilen',
   _plan.sammel.join(', ') || 'keine');
ok(_plan.sammelErsetzt === 0, 'keine ihrer Zeilen steht daneben noch als eigene Karte',
   _plan.sammelErsetzt + ' doppelt');
ok(_plan.mitSammel < _plan.ohneSammel, 'die Buendelung verkuerzt den Feed',
   _plan.mitSammel + ' statt ' + _plan.ohneSammel);

console.log('\n=== 12. DERSELBE FAKT NICHT ZWEIMAL IM MONAT ===');
// Der Typ-Cooldown (7 Tage) und der Spieler-Cooldown (2 Tage) verhindern die
// Kombination nicht: die Fuehrungs-Typen zeigen strukturell auf denselben Kopf.
// Gemessen wiederholten sich ueber 40 Tage elf Typ-Person-Paare, eines fuenfmal.
const _paare = JSON.parse(K.eval(`JSON.stringify((function(){
  if(!Array.isArray(_cache._stories)) _cache._stories = [];
  const basis = new Date('2026-08-27T23:00:00');
  const zaehl = {}, tag = {};
  for(let d = 39; d >= 0; d--){
    const t = new Date(basis.getTime() - d*86400000);
    [10, 19].forEach(h => {
      const j = new Date(t); j.setHours(h, 5, 0, 0);
      let a = [];
      try { a = _buildAmbientStories(j, pmap(), id => pname(id)) || []; } catch(e){}
      a.filter(x => new Date(x.when).getHours() === h &&
                    new Date(x.when).toDateString() === t.toDateString())
       .forEach(x => {
         _cache._stories.push(x);
         const sub = (x.dataRef||{}).sub, pid = (x.dataRef||{}).ambientPid;
         if(!sub || !pid) return;
         // Pflicht-Slots sind ausgenommen: ein Rueckblick gehoert auf sein
         // Datum und darf nicht vom Losverfahren abhaengen. Wer darin vorkommt,
         // entscheidet der Monat, nicht der Generator.
         if(sub === 'rueckblick_halbzeit' || sub === 'rueckblick_jahr') return;
         const k = sub + '|' + pid;
         const ts = j.getTime();
         if(tag[k] != null && (ts - tag[k]) <= 30*86400000) zaehl[k] = (zaehl[k]||0)+1;
         tag[k] = ts;
       });
    });
  }
  return {verstoesse: Object.keys(zaehl).length, liste: Object.keys(zaehl).slice(0, 4)};
})())`));
ok(_paare.verstoesse === 0, 'kein Fun Fact wiederholt Typ und Person binnen 30 Tagen',
   _paare.liste.join(', ') || 'keiner');

console.log('\n=== 13. DER TEXT KOMMT AUS DEM GENERATOR ===');
// Stories werden persistiert, damit alle Geraete dieselbe Karte sehen. Titel
// und Text waren damit eingefroren: eine ueberarbeitete Formulierung erschien
// nur an Karten, die es noch nicht gab. Der Feed zeigte weiter Saetze, die im
// Quelltext seit dem Umbau nicht mehr stehen.
const _auffr = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  if(!frisch.length) return {n:0};
  // Eine persistierte Zeile mit ALTEM Wortlaut nachstellen.
  const alt = frisch.map(s => Object.assign({}, s, {
    title: 'ALTER TITEL', desc: 'alter Text mit einem Gedankenstrich — und einer Floskel.'}));
  _cache._stories = alt;
  _cache._consolFrom = null;
  const sicht = getStoriesCache();
  return {
    n: sicht.length,
    nochAlt: sicht.filter(x => x.title === 'ALTER TITEL').length,
    mitStrich: sicht.filter(x => (x.desc||'').indexOf('—') >= 0).length,
    // Zeitpunkt und ID muessen bleiben, sonst springt eine Karte im Feed.
    // Ausgenommen ist, was die Konsolidierung SELBST baut: Sammelkarte,
    // Badge-Gruppe und Typ-Gruppe fassen mehrere Zeilen zusammen und bekommen
    // dafuer eine eigene ID. Erkennbar am Praefix, nicht am Typ — die
    // Badge-Gruppe traegt weiter den Typ badge_unlocked, weil sie davon erzaehlt.
    idsGleich: sicht.every(x => frisch.some(f => f.id === x.id)
                              || /^(sammel_|badgegrp_|grp_)/.test(x.id || ''))
  };
})())`));
ok(_auffr.n > 0, 'der Feed steht', _auffr.n + ' Karten');
ok(_auffr.nochAlt === 0, 'kein persistierter Titel ueberlebt den Generator',
   _auffr.nochAlt + ' von ' + _auffr.n);
ok(_auffr.mitStrich === 0, 'und kein eingefrorener Gedankenstrich',
   _auffr.mitStrich + ' von ' + _auffr.n);
ok(_auffr.idsGleich, 'ID und Zeitpunkt bleiben, was die Datenbank sagt');

// ── Was der Generator nicht mehr erzeugt, verschwindet auch ─────────
// Der Wochenrueckblick war einmal sechs eigene Karten ueber den Montag
// verteilt. Er ist jetzt EINE Karte am Sonntag, aber die alten liegen
// persistiert in der Datenbank: am Montag stand „der groesste Sprung der
// Woche" neben dem Spieltag, der gerade lief.
//
// Abgemeldet wird am ID-PRAEFIX, nicht am Typ: der woechentliche Elo-Sprung
// hiess `elo_swing_week_…` und trug denselben Typ wie der taegliche, der es
// noch gibt. Ueber den Typ war er nicht zu fassen.
const _abg = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  // Die Liste wird GELESEN, nicht abgeschrieben: eine Kopie haette jede
  // Aenderung an ihr durchgehen lassen.
  const tote = STORY_ABGEMELDET.slice();
  const alt = tote.map((p, i) => ({
    id: p + 'x' + i, cat: 'highlight', ic: 'star',
    title: 'ALTE WOCHENKARTE ' + p, desc: 'Der groesste Sprung der Woche.',
    when: Date.now() - i * 60000, prio: 50,
    dataRef: {type: 'elo_swing', playerIds: [], matchId: null}
  })).concat(frisch);
  _cache._stories = alt; _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  return {
    n: tote.length,
    durch: sicht.filter(x => tote.some(p => String(x.id).indexOf(p) === 0)).length,
    lebend: sicht.length,
    // Und kein Praefix, den der Generator HEUTE noch bildet, steht auf der
    // Liste: das schaltete eine lebende Karte stumm.
    kollision: frisch.filter(s => tote.some(p => String(s.id).indexOf(p) === 0)).length
  };
})())`));
ok(_abg.durch === 0, 'keine abgemeldete Karte erreicht den Feed',
   _abg.durch + ' von ' + _abg.n);
ok(_abg.lebend > 0, 'der Feed steht danach immer noch', _abg.lebend + ' Karten');
ok(_abg.kollision === 0, 'kein abgemeldetes Praefix wird heute noch gebildet',
   _abg.kollision + ' Kollisionen');

// ── Ein Countdown laeuft ab ─────────────────────────────────────────
// „Noch 5 Tage" gilt fuer eine ganze Saison unter EINER ID, und der
// Zeitstempel stammt aus dem ersten Insert. Ist die Saison vorbei, hoert der
// Generator auf — und die Karte zaehlte Tage herunter, die es nicht mehr gab.
const _cd = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const tot = {id:'season_endspurt_2020-01', cat:'highlight', ic:'rocket',
    title:'Noch 5 Tage', desc:'Die Top 2 trennen nur 3 Elo.',
    when: Date.now(), prio: 9,
    dataRef:{type:'season_endgame', sid:'2020-01', daysLeft:5}};
  _cache._stories = [tot].concat(frisch);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Der LAUFENDE Countdown muss bleiben — er wird ja noch gebildet.
  const laufend = frisch.filter(s => (s.dataRef||{}).type === 'season_endgame');
  return {abgelaufenDurch: sicht.filter(x => x.id === tot.id).length,
          laufendeGebildet: laufend.length,
          laufendeImFeed: sicht.filter(x => laufend.some(l => l.id === x.id)).length};
})())`));
ok(_cd.abgelaufenDurch === 0, 'ein abgelaufener Countdown steht nicht mehr im Feed',
   _cd.abgelaufenDurch + ' durch');
ok(_cd.laufendeGebildet === 0 || _cd.laufendeImFeed === _cd.laufendeGebildet,
   'der laufende Countdown bleibt', _cd.laufendeImFeed + ' von ' + _cd.laufendeGebildet);

// ── Eine ueberholte Serie verschwindet, auch zu zweit ────────────────
// Die ID einer Serienkarte traegt ihre Laenge (`team_streak_A_B_7`), also
// wird JEDE Laenge einzeln persistiert. Aus einer Serie, die von sieben auf
// zehn wuchs, standen vier Karten im Feed. Fuer Einzelspieler wurde das
// laengst gefiltert, fuer Duos nie.
const _ts = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const echt = frisch.find(s => (s.dataRef||{}).type === 'team_streak'
                             || (s.dataRef||{}).type === 'team_loss_streak');
  if(!echt) return {keine:true};
  const ueberholt = Object.assign({}, echt, {id: echt.id + '_alt',
    dataRef: Object.assign({}, echt.dataRef, {streak: (echt.dataRef.streak || 5) + 5})});
  _cache._stories = [ueberholt].concat(frisch);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Gezaehlt wird die AUSSAGE, nicht die Karte: die laufende Serie kann als
  // Zeile in einer Sammelkarte stehen, und dann steht sie trotzdem im Feed.
  const zeilen = [];
  sicht.forEach(x => {
    const t = ((x.dataRef||{}).teile||[]);
    if(t.length > 1) t.forEach(u => zeilen.push(u.titel));
    else zeilen.push(x.title);
  });
  return {ueberholtDurch: sicht.filter(x => x.id === ueberholt.id).length,
          echteBleibt: zeilen.filter(t => t === echt.title).length};
})())`));
ok(!_ts.keine && _ts.ueberholtDurch === 0,
   'eine ueberholte Duo-Serie steht nicht mehr im Feed', JSON.stringify(_ts));
ok(!_ts.keine && _ts.echteBleibt === 1,
   'die laufende Duo-Serie bleibt', JSON.stringify(_ts));

// ── Der Memo greift ─────────────────────────────────────────────────
// `_newsTexteAuffrischen` lieferte bei jedem Aufruf ein frisches Array, und
// der Referenz-Memo in `_consolidateStories` — der genau dafuer gebaut ist —
// schlug damit nie an. `getStoriesCache` laeuft nach jedem `loadAll` und bei
// jedem Zeichnen des Feeds.
// Gemessen wird der Fall, in dem der Wortlaut sich WIRKLICH aendert: nur dann
// baut die Auffrischung ein neues Array, und nur dort kann der Memo fehlen.
const _memo = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const persistiert = frisch.map(s => Object.assign({}, s, {title: 'ALT: ' + s.title}));
  _cache._stories = persistiert; _cache._consolFrom = null; _cache._frischVon = null;
  getStoriesCache();
  let treffer = 0;
  for(let i = 0; i < 5; i++){
    const vor = _cache._consolList;
    getStoriesCache();
    if(_cache._consolList === vor) treffer++;
  }
  return {treffer};
})())`));
ok(_memo.treffer === 5, 'der Memo der Konsolidierung greift', _memo.treffer + ' von 5');

// Diese Praefixe hat der Generator einmal gebildet und bildet sie nicht mehr.
// Die Liste ist ein historischer Befund, keine Kopie der Code-Liste: sie
// haelt fest, WAS abgemeldet gehoert, und faellt, wenn eines wieder von der
// Abmeldung verschwindet. `elo_swing_week_` fehlte zuerst, weil sein Typ
// (`elo_swing`) noch gebildet wird — die Karte stand weiter im Feed.
const _historisch = ['upset_match_', 'thriller_', 'biggest_blowout_', 'potw_',
                     'team_woche_', 'anniversary_', 'elo_swing_week_'];
const _fehlend = JSON.parse(K.eval(`JSON.stringify(${JSON.stringify(_historisch)}
  .filter(p => !STORY_ABGEMELDET.includes(p)))`));
ok(_fehlend.length === 0, 'jedes einmal gebildete, tote Praefix ist abgemeldet',
   _fehlend.join(', '));

// ── Nichts steht zweimal untereinander ──────────────────────────────
// Nach zwei Partien standen zwei Karten „Martin baut ‚Der Fels' aus"
// untereinander, beide mit 6.9 gegen 7.0 und nur einer anderen Spielzahl im
// Fliesstext — und in einer Sammelkarte stand dieselbe Zeile VIERMAL. Die ID
// trug den rohen Wert, also bekam jede Partie eine eigene Karte, obwohl die
// ANGEZEIGTE Zahl dieselbe blieb.
//
// Und gebuendelt wird nach der Minute statt nach der Partie: genau ein
// Story-Typ trug ueberhaupt eine `matchId`, alles andere fiel durch.
const _dop = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const basis = roh.find(s => ((s.dataRef||{}).type||'').indexOf('rekord_') === 0) || roh[0];
  // Vier persistierte Zeilen mit derselben Schlagzeile, wie sie nach vier
  // Partien an einem Tag entstanden sind.
  const vier = [1,2,3,4].map(i => Object.assign({}, basis, {
    id: 'rek_fels_' + i, title: 'X baut „Der Fels" aus',
    desc: '6.9 Gegentore je Abwehrspiel · ' + (152+i) + ' Spiele. Vorher 7.0.',
    dataRef: Object.assign({}, basis.dataRef || {}, {type:'rekord_gesteigert'})}));
  _cache._stories = vier.concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const titel = sicht.map(s => String(s.title||''));
  const zeilen = [];
  sicht.forEach(s => ((s.dataRef||{}).teile || []).forEach(t => {
    if(t && t.titel) zeilen.push(String(t.titel)); }));
  // Je Sammelkarte: keine zwei Zeilen mit derselben Schlagzeile.
  let zeilenDoppelt = 0;
  sicht.forEach(s => { const ts = ((s.dataRef||{}).teile||[]).map(t => String(t.titel||''));
    ts.forEach((t, i) => { if(t && ts.indexOf(t) !== i) zeilenDoppelt++; }); });
  // Und in einer Minute steht hoechstens eine Karte JE SUBJEKT: zwei Karten
  // derselben Minute sind erlaubt, wenn sie von verschiedenen Leuten handeln
  // — genau das ist der Grund, warum die Buendelung nicht mehr nur nach der
  // Minute geht. Zwei Karten ueber DENSELBEN Spieler in derselben Minute
  // waeren dagegen die Doublette, die sie verhindern soll.
  const proMin = {};
  const gesehen = {};
  sicht.forEach(s => {
    const k = new Date(s.when).toISOString().slice(0,16);
    const dd = s.dataRef || {};
    // Was absichtlich einzeln bleibt, ist keine Doublette: Breaking und eine
    // seltene Auszeichnung stehen fuer sich, auch wenn in derselben Minute
    // eine Sammelkarte ueber dieselbe Person steht.
    let einzeln = false;
    try { einzeln = _isBreaking(s); } catch(e){}
    if(dd.type === 'badge_unlocked' && (dd.rarity === 'rare' || dd.rarity === 'legendary'))
      einzeln = true;
    if(einzeln) return;
    let ids = []; try { ids = _newsPids(s) || []; } catch(e){}
    if(!gesehen[k]) gesehen[k] = {};
    let kollision = false;
    ids.forEach(id => { if(gesehen[k][id]) kollision = true; gesehen[k][id] = 1; });
    if(kollision) proMin[k] = (proMin[k]||1) + 1;
  });
  return {
    felsGesamt: titel.filter(t => t.indexOf('Der Fels') >= 0).length
              + zeilen.filter(t => t.indexOf('Der Fels') >= 0).length,
    titelDoppelt: titel.filter((t, i) => t && titel.indexOf(t) !== i).length,
    zeilenDoppelt,
    minutenMitMehreren: Object.keys(proMin).filter(k => proMin[k] > 1).length
  };
})())`));
ok(_dop.felsGesamt === 1, 'vier gleiche Meldungen werden zu einer',
   _dop.felsGesamt + ' mal im Feed');
ok(_dop.titelDoppelt === 0, 'keine zwei Karten tragen dieselbe Schlagzeile',
   _dop.titelDoppelt + ' doppelt');
ok(_dop.zeilenDoppelt === 0, 'keine Sammelkarte wiederholt eine Zeile',
   _dop.zeilenDoppelt + ' doppelt');
ok(_dop.minutenMitMehreren === 0,
   'in einer Minute steht hoechstens eine Karte je Spieler',
   _dop.minutenMitMehreren + ' Minuten');

// ── Die Sammelkarte wiederholt ihren eigenen Kopf nicht ─────────────
// Bei einer Spiel-Sammelkarte gehoeren Schlagzeile und Text dem staerksten
// Ereignis. Dessen Zeile stand im Blatt darunter wortgleich ein zweites Mal,
// und der Text der Tafel-Karte haengte die Schlagzeilen ALLER Zeilen
// aneinander — die Karte trug damit die Liste, die das Blatt darunter fuehrt.
const _sam = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const norm = t => String(t||'').replace(/<[^>]*>/g,' ')
    .replace(/&[a-z]+;/g,' ').replace(/[^0-9a-zA-ZäöüÄÖÜß%]+/g,' ').trim().toLowerCase();
  const sicht = getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel');
  let kopfZeile = 0, textListe = 0, leer = 0;
  sicht.forEach(x => {
    const b = _newsDetailBody(x);
    const oben = norm(x.title + ' ' + x.desc);
    const labels = (b.match(/class="nw-label">([^<]*)</g)||[])
      .map(t => norm(t.replace(/^[^>]*>/,'').replace(/<$/,'')));
    if(!labels.length) leer++;
    labels.forEach(l => { if(l.length >= 12 && oben.indexOf(l) >= 0) kopfZeile++; });
    // Der Text der Karte darf nicht die Schlagzeilen aller Zeilen sein.
    const alle = (x.dataRef.teile||[]).map(t => norm(t.titel));
    if(alle.length > 1 && alle.every(t => t && norm(x.desc).indexOf(t) >= 0)) textListe++;
  });
  return {n: sicht.length, kopfZeile, textListe, leer};
})())`));
ok(_sam.n > 0, 'es gibt Sammelkarten mit Blatt', _sam.n + '');
ok(_sam.kopfZeile === 0, 'keine Sammelkarte wiederholt ihren Kopf als Zeile',
   _sam.kopfZeile + ' Zeilen');
ok(_sam.textListe === 0, 'der Kartentext ist eine Zusammenfassung, keine Liste',
   _sam.textListe + ' Karten');
ok(_sam.leer === 0, 'und keine Sammelkarte oeffnet ein leeres Blatt',
   _sam.leer + ' leer');

// ── Gebuendelt wird nur, was ein Subjekt teilt ──────────────────────
// Die Minute allein reichte nicht: „Leon und Maxi gewinnen zusammen alles"
// trug „Leo: Angstgegner" als zweite Zeile, und Leo spielte in dieser Partie
// gar nicht mit. Gemessen waren drei von fuenf Spiel-Buendeln so gebaut.
// Und was selten ist, bleibt eine eigene Karte: „Nerven aus Stahl" (drei
// Zittersiege in Folge) stand als Kleingedrucktes unter der Duo-Serie zweier
// Fremder.
const _sub = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const sammel = sicht.filter(x => (x.dataRef||{}).type === 'sammel');
  // Je Spiel-Buendel: jede Zeile teilt mindestens einen Spieler mit dem Rest.
  const fremd = [];
  sammel.filter(x => x.dataRef.quelle === 'spiel').forEach(x => {
    const t = x.dataRef.teile || [];
    t.forEach((z, i) => {
      const andere = t.filter((_, j) => j !== i)
        .reduce((a, u) => a.concat(u.pids || []), []);
      if(!(z.pids || []).some(p => andere.indexOf(p) >= 0))
        fremd.push(x.title + ' / ' + z.titel);
    });
  });
  // Seltene und legendaere Auszeichnungen stehen nie als Zeile.
  const zeilenTitel = [];
  sammel.forEach(x => (x.dataRef.teile||[]).forEach(z => zeilenTitel.push(z.titel)));
  const selten = roh.filter(s => { const d = s.dataRef || {};
    return d.type === 'badge_unlocked' && (d.rarity === 'rare' || d.rarity === 'legendary'); });
  const versteckt = selten.filter(s => zeilenTitel.indexOf(s.title) >= 0).map(s => s.title);
  return {sammel: sammel.length, fremd, selten: selten.length, versteckt,
          ohnePids: sammel.reduce((n, x) => n + (x.dataRef.teile||[])
            .filter(z => !(z.pids||[]).length).length, 0)};
})())`));
ok(_sub.sammel > 0, 'es gibt Sammelkarten', _sub.sammel + '');
ok(_sub.fremd.length === 0, 'jede Zeile eines Spiel-Buendels teilt einen Spieler mit dem Rest',
   _sub.fremd.slice(0, 3).join(' | ') || 'keine fremde Zeile');
ok(_sub.selten > 0 && _sub.versteckt.length === 0,
   'eine seltene Auszeichnung steht nie als Zeile in einem Buendel',
   _sub.versteckt.join(', ') || _sub.selten + ' seltene, alle einzeln');
ok(_sub.ohnePids === 0, 'jede Zeile weiss, von wem sie handelt',
   _sub.ohnePids + ' ohne');

// ── Die Monatschronik im laufenden Monat ────────────────────────────
//    Der ganze laufende Monat kam im Feed nicht vor: die Monatskarte
//    entsteht erst am 1. fuer den VORmonat, und gemessen trug der August
//    dreizehn Eintraege und keine einzige Karte. Wer „Auf dem Thron" holte,
//    erfuhr es nur, wenn er selbst in den Chronik-Tab sah.
const _chrg = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const chr = roh.filter(s => (s.dataRef||{}).type === 'chronik_geholt');
  const sid = currentSeason().id;
  // Der Zeitschnitt muss wirklich schneiden: der Stand vor dem letzten
  // Spieltag darf nicht derselbe sein wie der von heute, sonst gibt es nie
  // eine Meldung.
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const jetzt = seasonTitleHalter(sid);
  const vorher = seasonTitleHalter(sid, t0.getTime() - 1);
  const schatten = chr.filter(s => {
    const t = SEASON_TITLE_BY_ID[(s.dataRef||{}).titleId];
    return t && t.kunst === 'schatten';
  }).length;
  return {
    n: chr.length,
    prio: chr.map(s => s.prio),
    ohneRef: chr.filter(s => !(s.dataRef||{}).titleId || !(s.dataRef||{}).punkte).length,
    ohnePids: chr.filter(s => !((s.dataRef||{}).playerIds||[]).length).length,
    schatten,
    // Blatt: jede Karte muss eine Mitte haben, sonst oeffnet sie ins Leere.
    leer: chr.filter(s => !String(_newsDetailBody(s) || '').trim()).length,
    // Der Wert auf der Karte ist das Prestige, nicht die erste Zahl im Satz.
    wert: chr.map(s => { const w = _newsTafelWert(s); return w ? w.l : '—'; }),
    stand: {jetzt: Object.keys(jetzt).length, vorher: Object.keys(vorher).length},
    // Zwei Halterstaende zum selben Zeitpunkt muessen gleich sein: sonst
    // haengt der Schnitt an etwas anderem als der Zeit.
    stabil: JSON.stringify(seasonTitleHalter(sid)) === JSON.stringify(jetzt)
  };
})())`));
ok(_chrg.stand.jetzt > 0, 'der Halterstand des laufenden Monats ist zu lesen',
   _chrg.stand.jetzt + ' Chroniken');
ok(_chrg.stabil, 'derselbe Zeitpunkt ergibt denselben Halterstand');
ok(_chrg.stand.vorher !== _chrg.stand.jetzt || _chrg.n > 0,
   'der Zeitschnitt schneidet wirklich',
   'vorher ' + _chrg.stand.vorher + ', heute ' + _chrg.stand.jetzt);
ok(_chrg.n > 0, 'eine Chronik im laufenden Monat wird gemeldet', _chrg.n + ' Karten');
ok(_chrg.n <= 2, 'hoechstens zwei Chronik-Karten je Lauf', _chrg.n + ' Karten');
ok(_chrg.prio.every(p => p === 80),
   'die Chronik-Karte liegt zwischen Liga-Rekord und Insignium-Stufe',
   _chrg.prio.join(','));
ok(_chrg.ohneRef === 0, 'jede Chronik-Karte kennt ihre Wertung und ihr Prestige',
   _chrg.ohneRef + ' ohne');
ok(_chrg.ohnePids === 0, 'jede Chronik-Karte weiss, von wem sie handelt',
   _chrg.ohnePids + ' ohne');
ok(_chrg.schatten === 0, 'Schattenseiten meldet der Feed nicht', _chrg.schatten + ' gemeldet');
ok(_chrg.leer === 0, 'jede Chronik-Karte oeffnet ein Blatt mit Inhalt', _chrg.leer + ' leer');
ok(_chrg.wert.every(l => l === 'Prestige'),
   'der grosse Wert der Chronik-Karte ist ihr Prestige', _chrg.wert.join(','));

// Und das Gebuendelte steht auf der KARTE, nicht erst im Blatt.
const _band = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sammel = getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel');
  let ohneBand = 0, zeilen = 0;
  sammel.forEach(x => {
    const h = _newsCardHtmlM2(x, false, false);
    const n = (h.split('nf-sam-z').length - 1);
    zeilen += n;
    // Was nicht die Schlagzeile selbst ist, muss als Zeile auf der Karte
    // stehen. „Selbst" sind zwei Titel: der der Karte und der des Kopfs.
    // Bei einer Tafel-Sammelkarte sind sie verschieden („Henry, Martin und
    // zwei weitere bewegen die Ewige Tafel" gegen „Henry uebernimmt ‚Der
    // Gigantentoeter'"), und geprueft wurde nur der erste — damit stand der
    // Kopf als erste Zeile des Bandes noch einmal da, sein Text darueber,
    // und von der vierten Meldung blieb „und 1 weitere".
    // Die beiden zusammenfuehrenden Karten tragen eine EIGENE Schlagzeile
    // („Tobi holt zwei Liga-Rekorde") und lassen deshalb keine Zeile aus,
    // auch nicht die des Kopfs — und sie zeigen ALLE, nicht drei und „und
    // 2 weitere": dort ist die Vollstaendigkeit die Aussage [§C33].
    const achse = x.dataRef.quelle === 'spieler' || x.dataRef.quelle === 'erfolg';
    if(achse){ if((x.dataRef.teile||[]).length !== n) ohneBand++; return; }
    const _selbst = [x.title, x.dataRef.kopfTitel].filter(Boolean);
    const rest = (x.dataRef.teile||[])
      .filter(t => _selbst.indexOf(t.titel) < 0).length;
    if(Math.min(rest, 3) !== n) ohneBand++;
  });
  return {n: sammel.length, ohneBand, zeilen};
})())`));
ok(_band.zeilen > 0, 'die Sammelkarte traegt ihr Band', _band.zeilen + ' Zeilen');
ok(_band.ohneBand === 0, 'jede gebuendelte Meldung steht auf der Karte, nicht nur im Blatt',
   _band.ohneBand + ' Karten ohne');

// ── Wer mehreres auf einmal holt, und was mehrere zugleich holen ────
// Die Buendelung kannte nur Moment und Subjekt und borgte sich Rubrik und
// Schlagzeile der staerksten Zeile. An der Ewigen Tafel gruppierte sie sogar
// den ganzen TAG ohne jedes Subjekt: gemessen standen vier Rekordwechsel
// dreier Spieler in einer Karte, und die drei, die im selben Moment dieselbe
// Insignium-Stufe erreichten, fielen ueber die vier Zeilen hinaus und
// standen einzeln daneben. Zwei Achsen kommen deshalb davor.
const _achsen = JSON.parse(K.eval(`JSON.stringify((function(){
  const ids = players.map(p => p.id);
  const W = matches[matches.length-1].created_at;
  const st = (id, typ, extra, prio, ti, tx) => ({id, cat:'tafel', ic:'award',
    title:ti, desc:tx, when:W, prio:prio,
    dataRef:Object.assign({type:typ}, extra)});
  const lauf = liste => { _cache._consolFrom = null;
    return _consolidateStories(liste.slice()).filter(x => (x.dataRef||{}).type === 'sammel'); };
  const zeig = arr => arr.map(x => { const h = String(_newsCardHtmlM2(x, false, false));
    return {q:x.dataRef.quelle, ti:x.title, tx:x.desc,
      n:(x.dataRef.teile||[]).length, sorte:_newsSorte(x),
      rub:_newsRubrik(_newsSorte(x), x), pids:(x.dataRef.playerIds||[]).length,
      band:(h.split('nf-sam-z').length - 1),
      // Der Fuss der Spieler-Karte: die Zahl der Erfolge steht dort und
      // nicht im Satz — der gehoert dem staerksten von ihnen.
      fuss:(h.match(/<b class="g">(\\d+)<\\/b><span>Erfolge im selben Moment/) || [])[1] || '',
      zeilen:(x.dataRef.teile||[]).map(t => t.titel)}; });
  // Die Schlagzeile beginnt mit dem Namen, wie im Generator — daran haengt
  // die Zeile im Sammelband der Spieler-Karte.
  const nm = pid => (pmap()[pid] || {}).name || '?';
  const rek = (id, rid, pid, prio) => st(id, 'rekord_geholt',
    {rekordId:rid, playerIds:[pid], vorher:[]}, prio || 84,
    nm(pid) + ' übernimmt „' + rid + '"', '11 Siege in Folge. Vorher waren es 10.');
  const ins = (id, pid) => st(id, 'insignium_stufe',
    {pid, stufe:1, stufeName:'Schildring', punkte:300 + id.charCodeAt(1), oben:false}, 76,
    nm(pid) + ' traegt den Schildring',
    '385 Prestige zusammen. Bis zum Volutenkranz fehlen 335.');
  return {
    // (a) ein Spieler, zwei Rekorde
    a: zeig(lauf([rek('r1','unstoppable',ids[0]), rek('r2','eloday',ids[0])])),
    // (b) drei Sorten in einem Moment: das Verb steht nur, wo es wechselt
    b: zeig(lauf([rek('r3','unstoppable',ids[0]),
      st('bg','badge_unlocked',{badgeId:'wall_badge',playerId:ids[0],rarity:'common'},8,
         nm(ids[0]) + ': Mauer','Sieg mit maximal 2 Gegentoren.'),
      st('jb','jubilee',{pid:ids[0],total:100},6,nm(ids[0]) + ' feiert 100. Spiel',
         '100 Partien stehen jetzt in der Bilanz.')])),
    // (c) drei Spieler, dieselbe Stufe
    c: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2])])),
    // (d) Der Erfolg gewinnt: wer die Stufe teilt UND einen Rekord holt,
    //     steht mit der Stufe auf der gemeinsamen Karte. Sonst stuende der
    //     Schildring auf zwei Karten [§C33].
    d: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]),
                  rek('r9','switcher',ids[2])])),
    // (e) einer allein bleibt eine eigene Karte
    e: zeig(lauf([rek('r1','unstoppable',ids[0])])),
    n0: (players[0]||{}).name, n1: (players[1]||{}).name, n2: (players[2]||{}).name,
    // (f) und an den echten Partien: zwei Traeger im selben Moment
    echt: (function(){ _cache._consolFrom = null;
      return _consolidateStories(_buildStories())
        .filter(x => (x.dataRef||{}).quelle === 'erfolg')
        .map(x => ({ti:x.title, n:(x.dataRef.teile||[]).length})); })()
  };
})())`));
ok(_achsen.a.length === 1 && _achsen.a[0].q === 'spieler',
   'zwei Erfolge eines Spielers im selben Moment werden EINE Karte',
   _achsen.a.length + ' Karten');
ok(_achsen.a[0] && _achsen.a[0].ti === _achsen.n0 + ' holt zwei Liga-Rekorde',
   'die Schlagzeile nennt den Spieler und zaehlt die Erfolge',
   (_achsen.a[0]||{}).ti);
ok(_achsen.a[0] && _achsen.a[0].n === 2 && _achsen.a[0].band === 2,
   'und jeder der beiden steht als Zeile auf der Karte',
   (_achsen.a[0]||{}).band + ' von ' + (_achsen.a[0]||{}).n);
ok(_achsen.b[0] && _achsen.b[0].ti
   === _achsen.n0 + ' holt einen Liga-Rekord, eine Auszeichnung und feiert ein Jubiläum',
   'das Verb steht nur da, wo es wechselt', (_achsen.b[0]||{}).ti);
ok(_achsen.b[0] && _achsen.b[0].band === 3,
   'auch die dritte Zeile steht auf der Karte, nicht als „und 1 weitere"',
   (_achsen.b[0]||{}).band + ' Zeilen');
ok(_achsen.c.length === 1 && _achsen.c[0].q === 'erfolg',
   'dieselbe Stufe fuer drei Spieler wird EINE Karte', _achsen.c.length + ' Karten');
ok(_achsen.c[0] && _achsen.c[0].ti
   === _achsen.n0 + ', ' + _achsen.n1 + ' und ' + _achsen.n2 + ' tragen jetzt den Schildring',
   'die Schlagzeile nennt alle drei und die Sache', (_achsen.c[0]||{}).ti);
ok(_achsen.c[0] && /^3 Spieler erreichen Stufe 2 von 5/.test(_achsen.c[0].tx),
   'ihr Satz gehoert der Gruppe, nicht einem der drei', (_achsen.c[0]||{}).tx);
ok(_achsen.d.length === 1 && _achsen.d[0].q === 'erfolg' && _achsen.d[0].n === 3,
   'der gemeinsame Erfolg geht der eigenen Karte vor',
   _achsen.d.map(x => x.q + ':' + x.n).join(', '));
ok(_achsen.e.length === 0, 'ein einzelner Erfolg bleibt eine eigene Karte',
   _achsen.e.length + ' Sammelkarten');
ok(_achsen.a[0] && _achsen.a[0].sorte === 'spieler' && _achsen.c[0].sorte === 'erfolg'
   && _achsen.a[0].rub !== _achsen.c[0].rub,
   'beide tragen eine eigene Form und eine eigene Rubrik',
   (_achsen.a[0]||{}).rub + ' / ' + (_achsen.c[0]||{}).rub);
ok(_achsen.a[0] && _achsen.a[0].pids === 1 && _achsen.c[0].pids === 3,
   'die Spieler-Karte zeigt ein Gesicht, die Erfolgs-Karte alle',
   (_achsen.a[0]||{}).pids + ' / ' + (_achsen.c[0]||{}).pids);
ok(_achsen.a[0] && _achsen.a[0].fuss === '2',
   'die Zahl der Erfolge steht im Fuss der Spieler-Karte, nicht im Satz',
   '„' + (_achsen.a[0]||{}).fuss + '"');
// Und die Zeilen wiederholen nicht, was oben steht [§C33].
ok(_achsen.a[0] && _achsen.a[0].zeilen.every(z => z.indexOf(_achsen.n0) !== 0),
   'auf der Spieler-Karte faellt der Name vor jeder Zeile weg',
   (_achsen.a[0]||{}).zeilen.join(' | '));
ok(_achsen.c[0] && _achsen.c[0].zeilen.join(' ').indexOf('Prestige') > 0
   && new Set(_achsen.c[0].zeilen).size === 3,
   'auf der Erfolgs-Karte traegt jede Zeile den Wert, der die Traeger unterscheidet',
   (_achsen.c[0]||{}).zeilen.join(' | '));
ok(_achsen.echt.length === 1 && _achsen.echt[0].n === 2,
   'und an den echten Partien: zwei Traeger des Schildrings in einer Karte',
   _achsen.echt.map(x => x.ti).join(' | ') || 'keine');

// ── Nur die wichtigsten ────────────────────────────────────────────
// Gemessen trug ein Spieltag neun Karten und der Feed zweiundzwanzig, davon
// vier Fun Facts — einer an jedem Tag, auch an denen, an denen wirklich etwas
// passiert ist. „Leon fuehrt das Prestige an" gilt seit Wochen.
const _wenig = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const tag = s => { const d = new Date(s.when);
    return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
  const proTag = {};
  sicht.forEach(s => { const k = tag(s);
    let brk = false; try { brk = _isBreaking(s); } catch(e){}
    if(!brk) proTag[k] = (proTag[k]||0) + 1; });
  const zuViel = Object.keys(proTag).filter(k => proTag[k] > NEWS_LIMITS.proTag);
  // Ein Fun Fact steht nur an einem Tag ohne Nachricht.
  const echteTage = new Set();
  sicht.forEach(s => { const t = (s.dataRef||{}).type;
    if(t !== 'ambient' && t !== 'season_endgame') echteTage.add(tag(s)); });
  const funFacts = sicht.filter(s => (s.dataRef||{}).type === 'ambient');
  return {sicht: sicht.length, roh: roh.length,
          maxTag: Math.max.apply(null, Object.keys(proTag).map(k => proTag[k])),
          zuViel,
          funFacts: funFacts.length,
          funAmLautenTag: funFacts.filter(s => echteTage.has(tag(s))).map(s => s.title),
          marken: roh.filter(s => (s.dataRef||{}).type === 'rivalry_milestone').length,
          deckel: NEWS_LIMITS.proTag, markenDeckel: NEWS_LIMITS.rivalryMarke};
})())`));
ok(_wenig.zuViel.length === 0, 'kein Tag traegt mehr Karten als der Deckel erlaubt',
   _wenig.zuViel.join(', ') || 'hoechstens ' + _wenig.maxTag);
ok(_wenig.funFacts > 0 && _wenig.funAmLautenTag.length === 0,
   'ein Fun Fact steht nur an einem Tag ohne Nachricht',
   _wenig.funAmLautenTag.join(' | ') || _wenig.funFacts + ' an stillen Tagen');
ok(_wenig.marken <= _wenig.markenDeckel,
   'nur die juengsten Duell-Meilensteine werden ueberhaupt gebildet',
   _wenig.marken + ' von hoechstens ' + _wenig.markenDeckel);

// Der Deckel darf nicht die Zusammenfassung des Tages nehmen. In einer
// simulierten Liga aus hundert Partien fiel „Tobi ist Spieler des Tages" als
// siebtstaerkste Karte heraus, waehrend zwei Auszeichnungen und eine laufende
// Serie darueber standen — der Tag hatte danach keinen Sieger mehr.
const _pflicht = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  // Einen Spieltag kuenstlich ueberfuellen: zehn Karten mit hoher Prio zur
  // Zeit des Spielers des Tages.
  const potd = roh.find(s => (s.dataRef||{}).type === 'potd');
  if(!potd) return {keine:true};
  // Zehn verschiedene Sorten, sonst raeumt schon der Deckel je Sorte auf und
  // der Tag laeuft gar nicht ueber.
  const sorten = ['milestone_wins','milestone_goals','milestone_elo','jubilee','top_form'];
  const fuell = [];
  for(let i = 0; i < 10; i++) fuell.push(Object.assign({}, potd, {
    id: 'fuell_' + i, title: 'Fuellkarte ' + i, desc: 'Zehn Karten mehr an diesem Tag. ' + i,
    prio: 99, dataRef: {type: sorten[i % sorten.length], pid: potd.dataRef.playerId}}));
  _cache._stories = fuell.concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  return {potdDrin: sicht.some(x => x.id === potd.id),
          fuellDrin: sicht.filter(x => String(x.id).indexOf('fuell_') === 0).length};
})())`));
ok(!_pflicht.keine && _pflicht.potdDrin === true,
   'der Spieler des Tages ueberlebt einen ueberfuellten Tag', JSON.stringify(_pflicht));
console.log('  ' + _wenig.roh + ' erzeugt, ' + _wenig.sicht
  + ' im Feed, hoechstens ' + _wenig.maxTag + ' an einem Tag');

// ── Das Rekord-Blatt nennt niemanden zweimal ────────────────────────
// „Maxi, Leo und Julian uebernehmen" stand im Kopf, „Vorher gehalten von Maxi
// und Julian und Leo" darunter, und unter „Wer sonst noch vorne steht" noch
// einmal dieselben drei mit derselben Zahl. Drei Bloecke, ein Inhalt.
// Und eine Uebernahme, deren Vorgaenger die heutigen Halter SIND, hat es nie
// gegeben: der Generator bildet ihre ID nicht mehr, also bliebe die
// persistierte Karte fuer immer stehen.
const _rek = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const vorlage = roh.find(s => (s.dataRef||{}).type === 'rekord_geholt')
               || roh.find(s => ((s.dataRef||{}).type||'').indexOf('rekord_') === 0);
  if(!vorlage) return {keine:true};
  const ids = (vorlage.dataRef.playerIds || []).slice();
  // Eine Uebernahme von sich selbst, wie sie der alte Vergleich erzeugte.
  const falsch = Object.assign({}, vorlage, {id: vorlage.id + '_selbst',
    title: 'X uebernimmt den Rekord von sich selbst',
    desc: 'Derselbe Halter wie vorher, nur anders sortiert. 3 Stueck.',
    dataRef: Object.assign({}, vorlage.dataRef,
      {type:'rekord_geholt', vorher: ids.slice().reverse()})});
  _cache._stories = [falsch].concat(roh);
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  // Und ein echtes Blatt: steht ein Halter unter den Verfolgern?
  const echt = Object.assign({}, vorlage, {dataRef: Object.assign({}, vorlage.dataRef,
    {type:'rekord_geholt'})});
  const b = _newsDetailBody(echt);
  const vf = (b.match(/class="nd-vf-nm">([^<]*)</g)||[])
    .map(t => t.replace(/^[^>]*>/,'').replace(/<$/,''));
  const _pm = pmap();
  const halterNamen = ids.map(id => (_pm[id]||{}).name).filter(Boolean);
  // Gezaehlt wird die AUSSAGE: die Karte kann als Zeile in einer Sammelkarte
  // stehen, und dann steht sie trotzdem im Feed.
  const zeilen = [];
  sicht.forEach(x => { const t = ((x.dataRef||{}).teile||[]);
    if(t.length > 1) t.forEach(u => zeilen.push(u.titel)); else zeilen.push(x.title); });
  return {selbstDurch: zeilen.filter(t => t === falsch.title).length,
          halterUnterVerfolgern: vf.filter(n => halterNamen.indexOf(n) >= 0).length,
          verfolger: vf.length};
})())`));
ok(!_rek.keine, 'es gibt eine Rekord-Uebernahme', JSON.stringify(_rek));
ok(_rek.selbstDurch === 0, 'niemand uebernimmt einen Rekord von sich selbst',
   _rek.selbstDurch + ' durch');
ok(_rek.halterUnterVerfolgern === 0, 'der Halter steht nicht unter den Verfolgern',
   _rek.halterUnterVerfolgern + ' von ' + _rek.verfolger);

// ── Derselbe Halter in anderer Reihenfolge ist kein Wechsel ─────────
// „Maxi, Leo und Julian uebernehmen" stand im Feed, und darunter „Vorher
// gehoerte er Maxi, Julian und Leo" — dieselben drei, nur anders sortiert.
const _halter = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = {pids:['a','b','c'], ev:'7 Siege', val:7};
  const B = {pids:['c','a','b'], ev:'7 Siege', val:7};
  const C = {pids:['a','b'],     ev:'7 Siege', val:7};
  return {gleicheGruppe: _rekordArt(A, B), andereGruppe: _rekordArt(A, C),
          liste1: _namenListe(['Maxi']), liste3: _namenListe(['Maxi','Julian','Leo'])};
})())`));
ok(_halter.gleicheGruppe === '', 'dieselbe Haltergruppe ist kein Wechsel',
   _halter.gleicheGruppe || 'leer');
ok(_halter.andereGruppe === 'geholt', 'eine andere Haltergruppe schon',
   _halter.andereGruppe);
ok(_halter.liste3 === 'Maxi, Julian und Leo', 'drei Namen lesen sich als Aufzaehlung',
   _halter.liste3);
ok(_halter.liste1 === 'Maxi', 'ein Name bleibt ein Name', _halter.liste1);

// ── Die Schlagzeile nennt alle, um die es geht ──────────────────────
// Ueber einer Sammelkarte von drei Leuten stand „Leon und Martin bewegen die
// Ewige Tafel": zwei der drei Namen in der Zeile, der dritte nur in der Liste
// darunter. Genannt werden jetzt alle, und ab dem vierten zaehlt die Zeile
// den Rest — sechs Namen sprengen jede Ueberschrift.
const _nk = JSON.parse(K.eval(`JSON.stringify({
  eins:  _namenKurz(['Leon']),
  zwei:  _namenKurz(['Leon','Martin']),
  drei:  _namenKurz(['Leon','Martin','Julian']),
  vier:  _namenKurz(['Leon','Martin','Julian','Maxi']),
  sechs: _namenKurz(['Leon','Martin','Julian','Maxi','Leo','Jane']),
  paar:  _namenKurz(['Leon','Martin','Julian'], 2)
})`));
ok(_nk.eins === 'Leon', 'ein Name steht allein da', _nk.eins);
ok(_nk.zwei === 'Leon und Martin', 'zwei Namen mit und', _nk.zwei);
ok(_nk.drei === 'Leon, Martin und Julian', 'drei Namen als Aufzaehlung', _nk.drei);
ok(_nk.vier === 'Leon, Martin und zwei weitere', 'ab dem vierten zaehlt die Zeile', _nk.vier);
ok(_nk.sechs === 'Leon, Martin und vier weitere', 'und bei sechs genauso', _nk.sechs);
ok(_nk.paar === 'Leon und zwei weitere', 'die Grenze ist einstellbar', _nk.paar);

// Und dieselbe Regel an der echten Sammelkarte: drei Rekordwechsel an einem
// Tag, drei Namen in der Ueberschrift.
const _samT = JSON.parse(K.eval(`JSON.stringify((function(){
  const bau = n => {
    const wann = new Date().toISOString(), teile = [];
    for(let i = 0; i < n; i++) teile.push({
      id:'t' + i, title:'Titel ' + i, desc:'Text ' + i, cat:'tafel', ic:'award',
      when:wann, prio:90 - i,
      dataRef:{type:'rekord_geholt', rekordId:'r' + i, playerIds:[players[i].id]}});
    const k = _consolidateStories(teile).find(s => (s.dataRef||{}).type === 'sammel');
    return k ? k.title : '';
  };
  return {zwei:bau(2), drei:bau(3), namen:players.slice(0,3).map(p => p.name)};
})())`));
ok(_samT.drei.indexOf(_samT.namen[2]) >= 0,
   'die Sammelkarte nennt auch den dritten Namen', _samT.drei);
ok(/ bewegen die Ewige Tafel$/.test(_samT.drei) && /^[^,]+, [^,]+ und /.test(_samT.drei),
   'und zaehlt sie als Aufzaehlung auf', _samT.drei);
ok(_samT.zwei === _samT.namen[0] + ' und ' + _samT.namen[1] + ' bewegen die Ewige Tafel',
   'zwei Namen stehen weiter mit und', _samT.zwei);

// ── Dieselbe Aussage nicht dreimal in einer Woche ───────────────────
// „Martin baut ‚Der Massstab' aus" gilt nach jedem gewonnenen Spiel aufs
// Neue, jedes Mal mit einem Prozentpunkt mehr: andere ID, andere Zahl,
// dieselbe Nachricht. Gemessen standen vier davon nebeneinander im Feed.
// Gesperrt wird die AUSSAGE — Art, Beteiligte und Sache —, nicht der
// Wortlaut: der aendert sich ja gerade.
const _sperre = JSON.parse(K.eval(`JSON.stringify((function(){
  const tag = 86400000, jetzt = Date.now();
  const lauf = (abstand, n) => {
    const l = [];
    for(let i = 0; i < n; i++) l.push({
      id:'rek_x_' + i, title:'Martin steht bei ' + (73 + i) + ' %', desc:'Text ' + i,
      cat:'tafel', ic:'award', prio:70, when:new Date(jetzt - i * abstand * tag).toISOString(),
      dataRef:{type:'rekord_gesteigert', rekordId:'yardstick', playerIds:[players[9].id]}});
    return _consolidateStories(l).filter(s => (s.dataRef||{}).type === 'rekord_gesteigert').length;
  };
  // Verschiedene Halter sind verschiedene Aussagen und bleiben beide stehen.
  const wechsel = (() => {
    const l = [0, 1].map(i => ({
      id:'rek_w_' + i, title:'Wechsel ' + i, desc:'Text ' + i, cat:'tafel', ic:'award',
      prio:84, when:new Date(jetzt - i * tag).toISOString(),
      dataRef:{type:'rekord_geholt', rekordId:'yardstick', playerIds:[players[i].id],
               vorher:[players[i + 4].id]}}));
    return _consolidateStories(l).length;
  })();
  return {taeglich:lauf(1, 3), weitAuseinander:lauf(4, 2), wechsel, tage:NEWS_LIMITS.sperreTage};
})())`));
ok(_sperre.tage >= 1, 'es gibt eine Sperrfrist', String(_sperre.tage));
ok(_sperre.taeglich === 1, 'drei gleiche Aussagen an drei Tagen ergeben eine Karte',
   String(_sperre.taeglich));
ok(_sperre.weitAuseinander === 2, 'vier Tage auseinander bleiben beide stehen',
   String(_sperre.weitAuseinander));
ok(_sperre.wechsel === 2, 'ein Halterwechsel ist jedes Mal eine eigene Nachricht',
   String(_sperre.wechsel));

// ── Eine Karte sagt, was zu tun ist ─────────────────────────────────
// „Jane liegt ‚Das Sonntagskind' am naechsten" nannte weder, worum es geht,
// noch was dafuer verlangt ist: darunter stand allein „Leon haelt den
// Bestwert". Wer die Karte las, wusste danach nur, dass ihm irgendetwas
// fehlt. Die Bedingung steht im Katalog und gehoert auf die Karte.
const _ziel = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const v = T.find(x => x.key === 'prestige_schritt');
  if(!v) return {fehlt:true};
  const k = v.make(() => 0.42);
  if(!k) return {leer:true};
  // Der Schritt, den die Karte meint, mit seiner Bedingung aus dem Katalog.
  let schritt = null;
  players.some(p => { const l = prestigeSchritte(p.id, 1); if(l.length){ schritt = l[0]; return true; } });
  return {t:k.title, d:k.desc, cond:(schritt && schritt.cond) || ''};
})())`));
ok(!_ziel.fehlt && !_ziel.leer, 'die Karte zum naechsten Rekord entsteht', JSON.stringify(_ziel));
ok(!/am nächsten/.test(_ziel.t || ''), 'ihre Schlagzeile sagt nicht nur, wer am naechsten liegt',
   _ziel.t);
ok(_ziel.cond && (_ziel.d || '').indexOf(_ziel.cond) >= 0,
   'und ihr Text nennt die Bedingung aus dem Katalog', (_ziel.d || '').slice(0, 90));
ok(/Prestige/.test(_ziel.d || ''), 'samt dem, was der Rekord einbringt', (_ziel.d || '').slice(0, 90));

// ── Kein Listentrenner im Fliesstext ────────────────────────────────
// Ein Beleg wie „20 % aller 25 Siege endeten 10:9 · 5" ist fuer eine Zelle
// gebaut: der Mittelpunkt trennt dort zwei Spalten. Mitten in einem Satz
// steht er wie ein Tippfehler, und danach ging es klein weiter: „… gewonnen
// · 9. sonst haelt ihn niemand."
const _fliess = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const texte = _buildStories().map(s => s.desc || '');
  _ambientTemplatePool(new Date(), pm, nameOf).forEach(v => {
    let k = null; try { k = v.make(() => 0.42); } catch(e){}
    if(k) texte.push(k.desc || '');
  });
  return {
    punkt: texte.filter(t => /·/.test(t)).length,
    // Ein Datum wie „26.08. hat niemand mehr geholt" endet keinen Satz und
    // wird vorher entfernt, sonst schlaegt die Regel an der falschen Stelle
    // an statt dort, wo sie hingehoert: „… gewonnen · 9. sonst haelt ihn
    // niemand."
    klein: texte.filter(t => /\\.\\s+[a-zäöüß]/
      .test(String(t).replace(/\\d{1,2}\\.\\d{1,2}\\.\\s/g, ' '))).length,
    probe: _evSatz('20 % aller 25 Siege endeten 10:9 · 5 Zittersiege')
  };
})())`));
ok(_fliess.punkt === 0, 'kein Story-Text traegt einen Listentrenner', String(_fliess.punkt));
ok(_fliess.klein === 0, 'und kein Satz faengt klein an', String(_fliess.klein));
ok(_fliess.probe === '20 % aller 25 Siege endeten 10:9, 5 Zittersiege',
   'der Beleg wird fuer den Fliesstext umgestellt', _fliess.probe);

// ── Wer da zusammen steht, und warum ────────────────────────────────
// Unter zwei Wappen stand „als Duo", sobald eine Karte genau zwei Leute
// zeigte. Bei „Martin schlaegt Leo im Spitzenspiel" standen sich die beiden
// gegenueber, und bei „Johannes und Stefan bewegen die Ewige Tafel" holte
// jeder einen eigenen Rekord. Die Beziehung sagt der STORY-TYP, nicht die
// Kartenform.
const _bez = JSON.parse(K.eval(`JSON.stringify((function(){
  const f = typ => _ndBeziehung({dataRef:{type:typ, matchId:'m1'}}, 2);
  const roh = _buildStories();
  const alle = roh.concat(_consolidateStories(roh));
  const falsch = [];
  const seen = {};
  alle.forEach(s => {
    const d = s.dataRef || {};
    const t = d.type || '';
    if(seen[t]) return; seen[t] = 1;
    let ids = []; try { ids = (_newsPids(s) || []); } catch(e){}
    if(ids.length < 2) return;
    const b = _ndBeziehung(s, ids.length);
    // „als Duo" darf nur dastehen, wo die Karte wirklich von einem Duo handelt.
    if(b === 'als Duo' && t !== 'team_streak' && t !== 'team_loss_streak') falsch.push(t);
    if(!b) falsch.push(t + '(leer)');
  });
  return {falsch, clash:f('top_clash'), duo:f('team_streak'), duell:f('rivalry'),
          sammel:_ndBeziehung({dataRef:{type:'sammel', quelle:'tafel'}}, 2)};
})())`));
ok(_bez.falsch.length === 0, 'nur ein echtes Duo steht als Duo da', _bez.falsch.join(', ') || 'keins');
ok(_bez.clash === 'Sieger und Verlierer dieser Partie',
   'im Spitzenspiel stehen sich zwei gegenueber', _bez.clash);
ok(_bez.duo === 'als Duo', 'die Duo-Serie bleibt ein Duo', _bez.duo);
ok(_bez.duell === 'im direkten Duell', 'die Rivalitaet bleibt ein Duell', _bez.duell);
ok(_bez.sammel === 'an der Ewigen Tafel', 'die Sammelkarte nennt ihren Anlass', _bez.sammel);

// ── Das Blatt erklaert nicht die App ────────────────────────────────
// Im Blatt des Spielers des Tages stand „Gewertet wird der Spieltag ab drei
// Partien. Die Karte kommt um 23:59, wenn keine Partie mehr dazukommen
// kann." Das ist die Bauanleitung des Feeds, nicht die Nachricht. Genauso
// stand unter einer Insignium-Stufe „deshalb ist diese Karte Breaking
// [§C30]" — die App erklaerte dem Leser ihre eigene Regel samt Paragraph.
const _meta = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const treffer = [];
  roh.concat(_consolidateStories(roh)).forEach(s => {
    let h = ''; try { h = _newsDetailBody(s); } catch(e){ return; }
    if(/Gewertet wird|diese Karte Breaking|§C\\d/.test(String(h)))
      treffer.push((s.dataRef||{}).type || '?');
  });
  return treffer;
})())`));
ok(_meta.length === 0, 'kein Blatt erklaert die Regeln des Feeds', _meta.join(', ') || 'keins');

// ── Die Karte des Tages steht, sobald der Spieltag entschieden ist ──
// Sie kam einmal zwanzig Minuten nach dem ersten Spiel: der Rekord, der
// gerade wechselte, war die einzige Karte des Tages und damit automatisch die
// staerkste. Danach stand sie erst um 23:59 und damit einen halben Tag,
// nachdem die letzte Partie gelaufen war. Jetzt zwei Bedingungen, eine
// reicht: acht Partien oder 19 Uhr. Gemessen wird beides einzeln, also mit
// einem Tag, der die Zahl erreicht, und einem, der sie nicht erreicht.
const _tk = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = {};
  matches.forEach(m => { const k = _newsDayKey(m.created_at); tage[k] = (tage[k]||0)+1; });
  const voll = Object.keys(tage).find(k => tage[k] >= NEWS_LIMITS.tagKartePartien);
  const kurz = Object.keys(tage).find(k => tage[k] > 0 && tage[k] < NEWS_LIMITS.tagKartePartien);
  const items = [{id:'a', prio:5, dataRef:{type:'rekord_geholt'}},
                 {id:'b', prio:9, dataRef:{type:'chronik_geholt'}}];
  const um = (tag, std, min) => {
    const d = new Date(tag + 'T00:00:00'); d.setHours(std, min||0, 0, 0);
    const echt = Date.now; Date.now = () => d.getTime();
    let r = null; try { r = _newsTagKarte(items, tag); } finally { Date.now = echt; }
    return r;
  };
  return {vollN: tage[voll], kurzN: tage[kurz],
    vollFrueh: um(voll, 8), kurzFrueh: um(kurz, 12), kurzSpaet: um(kurz, 19),
    kurzKnapp: um(kurz, 18, 59), leer: um('2020-01-01', 23),
    stunde: NEWS_LIMITS.tagKarteStunde, partien: NEWS_LIMITS.tagKartePartien};
})())`));
ok(_tk.partien >= 6 && _tk.partien <= 10 && _tk.stunde === 19,
   'die Schwelle liegt bei acht Partien und 19 Uhr',
   _tk.partien + ' Partien, ' + _tk.stunde + ' Uhr');
ok(_tk.vollFrueh === 'b', 'ein Tag mit acht Partien traegt seine Karte sofort',
   _tk.vollN + ' Partien -> ' + _tk.vollFrueh);
ok(_tk.kurzFrueh === null, 'ein kurzer Spieltag wartet bis 19 Uhr',
   _tk.kurzN + ' Partien um 12 Uhr -> ' + _tk.kurzFrueh);
ok(_tk.kurzKnapp === null, 'eine Minute vor 19 Uhr steht sie noch nicht',
   String(_tk.kurzKnapp));
ok(_tk.kurzSpaet === 'b', 'um 19 Uhr steht sie auch ohne acht Partien',
   String(_tk.kurzSpaet));
ok(_tk.leer === null, 'ein Tag ohne Partie bekommt keine Karte des Tages',
   String(_tk.leer));

// ── Die Wochenkarte zeigt alle sechs Wertungen ──────────────────────
// Sie zeigte drei und darunter „und 3 weitere Wertungen": die Ueberraschung,
// der Krimi und das Team der Woche kamen auf der Karte gar nicht vor, obwohl
// sie einmal je Woche erscheint und fuer nichts anderes da ist. Und das Team
// der Woche entstand im Generator als letztes und stand damit auch als
// letztes, obwohl es neben dem Spieler der Woche gehoert.
const _wo = JSON.parse(K.eval(`JSON.stringify((function(){
  const s = _consolidateStories(_buildStories()).find(x => (x.dataRef||{}).type === 'woche');
  if(!s) return {fehlt:true};
  const teile = (s.dataRef.teile || []);
  const karte = _newsCardHtmlM2(s, false, false);
  return {n:teile.length, arten:teile.map(t => t.art),
          zeilen:(String(karte).match(/nf-wl-z/g) || []).length,
          rest:/nf-wl-m/.test(String(karte))};
})())`));
ok(!_wo.fehlt, 'die Wochenkarte entsteht', JSON.stringify(_wo));
ok(_wo.arten[0] === 'potw' && _wo.arten[1] === 'team',
   'Spieler der Woche steht oben, das Team der Woche direkt darunter', (_wo.arten||[]).join(', '));
ok(_wo.zeilen === _wo.n, 'die Karte zeigt jede Wertung', _wo.zeilen + ' von ' + _wo.n);
ok(_wo.rest === false, 'und keine Zeile mehr, die den Rest verschweigt', String(_wo.rest));

// ── Wie die Liga spricht ────────────────────────────────────────────
// Leicht und unkompliziert, aber mit den Zahlen dran. Der Gedankenstrich ist
// raus: er trennte Saetze, die als zwei Saetze klarer sind. Und die
// Schlagzeile steht nicht noch einmal im Text — „Serie gerissen: Martin"
// mit „Leon & Maxi stoppen die Serie" darunter trug den Verlierer in der
// Zeile und die Tat im Kleingedruckten.
const _sprache = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const seen = {}; const arten = [];
  roh.forEach(s => { const d = s.dataRef||{};
    const k = (d.type||'?') + (d.sub ? ':'+d.sub : '');
    if(seen[k]) return; seen[k] = 1; arten.push({k, t:s.title||'', d:s.desc||''}); });
  const norm = t => String(t).replace(/[„""»«.,;:!?()]/g,' ').replace(/\\s+/g,' ').trim().toLowerCase();
  return {
    n: arten.length,
    strich: arten.filter(a => /[—–]/.test(a.t + a.d)).map(a => a.k),
    // Ausgenommen ist die Auszeichnung: ihr Text ist die Bedingung aus dem
    // Katalog, und „Debuetant: Match gespielt" braucht keine Zahl.
    ohneZahl: arten.filter(a => a.k !== 'badge_unlocked' && !/\\d/.test(a.d)).map(a => a.k),
    titelDoppelt: arten.filter(a => norm(a.t).length >= 12
      && norm(a.d).indexOf(norm(a.t)) >= 0).map(a => a.k),
    // Ein Fragezeichen im Text heisst, dass ein Name nicht aufgeloest wurde.
    ohneNamen: arten.filter(a => /\\B\\?\\B|: \\?|\\? /.test(a.d)).map(a => a.k)
  };
})())`));
ok(_sprache.strich.length === 0, 'kein Gedankenstrich in einem Story-Text',
   _sprache.strich.join(', '));
ok(_sprache.ohneZahl.length === 0, 'jeder Story-Text nennt eine Zahl',
   _sprache.ohneZahl.join(', '));
ok(_sprache.titelDoppelt.length === 0, 'kein Text wiederholt seine Schlagzeile',
   _sprache.titelDoppelt.join(', '));
ok(_sprache.ohneNamen.length === 0, 'kein unaufgeloester Name im Text',
   _sprache.ohneNamen.join(', '));

// ── „Ausgebaut" heisst besser geworden ──────────────────────────────
// Die Meldung feuerte, sobald sich die ANGEZEIGTE Zahl aenderte — egal
// wohin. „Der Fels" ging von 6,9 auf 7,0 Gegentore und „Der Platzhirsch"
// von 44 auf 42 Prozent, beides eine Verschlechterung, und beides stand als
// „baut seinen Rekord aus" im Feed. Wer den Rekord haelt und verschlechtert,
// hat nichts getan: die anderen sind nur nicht vorbeigezogen.
const _art = JSON.parse(K.eval(`JSON.stringify((function(){
  const p = ['p1'], q = ['p2'];
  const f = (a, n) => _rekordArt(a, n);
  return {
    ohneVorher:   f(null, {pids:p, ev:'7 Siege', val:7}),
    halterWechsel:f({pids:q, ev:'6 Siege', val:6}, {pids:p, ev:'7 Siege', val:7}),
    besser:       f({pids:p, ev:'6 Siege', val:6}, {pids:p, ev:'7 Siege', val:7}),
    schlechter:   f({pids:p, ev:'7 Siege', val:7}, {pids:p, ev:'6 Siege', val:6}),
    gleich:       f({pids:p, ev:'7 Siege', val:7}, {pids:p, ev:'7 Siege', val:7.0001})
  };
})())`));
ok(_art.ohneVorher === 'erstmals', 'ein Rekord ohne Vorgaenger ist erstmals vergeben', _art.ohneVorher);
ok(_art.halterWechsel === 'geholt', 'ein neuer Halter hat ihn geholt', _art.halterWechsel);
ok(_art.besser === 'gesteigert', 'ein besserer Wert ist ausgebaut', _art.besser);
ok(_art.schlechter === '', 'ein SCHLECHTERER Wert ist keine Nachricht', _art.schlechter || 'leer');
ok(_art.gleich === '', 'und eine unsichtbare Aenderung auch nicht', _art.gleich || 'leer');

// ── Ein ueberschrittener Meilenstein bleibt auffrischbar ────────────
// Die ID traegt die Zahl (`rivalry_milestone_A|B_50`). Stand das Paar bei 52,
// bildete der Generator die 50er-ID nicht mehr — und „Historisches 50.
// Aufeinandertreffen — die Rivalitaet waechst" stand mit Gedankenstrich und
// leerem Satz im Feed, Monate nach dem Umbau. Gemeldet wird deshalb JEDE
// ueberschrittene Schwelle, mit dem Zeitpunkt der kreuzenden Partie.
const _ms = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const ms = roh.filter(s => (s.dataRef||{}).type === 'rivalry_milestone');
  // Eine persistierte Zeile mit dem ALTEN Wortlaut nachstellen.
  const alt = ms.map(s => Object.assign({}, s, {title: 'ALTER TITEL',
    desc: 'Historisches ' + s.dataRef.n + '. Aufeinandertreffen — die Rivalitaet waechst.'}));
  _cache._stories = alt.concat(roh.filter(s => (s.dataRef||{}).type !== 'rivalry_milestone'));
  _cache._consolFrom = null; _cache._frischVon = null;
  const sicht = getStoriesCache();
  const gezeigt = sicht.filter(s => (s.dataRef||{}).type === 'rivalry_milestone');
  return {
    erzeugt: ms.length,
    // Gemeldet wird die ueberschrittene Schwelle, nicht die aktuelle Zahl:
    // steht ein Paar bei 52, gehoert ihm die 50er-Karte. Gezaehlt wird
    // deshalb, ob eine Schwelle UNTER dem heutigen Stand des Paares steht.
    // (Frueher stand hier „dasselbe Paar zweimal" — das galt nur, solange
    // jede Schwelle der ganzen Ligageschichte gebildet wurde.)
    mehrfach: ms.some(x => {
      const a = x.dataRef.a, b = x.dataRef.b;
      let n = 0;
      matches.forEach(m => {
        const A = [m.a1, m.a2], B = [m.b1, m.b2];
        if((A.indexOf(a) >= 0 && B.indexOf(b) >= 0)
        || (A.indexOf(b) >= 0 && B.indexOf(a) >= 0)) n++;
      });
      return n > x.dataRef.n;
    }),
    gezeigt: gezeigt.length,
    nochAlt: gezeigt.filter(s => s.title === 'ALTER TITEL'
      || String(s.desc||'').indexOf('—') >= 0).length,
    // Der Zeitpunkt gehoert der kreuzenden Partie, nicht dem letzten Duell.
    zeitOk: ms.every(s => {
      const m = matches.find(x => x.id === s.dataRef.matchId);
      return m && Math.abs(new Date(s.when).getTime() - mts(m)) < 1000;
    })
  };
})())`));
ok(_ms.erzeugt > 0, 'Meilensteine werden gebildet', _ms.erzeugt + ' Schwellen');
ok(_ms.mehrfach, 'auch ueberschrittene Schwellen, nicht nur die aktuelle');
ok(_ms.nochAlt === 0, 'ein alter Meilenstein-Wortlaut wird aufgefrischt',
   _ms.nochAlt + ' von ' + _ms.gezeigt);
ok(_ms.zeitOk, 'der Meilenstein steht am Tag der kreuzenden Partie');

console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
process.exit(fails ? 1 : 0);
