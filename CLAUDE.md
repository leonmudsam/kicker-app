# Kicker-Liga — Arbeitsanweisung

Deutschsprachige Einzeldatei-PWA für eine 2-gegen-2-Tischkicker-Liga:
Elo, Saisons, Awards, Rekorde, Chronik, News. Backend ist Supabase,
ausgeliefert wird **eine** `index.html` über GitHub Pages.

> **Diese Datei ist Teil des Codes, nicht Begleitmaterial.**
> Wer die Struktur, den Ablauf oder eine Regel ändert, ändert sie hier im
> **selben Commit** mit. Wie genau, steht ganz unten unter
> [Pflege dieser Datei](#pflege-dieser-datei) — der Abschnitt ist
> verbindlich, nicht optional.

---

## 1. Der Bauablauf

`index.html` im Wurzelverzeichnis ist **Build-Ergebnis**, nicht Quelle.
Niemals direkt bearbeiten.

```
1. in src/ ändern
2. node tools/build.mjs            → dist/index.html
3. cp dist/index.html index.html   ← wird am häufigsten vergessen
4. node tools/check.mjs            → sechs Wächter, alle müssen grün sein
5. node tests/run.mjs              → sieben Suiten, alle müssen grün sein
6. committen (deutsche Nachricht, siehe §7)
```

Wächter 1 heißt „index.html entspricht src/" und schlägt genau dann an,
wenn Schritt 3 fehlt. Wer ihn rot sieht, hat fast immer nur das `cp`
vergessen — nicht die Quelle kaputtgemacht.

**Die Version wird nicht von Hand gepflegt.** `build.mjs` vergibt sie: ein
Datum und dahinter ein Hash über genau den ausgelieferten Inhalt. Sie ändert
sich, wenn sich die Auslieferung ändert, und sonst nie — zweimal bauen ergibt
dieselbe Nummer, auf jedem Betriebssystem. Zeilenenden zählen dafür nicht mit:
der Arbeitsbaum unter Windows trägt CRLF, Repository und Prüf-Job tragen LF, und
derselbe Inhalt ergab damit zwei Nummern — Wächter 5 war auf dem Rechner grün
und im Job rot. Von Hand gepflegt stand sie sechs Veröffentlichungen lang
still, und `checkForUpdate` verglich damit die Version einer Seite mit sich
selbst: kein Gerät erfuhr je von einer neuen Fassung. Wächter 5 prüft das
nach. Wer sie doch einmal setzen muss, tut es über `BUILD_STAMP=…`.

Ein Durchlauf ohne Schritt 4 und 5 gilt als nicht erledigt. Kein Commit
mit rotem Wächter oder roter Suite.

---

## 2. Aufbau des Repositories

```
src/index.html        Gerüst mit den Platzhaltern /*@@CSS*/ und /*@@JS*/
src/css/              16 Dateien
src/js/               42 Dateien
tools/build.mjs       hängt src/css/* und src/js/* ALPHABETISCH aneinander
tools/check.mjs       vier Wächter
tests/run.mjs         Testläufer, jede Suite ein eigener Prozess
tests/ziel.js         entscheidet, welche Datei geprüft wird (dist vor Wurzel)
tests/fixtures/       die echten Partien der Liga, gepackt
index.html            das ausgelieferte Ergebnis, mitversioniert
mockup/               Entwürfe. Eigenständige HTML-Seiten ohne Bauablauf,
                      Vorlage für einen Umbau — kein Teil der App.
                      Dort liegt auch die Story-Simulation: hundert erfundene
                      Partien, gerechnet und erzählt mit dem Code der App
                      (README-story-simulation.md)
ARCHITEKTUR.md        ausführliche Herleitung, dort steht das Warum
.github/workflows/    pages.yml — Prüf-Job, Veröffentlichung schaltbar
kicker-app-main/      alter Abzug, liegt bewusst brach — nicht anfassen
```

> **Pflegepflicht.** Kommt eine Datei in `src/` dazu, fällt eine weg oder
> wird eine umbenannt, wird dieser Baum und — falls die Datei eine eigene
> Aufgabe hat — die Landkarte in §3 im selben Commit nachgezogen.

### Warum Aneinanderhängen und kein Bundler

Die gesamte Logik ist **eine IIFE**. Kein `import`, kein `export`, nichts
liegt auf `window`. Innerhalb dieser IIFE greifen hunderte Bezeichner quer
durcheinander, ohne jede Deklaration von Abhängigkeiten.

Daraus folgen drei harte Regeln:

1. **Die Zahlen-Präfixe der Dateinamen sind die Reihenfolge.** Wer eine
   Datei umbenennt, verschiebt Code. Neue Dateien bekommen ein Präfix, das
   sie an die richtige Stelle sortiert (`09c-`, `17b-`, `35b-` sind
   Nachzügler zwischen zwei bestehenden Nummern).
2. **Auch die CSS-Reihenfolge trägt Bedeutung.** Später geladene Regeln
   gewinnen bei gleicher Spezifität — `02-ranking.css` muss vor
   `12-insignium.css` stehen, sonst kippt das Wappen in der Ranglistenzeile.
3. **Ein Bezeichner darf nur einmal auf oberster Ebene stehen.** Getrennte
   Dateien sehen unabhängig aus, teilen sich nach dem Zusammensetzen aber
   einen Gültigkeitsbereich. Wächter 4 zählt sie (aktuell **669**) — und schlägt auch an, wenn einer
   davon nirgends mehr gerufen wird.

---

## 3. Landkarte

Die Banner im Code (`[§C6]`, `[§11.7]`, `[§4.1b]`) sagen, wozu ein Block da
ist. Der Dateiname sagt, wo er liegt.

Die Tabelle nennt **jede** Datei aus `src/js/` genau einmal. Das ist keine
Ordnungsliebe: Wächter 6 zählt nach, und eine Datei ohne Zeile hier ist eine
Datei, deren Aufgabe niemand aufgeschrieben hat.

| Bereich | Dateien |
|---|---|
| Rahmen, Zustand, Daten | `00-prolog` (Konstanten, Supabase-Client) · `01-update` (Version, Update-Banner, **aller Zustand**) · `04-cache` · `06-db` (Laden, Speichern, Saison-Rückblick) · `37-boot` |
| Rechnen | `03-saison` · `05-rang-elo` (Ränge, `posWert`, Metrikleiste) · `08-stats` · `10-elo-engine` |
| Ansichten | `11-view-ranking` · `12-view-positionen` · `13-view-awards` · `15-views-rest` (Teams, Verlauf, Einstellungen) · `18-profil` · `22-team-profil` |
| Blätter (Sheets) | `14-top5-listen` · `16-sheet-infra` (Öffnen, Stapel, Wischgeste) · `19-bilanzen` · `21-head-to-head` |
| Rückblicke | `05b-recap-teile` (Baukasten) · `07-positionsverlauf` (Woche, Tag) |
| Zeichen und Wappen | `02-icons` (SVG-Katalog, `lossStreakInline`) · `09c-zeichen` (Feuer, Sterne, `avHtml`) · `17-badges` · `17b-fingerabdruck` · `35b-prestige` (Insignium, Schwinge, Laufbahn) |
| News | `26-news-konstanten` (Kategorien, Limits) · `27-news-generator` (Ereignisse, Ewige Tafel) · `28-news-ambient` · `29-news-cache` (Realtime, Autosync, Entzerrung) · `30-news-ui` (`_isBreaking`) · `31-news-detail` |
| Chronik | `32-chronik-katalog` (`DISZIPLINEN`) · `33-chronik-engine` (Monat) · `34-chronik-rekorde` (Allzeit, `CHRON_KINDS`, `chronicleRang`, `rekordZaehlung`) · `35-chronik-ui` |
| Bedienung | `09-ui-infra` · `20-bind` · `23-match-edit` · `24-lock` · `25-helpers` · `36-backup` |

Bewusst **keine** Zeilenzahlen hier: die veralten bei jeder Änderung.
`wc -l src/js/* src/css/*` beantwortet das in einer Sekunde.

### Zustand

Der veränderliche Zustand der Oberfläche steht gesammelt in
`src/js/01-update.js` (`tab`, `period`, `ligaSeasonId`, `ligaSicht`,
`awView`, `awPeriod`, `awSeasonId`, `rekKammer`, `rankMetric`, …). Neue Zustandsvariablen
gehören dorthin und nirgendwo anders, und sie brauchen einen Rücksetzpunkt:
`09-ui-infra.js` (Tabwechsel), `20-bind.js` (Zeitraumwechsel) und
`24-lock.js` (Klick aufs Logo) setzen zurück.

`rekKammer` gilt **nur** für den Rekorde-Reiter und ist leer für alle vier
Kammern. Sie wird beim Tabwechsel UND beim Reiterwechsel geleert: wer den Tab
verlässt, will beim Zurückkommen die ganze Tafel sehen und nicht den
Ausschnitt von vorhin.

`ligaSeasonId` gilt **nur** für den Liga-Tab — Awards, News und Ambient
rechnen weiter mit `currentSeason()`. Sie wird beim Tabwechsel UND beim
Zeitraumwechsel geleert: die gewählte Saison gehört zur Ansicht „Saison",
und die Saison-Tools darunter (Recap, Positionsverlauf) folgen ihr.

> **Pflegepflicht.** Kommt eine Zustandsvariable dazu, wird sie hier genannt
> und ihr Rücksetzverhalten beschrieben.

### Caching

Jeder Topf hängt an `_cache` und trägt **`_cache.version` im Schlüssel**. Das
ist die ganze Regel: `invalidateCache()` erhöht die Version, und ein Wert mit
altem Schlüssel wird nie wieder gefunden. Die Tag-Liste
(`invalidateCache(['global','stats',…])`) löscht darüber hinaus einzelne Töpfe
sofort — sie ist eine Abkürzung, kein Ersatz.

Wer die Version wegen der Bequemlichkeit weglässt, baut einen stillen Fehler:
`teamDetail` und `h2hDetail` hatten nur Spieler-IDs im Schlüssel und hingen
damit allein an ihrem Tag — den der Eingabe-Tab beim Speichern gar nicht
mitreicht. Gemessen zeigte das Duo-Blatt nach einer neuen Partie weiter 26:4
statt 27:4 und die Bilanz 110 Duelle statt 111. `tests/tafel` misst das nach.

`tests/tafel` liest die ausgelieferte Datei und prüft die Regel für **jeden**
Topf nach — Stichproben genügen dafür nicht, weil ein neuer Topf gerade der
ist, an den niemand denkt.

Ein Topf mit einem Schlüssel, der die Version enthält, **wächst über die
Versionen**: er braucht eine Obergrenze, ab der er geleert wird. Sieben
hatten keine — darunter der der Auszeichnungen, der zu jeder Version zwölf
Listen mit je dreißig Einträgen anlegt und jede vorige behält. Der Deckel
wird nur bei einem Fehlgriff geprüft: vor dem Lesen geleert, verlöre er
gerade den Treffer, für den er da ist. `tests/tafel` zählt die Töpfe und
die Deckel — Stichproben genügen dafür nicht, weil ein neuer Topf gerade
der ist, an den niemand denkt. Wo eine
Rechnung an der Identität eines Arrays hängt statt an einer Version
(`_winnerCountsOf`, `matchesOfPlayer`, `matchesByDay`), reicht eine `WeakMap`
— `matches` wird immer **ersetzt**, nie an Ort und Stelle verändert, und ein
frisches Array verwirft den Memo von selbst.

> **Pflegepflicht.** Kommt ein Topf dazu, steht seine Schlüsselregel hier.

### Takt

Zwei Zeitgeber laufen dauerhaft (`37-boot.js`): `_tickDaten` alle dreißig
Sekunden, `_tickVersion` alle fünf Minuten. Beide **ruhen, solange die Seite
versteckt ist**, und holen beim Zurückkommen sofort nach. `loadAll` lädt alle
Spieler und alle Partien; das im Hintergrund zu tun ist Mobilfunk und Akku
für nichts, und ein PWA-Symbol bleibt tagelang offen. Der News-Autosync
(`29-news-cache.js`) befolgt dieselbe Regel seit jeher.

`_tickDaten` lässt außerdem ein offenes Blatt und den Eingabe-Tab in Ruhe:
was man gerade unter den Fingern hat, wird nicht neu gezeichnet. `tests/blatt`
misst alle vier Bedingungen.

> **Pflegepflicht.** Kommt ein Zeitgeber dazu oder ändert seine Bedingung,
> steht das hier.

---

## 4. Die sechs Wächter

| Wächter | fängt ab |
|---|---|
| 1 Drift | `index.html` wurde direkt bearbeitet statt `src/` |
| 2 Parser | Syntaxfehler an einer Dateigrenze — sonst erst im Browser sichtbar |
| 3 CSS-Klammern | eine offene `{` am Dateiende frisst still die nächste Datei |
| 4 Bezeichner | derselbe Name auf oberster Ebene in zwei Dateien — **oder** ein Name, den niemand mehr ruft |
| 5 Fingerabdruck | die Auslieferung trägt eine Version, die nicht zu ihrem Inhalt gehört — dann erfährt kein Gerät von einer neuen Fassung |
| 6 Arbeitsanweisung | diese Datei nennt eine Datei nicht, die es gibt, eine, die es nicht gibt, oder eine Zahl, die nicht stimmt |

Wächter 6 macht die Pflegepflichten dieser Datei prüfbar: Landkarte,
Dateizahlen, Bezeichnerzahl und die Liste der Suiten. Die Zahl der **Checks**
je Suite zählt `tests/run.mjs` nach, weil nur er sie kennt. Ein rotes
Ergebnis dieser Art nennt die richtige Zahl — sie wird übernommen, nicht
weggeklickt.

---

## 5. Die Testsuiten

Geprüft wird immer das **gebaute** Ergebnis (`dist/index.html`), nie die
Quelle: nur so fällt auch ein Fehler auf, der erst beim Zusammensetzen
entsteht. Jede Suite ist ein eigener Prozess, weil die App eine IIFE mit
globalem Zustand ist.

| Suite | prüft | Checks |
|---|---|--:|
| `disziplinen` | Chronik-Katalog, Vergabe, Belege, Insignium-Leiter, Prestige, Katalog-Karten, Rekordlage je Monat, Positionsrekorde, die Fügungen, die Belege, die neutrale Sprache, der Wochenherr, der Sieger eines Spieltags, die Zähler der Auszeichnungen, die Sprache der Belege und Bedingungen, die Mitte des Feldes, der neue Monatskatalog, die Form der Kurznamen | 935 |
| `tafel` | Monatstafel, Liga-Ansichten, Rückblicke, Rekord-Blatt, Invarianten, die Töpfe nach einer neuen Partie, ihre Schlüssel und ihre Deckel, die toten CSS-Regeln, die toten Zeichen, die Schwellen und Nenner der Awards | 176 |
| `ambient` | die 10-/19-Uhr-Slots, Rückblicke, Breaking, die Ewige Tafel im Feed, der Feed, der Tagesplan, die Sammelkarte, die Bündelung je Minute, die Auffrischung der Texte, die abgemeldeten Karten, der Countdown, die überholte Serie, der Memo, die Sprache, die Richtung der Rekordmeldung, die Meilensteine, der Tagesdeckel, die Namen in der Schlagzeile, die Sperrfrist, die Aufgabe auf der Karte, die Beziehung im Blattkopf, die Wochenkarte, der Deckel holt zurueck | 204 |
| `zeichen` | Feuer, Sterne, Wappen, Insignium-Leiter, Unterlage, Profilkopf — **im echten Browser gemessen** | 75 |
| `blatt` | Wem eine Wischgeste gehört, die Laufbahn-Vitrine, die Verläufe der Wappen, der Takt im Hintergrund, der Rekorde-Reiter, die Tafel, die Story-Blätter, das Rubrikband, Motiv und Winkel, die Sorten, die Lücken, die Ränder, die Bewegung, Breaking, der Inhalt, der Kopf, die Doppelungen und der Schmuck im Blatt, die negativen Rekorde im Profil, der offene Feed, die Chronik-Matrix — **im echten Browser gemessen** | 88 |
| `archiv` | Einfrieren abgeschlossener Monate | 8 |
| `backup` | Export und Wiederherstellung, braucht Chromium | — |

Ohne Browser steigt `backup` mit Code 2 aus und wird als *übersprungen*
geführt — sichtbar, aber nicht rot.

> **Pflegepflicht.** Ändert sich eine Zahl in dieser Tabelle oder kommt eine
> Suite dazu, wird die Tabelle im selben Commit nachgezogen.

### Wie geprüft wird

- **Geometrische Behauptungen werden gemessen, nicht geschätzt.** „Steht
  nicht über", „ist sichtbar", „liegt innerhalb" gehören in `zeichen` und
  werden dort am gerenderten Markup mit Playwright nachgemessen.
- **Jede neue Zusicherung wird einmal gegengeprüft:** den alten Wert kurz
  wiederherstellen, den Test fallen sehen, zurücknehmen. Ein Test, der noch
  nie rot war, prüft nichts.
- Die Fixtures sind die **echten** Partien der Liga. Schwellen, die auf
  erfundenen Zahlen kalibriert sind, sagen nichts.
- Ändert sich absichtliches Verhalten, wird die Zusicherung an die neue
  Absicht angepasst — nicht das Verhalten an den alten Test.

---

## 6. Gestaltungsgesetze

Diese Regeln stehen als Kommentar im Code und werden dort mit ihrem Kürzel
zitiert. Sie sind nicht Geschmack, sondern Absprache.

- **§C25 Farbgesetz.** Vier Rollen, mehr nicht:
  1. Rangfarbe = „ich"
  2. Gold = Titel und heute gehaltene Rekorde
  3. Grün/Rot = ausschließlich Richtung
  4. Metall = alles Übrige
  Im Rekorde-Reiter heißt das: Können und Bestmarke tragen Gold, die Fügung
  Metall [§C35] — sie zeichnet niemanden aus —, die Schattenseite Rot. Als
  alle fünfunddreißig Karten golden waren, sagte Gold dort nichts mehr.
  **Was negativ ist, trägt Rot und zählt nicht als Rekord** (`neg`, gesetzt
  von `art:'schatten'` oder `negativ:true` im Katalog). „Die bitterste
  Pleite" stand im Profil golden zwischen den Titeln und machte aus sechs
  Rekorden sieben; sie steht dort jetzt rot, hinten und außerhalb der Zahl,
  und `nextRecordFor` schlägt sie niemandem als Ziel vor. Die **Kammer**
  bleibt davon unberührt — sie steht als `data-kammer` an der Karte, nicht
  als Farbklasse, weil eine Fügung rot sein kann und trotzdem eine Fügung
  bleibt — und `art` auch, sonst verschöbe sich das Prestige [§C34].
- **§C27 Ein Bauteil, überall dasselbe.** Derselbe Spieler sieht in
  Rangliste, Positionen, Awards, Team-Blatt, Podest und Profil gleich aus.
  Das Wappen ist `.rav` (`insAvWrap`), das Podest ist `.podest`/`.pod-karte`
  (`_chronPodestHtml` zeichnet es für Monats- und Rekord-Blatt aus derselben
  Reihenfolge — zwei Podeste für dieselbe Aussage wären eins zu viel),
  die Segmentwähler sind `.ui-switch` (äußere Ebene, gerahmt) und `.ui-tabs`
  (innere Ebene, rahmenlos), das Rangabzeichen ist `.rangab`
  (`rankBadgeHtml`).
  Im Feed gliedert der **Tageskopf** (`.nf-tag`) die Tafel: Wochentag
  ausgeschrieben, Datum daneben, die Zahl der Karten rechts — und sonst
  nichts. Er trug zuerst die Schlagzeile der wichtigsten Karte, und
  die stand damit zweimal untereinander; danach die Bilanz des Tages und die
  Gesichter, die wiederholten, was die Karten darunter ohnehin zeigen: vier
  Wappen über vier Karten, auf denen dieselben vier Wappen stehen.
  Er ist eine **Marke auf dem Zeitstrahl, keine Karte**: mit Rahmen und Füllung
  sah er aus wie eine ungeöffnete Story und stand mit den Karten darunter auf
  einer Ebene. Sein `data-tag` trägt den Tagesschlüssel, damit sich prüfen
  lässt, ob an diesem Tag gespielt wurde — `_newsTagBilanz` beantwortet das,
  seit die Bilanz aus dem Markup verschwunden ist.
  Über jeder Karte steht das **Rubrikband** (`.nf-top`, `_newsRubrik`,
  `_newsSorteIcon`): Zeichen und Rubrik links, Uhrzeit rechts, wie in einer
  Zeitung. Vorher trug jede Karte eine gefärbte Pille mit dem Kategorienamen
  aus der Datenbank („Badge & Awards"), und zehn Pillen in zehn Farben
  untereinander waren ein Farbverlauf ohne Aussage. Das Band ist **leiser als
  die Schlagzeile** — es sagt, woher die Nachricht kommt, und überlässt ihr
  den Platz.
  Die **zehn Kartenformen** (`.nf-s-spiel`, `-tafel`, `-ins`, `-held`, `-woche`,
  `-duell`, `-serie`, `-badge`, `-marke`, `-fakt`, vergeben von
  `_newsSorte`) sagen vor dem ersten Satz, worum es geht: das **Ergebnisband**
  (`_newsErgebnisBand`) beim Spieltag, der **große Wert** (`_newsWertBlock`)
  bei einem Rekord, die **Leiter** (`_newsLeiter`) beim Insignium, der
  **Bilanzbalken** (`_newsBilanzBalken`) beim Duell, der **Serienlauf**
  (`_newsSerienBand`) bei einer Serie, das **Sammelband**
  (`_newsSammelBand`) unter einer Sammelkarte, das **Zahlenband**
  (`_newsZahlband`) im Fuß. Vorher unterschied die Sorten nur eine Randfarbe, und zehn Karten
  untereinander sahen alle gleich aus. Rivalität, Serie und Duo waren zuletzt
  noch EINE Sorte, und an einem Spieltag standen drei Karten „ZU ZWEIT"
  untereinander, die von drei verschiedenen Dingen erzählten.
  Jede Karte trägt außerdem ihr **Motiv** (`_newsMotiv`) — dasselbe Zeichen wie
  im Rubrikband, groß und leise am rechten Rand, ganz innerhalb der Karte, weil
  es angeschnitten wie ein Fehler aussah, mit einem weichen Schein dahinter,
  weil es als reine Kontur auf dem Telefon von einem Kratzer nicht zu
  unterscheiden war — und einen **Winkel** (`.nf-chev`)
  neben dem Satz, der sagt, dass sie sich öffnet.
  **Keine zwei Rubriken tragen dasselbe Zeichen**: der Spieltag trug gekreuzte
  Klingen und das Duell trägt Klingen, und als Motiv nebeneinander war das
  dieselbe Zeichnung in zwei Größen. Das Zeichen sitzt in einer eigenen
  **Kachel** — frei stehend war es ein Strich von elf Pixeln neben der Schrift
  und von ihr kaum zu unterscheiden.
  Der Grund der Karte hat zwei Stellschrauben: `--neu` ist der Anlauf von
  links, solange sie ungelesen ist, `--tint` der Schein aus der Ecke in der
  Farbe ihrer Rubrik. Beide als Variable, weil die Sorte sonst den
  Ungelesen-Zustand überschrieben hätte — und das ist der wichtigere.
  **Die Bildzone macht die Karte nie höher als ihren Text.** Die beiden Wappen
  eines Duells standen übereinander in der linken Spalte und machten die Karte
  56 Pixel höher als ihr einzeiliger Satz; daneben war nichts. Sie stehen
  jetzt als Band über dem Text. Ein einzelner Wert stand als eigener Streifen
  im Fuß und füllte dort eine Zeile mit zwei Wörtern; er steht jetzt neben dem
  Wappen. Und der Serienlauf sagt rechts, was seine Punkte zählen — sonst war
  die halbe Bandbreite leer. Im Satz stehen Ergebnis,
  Zahl, Datum und Name **fett** (`_newsBetont`): eine Ableitung aus dem Text
  wie `_isBreaking`, also auch an persistierten Karten. Der **Filter** sind
  vier Chips mit Anzahl und Zeichen (`.nf-chip-f`) statt elf Rubriken, und der
  **Gelesen-Knopf** (`.nf-gelesen`) steht neben der Zahl, die ihn erklärt.
  Es gibt **eine** Kartenform, nicht zwei: das Mini-Popup über dem
  Glockenknopf ist entfallen. Es zeigte dieselben Stories in einer viel
  einfacheren Karte — Kategorie-Pille aus der Datenbank, Titel, Text, ohne
  Motiv, ohne Sammelband, ohne Gesicht —, und erreichbar war es zuletzt gar
  nicht mehr: der Knopf öffnet seit langem direkt den vollen Feed. Der Feed
  ist an `.nf-wrap` erkennbar; `_isNewsFeedOpen` fragte nach der Popup-Klasse
  `.nv-list-flat`, war damit immer falsch, und eine Story, die per Realtime
  hereinkam, erschien erst beim nächsten Öffnen.
  **Breaking bricht die Spalte**: die Karte steht breiter als jede andere und
  ist daran erkannt, bevor ein Wort gelesen ist; ihr Rahmen glimmt, weil ein
  stehender roter Rahmen beim Scrollen ein Farbton unter vielen war. Die
  **Karte des Tages** bewegt sich leiser: ein Licht wandert einmal alle sieben
  Sekunden durch ihr Band, der Stern atmet. Beides ruht bei
  `prefers-reduced-motion`, und `tests/blatt` misst das nach.
  **Der Rand sagt, wie schwer eine Karte wiegt** (`--kante`, `--rahmen`): Gold
  am stärksten, der Spieltag darunter, der Fun Fact am dünnsten, Rot für die
  Richtung. „Wichtig" leuchtet und verbreitert nicht — als es die Kante auf
  vier Pixel setzte, trug ein Fun Fact denselben Rand wie ein Liga-Rekord.
  Eine Karte, die von einer Pleitenserie oder einer Schande erzählt, trägt
  `.nf-neg` und damit Rot in Rubrik und Motiv [§C25] — die Durststrecke stand
  vorher im selben Grün wie die Siegesserie.
  **Jedes Blatt hat denselben Bau**: `_newsBlattKopf` (das Ergebnis der Partie,
  dann Wappen, Name und darunter Rang, Zeichen und Prestige), die typ-eigene
  Mitte aus `_newsDetailMitte`, dann `_newsBlattFuss` (der Weg weiter). Es gibt
  einunddreißig Story-Typen, und jeder brachte sein eigenes Blatt mit: wer zwei
  nacheinander öffnete, fand nichts an derselben Stelle. Die Partie steht dabei
  höchstens einmal im Blatt — `_ndKopfMatch` merkt sich, was der Kopf schon
  zeigt, damit `_newsMatchVsBlock` sie nicht wiederholt.
  **Das Blatt setzt fort, was die Karte angefangen hat**: dieselbe Rubrik,
  dasselbe Motiv, dieselbe Zeichenkachel, dieselben fetten Akzente, dazu eine
  Haarlinie in der Farbe der Sorte am Kopf. Sein Kopf trägt das
  **Rangabzeichen** (`rankBadgeHtml`) — das Bauteil, das die App schon hat
  [§C27]; dort stand statt seiner die Zeile „Rang 6" als nackter Text. Vorher stand oben der
  Kategorienname aus der Datenbank, den es auf der Karte seit dem Rubrikband
  nicht mehr gibt.

  **Was oben steht, steht unten nicht noch einmal** (`_ndNeu`, `_ndOben`). Der
  Kopf des Blatts zeigt Schlagzeile und Text der Karte; steht derselbe Satz
  darunter ein zweites Mal, liest man ihn zweimal und erfährt nichts. Beim
  Angstgegner stand „5× in Folge gegen denselben Gegner" als Bedingung im
  Medaillon und drei Zeilen darüber im Text schon „Fünf Pleiten in Folge gegen
  Maxi". Die **Beschriftung** einer Zeichnung ist davon ausgenommen: der Name
  des Zeichens steht neben dem Zeichen, weil er dazugehört.

  **Jedes Blatt zeigt, wovon seine Story handelt.** Die Karte „X trägt den
  Schildring" öffnete ein Blatt mit NULL Zeichen Inhalt, und fünf ambiente
  Karten zeigten „Im Fokus: Name" — den Namen, den der Kopf zwei Zeilen
  darüber schon nannte. Der **Insignium-Block** (`_newsInsigniumBlock`) trägt
  jetzt die Zeichnung groß, die Stufe, die Punkte, den Balken zur nächsten
  Schwelle und die Leiter; jede ambiente Karte trägt ihren Wert groß, und wo
  es ums Prestige geht, steht der Block dabei — er IST die Aussage. Der
  Blattkopf nennt Stufe und Prestige dann nicht noch einmal als Text: dafür
  wird die **Mitte zuerst gebaut** (`_ndZeichenUnten`), sonst weiß der Kopf
  nicht, was unter ihm steht.

  Und es schmückt aus, wo es etwas zu feiern gibt: das
  **Medaillon** (`_newsMedaillon`) bei einer Auszeichnung — Zeichen im Ring der
  Klasse, darunter Bedingung und Halterzahl [§C34] —, der **große Wert**
  (`.nd-gwert`) und die **Verfolger** (`_newsVerfolger`, die drei Besten aus
  `chronicleRang`) bei einem Rekord, der **Serienlauf** bei einer Serie, der
  **Bilanzbalken** beim Duell, die **Partien des Tages** (`_newsTagPartien`)
  beim Spieler des Tages. Der ganze Awards-Reiter hatte im Blatt vorher
  gar keinen Fall: wer eine Rekord-Karte öffnete, sah den Satz, den er auf der
  Karte schon gelesen hatte. Wer ein zweites Bauteil für dieselbe Aussage baut,
  hat einen Fehler gemacht.
  **Die Kachel misst am Reif, nicht am Gesicht** — der Avatar ist 46 % von
  `--rav`. Wer ein 40-px-Gesicht ersetzt, braucht 87 px Kachel, nicht 40.
  Unter 48 px bleibt vom Zeichen nichts übrig; 52 px sind das Maß der
  Ranglistenzeile und die Untergrenze.
  **Das Banner trägt es nur, wo ein Spieler allein und groß steht:**
  Profilkopf, Podest der Ewigen Tafel, Podest der Award-Sammler, die Karte
  des Spielers der Woche und des Tages, das Podest im Saison-Rückblick.
  Schwinge und Raute erzählen von der LAUFBAHN; in einer Zeile fehlt ihnen
  die Höhe, und in einem Team-Blatt handelt die Seite vom Duo, nicht von
  den Titeln eines Einzelnen.
  Das Insignium hat drei Teile, die in jeder Stufe gleich aussehen: den
  **Reif** (`_insReif`), den **Kopf** auf zwölf Uhr und die **Raute** am
  Fuß (`_insFuss`) — daran bleibt die Familie erkennbar, auch wenn der
  Schmuck dazwischen vollständig wechselt [§C30].
  Der Saisonwähler (`.saisonwahl`, `saisonWaehlerHtml`) ist bewusst **keins**
  von beiden: er wählt weder Ansicht noch Filter, sondern den Zeitpunkt, von
  dem alles darunter handelt. Als `.ui-tabs` stand er zwischen zwei echten
  Reiterstreifen und war von ihnen nicht zu unterscheiden.
- **§C26 Das Zeichen.** Sterne = Ligatitel. **Höchstens fünf, dann die
  Zahl** — in beiden Formen gleich: unter dem Avatar in der Liste
  (`_znSterneSvg`, CSS), über dem Zeichen mit Band (`_insSterne`, im SVG).
  Zwei Formen für dieselbe Zahl wären eine zu viel [§C27]; die Stelle ist
  verschieden, weil mit Band der Fuß der Raute gehört [§C30].
  Mit Band liegen sie auf einem **festen Radius** um die Reifmitte, nicht auf
  dem Zeichen und nicht je Stufe woanders. Sie standen im verkleinerten
  Kasten der Schwinge und landeten damit auf dem Kopf des Insigniums — Gold
  auf Gold, bei neun der fünfzehn Zeichnungen nicht mehr zu zählen.
  Feuer dahinter
  = laufende Siegesserie in drei Stufen (3–4, 5–6, ab 7), Stop-Motion ohne
  JS-Timer — und **nur dort**. Neben dem Namen steht allein die
  Niederlagenserie (`lossStreakInline`, ein bis drei Tropfen bei denselben
  Schwellen 3, 5, 7); für sie brennt am Avatar nichts. Die Siegesserie stand
  dort ein zweites Mal als Flammensymbol und sagte damit dieselbe Zahl in
  einer zweiten Bildsprache.
  Die kleinste Stufe kam in einer 52-px-Zeile keine sechs Pixel über den
  Reif und war auf dem Telefon ein warmer Hauch statt eines Feuers — drei
  Siege in Folge sind aber das, was die meisten überhaupt erreichen. Die
  Leiter beginnt deshalb eine Zeichnung höher und hat oben eine neue,
  größere. Wie weit eine Stufe schlagen darf, sagt `spitze`; sie ist **je
  Stufe** überschreibbar, weil der Deckel die unteren Stufen wirklich
  beschneidet und ein angehobener Deckel sie still hätte mitwachsen lassen.
  Im Profil trägt das Feuer die Rangfarbe. Über dem Zeichen hat der
  Profilkopf nur seinen Innenabstand, und `.pp-header` schneidet ab: für die
  brennenden Stufen rückt er nach unten (`--feuerluft`) — und nur für sie,
  damit neunzehn von zwanzig Profilen dafür nichts zahlen.
  Dieselbe Serie brennt auch in den Formpunkten (`.dot.glut`, `formDotsHtml`)
  — dort aber als zwei Pseudo-Elemente, nicht als SVG: sechzig gezeichnete
  Feuer auf einer Liste sind auf dem Telefon eine Zumutung. Der Punkt bleibt
  grün, die Flamme sitzt darüber.
- **§C33 Im Feed hat jeder ein Gesicht.** Jede Story, die einen Spieler
  nennt, zeigt ihn: ein Einzelner sein Wappen wie überall sonst [§C27], ein
  Duo zwei überlappende Chips. `_newsPids` sucht die Beteiligten in den über
  die Jahre gewachsenen `dataRef`-Feldern; `_newsGesichtHtml` zeichnet sie.
  Der Feed war die einzige Ansicht der App, in der ein Spieler nur ein Name
  war.
  Und er trug elf Kategoriefarben. Jetzt gilt auch hier das Farbgesetz:
  Gold für Titel und Rekorde (`breaking`, `highlight`, `badge`, `comeback`),
  Rot für die Richtung (`misfortune`), Metall für den Rest.
  Drei Regeln gegen Rauschen: **kein Story-Typ steht mehr als zweimal im
  Feed** (`_consolidateStories`, ausgenommen die seltenen Ereignisse, die
  Sammel- und die Wochenkarte), **keine zwei Karten tragen dieselbe
  Schlagzeile** oder **denselben Text** („Eine große Rivalität, die Liga
  liebt's" stand wortgleich unter zwei Karten und nannte keine einzige Zahl).
  **Die Reihenfolge ist die Zeit.** `_consolidateStories` sortiert nicht mehr
  um. Zwei Durchgänge taten das früher: einer tauschte gleichartige Nachbarn,
  einer schob Karten nach hinten, deren Gesichter schon viermal dastanden.
  Beide kosteten Chronologie, ohne eine einzige Karte zu sparen, und der Feed
  ist nach Tagen gegliedert: eine Karte, die dabei den Tag wechselt, steht
  unter dem falschen Kopf. Gemessen ergab das acht Tagesköpfe für sieben Tage.
  Die Verteilung trägt jetzt allein der Generator (`PER_PLAYER_LIMIT`,
  `NEBENROLLEN_LIMIT`); gemessen steht danach kein Spieler auf mehr als einem
  Drittel der Karten, und jeder gewertete Spieler kommt vor.

  **Ein Tag trägt sechs Karten** (`NEWS_LIMITS.proTag`). Gemessen trug ein
  Spieltag neun: zwei Sammelkarten, zwei Serien, zwei Auszeichnungen, den
  Spieler des Tages, den Elo-Ausschlag und einen Serienbrecher. Das ist keine
  Tafel mehr, das ist ein Protokoll. Der Tag behält seine stärksten, gemessen
  an `prio` — der Reihenfolge, die der Generator ohnehin vergibt und nach der
  auch die Sammelkarte ihren Kopf wählt [§C27]. **Breaking zählt nicht mit**:
  es ist das Seltenste und darf nie an einem Deckel scheitern. Und was es je
  Tag, Woche oder Monat genau einmal gibt, fällt nie darunter (`TAG_PFLICHT`:
  Spieler des Tages, Wochenkarte, Monatschronik, Saison-Rückblick) — der
  Spieler des Tages IST die Schlagzeile seines Spieltags. In einer simulierten
  Liga aus hundert Partien fiel er als siebtstärkste Karte heraus, während zwei
  Auszeichnungen und eine laufende Serie darüber standen, und der Tag hatte
  danach keinen Sieger mehr. Gedeckelt wird,
  was wegfällt, nicht wo etwas steht — die Reihenfolge bleibt die Zeit.
  `prio` sortiert den Feed seit dem chronologischen Umbau nicht mehr; sie
  entscheidet nur noch, wer ein Bündel anführt und wer den Deckel überlebt.
  Eine **seltene Auszeichnung** steht darin über einer laufenden Serie: die
  Serie läuft weiter, die Auszeichnung ist geholt. Sie stand auf 5 und damit
  unter der Duo-Pleitenserie, mit der Begründung, Team-News sollten „auch mal
  oben stehen" — was seit dem chronologischen Feed niemand mehr entscheidet.

  **Der Fun Fact füllt einen stillen Tag, er ergänzt keinen lauten.** „Leon
  führt das Prestige an" gilt seit Wochen und stand neben dem Spieltag, an dem
  gerade etwas passierte. Der Abend-Slot schweigt an Spieltagen seit jeher; der
  Vormittags-Slot kann es nicht wissen, weil er vor der ersten Partie entsteht.
  Entschieden wird es deshalb bei der Anzeige: trägt der Tag eine echte
  Nachricht, fällt sein Fun Fact weg. Der Countdown zählt dabei nicht als
  Nachricht — „Noch fünf Tage" steht an jedem Tag der Saison.

  **Gebildet wird nur, was auch erscheinen kann.** Über die ganze
  Ligageschichte reißen viele Paare eine Duell-Schwelle: gemessen sechzehn, von
  denen zwei im Feed standen. Die anderen vierzehn wurden trotzdem gebildet und
  **persistiert** — Zeilen in der Datenbank für Karten, die niemand je sieht.
  Gemeldet werden die jüngsten (`NEWS_LIMITS.rivalryMarke`); ein Meilenstein
  von vor drei Monaten ist keine Nachricht mehr.

  **Was im selben Moment passiert, kommt in eine Karte.** Ein Spieltag trug
  gemessen zehn Karten, vier davon in derselben Minute: ein Rekordwechsel,
  eine Insignium-Stufe und zwei Rivalitäten standen als Fremde nebeneinander,
  und zwei Spieler bekamen im selben Spiel dieselbe Auszeichnung auf zwei
  Karten. `_consolidateStories` bündelt das zur **Sammelkarte** (`sammel`),
  aber nur, wenn alle vier Bedingungen zutreffen: **derselbe Moment**
  (dieselbe Minute, oder derselbe Tag an der Ewigen Tafel), **dasselbe
  Subjekt** (ein gemeinsamer Spieler), **dieselbe Art** (Spieltags-Ereignisse
  untereinander, Tafel-Ereignisse untereinander — ein Fun Fact gehört nie
  dazu, der stand gestern genauso da) und **ein gemeinsamer Satz**, den die
  stärkste Story liefert. Vier Zeilen sind die Grenze; darüber ist es ein
  Tagesrückblick.
  Der Moment ist die **Minute**, nicht die Partie: nur EINE Story trägt eine
  `matchId`, alle anderen tragen bloß ihren Zeitstempel, und über die Partie
  gebündelt fand die Regel fast nie zwei Zeilen. Genau eine Minute der
  Ligageschichte trägt zwei Partien, also kostet das nichts.
  **Die Minute allein reicht nicht.** „Johannes und Anton verlieren zusammen
  alles" trug „Maxi: Nerven aus Stahl" als zweite Zeile — drei fremde Spieler
  in einer Karte, die nur ihr Zeitstempel verband. Innerhalb einer Minute
  bilden deshalb die **Beteiligten** die Gruppen: wer einen Spieler mit einer
  bestehenden Gruppe teilt, kommt dazu und zieht die Gruppen zusammen, die er
  verbindet. Eine Minute trägt nie mehr als vier Karten, die Verschmelzung
  kostet also nichts. Zwei Karten in derselben Minute sind danach erlaubt,
  solange sie von verschiedenen Leuten handeln.
  Innerhalb einer Sammelkarte steht **jede Schlagzeile einmal**: viermal
  „Martin baut ‚Der Fels' aus" untereinander war eine Zeile und drei
  Wiederholungen. Und ihr Titel folgt der Zahl der Namen — „Martin bewegen
  die Ewige Tafel" stand über einer Karte mit einem einzigen Namen.
  **Die Schlagzeile nennt alle, um die es geht** (`_namenKurz`): „Leon und
  Martin bewegen die Ewige Tafel" stand über einer Karte von drei Leuten, und
  der dritte kam nur in der Liste darunter vor. Einer steht allein, zwei stehen
  mit „und", drei als Aufzählung, ab dem vierten zählt die Zeile den Rest —
  sechs Namen sprengen jede Überschrift. Dieselbe Aufzählung gilt im Blattkopf
  und im Sammelband.

  **Bündeln darf nichts verstecken.** Die Sammelkarte trägt Rubrik, Motiv und
  Schlagzeile ihrer stärksten Story — und darunter das **Sammelband**
  (`_newsSammelBand`, `.nf-sam`): jede weitere Meldung mit ihrem Zeichen, kurz
  und in einer Reihe, auf der KARTE und nicht erst im Blatt. Vorher stand dort
  nur die Schlagzeile des Kopfs, und wer die Karte überflog, sah von der
  zweiten Meldung nichts. Jede Zeile trägt ihre Beteiligten (`pids`) — daran
  hängt die Bündelung, und im Blatt führt die Zeile damit zu dem, von dem sie
  handelt.

  **Was wichtig ist, bleibt eine eigene Karte** (`_sammelEinzeln`): Breaking,
  weil ein erstmals vergebener Liga-Rekord nicht als vierte Zeile enden soll,
  und jede **seltene oder legendäre Auszeichnung**. „Nerven aus Stahl" (drei
  Zittersiege in Folge) ist der Grund, warum jemand die App öffnet — es steht
  nicht als Kleingedrucktes unter der Duo-Serie zweier anderer.
  **Die Karte fasst zusammen, das Blatt zeigt alles.** Der Text der
  Tafel-Karte hängte die Schlagzeilen aller Zeilen aneinander und trug damit
  die Liste, die das Blatt darunter ohnehin führt; er nennt jetzt das
  stärkste Ereignis und zählt den Rest. Und im Blatt fällt die Zeile weg,
  die der Kopf schon ist [§C33 `_ndNeu`]: bei einer Spiel-Sammelkarte
  gehören Schlagzeile und Text dem stärksten Ereignis, dessen Zeile stand
  darunter wortgleich ein zweites Mal. Bleibt dabei nichts übrig, wird die
  ganze Liste gezeigt — ein leeres Blatt ist schlimmer als eine Wiederholung.

  **Dieselbe Aussage kommt drei Tage lang nur einmal** (`NEWS_LIMITS.sperreTage`).
  Zwei gleiche Schlagzeilen fängt der Feed schon ab. Eine Aussage, deren ZAHL
  sich mitbewegt, entkommt ihm: „Martin baut ‚Der Maßstab' aus" heißt nach dem
  nächsten Sieg genauso, nur mit 74 statt 73 Prozent, und bekommt damit eine
  eigene ID, einen eigenen Titel und eine eigene Karte. Gesperrt wird deshalb
  die Aussage selbst — Art, Beteiligte und Sache —, nicht der Wortlaut. Wer den
  Rekord übernimmt, trägt andere Spieler im Schlüssel: eine Übernahme bleibt
  Nachricht, auch am Tag nach einer anderen. Was es je Tag, Woche oder Monat
  genau einmal gibt, fällt nie darunter, und die ambienten Karten hängen ohnehin
  an ihrem Slot.

  **Zwei Karten mit derselben Schlagzeile sind eine zu viel.** Der Feed
  entfernt Doubletten nach Text UND nach Titel: zwei Rekordkarten
  unterschieden sich im Beleg und trugen wortgleich dieselbe Zeile, und nach
  zwei Partien stand sie zweimal untereinander. Wer den Rekord hält, wird
  dafür **sortiert** verglichen — dieselben zwei Halter in anderer
  Reihenfolge galten sonst als Halterwechsel.

  **Was der Generator nicht mehr erzeugt, verschwindet auch.** Der
  Wochenrückblick war einmal sechs eigene Karten über den Montag verteilt.
  Er ist jetzt eine Karte am Sonntag — aber die alten liegen persistiert in
  der Datenbank, und nichts hat sie je wieder angefasst: am Montag danach
  stand „der größte Sprung der Woche" neben dem Spieltag, der gerade lief.
  `_newsTexteAuffrischen` konnte sie nicht einmal umschreiben, weil der
  Generator ihre ID gar nicht mehr bildet. `STORY_ABGEMELDET` meldet sie ab —
  am **ID-Präfix**, nicht am Typ: der wöchentliche Elo-Sprung hieß
  `elo_swing_week_…` und trug denselben Typ wie der tägliche, den es noch
  gibt. Über den Typ war er nicht zu fassen. Auf die Liste gehört **nur**,
  was der Generator nicht mehr bildet — ein Präfix, das es noch gibt, wäre
  damit stumm geschaltet.

  **Was abläuft, läuft auch ab.** Eine Karte, deren Wahrheit ein Countdown
  ist, lebt nur so lange, wie der Generator sie noch bildet
  (`STORY_LAEUFT_AB`). „Noch 5 Tage" gilt unter EINER ID für eine ganze
  Saison, und der Zeitstempel stammt aus dem ersten Insert: war die Saison
  vorbei, zählte die Karte für immer Tage herunter, die es nicht mehr gab.

  **Und was überholt ist, auch.** Die ID einer Serienkarte trägt ihre Länge
  (`team_streak_A_B_7`), also wird jede Länge einzeln persistiert. Aus einer
  Serie, die von sieben auf zehn wuchs, standen vier Karten im Feed. Für
  Einzelspieler filterte `_liveStreakForm` das längst, für Duos filtert es
  jetzt `_liveTeamStreak`.

  `_newsTexteAuffrischen` merkt sein Ergebnis auf die Eingabe und gibt bei
  unverändertem Wortlaut dieselbe Referenz zurück. Ohne das baute es bei
  jedem Aufruf ein frisches Array, und der Referenz-Memo in
  `_consolidateStories` — der genau dafür gebaut ist — schlug nie an:
  gemessen null Treffer in fünf Aufrufen, bei einem Aufruf nach jedem
  `loadAll` und bei jedem Zeichnen des Feeds. `tests/ambient` misst das alles.

  **So spricht die Liga.** Leicht und unkompliziert, aber mit den Zahlen dran.
  Kein Gedankenstrich — er trennte Sätze, die als zwei Sätze klarer sind. Die
  Schlagzeile sagt, was passiert ist, und steht nicht noch einmal im Text:
  „Serie gerissen: Martin" trug den Verlierer in der Zeile und die Tat im
  Kleingedruckten, jetzt heißt es „Leon und Maxi brechen Martins 8er-Serie".
  Jeder Text nennt eine Zahl (ausgenommen die Auszeichnung, deren Text die
  Bedingung aus dem Katalog ist), und jeder Name im Satz ist aufgelöst: „Holt
  er ihn" stand direkt hinter dem Namen des HALTERS und zeigte auf den
  Falschen. `tests/ambient` misst das alles.

  **„Ausgebaut" heißt besser geworden** (`_rekordArt`). Die Meldung feuerte,
  sobald sich die angezeigte Zahl änderte — egal wohin. „Der Fels" ging von
  6,9 auf 7,0 Gegentore und „Der Platzhirsch" von 44 auf 42 %, beides eine
  Verschlechterung, und beides stand als „baut seinen Rekord aus" im Feed. Wer
  den Rekord hält und verschlechtert, hat nichts getan: die anderen sind nur
  nicht vorbeigezogen.

  **Ein überschrittener Meilenstein bleibt auffrischbar.** Die ID trägt die
  Zahl (`rivalry_milestone_A|B_50`); stand das Paar bei 52, bildete der
  Generator die 50er-ID nicht mehr, und „Historisches 50. Aufeinandertreffen"
  blieb mit seinem alten Wortlaut stehen. Gemeldet wird deshalb **jede
  überschrittene Schwelle**, mit dem Zeitpunkt der kreuzenden Partie und dem
  Zwischenstand von damals — „Das 50. Aufeinandertreffen dieser beiden" stand
  sonst wortgleich unter zwei Karten und nannte keine einzige Zahl.

  **Der Text kommt aus dem Generator, nicht aus der Datenbank.** Stories
  werden persistiert, damit alle Geräte dieselbe Karte zur selben Zeit sehen —
  Titel und Text waren damit aber eingefroren: eine überarbeitete Formulierung
  erschien nur an Karten, die es noch nicht gab. Nach dem Umbau stand „dieses
  Duo harmoniert gerade perfekt" weiter im Feed, obwohl der Satz längst durch
  die Zahl ersetzt war. `_newsTexteAuffrischen` lässt deshalb den Wortlaut des
  Generators gewinnen, wenn er dieselbe ID noch einmal erzeugt. ID und
  Zeitpunkt bleiben, was die Datenbank sagt, sonst spränge eine Karte im Feed;
  alles andere ist eine Ableitung aus den Daten und darf sich verbessern —
  genau so arbeiten `_isBreaking` und `_displayCat` seit jeher.

  **Breaking ist das Seltenste, also darf es das Lauteste sein.** Sieben
  Anlässe sind erlaubt, das sind wenige Karten pro Saison. Vorher unterschied
  sie ein dünner roter Rahmen von jeder anderen Karte, und im Feed ging sie
  unter. Jetzt: voller Rahmen, ein Balken mit pulsierendem Punkt, ein warmer
  Schein von links unten und eine Schlagzeile, die die Karte trägt. Der Puls
  ruht bei `prefers-reduced-motion`.

  **Die Karte des Tages** (`_newsTagKarte`, `.nf-gross`) steht groß an ihrer
  Uhrzeit, nicht am Kopf des Tages — sie nach oben zu ziehen wäre genau die
  Umsortierung, die der Feed nicht mehr macht. Es gibt sie **nur an
  Spieltagen**: an einem Tag ohne Partie ist nichts passiert, was ihn von einem
  anderen unterscheidet, und dort standen sonst ein Fun Fact oder eine
  Zufallsstatistik groß im Bild, die gestern genauso dagestanden hätten.

  **Der Tagesplan.** `07:00` gab es nicht mehr: der Spieler des Tages steht um
  **23:59 an seinem eigenen Spieltag**, wenn keine Partie mehr dazukommen kann
  (die späteste der Liga hat um 18 Uhr angefangen). Vorher erschien er am
  Morgen danach und stand in der Tafel unter einem Datum, an dem gar nicht
  gespielt wurde. Der Fun Fact um **10:00** kommt täglich — keine der 466
  Partien hat vor 10 Uhr angefangen, er steht also immer vor dem Spieltag; der
  um **19:00** nur an Tagen **ohne Partie**. Die Chronik des Vormonats steht am
  **1. um 00:00** statt am Vormittag danach. Und der Wochenrückblick ist
  **eine** Karte am **Sonntag um 23:00** (`woche`): vorher standen sechs
  Wertungen als sechs Karten über den Montag verteilt, und der Montag ist der
  Spieltag — die vergangene Woche verdeckte, was gerade passierte. Die
  Wochengrenze liegt dafür in `_potwLastWeekRange`, damit Rückblick, POTW und
  Wochenkarte über dasselbe Fenster reden.

  **Die Ewige Tafel meldet sich.** Der ganze Awards-Reiter kam im Feed nicht
  vor: wer einen Liga-Rekord übernahm, eine Monatschronik holte oder eine
  Insignium-Stufe erreichte, erfuhr es nur, wenn er selbst nachsah. Die
  Kategorie `tafel` sammelt das. Quelle der Rekordmeldungen ist ein
  Zeitschnitt — `allChronicles(bisMs)` vor dem letzten Spieltag gegen heute;
  er kostet einmal ~18 ms und liegt danach im Cache.
  Drei Sorten, drei Aussagen: **erstmals vergeben** (den Rekord hatte vorher
  niemand), **übernommen** (der Halter wechselt) und **ausgebaut**.
  Der Halter wird dafür **sortiert** verglichen, und eine Übernahme, deren
  Vorgänger die heutigen Halter sind, verschwindet aus dem Feed: „Maxi, Leo
  und Julian übernehmen" stand über „Vorher gehörte der Rekord Maxi, Julian
  und Leo" — dieselben drei, nur anders sortiert. Der Generator bildet diese
  ID nicht mehr, also kann `_newsTexteAuffrischen` sie auch nicht umschreiben;
  die persistierte Karte bliebe sonst für immer stehen.
  Im Rekord-Blatt steht unter den **Verfolgern**, wer DAHINTER liegt. Teilen
  sich drei den Rekord punktgleich, füllten genau diese drei die Liste, und
  unter „wer sonst noch vorne steht" standen dieselben Namen mit derselben
  Zahl, die der Kopf zwei Zeilen darüber schon nennt. Das
  Ausbauen ist die schwächste davon und deshalb gedeckelt und an eine
  Bedingung geknüpft: gemeldet wird nur, wenn sich die **angezeigte** Zahl
  ändert. Ein Anteil rückt an fast jedem Spieltag um ein Tausendstel weiter,
  und das ergab neun Karten „X baut seinen Rekord aus" an einem Morgen, auf
  denen dieselbe Zahl stand wie vorher. Schattenseiten meldet der Feed gar
  nicht — die Liga liest ihn gemeinsam.
  Die Monatschronik ist EINE Karte je Monat, nicht eine je Eintrag; die drei
  mit den meisten Einträgen bekommen ihr Gesicht. Dazu eine eigene Karte für
  jeden, der **zum ersten Mal überhaupt** in der Chronik steht — der Moment,
  den ein Spieler aus der unteren Hälfte sonst nie im Feed sieht.

  **Breaking ist das Seltenste, nicht das Lauteste.** Erlaubt sind allein:
  ein legendäres Badge, ein neuer Allzeit-Elo-Rekord, die längste
  Siegesserie aller Zeiten, ein neuer Spitzenreiter, der feststehende
  Meister, ein zum ersten Mal vergebener Liga-Rekord und die beiden obersten
  Insignium-Stufen [§C30]. Gefallen ist `season_endgame`: „Noch fünf Tage"
  ist ein Countdown, kein Ereignis — und stand zeitweise als einzige
  Breaking-Karte im Feed.
  **Eine Karte über einen Spieler soll ihn belohnen.** „Henry gewinnt 39 %
  seiner Spiele" stand als Nachricht da und sagte ihrem Helden, dass er
  unterdurchschnittlich ist. Gesucht wird stattdessen die Kennzahl, in der
  er am weitesten vorne steht, und genannt wird sein Platz darin. Aus
  demselben Grund zieht die Duo-Karte aus dem vorderen Drittel: „Eingespielt:
  Martin & Stefan" stand über einem Paar auf Platz 24 von 24.

  **Eine Karte sagt, was zu tun ist.** „Jane liegt ‚Das Sonntagskind' am
  nächsten" nannte weder, worum es geht, noch was dafür verlangt ist: darunter
  stand allein „Leon hält den Bestwert". Wer ein Ziel zeigt, nennt die
  Bedingung aus dem Katalog, den Stand des Halters und den Gewinn.

  **Was zwei Leute miteinander zu tun haben, sagt der Story-Typ** und nicht die
  Kartenform (`_ndBeziehung`). Unter zwei Wappen stand „als Duo", sobald eine
  Karte genau zwei Leute zeigte: bei „Martin schlägt Leo im Spitzenspiel"
  standen sich die beiden gegenüber, bei „Johannes und Stefan bewegen die
  Ewige Tafel" holte jeder einen eigenen Rekord. Ein Duo sind nur die beiden
  Duo-Serien; alles andere nennt seine eigene Beziehung.

  **Das Blatt erklärt nicht die App.** Unter dem Spieler des Tages stand
  „Gewertet wird der Spieltag ab drei Partien. Die Karte kommt um 23:59, wenn
  keine Partie mehr dazukommen kann", unter einer Insignium-Stufe „deshalb ist
  diese Karte Breaking [§C30]". Das ist die Bauanleitung des Feeds samt
  Paragraph, nicht die Nachricht. Wer ein Blatt öffnet, will wissen, was
  passiert ist.

  **Die Wochenkarte zeigt alle sechs Wertungen**, und das Team der Woche steht
  direkt unter dem Spieler der Woche. Sie zeigte drei und darunter „und 3
  weitere Wertungen": die Überraschung, der Krimi und das Team der Woche kamen
  auf der Karte gar nicht vor, obwohl sie einmal je Woche erscheint und für
  nichts anderes da ist. Die Reihenfolge ist die Wertigkeit, nicht die, in der
  die sechs Blöcke im Generator stehen — das Team entstand als letztes und
  stand damit auch als letztes.

  **Kein Listentrenner im Fließtext** (`_evSatz`). Ein Beleg wie „20 % aller
  25 Siege endeten 10:9 · 5" ist für eine Zelle gebaut: der Mittelpunkt trennt
  dort zwei Spalten. Mitten in einem Satz steht er wie ein Tippfehler, und
  danach ging es klein weiter — „… gewonnen · 9. sonst hält ihn niemand."
  Neun der fünfunddreißig Belege endeten außerdem auf einer blanken Zahl, die
  nicht sagte, was sie zählt.

  **Wo ein Rückblick existiert, führt die Karte hin.** `showPotwRecap` und
  `showPotdRecap` sind gebaut und öffnen sich am richtigen Tag von selbst —
  vom Feed aus gab es keinen Weg dorthin, und wer die Karte drei Tage später
  las, kam an die Auswertung nicht mehr heran. Spieler der Woche, Spieler
  des Tages und Team der Woche tragen deshalb einen Knopf ins Blatt.
  Das **Team der Woche** rechnet mit `teamStatsFromMatches` — derselben
  Funktion, aus der auch der Teams-Tab seine Zahlen zieht [§C27]. Es gab
  Team-SERIEN und ein Team der Saison, aber nichts dazwischen. Für den TAG
  gibt es bewusst keins: eine Duo-Karte an jedem Spieltag wäre die
  Wiederholung, die §C33 gerade verhindert.
  `tests/ambient` misst das alles.
- **§C38 Die Chronik gehört nicht nur den besten Drei.** Wer eine Quote
  gewinnt, gewinnt fast jede: gemessen gingen sechzig Prozent der
  Monatseinträge an die besten Drei der Siegquote, und der Monatserste allein
  hielt ein Drittel der Tafel. Ein Eintrag für die Mitte des Feldes misst
  deshalb nicht das Niveau, sondern den **Abstand zum eigenen** — so wie „Das
  Übersoll", das jeder erreichen kann. „Auf Augenhöhe" vergleicht die Quote in
  den Partien, die die Elo-Rechnung offen sah, mit der eigenen Gesamtquote;
  „Die Steigerung" die zweite Hälfte der Spieltage mit der ersten; „Der
  Sonntagsschuss" ist eine einzige Partie, in der die Rechnung dagegen stand.
  Gemessen stehen ihre Halter im Mittel jenseits des ersten Drittels, und der
  Anteil der Einträge an die besten Drei fiel von sechzig auf fünfundfünfzig
  Prozent. `tests/disziplinen` fällt, wenn eine davon wieder an die Spitze
  geht.
- **§C39 Die Monatschronik fragt nicht, wer der Beste ist.** Der alte
  Monatskatalog maß fast überall das Können, und wer eine Quote gewinnt,
  gewinnt fast jede. Er ist vollständig ersetzt: einundvierzig Chroniken, die
  nach der **Abweichung von der Erwartung** fragen, nach **Konstanz**, nach
  dem **Verhältnis zum Ligamittel** desselben Monats, zu einem **bestimmten
  anderen Spieler** oder nach einem **seltenen Einzelereignis**. Die
  Liga-Rekorde der Ewigen Tafel sind davon unberührt; drei Disziplinen tragen
  beide Zeitachsen (`spotless`, `evenkeel`, `drought`), weil dieselbe Frage
  auf zwei Zeitachsen in EINE Disziplin gehört [§13.1].
  **Das Stichproben-Tor ist niedrig und für alle gleich:** acht Partien im
  Monat, fünf in einer Teilmenge (`ST_TEIL`), drei Spieltage. Der alte
  Katalog verlangte 15, 20 oder 25 Partien, und damit hing die Chronik an der
  Spielzahl statt an der Leistung. Die Besonderheit steckt in der Schwelle,
  nicht im Tor: wer zehn Partien spielt und acht klar gewinnt, steht in
  derselben Wertung wie jemand mit sechzig.
  Jede `monat`-Wertung trägt drei feste Angaben. **`art`** ist
  `koennen`, `konstanz`, `fuegung` oder `schatten` und sagt, wofür die Chronik
  steht. **`klasse`** ist `legendaer`, `selten` oder `besonders` und sagt, wie
  oft ihre Bedingung in der Ligageschichte erfüllt sein darf — einmal,
  zweimal, dreimal. **`aus`** ist der Ausschlag der Schwelle: wie weit sie vom
  Schnitt aller liegt, die in dieser Disziplin je gewertet wurden, in
  Standardabweichungen.
  **Der Ausschlag trägt das Prestige**, nicht die Seltenheit:
  `PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] × aus + PRESTIGE_SELTEN[klasse]`,
  gerundet auf fünf. Gemessen liegt der Median-Ausschlag bei 2,17 für
  legendäre, 1,79 für seltene und 1,71 für besondere Chroniken — die Klasse
  trennt also kaum und darf den Wert nicht tragen. „Der Kontrast" ist die
  seltenste Sache im Katalog und trotzdem nur ein Umstand [§C35]. Den Sockel
  bekommt jede Chronik außer einer Schattenseite: einen Monatseintrag zu
  halten ist an sich etwas Besonderes.
  Gerechnet wird mit dem Ausschlag der **Schwelle**, nicht dem des Halters.
  Der Schwellen-Ausschlag ist eine feste Eigenschaft der Chronik; der eines
  Werts gehörte einem einzelnen Halter und wanderte, sobald neue Monate die
  Verteilung verschieben — dann sänke das Prestige aller bisherigen Halter,
  und genau dieser Fehler steckte schon einmal in den Auszeichnungen [§C34].
  Art, Klasse und Ausschlag werden **einmal an den Daten geprüft und dann
  festgeschrieben**, genau wie `BADGE_RARITY`.
  Zwei Regeln räumen den Katalog, und beide sind gemessen: eine Chronik muss
  ihre Schwelle **mindestens 1,5 σ** hinausschieben können, sonst liegt ihr
  Bester kaum weiter draußen als der Durchschnitt; und sie muss eine
  **Leistung** messen — Breite und Anwesenheit zählen nicht, „mit wie vielen
  anderen jemand gespielt hat" ist ein Kalender. Reine **Zählungen von
  Gelegenheiten** fallen ebenfalls weg: wer mehr spielt, bekommt mehr Chancen
  auf ein 10:0 oder eine lange Serie. Die Anteilsformen derselben Fragen
  bleiben.
  Drei Schwellen sind **vorgegeben und werden nicht kalibriert**: „Der
  Tagesregent" verlangt Player of the Day an 60 % der eigenen Spieltage, „Die
  Wochenkrone" Player of the Week in JEDER eigenen Woche, „Auf dem Thron" den
  zweiten Platz der Liga an jedem Spieltag des Monats. Player of the Week
  kommt dabei aus `_periodWinnerMap`, damit Chronik und Auszeichnung nicht
  auseinanderlaufen [§C27]; die Tabelle kommt aus der Elo-Bahn von
  `getGlobalSim` (`_thronDerLiga`), aus demselben Grund — selbst aus den
  Deltas aufsummiert nennt eine zweite Rechnung irgendwann einen anderen
  Ersten als der Liga-Tab, weil die Simulation die Elo an jeder Monatsgrenze
  zurückdreht.
  **„Auf dem Thron" zählt jeden Spieltag des Monats, auch einen ohne eigene
  Partie.** Die Tabelle fragt nicht, wer dabei war, und wer aussetzt, kann
  überholt werden — damit hängt die Wertung nicht an der Zahl der eigenen
  Auftritte. Vor der ersten eigenen Partie des Monats steht niemand in der
  Monatstabelle; solche Tage zählen nicht mit, sonst trüge jeder, der später
  einsteigt, von vornherein den schlechtesten Platz. Sie ist die Chronik für
  den, der nie ausschlägt und trotzdem jeden Monat oben steht: gemessen ist
  Leons August in keiner einzigen Rate der Liga die Nummer eins — 90 Partien
  ziehen jede Rate zur Mitte —, und die Tabelle hat er trotzdem nie aus der
  Hand gegeben.

  **Die Klasse ist zu sehen, nicht nur zu berechnen.** Von den vier Angaben,
  die den Wert einer Chronik bestimmen, stand keine einzige in der App: wer
  ein Chronik-Blatt öffnete, sah die Bedingung und sonst nichts. Jetzt trägt
  die Zelle der Matrix und die des Profilstreifens die Klasse als **Gewicht**
  (`data-kl`, dieselbe Farbe in drei Stärken — keine neue Farbe, das
  Farbgesetz kennt vier Rollen [§C25]), die Plakette nennt sie in Worten
  (`CHRONIK_KLASSE_NAME`, Metall — sie zeichnet niemanden aus), und das
  Chronik-Blatt zeigt Klasse, Art, Ausschlag und Prestige als Zahlenreihe —
  `rcpZahlenHtml`, das Bauteil der Rückblicke [§C27]. In der Laufbahn stand
  neben einem Monatseintrag „Leistung", die Art der DISZIPLIN; den Wert trägt
  `monat.art`, also steht dort jetzt „Konstanz" oder „Können".
  **Die Zeilen der Matrix ordnet das Prestige**, dann die Zahl der Einträge,
  dann der Name. Nach der Zahl allein stand ein Monat mit drei billigen
  Einträgen über einem mit einer legendären Chronik — und seit die Chroniken
  nach ihrem Ausschlag verschieden viel wert sind, ist die Zahl gar keine
  Ordnung mehr.
  **Ein Kürzel ist ein ganzes Wort und passt in die Zelle.** Fünf endeten auf
  einem Punkt („Punktland.", „Angstgegn."), drei liefen über die 54 px der
  Zelle. Gezählt wird dafür nicht in Zeichen — „Umschwung" ist kürzer als
  „Nachzügler" und breiter —, sondern die gerenderte Breite in `tests/blatt`;
  `scrollWidth` taugt nicht, er rundet auf ganze Pixel, und „Augenhöhe" ragte
  um ein Viertel Pixel heraus.
  **Die Rohsicht liegt in der Engine.** `_seasonTitleCtx` legt je Spieler
  `partien` an (jede Partie aus seiner Sicht, in Spielreihenfolge) und daraus
  `tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`. Die Chroniken fragen nach
  dem schwächsten Spieltag, der schwächsten Woche, dem unangenehmsten Gegner;
  solche Fragen lassen sich nicht in vierzig Zähler auflösen, ohne für jede
  neue Frage einen neuen Zähler zu erfinden.

- **§C32 Ein Chronik-Eintrag gehört dem, der ihn hält.** Jeder Monatseintrag
  geht an den, der den Bestwert in diesem Monat wirklich hält — oder an
  niemanden. Halten ihn mehrere punktgleich, tragen ihn alle. Genau wie bei
  den Allzeit-Rekorden, und aus demselben Grund.
  Dass ein Spieler in der Chronik-Matrix trotzdem nur EINEN Eintrag je Monat
  zeigt, ist eine reine **Anzeige**-Regel: `seasonTitleOf` liefert den ersten
  in Katalogreihenfolge, und die Katalogreihenfolge ist die Wertigkeit. Die
  volle Tafel (`showSeasonTable`) zeigt alles.
  Vorher galt „ein Eintrag je Spieler" schon bei der Vergabe: wer den
  Bestwert hielt und schon etwas trug, gab ihn an den Nächstbesten ab. Damit
  stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während einer mit
  dreizehn danebensaß — und in den echten Daten ging ein Drittel aller
  Einträge an jemanden, der nicht der Beste war. Deshalb gibt es die
  Markierung `strict` nicht mehr: sie galt für vier von siebenundzwanzig
  Einträgen, und was für vier richtig ist, ist für alle richtig.
  Ein Monat unter `CHRONIK_MIN_TAGE` Spieltagen bekommt **gar keine**
  Chronik: aus drei Abenden lässt sich kein Monat ablesen.
  **Eine Monatswertung trifft in vier Monaten höchstens zweimal zu.** Die
  Schwellen (`ab` in `_stWertung`) sind an den echten Partien geeicht, nicht
  geschätzt. Vorher lagen sie so tief, dass ein Monat vierundzwanzig der
  vierunddreißig Wertungen vergab und ein einzelner Spieler neun davon trug:
  was fast jeder Monat hergibt, zeichnet niemanden mehr aus. Jetzt sind es
  siebzehn bis zweiundzwanzig, und jede steht für eine Leistung, die es in
  der Ligageschichte erst ein- oder zweimal gab. `tests/disziplinen` zählt
  es nach und nennt die Wertung, deren Schwelle zu tief hängt.
- **§C31 Drei Rückblicke, ein Baukasten.** Saison, Woche und Tag bauen aus
  denselben Teilen (`05b-recap-teile.js`): `rcpKopfHtml`, `rcpHeldHtml`,
  `rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`,
  `rcpAbschnitt`. Wo die App das Bauteil schon hat, wird es benutzt [§C27]:
  das Podest des Saison-Rückblicks ist `.podest`/`.pod-karte` wie in der
  Ewigen Tafel, seine Rangliste ist `.rrow` wie im Liga-Tab.
  **Ein Gold je Blatt.** Die Marke im Kopf und der Sieger — sonst nichts.
  Kacheln und Zeilen sind Metall, Rot bleibt der Richtung [§C25]. Als acht
  Kacheln golden umrandet waren, sagte Gold nichts mehr, und der Sieger
  stach aus nichts mehr heraus.
  Der Saison-Rückblick hat **keine** Heldenkarte: das Podest IST der Held,
  eine Karte darüber sagte dasselbe ein zweites Mal. `rcpHeldHtml` gehört
  Woche und Tag; dort hat der Held kein Banner, weil eine Ligaposition mit
  einer Woche nichts zu tun hat.
  Ein Rückblick zeigt den Stand von DAMALS: `insigniumSvg` nimmt dafür
  `opt.titel` und `opt.pos` entgegen. Der Reif bleibt der heutige — die
  Laufbahn ist eine Karriere und kein Monat.
  Gestaltung gehört ins CSS: ein `style`-Attribut trägt einen berechneten
  Wert (Avatarfarbe, `--rav`, Farbton), nie ein ganzes Bauteil. Vorher
  standen Wochen- und Tages-Rückblick zu großen Teilen als Inline-Style im
  JavaScript, und derselbe Spieler sah in drei Rückblicken dreimal anders
  aus. `tests/tafel` misst beides.
- **§C30 Fünf Stufen, fünf Gegenstände.** Das Insignium hat fünf Stufen
  (`INSIGNIEN`), jede kostet doppelt so viel wie die vorige — 240, 720,
  1680, 3600 —, und jede ist ein eigener GEGENSTAND:
  **Reif** (das blanke Band, ab Grad II mit runden Nieten und einem zweiten
  Ring nach innen) · **Schildring** (Kartuschen quer auf dem Band, durch
  erhabene Stege zu einer Kette verbunden) · **Volutenkranz** (gespiegelte
  Schneckenpaare auf dem Reif, ein Stein am Ansatz, eine Perle im Auge) ·
  **Lorbeerreif** (zwei Zweige, unten zusammenlaufend, oben offen) ·
  **Ordensstern** (eine Glorie feiner Strahlen auf eigenem Kranzring, vier
  Bündel auf den Diagonalen, Steine, Perlenkranz, darüber die Krone).
  Zwischen zwei Schwellen liegen drei Grade (`INSIGNIUM_GRADE`, ausgebaut
  in `INSIGNIUM_AUSBAU`); der Grad baut den Gegenstand aus, die Stufe
  wechselt ihn.
  Vorher waren drei der fünf Stufen dasselbe Bild in anderer Dichte: acht,
  zwölf, sechzehn Zacken auf einem Kreis. Damit lässt sich keine Leiter
  erzählen — und **kein Körper läuft mehr spitz aus**. Wo doch etwas
  zuläuft, sitzt eine Perle darauf: die Zacken der Krone.
  **Oben und unten bleibt ein Platz frei.** Unten die Raute mit der
  Ligaposition (nur mit Band — in der Liste sitzen dort die Titelsterne
  [§C26]), oben der Kopf: ein Stein im Schildring, ab dem Volutenkranz die
  **Lilie**, im Ordensstern die **Krone**. Der Kopf sagt auf einen Blick,
  in welcher Hälfte der Leiter jemand steht. Deshalb steht in keiner Stufe
  ein Körper auf zwölf oder auf sechs Uhr.
  Der Kopf gehört zum Zeichen, die Sterne nicht: sie stehen in einem eigenen
  **Streifen darüber**, auf Radius 72, und die Bandbox reicht dafür sieben
  Einheiten weiter nach oben, als das Zeichen selbst braucht. Das größte
  Zeichen — die Glorie des Ordenssterns — füllt eine Scheibe von 65,6, also
  bleibt zwischen beiden Luft. Das kostet 4,9 % der Kachelhöhe nach oben,
  weniger als jede Karte dort an Innenabstand hat.
  **Jeder Körper hat zwei Flächen an einer harten Kante** — eine helle
  Hälfte, eine dunkle, dazu ein Lichtsteg auf dem Grat. Die Trennkante
  läuft immer durch die Achse des Körpers; schräg gelegt sähe jeder Körper
  aus, als stünde er anders im Licht als sein Nachbar.
  Unter dem Reif liegt die **Unterlage** — ein weicher Schatten, der ihn auf
  die Schwinge setzt. Sie muss über den ganzen Schmuck reichen, sonst laufen
  goldene Ranken und silberne Strahlen ineinander; sie ist deshalb eine
  ELLIPSE. Als Kreis mit demselben Radius ragte sie unten aus der Bandbox,
  und im Profilkopf stand quer unter dem Zeichen eine gerade Kante.
  **Die Verläufe gehören dem Dokument, nicht dem Zeichen.** Sie hängen nur am
  Metall des Rangs und am Glanz der Schwinge — nicht am Spieler, nicht an der
  Stufe. Sie stehen deshalb einmal in einem unsichtbaren `<svg id="insDefs">`
  am Rumpf der Seite, und jedes Wappen verweist nur darauf. Vorher trug jedes
  Wappen seine zwölf Gradienten selbst: das waren rund sechzig der
  siebenundneunzig Knoten eines Zeichens und im Awards-Tab 312 Gradienten für
  ein knappes Dutzend verschiedener Sätze. Der Topf steht **außerhalb von
  `#app` und des Blatts** — darin nähme ihn das nächste `render()` mit, und
  ein Verweis auf einen Verlauf, den es nicht gibt, wirft keinen Fehler: die
  Fläche wird schwarz. `tests/blatt` sieht nach jedem Zeichnen nach.
  Ausgenommen sind `insigniumStufeSvg` und `schwingeStufeSvg`: die elf
  Zeichnungen der Laufbahn tragen ihre Verläufe selbst, damit ein Ergebnis
  für sich steht und sich auch außerhalb des Dokuments rastern lässt — genau
  das tut `tests/zeichen`, wenn es die Leiter nachmisst.
  Dieselbe Zeichnung entsteht nur einmal: gleicher Rang, gleiche Stufe,
  gleiche Titelzahl heißt gleiches Wappen, und das Ergebnis wird gemerkt.

  Gemessen, nicht behauptet: `tests/zeichen` rastert alle fünfzehn
  Zeichnungen und zählt den **Schmuck** — die Bildpunkte, die ein Zeichen
  vom blanken Reif unterscheiden. Von Feld 1 bis 15 fällt er nie, und zwei
  Stufen stehen weiter auseinander als zwei Grade. Reine Deckung taugt
  dafür nicht: eine Niete liegt AUF dem Band und verdeckt keinen Bildpunkt
  zusätzlich, obwohl man sie sieht.
  Der Ordensstern hat keine Grade, er zählt Zacken und hört nicht auf: mit
  jeder Zacke wird die Glorie um vier Strahlen dichter. Länge und Breite
  der Strahlen sind gedeckelt — sonst spränge der Stern aus seiner
  Zeichenfläche.
  Die Laufbahn zeigt die Leiter als Vitrine (`.lb-karus`/`.lb-k`): eine
  Stufe groß in der Mitte, die übrigen schiebt man heran — **oder tippt sie
  an**. Wischen allein hat die letzte Stufe nie erreicht: der Blatt-Zug
  riss jede waagerechte Geste an sich, sobald sie zwölf Pixel nach unten
  driftete. Das ist repariert (`bindSheetSwipe` entscheidet die Richtung
  einmal je Berührung), aber ein Ziel tippt man ohnehin lieber an.
  `tests/blatt` misst beides.
- **§C36 Eine Schwinge, und nur eine.** Die **Rankenschwinge**
  (`INS_SCHWINGE`, `_insRanke`): jeder Stiel rollt sich am Ende zu einer
  Volute ein und trägt einen Knopf im Auge, die Blätter sitzen abwechselnd
  links und rechts, ab fünf Titeln Beeren in den Achseln. Es ist dieselbe
  Linie wie im Volutenkranz — `_insSpiral` zeichnet beide —, nur golden
  und länger. Damit sprechen Insignium und Schwinge dieselbe Sprache und
  sind trotzdem am Werkstoff zu unterscheiden.
  Sechs Ränge, der letzte **ab zehn Titeln**. Danach wächst die Schwinge
  nicht weiter, nur die Zahl neben den fünf Sternen [§C26]: eine Schwinge,
  die immer weiter wächst, sprengt jede Zeile; eine Ziffer kostet nichts.
  Es waren zwei Sternenbögen ab sechs Titeln und drei ab dreizehn. Drei
  Bögen brauchen vierzig Einheiten Luft über dem Zeichen — Platz, den
  neunzehn von zwanzig Spielern nie füllen und der jedem von ihnen die
  Kachel höher macht.
  Der Entwurf greift zweieinhalb Reifradien weit aus. In einer
  Ranglistenzeile misst der Reif 52 px, und ein Zeichen, das dreimal so
  breit ist wie die Zeile hoch, schiebt sich in die Nachbarspalten —
  deshalb nimmt `INS_SCHWINGE_SKALA` das Maß zurück. EIN Faktor, damit die
  Form nicht verzerrt.
  In der Laufbahn stehen ihre sechs Ränge als **zweite Leiter** unter der
  Vitrine (`schwingeStufeSvg`, `.lb-schwingen`): eine Zeile, klein, alle
  sechs in derselben Zeichenfläche (`INS_SCHWINGE_BOX`) — sonst wüchse in
  der Vorschau der Kasten mit und nicht die Schwinge. Klein ist Absicht:
  die Vitrine sammelt man Punkt für Punkt, die Schwinge gewinnt man, und
  zwei gleich laute Leitern auf einer Seite sind keine mehr.
- **§C34 Erworbenes wird addiert, Gehaltenes geteilt.** Das Prestige [§13.8]
  hat drei Quellen und ein Gesetz darüber: wer nichts falsch macht, verliert
  nichts — und wer mehr holt, bekommt mehr, nicht weniger.
  Auszeichnungen zählen nach ihrer Seltenheitsklasse (`PRESTIGE_KLASSE`),
  Monatswertungen nach ihrer Art (`PRESTIGE_MONAT`), beide **voll und
  einzeln addiert**. Nur Liga-Rekorde werden geteilt: durch die Zahl ihrer
  heutigen Halter und danach nach dem Gesetz der fallenden Erträge (der n-te
  zählt 1/√n). Sie sind eine Behauptung über HEUTE und dürfen wechseln.
  Zwei Fehler steckten vorher darin, beide gemessen. Erstens hing der Wert
  einer Auszeichnung an der Zahl ihrer heutigen Halter, und die wächst,
  während die Liga altert: Henry stand im Mai bei 197 Punkten aus
  Auszeichnungen und im August bei 63 — er hatte in der Zwischenzeit welche
  dazugewonnen. Zweitens galt das Stapelgesetz auch für Erworbenes, und dann
  war die fünfte legendäre Auszeichnung ein Viertel der ersten wert: Martin
  bekam für „Meister der Saison" 36,8 Punkte, weil er schon vier andere
  hielt. Beides bestraft genau den, der viel erreicht.
  Wiederholung zählt nur, wo sie etwas heißt: eine **Würde** (`BADGE_WUERDE`
  — höchstens einmal je Saison und am Können gemessen: Meister, Team der
  Saison, Vize, Dominator, Award-Sammler) zählt jedes Mal neu und jedes Mal
  voll, alles andere genau einmal. Der dreißigste Zittersieg zeigt nichts
  Neues; der dritte Meistertitel ist keinen Deut leichter als der erste.
  Weil nichts mehr gestapelt wird, tragen `PRESTIGE_KLASSE`,
  `PRESTIGE_MONAT` und `PRESTIGE_REKORD` die ganze Balance allein. Sie sind
  gegeneinander kalibriert; `tests/disziplinen` spielt die Liga dafür Monat
  für Monat nach.
  Die Seltenheitsklasse (`BADGE_RARITY`) sagt, wie schwer eine Auszeichnung
  zu HOLEN ist. Die Halterzahl ist die Gegenprobe, nicht die Definition: die
  zehn legendären halten null bis fünf der zwölf Spieler, die vierzehn
  seltenen null bis neun, die achtzehn gewöhnlichen sechs bis zwölf. Oben
  überlappen sie, weil eine Würde je Saison neu zu holen ist.
  Gold gehört nicht der Anwesenheit: „Urgestein" (300 Matches) und
  „Siegermaschine" (300 Siege) trugen als legendär denselben goldenen Rahmen
  wie „Meister der Saison", hängen aber an nichts als der Spielzahl. Umgekehrt
  sind „Mauer" und „Player of the Day" selten und nicht gewöhnlich: sie
  belohnen den Vielspieler, aber sie sind besonderer als jedes Common. Wer
  eine Klasse verschiebt, verschiebt Prestige — und zieht `RARITY_META.total`
  mit [§10.1].

- **§C35 Nicht jeder Eintrag darf am Können hängen.** Wer besser spielt,
  gewinnt jede Quote und jede Serie — am Ende liegen alle Liga-Einträge bei
  denselben drei Spielern. Zweiundzwanzig von sechsunddreißig Rekorden
  fragten direkt nach Können, und drei Spieler hielten vierundzwanzig der
  achtunddreißig Haltungen.
  Dagegen steht die Kammer der **Fügungen**: Einträge, die von der Auslosung
  und vom letzten Ball entschieden werden. Sie tragen `zufall` im Katalog,
  stehen als `ereignis` da und wiegen fürs Prestige damit halb so viel wie
  ein Beleg für eine Fähigkeit [§C34] — sie sollen jemandem gehören können,
  nicht jemanden auszeichnen.
  `zufall` sagt zugleich, WIE gemessen wird, und das entscheidet über die
  Zusicherung:
  **`'quote'`** mittelt über eine Laufbahn oder einen Tag („Der schwerste
  Tag", „Die bitterste Pleite", „Der Wiedergänger", „Das Nadelöhr", dazu
  die drei alten). Sie muss erreichbar sein: mindestens die halbe Liga steht
  im Rennen, und vergeben ist sie auch.
  **`'fund'`** ist ein einzelnes Zusammentreffen („Die Punktlandung", „Die
  Achterbahn", „Die kalte Dusche"). Es darf selten sein und sogar unbesetzt
  bleiben — sonst wäre es keins; höchstens die Hälfte der Funde darf leer
  stehen. Eine Quotenschwelle darauf anzuwenden hieße, das Seltene
  abzuschaffen.
  Über beide hinweg gilt: mindestens eine gehört der unteren Hälfte der
  Siegquote, und die drei Besten halten höchstens die Hälfte der Kammer.
  Ohne das hätte man zehn Einträge dazugebaut und nichts verändert.
  Jeder gewertete Spieler trägt mindestens einen Liga-Eintrag.
  `tests/disziplinen` misst das alles nach.
  Was **nicht** in die Kammer gehört: sieben Rekorde, die einen Nachbarn
  doppelten — „Der Vollstrecker" neben „Der Zerstörer", „Der perfekte Abend"
  neben „Der makellose Tag". Dieselbe Frage mit derselben Antwort sammelt
  sich beim selben Halter. Vier von ihnen behalten ihre Monatswertung und
  verlieren nur den Liga-Rekord; drei gibt es nicht mehr.
  Ein anderes **Zeitfenster** ist dagegen eine eigene Frage: „Der Wochenherr"
  steht neben „Der Platzhirsch", weil eine Woche fünf Siege am Stück verlangt
  und ein Spieltag drei — gemessen halten sie zwei verschiedene Spieler.
  Billig dürfen Fügungen trotzdem nicht sein: eine Bestmarke, die jeder
  geschenkt bekommt, ist keine mehr.
  Und gemessen wird überall der **Anteil**, nicht die Anzahl — sonst hält den
  Rekord, wer am meisten spielt. Der Beleg muss das auch sagen: er beginnt
  mit dem Wert, nach dem sortiert wird, und nennt die Anzahl erst dahinter.
  „32 seiner 134 Siege waren Kantersiege" las sich als Bestenliste der
  Anzahl, und das Podest zeigte genau diese 32 über der 10 des Spielers, der
  den höheren Anteil hält.
- **§C37 Ein Anteil misst gegen die Menge, um die es geht.** „Pechvogel"
  zählte knappe Niederlagen gegen ALLE Partien und kürte damit den, der viele
  enge Spiele hatte, statt den, der sie verliert: wer zwanzig Partien spielt,
  davon zwei enge, und beide verliert, stand bei 10 % — hinter jemandem mit
  acht knappen Niederlagen aus vierzig Spielen, der die Hälfte seiner engen
  Partien gewonnen hat. Der Nenner ist die **Teilmenge**: enge Partien beim
  Pechvogel und beim Clutch-Player (beide aus `agg.clutch`, eine Zählung für
  zwei Kacheln [§C27]), enge Partien des Duos bei den Glückspilzen, die
  **Pleiten** des Duos beim Zirkus (dieselbe Frage wie „Der Schadensbegrenzer"
  in der Chronik, also derselbe Nenner), die Partien als Außenseiter beim
  Underdog-Held — der zählte gar keinen Nenner und war damit eine
  Anwesenheitsliste, obwohl sein Zwilling auf Team-Ebene, der Giant Slayer,
  seit jeher die Quote rechnet. Auf der Kachel steht deshalb immer „x von y",
  nicht nur der Anteil: die Stichprobe gehört zur Aussage.

  **Und die Mindestzahlen passen zum Zeitraum** (`AW_MIN`). Die Awards gibt es
  nur noch je Saison und je Woche; die Schwellen stammen aus der Zeit, in der
  es auch „Gesamt" gab. Gemessen spielt ein Duo in einer Woche im Mittel drei
  Partien und über einen ganzen Monat ebenfalls drei — sieben von
  sechsunddreißig Kacheln verlangten zehn gemeinsame Spiele und standen damit
  jede Woche leer. Sie stehen an einer Stelle beisammen, damit sich das nicht
  wieder über die Datei verteilt. Keine steigt über fünf, und `tests/tafel`
  zählt nach, was nach einer vollen Woche noch leer bleibt: erlaubt sind nur
  Ereignisse, die es nicht gab, kein 10:0 heißt kein Showmaster.
- **Detail folgt der Größe.** Unter 26 px weder Sterne noch Feuer, unter
  48 px kein Wappen — darunter bleibt vom Gesicht ein Punkt. Beide Grenzen
  stehen im Code (`znWrap`, `insAvWrap`), nicht nur hier: das Ergebnisband
  zeichnete vier Wappen bei 30 px, und das waren gemessen 225 der 258 Kilobyte
  Markup einer Tafel. Wer aus einem Blatt zurückwischte, sah das als Stocken —
  der Feed wird dabei neu gebaut.
- **Ein Duo hat keinen Rang**, also auch kein Wappen: zwei überlappende
  Chips. (Nebeneffekt: 62 Wappen in einer Duo-Tabelle waren eine
  Viertelmillion Zeichen HTML.)
- **Nichts sagt zweimal dasselbe.** Steht eine Zahl schon in der Tabelle,
  gehört sie nicht noch einmal in eine Karte darüber. Das gilt auch für
  Rechnungen: **wer den Spieltag gewonnen hat, sagt `_periodWinnerMap`** —
  einmal, mit Tiebreak über das Elo-Delta. „Allwetter" und „Tag der Götter"
  rechneten es je Spieler noch einmal nach, ohne den Tiebreak: gemessen sind
  12 der 51 entschiedenen Tage punktgleich, und dort trugen beide Spieler den
  Tag, obwohl beide Beschreibungen „Player of the Day geworden" sagen.
  `tests/disziplinen` rechnet beide gegen die Siegerliste zurück.
- **Keine persönliche Ansprache** in der Oberfläche („du", „meine").
- **Keine Possessivpronomen über einen Spieler.** „42 % seiner Niederlagen"
  heißt „42 % aller Niederlagen". Belege, Bedingungen und Nachrichtentexte
  stehen unter dem Wappen jedes Spielers, und ein Pronomen behauptet dort ein
  Geschlecht, das die Liga nicht kennt. `tests/disziplinen` misst die
  gebauten Belege und Bedingungen nach.
- **Kein „Abend".** Keine der 466 Partien hat nach 18 Uhr angefangen; was
  über einen Spieltag gesagt wird, heißt Tag.
- **Ein leeres Feld liest sich als Fehler.** Nicht vergebene Auszeichnungen
  werden gestrichelt gezeigt, nicht halbdurchsichtig; eine ungerade Kachel
  nimmt die ganze Reihe statt ein Loch zu lassen.

> **Pflegepflicht.** Wird ein Gesetz ergänzt, geändert oder aufgehoben,
> steht das hier — und der Kommentar im Code, der es zitiert, wird
> mitgezogen. Ein Kürzel, das nur noch an einer Stelle steht, ist tot.

---

## 7. Sprache, Ton, Commits

- Oberfläche, Kommentare und Commit-Nachrichten auf **Deutsch**.
- Kommentare erklären das **Warum** und benennen den Fehler, den sie
  verhindern — nicht, was die Zeile tut. Vorbild ist der Bestand.
- Nüchterner Ton, keine Ausrufezeichen, keine Werbesprache.
- Commit-Betreff ist ein Satz, der die Absicht nennt, nicht die Dateiliste
  („Das Feuer soll man sehen", nicht „update css").
- Im Fließtext des Commits steht, was vorher falsch war.
- **Kein Modellname** in Commit-Nachrichten, Code-Kommentaren, PR-Texten
  oder sonstigen Artefakten im Repository.
- Kein `node_modules/` und kein `package-lock.json` einchecken.

---

## 8. Vor dem Anfangen

1. `ARCHITEKTUR.md` lesen.
2. Die Datei, die du ändern willst, **ganz** lesen. Viele Kommentare halten
   Entscheidungen fest, die schon einmal rückgängig gemacht wurden.
3. Prüfen, ob es das Bauteil schon gibt (§C27), bevor du ein neues baust.
4. `node tools/check.mjs` einmal laufen lassen, bevor du etwas änderst —
   dann weißt du, ob ein rotes Ergebnis von dir kommt.

---

## 9. Arbeit mit mehreren Agenten

Die App ist eine IIFE mit gemeinsamem Namensraum, und der Bauablauf schreibt
in zwei Dateien, die allen gehören. Parallele Arbeit ist deshalb möglich,
aber nur nach festen Regeln.

### 9.1 Rollen

- **Ein Koordinator.** Nur er committet, pusht, schreibt `CLAUDE.md`,
  `ARCHITEKTUR.md` und führt den Bauablauf aus §1 aus.
- **Beliebig viele Zuarbeiter.** Sie lesen, suchen, messen, schlagen
  Änderungen vor und dürfen `src/`-Dateien bearbeiten, die ihnen **exklusiv**
  zugewiesen sind.

### 9.2 Was ein Zuarbeiter nie tut

- `tools/build.mjs` ausführen. Der Build schreibt `dist/index.html`; zwei
  gleichzeitige Läufe erzeugen eine Datei, die zu keinem Quellstand passt.
- `index.html` anfassen — auch nicht mit `cp`.
- `CLAUDE.md` oder `ARCHITEKTUR.md` schreiben. Er **meldet** stattdessen
  seinen Änderungsvorschlag als Text an den Koordinator (siehe 9.5).
- Committen oder pushen.
- Eine Datei bearbeiten, die einem anderen Zuarbeiter zugewiesen ist.

### 9.3 Aufteilung, die funktioniert

Schneide Aufgaben **entlang der Dateigrenzen**, nicht entlang der Features —
ein Feature liegt fast immer in mehreren Dateien, und zwei Agenten in
derselben Datei erzeugen Konflikte, die niemand sieht, bis der Build läuft.

Vor dem Start nennt der Koordinator je Zuarbeiter ausdrücklich:
die Dateien, die er ändern darf; die Dateien, die er nur lesen darf; und die
Zusicherung, an der seine Arbeit gemessen wird.

Zwei Dinge lassen sich nicht aufteilen und bleiben beim Koordinator:
**neue Bezeichner auf oberster Ebene** (Wächter 4 sieht nur das Ganze) und
**Änderungen an der CSS-Reihenfolge**.

### 9.4 Zusammenführen

Der Koordinator führt nach jeder Runde den vollständigen Ablauf aus §1 aus.
Er ist der einzige, der weiß, ob das Ganze noch stimmt: ein Zuarbeiter kann
seine Datei für sich fehlerfrei halten und trotzdem einen Namen doppelt
vergeben oder eine Klammer offen lassen.

Bei Rot wird **nicht** der Test angepasst, sondern der Zuarbeiter mit dem
Befund zurückgeschickt.

### 9.5 Meldepflicht für diese Datei

Jeder Zuarbeiter beendet seinen Bericht mit einem der beiden Sätze:

- `CLAUDE.md: keine Änderung nötig.`
- `CLAUDE.md: <Abschnitt> — <was genau geändert werden muss>.`

Der Koordinator arbeitet diese Meldungen ab, **bevor** er committet. Ein
Bericht ohne einen dieser beiden Sätze gilt als unvollständig und wird
zurückgegeben.

## 10. Etwas hinzufügen — und was daran hängt

Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. Sie
sind die **drei Quellen des Prestiges** [§C34], und das Prestige ist die
Insignium-Leiter. Wer einen Eintrag hinzufügt oder streicht, verschiebt
damit, wer welches Zeichen trägt — auch dann, wenn er die Prestige-Datei gar
nicht geöffnet hat.

Die folgenden Listen nennen jede Stelle, die mitgeht. Sie sind vollständig:
was hier nicht steht, hängt auch nicht daran.

### 10.1 Eine Auszeichnung (Badge)

Alles in `17-badges.js`, außer wo anders genannt.

| Stelle | was | wenn es fehlt |
|---|---|---|
| `BADGES[]` | Eintrag mit `id`, `ic`, `name`, `desc`, `count` | — |
| `BADGE_RARITY` | die Klasse | `rarityOf` liefert still `common`, die billigste — das Badge ist als „Legendary" gedacht und zählt wie ein Zittersieg |
| `RARITY_META.<klasse>.total` | um eins nach | der Zähler im Badge-Blatt („38 von 50") lügt |
| `BADGE_ART` | `leistung`, `pensum` oder `schatten` | es gilt `ereignis` — die Vorgabe, und für die meisten richtig |
| `BADGE_WUERDE` | **nur**, wenn höchstens einmal je Saison zu holen **und** am Können gemessen | nichts; wer aber eine beliebig oft holbare Auszeichnung einträgt, macht das Prestige wieder zur Anwesenheitsliste [§C34] |
| `getBadgeEarnedCache` | `fire('id')` | das Badge erscheint nur im Profil: kein Toast, kein Chip im Match-Review |
| `src/js/02-icons.js` | das Icon aus `ic` | die Kachel bleibt leer |

Die Reihenfolge in `BADGES[]` ist die Anzeige-Reihenfolge im zweispaltigen
Raster — je zwei Einträge sind eine Zeile.

### 10.2 Eine Disziplin (Monatswertung, Liga-Rekord oder beides)

| Stelle | was | wenn es fehlt |
|---|---|---|
| `32-chronik-katalog.js` `DISZIPLINEN[]` | Eintrag **im richtigen Block**: Leistung, dann Ereignis, dann Schatten | ein Spieler zeigt nur EINEN Monatseintrag, und die Katalogreihenfolge entscheidet welchen [§C32] — falsch einsortiert verdrängt eine Schattenseite seinen Titel |
| dort `art` | `leistung`, `ereignis` oder `schatten` — `pensum` gibt es nur bei Auszeichnungen | steuert bei einem Liga-Rekord den Prestige-Wert und bei jedem Eintrag die Katalogreihenfolge; ohne gültige Angabe fällt der Eintrag auf `ereignis` und wiegt die Hälfte. Den Wert einer Monatschronik trägt dagegen `monat.art` [§C39]. `tests/disziplinen` misst es |
| dort `short` | ein ganzes Wort, das in 54 px passt | „Umschwung“ ist kürzer als „Nachzügler“ und breiter, also zählt die gerenderte Breite: `tests/blatt` misst sie am Markup, `tests/disziplinen` verbietet die Abkürzung mit Punkt |
| dort `ic` | ein Icon, das keine andere Disziplin trägt | in einer Zelle von 62 Pixeln ist die Zeichnung das Erste, was man sieht — zwei gleiche sind dort nicht zu unterscheiden. `tests/disziplinen` misst es |
| dort `monat.wie` | ein Satz, was die Zahl im Beleg bedeutet | nur nötig, wenn die Größe nicht selbsterklärend ist. Er steht im Detail-Blatt unter der Bedingung; ohne ihn liest sich „+15 Prozentpunkte" wie Elo oder wie Prestige |
| dort `monat.art`, `monat.klasse`, `monat.aus` | die drei festen Angaben einer Chronik [§C39] | ohne `art` gibt es kein Prestige, ohne `klasse` keine Schwellen-Regel, ohne `aus` ist die Chronik null Punkte wert |
| dort `monat` | `mind`, `wert`, `ab` und `ev` über `_stWertung` | ohne die vier gibt es keine Vergabe. `mind` sagt, wer gewertet wird, `wert` die Größe (größer ist besser, bei einer Schattenseite steht ein Minus davor), `ab` die Schwelle. Getrennt aufgeschrieben, weil sonst niemand sagen kann, wer knapp daneben liegt: wer die Schwelle reißt, bekam einen leeren Wert, und leere Werte haben keine Reihenfolge. `ab` wird an den echten Partien gemessen, nicht geschätzt: höchstens zweimal in vier Monaten erfüllt [§C32] |
| `33-chronik-engine.js` `_seasonTitleCtx` | das Feld, das `monat:` liest | die Monatstafel bleibt leer |
| `34-chronik-rekorde.js` `_chronicleCtx` | **dasselbe Feld noch einmal** | der häufigste Fehler: die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt unbesetzt. Zwei getrennte Durchläufe über dieselbe Frage — sie müssen gleich zählen |
| dort `negativ` | `true`, **nur** wenn die Fügung von einer Niederlage erzählt | sie steht im Profil golden zwischen den Titeln und wird als Rekord mitgezählt [§C25]. Eine `art:'schatten'`-Disziplin braucht das Feld nicht — sie ist ohnehin negativ |
| dort `zufall` | `'quote'` oder `'fund'`, **nur** wenn der Eintrag kein Können misst | ohne ihn steht die Fügung in der Kammer „Bestmarken" neben dem höchsten Elo-Stand der Ligageschichte. Der Wert entscheidet, welche Zusicherung in `tests/disziplinen` für ihn gilt [§C35] |
| `allzeit.wie` | ein Satz, was die Zahl bedeutet | nur nötig, wenn die Größe nicht selbsterklärend ist. Er steht im Rekord-Blatt unter der Bedingung; ohne ihn liest sich „27 %" wie eine Siegquote |
| `allzeit.ev` | beginnt mit dem Wert, **nach dem sortiert wird** — die Anzahl steht dahinter | Podest und Verfolgerliste zeigen die erste Zahl des Belegs. Beginnt er mit der Anzahl, steht dort „34" über „10", obwohl der mit 10 den höheren Anteil hält. `tests/disziplinen` rechnet die erste Zahl gegen den Sortierwert zurück und lässt nur eine Umrechnung davon gelten |
| `src/js/02-icons.js` | das Icon aus `ic` | die Zeile bleibt ohne Zeichen |

Ein Eintrag darf **nur `allzeit`** haben, wenn ein Monat zu kurz ist, um die
Größe zu messen — so wie der Positionswert, der Erfahrung mitwiegt: über vier
Wochen entschiede die Spielzahl statt der Leistung. Dann entfällt der Eintrag
in `_seasonTitleCtx`, sonst nichts.

**Misst ein Eintrag etwas, das eine Ansicht schon zeigt, rechnet er es nicht
nach.** Der Positionswert steht an EINER Stelle (`posWert`, [§5.2]) und wird
von der Positions-Rangliste und vom Liga-Rekord darauf benutzt. Zwei
Rechnungen über dieselbe Frage nennen irgendwann zwei verschiedene Beste, und
dann steht in der Chronik ein anderer Name als über der Liste, auf der er ihn
geholt hat. `tests/disziplinen` legt beide nebeneinander.

Eine Disziplin zu **streichen** verändert nur die Zukunft: abgeschlossene
Monate stehen vollständig eingefroren in `seasons.titles` und zeigen weiter,
was damals galt.

Soll der Eintrag ausdrücklich kein Können messen, gilt zusätzlich §C35 — er
wird `ereignis`, und beide Bedingungen dort werden nachgemessen.

### 10.3 Die Balance nachziehen

Der Teil, den man vergisst. Ein neuer Eintrag ist neues Prestige für jeden,
der ihn hält — und für sonst niemanden.

1. **Die Seltenheitsklasse ist eine Messung, keine Absicht.** Sie behauptet,
   wie viele der Spieler das Badge halten [§C34]. Erst zählen, dann
   eintragen: ein „Legendary", das neun von zwölf tragen, ist die teuerste
   Klasse für den häufigsten Eintrag.
2. **`PRESTIGE_KLASSE`, `PRESTIGE_MONAT`, `PRESTIGE_REKORD` bleiben, solange
   das Verhältnis der drei Quellen stimmt.** Sie sind gegeneinander
   kalibriert; wer an einer dreht, dreht an allen dreien.
3. **Die Schwellen in `INSIGNIEN` folgen der Verdopplungsregel** [§C30].
   Kommen viele Einträge dazu, wandert die Spitze nach oben — dann steigen
   die Schwellen, nicht die Erwartung.

Nichts davon wird geschätzt. `tests/disziplinen` misst es an den echten
Partien und fällt, wenn es kippt:

| Zusicherung | fällt, wenn |
|---|---|
| kein Block stellt mehr als die Hälfte des Prestiges | eine Quelle die anderen erdrückt |
| Auszeichnungen wiegen schwerer als Rekorde | der Reif zur Rekordanzeige wird |
| mehr als die halbe Liga hält einen wertenden Rekord | die Einstiegshürden zu hoch sind |
| mehr als die halbe Liga trägt mindestens den Schildring | die erste Sprosse zu hoch hängt |
| der Beste trägt noch keinen Lorbeerreif | der Katalog die Spitze nach oben schiebt |
| der Ordensstern ist von niemandem erreicht | dasselbe, eine Stufe höher |
| jede Stufe kostet mindestens das Doppelte der vorigen | die Verdopplungsregel still aufgegeben wird |
| Prestige aus Auszeichnungen und Monaten fällt nie | ein Wert wieder am heutigen Zensus hängt [§C34] |
| jede Klasse zählt so viele Badges wie `RARITY_META` behauptet | ein Badge dazukommt oder wegfällt und der Zähler stehen bleibt |

Ein roter Wert dieser Art ist eine **Antwort**, keine Störung: er nennt die
Zahl, die nachgezogen werden muss. Angepasst wird die Zusicherung nur, wenn
sich die Absicht geändert hat — nicht, damit sie wieder grün ist.

---

## Pflege dieser Datei

Diese Datei ist die erste, die eine neue Sitzung liest. Was hier falsch
steht, wird geglaubt — eine veraltete Arbeitsanweisung ist schlimmer als
keine.

### Wann sie geändert wird

Immer im **selben Commit** wie die Änderung, die sie auslöst:

| Auslöser | zu ändern |
|---|---|
| Datei in `src/` kommt dazu, fällt weg, wird umbenannt | §2 Baum, §3 Landkarte |
| Schritt im Bauablauf kommt dazu oder fällt weg | §1 |
| Wächter kommt dazu oder ändert seine Bedeutung | §4 |
| Datei in `src/js/` kommt dazu | §3 Landkarte — Wächter 6 besteht darauf |
| Testsuite kommt dazu; Zahl der Checks ändert sich | §5 Tabelle |
| Zahl der Bezeichner ändert sich | §2, letzter Absatz |
| Gestaltungsgesetz kommt dazu, ändert sich, fällt weg | §6 |
| Zustandsvariable kommt dazu oder ändert ihr Zurücksetzen | §3 Zustand |
| Zeitgeber kommt dazu oder ändert seine Bedingung | §3 Takt |
| Gemeinsames Bauteil kommt dazu (`.rav`, `.podest`, …) | §6 §C27 |
| Regel für Agenten ändert sich | §9 |
| Auszeichnung, Disziplin oder Prestige-Konstante ändert sich | §10 |
| Monatschronik kommt dazu oder ändert Art, Klasse oder Ausschlag | §6 §C39, §10.2 |
| Eine Anweisung hier hat sich als falsch erwiesen | die Stelle selbst |

### Wie sie geändert wird

1. **Ersetzen, nicht anhängen.** Kein Änderungsjournal, keine „siehe auch
   neu"-Absätze. Wer eine Regel ändert, überschreibt die alte.
2. **Nur, was zutrifft.** Keine Absicht, keine Planung, keine Vermutung —
   nur der Stand, wie er jetzt ist. Was noch nicht gebaut ist, steht nicht
   hier.
3. **Nichts, was von selbst veraltet.** Keine Zeilenzahlen, keine
   Dateigrößen, keine Datumsangaben. Zahlen, die trotzdem hier stehen
   (Dateizahl, Bezeichnerzahl, Checks je Suite), stehen an genau einer
   Stelle und werden dort nachgezogen.
4. **Jede Regel nennt ihren Grund.** Eine Anweisung ohne Begründung wird
   beim nächsten Zweifel übergangen.
5. **Kürzen, wenn möglich.** Eine Regel, die nirgends mehr greift, wird
   gelöscht, nicht als „historisch" markiert.

### Prüfung vor dem Commit

Der Koordinator beantwortet drei Fragen, bevor er committet:

1. Stimmt jede Zahl in dieser Datei noch mit dem letzten Lauf von
   `tools/check.mjs` und `tests/run.mjs` überein?
2. Nennt §2 und §3 jede Datei, die es in `src/` gibt — und keine, die es
   nicht gibt?
3. Steht in dieser Datei eine Anweisung, die ich in diesem Commit
   umgangen habe? Dann war entweder der Commit falsch oder die Anweisung.
   Beides wird jetzt entschieden, nicht später.
