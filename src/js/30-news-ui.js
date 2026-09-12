// ─── §11.3 — LocalStorage (Read-State) ───────────────────────────────
// Ring-Buffer-Pattern: max 200 IDs werden gespeichert, älteste fallen raus.
// Lesen ist O(N), Schreiben ist O(N) (Array-Operations). Bei N=200 vernachlässigbar.
function _newsLoadSeen(){
  try {
    const raw = localStorage.getItem(NEWS_LS_SEEN);
    if(!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch(e){ return new Set(); }
}
function _newsSaveSeen(set){
  try {
    // Ring-Buffer: bei Überlauf älteste IDs verwerfen (chronologische Reihenfolge
    // = Einfüge-Reihenfolge → Set-Iteration garantiert das in JS).
    let arr = [...set];
    if(arr.length > NEWS_LS_MAX_SEEN) arr = arr.slice(-NEWS_LS_MAX_SEEN);
    localStorage.setItem(NEWS_LS_SEEN, JSON.stringify(arr));
  } catch(e){}
}
function _newsMarkSeen(ids){
  const seen = _newsLoadSeen();
  const list = Array.isArray(ids) ? ids : [ids];
  list.forEach(id => seen.add(id));
  _newsSaveSeen(seen);
}
function _newsMarkAllSeen(){
  const stories = getStoriesCache();
  _newsMarkSeen(stories.map(s => s.id));
}
function newsUnreadCount(){
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  return stories.filter(s => !seen.has(s.id)).length;
}

// ─── §11.4 — Header-Badge-Refresh ────────────────────────────────────
// Wird nach loadAll() und nach gezielten UI-Aktionen aufgerufen.
// Stellt das News-Button-Sichtbarkeit und die Unread-Pille korrekt ein.
// Zusätzlich (v8.1): zeigt einmalig den "X neue Stories"-Toast, wenn neue
// Stories vorliegen und der Cooldown abgelaufen ist.
function newsBadgeRefresh(){
  const btn = document.getElementById('newsBtn');
  const badge = document.getElementById('newsBtnBadge');
  if(!btn || !badge) return;
  btn.style.visibility = 'visible';
  // v8.2: erste Aufruf nach Page-Load → Boot-Grace setzen, damit der
  // Toast den Auto-Recaps Vorrang gibt.
  if(!_newsBootGuardSet){
    _newsBootGuardSet = true;
    _newsBootGuardUntil = Date.now() + NEWS_BOOT_GRACE_MS;
    // Nach Ablauf der Grace einmal nachversuchen
    setTimeout(() => { try { _processDeferredNewsToast(); } catch(e){} }, NEWS_BOOT_GRACE_MS + 100);
  }
  let n = 0;
  try { n = newsUnreadCount(); } catch(e){ n = 0; }
  if(n > 0){
    badge.style.display = '';
    badge.textContent = n > 9 ? '9+' : String(n);
    // Toast nur bei "echten" Neuigkeiten (nicht bei jedem Refresh)
    _maybeShowNewsToast(n);
  } else {
    badge.style.display = 'none';
    // Falls alles gelesen → Toast sofort ausblenden (Zustände konsistent) UND
    // einen evtl. für den Sheet-Close gequeuten Toast verwerfen (v9.5-Fix),
    // damit nach „alle gelesen" + schnellem Schließen kein „X neue Stories"
    // mehr aufpoppt.
    _newsToastDeferredCount = 0;
    try { _hideNewsToast(); } catch(e){}
  }
}
// Global verfügbar machen, damit loadAll und onclick-Handler dranzukommen
window.newsBadgeRefresh = newsBadgeRefresh;

// ─── §11.4b — Toast-Logik (v8.1, erweitert v8.2) ─────────────────────
// Cooldown-basierter Hinweis "X neue Stories" unter dem News-Icon.
//
// Defer-Logik (v8.2): Toast darf NICHT erscheinen, solange ein Sheet
// (Saison-/POTW-/POTD-Recap, Profil etc.) offen ist — sonst überdeckt
// das Recap den Toast und der User sieht ihn nie. Stattdessen wird die
// Anzeige gequeued und beim closeSheet() erneut versucht.
//
// Cooldown gegen Spam (zweistufig):
//   1. unread > zuletzt gezeigte Anzahl  → es gibt WIRKLICH mehr Stories
//   2. ODER seit letztem Toast > 6h verstrichen → erneut sanft erinnern
// Auto-hide nach 4s. Tap → Mini-Popup.
let _newsToastHideTimer = null;
let _newsToastDeferredCount = 0; // wartet auf Sheet-Close
// v8.2: Boot-Grace gegen Race-Condition mit Auto-Recaps.
//   Saison-Recap   → 600ms nach loadAll
//   POTW-Recap     → 900ms
//   POTD-Recap     → 1200ms
// → Für 2500ms nach erstem newsBadgeRefresh wird Toast ZURÜCKGESTELLT,
//   damit Recaps Vorrang haben. _processDeferredNewsToast (closeSheet-Hook)
//   holt ihn nach. Das macht Recaps + Toast nacheinander statt überlappend.
let _newsBootGuardSet = false;
let _newsBootGuardUntil = 0;
const NEWS_BOOT_GRACE_MS = 2500;
function _newsLoadToastState(){
  try {
    const raw = localStorage.getItem(NEWS_LS_TOAST);
    if(!raw) return {lastCount: 0, lastTs: 0};
    const o = JSON.parse(raw);
    return {lastCount: o.lastCount|0, lastTs: o.lastTs|0};
  } catch(e){ return {lastCount: 0, lastTs: 0}; }
}
function _newsSaveToastState(state){
  try { localStorage.setItem(NEWS_LS_TOAST, JSON.stringify(state)); } catch(e){}
}
// True, wenn aktuell ein Sheet offen ODER ein Recap in Schutz-Phase
// ODER die Boot-Grace-Period noch läuft. Während Boot-Grace warten wir,
// damit Auto-Recaps (Saison/POTW/POTD) ihre 600-1200ms-Verzögerung sicher
// nutzen können, BEVOR der Toast erscheint.
function _isSheetActive(){
  try {
    // Boot-Grace: Toast erst nach Recap-Trigger-Fenster zulassen
    if(_newsBootGuardUntil && Date.now() < _newsBootGuardUntil) return true;
    const sheet = document.getElementById('sheet');
    if(sheet && sheet.classList.contains('show')) return true;
    // Auch wenn das Sheet gleich auftaucht (Schutz-Phase aktiv) → warten
    if(sheet && sheet._protectedUntil && Date.now() < sheet._protectedUntil) return true;
  } catch(e){}
  return false;
}
function _maybeShowNewsToast(unreadCount){
  const toast = document.getElementById('newsToast');
  const txt = document.getElementById('newsToastTxt');
  if(!toast || !txt || unreadCount <= 0) return;
  const state = _newsLoadToastState();
  const now = Date.now();
  const moreThanBefore = unreadCount > state.lastCount;
  const cooledDown = (now - state.lastTs) > NEWS_TOAST_COOLDOWN_MS;
  if(!moreThanBefore && !cooledDown) return;
  // ── Defer wenn Recap/Sheet aktiv ─────────────────────────────────
  if(_isSheetActive()){
    _newsToastDeferredCount = unreadCount;
    return;
  }
  // Anzeigen
  txt.textContent = unreadCount + (unreadCount === 1 ? ' neue Story' : ' neue Stories');
  _positionNewsToast();
  toast.classList.add('visible');
  // Reflow erzwingen für CSS-Animation
  void toast.offsetWidth;
  toast.classList.add('show');
  _newsSaveToastState({lastCount: unreadCount, lastTs: now});
  _newsToastDeferredCount = 0;
  // Auto-hide nach 4s
  if(_newsToastHideTimer) clearTimeout(_newsToastHideTimer);
  _newsToastHideTimer = setTimeout(() => _hideNewsToast(), 4000);
  // Click → volles Sheet (v8.9, konsistent mit dem News-Button), Toast aus
  toast.onclick = () => {
    _hideNewsToast();
    try { openNewsFeed(); } catch(e){}
  };
}
function _hideNewsToast(){
  const toast = document.getElementById('newsToast');
  if(!toast) return;
  if(_newsToastHideTimer){ clearTimeout(_newsToastHideTimer); _newsToastHideTimer = null; }
  toast.classList.remove('show');
  setTimeout(() => toast.classList.remove('visible'), 300);
}
// v9: Toast dynamisch unter der News-Pille ausrichten (Pfeil zeigt auf die
// Button-Mitte). Nötig, weil die Pille (Idee E) breiter/variabler ist als das
// frühere Icon — der feste right:60px würde daneben zeigen. Wird nur beim
// Anzeigen aufgerufen (billig: zwei getBoundingClientRect).
function _positionNewsToast(){
  const toast = document.getElementById('newsToast');
  const btn = document.getElementById('newsBtn');
  if(!toast || !btn) return;
  const parent = btn.closest('.appbar');
  if(!parent) return;
  const pr = parent.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  if(!br.width) return; // Button (noch) unsichtbar
  const centerFromRight = pr.right - (br.left + br.width / 2);
  const ARROW = 18, HALF = 5, MINR = 8;
  let toastRight = centerFromRight - ARROW - HALF;
  let arrow = ARROW;
  if(toastRight < MINR){ toastRight = MINR; arrow = Math.max(ARROW, centerFromRight - toastRight - HALF); }
  toast.style.right = toastRight + 'px';
  toast.style.setProperty('--nt-arrow', arrow + 'px');
}
// Wird in closeSheet() aufgerufen — versucht gequeuten Toast nach
// kurzem Delay (User soll Sheet-Close-Animation sehen, bevor der nächste
// Hinweis aufpoppt).
function _processDeferredNewsToast(){
  if(!_newsToastDeferredCount) return;
  setTimeout(() => {
    // erneut prüfen: vielleicht hat sich währenddessen ein neues Sheet geöffnet
    if(_isSheetActive()) return;
    // v9.5-Fix: den Unread-Stand HIER NEU berechnen statt den gemerkten Count
    // zu verwenden. Der gemerkte Count wurde beim Öffnen des Sheets eingefroren;
    // hat der User danach im Sheet Stories (oder „alle") als gelesen markiert
    // und das Sheet schnell geschlossen, war der gemerkte Count veraltet und
    // der Toast poppte mit „X neue Stories" auf, obwohl keine mehr offen sind.
    // Jetzt zeigt der Toast nur, wenn WIRKLICH noch ungelesene Stories da sind.
    let n = 0;
    try { n = newsUnreadCount(); } catch(e){ n = 0; }
    _newsToastDeferredCount = 0;
    if(n <= 0) return;
    // Direkt anzeigen — Cooldown-Check schon im _maybeShowNewsToast wurde
    // bereits beim ersten Aufruf erfüllt; hier zwingen wir die Anzeige.
    const toast = document.getElementById('newsToast');
    const txt = document.getElementById('newsToastTxt');
    if(!toast || !txt) return;
    txt.textContent = n + (n === 1 ? ' neue Story' : ' neue Stories');
    _positionNewsToast();
    toast.classList.add('visible');
    void toast.offsetWidth;
    toast.classList.add('show');
    _newsSaveToastState({lastCount: n, lastTs: Date.now()});
    if(_newsToastHideTimer) clearTimeout(_newsToastHideTimer);
    _newsToastHideTimer = setTimeout(() => _hideNewsToast(), 4000);
    toast.onclick = () => {
      _hideNewsToast();
      try { openNewsFeed(); } catch(e){}
    };
  }, 500);
}
window._processDeferredNewsToast = _processDeferredNewsToast;

// ─── §11.5 — Das Mini-Popup ist entfallen ────────────────────────────
// Es zeigte fünf Stories in einer eigenen, viel einfacheren Karte: Kategorie-
// Pille aus der Datenbank („Badge & Awards"), Titel, Text. Genau die Pille,
// die der Feed seit dem Rubrikband nicht mehr trägt [§C33], und ohne Motiv,
// ohne Sammelband, ohne Gesicht. Erreichbar war es zuletzt gar nicht mehr:
// der Glockenknopf öffnet seit v8.9 direkt den vollen Feed, und geöffnet
// wurde das Popup nur noch von der Auffrischung — wenn es schon offen war.

// Datumsformatierung: "Heute, 16:07" / "Gestern, 21:11" / "12.06., 14:30"
function _newsWhenLabel(when){
  const d = new Date(when);
  const now = new Date();
  // Datumskeys in LOKALER Zeit bilden (nicht via toISOString → UTC): sonst zeigt
  // eine Story mit when=heute 00:00 Lokalzeit in Zonen mit positivem UTC-Offset
  // fälschlich „Gestern", obwohl die Uhrzeit lokal (toLocaleTimeString) heute ist.
  const _lkey = x => x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
  const todayKey = _lkey(now);
  const yest = _lkey(new Date(now.getTime() - 86400000));
  const dKey = _lkey(d);
  const hhmm = d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  if(dKey === todayKey) return 'Heute, '+hhmm;
  if(dKey === yest) return 'Gestern, '+hhmm;
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+', '+hhmm;
}

// Der Kalendertag einer Story, als Überschrift für eine Feed-Gruppe.
// Gleiche Zeitrechnung wie _newsWhenLabel: lokale Datumskeys, kein UTC.
// Der Tageskopf trägt den Wochentag ausgeschrieben und das Datum daneben.
// Vorher stand dort „Mi, 26. August" in einer Zeile mit der Anzahl; wer scrollte,
// übersah den Tageswechsel und las zwei Spieltage als einen. Heute und gestern
// behalten ihr Wort, weil man an ihnen kein Datum nachschlagen will.
function _newsDayLabel(when){
  const d = new Date(when), now = new Date();
  const k = x => x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
  if(k(d) === k(now)) return 'HEUTE';
  if(k(d) === k(new Date(now.getTime() - 86400000))) return 'GESTERN';
  return d.toLocaleDateString('de-DE',{weekday:'long'}).toUpperCase();
}
// Das Datum unter dem Wochentag. Bei „Heute" und „Gestern" steht es trotzdem
// da: sonst weiß man beim Zurückblättern nicht, wo man ist.
function _newsDayDate(when){
  const d = new Date(when);
  return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
}
function _newsDayKey(when){
  const d = new Date(when);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

// ─── §11.6 — Voller Feed (im Sheet) mit Filter-Pills ─────────────────
let _newsFeedFilter = 'all'; // 'all' | 'new' | cat-Key
function openNewsFeed(){
  _newsFeedFilter = 'all';
  _renderNewsFeed();
}
// ─── §11.6b — Breaking-Erkennung + M2-Karten (v9) ────────────────────
// „Breaking" ist eine ANZEIGE-Kategorie, kein Generator-Typ: ultra-seltene,
// liga-relevante Ereignisse werden display-seitig hierher promotet (wirkt auf
// bestehende UND neue persistierte Rows, ohne Regenerierung).
function _isBreaking(s){
  const d = (s && s.dataRef) || {};
  // Breaking heißt: das passiert vielleicht einmal im Monat. Erlaubt sind
  // ausschließlich extrem seltene Auszeichnungen und echte EREIGNISSE —
  // etwas, das vorher noch nie da war oder die Spitze der Liga verschiebt.
  // Gefallen sind `top_clash` (Platz 1 schlägt Platz 2 — kam allein in einem
  // Fenster von 33 Stories vor), `giant_slayer` (dafür gibt es die
  // Highlight-Karte) und `season_endgame`: „Noch 5 Tage" ist ein Countdown,
  // kein Ereignis, und es stand als einzige Breaking-Karte im Feed.
  switch(d.type){
    case 'lead_change':      // neuer Spitzenreiter der Liga
    case 'elo_record':       // neuer Allzeit-Elo-Rekord
    case 'streak_record':    // längste Siegesserie aller Zeiten
    case 'season_recap':     // der Meister steht fest
    case 'rekord_erstmals':  // ein Liga-Rekord wird zum ersten Mal vergeben
      return true;
    case 'badge_unlocked':   // nur legendäre Auszeichnungen
      return d.rarity === 'legendary';
    case 'insignium_stufe':  // nur Lorbeerreif und Ordensstern [§C30]
      return !!d.oben;
    default:
      return false;
  }
}
// Anzeige-Kategorie: Breaking überschreibt die echte cat NUR fürs Styling.
function _displayCat(s){ return _isBreaking(s) ? 'breaking' : ((s && s.cat) || 'fun'); }
// Wichtige Karten bekommen den farbigen Glow-Rahmen (nur solange ungelesen).
function _isImportant(s){
  const d = (s && s.dataRef) || {};
  return _isBreaking(s) || (s && s.cat === 'highlight') || d.rarity === 'legendary' || d.rarity === 'rare';
}

// ─── Wer kommt in der Geschichte vor? ────────────────────────────────
// Die Spieler-IDs liegen je nach Typ in verschiedenen Feldern — historisch
// gewachsen, und persistierte Rows aus alten Versionen tragen die alten
// Namen. Deshalb wird gesucht statt vorausgesetzt. Höchstens drei: mehr
// Gesichter nebeneinander erkennt auf einer Karte niemand mehr.
function _newsPids(s){
  const d = (s && s.dataRef) || {};
  const raus = [];
  const dazu = v => {
    (Array.isArray(v) ? v : [v]).forEach(id => {
      if(typeof id === 'string' && id.length > 8 && raus.indexOf(id) < 0 && pmap()[id]) raus.push(id);
    });
  };
  ['playerId','ambientPid','pid','championId','a','b','playerIds','ambientPids',
   'breakerIds','victimPid'].forEach(k => { if(d[k] != null) dazu(d[k]); });
  return raus.slice(0, 3);
}

// Das Gesicht links auf der Karte. Vorher stand dort nichts: die News waren
// die einzige Ansicht der App, in der ein Spieler nur ein Name war. Ein
// Spieler bekommt sein Wappen [§C27], ein Duo zwei überlappende Chips —
// ein Duo hat keinen Rang und also auch kein Wappen. Steht niemand in der
// Geschichte (Saisonstart, spielfreie Tage), bleibt die Spalte weg.
function _newsGesichtHtml(s){
  const ids = _newsPids(s);
  if(!ids.length) return '';
  if(ids.length === 1){
    const p = pmap()[ids[0]];
    // Kein Feuer: eine Meldung von vorgestern hat keine laufende Serie [§C26].
    return `<div class="nf-face">${avHtml(p, '', {ins:true, px:48, feuer:0})}</div>`;
  }
  return `<div class="nf-face nf-face-paar">${
    ids.slice(0,2).map(id => avHtml(pmap()[id], '', {})).join('')}${
    ids.length > 2 ? `<span class="av nf-face-mehr">+${ids.length-2}</span>` : ''}</div>`;
}

// Das Mini-Visual rechts auf der Karte ist entfallen. Es zeigte je Typ ein
// Symbol oder eine Zahl an derselben Stelle, egal worum es ging — die Sorte
// war daran nicht zu erkennen. Diese Aufgabe tragen jetzt die acht
// Bauformen: das Ergebnisband, der große Wert, die Leiter, das Zahlenband.

function _newsUhrzeit(when){
  return new Date(when).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
}

// Rot ist eine Richtung, keine Rubrik [§C25]. Karte und Detailblatt nutzen
// dieselbe Ableitung, damit eine Durststrecke beim Öffnen nicht wieder den
// grünen Schimmer einer positiven Serie annimmt.
function _newsIstNegativ(s){
  const d = (s && s.dataRef) || {};
  return /loss|dry_spell/.test(d.type || '') || d.rarity === 'negative';
}

function _newsCardHtmlM2(s, isRead, istTagesKarte){
  const dcat = _displayCat(s);
  const meta = NEWS_CATEGORIES[dcat] || NEWS_CATEGORIES.fun;
  const d = s.dataRef || {};
  const sorte = _newsSorte(s);
  const brk = _isBreaking(s);
  const imp = (_isImportant(s) && !isRead) ? ' important' : '';
  // Die Karte des Tages steht groß, mit einem Streifen darüber. Vorher stand
  // ihre Schlagzeile im Tageskopf und gleich darunter noch einmal auf der
  // Karte selbst.
  const gross = istTagesKarte && !brk;
  // Breaking sprang bisher als Hero an den Kopf des Feeds und damit aus der
  // Chronologie. Es bleibt jetzt an seinem Platz und trägt stattdessen einen
  // roten Kopfbalken mit Punkt und Zeitstempel [§11.6b].
  const balken = brk
    ? `<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING`
      + `<span class="nf-brk-zeit">${esc(_newsWhenLabel(s.when))}</span></div>`
    : '';
  // Eine Sammelkarte hat einen eigenen Gruppenkopf. Darunter stehen ALLE
  // zwei bis vier Einzelereignisse im Band; keines wird zum heimlichen Kopf
  // und keines hinter „weitere" versteckt [§C33].
  const sammelBand = (d.type === 'sammel')
    ? _newsSammelBand(d.teile, [s.title], true) : '';

  // ── Je Sorte ein eigener Kopf und ein eigener Fuß ──────────────────
  // Vorher unterschied die Sorten nur eine Randfarbe, und zehn Karten
  // untereinander sahen alle gleich aus.
  let kopf = '', fuss = '', gesicht = '';
  const pm = pmap();
  // 48 px ist die Untergrenze fuer ein Wappen [§6]; darunter gibt `insAvWrap`
  // nur den Avatar zurueck, und die Karte verloere ihr Gesicht [§C33].
  const av = (pid, px) => (pm[pid] ? avHtml(pm[pid], '', {ins:true, px:px||48, feuer:0}) : '');

  if(sorte === 'spiel'){
    kopf = _newsErgebnisBand(d.matchId);
    fuss = _newsZahlband(_newsSpielZahlen(s));
  } else if(sorte === 'tafel'){
    const w = _newsTafelWert(s);
    gesicht = `<div class="nf-gr-l">${w ? _newsWertBlock(w.v, w.l, 'gold') : _newsGesichtHtml(s)}</div>`;
  } else if(sorte === 'ins'){
    gesicht = `<div class="nf-gr-l">${av(d.pid, 48)}</div>`;
    fuss = _newsLeiter(d.pid);
  } else if(sorte === 'held'){
    const pid = d.playerId || (Array.isArray(d.playerIds) ? d.playerIds[0] : null);
    gesicht = `<div class="nf-gr-l">${av(pid, 52)}</div>`;
    fuss = _newsZahlband([
      {v: d.wr != null ? Math.round(d.wr * 100) + ' %' : null, l:'Siegquote', f:'g'},
      {v: (d.wins != null && d.games != null) ? d.wins + ' : ' + (d.games - d.wins) : null,
       l:'Siege zu Niederlagen'},
      {v: _newsRangKurz(pid), l:'in der Gesamtliga'}
    ]);
  } else if(sorte === 'spieler'){
    // Ein Gesicht, gross: die Karte handelt von genau einem Spieler. Dazu
    // die Zahl der Erfolge und sein Platz in der Gesamtliga — die Zahl steht
    // nicht im Satz, der gehoert dem staerksten Erfolg.
    const pid = (Array.isArray(d.playerIds) ? d.playerIds[0] : null) || d.pid;
    gesicht = `<div class="nf-gr-l">${av(pid, 52)}</div>`;
    fuss = _newsZahlband([
      {v: (Array.isArray(d.teile) ? d.teile.length : 0) || null, l:'Erfolge im selben Moment', f:'g'},
      {v: _newsRangKurz(pid), l:'in der Gesamtliga'}
    ]);
  } else if(sorte === 'erfolg'){
    // Hier ist der Erfolg das Subjekt, also stehen die Gesichter als Chips
    // nebeneinander [§C33] — keins von ihnen ist wichtiger als das andere.
    // Und wo der Erfolg ein ZEICHEN ist, steht das Zeichen dabei. „Vier
    // Spieler tragen jetzt den Schildring" zeigte den Schildring kein
    // einziges Mal: daneben stand ein Pokal aus dem Icon-Katalog, und die
    // Karte handelte von einer Zeichnung, die sie nicht zeigt. Die App hat
    // das Bauteil [§C27] — `insigniumStufeSvg` traegt seine Verlaeufe selbst
    // und funktioniert deshalb auch hier [§C30].
    gesicht = `<div class="nf-gr-l">${_newsErfolgZeichen(s)}${_newsGesichtHtml(s)}</div>`;
    fuss = _newsZahlband([
      {v: (Array.isArray(d.teile) ? d.teile.length : 0) || null, l:'Spieler zugleich', f:'g'}
    ]);
  } else if(sorte === 'woche'){
    // Alle sechs Wertungen, nicht drei und eine Zeile „und 3 weitere". Die
    // Wochenkarte gibt es einmal je Woche, und sie IST die Uebersicht: wer
    // sie ueberflog, sah die Ueberraschung, den Krimi und das Team der Woche
    // gar nicht, obwohl die Karte fuer nichts anderes da ist.
    const teile = Array.isArray(d.teile) ? d.teile : [];
    fuss = `<div class="nf-wl">${teile.map(t =>
      `<div class="nf-wl-z"><span>${esc(t.label || '')}</span>`
      + `<i>${esc(_namenKurz((t.pids || []).map(p => (pm[p] || {}).name || '').filter(Boolean), 2))}</i>`
      + `<b>${esc(t.wert || '')}</b></div>`).join('')}</div>`;
  } else if(sorte === 'duell'){
    // Eine Rivalitaet lebt vom Verhaeltnis. Die beiden Wappen standen
    // uebereinander in der linken Spalte und machten die Karte 56 Pixel
    // hoeher als ihr einzeiliger Satz — daneben war nichts. Sie stehen
    // jetzt als BAND ueber dem Text, einander gegenueber wie im
    // Ergebnisband des Spieltags [§C27].
    kopf = `<div class="nf-duell-band">${av(d.a, 34)}`
      + `<span class="nf-duell-vs"><b>${esc(String(d.n || ''))}</b><i>Duelle</i></span>`
      + `${av(d.b, 34)}</div>`;
    let h = null; try { h = _newsH2HRecord(d.a, d.b); } catch(e){}
    fuss = (h && (h.aWins + h.bWins))
      ? _newsBilanzBalken(d.a, d.b, h.aWins, h.bWins) : '';
  } else if(sorte === 'serie'){
    // Eine Serie lebt von der Laenge. Der Lauf steht im Fuss, das Gesicht
    // links — einer oder zwei, je nachdem wem die Serie gehoert.
    const verloren = String(d.type || '').indexOf('loss') >= 0;
    gesicht = d.a && d.b
      ? `<div class="nf-gr-l nf-duo">${av(d.a, 38)}${av(d.b, 38)}</div>`
      : `<div class="nf-gr-l">${av(d.pid || d.playerId, 48)}</div>`;
    fuss = _newsSerienBand(d.streak, verloren);
  } else if(sorte === 'badge'){
    gesicht = `<div class="nf-gr-l">${av(d.playerId, 48)}</div>`;
    // Der Name der Auszeichnung steht schon in der Schlagzeile. Im Fuss stand
    // er ein zweites Mal darunter — jetzt steht dort, was die Schlagzeile
    // nicht sagt: wie selten sie ist und wie viele sie tragen.
    fuss = `<div class="nf-bd"><span class="nf-bd-ic nf-bd-${esc(d.rarity || 'common')}">${svgI(s.ic || 'trophyStar')}</span>`
         + `<span class="nf-bd-t"><b>${esc(_newsRarityLabel(d.rarity))}</b>`
         + `<i>${esc(_newsBadgeHalterText(d.badgeId))}</i></span></div>`;
  } else if(sorte === 'marke'){
    // Ein einzelner Wert stand als eigener Streifen im Fuss und fuellte dort
    // eine ganze Zeile mit zwei Woertern. Er gehoert neben das Wappen: dort
    // fuellt er die Bildzone, statt die Karte um einen leeren Streifen
    // hoeher zu machen.
    const wert = d.delta != null ? (d.delta > 0 ? '+' + d.delta : String(d.delta))
               : (d.streak != null ? String(d.streak) : (d.milestone || null));
    const label = d.delta != null ? 'Elo' : (d.streak != null ? 'in Folge' : 'erreicht');
    gesicht = `<div class="nf-gr-l">${av(d.pid, 48)}`
      + (wert ? _newsWertBlock(wert, label, d.delta < 0 ? 'rot' : 'metall') : '') + `</div>`;
  } else {
    // Fun Fact: die Zahl links, der Satz rechts. Bewusst der leiseste Bau.
    if(d.vv != null && d.vv !== '') gesicht = `<div class="nf-gr-l">${_newsWertBlock(d.vv, d.vl, 'metall')}</div>`;
    else gesicht = `<div class="nf-gr-l">${_newsGesichtHtml(s)}</div>`;
  }
  // Das Duell traegt seine Wappen im Band ueber dem Text; die Ersatzgesichter
  // haetten sie ein zweites Mal daneben gestellt.
  if(!gesicht && sorte !== 'spiel' && sorte !== 'woche' && sorte !== 'duell'){
    const g = _newsGesichtHtml(s);
    if(g) gesicht = `<div class="nf-gr-l">${g}</div>`;
  }

  // Das Motiv liegt hinter allem, der Chevron sagt, dass die Karte sich
  // oeffnet. Ohne ihn sah eine Karte wie ein Aushang aus, und der halbe Feed
  // wurde nie angetippt.
  // Rot ist die Richtung [§C25]: eine Karte, die von einer Pleitenserie oder
  // einer Schande erzaehlt, traegt es in Rubrik und Motiv. Die Durststrecke
  // stand vorher im selben Gruen wie die Siegesserie.
  const negativ = _newsIstNegativ(s);
  return `<div class="nf-card nf-s-${sorte} nfc-${dcat}${negativ?' nf-neg':''}${brk?' nf-brk':''}${gross?' nf-gross':''}${isRead?' read':''}${imp}" data-sid="${esc(s.id)}">
    ${_newsMotiv(sorte, s)}
    ${gross ? '<div class="nf-gross-band">' + svgI('star') + 'DIE KARTE DES TAGES</div>' : ''}
    ${balken}
    <div class="nf-top">
      <span class="nf-rub"><i>${svgI(_newsSorteIcon(sorte, s))}</i><b>${esc(_newsRubrik(sorte, s))}</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead?'':'<span class="nf-dot"></span>'}</span>
    </div>
    ${kopf}
    <div class="nf-gr${gesicht?' mit-l':''}">
      ${gesicht}
      <div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div><div class="nf-d">${_newsBetont(s.desc)}</div></div>
      <span class="nf-chev">${svgI('chevron')}</span>
    </div>
    ${sammelBand}
    ${fuss}
    ${brk ? `<div class="nf-brk-sub">${esc(_breakingHeroText(s))}</div>` : ''}
  </div>`;
}

// Die Rubrik ueber der Karte, wie in einer Zeitung. Sie sagt, aus welchem
// Teil der Liga die Nachricht kommt, und ist an der Sorte ablesbar — die
// elf Kategorien der Datenbank waren eine Sortierhilfe fuer den, der sie
// gebaut hat, und standen als „Badge & Awards" ueber einer Auszeichnung.
function _newsRubrik(sorte, s){
  const d = (s && s.dataRef) || {};
  if(_isBreaking(s)) return 'BREAKING';
  switch(sorte){
    case 'spiel':  return 'AM SPIELTAG';
    case 'tafel':  return 'EWIGE TAFEL';
    case 'ins':    return 'DAS ZEICHEN';
    case 'held':   return d.type === 'potw' ? 'SPIELER DER WOCHE' : 'SPIELER DES TAGES';
    case 'woche':  return 'DIE WOCHE';
    case 'duell':  return 'DAS DUELL';
    case 'serie':  return d.type === 'team_loss_streak' || d.type === 'loss_streak'
                        ? 'DIE DURSTSTRECKE' : 'DIE SERIE';
    case 'badge':  return 'AUSZEICHNUNG';
    case 'marke':  return 'BESTMARKE';
    // Was diese beiden Karten sind, sagt die Rubrik: einmal ein Spieler, der
    // in einem Moment mehreres holt, einmal ein Erfolg, den mehrere zugleich
    // erreichen.
    case 'spieler':return 'ALLES AUF EINMAL';
    case 'erfolg': return 'GEMEINSAM GEHOLT';
    default:       return 'LIGA IN ZAHLEN';
  }
}

// Ein Zeichen je Sorte. Es steht immer an derselben Stelle und ist damit die
// zweite Ablesehilfe neben der Bauform.
function _newsSorteIcon(sorte, s){
  if(_isBreaking(s)) return 'bolt';
  switch(sorte){
    // Der Spieltag trug gekreuzte Klingen, das Duell trägt Klingen — als
    // Motiv nebeneinander war das dieselbe Zeichnung in zwei Größen.
    case 'spiel':  return 'ball';
    case 'tafel':  return 'trophyStar';
    case 'ins':    return 'shieldStar';
    case 'held':   return 'crown';
    case 'woche':  return 'calendar';
    case 'duell':  return 'swords';
    case 'serie':  return (s && (s.dataRef||{}).type || '').indexOf('loss') >= 0
                        ? 'trendDown' : 'flame';
    case 'badge':  return 'medal';
    case 'marke':  return 'chartUp';
    // Drei Pokale fuer den, der mehreres auf einmal holt; zwei Gestalten fuer
    // den Erfolg, den mehrere teilen. Keine der beiden Zeichnungen steht
    // schon an einer anderen Rubrik [§C27].
    case 'spieler':return 'tripleCup';
    case 'erfolg': return 'users';
    default:       return 'chartBar';
  }
}

// ── Fette Akzente ───────────────────────────────────────────────────
// Der Kartentext trug alles in derselben Stärke, und das Auge fand darin
// weder das Ergebnis noch den Namen. Betont wird genau dreierlei: das
// Ergebnis einer Partie, jede Zahl mit ihrer Einheit und die Namen der
// Liga. Mehr wäre wieder gleich laut.
//
// Es ist eine Ableitung aus dem Text, keine Änderung an ihm — genau wie
// `_isBreaking` und `_displayCat` [§C33]. Persistierte Karten gewinnen sie
// deshalb ohne Umschreiben mit.
function _newsBetont(txt){
  let t = esc(String(txt == null ? '' : txt));
  // Ergebnisse und Daten zuerst: „10:5" darf nicht als zwei einzelne Zahlen
  // zerfallen, und „24.08." verlor sonst seinen Schlusspunkt aus dem Fettdruck.
  t = t.replace(/\b(\d{1,2}\s?:\s?\d{1,2})\b/g, '<b>$1</b>');
  t = t.replace(/\b(\d{1,2}\.\d{1,2}\.?)(?!\d)/g, '<b>$1</b>');
  // Dann Zahlen mit Einheit und alleinstehende Zahlen, aber nicht die schon
  // ausgezeichneten und nicht die in einem Datum.
  t = t.replace(/(^|[^\d>.,])(\d+(?:[.,]\d+)?\s?%?)(?![\d<]|\.\d)/g,
    (m, vor, z) => vor + '<b>' + z + '</b>');
  try {
    const namen = Object.keys(pmap()).map(id => pmap()[id].name)
      .filter(Boolean).sort((a, b) => b.length - a.length);
    namen.forEach(n => {
      const e = esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('(^|[^\\w>])(' + e + ')(?![\\w<])', 'g'), '$1<b>$2</b>');
    });
  } catch(e){}
  return t;
}

// ── Das Motiv ────────────────────────────────────────────────────────
// Dasselbe Zeichen wie im Rubrikband, nur groß und sehr leise am rechten
// Rand. Es färbt die Karte, ohne ein zweites Zeichen für dieselbe Aussage
// einzuführen [§C27]. Vorher waren zehn Karten untereinander zehn gleich
// große dunkle Rechtecke, und die Sorte stand allein in neun Punkt Schrift
// darüber.
function _newsMotiv(sorte, s){
  return `<span class="nf-motiv" aria-hidden="true">${svgI(_newsSorteIcon(sorte, s))}</span>`;
}

// ── Der Bilanzbalken ─────────────────────────────────────────────────
// Das Kräfteverhältnis zweier Spieler als geteilter Streifen. „Leon führt
// mit 116:72" ist eine Zahl, die man erst lesen und dann verrechnen muss;
// der Balken zeigt sie vorher.
function _newsBilanzBalken(aPid, bPid, aW, bW){
  const g = (aW || 0) + (bW || 0);
  if(!g) return '';
  const pm = pmap();
  const nm = id => (pm[id] && pm[id].name) || '?';
  const pa = Math.round(aW / g * 100);
  return `<div class="nf-bil">
    <div class="nf-bil-b"><i style="width:${pa}%"></i></div>
    <div class="nf-bil-z"><span><b>${aW}</b> ${esc(nm(aPid))}</span>
      <span>${esc(nm(bPid))} <b>${bW}</b></span></div>
  </div>`;
}

// ── Der Serienlauf ───────────────────────────────────────────────────
// Die Partien einer Serie als Punkte. „7 Siege" ist eine Zahl, die Reihe
// zeigt, wie lang sieben sind. Ab zwölf Punkten steht der Rest als Ziffer:
// eine Reihe, die über die Karte hinausläuft, sagt nichts mehr.
function _newsSerienBand(laenge, verloren){
  const n = Math.max(0, Number(laenge) || 0);
  if(!n) return '';
  const zeige = Math.min(n, 12);
  // Rechts steht, was die Punkte zaehlen. Ohne die Angabe war die halbe
  // Bandbreite leer, und die Reihe sagte nicht, ob sie Siege oder Pleiten
  // meint.
  return `<div class="nf-ser${verloren ? ' r' : ''}">`
    + Array.from({length: zeige}, () => '<i></i>').join('')
    + (n > zeige ? `<em>+${n - zeige}</em>` : '')
    + `<span>${n} ${verloren ? 'Pleiten' : 'Siege'} nacheinander</span></div>`;
}

// ── Das Sammelband ──────────────────────────────────────────────────
// Eine Sammelkarte trug die Schlagzeile ihres staerksten Ereignisses und
// sonst nichts: „Maxi: Nerven aus Stahl" stand erst im Blatt, und wer die
// Karte nur ueberflog, hat es nie gesehen. Buendeln darf nichts verstecken
// [§C33] — jede weitere Zeile steht deshalb mit ihrem Zeichen auf der Karte
// selbst, kurz und in einer Reihe.
//
// Der Gruppentitel wird vorsichtshalber herausgefiltert; aktuelle Karten
// bauen ihn eigens, sodass regulaer jede Einzelzeile im Band bleibt.
function _newsSammelBand(teile, kopfTitel, vollstaendig){
  const alle = Array.isArray(teile) ? teile : [];
  // Alte persistierte Karten koennen noch einen Gruppentitel als Zeile
  // enthalten; nur diese echte Doppelung faellt heraus.
  const kt = (Array.isArray(kopfTitel) ? kopfTitel : [kopfTitel])
    .map(x => String(x || '').trim()).filter(Boolean);
  const rest = alle.filter(t => kt.indexOf(String(t.titel || '').trim()) < 0);
  if(!rest.length) return '';
  // Drei Zeilen und dahinter die Zahl — ausser auf den beiden Karten, die
  // eine Sache vollstaendig zeigen sollen: dort waere „und 2 weitere" genau
  // das Verstecken, gegen das die Buendelung gebaut ist.
  const grenze = vollstaendig ? rest.length : 3;
  // Die Marke sagt in zwei Worten, welche Zeile in der Monatstafel landet
  // [§C32] — Metall, sie zeichnet niemanden aus [§C25].
  return `<div class="nf-sam">${rest.slice(0, grenze).map(t =>
    `<div class="nf-sam-z"><i class="nf-sam-i">${svgI(t.ic || 'chartBar')}</i>`
    + `<span>${_newsBetont(t.titel || '')}</span>`
    + (t.marke ? `<b class="nf-sam-k">${esc(t.marke)}</b>` : '')
    + `</div>`).join('')}`
    + (rest.length > grenze ? `<div class="nf-sam-m">und ${rest.length - grenze} weitere</div>` : '')
    + `</div>`;
}

// Die Zahlen einer Spieltags-Karte. Sie stehen im Fuß, damit der Satz sie
// nicht wiederholen muss.
function _newsSpielZahlen(s){
  const d = s.dataRef || {};
  const out = [];
  if(d.streak) out.push({v: d.streak, l:'Siege, jetzt beendet', f:'g'});
  if(d.gap) out.push({v: 'Platz ' + (d.winnerRank || d.gap), l:'schlägt Platz ' + (d.loserRank || '')});
  if(d.chance != null) out.push({v: Math.max(1, Math.round(d.chance*100)) + ' %', l:'Siegchance vorher'});
  // Die Tordifferenz steht NICHT im Band: das Ergebnisband darüber zeigt
  // beide Zahlen, und „4 Tore Unterschied" unter einem 6:10 rechnet dem
  // Leser vor, was er gerade gelesen hat.
  return out;
}

// Der große Wert einer Tafel-Karte. Ein Rekord lebt von seiner Zahl, nicht
// vom Satz darüber.
function _newsTafelWert(s){
  const d = s.dataRef || {};
  // Bei einer Chronik ist das Prestige die Aussage: der Beleg steht im Satz,
  // die Klasse dahinter, und was sie WERT ist, sagt sonst nichts auf der
  // Karte. Die erste Zahl des Belegs waere „4 von 5" gewesen — richtig, aber
  // ohne Bezug.
  if(d.type === 'chronik_geholt') return {v: '+' + (d.punkte || 0), l:'Prestige'};
  if(d.eintraege != null) return {v: d.eintraege, l:'Einträge'};
  if(d.teile && d.teile.length) return {v: d.teile.length, l:'Wechsel'};
  // „Bestwert" war geraten. Die Zahl kommt aus einem Regex ueber den
  // Fliesstext, und bei „Der Wandler" stand damit „0 %" unter der
  // Aufschrift BESTWERT — der Wert ist dort ein UNTERSCHIED zwischen zwei
  // Positionen, und je kleiner er ist, desto besser. Ein Bestwert von null
  // liest sich wie ein Fehler.
  //
  // Wie die Zahl heisst, weiss der Katalog: die Kammer sagt, was ein
  // Eintrag ueberhaupt ist [§C35]. Ein Liga-Rekord ist ein Bestwert, eine
  // Fuegung nicht, und eine Schattenseite schon gar nicht.
  const m = String(s.desc || '').match(/(\d+[.,]?\d*\s?%|\d+)/);
  if(!m) return null;
  let label = 'Bestwert';
  try {
    const def = d.rekordId && CHRONICLE_BY_ID[d.rekordId];
    const k = def && CHRON_KINDS[def.kind];
    if(k) label = k.label;
  } catch(e){}
  return {v: m[1], l: label};
}

// Der Rang eines Spielers als kurze Angabe fürs Zahlenband.
// Der Platz in der GESAMT-Rangliste — dieselbe Quelle wie der Zeitraum
// „Gesamt" im Liga-Tab (`careerElo` aus getGlobalSim), also dieselbe Zahl,
// die dort über dem Namen steht [§C27]. Das ist NICHT der Platz in der
// laufenden Saison: wer über die ganze Ligageschichte Siebter ist, kann
// diesen Monat Zweiter sein, und „Rang 7 in der Liga" behauptete auf einer
// Karte über einen guten Spieltag genau das Gegenteil von dem, was gerade
// passiert war.
//
// EINE Stelle rechnet das. Die Zeile im Blatt rechnete es ein zweites Mal
// nach, und zwei Rechnungen über dieselbe Frage laufen irgendwann
// auseinander [§C27].
function _newsGesamtrang(pid){
  try {
    const career = (getGlobalSim() || {}).careerElo || {};
    const ids = Object.keys(career).filter(id => pmap()[id] && !pmap()[id].hidden);
    ids.sort((a, b) => (career[b] ?? 0) - (career[a] ?? 0));
    return ids.indexOf(pid) + 1;
  } catch(e){ return 0; }
}
function _newsRangKurz(pid){
  const r = _newsGesamtrang(pid);
  return r > 0 ? 'Rang ' + r : null;
}

// Wie selten die Auszeichnung ist, in Worten. Vier Klassen, nicht drei: die
// Schande fiel vorher durch und stand als „Negative" im Blatt.
function _newsRarityLabel(r){
  return r === 'legendary' ? 'Legendär' : r === 'rare' ? 'Selten'
       : r === 'negative' ? 'Schande' : 'Gewöhnlich';
}

// Wie viele der Liga diese Auszeichnung tragen. Das ist die Gegenprobe zur
// Klasse [§C34] und die Zahl, die eine Auszeichnung belohnend macht: „einer
// von zwölf" sagt mehr als „Legendär".
function _newsBadgeHalterText(badgeId){
  if(!badgeId) return '';
  try {
    const ids = Object.keys(pmap()).filter(id => !pmap()[id].hidden);
    const n = ids.filter(id => (getCachedBadges(id) || []).some(b => b.id === badgeId)).length;
    if(!n) return '';
    return n === 1 ? 'als Einziger in der Liga' : `${n} von ${ids.length} tragen sie`;
  } catch(e){ return ''; }
}

// Zwölf Sorten, zwölf Bauformen. Eine Karte soll man an der FORM erkennen,
// bevor man den ersten Satz gelesen hat. Vorher unterschied die Sorten nur
// eine Randfarbe, und zehn Karten untereinander sahen alle gleich aus. Die
// ruhigen Farbfamilien im CSS sind die zweite Orientierung, nicht die Form.
function _newsSorte(s){
  const d = (s && s.dataRef) || {};
  const t = d.type || '';
  if(t === 'woche') return 'woche';                       // Zeilen der Wertungen
  if(t === 'insignium_stufe') return 'ins';               // die Leiter
  if(t === 'ambient') return 'fakt';                      // leise, eine Zahl
  if(t === 'potd' || t === 'potw') return 'held';         // Wappen groß, Zahlenband
  if(t === 'badge_unlocked') return 'badge';              // das Zeichen der Auszeichnung
  if(t === 'sammel'){
    // Zwei eigene Formen fuer die beiden zusammenfuehrenden Karten. Sie sahen
    // als Tafel- oder Spieltagskarte aus wie die Meldung, von der sie eine
    // von mehreren buendeln — und die eine handelt von EINEM Spieler, die
    // andere von EINEM Erfolg. Das ist vor dem ersten Satz zu sehen [§C27].
    if(d.quelle === 'spieler') return 'spieler';
    if(d.quelle === 'erfolg')  return 'erfolg';
    return d.quelle === 'tafel' ? 'tafel' : 'spiel';
  }
  if((s && s.cat) === 'tafel' || t.indexOf('rekord_') === 0 || t.indexOf('chronik_') === 0) return 'tafel';
  // Rivalitaet, Serie und Duo sind drei verschiedene Aussagen und sahen als
  // eine Sorte gleich aus: an einem Spieltag standen drei Karten „ZU ZWEIT"
  // untereinander, die von drei verschiedenen Dingen erzaehlten.
  if(t === 'rivalry' || t === 'rivalry_milestone') return 'duell';
  if(t === 'team_streak' || t === 'team_loss_streak'
     || t === 'win_streak' || t === 'loss_streak') return 'serie';
  if(d.matchId) return 'spiel';                           // Ergebnisband
  if(d.pid) return 'marke';                               // ein Wappen, ein Wert
  return 'fakt';
}

// Das Ergebnisband: vier Wappen und der Endstand über der Schlagzeile. Wer
// nur scrollt, sieht schon, wer gegen wen gespielt hat und wie es ausging.
function _newsErgebnisBand(matchId){
  if(!matchId) return '';
  const m = (matches || []).find(x => x.id === matchId);
  if(!m) return '';
  const pm = pmap();
  const wappen = ids => ids.filter(id => pm[id])
    .map(id => avHtml(pm[id], '', {ins:true, px:30, feuer:0})).join('');
  const aWin = m.winner === 'A';
  return `<div class="nf-erg">
    <div class="nf-erg-s">${wappen([m.a1, m.a2])}</div>
    <div class="nf-erg-sc"><b class="${aWin?'w':'v'}">${m.score_a}</b>`
    + `<i>:</i><b class="${aWin?'v':'w'}">${m.score_b}</b></div>
    <div class="nf-erg-s re">${wappen([m.b1, m.b2])}</div>
  </div>`;
}

// Der große Wert links, daneben wofür er steht. Bei einem Rekord ist die Zahl
// die Hauptsache, nicht der Satz darüber.
function _newsWertBlock(wert, label, farbe){
  if(!wert) return '';
  return `<div class="nf-wert ${farbe || ''}"><b>${esc(String(wert))}</b>`
       + (label ? `<span>${esc(label)}</span>` : '') + `</div>`;
}

// Die Insignium-Leiter: fünf Punkte, die erreichten hell, der neue umrandet.
// Damit sieht man auf einen Blick, wo jemand steht und wie weit es noch ist.
// Das Zeichen, um das eine Erfolgs-Karte geht. Nur dort, wo der Erfolg
// ueberhaupt eines HAT: eine Insignium-Stufe hat eins, ein Jubilaeum nicht.
function _newsErfolgZeichen(s){
  const d = (s && s.dataRef) || {};
  if(d.kopfTyp !== 'insignium_stufe') return '';
  const stufe = INSIGNIEN[d.stufe | 0];
  if(!stufe) return '';
  const pid = (Array.isArray(d.playerIds) ? d.playerIds[0] : null);
  let z = '';
  try {
    z = insigniumStufeSvg(stufe.key, (getPlayerRank(pid) || {}).label, 0, 0) || '';
  } catch(e){ z = ''; }
  return z ? `<span class="nf-erf-z">${z}</span>` : '';
}

function _newsLeiter(pid){
  try {
    const P = prestigeOf(pid);
    if(!P) return '';
    const stufe = P.stufe || 0;
    // Die ECHTEN fünf Zeichen, nicht fünf gefärbte Punkte. Vorher stand hier
    // ein CSS-Kreis je Stufe (`repeating-conic-gradient`), und der hatte mit
    // dem Zeichen, das ein Spieler trägt, nichts zu tun: fünf Rosetten in
    // fünf Farben, wo Reif, Schildring, Volutenkranz, Lorbeerreif und
    // Ordensstern stehen müssten. `insigniumStufeSvg` trägt seine Verläufe
    // selbst [§C30] und funktioniert deshalb auch im Blatt.
    // Der Grad ist der eigene nur an der eigenen Stufe; die übrigen stehen
    // im ersten Grad, sonst behauptete die Leiter einen Ausbau, den es an
    // dieser Stufe nie gab.
    const rangLabel = (getPlayerRank(pid) || {}).label;
    const punkte = INSIGNIEN.map((ins, i) => {
      let z = '';
      try { z = insigniumStufeSvg(ins.key, rangLabel,
                  i === stufe ? (P.zacken || 0) : 0,
                  i === stufe ? (P.grad || 0) : 0) || ''; } catch(e){ z = ''; }
      return `<span class="nf-lt-p${i <= stufe ? ' hat' : ''}${i === stufe ? ' jetzt' : ''}">${z}</span>`;
    }).join('');
    const rest = P.naechste ? `${P.punkte} / ${P.naechste.min}` : `${P.punkte}`;
    return `<div class="nf-leiter">${punkte}<span class="nf-lt-t">${esc(rest)}</span></div>`;
  } catch(e){ return ''; }
}

// Das Zahlenband im Fuß: bis zu drei Werte mit ihrer Bezeichnung. Es steht
// dort, wo die Karte sonst aufhört, und trägt das, was der Satz nicht sagen
// muss.
function _newsZahlband(werte){
  const w = (werte || []).filter(x => x && x.v != null && x.v !== '');
  if(!w.length) return '';
  return `<div class="nf-zb">${w.slice(0, 3).map(x =>
    `<div><b class="${x.f || ''}">${esc(String(x.v))}</b><span>${esc(x.l || '')}</span></div>`).join('')}</div>`;
}

// Breaking-Hero — das Herzstück oben im Sheet, bewusst dramatisch.
// v9.1: etwas längerer, spannenderer Hero-Text je Breaking-Typ — display-seitig
// aus dataRef gebaut (wirkt auch auf bereits persistierte Rows). Bewusst 1–2
// Sätze: soll neugierig machen, aber nicht von den Stories darunter ablenken.
// Fällt auf s.desc zurück, wenn die Datenlage nicht reicht.
function _breakingHeroText(s){
  const d = (s && s.dataRef) || {};
  const pm = (typeof pmap === 'function') ? pmap() : {};
  const nm = id => (pm[id] && pm[id].name) || '?';
  try {
    switch(d.type){
      case 'season_recap': {
        const te = Array.isArray(d.topElo) ? d.topElo : [];
        const champ = nm(d.championId || (te[0] && te[0].id));
        const runner = te[1] && te[1].id ? nm(te[1].id) : null;
        const elo = d.championElo != null ? d.championElo : (te[0] && te[0].elo);
        return `Die Saison ${d.sid || ''} ist Geschichte: ${champ} krönt sich mit ${elo} Elo zum Champion`
          + (runner ? `. Vor ${runner}.` : '.')
          + ` Wer stürzt ${champ} in der neuen Saison vom Thron?`;
      }
      case 'lead_change':
        return `Machtwechsel an der Tabellenspitze: ${nm(d.newLeader)} verdrängt ${nm(d.prevLeader)} und übernimmt die Führung. Das Titelrennen ist wieder völlig offen.`;
      case 'top_clash': {
        // p1/p2 (v9.3): Platz-1- bzw. Platz-2-Spieler namentlich. Fallback auf
        // Sieger-Team für alte, vor v9.3 persistierte Stories.
        const a = d.p1 ? nm(d.p1) : (Array.isArray(d.winners) ? d.winners.map(nm).join(' & ') : '');
        const b = d.p2 ? nm(d.p2) : null;
        return b
          ? `Gipfeltreffen an der Spitze: Tabellenführer ${a} bezwingt Verfolger ${b} im direkten Duell und baut den Vorsprung an der Spitze aus.`
          : `Gipfeltreffen an der Spitze: ${a} setzt sich im Spitzenspiel durch und zieht weiter davon.`;
      }
      case 'season_endgame': {
        const leader = d.leader && d.leader.pid ? nm(d.leader.pid) : '';
        const dl = d.daysLeft;
        const dtxt = dl != null ? `Nur noch ${dl} ${dl === 1 ? 'Tag' : 'Tage'} bis zum Saisonende` : 'Der Saison-Endspurt läuft';
        return `${dtxt}: ${leader} führt`
          + (d.gap != null ? `, doch der Vorsprung von ${d.gap} Elo ist alles andere als sicher.` : '.')
          + ' Jetzt zählt jedes Spiel.';
      }
      case 'badge_unlocked':
        return `${nm(d.playerId)} schnappt sich mit „${d.badgeName || s.title}" eine der seltensten Auszeichnungen der Liga. Das gelingt fast niemandem.`;
      case 'elo_record':
        return `${nm(d.pid)} schreibt Liga-Geschichte: Mit ${d.elo} Elo steht kein Spieler jemals höher. Eine neue Bestmarke für die Ewigkeit. Wer traut sich, sie anzugreifen?`;
      case 'streak_record':
        return `${nm(d.pid)} stellt einen Liga-Rekord für die Ewigkeit auf: ${d.streak} Siege in Folge. Keine Serie war jemals länger. Wer stoppt diesen Lauf?`;
      case 'giant_slayer': {
        const w = Array.isArray(d.winners) ? d.winners.map(nm).join(' & ') : '';
        const l = Array.isArray(d.losers) ? d.losers.map(nm).join(' & ') : 'den Favoriten';
        const pct = d.chance!=null ? Math.max(1, Math.round(d.chance*100)) : null;
        return `Die Sensation des Spieltags: Mit nur ${pct!=null?pct+'%':'minimaler'} Siegchance bezwingt ${w} das Favoriten-Team ${l}. So einen Coup sieht man in der Liga fast nie.`;
      }
    }
  } catch(e){}
  return s.desc || '';
}
// Der Tageskopf trug zuerst die Schlagzeile der wichtigsten Karte — und die
// stand damit zweimal untereinander, im Kopf und als erste Karte darunter.
// Er nennt jetzt die Bilanz des Tages: wie viel gespielt wurde und von wem.
// Das steht sonst nirgends im Feed und wiederholt keine Karte.
// Die Partien eines Kalendertags. Bewusst nicht `matchesByDay`: das
// schluesselt nach `toISOString()` und damit nach UTC, der Feed gruppiert
// aber nach Ortszeit (`_newsDayKey`) — an einer Tagesgrenze fielen beide
// auseinander und die Karte des Tages haenge am falschen Tag.
function _newsTagMs(dayKey){
  try {
    const out = [];
    (matches || []).forEach(m => { if(_newsDayKey(m.created_at) === dayKey) out.push(m); });
    return out;
  } catch(e){ return []; }
}
// Welche Karte ist die Karte des Tages? Nicht automatisch der Spieler des
// Tages, sondern die Geschichte mit dem groessten Nachrichtenwert. Die
// Generator-Prioritaet allein taugt dafuer nicht: POTD muss im normalen Feed
// verlaesslich sichtbar sein und hat deshalb eine hohe Prioritaet, ist aber
// nicht an jedem Spieltag die spannendste Geschichte. Seltenheit, Umbruch,
// Ueberraschung und mehrere zusammenfallende Ereignisse wiegen hier staerker.
function _newsTagSpannung(s){
  const d = (s && s.dataRef) || {};
  const t = d.type || '';
  if(_isBreaking(s)) return 1200 + (s.prio || 0);
  const basis = {
    giant_slayer:980, top_clash:940, rekord_geholt:900,
    rekord_erstmals:920, rekord_gesteigert:870, chronik_geholt:850,
    insignium_stufe:840, badge_unlocked:800, lead_change:980,
    elo_record:1000, streak_record:1000, team_streak:770,
    win_streak:750, rivalry_milestone:730, rivalry:690,
    potd:620, potw:640, woche:700
  };
  let wert = basis[t] || 560;
  if(t === 'giant_slayer' && d.chance != null)
    wert += Math.round((1 - Math.max(0, Math.min(1, d.chance))) * 100);
  if(t === 'badge_unlocked') wert += d.rarity === 'legendary' ? 130 : d.rarity === 'rare' ? 55 : 0;
  if(t === 'insignium_stufe') wert += Math.max(0, Number(d.stufe) || 0) * 25;
  if(t === 'chronik_geholt') wert += Math.min(80, Math.max(0, Number(d.punkte) || 0) / 2);
  if(t === 'sammel'){
    const teile = Array.isArray(d.teile) ? d.teile : [];
    const kopf = d.kopfTyp ? _newsTagSpannung({prio:s.prio, dataRef:{type:d.kopfTyp}}) : 620;
    wert = kopf + Math.min(120, Math.max(0, teile.length - 1) * 35);
  }
  return wert + Math.min(25, Math.max(0, Number(s.prio) || 0) / 10);
}

// Die gewaehlte Geschichte wird darunter gross gezeigt, statt im Kopf noch
// einmal aufgeschrieben zu werden.
//
// Es gibt sie **nur an Spieltagen**. An einem Tag ohne Partie ist nichts
// passiert, was ein Tag von einem anderen unterscheidet: dort standen sonst
// ein Fun Fact oder eine Zufallsstatistik groß im Bild, die mit diesem Tag
// nichts zu tun haben und gestern genauso dagestanden hätten.
function _newsTagKarte(items, dayKey){
  if(!Array.isArray(items) || !items.length) return null;
  const tagMs = _newsTagMs(dayKey);
  if(!tagMs.length) return null;   // an diesem Tag wurde nicht gespielt
  // Sie steht, sobald der Spieltag entschieden ist — nicht erst um 23:59.
  // Zwei Bedingungen, eine reicht: die Zahl der Partien (`tagKartePartien`,
  // gemessen der Median der Liga) oder die Stunde (`tagKarteStunde`), die die
  // kurzen Tage auffaengt. Vorher wurde die Karte zwanzig Minuten nach dem
  // ersten Spiel vergeben: der Rekord, der gerade wechselte, war die einzige
  // Karte des Tages und damit automatisch die staerkste, waehrend der
  // Spieltag noch lief und der Spieler des Tages noch gar nicht feststand.
  // Danach stand sie erst um 23:59 und damit einen halben Tag, nachdem die
  // letzte Partie gelaufen war [§C33].
  if(tagMs.length < NEWS_LIMITS.tagKartePartien){
    const frei = new Date(dayKey + 'T00:00:00');
    frei.setHours(NEWS_LIMITS.tagKarteStunde, 0, 0, 0);
    if(Date.now() < frei.getTime()) return null;
  }
  const OHNE = new Set(['ambient', 'dry_spell', 'season_endgame', 'quiet_week', 'season_start']);
  const kandidaten = items.filter(x => !OHNE.has((x.dataRef || {}).type));
  if(!kandidaten.length) return null;
  const beste = kandidaten.slice().sort((a, b) =>
    (_newsTagSpannung(b) - _newsTagSpannung(a))
      || ((b.prio || 0) - (a.prio || 0))
      || String(a.id || '').localeCompare(String(b.id || '')))[0];
  return beste ? beste.id : null;
}
function _renderNewsFeed(){
  _sheetSetReopen(()=>_renderNewsFeed());
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  // Vier Chips, nicht elf. Elf Rubriken sind eine Sortierhilfe für den, der
  // sie gebaut hat, nicht für den, der liest. Jeder Chip trägt seine Anzahl,
  // damit man vorher sieht, ob sich das Tippen lohnt.
  const _istTafel   = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel';
  const _istSpieltag = s => {
    const d = s.dataRef || {};
    // Die Filter sind redaktionelle Seiten, keine sich überschneidenden
    // Suchbegriffe. Eine Tafelmeldung darf ihren Match-Zeitpunkt tragen,
    // ohne deshalb zugleich im Spieltag-Chip zu erscheinen.
    if(_istTafel(s)) return false;
    if(d.type === 'ambient') return false;
    return !!(d.matchId || d.type === 'potd' || d.type === 'woche' ||
              (d.type === 'sammel' && d.quelle === 'spiel'));
  };
  // Jeder Chip traegt sein Zeichen — dasselbe wie im Rubrikband der Karten,
  // zu denen er filtert [§C27]. Vier gleich aussehende Pillen unterschied
  // vorher nur ihr Wort.
  const filters = [
    {k:'all',      label:'Alle',     ic:'newspaper',  test:() => true},
    {k:'breaking', label:'Breaking', ic:'bolt',       test:_isBreaking},
    {k:'tafel',    label:'Tafel',    ic:'trophyStar', test:_istTafel},
    {k:'spieltag', label:'Spieltag', ic:'crossedSwords', test:_istSpieltag},
  ];
  const aktiv = filters.find(f => f.k === _newsFeedFilter) || filters[0];
  const cards = _newsFeedFilter === 'all' ? stories : stories.filter(aktiv.test);

  const filterBar = `<div class="nf-chips">
    ${filters.map(f => {
      const n = f.k === 'all' ? stories.length : stories.filter(f.test).length;
      return `<button class="nf-chip-f${_newsFeedFilter===f.k?' on':''}${f.k==='breaking'?' brk':''}" data-f="${f.k}">`
           + `${svgI(f.ic)}${esc(f.label)}<i>${n}</i></button>`;
    }).join('')}
  </div>`;

  // Die Tafel: ein Tageskopf, darunter alle Karten dieses Tages. Breaking
  // bleibt an seinem Platz in der Chronologie und wird nicht nach oben
  // gezogen — es trägt stattdessen einen roten Kopfbalken.
  let listHtml;
  if(!cards.length){
    listHtml = '<div class="nf-empty">Keine Stories in dieser Auswahl.</div>';
  } else {
    const gruppen = [];
    cards.forEach(st => {
      const k = _newsDayKey(st.when);
      const g = gruppen[gruppen.length-1];
      if(g && g.k === k) g.items.push(st);
      else gruppen.push({k, label:_newsDayLabel(st.when), datum:_newsDayDate(st.when), items:[st]});
    });
    listHtml = gruppen.map(g => {
      const neu = g.items.filter(st => !seen.has(st.id)).length;
      // Die Wahl gehoert dem ganzen Tag, nicht dem aktiven Filter. Sonst
      // koennte dieselbe Tafel je Reiter eine andere „Karte des Tages" haben.
      const alleDesTages = stories.filter(st => _newsDayKey(st.when) === g.k);
      const tagesKarte = _newsTagKarte(alleDesTages, g.k);
      // Der Kopf traegt Wochentag, Datum und die Zahl der Karten — sonst
      // nichts. Die Bilanz („3 Partien · 4 Spieler") und die Gesichter standen
      // darunter und wiederholten, was die Karten des Tages ohnehin zeigen:
      // vier Wappen ueber vier Karten, auf denen dieselben vier Wappen
      // stehen. Der Kopf ist eine Marke auf dem Zeitstrahl, kein Vorspann.
      // Der Tagesschluessel steht am Kopf: die Bilanz des Tages ist aus dem
      // Markup verschwunden, und ohne ihn liesse sich nicht mehr pruefen, ob
      // an diesem Tag ueberhaupt gespielt wurde.
      return `<div class="nf-tag" data-tag="${esc(g.k)}">
        <div class="nf-tag-z1"><span class="nf-tag-wt">${esc(g.label)}</span>`
        + `<span class="nf-tag-dt">${esc(g.datum)}</span>`
        + `<span class="nf-tag-n${neu?' neu':''}">${neu ? neu + ' NEU' : g.items.length + (g.items.length===1?' KARTE':' KARTEN')}</span></div>`
        + `</div>
        <div class="nf-feed">${g.items.map(st =>
            _newsCardHtmlM2(st, seen.has(st.id), st.id === tagesKarte)).join('')}</div>`;
    }).join('');
  }

  const datum = new Date().toLocaleDateString('de-DE',
    {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  // Der Gelesen-Knopf steht dort, wo auch die Zahl steht, die ihn erklärt.
  // Ohne offene Stories fällt beides weg.
  const offen = stories.filter(x => !seen.has(x.id)).length;
  const gelesenKnopf = offen
    ? `<button class="nf-gelesen" id="nvMarkAllBtn" type="button">ALLES GELESEN <b>${offen}</b></button>`
    : '';
  openSheet(`
    <div class="nf-wrap">
      <div class="nf-kopf nf-kopf-tafel">
        <div><div class="nf-masthead">LIGA NEWS</div>
        <div class="nf-datum">${esc(datum)}</div></div>
        ${gelesenKnopf}
      </div>
      ${filterBar}
    </div>
    <div class="nf-wrap" style="padding-top:0">${listHtml}</div>
  `);

  // Filter-Click → re-render (billig, Daten aus Cache).
  const sheet = document.getElementById('sheet');
  sheet.querySelectorAll('.nf-chips button[data-f]').forEach(el => {
    el.onclick = () => { _newsFeedFilter = el.dataset.f; _renderNewsFeed(); };
  });
  // „Alle als gelesen markieren" — markiert ALLE Cache-Stories.
  const markBtn = document.getElementById('nvMarkAllBtn');
  if(markBtn){
    markBtn.onclick = () => {
      try { _newsMarkAllSeen(); } catch(e){}
      try { newsBadgeRefresh(); } catch(e){}
      sheet.querySelectorAll('.nf-card, .nf-hero').forEach(el => {
        el.classList.add('read'); el.classList.remove('important');
        el.querySelector('.nf-dot')?.remove();
      });
      // Die Leiste zeigt die Zahl der offenen Stories; nach dem Markieren ist
      // sie null, also gehört sie weg. Neu zeichnen statt den Knopf abblenden.
      _renderNewsFeed();
    };
  }
  // Karten + Hero klickbar → Detail.
  sheet.querySelectorAll('[data-sid]').forEach(el => {
    el.onclick = () => {
      const sid = el.dataset.sid;
      _newsMarkSeen(sid);
      el.classList.add('read'); el.classList.remove('important');
      el.querySelector('.nf-dot')?.remove();
      newsBadgeRefresh();
      openNewsDetail(sid);
    };
  });
}

