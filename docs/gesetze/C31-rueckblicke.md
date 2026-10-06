# §C31 Drei Rückblicke, ein Baukasten

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
