# Besonderheiten: Rekorde und Monatschroniken

[Mockup öffnen](index.html). Eine eigenständige, offline lesbare Konzeptseite im Stil der vorhandenen Rekord- und Chronikentwürfe. **Kein Einbau in die App**, keine Datenbankabfragen, keine Änderung veröffentlichter Stories. Den eigenen unversionierten Entwurf `../ewige-tafel-story/` berührt diese Arbeit nicht.

## Abgleich statt zweiter Katalog

Geprüfter Quellstand: `567e205`, 04.10.2026. Maßgeblich sind `src/js/32-chronik-katalog.js` und `34-chronik-rekorde.js`, nicht die Zahlen früherer Mockups. `katalog.js` ist ein statischer, überprüfbarer Auszug dieser Definitionen:

| Zeitachse | Bestehende Kategorien |
|---|---|
| 71 Rekorde | Können 30 · Aktuelle Form 8 · Bestmarken 10 · Fügungen 12 · Schattenseiten 11 |
| 60 Monatschroniken | Können 33 · Konstanz 10 · Fügung 10 · Schattenseite 7 |

112 gemeinsame Disziplinen, nicht 131 unabhängige Ideen: Manche haben beide Zeitachsen. Eine identische Messfrage bekommt weiterhin **eine ID mit zwei Wertungen**, keine zwei Namen, Icons und Profilzeilen. Alte Monatsarchive bleiben eingefroren.

Die vorgeschlagenen Kategorien sind bewusst nicht gleichmäßig besetzt. Neutrale Ergebnis-/Aufstellungsmuster gehören zu Fügungen, nicht zu Können, nur weil ihre Folge einen Bestwert erreicht. Neue Schattenkopien und bloße Sieg-/Spielzahlrekorde werden nicht ergänzt.

Das erweiterte Mockup enthält **15 Rekordkarten und 24 Monatskarten, insgesamt 39 Ansichten**. Diese zeigen 37 unterschiedliche Messfragen, ausdrücklich **nicht 39 neue Disziplinen**: Doppelgesicht und Umschaltmoment haben jeweils eine gemeinsame vorgeschlagene Disziplin mit Allzeit- und Monatswertung. Ausbruch erweitert außerdem eine bestehende App-Disziplin; Pendler führt einen bereits vorhandenen, noch nicht implementierten Entwurf fort. Vorschlagsdaten stehen in `entwurf.js`, `erweiterung.js`, `partie-rekorde.js`, `monats-muster.js` und `umschalt-monat.js`; der geprüfte App-Bestand bleibt separat in `katalog.js`.

## Rekorde: 15 Karten, unmittelbar mit Partien fortschreibbar

| Vorschlag | Einordnung | Wert / Ereignis |
|---|---|---|
| Herzschlaglauf | neue Fügung | Längste zusammenhängende Ein-Tor-Folge, beide Ergebnisrichtungen gleich |
| Wanderpass | neue Fügung | Längste Folge mit anderem Mitspieler bei jedem Übergang; Wiederkehr erlaubt |
| Pendler | bestehender, noch nicht implementierter Entwurf | Längste durchgehende Sturm/Abwehr-Alternation, nicht die Karriere-Wechselquote |
| Ausbruch | `ausbruch.allzeit` ergänzen | Längster **durch Sieg geschlossener** persönlicher Gegner-Bann; keine neue Disziplin |
| Rückeroberung | neue Bestmarke | Größte innerhalb derselben Saison tatsächlich abgeschlossene Elo-Talfahrt |
| Serienstopp | neue Bestmarke | Größte einzelne persönliche Gegner-Siegesserie, die durch den eigenen Sieg endet |
| Amplitude | neue Fügung | Größte bisher belegte Elo-Spannweite eines eigenen Spieltags ab seiner vierten eigenen Partie, nicht sein Nettogewinn |
| Grenzverkehr | neue Fügung | Längste Begegnungsfolge mit derselben Person bei jedem Wiedersehen abwechselnd zusammen und gegeneinander |
| Spurwechsel | neue Fügung | Längste durchgehende Favorit-/Außenseiter-Alternation unabhängig vom Ergebnis |
| Doppelgesicht | neue gemeinsame Fügung | Größter Abstand der eigenen Soll-Abweichung neben und gegen dasselbe Gegenüber |
| Gegenhalt | neues Können | Rollenbereinigte Differenz der eigenen Soll-Abweichung neben schwächeren und stärkeren Partnern |
| Umschaltmoment | neues gemeinsames Können | Rollenbereinigte Differenz nach Positionswechsel gegenüber Bleiben, jeweils mit unverändertem Partner |
| Teamgefälle | neue Fügung | Größter innerer Anpfiff-Elo-Abstand im eigenen Duo, unabhängig vom Ergebnis |
| Gegensprung | neue Fügung | Größter Abstand zweier direkter Gegner-Elo-Mittel bei komplett neuer Gegenseite, gleichem Partner und eigener Rolle |
| Fixpunkt | neue Fügung | Längste Folge sämtlicher eigener Nachbarpartien mit derselben Person immer auf der Gegenseite |

Zulassung: vorhandene 30 Laufbahnpartien. Keine Mindest-Siegquote, kein Mindest-Elo und keine weitere hohe Längenlatte. Rohwert 0 oder 1 darf nicht wegen einer Leistungsschwelle wegfallen; ein **nicht stattgefundenes Ereignis** bleibt dagegen `null`. Insbesondere Ausbruch benötigt einen tatsächlichen Schluss-Sieg, übernimmt aber nicht die bisherige 17er-Monatslatte.

Chronologie: Match-Timestamp, danach stabile Match-ID. Tages-/Monatswechsel beenden die ersten drei durchgehenden Muster nicht. Fehlende Positionen/Partner unterbrechen ihr Muster, werden nicht als richtige Fortsetzung behandelt. Anzahl meint **Partien**, nicht Übergänge: A–B–A zählt drei. Für Ausbruch zählt jede direkte Begegnung mit dem jeweiligen Gegner; andere Gegner dazwischen verändern diesen Faden nicht. Bei zwei gelösten Gegnerfäden den größten belegten Einzelwert nennen, nicht addieren. **Jede vorgeschlagene Rekordwertung ist unmittelbar nach einem geeigneten Match fortschreibbar**, nicht erst beim Kalender- oder Monatsabschluss. Das gilt auch für Amplitude: Ab der vierten eigenen Tagespartie ist die bis dahin belegte Tages-Spanne gültig und kann mit weiteren Partien steigen. Rückeroberung wartet auf ihr tatsächlich schließendes Match, nicht auf den Saisonabschluss. Unterschiede zwischen Tagesfaden, persönlicher Matchfolge und Begegnungsfaden werden in den einzelnen Regeln ausdrücklich festgelegt.

Vergabe: ungerundete tatsächliche Bestwerte, alle Mithalter, kein Tiebreak durch zusätzliche Siege. Die durchgehenden Muster bleiben offen nach oben, aber Vielspieler erhalten mehr Suchgelegenheiten. Das Mockup behauptet ausdrücklich keine vollständige Pensumunabhängigkeit. Auch die Ergänzungen haben keine Mindestleistung zusätzlich zur Stichprobe: Zwei zurückgeholte Elo, eine gestoppte Einerserie oder Abstand null können gültige Bestwerte sein. **Gegenhalt und Umschaltmoment haben keine Positivitätslatte: Auch ein qualifizierter Bestwert von null oder unter null bleibt gültig.** Dann heißt die Darstellung Bilanzdifferenz oder kleinerer Rückstand, nicht erfundener Wechselvorteil oder Verbesserung. Ein nicht stattgefundenes Ereignis ist davon zu unterscheiden; ohne Rückkehr gibt es keine Rückeroberung. Kleine Werte dürfen nicht als großer Ausschlag ausgeschmückt werden. Mittelwertbasierte Laufbahnwerte können sich durch weitere Partien auch verschlechtern; historische veröffentlichte Story-Snapshots bleiben trotzdem unverändert.

### Elf ergänzte Rekordansichten

1. **Rückeroberung · Bestmarken**

   Je Saison das persönliche kanonische Elo-Hoch als Anker führen. Ein erster niedrigerer Stand öffnet eine Talfahrt; den tiefsten folgenden Stand merken. Das erste Wiedererreichen oder Übersteigen des festen Ankers schließt sie. Wert `Anker − Tief`; den größten abgeschlossenen Einzelweg halten. Zulassung: 30 Laufbahnpartien, keine Mindesttiefe. Ein überschießender Nach-Match-Stand wird danach zum neuen Hoch. **Nur innerhalb derselben Saison**: Ein Monats-/Saisonreset beendet offene Fälle und ist niemals Verlust, Tiefpunkt oder Rückkehr. Beleg nennt Hoch, Tief und schließendes Match.

   Synthetisch: `100→20→100` ergibt 80 zurückgeholte Elo, `500→490→510` nur zehn. Ein offenes `100→20` zählt noch nicht. Anders als Gipfel oder großer Sprung geht es weder um absolute Höhe noch Tagesgewinn. Keine künstliche Karriere-Elo über Saisonstarts bilden; mehrere Talfahrten nicht addieren.

2. **Serienstopp · Bestmarken**

   Für beide Gegner ihre persönliche Siegesserie **vor** dem Match aus dem vollständigen globalen Verlauf lesen; erst danach alle vier Serien aktualisieren. Bei eigenem Sieg zählt die größere tatsächlich beendete Einzelserie. Zulassung: 30 Laufbahnpartien; bereits eine Einerserie ist gültig. Beide Gewinner können denselben Stopp teilen. Tages-/Monatsgrenzen unterbrechen eine persönliche Serie nicht, Spiele ohne den späteren Stopper zählen mit.

   Anders als Laufstopper/Serienbrecher zählt die größte einzelne gestoppte Serie, nicht Erfolgsquote oder Anzahl solcher Siege. Nicht die beiden Gegnerläufe addieren und keine Duo-Serie verwenden. Der Fixture-Beleg ist real: **13**, Johannes bei `m0408` gegen Martin sowie Leon und Martin bei `m0095` gegen Julian. Das ist die gespeicherte Testbasis, kein Live-Stand; die gezeichnete Bahn bleibt Illustration.

3. **Amplitude · Fügungen**

   Kanonischen Stand unmittelbar vor der ersten eigenen Tagespartie und sämtliche bis zum Auswertungsmatch belegten eigenen Nach-Match-Stände des Berliner Kalendertags betrachten. Wert `Maximum − Minimum`, größter belegter Tageswert. Zulassung: 30 Laufbahnpartien und mindestens vier eigene Partien an diesem Tag; keine Elo-Mindestspanne. Bereits die vierte Partie kann die neue Marke erzeugen, jede folgende Partie sie unmittelbar ausbauen. Kein Warten auf Tagesende und keine rückwirkende Verlagerung des Story-Zeitpunkts.

   Synthetisch: `100→130→40→75→110` ergibt Spanne 90 bei Netto +10. Ein höherer Tagesgewinn muss nicht die größere Spanne liefern. Anders als Achterbahn sind keine bestimmten Endstände erforderlich. Spielzahl, Start, Hoch, Tief und Ende zeigen; mehr Partien bieten mehr Ausschlagsgelegenheiten. Prestige oder fremde Spielerstände gehören nicht in den Elo-Verlauf.

4. **Grenzverkehr · Fügungen**

   Je Gegenüber den chronologischen Begegnungsfaden mit Teamseite führen: Partner oder Gegner. Jede erste bekannte Begegnung startet bei eins; die andere Teamseite verlängert, dieselbe startet wieder bei eins. Bekannte eigene Partien ohne dieses Gegenüber berühren den Faden nicht. Unvollständige eigene Aufstellungen unterbrechen alle laufenden Fäden, weil ein weiteres Wiedersehen darin verborgen sein könnte. Zulassung: 30 Laufbahnpartien; keine Mindestfolge und keine Erfolgsquote. Eine neue Marke entsteht am verlängernden Match.

   Synthetisch: `zusammen→gegen→zusammen` ergibt drei Begegnungen, selbst bei anderen eigenen Partien dazwischen. Zehn Wiedersehen nur gegeneinander ergeben dagegen eins. Der Beleg zählt Begegnungen, nicht Übergänge: sechs Begegnungen enthalten fünf Seitenwechsel. Anders als Wanderpass/Pendler wechseln weder der Partnername bei jeder eigenen Partie noch die Position. Anders als Doppelgesicht wird kein Leistungsabstand bewertet. Tage und Monate brechen den bekannten Personenfaden nicht; Mithalter und tatsächliche Match-IDs zeigen. Der kalenderbasierte Leiter-Entwurf wurde damit ersetzt, nicht zusätzlich behalten.

5. **Spurwechsel · Fügungen**

   Bekannte Anpfiffchance unter 45 % = Außenseiter, über 55 % = Favorit. Die offene Zone einschließlich ihrer Grenzen und unbekannte Chancen unterbrechen. Jede Randlage startet bei eins; Wechsel zur anderen verlängert, dieselbe Lage startet neu. Größte eigene Folge, auch über Tages-/Monatsgrenzen. Zulassung: 30 Laufbahnpartien, keine zusätzliche Mindestfolge und keine Siege nötig.

   Synthetisch: `30/70/25/65/40/80 %` ergibt sechs Partien; anschließende 50 % beenden sie. Sechs Niederlagen sind genauso zulässig wie Siege. Anders als Wechselbad/Pendler wechseln weder Ergebnis noch Position, sondern die Ausgangslage. Chancenpendel unten misst den kontinuierlichen Übergang des ganzen Monats, keine längste binäre Teilfolge. Die Grafik ist kein Leistungsbeleg.

6. **Doppelgesicht · Fügungen · gemeinsame Disziplin `doppelgesicht`**

   Je Gegenüber `V_J = abs(R_neben_J − R_gegen_J)` über die gesamte Laufbahn. Größten qualifizierten Einzelwert halten, keine Personenwerte addieren. Zulassung: 30 Laufbahnpartien und je 15 bekannte gemeinsame beziehungsweise gegnerische Partien. Keine Mindestquote und keine Mindestgröße des Abstands; auch null ist ein gültiger Rekordwert.

   Synthetisch: neben Leon 20 % Siege bei 25 % Soll ergibt −5 Punkte; gegen ihn 15 % bei 60 % Soll ergibt −45. Abstand 40 Punkte trotz niedriger Quoten. Anders als Katalysator oder Angstgegner verbindet die Messfrage beide Teamseiten **derselben Beziehung**. Keine automatische Duo-Auszeichnung: Der perspektivische Wert kann für beide Personen verschieden sein. Auswahl über mehrere Gegenüber und Stichprobengrößen prüfen. Die Monatsansicht verwendet dieselbe Formel und gemeinsame ID, nur eine andere Zeitachse.

7. **Gegenhalt · Können**

   Vier Laufbahngruppen aus eigener Position und historischem Partnerstärke-Verhältnis bilden: Sturm/Abwehr jeweils neben vor Anpfiff schwächerem beziehungsweise stärkerem Partner. Gleiche Elo gehören in keine Stärkegruppe. Je Zielrolle `Δ = R_mitSchwächerem − R_mitStärkerem`, Wert `(Δ_Sturm + Δ_Abwehr)/2`. Beide Rollen gleich gewichten, nicht nach Spielpensum. Höchster ungerundeter Wert zählt. Zulassung: 30 Laufbahnpartien und vorgeschlagen zehn bekannte Partien je Zelle, tatsächlich also mindestens 40 geeignete Partien. Kein Mindestniveau oder positiver Effekt als Zugang.

   Synthetisch: vier Zehnergruppen bei je 40 % Soll; auf beiden Positionen drei Siege neben schwächeren, ein Sieg neben stärkeren Partnern. Residual −10/−30 Punkte, Kontrast +20 trotz Gesamtquote 20 %. Null oder negativer Bestwert ist gültig und darf keinen positiven Vorteil behaupten. Historische eigene und Partner-Elo aus demselben Vor-Match-Snapshot verwenden, nicht heutige Stände. Anders als Katalysator/Ausgleicher wird kein einzelner bester oder schlechtester Partner ausgewählt. Spieler ohne hinreichend belegte Stärkegruppen sind nicht qualifiziert; das ist fehlende Stichprobe, keine geheime Leistungsgrenze. Kontext und Unsicherheit bleiben prüfpflichtig.

8. **Umschaltmoment · Können · gemeinsame Disziplin `umschaltmoment`**

   Nur direkte eigene Nachbarpartien desselben Berliner Tages mit unverändertem Partner, bekannten Rollen und aktueller Anpfiffchance vergleichen. Tagesanfänge und unvollständige Übergänge gehören in keine Vergleichsgruppe; unbekannte Vorgänger niemals überspringen. Je aktueller Zielrolle `Δ = R_nachWechsel − R_beimBleiben`, Wert `(Δ_Sturm + Δ_Abwehr)/2`. Beide Zielrollen gleich gewichten. Zulassung: 30 Laufbahnpartien und vorgeschlagen zehn geeignete Partien in jeder der vier Zellen. Ganze Laufbahn verwenden, keine schöne Wechselphase auswählen.

   Synthetisch: vier Zwanzigergruppen bei 40 % Soll; Ziel Sturm 30/10 % Siege, Ziel Abwehr 25/15 %. Unterschiede +20/+10 Punkte, Wert +15 bei 16 Siegen aus 80 Partien. Auch null oder negativer qualifizierter Bestwert bleibt gültig. Anders als Staffellauf bleibt der Partner in **beiden** Vergleichsgruppen gleich; anders als Spezialist wird innerhalb jeder Zielrolle verglichen. Keine Kausalbehauptung über den Nutzen eines Wechsels. Die Monatsansicht verwendet genau dieselbe gemeinsame Formel und ID mit anderer Zeitachse und Stichprobe.

9. **Teamgefälle · Fügungen**

   Je eigene Partie `abs(eigene_VorMatchElo − Partner_VorMatchElo)`. Größter belegter Einzelwert, unabhängig vom Resultat oder der Siegchance. Zulassung: 30 Laufbahnpartien und zwei bekannte kanonische Vor-Match-Stände derselben Partie. Keine Mindesthöhe; gleiche Stände ergeben den gültigen Wert null. Beide Duomitglieder haben denselben Matchwert, werden aber nur bei jeweils eigener Stichprobenzulassung Mithalter. Andere Spieler erhalten nicht das Gefälle des fremden Teams.

   Synthetisch: 120 neben 20 ergibt 100 Elo, 300 neben 280 nur 20. Die höhere Gesamthöhe gewinnt nicht automatisch. Nicht heutige Elo, Prestige oder gerundete Grafikwerte einsetzen; fehlende Stände sind nicht null. Anders als Rückenwind/Einzelkämpfer keine zeitliche Partnerstärke-Veränderung und anders als schwerster Tag keine Gewinnchance. Neutraler Aufstellungskontext, keine Behauptung, wer wen getragen hat.

10. **Gegensprung · Fügungen**

    Zwei unmittelbar aufeinanderfolgende eigene Partien mit identischem Partner, identischer eigener Position und **komplett ausgetauschten Gegnern** vergleichen. Die ungeordneten Gegnerpaare müssen disjunkt sein; bloßer Seiten-/Namensreihenfolgetausch oder ein verbliebener Gegner qualifiziert nicht. Beide Partien gehören derselben kanonischen Saison an; Reset oder unbekannter Übergang unterbricht. Für jedes Paar das Mittel seiner zwei Gegner-Elo vor genau seinem Match bilden. Wert ist der absolute Abstand beider Mittel, größter gültiger Übergang. Zulassung: 30 Laufbahnpartien, keine Mindesthöhe oder Erfolgsquote.

    Synthetisch: Gegner 20/40, danach andere Gegner 100/120, ergeben Mittel 30→110 und Abstand 80 Elo. Andere Paare 20/40 und 10/50 ergeben dagegen den gültigen Wert null. Keine eigenen Zwischenpartien überspringen; eine Tagespause ist kein behauptetes pausenloses Rückspiel. Eigene Elo oder fremde Zwischenpartien können sich trotzdem verändern, deshalb keine kausale Belastungsbehauptung. Beide Gegner wechseln, damit deren Folgestand aus der vorigen eigenen Partie nicht automatisch den Sprung erzeugt. Persönliche Vorgängerfolge prüfen: der Partner ist nicht automatisch Mithalter.

11. **Fixpunkt · Fügungen**

    Je konkretem Gegner die Anwesenheitsfolge über **sämtliche eigenen Nachbarpartien** führen. J auf der Gegenseite verlängert; eine eigene Partie ohne J oder mit J als Partner beendet den Lauf. Jede bekannte Partie startet für ihre Gegner je bei eins. Größter Einzelgegner-Lauf zählt. Bei zwei gleich lang anwesenden Gegnern beide Belege zeigen, Längen nicht addieren. Zulassung: 30 Laufbahnpartien und vollständige Teamzuordnungen; keine Erfolgs- oder Folgelängenlatte.

    Synthetisch: `B/C→B/D→B/C→B/E→B/D` ergibt fünf für B; `B/C→D/E→B/C` nur eins. Zehn verstreute Duelle sind keine Zehnerfolge. Tage und Monate unterbrechen nicht, unbekannte eigene Aufstellungen dagegen schon. Anders als Grenzverkehr dürfen bekannte eigene Partien ohne J nicht ausgelassen werden. J kann dazwischen andere Ligamatches haben: Die Folge ist persönlich, keine automatische gemeinsame Auszeichnung. Auch fünf Niederlagen oder eine organisierte Runde mit festen Teams können einen gültigen neutralen Beleg liefern.

### Nachrechnung an vorhandenen Daten

`node mockup/besonderheiten/messung.cjs` liest ausschließlich die 466 gespeicherten Fixture-Partien. Elf Spieler erfüllen die 30er-Zulassung; Anton mit neun Partien nicht.

| Muster | Fixture-Bestwert | Halter |
|---|---:|---|
| Herzschlaglauf | 3 | Jane, Martin |
| Wanderpass | 21 | Stefan |
| Pendler | 10 | Leo, Maxi |
| Ausbruch | 17 | Stefan gegen Julian, geschlossen durch `m0365`, 03.08.2026, 16:02 Berlin |
| Serienstopp | 13 | Johannes (`m0408` gegen Martin), Leon und Martin (`m0095` gegen Julian) |
| Echo, Reserve | 3 | Henry, Jane, Jannik, Johannes, Leo, Martin, Maxi |

Diese Zahlen sind **kein aktueller Live-Stand**. Die kurzen Musterbahnen auf den Karten sind Illustrationen, keine ausgelesenen Matchfolgen.

Echo ist ein eigener Ordnungswert (unmittelbare identische gerichtete Endstände), aber sieben Mithalter liefern vorerst wenig unterschiedliche Geschichten. Daher Reserve statt automatisch eingebauter zusätzlicher Rekord. Gleichstände und kleine Werte sind nicht ungültig.

Herzschlaglauf/Nadelöhr haben in dieser kleinen Fixture eine ähnliche Rangfolge (Spearman etwa 0,875). Die Messfrage ist verschieden: sechs Abstände `1,7,1,7,1,7` und `1,1,1,7,7,7` ergeben denselben Anteil, aber Folgen von eins beziehungsweise drei. Vor Einbau an mehr Daten prüfen, ob beide wirklich zusätzliche Geschichten liefern. Bei demselben Match beide Anlässe bündeln, nicht doppelte Storykarten erzeugen.

## Monatschroniken: 24 Karten für zusätzliche Messfragen

Alle Karten und Spielerzuordnungen der Monatsideen sind **synthetische Beispiele für den Monatsabschluss**. Im laufenden Monat wären Werte bis zum Auswertungszeitpunkt vorläufig; der abgeschlossene Vormonat bleibt die feste Bezugsbasis. Erst am Abschluss archivieren und endgültig vergeben. Keine erfundene Fixture-Auswertung, Klasse, Prestige-Zahl oder gemessene Seltenheit. Mindeststichproben sind Vorschläge und müssen geprüft werden. Die vorhandene grundsätzliche Monatszulassung (mindestens acht Partien, Monatstafel ab fünf Ligaspieltagen) wird dadurch nicht heimlich abgeschafft.

1. **Quantensprung · Können · Der Neugeformte**

   Erwartungsbereinigte Leistung aktueller Kalendermonat minus Vormonat. Je Monat `R = Mittelwert(Siegindikator − gespeicherte Anpfiffchance)`, Wert `R_neu − R_alt`. Vorschlag: jeweils zwölf Partien an drei eigenen Tagen. Beide ganzen Monate fest; kein nachträglich günstig ausgewähltes Fenster. Beispiel 10→40 % Siege bei Erwartung 35→40 % ergibt Residual −25→0, also +25 Prozentpunkte. Anders als Steigerung/Höhenflug wird **nicht derselbe Monat geteilt**. Anders als Übersoll ist die Veränderung der eigenen Soll-Abweichung die Frage.

2. **Staffellauf · Können · Der Anschlussfinder**

   `R_nachPartnerwechsel − R_ohneWechsel`, unmittelbar innerhalb desselben eigenen Spieltags. Tagesanfänge ausschließen; fehlende Partnerdaten nicht überspringen. Vorschlag fünf Wechsel- und fünf Nichtwechselpartien an drei Tagen. Identität und Stärke der Partner sind Kontext, nicht der Rekordwert. Anders als Kontrast/Katalysator wird der **zeitliche Übergang** verglichen. Keine Kausalbehauptung über die Wirkung von Wechseln.

3. **Quertreiber · Fügung · Der Quertreiber**

   `Siegquote_Außenseiter − Siegquote_Favorit`; feste vorhandene Chancezonen unter 45 beziehungsweise über 55 Prozent, jeweils vorgeschlagen fünf Partien. Positive Umkehr ist die Ereignisdefinition, keine hohe Siegquote als Zugang. 35 % gegen 15 % ist genauso zulässig wie hohe Quoten. Mittlere Chancezone nicht umsortieren. Gegen passend große Gruppen mit den historischen Chancen prüfen. Anders als Favoritenschreck keine absolute Außenseiterleistung; anders als Rollenfest nicht der kleinste Abstand.

4. **Gegenläufer · Fügung · Der Gegenläufer**

   Beide Positionsquoten ändern sich zwischen festen Kalenderhälften (1.–15. /16.–Ende) in derselben Richtung, die Gesamtquote strikt entgegengesetzt. Beide Richtungen gemeinsam, keine Spiegel-ID. Wert ist `min(abs(ΔSturm), abs(ΔAbwehr), abs(ΔGesamt))`, nur wenn dieses Muster vorliegt. Vorgeschlagen mindestens fünf Partien in jeder der vier Teilgruppen. Gesamtquote ausschließlich aus genau denselben Partien mit bekannten Positionen bilden wie beide Rollen zusammen; unbekannte Positionen in allen drei Größen ausschließen und ihre Anzahl nennen. Gruppengrößen/Rollenmix zwingend zeigen. Das Beispiel ist exakt: erste Hälfte 14/20 und 1/10, zweite 8/10 und 8/40. Beide Rollen +10 Punkte, Gesamt 50→32 %, Ausschlag 10 Punkte. **Nicht** Gesamtquote gegen ungewichteten Rollenmittelwert rechnen.

5. **Spiegelmonat · Fügung · Der Spiegelspieler**

   Feste nicht überlappende Viererblöcke ab der ersten eigenen Monatspartie; Treffer `S–N–N–S` oder `N–S–S–N`. Vorschlag fünf vollständige Blöcke, also 20 Partien. Wert: Trefferanteil minus Referenzanteil bei zufälliger Reihenfolge mit exakt derselben Gesamtzahl an Siegen/Niederlagen. Restpartien im Gesamt-N behalten und transparent nennen, aber nicht als vollständige Blöcke zählen. Bei `W` Siegen, `L` Niederlagen und `N=W+L` ist der Referenzanteil eines vollständigen Blocks:

   `2 × W(W−1) × L(L−1) / [N(N−1)(N−2)(N−3)]`.

   Für 10/10 aus 20 sind das 13,93 %, nicht pauschal 12,5 %. Zur Seltenheit müssen komplette Folgen gemeinsam permutiert werden: überlappende/abhängige Vergleiche nicht als unabhängige Versuche behandeln. Keine Suche nach dem günstigsten Startpunkt. Kein zweiter Wechselbad-/Lieblingszahl-Titel.

6. **Erwartungskorridor · Konstanz · Der Spurtreue**

   Prefix-Verlauf einschließlich Start 0: `C_k = Σ(Siegindikator − Anpfiffchance)`. Breite `max(C_k)−min(C_k)`, über den **ganzen** Monat. Vorschlag 20 Partien an drei Tagen. Für den Ausschlag vergleichen mit Reihenfolge-Verteilungen derselben Länge, Siegzahl und festen Chancen; Rang nach standardisiertem Enge-Ausschlag (Referenzmittel minus beobachtete Breite, geteilt durch Referenzstreuung), nicht einfach niedrigster Rohbreite über unterschiedlich lange Monate. Ohne Referenzstreuung kein standardisierter Wert, keinesfalls Division durch null oder Ersatz 0. Der spätere Algorithmus braucht deterministische, ausreichend geprüfte Referenzverteilungen und darf nicht im Renderpfad rechnen.

   Das ist ein **Ordnungsmodell**, keine Behauptung eines korrekten Elo-Wahrscheinlichkeitstests oder absoluter Nähe zum Soll. Ein Monat kann stark unter der Erwartung enden und dennoch weniger zusätzliche Zwischen-Ausschläge zeigen als andere Anordnungen derselben schlechten Bilanz. Endsaldo und Verlauf getrennt nennen. Die Grafik vergleicht zwei illustrative 20er-Folgen bei je 50 % Chance, zehn Siege/zehn Niederlagen: erst alle Siege, dann Pleiten ergibt Breite 5; ständiger Wechsel ergibt 0,5. Beide enden 0. Erwartungstreue prüft nur diesen Endpunkt, nicht den Weg.

7. **Anderes Trikot · Fügung · Der Neuverbundene**

   Totalvariationsabstand der Partnerverteilungen zweier vollständiger Monate: `0,5 × Σ_partner abs(Anteil_neu − Anteil_alt)`. Vorschlag zwölf bekannte Zuordnungen an drei Tagen in beiden Monaten. Gemeinsame Menge aller Partner-IDs, fehlende Anteile 0, fehlender Monat **nicht** 0. Ligazugänge/-abgänge als Kontext kennzeichnen, keine behauptete eigene Leistung. Im Beispiel verschieben 70/10/20 auf 20/70/10 die Verteilung um 60 %, ohne einen Partner mehr zu sammeln. Bewusst **nur Monatsidee**: die begrenzte Größe wäre kein offenes Allzeit-Sammelziel.

8. **Tagesumkehr · Fügung · Der Umkehrspieler**

   Anteil qualifizierter eigener Tage mit gegensätzlichem ersten und letzten Resultat. Beide Richtungen zählen. Vorschlag fünf eigene Tage mit jeweils mindestens drei Partien. Festes Tagesraster Europe/Berlin. Überschuss gegen ein Reihenfolge-Modell mit gleicher Monatszusammensetzung und denselben festen Tagesgruppen. Referenz eines Paares bei `W/L/N` ist `2WL / [N(N−1)]`, nicht pauschal 50 %. Neun Siege / 21 Pleiten aus 30 ergeben 43,45 %. Die Tagespaare sind für die spätere Unsicherheitsrechnung nicht unabhängig. Anders als Kaltstart/Endspurt/Wechselhaft zählt die **gemeinsame Anfang-Ende-Struktur**, keine einzelne Tagesquote.

9. **Rivalitätswende · Können · Der Fadenwender**

   `V_J = (R_neu,gegen_J − R_alt,gegen_J) − (R_neu,ohne_J − R_alt,ohne_J)`. Feste vollständige Monate, vorgeschlagen acht Partien je Gruppe in beiden Monaten, ausreichend Tage und bekannte Chancen. Der Rest enthält nur Matches **ohne J**, also weder als Gegner noch als Partner; disjunkte Matchgruppen statt alle anderen Gegnerbeobachtungen zusammenzuzählen. Sowohl die direkte Verbesserung gegen J als auch V müssen positiv sein. Größten qualifizierten Faden nennen, nicht addieren.

   Synthetisch: vier gleich große Zehnergruppen, Soll jeweils 40 %. Gegen Julian 10→40 % Siege, im Rest 30→20 % ergibt +40 spezifische Punkte bei neuer Gesamtquote nur 30 %. Wenn beides um 30 steigt, ist die spezifische Wende null. Anders als Quantensprung/Ausbruch wird der gegnerspezifische Trend über das übrige Monatsbild hinaus gemessen. Mehrfachsuche, Regression zur Mitte und veränderte Aufstellungen bleiben Risiken; keine Rivalität als Ursache behaupten.

10. **Positionspakt · Fügung · Der Rollengekoppelte**

    `A = R_Sturm,mit_J − R_Abwehr,mit_J`, `B = R_Sturm,ohne_J − R_Abwehr,ohne_J`. Nur `A×B<0` belegt ein wirklich umgedrehtes Rollenprofil. Wert `min(abs(A), abs(B))`; beide Richtungsvarianten bleiben dieselbe Disziplin. Vorschlag fünf Partien in jeder der vier Zellen an mindestens drei eigenen Tagen, ganzer fester Monat. Unbekannte Positionen ausschließen und ihre Anzahl nennen.

    Synthetische Residualwerte mit Leon +10/−10, ohne ihn −5/+5 ergeben Rollenabstände +20/−10 und Ausschlag zehn Punkte. +20/+10 wären nur unterschiedlich stark, kein Richtungswechsel. Anders als Spezialist/Kontrast müssen sich zwei bedingte Rollenprofile tatsächlich umkehren. Die Größen sind Soll-Abweichungen, keine erfundenen Rohquoten. Partner-, Gegner- und Rollenmix sowie Mehrfachsuche prüfen, keine Chemie-Ursache behaupten.

11. **Startzeit · Fügung · Der Zeitversetzte**

    `abs(R_Auftakt_vor_15Uhr − R_Auftakt_ab_15Uhr)`, immer ausschließlich die erste eigene Tagespartie nach Berliner Kalendertag. Vorschlag fünf Tagesauftakte je Gruppe; zusätzliche Partien desselben Tages vergrößern diese Stichprobe nicht. 15 Uhr ist ein **vorab fester Konzept-Schnitt**, keine günstige nachträgliche Grenze und kein Funfact-Auslöser. Beide Richtungen gleich, keine hohe Quote nötig.

    Synthetisch: 20 % frühe, 40 % späte Siege bei jeweils 40 % Soll ergeben 20 Punkte Abstand. Anders als Kaltstart/Zweite Luft bleiben beide Gruppen bei derselben Spielnummer; nur ihre Uhrzeitlage unterscheidet sich. Gruppentage und Chancen zeigen. Wochentag, Besetzung und Zeitplanung können den Unterschied erklären; kein bewiesener biologischer Biorhythmus.

12. **Bilanzparadox · Fügung · Der Gegenbucher**

    Für exakt dieselben vorgeschlagenen zwölf gültigen Partien `q = Siege/Partien`, `t = Summe_Teamtore_für / (Summe_Teamtore_für + Summe_Teamtore_gegen)`. Nur `(q−0,5)×(t−0,5)<0` ist ein Widerspruch. Ausschlag `min(abs(q−0,5), abs(t−0,5))`. Beide Bilanzrichtungen gemeinsam, keine hohe Quote oder Mindesttordifferenz. Ganze Torsummen verwenden, keine ungewichteten Einzel-Torquoten.

    Synthetisch konsistent: vier `10:0`-Siege und acht `9:10`-Pleiten ergeben 33,33 % Siege, aber 112:80 Teamtore beziehungsweise 58,33 % Toranteil. Ausschlag 8,33 Punkte. Exakt 50 % Siege reichen nicht für den Widerspruch. Anders als Deutlicher/Punktlandung zählen zwei entgegenstehende Monatsbilanzen; verwandte knappe Pleiten/deutliche Siege allein genügen nicht. Teamtore nicht als persönlich geschossene Tore verkaufen, vor Vergleich nicht runden.

13. **Chancenpendel · Fügung · Der Chancenpendler**

    Ganze eigene Monatsfolge mit vorgeschlagenen 20 bekannten Chancen an drei Tagen. Beobachteter Übergang `A = Mittel(abs(p_i−p_(i−1)))`. Referenz `B = Summe_(i≠j) abs(p_i−p_j) / [N(N−1)]`, der durchschnittliche Übergang in anderen Reihenfolgen genau dieses Chancenmultisets. Größter positiver Überschuss `A−B`. Keine neue Elo-Formel, keine Siegquote und keine günstig ausgesuchte kurze Episode.

    Synthetisch: zehn 20%- und zehn 80%-Chancen vollständig im Wechsel ergeben A=60 Punkte, B=31,58, Überschuss 28,42. Dieselbe Mischung in zwei Blöcken ergibt nur 3,16 Punkte je Übergang. Anders als schwerster Tag zählt nicht das Chancenmittel, anders als Spurwechsel keine längste binäre Folge. Fehlende Chancen nicht überspringen und dadurch künstliche Übergänge herstellen; ohne vollständige Basis im Zweifel nicht bewertbar. Die Reihenfolge-Referenz ist kein Elo-Wahrscheinlichkeitstest.

14. **Ergebnisdialekt · Fügung · Der Unverwechselbare**

    Verteilungen P der eigenen und Q der übrigen Ligapartien über die niedrigere Endstandseite 0 bis 9, bei regulären Spielen auf zehn. Richtung bewusst ignorieren: `10:6` und `6:10` gehören in dieselbe Zelle. Vorschlag 20 eigene und 40 übrige Partien im selben Monat. Alle eigenen Matches aus der Referenz entfernen; jede übrige Partie einmal zählen, nicht viermal als Spielerbeobachtung. Abweichende Endstandsregeln aus beiden Gruppen ausschließen und ihre Anzahl nennen.

    `M = (P+Q)/2`, Wert ist die **Jensen-Shannon-Divergenz** `0,5×KL(P||M) + 0,5×KL(Q||M)` mit Logarithmus Basis 2, **nicht ihre Quadratwurzel**. Echte Nullterme tragen genau null bei; keine künstlichen Mini-Anteile ergänzen. Größte Divergenz zählt, unabhängig von Sieger oder Mindestquote. Die synthetischen Profilbalken summieren sich je auf 100 %, sind keine Liga-Messung und keine Vorhersage. Anders als Lieblingszahl/Torhagel wird die ganze Verteilung statt häufigstem Endstand oder Mittelwert verglichen. Dünne Profile, Referenzgröße und Unsicherheit prüfen; bei zu wenig Restliga keine Ersatzreferenz aus eigenen Partien oder einem anderen Monat.

15. **Doppelgesicht · Fügung · Der Seitengetrennte · gemeinsame Disziplin `doppelgesicht`**

    Dieselbe Formel wie die Allzeitansicht: je Gegenüber `abs(R_neben_J − R_gegen_J)`, größter qualifizierter Einzelwert. Hier fester ganzer Monat, vorgeschlagen fünf gemeinsame und fünf gegnerische Partien an insgesamt drei eigenen Tagen. Beispiel ebenfalls −5 gegen −45 Soll-Punkte, Abstand 40 trotz schwacher 20/15%-Quoten. Beide Teamseiten derselben Beziehung vergleichen, nicht die höhere Gesamtquote belohnen.

    Nur Zeitfenster und Stichprobe unterscheiden sich vom Rekord. Gemeinsame Quelle und ID, keine zusätzliche Trennlinie-Disziplin oder doppelte Profilidee. Match in seiner Beziehungskategorie einmal zählen; die zwei Gegner sind keine unabhängigen Doppelversuche. Mehrfachsuche und kleine Gruppen bleiben prüfpflichtig, kein Duo-Erfolg oder Kausalbeleg.

16. **Das ruhige Feld · Konstanz · Der Gegnerfeste**

    Kohorte **aller** Gegner mit jeweils mindestens fünf Begegnungen im vollständigen Vormonat, insgesamt mindestens vier. Genau diese komplette vorab bestimmte Kohorte muss im neuen Monat wieder jeweils fünf Begegnungen haben. Fehlende Fäden nicht als null einsetzen oder aussortieren; nicht nachträglich vier günstige aktuelle Gruppen suchen. Neue Gegner sind nicht Teil dieser festen Vergleichskohorte und werden als Kontext ausgewiesen.

    Je Monat `S = max(R_J)−min(R_J)` für dieselbe Kohorte. Ausschlag `S_alt−S_neu`, nur bei tatsächlicher Verkleinerung. Synthetisch bei gleichem Soll: Gegnerquoten `0/20/60/80 %` werden `10/20/30/40 %`. Spanne 80→30 Punkte: 50 Punkte Glättung. Die vier gleich großen Gegnergruppen decken in diesem Beispiel alle eigenen Partien ab; deshalb entspricht ihr Mittel der tatsächlich von 40 auf 25 % fallenden Monatsquote. Ohne diese vollständige Abdeckung ist das Gruppenmittel nicht automatisch die Gesamtquote. Anders als Angstfrei/Breitenwirkung keine gute Leistung gegen alle; anders als Quantensprung keine steigende Formhöhe. In 2v2 überlappende Gegnerfäden und von selbst zurücklaufende Extremgruppen mitprüfen, keine doppelte unabhängige Stichprobe oder allgemeine Verbesserung behaupten.

17. **Seitenbündnis · Können · Der Seitenverbinder**

    Nur tatsächliche Partnerwechsel zwischen unmittelbaren eigenen Nachbarpartien desselben Berliner Tages betrachten. Gehört der neue Partner zu den beiden Gegnern der vorigen Partie, ist es ein Seitenbündnis; sonst ein anderer Partnerwechsel. Die erste eigene Tagespartie und unbekannte Aufstellungen gehören in keine Gruppe. Je aktuellem Match einmal `R = Mittel(Sieg − Anpfiffchance)` werten; der Vorgänger liefert nur Kontext. Wert `R_Seitenbündnis − R_andereWechsel`, größter positiver Ausschlag. Vorschlag fünf Partien je Wechselart an insgesamt drei Tagen.

    Synthetisch: je zehn Wechselpartien, beide mit 40 % Soll; nach Seitenbündnissen 40 % Siege, nach anderen Wechseln 10 %. Residual 0/−30 Punkte, Ausschlag +30 bei nur 25 % Siegen in diesen 20 gewerteten Partien. Ausgeschlossene Tagesauftakte sind nicht Teil dieser Beispielquote. Anders als Staffellauf wechseln **beide** Gruppen den Partner; verglichen wird dessen Herkunft, nicht Wechsel gegen Bleiben. Rollen, Besetzung, Gegner und Tage prüfen, keine kausale Wirkung einer Versöhnung oder eines Bündnisses behaupten.

18. **Gegnergeflecht · Fügung · Der Verflechtete**

    Für ein verschiedenes Gegenüberpaar J/K vier **disjunkte** Matchgruppen bilden: gegen beide, nur gegen J, nur gegen K, ohne beide. Ohne bedeutet vollständig abwesend; Matches mit J oder K als eigenem Partner aus sämtlichen Gruppen ausschließen. Vorgeschlagen je fünf gültige Partien an mindestens drei eigenen Tagen des festen Monats. Wert `abs(R_11 − R_10 − R_01 + R_00)`, größter qualifizierter Einzelwert. Beide Interaktionsrichtungen sind dieselbe Messfrage, keine Paarwerte addieren.

    Synthetisch: vier Zehnergruppen bei je 50 % Soll und 10/40/40/40 % Siegen ergeben R −40/−10/−10/−10. Interaktion −30, Betrag 30 trotz Gesamtquote 32,5 %. Anders als Angstgegner/Rivalitätswende geht es um die gemeinsame Besetzung über ihre getrennten Bilder hinaus; Doppelgesicht vergleicht dagegen Teamseiten derselben Person. Viele Gegenüberpaare schaffen Auswahlchancen. Ein Match gegen zwei Gegner bleibt eine Beobachtung; kein Beweis gegnerischer Chemie und kein gemeinsamer Duo-Titel für J/K.

19. **Gegnerbalance · Fügung · Der Gefälleleser**

    Je eigene Partie `g = abs(VorMatchElo_Gegner1 − VorMatchElo_Gegner2)`. Median aller gültigen g des abgeschlossenen Vormonats als vorab festen Schnitt b bilden, bei gerader Zahl das Mittel der beiden mittleren Werte. Aktuellen ganzen Monat in `g≤b` und `g>b` einteilen. Wert `abs(R_obereGruppe − R_untereGruppe)`. Vorschlag zwölf bekannte alte Abstände und fünf aktuelle Partien je Gruppe an insgesamt drei Tagen; je neuer Gruppe mindestens zwei verschiedene Gegnerpaare. Ohne Vormonatsbasis keine Ersatzgrenze null und keine nach Effekt optimierte Trennung.

    Synthetisch: altes Raster 80 Elo, aktuelle Zehnergruppen mit 10/30 % Siegen bei je 40 % Soll ergeben Residual −30/−10 und Abstand 20 Punkte bei nur 20 % Gesamtsiegen. Höheres Gefälle meint nur oberhalb des eigenen alten Rasters, nicht stärkere Gegner oder schlechtere Gewinnchance. Anders als Gegnergeflecht werden keine bestimmten Personenpaare untersucht; anders als schwerster Tag nicht das Chancenmittel. Ungerundete kanonische Vor-Match-Werte verwenden, Besetzung und Rollen als Kontext nennen.

20. **Rückspielwelle · Fügung · Der Rückspielpendler**

    Eigene Monatsfolge nach Timestamp und stabiler Match-ID lesen. Frühestes noch ungenutztes direkt benachbartes Rückspielpaar desselben Tages mit identischem Partner, identischen Gegnern und identischen Positionen **aller vier** Spieler aufnehmen; danach beide Partien verbrauchen, andernfalls um eine Partie weitergehen. Ergebnis niemals zur Paarwahl verwenden. Vorschlag fünf disjunkte Paare an mindestens drei eigenen Tagen. Kein Paar über die Monatsgrenze; Team-A/B-Labelwechsel verändert die personengebundene Aufstellung nicht.

    Beobachtet `A = Resultatwechsel/Paarzahl`. Je unveränderter Aufstellung c bilden deren **gesamte** gültige Monatsresultate `W_c/L_c/N_c` die Referenz `b_c = 2W_cL_c/[N_c(N_c−1)]`. B ist das nach Paarzahl `M_c` gewichtete Mittel der b_c. Ausschlag `A−B`, nur wenn positiv. Ungepaarte Resultate bleiben in der Referenz. Synthetisch: eine Aufstellung mit fünf Siegen/15 Niederlagen und zehn festen Paaren, davon fünf S→N und fünf N→N: A=50 %, B=39,4737 %, Überschuss 10,5263 Punkte. Die Paare können über drei Tage verteilt sein; die Quote bleibt 25 %.

    Beide Resultatwechsel zählen, nicht bloß Siege nach einer Pleite wie bei Retourkutsche. Wechselbad misst eine längste Folge, Spiegelmonat und Tagesumkehr andere feste Motive. Die Referenz ordnet Ergebnislabels innerhalb derselben Monatsaufstellung neu und hält Paarstellen fest, **nicht** die Tages-Siegzahlen. Kein Elo-Wahrscheinlichkeitstest und keine unabhängigen Paarversuche; komplette Folgen gemeinsam prüfen. Diese neutrale Reihenfolgemessung ist nicht der zurückgestellte Leistungs-Kontrast Nachsatz.

21. **Doppelzone · Fügung · Der Doppelrandige**

    Ungerichtete reguläre Endstandsabstände auf zehn in feste Zonen teilen: eng `d≤2`, mittel `3≤d≤6`, klar `d≥7`. Jeweils Anteil der eigenen gegen übrige Ligapartien desselben ganzen Monats vergleichen. A ist der Überschuss enger, B jener klarer Partien. Nur A>0 und B>0 ergeben die U-Form; Wert `min(A,B)`, nicht die Summe oder der größte Einzelrand. Vorschlag 20 eigene und 40 übrige Partien; jede eigene Partie aus der Restliga entfernen, dort jeden Match einmal zählen. Unbekannte/abweichende Endstandsregeln aus beiden Gruppen ausschließen und Anzahl nennen.

    Synthetisch: eigene 8 enge/4 mittlere/8 klare aus 20 ergeben 40/20/40 %, Restliga 8/24/8 aus 40 ergeben 20/60/20 %. Beide Ränder +20 Punkte. Dagegen erfüllt 80 % eng und 0 % klar die Doppelzone nicht. Anders als der allgemeine Ergebnisdialekt ist ein **gerichtetes zweirandiges** Profil nötig; Nervenkitzel betrachtet nur einen Rand, Torhagel den Mittelwert. Sieger ist egal, schwache Bilanzen können denselben Beleg haben. Keine weitere Clutch-Fähigkeit oder Kantersiegzahl behaupten.

22. **Torwende · Fügung · Der Gegenstrebige**

    Zwei vollständige feste Monate vergleichen: `q = Siege/alle gültigen Partien`, `m = Mittel(Teamtore_gegen − Teamtore_für)` ausschließlich über die eigenen Niederlagen. Gegenläufige Qualitätsrichtungen liegen bei `Δq×Δm>0` vor: weniger Siege bei zugleich kleineren Pleiten oder mehr Siege bei höheren Pleiten. Beide Richtungen bleiben eine Disziplin. Wert `min(abs(Δq), abs(Δm)/10)` für reguläre Spiele auf zehn. Vorgeschlagen zwölf Partien und fünf Niederlagen je Monat an ausreichend Tagen. Nenner beider Größen ausdrücklich zeigen; keine gute Quote oder Torleistung als Voraussetzung.

    Synthetisch: vorher acht 10:9-Siege/zwölf 4:10-Pleiten, jetzt vier 10:9-Siege/16 8:10-Pleiten. Quote 40→20 %, Pleitenabstand 6→2; normierte Veränderungen −0,20/−0,40, Ausschlag 0,20 beziehungsweise 20 Skalenpunkte. Beide Torbilanzen bleiben negativ (−64/−28), also kein Bilanzparadox. Anders als Widerstand ist nicht der niedrige absolute Abstand der Anlass, sondern der Widerspruch der Veränderungen. Die Division durch zehn ist eine erklärte Konzeptskala, keine statistische Signifikanz. Kein Zwischenstand, Comeback oder allgemeiner Leistungsgewinn daraus ableiten.

23. **Verdichtung · Fügung · Der Näherkommende**

    Ganze eigene Monatsfolge von mindestens vorgeschlagenen 20 gültigen Partien an drei Tagen betrachten. Für alle i<j zählen C die kleiner werdenden ungerichteten Endstandsabstände `d_j<d_i`, D die größer werdenden, T die gleichen. `P=N(N−1)/2`. Wert ist Kendall-tau-b für Zeitindex gegen negativen Abstand: `(C−D)/sqrt(P(P−T))`. Nur positive Werte belegen die gerichtete Verdichtung. Bei `P−T=0` ist kein Trend bestimmbar; weder Ersatz-null noch perfekte Verdichtung erfinden. Kein günstig ausgewählter Teilabschnitt und kein kalenderbasierter Rekord.

    Synthetisch: `10,10,9,9,…,1,1` ergibt N=20, P=190, T=10, C=180, D=0 und τ=0,97333. Sechs beliebig verteilte Siege und 14 Niederlagen ändern diesen ungerichteten Trend nicht. Rückwärts hat dieselbe Endstandverteilung und denselben engen Anteil, aber einen negativen Trend. Anders als Ergebnisdialekt/Nervenkitzel/Gleichmut wird die **zeitliche Ordnung** bewertet. Der Koeffizient ist weder Prozentpunkte, Siegchance noch Sigma-Test; Paarvergleiche hängen zusammen. Besetzung und Tage prüfen, keine Individualtor-Fähigkeit behaupten.

24. **Umschaltmoment · Können · Der Umsteller · gemeinsame Disziplin `umschaltmoment`**

    Identische Formel und Datenquelle wie im Allzeitrekord: nur direkte eigene Nachbarpartien desselben Berliner Tages mit unverändertem Partner und bekannten Rollen. Je aktuelle Zielrolle `Δ = R_nachWechsel − R_beimBleiben`; Wert `(Δ_Sturm + Δ_Abwehr)/2`, unabhängig vom Rollenpensum. Hier ganzer fester Monat und vorgeschlagen fünf Partien je Zelle an insgesamt drei eigenen Tagen. Tagesanfänge auslassen und unbekannte Vorgänger niemals überspringen. Größter **positiver** Monats-Ausschlag belegt das günstigere Übergangsbild; die Allzeitwertung hat dagegen keine Effektlatte, auch null/negative qualifizierte Bestwerte bleiben dort gültig.

    Synthetisch: Sturm −10/−30, Abwehr −15/−25 Soll-Punkte ergeben Rollendifferenzen +20/+10 und Wert +15. Alle vier Gruppen können trotzdem unter der Erwartung liegen. Gegen Staffellauf bleibt der Partner gleich; gegen Spezialist werden nicht verschiedene Positionen, sondern Wechsel/Bleiben **innerhalb jeder Zielrolle** verglichen. Kein kausaler Wechselnutzen, fehlende Zellen nicht als null einsetzen. Vorheriges Ergebnis und Aufstellungen als Kontext zeigen. `umschaltmoment` ist eine Disziplin mit zwei Zeitachsen, keine neue Monats-ID im künftigen App-Katalog und keine zweite Formel.

### Monatsvergabe und Belastungsprobe vor einem späteren Einbau

- Innerhalb jeder Messfrage hält der tatsächliche größte relevante Ausschlag die Chronik, alle Gleichstände mitführen. Nie für optische Vielfalt an den Zweiten weiterreichen.
- Keine absolute Erfolgshürde wie 60/75/85 % auf die neue Idee übertragen. Ein schwacher Spieler kann den größten eigenen Sprung oder das auffälligste neutrale Muster haben. Das garantiert keinen Titel für jeden Spieler jeden Monat.
- Richtungsdefinitionen (positive Verbesserung, tatsächliche Umkehr) und ausreichende Referenz sind keine Mindest-Winrate. Ohne Muster darf eine Karte nicht eine Verbesserung behaupten. Sind alle Effekte 0 oder nicht bestimmbar, ist eine Chronik nicht zwangsläufig sinnvoll.
- Größter gemessener Ausschlag ist nicht automatisch statistisch ungewöhnlich. Beispielwerte sind keine fertige Kalibrierung. Effekt, Stichprobengröße und Unsicherheit getrennt prüfen. Seltenheit erst an mehreren Monaten einordnen, keine erfundenen Sigma-/Prestigewerte.
- Prüfung gegen Niveau und Pensum, gemeinsame Halter, Vergleich zu nahen Bestandsmetriken; nahe gleiche Gewinner und Belege können einen Kandidaten streichen. Mehrfachsuche/Startphasen nicht verstecken. Nicht alle Kandidaten ungeprüft freischalten.
- Archivierte Monatschroniken/Story-Snapshots nicht nachträglich mit neuen Regeln ersetzen. Diese Konzepte gelten frühestens ab einem ausdrücklich gewählten künftigen Gültigkeitsstand.

## Was absichtlich nicht zusätzlich angeboten wird

- Rollen-Aufbruch zunächst nur als **Alternative** zum Quantensprung: vorher schwächere Position festlegen, nicht rückblickend den schönsten Rollensprung aussuchen. Ohne gesonderten Nutzennachweis nicht beide dieselbe Verbesserung belohnen.
- Formbruch wäre Schattenrichtung derselben Vor-Monats-Achse, keine zweite unabhängige Rechenquelle; kein positives Prestige für negative Muster.
- S–N-Alternation = Wechselbad; Torhagel/Gleichmut/zweite Luft schon Monatschroniken; Nadelprobe/Favoritenbrand/offene Wunde haben vorhandene Entsprechungen. Ein weiterer Serienstopper-**Quotentitel** wäre ebenfalls doppelt. Der ergänzte Serienstopp misst dagegen die größte einzelne tatsächlich beendete Gegner-Serie, nicht diese vorhandene Quote.
- Alle Ergebnisse/Partner/Gegner einmal sammeln: endliche Decke. Meiste Spiele/Siege: Pensum oder die Rangliste erneut.
- Führungswechsel, Tore am Stück, Comeback nach Zwischenrückstand: ohne Torereignisse nicht belegbar. Keine Endstand-Fantasie als Fakt.

### Zurückgestellt: Nachsatz und Gegenleiter

- **Nachsatz**, Leistungsunterschied im nächsten eigenen Rückspiel mit denselben Duos gegenüber anderen Folgepartien, bleibt in Reserve. Ein Rückspiel hat zwangsläufig denselben Partner, während die unspezifische Restgruppe häufig Partner- und Rollenwechsel enthält: Dann würde der Titel bloß Chemie, Staffellauf oder Umschaltmoment erneut auszeichnen. Eine spätere Probe müsste auch die Restgruppe auf unveränderten Partner und vergleichbare eigene Rolle beschränken, vorherige Siege und Pleiten separat standardisieren und direkte eigene Tagesnachbarn klar von Wiedersehen nach Wochen unterscheiden. Nur Rückspiele nach Niederlagen zu zählen wäre zu nah an Retourkutsche. Keine zusätzliche Karte, kein fertiger Titel und keine neue Vergabe aus diesem Entwurf.
- **Gegenleiter**, längste Folge streng steigender historischer Gegner-Elo-Mittel, wurde nicht aufgenommen. Bei einem unveränderten Gegnerduo steigert jede eigene Niederlage dessen Elo und damit automatisch das nächste Gegner-Mittel. So könnte die angeblich neutrale Leiter eine verdeckte Niederlagenserie werden. Ein eingefrorenes Gegnerniveau würde diese Rückwirkung reduzieren, aber eine kleine endliche Aufstiegsleiter aus verfügbaren Duos erzeugen. Der Gegensprung benutzt stattdessen vollständig ausgetauschte Gegner, unveränderten eigenen Rahmen und zwei konkret belegte Vor-Match-Zustände. Der alte Kalender-Leiter-Rekord ist ebenfalls nicht mehr Teil der Auswahl.

## Darstellung und späterer technischer Einbau

Karten zeigen Messfrage, Kategorie, Mindeststichprobe und einen kleinen nachvollziehbaren Verlauf. Blätter ergänzen genaue Bezugsbasis, Abgrenzung, Risiken und Herkunft der Zahlen. Monatsbeiname folgt dem bestehenden Schema. Grafik und Anlass bleiben getrennte Ebenen; mehrere Anlässe desselben Matches auf eine Story mit einzelnen Zeilen bündeln. Keine bereits publizierte Karte nach neuen Matches umgestalten.

Bei einem späteren Einbau nur gemeinsame `DISZIPLINEN` und die bestehenden Kontext-Pässe erweitern. Historische Chancen aus der kanonischen Match-/Simulationsquelle verwenden, keine zweite Elo-Formel. Dieselbe Kennzahl einmal pro Datenstand berechnen und Karte, Blatt, Rang und Beleg daraus ableiten. Caches an vollständigen Match-/Regelstand binden, nicht bloß Anzahl: eine Bearbeitung mit gleicher Anzahl muss invalidieren. Keine Rundung vor Vergleich oder Summierung; Anzeige erst am Ende runden. Stabile deterministische Referenzen nur außerhalb von Render-/Klickpfaden; keine Zufallsvergabe bei jedem Öffnen.

## Prüfung

```powershell
node mockup/besonderheiten/messung.cjs
node mockup/besonderheiten/pruefen.cjs
```

Die Prüfung vergleicht den statischen Abgleich mit der Quelle, rechnet Muster/Gegenbeispiele nach und öffnet Karten/Blätter bei 320, 390 und 1100 Pixeln im vorhandenen lokalen Chromium. `partie-messung.cjs` enthält isolierte Gegenproben zu Grenzverkehr/Fixpunkt, Teamgefälle/Gegensprung und dem gemeinsamen Rollen-Kontrast; diese sind Konzeptprüfungen, keine zweite App-Wertung. Bildschirmbilder sind lokale Prüfausgaben unter `dist/`, keine App-Assets. Die App-Bausuite ist durch dieses eigenständige Mockup nicht ersetzt.
