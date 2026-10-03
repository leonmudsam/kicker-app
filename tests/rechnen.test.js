// Rechen- und Cache-Regressionsprüfungen ohne Browser oder Backend.
// Der ausgelieferte Code ist die einzige Rechenquelle; erwartet werden nur
// unabhängig nachzählbare Ergebnisse, nicht eine zweite Elo-Implementierung.
const fs=require('node:fs');
const {K,setNow}=require('./runtime.js').createRuntime();
let checks=0,fails=0;
const ok=(condition,message)=>{checks++;if(!condition)fails++;console.log((condition?'  ok  ':'  ✗   ')+message)};
K(`players=Array.from({length:4},(_,i)=>({id:'p'+i,name:'Spieler '+i,hidden:false,elo:0,atk:.5}));
  matches=[];seasons=[];invalidateCache();
  window.__cfgBasis={...cfg};window.__partie={id:'eins',a1:'p0',a2:'p1',b1:'p2',b2:'p3',
    a1_pos:'atk',a2_pos:'def',b1_pos:'atk',b2_pos:'def',score_a:10,score_b:0,winner:'A',
    created_at:new Date().toISOString(),exp_a:.5,deltas:{p0:21,p1:19,p2:-20,p3:-18}};`);
const nullwerte=K(`(() => {
  cfg={...window.__cfgBasis,match_bonus:0,mov_loss_damp:0,pos_swing:0,risk_split:0,
    underdog_elo_max:0,underdog_games_max:0};invalidateCache();
  const h=simulateEloWithSliders([window.__partie]).history[0];
  return {bonus:Object.values(h.breakdowns).every(b=>b.matchBonus===0),
    mov:Object.values(h.breakdowns).filter(b=>!b.won).every(b=>b.movMult===1),
    sieger:h.deltas.p0===38 && h.deltas.p1===38,verlierer:h.deltas.p2===-24 && h.deltas.p3===-24};
})()`);
for(const [key,value]of Object.entries(nullwerte))ok(value,'Explizite Null in den Elo-Einstellungen: '+key);
const defaults=K(`(() => {
  cfg={...window.__cfgBasis};const normal=simulateEloWithSliders([window.__partie]).history[0];
  cfg={...window.__cfgBasis,match_bonus:null,mov_loss_damp:null};
  const leer=simulateEloWithSliders([window.__partie]).history[0];
  delete cfg.match_bonus;delete cfg.mov_loss_damp;
  const fehlt=simulateEloWithSliders([window.__partie]).history[0];
  return {null:JSON.stringify(normal.deltas)===JSON.stringify(leer.deltas),
    fehlt:JSON.stringify(normal.deltas)===JSON.stringify(fehlt.deltas)};
})()`);
for(const [key,value]of Object.entries(defaults))ok(value,'Nur fehlende Einstellungen verwenden den Standard: '+key);
const kanonisch=K(`(() => {
  cfg={...window.__cfgBasis};matches=[{...window.__partie}];invalidateCache();
  const vorher=JSON.stringify(matches[0].deltas),sim=getGlobalSim();
  const db=JSON.stringify(sim.history[0].deltas)===vorher && sim.elo.p0===21 && sim.elo.p2===-20;
  cfg={...cfg,k_factor:64,match_bonus:0,mov_loss_damp:0};invalidateCache(['global']);
  const nachher=getGlobalSim();
  const stabil=JSON.stringify(nachher.history[0].deltas)===vorher && JSON.stringify(matches[0].deltas)===vorher;
  const gerechnet=simulateEloWithSliders(matches).history[0];
  return {db,stabil,einmal:Object.values(gerechnet.breakdowns).every(b=>gerechnet.deltas[b.playerId]===Math.round(b.finalDelta)),
    team:nachher.teamElo['p0|p1']===40 && nachher.teamElo['p2|p3']===-38,
    perioden:periodPlayerStats('all').every(p=>p.eloNet===matches[0].deltas[p.id])};
})()`);
for(const [key,value]of Object.entries(kanonisch))ok(value,'DB-Deltas bleiben die gemeinsame Elo-Quelle: '+key);
const h2h=K(`(() => {
  cfg={...window.__cfgBasis};players=players.map(p=>({...p,hidden:false}));
  matches=[{...window.__partie}];invalidateCache();
  const eins=playerH2HList('p0',1),warm=playerH2HList('p0',1)===eins;
  const min=playerH2HList('p0',2).length===0;
  matches=matches.concat({...window.__partie,id:'zwei'});invalidateCache(['global','stats','badges']);
  const zwei=playerH2HList('p0',1),add=zwei.every(p=>p.total===2) && zwei.length===3;
  const schwelle=playerH2HList('p0',2).length===3;
  matches=matches.map(m=>({...m,winner:'B'}));invalidateCache(['stats']);
  const edit=playerH2HList('p0',1).every(p=>p.teamW===0 && p.oppW===0);
  players=players.map(p=>p.id==='p1'?{...p,hidden:true}:p);invalidateCache(['stats']);
  const hidden=playerH2HList('p0',1).every(p=>p.oid!=='p1');
  matches=matches.slice(0,1);invalidateCache(['stats']);
  const weg=playerH2HList('p0',1).every(p=>p.total===1);
  for(let i=0;i<100;i++){invalidateCache(['stats']);playerH2HList('p0',1)}
  const begrenzt=Object.keys(_cache._h2hList).length<=80;
  return {warm,min,add,schwelle,edit,hidden,weg,begrenzt};
})()`);
for(const [key,value]of Object.entries(h2h))ok(value,'H2H-Listen bleiben aktuell und begrenzt: '+key);
K(`players=players.map(p=>({...p,hidden:false}));matches=[{...window.__partie}];invalidateCache();`);
const zeit=K(`({tag:periodPlayerStats('day').length,woche:periodPlayerStats('week').length})`);
K(`periodPlayerStats('day')`);
setNow(new Date(2026,7,27,21).getTime());
ok(zeit.tag===4 && K(`matchesInPeriod('day').length===0 && periodPlayerStats('day').length===0`),
  'Tagesstatistik folgt dem kanonischen Zeitraum auch ohne neue Partie');
K(`periodPlayerStats('week')`);
setNow(new Date(2026,7,31,21).getTime());
ok(zeit.woche===4 && K(`matchesInPeriod('week').length===0 && periodPlayerStats('week').length===0`),
  'Wochenstatistik folgt dem kanonischen Zeitraum auch ohne neue Partie');
setNow(new Date(2026,7,26,21).getTime());
K(`window.__periodeAll=periodPlayerStats('all');window.__periodeVersion=_cache.version;`);
setNow(new Date(2026,8,1,0,1).getTime());
ok(K(`periodPlayerStats('all').every(p=>p.elo===cfg.start_elo) && _cache.version===window.__periodeVersion`),
  'Unveränderte Allzeit-Bilanz zeigt nach Monatswechsel die zurückgesetzte aktuelle Elo');
ok(K(`periodPlayerStats('all').every(p=>p.eloNet===window.__periodeAll.find(v=>v.id===p.id).eloNet)`),
  'Monatswechsel verändert keine historische Allzeit-Bilanz');
setNow(new Date(2026,7,26,21).getTime());
const erwartung=K(`(() => {
  matches=[{...window.__partie,exp_a:0}];invalidateCache();const m=matches[0];
  const a=myExp('p0',m),b=myExp('p2',m),s=getGlobalSim(),duo=teamDetail('p0','p1');
  const badge=BADGES.find(b=>b.id==='upset_king'),erhalten=badgesEarnedInMatch(m.id);
  return {null:a===0 && b===1,engine:a===s.history[0].expA,
    duo:duo.biggestUpset?.expected===a,
    quote:posPerfFrom('p0',matches).aPerfAvg===1-a,
    badge:badge.count('p0',matches)===1,
    trigger:['p0','p1'].every(pid=>erhalten.some(e=>e.playerId===pid && e.badge.id==='upset_king')),
    keineDoppelung:erhalten.filter(e=>e.badge.id==='upset_king').length===2};
})()`);
for(const [key,value]of Object.entries(erwartung))ok(value,'Grenzwerte der gespeicherten Erwartung stimmen überall: '+key);

// Das echte Liga-Fixture enthält Gruppen mit Bruchteilen aus Wiederholungs-
// und Wurzeldämpfung. Gerade dort muss die sichtbare Aufteilung dieselbe
// sein wie im Laufbahnblatt, nicht drei unabhängig gerundete Kopfzahlen.
const names=['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const ids=names.map((_,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const fixture=fs.readFileSync(__dirname+'/fixtures/matches.txt','utf8').trim().split(';').map((row,i)=>{
  const f=row.split(',').map(Number),pos=k=>f[4+k]===0?'atk':'def';
  return{id:'m'+i,a1:ids[f[0]],a2:ids[f[1]],b1:ids[f[2]],b2:ids[f[3]],
    a1_pos:pos(0),a2_pos:pos(1),b1_pos:pos(2),b2_pos:pos(3),score_a:f[8],score_b:f[9],
    winner:f[10]===0?'A':'B',exp_a:f[11]/1000,created_at:new Date(f[12]*1000).toISOString(),deltas:{}};
});
K(`players=${JSON.stringify(names.map((name,i)=>({id:ids[i],name,hidden:false,elo:0,atk:.5})))};
  matches=${JSON.stringify(fixture)};seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const fixtureDeltas=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h.deltas]));
  matches.forEach(m=>m.deltas=fixtureDeltas.get(m.id)||{});invalidateCache();`);
const prestige=K(`(() => {
  const t=prestigeTabelle(),gruppen=['auszeichnung','monat','rekord'];
  const sums=Object.values(t.byPid).map(p=>{
    const roh=gruppen.map(g=>p.quellen.filter(q=>q.q===g).reduce((s,q)=>s+q.p,0));
    const summe=Object.values(p.teile).reduce((s,q)=>s+q,0);
    return {pid:p.pid,roh,punkte:p.punkte,summe,teile:gruppen.map(g=>p.teile[g]),
      blatt:_prestigeRunden(roh,p.punkte,1)};
  });
  return {summe:sums.every(p=>p.summe===p.punkte),
    gesamt:sums.every(p=>p.punkte===Math.round(p.roh.reduce((s,q)=>s+q,0))),
    profil:sums.every(p=>JSON.stringify(p.teile)===JSON.stringify(p.blatt)),
    story:sums.every(p=>JSON.stringify(gruppen.map(g=>_storyStand().prestige(p.pid).teile[g]))===JSON.stringify(p.blatt)),
    brueche:sums.some(p=>p.roh.some(v=>v!==Math.round(v))),
    cache:t===prestigeTabelle()};
})()`);
for(const [key,value]of Object.entries(prestige))ok(value,'Eine Prestige-Aufteilung für Engine, Story und Laufbahn: '+key);
console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
process.exitCode=fails?1:0;
