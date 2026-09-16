# Liga-Rekorde, die jeder holen kann

Ein Vorschlag, nicht eine Änderung: nichts davon ist eingebaut.

```
node mockup/rekord-vorschlag-lauf.js     # rechnet 154 Kombinationen → .rekord-vorschlag.json
node mockup/rekord-vorschlag-seite.js    # baut rekord-vorschlag.html
```

Ein Rekord **darf** zeigen, wer am meisten kann. Er darf nicht zeigen, wer am
meisten gespielt hat. Der Unterschied steckt nicht in der Frage, sondern in
der **Bedingung**: „ab 60 Spielen" gehört dem Vielspieler, weil ihn außer ihm
niemand halten kann. Gesucht sind deshalb Rekorde, die jemand mit **fünfzig
Partien** in der Laufbahn erreichen kann.

## Gesucht wird, nicht geraten

154 Kombinationen aus neun Kennzahlen (Siegquote, Abstand zur Rechnung,
Tordifferenz, eigene Tore, Gegentore, Gleichmäßigkeit, Anteil klarer Siege,
Anteil knapper Siege, Torenteil) und siebzehn Teilmengen (ganze Laufbahn, als
Außenseiter, als Favorit, auf Augenhöhe, im Sturm, in der Abwehr, nach einer
Niederlage, nach einem Sieg, in engen Partien, in klaren Partien, gegen die
besten drei, gegen den Rest, erste Partie des Tages, letzte Partie des Tages,
an langen Spieltagen, erste 25, letzte 25) — dazu eine zweite Familie aus der
**Differenz zweier Fenster**.

**48** bestehen alle neun Tore, **14** davon haben einen Namen bekommen:
ausgewählt danach, dass sie keinen bestehenden Eintrag doppeln und sich
voneinander in Kennzahl UND Teilmenge unterscheiden. Die übrigen sind gezählt
und nicht aufgeschrieben — eine Liste aus „Die Gegentore je Partie nach einem
Sieg" ist eine Tabelle, kein Katalog.

Zwei Wächter halten den Lauf ehrlich: kein Name darf im Katalog schon
vergeben sein (als Name oder als Beiname), und `art` muss einer der drei
Werte aus §10.2 sein. Beide waren rot: „Der Ausdauernde" und „Der Deutliche"
existieren schon, und zwei Vorschläge standen als `konstanz` — ein Wert, den
es nur für eine Monatschronik gibt [§C39] und der bei einem Rekord still auf
`ereignis` fällt.

## Die neun Tore

| Tor | Regel |
|---|---|
| mit 50 Partien erreichbar | die Bedingung braucht ≤ 50 Partien |
| der Wenigspieler steht im Rennen | jemand mit unter 100 Partien erfüllt sie |
| hängt nicht an der Spielzahl | Teilkorrelation ≤ 0,35, mit herausgerechnetem Können |
| und auch nicht umgekehrt | Teilkorrelation ≥ −0,70 |
| wiederholt nicht die Rangliste | nicht dasselbe Podest wie der Liga-Tab |
| die Bestmarke schlägt weit aus | Ausschlag ≥ 1,5 σ |
| die halbe Liga steht im Rennen | mindestens die Hälfte erfüllt die Mindestzahl |
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
vier der Siegquote und 7 Punkte über ihrer Erwartung; Jannik mit 78 über Maxi
(348) und Leo (246). **Neun der vierzehn** neuen Rekorde gehen an einen
Spieler mit unter hundert Partien. Das ist die Folge des ersten Tors: wo die
Bedingung bei fünfundzwanzig Partien liegt, entscheidet die Leistung und
nicht der Umfang. Jane hält davon sieben — das gehört zur Entscheidung und
steht als Zahl auf der Seite, nicht weggekürzt.

**Bestehende Rekorde, die ein 50-Spieler nie halten kann.** Aus dem Katalog
gelesen, nicht geraten: **13 von 21** Rekorden mit lesbarer Mindestzahl sind
für ihn unerreichbar. Bei sechs davon sperrt ihn nicht die Frage aus, sondern
nur die Zahl dahinter — „Der Fels" fragt nach den Gegentoren in der Abwehr,
und dieselbe Frage bei zwölf Abwehrspielen bestünde jedes Tor dieser Seite.

**Bestehende Rekorde, die knapp nicht gefallen sind.** Fünf sind heute
geteilt, sechs weitere stehen unter zwei Prozent vor dem Fall: „Der komplette
Stürmer" 0,3 %, „Das Sonntagskind" 0,5 %, „Der Torjäger" 0,6 %. Beim
„Zerstörer" steht **Jannik mit 78 Partien** 0,8 Prozent hinter Martin mit 211
— und die Bedingung „ab 22 Siegen" ist genau die, die ihn bei fünfzig Partien
ausgesperrt hätte.

## Was beim Einbauen dazugehört

Jeder Eintrag braucht die Felder aus §10.2 und drei Zusicherungen in
`tests/disziplinen`: die Teilkorrelation zur Spielzahl unter 0,35, der
Ausschlag über 1,5 σ und — die wichtigste, die es heute nicht gibt — **die
Bedingung ist mit fünfzig Partien erfüllbar**. Ohne die dritte wandert der
Katalog mit jedem neuen Eintrag ein Stück weiter zum Vielspieler, und niemand
sieht es.

Der Umbau davor bleibt derselbe: `_chronicleCtx` bekommt die **Rohsicht**,
die `_seasonTitleCtx` für den Monat schon hat. Danach ist jeder dieser
vierzehn Rekorde ein `allzeit:`-Block an einer Disziplin und keine neue
Rechnung.

Prestige, Stufen, Schwellen, die Rekordlage und jede Mindestzahl kommen aus
`dist/index.html`, damit die Zahlen zur App gehören und nicht zu einer
zweiten Rechnung. Kein Teil des Bauablaufs: `tools/check.mjs` und
`tests/run.mjs` sehen den Ordner nicht.
