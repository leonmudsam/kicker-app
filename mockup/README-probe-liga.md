# Eine erfundene Liga zum Prüfen des Story-Systems

```
node mockup/probe-lauf.js          # spielt die letzten 20 Tage nach, druckt den Bericht
node mockup/probe-lauf.js --json   # dasselbe als .probe.json
```

Nicht die echte Liga: andere Namen, andere IDs, eigene Datei, nichts davon wird
je eingetragen. Der Grund für die Fiktion ist die Dichte. Die echten Fixtures
tragen 466 Partien und treffen von jedem Story-Typ höchstens einen Fall je
Lauf — eine Zusicherung prüft dann genau den, der zufällig ansteht. Die
Probeliga trägt **571 Partien auf 64 Spieltage bei zwölf Spielern** und dazu
ein **Schaufenster** von einer Woche, in dem gezielt alles vorkommt, was der
Feed zeigen können muss:

| Tag | was dort gebaut ist |
|---|---|
| Mo | das erste 10:0 der Liga (legendäre Auszeichnung → Breaking), zwei Krimis, ein Favoritensturz unter 20 % Siegchance |
| Mi | der volle Spieltag: zwölf Partien, eine Serie wächst auf fünfzehn, ein zweites 10:0 |
| Fr | ein Duo gewinnt fünf gemeinsame Partien, ein anderes verliert fünf |
| Sa | kein Spiel — hier muss der Fun Fact tragen |
| So | vier Partien, danach die Wochenkarte |

`probe-lauf.js` spielt die letzten zwanzig Kalendertage Tag für Tag nach,
persistiert wie die App (ON CONFLICT DO NOTHING) und rechnet danach den Feed.
Gedruckt wird je Tag, was **gebildet** wurde und was davon **im Feed steht** —
jede verlorene Karte mit dem Grund (`B` gebündelt, `← WEG` gefallen) —, dazu
eine Verlusttabelle je Typ, die Breaking-Liste, die Generatorzeit und die
Frage, ob eine Karte eine Partie zeigt, in der ihre Leute gar nicht gespielt
haben.

## Was der erste Lauf gefunden hat

| Befund | gemessen | Antwort |
|---|---|---|
| Tafel-Karten zeigten ein fremdes Ergebnisband | **34 von 169** Karten | jede Karte zeigt die letzte eigene Partie eines genannten Spielers; eine Sammelkarte nur, wenn alle Teile dieselbe nennen [§C33] |
| Ergebnisse fielen ganz aus dem Feed | am 07.09. zwei Karten (prio 73 und 71), von neun Partien kein Ergebnis | zwei verdrängte Ergebnisse tragen eine gemeinsame Karte, einen Tagesplatz statt zwei |
| dieselbe Serie zweimal an einem Tag | 5er- und 7er-Marke desselben Spielers | je Spieler und Tag bleibt die längste |
| Generatorzeit | **344 ms** je Lauf, danach memoisiert | unverändert; die auslösende Partie zu suchen hätte ~200 ms gekostet und dasselbe Spiel genannt |

Nach den drei Änderungen: **0** Karten mit fremder Partie, `match_result` fällt
von vier auf zwei verlorene Karten, und die gemeinsame Karte steht genau an dem
Tag, an dem beide Ergebnisse sonst verschwunden wären.

## Was offen bleibt

- **Die Tafel-Sammelkarte trägt in dieser Dichte bis zu 21 Zeilen**, darunter
  fünfmal „Nico baut … aus". Das ist der Preis der Regel, dass Bündeln nichts
  versteckt [§C33]: die Karte wird kleiner in der Zahl der Rahmen, nicht ärmer
  an Inhalt. In der echten Liga sind es vier bis sechs Zeilen; erst wenn das
  dort wächst, lohnt eine Zusammenfassung je Spieler.
- **`win_streak` steht an keinem Tag als eigene Karte im Feed.** Mit prio 68
  (5er) bis 74 (10er) liegt die Serie unter Tafel, Spieler des Tages und
  Wochenkarte. Sichtbar ist sie trotzdem: als Zeile einer Sammelkarte und über
  die Gruppe „Serien im Gleichschritt". Eine Anhebung wäre eine Änderung am
  gemessenen Rangband [§C33] und braucht ihre eigene Messung.
- **Die Probeliga ist kein Maßstab für Schwellen.** Kalibriert wird an den
  echten Partien; die Fiktion sagt, ob eine Regel greift, nicht wo sie liegen
  soll.
