# §C38 Die Chronik gehört nicht nur den besten Drei

## Regel

- Ein Monatseintrag für die Mitte des Feldes misst den Abstand zum eigenen Niveau, nicht das Niveau: „Auf Augenhöhe", „Die Steigerung", „Der Sonntagsschuss", „Der Staffellauf", „Das Seitenbündnis" (beide über `_stUebergaenge`), „Der Quertreiber", „Die Tagesumkehr" (gegen den Erwartungswert 2·S·N durch n·(n−1)).
- Nicht eingebaut wird, was einen zweiten Monat zur Eichung braucht, nur mit einer Zufallsreferenz zu rechnen ist, Statistiksprache braucht, die 1,5 σ nicht erreicht oder an der Spielzahl hängt.

## Stellen

`32-chronik-katalog.js` (`DISZIPLINEN`), `33-chronik-engine.js`.

## Prüfung

`tests/disziplinen` fällt, wenn ein solcher Eintrag wieder an die Spitze der Siegquote geht, und rechnet die vier neuen Chroniken aus den rohen Partien nach.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Wer eine Quote
gewinnt, gewinnt fast jede: gemessen gingen sechzig Prozent der
Monatseinträge an die besten Drei der Siegquote, und der Monatserste allein
hielt ein Drittel der Tafel. Ein Eintrag für die Mitte des Feldes misst
deshalb nicht das Niveau, sondern den **Abstand zum eigenen** — so wie „Das
Übersoll", das jeder erreichen kann. „Auf Augenhöhe" vergleicht die Quote in
den Partien, die die Elo-Rechnung offen sah, mit der eigenen Gesamtquote;
„Die Steigerung" die zweite Hälfte der Spieltage mit der ersten; „Der
Sonntagsschuss" ist eine einzige Partie, in der die Rechnung dagegen stand.
Gemessen stehen ihre Halter im Mittel jenseits des ersten Drittels, und der
Anteil der Einträge an die besten Drei fiel von sechzig auf fünfundfünfzig
Prozent. `tests/disziplinen` fällt, wenn eine davon wieder an die Spitze
geht.
Vier weitere kommen aus `mockup/besonderheiten` und folgen derselben
Regel. „Der Staffellauf" und „Das Seitenbündnis" stellen die Partie nach
einem Partnerwechsel am selben Tag gegen die übrigen Übergänge, beide
gegen die Rechnung und nicht als Siegquote (`_stUebergaenge`); „Der
Quertreiber" ist das andere Ende von „Favorit wie Außenseiter", mit einer
Schwelle über deren Band, und „Die Tagesumkehr" zählt Spieltage, die
anders enden als sie beginnen, gegen das, was die eigene Bilanz bei
zufälliger Reihenfolge erwarten lässt (2·S·N durch n·(n−1)) — ohne diesen
Bezug gehörte sie dem, der bei 50 % steht. Gemessen gingen sie an die
Plätze 2, 7, 8 und 11 der Siegquote, bei höchstens 0,31 Korrelation zur
Spielzahl. Nicht eingebaut wurde, was einen zweiten Monat braucht
(Quantensprung, Anderes Trikot, Rivalitätswende, Ruhiges Feld,
Gegnerbalance, Torwende: drei Monatspaare sind keine Eichung), was nur
mit einer Zufallsreferenz zu rechnen ist (Erwartungskorridor), was in
Statistiksprache ausgedrückt werden müsste (Ergebnisdialekt in Bit,
Verdichtung als Rangkorrelation), was die 1,5 σ nicht erreicht
(Rückspielwelle), was es in den echten Partien kaum gibt (Bilanzparadox,
Gegenläufer, Startzeit, Umschaltmoment, Positionspakt), was einen
Effekt von wenigen Punkten ausschmückt (Chancenpendel, Doppelzone), was
aus vielen Paaren das günstigste sucht (Gegnergeflecht, Doppelgesicht mit
0,52 zur Spielzahl) und was an einem willkürlichen Viererblock hängt
(Spiegelmonat).
