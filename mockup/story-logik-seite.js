// Baut aus dem Lauf die Tafel `story-logik.html`: die ganze Logik des
// Story-Systems in der Reihenfolge, in der sie wirkt — welche Daten, welche
// Station, welche Regel, welcher Grund, und wie oft das gemessen greift.
//
// Die Zahlen kommen aus `.story-logik.json` (echte 466 Partien, Spieltag fuer
// Spieltag nachgespielt). Die Beschreibungen stehen hier: sie sind gelesen aus
// `src/js/26-news-konstanten.js`, `27-news-generator.js`, `28-news-ambient.js`,
// `29-news-cache.js` und `30-news-ui.js`. Was hier steht und dort nicht, ist
// ein Fehler dieser Seite.
'use strict';
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/.story-logik.json', 'utf8'));
const html = fs.readFileSync('/home/user/kicker-app/dist/index.html', 'utf8');
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const fonts = (kopf.match(/<link[^>]+fonts[^>]*>/gi) || []).join('\n');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = D.konstanten.limits, P = D.konstanten.prio;
const g = t => D.gebildet[t] || 0;
const si = t => D.sichtbar[t] || 0;
const bu = t => D.gebuendelt[t] || 0;

// ── Die Kette ───────────────────────────────────────────────────────
// Dreizehn Stationen, in genau dieser Reihenfolge. Die Reihenfolge ist nicht
// beliebig: wer zuerst buendelt, kann danach nicht mehr entdoppeln, und wer
// zuerst deckelt, deckelt Karten, die es nach dem Buendeln nicht mehr gibt.
const KETTE = [
  {n:'1', ort:'27-news-generator · _buildStories', was:'Ereignisse bilden',
   wie:'Einunddreißig Typen fragen die bestehenden Caches ab. Keine neue Rechnung, nur Interpretation: wer den Spieltag gewonnen hat, sagt <code>_periodWinnerMap</code>, wer einen Rekord hält, <code>allChronicles</code>, wie viel Prestige jemand hat, <code>prestigeOf</code>.',
   warum:'Zwei Rechnungen über dieselbe Frage nennen irgendwann zwei verschiedene Beste, und dann steht in der Nachricht ein anderer Name als in der Liste, auf der er ihn geholt hat.',
   zahl:D.dbGesamt + ' Karten über ' + D.verteilung.spieltage + ' Spieltage'},
  {n:'2', ort:'29-news-cache · syncStoriesViaDb', was:'Persistieren',
   wie:'INSERT … ON CONFLICT DO NOTHING. Die ID ist deterministisch, die erste Insert-Zeit gewinnt.',
   warum:'Damit jedes Gerät dieselbe Karte zur selben Zeit sieht. „Heute, 02:10" bleibt „Heute, 02:10" und wird beim Neuladen nicht „Heute, 14:30".',
   zahl:'Die ID einer Tafel-Meldung trägt ihren Spieltag — sonst beschreibt sie zwei Ereignisse'},
  {n:'3', ort:'29-news-cache · _newsTexteAuffrischen', was:'Wortlaut und Rang neu holen',
   wie:'Bildet der Generator dieselbe ID noch, gewinnen sein Titel, sein Text, sein Zeichen, sein <code>dataRef</code> und sein <code>prio</code>. ID und Zeitpunkt bleiben, was die Datenbank sagt. Was er nicht mehr bildet und was abläuft (<code>STORY_LAEUFT_AB</code>), fällt weg.',
   warum:'Titel und Text waren in der Datenbank eingefroren: eine überarbeitete Formulierung erschien nur an Karten, die es noch nicht gab. Und „Noch 5 Tage" zählte nach dem Saisonende für immer weiter.',
   zahl:'Der Rang wird immer neu gerechnet: 113 von 153 gespeicherten Zeilen trugen noch die alte Skala'},
  {n:'4', ort:'29-news-cache · _consolidateStories, Filter <code>src</code>', was:'Überholtes wegwerfen',
   wie:'Abgemeldete ID-Präfixe (<code>STORY_ABGEMELDET</code>), Fun Facts an einem Tag mit Nachrichten, überholte Live-Zustände (Pleitenserie, Formlauf, Spielpause, Elo-Rekord, Duo-Serien), eine Übernahme, deren Vorgänger die heutigen Halter sind, und eine Rekord- oder Chronikmeldung, die eine jüngere DESSELBEN TAGES überholt hat.',
   warum:'Eine Karte, die eine Bestmarke behauptet, die längst überboten ist, ist keine Nachricht mehr, sondern eine falsche. Der Vergleich gilt nur je Tag: über Tage hinweg erzählen zwei Karten eine Geschichte, am selben Tag widersprechen sie sich.',
   zahl:'Über das ganze Fenster verglichen fielen zwei von sieben Spieltagen ganz aus'},
  {n:'5', ort:'dieselbe Funktion, <code>HL_COVERS</code>', was:'Doppelte Aussagen unterdrücken',
   wie:'Eine Siegesserie deckt die Serien-Badges ab, eine Pleitenserie die Talfahrt, ein Rivalitäts-Meilenstein die allgemeine Rivalitätskarte, eine Siegesserie den Formlauf desselben Spielers am selben Tag.',
   warum:'„2 ungeschlagene Spieler: Leon (5)" und „Leon: 5er Serie" sind dieselbe Aussage in zwei Karten.',
   zahl:''},
  {n:'6', ort:'dieselbe Funktion, <code>badgeGroups</code>/<code>GROUPABLE</code>', was:'Gleichartiges je Spieler zusammenfassen',
   wie:'Dieselbe Auszeichnung in derselben Partie wird EINE Karte. Pechvögel, Formläufe, Serienmarken, Jubiläen und Meilensteine werden je Partie oder je Tag zu einer Zeile („3 Pechvögel: Maxi, Alex und Tom").',
   warum:'Zwei Spieler mit derselben Auszeichnung aus demselben Spiel sind ein Ereignis, nicht zwei.',
   zahl:''},
  {n:'7', ort:'dieselbe Funktion, <code>seenTitel</code>/<code>seenContent</code>', was:'Doubletten nach Titel und Text',
   wie:'Keine zwei Karten tragen dieselbe Schlagzeile oder denselben Text. Ausgenommen ist, was es je Tag, Woche oder Monat genau einmal gibt.',
   warum:'Zwei Rekordkarten unterschieden sich nur im Beleg und trugen wortgleich dieselbe Zeile. Für den, der scrollt, ist das dieselbe Karte.',
   zahl:''},
  {n:'8', ort:'dieselbe Funktion, <code>_aussage</code>', was:'Sperrfrist',
   wie:'Dieselbe Aussage — Art, Beteiligte und Sache — kommt ' + (L.sperreTage || 3) + ' Tage lang nur einmal. Gesperrt wird die Aussage, nicht der Wortlaut.',
   warum:'„Martin baut ‚Der Maßstab‘ aus" heißt nach dem nächsten Sieg genauso, nur mit einem Prozentpunkt mehr: andere ID, andere Zahl, dieselbe Nachricht. Gemessen standen vier davon nebeneinander.',
   zahl:'Drei Tage, weil die Liga an zwei bis drei Tagen der Woche spielt'},
  {n:'9', ort:'dieselbe Funktion, vier Achsen', was:'Bündeln',
   wie:'Erst die Ewige Tafel nach Moment, dann ein Erfolg, den mehrere teilen, dann ein Spieler mit mehreren Erfolgen, dann der Rest nach Minute und gemeinsamem Spieler.',
   warum:'Was im selben Moment passiert, ist eine Nachricht. Ein Spieltag trug gemessen zehn Karten, vier davon in derselben Minute, und sie standen als Fremde nebeneinander.',
   zahl:Object.keys(D.sammelKarten).reduce((n, k) => n + D.sammelKarten[k].karten, 0)
      + ' Sammelkarten mit '
      + Object.keys(D.sammelKarten).reduce((n, k) => n + D.sammelKarten[k].zeilen, 0) + ' Zeilen'},
  {n:'10', ort:'dieselbe Funktion, <code>NF_DECKEL</code>', was:'Zwei je Sorte und Tag',
   wie:'Von einer Sorte stehen höchstens zwei Karten an einem Tag. Eine Sammelkarte zählt nach ihrer Achse mit, ein Ergebnis nach seinem Muster.',
   warum:'Drei „X und Y kommen als Team nicht in Tritt" am selben Tag sind eine Nachricht und zwei Wiederholungen. Vier Karten „Ein Spiel, N Geschichten" untereinander sind für den, der scrollt, viermal dieselbe Schlagzeile.',
   zahl:''},
  {n:'11', ort:'dieselbe Funktion, Rückholung', was:'Niemand verschwindet ganz',
   wie:'Wer nach dem Deckel je Sorte auf keiner Karte mehr steht, holt seine jüngste zurück — und nur diese eine.',
   warum:'Die dritte Duo-Pleitenserie fiel weg, und mit ihr die einzige Karte, auf der die beiden in dieser Woche überhaupt standen. Gemessen fehlten danach drei von zwölf Spielern im Feed.',
   zahl:''},
  {n:'12', ort:'dieselbe Funktion, Tagesdeckel', was:'Der Tag mischt',
   wie:'Ein Tag trägt ' + L.proTag + ' Karten, gemessen an <code>prio</code>. Zwei Plätze sind reserviert: '
     + (L.tafelProTagMin || 0) + ' für die Ewige Tafel und ' + (L.matchProTagMin || 0)
     + ' für eine Geschichte mit konkreter Partie. Pflichtkarten und Breaking zählen nicht mit. Bleibt für einen Spieltag keine Karte übrig, kommt die stärkste der verworfenen zurück.',
   warum:'Die Mischung war eine Quote über das ganze Fenster und wurde erfüllt, indem Spieltagskarten wegfielen: 42 auf 23 Karten, und zwei von sieben Spieltagen standen leer im Feed.',
   zahl:'Spieltag: Median ' + D.verteilung.spieltagMedian + ' Karten, höchstens '
     + D.verteilung.spieltagMax + '. Stiller Tag: Median ' + D.verteilung.stillMedian
     + '. Leere Spieltage: ' + D.verteilung.leereSpieltage},
  {n:'13', ort:'30-news-ui · _renderNewsFeed', was:'Zeichnen',
   wie:'Streng von neu nach alt, gegliedert nach Tagesköpfen. Die Karte des Tages steht an ihrer Uhrzeit, nicht oben. Gelesen ist, was in der Liste der IDs steht oder älter ist als der Lesestand.',
   warum:'Zwei Durchgänge sortierten früher um und kosteten Chronologie, ohne eine einzige Karte zu sparen: gemessen ergab das acht Tagesköpfe für sieben Tage.',
   zahl:'Der Feed reicht ' + D.konstanten.fenster + ' Tage zurück, höchstens ' + L.total + ' Karten'}
];

// ── Jeder Typ ───────────────────────────────────────────────────────
// wann er entsteht, was er verlangt, und was gemessen aus ihm wird.
const TYPEN = [
  // Breaking
  ['rekord_erstmals', 'Ein Liga-Rekord wird zum ersten Mal vergeben', 'Der Rekord hatte vorher keinen Halter, und mindestens ein neuer Halter hat an diesem Tag gespielt.', 'brk'],
  ['elo_record', 'Neuer Allzeit-Elo-Rekord', 'Der höchste je erreichte Elo-Stand der Liga, innerhalb der letzten 14 Tage aufgestellt.', 'brk'],
  ['streak_record', 'Längste Siegesserie aller Zeiten', 'Dieselbe Bedingung, auf die Serie.', 'brk'],
  ['lead_change', 'Neuer Spitzenreiter', 'Die Führung der laufenden Saison wechselt.', 'brk'],
  ['season_recap', 'Der Meister steht fest', 'Am Monatsende, wenn die Saison entschieden ist.', 'brk'],
  // Spieltag
  ['potd', 'Spieler des Tages', 'Ab drei Partien am eigenen Spieltag, beste Quote, Tiebreak über das Elo-Delta. Steht um 23:59 an seinem eigenen Tag — dann kann keine Partie mehr dazukommen.', 'tag'],
  ['chronik_monat', 'Die Chronik des Vormonats', 'Am 1. um 00:00, EINE Karte je Monat. Die drei mit den meisten Einträgen bekommen ihr Gesicht.', 'tag'],
  ['woche', 'Die Woche', 'Sonntag 23:00, EINE Karte mit allen sechs Wertungen. Vorher waren es sechs Karten über den Montag verteilt — und der Montag ist Spieltag.', 'tag'],
  ['chronik_erstling', 'Zum ersten Mal in der Chronik', 'Wer überhaupt noch keinen Monatseintrag hatte. Der Moment, den ein Spieler aus der unteren Hälfte sonst nie im Feed sieht.', 'tag'],
  ['rekord_geholt', 'Ein Liga-Rekord wechselt den Halter', 'Zeitschnitt: der Halterstand vor dem letzten Spieltag gegen heute. Halter sortiert verglichen. Mindestens ein neuer Halter muss an diesem Tag gespielt haben.', 'tag'],
  ['giant_slayer', 'Favoritensturz', 'Unter 20 % Siegchance vor dem Anstoß. Höchstens einer je Spieltag, ' + (L.giantSlayer || 4) + ' im Fenster.', 'tag'],
  ['top_clash', 'Spitzenduell', 'Platz 1 gegen Platz 2 der laufenden Saison.', 'tag'],
  ['streak_killer', 'Serienbruch', 'Eine Serie von mindestens vier Siegen endet. Ab sieben immer.', 'tag'],
  ['win_streak', 'Siegesserie', 'Eine Marke ab fünf Siegen in Folge, die jüngsten ' + (L.winStreak || 8) + ' im Fenster.', 'tag'],
  ['loss_streak', 'Durststrecke', 'Ab fünf Niederlagen in Folge, höchstens ' + (L.lossStreak || 2) + ' gleichzeitig. Die Karte lebt nur, solange die Serie noch läuft.', 'tag'],
  ['top_form', 'Über dem eigenen Schnitt', 'Die letzten ' + D.konstanten.form.fenster + ' Partien liegen mindestens '
    + Math.round(D.konstanten.form.vorsprung * 100) + ' Punkte über der Laufbahn davor, die mindestens '
    + D.konstanten.form.basis + ' Partien zählt. Gemessen am ABSTAND ZUM EIGENEN Schnitt, nicht am Niveau: dieselbe Schwelle trifft damit sieben Spieler statt vier.', 'tag'],
  ['match_result', 'Das Ergebnis selbst', 'Fünf Muster: 10:0, echter Außenseitersieg, Krimi mit einem Tor, Kantersieg ab sieben Toren, enges Spiel. Je Partie gewinnt das stärkste, je Tag höchstens ' + (L.matchResultProTag || 2) + '.', 'tag'],
  ['chronik_geholt', 'Eine Monatschronik wechselt den Halter', 'Derselbe Zeitschnitt wie beim Rekord, auf die laufende Saison. Vier Fälle, vier Verben: holt, übernimmt, hält jetzt allein, zieht gleich. Höchstens ' + (L.chronikGeholt || 2) + ' je Lauf, die wertvollsten zuerst.', 'tag'],
  ['team_streak', 'Ein Duo gewinnt alles', 'Ab fünf gemeinsamen Siegen in Folge, und nur solange die Serie diese Länge noch erreicht.', 'tag'],
  ['insignium_stufe', 'Eine neue Stufe am Insignium', 'Der Prestige-Stand vor dem letzten Spieltag gegen heute. Die auslösende Partie wird binär gesucht, damit die Karte am richtigen Moment steht.', 'tag'],
  ['badge_unlocked', 'Eine Auszeichnung', 'Nur die kuratierte Liste (<code>NEWS_BADGE_WHITELIST</code>), und je Auszeichnung nur beim ersten Mal und an runden Marken: ' + (D.konstanten.badgeMarken || []).join(', ') + '. Gemessen gingen 93 von 866 Karten auf wiederholte Auszeichnungen zurück.', 'tag'],
  ['team_loss_streak', 'Ein Duo verliert alles', 'Ab drei gemeinsamen Niederlagen in Folge.', 'tag'],
  ['milestone_wins', 'Siegmarke', '100, 250, 500, 1000 …', 'tag'],
  ['milestone_elo', 'Elo-Marke', 'Eine runde Schwelle zum ersten Mal überschritten.', 'tag'],
  ['milestone_goals', 'Tormarke', 'Dieselbe Leiter auf die Tore.', 'tag'],
  ['jubilee', 'Jubiläum', '50., 100., 250. Partie, höchstens ' + (L.jubilee || 3) + ' gleichzeitig.', 'tag'],
  ['rivalry_milestone', 'Duell-Meilenstein', 'Jede überschrittene Schwelle, mit dem Zeitpunkt der kreuzenden Partie und dem Stand von damals. Gemeldet werden die jüngsten ' + (L.rivalryMarke || 4) + '. Gemessen wurden sechzehn gebildet, von denen zwei im Feed standen.', 'tag'],
  ['rekord_gesteigert', 'Ein Rekord wird ausgebaut', 'Nur, wenn sich die ANGEZEIGTE Zahl verbessert. Ein Anteil rückt an fast jedem Spieltag um ein Tausendstel weiter, und das ergab neun Karten „X baut seinen Rekord aus" an einem Morgen, auf denen dieselbe Zahl stand wie vorher.', 'tag'],
  ['elo_swing', 'Harter Tag', 'Der größte Elo-Verlust eines Tages, um 23:58 — eine Minute vor dem Sieger des Tages.', 'tag'],
  // Hintergrund
  ['rivalry', 'Die meisten Duelle', 'Das Paar mit den meisten Begegnungen der Ligageschichte. Höchstens ' + (L.rivalry || 1) + '.', 'hg'],
  ['season_endgame', 'Countdown', 'Die letzten Tage der Saison. Kein Ereignis, deshalb auch nie Breaking.', 'hg'],
  ['season_start', 'Saisonstart', 'Die ersten drei Tage eines Monats.', 'hg'],
  ['dry_spell', 'Tage ohne Spiel', 'Die Karte lebt nur, solange ihr Referenz-Match noch das jüngste der Liga ist.', 'hg'],
  ['quiet_week', 'Stille Woche', 'Die letzten sieben Tage gegen den Schnitt der vier Wochen davor.', 'hg'],
  ['ambient', 'Fun Fact', 'Täglich um ' + (D.konstanten.slots || []).join(' und ') + ' Uhr. Der Slot ab '
    + D.konstanten.abendAb + ' Uhr fällt an Spieltagen aus, und jeder Fun Fact fällt weg, wenn sein Tag eine echte Nachricht trägt. Vier Cooldowns halten die Rotation: Typ, Rubrik, Spieler und das Paar aus Typ und Person.', 'hg']
];

const bandName = {brk:'Breaking — das gab es so noch nie', tag:'Der Spieltag — das haben DIESE Partien hergegeben',
  hg:'Der Hintergrund — gilt heute und galt gestern schon'};

const typTabelle = ['brk', 'tag', 'hg'].map(band => {
  const rows = TYPEN.filter(t => t[3] === band)
    .sort((a, b) => (P[b[0]] || 0) - (P[a[0]] || 0))
    .map(([typ, name, bed]) => `<tr>
      <td class="mono nz">${P[typ] != null ? P[typ] : '—'}</td>
      <td><b>${esc(name)}</b><code>${esc(typ)}</code></td>
      <td class="bed">${bed}</td>
      <td class="mono nz">${g(typ) || '—'}</td>
      <td class="mono nz ${si(typ) ? '' : 'null'}">${si(typ) || '—'}</td>
      <td class="mono nz ${bu(typ) ? '' : 'null'}">${bu(typ) || '—'}</td>
    </tr>`).join('');
  return `<h3>${esc(bandName[band])}</h3>
    <table class="st">
      <thead><tr><th class="nz">Rang</th><th>Sorte</th><th>Wann genau</th>
        <th class="nz">gebildet</th><th class="nz">eigene Karte</th><th class="nz">als Zeile</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}).join('');

// ── Die vier Achsen ─────────────────────────────────────────────────
const ACHSEN = [
  {k:'tafel', name:'Der Moment an der Ewigen Tafel', schluessel:'dieselbe Partie ODER dieselbe Minute, über Union-Find zu einem Ereignis verbunden',
   nimmt:'Rekord erstmals, Rekord geholt, Rekord ausgebaut, Insignium-Stufe, Chronik-Erstling, Chronik geholt',
   titel:'„Johannes, Leo und zwei weitere bewegen die Ewige Tafel"',
   warum:'Ein starker Spieltag verschiebt viele Rekorde und Chroniken zugleich. Einzeln standen sie als Kaskade neben der Sammelkarte; auch ein erstmals vergebener Rekord und eine legendäre Chronik gehören in diesen Moment.'},
  {k:'erfolg', name:'Mehrere Spieler, derselbe Erfolg', schluessel:'dieselbe Minute UND dieselbe Sache',
   nimmt:'Insignium-Stufe, Chronik-Erstling, Jubiläum, Sieg-, Tor- und Elo-Marke — je genau ein Beteiligter',
   titel:'„Sina, Mira und Jonas tragen jetzt den Schildring"',
   warum:'Ein Erfolg, den mehrere zugleich erreichen, ist EINE Nachricht der Liga. Liga-Rekord und Monatschronik fehlen hier: sie tragen ihre Mithalter schon in einer Karte.'},
  {k:'spieler', name:'Ein Spieler, mehrere Erfolge', schluessel:'dieselbe Minute UND derselbe Spieler',
   nimmt:'dieselben Sorten, ohne „Rekord ausgebaut" — Ausbauen ist die schwächste der drei Rekordmeldungen und trägt keinen Moment',
   titel:'„Jonas holt einen Liga-Rekord und erreicht die nächste Insignium-Stufe"',
   warum:'Der Erfolg geht dem Spieler vor: liefe diese Achse zuerst, stünde „der Schildring" auf zwei Karten.'},
  {k:'spiel', name:'Der Moment am Spieltag', schluessel:'dieselbe Minute UND ein gemeinsamer Spieler, Gruppen verschmelzen über gemeinsame Namen',
   nimmt:'Auszeichnung, Serienbruch, Favoritensturz, Spitzenduell, Marken, Jubiläum, Serien, Duo-Serien, Rivalität, Ergebnis',
   titel:'„Ein Spiel, zwei Geschichten für Leon und Maxi"',
   warum:'Die Minute allein reicht nicht: „Johannes und Anton verlieren zusammen alles" trug „Maxi: Nerven aus Stahl" als zweite Zeile — drei fremde Spieler, die nur ihr Zeitstempel verband.'}
];
const achsenTabelle = ACHSEN.map(a => {
  const m = D.sammelKarten[a.k];
  return `<div class="regel">
    <b>${esc(a.name)}</b>
    <span><em>Schlüssel:</em> ${esc(a.schluessel)}<br>
    <em>Nimmt:</em> ${a.nimmt}<br>
    <em>Schlagzeile:</em> ${esc(a.titel)}<br>
    ${esc(a.warum)}<br>
    <em>Gemessen:</em> ${m ? m.karten + ' Karten, ' + m.zeilen + ' Zeilen, größte mit ' + m.groesste
      : 'in den echten Partien nicht vorgekommen'}</span>
  </div>`;
}).join('');

// ── Alle Deckel an einer Stelle ─────────────────────────────────────
const DECKEL = [
  ['proTag', L.proTag, 'Karten je Tag', 'Gemessen trug ein Spieltag neun: zwei Sammelkarten, zwei Serien, zwei Auszeichnungen, den Sieger, den Elo-Ausschlag und einen Serienbrecher. Das ist keine Tafel mehr, das ist ein Protokoll.'],
  ['tafelProTagMin', L.tafelProTagMin, 'Plätze für die Ewige Tafel', 'Reserviert statt quotiert. Die Quote über das Fenster wurde erfüllt, indem Spieltagskarten wegfielen.'],
  ['matchProTagMin', L.matchProTagMin, 'Plätze für eine konkrete Partie', 'Ein Spieltag braucht mindestens eine Karte, die an einer Partie hängt: Ergebnis, Beteiligte und das, was genau dort passiert ist.'],
  ['— (NF_DECKEL)', 2, 'Karten je Sorte und Tag', 'Die dritte Kachel derselben Sorte erzählt nichts mehr. Eine Sammelkarte zählt nach ihrer Achse mit.'],
  ['sperreTage', L.sperreTage, 'Tage Sperrfrist je Aussage', 'Die Liga spielt an zwei bis drei Tagen der Woche; damit kommt dieselbe Aussage höchstens einmal je Spielwoche wieder.'],
  ['total', L.total, 'Karten im ganzen Feed', 'Vierzehn Tage mal fünf sind siebzig; der Rest ist Luft für Breaking und die Pflichtkarten.'],
  ['tagKartePartien', L.tagKartePartien, 'Partien, ab denen die Karte des Tages steht', 'Gemessen der Median über 56 Spieltage, erreicht an 64 % von ihnen.'],
  ['tagKarteStunde', L.tagKarteStunde, 'Uhr, wenn die Zahl nicht reicht', 'Keine der 466 Partien hat nach 18:31 angefangen.'],
  ['matchResultProTag', L.matchResultProTag, 'Ergebnis-Karten je Tag', 'Zwei reichen, um konkrete Partien sichtbar zu machen, ohne aus dem Feed einen Ergebnisdienst zu bauen.'],
  ['chronikGeholt', L.chronikGeholt, 'Chronik-Wechsel je Lauf', 'Ein starker Spieltag verschiebt mehrere Chroniken gleichzeitig, und der Rest steht am Monatsende ohnehin in der Monatskarte.'],
  ['rivalryMarke', L.rivalryMarke, 'Duell-Meilensteine', 'Ein Meilenstein von vor drei Monaten ist keine Nachricht mehr.'],
  ['badgeUnlocked', L.badgeUnlocked, 'Auszeichnungen im Fenster', ''],
  ['winStreak', L.winStreak, 'Serienmarken im Fenster', ''],
  ['giantSlayer', L.giantSlayer, 'Favoritenstürze im Fenster', 'Höchstens einer je Spieltag.'],
  ['topForm', L.topForm, 'Formläufe gleichzeitig', ''],
  ['lossStreak', L.lossStreak, 'Durststrecken gleichzeitig', ''],
  ['jubilee', L.jubilee, 'Jubiläen gleichzeitig', ''],
  ['rivalry', L.rivalry, 'Rivalitätskarte', 'Zwei mit derselben Schlagzeile und einer anderen Zahl sind kein Paar, sondern eine Wiederholung.']
].filter(r => r[1] != null).map(([k, v, was, warum]) => `<tr>
  <td class="mono nz gold">${esc(String(v))}</td>
  <td>${esc(was)}<code>${esc(k)}</code></td>
  <td class="bed">${esc(warum)}</td></tr>`).join('');

// ── Der Tagesplan ───────────────────────────────────────────────────
const PLAN = [
  ['00:00', 'am 1. des Monats', 'Die Chronik des Vormonats, und je Spieler, der zum ersten Mal darin steht, eine eigene Karte.'],
  ['10:00', 'täglich', 'Fun Fact „Der Stand" — nach vorn: was offen ist, wer wie weit weg ist. Keine der 466 Partien hat vor 10 Uhr angefangen, er steht also immer vor dem Spieltag.'],
  ['tagsüber', 'mit jeder Partie', 'Alles, was aus einer Partie folgt: Ergebnis, Serien, Auszeichnungen, Rekorde, Chroniken, Insignium-Stufen. Der Zeitstempel ist der der Partie.'],
  ['ab 8 Partien oder 19:00', 'am Spieltag', 'Die Karte des Tages wird vergeben — an die spannendste Karte, nicht automatisch an den Sieger. Sie steht an ihrer Uhrzeit, nicht am Kopf des Tages.'],
  ['19:00', 'nur an Tagen ohne Partie', 'Fun Fact „Die Geschichte" — zurück: Langzeitdaten, Jahrestage, Rivalitäten.'],
  ['23:00', 'sonntags', 'Die Wochenkarte mit allen sechs Wertungen.'],
  ['23:58', 'am Spieltag', 'Der härteste Tag: der größte Elo-Verlust.'],
  ['23:59', 'am Spieltag', 'Der Spieler des Tages. Er steht an SEINEM Tag, wenn keine Partie mehr dazukommen kann.']
].map(([zeit, wann, was]) => `<tr><td class="mono gold">${esc(zeit)}</td>
  <td class="mono">${esc(wann)}</td><td class="bed">${esc(was)}</td></tr>`).join('');

// ── Das letzte Fenster, Tag für Tag ─────────────────────────────────
const fenster = D.fensterTage.slice().reverse().map(t => `
  <div class="tagblock${t.spieltag ? ' sp' : ''}">
    <div class="tagkopf"><b>${esc(t.tag)}</b>
      <span>${t.karten} ${t.karten === 1 ? 'Karte' : 'Karten'}</span>
      <i>${t.spieltag ? 'Spieltag' : 'kein Spiel'}</i>
      <u>Tafel ${t.tafel} · Spieltag ${t.spiel} · Fun ${t.fun}</u></div>
    ${t.zeilen.map(z => `<div class="kz2">
      <span class="zt">${esc(z.uhr)}</span>
      <span class="zp">${z.prio}</span>
      <span class="zy">${esc(z.typ)}${z.quelle ? '/' + esc(z.quelle) : ''}</span>
      <span class="zh"><b>${esc(z.titel)}</b>${esc(z.text)}
        ${(() => { const t = z.teile.filter(Boolean);
          // Die Wochenkarte traegt ihre sechs Wertungen unter `label`, nicht
          // unter `titel`. Ungefiltert ergab das eine Kette leerer Punkte.
          return t.length ? '<em>' + t.map(esc).join(' · ') + '</em>' : ''; })()}</span>
    </div>`).join('')}
  </div>`).join('');

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Die Logik des Story-Systems</title>
${fonts}
${styles}
<style>
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:'Sometype Mono',ui-monospace,monospace;padding:0 0 70px}
  .lg{max-width:1080px;margin:0 auto;padding:24px 16px}
  .lg h1{font-family:'Archivo Black',sans-serif;font-size:29px;line-height:1.08;margin:0 0 8px}
  .lg h2{font-family:'Archivo Black',sans-serif;font-size:16px;margin:40px 0 8px}
  .lg h3{font-family:'Archivo Black',sans-serif;font-size:12.5px;margin:22px 0 7px;color:var(--ink2)}
  .lg p{color:var(--ink2);font-size:12.5px;line-height:1.7;max-width:80ch;margin:0 0 10px}
  .lead{color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.15em;margin:0 0 16px}
  code{font-size:10.5px;color:var(--purple);background:transparent}
  .karten{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:9px;margin:16px 0 4px}
  .kz{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 13px}
  .kz b{display:block;font-family:'Archivo Black',sans-serif;font-size:22px;line-height:1}
  .kz span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;
    letter-spacing:.11em;margin-top:6px;line-height:1.4}
  .kz.gold b{color:var(--gold)}
  .kette{display:grid;gap:8px;margin-top:12px;counter-reset:st}
  .st1{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--line2);
    border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:34px 1fr;gap:12px}
  .st1 .nr{font-family:'Archivo Black',sans-serif;font-size:19px;color:var(--faint);line-height:1}
  .st1 b{display:block;font-family:'Archivo Black',sans-serif;font-size:13px;margin-bottom:3px}
  .st1 .ort{display:block;color:var(--purple);font-size:9.5px;margin-bottom:6px;
    text-transform:uppercase;letter-spacing:.09em}
  .st1 .wie{display:block;color:var(--ink2);font-size:11.5px;line-height:1.6}
  .st1 .warum{display:block;color:var(--muted);font-size:11px;line-height:1.6;margin-top:5px;
    border-left:2px solid var(--line2);padding-left:9px}
  .st1 .zahl{display:block;color:var(--acid);font-size:10.5px;margin-top:6px}
  table.st{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:6px}
  table.st th{text-align:left;color:var(--muted);font-weight:400;font-size:9px;
    text-transform:uppercase;letter-spacing:.11em;padding:0 8px 7px;border-bottom:1px solid var(--line)}
  table.st td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
  table.st td b{display:block;color:var(--ink);font-weight:700;font-size:12px}
  table.st td > code{display:block;margin-top:2px}
  table.st td .bed code{display:inline}
  .mono{font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}
  .nz{text-align:right}
  .null{color:var(--faint)}
  .gold{color:var(--gold)}
  .bed{color:var(--muted);font-size:11px;line-height:1.6}
  .regeln{display:grid;gap:9px;margin-top:10px}
  .regel{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--gold);
    border-radius:11px;padding:11px 13px}
  .regel b{display:block;font-family:'Archivo Black',sans-serif;font-size:12.5px;margin-bottom:5px}
  .regel span{color:var(--ink2);font-size:11.5px;line-height:1.65}
  .regel em{color:var(--acid);font-style:normal}
  .tagblock{background:var(--bg2);border:1px solid var(--line);border-radius:13px;
    padding:9px 11px 6px;margin-bottom:8px}
  .tagblock.sp{border-left:3px solid var(--acid)}
  .tagkopf{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;
    padding-bottom:7px;border-bottom:1px solid var(--line);margin-bottom:5px}
  .tagkopf b{font-family:'Archivo Black',sans-serif;font-size:13px}
  .tagkopf span{color:var(--ink2);font-size:10.5px}
  .tagkopf i{color:var(--muted);font-size:9.5px;font-style:normal;text-transform:uppercase;letter-spacing:.1em}
  .tagkopf u{margin-left:auto;color:var(--faint);font-size:9.5px;text-decoration:none}
  .kz2{display:grid;grid-template-columns:44px 30px 128px 1fr;gap:8px;padding:6px 0;
    border-bottom:1px solid rgba(255,255,255,.03);align-items:baseline}
  .kz2:last-child{border-bottom:0}
  .kz2 .zt{color:var(--muted);font-size:10px}
  .kz2 .zp{color:var(--faint);font-size:10px;text-align:right}
  .kz2 .zy{color:var(--purple);font-size:9.5px}
  .kz2 .zh{font-size:11px;color:var(--muted);line-height:1.5}
  .kz2 .zh b{display:block;color:var(--ink);font-size:11.5px;margin-bottom:2px}
  .kz2 .zh em{display:block;color:var(--faint);font-size:10px;font-style:normal;margin-top:3px}
  @media(max-width:700px){.kz2{grid-template-columns:44px 1fr}.kz2 .zp,.kz2 .zy{display:none}}
  .fuss{color:var(--faint);font-size:10.5px;margin-top:40px;line-height:1.75;
    border-top:1px solid var(--line);padding-top:14px}
</style></head><body>
<div class="lg">
  <div class="lead">Gemessen an ${D.partien} echten Partien · ${D.erster} bis ${D.letzter} · Stand ${esc(D.gebaut)}</div>
  <h1>Wie eine Story-Karte entsteht</h1>
  <p>Diese Tafel beantwortet vier Fragen in der Reihenfolge, in der die App sie
     beantwortet: <b>welche Daten</b> eine Karte bilden, <b>in welcher Reihenfolge</b> die
     Regeln greifen, <b>nach welchem Prinzip</b> und <b>wie oft</b> das gemessen passiert.
     Die Zahlen sind kein Beispiel: die ${D.partien} echten Partien der Liga wurden Spieltag
     für Spieltag nachgespielt, an jedem Tag lief der echte Generator, und die Karten
     wurden wie in der App persistiert und wieder gelesen.</p>

  <div class="karten">
    <div class="kz"><b>${D.partien}</b><span>Partien</span></div>
    <div class="kz"><b>${D.verteilung.spieltage}</b><span>Spieltage</span></div>
    <div class="kz"><b>${D.verteilung.tage}</b><span>Kalendertage</span></div>
    <div class="kz"><b>${D.dbGesamt}</b><span>Karten gebildet</span></div>
    <div class="kz gold"><b>${D.verteilung.spieltagMedian}</b><span>Karten je Spieltag (Median)</span></div>
    <div class="kz"><b>${D.verteilung.stillMedian}</b><span>an einem stillen Tag</span></div>
    <div class="kz"><b>${D.verteilung.leereSpieltage}</b><span>Spieltage ohne Karte</span></div>
    <div class="kz"><b>${D.feedLetzter}</b><span>Karten im letzten Fenster</span></div>
  </div>

  <h2>Die Kette — dreizehn Stationen, und die Reihenfolge ist Absicht</h2>
  <p>Wer zuerst bündelt, kann danach nicht mehr entdoppeln. Wer zuerst deckelt, deckelt
     Karten, die es nach dem Bündeln nicht mehr gibt. Jede Station sagt hier, was sie tut,
     warum sie da ist und was sie gemessen bewirkt.</p>
  <div class="kette">
    ${KETTE.map(s => `<div class="st1">
      <div class="nr">${esc(s.n)}</div>
      <div><b>${esc(s.was)}</b><span class="ort">${s.ort}</span>
        <span class="wie">${s.wie}</span>
        <span class="warum">${s.warum}</span>
        ${s.zahl ? '<span class="zahl">' + esc(s.zahl) + '</span>' : ''}</div>
    </div>`).join('')}
  </div>

  <h2>Woher die Daten kommen</h2>
  <p>Der Generator rechnet <b>nichts neu</b>. Er liest dieselben Caches, aus denen die
     Ansichten der App ihre Zahlen ziehen: <code>getGlobalSim</code> für die Elo-Bahn,
     <code>_periodWinnerMap</code> für den Sieger eines Spieltags, <code>allChronicles</code>
     für die Liga-Rekorde, <code>seasonTitleHalter</code> für die Monatschronik,
     <code>prestigeTabelle</code> und <code>prestigeOf</code> für die Laufbahn,
     <code>teamStatsFromMatches</code> für Duos, <code>getBadgeEarnedCache</code> für die
     Auszeichnungen. Zwei Rechnungen über dieselbe Frage nennen irgendwann zwei
     verschiedene Beste, und dann steht in der Nachricht ein anderer Name als in der
     Liste, auf der er ihn geholt hat.</p>

  <h2>Der Tagesplan</h2>
  <table class="st">
    <thead><tr><th>Zeit</th><th>Wann</th><th>Was</th></tr></thead>
    <tbody>${PLAN}</tbody>
  </table>

  <h2>Die Rangfolge — eine Skala, drei Bänder</h2>
  <p>Es waren zwei Skalen: die Spieltags-Karten standen auf 1 bis 10, und als die Ewige
     Tafel dazukam, bekam sie 70 bis 95. Damit gewann jede Tafel-Karte gegen jede
     Spieltags-Karte, bevor der Deckel überhaupt hinsah — gemessen über 56 Spieltage
     bekam die Tafel 66 % aller Tagesplätze, und 70 % der laufenden Siegesserien,
     83 % der Pleitenserien und 83 % der Serienbrecher fielen weg. Die Grenze zwischen
     den Bändern ist eine Frage: <b>Hätte es die Karte gestern auch gegeben?</b>
     „gebildet" zählt, wie oft der Generator die Karte über die ganze Ligageschichte
     erzeugt hat, „eigene Karte" wie oft sie allein im Feed stand, „als Zeile" wie oft
     sie in einem Bündel steckte.</p>
  ${typTabelle}

  <h2>Die vier Achsen der Bündelung</h2>
  <p>In dieser Reihenfolge, und die Reihenfolge entscheidet: ein Erfolg, den mehrere
     zugleich erreichen, darf nicht zerrissen werden.</p>
  <div class="regeln">${achsenTabelle}</div>

  <h2>Alle Deckel an einer Stelle</h2>
  <table class="st">
    <thead><tr><th class="nz">Zahl</th><th>Was sie begrenzt</th><th>Warum genau diese</th></tr></thead>
    <tbody>${DECKEL}</tbody>
  </table>

  <h2>Was nie unter einen Deckel fällt</h2>
  <div class="regeln">
    <div class="regel"><b>Breaking</b><span>Sieben Anlässe: ein legendäres Badge, ein neuer
      Allzeit-Elo-Rekord, die längste Siegesserie aller Zeiten, ein neuer Spitzenreiter,
      der feststehende Meister, ein zum ersten Mal vergebener Liga-Rekord und die beiden
      obersten Insignium-Stufen. Das sind wenige Karten pro Saison — also darf es das
      Lauteste sein, und es darf nie an einem Deckel scheitern.</span></div>
    <div class="regel"><b>Was es genau einmal gibt</b><span>Spieler des Tages, Wochenkarte,
      Monatschronik, Saison-Rückblick. Der Spieler des Tages IST die Schlagzeile seines
      Spieltags; in einer simulierten Liga fiel er als siebtstärkste Karte heraus, und der
      Tag hatte danach keinen Sieger mehr.</span></div>
    <div class="regel"><b>Was allein dasteht</b><span>Eine seltene oder legendäre
      Auszeichnung und eine legendäre Monatschronik gehen nie in ein Bündel. „Nerven aus
      Stahl" ist der Grund, warum jemand die App öffnet, und steht nicht als vierte Zeile
      unter der Duo-Serie zweier anderer.</span></div>
    <div class="regel"><b>Ein Spieltag ohne Karte</b><span>Bleibt nach allen
      Wiederholungsregeln nichts übrig, kommt die stärkste der verworfenen Karten zurück.
      Dieselbe Schlagzeile unter zwei verschiedenen Tagesköpfen ist erlaubt — jede nennt im
      Text ihr eigenes Datum. Die Sperrfrist gehört nicht dazu: sie sagt gerade, dass diese
      Aussage gestern schon erzählt wurde.</span></div>
  </div>

  <h2>Was gelesen heißt</h2>
  <p>Gezählt wurde, was nicht in der Liste der gelesenen IDs steht — und das ist nicht
     dasselbe wie „neu". Die Liste kennt nur, was auf dem Bildschirm stand, und der Feed
     zeigt nicht jeden Tag dieselbe Auswahl: eine Karte fällt unter einen Deckel, eine
     gleichlautende Schlagzeile verdrängt sie, eine Sperrfrist läuft ab. Gemessen über
     fünfundvierzig Tage trugen 81 von 267 neu auftauchenden Karten (30 %) einen Zeitpunkt,
     der länger zurückliegt als alles, was der Leser schon gesehen hat. „Alles gelesen"
     setzt deshalb einen <b>Lesestand</b> — den Zeitpunkt der neuesten Karte, die dabei im
     Feed stand. Gelesen ist, was in der Liste steht ODER älter ist als der Lesestand.</p>

  <h2>Und so sieht es aus: das letzte Fenster, Tag für Tag</h2>
  <p>Dieselben ${D.feedLetzter} Karten, die der Feed am ${D.letzter} zeigt, mit Uhrzeit, Rang,
     Sorte und den Zeilen jedes Bündels. Grün markiert sind die Tage, an denen gespielt
     wurde.</p>
  ${fenster}

  <div class="fuss">
    Erzeugt mit <code>node mockup/story-logik-lauf.js &amp;&amp; node mockup/story-logik-seite.js</code>
    aus <code>dist/index.html</code>. Generator, Auffrischung, Konsolidierung und alle
    Grenzwerte kommen unverändert aus der App; die Beschreibungen sind aus
    <code>src/js/26…31</code> gelesen. Kein Teil des Bauablaufs: <code>tools/check.mjs</code>
    und <code>tests/run.mjs</code> sehen diesen Ordner nicht.
  </div>
</div>
</body></html>`;

fs.writeFileSync(__dirname + '/story-logik.html', seite);
console.log('geschrieben:', seite.length, 'Zeichen');
