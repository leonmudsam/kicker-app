// ─── §8.5 Eine Auszeichnung im Detail (Popover über dem Blatt) ──────────
// ═══════════════════════════════════════════════════════════════════════════
// BADGE-DETAIL-POPOVER
// ═══════════════════════════════════════════════════════════════════════════
// Layer ÜBER dem Auszeichnungen-Sheet (z-index 120+ > Sheet 100/101).
// Zwei Modi:
//   • Erreicht  → zeigt die Matches, in denen das Badge ausgelöst wurde
//                 (aus getBadgeEarnedCache). Jeder Match-Eintrag ist klickbar:
//                 schließt Popover UND Sheet, öffnet das Match-Detail.
//   • Locked    → zeigt Fortschritt für die wichtigsten quantifizierbaren
//                 Badges (Spiele, Streaks, Elo-Schwellen, Positions-Spiele).
//                 Für saison-/karriere-aggregierte Badges (POTD, POTW,
//                 award_collector, untouchable etc.) gibt's einen knappen
//                 "Noch nicht erreicht"-Hinweis statt Balken.
//
// Schließen: Backdrop-Click, ✕ Button, ESC. KEIN closeSheet — das darunter
// liegende Auszeichnungen-Sheet bleibt scrollbar und sucht-fähig.
// ═══════════════════════════════════════════════════════════════════════════

// Helper: Matches, in denen das Badge für DIESEN Spieler gefeuert wurde.
// Nutzt den globalen Badge-Earned-Cache (chronologischer Walk in §7.4).
// Für saison-/karriere-aggregierte Badges (kein fire-Trigger) ist die Liste
// leer — wir zeigen dann den count ohne Match-Liste.
function _badgeFireMatches(playerId, badgeId){
  const map = getBadgeEarnedCache();
  const hits = [];
  for(const mid in map){
    if(map[mid].some(e => e.playerId === playerId && e.badge.id === badgeId)){
      const mObj = matches.find(m => m.id === mid);
      if(mObj) hits.push(mObj);
    }
  }
  return hits.sort((a,b) => mts(b)-mts(a));
}

// Helper: Fortschritt für quantifizierbare Locked-Badges. Returnt
// {cur, tgt, label} oder null wenn kein einfacher Fortschritt definierbar ist.
function _badgeProgress(badgeId, playerId){
  const playerMs = matches.filter(m => matchOf(playerId, m));
  switch(badgeId){
    case 'first_match':
      return {cur: Math.min(playerMs.length, 1), tgt: 1, label: 'Spiele'};
    case 'games25':
      return {cur: Math.min(playerMs.length, 25), tgt: 25, label: 'Spiele'};
    case 'games150':
      return {cur: Math.min(playerMs.length, 150), tgt: 150, label: 'Spiele'};
    // v9.17: einsehbarer Zähler für die goldenen Langzeit-Auszeichnungen.
    // playerMs ist bereits „alle Matches dieses Spielers" (= countGames), die
    // Siege kommen aus derselben Menge (= countWins) — keine zweite Rechnung.
    case 'games250':
      return {cur: Math.min(playerMs.length, 300), tgt: 300, label: 'Spiele'};
    case 'wins200': {
      const w = playerMs.filter(m => won(playerId, m)).length;
      return {cur: Math.min(w, 300), tgt: 300, label: 'Siege'};
    }
    case 'def50': {
      const def = playerMs.filter(m => {
        const slot=m.a1===playerId?'a1':m.a2===playerId?'a2':m.b1===playerId?'b1':'b2';
        return m[slot+'_pos']==='def';
      }).length;
      return {cur: Math.min(def, 50), tgt: 50, label: 'Abwehr-Spiele'};
    }
    case 'atk50': {
      const atk = playerMs.filter(m => {
        const slot=m.a1===playerId?'a1':m.a2===playerId?'a2':m.b1===playerId?'b1':'b2';
        return m[slot+'_pos']==='atk';
      }).length;
      return {cur: Math.min(atk, 50), tgt: 50, label: 'Sturm-Spiele'};
    }
    case 'streak5':
    case 'streak10':
    case 'streak15':
    case 'streak20': {
      const best = longestPlayerStreak(playerId, matches);
      const tgts = {streak5:5, streak10:10, streak15:15, streak20:20};
      const tgt = tgts[badgeId];
      return {cur: Math.min(best, tgt), tgt, label: 'längste Serie'};
    }
    case 'climber_100':
    case 'dominator_400':
    case 'dynasty_600': {
      // v9.18: Die Marke ist jede Saison neu erreichbar — der Balken zeigt
      // deshalb den Höchststand der LAUFENDEN Saison, nicht den Allzeit-Peak.
      // start_elo abziehen, damit "0/100" intuitiv ist (nicht "1000/1100").
      let curPeak = 0;
      try {
        const sp = seasonPeakElos()[currentSeason().id] || {};
        if(sp[playerId] != null) curPeak = Math.round(sp[playerId] - cfg.start_elo);
      } catch(e){}
      const tgts = {climber_100:100, dominator_400:400, dynasty_600:600};
      const tgt = tgts[badgeId];
      return {cur: Math.max(0, Math.min(curPeak, tgt)), tgt, label: 'Saison-Elo über Start'};
    }
    case 'allrounder': {
      // 20 Siege als Sturm UND 20 als Abwehr — wir zeigen den kleineren Wert
      const stats = playerStats(playerId);
      const atkW = stats.atkW || 0, defW = stats.defW || 0;
      const cur = Math.min(atkW, defW, 20);
      return {cur, tgt: 20, label: 'Siege auf der schwächeren Position'};
    }
    case 'mr_disaster': {
      // Aktuelle Saison: wie viele 0:10-Niederlagen hat der Spieler bereits?
      // Spiegel zu mr_perfect-Fortschritt (würde gleich aussehen).
      const sid = currentSeason().id;
      const seasonMs = matchesInSeason(sid);
      const disasters = seasonMs.filter(m => matchOf(playerId,m) && !won(playerId,m)
        && goalsFor(playerId,m)===0 && goalsAgainst(playerId,m)===10).length;
      return {cur: Math.min(disasters, 3), tgt: 3, label: '0:10 in aktueller Saison'};
    }
    // nemesis: siehe _badgeStreakState — dort als „Aktueller Lauf" (locked + unlocked).
  }
  return null;
}

// Aktueller (laufender) Zähler für Kontext-/Serien-Badges, der sich je nach
// Spielverlauf wieder zurücksetzt (z. B. „Zittersiege in Folge"). Anders als
// _badgeProgress (kumulativer Rekord/Bestwert) zeigt das den LEBENDEN Stand
// bis zum letzten Match — also wie nah der Spieler an der nächsten Auslösung ist.
// Reused die Loop-Logik der jeweiligen count*-Funktion, gibt aber den End-Wert
// des laufenden Zählers zurück statt der Anzahl der Auslösungen.
// Läuft nur beim Öffnen des Badge-Popovers (Klick) → keine Render-Hotpath-Kosten.
// Rückgabe: {cur, tgt, label, hint} · für Wochentag-Badges {weekdays:Set, tgt,
// label, kind:'weekday'} · sonst null (Badge hat keinen resettbaren Zähler).
function _badgeStreakState(badgeId, playerId){
  if(badgeId === 'award_collector'){
    // Reset pro Saison: laufender Stand der AKTUELLEN Saison (5 Tagessiege UND
    // 2 Wochensiege nötig). Wiederverwendung von countDayWins/countPeriodWins auf
    // den (bereits gecachten) Saison-Matches — beide schließen den laufenden Tag
    // bzw. die laufende Woche aus, zählen also nur abgeschlossene Perioden.
    const sid = currentSeason().id;
    const key = 'awColl_'+playerId+'_'+sid+'_'+matches.length+'_'+_cache.version;
    if(!_cache._awColl) _cache._awColl = {};
    let res = _cache._awColl[key];
    if(!res){
      // Mit der Version im Schluessel waechst der Topf sonst ueber jede Version mit.
      _topfDeckel(_cache._awColl, 60);
      const seasonMs = matchesInSeason(sid);
      res = { potd: countDayWins(playerId, seasonMs), potw: countPeriodWins(playerId, seasonMs, 'week') };
      _cache._awColl[key] = res;
    }
    return {
      kind:'dual',
      metrics:[
        {cur:res.potd, tgt:5, label:'Tagessiege'},
        {cur:res.potw, tgt:2, label:'Wochensiege'}
      ],
      hint:'Zählt nur die laufende Saison, beide Ziele nötig, Reset zu Saisonbeginn.'
    };
  }
  if(badgeId === 'allwetter'){
    // Dieselben Wochentage, die die Auszeichnung zählt — als Menge für die Chips.
    const weekdays = _allwetterTage(playerId);
    return {weekdays, tgt:5, label:'Wochentage als Tagessieger', kind:'weekday'};
  }

  // Alle übrigen Fälle laufen chronologisch durch die Matches des Spielers.
  const ordered = matches.filter(m => matchOf(playerId,m))
    .sort((a,b) => mts(a)-mts(b));

  switch(badgeId){
    case 'nerves_of_steel': {
      // Zittersiege (10:9) in Folge — nicht-knappe Partien überspringen die Serie
      // ohne sie zu brechen; nur eine knappe Niederlage (9:10) setzt zurück.
      let cur = 0;
      ordered.forEach(m => {
        const gf=goalsFor(playerId,m), ga=goalsAgainst(playerId,m);
        const isClose=(gf===10&&ga===9)||(gf===9&&ga===10);
        if(!isClose) return;
        cur = won(playerId,m) ? cur+1 : 0;
      });
      return {cur, tgt:3, label:'Zittersiege in Folge', hint:'Setzt bei knapper Niederlage (9:10) zurück'};
    }
    case 'krimi': {
      // Partien mit Tordifferenz ≤ 2 in Folge — ein klares Ergebnis bricht die Serie.
      let cur = 0;
      ordered.forEach(m => {
        cur = Math.abs(m.score_a-m.score_b) <= 2 ? cur+1 : 0;
      });
      return {cur, tgt:5, label:'Krimis in Folge (höchstens 2 Tore Unterschied)', hint:'Setzt bei klarem Ergebnis (mehr als 2 Tore Unterschied) zurück'};
    }
    case 'repeat_score': {
      // Siege mit identischem Endstand in Folge — Niederlage oder anderer Score bricht.
      let lastScore=null, cur=0;
      ordered.forEach(m => {
        if(!won(playerId,m)){cur=0;lastScore=null;return;}
        const score=goalsFor(playerId,m)+':'+goalsAgainst(playerId,m);
        if(score===lastScore) cur++; else {cur=1;lastScore=score;}
      });
      return {cur, tgt:3, label:'Siege mit gleichem Endstand in Folge', hint:'Setzt bei Niederlage oder anderem Ergebnis zurück'};
    }
    case 'losing5': {
      let cur=0;
      ordered.forEach(m => { cur = won(playerId,m) ? 0 : cur+1; });
      return {cur, tgt:5, label:'Niederlagen in Folge', hint:'Setzt bei einem Sieg zurück'};
    }
    case 'streak5': case 'streak10': case 'streak15': case 'streak20': {
      const tgts={streak5:5,streak10:10,streak15:15,streak20:20};
      let cur=0;
      ordered.forEach(m => { cur = won(playerId,m) ? cur+1 : 0; });
      return {cur, tgt:tgts[badgeId], label:'Siege in Folge', hint:'Setzt bei einer Niederlage zurück'};
    }
    case 'nemesis': {
      // Aktueller Niederlagen-Streak gegen denselben Gegner (max. über alle Gegner).
      const vs = {};
      ordered.forEach(m => {
        const onA = (playerId===m.a1||playerId===m.a2);
        const w = (onA && m.winner==='A') || (!onA && m.winner==='B');
        const opps = onA ? [m.b1,m.b2] : [m.a1,m.a2];
        if(w) opps.forEach(o => { vs[o] = 0; });
        else  opps.forEach(o => { vs[o] = (vs[o]||0) + 1; });
      });
      const cur = Object.values(vs).reduce((a,b) => a>b?a:b, 0);
      return {cur, tgt:5, label:'Niederlagen gg. denselben Gegner in Folge', hint:'Setzt bei einem Sieg gegen diesen Gegner zurück'};
    }
  }
  return null;
}

// Rendert den „Aktueller Lauf"-Abschnitt für ein Kontext-/Serien-Badge.
// Gibt '' zurück, wenn das Badge keinen resettbaren Zähler hat.
const _WEEKDAY_ABBR = ['Mo','Di','Mi','Do','Fr','Sa','So']; // Index = (getDay()+6)%7
function _badgeStreakSectionHtml(badgeId, playerId, rarity){
  const st = _badgeStreakState(badgeId, playerId);
  if(!st) return '';
  if(st.kind === 'dual'){
    // Zwei parallele Ziele (z. B. Award-Sammler: Tagessiege + Wochensiege).
    const bars = st.metrics.map(mt => {
      const done = mt.cur >= mt.tgt;
      const pct = Math.round(Math.min(mt.cur / mt.tgt, 1) * 100);
      return `
      <div class="bp-prog">
        <div class="bp-prog-bar"><div class="bp-prog-fill ${rarity}" style="width:${pct}%"></div></div>
        <div class="bp-prog-label">
          <span>${mt.cur} / ${mt.tgt} <span class="bp-prog-target">${esc(mt.label)}</span></span>
          <span>${done?'✓':pct+'%'}</span>
        </div>
      </div>`;
    }).join('');
    return `
      <div class="bp-section">Aktuelle Saison</div>
      ${bars}
      <div class="bp-run-hint">${esc(st.hint)}</div>`;
  }
  if(st.kind === 'weekday'){
    const have = st.weekdays.size;
    const chips = _WEEKDAY_ABBR.map((abbr, i) => {
      // i = (getDay()+6)%7 → 0=Mo … 6=So; zurückrechnen auf getDay()
      const jsDay = (i + 1) % 7;
      const on = st.weekdays.has(jsDay);
      return `<div class="bp-wd ${on?'on':''}">${abbr}</div>`;
    }).join('');
    return `
      <div class="bp-section">Wochentage gesammelt</div>
      <div class="bp-weekdays">${chips}</div>
      <div class="bp-run-label"><span>${have} / ${st.tgt} <span class="bp-prog-target">${esc(st.label)}</span></span></div>`;
  }
  const cur = st.cur || 0;
  const pct = Math.round(Math.min(cur / st.tgt, 1) * 100);
  return `
    <div class="bp-section">Aktueller Lauf</div>
    <div class="bp-prog">
      <div class="bp-prog-bar"><div class="bp-prog-fill ${rarity}" style="width:${pct}%"></div></div>
      <div class="bp-prog-label">
        <span>${cur} / ${st.tgt} <span class="bp-prog-target">${esc(st.label)}</span></span>
        <span>${pct}%</span>
      </div>
    </div>
    <div class="bp-run-hint">${esc(st.hint)}</div>`;
}

function showBadgePopover(badgeId, playerId){
  const b = BADGES.find(x => x.id === badgeId); if(!b) return;
  const r = rarityOf(b.id);
  const rarityLabel = (RARITY_META[r] && RARITY_META[r].label) || '';
  const earned = getCachedBadges(playerId);
  const cnt = (earned.find(e => e.id === badgeId)||{}).count || 0;
  const unlocked = cnt > 0;
  const ONCE_ONLY = new Set(['first_match','games25','games150','games250','wins200','allrounder','def50','atk50',
    'allwetter']);
  const isRepeatable = !ONCE_ONLY.has(b.id);

  // ─── Body je nach Modus ───
  let bodyHtml;
  if(unlocked){
    // Match-Liste (für fire-basierte Badges)
    const hits = _badgeFireMatches(playerId, badgeId);
    if(hits.length){
      const maxShow = 8;
      const shown = hits.slice(0, maxShow);
      const rowsHtml = shown.map(m => {
        const date = new Date(m.created_at);
        const dateStr = datumFmt(date, 'tmj');
        const onA = (playerId===m.a1||playerId===m.a2);
        const myGf = onA?m.score_a:m.score_b;
        const myGa = onA?m.score_b:m.score_a;
        const won = (onA&&m.winner==='A')||(!onA&&m.winner==='B');
        const col = won ? 'var(--acid)' : 'var(--red)';
        return `<div class="bp-match" data-mid="${esc(m.id)}">
          <div class="bp-match-date">${dateStr}</div>
          <div class="bp-match-score" style="color:${col}">${myGf} : ${myGa}</div>
          <div class="bp-match-arr">›</div>
        </div>`;
      }).join('');
      const moreHint = hits.length > maxShow
        ? `<div class="bp-more">+ ${hits.length - maxShow} weitere</div>` : '';
      bodyHtml = `
        <div class="bp-section">Ausgelöst in ${hits.length} ${hits.length===1?'Match':'Matches'}</div>
        ${rowsHtml}${moreHint}`;
    } else {
      // Saison-/Karriere-aggregierte Badges ohne fire-Trigger.
      // Wir zeigen einen kurzen Hinweis statt einer Liste.
      bodyHtml = `
        <div class="bp-section">Status</div>
        <div class="bp-locked-hint">
          Diese Auszeichnung wird über Saison-/Karriere-Daten ermittelt und
          ist nicht an ein einzelnes Match gebunden.
          ${isRepeatable
            ? `<br><br><span class="bp-locked-em">${cnt}×</span> bisher erreicht.`
            : `<br><br><span class="bp-locked-em">Freigeschaltet.</span>`}
        </div>`;
    }
  } else {
    // Locked — Fortschritt oder Hinweis
    const prog = _badgeProgress(badgeId, playerId);
    if(prog){
      const pct = Math.round(prog.cur / prog.tgt * 100);
      bodyHtml = `
        <div class="bp-section">Fortschritt</div>
        <div class="bp-prog">
          <div class="bp-prog-bar"><div class="bp-prog-fill ${r}" style="width:${Math.min(pct,100)}%"></div></div>
          <div class="bp-prog-label">
            <span>${prog.cur} / ${prog.tgt} <span class="bp-prog-target">${esc(prog.label)}</span></span>
            <span>${pct}%</span>
          </div>
        </div>`;
    } else {
      // Kein Fortschritt definierbar — knapper Hinweis
      bodyHtml = `
        <div class="bp-section">Status</div>
        <div class="bp-locked-hint">
          Noch <span class="bp-locked-em">nicht erreicht</span>.<br>
          Erfüll die Voraussetzung im nächsten Spiel oder über die Saison hinweg.
        </div>`;
    }
  }

  // Kontext-/Serien-Badges: laufender Zähler (resettet je nach Spielverlauf).
  // Erscheint zusätzlich zur Match-Liste/zum Fortschritt — sowohl locked als
  // auch unlocked, damit man sieht, wie nah man an der nächsten Auslösung ist.
  bodyHtml += _badgeStreakSectionHtml(badgeId, playerId, r);

  // Status-Pill rechts oben in der Card (×N oder "Freigeschaltet")
  const statusHtml = unlocked
    ? (isRepeatable
        ? `<div class="bp-status"><div class="bp-status-count" style="color:${{legendary:'var(--gold)',rare:'var(--purple)',common:'var(--acid)',negative:'var(--red)'}[r]||'var(--ink)'}">×${cnt}</div><div class="bp-status-label">erreicht</div></div>`
        : `<div class="bp-status"><div class="bp-status-count" style="color:${{legendary:'var(--gold)',rare:'var(--purple)',common:'var(--acid)',negative:'var(--red)'}[r]||'var(--ink)'}">✓</div><div class="bp-status-label">freigeschaltet</div></div>`)
    : '';

  const bp = document.getElementById('bp');
  const bpBg = document.getElementById('bpBg');
  bp.innerHTML = `
    <div class="bp-head">
      <div class="bp-ic ${unlocked?r:'locked'}">${unlocked ? badgeIc(b, '24px') : svgI('lock')}</div>
      <div style="flex:1;min-width:0">
        <div class="bp-title">${esc(b.name)}</div>
        <div class="bp-desc">${esc(b.desc)}</div>
        <div class="bp-rarity">${esc(rarityLabel)}</div>
      </div>
      ${statusHtml}
    </div>
    ${bodyHtml}
    <button class="bp-close" id="bpCloseBtn">Schließen</button>
  `;
  bpBg.classList.add('show');
  bp.scrollTop = 0;
  // Match-Click: schließt POPOVER und SHEET, öffnet Match-Detail
  bp.querySelectorAll('.bp-match[data-mid]').forEach(el => {
    el.onclick = () => {
      const mid = el.dataset.mid;
      closeBadgePopover();
      sheetNav(() => showMatchDetail(mid)); // Match-Detail über das aktuelle Sheet stapeln
    };
  });
  document.getElementById('bpCloseBtn').onclick = closeBadgePopover;
}

function closeBadgePopover(){
  const bpBg = document.getElementById('bpBg');
  if(bpBg) bpBg.classList.remove('show');
}

