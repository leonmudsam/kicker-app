# §C31 Drei Rückblicke, ein Baukasten

## Regel

- Saison-, Wochen- und Tagesrückblick bauen aus denselben Teilen (`rcpKopfHtml`, `rcpHeldHtml`, `rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`, `rcpAbschnitt`) und aus den Bauteilen, die die App schon hat (`.podest`, `.rrow`).
- Ein Gold je Blatt: die Marke im Kopf und der Sieger. Der Saison-Rückblick hat keine Heldenkarte, das Podest ist der Held.
- Der Meister hat eine Bühne (`saisonRang`, `saisonPodestHtml`, `saisonSpitze`, `saisonRennenHtml`, `saisonSpitzeHtml`, `saisonZellenHtml`); die Elo je Tag kommt aus `getSeasonPositionHistory`, keiner zweiten Rechnung.
- Woche und Tag zeigen Held und Feld (`rcpWocheHtml`, `rcpEloBahnHtml`, `rcpFeldHtml`). Der Spieler der Woche steht vor dem Strahlenkranz der Meisterbühne, leiser (`rcpHeldHtml` mit `strahl`, `.nf-ms-strahl.leise`); Wappen, Name und Zahlen heben sich nacheinander herein. Die Woche nennt dazu ihre Zahlen (Spieltage, Tore je Partie, enge Partien, Duos) und die Elo-Linie des Helden.
- Der Saison-Rückblick stellt das Podest auf die Meisterbühne (`.nf-meister.rcp-buehne`), Platz 3, 2 und 1 steigen nacheinander auf; die Eckdaten tragen den Unterschied zum Vormonat (`rcpZahlenHtml` mit `d`), und unter der Rangliste stehen der größte Sprung und der tiefste Fall gegenüber dem Vormonat — nur, wer in beiden Monaten in der Rangliste steht.
- Die Auszeichnungen eines Zeitraums kommen aus der Rechnung des Awards-Reiters für genau diesen Zeitraum (`rcpAwardKacheln`, `awardRankings` mit `awSeasonId` oder `awWeekStart`), nie aus einer eigenen.
- Ein Rückblick zeigt den Stand von damals (`insigniumSvg` mit `opt.titel`, `opt.pos`); der Reif bleibt der heutige.
- Gestaltung steht im CSS; ein `style`-Attribut trägt nur einen berechneten Wert.

## Stellen

`05b-recap-teile.js` (`rcpAwardKacheln`), `07b-rueckblick.js`, `06-db.js` (`showSeasonRecap`), `src/css/09-recap.css`.

## Prüfung

`tests/tafel` rechnet Tage an der Spitze und das Titelrennen aus den rohen Partien nach und misst die Inline-Styles; `tests/blatt` hält die Auszeichnungen der Woche gegen den Awards-Reiter, zählt die Zahlen der Woche nach, misst die Heldenkarte bei 360 px und rechnet den Vergleich der Saison mit dem Vormonat nach.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Saison, Woche und Tag bauen aus
denselben Teilen (`05b-recap-teile.js`): `rcpKopfHtml`, `rcpHeldHtml`,
`rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`,
`rcpAbschnitt`. Wo die App das Bauteil schon hat, wird es benutzt [§C27]:
das Podest des Saison-Rückblicks ist `.podest`/`.pod-karte` wie in der
Ewigen Tafel, seine Rangliste ist `.rrow` wie im Liga-Tab.
**Ein Gold je Blatt.** Die Marke im Kopf und der Sieger — sonst nichts.
Kacheln und Zeilen sind Metall, Rot bleibt der Richtung [§C25]. Als acht
Kacheln golden umrandet waren, sagte Gold nichts mehr, und der Sieger
stach aus nichts mehr heraus.
Der Saison-Rückblick hat **keine** Heldenkarte: das Podest IST der Held,
eine Karte darüber sagte dasselbe ein zweites Mal. `rcpHeldHtml` gehört
Woche und Tag; dort hat der Held kein Banner, weil eine Ligaposition mit
einer Woche nichts zu tun hat.
**Der Meister hat eine Bühne** (`saisonRang`, `saisonPodestHtml`,
`saisonSpitze`, `saisonRennenHtml`, `saisonSpitzeHtml`,
`saisonZellenHtml`). Die Karte „X ist Saison-Champion" war die seltenste
des Monats und stand im Feed als Fun Fact — `_newsSorte` kannte den Typ
nicht, zwei Sätze, kein Bild —, ihr Blatt nannte drei Elo-Zahlen und die
Saison-ID, und der Nachsatz schrieb „Die Saison 2026-08 ist Geschichte …
Vor Johannes." Jetzt trägt sie die Form des Helden [§C25]: das Podest
unter einem goldenen Strahlenkranz, im Fuß das Titelrennen klein und die
Tage vorn; das Blatt zeigt dazu das Rennen groß mit einem Band, das an
jedem Spieltag in der Farbe dessen steht, der vorn lag, die Tage an der
Spitze als Balken und die Saison des Meisters als Zellen. Der Nachsatz
nennt den Monat beim Namen und erzählt, wann der Titel entschieden war —
Elo und Vorsprung stehen schon im Podest. Das Podest ist dasselbe wie im
Saison-Rückblick, der seine Rangliste seitdem aus `saisonRang` nimmt; die
Elo je Tag kommt aus `getSeasonPositionHistory` (`eloByDay`,
`spielTage`), aus derselben Schleife, die die Linien des
Positionsverlaufs zeichnet — eine zweite Rechnung über dieselben Deltas
nennte irgendwann einen anderen Ersten. `tests/tafel` rechnet die Tage
vorn und das Ende des Rennens aus den rohen Partien nach.
**Woche und Tag zeigen den Helden und das Feld** (`rcpWocheHtml`,
`rcpEloBahnHtml`, `rcpFeldHtml`): die Woche des Spielers der Woche als
Spieltage, der Tag des Spielers des Tages als Bahn samt Elo-Kurve, und
darunter jeder Spieler der Woche oder des Tages als Balken seiner Bilanz.
Zwei Kacheln mit Zahlen sagten nicht, wie knapp es war. **Der
Saison-Rückblick zeigt nach der Rangliste das Titelrennen, die Tage an der
Spitze und die Saison des Meisters** — dieselben Bauteile wie die
Meisterbühne; die Rangliste und die Kennzahlen bleiben oben, weil sie die
Fragen beantworten, mit denen man den Rückblick öffnet.
Ein Rückblick zeigt den Stand von DAMALS: `insigniumSvg` nimmt dafür
`opt.titel` und `opt.pos` entgegen. Der Reif bleibt der heutige — die
Laufbahn ist eine Karriere und kein Monat.
Gestaltung gehört ins CSS: ein `style`-Attribut trägt einen berechneten
Wert (Avatarfarbe, `--rav`, Farbton), nie ein ganzes Bauteil. Vorher
standen Wochen- und Tages-Rückblick zu großen Teilen als Inline-Style im
JavaScript, und derselbe Spieler sah in drei Rückblicken dreimal anders
aus. `tests/tafel` misst beides.

**Die Woche hat eine Bühne und ihre Auszeichnungen.** Der Wochenrückblick
rechnete Torjäger, Abwehr, Team und Überraschung selbst, ohne die
Mindestzahl an Partien und mit einer eigenen Elo-Simulation der Woche, und
jede Kachel öffnete das Award-Blatt derselben Woche — auf dem ein anderer
stehen konnte. Jetzt kommen die Kacheln aus `awardRankings('week')` für
diese Woche, wie die des Saison-Rückblicks aus der Saison: bis zu zehn,
Metall vorn, Schattenseiten rot dahinter; die längste Serie fehlt, wenn
sie schon unter dem Helden steht. Die vier Zahlen der Heldenkarte standen
bei 360 px untereinander und ab 336 px als drei und eine: die Breite der
Zellen rechnet mit 8 px Abstand, die Karte setzte 16.

**Die Saison misst sich am Vormonat.** Ein Monat für sich sagte nicht, ob
die Liga mehr gespielt hatte oder wer vorangekommen war: 161 Partien sind
viel oder wenig, je nachdem, was davor war. Die Eckdaten tragen deshalb den
Unterschied zum Vormonat, ohne Farbe — mehr Partien sind kein Lob —, und
unter der Rangliste stehen der größte Sprung und der tiefste Fall. Das
Podest steht auf derselben Bühne wie in der Meister-Story [§C27], und die
Auszeichnungen sind dieselbe Liste wie dort mit der Siegquote in engen
Partien, Plus-Minus, Underdog, dem höchsten Sieg und der längsten
Pleitenserie dazu.

