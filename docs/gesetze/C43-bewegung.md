# §C43 Bewegung: nie warten, von selbst enden, nur, was man sieht

## Regel

- **Das Startbild steht im ersten Bild.** Es ist festes Markup ganz oben in `src/index.html` (`#startBild`), kein Skript baut es; sein Zeichen ist dasselbe kleine Bild wie in der Kopfleiste (252 px WebP in der Seite, `01-shell.css`), ohne eigene Anfrage und ohne Einblenden. Bleibt das Skript aus, geht es nach acht Sekunden von selbst.
- **Es wartet auf nichts.** Ist die Liga gezeichnet (`_bewegungNachRender` beim ersten Bild), fliegt das Zeichen an seinen Platz in der Kopfleiste und wird dort mit dem Kantenlicht empfangen. Hat das Gerät keinen Stand [§C42], geht es ins Gerüst der Liga über (`_startbildGeruest`), das ausblendet, sobald sie kommt; kommt nach 2,5 s kein Bild, ebenso.
- **Zurückkommen ist kein Öffnen.** Liegt der letzte Gang in den Hintergrund weniger als fünf Minuten zurück (`kicker_zuletzt_v1`), blendet das Startbild nur über — kein Flug, kein Licht.
- **Das Kantenlicht hat drei Bedeutungen und keine vierte** (`kantenlicht`, `.kl`) [§C41]: *zeichnen* — einmal herum, dann steht der Rahmen einige Sekunden: eine Karte, die zählt, ist angekommen; *hinweis* — zweimal herum, ohne Rahmen: hier ist etwas neu; *kreis* — ohne Ende, solange es lädt. Zeichnen und Hinweis enden von selbst (4,6 und 4,2 s): das Licht läuft nach der Runde langsamer weiter, ein Schein liegt um die Karte, dann verlischt beides; danach ist nichts davon im Dokument.
- **Nur Drehung und Deckkraft.** Bewegt werden `transform` und `opacity`; der Kegel des Lichts ist so groß wie die Diagonale seiner Karte (`d`), nicht größer.
- **Bei Bewegungsruhe** (`prefers-reduced-motion`) geht das Startbild mit dem ersten Bild, und es gibt kein Licht.

## Stellen

`src/index.html` (Startbild), `09d-bewegung.js` (`_startbildBereit`, `_startbildEnde`, `_startbildGeruest`, `kantenlicht`, `_bewegungNachRender`), `09-ui-infra.js` (`render` ruft `_bewegungNachRender`), `06c-stand.js` (kein Stand → Gerüst), `37-boot.js` (`_startbildBereit`), `00-prolog.js` (ohne Zugangsdaten geht das Startbild), `01-shell.css` (das Zeichen), `17-bewegung.css`.

## Prüfung

`tests/start` (das Startbild steht mit seinem Zeichen, bevor ein Skript der App läuft; ohne Stand steht das Gerüst, bis die Datenbank antwortet, und ist danach fort; mit Stand fliegt das Zeichen in die Kopfleiste und wird mit Licht empfangen; das Licht ist nach seiner Zeit fort; eine Minute nach dem letzten Öffnen nur Überblenden; bei Bewegungsruhe ohne Flug und Licht; der Start lädt das große Symbol nicht).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Beim Öffnen war bis zum ersten Skriptbefehl nur der dunkle Grund zu sehen:
`#app` ist bis dahin versteckt, und auf einem Mittelklasse-Telefon dauert das
Übersetzen des Skripts rund eine halbe Sekunde. Danach stand die Liga mit
einem Schlag da. Gemessen (Chromium, CPU vierfach gedrosselt) malt die Seite
ihr erstes Bild bei 160 bis 290 ms, der erste Skriptbefehl läuft bei 400 bis
550 ms: festes Markup steht also, bevor das Skript übersetzt ist — ein
Startbild aus dem Skript käme erst, wenn es schon gehen sollte.

Im ersten Entwurf (`mockup/start/`) kam das Zeichen trotzdem spät: es war
`icon.png` mit 1254 px und 1,2 MB — eine eigene Anfrage und eine volle
Dekodierung für ein Bild von 38 px —, und es blendete noch eine halbe Sekunde
ein. Jetzt steht ein Bild von 7 kB in der Seite selbst, das Kopfleiste und
Startbild teilen, und das Startbild steht mit dem ersten Bild ganz da.

Das Startbild wartet nie auf sich selbst: die Liga ist im selben Augenblick
bedienbar wie vorher, der Flug läuft darüber. Ohne Stand auf dem Gerät gäbe
es nichts, wohin das Zeichen fliegen könnte; ein Startbild, das auf das Netz
wartet, wäre ein Ladebildschirm. Das Gerüst zeigt stattdessen die Form der
Liga in denselben Maßen, damit beim Tausch nichts springt.

Wer die App dreimal am Abend öffnet, will nicht dreimal die Vorführung. Ein
Zurückkommen wird am Zeitpunkt erkannt, zu dem die App zuletzt in den
Hintergrund ging — die einzige Spur, die ein Telefon zwischen zwei Starts
zuverlässig hinterlässt.

Das Kantenlicht war zuerst nur im Profilkopf, ein Licht, das seine Kante
abfährt, solange der Monat läuft. Als Bauteil [§C27] trägt es überall
dieselben drei Bedeutungen; eine vierte machte jede unklar. Nach gut einer
Sekunde war es im Entwurf vorbei, bevor man die Karte angesehen hatte — es
bleibt deshalb einige Sekunden stehen und blendet dann langsam aus. Ein
Kegel so groß wie im Profilkopf (1400 px) kostete bei dreifacher Pixeldichte
ein Vielfaches an Speicher; er ist so groß wie die Diagonale seiner Karte.
