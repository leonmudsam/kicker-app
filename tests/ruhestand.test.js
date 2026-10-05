// Das Karriereende [§C40]: die Legacy bleibt, die aktive Liga vergleicht ohne
// den Ruheständler, und sein Profil steht, wie es beim Abschied stand.
// Gemessen an den echten 466 Partien, Martin hört nach dem letzten Spieltag
// auf. Der Ruhestand kommt nicht aus einer zweiten Engine, also prüft diese
// Suite dieselben Funktionen, aus denen die Ansichten lesen.
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
globalThis.__written = [];
globalThis.supabase = { createClient: () => ({
  from: (tbl) => ({
    upsert: async (row) => { globalThis.__written.push({tbl, row}); return {error:null}; },
    update: () => ({ eq: async () => ({error:null}) }),
    select: () => ({ order: async () => ({data:[], error:null}) }),
    delete: () => ({ lt: async () => ({error:null}) })
  }),
  channel:()=>ch(), removeChannel(){}, rpc:()=>ch() }) };
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
const ok = (c,l,x)=>{checks++; if(!c){fails++; console.log('  ✗ '+l+(x?'  ['+x+']':''));} else console.log('  ok    '+l+(x?'  ('+x+')':''));};
const J = s => JSON.parse(K.eval('JSON.stringify(' + s + ')'));
const nm = id => NAMES[IDS.indexOf(id)] || id;
const MARTIN = IDS[NAMES.indexOf('Martin')];
const ENDE = '2026-08-26T22:00:00Z';
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Keine rohe hidden-Abfrage ─────────────────────────────────────────────
// Jede Abfrage wählt zwischen `sichtbar` (Geschichte) und `ligaAktiv`
// (tritt im Zeitraum an). Eine rohe `.hidden`-Abfrage ist genau die Stelle,
// an der ein Ruheständler mit dem nächsten Feature wieder auftaucht.
console.log('=== KEINE ROHE HIDDEN-ABFRAGE ===');
{
  // Die Regel selbst, die Liste zum Wiedereinblenden und die Sicherung, die
  // das Feld speichert, dürfen es lesen.
  const ERLAUBT = ['06b-ruhestand.js', '15-views-rest.js', '36-backup.js'];
  const SRC = DIR + '/../src/js/';
  const roh = [];
  for(const f of fs.readdirSync(SRC)){
    if(ERLAUBT.includes(f)) continue;
    fs.readFileSync(SRC + f, 'utf8').split('\n').forEach((z, i) => {
      const ohne = z.replace(/document\.hidden/g, '').replace(/\w+\.hidden\s*=(?!=)/g, '');
      if(/\.hidden\b/.test(ohne)) roh.push(f + ':' + (i + 1));
    });
  }
  ok(!roh.length, 'keine Datei fragt hidden selbst ab', roh.join(', ') || '—');
}

const stand = () => ({
  rang: J(`getPlayerRank('${MARTIN}')`),
  prestige: J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,platz:p.platz,von:p.von,teile:p.teile}))(prestigeOf('${MARTIN}'))`),
  rekorde: J(`chroniclesOfPlayer('${MARTIN}').map(r=>r.id)`),
  juli: J("seasonTitles('2026-07')"),
  juliRang: J("saisonRang('2026-07')"),
  juliStats: J("periodPlayerStats('season','2026-07')"),
  juliAwards: J("(a=>({single:a.single,team:a.team}))(getCachedAwardRankings('season','2026-07'))"),
  juliVerlauf: J("getSeasonPositionHistory('2026-07').activeIds"),
  meister: J("allPastSeasons().map(s => seasonChampion(s))"),
});
const VOR = stand();
const auszeichnungen = () => J("Object.fromEntries(players.map(p => [p.id, (getCachedBadges(p.id) || []).map(b => b.id + ':' + (b.count || 1)).sort()]))");
const VOR_BADGES = auszeichnungen();
const vorPerz = J(`rangPerzentil('${MARTIN}')`);

console.log('\n=== DIE AKTIVE LIGA VERGLEICHT OHNE IHN ===');
K.eval(`pmap()['${MARTIN}'].retired_at = '${ENDE}'; invalidateCache();`);
ok(J(`imRuhestand('${MARTIN}')`) && !J(`ligaAktiv('${MARTIN}')`), 'Martin ist im Ruhestand und tritt heute nicht an');
ok(!J('Object.keys(getAllPlayerRanks())').includes(MARTIN), 'die Ewige Tafel rankt ihn nicht mehr',
   J('Object.keys(getAllPlayerRanks()).length') + ' im Rang');
ok(!J("periodPlayerStats('all').map(r=>r.id)").includes(MARTIN), 'Gesamt ohne ihn');
ok(!J("periodPlayerStats('season').map(r=>r.id)").includes(MARTIN), 'der laufende Monat ohne ihn');
ok(!J("saisonRang('2026-08').map(r=>r.id)").includes(MARTIN), 'die Monatsrangliste ohne ihn');
ok(!J("getSeasonPositionHistory('2026-08').activeIds").includes(MARTIN), 'der Positionsverlauf des Monats ohne ihn');
ok(J(`ligaPosition('${MARTIN}')`) === 0, 'keine Ligaposition in der Raute');
const halter = J("Object.values(allChronicles().byId).filter(r=>r.pids&&r.pids.length).map(r=>r.pids)").flat();
ok(!halter.includes(MARTIN), 'kein Liga-Rekord nennt ihn als Halter', halter.length + ' Haltungen');
const rk = J("Object.values(allChronicles().byId).filter(r=>r.pids&&r.pids.length).length");
ok(rk > 0, 'die Rekorde, die er hielt, gehören jetzt anderen', rk + ' vergebene Rekorde');
const aug = J("Object.values(seasonTitles('2026-08')||{})").map(v => JSON.stringify(v)).join('');
ok(!aug.includes(MARTIN), 'die Monatschronik des laufenden Monats ohne ihn');
ok(!J(`(getCachedAwardRankings('season','${'2026-08'}').single||[]).map(x=>x.id)`).includes(MARTIN), 'die Awards des laufenden Monats ohne ihn');
ok(!J("prestigeTabelle().rang").includes(MARTIN), 'der Prestige-Rang ohne ihn');
// Eine Serie, die nicht mehr läuft, brennt nicht: das Feuer am Wappen stand
// sonst für immer über dem letzten Spieltag der Laufbahn.
K.eval(`getGlobalSim().curStreak['${MARTIN}'] = 9;`);
ok(J(`znFeuer('${MARTIN}')`) === 0 && J(`avRingOf('${MARTIN}')`) === null, 'kein Feuer und kein Serienring am Wappen');
K.eval('invalidateCache();');
const teams = J('vTeams(true)');
ok(!teams.html.includes(MARTIN) && teams.ruhe.includes(MARTIN) && teams.ruheZahl > 0,
   'die Duos mit ihm stehen nicht in der Teamliste, sondern am Ende', teams.ruheZahl + ' Duos');

console.log('\n=== DIE LEGACY BLEIBT ===');
const NACH = stand();
ok(gleich(VOR.juli, NACH.juli), 'die Monatschronik des Juli unverändert');
ok(gleich(VOR.juliRang, NACH.juliRang) && NACH.juliRang.some(r => r.id === MARTIN), 'die Juli-Rangliste mit ihm, unverändert',
   'Platz ' + (NACH.juliRang.findIndex(r => r.id === MARTIN) + 1));
ok(gleich(VOR.juliStats, NACH.juliStats), 'die Juli-Statistik unverändert');
ok(gleich(VOR.juliAwards, NACH.juliAwards), 'die Juli-Awards unverändert');
ok(gleich(VOR.juliVerlauf, NACH.juliVerlauf), 'der Juli-Positionsverlauf unverändert');
ok(gleich(VOR_BADGES, auszeichnungen()), 'keine Auszeichnung ändert sich, weder seine noch die der anderen',
   Object.values(VOR_BADGES).reduce((s, l) => s + l.length, 0) + ' Auszeichnungen');
ok(gleich(VOR.meister, NACH.meister), 'die Meister abgeschlossener Monate bleiben',
   NACH.meister.map(nm).join(', '));

console.log('\n=== DAS PROFIL IST EINGEFROREN ===');
ok(gleich(VOR.rang, NACH.rang), 'der Rang wie beim Abschied', NACH.rang && NACH.rang.label);
ok(Math.abs(J(`rangPerzentil('${MARTIN}')`) - vorPerz) < 1e-9, 'das Perzentil wie beim Abschied');
ok(gleich(VOR.prestige, NACH.prestige), 'Prestige, Stufe, Grad und Platz wie beim Abschied', NACH.prestige.punkte + ' P');
ok(gleich(VOR.rekorde, NACH.rekorde), 'die Rekorde wie beim Abschied', NACH.rekorde.length + ' Rekorde');
// Der Stand wird gemerkt und nicht bei jedem Aufruf neu gerechnet.
ok(J(`ruhestandStand('${MARTIN}') === ruhestandStand('${MARTIN}')`), 'der eingefrorene Stand wird einmal gerechnet');
// Die Zeitmaschine vergiftet keinen Topf der aktiven Liga: sie rechnet am
// Zeitpunkt des Karriereendes, und genau diesen Schnitt darf danach keine
// Rechnung der aktiven Liga mit ihm darin vorfinden.
ok(!J('Object.keys(getAllPlayerRanks()).includes("' + MARTIN + '")'), 'nach der Zeitmaschine bleibt die aktive Liga ohne ihn');
ok(!J(`Object.values(allChronicles(ruhestandMs('${MARTIN}')).byId).some(r => (r.pids||[]).includes('${MARTIN}'))`)
   && !J(`prestigeTabelle(ruhestandMs('${MARTIN}')).rang.includes('${MARTIN}')`),
   'der Schnitt am Karriereende kommt aus der aktiven Liga, nicht aus der Zeitmaschine');

console.log('\n=== DIE NACHRICHT ===');
{
  const st = J(`_buildStories().filter(s => (s.dataRef||{}).type === 'karriereende')`);
  ok(st.length === 1 && st[0].id === 'karriereende_' + MARTIN + '_2026-08-26' && J('_isBreaking(' + JSON.stringify(st[0]) + ')'),
     'das Karriereende ist eine Breaking-Story mit dem Tag in der ID', st.map(x => x.id).join(', '));
  const d = J(`abschiedDaten('${MARTIN}')`);
  ok(st[0] && st[0].dataRef.spiele === d.spiele && d.spiele === J(`matches.filter(m => [m.a1,m.a2,m.b1,m.b2].includes('${MARTIN}')).length`),
     'Story und Abschied zählen dieselben Partien', d.spiele + ' Partien');
  ok(d.partner.length > 0 && d.saisons.length > 0 && d.rekorde.length === VOR.rekorde.length - J(`chroniclesOfPlayer('${MARTIN}').filter(r=>r.neg).length`),
     'der Abschied kennt Partner, Saisons und die Rekorde beim Abschied', d.rekorde.length + ' Rekorde');
  // Zurückgenommen gilt die Karte nicht mehr, ein neues Karriereende bekäme
  // eine eigene.
  K.eval(`globalThis.__st = ${JSON.stringify(st[0] || {})};`);
  ok(J('_consolidateStories([__st]).length') === 1, 'solange das Karriereende gilt, steht die Karte im Feed');
  K.eval(`pmap()['${MARTIN}'].retired_at = '2026-08-25T10:00:00Z'; invalidateCache();`);
  ok(J('_consolidateStories([__st]).length') === 0, 'ein anderes oder zurückgenommenes Karriereende nimmt die Karte aus dem Feed');
  K.eval(`pmap()['${MARTIN}'].retired_at = '${ENDE}'; invalidateCache();`);
}

console.log('\n=== NEUE PARTIEN ÄNDERN DEN STAND NICHT ===');
K.eval(`
  // Die zwei, die hinter ihm liegen, gewinnen sechzig Mal: ihre
  // Karriere-Elo zieht an ihm vorbei, und ein Rang, der heute gerechnet
  // würde, verschöbe sich.
  const _av = getSeasonAvgElos();
  const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id).sort((a, b) => (_av[b] ?? 0) - (_av[a] ?? 0));
  const _neu = [];
  for(let i = 0; i < 60; i++) _neu.push({id:'neu' + i, a1:_o[1], a2:_o[2], b1:_o[3 + i % 4], b2:_o[7 + i % 4], a1_pos:'atk', a2_pos:'def',
    b1_pos:'atk', b2_pos:'def', score_a:10, score_b:0, winner:'A', exp_a:0.5,
    created_at:new Date(Date.parse('2026-08-27T08:00:00Z') + i * 60000).toISOString(), deltas:{}});
  matches = matches.concat(_neu);
  const _rc = simulateEloWithSliders(matches);
  const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
  matches.forEach(m => { m.deltas = _d[m.id] || {}; });
  invalidateCache();
  // Wie ein frischer Start der App: der eingefrorene Stand wird neu gerechnet,
  // jetzt mit Partien nach dem Karriereende im Bestand.
  _ruheStandMemo.clear();
`);
const NEU = stand();
// Nach dem Karriereende erzählt keine Story mehr von ihm — außer der vom
// Abschied selbst.
{
  const spaeter = J(`_buildStories().filter(s => +new Date(s.when) > Date.parse('${ENDE}')
    && (s.dataRef||{}).type !== 'karriereende' && JSON.stringify(s).includes('${MARTIN}')).map(s => s.id)`);
  const alle = J(`_buildStories().filter(s => +new Date(s.when) > Date.parse('${ENDE}')).length`);
  ok(alle > 0 && spaeter.length === 0, 'nach dem Karriereende nennt ihn keine neue Story', alle + ' neue Stories · ' + (spaeter.join(', ') || 'keine mit ihm'));
}
ok(!J(`Object.values(allChronicles(ruhestandMs('${MARTIN}')).byId).some(r => (r.pids||[]).includes('${MARTIN}'))`)
   && !J(`prestigeTabelle(ruhestandMs('${MARTIN}')).rang.includes('${MARTIN}')`),
   'auch mit Partien danach kommt der Schnitt am Karriereende aus der aktiven Liga');
ok(gleich(VOR.prestige, NEU.prestige), 'Prestige unverändert nach Partien anderer');
ok(gleich(VOR.rang, NEU.rang) && Math.abs(J(`rangPerzentil('${MARTIN}')`) - vorPerz) < 1e-9,
   'Rang und Perzentil unverändert nach Partien anderer', J(`rangPerzentil('${MARTIN}')`).toFixed(1) + ' %');
ok(gleich(VOR.rekorde, NEU.rekorde), 'die Rekorde unverändert nach Partien anderer');

console.log('\n=== DIE RÜCKKEHR ===');
// Wer zurückkehrt, steht in der Liga von HEUTE, nicht im Stand seines
// Abschieds: die Rekorde haben sich in der Pause weiterbewegt. Die sechzig
// Siege der beiden anderen schlagen einen Teil seiner Bestwerte, und andere
// Werte werden seine, weil das Feld dort schwächer geworden ist. Was er
// selbst geholt hat — Auszeichnungen und Monatschroniken —, bleibt.
K.eval(`pmap()['${MARTIN}'].retired_at = null; invalidateCache();`);
ok(J('Object.keys(getAllPlayerRanks())').includes(MARTIN), 'zurück in der Ewigen Tafel');
{
  const Z = stand();
  const live = J(`Object.values(allChronicles().byId).filter(r => (r.pids||[]).includes('${MARTIN}')).map(r => r.id)`);
  const weg = VOR.rekorde.filter(x => !Z.rekorde.includes(x));
  ok(weg.length > 0 && gleich(Z.rekorde.slice().sort(), live.slice().sort()),
     'nach der Rückkehr hält er die Rekorde, die ihm heute gehören, nicht die vom Abschied',
     'weg: ' + weg.join(', ') + ' · neu: ' + Z.rekorde.filter(x => !VOR.rekorde.includes(x)).join(', '));
  ok(Z.prestige.teile.auszeichnung === VOR.prestige.teile.auszeichnung && Z.prestige.teile.monat === VOR.prestige.teile.monat
     && Z.prestige.teile.rekord !== VOR.prestige.teile.rekord
     && Z.prestige.punkte === Z.prestige.teile.auszeichnung + Z.prestige.teile.monat + Z.prestige.teile.rekord,
     'sein Prestige rechnet die Rekorde neu, Auszeichnungen und Chroniken bleiben',
     VOR.prestige.punkte + ' beim Abschied, ' + Z.prestige.punkte + ' zurück');
}
K.eval(`matches = matches.filter(m => !/^neu/.test(m.id)); invalidateCache();`);
ok(gleich(VOR.prestige, stand().prestige), 'ohne Partien in der Pause steht er mit genau dem Prestige von vorher da');

console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
process.exit(fails ? 1 : 0);
