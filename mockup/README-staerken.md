# Anteil je Gelegenheit und die schwächste Stelle

`node mockup/staerken-lauf.js` → `mockup/staerken.html`

Fünfzehn Kandidaten für Liga-Rekorde in zwei Kammern, gerechnet an den echten
466 Partien der Liga. **Zwölf tragen**, drei fallen — und elf der zwölf
kosten keinen neuen Namen: sie sind die **Laufbahn-Achse einer Monatschronik,
die es schon gibt**.

---

## Zwei Fragen, eine Antwort

**Die erste.** „Der Platzhirsch" misst den Anteil eigener Spieltage als Player
of the Day, „Der Wochenherr" den Anteil eigener Wochen. Beide zählen nicht,
wie oft etwas gelang, sondern **wie oft von wie vielen Gelegenheiten**. Von
dieser Bauart gibt es genau diese zwei Rekorde.

**Die zweite.** Gemessen an den Fixtures halten Martin zehn und Leon acht
Rekorde, Julian und Jane je sieben, Jannik drei — bei 211 und 355 Partien gegen
171, 97 und 78. In der laufenden Liga ist der Abstand größer geworden. Was den
drei fehlt, ist keine Leistung, sondern eine Frage, die sie nennt: **17 der 57
Rekorde verlangen eine Mindestzahl von vierzig Partien oder mehr**, und wer
weniger spielt, kommt dort von vornherein nicht vor. Vier weitere verlangen
fünfzig Sturm- oder Abwehrspiele.

Beide Fragen haben dieselbe Antwort. Ein Anteil an den eigenen Gelegenheiten
ist von der Spielzahl unabhängig — wer zwanzig Spieltage hat, wird an zwanzig
gemessen —, und genau deshalb erreicht er den, der weniger spielt.

## Der Katalog hat die Antwort schon

**47 Monatschroniken tragen nur die Monatsachse.** Ein Dutzend davon fragt
genau nach einem Anteil je Gelegenheit oder nach der schwächsten Stelle:
„Gegen jeden bestanden", „Die Auferstehung", „Der Serienbrecher", „Ohne
Angstgegner", „Der Ausgleicher", „Ohne Schwachstelle", „Das Metronom", „Die
zweite Luft", „Auf Augenhöhe", „Der Beidfüßige", „Der Kaltstart", „Die weiße
Weste", „Die Nulldiät", „Der Tagesabschluss".

Dieselbe Frage auf zwei Zeitachsen bleibt **EINE Disziplin** [§13.1]. Ein
solcher Rekord kostet deshalb keinen neuen Namen, kein neues Icon, keinen
Beinamen und keine Zeile in §C39 — nur eine zweite Achse und einen Eintrag in
`_chronicleCtx`. Zwölf Disziplinen tragen heute beide Achsen; es wären
vierundzwanzig.

Nur **ein** Eintrag ist wirklich neu, und er schließt eine Lücke: **Das
Übersoll**. `untersoll.monat.wie` sagt heute „dieselbe Rechnung wie beim
Übersoll, nur andersherum", und §C38 führt es als Beispiel für einen Eintrag,
den jeder erreichen kann — es gibt es aber nicht. Die Schande steht ohne ihre
Vorderseite da, und ihr Erklärtext verweist auf etwas, das niemand finden kann.

## Die Tore

Acht, alle an den echten Partien:

| Tor | fällt, wenn |
|---|---|
| 1 Spielzahl | `r` mit der Spielzahl über 0,35 **und** über dem `r` der Siegquote im selben Feld |
| 2 Decke | drei oder mehr teilen den Bestwert |
| 3 Vergeben | niemand erfüllt die Bedingung |
| 4 Offen | niemand mit unter hundert Partien steht im Rennen |
| 5 Raster | eine Schwelle ab zehn liegt nicht auf einem 5er-Schritt |
| 6 Nachbar | der nächste bestehende Rekord ist nicht benannt |
| 7 Familie | zwei Einträge befragen dieselbe Menge und haben denselben Halter |
| 8 Tafel | ein Halter trägt danach mehr als ein Viertel, oder einer der drei kommt nicht vor |

**Tor 1 hat eine zweite Klausel, und die ist der Kern.** In diesem Feld hängen
Siegquote und Spielzahl mit **r = 0,49** zusammen: die Starken spielen auch
viel (Leon 355, Martin 211). Jede Könnens-Kennzahl trägt damit eine
Grundkorrelation, die nichts mit dem Zählen von Gelegenheiten zu tun hat. Ein
Kandidat darf so abhängig sein wie das Können selbst, aber nicht abhängiger.
„Gegen jeden bestanden" liegt bei 0,37 und besteht dadurch; „Die Sammlung" aus
einem früheren Lauf lag bei −0,91 und wäre auch unter dieser Klausel gefallen.

**Tor 2 ist neu in diesem Lauf**, und ein Kandidat ist daran gestorben, bevor
er auf die Liste kam: „Anteil der eigenen Wochen mit Elo-Gewinn" steht bei
Julian, Martin und Leon auf 100 %. Drei gleichauf an der Decke ist keine
Bestmarke, sondern eine Bedingung, die jeder erfüllt.

**Tor 7 entscheidet nicht nach dem größeren Abstand zum Zweiten.** Ein knapper
Abstand ist kein Mangel, sondern das Beste, was ein Rekord haben kann — er
wechselt dann den Halter. Es bleibt der Eintrag, der **weniger an der
Siegquote hängt**: gefragt ist, welche der beiden Fragen etwas hinzufügt, das
die Siegquote nicht schon sagt.

**Tor 8 misst die Tafel, nicht den Stapel.** Dass die Hälfte der Kammer an
Julian geht, IST die Absicht dieses Laufs. „Kein Halter trägt mehr als ein
Viertel" [§C35] ist eine Aussage über den Bestand: danach hält Julian **13 von
61 Haltungen (21 %)**, Martin 12, Leon 8.

## Kammer I — der Anteil an den eigenen Gelegenheiten

Sieben Kandidaten, fünf tragen. Die Kammer ist die Antwort auf die erste
Frage: sie baut „Der Platzhirsch" nach, nur mit anderen Gelegenheiten.

| Eintrag | Halter | Wert | r(Spiele) | im Rennen |
|---|---|---|--:|--:|
| Der Tagesabschluss | Julian (q1) | 91 % der Spieltage nicht im Minus, 21 von 23 | 0,29 | 9 |
| Gegen jeden bestanden | Julian (q1) | 7 von 7 regelmäßigen Gegnern im Plus | 0,37 | 10 |
| Der Serienbrecher | Julian (q1) | 67 % gegen eine laufende Serie, 26 von 39 | 0,24 | 8 |
| Die weiße Weste | Martin (q2) | 8 % der Siege mit höchstens einem Gegentor | 0,40 | 10 |
| Der Kaltstart | Martin (q2) | 71 % der Auftaktpartien, 27 von 38 | 0,37 | 9 |

Alle fünf gehen an die drei Besten der Siegquote, und das ist ehrlich so
gemeint: ein Anteil an den eigenen Gelegenheiten misst weiter das **Können**,
nur ohne die Spielzahl zu belohnen. Ihr `r` mit der Siegquote liegt zwischen
0,60 und 0,98. Wer die Mitte des Feldes erreichen will, braucht Kammer II.

Zwei fallen, und beide an Tor 7:

* **Die Auferstehung** (Julian, 80 % nach zwei Pleiten am Stück) ist dieselbe
  Familie wie „Der Serienbrecher" — die Reihenfolge — und hängt mit 0,94
  stärker an der Siegquote als dieser mit 0,91.
* **Die Nulldiät** (Martin, 15 % der Partien mit höchstens drei Gegentoren)
  ist dieselbe Familie wie „Die weiße Weste" — die Tore — und hängt mit 0,81
  stärker an der Siegquote als diese mit 0,60.

## Kammer II — die schwächste Stelle

Acht Kandidaten, sieben tragen. Diese Kammer fragt nicht nach dem besten Wert
einer Laufbahn, sondern nach dem **schlechtesten**: gegen wen es am
schlechtesten läuft, neben wem, in welcher Lage, an welchem Tag. Ein Ausschlag
nach oben gehört dem, der viel spielt und einmal Glück hatte. Eine Untergrenze
gehört dem, der nirgends einbricht — und das ist genau die Stärke, die die
Tafel bisher nicht nennt.

| Eintrag | Halter | Wert | r(Spiele) | r(Siegquote) |
|---|---|---|--:|--:|
| Das Übersoll | Julian (q1) | +9 Punkte über der Rechnung, 65 statt 56 % | 0,28 | 0,98 |
| Ohne Schwachstelle | Julian (q1) | 50 % in der schwächsten von fünf Lagen | −0,23 | 0,87 |
| Der Ausgleicher | Julian (q1) | 60 % neben dem schwächsten Partner | −0,10 | 0,89 |
| Das Metronom | **Jane** (q4) | 15,7 Punkte Streuung der Tagesquoten | −0,08 | 0,54 |
| Die zweite Luft | **Jannik** (q5) | +11 Punkte ab der vierten Partie | −0,23 | 0,29 |
| Auf Augenhöhe | **Johannes** (q9) | +15 Punkte in offenen Partien | −0,08 | −0,74 |
| Der Beidfüßige | **Maxi** (q6) | 1,1 Punkte Abstand zur eigenen Quote | 0,31 | −0,07 |

Vier der sieben gehen an einen Spieler jenseits der besten drei, einer davon an
den Neunten. Das ist kein Zufall: vier der sieben messen den **Abstand zum
Eigenen** und nicht das Niveau [§C38], und ihr `r` mit der Siegquote fällt
entsprechend von 0,98 auf −0,07.

Einer fällt an Tor 7: **Ohne Angstgegner** (Julian, 55 % gegen den
unangenehmsten Gegner) befragt denselben Kreis wie „Gegen jeden bestanden",
hat denselben Halter und hängt mit 0,98 noch etwas stärker an der Siegquote.
Die Untergrenze wäre die strengere Frage gewesen — sie fällt mit einem
einzigen schlechten Duell —, aber zwei Fragen an denselben Gegnerkreis mit
demselben Halter sind eine zu viel [§C35].

## Die Monatsachse des neuen Eintrags

„Das Übersoll" braucht beide Achsen, sonst ist es eine halbe Disziplin
[§10.2]. Die Schwelle wird nicht geschätzt, sondern gesucht: die **höchste**
Schwelle auf einem 5er-Schritt, die in den gewerteten Monaten überhaupt jemand
erfüllt.

* Schwelle **+15 Prozentpunkte** über der eigenen Elo-Erwartung
* Ausschlag **1,71 σ** — verlangt sind 1,5 [§C39], also `klasse:'selten'`
* **1 Halter in 3 gewerteten Monaten** (Martin, August) — erlaubt ist einer je
  Monat [§C32]
* `art:'koennen'`, Beiname „Der Übertreffer"

Bemerkenswert daran: der Monatshalter ist Martin, der Laufbahnhalter Julian.
Dieselbe Frage, zwei Zeitachsen, zwei Namen — genau dafür gibt es die zweite
Achse.

## Was die Tafel danach trägt

| Spieler | Siegquote | Partien | heute | danach | |
|---|--:|--:|--:|--:|--:|
| Julian | 1. | 171 | 7 | **13** | +6 |
| Martin | 2. | 211 | 10 | **12** | +2 |
| Jane | 4. | 97 | 7 | **8** | +1 |
| Leon | 3. | 355 | 8 | 8 | |
| Maxi | 6. | 348 | 5 | **6** | +1 |
| Jannik | 5. | 78 | 3 | **4** | +1 |
| Johannes | 9. | 77 | 1 | **2** | +1 |
| Henry | 8. | 152 | 4 | 4 | |
| Stefan | 10. | 81 | 3 | 3 | |
| Leo | 7. | 246 | 1 | 1 | |

Leon bekommt keinen einzigen dazu, obwohl er mit 355 Partien die längste
Laufbahn hat und auf Platz drei der Siegquote steht. Das ist die Gegenprobe:
zwölf Rekorde, die einen Anteil an den eigenen Gelegenheiten messen, sind
gegen die Spielzahl blind.

## Was noch aufgefallen ist

**Die Elo-Rechnung unterschätzt die Starken.** „Das Übersoll" hängt mit
r = 0,98 an der Siegquote: wer besser spielt, liegt auch weiter über der eigenen
Erwartung. Eine Erwartung, die aufgeht, dürfte mit der Siegquote gar nicht
zusammenhängen. Das ist ein Befund über die Kalibrierung der Elo-Rechnung, kein
Grund gegen den Eintrag — aber er erklärt, warum „Das Übersoll" in Kammer II
das Niveau misst und nicht den Abstand zum Eigenen.

**Julians Bilanz ist gegen jeden im Plus.** Gegen alle sieben Gegner mit
mindestens fünfzehn Duellen steht die Bilanz positiv, und gegen den
unangenehmsten davon noch 55 %. Kein anderer Spieler der Liga schafft das; der
Zweite steht bei 45 %. Das ist die Stärke, die die Tafel heute nicht nennt.

## Wenn implementiert wird

Zwölf neue Rekorde auf einmal sind viel: jeder gehaltene Liga-Rekord trägt
Prestige [§C34], und zwölf Einträge verschieben die Insignium-Leiter. Was dann
dazugehört, steht in §10.2 und §10.3 — je Eintrag ein Feld in
`_seasonTitleCtx` **und** dasselbe Feld in `_chronicleCtx`, `allzeit.cond` mit
jeder Schwelle, `allzeit.wie` mit dem Nenner, `allzeit.ev` beginnend mit dem
Sortierwert, und am Ende die Balance in `tests/disziplinen`.

Für „Das Übersoll" kommt alles aus §10.2 dazu: Katalogblock, `art`, `short`,
ein eigenes `ic`, `monat.beiname`, `monat.art`, `monat.klasse`, `monat.aus`,
die vier Felder aus `_stWertung` — und die Zeile in §6 §C39.
