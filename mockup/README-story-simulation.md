# Story-Simulation

Hundert erfundene Partien, gerechnet und erzählt mit dem Code der App.
Zweck: sehen, **welche** Stories entstehen, **wie viele** davon im Feed
landen, **wann** und **warum** — an Daten, die die Fixtures nicht kennen.

```
node mockup/story-simulation-lauf.js     # spielt die Liga durch → .story-simulation.json
node mockup/story-simulation-seite.js    # baut story-simulation.html
```

Der Lauf lädt `dist/index.html` in einen Browser. Elo-Engine, Chronik,
Rekorde, Prestige, Story-Generator, Konsolidierung und Kartenbau kommen
unverändert von dort; erfunden sind allein die hundert Partien und die zehn
Namen (`story-simulation-daten.js`, deterministisch aus einem Startwert).

Kein Teil des Bauablaufs: `tools/check.mjs` und `tests/run.mjs` sehen den
Ordner nicht. Wer die App ändert, baut die Seite neu, wenn er sie ansehen
will — sonst zeigt sie den Stand von vorhin.
