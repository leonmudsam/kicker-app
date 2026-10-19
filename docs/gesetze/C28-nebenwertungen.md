# §C28 Die Nebenwertungen

## Regel

- Über der Liga-Tabelle steht in jedem Zeitraum an derselben Stelle ein Band der Nebenwertungen: eine breite Karte, dann kleine Kacheln. In der Saison führt das Team der Saison, in Woche und Tag der Spieler des Zeitraums.
- Alle Zeiträume tragen dieselbe Metrikleiste (`METRIC_LABEL`, `METRIC_REITER`); der erste Eintrag ist die Leitgröße, nach ihr wird der Erste bestimmt. Elo heißt im Zeitraum der Zuwachs, in Saison und Gesamt der Stand.
- Die Torbilanz in Gesamt und unter den Teams ist ein Schnitt je Partie, geschrieben und gerechnet wie Plus-Minus (`AW_WERT.plusMinus`, „Ø +1,4"); in Gesamt steht dahinter, wer weniger als `AW_MIN.spielerSaldo` Partien hat, und unter seiner Zahl steht die Schwelle.

## Stellen

`11-view-ranking.js`, `05-rang-elo.js`, `15-views-rest.js` (Teams), `src/css/02-ranking.css`.

## Prüfung

`tests/blatt` zeichnet jeden Reiter bei 360 px und misst die Nebenwertungen der Liga; `tests/tafel` ordnet die Torbilanz in Gesamt und unter den Teams nach und liest jede Zahl.

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

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

**Die Torbilanz ist ein Schnitt je Partie.** In Gesamt und unter den Teams
stand die Summe der Tordifferenzen, und vorn stand, wer am meisten gespielt
hatte: bei gleichem Saldo je Partie lag ein Vielspieler mit doppelt so
vielen Partien doppelt so weit vorn. Die Wertung, die dieselbe Frage
stellt, ist Plus-Minus in den Awards — dieselbe Rechnung, dieselbe
Schreibweise, dieselbe Schwelle, unter der ein einziges 10:0 den Schnitt
entscheidet. Die Summe steht unter den Teams weiter in der Zeile, im Profil
als Kennzahl.

Stellen: `11-view-ranking.js` (Band und Sortierung), `02-ranking.css`.
