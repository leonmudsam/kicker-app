// Der Katalog der Fun Facts um 15 Uhr, Entwurf: jeder Fakt an genau einer
// Stelle. `fun-fakten-lauf.js` prüft und wählt damit, `fun-fakten-seite.js`
// zeichnet und beschreibt damit. Wer etwas ergänzt, ergänzt es hier und in
// `FAKTEN` des Laufs (die Bedingung) und `BILD` der Seite (die Zeichnung).
//
// ── Die Regel in vier Schritten ─────────────────────────────────────
//  1. Prüfen. Um 15 Uhr eines Tages ohne Partie bis dahin rechnet jeder Fakt
//     auf dem Stand der Liga, ob er gerade zutrifft, und wenn ja, mit welchen
//     Spielern und wie spannend: `spannung` von 0 bis 100 sagt, wie knapp,
//     wie nah, wie selten es gerade ist — ein Titelrennen mit 4 Elo Abstand
//     mehr als eines mit 38, eine Marke, der ein Sieg fehlt, mehr als eine,
//     der fünf fehlen.
//  2. Sperren. Nicht wieder, was eben stand: dieselbe Art in den letzten
//     zehn Fun Facts (der Schlussspurt: drei), dieselbe Rubrik wie einer der
//     letzten zwei, ein Spieler aus einem der letzten drei, dieselbe Art
//     über denselben Spieler in den letzten neunzig Tagen. Das Titelrennen
//     kennt die letzten beiden nicht: oben stehen jeden Monat dieselben.
//  3. Wählen. Der spannendste Fakt, der nicht gesperrt ist; wer in den
//     letzten zehn Fun Facts schon stand, verliert je Auftritt zehn Punkte
//     (außer im Titelrennen).
//     Gleich spannend entscheidet das Los des Datums, auf jedem Gerät
//     dasselbe.
//  4. Lockern. Bleibt nichts, fallen die Sperren in dieser Folge: erst die
//     Spieler bis auf den letzten Fun Fact, dann die Rubrik bis auf den
//     letzten, dann die Art bis auf die letzten vier; ganz zuletzt gilt
//     keine Sperre mehr. Ein Tag bleibt nie leer.
//  Die App zieht heute aus 39 Vorlagen per Los; die meisten sagen „X führt
//  bei Y“, und ob ein Rennen knapp ist, weiß das Los nicht.
'use strict';

// ── Die Rubriken ────────────────────────────────────────────────────
// Je Rubrik die Aufschrift der Karte und ihr Ton (eine Farbe der App,
// `nf-fakt-<ton>`). Neue Rubriken nehmen einen vorhandenen Ton.
const RUBRIK = {
  titel:     {name:'Titelrennen',        label:'TITELRENNEN',        ton:'chronik'},
  schluss:   {name:'Saisonschluss',      label:'SAISONSCHLUSS',      ton:'chronik'},
  rekord:    {name:'Rekorde',            label:'REKORDJAGD',         ton:'auszeichnung'},
  auszeich:  {name:'Auszeichnungen',     label:'AUSZEICHNUNGEN',     ton:'auszeichnung'},
  chronik:   {name:'Chronik',            label:'AUS DER CHRONIK',    ton:'chronik'},
  laufbahn:  {name:'Laufbahn',           label:'AUS DER LAUFBAHN',   ton:'laufbahn'},
  insignium: {name:'Insignium',          label:'DIE LEITER',         ton:'laufbahn'},
  team:      {name:'Teams',              label:'ZU ZWEIT',           ton:'persoenlich'},
  position:  {name:'Positionen',         label:'VORN UND HINTEN',    ton:'form'},
  abweich:   {name:'Abweichung',         label:'GEGEN DIE ERWARTUNG',ton:'form'},
  duell:     {name:'Duelle',             label:'DUELL IN ZAHLEN',    ton:'duell'},
  form:      {name:'Form',               label:'DIE FORMKURVE',      ton:'form'},
  liga:      {name:'Liga',               label:'LIGA IN ZAHLEN',     ton:'liga'}
};

// ── Die Fakten ──────────────────────────────────────────────────────
// Je Art: `name`, `rubrik`, `bild` (die Zeichnung in `fun-fakten-seite.js`),
// `ic` (das Zeichen der App oben links), `wann` (die Bedingung in Worten),
// `spannung` (wovon sie abhängt, in Worten), `spitze` (handelt von der
// Spitze der Liga und kennt deshalb keine Spieler-Sperre: die Spitze sind
// immer dieselben, und das Titelrennen kam sonst einmal in fünf Monaten)
// und `abstand` (so viele Fun Facts mindestens bis zur selben Art, sonst
// zehn). Die Rechnung steht im Lauf.
const FAKT = {
  titel_rennen:   {name:'Das Rennen um den Monat', rubrik:'titel', bild:'bahn', ic:'crown', spitze:true,
    wann:'ab dem 7. Tag, bis acht Tage vor Schluss; die ersten zwei der Wertung höchstens 40 Elo auseinander',
    spannung:'je knapper, desto mehr; ein Dritter in Reichweite zählt mit'},
  titel_wechsel:  {name:'Die Spitze wechselt', rubrik:'titel', bild:'fuehrung', ic:'leiterAuf', spitze:true,
    wann:'die Spitze der Wertung hat im Monat mindestens dreimal gewechselt',
    spannung:'je öfter, desto mehr'},
  schluss_sprint: {name:'Der Schlussspurt', rubrik:'schluss', bild:'countdown', ic:'stopwatch', spitze:true, abstand:3,
    wann:'die letzten sieben Tage des Monats; wer höchstens 40 Elo hinter der Spitze liegt, kann noch Meister werden',
    spannung:'je weniger Tage und je mehr Anwärter, desto mehr'},
  rekord_jagd:    {name:'Jagd auf den Rekord', rubrik:'rekord', bild:'jagd', ic:'target',
    wann:'der Zweite eines Liga-Rekords hat mindestens 85 % des Rekordwerts',
    spannung:'je näher am Rekord, desto mehr'},
  rekord_tafel:   {name:'Die Rekordtafel', rubrik:'rekord', bild:'saeulen', ic:'medalTrio',
    wann:'die ersten zwei der Rekordtafel liegen höchstens zwei Rekorde auseinander',
    spannung:'gleichauf mehr als knapp dahinter'},
  auszeich_selten:{name:'Fast allein', rubrik:'auszeich', bild:'zwoelf', ic:'medalTrio',
    wann:'eine legendäre oder seltene Auszeichnung, die höchstens zwei der Liga tragen',
    spannung:'legendär mehr als selten, allein mehr als zu zweit'},
  auszeich_marke: {name:'Eine fehlt', rubrik:'auszeich', bild:'perlen', ic:'marke',
    wann:'eine Auszeichnung, die man gern holt, fehlt einmal bis zur nächsten runden Zahl (5, 10, 25 …)',
    spannung:'legendär und hohe Zahl mehr'},
  chronik_monat:  {name:'Die Chronik des Monats', rubrik:'chronik', bild:'chronik', ic:'calendar',
    wann:'ab dem 10. Tag; einer hält im laufenden Monat mindestens drei Einträge der Chronik',
    spannung:'je mehr Einträge, desto mehr'},
  laufbahn_marke: {name:'Kurz vor der Marke', rubrik:'laufbahn', bild:'zaehler', ic:'hundred',
    wann:'bis zum 100., 250., 500. … Sieg, zum 100., 250., 500. … Spiel oder zum 500., 1000. … Tor fehlen höchstens 3',
    spannung:'je weniger fehlen, desto mehr'},
  laufbahn_gipfel:{name:'Unter dem Gipfel', rubrik:'laufbahn', bild:'gipfel', ic:'peak',
    wann:'das Elo liegt höchstens 12 unter dem eigenen Höchststand, der mindestens 14 Tage alt ist',
    spannung:'je näher, desto mehr'},
  insig_schwelle: {name:'Vor der nächsten Stufe', rubrik:'insignium', bild:'leiter', ic:'leiterAuf',
    wann:'bis zur nächsten Stufe des Insigniums fehlen höchstens 150 Prestige',
    spannung:'je weniger fehlen, desto mehr; hohe Stufe mehr'},
  insig_duell:    {name:'Zwei auf einer Sprosse', rubrik:'insignium', bild:'tau', ic:'scaleBalance',
    wann:'zwei Nachbarn im Prestige, beide ab 300, liegen höchstens 60 Punkte auseinander',
    spannung:'je knapper, desto mehr'},
  team_chemie:    {name:'Zusammen besser', rubrik:'team', bild:'chemie', ic:'handshake',
    wann:'ein Paar ab zehn gemeinsamen Partien gewinnt mindestens 12 Punkte öfter als beide im Schnitt allein',
    spannung:'je größer der Unterschied, desto mehr'},
  team_ungeschlagen:{name:'Ungeschlagen zu zweit', rubrik:'team', bild:'perlen', ic:'unstoppable',
    wann:'ein Paar hat jede seiner mindestens vier gemeinsamen Partien gewonnen',
    spannung:'je mehr Siege, desto mehr'},
  team_nie:       {name:'Noch nie zusammen', rubrik:'team', bild:'netz', ic:'users',
    wann:'zwei mit je mindestens 60 Partien haben nie auf derselben Seite gestanden',
    spannung:'je mehr Partien beide haben, desto mehr'},
  position_seiten:{name:'Vorn oder hinten', rubrik:'position', bild:'seiten', ic:'posSwap',
    wann:'ab je 15 Partien in Abwehr und Sturm liegt die Siegquote mindestens 20 Punkte auseinander',
    spannung:'je größer der Unterschied, desto mehr'},
  abweich_mehr:   {name:'Mehr als erwartet', rubrik:'abweich', bild:'erwartung', ic:'trendUp',
    wann:'in den letzten 40 Partien mindestens vier Siege mehr, als die Siegchancen zusammen ergeben',
    spannung:'je mehr, desto mehr'},
  abweich_weniger:{name:'Weniger als erwartet', rubrik:'abweich', bild:'erwartung', ic:'trendDown',
    wann:'in den letzten 40 Partien mindestens vier Siege weniger, als die Siegchancen zusammen ergeben',
    spannung:'je mehr, desto mehr; etwas leiser als „mehr“'},
  abweich_aussen: {name:'Gern Außenseiter', rubrik:'abweich', bild:'tacho2', ic:'underdog',
    wann:'als Außenseiter (Siegchance unter 45 %) ab zwölf Partien mindestens 48 % gewonnen',
    spannung:'je höher die Quote, desto mehr'},
  duell_serie:    {name:'Die Serie im Duell', rubrik:'duell', bild:'kette', ic:'crossedSwords',
    wann:'einer hat einen anderen in den letzten sechs Duellen oder mehr jedes Mal geschlagen, aber nicht in allen (das ist „Nie verloren“)',
    spannung:'je länger, desto mehr'},
  duell_kipp:     {name:'Ein Sieg entscheidet', rubrik:'duell', bild:'tau', ic:'scaleBalance',
    wann:'zwei mit mindestens 30 Duellen stehen gleich oder einen Sieg auseinander',
    spannung:'gleich mehr als einen auseinander; je mehr Duelle, desto mehr'},
  titel_meister:  {name:'Der Meister von gestern', rubrik:'titel', bild:'reihe', ic:'crown', spitze:true,
    wann:'ab dem 5. Tag; wo der Meister des Vormonats in der Wertung des Monats steht',
    spannung:'an der Spitze oder ganz hinten mehr als dazwischen'},
  rekord_wechsel: {name:'Neuer Halter', rubrik:'rekord', bild:'wechsel', ic:'medalTrio',
    wann:'ein Liga-Rekord hat in den letzten 14 Tagen den Halter gewechselt',
    spannung:'je frischer, desto mehr'},
  form_monat:     {name:'Der Monat eines Spielers', rubrik:'form', bild:'monatskurve', ic:'trendUp',
    wann:'ab dem 7. Tag und acht Partien im Monat; mindestens 60 Elo im Monat gewonnen',
    spannung:'je mehr, desto mehr'},
  form_liga:      {name:'Die Form der Liga', rubrik:'form', bild:'formbalken', ic:'trendUp',
    wann:'die letzten 14 Tage, wer dort mindestens vier Partien hat (mindestens sechs Spieler): der Erste hat mindestens 30 Elo gewonnen und 15 mehr als der Zweite',
    spannung:'je weiter vor dem Zweiten, desto mehr'},
  form_quote:     {name:'Besser als sonst', rubrik:'form', bild:'formpunkte', ic:'flame',
    wann:'die letzten 14 Tage ab acht Partien: die Siegquote liegt mindestens 20 Punkte über der eigenen Laufbahn, und kein anderer der Liga liegt weiter darüber',
    spannung:'je größer der Abstand, desto mehr'},
  team_alle:      {name:'Mit allen zusammen', rubrik:'team', bild:'stern', ic:'partnerHebel',
    wann:'in den letzten 30 Tagen kam der letzte Partner dazu: jetzt hat einer mit jedem der Liga zusammengespielt',
    spannung:'fest'},
  position_wechsel:{name:'Die Seite gewechselt', rubrik:'position', bild:'anteil', ic:'posSwap',
    wann:'in den letzten 20 Partien mindestens 30 Punkte öfter oder seltener im Sturm als in den 40 davor',
    spannung:'je größer der Wechsel, desto mehr'},
  duell_weisse:   {name:'Nie verloren', rubrik:'duell', bild:'kette', ic:'crossedSwords',
    wann:'einer hat gegen einen anderen in mindestens sechs Duellen nie verloren',
    spannung:'je mehr Duelle, desto mehr'},
  duell_vier:     {name:'Dieselben vier', rubrik:'duell', bild:'paarung', ic:'users',
    wann:'dieselben zwei Paare trafen mindestens fünfmal aufeinander, und eines gewann mindestens 80 %',
    spannung:'je mehr Begegnungen und je klarer, desto mehr'},
  liga_marke:     {name:'Die Partie der Liga', rubrik:'liga', bild:'zaehler', ic:'hundred',
    wann:'bis zur nächsten vollen Hundert an Partien der Liga fehlen höchstens fünf',
    spannung:'je weniger fehlen, desto mehr; volle 500 mehr'},
  liga_spanne:    {name:'Zusammen oder auseinander', rubrik:'liga', bild:'spanne', ic:'scaleBalance',
    wann:'zwischen Erstem und Letztem im Elo (ab 20 Partien, auch schon vor 30 Tagen) liegen mindestens 40 Elo weniger oder mehr als vor 30 Tagen',
    spannung:'leise'},
  liga_wochentag: {name:'Der Tag der Liga', rubrik:'liga', bild:'woche', ic:'calendar',
    wann:'ab 100 Partien; ein Wochentag trägt mindestens 25 % aller Partien',
    spannung:'leise'},
  liga_stunde:    {name:'Die Stunde der Liga', rubrik:'liga', bild:'stunden', ic:'clock',
    wann:'ab 100 Partien; die Stunde mit den meisten Partien',
    spannung:'leise'}
};

module.exports = {RUBRIK, FAKT};
