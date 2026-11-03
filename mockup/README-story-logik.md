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
node mockup/kopf-fuss-anlaesse.js    # spielt den Generator nach, je Partie Meldungen, Formen, Köpfe und Füße der App → .kopf-fuss-anlaesse.json (nicht eingecheckt)
node mockup/kopf-fuss-lauf.js        # baut jede Karte nach dem Katalog (kopf-fuss-katalog.js) → .kopf-fuss.json (nicht eingecheckt)
node mockup/kopf-fuss-seite.js       # baut kopf-fuss.html
node mockup/kopf-fuss-pruef.js       # misst jeden Kopf und Fuß an jeder Partie, baut kopf-fuss.html mit dem Ergebnis
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

`kopf-fuss.html` zeigt die Karte einer Partie, wie sie nach einem Katalog
aussähe. `kopf-fuss-katalog.js` nennt jeden Anlass und jeden Kopf genau
einmal — Name, Quelle (Meldung der App, Form der App, aus der Partie, neu),
Thema, Gewicht, Zeichnung, Bedingung — und beschreibt die Regel in fünf
Schritten: sammeln, gewichten, Hauptanlass als Schlagzeile, Fuß, höchstens
drei Zeilen (ein neues Thema zuerst) und „+ X weitere“; eine Nebensache
(Gewicht unter 30) steht nur im Blatt. Jeder Anlass steht damit höchstens
einmal auf der Karte. Der Kopf ist davon getrennt und zeigt nur, wie die
Partie ausging, die Sieger immer links und in der Zeile darunter
„schlagen“: ein besonderer Ausgang mit festem Bild, sonst die Grundansicht,
die am längsten nicht dran war.

`kopf-fuss-anlaesse.js` spielt den Generator der App Tag für Tag nach wie
`story-logik-lauf.js` und liest am Abend jeder Partie, was die App über sie
sagt und zeichnet: ihre Meldungen, ihre Formen, jeden Kopf und jeden Fuß, der
zutrifft (gezeichnet mit `_spScoreBild` und `_spOccasionBild`, die Wappen als
einfache Gesichter). Jede Partie ist dafür so gedreht, dass die Sieger Seite
A sind; Elo, Meldungen und Sätze hängen nicht an der Seite, und die Köpfe der
App zeichnen so die Sieger links. `kopf-fuss-lauf.js` zählt den Stand vor und
nach jeder Partie für die neuen Fakten (`neueFakten`) und baut jede Karte nach
dem Katalog (`sammeln`, `karteBauen`, `kopfWahl`). `kopf-fuss-seite.js`
zeichnet die Seite: den Aufbau an einer Karte, jeden Kopf und jeden Fuß als
Galerie, einen Spieltag am Stück, die Regel mit ihren Fällen, den Katalog
mit Häufigkeiten, die Verteilung; eigene Zeichnungen nur für die Köpfe und
Füße, die die App nicht kennt (`KOPF_BILD`, `FUSS_BILD`); dazu zeichnet der Entwurf Tabelle, Medaille und runde Zahlen selbst, mit
den Daten der App (`daten` aus dem Nachlauf): die Tabelle als Kette statt
neun Zeilen, die Medaille mit allen, die sie in der Partie holten, die Marken
für jeden, der eine erreicht. Bewegung nur über
Verschiebung und Deckkraft, jede endet von selbst und läuft erst, wenn die
Karte ins Bild kommt [§C43]. `kopf-fuss-pruef.js` zeichnet jeden Kopf und
jeden Anlass mit Zeichnung an jeder Partie, an der er zutrifft, und misst sie
in Chromium; die Zeichnungen der App nur auf Rand und Abschneiden, ihr
Inneres misst die App selbst (`tests/blatt`).

Ergänzen: ein neuer Anlass ist eine Zeile in `ANLASS` mit Thema und Gewicht; ist er neu, kommen
seine Bedingung in `neueFakten` und seine Zeichnung in `FUSS_BILD` dazu. Ein
neuer Kopf ist eine Zeile in `KOPF`, und ist er neu, ein Eintrag in
`KOPF_BILD`.

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
