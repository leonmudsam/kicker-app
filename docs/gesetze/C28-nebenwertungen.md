# §C28 Die Nebenwertungen

Ein Band über der Tabelle der Liga steht in jedem Zeitraum an derselben
Stelle und in derselben Form: eine breite Karte für die Hauptnebenwertung,
dann kleine Kacheln. In der Saison führt das Team der Saison, in Woche und
Tag der Spieler des Zeitraums — er ist dort kein Tabellenerster, sondern ein
Titel mit eigener Regel (Mindestzahl Siege, beste Quote), und gehört deshalb
neben die Tabelle, nicht hinein.

Vorher hatte jeder Reiter hier etwas anderes: die Saison eine schmale Leiste
ganz unten unter der Liste, Woche und Tag eine große goldene Heldenkarte
darüber, die Ewige Tafel gar nichts. Drei Formen für dieselbe Rolle — und
die Leiste unten hat niemand gesucht.

Dazu gehört **eine Metrikleiste für alle Zeiträume** (`METRIC_LABEL`,
`METRIC_REITER` in `05-rang-elo.js`): überall dieselbe Leiste, und der erste
Eintrag ist die Leitgröße des Zeitraums. Nach ihr wird der Erste bestimmt,
und nur in ihr steht er als Kopfzeile über der Liste. Elo heißt dabei im
Zeitraum der Zuwachs, in Saison und Gesamt der Stand — beides ist „die Elo
dieses Zeitraums", einmal als Strecke und einmal als Punkt. Vorher hatte
jeder Reiter seine eigene Bedienung mit eigener Aufschrift: drei Sprachen
für dieselbe Frage.

Stellen: `11-view-ranking.js` (Band und Sortierung), `02-ranking.css`.
