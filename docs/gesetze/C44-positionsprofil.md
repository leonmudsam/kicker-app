# §C44 Das Positionsprofil: wo jemand spielt und wo er besser ist

## Regel

- Das Positionsprofil ist eine Zahl zwischen 5 und 95 % Sturm (`positionsLage`, `positionsProfilWert`). Es addiert zwei Chancen: den Anteil der Partien vorne, ln((Sturm + 1) / (Abwehr + 1)), und `POS_LEISTUNG` (4) mal den Abstand der Leistung gegen die Erwartung je Partie, vorne gegen hinten.
- Die Leistung je Position misst gegen den eigenen Schnitt aller Partien, nicht gegen null, und wird mit `POS_SCHRUMPF` (15) Partien dorthin gezogen. Wenige Partien auf einer Seite sagen wenig; keine Mindestzahl schaltet eine Seite hart ein oder aus.
- Verglichen wird je Partie, nie die Summe: eine Summe wächst mit der Zahl der Partien.
- Eine Rechnung für jede Frage nach der Position eines Spielers: das Profil und seine Einstufung (`posClassify`), die hell gezeichnete Rolle im Profil (`staerker`, gleichauf bis drei Prozentpunkte), das Blatt „So entsteht die Einstufung", der Positionsbonus der Elo-Rechnung, „Der Wandler", das Durchwechseln im Match-Builder und die Spalte `players.atk`.
- Der Positionsbonus der Elo (`posFactor`) misst gegen die eigene Aufteilung und wirkt nur auf der Seite unter der eigenen Mischung: dort bringt ein Sieg mehr und kostet eine Niederlage weniger. Auf der Stammposition ist der Faktor genau 1 — wer dauerhaft hinten (oder vorne) spielt, verliert durch die Position nichts. `pos_swing` ist die größte Verschiebung. Gespeicherte Deltas bleiben, wie sie sind [§3.5a]; die Regel gilt für neue Partien und für eine Neuberechnung aus den Einstellungen.
- Der Wert der Positions-Rangliste (`posWert` [§5.2]) fragt etwas anderes, nämlich wer auf einer Position der Beste der Liga ist, und bleibt getrennt. Die Erklärung dort sagt das.
- Karriereende [§C40]: das Profil vergleicht einen Spieler nur mit sich selbst und entsteht aus den eigenen Partien; es fragt weder `sichtbar` noch `ligaAktiv`.

## Stellen

`05-rang-elo.js` (`POS_SCHRUMPF`, `POS_LEISTUNG`, `positionsLage`, `positionsProfilWert`, `posFactor`, `atkStrength`, `posClassify`), `10-elo-engine.js` (Positionsbonus in `simulateEloWithSliders`), `18-profil.js` (Positions-Profil, Rollen, `zeigeProfilPosInfo`), `22-team-profil.js` (Aufschlüsselung „Positions-Bonus"), `32-chronik-katalog.js` („Der Wandler"), `20-bind.js` (Durchwechseln), `15-views-rest.js` (Erklärung des Positions-Swing), `12-view-positionen.js` (Abgrenzung im Blatt „So entsteht der Wert").

## Prüfung

`tests/rechnen` hält Henry an den echten Partien bei „Reiner Verteidiger" unter dem Anteil seiner Sturmpartien und prüft, dass gleiche Leistung je Partie auf beiden Seiten nur den Anteil der Partien übrig lässt, dass wenige Partien auf einer Seite zum eigenen Schnitt gezogen werden, dass mehr Partien und bessere Leistung vorne das Profil heben, dass `staerker` der Leistung folgt und nicht der Siegquote, dass die Stammposition in der Elo nichts kostet, auch bei dauerhaft einer Position, und nur die schwächere Seite einen Ausgleich bekommt und dass die Elo-Rechnung dieselbe Lage aus den Partien davor liest; `tests/disziplinen` legt „Der Wandler" und das Profil nebeneinander; `tests/blatt` misst die hell gezeichnete Rolle gegen `staerker` und das Blatt der Einstufung bei 360 px.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Henry stand im Profil bei 29 % Sturm und 71 % Abwehr, eingestuft als
Verteidiger. Gespielt hatte er 15 Partien vorne mit 4 Siegen und 187
hinten mit 76 Siegen: vorne 25 Prozentpunkte unter der Erwartung je
Partie, hinten 3. Die alte Rechnung mischte zu gleichen Teilen den Anteil
der Partien (7 %) und eine Leistungshälfte, die die SUMME der
Überperformance verglich: −3,7 vorne gegen −6,0 hinten. Weil hinten mehr
Partien standen, war das Minus dort größer, und die Leistungshälfte sagte
50:50 — schlechter als in der Abwehr zu spielen schob ihn nach vorne. Wer
insgesamt unter der Erwartung spielt, wurde so auf seine seltenere
Position gedrückt; Jane (vorne 31 %, hinten 66 % Siege) stand bei 33 %,
Leo (vorne 34 %, hinten 52 %) als Abwehr-Flex.

Dazu kamen ein Regler „Positions-Erfahrungs-Gewicht", der Häufigkeit und
Leistung linear mischte, und eine Mindestzahl von drei Partien, ab der eine
Seite voll zählte und darunter gar nicht. Beides ersetzt die Rechnung in
Chancen: die Häufigkeit ist der Anfang, die Leistung verschiebt, und das
Ziehen zum eigenen Schnitt macht aus drei Partien keinen Beweis. Gemessen
an den echten Partien stehen Henry bei 5 %, Jane bei 11 %, Leo bei 35 %,
Leon bei 77 % und Julian bei 79 %.

Der Positionsbonus der Elo maß gegen 50:50. Für jeden, der fast nur auf
einer Position spielt, war das ein Abzug bei jedem Sieg und ein Aufschlag
bei jeder Niederlage auf der eigenen Stammposition (Henry hinten 0,83 und
1,17): die Elo eines Spezialisten lief nach unten, weil er dort spielte,
wo er es kann. Ein genaueres Profil hätte das verschärft. Gegen die
eigene Aufteilung gemessen, aber in beide Richtungen, blieb ein Rest
(Henry hinten 0,97), den nur ausglich, wer auch vorne spielte; wer
dauerhaft hinten steht, zahlte ihn bei jeder Partie. Schwächere Spieler,
die immer auf derselben Position spielen, dürfen dadurch keinen Nachteil
haben: die Stammposition steht deshalb bei genau 1, und nur ein Sieg auf
der seltenen, schwächeren Seite zählt mehr (Henry vorne 1,32).

Drei Stellen beantworteten die Frage, wo jemand besser ist, auf drei
Arten: das Profil, eine Kopie seiner Formel in der Elo-Rechnung und die
Rollen im Profil, die die rohe Siegquote verglichen und weder Partner noch
Gegner noch die Zahl der Partien kannten. Jetzt antwortet `positionsLage`
für alle. Die Aufschlüsselung einer Partie schrieb nach einer Niederlage
auf der schwachen Position „Starke Position", weil sie den Multiplikator
las statt den Faktor.

Die Erklärung im Reiter Positionen nannte drei Bestandteile ihres Werts,
gerechnet werden vier; die Tore fehlten.
