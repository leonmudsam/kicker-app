// ─── §5.9 — Der Einblick: eine Grafik über einer Rangliste [§C27] ────
// Positionen und Teams tragen je eine Grafik, die die Liste darunter nicht
// zeigen kann: die Rollen-Landkarte aus Sturm und Abwehr und das Netz der
// Duos. Im Liga-Reiter gibt es keinen: das Titelrennen der Saison war
// dieselbe Frage wie der Positionsverlauf, der darunter schon als Kachel
// steht — zwei Bauteile für dieselbe Aussage sind eins zu viel [§C27]. Als volle Karte nahm jede davon den
// halben Bildschirm über der Rangliste weg, und die Rangliste ist der Grund,
// warum man den Reiter öffnet. Der Einblick ist deshalb eine schmale Zeile,
// die aufklappt — und gezeichnet wird erst beim Aufklappen: zu ist er eine
// Zeile Markup und kostet keine Rechnung.
//
// Offen bleibt er, bis der Reiter gewechselt wird (`einblickOffen`,
// 01-update.js): ein Neuzeichnen nach einer neuen Partie oder einem anderen
// Zeitraum klappt ihn nicht zu, ein neuer Reiter beginnt geschlossen.
//
// Die Ruheständler stehen in derselben Zeile [§C40]: unter Gesamt, unter den
// Positionen und unter den Teams, zu und am Ende. Sie gehören nicht in die
// Rangliste der aktiven Liga, aber ihre Laufbahn ist nicht weg. Weil ein
// Reiter damit zwei Einblicke tragen kann, merkt `einblickOffen` jeden
// offenen; mit einem einzigen Wert klappte der zweite den ersten im Zustand
// zu, und nach dem nächsten Neuzeichnen stand er geschlossen da.
const EINBLICK = {
  rollen:{titel:'Die Rollen-Landkarte', ic:'sideSwap', inhalt:() => _einblickRollen()},
  netz:{titel:'Das Netz der Duos', ic:'duo', inhalt:() => _einblickNetz()},
  ruhe_liga:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => ruhestandTafelHtml()},
  ruhe_pos:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => positionenRuheHtml()},
  ruhe_teams:{titel:'Duos mit Karriereende', ic:'hourglass', ruhestand:true, inhalt:() => vTeams(true).ruhe},
  // Die Chronik-Matrix trägt eigene Knöpfe (Monat, Spieler, Zelle), die erst
  // mit ihrem Inhalt entstehen — `nach` verdrahtet sie, wenn er aufgeht.
  ruhe_chronik:{titel:'Karriere beendet', ic:'hourglass', ruhestand:true, inhalt:() => ruhestandChronikHtml(),
    nach:i => { _bindChronikClicks(i); chronikMatrixScrollen(i); }}
};
function _einblickAuf(key){ return einblickOffen.split(' ').includes(key); }
function einblickHtml(key, rechts){
  const e = EINBLICK[key];
  if(!e) return '';
  const auf = _einblickAuf(key);
  let inhalt = '';
  if(auf){ try { inhalt = e.inhalt() || ''; } catch(err){ inhalt = ''; } }
  // `data-ruhestand` ist die eine Erlaubnis, in einer Ansicht der aktiven
  // Liga einen Ruheständler zu zeigen [§C40]; `tests/ruheliga` sucht ihn
  // überall sonst.
  return `<div class="einblick${auf ? ' auf' : ''}" data-einblick="${key}"${e.ruhestand ? ' data-ruhestand' : ''}>
    <button class="einblick-k" type="button" aria-expanded="${auf}">${svgI(e.ic)}<span>${esc(e.titel)}</span>`
    + `${rechts ? `<em>${esc(rechts)}</em>` : ''}<i class="einblick-pf">${svgI('chevron')}</i></button>
    <div class="einblick-i">${inhalt}</div></div>`;
}
// Aufklappen ohne die ganze Ansicht neu zu zeichnen: die Liste darunter
// bleibt stehen, nur der Inhalt des Einblicks entsteht.
function einblickBinden(wurzel){
  (wurzel || document).querySelectorAll('[data-einblick] > .einblick-k').forEach(k => {
    k.onclick = () => {
      const box = k.parentElement, key = box.dataset.einblick;
      const auf = !_einblickAuf(key);
      const offen = einblickOffen.split(' ').filter(k => k && k !== key);
      if(auf) offen.push(key);
      einblickOffen = offen.join(' ');
      const i = box.querySelector('.einblick-i');
      if(auf && !i.innerHTML.trim()){
        try { i.innerHTML = EINBLICK[key].inhalt() || ''; } catch(err){ i.innerHTML = ''; }
        bindDetailLinks(i);
        if(EINBLICK[key].nach) EINBLICK[key].nach(i);
      }
      box.classList.toggle('auf', auf);
      k.setAttribute('aria-expanded', String(auf));
    };
  });
}
function bindDetailLinks(el){
  el.querySelectorAll('[data-detail]').forEach(x => {
    x.onclick = () => sheetNav(() => showPlayer(x.dataset.detail));
  });
  // Die Duos eines Einblicks entstehen erst beim Aufklappen und waren damit
  // nach dem Binden der Ansicht gar nicht mehr erreichbar.
  el.querySelectorAll('[data-team]').forEach(x => {
    x.onclick = () => { const [a, b] = x.dataset.team.split('|'); if(a && b) showTeam(a, b); };
  });
}


// Die Rollen-Landkarte: wo jemand spielt und wo er besser ist — das
// Positionsprofil [§C44], nicht die Positions-Rangliste. Waagerecht der
// Anteil der Partien im Sturm, senkrecht die Leistung je Partie im Sturm
// gegen die in der Abwehr (`rA − rD`), beides aus `positionsLage`: eine
// Rechnung für jede Frage nach der Position eines Spielers.
//
// Vorher kreuzten sich hier die Werte der Positions-Rangliste vorn und
// hinten (`positionsListe`). Beide fragen, wer auf einer Position der Beste
// der Liga ist, und wachsen mit der Gesamtstärke: das Bild war eine
// Diagonale, die Starken oben rechts, die Schwachen unten links „auf beiden
// unter der Mitte" — über die Rolle sagte es nichts, und wer schwächer
// spielt, stand immer schlecht da. `rA − rD` misst jeden gegen den eigenen
// Schnitt; ein schwacher Spieler, der vorn besser ist als hinten, steht so
// hoch wie ein starker.
//
// Die senkrechte Achse ist um null symmetrisch und reicht mindestens zehn
// Prozentpunkte: bei kleinen Abständen hätte eine Achse vom größten Betrag
// aus drei Prozentpunkte über den halben Kasten gezogen. Das Band um null
// ist `staerker` 'beide' — dieselbe Grenze wie die hell gezeichnete Rolle
// im Profil, sonst stünde dort „gleichauf" und hier „im Sturm stärker".
// Eine Mindestzahl an Partien gibt es nicht: wenige Partien zieht die
// Rechnung schon zum eigenen Schnitt, also nahe an die Mitte; das Gesicht
// ist dann kleiner.
//
// Der Name steht unter jedem Gesicht: Initialen allein reichen nicht (Leo
// und Leon, Jane und Jannik). Zwei Gesichter samt Namen, die aufeinander
// fielen, werden auseinandergeschoben, und nie in die Zeilen der
// Feldnamen oben und unten.
function _einblickRollen(){
  const pkt = activePlayers().map(p => {
    const L = positionsLage(posPerfFrom(p.id, matches));
    return {id:p.id, g:L.aG + L.dG, a:L.anteil, d:L.rA - L.rD, st:L.staerker};
  }).filter(p => p.g > 0).sort((p, q) => q.g - p.g);
  if(!pkt.length) return `<p class="einblick-leer">Die Landkarte füllt sich mit der ersten Partie</p>`;
  const W = 300, H = 280, ZEILE = 24, NAME = 12, MX = W / 2, MY = H / 2;
  const skala = Math.max(.10, ...pkt.map(p => Math.abs(p.d)));
  const halb = MY - ZEILE - 16 - NAME;
  const band = .03 / skala * halb;
  const X = a => 26 + a * (W - 52), Y = d => MY - d / skala * halb;
  const o = MY - band, u = MY + band;
  const lage = pkt.map((p, i) => {
    const px = Math.round(22 + 8 * Math.min(1, Math.sqrt(p.g / 200)));
    const r = px / 2, hw = Math.max(r, pname(p.id).length * 3 + 2);
    return {id:p.id, px, r, hw, x:X(p.a), y:Y(p.d), i, a:p.a, st:p.st};
  });
  // Das Schieben verlässt das eigene Feld nicht: Johannes, knapp unter dem
  // Band, rutschte sonst auf die Nulllinie und las sich als „gleichauf",
  // während die Liste darunter ihn in der Abwehr stärker nannte.
  const grenzen = p => {
    p.x = Math.max(p.hw + 1, Math.min(W - p.hw - 1, p.x));
    p.x = p.a >= .5 ? Math.max(MX + 2, p.x) : Math.min(MX - 2, p.x);
    p.y = Math.max(ZEILE + p.r + 2, Math.min(H - ZEILE - NAME - p.r - 2, p.y));
    p.y = p.st === 'atk' ? Math.min(o - 2, p.y) : p.st === 'def' ? Math.max(u + 2, p.y) : Math.max(o, Math.min(u, p.y));
  };
  for(let n = 0; n < 80; n++){
    for(let i = 0; i < lage.length; i++) for(let j = i + 1; j < lage.length; j++){
      const p = lage[i], q = lage[j];
      const ox = p.hw + q.hw + 3 - Math.abs(q.x - p.x);
      const oy = Math.min(p.y + p.r + NAME, q.y + q.r + NAME) - Math.max(p.y - p.r, q.y - q.r) + 3;
      if(ox <= 0 || oy <= 0) continue;
      if(ox < oy){ const s = (q.x >= p.x ? 1 : -1) * ox / 2; p.x -= s; q.x += s; }
      else { const s = (q.y >= p.y ? 1 : -1) * oy / 2; p.y -= s; q.y += s; }
    }
    lage.forEach(grenzen);
  }
  // Die Felder: oben rechts und unten links spielt jemand meist dort, wo er
  // besser ist; diese beiden sind getönt. Die Liste darunter sagt es in
  // Sätzen statt als Etikett mit Doppelpunkt.
  const feld = p => p.st === 'beide' ? 'b' : p.st === 'atk' ? (p.a >= .5 ? 'pv' : 'sv') : (p.a < .5 ? 'ph' : 'sh');
  const gruppen = {pv:[], ph:[], sv:[], sh:[], b:[]};
  pkt.forEach(p => gruppen[feld(p)].push(pname(p.id)));
  const satz = (k, namen) => {
    const n = _namenListe(namen), viele = namen.length > 1;
    const ist = viele ? 'sind' : 'ist', steht = viele ? 'stehen' : 'steht';
    return {pv:`${n} ${steht} öfter im Sturm und ${ist} dort stärker.`,
      ph:`${n} ${steht} öfter in der Abwehr und ${ist} dort stärker.`,
      sv:`${n} ${ist} im Sturm stärker und ${steht} öfter in der Abwehr.`,
      sh:`${n} ${ist} in der Abwehr stärker und ${steht} öfter im Sturm.`,
      b:`${n} ${ist} in Sturm und Abwehr gleichauf.`}[k];
  };
  const liste = ['pv', 'ph', 'sv', 'sh', 'b'].filter(k => gruppen[k].length)
    .map(k => `<span><i class="f-${k}"></i>${esc(satz(k, gruppen[k]))}</span>`).join('');
  return `<div class="rk"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <rect class="rk-q" x="${MX}" y="0" width="${MX}" height="${o.toFixed(1)}"/>
      <rect class="rk-q" x="0" y="${u.toFixed(1)}" width="${MX}" height="${(H - u).toFixed(1)}"/>
      <rect class="rk-b" x="0" y="${o.toFixed(1)}" width="${W}" height="${(u - o).toFixed(1)}"/>
      <line class="rk-m" x1="${MX}" x2="${MX}" y1="0" y2="${H}"/>
      <line class="rk-m" x1="0" x2="${W}" y1="${MY}" y2="${MY}"/>
      <rect class="rk-a" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="8"/>
    </svg>
    <span class="rk-f o l">meist auf der<br>schwächeren Position</span><span class="rk-f o m">↑ im Sturm<br>stärker</span><span class="rk-f o r pass">meist auf der<br>stärkeren Position</span>
    <span class="rk-f u l pass">meist auf der<br>stärkeren Position</span><span class="rk-f u m">in der Abwehr<br>stärker ↓</span><span class="rk-f u r">meist auf der<br>schwächeren Position</span>
    ${lage.map(p => `<span class="rk-p" data-detail="${esc(p.id)}" style="left:${(p.x / W * 100).toFixed(2)}%;top:${(p.y / H * 100).toFixed(2)}%;--r:${p.r}px;--i:${p.i}">${rcpAvHtml(p.id, p.px, {})}<b>${esc(pname(p.id))}</b></span>`).join('')}</div>
    <div class="rk-ax"><span>← meist in der Abwehr</span><span>meist im Sturm →</span></div>
    <div class="rk-l">${liste}</div>`;
}

// Das Netz der Duos: jede Linie ein Duo ab `DUOS_AB` Partien, so dick, wie
// oft es zusammen gespielt hat, und gefärbt danach, ob es zusammen besser
// oder schlechter spielt, als die Elo der vier erwarten lässt [§C25].
//
// Vorher färbte die rohe Siegquote (ab 60 % grün, bis 40 % rot): zwei
// schwächere Spieler waren zusammen immer rot, auch wenn sie weit besser
// spielten, als ihre Elo erwarten ließ, und zwei Starke immer grün. Jetzt
// dieselbe Leistung wie im Positionsprofil [§C44]: Sieg und Tore gegen die
// Erwartung der Partie (`exp_a`), je zur Hälfte, als Summe zum Schnitt null
// gezogen (`POS_SCHRUMPF`) — wenige gemeinsame Partien sagen wenig. Bis drei
// Prozentpunkte steht ein Duo grau, wie die Grenze von `staerker`; darüber
// wächst die Deckkraft mit dem Betrag, gemessen am größten im Bild und
// mindestens zehn Prozentpunkten.
//
// Nur die achtzehn meistgespielten: alle Duos waren ein Knäuel, in dem
// keine Linie mehr zu verfolgen war. Auf dem Kreis stehen häufige Partner
// nebeneinander (gierig, vom Spieler mit den meisten Partien aus, je der
// mit den meisten gemeinsamen Partien mit dem zuletzt gesetzten): in der
// Reihenfolge der Spielerliste kreuzten die Linien wild über die Mitte.
// Die Linien biegen sich leicht zur Mitte, damit sie sich an den Gesichtern
// nicht überdecken. Der Name steht unter jedem Gesicht; vorher stand eine
// Liste „Im Uhrzeigersinn ab oben" darunter, und die Gesichter waren mit
// gleichen Initialen nicht zuzuordnen. Ein Tippen auf eine Linie öffnet das
// Duo, auf ein Gesicht das Profil.
function _einblickNetz(){
  const ids = activePlayers().map(p => p.id);
  const leer = `<p class="einblick-leer">Ein Duo erscheint hier ab ${DUOS_AB} gemeinsamen Partien</p>`;
  if(ids.length < 2) return leer;
  const dabei = new Set(ids), spiele = {}, duo = {};
  ids.forEach(id => { spiele[id] = 0; });
  matches.forEach(m => {
    const e = m.exp_a != null ? m.exp_a : .5;
    [[m.a1, m.a2, m.winner === 'A', m.score_a, m.score_b, e], [m.b1, m.b2, m.winner === 'B', m.score_b, m.score_a, 1 - e]]
      .forEach(([x, y, w, gf, ga, ex]) => {
        if(dabei.has(x)) spiele[x]++;
        if(dabei.has(y)) spiele[y]++;
        if(!dabei.has(x) || !dabei.has(y)) return;
        const k = paarKey(x, y), d = duo[k] = duo[k] || {g:0, s:0};
        d.g++; d.s += ((w ? 1 : 0) - ex + posTorLeistung(gf, ga, ex)) / 2;
      });
  });
  // Dieselbe Schwelle wie die Liste darunter: die Zeile des Netzes nennt sie.
  const ks = Object.keys(duo).filter(k => duo[k].g >= DUOS_AB).sort((a, b) => duo[b].g - duo[a].g).slice(0, 18).reverse();
  if(!ks.length) return leer;
  const mit = (a, b) => (duo[paarKey(a, b)] || {g:0}).g;
  const rest = ids.slice().sort((a, b) => spiele[b] - spiele[a]), ring = [rest.shift()];
  while(rest.length){
    const z = ring[ring.length - 1];
    let bi = 0;
    rest.forEach((id, i) => { if(mit(z, id) > mit(z, rest[bi])) bi = i; });
    ring.push(rest.splice(bi, 1)[0]);
  }
  // Der Name steht außen am Kreis: über dem Gesicht in der oberen Hälfte,
  // darunter in der unteren. Unter jedem Gesicht lag er in der oberen Hälfte
  // mitten in den Linien, die dort zusammenlaufen.
  const n = ring.length, W = 300, H = 300, R = 110, cx = 150, cy = 150, lage = {};
  ring.forEach((id, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; lage[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R, Math.sin(a) < -.01]; });
  const wert = k => duo[k].s / (duo[k].g + POS_SCHRUMPF);
  const skala = Math.max(.10, ...ks.map(k => Math.abs(wert(k))));
  const gmax = Math.max(1, ...ks.map(k => duo[k].g));
  const mitLinie = new Set();
  const bogen = k => {
    const [x, y] = k.split('|'), [x1, y1] = lage[x], [x2, y2] = lage[y];
    const qx = (x1 + x2) / 2 + (cx - (x1 + x2) / 2) * .35, qy = (y1 + y2) / 2 + (cy - (y1 + y2) / 2) * .35;
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const linien = ks.map((k, i) => {
    const v = wert(k), cls = v > .03 ? 'w' : v < -.03 ? 'l' : 'm';
    k.split('|').forEach(id => mitLinie.add(id));
    const deck = cls === 'm' ? .38 : .42 + .53 * Math.min(1, Math.abs(v) / skala);
    return `<path class="netz-l ${cls}" style="--i:${i}" d="${bogen(k)}" stroke-width="${(1.2 + duo[k].g / gmax * 6).toFixed(1)}" stroke-opacity="${deck.toFixed(2)}"/>`;
  }).join('');
  // Die Trefferfläche liegt über allen Linien und ist breiter als die
  // dünnste: eine Linie von einem Pixel war mit dem Finger nicht zu treffen.
  const treffer = ks.map(k => `<path class="netz-t" data-team="${esc(k)}" d="${bogen(k)}"/>`).join('');
  const gesichter = ring.map(id => `<span class="netz-p${lage[id][2] ? ' oben' : ''}${mitLinie.has(id) ? '' : ' still'}" data-detail="${esc(id)}" style="left:${(lage[id][0] / W * 100).toFixed(2)}%;top:${(lage[id][1] / H * 100).toFixed(2)}%">${rcpAvHtml(id, 28, {})}<b>${esc(pname(id))}</b></span>`).join('');
  return `<div class="netz"><svg viewBox="0 0 ${W} ${H}">${linien}${treffer}</svg>${gesichter}</div>
    <div class="netz-leg"><span class="w">besser als erwartet</span><span class="m">wie erwartet</span><span class="l">schlechter als erwartet</span><span class="d">je dicker, desto öfter zusammen</span></div>`;
}
