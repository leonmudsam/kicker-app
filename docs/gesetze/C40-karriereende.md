# §C40 Das Karriereende: vier Regeln, mehr gibt es nicht

Wer die Gruppe verlässt, spielt keine Partie mehr. Löschen oder Ausblenden
(`hidden`) nähme auch seine Geschichte; Ausblenden bleibt der Weg für einen
versehentlich angelegten Spieler. Gespeichert werden der Zeitpunkt
(`players.retired_at`) und der Stand des Profils (`players.retired_stand`,
Spalten aus `datenbank/karriereende.sql`); alles andere folgt aus den Regeln.
1. **Ein Zeitraum braucht keine Abfrage** (`sichtbar`). Tag, Woche, Monat:
   wer darin gespielt hat, steht darin — Tabelle, Awards, Player of the Day
   und Week, Meister, Monatschronik, Positionsverlauf, Rückblick, die
   Tabelle vor und nach jeder Partie —, auch nach seinem Karriereende, und
   er kann ihn gewinnen. Danach spielt er nicht mehr und kommt in späteren
   Zeiträumen von selbst nicht vor. Ebenso alles, was aus seinen Partien
   entsteht: Serien, Jubiläen, Meilensteine, Auszeichnungen und wer sie
   trägt. **Eine Monatschronik bleibt dem, der sie geholt hat**: wer im
   Juni Chroniken holt und aufhört, behält sie, und kein Nächstbester
   rückt nach, der sie in diesem Monat nicht verdient hat — die
   Monatsrechnung fragt deshalb `sichtbar` und nie `ligaAktiv`. Eine frühere Fassung fragte hier nach dem Ende jedes Zeitraums,
   an über zwanzig Stellen, und ließ ihn den Monat und die Woche seines
   Karriereendes verlieren, obwohl er darin gespielt hatte.
2. **Ein Laufbahn-Vergleich ist ohne ihn, ab dem Karriereende**
   (`ligaAktiv`, ohne Zeitpunkt): Ewige Tafel und Gesamt, Rangstufen,
   Liga-Rekorde, Prestige-Rang, die Teams- und Positionslisten, die
   Wertungen über die ganze Laufbahn (`getCachedAwardRankings('all')`), die
   Spielerwahl, die Fun Facts und die Insignium-Meldungen. Auch in einem
   Zeitschnitt: ein Laufbahn-Vergleich vergleicht mit der Liga von heute,
   sonst meldete der Feed Übernahmen, die niemand gespielt hat. Diese
   Abfrage steht in den Engines (`_chronicleCtx`, `_rangTabelle`,
   `prestigeTabelle`, die Award-Rangliste); ein neuer Rekord, eine neue
   Chronik, ein neuer Award läuft durch sie und erbt die Regel.
3. **Sein Profil steht im gespeicherten Stand, in zwei Teilen.**
   - *Karriere*, beim Klick (`_ruheKarriereBauen`, mit dem Zeitpunkt in
     EINEM Schreiben, `karriereSetzen`): was ein Vergleich mit der Liga war —
     die Rekorde, die er hielt, samt Halterzahl, Rangstufe, Perzentil,
     Prestige-Platz. Gerechnet mit der gewöhnlichen Rechnung, solange er
     noch ein Spieler wie jeder ist; keine zweite Rechnung, kein Zeitschnitt.
   - *Abschluss*, sobald jeder Zeitraum zu ist, in dem er gespielt hat
     (`ruhestandAbschlussMs`: Ende der Woche und des Monats seines
     Karriereendes, plus der Tag, an dem deren Rückblicke erscheinen),
     einmal nach dem Laden geschrieben (`_ruheAbschliessen`): was er selbst
     gespielt hat — Auszeichnungen und ihr Katalog mit der Klasse von
     damals (`badgeKatalog`), Prestige mit Insignium, Fingerabdruck.
   Bis zum Abschluss rechnet sein Profil wie jedes, nur mit den Rekorden aus
   dem Karriere-Teil (`prestigeTabelle().ruhe`): das Karriereende selbst
   ändert sein Prestige nicht. Danach rechnet für ihn nichts mehr — eine
   neue Fassung der App, ein neuer Katalogeintrag, ein anderer Startwert
   ändern sein Profil nicht; eine neue Gestaltung schon, das ist gewollt.
   Die Stufe gilt über ihren Schlüssel (`insignie.key`), nicht über ihre
   Zahl, damit eine neue Stufe in der Leiter nicht auf den Nachbarn zeigt.
   „Diese Saison" heißt im Profil die Saison seines Karriereendes, und der
   Saisonverlauf kürzt nach seinen eigenen Saisons. `prestigeOf`,
   `chroniclesOfPlayer`, `chronicleOf`, `getPlayerRank`, `getCachedBadges`
   und `fingerabdruck` lesen für ihn aus dem Stand. Gültig ist ein Stand nur
   mit seiner Fassung (`RUHE_STAND_FASSUNG`) und für genau dieses
   Karriereende; ohne Stand — nur bei einem von Hand gesetzten Zeitpunkt —
   zeigt das Profil keine Rekorde und keinen Rang. Fehlt die Spalte, wird
   nichts gesetzt, und der Hinweis nennt die SQL-Datei.
4. **Der Feed nennt ihn nach dem Abschluss nicht mehr**
   (`ohneStoriesNachAbschied`), außer in der Karte seines Karriereendes: ein
   Tor für alles, im Generator, bevor gespeichert wird, und in
   `_consolidateStories` für Zeilen aus der Datenbank. Bis zum Abschluss
   erzählt er noch von den Zeiträumen, in denen er gespielt hat. Kein
   Story-Typ fragt selbst.
**Eine Partie nach dem Karriereende gibt es nicht** (`imRuhestandAm`): die
Eingabe bietet ihn nicht an, das Bearbeiten einer Partie danach auch nicht;
wer schon in der Partie steht, bleibt wählbar. Genau das trägt Regel 1.
Wird eine Partie von VOR dem Karriereende nach seinem Abschluss korrigiert,
ändert das die Zeiträume (Regel 1), aber nicht seinen gespeicherten Stand —
der bleibt, wie er beim Abschluss war.
**Wer eine neue Ansicht, Story oder Wertung baut**, entscheidet eine Frage:
ist es ein Zeitraum oder etwas aus seinen Partien (`sichtbar`), oder ein
Vergleich über die Laufbahn (`ligaAktiv`)? Mehr ist nicht zu tun. Eine rohe
`.hidden`-Abfrage lässt `tests/ruhestand` nicht zu.
**Was auf dem Bildschirm steht, wird abgesucht** (`tests/ruheliga`): nach
seinem Abschluss, während die anderen weiterspielen, jeder Reiter aus
`NAV`, jeder Knopf darin bis zur Tiefe drei und die Spielerwahl. Erlaubt ist
er nur in `[data-ruhestand]` (die Liste der Ruheständler,
`EINBLICK.….ruhestand`) und in `[data-bis]`, einem Stück Geschichte, das
spätestens mit seinem Abschluss endet (`geschichteHtml`: ein vergangener
Monat in Liga und Awards, eine vergangene Woche, die Zeile der
Chronik-Matrix bis zu ihrem letzten Eintrag), und im Verlauf
(`GESCHICHTE`). Eine neue Ansicht, die ihn zeigt, fällt auf, ohne dass der
Test sie kennt. `tests/ruhestand` zeichnet Profil, Laufbahn,
Auszeichnungen, Bilanzen und Abschied nach dem Abschluss und noch einmal
zwei Monate und eine neue Fassung der App später und vergleicht den Text.
**Kehrt er zurück** (beide Spalten leer), gilt wieder die Liga von heute:
Auszeichnungen und Chroniken bleiben, die Rekorde werden gegen das Feld
von heute gerechnet — das Prestige ist danach niedriger oder höher als beim
Abschied, unverändert nur, wenn in der Pause niemand gespielt hat.
**Wo er steht:** am Ende von Gesamt unter „Mehr zur Saison", der Positionen,
der Teams und der Chronik-Matrix, jeweils als Einblick [§C27], der zu ist —
dieselben Zeilen wie darüber (`ruhestandTafelHtml`, `positionsBlockHtml`,
`vTeams(true).ruhe`, `ruhestandChronikHtml`), ohne Platz und ohne das Metall der ersten drei. Im
Profil die Pille „Karriereende" und vorn die Karriere-Elo des Abschieds.
Eine Serie, die nicht mehr läuft, brennt nicht (`znFeuer`, `avRingOf`). Die
Knöpfe „Karriere beenden" und „Karriere fortsetzen" erscheinen nur für
jemanden mit Partien.
**Gelöscht wird nur, wer nie gespielt hat** (`spielerLoeschen`): jede
Partie trägt drei weitere Namen, deren Elo, Serien und Rekorde gegen ihn
gerechnet sind. Mit Partien heißt der Knopf „Spieler entfernen" und bietet
Karriereende und Ausblenden an. Ob es Partien gibt, fragt die Datenbank
und nicht die geladene Liste; ohne Antwort wird nichts gelöscht.
**Das Karriereende ist eine Nachricht und ein Blatt** (`18b-abschied.js`).
Die Story (`karriereende_<Spieler>_<Tag>`) ist Breaking und trägt die Bühne
des Abschieds in kühlem Metall [§C25]; sie gilt nur, solange genau dieses
Karriereende gilt (`_storyWiderrufen`). Das Blatt (`zeigeAbschied`) erzählt
die Laufbahn aus dem Baukasten der Rückblicke [§C31] und öffnet sich nach
dem Knopf, über die Pille, aus der Story und einmal je Gerät beim nächsten
Start, solange das Karriereende im Fenster des Feeds liegt.

Stellen: `06b-ruhestand.js`, `18b-abschied.js`, Spalten aus `datenbank/karriereende.sql`.
