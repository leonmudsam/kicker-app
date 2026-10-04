'use strict';
// Eigenständige Vorschlagsdaten: keine App-Logik, Elo-Rechnung oder Live-Abfrage.
window.BESONDERHEITEN_PARTIE_REKORDE = [
  {
    id:'gegenhalt', bereich:'rekorde', art:'koennen', kategorie:'Können', titel:'Der Gegenhalt', status:'Lagen statt Leistungsniveau',
    frage:'Die größte rollenbereinigte Differenz der eigenen Soll-Abweichung neben schwächeren und stärkeren Mitspielern. Eine niedrige Gesamtquote ist kein Hindernis.',
    wert:'+20 Punkte Differenz', person:'20 % Gesamtquote · Beispiel', grafik:'erweiterung',
    bild:{typ:'matrix',zellen:[['Sturm · Partner schwächer','−10'],['Sturm · Partner stärker','−30'],['Abwehr · Partner schwächer','−10'],['Abwehr · Partner stärker','−30']],hinweis:'Soll-Abweichung in Punkten. Beide Rollen unterscheiden sich um +20; ihr gleich gewichteter Mittelwert ist +20.'},
    basis:'30 insgesamt; 10 je Vergleichszelle', achse:'Partnerstärke innerhalb beider Rollen',
    abgrenzung:'Rückenwind und Einzelkämpfer messen zeitliche Veränderungen der Partnerstärke. Katalysator vergleicht die Partner mit und ohne diesen Spieler. Gegenhalt vergleicht die eigenen Ausgangslagen, ohne einen bestimmten Partner herauszupicken.',
    mind:'30 Laufbahnpartien und mindestens zehn Partien in jeder der vier Gruppen: Sturm beziehungsweise Abwehr neben einem vor Anpfiff schwächeren beziehungsweise stärkeren Partner. Das sind mindestens vierzig geeignete Partien. Historische eigene und Partner-Elo, eigene Position und Anpfiffchance müssen bekannt sein. Gleiche Elo gehört in keine Stärkegruppe. Keine Mindest-Siegquote und keine Effektlatte.',
    rechnung:'R = Mittelwert(Siegindikator − kanonische Anpfiffchance). Je Zielrolle Δ = R_mitSchwächerem − R_mitStärkerem bilden. Wert = (Δ_Sturm + Δ_Abwehr)/2; beide Rollen erhalten dasselbe Gewicht, auch bei verschieden großen Gruppen. Stärke ausschließlich aus den beiden Vor-Match-Elo lesen, nie aus dem heutigen Stand. Die ganze Laufbahn zählt; jedes weitere geeignete Match aktualisiert genau seine Zelle. Höchster ungerundeter Wert gewinnt.',
    gegenbeispiel:'Vier Zehnergruppen mit jeweils 40 % Soll: neben Schwächeren drei Siege, neben Stärkeren ein Sieg, auf beiden Positionen. R ist −10 beziehungsweise −30; die Differenz +20. Insgesamt wurden nur acht von vierzig Partien gewonnen. Eine hohe Quote auf beiden Seiten exakt auf Soll ergibt dagegen null.',
    risiko:'Keine Behauptung, dass schwächere Partner jemanden besser machen. Gegner, Partneridentitäten und Zeitphasen können mitwirken. Positionsstratifizierung verhindert zumindest einen bloßen Rollenmix-Effekt. Wer etwa nie einen schwächeren Partner hat, kann die nötigen Gruppen nicht belegen und ist für diese Messfrage nicht qualifiziert; niemandem ist jeder Titel garantiert. Null und negative Bestwerte bleiben gültig: dann eine Bilanzdifferenz nennen, keinen positiven Vorteil erfinden. Mehr Stichprobe garantiert keinen steigenden Wert.',
    story:'Neben schwächeren Mitspielern liegt Janniks Leistung auf beiden Positionen günstiger gegenüber der Rechnung als neben stärkeren. Der Unterschied beträgt 20 Punkte, obwohl seine Beispielbilanz nur 20 % Siege enthält.',
    beleg:'Vier synthetische Zehnergruppen, keine Fixture-Messung, Live-Statistik oder fertig geeichte Vergabe. Anpfiffchancen sind vorgegebene Beispielwerte, nicht eine zweite Elo-Rechnung.'
  },
  {
    id:'umschaltmoment-allzeit', disziplinId:'umschaltmoment', bereich:'rekorde', art:'koennen', kategorie:'Können', titel:'Der Umschaltmoment', status:'Direkter Rollenübergang',
    frage:'Die größte rollenbereinigte Differenz zwischen Partien nach Positionswechsel und unveränderter Position – jeweils mit demselben Mitspieler wie unmittelbar zuvor.',
    wert:'+15 Punkte Differenz', person:'Auch bei 20 % Gesamtquote · Beispiel', grafik:'erweiterung',
    bild:{typ:'matrix',zellen:[['Ziel Sturm · gewechselt','−10'],['Ziel Sturm · geblieben','−30'],['Ziel Abwehr · gewechselt','−15'],['Ziel Abwehr · geblieben','−25']],hinweis:'Soll-Abweichung in Punkten. Sturm-Differenz +20, Abwehr +10; gleich gewichtet +15.'},
    basis:'30 insgesamt; 10 je Übergangszelle', achse:'Gleicher Partner, andere eigene Rolle',
    abgrenzung:'Seitenwechsler misst Wechselhäufigkeit, Pendler eine Wechsel-Lauflänge und Rollencoup das Niveau auf einer Position. Staffellauf betrachtet Partnerwechsel; hier bleibt der Partner bei beiden Vergleichsgruppen gerade gleich.',
    mind:'30 Laufbahnpartien und zehn Partien in jeder der vier Gruppen: Ziel Sturm beziehungsweise Abwehr, jeweils nach Wechsel oder nach unveränderter Position. Nur direkte eigene Übergänge innerhalb desselben Berliner Kalendertags, mit bekanntem und unverändertem Partner. Die erste eigene Tagespartie gehört in keine Gruppe. Bekannte Vorgängerposition, Zielposition und aktuelle Anpfiffchance; keine Mindestquote oder Effektlatte.',
    rechnung:'Die aktuelle Partie mit ihrer unmittelbar vorherigen eigenen Tagespartie vergleichen. Bei identischem Partner nach eigener Rollenänderung oder Gleichbleiben einordnen. Je Zielrolle Δ = Mittel(Sieg − Chance)_Wechsel − Mittel(Sieg − Chance)_Gleich bilden. Wert = (Δ_Sturm + Δ_Abwehr)/2. Alle passenden Laufbahnübergänge verwenden; keine schönste Wechselphase suchen. Unbekannte Vorgänger nicht überspringen.',
    gegenbeispiel:'Vier Zwanzigergruppen bei jeweils 40 % Soll: Ziel Sturm 30 % Siege nach Wechsel und 10 % ohne, Ziel Abwehr 25 % und 15 %. Die Rollendifferenzen sind +20 und +10, zusammen +15. Eine bessere Sturmquote allein erzeugt keinen Wechselvorteil, weil immer dieselbe Zielrolle verglichen wird.',
    risiko:'Andere Gegner oder gemeinsame Positionswechsel können mitwirken; kein kausaler Rollenwechsel-Effekt. Den unveränderten Partner in beiden Vergleichsgruppen belegen, nicht bloß bei Rollenwechseln. Bei zu wenigen passenden Übergängen keine Ersatzgruppe erfinden. Null oder negativer Bestwert ist gültig und muss ohne erfundene Verbesserung beschrieben werden. Ein neuer Match kann den Mittelwert auch senken.',
    story:'Mit gleichem Partner fallen Julians Partien nach Positionswechsel günstiger gegenüber dem Soll aus als die ohne Wechsel. Beide Zielrollen zusammen ergeben eine Differenz von 15 Punkten.',
    beleg:'Vier synthetische Zwanzigergruppen, insgesamt sechzehn Siege aus achtzig Partien. Keine echte Auswertung. Die mögliche Monatsachse verwendet dieselbe Disziplin umschaltmoment, keine zweite Formel.'
  },
  {
    id:'teamgefaelle', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Das Teamgefälle', status:'Geometrie einer Aufstellung',
    frage:'Der größte vor Anpfiff belegte Elo-Abstand zwischen den beiden Spielern des eigenen Duos. Das Match darf gewonnen oder verloren sein.',
    wert:'100 Elo Abstand', person:'120 neben 20 Elo · Beispiel', grafik:'erweiterung',
    bild:{typ:'matrix',zellen:[['Eigener Stand vorher','120 Elo'],['Mitspieler vorher','20 Elo'],['Inneres Duo-Gefälle','100 Elo'],['Ergebnis','Für den Wert egal']],hinweis:'Zwei historische Vor-Match-Stände derselben Partie, nicht heutige Elo oder Prestige.'},
    basis:'30 Partien, bekannte Vor-Match-Elo', achse:'Ein eigenes Duo, ein Match',
    abgrenzung:'Rückenwind und Einzelkämpfer messen eine Veränderung der Partnerstärke in Fenstern. Schwerster Tag misst Siegchancen. Hier zählt das innere Stärkegefälle derselben Aufstellung, nicht Teamniveau, Chance oder Sieger.',
    mind:'30 Laufbahnpartien und eine tatsächliche eigene Partie mit bekanntem Mitspieler sowie beiden kanonischen Vor-Match-Elo. Keine Mindesthöhe des Gefälles, kein Sieg und keine hohe oder niedrige Siegchance erforderlich. Gleiche Stände ergeben den gültigen Wert null.',
    rechnung:'Je eigene Partie abs(eigene Vor-Match-Elo − Partner-Vor-Match-Elo) lesen. Größter belegter Einzelwert gewinnt. Beide Mitglieder desselben Duos haben für dieses Match dasselbe Gefälle; die übrigen Spieler erhalten nicht den fremden Duo-Wert. Nicht über Partien addieren und nicht heutige Elo einsetzen. Jedes neue Match kann unmittelbar eine höhere Marke ergeben.',
    gegenbeispiel:'120 neben 20 ergibt 100 Elo. 300 neben 280 ergibt nur zwanzig, obwohl das zweite Duo insgesamt höher steht. Eine Niederlage des ersten Duos verändert sein belegtes Gefälle nicht.',
    risiko:'Keine Behauptung, wer den anderen getragen hat. Zwei Spieler teilen eine Aufstellung, keine individuell geschossenen Tore oder Leistungen. Hohe persönliche Elo und viel Spielbetrieb können mehr Extremgelegenheiten eröffnen. Fehlende historische Stände sind nicht null; beide Werte müssen aus genau demselben Vor-Match-Snapshot stammen.',
    story:'Zwischen Leon und seinem Mitspieler liegen vor dieser Partie 100 Elo. Ein außergewöhnlich ungleich besetztes Duo – unabhängig davon, wie das Match ausging.',
    beleg:'Synthetische Vor-Match-Stände zur Veranschaulichung. Kein errechneter Live-Rekord und keine zweite Simulation.'
  },
  {
    id:'gegensprung', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Gegensprung', status:'Neue Gegner, gleicher eigener Rahmen',
    frage:'Der größte Wechsel der historischen mittleren Gegner-Elo zwischen zwei direkten eigenen Partien mit komplett ausgetauschtem Gegnerduo – bei gleichem Mitspieler und eigener Position.',
    wert:'80 Elo Gegnersprung', person:'Mittel 30 → 110 · Beispiel', grafik:'erweiterung',
    bild:{typ:'matrix',zellen:[['Gegner B / C vorher','20 / 40 Elo'],['Gegner D / E danach','100 / 120 Elo'],['Eigener Rahmen','Partner + Position gleich'],['Abstand der Mittel','80 Elo']],hinweis:'Beide Gegner wechseln. Beide Paare jeweils vor ihrem eigenen Match messen; die Ergebnisse sind irrelevant.'},
    basis:'30 Partien, vollständiger Übergang', achse:'Gegner-Mittel vorher / danach',
    abgrenzung:'Rückenwind und Einzelkämpfer betreffen Mitspieler, nicht Gegner. Chancenpendel vergleicht den ganzen monatlichen Chanceverlauf mit anderen Reihenfolgen; hier ist eine konkrete Gegneränderung in Elo belegt.',
    mind:'30 Laufbahnpartien und ein direkter eigener Übergang mit identischem Partner und identischer eigener Position, aber zwei neuen Gegnern: Die beiden ungeordneten Gegnerpaare dürfen keine gemeinsame Spieler-ID haben. Beide Matches müssen derselben kanonischen Saison zugeordnet sein. Jeweils beide historischen Gegner-Elo vor dem zugehörigen Match müssen bekannt sein. Keine Mindesthöhe und kein Ergebnis erforderlich.',
    rechnung:'Mittel der zwei Gegner-Vor-Match-Elo im früheren Match bilden und separat jenes im unmittelbar nächsten eigenen Match. Wert = absoluter Abstand der beiden Mittel; größte passende Übergangsmarke halten. Je Match genau dessen zwei Gegner verwenden, nicht alle Gegnerbeobachtungen zusammenrechnen. Ein nur teilweise ausgetauschtes Gegnerpaar und eine bloß vertauschte Reihenfolge sind kein qualifizierter Übergang. Andere eigene Partien dürfen nicht übersprungen werden. Saison-/Monatsreset unterbricht, damit künstliche Elo-Neustarts kein Gegnersprung sind.',
    gegenbeispiel:'Gegner 20/40 und danach 100/120 ergeben Mittel 30 und 110, also 80 Elo. 20/40 und danach 10/50 sind andere Gegner, aber derselbe Mittelwert: ein gültiger Übergangswert null. Nur die heutige Elo beider alten Gegnerpaare anzusehen wäre falsch.',
    risiko:'Der gleichbleibende eigene Partner und die eigene Position bedeuten nicht unveränderte eigene Elo. Beide Gegner müssen wechseln, damit der Folgestand eines verbliebenen Gegners aus dem gerade gespielten Match nicht automatisch Teil des Vergleichs wird. Der Anlass beschreibt ausschließlich historische Gegnerlagen, keine kausale Wirkung des Wechsels. Auch zwischenzeitliche Spiele dieser Gegner können ihre Stände verändern. Fehlende Positionen, Partner oder historische Stände blockieren den Übergang, statt eine Verbindung über Lücken zu bauen.',
    story:'Gleicher Mitspieler, gleiche Position, plötzlich andere Gegnerlagen: Janes Gegner-Mittel steigt von 30 auf 110 Elo. Der Gegensprung beträgt 80 – ob beide Spiele gewonnen wurden, ist dafür egal.',
    beleg:'Zwei synthetische Gegnerpaare mit bekannten Vor-Match-Ständen derselben Beispiel-Saison. Keine echte Chronologie oder neue Elo-Berechnung.'
  },
  {
    id:'fixpunkt', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Fixpunkt', status:'Ein Gegner bleibt im Bild',
    frage:'Die längste ununterbrochene Folge eigener Partien, in denen dieselbe konkrete Person jedes Mal auf der Gegenseite steht. Mitspieler und zweiter Gegner dürfen wechseln.',
    wert:'5 Partien', person:'Immer gegen B · Beispiel', grafik:'erweiterung',
    bild:{typ:'bahn',felder:[['gegen B + C'],['gegen B + D'],['gegen B + C'],['gegen B + E'],['gegen B + D'],['gegen C + D','stop']],hinweis:'Fünf direkte eigene Partien mit B als Gegner. Siege und Niederlagen zählen gleich.'},
    basis:'30 Partien, bekannte Gegner', achse:'Kontinuität im ganzen eigenen Faden',
    abgrenzung:'Angstgegner misst eine Niederlagenquote, Ausbruch einen beendeten direkten Bann. Grenzverkehr erlaubt andere Matches zwischen Begegnungen mit derselben Person. Fixpunkt verlangt diese Person dagegen in jeder einzelnen eigenen Partie des Laufs als Gegner.',
    mind:'30 Laufbahnpartien und vollständige eindeutige Teamzuordnungen im betrachteten Lauf. Jede bekannte eigene Partie startet für ihre beiden Gegner je eine Folge bei eins. Keine Mindestzahl an verschiedenen Gegnern, keine Ergebnis- oder Folgelängenlatte.',
    rechnung:'Je eigenen Match für jeden konkreten Gegner die laufende Anwesenheitsfolge führen. Ist J im aktuellen Gegnerpaar, seine vorherige Folge um eins verlängern; fehlt J oder ist er diesmal Partner, seine Folge beenden. Jede eigene Partie zählt, auch an einem neuen Tag oder in einem neuen Monat. Größter Einzelgegner-Lauf ist der Wert. Bei zwei durchgehend anwesenden Gegnern die zwei gleich langen Belege nennen, niemals beide Längen addieren.',
    gegenbeispiel:'Gegnerpaare B/C → B/D → B/C → B/E → B/D ergeben für B fünf, auch bei fünf Niederlagen. B/C → D/E → B/C ergibt für B nur eins: Die eigene Partie dazwischen beendet den Lauf, selbst wenn die nächste direkte Begegnung wieder mit B ist.',
    risiko:'Eine organisierte Runde mit festen Duos kann allen vier Spielern lange Belege geben. Das ist eine neutrale Aufstellungsfügung, kein Rivalitäts- oder Leistungsbeweis. Andere Ligamatches ohne den Spieler ändern seinen eigenen Lauf nicht. Unbekannte Teamzuordnung unterbricht; fehlende Spiele niemals als bestätigte Anwesenheit überspringen. Keine endliche Sammlung aller Gegner.',
    story:'Fünf eigene Partien lang steht Leon jedes Mal gegen denselben Spieler. Um ihn herum wechseln die Mitspieler und zweiten Gegner – sein Fixpunkt bleibt.',
    beleg:'Synthetische Gegnerfolge. Keine gemessene Fixture-Marke, keine Behauptung über Leons reale Rivalität und keine Siegeszahl-Auszeichnung.'
  }
];
