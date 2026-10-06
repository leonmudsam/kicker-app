# Inhaltsverzeichnis der Dokumentation

Erzeugt von `node tools/doku.mjs` aus den Dateien selbst — nicht von Hand
bearbeiten. Wächter 8 vergleicht es mit dem Erzeugten; ist es rot, hat
sich eine Datei geändert, und der Aufruf zieht es nach.

| Datei | worum es geht |
|---|---|
| [README.md](../README.md) — kicker-app |  |
| [CLAUDE.md](../CLAUDE.md) — Kicker-Liga — Arbeitsanweisung | Deutschsprachige Einzeldatei-PWA für eine 2-gegen-2-Tischkicker-Liga: Elo, Saisons, Awards, Rekorde, Chronik, News. |
| [docs/anker.md](anker.md) — Abschnitte im Code | Jede Datei in `src/` mit den Bannern, die sie trägt, in der Reihenfolge des Baus. |
| [docs/architektur.md](architektur.md) — Herleitung | Die Liga ist ein Dutzend Leute und ein Tischkicker. |
| [docs/befunde.md](befunde.md) — Bewusst behaltene Doppelungen und Abweichungen | Was beim Aufräumen gefunden und absichtlich NICHT vereinheitlicht wurde, mit dem Grund. |
| [docs/erweitern.md](erweitern.md) — Etwas hinzufügen — und was daran hängt | Auszeichnungen, Monatswertungen und Liga-Rekorde sind nicht nur Listen. |
| [docs/laufzeit.md](laufzeit.md) — Laufzeit: Zustand, Caching, Takt | Was die App zur Laufzeit festhält, wie lange und wann sie es verwirft. |
| [docs/leistung.md](leistung.md) — Performance und Cache-Gültigkeit | Stand: 3. Oktober 2026. Vergleich zum Stand `5445ba8`. |
| [tests/README.md](../tests/README.md) — Die Testsuiten | Geprüft wird immer das **gebaute** Ergebnis (`dist/index.html`), nie die Quelle: nur so fällt auch ein Fehler auf, der erst beim Zusammensetzen entsteht. |
| [mockup/README.md](../mockup/README.md) — Entwürfe (mockup/) | Entwürfe. |

## Gestaltungsgesetze

Ein Kürzel `§Cnn` im Code verweist auf eine dieser Dateien (ab 25) oder
auf einen Abschnitt des CSS (bis 24, siehe `anker.md`).

| Gesetz | Regel in einem Satz |
|---|---|
| [§C25 Farbgesetz](gesetze/C25-farbgesetz.md) | Status- und Wertfarben haben vier feste Rollen: 1. Rangfarbe = „ich" 2. Gold = Titel und heute gehaltene Rekorde 3. Grün/Rot = ausschließlich Richtung 4. Metall = alles Übrige Der News-Feed setzt daneben eine **leise … |
| [§C26 Das Zeichen](gesetze/C26-das-zeichen.md) | Sterne = Ligatitel. **Höchstens fünf, dann die Zahl** — in beiden Formen gleich: unter dem Avatar in der Liste (`_znSterneSvg`, CSS), über dem Zeichen mit Band (`_insSterne`, im SVG). |
| [§C27 Ein Bauteil, überall dasselbe](gesetze/C27-ein-bauteil.md) | Derselbe Spieler sieht in Rangliste, Positionen, Awards, Team-Blatt, Podest und Profil gleich aus. |
| [§C28 Die Nebenwertungen](gesetze/C28-nebenwertungen.md) | Ein Band über der Tabelle der Liga steht in jedem Zeitraum an derselben Stelle und in derselben Form: eine breite Karte für die Hauptnebenwertung, dann kleine Kacheln. |
| [§C29 Zwei Ranglisten über denselben Zeitraum](gesetze/C29-zwei-ranglisten.md) | Eine Saison hat zwei Sieger: den besten Spieler und das beste Duo. |
| [§C30 Sieben Stufen, sieben Gegenstände — gezeichnet nach der Vorlage](gesetze/C30-insignium.md) | Das Insignium hat sieben Stufen (`INSIGNIEN`): **Reif** ab 0, **Schildring** ab 600, **Volutenkranz** ab 1200, **Zierkranz** ab 2100, **Lorbeerreif** ab 3100, **Kronenreif** ab 4300 und **Ordensstern** ab 5600 Prestige. |
| [§C31 Drei Rückblicke, ein Baukasten](gesetze/C31-rueckblicke.md) | Saison, Woche und Tag bauen aus denselben Teilen (`05b-recap-teile.js`): `rcpKopfHtml`, `rcpHeldHtml`, `rcpZahlenHtml`, `rcpKachelHtml`, `rcpZeileHtml`, `rcpNotizHtml`, `rcpAbschnitt`. |
| [§C32 Ein Chronik-Eintrag gehört dem, der ihn hält](gesetze/C32-chronik-eintrag.md) | Jeder Monatseintrag geht an den, der den Bestwert in diesem Monat wirklich hält — oder an niemanden. |
| [§C33 Im Feed hat jeder ein Gesicht](gesetze/C33-feed.md) | Jede Story, die einen Spieler nennt, zeigt ihn: ein Einzelner sein Wappen wie überall sonst [§C27], ein Duo zwei überlappende Chips. `_newsPids` sucht die Beteiligten in den über die Jahre gewachsenen `dataRef`-Felder… |
| [§C34 Drei belegbare Quellen, kein versteckter Leistungswert](gesetze/C34-prestige.md) | Prestige [§13.8] kommt ausschließlich aus **Auszeichnungen, Monatschroniken und aktuell gehaltenen Liga-Rekorden**. |
| [§C35 Nicht jeder Eintrag darf am Können hängen](gesetze/C35-rekorde.md) | Wer besser spielt, gewinnt jede Quote und jede Serie — am Ende liegen alle Liga-Einträge bei denselben drei Spielern. |
| [§C36 Die Titel sind Licht](gesetze/C36-titel-aura.md) | Hinter Avatar und Insignium steht die **Aura** der Meistertitel (`35c-titel-aura.js`, `AURA_STUFEN`), die Korona aus `mockup/titel-aura`: ein weicher Goldschein mit ungleich langen Strahlen, ab der vierten Stufe Golds… |
| [§C37 Ein Anteil misst gegen die Menge, um die es geht](gesetze/C37-anteile.md) | „Pechvogel" zählte knappe Niederlagen gegen ALLE Partien und kürte damit den, der viele enge Spiele hatte, statt den, der sie verliert: wer zwanzig Partien spielt, davon zwei enge, und beide verliert, stand bei 10 % —… |
| [§C38 Die Chronik gehört nicht nur den besten Drei](gesetze/C38-chronik-mitte.md) | Wer eine Quote gewinnt, gewinnt fast jede: gemessen gingen sechzig Prozent der Monatseinträge an die besten Drei der Siegquote, und der Monatserste allein hielt ein Drittel der Tafel. |
| [§C39 Die Monatschronik fragt nicht, wer der Beste ist](gesetze/C39-monatschronik.md) | Der alte Monatskatalog maß fast überall das Können, und wer eine Quote gewinnt, gewinnt fast jede. |
| [§C40 Das Karriereende: vier Regeln, mehr gibt es nicht](gesetze/C40-karriereende.md) | Wer die Gruppe verlässt, spielt keine Partie mehr. |
| [Allgemeine Gestaltungsregeln](gesetze/allgemein.md) | Regeln ohne eigenes Kürzel. |
