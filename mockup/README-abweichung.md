# Chroniken und Rekorde, die aus der Abweichung leben

`node mockup/abweichung-lauf.js` → `mockup/abweichung.html`

Zehn Kandidaten, fünf positiv und fünf negativ, gerechnet an den echten 466
Partien der Liga. Vier tragen, sechs scheitern nachvollziehbar — und das
Scheitern ist das Ergebnis des Laufs, nicht sein Makel.

---

## Die Frage

Wer eine Quote gewinnt, gewinnt fast jede. Ein Eintrag, der das **Niveau**
misst, gehört damit immer denselben drei Spielern: gemessen gingen einmal
sechzig Prozent aller Monatseinträge an die besten Drei der Siegquote, und der
Monatserste allein hielt ein Drittel der Tafel [§C38].

Ein Eintrag, der die **Abweichung von einer eigenen Bezugsgröße** misst, ist
für jede Könnensklasse erreichbar: der Zehnte der Siegquote kann in zehn
Partien genauso weit über seinem eigenen Schnitt liegen wie der Erste. Genau
das zeigen die Halter der vier tragenden Kandidaten — einer aus dem oberen,
einer aus dem mittleren, einer aus dem unteren Drittel.

## Die Abweichung ist die Bedeutung

Das ist keine neue Rechnung. Der Ausschlag der Schwelle in
Standardabweichungen (`aus`) geht schon heute direkt ins Prestige:

    PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] × aus + PRESTIGE_SELTEN[klasse]

gerundet auf fünf [§C39]. Weiter draußen heißt von selbst mehr wert, und die
Klasse folgt dem Ausschlag statt umgekehrt: ab 2,1 σ legendär, ab 1,7 σ
selten, ab 1,5 σ besonders, darunter fällt der Eintrag aus dem Katalog.

Eine Schattenseite gibt null Punkte und zählt nicht als Rekord [§C25]. Sie
gehört trotzdem dazu — nur ohne Wert.

## Die Zahlen werden nicht gewürfelt

Eine Schwelle von 13 % oder „ab 23 Partien" liest sich wie ein
Rechenergebnis, weil sie eines ist. Jede Schwelle liegt deshalb auf einem
**5er-Schritt** — fünf Prozentpunkte oder ein halbes Tor —, und jede
Mindestzahl ist ein Vielfaches von fünf.

Gerundet wird nach **oben**, solange die Tafel dabei nicht leer wird: die
höhere Schwelle schlägt weiter aus, und der Ausschlag ist die Bedeutung.
Gemessen hob das „Der letzte Ball" von 31 auf 35 Prozentpunkte und damit von
1,50 auf 1,75 σ — von *besonders* auf *selten*, von 75 auf 90 Punkte. Fünf der
zehn Schwellen lagen schon auf dem Raster, die anderen fünf rückten um
höchstens vier Prozentpunkte.

## Die sieben Tore

| | Tor | Grenze |
|---|---|---|
| 1 | Der Chronik-Wert hängt nicht an der Spielzahl | \|r\| ≤ 0,35 [§C39] |
| 2 | Der Rekord neigt nicht zum Vielspieler | \|r\| ≤ 0,5 über 11 Punkte |
| 3 | Die Schwelle schlägt weit aus | ≥ 1,5 σ |
| 4 | **Die Bestmarke erfüllt die Aussage ihres Namens** | Wert > 0 |
| 5 | Der Eintrag ist vergeben | auf beiden Achsen |
| 6 | Höchstens ein Halter je gewerteten Monat | Rate ≤ 1 [§C32] |
| 7 | **Er erreicht jede Könnensklasse** | ein Halter jenseits des ersten Drittels |

Tor 4 kam durch die Messung dazu. „Der Trotzkopf" fragt, wer gegen Stärkere
mehr holt als über alles — und in dieser Liga holt **niemand** dort mehr; die
Bestmarke lag bei −6 Prozentpunkten. Ein Rekord, dessen Bester die eigene
Aussage nicht erfüllt, ist kein Rekord, sondern eine Rangliste des kleinsten
Übels.

## Was trägt

| Eintrag | Art | Schwelle | Ausschlag | Prestige | Rekord heute |
|---|---|---|--:|--:|---|
| **Der Höhenflug** · Der Entfesselte | Können | 30 Prozentpunkte | 1,50 σ | 85 | Maxi (mittleres Drittel) |
| **Die Steigerungsform** · Der Gereifte | Konstanz | 25 Prozentpunkte | 1,50 σ | 75 | Stefan (unteres Drittel) |
| **Der letzte Ball** · Der Standhafte | Konstanz | 35 Prozentpunkte | 1,75 σ | 90 | Jane (oberes Drittel) |
| **Der Ladehemmer** · Der Zögerliche | Schattenseite | 1,0 Tore | 1,67 σ | 0 | Jane (oberes Drittel) |

- **Der Höhenflug** — die letzten zehn Partien gegen alle davor. Maxi steht
  bei 70 % in den letzten zehn gegen 43 % in den 338 davor.
- **Die Steigerungsform** — die zweite Hälfte der eigenen Spieltage gegen die
  erste. Stefan bei 33 % gegen 21 %, und er ist der Zehnte der Siegquote:
  genau der Fall, für den diese Art von Eintrag da ist.
- **Der letzte Ball** — die zeitlich letzte Partie eines eigenen Spieltags
  gegen alle anderen dieses Tages. Jane bei 75 % in 16 Schlussspielen gegen
  55 % davor.
- **Der Ladehemmer** — die Tore im Sturm gegen die Tore über alles. Jane bei
  7,5 statt 8,7 in 26 Sturmspielen. Die negative Seite derselben Frage wie
  „Die Torlaune", und die einzige der fünf Schattenseiten, die trägt.

## Was nicht trägt, und warum

| Eintrag | gescheitert an |
|---|---|
| **Der Trotzkopf** | Vielspieler-Neigung (r = −0,77) und Tor 4: niemand holt gegen Stärkere mehr |
| **Die Torlaune** | Ausschlag 1,12 σ — die Abweichung nach oben im Sturm ist zu gewöhnlich |
| **Der Durchhänger** | Ausschlag 1,49 σ, knapp unter dem Tor. Eine höhere Mindestzahl hilft nicht: die Schwelle steht auf der Monatsachse |
| **Der Nachlass** | Ausschlag 0,99 σ |
| **Die Pflichtaufgabe** | Kein Halter: in dieser Liga holt jeder als Favorit MEHR als über alles |
| **Die Zitterhand** | Ausschlag 0,92 σ |

Auffällig: vier der sechs scheitern am Ausschlag, und drei davon sind
Schattenseiten. Die Abweichung nach unten ist in dieser Liga gleichmäßiger
verteilt als die nach oben — es gibt keinen, der eindeutig heraussticht.

## Zwei Befunde für den Katalog

**Ein gesuchtes Maximum hängt an der Spielzahl.** Der erste Entwurf suchte das
beste von allen Zehnerfenstern einer Laufbahn und kam auf r = 0,42. Wer
zwanzig Partien hat, hat elf Fenster; wer 350 hat, hat 341 — und das Maximum
aus vielen Ziehungen ist größer. Derselbe Fehler wie beim
„unwahrscheinlichsten Spieltag" [§C39]. Mit dem **festen** letzten Fenster
fällt r auf 0,15.

**Eine feste Teilung hat das Problem nicht.** Sturm gegen alles, Favorit gegen
alles, erste Hälfte gegen zweite, letzte Partie des Tages gegen die davor: es
wird nichts ausgewählt, also gibt es keinen Auswahlvorteil. Alle vier
tragenden Kandidaten sind von dieser Art.

## Vorbehalt

Der Ausschlag wird an **drei** gewerteten Monaten gemessen — das ist für ein
Urteil dünn. Für die vier tragenden reicht es als Hinweis, nicht als
Kalibrierung. Die Schwellen gehören vor dem Einbau an mehr Monaten
nachgerechnet, so wie der Monatskatalog sie bekommen hat.

Und §C35 gilt weiter: ein neuer Rekord verschiebt das Prestige jedes Halters,
zieht §10.2 und §10.3 mit und braucht ein Icon, das keine andere Disziplin
trägt.
