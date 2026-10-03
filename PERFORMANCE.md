# Performance und Cache-Gültigkeit

Stand: 3. Oktober 2026. Vergleich zum Stand `5445ba8`.

## Was geändert wurde

- Unveränderte Anzeigeansichten behalten DOM, Fokus und Bindings. Nur das
  zuletzt gerenderte Markup wird gemerkt, zusammen mit Datenversion und
  Root-Knoten. Zeitabhängige Vorlagen werden weiterhin ausgewertet.
  Formulare und Einstellungen werden nicht wiederverwendet.
- Die fünf Navigationsknöpfe bleiben im Dokument. Bei einem Wechsel wird
  ihre aktive Klasse geändert, nicht die ganze Leiste neu gebaut.
- Der Feed baut zunächst ungefähr zwölf Karten, höchstens fünfzehn.
  Weitere Grafiken, Texte und DOM-Knoten entstehen in Portionen von höchstens
  vier Karten pro ruhigem Takt. Auch ein großer einzelner Spieltag ist teilbar.
  Alte Aufträge gelangen nicht in neue Filter/Blätter oder in geschlossene
  Ansichten. Tageskopf, Tageskarte, Reihenfolge und Story-IDs bleiben erhalten.
- Gleichzeitige `loadAll`-Anforderungen laufen nicht mehr nebeneinander.
  Ein Burst von sechs Anforderungen braucht zunächst vier Leseabfragen und
  danach einen frischen Durchlauf mit vier weiteren, statt 24 paralleler
  Abfragen. Kommt während des Folgedurchlaufs eine weitere Anforderung,
  folgt erneut ein frischer Durchlauf. Überholte Antworten werden nicht
  eingebaut; alle Aufrufer warten bis zum abschließend aktuellen Stand.
  Reines Hintergrundpolling schließt sich nur an den laufenden Abruf an,
  damit langsame Verbindungen nicht immer neue Zusatzläufe auslösen.
- Ablehnungen und fehlerhafte Teilantworten geben die Ladesperre wieder frei,
  ersetzen keine Daten durch Teilstände und erlauben einen erneuten Versuch.
- Tages-, Wochen-, Saisonlisten- und Positionsverlauf-Caches berücksichtigen
  Kalenderwechsel auch ohne neue Partie oder Datenversion.

Die Elo-, Prestige-, Rekord- und Chronikformeln wurden nicht verändert.
Story-Inhalt, Publikationsregeln und gespeicherte Grafikentscheidungen bleiben
unverändert. Keine Datenbank-/Schemaänderung und keine neue Laufzeitabhängigkeit.

## Lokale Messung

Chromium, 390 × 844 px, 466 echte Fixture-Partien, zwölf Spieler. Gemessen
wird synchrones JavaScript samt erstem Layout, ohne Backend oder externe
Schriftladezeiten. Drei kalte und neun warme Aufrufe je Ansicht, Median,
gleicher Messmodus mit `--profil`. Hardware- und laufabhängige Richtwerte,
keine garantierten Zeiten auf einem Telefon.

„Warm“ bedeutet hier: dieselbe Ansicht mit unveränderten Daten erneut rendern.
Es bedeutet nicht, dass ein erstmaliger Tabwechsel ebenfalls unter 2 ms dauert.

| Wiederholte Ansicht | Vorher | Nachher |
|---|--:|--:|
| Liga | 6,9 ms | 0,9 ms |
| Positionen | 4,2 ms | 0,3 ms |
| Rekorde | 21,0 ms | 1,3 ms |
| Chronik | 3,4 ms | 0,3 ms |
| Verlauf | 11,6 ms | 0,6 ms |
| Profil | 12,1 ms | 12,1 ms |
| News öffnen | 18,9 ms | 11,9 ms |

Beim News-Öffnen wurden vorher alle 77 Karten gebaut, jetzt zunächst 14
im Fixture-Feed. Das vollständige Nachreichen wird separat geprüft.
Die kalten Berechnungen der Liga/Positionen und der Story-Generator sind
weiterhin aufwendiger; diese Änderung behauptet dort keinen neuen Geschwindigkeitsgewinn.

## Nachmessen und Regressionen

```powershell
node tools/build.mjs
node tools/performance.cjs --profil --ausgabe=dist/performance.json
node tests/leistung.test.js
node tests/run.mjs
```

`leistung` prüft 49 Invarianten im Browser statt empfindlicher Zeitlimits:
DOM-Identität und Fokus, frische Versionen, Kalendergrenzen, vollständigen
Feed, einmalige Tagesköpfe/-karten, begrenzte Portionen, alten Filterauftrag,
Schließen und Versionswechsel, Rückfall ohne Idle-API sowie parallele
Ladeanforderungen, Teilfehler, Wiederholung und spätere Anforderungen während
der Story-Synchronisierung und Hintergrundpolling bei einem langsamen Abruf.
Die neuen Engstellen-/Kalenderprüfungen wurden
vor der jeweiligen Änderung nachweislich rot ausgeführt.

Ohne Chromium wird die Browser-Suite sichtbar übersprungen. Das Messtool
benötigt denselben vorhandenen Testbrowser. JSON-Messergebnisse in `dist/`
sind lokale, nicht eingecheckte Artefakte.

## Zweite Runde: Handy-CPU und gemeinsame Rechenquellen

Vergleich dieser Runde: `2aa54b0`. Gleicher Chromium 151, 390 × 844 px,
466 Partien und zwölf Spieler, diesmal mit vierfach gedrosselter CPU.
Die Vergleichsfassung wurde über `KICKER_HTML=index.html` gemessen, bevor das
neue Build in die Wurzel kopiert wurde. Vorher und nachher mit `--profil`.
Die Drosselung simuliert keine konkrete Handy-Hardware oder Safari.

Neu:

- Historische Rekord-Kontexte und Saison-Peaks teilen exakte DB-First-Prefixe.
  Im gesamten Messablauf sinkt die Zahl der Simulationen von 54 auf 38.
  Saison-Auszeichnungen teilen außerdem ihre Monatsteilmengen, damit die
  gemeinsamen Periodensieger nicht je Spieler neu gerechnet werden.
- Der globale Cache hält eine vollständige History und alle Saison-/Team-Maps.
  Ein Add ohne Versionswechsel verlor früher alte Maps im inkrementellen Weg.
  Monatswechsel und Quellenersatz können keine leeren abgeleiteten Cache-Hits
  hinterlassen. Historische Prefixe sind begrenzt, fremde Teilmengen WeakMaps.
- Der aktuelle Monat ist ein einzelnes Memo mit Kalenderprüfung, kein pro
  Lookup neu aufgebautes Objekt. Periodenstatistiken folgen der kanonischen
  Zeitraumliste, einschließlich Tages-/Wochenwechsel und Saisonreset.
- Spielerprofile verwenden gemeinsame chronologische Listen, binden nur ihre
  eigenen Knöpfe und zeichnen ihre unteren Abschnitte bedarfsweise. Der Kopf
  mit Aura und Wappen bleibt vollständig. Überhänge und horizontale Galerien
  bleiben erhalten; ältere Browser behalten das vollständige Layout.
- Blattnavigation und Wischabschlüsse sind an ihre Öffnungsnummer gebunden.
  Ein alter Abschluss verändert kein später geöffnetes Blatt. Der Scrollreset
  erfolgt vor dem neuen Markup, nicht zwischen zwei neuen Layout-Zuständen.
- H2H-Listen werden auch bei Edit, Ausblenden und Löschen aktuell. Null als
  gespeicherte Erwartung, abgeschalteter Spielbonus oder Verlustaufschlag
  wird nicht mehr durch einen Standard ersetzt. Bestehende DB-Deltas werden
  nicht neu berechnet oder überschrieben.
- Prestige-Teilsummen verwenden zentral die vorhandene Restverteilung:
  Auszeichnungen + Monatschroniken + Rekorde ergeben exakt den Gesamtwert,
  in Story und Laufbahn gleich. Rohwerte und Gesamtformel bleiben unverändert.

| Profilaufruf, JS + erstes Layout | Vorher | Nachher |
|---|--:|--:|
| kalt, Median | 350,8 ms | 310,7 ms |
| wiederholt, Median | 64,5 ms | 36,0 ms |

Eine Änderung des Scrollreset allein verschob Layout-Arbeit nur aus der
JavaScript-Messung in das nächste Bild. Das wurde nicht als Gewinn gewertet;
obige Zeiten schließen das erste Layout ein. Kopf und Saison-Galerie wurden
auch visuell bei 390 px geprüft, jeder Abschnitt wird im Test hineingescrollt.

### Grenzen der Messung

Der kalte synchrone Story-Generator bleibt aufwendig: im Interaktionslauf
1355,5 → 1177,8 ms; längster Task 1373 → 1196 ms. Das ist weniger Arbeit,
aber **keine Lagfreiheit**. Kalte Liga-/Positionenaufrufe brauchen weiter
mehrere hundert Millisekunden. Bei News-Öffnen ist kein verlässlicher weiterer
Zeitgewinn nachgewiesen (längster Task 231 → 246 ms in diesen Läufen).
Netzwerk, echte Touch-Scrollbilder, Schriftladen, Safari und physische Telefone
sind damit nicht abgedeckt. Keine Garantie von durchgehend 60 Bildern/s.

Das Messtool erfasst jetzt Bildabstände und Longtasks. Zeitwerte bleiben
diagnostisch statt CI-Grenze. Profilzähler enthalten aufgerufene Unterfunktionen
und dürfen nicht zu einer vermeintlichen Gesamtzeit addiert werden.

```powershell
node tools/performance.cjs --cpu=4 --mobil --profil --ausgabe=dist/mobil.json
node tests/mobil.test.js
node tests/prefix.test.js
node tests/rechnen.test.js
```

Die neuen Suiten prüfen 21 UI-, 76 Prefix- und 36 Recheninvarianten am gebauten
Ergebnis. `prefix` und `rechnen` laufen auch in CI ohne Chromium. Neue Fehler
wurden gegen die Vergleichsfassung zunächst rot nachgewiesen; geprüft werden
auch Bruchteile, gleiche Zeitstempel, Kalendergrenzen und direkte Quellenwechsel.
`mobil` prüft tatsächliches Verhalten und Arbeitsmenge, keine empfindlichen
Millisekundenlimits.
