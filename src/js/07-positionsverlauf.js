// ╔═══ §3.4 ─── SAISON-POSITIONSVERLAUF (§C21 UI) ──────────────────────╗
//     Bottom-Sheet mit Liniendiagramm der Tabellenpositionen über die
//     Tage der aktuellen Saison. Hervorhebung per Tap auf Linie/Endpunkt-
//     Avatar — Detail-Karte zeigt selektierten Spieler. CSS-Toggle für
//     Highlight, kein Re-Render der SVG-Lines bei jedem Tap.
// ╚═════════════════════════════════════════════════════════════════════════╝

// Avatar-Helper für SVG: liefert ein <g>-Element mit Emoji ODER Initialen-Kreis.
// transform="translate(cx, cy)" wird vom Caller gesetzt; hier nur der innere Markup.
function _posvAvSvg(player, color, dataPid){
  const r = 11;
  if(!player){
    return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
      <circle r="${r}" fill="var(--surface3)" stroke="${color}" stroke-width="1.5"/>
      <text text-anchor="middle" dominant-baseline="central" fill="var(--muted)" font-size="13" font-family="'Archivo Black',sans-serif">?</text>
    </g>`;
  }
  const em = player.avatar_id ? avatarEmoji(player.avatar_id) : null;
  if(em){
    return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
      <circle r="${r}" fill="var(--surface3)" stroke="${color}" stroke-width="1.5"/>
      <text text-anchor="middle" dominant-baseline="central" font-size="14"
        font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla',sans-serif">${em}</text>
    </g>`;
  }
  return `<g class="posv-end-av" data-pid="${esc(dataPid)}">
    <circle r="${r}" fill="${avColor(player.id)}" stroke="${color}" stroke-width="1.5"/>
    <text text-anchor="middle" dominant-baseline="central" fill="#0a0c0b" font-size="10"
      font-family="'Archivo Black',sans-serif">${esc(initials(player.name))}</text>
  </g>`;
}

// Wie sich der Platz eines Spielers vom vorletzten zum letzten Spieltag
// bewegt hat: positiv heißt aufwärts. `null` vor seinem ersten Spieltag.
function _posvBewegung(data, pid){
  const st = data.spielTage || [];
  const arr = data.positionsByDay[pid] || [];
  const jetzt = st.length ? arr[st[st.length - 1] - 1] : null;
  const vorher = st.length > 1 ? arr[st[st.length - 2] - 1] : null;
  if(jetzt == null) return null;
  if(vorher == null) return {neu:true, d:0};
  return {neu:false, d:vorher - jetzt};
}
function _posvJetzt(data, pid){
  const arr = data.positionsByDay[pid] || [];
  for(let i = arr.length - 1; i >= 0; i--) if(arr[i] !== null) return arr[i];
  return null;
}

// Baut das komplette SVG für den Positionsverlauf. Eine Funktion, ein String —
// kein DOM-Build aus Performance-Gründen. Highlight wird via CSS-Klassen-Toggle
// nachträglich angewendet.
//
// Die Linien sind Kurven von Tag zu Tag, wie eine Tabelle über die Zeit
// gelesen wird: gerade Linien kreuzten sich in Spitzen, und bei acht
// Spielern war nicht zu sehen, wer wen überholt. Am Ende steht das Gesicht
// und die Bewegung seit dem letzten Spieltag; der Name stand dort mit „…"
// gekürzt und steht jetzt ganz in der Tabelle darunter [§C33]. Die Tage mit
// Partie tragen eine Marke auf der Achse: ohne sie sah ein Tag ohne Spiel
// aus wie einer, an dem sich nichts bewegt hat.
function _buildPositionChartSvg(data){
  const VB_W = 360, VB_H = 280;
  const ML = 24, MR = 62, MT = 12, MB = 34;
  const PW = VB_W - ML - MR;
  const PH = VB_H - MT - MB;
  const N = data.activeIds.length;
  const D = data.lastDay;
  const xOf = day => ML + (D <= 1 ? PW/2 : (day-1)/(D-1) * PW);
  const yOf = pos => MT + (N <= 1 ? PH/2 : (pos-1)/(N-1) * PH);

  let grid = '';
  for(let p=1; p<=N; p++){
    const y = yOf(p);
    grid += `<line x1="${ML}" y1="${y}" x2="${ML+PW}" y2="${y}"/>`;
  }
  let yTicks = '';
  for(let p=1; p<=N; p++){
    yTicks += `<text class="posv-y-tick${p === 1 ? ' eins' : ''}" x="${ML-7}" y="${yOf(p)}">${p}</text>`;
  }
  // ── X-Achse Ticks: bei ≤7 Tagen jeder Tag, sonst 1,5,10,15,…
  const tickDays = [];
  if(D <= 7){
    for(let d=1; d<=D; d++) tickDays.push(d);
  } else {
    tickDays.push(1);
    for(let d=5; d<=D; d+=5) tickDays.push(d);
    // Endpunkt immer — und der Fünferschritt davor fällt weg, wenn er zu
    // nah daran liegt: am 26. standen „25" und „26" als „2526" übereinander.
    if(tickDays[tickDays.length-1] !== D){
      if(D - tickDays[tickDays.length-1] < 3) tickDays.pop();
      tickDays.push(D);
    }
  }
  const seenTicks = new Set();
  let xTicks = '';
  tickDays.filter(d => !seenTicks.has(d) && seenTicks.add(d)).forEach(d => {
    xTicks += `<text class="posv-x-tick" x="${xOf(d)}" y="${MT+PH+24}">${d}</text>`;
  });
  const spieltage = (data.spielTage || []).map(d => `<circle class="posv-st" cx="${xOf(d).toFixed(1)}" cy="${MT+PH+10}" r="2.2"/>`).join('');

  const playersByEndPos = data.activeIds
    .map(id => ({id, lastPos:_posvJetzt(data, id)}))
    .filter(o => o.lastPos !== null)
    .sort((a,b)=> a.lastPos - b.lastPos);

  let lines = '', hits = '', dots = '', ends = '';
  const pm = pmap();
  playersByEndPos.forEach((o, k) => {
    const pid = o.id;
    const color = data.colorOf[pid] || '#888';
    const arr = data.positionsByDay[pid];
    const pts = [];
    for(let i=0; i<arr.length; i++){
      if(arr[i] !== null) pts.push({x: xOf(i+1), y: yOf(arr[i])});
    }
    if(pts.length === 0) return;
    const d = _posvPfad(pts);
    lines += `<path class="posv-line" data-pid="${esc(pid)}" d="${d}" stroke="${color}" pathLength="1" style="--k:${k}"/>`;
    hits  += `<path class="posv-line-hit" data-pid="${esc(pid)}" d="${d}"/>`;
    // Ein Punkt je Spieltag, nicht je Kalendertag: an einem Tag ohne Partie
    // gibt es nichts zu markieren.
    const st = new Set(data.spielTage || []);
    for(let i=0; i<arr.length; i++){
      if(arr[i] === null || (!st.has(i + 1) && i !== arr.length - 1)) continue;
      const last = i === arr.length - 1;
      dots += `<circle class="posv-dot" data-pid="${esc(pid)}" cx="${xOf(i+1).toFixed(1)}" cy="${yOf(arr[i]).toFixed(1)}" r="${last ? 3.2 : 2}" fill="${color}"/>`;
    }
    const xEnd = pts[pts.length-1].x, yEnd = pts[pts.length-1].y;
    const avX = Math.min(xEnd + 16, VB_W - 46);
    ends += `<g transform="translate(${avX.toFixed(1)},${yEnd.toFixed(1)})">${_posvAvSvg(pm[pid], color, pid)}</g>`;
    const bw = _posvBewegung(data, pid);
    const txt = !bw ? '' : bw.neu ? 'neu' : bw.d > 0 ? '▲' + bw.d : bw.d < 0 ? '▼' + Math.abs(bw.d) : '';
    if(txt) ends += `<text class="posv-end-d ${!bw || bw.neu ? '' : bw.d > 0 ? 'auf' : 'ab'}" data-pid="${esc(pid)}" x="${(avX + 15).toFixed(1)}" y="${yEnd.toFixed(1)}">${txt}</text>`;
  });

  return `<svg class="posv-svg" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMinYMin meet" xmlns="http://www.w3.org/2000/svg">
    <g class="posv-grid">${grid}</g>
    ${yTicks}
    ${spieltage}
    ${xTicks}
    <g>${hits}</g>
    <g>${lines}</g>
    <g>${dots}</g>
    <g>${ends}</g>
  </svg>`;
}

// Die Kurve eines Spielers von Tag zu Tag. Sie steht an EINER Stelle, weil
// Blatt und Vorschau dieselbe Linie zeichnen [§C27]: zwei Formeln für die
// Kurve hätten in der Karte unter der Rangliste einen anderen Verlauf
// gezeigt als im Blatt, das sie öffnet.
function _posvPfad(pts){
  if(pts.length === 1){
    return `M ${(pts[0].x-2).toFixed(1)} ${pts[0].y.toFixed(1)} L ${(pts[0].x+2).toFixed(1)} ${pts[0].y.toFixed(1)}`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for(let i=1; i<pts.length; i++){
    const a = pts[i-1], b = pts[i], h = (b.x - a.x) / 2;
    d += ` C ${(a.x+h).toFixed(1)} ${a.y.toFixed(1)} ${(b.x-h).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

// Die Vorschau unter der Rangliste: derselbe Verlauf wie im Blatt, nur
// vereinfacht — jede Linie, aber ohne Gesichter, ohne Achsen und ohne
// Bewegung am Ende. Sie zeigte vorher die Elo der ersten drei, also eine
// andere Grafik als das Blatt, das sie öffnet: wer tippte, sah etwas
// anderes, als die Karte versprochen hatte. Die ersten drei tragen ihre
// Linie voll, alle übrigen leise; darunter stehen sie mit Platz und Farbe,
// weil die Grafik keine Namen trägt.
function posvVorschauHtml(sid){
  const data = getSeasonPositionHistory(sid);
  if(data.empty || !data.activeIds.length || !data.lastDay) return '';
  const W = 320, H = 132, ML = 16, MR = 10, MT = 8, MB = 16;
  const PW = W - ML - MR, PH = H - MT - MB;
  const N = data.activeIds.length, D = data.lastDay;
  const xOf = day => ML + (D <= 1 ? PW / 2 : (day - 1) / (D - 1) * PW);
  const yOf = pos => MT + (N <= 1 ? PH / 2 : (pos - 1) / (N - 1) * PH);
  const ids = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b));
  if(ids.length < 2) return '';
  let linien = '', punkte = '';
  // Von hinten nach vorn gezeichnet: die Linie des Ersten liegt oben.
  ids.slice().reverse().forEach(id => {
    const arr = data.positionsByDay[id] || [];
    const pts = [];
    arr.forEach((p, i) => { if(p !== null) pts.push({x:xOf(i + 1), y:yOf(p)}); });
    if(!pts.length) return;
    const vorn = _posvJetzt(data, id) <= 3;
    const c = data.colorOf[id] || '#888';
    linien += `<path class="posv-mini-l${vorn ? '' : ' leise'}" d="${_posvPfad(pts)}" stroke="${c}"/>`;
    const e = pts[pts.length - 1];
    punkte += `<circle class="posv-mini-p${vorn ? '' : ' leise'}" cx="${e.x.toFixed(1)}" cy="${e.y.toFixed(1)}" r="${vorn ? 3.4 : 2.2}" fill="${c}"/>`;
  });
  const st = (data.spielTage || []).map(d => `<circle class="posv-st" cx="${xOf(d).toFixed(1)}" cy="${H - 5}" r="1.8"/>`).join('');
  const raster = Array.from({length:N}, (_, i) => `<line x1="${ML}" x2="${ML + PW}" y1="${yOf(i + 1).toFixed(1)}" y2="${yOf(i + 1).toFixed(1)}"/>`).join('');
  const pm = pmap();
  const legende = ids.slice(0, 3).map(id => `<span style="--c:${data.colorOf[id] || '#888'}"><i></i>`
    + `<b class="num">${_posvJetzt(data, id)}.</b>${esc((pm[id] || {}).name || '?')}</span>`).join('');
  return `<span class="posv-mini"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
    + `<g class="posv-mini-r">${raster}</g>`
    + `<text class="posv-mini-y eins" x="${ML - 6}" y="${yOf(1).toFixed(1)}">1</text>`
    + `<text class="posv-mini-y" x="${ML - 6}" y="${yOf(N).toFixed(1)}">${N}</text>`
    + `${st}${linien}${punkte}</svg><span class="posv-mini-lg">${legende}</span></span>`;
}

// Der Verlauf eines Spielers in einer Zeile der Tabelle, so klein wie ein
// Wort: dieselbe Kurve wie oben, ohne Achsen.
function _posvSpark(data, pid){
  const arr = data.positionsByDay[pid] || [], N = Math.max(2, data.activeIds.length), D = data.lastDay;
  const pts = [];
  arr.forEach((p, i) => { if(p !== null) pts.push([D <= 1 ? 28 : 2 + i / (D - 1) * 52, 2 + (p - 1) / (N - 1) * 14]); });
  if(pts.length < 2) return `<svg class="posv-spark" viewBox="0 0 56 18" aria-hidden="true"></svg>`;
  return `<svg class="posv-spark" viewBox="0 0 56 18" aria-hidden="true"><polyline points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" stroke="${data.colorOf[pid] || '#888'}"/>`
    + `<circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2" fill="${data.colorOf[pid] || '#888'}"/></svg>`;
}

// Die Tabelle des letzten Stands: Platz, Gesicht, Name, Verlauf, Bewegung
// und Elo. Sie ist zugleich die Wahl des Spielers — ein Hinweis „Linie
// antippen" erklärte vorher, wie man die Grafik bedient.
function _posvTabelle(data){
  const pm = pmap();
  const ids = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b));
  return `<div class="posv-tab">${ids.map((id, k) => {
    const bw = _posvBewegung(data, id);
    const bew = !bw ? '' : bw.neu ? '<span class="posv-bw neu">neu</span>'
      : bw.d > 0 ? `<span class="posv-bw auf num">▲${bw.d}</span>`
      : bw.d < 0 ? `<span class="posv-bw ab num">▼${Math.abs(bw.d)}</span>` : '<span class="posv-bw num">–</span>';
    const elo = data.finalElo[id];
    return `<div class="posv-row${_posvJetzt(data, id) === 1 ? ' eins' : ''}" data-pid="${esc(id)}" style="--k:${k};--c:${data.colorOf[id] || '#888'}">`
      + `<b class="posv-pl num">${_posvJetzt(data, id)}.</b>${pm[id] ? avHtml(pm[id], '', {px:26}) : ''}`
      + `<span class="posv-nm">${esc((pm[id] || {}).name || '?')}</span>${_posvSpark(data, id)}${bew}`
      + `<span class="posv-elo num">${elo === undefined ? '–' : Math.round(elo)}</span></div>`;
  }).join('')}</div>`;
}

// Der gewählte Spieler: Wappen und Name, die Zahlen der Saison als
// Zahlenreihe [§C31], sein Platz an jedem Tag als Zelle — Gold, wo er vorn
// lag — und seine Partien als Lauf [§C27]. Vorher stand hier ein leerer
// Kasten mit „Hier stehen die Einzelheiten, sobald ein Spieler gewählt ist".
function _renderPosvDetail(el, data, hlId){
  if(!hlId){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const p = pmap()[hlId];
  const s = getSeasonPlayerStats(data.seasonId)[hlId] || {wins:0, losses:0, games:0};
  const arr = data.positionsByDay[hlId] || [];
  const st = new Set(data.spielTage || []);
  const jetzt = _posvJetzt(data, hlId);
  const best = Math.min(...arr.filter(x => x !== null));
  const vorn = (data.spielTage || []).filter(d => arr[d - 1] === 1).length;
  const elo = data.finalElo[hlId];
  const zellen = arr.map((pos, i) => `<span class="${pos === null ? 'leer' : pos === 1 ? 'eins' : ''}${st.has(i + 1) ? ' gespielt' : ''}" style="--k:${i}">`
    + `${pos === null ? '' : `<b class="num">${pos}</b>`}<small class="num">${i + 1}</small></span>`).join('');
  el.innerHTML = `<div class="posv-dk">${p ? avHtml(p, '', {ins:true, px:48, feuer:0}) : ''}
      <div class="posv-dk-t"><b>${esc(p ? p.name : '?')}</b><small>Platz ${jetzt} von ${data.activeIds.length}</small></div>
      <i class="posv-dk-c" style="background:${data.colorOf[hlId] || '#888'}"></i></div>`
    + rcpZahlenHtml([
        {v:jetzt + '.', l:'Platz', ton:jetzt === 1 ? 'gold' : ''},
        {v:elo === undefined ? '–' : String(Math.round(elo)), l:'Elo'},
        {v:s.wins + '–' + s.losses, l:'Bilanz'},
        {v:s.games ? Math.round(s.wins / s.games * 100) + ' %' : '–', l:'Siegquote'},
        {v:best + '.', l:'Bester Platz'},
        {v:String(vorn), l:vorn === 1 ? 'Spieltag vorn' : 'Spieltage vorn'}
      ])
    + `<div class="nd-section">Platz an jedem Tag</div><div class="posv-tz">${zellen}</div>`
    + `<div class="nd-section">Die Partien der Saison</div>${saisonZellenHtml(data.seasonId, hlId)}`;
}

// Highlight-Logik: zentraler Click-Handler auf das Sheet-Root via Event-Delegation,
// damit wir keine pro-Element-Listener leaken müssen und SVG-Elemente innerhalb
// nachträglich gewechselt werden können. Die Zeilen der Tabelle wählen
// denselben Spieler wie Linie und Gesicht.
function _attachPosvHighlight(rootEl, data){
  const chartHost = rootEl.querySelector('.posv-chart-host');
  const detailEl  = rootEl.querySelector('#posvDetail');
  let curHl = null;

  function applyHl(pid){
    if(pid && pid === curHl) pid = null; // gleiche Linie nochmal → reset
    curHl = pid;
    chartHost.classList.toggle('posv-dim', !!pid);
    rootEl.querySelectorAll('.posv-chart-host .hl, .posv-row.hl').forEach(el => el.classList.remove('hl'));
    if(pid){
      rootEl.querySelectorAll(`.posv-chart-host [data-pid="${CSS.escape(pid)}"], .posv-row[data-pid="${CSS.escape(pid)}"]`)
        .forEach(el => el.classList.add('hl'));
    }
    _renderPosvDetail(detailEl, data, pid);
  }

  rootEl.addEventListener('click', (e) => {
    // Das Detail selbst führt nicht weiter: ein Wappen darin ist kein Wechsel.
    if(detailEl.contains(e.target)) return;
    let target = e.target;
    let pid = null;
    while(target && target !== rootEl){
      if(target.dataset && target.dataset.pid && (chartHost.contains(target) || target.classList.contains('posv-row'))){ pid = target.dataset.pid; break; }
      target = target.parentNode;
    }
    if(pid){
      e.stopPropagation();
      applyHl(pid);
      return;
    }
    if(curHl && chartHost.contains(e.target)) applyHl(null);
  });
}

// Hauptfunktion: öffnet das Sheet. Saison-Argument optional (default: aktuelle).
function showPositionHistory(seasonId){
  if(!seasonId) seasonId = currentSeason().id;
  _sheetSetReopen(()=>showPositionHistory(seasonId));
  const data = getSeasonPositionHistory(seasonId);
  const sLabel = seasonLabel(seasonId);

  if(data.empty || data.activeIds.length === 0 || data.lastDay === 0){
    openSheet(`
      <div class="posv-empty">
        <div class="posv-empty-title">Noch kein Verlauf</div>
        <div>Sobald in dieser Saison die ersten Matches gespielt sind,<br>steht hier die Entwicklung der Tabellenplätze.</div>
      </div>
    `);
    return;
  }

  const headerDate = new Date().toLocaleString('de-DE',{hour:'2-digit',minute:'2-digit'});
  const subInfo = data.isCurrent
    ? `${sLabel} · Tag ${data.lastDay} von ${data.totalDays}`
    : `${sLabel} · Saison abgeschlossen`;
  const n = (data.spielTage || []).length;
  // Die Tage an der Spitze als Balken — dasselbe Bauteil wie im
  // Saison-Rückblick und auf der Meisterbühne [§C27].
  const podium = data.activeIds.filter(id => _posvJetzt(data, id) !== null)
    .sort((a, b) => _posvJetzt(data, a) - _posvJetzt(data, b)).slice(0, 3);
  const spitze = saisonSpitzeHtml(seasonId, podium);

  openSheet(`
    <div style="padding:0 0 8px">
      ${blattKopfHtml({ic:'chartUp', titel:'Positionsverlauf', unter:'Tabellenplätze während der Saison'})}
      <div style="height:12px"></div>

      <div class="posv-info-pill">
        <div class="posv-info-ic">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </div>
        <div class="posv-info-text">
          <div class="posv-info-title">${data.isCurrent ? 'Aktuelle Saison' : 'Vergangene Saison'}</div>
          <div class="posv-info-sub">${esc(subInfo)}</div>
        </div>
        <div class="posv-info-n"><b class="num">${n}</b><small>${n === 1 ? 'Spieltag' : 'Spieltage'}</small></div>
      </div>

      <div class="posv-chart-host" id="posvChartHost">
        <div class="posv-chart-axislabel">Position</div>
        ${_buildPositionChartSvg(data)}
      </div>

      <div class="posv-detail" id="posvDetail" hidden></div>

      <div class="nd-section">Die Tabelle</div>
      ${_posvTabelle(data)}
      ${spitze ? `<div class="nd-section">Tage an der Spitze</div>${spitze}` : ''}

      <div class="posv-update">
        <span>Stand: heute, ${headerDate}</span>
        <button class="posv-refresh" id="posvRefreshBtn" title="Aktualisieren">
          <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></svg>
        </button>
      </div>
    </div>
  `);

  const sheet = document.getElementById('sheet');
  _attachPosvHighlight(sheet, data);

  // Refresh: kurze Spin-Animation + Sheet neu rendern (Cache wird nicht hart
  // invalidiert — neuer Build via aktualisiertem Zeitstempel reicht, alle Daten
  // sind durch invalidateCache(['global', …]) nach jedem Match eh schon frisch).
  const refreshBtn = sheet.querySelector('#posvRefreshBtn');
  if(refreshBtn){
    refreshBtn.onclick = (e) => {
      e.stopPropagation();
      refreshBtn.classList.add('spin');
      setTimeout(()=>{
        refreshBtn.classList.remove('spin');
        showPositionHistory(seasonId);
      }, 380);
    };
  }
}


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
        const k=[p1,p2].sort().join('|');
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
    const POTW_MIN_WINS = 5;
    const candidates = Object.entries(ps)
      .filter(([id,s]) => s.wins >= POTW_MIN_WINS && sichtbar(pm[id]))
      .map(([id,s]) => {
        const games = s.wins + s.losses;
        return [id, s, games ? s.wins/games : 0];
      })
      .sort((a,b) => {
        if(b[2] !== a[2]) return b[2] - a[2];               // winrate desc
        if(b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
        return b[1].eloDelta - a[1].eloDelta;
      });

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
    hl('chartUp', 'Größter Aufwind',
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
// HIER ENDET DER showPotwRecap FUNKTIONSBLOCK

// Auto-Trigger: an Mo/Di der neuen Woche einmal pro Gerät
function autoShowPotwRecap(){
  try{
    const now=new Date();
    const wd=(now.getDay()+6)%7; // 0=Mo
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
        const wd=(now.getDay()+6)%7;
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
    const candidates=Object.entries(ps)
      .filter(([id,s])=> s.wins>=3 && sichtbar(pm[id]))
      .sort((a,b)=>{
        if(b[1].wins!==a[1].wins) return b[1].wins-a[1].wins;
        return b[1].eloDelta-a[1].eloDelta;
      });
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
    tagHl('chartUp', 'Größter Aufwind', tagAufstieg ? pname(tagAufstieg.id) : null,
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

function setConn(t,c){document.getElementById('connText').textContent=t;document.getElementById('connDot').className='dot '+c;}
function allPlayerStats(){
  const key='allStats_'+matches.length+'_'+_cache.version;
  if(_cache._allStatsKey===key) return _cache._allStatsData;
  
  const stats={};
  const run={};
  
  // Initialisierung: nur aktive Spieler (verringert die Anzahl der zu verarbeitenden IDs)
  // Die Laufbahn ist Geschichte: auch ein Ruheständler behält seine Zahlen
  // fürs Profil [§C40]. Wer im Positionen-Reiter mitvergleicht, filtert dort.
  const activeIds = new Set(players.filter(p=>sichtbar(p)).map(p=>p.id));
  activeIds.forEach(id=>{
    stats[id]={games:0,wins:0,losses:0,gf:0,ga:0,
      atkG:0,atkW:0,defG:0,defW:0,
      atkGoals:0,defConceded:0, // Ø Tore (Sturm) / Ø Gegentore (Abwehr) — Basis für Rollen-Donuts und Positionen-Tab
      mates:{},opps:{},best:-1e9,worst:1e9,curStreak:0};
    run[id]=0;
  });
  
  // Single-Pass durch die Matches, sortiert nach Zeit
  const ordered=[...matches].sort((a,b)=>mts(a)-mts(b));
  for(let i=0; i<ordered.length; i++){
    const m = ordered[i];
    const d_a = m.deltas || {}; // Match-Deltas für alle Spieler im Match
    
    // Team A Spieler verarbeiten
    const teamA_players = [m.a1, m.a2];
    const teamA_won = m.winner === 'A';
    const teamA_gf = m.score_a;
    const teamA_ga = m.score_b;

    for(let j=0; j<2; j++){
      const id = teamA_players[j];
      const s = stats[id];
      if(!s) continue; // Überspringen, wenn Spieler nicht aktiv oder nicht existiert
      
      const won = teamA_won;
      const gf = teamA_gf;
      const ga = teamA_ga;
      const pos = (id === m.a1) ? m.a1_pos : m.a2_pos;
      const delta = d_a[id] || 0;
      
      s.games++;
      s.gf += gf;
      s.ga += ga;
      if(won){ s.wins++; run[id] = run[id]>=0 ? run[id]+1 : 1; }
      else   { s.losses++; run[id] = run[id]<=0 ? run[id]-1 : -1; }
      
      if(pos==='atk'){ s.atkG++; if(won) s.atkW++; s.atkGoals += gf; }
      else            { s.defG++; if(won) s.defW++; s.defConceded += ga; }
      
      const mate = (id === m.a1) ? m.a2 : m.a1;
      if(!s.mates[mate]) s.mates[mate]={g:0,w:0};
      s.mates[mate].g++;
      if(won) s.mates[mate].w++;
      
      const opp1=m.b1, opp2=m.b2;
      if(!s.opps[opp1]) s.opps[opp1]={g:0,w:0};
      s.opps[opp1].g++;
      if(won) s.opps[opp1].w++;
      if(!s.opps[opp2]) s.opps[opp2]={g:0,w:0};
      s.opps[opp2].g++;
      if(won) s.opps[opp2].w++;
      
      if(delta > s.best) s.best = delta;
      if(delta < s.worst) s.worst = delta;
    }
    
    // Team B Spieler verarbeiten (analog zu Team A)
    const teamB_players = [m.b1, m.b2];
    const teamB_won = m.winner === 'B';
    const teamB_gf = m.score_b;
    const teamB_ga = m.score_a;
    
    for(let j=0; j<2; j++){
      const id = teamB_players[j];
      const s = stats[id];
      if(!s) continue; // Überspringen, wenn Spieler nicht aktiv oder nicht existiert
      
      const won = teamB_won;
      const gf = teamB_gf;
      const ga = teamB_ga;
      const pos = (id === m.b1) ? m.b1_pos : m.b2_pos;
      const delta = d_a[id] || 0;
      
      s.games++;
      s.gf += gf;
      s.ga += ga;
      if(won){ s.wins++; run[id] = run[id]>=0 ? run[id]+1 : 1; }
      else   { s.losses++; run[id] = run[id]<=0 ? run[id]-1 : -1; }
      
      if(pos==='atk'){ s.atkG++; if(won) s.atkW++; s.atkGoals += gf; }
      else            { s.defG++; if(won) s.defW++; s.defConceded += ga; }
      
      const mate = (id === m.b1) ? m.b2 : m.b1;
      if(!s.mates[mate]) s.mates[mate]={g:0,w:0};
      s.mates[mate].g++;
      if(won) s.mates[mate].w++;
      
      const opp1=m.a1, opp2=m.a2;
      if(!s.opps[opp1]) s.opps[opp1]={g:0,w:0};
      s.opps[opp1].g++;
      if(won) s.opps[opp1].w++;
      if(!s.opps[opp2]) s.opps[opp2]={g:0,w:0};
      s.opps[opp2].g++;
      if(won) s.opps[opp2].w++;
      
      if(delta > s.best) s.best = delta;
      if(delta < s.worst) s.worst = delta;
    }
  }
  
  // Finalisierung der Statistiken (z.B. Winrate, Tordifferenz)
  activeIds.forEach(id=>{
    const s = stats[id];
    s.curStreak = run[id];
    s.wr = s.games ? s.wins/s.games : 0;
    s.atkWr = s.atkG ? s.atkW/s.atkG : null;
    s.defWr = s.defG ? s.defW/s.defG : null;
    s.gd = s.gf - s.ga;
  });
  
  _cache._allStatsKey=key;
  _cache._allStatsData=stats;
  return stats;
}



