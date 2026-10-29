# §C39 Die Monatschronik fragt nicht, wer der Beste ist

## Regel

- Die Monatschronik fragt nach Abweichung von der Erwartung, Konstanz, dem Verhältnis zum Ligamittel desselben Monats, zu einem bestimmten anderen Spieler, zum eigenen Spiel (vorne gegen hinten, neben neuen Partnern, in der Revanche, nach einem Sieg, gegen bekannte Gegner, gegen die beiden Ersten, neben einem Partner nach zwei Pleiten), zur eigenen Laufbahn (die Tore im Sturm, die Bilanz gegen denselben Gegner) oder einem seltenen Einzelereignis, nicht nach dem Können. Sie soll zeigen, worin ein Spieler besonders ist; dass jeder eine bekommt, ist kein Ziel.
- Eine Können-Chronik misst gegen die Elo-Erwartung (`_stSoll`, `_stTorSteigung`), gegen den eigenen Rest (`_stErsterBall`, `_stSchlussBall`) oder gegen den eigenen Vormonat (`_stVormonat`, `_stVormonatPlatz`), nicht gegen eine feste Latte, die nur der Stärkste erreicht. In den Fixture-Monaten gehören höchstens 38 % der Einträge den ersten drei der Monatstabelle.
- Das Stichproben-Tor ist niedrig und für alle gleich: acht Partien im Monat, fünf in einer Teilmenge (`ST_TEIL`), drei Spieltage. Die Besonderheit steckt in der Schwelle.
- Jede `monat`-Wertung trägt `art` (koennen, konstanz, fuegung, schatten), `klasse` (legendaer, selten, besonders) und `aus` (Ausschlag der Schwelle in σ), jede positive dazu `streu` (Standardabweichung der Größe in ihrer eigenen Einheit), einmal an den Daten geprüft und dann festgeschrieben. Die Klasse folgt dem Ausschlag: ab 2,5 σ legendär, ab 1,9 σ selten, darunter besonders; gesetzt legendär sind nur die zwei, die nach einer Wahrscheinlichkeit fragen („Der Unmögliche Monat", „Der Ausreißer").
- Die Klasse zählt keine Halter. Gedeckelt ist die Rate: höchstens ein Halter je gewerteten Monat.
- Die Klasse ist Farbe und Name (`chronikStufe`): Gold legendär, Lila selten, Metall besonders, Rot eine Schattenseite. Über den Wert entscheidet sie nicht: jede Chronik außer einer Schattenseite bringt den Grundwert 100 (`CHRONIK_GRUNDWERT`), gleich welcher Klasse und Art, dazu den Bonus — 25 je σ, um die der Halter die Schwelle überbietet (`chronikBonus`: `(wert − ab) / streu`, mindestens 1, wer sie überhaupt überbietet, nach oben offen; genau auf der Schwelle nichts). Eine Schattenseite bringt nichts. Der Wert des Halters steht in der Tafel und im eingefrorenen Monat (`awarded[].wert`, `SEASON_TITLES_FREEZE_V` 5). Je Spieler und Monat steht und zählt der wertvollste Eintrag (`chronikEintragVon`), also der mit dem größten Bonus.
- Eine Chronik schiebt ihre Schwelle mindestens 1,2 σ hinaus, korreliert höchstens 0,35 mit der Spielzahl, in beide Richtungen, misst eine Leistung und keine reine Zählung von Gelegenheiten. Elf ältere Chroniken reißen die Korrelation und stehen namentlich im Test (`_SPIELZAHL_ALT`), dazu „Auf dem Thron", das nach dem Platz in der Liga-Tabelle fragt und mit ihr an der Spielzahl hängt (0,38, seit der Positionsbonus der Elo Spezialisten nicht mehr abzieht [§C44]); die Liste wird nur kürzer, eine neue Chronik kommt nicht dazu.
- Ein Vergleich mit der eigenen Laufbahn zählt alle Partien vor dem ersten Tag des Monats und erst ab dreißig davon (`_stLaufbahnVor`), einer gegen einen bestimmten Gegner dazu erst ab zehn Duellen davor und vier im Monat (`_stDuelleVor`, `_stDuellWende`); welcher Gegner gemeint ist, entscheidet die Laufbahn davor und nicht der Monat, sonst suchte sich die Chronik ihren Ausreißer selbst; ein Vergleich mit dem Ligamittel nimmt alle Partien desselben Monats (`C.L`: `torSchnitt`, `engAnteil`, `klarAnteil`, `torAbstand`).
- Wie viel jemand spielt, fragt nur der eigene Anteil an allen Partien des Monats gegen den eigenen Anteil in den Monaten davor (`_stAnteilVor`, Monate ab acht eigenen Partien), nie die Zahl selbst. Mehr als sonst ist eine Fügung, weniger als sonst eine Schattenseite: Anwesenheit ist kein Können [§C34].
- Eine Schattenseite fragt wie ihr Gegenstück gegen das Eigene oder gegen die Rechnung, nicht nach dem Niveau; sonst gehörte sie immer dem Schwächsten der Liga.
- Vorgegeben und nicht kalibriert: „Der Tagesregent" (60 % der eigenen Spieltage), „Die Wochenkrone" (jede eigene Woche, über `_periodWinnerMap`), „Auf dem Thron" (Platz zwei oder besser an jedem Spieltag ab der ersten eigenen Partie, aus der Elo-Bahn von `getGlobalSim`, `_thronDerLiga`).
- Im Profilkopf steht der Beiname (`monat.beiname`, `chronBeiname`), überall sonst der Katalogname; das Blatt nennt den Beinamen in `.chron-kose`, außer er ist der Katalogname. Im Profilkopf steht er als Banner (`.pp-banner`) und nur der der jüngsten **positiven** Monatschronik (`playerTitleBadge`): ein Monat mit nur Schattenseiten verdrängt ihn nicht, hat ein Monat beides, gilt die positive; das Banner bleibt, bis ein neuerer Monat eine positive bringt, und die Zeile darunter nennt seinen Monat („läuft", solange er läuft). Das Banner: ein deckendes Band (Grund aus dunklem Gold unter der Tönung, an den Enden dunkler) mit einer durchgezogenen Naht innen an Ober- und Unterkante und gefalteten Enden, die zum Band hin in den Schatten fallen, Lichthof und Schein im Gold, so groß wie die Pille davor, ohne gestrichelte Kante; beim Öffnen entrollt es sich, danach schieben sich die Enden heraus, alle siebeneinhalb Sekunden ein Glanz; der Monat darunter zwischen zwei goldenen Strichen.
- Die Klasse ist sichtbar: Farbe der Zelle (`data-kl`, `chronikTon`) — in der Matrix und im Profilstreifen die höchste Klasse, die der Spieler im Monat hält (`chronikZellStufe`), auch wenn der Eintrag, der in der Zelle steht und zählt, eine niedrigere trägt; die Zahlen je Stufe unter dem Namen zählen diese Farben, das Band im Kopf die Klassen aller Einträge — Gold mit einem Glanz alle sechs Sekunden, Name auf der Plakette (`CHRONIK_KLASSE_NAME`), Zahlenreihe im Blatt (`rcpZahlenHtml`, `_chronFaktenHtml`): Klasse, Art, Ausschlag und Prestige; mit einem Halter steht unter dem Ausschlag, wie weit er darüber liegt („+0,64 σ“), und unter dem Prestige die Rechnung („100 + 16“), ohne Halter „+ Bonus“. Die Laufbahn nennt je Chronik „Grundwert 100 + 16 für 0,64 σ über der Schwelle“.
- Die Matrix ordnet nach dem Prestige ihrer Zellen (je Monat der Eintrag, der zählt), dann Zahl der Einträge, dann Name; sie steht in einer Karte (`_lchronTabelle`), Ruheständler in einer eigenen Karte (`ruhe_chronik`). Strich heißt gewertet ohne Eintrag, leer heißt nicht gewertet. Der Kopf jeder Spalte nennt den Monat mit seinem Jahr („Okt ’26“), sonst sind nach dem zweiten Jahr zwei Oktober nicht zu unterscheiden, und zeigt die Zahl und als Band die Stufen ihrer Einträge, die Zeile unter dem Namen je Stufe die Zahl ihrer Zellen, die Zelle „+N", wenn der Spieler im Monat mehr hält; die Legende nennt die Stufen, ohne Wert.
- Ein Kürzel (`short`) ist ein ganzes Wort und passt gerendert in 54 px.
- Die Rohsicht liegt in der Engine (`_seasonTitleCtx`: `partien`, `tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`).
- Spieltage zählen erst, wenn sie zu sind (`_tagZu`): `tagGrp`, die letzte Partie eines Tages, die Tagesquoten und das Tagesende von „Auf dem Thron"; „Der Tagesregent" teilt durch diese Tage (`tagN`). Wochen bleiben offen gezählt — eine Woche geht Tage nach ihrer letzten Partie zu, und ihr Ende stünde in der Tafel eines anderen Tages.

## Stellen

`32-chronik-katalog.js` (`DISZIPLINEN`, `_stWertung`, `_stSoll`, `_stTorSteigung`, `_stErsterBall`, `_stVormonat`, `_stVormonatPlatz`, `_stLaufbahnVor`, `_stDuelleVor`, `_stDuellWende`, `_stPartnerTief`), `33-chronik-engine.js` (`_seasonTitleCtx`, das Ligamittel `L`), `35-chronik-ui.js`, `35b-prestige.js` (`chronikPunkte`, `chronikBonus`, `chronikUeber`, `CHRONIK_GRUNDWERT`, `CHRONIK_BONUS_JE_SIGMA`).

## Prüfung

`tests/rechnen` zählt den laufenden Tag erst um 23:59; `tests/archiv` friert einen Monat der alten Fassung neu ein und sonst keinen; `tests/disziplinen` hält jede Chronik an 1,2 σ, an der Spielzahl-Korrelation und am Halterdeckel, die Klasse an ihrem Band des Ausschlags, den Grundwert 100 für jede Klasse, die Streuung jeder positiven Chronik gegen die Fixture-Monate, den Bonus (71 % statt 60 % beim Tagesregenten bringen 116, 25 je σ, mindestens 1, „höchstens“ in dieselbe Richtung, in der Regel zwischen 1 und 50) und den eingefrorenen Wert jedes Halters, zählt den Anteil der ersten drei, rechnet „Der Sprung" und „Die Kletterpartie" aus den rohen Partien beider Monate nach, ebenso die acht Chroniken gegen das Eigene, deren sieben positive an mindestens fünf Spieler und höchstens zu einem Viertel an den Monatsersten gehen, und die acht gegen Ligamittel, Laufbahn davor und die Laufbahnfragen auf der Monatsachse mit ihren fünfzehn Haltungen, ebenso die Schattenseiten gegen das Eigene und den Anteil an den Partien mit ihren zwölf Haltungen, keine davon bei den ersten drei eines Monats, und die sieben der fünften Fassung Wert für Wert mit ihren sechs Haltungen, keine Chronik mehr als zweimal, verwirft eine Chronik der alten Fassung und rechnet das Banner aus der Tafel jedes Monats nach (die jüngste positive Chronik); `tests/blatt` misst jedes Kürzel des Katalogs in der Zelle, die Farbe jeder Zelle nach ihrer Stufe, den Glanz nur auf Gold, die höchste Klasse des Monats als Farbe der Zelle auch über einem Eintrag niedrigerer Klasse, „+N", die Zahlen je Stufe unter dem Namen, das Band im Kopf und die Legende ohne Wert, die Zahlenreihe einer gehaltenen Chronik mit Grundwert, Bonus und Abstand zur Schwelle, ohne dass eine Zeile ihre Zelle verlässt, die Laufbahn mit Grundwert und Bonus, das Jahr jedes Monats im Kopf in seiner Spalte, und das Banner im Profilkopf: deckend, mit Naht, Falte, Lichthof und Entrollen.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Der alte
Monatskatalog maß fast überall das Können, und wer eine Quote gewinnt,
gewinnt fast jede. Er ist vollständig ersetzt durch Chroniken, die
nach der **Abweichung von der Erwartung** fragen, nach **Konstanz**, nach
dem **Verhältnis zum Ligamittel** desselben Monats, zu einem **bestimmten
anderen Spieler** oder nach einem **seltenen Einzelereignis**. Die
Liga-Rekorde der Ewigen Tafel sind davon unberührt; zweiundzwanzig Disziplinen tragen
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
schwer ihre Bedingung zu erreichen ist; sie folgt dem Ausschlag und wird mit
ihm festgeschrieben. **`aus`** ist der Ausschlag der Schwelle:
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
hält jede an der 1,2-σ-Grenze. Ein Test gegen die heutige Häufigkeit je
Klasse war nicht einmal rot zu bekommen: eine einzelne falsch eingeordnete
Chronik verschiebt den Schnitt ihrer Klasse nicht genug.
**Den Wert trägt nicht die Klasse.** Sie trug ihn, 150, 100 und 50, und
damit brachte ein besonderer Monat ein Drittel eines legendären, auch wenn
sein Halter die Latte weit hinter sich ließ; wer sie gerade eben riss, bekam
dasselbe wie einer, der sie verdoppelte. Jetzt bringt jede Chronik außer
einer Schattenseite denselben Grundwert, 100: wer in einem Monat etwas
erreicht, wofür es eine Chronik gibt, wird dafür belohnt, auch wenn wenig
Können darin steckt. Die Klasse bleibt als Farbe und Name, sie sagt, wie
weit draußen die Latte hängt. Dazu kommt der **Bonus**: wie weit der Halter
die Schwelle überbietet, in Standardabweichungen der Chronik, 25 je σ.
Prozentpunkte, Siege in Folge, Tore und Elo sind verschiedene Währungen;
erst in σ lässt sich sagen, ob elf Prozentpunkte über einer Quote mehr
sind als drei Siege über einer Serie. Gemessen an den echten Partien liegt
der Bonus fast immer zwischen 1 und 50, der Median bei 9; „Der Aufdreher"
mit 45 % aller Partien statt 11 % bringt 77. Genau auf der Schwelle gibt es
keinen, und wo die Schwelle schon das Höchste ist („Die Wochenkrone": jede
eigene Woche), auch nicht. Die Dämpfung ab der dritten Chronik bleibt, wie
sie ist [§C34].
Gerechnet wird mit **festgeschriebenen** Größen: der Schwelle `ab` und der
Streuung `streu`, beide einmal an den Daten gemessen. Eine Streuung, die mit
der Liga wandert, verschöbe das Prestige aller bisherigen Halter, sobald
neue Monate die Verteilung verschieben, und genau dieser Fehler steckte
schon einmal in den Auszeichnungen [§C34]. Der Wert des Halters dagegen
gehört seinem Monat und friert mit ihm ein (`SEASON_TITLES_FREEZE_V` 5);
ohne ihn brächte ein abgeschlossener Monat nur den Grundwert, und dieselbe
Chronik zählte nach dem Monatswechsel weniger als davor.
Art, Klasse und Ausschlag werden **einmal an den Daten geprüft und dann
festgeschrieben**, genau wie `BADGE_RARITY`.
Zwei Regeln räumen den Katalog, und beide sind gemessen: eine Chronik muss
ihre Schwelle **mindestens 1,2 σ** hinausschieben können, sonst liegt ihr
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
geht es um die Wertung, im Profilkopf um den Menschen. Dort steht er als
Banner und nicht mehr als Pille: die laufende Chronik trug eine gestrichelte
Kante, und die sah aus wie ein Knopf, der noch lädt — für einen Beinamen,
der ein Titel ist, das falsche Bild. Dass der Monat noch läuft, sagt die
Zeile darunter ohnehin. Flach und mit Enden in der Farbe des Bands las es
sich trotzdem als Schild; die Falte, der Lichthof und das Entrollen machen
es zum Titel. Die Tönung allein war durchscheinend, und durch das Band sah
man den Kopf des Profils in seiner Rangfarbe — Glas statt Stoff. Darunter
liegt deshalb ein deckender Grund aus dunklem Gold.
**Im Banner steht nur, was ein Titel ist.** Es zeigte den Eintrag des
laufenden oder letzten Monats, auch eine Schattenseite, rot: Jannik trug im
August „Der Durchlässige" (Das Scheunentor) statt „Der Zugeknöpfte" aus dem
Juni, und wer einen schlechten Monat hatte, verlor damit den Titel eines
guten. Jetzt bleibt der letzte positive Beiname stehen, bis ein neuerer
Monat einen positiven bringt. Ein eingefrorener
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
die Zelle der Matrix und die des Profilstreifens die Klasse als Farbe
(`data-kl`, `chronikTon`, unten: „Die Klasse ist Farbe"), die Plakette nennt sie in Worten
(`CHRONIK_KLASSE_NAME`, Metall — sie zeichnet niemanden aus), und das
Chronik-Blatt zeigt Klasse, Art, Ausschlag und Prestige als Zahlenreihe —
`rcpZahlenHtml`, das Bauteil der Rückblicke [§C27]. In der Laufbahn stand
neben einem Monatseintrag „Leistung", die Art der DISZIPLIN; den Wert trägt
`monat.art`, also steht dort jetzt „Konstanz" oder „Können".
**Die Zelle trägt die höchste Klasse des Monats.** Seit der Bonus
entscheidet, welcher Eintrag zählt, schlägt eine besondere Chronik eine
legendäre, wenn ihr Halter die Schwelle weiter überbietet. Mit der Farbe
ihrer eigenen Klasse stand dann ein grauer Monat in der Matrix, in dem
jemand eine goldene hielt. Gezeigt wird der Eintrag, der zählt, in der
Farbe der höchsten Klasse, die der Spieler im Monat hält.
**Die Zeilen der Matrix ordnet das Prestige ihrer Zellen**, dann die Zahl
der Einträge, dann der Name. Gezählt wird je Monat der Eintrag, der in der
Zelle steht und fürs Prestige zählt. Vorher zählte jeder Eintrag eines
Monats mit; seit jede Chronik denselben Grundwert bringt, war das nur noch
ihre Zahl, und neun Einträge in einem Monat standen über drei Monaten mit
je einem.
**Die Matrix steht in einer Karte und sagt mehr als ihre Zellen**
(`_lchronTabelle`). Der Kopf jeder Spalte nennt unter dem Monat die Zahl
seiner Einträge und zeigt als schmales Band, wie sie sich auf die Stufen
verteilen; die laufende Spalte ist getönt. Unter dem Namen steht je Stufe,
wie viele Zellen der Zeile sie tragen — „5 Einträge" sagte nicht, welche.
Eine Zelle nennt in der Ecke, wie viele Einträge ihr Spieler im selben
Monat daneben hält („+2"): die Matrix zeigt je Monat einen, und dass Martin
im August neun hielt, stand nirgends. Die Legende zeigt die vier Stufen mit
ihrem Wert und die gestrichelte Kante ohne einen Satz dazu. Ein Strich heißt gewertet ohne
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
um ein Viertel Pixel heraus. Gemessen wird jedes Kürzel des Katalogs, nicht
nur, was die Matrix gerade zeigt: „Wochenkron" und „Traummonat" liefen über,
fielen aber nicht auf, weil sie in den Fixture-Monaten niemand hielt — heute
heißen sie „Krone" und „Traumlauf".
**Die Rohsicht liegt in der Engine.** `_seasonTitleCtx` legt je Spieler
`partien` an (jede Partie aus seiner Sicht, in Spielreihenfolge) und daraus
`tagGrp`, `wochGrp`, `partnerGrp`, `gegnerGrp`. Die Chroniken fragen nach
dem schwächsten Spieltag, der schwächsten Woche, dem unangenehmsten Gegner;
solche Fragen lassen sich nicht in vierzig Zähler auflösen, ohne für jede
neue Frage einen neuen Zähler zu erfinden.

**Eine feste Latte erreicht nur der Stärkste.** Fünf Können-Chroniken
fragten trotz der Regel oben nach dem Niveau: zwei Tore Differenz je Partie
(„Der Deutliche"), gegen jeden regelmäßigen Gegner mehr Siege als
Niederlagen („Kein Angstgegner"), 85 % der ersten und 75 % der letzten
Partien eines Spieltags („Der Kaltstart", „Der Endspurt"), jeder Spieltag
nicht negativ („Der Tagesabschluss"). Gemessen gingen damit 42 % aller
Einträge der Fixture-Monate an die ersten drei der Monatstabelle, bei
zwölf Spielern wären es nach ihrem Anteil 25 %, und „Kein Angstgegner"
korrelierte mit 0,42 mit der Spielzahl. Jetzt messen sie gegen die
Elo-Erwartung — die erwarteten Siege je Gegner und je Spieltag, die
Tordifferenz, die die Siegchance erwarten ließ (die Steigung aus den
Partien des Monats selbst) — oder gegen den eigenen Rest: die erste Partie
eines Spieltags gegen die übrigen, wie ihr Gegenstück „Der letzte Ball".
„Der Deutliche" ging damit an Johannes auf Platz elf und Leon auf Platz
sechs, und der Anteil der ersten drei sank auf 35 %. Schwellen und
Ausschlag sind über alle fünf Monate der Liga gemessen.

**Der Vormonat ist ein Maßstab.** „Der Sprung" verlangt eine Siegquote
25 Prozentpunkte über der des Vormonats, „Die Kletterpartie" vier Plätze
weiter vorn in der Monatstabelle, beide ab acht Partien in beiden
Monaten. Wer im Vormonat schwach war, hat mehr Raum nach oben, und wer
ganz oben steht, kann kaum noch steigen: beide belohnen die Verbesserung
und nicht das Niveau. Als Erster hielt beide Johannes, im Juli auf Platz
sieben der Tabelle.


**Die Klasse ist Farbe.** Die Zelle trug den Ton ihrer Disziplin
und die Klasse nur als Stärke derselben Farbe, und der Wert rechnete aus
Sockel, Art × Ausschlag und einem kleinen Zuschlag der Klasse: alle lagen
zwischen 90 und 190, „Der Kontrast" (legendär) brachte 95 und „Die weiße
Weste" (besonders) 110, und eine goldene Zelle konnte weniger wert sein als
eine blasse. Jetzt folgt die Klasse dem Ausschlag der Schwelle — 32
Chroniken haben dabei ihre Klasse gewechselt —, und an der Farbe liest man
ab, wie weit draußen die Latte hängt. Eine Zeit lang war die Farbe auch der
Wert, Gold 150, Lila 100, Metall 50, und eine Fügung zählte zuerst halb wie
bei den Rekorden [§C35]; eine besondere brachte 25 — „Der Aufdreher" mit
45 % aller Partien eines Monats statt 11 % stand damit unter der kleinsten
Auszeichnung, die sich wiederholt. Seitdem zählt die Art nicht mehr, und
seit dem Grundwert mit Bonus (oben) auch die Klasse nicht. Je Monat steht und zählt der
wertvollste Eintrag; vorher war es der erste im Katalog, und der ordnet nach
Art und Ausschlag, nicht nach Wert.
**Acht Chroniken fragen nach dem Eigenen.** In den Fixture-Monaten gingen 21
bis 28 Einträge an neun oder zehn Spieler, und die Mitte des Feldes fand
sich in keiner Wertung wieder, die nach ihr fragte. „Der Knipser" und „Der
Riegel" stellen vorne und hinten gegen das eigene Mittel, „Neuland" die
Partien neben neuen Partnern, „Die Revanche" die zweite Partie gegen
dieselben Gegner am selben Tag, „Das Nachlegen" die Partie nach einem Sieg,
„Die Lernkurve" die späteren Duelle gegen dieselben Gegner gegen die
früheren, „Der Spielverderber" die Partien gegen die beiden Ersten — alle
gegen die Rechnung, nicht gegen eine feste Latte; „Der Absturz" ist das
Gegenstück zum Sprung. Ihre Schwellen schieben sich nur 1,2 bis 2,2 σ
hinaus: sechs sind besonders und tragen Metall und 50, „Die Lernkurve" ist
mit 2,17 σ selten. Die Untergrenze liegt deshalb bei 1,2 σ statt 1,5 σ —
über ihr steht der Beste immer noch deutlich außerhalb des Schnitts, und nur
einer je Monat hält sie. Gemessen gehen die sieben positiven in den
Fixture-Monaten neunmal an Alex, Jannik, Jane, Julian, Johannes und Martin,
einmal an den Monatsersten (Martin im August). Mit ihnen bekam der Katalog eine neue Fassung
(`SEASON_TITLES_FREEZE_V`): jeder abgeschlossene Monat wird einmal neu
gerechnet und eingefroren, damit alle Spalten der Matrix dieselben Fragen
stellen. Die dritte Fassung kam mit acht weiteren: vier gegen das
Ligamittel oder die eigene Laufbahn davor („Klare Verhältnisse",
„Der Rollentausch", „Der Ausnahmemonat" und der Widerstand im Monat) und
vier Laufbahnfragen auf der Monatsachse (die ruhige Hand, der Zerstörer,
der schwerste Tag, der Wackelkandidat). Gemessen gehen sie in den
Fixture-Monaten fünfzehnmal an sieben Spieler, und ihr Wert hängt höchstens
mit 0,23 an der Spielzahl. Ein Verhältnis aus 10:0 gegen 0:10 ging nicht:
in 466 Partien endeten acht so, kein Monat hat dafür eine Stichprobe;
„Der Zerstörer" fragt deshalb nach Siegen mit sieben Toren Vorsprung.
Verworfen wurde auch „Der Spätzünder" (Spieltage, die mit einer Niederlage
beginnen und mit einem Sieg enden): dieselbe Frage stellt schon „Die zweite
Luft". Zur selben Fassung gehören neun Schattenseiten, sieben davon
Gegenstücke bestehender Chroniken („Der Fehlstart" zum Kaltstart, „Der
Kräfteverfall" zur zweiten Luft, „Der Einbruch" zur Steigerung, „Die
Sattheit" zum Nachlegen, „Die Ehrfurcht" zum Spielverderber, „Der Rückfall"
zur Lernkurve, „Die stumme Antwort" im Monat zur Antwort) und „Die schwarze
Woche", dazu der Anteil an den Partien in beide Richtungen („Der
Aufdreher", „Der Rückzug"). Die Zahl der Partien gegen den Vormonat hing
mit 0,63 an der Spielzahl, weil die Liga im Juni ein Vielfaches des Mai
spielte; der Anteil an den Partien hängt mit −0,02 daran. Verworfen wurden
die verpatzte Revanche (dieselben zwei Spieler wie anderswo), „Der
Lieblingsgegner" (0,54 an der Spielzahl) und der unwahrscheinlichste Sieg
im Monat (0,45).

**Die fünfte Fassung fragt nach Wendepunkten.** Sieben weitere Chroniken,
gemessen an allen Monaten der Liga, nicht nur an den Fixtures. Vier
vergleichen mit der eigenen Laufbahn oder mit einem Gegenüber: „Der
Bannbrecher" schlägt den Gegner, gegen den die Laufbahn davor am
schlechtesten lief, um mindestens 25 Prozentpunkte besser als davor,
„Die Retourkutsche" ist das Gegenstück gegen den liebsten Gegner, „Das
Zielwasser" trifft im Sturm mindestens 0,65 Tore je Partie mehr als in den
Sturmspielen davor, „Die Stütze" gewinnt neben einem Partner, der die zwei
Partien davor verloren hatte, über die Rechnung hinaus — die zwei Partien
zählen über die Monatsgrenze hinweg, denn wer am Ersten aus zwei Pleiten
des Vormonats kommt, ist nicht weniger angeschlagen. Drei sind
Schattenseiten bestehender Gegenstücke: „Die weichen Knie" bekommen zum Rekord die Monatsachse (80 %
der Partien mit einem Tor Unterschied verloren), „Der Abgesang" ist die
Kehrseite des letzten Balls, „Das Fremdeln" die von „Neuland". Bannbrecher
und Retourkutsche wählen den Gegner aus der Laufbahn davor: wählte der
Monat ihn aus, gewönne die Chronik immer der, der gegen irgendwen einmal
ausreißt, und das ist bei vier Duellen jeder. Gemessen hängt keine der
sieben mit mehr als 0,19 an der Spielzahl, und an den echten Partien gehen
sie in fünf Monaten elfmal an fünf Spieler. Verworfen wurden der
Manndecker und der Knacker (Gegentore gegen einen Stürmer unter dessen
Schnitt, Tore gegen einen Verteidiger darüber: 0,72 und 0,69 mit der
Siegquote, der Manndecker −0,94 mit „Das Scheunentor"), „Der Klotz am Bein" (der Partner
gewinnt ohne ihn mehr: −0,97 mit der Siegquote, eine zweite Siegquote),
„Der Phönix" (der Aufstieg vom Elo-Tief des Monats: 0,70 an der
Spielzahl), der Sprenger und der Pflichtsieg (gegen eingespielte Duos und
gegen die beiden Letzten: 0,90 und 0,60 mit „Das Übersoll", dieselbe
Frage noch einmal) und das Spiel auf der Nebenposition (vier Werte in fünf
Monaten, keine Stichprobe). Mit der fünften Fassung wird jeder
abgeschlossene Monat noch einmal gerechnet und eingefroren.
