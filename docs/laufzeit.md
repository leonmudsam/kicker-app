# Laufzeit: Zustand, Caching, Takt

Was die App zur Laufzeit festhält, wie lange und wann sie es verwirft. Die
Abschnittsnummern im Text (§2, §3, §6 …) meinen die Abschnitte von
[CLAUDE.md](../CLAUDE.md), Kürzel wie §C27 die Gesetze in
[gesetze/](gesetze/), Kürzel wie §5.2 Abschnitte im Code ([anker.md](anker.md)).

# Zustand

Der veränderliche Zustand der Oberfläche steht gesammelt in
`src/js/01-update.js` (`tab`, `period`, `ligaSeasonId`, `ligaSicht`,
`awView`, `awPeriod`, `awSeasonId`, `rekKammer`, `rankMetric`, …). Neue Zustandsvariablen
gehören dorthin und nirgendwo anders, und sie brauchen einen Rücksetzpunkt:
`09-ui-infra.js` (Tabwechsel), `20-bind.js` (Zeitraumwechsel) und
`24-lock.js` (Klick aufs Logo) setzen zurück.

`rekKammer` gilt **nur** für den Rekorde-Reiter und ist leer für alle fünf
Kammern (`koennen`, `form`, `mark`, `fuegung`, `shame`). Sie wird beim
Tabwechsel UND beim Reiterwechsel geleert: wer den Tab verlässt, will beim
Zurückkommen die ganze Tafel sehen und nicht den Ausschnitt von vorhin.

`ligaSeasonId` gilt **nur** für den Liga-Tab — Awards, News und Ambient
rechnen weiter mit `currentSeason()`. Sie wird beim Tabwechsel UND beim
Zeitraumwechsel geleert: die gewählte Saison gehört zur Ansicht „Saison",
und die Saison-Tools darunter (Recap, Positionsverlauf) folgen ihr.

`einblickOffen` nennt die aufgeklappten Einblicke (`rollen`, `netz`,
`ruhe_liga`, `ruhe_pos`, `ruhe_teams`, `ruhe_chronik`), durch Leerzeichen getrennt, und ist
sonst leer. Es sind mehrere, weil ein Reiter zwei tragen kann: mit einem
einzigen Wert klappte der zweite den ersten im Zustand zu, und nach dem
nächsten Neuzeichnen stand er geschlossen da. Ein Neuzeichnen im selben
Reiter lässt sie offen — eine
neue Partie oder ein anderer Zeitraum klappt nichts zu, was man gerade
liest —, der Tabwechsel und der Klick aufs Logo leeren ihn: ein neuer Reiter
beginnt mit der Rangliste oben und nicht mit einer Grafik darüber.

Zeitweilige Arbeitsaufträge sind keine Ansichtsauswahl: `_ligaRefreshAuftrag`
lebt im Navigations-Layer und wird nach Ende des gemeinsamen Datenabrufs
geleert; `_loadAllLeise` gilt nur für dessen Lauf und wird im `finally`
zurückgesetzt. Ein Vordergrundaufruf hat Vorrang vor stiller Fehleranzeige.

> **Pflegepflicht.** Kommt eine Zustandsvariable dazu, wird sie hier genannt
> und ihr Rücksetzverhalten beschrieben.

# Caching

Jeder Topf hängt an `_cache` und trägt **`_cache.version` im Schlüssel**. Das
ist die ganze Regel: `invalidateCache()` erhöht die Version, und ein Wert mit
altem Schlüssel wird nie wieder gefunden. Die Tag-Liste
(`invalidateCache(['global','stats',…])`) löscht darüber hinaus einzelne Töpfe
sofort — sie ist eine Abkürzung, kein Ersatz.

Wer die Version wegen der Bequemlichkeit weglässt, baut einen stillen Fehler:
`teamDetail` und `h2hDetail` hatten nur Spieler-IDs im Schlüssel und hingen
damit allein an ihrem Tag — den der Eingabe-Tab beim Speichern gar nicht
mitreicht. Gemessen zeigte das Duo-Blatt nach einer neuen Partie weiter 26:4
statt 27:4 und die Bilanz 110 Duelle statt 111. `tests/tafel` misst das nach.

`tests/tafel` liest die ausgelieferte Datei und prüft die Regel für **jeden**
Topf nach — Stichproben genügen dafür nicht, weil ein neuer Topf gerade der
ist, an den niemand denkt.

Kalenderabhängige Schlüssel tragen zusätzlich ihre echte Zeitgrenze:
`matchesInPeriod` den Tages-/Wochenbeginn, `getCachedAwardRankings` die
aktuelle Woche beziehungsweise den Tag, `allPastSeasons` den laufenden
Monat und `getSeasonPositionHistory` den heutigen Tag, solange die Saison
läuft. Die kleine Recap-Kurve trägt auch `ph.lastDay`. Ohne neue Partie darf
der Cache keinen alten Tag oder noch laufenden Vormonat behaupten.
`tests/leistung` prüft das mit unveränderter Datenversion.

`periodPlayerStats` folgt der Identität der kanonischen Periodenliste und
dem aktuellen Monat: auch neben einer unveränderten Allzeit-Bilanz muss die
absolute aktuelle Elo nach dem Monatswechsel zurückgesetzt sein.
`currentSeason` prüft weiterhin die Ortszeit bei jedem Aufruf, hält aber nur
das eine aktuelle Monatsobjekt statt es bei jedem Cache-Treffer neu zu bauen.

`getGlobalSim` hält genau einen vollständigen DB-First-Lauf, gebunden an
Version, Monat und Quellenreferenzen. Der ehemalige inkrementelle Weg hielt
nur die History und Saison-/Team-Maps der neuen Partien. Historische Schnitte
teilen über `getSimAt` und `getSimForMatches` denselben exakten Liga-Prefix
(höchstens 24 Läufe). Fremde Teilmengen erhalten ihren eigenen kanonischen
Lauf in einer versions- und quellengebundenen WeakMap. Gleiche Zeitstempel
werden im Zeitschnitt vollständig eingeschlossen, ein ausdrücklich kürzerer
Index-Prefix bleibt dagegen kürzer. Auszeichnungen und Rekorde nutzen diese
Quelle, nicht zusätzliche Simulationen. Historische Saison-Gruppierungen
teilen stabile Array-Identitäten für die Periodensieger aller Spieler.
`tests/prefix` vergleicht sämtliche Maps und History mit der unveränderten
ungecacheten Engine, einschließlich Brüchen, Edit, Add, Empty-State und Monat.

H2H-Listen tragen Version und Matchanzahl im Schlüssel und höchstens 80
Einträge. Gültige Nullwerte für Erwartung, Spielbonus und Verlustdämpfung sind
keine fehlenden Angaben. Die sichtbaren Prestige-Gruppensummen kommen zentral
aus derselben Restverteilung wie die Posten im Laufbahnblatt; Gesamtformel und
Rohquellen bleiben unverändert. `tests/rechnen` prüft die gemeinsame Anzeige
in Engine, Profil und Story, ohne eine zweite Elo-Formel zu implementieren.

Das Spielerprofil nutzt bereits gecachte Spieler-/Saisonlisten und bindet
nur seine eigenen Knöpfe. Browser mit beiden nötigen CSS-Fähigkeiten zeichnen
seine `.pp-sec`-Abschnitte bedarfsweise (`content-visibility:auto` mit
`overflow-clip-margin` für Überhänge). Wappen und Aura im Kopf sowie andere
Blätter sind ausgenommen, ältere Browser behalten das vollständige Layout.
`openSheet` setzt den alten Scrollstand vor dem neuen Markup zurück; jede
verspätete Navigations- oder Wischphase prüft die Öffnungsnummer. Schließen
oder direktes Neuöffnen entzieht alten Phasen den Besitz.

`render` merkt am `#main` ausschließlich das zuletzt gezeichnete Markup,
seine `_cache.version` und den Root-Knoten. Gleiches Markup in derselben
Version behält DOM, Fokus und Bindings; Vorlagen werden dennoch ausgewertet,
damit zeitabhängige Anzeigeänderungen erkannt werden. Datenwechsel, andere
Vorlagen und fremd ersetzter Inhalt erzwingen einen Umbau. Eingabe und
Einstellungen sind ausgenommen. Die fünf Navigationsknöpfe werden einmal
gebaut und gebunden, danach ändert sich nur ihre aktive Klasse. Kein
unbegrenzter HTML-Cache je Ansicht oder Filter.
Die ganze `.view` wird nicht bei jedem Umbau verblasst/verschoben: Filter
und Datenantworten wirkten sonst 320 ms lang wie ein erneuter Seitenstart.
Erklärende Grafiken und Segmentwähler behalten ihre eigene Bewegung.

Benutzerseitige Reiter-/Filterwechsel verwenden `_renderNachEingabe`:
die Navigation antwortet synchron, genau ein Frame mit anschließender Aufgabe
baut die zuletzt gewählte Ansicht. Während eines Reiterwechsels ist der alte
Inhalt inert, Filter derselben Ansicht bleiben für die nächste Wahl bedienbar.
Ein direktes `render` oder ein anderer Root entzieht dem alten Auftrag den
Besitz und stellt die vorherige Eingabefreigabe wieder her. `aria-busy` und
`aria-current` machen den Zustand auch ohne Farbe erkennbar. `bind` bindet nur
den Hauptinhalt, keine Knöpfe eines gleichzeitig geöffneten Blatts.
`_eingabeOffen` erkennt ein bereits aufgebautes lebendes Match-/Settingsformular:
auch vorher gestartete Datenabrufe aktualisieren darin nur Daten und Vorschau,
nicht den Eingabe-DOM. Abruffehler stehen als Hinweis statt anstelle des
Formulars; freier, noch nicht ausgewählter Suchtext geht so nicht verloren.

Die Match-Eingabe hält mit `_cache._matchInputMemo` genau das letzte
`computeMatch`-Ergebnis, gebunden an Version, Monat, Aufstellung, Rollen,
Stand und Quellenreferenzen. Chance, Vorschau und Speichern teilen diese
Rechnung; die Formel wird nicht kopiert. Unveränderte Chancen behalten ihren
DOM. Zustand, Stand und Speichergültigkeit antworten sofort, die Vorschau
zeichnet höchstens einmal je Frame und prüft ihren Formular-Root. Die
Teamsuche aktualisiert über `vTeams(true)` ausschließlich ihre Ergebnisliste
aus derselben Vorlage, nicht das Eingabefeld. Cursor, Fokus und laufende
IME-Komposition bleiben erhalten; alte Aufgaben verändern keinen neuen Reiter.
Comboboxen unterstützen Pfeiltasten, Enter und Escape samt ARIA-Auswahl.
Speichern hält eine sofortige Einzelsperre und einen Eingabesnapshot; eine
verspätete Antwort löscht keinen zwischenzeitlich geänderten Entwurf. Ein
bereits erfolgter Insert wird nach einem Folgefehler nicht erneut angeboten.

Ein Topf mit einem Schlüssel, der die Version enthält, **wächst über die
Versionen**: er braucht eine Obergrenze, ab der er geräumt wird. Sieben
hatten keine — darunter der der Auszeichnungen, der zu jeder Version zwölf
Listen mit je dreißig Einträgen anlegt und jede vorige behält. Der Deckel
wird nur bei einem Fehlgriff geprüft: vor dem Lesen geräumt, verlöre er
gerade den Treffer, für den er da ist. Geräumt wird der **älteste Eintrag**
(`_topfDeckel`), nicht der ganze Topf. Beim vollständigen Leeren ist das Memo
oberhalb des Deckels nämlich nicht beschnitten, es ist **aus**: gemessen an
`_seasonTitleCtx` mit Deckel 8 kostete ein zweiter Blick auf sechs und acht
Zeitschnitte null Rechnungen, auf zwölf und zwanzig jeweils alle noch einmal.
Und ein Deckel steht nie weit über der Arbeitsmenge — der News-Generator
allein fragt sieben verschiedene Schnitte des Monatskontexts ab, der Deckel
stand bei acht. `tests/tafel` zählt die Töpfe und
die Deckel und misst, dass ein Eintrag zu viel einen Eintrag kostet —
Stichproben genügen dafür nicht, weil ein neuer Topf gerade
der ist, an den niemand denkt.

**Ein Zeitschnitt, der nichts abschneidet, ist kein Zeitschnitt**
(`_schnitt`, `_schnittSaison`). Der Feed vergleicht „vor dem letzten
Spieltag" mit „heute" und schrieb „heute" als den Zeitstempel der letzten
Partie. Für jede geschnittene Rechnung ist das aber ein eigener Schlüssel:
gemessen rechnete ein Generatorlauf `prestigeTabelle` zweimal, einmal
ungeschnitten für 17 ms und einmal als Schnitt für 59 ms, und Juni und Juli
kamen in sechs Schnittfassungen vor, obwohl beide Monate längst zu sind.
Schlimmer als die Zeit ist die Abweichung: `seasonTitles` liest einen
abgeschlossenen Monat nur OHNE Schnitt aus dem eingefrorenen Datensatz und
rechnet ihn mit Schnitt frisch nach [§10.2] — derselbe Monat kann damit unter
zwei Namen erscheinen, je nachdem ob ein Schnitt mitgegeben wurde. Ein
Schnitt hinter der letzten Partie fällt deshalb weg, und ein Schnitt hinter
dem Monatsende fällt für DIESEN Monat weg. Gemessen sank der News-Generator
dadurch von 241 auf 162 ms kalt (Median aus elf Läufen). **Ein Generatorlauf nimmt genau zwei Stände** (`_storyStand`,
`_storyTagGrenzen`, `_prestigeWirkung` in `26b-story-fakten.js`): den Stand
vor der ersten Partie des Spieltags und den danach. Rekord, Monatschronik und
Insignium rechneten sich ihre Tagesgrenze und ihren Zeitschnitt vorher jeder
selbst aus, und jeder ein bisschen anders — die Chronik fragte
`prestigeTabelle` am Zeitstempel der letzten Partie, also mit einem Schnitt,
der nichts abschneidet. Drei Rechnungen über dieselbe Änderung nennen
irgendwann drei Zahlen, und die stehen dann auf drei Karten derselben Minute.
„Nachher" ist für den jüngsten Spieltag deshalb `0` und damit „jetzt": so
treffen alle vier zentralen Funktionen ihren heißen Cache. Wo eine
Rechnung an der Identität eines Arrays hängt statt an einer Version
(`_winnerCountsOf`, `matchesOfPlayer`, `matchesByDay`), reicht eine `WeakMap`
— `matches` wird immer **ersetzt**, nie an Ort und Stelle verändert, und ein
frisches Array verwirft den Memo von selbst.

**Ein Zeitschnitt ist ein Array je Stand** (`_partienBis`, `04-cache.js`):
die Partien bis `bisMs`, gefunden per Binärsuche wie in `getSimAt`, gemerkt
in einer `WeakMap` an `matches` je Zahl der eingeschlossenen Partien
(höchstens 24, der älteste geht zuerst). `prestigeTabelle(bis)` und
`seasonTitleHistory(pid, bis)` schnitten sich denselben Stand vorher jeder
selbst zurecht — zwölf gleiche Kopien der Liga je Schnitt —, und die Memos,
die an der Identität ihres Arrays hängen, trafen über diese Grenze nie. Das
Array ist nur zu lesen; `tests/prefix` sieht nach einem Generatorlauf nach,
dass keines verändert wurde. Liegt die Liga nicht aufsteigend vor, gilt der
alte Filter. Wer in welchem Monat gespielt hat, steht je Liste einmal in
`_spielerJeSaison` (`WeakMap`), `_wochenKey` merkt sich Text und Zahl wie
`mts`, und die Badge-Vergabe sucht ein Badge in einer Map statt in `BADGES`.

**Der Verlauf eines Rekords** (`_rekVerlauf`, Schlüssel Rekord, Partienzahl
und Version, Deckel 16) wird nach dem Öffnen des Blatts gerechnet, ein
Monatsende je Takt: ein Zeitschnitt rechnet die Elo-Bahn bis dorthin nach,
gemessen 7 bis 36 ms je Monat, und sechs davon auf einmal stünden mitten in
der Animation. Die Schnitte selbst liegen danach in `_chronCtxBis` und
teilen sich den Topf mit Feed und Rückblicken.

**Die Karten am Spieltag rechnen einmal je Datenstand** (`_spBasisMemo`,
`_spBildMemo`, beide eine `WeakMap` an `matches`): Spielreihenfolge,
Ergebnisverteilung als Präfixsumme, Serienstand vor jeder Partie und die
Runden der Vier, und je Karte ihr Bild, solange `players` dasselbe Array ist.
Eine Karte las sonst für die Verteilung, die Serie und die Runde je einmal
die ganze Liga — bei sechzig Karten sechzig Läufe bei jedem Öffnen. Die
Zeilen einer Runde finden die Karte ihrer Partie über `_spKarteMemo`, eine
`WeakMap` an der Liste des Feeds: je Zeile den ganzen Feed zu durchsuchen
wäre bei acht Zeilen und siebzig Karten ein Quadrat für nichts. Die Formen
der gewöhnlichen Partie hängen an `_spFormBasis`, ebenfalls eine `WeakMap`
an `matches`: die Partien je Tag, je Partie Siegchance, Abstand und Gewinn,
und gemerkt die Fakten, Kandidaten und die Wahl je Partie — die Kette der
Wahl läuft einmal je Datenstand.

Die V2-Scorewahl indiziert außerdem die wirklich publizierten `visual.score`
je Match und Storybestand. Dieser Index und die chronologische Variationsspur
werden bei neuer Rohstory-Referenz oder `_cache.version` neu aufgebaut;
publizierte Grafiken selbst bleiben unverändert. `_consolidateStories` hängt
neben der Eingabeliste auch an `matches` und `_cache.version`, damit eine zuvor
noch nicht geladene Matchreferenz nach dem Datenladen richtig aufgelöst wird.

**Ein Ruheständler kostet keine eigene Rechnung** [§C40]. Sein Stand liegt
in der Datenbank; `_ruheGespeichertMemo` merkt das Zerlegte je Spieler, Text
und Zeitpunkt. Bis zu seinem Abschluss rechnet `prestigeTabelle` ihn im selben
Durchlauf wie alle mit (`ruhe`), danach liest `prestigeOf` den Abschluss-Teil.
Die Daten des Abschieds (`abschiedDaten`, `_cache._abschied`, Deckel 8)
tragen Version und Partienzahl im Schlüssel und werden erst beim Öffnen
gerechnet.

**Die Rohsicht landet nicht im Cache.** Fünfundzwanzig Liga-Rekorde [§C35]
fragen nach einem gleitenden Fenster, nach einer Rolle, nach dem Gegnerkreis,
nach dem Partnerkreis oder nach den eigenen Spieltagen und brauchen dafür die Partien je Spieler in
Spielreihenfolge — dieselbe Rohsicht, die `_seasonTitleCtx` für den Monat
schon hat. `_chronicleCtx` baut sie in einer eigenen Struktur NEBEN `P`,
rechnet die Werte daraus aus und lässt sie fallen; am gecachten
Spielerobjekt hängen nur Skalare. Am Objekt selbst wären es 4×N
Partien-Objekte, und der Zeitschnitt hält bis zu 24 Kontexte gleichzeitig.
Jede Partie trägt dort `mate`, `geg` und `day`: „Der Klotz am Bein"
vergleicht jeden Mitspieler mit sich selbst OHNE diesen Partner, „Der
Rückenwind" braucht die Stärke des Partners, und „Der letzte Ball" und „Die
Steigerung" gruppieren nach Spieltagen — alle drei Fragen hängen an einer
Reihenfolge, die nur die fertige Liste kennt. Die vier Kennzahlen der Schandtafel fallen im
selben Durchlauf ab — gemessen 8,6 auf 10,3 ms kalt, warm weiterhin null. `tests/disziplinen` sieht nach, dass kein Spielerobjekt im
Cache eine Liste trägt.

> **Pflegepflicht.** Kommt ein Topf dazu, steht seine Schlüsselregel hier.

# Takt

Zwei Zeitgeber laufen dauerhaft (`37-boot.js`): `_tickDaten` alle dreißig
Sekunden, `_tickVersion` alle fünf Minuten. Beide **ruhen, solange die Seite
versteckt ist**, und holen beim Zurückkommen sofort nach. `loadAll` lädt alle
Spieler und alle Partien; das im Hintergrund zu tun ist Mobilfunk und Akku
für nichts, und ein PWA-Symbol bleibt tagelang offen. Der News-Autosync
(`29-news-cache.js`) befolgt dieselbe Regel seit jeher.

Der Update-Check (`checkForUpdate`, `01-update.js`) fragt mit
`If-None-Match`; der ETag steht mit der Version, zu der er gehört, im Speicher
des Geräts (`kicker_upd_v1`) und gilt nur, solange diese Version läuft. Ohne
ihn lud jeder Start die ganze Seite erneut — neben den vier Datenabfragen.
Der erste Check des Starts wartet, bis der erste Datenlauf gezeichnet hat und
die Seite ruht. `tests/start` misst beides am echten Start.

`loadAll` hält höchstens einen Durchlauf offen (`_loadAllPromise`). Weitere
explizite Anforderungen setzen `_loadAllNochmals` und erhalten dieselbe Promise, die
erst nach dem frischen Folgedurchlauf erfüllt ist. Nach jedem abgeschlossenen
Abruf wird gegebenenfalls erneut geladen: Speichern darf nicht lediglich
eine schon vorher gestartete Antwort erhalten. Alle vier Leseabfragen enden,
auch bei einer Ablehnung; überholte Antworten leeren keine Caches und
publizieren keine Stories. Fehlerhafte Teilantworten werden nicht eingebaut,
und ein Fehler verwirft den Fingerprint, damit ein erneuter Versuch möglich
bleibt. Unveränderte erfolgreiche Antworten behalten weiterhin den Cache.
Reine Hintergrundticks verwenden `loadAll({nachladen:false})` und schließen
sich nur an einen laufenden Abruf an. Sonst würde ein langsamer Abruf, der
länger als dreißig Sekunden dauert, durch jeden Tick erneut verworfen.
Jedes Tippen auf den unteren Liga-Knopf, auch wenn er schon aktiv ist,
ruft `_ligaAktualisieren`: nach einem Rückmeldungsbild lädt der vorhandene
Datenweg mit `leise:true`, ohne Dokumentreload oder Ladeansicht. Ein einzelner
`_ligaRefreshAuftrag` bündelt weitere Liga-Taps bis zum Abrufende. Eine schon
vor dem Tap gestartete Abfrage wird einmal frisch nachgeholt, nicht durch
jeden weiteren Tap erneut verworfen. Unveränderte Daten behalten DOM/Caches;
Abruffehler behalten die letzte Ansicht. Ein sich anschließender expliziter
Vordergrundaufruf hebt den stillen Modus auf (`_loadAllLeise`).

Kommen neue Daten, zeichnet `loadAll` zuerst und lässt den News-Generator
danach in einem Worker rechnen (`_storiesImWorker`, `29c-news-worker.js`):
derselbe ausgelieferte Code, vor ihm eine Attrappe für DOM und Speicher. Kalt
rechnet er an den Fixtures mit vierfach gedrosselter CPU rund eine Sekunde am
Stück; auf dem Hauptthread blieb in dieser Sekunde jedes Tippen liegen. Der
Worker lebt die Sitzung lang und bekommt den Datenstand nur, wenn sich
`players`, `matches`, `cfg`, `seasons` oder `_cache.version` geändert haben
(`_storyWorkerStand`), den Story-Bestand jedes Mal — so trifft sein Memo genau
dann, wenn er auf dem Hauptthread getroffen hätte. Hat sich der Stand während
der Rechnung geändert, gilt die Antwort nicht. Ohne Worker, ohne Skripttext,
bei einem Fehler oder nach zwanzig Sekunden ohne Antwort (`STORY_WORKER_MS`)
rechnet der Hauptthread wie zuvor, in einem ruhigen Moment (`_leerlauf`,
höchstens anderthalb Sekunden später); nach einem Fehlschlag bleibt der
Worker für die Sitzung aus. `tests/start` hält Worker und Hauptthread
aneinander, `tests/ambient` sieht nach, dass der Generator nicht im selben
Aufruf wie das Zeichnen läuft.

`_tickDaten` lässt außerdem ein offenes Blatt, den Eingabe-Tab und die
Einstellungen in Ruhe:
was man gerade unter den Fingern hat, wird nicht neu gezeichnet. `tests/blatt`
und `tests/bedienung` messen diese Bedingungen.

> **Pflegepflicht.** Kommt ein Zeitgeber dazu oder ändert seine Bedingung,
> steht das hier.
