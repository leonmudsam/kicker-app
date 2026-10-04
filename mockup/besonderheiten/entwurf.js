'use strict';
(() => {
  const vorschlaege = [
    {
      id:'herzschlaglauf', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Herzschlaglauf', status:'Ergebnismuster',
      frage:'Die längste zusammenhängende Folge, in der jede eigene Partie mit genau einem Tor Unterschied endet. Sieg oder Niederlage ist egal.',
      wert:'3 Partien', person:'Jane & Martin · Testbasis', grafik:'herz',
      basis:'30 Laufbahnpartien', achse:'Ununterbrochene Folge',
      abgrenzung:'Nadelöhr zählt den Anteil aller Ein-Tor-Partien. Hier zählt ihre unmittelbare Reihenfolge.',
      mind:'Die vorhandene Zulassung ab 30 Laufbahnpartien. Keine zusätzliche Mindestquote und keine Mindestfolgelänge. Ein Ein-Tor-Spiel startet bei 1; ohne solches Spiel ist der Wert 0.',
      rechnung:'Chronologische eigene Partien durchgehen. Bei genau einem Tor Abstand die Folge um eins verlängern, sonst auf null setzen. Der größte erreichte Stand gilt. Tag und Monat setzen die Folge nicht zurück.',
      gegenbeispiel:'Abstände 1–7–1–7–1–7 und 1–1–1–7–7–7 haben beide 50 % Ein-Tor-Partien. Die längste enge Folge ist aber 1 beziehungsweise 3.',
      risiko:'Verwandte Ergebnisfamilie: In den 466 Testpartien ähnelt die Rangfolge der von Nadelöhr. Beide Anlässe bei demselben Match bündeln. Nicht aus einem kleinen Bestwert eine vermeintlich seltene Leistung machen.',
      story:'Jane erlebt drei Partien ohne Luft zum Durchatmen: jedes Mal ein Tor Unterschied. Der Herzschlaglauf gehört jetzt Jane und Martin.',
      beleg:'Gemessen an tests/fixtures/matches.txt: 466 Partien, elf Spieler mit mindestens 30 Einsätzen. Kein behaupteter Live-Stand. Die gezeichnete Ergebnisfolge illustriert das Muster und ist kein ausgelesener Spielbeleg.'
    },
    {
      id:'wanderpass', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Wanderpass', status:'Aufstellungsmuster',
      frage:'Die längste Folge eigener Partien, bei der nach jedem Spiel der Mitspieler wechselt. Ein früherer Partner darf wiederkehren.',
      wert:'21 Partien', person:'Stefan · Testbasis', grafik:'wander',
      basis:'30 Laufbahnpartien', achse:'Partnerfolge, nicht Sammlung',
      abgrenzung:'Katalysator und Kontrast messen Ergebnisse mit Partnern. Wanderpass misst die Abfolge der Aufstellungen.',
      mind:'30 Laufbahnpartien und bekannte Mitspieler im betrachteten Abschnitt. Jede bekannte Partie startet eine Folge bei 1. Keine Mindestanzahl unterschiedlicher Partner und keine Siegquote.',
      rechnung:'Ein anderer Mitspieler als in der direkt vorherigen eigenen Partie verlängert die Folge. Derselbe Mitspieler startet eine neue Folge bei 1. Unbekannte Zuordnung unterbricht; keine Lücken überspringen.',
      gegenbeispiel:'A–B–A–B zählt vier Partien, obwohl nur zwei Partner beteiligt sind. Das ist keine Sammlung aller Mitspieler und hat keine Decke durch die Ligagröße.',
      risiko:'Organisierte Rotation und viele Einsätze geben mehr Gelegenheiten. Das ist ein beobachtetes Aufstellungsmuster, keine Aussage, dass Stefan dadurch besser spielte. Tage und Monate unterbrechen eine bekannte Folge nicht.',
      story:'21 Partien lang hatte Stefan nie zweimal nacheinander denselben Mitspieler. Ein Wanderpass ohne festen Platz neben ihm.',
      beleg:'Bestwert aus den 466 Testpartien: Stefan, 21. Die kurze A/B/C-Bahn ist eine Illustration, kein Verlauf dieser 21 echten Partien.'
    },
    {
      id:'pendler', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Pendler', status:'Entwurf fortgeführt',
      frage:'Die längste Folge mit einem Wechsel zwischen Sturm und Abwehr nach jeder eigenen Partie. Das Ergebnis spielt keine Rolle.',
      wert:'10 Partien', person:'Leo & Maxi · Testbasis', grafik:'pendler',
      basis:'30 Laufbahnpartien', achse:'Durchgehender Rollenwechsel',
      abgrenzung:'Seitenwechsler misst die Wechselquote der Laufbahn; Wandler die Rollenverteilung. Hier gilt ein ununterbrochener Lauf.',
      mind:'30 Laufbahnpartien und bekannte Positionen. Jede bekannte Partie startet bei 1. Keine zusätzlich geforderte hohe Wechselquote; unbekannte Positionen unterbrechen die Folge.',
      rechnung:'Sturm nach Abwehr oder Abwehr nach Sturm verlängert um eins. Zweimal dieselbe Position startet neu bei 1. Gesucht ist das Maximum, auch über Tages- und Monatsgrenzen.',
      gegenbeispiel:'Viele verstreute Rollenwechsel können dieselbe Wechselquote ergeben wie ein langer Pendellauf. Die Quote verrät nicht, ob zehn unmittelbar aufeinanderfolgende Partien pendelten.',
      risiko:'Diese Idee existiert bereits in rekord-ideen.html, aber nicht im App-Katalog. Hier wird sie übernommen, nicht als neu erfundene Idee ausgegeben. Ein neutrales Aufstellungsmuster bleibt Fügung.',
      story:'Leo und Maxi teilen zehn Partien im ständigen Positionswechsel. Auf Sturm folgte jedes Mal Abwehr – und wieder zurück.',
      beleg:'Nachgerechnet in den 466 Testpartien: Leo und Maxi teilen den Bestwert 10. Die verkürzte Bahn illustriert die Regel.'
    },
    {
      id:'ausbruch-allzeit', katalogId:'ausbruch', bereich:'rekorde', art:'fuegung', kategorie:'Fügungen', titel:'Der Ausbruch', status:'Bestehenden Eintrag ergänzen',
      frage:'Der längste persönliche Niederlagenbann gegen einen Gegner, der durch einen späteren Sieg tatsächlich beendet wurde.',
      wert:'17 Niederlagen', person:'Stefan gegen Julian · Testbasis', grafik:'ausbruch',
      basis:'30 Laufbahnpartien', achse:'Beendeter Gegner-Bann',
      abgrenzung:'Ausbruch ist schon Monatschronik. Nur seine fehlende Allzeitwertung ergänzen, unter derselben Disziplin und demselben Namen.',
      mind:'30 Laufbahnpartien und wenigstens ein durch einen Sieg beendeter Bann. Schon eine vorangegangene Niederlage ist gültig. Die 17er-Schwelle der bestehenden Monatschronik darf nicht in den Rekord übernommen werden.',
      rechnung:'Je Spieler und Gegner die aufeinanderfolgenden direkten Niederlagen führen. Andere Gegner dazwischen verändern diesen Faden nicht. Ein Sieg schließt ihn; sein vorheriger Stand ist der Beleg. Größter abgeschlossener Stand gewinnt.',
      gegenbeispiel:'Zwölf noch laufende Niederlagen sind kein Ausbruch. Ein Sieg nach einer einzigen direkten Niederlage ist dagegen ein gültiger abgeschlossener Bann – nur ein kleinerer Bestwert.',
      risiko:'Pro Sieg können zwei Gegnerfäden enden. Den tatsächlichen größten Beleg nennen, nicht beide Werte addieren. Der Zeitpunkt ist das schließende Match, nicht die erste Niederlage. Ohne abgeschlossenen Bann bleibt der Wert unbekannt, nicht künstlich null.',
      story:'Stefan löst den Bann gegen Julian: Nach 17 direkten Niederlagen gelingt am 3. August endlich der Sieg.',
      beleg:'Fixture-Beleg m0365, 03.08.2026, 16:02 Europe/Berlin. Dies ist keine neue zweite Chronik und keine Änderung am bestehenden Monatsarchiv.'
    },
    {
      id:'quantensprung', bereich:'monate', art:'koennen', kategorie:'Können', titel:'Der Quantensprung', beiname:'Der Neugeformte', status:'Eigene Vorgeschichte',
      frage:'Wer verbessert seine erwartungsbereinigte Leistung gegenüber dem Vormonat am stärksten? Das alte eigene Niveau ist der Vergleich, nicht die Ligaspitze.',
      wert:'+25 Punkte', person:'10 % → 40 % Siege · Beispiel', grafik:'quant',
      basis:'Je 12 Partien, mehrere Tage', achse:'Monat gegen Vormonat',
      abgrenzung:'Steigerung und Höhenflug vergleichen Teile desselben Monats. Übersoll misst die Übererfüllung jetzt, nicht ihre Veränderung.',
      mind:'Vorgeschlagen: mindestens zwölf eigene Partien an drei Tagen in beiden vollständigen Monaten. Beide Kalendermonate stehen vor der Auswertung fest. Fehlt der Vormonat, gibt es keinen erfundenen Null-Vergleich.',
      rechnung:'Je Monat den Mittelwert aus tatsächlichem Ergebnis (Sieg 1, Niederlage 0) minus gespeicherter Anpfiff-Siegchance bilden. Aktuellen Wert minus Vormonatswert vergleichen. Der größte positive Ausschlag gewinnt, auch unter 50 % Siegquote.',
      gegenbeispiel:'Im Beispiel: vorher 10 % Siege bei 35 % Erwartung, jetzt 40 % bei 40 % Erwartung. Der Residual verbessert sich von −25 auf 0 Prozentpunkte. Ein Spieler mit 80 % ohne eigene Verbesserung ist nicht automatisch vorn.',
      risiko:'Geänderte Aufstellungen können trotz Erwartungsbereinigung mitwirken. Nur eine beobachtete Entwicklung behaupten. Rollen-Aufbruch ist zunächst eine alternative Spezialisierung, keine zusätzlich gestapelte Formchronik.',
      story:'Sein Vormonat lag deutlich unter der Rechnung. Jetzt kommt Jannik auf 40 % Siege und erfüllt sein Soll – der stärkste Sprung gegenüber dem eigenen Ausgangspunkt.',
      beleg:'Reines Rechenbeispiel, keine aktuelle Spielerstatistik. Kein Mindestwert von 60, 75 oder 85 % als Zulassung.'
    },
    {
      id:'staffellauf', bereich:'monate', art:'koennen', kategorie:'Können', titel:'Der Staffellauf', beiname:'Der Anschlussfinder', status:'Zeitlicher Spielkontext',
      frage:'Wer fällt unmittelbar nach einem Partnerwechsel stärker über der Erwartung auf als in Partien mit unverändertem Partner?',
      wert:'+25 Punkte', person:'Auch mit 45 % Siegen möglich · Beispiel', grafik:'staffel',
      basis:'5 Wechsel / 5 ohne Wechsel', achse:'Direkter Übergang im Spieltag',
      abgrenzung:'Kontrast vergleicht welche Partner. Katalysator vergleicht Partnerquoten mit und ohne den Spieler. Hier zählt der Zeitpunkt nach einem Wechsel.',
      mind:'Vorgeschlagen: fünf Partien nach Wechsel und fünf ohne Wechsel, über mindestens drei eigene Spieltage. Die erste Partie jedes Tages gehört zu keiner Gruppe. Nur unmittelbar vorherige eigene Partien mit bekannten Mitspielern zählen.',
      rechnung:'In beiden Gruppen den Mittelwert von Siegindikator minus Anpfiff-Siegchance bilden. Wechselgruppe minus Gleichbleibegruppe. Größter positiver Unterschied gewinnt. Nicht nachträglich nur günstige Partner oder Rollen auswählen.',
      gegenbeispiel:'45 % Siege bei 35 % Erwartung nach Wechseln ergibt +10 Punkte. 35 % Siege bei 50 % Erwartung ohne Wechsel ergibt −15. Der Ausschlag ist +25, ohne hohe absolute Siegquote.',
      risiko:'Kein kausaler Beweis. Nicht „Partnerwechsel machen ihn besser“, sondern „nach Partnerwechseln fiel seine Leistung auf“. Aufstellungen, Positionen und Gruppengrößen im späteren echten Blatt mit anzeigen.',
      story:'Unmittelbar nach Partnerwechseln fällt Johannes auf: Diese Partien liegen 25 Punkte günstiger gegenüber der Rechnung als die mit gleichem Partner.',
      beleg:'Erfundene Gruppenwerte zur Erklärung. Gemeinsame Erfolgszahlen nicht als zweite Partner-Auszeichnung führen.'
    },
    {
      id:'quertreiber', bereich:'monate', art:'fuegung', kategorie:'Fügung', titel:'Der Quertreiber', beiname:'Der Quertreiber', status:'Umgekehrtes Erwartungsbild',
      frage:'Die größte Umkehr der Erwartungsrollen: als Außenseiter häufiger gewonnen als als Favorit. Auch zwei niedrige Quoten können auffällig sein.',
      wert:'+20 Punkte', person:'35 % als Außenseiter / 15 % als Favorit', grafik:'quer',
      basis:'5 Partien je Ausgangslage', achse:'Außenseiter minus Favorit',
      abgrenzung:'Favoritenschreck misst die absolute Außenseiterquote. Favorit wie Außenseiter sucht einen kleinen Abstand, nicht seine umgekehrte Richtung.',
      mind:'Vorgeschlagen: fünf Partien mit unter 45 % Anpfiffchance und fünf mit über 55 %, an mehreren Tagen. Die mittlere Zone wird nicht willkürlich einer Seite zugeschlagen. Keine Mindest-Siegquote.',
      rechnung:'Außenseiter-Siegquote minus Favoriten-Siegquote. Die größte positive Umkehr gewinnt. Den Abstand gegen eine Vergleichsverteilung mit denselben Gruppengrößen und historischen Anpfiffchancen auf Belastbarkeit prüfen.',
      gegenbeispiel:'35 % gegen die Rechnung und 15 % in vermeintlich leichteren Spielen ist eine Umkehr, obwohl beide Quoten schwach sind. Eine bloß starke 80%-Außenseiterquote ohne Umkehr ist ein anderer Anlass.',
      risiko:'Das ist ein kurioses Monatsbild, keine behauptete Fähigkeit, absichtlich gegen starke Gegner besser zu spielen. Geringe Gruppen sind laut; Größen und durchschnittliche Chancen gehören in den Beleg.',
      story:'Die vermeintlich schwierigen Partien liefen besser: Julian gewinnt als Außenseiter 35 %, als Favorit nur 15 %. Ein Monat gegen die einfache Reihenfolge.',
      beleg:'Illustration mit erfundenen Quoten. Ohne tatsächliche Umkehr keine Umkehr-Chronik; das ist die Ereignisdefinition, keine Mindestwinrate.'
    },
    {
      id:'gegenlaeufer', bereich:'monate', art:'fuegung', kategorie:'Fügung', titel:'Der Gegenläufer', beiname:'Der Gegenläufer', status:'Rollenmix statt Rechenfehler',
      frage:'Auf beiden Positionen verbessert, insgesamt aber schwächer – oder genau umgekehrt. Die veränderte Mischung der Rollen erklärt den Widerspruch.',
      wert:'Beide +10 / gesamt −18', person:'Eine gemeinsame Muster-Chronik', grafik:'simpson',
      basis:'5 Partien je Rolle und Hälfte', achse:'Feste Kalenderhälften',
      abgrenzung:'Spezialist misst den Positionsabstand, Steigerung den Gesamtanstieg. Hier zählt gerade der Widerspruch zwischen Gesamtbild und beiden Teilbildern.',
      mind:'Vorgeschlagen: fünf Spiele auf jeder Position in jeder festen Monatshälfte (1.–15. und 16.–Monatsende). Vier Teilstichproben, bekannte Positionen. Kein nachträglich verschobener Trennpunkt.',
      rechnung:'Quotenänderung im Sturm, in der Abwehr und insgesamt berechnen. Die Gesamtquote umfasst genau dieselben bekannten Positionspartien wie die beiden Rollen zusammen; unbekannte Positionen in allen drei Größen ausschließen und zählen. Beide Rollen ändern sich in derselben Richtung, die Gesamtquote strikt entgegengesetzt. Als Ausschlag die kleinste der drei absoluten Änderungen werten, damit keine nahezu flache Teilgruppe den Titel trägt.',
      gegenbeispiel:'Erste Hälfte: Sturm 14/20 (70 %), Abwehr 1/10 (10 %), gesamt 50 %. Zweite Hälfte: Sturm 8/10 (80 %), Abwehr 8/40 (20 %), gesamt 32 %. Mehr Abwehrspiele verändern das Gesamtbild, obwohl beide Rollen besser wurden.',
      risiko:'Das Blatt muss Gruppengrößen und Rollenmix zeigen. Keine Ursache erfinden und nicht die Gesamtquote als Rechenfehler darstellen. Beide Richtungen sind dieselbe Musterfrage, keine zwei kopierten Disziplinen.',
      story:'Beide Positionen legen zu, die Monatsbilanz fällt trotzdem. Jane spielte viel häufiger in ihrer schwierigeren Rolle – das Teilbild und das Gesamtbild laufen gegeneinander.',
      beleg:'Exaktes synthetisches Beispiel mit ganzzahligen Ergebnissen. Keine Behauptung über Janes echte Rolle oder Leistung.'
    },
    {
      id:'spiegelmonat', bereich:'monate', art:'fuegung', kategorie:'Fügung', titel:'Der Spiegelmonat', beiname:'Der Spiegelspieler', status:'Symmetrische Reihenfolge',
      frage:'Sieg–Niederlage–Niederlage–Sieg oder die umgekehrte Folge tritt in festen Viererblöcken ungewöhnlich oft auf.',
      wert:'3 von 5 Blöcken', person:'Gleiche Siege, anderes Monatsmuster', grafik:'spiegel',
      basis:'Mindestens 5 vollständige Blöcke', achse:'Reihenfolge statt Gesamtquote',
      abgrenzung:'Wechselbad misst striktes S–N–S–N. Lieblingszahl misst konkrete Endstände. Hier liegen außen und innen jeweils gleiche Ergebnisse.',
      mind:'Vorgeschlagen: mindestens zwanzig eigene Monats-Partien. Vom ersten eigenen Match an feste, nicht überlappende Viererblöcke. Restliche ein bis drei Partien bilden keinen Block; sie bleiben in der Gesamtzahl und Vergleichsbasis sichtbar.',
      rechnung:'Trefferanteil der beiden spiegelnden Viererfolgen minus erwarteter Anteil bei zufälliger Reihenfolge mit exakt derselben Sieg-/Niederlagenzahl. Der größte Überschuss gewinnt. Für die Stärke alle Blöcke gemeinsam vergleichen, nicht unabhängige Versuche vortäuschen.',
      gegenbeispiel:'Bei 10 Siegen und 10 Niederlagen liegt die Vergleichshäufigkeit pro Block bei etwa 14 %. Drei Treffer in fünf Blöcken ergeben 60 %. W–W–W–W zählt nicht; mehr Siege allein erzeugen diesen Titel nicht.',
      risiko:'Startpunkt oder Blockgröße dürfen nicht nach dem Ergebnis gewählt werden. Ein seltenes Motiv muss an weiteren Monaten geprüft werden. Die Grafik ist ein Musterbeleg, keine Siegesserie.',
      story:'Der Monat spiegelt sich: Drei von fünf Viererblöcken beginnen und enden gleich, mit zwei gegensätzlichen Ergebnissen dazwischen.',
      beleg:'Die gezeigten fünf Blöcke enthalten insgesamt zehn Siege und zehn Niederlagen. Erwartete 14 % sind aus genau dieser synthetischen Zusammensetzung gerechnet, keine Messung an der Liga.'
    },
    {
      id:'erwartungskorridor', bereich:'monate', art:'konstanz', kategorie:'Konstanz', titel:'Der Erwartungskorridor', beiname:'Der Spurtreue', status:'Der Weg, nicht nur das Ende',
      frage:'Wessen Weg zum Endsaldo verläuft ungewöhnlich ruhig gegenüber gleich langen Folgen mit derselben Bilanz und denselben Anpfiffchancen?',
      wert:'0,5 statt 5 Siege', person:'Zwei Wege, gleicher Endsaldo · Beispiel', grafik:'korridor',
      basis:'20 Partien, mehrere Tage', achse:'Alle Zwischenstände',
      abgrenzung:'Erwartungstreue betrachtet nur den Endsaldo. Ein wilder Lauf kann dort auf null zurückkehren. Hier wird der ganze Weg geprüft.',
      mind:'Vorgeschlagen: zwanzig eigene Partien an mindestens drei Tagen. Nur gespeicherte Anpfiffchancen. Die gesamte eigene Monatsfolge und der Startwert null gehören in den Verlauf.',
      rechnung:'Für jeden Zwischenstand tatsächliche Siege minus aufsummierte Anpfiffchancen führen. Breite = höchster minus niedrigster Zwischenstand. Als Monats-Ausschlag die ungewöhnliche Enge gegenüber Reihenfolge-Vergleichen mit gleicher Länge, Siegzahl und denselben festen Chancen bewerten.',
      gegenbeispiel:'Zehn Siege, dann zehn Niederlagen bei je 50 % Chance enden bei null, haben aber Breite 5. Im ständigen Wechsel endet dieselbe Bilanz ebenfalls bei null, mit Breite 0,5. Nicht nur der letzte Punkt zählt.',
      risiko:'Die Vergleichsverteilung ist ein Ordnungsmodell, kein behaupteter Elo-Wahrscheinlichkeitstest. Bei einer Referenz ohne Streuung ist kein standardisierter Ausschlag bestimmbar. Unterschiedliche Spielzahlen fair vergleichen; keine erfundene σ-Zahl als Gütesiegel.',
      story:'Leos Weg zum Endsaldo hat weniger zusätzliche Ausschläge als vergleichbare Folgen mit derselben Bilanz. Nicht nur der letzte Punkt erzählt diesen Monat.',
      beleg:'Zwei mathematisch illustrative 20er-Folgen, je zehn Siege und Niederlagen. Die Karte nennt keinen kalibrierten Gewinner oder echten Vergleichsmedian.'
    },
    {
      id:'anderes-trikot', bereich:'monate', art:'fuegung', kategorie:'Fügung', titel:'Anderes Trikot', beiname:'Der Neuverbundene', status:'Eigene Aufstellungsänderung',
      frage:'Die Partnerverteilung verändert sich am stärksten gegenüber dem Vormonat. Nicht mehr Partner sammeln, sondern anders zusammenspielen.',
      wert:'60 % Umschichtung', person:'Leon → Maxi · Beispiel', grafik:'trikot',
      basis:'Je 12 bekannte Zuordnungen', achse:'Partneranteile Monat gegen Vormonat',
      abgrenzung:'Rückenwind und Einzelkämpfer messen Mitspieler-Stärke. Diese Frage misst die Zusammensetzung, unabhängig von Elo und Siegen.',
      mind:'Vorgeschlagen: zwölf bekannte Partnerzuordnungen an drei Tagen in beiden vollständigen Monaten. Alle beteiligten Partner-IDs in die gemeinsame Liste nehmen; ein fehlender Anteil ist null, ein fehlender Monat nicht.',
      rechnung:'Je Partner die Einsatzanteile der beiden Monate vergleichen. Die Hälfte der Summe ihrer absoluten Unterschiede ist die Umschichtung. Größter Abstand gewinnt. Eine neue Ligabesetzung im Beleg nennen, statt sie als eigene Leistung auszugeben.',
      gegenbeispiel:'Vorher Leon 70 %, Maxi 10 %, Stefan 20 %. Jetzt Leon 20 %, Maxi 70 %, Stefan 10 %. Die Zahl der Partner bleibt drei, die Verteilung verschiebt sich um 60 %.',
      risiko:'Eine einzelne vollständige Umschichtung kann 100 % erreichen. Deshalb bewusst nur Monatschronik, kein endliches Allzeit-Sammelziel. Kein Duo-Titel: Beleg beschreibt die gesamte Partnerverteilung eines Spielers.',
      story:'Martins Monat hat ein anderes Trikot: dieselben drei Mitspieler, aber Maxi übernimmt den Platz, den zuvor meistens Leon hatte.',
      beleg:'Erfundene Anteile. Kein Anspruch, dass diese Partnerkombinationen tatsächlich gespielt wurden.'
    },
    {
      id:'tagesumkehr', bereich:'monate', art:'fuegung', kategorie:'Fügung', titel:'Die Tagesumkehr', beiname:'Der Umkehrspieler', status:'Gemeinsames Tagesmuster',
      frage:'Erste und letzte eigene Partie eines Spieltags enden auffällig oft gegensätzlich. Beide Richtungen zählen gleich.',
      wert:'5 von 6 Tagen', person:'Auch bei 30 % Monatsquote · Beispiel', grafik:'umkehr',
      basis:'5 Tage mit je 3 Partien', achse:'Anfang und Ende zusammen',
      abgrenzung:'Kaltstart und Endspurt messen Siegquoten an einzelnen Tagesenden. Wechselhaft misst Unterschiede zwischen Tagen. Hier zählt ein gemeinsames Anfang-Ende-Muster.',
      mind:'Vorgeschlagen: fünf eigene Spieltage mit mindestens drei Partien. Kalendertage in Europe/Berlin, nur eigene erste und letzte Partie. Keine nachträgliche Wahl günstiger Tagesausschnitte.',
      rechnung:'Anteil der Tage mit gegensätzlichem Auftakt und Abschluss gegen ein Reihenfolge-Modell mit derselben Gesamtzahl an Siegen und Niederlagen vergleichen. Die Tagesgrenzen und Gruppengrößen bleiben dabei fest. Größter Überschuss gewinnt.',
      gegenbeispiel:'In 30 Partien mit neun Siegen und 21 Niederlagen sind gegensätzliche Paare im Reihenfolge-Vergleich zu etwa 43 % zu erwarten. Fünf von sechs Tagen sind 83 % – ein auffälliges Muster trotz nur 30 % Siegquote.',
      risiko:'Kein „spielt sich warm“: Sieg→Niederlage zählt genauso wie Niederlage→Sieg. Die Vergleichshäufigkeit beschreibt eine Reihenfolge, keine Ursache oder unabhängig gezogene Tagespaare.',
      story:'Der erste Ball sagt selten etwas über den letzten: Fünf von sechs Spieltagen enden für Maxi mit dem gegensätzlichen Ergebnis zum Auftakt.',
      beleg:'Synthetische Monatszusammensetzung und Tagespaare. Die etwa 43 % sind daraus exakt ableitbar, nicht an der Live-Liga gemessen.'
    }
  ];
  vorschlaege.push(...window.BESONDERHEITEN_ERWEITERUNG);
  vorschlaege.push(...window.BESONDERHEITEN_PARTIE_REKORDE, ...window.BESONDERHEITEN_MONATSMUSTER, window.BESONDERHEITEN_UMSCHALT_MONAT);

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bahn = a => '<div class="bahn">'+a.map(x => '<span'+(x[1]?' class="'+x[1]+'"':'')+'>'+esc(x[0])+'</span>').join('')+'</div>';
  const reihe = (name,wert,breite,alt=false) => '<div class="wertzeile'+(alt?' vorher':'')+'"><span>'+esc(name)+'</span><div class="spur"><i style="width:'+breite+'%"></i></div><strong>'+esc(wert)+'</strong></div>';
  const vergleich = rows => '<div class="vergleich">'+rows.map(r=>reihe(...r)).join('')+'</div>';
  function erweiterteGrafik(d){
    const b=d.bild;
    let bild='';
    if(b.typ==='bahn') bild=bahn(b.felder);
    if(b.typ==='balken') bild=vergleich(b.zeilen);
    if(b.typ==='matrix') bild='<div class="matrix">'+b.zellen.map(([label,wert])=>'<div><span>'+esc(label)+'</span><strong>'+esc(wert)+'</strong></div>').join('')+'</div>';
    if(b.typ==='weg'){
      const min=Math.min(...b.werte),max=Math.max(...b.werte),span=max-min||1;
      const x=i=>20+i*260/Math.max(1,b.werte.length-1),y=v=>90-(v-min)/span*65;
      const p=b.werte.map((v,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(v).toFixed(2)).join(' ');
      const labels=[...new Set([0,b.werte.indexOf(min),b.werte.indexOf(max),b.werte.length-1])];
      bild='<svg class="grafik weg" viewBox="0 0 300 110" role="img" aria-label="'+esc('Illustrativer Verlauf in '+b.einheit+': '+b.werte.join(', '))+'"><path class="gitter" d="M20 90H280"/><path class="linie" d="'+p+'"/>'+b.werte.map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3"/>').join('')+labels.map(i=>'<text x="'+x(i)+'" y="'+(y(b.werte[i])-9)+'" text-anchor="'+(i===0?'start':i===b.werte.length-1?'end':'middle')+'">'+esc(b.werte[i])+'</text>').join('')+'</svg><p class="vergleich-hinweis">'+esc(b.einheit)+'</p>';
    }
    if(b.typ==='profil'){
      const max=Math.max(...b.eigen,...b.rest,1);
      bild='<div class="profil-legende"><span>Eigene Partien</span><span>Restliga</span><span>Max. '+max+' %</span></div><div class="profil">'+b.eigen.map((v,i)=>'<div role="img" aria-label="'+esc('10:'+i+' beziehungsweise '+i+':10: eigene Partien '+v+' Prozent, Restliga '+b.rest[i]+' Prozent')+'"><div class="saeulen"><i style="height:'+v/max*60+'px"></i><i class="rest" style="height:'+b.rest[i]/max*60+'px"></i></div><span>'+i+'</span></div>').join('')+'</div>';
    }
    return bild+(b.hinweis?'<p class="vergleich-hinweis">'+esc(b.hinweis)+'</p>':'');
  }
  function grafik(d){
    let bild='';
    switch(d.grafik){
      case 'herz': bild=bahn([['10:9'],['9:10','pleite'],['10:9'],['10:5','stop']]); break;
      case 'wander': bild=bahn([['A'],['B'],['A'],['C'],['B'],['A'],['…'],['A→A','stop']]); break;
      case 'pendler': bild=bahn([['Sturm'],['Abwehr'],['Sturm'],['Abwehr'],['…'],['Abwehr','stop']]); break;
      case 'ausbruch': bild=bahn([['N','pleite'],['N','pleite'],['N','pleite'],['…'],['17 × N','pleite'],['Sieg','ende']]); break;
      case 'quant': bild=vergleich([['Vormonat','10 %',10,true],['Dieser Monat','40 %',40]])+'<p class="vergleich-hinweis">Erwartung: 35 % → 40 % · Residual: −25 → 0</p>'; break;
      case 'staffel': bild=vergleich([['Partner gleich','35 %',35,true],['Nach Wechsel','45 %',45]])+'<p class="vergleich-hinweis">Erwartung: 50 % / 35 % · Residual: −15 / +10</p>'; break;
      case 'quer': bild=vergleich([['Als Favorit','15 %',15,true],['Als Außenseiter','35 %',35]]); break;
      case 'simpson': bild=vergleich([['Sturm','70→80 %',80],['Abwehr','10→20 %',20],['Gesamt','50→32 %',32,true]])+'<p class="vergleich-hinweis">Sturmanteil fällt von 67 auf 20 %.</p>'; break;
      case 'spiegel': bild=bahn([['S N N S'],['N S S N'],['S N N S'],['S S N N','stop'],['S S N N','stop']])+'<p class="vergleich-hinweis">60 % spiegelnd · Vergleich etwa 14 %</p>'; break;
      case 'korridor': {
        const actual=Array.from({length:21},(_,i)=>i%2?.5:0),wild=Array.from({length:21},(_,i)=>i<=10?i*.5:(20-i)*.5);
        const path=a=>a.map((y,i)=>(i?'L':'M')+(10+i*14)+' '+(66-y*10)).join(' ');
        bild='<svg class="grafik" viewBox="0 0 300 82" role="img" aria-label="Zwei 20er-Folgen mit gleichem Endsaldo null. Die ruhige Folge pendelt zwischen null und einem halben Sieg, die andere steigt bis fünf und kehrt zurück."><path class="gitter" d="M10 66H290"/><rect class="band" x="10" y="60" width="280" height="7"/><path d="'+path(wild)+'" stroke="#819086" stroke-width="1.5" fill="none"/><path class="linie" d="'+path(actual)+'"/><text x="15" y="17">5</text><text x="275" y="79">0</text></svg>'; break;
      }
      case 'trikot': bild=vergleich([['Leon','70→20 %',20,true],['Maxi','10→70 %',70],['Stefan','20→10 %',10,true]]); break;
      case 'umkehr': bild=bahn([['S→N'],['N→S'],['S→N'],['N→S'],['S→N'],['N→N','stop']])+'<p class="vergleich-hinweis">83 % gegensätzlich · Vergleich etwa 43 %</p>'; break;
      case 'erweiterung': bild=erweiterteGrafik(d); break;
    }
    return '<div class="beispiel"><div class="beispiel-kopf"><b>'+esc(d.wert)+'</b><span>'+esc(d.person)+'</span></div>'+bild+'</div>';
  }
  function karte(d){
    return '<article class="idee '+d.art+'"><div class="idee-kopf"><p class="rubrik">'+esc(d.kategorie)+'</p><span class="kennzeichen">'+esc(d.bereich==='monate'?'Beispieldaten':d.status)+'</span></div>'+grafik(d)+'<h3>'+esc(d.titel)+'</h3><p class="frage">'+esc(d.frage)+'</p><div class="fakten"><div><b>Stichprobe</b>'+esc(d.basis)+'</div><div><b>Messfrage</b>'+esc(d.achse)+'</div></div><p class="bezug"><strong>Abgrenzung:</strong> '+esc(d.abgrenzung)+'</p><button type="button" class="details-button" data-detail="'+d.id+'">Regel, Beleg und Story ansehen</button></article>';
  }
  document.getElementById('rekord-karten').innerHTML=vorschlaege.filter(d=>d.bereich==='rekorde').map(karte).join('');
  document.getElementById('monats-karten').innerHTML=vorschlaege.filter(d=>d.bereich==='monate').map(karte).join('');
  document.querySelector('#tab-rekorde span').textContent=vorschlaege.filter(d=>d.bereich==='rekorde').length;
  document.querySelector('#tab-monate span').textContent=vorschlaege.filter(d=>d.bereich==='monate').length;

  const tabs=[...document.querySelectorAll('[role=tab]')];
  function select(tab){
    tabs.forEach(t=>t.setAttribute('aria-selected',String(t===tab)));
    document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!==tab.getAttribute('aria-controls'));
  }
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>select(t));
    t.addEventListener('keydown',e=>{
      let n;
      if(e.key==='ArrowRight') n=(i+1)%tabs.length;
      if(e.key==='ArrowLeft') n=(i+tabs.length-1)%tabs.length;
      if(e.key==='Home') n=0;
      if(e.key==='End') n=tabs.length-1;
      if(n!==undefined){e.preventDefault();select(tabs[n]);tabs[n].focus();}
    });
  });

  const dialog=document.getElementById('detail');
  const inhalt=document.getElementById('detail-inhalt');
  document.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>{
    const d=vorschlaege.find(x=>x.id===b.dataset.detail);
    dialog.style.setProperty('--tone','var(--'+({koennen:'gold',mark:'gold',konstanz:'blue',fuegung:'purple'}[d.art])+')');
    document.getElementById('detail-kategorie').textContent=d.kategorie+(d.beiname?' · '+d.beiname:' · Liga-Rekord');
    document.getElementById('detail-titel').textContent=d.titel;
    inhalt.innerHTML='<p class="aussage">'+esc(d.frage)+'</p>'+grafik(d)+'<div class="mindest"><p class="rubrik">'+(d.bereich==='monate'?'Vorgeschlagene Mindeststichprobe':'Stichprobe, keine Leistungslatte')+'</p><p>'+esc(d.mind)+'</p></div>'+[
      ['Was genau verglichen wird',d.rechnung],['Warum es keine Kopie ist',d.abgrenzung+' '+d.gegenbeispiel],['Worauf der Beleg achten muss',d.risiko],['Herkunft der Zahlen',d.beleg]
    ].map(([title,text])=>'<h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>').join('')+'<h3>Beispiel als Anlass einer Story</h3><p class="story">'+esc(d.story)+'</p><p>Wenn weitere Anlässe am selben Match hängen, kommen sie als zusätzliche Zeilen auf dieselbe Karte. Die Score-Grafik ist unabhängig vom Anlass. Ein veröffentlichter Story-Snapshot bleibt unverändert.</p><button type="button" class="ende-button">Schließen</button>';
    inhalt.querySelector('.ende-button').addEventListener('click',()=>dialog.close());
    // Ein anderer Anlass soll nicht im Scrollstand des vorherigen Blatts beginnen.
    dialog.scrollTop=0;
    dialog.showModal();
    dialog.scrollTop=0;
  }));
  document.getElementById('detail-schliessen').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog) return;
    const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) dialog.close();
  });

  const ausschluss=[
    ['Sieg und Niederlage im Wechsel','Bereits Wechselbad. Kein zweiter Herzschlag-Name für dasselbe S–N-Muster.'],
    ['Mehr zu null, mehr enge Siege','Weiße Weste, Nulldiät, Kaltblut, ruhige Hand und Entscheider decken diese Leistungsquoten bereits ab.'],
    ['Noch ein Formanstieg innerhalb des Monats','Steigerung, Höhenflug, Umschwung, Nachzügler und Formgipfel sind implementiert.'],
    ['Noch eine Stopper-/Angstgegnerquote','Serienbrecher, Laufstopper und Angstgegner sind vorhanden. Serienstopp untersucht dagegen die größte einzelne beendete Serie. Ausbruch erhält nur eine gemeinsame Allzeitachse.'],
    ['Torhagel, Gleichmut, zweite Luft neu nennen','Alle bereits Monatschroniken. Eine zusätzliche Allzeitwertung wäre eine Ergänzung derselben Disziplin, kein neuer Inhalt.'],
    ['Alle Partner, Gegner oder Resultate sammeln','Endliches Sammelziel und zusätzlicher Pensumvorteil. Kein langfristig offener Rekord.'],
    ['Comeback nach Rückstand, Tore am Stück','Ohne Torzeitpunkte und Zwischenstände nicht belegbar. Endresultate reichen dafür nicht.'],
    ['Neue Schattennamen für dieselbe Kennzahl','Favoritenpleiten und Gegnerprobleme sind schon Wackelkandidat und Angstgegner. Keine künstliche Vervielfachung.']
  ];
  document.getElementById('ausschluss').innerHTML=ausschluss.map(([a,b])=>'<div><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div>').join('');
  const gruppen={allzeit:{koennen:'Können',form:'Aktuelle Form',mark:'Bestmarken',fuegung:'Fügungen',shame:'Schattenseiten'},monat:{koennen:'Können',konstanz:'Konstanz',fuegung:'Fügung',schatten:'Schattenseite'}};
  document.getElementById('bestand').innerHTML=['allzeit','monat'].map(axis=>{
    const list=window.BESONDERHEITEN_KATALOG.filter(d=>d[axis]);
    return '<section><h3>'+list.length+' '+(axis==='monat'?'Monatschroniken':'Rekorde')+'</h3>'+Object.entries(gruppen[axis]).map(([key,label])=>{
      const rows=list.filter(d=>(axis==='monat'?d.monat.art:d.allzeit.kammer)===key);
      return '<h4>'+esc(label)+' · '+rows.length+'</h4>'+rows.map(d=>'<details><summary>'+esc(d.name)+'</summary><p>'+esc(d[axis].cond)+'</p><code>'+esc(d.id)+'</code></details>').join('');
    }).join('')+'</section>';
  }).join('');
  // Öffentlich nur für die lokale Prüfung, nicht mit dem App-Zustand verbunden.
  window.BESONDERHEITEN_VORSCHLAEGE=vorschlaege;
})();
