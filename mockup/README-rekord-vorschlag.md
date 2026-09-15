# Neue Liga-Rekorde für die Mitte des Feldes

Ein Vorschlag, nicht eine Änderung: nichts davon ist eingebaut.

```
node mockup/rekord-vorschlag-lauf.js     # rechnet 18 Kandidaten nach → .rekord-vorschlag.json
node mockup/rekord-vorschlag-seite.js    # baut rekord-vorschlag.html
```

Gesucht sind Liga-Rekorde, die **nicht den Vielspieler** und **nicht den
Besten** belohnen: erreichbar für die Mitte, besonders, auf einer
**Abweichung** gebaut, aus den Fragen der Monatschroniken abgeleitet und ohne
einen bestehenden Eintrag zu doppeln.

Jeder Kandidat wird an den 466 echten Partien gerechnet und gegen fünf Tore
gestellt — vier stehen so in der Arbeitsanweisung [§C35, §C39], das fünfte
(„wiederholt nicht die Rangliste") kommt aus derselben Absicht und stand dort
noch nicht:

| Tor | Regel |
|---|---|
| hängt nicht an der Spielzahl | Korrelation zur Partienzahl, \|r\| ≤ 0,35 |
| wiederholt nicht die Rangliste | Korrelation zur Siegquote, \|r\| ≤ 0,70 |
| die halbe Liga steht im Rennen | mindestens die Hälfte erfüllt die Mindestzahl |
| die Bestmarke schlägt weit aus | Ausschlag ≥ 1,5 σ über dem Mittel der Gewerteten |
| nicht nur für die Spitze | der heutige Halter kommt nicht aus den besten drei |

Fünf von achtzehn bestehen alle fünf. Die dreizehn anderen fallen mit Zahl
und Grund aus — und zwei dieser Absagen sind die eigentlichen Ergebnisse:
eine Abweichung darf **nicht gegen die eigene Quote** gerechnet werden (das
dreht die Rangliste um), und die Abhängigkeit von der Spielzahl verschwindet,
wenn man in **Standardfehlern** misst statt in Prozentpunkten.

Der Vorschlag beginnt deshalb nicht mit einer Liste, sondern mit einem Umbau:
`_chronicleCtx` bekommt dieselbe **Rohsicht**, die `_seasonTitleCtx` für den
Monat schon hat. Danach ist ein neuer Liga-Rekord ein `allzeit:`-Block an
einer Disziplin, die es schon gibt — genau wie `spotless`, `evenkeel` und
`drought` heute beide Zeitachsen tragen [§13.1].

Die Rohsicht wird im Lauf nachgebaut; Prestige, Stufen und Schwellen kommen
aus `dist/index.html`, damit die Zahlen zur App gehören und nicht zu einer
zweiten Rechnung. Kein Teil des Bauablaufs: `tools/check.mjs` und
`tests/run.mjs` sehen den Ordner nicht.
