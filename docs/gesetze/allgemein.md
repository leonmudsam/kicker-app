# Allgemeine Gestaltungsregeln

## Regel

- Detail folgt der Größe: unter 26 px weder Sterne noch Feuer, unter 48 px kein Wappen (`znWrap`, `insAvWrap`).
- Ein Duo hat keinen Rang und kein Wappen: zwei überlappende Chips.
- Nichts sagt zweimal dasselbe — keine Zahl ein zweites Mal in einer Karte über der Tabelle, keine Rechnung zweimal (wer einen Tag oder eine Woche gewinnt, sagt `_periodeRangliste`).
- Keine persönliche Ansprache, keine Possessivpronomen über einen Spieler, kein „Abend".
- Jede `font-family` endet auf einer Familie (`sans-serif`, `monospace`).
- Dieselbe Sache hat einen Namen (Siegquote, Partner, Torbilanz, Größte Überraschung, Direkter Vergleich); kein Befehl in Du-Form, kein englisches Wort außer den Namen der Wertungen, kein Kürzel, Einzahl wo eins steht.
- Ein leeres Feld liest sich als Fehler: nicht vergebene Auszeichnungen gestrichelt, eine ungerade Kachel nimmt die ganze Reihe.

## Stellen

quer durch `src/`.

## Prüfung

`tests/blatt` liest Reiter und Blätter auf Namen und Sprache, `tests/disziplinen` prüft Belege und Bedingungen auf Pronomen, `tests/tafel` die Schriftangaben.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Regeln ohne eigenes Kürzel. Sie gelten überall und werden im Code mit ihrem
Wortlaut zitiert, nicht mit einer Nummer.

- **Detail folgt der Größe.** Unter 26 px weder Sterne noch Feuer, unter
  48 px kein Wappen — darunter bleibt vom Gesicht ein Punkt. Beide Grenzen
  stehen im Code (`znWrap`, `insAvWrap`), nicht nur hier: das Ergebnisband
  zeichnete vier Wappen bei 30 px, und das waren gemessen 225 der 258 Kilobyte
  Markup einer Tafel. Wer aus einem Blatt zurückwischte, sah das als Stocken —
  der Feed wird dabei neu gebaut.
- **Ein Duo hat keinen Rang**, also auch kein Wappen: zwei überlappende
  Chips. (Nebeneffekt: 62 Wappen in einer Duo-Tabelle waren eine
  Viertelmillion Zeichen HTML.)
- **Nichts sagt zweimal dasselbe.** Steht eine Zahl schon in der Tabelle,
  gehört sie nicht noch einmal in eine Karte darüber. Das gilt auch für
  Rechnungen: **wer den Spieltag gewonnen hat, sagt `_periodWinnerMap`** —
  einmal, mit Tiebreak über das Elo-Delta. „Allwetter" und „Tag der Götter"
  rechneten es je Spieler noch einmal nach, ohne den Tiebreak: gemessen sind
  12 der 51 entschiedenen Tage punktgleich, und dort trugen beide Spieler den
  Tag, obwohl beide Beschreibungen „Player of the Day geworden" sagen.
  `tests/disziplinen` rechnet beide gegen die Siegerliste zurück.
- **Keine persönliche Ansprache** in der Oberfläche („du", „meine").
- **Eine Schrift hat einen Rückfall.** Die Schriften kommen aus dem Netz, und
  eine App, die offline startet, hat sie nicht. Drei Angaben nannten nur
  `'Space Grotesk'`, und dort fiel der Browser auf eine Serifenschrift
  zurück: im Positions-Profil stand „Verteidiger" in Times. Jede
  `font-family` endet deshalb auf einer Familie (`sans-serif`, `monospace`,
  …); `tests/tafel` liest das an der Auslieferung nach.
- **Dieselbe Sache hat einen Namen.** Die Siegquote hieß im Profil
  „Siegrate", im Teams-Reiter „Winrate" und in der Chronik „Siegquote";
  der Partner war „Mate", die Tordifferenz „Tordiff" oder „TD", die größte
  Überraschung in den Rückblicken „Größter Upset" und in den Awards „Größte
  Überraschung", der direkte Vergleich „Head-to-Head", die
  Höhepunkte im Awards-Reiter und im Duo-Blatt „Highlights", die
  Gesamtbilanz im Profil „Gesamt-Stats", die Partie im Story-Blatt
  „Auslösendes Match". Jetzt: Siegquote,
  Partner, Torbilanz (sie passt in eine Kachel von 73 px, „Tordifferenz"
  nicht), Größte Überraschung, Direkter Vergleich. „Player of the Week/Day/
  Season" bleiben, das sind die Namen der Wertungen. Ebenso wenig steht dort
  ein Befehl in Du-Form („Tippe auf eine Linie"), ein englisches Wort
  („Tap für Details", „Letztes Update", „Rollen-Performance", „Peak",
  „Savepoint", „Backup") oder ein Kürzel („min. 5 Siege", „Min. Spiele",
  „Ø 7,5 Tore/Sp.", „257 Sp.", „10 Rek.", „39-30T · 116-72G" mit einer
  Legende darüber), und eins steht in der Einzahl („1 Niederlagen" stand
  als aktuelle Serie im Profil). `tests/blatt` liest den Text der Reiter und von
  dreiundzwanzig Blättern danach ab.
- **Keine Possessivpronomen über einen Spieler.** „42 % seiner Niederlagen"
  heißt „42 % aller Niederlagen". Belege, Bedingungen und Nachrichtentexte
  stehen unter dem Wappen jedes Spielers, und ein Pronomen behauptet dort ein
  Geschlecht, das die Liga nicht kennt. `tests/disziplinen` misst die
  gebauten Belege und Bedingungen nach.
- **Kein „Abend".** Keine der 466 Partien hat nach 18 Uhr angefangen; was
  über einen Spieltag gesagt wird, heißt Tag.
- **Ein leeres Feld liest sich als Fehler.** Nicht vergebene Auszeichnungen
  werden gestrichelt gezeigt, nicht halbdurchsichtig; eine ungerade Kachel
  nimmt die ganze Reihe statt ein Loch zu lassen.
