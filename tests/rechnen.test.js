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
// Der Saisonverlauf rechnet jede Saison, in der gespielt wurde, die neueste
// zuerst; die echten Partien reichen über weniger Monate, deshalb hier
// sieben mit je einer Partie am Monatsersten. Dass das Profil sie alle zeigt
// und nicht die letzten fünf, prüft tests/blatt.
const verlauf=K(`(() => {
  players=Array.from({length:4},(_,i)=>({id:'s'+i,name:'Saison '+i,hidden:false,elo:0,atk:.5}));
  const jetzt=new Date();
  matches=Array.from({length:7},(_,k)=>({...window.__partie,id:'v'+k,a1:'s0',a2:'s1',b1:'s2',b2:'s3',
    created_at:new Date(jetzt.getFullYear(),jetzt.getMonth()-6+k,1,0,30).toISOString(),
    deltas:{s0:20,s1:20,s2:-20,s3:-20}}));
  seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const h=computeSeasonHistory('s0');
  return {n:h.length,absteigend:h.every((x,i)=>!i||h[i-1].id>x.id),neueste:!!h[0]&&h[0].id===currentSeason().id};
})()`);
ok(verlauf.n===7&&verlauf.absteigend&&verlauf.neueste,'Der Saisonverlauf zeigt jede Saison mit Partien, die neueste zuerst: '+JSON.stringify(verlauf));
// Was einen ganzen Tag beschreibt, gilt erst, wenn der Tag zu ist. Am 19.10.
// stand „Unschlagbar" für Leon um 14:26 nach dem dritten Sieg im Feed, mit
// Karte und Hinweis, obwohl der Tag noch lief; Comeback-Tag, Zusammenbruch,
// Schwarzer Tag und der Spieler des Tages zählten ebenso vor dem Abend.
// Gespielt wird drei Siege bis 13 Uhr und — im zweiten Fall — eine
// Niederlage um 17 Uhr.
const tag=(uhr,jetzt,mitPleite)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    const p=(id,h,m,a)=>({...window.__partie,id,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,19,h,m)).toISOString(),winner:a?'A':'B',
      score_a:a?10:4,score_b:a?4:10,deltas:{t0:a?20:-20,t1:a?20:-20,t2:a?-20:20,t3:a?-20:20}});
    matches=[p('t1',12,0,1),p('t2',12,30,1),p('t3',13,0,1)].concat(${mitPleite} ? [p('t4',17,0,0)] : []);
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const ev=Object.entries(getBadgeEarnedCache()).flatMap(([mid,l])=>l.map(e=>({mid,pid:e.playerId,b:e.badge.id,ende:e.meta&&e.meta.tagEnde})));
    const n=(pid,b)=>(computeBadges(pid).find(x=>x.id===b)||{}).count||0;
    let karte='';
    try { const s=_buildStories().find(x=>(x.dataRef||{}).badgeId==='unbeatable');
      if(s) karte=new Date(s.when).toISOString().slice(11,16)+(s.dataRef.matchId?' an der Partie':' eigene Karte'); } catch(e){ karte='Fehler '+e.message; }
    return {karte,unschlagbar:n('t0','unbeatable'),schwarz:n('t2','black_day'),zusammenbruch:n('t0','crash_day'),
      comeback:n('t2','comeback_day'),potd:n('t0','potd'),
      ev:ev.filter(e=>['unbeatable','black_day','crash_day','comeback_day'].includes(e.b)).map(e=>e.pid+':'+e.b+'@'+e.mid+(e.ende?'/'+e.ende:'')).sort().join(' ')};
  })()`);
};
const mittag=tag([14,26],0,false), abend=tag([23,59],0,false), pleite=tag([23,59],0,true), pleiteMittag=tag([17,30],0,true);
ok(mittag.unschlagbar===0&&mittag.schwarz===0&&mittag.potd===0&&mittag.ev==='',
  'Um 14:26 ist kein Tag zu: weder Unschlagbar noch Schwarzer Tag noch Spieler des Tages, und keine Vergabe: '+JSON.stringify(mittag));
ok(abend.unschlagbar===1&&abend.schwarz===1&&abend.potd===1&&abend.karte==='23:57 eigene Karte'
  &&abend.ev==='t0:unbeatable@t3/2026-10-19 t1:unbeatable@t3/2026-10-19 t2:black_day@t3/2026-10-19 t3:black_day@t3/2026-10-19',
  'Um 23:59 gilt der Tag, an der letzten Partie, und seine Karte steht am Tagesende für sich statt in der Karte einer Partie: '+JSON.stringify(abend));
ok(pleiteMittag.zusammenbruch===0&&pleiteMittag.comeback===0&&pleiteMittag.ev==='',
  'Nach einer Niederlage um 17 Uhr ist der Tag noch nicht „mit einer Niederlage beendet": '+JSON.stringify(pleiteMittag));
ok(pleite.unschlagbar===0&&pleite.schwarz===0&&pleite.zusammenbruch===1&&pleite.comeback===1
  &&pleite.ev==='t0:crash_day@t4/2026-10-19 t1:crash_day@t4/2026-10-19 t2:comeback_day@t4/2026-10-19 t3:comeback_day@t4/2026-10-19',
  'Mit der Niederlage am Abend ist der Tag nicht unschlagbar, sondern ein Zusammenbruch, und für die Gegner ein Comeback-Tag: '+JSON.stringify(pleite));
// Dieselbe Regel in Liga-Rekorden und Monatschronik: „Der makellose Tag",
// „Der Tagesabschluss", „Der Schlussstrich" und die Tagesquoten fragen nach
// dem ganzen Tag. Ein Vortag mit 22 Partien im Wechsel (die Rekorde zählen
// ab dreißig), dann acht Siege bis 13:30, gefragt um 14:26 und um 23:59.
const tagesRekord=(uhr)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    const p=(id,tag,min,a)=>({...window.__partie,id,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,tag,10,min)).toISOString(),winner:a?'A':'B',
      score_a:a?10:4,score_b:a?4:10,deltas:{t0:a?20:-20,t1:a?20:-20,t2:a?-20:20,t3:a?-20:20}});
    matches=Array.from({length:22},(_,i)=>p('v'+i,18,i*20,i%2===0))
      .concat(Array.from({length:8},(_,i)=>p('r'+i,19,i*30,true)));
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const r=_chronicleCtx().P.t0||{}, m=_seasonTitleCtx('2026-10').P.t0||{};
    return {makellos:r.perfDays||0, abschluss:r.sbN||0, schluss:m.lastG||0, besterTag:m.bestPerfTag||0, tage:m.tagN||0};
  })()`);
};
const rekMittag=tagesRekord([14,26]), rekAbend=tagesRekord([23,59]);
ok(rekMittag.makellos===0&&rekMittag.abschluss===1&&rekMittag.schluss===1&&rekMittag.besterTag===0&&rekMittag.tage===1,
  'Um 14:26 zählt nur der Vortag in Rekorden und Chroniken, die nach dem ganzen Tag fragen: '+JSON.stringify(rekMittag));
ok(rekAbend.makellos===1&&rekAbend.abschluss===2&&rekAbend.schluss===2&&rekAbend.besterTag===8&&rekAbend.tage===2,
  'Um 23:59 zählt der Tag überall mit: '+JSON.stringify(rekAbend));
// Die Ehrung [§11.6f]: zwei Stunden nach der letzten Partie, wenn keine mehr
// kam, mit allem seit der Karte davor. 13:02 und 15:30 sind zwei Runden
// (Karten um 15:02 und um 18:50, die zweite bis zur Partie um 16:50), 13:44
// und 15:40 eine (Karte um 17:40). Und was die Karten zusammen an Prestige
// nennen, ist das Prestige der Auszeichnungen in der Laufbahn.
const ehrung=(zeiten,uhr)=>{
  setNow(Date.UTC(2026,9,19,uhr[0],uhr[1]));
  return K(`(() => {
    players=Array.from({length:4},(_,i)=>({id:'t'+i,name:'Tag '+i,hidden:false,elo:0,atk:.5}));
    matches=${JSON.stringify(zeiten)}.map((z,i)=>({...window.__partie,id:'e'+i,a1:'t0',a2:'t1',b1:'t2',b2:'t3',
      created_at:new Date(Date.UTC(2026,9,19,z[0],z[1])).toISOString(),winner:'A',
      score_a:10,score_b:i%2?9:4,deltas:{t0:20,t1:20,t2:-20,t3:-20}}));
    seasons=[];cfg={...window.__cfgBasis};invalidateCache();
    const l=_buildStories().filter(s=>(s.dataRef||{}).type==='ehrung').sort((a,b)=>a.when-b.when);
    const bMap=getBadgeEarnedCache();
    const jePartie=mid=>(bMap[mid]||[]).filter(e=>auszeichnungsPunkte(e.badge.id,1)>0).length;
    const summe=pid=>l.reduce((n,s)=>n+((s.dataRef.spieler.find(x=>x.pid===pid)||{}).summe||0),0);
    return {karten:l.map(s=>s.id+'@'+new Date(s.when).toISOString().slice(11,16)+'#'+s.dataRef.zahl),
      partien:matches.map(m=>jePartie(m.id)),
      prestige:['t0','t2'].map(pid=>[Math.round(summe(pid)),Math.round((prestigeOf(pid).teile||{}).auszeichnung||0)])};
  })()`);
};
const zweiRunden=ehrung([[13,2],[15,30],[16,50]],[19,0]);
const nochOffen=ehrung([[13,2],[15,30],[16,50]],[18,0]);
const eineRunde=ehrung([[13,44],[15,40]],[17,40]);
ok(zweiRunden.karten.length===2&&zweiRunden.karten[0].startsWith('ehrung_e0@15:02#')&&zweiRunden.karten[1].startsWith('ehrung_e2@18:50#')
  &&+zweiRunden.karten[0].split('#')[1]===zweiRunden.partien[0]&&+zweiRunden.karten[1].split('#')[1]===zweiRunden.partien[1]+zweiRunden.partien[2],
  'Die Ehrung kommt zwei Stunden nach der letzten Partie einer Runde und zählt alles seit der Karte davor: '+JSON.stringify(zweiRunden));
ok(nochOffen.karten.length===1&&nochOffen.karten[0].startsWith('ehrung_e0@15:02'),
  'Solange die zweite Runde keine zwei Stunden still ist, gibt es nur die erste Karte: '+JSON.stringify(nochOffen.karten));
ok(eineRunde.karten.length===1&&eineRunde.karten[0].startsWith('ehrung_e1@17:40#')&&+eineRunde.karten[0].split('#')[1]===eineRunde.partien[0]+eineRunde.partien[1],
  'Partien mit weniger als zwei Stunden Abstand ergeben eine Karte mit allem seit der ersten: '+JSON.stringify(eineRunde));
ok(zweiRunden.prestige.every(([a,b])=>a>0&&Math.abs(a-b)<=1),
  'Was die Ehrungen an Prestige nennen, ist das Prestige der Auszeichnungen in der Laufbahn: '+JSON.stringify(zweiRunden.prestige));
// Tages- und Wochenkönig zählen den Anteil der eigenen Spieltage, nicht
// die Zahl der Titel [§C28]: wer an 4 von 6 Spieltagen der Beste war, steht
// vor dem, der es an 5 von 12 war.
setNow(Date.UTC(2026,9,19,12,0));
const koenige=K(`(() => {
  const ids=['a','b','q1','q2','q3','q4','o1','o2'];
  players=ids.map(id=>({id,name:'Spieler '+id,hidden:false,elo:0,atk:.5}));
  const ms=[]; let n=0;
  const tag=(pid,datum,sieg)=>{
    const runden=sieg?4:1;
    for(let i=0;i<runden;i++){
      const mit='q'+(i+1), w=sieg;
      ms.push({...window.__partie,id:'k'+(n++),a1:pid,a2:mit,b1:'o1',b2:'o2',
        created_at:new Date(Date.UTC(2026,8,datum,10,i*20)).toISOString(),winner:w?'A':'B',
        score_a:w?10:4,score_b:w?4:10,deltas:{[pid]:w?20:-20,[mit]:w?20:-20,o1:w?-20:20,o2:w?-20:20}});
    }
  };
  [1,2,3,4,5,6].forEach((d,i)=>tag('a',d,i<4));
  [7,8,9,10,11,12,13,14,15,16,17,18].forEach((d,i)=>tag('b',d,i<5));
  matches=ms;seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const l=awardRankings('all').dayKingList.filter(x=>x.id==='a'||x.id==='b');
  return l.map(x=>x.id+':'+x.v+'/'+x.n);
})()`);
ok(koenige.join(' ')==='a:4/6 b:5/12',
  'Der Tageskönig ist, wer den größten Anteil seiner Spieltage gewann, nicht wer die meisten Titel sammelte: '+JSON.stringify(koenige));
// Der Ring am Avatar trägt jeden Zustand, nicht nur den ersten [§13.7]:
// Player of the Week der letzten abgeschlossenen Woche, Player of the Day
// des letzten abgeschlossenen Spieltags. Die Wochen werden nach der Zeit
// verglichen — als Text steht „2027-W10" vor „2027-W9", und der Sieger der
// neunten Woche trug das Zeichen weiter.
setNow(Date.UTC(2027,2,17,12,0));
const ringe=K(`(() => {
  const ids=['a','b','q1','q2','q3','q4','o1','o2'];
  players=ids.map(id=>({id,name:'Spieler '+id,hidden:false,elo:0,atk:.5}));
  const ms=[]; let n=0;
  const siege=(pid,tag,stunde,zahl)=>{
    for(let i=0;i<zahl;i++){
      const mit='q'+(1+i%4);
      ms.push({...window.__partie,id:'r'+(n++),a1:pid,a2:mit,b1:'o1',b2:'o2',
        created_at:new Date(Date.UTC(2027,2,tag,stunde,i*15)).toISOString(),winner:'A',
        score_a:10,score_b:4,deltas:{[pid]:20,[mit]:20,o1:-20,o2:-20}});
    }
  };
  siege('a',2,10,5);   // Woche 9
  siege('b',9,10,5);   // Woche 10, die letzte abgeschlossene
  siege('b',16,10,3);  // Spieltag 16.03., zu
  siege('a',17,9,4);   // heute, noch offen
  matches=ms;seasons=[];cfg={...window.__cfgBasis};invalidateCache();
  const zeig=id=>avRingeOf(id).filter(r=>r.kind==='potw'||r.kind==='potd').map(r=>r.kind+':'+r.sub).join(',');
  const l=avRingeOf('b');
  return {a:zeig('a'),b:zeig('b'),erster:(avRingOf('b')||{}).kind,alle:l.map(r=>r.kind).join(),
    geordnet:l.every((r,i)=>!i||l[i-1].prio>=r.prio)};
})()`);
ok(ringe.b==='potw:Woche 10,potd:Spieltag 16.03.'&&ringe.a===''&&ringe.geordnet&&ringe.erster===ringe.alle.split(',')[0],
  'Der Ring trägt Woche und Tag zugleich, aus der letzten abgeschlossenen Woche und dem letzten abgeschlossenen Spieltag: '+JSON.stringify(ringe));
console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
process.exitCode=fails?1:0;
