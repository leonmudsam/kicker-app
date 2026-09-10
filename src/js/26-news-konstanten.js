// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  §11  LIGA NEWS / STORY-SYSTEM                                        ║
// ║  ───────────────────────────────────────────────────────────────────  ║
// ║  Erzeugt redaktionelle "Schlagzeilen" aus bestehenden Liga-Daten.     ║
// ║  KEINE neuen Berechnungen — nur Interpretation existierender Caches.  ║
// ║                                                                       ║
// ║   §11.1  Story-Generator (alle Typen)                                 ║
// ║   §11.2  Cache (versionsgebunden an matches.length + _cache.version)  ║
// ║   §11.3  LocalStorage (Read-State, Ring-Buffer max 200)               ║
// ║   §11.4  Header-Badge-Refresh                                         ║
// ║   §11.5  Mini-Popup (newsPopover)                                     ║
// ║   §11.6  Voller Feed mit Filter (newsFeedFull)                        ║
// ║   §11.7  Story-Detail (newsDetail) — dynamisch je Typ                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ─── §11.0 — Konstanten ──────────────────────────────────────────────
// News-Debug-Flag (v8.4): hält console-Logs des News-Systems aus der
// Produktiv-Konsole heraus. Standard: aus. Zur Laufzeit aktivierbar über
// DevTools — KEIN Reload nötig:  window.NEWS_DEBUG = true
// Alle News-Logs laufen über `if(NEWS_DEBUG || window.NEWS_DEBUG) console…`.
const NEWS_DEBUG = false;

// Kategorien (Filter-Pills + CSS-Klassen über `nv-cat-${cat}`).
// label = Anzeige im Filter; descLabel = im Detail- und Story-Header.
const NEWS_CATEGORIES = {
  // v9: „Breaking" ist KEIN eigener Generator-Typ, sondern eine ANZEIGE-Kategorie.
  // _isBreaking() promotet die ultra-seltenen, liga-relevanten Ereignisse
  // (neuer Spitzenreiter, Platz-1-Duell, legendäres Badge, Saison-Klimax)
  // display-seitig hierher — wirkt auf bestehende UND neue persistierte Rows.
  breaking:   {label:'Breaking',    descLabel:'Breaking News',    ic:'bolt'},
  highlight:  {label:'Highlights',  descLabel:'Highlight',        ic:'crown'},
  season:     {label:'Saison',      descLabel:'Saison',           ic:'rocket'},
  badge:      {label:'Awards',      descLabel:'Badge & Awards',   ic:'medalTrio'},
  fun:        {label:'Fun Facts',   descLabel:'Fun Fact',         ic:'thriller'},
  rivalry:    {label:'Rivalität',   descLabel:'Rivalität',        ic:'crossedSwords'},
  team:       {label:'Teams',       descLabel:'Team',             ic:'users'},
  comeback:   {label:'Comebacks',   descLabel:'Comeback',         ic:'comeback'},
  // „Persönlich" hieß nie „deins" — die App kennt keine Spielerzuordnung,
  // jeder sieht alles. Die Kategorie sammelt, was ein Einzelner erreicht hat:
  // 300 Elo geknackt, eine Bestmarke gesetzt. „Spielerzahl" stand als
  // Kartenaufschrift über „Maxi knackt 300 Elo" und las sich, als ginge es
  // um die Anzahl der Spieler.
  personal:   {label:'Spieler',     descLabel:'Meilenstein',      ic:'trendUp'},
  history:    {label:'Historie',    descLabel:'Historie',         ic:'calendar'},
  // Alles, was auf der Ewigen Tafel steht: Liga-Rekorde, Fügungen [§C35],
  // Monatschroniken und die Insignium-Stufen. Der ganze Awards-Reiter kam im
  // Feed nicht vor — wer einen Rekord übernahm, erfuhr es nur, wenn er
  // selbst nachsah.
  tafel:      {label:'Tafel',       descLabel:'Ewige Tafel',      ic:'trophyStar'},
  misfortune: {label:'Pechvogel',   descLabel:'Pechvogel',        ic:'dramaTear'},
};

// LocalStorage-Keys (versioniert für künftige Migrations)
const NEWS_LS_SEEN  = 'eso_news_seen_v1';
const NEWS_LS_TOAST = 'eso_news_toast_v1';  // v8.1: zeitstempel + count des letzten Toasts
const NEWS_LS_MAX_SEEN = 200; // Ring-Buffer-Limit
const NEWS_TOAST_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h zwischen identischen Toast-Counts

// Generator-Limits — Schutz gegen zu viele Stories pro Typ
const NEWS_LIMITS = {
  // v9.4: bewusst kleiner → weniger News-Flut direkt nach Matches.
  topForm: 2,       // max Spieler "in Top-Form" gleichzeitig
  lossStreak: 2,
  jubilee: 3,
  badgeUnlocked: 6, // letzte N freigeschalteten Badges
  // Zwei Rivalitätskarten mit derselben Schlagzeile und einer anderen Zahl
  // sind kein Paar, sondern eine Wiederholung. Es bleibt die mit den meisten
  // Duellen.
  rivalry: 1,
  // Meilensteine eines Paares (50., 100., …). Über die Ligageschichte reißen
  // viele Paare eine Schwelle; gemeldet werden die jüngsten. Gemessen wurden
  // sechzehn gebildet und persistiert, von denen zwei im Feed standen.
  rivalryMarke: 4,
  // „X baut seinen Rekord aus" ist die schwächste der drei Rekordmeldungen —
  // gewechselt hat nichts. Zwei davon reichen; „geholt" und „erstmals
  // vergeben" sind ungedeckelt, weil sie selten sind und wirklich etwas sagen.
  rekordAusbau: 2,
  // Ein Tag trägt sechs Karten. Gemessen trug ein Spieltag neun, und die
  // schwächsten drei waren ein Elo-Ausschlag, eine Auszeichnung und ein Fun
  // Fact — Zeilen, die niemand vermisst. Breaking zählt nicht mit [§C33].
  // Ein starker Spieltag verschiebt mehrere Monatschroniken gleichzeitig.
  // Gemeldet werden die zwei wertvollsten; der Rest steht am Monatsende in
  // der Monatskarte, die es ohnehin gibt.
  chronikGeholt: 2,
  proTag: 6,
  // Ab wann die Karte des Tages steht [§C33]. Gemessen ueber 56 Spieltage:
  // Median 9 Partien, oberes Viertel 10 — acht Partien trifft 64 % aller
  // Spieltage, und dort ist der Tag praktisch gelaufen. Die kuerzeren Tage
  // faengt die Stunde auf: keine der 466 Partien hat nach 18:31 angefangen,
  // und der Fun Fact dieses Slots fällt an einem Spieltag ohnehin weg.
  tagKartePartien: 8,
  tagKarteStunde: 19,
  // Dieselbe Aussage über dieselben Leute kommt drei Tage lang nur einmal.
  // „Martin baut ‚Der Maßstab' aus" gilt nach jedem gewonnenen Spiel aufs
  // Neue, jedes Mal mit einem Prozentpunkt mehr: die ID ist damit eine andere,
  // die Karte für den, der scrollt, dieselbe. Gemessen standen an vier
  // aufeinanderfolgenden Spieltagen vier davon im Feed. Drei Tage, weil die
  // Liga an zwei bis drei Tagen der Woche spielt und die Meldung damit
  // höchstens einmal je Spielwoche wiederkommt.
  sperreTage: 3,
  total: 50,        // harte Obergrenze des Feeds (nach Prio-Filter)
};

// ─── §11.0b — Wann jemand über sich hinauswächst ─────────────────────
// Die Form-Karte maß das NIVEAU: neun von zehn gewonnen. Gemessen über die
// ganze Ligageschichte traf sie damit vier Spieler, und einer davon zehn der
// siebzehn Male — wer die Quote gewinnt, gewinnt sie eben immer wieder. Für
// alle anderen war die Karte unerreichbar, und eine Nachricht, die nur die
// besten Vier je nennen kann, ist eine Bestenliste [§C38].
//
// Gemessen wird deshalb der ABSTAND ZUM EIGENEN Schnitt — dieselbe Frage,
// mit der die Monatschronik die Mitte des Feldes erreicht [§C38]. Dieselbe
// Schwelle trifft damit sieben Spieler statt vier, darunter die untere
// Hälfte der Siegquote.
//
// Das Fenster sind zehn Partien — dasselbe, das `_newsRecentForm` und der
// Formstreifen im Profil zeigen [§C27]. Der Vergleichswert ist die Laufbahn
// DAVOR: nähme man die ganze Laufbahn einschließlich der zehn, verglichen
// sich die Partien mit sich selbst und der Abstand schrumpfte, je weniger
// jemand gespielt hat.
//
// 25 Prozentpunkte sind an den echten Partien geeicht, nicht geschätzt:
// gemessen fällt die Karte 0,46 mal je Spieltag. Bei 20 wären es 0,63 und
// bei 30 nur noch 0,25 — dann steht sie an drei von vier Spieltagen nicht.
const FORM_FENSTER = 10;
const FORM_BASIS_MIN = 8;    // so viele Partien braucht der Vergleichswert
const FORM_VORSPRUNG = 0.25; // Anteilspunkte über dem eigenen Schnitt

// ─── §11.0a — Die eine Rangfolge ─────────────────────────────────────
// `prio` sagt, wie stark eine Karte ist. Der Tagesdeckel behält danach die
// stärksten sechs [§C33], und die Sammelkarte wählt danach ihren Kopf —
// beides sind VERGLEICHE, und ein Vergleich braucht EINE Skala.
//
// Es waren zwei. Die Spieltags-Karten standen seit jeher auf 1 bis 10, und
// als die Ewige Tafel dazukam, bekam sie 70 bis 95 — jede für sich richtig
// einsortiert, nur nie gegeneinander. Damit gewann jede Tafel-Karte gegen
// jede Spieltags-Karte, bevor der Deckel überhaupt hinsah. Gemessen über
// 56 Spieltage: die Ewige Tafel bekam 66 % aller Tagesplätze, und von den
// Karten, die der Generator zum Spieltag selbst bildete, fielen 70 % der
// laufenden Siegesserien, 83 % der Pleitenserien, 83 % der Serienbrecher
// und 67 % der Top-Form-Karten weg — während jede einzelne Insignium-Stufe
// (183 Stück), jeder Rekordwechsel (88) und jede Monatschronik (98) durchkam.
// Wer die App nach einem Spieltag öffnete, las von allem außer vom Spieltag.
//
// Die Zahlen stehen deshalb hier an EINER Stelle und nicht mehr als Literal
// im Generator. Verteilt über 1900 Zeilen ist die zweite Skala genau der
// Fehler, den niemand sieht.
//
// Drei Bänder, und die Grenze dazwischen ist eine Frage:
//
//   90+   BREAKING — das gab es so noch nie [§C33]. Zählt ohnehin nicht
//         gegen den Tagesdeckel, steht aber auch oben.
//   38-89 DER SPIELTAG — das haben DIESE Partien hergegeben. Gestern hätte
//         es die Karte nicht gegeben: eine Serie, die heute weitergewachsen
//         ist, ein Meilenstein, der heute gerissen wurde, ein Rekord, der
//         heute den Halter gewechselt hat.
//   10-37 DER HINTERGRUND — gilt heute und galt gestern schon: ein Zähler,
//         der schon lange steht, ein Countdown, eine Bilanz über Monate.
//
// Die Grenze ist bewusst diese Frage und nicht „positiv oder negativ": eine
// laufende Pleitenserie ist genauso ein Ergebnis dieses Spieltags wie eine
// Siegesserie, und als Hintergrund einsortiert fiel sie an JEDEM ihrer zwölf
// Tage aus dem Feed. Dass die Siegesserie trotzdem darüber steht, ist die
// Rangfolge innerhalb des Bandes, nicht ein eigenes Band.
//
//
// Abstufungen INNERHALB eines Typs (eine 12er-Serie wiegt schwerer als eine
// 5er) bleiben ein Zuschlag auf den Grundwert. Der Zuschlag darf sein Band
// verlassen, wo der Typ das auch darf: eine legendäre Auszeichnung und die
// beiden obersten Insignium-Stufen sind Breaking [§C33].
const STORY_PRIO = {
  // ── Breaking ──
  rekord_erstmals:   96,   // ein Liga-Rekord wird zum ersten Mal vergeben
  elo_record:        95,
  streak_record:     94,
  lead_change:       93,
  season_recap:      92,   // der Meister steht fest
  // badge_unlocked und insignium_stufe erreichen das Band über ihren
  // Zuschlag, weil nur ein Teil ihrer Fälle Breaking ist.

  // ── Der Spieltag ──
  // Die Reihenfolge darin: erst, was die ganze Liga betrifft, dann die
  // Seltenheit. Gemessen an den echten Partien fällt eine Insignium-Stufe
  // 3,3 mal je Spieltag und eine Auszeichnung 2,8 mal, ein Serienbrecher
  // 0,3 mal und ein Sprung über den eigenen Schnitt 0,4 mal — die seltene
  // Karte steht deshalb über der häufigen. Drei Plätze sind davon
  // ausgenommen und stehen fest: der Sieger des Spieltags oben, und an der
  // Ewigen Tafel der übernommene Liga-Rekord über der Monatschronik über
  // der Insignium-Stufe [§C33].
  // Die beiden zusammenführenden Karten sind eine eigene Nachricht und keine
  // Zusammenfassung [§C33] — sie erben deshalb nicht den Rang ihres Kopfs.
  // „Zwei Spieler erreichen dieselbe Stufe im selben Moment" wiegt mehr als
  // eine einzelne Stufe, und mit dem geerbten Rang fiel die Karte an ihrem
  // eigenen Spieltag unter den Deckel.
  sammel_erfolg:     66,
  sammel_spieler:    66,
  potd:              88,   // der Sieger des Spieltags IST seine Schlagzeile
  chronik_monat:     86,
  woche:             84,
  chronik_erstling:  80,   // zum ersten Mal überhaupt in der Chronik
  rekord_geholt:     76,
  giant_slayer:      74,
  top_clash:         72,
  streak_killer:     70,
  win_streak:        68,
  loss_streak:       66,
  top_form:          64,   // weiter vorn als sonst [§11.0b]
  chronik_geholt:    62,
  team_streak:       60,
  insignium_stufe:   58,
  badge_unlocked:    54,
  team_loss_streak:  52,
  milestone_wins:    48,
  milestone_elo:     48,
  milestone_goals:   46,
  jubilee:           44,
  rivalry_milestone: 42,
  rekord_gesteigert: 40,   // ausbauen ist die schwächste der drei Meldungen
  elo_swing:         38,

  // ── Der Hintergrund ──
  rivalry:           30,   // ein Zähler, der seit fünfzig Duellen steht
  season_endgame:    22,   // ein Countdown, kein Ereignis
  season_start:      20,
  dry_spell:         16,
  quiet_week:        14,
  // Der Fun Fact fällt an einem lauten Tag ohnehin weg [§C33]; steht er,
  // dann weil sonst nichts da ist.
  ambient:            8,
};
// Der Zuschlag eines ambienten Templates liegt bei 2 bis 7 und ist nur
// INNERHALB des Fun-Fact-Topfs eine Rangfolge — er darf das Band nicht
// verlassen, sonst stünde ein Fun Fact über einer Pleitenserie.
const AMBIENT_PRIO_SPANNE = 7;

// Ambiente Fun-Fact-Stories (v8.5, v9.5) — Fun Facts / persönliche Nuggets,
// damit der Feed auch ohne neue Matches lebt.
//   RHYTHMUS (v9.7): TÄGLICH zwei Fun Facts — um 10:00 (Vormittag) und um
//                    19:00 (Feierabend). Früher (v9.6) nur abends einer.
//                    _isAmbientDay ist immer true → jeder Tag hat die Slots.
//   AMBIENT_SLOTS  = die Slot-Stunden; je Slot erscheint eine eigene Story,
//                    jeweils erst ab dieser Uhrzeit.
//   Anti-Spam:     IDs sind tages+stunden-deterministisch (`ambient_<datum>_<stunde>`)
//                  → ON CONFLICT DO NOTHING → keine Doppel über Geräte/Syncs.
//                  Die beiden Slots eines Tages zeigen nie denselben Typ.
//   Auswahl:       tages-seeded gezogen (Pseudo-Zufall, überall identisch) plus
//                  COOLDOWN: zuletzt (letzte AMBIENT_COOLDOWN_DAYS Tage)
//                  verwendete Fun-Fact-Typen werden gesperrt → Rotation statt
//                  vorhersehbarer Reihenfolge, keine schnellen Wiederholungen.
const AMBIENT_SLOTS = [10, 19];
// Ab dieser Stunde gilt ein Slot als Abend-Slot und fällt an Spieltagen aus.
// Der Vormittags-Slot bleibt täglich: keine der Partien hat vor 10 Uhr
// angefangen, er steht also immer vor dem Spieltag statt mittendrin.
const AMBIENT_ABEND_AB = 19;

// Die zwei Slots haben verschiedene Blickrichtungen. Vorher zogen beide aus
// demselben Topf und der Feed las sich morgens wie abends — dieselbe Sorte
// Zahl, nur ein anderer Kopf.
//
//   10:00 „Der Stand"      — nach vorn: was gerade offen ist, wer wie weit
//                            weg ist, was man heute noch holen kann.
//   19:00 „Die Geschichte" — zurück: Langzeitdaten, Jahrestage, Rekorde,
//                            Rivalitäten, was einmal war.
//
// Ohne Eintrag darf ein Template in beide Slots. Die Zuordnung ist ein
// Vorzug, kein Verbot: findet ein Slot nichts Passendes, greift er im
// letzten Durchgang auf den ganzen Topf zurück, statt leer auszugehen.
const AMBIENT_SLOT_ROLLE = {
  // Der Stand — nach vorn
  form_best_wr:'stand', form_striker:'stand', form_defender:'stand',
  form_clutch:'stand', form_close_wins:'stand', form_most_active:'stand',
  award_potd_leader:'stand', award_potw_leader:'stand', award_gold_leader:'stand',
  award_total_leader:'stand', fun_award_leader:'stand', fun_leader:'stand',
  fun_top_scorer:'stand', season_title_race:'stand',
  personal_wr:'stand', personal_streak:'stand', personal_scorer:'stand',
  prestige_fuehrung:'stand', prestige_schwelle:'stand', prestige_schritt:'stand',

  // Die Geschichte — zurück
  history_age:'geschichte', fun_biggest_win:'geschichte', fun_busiest_day:'geschichte',
  fun_team_record:'geschichte', fun_goals:'geschichte', rivalry_most:'geschichte',
  rivalry_close:'geschichte', chronicle_spotlight:'geschichte',
  award_latest_gold:'geschichte', personal_favourite_opp:'geschichte',
  personal_best_mate:'geschichte', personal_position:'geschichte',
  personal_grinder:'geschichte', insignium_stand:'geschichte', titelband_stand:'geschichte',
};
function _ambientRolleVon(key){ return AMBIENT_SLOT_ROLLE[key] || null; }
function _ambientRolleFuerSlot(stunde){ return stunde < 15 ? 'stand' : 'geschichte'; }
// v9.18: Wie viele Tage zurück verpasste Slots nachgetragen werden. Ein Slot
// entstand bisher nur, wenn jemand die App zwischen seiner Uhrzeit und
// Mitternacht geöffnet hat — wer abends nicht reinschaut, verlor den 19-Uhr-Slot
// endgültig. Drei Tage sind der Kompromiss: Löcher im Feed verschwinden, aber
// die Fun Facts (die aus den HEUTIGEN Zahlen entstehen) bleiben nah genug am
// Zeitpunkt, den sie behaupten.
const AMBIENT_BACKFILL_DAYS = 3;
// Cooldown-Fenster (Tage): so lange wird ein bereits gezeigter Fun-Fact-Typ
// nicht erneut gewählt. Bei 2 Fun Facts / Tag sperrt das die letzten ~14 Typen
// (der Pool hat 18) → genug Rotation, keine schnellen Wiederholungen.
const AMBIENT_COOLDOWN_DAYS = 7;
// v9.14: Spieler-Cooldown (Tage). Der Typ-Cooldown verhindert nur gleiche
// TYPEN — bei einem dominanten Spieler zeigen aber viele VERSCHIEDENE
// Superlative (Sturm-Chef, Elo-Leader, Torschützenkönig …) auf denselben Kopf,
// sodass tagelang derselbe Name erscheint. Ein zuletzt gefeierter Spieler wird
// darum für dieses Fenster gemieden (Notnagel-Pass erlaubt ihn nur, wenn sonst
// kein Template Daten liefert) → echte Namens-Rotation.
const AMBIENT_PLAYER_COOLDOWN_DAYS = 2;
// Derselbe Fun Fact über dieselbe Person höchstens einmal im Monat. Der
// Typ-Cooldown (7 Tage) und der Spieler-Cooldown (2 Tage) verhindern diese
// Kombination nicht: gemessen über 40 Tage wiederholten sich elf Typ-Person-
// Paare, „kurz vor dem Schildring: Johannes" allein fünfmal. Die Führungs-
// Typen zeigen strukturell immer auf denselben Kopf, deshalb muss das Paar
// gesperrt werden und nicht nur der Typ.
const AMBIENT_PAAR_COOLDOWN_DAYS = 30;
// Auto-Sync-Intervall, damit neue Slots ohne Reload auftauchen (ms).
const NEWS_AUTOSYNC_MS = 10 * 60 * 1000;

// ─── §11.0b — Badge-Whitelist (v8.1) ─────────────────────────────────
// Nur seltene & besondere Badges erzeugen News. Common-Badges sind in der
// Liga zu häufig und würden den Feed verstopfen ("Achievement-Spam").
// Negative: nur die wirklich krassen (perfect_loss, mr_disaster, nemesis),
// nicht die alltäglichen wie bitter_loss/krimi_loser.
//
// PFLEGEHINWEIS: bei neuen Badges (§7.1) hier ergänzen, wenn sie als News
// auftauchen sollen. Default: nicht-newsworthy (bewusste Entscheidung).
const NEWS_BADGE_WHITELIST = new Set([
  // Legendary — alle 10 sind News-würdig
  'dynasty_600','dominator_400','award_collector','perfect_win','streak15','streak20',
  'untouchable','mr_perfect','allwetter','godly_streak',
  // Rare — kuratierte Auswahl: nur die mit besonderer Story
  'wall_badge','upset_king','unbeatable','streak10','vice_champion','potw','krimi',
  'games150', // "Legende" (150 Matches) — Karriere-Meilenstein, v8.6 ergänzt
  // Negative — nur die seltenen, "krassen" Niederlagen
  'mr_disaster','nemesis','perfect_loss',
  // v9.5: explizit als News gewünscht (negativ, aber „immer newsworthy")
  'krimi_loser', // Krimi-Versager — 3 knappe Niederlagen in Folge
  'losing5',     // Losing Streak — 5 Niederlagen in Folge
  // Hinweis: Die gewünschten POSITIVEN Auszeichnungen (Nerven aus Stahl,
  // Wiederholungstäter, Krimi-Reihe, 10er Serie) sind bereits 'rare' und
  // laufen daher ohnehin über die generische Badge-News-Regel unten.
]);

