# §C39 Die Monatschronik fragt nicht, wer der Beste ist

Der alte
Monatskatalog maß fast überall das Können, und wer eine Quote gewinnt,
gewinnt fast jede. Er ist vollständig ersetzt: vierundsechzig Chroniken, die
nach der **Abweichung von der Erwartung** fragen, nach **Konstanz**, nach
dem **Verhältnis zum Ligamittel** desselben Monats, zu einem **bestimmten
anderen Spieler** oder nach einem **seltenen Einzelereignis**. Die
Liga-Rekorde der Ewigen Tafel sind davon unberührt; zwanzig Disziplinen tragen
beide Zeitachsen, weil dieselbe Frage auf zwei Zeitachsen in EINE Disziplin
gehört [§13.1] — sie sind in §C35 genannt.
**Das Stichproben-Tor ist niedrig und für alle gleich:** acht Partien im
Monat, fünf in einer Teilmenge (`ST_TEIL`), drei Spieltage. Der alte
Katalog verlangte 15, 20 oder 25 Partien, und damit hing die Chronik an der
Spielzahl statt an der Leistung. Die Besonderheit steckt in der Schwelle,
nicht im Tor: wer zehn Partien spielt und acht klar gewinnt, steht in
derselben Wertung wie jemand mit sechzig.
Jede `monat`-Wertung trägt drei feste Angaben. **`art`** ist
`koennen`, `konstanz`, `fuegung` oder `schatten` und sagt, wofür die Chronik
steht. **`klasse`** ist `legendaer`, `selten` oder `besonders` und sagt, wie
schwer ihre Bedingung zu erreichen ist — beim Kalibrieren an den Daten
geprüft und dann festgeschrieben. **`aus`** ist der Ausschlag der Schwelle:
wie weit sie vom Schnitt aller liegt, die in dieser Disziplin je gewertet
wurden, in Standardabweichungen.
**Die Klasse ist keine Volkszählung.** Sie stand einmal als Grenze für die
Häufigkeit hier — legendär einmal, selten zweimal, besonders dreimal in der
Ligageschichte —, und das wäre mit der Liga selbst falsch geworden: eine
legendäre Bedingung wird mit den Jahren zwangsläufig ein zweites und ein
drittes Mal erreicht und bleibt trotzdem legendär, weil sie keinen Deut
leichter geworden ist. „Auf dem Thron" gehört heute zwei Monaten und ist
legendär. Gedeckelt wird deshalb die **Rate** und für alle Klassen gleich:
höchstens ein Halter je gewerteten Monat. Und ob eine Chronik ihren Platz
verdient, entscheidet ihr Ausschlag, nicht ihre Häufigkeit — `tests/disziplinen`
hält jede an der 1,5-σ-Grenze. Ein Test gegen die heutige Häufigkeit je
Klasse war nicht einmal rot zu bekommen: eine einzelne falsch eingeordnete
Chronik verschiebt den Schnitt ihrer Klasse nicht genug.
**Der Ausschlag trägt das Prestige**, nicht die Seltenheit:
`PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] × aus + PRESTIGE_SELTEN[klasse]`,
gerundet auf fünf. Gemessen liegt der Median-Ausschlag bei 2,17 für
legendäre, 1,79 für seltene und 1,71 für besondere Chroniken — die Klasse
trennt also kaum und darf den Wert nicht tragen. „Der Kontrast" ist die
seltenste Sache im Katalog und trotzdem nur ein Umstand [§C35]. Den Sockel
bekommt jede Chronik außer einer Schattenseite: einen Monatseintrag zu
halten ist an sich etwas Besonderes. Er liegt bei **55** (`PRESTIGE_SOCKEL`):
mit 40 stand eine Chronik im Laufbahnblatt hinter einer einzigen seltenen
Auszeichnung zurück, obwohl sie einen ganzen Monat braucht. „Die Nulldiät"
bringt damit 130 statt 115, und alle Chroniken liegen zwischen 90 und 190.
Die Dämpfung ab der dritten Chronik bleibt, wie sie ist [§C34].
Gerechnet wird mit dem Ausschlag der **Schwelle**, nicht dem des Halters.
Der Schwellen-Ausschlag ist eine feste Eigenschaft der Chronik; der eines
Werts gehörte einem einzelnen Halter und wanderte, sobald neue Monate die
Verteilung verschieben — dann sänke das Prestige aller bisherigen Halter,
und genau dieser Fehler steckte schon einmal in den Auszeichnungen [§C34].
Art, Klasse und Ausschlag werden **einmal an den Daten geprüft und dann
festgeschrieben**, genau wie `BADGE_RARITY`.
Zwei Regeln räumen den Katalog, und beide sind gemessen: eine Chronik muss
ihre Schwelle **mindestens 1,5 σ** hinausschieben können, sonst liegt ihr
Bester kaum weiter draußen als der Durchschnitt; und ihr Wert darf **nicht
an der Spielzahl hängen** — höchstens 0,35 Korrelation. Die zweite nimmt am
meisten weg: „wie viele verschiedene Ergebnisse" liegt bei −0,91, weil wer
zwölf Partien spielt zwangsläufig zwölf verschiedene Ergebnisse hat, und
„der unwahrscheinlichste Spieltag" bei +0,56, weil acht Partien an einem Tag
weiter ausschlagen können als vier. Sie muss außerdem eine
**Leistung** messen — Breite und Anwesenheit zählen nicht, „mit wie vielen
anderen jemand gespielt hat" ist ein Kalender. Reine **Zählungen von
Gelegenheiten** fallen ebenfalls weg: wer mehr spielt, bekommt mehr Chancen
auf ein 10:0 oder eine lange Serie. Die Anteilsformen derselben Fragen
bleiben.
Drei Schwellen sind **vorgegeben und werden nicht kalibriert**: „Der
Tagesregent" verlangt Player of the Day an 60 % der eigenen Spieltage, „Die
Wochenkrone" Player of the Week in JEDER eigenen Woche, „Auf dem Thron" den
zweiten Platz der Liga an jedem Spieltag des Monats. Player of the Week
kommt dabei aus `_periodWinnerMap`, damit Chronik und Auszeichnung nicht
auseinanderlaufen [§C27]; die Tabelle kommt aus der Elo-Bahn von
`getGlobalSim` (`_thronDerLiga`), aus demselben Grund — selbst aus den
Deltas aufsummiert nennt eine zweite Rechnung irgendwann einen anderen
Ersten als der Liga-Tab, weil die Simulation die Elo an jeder Monatsgrenze
zurückdreht.
**„Auf dem Thron" zählt jeden Spieltag des Monats, auch einen ohne eigene
Partie.** Die Tabelle fragt nicht, wer dabei war, und wer aussetzt, kann
überholt werden — damit hängt die Wertung nicht an der Zahl der eigenen
Auftritte. Vor der ersten eigenen Partie des Monats steht niemand in der
Monatstabelle; solche Tage zählen nicht mit, sonst trüge jeder, der später
einsteigt, von vornherein den schlechtesten Platz. Sie ist die Chronik für
den, der nie ausschlägt und trotzdem jeden Monat oben steht: gemessen ist
Leons August in keiner einzigen Rate der Liga die Nummer eins — 90 Partien
ziehen jede Rate zur Mitte —, und die Tabelle hat er trotzdem nie aus der
Hand gegeben. Zwei Monate erfüllen sie (Leon im August, Martin im Juni),
und sie ist trotzdem legendär: die Klasse zählt keine Halter.

**Im Profilkopf steht der Spielertyp, nicht die Wertung** (`monat.beiname`,
`chronBeiname`). Die Pille unter dem Namen trug den Katalognamen, und
„Der Endspurt" liest sich dort wie eine Überschrift statt wie eine
Beschreibung — „Der Ausdauernde" schon. Überall sonst bleibt der
Katalogname: in der Matrix, auf der Plakette, im Blatt und in der Nachricht
geht es um die Wertung, im Profilkopf um den Menschen. Ein eingefrorener
Monat kann eine Chronik tragen, die es nicht mehr gibt; dann bleibt der
gespeicherte Name.
**Das Blatt der Wertung nennt ihn trotzdem** (`.chron-kose`): dort steht,
wie ihr Halter im Profil heißt — außer die Wertung heißt schon so: neun
Blätter trugen „Der Beidfüßige" als Titel und darunter noch einmal als
Beinamen. Sonst war der Beiname nirgends neben seiner
Wertung zu sehen — „Der Nervenkitzel" macht seinen Träger zum
„Dauerzitterer", und wer das Blatt öffnete, erfuhr davon nichts. Er sitzt
im Kopf des Blatts auf einer eigenen Zeile, nicht in der Zahlenreihe
darunter: die trägt die vier Angaben, die den Wert der Chronik bestimmen,
und ein Name ist keine davon. Metall, kein Gold — er zeichnet niemanden
aus [§C25].

**Die Klasse ist zu sehen, nicht nur zu berechnen.** Von den vier Angaben,
die den Wert einer Chronik bestimmen, stand keine einzige in der App: wer
ein Chronik-Blatt öffnete, sah die Bedingung und sonst nichts. Jetzt trägt
die Zelle der Matrix und die des Profilstreifens die Klasse als **Gewicht**
(`data-kl`, dieselbe Farbe in drei Stärken — keine neue Farbe, das
Farbgesetz kennt vier Rollen [§C25]), die Plakette nennt sie in Worten
(`CHRONIK_KLASSE_NAME`, Metall — sie zeichnet niemanden aus), und das
Chronik-Blatt zeigt Klasse, Art, Ausschlag und Prestige als Zahlenreihe —
`rcpZahlenHtml`, das Bauteil der Rückblicke [§C27]. In der Laufbahn stand
neben einem Monatseintrag „Leistung", die Art der DISZIPLIN; den Wert trägt
`monat.art`, also steht dort jetzt „Konstanz" oder „Können".
**Die Zeilen der Matrix ordnet das Prestige**, dann die Zahl der Einträge,
dann der Name. Nach der Zahl allein stand ein Monat mit drei billigen
Einträgen über einem mit einer legendären Chronik — und seit die Chroniken
nach ihrem Ausschlag verschieden viel wert sind, ist die Zahl gar keine
Ordnung mehr.
**Die Matrix steht in einer Karte und sagt mehr als ihre Zellen**
(`_lchronTabelle`). Der Kopf jeder Spalte nennt unter dem Monat die Zahl
seiner Einträge, die laufende Spalte ist getönt, die Namensspalte nennt die
Einträge der Zeile, und eine Legende zeigt die drei Stärken und die
gestrichelte Kante ohne einen Satz dazu. Ein Strich heißt gewertet ohne
Eintrag, eine leere Zelle nicht gewertet: vorher stand in beiden Fällen
derselbe Strich, und wer einen Monat ausgesetzt hatte, sah aus wie einer,
der leer ausging. Die Ruheständler stehen in einer Karte am Ende, zu
(`ruhe_chronik`, `ruhestandChronikHtml`) [§C40]: in der Matrix der aktiven
Liga standen sie zwischen denen, die um die nächste Chronik spielen.
**Ein Kürzel ist ein ganzes Wort und passt in die Zelle.** Fünf endeten auf
einem Punkt („Punktland.", „Angstgegn."), drei liefen über die 54 px der
Zelle. Gezählt wird dafür nicht in Zeichen — „Umschwung" ist kürzer als
„Nachzügler" und breiter —, sondern die gerenderte Breite in `tests/blatt`;
`scrollWidth` taugt nicht, er rundet auf ganze Pixel, und „Augenhöhe" ragte
um ein Viertel Pixel heraus.
**Die Rohsicht liegt in der Engine.** `_seasonTitleCtx` legt je Spieler
`partien` an (jede Partie aus seiner Sicht, in Spielreihenfolge) und daraus
`tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`. Die Chroniken fragen nach
dem schwächsten Spieltag, der schwächsten Woche, dem unangenehmsten Gegner;
solche Fragen lassen sich nicht in vierzig Zähler auflösen, ohne für jede
neue Frage einen neuen Zähler zu erfinden.
