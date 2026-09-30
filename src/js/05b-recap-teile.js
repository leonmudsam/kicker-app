// ╔═══ §C31 ─── DIE BAUTEILE DER RÜCKBLICKE ────────────────────────────╗
//     Drei Rückblicke: Saison, Woche, Tag. Vorher hatte jeder seinen
//     eigenen Bauplan — der Saison-Rückblick .rcp-*-Klassen, die beiden
//     anderen mehrere hundert Inline-Styles. Derselbe Spieler sah damit in
//     drei Rückblicken dreimal anders aus, und in keinem trug er sein
//     Wappen [§C27].
//
//     Hier steht jedes Bauteil genau einmal. Die Rückblicke unterscheiden
//     sich nur noch in dem, was sie hineinreichen: Zeitraum, Zahlen,
//     Abschnitte. Wer eins von ihnen ändert, ändert alle drei — das ist
//     der Zweck.
// ╚═════════════════════════════════════════════════════════════════════╝

// Eckdaten aus Teilen, die es geben kann oder nicht („12 Matches · 8 Spieler").
function rcpMeta(teile){ return teile.filter(Boolean).join(' · '); }

// Der Kopf. Die Marke ist immer Gold: Saison-Sieger, Spieler der Woche und
// Spieler des Tages sind Titel, und Gold gehört den Titeln [§C25]. Vorher
// war sie zweimal grün und einmal gold — dieselbe Aussage in zwei Farben.
function rcpKopfHtml(o){
  return `<div class="rcp-head">
    <span class="rcp-label">${svgI(o.ic || 'trophy')}${esc(o.marke)}</span>
    <div class="rcp-month">${esc(o.titel)}</div>
    ${o.meta ? `<div class="rcp-meta">${esc(o.meta)}</div>` : ''}
    ${o.extra || ''}
  </div>`;
}

// Der Avatar eines Rückblicks — mit Wappen, wie überall sonst [§C27].
// `pos` und `titel` gehören zum ZEITRAUM und nicht zu heute: der Schild
// zeigt den Platz, den er in DIESEM Zeitraum belegt hat, die Schwingen die
// Titel bis dahin. Ohne die beiden stünde im Mai-Rückblick der Auguststand.
// Kein Feuer: ein abgeschlossener Zeitraum hat keine laufende Serie [§C26].
function rcpAvHtml(pid, px, o){
  o = o || {};
  const p = pmap()[pid];
  if(!p) return `<span class="rcp-av leer" style="--rav:${px}px">?</span>`;
  const em = p.avatar_id ? avatarEmoji(p.avatar_id) : null;
  const inner = em
    ? `<span class="av av-emoji"><span class="em">${em}</span></span>`
    : `<span class="av" style="background:${avColor(pid)}">${esc(initials(p.name))}</span>`;
  // Detail folgt der Größe: unter etwa 48 px bleibt vom Wappen nur ein Rand.
  if(px < 48) return `<span class="rcp-av" style="--rav:${px}px">${inner}</span>`;
  return insAvWrap(pid, inner, {px:px, band:!!o.band, pos:o.pos, titel:o.titel,
                                feuer:0, klasse:o.klasse});
}

// Zwei Avatare als Paar. Ein Duo hat keinen Rang, also auch kein Wappen —
// zwei überlappende Chips, wie in jeder Duo-Tabelle.
function rcpPaarHtml(ids, px){
  return `<span class="rcp-paar" style="--rav:${px}px">${
    ids.slice(0, 3).map(id => rcpAvHtml(id, px, {})).join('')}${
    ids.length > 3 ? `<span class="rcp-av mehr" style="--rav:${px}px">+${ids.length - 3}</span>` : ''
  }</span>`;
}

// Der Held: die eine Person, um die der Rückblick geht. Eine Karte für alle
// drei — vorher war es einmal eine Goldkarte und zweimal eine nackte Spalte.
// `pids` mit mehr als einem Eintrag heißt geteilter Titel: dann das Paar,
// denn ein geteilter Titel gehört keinem allein.
function rcpHeldHtml(o){
  const ids = o.pids && o.pids.length ? o.pids : [o.pid];
  const ein = ids.length === 1;
  // Das Banner (Schwingen und Schild) nur dort, wo Titel und Ligaposition
  // zur Sache gehören — im Saison-Rückblick. In Woche und Tag stünde im
  // Schild eine Ligaposition, die mit dem Zeitraum nichts zu tun hat.
  const band = o.band !== false;
  const av = ein ? rcpAvHtml(ids[0], o.px || 104, {band:band, pos:o.pos, titel:o.titel})
                 : rcpPaarHtml(ids, 64);
  const namen = ids.map(pname).join(' & ');
  const abzeichen = ein ? rankBadgeHtml(ids[0], 'sm') : '';
  return `<div class="rcp-held${ein ? ' klick' : ''}"${
      ein ? ` data-detail="${esc(ids[0])}"` : ''}>
    <div class="rcp-held-label">${esc(o.marke)}</div>
    <div class="rcp-held-av${ein && band ? ' band' : ''}">${av}</div>
    <div class="rcp-held-n">${esc(namen)}</div>
    ${abzeichen ? `<div class="rcp-held-rang">${abzeichen}</div>` : ''}
    ${o.zahlen || ''}
  </div>`;
}

// Die Zahlenleiste. `ton` färbt einen Wert — und zwar nur dann, wenn die
// Farbe eine Richtung meint (Elo-Zuwachs grün, Verlust rot) oder einen
// Titel (gold). Alles andere bleibt Metall [§C25].
// Die Zellen sind gleich breit, die Werte nicht: „Schattenseite" ist
// dreizehn Zeichen in 18-px-Archivo und lief ueber seine Zelle hinaus in
// die daneben. Ein Wort laesst sich nicht umbrechen, also wird es kleiner —
// in zwei Stufen, damit „legendaer" und „2,39 σ" gross bleiben. Gezaehlt
// wird die Zeichenzahl und nicht die gerenderte Breite: hier steht kein
// Fliesstext, sondern eine Handvoll fester Woerter aus dem Katalog.
function rcpZahlenHtml(zellen){
  const lang = t => t.length > 11 ? ' sehrlang' : t.length > 8 ? ' lang' : '';
  return `<div class="rcp-z">${zellen.filter(Boolean).map(z => {
    const t = String(z.v);
    return `<div class="rcp-z-s"><div class="rcp-z-v${z.ton ? ' ' + z.ton : ''}${
      lang(t)} num">${esc(t)}</div><div class="rcp-z-l">${esc(z.l)}</div></div>`;
  }).join('')}</div>`;
}

// Eine Abschnittsüberschrift. `n` ist die Zahl rechts — nur setzen, wenn sie
// etwas sagt, das die Liste darunter nicht schon zeigt.
function rcpAbschnitt(t, n){
  return `<div class="rcp-section">${esc(t)}${
    n ? `<span class="rcp-section-n num">${esc(String(n))}</span>` : ''}</div>`;
}

// Eine Kachel: Auszeichnung, Höhepunkt, Rekord. `leer` zeigt sie gestrichelt
// statt halbdurchsichtig — ein leeres Feld liest sich sonst als Fehler.
function rcpKachelHtml(o){
  if(o.leer) return `<div class="rcp-aw leer">
    <div class="rcp-aw-ic">${svgI(o.ic || 'trophy')}</div>
    <div class="rcp-aw-info">
      <div class="rcp-aw-label">${esc(o.label)}</div>
      <div class="rcp-aw-name">–</div>
      <div class="rcp-aw-val">keine Daten</div>
    </div>
  </div>`;
  return `<div class="rcp-aw ${o.ton || 'gold'}${o.attr ? ' klick' : ''}" ${o.attr || ''}>
    <div class="rcp-aw-ic">${svgI(o.ic || 'trophy')}</div>
    <div class="rcp-aw-info">
      <div class="rcp-aw-label">${esc(o.label)}</div>
      <div class="rcp-aw-name">${esc(o.name)}</div>
      <div class="rcp-aw-val">${esc(o.wert || '')}</div>
    </div>
  </div>`;
}

// Eine Ereigniszeile: ein Chronik-Eintrag oder ein Rekord. Links steht das
// Zeichen der Auszeichnung in ihrem Farbton, nicht der Avatar — die Zeile
// handelt von der Auszeichnung, wer sie hält steht darunter. Die Rangliste
// benutzt sie NICHT: dort ist `.rrow` das Bauteil, dasselbe wie im
// Liga-Tab [§C27].
function rcpZeileHtml(o){
  const t = o.ton && typeof titleTone === 'function' ? titleTone(o.ton) : null;
  return `<div class="rcp-zeile${o.attr ? ' klick' : ''}"${
      t ? ` style="--tt:${t.c}"` : ''} ${o.attr || ''}>
    <span class="rcp-zeile-ic">${svgI(o.ic || 'trophy')}</span>
    <span class="rcp-zeile-tx">
      <span class="rcp-zeile-n">${esc(o.name)}</span>
      ${o.sub ? `<span class="rcp-zeile-s">${esc(o.sub)}</span>` : ''}
    </span>
    ${o.rechts ? `<span class="rcp-zeile-r num">${esc(o.rechts)}</span>` : ''}
  </div>`;
}

// Ein Hinweisstreifen unter dem Helden: die Serie, der Positionsverlauf.
// Eine Zeile, ein Symbol, ein Satz — mehr trägt die Stelle nicht.
// Der Pfeil ist CSS (.klick::after) und kein Symbol: er sagt „hier geht es
// weiter", nicht „hier steht etwas". Als Icon hätte er in jeder Kachel und
// jeder Zeile einzeln gepflegt werden müssen.
function rcpNotizHtml(o){
  return `<div class="rcp-notiz${o.attr ? ' klick' : ''}" ${o.attr || ''}>
    <span class="rcp-notiz-ic">${svgI(o.ic)}</span>
    <span class="rcp-notiz-tx">${o.text}</span>
  </div>`;
}

// ╔═══ §C27 ─── DER BELEG ─────────────────────────────────────────────╗
//     Ein Rekord, ein Award und eine Chronik sind Behauptungen, und das
//     Blatt belegte sie mit einem Satz. „72 %" aus fünfzig und aus
//     fünfhundert Partien sind zwei verschiedene Aussagen, und ob der Zweite
//     knapp dahinter liegt oder weit weg, musste man aus der Liste
//     ausrechnen. Vier Formen, jede für eine Frage, und jede nur, wo sie
//     etwas sagt:
//       Woraus         die Stichprobe als Zellen, eine je Gelegenheit
//       Wo im Feld     jeder im Rennen als Punkt, der Halter hervorgehoben
//       Wie knapp      wie viele der eigenen Gelegenheiten anders hätten
//                      ausgehen müssen, damit der Zweite gleichauf läge
//       Wie es dazu kam  der Verlauf über die Monatsenden
//     Gerechnet wird hier nichts Neues: die Zahlen kommen aus dem Beleg des
//     Katalogs, aus chronicleRang, aus AW_WERT und aus dem Zeitschnitt, den
//     es gibt (_chronicleCtx).
// ╚═════════════════════════════════════════════════════════════════════╝

// „27 von 49 Spielen um den letzten Ball" aus einem Beleg. Ohne „x von y"
// gibt es keine Stichprobe zu zeigen — dann fällt die Form weg, statt eine
// zu erfinden.
function belegAnteil(text){
  const s = String(text || '');
  const m = s.match(/(\d+)\s+von\s+(\d+)/);
  if(!m) return null;
  const k = +m[1], n = +m[2];
  if(!(n > 0) || k > n) return null;
  return {k, n, satz:s.slice(m.index).split(' · ')[0].replace(/[.,;]\s*$/, '')};
}
// Ist der Anteil derselbe Wert, den der Beleg groß nennt? Nur dann trägt
// die Spanne: „6 % aller 48 Spieltage · 3 Tage" zählt drei von 48, und die
// Spanne über drei von 48 beschreibt genau diese sechs Prozent.
function _belegIstQuote(text, a){
  const m = String(text || '').match(/([\d,]+)\s?%/);
  return !!(m && a && Math.abs(parseFloat(m[1].replace(',', '.')) - a.k / a.n * 100) <= 1);
}
// Woraus: eine Zelle je Gelegenheit. Ab hundert fasst eine Zelle mehrere —
// hundert Zellen sind auf dem Telefon vier Reihen, mehr wäre eine Fläche.
function belegZellenHtml(a){
  if(!a) return '';
  const je = Math.max(1, Math.ceil(a.n / 100));
  const z = Math.ceil(a.n / je), voll = Math.round(a.k / je);
  let zellen = '';
  for(let i = 0; i < z; i++) zellen += i < voll ? '<i class="j"></i>' : '<i></i>';
  return `<div class="bl-zellen">${zellen}</div>
    <div class="bl-satz">${esc(a.satz)}${je > 1 ? ` · eine Zelle für je ${je}` : ''}</div>`;
}
// Wo im Feld: `eintraege` sind {v, t, er} — Sortierwert, sein Text, und ob
// er zu den Haltern gehört. Links steht der kleinste Wert, rechts der
// größte; die Mitte ist der Median. Nur ab drei Einträgen: zwei Punkte
// sind kein Feld.
function belegFeldHtml(eintraege, mitSkala){
  const e = (eintraege || []).filter(x => x && x.v != null && isFinite(x.v));
  if(e.length < 3) return '';
  const lo = Math.min(...e.map(x => x.v)), hi = Math.max(...e.map(x => x.v));
  if(!(hi > lo)) return '';
  const pos = v => ((v - lo) / (hi - lo) * 92 + 4).toFixed(1);
  const sortiert = e.slice().sort((a, b) => a.v - b.v);
  const mitte = sortiert[Math.floor((sortiert.length - 1) / 2)];
  // Halter zuletzt, damit ihr Punkt über den anderen liegt.
  const punkte = e.filter(x => !x.er).concat(e.filter(x => x.er))
    .map(x => `<i${x.er ? ' class="er"' : ''} style="left:${pos(x.v)}%"></i>`).join('');
  const skala = mitSkala
    ? `<div class="bl-feld-l num"><span>${esc(String(sortiert[0].t))}</span><span>Mitte ${esc(String(mitte.t))}</span><span>${esc(String(sortiert[sortiert.length - 1].t))}</span></div>`
    : '';
  return `<div class="bl-feld" title="${e.length} im Feld"><span class="bl-feld-bahn"></span>`
    + `<span class="bl-feld-mitte" style="left:${pos(mitte.v)}%"></span>${punkte}</div>${skala}`;
}
// Wie knapp: wie viele der eigenen Gelegenheiten anders hätten ausgehen
// müssen, damit der Zweite gleichauf läge. Dort stand vorher die Spanne um
// den Anteil (Wilson, 90 %) — „Wären ein paar Partien anders ausgegangen,
// läge der Wert wohl irgendwo zwischen 36 und 57 %" war richtig gerechnet
// und trotzdem nicht zu lesen: eine Spanne ist eine Frage an den Leser.
// Eine Zahl, die man abzählen kann, beantwortet sie: zwei Partien.
function belegLuft(k, n, q2){ return Math.max(0, Math.ceil(k - q2 * n - 1e-9)); }
const _BELEG_ZAHL = ['keine', 'eine', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
function belegLuftHtml(a, zweiter){
  if(!a || !zweiter || zweiter.q == null || !isFinite(zweiter.q)) return '';
  const m = belegLuft(a.k, a.n, zweiter.q);
  const q = a.k / a.n, pz = v => Math.round(v * 100);
  const [wort, ton] = m === 0 ? ['gleichauf', 'eng'] : m === 1 ? ['hauchdünn', 'eng']
    : m <= 3 ? ['knapp', 'eng'] : m <= 7 ? ['solide', 'mittel'] : ['deutlich', 'weit'];
  const zahl = _BELEG_ZAHL[m] || String(m);
  const satz = m === 0
    ? `${esc(zweiter.name)} liegt mit ${pz(zweiter.q)} % gleichauf.`
    : `${zahl.charAt(0).toUpperCase() + zahl.slice(1)} der ${a.n} Ergebnisse anders, und <b>${esc(zweiter.name)}</b> läge gleichauf.`;
  // Die Luft als Zellen: je eine für eine Gelegenheit Vorsprung, höchstens
  // zwölf — darüber ist der Vorsprung deutlich, und die Zahl sagt den Rest.
  const zellen = Array.from({length: Math.min(m, 12)}, () => '<i></i>').join('') + (m > 12 ? '<b>+' + (m - 12) + '</b>' : '');
  const balken = (wert, name, cls) => `<div class="bl-lz-z ${cls}"><span class="n">${esc(name)}</span>`
    + `<span class="b"><i style="width:${(wert * 100).toFixed(1)}%"></i></span><span class="v num">${pz(wert)} %</span></div>`;
  return `<div class="bl-luft" data-luft="${m}" data-ton="${ton}">
      <div class="bl-lz-kopf"><span class="bl-lz-zahl num">${m}</span>
        <span class="bl-lz-was">${m === 1 ? 'Ergebnis' : 'Ergebnisse'} Vorsprung</span>
        <span class="bl-lz-wort">${wort}</span></div>
      ${m ? `<div class="bl-lz-zellen">${zellen}</div>` : ''}
      ${balken(q, 'Bestwert', 'a')}${balken(zweiter.q, zweiter.name, 'b')}
    </div>
    <div class="bl-satz">${satz}</div>`;
}
// Wie es dazu kam: der Wert des Halters und des Zweiten an jedem Monatsende
// und heute. `serie` = {labels, a, b, aName, bName, seit}; ein fehlender
// Wert (noch nicht in der Wertung) unterbricht die Linie.
function belegVerlaufHtml(s){
  if(!s || !s.labels || s.labels.length < 2) return '';
  const alle = s.a.concat(s.b || []).filter(v => v != null && isFinite(v));
  if(alle.length < 2) return '';
  let lo = Math.min(...alle), hi = Math.max(...alle);
  if(!(hi > lo)){ lo -= 1; hi += 1; }
  const W = 300, H = 74, n = s.labels.length;
  const x = i => (8 + i * (W - 16) / (n - 1)).toFixed(1);
  const y = v => (H - 16 - (v - lo) / (hi - lo) * (H - 26)).toFixed(1);
  const linie = (werte, cls) => {
    const teile = []; let lauf = [];
    werte.forEach((v, i) => {
      if(v == null || !isFinite(v)){ if(lauf.length) teile.push(lauf); lauf = []; return; }
      lauf.push(x(i) + ',' + y(v));
    });
    if(lauf.length) teile.push(lauf);
    return teile.map(t => t.length > 1
      ? `<polyline class="${cls}" points="${t.join(' ')}"/>`
      : `<circle class="${cls}" cx="${t[0].split(',')[0]}" cy="${t[0].split(',')[1]}" r="2"/>`).join('');
  };
  const seit = s.seit != null && s.a[s.seit] != null
    ? `<circle class="bl-v-seit" cx="${x(s.seit)}" cy="${y(s.a[s.seit])}" r="4.5"/>` : '';
  const achse = s.labels.map((l, i) => (i === 0 || i === n - 1 || n <= 6)
    ? `<text x="${x(i)}" y="${H - 2}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(l)}</text>` : '').join('');
  return `<svg class="bl-verlauf" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      ${s.b ? linie(s.b, 'bl-v-b') : ''}${linie(s.a, 'bl-v-a')}${seit}${achse}</svg>
    <div class="bl-legende"><span class="a">${esc(s.aName)}</span>${s.b ? `<span class="b">${esc(s.bName)}</span>` : ''}${
      s.seit != null ? `<span class="seit">vorn seit ${esc(s.labels[s.seit])}</span>` : ''}</div>`;
}
// Der Beleg in seiner festen Reihenfolge — nur die Formen, die für die
// Größe etwas sagen: eine Serie hat keine Spanne, ein Monat keinen Verlauf.
//   o.ev       der Beleg des Halters („36 von 50 Partien gewonnen")
//   o.feld     {v, t, er} je Eintrag im Rennen
//   o.dahinter ein Satz über den Zweiten
//   o.zweiter  {name, q} für die Spanne
//   o.verlauf  die id eines Liga-Rekords: sein Verlauf kommt nach dem
//              Öffnen (belegVerlaufLaden)
function belegHtml(o){
  const a = belegAnteil(o.ev);
  const teile = [];
  if(a) teile.push(blattAbschnittHtml('chartBar', 'Woraus', a.n + ' insgesamt')
    + `<div class="bl-box">${belegZellenHtml(a)}</div>`);
  const feld = belegFeldHtml(o.feld, true);
  if(feld) teile.push(blattAbschnittHtml('users', 'Wo im Feld', o.feld.length + ' im Rennen')
    + `<div class="bl-box">${feld}${o.dahinter ? `<div class="bl-satz">${o.dahinter}</div>` : ''}</div>`);
  const lz = a && _belegIstQuote(o.ev, a) ? belegLuftHtml(a, o.zweiter) : '';
  if(lz) teile.push(blattAbschnittHtml('target', 'Wie knapp') + `<div class="bl-box">${lz}</div>`);
  if(o.verlauf) teile.push(blattAbschnittHtml('chartUp', 'Wie es dazu kam', 'Monatsenden')
    + `<div class="bl-box" data-verlauf="${esc(o.verlauf)}"><div class="bl-lade"></div></div>`);
  return teile.join('');
}
// Der Verlauf kommt nach: er braucht einen Zeitschnitt je Monat
// [rekordVerlauf]. Ist das Blatt inzwischen ein anderes, fällt er weg.
function belegVerlaufLaden(root){
  const box = root && root.querySelector('[data-verlauf]');
  if(!box) return;
  setTimeout(() => {
    if(!box.isConnected) return;
    rekordVerlauf(box.dataset.verlauf, s => {
      if(!box.isConnected) return;
      const html = belegVerlaufHtml(s);
      if(html) box.innerHTML = html;
      else { const kopf = box.previousElementSibling; box.remove(); if(kopf) kopf.remove(); }
    });
  }, 360);
}
