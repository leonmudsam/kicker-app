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
let FIXED = new Date('2026-08-27T12:00:00Z').getTime();
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
    // Jedes Schreiben wird mitgeschrieben; `__updFehler` kann eine Antwort
    // der Datenbank vorgeben (eine fehlende Spalte etwa).
    update: (row) => {
      globalThis.__written.push({tbl, upd:row});
      const antwort = Promise.resolve({error: (globalThis.__updFehler && globalThis.__updFehler(row)) || null});
      antwort.eq = () => antwort;
      return {eq: () => antwort};
    },
    select: () => ({ order: async () => ({data:[], error:null}),
      // Die Zählung der Partien eines Spielers fragt die Datenbank, nicht
      // die geladene Liste; hier steht dafür ein eigener Bestand.
      or: async (f) => {
        const id = (String(f).match(/\.eq\.([^,]+)/) || [])[1];
        if(globalThis.__dbFehler) return {count:null, error:{message:'netz'}};
        const n = (globalThis.__dbPartien || []).filter(m => [m.a1, m.a2, m.b1, m.b2].includes(id)).length;
        return {count:n, error:null};
      } }),
    delete: () => ({ lt: async () => ({error:null}),
      eq: async (k, v) => { globalThis.__written.push({tbl, geloescht:v}); return {error:null}; } })
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
// Auszeichnungen, Rekorde und Platz wie beim Abschied. Die Chroniken ohne
// den Monat, der beim Abschied noch lief: die Liga vergleicht ihn ohne ihn,
// und die Matrix im Profil zeigt ihn nicht [§C40].
ok(NACH.prestige.teile.auszeichnung === VOR.prestige.teile.auszeichnung && NACH.prestige.teile.rekord === VOR.prestige.teile.rekord
   && NACH.prestige.platz === VOR.prestige.platz && NACH.prestige.teile.monat <= VOR.prestige.teile.monat
   && NACH.prestige.punkte === NACH.prestige.teile.auszeichnung + NACH.prestige.teile.monat + NACH.prestige.teile.rekord,
   'Auszeichnungen, Rekorde und Platz wie beim Abschied, die Chroniken ohne den laufenden Monat',
   VOR.prestige.punkte + ' vorher, ' + NACH.prestige.punkte + ' P eingefroren');
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
// Das Tor des Feeds: die Regel steht an einer Stelle und nicht je
// Story-Typ. Ein neuer Typ, der sie nicht kennt, kommt trotzdem nicht durch —
// weder aus dem Generator noch als Zeile aus der Datenbank.
{
  const nach = new Date(Date.parse(ENDE) + 3600e3).toISOString();
  const vor = new Date(Date.parse(ENDE) - 3600e3).toISOString();
  const ANDERER = IDS[NAMES.indexOf('Leon')];
  K.eval(`globalThis.__neu = [
    {id:'neu_nach', cat:'tafel', title:'a', desc:'a', prio:40, when:new Date('${nach}'), dataRef:{type:'neu_typ', verfolger:[{pid:'${MARTIN}', wert:3}]}},
    {id:'neu_vor', cat:'tafel', title:'b', desc:'b', prio:40, when:new Date('${vor}'), dataRef:{type:'neu_typ', playerIds:['${MARTIN}']}},
    {id:'neu_anderer', cat:'tafel', title:'c', desc:'c', prio:40, when:new Date('${nach}'), dataRef:{type:'neu_typ', playerIds:['${ANDERER}']}}];`);
  const ids = J('ohneStoriesNachAbschied(__neu).map(s => s.id)');
  ok(gleich(ids, ['neu_vor', 'neu_anderer']), 'ein neuer Story-Typ ohne eigene Abfrage nennt ihn nach dem Karriereende nicht, auch nicht in einer Liste',
     ids.join(', '));
  // Eine echte Karte mit ihm, als käme sie nach dem Karriereende aus der Datenbank.
  const alt = J(`_buildStories().find(s => +new Date(s.when) < Date.parse('${ENDE}') && (s.dataRef||{}).type === 'spiel'
    && JSON.stringify(s.dataRef).includes('${MARTIN}'))`);
  K.eval(`globalThis.__db = Object.assign({}, ${JSON.stringify(alt)}, {id:'db_nach_abschied', when:new Date('${nach}')});
    globalThis.__db0 = Object.assign({}, ${JSON.stringify(alt)}, {when:new Date(${JSON.stringify(alt && alt.when)})});`);
  ok(!!alt && !J(`JSON.stringify(_consolidateStories([__db])).includes('${MARTIN}')`)
     && J(`JSON.stringify(_consolidateStories([__db0])).includes('${MARTIN}')`),
     'im Feed fällt eine Zeile nach dem Karriereende, die von vorher bleibt', alt && alt.id);
}
ok(!J(`Object.values(allChronicles(ruhestandMs('${MARTIN}')).byId).some(r => (r.pids||[]).includes('${MARTIN}'))`)
   && !J(`prestigeTabelle(ruhestandMs('${MARTIN}')).rang.includes('${MARTIN}')`),
   'auch mit Partien danach kommt der Schnitt am Karriereende aus der aktiven Liga');
ok(gleich(NACH.prestige, NEU.prestige), 'Prestige unverändert nach Partien anderer');
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

console.log('\n=== DER GESPEICHERTE STAND ===');
// Gerechnet hielt der eingefrorene Stand nur, solange die App dieselbe
// blieb: ein neuer Eintrag im Katalog veränderte das Profil eines Spielers,
// der nie wieder gespielt hat. Der Stand wird beim Karriereende gespeichert
// und danach gelesen, nicht gerechnet.
(async () => {
  const schreibe = () => globalThis.__written.filter(w => w.upd);
  const vorSchreiben = schreibe().length;
  const r = await K.eval(`karriereSetzen('${MARTIN}', true)`);
  const zeile = schreibe().slice(vorSchreiben)[0] || {};
  const st = zeile.upd && zeile.upd.retired_stand;
  ok(r.ok && !r.ohneStand && st && st.v === 1 && st.t === Date.parse(zeile.upd.retired_at)
     && st.stand && st.stand.prestige && Array.isArray(st.badges) && st.badges.length > 5,
     'das Karriereende schreibt Zeitpunkt und Stand in EINEM Schreiben',
     JSON.stringify({ok:r.ok, t:st && st.t, badges:st && st.badges.length}));
  // So, wie es die Datenbank zurückgibt: als Text-JSON.
  K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.upd.retired_at)};
          pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))};
          invalidateCache(); _ruheStandMemo.clear(); delete _cache._ruheSig;`);
  const gespeichert = J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,teile:p.teile}))(prestigeOf('${MARTIN}'))`);
  // Das Prestige zählt die Chroniken, die das Profil zeigt [§C32]. Der Monat
  // des Karriereendes war noch offen und vergleicht ohne ihn: seine
  // vorläufige Chronik steht nicht in der Matrix, also auch nicht im Stand.
  const matrix = J(`(seasonTitleHistory('${MARTIN}') || []).filter(r => r.title).map(r => r.sid)`);
  ok(st.stand.prestige.zahlen.monat === matrix.length,
     'der Stand zählt genau die Monatschroniken, die das Profil zeigt — ohne den Monat, der beim Abschied noch lief',
     st.stand.prestige.zahlen.monat + ' gezählt, ' + matrix.length + ' in der Matrix (' + matrix.join(', ') + ')');
  ok(gespeichert.punkte === st.stand.prestige.punkte && J(`_ruheStandMemo.size`) === 0 && !J(`!!_cache._ruheSig`),
     'mit gespeichertem Stand rechnet weder der Abdruck über die Partien noch die Zeitmaschine', JSON.stringify(gespeichert));
  // Eine neue Fassung der App: eine Auszeichnung, die jeder hat, der je
  // gespielt hat, und ein höherer Startwert für die seltenen.
  K.eval(`BADGES.push({id:'zz_neu', ic:'star', name:'Neu im Katalog', desc:'Eine Partie', count:(id, q) => q.some(m => [m.a1,m.a2,m.b1,m.b2].includes(id)) ? 1 : 0});
          globalThis.__rareAlt = PRESTIGE_AUSZEICHNUNG.rare.start; PRESTIGE_AUSZEICHNUNG.rare.start += 40;
          // Eine neue Fassung ist ein frischer Start: nichts ist gemerkt.
          invalidateCache(); _ruheStandMemo.clear();`);
  const andere = IDS.find(id => id !== MARTIN && J("getCachedBadges('" + id + "').length") > 0);
  const nachher = J(`(p=>({punkte:p.punkte,stufe:p.stufe,grad:p.grad,teile:p.teile}))(prestigeOf('${MARTIN}'))`);
  ok(J(`getCachedBadges('${andere}').some(b => b.id === 'zz_neu')`) && !J(`getCachedBadges('${MARTIN}').some(b => b.id === 'zz_neu')`)
     && gleich(nachher, gespeichert) && gleich(J(`getCachedBadges('${MARTIN}').map(b=>b.id+b.count)`), st.badges.map(b => b.id + b.count)),
     'eine neue Fassung der App verändert das Profil eines Ruheständlers nicht: keine neue Auszeichnung, dasselbe Prestige',
     JSON.stringify({nachher:nachher.punkte, vorher:gespeichert.punkte}));
  // Eine Stufe mehr in der Leiter: die gespeicherte Zahl zeigte danach auf
  // den Nachbarn. Der Schlüssel der Stufe gilt, die Zahl folgt ihm.
  {
    const key = st.stand.prestige.insignie.key;
    K.eval(`INSIGNIEN.splice(1, 0, {key:'zz_zwischen', name:'Zwischenreif', min:300}); _ruheGespeichertMemo.clear(); invalidateCache();`);
    const p = J(`(p=>({key:p.insignie.key, stufe:p.stufe}))(prestigeOf('${MARTIN}'))`);
    K.eval(`INSIGNIEN.splice(1, 1); _ruheGespeichertMemo.clear(); invalidateCache();`);
    ok(p.key === key && p.stufe === st.stand.prestige.stufe + 1 && J(`prestigeOf('${MARTIN}').stufe`) === st.stand.prestige.stufe,
       'eine neue Stufe in der Leiter verschiebt sein Zeichen nicht', key + ': Stufe ' + st.stand.prestige.stufe + ' → ' + p.stufe + ' mit der neuen');
  }
  // Das Feld spielt weiter: dreißig Partien der anderen verschieben jeden
  // Platz darin, sein Fingerabdruck bleibt der vom Abschied.
  {
    K.eval(`globalThis.__mAlt = matches;
      const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id);
      matches = matches.concat(Array.from({length:30}, (_, i) => ({id:'fa' + i, a1:_o[i % 3], a2:_o[3 + i % 3], b1:_o[6 + i % 3], b2:_o[9 + i % 2],
        a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def', score_a:10, score_b:0, winner:'A', exp_a:0.5,
        created_at:new Date(Date.parse('2026-08-27T09:00:00Z') + i * 60000).toISOString(), deltas:{}})));
      invalidateCache();`);
    const jetzt = J(`fingerabdruck('${MARTIN}')`);
    K.eval(`globalThis.__stAlt = pmap()['${MARTIN}'].retired_stand; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
    const live = J(`fingerabdruck('${MARTIN}')`);
    K.eval(`pmap()['${MARTIN}'].retired_stand = __stAlt; matches = __mAlt; invalidateCache();`);
    ok(Array.isArray(st.finger) && gleich(jetzt, st.finger) && !gleich(live, st.finger),
       'der Fingerabdruck bleibt der vom Abschied, auch wenn das Feld weiterspielt',
       st.finger ? st.finger.map(a => a.id + ' ' + Math.round(a.perz * 100)).join(', ') : 'nicht gespeichert');
  }
  // Gegenprobe: ohne gespeicherten Stand folgt das Profil der neuen Fassung.
  K.eval(`pmap()['${MARTIN}'].retired_stand = null; _ruheStandMemo.clear(); invalidateCache();`);
  const gerechnet = J(`prestigeOf('${MARTIN}').punkte`);
  ok(gerechnet !== gespeichert.punkte, 'ohne gespeicherten Stand hätte die neue Fassung das Prestige verschoben',
     gespeichert.punkte + ' gespeichert, ' + gerechnet + ' gerechnet');
  K.eval(`BADGES.pop(); PRESTIGE_AUSZEICHNUNG.rare.start = globalThis.__rareAlt; invalidateCache(); _ruheStandMemo.clear();`);
  // Ein Stand gehört zu genau einem Karriereende.
  K.eval(`pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(st))};
          pmap()['${MARTIN}'].retired_at = '2026-08-20T12:00:00Z'; invalidateCache();`);
  ok(J(`ruhestandAuszeichnungen('${MARTIN}')`) === null, 'ein geändertes Karriereende verwirft den gespeicherten Stand');
  // Ein Karriereende aus der Zeit vor der Spalte bekommt den Stand nachgetragen.
  K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.upd.retired_at)}; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
  const vorNach = schreibe().length;
  K.eval(`_ruheStandNachtragen(); _ruheStandNachtragen();`);
  const nach = schreibe().slice(vorNach);
  ok(nach.length === 1 && nach[0].upd.retired_stand && nach[0].upd.retired_stand.t === st.t && !('retired_at' in nach[0].upd),
     'ein Karriereende ohne Stand bekommt ihn einmal nachgetragen und behält seinen Zeitpunkt', String(nach.length));
  // Fehlt die Spalte des Stands, gilt das Karriereende trotzdem.
  K.eval(`pmap()['${MARTIN}'].retired_at = null; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
  globalThis.__updFehler = row => 'retired_stand' in row ? {message:'column "retired_stand" of relation "players" does not exist', code:'42703'} : null;
  const vorFehlt = schreibe().length;
  const r2 = await K.eval(`karriereSetzen('${MARTIN}', true)`);
  globalThis.__updFehler = null;
  const w2 = schreibe().slice(vorFehlt);
  ok(r2.ok && r2.ohneStand && w2.length === 2 && !('retired_stand' in w2[1].upd) && w2[1].upd.retired_at,
     'ohne die Spalte des Stands wird nur der Zeitpunkt geschrieben, und der Hinweis sagt es', JSON.stringify(r2));
  // Die Rückkehr leert beides.
  const vorZur = schreibe().length;
  const r3 = await K.eval(`karriereSetzen('${MARTIN}', false)`);
  const w3 = schreibe().slice(vorZur)[0] || {};
  ok(r3.ok && w3.upd && w3.upd.retired_at === null && w3.upd.retired_stand === null,
     'die Rückkehr leert Zeitpunkt und Stand', JSON.stringify(w3.upd));
  K.eval(`pmap()['${MARTIN}'].retired_at = null; pmap()['${MARTIN}'].retired_stand = null; invalidateCache();`);
})().then(() => {

console.log('\n=== LÖSCHEN NUR OHNE PARTIE ===');
// Wer gespielt hat, trägt die Geschichte von drei anderen mit: gelöscht
// stand in jeder Partie ein Fragezeichen. Gefragt wird die Datenbank, nicht
// die geladene Liste — die ist leer, solange der erste Abruf läuft.
(async () => {
  globalThis.__dbPartien = realMatches;
  const geloescht = () => globalThis.__written.filter(w => w.geloescht).map(w => w.geloescht);
  const r1 = await K.eval(`spielerLoeschen('${MARTIN}')`);
  ok(!r1.ok && r1.grund === 'partien' && r1.zahl > 0 && !geloescht().includes(MARTIN),
     'ein Spieler mit Partien wird nicht gelöscht', JSON.stringify(r1));
  const vorher = K.eval('matches.length');
  K.eval('globalThis.__alle = matches; matches = []');
  const r2 = await K.eval(`spielerLoeschen('${MARTIN}')`);
  K.eval('matches = globalThis.__alle');
  ok(!r2.ok && r2.grund === 'partien' && !geloescht().includes(MARTIN) && K.eval('matches.length') === vorher,
     'auch wenn die geladene Liste leer ist, zählt die Datenbank seine Partien', JSON.stringify(r2));
  globalThis.__dbFehler = true;
  const r3 = await K.eval(`spielerLoeschen('neu-ohne-partie')`);
  globalThis.__dbFehler = false;
  ok(!r3.ok && r3.grund === 'netz' && !geloescht().includes('neu-ohne-partie'),
     'ohne Antwort der Datenbank wird nichts gelöscht', JSON.stringify(r3));
  const r4 = await K.eval(`spielerLoeschen('neu-ohne-partie')`);
  ok(r4.ok && geloescht().includes('neu-ohne-partie'), 'ein Spieler ohne Partie wird gelöscht', JSON.stringify(r4));

  console.log('\n=== ZWEI MONATE SPÄTER, MIT EINER NEUEN FASSUNG DER APP ===');
  // Verglichen wird, was zu LESEN ist: das Profil und jedes Blatt, das von
  // ihm ausgeht, als Text. Nicht einzelne Funktionen — ein Teil des Profils,
  // den es heute noch nicht gibt, fällt damit genauso auf, sobald er etwas
  // zeigt, das sich nach dem Karriereende bewegt.
  {
    const text = h => String(h).replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
    const BLAETTER = [['Profil', 'showPlayer'], ['Laufbahn', 'showLaufbahn'], ['Auszeichnungen', 'showPlayerBadges'],
      ['Bilanzen', 'showPlayerH2HList'], ['Abschied', 'zeigeAbschied']];
    K.eval(`globalThis.__openSheet = openSheet; openSheet = function(h){ globalThis.__blatt.push(h); };`);
    const bild = () => Object.fromEntries(BLAETTER.map(([n, f]) => {
      K.eval(`globalThis.__blatt = []; try { ${f}('${MARTIN}'); } catch(e){ globalThis.__blatt.push('FEHLER ' + e.message); }`);
      return [n, text(K.eval('globalThis.__blatt.join(" | ")'))];
    }));
    const vorDiff = (a, b) => { const x = a.split(' '), y = b.split(' '); let i = 0; while(i < x.length && x[i] === y[i]) i++;
      return x.slice(Math.max(0, i - 6), i + 8).join(' ') + '  →  ' + y.slice(Math.max(0, i - 6), i + 8).join(' '); };
    const r = await K.eval(`karriereSetzen('${MARTIN}', true)`);
    const zeile = globalThis.__written.filter(w => w.upd).pop().upd;
    K.eval(`pmap()['${MARTIN}'].retired_at = ${JSON.stringify(zeile.retired_at)};
            pmap()['${MARTIN}'].retired_stand = ${JSON.stringify(JSON.stringify(zeile.retired_stand))}; invalidateCache();`);
    const A = bild();
    // Zwei Monate weiter: die anderen spielen 120 Partien, ein Monat schließt,
    // und die App hat eine neue Auszeichnung, einen neuen Liga-Rekord und
    // einen höheren Startwert der seltenen Auszeichnungen.
    FIXED = new RealDate('2026-10-20T12:00:00Z').getTime();
    K.eval(`
      const _o = players.filter(p => p.id !== '${MARTIN}').map(p => p.id);
      const _neu = [];
      for(let i = 0; i < 120; i++) _neu.push({id:'sp' + i, a1:_o[i % 11], a2:_o[(i + 3) % 11], b1:_o[(i + 5) % 11], b2:_o[(i + 8) % 11],
        a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def', score_a:10, score_b:i % 9, winner:'A', exp_a:0.5,
        created_at:new Date(Date.parse('2026-09-02T10:00:00Z') + i * 11 * 3600e3).toISOString(), deltas:{}});
      matches = matches.concat(_neu);
      const _rc = simulateEloWithSliders(matches);
      const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
      matches.forEach(m => { m.deltas = _d[m.id] || {}; });
      BADGES.push({id:'zz_spaeter', ic:'star', name:'Neu im Katalog', desc:'Eine Partie',
        count:(id, q) => q.some(m => [m.a1,m.a2,m.b1,m.b2].includes(id)) ? 1 : 0});
      CHRONICLES.push(Object.assign({}, CHRONICLES[0], {id:'zz_rekord', name:'Der Neue', val:P => P.games || 0}));
      PRESTIGE_AUSZEICHNUNG.rare.start += 40;
      invalidateCache(); _ruheStandMemo.clear(); _ruheGespeichertMemo.clear();`);
    const B = bild();
    for(const [n] of BLAETTER){
      ok(A[n].length > 200 && A[n] === B[n] && !/FEHLER/.test(A[n]),
         n + ' eines Ruheständlers liest sich zwei Monate und eine Fassung später wie beim Abschied',
         A[n] === B[n] ? A[n].length + ' Zeichen' : vorDiff(A[n], B[n]));
    }
    // Die Woche des Karriereendes lief noch, als er aufhörte: sie vergleicht
    // ohne ihn, wie die Awards derselben Woche. Sonst holte er nach dem
    // Abschied ihren Player of the Week.
    const woche = J(`(() => { const t = ruhestandMs('${MARTIN}'), d = new Date(t);
      const w = _periodWinnerMap(matches, 'week')[d.getFullYear() + '-W' + isoWeek(d)];
      return {w: w || null, hatGespielt: matches.some(m => mts(m) <= t && [m.a1,m.a2,m.b1,m.b2].includes('${MARTIN}')
        && (new Date(m.created_at).getFullYear() + '-W' + isoWeek(new Date(m.created_at))) === (d.getFullYear() + '-W' + isoWeek(d)))}; })()`);
    ok(woche.hatGespielt && woche.w !== MARTIN, 'die Woche, in der er aufhörte, gewinnt er nach dem Abschied nicht mehr',
       'Sieger ' + (woche.w ? nm(woche.w) : 'keiner'));
    K.eval(`openSheet = globalThis.__openSheet; BADGES.pop(); CHRONICLES.pop();`);
  }
  console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
  process.exit(fails ? 1 : 0);
})();
});
