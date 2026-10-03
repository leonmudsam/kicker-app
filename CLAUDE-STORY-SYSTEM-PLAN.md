# Claude-Code-Auftrag: Story-System stabilisieren und visuell vollständig machen

## Auftrag

Bringe das News- und Story-System der Kicker Liga in einen endgültig stabilen Zustand. Bereits veröffentlichte Stories dürfen durch spätere Partien weder verschwinden noch ihren Inhalt, Zeitpunkt oder ihr Design wechseln. Gleichzeitig sollen Matchkarten die vorhandenen grafischen Designs sichtbar und abwechslungsreich nutzen.

Ein großer Teil der Snapshot-, Tafel- und Funfact-Logik wurde bereits überarbeitet. Lies vor Änderungen insbesondere:

- `CLAUDE.md`, vor allem §C33
- `src/js/26-news-konstanten.js`
- `src/js/27-news-generator.js`
- `src/js/28-news-ambient.js`
- `src/js/29-news-cache.js`
- `src/js/30-news-ui.js`
- `src/js/30b-news-spieltag.js`
- `src/css/07-icons-profil.css`
- `src/css/16-spieltag.css`
- `tests/ambient.test.js`
- `tests/blatt.test.js`

Bestehende funktionierende Regeln sind zu erhalten. Keine großflächige Neuschreibung ohne nachgewiesenen Grund.

## Nicht verhandelbare Invarianten

### 1. Eine veröffentlichte Story ist ein Snapshot

Nach ihrer ersten Veröffentlichung bleiben unverändert:

- Story-ID
- Titel und Beschreibung
- Veröffentlichungszeitpunkt
- Kategorie, Rubrik und Priorität
- Beteiligte und Matchbezug
- Scoregrafik
- Anlassgrafik
- alle für die Grafiken gespeicherten Werte

Eine später eingetragene Partie darf keine ältere Story neu formulieren, neu einsortieren, neu gestalten, entfernen oder durch eine vermeintlich aktuellere Aussage ersetzen.

Normale Stories werden mit `INSERT ... ON CONFLICT DO NOTHING` veröffentlicht. Der erste erfolgreiche Insert ist der kanonische Snapshot für alle Geräte.

Nicht wieder einführen:

- nachträgliches Auffrischen gespeicherter Story-Texte
- Löschen wegen gleicher oder ähnlicher Schlagzeilen
- Entfernen durch Tages-, Typ-, Spieler- oder Nebenrollenlimits
- Entfernen einer Serie, weil sie später gerissen ist
- Entfernen eines Funfacts, weil später am Tag gespielt wurde
- Neuziehen eines Designs beim nächsten Generatorlauf

### 2. Einzige Ausnahme: die heutige Ewige Tafel

Die Ewige Tafel ist die einzige bewusst veränderliche Story:

- genau eine sichtbare Tafel-Karte je lokalem Kalendertag
- alle Rekord-, Chronik- und Insignium-Bewegungen dieses Tages werden darin verlustfrei gebündelt
- bei einem weiteren Tafelwechsel wird die bisherige Fassung desselben Tages ersetzt
- der Kartenzeitpunkt ist immer der Zeitpunkt des jüngsten enthaltenen Tafelwechsels
- dadurch steht die aktuelle Tafel-Karte beim neuesten Geschehen im Feed
- Tafel-Karten früherer Tage sind unveränderliche Snapshots

Realtime-`UPDATE` darf nur für die Tafel-Karte des aktuellen Tages übernommen werden. Für normale Stories sind nur neue Inserts relevant.

### 3. Zusammenführen heißt nicht verwerfen

Stories derselben Partie sollen zu einer lesbaren Matchkarte zusammengeführt werden. Dabei bleiben alle publizierten Ereignisse erhalten:

- jedes Ereignis behält seine ID
- jedes Ereignis bleibt als eigene Zeile oder im Detailblatt vollständig auffindbar
- seltene und legendäre Auszeichnungen bleiben sichtbar gekennzeichnet
- alle positiven und negativen Matchereignisse derselben konkreten Partie teilen eine Karte; negative Zeilen bleiben rot gekennzeichnet und nennen die tatsächlich Betroffenen
- Geschichten verschiedener Partien und nicht matchbezogene Geschichten bleiben getrennt

Ziel ist möglichst wenig Kartenrauschen, aber niemals Informationsverlust. Die Partie ist das gemeinsame Subjekt: Serien, Durststrecken, Rivalitäten und sämtliche newswürdigen Auszeichnungen werden als Zeilen ihrer gemeinsamen Matchkarte gezeigt. Die Ewige Tafel bleibt ihr eigener Tagesstrom. Kein Anlass wird wegen seiner negativen Richtung oder eines Themenlimits verworfen.

Verbindliche Gruppenschlüssel:

- Match: konkrete `matchId`
- Ewige Tafel: lokales Datum
- Runde, Woche und Rückblick: eigener expliziter Zeitraumsschlüssel

Nicht allein nach gleicher Minute, gleichem Spieler oder ähnlichem Titel gruppieren.

## Zielarchitektur der Matchkarten

### 4. Scoregrafik und Anlassgrafik trennen

Der bisherige `visualKey` vermischt zwei unabhängige Entscheidungen. Ein Spitzenwechsel, eine Serie oder eine Auszeichnung verdrängt dadurch die abwechslungsreiche Matchgrafik; häufig bleibt oben nur dieselbe einfache Ergebniszeile.

Ersetze dieses Modell für neue Stories durch zwei getrennte Snapshot-Felder:

```text
scoreVisualKey
occasionVisualKey
```

Empfohlenes JSON im bestehenden `dataRef`:

```js
visual: {
  version: 2,
  score: {
    key: 'mosaik',
    data: { /* nur die zum Veröffentlichungszeitpunkt benötigten Werte */ }
  },
  occasion: {
    key: 'spitze',
    sourceStoryId: '...',
    data: { /* Anlasswerte zum Veröffentlichungszeitpunkt */ }
  }
}
```

Die genaue Struktur darf an das bestehende Schema angepasst werden. Entscheidend ist die fachliche Trennung und dass die Darstellung nicht aus später veränderten Live-Werten neu gewählt wird.

### 5. Jede Karte mit genau einer Partie hat eine Scoregrafik

Die Scoregrafik beschreibt ausschließlich die Partie und ist immer vorhanden:

- beide Teams und alle vier Spieler
- klar erkennbarer Gewinner
- großer, dominanter Spielstand
- gegebenenfalls Vorabchance, Ergebnisverteilung oder Elo-Bewegung

Geeignete Scoreformen sind unter anderem:

- Spielfeld
- Mosaik
- Tacho
- Streudiagramm
- Elo-Transfer
- Gefälle
- Ein-Tor-Anzeige
- Klarer-Sieg-Band

Die Auswahl darf nur Daten verwenden, die bis zu dieser Partie bekannt waren. Bei mehreren passenden Formen gelten weiterhin Variation und fachliche Eignung:

- nicht zweimal dieselbe Form direkt hintereinander, wenn eine andere passt
- häufig verwendete Formen innerhalb des vorherigen Fensters abwerten
- das Spielfeld als Rückfall, nicht als Standard für fast alles
- seltene passende Formen nicht durch einen allgemeinen Anlass blockieren
- Gleichstände deterministisch, beispielsweise über Match-ID, auflösen
- für die Variationshistorie die tatsächlich veröffentlichten Grafikschlüssel verwenden; ältere Designs nicht nach den neuen Regeln neu bestimmen
- eine andere Scoreform darf einen besonderen Ausgang nicht verschweigen: Krimi, Außenseitersieg oder klarer Sieg bleiben als Anlass beziehungsweise Ereigniszeile erkennbar

Ein Mosaik braucht einen belegten Befund zur Ergebnisverteilung, nicht nur ein beliebiges Ergebnis. Elo-Transfer bleibt besonderen Elo-Ausreißern vorbehalten. Auch gewöhnliche Partien haben mehrere sachlich passende Grundformen; die Standardzeile ist kein Ersatz für eine sinnvolle Auswahl.

Der Score ist wichtiger als dekorative Elemente. Er muss auch bei langen Namen und auf 288 beziehungsweise 360 Pixel breiten Ansichten sofort lesbar bleiben.

### 6. Zusätzlich höchstens eine Anlassgrafik

Die Anlassgrafik erklärt unabhängig von der Scoregrafik, warum die Partie eine Nachricht ist. Beispiele:

- Spitzenwechsel: Tabelle vor und nach der Partie
- Siegesserie: Lauf und nächste Marke
- Teamserie: Duo-Ring und gemeinsame Bilanz
- Serienbruch: gerissener Lauf
- Außenseitersieg: Kräfteverhältnis
- Rivalität: direkte Bilanz
- Revanche: früheres und heutiges Ergebnis
- Auszeichnung: Medaillon oder Markenlauf
- Premiere: gemeinsame Versuche
- Wende: Formkurve
- Rangsprung: Platzbewegung
- Rollentausch: Positionsstrahl
- Rückkehr: Pausenstrecke
- Zählwerk: Jubiläum
- Tageslauf: Tagesring

Die Anlassgrafik darf die Scoregrafik nicht ersetzen. Weitere Anlässe derselben Partie erscheinen als Zeilen im Sammelband und vollständig im Detailblatt. Es gibt pro Karte höchstens eine Scoregrafik und eine Anlassgrafik, nicht drei oder vier große Bildbereiche.

Scoregrafik, Anlassgrafik und Fließtext dürfen dieselbe Kennzahl nicht mehrfach erzählen. Was bereits gezeichnet ist, wird im Satz nicht wortgleich wiederholt.

### 7. Sammelkarten übernehmen beide Ebenen

Eine Sammelkarte mit genau einer Partie:

- erbt die eingefrorene Scoregrafik der Partie
- erbt oder bestimmt einmalig die wichtigste Anlassgrafik
- zeigt alle weiteren Ereignisse als eigene Zeilen
- verwendet im Detailblatt dieselbe Bühne wie die Feedkarte

Eine Sammelkarte mit mehreren verschiedenen Partien darf keinen einzelnen Spielstand als gemeinsamen Stand ausgeben. Verwende dort eine kompakte Ergebnisfolge, Tagesbahn oder Zeitlinie.

Die Grafikkombinationen aus den bestehenden Karten für Ein-Tor-Krimi und klaren Sieg sind das Zielprinzip: oben eine eigenständige grafische Scorebühne, darunter eine unabhängige erklärende Grafik.

### 8. Snapshot und Abwärtskompatibilität

Für neue Stories werden beide visuellen Entscheidungen vor dem Upload gespeichert. Speichere außerdem alle historischen Werte, die für eine identische spätere Zeichnung nötig sind, oder stabile Quell-IDs, wenn diese garantiert unveränderlich sind.

Alte Stories:

- bestehende `visualKey`- und `visualForm`-Werte weiter lesen
- fehlende neue Felder deterministisch im Speicher ableiten
- alte Datenbankzeilen nicht massenhaft umschreiben
- niemals einen bestehenden alten Snapshot wegen der Migration löschen
- ältere Tageskarten für kleine Auszeichnungen nur anhand ihrer gespeicherten Match-IDs aufteilen; identische alte/neue Marken einmal zeigen und sämtliche Quell-IDs erhalten
- historische Rivalitätsstände an ihre ursprüngliche Partie binden, nicht an das jeweils jüngste Duell; gleiche Uhrzeiten anhand des damaligen Duellstands unterscheiden und bei unklarem Matchbezug nicht raten

Eine später hinzugefügte Partie, eine neue Katalogreihenfolge oder ein neuer Bündelteil darf die gespeicherten Grafikschlüssel nicht verändern.

## Funfacts

### 9. Genau ein Slot um 15:00 Uhr

Es gibt höchstens einen Funfact je lokalem Kalendertag, mit festem Zeitpunkt 15:00 Uhr.

Der Funfact darf entstehen, wenn:

- bis 15:00 Uhr noch keine Partie dieses Tages begonnen hat
- bis 15:00 Uhr kein Saisonabschluss veröffentlicht wurde

Wird der Funfact um 15:00 Uhr veröffentlicht und die erste Partie folgt um 15:20 Uhr, bleibt er unverändert bestehen. Öffnet jemand die App erst nach 15:00 Uhr, wird anhand des Zustands zum Slot entschieden. Vergangene Tage im Feedfenster werden beim nächsten Öffnen rückwirkend um 15:00 Uhr gefüllt, sofern an dem jeweiligen Tag keine Partie und kein vorheriger Saisonabschluss lag. Das gilt auch nach mehreren Tagen ohne geöffneten Client.

Bevorzugte Themen:

- Insignium und Weg zur nächsten Stufe
- aktuelle Form und ungewöhnliche Abweichungen
- Rekorde und offene Rekordrennen
- Rang und Tabellenbewegung
- Saisonmitte und Schlussspurt
- spielreichste oder spielärmste abgeschlossene Woche
- Partner-, Gegner- und Rollenprofile
- historische Besonderheiten der Liga
- Erklärungen tatsächlich vorhandener App-Funktionen anhand echter Daten

Keine beliebigen Zufallszahlen. Typ, Rubrik und beteiligte Spieler rotieren. Dieselbe These soll nicht kurzfristig erneut erscheinen und nicht ständig dieselben Spieler zeigen.

## Elo und Prestige

### 10. Begriffe nicht vermischen

Ein negativer Wert in einer Tafel-Karte ist kein Elo-Verlust, sondern kann ein Prestigeverlust durch abgegebene oder geteilte Rekorde sein.

Verbindliche Anzeige:

- Beschriftung `Prestige`
- Einheit `P`
- rote negative Werte
- optionaler Hinweis auf den Verlust einer Insignium-Stufe

Elo-Werte bleiben ausschließlich in Match-, Tabellen- und Elo-Kontexten. Eine Rekordübernahme und ein negativer Prestige-Saldo dürfen nicht wie ein Elo-Widerspruch aussehen.

## Cache, Datenbank und Performance

### 11. Kanonische Datenwege

- Persistierte Story-Zeilen sind die Wahrheit für bereits veröffentlichte Inhalte.
- Der Generator erzeugt nur noch nicht vorhandene Snapshot-IDs und die heutige Tafel-Aktualisierung.
- Die Anzeige bündelt verlustfrei, ändert aber keine gespeicherten Einzelstories.
- Das 14-Tage-Fenster wird über das Datum bestimmt, nicht über eine kleine Zeilenanzahl.
- Innerhalb dieses Fensters darf keine publizierte Story durch ein Mengenlimit verschwinden.
- Rendering außerhalb des sichtbaren Bereichs darf verzögert erfolgen; die Daten bleiben trotzdem vorhanden.

### 12. Performance-Regeln

- Rohstories einmal je Array-Referenz nach ID indizieren.
- Stories einmal je Lauf nach `matchId`, Datum und Gruppenschlüssel indizieren.
- Matchhistorie, Rangstände, Serien und Ergebnisverteilungen nicht je Karte vollständig neu berechnen.
- Vorhandene `WeakMap`- und Datenstand-Memos weiterverwenden.
- Grafiken aus gespeicherten Snapshot-Daten rendern, nicht bei jedem Feed-Render neu auswählen.
- Keine periodischen Komplett-Upserts aller Stories.
- Keine O(N²)-Suche je Kartenzeile; Maps und Sets verwenden.
- DB laden, bevor der Generator Funfact-Rotation oder vorhandene Story-IDs bewertet.

Caches dürfen Darstellung beschleunigen, aber nie die fachliche Wahrheit verändern. Ein Cache-Treffer und ein Kaltstart müssen identische IDs, Texte, Zeitpunkte, Gruppierungen und Grafiken ergeben.

## Umsetzungsreihenfolge

1. Bestehende Snapshot-, Tafel-, Funfact- und Realtime-Logik gegen diese Invarianten prüfen.
2. Das aktuelle überladene `visualKey`-Modell erfassen und alle Lese- sowie Schreibstellen dokumentieren.
3. Score- und Anlassauswahl in zwei reine Funktionen trennen.
4. Beide Ergebnisse samt benötigten Darstellungsdaten in neuen Stories speichern.
5. Renderer für Einzel- und Sammelkarten auf beide Ebenen umstellen.
6. Mehrfach-Match-Sammelkarten ohne falschen Einzelstand darstellen.
7. Rückfallpfad für alte Story-Snapshots erhalten.
8. Cache- und Realtime-Pfade auf ungewollte Updates prüfen.
9. CSS bei 288 und 360 Pixeln messen; Score darf weder klein noch abgeschnitten sein.
10. Tests ergänzen, dann vollständigen Build und alle Suiten ausführen.

## Verbindliche Abnahmekriterien

1. Eine bestehende Story ist nach dem Hinzufügen einer späteren Partie bytegleich in Titel, Text, Zeitpunkt und visuellen Snapshot-Feldern.
2. Das 7:10 mit Revanche bleibt nach späteren Partien samt Ergebnis, Revanche und Design sichtbar.
3. Eine bestehende Matchkarte wechselt nicht mehr zwischen Spielfeld, Mosaik, Tacho oder Standardzeile.
4. Jede Karte mit genau einer Partie zeigt einen großen und eindeutigen Score.
5. Jede solche Karte trägt einen gespeicherten `scoreVisualKey` oder einen dokumentierten Legacy-Rückfall.
6. Ein Spitzenwechsel kann beispielsweise mit Mosaik oder Tacho kombiniert werden, ohne die Scoregrafik zu verdrängen.
7. Eine Teamserie zeigt Scoregrafik und Duo-Ring in derselben Karte.
8. Eine seltene Auszeichnung zeigt Scoregrafik und Auszeichnungsdarstellung in derselben Karte.
9. Eine Sammelkarte mit genau einer Partie verwendet dieselbe Scoregrafik wie ihre zugrunde liegende Matchstory.
10. Eine Sammelkarte mit mehreren Partien behauptet keinen einzelnen gemeinsamen Spielstand.
11. Alle gebündelten Story-IDs sind im Detailblatt nachweisbar; keine Story wird still verworfen.
12. Gleichlautende, aber eigenständige Publikationen bleiben erhalten.
13. Die heutige Ewige Tafel existiert genau einmal und trägt den Zeitpunkt des neuesten Tafelwechsels.
14. Die Tafel-Karte des Vortags verändert sich nicht mehr.
15. Ein um 15:00 Uhr veröffentlichter Funfact bleibt nach einer Partie um 15:20 Uhr bestehen.
16. Eine Partie vor 15:00 Uhr oder ein vorheriger Saisonabschluss verhindert den Funfact dieses Tages.
17. Negative Tafelwirkung ist eindeutig als Prestige in `P` und nicht als Elo bezeichnet.
18. Kaltstart, zweiter Generatorlauf und Realtime-Synchronisation ergeben dieselbe sichtbare Storymenge.
19. Keine Karte läuft bei 288 oder 360 Pixeln über, schneidet Namen ab oder verkleinert den Score bis zur Nebensache.
20. Hinzufügen einer Partie verursacht keinen vollständigen Austausch des Story-Katalogs.

## Zu ergänzende Tests

Mindestens folgende Regressionstests hinzufügen oder vorhandene entsprechend erweitern:

- Story-Snapshot vor und nach einer neuen Partie vergleichen
- Score- und Anlassschlüssel getrennt prüfen
- alle Scoreformen mit mindestens einem gültigen Beispiel rendern
- Anlassgrafiken zusammen mit verschiedenen Scoreformen rendern
- Sammelkarte aus Matchstory plus Serie plus Auszeichnung prüfen
- Sammelkarte mit positiven und negativen Ereignissen sowie mehreren Auszeichnungsthemen derselben Partie prüfen
- drei neue Partien nach zwei gespeicherten Spielfeldkarten: keine direkte Grafik-Wiederholung, alte Snapshots unverändert, identische Wahl beim Kaltstart
- Rivalitätszahl nach späterem Duell und bei identischen Match-Zeitstempeln am ursprünglichen Match nachweisen
- Multi-Match-Sammelkarte ohne falsches Ergebnis prüfen
- aktuelle Tafel bei zwei Wechseln aktualisieren, Vortag unverändert lassen
- Funfact vor und nach einem späteren Match prüfen
- Realtime-`UPDATE` für normale Story ignorieren, für heutige Tafel übernehmen
- mobile Layoutprüfung mit langen Namen und Grenzwerten
- Generator zweimal mit identischem Bestand ausführen und komplette Snapshots vergleichen

## Abschluss und Auslieferung

Nach der Umsetzung:

```powershell
node tools/build.mjs
Copy-Item -LiteralPath 'dist\index.html' -Destination 'index.html' -Force
node tools/check.mjs
node tests/run.mjs
git diff --check
```

`CLAUDE.md` im selben Arbeitsgang anpassen, falls sich Funktionen, Datenfelder, Tests oder verbindliche Regeln ändern. Die Aufgabe ist erst abgeschlossen, wenn alle sieben Testsuiten grün sind und ein zusätzlicher Match-Datensatz keine bereits veröffentlichte Story mehr verändert.
