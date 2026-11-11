// ╔═══ §10.3 ─── HELPERS (Achievement-Toasts, Utils) ───────────────────╗
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// v9.15 PERF: memoisiert + Intl.DateTimeFormat wiederverwendet — toLocaleString
// baute den Formatter bei JEDEM Aufruf neu (läuft pro History-Zeile/Story).
const _dateStrFmt=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const _dateStrMemo=new Map();
function dateStr(ts){
  const k=typeof ts==='string'?ts:+ts;
  let v=_dateStrMemo.get(k);
  if(v===undefined){
    v=_dateStrFmt.format(new Date(ts));
    if(_dateStrMemo.size>20000)_dateStrMemo.clear();
    _dateStrMemo.set(k,v);
  }
  return v;
}
// ── Ein Datum, ein Formatierer ──────────────────────────────────────
// `toLocaleDateString` mit Optionen baut bei jedem Aufruf einen neuen
// Formatierer. Im Feed läuft das je Karte mehrmals (Uhrzeit, Tageskopf,
// Datum im Satz): gemessen 16 ms für die Uhrzeit allein beim Öffnen. Dieselbe
// Ausgabe, einmal gebaut.
const _FMT_ARTEN = {uhr:{hour:'2-digit', minute:'2-digit'}, tm:{day:'2-digit', month:'2-digit'},
  tmj:{day:'2-digit', month:'2-digit', year:'2-digit'}, wt:{weekday:'long'}};
const _FMT = {};
// `tmx` ist ein Tag, den man in einem Satz nennt: ohne Jahr, wenn es das
// laufende ist, sonst mit. Mit den Jahren stand „Der letzte Sieg gegen Leon
// war am 15.03." da, und gemeint war ein März drei Jahre zuvor.
function datumFmt(when, art){
  const d = when instanceof Date ? when : new Date(when);
  if(art === 'tmx') art = d.getFullYear() === new Date().getFullYear() ? 'tm' : 'tmj';
  const f = _FMT[art] || (_FMT[art] = new Intl.DateTimeFormat('de-DE', _FMT_ARTEN[art]));
  return f.format(d);
}
// Ein Tag am Ende eines Satzes trägt dessen Punkt: „am 15.03." hat ihn
// schon, „am 15.03.27" nicht. Vorher stand „bis 21.06.." mit zweien da.
function tagImSatz(when){
  const t = datumFmt(when, 'tmx');
  return t.endsWith('.') ? t : t + '.';
}
// ── Eine Dezimalzahl trägt hier ein Komma ───────────────────────────
// Die Oberfläche schreibt „6,9 Gegentore", die Fun Facts schrieben „6.9" —
// acht Stellen mit `toFixed(1)` und ein Punkt mitten im deutschen Satz.
// Eine Stelle für alle, damit es nicht wieder auseinanderläuft [§C27].
function komma(v, n){
  const z = Number(v);
  return (isFinite(z) ? z : 0).toFixed(n == null ? 1 : n).replace('.', ',');
}
// ── Eine lange Zahl trägt Tausenderpunkte ───────────────────────────
// Die Fun Facts setzen ihre Zahlen roh in den Satz, und mit den Jahren
// wurden sie fünfstellig: „82820 Tore in 5152 Partien", „22673 Tore" im
// Jahresrückblick. Ab fünf Stellen gruppiert, wie die Norm es verlangt;
// vierstellige bleiben, wie sie sind, und eine Zahl hinter Komma, Punkt
// oder Buchstabe ist keine eigene.
function tausender(text){
  return String(text == null ? '' : text).replace(/(^|[^\d.,\w])(\d{5,})(?!\d)/g,
    (m, vor, z) => vor + _spZahl(Number(z)));
}
// Der Stand aus Sicht einer Seite: ihre Tore zuerst. Ohne zweites Argument
// die der Sieger. Gespeichert ist er in der Reihenfolge der Eingabe (Team A
// zuerst), und neun Stellen schrieben ihn so ab, während zwei andere ihn
// selbst umdrehten [§C27]: „Stefan & Martin 8:10" in der Liste der
// Überraschungen, und im Duo-Blatt stand neben einem roten Kreuz „10 : 8".
function standFuer(m, gewonnen = true){
  const s = m.winner === 'B' ? [m.score_b, m.score_a] : [m.score_a, m.score_b];
  return gewonnen ? s[0] + ':' + s[1] : s[1] + ':' + s[0];
}
function emptyState(e,t){
  // Wenn 'e' ein Icon-Name aus ICONS ist → SVG rendern; sonst als Text/Emoji belassen
  const inner = icPfad(e) ? `<div class="ee svg-ic">${svgI(e)}</div>` : `<div class="ee">${e}</div>`;
  return `<div class="leerstand">${inner}${t}</div>`;
}

// ── Die Erklärkarte [§C27] ───────────────────────────────────────────
// Oben in jedem Reiter und Unterreiter steht, was hier zu sehen ist und wie
// es entsteht: Zeichen, Titel, ein, zwei Sätze. Ohne sie erfuhr, wer neu
// dazukam, nicht, wozu Positionen, Rekorde oder Chronik da sind, und in
// einer leeren Liga stand nur „Noch keine Partien" — eine leere Fläche liest
// sich als Fehler. Die Karte steht in der leeren wie in der laufenden Liga.
//   ic     Zeichen aus ICONS
//   titel  was die Ansicht ist; zugleich der Schlüssel, unter dem die Karte
//          geschlossen bleibt
//   satz   was hier erscheint und wie es entsteht (Markup erlaubt)
//   ersatz steht, wo die Karte der einzige Inhalt einer leeren Ansicht war:
//          nach dem Schließen die kurze Zeile des leeren Zustands statt
//          einer leeren Fläche
// Die Sätze sind feste Texte aus dem Code, keine Eingaben; nur der Titel
// wird maskiert, weil er auch im Attribut steht.
// Das Kreuz schließt die Karte auf diesem Gerät, in allen Reitern und nach
// jedem Neuladen. Gemerkt wird der Titel, nicht der Text: ein umformulierter
// Satz holt eine geschlossene Karte nicht zurück. Fehlt der Speicher des
// Geräts (privates Fenster, gesperrt), erscheint die Karte wieder, mehr
// nicht. Gelesen wird er einmal je Start, nicht bei jedem Zeichnen; die
// Einstellungen holen alle Karten zurück.
const HINWEISE_WEG_LS = 'kicker_hinweise_weg_v1';
let _hinweiseWeg = null;
function hinweiseWeg(){
  if(!_hinweiseWeg){
    try{
      const a = JSON.parse(localStorage.getItem(HINWEISE_WEG_LS) || '[]');
      _hinweiseWeg = new Set(Array.isArray(a) ? a.filter(x => typeof x === 'string') : []);
    }catch(e){ _hinweiseWeg = new Set(); }
  }
  return _hinweiseWeg;
}
function _hinweiseSpeichern(){
  try{
    if(_hinweiseWeg && _hinweiseWeg.size) localStorage.setItem(HINWEISE_WEG_LS, JSON.stringify([..._hinweiseWeg]));
    else localStorage.removeItem(HINWEISE_WEG_LS);
  }catch(e){}
}
function vorschauHtml(ic, titel, satz, ersatz){
  if(hinweiseWeg().has(titel)) return ersatz || '';
  return `<div class="vorschau" data-hinweis="${esc(titel)}">
    <button type="button" class="vs-zu" data-hinweis-zu aria-label="Hinweis schließen">${svgI('x')}</button>
    <div class="vs-kopf"><span class="vs-ic">${svgI(ic)}</span><b>${esc(titel)}</b></div>
    ${satz ? `<p class="vs-satz">${satz}</p>` : ''}${ersatz ? `<template>${ersatz}</template>` : ''}
  </div>`;
}
// Ein Zuhörer für alle Karten: sie stehen in jedem Reiter und Unterreiter,
// und ein Binden je Zeichnen hätte jede Ansicht einzeln kennen müssen.
// Geschlossen wird an Ort und Stelle, ohne die Ansicht neu zu zeichnen —
// ein Neuzeichnen setzte die Liste an den Anfang zurück; das nächste
// Zeichnen lässt die Karte von selbst weg. Ohne Bewegung [§C43] geht sie
// sofort, sonst in 200 ms.
if(typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', e => {
  const zu = e.target && e.target.closest && e.target.closest('[data-hinweis-zu]');
  if(!zu) return;
  e.preventDefault(); e.stopPropagation();
  const karte = zu.closest('.vorschau');
  if(!karte) return;
  hinweiseWeg().add(karte.dataset.hinweis);
  _hinweiseSpeichern();
  // Dieselbe Karte steht unter Saison, Tag und Spieler wie Teams: alle
  // gleichen gehen mit.
  document.querySelectorAll('.vorschau[data-hinweis]').forEach(k => {
    if(k.dataset.hinweis !== karte.dataset.hinweis) return;
    const ers = k.querySelector(':scope > template');
    const ende = () => { if(!k.isConnected) return; if(ers) k.replaceWith(ers.content.cloneNode(true)); else k.remove(); };
    if(k !== karte || matchMedia('(prefers-reduced-motion: reduce)').matches){ ende(); return; }
    k.classList.add('weg');
    setTimeout(ende, 200);
  });
});
// Die Karten der Reiter, an einer Stelle: der Titel ist der Schlüssel, und
// zwei Ansichten mit derselben Karte schließen sie gemeinsam.
const ERKLAERKARTEN = {
  liga:      ['chartBar', 'Die Liga', () =>
    `Die Rangliste der Saison, der Woche, des Spieltags oder der ganzen Laufbahn. Jede Partie verschiebt die Elo der vier Spieler, je nach Ausgang und der Stärke von Partner und Gegnern; jede Saison beginnt bei der Start-Elo.`],
  ligaDuos:  ['handshake', 'Die Duos der Saison', () =>
    `Jedes Duo mit zwei gemeinsamen Partien in dieser Saison, geordnet nach der Elo, die beide zusammen gewonnen oder verloren haben.`],
  tafel:     ['temple', 'Die Ewige Tafel', () =>
    `Die Elo der Laufbahn über alle Saisons: der gewichtete Schnitt der Saisonenden. Darüber stehen die Titel und Bestwerte der Liga.`],
  positionen:['posSturm', 'Sturm und Abwehr', () =>
    `Wer auf welcher Position der Stärkste der Liga ist. Der Wert verbindet die Siegquote dort, die Leistung gegen die Erwartung, die Tore und wie oft jemand dort stand.`],
  awards:    ['trophy', 'Die Awards', () =>
    `Auszeichnungen für den gewählten Zeitraum: jede Kachel stellt eine Frage an die Partien dieser Saison oder Woche, ein Tippen zeigt die ersten drei. Darunter stehen die Wertungen, die niemand gern hält.`],
  rekorde:   ['rekord', 'Die Liga-Rekorde', () =>
    `Bestwerte über alle Saisons. Wer einen übertrifft, nimmt ihn dem bisherigen Halter ab; jede Karte nennt ihre Bedingung, ein Tippen zeigt, wie gezählt wird.`],
  chronik:   ['scroll', 'Die Chronik', () =>
    `Jeder Monat schreibt Einträge für das, worin jemand besonders war, ab ${CHRONIK_MIN_SPIELE} Partien im Monat. Ein Tippen öffnet den Eintrag; Einträge, Rekorde und Auszeichnungen ergeben zusammen das Prestige.`],
  teams:     ['handshake', 'Die Duos der Liga', () =>
    `Jedes Duo ab 4 gemeinsamen Partien über alle Saisons. Gezählt werden nur die Partien, die beide zusammen gespielt haben.`],
  verlauf:   ['verlauf', 'Der Verlauf', () =>
    `Jede Partie der Liga, die neueste zuerst. Eine Partie öffnet, wie sich die Elo der vier Spieler verändert hat und warum.`],
  eingabe:   ['edit', 'Eine Partie eintragen', () =>
    `Vier Spieler mit ihrer Position und die Tore beider Teams. Gespeichert verschiebt die Partie die Elo und steht im Verlauf und in den News.`],
  formel:    ['neuRechnen', 'Die Elo-Formel', () =>
    `Die Regler bestimmen, wie stark eine Partie die Elo bewegt. Eine Änderung gilt für neue Partien, bis alle neu berechnet werden.`],
};
// Die Karte eines Reiters. Mit `leer` ist sie der einzige Inhalt einer
// leeren Ansicht und lässt nach dem Schließen die Zeile `leer` stehen; der
// Aufrufer zeichnet `leer` dann nicht noch einmal.
function erklaerKarte(key, leer){
  const k = ERKLAERKARTEN[key];
  return k ? vorschauHtml(k[0], k[1], k[2](), leer) : (leer || '');
}

// ── Die Hilfe eines Reiters [§C27] ───────────────────────────────────
// Ein kleines „?" neben der Überschrift öffnet ein Blatt: wie der Reiter
// funktioniert und wie seine Werte zustande kommen — nicht, was Tischkicker
// ist; das weiß, wer die App öffnet. Die Erklärung steht hinter dem Knopf
// statt als Absatz über der Liste, die sonst jeder bei jedem Öffnen
// wegscrollen müsste. Die Positionen hatten als einzige einen solchen
// Knopf, mit einem „i" und einer eigenen Funktion; alle Reiter teilen ihn.
const HILFE = {
  liga: {titel:'Liga', absaetze:[
    '<b>Saison</b> ist der laufende Monat; jeder beginnt ihn mit der Start-Elo. <b>Woche</b> und <b>Tag</b> zeigen die laufende Woche und den Spieltag, <b>Gesamt</b> die Ewige Tafel mit der Elo der Laufbahn über alle Saisons.',
    'Jede Partie verschiebt die Elo der vier Spieler. Wie viel, hängt von der Elo aller vier ab: ein Sieg gegen Stärkere bringt mehr, eine Niederlage gegen Schwächere kostet mehr.',
    'Die Leiste über der Liste sortiert um, nach Elo, Siegquote, Torbilanz und mehr. <b>Spieler</b> und <b>Teams</b> wechseln zwischen Einzelnen und Duos. Ein Name öffnet das Profil.',
    'Partien trägt das Plus unten rechts ein.']},
  positionen: {titel:'Positionen', absaetze:[
    'Wer auf welcher Position der Stärkste der Liga ist, getrennt nach Sturm und Abwehr. Die Position kommt aus der Aufstellung jeder Partie.',
    'Der Wert verbindet vier Dinge: die Siegquote auf dieser Position, die Leistung gegen die Erwartung, gemessen an Partner und Gegnern, die Tore, vorne die eigenen und hinten die zugelassenen, und die Erfahrung, also wie oft jemand dort gespielt hat.',
    '<b>▲</b> heißt über, <b>▼</b> unter der Erwartung. Gerechnet wird über alle Partien.',
    'Der Wert vergleicht die Liga auf einer Position. Auf welcher Position jemand selbst stärker ist, sagt das Positions-Profil im Profil.']},
  awards: {titel:'Awards, Rekorde, Chronik', absaetze:[
    '<b>Awards</b> gelten einem Zeitraum, der Saison oder der Woche. Jede Kachel stellt eine Frage, ein Tippen zeigt die ersten drei und den Verlauf.',
    '<b>Rekorde</b> sind Bestwerte über alle Saisons. Wer einen übertrifft, nimmt ihn dem bisherigen Halter ab.',
    () => `<b>Chronik</b>: jeder Monat schreibt Einträge für das, worin jemand besonders war, ab ${CHRONIK_MIN_SPIELE} Partien im Monat.`,
    'Auszeichnungen, Rekorde und Chronik-Einträge ergeben zusammen das Prestige und damit das Insignium am Wappen.']},
  teams: {titel:'Teams', absaetze:[
    'Jedes Duo ab 4 gemeinsamen Partien, sortiert nach Siegquote, Torbilanz oder Elo-Zuwachs; <b>Schlechteste</b> dreht die Reihenfolge um.',
    'Ein Duo öffnet die gemeinsame Bilanz: Partien, Elo und welche Aufstellung besser läuft. Das Netz der Duos zeigt, wer mit wem wie oft spielt.']},
  verlauf: {titel:'Verlauf', absaetze:[
    'Jede Partie, die neueste zuerst; oben lässt sich nach einem Spieler filtern.',
    'Eine Partie öffnet die Elo jedes Spielers und wie sie zustande kam. Dort lässt sie sich bearbeiten oder löschen; die Liga rechnet danach neu.']},
  eingabe: {titel:'Neue Partie', absaetze:[
    'Vier Spieler wählen, je Team zwei, und für jeden die Position: Sturm oder Abwehr.',
    'Die Tore beider Teams eintragen. Vor dem Speichern zeigt die Vorschau, wie viel Elo die Partie bringt und kostet.']},
  formel: {titel:'Elo-Formel', absaetze:[
    'Die Regler bestimmen, wie stark eine Partie die Elo bewegt; unter „So wirken die Regler" steht jeder einzeln.',
    'Eine Änderung gilt für neue Partien. „Alle Partien neu berechnen" wendet sie auf die ganze Liga an.',
    'Sicherung und Export speichern eine Kopie der Liga als Datei.']},
};
function hilfeKnopf(key){
  const h = HILFE[key];
  return h ? `<button class="kopf-info" type="button" data-hilfe="${key}" aria-label="So funktioniert ${esc(h.titel)}">${svgI('frage')}</button>` : '';
}
function zeigeHilfe(key){
  const h = HILFE[key]; if(!h) return;
  openSheet(blattKopfHtml({ic:'frage', titel:h.titel, unter:'So funktioniert es'})
    + `<div class="pos-info">${h.absaetze.map(a => `<p>${typeof a === 'function' ? a() : a}</p>`).join('')}</div>`);
}
// ── Der Hinweis [§C27] ───────────────────────────────────────────────
// Ein Balken in voller Farbe mit einem Satz: grün hieß „gespeichert", rot
// „Fehler", und alles andere stand weiß da — auch „Berechne neu…", das
// gerade noch läuft. Jetzt trägt er seine Rolle als Zeichenkachel [§C25],
// eine zweite Zeile mit der Wirkung und, wo es eine gibt, eine Aktion.
//   kind   'ok' | true (Fehler) | 'info' | nichts (läuft noch)
//   o.sub  die zweite Zeile, o.aktion {label, fn}, o.ms die Standzeit
let tt;
const TOAST_ROLLE = {ok:['check','gruen'], err:['x','rot'], info:['info',''], lauf:['hourglass','']};
function toast(msg, kind, o){
  o = o || {};
  const rolle = kind === true ? 'err' : (TOAST_ROLLE[kind] ? kind : 'lauf');
  let t = document.querySelector('.toast');
  if(!t){ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  const [ic, ton] = TOAST_ROLLE[rolle];
  t.innerHTML = zkHtml(ic, 'k', ton) + '<span class="toast-tx"><b></b><span></span></span>';
  t.querySelector('b').textContent = msg;
  const sub = t.querySelector('.toast-tx span');
  if(o.sub) sub.textContent = o.sub; else sub.remove();
  if(o.aktion){
    const k = document.createElement('button');
    k.className = 'toast-akt'; k.type = 'button'; k.textContent = o.aktion.label;
    k.onclick = () => { t.classList.remove('show'); clearTimeout(tt); o.aktion.fn(); };
    t.appendChild(k);
  }
  t.className = 'toast ' + rolle + (o.aktion ? ' mit-akt' : '');
  void t.offsetWidth; t.classList.add('show');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), o.ms || (o.aktion ? 6000 : 2400));
}

// ── Die Bestätigung [§C27] ───────────────────────────────────────────
// Vier Stellen fragten mit `confirm()` — einem Fenster des Browsers, das
// die App nicht gestalten kann, das auf dem Telefon „Seite sagt" darüber
// schreibt und bei dem der zerstörende Knopf „OK" heißt. Der Dialog nennt,
// was verloren geht, der sichere Knopf steht links, der zerstörende rechts
// und rot. Er liegt über einem offenen Blatt und nicht darin.
function bestaetigen(o){
  return new Promise(fertig => {
    const bg = document.createElement('div');
    bg.className = 'dlg-bg';
    bg.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true">
      ${zkHtml(o.ic || 'alert', 'g', o.gefahr ? 'rot' : '')}
      <h4></h4><p></p>
      <div class="blatt-fuss"><button type="button" class="btn ghost" data-dlg="0"></button>
        <button type="button" class="btn ${o.gefahr ? 'gefahr' : ''}" data-dlg="1"></button></div></div>`;
    bg.querySelector('h4').textContent = o.titel;
    bg.querySelector('p').textContent = o.text || '';
    bg.querySelector('[data-dlg="0"]').textContent = o.nein || 'Abbrechen';
    bg.querySelector('[data-dlg="1"]').textContent = o.ja || 'Bestätigen';
    const zu = ja => { bg.classList.remove('show'); setTimeout(() => bg.remove(), 200); _zurueckAbgleichen(); fertig(ja); };
    bg.onclick = e => { if(e.target === bg) zu(false); };
    bg.querySelectorAll('[data-dlg]').forEach(b => b.onclick = () => zu(b.dataset.dlg === '1'));
    document.body.appendChild(bg);
    void bg.offsetWidth; bg.classList.add('show');
    _zurueckAbgleichen();
  });
}

// ─── Achievement-Toast: gestapelte Anzeige für neue Badges nach Match-Eingabe ───
// Sequenzielle Queue verhindert, dass mehrere Achievements einander überschreiben.
// Jeder Toast 2.6s sichtbar + 0.4s Pause zwischen den Slides.
let _achToastQueue=[], _achToastBusy=false, _achToastTimer=null;
function showAchievementToast(playerName, badge){
  _achToastQueue.push({playerName, badge});
  _processAchToastQueue();
}
function _processAchToastQueue(){
  if(_achToastBusy || !_achToastQueue.length) return;
  _achToastBusy=true;
  const {playerName, badge}=_achToastQueue.shift();
  let el=document.querySelector('.ach-toast');
  if(!el){el=document.createElement('div');el.className='ach-toast';document.body.appendChild(el);}
  // Badge-Icon: zentrale badgeIc()-Logik nutzen (SVG zuerst, Emoji als Fallback)
  // — konsistent mit Profil, Awards-Sheet und Match-Detail. Mein CSS-Selektor
  // .ach-toast-ic svg übernimmt Größe/Stroke; das umliegende <span> ist neutral.
  const icHtml = badgeIc(badge, '22px');
  const subParts=[esc(playerName)];
  if(badge.count && badge.count>1) subParts.push(badge.count+'×');
  el.innerHTML=`
    <div class="ach-toast-ic">${icHtml}</div>
    <div class="ach-toast-text">
      <div class="ach-toast-cat">Neue Auszeichnung</div>
      <div class="ach-toast-name">${esc(badge.name)}</div>
      <div class="ach-toast-sub">${subParts.join(' · ')}</div>
    </div>`;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(_achToastTimer);
  _achToastTimer=setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>{ _achToastBusy=false; _processAchToastQueue(); }, 400);
  }, 2600);
}

