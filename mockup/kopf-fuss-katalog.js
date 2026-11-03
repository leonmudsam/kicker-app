// Der Katalog der Partie-Karte: jeder Anlass und jeder Kopf an genau einer
// Stelle. `kopf-fuss-lauf.js` wählt damit, `kopf-fuss-seite.js` zeichnet
// und beschreibt damit. Wer etwas ergänzt, ergänzt es hier.
//
// ── Die Regel in fünf Schritten ─────────────────────────────────────
//  1. Sammeln. Jeder Anlass der Partie: jede Meldung, die der Generator der
//     App zu ihr schreibt (eine Zeile ihres Bündels), jede Form der App, die
//     aus der Partie selbst zutrifft, und die neuen Fakten dieses Entwurfs.
//     Was dieselbe Sache sagt, steht einmal: eine Form, deren Sache schon
//     eine Meldung sagt (`deckt`), entfällt.
//  2. Gewichten. Jede Art hat ein festes Gewicht. Ein Zustand (eine Serie,
//     eine Rivalität, die Form) verliert 20, wenn er auf einer der drei
//     Karten davor Hauptanlass war: er gilt über viele Partien und soll
//     nicht jede Karte tragen. Ein Ereignis geschieht einmal und verliert
//     nie.
//  3. Hauptanlass ist der schwerste, der keine Pleite ist. Er ist die
//     Schlagzeile. Gibt es nur Pleiten, ist das Ergebnis die Schlagzeile:
//     über einem Sieg stand sonst „Jane bekommt ‚Absoluter Verlierer‘“.
//  4. Der Fuß zeichnet den schwersten Anlass, der eine Zeichnung hat, also
//     meist den Hauptanlass; stand dieselbe Zeichnung schon auf der Karte
//     davor, den nächsten mit einer anderen. Ist es nicht der Hauptanlass,
//     steht sein Satz im Fuß und nicht als Zeile.
//  5. Die übrigen Anlässe sind Zeilen, die schwersten drei; mehr steht als
//     „+ X weitere“, das Blatt zeigt alle. Jeder Anlass steht damit genau
//     einmal als Text auf der Karte.
//  Der Kopf ist davon getrennt: er zeigt nur, wie die Partie ausging. Ein
//  besonderer Ausgang hat immer dasselbe Bild und trägt den Kopf, außer er
//  stand auf einer der zwei Karten davor; sonst kommt die Grundansicht, die
//  am längsten nicht dran war. Ein Kopf zeigt nie einen Anlass: die
//  Serie im Kopf und dieselbe Serie im Fuß war die häufigste Doppelung der
//  vierten Runde.
'use strict';

// ── Die Anlässe ─────────────────────────────────────────────────────
// Je Art: `name`, `quelle` ('app' eine Meldung des Generators, 'form' eine
// Form der App aus der Partie selbst, 'neu' ein Fakt dieses Entwurfs),
// `typ` (die Typen der Meldung, bei Auszeichnungen mit Klasse), `form`
// (der Schlüssel der App-Form), `gewicht`, `zustand` (gilt über viele
// Partien), `neg` (eine Pleite), `fuss` (die Zeichnung: ein Fuß der App,
// `app:<key>`, oder einer dieses Entwurfs), `deckt` (die Arten, deren Sache
// er schon sagt) und `wann` (in Worten, für die Seite).
const ANLASS = {
  // Meldungen des Generators
  spitze:      {name:'Spitzenwechsel', quelle:'app', typ:['lead_change'], gewicht:96, fuss:'app:spitze', wann:'ein Sieger übernimmt die Tabellenspitze des Monats'},
  legendaer:   {name:'Legendäre Auszeichnung', quelle:'app', typ:['badge_unlocked:legendary'], gewicht:92, fuss:'app:medaille', wann:'eine legendäre Auszeichnung aus der Partie'},
  rekordserie: {name:'Serien-Rekord der Liga', quelle:'app', typ:['streak_record'], gewicht:84, fuss:'app:serie', wann:'die längste Siegesserie, die die Liga je sah'},
  riss:        {name:'Serie gerissen', quelle:'app', typ:['streak_killer'], gewicht:80, fuss:'app:riss', wann:'die Sieger beenden eine Serie ab vier Siegen'},
  selten:      {name:'Seltene Auszeichnung', quelle:'app', typ:['badge_unlocked:rare'], gewicht:66, fuss:'app:medaille', wann:'eine seltene Auszeichnung aus der Partie'},
  fluch:       {name:'Fluch gebrochen', quelle:'app', typ:['fluch'], gewicht:64, fuss:'app:gegner', wann:'erster Sieg gegen einen nach fünf oder mehr Niederlagen in Folge, frühestens zwei Wochen nach dem letzten'},
  siegmarke:   {name:'Runde Zahl an Siegen', quelle:'app', typ:['milestone_wins'], gewicht:62, fuss:'app:zaehlwerk', wann:'der 50., 100. … Sieg'},
  elomarke:    {name:'Elo-Marke', quelle:'app', typ:['milestone_elo'], gewicht:60, fuss:'app:zaehlwerk', wann:'eine runde Elo-Marke wird zum ersten Mal geknackt'},
  elohoch:     {name:'Elo-Höchststand', quelle:'app', typ:['elo_hoch'], gewicht:60, fuss:'app:hoch', wann:'so viel Elo wie nie zuvor'},
  tabellensprung:{name:'Tabellensprung', quelle:'app', typ:['tabellensprung'], gewicht:59, fuss:'app:rang', wann:'ein Sieger springt in einer belastbaren Tabelle mindestens drei Plätze'},
  tormarke:    {name:'Runde Zahl an Toren', quelle:'app', typ:['milestone_goals'], gewicht:58, fuss:'app:zaehlwerk', wann:'das 500., 1000. … Tor'},
  jubilaeum:   {name:'Spiel-Jubiläum', quelle:'app', typ:['jubilee'], gewicht:56, fuss:'app:zaehlwerk', wann:'das 10., 25., 50. … Spiel'},
  rivalmarke:  {name:'Rivalitätsmarke', quelle:'app', typ:['rivalry_milestone'], gewicht:54, fuss:'app:duell', wann:'zwei treffen zum 50., 100. … Mal aufeinander'},
  spitzenspiel:{name:'Spitzenspiel', quelle:'app', typ:['top_clash'], gewicht:53, fuss:'app:gipfel', wann:'Erster gegen Zweiten der Tabelle'},
  revanche:    {name:'Revanche', quelle:'app', typ:['revanche'], gewicht:52, fuss:'app:revanche', wann:'dieselben Paare am selben Tag, davor mit drei Toren oder mehr verloren'},
  duojubilaeum:{name:'Duo-Jubiläum', quelle:'app', typ:['duo_jubilaeum'], gewicht:50, fuss:'app:chemie', wann:'zwei spielen zum 25., 50. … Mal zusammen'},
  favoritensturz:{name:'Favoritensturz', quelle:'app', typ:['giant_slayer'], gewicht:50, fuss:null, wann:'die Sieger schlagen ein klar stärkeres Paar; der Kopf zeigt es'},
  serie:       {name:'Siegesserie', quelle:'app', typ:['win_streak'], gewicht:46, zustand:true, fuss:'app:serie', wann:'drei oder mehr Siege in Folge'},
  teamserie:   {name:'Serie zu zweit', quelle:'app', typ:['team_streak'], gewicht:46, zustand:true, fuss:'app:teamserie', wann:'ein Paar gewinnt zum fünften Mal oder öfter in Folge'},
  tagesmarathon:{name:'Der lange Tag', quelle:'app', typ:['tagesmarathon'], gewicht:40, fuss:'app:tagesring', wann:'die 10., 15. … Partie eines Spielers am Tag'},
  auszeichnung:{name:'Auszeichnung', quelle:'app', typ:['badge_unlocked'], gewicht:36, fuss:null, wann:'eine gewöhnliche Auszeichnung aus der Partie'},
  marke:       {name:'Runde Zahl einer Auszeichnung', quelle:'app', typ:['badge_marken'], gewicht:34, fuss:null, wann:'eine Auszeichnung zum 5., 10., 25. … Mal'},
  rivalitaet:  {name:'Rivalität', quelle:'app', typ:['rivalry'], gewicht:34, zustand:true, fuss:'app:duell', wann:'zwei treffen zum 60., 70. … Mal aufeinander'},
  formhoch:    {name:'Formhoch', quelle:'app', typ:['top_form'], gewicht:30, zustand:true, fuss:null, wann:'die letzten zehn Partien deutlich über dem eigenen Schnitt'},
  pleiten:     {name:'Pleiten in Folge', quelle:'app', typ:['loss_streak'], gewicht:28, zustand:true, neg:true, fuss:null, wann:'ein Verlierer verliert zum fünften Mal oder öfter in Folge'},
  teampleiten: {name:'Pleiten zu zweit', quelle:'app', typ:['team_loss_streak'], gewicht:22, zustand:true, neg:true, fuss:null, wann:'ein Paar verliert zum dritten Mal oder öfter in Folge'},
  schande:     {name:'Negative Auszeichnung', quelle:'app', typ:['badge_unlocked:negative'], gewicht:24, neg:true, fuss:null, wann:'ein Verlierer bekommt eine Auszeichnung, die keiner will'},
  gruppe:      {name:'Mehrere zugleich', quelle:'app', typ:['group'], gewicht:20, fuss:null, wann:'mehrere Spieler mit derselben Sache in einer Partie'},
  // Formen der App aus der Partie selbst
  zaehlwerk:   {name:'Zählwerk', quelle:'form', form:'zaehlwerk', gewicht:44, fuss:'app:zaehlwerk', deckt:['siegmarke', 'elomarke', 'tormarke', 'jubilaeum'], wann:'eine runde Zahl, die keine Meldung schon nennt'},
  gegner:      {name:'Lieblingsgegner', quelle:'form', form:'gegner', gewicht:42, fuss:'app:gegner', deckt:['fluch'], wann:'jeder fünfte Sieg gegen einen, gegen den drei von vier Duellen gewonnen sind'},
  rueckkehr:   {name:'Zurück am Tisch', quelle:'form', form:'rueckkehr', gewicht:32, fuss:'app:rueckkehr', wann:'ein Sieg nach mindestens zehn Tagen ohne Partie'},
  ueberholt:   {name:'Überholt', quelle:'form', form:'ueberholt', gewicht:30, fuss:'app:ueberholt', deckt:['spitze', 'tabellensprung'], wann:'ein Sieger zieht in der Tabelle an einem Verlierer vorbei'},
  duoserie:    {name:'Dieselben vier', quelle:'form', form:'duoserie', gewicht:30, zustand:true, fuss:'app:duoserie', wann:'dieselben zwei Paare, und dieses gewinnt zum 3., 5., 7., 10. … Mal in Folge'},
  revanchef:   {name:'Revanche', quelle:'form', form:'revanche', gewicht:28, fuss:'app:revanche', deckt:['revanche'], wann:'dieselben zwei Paare, diesmal gewinnt die andere Seite'},
  gipfel:      {name:'Gipfeltreffen', quelle:'form', form:'gipfel', gewicht:26, fuss:'app:gipfel', deckt:['spitzenspiel', 'spitze'], wann:'Erster und Zweiter der Tabelle in einer Partie'},
  chemie:      {name:'Chemie', quelle:'form', form:'chemie', gewicht:26, fuss:'app:chemie', deckt:['duojubilaeum', 'teamserie'], wann:'ein Paar mit drei Vierteln Siegen bei jedem fünften gemeinsamen Sieg'},
  uhr:         {name:'Die Uhr des Tages', quelle:'form', form:'uhr', gewicht:24, fuss:'app:uhr', wann:'die 6., 8., 10. … Partie des Tages'},
  tagesring:   {name:'Der Tag eines Spielers', quelle:'form', form:'tagesring', gewicht:22, fuss:'app:tagesring', deckt:['tagesmarathon'], wann:'ein Spieler an einem langen Tag'},
  // Aus der Partie, wie die App sie zeichnet
  premiere:    {name:'Erstes gemeinsames Spiel', quelle:'partie', gewicht:36, fuss:'app:premiere', wann:'zwei gewinnen ihr erstes gemeinsames Spiel'},
  wende:       {name:'Wende', quelle:'partie', gewicht:30, fuss:'app:wende', wann:'ein Sieger verlor davor mindestens dreimal in Folge'},
  rolle:       {name:'Rollentausch', quelle:'partie', gewicht:30, fuss:'app:rolle', wann:'ein Sieg auf der Seite, auf der einer seltener als in jeder vierten Partie steht'},
  // Neu in diesem Entwurf
  kippt:       {name:'Bilanz gekippt', quelle:'neu', gewicht:60, fuss:'kippt', wann:'ab 16 Duellen führt der Sieger wieder, zuletzt vor mindestens zehn Duellen vorn oder nie'},
  woche:       {name:'Die Woche übernommen', quelle:'neu', gewicht:50, fuss:'woche', wann:'ein Sieger übernimmt die beste Siegquote der Woche, ab fünf Siegen'},
  plus:        {name:'Ins Plus gedreht', quelle:'neu', gewicht:48, fuss:'plus', wann:'ab der vierten Partie des Tages, nach einem Tief von mindestens −25 Elo'},
  hoehe:       {name:'Höhenmeter', quelle:'neu', gewicht:42, fuss:'hoehe', wann:'ein Sieger kommt heute zum ersten Mal über +75 Elo'},
  monatsbest:  {name:'Größter Gewinn im Monat', quelle:'neu', gewicht:40, fuss:'monatsbest', wann:'ab der achten Partie im Monat der größte Gewinn, mindestens 22 Elo'},
  halb:        {name:'Wieder bei 50 %', quelle:'neu', gewicht:38, fuss:'halb', wann:'ab der fünfzehnten Partie im Monat erreicht die Siegquote 50 % von unten'},
  partner:     {name:'Der beste Partner', quelle:'neu', gewicht:36, fuss:'partner', wann:'mit diesem Partner die beste Quote, mindestens acht Partien, jede achte'}
};

// Die Typen der Meldungen, auf ihre Art. Eine Auszeichnung geht nach ihrer
// Klasse: legendär, selten oder gewöhnlich.
const NACH_TYP = {};
Object.keys(ANLASS).forEach(k => (ANLASS[k].typ || []).forEach(t => { NACH_TYP[t] = k; }));
const artVonMeldung = (typ, rarity) => NACH_TYP[typ + ':' + rarity] || NACH_TYP[typ] || null;

// ── Die Köpfe ───────────────────────────────────────────────────────
// Jeder zeigt den Endstand und alle vier Gesichter. `art` 'ausgang' ist ein
// besonderer Ausgang mit festem Vorrang (`vorrang`, kleiner zuerst); 'grund'
// ist eine Grundansicht, die reihum kommt. `quelle` 'app' zeichnet die App
// (`app` ist ihr Schlüssel), 'neu' dieser Entwurf. „Rechnung gegen
// Ergebnis“ ist gestrichen: der Tacho der App sagt dasselbe.
const KOPF = {
  aussenseiter:{name:'Außenseitersieg', art:'ausgang', vorrang:1, quelle:'app', app:'aussenseiter', wann:'Siegchance der Sieger unter 35 %'},
  zunull:      {name:'Zu null', art:'ausgang', vorrang:2, quelle:'neu', wann:'10:0'},
  krimi:       {name:'Ein-Tor-Krimi', art:'ausgang', vorrang:3, quelle:'app', app:'krimi', wann:'10:9'},
  deutlich:    {name:'Klarer Sieg', art:'ausgang', vorrang:4, quelle:'app', app:'deutlich', wann:'sechs Tore Abstand oder mehr'},
  tafel:       {name:'Anzeigetafel', art:'grund', quelle:'neu', wann:'immer'},
  strom:       {name:'Elo-Strom', art:'grund', quelle:'neu', wann:'immer'},
  pucks:       {name:'Torpucks', art:'grund', quelle:'neu', wann:'immer'},
  feld:        {name:'Spielfeld', art:'grund', quelle:'app', app:'feld', wann:'immer'},
  tauziehen:   {name:'Tauziehen', art:'grund', quelle:'app', app:'tauziehen', wann:'zwei bis fünf Tore Abstand'},
  tacho:       {name:'Tacho', art:'grund', quelle:'app', app:'tacho', wann:'die Favoriten gewinnen, Siegchance ab 62 %'},
  muenze:      {name:'Münzwurf', art:'grund', quelle:'app', app:'muenze', wann:'Siegchance zwischen 47 und 53 %'},
  gefaelle:    {name:'Gefälle', art:'grund', quelle:'app', app:'gefaelle', wann:'die Sieger liegen 220 Elo oder mehr auseinander'},
  mosaik:      {name:'Mosaik', art:'grund', quelle:'app', app:'mosaik', wann:'ein seltenes oder häufiges Ergebnis der Liga'},
  streu:       {name:'Ausreißer', art:'grund', quelle:'app', app:'streu', wann:'Favoriten gewinnen knapp oder verlieren deutlich'},
  transfer:    {name:'Elo-Transfer', art:'grund', quelle:'app', app:'transfer', wann:'ab der 50. Partie, wenn sich viel Elo verschiebt'}
};

module.exports = {ANLASS, KOPF, artVonMeldung};
