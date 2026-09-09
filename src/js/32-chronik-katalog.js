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

// ─── Bausteine der Monatschroniken ───────────────────────────────────
// Eine Teilmenge zaehlt ab fuenf Partien. Darunter sagt eine Quote nichts,
// darueber haengt die Chronik an der Spielzahl statt an der Leistung [§C39].
const ST_TEIL = 5;

const pct = v => Math.round(v * 100);
const _stMittel = a => a.reduce((x, y) => x + y, 0) / a.length;
// Eng heisst hoechstens zwei Tore Unterschied, in beide Richtungen.
const _stEng = s => Math.abs(s.gf - s.ga) <= 2;

// Poisson-Binomial: die Wahrscheinlichkeit, aus Partien mit ungleichen
// Siegchancen mindestens k zu gewinnen. Damit laesst sich sagen, wie
// wahrscheinlich ein ganzer Monat so oder besser ausgeht — die Grundlage
// des „Unmoeglichen Monats" und des „Ausreissers".
function _stPBinom(ps, k){
  let d = [1];
  ps.forEach(p => {
    const n = new Array(d.length + 1).fill(0);
    for(let i = 0; i < d.length; i++){ n[i] += d[i] * (1 - p); n[i + 1] += d[i] * p; }
    d = n;
  });
  let s = 0;
  for(let i = k; i < d.length; i++) s += d[i];
  return s;
}

// Die Kalenderwochen eines Spielers, ab fuenf Partien je Woche. Eine Woche
// ist lang genug, dass ein einzelner schlechter Tag sie nicht kippt, und
// kurz genug, dass eine Schwaechephase auffaellt.
const _stWochen = p => Object.values(p.wochGrp).filter(a => a.length >= ST_TEIL);

// Die Partien, die auf eine Niederlage folgen — die Gelegenheiten zu
// antworten, nicht die Antworten selbst.
const _stNachPleite = p => p.partien.filter((s, i) => i > 0 && !p.partien[i-1].win);

// Die beiden Haelften eines Monats, geteilt an der Mitte der eigenen
// Spieltage. „Die Steigerung" vergleicht sie miteinander.
function _stHaelften(p){
  const tage = Object.keys(p.tagGrp).sort();
  if(tage.length < 4) return null;
  const mitte = tage[Math.floor(tage.length / 2)];
  const e1 = p.partien.filter(s => s.tag < mitte), e2 = p.partien.filter(s => s.tag >= mitte);
  if(e1.length < 4 || e2.length < 4) return null;
  return {q1: e1.filter(s => s.win).length / e1.length,
          q2: e2.filter(s => s.win).length / e2.length};
}

// Fuenf Lagen desselben Monats. „Ohne Schwachstelle" wertet die schwaechste
// davon: ein einziger Einbruch kostet die Chronik, und deshalb kann sie nur
// holen, wer keinen hatte [§C39].
function _stLagen(p, c){
  const stark = {};
  Object.values(c.P).forEach(x => { if(x.games >= 8) stark[x.pid] = x.q; });
  const grp = {
    vorne:   p.partien.filter(s => s.pos === 'atk'),
    hinten:  p.partien.filter(s => s.pos === 'def'),
    oben:    p.partien.filter(s => s.geg.some(g => stark[g] != null && stark[g] > p.q)),
    eng:     p.partien.filter(s => Math.abs(s.gf - s.ga) <= 2),
    antwort: _stNachPleite(p)
  };
  const q = {};
  for(const k in grp){
    if(grp[k].length < ST_TEIL) return null;
    q[k] = grp[k].filter(s => s.win).length / grp[k].length;
  }
  return q;
}

const DISZIPLINEN = [
  // ═══ LIGA-REKORDE ═════════════════════════════════════════════════
  // Was jemand je erreicht hat. Diese Disziplinen tragen keine
  // Monatswertung mehr: die Monatsebene ist ein eigener Katalog
  // geworden, mit eigenen Fragen und eigenen Schwellen [§C39].

  {id:'best_record', name:'Der Maßstab', short:'Maßstab', ic:'medal2', tone:'gold', art:'leistung',
    allzeit:{
      cond:'Höchste Siegquote, die je jemand in einem Monat gespielt hat, ab 15 Spielen',
      val:p => (p.bestMonth && p.bestMonth.q >= 0.60) ? p.bestMonth.q : null,
      ev:(p,v) => `${Math.round(v*100)} % aus ${p.bestMonth.g} Spielen`,
      zeit:p => p.bestMonth ? seasonLabel(p.bestMonth.sid) : ''}},

  {id:'daylord', name:'Der Platzhirsch', short:'Revier', ic:'dayKing', tone:'gold', art:'leistung',
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

  {id:'spotless', name:'Der makellose Tag', short:'Makellos', ic:'trophyDay', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:3.38,
      wie:'Der Anteil der eigenen Spieltage, an denen keine Partie verloren ging. Ein Tag zählt ab drei Partien, damit ein Kurzbesuch nicht reicht.',
      cond:'Mindestens 20 % der eigenen Spieltage ohne eine einzige Niederlage, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return t.filter(a=>a.every(s=>s.win)).length/t.length;},
        0.2,
        p=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return `${t.filter(a=>a.every(s=>s.win)).length} von ${t.length} Spieltagen ohne Niederlage`;}))},
    allzeit:{
      cond:'Höchster Anteil voller Spieltage (4+ Partien) ohne eine einzige Niederlage, ab 8 solchen Tagen',
      val:p => (p.bigDays >= 8 && p.perfDays >= 1) ? p.perfDays/p.bigDays : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.bigDays} vollen Spieltage ohne eine einzige Niederlage · ${p.perfDays} Tage`}},

  {id:'catalyst', name:'Der Katalysator', short:'Katalyse', ic:'handshake', tone:'gold', art:'leistung',
    allzeit:{
      cond:'Die Partner gewinnen an dieser Seite am deutlichsten häufiger als ohne, mindestens 3 Partner mit je 25 gemeinsamen Spielen',
      val:p => (p.upliftMates >= 3 && p.uplift != null && p.uplift >= 0.10) ? p.uplift : null,
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte gewinnen die ${p.upliftMates} Partner an dieser Seite häufiger`}},

  {id:'clutch', name:'Die ruhige Hand', short:'Nerven', ic:'nerves', tone:'gold', art:'leistung',
    allzeit:{
      cond:'Stärkster Sprung nach oben in engen Spielen, mindestens 9 Prozentpunkte',
      val:p => {
        if(p.close < 14 || p.close < p.games * 0.2) return null;
        const d = (p.closeW/p.close) - (p.wins/p.games);
        return d >= 0.09 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte in engen Spielen · ${Math.round(p.closeW/p.close*100)} statt ${Math.round(p.wins/p.games*100)} %`}},

  {id:'giant_slayer', name:'Der Gigantentöter', short:'Underdog', ic:'tornado', tone:'acid', art:'leistung',
    allzeit:{
      cond:'Höchster Anteil Siege mit unter 35 % Siegchance, ab 60 Spielen',
      val:p => (p.games >= 60 && p.upsets/p.games >= 0.04) ? p.upsets/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien gegen die Wahrscheinlichkeit gewonnen · ${p.upsets} Siege`}},

  {id:'destroyer', name:'Der Zerstörer', short:'Zerstörer', ic:'explosion', tone:'orange', art:'leistung',
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

  {id:'comeback_king', name:'Der Stehaufmann', short:'Comeback', ic:'comeback', tone:'acid', art:'leistung',
    allzeit:{
      cond:'Stärkster Sprung nach oben direkt nach einer Niederlage, ab 60 Gelegenheiten und mindestens 6 Prozentpunkte',
      val:p => {
        if(p.afterLossOpp < 60) return null;
        const d = p.afterLoss/p.afterLossOpp - p.wins/p.games;
        return d >= 0.06 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte nach einer Pleite · ${Math.round(p.afterLoss/p.afterLossOpp*100)} statt ${Math.round(p.wins/p.games*100)} %`}},

  {id:'thriller', name:'Der Nervenkitzler', short:'Krimi', ic:'thriller', tone:'purple', art:'leistung',
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
    allzeit:{
      cond:'Kürzeste Niederlagenserie, die je jemand über eine ganze Laufbahn zugelassen hat, ab 80 Spielen',
      val:p => (p.games >= 80 && p.lossStreak > 0) ? -p.lossStreak : null,
      ev:(p,v) => `${-v} Niederlagen am Stück, mehr waren es nie · ${p.games} Partien`}},

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

  {id:'evenkeel', name:'Die Punktlandung', short:'Punktland.', ic:'scaleBalance', tone:'gold',
    art:'ereignis', zufall:'fund',
    monat:{
      art:'konstanz',
      klasse:'selten', aus:2.97,
      wie:'Erzielte und kassierte Tore über den ganzen Monat. Gemessen logarithmisch, weil die Frage „wie nah an null" ist: zwischen zwei und zwanzig Toren Unterschied liegt mehr als zwischen zwanzig und vierzig.',
      cond:'Am Monatsende höchstens 2 Tore Differenz, ab 20 Partien',
      ...(_stWertung(
        p=>p.games>=20,
        p=>-Math.log10(Math.max(Math.abs(p.gf-p.ga),1)),
        -0.3010299956639812,
        p=>`${p.gf}:${p.ga} nach ${p.games} Partien`))},
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

  {id:'fluke', name:'Der Sonntagsschuss', short:'Coup', ic:'surprise', tone:'orange', art:'ereignis', zufall:'quote',
    // Auch als Monatswertung: eine einzige Partie genuegt, und die Rechnung
    // stand dagegen. Gemessen ueber die bisherigen Monate ging sie an Platz
    // sieben und Platz zehn der Siegquote — an Leute, die von den Eintraegen,
    // die am Koennen haengen, keinen bekommen.
    allzeit:{
      // Eine einzige Partie genügt, und die Rechnung stand gegen ihn. Der
      // schwächste Spieler der Liga hat die meisten Gelegenheiten dazu —
      // das ist hier kein Fehler, sondern der Zweck.
      cond:'Der unwahrscheinlichste Sieg, den je jemand geholt hat, bei höchstens 30 % Siegchance',
      val:p => (p.flukeExp != null && p.flukeExp <= 0.30) ? 1 - p.flukeExp : null,
      ev:(p,v) => `${Math.round((1-v)*100)} % Siegchance, und trotzdem gewonnen`,
      zeit:p => p.flukeLabel || ''}},

  {id:'drought', name:'Die Durststrecke', short:'Flaute', ic:'dropTriple', tone:'red', art:'schatten',
    monat:{
      art:'schatten',
      art:'schatten',
      klasse:'legendaer', aus:2.39,
      wie:'Die längste Pleitenserie des Monats.',
      cond:'11 Niederlagen am Stück',
      ...(_stWertung(
        p=>true,
        p=>{let l=0,b=0;p.partien.forEach(s=>{if(s.win)l=0;else{l++;b=Math.max(b,l);}});return b;},
        11,
        (p,v)=>`${v} Niederlagen in Folge`))},
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

  // ═══ MONATSCHRONIKEN ══════════════════════════════════════════════
  // Keine davon fragt „wer ist der Beste". Sie fragen nach der Abweichung
  // von der Erwartung, nach Konstanz, nach dem Verhaeltnis zum Ligamittel
  // oder zu einem bestimmten anderen Spieler [§C39]. Drei weitere stehen
  // oben bei ihrer Allzeitwertung: dieselbe Frage auf zwei Zeitachsen
  // gehoert in EINE Disziplin [§13.1].

  {id:'tagesregent', name:'Der Tagesregent', short:'Regent', ic:'crownPlus', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:2.6,
      wie:'Player of the Day ist, wer an einem Spieltag die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Spieltagen.',
      cond:'An mindestens 60 % der eigenen Spieltage Player of the Day, ab 4 Spieltagen',
      ...(_stWertung(
        p=>p.days>=4,
        p=>p.potd/p.days,
        0.6,
        (p,v)=>`Player of the Day an ${p.potd} der ${p.days} Spieltage · ${pct(v)} %`))}},

  {id:'angstfrei', name:'Ohne Angstgegner', short:'Angstfrei', ic:'shieldCheck', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:2.77,
      wie:'Nicht der Lieblingsgegner zählt, sondern der unangenehmste. Gegen wen läuft es am schlechtesten, und wie schlecht ist das noch.',
      cond:'Gegen JEDEN regelmäßigen Gegner mindestens 75 %, ab 5 Gegnern mit je 4 Duellen',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).filter(a=>a.length>=4).length>=5,
        p=>Math.min(...Object.values(p.gegnerGrp).filter(a=>a.length>=4).map(a=>a.filter(s=>s.win).length/a.length)),
        0.75,
        (p,v)=>{const g=Object.values(p.gegnerGrp).filter(a=>a.length>=4);
      return `${g.length} regelmäßige Gegner, gegen keinen unter ${pct(v)} %`;}))}},

  {id:'wochenkrone', name:'Die Wochenkrone', short:'Wochenkron', ic:'crownFlame', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      // Die haerteste Chronik des Katalogs. Gemessen liegt die Schwelle
      // sechs Standardabweichungen ueber dem Feld — der beste Wert der
      // Ligageschichte sind vierzig Prozent. So weit jenseits aller
      // Messwerte sagt eine Standardabweichung nichts mehr, deshalb ist der
      // Ausschlag auf vier gedeckelt: den hoechsten, den es im Katalog
      // wirklich gibt [§C39].
      klasse:'legendaer', aus:4,
      wie:'Player of the Week ist, wer in einer Kalenderwoche die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Wochen, nicht die Zahl der Wochen.',
      cond:'In JEDER eigenen Spielwoche Player of the Week, ab 3 Wochen mit je 3 Partien',
      ...(_stWertung(
        p=>p.potwG>=3,
        p=>p.potw/p.potwG,
        1,
        (p,v)=>`Player of the Week in ${p.potw} von ${p.potwG} Wochen · ${pct(v)} %`))}},

  {id:'traumquote', name:'Der Traummonat', short:'Traummonat', ic:'crown', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:2.5,
      wie:'Die blanke Siegquote. Sie steht hier als das eine Ziel, das keine Erklärung braucht.',
      cond:'Mindestens 85 % Siegquote über den ganzen Monat',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.q,
        0.85,
        p=>`${p.wins} von ${p.games} Partien gewonnen · ${pct(p.q)} %`))}},

  {id:'nachzuegler', name:'Der Nachzügler', short:'Nachzügler', ic:'trendUp', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:2.07,
      wie:'Nicht die Monatshälften, sondern die Ränder. Dort zeigt sich eine Wende am deutlichsten.',
      cond:'In den letzten 5 Partien des Monats mindestens 3 Siege mehr als in den ersten 5',
      ...(_stWertung(
        p=>p.games>=12,
        p=>(p.partien.slice(-5).filter(s=>s.win).length-p.partien.slice(0,5).filter(s=>s.win).length)/5,
        0.6,
        p=>`${p.partien.slice(-5).filter(s=>s.win).length} von 5 zum Schluss, ${p.partien.slice(0,5).filter(s=>s.win).length} von 5 zum Auftakt`))}},

  {id:'schattenmann', name:'Der Schattenmann', short:'Zuspieler', ic:'users', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:1.95,
      wie:'Für jeden Partner wird die gemeinsame Quote mit dessen Quote ohne diesen Spieler verglichen.',
      cond:'Ein Partner gewinnt an dieser Seite mindestens 60 Prozentpunkte häufiger als ohne, ab 5 gemeinsamen Partien',
      ...(_stWertung(
        p=>true,
        (p,c)=>{let b=null;
      Object.keys(p.partnerGrp).forEach(mid=>{const z=p.partnerGrp[mid];if(z.length<ST_TEIL)return;
      const o=c.P[mid];if(!o)return;const ohne=o.partien.filter(s=>s.mate!==p.pid);if(ohne.length<ST_TEIL)return;
      const d=z.filter(s=>s.win).length/z.length-ohne.filter(s=>s.win).length/ohne.length;
      if(!b||d>b.d)b={d,mid,q:z.filter(s=>s.win).length/z.length};});
      p._sm=b;return b?b.d:null;},
        0.6,
        (p,v)=>`${pname(p._sm.mid)} gewinnt an dieser Seite ${pct(p._sm.q)} %, sonst ${pct(p._sm.q-v)} %`))}},

  {id:'zunull', name:'Die weiße Weste', short:'Weste', ic:'snowflake', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'besonders', aus:1.89,
      wie:'Ein Sieg zu null oder zu eins ist die seltenste Art zu gewinnen.',
      cond:'Mindestens 10 % der eigenen Siege mit höchstens einem Gegentor, ab 5 Siegen',
      ...(_stWertung(
        p=>p.wins>=ST_TEIL,
        p=>p.partien.filter(s=>s.win&&s.ga<=1).length/p.wins,
        0.1,
        p=>`${p.partien.filter(s=>s.win&&s.ga<=1).length} von ${p.wins} Siegen mit höchstens einem Gegentor`))}},

  {id:'ausgleich', name:'Der Ausgleicher', short:'Ausgleich', ic:'duo', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'besonders', aus:1.89,
      wie:'Nicht der beste Partner zählt, sondern der schlechteste. Es geht darum, mit wem auch immer zu bestehen.',
      cond:'Neben JEDEM Partner mindestens 60 %, ab 3 Partnern mit je 5 Partien',
      ...(_stWertung(
        p=>Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length>=3,
        p=>Math.min(...Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL)
      .map(a=>a.filter(s=>s.win).length/a.length)),
        0.6,
        (p,v)=>{const k=Object.keys(p.partnerGrp).filter(k=>p.partnerGrp[k].length>=ST_TEIL)
      .map(k=>({k,q:p.partnerGrp[k].filter(s=>s.win).length/p.partnerGrp[k].length})).sort((a,b)=>a.q-b.q)[0];
      return `selbst neben ${pname(k.k)} noch ${pct(k.q)} % · ${Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length} Partner`;}))}},

  {id:'bollwerk', name:'Das Bollwerk', short:'Bollwerk', ic:'dominator', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.87,
      wie:'Die Gegentore je Partie gegen den Schnitt aller, die in diesem Monat gespielt haben.',
      cond:'Mindestens 1,5 Gegentore je Partie unter dem Schnitt aller Spieler des Monats',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>_stMittel(Object.values(c.P).map(x=>x.ga/x.games))-p.ga/p.games,
        1.5,
        (p,v,c)=>`${(p.ga/p.games).toFixed(1)} Gegentore je Partie · Liga ${_stMittel(Object.values(c.P).map(x=>x.ga/x.games)).toFixed(1)}`))}},

  {id:'gleichauf', name:'Auf Augenhöhe', short:'Augenhöhe', ic:'weightSmall', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.81,
      wie:'Offen heißt: die Rechnung gab beiden Teams zwischen 45 und 55 Prozent. Verglichen wird die Quote darin mit der eigenen Gesamtquote.',
      cond:'In offenen Partien mindestens 20 Prozentpunkte stärker als sonst, ab 5 offenen Partien',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.exp>=0.45&&s.exp<=0.55).length>=ST_TEIL,
        p=>{const d=p.partien.filter(s=>s.exp>=0.45&&s.exp<=0.55);return d.filter(s=>s.win).length/d.length-p.q;},
        0.2,
        p=>{const d=p.partien.filter(s=>s.exp>=0.45&&s.exp<=0.55);
      return `${d.filter(s=>s.win).length} von ${d.length} offenen Partien · sonst ${pct(p.q)} %`;}))}},

  {id:'ausreisser2', name:'Der Ausreißer', short:'Ausreißer', ic:'godRay', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:1.81,
      wie:'Die Elo-Erwartung auf einen Tag zusammengezogen. Gemessen wird der Zehnerlogarithmus, weil ein Tag mit einem Prozent Wahrscheinlichkeit zehnmal unwahrscheinlicher ist als einer mit zehn.',
      cond:'Ein Spieltag, den die Rechnung mit höchstens 3 % erwartet hat, ab 4 Partien am Tag',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).some(a=>a.length>=4),
        p=>{let b=null;Object.keys(p.tagGrp).forEach(t=>{const a=p.tagGrp[t];if(a.length<4)return;
      const q=Math.max(_stPBinom(a.map(s=>s.exp),a.filter(s=>s.win).length),1e-6);
      if(!b||q<b.q)b={q,a};});p._au=b;return b?-Math.log10(b.q):null;},
        1.5228787452803376,
        (p,v)=>`${p._au.a.filter(s=>s.win).length} von ${p._au.a.length} an einem Tag · erwartet waren ${Math.round(p._au.q*1000)/10} %`))}},

  {id:'endspurt', name:'Der Endspurt', short:'Endspurt', ic:'rocket', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.79,
      wie:'Die jeweils letzte Partie jedes eigenen Spieltags. Wer sie gewinnt, geht im Plus nach Hause.',
      cond:'Mindestens 75 % der letzten Partien eines Spieltags gewonnen, ab 5 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=ST_TEIL,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return l.filter(s=>s.win).length/l.length;},
        0.75,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return `${l.filter(s=>s.win).length} von ${l.length} Tagesabschlüssen gewonnen`;}))}},

  {id:'umschwung', name:'Der Umschwung', short:'Umschwung', ic:'overtake', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.74,
      wie:'Zwei aufeinanderfolgende eigene Spieltage nebeneinander. Gesucht ist der größte Sprung nach oben.',
      cond:'Von einem Spieltag zum nächsten mindestens 65 Prozentpunkte besser, ab 4 Partien an beiden Tagen',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=4).length>=2,
        p=>{const t=Object.keys(p.tagGrp).sort().map(k=>p.tagGrp[k]).filter(a=>a.length>=4);
      let b=null;for(let i=1;i<t.length;i++){
      const x=t[i-1].filter(s=>s.win).length/t[i-1].length, y=t[i].filter(s=>s.win).length/t[i].length;
      if(!b||y-x>b.d) b={d:y-x,x,y};}
      p._um=b;return b?b.d:null;},
        0.65,
        p=>`von ${pct(p._um.x)} % auf ${pct(p._um.y)} % am nächsten Spieltag`))}},

  {id:'breitenwirkung', name:'Gegen jeden bestanden', short:'Gegen alle', ic:'target', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'besonders', aus:1.73,
      wie:'Regelmäßig heißt mindestens drei Duelle im Monat. Gemessen wird der Anteil, nicht die Anzahl, sonst gewinnt wer am meisten spielt.',
      cond:'Gegen JEDEN regelmäßigen Gegner mehr Siege als Niederlagen, ab 4 solchen Gegnern',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).filter(d=>d.length>=3).length>=4,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return r.filter(d=>d.filter(s=>s.win).length*2>d.length).length/r.length;},
        1,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return `gegen ${r.filter(d=>d.filter(s=>s.win).length*2>d.length).length} von ${r.length} regelmäßigen Gegnern im Plus`;}))}},

  {id:'kaltstart', name:'Der Kaltstart', short:'Kaltstart', ic:'sunrise', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.73,
      wie:'Die jeweils erste Partie jedes eigenen Spieltags. Ohne Aufwärmen.',
      cond:'Mindestens 85 % der ersten Partien eines Spieltags gewonnen, ab 5 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=ST_TEIL,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[0]);return l.filter(s=>s.win).length/l.length;},
        0.85,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[0]);return `${l.filter(s=>s.win).length} von ${l.length} Auftaktpartien gewonnen`;}))}},

  {id:'aufholjagd', name:'Die Antwort', short:'Antwort', ic:'rematch', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'besonders', aus:1.71,
      wie:'Nur die Partien, die auf eine Pleite folgen. Gemessen wird der Anteil, nicht die längste Serie, sonst gewinnt wer am meisten spielt.',
      cond:'Mindestens 80 % der Partien direkt nach einer Niederlage gewonnen, ab 5 Gelegenheiten',
      ...(_stWertung(
        p=>_stNachPleite(p).length>=ST_TEIL,
        p=>{const d=_stNachPleite(p);return d.filter(s=>s.win).length/d.length;},
        0.8,
        p=>{const d=_stNachPleite(p);return `${d.filter(s=>s.win).length} von ${d.length} Antworten nach einer Pleite`;}))}},

  {id:'favschreck', name:'Der Favoritenschreck', short:'Schreck', ic:'giantSlayer', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.7,
      wie:'Klarer Favorit heißt: das gegnerische Team hatte vorher mindestens 65 Prozent Siegchance.',
      cond:'Mindestens 40 % gegen klare Favoriten, ab 5 solchen Partien',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.exp<=0.35).length>=ST_TEIL,
        p=>{const d=p.partien.filter(s=>s.exp<=0.35);return d.filter(s=>s.win).length/d.length;},
        0.4,
        p=>{const d=p.partien.filter(s=>s.exp<=0.35);return `${d.filter(s=>s.win).length} von ${d.length} gegen klare Favoriten`;}))}},

  {id:'formgipfel', name:'Der Formgipfel', short:'Formgipfel', ic:'chartUp', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:1.67,
      wie:'Jeder Fünferblock des Monats wird gegen die eigene Monatsquote gestellt. Gesucht ist der beste.',
      cond:'Ein Block aus 5 Partien mindestens 55 Prozentpunkte über dem eigenen Monatsschnitt',
      ...(_stWertung(
        p=>p.games>=10,
        p=>{let b=-9;for(let i=0;i+5<=p.games;i++){const q=p.partien.slice(i,i+5).filter(s=>s.win).length/5;if(q-p.q>b)b=q-p.q;}return b;},
        0.55,
        (p,v)=>`${Math.round((p.q+v)*5)} von 5 am Stück · sonst ${pct(p.q)} %`))}},

  {id:'unmoeglich', name:'Der Unmögliche Monat', short:'Unmöglich', ic:'diamond', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:1.57,
      wie:'Die Rechnung gab vor jeder Partie eine Siegchance. Daraus folgt, wie wahrscheinlich der ganze Monat so oder besser ausgeht.',
      cond:'Ein Monat, den die Elo-Rechnung mit höchstens 2 % erwartet hat',
      ...(_stWertung(
        p=>p.games>=8,
        p=>1-_stPBinom(p.exp,p.wins),
        0.98,
        (p,v)=>`${p.wins} von ${p.games} Siegen · erwartet waren ${pct(1-v)} %`))}},

  {id:'schwachstelle', name:'Ohne Schwachstelle', short:'Ohne Lücke', ic:'kingClass', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'legendaer', aus:1.57,
      wie:'Fünf Teilquoten desselben Monats, und gewertet wird die schwächste davon. Der Katalog belohnt sonst überall einen Ausschlag; hier zählt, dass es nirgends einen Einbruch gibt.',
      cond:'In allen fünf Lagen mindestens 50 %: vorne, hinten, gegen die Stärkeren, in engen Partien und nach einer Niederlage, ab 5 Partien je Lage',
      ...(_stWertung(
        (p,c)=>_stLagen(p,c)!=null,
        (p,c)=>{const q=_stLagen(p,c);return q?Math.min(...Object.values(q)):null;},
        0.5,
        (p,v,c)=>{const q=_stLagen(p,c);
      return `vorne ${pct(q.vorne)} %, hinten ${pct(q.hinten)} %, gegen oben ${pct(q.oben)} %, `
      +`eng ${pct(q.eng)} %, nach Pleite ${pct(q.antwort)} %`;}))}},

  {id:'deutlich', name:'Der Deutliche', short:'Deutlich', ic:'plusMinus', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.54,
      wie:'Die eigene Tordifferenz je Partie. Sie sagt mehr als die Siegquote, weil auch die Höhe zählt.',
      cond:'Mindestens 2 Tore Differenz je Partie',
      ...(_stWertung(
        p=>p.games>=8,
        p=>(p.gf-p.ga)/p.games,
        2,
        (p,v)=>`${v>0?'+':''}${v.toFixed(1)} Tore je Partie · ${p.gf}:${p.ga}`))}},

  {id:'steigerung', name:'Die Steigerung', short:'Steigerung', ic:'climb', tone:'gold', art:'leistung',
    monat:{
      art:'koennen',
      klasse:'selten', aus:1.53,
      wie:'Die Spieltage des Monats werden in der Mitte geteilt und die beiden Quoten desselben Spielers verglichen.',
      cond:'In der zweiten Hälfte des Monats mindestens 25 Prozentpunkte stärker als in der ersten, ab 4 Partien je Hälfte',
      ...(_stWertung(
        p=>_stHaelften(p)!=null,
        p=>{const h=_stHaelften(p);return h?h.q2-h.q1:null;},
        0.25,
        p=>{const h=_stHaelften(p);return `${pct(h.q2)} % in der zweiten Hälfte, ${pct(h.q1)} % in der ersten`;}))}},

  {id:'schwachewoche', name:'Ohne schwache Woche', short:'Jede Woche', ic:'weekly', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'selten', aus:2.68,
      wie:'Der Monat wird in Kalenderwochen geteilt, und gewertet wird die schwächste gegen den eigenen Monatsschnitt. Nicht das Niveau zählt, sondern dass es nie einbrach. Gemessen logarithmisch, weil die Frage „wie nah an null" ist.',
      cond:'Auch in der schwächsten Kalenderwoche höchstens 2 Prozentpunkte unter der eigenen Monatsquote, ab 3 Wochen mit je 5 Partien',
      ...(_stWertung(
        p=>_stWochen(p).length>=3,
        p=>{const m=Math.min(..._stWochen(p).map(a=>a.filter(s=>s.win).length/a.length));
      return -Math.log10(Math.max(p.q-m,0.005));},
        1.6989700043360187,
        p=>{const W=_stWochen(p), m=Math.min(...W.map(a=>a.filter(s=>s.win).length/a.length));
      return `${W.length} Wochen, die schwächste bei ${pct(m)} % · Monat ${pct(p.q)} %`;}))}},

  {id:'punktgenau2', name:'Der Erwartungstreue', short:'Erwartung', ic:'stopwatch', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'selten', aus:2.46,
      wie:'Der Abstand zwischen der eigenen Quote und dem, was die Rechnung vorher auswies. Gemessen wird logarithmisch, weil die Frage „wie nah an null" ist: zwischen einem halben und drei Prozentpunkten liegt mehr als zwischen drei und achtzehn.',
      cond:'Die eigene Quote liegt am Monatsende höchstens 0,5 Prozentpunkte neben der Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>-Math.log10(Math.max(Math.abs(p.q-p.expQ),0.0005)),
        2.3010299956639813,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))}},

  {id:'schwaechstertag', name:'Der schwächste Tag', short:'Jeder Tag', ic:'calendar', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'legendaer', aus:2.4,
      wie:'Nicht der beste Tag zählt, sondern der schlechteste. Ein Ausrutscher genügt, um die Chronik zu verlieren.',
      cond:'Auch am schwächsten eigenen Spieltag noch mindestens 60 %, ab 5 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=5,
        p=>Math.min(...Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>a.filter(s=>s.win).length/a.length)),
        0.6,
        (p,v)=>{const t=Object.values(p.tagGrp).filter(a=>a.length>=3);
      return `${t.length} Spieltage, keiner unter ${pct(v)} %`;}))}},

  {id:'metronom', name:'Das Metronom', short:'Metronom', ic:'clock', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'selten', aus:2.25,
      wie:'Für jeden Spieltag steht eine Tagesquote. Gemessen wird die Spanne dazwischen.',
      cond:'Zwischen bestem und schwächstem Spieltag höchstens 15 Prozentpunkte, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=3,
        p=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>a.filter(s=>s.win).length/a.length);
      return -(Math.max(...q)-Math.min(...q));},
        -0.15,
        (p,v)=>`${pct(-v)} %-Punkte zwischen bestem und schwächstem Tag`))}},

  {id:'beidseitig', name:'Der Beidfüßige', short:'Beidfüßig', ic:'sort', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'selten', aus:2.01,
      wie:'Die Quote im Sturm und die in der Abwehr, beide gegen die eigene Gesamtquote. Gemessen logarithmisch: nah an null ist die Aussage, und ein halber Prozentpunkt ist etwas anderes als fünf.',
      cond:'Auf beiden Positionen höchstens 1 Prozentpunkt neben der eigenen Gesamtquote, ab 5 Partien je Position',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.pos==='atk').length>=ST_TEIL&&p.partien.filter(s=>s.pos==='def').length>=ST_TEIL,
        p=>{const a=p.partien.filter(s=>s.pos==='atk'),d=p.partien.filter(s=>s.pos==='def');
      const m=Math.max(Math.abs(a.filter(s=>s.win).length/a.length-p.q),
      Math.abs(d.filter(s=>s.win).length/d.length-p.q));
      return -Math.log10(Math.max(m,0.0005));},
        2,
        p=>{const a=p.partien.filter(s=>s.pos==='atk'),d=p.partien.filter(s=>s.pos==='def');
      return `${pct(a.filter(s=>s.win).length/a.length)} % vorne, ${pct(d.filter(s=>s.win).length/d.length)} % hinten`;}))}},

  {id:'kopfhoch', name:'Der Tagesabschluss', short:'Tagesende', ic:'thumbsUp', tone:'blue', art:'leistung',
    monat:{
      art:'konstanz',
      klasse:'besonders', aus:1.64,
      wie:'Ein Tag zählt, wenn am Ende mindestens so viele Siege wie Niederlagen stehen.',
      cond:'An mindestens 100 % der eigenen Spieltage eine ausgeglichene oder positive Bilanz, ab 3 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=3,
        p=>{const t=Object.values(p.tagGrp);return t.filter(a=>a.filter(s=>s.win).length*2>=a.length).length/t.length;},
        1,
        p=>{const t=Object.values(p.tagGrp);return `${t.filter(a=>a.filter(s=>s.win).length*2>=a.length).length} von ${t.length} Spieltagen nicht negativ`;}))}},

  {id:'zitterkoenig', name:'Der Zitterkönig', short:'Zittersieg', ic:'brokenHeart', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'legendaer', aus:3.84,
      wie:'Knapp heißt höchstens zwei Tore Vorsprung. Gezählt wird der Anteil an den eigenen Siegen, nicht an allen Partien.',
      cond:'JEDER einzelne Sieg des Monats war knapp, ab 6 Siegen',
      ...(_stWertung(
        p=>p.wins>=6,
        p=>p.partien.filter(s=>s.win&&s.gf-s.ga<=2).length/p.wins,
        1,
        p=>`${p.partien.filter(s=>s.win&&s.gf-s.ga<=2).length} von ${p.wins} Siegen waren knapp`))}},

  {id:'nervenkitzel', name:'Der Nervenkitzel', short:'Nervenkitz', ic:'cone', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'besonders', aus:3.62,
      wie:'Eng heißt höchstens zwei Tore Unterschied. Verglichen wird der eigene Anteil mit dem der ganzen Liga.',
      cond:'Mindestens 35 Prozentpunkte mehr enge Partien als im Ligaschnitt',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>p.partien.filter(_stEng).length/p.games-c.L.engAnteil,
        0.35,
        (p,v,c)=>`${pct(p.partien.filter(_stEng).length/p.games)} % enge Partien · Liga ${pct(c.L.engAnteil)} %`))}},

  {id:'ausbruch', name:'Der Ausbruch', short:'Ausbruch', ic:'lock', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'legendaer', aus:2.78,
      wie:'Gegen manche läuft es über Monate nicht. Gezählt wird die längste Pleitenserie gegen einen Gegner, die in diesem Monat gebrochen wurde.',
      cond:'Einen Gegner besiegt, gegen den zuvor 17 Duelle in Folge verloren gingen',
      ...(_stWertung(
        p=>true,
        (p,c)=>p.bannLauf,
        17,
        (p,v)=>`nach ${v} Pleiten in Folge gegen denselben Gegner wieder gewonnen`))}},

  {id:'spezialisiert', name:'Der Spezialist', short:'Spezialist', ic:'pinch', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'selten', aus:2.69,
      wie:'Dasselbe andersherum. Groß heißt einseitig, nicht gut.',
      cond:'Auf einer Position mindestens 50 Prozentpunkte besser als auf der anderen, ab 5 Partien je Position',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.pos==='atk').length>=ST_TEIL&&p.partien.filter(s=>s.pos==='def').length>=ST_TEIL,
        p=>{const a=p.partien.filter(s=>s.pos==='atk'),d=p.partien.filter(s=>s.pos==='def');
      return Math.abs(a.filter(s=>s.win).length/a.length-d.filter(s=>s.win).length/d.length);},
        0.5,
        (p,v)=>{const a=p.partien.filter(s=>s.pos==='atk'),d=p.partien.filter(s=>s.pos==='def');
      return `${pct(v)} %-Punkte Unterschied, stärker ${a.filter(s=>s.win).length/a.length>d.filter(s=>s.win).length/d.length?'vorne':'hinten'}`;}))}},

  {id:'torhagel', name:'Der Torhagel', short:'Torhagel', ic:'crashDay', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'besonders', aus:2.54,
      wie:'Der Torschnitt der eigenen Partien gegen den aller Partien desselben Monats.',
      cond:'In den eigenen Partien fallen mindestens 1 Tore mehr als im Ligaschnitt des Monats',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>(p.gf+p.ga)/p.games-c.L.torSchnitt,
        1,
        (p,v,c)=>`${((p.gf+p.ga)/p.games).toFixed(1)} Tore je Partie · Liga ${c.L.torSchnitt.toFixed(1)}`))}},

  {id:'lieblingszahl', name:'Die Lieblingszahl', short:'Lieblingsz', ic:'hundred', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'selten', aus:2.41,
      wie:'Das häufigste Ergebnis der eigenen Partien und der Anteil daran.',
      cond:'Ein und dasselbe Ergebnis in mindestens 25 % der eigenen Partien, ab 12 Partien',
      ...(_stWertung(
        p=>p.games>=12,
        p=>{const n={};p.partien.forEach(s=>{const k=s.gf+':'+s.ga;n[k]=(n[k]||0)+1;});
      const b=Object.keys(n).sort((a,b)=>n[b]-n[a])[0];p._lz={k:b,n:n[b]};return n[b]/p.games;},
        0.25,
        (p,v)=>`${p._lz.n}× ${p._lz.k} · ${pct(v)} % aller Partien`))}},

  {id:'wechselhaft', name:'Der Wechselhafte', short:'Wechselh.', ic:'weatherMix', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'selten', aus:1.96,
      wie:'Das Gegenstück zum Metronom. Gemessen wird die Streuung der Tagesquoten um den eigenen Monatsschnitt: groß heißt, kein Tag sah aus wie der andere.',
      cond:'Die Tagesquoten streuen mindestens 25 Prozentpunkte um die eigene Monatsquote, ab 5 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>Object.values(p.tagGrp).filter(a=>a.length>=3).length>=5,
        p=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>a.filter(s=>s.win).length/a.length);
      return Math.sqrt(q.reduce((x,y)=>x+(y-p.q)*(y-p.q),0)/q.length);},
        0.25,
        (p,v)=>{const q=Object.values(p.tagGrp).filter(a=>a.length>=3).map(a=>a.filter(s=>s.win).length/a.length);
      return `${pct(Math.min(...q))} % am schwächsten, ${pct(Math.max(...q))} % am stärksten Tag`;}))}},

  {id:'kontrast', name:'Der Kontrast', short:'Kontrast', ic:'chartBar', tone:'purple', art:'ereignis',
    monat:{
      art:'fuegung',
      klasse:'legendaer', aus:1.51,
      wie:'Die Spanne zwischen der Quote neben dem stärksten und der neben dem schwächsten Partner.',
      cond:'Zwischen bestem und schwächstem Partner mindestens 80 Prozentpunkte, ab 3 Partnern mit je 5 Partien',
      ...(_stWertung(
        p=>Object.values(p.partnerGrp).filter(a=>a.length>=ST_TEIL).length>=3,
        p=>{const q=Object.keys(p.partnerGrp).filter(k=>p.partnerGrp[k].length>=ST_TEIL)
      .map(k=>({k,q:p.partnerGrp[k].filter(s=>s.win).length/p.partnerGrp[k].length})).sort((a,b)=>b.q-a.q);
      p._ko=q;return q[0].q-q[q.length-1].q;},
        0.8,
        p=>`${pct(p._ko[0].q)} % neben ${pname(p._ko[0].k)}, ${pct(p._ko[p._ko.length-1].q)} % neben ${pname(p._ko[p._ko.length-1].k)}`))}},

  {id:'angstgegner', name:'Der Angstgegner', short:'Angstgegn.', ic:'devilMask', tone:'red', art:'schatten',
    monat:{
      art:'schatten',
      klasse:'besonders', aus:2.05,
      wie:'Der Gegner, gegen den im Monat am wenigsten zu holen war. Acht Duelle, damit es kein Ausrutscher ist.',
      cond:'Gegen einen Gegner mit mindestens 8 Duellen keinen einzigen Sieg',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).some(a=>a.length>=8),
        p=>{let b=null;Object.keys(p.gegnerGrp).forEach(g=>{const d=p.gegnerGrp[g];if(d.length<8)return;
      const q=d.filter(s=>s.win).length/d.length;if(!b||q<b.q)b={q,g,n:d.length,w:d.filter(s=>s.win).length};});
      p._ag=b;return b?-b.q:null;},
        0,
        p=>`${p._ag.w} von ${p._ag.n} gegen ${pname(p._ag.g)}`))}},

  {id:'untersoll', name:'Das Untersoll', short:'Untersoll', ic:'chartDown', tone:'red', art:'schatten',
    monat:{
      art:'schatten',
      klasse:'besonders', aus:1.81,
      wie:'Dieselbe Rechnung wie beim Übersoll, nur andersherum.',
      cond:'Mindestens 20 Prozentpunkte unter der eigenen Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.expQ-p.q,
        0.2,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))}}
];

// Die beiden Wertungen als eigene Listen — die Engines darunter bleiben
// unverändert. Wer eine Disziplin ohne `monat` anlegt, taucht in der
// Saison-Tafel nicht auf; wer keine `allzeit` hat, hat keinen Rekord.
// Die Monatschroniken haben ihre eigene Wertigkeit und stehen deshalb nicht
// in der Reihenfolge des Katalogs: drei von ihnen sitzen oben bei ihrer
// Allzeitwertung, weil dieselbe Frage auf zwei Zeitachsen in EINE Disziplin
// gehoert. Sortiert wird nach Art und darin nach dem Ausschlag der Schwelle —
// das ist dieselbe Ordnung, in der auch das Prestige faellt [§C39].
const _STA = {leistung:0, ereignis:1, schatten:2};
const _STK = {koennen:0, konstanz:1, fuegung:2, schatten:3};
const SEASON_TITLES = DISZIPLINEN.filter(d => d.monat)
  .sort((a, b) => _STA[a.art] - _STA[b.art]
               || _STK[a.monat.art] - _STK[b.monat.art]
               || (b.monat.aus || 0) - (a.monat.aus || 0))
  .map(d => ({
    id:d.id, name:d.name, short:d.short, ic:d.ic, tone:d.tone, art:d.art,
    kunst:d.monat.art, klasse:d.monat.klasse, aus:d.monat.aus,
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
//
// Die Schwellen sind an den echten Partien geeicht, nicht geschaetzt, und sie
// folgen einer Regel: EINE MONATSWERTUNG TRIFFT IN VIER MONATEN HOECHSTENS
// ZWEIMAL ZU. Vorher lagen sie so niedrig, dass in einem Monat vierundzwanzig
// der vierunddreissig Wertungen vergeben wurden — drei Viertel des Katalogs,
// jeden Monat neu, und ein einzelner Spieler trug neun davon. Was fast jeder
// Monat hergibt, ist keine Auszeichnung mehr, sondern eine Zeile im Protokoll.
// Mit der Regel bleiben siebzehn bis zweiundzwanzig je Monat, und jede steht
// fuer eine Leistung, die es in der Ligageschichte erst ein- oder zweimal gab.
// `tests/disziplinen` zaehlt es nach; ein rotes Ergebnis nennt die Wertung,
// deren Schwelle zu tief haengt.
function _stWertung(mind, wert, ab, ev){
  return {
    mind, wert, ab, ev,
    // `mind` und `wert` bekommen den Kontext mit: mehrere Chroniken stellen
    // den eigenen Wert gegen das Ligamittel desselben Monats oder gegen die
    // uebrigen Spieler, und das steht nur im Kontext.
    pick:(C, t)=>_stPickTop(C, t, p=>{
      if(!mind(p, C)) return null;
      const v = wert(p, C);
      return (v != null && isFinite(v) && v >= ab) ? v : null;
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
    if(!w.mind(p, C)) return;
    const v = w.wert(p, C);
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

