# §C35 Nicht jeder Eintrag darf am Können hängen

Wer besser spielt,
gewinnt jede Quote und jede Serie — am Ende liegen alle Liga-Einträge bei
denselben drei Spielern. Zweiundzwanzig von sechsunddreißig Rekorden
fragten direkt nach Können, und drei Spieler hielten vierundzwanzig der
achtunddreißig Haltungen. Heute sind es **sechsundsiebzig Rekorde** in
**fünf Kammern** — 30 Können, 8 Aktuelle Form, 10 Bestmarken, 17 Fügungen,
11 Schattenseiten — und 88 Haltungen, 43 davon bei den drei Besten der
Siegquote. Gemessen hält der Spieler mit den meisten Partien elf Einträge
und der Vierte der Siegquote zehn aus 97 Partien: die Tafel hängt
nicht mehr an der Spielzahl.
**Die Kammer steht am Eintrag** (`allzeit.kammer`), sie wird nicht mehr aus
`art` erraten. Abgeleitet war „Fügung, sonst Schatten, sonst Ereignis gleich
Bestmarke", und damit gab es die Kammer „Aktuelle Form" gar nicht: ein
Fenster-Rekord ist eine Leistung und landete im Können. Dort stand „Höchste
Siegquote in den letzten 20 Partien" neben „Beste Siegquote als Außenseiter
über die ganze Laufbahn", also zwei verschiedene Zeitachsen in einer
Kammer, und wer die Tafel liest, konnte nicht sehen, was gerade gilt und
was für immer.
**Die Karte nennt Zeitraum, Grundwert und Mindestbasis** (`zeitraum`,
`basis`, `mind`). Die Mindestbasis musste der Leser aus dem Bedingungssatz
heraussuchen, und über welche Strecke gerechnet wird, stand nirgends. Der
Grundwert steht dabei ausdrücklich als „150 P Basis": er ist NICHT, was
jemand bekommt — er wird durch die Zahl der Halter geteilt und danach in
der Wurzelstaffel gedämpft [§C34]. Den tatsächlichen Beitrag zeigt das
Blatt. Die Zeile steht leise und ohne Rahmen: zwei gerahmte Pillen
brachen fast immer um und waren lauter als der Wert.
**Die Karte zeigt, wie weit der Halter vorn liegt** (`_rekFeldHtml`). Sie
nannte seinen Wert und sonst nichts; ob der Zweite knapp dahinter liegt,
stand erst im Blatt. Jetzt steht der Wert groß in der Farbe der Kammer, und
darunter das Bauteil „Wo im Feld" des Belegs [§C27] — jeder im Rennen ein
Punkt, der Halter am rechten Ende —, daneben der Erste, der ihn nicht
hält, mit seinem Wert. Gelesen wird `chronicleRang`, dieselbe Reihenfolge
wie Podest und Verfolger; ihr Topf ist deshalb so groß wie der Katalog,
sonst räumte jedes Zeichnen des Reiters die Einträge, die Blatt und Feed
gerade brauchten. Der Kopf jeder Kammer sagt in einem Satz, was sie misst
(`CHRON_KINDS.satz`), und zeigt die drei, die darin am meisten halten.
**Und sie nennt nicht, was sich an der APP geändert hat.** Jede Karte trug
eine Marke „Neu" oder „Überarbeitet". Die sagt, welche Fassung der App
gerade läuft, und dem Leser einer Rekordkarte nichts: er will wissen, was
der Rekord misst und wer ihn hält. Dasselbe galt für die Erklärungen — dort
stand die Begründung gegen die frühere Rechnung („Der beste Zwanzigerblock
irgendwo in der Laufbahn gehörte immer dem, der am meisten gespielt hat",
„Deshalb wiegt der Eintrag 50 Punkte und nicht 100", „sonst wäre eine Seite
leichter zu halten als die andere"). Das ist die Bauanleitung und gehört in
einen Kommentar, nicht auf die Karte — dieselbe Regel wie „Das Blatt
erklärt nicht die App" [§C33]. `tests/disziplinen` prüft jeden sichtbaren
Text jedes Rekords und jeder Chronik gegen eine Liste solcher Wendungen und
gegen Entwicklersprache („Rohsicht", „Cache", „Projektion", „Savepoint",
ein Paragraphenzeichen).
**Zwei Einträge messen dieselbe Teilmenge von zwei Seiten, und beide
bleiben.** „Die ruhige Hand" misst den SPRUNG in engen Partien gegenüber
den übrigen, „Der Entscheider" die Quote in engen Partien selbst. Wer dort
so gut ist wie sonst, hat keinen Sprung und kann trotzdem der Beste sein; wer
sonst schwach ist, macht mit einem Sprung noch keine gute Quote. Dasselbe
Paar bilden „Der Stehaufmann" (Sprung nach EINER Niederlage) und „Der
Rückschlag" (Quote nach zwei Niederlagen in Folge, und nach jeder weiteren
erneut). Das ist keine Doppelung im Sinne der sieben gestrichenen
Nachbarn: dort stand dieselbe Frage mit derselben Antwort, hier stehen zwei
Fragen, und gemessen halten sie zwei verschiedene Spieler.
**Zwei Einträge haben ihre Frage gewechselt und ihre ID behalten.** Ein
Wechsel und keine Neuanlage, damit jeder Verweis auf sie weiter trägt —
Profile, eingefrorene Monate und persistierte Karten hängen an der ID.
„Gegen jeden bestanden" zählte den ANTEIL der regelmäßigen Gegner mit
positiver Bilanz und beantwortete damit eine andere Frage als sein Name:
wer gegen neun von zehn gut und gegen den zehnten furchtbar steht, stand
bei 90 % und hatte genau den Angstgegner, den der Eintrag ausschließen
soll. Er heißt jetzt **„Kein Angstgegner"** und wertet die SCHWÄCHSTE
dieser Bilanzen — ein einziger Gegner kostet den Rekord. Die Monatsachse
bleibt der Anteil: in vier Wochen kommen drei Duelle gegen einen Gegner
zusammen, und ein Minimum aus drei Partien ist ein Wurf und kein Muster.
„Der Schadensbegrenzer" zählte den Anteil der Pleiten ab sieben Toren
Rückstand und ließ offen, wie die übrigen ausgingen: wer nie hoch und immer
mit fünf Toren verliert, stand bei null Prozent und damit an der Spitze. Er
heißt jetzt **„Der Widerstand"** und misst den mittleren Rückstand JEDER
Niederlage.
**Aktuelle Form ist ein festes Endfenster und nie der beste Abschnitt.**
Acht Rekorde stehen auf den letzten 10, 20, 25, 30 oder 50 eigenen
Partien. Der beste Zwanzigerblock IRGENDWO in einer Laufbahn gehörte immer
dem Vielspieler: dreihundert Partien haben 281 solche Blöcke, dreißig
Partien haben elf, und das Maximum aus vielen Ziehungen ist größer.
`tests/disziplinen` rechnet jedes der sechs Fenster unabhängig aus den
echten Partien nach.
**Elf Rekorde sind gefallen, elf sind dazugekommen.** Weg sind „Der
Gigantentöter", „Der Nervenkitzler", „Der Unerschütterliche", „Der
Hausherr", „Das Sonntagskind", „Die starke Phase", „Der Aufschwung", „Die
kalte Dusche", „Die Torbilanz", „Der Angreifer" und die Laufbahn-Achse der
„Steigerung" (ihre Monatschronik bleibt). Neu sind „Gegen den Wind", „Der
Sturmführer", „Der Allrounder", „Der Laufstopper", „Der Lauf", „Die
Abwehrmauer", „Der Sturmtreue", „Der Seitenwechsler" und die
Laufbahn-Achsen von „Kein Angstgegner", „Der Deutliche" und „Der
Kaltstart". Die persistierten Karten der gestrichenen Rekorde sind in
`STORY_ABGEMELDET` namentlich abgemeldet: der Generator bildet ihre IDs
nicht mehr, also kann `_newsTexteAuffrischen` sie nicht umschreiben, und
sie behaupteten sonst für immer einen Rekord, den es nicht mehr gibt. Ihr
Blatt stürzt trotzdem nicht ab — die Definition wird überall mit `?`
abgefragt, der Text steht in der Zeile.
**Vierzehn Gegenpaare messen dieselbe Frage von zwei Seiten** und tragen
dieselbe Mindestbasis: sonst wäre eine Hälfte leichter zu halten als die
andere. Keines ist mehr je Seite geeicht: Unaufhaltsamer und
Durststrecke verlangen ihr erstes Glied, Sonntagsschuss und bitterste
Pleite eine einzige Partie.
**Ein Rekord hat keine Wertlatte, nur eine Stichprobe.** Wer
20 % seiner Wochen gewinnt und damit vorn liegt, hält „Der Wochenherr" —
der Rekord ist der beste Wert, den es gibt, und nicht der beste über einer
Latte. Siebzehn Rekorde trugen eine solche Latte — in Prozent („mindestens
25 %", „höchstens 45 % Siegchance", „ein Sturmanteil zwischen 43 und
57 %"), in Elo („ab 350 Elo", „ab 150 Elo Verlust") oder als Serienlänge
(„ab 8 Siegen in Folge") —, und sie ließ den Rekord leer oder strich den
Besten aus dem Rennen. Was ein Wert von sich aus braucht, bleibt: eine
Serie ihr erstes Glied, ein Wechsel zwei Partien, eine Wiederholung zwei
gleiche Ergebnisse, ein Sprung oder Verlust eine Richtung. Verlangt werden darf nur,
dass der Wert auf genug beruht: Partien, Spieltage, Wochen, Niederlagen —
sonst hielte ein Neuling nach drei Abenden einen Rekord, ohne eine Linie
gezeigt zu haben. Eine Teilmenge, die beschreibt, welche Partien zählen
(„Partien mit 35 bis 65 % Siegchance"), ist keine Latte und bleibt.
`tests/disziplinen` liest Bedingung, Mindestbasis und Wertfunktion jedes
Rekords, dazu `min` und die Wertfunktion auf Elo-Latten. Seitdem sind
„Der Unaufhaltsame", „Der höchste Gipfel" und „Der Maßstab" mit fünfzig
Partien erreichbar und tragen `offen`. Damit sind Sonntagsschuss und bitterste Pleite auch kein `paar`
mehr: ohne Latte stehen in beiden Rennen dieselben Spieler.
**Eine Kammer, die die Auslosung misst, wiegt 75.** Rollenwerte und
Fügungen dürfen von einer Laufbahn aus lauter Niederlagen gehalten werden:
„Das Fundament" fragt nach der gleichmäßigsten Tordifferenz, und wer immer
0:10 verliert, ist gleichmäßig. Was 150 Punkte wert ist, darf sie nicht
erreichen — `tests/disziplinen` spielt genau diese Laufbahn gegen jeden
Rekord mit Grundwert 150.
**Der Anteil an den eigenen Gelegenheiten kennt die Spielzahl nicht.** „Der
Platzhirsch" und „Der Wochenherr" waren lange die einzigen zwei Rekorde
dieser Bauart: sie zählen nicht, wie oft etwas gelang, sondern wie oft von
wie vielen Gelegenheiten. Wer an zwanzig Spieltagen dabei war, wird an
zwanzig gemessen — und genau deshalb erreicht ein solcher Anteil den, der
weniger spielt. Gemessen verlangten 17 der 57 Rekorde eine Mindestzahl von
vierzig Partien oder mehr, darunter die vier mit fünfzig Sturm- oder
Abwehrspielen; „Der Tagesabschluss", „Der Ausgleicher", „Auf Augenhöhe" und
„Das Metronom" fragen stattdessen nach den eigenen Spieltagen, dem eigenen
Partnerkreis und den eigenen offenen Partien. Die Herleitung samt Messung
steht in `mockup/README-staerken.md`.
**Ein neuer Rekord steht neben seinem nächsten Verwandten.** Die
Katalogreihenfolge IST die Reihenfolge im Rekorde-Reiter, und ein Eintrag
am Ende der Liste erklärt sich niemandem: „Der Tagesabschluss" steht neben
„Der makellose Tag", „Der Ausgleicher" neben „Der Katalysator", „Auf
Augenhöhe" neben „Die ruhige Hand", „Der Sturmführer" neben „Der
Abwehrchef", „Der Kaltstart" neben „Der letzte Ball", „Der Torrausch"
neben „Die dichte Phase", „Der Sturmtreue" neben „Die Mauer" und „Die
Abwehrmauer" neben „Der Dauerstürmer". Ebenso stehen „Der Entscheider"
neben „Die ruhige Hand", „Die Retourkutsche" neben „Kein Angstgegner",
„Der Unbeugsame" neben „Der Unaufhaltsame", „Der Rollencoup" neben dem
kompletten Verteidiger, „Der Rückschlag" neben „Der Stehaufmann" und „Der
Wiedereinstieg" neben „Der Kaltstart". „Der Pendler" und „Der Wanderpass"
stehen neben „Der Seitenwechsler", „Der Spurwechsel" neben „Das
Wechselbad", „Der Ausbruch" und „Der Serienstopp" neben „Der
Sonntagsschuss". Wer eine
Monatschronik um ihre Laufbahn-Achse ergänzt, verschiebt ihren Eintrag
dorthin; die Monatstafel bleibt davon unberührt, weil `SEASON_TITLES` nach
Art, Chronik-Art und Ausschlag sortiert und nicht nach der Katalogfolge.
**Die Schwelle ist keine Bedingung, sondern eine Kammer.** Ein Rekord
DARF eine hohe Mindestzahl verlangen: wer sie hält, hat die Frage über eine
lange Strecke beantwortet, und Rekorde sind auch dazu da, Können zu
belohnen. Er darf aber nicht nur das. Rekorde tragen deshalb
`offen` im Katalog: ihre Bedingung ist mit **fünfzig Partien** in der
Laufbahn erfüllbar — unter anderem „Die dichte Phase", „Der Torrausch",
„Der Lauf", „Der Höhenflug", „Das Übersoll", „Der Souverän", „Der letzte
Ball", „Der Kaltstart", „Der Dauerstürmer", „Die Abwehrmauer", „Der
Sturmtreue", „Die Mauer", „Der Laufstopper", „Der Entscheider", „Die
Retourkutsche", „Der Unbeugsame", „Der Rückschlag", „Der Wiedereinstieg"
und „Der Rollencoup" — die sechs Neuen fragen nach einer Teilmenge der
eigenen Partien (enge Partien, Wiedersehen, Gelegenheiten, Rückkehrspiele,
Außenseiterpartien einer Position) und nicht nach einer Gesamtzahl, und
genau deshalb erreicht sie auch, wer weniger spielt. Nicht offen sind die, die
eine lange Strecke verlangen: „Der Wochenherr" mit zehn eigenen Wochen und
die Funde „Die Punktlandung" und „Die Achterbahn". Gemessen waren 13 der 21 damaligen Rekorde
mit lesbarer Mindestzahl für einen solchen Spieler unerreichbar: „ab 50
Sturmspielen", „ab 60 Gelegenheiten", „ab 80 Spielen" gehören dem
Vielspieler, weil sie außer ihm niemand halten KANN. `offen` ist dabei
keine Beschriftung: `tests/disziplinen` zählt nach, dass in jedem offenen
Rennen jemand mit unter hundert Partien steht, dass jeder offene Rekord
vergeben ist und dass mindestens einer nicht den drei Besten gehört.
**Ein gleitendes Fenster meldet kein „ausgebaut"** (`fenster` im Katalog).
Der Wert einer Laufbahn steigt, weil jemand besser gespielt hat; der Wert
eines Fensters steigt auch dann, wenn am hinteren Ende ein schwaches
Ergebnis herausfällt. Dieselbe Begründung wie beim Verschlechtern [§C33]:
wer nichts getan hat, hat nichts getan. Gemessen ergaben die drei ersten
Fenster-Rekorde 26 der 135 Karten ihrer Familie, und keine davon nannte
eine Leistung; heute tragen alle acht Rekorde der Kammer „Aktuelle Form"
die Marke. Und die Teilmenge muss **mitwandern**: „in den ersten 25
Partien" ist fertig, sobald jemand 25 Partien hat, und ein Rekord darauf
könnte den Halter nie mehr wechseln.
**Es nennt auch den Wert seines Vorgängers nicht.** Der gilt nicht mehr:
sein Fenster ist weitergerutscht, während der neue Halter sein eigenes
gefüllt hat. Gemessen stand „Maxi, Julian, Jane und Johannes übernehmen
‚Der Höhenflug'. +10 %-Punkte … Vorher hielt Leon den Rekord mit +20 %" —
eine Übernahme mit dem schlechteren Wert, und der Satz erklärt nicht, wieso.
Es bleibt „Vorher gehörte der Rekord Leon"; dieselbe Begründung wie beim
ausgebliebenen „ausgebaut". `tests/ambient` prüft jede Rekord-Karte.
**Die Bedingung nennt jede Schwelle, die Erklärung sagt, wie gemessen wird.**
Auf der Karte steht `cond`, im Blatt darunter `wie` — und beides war
lückenhaft: nur 15 der 46 Rekorde hatten überhaupt eine Erklärung. „Die
ruhige Hand" verlangte „mindestens 9 Prozentpunkte" und schwieg über die 14
engen Partien und die 20 % der Laufbahn, die ebenso verlangt sind; wer die
Karte las, wusste nicht, warum er nicht im Rennen steht. „Der
Gigantentöter" nannte keinen Nenner, obwohl er gegen ALLE Partien zählt und
nicht gegen die als Außenseiter. Und „Die Mauer" heißt so, misst aber nur,
wie oft jemand hinten stand: ohne Erklärung liest sich der Name als
Abwehrstärke. Die Erklärung nennt deshalb bei jedem Anteil seinen **Nenner**
und sagt, wo eine Zahl etwas NICHT bedeutet. Geprüft wird beides maschinell:
`tests/disziplinen` liest jede Schwelle aus dem Quelltext der Wertfunktion
und verlangt sie im Text — als Ziffer oder ausgeschrieben.
**Kein Halter trägt mehr als ein Viertel der Tafel.** Eine Kennzahl auf
drei Teilmengen ist dieselbe Frage in drei Ausschnitten und sammelt sich
beim selben Halter; Sturm und Abwehr sind dagegen ein PAAR wie „Der
komplette Stürmer" und „Der komplette Verteidiger" — „Die Handschrift" und
„Das Fundament" messen dieselbe Streuung auf den beiden Positionen und
gehören gemessen zwei verschiedenen Spielern. Gedeckelt wird deshalb nicht
die Frage, sondern der Halter: `tests/disziplinen` nennt jeden, der mehr
als ein Viertel aller Haltungen trägt.
Dagegen steht die Kammer der **Fügungen**: Einträge, die von der Auslosung
und vom letzten Ball entschieden werden. Sie tragen `zufall` im Katalog,
stehen als `ereignis` da und wiegen fürs Prestige damit halb so viel wie
ein Beleg für eine Fähigkeit [§C34] — sie sollen jemandem gehören können,
nicht jemanden auszeichnen.
`zufall` sagt zugleich, WIE gemessen wird, und das entscheidet über die
Zusicherung:
**`'quote'`** mittelt über eine Laufbahn oder einen Tag („Der schwerste
Tag", „Die bitterste Pleite", „Der Wiedergänger", „Das Nadelöhr", dazu
die drei alten). Sie muss erreichbar sein: mindestens die halbe Liga steht
im Rennen, und vergeben ist sie auch.
**`'fund'`** ist ein einzelnes Zusammentreffen („Die Punktlandung", „Die
Achterbahn"). Es darf selten sein und sogar unbesetzt
bleiben — sonst wäre es keins; höchstens die Hälfte der Funde darf leer
stehen. Eine Quotenschwelle darauf anzuwenden hieße, das Seltene
abzuschaffen.
**Ein PAAR wird zusammen gemessen** (`paar` im Katalog). „Der Rückenwind"
und „Der Einzelkämpfer" sind die zwei Enden eines Werts: wen die Auslosung
gerade als Mitspieler zuteilt, über oder unter dem eigenen Mittel. Das
Vorzeichen teilt das Feld, und gemessen standen fünf über und fünf unter
ihm — einzeln gemessen fiel jede Hälfte an der Regel „mindestens die halbe
Liga im Rennen" durch, die gegen eine zu hohe SCHWELLE geschrieben ist. Ein
Vorzeichen ist keine Schwelle. `paar` ist dabei keine Beschriftung:
`tests/disziplinen` verlangt, dass der Partner zurückzeigt und dass sich
die beiden Rennen nicht schneiden — zwei Einträge, in deren Rennen derselbe
Spieler steht, sind keine Enden eines Werts, sondern zwei Wertungen.
Gerechnet wird gegen das **eigene** Mittel und nicht gegen das der Liga:
wer selbst der Beste ist, kann nie mit sich selbst spielen, sein
Partnerfeld ist zwangsläufig das schwächste, und gemessen lag diese Fassung
bei r = −0,66 mit der eigenen Siegquote [§C38]. Gegen das Eigene
gerechnet bei −0,09.
Über beide hinweg gilt: mindestens eine gehört der unteren Hälfte der
Siegquote, und die drei Besten halten höchstens die Hälfte der Kammer.
Ohne das hätte man zehn Einträge dazugebaut und nichts verändert.
Jeder gewertete Spieler trägt mindestens einen Liga-Eintrag.
`tests/disziplinen` misst das alles nach.
Was **nicht** in die Kammer gehört: sieben Rekorde, die einen Nachbarn
doppelten — „Der Vollstrecker" neben „Der Zerstörer", „Der perfekte Abend"
neben „Der makellose Tag". Dieselbe Frage mit derselben Antwort sammelt
sich beim selben Halter. Vier von ihnen behalten ihre Monatswertung und
verlieren nur den Liga-Rekord; drei gibt es nicht mehr.
Ein anderes **Zeitfenster** ist dagegen eine eigene Frage: „Der Wochenherr"
steht neben „Der Platzhirsch", weil eine Woche fünf Siege am Stück verlangt
und ein Spieltag drei — gemessen halten sie zwei verschiedene Spieler.
Billig dürfen Fügungen trotzdem nicht sein: eine Bestmarke, die jeder
geschenkt bekommt, ist keine mehr.
Und gemessen wird überall der **Anteil**, nicht die Anzahl — sonst hält den
Rekord, wer am meisten spielt. Der Beleg muss das auch sagen: er beginnt
mit dem Wert, nach dem sortiert wird, und nennt die Anzahl erst dahinter.
„32 seiner 134 Siege waren Kantersiege" las sich als Bestenliste der
Anzahl, und das Podest zeigte genau diese 32 über der 10 des Spielers, der
den höheren Anteil hält.
**Die Schandtafel ist keine Rangliste von hinten.** Elf Rekorde tragen
`art:'schatten'` und sieben Monatschroniken `monat.art:'schatten'` — die
Kehrseite gehört dazu, sie zählt aber nichts: `PRESTIGE_ART.schatten` ist
null, `PRESTIGE_CHRONIK.schatten` auch, `neg` hält sie aus der Zahl im
Profil und in der Rangliste heraus, `nextRecordFor` schlägt sie niemandem
vor, und der Feed meldet sie gar nicht. Eine negative FÜGUNG ist davon
ausgenommen und behält ihren Wert [§C25].
Das eigentliche Problem ist ein anderes: wer schlechter spielt, verliert
JEDE Quote. Eine Schande, die das Niveau misst, gehört damit immer demselben
Spieler. Gemessen hielt der Zehnte der Siegquote fünf der dreizehn
Haltungen, sobald die Kandidaten das reine Niveau fragten. Drei der neuen
Einträge fragen deshalb nach dem **Abstand zum Eigenen** [§C38] statt nach
dem Niveau, und genau dadurch haben sie ihr Tor bestanden: „Die
Ladehemmung" ging von r = −0,35 auf +0,14, „Die stumme Antwort" von −0,40
auf +0,06. Ein gleichmäßiger Streu wäre gelogen — eine Schande MISST, dass
jemand schlecht war —, also ist nur der Extremfall gedeckelt: kein Halter
über zwei Fünftel der Schandtafel, und mindestens sechs Namen tragen mit.
**Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin** [§13.1].
Zwanzig Disziplinen tragen beide: `spotless`, `kopfhoch`, `ausgleich`,
`gleichauf`, `metronom`, `uebersoll`, `hochform`, `schlussball`,
`kaltstart`, `deutlich`, `breitenwirkung`, `evenkeel`, `ausbruch`,
`drought`, `abyss`, `hardluck`, `sieve`, `angstgegner`, `untersoll` und
`misfire`. Zwei Namen und zwei Icons für denselben Gedanken wären eins zu
viel [§C27] — deshalb bekommen „Kein Angstgegner", „Der Deutliche", „Der
Kaltstart" und „Der Ausbruch" ihre Laufbahn-Achse an der bestehenden
Monatsdisziplin und keine zweite daneben. Die 17 Pleiten der
Monatswertung sind dort eine Schwelle für die Chronik; der Rekord ist die
längste beendete Serie, die es gibt.
**Eine Folge ist eine Fügung, wenn die Auslosung sie schreibt.** „Der
Pendler" (jedes Mal die andere Position), „Der Wanderpass" (jedes Mal ein
anderer Partner) und „Der Spurwechsel" (abwechselnd Favorit und
Außenseiter) sind längste Folgen wie das Wechselbad: gezählt werden
Partien, nicht Übergänge, Tag und Monat unterbrechen nicht. „Der
Serienstopp" ist die längste Gegner-Siegesserie, die ein eigener Sieg
beendet hat — die Länge hat der Gegner gespielt, deshalb Fügung und keine
Bestmarke, und „Der Laufstopper" bleibt die Quote dazu. Gemessen halten die
fünf neuen Einträge Spieler auf Platz 2 bis 10 der Siegquote.
**Was eine Beziehung zweier Spieler misst, wird kein Rekord.** Aus dem
Vorschlag in `mockup/besonderheiten` fielen damit Teamgefälle und
Gegensprung (beide Partner tragen denselben Wert), Grenzverkehr (der Faden
zwischen zwei Leuten gehört beiden) und Doppelgesicht. Ebenso fielen, was
an der Spielzahl hängt (Rückeroberung r = 0,64, Fixpunkt 0,64 gegen die
eigenen Partien), was beim Halter einer verwandten Wertung landet
(Amplitude bei „Der große Sprung", Herzschlaglauf beim Nadelöhr) und was zu
wenige ins Rennen bringt (Gegenhalt fünf, Umschaltmoment drei Spieler, mit
einem Bestwert unter null).
„Die Steigerung" ist den umgekehrten Weg gegangen: ihre Laufbahn-Achse ist
gefallen, die Monatschronik bleibt.
**Die Laufbahn-Achse darf eine andere Rechnung brauchen als der Monat.**
„Das Metronom" misst im Monat die Spanne zwischen bestem und schwächstem
Spieltag; über eine ganze Laufbahn liegt dort fast immer die volle Spanne,
und der Rekord wäre für jeden dasselbe. Die Laufbahn misst deshalb die
Streuung um die eigene Quote. Dieselbe FRAGE, eine tragfähige Rechnung —
die Erklärung im Blatt sagt, welche.
**Und wo die eine Hälfte schon jemandem gehört, bleibt die andere weg.**
„Der Dauerstürmer" zählt den Sturmanteil der letzten fünfzig Partien. Die
Abwehr-Fassung derselben Frage ginge gemessen an Henry mit 98 %, und Henry
hält „Die Mauer" schon: dieselbe Frage mit derselben Antwort sammelt sich
beim selben Halter. Der Sturmanteil gehört dagegen dem Zehnten der
Siegquote.
Was auf der Monatsachse **nicht** trägt, bleibt weg: „Die stumme Antwort"
schiebt ihre Schwelle dort gemessen höchstens 1,39 σ hinaus und wäre damit
eine Chronik, deren Bester kaum weiter draußen liegt als der Schnitt
[§C39]. Fünf Gelegenheiten zu antworten sind ein Wurf, fünfundzwanzig ein
Muster — sie trägt deshalb nur die Laufbahn.
`tests/disziplinen` misst das alles: die Verteilung, die beiden Achsen und
dass keine Schattenseite Prestige gibt; `tests/ambient` prüft den Feed
gegen den ganzen Katalog, damit ein neuer Eintrag nicht still durchrutscht.
