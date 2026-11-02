// Baut aus dem Lauf die Übersicht `story-logik.html`: jede Kartenform des
// Feeds mit echten, von der App gezeichneten Beispielen und ihrem Blatt,
// jeder Anlass des Generators, die Uhr eines Tages, Breaking, die Seiten und
// das Zusammenführen.
//
//   node mockup/story-logik-lauf.js && node mockup/story-logik-seite.js
//
// Die Zahlen und Zeichnungen kommen aus `.story-logik.json`. Die Texte stehen
// hier und sind aus `src/js/26-news-konstanten.js`, `27-news-generator.js`,
// `28-news-ambient.js`, `29-news-cache.js`, `30-news-ui.js`, `30a-news-karte.js`,
// `30e-news-ehrung.js` und `docs/gesetze/C33-feed.md` gelesen. Was hier steht
// und dort nicht, ist ein Fehler dieser Seite.
//
// Die Karten tragen ihre Wappen mit der ganzen Insignium-Zeichnung inline:
// roh 27 MB. Jede Zeichnung steht deshalb einmal in einem Wörterbuch (ihre
// Kennungen auf einen Platzhalter gebracht, beim Zeichnen je Einsatz neu
// vergeben), und alles zusammen gzip-gepackt; die Seite entpackt im Browser
// und zeichnet eine Form erst, wenn sie ins Bild kommt.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '.story-logik.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const kopf = html.slice(0, html.indexOf('</head>'));
const appCss = (kopf.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
  .map(s => s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const c = s => `<code>${esc(s)}</code>`;
const zahl = n => Number(n).toLocaleString('de-DE');
const K = D.konstanten, P = K.prio, L = K.limits;
const datum = ms => new Date(ms).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
const uhr = ms => new Date(ms).toTimeString().slice(0, 5);
const SEITE = Object.fromEntries((K.seiten || []).map(s => [s.k, s.label]));

// ── Die Kartenformen ────────────────────────────────────────────────
// In der Reihenfolge, in der ein Leser ihnen begegnet: der Spieltag, die
// Tafel und das Zeichen, die Ehrung, Woche und Monat, die Liga.
const GRUPPEN = [
  ['Der Spieltag', ['spiel', 'sammel:spiel', 'runde', 'potd', 'elo_swing', 'badge_marken']],
  ['Tafel und Zeichen', ['sammel:tafel', 'insignium_tag', 'insignium_tag:woche']],
  ['Die Ehrung', ['ehrung:runde', 'ehrung:woche', 'ehrung:monat']],
  ['Woche und Monat', ['woche', 'season_start', 'season_endgame', 'season_recap']],
  ['Die Liga', ['ambient', 'dry_spell', 'quiet_week', 'karriereende']],
];
const FORM = {
  'spiel': {name:'Die Partie', id:'spiel_<Partie>', wann:'Zur Minute der Partie.',
    was:`Jede Partie bekommt genau eine Karte. Oben das Ergebnisband: vier Wappen und der Endstand aus Sicht des Siegers. Den Kopf trägt ein besonderer Ausgang (Krimi, deutlicher Sieg, Außenseiter, weiße Weste), sonst ein Befund, der nach den Abschlägen noch zählt, sonst die Grundansicht, die am längsten nicht dran war: Tacho, Tauziehen, Abstand, Ergebniszeile, Spielfeld (${c('_spAnlass')}, ${c('SP_FORM')}, ${c('_spScoreAuswahl')}). Den Fuß trägt das stärkste Ereignis der Partie (Gegner, Höchststand, Tabelle, Revanche, Chemie, Tagesring …); ein Zustand wie Serie oder Rivalität tritt zurück, wenn er auf einer der letzten Karten schon gezeichnet war, und nie steht derselbe Fuß zweimal hintereinander. Das Bild wird mit der Karte gespeichert (${c('dataRef.visual')}).`,
    brk:'Allein nie. Bündelt sich ein Breaking-Anlass an sie, wird das Bündel Breaking.',
    zus:'Alles mit derselben Partie hängt sich an diese Karte; dann steht sie als Bündel (nächste Form).'},
  'sammel:spiel': {name:'Die Partie mit ihren Anlässen', id:'spiel_<Partie> + Teile', wann:'Zur Minute der Partie.',
    was:`Hat eine Partie mehr als ihr Ergebnis, hängt sich jede Meldung mit derselben ${c('matchId')} an die Karte ihrer Partie: Serien, Auszeichnungen, Spitzenwechsel, Revanche, Fluch, Jubiläen, Meilensteine. Die Schlagzeile fasst höchstens drei Anlässe als Reihe zusammen, der stärkste zuerst (${c('_leitWert')}), eine Pleite hinter einem Sieg, zwei Anlässe derselben Leute unter einem Namen, höchstens 96 Zeichen. Auf der Karte ist jede Zeile ein Satz (${c('_satzZeile')}); der Fuß zeichnet den schwersten Anlass (${c('_spFussFakt')}). Das Ergebnisband steht einmal. Im Blatt hat jeder Anlass seinen Abschnitt.`,
    brk:'Breaking, wenn ein Teil es ist (Spitzenwechsel, Serien-Rekord, legendäre Auszeichnung); dann steht dieser Anlass in der Schlagzeile vorn.',
    zus:'Keine Meldung einer Partie steht ohne die Karte ihrer Partie. Verschiedene Partien werden nie zusammengelegt. Das Bündel trägt den Rang seines stärksten Teils.'},
  'runde': {name:'Die Runde der Vier', id:'runde_<letzte Partie>', wann:'30 Minuten nach der letzten Partie der Runde.',
    was:`Dieselben vier Spieler am Tisch, mindestens ${c('RUNDE_MIN')} = 3 Partien ohne Pause über 30 Minuten (${c('RUNDE_PAUSE_MS')}): eine zusätzliche Karte mit der Bilanz der Runde. Die Karten der Partien bleiben daneben stehen.`,
    brk:'Nie.', zus:'Zählt gegen keinen Deckel.'},
  'potd': {name:'Spieler des Tages', id:'potd_<Tag>', wann:'Um 23:59 an jedem Spieltag mit einem Sieger.',
    was:`Die Schlagzeile des Tages (Rang ${P.potd}). Darunter, wer am meisten Elo abgab (das Gegenstück, ${c('gegenstueck')}), und die Ehrung des Tages: was der Schluss des Tages vergab (Spieler des Tages, Unschlagbar, Comeback-Tag, Tag der Götter, Allwetter, Award-Sammler; ${c('EHRUNG_SCHLUSS.tag')}), je Geehrtem eine Zeile mit Gesicht, Auszeichnungen, Zeichen und Prestige (${c('dataRef.ehrung')}). Das Blatt zeigt das Feld des Tages, die Bahn des Tagessiegers in Partien, den härtesten Tag und die Ehrung des Tages mit jedem Posten.`,
    brk:'Nur, wenn der Schluss des Tages eine legendäre Auszeichnung vergab, die nicht selbst Schlagzeile ist (Tag der Götter, Award-Sammler).',
    zus:'Trägt den härtesten Tag und die Ehrung des Tages; was sie trägt, steht nirgends sonst (keine eigene Karte um 23:57, keine Ehrung einer Runde). Eine gespeicherte eigene Ehrung des Tages (ältere Fassung) geht beim Anzeigen in sie auf.'},
  'elo_swing': {name:'Harter Tag', id:'elo_swing_day_<Spieler>_<Tag>', wann:'Um 23:58.',
    was:'Wer an einem Tag am meisten Elo abgegeben hat.',
    brk:'Nie; negativ.', zus:'Gibt es an dem Tag einen Spieler des Tages, steht er als dessen Gegenstück auf dessen Karte und im Blatt (memberIds) und nicht für sich. Allein steht er nur an Tagen ohne Spieler des Tages.'},
  'badge_marken': {name:'Kleine Marken des Tages', id:'awards:<Tag>', wann:'Um 23:57.',
    was:`Gewöhnliche Auszeichnungen an runden Marken (${(K.badgeMarkenKlein || []).join('., ')}. Mal, ${c('NEWS_BADGE_MARKEN_KLEIN')}). An einer Partie stehen sie als eine Zeile ihrer Karte; was einen ganzen Tag beschreibt, kommt erst mit dem Schluss des Tages und steht dann hier, außer der Spieler des Tages trägt es.`,
    brk:'Nie.', zus:'Je Partie eine Zeile, je Tag eine Karte.'},
  'sammel:tafel': {name:'Die Ewige Tafel des Tages', id:'tafel:<Tag>~<Fassung>', wann:'Bei der Partie, ab der ihr Stand des Abends galt.',
    was:`Rekord- und Chronikwechsel eines Spieltags gegen den Stand vor dem Spieltag (${c('_storyStand')}): übernommen, erstmals vergeben, ausgebaut, Monatschronik geholt. Eine Karte je Tag, die mit dem Tag in Fassungen wächst: jede Fassung ist der ganze Stand, gespeichert unter ${c('<ID>~<Fassung>')} (letzte Partie, ${c('z')} wenn der Tag zu ist), gezeigt wird die zu den Partien passende (${c('_tafelFassungen')}). Auf der Karte stehen höchstens ${L.sammelZeilen} Zeilen ohne Ausbauten und, hinter einem Pfeil, wer durch Rekorde und Chroniken Prestige gewinnt oder verliert (${c('_newsPrestigeBand')}); das Blatt nennt alle Zeilen und die Wirkung auf die Laufbahn aus allen drei Quellen.`,
    brk:`Nein, auch nicht mit einem erstmals vergebenen Rekord (Rang ${P.rekord_erstmals}): in der Füllphase der Tafel wird jeder Rekord zum ersten Mal vergeben, und Breaking wäre die Regel. Die Karte erbt nur, was ein Teil wirklich als Breaking trägt.`,
    zus:'Wer nicht gespielt hat, bekommt keine Zeile. Die Schandtafel meldet der Feed nicht. Die Auszeichnungen nennt die Ehrung, nicht die Tafel.'},
  'insignium_tag': {name:'Das Zeichen des Tages', id:'instag_<Tag>~<Fassung>', wann:'Bei der letzten Partie ihres Standes; was erst mit dem Schluss des Tages kam, um 23:59.',
    was:`Was der Spieltag am Insignium ändert, gegen den Stand vor dem Spieltag: jede neue Stufe, jeder Rückfall und ein Grad nur über dem höchsten bekannten Platz (${c('_insBestVor')}). Die besonderste Bewegung trägt die Bühne (${c('_insZugVor')}: neue Stufen vor Graden vor Rückfällen) mit der Verwandlung aus zwei Zeichen und der Spur der ganzen Leiter; jede übrige steht als Zeile darunter. Kein Satz, keine Prestige-Zahl auf der Karte; die stehen im Blatt.`,
    brk:'Nur beim ersten Aufstieg in die obersten zwei Stufen (Kronenreif, Ordensstern) ohne belegtes „wieder". Nur Rückfälle machen sie negativ.',
    zus:'Wächst in Fassungen wie die Tafel. Alte Einzelzeilen (insignium_stufe) werden beim Anzeigen zur Karte ihres Tages (_insAltZuTag).'},
  'insignium_tag:woche': {name:'Das Zeichen des Wochenschlusses', id:'instag_woche_<Montag>', wann:'Montag 00:00.',
    was:'Wer mit dem Schluss der Woche (Spieler der Woche, Award-Sammler) eine Stufe oder einen Grad weiter steht, aus dem Stand eine Millisekunde davor gegen den Schluss. Darunter der Grund (die Auszeichnung des Schlusses), im Blatt die Leiter der Liga nach der Woche.',
    brk:'Wie das Zeichen des Tages.', zus:'Entsteht nicht, wenn der Monat am selben Abend schließt: dann trägt der Monatsabschluss beide Zeichen.'},
  'ehrung:runde': {name:'Die Ehrung einer Runde', id:'ehrung_<letzte Partie>', wann:`${K.ehrungPause / 3600e3} Stunden nach der letzten Partie, wenn keine mehr dazukam.`,
    was:`Jede Auszeichnung seit der Ehrung davor: je Geehrtem eine Säule, so hoch wie das Prestige aus Auszeichnungen, gestapelt aus jeder seltenen und legendären und einem Stück für alle gewöhnlichen, darauf die Zeichenkachel der wertvollsten, unten das Wappen; höchstens fünf je Reihe, die Reihen um höchstens eine Säule verschieden. Der Wert ist der Teilwert beim wievielten Mal (${c('auszeichnungsTeilwert')}). Partien mit weniger als zwei Stunden Abstand teilen eine Karte. Darunter, in welchen Partien sie geholt sind.`,
    brk:'Nie: die legendären Auszeichnungen einer Runde haben ihre eigene Zeile an ihrer Partie. Mit einer legendären trägt die Karte den Schimmer des Seltenen.',
    zus:'Was der Schluss des Tages vergibt, steht beim Spieler des Tages und in keiner Runde. Nur, was Prestige gibt.'},
  'ehrung:woche': {name:'Die Ehrung der Woche', id:'ehrung_der_woche_<Montag>', wann:'Sonntag 23:59:05, zur Zeit der Wochenkarte und direkt darunter.',
    was:`Alle Auszeichnungen der Woche, aus denselben zwei Ständen wie die Säulen ihres Rückblicks (${c('rcpWocheLaufbahn')}): gezählt bis zum Schluss am Montag 00:00, also mit Spieler der Woche und Award-Sammler, ohne die Titel eines Monats, der in der Woche endet. Gold wie die Wochenkarte, eigene Rubrik, oben Schlagzeile und Zeitraum, darunter die Säulen mit Namen (vier je Reihe) und was jede Klasse brachte.`,
    brk:'Nur, wenn der Schluss der Woche eine legendäre Auszeichnung vergab, die nicht Schlagzeile ist (Award-Sammler); als breaking mitgespeichert.',
    zus:'Steht bei gleicher Zeit unter der Wochenkarte, weil die wichtigere oben steht (_storyFolge).'},
  'ehrung:monat': {name:'Die Ehrung des Monats', id:'ehrung_des_monats_<Monat>', wann:'Am Ersten um 00:00, zur Zeit des Monatsabschlusses und direkt darunter.',
    was:'Alle Auszeichnungen des Monats, dieselben wie die Säulen seines Rückblicks (rcpLaufbahnDaten): mit Meister, Vize-Meister, Team der Saison und Untouchable, die in der letzten Millisekunde des Monats kommen. Ab vier Geehrten nennt die Schlagzeile ihre Zahl statt der Namen.',
    brk:'Nie: der Monat ist es mit seinem Rückblick schon.', zus:'Steht unter dem Monatsabschluss (_storyFolge).'},
  'woche': {name:'Die Woche', id:'woche_<Woche>', wann:'Sonntag 23:59:05, nach dem Spieler des Tages und vor dem Montag.',
    was:'Sechs Wertungen in einer Karte, nach Wertigkeit: Spieler der Woche, Team der Woche, Größter Aufwind (ab 50 Elo), Klarster Sieg, Größte Überraschung, Krimi der Woche. Das Blatt zeigt alle sechs; ein Knopf öffnet den Wochenrückblick.',
    brk:'Nie.', zus:'Erscheint nicht ohne Partie in der Woche. Darunter die Ehrung der Woche.'},
  'season_start': {name:'Die erste Tabelle', id:'season_start_<Monat>', wann:'Bei der Partie, die die Tabelle des Monats belastbar macht.',
    was:'Eine Karte je Monat, sobald die Rangliste belastbar ist (genug Partien und genug Spieler, die wirklich dabei waren) [§11.0e]. Sie nennt den Stand dieser Partie. Bis dahin steht über die Tabelle nichts im Feed, auch kein Spitzenwechsel.',
    brk:'Nie.', zus:''},
  'season_endgame': {name:'Schlusssprint', id:'season_endspurt_<Monat>', wann:'Bei der letzten Partie, in den letzten sieben Tagen des Monats.',
    was:'Die letzten sieben Tage eines Monats, wenn die Entscheidung offen ist: höchstens 25 Elo zwischen Platz 1 und 2 (SAISON_ENDSPURT_ELO) und eine belastbare Rangliste. Ein Countdown ohne Spannung ist kein Ereignis.',
    brk:'Immer.', zus:'Eine ID je Monat: sie entsteht einmal.'},
  'season_recap': {name:'Monatsabschluss', id:'season_recap_<Monat>', wann:'Am Ersten um 00:00.',
    was:'Eine Karte: Podest, Titelrennen, darunter das Team der Saison mit Bilanz und Elo, die Chronik des Monats mit ihrer Zahl, die drei mit den meisten Einträgen und wer zum ersten Mal darin steht, und jede Insignium-Bewegung, die erst mit den Titeln kam. Ein Tippen öffnet den Saison-Rückblick; ein eigenes Blatt hat sie nicht.',
    brk:'Immer: der Meister steht fest.', zus:'Darunter die Ehrung des Monats. Ist sie da, ist sie beim ersten Öffnen danach die jüngste Karte.'},
  'ambient': {name:'Fun Fact', id:'ambient_<Tag>_15', wann:'Um 15:00, je Tag ein Platz.',
    was:'Ein Fun Fact je Tag, nachgetragen für stille Tage im Fenster des Generators. Gezogen wird deterministisch mit Rotation von Vorlage, Rubrik und These; die Rubrik des Fun Facts davor ist gesperrt, und zuerst gezogen wird eine Karte über jemanden, der in den drei Tagen davor keine eigene Karte hatte. Jedes Bild kommt aus dataRef.bild (30c-news-fakt.js).',
    brk:'Nie.', zus:'Wird eine Karte im Platz abgemeldet, ist der Platz frei, und der Ersatz trägt die nächste ID (ambient_<Tag>_15_2), weil die Datenbank keine Zeile ändert.'},
  'dry_spell': {name:'Spielpause', id:'dry_spell_<letzte Partie>', wann:'Beim ersten Lauf nach drei Tagen ohne Partie.',
    was:'Ab drei Tagen ohne Partie. Die ID trägt die letzte Partie: je Pause eine Karte, mit dem Zeitpunkt, zu dem sie zuerst gespeichert wurde.',
    brk:'Nie.', zus:''},
  'quiet_week': {name:'Ruhige Woche', id:'quiet_week_<Woche>', wann:'Beim ersten Lauf in der ruhigen Woche.',
    was:'Die letzten sieben Tage hatten höchstens halb so viele Partien wie im Schnitt der vier Wochen davor, und dieser Schnitt liegt bei mindestens zwanzig.',
    brk:'Nie.', zus:''},
  'karriereende': {name:'Karriereende', id:'karriereende_<Spieler>_<Tag>', wann:'Zur Zeit des Karriereendes.',
    was:'Die einzige Nachricht über einen Ruheständler nach seinem Abschied [§C40]: Partien, Siege, Siegquote und was beim Abschied in der Ewigen Tafel steht. Das Blatt führt zum Abschied. In den echten Partien kommt kein Karriereende vor; das Beispiel ist gestellt (siehe oben).',
    brk:'Immer.', zus:'Danach nennt ihn keine Story mehr.'},
};

// ── Die Anlässe des Generators ──────────────────────────────────────
// Jeder Typ, den `_buildStories` bildet, mit seiner Regel und dem Ort, an
// dem er im Feed steht.
const WO = {eigen:'eigene Karte', partie:'Zeile der Karte ihrer Partie', tafel:'Zeile der Tafel des Tages',
  potd:'auf dem Spieler des Tages', tag:'23:57 oder an ihrer Partie'};
const ANLASS = {
  win_streak:['Siegesserie', 'partie', 'Marken 3, 5, 8, 10, danach jede fünfte, an der Partie, die sie vollmacht; je Spieler und Tag die längste.'],
  loss_streak:['Pleitenserie', 'partie', 'Marken 5, 8, 10, danach jede fünfte; je Spieler und Tag die längste. Negativ.'],
  team_streak:['Duo-Siegesserie', 'partie', 'Marken 5, 7, 10, 15, 20 gemeinsamer Siege in Folge; je Duo und Tag die längste.'],
  team_loss_streak:['Duo-Pleitenserie', 'partie', 'Ab drei gemeinsamen Niederlagen in Folge; je Duo und Tag die längste. Negativ.'],
  top_form:['Über dem eigenen Schnitt', 'partie', 'Die letzten 10 Partien liegen mindestens 25 Prozentpunkte über der Siegquote der Laufbahn davor (mindestens 8 Partien zum Vergleich). Gemeldet wird der Übertritt über die Schwelle, nicht der Zustand.'],
  streak_killer:['Serienkiller', 'partie', 'Die Partie beendet eine Siegesserie von mindestens vier.'],
  top_clash:['Spitzenspiel', 'partie', 'Platz 1 schlägt Platz 2, nach den Rängen vor der Partie; nicht am Monatsanfang (erst ab dem 8. Tag, 12 Partien und 5 Spielern).'],
  giant_slayer:['Sensation', 'partie', 'Sieg mit weniger als 20 % Siegchance (CHANCE_SENSATION).'],
  streak_record:['Serien-Rekord', 'partie', 'Die längste Siegesserie aller Zeiten, mindestens fünf, erst ab 30 Partien der Liga. Breaking.'],
  lead_change:['Spitzenwechsel', 'partie', 'Jeder Wechsel auf Platz 1 eines Tages in einer Karte (lead_day_<Monat>_<Tag>), an der Partie des letzten Wechsels, mit jedem Wechsel im Blatt; erst in einer belastbaren Tabelle. Breaking.'],
  badge_unlocked:['Auszeichnung', 'tag', 'Seltene und legendäre nach dem wievielten Mal (_badgeTakt): legendär immer (Breaking), selten beim 1., 5., 10., 20., 25., 50., 75., 100., 125. und danach jedem 25. Mal. Was einen ganzen Tag beschreibt (Unschlagbar, Comeback-Tag, Zusammenbruch, Schwarzer Tag), kommt erst mit dem Schluss des Tages: um 23:57, außer der Spieler des Tages trägt es.'],
  badge_marken:['Kleine Marken', 'tag', 'Gewöhnliche Auszeichnungen beim 5., 10., 25., 50., 100. Mal, je Partie in einer Zeile.'],
  rivalry:['Rivalität', 'partie', 'Jedes zehnte Duell zweier Spieler ab dem 50., an der Partie, in der es gespielt wurde.'],
  rivalry_milestone:['Rivalitäts-Meilenstein', 'partie', 'Das 50., 100., 200. und 500. Duell.'],
  jubilee:['Spiel-Jubiläum', 'partie', 'Runde Zahlen der eigenen Partien, Leiter ab 10.'],
  milestone_wins:['Sieg-Meilenstein', 'partie', 'Runde Zahlen der eigenen Siege, Leiter ab 100.'],
  milestone_goals:['Tor-Meilenstein', 'partie', 'Runde Zahlen der eigenen Tore, Leiter ab 500.'],
  milestone_elo:['Elo-Marke', 'partie', 'Runde Elo-Marken der Laufbahn.'],
  fluch:['Gebrochener Fluch', 'partie', 'Erster Sieg nach mindestens fünf Niederlagen in Folge gegen denselben, der letzte Sieg gegen ihn zwei Wochen her oder nie.'],
  duo_jubilaeum:['Duo-Jubiläum', 'partie', 'Die 25., 50., 75., 100. … gemeinsame Partie.'],
  revanche:['Revanche', 'partie', 'Dieselben Duos am selben Tag, das Duell davor mit mindestens drei Toren verloren.'],
  tagesmarathon:['Langer Tag', 'partie', 'Die 10., 15., 20., 25., 30., 40. Partie eines Spielers am Tag.'],
  elo_hoch:['Elo-Höchststand', 'partie', 'Über dem höchsten Stand, den er je in einem Monat hatte, nach mindestens zwanzig Partien. Holt er damit „Der höchste Gipfel", meldet ihn nur die Tafel.'],
  tabellensprung:['Tabellensprung', 'partie', 'Drei Plätze mit einem Sieg, nur in einer belastbaren Tabelle.'],
  group:['Gruppe', 'partie', 'Gleichartige Meldungen derselben Partie für mehrere Spieler fasst die Verdichtung zu einer Zeile zusammen.'],
  rekord_geholt:['Rekord übernommen', 'tafel', 'Ein Liga-Rekord wechselt den Halter (rek_<Rekord>_<Tag>).'],
  rekord_erstmals:['Rekord erstmals vergeben', 'tafel', `Ein Liga-Rekord hat zum ersten Mal einen Halter. Rang ${P.rekord_erstmals}, aber kein Breaking.`],
  rekord_gesteigert:['Rekord ausgebaut', 'tafel', 'Derselbe Halter verbessert den Wert. Bringt kein Prestige und steht in der Gruppe „Ausbauten".'],
  chronik_geholt:['Monatschronik geholt', 'tafel', 'Eine Monatschronik wechselt den Halter (chrget_<Chronik>_<Monat>_<Tag>). Prestige nur bei dem, dessen gezählter Eintrag des Monats sich ändert.'],
};

// ── Zeichnungen und Anlässe einer Karte, lesbar ─────────────────────
const KOPF = {tacho:'Tacho', muenze:'Münzwurf', tauziehen:'Tauziehen', abstand:'Abstand', deutlich:'Deutlicher Sieg',
  aussenseiter:'Außenseiter', krimi:'Krimi', feld:'Spielfeld', streu:'Streuung', mosaik:'Mosaik', zeile:'Ergebniszeile',
  gefaelle:'Gefälle', transfer:'Transfer'};
const FUSS = {premiere:'Premiere', gegner:'Gegner', revanche:'Revanche', tagesring:'Tagesring', chemie:'Chemie',
  rolle:'Rolle', wende:'Wende', rang:'Rang', verteilung:'Verteilung', uhr:'Uhr des Tages', ueberholt:'Überholt',
  duoserie:'Duo-Serie', zaehlwerk:'Zählwerk', gipfel:'Gipfel', nerven:'Nerven', rueckkehr:'Rückkehr'};
const name = t => (ANLASS[t] && ANLASS[t][0]) || (FORM[t] && FORM[t].name) || t;
const marke = k => {
  const [a, b, x] = k.split(':');
  if(a === 'kopf') return 'Kopf: ' + (KOPF[b] || name(b));
  if(a === 'fuss') return 'Fuß: ' + (FUSS[b] || b);
  if(a === 'teil') return name(b) + (x ? ' (' + x + ')' : '');
  if(a === 'bild') return 'Bild: ' + b;
  return {brk:'Breaking', neg:'negativ', gegen:'mit Gegenstück', ehrung:'mit Ehrung des Tages', potd:'Spieler des Tages',
    viele:'viele', eins:'eine Bewegung', ab:'mit Rückfall', runde:'Runde', woche:'Woche', monat:'Monat'}[k] || k;
};

// ── Das Wörterbuch der Zeichnungen ──────────────────────────────────
const SVG = /<svg\b[\s\S]*?<\/svg>/g;
const woerter = new Map();
const norm = x => {
  const pre = new Set();
  (x.match(/\bid="([^"]+)"/g) || []).forEach(i => { const v = i.slice(4, -1); if(v.includes('_')) pre.add(v.split('_')[0]); });
  let y = x;
  [...pre].sort((a, b) => b.length - a.length).forEach((p, j) => { y = y.split(p + '_').join('§' + j + '_'); });
  return y;
};
const packe = h => String(h || '').replace(SVG, x => {
  if(x.length < 800) return x;
  const n = norm(x);
  if(!woerter.has(n)) woerter.set(n, woerter.size);
  return '@@' + woerter.get(n) + '@@';
});
const karten = {};
Object.keys(D.formen).forEach(f => {
  karten[f] = D.formen[f].beispiele.map(b => ({
    k:packe(b.karte), b:packe(b.blatt), cls:b.ndKlasse || 'nd',
    cap:[datum(b.when) + ', ' + uhr(b.when), SEITE[b.seite] || b.seite, 'Rang ' + b.prio]
      .concat(b.brk ? ['Breaking'] : []).concat(b.neg ? ['negativ'] : []),
    marken:(b.marken || []).map(marke)}));
});
const daten = zlib.gzipSync(JSON.stringify({s:[...woerter.keys()], c:karten}), {level:9}).toString('base64');

// ── Gemessenes je Form ──────────────────────────────────────────────
const uhrText = f => {
  const e = Object.entries(f.uhr).sort((a, b) => b[1] - a[1]);
  const n = e.reduce((s, x) => s + x[1], 0);
  if(e[0] && e[0][1] / n >= .9) return 'immer ' + e[0][0];
  const t = Object.keys(f.uhr).sort();
  return 'verteilt, ' + t[0] + ' bis ' + t[t.length - 1];
};
const prioText = f => { const p = Object.keys(f.prio).map(Number).sort((a, b) => a - b);
  return p.length > 1 ? p[0] + ' bis ' + p[p.length - 1] : String(p[0]); };
const seiteText = f => Object.keys(f.seite).map(k => SEITE[k] || k).join(', ');

const formHtml = key => {
  const F = FORM[key], f = D.formen[key];
  if(!F || !f) return '';
  const anlaesse = key === 'sammel:spiel'
    ? [...new Set(Object.keys(f.marken).filter(k => k.startsWith('teil:')).map(k => name(k.split(':')[1])))].join(', ') : '';
  return `<article class="sl-form" id="f-${esc(key.replace(':', '-'))}">
    <header class="sl-form-k"><h3>${esc(F.name)}</h3><span class="sl-id">${esc(F.id)}</span></header>
    <div class="sl-form-g">
      <div class="sl-form-t">
        <p>${F.was}</p>
        <dl class="sl-fakten">
          <dt>Wann</dt><dd>${esc(F.wann)} <span class="sl-mess">gemessen: ${esc(uhrText(f))}</span></dd>
          <dt>Breaking</dt><dd>${esc(F.brk)} <span class="sl-mess">gemessen: ${f.brk} von ${f.n}</span></dd>
          ${F.zus ? `<dt>Zusammen</dt><dd>${esc(F.zus)}</dd>` : ''}
          <dt>Seite</dt><dd>${esc(seiteText(f))}</dd>
          <dt>Rang</dt><dd class="num">${esc(prioText(f))}</dd>
          <dt>Im Lauf</dt><dd>${zahl(f.n)} Karten im Feed${D.gebildet[key] && D.gebildet[key] !== f.n ? `, ${zahl(D.gebildet[key])} gespeicherte Zeilen` : ''}${f.member ? `, ${zahl(f.member)} mit zusammengeführten Meldungen` : ''}</dd>
          ${anlaesse ? `<dt>Anlässe</dt><dd>${esc(anlaesse)}</dd>` : ''}
        </dl>
      </div>
      <div class="sl-bsp-l" data-form="${esc(key)}"><p class="sl-warte">${f.beispiele.length} ${f.beispiele.length === 1 ? 'Beispiel wird' : 'Beispiele werden'} gezeichnet …</p></div>
    </div>
  </article>`;
};

// ── Die Uhr eines Tages ─────────────────────────────────────────────
const UHR = [
  ['zur Partie', 'Die Karte der Partie mit allem, was in ihr passiert ist: Serien, Auszeichnungen, Spitzenwechsel, Revanche, Fluch, Jubiläen, Meilensteine.', 'spiel'],
  ['zur Partie', 'Die Tafel des Tages, bei der Partie, ab der ihr Stand galt; sie wächst in Fassungen.', 'sammel:tafel'],
  ['zur Partie', 'Das Zeichen des Tages, ebenso in Fassungen.', 'insignium_tag'],
  ['zur Partie', 'Die erste Tabelle eines Monats und der Schlusssprint der letzten sieben Tage.', 'season_start'],
  ['+30 Min.', 'Die Runde der Vier, nach mindestens drei Partien derselben vier ohne Pause.', 'runde'],
  ['+2 Std.', 'Die Ehrung der Runde, wenn keine Partie mehr kam.', 'ehrung:runde'],
  ['15:00', 'Der Fun Fact des Tages.', 'ambient'],
  ['23:57', 'Was einen ganzen Tag beschreibt und der Spieler des Tages nicht trägt; die kleinen Marken des Tages.', 'badge_marken'],
  ['23:58', 'Der härteste Tag, nur an Tagen ohne Spieler des Tages.', 'elo_swing'],
  ['23:59', 'Der Spieler des Tages mit Gegenstück und Ehrung des Tages; was das Zeichen erst mit dem Schluss des Tages bewegt.', 'potd'],
  ['So 23:59:05', 'Die Woche, direkt darunter die Ehrung der Woche.', 'woche'],
  ['Mo 00:00', 'Das Zeichen des Wochenschlusses (nicht, wenn der Monat am selben Abend schließt).', 'insignium_tag:woche'],
  ['1. 00:00', 'Der Monatsabschluss, direkt darunter die Ehrung des Monats.', 'season_recap'],
  ['beim Lauf', 'Spielpause und ruhige Woche tragen den Zeitpunkt, zu dem sie zuerst gespeichert wurden.', 'dry_spell'],
];

// ── Zahlen eines Tages ──────────────────────────────────────────────
const tage = D.proTag;
const spieltage = tage.filter(t => t.spieltag), still = tage.filter(t => !t.spieltag);
const mittel = l => l.length ? Math.round(l.reduce((s, t) => s + t.heute, 0) / l.length * 10) / 10 : 0;
const maxTag = spieltage.reduce((m, t) => t.heute > m.heute ? t : m, {heute:0});

const prioBalken = Object.entries(P).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
  `<li><span class="sl-pb-n">${esc(k)}</span><span class="sl-pb-b ${v >= 90 ? 'brk' : v >= 38 ? 'tag' : 'hint'}" style="--w:${v}%"></span><span class="num">${v}</span></li>`).join('');

const anlassZeilen = Object.keys(D.gebildet).filter(t => ANLASS[t]).sort((a, b) => D.gebildet[b] - D.gebildet[a]).map(t => {
  const [n, wo, regel] = ANLASS[t];
  const r = (D.roh[t] || [])[0];
  return `<tr><td><b>${esc(n)}</b><span class="sl-id">${esc(t)}</span></td><td>${esc(regel)}</td><td>${esc(WO[wo])}</td>`
    + `<td class="num">${zahl(D.gebildet[t])}</td><td class="num">${r ? r.prio : ''}</td><td class="sl-satz">${r ? esc(r.title) : ''}</td></tr>`;
}).join('');
const nieGesehen = Object.keys(ANLASS).filter(t => !D.gebildet[t] && !['badge_marken', 'group'].includes(t)).map(t => ANLASS[t][0]);

const inhalt = `
<header class="sl-kopf">
  <p class="sl-dach">Kicker-Liga · Feed</p>
  <h1>Die Stories der Liga</h1>
  <p class="sl-lead">Jede Kartenform des Feeds und jeder Anlass dahinter: wann eine Story entsteht, zu welcher Uhrzeit, wann sie Breaking ist, auf welcher Seite sie steht und wie sie sich mit anderen zusammenführt. Gezeichnet hat alles die App selbst, mit ihrem eigenen Code, aus den ${zahl(D.partien)} echten Partien vom ${esc(D.erster.split('-').reverse().join('.'))} bis ${esc(D.letzter.split('-').reverse().join('.'))}, Tag für Tag nachgespielt und gespeichert wie in der Datenbank: ${zahl(D.zeilen)} Zeilen.</p>
  <p class="sl-hinweis">Gestellt ist eine Sache: ein Karriereende kommt in den Partien nicht vor. Für das Beispiel beendet Anton am 20.10. um 18:00 die Karriere.</p>
  <nav class="sl-nav">
    <a href="#weg">Weg</a><a href="#uhr">Uhr</a><a href="#breaking">Breaking</a><a href="#seiten">Seiten</a>
    <a href="#zusammen">Zusammenführen</a><a href="#karten">Karten</a><a href="#anlaesse">Anlässe</a><a href="#zahlen">Zahlen</a>
  </nav>
</header>

<section id="weg" class="sl-abschnitt">
  <h2>Der Weg einer Story</h2>
  <ol class="sl-weg">
    <li><b>Rechnen.</b> Der Generator (${c('_buildStories')}) liest die Partien, die Ewige Tafel, die Chroniken, das Prestige und das Insignium, und rechnet nichts neu: wer den Tag gewonnen hat, sagt dieselbe Rechnung wie der Rückblick. Er bildet nur die letzten ${K.fenster} Tage (${c('NEWS_FENSTER_TAGE')}).</li>
    <li><b>Benennen.</b> Jede ID kommt aus der Sache (Spieler, Partie, Tag, Monat), nie aus Uhrzeit oder Zufall: derselbe Datenstand ergibt dieselben Karten, auf jedem Gerät.</li>
    <li><b>Veröffentlichen.</b> Nur ein Gerät mit der Uhr der Liga schreibt, und nur aus den Partien von eben [§C42]; der Start der App zeigt den letzten Stand und schreibt nie. Die Datenbank nimmt nur neue Zeilen: eine veröffentlichte Story bleibt in ID, Text, Zeit, Rang und Bild, wie sie ist. Tafel und Zeichen des Tages wachsen deshalb in Fassungen (${c('<ID>~<Fassung>')}).</li>
    <li><b>Laden.</b> Der Feed reicht bis zum selben Tag des Vormonats (${c('newsAnzeigeAb')}); eine Zeile hält ${K.halten} Tage ab ihrem Ereignis (${c('NEWS_HALTEN_TAGE')}). Was das Gerät schon hat und was die Datenbank bringt, wird vereinigt; die gespeicherte Fassung gewinnt (${c('_mergeStorySnapshots')}).</li>
    <li><b>Abmelden.</b> Was der Generator nicht mehr bildet, meldet ${c('STORY_ABGEMELDET')} am ID-Präfix ab (${K.abgemeldet.length} Präfixe); es erreicht den Feed nicht. Ein abgemeldeter Fun Fact gibt seinen Platz frei.</li>
    <li><b>Verdichten.</b> ${c('_consolidateStories')} führt zusammen, ohne etwas zu verlieren (${c('memberIds')}, ${c('sourceIds')}): die Partie mit ihren Anlässen, Sammelkarten nach ihrem Grund, das Gegenstück und die Ehrung des Tages auf dem Spieler des Tages, je Tag eine Fassung der Tafel.</li>
    <li><b>Ordnen.</b> Die Reihenfolge ist die Zeit. Bei gleicher Zeit steht die wichtigere Karte oben (${c('_storyFolge')}); so stehen die Ehrungen der Woche und des Monats direkt unter ihrer Karte.</li>
    <li><b>Auszeichnen.</b> Breaking entscheidet ${c('_isBreaking')} nach dem Verdichten. Die Karte des Tages (${c('_newsTagKarte')}) hebt an Spieltagen ab der ${L.tagKartePartien}. Partie die spannendste hervor, nie Breaking, den Spieler des Tages, einen Rückblick oder eine negative Karte.</li>
    <li><b>Einsortieren.</b> Jede Karte gehört genau einer Seite (${c('_newsSeite')}); Breaking liegt quer dazu.</li>
    <li><b>Lesen.</b> Neu ist, was seit dem Lesestand dazukam. Setzt eine Karte eine frühere fort, sagt sie es mit einem Faden, an den Partien nachgeprüft (${c('_newsFaeden')}). Neue Zeilen anderer Geräte kommen über Realtime und sortieren sich nach derselben Regel ein.</li>
  </ol>
</section>

<section id="uhr" class="sl-abschnitt">
  <h2>Die Uhr eines Tages</h2>
  <p class="sl-satz-l">Was zur Partie gehört, steht in deren Minute. Was einen Zeitraum beschreibt, steht an dessen Ende, in einer festen Reihenfolge: der Tag um 23:59, die Woche am Sonntag um 23:59:05, der Monat am Ersten um 00:00. So ist der Abschluss beim ersten Öffnen danach die jüngste Karte.</p>
  <div class="sl-tab"><table class="sl-uhr"><thead><tr><th>Zeit</th><th>Was</th><th>Gemessen</th></tr></thead><tbody>
    ${UHR.map(([z, w, f]) => `<tr><td class="num">${esc(z)}</td><td>${esc(w)} <a href="#f-${esc(f.replace(':', '-'))}">${esc(FORM[f] ? FORM[f].name : f)}</a></td><td class="sl-mess">${D.formen[f] ? esc(uhrText(D.formen[f])) : ''}</td></tr>`).join('')}
  </tbody></table></div>
</section>

<section id="breaking" class="sl-abschnitt">
  <h2>Breaking</h2>
  <p class="sl-satz-l">Breaking ist das Seltenste, etwas, das vielleicht einmal im Monat passiert. Es scheitert an keinem Deckel und keiner Sperre, wird erst nach dem Bündeln entschieden, und eine gebündelte Breaking-Karte nennt ihren Anlass zuerst.</p>
  <div class="sl-zwei">
    <div><h4>Immer</h4><ul>
      <li>Spitzenwechsel eines belastbaren Spieltags</li><li>Serien-Rekord: längste Siegesserie aller Zeiten</li>
      <li>Monatsabschluss: der Meister steht fest</li><li>Schlusssprint bei offener Lage</li><li>Karriereende</li></ul>
      <h4>Unter Bedingung</h4><ul>
      <li>Auszeichnung: nur legendär</li>
      <li>Spieler des Tages und Ehrung der Woche: wenn ihr Schluss eine legendäre Auszeichnung vergab, die nicht Schlagzeile ist (${c('EHRUNG_KOPF')}: ${esc(K.ehrungKopf.join(', '))})</li>
      <li>Zeichen des Tages: erster Aufstieg in die obersten zwei Stufen, ohne belegtes „wieder"</li>
      <li>Bündel und Sammelkarte: wenn ein Teil es ist</li></ul></div>
    <div><h4>Nie</h4><ul>
      <li>Rekord erstmals vergeben: in der Füllphase der Tafel wird jeder Rekord zum ersten Mal vergeben</li>
      <li>Spitzenspiel und Sensation: sie haben ihre Zeile an der Partie</li>
      <li>Ehrung einer Runde und des Monats</li><li>Fun Facts, Rückblicke außer dem Monat, alles Negative</li></ul>
      <h4>Gemessen im Lauf</h4><ul>
      ${Object.keys(D.formen).filter(k => D.formen[k].brk).map(k => `<li>${esc(FORM[k] ? FORM[k].name : k)}: <span class="num">${D.formen[k].brk} von ${D.formen[k].n}</span></li>`).join('')}</ul></div>
  </div>
</section>

<section id="seiten" class="sl-abschnitt">
  <h2>Die Seiten des Feeds</h2>
  <p class="sl-satz-l">Sieben Chips: Alle, Breaking und fünf Seiten. Jede Karte steht auf genau einer Seite, und die Seiten ergeben zusammen „Alle"; „Liga" nimmt, was keiner anderen gehört.</p>
  <div class="sl-tab"><table><thead><tr><th>Seite</th><th>Regel</th><th>Formen im Lauf</th></tr></thead><tbody>
    <tr><td><b>Zeichen</b></td><td>Was das Insignium bewegt.</td><td>${esc(Object.keys(D.formen).filter(k => D.formen[k].seite.zeichen).map(k => FORM[k] ? FORM[k].name : k).join(', '))}</td></tr>
    <tr><td><b>Tafel</b></td><td>Rekorde und Chroniken, die kurze Strecke.</td><td>${esc(Object.keys(D.formen).filter(k => D.formen[k].seite.tafel).map(k => FORM[k] ? FORM[k].name : k).join(', '))}</td></tr>
    <tr><td><b>Ehrung</b></td><td>Auszeichnungen, und was ein Spieler ohne Partie auf einmal holt.</td><td>${esc(Object.keys(D.formen).filter(k => D.formen[k].seite.ehrung).map(k => FORM[k] ? FORM[k].name : k).join(', '))}</td></tr>
    <tr><td><b>Spieltag</b></td><td>Alles mit einer Partie, Spieler des Tages, Woche, Runde.</td><td>${esc(Object.keys(D.formen).filter(k => D.formen[k].seite.spieltag).map(k => FORM[k] ? FORM[k].name : k).join(', '))}</td></tr>
    <tr><td><b>Liga</b></td><td>Der Rest: Fun Facts, Monat, Pausen, Karriereende.</td><td>${esc(Object.keys(D.formen).filter(k => D.formen[k].seite.liga).map(k => FORM[k] ? FORM[k].name : k).join(', '))}</td></tr>
  </tbody></table></div>
</section>

<section id="zusammen" class="sl-abschnitt">
  <h2>Wie Stories zusammenfinden</h2>
  <ul class="sl-regeln">
    <li><b>Eine Partie, eine Karte.</b> Alles mit derselben ${c('matchId')} hängt sich an ${c('spiel_<Partie>')}, auch Breaking, seltene Auszeichnungen und negative Zeilen. Verschiedene Partien werden nie über eine Minute zusammengelegt. Die Schlagzeile nennt höchstens drei Anlässe, der stärkste zuerst; das Bündel trägt den Rang seines stärksten Teils.</li>
    <li><b>Sammelkarten nach ihrem Grund.</b> Was im selben Moment aus demselben Grund passiert, kommt in eine Karte (${c('causalKey')}): die Tafel eines Spieltags, die kurze Strecke, die Spieler-Karte, die Erfolgs-Karte. Die Karte zeigt höchstens ${L.sammelZeilen} Zeilen ohne Ausbauten, das Blatt alle.</li>
    <li><b>Fassungen.</b> Tafel und Zeichen des Tages werden mit jeder Partie als ganze neue Fassung gespeichert; gezeigt wird je Tag nur die, die zu den Partien passt.</li>
    <li><b>Der Spieler des Tages trägt den Tag.</b> Der härteste Tag steht als Gegenstück auf seiner Karte; was der Schluss des Tages vergab, als Ehrung des Tages. Was er trägt, hat keine eigene Karte um 23:57 und steht in keiner Ehrung einer Runde (${c('_tagGetragen')}). Gespeicherte eigene Ehrungen eines Tages aus einer älteren Fassung gehen beim Anzeigen in ihn auf.</li>
    <li><b>Keine Auszeichnung zweimal.</b> Was eine gespeicherte Ehrung einer Runde schon nennt, lässt die Ehrung des Tages weg (${c('_ehrungSchonGenannt')}). Die Woche zieht die Titel eines Monats ab, der in ihr endet; die gehören dem Monat.</li>
    <li><b>Schluss unter Schluss.</b> Ehrung der Woche und des Monats haben dieselbe Zeit wie Wochenkarte und Monatsabschluss und stehen direkt darunter.</li>
    <li><b>Alte Zeilen.</b> Einzelne Stufen-Zeilen (${c('insignium_stufe')}) werden zur Zeichen-Karte ihres Tages; abgemeldete Präfixe erreichen den Feed nicht.</li>
  </ul>
</section>

<section id="karten" class="sl-abschnitt">
  <h2>Die Karten</h2>
  <p class="sl-satz-l">Jede Form, wie der Feed sie zeigt, mit Beispielen aus dem Lauf, gezeichnet am Abend ihres Tages (deshalb steht im Blatt „Heute"). Ausgewählt ist so, dass jede Kopf- und Fußzeichnung einer Partie, jeder Anlass in einem Bündel und jede Grafik eines Fun Facts mindestens einmal vorkommt. „Blatt" öffnet, was die App beim Tippen auf die Karte zeigt.</p>
  ${GRUPPEN.map(([titel, formen]) => `<h3 class="sl-gruppe">${esc(titel)}</h3>${formen.map(formHtml).join('')}`).join('')}
</section>

<section id="anlaesse" class="sl-abschnitt">
  <h2>Die Anlässe</h2>
  <p class="sl-satz-l">Was der Generator außer den Karten oben bildet. Die meisten Anlässe stehen nicht für sich, sondern als Zeile der Karte ihrer Partie oder der Tafel ihres Tages. Die Zahl ist, wie viele Zeilen der Lauf gespeichert hat.</p>
  <div class="sl-tab"><table class="sl-anl"><thead><tr><th>Anlass</th><th>Regel</th><th>Steht als</th><th>Zeilen</th><th>Rang</th><th>Zuletzt</th></tr></thead><tbody>${anlassZeilen}</tbody></table></div>
  ${nieGesehen.length ? `<p class="sl-mess">Im Lauf nicht vorgekommen: ${esc(nieGesehen.join(', '))}.</p>` : ''}
</section>

<section id="zahlen" class="sl-abschnitt">
  <h2>Zahlen</h2>
  <div class="sl-zahlen">
    <div><b class="num">${mittel(spieltage)}</b><span>Karten im Schnitt an einem Spieltag</span></div>
    <div><b class="num">${maxTag.heute}</b><span>an einem Tag höchstens (${esc(maxTag.tag ? maxTag.tag.split('-').reverse().join('.') : '')})</span></div>
    <div><b class="num">${mittel(still)}</b><span>Karten im Schnitt an einem Tag ohne Partie</span></div>
    <div><b class="num">${zahl(D.zeilen)}</b><span>gespeicherte Zeilen über ${zahl(tage.length)} Tage</span></div>
  </div>
  <h4>Rang (${c('STORY_PRIO')})</h4>
  <p class="sl-satz-l">Eine Skala: Breaking ab 90, der Spieltag von 38 bis 89, der Hintergrund darunter. Der Rang ordnet keine Zeit um; er wiegt nur Sammelkarte und Karte des Tages und entscheidet bei gleicher Zeit.</p>
  <ul class="sl-pb">${prioBalken}</ul>
  <h4>Grenzen (${c('NEWS_LIMITS')})</h4>
  <div class="sl-tab"><table><tbody>${Object.entries(L).map(([k, v]) => `<tr><td>${c(k)}</td><td class="num">${esc(v)}</td></tr>`).join('')}</tbody></table></div>
  <h4>Abgemeldet (${c('STORY_ABGEMELDET')})</h4>
  <p class="sl-abg">${K.abgemeldet.map(c).join(' ')}</p>
</section>`;

const css = `
/* Die Seite steht im Gewand der App: ihre Farben, ihre Schriften, dunkel,
   weil die Karten dunkel gezeichnet sind. Spalte für Text, daneben die
   Karten in der Breite eines Telefons. */
:root{--sl-bg:#0a0c0b;--sl-flaeche:#121714;--sl-linie:#28332b;--sl-ink:#eef3ef;--sl-ink2:#b9c4bd;
  --sl-leise:#7f8d84;--sl-akzent:#BEF264;--sl-gold:#f7cf4a;--sl-rot:#f0566a;--sl-blau:#56b4e8;
  --sl-display:'Archivo Black','Arial Black',sans-serif;--sl-text:'Space Grotesk',system-ui,sans-serif;
  --sl-mono:'Sometype Mono',ui-monospace,monospace;color-scheme:dark}
html,body{height:auto;overflow:auto;background:var(--sl-bg);color:var(--sl-ink)}
body{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));
  padding-block:24px 64px;font-family:var(--sl-text);line-height:1.5}
.sl-seite{max-width:1180px;margin:0 auto;position:relative;z-index:1;display:flex;flex-direction:column;gap:56px}
.sl-seite code{font-family:var(--sl-mono);font-size:.86em;color:var(--sl-ink2);background:rgba(255,255,255,.05);
  padding:0 4px;border-radius:4px;overflow-wrap:anywhere}
.sl-seite a{color:var(--sl-akzent)}
.sl-kopf{display:flex;flex-direction:column;gap:12px;max-width:760px}
.sl-dach{font-family:var(--sl-mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--sl-leise)}
.sl-kopf h1{font-family:var(--sl-display);font-size:clamp(34px,7vw,60px);line-height:1.02;letter-spacing:-.02em;text-wrap:balance}
.sl-lead{font-size:17px;color:var(--sl-ink2);max-width:65ch}
.sl-hinweis{font-size:14px;color:var(--sl-leise);border-left:2px solid var(--sl-gold);padding-left:10px;max-width:65ch}
.sl-nav{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.sl-nav a{font-family:var(--sl-mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;
  color:var(--sl-ink);border:1px solid var(--sl-linie);border-radius:999px;padding:6px 12px}
.sl-nav a:hover,.sl-nav a:focus-visible{border-color:var(--sl-akzent);color:var(--sl-akzent)}
.sl-abschnitt{display:flex;flex-direction:column;gap:16px;min-width:0}
.sl-abschnitt h2{font-family:var(--sl-display);font-size:clamp(24px,4vw,34px);letter-spacing:-.01em;text-wrap:balance;
  border-top:1px solid var(--sl-linie);padding-top:20px}
.sl-abschnitt h4{font-family:var(--sl-mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--sl-leise);margin-top:8px}
.sl-satz-l{max-width:70ch;color:var(--sl-ink2)}
.sl-weg{list-style:none;counter-reset:w;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.sl-weg li{counter-increment:w;background:var(--sl-flaeche);border:1px solid var(--sl-linie);border-radius:12px;padding:14px 14px 14px 46px;position:relative;font-size:14.5px;color:var(--sl-ink2);min-width:0}
.sl-weg li::before{content:counter(w);position:absolute;left:14px;top:13px;font-family:var(--sl-mono);color:var(--sl-akzent);font-weight:700}
.sl-weg b,.sl-regeln b{color:var(--sl-ink)}
.sl-tab{overflow-x:auto;border:1px solid var(--sl-linie);border-radius:12px}
.sl-tab table{border-collapse:collapse;width:100%;font-size:14px}
.sl-tab th,.sl-tab td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--sl-linie)}
.sl-tab th{font-family:var(--sl-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--sl-leise);font-weight:500}
.sl-tab tr:last-child td{border-bottom:0}
.sl-uhr td:first-child{white-space:nowrap;color:var(--sl-gold)}
.sl-anl td:first-child{min-width:150px}.sl-anl td:nth-child(2){min-width:260px}.sl-anl td:nth-child(3){min-width:120px}
.sl-anl .sl-satz{color:var(--sl-ink2);min-width:200px}
.num{font-family:var(--sl-mono);font-variant-numeric:tabular-nums}
.sl-id{display:block;font-family:var(--sl-mono);font-size:11.5px;color:var(--sl-leise);overflow-wrap:anywhere}
.sl-mess{color:var(--sl-leise);font-size:13px}
.sl-zwei{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px 32px}
.sl-zwei ul,.sl-regeln{display:flex;flex-direction:column;gap:6px;padding-left:18px;color:var(--sl-ink2);max-width:75ch}
.sl-regeln{gap:10px}
.sl-gruppe{font-family:var(--sl-mono);font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--sl-akzent);margin-top:16px}
.sl-form{display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--sl-linie);padding-top:18px;scroll-margin-top:16px}
.sl-form-k{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px}
.sl-form-k h3{font-family:var(--sl-display);font-size:22px;letter-spacing:-.01em}
.sl-form-k .sl-id{display:inline}
.sl-form-g{display:flex;flex-direction:column;gap:18px}
.sl-form-t{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:12px 32px;font-size:14.5px;color:var(--sl-ink2);align-items:start}
.sl-form-t p{max-width:72ch}
@media (max-width:860px){.sl-form-t{grid-template-columns:minmax(0,1fr)}}
.sl-fakten{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 14px;font-size:13.5px}
.sl-fakten dt{font-family:var(--sl-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--sl-leise);padding-top:3px}
.sl-fakten dd{color:var(--sl-ink2);min-width:0}
.sl-bsp-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr));gap:22px 20px;align-items:start;min-width:0}
.sl-bsp{width:100%;max-width:360px;display:flex;flex-direction:column;gap:8px;margin:0}
.sl-bsp .nf-wrap{padding:0!important;width:100%}
.sl-bsp-c{display:flex;flex-wrap:wrap;gap:4px 10px;font-family:var(--sl-mono);font-size:11.5px;color:var(--sl-leise)}
.sl-bsp-m{display:flex;flex-wrap:wrap;gap:4px}
.sl-bsp-m span{font-size:11.5px;color:var(--sl-ink2);border:1px solid var(--sl-linie);border-radius:999px;padding:1px 8px}
.sl-blatt{align-self:flex-start;font:600 12px var(--sl-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--sl-bg);
  background:var(--sl-akzent);border:0;border-radius:999px;padding:7px 14px;cursor:pointer}
.sl-blatt:focus-visible{outline:2px solid var(--sl-ink);outline-offset:2px}
.sl-warte{color:var(--sl-leise);font-size:13px}
.sl-zahlen{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.sl-zahlen div{display:flex;flex-direction:column;gap:2px;border:1px solid var(--sl-linie);border-radius:12px;padding:12px 14px}
.sl-zahlen b{font-size:28px;color:var(--sl-ink)}.sl-zahlen span{font-size:13px;color:var(--sl-leise)}
.sl-pb{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:3px 24px;font-size:12.5px}
.sl-pb li{display:grid;grid-template-columns:130px minmax(0,1fr) 28px;align-items:center;gap:8px}
.sl-pb-n{font-family:var(--sl-mono);color:var(--sl-ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sl-pb-b{height:6px;border-radius:3px;width:var(--w);background:var(--sl-blau)}
.sl-pb-b.brk{background:var(--sl-rot)}.sl-pb-b.tag{background:var(--sl-akzent)}
.sl-abg{display:flex;flex-wrap:wrap;gap:6px}
#slNd .nd{max-height:92vh}
@media (prefers-reduced-motion:reduce){.sl-seite *{animation:none!important;transition:none!important}}`;

const skript = `
(async () => {
  const roh = document.getElementById('sl-daten').textContent.trim();
  let D;
  try {
    const bytes = Uint8Array.from(atob(roh), z => z.charCodeAt(0));
    const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    D = JSON.parse(await new Response(strom).text());
  } catch(e){
    document.querySelectorAll('.sl-warte').forEach(p => { p.textContent = 'Dieser Browser kann die Beispiele nicht entpacken (DecompressionStream fehlt).'; });
    return;
  }
  // Jede Zeichnung bekommt beim Einsetzen eigene Kennungen: dieselbe
  // Zeichnung zweimal im Dokument teilte sonst ihre Verläufe.
  let n = 0;
  const auf = h => String(h || '').replace(/@@(\\d+)@@/g, (_, i) => { n++;
    return D.s[+i].replace(/§(\\d+)_/g, (_, j) => 'z' + n + 'v' + j + '_'); });
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const zeichne = el => {
    const f = el.dataset.form, l = D.c[f] || [];
    el.innerHTML = l.map((b, i) => '<figure class="sl-bsp">'
      + '<div class="nf-wrap nf-liste"><div class="nf-feed">' + auf(b.k) + '</div></div>'
      + '<figcaption class="sl-bsp-c">' + b.cap.map(x => '<span>' + esc(x) + '</span>').join('') + '</figcaption>'
      + (b.marken.length ? '<div class="sl-bsp-m">' + b.marken.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '')
      + (b.b ? '<button type="button" class="sl-blatt" data-blatt="' + esc(f) + '|' + i + '">Blatt</button>' : '')
      + '</figure>').join('');
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ io.unobserve(e.target); zeichne(e.target); }
  }), {rootMargin:'900px 0px'});
  document.querySelectorAll('[data-form]').forEach(el => io.observe(el));
  const bg = document.getElementById('slNd'), nd = bg.querySelector('.nd');
  const zu = () => { bg.classList.remove('show'); nd.innerHTML = ''; };
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-blatt]');
    if(k){
      const [f, i] = k.dataset.blatt.split('|'), b = D.c[f][+i];
      nd.className = b.cls; nd.innerHTML = auf(b.b); nd.scrollTop = 0; bg.classList.add('show');
      return;
    }
    if(bg.classList.contains('show') && (e.target === bg || e.target.closest('.nd-x, .nd-close'))) zu();
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') zu(); });
})();`;

const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">';
const teil = `<title>Die Stories der Liga</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${appCss}</style>
<style>${css}</style>
<main class="sl-seite">${inhalt}</main>
<div class="nd-bg" id="slNd" role="dialog" aria-modal="true" aria-label="Blatt"><div class="nd"></div></div>
<script type="application/octet-stream" id="sl-daten">${daten}</script>
<script>${skript}</script>`;

// Im Repository eine ganze Seite; für die Veröffentlichung als Artifact
// derselbe Inhalt ohne Gerüst, das legt der Dienst selbst darum.
fs.writeFileSync(path.join(__dirname, 'story-logik.html'),
  `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${teil.replace('</style>\n<main', '</style></head><body>\n<main')}</body></html>`);
if(process.argv[2]) fs.writeFileSync(process.argv[2], teil);
console.log('story-logik.html · ' + Math.round(fs.statSync(path.join(__dirname, 'story-logik.html')).size / 1024) + ' kB · '
  + woerter.size + ' Zeichnungen im Wörterbuch');
