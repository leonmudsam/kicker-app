# Handout: stabile Stories, klare Scores und ein sinnvoller News-Rhythmus

Stand: 02.10.2026

Dieses Dokument ist Spezifikation und Abnahmeplan für die News- und Story-Logik. Es beschreibt das gewünschte Verhalten, nicht eine zweite alternative Implementierung.

## 1. Zielbild

Eine Story ist eine Veröffentlichung über einen vergangenen Moment. Sobald sie veröffentlicht wurde, bleibt sie innerhalb ihres Feed-Zeitraums unverändert:

- gleiche ID
- gleicher Zeitstempel
- gleicher Titel und Text
- gleiche Fakten und Beteiligte
- gleiche grafische Kartenform
- gleiche Priorität und Kategorie

Neue Partien dürfen neue Stories ergänzen und passende bestehende Stories derselben Partie zu einer Karte bündeln. Sie dürfen keine bereits veröffentlichte Story löschen, umformulieren, neu gewichten oder mit einem anderen Design versehen.

Die einzige Ausnahme ist die Ewige Tafel des laufenden Tages. Sie ist eine lebende Tageskarte und folgt dem jüngsten Tafelwechsel. Frühere Tage sind ebenfalls unveränderlich.

## 2. Verbindliches Zustandsmodell

```text
Generator findet Ereignis
        |
        v
fachliche Story mit stabiler ID
        |
        v
einmal als vollständiger Snapshot speichern
        |
        v
Feed liest nur gespeicherten Snapshot
        |
        +--> passende Stories derselben Partie visuell bündeln
        |
        '--> niemals gegen den heutigen Zustand neu schreiben
```

Nicht erlaubt:

- gespeicherten Text durch einen neuen Generatorlauf ersetzen
- eine Karte wegen einer gleichen Überschrift entfernen
- eine Karte wegen eines Tages-, Typ- oder Spielerlimits entfernen
- eine ältere Story gegen den heutigen Rekordhalter, die heutige Serie oder heutige Form prüfen
- eine Kartenform beim Rendern neu auswählen
- eine spätere Story an die Stelle einer früheren rücken lassen

## 3. Snapshot und technische Felder

Jede Matchstory speichert zusätzlich zu den bisherigen Storydaten:

- `visualKey`: Anlassdesign, zum Beispiel Revanche, Serie, Außenseiter, Rivalität oder Spielfeld
- `visualForm`: konkrete Variante innerhalb des Standard-Spielfeld-Designs
- `matchId`: auslösende Partie
- `event_at`: fachlicher Zeitpunkt der Veröffentlichung

`visualKey` und `visualForm` werden genau einmal vor dem ersten Speichern gewählt. Der Renderer liest diese Felder und trifft keine neue Auswahl aufgrund später hinzugekommener Partien.

Für ältere Datensätze ohne diese Felder bleibt ein deterministischer Fallback erlaubt. Sobald eine neue Story gespeichert wird, besitzt sie die feste Auswahl.

## 4. Zusammenführung statt Verwerfen

| Situation | Verhalten |
|---|---|
| Mehrere positive oder neutrale Stories derselben Partie | Eine Matchkarte, alle Anlässe als Zeilen im Sammelband |
| Ergebnis plus Revanche derselben Partie | Revanche als Anlassdesign; Score und alle vier Spieler bleiben deutlich sichtbar |
| Ergebnis plus Rivalität derselben Partie | Gemeinsame Matchkarte, Rivalität als Anlasszeile |
| Seltene Auszeichnung plus Matchstory | Gemeinsame Karte; Seltenheit und Name der Auszeichnung bleiben sichtbar |
| Mehrere Breaking-Anlässe derselben Partie | Eine Breaking-Matchkarte mit allen Anlässen |
| Negative und positive Story derselben Partie | Getrennte Karten, weil beide eine gegensätzliche visuelle Richtung besitzen |
| Stories verschiedener Partien | Nicht allein wegen gleicher Minute, Spieler oder Überschrift zusammenführen |
| Semantisch unpassende Stories | Beide Karten behalten |
| Bereits veröffentlichte ähnliche Stories | Beide behalten; Ähnlichkeit ist kein Löschgrund |

Wichtig: „Bündeln“ reduziert Karten, nicht Ereignisse. Das Detailblatt der Sammelkarte führt sämtliche enthaltenen Veröffentlichungen mit eigener Uhrzeit und, falls abweichend, eigenem Ergebnis auf.

## 5. Ewige Tafel: genau eine lebende Tageskarte

Regel:

- pro Kalendertag höchstens eine sichtbare Karte „Ewige Tafel“
- Rekorde, Chroniken und Insignium-Wechsel dieses Tages werden darin zusammengeführt
- bei einem neuen Tafelwechsel wird dieselbe Tageskarte aktualisiert
- der Kartenzeitpunkt ist immer der Zeitpunkt des neuesten enthaltenen Wechsels
- die Karte wandert dadurch im heutigen Feed an die richtige chronologische Stelle
- beim Tageswechsel wird die Karte eingefroren
- Tafel-Karten früherer Tage werden nie aktualisiert

Die Karte unterscheidet klar zwischen:

- gewechselten Bestmarken
- ausgebauten Bestmarken
- neuen Monatschroniken
- Insignium-Wechseln
- dem Netto-Prestige-Saldo des gesamten Spieltags

Ein negativer Wert im unteren Band ist kein Elo-Verlust. Die Beschriftung lautet deshalb ausdrücklich „Prestige-Saldo des Spieltags“, und jeder Betrag trägt ein `P`.

## 6. Funfacts um 15 Uhr

Es gibt höchstens einen Funfact pro Kalendertag, mit festem Zeitstempel 15:00 Uhr.

Er wird nur erzeugt, wenn bis 15:00 Uhr:

- noch keine Partie stattgefunden hat und
- kein Saisonabschluss stattgefunden hat.

Wenn der Funfact um 15:00 Uhr veröffentlicht wurde und die erste Partie um 15:20 Uhr folgt, bleibt der Funfact bestehen. Spätere Nachrichten unterdrücken ihn nicht.

Themenrotation:

- Insignium und Weg zur nächsten Stufe
- aktuelle Form, jedoch als belastbarer Befund
- Rekord im Rampenlicht
- Monatschronik im Rampenlicht
- Rang und Abstand
- Saisonstart, Saisonmitte und Schlussspurt
- spielreichste oder spielärmste abgeschlossene Woche
- besondere Duo- oder Gegnerkonstellation
- seltene Auszeichnung und deren Bedeutung
- erklärender Blick auf ein Feature der App

Keine beliebigen Zufallszahlen. Jeder Funfact braucht eine klare Aussage, eine echte Quelle und möglichst eine sichtbare Kennzahl. Typ, Rubrik und Spieler rotieren, damit nicht immer dieselben Personen erscheinen.

## 7. Karten-Wireframes

### Matchkarte

```text
┌─────────────────────────────────────────────┐
│ AM SPIELTAG                           13:16 │
│                                             │
│  [Team A]          10 : 7          [Team B] │
│                    ^^^^^                    │
│             größtes Element der Kopfzone    │
│                                             │
│ Revanche für Leon und Maxi                  │
│ kurze, konkrete Einordnung                  │
├─────────────────────────────────────────────┤
│ ↳ Leon und Maxi holen sich die Revanche     │
│ ↳ Rivalität erreicht eine besondere Marke   │
│ ↳ seltene Auszeichnung: …                   │
└─────────────────────────────────────────────┘
```

Anforderungen:

- Score deutlich größer als alle Sekundärzahlen
- Score immer in derselben schnell erfassbaren Kopfzone
- beide Teams und alle vier Spieler direkt am Score
- Spezialgrafik ergänzt das Ergebnis, ersetzt es nicht
- auch Revanche-, Tacho-, Mosaik-, Gegner-, Transfer- und Seriengrafiken zeigen den Score dominant

### Ewige Tafel

```text
┌─────────────────────────────────────────────┐
│ EWIGE TAFEL                          13:34  │
│                                             │
│  3 Wechsel     Leon und Julian setzen       │
│                Marken auf kurzer Strecke    │
├─────────────────────────────────────────────┤
│ 13:16  Leon übernimmt „Der Lauf“            │
│ 13:20  Leon übernimmt „Der Torauscher“      │
│ 13:34  Julian übernimmt „Der Einzelkämpfer“ │
├─────────────────────────────────────────────┤
│ PRESTIGE-SALDO DES SPIELTAGS                │
│ Martin −124 P · Jannik −53 P · Julian −36 P │
└─────────────────────────────────────────────┘
```

Der letzte Zeitstempel entscheidet über die Position der Karte. Alte Uhrzeiten dürfen nicht am neuen Tagesstand hängen bleiben.

### Funfact

```text
┌─────────────────────────────────────────────┐
│ FUN FACT                             15:00  │
│ REKORD IM RAMPENLICHT                       │
│                                             │
│  [Wappen]  Leon hält „Der Ruhepol“          │
│            konkrete Kennzahl                │
│                                             │
│ Warum das besonders ist, in einem Satz.     │
└─────────────────────────────────────────────┘
```

## 8. Cache- und Performance-Regeln

- DB zuerst laden, dann Funfact-Rotation und Generator ausführen
- Generator nach dem ersten Rendern in einem Leerlauf-Zeitfenster starten
- Generator nach Matchanzahl, Cache-Version, Datum und fälligen Slots memoisierten
- Feed-Konsolidierung nach Referenz des gespeicherten Arrays memoisierten
- keine Rekord-, Chronik- oder Text-Neuberechnung im Renderpfad
- DB-Abfrage per Datumsfenster; ein großzügiges Zeilenlimit dient nur als technische Sicherung
- Inserts für normale Stories mit `ON CONFLICT DO NOTHING`
- Updates nur für Rohzeilen der heutigen Ewigen Tafel akzeptieren
- Realtime-Updates außerhalb der heutigen Ewigen Tafel ignorieren
- Designauswahl im Snapshot speichern, damit Rendern O(1) bleibt

## 9. Migration und Altbestand

Es ist keine rückwirkende Umschreibung alter Karten nötig. Bestehende valide Stories bleiben so, wie sie gespeichert wurden. Neue Stories besitzen die eingefrorenen Designfelder.

Historische, bereits abgemeldete technische Vorgängertypen dürfen weiterhin ausgeblendet bleiben, wenn sie dieselbe Partie doppelt erzählen oder auf nicht mehr existente Katalogeinträge zeigen. Das ist eine einmalige Kompatibilitätsregel, keine laufende redaktionelle Auswahl.

## 10. Abnahmekriterien

1. Eine vorhandene Revanche-Story zum 7:10 bleibt nach weiteren Matches unverändert sichtbar.
2. Titel, Text, Zeitpunkt, Daten und Design einer normalen Story bleiben über mehrere Generatorläufe bytegleich.
3. Eine neue Partie fügt Stories hinzu, entfernt aber keine bereits sichtbare Story.
4. Jede Partie im Feed besitzt genau ein deutliches Ergebnisband.
5. Mehrere passende Ereignisse derselben Partie erscheinen in einer Karte und vollständig im Blatt.
6. Unpassende Ereignisse werden nicht erzwungen zusammengeführt und nicht verworfen.
7. Die heutige Ewige Tafel existiert genau einmal und trägt den neuesten Wechselzeitpunkt.
8. Die Ewige Tafel von gestern verändert sich nicht mehr.
9. Ein um 15:00 Uhr veröffentlichter Funfact bleibt nach einer Partie um 15:20 Uhr bestehen.
10. Eine Partie vor 15:00 Uhr verhindert den Funfact dieses Tages.
11. Ein Saisonabschluss verhindert den Funfact dieses Tages.
12. Die UI bezeichnet negative Tafelwerte eindeutig als Prestige, nie als Elo.
13. Ein erneuter Lauf mit identischem Datenstand erzeugt keine neue fachliche ID.
14. Der Feed bleibt nach Build und Neuladen chronologisch und ruckelfrei.

## 11. Betroffene Bereiche

- Story-Generator und fachliche IDs
- DB-Synchronisation und Realtime-Updates
- Feed-Konsolidierung und Sammelkarten
- Matchkarten-Renderer und Designauswahl
- News-Detailblätter
- Funfact-Templates und Rotation
- News-Badge und Lesestand
- Spielerprofil, Insignium und Tafel-Verlinkungen, soweit sie Storydetails öffnen
- Tests für Generator, Feed, Detailblätter und Layout

