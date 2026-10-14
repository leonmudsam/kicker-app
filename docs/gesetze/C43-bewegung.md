# §C43 Bewegung: nie warten, von selbst enden, nur, was man sieht

## Regel

- **Die Oberfläche steht im ersten Bild.** Kopfleiste und Zeichen sind festes Markup in `src/index.html` und nicht bis zum ersten Skriptbefehl versteckt; das Zeichen ist ein Bild von 252 px in der Seite (`01-shell.css`), ohne eigene Anfrage. Kein Bild steht davor.
- **Bei jedem Öffnen baut sich die Liga auf** — dem ersten Bild, das der Start zeichnet, während `loadAll` läuft (`_bewegungNachRender`), nicht einem `render` von anderswo: die untere Leiste steigt herauf, der Inhalt kommt in Teilen (`.bau`, höchstens vierzehn, die Verzögerung am Teil selbst), Licht fährt um das Zeichen, um Platz 1 bis 3 und um „Match eintragen". Eine Sperre nach kurzer Pause gibt es nicht.
- **Ohne Stand auf dem Gerät** [§C42] steht bis zur Antwort der Datenbank das Gerüst der Liga (`_startGeruest`), das danach über ihr ausblendet; kommt nach 2,5 s kein Bild, ebenso.
- **Jeder Wechsel, den ein Tippen wählt, baut sich auf** (`_wechselBeginnt`, `_wechselZiel`): ein Reiter über die Leiste ebenso wie eine Ansicht darin — Zeitraum, Saison, Spieler oder Duos, Awards, Rekorde oder Chronik, Sortierung, Seite des Verlaufs. Überschrift, Wähler und Suche stehen, Karten und Zeilen kommen nacheinander (höchstens zehn, 45 ms auseinander, je 0,56 s), auch aus dem kastenlosen Rahmen einer vergangenen Saison (`.geschichte`) und Karte für Karte aus den Rekorden. Dieselbe Wahl noch einmal und neue Daten (`render` aus `loadAll`) bauen nichts auf.
- **Ein Wähler antwortet sofort:** die Pille des gewählten Reiters ist EIN Schlitten, der gleitet (`_navSchlitten`, `.nav-schlitten`), nur per `transform` in Pixeln aus der Fensterbreite — er fährt, bevor der neue Reiter gerechnet ist. Im Reiter ist der getippte Knopf gewählt, bevor gerechnet ist (`_wahlSofort`, der Knopf aus dem Klick selbst), sein Schlitten fährt los und nach dem Neuzeichnen an derselben Stelle weiter (`schlittenFahren`). Rechnet die Ansicht länger als 90 ms, dunkelt ein Schleier die alte ab (`.reiter-schleier`), bei einem Wechsel im Reiter erst unter dem Wähler; nach 120 ms läuft unter der Kopfleiste die Ladelinie (`_ladeStart`, `.lade-linie`), ebenso solange Daten kommen; beides endet, wenn die Ansicht steht und die Daten da sind (`_wechselSteht`, `_connBewegung`), die Linie spätestens nach 15 s. Steht die Verbindung zum ersten Mal, geht vom Punkt oben links ein Ring aus.
- **Das Podest glänzt, wenn eine Ansicht ankommt, und dieselbe Ansicht erst nach 45 s wieder** (`_podestLicht`, `_podestZuletzt`, `_ansichtSchluessel`: Reiter mit seiner Wahl): Licht im Metall um Platz 1 bis 3 [§C25] in Liga, Positionen und bei den Duos, um das Podest der Awards, um die letzte Partie im Verlauf; über Gold zieht das Band (`.glanz-bahn.glanz-einmal`).
- **Das Kantenlicht hat zwei Bedeutungen und keine dritte** (`kantenlicht`, `.kl`) [§C41]: *zeichnen* — einmal herum, dann steht der Rahmen einige Sekunden: eine Karte, die zählt, ist angekommen; *hinweis* — zweimal herum, ohne Rahmen: hier ist etwas neu. Beide enden von selbst (4,6 und 4,2 s): das Licht läuft nach der Runde langsamer weiter, ein Schein liegt um die Karte, dann verlischt beides, und nichts davon bleibt im Dokument. Das Licht im Profilkopf ist dieselbe Zeichnung mit eigener Bedeutung: es läuft, solange der Monat läuft.
- **Neues kündigt sich mit dem Hinweislicht an:** die Pille „News" gleitet herein, und gibt es Ungelesenes, fährt zweimal Licht um sie (`_pilleKommt`); kommt der Hinweis „x neue Stories" [§C27], fährt es um ihn, und von der Pille geht zweimal ein Ring aus (`_hinweisBewegung`). Nichts davon läuft endlos.
- **Ein Blatt kommt gestaffelt** (`_blattStaffeln`, `.staffel-k`): die ersten acht Teile 45 ms auseinander; trägt ein Rahmen den ganzen Inhalt, zählen seine Kinder; das Profil behält seine eigene Folge. Im Feed fährt beim Öffnen Licht in ihrer Farbe um die ungelesenen Stories im Bild, höchstens sechs, 200 ms nacheinander (`_feedLicht`), beim Filtern nicht noch einmal. Story und Auszeichnung öffnen mit Licht an ihrer Kante (`_fensterLicht`), innen, weil sie selbst scrollen; wer scrollt, beendet es. Geschlossen werden sie geleert (`_fensterZu`).
- **Was ein Blatt oder Fenster verdeckt, steht still** (`_verdecken`, `.steht`): was dort endlos läuft, hält das CSS über `animation-play-state` an, nie `pause()`, und nur diese Elemente, nicht den ganzen Bereich; das Licht darunter verlischt. Beim Schließen läuft es weiter.
- **Neue Daten nehmen das Licht nicht mit:** zeichnet die App denselben Reiter neu, wechselt es an dieselbe Stelle der neuen Ansicht und läuft weiter (`_lichtMerken`, `_lichtZurueck`). Ein Wechsel nimmt es nicht mit: die neue Ansicht hat ihr eigenes.
- **Abbrechbar:** jede Berührung, jedes Scrollen beendet den Aufbau (`_vorfuehrungEnde`); alles steht sofort, wo es hingehört. Das Licht läuft zu Ende — es verdeckt nichts.
- **Nur Drehung, Verschiebung und Deckkraft** (`transform`, `opacity`); der Kegel des Lichts ist so groß wie die Diagonale seiner Karte, nicht größer.
- **Bei Bewegungsruhe** (`prefers-reduced-motion`) steht alles sofort, ohne Licht.

## Stellen

`src/index.html` (Oberfläche im ersten Bild), `09d-bewegung.js` (`_startBereit`, `_startGeruest`, `kantenlicht`, `_aufbauen`, `_podestLicht`, `_glanzEinmal`, `_lichtMerken`, `_lichtZurueck`, `_bewegungNachRender`, `_vorfuehrungEnde`, `_navSchlitten`, `_ladeStart`, `_ladeEnde`, `_wechselBeginnt`, `_wahlSofort`, `_wechselSteht`, `_connBewegung`, `_pilleKommt`, `_hinweisBewegung`, `_blattStaffeln`, `_feedLicht`, `_fensterLicht`, `_verdecken`, `_fensterZu`), `30-news-ui.js` (`newsBadgeRefresh`, `_newsToastZeigen`), `30a-news-karte.js` (`_renderNewsFeed`), `16-sheet-infra.js` (`openSheet`, `_sheetForceClose`), `31-news-detail.js`, `18a-badge-popover.js`, `09-ui-infra.js` (`render`, `renderNav`, `_renderNachEingabe`, `schlittenFahren`), `06-db.js` (`setConn`), `05-nav-sheet.css` (der Schlitten), `06c-stand.js` (kein Stand → Gerüst), `37-boot.js` (`_startBereit`), `00-prolog.js`, `01-shell.css` (das Zeichen), `17-bewegung.css`.

## Prüfung

`tests/start` (die Kopfleiste steht mit dem Zeichen, bevor ein Skript läuft, ohne Bild davor; ohne Stand das Gerüst, bis die Datenbank antwortet; beim Öffnen baut sich die Liga auf, mit Licht im Metall um Platz 1 bis 3, um das Zeichen und den Knopf; auch direkt nach dem Schließen wieder; nach seiner Zeit nichts übrig, auch kein leeres style-Attribut; der Punkt oben links beim ersten „verbunden"; bei Bewegungsruhe nichts davon; der Start lädt das große Symbol nicht), `tests/blatt` (ein über die Leiste betretener Reiter baut sich auf, mit Licht im Metall, dessen Kegel die Karte deckt; nur transform und opacity; neue Daten nehmen das Licht nicht mit; nach seiner Zeit nichts übrig, gleich zurück kein zweites Mal; der leuchtende Schlitten steht unter dem gewählten Knopf; rechnet ein Reiter lange, fährt der Schlitten sofort und Schleier und Ladelinie überbrücken, und steht er, sind beide fort; ein Wechsel im Reiter wählt den Knopf vor der Rechnung, der Schleier beginnt unter dem Wähler, der Schlitten fährt über das Neuzeichnen hinweg weiter; die neue Liste baut sich unter dem stehenden Wähler auf, mit einem Licht je Platz und keinem alten; ebenso eine vergangene Saison und die Rekorde; dieselbe Wahl und neue Daten bauen nichts auf; dieselbe Ansicht glänzt erst nach der Pause wieder; um den Hinweis auf neue Stories fährt Licht, von der Pille ein Ring, nichts läuft endlos, die Pille gleitet herein, bei Bewegungsruhe nichts davon; der Feed kommt gestaffelt, mit Licht um die ungelesenen Stories im Bild, ohne eine Karte höher zu machen, beim Filtern nicht noch einmal; was das Blatt verdeckt, steht still und läuft danach weiter, und wechselt darunter eine Klasse, läuft danach nur die neue Bewegung; Story und Auszeichnung öffnen mit Licht genau an ihrer Kante, das ihnen nichts zu scrollen gibt und beim Scrollen endet, und sind geschlossen leer).

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
hielt die Effekte für kaputt. Sie läuft jetzt bei jedem Öffnen. Das Podest
glänzte zuerst einmal je Reiter und Sitzung: wer später zur Woche oder
zurück zur Saison kam, sah nie wieder Licht. Je Ansicht mit 45 s Pause
sieht es, wer ankommt, und nicht, wer zwischen zwei Ansichten hin- und
herschaltet.

Die Vorführung gehört echten Anlässen: dem ersten Bild eines Starts und
jedem Wechsel, den ein Tippen wählt. Zuerst baute sich nur ein über die
Leiste betretener Reiter auf; Zeitraum, Saison, Spieler und Duos, Awards,
Rekorde und Chronik wechselten ohne jede Bewegung, und auf einem langsamen
Telefon stand nach dem Tippen auf „Gesamt" alles still, bis gerechnet war —
auch der gedrückte Knopf. Ein `render` von anderswo — neue Daten, die
Prüfumgebungen der Tests, die die Ansicht direkt zeichnen — baut weiter
nichts auf. Das Verblassen der ganzen Liste bei jedem Filter wirkte schon
einmal wie ein Neustart (01-shell.css); deshalb stehen Überschrift und
Wähler, und nur was darunter neu ist, kommt.

Beim ersten Einbau der inneren Wechsel wanderte das Licht der alten Ansicht
mit in die neue: dieselbe Stelle im Baum ist in der Woche ein anderes
Element als in der Saison, und Platz 1 der Woche trug sein Licht und das
der Saison. Eine vergangene Saison steht in einem Rahmen ohne Kasten
(`display:contents`); als ein Teil bewegte er nichts sichtbar und nahm die
Wähler mit. Die Rekorde kamen als drei große Blöcke statt Karte für Karte.

Der Schlitten eines Wählers fuhr vorher erst nach der Rechnung los. Fährt er
sofort, zeichnet das Neuzeichnen einen neuen Wähler mitten in der Fahrt; er
sprang dann ans Ziel. Er fährt jetzt dort weiter, wo der alte war: seine
Transition beginnt um die vergangene Zeit später, gezählt ab dem Bild, mit
dem der Compositor die Fahrt übernahm. An der alten Transition ist der
Stand nicht abzulesen — solange der Hauptthread rechnet, steht sie für ihn
noch am Start, während sie im Bild längst fährt.

Gemessen (vierfach gedrosselt, verschachtelt, Median aus 16) kostet die
Bewegung eines inneren Wechsels 20 bis 30 ms bis zum ersten Bild, innerhalb
der Streuung: Awards 230 statt 201 ms, Rekorde 192 statt 170 ms. Der Aufbau
läuft etwas ruhiger als beim ersten Einbau (45 statt 30 ms Abstand, 0,56
statt 0,42 s je Teil); schneller wirkte er auf dem Telefon hektisch.

Das Kantenlicht war zuerst nur im Profilkopf. Als Bauteil [§C27] trägt es
überall dieselben Bedeutungen; eine weitere machte jede unklar. Nach gut einer
Sekunde war es im Entwurf vorbei, bevor man die Karte angesehen hatte — es
steht deshalb einige Sekunden und blendet dann langsam aus. Kam in dieser
Zeit die Antwort der Datenbank, zeichnete die App die Liste neu, und das
Licht verschwand mitten im Leuchten mit den alten Zeilen; es wechselt jetzt
an dieselbe Stelle der neuen Liste. Ein Kegel so groß wie im Profilkopf
(1400 px) kostete bei dreifacher Pixeldichte ein Vielfaches an Speicher.

Beim Reiterwechsel blieb auf einem langsamen Telefon die alte Pille
gemessen 640 ms stehen: jeder Knopf trug seine eigene, und ihr Umfärben
wartete wie alles andere auf das Ende der Rechnung. Ein Schlitten, der nur
verschoben wird, fährt auf dem Compositor, ohne den Hauptthread. Gemessen
(vierfach gedrosselt, warme Reiter, Median aus 30) bleibt der Wechsel gleich
schnell: 57 ms bis zur neuen Ansicht, 136 ms bis zum gemalten Bild (vorher
141 ms).

Blätter und die beiden Fenster liegen hinter einem Vorhang mit Unschärfe,
und jedes Bild einer Bewegung darunter rechnete sie neu — die Lichter über
Titeln in den Awards, der Puls des Punkts oben links. Angehalten wurde
zuerst mit `pause()` und `play()`: danach pulsierte der Punkt auch nach
„verbunden" weiter, und wechselte seine Klasse unter dem Blatt, liefen zwei
Pulse nebeneinander, die der Hauptthread in jedem Bild rechnete. Chrome
löst eine CSS-Animation, die einmal über die Schnittstelle gesteuert wurde,
von ihrer Regel. Jetzt hält das CSS an, und zwar nur, was läuft: eine
Klasse am ganzen verdeckten Bereich rechnete den Stil jedes Knotens neu,
in den Awards gemessen 65 ms beim Anhalten und 45 ms beim Fortsetzen
(vierfach gedrosselt) — das Fortsetzen mitten im Zuschieben des Blatts. An
den laufenden Elementen allein sind es 6 und 1 ms. Geschlossen behielten Story und
Auszeichnung ihren Inhalt, unsichtbar und mit allem, was darin endlos lief.
Ihr Licht lag im ersten Einbau im Fluss: der Inhalt einer Story steht über
ihrem Motiv (`.nd > *`, relative), und der Ring wurde ein vier Pixel
breiter Block am Ende, der dem Fenster Höhe zum Scrollen gab; in den Karten
des Feeds machte dieselbe Regel die Karte höher.

Gemessen wird beim Aufbau nichts: welche Teile im Bild stehen, sagt die
Reihenfolge. Eine vererbte Variable als Verzögerung ließ im Entwurf jeden
Knoten darunter seinen Stil neu rechnen, und ein Messen des Layouts im
ersten Bild kostete gemessen bis zu 1,3 s Hauptthread.
