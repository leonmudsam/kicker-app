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
5. node tests/run.mjs              → alle Suiten müssen grün sein
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

**Die Kommentare bleiben in `src/`.** `build.mjs` entfernt sie beim
Zusammensetzen — JavaScript, CSS und die HTML-Kommentare des Gerüsts. Sie
waren 38 % des JavaScripts, und jedes Telefon lud und parste sie bei jedem
Start: gemessen 649 statt 326 Kilobyte über die Leitung und rund 20 % mehr
Zeit zum Kompilieren. Entfernt wird mit einem kleinen Lexer, weil `//` auch in
Adressen und `/*` in regulären Ausdrücken steht; der Bau parst das Ergebnis,
bevor er es schreibt, und `tests/tafel` sieht nach, dass keiner übrig ist.
Wer einen Fehler im ausgelieferten Code sucht, liest ihn deshalb in `src/` —
in `dist/` fehlt das Warum.

Ein Durchlauf ohne Schritt 4 und 5 gilt als nicht erledigt. Kein Commit
mit rotem Wächter oder roter Suite.

---

## 2. Aufbau des Repositories

```
src/index.html        Gerüst mit den Platzhaltern /*@@CSS*/ und /*@@JS*/
src/css/              17 Dateien
src/js/               50 Dateien
tools/build.mjs       hängt src/css/* und src/js/* ALPHABETISCH aneinander,
                      ohne Kommentare
tools/check.mjs       sechs Wächter
tests/run.mjs         Testläufer, jede Suite ein eigener Prozess
tests/ziel.js         entscheidet, welche Datei geprüft wird (dist vor Wurzel)
tests/fixtures/       die echten Partien der Liga, gepackt
index.html            das ausgelieferte Ergebnis, mitversioniert
mockup/               Entwürfe. Eigenständige HTML-Seiten ohne Bauablauf,
                      Vorlage für einen Umbau — kein Teil der App.
                      Dort liegt auch die Story-Simulation: hundert erfundene
                      Partien, gerechnet und erzählt mit dem Code der App
                      (README-story-simulation.md), und die Tafel der
                      Story-Logik: welche Daten, in welcher Reihenfolge, nach
                      welchem Prinzip und wie oft eine Karte entsteht,
                      gemessen an den echten Partien
                      (README-story-logik.md), und der Vorschlag für neue
                      Liga-Rekorde in zwei Kammern, offen und Anspruch —
                      278 gesuchte Kombinationen gegen neun gemessene Tore
                      und sieben Wächter, die den Lauf abbrechen. Zehn davon
                      sind eingebaut [§C35], die Seite bleibt als Herleitung
                      (README-rekord-vorschlag.md), und die Probeliga: eine
                      erfundene Liga aus 571 Partien mit einem gebauten
                      Schaufenster, die Tag für Tag nachgespielt zeigt, welche
                      Karte entsteht, welche verloren geht und warum
                      (README-probe-liga.md), und der Vorschlag für neue
                      Schandrekorde und Schandchroniken: dreizehn Kandidaten
                      gegen sechs Tore, darunter das, das nur für die Schande
                      gilt — sie darf sich nicht beim Schwächsten sammeln
                      (schande-lauf.js baut schande.html), und der Vorschlag
                      für Einträge, die aus der ABWEICHUNG leben statt aus dem
                      Niveau: zehn Kandidaten gegen sieben Tore, jede Schwelle
                      auf einem 5er-Schritt, vier tragen — und daneben Rekorde
                      auf einem gleitenden Fenster, die die laufende Form
                      messen: vierzehn Kandidaten in zwei Kammern gegen acht
                      eigene Tore, gemessen als Halterwechsel über die ganze
                      nachgespielte Liga, gepaart gegen dieselbe Rechnung ohne
                      Fenster, und das achte Tor auf die Siegquote — ein
                      Fenster allein ist noch keine neue Frage, sechs tragen
                      (README-abweichung.md), und der Vorschlag für Rekorde,
                      die eine ERRUNGENSCHAFT JE GELEGENHEIT messen wie „Der
                      Platzhirsch" — fünfzehn Kandidaten in zwei Kammern gegen
                      acht Tore, elf davon die fehlende Laufbahn-Achse einer
                      Monatschronik [§13.1], dazu „Das Übersoll", das der Code
                      in `untersoll.monat.wie` schon als Bezug nannte, ohne
                      dass es es gab. Fünf davon sind eingebaut und drei
                      Fenster-Rekorde dazu, die Seite bleibt als Herleitung
                      (README-staerken.md), und das Story-Labor: eine Seite,
                      in die man Partien eintraegt und sieht, welche Stories
                      daraus werden — sie laedt die ausgelieferte `index.html`
                      in einen abgeriegelten Rahmen und rechnet mit deren
                      Code, damit kein zweiter Generator entsteht. Ohne
                      Datenbank: der Supabase-Client ist eine Attrappe, das
                      CDN-Script wird nicht geladen, `fetch` ist abgeschaltet
                      und der Speicher ist ein eigener Topf — App und Labor
                      liegen auf derselben Adresse, und ohne ihn ueberschriebe
                      das Labor den Lesestand des Feeds (story-labor.html),
                      und der Entwurf der visuellen Aufwertung: Befunde,
                      Zeichenraster, Reiter, Kacheln, statistische Belege,
                      Stories samt Faden zwischen Karten, Blätter und die
                      Reihenfolge der Umsetzung (aufwertung.html), und der
                      Entwurf der Insignium-Leiter mit sieben Stufen als
                      sieben Gegenstände in einer Bauweise: eine Medaille auf
                      einem Kranz, geprägt mit Fuge statt Haarlinie, vom Reif
                      über Zweig, Eiche und Lorbeer zu Krone und Stern, ohne
                      Band, die Raute mit der Platzierung am Fuß und der Rang
                      als Schimmer im Metall, 21 Zeichnungen in fünf Rängen
                      samt Bühne für den Aufstieg — eingebaut ist stattdessen
                      die Leiter in der Machart von 35b-prestige.js [§C30],
                      vom Entwurf kommt der Schimmer —, dazu
                      Bewegung, die etwas erklärt, und neue gezeichnete
                      Ansichten (aufwertung-2.html), und der Entwurf nur
                      der Insignium-Leiter mit denselben 21 Zeichnungen wie
                      die App (der Zeichencode ist eingebettet), dazu Glut,
                      Hof, Glanz und die Zahl in der Raute,
                      die Verwandlung als Bühne, die ganze Leiter in der
                      Laufbahn, der Fun Fact dazu und 52 px
                      (insignium.html), und die gemalte Vorlage der Leiter,
                      nach der die Zeichnungen entstanden sind
                      (insignium-vorlage.webp), und ein Satz derselben
                      Stufen als SVG, der nicht eingebaut ist
                      (rang-insignien-app-assets/), und der Entwurf des
                      Lorbeerreifs: der Lorbeer bleibt vorn als Zweig mit
                      Blattpaaren, und darüber steigen belaubte Linien am
                      Reif zum Kopf auf, mit jedem Grad eine mehr. Er ist
                      eingebaut [§C30]; die Seite zeigt ihn neben der
                      Fassung davor (lorbeer.html), und die Titel-Aura in
                      drei Lichtformen zu je zehn Stufen, deren Korona statt
                      der Schwinge eingebaut ist [§C36] (titel-aura/), und
                      die dritte Aufwertung: zehn Reiter und Blätter heute
                      und als Entwurf, gebaut in der ausgelieferten App mit
                      den echten Partien (bau.js legt entwurf.js und
                      entwurf.css hinein und fotografiert beide Stände) —
                      Titelrennen, Rollen-Landkarte, Netz der Duos, Verlauf
                      nach Tagen, Siegchance beim Aufstellen, Spielkalender,
                      jede Begegnung, Woche und Feld. Eingebaut sind
                      Rollen-Landkarte und Netz als Einblick, die
                      Siegchance, jede Begegnung, Woche und Feld in den
                      Rückblicken; das Titelrennen trägt der
                      Positionsverlauf, Verlauf und Profil bleiben, wie sie
                      sind (aufwertung-3/), und
                      die vierte: die Karten „Am Spieltag", deren Kopf dem
                      Anlass folgt — Spielfeld mit Rollen, Anzeigetafel samt
                      Bilanz in engen Partien, Ergebnisverteilung, Wippe des
                      Elo-Gefälles, Tabelle vorher und nachher, Lauf gegen
                      den eigenen Bestwert, gerissene Kette, Duo-Ring,
                      Medaille mit ihren Trägern, Tagesbahn des Spielers des
                      Tages, Elo-Kurve, jede Begegnung — und die Runde der
                      Vier als eine Karte, auf dieselbe Weise in der App
                      gebaut und fotografiert. Jedes Bauteil trennt Rechnen
                      und Zeichnen, damit bau.js es auch mit Grenzwerten
                      zeichnen kann (45.495 Partien, lange Namen), und misst
                      im Browser, dass kein Text auf einem anderen liegt,
                      keiner abgeschnitten wird — auch nicht mit „…" — und
                      keiner geschrumpft ist: ein Name steht in der Grafik
                      nur, wo sie Platz hat, sonst in einer Textstelle
                      darunter. Eingebaut ist sie samt der Runde in
                      `30b-news-spieltag.js` [§C33]; die Seite bleibt als
                      Herleitung (aufwertung-4/), und die fünfte: vierzehn
                      neue Köpfe für die gewöhnliche Partie, jeder mit einer
                      Regel aus den Partien bis zu dieser und einem Gewicht
                      (Tauziehen, Pflicht erfüllt, Erwartung gegen Ergebnis,
                      Elo-Transfer, Eingespielt, Lieblingsgegner und
                      gebrochener Fluch, Revanche, Tagesring, Zählwerk,
                      Anpfiff und Schlusspfiff, Mosaik, Gipfeltreffen, Zwei
                      Welten, Zurück am Tisch), eine Regel für Abwechslung,
                      drei Formen für Partien mit mehreren Anlässen
                      (Stempel, halb und halb, Leiste) und dreizehn Blätter
                      in einem Bau aus Bühne, Kernsatz und Abschnitten, je
                      neben dem heutigen. Anders als die vierte keine
                      Fotos: bau.js legt die Karten und Blätter als
                      lebendiges Markup samt Animation in die Seite, die
                      Bildadressen der Wappen als Daten (aufwertung-5/)
datenbank/            SQL, das der Betreiber selbst ausführt — die App ändert
                      kein Schema. karriereende.sql legt players.retired_at
                      an [§C40]; fehlt die Spalte, sagt der Knopf das
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
   einen Gültigkeitsbereich. Wächter 4 zählt sie (aktuell **1150**) — und schlägt auch an, wenn einer
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
| Rahmen, Zustand, Daten | `00-prolog` (Konstanten, Supabase-Client) · `01-update` (Version, Update-Banner, **aller Zustand**) · `04-cache` · `06-db` (Laden, Speichern, Saison-Rückblick) · `06b-ruhestand` (Karriereende: `ligaAktiv`, `sichtbar`, der eingefrorene Stand) · `37-boot` |
| Rechnen | `03-saison` · `05-rang-elo` (Ränge, `posWert`, Metrikleiste) · `08-stats` · `10-elo-engine` |
| Ansichten | `11-view-ranking` · `12-view-positionen` · `13-view-awards` · `15-views-rest` (Teams, Verlauf, Einstellungen) · `15b-einblick` (Rollen-Landkarte, Netz der Duos, als Zeile, die aufklappt) · `18-profil` · `22-team-profil` |
| Blätter (Sheets) | `14-top5-listen` · `16-sheet-infra` (Öffnen, Stapel, Wischgeste) · `19-bilanzen` · `21-head-to-head` |
| Rückblicke | `05b-recap-teile` (Baukasten) · `07-positionsverlauf` (Woche, Tag) · `18b-abschied` (der Abschied eines Ruheständlers, Bühne für Blatt und Story) |
| Zeichen und Wappen | `02-icons` (SVG-Katalog, `lossStreakInline`) · `09c-zeichen` (Feuer, Sterne, `avHtml`) · `17-badges` · `17b-fingerabdruck` · `35a-insignium-zeichen` (die 21 Zeichnungen der Leiter, `insBild`) · `35b-prestige` (Insignium, Laufbahn) · `35c-titel-aura` (die Aura der Meistertitel, `auraHref`) |
| News | `26-news-konstanten` (Kategorien, Limits) · `26b-story-fakten` (ein Stand der Liga, der Spieltag als Paar aus Vorher und Nachher, die Punktewirkung, das Tor vor der Rangliste) · `27-news-generator` (Ereignisse, Ewige Tafel) · `28-news-ambient` · `29-news-cache` (Realtime, Autosync, Entzerrung) · `30-news-ui` (`_isBreaking`) · `30b-news-spieltag` (Kopf und Fuß einer Partie nach ihrem Anlass, die Runde der Vier) · `30c-news-fakt` (das Bild eines Fun Facts nach seinem Anlass) · `31-news-detail` |
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

`rekKammer` gilt **nur** für den Rekorde-Reiter und ist leer für alle fünf
Kammern (`koennen`, `form`, `mark`, `fuegung`, `shame`). Sie wird beim
Tabwechsel UND beim Reiterwechsel geleert: wer den Tab verlässt, will beim
Zurückkommen die ganze Tafel sehen und nicht den Ausschnitt von vorhin.

`ligaSeasonId` gilt **nur** für den Liga-Tab — Awards, News und Ambient
rechnen weiter mit `currentSeason()`. Sie wird beim Tabwechsel UND beim
Zeitraumwechsel geleert: die gewählte Saison gehört zur Ansicht „Saison",
und die Saison-Tools darunter (Recap, Positionsverlauf) folgen ihr.

`einblickOffen` nennt die aufgeklappten Einblicke (`rollen`, `netz`,
`ruhe_liga`, `ruhe_pos`, `ruhe_teams`), durch Leerzeichen getrennt, und ist
sonst leer. Es sind mehrere, weil ein Reiter zwei tragen kann: mit einem
einzigen Wert klappte der zweite den ersten im Zustand zu, und nach dem
nächsten Neuzeichnen stand er geschlossen da. Ein Neuzeichnen im selben
Reiter lässt sie offen — eine
neue Partie oder ein anderer Zeitraum klappt nichts zu, was man gerade
liest —, der Tabwechsel und der Klick aufs Logo leeren ihn: ein neuer Reiter
beginnt mit der Rangliste oben und nicht mit einer Grafik darüber.

Zeitweilige Arbeitsaufträge sind keine Ansichtsauswahl: `_ligaRefreshAuftrag`
lebt im Navigations-Layer und wird nach Ende des gemeinsamen Datenabrufs
geleert; `_loadAllLeise` gilt nur für dessen Lauf und wird im `finally`
zurückgesetzt. Ein Vordergrundaufruf hat Vorrang vor stiller Fehleranzeige.

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

Kalenderabhängige Schlüssel tragen zusätzlich ihre echte Zeitgrenze:
`matchesInPeriod` den Tages-/Wochenbeginn, `getCachedAwardRankings` die
aktuelle Woche beziehungsweise den Tag, `allPastSeasons` den laufenden
Monat und `getSeasonPositionHistory` den heutigen Tag, solange die Saison
läuft. Die kleine Recap-Kurve trägt auch `ph.lastDay`. Ohne neue Partie darf
der Cache keinen alten Tag oder noch laufenden Vormonat behaupten.
`tests/leistung` prüft das mit unveränderter Datenversion.

`periodPlayerStats` folgt der Identität der kanonischen Periodenliste und
dem aktuellen Monat: auch neben einer unveränderten Allzeit-Bilanz muss die
absolute aktuelle Elo nach dem Monatswechsel zurückgesetzt sein.
`currentSeason` prüft weiterhin die Ortszeit bei jedem Aufruf, hält aber nur
das eine aktuelle Monatsobjekt statt es bei jedem Cache-Treffer neu zu bauen.

`getGlobalSim` hält genau einen vollständigen DB-First-Lauf, gebunden an
Version, Monat und Quellenreferenzen. Der ehemalige inkrementelle Weg hielt
nur die History und Saison-/Team-Maps der neuen Partien. Historische Schnitte
teilen über `getSimAt` und `getSimForMatches` denselben exakten Liga-Prefix
(höchstens 24 Läufe). Fremde Teilmengen erhalten ihren eigenen kanonischen
Lauf in einer versions- und quellengebundenen WeakMap. Gleiche Zeitstempel
werden im Zeitschnitt vollständig eingeschlossen, ein ausdrücklich kürzerer
Index-Prefix bleibt dagegen kürzer. Auszeichnungen und Rekorde nutzen diese
Quelle, nicht zusätzliche Simulationen. Historische Saison-Gruppierungen
teilen stabile Array-Identitäten für die Periodensieger aller Spieler.
`tests/prefix` vergleicht sämtliche Maps und History mit der unveränderten
ungecacheten Engine, einschließlich Brüchen, Edit, Add, Empty-State und Monat.

H2H-Listen tragen Version und Matchanzahl im Schlüssel und höchstens 80
Einträge. Gültige Nullwerte für Erwartung, Spielbonus und Verlustdämpfung sind
keine fehlenden Angaben. Die sichtbaren Prestige-Gruppensummen kommen zentral
aus derselben Restverteilung wie die Posten im Laufbahnblatt; Gesamtformel und
Rohquellen bleiben unverändert. `tests/rechnen` prüft die gemeinsame Anzeige
in Engine, Profil und Story, ohne eine zweite Elo-Formel zu implementieren.

Das Spielerprofil nutzt bereits gecachte Spieler-/Saisonlisten und bindet
nur seine eigenen Knöpfe. Browser mit beiden nötigen CSS-Fähigkeiten zeichnen
seine `.pp-sec`-Abschnitte bedarfsweise (`content-visibility:auto` mit
`overflow-clip-margin` für Überhänge). Wappen und Aura im Kopf sowie andere
Blätter sind ausgenommen, ältere Browser behalten das vollständige Layout.
`openSheet` setzt den alten Scrollstand vor dem neuen Markup zurück; jede
verspätete Navigations- oder Wischphase prüft die Öffnungsnummer. Schließen
oder direktes Neuöffnen entzieht alten Phasen den Besitz.

`render` merkt am `#main` ausschließlich das zuletzt gezeichnete Markup,
seine `_cache.version` und den Root-Knoten. Gleiches Markup in derselben
Version behält DOM, Fokus und Bindings; Vorlagen werden dennoch ausgewertet,
damit zeitabhängige Anzeigeänderungen erkannt werden. Datenwechsel, andere
Vorlagen und fremd ersetzter Inhalt erzwingen einen Umbau. Eingabe und
Einstellungen sind ausgenommen. Die fünf Navigationsknöpfe werden einmal
gebaut und gebunden, danach ändert sich nur ihre aktive Klasse. Kein
unbegrenzter HTML-Cache je Ansicht oder Filter.
Die ganze `.view` wird nicht bei jedem Umbau verblasst/verschoben: Filter
und Datenantworten wirkten sonst 320 ms lang wie ein erneuter Seitenstart.
Erklärende Grafiken und Segmentwähler behalten ihre eigene Bewegung.

Benutzerseitige Reiter-/Filterwechsel verwenden `_renderNachEingabe`:
die Navigation antwortet synchron, genau ein Frame mit anschließender Aufgabe
baut die zuletzt gewählte Ansicht. Während eines Reiterwechsels ist der alte
Inhalt inert, Filter derselben Ansicht bleiben für die nächste Wahl bedienbar.
Ein direktes `render` oder ein anderer Root entzieht dem alten Auftrag den
Besitz und stellt die vorherige Eingabefreigabe wieder her. `aria-busy` und
`aria-current` machen den Zustand auch ohne Farbe erkennbar. `bind` bindet nur
den Hauptinhalt, keine Knöpfe eines gleichzeitig geöffneten Blatts.
`_eingabeOffen` erkennt ein bereits aufgebautes lebendes Match-/Settingsformular:
auch vorher gestartete Datenabrufe aktualisieren darin nur Daten und Vorschau,
nicht den Eingabe-DOM. Abruffehler stehen als Hinweis statt anstelle des
Formulars; freier, noch nicht ausgewählter Suchtext geht so nicht verloren.

Die Match-Eingabe hält mit `_cache._matchInputMemo` genau das letzte
`computeMatch`-Ergebnis, gebunden an Version, Monat, Aufstellung, Rollen,
Stand und Quellenreferenzen. Chance, Vorschau und Speichern teilen diese
Rechnung; die Formel wird nicht kopiert. Unveränderte Chancen behalten ihren
DOM. Zustand, Stand und Speichergültigkeit antworten sofort, die Vorschau
zeichnet höchstens einmal je Frame und prüft ihren Formular-Root. Die
Teamsuche aktualisiert über `vTeams(true)` ausschließlich ihre Ergebnisliste
aus derselben Vorlage, nicht das Eingabefeld. Cursor, Fokus und laufende
IME-Komposition bleiben erhalten; alte Aufgaben verändern keinen neuen Reiter.
Comboboxen unterstützen Pfeiltasten, Enter und Escape samt ARIA-Auswahl.
Speichern hält eine sofortige Einzelsperre und einen Eingabesnapshot; eine
verspätete Antwort löscht keinen zwischenzeitlich geänderten Entwurf. Ein
bereits erfolgter Insert wird nach einem Folgefehler nicht erneut angeboten.

Ein Topf mit einem Schlüssel, der die Version enthält, **wächst über die
Versionen**: er braucht eine Obergrenze, ab der er geräumt wird. Sieben
hatten keine — darunter der der Auszeichnungen, der zu jeder Version zwölf
Listen mit je dreißig Einträgen anlegt und jede vorige behält. Der Deckel
wird nur bei einem Fehlgriff geprüft: vor dem Lesen geräumt, verlöre er
gerade den Treffer, für den er da ist. Geräumt wird der **älteste Eintrag**
(`_topfDeckel`), nicht der ganze Topf. Beim vollständigen Leeren ist das Memo
oberhalb des Deckels nämlich nicht beschnitten, es ist **aus**: gemessen an
`_seasonTitleCtx` mit Deckel 8 kostete ein zweiter Blick auf sechs und acht
Zeitschnitte null Rechnungen, auf zwölf und zwanzig jeweils alle noch einmal.
Und ein Deckel steht nie weit über der Arbeitsmenge — der News-Generator
allein fragt sieben verschiedene Schnitte des Monatskontexts ab, der Deckel
stand bei acht. `tests/tafel` zählt die Töpfe und
die Deckel und misst, dass ein Eintrag zu viel einen Eintrag kostet —
Stichproben genügen dafür nicht, weil ein neuer Topf gerade
der ist, an den niemand denkt.

**Ein Zeitschnitt, der nichts abschneidet, ist kein Zeitschnitt**
(`_schnitt`, `_schnittSaison`). Der Feed vergleicht „vor dem letzten
Spieltag" mit „heute" und schrieb „heute" als den Zeitstempel der letzten
Partie. Für jede geschnittene Rechnung ist das aber ein eigener Schlüssel:
gemessen rechnete ein Generatorlauf `prestigeTabelle` zweimal, einmal
ungeschnitten für 17 ms und einmal als Schnitt für 59 ms, und Juni und Juli
kamen in sechs Schnittfassungen vor, obwohl beide Monate längst zu sind.
Schlimmer als die Zeit ist die Abweichung: `seasonTitles` liest einen
abgeschlossenen Monat nur OHNE Schnitt aus dem eingefrorenen Datensatz und
rechnet ihn mit Schnitt frisch nach [§10.2] — derselbe Monat kann damit unter
zwei Namen erscheinen, je nachdem ob ein Schnitt mitgegeben wurde. Ein
Schnitt hinter der letzten Partie fällt deshalb weg, und ein Schnitt hinter
dem Monatsende fällt für DIESEN Monat weg. Gemessen sank der News-Generator
dadurch von 241 auf 162 ms kalt (Median aus elf Läufen). **Ein Generatorlauf nimmt genau zwei Stände** (`_storyStand`,
`_storyTagGrenzen`, `_prestigeWirkung` in `26b-story-fakten.js`): den Stand
vor der ersten Partie des Spieltags und den danach. Rekord, Monatschronik und
Insignium rechneten sich ihre Tagesgrenze und ihren Zeitschnitt vorher jeder
selbst aus, und jeder ein bisschen anders — die Chronik fragte
`prestigeTabelle` am Zeitstempel der letzten Partie, also mit einem Schnitt,
der nichts abschneidet. Drei Rechnungen über dieselbe Änderung nennen
irgendwann drei Zahlen, und die stehen dann auf drei Karten derselben Minute.
„Nachher" ist für den jüngsten Spieltag deshalb `0` und damit „jetzt": so
treffen alle vier zentralen Funktionen ihren heißen Cache. Wo eine
Rechnung an der Identität eines Arrays hängt statt an einer Version
(`_winnerCountsOf`, `matchesOfPlayer`, `matchesByDay`), reicht eine `WeakMap`
— `matches` wird immer **ersetzt**, nie an Ort und Stelle verändert, und ein
frisches Array verwirft den Memo von selbst.

**Der Verlauf eines Rekords** (`_rekVerlauf`, Schlüssel Rekord, Partienzahl
und Version, Deckel 16) wird nach dem Öffnen des Blatts gerechnet, ein
Monatsende je Takt: ein Zeitschnitt rechnet die Elo-Bahn bis dorthin nach,
gemessen 7 bis 36 ms je Monat, und sechs davon auf einmal stünden mitten in
der Animation. Die Schnitte selbst liegen danach in `_chronCtxBis` und
teilen sich den Topf mit Feed und Rückblicken.

**Die Karten am Spieltag rechnen einmal je Datenstand** (`_spBasisMemo`,
`_spBildMemo`, beide eine `WeakMap` an `matches`): Spielreihenfolge,
Ergebnisverteilung als Präfixsumme, Serienstand vor jeder Partie und die
Runden der Vier, und je Karte ihr Bild, solange `players` dasselbe Array ist.
Eine Karte las sonst für die Verteilung, die Serie und die Runde je einmal
die ganze Liga — bei sechzig Karten sechzig Läufe bei jedem Öffnen. Die
Zeilen einer Runde finden die Karte ihrer Partie über `_spKarteMemo`, eine
`WeakMap` an der Liste des Feeds: je Zeile den ganzen Feed zu durchsuchen
wäre bei acht Zeilen und siebzig Karten ein Quadrat für nichts. Die Formen
der gewöhnlichen Partie hängen an `_spFormBasis`, ebenfalls eine `WeakMap`
an `matches`: die Partien je Tag, je Partie Siegchance, Abstand und Gewinn,
und gemerkt die Fakten, Kandidaten und die Wahl je Partie — die Kette der
Wahl läuft einmal je Datenstand.

Die V2-Scorewahl indiziert außerdem die wirklich publizierten `visual.score`
je Match und Storybestand. Dieser Index und die chronologische Variationsspur
werden bei neuer Rohstory-Referenz oder `_cache.version` neu aufgebaut;
publizierte Grafiken selbst bleiben unverändert. `_consolidateStories` hängt
neben der Eingabeliste auch an `matches` und `_cache.version`, damit eine zuvor
noch nicht geladene Matchreferenz nach dem Datenladen richtig aufgelöst wird.

**Die Zeitmaschine rechnet in einem eigenen Topf** (`_ruheRechnen`,
`06b-ruhestand.js`). Der eingefrorene Stand eines Ruheständlers [§C40] ist
die Liga im Moment seines Karriereendes, und darin steht er noch mit. Dafür
wird `_cache` für die Dauer der Rechnung gegen einen leeren getauscht und
`_ruheStichtag` auf den Augenblick davor gesetzt: ein Stand MIT ihm darf nie
in einem Topf landen, aus dem die aktive Liga liest. Ein Schlüssel je Topf
hätte dasselbe getan, und jeder künftige Topf hätte ihn vergessen können.
`_schnitt` schneidet in der Zeitmaschine immer, auch hinter der letzten
Partie: sonst fiele der Schnitt am Karriereende auf „jetzt“ und läse die
Monatschronik aus dem Einfrierer, der den laufenden Monat ohne ihn
festhält. Der Stand selbst liegt außerhalb von `_cache` in
`_ruheStandMemo`, gebunden an `_ruheSig` (`_cache._ruheSig`, Deckel 16): ein
Abdruck der Partien bis zum Karriereende, der Rechenregeln, der Monate, die
davor zu waren, und der früheren Karriereenden. Eine Partie danach ändert
ihn nicht und kostet damit auch keinen neuen Lauf. Der Rang kommt aus
`getSeasonAvgElos(t)`, der Elo-Bahn bis dorthin — die Karriere-Elo der
anderen wächst weiter, und ein Rang von heute verschöbe sich mit ihr.
`tests/ruhestand` misst das mit sechzig Partien danach und frischem Start.
Die Daten des Abschieds (`abschiedDaten`, `_cache._abschied`, Deckel 8)
tragen Version und Partienzahl im Schlüssel und werden erst beim Öffnen
gerechnet; sie lesen aus Serie, Peak, Partnerliste, Saisonrangliste und
dem eingefrorenen Stand, nichts davon wird neu gerechnet.

**Die Rohsicht landet nicht im Cache.** Fünfundzwanzig Liga-Rekorde [§C35]
fragen nach einem gleitenden Fenster, nach einer Rolle, nach dem Gegnerkreis,
nach dem Partnerkreis oder nach den eigenen Spieltagen und brauchen dafür die Partien je Spieler in
Spielreihenfolge — dieselbe Rohsicht, die `_seasonTitleCtx` für den Monat
schon hat. `_chronicleCtx` baut sie in einer eigenen Struktur NEBEN `P`,
rechnet die Werte daraus aus und lässt sie fallen; am gecachten
Spielerobjekt hängen nur Skalare. Am Objekt selbst wären es 4×N
Partien-Objekte, und der Zeitschnitt hält bis zu 24 Kontexte gleichzeitig.
Jede Partie trägt dort `mate`, `geg` und `day`: „Der Klotz am Bein"
vergleicht jeden Mitspieler mit sich selbst OHNE diesen Partner, „Der
Rückenwind" braucht die Stärke des Partners, und „Der letzte Ball" und „Die
Steigerung" gruppieren nach Spieltagen — alle drei Fragen hängen an einer
Reihenfolge, die nur die fertige Liste kennt. Die vier Kennzahlen der Schandtafel fallen im
selben Durchlauf ab — gemessen 8,6 auf 10,3 ms kalt, warm weiterhin null. `tests/disziplinen` sieht nach, dass kein Spielerobjekt im
Cache eine Liste trägt.

> **Pflegepflicht.** Kommt ein Topf dazu, steht seine Schlüsselregel hier.

### Takt

Zwei Zeitgeber laufen dauerhaft (`37-boot.js`): `_tickDaten` alle dreißig
Sekunden, `_tickVersion` alle fünf Minuten. Beide **ruhen, solange die Seite
versteckt ist**, und holen beim Zurückkommen sofort nach. `loadAll` lädt alle
Spieler und alle Partien; das im Hintergrund zu tun ist Mobilfunk und Akku
für nichts, und ein PWA-Symbol bleibt tagelang offen. Der News-Autosync
(`29-news-cache.js`) befolgt dieselbe Regel seit jeher.

`loadAll` hält höchstens einen Durchlauf offen (`_loadAllPromise`). Weitere
explizite Anforderungen setzen `_loadAllNochmals` und erhalten dieselbe Promise, die
erst nach dem frischen Folgedurchlauf erfüllt ist. Nach jedem abgeschlossenen
Abruf wird gegebenenfalls erneut geladen: Speichern darf nicht lediglich
eine schon vorher gestartete Antwort erhalten. Alle vier Leseabfragen enden,
auch bei einer Ablehnung; überholte Antworten leeren keine Caches und
publizieren keine Stories. Fehlerhafte Teilantworten werden nicht eingebaut,
und ein Fehler verwirft den Fingerprint, damit ein erneuter Versuch möglich
bleibt. Unveränderte erfolgreiche Antworten behalten weiterhin den Cache.
Reine Hintergrundticks verwenden `loadAll({nachladen:false})` und schließen
sich nur an einen laufenden Abruf an. Sonst würde ein langsamer Abruf, der
länger als dreißig Sekunden dauert, durch jeden Tick erneut verworfen.
Jedes Tippen auf den unteren Liga-Knopf, auch wenn er schon aktiv ist,
ruft `_ligaAktualisieren`: nach einem Rückmeldungsbild lädt der vorhandene
Datenweg mit `leise:true`, ohne Dokumentreload oder Ladeansicht. Ein einzelner
`_ligaRefreshAuftrag` bündelt weitere Liga-Taps bis zum Abrufende. Eine schon
vor dem Tap gestartete Abfrage wird einmal frisch nachgeholt, nicht durch
jeden weiteren Tap erneut verworfen. Unveränderte Daten behalten DOM/Caches;
Abruffehler behalten die letzte Ansicht. Ein sich anschließender expliziter
Vordergrundaufruf hebt den stillen Modus auf (`_loadAllLeise`).

Kommen neue Daten, zeichnet `loadAll` zuerst und rechnet den News-Generator
(kalt rund 370 ms) erst in einem ruhigen Moment danach (`_leerlauf` in
`syncStoriesViaDb`, höchstens anderthalb Sekunden später): beides lief in
derselben Aufgabe, und die neue Rangliste stand erst nach dem Generator auf
dem Bildschirm. `tests/ambient` sieht nach, dass er im selben Aufruf nicht
läuft.

`_tickDaten` lässt außerdem ein offenes Blatt, den Eingabe-Tab und die
Einstellungen in Ruhe:
was man gerade unter den Fingern hat, wird nicht neu gezeichnet. `tests/blatt`
und `tests/bedienung` messen diese Bedingungen.

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
| `disziplinen` | Chronik-Katalog, Vergabe, Belege, Insignium-Leiter und -Grade, Prestige ausschließlich aus Auszeichnungen, Chroniken und Rekorden, paarweise gedämpfte Wiederholungen mit unbegrenzter Erreichbarkeit, den Skill-/Spielzahl-Vergleich, wertsortierte Wurzelstaffeln, nachvollziehbare Chronik-Werte und historische Saisonwürden, Katalog-Karten, historische Rekordlage je Monat, Positionsrekorde und die gemeinsame Wandler-Formel, die Fügungen, neutrale Sprache, Wochenherr, Spieltagssieger, Zähler der Auszeichnungen, Monatskatalog, Kurznamen, Ausschlag und Beinamen, die offene Kammer samt ihren Rennen, die gleitenden Fenster, den Halterdeckel, die Rohsicht, die nicht im Cache landet, die Bedingung samt Erklärung jedes Rekords, den Rekord, der ausser einem Fund immer vergeben ist, die zwei Hälften einer Rolle, die nicht demselben gehören, und die Schandtafel samt ihrer Verteilung, die eine Monatsquelle je Spieler und Monat und den Rekord, der mit dem Verlust wieder abgezogen wird, den Katalog der fünfundsechzig samt seinen fünf Kammern, Grundwerten, eindeutigen Zeichen und vollständigen Angaben, die festen Endfenster, den Serienstand vor der Partie, die Rekordlage ohne spätere Partien, die Gegenpaare mit derselben Mindestbasis, den Rekord ohne Wertlatte in Prozent, Elo oder Serienlänge, die gestrichenen Rekorde samt ihrer alten Karten und die Laufbahn aus lauter Niederlagen, die nichts gewinnt, den sichtbaren Text, der die App nicht erklärt, und die acht Rekorde aus engen Partien, Gegnerkreis, Niederlagen, Wiedersehen, Pleitenserie, Serienantwort, Pause und Rolle, jeder ein zweites Mal aus den rohen Partien nachgerechnet, die Beschreibung jeder Auszeichnung als Satz ohne Kürzel, die Einzahl, wo eins steht, „jeder" statt „mindestens 100 %" und keine Auszeichnung, die wie eine Rangstufe heißt, die Breaking-Grenze der beiden obersten Insignium-Stufen und den Schimmer, der mit der Leiter wächst, die Schwellen im Schritt von mindestens 500, drei verschiedene Zeichnungen je Stufe und die Rangfarbe, die in jedem Rang gezeichnet ist statt gefiltert, den dritten Grad, der nie mehr Steine oder Gold trägt als der erste der nächsten Stufe, und die Zeichnung, die keinen Filter trägt, und die Rangfarbe im Auge der Schnecke, die vom Zierkranz zum Lorbeerreif nicht verloren geht, und das Regelblatt, das jede legendäre Auszeichnung nach ihrem Startwert ordnet | 1456 |
| `tafel` | Monatstafel, Liga-Ansichten, Rückblicke, Rekord-Blatt, Invarianten, die Töpfe nach einer neuen Partie, ihre Schlüssel und ihre Deckel, die toten CSS-Regeln, die toten Zeichen, die Schwellen und Nenner der Awards, den Zeitschnitt, der nichts abschneidet, den Kalendertag, der an einer Stelle gebildet wird, und den vollen Topf, der seinen ältesten Eintrag verliert, die Erwartungsformel und die Chancen-Linien, die zwei Rechnungen über die längste Serie, jede CSS-Variable, die auch gelesen wird, die Erklärung jeder Award-Kachel, die die Schwelle nennt, die gilt, und jede Schriftangabe mit einer Schriftfamilie dahinter, jedes Award-Zeichen, das im Katalog steht, das Podest, auf dem punktgleiche Halter denselben Platz tragen, und keinen Award, der wie eine Chronik heißt, die etwas anderes misst, und jede Award-Kachel, die Zahl und Einheit aus derselben Tabelle nennt wie Blatt und Profil, und jedes Zeichen, das seinen Strich aus einer Regel zieht, und den Beleg, der seine Stichprobe zählt, die Halter im Feld zeigt, den Vorsprung in Ergebnissen richtig zählt, ohne Statistiksprache auskommt und beim Bestwert endet, und den Knopf des Rekord-Blatts, der den Halter nennt, und die Meisterbühne, deren Tage an der Spitze und deren Titelrennen aus den rohen Partien nachgerechnet werden, samt Karte und Blatt des Meisters ohne Saison-ID und ohne Satzfragment, und jede Rekordkarte, deren Feldstreifen den Halter am Ende und den Ersten dahinter aus derselben Reihenfolge zeigt wie das Blatt, und die Auslieferung ohne Kommentare | 223 |
| `ambient` | Story-Snapshots, verlustfreie Bündel samt positiven und negativen Matchanlässen, historische Duellzuordnung, heutige rollende Ewige Tafel, 15-Uhr-Funfacts samt Mehrtages-Backfill, Realtime-Schutz, getrennte Score-/Anlassgrafiken mit publizierter Variationsspur, visuelle Stabilität, Feed-Texte und Story-Details, die Blätter der Ewigen Tafel mit Bühne, deren Zahlen zu ihrer Quelle passen, samt dem Tafel-Moment als Achse des Spieltags ohne Namen, dessen Zeilen zu ihrem Eintrag führen, Meilenstein, Form, Ausschlag, Spitzenspiel, runde Marken und Fun Fact mit ihrer Zahl auf einer Bühne, das Bild jedes Fun Facts, dessen Zahlen zu ihrer Quelle passen und das jeden Namen nennt, und kein Blatt mit einer Überschrift ohne Inhalt | 593 |
| `leistung` | DOM- und Navigations-Wiederverwendung samt Fokus und frischer Datenversion, Kalenderwechsel ohne Datenänderung, tatsächlich verzögerter vollständiger Feed samt großem Spieltag, Tageskarte, Filter-, Versions- und Schließschutz, begrenzte Portionen und Idle-Rückfall, gebündelte Datenabfragen, Fehler/Teilantworten, Wiederholen und frischer Folgedurchlauf auch während der Story-Synchronisierung, und Polling ohne unnötigen Zusatzabruf oder Verhungern langsamer Abrufe | 49 |
| `bedienung` | Sofortige Navigationsantwort vor dem teuren Render, nur die letzte schnelle Auswahl, inerte alte Reiter, Freigabe nach Zeichnen/Abbrechen, alte Frame-Aufträge ohne Besitz, aktuelle Datenversion, ARIA-Navigation und geschützte Einstellungen, freie Texte/Cursor/Fokus und Regler auch bei späten oder fehlerhaften Datenantworten | 16 |
| `bewegung` | Ein Zeichenauftrag je Wischbild, echte kurze Wischgeschwindigkeit samt Pause und Wegschwellen, Abbruch/Zweitfinger, Eingabe- und Scrollbesitz, Rückzug, Maus, neue und geschlossene Blätter ohne alte Zugbilder, transformbasierte Wähler mit unveränderter Zielgeometrie, Bewegungsruhe, Scrollbegrenzung, Knopfgeste und sichtbarer Tastaturfokus, abbrechbare Übergangsabschlüsse ohne alte Timer/Listener, idempotentes doppeltes Schließen, vollständiger Wisch ohne zweite Wartephase und unberührte Popover-/News-Nachholung | 31 |
| `aktualisierung` | Stille Aktualisierung bei Awards → Liga und erneutem Liga-Tap, unmittelbare Navigation, bedienbare vorhandene Ansicht, gebündelte Mehrfach-Taps, unveränderte Daten ohne Cache-/DOM-Umbau, neue fremde Partien ohne Reload, Fehlerfreigabe ohne Verlust der Ansicht auch bei gleichzeitigem Hintergrundtick, einmaliger frischer Folgelauf und erhaltene neue Eingaben, Reiter/Filter ohne globale Eintrittsanimation | 16 |
| `storyscroll` | Jede Storyöffnung oben, unabhängig von vorheriger Story und Feed-Scroll, synchroner Reset vor Markup, gleiche Story und direkter Faden, keine verspäteten Rückzüge, nur sichtbare Gruppen-/Fallback-Zeilen und Ergebnisbänder ohne doppelte verworfene Zeichnung | 20 |
| `wiederholung` | Auszeichnungsmarken, historischer Vergabestand und Trägerfeld, einmaliger Eventindex, neue Wiederholungsmedaille samt nächster Marke, unveränderte Legacy-Snapshots, Stabilität nach neuen Partien und Kaltstart, Bündel und Detail mit derselben Bühne, mobile Geometrie | 44 |
| `eingabe` | Eine kanonische Matchrechnung samt gültigem Memo, unverändertes Chancen-DOM, gebündelte Vorschau, unmittelbarer Stand und Gültigkeit, Eingabegrenzen, IME und Tastatur-/Pointerauswahl, stabile Teamsuche, alte Aufgaben, Einzelspeicherung, Fehlerfreigabe, Erfolg/Fehler nach Insert ohne Verlust neuer Entwürfe, Edit-Snapshot und eigene Blattbindungen | 42 |
| `mobil` | Scrollreset vor neuem Markup, Blattstapel und Scroll-Restore, Besitzerprüfung jeder verspäteten Übergangs- und Wischphase, echtes verzögertes Leeren, auf das Profil begrenzte Knopfbindungen und bedarfsweises Layout samt unberührtem Wappen, erreichbaren Abschnitten und Handybreite — im Browser, ohne geräteabhängige Zeitgrenzen | 21 |
| `prefix` | Vollständige kanonische Sim-Ergebnisse und History an exakten historischen Prefixen, gleichen Zeitstempeln, fremden Teilmengen und Array-Kopien, einmaliger Sim für Rekord und Saison-Peak, begrenzte Cache-Töpfe, Konfigurationswechsel, Edits, Adds mit und ohne Tick, Quellenidentität, Empty-State, stabile Saison-Gruppierungen, Monatsmemo und alle abgeleiteten Maps beim Kalenderwechsel — ohne Browser | 76 |
| `rechnen` | Gültige Nullwerte und fehlende Defaults, unveränderte gespeicherte DB-Deltas trotz Sliderwechsel, einmaliges Runden neuer Deltas, zentrale Periodenquelle, H2H-Invalidierung bei Add/Edit/Hidden/Delete, Kalenderwechsel ohne neue Partie, identische Erwartung in Engine, Duo, Rollenwert und Badge-Trigger, Prestige-Gruppensummen und -Gesamtzahl sowie dieselbe Restverteilung in Laufbahn und Story — ohne Browser | 36 |
| `zeichen` | Feuer, Sterne, Wappen, Insignium-Leiter, die Aura der Meistertitel — mittig, ganz hinten, mit jedem Titel heller und ohne Licht im Gesicht —, Profilkopf, der gerechnete Reif und die Lage der verwiesenen Zeichnung, die 21 Zeichnungen der Leiter: mittig, spiegelgleich, mit freiem Loch, dem Reif auf derselben Höhe und nichts am Rand der Zeichenfläche, die Rangfarbe im Stein und die Lilie aus Metall, das Feuer der Ranglistenzeile in derselben Rangfarbe und mit demselben hellen Kern wie im Profil — **im echten Browser gemessen** | 89 |
| `blatt` | Wem eine Wischgeste gehört, Laufbahn-Vitrine, das lesbare Regel-Popup und nachvollziehbare Chronik-Herunterrechnung, Wappenverläufe, Hintergrundtakt, Rekorde-Reiter, Tafel und spannendste Tageskarte, Story-Blätter, Rubrikband, Motive, ruhige Farbfamilien samt typ-eigenem Schimmer, Sorten, Ränder, Bewegung, Breaking, Chronik-Matrix, Leiter, gemeinsame Erfolge sowie Rollen-Gewichtung, Rangfarbe und Positionsstrahl bei 360 px, die Karte zweier verdrängter Ergebnisse, die Höhe einer großen Sammelkarte, der gemeinsame Breaking-Moment, der Inhaltstausch am Ende des Zuschiebens, das Wappen als Verweis auf sein Symbol und die Besitzleiste, die je Spieler dieselbe Zahl sagt wie das Podest, die fünf Kammern samt ihren Zählern und die Kammerleiste, die auf dem Telefon erreichbar bleibt, und die Bildzone jeder der zwölf Kartensorten, die der Schlagzeile nicht den Platz nimmt und ihr eigenes Bild nicht abschneidet, die Siegchance einer Partie auf ihrer Skala, die Elo-Wirkung je Spieler, das Blatt eines Tafel-Moments samt seiner Zahlenreihe und dem Weg zur nächsten Insignium-Schwelle, den Balken hinter jedem Verfolger, den Spieltag als Bahn, die Bildzone jeder Karte, den Balken, der aufwächst und bei Bewegungsruhe stillsteht, den Lichtlauf des Seltenen in seiner Familienfarbe, den Hinweis auf neue Stories mit Zahl, Lichtlauf und Ring, den Sieger im Verlauf hell unter seinem Tag und die Bilanz eines Duos als Balken, den Feed, der zuerst die oberen Tage zeichnet und den Rest nach dem ersten Bild nachreicht, die Anlass-Zeile eines gebündelten Breaking samt ihrer eigenen Kante und Fläche, und jedes Story-Blatt und jede Karte bei 360 px, jeden Reiter bei 360 px ohne Überlauf, jedes Gesicht mit mittigen Initialen, das Komma jeder Dezimalzahl in Reitern und Blättern, die Bilanz einer Ranglistenzeile und jeden Reiter, die nicht umbrechen oder abgeschnitten werden, jedes Blatt, das nicht über seinen Innenrand läuft und keine Achsenbeschriftung übereinanderlegt, jedes Gesicht in einem Blatt mit Größe, das Blatt einer Partie mit Siegern, Siegchance, einer Zeile je Spieler und Namen, die ins Profil führen, die Beziehung unter den Wappen eines Story-Blatts, die etwas sagt, das Blatt einer Serie am Stand ihrer Partie, jeden Kachelnamen ungekürzt und ohne ein Wort, das mitten durch bricht, den Feed, der Karten außerhalb des Bildschirms erst beim Hineinscrollen legt, dieselbe Sache unter demselben deutschen Namen ohne Anrede, den Knopf „Match eintragen", der auf der Match-Seite fehlt, jedes Award-Blatt mit ausgeschriebener Einheit, einer Serie ab dem zweiten Ergebnis, dem eigenen Stand zuerst, derselben Zahl für dieselbe Überraschung und derselben Spitze wie im Profil, und die Nebenwertungen der Liga und die zwei Aufstellungen eines Duos, die nicht abgeschnitten werden oder über den Rand laufen, den Schlitten jedes Segmentwählers unter seiner Wahl, der nach dem Neuzeichnen gleitet und bei Bewegungsruhe springt, und den Monat als Zellen, und jedes Blatt mit demselben Kopf, Schließen und höchstens einem gefüllten Knopf, die Bühne mit Gesichtern, den Hinweis mit Rolle und Rückgängig und die Bestätigung mit dem sicheren Knopf links, den Glanz, der nur dem Titel gehört und bei Bewegungsruhe ruht, und den Faden, der in seiner Karte bleibt, und den Faden, der öffnet, wohin er zeigt — **im echten Browser gemessen**, und die ganze Leiter in der Laufbahn, deren Felder die Vitrine auf ihre Stufe stellen, und die Meisterbühne bei 360 px, deren Strahlenkranz hinter dem Podest liegt und bei Bewegungsruhe mit den Linien stillsteht, und jedes Insignium in Liga, Positionen, Awards, Rekorden, Profil, Laufbahn und Feed, das unter keinem Filter und keiner Skalierung liegt und groß als Vektor, klein als Bild steht — auch die einundzwanzig Felder der ganzen Leiter —, und den Verlust in der Wirkung auf die Laufbahn: ein rotes Stück im Balken, ein Minus, der Fall unter die Schwelle und der geteilte Rekord, und jedes Wappenbild unter einer kurzen Adresse, und die Aura im Profilkopf, die einmal steht und nur transform und Deckkraft bewegt, und jede Karte am Spieltag und jede Runde, auf der kein Text auf einem anderen oder einem Gesicht liegt, keiner hinausragt, abgeschnitten, mit „…" gekürzt oder unter 8 px geschrumpft ist — im Feed und mit Grenzwerten und langen Namen bei 288 und 360 px, und die Einblicke als Zeile, die erst beim Aufklappen zeichnet, die Siegchance unter der Score-Karte, jede Begegnung im Direkten Vergleich, Woche und Tag im Rückblick samt dem Knopf der Story, die Kammerfelder und die Besitzleiste in ihrer Karte und den Positionsverlauf mit dem Titelrennen unter der Rangliste, und das Blatt einer Partie und ihres Bündels mit der Zeichnung der Karte als Bühne, ohne zweiten Stand, zweite Siegchance oder zweite Elo, ohne den Satz aus Siegchance und Elo, mit jeder übrigen Zeile des Bündels und mit den direkten Duellen aus den rohen Partien, und den Positionsverlauf als Kurven mit der Tabelle des letzten Stands, deren Bewegung aus den rohen Plätzen nachgerechnet wird, ohne Hinweis und ohne gekürzten Namen, und dem Platz an jedem Tag erst nach der Wahl, und jedes Fun-Fact-Bild, das bei 288 und 360 px in seiner Karte bleibt, und die Ruheständler am Ende von Gesamt, Positionen und Teams: nur dort, zu und ohne Inhalt, aufgeklappt ohne Platz und ohne Überlauf bei 360 px, und zwei Einblicke im selben Reiter, die beide offen bleiben, und den Abschied bei 360 px mit allen Abschnitten, ohne Überlauf, ohne gekürzten Text und mit einer Marke aus Metall, samt seiner Breaking-Karte im Feed, und den Tafel-Moment bei 360 px mit seiner Achse ohne Gesichter und Zeilen, die das Blatt ihres Rekords, ihrer Chronik oder die Laufbahn öffnen, und das Blatt „Spieler entfernen", das bei Partien nicht löscht, sondern Karriereende und Ausblenden anbietet | 237 |
| `archiv` | Einfrieren abgeschlossener Monate und den Profileintrag, der daraus gelesen wird | 9 |
| `ruhestand` | Das Karriereende an den echten Partien: keine rohe `hidden`-Abfrage außerhalb der Regel, Ewige Tafel, Gesamt, laufender Monat, Positionsverlauf, Liga-Rekorde, Monatschronik, Awards und Prestige-Rang ohne den Ruheständler, abgeschlossene Monate mit Chronik, Rangliste, Statistik, Awards, Verlauf und Meistern unverändert, Rang, Perzentil, Prestige und Rekorde wie beim Abschied — auch nach Partien anderer und nach frischem Start —, ein Schnitt am Karriereende, der aus der aktiven Liga kommt und nicht aus der Zeitmaschine, und die Rückkehr, die die Rekorde gegen das Feld von heute neu rechnet und Auszeichnungen und Chroniken behält — dazu kein Feuer und kein Serienring an seinem Wappen und seine Duos, die nicht in der Teamliste stehen, sondern am Ende, jede Auszeichnung der Liga unverändert, die Breaking-Story des Karriereendes mit denselben Partien wie der Abschied, die Karte, die mit einem zurückgenommenen Karriereende verschwindet, und keine neue Story danach, die ihn nennt, und das Löschen nur ohne Partie — gefragt bei der Datenbank, auch wenn die geladene Liste leer ist, und ohne ihre Antwort gar nicht | 47 |
| `backup` | Export und Wiederherstellung, braucht Chromium | — |

Ohne Browser steigt `backup` mit Code 2 aus und wird als *übersprungen*
geführt — sichtbar, aber nicht rot.

`leistung` und `mobil` brauchen ebenfalls Chromium. Zeitmessungen stehen bewusst nicht
als harte CI-Grenzen in der Suite: sie prüft Arbeitsmenge und Gültigkeit.
`node tools/performance.cjs --profil` misst dagegen kaltes und wiederholtes
Rendern mit den echten 466 Fixture-Partien, lokal ohne Backend. Details und
Vergleich stehen in `PERFORMANCE.md`.
`--cpu=4 --mobil` ergänzt CPU-Drosselung, Bildabstände und Longtasks als
Annäherung an schwächere Telefone, nicht als Garantie für reale Geräte.
`node tools/interaktion.cjs --cpu=4` misst ergänzend schnelle Score-Tipps,
Suchbuchstaben, kalte und schnelle Reiterwechsel sowie den Blattzug. Eingaben
sind synthetisch gequeued; rAF-Gelegenheiten sind weder Hardware-FPS noch INP.

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

- **§C25 Farbgesetz.** Status- und Wertfarben haben vier feste Rollen:
  1. Rangfarbe = „ich"
  2. Gold = Titel und heute gehaltene Rekorde
  3. Grün/Rot = ausschließlich Richtung
  4. Metall = alles Übrige
  Der News-Feed setzt daneben eine **leise Navigationsschicht**, keine neue
  Wertung: Rubrikgold bleibt Spieler des Tages und Woche vorbehalten; die
  Karte des Tages trägt Gold nur als übergeordneten Auswahlschimmer. Kühles
  Metall führt durch Ewige Tafel und Bestmarken, Violett durch Insignien und Auszeichnungen,
  Grün durch positive Spieltagsdynamik, Bronze durch das direkte Duell und
  Rot durch Breaking oder eine negative Richtung. Fun Facts bleiben die
  leiseste Kartenform, tragen innerhalb davon aber einen kleinen Farbschnitt:
  Blau für Liga/Chronik, Violett für Spieler/Laufbahn/Auszeichnungen, Grün
  für Form und Bronze für Duelle.
  Diese Farben sitzen nur an Kante, Rubrik, Zeichen und einem schwachen
  Schimmer; alle Kartenflächen bleiben dunkel. Zwölf eigene Vollfarben wären
  ein Regenbogen, eine einzige Goldfamilie machte dagegen jede zweite Karte
  zum vermeintlichen Titel.
  Im Rekorde-Reiter heißt das: Können, Aktuelle Form und Bestmarke tragen
  Gold, die Fügung Metall [§C35] — sie zeichnet niemanden aus —, die
  Schattenseite Rot. Als alle Karten golden waren, sagte Gold dort nichts
  mehr. Fünf Kammern tragen deshalb drei Töne und nicht fünf: eine neue Farbe
  je Kammer wäre ein Regenbogen, und das Farbgesetz kennt vier Rollen.
  Das gilt auch für die **Beinamen-Pille im Profilkopf**: „Der Gestrandete"
  kommt aus der Durststrecke und stand golden unter dem Namen wie ein
  Titel. Die Ausnahme gab es für die Zelle der Matrix und die Plakette seit
  jeher, nur die Pille war nie davon erfasst.
  **Was negativ ist, trägt Rot und zählt nicht als Rekord** (`neg`, gesetzt
  von `art:'schatten'` oder `negativ:true` im Katalog). „Die bitterste
  Pleite" stand im Profil golden zwischen den Titeln und machte aus sechs
  Rekorden sieben; sie steht dort jetzt rot, hinten und außerhalb der Zahl,
  und `nextRecordFor` schlägt sie niemandem als Ziel vor.
  **Gezählt wird sie an keiner Stelle** (`rekordZaehlung`): die Besitzleiste
  des Rekorde-Reiters zählte sie mit, Podest und Profil nicht, und damit
  standen zwei Zahlen unter demselben Wort — Martins Säule sagte 13, seine
  Podestkarte „10 Rek.". Die Regel steht deshalb in der Zählung und nicht
  dreimal im Aufruf [§C27]; sichtbar bleibt die Schandtafel in ihrer Kammer.
  `tests/blatt` hält Leiste und Podest je Spieler aneinander — eine Summe
  stimmt auch dann, wenn zwei Spieler ihre Zahlen tauschen. Die **Kammer**
  bleibt davon unberührt — sie steht als `data-kammer` an der Karte, nicht
  als Farbklasse, weil eine Fügung rot sein kann und trotzdem eine Fügung
  bleibt — und `art` auch, sonst verschöbe sich das Prestige [§C34].
- **§C27 Ein Bauteil, überall dasselbe.** Derselbe Spieler sieht in
  Rangliste, Positionen, Awards, Team-Blatt, Podest und Profil gleich aus.
  Das Wappen ist `.rav` (`insAvWrap`), das Podest ist `.podest`/`.pod-karte`
  (`_chronPodestHtml` zeichnet es für Monats- und Rekord-Blatt aus derselben
  Reihenfolge — zwei Podeste für dieselbe Aussage wären eins zu viel; den
  Platz nimmt es aus dem Wert (`_chronPlatz`), nicht aus der Reihenfolge:
  die zwei punktgleichen Halter von „Der Unaufhaltsame" standen als 01 und
  02 da, während die Notiz darunter „punktgleich" sagte),
  die Segmentwähler sind `.ui-switch` (äußere Ebene: eine Wanne, in der ein
  Schlitten zur Wahl gleitet) und `.ui-tabs` (innere Ebene: eine Grundlinie,
  unter der der Strich wandert), das Rangabzeichen ist `.rangab`
  (`rankBadgeHtml`), und wer die Karte des Tages tragen darf, sagt
  `_newsTagKarteWuerdig` [§C33].
  **Die Wahl fährt.** Lage und Breite des Schlittens rechnet das CSS aus
  Zahl und Lage der Knöpfe (`:has`, `--n`, `--i`); weil jeder Wechsel die
  Ansicht neu zeichnet, merkt sich der Druck auf einen Knopf die alte Lage,
  und `schlittenFahren` (aus `render` und `openSheet`) lässt ihn von dort
  anfahren — sonst spränge er. Die Box behält ihre feste Lage und Breite;
  ausschließlich `transform` verschiebt sie. Animiertes `left`/`width`
  löste sonst in jedem Bild ein neues Layout aus. Der Test misst die echte
  Lage einschließlich Transformationsmatrix, nicht nur den CSS-Startpunkt.
  Ein Wähler mit verschieden breiten Knöpfen
  trägt `.roll` und seinen Strich am Knopf; dort kann nichts gleiten. Der
  äußere Wähler ist die erste Wahl einer Seite: in der Liga der Zeitraum,
  der vorher als innere Ebene gleichrangig über „Spieler · Teams" und der
  Metrik stand. Der Monat steht darunter als Reihe aus Zellen, eine je
  Tag: gespielt hell, ohne Partie leise, heute gerahmt — der Balken zeigte
  nur, wie viel Kalender vergangen ist. Gezählt wird nach Kalendertag
  (`tagKey`), über Millisekunden verrutscht ein Tag an der Zeitumstellung.
  Die untere Leiste trägt den gewählten Reiter in einer Pille, und die
  Titelmarke der Ranglistenzeile steht in ihrer Kachel.
  **Ein Gesicht hat eine Grundform** (`.av`). Es gab nur Regeln je Behälter
  — Ranglistenzeile, Duo-Chips, Rückblick —, und wo ein Avatar ohne eigenen
  Behälter stand, war er ein Blockelement: auf jeder Rekordkarte und in der
  Chronik-Matrix klebten die Initialen oben links und wurden abgeschnitten.
  Die Grundform zentriert; ein Behälter setzt nur noch Größe und Rundung.
  Wo keiner das tut, misst `--av`: unter 48 px fällt das Wappen weg
  (`insAvWrap`), und das Gesicht kam dabei ohne jede Größe zurück — das Duo
  einer Durststrecke stand im Feed als „LMA" da.
  **Ein Award hat ein Zeichen** (`AW_IC`). Die Tabelle stand dreimal
  wortgleich in drei Funktionen, eine vierte im Duo-Blatt nannte zwei
  Zeichen, die es nicht gibt („Schlechtestes Team" und „Baustelle" standen
  ohne), und Rückblick und Liga suchten sich ihres selbst aus: Wochen- und
  Tageskönig trugen dieselbe Krone, der Pechvogel das Gespenst der
  schwächsten Bilanz. Auch der Name kommt von einer Stelle
  (`AWARD_META.title`); nur wo ein Drittel der Zeile nicht reicht, steht
  die Kurzform („Siegesserie", „Überraschung") — „Heißeste Serie" war ein
  dritter Name für dieselbe Liste. Und **ein Name gehört einer Frage**: der
  Award „Einzelkämpfer" (Siegquote als Stärkster der vier) hieß wie der
  Liga-Rekord, der den Rückgang der Mitspielerstärke misst, und heißt jetzt
  „Leitwolf". Torjäger, Pechvogel und Favoritenschreck teilen ihren Namen
  mit einer Chronik, weil sie dieselbe Idee auf zwei Zeitachsen messen. `tests/tafel` sieht nach, dass jedes
  Zeichen im Katalog steht.
  **Ein Knopf in einer Zeile ist so breit wie sein Wort.** `.btn` trägt
  `width:100%`, weil er meist allein steht; neben einem Text lief „Neu laden"
  damit 112 px aus den Einstellungen, und „Mischen" zog sich über die halbe
  Seite. `tests/blatt` zeichnet jeden Reiter bei 360 px ganz und misst beides.
  **Eine Animation endet, wenn sie endet** (`_afterTransition`). Beim
  Zurückgehen aus einem Blatt schiebt sich das Kind nach unten, der Inhalt wird
  getauscht, das Eltern-Blatt kommt hoch. Der Tausch hing an `setTimeout(200)`,
  und ein Timer ist nicht das Ende einer Transition: er läuft ab dem Aufruf,
  die Transition erst ab dem nächsten Style-Flush. Der Umbau des Eltern-Blatts
  fiel damit in die letzten Bilder des Zuschiebens und riss sie ab — gemessen
  kostet der Feed dabei über 100 ms Hauptthread, 94 % seines Markups sind die
  SVG der Wappen. `_afterTransition` horcht auf `transitionend` des eigenen
  Elements und hält einen Timer als Rückfall, denn eine Transition, die nie
  startet, endet auch nie. Je Element/Eigenschaft gehört genau ein abbrechbarer
  Abschluss zum aktuellen Übergang; Öffnen/Schließen oder ein neuer Übergang
  entfernt alte Listener und Rückfall-Timer. Doppeltes Schließen invalidiert
  keinen laufenden Leerschritt. Ein schon abgeschlossener Wisch leert sofort,
  ohne auf eine zweite, gar nicht mehr stattfindende Bewegung zu warten.
  Inline-Snap-/Swap-Dauern und Nudge werden nicht übernommen. Popover und
  gequeute News-Hinweise bleiben auch bei bereits geschlossenem Blatt erreichbar.
  `tests/blatt` und `tests/bewegung` messen Abschlüsse und verbleibende Arbeit.
  **Der Finger besitzt den Zug.** Eingabefelder und bereits gescrollte
  innere Listen gehören nicht der Schließgeste. Waagerechte/aufwärts gerichtete
  Gesten lösen den nicht passiven Zug-Lauscher. Gezeichnet wird nur der
  jüngste Stand einmal je Frame; Öffnen, Schließen, Abbruch oder ein zweiter
  Finger entziehen alten Bildern den Besitz und entfernen `is-dragging`.
  Wischgeschwindigkeit zählt die letzte kurze Strecke, nicht Gesamtweg geteilt
  durch die Zeit seit der letzten Bewegung. Pause, Mindestweg und langer
  langsamer Zug bleiben eigene Fälle. Bei Bewegungsruhe werden Blätter sofort
  getauscht/geleert. Nur Knöpfe verzichten auf die Doppeltipp-Zoom-Geste;
  Seitenzoom und natives Scrollen bleiben frei, Tastaturfokus ist sichtbar.
  Im Feed gliedert der **Tageskopf** (`.nf-tag`) die Tafel: Wochentag
  ausgeschrieben, Datum daneben, die Zahl der Karten rechts — und sonst
  nichts. Er trug zuerst die Schlagzeile der wichtigsten Karte, und
  die stand damit zweimal untereinander; danach die Bilanz des Tages und die
  Gesichter, die wiederholten, was die Karten darunter ohnehin zeigen: vier
  Wappen über vier Karten, auf denen dieselben vier Wappen stehen.
  Er ist eine **Marke auf dem Zeitstrahl, keine Karte**: mit Rahmen und Füllung
  sah er aus wie eine ungeöffnete Story und stand mit den Karten darunter auf
  einer Ebene. Sein `data-tag` trägt den Tagesschlüssel, damit sich prüfen
  lässt, ob an diesem Tag gespielt wurde — `_newsTagMs` beantwortet das,
  seit die Bilanz aus dem Markup verschwunden ist.
  Über jeder Karte steht das **Rubrikband** (`.nf-top`, `_newsRubrik`,
  `_newsSorteIcon`): Zeichen und Rubrik links, Uhrzeit rechts, wie in einer
  Zeitung. Vorher trug jede Karte eine gefärbte Pille mit dem Kategorienamen
  aus der Datenbank („Badge & Awards"), und zehn Pillen in zehn Farben
  untereinander waren ein Farbverlauf ohne Aussage. Das Band ist **leiser als
  die Schlagzeile** — es sagt, woher die Nachricht kommt, und überlässt ihr
  den Platz.
  Die **zwölf Kartenformen** (`.nf-s-spiel`, `-tafel`, `-ins`, `-held`, `-woche`,
  `-duell`, `-serie`, `-badge`, `-marke`, `-fakt`, `-spieler`, `-erfolg`,
  vergeben von `_newsSorte`) sagen vor dem ersten Satz, worum es geht: der **Kopf nach
  dem Anlass** (`_spBild`) beim Spieltag, die **Tabelle der Runde** bei dieselben
  Vier, das **Ergebnisband** (`_newsErgebnisBand`) über jeder anderen Karte
  einer Partie, der **große Wert** (`_newsWertBlock`)
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
  Die Sorte setzt dafür genau eine Familie über `--story` und `--story-rgb`:
  Gold für Tages-/Wochensieger, Silber für Tafel/Bestmarke, Violett für
  Laufbahn/Auszeichnungen, Grün für Spiel/Serie und Bronze für Duelle. Fakten
  greifen dieselben Familien als besonders schwachen Farbschnitt auf; ihre
  gespeicherte `ambientRubrik` setzt dazu Klasse und sprechenden Rubriknamen.
  Karten derselben Familie unterscheiden sich nur in der Stärke
  ihres Schimmers. Das hält den Feed ruhig und verhindert zugleich, dass
  Tafel, Insignium, Auszeichnung und Sammelkarte alle golden aussehen.
  **Jede Karte hat eine Bildzone.** Eine Karte, die nur aus Text besteht, ist
  eine Zeile in einer Tafel voller Zeichnungen — `tests/blatt` verlangt für
  jede Sorte mindestens eins der Bauteile dieses Abschnitts.
  **Die Bildzone macht die Karte nie höher als ihren Text.** Die beiden Wappen
  eines Duells standen übereinander in der linken Spalte und machten die Karte
  56 Pixel höher als ihr einzeiliger Satz; daneben war nichts. Sie stehen
  jetzt als Band über dem Text. Ein einzelner Wert stand als eigener Streifen
  im Fuß und füllte dort eine Zeile mit zwei Wörtern; er steht jetzt neben dem
  Wappen. Und der Serienlauf sagt rechts, was seine Punkte zählen — sonst war
  die halbe Bandbreite leer.
  **Und sie nimmt der Schlagzeile nicht den Platz.** Ein Wert UND ein Bild
  standen NEBENeinander, und die Spalte war damit so breit wie beide zusammen:
  gemessen 169 von 316 Pixeln, also 53 % der Karte, während die Schlagzeile
  auf 77 px zusammengedrückt wurde und mitten im Satz abbrach („Maxi, Julian,
  Jane und Johannes übernehmen „Der …"). Sie stehen deshalb **übereinander**,
  und dann ist die Spalte so breit wie das Breitere von beiden — gemessen
  23 %. Das gilt für beide Bildformen, die Chips einer Tafel-Karte und das
  einzelne Wappen einer Marke, wo Wappen und Elo-Wert nebeneinander 36 %
  nahmen; ein Duo bleibt ausgenommen, dort sind die zwei überlappenden Wappen
  selbst die Aussage. **Auch die Aufschrift zieht die Spalte nicht auf**: sie
  endet bei 72 px, weil „ELO VORSPRUNG" auf einer Karte ohne jedes Bild 28 %
  belegte. Der Name der Zahl bleibt trotzdem der der Kammer und nicht ihr
  Kürzel — „Marken" unter einem einzelnen Bestwert wäre eine Mehrzahl über
  einen Wert [§C35].
  **Ein Deckel schneidet ab, statt zu schrumpfen.** Die Chipgruppe trägt
  `flex-shrink:0`, und bei 72 px stand der Deckel mitten in ihr: zwei Wappen
  und ein „+2" sind 30 + 19 + 19 Pixel, und das dritte Zeichen war weg. Der
  Deckel liegt deshalb bei 81 px — 68 px Inhalt plus die 13 px des
  Trennstrichs. Gemessen wird nicht nur die Breite der Spalte, sondern ob ein
  Kind über ihren Inhalt hinausragt: eine Spalte, die ihre eigene Zeichnung
  abschneidet, ist so falsch wie eine zu breite. Gemessen wird in Prozent und nicht in Pixeln: die Karte
  ist auf jedem Telefon anders breit. `tests/blatt` stellt dafür jede der
  zwölf Sorten einmal — der Feed eines Zeitschnitts trug gemessen fünf davon,
  und gerade die Marke kam nicht vor.
  Im Satz stehen Ergebnis,
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
  **Karte des Tages** bewegt sich leiser: Ein goldener Auswahlschimmer wandert
  einmal alle sieben Sekunden durch ihr Band, der goldene Stern atmet und ein
  warmer Goldschein liegt wie bei Breaking hinter der gesamten Karte. Ihre
  eigentliche Familie bleibt gleichzeitig an Kante, Rubrik und Motiv sichtbar;
  eine Tafelgeschichte wird durch die Auswahl also nicht vollständig golden.
  Beides ruht bei
  `prefers-reduced-motion`, und `tests/blatt` misst das nach.
  **Dasselbe Licht liegt, wo Gold einen Titel bedeutet und EINER ihn trägt**
  (`glanzLauf`, `06-misc.css`): der Erste in Gold auf jedem Podest, der
  Spieler des Tages und der Woche im Feed, solange ungelesen, samt dem Kopf
  ihres Blatts, und der Held der Rückblicke. Nirgends sonst — ein Licht auf
  jeder goldenen Zahl wäre eine Kirmes, und Gold trägt nur, was selten ist
  [§C25]. Ein eigenes Pseudo-Element über der Box, ohne `overflow:hidden`:
  die Aura des Ersten leuchtet über das Podest hinaus und wäre sonst abgeschnitten.
  Anderthalb Sekunden Lauf, gut sechs Ruhe; bei Bewegungsruhe fehlt es ganz.
  `tests/blatt` misst, wer es trägt, wer nicht, und dass es ruht.
  **Das Seltene im Feed trägt einen leiseren Lauf in der Farbe seiner
  Familie** (`_newsGlanz`, `.nf-glanz`): Spitzenwechsel, übernommener Rekord,
  Insignium-Stufe, erster Chronik-Eintrag, seltene und legendäre
  Auszeichnung, eine Serie ab fünf und die Partie-Köpfe Medaille, Wippe,
  Premiere und Serienbruch. Bewegung hatten vorher nur Breaking, die Karte
  des Tages und die Sieger des Tages und der Woche; alles dazwischen stand
  still, und ein Spitzenwechsel sah aus wie ein gewöhnliches 10:7. Nicht in
  Gold — Gold gehört dem Titel —, nicht auf einer negativen Karte und nicht
  doppelt auf Breaking oder der Karte des Tages; alle elf Sekunden, versetzt
  nach der ID, damit nicht alle Lichter im selben Takt laufen. Gemessen
  tragen ihn zehn von 77 Karten des Fensters.
  **Der Hinweis „x neue Stories" ist ein Ereignis** (`_newsToastFuellen`):
  eine dunkle Pille mit Kante in Acid, die Zahl groß neben dem Zeichen der
  Nachrichten, ein Lichtlauf und ein Ring, der beim Erscheinen aufgeht. Er
  war eine flache grüne Pille in der Schrift jedes Knopfs, und in seinen vier
  Sekunden bemerkte ihn nicht, wer gerade woanders hinsah. Bei Bewegungsruhe
  steht er still.
  **Der Rand sagt, wie schwer eine Karte wiegt** (`--kante`, `--rahmen`): Nur
  Tages- und Wochensieger tragen die starke Goldkante; die Karte des Tages
  bekommt unabhängig von ihrer Sorte einen feineren Goldrahmen samt äußerem
  Schein. Alle anderen Sorten behalten eine ruhige Kante ihrer Familie. Der Fun Fact bleibt am leisesten, Rot
  bleibt der Richtung. „Wichtig" leuchtet und verbreitert nicht — als es die
  Kante auf vier Pixel setzte, trug ein Fun Fact denselben Rand wie ein
  Liga-Rekord.
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
  Jede Öffnung setzt den tatsächlichen Scrollbehälter `#nd` vor dem Markup auf
  null, auch dieselbe Story und ein Faden aus dem offenen Detail; der Feed
  darunter bleibt an seiner Stelle. Nur sichtbare Bausteine werden gebaut:
  eigene Bühnen brauchen kein verworfenes Ergebnisband, gruppierte Listen
  keine zweite flache Liste und Matchbündel nur die tatsächlich gezeigten Zeilen.
  **Das Blatt setzt fort, was die Karte angefangen hat**: dieselbe Rubrik,
  dasselbe Motiv, dieselbe Zeichenkachel, dieselben fetten Akzente, dazu eine
  Haarlinie und einen schwachen Flächenschimmer in der Farbe der Sorte am
  Kopf. Auch eine negative Serie bleibt nach dem Öffnen rot. Sein Kopf trägt das
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

  **Das Blatt einer Partie aus dem Verlauf nennt, wer gewonnen hat**
  (`showMatchDetail`). Dort stand „Team A gewinnt", und die Siegchance vor
  dem Anpfiff gab es nur nach Aufklappen der Elo-Analyse. Sie steht jetzt
  unter der Bühne, aus derselben Quelle wie die Karte der Partie im Feed (die Erwartung
  der Elo-Bahn, dahinter `exp_a`). Die Auszeichnungen stehen einmal je
  Spieler: fünf Marken zweier Spieler waren fünf Karten mit dreimal
  demselben Namen. Und die vier Namen der Elo-Liste führen ins Profil — von
  dort ging es nur zum Duo weiter.
  **Das Blatt einer Partie zeigt, was in ihr zu sehen war** (`_ndBuehne`,
  `_ndChanceSkala`, `_ndEloWirkung`, `_ndDuelle`, `_ndTagLeiste`,
  `_ndVerteilung`). Oben steht die **Zeichnung der Karte als Bühne**: das
  Blatt zeigte einen nackten Stand und zwei Wappen mit „gewinnen diese
  Partie", und wer eine Karte wegen ihres Mosaiks öffnete, verlor das Bild.
  Darunter stehen Zeichnungen in fester Folge — die Aufstellung, die
  **Siegchance auf ihrer Skala** mit den drei Linien der Elo-Rechnung [§5.2]
  und dem Wort dazu, die **Elo-Wirkung je Spieler** als Ausschlag um die Null
  mit dem Rangwechsel dahinter, die **direkten Duelle** der Sieger gegen die
  Verlierer als Bilanz und Lauf, **der Tag** als Leiste mit dieser Partie
  gerahmt und **wie oft die Liga so ausgeht** als Säulen. Jede nur, wo die
  Bühne sie nicht schon zeigt: das Spielfeld trägt Siegchance und Elo, also
  nennt der Abschnitt darunter nur noch, wer in der Tabelle den Platz
  gewechselt hat, und als Abschnitt zeigt das Spielfeld nur die Aufstellung.
  **Kein Satz erklärt eine Grafik.** Der Abschnitt „Was dieses Spiel besonders
  macht" stand als „Außenseiter-Sieg · Die Rechnung stand dagegen" über einer
  Skala, die genau das zeigt; der Entwurf trug unter jedem Abschnitt eine
  Zeile Kleingedrucktes. Beides ist weg.
  **Ein Balken wächst, er erscheint nicht.** Eine Zahl, die man gezeichnet
  sieht, versteht man schneller; eine Zeichnung, die aufgeht, sieht man
  überhaupt. Bewegt wird nur Deckkraft und Höhe: die BREITE ist die Aussage,
  und wer sie animiert, misst während der Bewegung eine falsche Länge. Die Bahn
  läuft dazu von links auf, in Spielreihenfolge — so liest man den Tag in der
  Richtung, in der er passiert ist. Beides ruht bei `prefers-reduced-motion`,
  wie der Puls von Breaking und der Schimmer der Karte des Tages.
  **Der Spieltag steht als Bahn, nicht als Wand** (`_ndTagesbahn`). Das Blatt
  des Spielers des Tages zeigte jede Partie als vollen Vs-Block: vier Wappen,
  zwei Namenszeilen, ein Stand. An einem Tag mit zehn Partien sind das zehn
  solche Blöcke und vierzig Wappen — genau davor warnt „Detail folgt der
  Größe" [§6]. Die Bahn zeigt den Tag in einer Zeile: ein Feld je Partie, grün
  für einen Sieg, rot für eine Niederlage, in Spielreihenfolge. Darunter steht
  jede Partie kurz mit Uhrzeit, Stand und Gegner — der Beleg ohne die Wand.
  **Und ein Blatt, dessen Karte nur zwei Zahlen hat, zeigt sie gezeichnet.**
  Der Saisonstart nannte allein die Saison-ID — eine Zeichenkette, die
  niemanden interessiert —, obwohl die beiden an der Spitze, ihr Abstand und die
  Stichprobe im `dataRef` liegen: er zeigt sie als Vs-Block und Zahlenreihe
  [§C27]. Und der Serienbruch zeigt die gerissene Serie als **Lauf**
  (`_newsSerienBand`): acht ist eine Zahl, die Reihe zeigt, wie lang acht sind.
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
  **Die Award-Kachel ist EIN Bauteil** (`awKachelHtml`, `.aw-trophy`) und
  steht in EINER Vitrine (`awVitrineHtml`): im Awards-Reiter, im Award-Blatt
  des Profils und im Duo-Blatt. Das Profil baute zuerst die alte Fassung
  (`aw-trophy-cup`, `-plaque`), das Duo-Blatt eine dritte mit sechs
  Katalogfarben und „#2" als Platz. Die Kachel beantwortet drei Fragen in
  dieser Reihenfolge: **wer** hat es (Wappen, Name, Stichprobe), **wie
  viel** (Zahl mit ausgeschriebener Einheit, unten, damit die Zahlen einer
  Reihe auf einer Linie liegen), **woraus** (die Lage im Feld,
  `awFeldHtml`: jeder Eintrag der Liste als Punkt, die Halter in der Farbe
  der Kachel, die Mitte als Strich — eine Serie stattdessen als Lauf,
  `awLaufHtml`). Vorher stand die Zahl ohne Einheit da („6,90", „+10",
  „8er"), und die Stichprobe wurde gebaut und nie gezeigt. Gleichauf und
  „Platz 2" stehen als Marke AUF der oberen Kante: im Kopf nahm die Marke
  dem Namen ein Drittel der Breite, und „Tageskönig" brach mitten im Wort.
  Eine leere Kachel sagt, was fehlt (`AW_LEER`), statt einen Strich zu zeigen.
  **Und ihr Wert kommt aus EINER Tabelle** (`AW_WERT`, [§5.3d]): Liste,
  Sortierung, Zahl, Einheit, Stichprobe, Mindestbedingung (`gilt`) und die
  Art (`lauf`, `einzeln`, `gegner`). Kachel, Award-Blatt, Profil,
  Duo-Blatt, Award-Sammler und Saison-Rückblick lesen daraus
  (`awListe`, `awTop`, `awRang`, `awText`, `awNeg`); vorher standen dort
  vier Sortier- und fünf Anzeigetabellen, und dieselbe Serie hieß „8",
  „8er", „8er Serie" und „8 Siege in Folge". Wer einen Award hinzufügt,
  trägt ihn in `AWARD_META`, `AW_IC` und `AW_WERT` ein — sonst nirgends.
  `tests/tafel` hält Kachel und Profil an der Tabelle fest.
  Der Farbstich kommt aus **drei** Rollen und nicht aus sechs Katalogtönen
  [§C25]: `ton-pos` Gold für das Können, `ton-team` Blau für das, was zu
  zweit geholt wurde, `ton-neg` Rot für die Kehrseite. Die Töne stehen an
  der KACHEL, nicht am Behälter — im Profil-Sheet gibt es keinen gefärbten
  Behälter, und dort fiel die Farbe damit ganz aus.
  **Ein Zeichen mit Fläche steht in der Zeichenkachel** (`zkHtml`, `.zk`):
  drei Größen (28, 36, 48 px) und sechs Töne nach den Rollen des
  Farbgesetzes, ohne Ton Metall. Vorher baute jede Ansicht ihren eigenen
  Kasten um ihr Zeichen.
  **Eine Behauptung hat einen Beleg** (`belegHtml`, `05b-recap-teile.js`).
  Rekord-, Award-, Chronik- und Rekord-Story-Blatt belegten ihren Wert mit
  einem Satz; „72 %" aus fünfzig und aus fünfhundert Partien standen gleich
  da, und ob der Zweite knapp dahinter liegt, stand nur in der Liste. Vier
  Formen in fester Reihenfolge, jede nur, wo sie etwas sagt: **Woraus** (die
  Stichprobe als Zellen, eine je Gelegenheit, aus dem „x von y" des Belegs —
  ohne das fällt die Form weg, statt eine zu erfinden), **Wo im Feld**
  (`belegFeldHtml`: jeder im Rennen als Punkt, der Halter golden, die Mitte
  als Strich, darunter der Zweite in einem Satz; die Award-Kachel zeichnet
  dasselbe Bauteil in ihrer Rollenfarbe), **Wie knapp** (`belegLuftHtml`:
  wie viele der eigenen Ergebnisse anders hätten ausgehen müssen, damit der
  Zweite gleichauf läge — als große Zahl, als Zellen, als Wort von
  „hauchdünn" bis „deutlich" und als zwei Balken; nur, wenn der große Wert
  selbst ein Anteil ist und es einen Zweiten gibt. Dort stand vorher die
  Spanne um den Anteil, Wilson mit 90 %, und darunter „wären ein paar
  Partien anders ausgegangen, läge der Wert wohl irgendwo zwischen 36 und
  57 %" — richtig gerechnet und eine Frage an den Leser; eine Zahl, die man
  abzählen kann, beantwortet sie) und **Wie es dazu kam**
  (`rekordVerlauf`: Halter und Zweiter an den letzten sechs Monatsenden und
  heute, mit „vorn seit"). Der Fuß des Rekord-Blatts führt ins Profil des
  Halters und nennt ihn auf dem Knopf; „Direkter Vergleich" öffnete die
  Bilanz von Halter und Zweitem gegeneinander, die mit dem Rekord nichts zu
  tun hat. Gerechnet wird nichts Neues: die Zahlen kommen aus
  dem Katalog, aus `chronicleRang`, aus `AW_WERT` und aus dem Zeitschnitt.
  Das Story-Blatt eines Rekords zeigt nur, woraus der Wert der KARTE
  besteht — ihren gespeicherten Beleg, nicht den von heute.
  **Ein Blatt hat einen Kopf, einen Fuß und einen Weg hinaus.** Der Kopf
  (`blattKopfHtml`) ist die Zeichenkachel in 48 px in der Farbe der Rolle,
  der Titel und darunter Zeitraum und Art. Es gab fünf Köpfe: ein
  leuchtender Kreis über der Mitte im Award-Blatt, ein nackter Titel im
  Rekord-Blatt, ein Kasten mit Zeichen im Chronik-Blatt, ein 48-px-Gesicht
  neben „Awards" im Profil, der Stand als Überschrift im Blatt der Partie.
  Blätter über einen Menschen (Profil, Duo, Direkter Vergleich, Rückblicke,
  Stories) behalten ihren Heldenkopf: dort ist das Gesicht die Überschrift.
  Der Kopf eines Abschnitts ist `blattAbschnittHtml` — Zeichen, Name, rechts
  worauf er sich bezieht —, der Fuß `blattFussHtml`: höchstens zwei Knöpfe,
  der wichtigere gefüllt. Den Knopf zum Schließen setzt `openSheet` in eine
  Leiste, die beim Scrollen oben bleibt; vorher schloss ein Blatt nur durch
  Wischen oder einen Knopf, den es selbst baute oder nicht.
  **Eine Partie steht auf der Bühne** (`buehneHtml`): die Sieger links und
  hell, die Verlierer leiser, der Stand in der Mitte, darunter Zeit, Abstand
  und Siegchance — im Award-Blatt einer Partie, bei den Erzfeinden (dort die
  Siege gegeneinander) und im Blatt der Partie. Im Award-Blatt standen die
  Teams als Farbbalken über die volle Breite: `.aw-mini-av` hatte keine
  einzige Regel.
  **Der Hinweis trägt seine Rolle** (`toast`): die Zeichenkachel statt einer
  vollen grünen oder roten Fläche, eine zweite Zeile mit der Wirkung, und
  nach dem Speichern einer Partie „Rückgängig" (`partieLoeschen`, dieselbe
  Stelle wie das Löschen im Blatt). **Die Bestätigung** (`bestaetigen`)
  ersetzt `confirm()`: sie nennt, was verloren geht, der sichere Knopf steht
  links und der zerstörende rechts und rot.
  **Die Kennzahlen des Duo-Blatts sind gezeichnet** (`.duo-kz`): die
  Siegquote jede Partie als Zelle, die Torbilanz je Partie auf ihrer Skala,
  die Elo mit ihrem Verlauf, die laufende Serie als Lauf. Vorher standen
  vier Kästen in vier Farben, darunter die Quote noch einmal als Balken, drei
  Kästen „Serien" und ein Form-Verlauf, dessen Endwert die Elo aus dem
  Kasten war.
  **Ein Zeichen hat einen Strich.** Die Strichstärke steht in EINER Regel
  (`svg[viewBox="0 0 24 24"]`, Token `--strich`); ein Behälter setzt
  höchstens `--strich` — 1,75 ab 18 px, 1,4 für das leise Motiv der
  Stories, sonst 2. Sie stand an 78 Stellen in 13 Werten zwischen 1 und 3,4,
  und ein `stroke-width` am `<svg>` im Markup setzte 2,5 neben 2. Die Regel
  schlägt das Markup, runde Enden und Ecken kommen mit. Diagramme und die
  Sterne des Zeichens [§C26] zeichnen nicht im 24er-Raster und sind davon
  ausgenommen. `tests/tafel` zählt nach.
  **Der Strahl im Positions-Profil gehört der Seite, die überwiegt.** Er
  lief immer von links und war so lang wie der Sturmanteil; bei 29 zu 71
  zeigte er damit die kleinere Hälfte und las sich wie ein
  Fortschrittsbalken, der fast leer ist. Sturm beginnt links, Abwehr rechts,
  ein Flex-Profil liegt als ruhiger Kern in der Mitte. Der Knopf bleibt an
  der Grenze zwischen beiden — die ist die Aussage.
  **Die stärkere Rolle trägt ihre Farbe, die schwächere steht zurück**
  (`.pp-rd.stark` / `.schwach`). Beide gleich laut gezeichnet sagten nicht,
  worin jemand besser ist, und genau das beantwortet diese Karte. Bis drei
  Prozentpunkte Abstand gelten beide als neutral. Die Nebenrolle bleibt mit
  78 % Deckkraft lesbar, die starke Rolle bekommt nur einen kleinen Schein;
  auch Abwehrdominanz behält die Rangfarbe statt auf Metallgrau zu fallen.
  **Ein langer Wert in der Zahlenreihe wird kleiner, nicht breiter.**
  „Schattenseite" maß gerendert 104 px in einer 88-px-Zelle und lief in die
  daneben, in der der Ausschlag steht. Zwei Stufen (`.lang`, `.sehrlang`)
  reichen; `tests/blatt` misst jede Chronik des Katalogs nach.
  **Die Kachel misst am Reif, nicht am Gesicht** — der Avatar ist 46 % von
  `--rav`. Wer ein 40-px-Gesicht ersetzt, braucht 87 px Kachel, nicht 40.
  Unter 48 px bleibt vom Zeichen nichts übrig; 52 px sind das Maß der
  Ranglistenzeile und die Untergrenze.
  **Das Banner trägt es nur, wo ein Spieler allein und groß steht:**
  Profilkopf, Podest der Ewigen Tafel, Podest der Award-Sammler, die Karte
  des Spielers der Woche und des Tages, das Podest im Saison-Rückblick.
  Aura, Raute und Sterne erzählen von der LAUFBAHN; in einer Zeile fehlt ihnen
  die Höhe, und in einem Team-Blatt handelt die Seite vom Duo, nicht von
  den Titeln eines Einzelnen.
  Das Insignium hat drei Teile, die in jeder Stufe an derselben Stelle
  stehen: den **Reif** um das Gesicht, den **Kopf** auf zwölf Uhr und die
  **Raute** am Fuß (`_insFuss`) — daran bleibt die Familie erkennbar, auch
  wenn der Schmuck dazwischen vollständig wechselt [§C30].
  **Der Platz im Feed ist der der GESAMTLIGA** (`_newsGesamtrang`). Die Zahl
  kommt aus `careerElo` und ist damit der Rang unter dem Zeitraum „Gesamt"
  des Liga-Tabs, nicht der der laufenden Saison — beide können weit
  auseinanderliegen. Als „Rang 7 in der Liga" auf einer Karte über einen
  guten Spieltag stand, behauptete sie das Gegenteil dessen, was gerade
  passiert war: derselbe Spieler war in diesem Monat Zweiter. Gerechnet wird
  es an EINER Stelle; die Zeile im Blatt rechnete es ein zweites Mal nach.
  **Zwei Rechnungen über dieselbe Frage werden aneinandergehalten.**
  `longestStreaks` trägt die Bestenliste des Awards-Tabs, `longestPlayerStreak`
  den Wert einer Auszeichnung — zwei Durchläufe über die längste Siegesserie.
  Sie zusammenzulegen kostet mehr, als es bringt: die Liste rechnet alle
  Spieler auf einmal, das Badge fragt je Spieler, und das wäre in der
  Badge-Schleife quadratisch. Also bleiben beide, und `tests/tafel` hält sie
  aneinander. Wo eine Zusammenlegung nichts kostet, gilt weiter: es gibt sie
  nur einmal.
  **Die Elo-Rechnung zieht ihre Grenzen an einer Stelle** (`expected`,
  `CHANCE_FAVORIT`, `CHANCE_OFFEN`, `CHANCE_UPSET`, `CHANCE_SENSATION`,
  [§5.2]). Die Erwartungsformel stand zweimal da — `expected` und ein
  wortgleiches `localExp` in der Elo-Engine —, und die vier Linien als blanke
  Zahl an zehn Stellen: Favorit ab 55 %, Augenhöhe 45 bis 55, Außenseiter-Sieg
  unter 35, Sensation unter 20. Die 0,35 stand in der Auszeichnung „Upset
  King", in der Award-Kachel und in BEIDEN Chronik-Durchläufen — vier Stellen,
  die dasselbe Ereignis zählen [§10.2]. Und die 0,20 trennt zwei Kartensorten
  des Feeds, die sich sonst doppeln: unter 20 % erzählt der Favoritensturz, von
  20 bis 35 die Ergebniskarte; blank nebeneinander war ihre
  Zusammengehörigkeit nicht zu sehen. Ob die Linie selbst dazugehört, ist je
  Wertung kalibriert und bleibt es: „Der Favoritenschreck" verlangt
  „mindestens 65 Prozent für die Gegenseite" und zählt `<=`, der
  Außenseiter-Sieg zählt `<`.
  **Ein Kalendertag hat eine Schreibweise** (`tagKey`). „Welcher Tag ist
  das?" stand zwölfmal ausgeschrieben im Code, und in zwei Schreibweisen:
  mit führender Null („2026-08-06") und ohne („2026-7-6"). Einmal hat sich
  das gekreuzt — ein Deckel-Schlüssel wurde mit der kurzen Fassung gebaut
  und mit der langen abgefragt, fand nie eine Partie, und die Regel „kein
  Spieltag bleibt ohne Karte" griff nie; der Ausweg war damals ein zweiter
  Aufruf daneben statt einer Schreibweise. Ortszeit, nicht UTC: der Feed
  gruppiert nach Kalendertagen, wie sie auf der Uhr des Lesers stehen —
  `matchesByDay` schlüsselt bewusst nach UTC und ist deshalb etwas anderes.
  `tests/tafel` zählt die Stellen im gebauten Stand nach, weil sich jede
  neue sonst wieder selbst eine aussucht.
  **Und eine Uhrzeit hat einen Formatierer** (`datumFmt`): `toLocaleDateString`
  mit Optionen baut bei jedem Aufruf einen neuen, und im Feed lief das je
  Karte mehrmals — gemessen 16 ms für die Uhrzeit allein beim Öffnen.
  Uhrzeit, Tag und Monat, das kurze Datum und der Wochentag gehen durch einen
  gemerkten; `tests/tafel` zählt die Stellen, die ihn selbst bauen.
  **Eine Zahl und ein Name haben je eine Form.** Eine Dezimalzahl trägt ein
  Komma (`komma`) — acht Belege des Katalogs und acht Fun Facts schrieben
  „6.9 Gegentore" mit englischem Punkt mitten im deutschen Satz, und ein
  Absturz stand als „-308 Elo" unter einer Bedingung, die „mindestens −150"
  schreibt. Dasselbe galt außerhalb des Feeds an neunundvierzig Stellen: „4.00
  Gegentore" in der Betonmauer, „Ø 8.8" in der Positionsliste, „+1.5 Elo" in
  den Einstellungen, jede Kachel der Rückblicke. `tests/blatt` liest dafür den
  sichtbaren Text jedes Reiters und der Blätter mit Nachkommastellen.
  **Ein Stand gehört dem, der neben ihm steht** (`standFuer`): die eigenen
  Tore zuerst, ohne zweites Argument die der Sieger. Gespeichert ist er in
  der Reihenfolge der Eingabe, und sieben Stellen schrieben ihn so ab:
  „Stefan & Martin 8:10" in der Top-5-Liste der Überraschungen, der Krimi
  und der klarste Sieg der Wochenkarte, die hundertste Partie als Fun Fact,
  und in den letzten Spielen eines Duos stand neben dem roten Kreuz
  „10 : 8". Zwei weitere drehten ihn selbst um.
  Und **eine Überraschung hat eine Zahl**: die Siegchance der Sieger. Die
  Award-Kachel zeigte die der Gegenseite, 71 % gegen 30 % in Liga, Liste und
  Blatt. Im **Award-Blatt** trägt jeder Wert seine Einheit ausgeschrieben
  („Ø 6,5 Gegentore" statt „6,5 /Sp." und „9,7 Gegen/Sp.", „Player of the
  Day" statt „POTD"), eine Serie beginnt beim zweiten Ergebnis — „On Fire"
  listete „1er Serie", „Eiskalt erwischt" sieben Spieler mit „1er
  Niederlagen" —, und der Underdog-Held zeigt die Quote, nach der er sortiert
  ist: mit der Anzahl stand Platz 5 bei 2× hinter Platz 2 bei 1×, und das
  Profil kürte nach der Anzahl einen anderen Ersten als die Kachel.
  **Wer im Profil einen Award auf Platz 1 trägt, steht im Blatt oben**, und
  gleichauf heißt geteilt: vier Rivalitäten mit derselben Quote zählten
  Profil und Award-Sammler als geteilte Spitze für neun Spieler, die Kachel
  nannte nur die erste und das Blatt die übrigen als 2., 3. und 4. Die
  Kachel trägt jetzt „+3" wie jeder andere geteilte Award, und das Blatt
  nummeriert nach der Quote.
  Eine Aufzählung von Namen hat zwei Formen, und beide sind nötig:
  `_chronHolderNames` mit „&" für die schmale Zelle des Rekorde-Reiters,
  `_chronHalterSatz` und `_namenListe` mit „und" für jeden Satz. Im Fließtext
  stand „Martin & Julian hält den Bestwert mit 84 %" — das Zeichen als
  einziges im Satz, und das Verb im Singular über zwei Leute. Der Feed hatte
  daneben eine dritte, eigene Aufzählung (`_namesOf`), und der Spieler des
  Tages eine vierte.
  **Ein Raster teilt nach `minmax(0,1fr)`, nicht nach `1fr`.** `1fr` ist
  mindestens so breit wie sein Inhalt: die Beziehungskarten im Profil liefen
  mit „Schwächster Partner" 17 px in den Rand des Blatts, die Seitenkarten
  des Podests mit ihrem Wappen samt Banner 4 px, und die Quellen der
  Laufbahn standen als 115, 125 und 62 px nebeneinander. `tests/blatt` misst
  jedes Blatt am Innenrand — am Außenrand gemessen fiel nichts davon auf.
  **Ein Reiter nennt sein Wort ganz.** Fünf Reiter teilen sich 328 px, und
  in der Ewigen Tafel standen „Siegq…", „Torbil…" und „Prest…". Ab fünf
  Reitern wird die Schrift kleiner, und „Siegquote" heißt dort „Quote"
  (`METRIC_REITER`); unter der Zahl steht der volle Name. Dasselbe gilt für
  den Namen einer Award-Kachel: „Längste Siegesser…", „Größte Überras…" und
  „Schlechtester Spi…" standen gekürzt da. Die Sperrung ist enger, und zwei
  Namen sind kürzer und sagen dasselbe: „Schwächste Bilanz" (das Gegenstück
  zu „Beste Bilanz") und „Längste Pleitenserie".
  **Und ein langes Wort darin wird kleiner, nicht gebrochen** (`_awLblLang`):
  `overflow-wrap` hielt den Namen in der Kachel und brach ihn bei 360 px
  mitten im Wort („Unaufhaltsa|m", „Showmaste|r"), ohne Trennstrich, weil
  nicht jedes Telefon Deutsch trennt. Ab zehn Zeichen steht er in 10 px, ab
  vierzehn in 9. Dazu trug die nicht vergebene Kachel das Polster des leeren
  Zustands einer ganzen Ansicht: die Regel hieß `.empty` und traf jeden
  Baustein mit dem Zusatz „leer". Sie heißt jetzt `[class="empty"]`.
  **Eine Partie im Verlauf zeigt, wer gewonnen hat** (`vHistory`): Gesichter
  vor den Namen, der Sieger hell, der Verlierer leise, im Stand die Zahl des
  Siegers in Acid, und die Partien eines Tages unter einem Tageskopf mit
  ihrer Zahl, wie im Feed. Beide Teams standen weiß und fett nebeneinander:
  die Regel `.mteam .won` suchte ein Kind und traf nie, die Klasse sitzt an
  `.mteam` selbst. **Und ein Duo zeigt seine Bilanz als Balken** (`.tm-bar`),
  wie die Ranglistenzeile eines Spielers; „26–4" als Zahl allein ließ
  ausrechnen, ob ein Duo knapp oder klar vorn liegt.
  **Eine Bilanz ist eine Zahl und bricht nicht um.** In der Gesamtansicht
  der Liga stand „221–" über „134", in der Positionsliste „81–" über „40",
  und dahinter endete „Ø 8.8 T…" mitten im Wort. Die Tore je Spiel stehen
  in der Positionsliste deshalb in einer eigenen Zeile — wie die Formpunkte
  in der Liga.
  Der Saisonwähler (`.saisonwahl`, `saisonWaehlerHtml`) ist bewusst **keins**
  von beiden: er wählt weder Ansicht noch Filter, sondern den Zeitpunkt, von
  dem alles darunter handelt. Als `.ui-tabs` stand er zwischen zwei echten
  Reiterstreifen und war von ihnen nicht zu unterscheiden.
  **Eine Grafik über einer Rangliste ist eine Zeile, die aufklappt**
  (`einblickHtml`, `15b-einblick.js`): die Rollen-Landkarte über den
  Positionen, das Netz der Duos über den Teams. Als volle Karte nahm jede
  davon den halben Bildschirm über der Rangliste, und die Rangliste ist der
  Grund, warum man den Reiter öffnet. Gezeichnet wird erst beim Aufklappen;
  zu kostet der Einblick keine Rechnung. Im Liga-Reiter gibt es keinen: das
  Titelrennen der Saison war dieselbe Frage wie der Positionsverlauf, und der
  trägt es jetzt selbst — seine Karte unter „Mehr zur Saison" zeigt das
  Rennen der ersten drei (`saisonRennenHtml`, dasselbe Bauteil wie im
  Saison-Rückblick und im Blatt des Meisters) und öffnet beim Tippen den
  ganzen Verlauf; der Saison-Rückblick darunter ist eine schmale Zeile. Oben
  bleibt die Rangliste das Erste. Dieselbe Zeile trägt die Ruheständler
  [§C40] am Ende von Gesamt, Positionen und Teams.
  **Der Positionsverlauf liest sich als Tabelle über die Zeit**
  (`07-positionsverlauf.js`). Er zeigte gerade Linien, die sich in Spitzen
  kreuzten, die Namen mit „…" gekürzt neben dem Gesicht, einen Hinweis
  „Linie oder Gesicht antippen" und darunter einen leeren Kasten „Hier
  stehen die Einzelheiten". Jetzt laufen Kurven von Tag zu Tag, Platz eins
  liegt als goldenes Band darunter, die Tage mit Partie tragen eine Marke
  auf der Achse, und am Ende steht das Gesicht mit der Bewegung seit dem
  vorletzten Spieltag. Die Namen stehen ganz in der **Tabelle** darunter
  (`_posvTabelle`: Platz, Gesicht, Name, Verlauf klein, Bewegung, Elo); sie
  ist zugleich die Wahl des Spielers, also braucht es keinen Satz, der die
  Bedienung erklärt. Das Detail erscheint erst nach der Wahl: die Zahlen der
  Saison als Zahlenreihe [§C31], der **Platz an jedem Tag** als Zelle und
  die Partien als Lauf (`saisonZellenHtml`); darunter die Tage an der Spitze
  aus demselben Bauteil wie im Saison-Rückblick. `tests/blatt` rechnet die
  Bewegung aus den rohen Plätzen nach.
  **Eine Erklärung steht hinter einem Knopf, wenn sie länger ist als die
  Ansicht kurz** (`.kopf-info`): der Absatz über den Positionen nahm drei
  Zeilen vor der Liste ein. Er steht in einem Blatt hinter dem Zeichen neben
  der Überschrift, darunter bleibt eine Zeile.
  **Die Siegchance steht beim Aufstellen unter der Score-Karte**
  (`#chanceSlot`, `_matchChanceHtml`), sobald vier Spieler gewählt sind, aus
  derselben Rechnung, mit der die Partie danach gewertet wird
  (`computeMatch`), und ohne Satz, der sie erklärt — die beiden Prozente und
  „Favorit" sagen es selbst. In der Vorschau nach dem Stand stand sie ein
  zweites Mal und ist dort weg.
  **Der Direkte Vergleich zeigt jede Begegnung** (`h2hBegegnungenHtml`): die
  letzten vierzig als Balken je Partie, Höhe nach Tordifferenz, Farbe nach
  Sieger. Die Bilanz allein sagte nicht, ob sie aus einer Serie oder aus
  einem Hin und Her stammt.
  **Die Kammern des Rekorde-Reiters sind Felder, keine Leiste**
  (`.rek-kammern`): drei Spalten, 13 px und gut 35 px hoch. Als Leiste standen
  sechs Wörter in 11,5 px eng aneinander, und die letzten lagen hinter dem
  Rand. Die Besitzleiste darüber ist so hoch, dass Zahl, Säule und Gesicht
  in ihrer Karte bleiben; das Gesicht lief unten hinaus.
- **§C26 Das Zeichen.** Sterne = Ligatitel. **Höchstens fünf, dann die
  Zahl** — in beiden Formen gleich: unter dem Avatar in der Liste
  (`_znSterneSvg`, CSS), über dem Zeichen mit Band (`_insSterne`, im SVG).
  Zwei Formen für dieselbe Zahl wären eine zu viel [§C27]; die Stelle ist
  verschieden, weil mit Band der Fuß der Raute gehört [§C30].
  Mit Band liegen sie auf einem **festen Radius** um die Reifmitte, nicht auf
  dem Zeichen und nicht je Stufe woanders. Sie standen im verkleinerten
  Kasten der früheren Schwinge und landeten damit auf dem Kopf des Insigniums — Gold
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
  **Das Feuer trägt die Rangfarbe, überall** (`insAvWrap` setzt `--zn-c`):
  dieselbe Hülle, derselbe Schein in der Rangfarbe und derselbe helle Kern
  wie im Profilkopf. In der Rangliste brannte es orange mit warmem Kern und
  im Profil desselben Spielers in seiner Rangfarbe — zwei Bildsprachen für
  dieselbe Serie [§C27]. Die Zeile behält ihre eigene Geometrie, ihr Schein
  ist sogar kräftiger: von einem Feuer ist dort nur der Streifen über dem
  Reif zu sehen. `tests/zeichen` vergleicht die Füllung beider am Knoten.
  Über dem Zeichen hat der
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
  Und er trug erst elf Kategoriefarben, danach fast nur noch Gold. Jetzt
  entscheidet nicht die interne Datenkategorie, sondern die für den Leser
  sichtbare Kartenform über die ruhige Farbfamilie [§C25]. Die Kategorie ist
  nur noch ein Rückfallwert; Karte und Detailblatt leiten Kante, Rubrik,
  Zeichen und Schimmer gemeinsam aus `--story` ab.

  **Aktueller Snapshot-Vertrag (ersetzt die historischen Deckel- und
  Auffrischungsregeln in den folgenden Befundabsätzen):** Eine einmal in
  `stories` publizierte Zeile bleibt in ID, Text, Zeitpunkt, Priorität,
  Beteiligten und visuellen Daten unverändert. Gleicher Wortlaut, spätere
  Serienstände, weitere Partien sowie Tages-, Typ-, Spieler- oder
  Gesamtkontingente dürfen sie nicht entfernen. `_newsTexteAuffrischen` ist
  deshalb nur noch ein kompatibler Identitätsweg. `_consolidateStories`
  verdichtet ausschließlich verlustfrei; Gruppen tragen `memberIds` und die
  Snapshotdaten ihrer Mitglieder. Das DB-Fenster wird vollständig und
  seitenweise geladen, nicht auf eine feste Zeilenzahl gekürzt.

  **Eine Partie, eine Matchkarte:** Alle matchbezogenen Ereignisse mit derselben
  konkreten `matchId` werden gebündelt, auch Breaking, mehrere Auszeichnungsthemen
  und negative Ereignisse. Die negative Richtung gehört ihrer Zeile (`neg`),
  nicht einer zweiten Karte; Gewinner und Betroffene werden nicht verwechselt.
  Gruppenzeilen tragen die ursprünglichen `members`, Bundlezeilen deren
  `sourceIds` und unveränderte `ref`-Daten im Speicher. So bleiben IDs und
  Fakten auch nach einer Vorgruppierung auffindbar. Bekannte verschiedene
  Match-IDs werden nie über eine gemeinsame Minute zusammengelegt.

  Alte kleine Auszeichnungen in Tageskarten werden zur Anzeige anhand ihrer
  gespeicherten Match-IDs aufgeteilt und mit identischen neuen Marken vereinigt;
  sämtliche Quell-IDs bleiben erhalten, die DB-Zeile bleibt unangetastet.
  Rivalitätsstände speichern ihren Matchauslöser. Bei alten Rivalitäten ohne
  `matchId` wird nur eine Partie mit exakt demselben Zeitpunkt und derselben
  Paarung zugeordnet; bei mehreren Kandidaten entscheidet der damalige Duellstand.
  Es gibt keinen Rückfall auf das inzwischen jüngste Duell.

  Die einzige veränderliche Veröffentlichung ist die **heutige Ewige Tafel**:
  Rekord-, Chronik- und Insigniumbewegungen eines lokalen Tages teilen den
  Schlüssel `tafel:<Datum>`, ergeben genau eine sichtbare Karte und setzen
  deren Zeitpunkt auf den jüngsten enthaltenen Wechsel. Nur ihre heutigen
  Rohzeilen dürfen per Upsert und Realtime-`UPDATE` wachsen; Tafel-Karten
  früherer Tage und alle anderen Stories bleiben Snapshots.

  Neue Matchstories speichern die Darstellung als `dataRef.visual` Version 2:
  `score` enthält eine immer sichtbare Scoregrafik, `occasion` höchstens eine
  unabhängige Anlassgrafik. `scoreVisualKey` und `occasionVisualKey` liegen
  zusätzlich direkt im `dataRef`. Die gespeicherten Zeichnungsdaten werden
  gerendert, nicht bei einem späteren Lauf neu gewählt. Karten mit genau einer
  Partie erben beide Ebenen; Karten mit mehreren Partien behaupten keinen
  einzelnen gemeinsamen Endstand. Alte Stories bleiben über den bisherigen
  Anlasspfad lesbar.

  Funfacts haben genau einen lokalen Slot um **15:00 Uhr**. Beim nächsten
  Öffnen werden fehlende, vollständig matchfreie Tage innerhalb des
  14-Tage-Fensters nachgetragen, auch nach mehrtägiger Pause. Heute verhindert
  nur eine Partie oder ein Saisonabschluss bis 15:00 Uhr den Slot; beginnt die
  erste Partie beispielsweise um 15:20 Uhr, bleibt der 15-Uhr-Snapshot stehen.
  Normale Funfacts werden nie durch spätere Tagesereignisse entfernt.
  Drei Regeln gegen Rauschen: **kein Story-Typ steht an einem Tag mehr als zweimal im
  Feed** (`_consolidateStories`, ausgenommen die seltenen Ereignisse, die
  Sammelkarte — und alles, was es je Tag, Woche oder Monat genau EINMAL
  gibt (`TAG_PFLICHT`). Das kann sich nicht wiederholen: seit der Feed
  vierzehn Tage zurückreicht, liegen sechs bis sieben Spieltage darin, und
  von ihren Siegern standen gemessen zwei im Feed — vier Spieltage
  verloren genau die Karte, die ihre Schlagzeile ist. „Leo ist Spieler des
  Tages" und „Alex ist Spieler des Tages" sind keine Wiederholung
  voneinander, sie gehören zwei verschiedenen Tagen. Bei sieben Tagen
  Fenster fiel es nicht auf, da passten zwei Sieger hinein), **keine zwei
  Karten tragen dieselbe
  Schlagzeile** oder **denselben Text** („Eine große Rivalität, die Liga
  liebt's" stand wortgleich unter zwei Karten und nannte keine einzige Zahl).
  **`prio` steht auf EINER Skala** (`STORY_PRIO`, §11.0a). Der Tagesdeckel und
  das Gewicht einer Sammelkarte sind Vergleiche, und ein Vergleich braucht eine
  Skala. Es waren zwei: die Spieltags-Karten standen auf 1 bis 10, die Karten
  der Ewigen Tafel auf 70 bis 95 — jede für sich richtig einsortiert, nie
  gegeneinander. Damit gewann jede Tafel-Karte, bevor der Deckel hinsah.
  Gemessen über 56 Spieltage bekam die Ewige Tafel 66 % aller Tagesplätze,
  und von dem, was der Generator zum Spieltag selbst bildete, fielen 70 % der
  laufenden Siegesserien, 83 % der Pleitenserien und 83 % der Serienbrecher
  weg, während jede der 183 Insignium-Stufen und jeder der 88 Rekordwechsel
  durchkam. Wer die App nach einem Spieltag öffnete, las von allem außer vom
  Spieltag. Drei Bänder ordnen jetzt alles: **Breaking** (90+), **der
  Spieltag** (38–89, was DIESE Partien hergegeben haben) und **der
  Hintergrund** (10–37, was gestern schon galt). Innerhalb eines Bandes
  entscheidet die gemessene Seltenheit; fest bleiben nur der Sieger des
  Spieltags oben und an der Tafel die Ordnung Liga-Rekord über Monatschronik
  über Insignium-Stufe. Die Zahlen stehen an EINER Stelle: verteilt über 1900
  Zeilen ist die zweite Skala genau der Fehler, den niemand sieht.
  Eine **Sammelkarte trägt, was sie zusammenfasst** — das Gewicht ihres
  stärksten Teils und einen Schritt je weiterem. Mit `+1` wog eine Karte über drei Insignium-
  Stufen kaum mehr als eine einzelne davon; eine einzelne Karte zu deckeln
  kostet eine Meldung, diese zu deckeln kostet alle. Die Karte über EINEN
  Spieler und die über EINEN Erfolg erben gar nicht: sie fassen keinen Moment
  zusammen, sie sind eine eigene Nachricht und haben einen eigenen Rang.
  **Text und Titel fassen immer die Gruppe zusammen**; kein Einzelereignis
  wird in den Kopf kopiert oder dadurch wichtiger gemacht.
  **Und sie steht an der Uhrzeit einer Zeile, die sie ZEIGT.** Sie trug die
  des jüngsten Teils, und ein Tafel-Moment umfasst den ganzen Spieltag: die
  Karte stand nach der zweiten Partie um 10:44 im Feed und wanderte mit jeder
  weiteren nach unten, bis sie um 14:32 unter allen Partien lag. Wer sie
  mittags gelesen hatte, fand sie abends an einer anderen Stelle — und eine
  Karte, die ihren Zeitpunkt wechselt, ist im Feed eine andere. Die älteste
  Zeile zu nehmen ist aber auch falsch: die ist bei einem Tafel-Moment fast
  immer ein **Ausbau**, und ein Ausbau steht gar nicht auf der Karte. Gemessen
  stand darüber „Heute, 15:19" und darunter, in jeder einzelnen Zeile und im
  Ergebnisband, „15:37" — eine Uhrzeit, zu der nichts von dem passiert ist,
  was die Karte zeigt. Den jüngsten Teil zu nehmen löst das und kostet die
  Karte ihren Platz: der Tagesdeckel vergibt chronologisch, und der
  reservierte Platz der Ewigen Tafel geht an die FRÜHESTE Tafel-Karte des
  Tages — gemessen fiel der ganze Tafel-Moment damit aus dem Feed. Es ist
  deshalb die früheste Zeile, die auch auf der Karte stehen kann: sie bleibt
  stehen, weil keine früher gespielte Partie nachträglich dazukommt und ein
  Ausbau nie ein Wechsel wird. Jede Zeile nennt ohnehin ihre eigene Uhrzeit,
  und jede trägt die ID der Karte, aus der sie kommt, damit nachzumessen ist,
  dass eine Karte im Bündel aufgeht und nicht verschwindet.
  **Der Satz zählt nicht dreimal und behauptet keinen Moment.** Er hieß „Ein
  Moment, 8 Spuren: 5 Ausbauten und drei Monatschroniken ordnen die Ewige
  Tafel neu." Drei Fehler in einer Zeile: „Ein Moment" gilt nicht für einen
  ganzen Spieltag, dessen Zeilen gemessen 14:09 und 14:32 tragen; „8 Spuren"
  ist eine Floskel und zählt dasselbe wie die Aufzählung dahinter; und „8"
  als Ziffer neben „drei" als Wort mischt beide Schreibweisen im selben Satz
  [§C27]. Übrig bleibt die Aufzählung und der Zeitraum, für den sie gilt.

  **Die Reihenfolge ist die Zeit.** `_consolidateStories` sortiert nicht mehr
  um. Zwei Durchgänge taten das früher: einer tauschte gleichartige Nachbarn,
  einer schob Karten nach hinten, deren Gesichter schon viermal dastanden.
  Beide kosteten Chronologie, ohne eine einzige Karte zu sparen, und der Feed
  ist nach Tagen gegliedert: eine Karte, die dabei den Tag wechselt, steht
  unter dem falschen Kopf. Gemessen ergab das acht Tagesköpfe für sieben Tage.
  Die Verteilung trägt jetzt allein der Generator (`PER_PLAYER_LIMIT`,
  `NEBENROLLEN_LIMIT`); gemessen steht danach kein Spieler auf mehr als einem
  Drittel der Karten, und jeder gewertete Spieler kommt vor.
  **Was es je Tag genau einmal gibt, fällt dort nicht weg** (`GEN_PFLICHT`).
  Der Deckel zählt Karten je Spieler, und sortiert ist davor nach Zeit: wer am
  Nachmittag noch drei Karten bekommt, hat sein Budget aufgebraucht, bevor der
  Deckel die Karte vom Mittag ansieht. Gemessen kostete das den EINZIGEN
  Spitzenwechsel des Augusts — am 11.08. gab Leon die Tabelle an Martin ab,
  und die Titelrennen-Karte des Tages fiel aus, weil Martin an diesem Tag
  schon auf drei Karten stand; dieselbe Falle stand vor jeder Insignium-Stufe
  und vor dem Spieler des Tages. Diese Karten zählen weiter mit, damit die
  übrigen zurückstehen, verworfen werden sie nie — dieselbe Regel wie
  `TAG_PFLICHT` in der Anzeige, nur eine Stufe früher: was der Generator hier
  wegwirft, fehlt danach auch in seinem Bündel. Gemessen kamen im Juni 2026
  dadurch zehn Ereignisse zurück, die in keiner Karte mehr standen. Dasselbe
  gilt für die Marke einer laufenden Serie (`GEN_PARTIE`): sie hängt an ihrer
  Partie und geht in deren Bündel auf, ist also keine eigene Karte — und der
  letzte Lauf eines Spieltags, der mit allen Tafel- und Insignium-Karten,
  verwarf sie. Leons 3er-Serie vom 01.10. hielt nur die Datenbank fest.
  **Die Uhr des Telefons ist nicht die des Servers.** Den Zeitpunkt einer
  Partie setzt der Server, `now` das Telefon. Geht dessen Uhr zwei Sekunden
  nach, gilt die gerade gespeicherte Partie im ersten Lauf als künftig, und
  der Memo des Generators hielt genau dieses Ergebnis fest, bis die nächste
  Partie kam. Sein Schlüssel zählt deshalb auch die Partien, die für diese
  Uhr noch in der Zukunft liegen; holt die Uhr sie ein, läuft er neu.

  **Was einmal dasteht, bleibt stehen.** Jede Entscheidung zwischen zwei
  Karten fällt in der Reihenfolge, in der die Nachrichten entstanden sind:
  über eine Karte entscheidet nur, was VOR ihr dastand, und eine spätere
  Partie kann sie nicht mehr aus dem Feed nehmen. Vorher wählten beide Deckel
  nach `prio` aus dem ganzen Tag: gemessen schrieb ein Spieltag damit nach fast
  jeder Partie einen Teil seiner Tafel um — nach der ersten Partie standen vier
  Karten, nach der zweiten war eine davon weg, nach der vierten die nächste.
  Wer mittags gelesen hatte, fand abends etwas anderes vor. Der **Deckel je
  Sorte** behält deshalb die ersten zwei und der **Tagesdeckel** vergibt seine
  Plätze von vorn. Gelesen wird weiter von neu nach alt, also steht die
  Reihenfolge am Ende einmal und nur nach dem Zeitpunkt.
  **Dieselbe Aussage ist die Ausnahme, und dort gilt die spätere.** Die drei
  Sperren (`seenContent`, `seenTitel`, die Sperrfrist) lesen `src` von neu nach
  alt, also bleibt die jüngste Karte stehen: „Der größte Ausschlag des Tages"
  gehörte gestern jemand anderem, und die zweite Karte trägt den Stand, der
  jetzt gilt. Es ist keine neue Nachricht, es ist dieselbe mit einer neuen
  Zahl — sie steht mit ihrem eigenen Zeitpunkt da, und die erste fällt.
  **Eine Karte, die den ganzen Tag zusammenfasst, zählt nicht gegen den
  Deckel** (`TAG_SUMME`). „Harter Tag für X" ist der Gegenpart zum Sieger des
  Tages: es gibt sie je Tag einmal, und sie trägt 23:58 — die Uhrzeit, zu der
  der Tag zu ist, nicht die der Partie, die sie ausgelöst hat. Gegen einen
  Deckel, der von vorn vergibt, verliert sie damit immer: gemessen stand sie
  nach der vierten Partie des 26.08. im Feed und fiel nach der fünften heraus,
  weil vier Karten mit früherer Uhrzeit dazugekommen waren. Eine Wiederholung
  kann sie nicht sein, also nimmt sie niemandem etwas weg. Vom Vergleich der
  Schlagzeilen ist sie dagegen NICHT ausgenommen — „Harter Tag für Johannes"
  stand an vier Tagen des Fensters.
  `tests/ambient` spielt den letzten Spieltag Partie für Partie nach, mit
  einem Bestand, der sich verhält wie die Datenbank.
  Der Deckel je Sorte ist ein Deckel auf **Wiederholungen**, und eine Partie
  ist keine: neun Partien an einem Tag sind neun Ereignisse, nicht eine
  Nachricht und acht Wiederholungen. Zwei Karten derselben Sorte können damit
  untereinander stehen — die Grenze ist der Deckel und nicht die Reihenfolge;
  umsortieren wäre der größere Fehler, eine Karte gehört ihrem Zeitpunkt.
  **Jede Partie bekommt ihre Karte** (`spiel_<Partie>`, `type:'spiel'`,
  `STORY_PRIO.spiel`). Gebildet wurde nur, was ein auffälliges Muster traf — ein
  10:0, ein Krimi, ein Außenseitersieg —, und davon höchstens zwei je Tag.
  Gemessen über das Vierzehn-Tage-Fenster: 52 Partien, und 18 davon kamen in
  einer sichtbaren Karte überhaupt vor. Wer am Abend den Spieltag nachliest,
  erfuhr von zwei Dritteln der Spiele nichts. Die Karte ist der **Anker** ihres
  Spiels: alles, was in dieser Partie passiert ist — eine Serienmarke, eine
  Auszeichnung, ein Meilenstein, ein Spitzenwechsel — hängt sich beim Bündeln
  an sie. Ohne einen einzigen Fakt bleibt sie das Ergebnis mit den beiden
  Zahlen, die jede Partie hat: die Siegchance vor dem Anstoß und die Elo danach.
  **Kopf und Fuß zeigen, wovon die Partie erzählt** (`_spBild`,
  `30b-news-spieltag.js`). Jede Partie-Karte begann mit demselben
  Ergebnisband, und darunter wechselte nur eine Zeile: dreißig Karten sahen im
  Feed gleich aus. Der Anlass wählt jetzt beides, in fester Rangfolge, das
  erste, was zutrifft (`_spAnlass`): der **Spitzenwechsel**, eine **seltene
  oder legendäre Auszeichnung** (die Medaille und wer sie in der Liga trägt),
  der **Serienbruch** (die Zahl rot durchgestrichen, der Lauf mit dem roten
  Feld der Partie, die ihn beendet hat, und wer das war — derselbe Lauf wie bei
  der Serie, eine Kette aus Gliedern war eine zweite Bildsprache), die
  **Serie** (der Lauf gegen den eigenen Bestwert und den Liga-Rekord VOR dieser
  Partie), die **Teamserie** (der Lauf des Duos und seine Bilanz als Ring), der
  **Außenseitersieg** (die Wippe: das Elo-Gewicht beider Teams), die
  **Rivalitätsmarke** (jede Begegnung der beiden als Balken bis zu dieser
  Partie), die **Premiere** (der erste gemeinsame Sieg eines Duos, beim ersten
  Mal oder ab dem dritten Versuch, und die Versuche als Lauf), die **Wende**
  (die Elo-Kurve der letzten zwölf Partien, ab drei Pleiten), der
  **Rangsprung** ab zwei Plätzen (die Monatstabelle vor und nach der Partie als
  Linien, die neue Spitze in Gold), der **Rollentausch** (ein Sieg auf der
  Seite, die vorher unter einem Viertel der eigenen Partien lag, ab zwanzig,
  und ihr Anteil als Strahl), der **Ein-Tor-Krimi** (die Anzeigetafel und die
  Bilanz der Sieger in engen Partien), der **deutliche Sieg** ab sechs Toren
  (alle Partien der Liga nach Gegentoren und wie viele so deutlich waren; im
  Kopf der Stand groß, der Sieger hell, und je Tor des Siegers ein Feld,
  davon der Abstand hell — der Stand stand dort allein und kursiv, weil
  `_spStand` ihn aus `<em>` baut und die Regel fehlte) und
  sonst eine der **dreizehn Formen der gewöhnlichen Partie** (unten).
  **Die Medaille gehört dem Seltenen.** Sie stand auch für jede gewöhnliche
  Auszeichnung und jede runde Marke, und an einem Spieltag trug damit jede
  dritte Partie-Karte dieselbe Medaille — auf einem 10:9 der „Zittersieg",
  obwohl die Anzeigetafel genau das zeigt. Eine gewöhnliche Auszeichnung steht
  als Zeile im Sammelband, und was eine seltene nur als Ergebnis erzählt
  (`SP_ERGEBNIS_BADGE`, dieselbe Liste wie `BADGE_DECKT`), zeigt das Bild des
  Ergebnisses. Eine runde Wiederholung ist dagegen eine persönliche Leistung:
  `dataRef.rang` hält ihre historische Vergabezahl, die neue Medaille zeigt
  „x. Mal" und höchstens drei Nachbarmarken statt „neu dabei". Auch reine
  Ergebnis-Badges dürfen an diesen Wiederholungsmarken die Medaille tragen.
  Takt und Grafik teilen `_badgeNaechsteMarke`; neue Occasiondaten speichern
  `rang`, `wiederholung` und `marken`, alte V2-Daten ohne den Schalter bleiben
  in ihrer publizierten Trägerform. Der erste Trägerstand und ein Legacy-Rang
  kommen aus dem kanonischen Vergabe-Eventindex am `_spBasis`, gebunden an die
  Eventcache-Referenz, nicht aus einem heutigen Vollzensus je Spieler.
  **Der Rangsprung braucht eine Tabelle**: am Monatsanfang
  springt jeder Sieger zwei Plätze, weil die Tabelle aus drei Leuten besteht;
  er zählt erst, wenn die Rangliste belastbar ist (`_storyRangFrei`).
  **Die gewöhnliche Partie hat dreizehn Gesichter** (`SP_FORM`, `_spForm`).
  Gut die Hälfte der Partie-Karten hat keinen Anlass, und jede davon trug
  dasselbe Spielfeld: gemessen 31 von 59 Partie-Karten im Fenster. Jede
  Partie hat aber etwas, das nur sie hat. Jede Form trägt eine Regel
  (`wann`), ein Gewicht (`rang`), Schlagzeile und Satz (`text`) und ein Bild:
  das **Mosaik** (10:7 und 10:8, jedes Ergebnis als Feld, so hell wie
  häufig), **Pflicht erfüllt** (der Favorit ab 62 %, die Nadel), **Erwartung
  gegen Ergebnis** (ab der fünfzigsten Partie, knapp trotz 70 % oder klar
  trotz unter 50 %: die Liga als Wolke, die Erwartung als Linie), der
  **Elo-Transfer** (so viel Elo wie nur jede achte Partie davor),
  **Eingespielt** (ein Duo ab zwölf Partien und drei Vierteln Siegen, oder
  eine runde Zahl gemeinsamer Siege), der **Lieblingsgegner** und der
  **gebrochene Fluch** (Spieler gegen Spieler: jede fünfte Marke ab drei
  Vierteln, oder ein Sieg nach mindestens fünf Niederlagen gegen ihn), die
  **Revanche** (dieselben zwei Duos, damals gewann die andere Seite — mit
  dem Abstand in Minuten, Stunden, Tagen oder Wochen), das
  **Gipfeltreffen** (der Erste und der Zweite der Monatstabelle am Tisch),
  **Zurück am Tisch** (ein Sieg nach mindestens zehn Tagen Pause), **Zwei
  Welten** (ab 220 Elo zwischen den Siegern), der **Tagesring** (ab vier
  Partien des Tages und drei Vierteln Siegen), das **Zählwerk** (der
  fünfzigste, hundertste … Sieg oder die Partie, oder jede hundertste der
  Liga) und das **Spielfeld**, das immer passt. **In jeder Form steht der
  Stand** (`_spSt`), und zwar als Teil der Zeichnung — im Feld des Mosaiks,
  unter der Nadel, als Ende der Reihe —, und **alle vier Namen**: wer den
  Feed überfliegt, will wissen, welche Partie es war; beim Tagesring stand
  der Stand zuerst nur im Satz. Mehrere Anlässe teilen sich dagegen kein
  Bild: der stärkste wählt den Kopf, die übrigen hängen als Zeilen im
  Sammelband.
  **Die V2-Scorewahl ist abwechslungsreich und fest** (`_spScoreWahl`). Die
  schwerste fachlich zutreffende Form gewinnt nach Abschlägen für die letzten
  zwei und acht tatsächlich verwendeten Formen; Elo-Transfer erhält zusätzlich
  einen Abschlag über zwölf Partien. Bei gültiger Alternative steht dieselbe
  Form nicht direkt hintereinander. Auch wiederholte Krimis und klare Siege
  können einen anderen Scorekopf tragen, ohne dass ihr Ausgang als Anlass
  verloren geht. Mosaik verlangt einen seltenen, häufigsten oder runden
  Verteilungsbefund; Transfer einen Ausreißer in den obersten fünf Prozent.
  Tacho, Abstand, Ergebniszeile und Spielfeld bieten auch gewöhnlichen Partien
  sachlich passende Alternativen. Die Spur liest gespeicherte V2-Grafiken aus
  dem Rohbestand, statt alte Spielfeldkarten nach neuen Regeln als andere Formen
  zu zählen. Ein chronologischer Durchlauf je Datenstand und deterministische
  Gleichstände ergeben beim Kaltstart dieselbe Wahl. Neue Partien ändern keine
  publizierte Score- oder Anlassgrafik. Der Legacy-Pfad `_spForm` bleibt für alte
  Karten lesbar; seine historischen dreizehn Formen werden nicht umgeschrieben.
  Die Fakten
  kommen aus den ungebündelten Meldungen (`_newsRohIndex`), weil eine
  Sammelzeile nur Titel und Zeichen trägt. Der **Spieler des Tages** zeigt
  seinen Tag als Bahn und die Elo darüber (`_spTagBild`) statt dreier Zahlen.
  **Jedes Bauteil hat zwei Hälften**: `…Daten` rechnet aus den Partien,
  `…Bild` zeichnet nur, was es bekommt. Die Liga wächst, aus 466 Partien
  werden 46 600 und aus „Leo" „Maximilian-Alexander"; weil das Bild nur Daten
  nimmt, zeichnet `tests/blatt` jedes Bauteil auch mit Grenzwerten und langen
  Namen. **Nichts wird gekürzt oder geschrumpft**: ein „…" versteckte, wer
  gemeint ist, und ein kleinerer Name sah neben seinen Nachbarn falsch aus. Ein
  Name steht in der Grafik nur, wo sie Platz für ihn hat — auf dem Spielfeld
  unter seinem Wappen, in der Tabelle an seiner Linie —, und ob er passt, sagt
  eine feste Regel (`_spPasst`: kein Wort länger, als die Spalte Zeichen
  fasst), keine Messung. Sonst steht er in einer **Textstelle** darunter
  (`.sp-lg`), ein Name je Zeile. Dieselbe Regel gilt seitdem für das
  Ergebnisband (ein Name je Zeile), die Zeile einer Sammelkarte und den
  Faden: sie brechen um, statt mit „…" zu enden. Was wächst, hat einen Deckel
  und sagt, was dahinter liegt: die Serie wird über sechzehn ein Balken, der
  gerissene Lauf über zwanzig Siege ein Balken, die Rivalität zeigt die letzten
  dreißig Begegnungen, die Tabelle neun Plätze um die Bewegung, die Medaille
  ab sechzehn Spielern Punkte statt Gesichter. Gerechnet wird einmal je
  Datenstand (`_spBasis`: Spielreihenfolge, Ergebnisverteilung als
  Präfixsumme, Serienstand vor jeder Partie, die Runden), und das Bild einer
  Karte wird gemerkt (`_spBildMemo`) [§3 Caching].
  Und **was die Zeichnung zeigt, sagt der Satz nicht** (`_newsSpielSatz`,
  `zeigt` aus `_spBild`): „Die Siegchance lag vor dem Anstoß bei 73 %, für
  Maxi bringt der Sieg +13 Elo." stand unter jeder Partie-Karte, und dreißig
  Mal derselbe Satz sagt nichts. Er fällt unter jeder Partie-Karte weg; wie
  `_ndLead` eine Ableitung aus dem Text, also auch für gespeicherte Karten.
  Die gewöhnliche Partie bekommt stattdessen den Satz ihrer Form, und der
  nennt, was weder Schlagzeile noch Zeichnung zeigen: wie oft die Sieger
  dieses Ergebnis schon hatten, die Quote mit anderen Partnern, wann der
  letzte Sieg gegen diesen Gegner war. Nur „Zwei Welten" nennt den Gewinn
  beider Sieger, weil die Zeichnung die Elo VORHER zeigt. Ein Satz, der die
  Geschichte eines Anlasses ist — „Nur 30 % Siegchance … Trotzdem …" —,
  bleibt.
  **Dieselben Vier am Tisch bekommen eine eigene Karte, die Runde**
  (`_newsRundenStories`, `type:'runde'`). 115 der 466 Partien liegen in
  Runden: dieselben vier, Partie auf Partie, meist mit wechselnden Paarungen,
  und dass es eine Runde war, sah man nur an den Wappen. Eine **Runde** ist ein
  Block von Partien ohne eine Pause über dreißig Minuten (`RUNDE_PAUSE_MS`),
  in dem nur dieselben vier gespielt haben, und das mindestens dreimal
  (`RUNDE_MIN`) — zwei Partien sind ein Rückspiel, und spielt im Block ein
  Fünfter, ist es keine Runde. Gemessen liegen die Abstände darin bei 11
  Minuten im Median und unter 17 Minuten in neun von zehn Fällen; so ergeben
  sich 29 Runden. **Jede Partie behält ihre Karte und ihr Bild.** Die Runde
  war zuerst eine Ableitung bei der Anzeige, die die Karten ihrer Partien
  aufnahm, und bei vier Spielern stand danach nur noch sie da: Spielfeld,
  Anzeigetafel, Wippe und Lauf jeder einzelnen Partie gingen verloren. Jetzt
  ist sie eine Story wie jede andere, die **dazukommt**: dreißig Minuten nach
  der letzten Partie, wenn feststeht, dass keine mehr folgt, und dieser
  Zeitpunkt ist ihr Zeitstempel. Vorher weiß niemand, ob noch eine Partie
  kommt — und was einmal dasteht, bleibt stehen: die ID trägt die erste
  Partie, gespeichert wird sie einmal. Die Schlagzeile nennt, wer sie
  gewonnen hat — bei immer denselben Teams ist es ein Duell („gewinnen die
  Runde gegen … 3:1", „trennen sich 1:1") —, der Satz die **Uhrzeiten** der
  ersten und letzten Partie. **Die Karte fasst zusammen und sagt es**: eine
  Kennzeile („Zusammenfassung von 5 Partien am Stück, nur …"), die Tabelle
  als Reihe aus vier Feldern (Siege, Niederlagen, Elo) und die Partien als
  Streifen aus Uhrzeit und Stand. Sie trug darunter jede Partie als Zeile mit
  vier Wappen und ihrem Anlass — und genau diese Partien stehen direkt
  daneben als eigene Karten: wer scrollte, las jedes Spiel zweimal, und was
  die Runde ist, stand nirgends. Die Fläche ist leiser (gestrichelte Kante,
  kein Schein). Das Blatt zeigt die Tabelle, wer mit wem an welcher
  Stange stand (eine Spalte je Partie, in Blöcken zu acht, die Zeilen in der
  Folge der Tabelle — eine Legende darunter erklärte die Zeichnung) und jede Partie;
  jede Zeile öffnet die Karte ihrer Partie. Sie zählt gegen keinen Deckel,
  fällt an keiner Sperre und verbraucht im Generator kein Budget eines
  Spielers (`PER_PLAYER_LIMIT`): sie fasst zusammen, was ohnehin dasteht, und
  nahm dort gemessen den Karten derselben Spieler den Platz.
  **Sie ist keine Auswahl, sie wurde gespielt**, und darum zählt sie gegen
  keinen Deckel und fällt an keiner Sperre: nicht am Tagesdeckel, nicht am
  Deckel je Sorte, nicht am Vergleich der Schlagzeilen (zwei Partien derselben
  vier Leute heißen gleich), nicht an der Sperrfrist und nicht am
  `PER_PLAYER_LIMIT` des Generators — dort verbrauchte ein Vielspieler nach den
  ersten Partien eines Tages sein Budget, und gemessen fiel danach jede
  Formkarte, jede Serienmarke und jeder Meilenstein desselben Tages weg.
  **Und das Bündel, in dem sie steckt, auch nicht** (`_istPartie`). Bündelt
  die Karte einer Partie mit einer Meldung ohne Partie — eine Rivalität, der
  Countdown —, entstand ein Bündel nach Minute ohne `matchId`; es zählte gegen
  den Deckel je Sorte, der je Tag nur die ersten zwei behält, und die Partie
  darin verschwand. Gemessen am 01.10.: fünf Partien derselben vier, und die
  um 15:08 lag in der Datenbank und stand nirgends im Feed. Ein Bündel ist
  deshalb eine Partie, sobald eine Partie-Karte darin steckt, und steckt genau
  eine darin und nennt kein Teil eine andere, trägt es deren `matchId` — dann
  hat es auch ihr Bild und ihr Band.
  Gedeckelt wird nur noch, was **über** den Partien liegt und von gestern schon
  gelten könnte. Damit ist auch `matchProTagMin` gefallen: ein reservierter
  Platz für „eine Geschichte mit konkreter Partie" ist verschenkt, wenn jede
  Partie ohnehin eine Karte hat.
  **Und ihre Schlagzeile nennt, was in der Partie passiert ist.** Ein Bündel
  hieß „Ein Spiel, zwei Geschichten für Maxi und Henry" — das gilt für jeden
  Spieltag und sagt von keinem der beiden Anlässe etwas. Es nennt jetzt die
  Anlässe, und der Satz darunter ist der Satz der Partie aus ihrer Form oder
  ihrem Anlass: „Die Siegchance lag vor dem Anstoß bei 50 %, für Leo bringt der
  Sieg +31 Elo. Eine Meldung hängt daran." stand unter jedem Bündel, nannte
  zwei Zahlen, die die Zeichnung darüber zeigt, und beschrieb den Bau der
  Karte. Eine Rivalität heißt dort „Rivalität"; ohne Namen fiel das Bündel auf
  „Ein Spiel, zwei Geschichten" zurück. **Jeder Anlass nennt die, denen er gehört**: die
  Namen standen einmal hinter allen Anlässen zusammen — „Seltene Auszeichnung
  in einer Partie für Julian und Leo", obwohl nur Julian sie geholt hat, und
  „Enges Spiel und Rivalitätsmarke … für Martin, Jane und Maxi", Sieger und
  Rivalen in einem Topf. Jetzt trägt jeder Anlass seine Leute mit dem Wort,
  das ihre Rolle sagt — der Serienbruch GEGEN den, der die Serie trug, die
  Rivalität ZWISCHEN zweien, alles andere FÜR den, dem es zählt —, und das
  Ergebnis hängt sich als Ort dahinter, weil es allen vier gehört:
  „Seltene Auszeichnung „Mauer" für Henry und Serienbruch gegen Jannik im
  engen Spiel". Eine Auszeichnung nennt ihren Namen, ohne Ergebnis steht der
  Anlass allein („Teamserie für Leon und Maxi" — „in einer Partie" sagte
  nichts, was das Band nicht zeigt). Zwei Anlässe stehen in der Zeile, der
  Rest im Sammelband.
  Das Ergebnis selbst ist dabei ein Anlass wie jeder andere — außer wenn eine
  Auszeichnung derselben Partie es schon erzählt (`BADGE_DECKT`): „Absoluter
  Sieger" IST das 10:0, und beides in einer Zeile nennt dasselbe zweimal.
  Gefallen ist dabei der ANLASS und nicht die Karte; eine Partie hört nicht
  auf, gespielt worden zu sein.
  **Eine negative Meldung derselben Partie reist mit.** Das Subjekt ist das
  Spiel, nicht ausschließlich das Siegerteam. Schande und Durststrecke stehen
  als rote Zeilen mit ihren tatsächlichen Betroffenen neben den positiven
  Anlässen; der Score wird nicht auf einer zweiten Matchkarte wiederholt.
  **Eine Gruppe ist so negativ wie ihre Mitglieder** (`_newsIstNegativ`).
  Mehrere Pleitenserien derselben Partie werden EINE Zeile („2 Pechvögel:
  Anton & Maxi"), und die trägt `type:'group'` mit `loss_streak` in `sub`.
  Geprüft wurde nur `type`, also galt die Gruppe als positiv: gemessen stand
  sie als Zeile auf „Teamserie in einer Partie", der Karte über den Sieg der
  beiden anderen.
  **Und eine Gruppe trägt den Anlass ihrer Mitglieder** (`_motivVon`). Der
  Anlass-Katalog kennt „group" nicht, also fiel er weg: gemessen hieß ein
  Bündel aus fünf Zeilen nur „Teamserie in einer Partie", obwohl auch zwei
  Einzelserien und eine Auszeichnung daranhingen — die Schlagzeile nennt aber
  die Anlässe, und „Teamserie" allein war nicht einmal die Hälfte.
  **Und eine Marke verschwindet nicht, wenn ihre Serie reißt.** Die Serie eines
  Spielers, die eines Duos und der Formlauf waren ein Stand von HEUTE, gerechnet
  nach der letzten Partie der Liga, und die ID trug die Länge
  (`team_streak_A_B_7`): jede Länge wurde einzeln persistiert, und aus einer
  Serie, die von fünf auf zehn wuchs, standen vier Karten im Feed. Der Ausweg
  war ein Filter, der jede Karte wegnahm, deren Zahl der lebende Wert nicht mehr
  erreicht — und damit verschwand die 5er-Marke vom Dienstag, sobald die Serie
  am Mittwoch riss. Wer von unten nach oben liest, sah die Serie brechen und
  fand die Marke nicht mehr, die an ihrem Tag richtig war. Jede dieser Marken
  hängt deshalb an der Partie, die sie ausgelöst hat, und bleibt stehen: `loss_streak`,
  `team_streak`, `team_loss_streak` und `top_form` tragen ihre `matchId` und
  ihren `lauf`, und der Generator läuft die Partien dafür chronologisch ab wie
  bei `win_streak` seit jeher. Der Formlauf meldet dabei den **Übertritt** über
  die Schwelle, nicht den Zustand: bleibt der Vorsprung über mehrere Partien
  stehen, ist das dieselbe Aussage. Die **Pause** (`dry_spell`) ist davon
  ausgenommen — sie behauptet gerade, dass seit ihrer Partie nichts mehr
  passiert ist.
  **Der Spieler des Tages steht an jedem Spieltag des Fensters.** Er entstand
  nur für den LETZTEN (`_potdLastDayData` sucht von hinten den ersten Tag mit
  einem Kandidaten und hört dann auf), und im Fenster liegen sechs bis sieben
  Spieltage: gemessen war genau EINE Karte gebildet, und die sechs Tage davor
  hatten keinen Sieger mehr. Er IST die Schlagzeile seines Spieltags. Die ID
  trägt den Tag, ist also stabil, und ein zweiter Lauf legt keine Zeile dazu.
  **Ein Tag trägt vier Karten** (`NEWS_LIMITS.proTag`), und der Deckel zählt
  nur, was er auch wegnehmen kann. „Breaking zählt nicht mit" stand als Regel
  da, umgesetzt war die Hälfte davon: Breaking und die Pflichtkarte waren vor
  dem Verdrängen geschützt, besetzten aber trotzdem einen Platz — und der
  Feed lässt sie ohnehin durch, der Platz war verschenkt. Gemessen am letzten
  Spieltag der Fixtures gingen zwei von fünf Plätzen an „Noch 5 Tage um den
  Monat" und den Spieler des Tages, „Martin zündet die 8er-Serie" fiel heraus,
  und der Tag zeigte drei selbst gewählte Karten statt fünf; über das ganze
  Fenster lag die Ewige Tafel damit bei 64 % statt der gemessenen Hälfte. Vier
  eigene Plätze plus der Sieger des Tages plus, wenn es eines gibt, ein
  Breaking — gemessen drei bis sechs Karten je Spieltag. Gemessen trug ein
  Spieltag vorher neun: zwei Sammelkarten, zwei Serien, zwei Auszeichnungen, den
  Spieler des Tages, den Elo-Ausschlag und einen Serienbrecher. Das ist keine
  Tafel mehr, das ist ein Protokoll. Der Tag vergibt seine Plätze **von vorn**:
  wer zuerst da war, behält seinen Platz, und eine spätere stärkere Karte
  wartet auf morgen. Nach `prio` vergeben hing die Auswahl eines Tages an
  seinem Ende — die Karte vom Vormittag fiel heraus, sobald am Nachmittag eine
  stärkere dazukam. **Breaking zählt nicht mit**:
  es ist das Seltenste und darf nie an einem Deckel scheitern. Und was es je
  Tag, Woche oder Monat genau einmal gibt, fällt nie darunter (`TAG_PFLICHT`:
  Spieler des Tages, Wochenkarte, Monatschronik, Saison-Rückblick; dazu
  `TAG_SUMME` für den Gegenpart des Tagessiegers) — der
  Spieler des Tages IST die Schlagzeile seines Spieltags. In einer simulierten
  Liga aus hundert Partien fiel er als siebtstärkste Karte heraus, während zwei
  Auszeichnungen und eine laufende Serie darüber standen, und der Tag hatte
  danach keinen Sieger mehr. Die Reihenfolge bleibt die Zeit.
  `prio` sortiert den Feed seit dem chronologischen Umbau nicht mehr und
  entscheidet auch über keinen Deckel mehr; sie trägt das Gewicht einer
  Sammelkarte und die Spannung, aus der die Karte des Tages gewählt wird.
  **Die Mischung gehört dem Tag, nicht dem Fenster.** Die erste Karte der
  **Ewigen Tafel** eines Tages zählt gar nicht gegen den Deckel
  (`NEWS_LIMITS.tafelProTagMin`): sie hat ihren eigenen Platz. Vorher war es
  ein Tausch — die schwächste Karte des Tages musste weichen —, und kam die
  Tafel erst am Nachmittag, traf das eine Karte, die seit dem Vormittag im
  Feed stand. Reserviert und ungenutzt wäre der Platz an einem Tag ohne
  Tafel dagegen verschenkt: der Tag trüge dann drei statt vier Karten. Die
  erste ist chronologisch die erste, und später kann keine davorrutschen. Vorher war es eine Quote über die ganzen vierzehn Tage —
  mindestens 40 % Tafel, gemessen am Inhalt der Karten —, und erfüllt wurde sie,
  indem SPIELTAGSKARTEN wegfielen: gemessen schnitt das den Feed von 42 auf 23
  Karten und leerte zwei von sieben Spieltagen vollständig. Der 24.08. trug
  vierzehn Meldungen und im Feed keine einzige Karte. Der Tafel half das nicht,
  sie blieb bei vier Karten — nur stand daneben nichts mehr. Je Tag reserviert
  hängt die Auswahl eines Tages außerdem nur noch an diesem Tag: ein neuer
  Spieltag verschiebt nicht mehr, was vorgestern zu sehen war.
  **Und kein Spieltag bleibt ohne Karte.** Der Vergleich der Schlagzeilen wirft
  weg, was schon einmal dasteht; „Harter Tag für Johannes" stand an vier Tagen
  des Fensters und blieb einmal stehen. Der 13.08. hatte danach nur noch den
  Spieler des Tages, der 19.08. gar nichts. Bleibt für einen Tag, an dem
  gespielt wurde, keine Karte übrig, kommt die stärkste der verworfenen zurück:
  dieselbe Schlagzeile unter zwei verschiedenen Tagesköpfen ist erlaubt — jede
  nennt im Text ihr eigenes Datum, und für die Pflichtkarten gilt die Ausnahme
  längst. Die **Sperrfrist** gehört nicht dazu: sie sagt gerade, dass diese
  Aussage gestern schon erzählt wurde.
  **Von einer Sammel-Achse stehen höchstens zwei Karten an einem Tag.** Die
  Sammelkarte war vom Deckel je Sorte ganz ausgenommen, und gemessen standen am
  26.08. vier Karten „Ein Spiel, N Geschichten für …" untereinander — vier
  verschiedene Partien, für den, der scrollt, viermal dieselbe Schlagzeile. Sie
  zählt jetzt nach ihrer Achse mit (`sammel/tafel`, `sammel/spieler`,
  `sammel/erfolg`): vier verschiedene Nachrichten dürfen nebeneinander stehen,
  vier gleiche nicht. Die Achse der **Partie** ist davon ausgenommen, seit die
  Schlagzeile die Anlässe ihrer Partie nennt: vier verschiedene Partien tragen
  vier verschiedene Zeilen, und keine davon ist eine Wiederholung.
  Eine **seltene Auszeichnung** steht darin über einer laufenden Serie: die
  Serie läuft weiter, die Auszeichnung ist geholt. Sie stand auf 5 und damit
  unter der Duo-Pleitenserie, mit der Begründung, Team-News sollten „auch mal
  oben stehen" — was seit dem chronologischen Feed niemand mehr entscheidet.

  **Der Fun Fact entscheidet am Slot, nicht rückwirkend in der Anzeige.** Ein
  vergangener Tag wird nur nachgefüllt, wenn er vollständig matchfrei war.
  Heute darf eine Partie nach 15:00 Uhr neben dem zuvor fälligen Funfact stehen;
  die spätere Partie löscht keine bereits publizierte Karte.

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
  Karten. `_consolidateStories` bündelt das zur **Sammelkarte** (`sammel`).
  Tafel-Ereignisse bilden dabei zuerst einen eigenen Strom, und zusammen
  gehören sie über ihren **Grund** (`causalKey`, `_storyGruppeKey`): die
  dauerhafte Tafel EINES Spieltags ist `table:<Tag>`, die Chronik eines
  abgeschlossenen Monats `recap:chronik_<Saison>`. Partie und Minute waren
  dafür nur ein Stellvertreter, und er traf daneben: gemessen über die 19
  Spieltage vom 28.07. bis 26.08. stand am 29.07. eine zweite Tafel-Karte
  neben der ersten, weil eine Insignium-Stufe eine andere Minute trug als die
  Rekorde desselben Tages — und beide hießen „… bewegen die Ewige Tafel".
  **Die dauerhafte Tafel und die kurze Strecke sind zwei Karten.** Ein Rekord
  auf einem gleitenden Fenster erzählt etwas anderes als eine Laufbahn: sein
  Wert bewegt sich auch, wenn hinten ein schwaches Ergebnis herausfällt, und
  deshalb meldet er kein „ausgebaut" [§C35]. In einer Karte mit den
  dauerhaften Rekorden war dieser Unterschied nicht zu sehen. Seine Achse ist
  `form:<Tag>`, seine Schlagzeile „… setzen Marken auf kurzer Strecke" — beide
  Karten mit derselben Schlagzeile standen gemessen an 13 von 19 Spieltagen
  untereinander. Kammer, Farbfamilie und Filter bleiben die der Ewigen Tafel
  [§C25], im Blatt heißt der Abschnitt „Auf kurzer Strecke". Gemessen tragen
  neun der 19 Spieltage vom 28.07. bis 26.08. eine solche Karte, acht davon
  neben der dauerhaften. Zeilen aus älteren Läufen ohne `causalKey` finden
  weiter über Partie oder Minute zusammen und bleiben die dauerhafte Tafel.
  **Der Schlüssel einer Sammelkarte kommt aus ihrem Inhalt, nicht aus der
  Reihenfolge.** Der Tafel-Moment hieß nach seiner alphabetisch ersten
  Mitglieds-ID und die Spieltags-Karte nach der Position ihrer Gruppe in der
  Schleife. Beides verschiebt sich, sobald eine Zeile dazukommt oder zwei
  Gruppen verschmelzen: der Leser sah nicht dieselbe Karte wachsen, sondern
  eine neue an ihrer Stelle, und der Lesestand hing daran. Gemessen ergaben
  drei Partien eines Tages drei verschiedene Tafel-Karten. Der Tafel-Moment
  heißt deshalb nach seinem **Grund** (`causalKey`, für den ganzen Spieltag
  derselbe), die Spieltags-Karte nach der kleinsten Mitglieds-ID; nur Zeilen
  aus älteren Läufen ohne Grund finden weiter über das erste Mitglied
  zusammen.
  Ein vollständiges Bundle entsteht auch dann, wenn eine Zeile Breaking ist. Spieltags-Ereignisse brauchen zusätzlich **ein
  gemeinsames Subjekt**; Fun Facts gehören nie dazu, weil sie nicht aus dem
  Moment entstanden sind. Jede Karte erhält eine **gemeinsame Aussage**, die
  aus allen Teilen gebaut wird. Kein Einzeltext wird zum Kopf erhoben und eine
  fünfte Spur fällt nicht wieder als scheinbar unabhängige Karte daneben.
  Alte Datenbankzeilen ohne `matchId` bleiben über die Minute kompatibel;
  neue Generatorzeilen tragen die Partie, wo sie fachlich bekannt ist.
  **Ein `matchId` bleibt sichtbar.** Auszeichnungs-, Serien-, Rivalitäts- und
  Tafel-Karten aus einer konkreten Partie zeigen über ihrer Geschichte immer
  dasselbe Ergebnisband mit beiden Teams, allen vier Wappen und dem Endstand.
  Damit erzählen auch „Mauer“, „Absoluter Sieger“, Serienbruch und Upset
  zuerst, in welchem Spiel sie entstanden sind; Rubrik, Schimmer und eigener
  Kartenaufbau bleiben trotzdem erhalten.
  **Und die Partie passt zu den Namen.** Eine Tafel-Karte trug die letzte
  Partie der DATENBANK, egal von wem sie erzählt: über „Leo und Stefan bewegen
  die Ewige Tafel" stand „Jane/Johannes 10:8 Maxi/Henry", ein Spiel, an dem
  keiner der beiden beteiligt war. Gemessen taten das 34 von 169 Karten. Jede
  Karte zeigt deshalb die **letzte eigene Partie eines genannten Spielers** an
  ihrem Tag — sie ist die, nach der der Wechsel galt, und sie ist immer eine,
  in der er mitgespielt hat. Die auslösende Partie zu suchen kostete gemessen
  ~200 ms auf einen Generator von 340 ms und nennt dasselbe Spiel. Eine
  **Sammelkarte** zeigt ein Band nur, wenn **alle** ihre Teile dieselbe Partie
  nennen: ein Tafel-Moment entsteht über die Minute und umfasst damit mehrere
  Partien, und sich eine davon auszusuchen ist genau der Fehler von vorher.
  **Die Leiter der Marken beginnt bei drei** (3, 5, 8, 10 und dann jede
  fünfte, `istSerienMarke`). Die Karte einer Siegesserie zeigt die **nächste
  Marke** als leere Felder hinter dem Lauf (`naechsteSerienMarke`): man sieht,
  wie weit es noch ist. Eine Pleitenserie hat kein Ziel — eine Marke, auf die
  man zuläuft, wäre dort ein Wunsch. Die Leiter steht an EINER Stelle; sie
  stand als Menge im Generator, und zwei Kopien nennen irgendwann zwei Ziele. Sie stand bei 5, 7, 10, 15, 20 — eine Stufe über dem, was das
  Zeichen daneben schon feiert: drei Siege in Folge sind das, was die meisten
  überhaupt erreichen, und genau dort geht am Wappen das Feuer an [§C26].
  Sieben und zehn lagen dicht beieinander; acht ist die Marke, die einen
  langen Spieltag abschließt. Gemessen über die 19 Spieltage vom 28.07. bis
  26.08.: vorher acht gebildete und fünf gezeigte Serienkarten, jetzt
  siebzehn und neun.
  **Der Lauf ist die Einheit, nicht der Tag** (`lauf` im `dataRef`, die Partie,
  mit der die Serie angefangen hat). Die 5er-Marke von gestern steckt in der
  8er von heute, und beide standen unter zwei Tagesköpfen als zwei
  Nachrichten. Und **dieselbe Marke ist einmal Nachricht**: seit die Leiter
  bei drei beginnt, erreicht derselbe Spieler dieselbe Marke im Fenster
  mehrmals — „Alex zündet die 3er-Serie" stand gemessen zweimal im Feed,
  einmal als Karte und einmal als Zeile einer Sammelkarte. Es bleibt die
  jüngste, dieselbe Regel wie bei einer wiederholten Auszeichnung [§11.0c].
  Der **Serien-Rekord der Liga** wird ab fünf Siegen gemeldet: mit sechs blieb
  er einer jungen Liga verschlossen, die die fünf erreicht, bevor sie die
  sechs erreicht.
  **Eine Serie je Spieler und Tag, die längste.** An einem Spieltag mit acht
  Partien fallen die 5er- UND die 7er-Marke desselben Spielers, und „Jonas
  zündet die 5er-Serie" stand neben „Jonas zündet die 7er-Serie": eine
  Nachricht und eine Wiederholung, denn die längere enthält die kürzere. Sie
  verbrauchten dabei beide Plätze, die der Deckel je Sorte hergibt — gemessen
  brachte ein Probelauf über vierzehn Tage danach keine einzige Serienkarte in
  den Feed.
  Die Grenze steht **zweimal**, und beide Male ist sie nötig: der Generator
  bildet nur die höchste Marke, aber persistierte Zeilen aus älteren Läufen
  tragen die kürzeren weiter. Gemessen stand „Johannes zündet die 7er-Serie"
  neben „2 Serien im Gleichschritt: Jane & Johannes" und darunter noch „Jane
  zündet die 5er-Serie" — dieselbe laufende Serie in drei Zeilen. Die Gruppe
  entsteht aus ihren Mitgliedern, also greift die Grenze in der Anzeige
  **vor** der Gruppierung und räumt Einzelkarte und Gruppe zugleich auf.
  **Für Spieltagskarten reicht die Minute allein nicht.** „Johannes und Anton verlieren zusammen
  alles" trug „Maxi: Nerven aus Stahl" als zweite Zeile — drei fremde Spieler
  in einer Karte, die nur ihr Zeitstempel verband. Innerhalb einer Minute
  bilden deshalb die **Beteiligten** die Gruppen: wer einen Spieler mit einer
  bestehenden Gruppe teilt, kommt dazu und zieht die Gruppen zusammen, die er
  verbindet. Zwei Karten in derselben Minute sind danach erlaubt,
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

  **Zwei Fragen kommen vor der Bündelung nach Moment und Subjekt:** Hat EIN
  Spieler mehreres auf einmal geholt? Haben MEHRERE dasselbe geholt? Beides
  ist eine eigene Nachricht mit eigener Kartenform. Vorher borgte sich das
  Bündel Rubrik und Schlagzeile seiner stärksten Zeile, und an der Ewigen
  Tafel gruppierte es sogar den ganzen TAG ohne jedes Subjekt: gemessen
  standen vier Rekordwechsel dreier Spieler in einer Karte, während die drei,
  die im selben Moment dieselbe Insignium-Stufe erreichten, über die vier
  Zeilen hinausfielen und einzeln daneben standen.
  Die **Spieler-Karte** (`quelle:'spieler'`, `.nf-s-spieler`, Rubrik „ALLES
  AUF EINMAL") nennt in der Schlagzeile jede
  Sorte mit ihrer Zahl — „Maxi holt zwei Monatschroniken", „Jonas holt einen
  Liga-Rekord und erreicht die nächste Insignium-Stufe". Verb und Gegenstand
  stehen dafür getrennt (`ERFOLG_WORT`), und das Verb wird nur genannt, wo es
  wechselt: „holt einen Liga-Rekord, eine Auszeichnung und feiert ein
  Jubiläum" — je Verb eine eigene Aufzählung ergab zwei „und" in einer Zeile.
  Sie zeigt ein Wappen groß und im Fuß die Zahl der Erfolge. Der Teaser
  beschreibt den Nachhall für die Laufbahn, statt die Kartenstruktur mit
  „Einzelheiten stehen darunter" zu erklären.
  Die **Erfolgs-Karte** (`quelle:'erfolg'`, `.nf-s-erfolg`, Rubrik „GEMEINSAM
  GEHOLT") stellt den Erfolg voran und die Gesichter als Chips daneben — keins
  ist wichtiger als das andere. Ihre Schlagzeile und ihr Satz kommen aus
  `SAMMEL_ERFOLG`, je Typ eine Wendung: „Sina, Mira und Jonas tragen jetzt den
  Schildring" mit „Ein gemeinsamer Sprung auf der Laufbahn: drei Zeichen
  wechseln zugleich ihre Form". Den
  Satz vom Kopf zu borgen wäre falsch — „385 Prestige zusammen" gehört einem
  der drei, und die Karte handelt von allen.
  **Der Erfolg geht dem Spieler vor.** Wer die Insignium-Stufe mit zwei
  anderen teilt und im selben Moment noch einen Rekord holt, steht mit der
  Stufe auf der gemeinsamen Karte; der Rekord fällt in die Bündelung nach
  Moment und Subjekt, und dort gehören Rekorde ohnehin hin. Liefe die
  Spieler-Achse zuerst, stünde „der Schildring" auf zwei Karten, und das ist
  genau die Doppelung, die diese Regeln verhindern.
  **Beide Achsen fassen nur, was allein dasteht** (genau ein Beteiligter):
  eine Duo-Serie gehört keinem Einzelnen und wäre auf einer Karte über einen
  Spieler eine Behauptung über zwei. Für den Liga-Rekord und die Monatschronik gibt es
  die Erfolgs-Achse gar nicht: sie tragen ihre Mithalter schon in EINER Karte
  („Maxi, Leo und Julian übernehmen"), und die Auszeichnung fasst
  `badgeGroups` je Partie zusammen — ein zweites Bauteil für dieselbe Aussage
  wäre eins zu viel [§C27].
  **Die Zeilen wiederholen nicht, was oben steht.** Auf der Spieler-Karte
  fällt der Name vor jeder Zeile weg — er steht in der Schlagzeile, und
  dreimal „Tobi" untereinander ist zweimal zu viel; es bleibt „übernimmt ‚Der
  Unaufhaltsame'". Auf der Erfolgs-Karte bleibt er stehen und bekommt den
  Wert dazu, der die Träger unterscheidet („Sina: 385 Prestige"): dreimal
  „trägt den Schildring" unter „Sina, Mira und Jonas tragen jetzt den
  Schildring" wäre die Schlagzeile in drei Wiederholungen. Wo nur der Name
  unterscheidet (Jubiläum, Meilenstein), steht er allein — die Liste IST dann
  die Aufzählung, und ab dem vierten Namen ist sie die einzige Stelle, an der
  alle vorkommen.

  **Die Ewige Tafel wird zuerst als eigener Ereignisstrom vereinigt.** Alle
  Rekorde, Chroniken und Insignium-Wechsel eines Spieltags landen in genau
  einem Bundle, auch wenn ein Teil Breaking ist. Vor der Bündelung
  gibt es keinen Chronik- oder Rekordausbau-Cap mehr: Die Karte wird kleiner in
  der Zahl der Rahmen, nicht ärmer an fachlichem Inhalt.

  **Die Zeile einer Sammelkarte ist kürzer als die Karte** (`zeileText`). Im
  Blatt eines Tafel-Moments stand jede Zeile mit dem vollen Kartentext:
  gemessen bis zu 183 Zeichen und vier Sätze, neunmal untereinander. Fünf der
  neun erklärten dabei, warum sich NICHTS ändert, und das ist die Bauanleitung
  des Feeds, nicht die Nachricht. Die Zeile nennt den Wert, die Klasse und den
  Zuwachs, wo es einen gibt; der Liga-Rekord lässt seine Bedingung weg (sie
  nennt jede Schwelle [§C35] und war allein 175 Zeichen lang), das Insignium
  die Aufteilung seines Prestiges. Der ganze Text bleibt an der einzelnen
  Karte. Höchstens drei Sätze und 130 Zeichen, gemessen über jeden vierten
  Spieltag der Ligageschichte.

  **Bündeln darf nichts verstecken.** Die Sammelkarte trägt eine eigene
  zusammenfassende Schlagzeile — und darunter das **Sammelband**
  (`_newsSammelBand`, `.nf-sam`): jede Meldung mit ihrem Zeichen, kurz und in
  einer Reihe, auf der KARTE und nicht erst im Blatt. Das Detailblatt zeigt
  dieselben Ereignisse vollständig und **gleichrangig**; keine
  erste Zeile wird markiert oder in den Kopf gezogen.
  **Ausgenommen ist der Anlass eines Breaking** (`brk` an der Zeile,
  `.nf-sam-brk`). Eine Sammelkarte erbt ihr Breaking von einer ihrer Zeilen,
  und welche das war, stand nirgends: `teile` ist nach `prio` sortiert, und
  die Tafel-Familie ordnet Liga-Rekord über Monatschronik über Insignium-Stufe
  — der erste Lorbeerreif der Ligageschichte stand damit als letzte von sechs
  Zeilen, während die Karte daneben voller Rahmen und pulsierenden Balken trug
  und nicht sagte, wofür. Eine Karte, die die Spalte bricht, muss die Behauptung
  belegen: der Anlass steht deshalb **zuerst** und trägt eine Marke aus zwei
  Worten, Rot wie die Karte [§C25]. Eine Marke am rechten Rand war dafür zu
  leise — die Karte trug einen vollen roten Rahmen, einen pulsierenden Punkt
  und einen Schein hinter der Fläche und nannte ihren Grund in derselben
  grauen Zeile wie fünf andere. Die Zeile bekommt deshalb eine **eigene Kante
  und eine eigene Fläche** und ihr Zeichen in Rot, und der Balken der Karte
  nennt neben dem Wort BREAKING die **Zahl der gebündelten Meldungen**
  (`.nf-brk-n`): sonst sah eine Karte über sechs Ereignisse aus wie eine
  einzelne Nachricht. `tests/blatt` misst Kante und Fläche im Browser. Darunter fällt auch der **Nachsatz**
  (`.nf-brk-sub`): `_breakingHeroText` kannte sieben Typen und die Sammelkarte
  nicht, fiel damit auf `desc` zurück, und der Aufrufer unterdrückt ihn genau
  dann, wenn er `desc` ist — die gebündelte Breaking-Karte hatte also gar
  keinen. Er trägt jetzt den langen Satz des Anlasses. Gemessen wird das an
  einem gestellten Bündel: die echte Liga erreicht den Lorbeerreif nicht
  [§10.3], es gibt in ihr also keine gebündelte Breaking-Karte.
  **Jede Zeile nennt ihre eigene Uhrzeit, die Wirkung steht einmal.** Ein
  Tafel-Moment umfasst mehrere Partien, und im Blatt stand eine Liste ohne
  jeden Zeitbezug; das Ergebnis der eigenen Partie kommt dazu, wo es ein
  anderes ist als das Band über der Liste — als Stand und nicht als zweites
  Band, denn neun Bänder mit je vier Wappen sind genau das, wovor „Detail
  folgt der Größe" warnt. Die Punktewirkung dagegen ist je Spieler EINE Zahl,
  egal aus welcher Zeile sie kommt: beide Stände gehören dem Spieltag
  [§11.0e]. Sie steht deshalb in einem Abschnitt „Wirkung auf die Laufbahn"
  unter der Liste, einmal je Spieler — je Zeile gezeigt stünde dieselbe
  Rechnung neunmal untereinander.
  **Wer auf der Karte steht, steht in der Wirkung** (`_tafelLaufbahn`). Der
  Abschnitt liest die Angabe aus den Zeilen, und nur die REKORD-Zeile trug
  sie: gemessen fehlte Leo dort ganz, obwohl seine Zeile „+80 Prestige"
  nennt — und die Prestige-Zelle der Zahlenreihe stand damit auf dem Zuwachs
  eines einzigen Spielers. Im Screenshot las das als „+2 PRESTIGE" über
  „+9 Prestige" drei Zeilen darunter, und eines von beidem sah aus wie ein
  Fehler. Jede Tafel-Meldung — Bestmarke, Monatschronik, Insignium-Stufe —
  trägt deshalb dieselbe Angabe aus derselben Quelle.
  **Und die Zeile sagt, woher ihre Zahl kommt.** Sie hieß „Johannes +67
  Prestige für die Laufbahn": derselbe Wortlaut wie die Aufschrift der
  Zahlenreihe und des Abschnitts, aber eine andere Größe — dort steht der
  Zuwachs des ganzen Spieltags, hier der Beitrag eines Eintrags. Die Zeile
  nennt ihn deshalb ausdrücklich „aus diesem Eintrag", und steht sie allein,
  fällt der Name weg: er steht in ihrer eigenen Schlagzeile schon
  („Johannes holt ‚Der Beidfüßige'").
  **Und sie ist gezeichnet, nicht gerechnet** (`_ndWirkungBlock`). Dort stand
  „1205 → 1240 Prestige": zwei Zahlen, die man erst lesen und dann verrechnen
  muss, und bei neun Zeilen darüber weiß niemand mehr, was daran
  ausschlaggebend war. Jede Zeile trägt jetzt das **Zeichen ihrer Stufe**, den
  **Zuwachs** als Zahl und einen **Balken** über die Strecke von dieser
  Insignium-Schwelle zur nächsten — darin heller, was der Spieltag dazugelegt
  hat, und dahinter, wie weit es noch ist [§C30]. Die größte Wirkung steht
  oben: sie ist das, was den Tag ausmacht. Gerechnet wird mit den
  **gespeicherten** Ständen und nicht mit `prestigeOf` — eine Karte von
  vorletzter Woche erzählt vom Stand von damals [§C31]. Die Stufe dazu wird
  aus den Punkten abgeleitet und nicht gelesen [§C30].
  **Und sie zeigt, was verloren ging.** Jane zog bei „Der Lauf" mit Leon
  gleich, Leons Anteil halbierte sich, und im Blatt stand bei ihm „±0": ein
  Minus wurde als Null gezeigt, und der Balken kannte nur den Zuwachs. Ein
  Verlust steht jetzt rot da [§C25] — die Zahl mit Minus, das verlorene Stück
  gestreift im Balken, „fällt auf …" und ein Pfeil am Zeichen, wenn jemand
  unter eine Schwelle rutscht —, und darunter der Grund als Marke
  (`_ndWirkungsGruende`): welcher Rekord oder welche Chronik geholt,
  übernommen, geteilt oder verloren wurde. Dafür trägt die Wirkung einer
  Rekord- und Chronik-Karte auch die **bisherigen Halter**, die nicht mehr
  allein halten (`_mitVorgaengern`), und die Zeile im Bündel ihre Halter vor
  und nach dem Tag. Die Zahlenreihe nennt das Verlorene als eigene Zelle
  neben dem Gewonnenen und nicht darin: ein Minus in derselben Summe hieße,
  der Tag hätte weniger gebracht. `tests/blatt` misst das Stück im Balken.
  **Und schon auf der Karte** (`_newsVerlustBand`): unter dem Sammelband
  einer Tafel-Karte steht eine leise Zeile „Prestige" und je Verlierer ein
  **Chip** aus Gesicht, Name und Betrag, und nur wenn die Stufe fällt, dahinter
  „↓" und die Stufe. Vorher stand „Verliert" vor einer Reihe aus Text, und
  bei drei Namen brach sie um: Betrag und Stufe standen dann in der zweiten
  Zeile neben dem falschen Namen. Der Chip hält zusammen, was zusammengehört. Die Schlagzeile feiert die Neuen, und wer seinen Anteil abgeben
  musste, erfuhr es sonst erst im Blatt. Sie steht unter dem Band und nicht
  im Kopf: die Karte bleibt die der Gewinner. Der Satz einer Rekordkarte nennt den
  Verlust ebenfalls („Für Leon heißt der Spieltag 77 Prestige weniger", und
  wenn das Zeichen fällt, auf welche Stufe); die Zeile im Bündel bleibt ohne
  ihn, dort steht er einmal in der Verlust-Zeile der Karte.
  **Und davor steht in Zahlen, worum es geht** (`rcpZahlenHtml`, das Bauteil
  der Rückblicke [§C31]): wie viele Bestmarken wirklich den Halter gewechselt
  haben, wie viele nur ausgebaut wurden, wie viele Chroniken dazukamen, wie
  viele Insignien und was am Ende an Prestige hängenblieb. Neun Zeilen
  untereinander sagen das nicht.
  **Die Liste selbst ist nach Sorte gegliedert** (`rcpAbschnitt`, `.nw-ic`).
  Zweiundzwanzig Zeilen sind keine Liste, sie sind eine Wand: gemessen trug ein
  Tafel-Moment sechs Bestmarken, neun Ausbauten, fünf Chroniken und zwei
  Insignien, und alle standen als EIN Stapel untereinander — wer ihn öffnete,
  konnte nicht sehen, was ein Wechsel und was nur ein besserer Wert war. Jede
  Gruppe trägt jetzt ihre Überschrift mit der Zahl dahinter, und jede Zeile ihr
  **Zeichen**: in einer langen Liste ist es das Erste, was man sieht. Unter vier
  Zeilen bleibt die Gliederung weg, dort sagt sie nichts.
  **Und über Überschriften steht keine weitere.** „An der Ewigen Tafel" stand
  als Sammelüberschrift direkt über „Bestmarken 1" und „Monatschroniken 2" —
  und dieselbe Aussage stand auf demselben Blatt schon dreimal: in der Rubrik,
  in der Schlagzeile („… bewegen die Ewige Tafel") und unter den Wappen („an
  der Ewigen Tafel"). Wo die Liste ihre eigenen Überschriften trägt, fällt die
  darüber weg; ohne Gliederung bleibt sie, denn dann hat die Liste keine.
  **Im Blatt ist die Partie die Bühne und keine Zeile.** Sie hieß „Leon und
  Maxi setzen sich gegen Leo und Anton durch" und darunter „Vor dem Anstoß lag
  die Siegchance bei 81 %. Der Sieg bringt +7 Elo." — dieselben vier Namen und
  derselbe Stand wie das Band darüber. Das Blatt eines Partie-Bündels trägt
  jetzt die Zeichnung der Karte als Bühne, darunter „Was dazu gehört" mit
  jeder übrigen Zeile ohne die Uhrzeit der Partie, die neunmal dieselbe wäre,
  und dann dieselben Abschnitte wie das Blatt der Partie
  (`_ndPartieAbschnitte`).
  **Und auf der KARTE steht sie gar nicht** (`sammelTeile`). Das Band über der
  Karte zeigt die vier Wappen und den Stand, und darunter stand im Sammelband
  „Leon und Maxi setzen sich gegen Leo und Anton durch" — dieselbe Partie in
  einer zweiten Schreibweise, und die Karte erzählte damit von zwei Dingen,
  von denen eins die Überschrift des anderen ist. Gefiltert wird nur die
  Achse der Partie: der Ergebnis-Strom besteht ausschließlich aus
  Partie-Zeilen, und dort bliebe sonst ein leeres Band.
  **Was unten in Zahlen steht, sagt der Satz oben nicht** (`_ndLead`). Der
  Satz der Tafel-Karte zählt auf, was passiert ist („Eine Bestmarke, ein
  Ausbau, zwei Monatschroniken und ein neues Insignium: …") — im Feed ist das
  die ganze Aussage. Im Blatt steht direkt darunter die Zahlenreihe mit
  denselben vier Angaben, und damit dieselbe Information zweimal in sechs
  Zeilen [§C27]. Der Kopf lässt die Aufzählung dort weg; was danach kommt —
  der Zuwachs für die Laufbahn — bleibt, denn das zählt die Reihe nicht auf.
  Eine eigene Funktion, weil die Regel sonst nur im Zeichnen des Blatts
  stünde und damit nur mit einem Dokument zu messen wäre.
  **Der Blattkopf zeigt so viele Wappen, wie seine Zeile Namen nennt.**
  Gezeigt wurden immer die ersten ZWEI, während `_namenKurz` bis zu drei
  nennt: „Johannes, Leo und Leon bewegen die Ewige Tafel" stand über zwei
  Gesichtern, und welcher der drei fehlt, sagte nichts. Der Deckel ist
  deshalb derselbe — drei, und ab dem vierten zählt ein Chip den Rest, wie
  auf der Karte [§C27].
  **Der große Wert ist der Sortierwert seines Belegs** (`_newsTafelWert`).
  Gelesen wurde die erste Zahl des Fließtexts, ohne Vorzeichen und ohne
  Einheit: unter einer Übernahme von „Der Höhenflug" stand „10 %", während
  der Satz darunter „+10 %-Punkte" nennt — ein Unterschied als Anteil
  gelesen, und das Plus fehlt. Der Beleg beginnt garantiert mit dem
  Sortierwert [§C35], also steht er dort und muss nicht gesucht werden; nur
  eine Karte ohne `ev` fällt auf den Satz zurück. Ein langer Wert wird dabei
  kleiner statt breiter (`data-lang`) — „+10 %-Punkte" brach in zwei Zeilen
  und drückte die Schlagzeile daneben auf drei.
  **Eine Pleitenserie sagt, wie lange der letzte Sieg her ist.** „Fünf
  Niederlagen am Stück." nannte die Zahl und sonst nichts: ob das vor zwei
  Wochen oder gestern anfing, stand nirgends, und genau das ist die Frage,
  die eine Durststrecke aufwirft. Die Karte nennt deshalb den Tag, vor dem
  der letzte Sieg liegt — **und keinen Punkt dahinter**: „25.08." trägt
  seinen eigenen schon, und der des Satzes stand daneben („liegt vor dem
  25.08.."). Jede abgekürzte Angabe am Satzende hat das Problem, also prüft
  `tests/ambient` es über jeden vierten Spieltag der Ligageschichte.
  **Und der Schlusssprint bekommt keinen Nachsatz.** `_breakingHeroText`
  trug für ihn „Machtwechsel an der Tabellenspitze: … Das Titelrennen ist
  wieder völlig offen" — ein Etikett mit Doppelpunkt am Satzanfang, ohne eine
  einzige Zahl, und die offene Lage stimmt bei 91 Elo Vorsprung nicht. Der
  Fall ist weg, damit fällt der Nachsatz auf `desc` zurück, und den
  unterdrückt der Aufrufer: `desc` steht eine Zeile höher.
  **Und das Blatt passt auf das Telefon.** Die Zahlenreihe trug fünf Zellen,
  „BESTMARKEN" war 75 px breit und die Zelle 62 — `overflow:hidden` schnitt die
  Aufschrift ab. Daneben endete „noch 1615 bis zum Ordensstern" als „noch 1615
  bis zum Ord…" und nannte die Stufe nicht, und das Zeichen der Stufe stand bei
  34 px als dunkler Fleck da, obwohl unter 48 px vom Wappen nichts übrig bleibt
  [§6]. Die Reihe bricht deshalb um, die Aufschrift darf zwei Zeilen nehmen, die
  Zeile der Wirkung auch, und das Zeichen misst 48 px. `tests/blatt` misst das
  bei 360 px für JEDEN Story-Typ: läuft etwas aus dem Rand, oder ist eine
  Aufschrift abgeschnitten, die nicht kürzen darf?

    **Aber sie bedeckt nicht den ganzen Bildschirm** (`NEWS_LIMITS.sammelZeilen`).
  Die Regel war für zwei bis vier Teile geschrieben. Gemessen trug ein
  Tafel-Moment neunzehn Zeilen — fünf Bestmarken, dreizehn Monatschroniken und
  ein Insignium —, und die Karte war gerendert 852 px hoch und damit höher als
  das Telefon: damit versteckte gerade die vollständige Liste alles andere des
  Tages. Sechs waren noch zu viele: gemessen am 28.09. trug ein Tafel-Moment
  achtzehn Zeilen, und die Karte war ein Block aus Namen. Auf der Karte
  stehen deshalb **vier** und dahinter die Zahl der übrigen. Im **Blatt**
  steht weiterhin jede einzelne Zeile — die Karte fasst zusammen, das Blatt
  zeigt alles.
  **Und ein Ausbau steht gar nicht auf der Karte.** Wichtig ist, was wirklich
  in der Chronik steht und welcher Rekord wirklich übernommen wurde; ein Ausbau
  ist keins von beidem — derselbe Halter, ein besserer Wert, kein Wechsel.
  Gemessen trug ein Tafel-Moment achtzehn Zeilen, elf davon Ausbauten, und bei
  vier Plätzen standen zwei Wechsel und zwei Ausbauten darauf. Sie zählen jetzt
  in die Zahl dahinter, und das Blatt zeigt sie. Gibt es NUR Ausbauten, bleibt
  der stärkste stehen: eine Karte mit leerem Band ist schlimmer als eine, die
  einen Ausbau nennt.
  **Und zuerst steht, was Wirkung hat.** Sortiert war nach `prio`, also nach
  der Familie: Bestmarke, Monatschronik, Insignium. Bei achtzehn Zeilen sagt
  das nichts mehr — elf davon waren Ausbauten, und der eine Monatseintrag,
  der wirklich in der Chronik landet und fürs Prestige zählt [§C32], lag
  dahinter. Drei Stufen: der **gekennzeichnete Chronik-Eintrag**
  (`zeigt === true`, die Marke „in der Chronik"), dann jeder
  **Halterwechsel** — darin weiter Bestmarke vor Monatschronik vor
  Insignium-Stufe —, dann das **Ausbauen**, bei dem niemand gewechselt hat.
  **Die Reihenfolge wiegt die Karte dabei nicht.** `kopf` trägt Rang, Rubrik
  und Zeichen der Sammelkarte, und `kopf` war die erste ANGEZEIGTE Zeile:
  gemessen fiel der Tafel-Moment des 26.08. von 84 auf 70, sobald vorne die
  Monatschronik stand und nicht die Bestmarke — und damit unter den
  Tagesdeckel. Der Kopf ist der stärkste Teil, die Reihenfolge eine Frage der
  Lesbarkeit.
  **Und sie wächst nicht über ihr Band hinaus** (`PRIO_SPIELTAG_MAX`). Die
  Karte wiegt mehr mit jeder Zeile, zwei Punkte je Stück: achtzehn Zeilen
  ergaben 110 und standen damit über dem Breaking-Band (90+), ohne Breaking zu
  sein [§C33 `STORY_PRIO`]. Ihren Platz hält sie auch ohne das — die Ewige
  Tafel hat je Tag einen reservierten —, also bleibt sie bei 89.
  **Der große Wert zählt Wechsel, keine Ausbauten.** „18 WECHSEL" stand über
  einem Moment, in dem elf Zeilen ein Ausbau waren: derselbe Halter, ein
  besserer Wert, kein Wechsel. Dasselbe im Satz — „elf Bestmarken" zählte
  beide zusammen; er nennt sie jetzt getrennt („Eine Bestmarke, vier
  Ausbauten, zwei Monatschroniken und ein neues Insignium"). Jede Zeile trägt ihre
  Beteiligten (`pids`) — daran hängt die Bündelung, und im Blatt führt die
  Zeile damit zu dem, von dem sie handelt.
  Verknüpfte Spielstories heißen „Ein Spiel, zwei Geschichten für …"; ihr
  Teaser erzählt, wie der Schlusspfiff in mehreren Richtungen nachwirkt.
  Technische Floskeln wie „Ereignisse in einem Moment", „alle Belege" oder
  „alle Einzelheiten stehen darunter" sind verboten: Das Band selbst macht
  die Vollständigkeit sichtbar.

  **Der Feed reicht vierzehn Tage zurück** (`NEWS_FENSTER_TAGE`), und der
  Schnitt liegt am DATUM. Er lag an der Zeilenzahl: die App las die 100
  jüngsten Zeilen und zeigte davon 50, und bei achtzehn bis sechsundzwanzig
  Karten je Spieltag reichte das rund acht Tage weit. Eine Zeilenzahl ist
  keine Fensterbreite — sie hängt daran, wie viel gerade los war, und wer
  nach einer Woche Pause hineinsah, fand seinen eigenen Spieltag nicht mehr.
  `_loadStoriesFromDb` liest das vollständige Datumsfenster in Seiten von
  `NEWS_DB_SEITENGROESSE`; weder Datenweg noch Anzeige besitzen einen
  fachlichen Gesamtdeckel.
  **Dieselbe Auszeichnung ist einmal Nachricht, dann an runden Marken**
  (`NEWS_BADGE_MARKEN`: 1, 5, 10, 20, 25, 50, 75, 100, 125; ab 150 jeder
  weitere 25er-Schritt). Die Karte entstand jedes Mal
  neu, wenn jemand ein Badge wieder holte: gemessen stand „Martin: Mauer"
  vierzehnmal im Feed, wortgleich — der Text ist die Bedingung aus dem
  Katalog und ändert sich nie. 93 der 866 je gebildeten Karten gingen darauf
  zurück, mehr als auf jede andere Quelle; nach der Regel sind es elf.
  **Wie oft, sagt die Klasse** (`_badgeTakt`). Eine Liste für alle drei war in
  beide Richtungen zu grob. Eine **legendäre** Auszeichnung ist jedes Mal eine
  Nachricht: sie ist das Seltenste, was der Katalog hergibt, und „Absoluter
  Sieger" ist beim zweiten Mal genauso der Grund, warum jemand die App öffnet
  — nach der Liste fiel sie zwischen der zehnten und der fünfundzwanzigsten
  Verleihung weg. Eine **seltene** beim ersten Mal und an den runden Marken.
  Eine **gewöhnliche** erst ab der fünften (`NEWS_BADGE_MARKEN_KLEIN`): einen
  Zittersieg holt jeder, der lange genug dabei ist, und der erste ist keine
  Nachricht.
  **Und die kleinen Marken einer Partie stehen zusammen** (`badge_marken`,
  `match:<matchId>`). Eine gewöhnliche Auszeichnung kam im Feed gar nicht vor —
  nur legendär, selten und die gewhitelisteten Sonderfälle bekamen eine Karte,
  und damit fehlte genau das, was ein Spieler aus der unteren Hälfte überhaupt
  erreicht. Einzeln können sie es nicht sein: gemessen fallen an sieben der
  vierzehn Tage eine bis vier runde Marken, und vier Karten „X: Zittersieg"
  untereinander sind ein Protokoll. Also eine Veröffentlichung je Partie, die
  in deren gemeinsame Matchkarte eingeht und jeden Betroffenen nennt, mit
  `prio 39` als schwächste Meldung des Spieltagsbandes. Bei genau einer Marke steht die Zahl in der Schlagzeile und
  der Text ist die Bedingung aus dem Katalog; ihr Blatt trägt dann dasselbe
  Medaillon wie eine einzelne Auszeichnung [§C27], bei mehreren eine Zeile je
  Marke.
  Der Generator behält alle newswürdigen Auszeichnungsthemen einer Partie,
  nicht nur das seltenste. Identität einer Verleihung ist Spieler, Badge und
  Match-ID; gleiche Sekunde allein ist weder eine Doublette noch derselbe Rang.
  Prestige zählt dagegen jedes Erreichen mit einer flacher werdenden, aber
  nie endenden Folge [§C34]. Eine **Würde** ist ausgenommen — sie ist je Saison neu
  zu holen und jedes Mal eine Nachricht.
  **Ein überholter Elo-Rekord verschwindet.** Neun Karten „Neuer Elo-Rekord:
  Martin" standen nebeneinander, mit 128, 183 und 214 Elo — acht davon
  behaupteten eine Bestmarke, die längst überboten war. Dieselbe Regel wie
  bei der überholten Serie: es bleibt die, die noch gilt.
  **Und ein überholter Liga-Rekord auch, aber nur neben seinem Nachfolger.**
  Ein Rekord kann an einem Nachmittag zweimal wechseln: gemessen am 10.09.
  stand „Martin übernimmt ‚Der Zerstörer'" im Feed zwei Karten über „Jannik
  baut ‚Der Zerstörer' aus", und beim „Gigantentöter" stand „Henry und
  Jannik übernehmen" acht Minuten vor „Henry übernimmt" — dasselbe Feld, nur
  enger geworden. Eine Karte fällt weg, wenn **beides** zutrifft: eine
  jüngere Karte über denselben Rekord steht daneben, und ihr eigener Halter
  ist heute keiner mehr. Ohne die zweite Bedingung verschwände auch eine
  Übernahme, der nichts widerspricht — die erzählt von ihrem Tag und nicht
  von heute. **Dieselbe Regel gilt für die Monatschronik**, denn auch ihr Feld
  wird im Lauf eines Tages enger und weiter: am 08.09. stand „Leo holt ‚Ohne
  Schwachstelle'", neun Minuten später „Leo und Maxi holen ‚Ohne
  Schwachstelle'" und drei Stunden danach „Maxi holt ‚Ohne Schwachstelle'".
  **Was wichtig ist, bleibt eine eigene Karte** (`_sammelEinzeln`): bei
  Spieltagsmeldungen Breaking und jede **seltene oder legendäre Auszeichnung**.
  Tafel-Breaking reist dagegen mit seinem vollständigen Tafel-Moment. „Nerven aus Stahl" (drei
  Zittersiege in Folge) ist der Grund, warum jemand die App öffnet — es steht
  nicht als Kleingedrucktes unter der Duo-Serie zweier anderer.
  **In der Karte IHRER Partie steht sie aber mit** (`klasse` an der Zeile,
  `.nf-sam-kl`, `.nw-kl`). Seit jede Partie eine Karte hat, hieß „einzeln
  bleiben" nämlich: NEBEN der Karte desselben Spiels. Gemessen stand ein 10:4
  zweimal untereinander — einmal als „Siegesserie in einer Partie" und einmal
  als „Jane: Wiederholungstäter" —, mit denselben vier Wappen und demselben
  Stand, und wer scrollt, liest zwei Partien statt einer. Sie reist deshalb mit
  und geht dabei nicht unter: die Schlagzeile nennt sie als „seltene" oder
  „legendäre Auszeichnung" statt nur als „Auszeichnung", ihre Zeile trägt die
  Klasse als Marke in Violett — die Familie der Auszeichnungen [§C25] —, und im
  Blatt steht sie mit ihrem Zeichen in der Gruppe. In einem FREMDEN Bündel
  bleibt sie weiter außen vor.
  **Und eine Partie zeigt ihr Ergebnis einmal** (`bandFremd`). Jede Geschichte
  mit einer `matchId` zeigt das Ergebnisband. Bleibt eine alte oder nicht
  matchbezogene Kartenform trotzdem neben ihrer Partie stehen, stand
  dasselbe Band zweimal untereinander. Das Band gehört deshalb der Partie: die
  Partie-Karte und ihr Bündel tragen es, alles andere, was nur daran hängt,
  verzichtet darauf. Damit ist die Trennung eindeutig, und die Karte behält ihr
  Gesicht; im Blatt steht die Partie weiterhin.
  **Zwei Breaking-Meldungen aus DERSELBEN Partie sind aber eine Nachricht**
  (`SAMMEL_BREAKING`). Gemessen stand „Neuer Spitzenreiter: Maxi" mit dem
  Ergebnisband 10:0 im Feed und „Maxi und Henry: Absoluter Sieger" — die
  legendäre Auszeichnung für genau dieses 10:0 — als zweite Karte daneben:
  dasselbe Spiel, dieselben Wappen, derselbe Stand, zweimal gelesen. Sie
  werden eine Karte, die Breaking bleibt, das Ergebnis der Partie als Band
  trägt und in der Schlagzeile **beide Anlässe nennt** („Neue Tabellenspitze
  für Maxi und legendäre Auszeichnung „Absoluter Sieger" für Maxi und Henry") — „Ein Spiel, zwei
  Geschichten" gilt für jeden Spieltag und verschweigt genau das, was diese
  Karte besonders macht. Zusammengelegt wird nur über die **Partie**, nie über
  die Minute: eine gemeinsame Minute ohne gemeinsames Spiel sagt nichts.
  **Und die übrigen Meldungen derselben Partie reisen mit.** Zusammengelegt
  wurde nur Breaking mit Breaking, und damit stand die gewöhnliche Meldung
  desselben Spiels als eigene Karte daneben — mit demselben Ergebnisband,
  denselben vier Wappen und demselben Stand. Gemessen am 21.09. lagen „Martin
  führt die Tabelle" (Breaking) und „Stefan und Julian stürzen die Favoriten"
  untereinander, beide mit dem Band 10:7: zwei Fakten, aber ein Moment, und
  ein Moment ist eine Karte. Seltene und legendäre Auszeichnungen sowie
  negative Ereignisse mit derselben Match-ID reisen ebenfalls mit. Ihre
  Klassenmarke beziehungsweise rote Zeilenrichtung bleibt sichtbar. Nur fremde
  Partien und nicht matchbezogene Veröffentlichungen bleiben getrennt.
  Die Schlagzeile nennt die Anlässe schon, sobald **eine**
  Zeile Breaking ist; verlangte sie zwei, fiel ein Bündel aus einem Breaking
  und einem Ergebnis wieder auf „Ein Spiel, zwei Geschichten" zurück. Und ein
  Ergebnis heißt dort, was es war (`ERGEBNIS_MOTIV`: Sieg ohne Gegentor,
  Favoritensturz, Ein-Tor-Krimi, klarer Sieg, enges Spiel) — „besonderes
  Ergebnis" stand neben „neue Tabellenspitze" und sagte von den zwei Anlässen
  gerade den nicht, der die Partie ausmacht. Ab dem vierten Namen bleibt ein
  Anlass ohne sie: „für Martin, Maxi und zwei weitere" nennt keinen davon
  vollständig, und wer gemeint ist, sagen Band und Sammelband darunter.
  **Was eine Auszeichnung derselben Partie erzählt, erzählt das Ergebnis
  nicht noch einmal** (`BADGE_DECKT`). „Absoluter Sieger" IST das 10:0, „Upset
  King" IST der Favoritensturz. Die Regel stand nur im Generator und galt
  damit nur für neue Karten; gemessen am 15.09. lag „Maxi und Henry gewinnen
  ohne Gegentor" aus einem älteren Lauf in der Datenbank, und weil der
  Generator diese ID nicht mehr bildet, konnte sie auch niemand umschreiben.
  Gefragt wird nach dem **Bestand**: liegt die Auszeichnung im Stapel, fällt
  das Ergebnis — liegt sie nicht darin, weil eine gewöhnliche Auszeichnung
  nur an runden Marken eine eigene Karte bekommt, bleibt das Ergebnis die
  einzige Nachricht darüber.
  **Eine gewöhnliche Auszeichnung deckt dabei genauso.** Gesammelt wurde nur
  aus `badge_unlocked`, und eine gewöhnliche Auszeichnung hat keine eigene
  Karte: sie steht in der gemeinsamen Matchmeldung `badge_marken`. Genau ihre
  Marken sind es aber, die das Ergebnis erzählen. Und „Zittersieg" heißt im
  Katalog `nail_biter` und ist auf „10:9 Sieg" definiert — dasselbe wie der
  Ein-Tor-Krimi, nur unter anderem Namen, und er fehlte in der Liste.
  Gemessen hieß die Karte des 25.08. damit „Ein-Tor-Krimi und Auszeichnung
  in einer Partie", während ihre Zeile „Johannes holt ‚Zittersieg' zum
  5. Mal · 10:9 Sieg" trug.
  **Die Karte fasst zusammen, das Blatt zeigt alles.** Der Text der
  Tafel-Karte hängte die Schlagzeilen aller Zeilen aneinander und trug damit
  die Liste, die das Blatt darunter ohnehin führt; er beschreibt jetzt den
  gemeinsamen Moment, die Einzelheiten tragen nur die Zeilen. Und im Blatt fällt die Zeile weg,
  die der Kopf schon ist [§C33 `_ndNeu`]: bei einer Spiel-Sammelkarte
  gehören Schlagzeile und Text dem stärksten Ereignis, dessen Zeile stand
  darunter wortgleich ein zweites Mal. Bleibt dabei nichts übrig, wird die
  ganze Liste gezeigt — ein leeres Blatt ist schlimmer als eine Wiederholung.

  **Neu ist, was seit dem letzten Blick dazugekommen ist** (`NEWS_LS_STAND`,
  `_newsGelesen`). Gezählt wurde, was nicht in der Liste der gelesenen IDs
  steht — und das ist nicht dasselbe. Die Liste kennt nur, was auf dem
  Bildschirm stand, und der Feed zeigt nicht jeden Tag dieselbe Auswahl: eine
  Karte fällt unter einen Deckel, eine gleichlautende Schlagzeile verdrängt
  sie, eine Sperrfrist läuft ab. Gemessen über fünfundvierzig Tage trugen 81
  von 267 neu auftauchenden Karten (30 %) einen Zeitpunkt, der länger
  zurückliegt als alles, was der Leser schon gesehen hat: „Martin und Alex
  brechen Julians 7er-Serie" vom 09.07. kam am 14.07. und am 20.07. erneut als
  neu hoch, und über einem Tag ohne eine einzige neue Karte stand „1 NEU".
  „Alles gelesen" setzt deshalb einen **Lesestand** — den Zeitpunkt der
  neuesten Karte, die dabei im Feed stand. Gelesen ist, was in der Liste steht
  ODER älter ist als der Lesestand. Eine Karte, die später mit altem Zeitpunkt
  doch noch erscheint, steht damit unter einem Tag, den der Leser gelesen hat,
  und behauptet das nicht mehr.

  **Eine Karte, die eine frühere fortsetzt, sagt es** (`_newsFaeden`,
  `.nf-faden`). „Anton und Johannes verlieren zusammen alles" am 25.08. und
  „Johannes und Anton stürzen die Favoriten" am 26.08. standen als zwei
  Fremde da; dass die zweite die erste beendet, musste der Leser selbst
  finden. Der **Faden** ist eine Zeile unter der Karte mit dem Titel und dem
  Tag der früheren und ihrer Art: **Ende** (der Serienbruch zur Serie),
  **Wende** (der erste Sieg nach einer Pleitenserie), **Revanche** (die
  nächste Begegnung derselben zwei Duos, andersherum ausgegangen),
  **Rückeroberung** und **Fortsetzung** (derselbe Rekord, dieselbe
  Monatschronik, derselbe Lauf) und **Wechsel** an der Tabellenspitze.
  Antippen öffnet die frühere Karte; ihr Blatt nennt umgekehrt, wo es
  weitergeht. Er ist eine Ableitung wie `_isBreaking`, nichts davon wird
  gespeichert, und er zeigt nur auf eine Karte, die im Feed steht und älter
  ist. Gesucht wird über die ungebündelten Meldungen, weil die Serie, die
  eine Partie beendet, in einer fremden Sammelkarte stecken kann.
  **Jede Beziehung wird an den Partien nachgeprüft**, nicht am Wortlaut: eine
  Pleitenserie wendet nur der ERSTE Sieg danach, eine Serie endet nur, wenn
  dazwischen keine Niederlage lag — sonst zeigte jede spätere Partie derselben
  Leute auf dieselbe alte Karte. Eine **Revanche** zählt nur über Tage: das
  Rückspiel direkt danach ist am Kicker der Normalfall, und gemessen waren
  es sieben von zehn Fäden. Eine **Rückkehr** nach der Pause gibt es nicht:
  die Karte der Pause fällt mit der nächsten Partie weg, es steht also nie
  eine im Feed, auf die sie zeigen könnte. Gerechnet wird einmal je Bestand
  (`WeakMap` an der aufgefrischten Liste), gemessen unter einer Millisekunde.
  `tests/ambient` rechnet jeden Faden aus den rohen Partien nach,
  `tests/blatt` misst ihn bei 360 px und öffnet ihn.

  **Breaking scheitert auch nicht am Doublettenfilter.** Die Tabellenspitze
  wechselte am 14.09. zweimal und am 15.09. erneut; zwei der drei Karten
  hießen „Neuer Spitzenreiter: Maxi" und trugen Wort für Wort denselben Text,
  also warf der Vergleich nach Schlagzeile UND Text die ältere weg — der Tag,
  an dem er die Spitze übernahm, hatte danach keine Breaking-Karte mehr. Zwei
  Wechsel sind zwei Ereignisse, und sie stehen unter zwei Tagesköpfen.
  Der Text war dabei die eigentliche Ursache: „X steht nach dem letzten Spiel
  an der Spitze. Y war vorher dort" nennt keine Zahl und ist damit an jedem
  Wechsel derselbe Satz. Er nennt jetzt den Elo-Stand und den Vorsprung — das
  sagt zugleich, wie knapp es oben zugeht.
  **Breaking scheitert an keiner Sperre.** Der Schlüssel der Sperrfrist
  sortiert die Beteiligten, damit dieselben zwei Halter in anderer Reihenfolge
  nicht als Wechsel gelten. Bei einem **gerichteten** Ereignis dreht das die
  Aussage um: „Maxi verdrängt Martin" und „Martin verdrängt Maxi" tragen
  dieselben zwei Namen. Gemessen wechselte die Tabellenspitze am 14.09.
  zweimal und am 15.09. erneut, und von den drei Breaking-Karten blieb genau
  eine stehen — die Sperrfrist hielt die anderen für Wiederholungen derselben
  Aussage. Breaking ist das Seltenste; es darf an keinem Deckel und an keiner
  Sperre scheitern.
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

  **Zwei Karten mit derselben Schlagzeile sind eine zu viel** — außer bei
  dem, was es je Tag, Woche oder Monat genau einmal gibt (`TAG_PFLICHT`).
  Derselbe Spieler gewinnt zwei Spieltage, und die Schlagzeile lautet
  beide Male gleich: gemessen holte Martin den 02.09. mit 3 von 3 und den
  08.09. mit 5 von 7, und die ältere Karte fiel weg. Sie stehen unter zwei
  verschiedenen Tagesköpfen, und jede nennt im Text ihr eigenes Datum. Eine
  echte Doublette fängt weiterhin der volle Vergleich aus Schlagzeile UND
  Text ab. Sonst gilt: der Feed
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
  Drei sind dazugekommen. Den Spitzenwechsel gab es einmal je Wechsel
  (`lead_change_<Saison>_<Partie>`), heute ist es eine Karte je Tag
  (`lead_day_<Saison>_<Tag>`): gemessen am 21.09. stand „Neuer Spitzenreiter:
  Martin · 11 vor Maxi" in derselben Minute wie „Martin übernimmt die
  Tabellenspitze · 28 vor Maxi" — ein Ereignis, zwei Karten, zwei
  verschiedene Zahlen, weil die alte ihren Vorsprung eingefroren trägt. Und
  der **Elo-Bestwert** (`elo_record_`) steht als „Der höchste Gipfel" in der
  Ewigen Tafel; seiner Karte war das Breaking schon genommen, die Doppelung
  damit nicht. Und das **Ergebnis** (`match_result_`) entstand nur für ein
  auffälliges Muster und höchstens zweimal je Tag; heute bekommt jede Partie
  ihre Karte (`spiel_<Partie>`), und die alte Zeile lag daneben — dieselbe
  Partie, dasselbe Ergebnisband, zwei Karten untereinander.

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

  Ein **historischer Serien-Meilenstein** ist dagegen ein Match-Ereignis und
  bleibt auch nach dem späteren Serienbruch erhalten. Der Generator läuft die
  Partien chronologisch ab, verankert 5er-, 7er-, 10er- und weitere Marken an
  der auslösenden Partie und baut die stabile ID aus Spieler, Match und Länge.
  Starke Upsets werden ebenso ihrem Match zugeordnet; je Tag bleibt die
  stärkste Überraschung, im Fenster höchstens vier.

  `_newsTexteAuffrischen` merkt sein Ergebnis auf die Eingabe und gibt bei
  unverändertem Wortlaut dieselbe Referenz zurück. Ohne das baute es bei
  jedem Aufruf ein frisches Array, und der Referenz-Memo in
  `_consolidateStories` — der genau dafür gebaut ist — schlug nie an:
  gemessen null Treffer in fünf Aufrufen, bei einem Aufruf nach jedem
  `loadAll` und bei jedem Zeichnen des Feeds. `tests/ambient` misst das alles.

  **Das Ergebnis im Text gehört dem Sieger.** Es stand in der Reihenfolge der
  Eingabe, und damit stand „Maxi und Leo retten ein 9:10 ins Ziel" im Feed —
  die Sieger genannt und dahinter der Stand des Verlierers. Dasselbe im
  Spitzenspiel: unter „Leon schlägt Julian" stand „9:10". Eine Karte, die zwei
  verschiedene Sieger behauptet, ist keine Nachricht.
  **Und der Elo-Gewinn gehört einem, nicht der Partie** (`eloPid`). „Der Sieg
  bringt +19 Elo" stand da, und die Zahl ist die des STÄRKEREN von zwei
  Siegern: gemessen tragen nur 24 der 466 Partien für beide dieselbe Zahl,
  und der Abstand geht bis 38 Elo. Der Satz nennt deshalb, wem sie gehört
  („Für Julian bringt der Sieg +19 Elo"); die Elo je Spieler zeigt das Blatt
  (`_ndEloWirkung`). Kennt eine ältere Zeile den Träger nicht, bleibt die
  Zahl weg — eine Behauptung über zwei Leute ist schlimmer als eine Zahl
  weniger.
  **Kein Etikett mit Doppelpunkt am Satzanfang, kein Satzfragment, keine
  englische Aufschrift.** „Saison-Endspurt: Leon führt mit 91 Elo Vorsprung"
  ist eine Rubrik und ein Satz in einem, und die Rubrik steht schon über der
  Karte [§C27]. „Seit dem 16.07. geht jedes gemeinsame Spiel verloren. 3 am
  Stück." endet auf einem Fragment ohne Verb. Und „Giant Slayer" und „Losing
  Streak" waren die einzigen englischen Aufschriften der Liga — „Player of the
  Week" und „Player of the Day" bleiben, das sind die Namen der beiden
  Wertungen. `tests/ambient` prüft das über jeden vierten Spieltag der
  Ligageschichte: ein einziger Generatorlauf trifft von jedem Typ höchstens
  einen Fall, und dann prüft die Zusicherung genau den, der zufällig gerade
  ansteht.
  **Und der Text wiederholt nicht seine Schlagzeile.** „Leo: Sieg Nummer 100"
  trug darunter „Leo feiert den 100. Sieg", „Leo knackt 300 Elo" trug „300 Elo
  zum ersten Mal überschritten". Jeder Text nennt eine Zahl, die die
  Schlagzeile noch nicht hat.

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
  Außerdem ergänzt die Auffrischung ableitbare Generator-Ereignisse, die im
  Vierzehn-Tage-Fenster in einer älteren Datenbank noch fehlen. Die stabile
  fachliche ID entdoppelt diesen Backfill; es braucht weder Migration noch
  pauschale Neuberechnung historischer Daten.

  **Derselbe Datenstand ergibt dieselbe Karte.** Eine Story wird persistiert,
  damit alle Geräte dieselbe Karte zur selben Zeit sehen — das hält nur,
  solange ein zweiter Lauf über dieselben Partien dieselben IDs, dieselben
  Zeitpunkte, dieselbe Gruppierung und denselben Wortlaut ergibt. Sonst legt
  jedes Öffnen der App eine neue Zeile an, und der Feed wächst vom Zusehen.
  Jede ID ist deshalb aus Fachlichem gebaut — Spieler, Sache, Spieltag — und
  nie aus dem Bestand, der Uhrzeit des Laufs oder einem Zufall.
  `tests/ambient` läuft den Generator zweimal und vergleicht beides samt der
  fertigen Gruppierung, und ein dritter Lauf findet den Bestand des ersten
  vor: er darf keine einzige ID hinzufügen.

  **Der Rang gehört dazu** (`_newsPrio`). `prio` stand als Zahl mit in der
  Zeile, und als die Skala auf EIN Band umgestellt wurde, blieb jede längst
  gespeicherte Karte auf ihrer alten stehen: gemessen trugen 113 der 153
  Zeilen im Vierzehn-Tage-Fenster noch einen Wert von höchstens zehn, und von
  den fünfundzwanzig, die der Generator heute noch bildet, wichen
  vierundzwanzig ab — „Die Woche gehört Martin" stand mit 9 neben einer
  frischen Sammelkarte mit 80. Damit waren die zwei Skalen wieder da, diesmal
  zwischen Datenbank und Generator, und der Tagesdeckel entschied zwischen
  ihnen. Überlebt haben die alten Karten nur dort, wo eine Ausnahme sie trug:
  Breaking und die Pflichtkarten zählen nicht gegen den Deckel. Gerechnet
  wird deshalb immer neu — die Zahl des Generators, sonst das Band des Typs
  aus `STORY_PRIO`.

  **Breaking ist das Seltenste, also darf es das Lauteste sein.** Sieben
  Anlässe sind erlaubt, das sind wenige Karten pro Saison. Vorher unterschied
  sie ein dünner roter Rahmen von jeder anderen Karte, und im Feed ging sie
  unter. Jetzt: voller Rahmen, ein Balken mit pulsierendem Punkt, ein warmer
  Schein von links unten und eine Schlagzeile, die die Karte trägt. Der Puls
  ruht bei `prefers-reduced-motion`.
  Der **Nachsatz** darunter (`.nf-brk-sub`, `_breakingHeroText`) trägt den
  langen Satz — aber nur, wo es einen gibt. Die Funktion kennt sieben Typen
  und fiel sonst auf `desc` zurück: damit stand der Teaser auf jeder anderen
  Breaking-Karte zweimal untereinander, auf der gebündelten ebenso wie auf
  jeder legendären Auszeichnung [§C33 `_ndNeu`].

  **Die Karte des Tages** (`_newsTagKarte`, `.nf-gross`) steht groß an ihrer
  Uhrzeit, nicht am Kopf des Tages — sie nach oben zu ziehen wäre genau die
  Umsortierung, die der Feed nicht mehr macht. Es gibt sie **nur an
  Spieltagen**: an einem Tag ohne Partie ist nichts passiert, was ihn von einem
  anderen unterscheidet, und dort standen sonst ein Fun Fact oder eine
  Zufallsstatistik groß im Bild, die gestern genauso dagestanden hätten.
  Und sie steht, **sobald der Spieltag entschieden ist**: mit der
  `NEWS_LIMITS.tagKartePartien`-ten Partie des Tages, also der fünften, und in
  dem Moment, in dem sie gelaufen ist — nicht ab der Zahl allein, sonst stünde
  das Band am Morgen danach rückwirkend über einer Karte von vor der fünften
  Partie. Acht Partien waren einmal die Schwelle, der Median der Liga, und
  damit warteten 36 % der Spieltage bis zum Abend auf ein Band, das längst
  fällig war; an vierzehn der 19 Spieltage vom 28.07. bis 26.08. lagen fünf
  Partien um die Mittagszeit vor. Bei zwei bis vier Partien fängt
  `tagKarteStunde` den Tag auf, 19 Uhr — keine der 466 Partien hat nach 18:31
  angefangen. Und bei **genau einer Partie gibt es kein Band**
  (`tagKarteMin`): ein Spiel ist kein Spieltag, und das Band säße auf der
  einzigen Karte, die es ohnehin gibt.
  Welche Story es trägt, entscheidet `_newsTagSpannung` unter denen, die es
  tragen dürfen (`_newsTagKarteWuerdig`): Rekordwechsel, große
  Überraschungen, Spitzenspiele und mehrteilige Ereignisse stehen vor einer
  gewöhnlichen Tagesbilanz. **Vier Sorten tragen es nie**, jede aus ihrem
  eigenen Grund. **Breaking** nicht: die Karte ist im Feed ohnehin die
  lauteste, voller Rahmen, pulsierender Balken, Schein hinter der Fläche —
  das Band darüber sagt dasselbe ein zweites Mal [§C27] und nimmt es genau
  der Karte, die sonst keine Möglichkeit hat, herauszustehen. **Der Spieler
  des Tages** nicht: er ist eine Pflichtkarte, steht an jedem gewerteten
  Spieltag und trägt seine Goldkante schon — er hätte das Band an jedem
  ruhigen Tag von selbst, und dann zeichnet es nichts aus. **Ein Rückblick**
  nicht: Woche, Monat und Saison erzählen von einem Zeitraum, das Band gehört
  dem Tag. Und **keine Karte mit negativer Richtung** (`_newsIstNegativ`):
  das Band ist golden, und Gold gehört dem Titel [§C25] — gemessen trug
  „Anton: Die Talfahrt", eine Schande, das Band und den goldenen
  Auswahlschimmer. Bleibt danach kein würdiger Kandidat, trägt an diesem Tag keine
  Karte das Band — und ebenso, wenn der stärkste unter dem Niveau einer
  Tagesbilanz bleibt (`NEWS_LIMITS.tagKarteSpannung`): gemessen trug ein
  Spieltag das Band auf „Der größte Ausschlag des Tages" mit 564 Punkten gegen
  620 für einen Tagessieger, und ein Band, das eine beliebige Karte
  auszeichnet, zeichnet nichts aus. Die Liste steht an EINER Stelle, weil `tests/ambient` und
  `tests/blatt` dieselbe Frage stellen und sie sich vorher jeder selbst
  beantwortet haben.
  Die Auswahl ist deterministisch und verändert weder Story-ID noch Zeitpunkt.
  Sie wird aus allen Karten des Tages berechnet, nicht neu aus dem aktiven
  Filter; ist die Gewinnerstory dort ausgeblendet, bekommt keine Ersatzkarte
  das Band.
  Die Auswahl wird über den echten Vierzehn-Tage-Verlauf nachgemessen: An
  jedem Spieltag muss sie den höchsten Spannungswert tragen, mindestens das
  Niveau einer Tagesbilanz erreichen und darf nie ein Ambient-Fact sein.
  Der Spieler des Tages gewinnt das Band dabei nur an Tagen, an denen keine
  stärkere Geschichte entstanden ist.
  Vorher wurde sie zwanzig Minuten nach dem ersten Spiel vergeben: der Rekord,
  der gerade wechselte, war die einzige Karte des Tages und damit automatisch
  die stärkste, während der Spieltag noch lief und der Spieler des Tages noch
  gar nicht feststand. Danach stand sie erst um 23:59 und damit einen halben
  Tag, nachdem die letzte Partie gelaufen war. Welche Partien zu einem
  Kalendertag gehören, sagt `_newsTagMs` — in Ortszeit, weil der Feed nach
  Ortszeit gruppiert und `matchesByDay` nach UTC schlüsselt.
  **Die Sammelkarte zeigt ihre stärksten Zeilen, das Blatt alle.** Ihr eigener
  Titel ist eine Zusammenfassung und entspricht deshalb keinem Einzelereignis.
  Bis `NEWS_LIMITS.sammelZeilen` stehen alle Teile im Sammelband, darüber
  führt die Zahl der übrigen ins Blatt.
  **Wo der Erfolg ein Zeichen ist, steht das Zeichen dabei**
  (`_newsErfolgZeichen`). „Vier Spieler tragen jetzt den Schildring" zeigte
  den Schildring kein einziges Mal — daneben stand ein Pokal aus dem
  Icon-Katalog. Die App hat das Bauteil [§C27]; `insigniumStufeSvg` trägt
  seine Verläufe selbst und funktioniert deshalb auch dort [§C30].

  **Der Kopf einer Sammelkarte ist keine bevorzugte Detailzeile.** Titel und
  Text verbinden Beteiligte und Anlass zu einer redaktionellen Geschichte;
  das Sammelband belegt sie mit allen Einzelmeldungen. Im Blatt erhalten die
  Teile dasselbe Markup und denselben visuellen Rang.

  **Ein Fun Fact gehört fest zu seinem 15-Uhr-Slot und bleibt ein Snapshot.**
  Aus den Vorlagen gewinnt deterministisch die erste passende, die Rotation
  und Spieler-Cooldowns einhält. `syncStoriesViaDb` lädt den Bestand vor der
  Ziehung; ein bereits persistierter Slot wird weder neu gezogen noch durch
  `_newsTexteAuffrischen` verändert. Die ID lautet
  `ambient_<lokaler-Tag>_15`, der Zeitpunkt ist exakt 15:00 Uhr.

  **Ein Fun Fact zeichnet seinen Anlass** (`dataRef.bild`, `_faktBild`,
  `30c-news-fakt.js`). Alle trugen dieselbe Form: eine große Zahl links, der
  Satz rechts. „3 Tage ohne Spiel", „41 Awards", „3830 Prestige" und „7:2
  Duelle" sahen untereinander gleich aus. Jede Vorlage legt jetzt die Daten
  ihres Bilds in den `dataRef`, und die Karte trägt daraus einen eigenen
  Kopf:
  - das **Podest** für einen Bestwert;
  - das **Rennen** der ersten drei für die Form der letzten vierzehn Tage;
  - die **Strichliste** für gesammelte Titel;
  - die **Sterne** für Meistertitel [§C26];
  - das **Zählwerk** für eine große Summe und die runde Partie;
  - das **Tauziehen** für zwei Spieler;
  - der Lauf eines **Duos**;
  - die Felder der **Pause** samt Marke der längsten;
  - die **Vitrine** und die **Medaille**;
  - die **Stufe** der Leiter und das **Ziel**;
  - die zwei **Rollen**;
  - die **Verteilung** der Ergebnisse;
  - die **Säulen** der Spieltage und Wochen;
  - der **Platz** im Feld;
  - die **Tafel** des Monats.

  Das Bild steht an der Karte, Zahl und Gesichter links fallen dann weg
  [§C27]. Das Blatt trägt dasselbe Bild als Bühne. Gespeichert wird es mit
  der Karte, wie jede Zeichnung einer Story; eine ältere Karte ohne `bild`
  behält ihre Zahl links. Die Breite eines Balkens rechnet die Vorlage, weil
  dort bekannt ist, ob weniger besser ist. Die Reihenfolge eines Rekords
  (`chronicleRang`) ist schon nach dem Wert geordnet. Jedes Bild nennt die
  Namen seiner Spieler im Text, und es bleibt leise wie die Karte [§C25]:
  Metall, die Familienfarbe nur am Ersten. `tests/ambient` rechnet die Zahlen
  jedes Bilds an ihrer Quelle nach. `tests/blatt` misst jedes bei 288 und
  360 px.
  **Verpasste stille Tage werden nachgetragen.** Beim nächsten Öffnen prüft
  `_buildAmbientStories` alle Tage des 14-Tage-Fensters. Ein vergangener Tag
  bekommt seinen Slot nur, wenn dort keine Partie und vor dem Slot kein
  Saisonabschluss lag. Für heute zählt der Stand um 15:00 Uhr: eine erste
  Partie um 15:20 Uhr entfernt den bereits fälligen Funfact nicht, eine Partie
  um 14:50 Uhr verhindert ihn. Der erste Insert bleibt auf allen Geräten der
  kanonische Text- und Zeit-Snapshot.
  **Der Tagesplan.** `07:00` gab es nicht mehr: der Spieler des Tages steht um
  **23:59 an seinem eigenen Spieltag**, wenn keine Partie mehr dazukommen kann
  (die späteste der Liga hat um 18 Uhr angefangen). Vorher erschien er am
  Morgen danach und stand in der Tafel unter einem Datum, an dem gar nicht
  gespielt wurde. Der Fun Fact steht einmal täglich um **15:00 Uhr**, sofern
  bis dahin keine Partie und kein Saisonabschluss lag. Die Chronik des Vormonats steht am
  **1. um 00:00** statt am Vormittag danach. Der **Saison-Rückblick** steht
  dagegen am **letzten Kalendertag um 23:50** und damit unter dem Kopf des
  Monats, den er beschließt: er hing am Saisonstart, also am 1. um 00:00, und
  stand damit unter demselben Tageskopf wie die Monatschronik, von einem Monat
  erzählend, der dort gar nicht steht. Gebildet wird er weiter nur in den
  ersten zwei Tagen der neuen Saison — vorher steht der Meister nicht fest. Und der Wochenrückblick ist
  **eine** Karte am **Sonntag um 23:00** (`woche`): vorher standen sechs
  Wertungen als sechs Karten über den Montag verteilt, und der Montag ist der
  Spieltag — die vergangene Woche verdeckte, was gerade passierte. Die
  Wochengrenze liegt dafür in `_potwLastWeekRange`, damit Rückblick, POTW und
  Wochenkarte über dasselbe Fenster reden.

  **Der Spieltag führt, die Ewige Tafel ist die zweite Ebene daneben.**
  Inhaltlich teilte sich das Vierzehn-Tage-Fenster einmal ungefähr zur Hälfte in
  **Ewige Tafel** und **Spieltag plus automatisch erzeugte Fun Facts**, und der
  Test erlaubte 40 bis 60 %. Das war die Lage, in der nur ein Bruchteil der
  Partien überhaupt eine Karte hatte: gemessen kamen von 52 Partien des Fensters
  18 vor. Seit jede Partie ihre Karte bekommt, führt der Spieltag — die Tafel
  ist nicht die halbe Tafel, sondern die Ebene daneben, und ihren Platz je Tag
  hält sie über die Reservierung und nicht über eine Quote. Gemessen liegt sie
  bei 35 % der Ereignisse und 16 % der Karten; der Test erlaubt 25 bis 50 %,
  damit ein ungewöhnlich ruhiger oder ereignisreicher Spieltag nicht künstlich
  mit belanglosen Karten aufgefüllt wird. Gemessen werden Ereignisse, nicht
  bloß Karten: eine Sammelkarte mit vier vollständig sichtbaren Zeilen zählt
  vier Geschichten. `Tafel` und `Spieltag` sind im Filter exklusiv: eine
  Tafelmeldung darf einen Match-Zeitpunkt tragen, zählt deshalb aber nicht
  ein zweites Mal als Spieltagsmeldung.

  **Dieselbe These kommt nicht vor dreißig Tagen wieder**
  (`AMBIENT_PAAR_COOLDOWN_DAYS`). Eine These ist der Typ UND die Person:
  derselbe Typ über jemand anderen ist eine neue Aussage, und die
  Führungs-Typen zeigen strukturell immer auf denselben Kopf. **Eine These
  ohne Person ist der Typ selbst** — gemerkt wurde sie nicht, weil die
  Schleife über die Köpfe lief und es dort keinen gibt: „2 tragen den Reif, 7
  den Schildring" hängt an der ganzen Liga. Gemessen über vierzig
  nachgespielte Tage stand `insignium_stand` damit nach drei, vier und sechs
  Tagen wieder da, denn der Typ-Cooldown von sieben Tagen fällt ab dem zweiten
  Durchgang und ein personenloses Template liefert immer ein Ergebnis.
  Ausgenommen sind die **Rückblicke mit festem Termin** (`pflicht`): die
  Monatshalbzeit gehört dem 15. und der Jahresblick dem 1. Januar, sie hängen
  nicht am Losverfahren. `tests/ambient` spielt die vierzig Tage Slot für Slot
  nach und prüft jede These.
  Die Ambient-Auswahl rotiert nicht nur konkrete Templates, sondern auch ihre
  **Rubrik** (`ambientRubrik`). Zwei aufeinanderfolgende Slots vermeiden nach
  Möglichkeit dieselbe Erzählart; bei einem kleinen Pool wird die Sperre
  stufenweise gelockert, damit der Slot trotzdem gefüllt werden kann.

  **Wer nicht gespielt hat, hat nichts getan.** Ein Liga-Rekord und eine
  Monatschronik wechseln auch den Halter, weil ANDERE gespielt haben: „Der
  makellose Tag" misst einen Anteil, und wer den Bestwert hält, verliert ihn mit
  dem nächsten schwachen Tag — der Nächstbeste übernimmt, ohne angetreten zu
  sein. Gemessen trugen 23 von 280 Tafel-Karten einen Namen, der an diesem Tag
  keine Partie hatte; „Martin holt ‚Der Tagesabschluss'" stand über einem
  Spieltag ohne Martin. Die Karte kommt deshalb nur, wenn mindestens einer der
  Genannten an diesem Tag gespielt hat. Dieselbe Begründung wie beim Ausbauen:
  die anderen sind nur nicht vorbeigezogen.
  **Und sie nennt die, um die es geht, nicht jeden Mithalter.** „Martin zieht
  bei ‚Der Nachzügler' gleich" trug Martin UND Julian in `playerIds`, und die
  Tafel-Sammelkarte darüber hieß „Julian und Martin bewegen die Ewige Tafel" —
  über zwei Zeilen, die beide von Martin erzählen. Beim Dazukommen sind die
  Genannten die Neuen, sonst alle Halter.
  **Die ID einer Tafel-Meldung ist ihr Rekord und ihr Spieltag** — nicht der
  Stand des Augenblicks. Sie trug den angezeigten Wert und die sortierten
  Halter, und beides bewegt sich im Lauf eines Tages: gemessen stand nach der
  vierten Partie des 26.08. „Maxi übernimmt ‚Der Höhenflug'" im Feed, nach der
  fünften „Maxi und Johannes übernehmen" und nach der siebten „Maxi, Julian,
  Jane und Johannes übernehmen" — drei IDs, drei Karten desselben Vorgangs, und
  weil keine der anderen deutlich genug widersprach, blieben am Ende alle drei
  im Bestand stehen. Der Rekord wechselt an diesem Spieltag einmal; gerechnet
  wird gegen den Stand vor dem Spieltag, und ob danach einer oder vier halten,
  ist derselbe Vorgang. Also eine Karte, die mitwächst: der Wortlaut kommt aus
  dem Generator, der Zeitpunkt aus der Datenbank. Dieselbe Regel gilt für die
  Monatschronik (`chrget_<Chronik>_<Saison>_<Tag>`), deren Halterfeld im Lauf
  eines Tages ebenso enger und weiter wird. Der Spieltag bleibt in der ID:
  ohne ihn beschreibt dieselbe ID zwei verschiedene Ereignisse — geht eine
  Chronik weg und kommt an dieselben Leute zurück, bildet der Generator genau
  diese ID erneut. Die Datenbank hat sie schon, also bleibt
  der alte Zeitstempel — aber `_newsTexteAuffrischen` übernimmt den neuen
  `dataRef`, und damit zeigt eine Karte vom 24. auf die Partie vom 26. Gemessen
  wanderte so der ganze Tafel-Moment des 24.08. in die Sammelkarte des 26.08.,
  und der 24. hatte keine Tafel-Karte mehr. Eine Wiederkehr ist ein neues
  Ereignis und bekommt eine eigene Karte.
  **Eine überholte Meldung fällt nur am eigenen Tag.** Zwei Karten über
  denselben Rekord widersprechen sich, wenn sie am selben Tag stehen: „Der
  Zerstörer" wechselte zweimal am 10.09., und beim „Gigantentöter" stand „Henry
  und Jannik übernehmen" acht Minuten vor „Henry übernimmt". Über Tage hinweg
  erzählen sie dagegen eine Geschichte, und der Vergleich lief einmal über das
  ganze Fenster: jeder Weiterwechsel löschte die Meldung von vorgestern, und
  gemessen fielen so zwei von sieben Spieltagen ganz aus.
  **Eine Null ist kein großer Wert.** Auf der Chronik-Karte stand „0
  ZUSÄTZLICH" im größten Schriftgrad, und das liest sich wie ein Fehler: der
  Erfolg kann eine legendäre Chronik sein, er zählt nur nicht zusätzlich, weil
  je Monat ein Eintrag in der Tafel steht [§C32] und ein stärkerer den Platz
  hält. Dann fällt der große Wert weg, und den Grund nennt der Satz mit Namen —
  „Für die Laufbahn bleibt ‚Der Wundertäter' stärker".
  **Die Ewige Tafel meldet sich.** Der ganze Awards-Reiter kam im Feed nicht
  vor: wer einen Liga-Rekord übernahm, eine Monatschronik holte oder eine
  Insignium-Stufe erreichte, erfuhr es nur, wenn er selbst nachsah. Die
  Kategorie `tafel` sammelt das.
  Eine **Insignium-Meldung ist ein echter Übergang**, kein Nähefenster: Der
  Stand vor dem letzten Spieltag wird mit dem heutigen verglichen. **Und sie
  sagt, ob die Stufe zum ersten Mal dasteht.** Prestige aus Liga-Rekorden
  wird unter den Haltern geteilt und fällt mit einem verlorenen Bestwert
  wieder [§C34], dieselbe Stufe kann also zweimal erreicht werden — beide
  Male hieß die Karte „X trägt den Volutenkranz", als wäre es das erste Mal.
  Der Beleg ist der eigene Bestand: die ID einer Insignium-Karte trägt
  Spieler, Stufe und Spieltag, eine ältere Zeile mit demselben Spieler und
  derselben Stufe ist damit die Antwort. Aus dem Prestige selbst ist sie
  nicht zu holen, dafür müsste jeder Spieltag der Ligageschichte einzeln
  nachgerechnet werden. Dann heißt es „trägt den Volutenkranz wieder", und
  die Karte nennt den Tag, an dem die Stufe zuletzt stand. Ein Abstieg
  bekommt weiterhin keine Karte. Überspringt
  jemand mehrere Stufen, entsteht für jede gekreuzte Schwelle genau eine
  stabile ID aus Spieler und Stufe. Eine binäre Suche setzt `when` auf die
  erste Partie, an der die Stufe wirklich erreicht war; historische Prestige-
  und Saisonabfragen schneiden dafür Matches, Badges und Chroniken am selben
  Zeitpunkt. Wiederholte Generatorläufe erzeugen keine Dublette.
  **Auch der laufende Monat** (`chronik_geholt`, `prio 62`). Die Monatskarte
  entsteht erst am 1. für den VORmonat; gemessen trug der August dreizehn
  Chronik-Einträge und dazu keine einzige Karte. Quelle ist derselbe
  Zeitschnitt wie bei den Rekorden: `seasonTitleHalter(sid)` gegen
  `seasonTitleHalter(sid, bisMs)` vor dem letzten Spieltag. Gemeldet wird nur
  der **Wechsel**, in vier Fällen mit vier Verben — `holt` (vorher niemand),
  `übernimmt` (der Halter wechselt), `hält jetzt allein` (das Feld ist enger
  geworden) und `zieht gleich` (jemand kommt dazu). „Julian holt ‚Der
  Nachzügler'. Vorher hielten sie Julian, Martin und Maxi" stand da, als es
  nur einen Fall gab: er war schon Mithalter, und aus drei Haltern wurde
  einer. Die Schlagzeile nennt beim Dazukommen die **Neuen**, sonst alle
  Halter. `prio 62` liegt über der Insignium-Stufe und unter dem übernommenen
  Liga-Rekord: damit überlebt die Karte den Tagesdeckel, ohne die Ewige Tafel
  zu überstimmen. Vor dem Bündeln gibt es **keinen Chronik-Cap**: alle echten
  Wechsel derselben Partie oder Minute stehen vollständig in ihrer gemeinsamen
  Tafel-Karte. Auch eine legendäre Chronik reist in diesem Fall mit dem
  Tafel-Moment; allein bleibt sie weiterhin eine eigenständige Karte. Der
  große Wert der Karte ist ausschließlich der **tatsächliche neue
  Laufbahnbeitrag**. Dafür werden die gecachten Monats-Summen vor und nach dem
  Spieltag aus `prestigeTabelle(bisMs)` verglichen. Steht für denselben Spieler
  schon eine stärkere Chronik in diesem Monat, zeigt die Karte `0 zusätzlich`
  und benennt den stärkeren Eintrag statt fälschlich den ungedämpften
  Katalogwert als `+Prestige` auszugeben. Bei mehreren Haltern liegt die
  Differenz je Spieler in `prestigeDelta`; Sammelkarten übernehmen denselben
  geprüften Text. Das Detailblatt zeigt für jeden Beteiligten den gezählten
  Monatseintrag und seinen echten Zuwachs. Alte persistierte Karten ohne diese
  Daten behaupten ebenfalls kein Plus: Ihr aktuell zählender Beitrag wird aus
  derselben Laufbahnquelle abgeleitet. Das Blatt zeigt außerdem die Zahlenreihe aus Klasse, Art,
  Ausschlag und Prestige [§C39], die Bedingung, das Podest des Monats und
  einen Knopf in die Tafel. Schattenseiten meldet der Feed auch hier nicht. Quelle der Rekordmeldungen ist ein
  Zeitschnitt — `allChronicles(bisMs)` vor dem letzten Spieltag gegen heute;
  er kostet einmal ~18 ms und liegt danach im Cache.
  **Eine Rekordkarte gibt ihre ganze Lage weiter.** Der Name des Rekords
  stand nur in der Schlagzeile, die Wechselart nur im Typ-Präfix, der volle
  neue Halterstand nur gekürzt in `playerIds` (drei Gesichter), der alte Wert
  und der Grundwert gar nicht. Wer eine Karte nachträglich liest — ein Blatt,
  eine Sammelzeile, eine Auffrischung —, hat die Definition nicht mehr zur
  Hand: ein gestrichener Rekord steht gar nicht mehr im Katalog. Der `dataRef`
  trägt deshalb `rekordId`, `rekordName`, `kammer` und `kammerLabel`, `fall`
  (eine der fünf Wechselarten), `basis`, `halter` (alle neuen Halter),
  `vorher` (alle alten), `wert` und `wertVorher`, `ev` und `evVorher`,
  `cond`, `matchId`, `causalKey`, `fenster` und `laufbahn` (die
  Punktewirkung); den Zeitpunkt trägt `when`. `tests/ambient` prüft das über
  jeden vierten Spieltag der Ligageschichte.
  **Vier Fälle, vier Aussagen** (`_halterFall`): **erstmals vergeben** (den
  Rekord hatte vorher niemand), **übernommen** (der Halter wechselt), **jetzt
  allein** (das Feld ist enger geworden) und **gleichgezogen** (jemand kommt
  dazu) — dazu **ausgebaut**, wenn sich nur der Wert bewegt. Es war eine
  Aussage für alles außer dem Ausbauen, und gemessen widersprachen sich vier
  Karten der Ligageschichte: „Leon übernimmt ‚Der Aufschwung'. Vorher hielt
  Leon, Jannik und Stefan den Rekord mit +8 %" — Leon übernahm von sich
  selbst, und aus drei Namen wurde ein „hielt". Und „Martin und Leo übernehmen
  ‚Das Sonntagskind'. Vorher hielt Leo den Rekord mit 70 %" verkaufte Leos
  Rückschritt auf 67 % als Übergabe, obwohl Leo den Rekord weiter hält. Der
  Fall wird für Rekord und Monatschronik an EINER Stelle entschieden [§C27],
  **genannt wird beim Dazukommen der Neue**, und als Vorgänger steht nur, wer
  wirklich **weg** ist: aus {A,B} kann {A,C} werden, und dann war A sein
  eigener Vorgänger.
  Der Halter wird dafür **sortiert** verglichen, und eine Übernahme, deren
  Vorgänger die heutigen Halter sind, verschwindet aus dem Feed: „Maxi, Leo
  und Julian übernehmen" stand über „Vorher gehörte der Rekord Maxi, Julian
  und Leo" — dieselben drei, nur anders sortiert. Der Generator bildet diese
  ID nicht mehr, also kann `_newsTexteAuffrischen` sie auch nicht umschreiben;
  die persistierte Karte bliebe sonst für immer stehen.
  **Der große Wert heißt, was er ist.** Er kam aus einem Regex über den
  Fließtext und trug immer die Aufschrift „Bestwert"; bei „Der Wandler"
  stand damit „0 %" unter BESTWERT, obwohl die Zahl dort ein Unterschied
  zwischen zwei Positionen ist und je kleiner desto besser. Wie die Zahl
  heißt, sagt die Kammer des Katalogs [§C35] — ein Liga-Rekord ist ein
  Bestwert, eine Fügung nicht.
  Im Rekord-Blatt steht unter den **Verfolgern**, wer DAHINTER liegt — und
  **wie weit** (`.nd-vf-b`). Die Liste nannte Rang, Name und Wert; ob der
  Zweite knapp dran ist oder weit weg, musste man daraus ausrechnen, und bei
  84 gegen 81 gegen 62 Prozent ist gerade das die Aussage. Der Balken zeigt den
  Anteil am Bestwert und steht auf eigener Zeile: neben dem Namen ist die
  Spalte so breit, wie der Wert daneben es übrig lässt, und damit war dieselbe
  Prozentzahl in jeder Zeile eine andere Länge — gemessen trug der Vierte einen
  längeren Balken als der Dritte. Wo der Sortierwert negativ ist (weniger
  Gegentore ist besser), hat ein Anteil keine Bedeutung, und dann bleibt der
  Balken weg.
  **Und niemand davor.** Die Karte trägt den Wert, der bei ihrer Entstehung
  galt — er steckt in ihrer ID —, die Liste rechnet heute. Zwischen beidem
  können Partien liegen, und dann stand unter „Martin übernimmt ‚Der
  Zerstörer' · 24 %" ein Verfolger mit 25 %: eine Karte, die sich selbst
  widerspricht. Wer den Wert inzwischen überholt hat, steht nicht dahinter;
  das Blatt nennt ihn als heutigen Halter. Teilen
  sich drei den Rekord punktgleich, füllten genau diese drei die Liste, und
  unter „wer sonst noch vorne steht" standen dieselben Namen mit derselben
  Zahl, die der Kopf zwei Zeilen darüber schon nennt. Das
  Ausbauen ist die schwächste davon und an eine
  Bedingung geknüpft: gemeldet wird nur, wenn sich die **angezeigte** Zahl
  ändert. Ein Anteil rückt an fast jedem Spieltag um ein Tausendstel weiter,
  und das ergab neun Karten „X baut seinen Rekord aus" an einem Morgen, auf
  denen dieselbe Zahl stand wie vorher. Echte Ausbauten werden nicht mehr vor
  der Tafel-Bündelung abgeschnitten; derselbe Moment wird vollständig auf
  einem Rahmen erzählt. Schattenseiten meldet der Feed gar nicht — die Liga
  liest ihn gemeinsam.
  Die Monatschronik ist EINE Karte je Monat, nicht eine je Eintrag; die drei
  mit den meisten Einträgen bekommen ihr Gesicht. Dazu eine eigene Karte für
  jeden, der **zum ersten Mal überhaupt** in der Chronik steht — der Moment,
  den ein Spieler aus der unteren Hälfte sonst nie im Feed sieht.

  **Breaking ist das Seltenste, nicht das Lauteste.** Erlaubt sind allein:
  ein legendäres Badge, die längste Siegesserie aller Zeiten, der
  Tabellenführer eines belastbaren Spieltags, der feststehende Meister, der
  Schlusssprint einer Saison, der **erste** Aufstieg in die beiden
  obersten Insignium-Stufen [§C30] und ein Karriereende [§C40]. **Entschieden wird es nach dem Bündeln**,
  nicht davor: eine Sammelkarte erbt es von ihren Teilen (`_isBreaking`,
  `sammel.breaking`), sonst verlöre ein Anlass seinen Rang, sobald er mit
  seinem Moment reist.
  **Drei Anlässe sind gefallen, jeder gemessen.** Ein **erstmals vergebener
  Liga-Rekord**: in der Füllphase der Ewigen Tafel wird jeder Rekord zum
  ersten Mal vergeben, und gemessen trugen elf der 18 Spieltage des Juni 2026
  deshalb eine Breaking-Karte — immer dieselbe, den Tafel-Moment des Tages,
  der es von einer seiner Zeilen erbte. Damit war Breaking die Regel. Der
  **Elo-Bestwert** (`elo_record`): die Karte bildet der Generator nicht mehr,
  der Bestwert steht als „Der höchste Gipfel" in der Tafel, aber
  persistierte Zeilen trugen den Typ weiter und waren dieselbe Meldung
  zweimal, einmal laut. Und eine **wieder getragene** obere Insignium-Stufe:
  Prestige aus Rekorden wird geteilt und fällt wieder [§C34], dieselbe Stufe
  kann mehrmals erreicht werden, und beim zweiten Mal bricht sie die Spalte
  nicht mehr — `wieder` sagt, ob es das erste Mal ist.
  **Die erste Tabelle eines Monats nennt den Stand ihres Tages**
  (`season_start`). Die Karte steht an der Partie, die die Rangliste
  freigibt, und rechnete ihren Text mit dem Stand von heute: am 04.08. stand
  „Martin führt mit 390 Elo, 11 vor Leon. Gewertet sind 107 Partien" — die
  Zahlen des 26.08., die mit jeder Partie weiterwuchsen. Gesucht wird jetzt
  die erste Partie, nach der `_storyRangFrei` hält, und die Rangliste kommt
  aus dem Elo-Stand der Elo-Bahn bis dorthin. Der Zeitpunkt stand dabei auf
  der fünfzehnten Partie, auch wenn erst eine spätere genug Spieler brachte.
  Dasselbe galt für jeden Satz mit „damit": „Martin zündet die 8er-Serie" um
  10:56 nannte „134 Siege aus 211 Partien", die Zahl nach seiner letzten
  Partie des Tages, und das Jubiläum „Aus 100 Partien sind … Siege geworden"
  zählte die Siege der ganzen Laufbahn. Beide zählen bis zu ihrer Partie.
  Der **Schlusssprint** ist dafür dazugekommen. „Noch fünf Tage" entstand an
  jedem der letzten sieben Tage einer Saison, egal wie klar die Sache war:
  gemessen stand die Karte auch bei 91 Elo Vorsprung da, und ihr Text
  erklärte dann selbst, dass nichts mehr dazwischenkommt. Jetzt drei
  Bedingungen — Frist, höchstens `SAISON_ENDSPURT_ELO` Abstand und eine
  belastbare Rangliste —, und ihr Zeitstempel ist die letzte Partie statt
  `now`, sonst stünde sie im Feed über dem Spieltag statt unter ihm.
  Die Liste ist geschlossen: `tests/ambient` prüft jeden Anlass einzeln und
  misst über die 19 Spieltage vom 28.07. bis 26.08., dass keine Karte des
  fertigen Feeds Breaking trägt, deren Anlass nicht darauf steht. Gemessen
  sind es dort zwei Karten und im Juni 2026 keine.
  **Und sie veraltet am Abstand, nicht an der Siegzahl.** Der Stale-Filter
  verglich die Siege im Fenster mit der Zahl von damals, und das Fenster der
  letzten zehn Partien verschiebt sich schon im Lauf desselben Spieltags: die
  Karte entsteht nach der vierten Partie mit 8 von 10, nach der siebten
  stehen dort 7, und die eigene Karte von heute Mittag fiel als veraltet weg.
  Gemessen am echten Vierzehn-Tage-Verlauf wurden acht Formkarten gebildet
  und keine einzige gezeigt. Gefragt wird deshalb, was die Karte behauptet:
  steht der Vorsprung auf den eigenen Schnitt noch (`_liveStreakForm().vor`)?
  **Die Form-Karte misst den Abstand zum eigenen Schnitt, nicht das Niveau**
  (`FORM_FENSTER`, `FORM_BASIS_MIN`, `FORM_VORSPRUNG`, §11.0b). „Neun von
  zehn gewonnen" konnte nur holen, wer ohnehin die beste Quote hat: gemessen
  nannte die Karte über die ganze Ligageschichte vier Spieler, einen davon
  zehn der siebzehn Male. Verglichen werden jetzt die letzten zehn Partien
  mit der Laufbahn DAVOR — dieselbe Frage, mit der die Monatschronik die
  Mitte des Feldes erreicht [§C38] —, und dieselbe Schwelle trifft damit
  sieben Spieler statt vier, darunter die untere Hälfte der Siegquote. Die
  25 Prozentpunkte sind an den echten Partien geeicht: die Karte fällt 0,46
  mal je Spieltag, bei 20 wären es 0,63 und bei 30 nur noch 0,25.

  **Eine Karte über einen Spieler soll ihn belohnen.** „Henry gewinnt 39 %
  seiner Spiele" stand als Nachricht da und sagte ihrem Helden, dass er
  unterdurchschnittlich ist. Gesucht wird stattdessen die Kennzahl, in der
  er am weitesten vorne steht, und genannt wird sein Platz darin. Aus
  demselben Grund zieht die Duo-Karte aus dem vorderen Drittel: „Eingespielt:
  Martin & Stefan" stand über einem Paar auf Platz 24 von 24.

  **Eine Karte sagt, was zu tun ist.** „Jane liegt ‚Das Sonntagskind' am
  nächsten" nannte weder, worum es geht, noch was dafür verlangt ist: darunter
  stand allein „Leon hält den Bestwert". Wer ein Ziel zeigt, nennt die
  Bedingung aus dem Katalog, den Stand des Halters, **den eigenen Stand** und
  den Gewinn. Ohne den eigenen sagt die Karte nicht, wie weit es noch ist; er
  wird durch denselben Beleg des Katalogs formatiert wie der Bestwert, weil
  zwei Zahlen in zwei Einheiten nicht vergleichbar sind. Und der große Wert
  ist der eigene Stand, nicht die Aussicht auf Prestige: eine Zahl, die
  niemand geholt hat, stand im Goldrahmen einer gehaltenen Bestmarke [§C25].
  Gefallen ist „Kein anderer ist gerade so nah dran" — die Karte stellt
  diesen Vergleich nie an, sie zieht unter allen, die überhaupt einen offenen
  Schritt haben.
  **Und ein Ziel, das niemand haben will, ist kein Ziel.** „Alex kann ‚Die
  bitterste Pleite' holen" stand im Feed: die höchste Siegchance, mit der je
  jemand verlor, als Aufgabe. Gefiltert war nur die Schattenseite, nicht die
  negative Fügung — `nextRecordFor` kennt die Regel seit jeher [§C25]. Der
  Katalog schreibt sie als `negativ`, die abgeleitete Rekordliste als `neg`;
  am falschen Feld geprüft ist die Zusicherung immer grün.

  **Wer eine Bestmarke ausruft, nennt ihren Halter** (`chronicleRang`).
  „Leon beherrscht die Wochen · 6× Spieler der Woche. Bestwert der Liga" stand
  im Feed, und derselbe Bestwert gehörte im Rekorde-Reiter Julian: Leon hat 4
  von 15 eigenen Wochen gewonnen, Julian 4 von 13. Die Karte zählte die Titel,
  „Der Wochenherr" misst den Anteil — und die Anzahl gehört dem, der öfter
  dabei war [§C35]. Dasselbe beim Spieler des Tages (Leon 17 von 54 Spieltagen,
  Julian 12 von 23) und bei den Toren je Partie, wo drei Spieler still
  gleichauf bei 8,7 lagen, während „Der Torjäger" Leon mit 8,9 je Sturmspiel
  gehört. Drei Karten rechnen deshalb nicht mehr selbst, sondern lesen die
  Reihenfolge des Rekords [§C27]; halten mehrere den Bestwert punktgleich,
  stehen alle da. Die Zählung lebt daneben als eigene Karte weiter, ohne den
  Satz „Bestwert der Liga" — eine Sammlung ist keine Bestmarke.
  `tests/ambient` prüft den genannten Spieler, nicht den Wortlaut.

  **Jede Ambient-Vorlage wird im Rundlauf gemessen, nicht einzeln.** Sie
  stehen an vierzig Stellen und gingen deshalb einzeln kaputt: „vor -1 Tagen"
  (der Fun Fact von 10 Uhr entsteht vor der ersten Partie, sah aber die ganze
  Liste), „7 trägt den Schildring", ein leerer Wertblock, „1 Platz" als Anzahl
  statt als Rang, ein Anteil, der dem Spieler gehörte und der Liga
  zugeschrieben war, und ein großer Wert, der den Katalog zählte, während die
  Schlagzeile von einer Führung erzählte. `tests/ambient` läuft jede Vorlage
  an mehreren Uhrzeiten und mit mehreren Würfeln ab — darunter der Vormittag
  jedes Spieltags der letzten Wochen, weil der Blick in die Zukunft nur dort
  zu treffen ist — und prüft sechs Dinge: einen gefüllten großen Wert, das
  Komma in jeder Dezimalzahl [§C27], keine negative Anzahl, kein „&" im Satz,
  das Verb im Plural nach einer Mehrzahl und einen großen Wert, der sich mit
  seinem Titel bewegt.

  **Die Aufschrift des großen Werts sagt, was die Zahl zählt** — nicht, wem sie
  gehört, und sie ist keine Konstante. Unter dem Chronik-Rampenlicht stand
  „1 Rekordhalter": die Eins gilt für jeden Rekord und sagt damit nichts, und
  „Rekordhalter" beschreibt den Träger statt die Zahl. Dieselbe Vorlage trug
  gemessen fünfundzwanzig verschiedene Titel und immer denselben Wert. Im
  Rennen um die laufende Tafel stand „1 in Führung", also wieder der Träger,
  und darunter im Satz noch ein zweites Mal dieselbe Zahl. Jetzt trägt das
  Rampenlicht den Wert der Bestmarke mit dem Namen seiner Kammer
  (`CHRON_KINDS`, dieselbe Quelle wie `_newsWertBlock` [§C27]) und das Rennen
  die Zahl der offenen Einträge. Der Beleg eines Liga-Rekords beginnt
  garantiert mit dem Sortierwert [§C35], `_chronKurz` trifft dort also das
  Richtige; ein **Monatsbeleg** tut das nicht — „Der makellose Tag" belegt
  seinen Anteil mit „1 von 4 Spieltagen ohne Niederlage", und die erste Zahl
  ist dort die Anzahl.

  **Und das Rampenlicht zeigt keine Schattenseite.** Der Topf lief über alle
  vergebenen Rekorde, zwölf davon negativ, und die Auswahl hängt am
  Kalendertag: an jedem fünften Tag stand „Alex hält ‚Das Scheunentor'" als
  Fun Fact im Feed, obwohl der Feed die Schandtafel gar nicht meldet [§C35].

  **Was zwei Leute miteinander zu tun haben, sagt der Story-Typ** und nicht die
  Kartenform (`_ndBeziehung`). Unter zwei Wappen stand „als Duo", sobald eine
  Karte genau zwei Leute zeigte: bei „Martin schlägt Leo im Spitzenspiel"
  standen sich die beiden gegenüber, bei „Johannes und Stefan bewegen die
  Ewige Tafel" holte jeder einen eigenen Rekord. Ein Duo sind nur die beiden
  Duo-Serien; alles andere nennt seine eigene Beziehung.
  Auf dem Blatt einer Partie stand „in derselben Partie" unter ihren Siegern
  — auf dem Blatt, das diese Partie ist —, auf der Karte einer Partie „im
  selben Moment". Dort steht jetzt „gewinnen diese Partie" und „in dieser
  Partie". Und die Wochenkarte nannte „20 an 4 Tagen" als Zeile direkt unter
  ihrem Satz „20 Spiele an 4 Tagen": verglichen wurde nur die kurze Form.

  **Das Blatt einer Serie zeigt ihre Partien** (`_ndSerieBlatt`,
  `_ndPartieListe`). Es zeigte die Serie als Band, darunter die letzten zehn
  als Punktreihe und Zahlen in Zeilen („Gemeinsame Bilanz bis hierher",
  „Tore 411:564"), und welche Partien die Serie waren, stand nirgends. Die
  Bühne trägt jetzt Gesicht, die Zahl groß, den Lauf und den Zeitraum — beim
  Duo zwei Chips, ein Duo hat kein Wappen —, und darunter steht jede Partie
  des Laufs mit Partner, Stand aus Sicht des Trägers und Gegnern; der Tag
  steht nur an der ersten Partie des Tages. Dazu, wo es etwas sagt: bei der
  Siegesserie der Lauf gegen eigenen Bestwert und Liga-Rekord VOR der Serie,
  bei einem Einzelnen die Partner (erst, wenn einer öfter dabei war: lauter
  „1×" sagen nichts), bei einem Duo die Siegquote zusammen und mit anderen,
  und die nächste Partie danach. Der Serienbruch trägt die gerissene Serie
  als Bühne, ihre Partien samt der, die sie beendet, und die Bilanz der
  Brecher gegen den Träger. Alles endet an der Partie der Karte: eine Marke
  bleibt nach dem Riss stehen, und ihr Blatt zählt nicht bis heute. Dieselbe
  Regel gilt für jede Bilanz im Blatt (`_ndBisPartie`, `_ndBilanzBis`): das
  Jubiläum „100 Spiele" nannte darunter die Bilanz von heute („152 Siege /
  Niederlagen" zusammen) und der Meilenstein „221W · 134L".

  **Das Blatt einer Rivalität zeigt, wie es zur Bilanz kam**
  (`_ndRivalBlatt`). Es zeigte zwei Gesichter mit „55 Siege" darunter und das
  Jubiläumsduell als Band. Die Bühne trägt jetzt beide Wappen, die Zahl der
  Duelle und die Bilanz als Tauziehen; darunter die Partie der Karte, der
  Verlauf als Linie um die Null, die letzten dreißig als Lauf und die
  deutlichste auf jeder Seite. Gezählt wird bis zur Partie der Karte.
  **Das Blatt einer Auszeichnung zeigt ihre Träger als Feld**
  (`_ndBadgeBlatt`): das Medaillon mit den Gesichtern als Bühne, die Partie,
  in der sie geholt wurde, und jeder Spieler der Liga als Feld, hell, wer sie
  trägt, gerahmt, wer sie hier geholt hat. „Elo aus dieser Partie" stand dort
  und hatte mit der Auszeichnung nichts zu tun, und „5 von 12 tragen sie" als
  Satz im Medaillon sagt das Feld. Die Blätter mit eigener Bühne stehen in
  einer Tabelle (`_ND_BLATT`), Kopf und Mitte kommen aus einem Aufruf.

  **Die Spitze kann an einem Tag mehrmals wechseln.** Das Blatt des
  Titelrennens zeigte nur den Stand am Ende des Tages, und wer es öffnete,
  erfuhr nicht, dass die Tabelle zwischendurch schon einmal jemand anderem
  gehörte — die Karte nennt die Zahl der Wechsel im Satz, das Blatt zeigte
  denselben zweien noch einmal. Es zeigt jetzt jeden Wechsel mit Uhrzeit,
  Ergebnis, Nachfolger und Vorgänger, gebaut aus denselben Ereignissen
  (`events`), aus denen die Karte entsteht [§11.0e], und in `rcpZeileHtml` —
  dem Bauteil, das die App schon hat [§C27]. Bei genau einem Wechsel bleiben
  die Zeilen weg: er steht im Kopf schon.
  **Die Schlagzeile sagt den Vorgang, nicht das Ergebnis.** Sie hieß „Stefan
  und Julian gewinnen 10:7. Martin führt die Tabelle" — zwei Sätze in einer
  Überschrift, und der erste davon steht eine Zeile höher als Band. Übrig
  bleibt „X übernimmt die Tabellenspitze", und wer am selben Tag abgab und
  wiederkam, „holt die Tabellenspitze zurück". Der Satz darunter nennt Stand,
  Vorsprung, Vorgänger und, ab zwei Wechseln, ihre Zahl — die Partie zeigt
  das Band.
  **Und der Vorgänger ist der DIREKTE Vorgänger.** Genannt war, wer am Morgen
  oben stand. Wechselte die Spitze von A zu B und zurück zu A, war A damit
  sein eigener Vorgänger: das Blatt stellte denselben Spieler als „neuer #1"
  und „vorher #1" gegenüber, und der Breaking-Nachsatz schrieb „A verdrängt
  A". Der Vorgänger des letzten Wechsels ist nie der neue Erste — ein Wechsel
  hat zwei verschiedene Seiten. Der Nachsatz nennt dazu eine Zahl: „Machtwechsel
  an der Tabellenspitze: … Das Titelrennen ist wieder völlig offen" war ein
  Etikett mit Doppelpunkt am Satzanfang, nannte keine und behauptete eine
  offene Lage, die bei 91 Elo Vorsprung nicht stimmt.

  **Das Blatt erklärt nicht die App.** Unter dem Spieler des Tages stand
  „Gewertet wird der Spieltag ab drei Partien. Die Karte kommt um 23:59, wenn
  keine Partie mehr dazukommen kann", unter einer Insignium-Stufe „deshalb ist
  diese Karte Breaking [§C30]". Das ist die Bauanleitung des Feeds samt
  Paragraph, nicht die Nachricht. Wer ein Blatt öffnet, will wissen, was
  passiert ist.

  **Die Wochenkarte zeigt alle sechs Wertungen**, jede mit ihrem **Zeichen** und
  der Sieger mit seinem **Wappen**. Sie trug sechs Zeilen Text und kein einziges
  Gesicht, und vor dem Lesen war nicht zu sehen, welche der sechs der Spieler
  der Woche ist. Gold trägt dabei nur er, die übrigen fünf sind Metall [§C25].
  Das Team der Woche steht direkt unter dem Spieler der Woche. Sie zeigte drei und darunter „und 3
  weitere Wertungen": die Überraschung, der Krimi und das Team der Woche kamen
  auf der Karte gar nicht vor, obwohl sie einmal je Woche erscheint und für
  nichts anderes da ist. Die Reihenfolge ist die Wertigkeit, nicht die, in der
  die sechs Blöcke im Generator stehen — das Team entstand als letztes und
  stand damit auch als letztes. **Im Blatt** steht jede Wertung als Zeile aus
  Gesicht, Name, Wertung und Zahl, der Spieler der Woche in Gold; der Satz
  darunter („Julian hat in dieser Woche 101 Elo gutgemacht. Das ist der
  größte Anstieg der Liga.") sagte Zahl und Wertung daneben ein zweites Mal,
  und die Namen standen als Pillen ohne Gesicht.
  **Das Blatt des Spielers des Tages** (`_ndPotdBlatt`) trägt Krone, Wappen
  und die Elo des Tages als Kurve auf der Bühne, darunter das Feld des Tages —
  jeder, der gespielt hat, mit Siegen von Partien — und die Bahn. Zwei Kacheln
  „67 %" und „6 : 3" sagten, was der Satz darüber nennt. **Der Endspurt**
  (`_ndEndspurtBlatt`) zeigt die verbleibenden Tage als Ring, die beiden oben
  mit Wappen und den Abstand als Balken, darunter den Abstand Tag für Tag; dort
  standen zwei Buchstaben-Kreise und „Verbleibend 6 Tage" als Zeile.

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
  des Tages und Team der Woche tragen deshalb einen gefüllten Knopf im Blatt
  (`_newsRueckblickKnopf`: „Rückblick auf den Tag", „Rückblick auf die
  Woche"), und er öffnet den Rückblick auf DEN Tag und DIE Woche der Karte
  (`showPotdRecap({tag})`, `showPotwRecap({woche})`), nicht auf den letzten:
  eine Karte von vorletzter Woche zeigte sonst die Auswertung von gestern.
  Das **Team der Woche** rechnet mit `teamStatsFromMatches` — derselben
  Funktion, aus der auch der Teams-Tab seine Zahlen zieht [§C27]. Es gab
  Team-SERIEN und ein Team der Saison, aber nichts dazwischen. Für den TAG
  gibt es bewusst keins: eine Duo-Karte an jedem Spieltag wäre die
  Wiederholung, die §C33 gerade verhindert.
  `tests/ambient` misst das alles.
- **§C40 Das Karriereende trennt die Legacy von der aktiven Liga.** Wer die
  Gruppe verlässt, spielt keine Partie mehr und stand trotzdem in der Ewigen
  Tafel, hielt Rekorde, die niemand mehr holen konnte, und sperrte
  die Plätze derer, die noch spielen. Ausblenden (`hidden`) nahm ihm dagegen
  auch die Geschichte: ein ausgeblendeter Spieler fällt aus jeder Rechnung,
  auch aus dem Juni, in dem er Zweiter war. Ausblenden bleibt, was es ist —
  der Weg für einen versehentlich angelegten Spieler —, und das Karriereende
  ist ein eigener Zustand. Gespeichert wird nur sein Zeitpunkt
  (`players.retired_at`), alles andere ist eine Ableitung.
  **Eine Regel an einer Stelle** (`06b-ruhestand.js`): `sichtbar(x)` heißt
  nicht ausgeblendet und gilt für alles, was Geschichte ist; `ligaAktiv(x,
  bisMs)` heißt: tritt in dem Zeitraum an, der bei `bisMs` endet. Ohne
  `bisMs` ist das der Zeitraum, der noch läuft, und dort tritt kein
  Ruheständler an. Ein Zeitraum, der vor dem Karriereende zu war, gehört ihm
  weiter. Jede Abfrage wählt ausdrücklich eins von beiden; eine rohe
  `.hidden`-Abfrage lässt `tests/ruhestand` außerhalb der Regel, der Liste
  zum Wiedereinblenden und der Sicherung nicht zu — genau so wäre ein
  Ruheständler mit dem nächsten Feature wieder irgendwo aufgetaucht.
  **Was Legacy ist und bleibt:** jede Partie, Direkter Vergleich und
  Duo-Bilanz; ein abgeschlossener Monat mit Rangliste, Monatschronik,
  Meister, Awards, Positionsverlauf und Rückblick, wenn er vor dem
  Karriereende zu war (gemessen an `seasonEnd`); die Auszeichnungen und wer
  sie trägt; Wochen- und Tagessieger samt ihrer Rückblicke — dieselbe Frage
  wie das Badge, und wer gespielt hat, hat gespielt (`_periodWinnerMap` kennt
  den Ruhestand nicht); der Fingerabdruck, dessen Feld die Laufbahn aller ist;
  jede Story, die vor dem Karriereende entstand.
  **Was die aktive Liga vergleicht, ohne ihn:** die Ewige Tafel und ihre
  Rangstufen, Gesamt, der laufende Monat, Woche und Tag in den Awards, die
  Liga-Rekorde — auch in jedem Zeitschnitt, sonst meldete der Feed beim
  Karriereende eine Übernahme, die niemand gespielt hat —, der Prestige-Rang,
  die Ligaposition in der Raute, die Spielerwahl der Eingabe, der Rang im
  Feed und jeder Fun Fact ab seinem Slot. Der Generator fragt je Ereignis
  `ligaAktiv(pid, Zeitpunkt)`: was vor dem Karriereende passiert ist, bleibt
  eine Nachricht, danach kommt er nicht mehr vor.
  **Das Profil ist eingefroren** (`ruhestandStand`): Prestige mit Insignium,
  Stufe und Grad, die Rekorde, die er beim Abschied hielt, Rang und
  Perzentil — gerechnet mit derselben Engine, am Zeitpunkt des
  Karriereendes und in der Zeitmaschine [§3 Caching]. `prestigeOf`,
  `chroniclesOfPlayer`, `chronicleOf` und `getPlayerRank` antworten für einen
  Ruheständler aus diesem Stand; eine zweite Rechnung für ihn gibt es nicht.
  Kehrt er zurück (`retired_at` leer), gilt wieder die Liga von heute:
  Auszeichnungen und Monatschroniken bleiben, wie sie waren, die Rekorde
  werden gegen das Feld von heute neu gerechnet. Wer in der Pause einen
  seiner Bestwerte geschlagen hat, behält ihn, und wo das Feld schwächer
  geworden ist, kann er einen neuen halten — das Prestige ist danach
  niedriger oder höher als beim Abschied. Unverändert bleibt es nur, wenn
  in der Pause niemand gespielt hat.
  **Wo er steht:** am Ende von Gesamt unter „Mehr zur Saison", am Ende der
  Positionen und am Ende der Teams, jeweils als Einblick [§C27], der zu ist.
  Darin dieselben Zeilen wie in der Liste darüber (`ruhestandTafelHtml`,
  `positionsBlockHtml`, `vTeams(true).ruhe`), aber ohne Platz und ohne das
  Metall der ersten drei: wer aufgehört hat, steht in keiner Rangfolge mehr.
  Ein Duo mit einem Ruheständler spielt nie wieder und steht deshalb dort und
  nicht in der Liste. Rechts steht die eingefrorene Rangstufe, im Profil die
  Pille „Karriereende" und vorn die Karriere-Elo des Abschieds statt der
  laufenden Saison. Eine Serie, die nicht mehr läuft, brennt nicht
  (`znFeuer`, `avRingOf`). Die Knöpfe „Karriere beenden" und „Karriere
  fortsetzen" stehen über „Spieler löschen" und erscheinen nur für jemanden
  mit Partien; fehlt die Spalte in der Datenbank, sagt der Hinweis das, statt
  still nichts zu tun.
  **Gelöscht wird nur, wer nie gespielt hat** (`spielerLoeschen`). Ohne
  Partie gibt es nichts, das bleiben müsste. Mit Partien bot das Blatt
  „Komplett löschen" an, und danach trug jede seiner Partien ein
  Fragezeichen, während die Elo, Serien und Rekorde der drei anderen gegen
  niemanden liefen. Jetzt heißt der Knopf dort „Spieler entfernen" und
  bietet das Karriereende und das Ausblenden an. Ob es Partien gibt, fragt
  die Datenbank und nicht die geladene Liste: die ist leer, solange der
  erste Abruf läuft oder wenn er fehlschlug. Ohne Antwort wird nichts
  gelöscht.
  **Was je Partie gerechnet wird, fragt den Zeitpunkt der Partie**
  (`imRuhestandAm`). Die Tabelle vor und nach jeder Partie
  (`getRankSnapshots`) rankte jeden mit Monats-Elo, auch den Ruheständler
  nach seinem Abschied: gemessen gab Martin am Tag danach noch die Spitze
  ab, und der Feed meldete einen Wechsel, den niemand gespielt hat. Vor dem
  Karriereende zählt er mit, danach nicht — so bleibt jede Auszeichnung aus
  einer Partie davor, wie sie war. `tests/ruhestand` vergleicht jede
  Auszeichnung der Liga vor und nach dem Karriereende.
  **Das Karriereende ist eine Nachricht und ein Blatt** (`18b-abschied.js`).
  Die Story (`karriereende_<Spieler>_<Tag>`) ist Breaking — es gibt sie je
  Spieler einmal — und trägt die Bühne des Abschieds: das Wappen mit Band,
  wie es beim Abschied stand, kühles Metall statt Gold, denn ein Abschied
  ist kein Titel [§C25]. Sie gilt nur, solange genau dieses Karriereende
  gilt (`_storyWiderrufen`): wer versehentlich verabschiedet und gleich
  zurückgeholt wurde, stünde sonst für immer im Feed. Das Blatt
  (`zeigeAbschied`) erzählt die Laufbahn aus dem Baukasten der Rückblicke
  [§C31]: Zahlen, Saison für Saison, besondere Momente, die besten Partner,
  Lieblings- und Angstgegner, die Stärken als Fingerabdruck, die Rekorde
  beim Abschied, die Monatschroniken und die Auszeichnungen. Es öffnet sich
  nach dem Knopf, über die Pille im Profil, aus der Story und einmal je
  Gerät beim nächsten Start, solange das Karriereende im Fenster des Feeds
  liegt; vor dem Wochenrückblick, weil es seltener ist.
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
  gewinnt fast jede. Er ist vollständig ersetzt: sechzig Chroniken, die
  nach der **Abweichung von der Erwartung** fragen, nach **Konstanz**, nach
  dem **Verhältnis zum Ligamittel** desselben Monats, zu einem **bestimmten
  anderen Spieler** oder nach einem **seltenen Einzelereignis**. Die
  Liga-Rekorde der Ewigen Tafel sind davon unberührt; siebzehn Disziplinen tragen
  beide Zeitachsen, weil dieselbe Frage auf zwei Zeitachsen in EINE Disziplin
  gehört [§13.1] — sie sind in §C35 genannt.
  **Das Stichproben-Tor ist niedrig und für alle gleich:** acht Partien im
  Monat, fünf in einer Teilmenge (`ST_TEIL`), drei Spieltage. Der alte
  Katalog verlangte 15, 20 oder 25 Partien, und damit hing die Chronik an der
  Spielzahl statt an der Leistung. Die Besonderheit steckt in der Schwelle,
  nicht im Tor: wer zehn Partien spielt und acht klar gewinnt, steht in
  derselben Wertung wie jemand mit sechzig.
  Jede `monat`-Wertung trägt drei feste Angaben. **`art`** ist
  `koennen`, `konstanz`, `fuegung` oder `schatten` und sagt, wofür die Chronik
  steht. **`klasse`** ist `legendaer`, `selten` oder `besonders` und sagt, wie
  schwer ihre Bedingung zu erreichen ist — beim Kalibrieren an den Daten
  geprüft und dann festgeschrieben. **`aus`** ist der Ausschlag der Schwelle:
  wie weit sie vom Schnitt aller liegt, die in dieser Disziplin je gewertet
  wurden, in Standardabweichungen.
  **Die Klasse ist keine Volkszählung.** Sie stand einmal als Grenze für die
  Häufigkeit hier — legendär einmal, selten zweimal, besonders dreimal in der
  Ligageschichte —, und das wäre mit der Liga selbst falsch geworden: eine
  legendäre Bedingung wird mit den Jahren zwangsläufig ein zweites und ein
  drittes Mal erreicht und bleibt trotzdem legendär, weil sie keinen Deut
  leichter geworden ist. „Auf dem Thron" gehört heute zwei Monaten und ist
  legendär. Gedeckelt wird deshalb die **Rate** und für alle Klassen gleich:
  höchstens ein Halter je gewerteten Monat. Und ob eine Chronik ihren Platz
  verdient, entscheidet ihr Ausschlag, nicht ihre Häufigkeit — `tests/disziplinen`
  hält jede an der 1,5-σ-Grenze. Ein Test gegen die heutige Häufigkeit je
  Klasse war nicht einmal rot zu bekommen: eine einzelne falsch eingeordnete
  Chronik verschiebt den Schnitt ihrer Klasse nicht genug.
  **Der Ausschlag trägt das Prestige**, nicht die Seltenheit:
  `PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] × aus + PRESTIGE_SELTEN[klasse]`,
  gerundet auf fünf. Gemessen liegt der Median-Ausschlag bei 2,17 für
  legendäre, 1,79 für seltene und 1,71 für besondere Chroniken — die Klasse
  trennt also kaum und darf den Wert nicht tragen. „Der Kontrast" ist die
  seltenste Sache im Katalog und trotzdem nur ein Umstand [§C35]. Den Sockel
  bekommt jede Chronik außer einer Schattenseite: einen Monatseintrag zu
  halten ist an sich etwas Besonderes. Er liegt bei **55** (`PRESTIGE_SOCKEL`):
  mit 40 stand eine Chronik im Laufbahnblatt hinter einer einzigen seltenen
  Auszeichnung zurück, obwohl sie einen ganzen Monat braucht. „Die Nulldiät"
  bringt damit 130 statt 115, und alle Chroniken liegen zwischen 90 und 190.
  Die Dämpfung ab der dritten Chronik bleibt, wie sie ist [§C34].
  Gerechnet wird mit dem Ausschlag der **Schwelle**, nicht dem des Halters.
  Der Schwellen-Ausschlag ist eine feste Eigenschaft der Chronik; der eines
  Werts gehörte einem einzelnen Halter und wanderte, sobald neue Monate die
  Verteilung verschieben — dann sänke das Prestige aller bisherigen Halter,
  und genau dieser Fehler steckte schon einmal in den Auszeichnungen [§C34].
  Art, Klasse und Ausschlag werden **einmal an den Daten geprüft und dann
  festgeschrieben**, genau wie `BADGE_RARITY`.
  Zwei Regeln räumen den Katalog, und beide sind gemessen: eine Chronik muss
  ihre Schwelle **mindestens 1,5 σ** hinausschieben können, sonst liegt ihr
  Bester kaum weiter draußen als der Durchschnitt; und ihr Wert darf **nicht
  an der Spielzahl hängen** — höchstens 0,35 Korrelation. Die zweite nimmt am
  meisten weg: „wie viele verschiedene Ergebnisse" liegt bei −0,91, weil wer
  zwölf Partien spielt zwangsläufig zwölf verschiedene Ergebnisse hat, und
  „der unwahrscheinlichste Spieltag" bei +0,56, weil acht Partien an einem Tag
  weiter ausschlagen können als vier. Sie muss außerdem eine
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
  Hand gegeben. Zwei Monate erfüllen sie (Leon im August, Martin im Juni),
  und sie ist trotzdem legendär: die Klasse zählt keine Halter.

  **Im Profilkopf steht der Spielertyp, nicht die Wertung** (`monat.beiname`,
  `chronBeiname`). Die Pille unter dem Namen trug den Katalognamen, und
  „Der Endspurt" liest sich dort wie eine Überschrift statt wie eine
  Beschreibung — „Der Ausdauernde" schon. Überall sonst bleibt der
  Katalogname: in der Matrix, auf der Plakette, im Blatt und in der Nachricht
  geht es um die Wertung, im Profilkopf um den Menschen. Ein eingefrorener
  Monat kann eine Chronik tragen, die es nicht mehr gibt; dann bleibt der
  gespeicherte Name.
  **Das Blatt der Wertung nennt ihn trotzdem** (`.chron-kose`): dort steht,
  wie ihr Halter im Profil heißt — außer die Wertung heißt schon so: neun
  Blätter trugen „Der Beidfüßige" als Titel und darunter noch einmal als
  Beinamen. Sonst war der Beiname nirgends neben seiner
  Wertung zu sehen — „Der Nervenkitzel" macht seinen Träger zum
  „Dauerzitterer", und wer das Blatt öffnete, erfuhr davon nichts. Er sitzt
  im Kopf des Blatts auf einer eigenen Zeile, nicht in der Zahlenreihe
  darunter: die trägt die vier Angaben, die den Wert der Chronik bestimmen,
  und ein Name ist keine davon. Metall, kein Gold — er zeichnet niemanden
  aus [§C25].

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
  **Und der Feed sagt, welcher es ist** (`_chronikZeigtSich`). „Martin holt
  zwei Monatschroniken" zählte beide auf und ließ offen, welche davon ihn
  im Profil beschreibt — die Frage, die ihr Halter als erste hat. Die Karte
  nennt es im Satz („Steht jetzt in der Chronik, vor ‚Die Nulldiät'" oder
  „In der Chronik steht weiter ‚Der makellose Tag'"), und in einer
  Sammelkarte trägt die betreffende Zeile eine Marke aus zwei Worten
  (`.nf-sam-k`, Metall — sie zeichnet niemanden aus [§C25]). Sie steht
  NEBEN dem Text und nicht darin: der Text kürzt sich mit
  Auslassungspunkten, und eine Marke im abgeschnittenen Teil wäre gar
  nicht da. Beantwortet wird die Frage nur für einen Halter, der allein
  steht, und nur, wenn er in dem Monat überhaupt mehrere hält: bei zwei
  Haltern wäre es eine Behauptung über beide, bei einer einzigen Chronik
  ist die Antwort offensichtlich. **Dieselbe Regel gilt für den stärkeren
  Eintrag**: „In der Chronik bleibt ‚X' stärker, also kommt für die Laufbahn
  kein Prestige hinzu" gehört EINEM Spieler. Bei zwei neuen Haltern sammelte
  der Satz beide Einträge ein und behauptete sie für beide, und wer eine
  Sammelkarte mit neun Zeilen las, fand darin drei verschiedene „stärker".
  Steht der Eintrag selbst in der Tafel, fällt der Name ganz weg: „Steht jetzt
  in der Chronik" sagt es eine Zeile darüber schon.
  **Und das Blatt hält die drei Ebenen auseinander.** In der Monatstafel kann
  ein Spieler mehrere Disziplinen führen, im Profil steht genau eine davon,
  und nur diese eine zählt fürs Prestige [§C34]. Die Zeile nannte einen Namen
  und einen Wert: wer „Der Nervenkitzel" neben „kein zusätzliches Prestige"
  las, konnte nicht sehen, dass dieser Name einem ANDEREN Eintrag gehört und
  die Chronik dieser Karte nur in der Tafel steht. Sie nennt jetzt die Zahl
  der Einträge in der Tafel, ob der Profileintrag diese Chronik ist oder
  welche sonst, und dahinter den echten Zuwachs. Gezählt wird aus
  `seasonTitles` — derselben Quelle, aus der die Tafel selbst kommt [§C27].
  Vorher galt „ein Eintrag je Spieler" schon bei der Vergabe: wer den
  Bestwert hielt und schon etwas trug, gab ihn an den Nächstbesten ab. Damit
  stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während einer mit
  dreizehn danebensaß — und in den echten Daten ging ein Drittel aller
  Einträge an jemanden, der nicht der Beste war. Deshalb gibt es die
  Markierung `strict` nicht mehr: sie galt für vier von siebenundzwanzig
  Einträgen, und was für vier richtig ist, ist für alle richtig.
  Ein Monat unter `CHRONIK_MIN_TAGE` Spieltagen bekommt **gar keine**
  Chronik: aus drei Abenden lässt sich kein Monat ablesen. **Der Feed zieht
  dieselbe Grenze**, und zwar aus derselben Quelle: `seasonTitleHalter` zog
  sie nicht und meldete deshalb Chroniken, die es nicht gab — gemessen acht
  Halter am 04.08., zehn am 06.08. und dreizehn am 07.08., während die
  Monatstafel null Einträge zeigte. „Leon holt ‚Auf Augenhöhe'" stand im Feed,
  im Chronik-Tab stand nichts, und `seasonTitleOf` fand folgerichtig keinen
  Eintrag — die Karte schrieb „kein Prestige hinzu" unter eine Chronik, die
  sie selbst gerade verkündete. Die Funktion antwortet dafür mit `null` statt
  `{}`: ein ungewerteter Monat und ein gewerteter ohne Halter sind zwei
  verschiedene Antworten. **Und das Aufgehen der Tafel ist kein Wechsel** —
  wer am 2. August fünf von fünf gewonnen hat, hat das nicht am 10. getan;
  gemeldet wird erst, was sich von der ersten gewerteten Lage an ändert.
  **Es ist aber selbst eine Nachricht** (`chronik_frei`). Am Tag, an dem der
  Monat zum ersten Mal gewertet wird, stand deshalb gar nichts im Feed —
  obwohl in diesem Moment die ganze Monatstafel entsteht und jeder Eintrag
  darin ab jetzt fürs Prestige zählt [§C34]. Eine Karte je Monat, neutral:
  sie sagt, ab welchem Spieltag gewertet wird, wie viele Einträge in der
  Chronik stehen und von wie vielen Spielern sie gehalten werden, und dass
  bis zum Monatsende jeder davon noch wechseln kann. Sie behauptet nicht,
  dass diese Einträge in der letzten Partie geholt wurden, und trägt deshalb
  auch **keine Partie**: ein Ergebnisband darüber hieße genau das Gegenteil.
  Ihr Blatt zeigt die vorläufigen Profileinträge samt Punktewirkung, in
  derselben Zeile wie der Chronik-Wechsel [§C27]. Die drei mit den meisten
  Einträgen stehen dabei in `traeger` und nicht in `playerIds`: auf der Karte
  steht kein Name, und mit Beteiligten hätte der Deckel je Spieler gerade die
  Karte gezählt, die es je Monat genau einmal gibt. Im Tagesdeckel gehört sie
  zu `TAG_PFLICHT`.
  **Eine Monatswertung findet höchstens einen Halter je gewerteten Monat.**
  Die Schwellen (`ab` in `_stWertung`) sind an den echten Partien geeicht,
  nicht geschätzt. Vorher lagen sie so tief, dass ein Monat vierundzwanzig der
  vierunddreißig Wertungen vergab und ein einzelner Spieler neun davon trug:
  was fast jeder Monat hergibt, zeichnet niemanden mehr aus. Jetzt sind es
  siebzehn bis zweiundzwanzig. Gedeckelt wird die Rate und nicht eine feste
  Zahl — eine Zahl wäre mit der Liga von selbst falsch geworden [§C39].
  `tests/disziplinen` zählt es nach und nennt die Wertung, deren Schwelle zu
  tief hängt.
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
  **Der Meister hat eine Bühne** (`saisonRang`, `saisonPodestHtml`,
  `saisonSpitze`, `saisonRennenHtml`, `saisonSpitzeHtml`,
  `saisonZellenHtml`). Die Karte „X ist Saison-Champion" war die seltenste
  des Monats und stand im Feed als Fun Fact — `_newsSorte` kannte den Typ
  nicht, zwei Sätze, kein Bild —, ihr Blatt nannte drei Elo-Zahlen und die
  Saison-ID, und der Nachsatz schrieb „Die Saison 2026-08 ist Geschichte …
  Vor Johannes." Jetzt trägt sie die Form des Helden [§C25]: das Podest
  unter einem goldenen Strahlenkranz, im Fuß das Titelrennen klein und die
  Tage vorn; das Blatt zeigt dazu das Rennen groß mit einem Band, das an
  jedem Spieltag in der Farbe dessen steht, der vorn lag, die Tage an der
  Spitze als Balken und die Saison des Meisters als Zellen. Der Nachsatz
  nennt den Monat beim Namen und erzählt, wann der Titel entschieden war —
  Elo und Vorsprung stehen schon im Podest. Das Podest ist dasselbe wie im
  Saison-Rückblick, der seine Rangliste seitdem aus `saisonRang` nimmt; die
  Elo je Tag kommt aus `getSeasonPositionHistory` (`eloByDay`,
  `spielTage`), aus derselben Schleife, die die Linien des
  Positionsverlaufs zeichnet — eine zweite Rechnung über dieselben Deltas
  nennte irgendwann einen anderen Ersten. `tests/tafel` rechnet die Tage
  vorn und das Ende des Rennens aus den rohen Partien nach.
  **Woche und Tag zeigen den Helden und das Feld** (`rcpWocheHtml`,
  `rcpEloBahnHtml`, `rcpFeldHtml`): die Woche des Spielers der Woche als
  Spieltage, der Tag des Spielers des Tages als Bahn samt Elo-Kurve, und
  darunter jeder Spieler der Woche oder des Tages als Balken seiner Bilanz.
  Zwei Kacheln mit Zahlen sagten nicht, wie knapp es war. **Der
  Saison-Rückblick zeigt nach der Rangliste das Titelrennen, die Tage an der
  Spitze und die Saison des Meisters** — dieselben Bauteile wie die
  Meisterbühne; die Rangliste und die Kennzahlen bleiben oben, weil sie die
  Fragen beantworten, mit denen man den Rückblick öffnet.
  Ein Rückblick zeigt den Stand von DAMALS: `insigniumSvg` nimmt dafür
  `opt.titel` und `opt.pos` entgegen. Der Reif bleibt der heutige — die
  Laufbahn ist eine Karriere und kein Monat.
  Gestaltung gehört ins CSS: ein `style`-Attribut trägt einen berechneten
  Wert (Avatarfarbe, `--rav`, Farbton), nie ein ganzes Bauteil. Vorher
  standen Wochen- und Tages-Rückblick zu großen Teilen als Inline-Style im
  JavaScript, und derselbe Spieler sah in drei Rückblicken dreimal anders
  aus. `tests/tafel` misst beides.
- **§C30 Sieben Stufen, sieben Gegenstände — gezeichnet nach der Vorlage.** Das
  Insignium hat sieben Stufen (`INSIGNIEN`): **Reif** ab 0, **Schildring**
  ab 600, **Volutenkranz** ab 1200, **Zierkranz** ab 2100, **Lorbeerreif**
  ab 3100, **Kronenreif** ab 4300 und **Ordensstern** ab 5600 Prestige. Jede
  Spanne kostet mindestens so viel wie die vorige (600, 600, 900, 1000,
  1200, 1300); der Ordensstern liegt weit über der heutigen Ligaspitze,
  bleibt durch die stetig wachsenden Erfolgsfolgen aber erreichbar. Sie
  lagen bei 500 bis 4500: mit den höheren Startwerten der Auszeichnungen und
  Rekorde [§C34] stieg das Prestige der Spitze um gut ein Viertel, und ohne
  neue Schwellen hätte sie über Nacht eine Stufe höher gestanden, ohne etwas
  dafür getan zu haben.
  **Die Stufe ist eine Ableitung aus den Punkten** (`insigniumStufeVon`).
  Das Blatt eines Tafel-Moments las sie als Zahl aus der gespeicherten Karte,
  und die gehörte einer älteren Leiter: Leon stand dort mit 2687 Prestige als
  Volutenkranz und „noch 0 bis zum Zierkranz". Gespeichert sind die Punkte,
  sie sind die Beobachtung.
  **Die Zeichen sind Vektorzeichnungen nach der Vorlage**
  (`35a-insignium-zeichen.js`, `INS_ZEICHEN`, je Stufe drei). Aus Kreisen
  und Pfaden gerechnet blieb jede Fassung hinter der gemalten Vorlage
  (`mockup/insignium-vorlage.webp`) zurück; aus ihr ausgeschnitten waren die
  Zeichen verwaschen, trugen Reste des Vorlagengrunds und wurden über 60 px
  weich. Die Zeichnungen folgen der Vorlage und sind in jeder Größe scharf.
  **Jede Stufe ist ein eigener Gegenstand**: der Reif ein Band, der
  Schildring Sicheln, der Volutenkranz C-Schnecken Rücken an Rücken, der
  Zierkranz Akanthuswedel (ein Stiel mit Fiederblättern, der einrollt), der
  Lorbeerreif Lorbeer in Blattpaaren mit belaubten Linien darüber, der Kronenreif Eichenlaub in zwei
  Lagen mit Eicheln und einem Band unter dem Stein, der Ordensstern eine
  Glorie aus Haarstrichen mit großen Spitzen. Zierkranz und Lorbeer waren
  einmal beide ein Blattkranz und kaum zu unterscheiden, der Kronenreif ein
  Lorbeer mit Krone — so war die obere Leiter eine Wiederholung.
  **Die Leiter steigt, sie springt nicht zurück.** Jeder Grad legt etwas
  dazu, und kein Grad sieht schlichter aus als der letzte der Stufe davor.
  **Der Bau ist Silber, Gold ist ein Akzent** (`IZ_METALL`, `INS_ZEICHEN`).
  Die Stufen liefen von Silber über Rose, Champagner und Rotgold zu Gold,
  und neben Silber las sich jedes warme Metall als Bronze: Zier- und
  Lorbeerkranz sahen weniger wert aus als Reif und Schildring. Jetzt ist
  der Bau durchgehend Silber und ab dem Schildring III Platin (heller und
  kühler), der Rang liegt als Schimmer darauf, und Gold kommt nur als
  Akzent — Nieten, Lilie, Kehle, Fassung der Raute — ab dem Lorbeerreif und
  erst am Ordensstern in der Fläche.
  **Der Lorbeer bleibt vorn, die Verzierung steigt darüber auf**
  (`_izLorbeer`). Er trug zwei Reihen Laub übereinander, und seine drei Grade
  waren darin kaum zu unterscheiden; ein Entwurf mit Ranken AUF dem Laub las
  sich wie mehrere Schichten übereinander. Jetzt ist er ein Zweig in
  Blattpaaren, und wo das Laub endet, steigt eine Linie am Reif zum Kopf auf
  und rollt nach außen ein — Grad II legt eine Gegenlinie zum Kopf dazu,
  Grad III ein S am Ende des Laubs. Blätter wachsen an den Linien nur nach
  außen und nur am Bogen: in der Schnecke verdeckten sie Auge und Stein.
  Das Auge trägt schon in Grad I einen Stein in der Rangfarbe, weil der
  Zierkranz III ihn trägt und die Farbe sonst einen Grad lang verschwände;
  `tests/disziplinen` zählt die Augen. **Und
  der dritte Grad einer Stufe trägt nie mehr als der erste der nächsten**:
  Zierkranz III hatte Steine im Reif und rotgoldenes Laub, Lorbeerreif I
  keins von beidem. Die Steine kommen mit dem zweiten Grad des Lorbeers.
  `tests/disziplinen` zählt Steine und Gold an jedem Übergang.
  Licht fällt überall von oben links: jedes Teil hat eine helle und eine
  dunkle Seite, eine Kante im Ton seines Werkstoffs und einen Glanz, und der
  Reif wirft einen Schatten auf die Zierde hinter ihm. Gezeichnet wird auf
  1000 × 1000 mit dem Innenrand des Reifs bei 22 % der Kante (`IZ_RI`); jede
  Zierde wird links gebaut und gespiegelt, und ein Kreis besteht aus
  absoluten Bögen — ein relativer Bogen überstand das Spiegeln nicht, und
  der Knopf einer Ranke saß um seinen Durchmesser verschoben neben ihr.
  **Groß ist die Zeichnung Vektor, klein ein Bild** (`_insZeichnung`,
  `insBild`, `INS_VEKTOR_PX`). Sie stand überall als `<image>` mit einer
  SVG-Datei darin, und Safari rastert ein solches Bild in der Größe seiner
  Nutzereinheiten (170) und nicht in der, in der es erscheint: im
  Profilkopf wurden sie auf 270 px gezogen, und das Zeichen stand mit
  Treppenkanten da wie ausgeschnitten. Ab 64 px Wappengröße, im Profilkopf
  und auf der Karte in der Mitte der Vitrine der Laufbahn steht sie deshalb
  als Vektorgruppe im Topf — die Karten am Rand der Vitrine stehen als Bild
  und bekommen ihre Vektorzeichnung, wenn sie in die Mitte rücken: sieben
  Vektorzeichnungen kosteten beim Öffnen 60 ms Stilberechnung von 122 —, einmal je
  Rang, Stufe und Grad, die Verläufe neben der Gruppe und jede Kennung mit
  eigenem Präfix (`_izPraefix`), und das Wappen verweist darauf. Darunter
  bleibt es beim Bild: ein Verweis klont die ganze Zeichnung, und der Feed
  mit siebzig Wappen öffnete damit gemessen doppelt so langsam; das Bild
  erscheint dort mit dem 1,18-Fachen der Wappengröße, und dafür reichen
  seine 170 Einheiten. Dasselbe gilt für die einundzwanzig Felder der
  ganzen Leiter (`insigniumStufeSvg(…, {bild:true})`): rund 40 px, und als
  Vektor klonte jedes eine Zeichnung von bis zu 70 Kilobyte — der Topf trug
  danach 1,7 Megabyte und 7400 Knoten, und die Laufbahn öffnete bei
  gedrosselter CPU auch warm in 367 ms statt 123. **Und das Bild steht unter einer kurzen Adresse**
  (`insBildHref`, eine Blob-Adresse): als Daten-URL trug es rund 190
  Kilobyte, und jedes `<use>` klont die Gruppe samt dieser Adresse — der Feed
  hat rund 240 davon, und das Öffnen brauchte gemessen im Median 150 ms statt
  46. `insBild` bleibt die Daten-URL für alles, was ausserhalb der Seite
  gerastert wird; ein Blob gilt nur dort, wo er angelegt wurde. `tests/blatt`
  misst die Länge jeder Bildadresse im Dokument.
  **Die Zeichnung trägt keinen Filter**: Schlag- und
  Reifschatten sind weiche Radialverläufe, die Lichtkanten zwei Striche
  statt eines Weichzeichners — ein gefiltertes Element rechnet Safari in
  CSS-Pixeln. **Und außen liegt auch keiner darauf**: jedes Wappen trug
  `filter: drop-shadow(…)` am ganzen `svg.ins`, im Feed allein 234 Mal.
  Dasselbe gilt für eine Ebene, die skaliert — der Profilkopf läuft deshalb
  ohne `scale` ein. `tests/blatt` sucht über alle Reiter, Profil, Laufbahn
  und Feed nach einem Filter oder einer Skalierung über einem Zeichen
  (ausgenommen das Entfärben einer Stufe, die niemand trägt) und misst,
  dass Profilkopf und Laufbahn Vektor und die Ranglistenzeile Bild ist.
  Sie steht mit der Kante `INS_BILD_KANTE` um die
  Mitte: so liegt der Innenrand jedes Reifs auf dem Innenrand des Bands, und
  Gesicht, Reif und Raute stehen in jeder Stufe an derselben Stelle.
  Zwischen zwei Schwellen liegen drei Grade (`INSIGNIUM_GRADE`), je Grad ein
  Bild. Sie teilen die Spanne in Drittel, abgerundet auf volle Hundert
  (`insigniumGradSchwellen`): der Zierkranz (2100 bis 3099) hat Grad II ab
  2400 und Grad III ab 2700. Sie lagen bei 16 und 40 % der Spanne, und Grad
  III war damit länger als die beiden davor zusammen. Der Grad baut den
  Gegenstand aus, die Stufe wechselt ihn: Leon, Julian und Martin tragen in
  den Referenzdaten Zierkranz III. Der **Ordensstern** hat keine Grade, er
  zählt Zacken und hört nicht auf: ab 5600 alle `ORDENSSTERN_SCHRITT` (500) eine Zacke mehr, und
  die drei Zeichnungen gehören der achten, neunten und ab der zehnten Zacke.
  Die beiden obersten Stufen stehen als `INSIGNIUM_OBEN` an einer Stelle:
  ihr erster Aufstieg ist Breaking [§C33], und als Zahl im Generator wäre
  die Grenze beim Einfügen einer Stufe still eine Stufe tiefer gelandet.
  **Der Rang ist ein Schimmer.** Steine, Kristalle, Beeren und Eicheln
  sind in den Tönen der Rangfarbe (`INS_RANGFARBE`, `_izStein`) gezeichnet,
  gedämpft und je Rang eine eigene Zeichnung; Lilie, Band und die großen
  Spitzen des Sterns sind Metall mit einem Schimmer darauf. In voller
  Sättigung standen sie als violette Flecken auf dem Metall und liefen dem
  Schmuck den Rang ab. `tests/zeichen` misst die Rangfarbe im Stein und
  verlangt eine Lilie aus Metall.
  Ein Filter über einem Bild färbte vorher die violetten Bildpunkte um und
  kostete auf zwölf Wappen einer Rangliste in jedem Bild des Scrollens.
  Dazu zwei Lichter in der Rangfarbe, beide als
  Kreis mit einem Verlauf aus dem gemeinsamen Topf: die **Glut** am
  Innenrand zwischen Gesicht und Band, vom Schildring an mit jedem Feld der
  Leiter kräftiger, und ab dem Zierkranz der **Hof** hinter dem Zeichen, mit
  jeder Stufe kräftiger. So sieht man den Aufstieg auch dort, wo vom
  Schmuck in einer Zeile wenig ankommt. Beide tragen `data-schein`: sie
  sind Licht und keine Form.
  **Die Raute am Fuß trägt die Ligaposition** (`_insFuss`, nur mit Band):
  eine dunkle Raute mit der Zahl, genau auf dem Stein (`INS_RAUTE_Y`, aus
  `IZ_RAUTE`). Der Stein ist so groß wie die Ziffer darauf und nicht
  größer: mit 86 Einheiten Halbdiagonale zog er den Blick vom Gesicht
  weg nach unten, mit 64 bleibt von ihm die Fassung als Rand um die Zahl. In der Liste steht keine Zahl darauf; die Titelsterne sitzen
  dort **unter** der Raute [§C26], weil der Stein die Stelle am Fuß schon
  belegt.
  Die Sterne stehen mit Band in einem eigenen **Streifen darüber**, auf
  Radius 78 (`INS_STERN_R`), und die Bandbox (`INS_BAND_BOX`) reicht dafür
  weiter nach oben, als das Zeichen selbst braucht: Kristall und Spitzen des
  Ordenssterns reichen weiter hinaus als jeder gerechnete Schmuck vorher.
  Hinter dem Reif liegt mit Band die **Aura** der Meistertitel [§C36]; die
  dunkle Unterlage, die ihn auf die Schwinge setzte, ist mit ihr gefallen —
  unter Licht wäre sie ein Schatten genau dort, wo der Schein am hellsten ist.
  **Die Verläufe gehören dem Dokument, nicht dem Zeichen.** Sie hängen nur am
  Metall des Rangs und am Glanz der Sterne — nicht am Spieler, nicht an der
  Stufe. Sie stehen deshalb einmal in einem unsichtbaren `<svg id="insDefs">`
  am Rumpf der Seite, und jedes Wappen verweist nur darauf. Vorher trug jedes
  Wappen seine zwölf Gradienten selbst: das waren rund sechzig der
  siebenundneunzig Knoten eines Zeichens und im Awards-Tab 312 Gradienten für
  ein knappes Dutzend verschiedener Sätze. Der Topf steht **außerhalb von
  `#app` und des Blatts** — darin nähme ihn das nächste `render()` mit, und
  ein Verweis auf einen Verlauf, den es nicht gibt, wirft keinen Fehler: die
  Fläche wird schwarz. `tests/blatt` sieht nach jedem Zeichnen nach.
  **Die Zeichnungen stehen auch nur einmal im Dokument.** Eine Zeichnung ist
  zwanzig bis siebzig Kilobyte, und die Laufbahn zeigt die ganze Leiter samt
  Vitrine: `insigniumStufeSvg` legt deshalb je Rang, Stufe und Zeichnung eine
  Gruppe (`inst…`) in den Topf und verweist darauf, wie die Wappen. Mit
  `{eigen:true}` kommt das volle Markup zurück — damit ein
  Ergebnis für sich steht und sich außerhalb des Dokuments rastern lässt;
  genau das tun `tests/zeichen` und `tests/disziplinen`.
  Dieselbe Zeichnung entsteht nur einmal: gleicher Rang, gleiche Stufe,
  gleiche Titelzahl heißt gleiches Wappen, und das Ergebnis wird gemerkt.
  **Und sie steht auch nur einmal im Dokument** (`insigniumRef`). Gemerkt war
  bisher die Zeichenkette, ausgeliefert wurde sie trotzdem in jeder Kopie: der
  News-Feed trug gemessen 76 Wappen à 48 px und damit 648 seiner 713 Kilobyte
  Markup und 3069 seiner 4605 DOM-Knoten — bei zwölf Spielern und einem Dutzend
  verschiedener Zeichnungen. Diese Fläche wird beim Schließen verschoben und
  hinter dem `backdrop-filter` des Vorhangs in jedem Bild neu gerechnet, und
  genau das ruckelte; im Schließen läuft kein JavaScript, gemessen nicht eine
  einzige Longtask. Das Listen-Bauteil `.rav` [§C27] verweist deshalb mit
  `<use>` auf eine **Gruppe in `<defs>`** im selben Topf, in dem die Verläufe
  schon stehen — 72 Kilobyte und 1612 Knoten. Eine Gruppe, kein `<symbol>`:
  ein `<symbol>` eröffnet beim Verweis ein ZWEITES Koordinatensystem. Das
  äußere `<svg>` trägt `viewBox="-22 -22 144 144"`, das `<use>` setzte darin
  einen Viewport bei (0,0), und die Zeichnung rutschte um 22 von 144 Einheiten
  nach unten rechts — auf einer 52-px-Kachel 8 px, das Gesicht oben links und
  der Reif unten rechts, auf jeder Seite der App. Die Box des `<svg>` ist in
  beiden Fassungen dieselbe, also fängt nur eine Messung am INHALT das:
  `tests/zeichen` legt Verweis und volles Markup nebeneinander und vergleicht,
  wo gezeichnet wird. Der Schlüssel ist das MARKUP selbst: gleiches
  Markup heißt gleiches Symbol, also hängt der Topf an der Zahl verschiedener
  Zeichnungen und nicht an der Zeit [§3]. Ohne Topf bleibt es beim vollen
  Markup, wie bei den Verläufen. Der Inhalt liegt damit im Symbol und ist aus
  der Instanz nicht mehr zu erreichen: `tests/zeichen` rechnet den Reif aus der
  gerenderten Box und der viewBox und prüft die Rechnung einmal gegen das
  gezeichnete Original. `tests/blatt` sieht nach, dass kein Verweis auf ein
  fehlendes Symbol zeigt und dass viele Wappen wenige Zeichnungen teilen.
  **Der Feed legt nur, was zu sehen ist** (`content-visibility:auto` an
  `.nf-card`). Rund siebzig Karten und 4600 Knoten kosteten beim Öffnen und
  bei jedem Zurück aus einem Story-Blatt 110 bis 140 ms Layout — das Parsen
  des Markups nur zehn, das Bauen der Karten fünfzehn. Gemessen jetzt rund
  35 ms. Breaking und die Karte des Tages sind ausgenommen: ihr Schein liegt
  außerhalb der Fläche, und die Eindämmung schnitte ihn ab. `tests/blatt`
  misst die Geometrie der Karten deshalb mit abgeschalteter Regel — so, wie
  eine Karte auf dem Bildschirm liegt — und prüft die Regel selbst getrennt.
  **Und er zeichnet zuerst, was man sieht** (`NEWS_FEED_SOFORT`,
  `_newsFeedRest`). Auch mit `content-visibility` rechnete der Browser beim
  Öffnen Stil und Layout aller rund 3400 Knoten: gemessen 350 ms mit
  gedrosselter CPU, und das Skript selbst war davon kein Zehntel. Gezeichnet
  werden zuerst rund zwölf Karten, auch bei einem sehr großen einzelnen
  Spieltag. Der Rest wird nicht vorab als HTML gebaut: `_newsFeedPlan`
  reicht nach einem Bild in ruhigen Takten höchstens vier Karten nach
  (`requestIdleCallback` mit Zeitgrenze, sonst kurzer Timer). Tagesköpfe und
  Tageskarten bleiben einmalig; die Wahl gilt weiterhin über alle Filter.
  Ein Index je Tag ersetzt wiederholte Vollsuchen im Storybestand. Die Klicks
  hängen an der Liste, nicht an jeder Karte. Alte Aufträge prüfen ihre
  Identität, die offene Liste und Datenversion: kein Einfügen in ein neues
  Blatt, einen neuen Filter oder nach dem Schließen. Ein direkter Aufruf von
  `_newsFeedRest()` füllt für Geometrieprüfungen weiterhin vollständig.
  **Ein geschlossenes Blatt ist leer** (`_sheetForceClose`). Es liegt
  unter dem Bildschirmrand in einer eigenen Schicht und behielt seinen
  Inhalt, nach dem Feed 5400 Knoten, die jede Stilberechnung der Seite
  mitlief. Geleert wird am Ende des Zuschiebens; jedes Öffnen trägt eine
  Nummer (`sheet._auf`), und was beim Schließen später erledigt wird — das
  Leeren und das Zuziehen per Wisch —, lässt ein inzwischen neu geöffnetes
  Blatt in Ruhe: der Wisch schloss sonst 280 ms später das nächste.
  **Der Zug-Lauscher hängt nur, wenn die Geste schließen kann**
  (`bindSheetSwipe`): oben und ohne gescrollten Inhalt. Ein nicht passiver
  `touchmove` lässt den Browser vor jedem Scrollbild auf JavaScript warten,
  und er hing dauerhaft am Blatt.
  **Kopfleiste und untere Leiste tragen keinen `backdrop-filter`**: beide
  stehen beim Scrollen still, und die Unschärfe rechnete in jedem Bild alles
  darunter neu, bei Flächen, die bis auf ihren Saum deckend sind.
  **Das Blatt wird verschoben, nicht neu gezeichnet** (`will-change:transform`
  auf `.sheet`): ohne den Hinweis liegt sein Inhalt in der Schicht der Seite
  und wird in jedem Bild der Bewegung mitgemalt. Und ein Vorhang mit
  `backdrop-filter` nennt die eine Eigenschaft, die sich ändert: `transition:.2s`
  ist `transition:all` und stellte auch den Blur zur Animation, der in jedem
  Bild alles hinter sich neu rechnet.

  Gemessen, nicht behauptet: `tests/zeichen` rastert alle einundzwanzig
  Zeichnungen und verlangt je Zeichnung, dass sie mittig steht, spiegelgleich ist, ein
  freies Loch für das Gesicht hat, ihren Reif rundum bei 22 bis 25 % der
  Kante trägt und am Rand der Zeichenfläche nichts mehr zeichnet — und dass
  sich zwei Grade bei 52 px sichtbar unterscheiden. `tests/disziplinen`
  verlangt je Stufe drei verschiedene Zeichnungen und für jeden Rang eine
  Zeichnung in seiner Rangfarbe, ohne Filter.
  Auch die kleine Leiter im Blatt (`_newsLeiter`, `.nf-lt-p`) zeigt die
  **echten** Zeichen. Sie zeigte fünf CSS-Kreise mit
  `repeating-conic-gradient` — fünf Rosetten in fünf Farben, wo Reif,
  Schildring, Volutenkranz, Lorbeerreif und Ordensstern stehen müssten, und
  damit einen Platzhalter, der mit dem Zeichen eines Spielers nichts zu tun
  hatte. Sie zeigt dieselben Bilder wie die Laufbahn. Ein Feld ist **höchstens 40 px** breit: bei 28 blieb vom
  Schildring ein Ring, und die sechzehn des CSS-Punktes waren für einen Punkt
  gedacht. Sieben Felder und die Zahl daneben liefen bei 360 px über den
  Rand; die Felder teilen sich deshalb die Zeile, und die Zahl steht
  darunter. `tests/blatt` misst beides.
  Die Laufbahn zeigt die Leiter als Vitrine (`.lb-karus`/`.lb-k`): eine
  Stufe groß in der Mitte, die übrigen schiebt man heran — **oder tippt sie
  an**. Wischen allein hat die letzte Stufe nie erreicht: der Blatt-Zug
  riss jede waagerechte Geste an sich, sobald sie zwölf Pixel nach unten
  driftete. Das ist repariert (`bindSheetSwipe` entscheidet die Richtung
  einmal je Berührung), aber ein Ziel tippt man ohnehin lieber an.
  `tests/blatt` misst beides.
  Die drei Marken unter der Vitrine sind Knöpfe: sie zeigen den Grad in der
  Vitrine. Darunter steht **die ganze Leiter** (`#lbAlle`): sieben Zeilen zu
  drei Feldern, das erreichte hell, das eigene gerahmt, darüber „x von 21
  erreicht"; ein Feld antippen stellt die Vitrine auf Stufe und Grad. Die
  Vitrine allein zeigte einen Gegenstand zur Zeit, und was ein Grad
  verändert, sah man nur durch Wischen und Merken. `tests/blatt` misst das.
  **Und die Liga erfährt davon** (`insignium_stand`, ein Fun Fact „Die Leiter
  der Liga"): wie viele welche Stufe tragen, was die Spitze trägt und wie
  weit es zur nächsten Stufe ist, auf der Karte die sieben Zeichen mit ihrer
  Trägerzahl und im Blatt jede Stufe mit den Gesichtern ihrer Träger. Der
  Stand ist mit der Karte gespeichert (`dataRef.leiter`) — eine Karte von
  gestern erzählt vom Stand von gestern.
- **§C36 Die Titel sind Licht.** Hinter Avatar und Insignium steht die
  **Aura** der Meistertitel (`35c-titel-aura.js`, `AURA_STUFEN`), die Korona
  aus `mockup/titel-aura`: ein weicher Goldschein mit ungleich langen
  Strahlen, ab der vierten Stufe Goldstaub, ab der siebten ein Lichtring, ab
  der neunten einzelne Lichtsterne. Zehn Stufen, je Titel eine; danach
  bleibt sie stehen, und die Zahl neben den fünf Sternen zählt weiter
  [§C26]. Sie ersetzt die Rankenschwinge: die stand golden NEBEN dem Zeichen,
  griff zweieinhalb Reifradien weit aus, musste in einer Zeile auf 78 %
  zurückgenommen werden, und ein dritter goldener Kranz neben dem silbernen
  war einer zu viel. Licht nimmt keine Form weg und liegt hinter allem.
  **Das Maß kommt aus dem Entwurf**: dort nimmt das Insignium 70 % der
  Fläche ein, also ist die Aura 1/0,7 so breit wie das Zeichen
  (`AURA_SEITE`), und ihre Mitte ist bis Radius 184 von 1000 ausgespart —
  genau am Reif beginnt der Schein, und durch das Gesicht fällt kein Licht.
  Die Bandbox bleibt, wie sie war: die Aura leuchtet über sie hinaus
  (`overflow:visible`), sonst rückte jede Stelle, an der das Banner steht.
  **Jede Stufe wird einmal gerechnet und als Datei gemerkt** (`auraHref`,
  eine Blob-Adresse wie bei den Wappen [§C30]). Im Wappen steht sie als
  `<image>`, still: die Unschärfe der Strahlen rastert der Browser einmal.
  **Bewegt ist sie nur im Profilkopf** (`auraLebendHtml`), und dort in drei
  eigenen Bildebenen — Schein, Strahlen, Gegenstrahlen samt Staub —, die
  sich nur über `transform` und Deckkraft bewegen: das rechnet die
  Grafikkarte. Im Entwurf drehten sich Gruppen INNERHALB des SVG, und dann
  rechnet der Browser die Unschärfe in jedem Bild neu; sechs Ebenen in
  voller Größe hätten auf einem Telefon mit dreifacher Pixeldichte über
  30 Megabyte Grafikspeicher gekostet. Im Zeichen dahinter steht sie dort
  nicht noch einmal (`insigniumSvg(…, {lebendig:true})`). Bei
  `prefers-reduced-motion` steht sie still.
  In der Laufbahn stehen ihre zehn Stufen als **zweite Leiter** unter der
  Vitrine (`.lb-auren`): zwei Reihen zu fünf, klein, in jedem Feld das
  eigene Zeichen als Bild aus demselben Topf. Klein ist Absicht: die
  Vitrine sammelt man Punkt für Punkt, die Aura gewinnt man, und zwei gleich
  laute Leitern auf einer Seite sind keine mehr. `tests/zeichen` misst Lage,
  Größe, Loch und die Helligkeit je Stufe, `tests/blatt` die Bewegung.
- **§C34 Drei belegbare Quellen, kein versteckter Leistungswert.** Prestige
  [§13.8] kommt ausschließlich aus **Auszeichnungen, Monatschroniken und
  aktuell gehaltenen Liga-Rekorden**. Siegquote, Elo-Hoch oder Spielzahl
  erzeugen keinen vierten Punktetopf; Können zählt erst, wenn daraus einer
  dieser sichtbaren Erfolge geworden ist. Nur aktuell gehaltene Rekorde dürfen
  beim Verlust eines Bestwerts wieder sinken; erworbene Auszeichnungen und
  Monatschroniken bleiben Teil der Laufbahn.
  Gezählt wird je Monat **der Eintrag, der in der Matrix steht** [§C32] — nicht
  jeder Bestwert dieses Monats: ein dominanter Monat gewinnt acht Quoten auf
  einmal, und die sagen alle dasselbe über denselben Monat. Es ist derselbe
  Eintrag, den das Profil zeigt, sonst stünde dort eine Wertung und im
  Prestige eine andere, und die Zahl wäre nirgends nachzuzählen. Für einen
  abgeschlossenen Monat kommt er aus dem Einfrierer (`_frozenTitlesOf`) und
  nicht aus einer neuen Rechnung: sonst verschöbe ein geänderter Katalog
  rückwirkend das Prestige jeder Laufbahn. `tests/disziplinen` und
  `tests/archiv` messen beides.

  **Jede positive Auszeichnung zählt jedes Mal.** Ihre sichtbare Klasse setzt
  den Standard (`PRESTIGE_AUSZEICHNUNG`): Rare **25 / −18 %**, Common
  **3 / −25 %**. **Jede legendäre Auszeichnung trägt ihren eigenen
  Startwert** in `PRESTIGE_AUSZEICHNUNG_SPEZIAL`, dazu die Wochen- und
  Tageswertung: 20er Serie und Dynastie **120**, Meister der Saison **100**
  (−5 %), 15er Serie **75**, Dominator, Team der Saison, Award-Sammler und
  Untouchable **70**, Player of the Week **50** (−12 %), Mr. Perfect **50**,
  Absoluter Sieger **40** (−15 %), Player of the Day **10** (−25 %), die
  übrigen mit −10 %. Ein Wert für die ganze Klasse stellte die 20er Serie
  neben den 10:0-Sieg und die Dynastie (600 Elo) neben den Dominator (400);
  das sind verschiedene Höhen. Der Standard der Klasse (70) greift nur für
  eine neue legendäre Auszeichnung ohne eigenen Eintrag. Die Tabelle steht
  nach Gewicht geordnet, und **das Regelblatt liest sie von dort**
  (`_prestigeRegelListe`, nach Startwert, dann der langsameren Kurve): es
  stand eine feste Liste aus sechs Zeilen da, und eine neue Auszeichnung
  wäre gar nicht oder hinten angehängt erschienen. Ein Balken je Zeile
  zeigt den Startwert gegen den höchsten.
  Damit ist der Meister unter den Saisonwürden am wertvollsten, Dominator
  und Team der Saison liegen gleichauf. Der seltenere Wochensieger wiegt
  klar vor dem stark von der Zahl eigener Spieltage abhängigen Tagessieg.
  Je zwei Verleihungen teilen eine Stufe: Nummer eins und zwei zählen voll,
  Nummer drei und vier sinken um den genannten Prozentsatz; danach wird die
  harmonische Kurve paarweise flacher statt geometrisch gegen ein Limit zu
  laufen. Drei Dominator-Erfolge ergeben 70 + 70 + 63, drei Carry-Erfolge
  3 + 3 + 2,25. Jeder weitere positive Erfolg erhöht das Prestige, auch nach
  tausend Wiederholungen. Schanden geben null Punkte und ziehen nichts ab.
  Der Vergleich im festen Ligabestand misst dazu Spiele, Siegquote und alle
  drei Prestigequellen gemeinsam: Julian steht mit 65 % aus 171 Partien bei
  3004 Prestige und 1176 Auszeichnungspunkten, Maxi mit 44 % aus 348 Partien
  bei 1145 und 906. POTD allein kann den doppelten Spielumfang damit nicht mehr
  stark hebeln; vier seltene Wochensiege bringen Julian rund 188 Punkte. Das
  ist eine gezielte Korrektur der beiden Perioden-Auszeichnungen, kein neuer
  versteckter Skill-Multiplikator.

  Monatswertungen behalten ihren tatsächlichen Info-Sheet-Wert aus
  `chronikPunkte`. Erst die Zusammenrechnung dämpft die nach Wert sortierte
  Sammlung: Platz 1–2 zählen voll, 3–5 durch √2, 6–8 durch √3 und danach alle
  drei Werte eine Wurzelstufe weiter. Liga-Rekorde beginnen bei dem
  **Grundwert, der an ihrem Katalogeintrag steht** (`allzeit.basis`,
  `_rekordBasis`): 150 für Können, für die leistungsbezogene Form und für
  eine leistungsbezogene Bestmarke, 75 für einen Rollenwert und eine Fügung,
  0 für eine Schattenseite. Er stand vorher allein in
  `PRESTIGE_ART[art]` — und damit konnte „Der Unaufhaltsame" nicht 150
  wiegen, ohne gleichzeitig seinen Platz in der Katalogreihenfolge und in
  der Monatstafel zu verschieben: `art` ordnet den Katalog, der Grundwert
  wiegt. `PRESTIGE_ART` bleibt der Rückfall für einen Eintrag, der ihn nicht
  setzt. Sie werden durch die Zahl ihrer heutigen Halter geteilt und
  dann wie Chroniken gestapelt: Platz 1–2 voll, 3–5 durch √2, 6–8 durch √3
  und danach alle drei Rekorde eine Wurzelstufe weiter. So bleiben Rekorde belohnend,
  Auszeichnungen tragend und zufälligere Chroniken sichtbar, ohne langfristig
  allein zu dominieren. Keine Quelle besitzt einen harten Deckel.
  Das Laufbahnblatt zeigt statt der gedrängten Drei-Karten-Legende einen
  einzigen klaren Verweis. Er öffnet ein eigenes Regelblatt; dort bleiben
  Legendary, Rare und Common in einer Zeile, bekommen aber ausreichend Höhe,
  und die sechs Sonderwerte stehen darunter einzeln. Die Postenzeilen nennen
  nur noch Klasse, Anzahl, Start- oder letzten Teilwert. Chronikzeilen zeigen den
  unveränderten Info-Sheet-Wert, Rang und Wurzelstufe. Rekordzeilen zeigen
  Grundwert, Halterteilung, Rang und Wurzelstufe. Die drei Quellensummen stehen
  bereits oben; im echten Bestand tragen Auszeichnungen rund 48 %, Chroniken
  18 % und Rekorde 34 % des Prestigevolumens. Eine runde Zahl ist im Blatt
  nachrechenbar: „144, geteilt durch zwei Halter, dann durch Wurzel zwei"
  liest niemand nach, 150 schon.
  **Der rohe Grundwert ist nicht, was jemand bekommt.** Ein zehnter Rekord
  gibt nicht 150 Prestige: er wird durch die Zahl seiner Halter geteilt,
  landet auf einem Rang im Rekordstapel und wird dort durch die Wurzel seiner
  Staffel geteilt — und weil er die anderen Rekorde mit verschiebt, ist der
  Nettozuwachs am Ende noch eine dritte Zahl. Das Blatt einer Rekord-Karte
  (`_ndRekordBlatt`) zeigt deshalb die **Wirkung aus den beiden Ständen** von
  `prestigeTabelle` vor und nach dem Tagesabschluss — gespeichert als
  `laufbahn` an der Karte, weil dieselbe Rechnung morgen eine andere Zahl
  sagt — gezeichnet wie an der Tafel (`_ndWirkungBlock`): Stufe, Zuwachs oder
  Verlust und der Weg zur nächsten Schwelle. Darüber stand je Halter ein
  Rechentext („Aktuelle Form · Grundwert 150 ÷ 4 Halter · 18. Rekord ÷ √7 ·
  20 Rekorde: 1450 → 1465"); die Rechnung der Quelle steht im Laufbahnblatt
  (`_prestigeQuellSatz`), und jede Zeile führt dorthin. Eine Karte aus einem
  älteren Lauf kennt die beiden Stände nicht — sie zeigt, was der Rekord
  heute bringt, und behauptet keinen Zuwachs. Die **Bühne** zeigt den Wechsel
  als Bild — unter „vorher" nur, wer wirklich weg ist, darunter alle Halter
  mit Namen — und den Wert, beim Ausbau den alten durchgestrichen davor; die
  Sätze „Vorher gehörte der Rekord …" und „Für … heißt der Spieltag …"
  fallen im Kopf des Blatts deshalb weg. Die Verfolger bekommen alle Halter:
  mit `playerIds`, das höchstens drei nennt, stand der vierte Halter als
  Verfolger unter seinem eigenen Rekord. **Und alle drei Rekordfälle teilen
  dieses Blatt**: nur „übernommen" hatte einen Fall im Schalter, ein erstmals
  vergebener und ein ausgebauter Rekord öffneten gemessen ein Blatt mit null
  Zeichen Mitte. `tests/ambient` misst das alles.
  **Die übrigen Blätter der Ewigen Tafel tragen ebenfalls eine Bühne**
  (`_ndWechselBuehne`, `_ndChronikBlatt`, `_ndMonatBlatt`, `_ndErstlingBlatt`,
  `_ndInsigniumBlatt`). Sie waren eine Spalte aus Zahlenkästen, Podest und
  Textzeilen. Der **Chronik-Wechsel** steht auf derselben Bühne wie der
  Rekord — ein Wechsel ist ein Wechsel [§C27] — mit Klasse und Monat als
  Marken; das Podest des Monats nur, wenn mehr als einer die Bedingung
  erfüllt, sonst stünde der Halter zweimal da. Die **Monatstafel** (der Tag,
  an dem sie aufgeht, und der Monatswechsel) zeigt die Zahl der Einträge, je
  Träger einen Balken mit Gesicht und Name (dasselbe Bauteil wie das Feld des
  Spielers des Tages) und jeden Eintrag als Zelle aus Zeichen, Name und
  Gesicht; eine laufende Tafel wird dabei an der Karte geschnitten
  (`seasonTitles(sid, bisMs)`), denn eine Karte von Dienstag erzählt vom
  Dienstag. Der **erste Eintrag** zeigt das Wappen mit dem Zeichen der Chronik
  und die Monate seitdem als Zellen. Die **Insignium-Stufe** zeigt die
  Verwandlung — die Stufe davor leise, ein Pfeil, die neue groß um das
  Gesicht —, woraus die Punkte kommen als ein Balken in drei Farben, den Weg
  durch die drei Grade bis zur nächsten Schwelle und die Leiter; gerechnet
  wird mit den gespeicherten Punkten, die Aufteilung trägt die Karte als
  `teile` und eine ältere im Satz. Was die Bühne zeigt, fällt aus dem Satz
  darüber weg (`_ndNeu`). Die Zeilen „Tafel, Profil und Laufbahn"
  (`_ndChronikEbenen`) bleiben [§C32]. Der **Tafel-Moment** und die **kurze
  Strecke** (`_ndTafelMomentBlatt`) zeigen oben den **Spieltag als Achse**:
  jede Partie des Tages ein Punkt darauf, hell, wenn sich nach ihr etwas
  bewegt hat, und darüber jede Bewegung als Punkt in der Farbe ihrer Art —
  Gold Bestmarke und Chronik (die Chronik hohl), Silber der Ausbau, Violett
  die Stufe —, so hoch wie die höchste Säule. Davor stand je Beteiligtem eine
  Zeile mit Gesicht, Name und einem Zeichen je Bewegung, und das sagte die
  Liste darunter ein zweites Mal; eine Zeitachse mit gestapelten ZEICHEN und
  losen Namenschips davor ließ nicht erkennen, wem welches gehörte. Namen
  stehen deshalb nur unten. Ihre
  Zeilen (`_ndTafelZeileBild`) zeigen den Eintrag, wer was tat und rechts
  den Wechsel aus Gesichtern mit dem Wert, und keinen Satz mehr, der beides
  wiederholt. **Eine Zeile führt zu ihrem Eintrag** (`_ndTafelZiel`): ein
  Rekord öffnet sein Blatt, eine Monatschronik ihre Wertung im Monat der
  Karte, ein Insignium die Laufbahn — sie führte ins Profil des ersten
  Genannten, und wer auf „Der Zerstörer" tippte, landete bei einem Menschen.
  Nur eine Zeile ohne Verweis bleibt beim Profil. Eine Zeile ohne Halter aus
  einem älteren Lauf bleibt, wie sie war. Die Klassen heißen `nd-ta-…` und
  `ta-…`: `.nd-tl` ist die Tagesleiste, `.rek` die Karte des
  Rekorde-Reiters und zog ihr Raster über den Punkt, `.nd-tm` die
  Partienzeile im Blatt des Spielers des Tages. `tests/ambient` hält
  die Zahlen jeder Bühne an ihrer Quelle fest.
  **Ein Spieler und eine Zahl stehen zusammen** (`_ndHeldBuehne`):
  Meilenstein und Jubiläum (die Zahl, die Leiter der Marken davor und
  danach, die Bilanz bis zur Partie als Balken, beim Elo-Meilenstein die
  Elo der Laufbahn als Linie mit der Marke), die Form (der Vorsprung, beide
  Quoten als Balken und die zehn Partien als Lauf) und der Ausschlag eines
  Tages (die Elo des Tages als Kurve und der Tag in Partien). Sie zeigten das
  Wappen im Kopf und die Zahl darunter in einem Kasten oder einer Zeile. Das
  **Spitzenspiel** zeigt Platz eins und zwei mit dem Ergebnis dazwischen und
  darunter die Abschnitte jeder Partie, die **runden Marken** eines Tages je
  Marke eine Kachel aus Zeichen, Zahl und Gesicht. Der **Fun Fact** eines
  Spielers (`_ndFaktBlatt`) steht auf derselben Bühne wie der Meilenstein;
  darunter das Zeichen, wenn es um Prestige geht, die Verfolger, wenn es ein
  Rekord ist, sonst die letzten zehn Partien bis zum Tag der Karte. Die
  Leiter der Liga und ein Paar behalten ihr eigenes Blatt. **Und kein Blatt trägt
  eine Überschrift ohne etwas darunter** (`_ndOhneLeere`): „Die Partie zum
  Meilenstein" stand über nichts, weil die Partie schon im Kopf stand.
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
  achtunddreißig Haltungen. Heute sind es **einundsiebzig Rekorde** in
  **fünf Kammern** — 30 Können, 8 Aktuelle Form, 10 Bestmarken, 12 Fügungen,
  11 Schattenseiten — und 80 Haltungen, 41 davon bei den drei Besten der
  Siegquote. Gemessen hält der Spieler mit den meisten Partien zehn Einträge
  und der Vierte der Siegquote ebenfalls zehn aus 97 Partien: die Tafel hängt
  nicht mehr an der Spielzahl.
  **Die Kammer steht am Eintrag** (`allzeit.kammer`), sie wird nicht mehr aus
  `art` erraten. Abgeleitet war „Fügung, sonst Schatten, sonst Ereignis gleich
  Bestmarke", und damit gab es die Kammer „Aktuelle Form" gar nicht: ein
  Fenster-Rekord ist eine Leistung und landete im Können. Dort stand „Höchste
  Siegquote in den letzten 20 Partien" neben „Beste Siegquote als Außenseiter
  über die ganze Laufbahn", also zwei verschiedene Zeitachsen in einer
  Kammer, und wer die Tafel liest, konnte nicht sehen, was gerade gilt und
  was für immer.
  **Die Karte nennt Zeitraum, Grundwert und Mindestbasis** (`zeitraum`,
  `basis`, `mind`). Die Mindestbasis musste der Leser aus dem Bedingungssatz
  heraussuchen, und über welche Strecke gerechnet wird, stand nirgends. Der
  Grundwert steht dabei ausdrücklich als „150 P Basis": er ist NICHT, was
  jemand bekommt — er wird durch die Zahl der Halter geteilt und danach in
  der Wurzelstaffel gedämpft [§C34]. Den tatsächlichen Beitrag zeigt das
  Blatt. Die Zeile steht leise und ohne Rahmen: zwei gerahmte Pillen
  brachen fast immer um und waren lauter als der Wert.
  **Die Karte zeigt, wie weit der Halter vorn liegt** (`_rekFeldHtml`). Sie
  nannte seinen Wert und sonst nichts; ob der Zweite knapp dahinter liegt,
  stand erst im Blatt. Jetzt steht der Wert groß in der Farbe der Kammer, und
  darunter das Bauteil „Wo im Feld" des Belegs [§C27] — jeder im Rennen ein
  Punkt, der Halter am rechten Ende —, daneben der Erste, der ihn nicht
  hält, mit seinem Wert. Gelesen wird `chronicleRang`, dieselbe Reihenfolge
  wie Podest und Verfolger; ihr Topf ist deshalb so groß wie der Katalog,
  sonst räumte jedes Zeichnen des Reiters die Einträge, die Blatt und Feed
  gerade brauchten. Der Kopf jeder Kammer sagt in einem Satz, was sie misst
  (`CHRON_KINDS.satz`), und zeigt die drei, die darin am meisten halten.
  **Und sie nennt nicht, was sich an der APP geändert hat.** Jede Karte trug
  eine Marke „Neu" oder „Überarbeitet". Die sagt, welche Fassung der App
  gerade läuft, und dem Leser einer Rekordkarte nichts: er will wissen, was
  der Rekord misst und wer ihn hält. Dasselbe galt für die Erklärungen — dort
  stand die Begründung gegen die frühere Rechnung („Der beste Zwanzigerblock
  irgendwo in der Laufbahn gehörte immer dem, der am meisten gespielt hat",
  „Deshalb wiegt der Eintrag 50 Punkte und nicht 100", „sonst wäre eine Seite
  leichter zu halten als die andere"). Das ist die Bauanleitung und gehört in
  einen Kommentar, nicht auf die Karte — dieselbe Regel wie „Das Blatt
  erklärt nicht die App" [§C33]. `tests/disziplinen` prüft jeden sichtbaren
  Text jedes Rekords und jeder Chronik gegen eine Liste solcher Wendungen und
  gegen Entwicklersprache („Rohsicht", „Cache", „Projektion", „Savepoint",
  ein Paragraphenzeichen).
  **Zwei Einträge messen dieselbe Teilmenge von zwei Seiten, und beide
  bleiben.** „Die ruhige Hand" misst den SPRUNG in engen Partien gegenüber
  den übrigen, „Der Entscheider" die Quote in engen Partien selbst. Wer dort
  so gut ist wie sonst, hat keinen Sprung und kann trotzdem der Beste sein; wer
  sonst schwach ist, macht mit einem Sprung noch keine gute Quote. Dasselbe
  Paar bilden „Der Stehaufmann" (Sprung nach EINER Niederlage) und „Der
  Rückschlag" (Quote nach zwei Niederlagen in Folge, und nach jeder weiteren
  erneut). Das ist keine Doppelung im Sinne der sieben gestrichenen
  Nachbarn: dort stand dieselbe Frage mit derselben Antwort, hier stehen zwei
  Fragen, und gemessen halten sie zwei verschiedene Spieler.
  **Zwei Einträge haben ihre Frage gewechselt und ihre ID behalten.** Ein
  Wechsel und keine Neuanlage, damit jeder Verweis auf sie weiter trägt —
  Profile, eingefrorene Monate und persistierte Karten hängen an der ID.
  „Gegen jeden bestanden" zählte den ANTEIL der regelmäßigen Gegner mit
  positiver Bilanz und beantwortete damit eine andere Frage als sein Name:
  wer gegen neun von zehn gut und gegen den zehnten furchtbar steht, stand
  bei 90 % und hatte genau den Angstgegner, den der Eintrag ausschließen
  soll. Er heißt jetzt **„Kein Angstgegner"** und wertet die SCHWÄCHSTE
  dieser Bilanzen — ein einziger Gegner kostet den Rekord. Die Monatsachse
  bleibt der Anteil: in vier Wochen kommen drei Duelle gegen einen Gegner
  zusammen, und ein Minimum aus drei Partien ist ein Wurf und kein Muster.
  „Der Schadensbegrenzer" zählte den Anteil der Pleiten ab sieben Toren
  Rückstand und ließ offen, wie die übrigen ausgingen: wer nie hoch und immer
  mit fünf Toren verliert, stand bei null Prozent und damit an der Spitze. Er
  heißt jetzt **„Der Widerstand"** und misst den mittleren Rückstand JEDER
  Niederlage.
  **Aktuelle Form ist ein festes Endfenster und nie der beste Abschnitt.**
  Acht Rekorde stehen auf den letzten 10, 20, 25, 30 oder 50 eigenen
  Partien. Der beste Zwanzigerblock IRGENDWO in einer Laufbahn gehörte immer
  dem Vielspieler: dreihundert Partien haben 281 solche Blöcke, dreißig
  Partien haben elf, und das Maximum aus vielen Ziehungen ist größer.
  `tests/disziplinen` rechnet jedes der sechs Fenster unabhängig aus den
  echten Partien nach.
  **Elf Rekorde sind gefallen, elf sind dazugekommen.** Weg sind „Der
  Gigantentöter", „Der Nervenkitzler", „Der Unerschütterliche", „Der
  Hausherr", „Das Sonntagskind", „Die starke Phase", „Der Aufschwung", „Die
  kalte Dusche", „Die Torbilanz", „Der Angreifer" und die Laufbahn-Achse der
  „Steigerung" (ihre Monatschronik bleibt). Neu sind „Gegen den Wind", „Der
  Sturmführer", „Der Allrounder", „Der Laufstopper", „Der Lauf", „Die
  Abwehrmauer", „Der Sturmtreue", „Der Seitenwechsler" und die
  Laufbahn-Achsen von „Kein Angstgegner", „Der Deutliche" und „Der
  Kaltstart". Die persistierten Karten der gestrichenen Rekorde sind in
  `STORY_ABGEMELDET` namentlich abgemeldet: der Generator bildet ihre IDs
  nicht mehr, also kann `_newsTexteAuffrischen` sie nicht umschreiben, und
  sie behaupteten sonst für immer einen Rekord, den es nicht mehr gibt. Ihr
  Blatt stürzt trotzdem nicht ab — die Definition wird überall mit `?`
  abgefragt, der Text steht in der Zeile.
  **Vierzehn Gegenpaare messen dieselbe Frage von zwei Seiten** und tragen
  dieselbe Mindestbasis: sonst wäre eine Hälfte leichter zu halten als die
  andere. Keines ist mehr je Seite geeicht: Unaufhaltsamer und
  Durststrecke verlangen ihr erstes Glied, Sonntagsschuss und bitterste
  Pleite eine einzige Partie.
  **Ein Rekord hat keine Wertlatte, nur eine Stichprobe.** Wer
  20 % seiner Wochen gewinnt und damit vorn liegt, hält „Der Wochenherr" —
  der Rekord ist der beste Wert, den es gibt, und nicht der beste über einer
  Latte. Siebzehn Rekorde trugen eine solche Latte — in Prozent („mindestens
  25 %", „höchstens 45 % Siegchance", „ein Sturmanteil zwischen 43 und
  57 %"), in Elo („ab 350 Elo", „ab 150 Elo Verlust") oder als Serienlänge
  („ab 8 Siegen in Folge") —, und sie ließ den Rekord leer oder strich den
  Besten aus dem Rennen. Was ein Wert von sich aus braucht, bleibt: eine
  Serie ihr erstes Glied, ein Wechsel zwei Partien, eine Wiederholung zwei
  gleiche Ergebnisse, ein Sprung oder Verlust eine Richtung. Verlangt werden darf nur,
  dass der Wert auf genug beruht: Partien, Spieltage, Wochen, Niederlagen —
  sonst hielte ein Neuling nach drei Abenden einen Rekord, ohne eine Linie
  gezeigt zu haben. Eine Teilmenge, die beschreibt, welche Partien zählen
  („Partien mit 35 bis 65 % Siegchance"), ist keine Latte und bleibt.
  `tests/disziplinen` liest Bedingung, Mindestbasis und Wertfunktion jedes
  Rekords, dazu `min` und die Wertfunktion auf Elo-Latten. Seitdem sind
  „Der Unaufhaltsame", „Der höchste Gipfel" und „Der Maßstab" mit fünfzig
  Partien erreichbar und tragen `offen`. Damit sind Sonntagsschuss und bitterste Pleite auch kein `paar`
  mehr: ohne Latte stehen in beiden Rennen dieselben Spieler.
  **Eine Kammer, die die Auslosung misst, wiegt 75.** Rollenwerte und
  Fügungen dürfen von einer Laufbahn aus lauter Niederlagen gehalten werden:
  „Das Fundament" fragt nach der gleichmäßigsten Tordifferenz, und wer immer
  0:10 verliert, ist gleichmäßig. Was 150 Punkte wert ist, darf sie nicht
  erreichen — `tests/disziplinen` spielt genau diese Laufbahn gegen jeden
  Rekord mit Grundwert 150.
  **Der Anteil an den eigenen Gelegenheiten kennt die Spielzahl nicht.** „Der
  Platzhirsch" und „Der Wochenherr" waren lange die einzigen zwei Rekorde
  dieser Bauart: sie zählen nicht, wie oft etwas gelang, sondern wie oft von
  wie vielen Gelegenheiten. Wer an zwanzig Spieltagen dabei war, wird an
  zwanzig gemessen — und genau deshalb erreicht ein solcher Anteil den, der
  weniger spielt. Gemessen verlangten 17 der 57 Rekorde eine Mindestzahl von
  vierzig Partien oder mehr, darunter die vier mit fünfzig Sturm- oder
  Abwehrspielen; „Der Tagesabschluss", „Der Ausgleicher", „Auf Augenhöhe" und
  „Das Metronom" fragen stattdessen nach den eigenen Spieltagen, dem eigenen
  Partnerkreis und den eigenen offenen Partien. Die Herleitung samt Messung
  steht in `mockup/README-staerken.md`.
  **Ein neuer Rekord steht neben seinem nächsten Verwandten.** Die
  Katalogreihenfolge IST die Reihenfolge im Rekorde-Reiter, und ein Eintrag
  am Ende der Liste erklärt sich niemandem: „Der Tagesabschluss" steht neben
  „Der makellose Tag", „Der Ausgleicher" neben „Der Katalysator", „Auf
  Augenhöhe" neben „Die ruhige Hand", „Der Sturmführer" neben „Der
  Abwehrchef", „Der Kaltstart" neben „Der letzte Ball", „Der Torrausch"
  neben „Die dichte Phase", „Der Sturmtreue" neben „Die Mauer" und „Die
  Abwehrmauer" neben „Der Dauerstürmer". Ebenso stehen „Der Entscheider"
  neben „Die ruhige Hand", „Die Retourkutsche" neben „Kein Angstgegner",
  „Der Unbeugsame" neben „Der Unaufhaltsame", „Der Rollencoup" neben dem
  kompletten Verteidiger, „Der Rückschlag" neben „Der Stehaufmann" und „Der
  Wiedereinstieg" neben „Der Kaltstart". Wer eine
  Monatschronik um ihre Laufbahn-Achse ergänzt, verschiebt ihren Eintrag
  dorthin; die Monatstafel bleibt davon unberührt, weil `SEASON_TITLES` nach
  Art, Chronik-Art und Ausschlag sortiert und nicht nach der Katalogfolge.
  **Die Schwelle ist keine Bedingung, sondern eine Kammer.** Ein Rekord
  DARF eine hohe Mindestzahl verlangen: wer sie hält, hat die Frage über eine
  lange Strecke beantwortet, und Rekorde sind auch dazu da, Können zu
  belohnen. Er darf aber nicht nur das. Rekorde tragen deshalb
  `offen` im Katalog: ihre Bedingung ist mit **fünfzig Partien** in der
  Laufbahn erfüllbar — unter anderem „Die dichte Phase", „Der Torrausch",
  „Der Lauf", „Der Höhenflug", „Das Übersoll", „Der Souverän", „Der letzte
  Ball", „Der Kaltstart", „Der Dauerstürmer", „Die Abwehrmauer", „Der
  Sturmtreue", „Die Mauer", „Der Laufstopper", „Der Entscheider", „Die
  Retourkutsche", „Der Unbeugsame", „Der Rückschlag", „Der Wiedereinstieg"
  und „Der Rollencoup" — die sechs Neuen fragen nach einer Teilmenge der
  eigenen Partien (enge Partien, Wiedersehen, Gelegenheiten, Rückkehrspiele,
  Außenseiterpartien einer Position) und nicht nach einer Gesamtzahl, und
  genau deshalb erreicht sie auch, wer weniger spielt. Nicht offen sind die, die
  eine lange Strecke verlangen: „Der Wochenherr" mit zehn eigenen Wochen und
  die Funde „Die Punktlandung" und „Die Achterbahn". Gemessen waren 13 der 21 damaligen Rekorde
  mit lesbarer Mindestzahl für einen solchen Spieler unerreichbar: „ab 50
  Sturmspielen", „ab 60 Gelegenheiten", „ab 80 Spielen" gehören dem
  Vielspieler, weil sie außer ihm niemand halten KANN. `offen` ist dabei
  keine Beschriftung: `tests/disziplinen` zählt nach, dass in jedem offenen
  Rennen jemand mit unter hundert Partien steht, dass jeder offene Rekord
  vergeben ist und dass mindestens einer nicht den drei Besten gehört.
  **Ein gleitendes Fenster meldet kein „ausgebaut"** (`fenster` im Katalog).
  Der Wert einer Laufbahn steigt, weil jemand besser gespielt hat; der Wert
  eines Fensters steigt auch dann, wenn am hinteren Ende ein schwaches
  Ergebnis herausfällt. Dieselbe Begründung wie beim Verschlechtern [§C33]:
  wer nichts getan hat, hat nichts getan. Gemessen ergaben die drei ersten
  Fenster-Rekorde 26 der 135 Karten ihrer Familie, und keine davon nannte
  eine Leistung; heute tragen alle acht Rekorde der Kammer „Aktuelle Form"
  die Marke. Und die Teilmenge muss **mitwandern**: „in den ersten 25
  Partien" ist fertig, sobald jemand 25 Partien hat, und ein Rekord darauf
  könnte den Halter nie mehr wechseln.
  **Es nennt auch den Wert seines Vorgängers nicht.** Der gilt nicht mehr:
  sein Fenster ist weitergerutscht, während der neue Halter sein eigenes
  gefüllt hat. Gemessen stand „Maxi, Julian, Jane und Johannes übernehmen
  ‚Der Höhenflug'. +10 %-Punkte … Vorher hielt Leon den Rekord mit +20 %" —
  eine Übernahme mit dem schlechteren Wert, und der Satz erklärt nicht, wieso.
  Es bleibt „Vorher gehörte der Rekord Leon"; dieselbe Begründung wie beim
  ausgebliebenen „ausgebaut". `tests/ambient` prüft jede Rekord-Karte.
  **Die Bedingung nennt jede Schwelle, die Erklärung sagt, wie gemessen wird.**
  Auf der Karte steht `cond`, im Blatt darunter `wie` — und beides war
  lückenhaft: nur 15 der 46 Rekorde hatten überhaupt eine Erklärung. „Die
  ruhige Hand" verlangte „mindestens 9 Prozentpunkte" und schwieg über die 14
  engen Partien und die 20 % der Laufbahn, die ebenso verlangt sind; wer die
  Karte las, wusste nicht, warum er nicht im Rennen steht. „Der
  Gigantentöter" nannte keinen Nenner, obwohl er gegen ALLE Partien zählt und
  nicht gegen die als Außenseiter. Und „Die Mauer" heißt so, misst aber nur,
  wie oft jemand hinten stand: ohne Erklärung liest sich der Name als
  Abwehrstärke. Die Erklärung nennt deshalb bei jedem Anteil seinen **Nenner**
  und sagt, wo eine Zahl etwas NICHT bedeutet. Geprüft wird beides maschinell:
  `tests/disziplinen` liest jede Schwelle aus dem Quelltext der Wertfunktion
  und verlangt sie im Text — als Ziffer oder ausgeschrieben.
  **Kein Halter trägt mehr als ein Viertel der Tafel.** Eine Kennzahl auf
  drei Teilmengen ist dieselbe Frage in drei Ausschnitten und sammelt sich
  beim selben Halter; Sturm und Abwehr sind dagegen ein PAAR wie „Der
  komplette Stürmer" und „Der komplette Verteidiger" — „Die Handschrift" und
  „Das Fundament" messen dieselbe Streuung auf den beiden Positionen und
  gehören gemessen zwei verschiedenen Spielern. Gedeckelt wird deshalb nicht
  die Frage, sondern der Halter: `tests/disziplinen` nennt jeden, der mehr
  als ein Viertel aller Haltungen trägt.
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
  Achterbahn"). Es darf selten sein und sogar unbesetzt
  bleiben — sonst wäre es keins; höchstens die Hälfte der Funde darf leer
  stehen. Eine Quotenschwelle darauf anzuwenden hieße, das Seltene
  abzuschaffen.
  **Ein PAAR wird zusammen gemessen** (`paar` im Katalog). „Der Rückenwind"
  und „Der Einzelkämpfer" sind die zwei Enden eines Werts: wen die Auslosung
  gerade als Mitspieler zuteilt, über oder unter dem eigenen Mittel. Das
  Vorzeichen teilt das Feld, und gemessen standen fünf über und fünf unter
  ihm — einzeln gemessen fiel jede Hälfte an der Regel „mindestens die halbe
  Liga im Rennen" durch, die gegen eine zu hohe SCHWELLE geschrieben ist. Ein
  Vorzeichen ist keine Schwelle. `paar` ist dabei keine Beschriftung:
  `tests/disziplinen` verlangt, dass der Partner zurückzeigt und dass sich
  die beiden Rennen nicht schneiden — zwei Einträge, in deren Rennen derselbe
  Spieler steht, sind keine Enden eines Werts, sondern zwei Wertungen.
  Gerechnet wird gegen das **eigene** Mittel und nicht gegen das der Liga:
  wer selbst der Beste ist, kann nie mit sich selbst spielen, sein
  Partnerfeld ist zwangsläufig das schwächste, und gemessen lag diese Fassung
  bei r = −0,66 mit der eigenen Siegquote [§C38]. Gegen das Eigene
  gerechnet bei −0,09.
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
  **Die Schandtafel ist keine Rangliste von hinten.** Elf Rekorde tragen
  `art:'schatten'` und sieben Monatschroniken `monat.art:'schatten'` — die
  Kehrseite gehört dazu, sie zählt aber nichts: `PRESTIGE_ART.schatten` ist
  null, `PRESTIGE_CHRONIK.schatten` auch, `neg` hält sie aus der Zahl im
  Profil und in der Rangliste heraus, `nextRecordFor` schlägt sie niemandem
  vor, und der Feed meldet sie gar nicht. Eine negative FÜGUNG ist davon
  ausgenommen und behält ihren Wert [§C25].
  Das eigentliche Problem ist ein anderes: wer schlechter spielt, verliert
  JEDE Quote. Eine Schande, die das Niveau misst, gehört damit immer demselben
  Spieler. Gemessen hielt der Zehnte der Siegquote fünf der dreizehn
  Haltungen, sobald die Kandidaten das reine Niveau fragten. Drei der neuen
  Einträge fragen deshalb nach dem **Abstand zum Eigenen** [§C38] statt nach
  dem Niveau, und genau dadurch haben sie ihr Tor bestanden: „Die
  Ladehemmung" ging von r = −0,35 auf +0,14, „Die stumme Antwort" von −0,40
  auf +0,06. Ein gleichmäßiger Streu wäre gelogen — eine Schande MISST, dass
  jemand schlecht war —, also ist nur der Extremfall gedeckelt: kein Halter
  über zwei Fünftel der Schandtafel, und mindestens sechs Namen tragen mit.
  **Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin** [§13.1].
  Neunzehn Disziplinen tragen beide: `spotless`, `kopfhoch`, `ausgleich`,
  `gleichauf`, `metronom`, `uebersoll`, `hochform`, `schlussball`,
  `kaltstart`, `deutlich`, `breitenwirkung`, `evenkeel`, `drought`, `abyss`,
  `hardluck`, `sieve`, `angstgegner`, `untersoll` und `misfire`. Zwei Namen
  und zwei Icons für denselben Gedanken wären eins zu viel [§C27] — deshalb
  bekommen „Kein Angstgegner", „Der Deutliche" und „Der Kaltstart" ihre
  Laufbahn-Achse an der bestehenden Monatsdisziplin und keine zweite daneben.
  „Die Steigerung" ist den umgekehrten Weg gegangen: ihre Laufbahn-Achse ist
  gefallen, die Monatschronik bleibt.
  **Die Laufbahn-Achse darf eine andere Rechnung brauchen als der Monat.**
  „Das Metronom" misst im Monat die Spanne zwischen bestem und schwächstem
  Spieltag; über eine ganze Laufbahn liegt dort fast immer die volle Spanne,
  und der Rekord wäre für jeden dasselbe. Die Laufbahn misst deshalb die
  Streuung um die eigene Quote. Dieselbe FRAGE, eine tragfähige Rechnung —
  die Erklärung im Blatt sagt, welche.
  **Und wo die eine Hälfte schon jemandem gehört, bleibt die andere weg.**
  „Der Dauerstürmer" zählt den Sturmanteil der letzten fünfzig Partien. Die
  Abwehr-Fassung derselben Frage ginge gemessen an Henry mit 98 %, und Henry
  hält „Die Mauer" schon: dieselbe Frage mit derselben Antwort sammelt sich
  beim selben Halter. Der Sturmanteil gehört dagegen dem Zehnten der
  Siegquote.
  Was auf der Monatsachse **nicht** trägt, bleibt weg: „Die stumme Antwort"
  schiebt ihre Schwelle dort gemessen höchstens 1,39 σ hinaus und wäre damit
  eine Chronik, deren Bester kaum weiter draußen liegt als der Schnitt
  [§C39]. Fünf Gelegenheiten zu antworten sind ein Wurf, fünfundzwanzig ein
  Muster — sie trägt deshalb nur die Laufbahn.
  `tests/disziplinen` misst das alles: die Verteilung, die beiden Achsen und
  dass keine Schattenseite Prestige gibt; `tests/ambient` prüft den Feed
  gegen den ganzen Katalog, damit ein neuer Eintrag nicht still durchrutscht.
- **§C37 Ein Anteil misst gegen die Menge, um die es geht.** „Pechvogel"
  zählte knappe Niederlagen gegen ALLE Partien und kürte damit den, der viele
  enge Spiele hatte, statt den, der sie verliert: wer zwanzig Partien spielt,
  davon zwei enge, und beide verliert, stand bei 10 % — hinter jemandem mit
  acht knappen Niederlagen aus vierzig Spielen, der die Hälfte seiner engen
  Partien gewonnen hat. Der Nenner ist die **Teilmenge**: enge Partien beim
  Pechvogel und beim Clutch-Player (beide aus `agg.clutch`, eine Zählung für
  zwei Kacheln [§C27]), enge Partien des Duos bei den Glückspilzen, die
  **Pleiten** des Duos beim Zirkus (derselbe Nenner wie bei „Der Widerstand"
  in der Chronik, die Frage ist seit dessen Umbau eine andere [§C35]), die Partien als Außenseiter beim
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
  **Und die Erklärung nennt, was gilt** (`AWARD_META.why`). „So wird
  gewertet" war fester Text und den Schwellen nicht gefolgt: die Betonmauer
  verlangte dort zehn gemeinsame Spiele und in der Rechnung drei, der
  Pechvogel zählte laut Text gegen alle Partien, und der Carry-King nannte
  „einen der drei schwächsten" Mitspieler, während die Rechnung den
  schwächsten der vier zählt. Die Zahl kommt jetzt aus `AW_MIN` selbst, auch
  die der Positionswertungen (`AW_MIN.position`), die als blanke 2 an vier
  Stellen stand.
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
- **Eine Schrift hat einen Rückfall.** Die Schriften kommen aus dem Netz, und
  eine App, die offline startet, hat sie nicht. Drei Angaben nannten nur
  `'Space Grotesk'`, und dort fiel der Browser auf eine Serifenschrift
  zurück: im Positions-Profil stand „Verteidiger" in Times. Jede
  `font-family` endet deshalb auf einer Familie (`sans-serif`, `monospace`,
  …); `tests/tafel` liest das an der Auslieferung nach.
- **Dieselbe Sache hat einen Namen.** Die Siegquote hieß im Profil
  „Siegrate", im Teams-Reiter „Winrate" und in der Chronik „Siegquote";
  der Partner war „Mate", die Tordifferenz „Tordiff" oder „TD", die größte
  Überraschung in den Rückblicken „Größter Upset" und in den Awards „Größte
  Überraschung", der direkte Vergleich „Head-to-Head", die
  Höhepunkte im Awards-Reiter und im Duo-Blatt „Highlights", die
  Gesamtbilanz im Profil „Gesamt-Stats", die Partie im Story-Blatt
  „Auslösendes Match". Jetzt: Siegquote,
  Partner, Torbilanz (sie passt in eine Kachel von 73 px, „Tordifferenz"
  nicht), Größte Überraschung, Direkter Vergleich. „Player of the Week/Day/
  Season" bleiben, das sind die Namen der Wertungen. Ebenso wenig steht dort
  ein Befehl in Du-Form („Tippe auf eine Linie"), ein englisches Wort
  („Tap für Details", „Letztes Update", „Rollen-Performance", „Peak",
  „Savepoint", „Backup") oder ein Kürzel („min. 5 Siege", „Min. Spiele",
  „Ø 7,5 Tore/Sp.", „257 Sp.", „10 Rek.", „39-30T · 116-72G" mit einer
  Legende darüber), und eins steht in der Einzahl („1 Niederlagen" stand
  als aktuelle Serie im Profil). `tests/blatt` liest den Text der Reiter und von
  dreiundzwanzig Blättern danach ab.
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
- **Die Oberfläche beschreibt nicht sich selbst.** Kein „Neu", kein
  „Überarbeitet", keine Begründung gegen eine frühere Rechnung, keine
  Entwicklersprache („Rohsicht", „Cache", „Projektion", „Savepoint", ein
  Paragraphenzeichen) und keine englische Aufschrift („Frischen Load",
  „Features", „checkt"). Warum eine Zeile so aussieht, gehört in einen
  Kommentar; auf dem Bildschirm steht, was die Zahl bedeutet. Der
  Rekorde-Reiter war nur die Stelle, an der es auffiel: dort trug jede der
  fünfundsechzig Karten eine Marke über die Fassung der App, und in den
  Erklärungen stand „sonst wäre eine Seite leichter zu halten als die
  andere". `tests/disziplinen` prüft jeden sichtbaren Text des Katalogs.
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
bilden die **drei sichtbaren Quellen des Prestiges** [§C34], und das Prestige
ist die Insignium-Leiter. Wer einen
Eintrag hinzufügt oder streicht, verschiebt
damit, wer welches Zeichen trägt — auch dann, wenn er die Prestige-Datei gar
nicht geöffnet hat.

Die folgenden Listen nennen jede Stelle, die mitgeht. Sie sind vollständig:
was hier nicht steht, hängt auch nicht daran.

### 10.1 Eine Auszeichnung (Badge)

Alles in `17-badges.js`, außer wo anders genannt.

| Stelle | was | wenn es fehlt |
|---|---|---|
| `BADGES[]` | Eintrag mit `id`, `ic`, `name`, `desc`, `count` | — |
| dort `name` | ein Name, den keine Stufe des Karriere-Rangs trägt (`RANKS`) | die Auszeichnung für 150 Partien hieß „Legende" wie die oberste Rangstufe, und im Profil stand dasselbe Wort für zwei Dinge. `tests/disziplinen` misst es |
| dort `desc` | ein Satz ohne Kürzel und Formelzeichen („ab 3 Partien", „höchstens 2 Tore Unterschied", „10:0-Sieg", nicht „20+ Siege") | er steht im Blatt und als Text der Karte im Feed; „Sieg mit Tordifferenz ≥ 7" und „mind. einen Gegner aus den Bottom-2" waren eine Formel. `tests/disziplinen` misst es |
| `BADGE_RARITY` | die Klasse | `rarityOf` liefert still `common`, die billigste — das Badge ist als „Legendary" gedacht und zählt wie ein Zittersieg |
| `RARITY_META.<klasse>.total` | um eins nach | der Zähler im Badge-Blatt („38 von 50") lügt |
| `BADGE_WUERDE` | **nur**, wenn jeder neue saisonweise Erfolg eine neue News-Karte auslösen soll | ohne Eintrag meldet der Feed nur die festen Meilensteine; auf Prestige hat die Liste keinen Einfluss |
| — | nichts weiter für den News-Takt | er hängt an der Klasse (`_badgeTakt`, [§C33]): legendär jedes Mal, selten an `NEWS_BADGE_MARKEN`, gewöhnlich an `NEWS_BADGE_MARKEN_KLEIN` und dort nur in der gemeinsamen Matchkarte |
| `getBadgeEarnedCache` | `fire('id')` | das Badge erscheint nur im Profil: kein Toast, kein Chip im Match-Review |
| `src/js/02-icons.js` | das Icon aus `ic` | die Kachel bleibt leer |

Die ersten fünf Zeilen der goldenen Vitrine folgen `BADGE_PROFIL_ORDER`, je
zwei Einträge pro Zeile: Dynastie/Dominator, 20er/15er Serie,
Meister/Team der Saison, Untouchable/Award-Sammler und Absoluter Sieger/
Mr. Perfect. Danach bleibt die Reihenfolge aus `BADGES[]` stabil. „Absoluter
Sieger" ist Legendary, „Allwetter" Rare; die wiederholbare 10:0-Leistung ist
damit wertvoller als das einmalige Wochentags-Sammelziel.

### 10.2 Eine Disziplin (Monatswertung, Liga-Rekord oder beides)

| Stelle | was | wenn es fehlt |
|---|---|---|
| `32-chronik-katalog.js` `DISZIPLINEN[]` | Eintrag **im richtigen Block**: Leistung, dann Ereignis, dann Schatten | ein Spieler zeigt nur EINEN Monatseintrag, und die Katalogreihenfolge entscheidet welchen [§C32] — falsch einsortiert verdrängt eine Schattenseite seinen Titel |
| dort `art` | `leistung`, `ereignis` oder `schatten` | steuert bei einem Liga-Rekord den Prestige-Wert und bei jedem Eintrag die Katalogreihenfolge; ohne gültige Angabe fällt der Eintrag auf `ereignis` und wiegt die Hälfte. Den Wert einer Monatschronik trägt dagegen `monat.art` [§C39]. `tests/disziplinen` misst es |
| dort `short` | ein ganzes Wort, das in 54 px passt | „Umschwung“ ist kürzer als „Nachzügler“ und breiter, also zählt die gerenderte Breite: `tests/blatt` misst sie am Markup, `tests/disziplinen` verbietet die Abkürzung mit Punkt |
| dort `ic` | ein Icon, das keine andere Disziplin trägt | in einer Zelle von 62 Pixeln ist die Zeichnung das Erste, was man sieht — zwei gleiche sind dort nicht zu unterscheiden. `tests/disziplinen` misst es |
| dort `monat.wie` | ein Satz, was die Zahl im Beleg bedeutet | nur nötig, wenn die Größe nicht selbsterklärend ist. Er steht im Detail-Blatt unter der Bedingung; ohne ihn liest sich „+15 Prozentpunkte" wie Elo oder wie Prestige |
| dort `monat.beiname` | der Beiname fürs Spielerprofil: **Der/Die/Das + Spielertyp** | im Profilkopf stünde der Katalogname, und „Der Endspurt“ beschreibt kein Spielertyp — „Der Ausdauernde“ schon. `tests/disziplinen` verlangt ihn für jede Chronik, höchstens 20 Zeichen, eindeutig, und prüft ihn gegen dieselbe Sprachregel wie Beleg und Bedingung |
| dort `monat.art`, `monat.klasse`, `monat.aus` | die drei festen Angaben einer Chronik [§C39] | ohne `art` gibt es kein Prestige, ohne `klasse` keinen Seltenheitsbonus und kein Gewicht in der Zelle, ohne `aus` ist die Chronik null Punkte wert. `aus` muss mindestens 1,5 σ betragen, sonst liegt der Beste kaum weiter draußen als der Schnitt — `tests/disziplinen` misst es |
| dort `monat` | `mind`, `wert`, `ab` und `ev` über `_stWertung` | ohne die vier gibt es keine Vergabe. `mind` sagt, wer gewertet wird, `wert` die Größe (größer ist besser, bei einer Schattenseite steht ein Minus davor), `ab` die Schwelle. Getrennt aufgeschrieben, weil sonst niemand sagen kann, wer knapp daneben liegt: wer die Schwelle reißt, bekam einen leeren Wert, und leere Werte haben keine Reihenfolge. `ab` wird an den echten Partien gemessen, nicht geschätzt: höchstens ein Halter je gewerteten Monat [§C32] |
| `33-chronik-engine.js` `_seasonTitleCtx` | das Feld, das `monat:` liest | die Monatstafel bleibt leer |
| `34-chronik-rekorde.js` `_chronicleCtx` | **dasselbe Feld noch einmal** | der häufigste Fehler: die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt unbesetzt. Zwei getrennte Durchläufe über dieselbe Frage — sie müssen gleich zählen |
| dort `negativ` | `true`, **nur** wenn die Fügung von einer Niederlage erzählt | sie steht im Profil golden zwischen den Titeln und wird als Rekord mitgezählt [§C25]. Eine `art:'schatten'`-Disziplin braucht das Feld nicht — sie ist ohnehin negativ |
| dort `zufall` | `'quote'` oder `'fund'`, **nur** wenn der Eintrag kein Können misst | ohne ihn steht die Fügung in der Kammer „Bestmarken" neben dem höchsten Elo-Stand der Ligageschichte. Der Wert entscheidet, welche Zusicherung in `tests/disziplinen` für ihn gilt [§C35] |
| dort `paar` | die **id** des Eintrags, der das andere Ende desselben Werts wertet, **nur** bei einer Quoten-Fügung mit Vorzeichen | ohne ihn verlangt `tests/disziplinen` für jede Hälfte einzeln, dass die halbe Liga im Rennen steht — die Regel ist gegen eine zu hohe SCHWELLE geschrieben, und ein Vorzeichen ist keine Schwelle: gemessen standen fünf über und fünf unter dem eigenen Mittel, und beide Hälften fielen durch. Die Marke ist keine Beschriftung: der Partner muss zurückzeigen, und die beiden Rennen dürfen sich nicht schneiden. `paar` muss außerdem in der Projektion `_chronRoh` stehen — `CHRONICLES` nennt nur, was sie kennt, und ein Feld, das sie nicht nennt, kommt im Test gar nicht an |
| `allzeit.kammer` | `koennen`, `form`, `mark`, `fuegung` oder `shame` [§C35] | ohne sie wird die Kammer aus `art` erraten, und die Ableitung kennt „Aktuelle Form" nicht: ein Fenster-Rekord landet im Können und steht dort neben einem Laufbahnwert. `tests/disziplinen` zählt die fünf Kammern und ihre Zahlen (25/8/9/12/11) nach |
| `allzeit.basis` | der Grundwert fürs Prestige: 150 für Können, leistungsbezogene Form und leistungsbezogene Bestmarke, 75 für Rollenwert und Fügung, 0 für eine Schattenseite [§C34] | ohne ihn fällt der Eintrag auf `PRESTIGE_REKORD × PRESTIGE_ART[art]` zurück, und dann hängt sein Wert wieder an der Katalogreihenfolge: „Der Unaufhaltsame" ist ein Ereignis und wiegt trotzdem 150. Er ist NICHT, was jemand bekommt — erst durch die Halter geteilt, dann gedämpft. `tests/disziplinen` prüft beide Schritte in dieser Reihenfolge |
| `allzeit.mind` | die Mindestbasis in Worten, so wie sie auf der Karte steht | sie stand nur im Bedingungssatz, und wer die Karte las, musste sie daraus heraussuchen. Ein Gegenpaar muss dieselbe Zahl tragen, sonst ist eine Hälfte leichter zu halten als die andere — `tests/disziplinen` vergleicht die Zahlen der vierzehn Paare |
| `allzeit.zeitraum` | über welche Strecke gerechnet wird („Ganze Laufbahn", „Die letzten 20 Partien", „Ein einzelner Spieltag") | ohne ihn steht auf der Karte nicht, ob der Wert für immer gilt oder für die letzten zwanzig Partien, und das ist der Unterschied zwischen zwei Kammern |
| `allzeit.offen` | `true`, **nur** wenn die Bedingung mit fünfzig Partien in der Laufbahn erfüllbar ist [§C35] | ohne die Marke wächst der Katalog still zum Vielspieler: 13 der 21 bestehenden Rekorde mit lesbarer Mindestzahl sind für einen 50-Spieler unerreichbar. Die Marke ist keine Beschriftung — `tests/disziplinen` verlangt, dass im Rennen jemand mit unter hundert Partien steht, dass der Rekord vergeben ist und dass er nicht nur den drei Besten gehört |
| `allzeit.fenster` | `true`, **nur** wenn der Wert auf einem gleitenden Fenster steht („die letzten 30 Partien", „zwei Fenster im Vergleich") | der Feed meldet „X baut den Rekord aus", sobald am hinteren Ende des Fensters ein schwaches Ergebnis herausfällt — und dann hat der Halter nichts getan [§C33]. Gemeldet wird bei ihm nur der Halterwechsel. `tests/ambient` misst es über jeden vierten Spieltag |
| `allzeit.cond` | **jede** Schwelle, die die Wertfunktion erzwingt, nicht nur die auffälligste | sie steht auf der Karte im Rekorde-Reiter und ist das, was der Leser als Aufgabe versteht. „Die ruhige Hand" nannte nur die 9 Prozentpunkte und schwieg über die 14 engen Partien und die 20 % der Laufbahn — wer die Karte las, wusste nicht, warum er nicht im Rennen steht. `tests/disziplinen` liest die Schwellen aus dem Quelltext der Rechnung und verlangt jede im Text. Eine Schwelle ist eine **Stichprobe** (Partien, Spieltage, Wochen, Niederlagen), nie eine Wertlatte in Prozent, Elo oder Serienlänge: der Rekord ist der beste Wert, den es gibt [§C35] |
| `allzeit.wie` | **Pflicht für jeden Rekord**: wie gemessen wird, und bei einem Anteil der Nenner | nur 15 der 46 Rekorde hatten eine Erklärung, und mehrere Namen führten in die Irre: „Die Mauer" misst nicht die Abwehrstärke, sondern nur, wie oft jemand hinten stand. Sie steht als Notiz unter der Bedingung im Rekord-Blatt. `tests/disziplinen` verlangt mindestens 40 Zeichen und verbietet eine Floskel („sozusagen", „im Grunde"), die nichts erklärt |
| `allzeit.ev` | beginnt mit dem Wert, **nach dem sortiert wird** — die Anzahl steht dahinter | Podest und Verfolgerliste zeigen die erste Zahl des Belegs. Beginnt er mit der Anzahl, steht dort „34" über „10", obwohl der mit 10 den höheren Anteil hält. `tests/disziplinen` rechnet die erste Zahl gegen den Sortierwert zurück und lässt nur eine Umrechnung davon gelten |
| `src/js/02-icons.js` | das Icon aus `ic` | die Zeile bleibt ohne Zeichen |

Ein Eintrag darf **nur `allzeit`** haben, wenn ein Monat zu kurz ist, um die
Größe zu messen — so wie der Positionswert, der Erfahrung mitwiegt: über vier
Wochen entschiede die Spielzahl statt der Leistung. Dann entfällt der Eintrag
in `_seasonTitleCtx`, sonst nichts.

**Misst ein Eintrag etwas, das eine Ansicht schon zeigt, rechnet er es nicht
nach.** Der Positionswert steht an EINER Stelle: `posLeistung` ist der
gemeinsame Kern aus Siegquote, Erwartungsabstand und Rollenbeitrag, und
`posWert` multipliziert ihn für die Rangliste mit dem Erfahrungsfaktor
[§5.2]. Der Liga-Rekord ruft `posLeistung` direkt — nach der Mindestbasis
darf die Spielzahl den Wert nicht mehr heben, sonst hielte ihn wieder der
Vielspieler. Eine zweite Formel daneben wäre genau der Fehler, den dieser
Absatz verbietet. Das
Sturm-/Abwehrprofil steht ebenso nur in `positionsProfilWert`; Profil und
„Der Wandler" rufen dieselbe Funktion auf. Zwei
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

1. **Die Seltenheitsklasse bestimmt die Standardregel.**
   `PRESTIGE_AUSZEICHNUNG` gibt Startwert und Abnahme für Rare und Common
   vor [§C34]. Jede legendäre Auszeichnung und dazu POTW und POTD stehen
   mit eigenem Startwert in `PRESTIGE_AUSZEICHNUNG_SPEZIAL` — eine neue
   legendäre wird dort nach ihrem Gewicht eingeordnet, das Regelblatt
   zeigt sie dann von selbst an der richtigen Stelle. Eine falsch gewählte
   Klasse verändert weiterhin Optik und Punktfolge.
2. **Jede positive Auszeichnung wächst bei jedem Erreichen.** Die harmonische
   Folge hat weder Mindestwert noch harte Obergrenze; es gibt kein
   nachträgliches Quellenlimit. `tests/disziplinen` prüft die Dominator-,
   Meister-, Team-, POTW-, POTD- und Carry-Folgen sowie das Wachstum aller
   fünfzig Katalogeinträge.
3. **Die Schwellen in `INSIGNIEN` werden an der echten Liga kalibriert**
   [§C30]. Keine Spanne ist kürzer als 500 und keine kürzer als die vorige:
   Leon soll Zierkranz III tragen, Martin und Julian dicht dabei im
   Zierkranz, und der erste Ordensstern bei **5.600 Prestige** soll
   langfristig erreichbar sein; danach kommt alle 500 eine Zacke dazu.
   Wer Startwerte anhebt, zieht die Schwellen mit — sonst steigt die Liga
   über Nacht, ohne gespielt zu haben.

Nichts davon wird geschätzt. `tests/disziplinen` misst es an den echten
Partien und fällt, wenn es kippt:

| Zusicherung | fällt, wenn |
|---|---|
| jede Prestigequelle gehört zu genau einem der drei sichtbaren Blöcke | wieder ein versteckter vierter Wert einfließt |
| Auszeichnungen wiegen schwerer als Rekorde | der Reif zur Rekordanzeige wird |
| mehr als die halbe Liga hält einen wertenden Rekord | die Einstiegshürden zu hoch sind |
| mehr als die halbe Liga trägt mindestens den Schildring | die erste Sprosse zu hoch hängt |
| der Beste trägt noch keinen Lorbeerreif | der Katalog die Spitze nach oben schiebt |
| der Ordensstern ist von niemandem erreicht | dasselbe, eine Stufe höher |
| nur Kronenreif und Ordensstern sind die obersten Stufen | die Breaking-Grenze beim Einfügen einer Stufe verrutscht [§C33] |
| Glut und Hof in der Rangfarbe werden mit der Leiter nicht schwächer, die Lichter tragen die Rangfarbe | der Schimmer nicht mehr sagt, wer weiter oben steht [§C30] |
| keine Spanne ist kürzer als 500, der Ordensstern steigt alle 500 | eine Stufe fast geschenkt ist oder die Zacken aus dem Takt geraten |
| Leon und Martin tragen den Zierkranz, Leon in Grad III, Julian steht dicht dabei | Schwellen und Grade die heutige Liga falsch abbilden. Gemessen wird der ABSTAND der drei und nicht ihre Reihenfolge: die war festgeschrieben, und damit fiel die Zusicherung bei jedem Rekord, der Punkte verschiebt — kalibriert ist die Leiter und nicht die Tabelle |
| das Langzeitmodell kann den Ordensstern erreichen | ein weicher Deckel zur harten Obergrenze wird |
| jede positive Dauerquelle behält einen positiven Zuwachs | spätere Ordensstern-Zacken mathematisch unerreichbar werden |
| auch die zwanzigste weitere Ordensstern-Zacke wird endlich überschritten | die Laufbahn nur scheinbar ohne Ende weiterläuft |
| wenige sehr starke Partien schlagen viele durchschnittliche | Anwesenheit wieder als Können zählt |
| Prestige aus Auszeichnungen und Monaten fällt nie | ein Wert wieder am heutigen Zensus hängt [§C34] |
| je Spieler und Monat zählt genau eine Chronik, und zwar die des Profils | die Laufbahn einen Monat mehrfach zählt oder eine andere Wertung als die Matrix [§C32] |
| ein verlorener Rekord zählt nicht mehr, ein geteilter nur geteilt | ein Bestwert weiterzählt, den heute jemand anders hält |
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
| Ein Katalogfeld kommt dazu (`beiname`, `zufall`, `offen`, `fenster`, `paar`, …) | §10.1/§10.2 als eigene Zeile, **und** eine Zusicherung in `tests/disziplinen`, die es für jeden Eintrag verlangt — **und** die Projektion `_chronRoh` in `34-chronik-rekorde.js`, sonst kommt das Feld nie an |
| Ein Liga-Rekord kommt dazu oder fällt weg | §6 §C35 (Zahl der Rekorde und Haltungen), §10.2, §10.3 — und das Prestige verschiebt sich [§C34] |
| Eine Anweisung hier hat sich als falsch erwiesen | die Stelle selbst |

### Was zu einer Änderung immer dazugehört

Eine Änderung ist erst fertig, wenn sie an **allen vier** Stellen steht.
Fehlt eine, wird die Änderung beim nächsten Mal falsch fortgesetzt — und das
ist jedes Mal passiert, an dem in dieser Datei ein „vorher war es so" steht.

1. **Im Code**, als Kommentar, der den Fehler benennt, den er verhindert.
   Nicht was die Zeile tut, sondern warum sie so aussieht (§7).
2. **In dieser Datei**, an der Stelle, die die Regel trägt: das
   Gestaltungsgesetz in §6, die Pflichtliste in §10, die Zahl in §2 oder §5.
   Neue Felder eines Katalogeintrags brauchen eine **eigene Zeile** in
   §10.1 oder §10.2 — sonst weiß niemand, dass sie zu füllen sind.
3. **In einer Zusicherung**, die die Regel prüfbar macht, und zwar so, dass
   sie einmal rot war (§5). Eine Regel ohne Test ist eine Bitte.
4. **Im Commit**, mit dem, was vorher falsch war (§7).

Was das im Einzelnen auslöst, steht in der Tabelle oben.

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
