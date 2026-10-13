// ─── §4.5 ─── BEWEGUNG (Startbild, Gerüst, Kantenlicht) ──────────────────
// Wie die App sich öffnet [§C43]. Das Startbild ist festes Markup in
// src/index.html und steht im ersten Bild, bevor dieses Skript übersetzt
// ist. Ist die Liga gezeichnet, fliegt sein Zeichen an seinen Platz in der
// Kopfleiste; hat das Gerät keinen Stand (erster Start, neue Fassung), geht
// es ins Gerüst der Liga über, bis die Datenbank antwortet. Wer gerade erst
// in der App war, bekommt nur ein kurzes Überblenden.
//
// Bewegung gibt es nur, wo ein Browser sie zeichnet: der Generator im Worker
// und die Rechentests führen diesen Code mit einem Schein-DOM aus, ohne
// `Element` und ohne `animate`.
function _bewegungDa(){
  return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}
const _ruheAbfrage = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
function _bewegungRuhig(){ return !_bewegungDa() || !_ruheAbfrage || _ruheAbfrage.matches; }

// Wann die App zuletzt in den Hintergrund ging. Unter fünf Minuten ist es
// ein Zurückkommen, kein Öffnen: dann gibt es keinen Flug und keinen Aufbau,
// nur ein Überblenden — wer dreimal am Abend nachsieht, will nicht dreimal
// die Vorführung.
const START_ZULETZT = 'kicker_zuletzt_v1';
const START_KURZ_MS = 5 * 60 * 1000;
let _startKurz = false;
let _startbildAuftrag = 0;          // Rückfall, falls kein Bild kommt
function _startZuletztMerken(){
  if(document.visibilityState !== 'hidden') return;
  try { localStorage.setItem(START_ZULETZT, String(Date.now())); } catch(e){}
}
document.addEventListener('visibilitychange', _startZuletztMerken);

// Aus 37-boot.js, vor dem ersten `loadAll`. Kommt nach 2,5 s kein Bild —
// etwa weil der Speicher des Geräts hängt —, steht das Gerüst da, und die
// Liga kommt, wenn sie kommt.
function _startbildBereit(){
  if(!_bewegungDa()) return;
  try { _startKurz = Date.now() - (Number(localStorage.getItem(START_ZULETZT)) || 0) < START_KURZ_MS; } catch(e){}
  _startbildAuftrag = setTimeout(_startbildGeruest, 2500);
}
function _startbildAus(sb){
  const weg = () => sb.remove();
  if(_bewegungRuhig()) return weg();
  sb.animate([{opacity:1}, {opacity:0}], {duration:180, easing:'ease-out', fill:'forwards'}).finished.then(weg, weg);
}
// Kein Stand auf dem Gerät (aus `_standZeigen`) oder kein Bild nach 2,5 s:
// das Startbild geht, das Gerüst steht, bis die Liga kommt.
function _startbildGeruest(){
  clearTimeout(_startbildAuftrag); _startbildAuftrag = 0;
  const sb = document.getElementById('startBild');
  if(!sb || !sb.isConnected) return;
  const main = document.getElementById('main');
  if(main && !main.firstElementChild) main.innerHTML = _geruestHtml();
  _startbildAus(sb);
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
// Das erste Bild der Liga steht. Das Zeichen fliegt dorthin, wo es in der
// Kopfleiste steht — zwei Messungen, einmal —, Name und Spur gehen zuerst,
// der Grund blendet aus, und wenn es gelandet ist, fährt einmal Licht um
// seine Kante. Gibt zurück, ob die Liga aus dem Startbild kommt.
function _startbildEnde(){
  clearTimeout(_startbildAuftrag); _startbildAuftrag = 0;
  const sb = document.getElementById('startBild');
  if(!sb || !sb.isConnected) return false;
  if(_bewegungRuhig() || _startKurz){ _startbildAus(sb); return false; }
  const zeichen = sb.querySelector('.sb-zeichen'), ziel = document.querySelector('.logo-mark');
  const a = zeichen.getBoundingClientRect(), b = ziel ? ziel.getBoundingClientRect() : null;
  if(!b || !b.width || !a.width){ _startbildAus(sb); return false; }
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  ziel.style.opacity = '0';
  const fertig = () => { sb.remove(); ziel.style.opacity = ''; };
  zeichen.animate([{transform:'none'},
    {transform:'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + (b.width / a.width).toFixed(3) + ')'}],
    {duration:480, easing:'cubic-bezier(.65,0,.25,1)', fill:'forwards'}).finished
    .then(() => { fertig(); kantenlicht(ziel, 'acid', 'zeichnen', 0, 60, true); }, fertig);
  sb.querySelectorAll('.sb-name, .sb-unter, .sb-spur').forEach(e =>
    e.animate([{opacity:1}, {opacity:0, transform:'translateY(6px)'}], {duration:150, easing:'ease-in', fill:'forwards'}));
  sb.querySelector('.sb-grund').animate([{opacity:1}, {opacity:0}], {duration:300, delay:60, easing:'ease-out', fill:'forwards'});
  return true;
}

// ── Das Kantenlicht [§C27] ─────────────────────────────────────────────
// Ein Ring aus einer Maske, darin ein Kegel aus Licht, der sich dreht: die
// Linie fährt die Kante ab. Drei Bedeutungen und keine vierte [§C41]:
//   zeichnen  einmal herum, dann steht der Rahmen einige Sekunden: eine
//             Karte, die zählt, ist angekommen;
//   hinweis   zweimal herum, ohne Rahmen: hier ist etwas neu;
//   kreis     solange es dauert: es lädt (steht als Markup im Startbild).
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

// Nach jedem `render` (09-ui-infra.js). `warTab` ist der Reiter davor —
// leer beim ersten Bild —, `geruest` das Gerüst, das dieses Bild ersetzt hat.
function _bewegungNachRender(root, warTab, geruest){
  if(!_bewegungDa() || warTab) return;
  _startbildEnde();
  if(geruest && !_bewegungRuhig()){
    // Das Gerüst liegt noch einen Augenblick über der Liga und blendet aus.
    geruest.classList.add('g-weg'); root.appendChild(geruest);
    geruest.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-out', fill:'forwards'})
      .finished.then(() => geruest.remove(), () => geruest.remove());
  }
}
