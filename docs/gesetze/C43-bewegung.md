# §C43 Bewegung: nie warten, von selbst enden, nur, was man sieht

## Regel

- **Die Oberfläche steht im ersten Bild.** Kopfleiste und Zeichen sind festes Markup in `src/index.html` und nicht bis zum ersten Skriptbefehl versteckt; das Zeichen ist ein Bild von 252 px in der Seite (`01-shell.css`), ohne eigene Anfrage. Kein Bild steht davor.
- **Bei jedem Öffnen baut sich die Liga auf** — dem ersten Bild, das der Start zeichnet, während `loadAll` läuft (`_bewegungNachRender`), nicht einem `render` von anderswo: die untere Leiste steigt herauf, der Inhalt kommt in Teilen (`.bau`, höchstens vierzehn, die Verzögerung am Teil selbst), Licht fährt um das Zeichen, um Platz 1 bis 3 und um „Match eintragen". Eine Sperre nach kurzer Pause gibt es nicht.
- **Ohne Stand auf dem Gerät** [§C42] steht bis zur Antwort der Datenbank das Gerüst der Liga (`_startGeruest`), das danach über ihr ausblendet; kommt nach 2,5 s kein Bild, ebenso.
- **Ein Reiter, über die Leiste betreten** (`_reiterBetreten`), baut sich auf: Überschrift, Wähler und Suche stehen sofort, Karten und Zeilen kommen nacheinander. Ein Zeitraum oder neue Daten im selben Reiter bauen nichts auf.
- **Das Podest glänzt einmal je Reiter und Sitzung** (`_podestLicht`, `_podestDa`): Licht im Metall um Platz 1 bis 3 [§C25] in Liga, Positionen und bei den Duos, um das Podest der Awards, um die letzte Partie im Verlauf; über Gold zieht das Band (`.glanz-bahn.glanz-einmal`).
- **Das Kantenlicht hat zwei Bedeutungen und keine dritte** (`kantenlicht`, `.kl`) [§C41]: *zeichnen* — einmal herum, dann steht der Rahmen einige Sekunden: eine Karte, die zählt, ist angekommen; *hinweis* — zweimal herum, ohne Rahmen: hier ist etwas neu. Beide enden von selbst (4,6 und 4,2 s): das Licht läuft nach der Runde langsamer weiter, ein Schein liegt um die Karte, dann verlischt beides, und nichts davon bleibt im Dokument. Das Licht im Profilkopf ist dieselbe Zeichnung mit eigener Bedeutung: es läuft, solange der Monat läuft.
- **Neue Daten nehmen das Licht nicht mit:** zeichnet die App denselben Reiter neu, wechselt es an dieselbe Stelle der neuen Ansicht und läuft weiter (`_lichtMerken`, `_lichtZurueck`).
- **Abbrechbar:** jede Berührung, jedes Scrollen beendet den Aufbau (`_vorfuehrungEnde`); alles steht sofort, wo es hingehört. Das Licht läuft zu Ende — es verdeckt nichts.
- **Nur Drehung, Verschiebung und Deckkraft** (`transform`, `opacity`); der Kegel des Lichts ist so groß wie die Diagonale seiner Karte, nicht größer.
- **Bei Bewegungsruhe** (`prefers-reduced-motion`) steht alles sofort, ohne Licht.

## Stellen

`src/index.html` (Oberfläche im ersten Bild), `09d-bewegung.js` (`_startBereit`, `_startGeruest`, `kantenlicht`, `_aufbauen`, `_podestLicht`, `_glanzEinmal`, `_lichtMerken`, `_lichtZurueck`, `_bewegungNachRender`, `_vorfuehrungEnde`), `09-ui-infra.js` (`render`, `_renderNachEingabe`), `06c-stand.js` (kein Stand → Gerüst), `37-boot.js` (`_startBereit`), `00-prolog.js`, `01-shell.css` (das Zeichen), `17-bewegung.css`.

## Prüfung

`tests/start` (die Kopfleiste steht mit dem Zeichen, bevor ein Skript läuft, ohne Bild davor; ohne Stand das Gerüst, bis die Datenbank antwortet; beim Öffnen baut sich die Liga auf, mit Licht im Metall um Platz 1 bis 3, um das Zeichen und den Knopf; auch direkt nach dem Schließen wieder; nach seiner Zeit nichts übrig, auch kein leeres style-Attribut; bei Bewegungsruhe nichts davon; der Start lädt das große Symbol nicht), `tests/blatt` (ein über die Leiste betretener Reiter baut sich auf, mit Licht im Metall; nur transform und opacity; neue Daten nehmen das Licht nicht mit; nach seiner Zeit nichts übrig, einmal je Reiter und Sitzung).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Beim Öffnen war bis zum ersten Skriptbefehl nur der dunkle Grund zu sehen:
`#app` war bis dahin versteckt, und auf einem Mittelklasse-Telefon dauert das
Übersetzen des Skripts rund eine halbe Sekunde. Danach stand die Liga mit
einem Schlag da. Gemessen (Chromium, CPU vierfach gedrosselt) malt die Seite
ihr erstes Bild bei 160 bis 290 ms, der erste Skriptbefehl läuft bei 400 bis
550 ms: was festes Markup ist, steht also, bevor das Skript übersetzt ist.

Der Entwurf (`mockup/start/`) überbrückte diese Zeit mit einem Startbild —
dem Zeichen der Liga in der Mitte, das danach in die Kopfleiste flog. Im
Einbau stand es zwischen dem Öffnen und der Liga; gewünscht war, dass die
Oberfläche sofort da ist. Es ist entfernt, und die Kopfleiste selbst steht
im ersten Bild. Ihr Zeichen war `icon.png` mit 1254 px und 1,2 MB — eine
eigene Anfrage und eine volle Dekodierung für ein Bild von 38 px — und kam
sichtbar später als alles andere; jetzt steht ein Bild von 7 kB in der Seite.

Eine Sperre zeigte nach einem Öffnen in den letzten fünf Minuten keine
Vorführung. Wer die App schloss und gleich wieder öffnete, sah nichts und
hielt die Effekte für kaputt. Sie läuft jetzt bei jedem Öffnen; das Podest
glänzt einmal je Reiter und Sitzung, sonst sähe man es bei jedem Wechsel.

Die Vorführung gehört echten Anlässen: dem ersten Bild eines Starts und dem
Betreten eines Reiters über die Leiste. Ein `render` von anderswo — ein
Zeitraum, neue Daten, die Prüfumgebungen der Tests, die die Ansicht direkt
zeichnen — baut nichts auf. Das Verblassen der ganzen Liste bei jedem
Filter wirkte schon einmal wie ein Neustart (01-shell.css).

Das Kantenlicht war zuerst nur im Profilkopf. Als Bauteil [§C27] trägt es
überall dieselben Bedeutungen; eine weitere machte jede unklar. Nach gut einer
Sekunde war es im Entwurf vorbei, bevor man die Karte angesehen hatte — es
steht deshalb einige Sekunden und blendet dann langsam aus. Kam in dieser
Zeit die Antwort der Datenbank, zeichnete die App die Liste neu, und das
Licht verschwand mitten im Leuchten mit den alten Zeilen; es wechselt jetzt
an dieselbe Stelle der neuen Liste. Ein Kegel so groß wie im Profilkopf
(1400 px) kostete bei dreifacher Pixeldichte ein Vielfaches an Speicher.

Gemessen wird beim Aufbau nichts: welche Teile im Bild stehen, sagt die
Reihenfolge. Eine vererbte Variable als Verzögerung ließ im Entwurf jeden
Knoten darunter seinen Stil neu rechnen, und ein Messen des Layouts im
ersten Bild kostete gemessen bis zu 1,3 s Hauptthread.
