# Neue Liga-Rekorde, die jeder holen kann

Ein Vorschlag, nicht eine Änderung: nichts davon ist eingebaut.

```
node mockup/rekord-vorschlag-lauf.js     # rechnet 36 Kandidaten nach → .rekord-vorschlag.json
node mockup/rekord-vorschlag-seite.js    # baut rekord-vorschlag.html
```

Gesucht sind Liga-Rekorde, die **nicht den Vielspieler** und **nicht den
Besten** belohnen: erreichbar für die ganze Liga, besonders, auf einer
**Abweichung** oder einer **Fügung** gebaut und ohne einen der 36 bestehenden
Einträge zu doppeln.

Zwei Runden, 36 Kandidaten, an den 466 echten Partien gerechnet. **Fünf**
überstehen jedes Tor, das für sie gilt.

## Die zwei Runden

**Erste Runde (18).** Die Fragen der Monatschroniken, auf die Laufbahn
gehoben: dieselbe Frage, dieselbe Disziplin, andere Zeitachse [§13.1].
Vier davon in einer zweiten Fassung, weil die erste einen Messfehler hatte.

**Zweite Runde (18).** Was der Katalog danach nicht fragt:

- die **Fügung der Auslosung** — welches Los, welcher Partner, welcher
  Gegner, welcher Wochentag. Das wählt niemand, also kann es jedem
  zufallen.
- der **Moment im Tag** — die erste Partie, die letzte, der Tag nach einem
  Fehlstart, die Rückkehr nach einer Pause, der lange Spieltag. Jeder
  Spieltag bringt davon je einen, unabhängig von der Spielzahl.
- vier **Funde** — einzelne Zusammentreffen, die ein Gelegenheitsspieler an
  einem Nachmittag treffen kann.

## Die acht Tore

Vier stehen so in der Arbeitsanweisung [§C35, §C39]. Vier sind hier
entstanden, und zwei davon sind selbst Ergebnisse.

| Tor | Regel | gilt für |
|---|---|---|
| hängt nicht an der Spielzahl | Korrelation zur Partienzahl, \|r\| ≤ 0,35 | alle |
| wiederholt nicht die Rangliste | Korrelation zur Siegquote, \|r\| ≤ 0,70 | alle |
| die halbe Liga steht im Rennen | mindestens die Hälfte erfüllt die Mindestzahl | Quoten |
| die Bestmarke schlägt weit aus | Ausschlag ≥ 1,5 σ über dem Mittel der Gewerteten | Quoten |
| der Fund ist erreichbar | mehr als die Hälfte hat ihn schon einmal getroffen | Funde |
| nicht nur für die Spitze | der heutige Halter kommt nicht aus den besten drei | alle |
| die Mitte kommt vor | einer der besten drei kommt aus der unteren Hälfte | alle |
| die Bestmarke ist nicht geschenkt | höchstens ein Drittel hält sie punktgleich | alle |

Die **Quotentore gelten für einen Fund nicht** — eine Quotenschwelle darauf
anzuwenden hieße, das Seltene abzuschaffen [§C35]. An ihre Stelle tritt die
Frage, ob er überhaupt erreichbar ist, und dafür braucht jeder Fund seine
Untergrenze: ohne sie trägt jeder Spieler einen Wert, und der Deckel geht ins
Leere.

## Was die Messung ergeben hat

Sechs Befunde, jeder eine Zahl:

1. Eine Abweichung darf **nicht gegen die eigene Quote** gerechnet werden —
   das dreht die Rangliste um (r = −0,91 zur Siegquote).
2. Die Abhängigkeit von der Spielzahl verschwindet, wenn man in
   **Standardfehlern** misst statt in Prozentpunkten (r = 0,36 → −0,13, bei
   größerem Ausschlag).
3. Ein **Moment im Tag** ist keine eigene Frage. Anspieler, Schlussmann,
   Fehlstarter, Rückkehrer und Langstreckler messen alle den Abstand zur
   Rechnung, und die Rechnung kennt die Uhrzeit nicht: übrig bleibt das
   Können, r = 0,74 bis 0,96.
4. Ein **Fund** zerfällt an drei Stellen, und alle vier gerechneten fallen —
   jeder an einer anderen. Zu selten (die weiße Weste: einer von elf), eine
   Anwesenheitsliste (der Zahlendreher: r = 0,99 zur Spielzahl) oder ein
   Plateau (der Serientäter: sieben von zehn halten die Bestmarke, bei einer
   Stufe höher steht die Liste leer).
5. Das Tor **„die Mitte kommt vor"** nimmt eine Sache zurück, die fünf Tore
   bestanden hatte: „Das Metronom" gehört heute Rang 4, aber auf den Plätzen
   zwei und drei steht niemand aus der unteren Hälfte. Beim nächsten
   Halterwechsel wäre es wieder ein Rekord der Spitze.
6. Das Tor **„die Bestmarke ist nicht geschenkt"** macht sichtbar, warum ein
   kleiner Ausschlag entsteht: nicht weil die Frage schlecht ist, sondern
   weil die Spitze ein Plateau ist.

Drei Schwellen sind an den Daten geeicht statt geraten. Die **Pause** des
Rückkehrers: bei sieben Tagen hatten vier von zwölf Spielern gar keine und
der Median lag bei einer, bei drei Tagen sind es zehn von zwölf mit acht und
mehr. Die **Untergrenzen der vier Funde** ebenso.

## Der eigentliche Vorschlag

Der Vorschlag beginnt nicht mit einer Liste, sondern mit einem Umbau:
`_chronicleCtx` bekommt dieselbe **Rohsicht**, die `_seasonTitleCtx` für den
Monat schon hat, erweitert um den Wochentag. Danach ist ein neuer Liga-Rekord
ein `allzeit:`-Block an einer Disziplin, die es schon gibt — genau wie
`spotless`, `evenkeel` und `drought` heute beide Zeitachsen tragen [§13.1].

Beim Einbauen braucht jeder Eintrag die Felder aus §10.2 und **vier**
Zusicherungen in `tests/disziplinen`: Spielzahl unter 0,35, Siegquote unter
0,70, Ausschlag über 1,5 σ und mindestens einer der besten drei aus der
unteren Hälfte. Die letzte gibt es heute nicht, und sie ist die wichtigste:
sie ist der Unterschied zwischen einem Rekord, der der Mitte gehört, und
einem, den die Mitte holen kann.

Die Rohsicht wird im Lauf nachgebaut; Prestige, Stufen, Schwellen und die
Herkunft jeder Frage (Monatschronik oder Liga-Rekord) kommen aus
`dist/index.html`, damit die Zahlen zur App gehören und nicht zu einer
zweiten Rechnung. Kein Teil des Bauablaufs: `tools/check.mjs` und
`tests/run.mjs` sehen den Ordner nicht.
