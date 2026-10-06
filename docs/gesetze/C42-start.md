# §C42 Der Start zeigt den letzten Stand und schreibt nie

## Regel

- Nach jedem Live-Abruf liegt der Stand auf dem Gerät (`_standSchreiben`, IndexedDB `kicker-stand`): die vier Antworten der Datenbank, wie sie kamen, der Story-Bestand und ein Fingerabdruck (`_standHash`). Er gilt nur für dieselbe Fassung der App (`BUILD_VERSION`).
- Der erste Durchlauf von `loadAll` startet den Abruf und zeichnet währenddessen aus dem Stand (`_standZeigen`). Ist der Abruf schon da, entfällt der Stand.
- **Aus dem Stand wird nur gezeichnet, nie geschrieben.** Kein Archiv, keine Story, kein Karriereende, kein Rückblick, der von selbst aufgeht, keine Migration der Einstellungen: was veröffentlicht oder speichert, hängt am Live-Abruf. Bis er da ist, steht „verbinde…“.
- Der Live-Abruf mit demselben Fingerabdruck lässt Daten, Töpfe und DOM stehen (`_standGezeigt`); ein anderer ersetzt alles wie ohne Stand.
- Scheitert der Live-Abruf, bleibt der Stand stehen und ein Hinweis sagt es; die Fehlerkarte kommt nur ohne Stand.
- Dieselbe Liste leerer Töpfe gilt für Stand und Live-Abruf (`LADEN_TOEPFE`), dasselbe Einbauen (`_datenEinbauen`).
- Der Service Worker (`src/sw.js`, ausgeliefert als `sw.js`) hält die Seite, das Symbol, die Schriften und die Supabase-Bibliothek: aus dem Topf, im Hintergrund nachgefüllt. Die Antworten der Datenbank hält er nie, und jede Anfrage mit `_cb` geht ans Netz — der Update-Check ganz, `forceReload` holt die Seite frisch und legt sie in den Topf.
- Er trägt die Fassung der Seite (`SW_FASSUNG`, gesetzt von `tools/build.mjs`); eine neue Fassung räumt beim Aktivieren die Töpfe der alten. Registriert wird er nur über https oder auf dem eigenen Rechner.

## Stellen

`06c-stand.js`, `06-db.js` (`_loadAllDurchlauf`, `_datenEinbauen`, `_overridesNachziehen`), `src/sw.js`, `37-boot.js` (Registrierung), `tools/build.mjs` und Wächter 1 und 5 in `tools/check.mjs`.

## Prüfung

`tests/start` (die Liga steht aus dem Stand, bevor das Netz antwortet; kein Schreibzugriff bis dahin; dasselbe Markup und derselbe Knoten nach dem Live-Abruf mit denselben Daten; ohne Netz bleibt der Stand; ein Stand einer anderen Fassung gilt nicht; der Service Worker hält die Seite unter ihrer Fassung, ohne Netz öffnet die App aus ihm, Update-Check und Neu laden gehen ans Netz, eine neue Fassung räumt den Topf der alten, keine Anfrage geht an eine fremde Adresse).

## Herleitung

Wie es dazu kam und was vorher falsch war — der Grund jeder Regel oben.

Die App zeigte beim Start nichts, bis Supabase alle Spieler, alle Partien,
die Einstellungen und die Saisons geschickt hatte. Auf dem Telefon hieß das
bei jedem Öffnen eine leere Seite mit „verbinde…“, mit schlechtem Netz für
Sekunden. Der Inhalt, auf den man wartete, war fast immer derselbe wie beim
letzten Mal.

Der gespeicherte Stand macht das sichtbar, was das Gerät schon weiß. Er darf
aber nur zeigen: `loadAll` schreibt nach einem Abruf in die Datenbank — es
archiviert abgeschlossene Monate, veröffentlicht Stories, schließt ein
Karriereende ab und zieht Einstellungen nach. Jede dieser Handlungen aus
einem alten Stand hätte etwas veröffentlicht, das die Datenbank gerade nicht
sagt; eine Story aus gestrigen Daten ist mit dem Snapshot-Vertrag [§C33] für
immer gespeichert. Deshalb trennt `_datenEinbauen` (rein lokal) das Einbauen
vom Schreiben (`_overridesNachziehen`, Archiv, Sync), und nur der
Live-Abruf ruft beides.

Gespeichert werden die Antworten, wie sie aus der Datenbank kamen, nicht der
eingebaute Zustand: so baut der Stand mit demselben Code ein wie der
Live-Abruf, und der Fingerabdruck vergleicht dieselbe Sache. Ein Stand einer
anderen Fassung der App wurde mit anderem Code eingebaut und gilt nicht.

Ohne den Vergleich zeichnete der Live-Abruf mit denselben Daten die Ansicht
ein zweites Mal, nach einer zweiten kalten Rechnung aller Töpfe — der
Schnellstart hätte den Start teurer gemacht, nicht billiger.

Gemessen in `tests/start` mit drei Sekunden Netz: die Liga steht nach rund
400 ms; vorher nach dem Netz.

Der Service Worker gehört zur selben Regel: ohne ihn holte jedes Öffnen die
Seite, das Skript von jsdelivr und die Schriften von Google, bevor etwas zu
sehen war. Er darf aber das Update nicht verschlucken. Der Update-Check
(`checkForUpdate`) und das Neuladen (`forceReload`) tragen `_cb`; beide gehen
am Topf vorbei, sonst verglich die Seite wieder ihre eigene Version mit sich
selbst — genau der Fehler, den die Version aus dem Fingerabdruck einmal
behoben hat. Im Test geht keine Anfrage an eine fremde Adresse: ein Service
Worker holt fremde Quellen selbst, an jeder Umleitung des Browsers vorbei,
und mit der echten Bibliothek spräche der Test mit der echten Datenbank.
