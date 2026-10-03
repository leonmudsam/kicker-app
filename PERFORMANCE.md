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
