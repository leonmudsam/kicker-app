// ╔═══ §13 ─── DISZIPLINEN: MONATSTAFEL & LIGA-REKORDE ─────────────────╗
//     Eine Liga misst dieselben Dinge auf zwei Zeitachsen: Wer war diesen
//     Monat der Beste darin — und wer war es je. Früher waren das zwei
//     Kataloge, und achtzehnmal stand derselbe Gedanke in beiden: „Der
//     Vollstrecker" maß den Anteil 10:0-Siege für einen Monat, „Der Henker"
//     denselben Anteil für die Laufbahn. Zwei Namen, zwei Icons, im Profil
//     zwei Zeilen mit derselben Aussage.
//
//     Es gibt deshalb nur noch EINEN Katalog: DISZIPLINEN [§13.1]. Jede
//     Disziplin hat höchstens eine `monat`- und höchstens eine `allzeit`-
//     Wertung, und beide messen dieselbe Größe.
//
//     Architektur:
//       DISZIPLINEN[]        — der eine Katalog [§13.1]
//       SEASON_TITLES[]      — daraus abgeleitet, die Monatswertungen [§13.1]
//       CHRONICLES[]         — daraus abgeleitet, die Allzeitwertungen [§13.4b]
//       _seasonTitleCtx(sid) — EIN Durchlauf über die Saison-Matches [§13.2]
//       seasonTitles(sid)    — Vergabe, memoisiert [§13.3]
//       _freezeSeasonTitles  — abgeschlossene Saison in seasons.titles [§13.3a]
//       seasonTitleHistory(pid) — Titel-Historie eines Spielers [§13.4]
//       _chronicleCtx()      — EIN Durchlauf über ALLE Matches [§13.4b]
//       allChronicles()      — Vergabe für die ganze Liga [§13.4b]
//       UI: showSeasonTable / showLigaChronik / showChronicle [§13.5]
//       Marken neben dem Namen [§13.6], Avatar-Status-Ring [§13.7]
//
//     KEINE zweite Rechenquelle: Elo kommt aus getGlobalSim (seasonEndElos
//     für abgeschlossene, elo für die laufende Saison), Matches aus
//     matchesInSeason(). Damit kann die Tafel nicht von der Rangliste
//     abweichen.
//
//     GERECHNET WIRD NUR DIE LAUFENDE SAISON. Sobald ein Monat archiviert
//     ist, steht seine Tafel in seasons.titles und wird von dort gelesen
//     [§13.3a] — vollständig, mit Name, Icon, Ton und Beleg. Eine Disziplin
//     zu streichen verändert deshalb nur die Zukunft; alte Monate zeigen
//     weiter, was damals galt, auch wenn es den Eintrag heute nicht mehr gibt.
//
//     ⚑ HOTSPOT — neue Disziplinen brauchen (vollständig: CLAUDE.md §10.2):
//       - Eintrag in DISZIPLINEN [§13.1] an der richtigen Stelle im Block
//       - ein neues Feld in BEIDEN Kontext-Pässen, [§13.2] für `monat` und
//         [§13.4b] für `allzeit`. Nur einer davon ist der häufigste Fehler:
//         die Monatstafel zeigt den Eintrag, der Liga-Rekord bleibt leer
//       - `art` setzen — sie steuert den Prestige-Wert [§13.8], und ein
//         neuer Eintrag verschiebt die Insignium-Leiter mit
//
//     LEISTUNG VOR EREIGNIS VOR SCHATTEN — die Reihenfolge im Katalog:
//       Vorn steht, was eine QUOTE misst und eine niedrige Einstiegshürde
//       hat: Wer nur an zwei Abenden im Monat spielt, soll dieselbe Chance
//       haben wie der Vielspieler. Dahinter kommt, was einmalig passiert
//       ist, ganz hinten die Schattenseiten. Weil jeder Spieler nur EINEN
//       Monatseintrag trägt und `byPid` den ersten Treffer als seinen
//       wertvollsten zeigt, entscheidet diese Reihenfolge, was jemand vorn
//       im Profil sieht.
//
//     KEIN PENSUM MEHR: Einträge, die nur die Spielzahl maßen — Rekord-
//     sieger, Torfabrik, Dauerbrenner, Marathonmann, Unermüdlicher,
//     Allgegenwärtiger, Immerdabei, Malocher, Gründervater, Veteran,
//     längster Tag, Nachtschwärmer, Frühaufsteher — sind gestrichen. Wer
//     oft spielt, sammelt dadurch schon mehr Gelegenheiten; er musste dafür
//     nicht zusätzlich ausgezeichnet werden.
//
//     KEINE VERBINDUNGEN: Es gibt keine Einträge, die ein DUO beschreiben.
//     Wer sie hielt, hatte sie halb dem anderen zu verdanken, und dieselbe
//     Zeile stand am Ende bei zwei Leuten im Profil. Was ein Partner
//     auslöst, wird nur als EIGENE Leistung gemessen — „Der Katalysator"
//     zählt, wie viel besser die anderen neben ihm sind, und nennt dabei
//     keinen Namen.
//
//     JEDER EINTRAG IST EIN BESTWERT [§C32]. Er geht an den, der ihn in
//     diesem Monat wirklich hält — oder an niemanden. Früher durften die
//     meisten Einträge weiterrutschen, wenn der Beste schon etwas trug;
//     dann stand „Der Unaufhaltsame" bei zwölf Siegen in Folge, während
//     einer mit dreizehn danebensaß. Deshalb darf eine Bedingung jetzt
//     auch einen Superlativ nennen. Die Schwellen in den Bedingungen
//     („ab 10 Spielen") bleiben, aber als Zulassung, nicht als Vergabe:
//     sie sagen, wer überhaupt mitzählt.
//
//     DER MEISTER ist KEINE Disziplin. Er ging per Definition an Platz 1
//     der Saison-Elo und sagte damit nichts, was die Rangliste nicht schon
//     zeigt. Er kommt direkt aus seasonChampion() und steht als Krone neben
//     dem Namen. Die Tafel ist für das da, was man an der Tabelle NICHT
//     ablesen kann.
// ╚═════════════════════════════════════════════════════════════════════════╝

// Farbwelt der Titel — greift die Rarity-Töne der Badges auf, damit sich
// Tafel, Profil und Rangliste gleich anfühlen.
const TITLE_TONES = {
  gold:   {c:'var(--gold)',   rgb:'247,207,74'},
  silver: {c:'#c3ced9',       rgb:'154,167,181'},
  acid:   {c:'var(--acid)',   rgb:'190,242,100'},
  blue:   {c:'var(--blue)',   rgb:'86,180,232'},
  orange: {c:'var(--orange)', rgb:'255,120,73'},
  purple: {c:'var(--purple)', rgb:'167,139,250'},
  red:    {c:'var(--red)',    rgb:'240,86,106'},
};
function titleTone(tone){ return TITLE_TONES[tone] || TITLE_TONES.acid; }

// Mindest-Spiele, damit ein Spieler in einer Saison überhaupt gewertet wird.
// Wer drei Spiele mitgenommen hat, soll keinen Saisontitel gewinnen können.
const TITLE_MIN_GAMES = 8;

// ─── §13.1 Der Disziplinen-Katalog ───────────────────────────────────
// EIN Eintrag, ZWEI Wertungen. Vorher standen dieselben Gedanken zweimal
// im System: „Der Vollstrecker" maß den Anteil 10:0-Siege für einen Monat,
// „Der Henker" denselben Anteil für die Laufbahn. Achtzehnmal dasselbe
// Muster, zwei Namen, zwei Icons, zwei Schwellen — und im Profil zwei
// Zeilen, die dasselbe sagten.
//
// Eine Disziplin hat deshalb höchstens eine `monat`- und höchstens eine
// `allzeit`-Wertung. Beide messen DIESELBE Größe, nur auf verschiedenen
// Zeitachsen, und sie teilen sich Name, Icon und Ton. Wer eine Doppelung
// bauen will, muss dafür jetzt einen zweiten Eintrag anlegen — und sieht
// dabei, dass er es tut.
//
//   monat   → Saison-Tafel. pick(C, taken) liefert {pid, ev} oder null.
//             Ein Eintrag pro Spieler, Reihenfolge = Vergabe-Reihenfolge.
//   allzeit → Liga-Rekord. val(p, C) oder raw(p, C)+min liefert die Zahl,
//             den Bestwert halten alle, die ihn erreichen.
//
// `art` steuert, was ein Eintrag für das Prestige wert ist [§13.8]:
//   leistung — eine Quote, ein Können. Zählt doppelt.
//   ereignis — etwas ist passiert, oft einmalig. Zählt einfach.
//   schatten — die Kehrseite. Zählt nicht, verschwindet aber auch nicht.
// Es gibt keine `pensum`-Art mehr: Einträge, die nur die Spielzahl maßen
// (Rekordsieger, Torfabrik, Dauerbrenner, Marathonmann, Unermüdlicher,
// Allgegenwärtiger, Immerdabei, Malocher, Gründervater, Veteran, längster
// Tag, Nachtschwärmer, Frühaufsteher …) sind ersatzlos gestrichen. Wer
// oft spielt, sammelt dadurch schon mehr Gelegenheiten; er musste dafür
// nicht zusätzlich ausgezeichnet werden.
//
// REIHENFOLGE gilt für BEIDE Wertungen: Leistung vor Ereignis vor
// Schatten, innerhalb der Blöcke selten vor häufig. Sie entscheidet in
// der Monatstafel, wer zuerst zugreift, und im Profil, welche Zeile oben
// steht.
//
// Sie entscheidet NICHT mehr, wer zuerst zugreift: das tut der Vorsprung
// [§C32]. Wer mehrere Bestwerte hält, trägt den, bei dem er am
// deutlichsten vorn liegt.
//
// Ein Monat mit weniger als CHRONIK_MIN_TAGE Spieltagen bekommt gar keine
// Chronik: aus drei Abenden lässt sich kein Monat ablesen, und eine
// Siegquote aus zwölf Spielen ist ein Zufall, kein Maßstab.
const CHRONIK_MIN_TAGE = 5;

const DISZIPLINEN = [

  // ══ LEISTUNG ══════════════════════════════════════════════════════
  // Quoten und Können. Wer nur an zwei Abenden im Monat spielt, kann
  // jeden dieser Einträge genauso holen wie der Vielspieler.

  {id:'harterweg', name:'Der harte Weg', short:'Harter Weg', ic:'weight', tone:'gold', art:'leistung',
    monat:{
      wie:'Die Elo-Rechnung gibt jeder Partie vorab eine Siegchance. Gemittelt über den Monat sagt sie, wie schwer die Gegner waren.',
      cond:'Im Schnitt unter 45 % Siegchance und trotzdem mehr Siege als Niederlagen, ab 20 Partien',
            ...(_stWertung(p=>p.games>=20 && p.wins>p.losses, p=>0.45 - p.expSum/p.games, 0,
        (p)=>`Ø ${Math.round(p.expSum/p.games*100)} % Siegchance · ${p.wins}:${p.losses}`))}},

  {id:'uebersoll', name:'Das Übersoll', short:'Übersoll', ic:'trendUp', tone:'gold', art:'leistung',
    monat:{
      wie:'Die Siegquote minus der Siegchance, die die Elo-Rechnung vorab ausgewiesen hat. Ein Prozentpunkt ist ein Prozentpunkt Siegquote, nicht Elo und nicht Prestige.',
      cond:'Mindestens 12 Prozentpunkte über der eigenen Elo-Erwartung, ab 20 Partien',
            ...(_stWertung(p=>p.games>=20, p=>p.wins/p.games - p.expSum/p.games, 0.12,
        (p,v)=>`+${Math.round(v*100)} %-Punkte über der Erwartung · ${p.games} Partien`))}},

  {id:'keinpflicht', name:'Kein geschenkter Sieg', short:'Erkämpft', ic:'giantSlayer', tone:'acid', art:'leistung',
    monat:{
      wie:'Ein Sieg gegen die Rechnung ist einer aus einer Partie mit unter 50 % Siegchance vorab.',
      cond:'Mindestens die Hälfte aller Siege gegen die Rechnung geholt, ab 15 Siegen',
            ...(_stWertung(p=>p.wins>=15, p=>p.favW/p.wins, 0.50,
        (p)=>`${p.favW} der ${p.wins} Siege waren keine Pflichtsiege`))}},

  {id:'spaetform', name:'Die Spätform', short:'Spätform', ic:'flameDouble', tone:'purple', art:'leistung',
    monat:{
      wie:'Verglichen werden zwei Siegquoten desselben Spielers: die ab der sechsten Partie eines Tages gegen die der ersten drei. Die Differenz steht in Prozentpunkten.',
      cond:'Ab der 6. Partie eines Tages mindestens 18 Prozentpunkte stärker als in den ersten drei',
            ...(_stWertung(p=>p.spaetG>=8 && p.fruehG>=8, p=>p.spaetW/p.spaetG - p.fruehW/p.fruehG, 0.18,
        (p,v)=>`+${Math.round(v*100)} %-Punkte ab der 6. Partie · ${p.spaetW} von ${p.spaetG}`))}},

  {id:'trotzig', name:'Der Trotzige', short:'Trotzdem', ic:'unstoppable', tone:'acid', art:'leistung',
    monat:{
      wie:'Außenseiter heißt: die Elo-Rechnung wies vorab unter 50 % Siegchance aus. Gezählt wird, wie viele dieser Partien trotzdem gewonnen wurden.',
      cond:'Mindestens 45 % der Partien als Außenseiter gewonnen, ab 15 solchen Partien',
            ...(_stWertung(p=>p.favG>=15, p=>p.favW/p.favG, 0.45,
        (p)=>`${p.favW} von ${p.favG} Partien als Außenseiter gewonnen`))}},

  {id:'gegenoben', name:'Gegen die Besten', short:'Oben', ic:'temple', tone:'gold', art:'leistung',
    monat:{
      wie:'Die besten Drei sind die drei Ersten der Elo-Rangliste am Monatsende. Gezählt wird jede Partie gegen mindestens einen von ihnen.',
      cond:'Mindestens 60 % gegen die drei Ersten des Monats, ab 12 solchen Partien',
            ...(_stWertung(p=>p.vsTop3Games>=12, p=>p.vsTop3/p.vsTop3Games, 0.60,
        (p)=>`${p.vsTop3} von ${p.vsTop3Games} Partien gegen die besten Drei`))}},

  {id:'favoritenpflicht', name:'Die Favoritenpflicht', short:'Pflicht', ic:'trophyCheck', tone:'gold', art:'leistung',
    monat:{
      wie:'Favorit heißt: die Elo-Rechnung wies vorab mindestens 60 % Siegchance aus. Ein Patzer ist eine verlorene Favoritenpartie.',
      cond:'Als Favorit (ab 60 % Siegchance) mindestens 85 % geholt, ab 10 solchen Partien',
            ...(_stWertung(p=>p.favoritG>=10, p=>p.favoritW/p.favoritG, 0.85,
        (p)=>`${p.favoritW} von ${p.favoritG} Favoritenpartien · ${p.favoritG-p.favoritW} Patzer`))}},

  {id:'mitjedem', name:'Mit jedem', short:'Mit jedem', ic:'users', tone:'gold', art:'leistung',
    monat:{
      wie:'Von allen Partnern mit mindestens fünf gemeinsamen Spielen zählt der, neben dem es am schlechtesten lief, nicht der Schnitt.',
      cond:'Auch neben dem schwächsten Partner mindestens 50 %, ab 3 Partnern mit je 5 Spielen',
            ...(_stWertung(p=>p.partnerMin!=null, p=>p.partnerMin, 0.50,
        (p)=>`${p.partnerW} von ${p.partnerG} selbst neben ${pname(p.partnerX)} · ${p.partnerN} Partner`))}},

  {id:'gegenalle', name:'Gegen alle', short:'Gegen alle', ic:'target', tone:'gold', art:'leistung',
    monat:{
      wie:'Regelmäßig heißt: mindestens vier Duelle im Monat. Gegen jeden davon müssen mehr Siege als Niederlagen stehen.',
      cond:'Gegen jeden regelmäßigen Gegner mehr Siege als Niederlagen, ab 5 Gegnern mit je 4 Duellen',
            ...(_stWertung(p=>p.breiteOk===p.breiteN, p=>p.breiteN, 5,
        (p,v)=>`gegen alle ${v} regelmäßigen Gegner im Plus`))}},

  {id:'best_record', name:'Der Maßstab', short:'Maßstab', ic:'medal2', tone:'gold', art:'leistung',
    allzeit:{
      cond:'Höchste Siegquote, die je jemand in einem Monat gespielt hat, ab 15 Spielen',
      val:p => (p.bestMonth && p.bestMonth.q >= 0.60) ? p.bestMonth.q : null,
      ev:(p,v) => `${Math.round(v*100)} % aus ${p.bestMonth.g} Spielen`,
      zeit:p => p.bestMonth ? seasonLabel(p.bestMonth.sid) : ''}},

  {id:'daylord', name:'Der Platzhirsch', short:'Revier', ic:'dayKing', tone:'gold', art:'leistung',
    monat:{
      wie:'Player of the Day ist, wer an einem Spieltag die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Spieltagen.',
      cond:'An mindestens 35 % der eigenen Spieltage Player of the Day, ab 5 Spieltagen',
            ...(_stWertung(p=>p.days>=5, p=>p.potd/p.days, 0.35,
        (p,v)=>`Player of the Day an ${p.potd} der ${p.days} Spieltage · ${Math.round(v*100)} %`))},
    allzeit:{
      cond:'Höchster Anteil eigener Spieltage als Player of the Day, ab 12 Spieltagen und mindestens 25 %',
      val:p => (p.days >= 12 && p.potd/p.days >= 0.25) ? p.potd/p.days : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.days} Spieltage beherrscht · ${p.potd}× Player of the Day`}},

  // Dieselbe Frage wie beim Platzhirsch, eine Zeitebene hoeher — und dieselbe
  // Zeichnung wie die Wochenkoenig-Kachel im Awards-Reiter [§C27]: Player of
  // the Week ist dasselbe Ereignis, egal wo es steht. Nur `allzeit`: ein Monat
  // hat vier Wochen, und ein Anteil aus vier Werten misst nichts [§10.2].
  {id:'weeklord', name:'Der Wochenherr', short:'Wochenherr', ic:'weekKing', tone:'gold', art:'leistung',
    allzeit:{
      wie:'Player of the Week ist, wer in einer abgeschlossenen Woche die beste Siegquote hat, bei mindestens fünf Siegen. Gezählt wird der Anteil an den eigenen Spielwochen.',
      cond:'Höchster Anteil eigener Wochen als Player of the Week, ab 10 Wochen und mindestens 25 %',
      val:p => (p.weeks >= 10 && p.potw/p.weeks >= 0.25) ? p.potw/p.weeks : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.weeks} Wochen gewonnen · ${p.potw}× Player of the Week`}},

  {id:'reliable', name:'Der Verlässliche', short:'Konstanz', ic:'shieldCheck', tone:'gold', art:'leistung',
    monat:{
      wie:'Positiv heißt: an diesem Spieltag mehr Siege als Niederlagen.',
      cond:'Mindestens 78 % der eigenen Spieltage mit positiver Bilanz beendet, ab 6 Spieltagen',
            ...(_stWertung(p=>p.days>=6, p=>p.posDays/p.days, 0.78,
        (p,v)=>`${p.posDays} der ${p.days} Spieltage mit mehr Siegen als Pleiten · ${Math.round(v*100)} %`))}},

  {id:'twoway', name:'Der Doppelbegabte', short:'Beidseitig', ic:'diamond', tone:'gold', art:'leistung',
    monat:{
      cond:'Mindestens 63 % Siege vorne UND hinten, je 12 Spiele',
            ...(_stWertung(p=>p.atkG>=12 && p.defG>=12, p=>Math.min(p.atkW/p.atkG, p.defW/p.defG), 0.63,
        (p)=>`${Math.round(p.atkW/p.atkG*100)} % vorne, ${Math.round(p.defW/p.defG*100)} % hinten`))}},

  {id:'spotless', name:'Der makellose Tag', short:'Makellos', ic:'trophyDay', tone:'gold', art:'leistung',
    monat:{
      cond:'Ein Spieltag mit mindestens 5 Partien und keiner einzigen Niederlage',
            ...(_stWertung(()=>true, p=>p.bestPerfTag, 5,
        (p,v)=>`${v} Partien an einem Tag, keine davon verloren`))},
    allzeit:{
      cond:'Höchster Anteil voller Spieltage (4+ Partien) ohne eine einzige Niederlage, ab 8 solchen Tagen',
      val:p => (p.bigDays >= 8 && p.perfDays >= 1) ? p.perfDays/p.bigDays : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.bigDays} vollen Spieltage ohne eine einzige Niederlage · ${p.perfDays} Tage`}},

  {id:'catalyst', name:'Der Katalysator', short:'Katalyse', ic:'handshake', tone:'gold', art:'leistung',
    monat:{
      wie:'Für jeden Partner wird verglichen, wie oft DIESER Partner an dieser Seite gewinnt und wie oft ohne. Der Abstand steht in Prozentpunkten und misst damit nicht das eigene Ergebnis, sondern die Wirkung auf andere.',
      cond:'Partner gewinnen an dieser Seite mindestens 20 Prozentpunkte häufiger als ohne, ab 3 Partnern',
            ...(_stWertung(p=>p.upliftMates>=3 && p.uplift!=null, p=>p.uplift, 0.20,
        (p,v)=>`Die ${p.upliftMates} Partner gewinnen an dieser Seite ${Math.round(v*100)} %-Punkte häufiger`))},
    allzeit:{
      cond:'Die Partner gewinnen an dieser Seite am deutlichsten häufiger als ohne, mindestens 3 Partner mit je 25 gemeinsamen Spielen',
      val:p => (p.upliftMates >= 3 && p.uplift != null && p.uplift >= 0.10) ? p.uplift : null,
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte gewinnen die ${p.upliftMates} Partner an dieser Seite häufiger`}},

  {id:'clutch', name:'Die ruhige Hand', short:'Nerven', ic:'nerves', tone:'gold', art:'leistung',
    monat:{
      wie:'Eng heißt höchstens zwei Tore Unterschied. Verglichen wird die Quote in diesen Partien mit der Quote über alle Partien.',
      cond:'In engen Spielen deutlich stärker als sonst, mindestens 8 Prozentpunkte, ab 12 engen Spielen',
            ...(_stWertung(p=>p.close>=12, p=>(p.closeW/p.close) - (p.wins/p.games), 0.08,
        (p,v)=>`${Math.round(p.closeW/p.close*100)} % in ${p.close} engen Spielen · +${Math.round(v*100)} %-Punkte`))},
    allzeit:{
      cond:'Stärkster Sprung nach oben in engen Spielen, mindestens 9 Prozentpunkte',
      val:p => {
        if(p.close < 14 || p.close < p.games * 0.2) return null;
        const d = (p.closeW/p.close) - (p.wins/p.games);
        return d >= 0.09 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte in engen Spielen · ${Math.round(p.closeW/p.close*100)} statt ${Math.round(p.wins/p.games*100)} %`}},

  {id:'executioner', name:'Der Vollstrecker', short:'Zu Null', ic:'hundred', tone:'gold', art:'leistung',
    monat:{
      cond:'Mindestens 5 % der eigenen Siege endeten 10:0, ab 20 Siegen',
            ...(_stWertung(p=>p.wins>=20, p=>p.perfect/p.wins, 0.05,
        (p,v)=>`${p.perfect} der ${p.wins} Siege endeten 10:0 · ${Math.round(v*100)} %`))}},

  {id:'giant_slayer', name:'Der Gigantentöter', short:'Underdog', ic:'tornado', tone:'acid', art:'leistung',
    allzeit:{
      cond:'Höchster Anteil Siege mit unter 35 % Siegchance, ab 60 Spielen',
      val:p => (p.games >= 60 && p.upsets/p.games >= 0.04) ? p.upsets/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien gegen die Wahrscheinlichkeit gewonnen · ${p.upsets} Siege`}},

  {id:'destroyer', name:'Der Zerstörer', short:'Zerstörer', ic:'explosion', tone:'orange', art:'leistung',
    monat:{
      cond:'Mindestens 26 % der eigenen Siege mit 7+ Toren Vorsprung, ab 20 Siegen',
            ...(_stWertung(p=>p.wins>=20, p=>p.blowouts/p.wins, 0.26,
        (p,v)=>`${p.blowouts} der ${p.wins} Siege mit 7+ Toren Vorsprung`))},
    allzeit:{
      cond:'Höchster Anteil Kantersiege, ab 22 Siegen und mindestens 22 %',
      val:p => (p.wins >= 22 && p.blowW/p.wins >= 0.22) ? p.blowW/p.wins : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.wins} Siege waren Kantersiege · ${p.blowW} Kantersiege`}},

  // Die beiden Positionen als GANZES, nicht als Einzelmaß. „Der Fels" zählt
  // nur Gegentore, „Der Torjäger" nur eigene — beides sagt nichts darüber,
  // ob jemand seine Spiele auch gewinnt. Gewertet wird deshalb genau der
  // Wert, nach dem die Positions-Rangliste sortiert (posWert, [§5.2]):
  // Siegquote, Leistung gegen die Erwartung, Rollenbeitrag, Erfahrung.
  // Damit gehört der Erste dieser Liste sichtbar etwas — die Positions-
  // Rangliste war die einzige Rangliste der App, auf der es nichts zu holen
  // gab.
  //
  // Nur allzeit: der Wert wiegt Erfahrung mit ein, und ein Monat hat davon
  // zu wenig. Über vier Wochen entschiede die Spielzahl statt der Leistung.
  {id:'atk_ace', name:'Der komplette Stürmer', short:'Sturm', ic:'bolt', tone:'orange', art:'leistung',
    allzeit:{
      cond:'Höchster Sturmwert der Positions-Rangliste aus Siegquote, Leistung gegen die Erwartung und Ø Tore, ab 50 Sturmspielen',
      val:p => (p.atkG >= 50)
        ? posWert('atk', p.atkG, p.atkW, p.atkGoals/p.atkG, p.atkPerf/p.atkG) : null,
      ev:(p,v) => `${Math.round(v*100)} Sturmwert · ${p.atkW}:${p.atkG-p.atkW} in ${p.atkG} Sturmspielen`}},

  {id:'def_ace', name:'Der komplette Verteidiger', short:'Abwehr', ic:'shield', tone:'blue', art:'leistung',
    allzeit:{
      cond:'Höchster Abwehrwert der Positions-Rangliste aus Siegquote, Leistung gegen die Erwartung und Ø Gegentore, ab 50 Abwehrspielen',
      val:p => (p.defG >= 50)
        ? posWert('def', p.defG, p.defW, p.defConceded/p.defG, p.defPerf/p.defG) : null,
      ev:(p,v) => `${Math.round(v*100)} Abwehrwert · ${p.defW}:${p.defG-p.defW} in ${p.defG} Abwehrspielen`}},

  {id:'rock', name:'Der Fels', short:'Fels', ic:'brick', tone:'blue', art:'leistung',
    allzeit:{
      cond:'Wenigste Gegentore pro Spiel in der Abwehr, ab 50 Abwehrspielen',
      val:p => (p.defG >= 50) ? -(p.defConceded/p.defG) : null,
      ev:(p,v) => `${(-v).toFixed(1)} Gegentore je Abwehrspiel im Schnitt · ${p.defG} Spiele`}},

  {id:'sniper', name:'Der Torjäger', short:'Torjäger', ic:'ball', tone:'orange', art:'leistung',
    allzeit:{
      cond:'Meiste eigene Tore pro Spiel im Sturm, ab 50 Sturmspielen',
      val:p => (p.atkG >= 50) ? p.atkGoals/p.atkG : null,
      ev:(p,v) => `${v.toFixed(1)} Tore je Sturmspiel im Schnitt · ${p.atkG} Spiele`}},

  {id:'climber', name:'Der Aufsteiger', short:'Aufsteiger', ic:'climb', tone:'acid', art:'leistung',
    monat:{
      cond:'Mindestens 120 Elo mehr als am Ende der Vorsaison',
            ...(_stWertung(p=>p.growth!=null, p=>p.growth, 120,
        (p,v)=>`+${Math.round(v)} Elo gegenüber der Vorsaison`))}},

  {id:'comeback_king', name:'Der Stehaufmann', short:'Comeback', ic:'comeback', tone:'acid', art:'leistung',
    monat:{
      wie:'Gezählt wird jede Partie, die unmittelbar auf eine Niederlage folgte, und wie viele davon gewonnen wurden.',
      cond:'Mindestens 70 % der Spiele direkt nach einer Niederlage gewonnen, ab 20 Gelegenheiten',
            ...(_stWertung(p=>p.afterLossOpp>=20, p=>p.afterLoss/p.afterLossOpp, 0.70,
        (p,v)=>`${p.afterLoss} von ${p.afterLossOpp} Antworten nach einer Pleite gewonnen`))},
    allzeit:{
      cond:'Stärkster Sprung nach oben direkt nach einer Niederlage, ab 60 Gelegenheiten und mindestens 6 Prozentpunkte',
      val:p => {
        if(p.afterLossOpp < 60) return null;
        const d = p.afterLoss/p.afterLossOpp - p.wins/p.games;
        return d >= 0.06 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte nach einer Pleite · ${Math.round(p.afterLoss/p.afterLossOpp*100)} statt ${Math.round(p.wins/p.games*100)} %`}},

  {id:'thriller', name:'Der Nervenkitzler', short:'Krimi', ic:'thriller', tone:'purple', art:'leistung',
    monat:{
      cond:'Mindestens 20 % der eigenen Siege endeten 10:9, ab 20 Siegen',
            ...(_stWertung(p=>p.wins>=20, p=>p.nail/p.wins, 0.20,
        (p,v)=>`${p.nail} der ${p.wins} Siege endeten 10:9 · ${Math.round(v*100)} %`))},
    allzeit:{
      cond:'Höchster Anteil 10:9-Siege an allen eigenen Siegen, ab 25 Siegen',
      val:p => (p.wins >= 25 && p.nail/p.wins >= 0.08) ? p.nail/p.wins : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.wins} Siege endeten 10:9 · ${p.nail} Zittersiege`}},

  {id:'damage_control', name:'Der Schadensbegrenzer', short:'Limit', ic:'blockedShot', tone:'blue', art:'leistung',
    allzeit:{
      cond:'Niedrigster Anteil deutlicher Niederlagen (7+ Tore Rückstand), ab 25 Niederlagen',
      val:p => (p.losses >= 25 && p.blowL/p.losses <= 0.12) ? -(p.blowL/p.losses) : null,
      ev:p => `${Math.round(p.blowL/p.losses*100)} % aller ${p.losses} Niederlagen gingen deutlich verloren · ${p.blowL} davon`}},

  {id:'unbowed', name:'Der Unerschütterliche', short:'Kein Loch', ic:'concreteWall', tone:'blue', art:'leistung',
    monat:{
      cond:'Nie mehr als 2 Niederlagen am Stück, bei mindestens 25 Spielen',
            ...(_stWertung(p=>p.games>=25, p=>-p.worstLoss, -2,
        (p)=>p.worstLoss<=1 ? `Nie zwei Niederlagen hintereinander · ${p.wins}:${p.losses}`
                            : `Nie mehr als 2 Niederlagen am Stück · ${p.wins}:${p.losses}`))},
    allzeit:{
      cond:'Kürzeste Niederlagenserie, die je jemand über eine ganze Laufbahn zugelassen hat, ab 80 Spielen',
      val:p => (p.games >= 80 && p.lossStreak > 0) ? -p.lossStreak : null,
      ev:(p,v) => `${-v} Niederlagen am Stück, mehr waren es nie · ${p.games} Partien`}},

  // Zwei Wertungen fuer die Mitte des Feldes. Die Chronik ging zu sechzig
  // Prozent an die besten Drei, und der Monatserste allein hielt ein Drittel
  // der Tafel: wer eine Quote gewinnt, gewinnt fast jede. Beide hier messen
  // deshalb nicht das Niveau, sondern den ABSTAND zum eigenen — genau wie das
  // Übersoll, das jeder erreichen kann.
  {id:'augenhoehe', name:'Auf Augenhöhe', short:'Augenhöhe', ic:'weightSmall', tone:'acid', art:'leistung',
    monat:{
      wie:'Die Rechnung sah die Partie offen, wenn sie beiden Teams zwischen 45 und 55 Prozent Siegchance gab. Verglichen wird die Quote in diesen Partien mit der eigenen Quote über den ganzen Monat.',
      cond:'In offenen Partien mindestens 10 Prozentpunkte stärker als sonst, ab 8 solchen Partien',
      ...(_stWertung(p=>p.gleichG>=8, p=>p.gleichW/p.gleichG - p.wins/p.games, 0.10,
        (p,v)=>`${p.gleichW} von ${p.gleichG} offenen Partien · +${Math.round(v*100)} %-Punkte`))}},

  {id:'steigerung', name:'Die Steigerung', short:'Steigerung', ic:'chartUp', tone:'acid', art:'leistung',
    monat:{
      wie:'Die Spieltage des Monats werden in der Mitte geteilt. Verglichen werden die beiden Siegquoten desselben Spielers, die zweite Hälfte gegen die erste.',
      cond:'In der zweiten Hälfte des Monats mindestens 12 Prozentpunkte stärker als in der ersten, ab 8 Partien je Hälfte',
      ...(_stWertung(p=>p.h1G>=8 && p.h2G>=8, p=>p.h2W/p.h2G - p.h1W/p.h1G, 0.12,
        (p,v)=>`+${Math.round(v*100)} %-Punkte in der zweiten Monatshälfte · ${p.h2W} von ${p.h2G}`))}},

  // Die Außenseiter-Quote misst NICHT, wie oft jemand Außenseiter ist —
  // das sagt nur, wie schwach er ist. Gemessen wird der Abstand zwischen
  // dem, was er in diesen Partien geholt hat, und dem, was die Quoten ihm
  // zugestanden haben. Ein starker Spieler ist selten Außenseiter, dann
  // aber mit 45 % Chance; ein schwacher ständig und mit 25 %. Beide können
  // die Erwartung um dieselben zehn Punkte übertreffen — und genau darum
  // ist dieser Eintrag für jeden erreichbar.
  // ══ EREIGNIS ══════════════════════════════════════════════════════
  // Etwas ist passiert. Oft einmalig, oft ein Bestwert — aber kein
  // Beleg für eine Fähigkeit, die man jeden Monat wieder abrufen kann.

  {id:'unstoppable', name:'Der Unaufhaltsame', short:'Serie', ic:'flame', tone:'orange', art:'ereignis',
    allzeit:{
      cond:'Längste Siegesserie der Liga-Geschichte',
      unit:'Siege in Folge', min:8, raw:p => p.winStreak,
      ev:(p,v) => `${v} Siege in Folge`,
      zeit:p => p.winSpan || ''}},

  // Ein Abend, an dem alles saß. Braucht weder eine Laufbahn noch eine
  // Quote — nur einen guten Tag, und den kann jeder haben. Deshalb steht
  // er unter EREIGNIS und nicht unter LEISTUNG.
  {id:'peak', name:'Der höchste Gipfel', short:'Gipfel', ic:'peak', tone:'gold', art:'ereignis',
    allzeit:{
      cond:'Höchster Elo-Stand, den je ein Spieler erreicht hat',
      unit:'Elo', min:350, raw:p => p.peak,
      ev:(p,v) => `${Math.round(v)} Elo, nie stand jemand höher`}},

  {id:'eloday', name:'Der große Sprung', short:'Sprung', ic:'bolt2', tone:'acid', art:'ereignis',
    allzeit:{
      cond:'Größter Elo-Gewinn an einem einzigen Tag',
      unit:'Elo an einem Tag', min:100, raw:p => p.dayElo == null ? null : Math.round(p.dayElo),
      ev:(p,v) => `+${v} Elo an einem Tag`,
      zeit:p => p.dayEloLabel || ''}},

  {id:'wall', name:'Die Mauer', short:'Mauer', ic:'shieldStar', tone:'blue', art:'ereignis',
    allzeit:{
      cond:'Höchster Abwehr-Anteil, ab 60 Spielen und mindestens 80 %',
      val:p => (p.games >= 60 && p.defG/p.games >= 0.80) ? p.defG/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien hinten · ${p.defG} Abwehrspiele`}},

  {id:'switcher', name:'Der Wandler', short:'Wandler', ic:'refresh', tone:'purple', art:'ereignis',
    allzeit:{
      cond:'Ausgeglichenste Verteilung auf beide Positionen, ab 60 Spielen',
      val:p => {
        if(p.games < 60) return null;
        const s = p.defG/p.games;
        return (s >= 0.43 && s <= 0.57) ? -Math.abs(s-0.5) : null;
      },
      ev:(p,v) => `${Math.round(Math.abs(v)*100)} %-Punkte Unterschied zwischen vorne und hinten · ${p.atkG} zu ${p.defG}`}},

  // ── GLÜCK ─────────────────────────────────────────────
  // Drei Einträge, die kein Können messen. Ohne sie liegen am Ende alle
  // Rekorde bei denselben drei Spielern: wer besser spielt, gewinnt jede
  // Quote und jede Serie. Eine Münze gewinnt er nicht.
  //
  // Sie sind absichtlich `ereignis` und nicht `leistung` — sie sollen
  // jemandem gehören können, nicht jemanden auszeichnen, und fürs Prestige
  // halb so viel wiegen wie ein Beleg für eine Fähigkeit [§13.8]. Und sie
  // sind absichtlich nicht billig: eine Bestmarke, die jeder geschenkt
  // bekommt, ist keine mehr.

  {id:'sundaychild', name:'Das Sonntagskind', short:'Glück', ic:'clover', tone:'acid', art:'ereignis', zufall:'quote',
    allzeit:{
      // Der letzte Ball eines 10:9 ist das Nächste, was diese Liga an einem
      // Münzwurf zu bieten hat. Wer ihn häufiger auf seiner Seite hatte, hat
      // nichts bewiesen — aber er hatte ihn.
      cond:'Höchster Anteil gewonnener Ein-Tor-Spiele der Laufbahn, ab 12 solchen Partien',
      val:p => (p.nail + p.bitter) >= 12 ? p.nail / (p.nail + p.bitter) : null,
      ev:(p,v) => `${Math.round(v*100)} % der Spiele um den letzten Ball gewonnen · ${p.nail} von ${p.nail+p.bitter}`}},

  {id:'seesaw', name:'Das Wechselbad', short:'Wechsel', ic:'cycle', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      cond:'Längste Serie aus abwechselnd Sieg und Niederlage der Liga-Geschichte',
      unit:'Partien im Wechsel', min:7, raw:p => p.alt,
      ev:(p,v) => `${v} Partien lang immer abwechselnd`,
      zeit:p => p.altSpan || ''}},

  // ── Die Fügungen aus Auslosung und letztem Ball ───────────────────
  // `zufall` sagt zweierlei: welcher Kammer der Eintrag angehört, und wie
  // er gemessen wird. 'quote' mittelt über eine Laufbahn oder einen Tag
  // und MUSS deshalb erreichbar sein — mindestens die halbe Liga steht im
  // Rennen. 'fund' ist ein einzelnes Zusammentreffen; es darf selten sein
  // und sogar unbesetzt bleiben. `tests/disziplinen` misst beides getrennt,
  // weil eine Schwelle für das eine für das andere unsinnig wäre.

  {id:'hardnight', name:'Der schwerste Tag', short:'Losglück', ic:'rainCloud', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      wie:'Die Siegchance ist der Elo-Erwartungswert des eigenen Teams gegen das gegnerische; 50 % heißt ausgeglichen. Gemittelt über alle Partien des Tages misst sie, wie die Auslosung an diesem Tag stand. Über das Spiel selbst sagt sie nichts.',
      cond:'Niedrigste mittlere Siegchance über einen ganzen Spieltag, ab 4 Partien an diesem Tag',
      val:p => (p.hartTag != null && p.hartTag <= 0.45) ? 1 - p.hartTag : null,
      ev:(p,v) => `${Math.round((1-v)*100)} % mittlere Siegchance über den ganzen Tag`,
      zeit:p => p.hartTagLabel || ''}},

  // `negativ` faerbt und zaehlt, `art` wiegt: die Fuegung bleibt ein Ereignis
  // [§C35], erzaehlt aber von einer Niederlage. Im Profil stand sie in Gold
  // neben den Titeln und wurde als Rekord mitgezaehlt.
  {id:'bitterloss', name:'Die bitterste Pleite', short:'Bitter', ic:'dramaTear', tone:'purple',
    art:'ereignis', zufall:'quote', negativ:true,
    allzeit:{
      wie:'Eine einzige Partie, kein Durchschnitt: die höchste Siegchance, mit der je jemand in ein Spiel ging und es trotzdem verlor.',
      cond:'Höchste Siegchance, die trotzdem verloren ging, mindestens 65 %',
      val:p => (p.pechExp != null && p.pechExp >= 0.65) ? p.pechExp : null,
      ev:(p,v) => `${Math.round(v*100)} % Siegchance, und trotzdem verloren`,
      zeit:p => p.pechLabel || ''}},

  {id:'mirrorday', name:'Der Wiedergänger', short:'Déjà-vu', ic:'duplicate', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      cond:'Dasselbe Ergebnis an einem Tag, mindestens dreimal',
      val:p => p.wiederTag >= 3 ? p.wiederTag : null,
      ev:(p,v) => `${v}× ${p.wiederErg} an einem einzigen Tag`,
      zeit:p => p.wiederLabel || ''}},

  {id:'needleeye', name:'Das Nadelöhr', short:'Nadelöhr', ic:'needleEye', tone:'acid',
    art:'ereignis', zufall:'quote',
    allzeit:{
      wie:'Gezählt wird jede Partie, die auf einen einzigen Ball hinauslief, gewonnen wie verloren. Der Anteil sagt nichts über das Ergebnis, nur darüber, wie eng es zuging.',
      cond:'Höchster Anteil Ein-Tor-Partien an der eigenen Laufbahn, ab 60 Partien',
      val:p => (p.games >= 60 && (p.nail + p.bitter) / p.games >= 0.08)
             ? (p.nail + p.bitter) / p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien liefen auf einen Ball hinaus · ${p.nail + p.bitter} enge Partien`}},

  {id:'evenkeel', name:'Die Punktlandung', short:'Punktlandung', ic:'scaleBalance', tone:'gold',
    art:'ereignis', zufall:'fund',
    allzeit:{
      wie:'Am Ende des Tages stehen genauso viele eigene Tore wie Gegentore. Je mehr Partien der Tag hatte, desto unwahrscheinlicher trifft das zu. Deshalb zählt die Größe des Tages und nicht, wie oft es vorkam.',
      cond:'Größter Spieltag, an dem das eigene Torkonto exakt aufgeht, ab 4 Partien',
      val:p => p.gleichTag >= 4 ? p.gleichTag : null,
      ev:(p,v) => `${v} Partien, Torkonto ${p.gleichTore}:${p.gleichTore}`,
      zeit:p => p.gleichLabel || ''}},

  {id:'rollercoaster', name:'Die Achterbahn', short:'Achterbahn', ic:'coasterDip', tone:'orange',
    art:'ereignis', zufall:'fund',
    allzeit:{
      cond:'Ein 10:0 gewonnen und ein 0:10 kassiert, beides am selben Tag',
      val:p => p.beidesTag > 0 ? p.beidesTag : null,
      ev:(p,v) => `${v} Tag${v > 1 ? 'e' : ''} mit einem 10:0 UND einem 0:10`,
      zeit:p => p.beidesLabel || ''}},

  {id:'coldshower', name:'Die kalte Dusche', short:'Dusche', ic:'showerHead', tone:'blue',
    art:'ereignis', zufall:'fund', negativ:true,
    allzeit:{
      cond:'Ein 10:0 gewinnen und die unmittelbar nächste Partie 0:10 verlieren',
      val:p => p.dusche > 0 ? p.dusche : null,
      ev:(p,v) => `${v}× folgte auf ein 10:0 unmittelbar ein 0:10`,
      zeit:p => p.duscheLabel || ''}},

  // ══ SCHATTEN ══════════════════════════════════════════════════════
  // Die Kehrseite. Sie steht in der Tafel und im Profil, aber sie zählt
  // fürs Prestige nicht — weder positiv noch negativ [§13.8].

  {id:'ohnedebakel', name:'Ohne Debakel', short:'Standhaft', ic:'lock', tone:'blue', art:'ereignis',
    monat:{
      cond:'Keine einzige Niederlage mit 7 oder mehr Toren Rückstand, ab 20 Partien',
            ...(_stWertung(p=>p.blowL===0, p=>p.games, 20,
        (p,v)=>`${v} Partien, kein einziges Debakel`))}},

  {id:'bezwinger', name:'Der Bezwinger', short:'Bezwinger', ic:'crossedSwords', tone:'gold', art:'ereignis',
    monat:{
      cond:'Alle Duelle eines Monats gegen denselben Gegner gewonnen, ab 8 Duellen',
            ...(_stWertung(()=>true, p=>p.sweepG, 8,
        (p,v)=>`${v}:0 gegen ${pname(p.sweepX)}`))}},

  {id:'bannbruch', name:'Der Bann bricht', short:'Erlöst', ic:'rematch', tone:'acid', art:'ereignis',
    monat:{
      wie:'Ein Bann ist eine Serie von zwölf Niederlagen in Folge gegen denselben Gegner. Der erste Sieg gegen diesen Gegner beendet den Bann.',
      cond:'Einen Gegner besiegt, gegen den zuvor 12 Duelle in Folge verloren gingen',
            ...(_stWertung(()=>true, p=>p.bann, 1,
        (p,v)=>v===1 ? 'Angstgegner nach zwölf Niederlagen in Folge besiegt'
                     : `${v}-mal einen Angstgegner nach zwölf Niederlagen besiegt`))}},

  {id:'gleichmut', name:'Der Gleichmütige', short:'Gleichmut', ic:'snowflake', tone:'blue', art:'ereignis',
    monat:{
      wie:'Die Streuung der Tagesquoten: für jeden Spieltag mit mindestens drei Partien die Siegquote, davon die Standardabweichung. Klein heißt gleichmäßig, nicht gut.',
      // Kleiner Wert = gleichmäßiger, deshalb das Vorzeichen: _stPickTop
      // sucht immer den größten Score.
      cond:'Kaum Schwankung zwischen den Spieltagen, ab 4 Spieltagen mit je 3 Partien',
            ...(_stWertung(p=>p.tagStreuung!=null, p=>-p.tagStreuung, -0.10,
        (p)=>`Schwankung ${p.tagStreuung.toFixed(2)} über ${p.tageGewertet} Spieltage`))}},

  {id:'rueckkehr', name:'Die Rückkehr', short:'Rückkehr', ic:'rocket', tone:'orange', art:'ereignis',
    monat:{
      // Nicht „Serie, dann Gegenserie": das kam in vier Monaten kein einziges
      // Mal vor. Wer sechsmal am Stück verliert, verliert den Monat fast immer
      // mit — wer ihn trotzdem gewinnt, hat sich zurückgeholt.
      cond:'Eine Niederlagenserie von 5 Spielen überstanden und den Monat trotzdem positiv beendet, ab 25 Partien',
            ...(_stWertung(p=>p.games>=25 && p.wins>p.losses, p=>p.worstLoss, 5,
        (p,v)=>`${v} Niederlagen am Stück und trotzdem ${p.wins}:${p.losses}`))}},

  {id:'spezialist', name:'Der Spezialist', short:'Spezialist', ic:'plusMinus', tone:'purple', art:'ereignis',
    monat:{
      wie:'Der Abstand zwischen der Siegquote im Sturm und der in der Abwehr, in Prozentpunkten. Groß heißt einseitig, nicht gut.',
      cond:'Auf einer Position mindestens 30 Prozentpunkte besser als auf der anderen, ab 10 Partien je Position',
            ...(_stWertung(p=>p.atkG>=10 && p.defG>=10, p=>Math.abs(p.atkW/p.atkG - p.defW/p.defG), 0.30,
        (p,v)=>`${Math.round(v*100)} %-Punkte Unterschied, deutlich stärker `
          + (p.atkW/p.atkG > p.defW/p.defG ? 'vorne' : 'hinten')))}},

  {id:'antwort', name:'Die Antwort', short:'Antwort', ic:'flameBreak', tone:'acid', art:'ereignis',
    monat:{
      wie:'Ein Debakel ist eine Niederlage mit sieben oder mehr Toren Rückstand. Gezählt wird die Partie unmittelbar danach.',
      cond:'Mindestens 80 % in der Partie direkt nach einem Debakel, ab 5 solchen',
            ...(_stWertung(p=>p.antwortG>=5, p=>p.antwortW/p.antwortG, 0.80,
        (p)=>`${p.antwortW} von ${p.antwortG} Antworten direkt nach einem Debakel`))}},

  {id:'schlussstrich', name:'Der Schlussstrich', short:'Schluss', ic:'clock', tone:'blue', art:'ereignis',
    monat:{
      cond:'Mindestens 75 % der letzten Partien eines Spieltags gewonnen, ab 6 Spieltagen',
            ...(_stWertung(p=>p.lastG>=6, p=>p.lastW/p.lastG, 0.75,
        (p)=>`${p.lastW} von ${p.lastG} Schlusspartien gewonnen`))}},

  {id:'auftakt', name:'Der Auftakt', short:'Auftakt', ic:'sunrise', tone:'blue', art:'ereignis',
    monat:{
      cond:'Mindestens 78 % der ersten Partien eines Spieltags gewonnen, ab 6 Spieltagen',
            ...(_stWertung(p=>p.firstG>=6, p=>p.firstW/p.firstG, 0.78,
        (p)=>`${p.firstW} von ${p.firstG} Auftaktpartien gewonnen`))}},

  {id:'fluke', name:'Der Sonntagsschuss', short:'Coup', ic:'surprise', tone:'orange', art:'ereignis', zufall:'quote',
    // Auch als Monatswertung: eine einzige Partie genuegt, und die Rechnung
    // stand dagegen. Gemessen ueber die bisherigen Monate ging sie an Platz
    // sechs und Platz sieben der Siegquote — an Leute, die von den Eintraegen,
    // die am Koennen haengen, keinen bekommen.
    monat:{
      wie:'Die Siegchance ist der Elo-Erwartungswert des eigenen Teams vor der Partie. Gezählt wird die eine Partie des Monats, in der sie am tiefsten stand und trotzdem gewonnen wurde.',
      cond:'Der unwahrscheinlichste Sieg des Monats, bei höchstens 28 % Siegchance',
      ...(_stWertung(p=>p.flukeExp!=null, p=>1-p.flukeExp, 0.72,
        (p,v)=>`${Math.round((1-v)*100)} % Siegchance, und trotzdem gewonnen`))},
    allzeit:{
      // Eine einzige Partie genügt, und die Rechnung stand gegen ihn. Der
      // schwächste Spieler der Liga hat die meisten Gelegenheiten dazu —
      // das ist hier kein Fehler, sondern der Zweck.
      cond:'Der unwahrscheinlichste Sieg, den je jemand geholt hat, bei höchstens 30 % Siegchance',
      val:p => (p.flukeExp != null && p.flukeExp <= 0.30) ? 1 - p.flukeExp : null,
      ev:(p,v) => `${Math.round((1-v)*100)} % Siegchance, und trotzdem gewonnen`,
      zeit:p => p.flukeLabel || ''}},

  {id:'untersoll', name:'Unter Soll', short:'Unter Soll', ic:'trendDown', tone:'red', art:'schatten',
    monat:{
      wie:'Die Siegquote minus der Siegchance, die die Elo-Rechnung vorab ausgewiesen hat, hier nach unten. Ein Prozentpunkt ist ein Prozentpunkt Siegquote, nicht Elo.',
      cond:'Mindestens 15 Prozentpunkte unter der eigenen Elo-Erwartung, ab 20 Partien',
            ...(_stWertung(p=>p.games>=20, p=>p.expSum/p.games - p.wins/p.games, 0.15,
        (p,v)=>`${Math.round(-v*100)} %-Punkte unter der Erwartung · ${p.games} Partien`))}},

  {id:'drought', name:'Die Durststrecke', short:'Flaute', ic:'dropTriple', tone:'red', art:'schatten',
    monat:{strict:true,
      cond:'Längste Niederlagenserie des Monats, mindestens 10 Spiele am Stück',
            ...(_stWertung(()=>true, p=>p.worstLoss, 10,
        (p,v)=>`${v} Niederlagen in Folge${p.lossSpan?' · '+p.lossSpan:''}`))},
    allzeit:{
      cond:'Längste Niederlagenserie der Liga-Geschichte',
      min:7, raw:p => p.lossStreak,   // kein `unit`: Schatten sind kein Fortschrittsziel
      ev:(p,v) => `${v} Niederlagen am Stück`,
      zeit:p => p.lossSpan || ''}},

  {id:'abyss', name:'Das Fass ohne Boden', short:'Debakel', ic:'dizzy', tone:'red', art:'schatten',
    allzeit:{
      cond:'Höchster Anteil 0:10-Niederlagen an allen eigenen Niederlagen, ab 25 Niederlagen',
      val:p => (p.losses >= 25 && p.debacle/p.losses >= 0.03) ? p.debacle/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen endeten 0:10 · ${p.debacle} Debakel`}},

  {id:'hardluck', name:'Der Pechvogel', short:'Pechvogel', ic:'heartBroken', tone:'red', art:'schatten',
    allzeit:{
      cond:'Höchster Anteil 9:10-Niederlagen an allen eigenen Niederlagen, ab 25 Niederlagen',
      val:p => (p.losses >= 25 && p.bitter/p.losses >= 0.08) ? p.bitter/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen endeten 9:10 · ${p.bitter} davon`}},

  {id:'freefall', name:'Der Sturzflug', short:'Sturzflug', ic:'crownFallen', tone:'red', art:'schatten',
    allzeit:{
      cond:'Größter Elo-Absturz von einer Saison zur nächsten, mindestens −150',
      val:p => (p.fall && p.fall.d <= -150) ? -p.fall.d : null,
      ev:p => `${Math.round(p.fall.d)} Elo von ${p.fall.from} auf ${p.fall.to}`}},

  {id:'sieve', name:'Das Scheunentor', short:'Sieb', ic:'hole', tone:'red', art:'schatten',
    allzeit:{
      cond:'Meiste Gegentore pro Spiel in der Abwehr, ab 30 Abwehrspielen',
      val:p => (p.defG >= 30 && p.defConceded/p.defG >= 6.0) ? p.defConceded/p.defG : null,
      ev:(p,v) => `${v.toFixed(1)} Gegentore je Abwehrspiel im Schnitt · ${p.defG} Spiele`}},
];

// Die beiden Wertungen als eigene Listen — die Engines darunter bleiben
// unverändert. Wer eine Disziplin ohne `monat` anlegt, taucht in der
// Saison-Tafel nicht auf; wer keine `allzeit` hat, hat keinen Rekord.
const SEASON_TITLES = DISZIPLINEN.filter(d => d.monat).map(d => ({
  id:d.id, name:d.name, short:d.short, ic:d.ic, tone:d.tone, art:d.art,
  cond:d.monat.cond, wie:d.monat.wie || '', pick:d.monat.pick
}));
const SEASON_TITLE_BY_ID = {};
SEASON_TITLES.forEach(t => { SEASON_TITLE_BY_ID[t.id] = t; });

// ─── [§C32] Ein Eintrag gehört dem, der ihn hält ─────────────────────
// score(p, pid) liefert eine Zahl (größer = besser) oder null, wenn die
// Bedingung nicht erfüllt ist. Ermittelt wird der Bestwert über ALLE
// gewerteten Spieler — unabhängig davon, wer schon einen Eintrag trägt.
//
// Früher durften die meisten Einträge weiterrutschen: wer den Bestwert hielt
// und schon etwas anderes trug, gab den Eintrag an den Nächstbesten ab.
// Damit stand „Der Unaufhaltsame" bei jemandem mit zwölf Siegen in Folge,
// während einer mit dreizehn danebensaß — und in der Praxis ging ein Drittel
// aller Einträge an jemanden, der nicht der Beste war. Das macht die Tafel
// nicht abwechslungsreicher, sondern unwahr.
//
// Zurückgegeben wird deshalb die ganze Lage, nicht nur ein Name:
//   halter     alle, die den Bestwert punktgleich halten
//   evVon(id)  der Beleg für einen dieser Halter
// Alle Halter bekommen den Eintrag — dass ein Spieler in der Matrix nur
// einen zeigt, ist eine reine Anzeige-Regel (seasonTitleOf).
//
// `pid`/`ev` bleiben der beste noch FREIE Spieler — das braucht das
// Titelrennen für den Verfolger, und sonst niemand.
// ── Eine Monatswertung, deklarativ ───────────────────────────────────
// Jede der zweiunddreissig Wertungen hatte dieselbe Form: ein Tor fuer die
// Stichprobe, eine Groesse, eine Schwelle. Geschrieben stand sie als EIN
// Ausdruck, in dem die Groesse zweimal vorkam — einmal in der Bedingung,
// einmal als Ergebnis. Damit liess sich nicht sagen, wer knapp daneben liegt:
// wer die Schwelle reisst, bekam `null`, und `null` hat keine Reihenfolge.
// Getrennt aufgeschrieben faellt beides ab: die Vergabe wie bisher, und die
// Frage „wer kaeme als Naechstes in Frage".
//   `mind`  Wer ueberhaupt gewertet wird (Stichprobe und Voraussetzung).
//   `wert`  Die Groesse. Groesser ist besser, auch bei den Schattenseiten —
//           wo weniger besser ist, steht ein Minus davor.
//   `ab`    Ab hier ist die Bedingung erfuellt.
function _stWertung(mind, wert, ab, ev){
  return {
    mind, wert, ab, ev,
    pick:(C, t)=>_stPickTop(C, t, p=>{
      const v = wert(p);
      return (mind(p) && v != null && isFinite(v) && v >= ab) ? v : null;
    }, ev)
  };
}

// Wer der Bedingung am naechsten kommt, ohne sie zu erfuellen. Gewertet wird
// nur, wer die Stichprobe hat: „fast erreicht" von jemandem mit zwei Partien
// ist keine Aussage.
function _stNah(C, def){
  const w = def && def.monat;
  if(!w || !w.mind || !w.wert) return null;
  let best = null;
  Object.keys(C.P).forEach(pid => {
    const p = C.P[pid];
    if(!w.mind(p)) return;
    const v = w.wert(p);
    if(v == null || !isFinite(v) || v >= w.ab) return;
    if(!best || v > best.v) best = {pid, v};
  });
  return best ? {pid:best.pid, wert:best.v,
                 ev:w.ev(C.P[best.pid], best.v, C)} : null;
}

function _stPickTop(C, taken, score, ev){
  let bv = -Infinity;
  const werte = {};
  Object.keys(C.P).forEach(pid => {
    const v = score(C.P[pid], pid);
    if(v == null || !isFinite(v)) return;
    werte[pid] = v;
    if(v > bv) bv = v;
  });
  const ids = Object.keys(werte);
  if(!ids.length) return null;
  // Gleichstand bricht: mehr Siege → bessere Tordifferenz → Spieler-ID.
  // Damit ist die Vergabe deterministisch — dieselbe Saison ergibt immer
  // dieselbe Tafel, unabhängig von Objekt-Reihenfolgen.
  const ordnung = (a, b) => C.P[b].wins - C.P[a].wins || C.P[b].gd - C.P[a].gd || (a < b ? -1 : 1);
  const halter = ids.filter(id => Math.abs(werte[id] - bv) <= 1e-9).sort(ordnung);
  const frei = ids.filter(id => !taken.has(id))
    .sort((a, b) => werte[b] - werte[a] || ordnung(a, b))[0];
  // `rang` ist die vollständige Reihenfolge dieser Disziplin im Monat, nicht
  // nur ihr Sieger — das Detail-Blatt zeigt daraus ein Podest. Sie entsteht
  // aus `werte`, die ohnehin schon dastehen; ein zweiter Durchlauf wäre
  // dieselbe Rechnung ein zweites Mal.
  // `evVon` nimmt den Bestwert, weil alle Halter ihn per Definition teilen;
  // `evFuer` nimmt den eigenen Wert und gilt damit auch für Platz zwei.
  return {pid: frei || null, ev: frei ? ev(C.P[frei], werte[frei], C) : null,
          halter, evVon: id => ev(C.P[id], bv, C),
          rang: ids.slice().sort((a, b) => werte[b] - werte[a] || ordnung(a, b)),
          wert: id => werte[id],
          evFuer: id => ev(C.P[id], werte[id], C)};
}

