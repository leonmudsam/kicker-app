// ╔═══ §3.8 ─── WOCHEN- UND TAGESRÜCKBLICK ──────────────────────────────╗
//     Die Rückblicke auf den Spieler der Woche und des Tages: Blatt,
//     Auto-Trigger am Wochenanfang und nach dem Spieltag. Bauteile aus
//     05b-recap-teile.js [§C31], Sieger aus _periodeRangliste.
// ╚═════════════════════════════════════════════════════════════════════════╝
// HIER BEGINNT DER KORRIGIERTE showPotwRecap FUNKTIONSBLOCK
// opts.auto=true → Schutz-Phase aktiv (gegen versehentliches Schließen beim
// Auto-Trigger am Wochenanfang). Beim manuellen Aufruf via Hall-of-Fame-Button
// bleibt opts.auto leer → keine Schutz-Phase, sofort schließbar.
function showPotwRecap(opts){
  opts = opts || {};
  // opts.woche (der Montag als Tagesschlüssel) zeigt eine bestimmte Woche:
  // die Story „Die Woche gehört …" öffnet IHRE Woche, nicht die letzte.
  _sheetSetReopen(()=>showPotwRecap(opts.woche ? {woche:opts.woche} : undefined));
  try{
    const {start:weekStart, end:weekEnd}=opts.woche ? _potwWocheVon(opts.woche) : _potwLastWeekRange();
    const ms=_potwMatchesInRange(weekStart,weekEnd);
    const wkKey=_potwKeyOf(weekStart);
    if(!ms.length){ toast('Letzte Woche keine Spiele','info'); return; }

    // Spieler-Stats für die Woche (inkl. längster Serie innerhalb der Woche)
    const ps={}; // player stats
    const run={}; // current streak
    const defStats={}; // defender stats for 'Eiserne Abwehr'
    const teamGames={}; // for Team of the Week
    const teamWins={};
    const teamEloDeltaRaw={}; // raw Elo delta for teams in this week

    const pm=pmap(); // Player map for quick lookup

    const orderedMatchesForWeek = [...ms].sort((a,b)=>mts(a)-mts(b));

    // Cache-Schlüssel: pro Woche + Match-Count + Cache-Version
    const weekSimKey = 'potwSim_'+wkKey+'_'+matches.length+'_'+_cache.version;
    let weekSim;
    if(_cache._potwSim && _cache._potwSimKey === weekSimKey){
      weekSim = _cache._potwSim;
    } else {
      // Temporäre Elo-Simulation für die Woche, um Team-Elo-Deltas zu erhalten
      // Starte von einem neutralen Zustand, da wir nur die Elo-Änderungen *innerhalb* der Woche wollen
      weekSim = simulateElo(orderedMatchesForWeek, {
        initialState: {
          elo: Object.fromEntries(players.map(p => [p.id, cfg.start_elo])),
          played: Object.fromEntries(players.map(p => [p.id, 0])),
          playedSeason: Object.fromEntries(players.map(p => [p.id, 0])),
          wins: Object.fromEntries(players.map(p => [p.id, 0])),
          losses: Object.fromEntries(players.map(p => [p.id, 0])),
          curStreak: Object.fromEntries(players.map(p => [p.id, 0])),
          bestStreak: Object.fromEntries(players.map(p => [p.id, 0])),
          eloGain: Object.fromEntries(players.map(p => [p.id, 0])),
          eloLoss: Object.fromEntries(players.map(p => [p.id, 0])),
          gd: Object.fromEntries(players.map(p => [p.id, 0])),
          teamElo: {},
          seasonTeamElo: {},
          history: [],
          seasonEndElos: {},
          seasonPlayed: {},
          careerElo: {},
          posTracker: {}, 
          curSeason: null
        },
        startElo: cfg.start_elo
      });
      _cache._potwSim = weekSim;
      _cache._potwSimKey = weekSimKey;
    }

    // History-Lookup einmalig für O(1) Zugriff (statt history.find pro Match)
    const weekHistById = new Map();
    for(let i=0; i<weekSim.history.length; i++){
      weekHistById.set(weekSim.history[i].matchId, weekSim.history[i]);
    }

    orderedMatchesForWeek.forEach(m=>{
      const aWon=m.winner==='A';
      // Player stats
      [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
        if(!ps[id]) ps[id]={wins:0,losses:0,gf:0,ga:0,eloDelta:0,bestStreak:0,defG:0,defGa:0};
        if(run[id]===undefined) run[id]=0;
        const onA=(id===m.a1||id===m.a2);
        const won=(onA&&aWon)||(!onA&&!aWon);
        const gf=onA?m.score_a:m.score_b, ga=onA?m.score_b:m.score_a;
        const d=(m.deltas&&m.deltas[id])||0; // Original delta aus DB
        ps[id].gf+=gf; ps[id].ga+=ga; ps[id].eloDelta+=d;
        if(won){ ps[id].wins++; run[id]=run[id]>=0?run[id]+1:1; }
        else  { ps[id].losses++; run[id]=run[id]<=0?run[id]-1:-1; }
        if(run[id]>ps[id].bestStreak) ps[id].bestStreak=run[id];

        // Defender-Stats
        const pos=id===m.a1?m.a1_pos:id===m.a2?m.a2_pos:id===m.b1?m.b1_pos:m.b2_pos;
        if(pos==='def'){
          if(!defStats[id]) defStats[id]={games:0,goalsAgainst:0};
          defStats[id].games++;
          defStats[id].goalsAgainst+=ga;
        }
      });

      // Team-Stats
      [[m.a1,m.a2,m.winner==='A'],[m.b1,m.b2,m.winner==='B']]
      .forEach(([p1,p2,wonTeam])=>{
        const k=paarKey(p1, p2);
        if(!teamGames[k]) teamGames[k]=0;
        if(!teamWins[k]) teamWins[k]=0;
        if(!teamEloDeltaRaw[k]) teamEloDeltaRaw[k]=0;

        teamGames[k]++;
        if(wonTeam) teamWins[k]++;

        const matchHistoryEntry = weekHistById.get(m.id);
        if (matchHistoryEntry) {
            teamEloDeltaRaw[k] += (matchHistoryEntry.deltas[p1] || 0) + (matchHistoryEntry.deltas[p2] || 0);
        }
      });
    });

    // POTW ermitteln — gleiche Regel wie Achievement (countPeriodWins):
    // Min 5 Siege in der Woche, höchste Winrate gewinnt.
    // Tiebreaker bei Gleichstand auf Winrate: mehr absolute Siege, dann mehr Elo-Delta.
    const candidates = _periodeRangliste(orderedMatchesForWeek, 'woche', true)
      .map(r => [r.id, ps[r.id], r.wr]);

    let potwWinners = [];
    if (candidates.length > 0) {
      const topWr = candidates[0][2];
      // Geteilte POTW: jeder mit ≥ Min-Siegen und gleicher Winrate (mit kleinem Epsilon
      // gegen Floating-Point-Rundungsfehler — analog zu countPeriodWins).
      potwWinners = candidates.filter(c => Math.abs(c[2] - topWr) < 0.001);
    }
    
    if (!potwWinners.length) { toast('Die Vorwoche hat keinen Player of the Week', 'info'); return; }

    const mainPotwPlayerId = potwWinners[0][0];
    const mainPotwStats = potwWinners[0][1];
    const mainPotwPlayer = pm[mainPotwPlayerId];
    if (!mainPotwPlayer) { toast('Die Vorwoche hat keinen Player of the Week', 'info'); return; }

    const weekLabel='KW '+isoWeek(weekStart);
    const sundayDate=new Date(weekEnd);
    const dateRange=datumFmt(weekStart, 'tm')
      +'–'+datumFmt(sundayDate, 'tm');
    const games=mainPotwStats.wins+mainPotwStats.losses;
    const winrate=games?Math.round((mainPotwStats.wins/games)*100):0;
    const eloDelta=Math.round(mainPotwStats.eloDelta);
    const eloDeltaStr=(eloDelta>=0?'+':'')+eloDelta;

    const uniquePlayers=new Set();
    ms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>uniquePlayers.add(id)));
    const totalGoals=ms.reduce((a,m)=>a+(m.score_a||0)+(m.score_b||0),0);

    // Mini-Highlights
    const wkAtk={};
    ms.forEach(m=>{
      const strikersInA = [];
      if (m.a1_pos === 'atk') strikersInA.push(m.a1);
      if (m.a2_pos === 'atk') strikersInA.push(m.a2);

      const strikersInB = [];
      if (m.b1_pos === 'atk') strikersInB.push(m.b1);
      if (m.b2_pos === 'atk') strikersInB.push(m.b2);

      strikersInA.forEach(id => {
          if (!wkAtk[id]) wkAtk[id] = { g: 0, goals: 0 };
          wkAtk[id].g++; wkAtk[id].goals += m.score_a;
      });
      strikersInB.forEach(id => {
          if (!wkAtk[id]) wkAtk[id] = { g: 0, goals: 0 };
          wkAtk[id].g++; wkAtk[id].goals += m.score_b;
      });
    });

    const scorerArr=Object.entries(wkAtk).filter(([,v])=>v.g>=1)
      .map(([id,x])=>({id,gf:x.goals,g:x.g,avg:x.goals/x.g})).sort((a,b)=>b.avg-a.avg||b.gf-a.gf);
    const topScorer=scorerArr[0] && scorerArr[0].gf>0 ? scorerArr[0] : null;

    const bestDefenderArr=Object.entries(defStats)
      .filter(([,s])=>s.games>=2)
      .map(([id,s])=>({id,games:s.games,goalsAgainst:s.goalsAgainst,avg:s.goalsAgainst/s.games}))
      .sort((a,b)=>a.avg-b.avg||a.goalsAgainst-b.goalsAgainst);
    const bestDefender=bestDefenderArr[0];

    const biggestEloGainArr=Object.entries(ps)
      .filter(([id,s])=>s.wins+s.losses > 0 && sichtbar(pm[id]))
      .sort((a,b)=>b[1].eloDelta-a[1].eloDelta);
    const biggestEloGain=biggestEloGainArr[0];

    let topUpset=null;
    for(const m of ms){
      const sp=m.exp_a==null?0.5:m.exp_a;
      const winSp=m.winner==='A'?sp:(1-sp);
      if(winSp<CHANCE_OFFEN && (!topUpset || winSp<topUpset.sp)) topUpset={m,sp:winSp};
    }
    const upsetNames=topUpset?
      (topUpset.m.winner==='A'?[pname(topUpset.m.a1),pname(topUpset.m.a2)]:[pname(topUpset.m.b1),pname(topUpset.m.b2)])
      :null;

    const totwCandidates = Object.entries(teamEloDeltaRaw)
      .filter(([k,v]) => {
        const ids = k.split('|');
        return teamGames[k] >= 2 && sichtbar(pm[ids[0]]) && sichtbar(pm[ids[1]]);
      })
      .map(([k,v]) => ({ ids: k.split('|'), eloDelta: v, games: teamGames[k], wins: teamWins[k] }))
      .sort((a,b) => b.eloDelta - a.eloDelta || (b.wins/b.games) - (a.wins/a.games));
    const teamOfTheWeek = totwCandidates[0];

    // ─── Darstellung [§C31] ──────────────────────────────────────────
    // Dieselben Bauteile wie im Saison- und im Tages-Rückblick. Vorher
    // stand die ganze Gestaltung hier als Inline-Style: ein eigener Kopf,
    // zwei Avatar-Varianten, vier Zahlenkacheln und eine eigene Kachelform
    // — alles Dinge, die es nebenan schon gab, nur anders aussehend.
    const wkStartMs = weekStart.getTime();
    const hlKacheln = [];
    // Metall, nicht Gold: Gold gehört den Titeln [§C25], und der Titel
    // dieser Seite ist der Spieler der Woche. Fünf golden umrandete Kacheln
    // darunter nehmen ihm genau das weg.
    const hl = (ic, label, name, wert, attr) => hlKacheln.push(rcpKachelHtml(
      name ? {ic, label, name, wert, ton:'metall', attr} : {ic, label, leer:true}));

    hl('handshake', 'Team der Woche',
       teamOfTheWeek ? pname(teamOfTheWeek.ids[0])+' & '+pname(teamOfTheWeek.ids[1]) : null,
       teamOfTheWeek ? teamOfTheWeek.games+' Spiele · '
         +Math.round(teamOfTheWeek.wins/teamOfTheWeek.games*100)+'%' : null,
       `data-potw-award="mvt" data-potw-week="${wkStartMs}"`);
    hl('trendUp', 'Größter Aufwind',
       biggestEloGain ? pname(biggestEloGain[0]) : null,
       biggestEloGain ? '+'+Math.round(biggestEloGain[1].eloDelta)+' Elo' : null,
       biggestEloGain ? `data-potw-player="${esc(biggestEloGain[0])}"` : '');
    hl('ball', 'Torjäger', topScorer ? pname(topScorer.id) : null,
       topScorer ? 'Ø '+komma(topScorer.avg,1)+' Tore' : null,
       `data-potw-award="scorer" data-potw-week="${wkStartMs}"`);
    hl('shieldCheck', 'Eiserne Abwehr', bestDefender ? pname(bestDefender.id) : null,
       bestDefender ? 'Ø '+komma(bestDefender.avg,1)+' Gegentore' : null,
       `data-potw-award="wall" data-potw-week="${wkStartMs}"`);
    hl('bolt', 'Größte Überraschung', (topUpset && upsetNames) ? upsetNames.join(' & ') : null,
       (topUpset && upsetNames) ? Math.round(topUpset.sp*100)+'% Chance' : null,
       `data-potw-award="upset" data-potw-week="${wkStartMs}"`);

    const serieHtml = mainPotwStats.bestStreak >= 3
      ? rcpNotizHtml({ic:'flame',
          text:`Siegesserie von <b class="num">${mainPotwStats.bestStreak}</b> Spielen am Stück`,
          attr:`data-potw-player="${esc(mainPotwPlayerId)}"`})
      : '';

    const geteilt = potwWinners.length > 1;
    openSheet(
      rcpKopfHtml({ic:'weekly', titel:weekLabel,
        marke: geteilt ? 'Players of the Week' : 'Player of the Week',
        meta: rcpMeta([dateRange, ms.length+' Matches', uniquePlayers.size+' Spieler',
                       totalGoals ? totalGoals+' Tore' : ''])})
      + rcpHeldHtml({
          pid: mainPotwPlayerId,
          pids: geteilt ? potwWinners.map(w => w[0]) : null,
          // Ohne Banner: im Schild stünde die Ligaposition von heute, und die
          // hat mit dieser Woche nichts zu tun. Der Reif bleibt — er ist die
          // Laufbahn und gehört zur Person [§C31].
          band:false, px:104, marke:'Spieler der Woche',
          zahlen: rcpZahlenHtml([
            {v:mainPotwStats.wins,   l:'Siege',       ton:'gruen'},
            {v:mainPotwStats.losses, l:'Niederlagen', ton:'rot'},
            {v:winrate+'%',          l:'Quote'},
            {v:eloDeltaStr,          l:'Elo', ton:eloDelta>=0 ? 'gruen' : 'rot'}
          ])})
      + serieHtml
      // Wann die Woche gewonnen wurde und gegen wen [§C31]: die Bilanz
      // allein sagte nicht, ob sie an einem Tag fiel oder über sieben.
      + (geteilt ? '' : rcpAbschnitt('Die Woche von ' + pname(mainPotwPlayerId))
          + rcpWocheHtml(ms, mainPotwPlayerId, weekStart))
      + rcpAbschnitt('Das Feld der Woche') + rcpFeldHtml(ms, mainPotwPlayerId)
      + rcpAbschnitt('Höhepunkte der Woche')
      + `<div class="rcp-awards${hlKacheln.length%2 ? ' ungerade' : ''}">${hlKacheln.join('')}</div>`
      + `<button id="closePotwBtn" class="recap-done-btn">Verstanden</button>`,
      {protectMs: opts.auto ? 2500 : 0});

    const _grab = document.getElementById('sheetGrab');
    if(_grab) _grab.classList.add('grab-pulse');
    _recapMarkSeen('potw_shown_'+wkKey, 'potw:'+wkKey);

    const wurzel = document.getElementById('sheet');
    const zu = document.getElementById('closePotwBtn');
    if(zu) zu.onclick = () => closeSheet();
    wurzel.querySelectorAll('[data-detail]').forEach(el => {
      el.onclick = () => sheetNav(()=>showPlayer(el.dataset.detail));
    });
    // Die Kacheln öffnen das Award-Detail FÜR DIESE WOCHE. Ein inline-onclick
    // ginge nicht: der ganze Code liegt in einer IIFE, showAward steht dort
    // nicht im globalen Namensraum.
    wurzel.querySelectorAll('[data-potw-award]').forEach(el => {
      el.onclick = () => sheetNav(()=>{
        awPeriod = 'week';
        awWeekStart = new Date(+el.dataset.potwWeek);
        showAward(el.dataset.potwAward);
      });
    });
    wurzel.querySelectorAll('[data-potw-player]').forEach(el => {
      el.onclick = () => sheetNav(()=>showPlayer(el.dataset.potwPlayer));
    });
  } catch(e){
    console.error('POTW Recap Fehler:',e);
  }
}

// Auto-Trigger: an Mo/Di der neuen Woche einmal pro Gerät
function autoShowPotwRecap(){
  try{
    const now=new Date();
    const wd=wochentagMo(now);
    if(wd>=2) return;            // nur Mo/Di
    if(!matches.length) return;
    const {start}=_potwLastWeekRange();
    const wkKey=_potwKeyOf(start);
    if(_recapSeen('potw_shown_'+wkKey, 'potw:'+wkKey)) return;
    // Sheet bereits offen?
    const sheetEl=document.getElementById('sheet');
    if(sheetEl && sheetEl.classList.contains('show')) return;
    // Saison-Recap hat Vorrang
    if(seasons.length && now.getDate()<=3){
      const last=seasons[0];
      if(last && last.id!==currentSeason().id && !_recapSeen('recap_shown_'+last.id, 'season:'+last.id)) return;
    }
    if(!potwHasData()) return;
    _autoRecapSeen.add('potw:'+wkKey); // Session-Guard gegen Wiederholung im selben Load
    showPotwRecap({auto:true});
  } catch(e){ console.error('POTW auto:',e); }
}

// Ermittelt den letzten ABGESCHLOSSENEN Spieltag mit einem POTD-Kandidaten
// (min. 3 Siege). Wird vom Auto-Recap, vom Knopf "Letzten Tag ansehen" und vom
// News-Generator gelesen — EINE Rechnung für dieselbe Frage [§C27].
// Kein eigener Cache nötig — Aufruf ist nur 1× pro Render, der Hot-Path ist Profil/Sheet.
function _potdLastDayData(){
  if(!matches.length) return null;
  const now=new Date();
  const todayStart=new Date(now); todayStart.setHours(0,0,0,0);
  // Der laufende Spieltag zählt erst, wenn er vorbei ist — und vorbei ist er um
  // 23:59 [§C33]. Ausgeschlossen war früher JEDER Tag ab Mitternacht, damit der
  // Recap nicht mitten im laufenden Spieltag aufspringt. Damit konnte aber auch
  // die Karte "Spieler des Tages" an ihrem eigenen Spieltag nie entstehen: sie
  // ist auf 23:59 desselben Tages datiert, und diese Quelle nannte um 23:59
  // noch den Tag davor. Gemessen erschien der Sieger des 10.09. erst am 11.09.
  // um 00:00 — wer nach dem Spielen die App öffnete, fand die Schlagzeile
  // seines eigenen Spieltags nicht, und an ihrer Stelle stand der Sieger des
  // vorletzten Spieltags.
  const tagEnde=new Date(now); tagEnde.setHours(23,59,0,0);
  const laeuftNoch=now.getTime()<tagEnde.getTime();
  const byDay={};
  for(const m of matches){
    const d=new Date(m.created_at);
    if(laeuftNoch && d>=todayStart) continue;
    const dk=tagKey(d);
    if(!byDay[dk]) byDay[dk]=[];
    byDay[dk].push(m);
  }
  const days=Object.keys(byDay).sort().reverse();
  if(!days.length) return null;
  // Erstes Datum mit qualifiziertem Kandidat (min. 3 Siege)
  const pm=pmap();
  for(const dk of days){
    const dms=byDay[dk];
    const wins={};
    dms.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>{
      const onA=(id===m.a1||id===m.a2);
      const w=(onA&&m.winner==='A')||(!onA&&m.winner==='B');
      if(!wins[id]) wins[id]=0;
      if(w) wins[id]++;
    }));
    const qualified=Object.entries(wins).some(([id,w])=>w>=3 && sichtbar(pm[id]));
    if(qualified) return {dayKey:dk, dayMatches:dms};
  }
  return null;
}

// Die Partien eines bestimmten Spieltags, in derselben Form wie der letzte.
function _potdTagData(dk){
  const dms=matches.filter(m=>tagKey(m.created_at)===dk);
  return dms.length ? {dayKey:dk, dayMatches:dms} : null;
}
// True wenn es einen abgeschlossenen Spieltag mit ≥3-Siegen-Kandidat gibt (für Button-Sichtbarkeit)
function potdHasData(){ return _potdLastDayData()!==null; }

// Player-of-the-Day Recap: zeigt einmal pro Tag pro Gerät den Sieger des letzten Spieltags.
// Mit opts.force=true (vom "Letzten Tag ansehen"-Button) wird der localStorage-Check und
// das Setzen des "shown"-Flags übersprungen, damit der manuelle Aufruf den Auto-Trigger
// für heute nicht unterdrückt. Zusätzlich wird beim Force-Aufruf die Schutz-Phase
// (protectMs) deaktiviert → manueller Aufruf ist sofort per Backdrop-Klick schließbar.
function showPotdRecap(opts){
  opts = opts || {};
  // opts.tag zeigt einen bestimmten Spieltag: die Story „X ist Spieler des
  // Tages" öffnet IHREN Tag. Ohne ihn war nur der letzte zu erreichen, über
  // den Knopf im Liga-Reiter.
  _sheetSetReopen(()=>showPotdRecap(opts.tag ? {force:true, tag:opts.tag} : undefined));
  try{
    const now=new Date();
    if(!matches.length){ if(opts.force) toast('Noch keine Partien','info'); return; }

    // v9.15 BUGFIX: Der "gesehen"-Guard hing am HEUTIGEN Datum statt am
    // recappten Spieltag. Folge: Gab es dazwischen spielfreie Tage, bekam
    // jeder neue Tag einen frischen Key und derselbe Recap (z.B. "Player of
    // the Day: Dienstag") erschien am Mittwoch UND am Donnerstag erneut.
    // Jetzt ist der Spieltag selbst der Key (analog POTW, das die recappte
    // Woche keyed) → einmal gesehen = nie wieder, egal wie viele spielfreie
    // Tage folgen. Dafür muss der letzte Spieltag VOR dem Guard ermittelt
    // werden (zentral via _potdLastDayData, identisch zum Auto-Trigger).
    const _guardDay=opts.tag ? _potdTagData(opts.tag) : _potdLastDayData();
    if(!_guardDay){ if(opts.force) toast('Noch kein gewerteter Spieltag','info'); return; }
    if(!opts.force && _recapSeen('potd_shown_'+_guardDay.dayKey, 'potd:'+_guardDay.dayKey)) return;

    // Konflikte vermeiden: nicht zeigen wenn ein Sheet offen ist
    // oder der Saison-Recap heute noch ansteht (Vorrang Saison-Recap).
    // Beim manuellen Force-Aufruf werden diese Auto-Trigger-Konflikte übersprungen.
    if(!opts.force){
      const sheetEl=document.getElementById('sheet');
      if(sheetEl && sheetEl.classList.contains('show')) return;
      if(seasons.length && now.getDate()<=3){
        const last=seasons[0];
        if(last && last.id!==currentSeason().id && !_recapSeen('recap_shown_'+last.id, 'season:'+last.id)) return;
      }
      // POTW hat Vorrang am Mo/Di der neuen Woche
      {
        const wd=wochentagMo(now);
        if(wd<2 && potwHasData()){
          const {start}=_potwLastWeekRange();
          if(!_recapSeen('potw_shown_'+_potwKeyOf(start), 'potw:'+_potwKeyOf(start))) return;
        }
      }
    }

    // Letzter Spieltag mit Kandidat — oben bereits ermittelt (Guard).
    const lastDay=_guardDay;
    const lastDayKey=lastDay.dayKey;
    const dayMatches=lastDay.dayMatches;

    // Spieler-Stats für diesen Tag (inkl. längster Serie innerhalb des Tages)
    const ps={};
    const run={};
    const ordered=[...dayMatches].sort((a,b)=>mts(a)-mts(b));
    ordered.forEach(m=>{
      const aWon=m.winner==='A';
      [m.a1,m.a2,m.b1,m.b2].forEach(id=>{
        if(!ps[id]) ps[id]={wins:0,losses:0,gf:0,ga:0,eloDelta:0,bestStreak:0};
        if(run[id]===undefined) run[id]=0;
        const onA=(id===m.a1||id===m.a2);
        const won=(onA&&aWon)||(!onA&&!aWon);
        const gf=onA?m.score_a:m.score_b, ga=onA?m.score_b:m.score_a;
        const d=(m.deltas&&m.deltas[id])||0;
        ps[id].gf+=gf; ps[id].ga+=ga; ps[id].eloDelta+=d;
        if(won){ ps[id].wins++; run[id]=run[id]>=0?run[id]+1:1; }
        else  { ps[id].losses++; run[id]=run[id]<=0?run[id]-1:-1; }
        if(run[id]>ps[id].bestStreak) ps[id].bestStreak=run[id];
      });
    });

    // Player of the Day: min. 3 Siege, Tiebreak via Elo-Delta des Tages.
    const pm=pmap();
    const candidates=_periodeRangliste(ordered, 'tag', true).map(r=>[r.id, ps[r.id]]);
    if(!candidates.length) return;

    const potdId=candidates[0][0];
    const s=candidates[0][1];
    const player=pm[potdId];
    if(!player) return;

    // Datum sprachlich aufbereiten
    const [yy,mm,dd]=lastDayKey.split('-').map(Number);
    const dt=new Date(yy,mm-1,dd);
    const dayStr=dt.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});

    // Anzeige-Werte
    const games=s.wins+s.losses;
    const winrate=games?Math.round((s.wins/games)*100):0;
    const eloDelta=Math.round(s.eloDelta);
    const eloDeltaStr=(eloDelta>=0?'+':'')+eloDelta;

    const uniquePlayers=new Set();
    dayMatches.forEach(m=>[m.a1,m.a2,m.b1,m.b2].forEach(id=>uniquePlayers.add(id)));

    // ─── Höhepunkte des Spieltags ────────────────────────────────────
    // Der Tages-Rückblick zeigte bisher nur den Sieger und vier Zahlen.
    // Ein Spieltag hat aber dieselben Geschichten wie eine Woche, nur
    // kürzer — dieselben drei Kacheln, aus denselben Daten gerechnet.
    const tagAtk = {};
    dayMatches.forEach(m => {
      [[m.a1,m.a1_pos,m.score_a],[m.a2,m.a2_pos,m.score_a],
       [m.b1,m.b1_pos,m.score_b],[m.b2,m.b2_pos,m.score_b]].forEach(([id,pos,tore]) => {
        if(pos !== 'atk') return;
        if(!tagAtk[id]) tagAtk[id] = {g:0, goals:0};
        tagAtk[id].g++; tagAtk[id].goals += tore;
      });
    });
    const tagScorer = Object.keys(tagAtk)
      .map(id => ({id, g:tagAtk[id].g, goals:tagAtk[id].goals, avg:tagAtk[id].goals/tagAtk[id].g}))
      .filter(x => x.goals > 0 && sichtbar(pm[x.id]))
      .sort((a,b) => b.avg - a.avg || b.goals - a.goals)[0];

    const tagAufstieg = Object.keys(ps)
      .filter(id => sichtbar(pm[id]) && ps[id].eloDelta > 0)
      .map(id => ({id, d:Math.round(ps[id].eloDelta)}))
      .sort((a,b) => b.d - a.d)[0];

    let tagUpset = null;
    for(const m of dayMatches){
      const sp = m.exp_a == null ? 0.5 : m.exp_a;
      const chance = m.winner === 'A' ? sp : (1 - sp);
      if(chance < CHANCE_OFFEN && (!tagUpset || chance < tagUpset.chance)) tagUpset = {m, chance};
    }
    const upsetSieger = tagUpset
      ? (tagUpset.m.winner === 'A' ? [tagUpset.m.a1, tagUpset.m.a2] : [tagUpset.m.b1, tagUpset.m.b2])
      : null;

    const tagKacheln = [];
    const tagHl = (ic, label, name, wert, attr) => tagKacheln.push(rcpKachelHtml(
      name ? {ic, label, name, wert, ton:'metall', attr} : {ic, label, leer:true}));
    tagHl('ball', 'Torjäger', tagScorer ? pname(tagScorer.id) : null,
          tagScorer ? 'Ø '+komma(tagScorer.avg,1)+' Tore' : null,
          tagScorer ? `data-potd-player="${esc(tagScorer.id)}"` : '');
    tagHl('trendUp', 'Größter Aufwind', tagAufstieg ? pname(tagAufstieg.id) : null,
          tagAufstieg ? '+'+tagAufstieg.d+' Elo' : null,
          tagAufstieg ? `data-potd-player="${esc(tagAufstieg.id)}"` : '');
    tagHl('bolt', 'Größte Überraschung', upsetSieger ? pname(upsetSieger[0])+' & '+pname(upsetSieger[1]) : null,
          tagUpset ? Math.round(tagUpset.chance*100)+'% Chance' : null,
          upsetSieger ? `data-potd-team="${esc(upsetSieger.slice().sort().join('|'))}"` : '');

    const serieHtml = s.bestStreak >= 3
      ? rcpNotizHtml({ic:'flame',
          text:`Siegesserie von <b class="num">${s.bestStreak}</b> Spielen am Stück`})
      : '';

    openSheet(
      rcpKopfHtml({ic:'trophyDay', marke:'Player of the Day', titel:dayStr,
        meta: rcpMeta([dayMatches.length+' Matches', uniquePlayers.size+' Spieler'])})
      + rcpHeldHtml({pid:potdId, band:false, px:104, marke:'Spieler des Tages',
          zahlen: rcpZahlenHtml([
            {v:s.wins,      l:'Siege',       ton:'gruen'},
            {v:s.losses,    l:'Niederlagen', ton:'rot'},
            {v:winrate+'%', l:'Quote'},
            {v:eloDeltaStr, l:'Elo', ton:eloDelta>=0 ? 'gruen' : 'rot'}
          ])})
      + serieHtml
      // Wie der Tag zustande kam und gegen wen [§C31]: die Bahn ist
      // dasselbe Bild wie im Blatt der Story [§C27].
      + rcpAbschnitt('Der Tag von ' + pname(potdId))
      + _ndTagesbahn(potdId, dayMatches, true) + rcpEloBahnHtml(dayMatches, potdId)
      + rcpAbschnitt('Das Feld des Tages') + rcpFeldHtml(dayMatches, potdId)
      + rcpAbschnitt('Höhepunkte des Tages')
      + `<div class="rcp-awards${tagKacheln.length%2 ? ' ungerade' : ''}">${tagKacheln.join('')}</div>`
      + `<button id="closePotdBtn" class="recap-done-btn">Verstanden</button>`,
      {protectMs: opts.force ? 0 : 2500});

    const _grab = document.getElementById('sheetGrab');
    if(_grab) _grab.classList.add('grab-pulse');

    // Flag SOFORT setzen — sonst löst Wegwischen beim nächsten Laden erneut
    // aus. Beim manuellen Aufruf („Letzten Tag ansehen") NICHT, damit der
    // automatische Rückblick für heute später noch kommen darf.
    if(!opts.force) _recapMarkSeen('potd_shown_'+lastDayKey, 'potd:'+lastDayKey);
    const wurzel = document.getElementById('sheet');
    const zu = document.getElementById('closePotdBtn');
    if(zu) zu.onclick = () => closeSheet();
    wurzel.querySelectorAll('[data-detail],[data-potd-player]').forEach(el => {
      el.onclick = () => sheetNav(()=>showPlayer(el.dataset.detail || el.dataset.potdPlayer));
    });
    wurzel.querySelectorAll('[data-potd-team]').forEach(el => {
      const paar = el.dataset.potdTeam.split('|');
      el.onclick = () => sheetNav(()=>showTeam(paar[0], paar[1]));
    });
  } catch(e){
    console.error('POTD Recap Fehler:',e);
  }
}
