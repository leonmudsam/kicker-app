# Etwas hinzufügen — und was daran hängt

Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. Sie
bilden die **drei sichtbaren Quellen des Prestiges** [§C34], und das Prestige
ist die Insignium-Leiter. Wer einen
Eintrag hinzufügt oder streicht, verschiebt
damit, wer welches Zeichen trägt — auch dann, wenn er die Prestige-Datei gar
nicht geöffnet hat.

Die folgenden Listen nennen jede Stelle, die mitgeht. Sie sind vollständig:
was hier nicht steht, hängt auch nicht daran.

# 10.1 Eine Auszeichnung (Badge)

Alles in `17-badges.js`, außer wo anders genannt.

| Stelle | was | wenn es fehlt |
|---|---|---|
| `BADGES[]` | Eintrag mit `id`, `ic`, `name`, `desc`, `count` | — |
| dort `name` | ein Name, den keine Stufe des Karriere-Rangs trägt (`RANKS`) | die Auszeichnung für 150 Partien hieß „Legende" wie die oberste Rangstufe, und im Profil stand dasselbe Wort für zwei Dinge. `tests/disziplinen` misst es |
| dort `desc` | ein Satz ohne Kürzel und Formelzeichen („ab 3 Partien", „höchstens 2 Tore Unterschied", „10:0-Sieg", nicht „20+ Siege") | er steht im Blatt und als Text der Karte im Feed; „Sieg mit Tordifferenz ≥ 7" und „mind. einen Gegner aus den Bottom-2" waren eine Formel. `tests/disziplinen` misst es |
| `BADGE_RARITY` | die Klasse | `rarityOf` liefert still `common`, die billigste — das Badge ist als „Legendary" gedacht und zählt wie ein Zittersieg |
| `RARITY_META.<klasse>.total` | um eins nach | der Zähler im Badge-Blatt („38 von 50") lügt |
| `BADGE_WUERDE` | **nur**, wenn jeder neue saisonweise Erfolg eine neue News-Karte auslösen soll | ohne Eintrag meldet der Feed nur die festen Meilensteine; auf Prestige hat die Liste keinen Einfluss |
| — | nichts weiter für den News-Takt | er hängt an der Klasse (`_badgeTakt`, [§C33]): legendär jedes Mal, selten an `NEWS_BADGE_MARKEN`, gewöhnlich an `NEWS_BADGE_MARKEN_KLEIN` und dort nur in der gemeinsamen Matchkarte |
| `getBadgeEarnedCache` | `fire('id')` | das Badge erscheint nur im Profil: kein Toast, kein Chip im Match-Review |
| `src/js/02-icons.js` | das Icon aus `ic` | die Kachel bleibt leer |

Die ersten fünf Zeilen der goldenen Vitrine folgen `BADGE_PROFIL_ORDER`, je
zwei Einträge pro Zeile: Dynastie/Dominator, 20er/15er Serie,
Meister/Team der Saison, Untouchable/Award-Sammler und Absoluter Sieger/
Mr. Perfect. Danach bleibt die Reihenfolge aus `BADGES[]` stabil. „Absoluter
Sieger" ist Legendary, „Allwetter" Rare; die wiederholbare 10:0-Leistung ist
damit wertvoller als das einmalige Wochentags-Sammelziel.

# 10.2 Eine Disziplin (Monatswertung, Liga-Rekord oder beides)

| Stelle | was | wenn es fehlt |
|---|---|---|
| `32-chronik-katalog.js` `DISZIPLINEN[]` | Eintrag **im richtigen Block**: Leistung, dann Ereignis, dann Schatten | ein Spieler zeigt nur EINEN Monatseintrag, und die Katalogreihenfolge entscheidet welchen [§C32] — falsch einsortiert verdrängt eine Schattenseite seinen Titel |
| dort `art` | `leistung`, `ereignis` oder `schatten` | steuert bei einem Liga-Rekord den Prestige-Wert und bei jedem Eintrag die Katalogreihenfolge; ohne gültige Angabe fällt der Eintrag auf `ereignis` und wiegt die Hälfte. Den Wert einer Monatschronik trägt dagegen `monat.art` [§C39]. `tests/disziplinen` misst es |
| dort `short` | ein ganzes Wort, das in 54 px passt | „Umschwung“ ist kürzer als „Nachzügler“ und breiter, also zählt die gerenderte Breite: `tests/blatt` misst sie am Markup, `tests/disziplinen` verbietet die Abkürzung mit Punkt |
| dort `ic` | ein Icon, das keine andere Disziplin trägt | in einer Zelle von 62 Pixeln ist die Zeichnung das Erste, was man sieht — zwei gleiche sind dort nicht zu unterscheiden. `tests/disziplinen` misst es |
| dort `monat.wie` | ein Satz, was die Zahl im Beleg bedeutet | nur nötig, wenn die Größe nicht selbsterklärend ist. Er steht im Detail-Blatt unter der Bedingung; ohne ihn liest sich „+15 Prozentpunkte" wie Elo oder wie Prestige |
| dort `monat.beiname` | der Beiname fürs Spielerprofil: **Der/Die/Das + Spielertyp** | im Profilkopf stünde der Katalogname, und „Der Endspurt“ beschreibt kein Spielertyp — „Der Ausdauernde“ schon. `tests/disziplinen` verlangt ihn für jede Chronik, höchstens 20 Zeichen, eindeutig, und prüft ihn gegen dieselbe Sprachregel wie Beleg und Bedingung |
| dort `monat.art`, `monat.klasse`, `monat.aus` | die drei festen Angaben einer Chronik [§C39] | ohne `art` gibt es kein Prestige, ohne `klasse` keinen Seltenheitsbonus und kein Gewicht in der Zelle, ohne `aus` ist die Chronik null Punkte wert. `aus` muss mindestens 1,5 σ betragen, sonst liegt der Beste kaum weiter draußen als der Schnitt — `tests/disziplinen` misst es |
| dort `monat` | `mind`, `wert`, `ab` und `ev` über `_stWertung` | ohne die vier gibt es keine Vergabe. `mind` sagt, wer gewertet wird, `wert` die Größe (größer ist besser, bei einer Schattenseite steht ein Minus davor), `ab` die Schwelle. Getrennt aufgeschrieben, weil sonst niemand sagen kann, wer knapp daneben liegt: wer die Schwelle reißt, bekam einen leeren Wert, und leere Werte haben keine Reihenfolge. `ab` wird an den echten Partien gemessen, nicht geschätzt: höchstens ein Halter je gewerteten Monat [§C32] |
| `33-chronik-engine.js` `_seasonTitleCtx` | das Feld, das `monat:` liest | die Monatstafel bleibt leer |
| `34-chronik-rekorde.js` `_chronicleCtx` | **dasselbe Feld noch einmal** | der häufigste Fehler: die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt unbesetzt. Zwei getrennte Durchläufe über dieselbe Frage — sie müssen gleich zählen |
| dort `negativ` | `true`, **nur** wenn die Fügung von einer Niederlage erzählt | sie steht im Profil golden zwischen den Titeln und wird als Rekord mitgezählt [§C25]. Eine `art:'schatten'`-Disziplin braucht das Feld nicht — sie ist ohnehin negativ |
| dort `zufall` | `'quote'` oder `'fund'`, **nur** wenn der Eintrag kein Können misst | ohne ihn steht die Fügung in der Kammer „Bestmarken" neben dem höchsten Elo-Stand der Ligageschichte. Der Wert entscheidet, welche Zusicherung in `tests/disziplinen` für ihn gilt [§C35] |
| dort `paar` | die **id** des Eintrags, der das andere Ende desselben Werts wertet, **nur** bei einer Quoten-Fügung mit Vorzeichen | ohne ihn verlangt `tests/disziplinen` für jede Hälfte einzeln, dass die halbe Liga im Rennen steht — die Regel ist gegen eine zu hohe SCHWELLE geschrieben, und ein Vorzeichen ist keine Schwelle: gemessen standen fünf über und fünf unter dem eigenen Mittel, und beide Hälften fielen durch. Die Marke ist keine Beschriftung: der Partner muss zurückzeigen, und die beiden Rennen dürfen sich nicht schneiden. `paar` muss außerdem in der Projektion `_chronRoh` stehen — `CHRONICLES` nennt nur, was sie kennt, und ein Feld, das sie nicht nennt, kommt im Test gar nicht an |
| `allzeit.kammer` | `koennen`, `form`, `mark`, `fuegung` oder `shame` [§C35] | ohne sie wird die Kammer aus `art` erraten, und die Ableitung kennt „Aktuelle Form" nicht: ein Fenster-Rekord landet im Können und steht dort neben einem Laufbahnwert. `tests/disziplinen` zählt die fünf Kammern und ihre Zahlen (30/8/10/17/11) nach |
| `allzeit.basis` | der Grundwert fürs Prestige: 150 für Können, leistungsbezogene Form und leistungsbezogene Bestmarke, 75 für Rollenwert und Fügung, 0 für eine Schattenseite [§C34] | ohne ihn fällt der Eintrag auf `PRESTIGE_REKORD × PRESTIGE_ART[art]` zurück, und dann hängt sein Wert wieder an der Katalogreihenfolge: „Der Unaufhaltsame" ist ein Ereignis und wiegt trotzdem 150. Er ist NICHT, was jemand bekommt — erst durch die Halter geteilt, dann gedämpft. `tests/disziplinen` prüft beide Schritte in dieser Reihenfolge |
| `allzeit.mind` | die Mindestbasis in Worten, so wie sie auf der Karte steht | sie stand nur im Bedingungssatz, und wer die Karte las, musste sie daraus heraussuchen. Ein Gegenpaar muss dieselbe Zahl tragen, sonst ist eine Hälfte leichter zu halten als die andere — `tests/disziplinen` vergleicht die Zahlen der vierzehn Paare |
| `allzeit.zeitraum` | über welche Strecke gerechnet wird („Ganze Laufbahn", „Die letzten 20 Partien", „Ein einzelner Spieltag") | ohne ihn steht auf der Karte nicht, ob der Wert für immer gilt oder für die letzten zwanzig Partien, und das ist der Unterschied zwischen zwei Kammern |
| `allzeit.offen` | `true`, **nur** wenn die Bedingung mit fünfzig Partien in der Laufbahn erfüllbar ist [§C35] | ohne die Marke wächst der Katalog still zum Vielspieler: 13 der 21 bestehenden Rekorde mit lesbarer Mindestzahl sind für einen 50-Spieler unerreichbar. Die Marke ist keine Beschriftung — `tests/disziplinen` verlangt, dass im Rennen jemand mit unter hundert Partien steht, dass der Rekord vergeben ist und dass er nicht nur den drei Besten gehört |
| `allzeit.fenster` | `true`, **nur** wenn der Wert auf einem gleitenden Fenster steht („die letzten 30 Partien", „zwei Fenster im Vergleich") | der Feed meldet „X baut den Rekord aus", sobald am hinteren Ende des Fensters ein schwaches Ergebnis herausfällt — und dann hat der Halter nichts getan [§C33]. Gemeldet wird bei ihm nur der Halterwechsel. `tests/ambient` misst es über jeden vierten Spieltag |
| `allzeit.cond` | **jede** Schwelle, die die Wertfunktion erzwingt, nicht nur die auffälligste | sie steht auf der Karte im Rekorde-Reiter und ist das, was der Leser als Aufgabe versteht. „Die ruhige Hand" nannte nur die 9 Prozentpunkte und schwieg über die 14 engen Partien und die 20 % der Laufbahn — wer die Karte las, wusste nicht, warum er nicht im Rennen steht. `tests/disziplinen` liest die Schwellen aus dem Quelltext der Rechnung und verlangt jede im Text. Eine Schwelle ist eine **Stichprobe** (Partien, Spieltage, Wochen, Niederlagen), nie eine Wertlatte in Prozent, Elo oder Serienlänge: der Rekord ist der beste Wert, den es gibt [§C35] |
| `allzeit.wie` | **Pflicht für jeden Rekord**: wie gemessen wird, und bei einem Anteil der Nenner | nur 15 der 46 Rekorde hatten eine Erklärung, und mehrere Namen führten in die Irre: „Die Mauer" misst nicht die Abwehrstärke, sondern nur, wie oft jemand hinten stand. Sie steht als Notiz unter der Bedingung im Rekord-Blatt. `tests/disziplinen` verlangt mindestens 40 Zeichen und verbietet eine Floskel („sozusagen", „im Grunde"), die nichts erklärt |
| `allzeit.ev` | beginnt mit dem Wert, **nach dem sortiert wird** — die Anzahl steht dahinter | Podest und Verfolgerliste zeigen die erste Zahl des Belegs. Beginnt er mit der Anzahl, steht dort „34" über „10", obwohl der mit 10 den höheren Anteil hält. `tests/disziplinen` rechnet die erste Zahl gegen den Sortierwert zurück und lässt nur eine Umrechnung davon gelten |
| `src/js/02-icons.js` | das Icon aus `ic` | die Zeile bleibt ohne Zeichen |

Ein Eintrag darf **nur `allzeit`** haben, wenn ein Monat zu kurz ist, um die
Größe zu messen — so wie der Positionswert, der Erfahrung mitwiegt: über vier
Wochen entschiede die Spielzahl statt der Leistung. Dann entfällt der Eintrag
in `_seasonTitleCtx`, sonst nichts.

**Misst ein Eintrag etwas, das eine Ansicht schon zeigt, rechnet er es nicht
nach.** Der Positionswert steht an EINER Stelle: `posLeistung` ist der
gemeinsame Kern aus Siegquote, Erwartungsabstand und Rollenbeitrag, und
`posWert` multipliziert ihn für die Rangliste mit dem Erfahrungsfaktor
[§5.2]. Der Liga-Rekord ruft `posLeistung` direkt — nach der Mindestbasis
darf die Spielzahl den Wert nicht mehr heben, sonst hielte ihn wieder der
Vielspieler. Eine zweite Formel daneben wäre genau der Fehler, den dieser
Absatz verbietet. Das
Sturm-/Abwehrprofil steht ebenso nur in `positionsProfilWert`; Profil und
„Der Wandler" rufen dieselbe Funktion auf. Zwei
Rechnungen über dieselbe Frage nennen irgendwann zwei verschiedene Beste, und
dann steht in der Chronik ein anderer Name als über der Liste, auf der er ihn
geholt hat. `tests/disziplinen` legt beide nebeneinander.

Eine Disziplin zu **streichen** verändert nur die Zukunft: abgeschlossene
Monate stehen vollständig eingefroren in `seasons.titles` und zeigen weiter,
was damals galt.

Soll der Eintrag ausdrücklich kein Können messen, gilt zusätzlich §C35 — er
wird `ereignis`, und beide Bedingungen dort werden nachgemessen.

# 10.3 Die Balance nachziehen

Der Teil, den man vergisst. Ein neuer Eintrag ist neues Prestige für jeden,
der ihn hält — und für sonst niemanden.

1. **Die Seltenheitsklasse bestimmt die Standardregel.**
   `PRESTIGE_AUSZEICHNUNG` gibt Startwert und Abnahme für Rare und Common
   vor [§C34]. Jede legendäre Auszeichnung und dazu POTW und POTD stehen
   mit eigenem Startwert in `PRESTIGE_AUSZEICHNUNG_SPEZIAL` — eine neue
   legendäre wird dort nach ihrem Gewicht eingeordnet, das Regelblatt
   zeigt sie dann von selbst an der richtigen Stelle. Eine falsch gewählte
   Klasse verändert weiterhin Optik und Punktfolge.
2. **Jede positive Auszeichnung wächst bei jedem Erreichen.** Die harmonische
   Folge hat weder Mindestwert noch harte Obergrenze; es gibt kein
   nachträgliches Quellenlimit. `tests/disziplinen` prüft die Dominator-,
   Meister-, Team-, POTW-, POTD- und Carry-Folgen sowie das Wachstum aller
   fünfzig Katalogeinträge.
3. **Die Schwellen in `INSIGNIEN` werden an der echten Liga kalibriert**
   [§C30]. Keine Spanne ist kürzer als 500 und keine kürzer als die vorige:
   Leon soll Zierkranz III tragen, Martin und Julian dicht dabei im
   Zierkranz, und der erste Ordensstern bei **5.600 Prestige** soll
   langfristig erreichbar sein; danach kommt alle 500 eine Zacke dazu.
   Wer Startwerte anhebt, zieht die Schwellen mit — sonst steigt die Liga
   über Nacht, ohne gespielt zu haben.

Nichts davon wird geschätzt. `tests/disziplinen` misst es an den echten
Partien und fällt, wenn es kippt:

| Zusicherung | fällt, wenn |
|---|---|
| jede Prestigequelle gehört zu genau einem der drei sichtbaren Blöcke | wieder ein versteckter vierter Wert einfließt |
| Auszeichnungen wiegen schwerer als Rekorde | der Reif zur Rekordanzeige wird |
| mehr als die halbe Liga hält einen wertenden Rekord | die Einstiegshürden zu hoch sind |
| mehr als die halbe Liga trägt mindestens den Schildring | die erste Sprosse zu hoch hängt |
| der Beste trägt noch keinen Lorbeerreif | der Katalog die Spitze nach oben schiebt |
| der Ordensstern ist von niemandem erreicht | dasselbe, eine Stufe höher |
| nur Kronenreif und Ordensstern sind die obersten Stufen | die Breaking-Grenze beim Einfügen einer Stufe verrutscht [§C33] |
| Glut und Hof in der Rangfarbe werden mit der Leiter nicht schwächer, die Lichter tragen die Rangfarbe | der Schimmer nicht mehr sagt, wer weiter oben steht [§C30] |
| keine Spanne ist kürzer als 500, der Ordensstern steigt alle 500 | eine Stufe fast geschenkt ist oder die Zacken aus dem Takt geraten |
| Leon und Martin tragen den Zierkranz, Leon in Grad III, Julian steht dicht dabei | Schwellen und Grade die heutige Liga falsch abbilden. Gemessen wird der ABSTAND der drei und nicht ihre Reihenfolge: die war festgeschrieben, und damit fiel die Zusicherung bei jedem Rekord, der Punkte verschiebt — kalibriert ist die Leiter und nicht die Tabelle |
| das Langzeitmodell kann den Ordensstern erreichen | ein weicher Deckel zur harten Obergrenze wird |
| jede positive Dauerquelle behält einen positiven Zuwachs | spätere Ordensstern-Zacken mathematisch unerreichbar werden |
| auch die zwanzigste weitere Ordensstern-Zacke wird endlich überschritten | die Laufbahn nur scheinbar ohne Ende weiterläuft |
| wenige sehr starke Partien schlagen viele durchschnittliche | Anwesenheit wieder als Können zählt |
| Prestige aus Auszeichnungen und Monaten fällt nie | ein Wert wieder am heutigen Zensus hängt [§C34] |
| je Spieler und Monat zählt genau eine Chronik, und zwar die des Profils | die Laufbahn einen Monat mehrfach zählt oder eine andere Wertung als die Matrix [§C32] |
| ein verlorener Rekord zählt nicht mehr, ein geteilter nur geteilt | ein Bestwert weiterzählt, den heute jemand anders hält |
| jede Klasse zählt so viele Badges wie `RARITY_META` behauptet | ein Badge dazukommt oder wegfällt und der Zähler stehen bleibt |

Ein roter Wert dieser Art ist eine **Antwort**, keine Störung: er nennt die
Zahl, die nachgezogen werden muss. Angepasst wird die Zusicherung nur, wenn
sich die Absicht geändert hat — nicht, damit sie wieder grün ist.
