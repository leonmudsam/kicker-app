// ╔═══ §11.6f ─── DIE EHRUNG ──────────────────────────────────────────╗
//     Welche Auszeichnungen nach einer Runde von Partien verdient wurden,
//     von wem, und was jede davon genau diesem Spieler an Prestige bringt.
//     Eine Auszeichnung stand bisher nur an ihrer Partie, und gewöhnliche
//     nur an runden Marken (die fünfte, die zehnte): wer an einem Nachmittag
//     elf holte, erfuhr von zwei. Was sie fürs Prestige wert waren, stand
//     nirgends — die Ewige Tafel zählt Rekorde und Chroniken, nicht
//     Auszeichnungen.
//
//     Die Karte entsteht zwei Stunden nach der letzten Partie, wenn keine
//     mehr dazukam (`EHRUNG_PAUSE_MS`), und erzählt alles seit der Karte
//     davor. Partien mit weniger als zwei Stunden Abstand gehören zu einer
//     Karte: 13:44 und 15:40 ergeben eine um 17:40; 13:02 und 15:30 zwei,
//     um 15:02 und um 17:30. Was erst am Tagesende vergeben wird (`tagEnde`,
//     23:57), steht in der nächsten Karte, die danach entsteht [§C33].
//
//     Der Wert je Auszeichnung ist ihr Teilwert beim wievielten Mal
//     (`auszeichnungsTeilwert`): das erste und zweite Mal voll, danach eine
//     Stufe weniger [§C34]. Dieselbe Rechnung trägt die Laufbahn.
// ╚══════════════════════════════════════════════════════════════════════╝
const EHRUNG_PAUSE_MS = 2 * 3600e3;

// Eine Karte je abgeschlossener Runde im Fenster des Feeds. Die Grenzen
// werden über ALLE Partien gezogen: sonst begänne die erste Runde im
// Fenster bei null und nähme Auszeichnungen von vor zwei Wochen mit.
function _newsEhrungStories(nowMs){
  const out = [];
  const ms = (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  if(!ms.length) return out;
  const ende = [], letzte = [];
  ms.forEach((m, i) => {
    const t = mts(m), n = i + 1 < ms.length ? mts(ms[i + 1]) : Infinity;
    if(n - t >= EHRUNG_PAUSE_MS){ ende.push(t + EHRUNG_PAUSE_MS); letzte.push(m); }
  });
  // Jede Verleihung mit ihrem Rang über die ganze Laufbahn: der wievielte
  // Erfolg es ist, entscheidet über seinen Wert. Zwei Partien können dieselbe
  // Sekunde tragen, deshalb zählt die Partie, nicht der Zeitstempel.
  const bMap = getBadgeEarnedCache();
  const mVon = new Map(ms.map(m => [m.id, m]));
  const zeiten = {}, ev = [];
  Object.keys(bMap).forEach(mid => {
    const m = mVon.get(mid);
    if(!m) return;
    const t = mts(m);
    (bMap[mid] || []).forEach(e => {
      const k = e.playerId + '|' + e.badge.id;
      (zeiten[k] = zeiten[k] || []).push({t, mid});
      const te = e.meta && e.meta.tagEnde;
      let wann = t;
      if(te){ const d = new Date(te + 'T00:00:00'); d.setHours(23, 57, 0, 0); wann = d.getTime(); }
      ev.push({pid:e.playerId, badge:e.badge, mid, t, wann});
    });
  });
  Object.keys(zeiten).forEach(k => zeiten[k].sort((a, b) => a.t - b.t));
  const rang = e => {
    const l = zeiten[e.pid + '|' + e.badge.id] || [];
    const i = l.findIndex(x => x.mid === e.mid);
    return i < 0 ? l.length : i + 1;
  };
  // Jede Verleihung gehört zu der ersten Karte, die nach ihr entsteht.
  const fenster = ende.map(() => []);
  ev.forEach(e => {
    let lo = 0, hi = ende.length;
    while(lo < hi){ const h = (lo + hi) >> 1; if(ende[h] > e.wann) hi = h; else lo = h + 1; }
    if(lo < ende.length) fenster[lo].push(e);
  });
  const seit = nowMs - NEWS_FENSTER_TAGE * 864e5;
  ende.forEach((T, i) => {
    if(T > nowMs || T < seit) return;
    const st = _newsEhrungStory(fenster[i], T, letzte[i], rang);
    if(st) out.push(st);
  });
  return out;
}

function _newsEhrungStory(liste, T, letzteM, rang){
  const je = {};
  liste.forEach(e => {
    // Ein Zeitraum: wer darin gespielt hat, steht darin [§C40].
    if(!sichtbar(e.pid)) return;
    const n = rang(e);
    const p = auszeichnungsTeilwert(e.badge.id, n);
    // Was kein Prestige gibt, steht nicht in einer Ehrung: die Schattenseiten
    // meldet der Feed nicht [§C33].
    if(!(p > 0)) return;
    const j = je[e.pid] || (je[e.pid] = {pid:e.pid, summe:0, posten:{}});
    const q = j.posten[e.badge.id] || (j.posten[e.badge.id] =
      {id:e.badge.id, name:e.badge.name, ic:e.badge.ic, klasse:rarityOf(e.badge.id), mal:0, bis:0, p:0});
    q.mal++; q.bis = Math.max(q.bis, n); q.p += p; j.summe += p;
  });
  const r1 = x => Math.round(x * 10) / 10;
  const nm = pid => pname(pid);
  const ORD = {legendary:0, rare:1, common:2};
  const spieler = Object.values(je).map(j => ({pid:j.pid, summe:r1(j.summe),
    posten:Object.values(j.posten).map(q => Object.assign({}, q, {p:r1(q.p)}))
      .sort((a, b) => (ORD[a.klasse] - ORD[b.klasse]) || (b.p - a.p) || a.name.localeCompare(b.name, 'de'))}))
    .sort((a, b) => (b.summe - a.summe) || nm(a.pid).localeCompare(nm(b.pid), 'de'));
  if(!spieler.length) return null;
  const zahl = spieler.reduce((n, x) => n + x.posten.reduce((m, q) => m + q.mal, 0), 0);
  const gesamt = Math.round(spieler.reduce((n, x) => n + x.summe, 0));
  const title = (zahl === 1 ? 'Eine Auszeichnung' : zahl + ' Auszeichnungen')
    + ' für ' + _namenKurz(spieler.map(x => nm(x.pid)));
  // Der Satz nennt das Seltenste, nicht die Summe: die Summe steht je
  // Spieler als Zahl auf der Karte. Ohne Doppelpunkt: das Blatt kürzt einen
  // Satz mit Etikett auf seinen Rest (`_ndLead`), und „Darunter eine
  // seltene: …" stand dort als Satzrest ohne Verb.
  let top = null;
  spieler.forEach(x => x.posten.forEach(q => {
    if(q.klasse !== 'common' && (!top || ORD[q.klasse] < ORD[top.q.klasse] || (q.klasse === top.q.klasse && q.p > top.q.p)))
      top = {pid:x.pid, q};
  }));
  const desc = top
    ? `${nm(top.pid)} holt dabei „${top.q.name}“ zum ${top.q.bis}. Mal, eine ${top.q.klasse === 'legendary' ? 'legendäre' : 'seltene'} Auszeichnung.`
    : `Zusammen ${gesamt} Prestige für die Laufbahn.`;
  const tage = [...new Set(liste.map(e => tagKey(e.t)))];
  return {
    id:'ehrung_' + letzteM.id, cat:'badge', ic:'medal', when:new Date(T),
    prio:STORY_PRIO.ehrung, title, desc,
    dataRef:{type:'ehrung', playerIds:spieler.map(x => x.pid), spieler, zahl, gesamt,
             ab:Math.min(...liste.map(e => e.t)), bis:mts(letzteM), tage:tage.length}
  };
}

// Der Ton einer Klasse, wie überall: Gold legendär, Violett selten, Grün
// gewöhnlich [§C25].
function _ehrungTon(k){ return k === 'legendary' ? 'gold' : k === 'rare' ? 'viol' : 'gruen'; }

// Die Karte bleibt klein: Schlagzeile, eine Reihe Zeichen der verliehenen
// Auszeichnungen, das Seltenste vorn, und je Spieler, was es ihm bringt —
// dasselbe Band wie auf der Ewigen Tafel [§C27]. Was jeder genau geholt hat,
// steht im Blatt.
function _newsEhrungHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const gesehen = new Set(), zeichen = [];
  sp.flatMap(x => x.posten || []).slice().sort((a, b) => ({legendary:0, rare:1, common:2}[a.klasse] - {legendary:0, rare:1, common:2}[b.klasse]))
    .forEach(q => { if(!gesehen.has(q.id)){ gesehen.add(q.id); zeichen.push(q); } });
  const lb = {};
  sp.forEach(x => { lb[x.pid] = {vor:0, nach:x.summe}; });
  return `<div class="nf-card nf-s-badge nf-ehrung nfc-badge${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('badge', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('medal')}</i><b>DIE EHRUNG</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div><div class="nf-d">${_newsBetont(s.desc || '')}</div></div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    <div class="eh-reihe">${zeichen.map((q, i) => `<span class="eh-z" style="--i:${i}" title="${esc(q.name)}">${zkHtml(q.ic, 'k', _ehrungTon(q.klasse))}</span>`).join('')}</div>
    ${_newsPrestigeBand({dataRef:{laufbahn:lb}})}${fadenHtml || ''}</div>`;
}

// Das Blatt: je Spieler jede Auszeichnung mit Klasse, dem wievielten Mal
// und dem Prestige, das sie ihm bringt. Darunter in einem Satz, warum
// dieselbe Auszeichnung nicht jedes Mal gleich viel wiegt.
function _newsEhrungBlatt(s){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  if(!sp.length) return '';
  const pm = pmap();
  const z = v => String(v).replace('.', ',');
  const mal = q => q.mal === 1 ? `${q.bis}. Mal` : `${q.bis - q.mal + 1}. bis ${q.bis}. Mal`;
  const zeit = d.ab && d.bis ? `Aus den Partien ${d.tage > 1 ? 'seit dem ' + datumFmt(d.ab, 'tm') + ', ' : 'von '}`
    + `${datumFmt(d.ab, 'uhr')} bis ${datumFmt(d.bis, 'uhr')} Uhr.` : '';
  // Zwei Zellen: in einem Drittel der Breite brach „Auszeichnungen" mitten
  // im Wort um. Wie viele Spieler es sind, zeigen die Kästen darunter.
  const zahlen = rcpZahlenHtml([
    {v:d.zahl || 0, l:(d.zahl === 1 ? 'Auszeichnung' : 'Auszeichnungen')},
    {v:'+' + (d.gesamt || 0), l:'Prestige', ton:'gold'}]);
  const bloecke = sp.filter(x => pm[x.pid]).map((x, i) => `<div class="eh-sp" style="--i:${i}">
      <div class="eh-sp-k" data-pid="${esc(x.pid)}" style="cursor:pointer">${rcpAvHtml(x.pid, 34, {})}
        <b>${esc(pm[x.pid].name)}</b><em class="num">+${z(x.summe)}</em></div>
      ${(x.posten || []).map(q => `<div class="eh-q">${zkHtml(q.ic, 'k', _ehrungTon(q.klasse))}
        <span class="eh-q-t"><b>${esc(q.name)}</b><small>${esc(_newsRarityLabel(q.klasse))} · ${esc(mal(q))}</small></span>
        <em class="num">+${z(q.p)}</em></div>`).join('')}
    </div>`).join('');
  return zahlen + (zeit ? `<div class="nw-hinweis eh-zeit">${esc(zeit)}</div>` : '')
    + `<div class="nd-section">Wer was geholt hat</div>${bloecke}`
    + `<div class="nw-hinweis">Das erste und zweite Mal zählt eine Auszeichnung voll, danach etwas weniger. Jede weitere bringt trotzdem Prestige.</div>`;
}
