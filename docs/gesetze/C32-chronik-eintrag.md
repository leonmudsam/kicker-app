# §C32 Ein Chronik-Eintrag gehört dem, der ihn hält

## Regel

- Ein Monatseintrag gehört dem, der den Bestwert in diesem Monat hält, oder niemandem; punktgleich tragen ihn alle.
- Die Matrix zeigt je Spieler und Monat einen Eintrag (`seasonTitleOf`, der erste in Katalogreihenfolge); das ist eine Anzeigeregel, die Tafel (`showSeasonTable`) zeigt alles, und nur dieser eine zählt fürs Prestige [§C34].
- Der Feed sagt bei einem alleinigen Halter mehrerer Einträge, welcher im Profil steht (`_chronikZeigtSich`, Marke `.nf-sam-k` neben dem Text), und nennt den stärkeren Eintrag nur für EINEN Spieler.
- Ein Monat unter `CHRONIK_MIN_TAGE` Spieltagen bekommt keine Chronik; `seasonTitleHalter` zieht dieselbe Grenze und antwortet dann mit `null`. Das Aufgehen der Tafel ist kein Wechsel, aber eine eigene Karte (`chronik_frei`, ohne Partie, Träger in `traeger`).
- Eine Monatswertung findet höchstens einen Halter je gewerteten Monat; die Schwellen (`ab` in `_stWertung`) sind an den echten Partien geeicht.

## Stellen

`33-chronik-engine.js` (`seasonTitles`, `seasonTitleOf`, `seasonTitleHalter`), `26c-news-bausteine.js` (`_chronikZeigtSich`), `27-news-generator.js`.

## Prüfung

`tests/disziplinen` zählt Halter je Monat und nennt die zu tief hängende Schwelle; `tests/ambient` prüft die Chronik-Karten.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Jeder Monatseintrag
geht an den, der den Bestwert in diesem Monat wirklich hält — oder an
niemanden. Halten ihn mehrere punktgleich, tragen ihn alle. Genau wie bei
den Allzeit-Rekorden, und aus demselben Grund.
Dass ein Spieler in der Chronik-Matrix trotzdem nur EINEN Eintrag je Monat
zeigt, ist eine reine **Anzeige**-Regel: `seasonTitleOf` liefert den ersten
in Katalogreihenfolge, und die Katalogreihenfolge ist die Wertigkeit. Die
volle Tafel (`showSeasonTable`) zeigt alles.
**Und der Feed sagt, welcher es ist** (`_chronikZeigtSich`). „Martin holt
zwei Monatschroniken" zählte beide auf und ließ offen, welche davon ihn
im Profil beschreibt — die Frage, die ihr Halter als erste hat. Die Karte
nennt es im Satz („Steht jetzt in der Chronik, vor ‚Die Nulldiät'" oder
„In der Chronik steht weiter ‚Der makellose Tag'"), und in einer
Sammelkarte trägt die betreffende Zeile eine Marke aus zwei Worten
(`.nf-sam-k`, Metall — sie zeichnet niemanden aus [§C25]). Sie steht
NEBEN dem Text und nicht darin: der Text kürzt sich mit
Auslassungspunkten, und eine Marke im abgeschnittenen Teil wäre gar
nicht da. Beantwortet wird die Frage nur für einen Halter, der allein
steht, und nur, wenn er in dem Monat überhaupt mehrere hält: bei zwei
Haltern wäre es eine Behauptung über beide, bei einer einzigen Chronik
ist die Antwort offensichtlich. **Dieselbe Regel gilt für den stärkeren
Eintrag**: „In der Chronik bleibt ‚X' stärker, also kommt für die Laufbahn
kein Prestige hinzu" gehört EINEM Spieler. Bei zwei neuen Haltern sammelte
der Satz beide Einträge ein und behauptete sie für beide, und wer eine
Sammelkarte mit neun Zeilen las, fand darin drei verschiedene „stärker".
Steht der Eintrag selbst in der Tafel, fällt der Name ganz weg: „Steht jetzt
in der Chronik" sagt es eine Zeile darüber schon.
**Und das Blatt hält die drei Ebenen auseinander.** In der Monatstafel kann
ein Spieler mehrere Disziplinen führen, im Profil steht genau eine davon,
und nur diese eine zählt fürs Prestige [§C34]. Die Zeile nannte einen Namen
und einen Wert: wer „Der Nervenkitzel" neben „kein zusätzliches Prestige"
las, konnte nicht sehen, dass dieser Name einem ANDEREN Eintrag gehört und
die Chronik dieser Karte nur in der Tafel steht. Sie nennt jetzt die Zahl
der Einträge in der Tafel, ob der Profileintrag diese Chronik ist oder
welche sonst, und dahinter den echten Zuwachs. Gezählt wird aus
`seasonTitles` — derselben Quelle, aus der die Tafel selbst kommt [§C27].
Vorher galt „ein Eintrag je Spieler" schon bei der Vergabe: wer den
Bestwert hielt und schon etwas trug, gab ihn an den Nächstbesten ab. Damit
stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während einer mit
dreizehn danebensaß — und in den echten Daten ging ein Drittel aller
Einträge an jemanden, der nicht der Beste war. Deshalb gibt es die
Markierung `strict` nicht mehr: sie galt für vier von siebenundzwanzig
Einträgen, und was für vier richtig ist, ist für alle richtig.
Ein Monat unter `CHRONIK_MIN_TAGE` Spieltagen bekommt **gar keine**
Chronik: aus drei Abenden lässt sich kein Monat ablesen. **Der Feed zieht
dieselbe Grenze**, und zwar aus derselben Quelle: `seasonTitleHalter` zog
sie nicht und meldete deshalb Chroniken, die es nicht gab — gemessen acht
Halter am 04.08., zehn am 06.08. und dreizehn am 07.08., während die
Monatstafel null Einträge zeigte. „Leon holt ‚Auf Augenhöhe'" stand im Feed,
im Chronik-Tab stand nichts, und `seasonTitleOf` fand folgerichtig keinen
Eintrag — die Karte schrieb „kein Prestige hinzu" unter eine Chronik, die
sie selbst gerade verkündete. Die Funktion antwortet dafür mit `null` statt
`{}`: ein ungewerteter Monat und ein gewerteter ohne Halter sind zwei
verschiedene Antworten. **Und das Aufgehen der Tafel ist kein Wechsel** —
wer am 2. August fünf von fünf gewonnen hat, hat das nicht am 10. getan;
gemeldet wird erst, was sich von der ersten gewerteten Lage an ändert.
**Es ist aber selbst eine Nachricht** (`chronik_frei`). Am Tag, an dem der
Monat zum ersten Mal gewertet wird, stand deshalb gar nichts im Feed —
obwohl in diesem Moment die ganze Monatstafel entsteht und jeder Eintrag
darin ab jetzt fürs Prestige zählt [§C34]. Eine Karte je Monat, neutral:
sie sagt, ab welchem Spieltag gewertet wird, wie viele Einträge in der
Chronik stehen und von wie vielen Spielern sie gehalten werden, und dass
bis zum Monatsende jeder davon noch wechseln kann. Sie behauptet nicht,
dass diese Einträge in der letzten Partie geholt wurden, und trägt deshalb
auch **keine Partie**: ein Ergebnisband darüber hieße genau das Gegenteil.
Ihr Blatt zeigt die vorläufigen Profileinträge samt Punktewirkung, in
derselben Zeile wie der Chronik-Wechsel [§C27]. Die drei mit den meisten
Einträgen stehen dabei in `traeger` und nicht in `playerIds`: auf der Karte
steht kein Name, und mit Beteiligten hätte der Deckel je Spieler gerade die
Karte gezählt, die es je Monat genau einmal gibt. Im Tagesdeckel gehört sie
zu `TAG_PFLICHT`.
**Eine Monatswertung findet höchstens einen Halter je gewerteten Monat.**
Die Schwellen (`ab` in `_stWertung`) sind an den echten Partien geeicht,
nicht geschätzt. Vorher lagen sie so tief, dass ein Monat vierundzwanzig der
vierunddreißig Wertungen vergab und ein einzelner Spieler neun davon trug:
was fast jeder Monat hergibt, zeichnet niemanden mehr aus. Jetzt sind es
siebzehn bis zweiundzwanzig. Gedeckelt wird die Rate und nicht eine feste
Zahl — eine Zahl wäre mit der Liga von selbst falsch geworden [§C39].
`tests/disziplinen` zählt es nach und nennt die Wertung, deren Schwelle zu
tief hängt.
