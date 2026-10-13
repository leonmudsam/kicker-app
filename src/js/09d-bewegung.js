// ─── §4.5 ─── BEWEGUNG (Öffnen, Gerüst, Kantenlicht, Aufbau) ─────────────
// Wie die App sich öffnet [§C43]. Die Oberfläche steht im ersten Bild:
// Kopfleiste und Zeichen sind festes Markup in src/index.html, sichtbar,
// bevor dieses Skript übersetzt ist. Sobald die Liga gezeichnet ist, baut
// sie sich auf — bei jedem Öffnen. Ein Startbild mit dem Zeichen in der Mitte
// gab es einmal; es stand zwischen dem Öffnen und der Liga und wurde wieder
// entfernt, ebenso eine Sperre, die nach kurzer Pause keine Vorführung
// zeigte: wer die App öffnet, soll sie jedes Mal ankommen sehen. Hat das
// Gerät keinen Stand (erster Start, neue Fassung), steht bis zur Antwort der
// Datenbank das Gerüst der Liga.
//
// Bewegung gibt es nur, wo ein Browser sie zeichnet: der Generator im Worker
// und die Rechentests führen diesen Code mit einem Schein-DOM aus, ohne
// `Element` und ohne `animate`.
function _bewegungDa(){
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}
const _ruheAbfrage = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
function _bewegungRuhig(){ return !_bewegungDa() || !_ruheAbfrage || _ruheAbfrage.matches; }

// Aus 37-boot.js, vor dem ersten `loadAll`. Kommt nach 2,5 s kein Bild —
// etwa weil der Speicher des Geräts hängt —, steht das Gerüst da, und die
// Liga kommt, wenn sie kommt.
let _startAuftrag = 0;
function _startBereit(){
  if(_bewegungDa()) _startAuftrag = setTimeout(_startGeruest, 2500);
}
// Kein Stand auf dem Gerät (aus `_standZeigen`) oder kein Bild nach 2,5 s.
function _startGeruest(){
  clearTimeout(_startAuftrag); _startAuftrag = 0;
  const main = document.getElementById('main');
  if(main && !main.firstElementChild && main.innerHTML !== undefined) main.innerHTML = _geruestHtml();
}
function _geruestHtml(){
  const k = c => '<i class="gk' + (c ? ' ' + c : '') + '"></i>';
  const zeile = erste => '<div class="g-zeile' + (erste ? ' g-erste' : '') + '">' + k('g-pos') + k('g-av')
    + '<span class="g-mid">' + k('g-m1') + k('g-m2') + k('g-m3') + '</span>' + k('g-wert') + '</div>';
  return '<section class="view active geruest" aria-busy="true" aria-label="Die Liga lädt">'
    + '<div class="g-kopf">' + k('g-h') + k('g-s') + '</div>'
    + '<div class="g-switch">' + k('g-sw') + '</div><div class="g-lauf"></div>'
    + '<div class="g-wahl">' + k('g-w1') + k('g-w') + k('g-w') + '</div>'
    + '<div class="g-tabs">' + k('g-t') + k('g-t') + '</div>'
    + '<div class="g-liste">' + zeile(true) + zeile() + zeile() + zeile() + zeile() + zeile() + '</div></section>';
}
// ── Das Kantenlicht [§C27] ─────────────────────────────────────────────
// Ein Ring aus einer Maske, darin ein Kegel aus Licht, der sich dreht: die
// Linie fährt die Kante ab. Zwei Bedeutungen und keine dritte [§C41]:
//   zeichnen  einmal herum, dann steht der Rahmen einige Sekunden: eine
//             Karte, die zählt, ist angekommen;
//   hinweis   zweimal herum, ohne Rahmen: hier ist etwas neu.
// (Das Licht, das im Profilkopf kreist, solange der Monat läuft, ist
// dieselbe Zeichnung mit eigener Bedeutung: es läuft.)
// Zeichnen und Hinweis enden nicht mit der Runde: das Licht läuft langsamer
// weiter, ein Schein liegt um die Karte, und nach gut vier Sekunden verlischt
// beides. Nach gut einer Sekunde war es vorbei, bevor man die Karte angesehen
// hatte. `d` ist die Diagonale der Karte in px: so groß wird der Kegel, nicht
// größer — eine gedrehte Ebene kostet bei dreifacher Pixeldichte Speicher im
// Quadrat ihrer Kante. Gemessen wird nichts; die Größe kennt der Aufrufer.
const KANTE_MS = {zeichnen:4600, hinweis:4200};
// Die Farben des Lichts: das Metall der Plätze, Acid fürs Bedienen, Weiß
// für den Knopf „Match eintragen", die Farbe einer Story [§C25]. Eine feste
// Tabelle statt `'kl-' + ton`: ein Ton, den es nicht gibt, fällt so auf,
// statt als farbloses Licht.
const KANTE_TON = {gold:'kl-gold', silber:'kl-silber', bronze:'kl-bronze', acid:'kl-acid', weiss:'kl-weiss', story:'kl-story'};
const KANTE_ART = {zeichnen:'kl-zeichnen', hinweis:'kl-hinweis'};
function kantenlicht(ziel, ton, art, verzug, d, innen){
  if(!ziel || _bewegungRuhig() || !KANTE_TON[ton] || !KANTE_ART[art]) return null;
  const teile = [], t0 = performance.now();
  const klassen = ' ' + KANTE_ART[art] + ' ' + KANTE_TON[ton] + (innen ? ' kl-innen' : '');
  const schein = document.createElement('span');
  schein.className = 'kl-schein' + klassen;
  schein.style.setProperty('--kv', verzug + 'ms');
  teile.push(schein);
  const ring = document.createElement('span');
  ring.className = 'kl' + klassen;
  ring.style.cssText = '--kd:' + Math.ceil(d) + 'px;--kv:' + verzug + 'ms';
  ring.innerHTML = '<i></i>';
  teile.push(ring);
  teile.forEach(t => { t.setAttribute('aria-hidden', 'true'); t.dataset.t0 = t0; t.dataset.kv = verzug; ziel.appendChild(t); });
  setTimeout(() => teile.forEach(t => t.remove()), verzug + KANTE_MS[art] + 120);
  return ring;
}

// ── Der Aufbau ─────────────────────────────────────────────────────────
// Eine Ansicht kommt in Teilen: Überschrift, Wähler, dann Karten und Zeilen,
// 30 bis 40 ms auseinander. Höchstens vierzehn Teile, und die Verzögerung
// steht an jedem Teil selbst — eine vererbte Variable ließe jeden Knoten
// darunter seinen Stil neu rechnen, samt Wappen. Gemessen wird nichts: welche
// Teile im Bild stehen, sagt die Reihenfolge. Beim Betreten eines Reiters
// stehen Überschrift, Wähler und Suche sofort da; kamen auch sie aus dem
// Nichts, stand zwischen altem und neuem Reiter ein leeres Bild. Danach
// trägt kein Teil mehr eine Spur davon: Klasse und Verzögerung gehen wieder.
const AUFBAU_LISTE = '.rlist, .mlist, .podest, .aw-vitrine';
const AUFBAU_KOPF = '.view-head, .ui-switch, .ui-tabs, .saisonwahl, .lauf, .search, .einblick, .mini-label';
let _aufbauTeile = [];
let _aufbauAuftrag = 0;
function _aufbauen(view, start, schritt, hoechstens, ohneKopf){
  if(!view || _bewegungRuhig()) return;
  _aufbauFertig();
  const teile = [];
  for(const kind of view.children){
    if(teile.length >= hoechstens) break;
    if(ohneKopf && kind.matches(AUFBAU_KOPF)) continue;
    const liste = kind.matches(AUFBAU_LISTE) ? kind
      : (kind.children.length === 1 && kind.firstElementChild.matches(AUFBAU_LISTE) ? kind.firstElementChild : null);
    if(liste) teile.push(...[...liste.children].slice(0, 7));
    else teile.push(kind);
  }
  _aufbauTeile = teile.slice(0, hoechstens);
  _aufbauTeile.forEach((t, i) => { t.classList.add('bau'); t.style.animationDelay = (start + i * schritt) + 'ms'; });
  _aufbauAuftrag = setTimeout(_aufbauFertig, start + _aufbauTeile.length * schritt + 560);
}
function _aufbauFertig(){
  clearTimeout(_aufbauAuftrag); _aufbauAuftrag = 0;
  // Kein leeres style-Attribut bleibt zurück: das Markup ist danach dasselbe
  // wie ohne Aufbau.
  _aufbauTeile.forEach(t => { t.classList.remove('bau'); t.style.animationDelay = '';
    if(t.getAttribute('style') === '') t.removeAttribute('style'); });
  _aufbauTeile = [];
}

// ── Das Podest glänzt ──────────────────────────────────────────────────
// Beim ersten Betreten eines Reiters in der Sitzung fährt das Kantenlicht in
// ihrem Metall um Platz 1, 2 und 3, nacheinander [§C25]: in Liga und
// Positionen um die ersten drei Zeilen, bei den Duos ebenso, bei den Awards
// um das Podest; über Gold zieht danach das Band, das den Titel trägt. Im
// Verlauf ist es die letzte Partie, die ankommt. Einmal: wer zwischen zwei
// Reitern hin- und herwechselt, sieht es nicht jedes Mal.
const PODEST_KARTEN = {
  ranking:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
  positions:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
  teams:'.rlist > .rrow.tm-top',
  awards:'.podest > .pod-karte'
};
const PODEST_VERSATZ = {gold:0, silber:220, bronze:440};
const _podestDa = new Set();
// Die Diagonale einer Karte, für den Kegel — geschätzt aus der Breite des
// Fensters (die Spalte ist höchstens 520 px breit, 16 px Rand) und einer
// Höhe, die die Karte nie überschreitet. Gemessen wird nicht: ein
// `offsetWidth` direkt nach dem Zeichnen erzwänge das Layout mitten im
// ersten Bild, und genau das kostete im Entwurf Zeit.
function _diagonale(art){
  const b = Math.min(innerWidth, 520) - 32;
  return art === 'podest' ? Math.hypot(b / 3 + 12, 215) + 8
    : art === 'partie' ? Math.hypot(b, 210) + 8 : Math.hypot(b, 112) + 8;
}
function _podestLicht(view, reiter, start){
  if(!view || _bewegungRuhig() || _podestDa.has(reiter)) return;
  if(reiter === 'history'){
    const z = view.querySelector('.mlist > .mrow');
    if(!z) return;
    _podestDa.add(reiter);
    kantenlicht(z, 'acid', 'zeichnen', start, _diagonale('partie'));
    return;
  }
  const karten = PODEST_KARTEN[reiter] ? [...view.querySelectorAll(PODEST_KARTEN[reiter])].slice(0, 3) : [];
  if(!karten.length) return;
  _podestDa.add(reiter);
  // Das Metall sagt die Klasse (top1, gold …); die Duos tragen nur
  // „tm-top", dort sagt es die Reihenfolge.
  karten.forEach((z, i) => {
    const k = ' ' + z.className + ' ';
    const ton = /\s(top1|gold)\s/.test(k) ? 'gold' : /\s(top2|silber)\s/.test(k) ? 'silber'
      : /\s(top3|bronze)\s/.test(k) ? 'bronze' : ['gold', 'silber', 'bronze'][i];
    const v = start + PODEST_VERSATZ[ton];
    kantenlicht(z, ton, 'zeichnen', v, _diagonale(reiter === 'awards' ? 'podest' : 'zeile'));
    // Gold mit eigener Lichtbahn (das Podest der Awards) braucht keine zweite.
    if(ton === 'gold' && !z.querySelector(':scope > .glanz-bahn')) _glanzEinmal(z, v + 1150);
  });
}
// Das Band über Gold: dieselbe Bahn wie das Licht über einem Titel
// (`.glanz-bahn`, 06-misc.css) [§C27], einmal statt im Takt.
function _glanzEinmal(ziel, verzug){
  const b = document.createElement('span');
  b.className = 'glanz-bahn glanz-einmal'; b.setAttribute('aria-hidden', 'true');
  b.style.setProperty('--gv', verzug + 'ms');
  b.dataset.t0 = performance.now(); b.dataset.kv = verzug;
  ziel.appendChild(b);
  setTimeout(() => b.remove(), verzug + 1500);
}

// ── Licht über das Neuzeichnen hinweg ──────────────────────────────────
// Kommen neue Daten, zeichnet die App den Reiter neu, und mit den alten
// Zeilen verschwand ihr Licht — nach gut einer Sekunde, mitten im Leuchten,
// weil die Datenbank eben dann antwortet. Das Licht wechselt deshalb an
// dieselbe Stelle der neuen Ansicht (Platz 1 bleibt Platz 1) und läuft dort
// weiter, wo es war: seine Verzögerung wird um die vergangene Zeit kleiner,
// auch kleiner als null. Sein Zeitgeber räumt es zur alten Zeit ab.
function _lichtMerken(root){
  const jetzt = performance.now();
  return [...root.querySelectorAll('.kl, .kl-schein, .glanz-einmal')].map(e => {
    const pfad = [];
    for(let n = e.parentNode; n && n !== root && n.parentNode; n = n.parentNode)
      pfad.unshift([].indexOf.call(n.parentNode.children, n));
    return {e, pfad, v:(+e.dataset.kv || 0) - (jetzt - (+e.dataset.t0 || jetzt))};
  });
}
function _lichtZurueck(root, liste){
  const jetzt = performance.now();
  liste.forEach(x => {
    if(x.e.isConnected) return;
    let n = root;
    for(let i = 0; i < x.pfad.length && n; i++) n = n.children[x.pfad[i]];
    if(!n) return;
    x.e.dataset.t0 = jetzt; x.e.dataset.kv = x.v;
    x.e.style.setProperty(x.e.classList.contains('glanz-einmal') ? '--gv' : '--kv', x.v + 'ms');
    n.appendChild(x.e);
  });
}

// ── Die Vorführung beim Öffnen ─────────────────────────────────────────
// Sie gehört dem Öffnen — jedem: dem ersten Bild, das der Start zeichnet,
// während `loadAll` läuft, nicht einem `render` von anderswo — und dem Betreten
// eines Reiters über die untere Leiste (`_reiterBetreten`, aus
// `_renderNachEingabe`). Ein Zeitraum oder neue Daten im selben Reiter bauen
// nichts neu auf: das sah schon einmal wie ein Neustart aus (01-shell.css).
let _reiterBetreten = '';
let _vorfuehrungAuftrag = 0;
function _bewegungNachRender(root, warTab, geruest){
  if(!_bewegungDa()) return;
  const view = root.firstElementChild;
  if(!warTab){
    clearTimeout(_startAuftrag); _startAuftrag = 0;
    if(geruest && !_bewegungRuhig()){
      // Das Gerüst liegt noch einen Augenblick über der Liga und blendet aus.
      geruest.classList.add('g-weg'); root.appendChild(geruest);
      geruest.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-out', fill:'forwards'})
        .finished.then(() => geruest.remove(), () => geruest.remove());
    }
    if(!_loadAllPromise || _bewegungRuhig()) return;
    // Die untere Leiste baut sich auf, einmal, über eine Klasse am
    // Wurzelknoten — beim Öffnen, nicht bei jedem Wechsel. Um das Zeichen in
    // der Kopfleiste fährt einmal Licht; zuletzt dreht sich „Match
    // eintragen" herein, und Licht fährt um ihn: bereit.
    document.documentElement.classList.add('aufbau');
    _vorfuehrungAuftrag = setTimeout(() => document.documentElement.classList.remove('aufbau'), 1700);
    kantenlicht(document.querySelector('.logo-mark'), 'acid', 'zeichnen', 120, 60, true);
    const fab = document.getElementById('fab');
    if(fab && fab.style.display !== 'none') kantenlicht(fab, 'weiss', 'zeichnen', 1150, 90);
    _aufbauen(view, 40, 40, 14);
    _podestLicht(view, tab, 640);
    return;
  }
  if(warTab !== tab && _reiterBetreten === tab){
    _reiterBetreten = '';
    _aufbauen(view, 0, 30, 8, true);
    _podestLicht(view, tab, 360);
  }
}
// Wer tippt, wischt oder scrollt, will etwas Bestimmtes: der Aufbau endet
// sofort, und alles steht, wo es hingehört. Das Licht an den Kanten läuft
// zu Ende — es verdeckt nichts und hält nichts auf; wer gleich
// weiterscrollte, sah es sonst nie.
function _vorfuehrungEnde(){
  if(_vorfuehrungAuftrag){ clearTimeout(_vorfuehrungAuftrag); _vorfuehrungAuftrag = 0; document.documentElement.classList.remove('aufbau'); }
  if(_aufbauTeile.length) _aufbauFertig();
}
['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(ev =>
  document.addEventListener(ev, _vorfuehrungEnde, {passive:true, capture:true}));
