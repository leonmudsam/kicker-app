// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  §11  LIGA NEWS / STORY-SYSTEM                                        ║
// ║  ───────────────────────────────────────────────────────────────────  ║
// ║  Erzeugt redaktionelle "Schlagzeilen" aus bestehenden Liga-Daten.     ║
// ║  KEINE neuen Berechnungen — nur Interpretation existierender Caches.  ║
// ║                                                                       ║
// ║   §11.1  Story-Generator (alle Typen)                                 ║
// ║   §11.2  Cache (versionsgebunden an matches.length + _cache.version)  ║
// ║   §11.3  LocalStorage (Read-State, Ring-Buffer max 200)               ║
// ║   §11.4  Header-Badge-Refresh                                         ║
// ║   §11.5  Mini-Popup (newsPopover)                                     ║
// ║   §11.6  Voller Feed mit Filter (newsFeedFull)                        ║
// ║   §11.7  Story-Detail (newsDetail) — dynamisch je Typ                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── §11.0 — Konstanten ──────────────────────────────────────────────
// News-Debug-Flag (v8.4): hält console-Logs des News-Systems aus der
// Produktiv-Konsole heraus. Standard: aus. Zur Laufzeit aktivierbar über
// DevTools — KEIN Reload nötig:  window.NEWS_DEBUG = true
// Alle News-Logs laufen über `if(NEWS_DEBUG || window.NEWS_DEBUG) console…`.
const NEWS_DEBUG = false;

// Kategorien (Filter-Pills + CSS-Klassen über `nv-cat-${cat}`).
// label = Anzeige im Filter; descLabel = im Detail- und Story-Header.
const NEWS_CATEGORIES = {
  // v9: „Breaking" ist KEIN eigener Generator-Typ, sondern eine ANZEIGE-Kategorie.
  // _isBreaking() promotet die ultra-seltenen, liga-relevanten Ereignisse
  // (neuer Spitzenreiter, Platz-1-Duell, legendäres Badge, Saison-Klimax)
  // display-seitig hierher — wirkt auf bestehende UND neue persistierte Rows.
  breaking:   {label:'Breaking',    descLabel:'Breaking News',    ic:'bolt'},
  highlight:  {label:'Highlights',  descLabel:'Highlight',        ic:'crown'},
  season:     {label:'Saison',      descLabel:'Saison',           ic:'rocket'},
  badge:      {label:'Awards',      descLabel:'Badge & Awards',   ic:'medalTrio'},
  fun:        {label:'Fun Facts',   descLabel:'Fun Fact',         ic:'thriller'},
  rivalry:    {label:'Rivalität',   descLabel:'Rivalität',        ic:'crossedSwords'},
  team:       {label:'Teams',       descLabel:'Team',             ic:'users'},
  comeback:   {label:'Comebacks',   descLabel:'Comeback',         ic:'comeback'},
  // „Persönlich" hieß nie „deins" — die App kennt keine Spielerzuordnung,
  // jeder sieht alles. Die Kategorie sammelt, was ein Einzelner erreicht hat:
  // 300 Elo geknackt, eine Bestmarke gesetzt. „Spielerzahl" stand als
  // Kartenaufschrift über „Maxi knackt 300 Elo" und las sich, als ginge es
  // um die Anzahl der Spieler.
  personal:   {label:'Spieler',     descLabel:'Meilenstein',      ic:'trendUp'},
  history:    {label:'Historie',    descLabel:'Historie',         ic:'calendar'},
  // Alles, was auf der Ewigen Tafel steht: Liga-Rekorde, Fügungen [§C35],
  // Monatschroniken und die Insignium-Stufen. Der ganze Awards-Reiter kam im
  // Feed nicht vor — wer einen Rekord übernahm, erfuhr es nur, wenn er
  // selbst nachsah.
  tafel:      {label:'Tafel',       descLabel:'Ewige Tafel',      ic:'trophyStar'},
  misfortune: {label:'Pechvogel',   descLabel:'Pechvogel',        ic:'dramaTear'},
};

// LocalStorage-Keys (versioniert für künftige Migrations)
// Ambient-Stories sind weiterhin eine ruhige Kartenform, aber nicht mehr ein
// einziger grauer Block. Ihre bereits persistierte `ambientRubrik` steuert
// Rubrikname und Farbschnitt: vier vertraute Familien statt sieben neuer
// Vollfarben. So unterscheiden sich Liga-Zahl, Form, Duell und Laufbahn schon
// beim Ueberfliegen, ohne den Feed bunt oder eine Zahl faelschlich golden zu
// machen [§C25]. `ton` ist zugleich der kontrollierte CSS-Klassensuffix.
const NEWS_AMBIENT_STIL = {
  liga:         {label:'LIGA IN ZAHLEN',    ton:'liga'},
  persoenlich:  {label:'SPIELER IM FOKUS',  ton:'persoenlich'},
  form:         {label:'DIE FORMKURVE',     ton:'form'},
  duell:        {label:'DUELL IN ZAHLEN',   ton:'duell'},
  laufbahn:     {label:'AUS DER LAUFBAHN',  ton:'laufbahn'},
  chronik:      {label:'AUS DER CHRONIK',   ton:'chronik'},
  auszeichnung: {label:'AUSZEICHNUNGEN',    ton:'auszeichnung'},
};

const NEWS_LS_SEEN  = 'eso_news_seen_v1';
// ── Der Lesestand ───────────────────────────────────────────────────
// Der Zeitpunkt der neuesten Karte, die beim letzten „Alles gelesen" im
// Feed stand. Ohne ihn zaehlte die App als neu, was sie noch nicht in der
// Liste der gelesenen IDs findet — und das ist nicht dasselbe: eine Karte
// faellt unter einen Deckel, eine Schlagzeile verdraengt eine gleichlautende,
// eine Sperrfrist laeuft ab. Gemessen ueber fuenfundvierzig Tage trugen 81
// von 267 neu auftauchenden Karten (30 %) einen Zeitpunkt, der laenger
// zurueckliegt als alles, was der Leser schon gesehen hat: „Martin und Alex
// brechen Julians 7er-Serie" vom 09.07. kam am 14.07. und am 20.07. erneut
// als neu hoch. Neu ist, was SEIT dem letzten Blick dazugekommen ist.
const NEWS_LS_STAND = 'eso_news_stand_v1';
const NEWS_LS_TOAST = 'eso_news_toast_v1';  // v8.1: zeitstempel + count des letzten Toasts
const NEWS_LS_MAX_SEEN = 600; // Ring-Buffer-Limit (deckt das ganze Fenster)
const NEWS_TOAST_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h zwischen identischen Toast-Counts

// Generator-Limits — Schutz gegen zu viele Stories pro Typ
const NEWS_LIMITS = {
  // v9.4: bewusst kleiner → weniger News-Flut direkt nach Matches.
  topForm: 2,       // max Spieler "in Top-Form" gleichzeitig
  lossStreak: 2,
  winStreak: 8,     // jüngste echte Serienmarken im 14-Tage-Fenster
  giantSlayer: 4,   // starke Upsets: höchstens einer je Spieltag
  jubilee: 3,
  badgeUnlocked: 6, // letzte N freigeschalteten Badges
  // Zwei Rivalitätskarten mit derselben Schlagzeile und einer anderen Zahl
  // sind kein Paar, sondern eine Wiederholung. Es bleibt die mit den meisten
  // Duellen.
  rivalry: 1,
  // Meilensteine eines Paares (50., 100., …). Über die Ligageschichte reißen
  // viele Paare eine Schwelle; gemeldet werden die jüngsten. Gemessen wurden
  // sechzehn gebildet und persistiert, von denen zwei im Feed standen.
  rivalryMarke: 4,
  // Ein Tag trägt fünf Karten. Gemessen trug ein Spieltag neun, und die
  // schwächsten vier waren Wiederholungen bereits erzählter Entwicklungen.
  // Breaking zählt nicht mit [§C33].
  // Ein starker Spieltag kann viele Rekorde und Monatschroniken zugleich
  // verschieben. Sie werden vor der Bündelung nicht mehr abgeschnitten:
  // dieselbe Partie bzw. Minute ergibt später eine einzige vollständige
  // Tafel-Karte. So sinkt die Kartenzahl, nicht der fachliche Inhalt.
  // Vier, nicht fuenf: der Deckel zaehlt seit der Korrektur nur, was er auch
  // wegnehmen kann, und Breaking und die Pflichtkarte kommen dazu. Bei fuenf
  // trug ein Spieltag damit gemessen sieben Karten — das ist wieder ein
  // Protokoll. Vier eigene Plaetze plus der Sieger des Tages plus, wenn es
  // eines gibt, ein Breaking: gemessen drei bis sechs Karten je Spieltag.
  proTag: 4,
  // So viele Plätze eines Tages gehören der Ewigen Tafel, wenn sie sich an
  // diesem Tag bewegt hat. Die Mischung war vorher eine Quote über das ganze
  // Fenster, und erfüllt wurde sie, indem Spieltagskarten wegfielen: gemessen
  // schnitt das den Feed von 42 auf 23 Karten und leerte zwei von sieben
  // Spieltagen vollständig, ohne der Tafel eine einzige Karte hinzuzufügen.
  // Reserviert statt quotiert, und je Tag statt je Fenster [§C33].
  tafelProTagMin: 1,
  // Wie viele Zeilen eine Sammelkarte im Band zeigt. „Bündeln darf nichts
  // verstecken" war fuer zwei bis vier Teile geschrieben; gemessen trug ein
  // Tafel-Moment neunzehn — fuenf Bestmarken, dreizehn Monatschroniken und
  // ein Insignium —, und die Karte bedeckte den ganzen Bildschirm. Damit
  // versteckt gerade die vollstaendige Liste alles andere. Die staerksten
  // sechs stehen auf der Karte (`teile` ist nach `prio` sortiert, also
  // Bestmarke vor Monatschronik vor Insignium), die Zahl dahinter fuehrt
  // ins Blatt, und dort steht weiterhin jede Zeile [§C33].
  // Sechs waren zu viele, sobald ein Spieltag die Tafel wirklich bewegt:
  // gemessen am 28.09. trug ein Tafel-Moment achtzehn Zeilen, davon elf
  // Ausbauten, und die Karte war ein Block aus Namen. Vier stehen auf der
  // Karte — zuerst, was Wirkung hat [§C33] —, die Zahl dahinter fuehrt ins
  // Blatt, und dort steht weiterhin jede Zeile.
  sammelZeilen: 4,
  // Ab wann die Karte des Tages steht [§C33]. Acht Partien war der Median
  // der Liga und damit eine Behauptung ueber den TAG: erreicht an 64 % der
  // Spieltage, und die anderen 36 % warteten bis 19 Uhr auf ein Band, das
  // laengst faellig war. Gemessen an den 19 Spieltagen vom 28.07. bis 26.08.
  // hatten fuenf Partien schon vierzehn von ihnen um die Mittagszeit
  // zusammen. Nach der fuenften Partie ist ein Spieltag entschieden genug
  // fuer ein Band; die kuerzeren Tage faengt weiter die Stunde auf, keine
  // der 466 Partien hat nach 18:31 angefangen.
  tagKartePartien: 5,
  tagKarteStunde: 19,
  // Bei genau einer Partie gar keine: ein Spiel ist kein Spieltag. Das Band
  // saesse dort auf der einzigen Karte, die es ohnehin gibt, und sagte damit
  // nichts — es zeichnet aus, was sich gegen andere Karten durchgesetzt hat.
  tagKarteMin: 2,
  // ── Und nur fuer eine Geschichte, die etwas hergibt ──────────────
  // Das Band ging an die staerkste Karte des Tages, auch wenn die staerkste
  // der schwaechste Bau des Generators war: gemessen trug ein Spieltag es auf
  // „Der groesste Ausschlag des Tages" mit 564 Punkten — unter dem Wert einer
  // Tagesbilanz (620). Ein Band, das eine beliebige Karte auszeichnet,
  // zeichnet nichts aus. Bleibt niemand darueber, traegt an diesem Tag keine
  // Karte das Band [§C33].
  tagKarteSpannung: 620,
  // Dieselbe Aussage über dieselben Leute kommt drei Tage lang nur einmal.
  // „Martin baut ‚Der Maßstab' aus" gilt nach jedem gewonnenen Spiel aufs
  // Neue, jedes Mal mit einem Prozentpunkt mehr: die ID ist damit eine andere,
  // die Karte für den, der scrollt, dieselbe. Gemessen standen an vier
  // aufeinanderfolgenden Spieltagen vier davon im Feed. Drei Tage, weil die
  // Liga an zwei bis drei Tagen der Woche spielt und die Meldung damit
  // höchstens einmal je Spielwoche wiederkommt.
  sperreTage: 3,
  // Legacy-Wert fuer alte Diagnose-Mockups. Die produktive Anzeige kappt
  // innerhalb des Datumsfensters keine publizierten Stories mehr [§C33].
  total: 120,
};

// ─── §11.0d — Wie weit der Feed zurueckreicht ────────────────────────
// Vierzehn Tage. Vorher stand die Zahl nirgends: der Feed las die 100
// juengsten Zeilen der Datenbank und zeigte davon 50 — bei achtzehn bis
// sechsundzwanzig Karten je Spieltag reichte das rund acht Tage weit, und
// wer nach einer Woche Pause hineinsah, fand seinen eigenen Spieltag nicht
// mehr. Eine Zeilenzahl ist keine Fensterbreite: sie haengt daran, wie viel
// gerade los war.
//
// Der Schnitt liegt jetzt am DATUM und nicht an der Zeilenzahl. Die Grenze
// darueber ist nur noch ein Schutz gegen eine Antwort ohne Ende — an den
// echten Zahlen sind vierzehn Tage rund 250 Zeilen.
const NEWS_FENSTER_TAGE = 14;
const NEWS_DB_ZEILEN = 500;

// ─── §11.0c — Wie oft dieselbe Auszeichnung Nachricht ist ────────────
// Die Karte entstand jedes Mal neu, wenn jemand ein Badge wieder holte.
// Gemessen über die ganze Ligageschichte stand „Martin: Mauer" damit
// vierzehnmal im Feed, wortgleich — der Text ist die Bedingung aus dem
// Katalog und ändert sich nie. Insgesamt gingen 93 der 866 je gebildeten
// Karten auf wiederholte Auszeichnungen zurück, mehr als auf jede andere
// Quelle.
//
// Gemeldet wird deshalb das ERSTE Mal und danach nur noch runde Marken —
// Anders als das Prestige muss die Zeitung aber nicht jedes Erreichen
// melden: Dort wächst der Wert gedämpft weiter [§C34], hier ist der
// dreißigste Zittersieg keine neue Geschichte; der fünfundzwanzigste ist
// eine Zahl, über die man redet.
// ─── Der Schlusssprint einer Saison ──────────────────────────────────
// „Noch fünf Tage" entstand an jedem der letzten sieben Tage, egal wie klar
// die Sache war: gemessen lag der Vorsprung dabei auch schon bei 91 Elo, und
// die Karte hieß trotzdem so. Eine Entscheidung ist offen, wenn die beiden
// vorn dicht beieinander liegen — 25 Elo sind an den echten Partien
// gemessen etwa zwei gewonnene Spitzenspiele.
const SAISON_ENDSPURT_ELO = 25;

const NEWS_BADGE_MARKEN = [1, 5, 10, 25, 50, 100];
// Und die Klasse entscheidet mit, wie oft. Eine Liste fuer alle drei war zu
// grob in beide Richtungen: eine LEGENDAERE Auszeichnung ist das Seltenste,
// was der Katalog hergibt — „Absoluter Sieger" ist der Grund, warum jemand
// die App oeffnet, und das gilt beim zweiten Mal genauso; sie fiel nach der
// Liste zwischen dem zehnten und dem fuenfundzwanzigsten Mal vierzehnmal
// weg. Eine GEWOEHNLICHE dagegen ist beim ersten Mal keine Nachricht: einen
// Zittersieg holt in der Liga jeder, der lange genug dabei ist. Der fuenfte
// ist eine Zahl, ueber die man redet.
const NEWS_BADGE_MARKEN_KLEIN = [5, 10, 25, 50, 100];
function _badgeTakt(rar, rang){
  if(rar === 'legendary') return true;
  return (rar === 'common' ? NEWS_BADGE_MARKEN_KLEIN : NEWS_BADGE_MARKEN)
    .indexOf(rang) >= 0;
}

// ─── §11.0b — Wann jemand über sich hinauswächst ─────────────────────
// Die Form-Karte maß das NIVEAU: neun von zehn gewonnen. Gemessen über die
// ganze Ligageschichte traf sie damit vier Spieler, und einer davon zehn der
// siebzehn Male — wer die Quote gewinnt, gewinnt sie eben immer wieder. Für
// alle anderen war die Karte unerreichbar, und eine Nachricht, die nur die
// besten Vier je nennen kann, ist eine Bestenliste [§C38].
//
// Gemessen wird deshalb der ABSTAND ZUM EIGENEN Schnitt — dieselbe Frage,
// mit der die Monatschronik die Mitte des Feldes erreicht [§C38]. Dieselbe
// Schwelle trifft damit sieben Spieler statt vier, darunter die untere
// Hälfte der Siegquote.
//
// Das Fenster sind zehn Partien — dasselbe, das `_newsRecentForm` und der
// Formstreifen im Profil zeigen [§C27]. Der Vergleichswert ist die Laufbahn
// DAVOR: nähme man die ganze Laufbahn einschließlich der zehn, verglichen
// sich die Partien mit sich selbst und der Abstand schrumpfte, je weniger
// jemand gespielt hat.
//
// 25 Prozentpunkte sind an den echten Partien geeicht, nicht geschätzt:
// gemessen fällt die Karte 0,46 mal je Spieltag. Bei 20 wären es 0,63 und
// bei 30 nur noch 0,25 — dann steht sie an drei von vier Spieltagen nicht.
const FORM_FENSTER = 10;
const FORM_BASIS_MIN = 8;    // so viele Partien braucht der Vergleichswert
const FORM_VORSPRUNG = 0.25; // Anteilspunkte über dem eigenen Schnitt

// ─── §11.0a — Die eine Rangfolge ─────────────────────────────────────
// `prio` sagt, wie stark eine Karte ist. Der Tagesdeckel behält danach die
// stärksten sechs [§C33], und die Sammelkarte wählt danach ihren Kopf —
// beides sind VERGLEICHE, und ein Vergleich braucht EINE Skala.
//
// Es waren zwei. Die Spieltags-Karten standen seit jeher auf 1 bis 10, und
// als die Ewige Tafel dazukam, bekam sie 70 bis 95 — jede für sich richtig
// einsortiert, nur nie gegeneinander. Damit gewann jede Tafel-Karte gegen
// jede Spieltags-Karte, bevor der Deckel überhaupt hinsah. Gemessen über
// 56 Spieltage: die Ewige Tafel bekam 66 % aller Tagesplätze, und von den
// Karten, die der Generator zum Spieltag selbst bildete, fielen 70 % der
// laufenden Siegesserien, 83 % der Pleitenserien, 83 % der Serienbrecher
// und 67 % der Top-Form-Karten weg — während jede einzelne Insignium-Stufe
// (183 Stück), jeder Rekordwechsel (88) und jede Monatschronik (98) durchkam.
// Wer die App nach einem Spieltag öffnete, las von allem außer vom Spieltag.
//
// Die Zahlen stehen deshalb hier an EINER Stelle und nicht mehr als Literal
// im Generator. Verteilt über 1900 Zeilen ist die zweite Skala genau der
// Fehler, den niemand sieht.
//
// Drei Bänder, und die Grenze dazwischen ist eine Frage:
//
//   90+   BREAKING — das gab es so noch nie [§C33]. Zählt ohnehin nicht
//         gegen den Tagesdeckel, steht aber auch oben.
//   38-89 DER SPIELTAG — das haben DIESE Partien hergegeben. Gestern hätte
//         es die Karte nicht gegeben: eine Serie, die heute weitergewachsen
//         ist, ein Meilenstein, der heute gerissen wurde, ein Rekord, der
//         heute den Halter gewechselt hat.
//   10-37 DER HINTERGRUND — gilt heute und galt gestern schon: ein Zähler,
//         der schon lange steht, ein Countdown, eine Bilanz über Monate.
//
// Die Grenze ist bewusst diese Frage und nicht „positiv oder negativ": eine
// laufende Pleitenserie ist genauso ein Ergebnis dieses Spieltags wie eine
// Siegesserie, und als Hintergrund einsortiert fiel sie an JEDEM ihrer zwölf
// Tage aus dem Feed. Dass die Siegesserie trotzdem darüber steht, ist die
// Rangfolge innerhalb des Bandes, nicht ein eigenes Band.
//
//
// Abstufungen INNERHALB eines Typs (eine 12er-Serie wiegt schwerer als eine
// 5er) bleiben ein Zuschlag auf den Grundwert. Der Zuschlag darf sein Band
// verlassen, wo der Typ das auch darf: eine legendäre Auszeichnung und die
// beiden obersten Insignium-Stufen sind Breaking [§C33].
// Die Obergrenze des Spieltagsbandes [§C33]. Breaking beginnt bei 90, der
// Spieltag reicht bis 89 — und eine Sammelkarte waechst mit jeder Zeile um
// zwei. Gemessen am 28.09. bundelte ein Tafel-Moment achtzehn Aenderungen
// und stand damit bei 110: ueber dem Breaking-Band, ohne Breaking zu sein.
// Damit gab es die zweite Skala wieder, gegen die `STORY_PRIO` gebaut ist.
const PRIO_SPIELTAG_MAX = 89;

// ── Die Leiter der Serienmarken [§C33] ───────────────────────────────
// Drei, fünf, acht, zehn und danach jede fünfte. Sie stand als Menge im
// Generator; die Karte einer Serie zeigt jetzt auch die NÄCHSTE Marke als
// leere Felder, und zwei Kopien der Leiter nennen irgendwann zwei Ziele.
function istSerienMarke(n){
  return n === 3 || n === 5 || n === 8 || n === 10 || (n > 10 && n % 5 === 0);
}
function naechsteSerienMarke(n){
  let z = Math.max(1, (n | 0) + 1);
  while(!istSerienMarke(z)) z++;
  return z;
}

const STORY_PRIO = {
  // ── Breaking ──
  rekord_erstmals:   96,   // ein Liga-Rekord wird zum ersten Mal vergeben
  elo_record:        95,
  streak_record:     94,
  lead_change:       93,
  season_recap:      92,   // der Meister steht fest
  // badge_unlocked und insignium_stufe erreichen das Band über ihren
  // Zuschlag, weil nur ein Teil ihrer Fälle Breaking ist.

  // ── Der Spieltag ──
  // Die Reihenfolge darin: erst, was die ganze Liga betrifft, dann die
  // Seltenheit. Gemessen an den echten Partien fällt eine Insignium-Stufe
  // 3,3 mal je Spieltag und eine Auszeichnung 2,8 mal, ein Serienbrecher
  // 0,3 mal und ein Sprung über den eigenen Schnitt 0,4 mal — die seltene
  // Karte steht deshalb über der häufigen. Drei Plätze sind davon
  // ausgenommen und stehen fest: der Sieger des Spieltags oben, und an der
  // Ewigen Tafel der übernommene Liga-Rekord über der Monatschronik über
  // der Insignium-Stufe [§C33].
  // Die beiden zusammenführenden Karten sind eine eigene Nachricht und keine
  // Zusammenfassung [§C33] — sie erben deshalb nicht den Rang ihres Kopfs.
  // „Zwei Spieler erreichen dieselbe Stufe im selben Moment" wiegt mehr als
  // eine einzelne Stufe, und mit dem geerbten Rang fiel die Karte an ihrem
  // eigenen Spieltag unter den Deckel.
  sammel_erfolg:     66,
  sammel_spieler:    66,
  potd:              88,   // der Sieger des Spieltags IST seine Schlagzeile
  chronik_monat:     86,
  // Der Tag, an dem die Monatstafel aufgeht: eine Karte je Monat, und sie
  // betrifft die ganze Liga. Sie steht ueber dem einzelnen Chronik-Wechsel,
  // weil es an diesem Tag gar keinen gibt [§C32], und unter dem Rueckblick
  // des Vormonats, der von einem abgeschlossenen Monat erzaehlt.
  chronik_frei:      82,
  woche:             84,
  chronik_erstling:  80,   // zum ersten Mal überhaupt in der Chronik
  rekord_geholt:     76,
  giant_slayer:      74,
  top_clash:         72,
  streak_killer:     70,
  win_streak:        68,
  loss_streak:       66,
  top_form:          64,   // weiter vorn als sonst [§11.0b]
  // Die Karte einer Partie ist der Anker ihres Spiels: alles, was darin
  // passiert ist, haengt sich beim Buendeln an sie, und das Buendel traegt
  // danach den Rang seines staerksten Teils [§C33]. Allein steht sie fuer
  // das Ergebnis, und das ist die leiseste Nachricht des Spieltagsbandes.
  spiel:             41,
  // Die Runde der Vier fasst Partien zusammen, die jede schon ihre Karte
  // haben [§11.6c]: sie steht knapp unter der einzelnen Partie.
  runde:             40,
  match_result:      63,   // ein außergewöhnliches, exakt belegtes Ergebnis
  chronik_geholt:    62,
  team_streak:       60,
  insignium_stufe:   58,
  badge_unlocked:    54,
  team_loss_streak:  52,
  milestone_wins:    48,
  milestone_elo:     48,
  milestone_goals:   46,
  jubilee:           44,
  rivalry_milestone: 42,
  // Die gesammelten kleinen Marken eines Tages: eine Karte, und die
  // schwaechste des Spieltagsbandes. Sie sollen vorkommen, aber keinen
  // Platz von einer Geschichte nehmen, die von diesem Tag erzaehlt.
  badge_marken:      39,
  rekord_gesteigert: 40,   // ausbauen ist die schwächste der drei Meldungen
  elo_swing:         38,

  // ── Der Hintergrund ──
  rivalry:           30,   // ein Zähler, der seit fünfzig Duellen steht
  // ── Der Schlusssprint ──
  // Er stand mit 22 im Hintergrundband, als „Noch 5 Tage" an jedem Tag der
  // Saison entstand — ein Countdown ist kein Ereignis. Mit der Elo-Grenze
  // unten ist er etwas anderes: höchstens eine Karte je Saison, und nur,
  // wenn die Entscheidung wirklich offen ist. Damit gehört er ins
  // Breaking-Band [§C33].
  season_endgame:    91,
  season_start:      20,
  dry_spell:         16,
  quiet_week:        14,
  // Der Fun Fact fällt an einem lauten Tag ohnehin weg [§C33]; steht er,
  // dann weil sonst nichts da ist.
  ambient:            8,
};
// Der Zuschlag eines ambienten Templates liegt bei 2 bis 7 und ist nur
// INNERHALB des Fun-Fact-Topfs eine Rangfolge — er darf das Band nicht
// verlassen, sonst stünde ein Fun Fact über einer Pleitenserie.
const AMBIENT_PRIO_SPANNE = 7;

// Ambiente Fun-Fact-Stories (v8.5, v9.5) — Fun Facts / persönliche Nuggets,
// damit der Feed auch ohne neue Matches lebt.
//   RHYTHMUS: TÄGLICH genau ein Fun Fact um 15:00 — aber nur, wenn bis dahin
//             noch keine Partie und kein Saisonabschluss stattgefunden hat.
//   AMBIENT_SLOTS  = die Slot-Stunden; je Slot erscheint eine eigene Story,
//                    jeweils erst ab dieser Uhrzeit.
//   Anti-Spam:     IDs sind tages+stunden-deterministisch (`ambient_<datum>_<stunde>`)
//                  → ON CONFLICT DO NOTHING → keine Doppel über Geräte/Syncs.
//   Auswahl:       tages-seeded gezogen (Pseudo-Zufall, überall identisch) plus
//                  COOLDOWN: zuletzt (letzte AMBIENT_COOLDOWN_DAYS Tage)
//                  verwendete Fun-Fact-Typen werden gesperrt → Rotation statt
//                  vorhersehbarer Reihenfolge, keine schnellen Wiederholungen.
const AMBIENT_SLOTS = [15];

// Der 15-Uhr-Slot darf Stand und Geschichte mischen: aktuelle Form, Rang,
// Insignium und Rekorde ebenso wie Saisonphase und Ligageschichte.
//
// Ohne Eintrag darf ein Template im Slot laufen. Die Zuordnung ist ein
// Vorzug, kein Verbot: findet der Slot nichts Passendes, greift er im
// letzten Durchgang auf den ganzen Topf zurück, statt leer auszugehen.
const AMBIENT_SLOT_ROLLE = {
  // Der Stand — nach vorn
  form_best_wr:'stand', form_striker:'stand', form_defender:'stand',
  form_clutch:'stand', form_close_wins:'stand', form_most_active:'stand',
  award_potd_leader:'stand', award_potw_leader:'stand', award_gold_leader:'stand',
  award_total_leader:'stand', fun_award_leader:'stand', fun_leader:'stand',
  fun_top_scorer:'stand', season_title_race:'stand',
  personal_wr:'stand', personal_streak:'stand', personal_scorer:'stand',
  prestige_fuehrung:'stand', prestige_schwelle:'stand', prestige_schritt:'stand',

  // Die Geschichte — zurück
  history_age:'geschichte', fun_biggest_win:'geschichte', fun_busiest_day:'geschichte',
  fun_team_record:'geschichte', fun_goals:'geschichte', rivalry_most:'geschichte',
  rivalry_close:'geschichte', chronicle_spotlight:'geschichte',
  award_latest_gold:'geschichte', personal_favourite_opp:'geschichte',
  personal_best_mate:'geschichte', personal_position:'geschichte',
  personal_grinder:'geschichte', insignium_stand:'geschichte', titelband_stand:'geschichte',
};
function _ambientRolleVon(key){ return AMBIENT_SLOT_ROLLE[key] || null; }
function _ambientRolleFuerSlot(stunde){ return stunde < 15 ? 'stand' : 'geschichte'; }
// Cooldown-Fenster (Tage): so lange wird ein bereits gezeigter Fun-Fact-Typ
// nicht erneut gewählt. Bei 2 Fun Facts / Tag sperrt das die letzten ~14 Typen
// (der Pool hat 18) → genug Rotation, keine schnellen Wiederholungen.
const AMBIENT_COOLDOWN_DAYS = 7;
// Auch verschiedene Templates koennen dieselbe Erzaehlrichtung haben. Diese
// Rubriken-Sperre mischt Fuehrung, Form, Duelle, Laufbahn und Geschichte, ohne
// kleine Datenbestaende leer laufen zu lassen (der Notnagel lockert sie).
const AMBIENT_RUBRIK_COOLDOWN_DAYS = 2;
// v9.14: Spieler-Cooldown (Tage). Der Typ-Cooldown verhindert nur gleiche
// TYPEN — bei einem dominanten Spieler zeigen aber viele VERSCHIEDENE
// Superlative (Sturm-Chef, Elo-Leader, Torschützenkönig …) auf denselben Kopf,
// sodass tagelang derselbe Name erscheint. Ein zuletzt gefeierter Spieler wird
// darum für dieses Fenster gemieden (Notnagel-Pass erlaubt ihn nur, wenn sonst
// kein Template Daten liefert) → echte Namens-Rotation.
const AMBIENT_PLAYER_COOLDOWN_DAYS = 2;
// Derselbe Fun Fact über dieselbe Person höchstens einmal im Monat. Der
// Typ-Cooldown (7 Tage) und der Spieler-Cooldown (2 Tage) verhindern diese
// Kombination nicht: gemessen über 40 Tage wiederholten sich elf Typ-Person-
// Paare, „kurz vor dem Schildring: Johannes" allein fünfmal. Die Führungs-
// Typen zeigen strukturell immer auf denselben Kopf, deshalb muss das Paar
// gesperrt werden und nicht nur der Typ.
const AMBIENT_PAAR_COOLDOWN_DAYS = 30;
// Auto-Sync-Intervall, damit neue Slots ohne Reload auftauchen (ms).
const NEWS_AUTOSYNC_MS = 10 * 60 * 1000;

// ─── §11.0b — Badge-Whitelist (v8.1) ─────────────────────────────────
// Nur seltene & besondere Badges erzeugen News. Common-Badges sind in der
// Liga zu häufig und würden den Feed verstopfen ("Achievement-Spam").
// Negative: nur die wirklich krassen (perfect_loss, mr_disaster, nemesis),
// nicht die alltäglichen wie bitter_loss/krimi_loser.
//
// PFLEGEHINWEIS: bei neuen Badges (§7.1) hier ergänzen, wenn sie als News
// auftauchen sollen. Default: nicht-newsworthy (bewusste Entscheidung).
const NEWS_BADGE_WHITELIST = new Set([
  // Legendary — alle 10 sind News-würdig
  'dynasty_600','dominator_400','award_collector','perfect_win','streak15','streak20',
  'untouchable','mr_perfect','allwetter','godly_streak',
  // Rare — kuratierte Auswahl: nur die mit besonderer Story
  'wall_badge','upset_king','unbeatable','streak10','vice_champion','potw','krimi',
  'games150', // "Dauerbrenner" (150 Matches) — Karriere-Meilenstein, v8.6 ergänzt
  // Negative — nur die seltenen, "krassen" Niederlagen
  'mr_disaster','nemesis','perfect_loss',
  // v9.5: explizit als News gewünscht (negativ, aber „immer newsworthy")
  'krimi_loser', // Krimi-Versager — 3 knappe Niederlagen in Folge
  'losing5',     // Losing Streak — 5 Niederlagen in Folge
  // Hinweis: Die gewünschten POSITIVEN Auszeichnungen (Nerven aus Stahl,
  // Wiederholungstäter, Krimi-Reihe, 10er Serie) sind bereits 'rare' und
  // laufen daher ohnehin über die generische Badge-News-Regel unten.
]);

