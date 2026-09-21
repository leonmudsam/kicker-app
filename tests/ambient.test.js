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
                  rubrik:s.dataRef.ambientRubrik,
                  pids:(s.dataRef.ambientPids||(s.dataRef.ambientPid?[s.dataRef.ambientPid]:[]))}));
  })()`);
}

console.log('=== 1. EIN SLOT ENTSTEHT HEUTE ODER GAR NICHT ===');
//    Einmal wurden die letzten drei Tage nachgetragen, mit `when` auf der
//    damaligen Slot-Zeit. Eine Karte, die JETZT entsteht und ein Datum von
//    vorgestern traegt, steht unter einem Tageskopf, den der Leser schon
//    gelesen hat, und der Lesestand zaehlt sie als gelesen [§C33] — sie wird
//    nie gesehen. Und ihr Inhalt entstand aus den HEUTIGEN Zahlen fuer einen
//    Tag, der vorbei ist.
const NOW = '2026-08-27T20:30:00Z';   // nach beiden Slots des Tages (lokal)
const NOW_MS = new Date(NOW).getTime();
const HEUTE = (function(){ const d = new Date(NOW);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
const fresh = build(NOW, []);
console.log('  Slots aus leerem Bestand: ' + fresh.length);
fresh.forEach(s => console.log('    ' + s.id + '  ' + s.when.slice(0,16) + '  ' + s.sub));
const _spieltage = new Set(K.eval('matches.map(m=>tagKey(m.created_at))'));
// Der 10-Uhr-Slot steht an jedem Tag, der 19-Uhr-Slot nur an Tagen ohne
// Partie: keine der 466 Partien hat vor 10 Uhr angefangen, die letzte um
// 18 Uhr. Am Abend eines Spieltags ist alles vom Tag interessanter als eine
// Zahl, die seit Wochen gilt.
const _erwartet = 1 + (_spieltage.has(HEUTE) ? 0 : 1);
ok(fresh.length === _erwartet, 'nur die Slots von heute, ein 19-Uhr-Slot nur spielfrei',
   fresh.length + ' von ' + _erwartet);
ok(fresh.every(s => s.id.indexOf('ambient_' + HEUTE + '_') === 0),
   'kein Slot eines vergangenen Tages', fresh.map(s => s.id).join(', ') || 'keiner');
ok(new Set(fresh.map(s=>s.id)).size === fresh.length, 'keine doppelten IDs');
ok(fresh.every(s => /^ambient_\d{4}-\d{2}-\d{2}_(10|19)$/.test(s.id)), 'ID-Schema unveraendert');

console.log('\n=== 2. EINE NEUE KARTE IST DIE NEUESTE KARTE ===');
//    `when` stand auf der Slot-Stunde, und damit rutschte ein um 22 Uhr
//    nachgetragener 10-Uhr-Slot unter alles, was der Leser an diesem Tag schon
//    gelesen hatte. Der Zeitstempel ist deshalb der Moment des Entstehens.
fresh.forEach(s => {
  const d = new Date(s.when).getTime();
  ok(Math.abs(d - NOW_MS) < 5000, s.id + ': entsteht jetzt, nicht zur Slot-Stunde',
     new Date(s.when).toISOString());
  ok(d <= NOW_MS + 5000, s.id + ': liegt nicht in der Zukunft');
});

console.log('\n=== 3. IDEMPOTENZ ===');
// Was schon persistiert ist, wird nicht noch einmal erzeugt.
const asStored = fresh.map(s => ({id:s.id, when:s.when, title:s.title,
  desc:'Der gespeicherte Satz von damals.', prio:20, cat:'season', ic:'sparkle',
  dataRef:{type:'ambient', sub:s.sub, ambientRubrik:s.rubrik, ambientPids:s.pids}}));
const second = build(NOW, asStored);
ok(second.length === 0, 'zweiter Lauf erzeugt nichts mehr', second.length + '');
if(fresh.length > 1){
  const gapId = fresh[fresh.length-1].id;
  const filled = build(NOW, asStored.filter(s => s.id !== gapId));
  ok(filled.length === 1 && filled[0].id === gapId, 'eine einzelne Luecke wird gezielt gefuellt',
     filled.map(s=>s.id).join(','));
}

console.log('\n=== 4. WAS GEZOGEN WURDE, WIRD NICHT NEU GEZOGEN ===');
//    Der eigentliche Befund: `_buildAmbientStories` liest die Rotation aus
//    `_cache._stories`, und der steht beim Kaltstart leer — `loadAll` zeichnet,
//    BEVOR `syncStoriesViaDb` gelaufen ist. Derselbe Slot zog damit zwei
//    verschiedene Karten, und `_newsTexteAuffrischen` schrieb die kalte Fassung
//    ueber die gespeicherte: wer gestern einen Fun Fact gelesen hatte, fand
//    heute an derselben Stelle einen anderen.
// Nachgestellt wird die echte Reihenfolge: `loadAll` zeichnet mit leerem
// Bestand (der Generator zieht blind und merkt sich das Ergebnis), danach
// landet der Sync. Der Memo-Schluessel muss den Bestand kennen, sonst bleibt
// die blinde Ziehung die ganze Sitzung stehen und die Auffrischung schreibt
// sie ueber die gespeicherte Karte.
const _frost = JSON.parse(K.eval(`JSON.stringify((function(){
  const bestand = ${JSON.stringify(asStored)}.map(s => Object.assign({}, s, {when:new Date(s.when)}));
  // 1. Kaltstart: kein Bestand, der Generator zieht und merkt sich das.
  _cache._stories = [];
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const kalt = _buildStories().filter(s => String(s.id).indexOf('ambient_') === 0);
  // 2. Der Sync landet.
  _cache._stories = bestand;
  const aus = _newsTexteAuffrischen(bestand);
  const ambi = aus.filter(s => String(s.id).indexOf('ambient_') === 0);
  return {n:ambi.length, kalt:kalt.map(s => s.id + ': ' + s.title),
          geaendert: ambi.filter(s => {
            const alt = bestand.find(b => b.id === s.id);
            return !alt || alt.title !== s.title || alt.desc !== s.desc
              || JSON.stringify(alt.dataRef) !== JSON.stringify(s.dataRef);
          }).map(s => s.id)};
})())`));
ok(_frost.kalt.length > 0, 'der Kaltstart zieht ueberhaupt einen Fun Fact',
   _frost.kalt.join(' | '));
ok(_frost.n === asStored.length, 'die gespeicherten Fun Facts stehen im Feed',
   _frost.n + ' von ' + asStored.length);
ok(_frost.geaendert.length === 0, 'die Auffrischung schreibt keinen Fun Fact um',
   _frost.geaendert.join(', ') || 'keiner');

console.log('\n=== 5. ROTATION BLEIBT ===');
const again = build(NOW, []);
ok(JSON.stringify(again.map(s=>s.sub)) === JSON.stringify(fresh.map(s=>s.sub)),
   'zwei identische Laeufe, identische Ziehung');
const subs = fresh.map(s=>s.sub);
ok(new Set(subs).size === subs.length, '10 und 19 Uhr zeigen verschiedene Typen',
   subs.join(', '));
const rubriken = fresh.map(s => s.rubrik);
ok(rubriken.every(Boolean), 'jede ambiente Karte speichert ihre Rubrik', rubriken.join(', '));
ok(rubriken.every((r,i) => i === 0 || r !== rubriken[i-1]),
   'aufeinanderfolgende Slots wechseln die Erzaehlrubrik', rubriken.join(' -> '));
const _kleinerPool = JSON.parse(K.eval(`JSON.stringify((function(){
  const alt = _ambientTemplatePool;
  try {
    _ambientTemplatePool = () => [{key:'nur_eine_rubrik', make:() => ({
      cat:'season', ic:'sparkle', title:'Ein belastbarer Fakt',
      desc:'1 belegter Wert aus dem kleinen Datenbestand.', dataRef:{}})}];
    _cache._stories = [];
    const r = _buildAmbientStories(new Date(${JSON.stringify(NOW)}), pmap(), id=>pname(id));
    return {n:r.length, sauber:r.every(s => s && s.dataRef && s.dataRef.ambientRubrik)};
  } finally { _ambientTemplatePool = alt; }
})())`));
ok(_kleinerPool.n >= 1 && _kleinerPool.sauber,
   'ein kleiner Template-Pool bleibt funktionsfaehig', _kleinerPool.n + ' Karten');

console.log('\n=== 6. ZUKUENFTIGE SLOTS BLEIBEN ZU ===');
const morning = build('2026-08-27T11:30:00Z', []);   // nach 10:00, vor 19:00 lokal
ok(!morning.some(s => s.id === 'ambient_2026-08-27_19'), 'der heutige 19-Uhr-Slot wartet noch');
ok(morning.some(s => s.id === 'ambient_2026-08-27_10'), 'der heutige 10-Uhr-Slot ist da');
ok(!morning.some(s => s.id.indexOf('ambient_2026-08-27_') !== 0),
   'und kein Slot von gestern kommt nach', morning.map(s=>s.id).join(', '));

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

// Und die Liste ist geschlossen: gemessen ueber die 19 Spieltage vom 28.07.
// bis 26.08. traegt keine Karte des fertigen Feeds Breaking, deren Anlass
// nicht darauf steht. Eine Sammelkarte erbt es von ihren Teilen — Breaking
// wird also NACH dem Buendeln entschieden, sonst verloere ein erstmals
// vergebener Liga-Rekord seinen Rang, sobald er mit seinem Moment reist.
const _brkZu = JSON.parse(K.eval(`JSON.stringify((function(){
  const erlaubt = new Set(['lead_change','elo_record','streak_record',
    'season_recap','rekord_erstmals']);
  const anlass = d => erlaubt.has(d.type)
    || (d.type === 'badge_unlocked' && d.rarity === 'legendary')
    || (d.type === 'insignium_stufe' && !!d.oben);
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let brk = 0, fremd = [], geerbt = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let r = []; try { r = _buildStories() || []; } catch(e){ return; }
    let f = []; try { f = _consolidateStories(r) || []; } catch(e){}
    f.filter(_isBreaking).forEach(x => {
      brk++;
      const d = x.dataRef || {};
      if(d.type === 'sammel'){
        const teile = d.teile || [];
        // Die Zeile einer Sammelkarte traegt ihren Typ nicht mit, also wird
        // der Anlass an den Rohmeldungen desselben Tages gesucht.
        const titel = new Set(teile.map(z => z.titel));
        if(r.filter(y => titel.has(y.title)).some(y => anlass(y.dataRef || {}))) geerbt++;
        else fremd.push(x.title);
      } else if(!anlass(d)) fremd.push(x.title);
    });
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {brk, geerbt, fremd:[...new Set(fremd)]};
})())`));
ok(_brkZu.brk > 0, 'der Durchlauf trifft ueberhaupt Breaking-Karten',
   _brkZu.brk + ' Karten, ' + _brkZu.geerbt + ' davon gebuendelt');
ok(_brkZu.fremd.length === 0, 'keine Karte traegt Breaking ohne einen Anlass von der Liste',
   _brkZu.fremd.slice(0, 2).join(' | ') || 'keine');

// ── Der Takt einer Auszeichnung haengt an ihrer Klasse [§11.0c] ───────
// Eine Liste fuer alle drei Klassen war zu grob in beide Richtungen: sie
// liess legendaere Erfolge zwischen der zehnten und der fuenfundzwanzigsten
// Verleihung wegfallen, und eine gewoehnliche Auszeichnung war beim ersten
// Mal eine eigene Karte, obwohl sie in der Liga jeder holt, der lange genug
// dabei ist. Die kleinen Marken eines Tages stehen jetzt zusammen.
const _takt = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const einzel = roh.filter(s => (s.dataRef||{}).type === 'badge_unlocked');
  const sam = roh.filter(s => (s.dataRef||{}).type === 'badge_marken');
  const jeTag = {};
  sam.forEach(s => { jeTag[s.dataRef.tag] = (jeTag[s.dataRef.tag]||0) + 1; });
  const marken = [].concat.apply([], sam.map(s => s.dataRef.marken || []));
  return {
    legendaerImmer: [1,2,3,7,13,26].every(n => _badgeTakt('legendary', n) === true),
    seltenMarken: [1,5,10,25,50,100].every(n => _badgeTakt('rare', n))
      && ![2,3,7,11].some(n => _badgeTakt('rare', n)),
    kleinOhneErstes: _badgeTakt('common', 1) === false
      && [5,10,25,50,100].every(n => _badgeTakt('common', n)),
    // Eine gewoehnliche Auszeichnung bekommt keine eigene Karte mehr; die
    // gewhitelisteten Sonderfaelle sind davon ausgenommen.
    einzelGewoehnlich: einzel.filter(s => rarityOf(s.dataRef.badgeId) === 'common'
      && !NEWS_BADGE_WHITELIST.has(s.dataRef.badgeId)).length,
    sammelKarten: sam.length,
    proTagHoechstens1: Object.keys(jeTag).every(k => jeTag[k] === 1),
    markenAufMarke: marken.every(m => NEWS_BADGE_MARKEN_KLEIN.indexOf(m.rang) >= 0),
    markenGewoehnlich: marken.every(m => rarityOf(m.badgeId) === 'common'),
    gruende: [...new Set(sam.map(s => (s.dataRef.causalKey||'').split(':')[0]))]
  };
})())`));
// Im Vierzehn-Tage-Fenster traegt jede dieser Karten gerade eine Marke, und
// damit waere die naechste Zusicherung vakuant. Gemessen wird sie deshalb
// ueber die Spieltage der Liga: dort fallen an einem Tag bis zu vier.
const _taktLauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let karten = 0, mehrere = 0, falsch = 0, mehrfachTag = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    const sam = roh.filter(s => (s.dataRef||{}).type === 'badge_marken');
    const jeTag = {};
    sam.forEach(s => {
      karten++;
      jeTag[s.dataRef.tag] = (jeTag[s.dataRef.tag]||0) + 1;
      const m = s.dataRef.marken || [];
      if(m.length > 1) mehrere++;
      const soll = [...new Set(m.map(x => x.pid))].sort().join(',');
      if((s.dataRef.playerIds||[]).slice().sort().join(',') !== soll) falsch++;
    });
    mehrfachTag += Object.keys(jeTag).filter(k => jeTag[k] > 1).length;
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {karten, mehrere, falsch, mehrfachTag};
})())`));
ok(_taktLauf.mehrere > 0, 'der Durchlauf trifft Karten mit mehreren Marken',
   _taktLauf.mehrere + ' von ' + _taktLauf.karten);
ok(_taktLauf.falsch === 0, 'und jede nennt jeden, von dem sie erzaehlt',
   _taktLauf.falsch + ' unvollstaendig');
ok(_taktLauf.mehrfachTag === 0, 'nie zwei solche Karten an einem Tag',
   _taktLauf.mehrfachTag + ' Tage doppelt');
ok(_takt.legendaerImmer, 'eine legendaere Auszeichnung ist jedes Mal eine Nachricht');
ok(_takt.seltenMarken, 'eine seltene beim ersten Mal und an den runden Marken');
ok(_takt.kleinOhneErstes, 'eine gewoehnliche erst ab der fuenften Verleihung');
ok(_takt.einzelGewoehnlich === 0,
   'keine gewoehnliche Auszeichnung bekommt eine eigene Karte',
   _takt.einzelGewoehnlich + ' eigene Karten');
ok(_takt.sammelKarten > 0, 'die kleinen Marken eines Tages werden ueberhaupt gemeldet',
   _takt.sammelKarten + ' Karten');
ok(_takt.proTagHoechstens1 && _takt.gruende.join(',') === 'awards',
   'je Spieltag EINE Karte, und ihr Grund sind die Auszeichnungen dieses Tages',
   JSON.stringify(_takt.gruende));
ok(_takt.markenAufMarke && _takt.markenGewoehnlich,
   'darin steht nur eine gewoehnliche Auszeichnung auf einer runden Marke');

console.log('\n=== 9b. DIE EWIGE TAFEL MELDET SICH ===');
// Der ganze Awards-Reiter kam im Feed nicht vor: wer einen Liga-Rekord
// uebernahm, eine Monatschronik holte oder eine Insignium-Stufe erreichte,
// erfuhr es nur, wenn er selbst nachsah.
const _tafel = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const typ = t => roh.filter(s => (s.dataRef||{}).type === t);
  const rek = roh.filter(s => ((s.dataRef||{}).type || '').indexOf('rekord_') === 0);
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const tag0 = new Date(letzte); tag0.setHours(0,0,0,0);
  const vor = tag0.getTime() - 1;
  const insErwartet = players.filter(p => p && !p.hidden).reduce((n,p) =>
    n + Math.max(0, prestigeOf(p.id).stufe - prestigeOf(p.id, vor).stufe), 0);
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
    insignium: typ('insignium_stufe').length, insErwartet,
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
ok(_tafel.ausbauStumm === 0, 'nur sichtbar verbesserte Rekorde werden als „ausgebaut" gemeldet',
   _tafel.ausbauStumm + ' ohne sichtbare Aenderung');

// ── Ein Spieltag, ein Paar von Staenden [§11.0e] ──────────────────────
// Rekord, Monatschronik und Insignium rechneten sich ihre Tagesgrenze und
// ihren Zeitschnitt jeder selbst aus. Drei Rechnungen ueber dieselbe
// Aenderung nennen irgendwann drei Zahlen, und die stehen dann auf drei
// Karten derselben Minute. `_storyTagGrenzen` und `_storyStand` sind die
// eine Wahrheit dazwischen, `_prestigeWirkung` ihr Unterschied.
const _tagRahmen = JSON.parse(K.eval(`JSON.stringify((function(){
  const letzte = matches.length ? mts(matches[matches.length-1]) : 0;
  const tg = _storyTagGrenzen(letzte);
  const vor = _storyStand(tg.vorMs), nach = _storyStand(tg.nachMs);
  const tagPartien = matches.filter(m => mts(m) >= tg.vonMs && mts(m) <= tg.vonMs + 864e5 - 1).length;
  const aktive = players.filter(p => p && !p.hidden);
  const w = {};
  aktive.forEach(p => { w[p.id] = _prestigeWirkung(p.id, vor, nach); });
  return {
    // Der juengste Spieltag ist „heute": ein Schnitt hinter seiner letzten
    // Partie schneidet nichts ab und kostet nur eine kalte Rechnung [§3].
    nachOhneSchnitt: tg.nachMs === 0 && tg.istHeute === true,
    grenze: tg.vorMs === tg.vonMs - 1 && tg.tag === tagKey(tg.vonMs),
    partien: tg.partien === tagPartien,
    // Die Wirkung erfindet keine Punkte. Dass die Insignium-Karten eines
    // Laufs genau die gekreuzten Stufen sind, misst die Probe insErwartet
    // weiter oben schon — ein zweites Mass fuer dieselbe Aussage waere eins
    // zu viel [§C27]. (Kein Backtick in diesem Kommentar: er steht in einer
    // Template-Zeichenkette und wuerde sie beenden.)
    summe: aktive.every(p => w[p.id].vor + w[p.id].delta === w[p.id].nach)
  };
})())`));
ok(_tagRahmen.nachOhneSchnitt, 'der juengste Spieltag vergleicht gegen „jetzt", nicht gegen einen Schnitt');
ok(_tagRahmen.grenze, 'Vorher ist eine Millisekunde vor Mitternacht, und der Tagesschluessel gehoert dazu');
ok(_tagRahmen.partien, 'der Rahmen zaehlt die Partien seines Tages');
ok(_tagRahmen.summe, 'die Punktewirkung erfindet keine Punkte');

// ── Eine Tafel-Karte je Spieltag, und ihr Grund steht darin ───────────
// Gebuendelt wurde nach Partie ODER Minute. Das ist ein Stellvertreter, und
// er traf daneben: gemessen ueber die 19 Spieltage vom 28.07. bis 26.08.
// stand am 29.07. eine zweite Tafel-Karte neben der ersten, weil eine
// Insignium-Stufe eine andere Minute trug als die Rekorde desselben Tages.
// Zwei Karten „X bewegen die Ewige Tafel" an einem Tag sind eine Nachricht
// und eine Wiederholung [§C33]. Der Grund gehoert deshalb in die Karte.
const _tafelGrund = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const arten = ['rekord_erstmals','rekord_geholt','rekord_gesteigert',
                 'insignium_stufe','chronik_erstling','chronik_geholt'];
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  let ohneGrund = 0, meldungen = 0, mehrfach = [], gemessen = 0;
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    const tafel = roh.filter(s => arten.indexOf((s.dataRef||{}).type) >= 0);
    if(!tafel.length) return;
    gemessen++;
    meldungen += tafel.length;
    ohneGrund += tafel.filter(s => !(s.dataRef||{}).causalKey).length;
    let fertig = []; try { fertig = _consolidateStories(roh) || []; } catch(e){}
    const karten = fertig.filter(s => s.cat === 'tafel' && tagKey(s.when) === t);
    if(karten.length > 1) mehrfach.push(t + ': ' + karten.map(s => s.title).join(' | '));
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {tage:tage.length, gemessen, meldungen, ohneGrund, mehrfach};
})())`));
console.log('  Spieltage 28.07.-26.08.: ' + _tafelGrund.tage + ' · mit Tafel-Meldung: '
  + _tafelGrund.gemessen + ' · Meldungen: ' + _tafelGrund.meldungen);
// Ohne diese Probe waere die naechste vakuant.
ok(_tafelGrund.meldungen >= 100, 'der Durchlauf trifft ueberhaupt Tafel-Meldungen',
   _tafelGrund.meldungen + ' Meldungen an ' + _tafelGrund.gemessen + ' Spieltagen');
ok(_tafelGrund.ohneGrund === 0, 'jede Tafel-Meldung nennt ihren Grund',
   _tafelGrund.ohneGrund + ' ohne causalKey');
ok(_tafelGrund.mehrfach.length === 0, 'an einem Spieltag steht hoechstens eine Tafel-Karte',
   _tafelGrund.mehrfach.slice(0, 2).join(' || ') || 'keine Doppelung');

// ── Ein gleitendes Fenster wird nicht „ausgebaut" [§C33] ──────────────
// Der Wert einer Laufbahn steigt, weil jemand besser gespielt hat; der Wert
// eines Fensters steigt auch dann, wenn am hinteren Ende ein schwaches
// Ergebnis herausfaellt. Dieselbe Begruendung wie beim Verschlechtern: wer
// nichts getan hat, hat nichts getan.
// Gemessen wird ueber jeden vierten Spieltag der Ligageschichte und nicht am
// festen Zeitpunkt: dort faellt zufaellig gerade keine Ausbau-Karte, und die
// Zusicherung war damit gruen, auch als die Regel ganz fehlte.
const _fenAus = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => mdayKey(m)))].sort();
  const ausbau = [], fenster = [];
  tage.filter((t, i) => i % 4 === 0).forEach(tag => {
    matches = alle.filter(m => mdayKey(m) <= tag);
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let roh = []; try { roh = _buildStories() || []; } catch(e){ return; }
    roh.forEach(s => {
      const d = s.dataRef || {};
      if(d.type !== 'rekord_gesteigert') return;
      ausbau.push(d.rekordId);
      if((CHRONICLE_BY_ID[d.rekordId] || {}).fenster) fenster.push(s.title);
    });
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {ausbau:ausbau.length, arten:[...new Set(ausbau)].length,
          fenster:[...new Set(fenster)],
          katalog:CHRONICLES.filter(c => c.fenster).map(c => c.id)};
})())`));
console.log('  Ausbau-Karten im Durchlauf: ' + _fenAus.ausbau + ' aus ' + _fenAus.arten + ' Rekorden'
  + ' · Fenster im Katalog: ' + _fenAus.katalog.join(', '));
ok(_fenAus.katalog.length >= 3, 'die gleitenden Fenster stehen im Katalog',
   _fenAus.katalog.join(', ') || 'keins');
// Ohne diese Probe waere die naechste vakuant: sie prueft eine Teilmenge.
ok(_fenAus.ausbau >= 10, 'der Durchlauf trifft ueberhaupt Ausbau-Karten',
   _fenAus.ausbau + ' Karten');
ok(_fenAus.fenster.length === 0, 'kein gleitendes Fenster meldet ein Ausbauen',
   _fenAus.fenster.slice(0, 3).join(' | ') || _fenAus.ausbau + ' Ausbau-Karten, keine davon');
ok(_tafel.kammer, 'Schattenseiten meldet der Feed nicht');
ok(_tafel.kat, 'Rekorde stehen in der Kammer „Ewige Tafel"');
ok(_tafel.gesichter, 'jede Rekordkarte zeigt ihren Halter [§C33]');
ok(_tafel.insignium === _tafel.insErwartet,
   'genau jeder echte Insignium-Uebergang wird gemeldet',
   _tafel.insignium + ' von ' + _tafel.insErwartet);
ok(_tafel.insGesicht, 'die Insignium-Karte zeigt den Traeger');
ok(_tafel.chronik > 0, 'die Monatschronik wird gemeldet', _tafel.chronik + '');
ok(_tafel.sauber, 'jede Tafel-Karte nennt eine Zahl und traegt keinen Platzhalter');

// Ein grosser Sprung darf keine Stufe ueberspringen. Der fachliche Zeitpunkt
// ist die erste Partie, deren historischer Prestige-Stand die Schwelle traegt;
// derselbe Lauf muss danach dieselben stabilen IDs und Zeiten liefern.
const _insHistorisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const original = prestigeOf;
  const pid = players[0].id;
  const letzte = mts(matches[matches.length-1]);
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const tag = matches.filter(m => mts(m) >= t0.getTime()).sort((a,b)=>mts(a)-mts(b));
  const kreuz = mts(tag[Math.min(1, tag.length-1)] || matches[matches.length-1]);
  const stand = stufe => ({pid, punkte:stufe >= 2 ? 760 : stufe ? 260 : 100, stufe,
    insignie:INSIGNIEN[stufe], naechste:INSIGNIEN[stufe+1] || null,
    fehlt:stufe >= 2 ? 920 : stufe ? 460 : 140,
    teile:{leistung:120,auszeichnung:80,monat:40,rekord:20},
    zahlen:{leistung:1,auszeichnung:1,monat:1,rekord:1}, quellen:[], platz:1, von:players.length});
  try {
    prestigeOf = (id, bisMs) => id !== pid ? original(id, bisMs)
      : stand((bisMs != null && bisMs < kreuz) ? 0 : 2);
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const a = _buildStories().filter(s => (s.dataRef||{}).type === 'insignium_stufe' && s.dataRef.pid === pid);
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const b = _buildStories().filter(s => (s.dataRef||{}).type === 'insignium_stufe' && s.dataRef.pid === pid);
    return {n:a.length, stufen:a.map(s=>s.dataRef.stufe), ids:a.map(s=>s.id),
      zeiten:a.map(s=>new Date(s.when).getTime()), gleich:JSON.stringify(a.map(s=>[s.id,+new Date(s.when)]))
        === JSON.stringify(b.map(s=>[s.id,+new Date(s.when)])), kreuz};
  } finally { prestigeOf = original; _cache._buildStoriesKey = null; _cache._buildStoriesResult = null; }
})())`));
ok(_insHistorisch.n === 2 && _insHistorisch.stufen.join(',') === '1,2',
   'ein Sprung meldet jede neu erreichte Insignium-Stufe', JSON.stringify(_insHistorisch));
ok(_insHistorisch.zeiten.every(t => t === _insHistorisch.kreuz),
   'Insignium-Stories tragen den fachlichen Ereigniszeitpunkt');
ok(_insHistorisch.gleich && new Set(_insHistorisch.ids).size === _insHistorisch.ids.length,
   'erneute Generatorlaeufe bleiben idempotent', _insHistorisch.ids.join(', '));

// ── Erstmals erreicht oder wieder getragen ────────────────────────────
// Prestige aus Liga-Rekorden wird unter den Haltern geteilt und faellt mit
// einem verlorenen Bestwert wieder [§C34]: dieselbe Stufe kann zweimal
// erreicht werden, und beide Male stand „X traegt den Volutenkranz" da, als
// waere es das erste Mal. Der Beleg ist der eigene Bestand — die ID einer
// Insignium-Karte traegt Spieler, Stufe und Spieltag.
const _insWieder = JSON.parse(K.eval(`JSON.stringify((function(){
  const original = prestigeOf, bestand = _cache._stories;
  const pid = players[0].id;
  const letzte = mts(matches[matches.length-1]);
  const t0 = new Date(letzte); t0.setHours(0,0,0,0);
  const tag = matches.filter(m => mts(m) >= t0.getTime()).sort((a,b)=>mts(a)-mts(b));
  const kreuz = mts(tag[Math.min(1, tag.length-1)] || matches[matches.length-1]);
  const stand = stufe => ({pid, punkte:stufe >= 2 ? 760 : stufe ? 260 : 100, stufe,
    insignie:INSIGNIEN[stufe], naechste:INSIGNIEN[stufe+1] || null,
    fehlt:stufe >= 2 ? 920 : stufe ? 460 : 140,
    teile:{auszeichnung:80, monat:40, rekord:20},
    zahlen:{auszeichnung:1, monat:1, rekord:1}, quellen:[], platz:1, von:players.length});
  try {
    prestigeOf = (id, bisMs) => id !== pid ? original(id, bisMs)
      : stand((bisMs != null && bisMs < kreuz) ? 0 : 2);
    // Nur fuer die zweite Stufe liegt eine aeltere Zeile im Bestand.
    _cache._stories = [{id:'ins_' + pid + '_' + INSIGNIEN[2].key + '_2026-08-12'}];
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    const k = _buildStories().filter(s => (s.dataRef||{}).type === 'insignium_stufe'
      && s.dataRef.pid === pid);
    const je = {}; k.forEach(s => { je[s.dataRef.stufe] = s; });
    return {
      stufen: k.map(s => s.dataRef.stufe),
      erstmals: !!je[1] && je[1].title.indexOf(' wieder') < 0 && je[1].dataRef.wieder === '',
      wiederTitel: !!je[2] && je[2].title.slice(-7) === ' wieder',
      wiederDatum: !!je[2] && je[2].desc.indexOf('Zuletzt stand die Stufe am 12.08.') === 0,
      wiederRef: !!je[2] && je[2].dataRef.wieder === '2026-08-12'
    };
  } finally {
    prestigeOf = original; _cache._stories = bestand;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_insWieder.stufen.join(',') === '1,2', 'der Lauf trifft beide Stufen',
   _insWieder.stufen.join(',') || 'keine');
ok(_insWieder.erstmals, 'eine Stufe ohne aeltere Zeile im Bestand ist erstmals erreicht');
ok(_insWieder.wiederTitel && _insWieder.wiederRef,
   'eine Stufe, die schon einmal dastand, wird wieder getragen',
   JSON.stringify(_insWieder));
ok(_insWieder.wiederDatum, 'und die Karte nennt den Tag, an dem sie zuletzt stand');

console.log('\n=== 9c. STORY-BLAETTER BLEIBEN BEI IHRER GESCHICHTE ===');
// Story-Blätter zeigen ihren gesamten Beleg direkt. Zusätzliche Wege in
// Rückblicke und Spielerprofile verdoppeln nur die Navigation und sind dort
// bewusst entfernt. Gerade POTD darf dabei keine Partie abschneiden.
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
  const potd = einer('potd');
  const pd = potd ? (potd.dataRef||{}) : {};
  const pids = (Array.isArray(pd.playerIds) && pd.playerIds.length) ? pd.playerIds : [pd.playerId];
  const potdBody = body(potd);
  const alleBodies = roh.map(body).join('');
  return {
    keineProfile: alleBodies.indexOf('Profil von ') < 0,
    keineRueckblicke: alleBodies.indexOf('data-recap=') < 0 && alleBodies.indexOf('Rückblick öffnen') < 0,
    hatPotd: !!potd,
    potdErwartet: potd ? _newsTagPartien(pd.dayKey, pids).length : 0,
    potdGezeigt: (potdBody.match(/class="nd-match"/g)||[]).length,
    hatWoche: !!wo,
    wocheStunde: wo ? new Date(wo.when).getHours() : -1,
    wocheTag: wo ? new Date(wo.when).getDay() : -1,
    wocheTeile: teile.length,
    wocheArten: teile.map(t => t.art),
    wocheGesicht: wo ? _newsPids(wo).length : 0,
    teamWoche: !!tw,
    // Das Duo kommt aus derselben Rechnung wie der Teams-Tab.
    teamWocheGesicht: tw ? (tw.pids||[]).length : 0
  };
})())`));
ok(_rueck.keineProfile, 'kein Story-Blatt trägt einen Profil-Button');
ok(_rueck.keineRueckblicke, 'kein Story-Blatt trägt einen Rückblick-Button');
ok(!_rueck.hatPotd || _rueck.potdGezeigt === _rueck.potdErwartet,
   'Spieler des Tages zeigt ausnahmslos alle Partien', _rueck.potdGezeigt + ' von ' + _rueck.potdErwartet);
ok(_rueck.hatWoche, 'der Wochenrueckblick steht als eine Karte');
ok(!_rueck.hatWoche || _rueck.wocheTag === 0, 'die Wochenkarte steht am Sonntag', _rueck.wocheTag);
ok(!_rueck.hatWoche || _rueck.wocheStunde === 23, 'die Wochenkarte steht um 23:00', _rueck.wocheStunde);
ok(!_rueck.hatWoche || _rueck.wocheTeile >= 2, 'sie traegt mehrere Wertungen',
   _rueck.wocheTeile + ': ' + _rueck.wocheArten.join(', '));
ok(!_rueck.hatWoche || _rueck.wocheGesicht > 0, 'die Wochenkarte zeigt ein Gesicht [§C33]', _rueck.wocheGesicht);
ok(_rueck.teamWoche, 'das Team der Woche ist eine ihrer Zeilen');
ok(!_rueck.teamWoche || _rueck.teamWocheGesicht === 2, 'das Team der Woche zeigt beide Gesichter [§C33]',
   _rueck.teamWocheGesicht + '');

console.log('\n=== 10. DER FEED [§C33] ===');
// Der Feed war die einzige Ansicht der App, in der ein Spieler nur ein Name
// war — kein Gesicht, kein Wappen. Und er trug elf Kategoriefarben, in denen
// Gold nichts Besonderes mehr hiess. Diese vier Zusicherungen halten beides.
const _feed = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null;
  const sichtbar = getStoriesCache();
  const zaehl = {}, proTag = {};
  sichtbar.forEach(s => { const t=(s.dataRef&&s.dataRef.type)||'-';
    zaehl[t]=(zaehl[t]||0)+1;
    const k=t+'|'+tagKey(s.when); proTag[k]=(proTag[k]||0)+1; });
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
    matchKarten: sichtbar.filter(s => (s.dataRef||{}).matchId).length,
    matchResult: sichtbar.filter(s => (s.dataRef||{}).type === 'match_result').length,
    matchOhneBand: sichtbar.filter(s => {
      const d=s.dataRef||{}; if(!d.matchId) return false;
      const m=matches.find(x=>x.id===d.matchId);
      const html=_newsCardHtmlM2(s, false, false);
      const ids=m ? [m.a1,m.a2,m.b1,m.b2].filter(Boolean) : [];
      const pm=pmap();
      return !m || html.indexOf('class="nf-erg"') < 0
        || (html.match(/class="nf-erg-team/g)||[]).length < 2
        || (html.match(/class="rav zn/g)||[]).length < 4
        || ids.some(id=>!pm[id] || html.indexOf(esc(pm[id].name))<0);
    }).map(s => (s.dataRef||{}).type),
    // Keine Ausrufezeichen [CLAUDE.md §7].
    rufe: roh.filter(s => /!/.test(s.title||'') || /!/.test(s.desc||''))
             .map(s => s.title).slice(0, 5),
    // Kein Typ haeuft sich.
    // Die Typen sammel und woche sind ausgenommen: jede Sammelkarte gehoert zu einer
    // anderen Partie oder einem anderen Tag, und die Wochenkarte gibt es je
    // Woche genau einmal. Sie zu deckeln hiesse, eine Buendelung zu bestrafen.
    // potd und chronik_monat stehen dabei: was es je Tag oder Monat genau
    // einmal gibt, ist keine Wiederholung, sondern die Schlagzeile eines
    // eigenen Tages.
    haeufung: Object.keys(proTag).filter(k => proTag[k] > 2 &&
      ['ambient','group','lead_change','elo_record','streak_record',
       'season_recap','season_endgame','sammel','woche',
       'potd','chronik_monat'].indexOf(k.split('|')[0]) < 0)
      .map(k => k + '×' + proTag[k]),
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
      // Gefragt ist, was man SIEHT. Eine Sammelkarte traegt die Sorte ihres
      // Kopfs, und ein Ergebnis traegt sein Muster: der Krimi hat ein anderes
      // Zeichen, eine andere Rubrik und einen anderen Satzbau als der
      // Kantersieg [§C27]. Ohne das Muster galten „Maxi und Julian setzen ein
      // klares Zeichen" und „Julian und Leon retten ein 10:9 ins Ziel" als
      // dieselbe Karte, obwohl sie von zwei verschiedenen Partien und mit
      // zwei verschiedenen Zeichen erzaehlen.
      const art = x => { const d = x.dataRef || {};
        if(d.type === 'sammel') return d.kopfTyp || 'sammel';
        if(d.type === 'match_result') return 'match_result/' + (d.resultKind || '');
        return d.type; };
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
ok(_feed.matchKarten >= 3 && _feed.matchResult > 0,
   'der Feed erzaehlt regelmaessig von konkreten und besonderen Partien',
   _feed.matchKarten + ' Karten mit Matchbezug, ' + _feed.matchResult + ' Ergebnisgeschichte');
ok(_feed.matchOhneBand.length === 0,
   'jede konkrete Partie zeigt Ergebnis und Beteiligte direkt auf der Karte',
   _feed.matchOhneBand.join(', ') || 'alle mit Ergebnisband');
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
   'kein Story-Typ steht an einem Tag mehr als zweimal im Feed',
   _feed.haeufung.join(', ') || 'keiner');
ok(_feed.doppelt.length === 0,
   'keine zwei Karten mit derselben Schlagzeile',
   _feed.doppelt.join(' | ') || 'keine');

// Serienmarken sind Ereignisse ihres auslösenden Matches. Sie dürfen nicht
// rückwirkend verschwinden, nur weil der Spieler danach verloren hat.
const _serienHistorisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const a=_buildStories().filter(s=>(s.dataRef||{}).type==='win_streak');
  const live=_liveStreakForm().win || {};
  const vergangen=a.filter(s=>(live[(s.dataRef||{}).pid]||0)<((s.dataRef||{}).streak||0));
  const map=new Map(matches.map(m=>[m.id,new Date(m.created_at).getTime()]));
  const falsch=a.filter(s=>!(s.dataRef||{}).matchId
    || map.get(s.dataRef.matchId)!==new Date(s.when).getTime());
  const b=_buildStories().filter(s=>(s.dataRef||{}).type==='win_streak');
  return {n:a.length,vergangen:vergangen.length,falsch:falsch.length,
    stabil:a.map(s=>s.id).join('|')===b.map(s=>s.id).join('|')};
})())`));
ok(_serienHistorisch.n > 0 && _serienHistorisch.vergangen > 0,
   'eine erreichte Serienmarke bleibt auch nach dem spaeteren Serienbruch erhalten',
   JSON.stringify(_serienHistorisch));
ok(_serienHistorisch.falsch === 0 && _serienHistorisch.stabil,
   'Serienkarten tragen Matchzeit und stabile fachliche Identitaet',
   JSON.stringify(_serienHistorisch));


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

// Und der Tag steht seinem eigenen Spieltag zur Verfuegung, nicht erst dem
// naechsten. Die Quelle des Generators liess JEDEN Tag ab Mitternacht aus,
// damit der Rueckblick nicht mitten im laufenden Spieltag aufspringt — damit
// konnte die Karte an ihrem eigenen 23:59 nie entstehen. Gemessen wird gegen
// den letzten Spieltag der Fixtures (26.08.); die Uhr wird dafuer kurz
// umgestellt und danach zurueck, weil die ganze Suite an FIXED haengt.
const _potdQuelle = (function(){
  const Echt = globalThis.Date;
  const stellen = ms => { globalThis.Date = class extends Echt {
    constructor(...a){ if(a.length===0) super(ms); else super(...a); }
    static now(){ return ms; } }; };
  const lies = () => { try { return K.eval('(_potdLastDayData()||{}).dayKey || null'); }
                       catch(e){ return 'FEHLER: ' + e.message; } };
  try {
    stellen(new Echt(2026, 7, 26, 18, 0, 0).getTime());
    const waehrend = lies();
    stellen(new Echt(2026, 7, 26, 23, 59, 0).getTime());
    const danach = lies();
    return {waehrend, danach};
  } finally { globalThis.Date = FakeDate; }
})();
ok(_potdQuelle.waehrend !== '2026-08-26',
   'der laufende Spieltag wird nicht schon um 18 Uhr gewertet',
   String(_potdQuelle.waehrend));
ok(_potdQuelle.danach === '2026-08-26',
   'um 23:59 gehoert der Tag sich selbst',
   String(_potdQuelle.danach));

// Der Rang kommt aus dem Generator, nicht aus der Zeile. Eine gespeicherte
// Karte trug ihre `prio` mit sich; als die Skala auf EIN Band umgestellt
// wurde, blieben die alten Zeilen auf ihrer alten Zahl stehen und der
// Tagesdeckel verglich zwei Skalen. Gemessen wird an einer Karte, die der
// Generator noch bildet (dann gilt seine Zahl), und an einer, die er nicht
// mehr bildet (dann gilt das Band ihres Typs).
const _prioFrisch = JSON.parse(K.eval(`JSON.stringify((function(){
  const frisch = _buildStories();
  const kennt = frisch.find(s => s && s.prio > 40 && (s.dataRef||{}).type
                                 && !STORY_LAEUFT_AB.has(s.dataRef.type));
  if(!kennt) return {keine:true};
  const ausDb  = Object.assign({}, kennt, {prio: 6});
  const veraltet = {id:'diese_id_bildet_niemand_mehr', cat:'highlight',
                    title:'Alt', desc:'Alt', when: kennt.when, prio: 4,
                    dataRef:{type:'top_clash'}};
  const aus = _newsTexteAuffrischen([ausDb, veraltet]);
  const bekannt = aus.find(s => s.id === ausDb.id);
  const alt = aus.find(s => s.id === veraltet.id);
  return {bekannt: bekannt && bekannt.prio, sollBekannt: kennt.prio,
          veraltet: alt && alt.prio, sollVeraltet: STORY_PRIO.top_clash};
})())`));
ok(!_prioFrisch.keine && _prioFrisch.bekannt === _prioFrisch.sollBekannt,
   'eine gespeicherte Karte bekommt den Rang des Generators',
   _prioFrisch.bekannt + ' statt ' + _prioFrisch.sollBekannt);
ok(!_prioFrisch.keine && _prioFrisch.veraltet === _prioFrisch.sollVeraltet,
   'und eine, die er nicht mehr bildet, das Band ihres Typs',
   _prioFrisch.veraltet + ' statt ' + _prioFrisch.sollVeraltet);

// Zwei Karten ueber denselben Rekord, und die aeltere nennt einen Halter,
// der keiner mehr ist: sie widerspricht der juengeren, die direkt daneben
// steht. Gemessen am 10.09. stand „Martin uebernimmt ‚Der Zerstoerer'"
// zwei Karten ueber „Jannik baut ‚Der Zerstoerer' aus". Nur BEIDES
// zusammen zaehlt: eine Uebernahme, der nichts widerspricht, bleibt eine
// Nachricht ueber ihren eigenen Tag.
const _rekAlt = JSON.parse(K.eval(`JSON.stringify((function(){
  const A = allChronicles().byId;
  const rid = Object.keys(A).find(k => A[k] && (A[k].pids||[]).length);
  if(!rid) return {keine:true};
  const halter = A[rid].pids;
  const fremd = (players||[]).find(p => p && !halter.includes(p.id));
  if(!fremd) return {keine:true};
  const t = Date.now();
  const mach = (id, typ, pids, ms, titel) => ({id, cat:'tafel', ic:'award',
    title:titel, desc:'Beleg mit 7 Zahlen.', when:new Date(ms), prio:70,
    dataRef:{type:typ, rekordId:rid, playerIds:pids, vorher:[]}});
  const alt  = mach('rek_pruef_alt',  'rekord_geholt',      [fremd.id], t-3600000, 'Alt uebernimmt');
  const neuK = mach('rek_pruef_neu',  'rekord_gesteigert', halter.slice(0,1), t, 'Neu baut aus');
  // Zwei Tafel-Karten desselben Tages werden gebuendelt: gesucht wird die
  // Aussage, egal ob sie als Karte oder als Zeile darin steht.
  const drin = (liste, titel) => liste.some(x => x.title === titel
    || (((x.dataRef||{}).teile)||[]).some(t => t && t.titel === titel));
  const zusammen = _consolidateStories([neuK, alt]);
  const allein   = _consolidateStories([Object.assign({}, alt)]);
  return {mitJuengerer: drin(zusammen, 'Alt uebernimmt'),
          juengereBleibt: drin(zusammen, 'Neu baut aus'),
          alleine: drin(allein, 'Alt uebernimmt')};
})())`));
ok(!_rekAlt.keine && _rekAlt.mitJuengerer === false,
   'ein ueberholter Rekord-Halter steht nicht neben dem heutigen',
   String(_rekAlt.mitJuengerer));
ok(!_rekAlt.keine && _rekAlt.juengereBleibt === true,
   'die Karte, die noch gilt, bleibt',
   String(_rekAlt.juengereBleibt));
ok(!_rekAlt.keine && _rekAlt.alleine === true,
   'und eine Uebernahme, der nichts widerspricht, bleibt auch',
   String(_rekAlt.alleine));

// Dasselbe fuer die Monatschronik: auch dort wird ein Feld im Lauf eines
// Tages enger und weiter. Gemessen am 08.09. stand „Leo holt ‚Ohne
// Schwachstelle'", neun Minuten spaeter „Leo und Maxi holen ‚Ohne
// Schwachstelle'" und drei Stunden danach „Maxi holt ‚Ohne Schwachstelle'"
// — dreimal dieselbe Chronik an einem Tag.
const _chronAlt = JSON.parse(K.eval(`JSON.stringify((function(){
  const T = seasonTitles(currentSeason().id).awarded || [];
  if(!T.length) return {keine:true};
  const tid = T[0].titleId, halter = T.filter(a => a.titleId === tid).map(a => a.pid);
  const fremd = (players||[]).find(p => p && !halter.includes(p.id));
  if(!fremd) return {keine:true};
  const t = Date.now();
  const mach = (id, pids, ms, titel) => ({id, cat:'tafel', ic:'award', title:titel,
    desc:'Beleg mit 7 Zahlen.', when:new Date(ms), prio:62,
    dataRef:{type:'chronik_geholt', titleId:tid, playerIds:pids, vorher:[]}});
  const alt  = mach('chr_pruef_alt', [fremd.id], t-3600000, 'Fremd holt sie');
  const neuK = mach('chr_pruef_neu', halter.slice(0,1), t, 'Halter holt sie');
  const drin = (liste, titel) => liste.some(x => x.title === titel
    || (((x.dataRef||{}).teile)||[]).some(y => y && y.titel === titel));
  const zus = _consolidateStories([neuK, alt]);
  return {alteDrin: drin(zus, 'Fremd holt sie'), neueDrin: drin(zus, 'Halter holt sie')};
})())`));
ok(!_chronAlt.keine && _chronAlt.alteDrin === false,
   'auch bei der Monatschronik faellt der ueberholte Halter weg',
   String(_chronAlt.alteDrin));
ok(!_chronAlt.keine && _chronAlt.neueDrin === true,
   'und die Chronik-Karte, die noch gilt, bleibt',
   String(_chronAlt.neueDrin));

// Der Deckel je Sorte behaelt die zwei juengsten. Was es je Tag genau einmal
// gibt, faellt nie darunter: der Feed reicht vierzehn Tage zurueck, darin
// liegen sechs bis sieben Spieltage, und gemessen standen zwei ihrer Sieger
// im Feed. „Leo ist Spieler des Tages" und „Alex ist Spieler des Tages" sind
// keine Wiederholung voneinander, sie gehoeren zwei verschiedenen Tagen.
const _tagesSieger = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = Date.now();
  const namen = ['Aa','Bb','Cc','Dd','Ee'];
  const karten = namen.map((n, i) => ({
    id:'potd_pruef_'+i, cat:'highlight', ic:'dayKing',
    title:n+' ist Spieler des Tages',
    desc:'5 von 7 Spielen gewonnen, das sind 71 %.',
    when:new Date(t - i*86400000), prio:STORY_PRIO.potd,
    dataRef:{type:'potd', dayKey:'pruef'+i, playerId:'x'+i, wins:5, games:7}}));
  const aus = _consolidateStories(karten);
  return {gebaut: karten.length,
          imFeed: aus.filter(s => (s.dataRef||{}).type === 'potd').length};
})())`));
ok(_tagesSieger.imFeed === _tagesSieger.gebaut,
   'jeder Spieltag behaelt seinen Sieger, auch der fuenfte im Fenster',
   _tagesSieger.imFeed + ' von ' + _tagesSieger.gebaut);

// Und derselbe Spieler darf zwei Spieltage gewinnen. Die Schlagzeile ist
// dann wortgleich, der Text nicht: gemessen gewann Martin den 02.09. mit
// 3 von 3 und den 08.09. mit 5 von 7. Die aeltere Karte fiel weg, weil
// beide „Martin ist Spieler des Tages" heissen.
const _zweiTage = JSON.parse(K.eval(`JSON.stringify((function(){
  const t = Date.now();
  const mach = (i, wins, spiele) => ({id:'potd_gleich_'+i, cat:'highlight',
    ic:'dayKing', title:'Martin ist Spieler des Tages',
    desc: wins+' von '+spiele+' Spielen gewonnen. Tag '+i+'.',
    when:new Date(t - i*86400000), prio:STORY_PRIO.potd,
    dataRef:{type:'potd', dayKey:'g'+i, playerId:'m', wins:wins, games:spiele}});
  const aus = _consolidateStories([mach(0,5,7), mach(6,3,3)]);
  const gleich = _consolidateStories([mach(0,5,7), Object.assign(mach(6,5,7),
    {id:'potd_gleich_x', desc:'5 von 7 Spielen gewonnen. Tag 0.'})]);
  return {verschieden: aus.filter(s => (s.dataRef||{}).type==='potd').length,
          wortgleich: gleich.filter(s => (s.dataRef||{}).type==='potd').length};
})())`));
ok(_zweiTage.verschieden === 2,
   'derselbe Spieler darf zwei Spieltage gewinnen',
   _zweiTage.verschieden + ' von 2');
ok(_zweiTage.wortgleich === 1,
   'zwei in Schlagzeile UND Text gleiche Karten bleiben eine',
   _zweiTage.wortgleich + ' statt 1');

// Ein Spieler zeigt je Monat nur EINE Chronik. Holt er mehrere, sagt die
// Karte welche — sonst zaehlt sie zwei auf und laesst offen, welche ihn im
// Profil beschreibt.
const _zeigtSich = JSON.parse(K.eval(`JSON.stringify((function(){
  const sid = currentSeason().id;
  const T = seasonTitles(sid).awarded || [];
  const proPid = {};
  T.forEach(a => (proPid[a.pid] = proPid[a.pid] || []).push(a));
  const mehrere = Object.keys(proPid).filter(p => proPid[p].length > 1);
  if(!mehrere.length) return {keine:true};
  const pid = mehrere[0];
  const gezeigt = seasonTitleOf(pid, sid);
  const andere = proPid[pid].find(a => a.titleId !== gezeigt.titleId);
  const einer = Object.keys(proPid).find(p => proPid[p].length === 1);
  return {faelle: mehrere.length,
    aufGezeigte: (_chronikZeigtSich([pid], sid, gezeigt.titleId)||{}).zeigt,
    aufAndere:   (_chronikZeigtSich([pid], sid, andere.titleId)||{}).zeigt,
    beiEinem:    einer ? _chronikZeigtSich([einer], sid, proPid[einer][0].titleId) : 'keiner',
    beiZweien:   _chronikZeigtSich([pid, 'x'], sid, gezeigt.titleId),
    // Und die Marke muss im Band wirklich stehen.
    band: _newsSammelBand([
      {ic:'award', titel:'holt A', marke:'in der Chronik'},
      {ic:'award', titel:'holt B', marke:''}], [], true)};
})())`));
ok(!_zeigtSich.keine && _zeigtSich.faelle > 0,
   'es gibt Spieler mit mehreren Chroniken im Monat',
   String(_zeigtSich.faelle));
ok(_zeigtSich.aufGezeigte === true,
   'die Chronik, die in der Tafel steht, ist als solche erkannt',
   String(_zeigtSich.aufGezeigte));
ok(_zeigtSich.aufAndere === false,
   'und die zweite desselben Monats ist es nicht',
   String(_zeigtSich.aufAndere));
ok(_zeigtSich.beiEinem === null || _zeigtSich.beiEinem === 'keiner',
   'bei nur einer Chronik gibt es nichts zu unterscheiden',
   JSON.stringify(_zeigtSich.beiEinem));
ok(_zeigtSich.beiZweien === null,
   'und bei zwei Haltern wird nichts behauptet',
   JSON.stringify(_zeigtSich.beiZweien));
ok(_zeigtSich.band.indexOf('nf-sam-k') >= 0
   && _zeigtSich.band.indexOf('in der Chronik') >= 0,
   'das Sammelband zeigt die Marke',
   _zeigtSich.band.slice(0, 90));
ok(_plan.chrZeit.every(t => t === '0:0'), 'die Chronik erscheint um 00:00',
   _plan.chrZeit.join(', ') || 'keine');
ok(_plan.chrErster, 'am ersten Tag des Folgemonats');
ok(_plan.sammel.length > 0, 'es gibt Sammelkarten', _plan.sammel.length + '');
ok(_plan.sammel.every(n => n >= 2), 'eine Sammelkarte traegt alle verbundenen Zeilen',
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
  _cache._stories = [];
  delete _cache._buildStoriesKey; delete _cache._frischVon;
  const frisch = _buildStories();
  if(!frisch.length) return {n:0};
  // Eine persistierte Zeile mit ALTEM Wortlaut nachstellen.
  const alt = frisch.map(s => Object.assign({}, s, {
    title: 'ALTER TITEL', desc: 'alter Text mit einem Gedankenstrich — und einer Floskel.'}));
  _cache._stories = alt;
  _cache._consolFrom = null;
  const sicht = getStoriesCache();
  // Ein Fun Fact ist ausgenommen: sobald sein Slot im Bestand steht, bildet
  // der Generator ihn nicht mehr, und dann gibt es nichts aufzufrischen. Genau
  // das haelt ihn stabil — siehe Abschnitt 4.
  const ohneFakt = sicht.filter(x => String(x.id).indexOf('ambient_') !== 0);
  return {
    n: ohneFakt.length, fakten: sicht.length - ohneFakt.length,
    nochAlt: ohneFakt.filter(x => x.title === 'ALTER TITEL').length,
    mitStrich: ohneFakt.filter(x => (x.desc||'').indexOf('—') >= 0).length,
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
ok(_auffr.fakten > 0, 'und traegt auch Fun Facts', _auffr.fakten + ' Karten');
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
  // NUR die beiden Karten: gemessen wird der Stale-Filter, nicht der
  // Tagesdeckel. Mit dem ganzen Lauf entschied die Rangfolge des Tages mit,
  // und eine Karte, die als siebtstaerkste faellt, sagt nichts darueber,
  // ob die Serie noch laeuft.
  _cache._consolFrom = null;
  const sicht = _consolidateStories([ueberholt, echt]);
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
    // Eigener synthetischer Moment: Der Test soll die vier Dubletten
    // gegeneinander messen, nicht zufaellig mit einer echten Sammelkarte
    // kollidieren, die denselben Spieler am Basis-Zeitpunkt nennt.
    when: new Date(new Date(basis.when).getTime() + 15 * 60000),
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
  const kollisionen = [];
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
    if(dd.type === 'chronik_geholt' && dd.chronKlasse === 'legendaer')
      einzeln = true;
    if(einzeln) return;
    let ids = []; try { ids = _newsPids(s) || []; } catch(e){}
    if(!gesehen[k]) gesehen[k] = {};
    let kollision = false;
    ids.forEach(id => { if(gesehen[k][id]) kollision = true; gesehen[k][id] = 1; });
    if(kollision){ proMin[k] = (proMin[k]||1) + 1; kollisionen.push(k+' '+s.title); }
  });
  return {
    felsGesamt: titel.filter(t => t.indexOf('Der Fels') >= 0).length
              + zeilen.filter(t => t.indexOf('Der Fels') >= 0).length,
    titelDoppelt: titel.filter((t, i) => t && titel.indexOf(t) !== i).length,
    zeilenDoppelt,
    minutenMitMehreren: Object.keys(proMin).filter(k => proMin[k] > 1).length,
    kollisionen
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
   _dop.kollisionen.join(' | ') || _dop.minutenMitMehreren + ' Minuten');

// ── Der Kopf fasst zusammen, alle Teile bleiben gleichrangig ─────────
const _sam = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const norm = t => String(t||'').replace(/<[^>]*>/g,' ')
    .replace(/&[a-z]+;/g,' ').replace(/[^0-9a-zA-ZäöüÄÖÜß%]+/g,' ').trim().toLowerCase();
  const sicht = getStoriesCache().filter(x => (x.dataRef||{}).type === 'sammel');
  let kopfKopie = 0, textListe = 0, leer = 0, unvollstaendig = 0, markiert = 0;
  sicht.forEach(x => {
    const b = _newsDetailBody(x);
    const obenTitel = norm(x.title), obenText = norm(x.desc);
    const labels = (b.match(/class="nw-label">([^<]*)</g)||[])
      .map(t => norm(t.replace(/^[^>]*>/,'').replace(/<$/,'')));
    if(!labels.length) leer++;
    const teile = x.dataRef.teile || [];
    teile.forEach(t => {
      if(obenTitel === norm(t.titel) || obenText === norm(t.text)) kopfKopie++;
    });
    if(labels.length !== teile.length) unvollstaendig++;
    if(b.indexOf('nw-zeile-kopf-teil') >= 0) markiert++;
    // Der Text der Karte darf nicht die Schlagzeilen aller Zeilen sein.
    const alle = (x.dataRef.teile||[]).map(t => norm(t.titel));
    if(alle.length > 1 && alle.every(t => t && norm(x.desc).indexOf(t) >= 0)) textListe++;
  });
  return {n: sicht.length, kopfKopie, textListe, leer, unvollstaendig, markiert};
})())`));
ok(_sam.n > 0, 'es gibt Sammelkarten mit Blatt', _sam.n + '');
ok(_sam.kopfKopie === 0, 'der Sammelkarten-Kopf kopiert kein Einzelereignis',
   _sam.kopfKopie + ' Kopien');
ok(_sam.textListe === 0, 'der Kartentext ist eine Zusammenfassung, keine Liste',
   _sam.textListe + ' Karten');
ok(_sam.leer === 0, 'und keine Sammelkarte oeffnet ein leeres Blatt',
   _sam.leer + ' leer');
ok(_sam.unvollstaendig === 0, 'das Blatt zeigt ausnahmslos alle Einzelereignisse',
   _sam.unvollstaendig + ' unvollstaendig');
ok(_sam.markiert === 0, 'kein Einzelereignis wird im Blatt hervorgehoben',
   _sam.markiert + ' markiert');

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
  //
  // Der Fall wird GEBAUT und nicht dem Tag abgelauscht: eine wiederholbare
  // Auszeichnung ist nur beim ersten Mal und an runden Marken Nachricht
  // [§11.0c], und ob an einem beliebigen Stichtag gerade eine seltene
  // faellig ist, hat mit der Buendelungsregel nichts zu tun. Gemessen wird,
  // dass eine seltene Auszeichnung neben zwei Meldungen desselben Moments
  // eine eigene Karte bleibt [§C33].
  const _pid = Object.keys(pmap())[0];
  const _mom = new Date(2026, 7, 26, 17, 5, 0).getTime();
  const _mk = (id, typ, ref, titel, text) => ({id, cat:'badge', ic:'medal',
    title:titel, desc:text, when:_mom, prio:60,
    dataRef:Object.assign({type:typ}, ref)});
  const _rarLauf = [
    _mk('bx1','badge_unlocked', {playerId:_pid, badgeId:'wall_badge',
      badgeName:'Mauer', rarity:'rare', matchId:'mx'}, 'Test: Mauer', 'Eine Zahl: 2.'),
    _mk('bx2','jubilee', {pid:_pid, total:250}, 'Test: 250. Spiel', 'Eine Zahl: 250.'),
    _mk('bx3','milestone_wins', {pid:_pid, milestone:'100'}, 'Test: 100. Sieg', 'Eine Zahl: 100.')
  ];
  _cache._consolFrom = null;
  const _rarRaus = _consolidateStories(_rarLauf.slice());
  const _rarZeilen = [];
  _rarRaus.forEach(x => ((x.dataRef||{}).teile||[]).forEach(z => _rarZeilen.push(z.titel)));
  const selten = _rarLauf.filter(s => (s.dataRef||{}).rarity === 'rare');
  const versteckt = selten.filter(s => _rarZeilen.indexOf(s.title) >= 0).map(s => s.title);
  const zeilenTitel = [];
  sammel.forEach(x => (x.dataRef.teile||[]).forEach(z => zeilenTitel.push(z.titel)));
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
  // Wer an diesem Spieltag gespielt hat. Eine Chronik wechselt auch, weil
  // ANDERE gespielt haben — dann gibt es keine Karte, denn die Schlagzeile
  // waere ein Satz ueber jemanden, der zugesehen hat [§C33].
  const amTag = new Set();
  matches.forEach(m => { if(mts(m) < t0.getTime()) return;
    [m.a1,m.a2,m.b1,m.b2].forEach(p => { if(p) amTag.add(p); }); });
  const aenderungen = Object.keys(jetzt).filter(id => {
    const t = SEASON_TITLE_BY_ID[id], n = jetzt[id], a = vorher[id];
    if(!(t && t.kunst !== 'schatten' && n
      && (!a || a.pids.join(',') !== n.pids.join(',')))) return false;
    const alt = (a && a.pids) || [];
    const neuLeute = n.pids.filter(x => alt.indexOf(x) < 0);
    const wer = (alt.length && neuLeute.length
      && alt.every(x => n.pids.indexOf(x) >= 0)) ? neuLeute : n.pids;
    return wer.some(p => amTag.has(p));
  }).length;
  // Und keine gemeldete Chronik nennt jemanden, der an diesem Tag nicht
  // gespielt hat.
  const ohneEigenePartie = chr.filter(s =>
    !((s.dataRef||{}).playerIds || []).some(p => amTag.has(p))).length;
  const vorPrestige = prestigeTabelle(t0.getTime() - 1).byPid;
  const jetztPrestige = prestigeTabelle(letzte).byPid;
  const gemeldet = {};
  chr.forEach(s => Object.entries((s.dataRef||{}).prestigeDelta || {}).forEach(([pid, x]) => {
    gemeldet[pid] = (gemeldet[pid] || 0) + (Number(x) || 0);
  }));
  const deltaFalsch = Object.keys(gemeldet).filter(pid => gemeldet[pid] !== Math.max(0,
    ((((jetztPrestige[pid]||{}).teile||{}).monat)||0)
    - ((((vorPrestige[pid]||{}).teile||{}).monat)||0)));
  // Persistierte Karten aus älteren Builds besitzen noch kein Delta. Karte
  // und Blatt müssen dann denselben aktuell gezählten Laufbahnbeitrag lesen.
  let altKonsistent = true;
  if(chr.length){
    const alt = Object.assign({}, chr[0], {dataRef:Object.assign({}, chr[0].dataRef)});
    delete alt.dataRef.prestigeDelta;
    const laufbahn = _newsChronikPrestige(alt.dataRef);
    const summe = Object.values(laufbahn.werte).reduce((n,x)=>n+(Number(x)||0),0);
    const karte = _newsTafelWert(alt);
    const kartenwert = Number(String((karte||{}).v||0).replace(',','.')) || 0;
    const blatt = String(_newsDetailBody(alt)||'');
    altKonsistent = laufbahn.modus === 'bestand'
      && Math.abs(kartenwert - Math.round(summe*10)/10) < 1e-9
      && Object.values(laufbahn.werte).every(x => Number(x)>0
        ? blatt.includes(String(x).replace('.',',')+' Prestige · zählt aktuell')
        : blatt.includes('zählt aktuell nicht'));
  }
  return {
    n: chr.length, aenderungen, ohneEigenePartie,
    prio: chr.map(s => s.prio),
    ohneRef: chr.filter(s => !(s.dataRef||{}).titleId
      || !Object.prototype.hasOwnProperty.call((s.dataRef||{}), 'prestigeDelta')).length,
    deltaFalsch, altKonsistent,
    falscheSumme:chr.filter(s => {
      const d=s.dataRef||{};
      return (Number(d.punkte)||0) !== Object.values(d.prestigeDelta||{})
        .reduce((n,x)=>n+(Number(x)||0),0);
    }).length,
    // Eine verdraengte Chronik zeigt GAR KEINEN grossen Wert. Die Karte trug
    // „0 ZUSAETZLICH" im groessten Schriftgrad, und eine Null liest sich dort
    // wie ein Fehler: der Erfolg kann eine legendaere Chronik sein, er zaehlt
    // nur nicht zusaetzlich, weil je Monat ein Eintrag in der Tafel steht
    // [§C32]. Den Grund nennt der Satz mit Namen.
    nullAlsPlus:chr.filter(s => {
      const d=s.dataRef||{}, plus=Object.values(d.prestigeDelta||{}).some(x=>Number(x)>0);
      return !plus && !!_newsTafelWert(s);
    }).length,
    // playerIds sind die GENANNTEN, nicht jeder Mithalter: wer schon
    // Halter war, hat an diesem Tag nichts getan, und die Tafel-Sammelkarte
    // schrieb ihn sonst in ihre Schlagzeile („Julian und Martin bewegen die
    // Ewige Tafel" ueber zwei Zeilen, die beide von Martin erzaehlen).
    // Beim Dazukommen sind das die Neuen, sonst alle Halter [§C33].
    gekuerzt:chr.filter(s => {
      const d=s.dataRef||{}, h=jetzt[d.titleId];
      if(!h) return false;
      const soll = d.chronWie === 'dazu'
        ? (h.pids||[]).filter(p => (d.vorher||[]).indexOf(p) < 0)
        : (h.pids||[]);
      return (d.playerIds||[]).length !== soll.length;
    }).length,
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
// ── Eine gemeldete Chronik steht auch in der Tafel ──────────────────
//    `seasonTitles` zieht die Grenze CHRONIK_MIN_TAGE [§C32],
//    `seasonTitleHalter` zog sie nicht — und damit meldete der Feed
//    Chroniken, die es nicht gab: gemessen nannte die Funktion am 04.08.
//    acht, am 06.08. zehn und am 07.08. dreizehn Halter, waehrend die
//    Monatstafel null Eintraege zeigte. „Leon holt ‚Auf Augenhoehe'" stand
//    im Feed, im Chronik-Tab stand nichts.
const _gate = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = {};
  matches.forEach(m => {
    const d = new Date(mts(m));
    const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    (tage[k] = tage[k] || new Set()).add(d.toISOString().slice(0,10));
  });
  const schnitte = [];
  Object.keys(tage).forEach(sid => {
    const liste = [...tage[sid]].sort();
    // Je Monat ein Schnitt hinter jedem der ersten acht Spieltage: die
    // Grenze liegt bei fuenf, also muss sie dabei sein.
    liste.slice(0, 8).forEach(tag => {
      const bis = new Date(tag + 'T23:59:59').getTime();
      schnitte.push({sid, tag, bis});
    });
  });
  const falscheGrenze = [], ohneEintrag = [];
  schnitte.forEach(x => {
    let H = null, T = null;
    try { H = seasonTitleHalter(x.sid, x.bis); T = seasonTitles(x.sid, x.bis); } catch(e){ return; }
    if(!T) return;
    const gesperrt = T.days < CHRONIK_MIN_TAGE;
    if(gesperrt !== (H === null)) falscheGrenze.push(x.sid + '/' + x.tag
      + ' Tage=' + T.days + ' halter=' + (H === null ? 'null' : Object.keys(H).length));
    if(H) Object.keys(H).forEach(id => {
      if(!T.awarded.some(a => a.titleId === id)) ohneEintrag.push(x.sid + '/' + x.tag + '/' + id);
    });
  });
  return {n:schnitte.length, falscheGrenze:falscheGrenze.slice(0,4),
          ohneEintrag:ohneEintrag.slice(0,4), nOhne:ohneEintrag.length};
})())`));
ok(_gate.n > 20, 'die Grenze wird an vielen Zeitschnitten geprueft', _gate.n + ' Schnitte');
ok(_gate.falscheGrenze.length === 0,
   'Halterstand und Monatstafel ziehen dieselbe Grenze',
   _gate.falscheGrenze.join(' | '));
ok(_gate.nOhne === 0, 'keine gemeldete Chronik fehlt in der Monatstafel',
   _gate.ohneEintrag.join(' | ') || _gate.nOhne + ' ohne Eintrag');

// ── Die Zeile einer Sammelkarte ist kuerzer als die Karte ───────────
//    Im Blatt eines Tafel-Moments stand jede Zeile mit dem vollen
//    Kartentext: gemessen bis zu 183 Zeichen und vier Saetze, neunmal
//    untereinander. Fuenf der neun erklaerten dabei, warum sich NICHTS
//    aendert — die Bauanleitung des Feeds, nicht die Nachricht [§C33].
const _zeil = JSON.parse(K.eval(`JSON.stringify((function(){
  // Ueber jeden vierten Spieltag, nicht nur ueber heute: die Zeilen, die die
  // Prestige-Mechanik erklaerten, gehoeren zu einer VERDRAENGTEN Chronik, und
  // an einem einzelnen Tag steht davon keine im Buendel. Gemessen trug der
  // 10.08. drei davon („In der Chronik bleibt ‚Der makellose Tag' staerker").
  const alleMatches = matches.slice();
  const alleTage = [...new Set(alleMatches.map(m => tagKey(mts(m))))].sort();
  const zeilen = [];
  alleTage.filter((_, i) => i % 4 === 0 || i >= alleTage.length - 3).forEach(k => {
    const grenze = Math.max(...alleMatches.filter(m => tagKey(mts(m)) === k).map(mts));
    matches = alleMatches.filter(m => mts(m) <= grenze);
    invalidateCache();
    let st = [];
    try { st = _consolidateStories(_buildStories()); } catch(e){}
    st.filter(s => (s.dataRef||{}).type === 'sammel' && s.dataRef.quelle === 'tafel')
      .forEach(s => (s.dataRef.teile || []).forEach(t => zeilen.push(t)));
  });
  matches = alleMatches;
  invalidateCache();
  // Gemessen wird in SAETZEN und in Zeichen: ein langer Beleg mit zwei
  // Anteilen und seinem Nenner traegt allein 113 Zeichen und ist trotzdem ein
  // Satz, drei kurze Saetze passen in 100. Der volle Kartentext hatte vier
  // Saetze und bis zu 183 Zeichen — das ist ein Absatz.
  const saetze = x => String(x||'').split(/(?<=\\.)\\s+/).filter(Boolean).length;
  const lang = zeilen.filter(t => saetze(t.text) > 3 || String(t.text||'').length > 130);
  // Gemeint sind die drei Saetze, die die Prestige-Mechanik erklaeren: „In
  // der Chronik bleibt ‚X' staerker, also kommt fuer die Laufbahn kein
  // Prestige hinzu", „Fuer die Laufbahn kommt durch diesen Wechsel kein
  // Prestige hinzu" und „Die Halterlage aendert sich, der Prestige-Stand
  // nicht". Das blanke „staerker" traf daneben jeden Beleg, der das Wort
  // enthaelt: „Der Rückenwind" nennt „+4 Punkte staerkere Mitspieler als
  // sonst" und ist damit dreimal als Mechanik-Erklaerung gezaehlt worden.
  const mechanik = zeilen.filter(t => /In der Chronik bleibt|kein Prestige|Prestige-Stand/.test(String(t.text||'')));
  return {n:zeilen.length, max:Math.max(0, ...zeilen.map(t => String(t.text||'').length)),
          lang:lang.map(t => t.titel + ' (' + saetze(t.text) + ' Saetze, '
            + String(t.text).length + ' Zeichen)').slice(0,3),
          mechanik:mechanik.map(t => t.titel).slice(0,3), nM:mechanik.length};
})())`));
ok(_zeil.n > 40, 'die Tafel-Sammelkarten tragen viele Zeilen', _zeil.n + ' Zeilen');
ok(_zeil.lang.length === 0, 'keine Zeile einer Sammelkarte wird zum Absatz',
   _zeil.lang.join(' | ') || 'laengste ' + _zeil.max + ' Zeichen');
ok(_zeil.nM === 0, 'keine Zeile erklaert die Prestige-Mechanik',
   _zeil.mechanik.join(' | ') || _zeil.nM + ' Zeilen');

ok(_chrg.stand.jetzt > 0, 'der Halterstand des laufenden Monats ist zu lesen',
   _chrg.stand.jetzt + ' Chroniken');
ok(_chrg.stabil, 'derselbe Zeitpunkt ergibt denselben Halterstand');
ok(_chrg.stand.vorher !== _chrg.stand.jetzt || _chrg.n > 0,
   'der Zeitschnitt schneidet wirklich',
   'vorher ' + _chrg.stand.vorher + ', heute ' + _chrg.stand.jetzt);
ok(_chrg.n > 0, 'eine Chronik im laufenden Monat wird gemeldet', _chrg.n + ' Karten');
ok(_chrg.n === _chrg.aenderungen,
   'Chronik-Wechsel werden vor dem Buendeln nicht abgeschnitten',
   _chrg.n + ' von ' + _chrg.aenderungen);
ok(_chrg.deltaFalsch.length === 0 && _chrg.falscheSumme === 0,
   'Chronik-Stories zeigen exakt den echten neuen Monatsbeitrag',
   _chrg.deltaFalsch.join(', ') || _chrg.falscheSumme + ' falsche Summen');
ok(_chrg.nullAlsPlus === 0,
   'eine verdraengte Chronik behauptet kein zusaetzliches Prestige',
   _chrg.nullAlsPlus + ' falsche Karten');
ok(_chrg.altKonsistent,
   'auch alte Chronik-Stories zeigen in Karte und Blatt denselben aktuellen Beitrag');
// Gemessen wird die ORDNUNG, nicht die Zahl. Als hier `p === 80` stand,
// haette die Zusicherung eine verschobene Skala fuer einen Fehler gehalten
// und eine vertauschte Reihenfolge durchgelassen — genau andersherum als
// gemeint [§C33].
const _chronOrd = JSON.parse(K.eval('JSON.stringify({rek:STORY_PRIO.rekord_geholt,'
  + ' chr:STORY_PRIO.chronik_geholt, ins:STORY_PRIO.insignium_stufe})'));
ok(_chronOrd.rek > _chronOrd.chr && _chronOrd.chr > _chronOrd.ins,
   'die Chronik-Karte liegt zwischen Liga-Rekord und Insignium-Stufe',
   _chronOrd.rek + ' > ' + _chronOrd.chr + ' > ' + _chronOrd.ins);
ok(_chrg.prio.every(p => p === _chronOrd.chr),
   'und jede gemeldete Chronik traegt genau diesen Rang',
   _chrg.prio.join(','));
ok(_chrg.ohneRef === 0, 'jede Chronik-Karte kennt ihre Wertung und ihr Prestige',
   _chrg.ohneRef + ' ohne');
ok(_chrg.ohnePids === 0, 'jede Chronik-Karte weiss, von wem sie handelt',
   _chrg.ohnePids + ' ohne');
ok(_chrg.gekuerzt === 0, 'eine geteilte Chronik behaelt alle Halter',
   _chrg.gekuerzt + ' gekuerzte Karten');
ok(_chrg.schatten === 0, 'Schattenseiten meldet der Feed nicht', _chrg.schatten + ' gemeldet');
ok(_chrg.leer === 0, 'jede Chronik-Karte oeffnet ein Blatt mit Inhalt', _chrg.leer + ' leer');
ok(_chrg.wert.every(l => ['Prestige','je Spieler','zusammen','—'].includes(l)),
   'der grosse Wert der Chronik-Karte nennt nur den echten Prestige-Beitrag',
   _chrg.wert.join(','));
ok(_chrg.ohneEigenePartie === 0,
   'keine Chronik-Karte nennt jemanden ohne Partie an diesem Tag',
   _chrg.ohneEigenePartie + ' Karten');
// Gebaut, weil es sich an den echten Partien nicht messen laesst: beide
// gemeldeten Chroniken halten dort ein Plus. Eine verdraengte Chronik zeigte
// „0 ZUSAETZLICH" im groessten Schriftgrad der Karte, und eine Null liest
// sich dort wie ein Fehler — der Erfolg kann eine legendaere Chronik sein,
// er zaehlt nur nicht zusaetzlich, weil je Monat ein Eintrag in der Tafel
// steht [§C32].
const _nullwert = JSON.parse(K.eval(`JSON.stringify((function(){
  const pid = players[0].id;
  const bau = (delta, zeigt) => ({id:'chr0', cat:'tafel', ic:'scroll',
    when:new Date(), title:'Eine Chronik', desc:'Ein Satz mit 1 Zahl.',
    dataRef:{type:'chronik_geholt', titleId:'x', sid:currentSeason().id,
             playerIds:[pid], prestigeDelta:{[pid]: delta}, punkte:delta,
             grundwert:120, zeigt}});
  const ohne = _newsTafelWert(bau(0, false));
  const mit = _newsTafelWert(bau(35, true));
  return {ohne: ohne ? ohne.v + '|' + ohne.l : null,
          mit: mit ? mit.v + '|' + mit.l : null};
})())`));
ok(_nullwert.ohne === null,
   'eine verdraengte Chronik zeigt gar keinen grossen Wert',
   String(_nullwert.ohne));
ok(_nullwert.mit === '+35|Prestige', 'und eine mit Zuwachs nennt ihn',
   String(_nullwert.mit));

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
    // Was nicht die Schlagzeile der Karte SELBST ist, steht als Zeile auf
    // der Karte — jede, ohne Deckel. Ausgelassen wurde zusaetzlich der
    // Titel des KOPFS, und bei einer Tafel-Karte sind das zwei
    // verschiedene Saetze: ueber „Henry, Johannes und zwei weitere bewegen
    // die Ewige Tafel" stand Henrys Beleg als Text, und Henry selbst kam
    // auf seiner eigenen Karte namentlich nicht vor. Der Text ist der
    // BELEG des staerksten Ereignisses, nicht seine Schlagzeile.
    // Eine Tafel-Karte darf deshalb auch mehr als vier Zeilen tragen. „Und 1
    // weitere" versteckte zuvor genau eine Meldung, nur um eine Zeile zu
    // sparen. Buendeln darf nichts verstecken [§C33].
    const rest = (x.dataRef.teile||[])
      .filter(t => t.titel !== x.title).length;
    if(rest !== n) ohneBand++;
  });
  return {n: sammel.length, ohneBand, zeilen,
    floskeln:sammel.filter(x=>/Einzelheiten|Alle Belege|eigenständige|zusammengehörige Ereignisse|Ereignisse in einem Moment/i
      .test((x.title||'')+' '+(x.desc||''))).map(x=>x.title)};
})())`));
ok(_band.zeilen > 0, 'die Sammelkarte traegt ihr Band', _band.zeilen + ' Zeilen');
ok(_band.ohneBand === 0, 'jede gebuendelte Meldung steht auf der Karte, nicht nur im Blatt',
   _band.ohneBand + ' Karten ohne');
ok(_band.floskeln.length === 0,
   'Sammelstories verzichten auf technische Erklaerfloskeln',
   _band.floskeln.join(' | ') || 'alle Texte redaktionell');

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
      mehr:(h.match(/nf-face-mehr">\\+(\\d+)/) || [])[1] || '',
      // Der Fuss der Spieler-Karte: die exakte Zahl steht dort kompakt.
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
    f: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]),
                  ins('i4',ids[3]), ins('i5',ids[4])])),
    // (d) Der Erfolg gewinnt: wer die Stufe teilt UND einen Rekord holt,
    //     steht mit der Stufe auf der gemeinsamen Karte. Sonst stuende der
    //     Schildring auf zwei Karten [§C33].
    d: zeig(lauf([ins('i1',ids[0]), ins('i2',ids[1]), ins('i3',ids[2]),
                  rek('r9','switcher',ids[2])])),
    g: zeig(lauf([
      st('ls','loss_streak',{pid:ids[0],playerIds:[ids[0]]},55,
        nm(ids[0]) + ' sucht den Ausweg','Fünf Pleiten in Folge.'),
      st('tl','team_loss_streak',{playerIds:[ids[0],ids[1]]},54,
        nm(ids[0]) + ' und ' + nm(ids[1]) + ' stecken fest','Gemeinsam ohne Sieg.')
    ])),
    // (e) einer allein bleibt eine eigene Karte
    e: zeig(lauf([rek('r1','unstoppable',ids[0])])),
    n0: (players[0]||{}).name, n1: (players[1]||{}).name, n2: (players[2]||{}).name
  };
})())`));
ok(_achsen.a.length === 1 && _achsen.a[0].q === 'tafel',
   'zwei Tafel-Erfolge eines Spielers im selben Moment werden EINE Tafel-Karte',
   _achsen.a.length + ' Karten');
ok(_achsen.a[0] && _achsen.a[0].ti === _achsen.n0 + ' bewegt die Ewige Tafel',
   'die Schlagzeile nennt den Spieler und den gemeinsamen Ort',
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
ok(_achsen.c.length === 1 && _achsen.c[0].q === 'tafel',
   'dieselbe Tafel-Stufe fuer drei Spieler wird EINE Karte', _achsen.c.length + ' Karten');
ok(_achsen.c[0] && _achsen.c[0].ti
   === _achsen.n0 + ', ' + _achsen.n1 + ' und ' + _achsen.n2 + ' bewegen die Ewige Tafel',
   'die Schlagzeile nennt alle drei und verbindet den Tafel-Moment', (_achsen.c[0]||{}).ti);
ok(_achsen.c[0] && /^Ein Moment, drei Spuren:/.test(_achsen.c[0].tx),
   'ihr Satz verbindet die drei Tafel-Spuren lebendig', (_achsen.c[0]||{}).tx);
ok(_achsen.f.length === 1 && _achsen.f[0].n === 5 && _achsen.f[0].band === 5
   && _achsen.f[0].pids === 5 && _achsen.f[0].mehr === '3',
   'auch ein grosses Buendel zeigt alle Ereignisse und zaehlt alle Gesichter korrekt',
   (_achsen.f[0]||{}).band + ' Zeilen, ' + (_achsen.f[0]||{}).pids
     + ' Spieler, +' + (_achsen.f[0]||{}).mehr);
ok(_achsen.d.length === 1 && _achsen.d[0].q === 'tafel' && _achsen.d[0].n === 4,
   'derselbe Tafel-Moment fuehrt Stufen und Rekord vollstaendig zusammen',
   _achsen.d.map(x => x.q + ':' + x.n).join(', '));
ok(_achsen.e.length === 0, 'ein einzelner Erfolg bleibt eine eigene Karte',
   _achsen.e.length + ' Sammelkarten');
ok(_achsen.g[0] && _achsen.g[0].ti
   === 'Ein Spiel, zwei Geschichten für ' + _achsen.n0 + ' und ' + _achsen.n1,
   'verknuepfte Spielstories bekommen eine natuerliche gemeinsame Schlagzeile',
   (_achsen.g[0]||{}).ti);
ok(_achsen.g[0] && /nach dem Schlusspfiff|Schlusspfiff doppelt/.test(_achsen.g[0].tx),
   'ihr Teaser erzaehlt die Verbindung statt die Kartenstruktur',
   (_achsen.g[0]||{}).tx);
ok(_achsen.b[0] && _achsen.b[0].sorte === 'spieler' && _achsen.c[0].sorte === 'tafel'
   && _achsen.b[0].rub !== _achsen.c[0].rub,
   'Spieler-Moment und Tafel-Moment tragen eigene Form und Rubrik',
   (_achsen.b[0]||{}).rub + ' / ' + (_achsen.c[0]||{}).rub);
ok(_achsen.b[0] && _achsen.b[0].pids === 1 && _achsen.c[0].pids === 3,
   'die Spieler-Karte zeigt ein Gesicht, die Tafel-Karte alle',
   (_achsen.b[0]||{}).pids + ' / ' + (_achsen.c[0]||{}).pids);
ok(_achsen.b[0] && _achsen.b[0].fuss === '3',
   'die Zahl der Erfolge steht im Fuss der Spieler-Karte, nicht im Satz',
   '„' + (_achsen.b[0]||{}).fuss + '"');
// Und die Zeilen wiederholen nicht, was oben steht [§C33].
ok(_achsen.b[0] && _achsen.b[0].zeilen.every(z => z.indexOf(_achsen.n0) !== 0),
   'auf der Spieler-Karte faellt der Name vor jeder Zeile weg',
   (_achsen.b[0]||{}).zeilen.join(' | '));
ok(_achsen.c[0] && new Set(_achsen.c[0].zeilen).size === 3
   && [_achsen.n0,_achsen.n1,_achsen.n2].every(n=>_achsen.c[0].zeilen.some(z=>z.indexOf(n)===0)),
   'auf der Tafel-Karte bleibt jeder beteiligte Traeger als eigene Zeile lesbar',
   (_achsen.c[0]||{}).zeilen.join(' | '));

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

// ── Zwei gleich starke Redaktionshälften ────────────────────────────
// Eine Momentaufnahme des Generators unterschlaegt fast alle Tafelmeldungen:
// sie entstehen am jeweiligen Spieltag und leben danach aus der Persistenz.
// Deshalb wird der echte Vierzehn-Tage-Ablauf Tag fuer Tag nachgespielt und
// jede erstmals gebildete ID wie in der Datenbank behalten. Sammelkarten
// zaehlen nach ihren sichtbaren Zeilen — drei Ereignisse in einer Karte sind
// redaktionell weiterhin drei Geschichten.
const _mix = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle=matches.slice(), AlteDate=Date, alteStories=_cache._stories;
  const bestand=new Map(), ende=new AlteDate('2026-08-27T21:59:59Z').getTime();
  let aus=null;
  try {
    for(let tage=20; tage>=0; tage--){
      const jetzt=ende-tage*86400000;
      Date=class extends AlteDate {
        constructor(...a){ if(a.length) super(...a); else super(jetzt); }
        static now(){ return jetzt; }
      };
      matches=alle.filter(m=>mts(m)<=jetzt);
      invalidateCache(); _cache._stories=[...bestand.values()];
      (_buildStories()||[]).forEach(s=>{ if(!bestand.has(s.id)) bestand.set(s.id,s); });
    }
    matches=alle; invalidateCache();
    const roh=[...bestand.values()]
      .filter(s=>new Date(s.when).getTime()>=ende-NEWS_FENSTER_TAGE*86400000);
    _cache._stories=roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
    _cache._consolFrom=null; _cache._frischVon=null;
    const sicht=getStoriesCache();
    const istTafel=s=>s.cat==='tafel'||(s.dataRef||{}).quelle==='tafel';
    const tafel=sicht.filter(istTafel), rest=sicht.filter(s=>!istTafel(s));
    const fun=rest.filter(s=>(s.dataRef||{}).type==='ambient');
    const spiel=rest.filter(s=>{const d=s.dataRef||{}; return d.type!=='ambient' &&
      !!(d.matchId||d.type==='potd'||d.type==='woche'||
         (d.type==='sammel'&&d.quelle==='spiel'));});
    const gewicht=s=>(s.dataRef||{}).type==='sammel'
      ? Math.max(1,((s.dataRef||{}).teile||[]).length) : 1;
    const tw=tafel.reduce((n,s)=>n+gewicht(s),0);
    const sw=spiel.reduce((n,s)=>n+gewicht(s),0);
    const zaehlTypen = liste => liste.reduce((o,s)=>{ const d=s.dataRef||{};
      const k=d.type==='sammel' ? 'sammel:'+d.quelle : d.type;
      o[k]=(o[k]||0)+gewicht(s); return o; },{});
    const tage=[...new Set(sicht.map(s=>tagKey(s.when)))].filter(k=>_newsTagMs(k).length);
    // Wuerdig ist, was das Band tragen darf — dieselbe Frage und dieselbe
    // Liste wie in der App [§C27]. Vorher stand sie hier ein zweites Mal.
    const karten=tage.map(k=>{
      const items=sicht.filter(s=>tagKey(s.when)===k);
      const id=_newsTagKarte(items,k), karte=items.find(s=>s.id===id);
      const kandidaten=items.filter(_newsTagKarteWuerdig);
      const max=kandidaten.length?Math.max.apply(null,kandidaten.map(_newsTagSpannung)):0;
      return {id,type:karte&&(karte.dataRef||{}).type,
        score:karte?_newsTagSpannung(karte):0,max,kand:kandidaten.length};
    });
    aus={tafel:tw,spiel:sw,fun:fun.length,quote:tw/(tw+sw+fun.length),
      tafelKarten:tafel.length,spielKarten:spiel.length,
      kartenQuote:tafel.length/(tafel.length+spiel.length+fun.length),
      tafelTypen:zaehlTypen(tafel),spielTypen:zaehlTypen(spiel),
      // Ein Tag, an dem nur Breaking, der Spieler des Tages und Rueckblicke
      // stehen, hat kein Band — und das ist richtig, nicht falsch.
      karten, falsch:karten.filter(x=>x.kand
        ? (!x.id||Math.abs(x.score-x.max)>1e-8) : !!x.id).length,
      ohneBand:karten.filter(x=>!x.id).length,
      bandUnwuerdig:karten.filter(x=>x.type
        && !_newsTagKarteWuerdig({dataRef:{type:x.type}})).length};
  } finally {
    matches=alle; Date=AlteDate; invalidateCache(); _cache._stories=alteStories;
    _cache._consolFrom=null; _cache._frischVon=null;
  }
  return aus;
})())`));
ok(_mix.quote >= .35 && _mix.quote <= .55,
   'mehr Spieltag bleibt mit Tafel und Fun Facts ausgewogen',
   `${_mix.tafel} zu ${_mix.spiel}+${_mix.fun} · ${Math.round(_mix.quote*100)} % Tafel; `
   + `${_mix.tafelKarten} zu ${_mix.spielKarten}+${_mix.fun} Karten · ${Math.round(_mix.kartenQuote*100)} %; `
   + JSON.stringify({tafel:_mix.tafelTypen,spiel:_mix.spielTypen}));
ok(_mix.fun > 0,
   'die Gegenhaelfte enthaelt automatisch erzeugte Fun Facts',
   _mix.fun + ' Fun Facts');
ok(_mix.karten.length >= 5 && _mix.falsch === 0
   && _mix.karten.every(x=>!x.id || x.score>=620),
   'jede echte Karte des Tages ist die spannendste wuerdige Geschichte ihres Spieltags',
   _mix.karten.map(x=>(x.type||'ohne Band')+':'+Math.round(x.score)).join(' · '));
ok(_mix.bandUnwuerdig === 0,
   'kein Band gehoert Breaking, dem Spieler des Tages oder einem Rueckblick',
   _mix.karten.map(x=>x.type||'ohne Band').join(', ')
   + ' · ' + _mix.ohneBand + ' Tage ohne Band');

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
  const bedingungen = [];
  // Jeder offene Schritt jedes Spielers, damit die Regeln nicht am
  // einen Fall haengen, den die Karte gerade zufaellig zieht.
  const alle = [];
  players.forEach(p => prestigeSchritte(p.id, 99).forEach(s => {
    alle.push(s);
    if(s.cond) bedingungen.push(s.cond);
  }));
  // Der Katalog schreibt negativ, die abgeleitete Rekordliste neg. Die
  // Zusicherung fragt beide Felder ab, sonst prueft sie am falschen Namen
  // vorbei und ist immer gruen.
  const neg = alle.filter(s => {
    const d = (s.art === 'monat' ? DISZIPLINEN : CHRONICLES).find(x => x.id === s.id);
    return d && (d.art === 'schatten' || d.negativ === true || d.neg === true);
  }).map(s => s.art + '/' + s.id);
  // Der eigene Stand: ohne ihn sagt die Karte nicht, wie weit es noch ist.
  const ohneStand = alle.filter(s => s.art === 'rekord' && s.stand && !s.mein).length;
  // Und ein Verb je Halterzahl.
  const karten = [];
  players.forEach(p => {
    const st = prestigeSchritte(p.id, 1);
    if(!st.length) return;
    const kk = v.make(() => (players.indexOf(p) + 0.5) / players.length);
    if(kk) karten.push(kk.desc || '');
  });
  // Gemessen wird an ALLEN Schritten, nicht an der einen Karte, die der
  // Wuerfel gerade zieht: ein Rekord mit mehreren Haltern kommt in den
  // zwoelf gezogenen Karten nicht zwangslaeufig vor.
  const viele = alle.filter(x => (x.halterN || 0) > 1);
  return {t:k.title, d:k.desc, passt:bedingungen.some(c => k.desc.indexOf(c) >= 0),
          neg, ohneStand, n:alle.length,
          vieleN:viele.length,
          amp:alle.filter(x => /&/.test(String(x.halter) + String(x.txt))).length,
          verb:viele.filter(x => / hält /.test(String(x.txt))).map(x => x.txt),
          steht:karten.filter(t => / steht bei /.test(t)).length, k:karten.length};
})())`));
ok(!_ziel.fehlt && !_ziel.leer, 'die Karte zum naechsten Rekord entsteht', JSON.stringify(_ziel));
ok(!/am nächsten/.test(_ziel.t || ''), 'ihre Schlagzeile sagt nicht nur, wer am naechsten liegt',
   _ziel.t);
ok(_ziel.passt,
   'und ihr Text nennt die Bedingung aus dem Katalog', (_ziel.d || '').slice(0, 90));
ok(/Prestige/.test(_ziel.d || ''), 'samt dem, was der Rekord einbringt', (_ziel.d || '').slice(0, 90));

// ── Ein Ziel, das niemand haben will, ist kein Ziel ─────────────────
// „Alex kann ‚Die bitterste Pleite' holen" stand im Feed: die hoechste
// Siegchance, mit der je jemand verlor, als Aufgabe. Gefiltert war nur die
// Schattenseite, nicht die negative Fuegung — `nextRecordFor` kennt die
// Regel seit jeher [§C25].
ok(_ziel.neg.length === 0, 'kein negativer Eintrag wird als Ziel vorgeschlagen',
   _ziel.neg.join(', ') || 'keiner');
// ── Und die Karte nennt den eigenen Stand ───────────────────────────
// Sie sagte die Schwelle und den Bestwert des Halters. „Martin haelt den
// Bestwert mit 84 %" ist ohne die eigenen 71 % keine Auskunft darueber, wie
// weit es noch ist.
ok(_ziel.n > 0, 'es gibt offene Schritte zu messen', String(_ziel.n));
ok(_ziel.ohneStand === 0, 'jeder offene Rekord kennt den eigenen Stand',
   String(_ziel.ohneStand));
ok(_ziel.k > 0 && _ziel.steht > 0, 'und die Karte schreibt ihn hin',
   _ziel.steht + ' von ' + _ziel.k);
// ── „&" gehoert in eine Zelle, nicht in einen Satz ──────────────────
// `_chronHolderNames` ist die Form fuer die schmale Zelle des
// Rekorde-Reiters. Im Fliesstext stand damit „Martin & Julian haelt den
// Bestwert mit 84 %": das Zeichen als einziges im Satz, und das Verb im
// Singular ueber zwei Leute [§C33].
ok(_ziel.vieleN > 0, 'es gibt Rekorde mit mehreren Haltern', String(_ziel.vieleN));
ok(_ziel.amp === 0, 'kein Kaufmanns-Und in einem Prestige-Satz', String(_ziel.amp));
ok(_ziel.verb.length === 0, 'zwei Halter halten, nicht haelt',
   _ziel.verb[0] || 'keiner');

// ── Jede Ambient-Karte traegt einen Wert, mit dem man etwas anfangen
// kann ──────────────────────────────────────────────────────────────
// Sie stehen an vierzig Stellen und wurden nie zusammen gemessen, also
// ging jede einzeln kaputt: „vor -1 Tagen" (der Fun Fact von 10 Uhr sah
// eine Auszeichnung aus der Partie um 11:39), „7 traegt den Schildring",
// „Im Schnitt fallen 6.9 Tore" mit englischem Punkt, „1 Platz" als Anzahl
// statt als Rang und ein leerer Wertblock. Der Deckel ist deshalb ein
// Rundlauf ueber ALLE Vorlagen: eine neue Karte ist gerade die, an die
// niemand denkt.
const _amb = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const raus = { ohneWert:[], punkt:[], minus:[], amp:[], verb:[] };
  // Mehrere Zeitpunkte und mehrere Wuerfel, damit jede Vorlage auch die
  // Zweige trifft, die von der Uhrzeit oder vom gezogenen Spieler haengen.
  // Dazu der Vormittag jedes Spieltags der letzten Wochen: der Fun Fact von
  // 10 Uhr entsteht VOR der ersten Partie, sah aber die ganze Liste und
  // rechnete damit „vor -1 Tagen". Nur mit dem heutigen Zeitpunkt ist
  // dieser Zweig nie zu treffen.
  const morgen = [...new Set(matches.map(m => String(m.created_at).slice(0, 10)))]
    .sort().slice(-25).map(d => new Date(d + 'T08:00:00'));
  [new Date(), new Date(Date.now() - 36e5 * 9)].concat(morgen).forEach(t0 => {
    const T = _ambientTemplatePool(t0, pm, nameOf);
    T.forEach(v => {
      for(let i = 0; i < 12; i++){
        let k = null;
        try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
        if(!k) continue;
        const txt = String(k.title || '') + ' | ' + String(k.desc || '');
        // Der grosse Block der Karte darf nicht leer bleiben.
        if(k.vv === undefined || k.vv === null || String(k.vv) === '')
          raus.ohneWert.push(v.key);
        // Eine Dezimalzahl traegt hier ein Komma [§C27].
        if(/\\d\\.\\d/.test(txt.replace(/\\d{1,2}\\.\\d{1,2}\\./g, '')))
          raus.punkt.push(v.key + ': ' + txt.slice(0, 60));
        // Keine negative Anzahl: „vor -1 Tagen", „-2 Siege".
        if(/(^|[^\\d.,])-\\s?\\d/.test(txt)) raus.minus.push(v.key + ': ' + txt.slice(0, 60));
        // „&" gehoert in eine Tabellenzelle, nicht in einen Satz.
        if(/&/.test(txt)) raus.amp.push(v.key);
        // Eine Zahl ueber eins bekommt das Verb im Plural.
        if(/\\b([2-9]|\\d\\d+) (trägt|hält|liegt|steht|gewinnt|verliert|holt|ist)\\b/.test(txt))
          raus.verb.push(v.key + ': ' + txt.slice(0, 60));
      }
    });
  });
  const T0 = _ambientTemplatePool(new Date(), pm, nameOf);
  const einzig = {}; T0.forEach(v => { einzig[v.key] = (einzig[v.key] || 0) + 1; });
  return { n:T0.length, raus,
           doppelt:Object.keys(einzig).filter(k => einzig[k] > 1) };
})())`));
ok(_amb.n >= 30, 'der Rundlauf sieht alle Vorlagen', String(_amb.n));

// ── Der grosse Wert ist eine Zahl der Karte, keine Konstante ────────
// „1" mit der Aufschrift „Rekordhalter" stand im Block des Chronik-
// Rampenlichts: das gilt fuer jeden Rekord, sagt damit nichts, und die
// Aufschrift beschrieb den TRAeGER statt die Zahl. Gemessen trug die
// Vorlage 25 verschiedene Titel und immer denselben Wert.
//
// Geprueft wird das Muster und nicht der eine Fall: wechselt der Titel
// einer Vorlage, muss der Wert mitwechseln. Ein Fun Fact ueber die ganze
// Liga („7499 Tore in 466 Partien") behaelt beides und faellt nicht
// darunter; von den sechsunddreissig Vorlagen traf es genau diese eine.
const _konst = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap(); const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const s = {};
  const morgen = [...new Set(matches.map(m => String(m.created_at).slice(0, 10)))]
    .sort().slice(-25).map(d => new Date(d + 'T08:00:00'));
  [new Date(), new Date(Date.now() - 36e5 * 9)].concat(morgen).forEach(t0 => {
    _ambientTemplatePool(t0, pm, nameOf).forEach(v => {
      for(let i = 0; i < 12; i++){
        let k = null;
        try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
        if(!k) continue;
        const e = s[v.key] || (s[v.key] = {t:{}, w:{}});
        e.t[String(k.title || '')] = 1; e.w[String(k.vv)] = 1;
      }
    });
  });
  return Object.keys(s).filter(k => Object.keys(s[k].t).length > 1
                                 && Object.keys(s[k].w).length === 1)
    .map(k => k + ' (' + Object.keys(s[k].t).length + ' Titel, Wert „'
      + Object.keys(s[k].w)[0] + '")');
})())`));
ok(_konst.length === 0, 'kein grosser Wert bleibt konstant, waehrend der Titel wechselt',
   _konst.join(' · ') || 'alle ' + _amb.n + ' Vorlagen');

// Und der Feed meldet keine Schattenseite [§C35]. Das Rampenlicht rotierte
// ueber ALLE vergebenen Rekorde, zwoelf davon negativ, und die Rotation
// haengt am Kalendertag: an jedem fuenften Tag stand „Alex haelt ‚Das
// Scheunentor'" als Fun Fact im Feed.
const _schand = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const neg = {};
  CHRONICLES.forEach(d => { if(d.neg) neg[d.name] = 1; });
  // Die Auswahl haengt am KALENDERTAG (\`day % recs.length\`), also trifft nur
  // ein voller Umlauf jeden Eintrag des Topfes. Achtzig Tage reichen dafuer:
  // der Topf ist kleiner. Gemessen wird die Karte selbst und nicht der Topf
  // mit derselben Bedingung noch einmal — das waere ein Test, der nie rot
  // werden kann.
  const getroffen = {}, raus = {};
  for(let t = 0; t < 80; t++){
    const t0 = new Date(Date.now() - t * 86400000);
    const v = _ambientTemplatePool(t0, pm, nameOf)
      .find(x => x.key === 'chronicle_spotlight');
    if(!v) return ['die Vorlage gibt es nicht mehr'];
    let k = null;
    try { k = v.make(() => 0.5); } catch(e){ continue; }
    if(!k) continue;
    Object.keys(neg).forEach(n => {
      if(String(k.title || '').indexOf('„' + n + '"') >= 0) raus[n] = 1; });
    const m = String(k.title || '').match(/„([^"]+)"/);
    if(m) getroffen[m[1]] = 1;
  }
  const liste = Object.keys(raus);
  return liste.length ? liste : (Object.keys(getroffen).length < 5
    ? ['der Umlauf traf nur ' + Object.keys(getroffen).length + ' Eintraege'] : []);
})())`));
ok(_schand.length === 0, 'das Chronik-Rampenlicht zeigt keine Schattenseite',
   _schand.join(', ') || 'achtzig Tage nachgespielt, kein negativer Eintrag');
ok(_amb.doppelt.length === 0, 'jede Vorlage hat ihren eigenen Schluessel',
   _amb.doppelt.join(', ') || 'keine');
ok(_amb.raus.ohneWert.length === 0, 'keine Ambient-Karte ohne grossen Wert',
   [...new Set(_amb.raus.ohneWert)].join(', ') || 'keine');
ok(_amb.raus.punkt.length === 0, 'jede Dezimalzahl traegt ein Komma',
   _amb.raus.punkt[0] || 'keine');
ok(_amb.raus.minus.length === 0, 'keine negative Anzahl in einer Karte',
   _amb.raus.minus[0] || 'keine');
ok(_amb.raus.amp.length === 0, 'kein Kaufmanns-Und in einer Ambient-Karte',
   [...new Set(_amb.raus.amp)].join(', ') || 'keins');
ok(_amb.raus.verb.length === 0, 'eine Mehrzahl bekommt ihr Verb im Plural',
   _amb.raus.verb[0] || 'keine');

// ── Der Feed meldet keine Schande ───────────────────────────────────
// Die Liga liest ihn gemeinsam [§C33]. Eine Schattenseite steht im
// Rekorde-Reiter und im Profil, aber niemand bekommt eine Nachricht darueber,
// dass er am meisten kassiert. Seit die Schandtafel dreizehn Eintraege traegt,
// ist das nicht mehr an einer Handvoll IDs zu erkennen: geprueft wird gegen
// den KATALOG, damit ein neuer Eintrag nicht still durchrutscht.
const _keineSchande = JSON.parse(K.eval(`JSON.stringify((function(){
  const ids = CHRONICLES.filter(c => c.neg).map(c => c.id)
    .concat(SEASON_TITLES.filter(t => t.kunst === 'schatten').map(t => t.id));
  const st = _buildStories() || [];
  const treffer = [];
  st.forEach(s => {
    const j = JSON.stringify(s);
    ids.forEach(id => { if(j.indexOf('"' + id + '"') >= 0) treffer.push(s.type + '/' + id); });
  });
  return {stories:st.length, ids:ids.length, treffer:[...new Set(treffer)]};
})())`));
ok(_keineSchande.stories > 0 && _keineSchande.ids >= 12,
   'der Durchlauf sieht Stories und kennt die ganze Schandtafel',
   _keineSchande.stories + ' Stories, ' + _keineSchande.ids + ' Schande-IDs');
ok(_keineSchande.treffer.length === 0, 'keine Schande steht im Feed',
   _keineSchande.treffer.slice(0, 4).join(', ') || 'keine');

// ── Wer eine Bestmarke ausruft, nennt ihren Halter ──────────────────
// „Leon beherrscht die Wochen · 6x Spieler der Woche. Bestwert der Liga"
// stand im Feed, und derselbe Bestwert gehoerte im Rekorde-Reiter Julian:
// Leon hat 4 von 15 eigenen Wochen gewonnen, Julian 4 von 13. Die Karte
// zaehlte die Titel, der Rekord misst den Anteil — und die Anzahl gehoert
// dem, der oefter dabei war [§C35]. Gerechnet wird deshalb an EINER Stelle
// [§C27]: `chronicleRang` ist die Reihenfolge, die auch das Rekord-Blatt
// zeigt. Geprueft wird der genannte Spieler, nicht der Wortlaut: die Karte
// darf nur Halter benennen.
const _bmk = JSON.parse(K.eval(`JSON.stringify((function(){
  const pm = pmap();
  const nameOf = pid => (pm[pid] && pm[pid].name) || '?';
  const paare = { personal_scorer:'sniper', award_potd_leader:'daylord',
                  award_potw_leader:'weeklord' };
  const T = _ambientTemplatePool(new Date(), pm, nameOf);
  const out = [];
  Object.keys(paare).forEach(key => {
    const v = T.find(x => x.key === key);
    if(!v){ out.push({ key, fehlt:true }); return; }
    const r = chronicleRang(paare[key]) || [];
    const halter = r.filter(x => x.wert === (r[0] || {}).wert).map(x => x.pid);
    for(let i = 0; i < 12; i++){
      let k = null;
      try { k = v.make(() => (i + 0.5) / 12); } catch(e){ continue; }
      if(!k) continue;
      const d = k.dataRef || {};
      const pids = d.ambientPids || (d.ambientPid ? [d.ambientPid] : []);
      out.push({ key, rek:paare[key], n:pids.length,
        fremd: pids.filter(x => halter.indexOf(x) < 0).map(nameOf),
        halter: halter.map(nameOf) });
    }
  });
  return out;
})())`));
ok(_bmk.length >= 3 && !_bmk.some(x => x.fehlt),
   'die drei Bestmarken-Karten stehen im Pool',
   _bmk.filter(x => x.fehlt).map(x => x.key).join(', ') || String(_bmk.length));
ok(_bmk.every(x => x.fehlt || x.n > 0),
   'jede Bestmarken-Karte nennt ueberhaupt einen Spieler',
   (_bmk.find(x => !x.fehlt && !x.n) || {}).key || 'alle');
const _bmkFremd = _bmk.filter(x => x.fremd && x.fremd.length);
ok(_bmkFremd.length === 0, 'jede Bestmarken-Karte nennt nur Halter des Rekords',
   _bmkFremd.length ? _bmkFremd[0].key + ': ' + _bmkFremd[0].fremd.join(', ')
     + ' statt ' + _bmkFremd[0].halter.join(', ') : 'keine Abweichung');

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
// nachdem die letzte Partie gelaufen war. Danach ab acht Partien — dem Median
// der Liga — oder ab 19 Uhr, und damit warteten 36 % der Spieltage bis zum
// Abend auf ein Band, das laengst faellig war. Jetzt ab der fuenften Partie,
// bei zwei bis vier ab 19 Uhr, und bei genau einer Partie gar nicht.
const _tk = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = {};
  matches.forEach(m => { const k = tagKey(m.created_at); tage[k] = (tage[k]||0)+1; });
  const voll = Object.keys(tage).find(k => tage[k] >= NEWS_LIMITS.tagKartePartien);
  const kurz = Object.keys(tage).find(k => tage[k] >= NEWS_LIMITS.tagKarteMin
    && tage[k] < NEWS_LIMITS.tagKartePartien);
  const einzeln = Object.keys(tage).find(k => tage[k] === 1);
  // POTD hat absichtlich die hoehere Feed-Prioritaet: die Tageskarte soll
  // trotzdem die seltenere Geschichte waehlen und nicht reflexhaft POTD.
  // Die Breaking-Zeile steht daneben, weil sie im Feed schon die lauteste
  // Karte ist und das Band damit dasselbe zweimal sagen wuerde.
  const items = [{id:'a', prio:999, dataRef:{type:'potd'}},
                 {id:'b', prio:1, dataRef:{type:'giant_slayer', chance:.08}},
                 {id:'c', prio:998, dataRef:{type:'lead_change'}},
                 {id:'d', prio:997, dataRef:{type:'woche'}}];
  const beiMs = (ms, tag) => {
    const echt = Date.now; Date.now = () => ms;
    let r = null; try { r = _newsTagKarte(items, tag); } finally { Date.now = echt; }
    return r;
  };
  const um = (tag, std, min) => {
    const d = new Date(tag + 'T00:00:00'); d.setHours(std, min||0, 0, 0);
    return beiMs(d.getTime(), tag);
  };
  const zeiten = tag => matches.filter(m => tagKey(m.created_at) === tag)
    .map(m => mts(m)).sort((a, b) => a - b);
  const fuenfte = voll ? zeiten(voll)[NEWS_LIMITS.tagKartePartien - 1] : 0;
  // Kein Spieltag der echten Liga hat genau eine Partie, also wird einer
  // gebaut: ohne ihn waere die Zusicherung gruen, auch wenn die Regel fehlt.
  const alle = matches.slice();
  let einzelnGebaut = null, einzelnTag = kurz || voll;
  try {
    const erste = alle.filter(m => tagKey(m.created_at) === einzelnTag)
      .sort((a, b) => mts(a) - mts(b))[0];
    matches = alle.filter(m => tagKey(m.created_at) !== einzelnTag).concat([erste]);
    einzelnGebaut = um(einzelnTag, 23);
  } finally { matches = alle; }
  return {vollN: tage[voll], kurzN: tage[kurz], einzelnN: einzeln ? tage[einzeln] : 0,
    einzelnGebaut, einzelnTag,
    vorFuenf: beiMs(fuenfte - 1, voll), abFuenf: beiMs(fuenfte, voll),
    kurzFrueh: um(kurz, 12), kurzSpaet: um(kurz, 19), kurzKnapp: um(kurz, 18, 59),
    leer: um('2020-01-01', 23),
    breaking: _newsTagKarteWuerdig({dataRef:{type:'lead_change'}}),
    potd: _newsTagKarteWuerdig({dataRef:{type:'potd'}}),
    rueckblick: _newsTagKarteWuerdig({dataRef:{type:'woche'}}),
    stunde: NEWS_LIMITS.tagKarteStunde, partien: NEWS_LIMITS.tagKartePartien,
    mind: NEWS_LIMITS.tagKarteMin};
})())`));
ok(_tk.partien === 5 && _tk.stunde === 19 && _tk.mind === 2,
   'die Schwelle liegt bei fuenf Partien, 19 Uhr und mindestens zwei Partien',
   _tk.partien + ' Partien, ' + _tk.stunde + ' Uhr, ab ' + _tk.mind);
ok(_tk.vorFuenf === null, 'vor der fuenften Partie steht noch kein Band',
   _tk.vollN + ' Partien -> ' + _tk.vorFuenf);
ok(_tk.abFuenf === 'b', 'mit der fuenften Partie steht es',
   _tk.vollN + ' Partien -> ' + _tk.abFuenf);
ok(_tk.kurzFrueh === null, 'ein kurzer Spieltag wartet bis 19 Uhr',
   _tk.kurzN + ' Partien um 12 Uhr -> ' + _tk.kurzFrueh);
ok(_tk.kurzKnapp === null, 'eine Minute vor 19 Uhr steht sie noch nicht',
   String(_tk.kurzKnapp));
ok(_tk.kurzSpaet === 'b', 'um 19 Uhr steht sie auch mit zwei bis vier Partien',
   String(_tk.kurzSpaet));
ok(_tk.einzelnGebaut === null,
   'ein Spieltag mit genau einer Partie bekommt kein Band',
   _tk.einzelnTag + ' auf eine Partie gekuerzt -> ' + String(_tk.einzelnGebaut));
ok(_tk.leer === null, 'ein Tag ohne Partie bekommt keine Karte des Tages',
   String(_tk.leer));
ok(!_tk.breaking && !_tk.potd && !_tk.rueckblick,
   'Breaking, der Spieler des Tages und ein Rueckblick tragen das Band nie',
   JSON.stringify({breaking:_tk.breaking, potd:_tk.potd, rueckblick:_tk.rueckblick}));

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
    // Katalog, und „Debuetant: Match gespielt" braucht keine Zahl. Das gilt
    // fuer die gesammelten runden Marken genauso, solange es nur eine ist —
    // dann ist die Karte eine Auszeichnung, und ihre Zahl steht im Titel.
    ohneZahl: arten.filter(a => a.k !== 'badge_unlocked' && a.k !== 'badge_marken'
      && !/\\d/.test(a.d)).map(a => a.k),
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

// ── Der Tag ist das Mass, nicht das Fenster ─────────────────────────
//    Die Mischung aus Spieltag und Ewiger Tafel war eine Quote ueber das
//    ganze 14-Tage-Fenster. Gemessen schnitt sie den Feed von 42 auf 23
//    Karten und leerte zwei von sieben Spieltagen vollstaendig: der 24.08.
//    trug vierzehn Meldungen und im Feed keine einzige Karte.
console.log('\n═══ DER TAG IST DAS MASS ═══');
const _tagmix = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const feed = getStoriesCache();
  const tk = w => tagKey(w);
  const istTafel = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel';
  const gew = s => (s.dataRef||{}).type === 'sammel'
    ? Math.max(1, ((s.dataRef||{}).teile||[]).length) : 1;
  const proTag = {}, rohTag = {};
  feed.forEach(s => { (proTag[tk(s.when)] = proTag[tk(s.when)] || []).push(s); });
  roh.forEach(s => { (rohTag[tk(s.when)] = rohTag[tk(s.when)] || []).push(s); });
  // Jeder Tag, an dem gespielt wurde und fuer den der Generator etwas
  // gebildet hat, traegt mindestens eine Karte.
  const leer = Object.keys(rohTag).filter(k => _newsTagMs(k).length
    && !(proTag[k] || []).length);
  // Und kein Tag traegt mehr als den Deckel — Pflicht und Breaking zaehlen
  // nicht mit [§C33].
  const pflicht = new Set(['potd','woche','chronik_monat','season_recap']);
  const ueber = Object.keys(proTag).filter(k => proTag[k].filter(s => {
    const t = (s.dataRef||{}).type;
    let b = false; try { b = _isBreaking(s); } catch(e){}
    return !b && !pflicht.has(t);
  }).length > NEWS_LIMITS.proTag);
  // Wo sich die Tafel bewegt hat, steht sie auch im Feed.
  const tafelTage = Object.keys(rohTag).filter(k => rohTag[k].some(istTafel));
  const ohneTafel = tafelTage.filter(k => !(proTag[k] || []).some(istTafel));
  // Von einer Achse hoechstens zwei Buendel je Tag: vier Karten „Ein Spiel,
  // N Geschichten" untereinander sind drei zu viel.
  const achseZuViel = [];
  Object.keys(proTag).forEach(k => {
    const z = {};
    proTag[k].forEach(s => { const d = s.dataRef||{};
      if(d.type !== 'sammel') return;
      const a = 'sammel/' + (d.quelle || 'spiel');
      z[a] = (z[a]||0) + 1; });
    Object.keys(z).forEach(a => { if(z[a] > 2) achseZuViel.push(k + ' ' + a + ' ' + z[a]); });
  });
  // Die Waage wird je TAG gemessen, nicht ueber das Fenster: der Generator
  // bildet Tafel-Aenderungen nur fuer den LETZTEN Spieltag, Spieltagskarten
  // aber fuer alle vierzehn Tage. Ueber das Fenster gerechnet waere die Quote
  // damit eine Aussage ueber den Generator und nicht ueber die Mischung.
  const istSpieltagsKarte = s => !istTafel(s) && (s.dataRef||{}).type !== 'ambient';
  const beides = Object.keys(rohTag).filter(k =>
    rohTag[k].some(istTafel) && rohTag[k].some(istSpieltagsKarte));
  const ohneSpieltag = beides.filter(k => !(proTag[k] || []).some(istSpieltagsKarte));
  const mischung = beides.map(k => {
    let t = 0, sp = 0;
    (proTag[k] || []).forEach(s => { if(istTafel(s)) t += gew(s);
      else if(istSpieltagsKarte(s)) sp += gew(s); });
    return {tag: k, t, sp, anteil: Math.round(100 * t / Math.max(1, t + sp))};
  });
  return {karten: feed.length, tage: Object.keys(proTag).length,
          leer, ueber, ohneTafel, achseZuViel, beides, ohneSpieltag, mischung};
})())`));
ok(_tagmix.leer.length === 0, 'kein Spieltag im Feed bleibt ohne Karte',
   _tagmix.leer.join(', ') || 'keiner');
// Gebaut, nicht gehofft: zwei Spieltage, dieselbe Schlagzeile. Der Vergleich
// der Schlagzeilen wirft die aeltere weg [§C33], und dann stand der aeltere
// Spieltag ohne eine einzige Karte in der Tafel. Der reservierte Tafel-Platz
// wird am selben Weg geprueft: ein schwacher Tafel-Wechsel unter sechs
// starken Spieltagskarten faellt sonst unter den Deckel.
const _tagbau = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const a = tage[tage.length - 1], b = tage[tage.length - 2];
  const msVon = k => mts(_newsTagMs(k)[0]);
  // elo_swing ist der gemessene Fall: „Harter Tag fuer Johannes" stand an
  // vier Tagen im Fenster, und der Vergleich der Schlagzeilen liess genau
  // eine davon stehen. Der 13.08. hatte danach nur noch den Spieler des
  // Tages, der 19.08. gar nichts.
  const gleich = [a, b].map((k, i) => ({
    id: 'gl-' + i, cat:'highlight', ic:'flame', when: new Date(msVon(k)), prio: 38,
    title: 'Dieselbe Schlagzeile', desc: 'Ein Text, ' + (i + 1) + ' Zahlen.',
    dataRef: {type:'elo_swing', pid: players[0].id, delta: 20 + i}
  }));
  _cache._consolFrom = null;
  const doppelt = _consolidateStories(gleich);
  // Der schwache Tafel-Wechsel gegen sechs starke Spieltagskarten: sechs
  // verschiedene Spieler und drei Sorten, damit weder der Deckel je Sorte
  // noch die Rueckholung der fehlenden Gesichter die Auswahl macht.
  const stark = [];
  const sorten = ['top_clash','top_clash','giant_slayer','giant_slayer',
                  'streak_killer','streak_killer'];
  for(let i = 0; i < 6; i++) stark.push({
    id:'st-' + i, cat:'highlight', ic:'ball', when:new Date(msVon(a) + i * 3600000),
    prio: 80 + i, title:'Starke Karte ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:sorten[i], matchId:'kein-' + i, playerIds:[players[i].id]}
  });
  stark.push({id:'tf-1', cat:'tafel', ic:'trophyStar', when:new Date(msVon(a)),
    prio: 40, title:'Ein schwacher Wechsel', desc:'Ein Rekord wandert um 1 Platz.',
    dataRef:{type:'rekord_gesteigert', rekordId:'x', playerIds:[players[6].id]}});
  _cache._consolFrom = null;
  const mitTafel = _consolidateStories(stark);
  return {tageImFeed: [...new Set(doppelt.map(s => tagKey(s.when)))].length,
          tafelDrin: mitTafel.some(s => s.cat === 'tafel'),
          karten: mitTafel.length};
})())`));
ok(_tagbau.tageImFeed === 2,
   'zwei Spieltage mit derselben Schlagzeile behalten beide eine Karte',
   _tagbau.tageImFeed + ' Tage');
ok(_tagbau.tafelDrin,
   'und ein schwacher Tafel-Wechsel haelt seinen Platz gegen sechs starke Karten',
   _tagbau.karten + ' Karten');
ok(_tagmix.ueber.length === 0, 'und keiner traegt mehr als den Tagesdeckel',
   _tagmix.ueber.join(', ') || 'keiner');
ok(_tagmix.ohneTafel.length === 0,
   'wo sich die Ewige Tafel bewegt hat, steht sie auch im Feed',
   _tagmix.ohneTafel.join(', ') || 'keiner');
ok(_tagmix.achseZuViel.length === 0,
   'von einer Sammel-Achse stehen hoechstens zwei Karten an einem Tag',
   _tagmix.achseZuViel.join(', ') || 'keine');
// Gebaut: vier Partien eines Tages, jede mit zwei Geschichten und einem
// eigenen Paar. Gemessen standen am 26.08. vier Karten „Ein Spiel, N
// Geschichten fuer …" untereinander — vier verschiedene Partien, aber fuer
// den, der scrollt, viermal dieselbe Schlagzeile.
const _vierBuendel = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const basis = mts(_newsTagMs(tage[tage.length - 1])[0]);
  const l = [];
  for(let i = 0; i < 4; i++){
    const wann = new Date(basis + i * 600000);   // vier verschiedene Minuten
    // Vier Paare aus denselben vier Spielern: jedes Paar ist eine eigene
    // Aussage (die Sperrfrist greift also nicht), und die dritte und vierte
    // Karte bringt kein neues Gesicht mit — sonst holt die Regel „der Deckel
    // darf niemanden ganz verschwinden lassen" sie zurueck, richtig so, aber
    // dann messen wir nicht den Deckel.
    const paare = [[0, 1], [2, 3], [0, 2], [1, 3]][i];
    const p1 = players[paare[0]].id, p2 = players[paare[1]].id;
    l.push({id:'b' + i + 'a', cat:'highlight', ic:'ball', when:wann, prio:70,
      title:'Serienbruch ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:'streak_killer', matchId:'mm' + i, playerIds:[p1, p2]}});
    l.push({id:'b' + i + 'b', cat:'highlight', ic:'thriller', when:wann, prio:69,
      title:'Krimi ' + i, desc:'Noch ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:'match_result', resultKind:'krimi', matchId:'mm' + i,
               playerIds:[p1, p2]}});
  }
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  return {buendel: out.filter(s => (s.dataRef||{}).quelle === 'spiel').length,
          karten: out.length};
})())`));
ok(_vierBuendel.buendel === 2,
   'und aus vier gebuendelten Partien eines Tages werden zwei Karten',
   _vierBuendel.buendel + ' Buendel von ' + _vierBuendel.karten + ' Karten');
// ── Zwei verdraengte Ergebnisse tragen eine Karte ──────────────────
//    Gemessen fielen am 07.09. der Probeliga „Ben und Jonas gewinnen ohne
//    Gegentor" (73) und „Kai und Ella stuerzen die Favoriten" (71) unter den
//    Tagesdeckel, weil Tafel, Spieler des Tages und zwei Sammelkarten
//    darueber standen: von neun Partien stand am Ende kein einziges Ergebnis
//    im Feed. Gebaut wird genau dieser Tag — fuenf starke Karten ohne Partie
//    und drei Ergebnisse, von denen die Reservierung eins hereinholt.
const _ergSam = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const tag = tage[tage.length - 1];
  const partien = _newsTagMs(tag).slice(0, 3);
  const basis = mts(partien[0]);
  const l = [];
  // Fuenf starke Karten ohne Partie: sie belegen den Tag, ohne der
  // Reservierung fuer eine Match-Geschichte in die Quere zu kommen.
  const starke = ['milestone_wins','milestone_goals','milestone_elo',
                  'jubilee','rivalry_milestone'];
  starke.forEach((typ, i) => l.push({
    id:'sk-' + i, cat:'personal', ic:'medal', when:new Date(basis + i * 60000),
    prio: 85 - i, title:'Starke Marke ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:typ, pid:players[i % 4].id, playerIds:[players[i % 4].id]}
  }));
  // Ein Favoritensturz und zwei Ergebnisse, jedes mit einer echten Partie.
  // Der Sturz ist die staerkste Match-Geschichte und nimmt damit den
  // reservierten Platz [§C33] — genau die Lage des 07.09.: die Reservierung
  // war erfuellt, und beide Ergebnisse fielen weg. Die Spieler stehen auch
  // auf den starken Karten, damit nicht die Regel „der Deckel darf niemanden
  // ganz verschwinden lassen" die Auswahl macht.
  l.push({id:'gs-0', cat:'highlight', ic:'swords',
    when:new Date(mts(partien[0]) + 3600000), prio: 74,
    title:'Ein Favoritensturz', desc:'Ein Satz mit 1 Zahl.',
    dataRef:{type:'giant_slayer', matchId:partien[0].id,
             playerIds:[players[0].id]}});
  partien.slice(1).forEach((m, i) => l.push({
    id:'er-' + i, cat:'highlight', ic:'thriller',
    when:new Date(mts(m) + 3600000 + (i + 1) * 60000), prio: 63 - i,
    title:'Ein Ergebnis ' + i, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'match_result', resultKind:'krimi', matchId:m.id,
             playerIds:[players[i % 4].id]}
  }));
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  const sam = out.filter(s => (s.dataRef||{}).quelle === 'ergebnis');
  const amTag = out.filter(s => tagKey(s.when) === tag);
  const zeilen = sam.length ? (sam[0].dataRef.teile || []) : [];
  return {sammel: sam.length, karten: amTag.length,
          zeilen: zeilen.length, mitWert: zeilen.filter(z => !!z.wert).length,
          mitPartie: zeilen.filter(z => !!z.matchId).length,
          titel: sam.length ? sam[0].title : '',
          text: sam.length ? sam[0].desc : '',
          einzeln: out.filter(s => (s.dataRef||{}).type === 'match_result').length,
          sturz: out.filter(s => (s.dataRef||{}).type === 'giant_slayer').length};
})())`));
ok(_ergSam.sammel === 1,
   'zwei verdraengte Ergebnisse werden zu einer Karte',
   _ergSam.sammel + ' Sammelkarte, ' + _ergSam.einzeln + ' einzeln');
ok(_ergSam.einzeln === 0 && _ergSam.sturz === 1,
   'und die staerkste Match-Geschichte des Tages steht mit ihrem eigenen Band',
   _ergSam.einzeln + ' Ergebnis einzeln, ' + _ergSam.sturz + ' Favoritensturz');
ok(_ergSam.karten <= 5,
   'die Karte kostet einen Tagesplatz, nicht zwei',
   _ergSam.karten + ' Karten am Tag');
ok(_ergSam.zeilen === 2 && _ergSam.mitWert === 2,
   'sie nennt beide Staende im Sammelband',
   _ergSam.zeilen + ' Zeilen, ' + _ergSam.mitWert + ' mit Stand');
ok(_ergSam.mitPartie === 2,
   'und jede Zeile traegt ihre Partie fuer das Ergebnisband im Blatt',
   _ergSam.mitPartie + ' von ' + _ergSam.zeilen);
ok(/\d/.test(_ergSam.text) && _ergSam.titel.indexOf(':') < 0,
   'ihr Text nennt eine Zahl und ihre Schlagzeile kein Etikett',
   _ergSam.titel + ' — ' + _ergSam.text);
// ── Eine Partie oder keine ─────────────────────────────────────────
//    Die Sammelkarte borgte die matchId ihres Kopfes. Ein Tafel-Moment
//    entsteht aber ueber die MINUTE und umfasst damit mehrere Partien: ueber
//    „Leo und Stefan bewegen die Ewige Tafel" stand das Ergebnis einer
//    Partie, an der nur einer der beiden beteiligt war.
const _bandEinig = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const partien = _newsTagMs(tage[tage.length - 1]).slice(0, 2);
  const bau = (mids) => {
    const wann = new Date(mts(partien[0]));
    const l = mids.map((mid, i) => ({
      id:'bd-' + i + '-' + mids.join('_'), cat:'tafel', ic:'trophyStar',
      when: wann, prio: 76 - i, title:'Ein Wechsel ' + i,
      desc:'Ein Rekord wandert um ' + (i + 1) + ' Platz.',
      dataRef:{type:'rekord_geholt', rekordId:'r' + i, matchId:mid,
               playerIds:[players[i].id]}
    }));
    _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const sam = out.filter(s => (s.dataRef||{}).quelle === 'tafel');
    return sam.length ? (sam[0].dataRef.matchId || null) : 'kein Buendel';
  };
  return {gleich: bau([partien[0].id, partien[0].id]),
          verschieden: bau([partien[0].id, partien[1].id]),
          erste: partien[0].id};
})())`));
ok(_bandEinig.gleich === _bandEinig.erste,
   'ein Tafel-Moment aus EINER Partie zeigt ihr Ergebnisband',
   String(_bandEinig.gleich));
ok(_bandEinig.verschieden === null,
   'und einer aus zwei Partien zeigt keins, statt sich eine auszusuchen',
   String(_bandEinig.verschieden));
// ── Breaking aus derselben Partie reist zusammen ───────────────────
//    Gemessen stand „Neuer Spitzenreiter: Maxi" mit dem Ergebnisband 10:0 im
//    Feed, und „Maxi und Henry: Absoluter Sieger" — die legendaere
//    Auszeichnung fuer genau dieses 10:0 — als zweite Karte daneben:
//    dasselbe Spiel, dasselbe Wappen, derselbe Stand, zweimal gelesen.
//    Zusammengelegt wird nur ueber die PARTIE: eine gemeinsame Minute ohne
//    gemeinsames Spiel sagt nichts.
const _brk = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const p = _newsTagMs(tage[tage.length - 1]).slice(0, 2);
  const bau = (zweiteMatchId) => {
    const l = [
      {id:'brk-a', cat:'team', ic:'medal', when:new Date(mts(p[0])),
       prio:90, title:'Eine legendäre Auszeichnung', desc:'Ein 10:0 im Katalog.',
       dataRef:{type:'badge_unlocked', badgeId:'perfect_win', rarity:'legendary',
                matchId:p[0].id, playerIds:[players[0].id, players[1].id]}},
      {id:'brk-b', cat:'liga', ic:'crown', when:new Date(mts(p[0])),
       prio:93, title:'Neuer Spitzenreiter', desc:'Die Spitze wechselt nach 1 Spiel.',
       dataRef:{type:'lead_change', newLeader:players[0].id,
                prevLeader:players[2].id, matchId:zweiteMatchId}}
    ];
    _cache._consolFrom = null;
    const out = _consolidateStories(l);
    const sam = out.filter(x => (x.dataRef||{}).type === 'sammel');
    let brk = false;
    try { brk = sam.length ? _isBreaking(sam[0]) : false; } catch(e){}
    return {karten: out.length, sammel: sam.length,
            titel: sam.length ? sam[0].title : '',
            text: sam.length ? sam[0].desc : '',
            band: sam.length ? (sam[0].dataRef.matchId || null) : null,
            breaking: brk,
            sorte: sam.length ? _newsSorte(sam[0]) : ''};
  };
  return {gleich: bau(p[0].id), fremd: bau(p[1].id), mid: p[0].id};
})())`));
ok(_brk.gleich.sammel === 1 && _brk.gleich.karten === 1,
   'zwei Breaking-Meldungen einer Partie werden EINE Karte',
   _brk.gleich.karten + ' Karten');
ok(_brk.gleich.breaking === true,
   'und sie bleibt Breaking, statt die seltenste Meldung zu entschaerfen',
   String(_brk.gleich.breaking));
ok(_brk.gleich.band === _brk.mid && _brk.gleich.sorte === 'spiel',
   'sie zeigt das Ergebnis der Partie, aus der beides kommt',
   _brk.gleich.sorte + ' / ' + String(_brk.gleich.band));
ok(/Tabellenspitze/.test(_brk.gleich.titel) && /Auszeichnung/.test(_brk.gleich.titel),
   'ihre Schlagzeile nennt beide Anlaesse statt „zwei Geschichten"',
   _brk.gleich.titel);
ok(/\d/.test(_brk.gleich.text) || /[Zz]wei|[Dd]rei|[Vv]ier/.test(_brk.gleich.text),
   'und ihr Text sagt, wie viele Meldungen zusammenkommen',
   _brk.gleich.text);
ok(_brk.fremd.sammel === 0 && _brk.fremd.karten === 2,
   'zwei Breaking-Meldungen aus verschiedenen Partien bleiben zwei Karten',
   _brk.fremd.karten + ' Karten');
// ── Eine Serie je Spieler und Tag, auch im Feed ────────────────────
//    Der Generator bildet nur noch die hoechste Marke, aber persistierte
//    Zeilen aus aelteren Laeufen tragen die kuerzeren weiter. Gemessen stand
//    „Johannes zuendet die 7er-Serie" neben „2 Serien im Gleichschritt: Jane
//    & Johannes" und darunter „Jane zuendet die 5er-Serie": dieselbe laufende
//    Serie in drei Zeilen. Die Gruppe entsteht aus den Mitgliedern, also muss
//    die Grenze VOR der Gruppierung greifen.
const _serieEinmal = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const p = _newsTagMs(tage[tage.length - 1]);
  const A = players[0].id, B = players[1].id;
  // A reisst die 5er-Marke in der ersten und die 7er in der dritten Partie,
  // B die 5er ebenfalls in der dritten: die Gruppe entsteht aus Partie drei.
  const l = [
    {id:'ws-1', cat:'highlight', ic:'flame', when:new Date(mts(p[0])), prio:68,
     title:players[0].name + ' zündet die 5er-Serie',
     desc:'Fünf Siege in Folge. 1 Zahl.',
     dataRef:{type:'win_streak', pid:A, streak:5, matchId:p[0].id}},
    {id:'ws-2', cat:'highlight', ic:'flame', when:new Date(mts(p[2])), prio:71,
     title:players[0].name + ' zündet die 7er-Serie',
     desc:'Sieben Siege in Folge. 2 Zahlen.',
     dataRef:{type:'win_streak', pid:A, streak:7, matchId:p[2].id}},
    {id:'ws-3', cat:'highlight', ic:'flame', when:new Date(mts(p[2])), prio:68,
     title:players[1].name + ' zündet die 5er-Serie',
     desc:'Fünf Siege in Folge. 3 Zahlen.',
     dataRef:{type:'win_streak', pid:B, streak:5, matchId:p[2].id}}
  ];
  _cache._consolFrom = null;
  const out = _consolidateStories(l);
  // Wie oft steht A auf einer Serien-Meldung — als Karte oder als Zeile?
  let aMal = 0;
  out.forEach(s => {
    const d = s.dataRef || {};
    const zeilen = d.type === 'sammel' ? (d.teile || [])
      : [{typ:d.type, pids:(d.playerIds || []).concat(d.pid ? [d.pid] : [])}];
    zeilen.forEach(t => {
      if(t.typ !== 'win_streak' && t.typ !== 'group') return;
      const ids = (t.pids || []).length ? t.pids : [];
      if(ids.indexOf(A) >= 0) aMal++;
    });
  });
  const titel = [];
  out.forEach(s => {
    const d = s.dataRef || {};
    if(d.type === 'sammel') (d.teile || []).forEach(t => titel.push(t.titel));
    else titel.push(s.title);
  });
  return {karten: out.length, aMal, titel};
})())`));
ok(_serieEinmal.aMal === 1,
   'ein Spieler steht an einem Tag auf genau einer Serien-Meldung',
   _serieEinmal.aMal + ' Meldungen: ' + _serieEinmal.titel.join(' | '));
ok(_serieEinmal.titel.every(t => !/5er-Serie/.test(String(t)))
   && _serieEinmal.titel.length === 1,
   'und die kuerzere Marke verschwindet mit ihr, auch aus der Gruppe',
   _serieEinmal.titel.join(' | '));
// ── Die drei Befunde aus dem Nachlauf der echten Liga ──────────────
//    Der Generator laeuft bei jedem Laden, und was er bildet, wird
//    persistiert: die Datenbank traegt die VEREINIGUNG aller Zwischenstaende
//    eines Tages. Nachgespielt an den echten 538 Partien des 14. und 15.09.
//    fielen dabei drei Karten heraus, die stehen muessten.
const _nachlauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const tage = [...new Set(matches.map(m => tagKey(mts(m))))].sort();
  const tag = tage[tage.length - 1], vortag = tage[tage.length - 2];
  const p = _newsTagMs(tag);
  const basis = mts(p[0]);
  // (1) Breaking scheitert an keiner Sperre. Die Spitze wechselte zweimal
  //     hin und her: der Schluessel der Sperrfrist sortiert die Beteiligten,
  //     und damit tragen „A verdraengt B" und „B verdraengt A" dieselbe
  //     Aussage. Von drei Breaking-Karten blieb eine stehen.
  const wechsel = [
    {id:'lc-1', cat:'liga', ic:'crown', when:new Date(mts(_newsTagMs(vortag)[0])),
     prio:93, title:'Neuer Spitzenreiter: ' + players[1].name,
     desc:players[1].name + ' steht nach 1 Spiel an der Spitze.',
     dataRef:{type:'lead_change', newLeader:players[1].id, prevLeader:players[0].id,
              matchId:_newsTagMs(vortag)[0].id}},
    {id:'lc-2', cat:'liga', ic:'crown', when:new Date(basis), prio:93,
     title:'Neuer Spitzenreiter: ' + players[0].name,
     desc:players[0].name + ' steht nach 2 Spielen an der Spitze.',
     dataRef:{type:'lead_change', newLeader:players[0].id, prevLeader:players[1].id,
              matchId:p[0].id}}
  ];
  _cache._consolFrom = null;
  const beide = _consolidateStories(wechsel);
  // (2) Die Reservierung fuer eine Match-Geschichte gehoert einer Karte, die
  //     sie braucht. Breaking zaehlt nicht gegen den Deckel — nahm den
  //     Platz aber ein, und das Ergebnis des Tages fiel heraus.
  const l2 = [{id:'rv-brk', cat:'liga', ic:'crown', when:new Date(basis), prio:93,
    title:'Neuer Spitzenreiter', desc:'Die Spitze wechselt nach 1 Spiel.',
    dataRef:{type:'lead_change', newLeader:players[0].id, prevLeader:players[1].id,
             matchId:p[0].id}}];
  ['milestone_wins','milestone_goals','milestone_elo','jubilee','rivalry_milestone']
    .forEach((typ, i) => l2.push({id:'rv-s' + i, cat:'personal', ic:'medal',
      when:new Date(basis + i * 60000), prio:85 - i, title:'Starke Marke ' + i,
      desc:'Ein Satz mit ' + i + ' Zahlen.',
      dataRef:{type:typ, pid:players[i % 4].id, playerIds:[players[i % 4].id]}}));
  l2.push({id:'rv-erg', cat:'highlight', ic:'thriller',
    when:new Date(basis + 600000), prio:63, title:'Ein Ergebnis',
    desc:'Ein Satz mit 1 Zahl.',
    dataRef:{type:'match_result', resultKind:'krimi', matchId:p[1].id,
             playerIds:[players[0].id]}});
  _cache._consolFrom = null;
  const mitErg = _consolidateStories(l2);
  // (3) Der Deckel je Sorte behaelt die STAERKSTEN. Gezaehlt wurde in
  //     Feed-Reihenfolge, und die ist die Zeit: von vier Karten einer Sorte
  //     blieben die zwei jungen stehen, und die staerkste von 11:39 fiel weg.
  //     Genommen wird eine Sorte mit eigener Sache je Karte, damit nicht die
  //     Sperrfrist misst (sie fasst Karten ohne Sache zusammen), und
  //     dieselben zwei Gesichter auf allen vier, damit nicht die Regel
  //     „der Deckel darf niemanden verschwinden lassen" sie zurueckholt.
  const l3 = [];
  [[73, 0], [69, 1], [65, 2], [64, 3]].forEach(([pr, i]) => l3.push({
    id:'dk-' + pr, cat:'team', ic:'medal',
    when:new Date(basis + i * 3600000), prio:pr,
    title:'Auszeichnung mit ' + pr, desc:'Ein Satz mit ' + i + ' Zahlen.',
    dataRef:{type:'badge_unlocked', badgeId:'b' + i, rarity:'common',
             matchId:p[i % p.length].id,
             playerIds:[players[0].id, players[1].id]}}));
  _cache._consolFrom = null;
  const gedeckelt = _consolidateStories(l3)
    .filter(x => (x.dataRef || {}).type === 'badge_unlocked')
    .map(x => x.prio).sort((a, b) => b - a);
  return {wechsel: beide.filter(x => (x.dataRef||{}).type === 'lead_change').length,
          ergDrin: mitErg.some(x => x.id === 'rv-erg'),
          ergKarten: mitErg.length,
          gedeckelt};
})())`));
ok(_nachlauf.wechsel === 2,
   'zwei Breaking-Karten ueber denselben Wechsel in beide Richtungen bleiben beide',
   _nachlauf.wechsel + ' von 2');
ok(_nachlauf.ergDrin === true,
   'der reservierte Platz geht an eine Karte, die ihn braucht, nicht an Breaking',
   _nachlauf.ergDrin + ' bei ' + _nachlauf.ergKarten + ' Karten');
ok(_nachlauf.gedeckelt.length === 2 && _nachlauf.gedeckelt[0] === 73,
   'und der Deckel je Sorte behaelt die staerksten, nicht die juengsten',
   _nachlauf.gedeckelt.join(', '));
ok(_tagmix.beides.length > 0,
   'es gibt Tage mit Nachrichten aus beiden Haelften', _tagmix.beides.join(', '));
ok(_tagmix.ohneSpieltag.length === 0,
   'und der Spieltag steht dort ebenso im Feed wie die Tafel',
   _tagmix.ohneSpieltag.join(', ') || 'keiner');
// Gemessen wird am sichtbaren INHALT: ein Buendel zaehlt mit seinen Zeilen.
// 20 bis 80 % ist die belastbare Auslegung von „gutes Mittel" fuer einen
// einzelnen Tag — darunter kommt eine Haelfte gar nicht vor, darueber liest
// sich der Tag wie nur eine von beiden.
ok(_tagmix.mischung.every(x => x.anteil >= 20 && x.anteil <= 80),
   'und beide Haelften halten sich an einem solchen Tag die Waage',
   _tagmix.mischung.map(x => x.tag + ': ' + x.anteil + ' % (' + x.t + '/' + x.sp + ')').join(' | '));

// ── Die ID einer Tafel-Meldung traegt ihren Spieltag ────────────────
//    Ohne ihn beschrieb dieselbe ID zwei Ereignisse: geht eine Chronik weg
//    und kommt an dieselben Leute zurueck, bildet der Generator dieselbe ID
//    erneut, die Datenbank behaelt den alten Zeitstempel und
//    `_newsTexteAuffrischen` uebernimmt den neuen `dataRef`. Gemessen trug
//    „Johannes holt ‚Der Beidfuessige'" den 24.08. und die Partie des 26.08.,
//    und der ganze Tafel-Moment des 24. wanderte in die Karte des 26.
const _tid = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  const tafel = roh.filter(s => /^(rekord_|chronik_geholt|insignium_stufe)$|^rekord_/
    .test((s.dataRef||{}).type||'') || ['chronik_geholt','insignium_stufe']
    .indexOf((s.dataRef||{}).type) >= 0);
  const ohneTag = tafel.filter(s => String(s.id).indexOf(tagKey(s.when)) < 0);
  // Und die Partie, auf die eine Tafel-Karte zeigt, liegt an ihrem eigenen Tag.
  const fremdePartie = tafel.filter(s => {
    const mid = (s.dataRef||{}).matchId;
    if(!mid) return false;
    const m = matches.find(x => x.id === mid);
    return !m || tagKey(mts(m)) !== tagKey(s.when);
  }).map(s => s.title);
  return {n: tafel.length, ohneTag: ohneTag.map(s => s.id), fremdePartie};
})())`));
ok(_tid.n > 0, 'Tafel-Meldungen werden gebildet', _tid.n + ' Karten');
ok(_tid.ohneTag.length === 0, 'jede Tafel-Meldung traegt ihren Spieltag in der ID',
   _tid.ohneTag.slice(0, 2).join(', ') || 'alle');
ok(_tid.fremdePartie.length === 0,
   'und zeigt auf eine Partie ihres eigenen Tages',
   _tid.fremdePartie.slice(0, 2).join(' | ') || 'alle');


// ── Neu ist, was seit dem letzten Blick dazugekommen ist ────────────
//    Gezaehlt wurde, was nicht in der Liste der gelesenen IDs steht — und
//    das ist nicht dasselbe. Eine Karte faellt unter einen Deckel, eine
//    gleichlautende Schlagzeile verdraengt sie, eine Sperrfrist laeuft ab:
//    gemessen ueber fuenfundvierzig Tage trugen 81 von 267 neu auftauchenden
//    Karten (30 %) einen Zeitpunkt, der laenger zurueckliegt als alles, was
//    der Leser schon gesehen hat.
const _stand = JSON.parse(K.eval(`JSON.stringify((function(){
  const roh = _buildStories();
  _cache._stories = roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  _cache._consolFrom = null; _cache._frischVon = null;
  const feed = getStoriesCache();
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  const offenVorher = newsUnreadCount();
  _newsMarkAllSeen();
  const offenNachher = newsUnreadCount();
  const gesetzt = Number(localStorage.getItem(NEWS_LS_STAND)) || 0;
  const neuste = feed.reduce((mx, s) => Math.max(mx, new Date(s.when).getTime()), 0);
  // Eine Karte, die erst spaeter im Feed erscheint, aber aelter ist als der
  // Lesestand, gilt als gelesen — auch wenn ihre ID unbekannt ist.
  const alt = feed.length
    ? Object.assign({}, feed[feed.length - 1], {id: 'nie-gesehen'}) : null;
  const altGilt = alt ? _newsGelesen(alt, _newsLoadSeen(), gesetzt) : false;
  // Eine Karte NACH dem Lesestand ist neu.
  const frisch = feed.length
    ? Object.assign({}, feed[0], {id: 'ganz-neu', when: new Date(gesetzt + 60000)}) : null;
  const frischGilt = frisch ? _newsGelesen(frisch, _newsLoadSeen(), gesetzt) : true;
  localStorage.removeItem(NEWS_LS_SEEN);
  localStorage.removeItem(NEWS_LS_STAND);
  return {offenVorher, offenNachher, gesetzt, neuste, altGilt, frischGilt};
})())`));
ok(_stand.offenVorher > 0, 'ohne Lesestand ist jede Karte neu',
   _stand.offenVorher + ' offen');
ok(_stand.offenNachher === 0, 'nach „Alles gelesen" ist keine mehr offen',
   _stand.offenNachher + ' offen');
ok(_stand.gesetzt === _stand.neuste,
   'der Lesestand steht auf der neuesten Karte des Feeds',
   _stand.gesetzt + ' / ' + _stand.neuste);
ok(_stand.altGilt,
   'eine Karte, die spaeter mit altem Zeitpunkt auftaucht, gilt als gelesen');
ok(!_stand.frischGilt, 'eine Karte nach dem Lesestand gilt als neu');

// ── Jeder Text sagt, was passiert ist ───────────────────────────────
//    Gemessen an allen Typen, die der Generator ueber vierzig Tage bildet.
console.log('\n═══ JEDER TEXT SAGT, WAS PASSIERT IST ═══');
const _worte = JSON.parse(K.eval(`JSON.stringify((function(){
  // Ueber mehrere Spieltage, nicht nur ueber heute: ein einziger Lauf trifft
  // von jedem Typ hoechstens einen Fall, und dann prueft die Zusicherung
  // genau den, der zufaellig gerade ansteht. Genommen wird jeder vierte
  // Spieltag der ganzen Ligageschichte — die letzten zwoelf allein trugen
  // zum Beispiel keinen Krimi, den das zweite Team gewonnen hat, und genau
  // dort stand die Reihenfolge der Tore falsch.
  const alleMatches = matches.slice();
  const alleTage = [...new Set(alleMatches.map(m => tagKey(mts(m))))].sort();
  const tage = alleTage.filter((_, i) => i % 4 === 0 || i >= alleTage.length - 3);
  const roh = [];
  const gesehen = new Set();
  tage.forEach(k => {
    const grenze = Math.max(...alleMatches.filter(m => tagKey(mts(m)) === k).map(mts));
    matches = alleMatches.filter(m => mts(m) <= grenze);
    invalidateCache();
    let l = [];
    try { l = _buildStories(); } catch(e){}
    l.forEach(x => { if(!gesehen.has(x.id)){ gesehen.add(x.id); roh.push(x); } });
  });
  matches = alleMatches;
  invalidateCache();
  // Das Ergebnis im Text gehoert dem Sieger. Unter „Leon schlaegt Julian im
  // Spitzenspiel" stand „9:10" — dieselbe Karte behauptete zwei Sieger.
  const ergebnisFalsch = [];
  roh.forEach(s => {
    const d = s.dataRef || {};
    const mid = d.matchId;
    if(!mid) return;
    if(['top_clash','giant_slayer','match_result'].indexOf(d.type) < 0) return;
    const m = matches.find(x => x.id === mid);
    if(!m) return;
    const hoch = Math.max(m.score_a, m.score_b), tief = Math.min(m.score_a, m.score_b);
    const gefunden = String(s.title || '').match(/(\\d{1,2})\\s?:\\s?(\\d{1,2})/)
      || String(s.desc || '').match(/(\\d{1,2})\\s?:\\s?(\\d{1,2})/);
    if(!gefunden) return;
    if(Number(gefunden[1]) !== hoch || Number(gefunden[2]) !== tief)
      ergebnisFalsch.push(s.title + ' → ' + gefunden[0]);
  });
  // ── Die Partie muss zu den Namen passen ──────────────────────────
  //    Tafel-Karten trugen die letzte Partie der DATENBANK, egal von wem sie
  //    erzaehlen. Gemessen zeigten 34 von 169 Karten der Probeliga ein
  //    Ergebnisband mit vier Wappen, unter denen kein genannter Spieler
  //    stand: ueber „Leo und Stefan bewegen die Ewige Tafel" stand
  //    „Jane/Johannes 10:8 Maxi/Henry". Ein einziger Generatorlauf traegt
  //    dafuer zu wenig — der Sweep ueber jeden vierten Spieltag trifft die
  //    Faelle, in denen die Halter an diesem Tag zuletzt nicht antraten.
  const mitMatch = roh.filter(s => (s.dataRef || {}).matchId);
  const fremdeNamen = mitMatch.filter(s => {
    const m = matches.find(x => x.id === (s.dataRef || {}).matchId);
    if(!m) return false;
    let ids = [];
    try { ids = _newsPids(s) || []; } catch(e){}
    if(!ids.length) return false;
    const vier = [m.a1, m.a2, m.b1, m.b2];
    return !ids.some(p => vier.indexOf(p) >= 0);
  }).map(s => ((s.dataRef || {}).type || '') + ': ' + s.title);
  // ── Eine Serie je Spieler und Tag, die laengste ───────────────────
  //    An einem Spieltag mit acht Partien fallen die 5er- UND die 7er-Marke
  //    desselben Spielers, und „Jonas zuendet die 5er-Serie" stand neben
  //    „Jonas zuendet die 7er-Serie": eine Nachricht und eine Wiederholung.
  //    Gemessen brachte die Probeliga danach keine einzige Serienkarte in
  //    den Feed — sie deckelten sich gegenseitig weg.
  const serienDoppelt = [];
  {
    const jeTag = new Map();
    roh.filter(x => (x.dataRef || {}).type === 'win_streak').forEach(x => {
      const k = (x.dataRef.pid || '') + '|' + tagKey(x.when);
      jeTag.set(k, (jeTag.get(k) || 0) + 1);
    });
    jeTag.forEach((n, k) => { if(n > 1) serienDoppelt.push(k + ': ' + n); });
  }
  // Der Text wiederholt die Schlagzeile nicht wortgleich.
  const echo = roh.filter(s => {
    const t = String(s.title || '').trim(), d = String(s.desc || '').trim();
    return t && d && (d === t || d.indexOf(t + '.') === 0);
  }).map(s => s.title);
  // Kein Etikett mit Doppelpunkt am Satzanfang („Saison-Endspurt: …").
  const etikett = roh.filter(s => /^[A-ZÄÖÜ][^.!?:]{2,24}:\\s/.test(String(s.desc || '')))
    .map(s => s.title + ' → ' + String(s.desc).slice(0, 40));
  // Und kein englischer Kartentitel.
  // Gesucht sind durchgehend englische Aufschriften. „Player of the Week"
  // und „Player of the Day" sind die Namen, unter denen die Liga ihre
  // Wochen- und Tageswertung seit jeher fuehrt, und „Upset" gehoert zum
  // eigenen Wortschatz — beides bleibt.
  const englisch = roh.filter(s => /\\b(Giant Slayer|Losing Streak|Win Streak|Loser|Winner|New Record)\\b/
    .test(String(s.title || ''))).map(s => s.title);
  // Ein Satzfragment ohne Verb, allein hinter einem Punkt: „3 am Stueck."
  // Ein Satzfragment: der letzte Satz beginnt mit einer Zahl und traegt
  // hoechstens drei Woerter. „3 am Stueck." ist kein Satz.
  const fragment = roh.filter(s => {
    const teile = String(s.desc || '').split(/(?<=\\.)\\s+/).filter(Boolean);
    if(teile.length < 2) return false;
    const letzt = teile[teile.length - 1].replace(/\\.$/, '').trim();
    return /^\\d/.test(letzt) && letzt.split(/\\s+/).length <= 3;
  }).map(s => s.desc);
  // ── Niemand ist sein eigener Vorgaenger ──────────────────────────
  //    Der Rekord kannte nur „uebernimmt", auch wenn das Halterfeld bloss
  //    enger oder weiter geworden ist. Gemessen widersprachen sich vier
  //    Karten der Ligageschichte: „Leon uebernimmt ‚Der Aufschwung'. Vorher
  //    hielt Leon, Jannik und Stefan den Rekord" — Leon uebernahm von sich
  //    selbst, und aus drei Namen wurde ein „hielt". Und „Martin und Leo
  //    uebernehmen ‚Das Sonntagskind'. Vorher hielt Leo den Rekord mit 70 %"
  //    verkaufte Leos Rueckschritt auf 67 % als Uebergabe, obwohl Leo den
  //    Rekord weiter haelt [§C27]. Ein einziger Generatorlauf trifft keinen
  //    dieser Faelle — sie liegen auf fuenf verschiedenen Spieltagen.
  const selbstVorgaenger = [], falschesVerb = [];
  roh.forEach(s => {
    const d = s.dataRef || {};
    const typ = String(d.type || '');
    if(typ.indexOf('rekord_') !== 0 && typ !== 'chronik_geholt') return;
    const txt = String(s.desc || '');
    const i = txt.indexOf('Vorher');
    if(i < 0) return;
    const satz = txt.slice(i);
    (d.playerIds || []).forEach(pid => {
      const nm = pname(pid);
      if(nm && satz.indexOf(nm) >= 0) selbstVorgaenger.push(s.title + ' || ' + satz);
    });
    // Und das Verb zaehlt die Genannten: ein Name „hielt", mehrere „hielten".
    // Erst den ganzen Satz nehmen, dann die bekannten Enden abstreifen: mit
    // einer traegen Gruppe und einem optionalen Schwanz matchte das Muster
    // genau einen Buchstaben („Vorher hielten L").
    const v = /Vorher (hielt|hielten)(?: sie)? ([^.]+)\\./.exec(satz);
    if(v){
      const wen = v[2].replace(/ den Rekord mit .*$/, '').replace(/ auch$/, '');
      if((wen.indexOf(' und ') >= 0) !== (v[1] === 'hielten'))
        falschesVerb.push(s.title + ' || Vorher ' + v[1] + ' ' + wen);
    }
  });
  const mitVorgaenger = roh.filter(s => {
    const typ = String((s.dataRef || {}).type || '');
    return (typ.indexOf('rekord_') === 0 || typ === 'chronik_geholt')
      && String(s.desc || '').indexOf('Vorher') >= 0;
  }).length;
  return {n: roh.length, ergebnisFalsch, echo, etikett, englisch, fragment,
          mitMatch: mitMatch.length, fremdeNamen, serienDoppelt,
          mitVorgaenger, selbstVorgaenger:selbstVorgaenger.slice(0, 4),
          nSelbst:selbstVorgaenger.length,
          falschesVerb:falschesVerb.slice(0, 4), nVerb:falschesVerb.length,
          serien: roh.filter(x => (x.dataRef || {}).type === 'win_streak').length};
})())`));
ok(_worte.n > 0, 'der Generator bildet Texte', _worte.n + ' Karten');
ok(_worte.mitMatch > 0, 'Karten mit einer konkreten Partie werden gebildet',
   _worte.mitMatch + ' von ' + _worte.n);
ok(_worte.fremdeNamen.length === 0,
   'und jede zeigt eine Partie, in der ein genannter Spieler mitgespielt hat',
   _worte.fremdeNamen.slice(0, 3).join(' | ') || 'alle');
ok(_worte.mitVorgaenger > 10, 'es gibt viele Tafel-Karten mit einem Vorgaenger',
   _worte.mitVorgaenger + ' von ' + _worte.n);
ok(_worte.nSelbst === 0, 'niemand steht als sein eigener Vorgaenger im Satz',
   _worte.selbstVorgaenger.join(' | ') || _worte.nSelbst + ' Treffer');
ok(_worte.nVerb === 0, 'das Verb im Vorgaenger-Satz zaehlt die Genannten',
   _worte.falschesVerb.join(' | ') || _worte.nVerb + ' falsch');
ok(_worte.serien > 0, 'Serienmarken werden gebildet', _worte.serien + ' Karten');
ok(_worte.serienDoppelt.length === 0,
   'und ein Spieler zuendet an einem Tag nur seine laengste Serie',
   _worte.serienDoppelt.slice(0, 3).join(' | ') || 'keine doppelt');
// Gebaut, nicht gehofft: die echten Partien tragen keinen Tag, an dem ein
// Spieler die 5er- UND die 7er-Marke reisst, und eine Zusicherung, die den
// Fall nie sieht, prueft nichts [§5]. Gebaut wird der haeufigste Verlauf: vier
// Siege am Tag davor, drei am Zieltag — dann fallen dort beide Marken.
// Der Held ist Jane: bei einem Vielspieler faengt schon der Nebenrollen-
// Deckel des Generators die zweite Karte ab, und dann messen wir ihn und
// nicht die Regel.
const _serieTag = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const basis = mts(alle[alle.length - 1]);
  const held = (players.find(p => p.name === 'Jane') || players[0]).id;
  const rest = players.filter(p => p.id !== held).slice(0, 3).map(p => p.id);
  const dazu = [];
  const vor = basis - 20 * 3600000;
  // Tag davor: erst eine Niederlage, damit der Lauf bei null beginnt,
  // dann vier Siege (Marke 3). Zieltag: drei Siege, also die Marke 5 — und
  // mit der achten waere es die 8er; gemessen wird, dass der Tag nur EINE
  // Karte traegt und die laengste seiner Marken.
  const bau = (praefix, ab, n, ersteVerloren) => {
    for(let i = 0; i < n; i++) dazu.push({
      id: praefix + i, a1:held, a2:rest[0], b1:rest[1], b2:rest[2],
      a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def',
      score_a: (ersteVerloren && i === 0) ? 7 : 10,
      score_b: (ersteVerloren && i === 0) ? 10 : 7,
      winner: (ersteVerloren && i === 0) ? 'B' : 'A', exp_a: 0.5,
      created_at: new Date(ab + i * 300000).toISOString(), deltas:{}
    });
  };
  bau('sv', vor, 5, true);
  bau('sn', basis + 300000, 3, false);
  matches = alle.concat(dazu);
  invalidateCache();
  let l = [];
  try { l = _buildStories(); } catch(e){}
  const mein = l.filter(x => (x.dataRef || {}).type === 'win_streak'
    && x.dataRef.pid === held && tagKey(x.when) === tagKey(basis));
  matches = alle;
  invalidateCache();
  return {n: mein.length, marken: mein.map(x => x.dataRef.streak)};
})())`));
ok(_serieTag.n === 1,
   'und zwei Marken an einem Tag ergeben eine Karte, nicht zwei',
   _serieTag.n + ' Karten (' + _serieTag.marken.join(', ') + ')');
ok(_serieTag.marken[0] === 5,
   'und zwar die laengste Marke des Tages',
   String(_serieTag.marken[0]));

// ── Die Leiter der Marken und der Lauf als Einheit [§C33] ─────────────
// Sie stand bei 5, 7, 10, 15, 20. Drei Siege in Folge sind das, was die
// meisten ueberhaupt erreichen — dieselbe Schwelle, bei der am Wappen das
// Feuer angeht [§C26] —, und sieben und zehn lagen dicht beieinander.
// Gemessen ueber die 19 Spieltage vom 28.07. bis 26.08.: vorher acht
// gebildete und fuenf gezeigte Serienkarten, jetzt siebzehn und neun.
const _serienLauf = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const tage = [...new Set(alle.map(m => tagKey(mts(m))))].sort()
    .filter(t => t >= '2026-07-28' && t <= '2026-08-26');
  const erlaubt = n => [3,5,8,10].indexOf(n) >= 0 || (n > 10 && n % 5 === 0);
  let roh = 0, gezeigt = 0, falsch = [], doppeltMarke = 0, doppeltLauf = 0;
  const gesehen = {};
  tage.forEach(t => {
    matches = alle.filter(m => mts(m) <= new Date(t + 'T23:59:59').getTime());
    invalidateCache();
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    let r = []; try { r = _buildStories() || []; } catch(e){ return; }
    const ws = r.filter(x => (x.dataRef||{}).type === 'win_streak');
    roh += ws.length;
    const jeMarke = {};
    ws.forEach(x => {
      const n = Number(x.dataRef.streak) || 0;
      gesehen[n] = 1;
      if(!erlaubt(n)) falsch.push(n);
      const k = x.dataRef.pid + '|' + n;
      jeMarke[k] = (jeMarke[k]||0) + 1;
    });
    doppeltMarke += Object.keys(jeMarke).filter(k => jeMarke[k] > 1).length;
    let f = []; try { f = _consolidateStories(r) || []; } catch(e){}
    const g = f.filter(x => (x.dataRef||{}).type === 'win_streak');
    gezeigt += g.length;
    const jeLauf = {};
    g.forEach(x => { const k = x.dataRef.lauf || '?'; jeLauf[k] = (jeLauf[k]||0) + 1; });
    doppeltLauf += Object.keys(jeLauf).filter(k => jeLauf[k] > 1).length;
  });
  matches = alle; invalidateCache();
  _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  return {roh, gezeigt, falsch:[...new Set(falsch)],
    marken:Object.keys(gesehen).map(Number).sort((a,b)=>a-b),
    doppeltMarke, doppeltLauf};
})())`));
console.log('  Serienkarten im Durchlauf: ' + _serienLauf.roh + ' gebildet, '
  + _serienLauf.gezeigt + ' gezeigt · Marken: ' + _serienLauf.marken.join(', '));
ok(_serienLauf.falsch.length === 0, 'jede Serienmarke steht auf der Leiter',
   _serienLauf.falsch.join(', ') || 'keine daneben');
ok(_serienLauf.marken.indexOf(3) >= 0 && _serienLauf.marken.indexOf(8) >= 0,
   'die Leiter beginnt bei drei und kennt die acht',
   _serienLauf.marken.join(', '));
ok(_serienLauf.doppeltMarke === 0, 'dieselbe Marke steht je Spieler nur einmal im Fenster',
   _serienLauf.doppeltMarke + ' doppelt');
ok(_serienLauf.doppeltLauf === 0, 'und von einem Lauf steht nur die laengste Marke im Feed',
   _serienLauf.doppeltLauf + ' Laeufe mit zwei Karten');

// ── Der Serien-Rekord der Liga ab fuenf ───────────────────────────────
// Mit sechs blieb er einer jungen Liga verschlossen: sie erreicht die fuenf,
// bevor sie die sechs erreicht, und genau dann ist die laengste Serie ihrer
// Geschichte eine Nachricht. Im Fenster der Fixtures steht der Bestwert bei
// dreizehn und liegt Monate zurueck, also wird die Schwelle selbst gemessen.
const _recSchwelle = JSON.parse(K.eval(`JSON.stringify((function(){
  const orig = _allTimeRecords;
  const letzte = matches[matches.length - 1];
  const bau = val => ({eloRec:null, streakRec:{val, pid:players[0].id,
    matchId:letzte.id, when:letzte.created_at}});
  const zaehl = () => {
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
    return _buildStories().filter(s => (s.dataRef||{}).type === 'streak_record').length;
  };
  try {
    _allTimeRecords = () => bau(5); const fuenf = zaehl();
    _allTimeRecords = () => bau(4); const vier = zaehl();
    return {fuenf, vier};
  } finally {
    _allTimeRecords = orig;
    _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
  }
})())`));
ok(_recSchwelle.fuenf === 1 && _recSchwelle.vier === 0,
   'der Serien-Rekord der Liga wird ab fuenf Siegen gemeldet',
   JSON.stringify(_recSchwelle));
// ── Der Formlauf veraltet am Abstand, nicht an der Siegzahl ─────────
// Verglichen wurde die Zahl der Siege im Fenster mit der von damals — und
// das Fenster der letzten zehn Partien verschiebt sich schon im Lauf
// desselben Spieltags. Die Karte entsteht nach der vierten Partie mit 8 von
// 10, nach der siebten stehen dort 7, und die eigene Karte von heute Mittag
// fiel als veraltet weg. Gemessen am echten Vierzehn-Tage-Verlauf wurden
// acht Formkarten gebildet und keine einzige gezeigt.
const _form = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const basis = mts(alle[alle.length - 1]);
  const held = (players.find(p => p.name === 'Jane') || players[0]).id;
  const rest = players.filter(p => p.id !== held).slice(0, 3).map(p => p.id);
  const bau = (praefix, ab, n, gewinnt) => {
    const out = [];
    for(let i = 0; i < n; i++) out.push({
      id: praefix + i, a1:held, a2:rest[0], b1:rest[1], b2:rest[2],
      a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def',
      score_a: gewinnt ? 10 : 6, score_b: gewinnt ? 6 : 10,
      winner: gewinnt ? 'A' : 'B', exp_a: 0.5,
      created_at: new Date(ab + i * 300000).toISOString(), deltas:{}
    });
    return out;
  };
  // Zehn Siege am Vormittag: das Fenster ist voll, die Form steht klar ueber
  // dem eigenen Schnitt. Mehr waeren kontraproduktiv — jeder Sieg jenseits
  // des Fensters hebt den eigenen Schnitt und damit den Vergleichswert.
  const hoch = bau('fh', basis + 300000, 10, true);
  // Danach eine Niederlage am selben Tag: das Fenster verschiebt sich, der
  // Vorsprung bleibt.
  const tief = bau('ft', basis + 11 * 300000, 1, false);

  matches = alle.concat(hoch);
  invalidateCache();
  const fh = _liveStreakForm();
  // Die Karte vom Vormittag, gebaut wie im Generator: die Zahl der Siege im
  // Fenster steht in dataRef, und genau daran hing der Stale-Filter einmal.
  // (Kein Backtick in diesem Kommentar: er steht in einem Template-Literal.)
  //
  // Sie wird hier gestellt und nicht aus dem Generator gefischt: wer zehn
  // Partien am Stueck gewinnt, uebernimmt an diesem Tag auch Rekorde, steht
  // damit auf den Tafel-Karten des Tages und faellt mit der dritten eigenen
  // Karte unter den Deckel fuer Nebenrollen [§C33]. Das ist richtig so — die
  // Form steht dann schon als Siegesserie im Feed. Gefragt ist hier der
  // Stale-Filter und nicht der Deckel, und die Datenbank liefert am Abend
  // genau diese Zeile.
  const frueh = {
    id:'top_form_' + held + '_probe', cat:'highlight', ic:'flame',
    title:'Formlauf', desc:'Zehn von zehn Partien gewonnen.',
    when:new Date(basis + 11 * 300000).toISOString(),
    prio:STORY_PRIO.top_form,
    dataRef:{type:'top_form', pid:held, wins:fh.form[held]}
  };

  matches = alle.concat(hoch, tief);
  invalidateCache();
  // Die Karte vom Vormittag, gegen den Stand von jetzt gehalten: genau der
  // Fall, den die Datenbank liefert.
  const durch = _consolidateStories([frueh]).length;
  const sf = _liveStreakForm();
  const erg = { frueh: frueh.dataRef.wins,
                jetzt: sf.form[held], vor: sf.vor[held], durch,
                schwelle: FORM_VORSPRUNG };
  matches = alle;
  invalidateCache();
  return erg;
})())`));
ok(_form.frueh === 10, 'der Formlauf steht am Vormittag bei zehn von zehn',
   String(_form.frueh));
ok(_form.jetzt < _form.frueh,
   'und das Fenster verschiebt sich noch am selben Tag',
   _form.jetzt + ' statt ' + _form.frueh);
ok(_form.vor >= _form.schwelle,
   'der Vorsprung auf den eigenen Schnitt steht trotzdem noch',
   String(Math.round(_form.vor * 100)) + ' Punkte');
ok(_form.durch === 1, 'also bleibt die Karte im Feed', String(_form.durch));

// ── Breaking scheitert auch nicht an der gleichen Schlagzeile ────────
// Die Tabellenspitze wechselte am 14.09. zu Martin und am 15.09. zurueck zu
// Maxi. Beide Karten heissen „Neuer Spitzenreiter: Maxi", also fiel die vom
// 14. weg: der Tag, an dem er sie uebernahm, hatte danach keine
// Breaking-Karte mehr. Zwei Wechsel sind zwei Ereignisse [§C33].
const _brkTitel = JSON.parse(K.eval(`JSON.stringify((function(){
  const t0 = mts(matches[matches.length - 1]);
  const bau = (n, tag) => ({
    id:'lead_change_' + n, cat:'highlight', ic:'crown',
    title:'Neuer Spitzenreiter: Maxi',
    desc:'Die Spitze wechselt, Nummer ' + n + '.',
    when:new Date(t0 - tag * 864e5).toISOString(), prio:93,
    dataRef:{type:'lead_change', pid:players[10].id, playerIds:[players[10].id]}
  });
  // Je Tag noch eine zweite Karte: bleibt fuer einen Spieltag sonst nichts
  // uebrig, holt die Rueckholung die verworfene zurueck [§C33], und die
  // Gegenprobe waere damit immer gruen.
  // Der Fueller braucht je Tag eine eigene Aussage: zwei Ergebniskarten ohne
  // Sache teilen einen Sperrschluessel, und dann faellt der Fueller des
  // aelteren Tages weg — der Tag ist wieder leer, und die Rueckholung greift.
  const fuell = tag => ({
    id:'badge_unlocked_f' + tag, cat:'badge', ic:'trophy',
    title:'Eine Auszeichnung am Tag ' + tag, desc:'Zum ' + (tag + 1) + '. Mal geholt.',
    when:new Date(t0 - tag * 864e5).toISOString(), prio:54,
    dataRef:{type:'badge_unlocked', pid:players[tag].id, playerIds:[players[tag].id],
             badgeId:'f' + tag}
  });
  const zwei = _consolidateStories([bau(2, 0), fuell(0), bau(1, 1), fuell(1)])
    .filter(x => (x.dataRef || {}).type === 'lead_change');
  // Gegenprobe: dieselbe Schlagzeile ohne Breaking bleibt eine Karte.
  const ohne = _consolidateStories([2, 1].map(n => {
    const s = bau(n, n === 2 ? 0 : 1);
    s.id = 'elo_swing_' + n; s.prio = 38;
    s.dataRef = {type:'elo_swing', pid:players[10].id, playerIds:[players[10].id]};
    return s;
  }).concat([fuell(0), fuell(1)])).filter(x => (x.dataRef || {}).type === 'elo_swing');
  return {brk:zwei.length, normal:ohne.length,
          istBrk:zwei.length ? !!_isBreaking(zwei[0]) : false};
})())`));
ok(_brkTitel.istBrk, 'der Spitzenwechsel ist Breaking', String(_brkTitel.istBrk));
ok(_brkTitel.brk === 2, 'zwei Wechsel mit derselben Schlagzeile bleiben zwei Karten',
   String(_brkTitel.brk));
ok(_brkTitel.normal === 1, 'ohne Breaking bleibt die gleiche Schlagzeile einmal stehen',
   String(_brkTitel.normal));

// ── Und der Wechsel nennt eine Zahl ─────────────────────────────────
// „X steht nach dem letzten Spiel an der Spitze. Y war vorher dort." nannte
// keine und war damit an jedem Wechsel derselbe Satz. Am 14.09. wechselte
// die Spitze zweimal und am 15.09. erneut; zwei der drei Karten trugen Wort
// fuer Wort denselben Text, und der Doublettenfilter warf die aeltere weg.
// Gebaut, nicht gehofft: in den echten 466 Partien wechselt die Spitze an
// keinem der 56 Spieltage — der Erste steht von Anfang an oben. Gebaut wird
// der Wechsel deshalb: der Zweite schlaegt den Ersten so lange, bis er vorn
// ist.
const _fw = JSON.parse(K.eval(`JSON.stringify((function(){
  const alle = matches.slice();
  const basis = mts(alle[alle.length - 1]);
  const sim = getGlobalSim();
  const rang = Object.keys(sim.elo || {})
    .filter(pid => pmap()[pid] && !pmap()[pid].hidden)
    .map(pid => ({pid, elo:sim.elo[pid]}))
    .sort((a, b) => b.elo - a.elo);
  const erster = rang[0].pid, zweiter = rang[1].pid;
  const rest = rang.slice(2, 4).map(x => x.pid);
  // Die Elo kommt aus den persistierten Deltas der Partie, nicht aus einer
  // Rechnung ueber das Ergebnis: ohne sie bewegt sich die Tabelle nicht, und
  // das Szenario waere immer gruen.
  const d = {};
  d[zweiter] = 12; d[rest[0]] = 12; d[erster] = -12; d[rest[1]] = -12;
  const partie = i => ({
    id:'fw' + i, a1:zweiter, a2:rest[0], b1:erster, b2:rest[1],
    a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def',
    score_a:10, score_b:2, winner:'A', exp_a:0.5,
    created_at:new Date(basis + (i + 1) * 300000).toISOString(),
    deltas:Object.assign({}, d)
  });
  // Die Karte entsteht nur, wenn die LETZTE Partie den Wechsel ausgeloest
  // hat: sie vergleicht den Stand von jetzt mit dem Rang vor diesem Spiel.
  // Angehaengt wird deshalb eine Partie nach der anderen, bis es kippt —
  // vierzig auf einmal lassen den Wechsel in der Mitte passieren, und am
  // Ende steht der neue Erste schon vor dem letzten Spiel oben.
  let fw = [], l = [];
  const dazu = [];
  for(let i = 0; i < 60; i++){
    dazu.push(partie(i));
    matches = alle.concat(dazu);
    invalidateCache();
    try { l = _buildStories(); } catch(e){ l = []; }
    fw = l.filter(x => (x.dataRef || {}).type === 'lead_change');
    if(fw.length) break;
  }
  const erg = { n:fw.length, texte:fw.map(x => x.desc),
    ohneZahl: fw.filter(x => !/\\d/.test(String(x.desc))).map(x => x.desc),
    floskel:  fw.filter(x => /nach dem letzten Spiel/.test(String(x.desc))).length,
    neuer:    fw.length ? (fw[0].dataRef.newLeader === zweiter) : false };
  matches = alle;
  invalidateCache();
  return erg;
})())`));
ok(_fw.n > 0, 'ein Fuehrungswechsel wird gebildet', String(_fw.n));
ok(_fw.neuer, 'und nennt den neuen Ersten', String(_fw.neuer));
ok(_fw.ohneZahl.length === 0, 'die Karte nennt den Elo-Stand der Spitze',
   _fw.ohneZahl[0] || (_fw.texte[0] || '').slice(0, 90));
ok(_fw.floskel === 0, 'statt „nach dem letzten Spiel" ohne jede Zahl',
   String(_fw.floskel));

ok(_worte.ergebnisFalsch.length === 0,
   'das Ergebnis im Text gehoert dem Sieger',
   _worte.ergebnisFalsch.slice(0, 2).join(' | ') || 'alle');
ok(_worte.echo.length === 0, 'kein Text wiederholt nur seine Schlagzeile',
   _worte.echo.slice(0, 2).join(' | ') || 'keiner');
ok(_worte.etikett.length === 0, 'kein Etikett mit Doppelpunkt am Satzanfang',
   _worte.etikett.slice(0, 2).join(' | ') || 'keins');
ok(_worte.englisch.length === 0, 'keine englische Schlagzeile',
   _worte.englisch.slice(0, 2).join(' | ') || 'keine');
ok(_worte.fragment.length === 0, 'kein Satzfragment als letzter Satz',
   _worte.fragment.slice(0, 2).join(' | ') || 'keins');

console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
process.exit(fails ? 1 : 0);
