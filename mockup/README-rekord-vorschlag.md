# Liga-Rekorde in zwei Kammern

Ein Vorschlag, nicht eine Änderung: nichts davon ist eingebaut.

```
node mockup/rekord-vorschlag-lauf.js     # rechnet 278 Kombinationen → .rekord-vorschlag.json
node mockup/rekord-vorschlag-seite.js    # baut rekord-vorschlag.html
```

Ein Rekord **darf** zeigen, wer am meisten kann — eine hohe Schwelle ist
dafür legitim, weil ihr Halter sie über eine lange Strecke gehalten hat. Er
soll aber nicht **nur** das zeigen. Die Schwelle ist deshalb keine Bedingung,
sondern eine **Kammer**:

- **offen** — die Bedingung ist mit **fünfzig Partien** erfüllbar. Der Rekord
  für jeden; gemessen gehört er meistens dem, der wenig spielt und gut ist.
- **Anspruch** — eine höhere Schwelle ist erlaubt. Alle anderen Tore gelten
  unverändert, sonst wäre es wieder ein Rekord für den, der am meisten spielt.

## Gesucht wird, nicht geraten

278 Kombinationen aus neun Kennzahlen (Siegquote, Abstand zur Rechnung,
Tordifferenz, eigene Tore, Gegentore, Gleichmäßigkeit, Anteil klarer Siege,
Anteil knapper Siege, Torenteil), siebzehn Teilmengen (ganze Laufbahn, als
Außenseiter, als Favorit, auf Augenhöhe, im Sturm, in der Abwehr, nach einer
Niederlage, nach einem Sieg, in engen Partien, in klaren Partien, gegen die
besten drei, gegen den Rest, erste Partie des Tages, letzte Partie des Tages,
an langen Spieltagen, letzte 30) und **beiden Kammern** — dazu eine zweite
Familie aus der **Differenz zweier Fenster**.

**87** bestehen alle neun Tore ihrer Kammer, **12** davon haben einen Namen
bekommen: sieben offen, fünf mit Anspruch. Die übrigen sind gezählt und nicht
aufgeschrieben — eine Liste aus „Die Gegentore je Partie nach einem Sieg" ist
eine Tabelle, kein Katalog.

## Zwei Regeln gegen die Häufung

Die Auswahl ist nicht Geschmack, sondern gemessen und im Lauf erzwungen:

**Höchstens zwei Rekorde je Kennzahl und je Teilmenge.** Gebaut waren erst
achtzehn, und sieben davon fragten nach knappen Siegen oder nach
Gleichmäßigkeit — alle sieben hielt Jane. Dieselbe Frage in sieben
Ausschnitten sammelt sich beim selben Halter [§C35]. Drei sind ganz gefallen,
weil „Das Sonntagskind" und „Der Nervenkitzler" die Frage im heutigen Katalog
schon stellen.

**Und kein Halter trägt mehr als ein Drittel der Tafel.** Die erste Regel
allein reichte nicht: danach hielt Martin sieben von dreizehn — dieselbe
Tafel, ein anderer Name darauf. Heute steht es bei Martin 4 · Jane 4 ·
Jannik 2 · Leon 1 · Julian 1. Der Anteil ist streng, weil die Suche
überhaupt nur fünf verschiedene Halter hergibt.

## Sieben Wächter halten den Lauf ehrlich

Jeder bricht ab, statt eine Tafel zu schreiben, die nicht stimmt. Jeder war
einmal rot:

| Wächter | war rot bei |
|---|---|
| höchstens zwei je Kennzahl und je Teilmenge | vier Rekorde auf „Gleichmäßigkeit", drei auf „knappe Siege" |
| kein Halter über einem Drittel | Martin hielt sieben von dreizehn |
| kein Name doppelt vergeben | „Der Ausdauernde", „Der Deutliche", „Der Gleichmütige" — alle drei stehen im Katalog |
| `art` ist einer der drei Werte aus §10.2 | zwei Vorschläge standen als `konstanz`, was es nur für eine Monatschronik gibt [§C39] |
| kein toter Name in der Tafel | „Der Zitterlauf" stand da, nachdem seine Kombination ein Tor gerissen hatte |
| keine eingefrorene Teilmenge | „in den ersten 25 Partien" ist fertig, sobald jemand 25 Partien hat |
| jede Schwelle auf dem 5er-Raster | fünf Teilmengen standen auf zwölf |

**Jede Schwelle steht auf einem 5er-Raster.** Eine Bedingung ist eine
Absprache und keine Messung: „ab 22 Siegen" ist das Ergebnis einer
Kalibrierung, gelesen wird es aber als Regel, und eine Regel mit einer
krummen Zahl liest sich wie ein Versehen. Die **Messwerte** bleiben davon
unberührt — ein Beleg nennt den Wert, nach dem sortiert wird [§10.2], und
zwei gerundete Werte hätten keine Reihenfolge mehr. Im heutigen Katalog
stehen sieben Schwellen krumm.

**Und jede Teilmenge wandert mit.** „In den ersten 25 Partien" ist gefallen:
der Abschnitt ändert sich nie wieder, ein Rekord darauf wäre ab dem Tag
seiner Vergabe ein Eintrag im Museum. An seine Stelle ist ein **gleitendes
Fenster über die letzten 30 Partien** getreten. Geprüft wird das an den Daten
und nicht am Namen: liefert eine Teilmenge für jeden Spieler dasselbe wie
zwanzig Partien früher, bricht der Lauf ab.

## Die neun Tore

| Tor | Regel |
|---|---|
| die Kammer entscheidet die Schwelle | ≤ 50 Partien gehört in die offene, > 50 in die anspruchsvolle |
| der Wenigspieler steht im Rennen | nur offen: jemand mit unter 100 Partien erfüllt sie |
| hängt nicht an der Spielzahl | Teilkorrelation ≤ 0,35, mit herausgerechnetem Können |
| und auch nicht umgekehrt | Teilkorrelation ≥ −0,70 |
| wiederholt nicht die Rangliste | nicht dasselbe Podest wie der Liga-Tab |
| die Bestmarke schlägt weit aus | Ausschlag ≥ 1,5 σ |
| es ist ein Rennen | offen: die halbe Liga · Anspruch: ein Drittel |
| die Bestmarke ist nicht geschenkt | höchstens ein Drittel hält sie punktgleich |
| der Halter bleibt nicht unter seiner Erwartung | Abstand zur Rechnung ≥ 0 in der gemessenen Teilmenge |

Drei davon sind das Ergebnis der Messung und nicht der Absicht:

**Die Spielzahl wird partiell gemessen.** Die rohe Korrelation täuscht in
dieser Liga: die schwächsten Spieler spielen auch am wenigsten, gemessen
r = 0,49 zwischen Partienzahl und Siegquote. Damit läuft **jeder**
Können-Rekord mit der Spielzahl mit, ohne von ihr zu hängen — ein Tor auf die
rohe Zahl wirft genau die Rekorde weg, die der Katalog braucht. Gefragt ist
die Teilkorrelation: was bleibt von der Abhängigkeit übrig, wenn die
Siegquote schon erklärt ist.

**Die Rangliste wird am Podest gemessen, nicht an einer Korrelation.** Ein
Können-Rekord korreliert mit der Siegquote, weil er Können MISST. Die Frage
ist deshalb nicht, ob die Zahlen zusammenhängen, sondern ob dieselben drei
vorne stehen wie im Liga-Tab (Julian, Martin, Leon).

**Der Halter darf nicht unter seiner Erwartung liegen.** „Der Gelassene"
gehörte Alex mit 3,1 Toren Streuung um −4,2 im Schnitt: gleichmäßig, weil er
gleichmäßig verliert. Gemessen wird gegen die Erwartung und nicht gegen null
— in der Teilmenge „als Außenseiter" ist die Tordifferenz bei jedem negativ,
und ein Tor darauf hätte die ganze Teilmenge gestrichen, samt dem Rekord für
den, der als Außenseiter trotzdem gewinnt.

## Drei Analysen, die zum Vorschlag gehören

**Wer wenig spielt und trotzdem gut ist.** Jane steht mit 97 Partien auf Rang
vier der Siegquote und 7 Punkte über der eigenen Erwartung; Jannik mit 78
über Maxi (348) und Leo (246). **Sechs der zwölf** neuen Rekorde gehen an
einen Spieler mit unter hundert Partien. Das ist die Folge der offenen
Kammer: wo die Bedingung bei dreißig Partien liegt, entscheidet die Leistung
und nicht der Umfang.

**Bestehende Rekorde, die ein 50-Spieler nie halten kann.** Aus dem Katalog
gelesen, nicht geraten: **13 von 21** Rekorden mit lesbarer Mindestzahl sind
für ihn unerreichbar. Sie gehören damit alle in die anspruchsvolle Kammer,
und das ist nicht falsch — es ist einseitig. Bei sechs davon sperrt ihn nicht
die Frage aus, sondern nur die Zahl dahinter: „Der Fels" fragt nach den
Gegentoren in der Abwehr, und dieselbe Frage bei zwölf Abwehrspielen bestünde
jedes Tor dieser Seite.

**Bestehende Rekorde, die knapp nicht gefallen sind.** Fünf sind heute
geteilt, sechs weitere stehen unter zwei Prozent vor dem Fall: „Der komplette
Stürmer" 0,3 %, „Das Sonntagskind" 0,5 %, „Der Torjäger" 0,6 %. Beim
„Zerstörer" steht **Jannik mit 78 Partien** 0,8 Prozent hinter Martin mit 211
— und die Bedingung „ab 22 Siegen" ist genau die, die ihn bei fünfzig
Partien ausgesperrt hätte.

## Was beim Einbauen dazugehört

Jeder Eintrag braucht die Felder aus §10.2 und drei Zusicherungen in
`tests/disziplinen`: die Teilkorrelation zur Spielzahl unter 0,35, der
Ausschlag über 1,5 σ und — die wichtigste, die es heute nicht gibt — **die
Kammer**, also die Zusicherung, dass die offene Kammer überhaupt besetzt ist.
Ohne die dritte wandert der Katalog mit jedem neuen Eintrag ein Stück weiter
zum Vielspieler, und niemand sieht es.

Der Umbau davor bleibt derselbe: `_chronicleCtx` bekommt die **Rohsicht**,
die `_seasonTitleCtx` für den Monat schon hat. Danach ist jeder dieser zwölf
Rekorde ein `allzeit:`-Block an einer Disziplin und keine neue Rechnung.

Prestige, Stufen, Schwellen, die Rekordlage und jede Mindestzahl kommen aus
`dist/index.html`, damit die Zahlen zur App gehören und nicht zu einer
zweiten Rechnung. Kein Teil des Bauablaufs: `tools/check.mjs` und
`tests/run.mjs` sehen den Ordner nicht.
