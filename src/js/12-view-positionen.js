// ╔═══ §5.2 ─── VIEW: POSITIONS-RANGLISTE ──────────────────────────────╗
//     Spezial-View für Sturm/Abwehr-Rangliste.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Die Rangliste einer Position: eine Rechnung für die Liste und die
// Rollen-Landkarte darüber — zwei Rechnungen über dieselbe Frage nennten
// irgendwann zwei Beste [§C27].
// `spieler` nimmt eine andere Liste als die aktive Liga — die Ruheständler,
// mit derselben Rechnung [§C40].
function positionsListe(pos, spieler){
  const statsMap = allPlayerStats();
  return (spieler || activePlayers()).map(p=>{
    const s = statsMap[p.id] || playerStats(p.id);
    const g  = pos==='atk' ? s.atkG       : s.defG;
    const w  = pos==='atk' ? s.atkW       : s.defW;
    // Positionsspezifische Tor-Stats — kommen aus playerStats (atkGoals, defConceded)
    const goalsSum = pos==='atk' ? (s.atkGoals||0)  : (s.defConceded||0);
    const goalsAvg = g ? goalsSum/g : 0;
    const perf=posPerfFrom(p.id,matches);
    const pAvg=pos==='atk'?perf.aPerfAvg:perf.dPerfAvg;
    const wr=g?w/g:0;
    // Die Rechnung steht in posWert [§5.2] — sie gehoert nicht in eine
    // Ansicht, weil der Liga-Rekord auf dieser Position dieselbe Zahl
    // braucht [§13.1]. Zwei Rechnungen, zwei Beste.
    const score=posWert(pos,g,w,goalsAvg,pAvg);
    return {p,g,w,wr,pAvg:pAvg||0,goalsAvg,score};
  }).filter(x=>x.g>0)
    // Sortierung: Positions-Score (kombiniert WR, Performance, Tor-Bilanz, Erfahrung)
    .sort((a,b)=> b.score-a.score || b.pAvg-a.pAvg || b.wr-a.wr);
}

// Die Zeilen einer Position. `ohneRang` für die Ruheständler [§C40]: sie
// stehen in keiner Rangfolge der aktiven Liga, also trägt die Zeile keinen
// Platz und kein Metall der ersten drei.
function positionsBlockHtml(arr, pos, ohneRang){
  if(!arr.length) return emptyState(pos==='atk'?'bolt':'shield','Noch keine Spiele auf dieser Position');
  // Die Tore stehen in einer eigenen Zeile. Hinter Bilanz, Balken und
  // Quote war bei 360 px kein Platz mehr: „Ø 8,8 T…" brach mitten im Wort
  // ab, und die Bilanz „81–40" stand auf zwei Zeilen.
  const valLbl = pos==='atk' ? 'Tore je Spiel' : 'Gegentore je Spiel';
  return `<div class="rlist">${arr.map((x,i)=>{
    const perfChip = x.pAvg>0.08?'<span class="perf-up">▲</span>':x.pAvg<-0.08?'<span class="perf-dn">▼</span>':'';
    const goalsTxt = komma(x.goalsAvg,1);
    // Die Liste sortiert nach `score`, zeigte als große Zahl aber Ø Tore —
    // dadurch stand 8.8 über 8.9 und die Reihenfolge widersprach sich
    // selbst. Jetzt steht rechts der Wert, nach dem tatsächlich sortiert
    // wird; die Ø-Tore bekommen ihre eigene ruhige Spalte in der Meta-Zeile.
    const wert = Math.round(x.score*100);
    return `<div class="rrow ${!ohneRang&&i<3?'top'+(i+1):''}${ohneRang?' ruhe-row':''}" data-detail="${x.p.id}">
      ${ohneRang ? '' : `<span class="pos num">${i+1}</span>${i<3?glanzBahn():''}`}
      ${avHtml(x.p, '', {ins:true, px:52})}
      <div class="rmid">
        <div class="rname">${esc(x.p.name)} ${perfChip}</div>
        <div class="rmeta">
          <span>${x.w}–${x.g-x.w}</span>
          <span class="wbar"><i style="width:${Math.round(x.wr*100)}%"></i></span>
          <span>${Math.round(x.wr*100)}%</span>
        </div>
        <div class="rmeta rmeta-tore">Ø ${goalsTxt} ${valLbl}</div>
      </div>
      <div class="rval"><div class="big num">${wert}</div><div class="small">Wert</div></div>
    </div>`;}).join('')}</div>`;
}

// Die Ruheständler auf der gewählten Position, am Ende des Reiters [§C40].
function positionenRuheHtml(){
  const pos = rankMetric==='def'?'def':'atk';
  const arr = positionsListe(pos, ruhestandSpieler());
  return arr.length ? positionsBlockHtml(arr, pos, true) : '';
}

function vPositions(){
  const which = rankMetric==='def'?'def':'atk';
  const arr = positionsListe(which);
  const ruhe = positionsListe(which, ruhestandSpieler()).length;
  return `
    <div class="view-head"><h2>Positionen <button class="kopf-info" type="button" data-info="positionen" aria-label="So entsteht der Wert">${svgI('info')}</button></h2><p>Sturm und Abwehr, über alle Partien</p></div>
    ${einblickHtml('rollen')}
    <div class="ui-switch">
      <button data-postoggle="atk" class="${which==='atk'?'on':''}"><span class="pos-chip atk">${svgI('posSturm')}Sturm</span></button>
      <button data-postoggle="def" class="${which==='def'?'on':''}"><span class="pos-chip def">${svgI('posAbwehr')}Abwehr</span></button>
    </div>
    <div class="mini-label">▲ über · ▼ unter der Erwartung, gemessen an Partner und Gegnern</div>
    ${positionsBlockHtml(arr, which)}
    ${ruhe ? `<div class="ruhe-ende">${einblickHtml('ruhe_pos', ruhe === 1 ? 'ein Spieler' : ruhe + ' Spieler')}</div>` : ''}`;
}


// ── Wie der Wert entsteht ────────────────────────────────────────────
// Die Erklärung stand als zwei Zeilen unter der Überschrift und nahm der
// Liste bei jedem Öffnen den Platz. Sie steht jetzt hinter dem kleinen Knopf
// neben dem Wort — wer sie braucht, tippt, alle anderen sehen die Liste.
function zeigePositionsInfo(){
  openSheet(blattKopfHtml({ic:'info', titel:'So entsteht der Wert', unter:'Positionen'})
    + `<div class="pos-info">
      <p>Der Wert verbindet drei Dinge: die Siegquote auf dieser Position, die Leistung gegen die Erwartung — gemessen an Partner und Gegnern — und die Erfahrung, also wie oft jemand dort gespielt hat.</p>
      <p><b>▲</b> heißt über, <b>▼</b> unter der Erwartung. Gerechnet wird über alle Partien.</p></div>`);
}
