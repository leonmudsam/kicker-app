# Entwürfe (mockup/)

Eigenständige Seiten ohne Bauablauf, Vorlage für einen Umbau — kein Teil der
App. Wer einen Entwurf einbaut, trägt hier ein, was davon eingebaut ist und
was die Seite noch belegt; ein Entwurf, der niemandem mehr etwas sagt, wird
gelöscht.

Die Werkzeuge, die die App laden (`bau.js`, `*-lauf.js`, das Story-Labor),
rechnen mit dem Code der ausgelieferten `index.html` und nicht mit einer
eigenen Kopie: so entsteht kein zweiter Generator.

## Vorschläge, an den echten Partien gemessen

| Eintrag | Inhalt | Stand |
|---|---|---|
| `README-story-simulation.md`, `story-simulation*` | Hundert erfundene Partien, gerechnet und erzählt mit dem Code der App | Herleitung |
| `README-story-logik.md`, `story-logik*` | Welche Daten, in welcher Reihenfolge, nach welchem Prinzip und wie oft eine Karte entsteht | Herleitung |
| `README-rekord-vorschlag.md`, `rekord-vorschlag*` | Neue Liga-Rekorde in zwei Kammern (offen und Anspruch): 278 gesuchte Kombinationen gegen neun Tore und sieben Wächter | zehn eingebaut [§C35] |
| `README-probe-liga.md`, `probe-*` | Eine erfundene Liga aus 571 Partien mit Schaufenster, Tag für Tag nachgespielt: welche Karte entsteht, welche verloren geht und warum | Herleitung |
| `schande-lauf.js` → `schande.html` | Schandrekorde und -chroniken: dreizehn Kandidaten gegen sechs Tore, darunter: die Schande darf sich nicht beim Schwächsten sammeln | Herleitung [§C35] |
| `README-abweichung.md`, `abweichung*` | Einträge aus der Abweichung statt dem Niveau (zehn Kandidaten, vier tragen) und Rekorde auf gleitendem Fenster (vierzehn Kandidaten, sechs tragen) | Herleitung |
| `README-staerken.md`, `staerken*` | Rekorde als Errungenschaft je Gelegenheit wie „Der Platzhirsch“, dazu „Das Übersoll“ | fünf und drei Fenster-Rekorde eingebaut |
| `besonderheiten/` | Fünfzehn Rekorde und vierundzwanzig Monatsideen aus Besonderheiten | fünf Rekorde und vier Chroniken eingebaut [§C35, §C38]; die Seite nennt den Grund für jeden übrigen |

## Werkzeuge

| Eintrag | Inhalt |
|---|---|
| `story-labor.html` | Partien eintragen und sehen, welche Stories daraus werden. Lädt die ausgelieferte `index.html` in einen abgeriegelten Rahmen: Supabase-Attrappe, kein CDN-Script, kein `fetch`, ein eigener Speicher-Topf — App und Labor liegen auf derselben Adresse, und sonst überschriebe das Labor den Lesestand des Feeds |

## Gestaltungsentwürfe

| Eintrag | Inhalt | Stand |
|---|---|---|
| `aufwertung.html` | Befunde, Zeichenraster, Reiter, Kacheln, Belege, Stories samt Faden, Blätter, Reihenfolge der Umsetzung | umgesetzt [§C27] |
| `aufwertung-2.html` | Insignium-Leiter als sieben Gegenstände (Medaille auf Kranz), Bewegung, neue Ansichten | eingebaut ist die Leiter in der Machart von `35b-prestige.js`; vom Entwurf kommt der Schimmer [§C30] |
| `insignium.html`, `insignium-vorlage.webp` | Die Leiter mit denselben 21 Zeichnungen wie die App, Glut, Hof, Glanz, Raute; die gemalte Vorlage der Zeichnungen | Vorlage [§C30] |
| `rang-insignien-app-assets/` | Dieselben Stufen als SVG-Satz | nicht eingebaut |
| `lorbeer.html` | Der Lorbeerreif mit aufsteigenden belaubten Linien neben der Fassung davor | eingebaut [§C30] |
| `titel-aura/` | Titel-Aura in drei Lichtformen zu je zehn Stufen | die Korona ist eingebaut [§C36] |
| `schwingen-konzept.png`, `schwingen-neu.html`, `varianten.html` | Die frühere Schwinge der Meistertitel und Varianten | ersetzt durch die Aura [§C36] |
| `chronik-ideen*.html`, `rekord-ideen.html` | Frühe Ideensammlungen für Chronik und Rekorde | Herleitung |
| `aufwertung-3/` | Zehn Reiter und Blätter heute und als Entwurf, in der App gebaut und fotografiert (`bau.js`) | Rollen-Landkarte und Netz als Einblick, Siegchance, jede Begegnung, Woche und Feld eingebaut; das Titelrennen trägt der Positionsverlauf |
| `aufwertung-4/` | Die Karten „Am Spieltag“, Kopf nach Anlass, und die Runde der Vier; jedes Bauteil trennt Rechnen und Zeichnen und wird mit Grenzwerten gemessen | eingebaut in `30b-news-spieltag.js` [§C33] |
| `aufwertung-5/` | Vierzehn Köpfe für die gewöhnliche Partie mit Regel und Gewicht, eine Regel für Abwechslung, drei Formen für mehrere Anlässe, dreizehn Blätter aus Bühne, Kernsatz und Abschnitten — als lebendiges Markup | eingebaut [§C33] |
| `aufwertung-6/` | Sieben leise Effekte (Licht an Platz 1–3, Kopfzahlen, Kacheln, Reiter, Blatt, Profilkopf, Druck) und ein Zeichensatz, in dem kein Zeichen zwei Dinge bedeutet — die App heute und im Entwurf nebeneinander und bedienbar (`app.html`, `app.html#neu`), gebaut von `bau.js` aus `entwurf.css`, `entwurf-app.js` und `zeichen.js` | Effekte eingebaut außer dem Hochzählen, das jedes Bild den Hauptthread verlangt [§C27]; der Zeichensatz noch nicht |
