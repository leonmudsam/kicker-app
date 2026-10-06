// ╔═══ §5.4 ─── VIEW: TEAMS ────────────────────────────────────────────╗
//     Team-Tab mit Team-Statistiken und Top-Teams.
// ╚═════════════════════════════════════════════════════════════════════════╝
function vTeams(nurErgebnis=false){
  // Ein Duo mit einem Ruheständler spielt nie wieder [§C40]: es steht nicht
  // in der Liste der aktiven Liga, sondern am Ende in einer Zeile, die
  // aufklappt. Ein Duo mit einem ausgeblendeten Spieler steht nirgends.
  const T0=teamStats().filter(t=>t.g>=4);
  const T=T0.filter(t=>t.ids.every(id=>ligaAktiv(id)));
  const ruheT=T0.filter(t=>t.ids.every(id=>sichtbar(id))&&t.ids.some(id=>imRuhestand(id)));
  if(!T.length&&!ruheT.length){
    const html=emptyState('handshake','Noch nicht genug Daten');
    return nurErgebnis?{kopf:'Ab 4 gemeinsamen Spielen',html,ruhe:''}:`<div class="view-head"><h2>Teams</h2><p>Ab 4 gemeinsamen Spielen</p></div>${html}`;
  }
  const showBest=teamView!=='worst';
  
  // ═══ SORTIERUNG BASIEREND AUF teamSort VARIABLE ═══
  const ordnen=T=>{
  let sorted;
  if(teamSort==='wr'){
    // Standard: nach Siegquote
    sorted=[...T].sort((a,b)=>(b.w/b.g)-(a.w/a.g)||(b.gf-b.ga)-(a.gf-a.ga)||b.g-a.g);
  } else if(teamSort==='gd'){
    // Nach Tordifferenz
    sorted=[...T].sort((a,b)=>(b.gf-b.ga)-(a.gf-a.ga)||(b.w/b.g)-(a.w/a.g)||b.g-a.g);
  } else if(teamSort==='elo'){
    // Nach gesamtem Elo-Zuwachs (über alle Saisons hinweg)
    const gSim=getGlobalSim();
    sorted=[...T].sort((a,b)=>{
      const keyA=[a.ids[0],a.ids[1]].sort().join('|');
      const keyB=[b.ids[0],b.ids[1]].sort().join('|');
      const eloA=gSim.teamElo[keyA]||0;
      const eloB=gSim.teamElo[keyB]||0;
      return eloB-eloA || (b.w/b.g)-(a.w/a.g) || (b.gf-b.ga)-(a.gf-a.ga);
    });
  }
 else {
    // Fallback
    sorted=[...T].sort((a,b)=>(b.w/b.g)-(a.w/a.g)||(b.gf-b.ga)-(a.gf-a.ga)||b.g-a.g);
  }
  
  return sorted;
  };
  const sorted=ordnen(T);
  const arr=showBest?sorted:[...sorted].reverse();


  // Top-3 Akzente (Gold/Silber/Bronze) — Border + Rang-Kachel-Hintergrund
  // Dieselben drei Metalle wie in der Rangliste [§C26]: Gold, Silber, Bronze.
  // Platz 3 trug vorher Orange — das gehört jetzt allein der Siegesserie.
  const TOP=[
    {border:'rgba(247,207,74,.45)', bg:'#f7cf4a', fg:'#1d1700'},
    {border:'rgba(194,201,208,.38)',bg:'#C2C9D0', fg:'#1a1f1c'},
    {border:'rgba(192,132,87,.36)', bg:'#C08457', fg:'#241205'}
  ];

  const pm=pmap();
  const avPair=(idA,idB)=>{
    const a=pm[idA], b=pm[idB];
    const one=(p,offset)=>{
      if(!p) return `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);border:2px solid var(--surface);${offset?'margin-left:-9px':''}"></div>`;
      const em=p.avatar_id?avatarEmoji(p.avatar_id):null;
      if(em) return `<div style="width:32px;height:32px;border-radius:50%;background:var(--surface3);display:grid;place-items:center;font-size:15px;border:2px solid var(--surface);${offset?'margin-left:-9px':''}">${em}</div>`;
      return `<div style="width:32px;height:32px;border-radius:50%;background:${avColor(p.id)};display:grid;place-items:center;font-size:11px;font-family:'Archivo Black',sans-serif;color:#0a0c0b;border:2px solid var(--surface);${offset?'margin-left:-9px':''}">${esc(initials(p.name))}</div>`;
    };
    return `<div style="display:flex;align-items:center;flex-shrink:0">${one(a,false)}${one(b,true)}</div>`;
  };

  const gSim=getGlobalSim();

  // Dezente Team-/Spieler-Suche: filtert das aktuelle (sortierte) Feld nach
  // Spielername ODER kombiniertem Team-Namen. Beim Suchen keine Top-3-Medaillen.
  const _tq = (teamSearch||'').trim().toLowerCase();
  // Tokenisierte Suche: „&" und Leerzeichen trennen die Terme, Reihenfolge egal.
  // Dadurch findet „Leon & Martin", „Martin & Leon", „Leon Martin" und „Martin Leon"
  // dasselbe Duo. Jeder Term muss auf mind. einen der beiden Spielernamen passen.
  const _tqTokens = _tq.split(/[\s&]+/).filter(Boolean);
  const filtern = list => _tqTokens.length
    ? list.filter(t => {
        const names = t.ids.map(id => ((pm[id]&&pm[id].name)||'').toLowerCase());
        return _tqTokens.every(tok => names.some(nm => nm.includes(tok)));
      })
    : list;
  const arrF = filtern(arr);

  // `ohneRang` für die Duos mit Karriereende: kein Platz, kein Metall.
  const zeile=(t,i,ohneRang)=>{
    const wr=Math.round(t.w/t.g*100);
    const gd=t.gf-t.ga;
    const keyTeam=[t.ids[0],t.ids[1]].sort().join('|');
    
    // ═══ DYNAMISCHE HAUPTMETRIK BASIEREND AUF teamSort ═══
    // Grün und Rot heißen Richtung [§C25]: Tordifferenz und Elo-Zuwachs haben
    // eine, eine Siegrate hat keine. Die trägt deshalb Tinte — und Gold, wenn
    // sie dem ersten Platz gehört (weiter unten über TOP[]).
    let mainValue, mainColor;
    if(teamSort==='wr'){
      mainValue=wr+'%';
      mainColor='var(--ink)';
    } else if(teamSort==='gd'){
      mainValue=(gd>=0?'+':'')+gd;
      mainColor=gd>=0?'var(--acid)':'var(--red)';
    } else if(teamSort==='elo'){
      const eloGainTotal=Math.round(gSim.teamElo[keyTeam]||0);
      mainValue=(eloGainTotal>=0?'+':'')+eloGainTotal;
      mainColor=eloGainTotal>=0?'var(--acid)':'var(--red)';
    }

    
    const isTop=showBest&&i<3&&!_tq&&!ohneRang;
    const top=isTop?TOP[i]:null;
    const borderColor=top?top.border:'var(--line)';
    const rankBlock=ohneRang?'':top
      ? `<div style="width:24px;height:24px;border-radius:8px;background:${top.bg};color:${top.fg};display:grid;place-items:center;font-family:'Archivo Black',sans-serif;font-size:12px;flex-shrink:0">${i+1}</div>`
      : `<div style="width:24px;text-align:center;font-family:'Archivo Black',sans-serif;font-size:14px;color:var(--faint);flex-shrink:0">${i+1}</div>`;
    
    // Die Bilanz als Balken: Siege links in Grün, Niederlagen rechts in Rot
    // [§C25]. Die Zeile nannte „26–4" als Zahl, und ob ein Duo knapp oder
    // klar vorn liegt, musste man ausrechnen — die Ranglistenzeile der
    // Spieler zeigt dasselbe seit jeher als Balken [§C27].
    return `<div class="rrow tm-row${top ? ' tm-top' : ''}" data-team="${esc(t.ids.join('|'))}" style="--tm-rand:${borderColor}">
      <div class="tm-zeile">
        ${rankBlock}
        ${avPair(t.ids[0],t.ids[1])}
        <div class="tm-mitte">
          <div class="tm-name">${esc(t.ids.map(pname).join(' & '))}</div>
          <div class="tm-bil num">${t.w}–${t.g-t.w} · ${gd>=0?'+':''}${gd} Tore</div>
          <div class="tm-bar"><i style="width:${(t.w/t.g*100).toFixed(1)}%"></i></div>
        </div>
        <div class="tm-wert" style="color:${i===0&&isTop&&teamSort==='wr'?'var(--gold)':mainColor}">${mainValue}</div>
      </div>
    </div>`;
  };
  const rows=arrF.map((t,i)=>zeile(t,i,false)).join('');
  // Dieselbe Ordnung und dieselbe Suche wie die Liste darüber.
  const ruheF=filtern(showBest?ordnen(ruheT):[...ordnen(ruheT)].reverse());
  const ruhe=ruheF.length?`<div class="rlist">${ruheF.map((t,i)=>zeile(t,i,true)).join('')}</div>`:'';


  const ergebnis={kopf:`${arrF.length} Duo${arrF.length===1?'':'s'}${_tq?' gefunden':' ab 4 gemeinsamen Spielen, über alle Partien'}`,
    html:arrF.length ? `<div class="rlist">${rows}</div>` : emptyState('search','Keine Teams gefunden'),
    ruhe, ruheZahl:ruheF.length};
  // Die Suche zeichnet nur die Ergebnisse. Keine zweite Filter-/Sortierformel
  // und kein Ersetzen des Eingabefelds samt Fokus, Cursor oder IME-Komposition.
  if(nurErgebnis) return ergebnis;
  return `
    <div class="view-head"><h2>Teams</h2><p id="teamCount">${ergebnis.kopf}</p></div>
    ${einblickHtml('netz', 'ab 4 Partien')}
    <div class="search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
      </svg>
      <input type="text" id="teamSearch" placeholder="Spieler oder Team suchen…" value="${esc(teamSearch)}">
    </div>
    <div class="ui-switch">
      <button data-teamtoggle="best" class="${showBest?'on':''}">${svgI('chartUp')}Beste</button>
      <button data-teamtoggle="worst" class="${!showBest?'on':''}">${svgI('chartDown')}Schlechteste</button>
    </div>
    <div class="ui-tabs">
      <button data-teamsort="wr" class="${teamSort==='wr'?'on':''}">Siegquote</button>
      <button data-teamsort="gd" class="${teamSort==='gd'?'on':''}">Torbilanz</button>
      <button data-teamsort="elo" class="${teamSort==='elo'?'on':''}">Elo-Zuwachs</button>
    </div>
    <div id="teamResults">${ergebnis.html}</div>
    ${ruheT.length ? `<div class="ruhe-ende">${einblickHtml('ruhe_teams', ruheT.length === 1 ? 'ein Duo' : ruheT.length + ' Duos')}</div>` : ''}`;
}


// ╔═══ §5.5 ─── VIEW: HISTORY (Match-Liste mit Filter) ─────────────────╗
//     Filterbar nach Spieler. Zeigt Badge-Chips pro Match.
// ╚═════════════════════════════════════════════════════════════════════════╝
function vHistory(){
  if(!matches.length)return `<div class="view-head"><h2>Verlauf</h2></div>${emptyState('scroll','Noch keine Matches')}`;
  let list=[...matches].reverse();
  if(histFilter!=='all')
    list=list.filter(m=>[m.a1,m.a2,m.b1,m.b2].includes(histFilter));
  
  // ═══ PAGINIERUNGSLOGIK ═══
  const ITEMS_PER_PAGE = 20; // Anzahl der Matches pro Seite
  const currentPage = _histPage; // Nutze die globale Variable
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
  const paginatedList = list.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  
  const opts=`<option value="all">Alle Spieler</option>`+
    [...players].sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${p.id}" ${histFilter===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
  
  // ── Die Partie im Verlauf [§C27] ─────────────────────────────────
  // Beide Teams standen weiß und fett nebeneinander, der Stand grau in der
  // Mitte: wer gewonnen hat, sah man erst an den Zahlen darunter. Die Regel
  // `.mteam .won` suchte ein Kind und traf nie — die Klasse sitzt an
  // `.mteam` selbst. Jetzt stehen Gesichter vor den Namen, der Sieger hell,
  // der Verlierer leise, und im Stand leuchtet die Zahl des Siegers. Die
  // Partien eines Tages stehen unter einem Tageskopf mit ihrer Zahl, wie im
  // Feed, und die Zeile nennt nur noch die Uhrzeit. Die Gestaltung liegt im
  // CSS; im Markup standen die Marken der Auszeichnungen als Inline-Stil
  // [§C31].
  const proTag={};
  list.forEach(m=>{const k=tagKey(mts(m));proTag[k]=(proTag[k]||0)+1;});
  let tagVorher=null;
  const rows=paginatedList.map(m=>{
    const aWon=m.winner==='A';
    const team=(ids,w,r)=>`<div class="mteam${r?' r':''} ${w?'won':'lost'}"><span class="mteam-av">${ids.map(id=>{const p=pmap()[id];return p?avHtml(p,'',{}):'';}).join('')}</span>`
      +`<span class="mteam-n">${esc(pname(ids[0]))} & ${esc(pname(ids[1]))}</span></div>`;
    const dl=ids=>ids.map(id=>{const d=(m.deltas||{})[id]||0;
      return `<span><b>${esc(pname(id))}</b> <span class="delta-v ${d>=0?'pos':'neg'}">${d>=0?'+':''}${Math.round(d)}</span></span>`;}).join('');
    const earned=badgesEarnedInMatch(m.id);
    const badgeChips=earned.length?`<div class="mrow-bd">${earned.map(e=>
      `<span>${badgeIc(e.badge,'12px')}<span>${esc(pname(e.playerId).split(' ')[0])}</span></span>`
    ).join('')}</div>`:'';
    const k=tagKey(mts(m));
    const kopf=k!==tagVorher?`<div class="mtag"><b>${esc(datumFmt(mts(m),'wt'))}</b><span>${esc(datumFmt(mts(m),'tm'))}</span>`
      +`<em class="num">${proTag[k]} ${proTag[k]===1?'Partie':'Partien'}</em></div>`:'';
    tagVorher=k;
    return `${kopf}<div class="mrow" data-match="${m.id}">
      <div class="mrow-top">
        ${team([m.a1,m.a2],aWon,false)}
        <div class="mscore num"><em class="${aWon?'w':''}">${m.score_a}</em><i>:</i><em class="${aWon?'':'w'}">${m.score_b}</em></div>
        ${team([m.b1,m.b2],!aWon,true)}
      </div>
      <div class="mrow-bot"><div class="mdeltas">${dl([m.a1,m.a2,m.b1,m.b2])}</div></div>
      ${badgeChips}
      <div class="mrow-bot mrow-fuss"><span>${datumFmt(mts(m),'uhr')}</span>
        <span data-delmatch="${m.id}" class="mrow-edit">${svgI('edit')} bearbeiten</span></div>
    </div>`;
  }).join('');

  // ═══ PAGINIERUNGS-CONTROLS ═══
  const paginationControls = totalPages > 1 ? `
    <div style="display:flex;align-items:center;gap:8px;margin-top:16px;padding-bottom:20px;width:100%">
      <button class="btn ghost sm" id="prevPageBtn" style="flex:1;min-width:0;padding:10px 8px;white-space:nowrap" ${currentPage===0?'disabled':''}>← Vorher</button>
      <div style="flex-shrink:0;color:var(--muted);font-size:11px;font-family:'Sometype Mono',monospace;text-align:center;padding:0 2px;white-space:nowrap">
        <b style="color:var(--ink)">${currentPage+1}</b> / <b style="color:var(--ink)">${totalPages}</b>
      </div>
      <button class="btn ghost sm" id="nextPageBtn" data-historymax="${totalPages-1}" style="flex:1;min-width:0;padding:10px 8px;white-space:nowrap" ${currentPage>=(totalPages-1)?'disabled':''}>Weiter →</button>
    </div>
  ` : '';

  return `
    <div class="view-head"><h2>Verlauf</h2><p>${list.length} Matches</p></div>
    <div class="search" style="margin-bottom:14px">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></svg>
      <select id="histSel" style="padding-left:40px">${opts}</select>
    </div>
    ${list.length?`<div class="mlist">${rows}</div>${paginationControls}`:emptyState('search','Keine Matches für diesen Filter')}`;
}


// ╔═══ §5.6 ─── VIEW: MATCH-EINGABE ────────────────────────────────────╗
//     Spieler-Auswahl + Score-Eingabe für neues Match.
// ╚═════════════════════════════════════════════════════════════════════════╝
let M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0};
function vMatch(){
  const pos=k=>`<select data-pos="${k}"><option value="atk" ${M['p'+k]==='atk'?'selected':''}>↑ Sturm</option><option value="def" ${M['p'+k]==='def'?'selected':''}>↓ Abwehr</option></select>`;
  const slot=(t,n)=>{
    const key=t+n;
    const sel=M[key]?pmap()[M[key]]:null;
    return `<div class="slot"><div class="psel"><div class="combo">
      <input type="text" data-combo="${key}" placeholder="Spieler tippen…" autocomplete="off"
        value="${sel?esc(sel.name):''}" class="${sel?'filled':''}">
      <div class="combo-list" data-combolist="${key}"></div>
    </div></div><div class="possel">${pos(key)}</div></div>`;
  };
  return `
    <div class="view-head"><h2>Match</h2><p>Aufstellen, Tore eintragen, speichern</p></div>
    <div class="builder">
      <div class="team-block A"><div class="team-label">Team A <span class="tag" id="avgA"></span></div>${slot('A',1)}${slot('A',2)}</div>
      <div class="vs-mid"><span class="line"></span><span class="vs">VS</span><span class="line"></span></div>
      <div class="team-block B"><div class="team-label">Team B <span class="tag" id="avgB"></span></div>${slot('B',1)}${slot('B',2)}</div>
    </div>
    <div class="score-board" style="margin-top:12px">
      <div class="score-col A"><div class="cl">Team A</div>
        <div class="stepper"><button data-step="sa,-1">−</button><span class="sval num" id="svA" data-scoreedit="sa">${M.sa}</span><button data-step="sa,1">+</button></div></div>
      <div class="score-sep">:</div>
      <div class="score-col B"><div class="cl">Team B</div>
        <div class="stepper"><button data-step="sb,-1">−</button><span class="sval num" id="svB" data-scoreedit="sb">${M.sb}</span><button data-step="sb,1">+</button></div></div>
    </div>
    <div id="chanceSlot"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin:-4px 0 10px">
      <span style="font-size:10.5px;color:var(--muted)">Zahl antippen, um sie direkt einzugeben</span>
      <button class="btn ghost" id="shuffleBtn" style="width:auto;flex-shrink:0;padding:8px 14px;font-size:11px;border-radius:10px">Mischen</button>
    </div>
    <div id="previewSlot"></div>
    <div class="btn-row" style="margin-top:4px">
      <button class="btn ghost sm" id="clearM" style="flex:0 0 38%">Leeren</button>
      <button class="btn" id="saveM" disabled>Speichern</button>
    </div>`;
}

// ╔═══ §5.7 ─── VIEW: SETTINGS ─────────────────────────────────────────╗
//     Spieler verwalten, Saison-Recap, App-Reset (hinter Passwort-Lock).
// ╚═════════════════════════════════════════════════════════════════════════╝
function vSettings(){
  const sl=(id,name,val,min,max,suf)=>`<div class="slider-wrap">
    <div class="sh"><span class="sn">${name}</span><span class="sv"><span id="${id}v">${val}</span>${suf||''}</span></div>
    <input type="range" id="${id}" min="${min}" max="${max}" value="${val}"></div>`;
  // Aktuelle Werte für Erklärungen (mit Fallbacks)
  const c = {
    k:          Math.round(cfg.k_factor),
    risk:       Math.round((cfg.risk_split ?? 0.6)*100),
    pos:        Math.round((cfg.pos_swing ?? 0.45)*100),
    winBoost:   Math.round((cfg.win_boost ?? 1.12)*100),
    movDamp:    Math.round((cfg.mov_loss_damp ?? 0.5)*100),
    bonus:      komma(cfg.match_bonus ?? 1.5, 1),
    startElo:   Math.round(cfg.start_elo ?? 0),
    posMin:     Math.round(cfg.pos_min_games ?? 3),
    expW:       Math.round((cfg.exp_weight ?? 0.5)*100),
    npMult:     Math.round((cfg.new_player_mult ?? 1.5)*100),
    npMidMult:  Math.round((cfg.new_player_mid_mult ?? 1.2)*100),
    vetDamp:    Math.round((cfg.veteran_damp ?? 0.85)*100),
    movMax:     Math.round((cfg.mov_max_boost ?? 0.4)*100),
    expProt:    Math.round((cfg.exp_protect_max ?? 0.1)*100),
    udElo:      Math.round((cfg.underdog_elo_max ?? 0.15)*100),
    udGames:    Math.round((cfg.underdog_games_max ?? 0.05)*100),
    lowDamp:    Math.round((cfg.low_elo_loss_damp ?? 0)*100),
  };
  return `
    <div class="view-head"><h2>Formel</h2><p>Feintuning der Elo-Berechnung</p></div>

    <div class="cfg-section-title">Grundparameter</div>
    <div class="card">
      ${sl('cfgK','K-Faktor (Tempo)',c.k,8,64,'')}
      ${sl('cfgStartElo','Start-Elo pro Saison',c.startElo,0,1000,'')}
    </div>

    <div class="cfg-section-title">Spielerlast & Position</div>
    <div class="card">
      ${sl('cfgRisk','Risiko-Split (schwacher Partner)',c.risk,0,100,'%')}
      ${sl('cfgPos','Positions-Swing',c.pos,0,100,'%')}
      ${sl('cfgExpW','Positions-Erfahrungs-Gewicht',c.expW,0,100,'%')}
      ${sl('cfgPosMin','Mindestspiele je Position',c.posMin,1,10,'')}
    </div>

    <div class="cfg-section-title">Sieg & Niederlage</div>
    <div class="card">
      ${sl('cfgWinBoost','Sieg-Boost',c.winBoost,100,140,'%')}
      ${sl('cfgMovDamp','MoV-Dämpfung Niederlage',c.movDamp,0,100,'%')}
      ${sl('cfgMovMax','MoV-Max-Boost (Kantersieg)',c.movMax,0,100,'%')}
      ${sl('cfgLowEloLossDamp','Low-Elo Verlustschutz',c.lowDamp,0,100,'%')}
    </div>

    <div class="cfg-section-title">Bonus-System</div>
    <div class="card">
      ${sl('cfgBonus','Spielbonus pro Match',Math.round((cfg.match_bonus ?? 1.5)*10),0,50,)}
      ${sl('cfgExpProt','Erfahrungs-Schutz Maximum',c.expProt,0,30,'%')}
      ${sl('cfgUdElo','Underdog-Boost (Elo-Gap)',c.udElo,0,100,'%')}
      ${sl('cfgUdGames','Underdog-Boost (Spiele-Gap)',c.udGames,0,100,'%')}
    </div>

    <div class="cfg-section-title">K-Faktor-Dynamik</div>
    <div class="card">
      ${sl('cfgNpMult','Neuling-Multi (&lt;5 Spiele)',c.npMult,100,200,'%')}
      ${sl('cfgNpMidMult','Anfänger-Multi (&lt;15 Spiele)',c.npMidMult,100,200,'%')}
      ${sl('cfgVetDamp','Veteran-Elogewinn (&gt;Start+400 Elo)',c.vetDamp,0,100,'%')}
    </div>

    <div class="card">
      <div class="mini-label">Mechaniken</div>
      <div style="font-size:12px;color:var(--ink2);line-height:1.8">
        <b style="color:var(--acid)">K-Faktor</b> — Wie stark einzelne Matches die Elo verändern. Hoch = schnelle Änderungen, niedrig = stabile Elo.<br>
        <b style="color:var(--acid)">Start-Elo</b> — Der Wert auf den jeder Spieler zu Saisonbeginn zurückgesetzt wird. Höhere Werte machen Verluste in den ersten Matches "weniger schmerzhaft".<br>
        <b style="color:var(--acid)">Risiko-Split</b> — Wie viel Last der schwächere Mitspieler trägt. Bei ${c.risk} % verliert weniger Elo, wer mit einem deutlich schwächeren Partner spielt.<br>
        <b style="color:var(--acid)">Positions-Swing</b> — Bonus für Siege auf der schwachen Position. Ein Abwehr-Spieler der im Sturm gewinnt bekommt extra Elo.<br>
        <b style="color:var(--acid)">Positions-Erfahrungs-Gewicht</b> — Mischverhältnis bei der automatischen Positions-Erkennung. ${c.expW}% bedeutet: ${c.expW}% Häufigkeit der Position, ${100-c.expW}% Leistung. Hoch = wer oft Abwehr spielt gilt als Verteidiger, egal wie gut. Niedrig = nur die Leistung über der Erwartung zählt.<br>
        <b style="color:var(--acid)">Mindestspiele je Position</b> — Erst ab ${c.posMin} Spielen auf einer Position fließt sie in die Positions-Wertung ein. Schützt vor Zufalls-Einstufung nach 1 Spiel.<br>
        <b style="color:var(--acid)">Sieg-Boost</b> — Siege bringen ${c.winBoost-100}% mehr als Niederlagen kosten. Sorgt für langfristigen Aufwärtstrend.<br>
        <b style="color:var(--acid)">MoV-Dämpfung</b> — Tordifferenz bei Niederlagen nur ${c.movDamp}% so stark wie bei Siegen. Eine 0:10 Niederlage bestraft so nicht 3× so hart wie 5:10.<br>
        <b style="color:var(--acid)">MoV-Max-Boost</b> — Maximaler Multiplikator durch Tordifferenz bei einem Kantersieg. ${c.movMax}% heißt: ein 10:0 zählt bis zu ${(100+c.movMax)}% des normalen Werts.<br>
        <b style="color:var(--acid)">Low-Elo Verlustschutz</b> — Spieler unter dem Match-Durchschnitts-Elo verlieren bei Niederlagen bis zu ${c.lowDamp}% weniger Elo (tanh-skaliert nach 200 Elo Abstand zum Match-Durchschnitt). Symmetrisch zum Underdog-Boost — schützt schwache Spieler vor Elo-Absturz, aber nur wenn sie tatsächlich schwächer als der Schnitt im Match sind.<br>
        <b style="color:var(--acid)">Spielbonus</b> — +${c.bonus} Elo pro Match, egal ob Sieg oder Niederlage. Belohnt aktive Spieler.<br>
        <b style="color:var(--acid)">Erfahrungs-Schutz Max</b> — Erfahrene Spieler verlieren bei Niederlagen bis zu ${c.expProt}% weniger Elo (linear ab 5 bis 30 Saison-Matches). Schützt vor Absturz durch Pech-Serien.<br>
        <b style="color:var(--acid)">Underdog-Boost (Elo-Gap)</b> — Schwächere Spieler bekommen bis zu ${c.udElo}% Bonus bei Siegen gegen stärkere Gegner (tanh-skaliert nach 400 Elo-Differenz). Wirkt nur als Belohnung, nie als Bestrafung.<br>
        <b style="color:var(--acid)">Underdog-Boost (Spiele-Gap)</b> — Spieler mit weniger Matches bekommen bis zu ${c.udGames}% zusätzlichen Boost (tanh-skaliert nach 30 Spiele-Differenz). Hilft Neueinsteigern beim Aufholen. Veteranen werden nicht bestraft — beide Komponenten wirken unabhängig.<br>
        <b style="color:var(--acid)">Neuling-Multi</b> — In den ersten 5 Saison-Spielen wirkt K-Faktor um ${c.npMult}% verstärkt. Neue Spieler finden so schnell ihr Niveau.<br>
        <b style="color:var(--acid)">Anfänger-Multi</b> — Zwischen 5–14 Saison-Spielen wirkt K-Faktor um ${c.npMidMult}% verstärkt. Sanfter Übergang zur Normal-Bewertung.<br>
        <b style="color:var(--acid)">Veteran-Dämpfung</b> — Sehr starke Spieler (&gt; Start+400 Elo) bewegen sich um ${c.vetDamp}% des K-Faktors. Verhindert dass Top-Spieler durch Pflicht-Siege ewig weiter wachsen.<br>
        <b style="color:var(--acid)">Saison-Reset</b> — Jeden Monatswechsel werden alle Elo-Werte auf den Start-Wert zurückgesetzt. Karriere-Elo = gewichteter Durchschnitt der Saison-End-Elos.
      </div>
    </div>
    <div class="card" style="margin-top:14px;border:1px solid rgba(190,242,100,.18);background:linear-gradient(155deg,rgba(190,242,100,.06),var(--surface) 80%)">
      <div class="mini-label" style="color:var(--acid);display:flex;align-items:center;gap:6px">${svgI('info')}Wirkung der Regler</div>
      <p style="font-size:12px;color:var(--ink2);line-height:1.55;margin-top:8px">
        Änderungen an den Reglern wirken <b style="color:var(--acid)">nur auf neue Matches</b>.
        Vergangene Matches behalten ihre damaligen Elo-Werte — abgeschlossene Saisons bleiben stabil,
        Awards &amp; Achievements ändern sich nicht.
      </p>
      <p style="font-size:11px;color:var(--muted);line-height:1.55;margin-top:6px">
        Sollen die Regler <b>rückwirkend</b> für die gesamte Historie gelten, lassen sich alle
        Matches neu berechnen. <b style="color:var(--red)">Achtung:</b> dabei werden alle bisher
        gespeicherten Match-Deltas überschrieben.
      </p>
      <button class="btn" id="recalcBtn" style="margin-top:14px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('cycle')} Alle Matches rückwirkend neu berechnen</button>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="mini-label">Sicherung und Export</div>
      <p style="font-size:11.5px;color:var(--ink2);line-height:1.6;margin-top:10px">
        Die Liga lebt in einer Datenbank in der Cloud. Damit sie auch dann nicht verloren geht,
        wenn dort etwas passiert, lässt sich hier jederzeit eine eigene Kopie ziehen.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
        <button class="btn ghost" id="expXlsxBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('scroll')} Matches als Excel (.xlsx)</button>
        <button class="btn ghost" id="expSaveBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('shieldCheck')} Sicherung speichern (.json)</button>
        <button class="btn ghost sm" id="expCsvBtn" style="width:100%;font-size:11px">Stattdessen als CSV</button>
      </div>
      <p style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:12px">
        <b style="color:var(--acid)">Excel</b>: alle ${matches.length} Matches mit Namen, Positionen und Ergebnissen,
        dazu je ein Blatt für Spieler und Saisons. Zum Anschauen, Auswerten und Weitergeben.<br>
        <b style="color:var(--acid)">Sicherung</b>: die vollständige Kopie mit allen Elo-Werten und den
        Einstellungen der Elo-Rechnung. Das ist die Datei, mit der sich die Liga im Ernstfall wieder aufbauen lässt.
      </p>
      <div style="height:1px;background:var(--line);margin:14px 0"></div>
      <button class="btn" id="impBackupBtn" style="width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px">${svgI('refresh')} Datei einspielen</button>
      <p style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:10px">
        Nimmt .xlsx, .csv und .json. Vor dem Schreiben erscheint eine Vorschau, was ergänzt würde.
        <b style="color:var(--acid)">Es wird nie etwas gelöscht oder überschrieben</b>, nur fehlende Matches kommen dazu.
      </p>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="mini-label">Stand der App</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:10px">
        <div style="font-size:12px;color:var(--ink2);font-family:'Sometype Mono',monospace">${BUILD_VERSION}</div>
        <button class="btn ghost sm" id="forceReloadBtn" style="width:auto;padding:7px 12px;font-size:11px;flex-shrink:0">Neu laden</button>
      </div>
      <p style="font-size:11px;color:var(--muted);line-height:1.55;margin-top:10px">
        Wenn eine Neuerung nicht auftaucht, hält das Telefon meist noch den alten Stand fest. Der Knopf holt ihn frisch. Sonst meldet sich ein neuer Stand von selbst mit einem Hinweis oben.
      </p>
    </div>
    ${players.filter(p=>p.hidden).length?`
    <div class="card" style="margin-top:14px">
      <div class="mini-label">Ausgeblendete Spieler</div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:10px">
        ${players.filter(p=>p.hidden).map(p=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:10px">
              ${avHtml(p,'width:32px;height:32px;border-radius:9px;font-size:11px')}
              <span style="font-weight:600">${esc(p.name)}</span>
            </div>
            <button data-unhide="${p.id}" class="btn ghost sm" style="width:auto;padding:7px 12px;font-size:11px">Einblenden</button>
          </div>`).join('')}
      </div>
    </div>`:''}

    `;
}

// ╔═══ §5.8 ─── MATCH PREVIEW & SAVE-LOGIK ─────────────────────────────╗
//     Live-Preview der Elo-Deltas + doSaveMatch() schreibt Match und zeigt
//     Achievement-Toasts (Badge-Trigger via getBadgeEarnedCache).
// ╚═════════════════════════════════════════════════════════════════════════╝
function readM(){
  const main=document.getElementById('main');if(!main) return;
  main.querySelectorAll('[data-p]').forEach(s=>M[s.dataset.p]=s.value);
  main.querySelectorAll('[data-pos]').forEach(s=>M['p'+s.dataset.pos]=s.value);
}
function validM(){const ids=[M.A1,M.A2,M.B1,M.B2];
  return !ids.some(x=>!x)&&new Set(ids).size===4&&M.sa!==M.sb
    &&M.pA1!==M.pA2&&M.pB1!==M.pB2;}
function teamsFromM(){return{teamA:[{id:M.A1,pos:M.pA1},{id:M.A2,pos:M.pA2}],teamB:[{id:M.B1,pos:M.pB1},{id:M.B2,pos:M.pB2}]};}
// Genau das letzte vollständige Eingabeergebnis, keine wachsende Sammlung
// aller getesteten Aufstellungen. Die Rechnung bleibt computeMatch; Chance,
// Vorschau und Speichern lesen dasselbe Ergebnis ohne eigene Elo-Formel.
function _matchInputResult(){
  const key=JSON.stringify([_cache.version,currentSeason().id,M.A1,M.A2,M.B1,M.B2,
    M.pA1,M.pA2,M.pB1,M.pB2,M.sa,M.sb]);
  const memo=_cache._matchInputMemo;
  if(memo && memo.key===key && memo.matches===matches && memo.players===players && memo.cfg===cfg) return memo.result;
  const {teamA,teamB}=teamsFromM();
  const result=computeMatch(teamA,teamB,M.sa>M.sb?'A':'B',M.sa,M.sb);
  _cache._matchInputMemo={key,matches,players,cfg,result};
  return result;
}
let _matchPreviewPlan=null;
function requestMatchPreview(){
  const slot=document.getElementById('previewSlot'),save=document.getElementById('saveM');
  if(!slot || !save) return;
  // Validität und Zahlen antworten sofort; Wappen und analytische Vorschau
  // höchstens einmal im nächsten Bild, immer für den letzten Eingabestand.
  save.disabled=!!doSaveMatch._busy || !validM();
  if(_matchPreviewPlan && _matchPreviewPlan.slot===slot) return;
  if(_matchPreviewPlan) cancelAnimationFrame(_matchPreviewPlan.frame);
  const plan={slot,frame:0};_matchPreviewPlan=plan;
  plan.frame=requestAnimationFrame(()=>{
    if(_matchPreviewPlan!==plan) return;
    _matchPreviewPlan=null;
    if(document.getElementById('previewSlot')===slot) updatePreview();
  });
}
function updatePreview(){
  if(_matchPreviewPlan){cancelAnimationFrame(_matchPreviewPlan.frame);_matchPreviewPlan=null;}
  const slot = document.getElementById('previewSlot');
  const save = document.getElementById('saveM');
  if(!slot || !save) return;
  const P = pmap();
  const gSim = getGlobalSim();
  const seasonElo = id => gSim.elo[id] ?? cfg.start_elo;

  const setAvg = (el,a,b) => {
    const e = document.getElementById(el);
    if(e && P[a] && P[b]) e.textContent = 'Ø '+Math.round((seasonElo(a)+seasonElo(b))/2)+' (Saison)';
    else if(e) e.textContent = '';
  };
  setAvg('avgA', M.A1, M.A2); setAvg('avgB', M.B1, M.B2);

  const ids = [M.A1,M.A2,M.B1,M.B2].filter(Boolean);
  // Die Siegchance steht, sobald vier verschiedene Spieler auf ihren Rollen
  // stehen — nicht erst, wenn der Stand eingetragen ist: beim Aufstellen ist
  // sie die Frage, nach dem Spiel nur noch eine Zahl.
  const chanceSlot = document.getElementById('chanceSlot');
  const aufgestellt=ids.length===4 && new Set(ids).size===4 && M.pA1!==M.pA2 && M.pB1!==M.pB2;
  const c=aufgestellt?_matchInputResult():null;
  if(chanceSlot){
    const html=c?_matchChanceHtml(c.expA):'';
    if(chanceSlot._matchChanceHtml!==html){chanceSlot.innerHTML=html;chanceSlot._matchChanceHtml=html;}
  }
  if(new Set(ids).size !== ids.length){
    slot.innerHTML = `<div class="preview" style="color:var(--red);font-size:12px;text-align:center">Ein Spieler steht doppelt.</div>`;
    save.disabled = true; return;
  }
  // Beide Spieler eines Teams müssen unterschiedliche Positionen haben
  const allFour = ids.length === 4;
  if(allFour && (M.pA1===M.pA2 || M.pB1===M.pB2)){
    slot.innerHTML = `<div class="preview" style="color:var(--red);font-size:12px;text-align:center">Jedes Team braucht Sturm + Abwehr.</div>`;
    save.disabled = true; return;
  }
  if(!validM()){slot.innerHTML=''; save.disabled=true; return;}

  const winner = M.sa > M.sb ? 'A' : 'B';
  const{teamA, teamB} = teamsFromM();
  const line = s => {
    const d = c.res[s.id];
    return `<div class="delta-row">
      <span class="dn">${esc(P[s.id].name)}
        <span class="chip ${s.pos}">${s.pos==='atk'?'STU':'ABW'}</span>
      </span>
      <span class="delta-v ${d>=0?'pos':'neg'}">${d>=0?'+':''}${Math.round(d)}</span>
    </div>`;
  };
  // Die Siegchance steht schon unter dem Stand (_matchChanceHtml); hier
  // stand derselbe Balken ein zweites Mal.
  slot.innerHTML = `<div class="preview">
    <div class="prob-cap">Team ${winner} gewinnt ${M.sa}:${M.sb}
      ${c.mov>1.08?' · Kantersieg ×'+komma(c.mov,2):''}
    </div>
    <div class="delta-list">
      ${line(teamA[0])}${line(teamA[1])}
      <div class="delta-div"></div>
      ${line(teamB[0])}${line(teamB[1])}
    </div>
  </div>`;
  save.disabled = !!doSaveMatch._busy;
}

// ── Die Siegchance beim Aufstellen [§C27] ────────────────────────────
// Unter der Score-Karte, sobald die vier stehen: die beiden Paare, das Wort
// dazu und der Balken der Vorschau, aus derselben Rechnung, mit der die
// Partie danach gewertet wird (`computeMatch`). Ohne Erklärsatz — die Zahl
// über zwei Teams erklärt sich selbst. Das Wort zeigt zum Favoriten.
function _matchChanceHtml(c){
  if(c===undefined){try {c=_matchInputResult().expA;}catch(e){return '';}}
  if(c == null || !isFinite(c)) return '';
  const pA = Math.round(c * 100), pB = 100 - pA;
  const wort = chanceWort(Math.max(c, 1 - c));
  const mitte = wort === 'Favorit' ? (c >= .5 ? '← Favorit' : 'Favorit →') : wort;
  return `<div class="m-chance"><div class="m-ch-r">${rcpPaarHtml([M.A1, M.A2], 26)}`
    + `<span class="m-ch-w">${esc(mitte)}</span>${rcpPaarHtml([M.B1, M.B2], 26)}</div>`
    + `<div class="prob"><div class="pa" style="width:${pA}%">${pA}%</div><div class="pb" style="width:${pB}%">${pB}%</div></div></div>`;
}

async function doSaveMatch(){
  if(doSaveMatch._busy) return;
  readM(); if(!validM()){toast('Match unvollständig',true);return;}
  const state=M,draft={...M},save=document.getElementById('saveM'),saveHtml=save?save.innerHTML:'';
  doSaveMatch._busy=true;
  if(save){save.disabled=true;save.setAttribute('aria-busy','true');save.textContent='Speichere…';}
  let insertedRow=null;
  try {
  const winner = M.sa > M.sb ? 'A' : 'B';
  const c = _matchInputResult();

  const row = {
    a1:M.A1, a1_pos:M.pA1, a2:M.A2, a2_pos:M.pA2,
    b1:M.B1, b1_pos:M.pB1, b2:M.B2, b2_pos:M.pB2,
    score_a:M.sa, score_b:M.sb, winner, deltas:c.res, exp_a:c.expA
  };
  // insert(...).select() gibt die erzeugte Zeile inkl. id + created_at zurück,
  // damit die lokale Kopie exakt der DB entspricht (created_at wird für die
  // Saison-Filterung in matchesInSeason zwingend gebraucht).
  const{data:inserted, error} = await sb.from('matches').insert(row).select().single();
  if(error){toast('Fehler: '+error.message,true);return;}

  // Fallback: falls select() nicht greift, created_at lokal setzen,
  // sonst fiele das frische Match aus matchesInSeason heraus.
  const savedRow = inserted || {...row, created_at:new Date().toISOString()};
  insertedRow=savedRow;

  // Lokal updaten, dann über die EINE kanonische Engine neu berechnen.
  // persistRecalc schreibt atk, Match-Deltas und Saison-Elos konsistent.
  matches = [...matches, savedRow];
  invalidateCache(['global', 'stats', 'awards', 'badges']);
  await persistNewMatch(savedRow.id);

  // ─── ACHIEVEMENT-TOASTS ───────────────────────────────────────────
  // Nach dem persist+invalidate liefert badgesEarnedInMatch genau die in
  // DIESEM Match neu erreichten Badges (Pre-State-Vergleich → echte Neu-
  // erreichungen, keine Wiederholungen). Sequenzielle Queue zeigt sie der
  // Reihe nach, jeder Toast 2.6s. Spielername aus pname() konsistent zur
  // gesamten App.
  //
  // ⚠ Common-Badges (grün) werden NICHT als Toast gezeigt, weil sie zu
  // häufig feuern und sonst eine Toast-Kaskade von 5+ PopUps entsteht.
  // Sie bleiben im Match-Review sichtbar und zählen im Profil weiter.
  const newBadges = badgesEarnedInMatch(savedRow.id);
  const toastWorthy = newBadges.filter(e => rarityOf(e.badge.id) !== 'common');
  if(toastWorthy.length){
    toastWorthy.forEach(e => showAchievementToast(pname(e.playerId), e.badge));
  } else {
    // Die Wirkung in der zweiten Zeile, und ein Weg zurück: wer sich beim
    // Stand vertippt hat, musste bisher die Partie suchen, öffnen und
    // löschen.
    const sieger = winner === 'A' ? [row.a1,row.a2] : [row.b1,row.b2];
    toast('Match gespeichert', 'ok', {
      sub: sieger.map(pname).join(' & ') + ' gewinnen ' + standFuer(savedRow),
      aktion: {label:'Rückgängig', fn: () => partieLoeschen(savedRow.id)}});
  }
  // Ein während des Wartens geänderter Entwurf und ein bewusst gewechselter
  // Reiter gehören dem Nutzer, nicht der verspäteten Speicherantwort.
  if(M===state && Object.keys(draft).every(k=>M[k]===draft[k])){
    M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0};
    if(tab==='match') tab='ranking';
  }
  await loadAll();
  } catch(e){
    console.warn('Match speichern:',e);
    // Nach erfolgreichem Insert ist die Partie schon gespeichert. Den alten
    // Entwurf nicht als erneut speicherbare Kopie liegenlassen, falls nur
    // das Nachladen oder eine Folgepersistenz fehlschlägt.
    if(insertedRow && M===state && Object.keys(draft).every(k=>M[k]===draft[k])){
      M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0};
      if(tab==='match') render();
    }
    toast(insertedRow?'Match gespeichert. Nachladen fehlgeschlagen.':'Speichern fehlgeschlagen.',true);
  } finally {
    doSaveMatch._busy=false;
    if(save && save.isConnected){save.removeAttribute('aria-busy');save.innerHTML=saveHtml;}
    if(tab==='match') updatePreview();
  }
}

