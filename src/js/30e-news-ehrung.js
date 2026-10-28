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
//     23:57), steht in der nächsten Karte, die danach entsteht [§C33] — außer
//     die Karte des Spielers des Tages nennt es schon als Abschluss
//     (`getragen`, [§11.0e]): Unschlagbar stand sonst um 23:59 dort und Tage
//     später ein zweites Mal hier.
//
//     Der Wert je Auszeichnung ist ihr Teilwert beim wievielten Mal
//     (`auszeichnungsTeilwert`): das erste und zweite Mal voll, danach eine
//     Stufe weniger [§C34]. Dieselbe Rechnung trägt die Laufbahn.
// ╚══════════════════════════════════════════════════════════════════════╝
const EHRUNG_PAUSE_MS = 2 * 3600e3;

// Eine Karte je abgeschlossener Runde im Fenster des Feeds. Die Grenzen
// werden über ALLE Partien gezogen: sonst begänne die erste Runde im
// Fenster bei null und nähme Auszeichnungen von vor zwei Wochen mit.
function _newsEhrungStories(nowMs, getragen){
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
      // Gezählt ist sie oben schon: der Rang der nächsten hängt daran.
      if(te && getragen && getragen.has(te + '|' + e.playerId + '|' + e.badge.id)) return;
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
  // Der Satz nennt die wertvollste Auszeichnung der Runde: die seltenste
  // Klasse, darin der höchste Wert. Die Summe nannte er nur, wenn nichts
  // Seltenes dabei war — und dieselbe Zahl stand im Fuß der Karte, je
  // Klasse. Ohne Doppelpunkt: das Blatt kürzt einen Satz mit Etikett auf
  // seinen Rest (`_ndLead`), und „Darunter eine seltene: …" stand dort als
  // Satzrest ohne Verb.
  let top = null;
  spieler.forEach(x => x.posten.forEach(q => {
    if(!top || ORD[q.klasse] < ORD[top.q.klasse] || (q.klasse === top.q.klasse && q.p > top.q.p))
      top = {pid:x.pid, q};
  }));
  const klasse = {legendary:', eine legendäre Auszeichnung', rare:', eine seltene Auszeichnung'}[top.q.klasse] || '';
  const desc = `${nm(top.pid)} holt dabei „${top.q.name}“ zum ${top.q.bis === 1 ? 'ersten' : top.q.bis + '.'} Mal${klasse}.`;
  return {
    id:'ehrung_' + letzteM.id, cat:'badge', ic:'medal', when:new Date(T),
    prio:STORY_PRIO.ehrung, title, desc,
    dataRef:{type:'ehrung', playerIds:spieler.map(x => x.pid), spieler, zahl, gesamt,
             ab:Math.min(...liste.map(e => e.t)), bis:mts(letzteM)}
  };
}

// Der Ton einer Klasse, wie überall: Gold legendär, Violett selten, Grün
// gewöhnlich [§C25].
function _ehrungTon(k){ return k === 'legendary' ? 'gold' : k === 'rare' ? 'viol' : 'gruen'; }
const EH_KLASSEN = [['legendary', 'legendär'], ['rare', 'selten'], ['common', 'gewöhnlich']];
const _ehZahl = v => komma(Math.round(v * 10) / 10).replace(',0', '');

// ── Die Säulen ──────────────────────────────────────────────────────
// Je Geehrtem eine Säule, wie im Säulenbild eines Spieltags: unten sein
// Wappen, Insignium und Gesicht wie in der Rangliste [§C27], darüber die Säule, so hoch wie das Prestige seiner Auszeichnungen
// gegen den, der am meisten bekam, darauf die Zahl und die Zeichenkachel
// seiner wertvollsten Auszeichnung [§C27]. Die Säule ist aus den
// Auszeichnungen gestapelt, die Seltenste oben, in der Farbe ihrer Klasse
// [§C25]: jede seltene und legendäre ein eigenes Stück, die gewöhnlichen
// zusammen eins — man sieht, woher das Prestige kommt, ohne eine Zahl je
// Auszeichnung. Auf der Karte stand vorher das Prestige je Spieler in Chips
// wie auf der Ewigen Tafel: dieselbe Form für eine andere Zahl las sich als
// dieselbe Nachricht. Ein Entwurf hängte Bänder mit Medaillen darunter —
// eine Zeichnung, die es sonst nirgends in der App gibt.
// `gross` ist das Blatt: dort steht der Name unter dem Gesicht. `o.still`
// lässt das Lauflicht der legendären weg: im Rückblick stehen Säulen,
// Podest und Wappen untereinander, und ein Licht je Säule wäre dort
// Schimmer ohne Aussage.
function _ehrungSaeulen(sp, gross, o){
  o = o || {};
  const pm = pmap();
  const da = sp.filter(x => pm[x.pid] && x.summe > 0);
  if(!da.length) return '';
  // Ein Wappen braucht 48 px, darunter bleibt nur das Gesicht
  // (`insAvWrap`). Die Karte ist im Feed bei 360 px nur 287 px breit: in
  // einer Reihe stehen höchstens fünf, im Blatt mit den Namen darunter vier;
  // wer mehr ehrt, teilt die Säulen auf gleich lange Reihen, die vorderen
  // für die mit dem meisten Prestige. Auf schmaleren Telefonen werden die
  // Wappen über die Breite der Bühne kleiner (`--je`, CSS), statt dass eine
  // Säule allein in die nächste Reihe bricht. Vorher standen auf der Karte
  // nackte Gesichter von 30 px — ohne das Insignium, das sie überall sonst
  // tragen.
  const WAPPEN = gross ? 52 : 48, JE_REIHE = gross ? 4 : 5;
  const reihen = Math.ceil(da.length / JE_REIHE), breite = Math.ceil(da.length / reihen);
  const H = gross ? 96 : 52, MIN = 6, max = Math.max(...da.map(x => x.summe));
  let gold = 0;
  const saeule = (x, i) => {
    const h = Math.max(MIN, Math.round(H * x.summe / max));
    const posten = (x.posten || []).filter(q => q.p > 0);
    const gewoehnlich = posten.filter(q => q.klasse === 'common');
    const stuecke = posten.filter(q => q.klasse !== 'common')
      .map(q => ({klasse:q.klasse, p:q.p, name:q.name}))
      .concat(gewoehnlich.length ? [{klasse:'common', p:gewoehnlich.reduce((n, q) => n + q.p, 0),
        name:gewoehnlich.length === 1 ? gewoehnlich[0].name : gewoehnlich.length + ' gewöhnliche'}] : [])
      .map(q => `<i class="${q.klasse}" style="flex-grow:${q.p}" title="${esc(q.name)}"></i>`).join('');
    // Die Kachel zeigt die wertvollste Auszeichnung: die seltenste Klasse,
    // darin der höchste Wert — die Posten sind schon so geordnet.
    const top = posten[0];
    return `<span class="eh-s" data-pid="${esc(x.pid)}" style="--i:${i}">`
      + `<span class="eh-s-z" title="${esc(top ? top.name : '')}">${top ? _ehrungKachel(top, o.still ? null : () => gold++, gross ? '' : 'k') : ''}</span>`
      + `<em class="eh-s-w num">+${_ehZahl(x.summe)}</em>`
      + `<span class="eh-saeule" style="height:${h}px">${stuecke}</span>`
      + `<span class="eh-s-av" title="${esc(pm[x.pid].name)}">${rcpAvHtml(x.pid, WAPPEN, {})}</span>`
      + (gross ? `<b class="eh-s-n">${esc(pm[x.pid].name)}</b>` : '')
      + `</span>`
      // Der Umbruch steht ausdrücklich da: von selbst bräche die Reihe erst
      // am Rand und ließe einen allein in der zweiten.
      + ((i + 1) % breite === 0 && i + 1 < da.length ? '<span class="eh-umbruch" aria-hidden="true"></span>' : '');
  };
  return `<div class="eh-buehne${gross ? ' gross' : breite >= 5 ? ' voll' : ''}" style="--je:${breite}">${da.map(saeule).join('')}</div>`;
}

// Die Zeichenkachel einer Auszeichnung in der Farbe ihrer Klasse [§C27].
// Eine legendäre trägt das Lauflicht wie im Profil, versetzt von Kachel zu
// Kachel (`naechste` zählt die goldenen einer Ansicht), damit es durch die
// Reihe wandert, statt überall zugleich aufzublitzen. Klein (`k`) überall
// außer auf der Bühne des Blatts. Ohne `naechste` steht sie still.
function _ehrungKachel(q, naechste, groesse){
  const z = zkHtml(q.ic, groesse == null ? 'k' : groesse, _ehrungTon(q.klasse));
  return q.klasse === 'legendary' && naechste ? z.replace(/<\/span>$/, glanzBahn(1 + naechste() * .35) + '</span>') : z;
}

// Die Klassen einer Runde: wie viele Auszeichnungen jeder Klasse und was sie
// zusammen an Prestige brachten. Nur Klassen, die vorkommen.
function _ehrungKlassen(sp){
  const k = {};
  sp.forEach(x => (x.posten || []).forEach(q => {
    const z = k[q.klasse] || (k[q.klasse] = {n:0, p:0});
    z.n += q.mal; z.p += q.p;
  }));
  return EH_KLASSEN.filter(([id]) => k[id] && k[id].p > 0).map(([id, wort]) => ({id, wort, n:k[id].n, p:k[id].p}));
}
const _ehrungKlasseHtml = z => `<span class="eh-k ${z.id}"><i></i><b class="num">${z.n}</b> ${esc(z.wort)}`
  + ` <em class="num">+${_ehZahl(z.p)}</em></span>`;

// Woher die Auszeichnungen einer Ehrung kommen, auf der Karte und im Blatt
// dieselbe Angabe [§C27]. Die Karte trug nur die Uhrzeit, zu der sie
// entstand — zwei Stunden nach der letzten Partie —, und neben „18:04" las
// sich eine Runde von 13:44 bis 15:55 wie eine Ehrung für den Abend. Heute
// und gestern als Wort, weiter zurück das Datum; über Mitternacht steht der
// zweite Tag dabei. `ab` ist die erste Partie, aus der eine Auszeichnung der
// Runde stammt — eine, die erst am Tagesende vergeben wird, kann vom Vortag
// sein.
// Zwei Teile, die zusammen einen Satz ergeben: `vor` sagt, was der Zeitraum
// bedeutet, `wann` nennt ihn. „Partien vom 06.10., 15:12 bis 08.10., 15:10"
// allein sagte nicht, wozu die Zahlen gehören, und vier Ziffern mit
// Doppelpunkt hinter einem Datum lasen sich auch als Ergebnis. Hinter JEDER
// Uhrzeit steht „Uhr": mit einem „Uhr" nur am Ende stand „vom 19.10., 17:17
// bis gestern, 16:04 Uhr" da, und die erste Zahl las sich wieder nicht als
// Uhrzeit. Die Karte setzt beide Teile untereinander, das Blatt
// hintereinander. Innerhalb eines Endes nur feste Leerzeichen, damit der
// Zeitraum nur vor dem „bis" umbricht: umbrochen stand „15:55" allein in
// der zweiten Zeile, getrennt von seinem „bis".
function _ehrungZeitraum(d){
  if(!d || !d.ab || !d.bis) return null;
  const jetzt = Date.now();
  const tag = t => tagKey(t) === tagKey(jetzt) ? 'heute'
    : tagKey(t) === gesternKey(jetzt) ? 'gestern' : datumFmt(t, 'tm');
  const von = t => { const w = tag(t); return (/^\d/.test(w) ? 'vom' : 'von') + '\u00a0' + w; };
  const uhr = t => '\u00a0' + datumFmt(t, 'uhr') + '\u00a0Uhr';
  if(d.ab === d.bis) return {vor:'Geholt in der Partie', wann:`${von(d.ab)},${uhr(d.ab)}`};
  return {vor:'Geholt in den Partien', wann:`${von(d.ab)},${uhr(d.ab)} bis`
    + (tagKey(d.ab) === tagKey(d.bis) ? '' : '\u00a0' + tag(d.bis) + ',') + uhr(d.bis)};
}

// Die Karte: die Säulen als Bühne, darunter die Schlagzeile und, leise,
// aus welchen Partien die Auszeichnungen stammen. Ein Satz nannte das
// Seltenste, und im Fuß stand, was jede Klasse gebracht hat — beides
// Zusatztext unter einem Bild, das die Säulen, ihre Zeichenkachel und ihr
// Prestige schon zeigt, wie bei der Insignium-Karte. Satz, Klassen und was
// jeder genau geholt hat, stehen im Blatt. Mit einer legendären
// Auszeichnung trägt die Karte den Schimmer des Seltenen, wie eine einzelne
// seltene Auszeichnung im Feed [§C25]; eine seltene allein reicht nicht,
// sie steht in fast jeder Ehrung.
function _newsEhrungHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const glanz = sp.some(x => (x.posten || []).some(q => q.klasse === 'legendary'));
  const zr = _ehrungZeitraum(d);
  return `<div class="nf-card nf-s-badge nf-ehrung nfc-badge${glanz ? ' nf-glanz' : ''}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}"`
    + `${glanz ? ` style="--gv:${_newsGlanzVersatz(s.id)}s"` : ''}>
    ${_newsMotiv('badge', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('medal')}</i><b>DIE EHRUNG</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    ${_ehrungSaeulen(sp, false)}
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${zr ? `<div class="eh-zr"><span class="eh-zr-k">${esc(zr.vor)}</span> <span class="eh-zr-t">${esc(zr.wann)}</span></div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span></div>${fadenHtml || ''}</div>`;
}

// ── Das Blatt ───────────────────────────────────────────────────────
// Oben dieselben Säulen groß, mit Namen. Darunter die Summe der Runde und,
// was jede Klasse dazu beitrug, als geteilter Balken; dann je Spieler jede
// Auszeichnung mit dem wievielten Mal und ihrem Wert. Unter jeder ein
// Strich, wie viel vom vollen Wert sie beim wievielten Mal noch bringt: das
// erklärte vorher nur ein Satz am Ende, gesehen hat es niemand.
//
// Seltene und legendäre stehen als eigene Zeile, die gewöhnlichen als
// Kacheln in zwei Spalten. Je eine Zeile für jede machte das Blatt einer
// Runde mit 35 Auszeichnungen fünf Bildschirme lang, und die Pflichterfüller
// und Zittersiege standen so groß da wie die „Nerven aus Stahl".
function _ndEhrungBlatt(s){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const pm = pmap();
  if(!sp.some(x => pm[x.pid])) return null;
  const kopf = `<div class="nd-buehne nd-eh">${_ehrungSaeulen(sp, true)}</div>`;
  const klassen = _ehrungKlassen(sp);
  const summe = klassen.reduce((n, z) => n + z.p, 0);
  const anteil = klassen.length ? `<div class="eh-anteil">`
    + `<div class="eh-anteil-k"><b class="num">+${_ehZahl(summe)}</b><span>Prestige für die Laufbahn</span></div>`
    + `<div class="eh-anteil-b">${klassen.map(z => `<i class="${z.id}" style="flex-grow:${z.p}"></i>`).join('')}</div>`
    + `<div class="eh-anteil-l">${klassen.map(_ehrungKlasseHtml).join('')}</div></div>` : '';
  const mal = q => q.mal === 1 ? `${q.bis}. Mal` : `${q.bis - q.mal + 1}.–${q.bis}. Mal`;
  // Der volle Wert ist, was dieselbe Auszeichnung beim ersten Mal bringt,
  // so oft genommen, wie sie diesmal kam.
  const voll = q => auszeichnungsTeilwert(q.id, 1) * q.mal;
  const rest = q => { const v = voll(q); return v > 0 ? Math.min(1, q.p / v) : 1; };
  const strich = q => `<span class="eh-q-m" role="img" aria-label="${Math.round(rest(q) * 100)} % des vollen Werts">`
    + `<i style="width:${(rest(q) * 100).toFixed(1)}%"></i></span>`;
  const zeit = _ehrungZeitraum(d);
  let gold = 0;
  const zeile = q => `<div class="eh-q ${esc(q.klasse)}">${_ehrungKachel(q, () => gold++)}
      <span class="eh-q-t"><b>${esc(q.name)}</b><small>${esc(_newsRarityLabel(q.klasse))} · ${esc(mal(q))}</small>${strich(q)}</span>
      <em class="num">+${_ehZahl(q.p)}<small>von ${_ehZahl(voll(q))}</small></em></div>`;
  // Oben die Zeichenkachel und der Wert, darunter der Name über die ganze
  // Breite: neben Zeichen und Wert brach „Pflichterfüller" mitten im Wort.
  const kachel = q => `<div class="eh-g-t ${esc(q.klasse)}">`
    + `<span class="eh-g-o">${_ehrungKachel(q, () => gold++)}<em class="num">+${_ehZahl(q.p)}</em></span>`
    + `<b>${esc(q.name)}</b><small>${esc(mal(q))}</small>${strich(q)}</div>`;
  const bloecke = sp.filter(x => pm[x.pid]).map((x, i) => {
    const gross = (x.posten || []).filter(q => q.klasse !== 'common');
    const klein = (x.posten || []).filter(q => q.klasse === 'common');
    return `<div class="eh-p" style="--i:${i}">
      <div class="eh-p-k" data-pid="${esc(x.pid)}" style="cursor:pointer">${rcpAvHtml(x.pid, 30, {})}
        <b>${esc(pm[x.pid].name)}</b><em class="num">+${_ehZahl(x.summe)}</em></div>
      ${gross.map(zeile).join('')}
      ${klein.length ? `<div class="eh-g">${klein.map(kachel).join('')}</div>` : ''}
    </div>`;
  }).join('');
  return {kopf, mitte: anteil + (zeit ? `<div class="nw-hinweis eh-zeit">${esc(zeit.vor + ' ' + zeit.wann)}.</div>` : '')
    + `<div class="nd-section">Wer was geholt hat</div>${bloecke}`
    + `<div class="nw-hinweis">Das erste und zweite Mal zählt eine Auszeichnung voll, danach etwas weniger. `
    + `Der Strich unter jeder zeigt, wie viel vom vollen Wert bleibt.</div>`};
}
