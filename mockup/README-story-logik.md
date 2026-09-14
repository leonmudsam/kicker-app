# Die Logik des Story-Systems

Eine Tafel, die vier Fragen in der Reihenfolge beantwortet, in der die App
sie beantwortet: **welche Daten** eine Karte bilden, **in welcher
Reihenfolge** die Regeln greifen, **nach welchem Prinzip** und **wie oft**
das gemessen passiert.

```
node mockup/story-logik-lauf.js      # spielt die echten Partien nach → .story-logik.json
node mockup/story-logik-seite.js     # baut story-logik.html
```

Der Lauf braucht **keinen Browser**: die Seite zeigt Zahlen, keine gerenderte
Geometrie. Der Rumpf ist derselbe wie in `tests/ambient.test.js` — dieselbe
`dist/index.html`, dieselben Fixtures, damit die Zahlen hier und dort dasselbe
bedeuten.

Gemessen wird so: die 466 echten Partien werden **Spieltag für Spieltag**
nachgespielt, an jedem Kalendertag um 23:30 läuft der echte Generator, und
seine Karten werden wie in der App persistiert (dieselbe ID nur einmal, erste
Insert-Zeit gewinnt). Danach ist der Feed genau das, was `getStoriesCache`
daraus macht. Ein einzelner Generatorlauf würde von jedem Typ höchstens einen
Fall treffen; über 98 Kalendertage kommt jeder vor.

Die **Beschreibungen** der Seite stehen in `story-logik-seite.js` und sind aus
`src/js/26-news-konstanten.js`, `27-news-generator.js`, `28-news-ambient.js`,
`29-news-cache.js` und `30-news-ui.js` gelesen. Die **Zahlen** stehen nicht
dort: Grenzwerte werden zur Laufzeit aus `NEWS_LIMITS` und `STORY_PRIO`
geholt, Häufigkeiten aus dem Lauf. Was auf der Seite steht und im Code nicht,
ist ein Fehler der Seite.

Kein Teil des Bauablaufs: `tools/check.mjs` und `tests/run.mjs` sehen den
Ordner nicht. Wer das Story-System ändert, baut die Seite neu — sonst zeigt
sie den Stand von vorhin.
