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
// Die Ewige Tafel ist die einzige Karte, deren Tages-ID stabil bleibt,
// waehrend sie im Lauf des Tages neue Wechsel aufnimmt. Fuer sie ist deshalb
// nicht nur die ID, sondern die sichtbare Fassung der Lesebeleg. Sonst blieb
// eine um weitere Rekorde ergaenzte Karte "gelesen", nur weil ihre fruehere
// Fassung schon geoeffnet worden war.
function _newsIstRollendeTafel(s){
  const d = (s && s.dataRef) || {};
  return d.type === 'sammel' && d.quelle === 'tafel' && Array.isArray(d.teile);
}
function _newsSeenKey(s){
  if(!s || typeof s !== 'object') return String(s || '');
  if(!_newsIstRollendeTafel(s)) return String(s.id || '');
  const d = s.dataRef || {};
  const letzter = d.teile.reduce((mx, t) => Math.max(mx, Number(t && t.ms) || 0),
    new Date(s.when).getTime() || 0);
  return `${s.id}@${letzter}@${d.teile.length}`;
}
function _newsMarkSeen(items){
  const seen = _newsLoadSeen();
  const list = Array.isArray(items) ? items : [items];
  list.forEach(item => {
    const key = _newsSeenKey(item);
    if(key) seen.add(key);
  });
  _newsSaveSeen(seen);
}
// Der Lesestand: der Zeitpunkt der neuesten Karte, die beim letzten
// „Alles gelesen" im Feed stand [§11.3].
function _newsLesestand(){
  try { return Number(localStorage.getItem(NEWS_LS_STAND)) || 0; } catch(e){ return 0; }
}
// Eine Karte gilt als gelesen, wenn ihre ID in der Liste steht ODER ihr
// Zeitpunkt vor dem Lesestand liegt. Beides ist noetig: die Liste kennt nur,
// was auf dem Bildschirm stand, und der Feed zeigt nicht jeden Tag dieselbe
// Auswahl — ein Deckel, eine gleichlautende Schlagzeile oder eine ablaufende
// Sperrfrist schieben eine Karte spaeter doch noch herein. Sie stand dann
// unter einem Tag, den der Leser schon gelesen hat, und war trotzdem als neu
// markiert.
function _newsGelesen(s, seen, stand){
  if(!s) return true;
  // Bei der rollenden Tages-Tafel darf eine gelesene alte Fassung die neue
  // nicht verschlucken. Alle unveraenderlichen Stories behalten den billigen
  // ID-Lookup und damit ihren bisherigen Lesestand.
  const key = _newsSeenKey(s);
  if(seen && seen.has(key)) return true;
  if(!_newsIstRollendeTafel(s) && seen && seen.has(s.id)) return true;
  return !!stand && new Date(s.when).getTime() <= stand;
}
function _newsMarkAllSeen(){
  const stories = getStoriesCache();
  _newsMarkSeen(stories);
  // Der Lesestand wandert auf die neueste Karte des Feeds. Alles, was
  // danach kommt, ist neu; alles davor ist gelesen, auch wenn es erst
  // spaeter im Feed erscheint.
  const neuste = stories.reduce((mx, s) =>
    Math.max(mx, new Date(s.when).getTime() || 0), 0);
  if(neuste) try { localStorage.setItem(NEWS_LS_STAND, String(neuste)); } catch(e){}
}
function newsUnreadCount(){
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  const stand = _newsLesestand();
  return stories.filter(s => !_newsGelesen(s, seen, stand)).length;
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
// ── Der Hinweis ist ein Ereignis ──────────────────────────────────────
// Er war eine flache grüne Pille mit „59 neue Stories" in einer Zeile: dieselbe
// Schrift und Fläche wie jeder Knopf, und wer gerade woanders hinsah, bemerkte
// ihn in seinen vier Sekunden nicht. Jetzt steht die Zahl groß neben einem
// Zeichen, ein Lichtlauf zieht beim Erscheinen darüber, und ein Ring geht auf
// wie ein Signal. Alles nur über transform und Deckkraft, und bei
// Bewegungsruhe steht er still da.
function _newsToastFuellen(txt, n){
  txt.innerHTML = `<i class="nt-ic">${svgI('newspaper')}</i><b class="nt-n num">${n}</b>`
    + `<span class="nt-w">${n === 1 ? 'neue Story' : 'neue Stories'}</span>`;
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
  _newsToastFuellen(txt, unreadCount);
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
    _newsToastFuellen(txt, n);
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
  const todayKey = tagKey(now);
  const yest = tagKey(now.getTime() - 86400000);
  const dKey = tagKey(d);
  const hhmm = datumFmt(d, 'uhr');
  if(dKey === todayKey) return 'Heute, '+hhmm;
  if(dKey === yest) return 'Gestern, '+hhmm;
  return datumFmt(d, 'tm')+', '+hhmm;
}

// Der Kalendertag einer Story, als Überschrift für eine Feed-Gruppe.
// Gleiche Zeitrechnung wie _newsWhenLabel: lokale Datumskeys, kein UTC.
// Der Tageskopf trägt den Wochentag ausgeschrieben und das Datum daneben.
// Vorher stand dort „Mi, 26. August" in einer Zeile mit der Anzahl; wer scrollte,
// übersah den Tageswechsel und las zwei Spieltage als einen. Heute und gestern
// behalten ihr Wort, weil man an ihnen kein Datum nachschlagen will.
function _newsDayLabel(when){
  const d = new Date(when), now = new Date();
  if(tagKey(d) === tagKey(now)) return 'HEUTE';
  if(tagKey(d) === tagKey(now.getTime() - 86400000)) return 'GESTERN';
  return datumFmt(d, 'wt').toUpperCase();
}
// Das Datum unter dem Wochentag. Bei „Heute" und „Gestern" steht es trotzdem
// da: sonst weiß man beim Zurückblättern nicht, wo man ist.
function _newsDayDate(when){
  const d = new Date(when);
  return datumFmt(d, 'tmj');
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
  // Eine Tafel-Sammelkarte behält die höchste Dringlichkeit ihrer Teile.
  // Sonst würde ein erstmals vergebener Liga-Rekord beim vorgeschriebenen
  // Bündeln plötzlich seinen Breaking-Charakter verlieren.
  if(d.type === 'sammel') return d.breaking === true;
  // Breaking heißt: das passiert vielleicht einmal im Monat. Erlaubt sind
  // ausschließlich extrem seltene Auszeichnungen und echte EREIGNISSE —
  // etwas, das vorher noch nie da war oder die Spitze der Liga verschiebt.
  // Gefallen sind `top_clash` (Platz 1 schlägt Platz 2 — kam allein in einem
  // Fenster von 33 Stories vor) und `giant_slayer` (dafür gibt es die
  // Highlight-Karte).
  switch(d.type){
    case 'lead_change':      // der Tabellenführer eines belastbaren Spieltags
    case 'streak_record':    // längste Siegesserie aller Zeiten
    case 'season_recap':     // der Meister steht fest
    case 'season_endgame':   // der Schlusssprint, und nur bei offener Lage
      return true;
    case 'badge_unlocked':   // nur legendäre Auszeichnungen
      return d.rarity === 'legendary';
    // ── Nur der ERSTE Aufstieg in die oberen zwei Stufen ────────────
    // Prestige aus Liga-Rekorden wird geteilt und fällt mit einem verlorenen
    // Bestwert wieder [§C34]: dieselbe Stufe kann mehrmals erreicht werden,
    // und beim zweiten Mal ist sie keine Nachricht mehr, die die Spalte
    // bricht. Ob es das erste Mal ist, sagt `wieder` [§C33].
    case 'insignium_stufe':  // nur Kronenreif und Ordensstern [§C30]
      return !!d.oben && !d.wieder;
    // ── Ein erstmals vergebener Liga-Rekord ist kein Breaking ───────
    // Er stand auf der Liste, und in der Füllphase der Ewigen Tafel wird
    // JEDER Rekord zum ersten Mal vergeben: gemessen über die 18 Spieltage
    // des Juni 2026 trugen elf von ihnen eine Breaking-Karte, immer dieselbe
    // — der Tafel-Moment des Tages, der es von einer seiner Zeilen erbte.
    // Damit war Breaking in dieser Phase die Regel und nicht die Ausnahme.
    // Dasselbe gilt für `elo_record`: die Karte bildet der Generator nicht
    // mehr (der Bestwert steht als „Der höchste Gipfel" in der Tafel), aber
    // persistierte Zeilen aus älteren Läufen tragen den Typ weiter und waren
    // damit dieselbe Meldung zweimal, einmal laut.
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
  // Nicht hier kürzen: Große Tafel-Bundles brauchen die vollständige Zahl,
  // damit „+3" auch wirklich drei weitere Beteiligte meint. Die Darstellung
  // selbst zeigt weiterhin höchstens zwei Wappen und fasst den Rest zusammen.
  return raus;
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
  return datumFmt(when, 'uhr');
}

// Rot ist eine Richtung, keine Rubrik [§C25]. Karte und Detailblatt nutzen
// dieselbe Ableitung, damit eine Durststrecke beim Öffnen nicht wieder den
// grünen Schimmer einer positiven Serie annimmt.
function _newsIstNegativ(s){
  const d = (s && s.dataRef) || {};
  // ── Eine Gruppe ist so negativ wie ihre Mitglieder ─────────────────
  // Mehrere Pleitenserien derselben Partie werden EINE Zeile („2 Pechvögel:
  // Anton & Maxi"), und die trägt `type:'group'` mit `loss_streak` in `sub`.
  // Geprüft wurde nur `type`, also galt die Gruppe als positiv: gemessen
  // stand sie als Zeile auf der Karte „Teamserie in einer Partie", die
  // Johannes und Martins Sieg feiert — Rot ist die Richtung, und eine Karte
  // hat eine [§C25].
  const typ = (d.type === 'group' ? (d.sub || '') : (d.type || ''));
  return /loss|dry_spell/.test(typ) || d.rarity === 'negative';
}

// Die Ewige Tafel hat mehrere Kammern. Ein einziger silberner Ton machte
// Rekorde, Monatschroniken und Fügungen beim Scrollen ununterscheidbar. Die
// Familie wird ausschließlich aus den bereits gespeicherten Fachdaten
// abgeleitet; alte Stories und zusammengeführte Karten profitieren damit
// ohne Migration. Bei einem Bundle aus mehreren Familien bleibt ein ruhiger
// Mischton, statt eine einzelne Zeile optisch zum Sieger zu erklären.
function _newsTafelTon(s){
  const d = (s && s.dataRef) || {};
  const familie = x => {
    const typ = String((x && (x.type || x.typ)) || '');
    if(typ === 'insignium_stufe') return 'insignium';
    if(typ.indexOf('chronik_') === 0) return 'chronik';
    if(typ.indexOf('rekord_') === 0){
      const kammer = (x && x.kammer) || d.kammer || '';
      if(kammer === 'mark') return 'marke';
      if(kammer === 'fuegung') return 'fuegung';
      if(kammer === 'shame') return 'schatten';
      return 'rekord';
    }
    return '';
  };
  const teile = d.type === 'sammel' && Array.isArray(d.teile) ? d.teile : [d];
  const arten = [...new Set(teile.map(familie).filter(Boolean))];
  return arten.length === 1 ? arten[0] : (arten.length > 1 ? 'mix' : 'rekord');
}

// ── Ein Schimmer für das, was selten ist [§C25] ───────────────────────
// Bewegung hatten im Feed nur drei Karten: Breaking, die Karte des Tages und
// der Spieler des Tages und der Woche, die beiden letzten in Gold. Alles
// dazwischen stand still, auch ein Spitzenwechsel, eine seltene
// Auszeichnung oder eine Fünfer-Serie, und man scrollte darüber hinweg wie
// über ein gewöhnliches 10:7. Diese Karten tragen jetzt einen leisen
// Lichtlauf in der Farbe IHRER Familie (`--story-rgb`), nicht in Gold — Gold
// gehört dem Titel. Was ohnehin leuchtet, bekommt keinen zweiten, und eine
// negative Richtung auch nicht. Der Versatz kommt aus der ID, damit nicht
// alle Lichter im selben Takt laufen.
const NEWS_GLANZ_TYP = new Set(['lead_change', 'rekord_geholt', 'insignium_stufe', 'chronik_erstling', 'streak_record', 'season_champion']);
// Die seltenen Formen der gewöhnlichen Partie (`glanz` aus `_spBild`):
// Zählwerk, Rückkehr, Elo-Transfer und der gebrochene Fluch [§C33].
const NEWS_GLANZ_ANLASS = new Set(['spitze', 'medaille', 'aussenseiter', 'premiere', 'riss', 'form']);
function _newsGlanz(s, sorte, anlass){
  const d = s.dataRef || {};
  if(sorte === 'held' || sorte === 'woche') return false;
  if(NEWS_GLANZ_TYP.has(d.type) || NEWS_GLANZ_ANLASS.has(anlass)) return true;
  if(d.type === 'badge_unlocked' && (d.rarity === 'rare' || d.rarity === 'legendary')) return true;
  if((d.type === 'win_streak' || d.type === 'team_streak') && Number(d.streak) >= 5) return true;
  if(anlass === 'serie' || anlass === 'teamserie'){
    const f = (typeof _newsSpielFakten === 'function' ? _newsSpielFakten(s) : [])
      .find(x => x.type === 'win_streak' || x.type === 'team_streak');
    if(f && Number(f.streak) >= 5) return true;
  }
  return (d.teile || []).some(t => t.klasse || NEWS_GLANZ_TYP.has(t.typ));
}
function _newsGlanzVersatz(id){
  let h = 0; const t = String(id || '');
  for(let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return -(h % 110) / 10;
}
function _newsCardHtmlM2(s, isRead, istTagesKarte, fadenHtml){
  if(((s && s.dataRef) || {}).type === 'runde') return _newsRundeHtml(s, isRead, fadenHtml);
  const dcat = _displayCat(s);
  const meta = NEWS_CATEGORIES[dcat] || NEWS_CATEGORIES.fun;
  const d = s.dataRef || {};
  const sorte = _newsSorte(s);
  const tafelTon = sorte === 'tafel' ? _newsTafelTon(s) : '';
  const faktStil = sorte === 'fakt' && d.type === 'ambient'
    ? (NEWS_AMBIENT_STIL[d.ambientRubrik] || NEWS_AMBIENT_STIL.liga) : null;
  const brk = _isBreaking(s);
  const imp = (_isImportant(s) && !isRead) ? ' important' : '';
  // Die Karte des Tages steht groß, mit einem Streifen darüber. Vorher stand
  // ihre Schlagzeile im Tageskopf und gleich darunter noch einmal auf der
  // Karte selbst.
  const gross = istTagesKarte && !brk;
  // Breaking sprang bisher als Hero an den Kopf des Feeds und damit aus der
  // Chronologie. Es bleibt jetzt an seinem Platz und trägt stattdessen einen
  // roten Kopfbalken mit Punkt und Zeitstempel [§11.6b].
  // ── Eine gebuendelte Breaking-Karte sagt, wie viel sie traegt ────
  // Sie sah aus wie jede andere Breaking-Karte: derselbe Balken, dasselbe
  // Wort. Dass unter der Schlagzeile noch fuenf weitere Meldungen desselben
  // Moments stehen, stand nur im Sammelband darunter — und wer die Karte
  // ueberflog, las „BREAKING" und hielt sie fuer eine einzelne Nachricht.
  // Die Zahl steht deshalb im Balken, neben dem Wort, das sie erklaert.
  const brkTeile = (brk && d.type === 'sammel' && Array.isArray(d.teile))
    ? d.teile.length : 0;
  const balken = brk
    ? `<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING`
      + (brkTeile > 1
          ? `<span class="nf-brk-n">${brkTeile} Meldungen</span>` : '')
      + `<span class="nf-brk-zeit">${esc(_newsWhenLabel(s.when))}</span></div>`
    : '';
  // Eine Sammelkarte hat einen eigenen Gruppenkopf. Darunter stehen ALLE
  // verbundenen Einzelereignisse im Band; keines wird zum heimlichen Kopf
  // und keines hinter „weitere" versteckt [§C33].
  // ── Das Ergebnis steht nicht als Zeile unter seinem eigenen Band ──
  // Die Zeile hiess „Leon und Maxi setzen sich gegen Leo und Anton durch" und
  // stand unmittelbar unter dem Ergebnisband, das dieselben vier Namen mit
  // Wappen und Stand zeigt — gemessen brach sie dabei mit Auslassungspunkten
  // ab. Ihr Anlass steht ausserdem in der Schlagzeile („… in einer Partie")
  // und ihre beiden Zahlen im Satz darunter. Sie bleibt Teil des Buendels,
  // damit die Karte ihr Band und ihre Siegchance behaelt [§C33], und
  // verschwindet nur aus dem Band, wo sie nichts hinzufuegt.
  // Nur auf der Achse der PARTIE: eine Karte über zwei Ergebnisse desselben
  // Tages (`quelle:'ergebnis'`) besteht aus lauter Ergebnis-Zeilen, und die
  // sind dort die Aussage — gemessen blieben sonst elf Karten ohne Band.
  const sammelTeile = (d.type === 'sammel' && d.quelle === 'spiel'
                       && d.matchId && !d.bandFremd)
    ? (d.teile || []).filter(t => String((t && (t.typ || t.type)) || '') !== 'spiel')
    : d.teile;
  const sammelBand = (d.type === 'sammel')
    ? _newsSammelBand(sammelTeile, [s.title], true) : '';

  // ── Je Sorte ein eigener Kopf und ein eigener Fuß ──────────────────
  // Vorher unterschied die Sorten nur eine Randfarbe, und zehn Karten
  // untereinander sahen alle gleich aus.
  let kopf = '', fuss = '', gesicht = '';
  // Der Satz unter der Schlagzeile. Nur die Partie-Karte kürzt ihn: was ihr
  // Fuß als Bogen und Chips zeigt, sagt er nicht noch einmal (_newsSpielSatz).
  let satz = s.desc;
  const pm = pmap();
  // 48 px ist die Untergrenze fuer ein Wappen [§6]; darunter gibt `insAvWrap`
  // nur den Avatar zurueck, und die Karte verloere ihr Gesicht [§C33].
  const av = (pid, px) => (pm[pid] ? avHtml(pm[pid], '', {ins:true, px:px||48, feuer:0}) : '');

  if(sorte === 'spiel'){
    // Kopf und Fuß folgen dem Anlass der Partie [§C33, §11.6c].
    const bild = _spBild(s);
    kopf = d.bandFremd ? '' : bild.kopf;
    satz = _newsSpielSatz(s.desc, bild.zeigt);
    fuss = bild.fuss + _newsZahlband(_newsSpielZahlen(s, bild.key));
    // Die Ergebnis-Sammelkarte hat ZWEI Partien und deshalb keine, die sie
    // als Band zeigen könnte: acht Wappen übereinander machten sie höher als
    // ihr Text [§C27]. Die Stände stehen im Sammelband, die Sieger als Chips
    // — im Feed hat jeder ein Gesicht [§C33].
    if(!kopf) gesicht = _newsGesichtHtml(s);
  } else if(sorte === 'tafel'){
    const w = _newsTafelWert(s);
    // Ein Tafel-Bundle zeigt Wert UND Beteiligte. Der große Zähler erklärte
    // bisher zwar, wie viele Spuren zusammenlaufen, ließ aber alle genannten
    // Spieler bildlich verschwinden. Die kompakte Chipgruppe bleibt neben
    // dem Wert und macht keinen einzelnen Halter zum Hauptdarsteller.
    gesicht = `<div class="nf-gr-l">${w ? _newsWertBlock(w.v, w.l, 'ton') : ''}${_newsGesichtHtml(s)}</div>`;
  } else if(sorte === 'ins'){
    gesicht = `<div class="nf-gr-l">${av(d.pid, 48)}</div>`;
    fuss = _newsLeiter(d.pid);
  } else if(sorte === 'held' && d.type === 'season_recap'){
    // ── Die Meisterbühne [§C31] ────────────────────────────────────
    // Zwei Sätze und kein Bild: so stand der Meister im Feed, die seltenste
    // Karte des Monats. Jetzt steht das Podest über dem Satz — dasselbe
    // Bauteil wie im Saison-Rückblick [§C27] —, und im Fuß das Rennen um die
    // Spitze, klein, samt der Tage vorn und dem Vorsprung.
    kopf = _newsMeisterKopf(d);
    fuss = _newsMeisterFuss(d);
  } else if(sorte === 'held'){
    const pid = d.playerId || (Array.isArray(d.playerIds) ? d.playerIds[0] : null);
    gesicht = `<div class="nf-gr-l">${av(pid, 52)}</div>`;
    // Der Spieler des Tages zeigt seinen Tag als Bahn und die Elo darüber:
    // dass er mit zwei Pleiten anfing und mit fünf Siegen endete, sagten
    // drei Zahlen nicht [§11.6c].
    if(d.type === 'potd') fuss = _spTagBild(_spTagDaten(s));
    if(!fuss) fuss = _newsZahlband([
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
    // Der Sieger der Woche steht mit seinem Wappen da. Die Karte trug sechs
    // Zeilen Text und kein einziges Gesicht — im Feed hat jeder eins [§C33],
    // und diese Karte gibt es einmal je Woche.
    const held = (teile.find(t => t.held) || teile[0] || {});
    const hpid = (held.pids || [])[0];
    if(hpid) gesicht = `<div class="nf-gr-l">${av(hpid, 48)}</div>`;
    // Und jede Wertung trägt ihr Zeichen: sechs Zeilen Text untereinander
    // sagen vor dem Lesen nicht, welche davon der Spieler der Woche ist.
    fuss = `<div class="nf-wl">${teile.map(t =>
      `<div class="nf-wl-z${t.held ? ' held' : ''}">`
      + (t.ic ? `<em class="nf-wl-i">${svgI(t.ic)}</em>` : '')
      + `<span>${esc(t.label || '')}</span>`
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
    fuss = _newsSerienBand(d.streak, verloren, true);
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
    // Die Leiter der Liga zeigt ihre Stufen, darunter die Zahl der Träger.
    if(d.leiter) fuss = _newsLigaLeiter(d.leiter);
  }
  // Jede Geschichte, die durch eine konkrete Partie ausgeloest wurde,
  // zeigt diese Partie. Das gilt auch fuer Auszeichnungen, Serien und
  // Tafelwechsel: Der Typ bestimmt weiter Farbe und Aufbau, aber Ergebnis,
  // Teams und Ausloeser verschwinden nicht mehr hinter der Rubrik.
  // Das Band gehoert der Partie, nicht jeder Karte, die sie nennt: steht schon
  // eine andere Karte derselben Partie im Feed, zeigt sie es [§C33].
  if(d.matchId && !d.bandFremd && (sorte === 'duell' || !kopf)){
    kopf = _newsErgebnisBand(d.matchId) || kopf;
  }
  // Das Duell traegt seine Wappen im Band ueber dem Text; die Ersatzgesichter
  // haetten sie ein zweites Mal daneben gestellt.
  if(!gesicht && sorte !== 'spiel' && sorte !== 'woche' && sorte !== 'duell'
     && d.type !== 'season_recap'){
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
  // ── Was oben steht, steht unten nicht noch einmal ──────────────────
  // `_breakingHeroText` hat nur fuer sieben Typen einen eigenen Satz und
  // faellt sonst auf `s.desc` zurueck. Gemessen stand der Teaser damit auf
  // jeder anderen Breaking-Karte zweimal untereinander — auf der
  // gebuendelten „Neue Tabellenspitze und Auszeichnung in einer Partie" und
  // auf jeder legendaeren Auszeichnung [§C33].
  let brkSub = '';
  if(brk){
    const h = _breakingHeroText(s);
    if(String(h || '').trim() !== String(s.desc || '').trim()) brkSub = h;
  }
  const glanz = !negativ && !brk && !gross && _newsGlanz(s, sorte, sorte === 'spiel' && d.matchId ? (_spBild(s).glanz ? 'form' : _spBild(s).key) : '');
  return `<div class="nf-card nf-s-${sorte} nfc-${dcat}${tafelTon?' nf-tafel-'+tafelTon:''}${faktStil?' nf-fakt-'+faktStil.ton:''}${negativ?' nf-neg':''}${brk?' nf-brk':''}${gross?' nf-gross':''}${glanz?' nf-glanz':''}${isRead?' read':''}${imp}" data-sid="${esc(s.id)}"${glanz ? ` style="--gv:${_newsGlanzVersatz(s.id)}s"` : ''}>
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
      <div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${satz ? `<div class="nf-d">${_newsBetont(satz)}</div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span>
    </div>
    ${sammelBand}
    ${sorte === 'tafel' ? _newsVerlustBand(s) : ''}
    ${fuss}
    ${brkSub ? `<div class="nf-brk-sub">${esc(brkSub)}</div>` : ''}
    ${fadenHtml || ''}
  </div>`;
}

// Die Rubrik ueber der Karte, wie in einer Zeitung. Sie sagt, aus welchem
// Teil der Liga die Nachricht kommt, und ist an der Sorte ablesbar — die
// elf Kategorien der Datenbank waren eine Sortierhilfe fuer den, der sie
// gebaut hat, und standen als „Badge & Awards" ueber einer Auszeichnung.
function _newsRubrik(sorte, s){
  const d = (s && s.dataRef) || {};
  if(_isBreaking(s)) return 'BREAKING';
  if(d.type === 'runde') return 'DIE RUNDE';
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
    default:       return d.type === 'ambient'
      ? (NEWS_AMBIENT_STIL[d.ambientRubrik] || NEWS_AMBIENT_STIL.liga).label
      : 'LIGA IN ZAHLEN';
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
function _newsSerienBand(laenge, verloren, mitZiel){
  const n = Math.max(0, Number(laenge) || 0);
  if(!n) return '';
  const zeige = Math.min(n, 12);
  // Die Karte einer Siegesserie zeigt die nächste Marke als leere Felder:
  // man sieht, wie weit es noch ist. Eine Pleitenserie hat kein Ziel —
  // eine Marke, auf die man zuläuft, wäre dort ein Wunsch [§C25].
  const ziel = mitZiel && !verloren ? naechsteSerienMarke(n) : 0;
  const leer = ziel && ziel <= 12 ? ziel - zeige : 0;
  // Rechts steht, was die Punkte zaehlen. Ohne die Angabe war die halbe
  // Bandbreite leer, und die Reihe sagte nicht, ob sie Siege oder Pleiten
  // meint.
  return `<div class="nf-ser${verloren ? ' r' : ''}">`
    + Array.from({length: zeige}, () => '<i></i>').join('')
    + Array.from({length: leer}, () => '<i class="x"></i>').join('')
    + (n > zeige ? `<em>+${n - zeige}</em>` : '')
    + `<span>${n} ${verloren ? 'Pleiten' : 'Siege'} nacheinander${ziel ? ` · Marke ${ziel}` : ''}</span></div>`;
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
  // Drei Zeilen und dahinter die Zahl. Eine Sammelkarte zeigt mehr, aber
  // nicht alles: gemessen trug ein Tafel-Moment neunzehn Zeilen, und die
  // Karte bedeckte damit den ganzen Bildschirm — die vollstaendige Liste
  // versteckte alles andere. Gezeigt werden die staerksten
  // `NEWS_LIMITS.sammelZeilen`; `rest` steht nach `prio` sortiert, also
  // Bestmarke vor Monatschronik vor Insignium. Das Blatt zeigt jede Zeile.
  const grenze = vollstaendig
    ? Math.min(rest.length, NEWS_LIMITS.sammelZeilen || rest.length) : 3;
  // ── Ein Ausbau steht nicht auf der Karte ──────────────────────────
  // „Wichtig ist, was wirklich in der Chronik steht und welcher Rekord
  // wirklich uebernommen wurde" — ein Ausbau ist keins von beidem: derselbe
  // Halter, ein besserer Wert, kein Wechsel. Gemessen trug ein Tafel-Moment
  // achtzehn Zeilen, elf davon Ausbauten, und bei vier Plaetzen standen zwei
  // Wechsel und zwei Ausbauten auf der Karte. Sie zaehlen jetzt in die Zahl
  // dahinter; das Blatt zeigt jede Zeile [§C33].
  //
  // Gibt es NUR Ausbauten, bleibt die staerkste stehen: eine Karte mit einem
  // leeren Band ist schlimmer als eine, die einen Ausbau nennt.
  const wechsel = rest.filter(t => String((t && (t.typ || t.type)) || '') !== 'rekord_gesteigert');
  const zeige = (wechsel.length ? wechsel : rest).slice(0, grenze);
  const uebrig = rest.length - zeige.length;
  // In einer gemischten Tafel-Karte bekommt jede Spur den Ton ihrer Kammer.
  // Der Kartenkopf bleibt eine gemeinsame Geschichte, die Zeilen verraten
  // aber sofort, ob darunter Rekord, Bestmarke, Chronik, Fügung, Schatten
  // oder ein neues Insignium zusammengekommen sind.
  const tafelTon = t => {
    const typ = String((t && (t.typ || t.type)) || '');
    if(typ === 'insignium_stufe') return 'insignium';
    if(typ.indexOf('chronik_') === 0) return 'chronik';
    if(typ.indexOf('rekord_') !== 0) return '';
    if(t.kammer === 'mark') return 'marke';
    if(t.kammer === 'fuegung') return 'fuegung';
    if(t.kammer === 'shame') return 'schatten';
    return 'rekord';
  };
  // Die Marke sagt in zwei Worten, welche Zeile in der Monatstafel landet
  // [§C32] — Metall, sie zeichnet niemanden aus [§C25].
  return `<div class="nf-sam">${zeige.map(t => {
    const ton = tafelTon(t);
    // ── Der Anlass des Breaking traegt eine Marke ─────────────────
    // Die Karte bricht die Spalte, weil EINE ihrer Zeilen Breaking ist. Sie
    // stand zuletzt und ohne jedes Zeichen: die lauteste Karte des Feeds
    // behauptete eine Dringlichkeit, die sie selbst nicht belegte. Sie
    // steht jetzt zuerst [§C33] und sagt es auch — Rot, weil das die
    // Richtung von Breaking ist [§C25].
    return `<div class="nf-sam-z${ton ? ' nf-sam-'+ton : ''}${t.neg ? ' neg' : ''}${t.brk ? ' brk' : ''}" data-story-id="${esc(t.id || '')}"><i class="nf-sam-i">${svgI(t.ic || 'chartBar')}</i>`
    + `<span>${_newsBetont(t.titel || '')}</span>`
    + (t.brk ? `<b class="nf-sam-brk">Der Anlass</b>` : '')
    + (t.marke ? `<b class="nf-sam-k">${esc(t.marke)}</b>` : '')
    // Die Klasse einer seltenen Auszeichnung: Violett, die Familie der
    // Auszeichnungen [§C25] — Gold waere ein Titel, Rot eine Richtung.
    + (t.klasse ? `<b class="nf-sam-kl">${esc(t.klasse)}</b>` : '')
    // Auf der Ergebnis-Karte ist der Stand die Aussage. „Ben und Jonas
    // gewinnen ohne Gegentor" ohne die 10:0 daneben ist die halbe Nachricht,
    // und in den Satz gehört sie nicht: die Zeile kürzt sich [§C32].
    + (t.wert ? `<b class="nf-sam-w">${esc(t.wert)}</b>` : '')
    + `</div>`;
  }).join('')}`
    + (uebrig > 0 ? `<div class="nf-sam-m">und ${uebrig} weitere</div>` : '')
    + `</div>`;
}

// ── Wer verliert, steht auf der Karte ─────────────────────────────────
// Ein Rekord, den jemand übernimmt oder mit einem anderen teilt, kostet den
// bisherigen Halter Prestige, und davon stand auf der Karte nichts: die
// Schlagzeile feiert die Neuen, und wer seinen Anteil abgeben musste, erfuhr
// es erst im Blatt — oder gar nicht, solange es dort „±0" hieß. Die Zeile
// nennt je Verlierer den Verlust und, wenn er eine Schwelle unterschreitet,
// die Stufe, auf die er fällt. Rot ist die Richtung [§C25]; die Karte bleibt
// die der Gewinner, deshalb steht der Verlust unter dem Band und nicht im
// Kopf. Gelesen wird die gespeicherte Wirkung der Karte, wie im Blatt.
//
// Je Verlierer ein Chip: Gesicht, Name, Betrag — und nur, wenn die Stufe
// fällt, ein Pfeil mit ihr. Vorher stand „VERLIERT" als Wort vor einer
// Reihe aus „Leon −77 auf Volutenkranz", und bei drei Namen brach das in
// eine zweite Zeile, in der Betrag und Stufe nicht mehr zu ihrem Namen
// gehörten. Der Chip hält zusammen, was zusammengehört, und das Wort davor
// sagt, wovon der Betrag abgeht: Prestige.
function _newsVerlustBand(s){
  const d = (s && s.dataRef) || {};
  const je = {};
  const nimm = lb => { if(lb) Object.keys(lb).forEach(pid => { if(!je[pid]) je[pid] = lb[pid]; }); };
  if(d.type === 'sammel') (d.teile || []).forEach(t => nimm(t.lb));
  else nimm(d.laufbahn);
  const pm = pmap();
  const weg = Object.keys(je).filter(pid => pm[pid]).map(pid => {
    const vor = Math.round(Number(je[pid].vor) || 0), nach = Math.round(Number(je[pid].nach) || 0);
    return {pid, d: nach - vor, ab: insigniumStufeVon(nach) < insigniumStufeVon(vor)
      ? INSIGNIEN[insigniumStufeVon(nach)].name : ''};
  }).filter(x => x.d < 0).sort((a, b) => a.d - b.d);
  if(!weg.length) return '';
  return `<div class="nf-verlust"><span class="nf-verlust-l">${svgI('trendDown')}Prestige</span>`
    + `<span class="nf-verlust-w">${weg.slice(0, 3).map(x =>
      `<b class="nf-vl">${rcpAvHtml(x.pid, 18, {})}<i>${esc(pm[x.pid].name)}</i>`
      + `<em class="num">−${-x.d} P</em>${x.ab ? `<u>↓ ${esc(x.ab)}</u>` : ''}</b>`).join('')}${weg.length > 3
      ? `<b class="nf-vl mehr">+${weg.length - 3}</b>` : ''}</span></div>`;
}

// Die Zahlen einer Spieltags-Karte. Sie stehen im Fuß, damit der Satz sie
// nicht wiederholen muss — und nur, wo die Zeichnung sie nicht schon zeigt:
// die gerissene Kette zählt die Serie, die Tabelle die Plätze.
function _newsSpielZahlen(s, anlass){
  const d = s.dataRef || {};
  const out = [];
  if(d.streak && anlass !== 'riss') out.push({v: d.streak, l:'Siege, jetzt beendet', f:'g'});
  if(d.gap && anlass !== 'spitze' && anlass !== 'rang')
    out.push({v: 'Platz ' + (d.winnerRank || d.gap), l:'schlägt Platz ' + (d.loserRank || '')});
  // Die Tordifferenz steht nicht darin: der Kopf zeigt beide Zahlen, und
  // „4 Tore Unterschied" unter einem 6:10 rechnet dem Leser vor, was er
  // gerade gelesen hat.
  return out;
}

// Die Fakten einer Partie-Karte kommen aus den ungebündelten Meldungen
// (`_newsRohIndex`), weil eine Sammelzeile nur Titel und Zeichen trägt.
// Kopf und Fuß, die daraus entstehen, stehen in `30b-news-spieltag.js`.
function _newsRohIndex(){
  const roh = Array.isArray(_cache._stories) ? _cache._stories : [];
  let m = _newsRohMemo.get(roh);
  if(!m){ m = new Map(roh.map(x => [x.id, x])); _newsRohMemo.set(roh, m); }
  return m;
}
const _newsRohMemo = new WeakMap();
function _newsSpielFakten(s){
  const d = s.dataRef || {};
  if(d.type !== 'sammel' || !Array.isArray(d.teile)) return [d];
  const idx = _newsRohIndex();
  return d.teile.flatMap(t => {
    const ref = (t && t.ref) || ((idx.get(t && t.id) || {}).dataRef)
      || {type:t && (t.typ || t.type)};
    // Eine Gruppenzeile traegt mehrere urspruengliche Ereignisse. Die
    // Grafik darf deren Serienwerte nicht verlieren, weil im Rohindex nur
    // die einzelnen IDs und keine kuenstliche Gruppen-ID stehen.
    return ref.type === 'group' && Array.isArray(ref.members)
      ? ref.members.map(m => Object.assign({}, ref, m, {type:m.type || ref.sub})) : [ref];
  });
}
// Die Wende: wie viele Partien in Folge ein Sieger vor dieser verloren hat.
// Gezählt wird rückwärts ab der Partie, nicht ab heute [§C33].
function _newsPleitenVor(pid, m){
  const eig = matchesOfPlayer(pid, matches);
  let i = eig.indexOf(m), n = 0;
  if(i < 0) return 0;
  for(i--; i >= 0; i--){
    const x = eig[i];
    const aSeite = x.a1 === pid || x.a2 === pid;
    if((aSeite && x.winner === 'A') || (!aSeite && x.winner === 'B')) break;
    n++;
  }
  return n;
}
// ── Was die Zeichnung zeigt, sagt der Satz nicht [§C33] ──────────────
// „Vor dem Anstoß lag die Siegchance bei 81 %. Für Maxi bringt der Sieg +7
// Elo." stand über einem Spielfeld, das 81 % und Maxis +7 schon zeigt —
// dieselben zwei Zahlen zweimal in einer Karte. Wie `_ndLead` im Blatt eine
// Ableitung aus dem Text, also gilt sie auch für gespeicherte Karten; der
// Text selbst bleibt, das Blatt und die Datenbank tragen ihn weiter.
// Gestrichen werden nur Sätze, die NICHTS als diese Zahlen sagen: „Nur 30 %
// Siegchance vor dem Anstoß. Trotzdem …" ist die Geschichte eines
// Außenseitersiegs und bleibt stehen. Was die Zeichnung zeigt, sagt sie
// selbst (`zeigt`), statt dass hier in ihrem Markup gesucht wird.
function _newsSpielSatz(desc, zeigt){
  const t = String(desc || '');
  const chance = !!(zeigt && zeigt.chance), elo = !!(zeigt && zeigt.elo);
  if(!chance && !elo) return t;
  return t.split(/(?<=\.)\s+/).map(x => {
    const z = x.match(/^Die Siegchance lag vor dem Anstoß bei (\d+) %(?:, für (.+) bringt der Sieg (\+\d+) Elo)?\.$/);
    if(z){
      if(chance && (elo || !z[2])) return '';
      if(chance) return `Für ${z[2]} bringt der Sieg ${z[3]} Elo.`;
      if(elo && z[2]) return `Die Siegchance lag vor dem Anstoß bei ${z[1]} %.`;
      return x;
    }
    if(chance && /^Vor dem Anstoß lag die Siegchance bei \d+ %\.$/.test(x)) return '';
    if(elo && /^Für .+ bringt der Sieg \+\d+ Elo\.$/.test(x)) return '';
    return x;
  }).filter(Boolean).join(' ');
}

// ── Der Faden [§C33] ────────────────────────────────────────────────
// Eine Karte, die eine frühere fortsetzt, sagt es. Im Feed standen „Anton
// und Johannes verlieren zusammen alles" am 24.08. und „Johannes und Anton
// stürzen die Favoriten" am 26.08. als zwei Fremde — dass die zweite die
// erste beendet, musste der Leser selbst finden. Der Faden ist eine
// ABLEITUNG wie `_isBreaking`: nichts davon wird gespeichert, und er zeigt
// nur auf eine Karte, die im Feed steht und älter ist.
//
// Gefragt wird nach dem Fakt, nicht nach der Karte: eine Sammelkarte trägt
// ihre Zeilen, und die Serie, die sie beendet, kann in einer anderen
// Sammelkarte stecken. Deshalb läuft die Suche über die ungebündelten
// Meldungen (`_newsTexteAuffrischen`, dieselbe Referenz wie in
// `getStoriesCache`) und bildet sie auf die Karte ab, in der sie stehen.
//
// Jede Beziehung wird an den Partien nachgeprüft, nicht am Wortlaut: eine
// Pleitenserie ist erst mit dem ERSTEN Sieg danach gewendet, eine Revanche
// nur die nächste Begegnung derselben zwei Duos, und eine Serie endet nur,
// wenn dazwischen keine Niederlage lag. Ohne diese Prüfung zeigte jede
// spätere Partie derselben Leute auf dieselbe alte Karte.
//
// Die „Rückkehr" aus dem Entwurf gibt es nicht: die Karte der Pause fällt
// mit der nächsten Partie weg (`_consolidateStories` prüft `lastMatchId`),
// also steht nie eine im Feed, auf die eine Rückkehr zeigen könnte.
const NEWS_FADEN_ART = {
  ende:     {kap:'ENDE',          vor:'Beendet'},
  wende:    {kap:'WENDE',         vor:'Beendet'},
  revanche: {kap:'REVANCHE',      vor:'Antwort auf'},
  zurueck:  {kap:'RÜCKEROBERUNG', vor:'Folgt auf'},
  weiter:   {kap:'FORTSETZUNG',   vor:'Setzt fort'},
  spitze:   {kap:'WECHSEL',       vor:'Folgt auf'},
};
const _newsFadenMemo = new WeakMap();
function _newsFaeden(cards){
  const roh = Array.isArray(_cache._stories) ? _cache._stories : [];
  const alt = _newsFadenMemo.get(roh);
  if(alt && alt.m === matches && alt.n === cards.length) return alt.map;
  const map = new Map();
  _newsFadenMemo.set(roh, {m: matches, n: cards.length, map});
  const rohId = new Map(roh.map(x => [x.id, x]));
  // Jede Meldung → die Karte, in der sie steht.
  const karteVon = new Map();
  const glieder = new Map();
  cards.forEach(c => {
    const d = c.dataRef || {};
    const ids = d.type === 'sammel' && Array.isArray(d.teile)
      ? d.teile.map(t => t && t.id).filter(Boolean) : [c.id];
    const g = ids.map(id => rohId.get(id) || (id === c.id ? c : null)).filter(Boolean);
    g.forEach(x => karteVon.set(x.id, c));
    glieder.set(c.id, g);
  });
  const idx = new Map();
  const reihe = [...(matches || [])].sort((a, b) => mts(a) - mts(b));
  reihe.forEach((m, i) => idx.set(m.id, i));
  const sieger = m => m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
  const verlierer = m => m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
  const gleich = (x, y) => x.length === y.length && x.every(v => y.includes(v));
  // Lag zwischen zwei Partien (beide ausgeschlossen) eine, auf die `f` passt?
  const dazwischen = (vonId, bisId, f) => {
    const a = idx.get(vonId), b = idx.get(bisId);
    if(a == null || b == null || a >= b) return true;
    for(let i = a + 1; i < b; i++) if(f(reihe[i])) return true;
    return false;
  };
  // Alle Meldungen, zeitlich von neu nach alt — die jüngste passende ältere
  // Karte gewinnt.
  const alle = [];
  cards.forEach(c => (glieder.get(c.id) || []).forEach(x => alle.push({x, c})));
  alle.sort((p, q) => new Date(q.c.when) - new Date(p.c.when));
  const suche = (c, f) => {
    const t = new Date(c.when).getTime();
    for(const {x, c: k} of alle){
      if(k === c || new Date(k.when).getTime() >= t) continue;
      if(f(x.dataRef || {}, x)) return k;
    }
    return null;
  };
  const RANG = ['ende', 'wende', 'revanche', 'zurueck', 'spitze', 'weiter'];
  cards.forEach(c => {
    let best = null;
    const nimm = (art, ziel) => {
      if(!ziel) return;
      if(!best || RANG.indexOf(art) < RANG.indexOf(best.art)) best = {art, ziel: ziel.id};
    };
    (glieder.get(c.id) || []).forEach(x => {
      const d = x.dataRef || {};
      const t = d.type || '';
      if(t === 'streak_killer' && d.victimPid && d.matchId){
        const v = d.victimPid;
        nimm('ende', suche(c, e => e.type === 'win_streak' && e.pid === v && e.matchId
          && !dazwischen(e.matchId, d.matchId, m => verlierer(m).includes(v))));
      }
      if(t === 'spiel' && d.matchId){
        const m = reihe[idx.get(d.matchId)];
        if(!m) return;
        const w = sieger(m), l = verlierer(m);
        // Die Wende: der erste gemeinsame Sieg nach der Pleitenserie des Duos,
        // oder der erste eigene nach einer Pleitenserie.
        nimm('wende', suche(c, e => e.type === 'team_loss_streak' && e.matchId
          && gleich([e.a, e.b], w)
          && !dazwischen(e.matchId, d.matchId, n => gleich(sieger(n), w))));
        nimm('wende', suche(c, e => e.type === 'loss_streak' && e.matchId && w.includes(e.pid)
          && !dazwischen(e.matchId, d.matchId, n => sieger(n).includes(e.pid))));
        // Die Revanche: die vorige Begegnung genau dieser zwei Duos ging an
        // die andere Seite.
        let vor = null;
        for(let i = idx.get(m.id) - 1; i >= 0; i--){
          const n = reihe[i];
          const seiten = [[n.a1, n.a2], [n.b1, n.b2]];
          if(seiten.some(sd => gleich(sd, w)) && seiten.some(sd => gleich(sd, l))){ vor = n; break; }
        }
        // Nur über Tage: das Rückspiel direkt danach ist am Kicker der Normalfall
        // und keine Geschichte — gemessen waren es sieben von zehn Fäden, und
        // jede zweite Partie eines Spieltags zeigte auf die davor.
        if(vor && gleich(sieger(vor), l) && tagKey(mts(vor)) !== tagKey(mts(m))){
          const k = karteVon.get('spiel_' + vor.id);
          if(k && k !== c && new Date(k.when) < new Date(c.when)) nimm('revanche', k);
        }
      }
      // Dieselbe Serie über mehrere Tage: derselbe Lauf, eine frühere Marke.
      if(/^(win_streak|loss_streak|team_streak|team_loss_streak)$/.test(t) && d.lauf){
        nimm('weiter', suche(c, e => e.type === t && e.lauf === d.lauf
          && (e.pid || '') === (d.pid || '') && (e.a || '') === (d.a || '') && (e.b || '') === (d.b || '')));
      }
      // Derselbe Rekord, dieselbe Monatschronik: wer ihn vor der früheren
      // Karte hielt und ihn jetzt wieder hat, holt ihn zurück.
      if((/^rekord_/.test(t) && d.rekordId) || (t === 'chronik_geholt' && d.titleId)){
        const zielK = suche(c, e => t === 'chronik_geholt'
          ? e.type === 'chronik_geholt' && e.titleId === d.titleId && e.sid === d.sid
          : /^rekord_/.test(e.type || '') && e.rekordId === d.rekordId);
        if(zielK){
          const ze = (glieder.get(zielK.id) || []).map(y => y.dataRef || {})
            .find(e => t === 'chronik_geholt' ? e.titleId === d.titleId : e.rekordId === d.rekordId) || {};
          const jetzt = d.halter || d.playerIds || [];
          const damalsWeg = ze.vorher || [];
          const damalsNeu = ze.halter || ze.playerIds || [];
          const zurueck = jetzt.some(p => damalsWeg.includes(p)) && !jetzt.some(p => damalsNeu.includes(p));
          nimm(zurueck ? 'zurueck' : 'weiter', zielK);
        }
      }
      if(t === 'lead_change' && d.sid){
        nimm('spitze', suche(c, e => e.type === 'lead_change' && e.sid === d.sid));
      }
    });
    if(best) map.set(c.id, best);
  });
  return map;
}
// `nach` ist die Gegenrichtung für das Blatt: dort steht auch, welche
// spätere Karte diese fortsetzt — sonst endet die Geschichte an der Stelle,
// an der man sie gerade liest.
function _newsFadenHtml(faden, stories, nach){
  if(!faden) return '';
  const ziel = (stories || []).find(x => x.id === (nach ? faden.von : faden.ziel));
  const art = NEWS_FADEN_ART[faden.art];
  if(!ziel || !art) return '';
  const tag = datumFmt(ziel.when, 'tm');
  return `<button class="nf-faden" type="button" data-ziel="${esc(ziel.id)}">`
    // Tag vor Titel: der Titel kürzt sich, und in einer Zeile ging dabei das
    // Datum verloren — gerade das sagt, wie weit die Geschichte zurückreicht.
    + `${svgI('faden')}<span><i>${nach ? 'Geht weiter' : esc(art.vor)} · ${esc(tag)}</i> <b>${esc(ziel.title)}</b></span>`
    + `<em>${esc(art.kap)}</em></button>`;
}

// Eine einzige Quelle für den Chronik-Beitrag in Karte und Detailblatt.
// Neue Karten speichern den tatsächlichen Zuwachs beim Wechsel. Bei alten
// Daten lesen wir stattdessen den heute gezählten Beitrag aus der zentralen
// Prestige-Tabelle; ein alter Katalogwert wird nie als neues Plus ausgegeben.
function _newsChronikPrestige(d){
  const ids = [...new Set([
    ...(Array.isArray(d.playerIds) ? d.playerIds : []),
    ...Object.keys((d.prestigeDelta && typeof d.prestigeDelta === 'object')
      ? d.prestigeDelta : {})
  ])];
  const runde = x => Math.round((Number(x) || 0) * 10) / 10;
  if(d.prestigeDelta && typeof d.prestigeDelta === 'object'){
    return {modus:'zuwachs', werte:Object.fromEntries(ids.map(pid =>
      [pid, runde(d.prestigeDelta[pid])]))};
  }
  const werte = {};
  ids.forEach(pid => {
    werte[pid] = 0;
    try {
      const titel = seasonTitleOf(pid, d.sid);
      if(!titel || titel.titleId !== d.titleId) return;
      const q = (prestigeOf(pid).quellen || []).find(x => x.q === 'monat'
        && x.id === d.titleId && (!x.sid || x.sid === d.sid));
      if(q && q.p > 0) werte[pid] = runde(q.p);
    } catch(e){}
  });
  return {modus:'bestand', werte};
}

// Der große Wert einer Tafel-Karte. Ein Rekord lebt von seiner Zahl, nicht
// vom Satz darüber.
function _newsTafelWert(s){
  const d = s.dataRef || {};
  // Bei einer Chronik ist das Prestige die Aussage: der Beleg steht im Satz,
  // die Klasse dahinter, und was sie WERT ist, sagt sonst nichts auf der
  // Karte. Die erste Zahl des Belegs waere „4 von 5" gewesen — richtig, aber
  // ohne Bezug.
  if(d.type === 'chronik_geholt'){
    // Neue Karten tragen die echte Differenz der Monats-Summe je Spieler.
    // Alte persistierte Karten fallen auf `zeigt` zurueck: Eine Chronik, die
    // gar nicht in der Monatstafel steht, darf auch dort kein +X behaupten.
    // ── Eine Null ist kein grosser Wert ─────────────────────────────
    // Auf der Karte stand „0 ZUSAETZLICH", und daneben ein Satz, der den
    // Grund nur andeutete. Eine Null im groessten Schriftgrad der Karte
    // liest sich wie ein Fehler: sie behauptet, der Erfolg sei nichts wert,
    // obwohl er eine legendaere Chronik sein kann. Er zaehlt nur nicht
    // ZUSAETZLICH, weil je Monat ein Eintrag in der Tafel steht [§C32] und
    // ein staerkerer den Platz haelt. Dann faellt der Wert weg, und den
    // Grund nennt der Satz mit Namen.
    const beitrag = _newsChronikPrestige(d);
    if(beitrag.modus === 'zuwachs'){
      const plus = Object.values(beitrag.werte).filter(x => x > 0);
      if(!plus.length) return null;
      const gleich = plus.every(x => x === plus[0]);
      if(plus.length > 1 && gleich) return {v:'+' + plus[0], l:'je Spieler'};
      if(plus.length > 1) return {v:'+' + plus.reduce((a, x) => a + x, 0), l:'zusammen'};
      return {v:'+' + plus[0], l:'Prestige'};
    }
    // Persistierte Karten aus älteren Builds kennen noch keine Differenz.
    // Statt ihren damaligen Katalogwert weiter als neues Plus auszugeben,
    // wird ihr HEUTIGER Laufbahnbeitrag aus derselben Prestigequelle gelesen.
    // Hat inzwischen eine bessere Chronik desselben Monats übernommen, ist
    // dieser Beitrag null.
    const aktuell = Object.values(beitrag.werte).filter(x => x > 0);
    if((d.playerIds || []).length){
      if(!aktuell.length) return null;
      const wert = Math.round(aktuell.reduce((a, x) => a + x, 0) * 10) / 10;
      return {v:String(wert).replace('.', ','), l:'zählt aktuell'};
    }
    if(d.zeigt === false) return null;
    return (d.punkte | 0) > 0 ? {v:'+' + d.punkte, l:'Prestige'} : null;
  }
  if(d.eintraege != null) return {v: d.eintraege, l:'Einträge'};
  // ── „Wechsel" zaehlt nur, was gewechselt hat ─────────────────────
  // Gezaehlt waren alle Zeilen, und damit stand „18 WECHSEL" ueber einem
  // Moment, in dem elf davon Ausbauten waren: derselbe Halter, ein besserer
  // Wert, kein Wechsel [§C33]. Die Aufschrift sagt, was die Zahl zaehlt.
  if(d.teile && d.teile.length){
    const w = d.teile.filter(t => t && t.typ !== 'rekord_gesteigert').length;
    if(w) return {v: w, l: w === 1 ? 'Wechsel' : 'Wechsel'};
    return {v: d.teile.length, l: d.teile.length === 1 ? 'Ausbau' : 'Ausbauten'};
  }
  // „Bestwert" war geraten. Die Zahl kommt aus einem Regex ueber den
  // Fliesstext, und bei „Der Wandler" stand damit „0 %" unter der
  // Aufschrift BESTWERT — der Wert ist dort ein UNTERSCHIED zwischen zwei
  // Positionen, und je kleiner er ist, desto besser. Ein Bestwert von null
  // liest sich wie ein Fehler.
  //
  // Wie die Zahl heisst, weiss der Katalog: die Kammer sagt, was ein
  // Eintrag ueberhaupt ist [§C35]. Ein Liga-Rekord ist ein Bestwert, eine
  // Fuegung nicht, und eine Schattenseite schon gar nicht.
  // ── Und der Wert wird nicht mehr geraten ─────────────────────────
  // Gelesen wurde die erste Zahl des FLIESSTEXTS, ohne Vorzeichen und ohne
  // Einheit: unter „Maxi, Julian, Jane und Johannes uebernehmen ‚Der
  // Hoehenflug'" stand damit „10 %", waehrend der Satz darunter „+10
  // %-Punkte, 70 % in den letzten 10 statt 60 %" nennt — ein Unterschied
  // liest sich als Anteil, und das Plus fehlt. Der Beleg beginnt garantiert
  // mit dem Sortierwert [§C35], also steht er dort und muss nicht gesucht
  // werden; nur alte Karten ohne `ev` fallen auf den Satz zurueck.
  // Ohne „-Punkte": der grosse Wert bleibt kurz, sonst brach „+10 %-Punkte"
  // in zwei Zeilen und drueckte die Schlagzeile daneben auf drei [§C27]. Das
  // Vorzeichen sagt, dass es ein Unterschied ist; die Einheit nennt der Satz.
  const zahl = /^\s*([+−-]?\d+(?:[.,]\d+)?\s?(?:%|Elo|Tore)?)/;
  const m = String(d.ev || '').match(zahl)
         || String(s.desc || '').match(zahl)
         || String(s.desc || '').match(/(\d+[.,]?\d*\s?%|\d+)/);
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
  if(t === 'runde') return 'spiel';                       // die Runde der Vier [§11.6c]
  if(t === 'insignium_stufe') return 'ins';               // die Leiter
  if(t === 'ambient') return 'fakt';                      // leise, eine Zahl
  if(t === 'potd' || t === 'potw') return 'held';         // Wappen groß, Zahlenband
  // Der Meister ist der Held schlechthin. Ohne diese Zeile fiel er auf
  // „fakt" — die leiseste Karte des Feeds trug die Nachricht, die es je
  // Monat genau einmal gibt, und Gold gehört den Titeln [§C25].
  if(t === 'season_recap') return 'held';
  if(t === 'badge_unlocked') return 'badge';              // das Zeichen der Auszeichnung
  // Die gesammelten runden Marken eines Tages sind dieselbe Sache in der
  // Mehrzahl und tragen deshalb dieselbe Form [§C27]. Ohne diese Zeile fiele
  // sie auf „fakt" und waere die leiseste Karte des Feeds.
  if(t === 'badge_marken') return 'badge';
  if(t === 'sammel'){
    // Zwei eigene Formen fuer die beiden zusammenfuehrenden Karten. Sie sahen
    // als Tafel- oder Spieltagskarte aus wie die Meldung, von der sie eine
    // von mehreren buendeln — und die eine handelt von EINEM Spieler, die
    // andere von EINEM Erfolg. Das ist vor dem ersten Satz zu sehen [§C27].
    if(d.quelle === 'spieler') return 'spieler';
    if(d.quelle === 'erfolg')  return 'erfolg';
    // Die kurze Strecke ist dieselbe Kammer und damit dieselbe Form [§C25].
    return (d.quelle === 'tafel' || d.quelle === 'form') ? 'tafel' : 'spiel';
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
  const team = ids => {
    const echt = ids.filter(id => pm[id]);
    return `<span class="nf-erg-avs">${echt
      .map(id => avHtml(pm[id], '', {ins:true, px:48, feuer:0})).join('')}</span>`
      // Ein Name je Zeile: „Johannes & Jannik" in einer Zeile wurde mit „…"
      // gekürzt, und gerade der zweite Name fehlte [§11.6c].
      + `<span class="nf-erg-team">${echt.map(id => `<span>${esc(pm[id].name)}</span>`).join('')}</span>`;
  };
  const aWin = m.winner === 'A';
  return `<div class="nf-erg">
    <div class="nf-erg-s${aWin?' w':''}">${team([m.a1, m.a2])}</div>
    <div class="nf-erg-sc"><b class="${aWin?'w':'v'}">${m.score_a}</b>`
    + `<i>:</i><b class="${aWin?'v':'w'}">${m.score_b}</b></div>
    <div class="nf-erg-s re${aWin?'':' w'}">${team([m.b1, m.b2])}</div>
  </div>`;
}

// Der große Wert links, daneben wofür er steht. Bei einem Rekord ist die Zahl
// die Hauptsache, nicht der Satz darüber.
function _newsWertBlock(wert, label, farbe){
  if(!wert) return '';
  // Ein langer Wert wird kleiner, nicht zweizeilig: „+10 %" brach zu „+10"
  // und „%" untereinander und drueckte die Schlagzeile auf drei Zeilen. Die
  // Stufe steht hier, weil nur hier die Laenge bekannt ist [§C27].
  const n = String(wert).length;
  const lang = n > 8 ? 2 : (n > 5 ? 1 : 0);
  return `<div class="nf-wert ${farbe || ''}"${lang ? ` data-lang="${lang}"` : ''}>`
       + `<b>${esc(String(wert))}</b>`
       + (label ? `<span>${esc(label)}</span>` : '') + `</div>`;
}

// Die Insignium-Leiter: sieben Zeichen, die erreichten hell, das eigene umrandet.
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
    // Die ECHTEN Zeichen, nicht gefärbte Punkte. Vorher stand hier ein
    // CSS-Kreis je Stufe (`repeating-conic-gradient`), und der hatte mit dem
    // Zeichen, das ein Spieler trägt, nichts zu tun: Rosetten in fünf
    // Farben, wo Reif, Schildring und Volutenkranz stehen müssten. `insigniumStufeSvg` trägt seine Verläufe
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

// Die Leiter der ganzen Liga [§C30]: jede Stufe im ersten Grad, darunter,
// wie viele sie tragen. Gezeichnet im Violett der Vorlage — die Karte gehört
// keinem Spieler, also auch keinem Rang. Eine Stufe ohne Träger steht leise
// da, aber sie steht da: sie ist der Grund der Karte.
function _newsLigaLeiter(L){
  try {
    const je = Array.isArray(L && L.je) ? L.je : [];
    const f = INSIGNIEN.map((ins, i) => {
      const n = je[i] | 0;
      let z = '';
      try { z = insigniumStufeSvg(ins.key, INS_BILD_RANG, 0, 0) || ''; } catch(e){ z = ''; }
      return `<span class="nf-ll-f"><span class="nf-lt-p${n ? ' hat' : ''}">${z}</span>`
        + `<span class="nf-ll-n num${n ? '' : ' leer'}">${n || '–'}</span></span>`;
    }).join('');
    return `<div class="nf-leiter nf-ll">${f}<span class="nf-lt-t">Träger je Stufe</span></div>`;
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

// ── Die Meisterbühne im Feed [§C31] ─────────────────────────────────
// Das Podest kommt aus derselben Rangliste wie im Saison-Rückblick
// (`saisonRang`); die Karte nennt aber, was bei ihrer Entstehung galt, also
// steht der Meister aus dem `dataRef` in der Mitte. Kleiner als im Blatt:
// 64 und 52 px, darunter bliebe vom Wappen nichts [§6]. Hinter dem Ersten
// liegt ein Strahlenkranz in Gold — er ist Licht und keine Form, und bei
// Bewegungsruhe steht er still.
function _newsMeisterKopf(d){
  try {
    const rang = saisonRang(d.sid);
    if(!rang.length) return '';
    return `<div class="nf-meister"><span class="nf-ms-strahl" aria-hidden="true"></span>${
      saisonPodestHtml(d.sid, rang, {px1:64, px:52, klasse:'nf-podest', attr:'data-mpid'})}</div>`;
  } catch(e){ return ''; }
}
function _newsMeisterFuss(d){
  try {
    const te = Array.isArray(d.topElo) ? d.topElo : [];
    const ids = te.map(x => x && x.id).filter(Boolean);
    const sp = saisonSpitze(d.sid);
    const n = sp.tage[d.championId] || 0;
    const vorsprung = te[0] && te[1] ? Math.max(0, te[0].elo - te[1].elo) : null;
    const r = saisonRang(d.sid).find(x => x.id === d.championId);
    const sp2 = r ? r.wins + r.losses : 0;
    return saisonRennenHtml(d.sid, ids, {klein:true}) + _newsZahlband([
      {v: sp.spieltage ? n + ' von ' + sp.spieltage : null, l:'Spieltage vorn', f:'g'},
      {v: vorsprung != null ? '+' + vorsprung : null, l:'Elo vor Platz 2'},
      {v: sp2 ? Math.round(r.wins / sp2 * 100) + ' %' : null, l:'Siegquote'}
    ]);
  } catch(e){ return ''; }
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
      // ── Der Monat heißt, wie er heißt ────────────────────────────
      // „Die Saison 2026-08 ist Geschichte" nannte die Saison-ID, eine
      // Zeichenkette, die niemanden interessiert, und „Vor Johannes." war ein
      // Satz ohne Verb [§C33]. Elo, Vorsprung und Tage vorn stehen auf der
      // Karte im Podest und im Zahlenband; der Nachsatz erzählt, was dort
      // nicht steht: wann der Titel entschieden war.
      case 'season_recap': {
        const te = Array.isArray(d.topElo) ? d.topElo : [];
        const cid = d.championId || (te[0] && te[0].id);
        const champ = nm(cid);
        const monat = d.sid && typeof seasonLabel === 'function' ? seasonLabel(d.sid) : 'Die Saison';
        let lauf = '';
        try {
          const sp = saisonSpitze(d.sid), f = sp.folge;
          const mm = String(d.sid || '').slice(5, 7);
          let i = f.length - 1;
          while(i > 0 && f[i - 1].pid === cid) i--;
          if(f.length && f[f.length - 1].pid === cid){
            lauf = i === 0
              ? ` ${champ} lag vom ersten Spieltag an vorn und gab die Spitze nie ab.`
              : ` Die Spitze wechselte ${sp.wechsel === 1 ? 'einmal' : (_BELEG_ZAHL[sp.wechsel] ? _BELEG_ZAHL[sp.wechsel] + 'mal' : sp.wechsel + '-mal')}, `
                + `und vom ${String(f[i].day).padStart(2, '0')}.${mm}. an blieb ${champ} vorn.`;
          }
        } catch(e){}
        return `${monat} ist entschieden: ${champ} holt den Titel.` + lauf;
      }
      // ── Der Nachsatz nennt eine Zahl ────────────────────────────
      // „Machtwechsel an der Tabellenspitze: X verdraengt Y und uebernimmt
      // die Fuehrung. Das Titelrennen ist wieder voellig offen." war ein
      // Etikett mit Doppelpunkt am Satzanfang [§C33], nannte keine einzige
      // Zahl und behauptete eine offene Lage, die bei 91 Elo Vorsprung
      // nicht stimmt. Und es stand „X verdraengt X", wenn X die Spitze am
      // selben Tag abgab und zurueckholte.
      case 'lead_change': {
        const wv = Number(d.wechsel) || 1;
        const holt = d.zurueck
          ? `${nm(d.newLeader)} holt sich die Spitze von ${nm(d.prevLeader)} zurück`
          : `${nm(d.newLeader)} verdrängt ${nm(d.prevLeader)} von der Spitze`;
        return holt
          + (d.elo != null ? ` und steht bei ${d.elo} Elo.` : '.')
          + (d.gap != null ? ` ${d.gap} Elo Vorsprung auf den Zweiten.` : '')
          + (wv > 1 ? ` ${wv} Wechsel an einem Tag.` : '');
      }
      case 'top_clash': {
        // p1/p2 (v9.3): Platz-1- bzw. Platz-2-Spieler namentlich. Fallback auf
        // Sieger-Team für alte, vor v9.3 persistierte Stories.
        const a = d.p1 ? nm(d.p1) : (Array.isArray(d.winners) ? d.winners.map(nm).join(' & ') : '');
        const b = d.p2 ? nm(d.p2) : null;
        return b
          ? `Gipfeltreffen an der Spitze: Tabellenführer ${a} bezwingt Verfolger ${b} im direkten Duell und baut den Vorsprung an der Spitze aus.`
          : `Gipfeltreffen an der Spitze: ${a} setzt sich im Spitzenspiel durch und zieht weiter davon.`;
      }
      // Der Countdown hat keinen Nachsatz. Er hiess „Nur noch 6 Tage bis zum
      // Saisonende: Martin führt, doch der Vorsprung von 11 Elo ist alles
      // andere als sicher. Jetzt zählt jedes Spiel." Drei Fehler: ein Etikett
      // mit Doppelpunkt am Satzanfang, jede Zahl darin stand in der
      // Schlagzeile („Noch 6 Tage um den Monat") und im Text („Martin führt
      // mit 390 Elo, Leon liegt 11 dahinter") schon, und der Schlusssatz
      // nennt keine [§C33]. Wo es nichts Neues zu sagen gibt, gibt es keinen
      // dritten Satz: der Aufrufer unterdrueckt den Rueckfall auf `desc`.
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
      // ── Eine gebuendelte Karte erbt ihr Breaking von einer Zeile ──
      // Der Schalter kennt sieben Typen und fiel sonst auf `desc` zurueck;
      // weil der Nachsatz bei Gleichheit unterdrueckt wird, blieb er auf
      // jeder gebuendelten Breaking-Karte ganz leer. Gezeigt wird deshalb
      // der lange Satz DES ANLASSES: die Zeile im Sammelband nennt ihn
      // kurz, der Nachsatz erzaehlt ihn aus [§C33].
      case 'sammel': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        const anlass = teile.find(t => t && t.brk) || null;
        const lang = anlass && String(anlass.text || '').trim();
        if(lang) return lang;
        break;
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
// aber nach Ortszeit (`tagKey`) — an einer Tagesgrenze fielen beide
// auseinander und die Karte des Tages haenge am falschen Tag.
function _newsTagMs(dayKey){
  try {
    const out = [];
    (matches || []).forEach(m => { if(tagKey(m.created_at) === dayKey) out.push(m); });
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
    match_result:760,
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
// ── Wer kann das Band tragen? [§C33] ────────────────────────────────
// Vier Sorten nicht, und jede aus ihrem eigenen Grund.
// **Breaking** nicht: die Karte ist im Feed ohnehin die lauteste — voller
// Rahmen, pulsierender Balken, Schein hinter der ganzen Flaeche. Das Band
// darueber sagt dasselbe ein zweites Mal [§C27] und nimmt es genau der
// Karte, die sonst keine Moeglichkeit hat, herauszustehen.
// **Der Spieler des Tages** nicht: er ist eine Pflichtkarte und steht an
// jedem gewerteten Spieltag da. Er traegt seine Goldkante schon und haette
// das Band an jedem ruhigen Tag von selbst — dann zeichnet es nichts aus.
// **Ein Rueckblick** nicht: Woche, Monat und Saison erzaehlen von einem
// Zeitraum, das Band gehoert dem TAG.
// **Eine Karte mit negativer Richtung** nicht: das Band ist golden, und Gold
// gehoert dem Titel [§C25]. Gemessen trug „Anton: Die Talfahrt" — fuenf
// Niederlagen in Folge, eine Schande — an einem Spieltag das Band und damit
// den goldenen Auswahlschimmer, als waere die Pleite die Geschichte des Tages.
// Die Liste steht hier und nicht im Aufruf, weil `tests/ambient` und
// `tests/blatt` dieselbe Frage stellen und sie sich vorher jeder selbst
// beantwortet haben — zwei Listen fuer dieselbe Aussage waere eine zu viel.
const NEWS_TAGKARTE_OHNE = new Set(['ambient', 'dry_spell', 'season_endgame',
  'quiet_week', 'season_start', 'potd', 'potw', 'woche', 'chronik_monat',
  'season_recap', 'runde']);
function _newsTagKarteWuerdig(st){
  if(NEWS_TAGKARTE_OHNE.has(((st && st.dataRef) || {}).type || '')) return false;
  if(_newsIstNegativ(st)) return false;
  return !_isBreaking(st);
}
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
  // Ein Spiel ist kein Spieltag: bei genau einer Partie gibt es kein Band.
  if(tagMs.length < NEWS_LIMITS.tagKarteMin) return null;
  if(tagMs.length >= NEWS_LIMITS.tagKartePartien){
    // Nicht ab der Zahl allein, sondern ab dem MOMENT, in dem sie erreicht
    // ist: sonst stuende das Band am Morgen des naechsten Tages rueckwirkend
    // auch ueber einer Karte, die vor der fuenften Partie entstanden ist.
    const zeiten = tagMs.map(m => mts(m)).sort((a, b) => a - b);
    if(Date.now() < zeiten[NEWS_LIMITS.tagKartePartien - 1]) return null;
  } else {
    const frei = new Date(dayKey + 'T00:00:00');
    frei.setHours(NEWS_LIMITS.tagKarteStunde, 0, 0, 0);
    if(Date.now() < frei.getTime()) return null;
  }
  const kandidaten = items.filter(_newsTagKarteWuerdig);
  if(!kandidaten.length) return null;
  const beste = kandidaten.slice().sort((a, b) =>
    (_newsTagSpannung(b) - _newsTagSpannung(a))
      || ((b.prio || 0) - (a.prio || 0))
      || String(a.id || '').localeCompare(String(b.id || '')))[0];
  if(!beste) return null;
  // Staerker als eine Tagesbilanz, sonst kein Band [§C33].
  if(_newsTagSpannung(beste) < (NEWS_LIMITS.tagKarteSpannung || 0)) return null;
  return beste.id;
}
function _renderNewsFeed(){
  _sheetSetReopen(()=>_renderNewsFeed());
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  const stand = _newsLesestand();
  const gelesen = s => _newsGelesen(s, seen, stand);
  // Vier Chips, nicht elf. Elf Rubriken sind eine Sortierhilfe für den, der
  // sie gebaut hat, nicht für den, der liest. Jeder Chip trägt seine Anzahl,
  // damit man vorher sieht, ob sich das Tippen lohnt.
  const _istTafel   = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel'
    || (s.dataRef||{}).quelle === 'form';
  const _istSpieltag = s => {
    const d = s.dataRef || {};
    // Die Filter sind redaktionelle Seiten, keine sich überschneidenden
    // Suchbegriffe. Eine Tafelmeldung darf ihren Match-Zeitpunkt tragen,
    // ohne deshalb zugleich im Spieltag-Chip zu erscheinen.
    if(_istTafel(s)) return false;
    if(d.type === 'ambient') return false;
    return !!(d.matchId || d.type === 'potd' || d.type === 'woche' || d.type === 'runde' ||
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
  let listHtml, nachreichen = [];
  if(!cards.length){
    listHtml = '<div class="nf-empty">Keine Stories in dieser Auswahl.</div>';
  } else {
    // Über alle Karten des Feeds, nicht nur die des Filters: der Faden
    // gehört der Geschichte und nicht der Auswahl.
    const faeden = _newsFaeden(stories);
    const jeTag = new Map();
    stories.forEach(st => {
      const k = tagKey(st.when);
      if(!jeTag.has(k)) jeTag.set(k, []);
      jeTag.get(k).push(st);
    });
    const gruppen = [];
    cards.forEach(st => {
      const k = tagKey(st.when);
      const g = gruppen[gruppen.length-1];
      if(g && g.k === k) g.items.push(st);
      else gruppen.push({k, label:_newsDayLabel(st.when), datum:_newsDayDate(st.when), items:[st]});
    });
    gruppen.forEach(g => {
      const neu = g.items.filter(st => !gelesen(st)).length;
      // Die Wahl gehoert dem ganzen Tag, nicht dem aktiven Filter. Sonst
      // koennte dieselbe Tafel je Reiter eine andere „Karte des Tages" haben.
      const alleDesTages = jeTag.get(g.k) || [];
      const tagesKarte = _newsTagKarte(alleDesTages, g.k);
      // Der Kopf traegt Wochentag, Datum und die Zahl der Karten — sonst
      // nichts. Die Bilanz („3 Partien · 4 Spieler") und die Gesichter standen
      // darunter und wiederholten, was die Karten des Tages ohnehin zeigen:
      // vier Wappen ueber vier Karten, auf denen dieselben vier Wappen
      // stehen. Der Kopf ist eine Marke auf dem Zeitstrahl, kein Vorspann.
      // Der Tagesschluessel steht am Kopf: die Bilanz des Tages ist aus dem
      // Markup verschwunden, und ohne ihn liesse sich nicht mehr pruefen, ob
      // an diesem Tag ueberhaupt gespielt wurde.
      const kopf = `<div class="nf-tag" data-tag="${esc(g.k)}">
        <div class="nf-tag-z1"><span class="nf-tag-wt">${esc(g.label)}</span>`
        + `<span class="nf-tag-dt">${esc(g.datum)}</span>`
        + `<span class="nf-tag-n${neu?' neu':''}">${neu ? neu + ' NEU' : g.items.length + (g.items.length===1?' KARTE':' KARTEN')}</span></div>`
        + `</div>`;
      // Keine fertig gezeichnete zweite Haelfte im Speicher: nur kleine
      // Auftraege. Auch ein einzelner sehr grosser Tag bleibt teilbar.
      for(let i = 0; i < g.items.length; i += 4){
        const stapel = g.items.slice(i, i + 4), erster = i === 0;
        nachreichen.push({tag:g.k, erster, kopf:erster ? kopf : '', anzahl:stapel.length,
          html:() => stapel.map(st => _newsCardHtmlM2(st, gelesen(st),
            st.id === tagesKarte, _newsFadenHtml(faeden.get(st.id), stories))).join('')});
      }
    });
    // ── Zuerst, was man sieht ─────────────────────────────────────────
    // Der Feed trägt rund siebzig Karten und 3400 Knoten, und beim Öffnen
    // rechnete der Browser Stil und Layout für alle auf einmal: gemessen
    // 75 ms ohne und 350 ms mit gedrosselter CPU, und das Skript selbst war
    // davon nicht einmal ein Zehntel. Auch die Grafik-/Markup-Arbeit gehoert
    // erst zu dem Teil, der dran ist. Vorher wurde ALLES gebaut und nur das
    // Einfuegen vertagt. Zwoelf Karten zuerst, der Rest in kleinen Takten.
    let n = 0, sofort = 0;
    const oben = [];
    while(sofort < nachreichen.length && n < NEWS_FEED_SOFORT){
      const job = nachreichen[sofort++]; n += job.anzahl;
      // Fortsetzung desselben Tages ohne zweiten Tageskopf/Feedcontainer.
      if(job.erster){
        if(oben.length) oben.push('</div>');
        oben.push(job.kopf + `<div class="nf-feed" data-feed-tag="${esc(job.tag)}">`);
      }
      oben.push(job.html());
    }
    oben.push('</div>');
    listHtml = oben.join('');
    nachreichen = nachreichen.slice(sofort);
  }

  const datum = new Date().toLocaleDateString('de-DE',
    {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  // Der Gelesen-Knopf steht dort, wo auch die Zahl steht, die ihn erklärt.
  // Ohne offene Stories fällt beides weg.
  const offen = stories.filter(x => !gelesen(x)).length;
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
    <div class="nf-wrap nf-liste" style="padding-top:0">${listHtml}</div>
  `);
  const sheetEl = document.getElementById('sheet');
  const liste = sheetEl.querySelector('.nf-liste');
  _newsFeedOffen = nachreichen.length && liste
    ? {liste, jobs:nachreichen, index:0, version:_cache.version} : null;
  if(_newsFeedOffen) _newsFeedPlan(_newsFeedOffen);

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
  // Ein Lauscher an der Liste statt einer an jeder Karte: die Karten, die
  // erst nach dem ersten Bild dazukommen, sind beim Binden noch nicht da.
  if(liste) liste.onclick = ev => {
    // Der Faden öffnet die frühere Karte, nicht die, in der er steht.
    const f = ev.target.closest && ev.target.closest('.nf-faden[data-ziel]');
    if(f){ ev.stopPropagation(); openNewsDetail(f.dataset.ziel); return; }
    // Karten + Hero klickbar → Detail.
    const el = ev.target.closest && ev.target.closest('[data-sid]');
    if(!el || !liste.contains(el)) return;
    const sid = el.dataset.sid;
    _newsMarkSeen(stories.find(s => s.id === sid) || sid);
    el.classList.add('read'); el.classList.remove('important');
    el.querySelector('.nf-dot')?.remove();
    newsBadgeRefresh();
    openNewsDetail(sid);
  };
}
// Der Rest des Feeds, nach dem ersten Bild. Steht die Liste nicht mehr im
// Dokument — eine Karte wurde schon geöffnet, das Blatt geschlossen —,
// fällt er weg: angehängt landete er sonst im nächsten Blatt.
let _newsFeedOffen = null;
const NEWS_FEED_SOFORT = 12;
function _newsFeedRest(alles = true){
  const o = _newsFeedOffen;
  if(!o) return;
  if(!o.liste.isConnected || !_isNewsFeedOpen()){ _newsFeedOffen = null; return; }
  if(o.version !== _cache.version){ _renderNewsFeed(); return; }
  // Direkter Aufruf kann weiterhin vollstaendig fuellen (z.B. Geometrie-
  // Pruefung). Automatisch hoechstens vier Karten je ruhigem Takt.
  do {
    const job = o.jobs[o.index++];
    const ziel = job.erster ? o.liste : o.liste.querySelector(`[data-feed-tag="${job.tag}"]`);
    if(!ziel){ _renderNewsFeed(); return; }
    const html = job.html();
    ziel.insertAdjacentHTML('beforeend', job.erster
      ? job.kopf + `<div class="nf-feed" data-feed-tag="${esc(job.tag)}">${html}</div>` : html);
  } while(alles && o.index < o.jobs.length);
  if(o.index >= o.jobs.length) _newsFeedOffen = null;
}
function _newsFeedPlan(o){
  requestAnimationFrame(() => {
    // Ein Filterwechsel/Neuoeffnen hat einen eigenen Auftrag. Der alte
    // Callback darf nicht versehentlich DIESE neue Liste nachreichen.
    if(_newsFeedOffen !== o) return;
    const zeichnen = () => {
      if(_newsFeedOffen !== o) return;
      _newsFeedRest(false);
      if(_newsFeedOffen === o) _newsFeedPlan(o);
    };
    if(window.requestIdleCallback) window.requestIdleCallback(zeichnen, {timeout:100});
    else setTimeout(zeichnen, 0);
  });
}

