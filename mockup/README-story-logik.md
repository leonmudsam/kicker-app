# Die Stories der Liga

Eine Seite, die alles über die Stories des Feeds an einer Stelle zeigt:
jede **Kartenform** mit echten Beispielen und ihrem Blatt, jeden **Anlass**
des Generators mit seiner Regel, die **Uhr** eines Tages (was wann steht),
**Breaking**, die **Seiten** des Feeds und wie Stories **zusammenfinden**.

```
node tools/build.mjs                 # die Seite liest dist/index.html
node mockup/story-logik-lauf.js      # spielt die Partien nach → .story-logik.json (nicht eingecheckt)
node mockup/story-neu-lauf.js        # misst die Entwürfe neuer Stories → .story-neu.json (nicht eingecheckt)
node mockup/story-logik-seite.js     # baut story-logik.html, mit „Neue Stories" (story-neu-seite.js)
```

Beide Läufe rechnen mit der Uhr der Liga (`Europe/Berlin`): Tage, Wochen
und Uhrzeiten wie auf den Telefonen. In der Zeitzone eines Servers standen
alle Partien zwei Stunden früher.

Der Lauf spielt die 616 echten Partien aus `tests/fixtures/oktober.txt`
Kalendertag für Kalendertag nach: an jedem Abend läuft der echte Generator,
seine Karten werden gespeichert wie in der Datenbank (eine Zeile je ID, die
erste gewinnt, nie geändert), und danach wird gelesen, was der Feed an
diesem Abend daraus zeigt. Die Saisontabelle trägt an jedem Tag nur die
Monate, die bis dahin zu sind, wie in der App.

Gezeichnet wird mit den Funktionen der App selbst — `_newsCardHtmlM2` für
die Karte, `openNewsDetail` für das Blatt —, gelesen über `tests/runtime.js`
aus derselben `dist/index.html`, die die Suiten prüfen. Es gibt keine
nachgebaute Zeichnung und keine nachgebaute Regel. Ausgewählt werden die
Beispiele nach Abdeckung: jede Kopf- und Fußzeichnung einer Partie, jeder
Anlass in einem Bündel, jede Grafik eines Fun Facts mindestens einmal.
Marken werden an jedem Abend gezählt, an dem eine Karte im Feed steht: der
härteste Tag hängt sich erst beim nächsten Lauf an den Spieler des Tages.

Ein Karriereende kommt in den Partien nicht vor; der Lauf stellt eins
(Anton, 20.10., 18:00), und die Seite sagt das.

Die Wappen tragen ihre Insignium-Zeichnung inline, roh 27 MB. Die Seite
hält jede Zeichnung einmal in einem Wörterbuch (die Kennungen ihrer Verläufe
auf einen Platzhalter gebracht, beim Einsetzen je Einsatz neu vergeben) und
alles gzip-gepackt; sie entpackt im Browser (`DecompressionStream`) und
zeichnet eine Form erst, wenn sie ins Bild kommt.

## Neue Stories

Der Teil „Neue Stories" zeigt Entwürfe für Anlässe und Grafiken, die es in
der App noch nicht gibt: den Elo-Fluss eines Tages, die kippende direkte
Bilanz, die Jagd auf den Serien-Rekord, Siege gegen die Erwartung, die
Woche in Plätzen, das Zusammenrücken der Spitze, Marken in Reichweite, die
Uhr der Liga und die Halbzeit gegen den Vormonat. `story-neu-lauf.js`
rechnet jeden über alle Partien mit den Zahlen der App (Elo vor und nach
jeder Partie, Siegchance, belastbare Tabelle, Leiter der Meilensteine) und
hält fest, wie oft er ausgelöst hätte; `story-neu-seite.js` zeichnet die
Karten im Rahmen des Feeds und nennt je Entwurf, was er neu zeigt, wann er
käme, wo er stünde, ob er Breaking wäre und wie er das Karriereende
behandelt. Die Schwellen sind an diesen Zählungen gewählt.

## Köpfe und Füße

Der Katalog der Partie-Karte ist eingebaut: wie Kopf, Schlagzeile, Zeilen
und Fuß gewählt werden, steht in §C33 (`docs/gesetze/C33-feed.md`) und im
Code (`30b-news-spieltag.js`); die Karten der Übersicht zeigen ihn mit den
Zeichnungen der App. Der Entwurf mit eigener Kopie der Wahl ist entfernt,
damit es die Regel nur einmal gibt.

Die **Texte** stehen in `story-logik-seite.js`, gelesen aus
`src/js/26-news-konstanten.js`, `27-news-generator.js`, `28-news-ambient.js`,
`29-news-cache.js`, `30-news-ui.js`, `30a-news-karte.js`, `30e-news-ehrung.js`
und `docs/gesetze/C33-feed.md`; die **Zahlen** (Rang, Grenzen, Abmeldungen,
gemessene Uhrzeiten und Häufigkeiten) kommen zur Laufzeit aus dem Code und
dem Lauf. Was auf der Seite steht und im Code nicht, ist ein Fehler der
Seite.

Kein Teil des Bauablaufs: `tools/check.mjs` und `tests/run.mjs` sehen den
Ordner nicht. Wer das Story-System ändert, baut die Seite neu — sonst zeigt
sie den Stand von vorhin.
