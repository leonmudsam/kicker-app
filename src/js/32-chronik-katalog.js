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
// Wie Klasse und Art einer Monatschronik heißen, wenn sie jemand liest.
// Sie stehen an einer Stelle, weil sie in vier Ansichten auftauchen: auf der
// Plakette, im Chronik-Blatt, in der Laufbahn und in der Nachricht. Vorher
// stand in der Laufbahn „Leistung" — die Art der DISZIPLIN, nicht die der
// Chronik, und den Wert trägt seit §C39 die der Chronik.
const CHRONIK_KLASSE_NAME = {legendaer:'legendär', selten:'selten', besonders:'besonders'};
const CHRONIK_ART_NAME = {koennen:'Können', konstanz:'Konstanz',
                          fuegung:'Fügung', schatten:'Schattenseite'};

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

// Favorit und Augenhoehe aus der Sicht einer einzelnen Partie. Die Grenzen
// stehen bei der Elo-Rechnung, die sie zieht [§5.2]; hier standen sie als
// blanke Zahl an fuenf Stellen, zwei davon in den zwei getrennten
// Durchlaeufen ueber dieselbe Frage — und die muessen gleich zaehlen, sonst
// zeigt die Monatstafel einen anderen Halter als der Liga-Rekord [§10.2].
const _stFavorit = s => s.exp > CHANCE_FAVORIT;
const _stAugenhoehe = s => s.exp >= CHANCE_OFFEN && s.exp <= CHANCE_FAVORIT;

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
// Die Streuung einer Reihe von Zahlen. „Der Gleichmut" fragt nicht nach der
// Hoehe der Tordifferenz, sondern danach, wie weit sie um ihr eigenes Mittel
// schwankt — dafuer reicht kein Mittelwert.
const _stStreu = a => {
  const m = _stMittel(a);
  return Math.sqrt(_stMittel(a.map(x => (x - m) * (x - m))));
};
// Die Siegquote einer Teilmenge von Partien. Stand achtmal als
// `a.filter(s=>s.win).length/a.length` in der Datei.
const _stQuote = a => a.length ? a.filter(s => s.win).length / a.length : 0;
// Wochen mit genug Partien fuer eine Wahrscheinlichkeitsrechnung. `_stWochen`
// nimmt fuenf; unter sechs ist eine ganze Woche kaum unwahrscheinlich zu
// nennen, weil schon vier Siege in Folge eine Woche fuellen.
const _stWochGross = p => Object.values(p.wochGrp).filter(a => a.length >= 6);
// Die ersten drei Partien eines Spieltags gegen alles danach. Der Vergleich
// laeuft innerhalb desselben Tages, damit nicht zwei verschiedene Wochen
// gegeneinander stehen.
function _stTagBlock(p){
  const frueh = [], spaet = [];
  Object.values(p.tagGrp).forEach(a => {
    a.forEach((s, i) => (i < 3 ? frueh : spaet).push(s));
  });
  return {frueh, spaet};
}
// Die Partie direkt nach ZWEI Pleiten am Stueck. Nach einer fragt schon
// „Die Antwort"; zwei sind die Stelle, an der ein Tag kippt.
const _stNachZwei = p => p.partien.filter((s, i) =>
  i >= 2 && !p.partien[i-1].win && !p.partien[i-2].win);
// Die letzte Partie jeder Kalenderwoche, in der ueberhaupt gespielt wurde.
const _stWochLetzte = p => Object.values(p.wochGrp)
  .filter(a => a.length >= 3).map(a => a[a.length - 1]);
// Partien als klarer Favorit und als Aussenseiter. Die Grenzen sind
// dieselben wie im Rest des Katalogs.
const _stRollen = p => ({
  fav: p.partien.filter(_stFavorit),
  aus: p.partien.filter(s => s.exp < CHANCE_OFFEN)
});
// Partien, die mit genau einem Tor Unterschied endeten: der letzte Ball hat
// entschieden. `_stEng` nimmt zwei — das ist eine andere Frage.
const _stEinTor = p => p.partien.filter(s => Math.abs(s.gf - s.ga) === 1);

function _stHaelften(p){
  const tage = Object.keys(p.tagGrp).sort();
  if(tage.length < 4) return null;
  const mitte = tage[Math.floor(tage.length / 2)];
  const e1 = p.partien.filter(s => s.tag < mitte), e2 = p.partien.filter(s => s.tag >= mitte);
  if(e1.length < 4 || e2.length < 4) return null;
  return {q1: e1.filter(s => s.win).length / e1.length,
          q2: e2.filter(s => s.win).length / e2.length};
}

// Die letzten zehn Partien gegen ALLE davor. Nicht gegen die Gesamtquote:
// die enthaelt das Fenster selbst, und dann zaehlt es doppelt. Ein GESUCHTES
// Maximum aus allen Zehnerbloecken taugt dafuer nicht — wer dreihundert
// Partien hat, hat 291 Ziehungen und wer zwanzig hat, hat elf, und das
// Maximum aus vielen Ziehungen ist groesser [§C39]. Das letzte Fenster liegt
// fest, also gibt es keinen Auswahlvorteil.
function _stLetzteZehn(p){
  if(p.games < 20) return null;
  const drin = p.partien.slice(-10), raus = p.partien.slice(0, p.games - 10);
  return {d: _stQuote(drin) - _stQuote(raus), drin: _stQuote(drin),
          raus: _stQuote(raus), vor: raus.length};
}

// Die zeitlich letzte Partie jedes eigenen Spieltags gegen alle anderen
// dieses Tages. Drei Partien je Tag, damit „die letzte" ueberhaupt eine
// Auswahl ist. Der Vergleich laeuft INNERHALB des Tages, sonst stehen zwei
// verschiedene Wochen gegeneinander.
function _stSchlussBall(p, mindTage){
  const tage = Object.keys(p.tagGrp).filter(t => p.tagGrp[t].length >= 3);
  if(tage.length < mindTage) return null;
  const letzte = [], rest = [];
  tage.forEach(t => { const a = p.tagGrp[t];
    letzte.push(a[a.length - 1]); rest.push(...a.slice(0, -1)); });
  if(!rest.length) return null;
  return {d: _stQuote(letzte) - _stQuote(rest), drin: _stQuote(letzte),
          raus: _stQuote(rest), n: letzte.length};
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
      kammer:'mark', basis:100,
      zeitraum:'Ein einzelner Monat',
      mind:'15 Partien im Monat und 60 % Siegquote',
      wie:'Gewertet wird der beste einzelne Monat einer Laufbahn und nicht der Schnitt über alle Monate. Monate mit weniger als fünfzehn eigenen Partien bleiben außen vor.',
      cond:'Höchste Siegquote in einem einzelnen Monat, ab 15 Partien in diesem Monat und mindestens 60 %',
      val:p => (p.bestMonth && p.bestMonth.q >= 0.60) ? p.bestMonth.q : null,
      ev:(p,v) => `${Math.round(v*100)} % aus ${p.bestMonth.g} Spielen`,
      zeit:p => p.bestMonth ? seasonLabel(p.bestMonth.sid) : ''
    }},

  {id:'daylord', name:'Der Platzhirsch', short:'Revier', ic:'dayKing', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'mark', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'12 eigene Spieltage und 25 %',
      wie:'Player of the Day ist, wer an einem Spieltag die beste Siegquote hat; bei Gleichstand entscheidet der Elo-Gewinn des Tages. Der Nenner sind die Spieltage, an denen der Spieler selbst angetreten ist, und nicht alle Spieltage der Liga.',
      cond:'Höchster Anteil eigener Spieltage als Player of the Day, ab 12 Spieltagen und mindestens 25 %',
      val:p => (p.days >= 12 && p.potd/p.days >= 0.25) ? p.potd/p.days : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.days} Spieltage beherrscht · ${p.potd}× Player of the Day`
    }},

  // Dieselbe Frage wie beim Platzhirsch, eine Zeitebene hoeher — und dieselbe
  // Zeichnung wie die Wochenkoenig-Kachel im Awards-Reiter [§C27]: Player of
  // the Week ist dasselbe Ereignis, egal wo es steht. Nur `allzeit`: ein Monat
  // hat vier Wochen, und ein Anteil aus vier Werten misst nichts [§10.2].
  {id:'weeklord', name:'Der Wochenherr', short:'Wochenherr', ic:'weekKing', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'mark', basis:100,
      zeitraum:'Ganze Laufbahn, je Woche',
      mind:'10 eigene Wochen und 25 %',
      wie:'Player of the Week ist, wer eine Woche mit der besten Bilanz abschließt. Der Nenner sind die abgeschlossenen Wochen, in denen der Spieler selbst angetreten ist.',
      cond:'Höchster Anteil eigener Wochen als Player of the Week, ab 10 Wochen und mindestens 25 %',
      val:p => (p.weeks >= 10 && p.potw/p.weeks >= 0.25) ? p.potw/p.weeks : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.weeks} Wochen gewonnen · ${p.potw}× Player of the Week`
    }},

  {id:'spotless', name:'Der makellose Tag', short:'Makellos', ic:'trophyDay', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Makellose',
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
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je voller Spieltag',
      mind:'8 volle Spieltage',
      wie:'Ein voller Spieltag sind vier oder mehr eigene Partien an einem Tag. Der Nenner sind alle vollen Spieltage, der Zähler die darunter, an denen keine Partie verloren ging.',
      cond:'Höchster Anteil voller Spieltage ohne Niederlage, ab 8 vollen Spieltagen',
      val:p => p.bigDays >= 8 ? p.perfDays/p.bigDays : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.bigDays} vollen Spieltage ohne eine einzige Niederlage · ${p.perfDays} Tage`
    }},

  {id:'kopfhoch', name:'Der Tagesabschluss', short:'Tagesende', ic:'thumbsUp', tone:'blue', art:'leistung',
    // Dieselbe Frage wie im Monat, eine Zeitachse hoeher [§13.1]. „Der
    // makellose Tag" daneben verlangt einen Tag OHNE jede Niederlage und
    // zaehlt nur volle Spieltage ab drei Partien; ein Tag mit 2:1 ist dort
    // keiner und hier schon. Der Anteil kennt die Spielzahl nicht: wer an
    // zwanzig Tagen dabei war, wird an zwanzig gemessen [§C35].
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'15 eigene Spieltage',
      wie:'Ein Tag zählt, wenn am Ende mindestens so viele Siege wie Niederlagen stehen. Der Nenner sind alle eigenen Spieltage, nicht die Partien und nicht der Kalender.',
      cond:'Höchster Anteil eigener Spieltage ohne negative Bilanz, ab 15 eigenen Spieltagen',
      val:p => p.taN >= 15 ? p.taOk / p.taN : null,
      ev:(p,v) => `${Math.round(v*100)} % der Spieltage nicht im Minus · ${p.taOk} von ${p.taN}`
    },
    monat:{
      beiname:'Der Gefestigte',
      art:'konstanz',
      klasse:'besonders', aus:1.64,
      wie:'Ein Tag zählt, wenn am Ende mindestens so viele Siege wie Niederlagen stehen.',
      cond:'An mindestens 100 % der eigenen Spieltage eine ausgeglichene oder positive Bilanz, ab 3 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=3,
        p=>{const t=Object.values(p.tagGrp);return t.filter(a=>a.filter(s=>s.win).length*2>=a.length).length/t.length;},
        1,
        p=>{const t=Object.values(p.tagGrp);return `${t.filter(a=>a.filter(s=>s.win).length*2>=a.length).length} von ${t.length} Spieltagen nicht negativ`;}))}},

  {id:'catalyst', name:'Der Katalysator', short:'Katalyse', ic:'handshake', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100,
      zeitraum:'Ganze Laufbahn, je Partner',
      mind:'3 Partner mit je 15 gemeinsamen Partien',
      wie:'Für jeden Partner werden zwei Siegquoten gerechnet: die aus den gemeinsamen Partien und die aus allen übrigen Partien dieses Partners. Die Differenzen werden nach der Zahl gemeinsamer Partien gewichtet gemittelt. Wer fast alles mitspielt, ist selbst der Vergleichswert und kommt damit nicht nach vorne.',
      cond:'Größter positiver Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
      val:p => (p.einflussN >= 3 && p.einflussD != null && p.einflussD > 0) ? p.einflussD : null,
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte gewinnen die ${p.einflussN} Partner an dieser Seite häufiger`
    }},

  {id:'ausgleich', name:'Der Ausgleicher', short:'Ausgleich', ic:'duo', tone:'gold', art:'leistung',
    // Die Laufbahn-Achse derselben Frage [§13.1]. „Der Katalysator" darueber
    // misst, wie viel die Partner NEBEN diesem Spieler gewinnen, verglichen
    // mit ohne; hier geht es um die eigene Quote, und der Vergleich laeuft
    // zwischen den Partnern statt gegen deren Laufbahn. Kein zweiter Name im
    // Beleg: das Podest zeigt den Halter, und ein fremder Name daneben liest
    // sich wie dessen Rekord.
    allzeit:{
      kammer:'koennen', basis:100,
      zeitraum:'Ganze Laufbahn, je Partner',
      mind:'3 Partner mit je 15 gemeinsamen Partien',
      wie:'Für jeden Partner mit mindestens fünfzehn gemeinsamen Partien wird die gemeinsame Siegquote gerechnet. Gewertet wird die niedrigste davon. Nicht der beste Partner zählt, sondern der schwierigste.',
      cond:'Beste Siegquote neben dem eigenen schwierigsten Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
      val:p => (p.agQ != null && p.agN >= 3) ? p.agQ : null,
      ev:(p,v) => `${Math.round(v*100)} % neben dem schwierigsten Partner · ${p.agN} Partner ab 15 Partien`
    },
    monat:{
      beiname:'Der Verlässliche',
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

  {id:'clutch', name:'Die ruhige Hand', short:'Nerven', ic:'nerves', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle engen Partien',
      mind:'15 enge Partien',
      wie:'Eng ist eine Partie mit höchstens zwei Toren Unterschied. Verglichen wird die Siegquote dieser Partien mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten.',
      cond:'Größter Leistungssprung in engen Partien, ab 15 engen Partien',
      val:p => {
        if(p.close < 15) return null;
        const rest = p.games - p.close;
        if(rest < 1) return null;
        const d = (p.closeW/p.close) - ((p.wins - p.closeW)/rest);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte in engen Spielen · ${pct(p.closeW/p.close)} statt ${pct((p.wins-p.closeW)/(p.games-p.close))} % sonst`
    }},

  // Dieselbe Teilmenge wie „Die ruhige Hand" darueber, und deshalb steht er
  // hier [§C35] — aber eine andere Frage: die ruhige Hand misst den SPRUNG
  // gegenueber den uebrigen Partien, der Entscheider die Quote selbst. Wer in
  // engen Partien so gut ist wie sonst, hat dort keinen Sprung und kann
  // trotzdem der Beste sein; und wer sonst schwach ist, macht mit einem
  // Sprung noch keine gute Quote. Zwei Namen fuer zwei Aussagen.
  {id:'entscheider', name:'Der Entscheider', short:'Entscheid', ic:'coinFlip', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle engen Partien',
      mind:'15 enge Partien',
      wie:'Eng ist eine Partie mit höchstens zwei Toren Unterschied. Der Nenner sind genau diese Partien und nicht alle: wie viele enge Partien jemand hatte, ändert den Wert nicht.',
      cond:'Höchste Siegquote in engen Partien, ab 15 engen Partien',
      val:p => p.close >= 15 ? p.closeW / p.close : null,
      ev:(p,v) => `${pct(v)} % in engen Partien gewonnen · ${p.closeW} von ${p.close}`
    }},

  {id:'gleichauf', name:'Auf Augenhöhe', short:'Auf Höhe', ic:'weightSmall', tone:'gold', art:'leistung',
    // Die Laufbahn-Achse derselben Frage [§13.1]. „Die ruhige Hand" darueber
    // nimmt die ENGEN Partien, also die nach dem Ergebnis knappen: offen ist
    // eine Aussage ueber den Anpfiff, eng eine ueber den Abpfiff. Verglichen
    // wird gegen die eigene Gesamtquote, also messen alle gegen ihr eigenes
    // Niveau und nicht gegeneinander [§C38].
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle offenen Partien',
      mind:'20 ausgeglichen erwartete Partien',
      wie:'Ausgeglichen heißt: die Elo-Rechnung gab beiden Teams zwischen 45 und 55 Prozent Siegchance. Verglichen wird die Siegquote in diesen Partien mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten.',
      cond:'Größter Leistungssprung in ausgeglichen erwarteten Partien, ab 20 solchen Partien',
      val:p => (p.ahDelta != null && p.ahDelta > 0) ? p.ahDelta : null,
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte in offenen Partien · ${Math.round(p.ahQ*100)} statt ${Math.round(p.ahRest*100)} % sonst`
    },
    monat:{
      beiname:'Der Entscheider',
      art:'koennen',
      klasse:'selten', aus:1.81,
      wie:'Offen heißt: die Rechnung gab beiden Teams zwischen 45 und 55 Prozent. Verglichen wird die Quote darin mit der eigenen Gesamtquote.',
      cond:'In offenen Partien mindestens 20 Prozentpunkte stärker als sonst, ab 5 offenen Partien',
      ...(_stWertung(
        p=>p.partien.filter(_stAugenhoehe).length>=ST_TEIL,
        p=>{const d=p.partien.filter(_stAugenhoehe);return d.filter(s=>s.win).length/d.length-p.q;},
        0.2,
        p=>{const d=p.partien.filter(_stAugenhoehe);
      return `${d.filter(s=>s.win).length} von ${d.length} offenen Partien · sonst ${pct(p.q)} %`;}))}},

  {id:'gegenwind', name:'Gegen den Wind', short:'Gegenwind', ic:'tornado', tone:'acid', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'20 Partien als Außenseiter',
      wie:'Außenseiter heißt: die Elo-Rechnung gab dem eigenen Team vor dem Anpfiff weniger als 45 Prozent Siegchance. Der Nenner sind genau diese Partien und nicht die ganze Laufbahn.',
      cond:'Beste Siegquote als Außenseiter, ab 20 Partien als Außenseiter',
      val:p => p.unterN >= 20 ? p.unterW / p.unterN : null,
      ev:(p,v) => `${pct(v)} % als Außenseiter gewonnen · ${p.unterW} von ${p.unterN}`
    }},

  {id:'destroyer', name:'Der Zerstörer', short:'Zerstörer', ic:'explosion', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Siege',
      mind:'20 Siege',
      wie:'Ein Kantersieg ist ein Sieg mit sieben oder mehr Toren Vorsprung. Der Nenner sind die eigenen Siege und nicht alle Partien.',
      cond:'Höchster Anteil Kantersiege an allen eigenen Siegen, ab 20 Siegen',
      val:p => p.wins >= 20 ? p.blowW/p.wins : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.wins} Siege waren Kantersiege · ${p.blowW} Kantersiege`
    }},

  {id:'breitenwirkung', name:'Kein Angstgegner', short:'Kein Angst', ic:'target', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Standhafte',
      art:'koennen',
      klasse:'besonders', aus:1.73,
      wie:'Regelmäßig heißt mindestens drei Duelle im Monat. Gemessen wird der Anteil, nicht die Anzahl.',
      cond:'Gegen JEDEN regelmäßigen Gegner mehr Siege als Niederlagen, ab 4 solchen Gegnern',
      ...(_stWertung(
        p=>Object.values(p.gegnerGrp).filter(d=>d.length>=3).length>=4,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return r.filter(d=>d.filter(s=>s.win).length*2>d.length).length/r.length;},
        1,
        p=>{const r=Object.values(p.gegnerGrp).filter(d=>d.length>=3);
      return `gegen ${r.filter(d=>d.filter(s=>s.win).length*2>d.length).length} von ${r.length} regelmäßigen Gegnern im Plus`;}))},
    // Die Laufbahn-Achse fragt nach der SCHWAECHSTEN Bilanz und nicht mehr
    // nach dem Anteil der positiven. Der Anteil beantwortete eine andere
    // Frage als der Name: wer gegen neun von zehn Gegnern im Plus steht und
    // gegen den zehnten 20 % holt, stand dort bei 90 % und hatte trotzdem
    // genau den Angstgegner, den dieser Eintrag ausschliessen soll. Das
    // Minimum kennt diese Ausnahme nicht — ein einziger Gegner kostet den
    // Rekord. Die Monatsachse darunter bleibt der Anteil: in vier Wochen
    // kommen drei Duelle gegen einen Gegner zusammen, und ein Minimum aus
    // drei Partien ist ein Wurf und kein Muster.
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'4 Gegner mit je 6 Duellen',
      wie:'Ein Gegner zählt ab sechs gemeinsamen Duellen. Für jeden dieser Gegner steht eine eigene Siegquote, und gewertet wird die niedrigste davon. Der Nenner ist jeweils die Zahl der Duelle gegen genau diesen Gegner und nicht die Zahl aller Partien.',
      cond:'Höchste Siegquote gegen den schwächsten eigenen Gegner, ab 4 Gegnern mit je 6 Duellen',
      val:p => p.gjMin,
      ev:(p,v) => `${pct(v)} % gegen jeden der ${p.gjN} regelmäßigen Gegner`
    }},

  // Derselbe Gegnerkreis wie darueber und deshalb hier [§C35], aber die
  // Gegenrichtung: „Kein Angstgegner" fragt, ob eine Bilanz insgesamt
  // haelt, die Retourkutsche fragt nach der einzelnen Antwort. Der eigene
  // Partner darf wechseln — gefragt ist die Reaktion auf DIESE zwei, nicht
  // die Bilanz einer Aufstellung.
  {id:'retourkutsche', name:'Die Retourkutsche', short:'Retour', ic:'boomerang', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, jedes Wiedersehen',
      mind:'10 Wiedersehen',
      wie:'Ein Wiedersehen ist die nächste eigene Partie gegen genau dasselbe Gegnerduo, nachdem das vorige Duell gegen dieses Duo verloren ging. Der eigene Partner darf wechseln. Der Nenner sind diese Wiedersehen und nicht alle Partien.',
      cond:'Höchste Siegquote beim nächsten Wiedersehen nach einer Pleite, ab 10 Wiedersehen',
      val:p => p.rkN >= 10 ? p.rkW / p.rkN : null,
      ev:(p,v) => `${pct(v)} % beim nächsten Wiedersehen gewonnen · ${p.rkW} von ${p.rkN}`
    }},

  {id:'deutlich', name:'Der Deutliche', short:'Deutlich', ic:'plusMinus', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Deutliche',
      art:'koennen',
      klasse:'selten', aus:1.54,
      wie:'Die eigene Tordifferenz je Partie. Sie sagt mehr als die Siegquote, weil auch die Höhe zählt.',
      cond:'Mindestens 2 Tore Differenz je Partie',
      ...(_stWertung(
        p=>p.games>=8,
        p=>(p.gf-p.ga)/p.games,
        2,
        (p,v)=>`${v<0?'−':'+'}${komma(Math.abs(v))} Tore je Partie · ${p.gf}:${p.ga}`))},
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'30 Partien',
      wie:'Eigene Tore minus Gegentore, geteilt durch alle eigenen Partien. Gewertet wird der Schnitt, nicht die Summe.',
      cond:'Beste durchschnittliche Tordifferenz je Partie, ab 30 Partien',
      val:p => p.games >= 30 ? p.gd / p.games : null,
      ev:(p,v) => `${v >= 0 ? '+' : '−'}${komma(Math.abs(v))} Tore je Partie · ${p.gf}:${p.ga} in ${p.games} Partien`
    }},

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
      kammer:'koennen', basis:100,
      zeitraum:'Ganze Laufbahn, alle Sturmspiele',
      mind:'25 Sturmspiele',
      wie:'Drei Teile: die Siegquote im Sturm, dazu ein Viertel des Abstands zur Elo-Erwartung und ein Fünftel des Rollenbeitrags. Der Rollenbeitrag sind die Tore des eigenen Teams je Sturmspiel. Die Zahl der Sturmspiele geht nicht in den Wert ein, sie entscheidet nur über die Teilnahme.',
      cond:'Höchster Gesamtwert im Sturm, ab 25 Sturmspielen',
      val:p => (p.atkG >= 25)
        ? posLeistung('atk', p.atkG, p.atkW, p.atkGoals/p.atkG, p.atkPerf/p.atkG) : null,
      ev:(p,v) => `${Math.round(v*100)} Sturmwert · ${p.atkW}:${p.atkG-p.atkW} in ${p.atkG} Sturmspielen`
    }},

  {id:'def_ace', name:'Der komplette Verteidiger', short:'Abwehr', ic:'shield', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100,
      zeitraum:'Ganze Laufbahn, alle Abwehrspiele',
      mind:'25 Abwehrspiele',
      wie:'Dieselbe Rechnung wie beim kompletten Stürmer, gespiegelt: die Siegquote in der Abwehr, ein Viertel des Abstands zur Elo-Erwartung und ein Fünftel des Rollenbeitrags. Der Rollenbeitrag sind hier die wenigen Gegentore je Abwehrspiel. Die Zahl der Abwehrspiele geht nicht in den Wert ein.',
      cond:'Höchster Gesamtwert in der Abwehr, ab 25 Abwehrspielen',
      val:p => (p.defG >= 25)
        ? posLeistung('def', p.defG, p.defW, p.defConceded/p.defG, p.defPerf/p.defG) : null,
      ev:(p,v) => `${Math.round(v*100)} Abwehrwert · ${p.defW}:${p.defG-p.defW} in ${p.defG} Abwehrspielen`
    }},

  // Dieselbe Achse wie die beiden darueber und deshalb hier [§C35]: der
  // komplette Stuermer und der komplette Verteidiger messen die Position als
  // Ganzes, der Rollencoup nur den Teil davon, den die Rechnung nicht
  // vorhergesagt hat. Gewertet wird die BESSERE der beiden qualifizierten
  // Positionen — wer auf einer Seite ueber dem Soll liegt, hat das dort
  // getan, und ein Mittel ueber beide verwaesserte es mit der Seite, auf der
  // er selten steht. Die Siegchance kommt aus der Partie und wird nicht mit
  // heutigen Reglern nachgerechnet: eine zweite Rechnung ueber dieselbe
  // Frage nennt irgendwann eine andere Zahl [§C27].
  {id:'rollencoup', name:'Der Rollencoup', short:'Rollencoup', ic:'posSwap', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Position',
      mind:'20 Außenseiterpartien auf einer Position',
      wie:'Sturm und Abwehr werden getrennt gerechnet. Je Position zählen nur die Partien, in denen die Elo-Rechnung dem eigenen Team unter 45 Prozent Siegchance gab. Vom Anteil der gewonnenen Partien wird die mittlere Siegchance dieser Partien abgezogen; der bessere der beiden Positionswerte gilt. Die Zahl der Partien geht nicht in den Wert ein.',
      cond:'Größter Vorsprung auf die Erwartung als Außenseiter auf einer Position, ab 20 solchen Partien',
      val:p => (p.rcDelta != null && p.rcDelta > 0) ? p.rcDelta : null,
      ev:(p,v) => `${Math.round(v*100)} Punkte über der Erwartung · ${pct(p.rcQ)} % statt ${pct(p.rcExp)} % ${p.rcPos === 'atk' ? 'im Sturm' : 'in der Abwehr'}`
    }},

  {id:'rock', name:'Der Fels', short:'Fels', ic:'brick', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Abwehrspiele',
      mind:'20 Abwehrspiele',
      wie:'Das Gegenstück zum Torjäger: die Tore, die das eigene Team in den Partien kassiert hat, in denen dieser Spieler hinten stand, geteilt durch die Zahl dieser Partien.',
      cond:'Wenigste Gegentore je Abwehrspiel, ab 20 Abwehrspielen',
      val:p => (p.defG >= 20) ? -(p.defConceded/p.defG) : null,
      ev:(p,v) => `${komma(-v)} Gegentore je Abwehrspiel im Schnitt · ${p.defG} Spiele`
    }},

  {id:'sniper', name:'Der Torjäger', short:'Torjäger', ic:'ball', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Sturmspiele',
      mind:'20 Sturmspiele',
      wie:'Gezählt werden die Tore, die das eigene Team in den Partien erzielt hat, in denen dieser Spieler vorne stand, geteilt durch die Zahl dieser Partien. Gezählt werden die Tore des ganzen Teams: erfasst wird nur der Endstand, nicht wer getroffen hat.',
      cond:'Meiste eigene Tore je Sturmspiel, ab 20 Sturmspielen',
      val:p => (p.atkG >= 20) ? p.atkGoals/p.atkG : null,
      ev:(p,v) => `${komma(v)} Tore je Sturmspiel im Schnitt · ${p.atkG} Spiele`
    }},

  {id:'comeback_king', name:'Der Stehaufmann', short:'Comeback', ic:'comeback', tone:'acid', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'25 Partien direkt nach einer Niederlage',
      wie:'Eine Gelegenheit ist jede Partie, die in Spielreihenfolge direkt auf eine eigene Niederlage folgt. Verglichen wird die Siegquote dort mit der Siegquote in allen übrigen eigenen Partien, in Prozentpunkten. Das Gegenstück zur stummen Antwort.',
      cond:'Größter Aufschwung direkt nach einer Niederlage, ab 25 Gelegenheiten',
      val:p => {
        if(p.afterLossOpp < 25) return null;
        const rest = p.games - p.afterLossOpp;
        if(rest < 1) return null;
        const d = p.afterLoss/p.afterLossOpp - (p.wins - p.afterLoss)/rest;
        return d > 0 ? d : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte nach einer Pleite · ${pct(p.afterLoss/p.afterLossOpp)} statt ${pct((p.wins - p.afterLoss)/(p.games - p.afterLossOpp))} % sonst`
    }},

  // Dieselbe Familie wie der Stehaufmann darueber und deshalb hier [§C35],
  // aber eine andere Lage: der Stehaufmann antwortet auf EINE Niederlage und
  // misst den Sprung gegenueber den uebrigen Partien, der Rueckschlag
  // antwortet auf eine laufende Serie und misst die Quote selbst. Wer nach
  // einer Pleite immer gewinnt, hat einen Sprung; wer nach zwei Pleiten noch
  // gewinnt, hat etwas anderes getan. Die Gelegenheit entsteht nach der
  // dritten und jeder weiteren Niederlage erneut — eine Serie, die nicht
  // reisst, stellt die Frage jedes Mal neu.
  {id:'rueckschlag', name:'Der Rückschlag', short:'Rückschlag', ic:'reboundArrow', tone:'acid', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'10 Gelegenheiten',
      wie:'Eine Gelegenheit ist jede Partie, vor der in Spielreihenfolge mindestens zwei eigene Niederlagen in Folge standen. Nach der dritten und jeder weiteren Niederlage entsteht für die nächste Partie erneut eine Gelegenheit. Der Nenner sind diese Gelegenheiten und nicht alle Partien.',
      cond:'Höchste Siegquote nach zwei Niederlagen in Folge, ab 10 Gelegenheiten',
      val:p => p.rsN >= 10 ? p.rsW / p.rsN : null,
      ev:(p,v) => `${pct(v)} % nach zwei Niederlagen in Folge gewonnen · ${p.rsW} von ${p.rsN}`
    }},

  {id:'damage_control', name:'Der Widerstand', short:'Widerstand', ic:'blockedShot', tone:'blue', art:'leistung',
    // Gemessen wird jetzt JEDE Niederlage und nicht mehr nur die deutliche ab
    // sieben Toren. Der Anteil deutlicher Pleiten liess offen, wie die
    // uebrigen ausgingen: wer nie hoch und immer mit fuenf Toren verliert,
    // stand dort bei null Prozent und damit an der Spitze. Der mittlere
    // Rueckstand beantwortet die Frage, die der Name stellt.
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'20 Niederlagen',
      wie:'Gemessen wird der Torrückstand jeder einzelnen Niederlage, gemittelt über alle. Der Nenner sind die eigenen Niederlagen: gewertet wird, wie hoch verloren wird, und nicht wie oft.',
      cond:'Niedrigster mittlerer Torrückstand in allen eigenen Niederlagen, ab 20 Niederlagen',
      val:p => p.losses >= 20 ? -(p.wdSum / p.losses) : null,
      ev:p => `${komma(p.wdSum/p.losses, 2)} Tore Rückstand je Niederlage im Schnitt · ${p.losses} Niederlagen`
    }},

  {id:'metronom', name:'Das Metronom', short:'Metronom', ic:'clock', tone:'blue', art:'leistung',
    // Die Laufbahn-Achse derselben Frage [§13.1] — aber nicht mit derselben
    // Rechnung: ueber eine ganze Laufbahn liegt zwischen bestem und
    // schwaechstem Tag fast immer die volle Spanne, und die Monatsfassung
    // misst genau diese Spanne. Gemessen wird deshalb die Streuung um die
    // eigene Quote. „Die Handschrift" daneben streut die Tordifferenz je
    // Partie: vier knappe Niederlagen an einem Abend streuen dort gar nicht
    // und hier maximal.
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'12 Spieltage mit je 3 Partien',
      wie:'Für jeden eigenen Spieltag mit mindestens drei Partien steht eine Tagesquote. Gewertet wird die mittlere Tagesquote minus die Hälfte der mittleren Abweichung dieser Quoten. Hohe Tagesquoten zählen, gleichmäßig schwache nicht.',
      cond:'Beste Verbindung aus hoher und gleichmäßiger Tagesleistung, ab 12 Spieltagen mit je 3 Partien',
      val:p => (p.mtMad != null && p.mtN >= 12) ? p.mtAvg - 0.5 * p.mtMad : null,
      ev:(p,v) => `${pct(v)} Tageswert · ${pct(p.mtAvg)} % im Schnitt, ${pct(p.mtMad)} Streuung`
    },
    monat:{
      beiname:'Der Taktgeber',
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

  // ── DIE OFFENE KAMMER [§C35] ──────────────────────────────────────
  // Sieben Rekorde, deren Bedingung mit FUENFZIG Partien in der Laufbahn
  // erfuellbar ist. Gemessen an den echten Partien waren 13 der 21
  // bestehenden Rekorde mit lesbarer Mindestzahl fuer einen solchen Spieler
  // unerreichbar: „ab 50 Sturmspielen", „ab 60 Gelegenheiten", „ab 80
  // Spielen" gehoeren dem Vielspieler, weil sie ausser ihm niemand halten
  // KANN. Die Schwellen stehen auf einem 5er-Raster — eine Bedingung ist
  // eine Absprache und keine Kalibrierung, und „ab 22 Siegen" liest sich wie
  // ein Versehen.
  {id:'lauf', name:'Der Lauf', short:'Lauf', ic:'formPeak', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'form', basis:100, offen:true, fenster:true,
      zeitraum:'Die letzten 20 Partien',
      mind:'20 Partien',
      wie:'Gezählt werden genau die letzten zwanzig eigenen Partien, ohne Rücksicht darauf, wann sie gespielt wurden. Das Fenster liegt fest am Ende der Laufbahn.',
      cond:'Höchste Siegquote in den letzten 20 Partien, ab 20 Partien',
      val:p => p.l20N >= 20 ? p.l20W / p.l20N : null,
      ev:(p,v) => `${Math.round(v*100)} % aus den letzten 20 Partien · ${p.l20W} Siege`
    }},

  {id:'densephase', name:'Die dichte Phase', short:'Dichte', ic:'gateShut', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'form', basis:100, offen:true, fenster:true,
      zeitraum:'Die letzten 30 Partien',
      mind:'30 Partien',
      wie:'Dasselbe Fenster wie beim Torrausch, von der anderen Seite: die Gegentore der letzten dreißig Partien, geteilt durch diese dreißig. Wenig ist besser.',
      cond:'Wenigste Gegentore je Partie in den letzten 30 Partien, ab 30 Partien',
      val:p => p.l30N >= 30 ? -(p.l30Ga / p.l30N) : null,
      ev:p => `${komma(p.l30Ga/p.l30N)} Gegentore je Partie · ${p.l30Ga} in den letzten 30 Partien`
    }},

  // Zwei Fenster mehr, und beide auf denselben Durchlauf gerechnet wie „Die
  // dichte Phase" darueber: ein Fenster kostet nichts, solange nicht zweimal
  // ueber dieselben Partien gezaehlt wird. Der Torrausch nimmt fuenf Partien
  // weniger, weil die eigenen Tore staerker schwanken als die Gegentore —
  // eine Formphase im Sturm ist kuerzer als eine in der Abwehr.
  {id:'torrausch', name:'Der Torrausch', short:'Torrausch', ic:'goalRush', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'form', basis:100, offen:true, fenster:true,
      zeitraum:'Die letzten 30 Partien',
      mind:'30 Partien',
      wie:'Die Tore des eigenen Teams in den letzten dreißig Partien, geteilt durch diese dreißig. Gewertet wird der Schnitt, nicht die Summe.',
      cond:'Meiste eigene Tore je Partie in den letzten 30 Partien, ab 30 Partien',
      val:p => p.l30N >= 30 ? p.l30Gf / p.l30N : null,
      ev:(p,v) => `${komma(v)} eigene Tore je Partie · ${p.l30Gf} Tore in den letzten 30 Partien`
    }},

  {id:'allrounder', name:'Der Allrounder', short:'Allround', ic:'bothSides', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100,
      zeitraum:'Ganze Laufbahn, beide Positionen',
      mind:'20 Sturmspiele und 20 Abwehrspiele',
      wie:'Der Erwartungsabstand wird getrennt für Sturm und Abwehr gerechnet, mit derselben Rechnung wie beim Sturmführer und beim Abwehrchef. Gewertet wird die schwächere der beiden Zahlen. Wer nur auf einer Position über der Rechnung liegt, steht damit nicht vorne.',
      cond:'Größter positiver Abstand zur Erwartung auf beiden Positionen, ab 20 Spielen je Position',
      val:p => {
        if(p.atkG < 20 || p.defG < 20) return null;
        const m = Math.min(p.atkPerf / p.atkG, p.defPerf / p.defG);
        return m > 0 ? m : null;
      },
      ev:(p,v) => `+${Math.round(v*100)} Punkte auf beiden Positionen · +${Math.round(p.atkPerf/p.atkG*100)} vorne, +${Math.round(p.defPerf/p.defG*100)} hinten`
    }},

  {id:'sovereign', name:'Der Souverän', short:'Souverän', ic:'crownWide', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Favoritenspiele',
      mind:'20 Partien als Favorit',
      wie:'Favorit heißt: die Elo-Rechnung gab dem eigenen Team vor dem Anpfiff mehr als 55 Prozent Siegchance. Der Nenner sind genau diese Partien.',
      cond:'Höchste Siegquote als Favorit, ab 20 Partien als Favorit',
      val:p => p.favN >= 20 ? p.favW / p.favN : null,
      ev:(p,v) => `${pct(v)} % als Favorit gewonnen · ${p.favW} von ${p.favN}`
    }},

  {id:'sturmfuehrer', name:'Der Sturmführer', short:'Sturmchef', ic:'stepsUp', tone:'orange', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Sturmspiele',
      mind:'20 Sturmspiele',
      wie:'Die Elo-Rechnung gibt jeder Partie vor dem Anpfiff eine Siegchance. Über alle Sturmspiele gemittelt ergibt das die dort erwartete Siegquote. Gewertet wird, wie weit die tatsächliche darüber liegt, in Prozentpunkten.',
      cond:'Größter Vorsprung der Sturmquote auf die dort erwartete Siegquote, ab 20 Sturmspielen',
      val:p => p.atkG >= 20 ? p.atkPerf / p.atkG : null,
      ev:(p,v) => `${v < 0 ? '−' : '+'}${Math.abs(Math.round(v*100))} Punkte über der Rechnung · ${pct(p.atkW/p.atkG)} statt ${pct(p.atkW/p.atkG - v)} % in ${p.atkG} Sturmspielen`
    }},

  // ── DIE ANSPRUCHSVOLLE KAMMER [§C35] ──────────────────────────────
  // Hier darf ein Rekord verlangen, dass jemand die Frage ueber eine lange
  // Strecke beantwortet hat. Alle anderen Bedingungen gelten unveraendert:
  // der Wert bleibt ein ANTEIL oder ein Schnitt und keine Ansammlung, sonst
  // waere es wieder ein Rekord fuer den, der am meisten spielt.
  {id:'defchief', name:'Der Abwehrchef', short:'Kommando', ic:'shieldRank', tone:'blue', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, alle Abwehrspiele',
      mind:'20 Abwehrspiele',
      wie:'Dieselbe Rechnung wie beim Sturmführer, gespiegelt: die Elo-Erwartung über alle Abwehrspiele gegen die tatsächliche Siegquote dort, in Prozentpunkten.',
      cond:'Größter Vorsprung der Abwehrquote auf die dort erwartete Siegquote, ab 20 Abwehrspielen',
      val:p => p.defG >= 20 ? p.defPerf / p.defG : null,
      ev:(p,v) => `${v < 0 ? '−' : '+'}${Math.abs(Math.round(v*100))} Punkte über der Rechnung · ${pct(p.defW/p.defG)} statt ${pct(p.defW/p.defG - v)} % in ${p.defG} Abwehrspielen`
    }},

  {id:'laufstopper', name:'Der Laufstopper', short:'Laufstopp', ic:'streakStop', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'10 Gelegenheiten',
      wie:'Eine Gelegenheit zählt, wenn mindestens ein Gegner unmittelbar vor dem Anpfiff drei oder mehr eigene Siege in Folge hatte. Gezählt wird der Serienstand von damals und nicht die Serie, die daraus später wurde. Der Nenner sind alle eigenen Gelegenheiten.',
      cond:'Höchste Siegquote gegen Gegner in laufender Siegesserie, ab 10 Gelegenheiten',
      val:p => p.lsN >= 10 ? p.lsW / p.lsN : null,
      ev:(p,v) => `${pct(v)} % gegen eine laufende Serie gewonnen · ${p.lsW} von ${p.lsN}`
    }},

  // Zwei Disziplinen, die nicht das NIVEAU messen, sondern den Abstand zum
  // EIGENEN [§C38]. Wer eine Quote gewinnt, gewinnt fast jede — ein Eintrag
  // auf das Niveau gehoert damit immer denselben drei Spielern. Der Abstand
  // zum Eigenen ist fuer jede Koennensklasse erreichbar: der Zehnte der
  // Siegquote kann in zehn Partien genauso weit ueber seinem eigenen Schnitt
  // liegen wie der Erste. Beide tragen beide Zeitachsen, weil dieselbe Frage
  // auf zwei Achsen in EINE Disziplin gehoert [§13.1].
  // Die Vorderseite des „Untersolls" — dieselbe Rechnung, nur andersherum.
  // Der Erklaertext der Schande nennt sie seit jeher als Bezug, und es gab
  // sie nicht: die Kehrseite stand ohne ihre Vorderseite da, und wer sie
  // suchte, fand nichts. Sie ist deshalb KEIN zweiter Eintrag auf dieselbe
  // Frage: eine Schattenseite gibt kein Prestige [§C35], also gab es fuer
  // das Uebertreffen der eigenen Erwartung ueberhaupt keinen Eintrag.
  {id:'uebersoll', name:'Das Übersoll', short:'Übersoll', ic:'sollPlus', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien',
      wie:'Die Elo-Rechnung gibt jeder Partie vor dem Anpfiff eine Siegchance. Über die Laufbahn gemittelt ergibt das die erwartete Quote; gewertet wird, wie weit die tatsächliche darüber liegt, in Prozentpunkten. Die Erwartung wächst mit jedem Sieg mit, der Abstand ist also kein Niveau.',
      cond:'Größter Vorsprung der Siegquote auf die eigene Elo-Erwartung, ab 40 Partien',
      val:p => p.games >= 40 ? (p.wins / p.games) - (p.expSum / p.games) : null,
      ev:(p,v) => `${Math.round(v*100)} Punkte über der Rechnung · ${pct(p.wins/p.games)} % statt ${pct(p.expSum/p.games)} % in ${p.games} Partien`
    },
    monat:{
      beiname:'Der Überbieter',
      art:'koennen',
      // An den echten Partien gemessen: die Schwelle von 15 Punkten liegt
      // 1,57 σ ueber dem Schnitt aller je gewerteten Werte (36 Werte, Mittel
      // −0,9 Punkte, σ 10,2). Einmal gemessen und dann festgeschrieben, wie
      // bei jeder Chronik [§C39] — ein Ausschlag, der mit der Liga wandert,
      // liesse das Prestige aller bisherigen Halter sinken.
      klasse:'selten', aus:1.57,
      wie:'Dieselbe Rechnung wie beim Untersoll, nur andersherum.',
      cond:'Mindestens 15 Prozentpunkte über der eigenen Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.q-p.expQ,
        0.15,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))}},

  {id:'steigerung', name:'Die Steigerung', short:'Steigerung', ic:'climb', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Steigende',
      art:'koennen',
      klasse:'selten', aus:1.53,
      wie:'Die Spieltage des Monats werden in der Mitte geteilt und die beiden Quoten desselben Spielers verglichen.',
      cond:'In der zweiten Hälfte des Monats mindestens 25 Prozentpunkte stärker als in der ersten, ab 4 Partien je Hälfte',
      ...(_stWertung(
        p=>_stHaelften(p)!=null,
        p=>{const h=_stHaelften(p);return h?h.q2-h.q1:null;},
        0.25,
        p=>{const h=_stHaelften(p);return `${pct(h.q2)} % in der zweiten Hälfte, ${pct(h.q1)} % in der ersten`;}))}},


  {id:'hochform', name:'Der Höhenflug', short:'Höhenflug', ic:'hochSpitze', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Aufgeblühte',
      art:'koennen',
      klasse:'besonders', aus:1.5,
      wie:'Die letzten zehn Partien des Monats gegen alle davor in diesem Monat. Nicht gegen die Monatsquote: die enthält das Fenster selbst, und dann zählt es doppelt.',
      cond:'In den letzten 10 Partien mindestens 30 Prozentpunkte über der eigenen Quote davor, ab 20 Partien im Monat',
      ...(_stWertung(
        p=>_stLetzteZehn(p)!=null,
        p=>{const f=_stLetzteZehn(p);return f?f.d:null;},
        0.30,
        p=>{const f=_stLetzteZehn(p);return `${pct(f.drin)} % in den letzten 10, ${pct(f.raus)} % in den ${f.vor} davor`;}))},
    allzeit:{
      kammer:'form', basis:100, offen:true, fenster:true,
      zeitraum:'Die letzten 10 gegen die 10 davor',
      mind:'20 Partien',
      wie:'Die letzten zehn Partien gegen die zehn unmittelbar davor. Zwei gleich große Fenster, damit die Frage für jeden dieselbe ist.',
      cond:'Größte Verbesserung der letzten 10 Partien gegenüber den 10 davor, ab 20 Partien',
      val:p => (p.hfDelta != null && p.hfDelta > 0) ? p.hfDelta : null,
      ev:(p,v) => `+${Math.round(v*100)} %-Punkte · ${pct(p.hfNeu)} % in den letzten 10 statt ${pct(p.hfAlt)} % in den 10 davor`
    }},

  {id:'kaltstart', name:'Der Kaltstart', short:'Kaltstart', ic:'sunrise', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Frühstarter',
      art:'koennen',
      klasse:'selten', aus:1.73,
      wie:'Die jeweils erste Partie jedes eigenen Spieltags. Ohne Aufwärmen.',
      cond:'Mindestens 85 % der ersten Partien eines Spieltags gewonnen, ab 5 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=ST_TEIL,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[0]);return l.filter(s=>s.win).length/l.length;},
        0.85,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[0]);return `${l.filter(s=>s.win).length} von ${l.length} Auftaktpartien gewonnen`;}))},
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'10 Spieltage mit je 3 eigenen Partien',
      wie:'Für jeden eigenen Spieltag mit mindestens drei Partien wird die zeitlich erste Partie gegen alle übrigen dieses Tages gestellt. Der Vergleich läuft innerhalb desselben Tages. Das Gegenstück zum letzten Ball, mit demselben Fenster und derselben Mindestbasis.',
      cond:'Größter Vorsprung im ersten Spiel eines Spieltags, ab 10 Spieltagen mit je 3 Partien',
      val:p => (p.ksDelta != null && p.ksN >= 10 && p.ksDelta > 0) ? p.ksDelta : null,
      ev:(p,v) => `+${Math.round(v*100)} Punkte · ${pct(p.ksDrin)} % in ${p.ksN} Startspielen, sonst ${pct(p.ksRaus)} %`
    }},

  // Dieselbe Frage wie der Kaltstart darueber und deshalb hier [§C35], nur
  // eine Ebene groesser: der Kaltstart misst das erste Spiel eines Abends,
  // der Wiedereinstieg das erste nach einer echten Pause. Gemessen wird der
  // Abstand der Zeitpunkte und nicht die Differenz der Kalendertage —
  // Freitagabend und Sonntagmorgen sind zwei Kalendertage und keine drei
  // Tage Pause.
  {id:'wiedereinstieg', name:'Der Wiedereinstieg', short:'Rückkehr', ic:'doorReturn', tone:'gold', art:'leistung',
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, jede Rückkehr',
      mind:'8 Rückkehrspiele',
      wie:'Ein Rückkehrspiel ist die erste eigene Partie nach 72 vollständigen Stunden ohne eigenes Match. Gerechnet wird mit dem Abstand der Zeitpunkte und nicht mit der Differenz der Kalendertage. Die allererste Partie einer Laufbahn zählt nicht mit. Der Nenner sind diese Rückkehrspiele und nicht alle Partien.',
      cond:'Höchste Siegquote in der ersten Partie nach 72 Stunden Pause, ab 8 Rückkehrspielen',
      val:p => p.weN >= 8 ? p.weW / p.weN : null,
      ev:(p,v) => `${pct(v)} % nach einer Pause gewonnen · ${p.weW} von ${p.weN}`
    }},

  {id:'schlussball', name:'Der letzte Ball', short:'Schluss', ic:'whistle', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Nervenstarke',
      art:'konstanz',
      klasse:'selten', aus:1.75,
      wie:'Gewertet wird die zeitlich letzte Partie jedes eigenen Spieltags gegen alle anderen dieses Tages. Drei Partien je Tag, damit „die letzte" überhaupt eine Auswahl ist.',
      cond:'In der letzten Partie eines Spieltags mindestens 35 Prozentpunkte stärker als in den übrigen, ab 3 Spieltagen mit je 3 Partien',
      ...(_stWertung(
        p=>_stSchlussBall(p,3)!=null,
        p=>{const s=_stSchlussBall(p,3);return s?s.d:null;},
        0.35,
        p=>{const s=_stSchlussBall(p,3);return `${pct(s.drin)} % in ${s.n} Schlussspielen, ${pct(s.raus)} % davor`;}))},
    allzeit:{
      kammer:'koennen', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn, je Spieltag',
      mind:'10 Spieltage mit je 3 eigenen Partien',
      wie:'Für jeden eigenen Spieltag mit mindestens drei Partien wird die zeitlich letzte Partie gegen alle übrigen dieses Tages gestellt. Der Vergleich läuft innerhalb desselben Tages.',
      cond:'Größter Vorsprung im letzten Spiel eines Spieltags, ab 10 Spieltagen mit je 3 Partien',
      val:p => (p.sbDelta != null && p.sbN >= 10 && p.sbDelta > 0) ? p.sbDelta : null,
      ev:(p,v) => `+${Math.round(v*100)} Punkte · ${pct(p.sbDrin)} % in ${p.sbN} Schlussspielen, sonst ${pct(p.sbRaus)} %`
    }},

  {id:'unstoppable', name:'Der Unaufhaltsame', short:'Serie', ic:'flame', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:100,
      zeitraum:'Ganze Ligageschichte',
      mind:'8 Siege in Folge',
      wie:'Gezählt werden Siege, die ohne Niederlage dazwischen aufeinanderfolgen, über Spieltage und Saisons hinweg. Eine Niederlage setzt die Zählung auf null.',
      cond:'Längste Siegesserie der Ligageschichte, ab 8 Siegen in Folge',
      unit:'Siege in Folge', min:8, raw:p => p.winStreak,
      ev:(p,v) => `${v} Siege in Folge`,
      zeit:p => p.winSpan || ''
    }},

  // Die andere Seite derselben Zaehlung und deshalb hier [§C35]: der
  // Unaufhaltsame haelt die laengste Siegesserie der Liga, der Unbeugsame die
  // KUERZESTE persoenliche Pleitenserie. Er ist damit kein Gegenpaar — das
  // Gegenstueck der Siegesserie ist „Die Durststrecke" in der Schandtafel,
  // die die laengste Pleitenserie zeigt. Hier gewinnt, bei wem sie nie lang
  // geworden ist, und das ist eine Bestmarke und keine Kehrseite.
  // Gerechnet wird mit dem negativen Serienwert, weil die Vergabe
  // absteigend sortiert und ein kleinerer Wert hier der bessere ist.
  {id:'unbeugsam', name:'Der Unbeugsame', short:'Unbeugsam', ic:'anvil', tone:'gold', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:100, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'50 Partien',
      wie:'Gezählt werden Niederlagen, die ohne Sieg dazwischen aufeinanderfolgen, über Spieltage und Saisons hinweg. Von jedem Spieler steht die längste dieser Serien, und gewertet wird die niedrigste dieser Höchstmarken.',
      cond:'Kürzeste längste Niederlagenserie einer Laufbahn, ab 50 Partien',
      val:p => p.games >= 50 ? -p.lossStreak : null,
      ev:p => `${p.lossStreak} Niederlagen in Folge als längste Serie · ${p.games} Partien`
    }},

  // Ein Abend, an dem alles saß. Braucht weder eine Laufbahn noch eine
  // Quote — nur einen guten Tag, und den kann jeder haben. Deshalb steht
  // er unter EREIGNIS und nicht unter LEISTUNG.
  {id:'peak', name:'Der höchste Gipfel', short:'Gipfel', ic:'peak', tone:'gold', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:100,
      zeitraum:'Ganze Ligageschichte',
      mind:'350 Elo',
      wie:'Die Elo beginnt jeden Monat neu, der Gipfel ist also der höchste Stand, den je jemand innerhalb eines Monats erreicht hat. Es ist dieselbe Elo, die auch die Liga-Rangliste zeigt.',
      cond:'Höchster Elo-Stand der Ligageschichte, ab 350 Elo',
      unit:'Elo', min:350, raw:p => p.peak,
      ev:(p,v) => `${Math.round(v)} Elo, nie stand jemand höher`
    }},

  {id:'eloday', name:'Der große Sprung', short:'Sprung', ic:'bolt2', tone:'acid', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:100, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'100 Elo Gewinn an einem Tag',
      wie:'Addiert werden alle Elo-Veränderungen der eigenen Partien dieses Tages, Gewinne und Verluste. Gewertet wird der beste einzelne Tag einer Laufbahn.',
      cond:'Größter Elo-Gewinn an einem einzigen Spieltag, ab 100 Elo',
      unit:'Elo an einem Tag', min:100, raw:p => p.dayElo == null ? null : Math.round(p.dayElo),
      ev:(p,v) => `+${v} Elo an einem Tag`,
      zeit:p => p.dayEloLabel || ''
    }},

  {id:'wall', name:'Die Mauer', short:'Mauer', ic:'shieldStar', tone:'blue', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien',
      wie:'Gezählt wird, wie oft jemand hinten stand, geteilt durch alle eigenen Partien. Die Zahl sagt, wie festgelegt eine Rolle ist, und nichts darüber, wie gut sie gespielt wurde.',
      cond:'Höchster Abwehranteil über die ganze Laufbahn, ab 40 Partien',
      val:p => p.games >= 40 ? p.defG/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien hinten · ${p.defG} Abwehrspiele`
    }},

  {id:'sturmtreue', name:'Der Sturmtreue', short:'Sturmtreu', ic:'strikeBoot', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien',
      wie:'Dieselbe Rechnung wie bei der Mauer, nur vorne: die Sturmspiele geteilt durch alle eigenen Partien. Beide Hälften haben dieselbe Mindestbasis.',
      cond:'Höchster Sturmanteil über die ganze Laufbahn, ab 40 Partien',
      val:p => p.games >= 40 ? p.atkG/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien vorne · ${p.atkG} Sturmspiele`
    }},

  {id:'switcher', name:'Der Wandler', short:'Wandler', ic:'refresh', tone:'purple', art:'ereignis',
    allzeit:{
      kammer:'mark', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien und ein Sturmanteil zwischen 43 und 57 %',
      wie:'Gerechnet wird mit demselben Sturmanteil, den das Positionsprofil im Profil zeigt. Gewertet wird der Abstand zu einer Verteilung von fünfzig zu fünfzig; bei genau fünfzig zu fünfzig stünde der Wert bei 100 Prozent.',
      cond:'Ausgeglichenste Verteilung auf Sturm und Abwehr, ab 40 Partien und einem Sturmanteil zwischen 43 und 57 %',
      val:p => {
        if(p.games < 40) return null;
        const s = positionsProfilWert(p);
        return (s >= 0.43 && s <= 0.57) ? 1 - Math.abs(s - 0.5) * 2 : null;
      },
      ev:(p,v) => `${Math.round((1-v)*100)} %-Punkte Unterschied im Positionsprofil · ${Math.round(positionsProfilWert(p)*100)} % Sturm, ${Math.round((1-positionsProfilWert(p))*100)} % Abwehr`
    }},

  // Wo jemand steht, entscheidet die Aufstellung und nicht das Koennen —
  // deshalb eine Bestmarke und kein Koennens-Rekord, dieselbe Kammer wie
  // „Die Mauer" und „Der Wandler" darueber [§C27].
  //
  // Gezaehlt wird der STURM und nicht die haeufigere der beiden Rollen: die
  // Abwehr-Fassung ginge gemessen an Henry mit 98 % aus den letzten 50, und
  // Henry haelt „Die Mauer" schon — dieselbe Frage mit derselben Antwort
  // sammelt sich beim selben Halter [§C35]. Der Sturmanteil im Fenster
  // gehoert dagegen dem Zehnten der Siegquote. Auf einem Fenster, damit die
  // Marke den Halter wechseln kann: ueber eine ganze Laufbahn mittelt sich
  // jede Rolle heraus.
  {id:'dauersturm', name:'Der Dauerstürmer', short:'Vorne', ic:'roleFix', tone:'orange', art:'ereignis',
    allzeit:{
      kammer:'form', basis:50, offen:true, fenster:true,
      zeitraum:'Die letzten 50 Partien',
      mind:'50 Partien',
      wie:'Die Partien im Sturm unter den letzten fünfzig eigenen Partien, geteilt durch diese fünfzig. Gemessen wird die Aufstellung und keine Torgefahr: wo jemand steht, entscheidet die Auslosung.',
      cond:'Höchster Sturmanteil in den letzten 50 Partien, ab 50 Partien',
      val:p => p.r50N >= 50 ? p.r50Atk / p.r50N : null,
      ev:(p,v) => `${Math.round(v*100)} % im Sturm · ${p.r50Atk} von ${p.r50N} Partien`
    }},

  {id:'abwehrmauer', name:'Die Abwehrmauer', short:'Abwehrwand', ic:'concreteWall', tone:'blue', art:'ereignis',
    allzeit:{
      kammer:'form', basis:50, offen:true, fenster:true,
      zeitraum:'Die letzten 50 Partien',
      mind:'50 Partien',
      wie:'Dieselbe Zahl wie beim Dauerstürmer, von der anderen Seite gelesen: die Partien in der Abwehr unter den letzten fünfzig, geteilt durch diese fünfzig.',
      cond:'Höchster Abwehranteil in den letzten 50 Partien, ab 50 Partien',
      val:p => p.r50N >= 50 ? (p.r50N - p.r50Atk) / p.r50N : null,
      ev:(p,v) => `${Math.round(v*100)} % in der Abwehr · ${p.r50N - p.r50Atk} von ${p.r50N} Partien`
    }},

  {id:'seitenwechsler', name:'Der Seitenwechsler', short:'Wechsler', ic:'sideSwap', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien',
      wie:'Geprüft wird jedes Paar aufeinanderfolgender eigener Partien: wurde zwischen Sturm und Abwehr gewechselt? Der Nenner sind die Übergänge und nicht die Partien, bei vierzig Partien also neununddreißig Gelegenheiten zu wechseln. Wo jemand steht, entscheidet die Aufstellung.',
      cond:'Höchster Anteil an Rollenwechseln zwischen aufeinanderfolgenden Partien, ab 40 Partien',
      val:p => (p.games >= 40 && p.swN) ? p.swOk / p.swN : null,
      ev:(p,v) => `${Math.round(v*100)} % der Übergänge mit Rollenwechsel · ${p.swOk} von ${p.swN}`
    }},

  {id:'seesaw', name:'Das Wechselbad', short:'Wechsel', ic:'cycle', tone:'purple', art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Ligageschichte',
      mind:'7 Partien im Wechsel',
      wie:'Sieg, Niederlage, Sieg, Niederlage und so weiter. Die Folge bricht, sobald zweimal dasselbe passiert. Das misst kein Können, nur einen unentschlossenen Tag.',
      cond:'Längste Folge aus abwechselnd Sieg und Niederlage, ab 7 Partien im Wechsel',
      unit:'Partien im Wechsel', min:7, raw:p => p.alt,
      ev:(p,v) => `${v} Partien im ständigen Wechsel`,
      zeit:p => p.altSpan || ''
    }},

  {id:'hardnight', name:'Der schwerste Tag', short:'Losglück', ic:'rainCloud', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'4 Partien am Tag und höchstens 45 % mittlere Siegchance',
      wie:'Gemittelt wird die Siegchance vor dem Anpfiff über alle eigenen Partien dieses Tages. Gewertet wird ab vier eigenen Partien an einem Tag, und zwar der schwerste solche Tag einer Laufbahn.',
      cond:'Niedrigste mittlere Siegchance an einem ganzen Spieltag, ab 4 Partien und höchstens 45 %',
      val:p => (p.hartTag != null && p.hartTag <= 0.45) ? -p.hartTag : null,
      ev:p => `${Math.round(p.hartTag*100)} % mittlere Siegchance über einen ganzen Spieltag`,
      zeit:p => p.hartTagLabel || ''
    }},

  // `negativ` faerbt und zaehlt, `art` wiegt: die Fuegung bleibt ein Ereignis
  // [§C35], erzaehlt aber von einer Niederlage. Im Profil stand sie in Gold
  // neben den Titeln und wurde als Rekord mitgezaehlt.
  {id:'bitterloss', name:'Die bitterste Pleite', short:'Bitter', ic:'dramaTear', tone:'purple',
    art:'ereignis', zufall:'quote', negativ:true,
    allzeit:{
      kammer:'fuegung', basis:50, offen:true, paar:'fluke',
      zeitraum:'Eine einzelne Partie',
      mind:'Mindestens 65 % Siegchance',
      wie:'Das Gegenstück zum Sonntagsschuss mit derselben Rechnung: die verlorene Partie mit der höchsten Siegchance vor dem Anpfiff. Eine einzige Partie, kein Durchschnitt.',
      cond:'Verlorene Partie mit der höchsten vorherigen Siegchance, mindestens 65 %',
      val:p => (p.pechExp != null && p.pechExp >= 1 - CHANCE_UPSET) ? p.pechExp : null,
      ev:p => `${Math.round(p.pechExp*100)} % Siegchance und trotzdem verloren`,
      zeit:p => p.pechLabel || ''
    }},

  {id:'mirrorday', name:'Der Wiedergänger', short:'Déjà-vu', ic:'duplicate', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ein einzelner Spieltag',
      mind:'3 gleiche Ergebnisse an einem Tag',
      wie:'Gezählt wird, wie oft dasselbe Ergebnis an einem Spieltag aus eigener Sicht und in derselben Richtung vorkam. Ein 10:8 und ein 8:10 sind damit zwei verschiedene Ergebnisse.',
      cond:'Häufigste Wiederholung desselben Ergebnisses an einem Spieltag, ab 3 gleichen Ergebnissen',
      val:p => p.wiederTag >= 3 ? p.wiederTag : null,
      ev:p => `${p.wiederTag}× dasselbe Ergebnis ${p.wiederErg} an einem Tag`,
      zeit:p => p.wiederLabel || ''
    }},

  {id:'needleeye', name:'Das Nadelöhr', short:'Nadelöhr', ic:'needleEye', tone:'acid',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien und 8 % enge Ergebnisse',
      wie:'Gezählt werden die eigenen Partien, die mit genau einem Tor Unterschied endeten, also 10:9 und 9:10 aus eigener Sicht. Der Nenner sind alle eigenen Partien. Wer knapp gewinnt oder knapp verliert, zählt hier gleich: gefragt ist das Ergebnis, nicht der Sieger.',
      cond:'Höchster Anteil an Partien mit genau einem Tor Unterschied, ab 40 Partien und mindestens 8 %',
      val:p => (p.games >= 40 && (p.nail + p.bitter)/p.games >= 0.08) ? (p.nail + p.bitter)/p.games : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.games} Partien mit einem Tor entschieden · ${p.nail + p.bitter} Stück`
    }},

  {id:'evenkeel', name:'Die Punktlandung', short:'Landung', ic:'scaleBalance', tone:'gold',
    art:'ereignis', zufall:'fund',
    monat:{
      beiname:'Der Ausbalancierte',
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
      kammer:'fuegung', basis:50,
      zeitraum:'Ein einzelner Spieltag',
      mind:'4 Partien am Tag',
      wie:'Am Ende des Spieltags stehen eigene Tore und Gegentore exakt gleich. Je mehr Partien an diesem Tag, desto unwahrscheinlicher: gewertet wird der größte solche Tag, nicht die Zahl solcher Tage.',
      cond:'Größter Spieltag mit exakt ausgeglichenem Torkonto, ab 4 Partien am Tag',
      val:p => p.gleichTag >= 4 ? p.gleichTag : null,
      ev:p => `${p.gleichTag} Partien an einem Tag, ${p.gleichTore}:${p.gleichTore} Tore`,
      zeit:p => p.gleichLabel || ''
    }},

  {id:'rollercoaster', name:'Die Achterbahn', short:'Achterbahn', ic:'coasterDip', tone:'orange',
    art:'ereignis', zufall:'fund',
    allzeit:{
      kammer:'fuegung', basis:50,
      zeitraum:'Ein einzelner Spieltag',
      mind:'Beide Ergebnisse am selben Tag',
      wie:'Ein 10:0 und ein 0:10 am selben Spieltag. Gezählt wird, an wie vielen Tagen das zusammenkam. Beides braucht den passenden Gegner, nicht die passende Form.',
      cond:'Ein 10:0 und ein 0:10 am selben Spieltag',
      val:p => p.beidesTag >= 1 ? p.beidesTag : null,
      ev:p => `${p.beidesTag}× ein 10:0 und ein 0:10 am selben Tag`,
      zeit:p => p.beidesLabel || ''
    }},

  {id:'fluke', name:'Der Sonntagsschuss', short:'Coup', ic:'surprise', tone:'orange', art:'ereignis', zufall:'quote',
    // Auch als Monatswertung: eine einzige Partie genuegt, und die Rechnung
    // stand dagegen. Gemessen ueber die bisherigen Monate ging sie an Platz
    // sieben und Platz zehn der Siegquote — an Leute, die von den Eintraegen,
    // die am Koennen haengen, keinen bekommen.
    allzeit:{
      kammer:'fuegung', basis:50, offen:true, paar:'bitterloss',
      zeitraum:'Eine einzelne Partie',
      mind:'Höchstens 35 % Siegchance',
      wie:'Die Elo-Rechnung gibt jeder Partie vor dem Anpfiff eine Siegchance. Gewertet wird der gewonnene Auftritt mit der niedrigsten davon. Eine einzige Partie genügt, und die Rechnung stand dagegen.',
      cond:'Gewonnene Partie mit der niedrigsten vorherigen Siegchance, höchstens 35 %',
      val:p => (p.flukeExp != null && p.flukeExp <= CHANCE_UPSET) ? -p.flukeExp : null,
      ev:p => `${Math.round(p.flukeExp*100)} % Siegchance und trotzdem gewonnen`,
      zeit:p => p.flukeLabel || ''
    }},

  // ── Gleichmaessigkeit: drei Fuegungen, kein Koennen [§C35] ────────
  // Wer die geringste Streuung hat, ist nicht der Beste — er ist der, bei dem
  // jede Partie gleich aussieht. Das zeichnet niemanden aus, es kann jemandem
  // gehoeren, und deshalb stehen die drei als `ereignis` in der Kammer der
  // Fuegungen und wiegen fuers Prestige halb so viel wie ein Beleg fuer eine
  // Faehigkeit [§C34]. `konstanz` gibt es dafuer nicht: das ist eine Art der
  // MONATSCHRONIK [§C39], und ein ungueltiger Wert faellt hier still auf
  // `ereignis` zurueck.
  // Sturm und Abwehr sind ein PAAR, so wie „Der komplette Stürmer" und „Der
  // komplette Verteidiger". Eine dritte Fassung derselben Frage auf einer
  // dritten Teilmenge waere die Haeufung, die §C35 verbietet — „gegen den
  // Rest der Liga" ist der Gegnerkreis und keine Rolle, und gemessen halten
  // die drei drei verschiedene Spieler.
  {id:'handwriting', name:'Die Handschrift', short:'Schrift', ic:'penLine', tone:'purple',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn, alle Sturmspiele',
      mind:'40 Sturmspiele',
      wie:'Dieselbe Rechnung wie beim Fundament, nur vorne: die Streuung der eigenen Tordifferenz über alle Sturmspiele. Niedrig ist besser.',
      cond:'Gleichmäßigste Tordifferenz im Sturm, ab 40 Sturmspielen',
      val:p => (p.atkSd != null && p.atkG >= 40) ? -p.atkSd : null,
      ev:p => `${komma(p.atkSd)} Tore Streuung im Sturm · Schnitt ${p.atkMit >= 0 ? '+' : '−'}${komma(Math.abs(p.atkMit))} in ${p.atkG} Spielen`
    }},

  {id:'bedrock', name:'Das Fundament', short:'Statik', ic:'baseLine', tone:'blue',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn, alle Abwehrspiele',
      mind:'40 Abwehrspiele',
      wie:'Für jedes Abwehrspiel steht die eigene Tordifferenz. Gewertet wird deren Streuung, also wie weit die einzelnen Ergebnisse vom eigenen Schnitt abweichen. Niedrig ist besser. Über die Höhe der Differenz sagt die Zahl nichts.',
      cond:'Gleichmäßigste Tordifferenz in der Abwehr, ab 40 Abwehrspielen',
      val:p => (p.defSd != null && p.defG >= 40) ? -p.defSd : null,
      ev:p => `${komma(p.defSd)} Tore Streuung in der Abwehr · Schnitt ${p.defMit >= 0 ? '+' : '−'}${komma(Math.abs(p.defMit))} in ${p.defG} Spielen`
    }},

  {id:'unruffled', name:'Der Unaufgeregte', short:'Ruhe', ic:'flatWave', tone:'acid',
    art:'ereignis', zufall:'quote',
    allzeit:{
      kammer:'fuegung', basis:50, offen:true,
      zeitraum:'Ganze Laufbahn, ausgeglichen angesetzte Partien',
      mind:'40 Partien mit 35 bis 65 % Siegchance',
      wie:'Ausgeglichen angesetzt heißt: die Elo-Rechnung gab dem eigenen Team vor dem Anpfiff zwischen 35 und 65 Prozent. Gewertet wird die Streuung der Tordifferenzen in genau diesen Partien, niedrig ist besser. Über das Niveau sagt die Zahl nichts.',
      cond:'Gleichmäßigste Tordifferenz in ausgeglichen angesetzten Partien, ab 40 solchen Partien',
      val:p => (p.ausgSd != null && p.ausgN >= 40) ? -p.ausgSd : null,
      ev:p => `${komma(p.ausgSd)} Tore Streuung in ${p.ausgN} offen angesetzten Partien`
    }},

  // Zwei Fuegungen, die von der AUSLOSUNG leben: wen jemand als Mitspieler
  // bekommt, entscheidet er nicht selbst. Der Katalog fragt bei „Der Klotz am
  // Bein" und „Der Wegbereiter" nach der WIRKUNG eines Partners; nach seiner
  // STAERKE fragt nichts.
  //
  // Gerechnet wird gegen das EIGENE Mittel und nicht gegen das der Liga. Wer
  // selbst der Beste ist, kann nie mit sich selbst spielen: sein Partnerfeld
  // ist zwangslaeufig das schwaechste der Liga, und gemessen lag diese
  // Fassung bei r = −0,66 mit der eigenen Siegquote — damit waere die Fuegung
  // eine zweite Rangliste des Koennens gewesen [§C38]. Gegen das Eigene
  // gerechnet faellt der Effekt weg: gemessen −0,09.
  //
  // Beide lesen DASSELBE Feld, eines mit Plus und eines mit Minus. Zwei
  // Rechnungen fuer dieselbe Frage waeren eine zu viel [§C27].
  //
  // `paar` sagt, dass die beiden die zwei ENDEN eines Werts sind. Fuer eine
  // Quoten-Fuegung verlangt `tests/disziplinen` sonst, dass mindestens die
  // halbe Liga im Rennen steht — gegen eine zu hohe Schwelle. Ein Vorzeichen
  // ist aber keine Schwelle: es teilt das Feld, und gemessen standen fuenf
  // ueber und sechs unter dem eigenen Mittel. Gepruefft wird deshalb das
  // Paar: zusammen muessen die beiden Rennen die halbe Liga tragen, und wer
  // die Mindestzahl erfuellt, steht in einem von beiden.
  {id:'tailwind', name:'Der Rückenwind', short:'Rückenwind', ic:'windBack', tone:'acid',
    art:'ereignis', zufall:'quote', paar:'solorun',
    allzeit:{
      kammer:'form', basis:50, fenster:true,
      zeitraum:'Die letzten 25 gegen die 25 davor',
      mind:'50 Partien',
      wie:'Für jede Partie zählt die Elo des Mitspielers, wie sie unmittelbar vor dem Anpfiff stand. Gemittelt über die letzten 25 Partien und über die 25 davor; gewertet wird der Anstieg. Über die eigene Leistung sagt die Zahl nichts.',
      cond:'Größter Anstieg der Mitspielerstärke in den letzten 25 Partien, ab 50 Partien',
      val:p => (p.rwDelta != null && p.rwDelta > 0) ? p.rwDelta : null,
      ev:(p,v) => `+${Math.round(v)} Elo stärkere Mitspieler · ${Math.round(p.rwNeu)} statt ${Math.round(p.rwAlt)} Elo`
    }},

  {id:'solorun', name:'Der Einzelkämpfer', short:'Alleingang', ic:'soloPath', tone:'blue',
    art:'ereignis', zufall:'quote', paar:'tailwind',
    allzeit:{
      kammer:'form', basis:50, fenster:true,
      zeitraum:'Die letzten 25 gegen die 25 davor',
      mind:'50 Partien',
      wie:'Dieselben zwei Fenster und dieselbe Mitspieler-Elo wie beim Rückenwind, nur in die andere Richtung gelesen. Wer mit den Schwächeren antritt, hat nichts falsch gemacht.',
      cond:'Größter Rückgang der Mitspielerstärke in den letzten 25 Partien, ab 50 Partien',
      val:p => (p.rwDelta != null && p.rwDelta < 0) ? -p.rwDelta : null,
      ev:(p,v) => `${Math.round(v)} Elo schwächere Mitspieler · ${Math.round(p.rwNeu)} statt ${Math.round(p.rwAlt)} Elo`
    }},

  {id:'drought', name:'Die Durststrecke', short:'Flaute', ic:'dropTriple', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gestrandete',
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
      kammer:'shame', basis:0,
      zeitraum:'Ganze Ligageschichte',
      mind:'7 Niederlagen in Folge',
      wie:'Das Gegenstück zum Unaufhaltsamen mit derselben Zählung: Niederlagen, die ohne Sieg dazwischen aufeinanderfolgen. Ein Sieg setzt die Zählung auf null.',
      cond:'Längste Niederlagenserie der Ligageschichte, ab 7 Niederlagen in Folge',
      min:7, raw:p => p.lossStreak,
      ev:(p,v) => `${v} Niederlagen in Folge`,
      zeit:p => p.lossSpan || ''
    }},

  {id:'abyss', name:'Das Fass ohne Boden', short:'Debakel', ic:'dizzy', tone:'red', art:'schatten',
    // Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1].
    monat:{
      beiname:'Der Eingebrochene',
      art:'schatten',
      klasse:'legendaer', aus:3.52,
      wie:'Ein 0:10 ist die höchstmögliche Niederlage. Der Nenner sind die eigenen Pleiten des Monats und nicht alle Partien: gefragt ist, wie hoch verloren wird, und nicht wie oft.',
      cond:'Mindestens 15 % der eigenen Pleiten endeten 0:10, ab 5 Pleiten',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        p => p.debacle / p.losses,
        0.15,
        (p, v) => `${pct(v)} % aller ${p.losses} Pleiten endeten 0:10 · ${p.debacle} Debakel`))},
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'25 Niederlagen und 3 % Nullnummern',
      wie:'Gezählt werden die Niederlagen mit 0:10, geteilt durch alle eigenen Niederlagen. Der Nenner sind die Niederlagen und nicht die Partien: gefragt ist, wie hoch verloren wird, und nicht wie oft.',
      cond:'Höchster Anteil an 0:10-Niederlagen unter allen eigenen Niederlagen, ab 25 Niederlagen und mindestens 3 %',
      val:p => (p.losses >= 25 && p.debacle/p.losses >= 0.03) ? p.debacle/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen endeten 0:10 · ${p.debacle} Stück`
    }},

  {id:'hardluck', name:'Der Pechvogel', short:'Pechvogel', ic:'heartBroken', tone:'red', art:'schatten',
    // Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1].
    monat:{
      beiname:'Der Unglückliche',
      art:'schatten',
      klasse:'legendaer', aus:3.13,
      wie:'Ein 9:10 ist die knappste mögliche Niederlage. Der Nenner sind die eigenen Pleiten und nicht die engen Partien: gefragt ist, wie jemand verliert, nicht wie eng es zuging.',
      cond:'Mindestens 35 % der eigenen Pleiten endeten 9:10, ab 5 Pleiten',
      ...(_stWertung(
        p => p.losses >= ST_TEIL,
        p => p.bitter / p.losses,
        0.35,
        (p, v) => `${pct(v)} % aller ${p.losses} Pleiten endeten 9:10 · ${p.bitter} davon`))},
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, alle Niederlagen',
      mind:'25 Niederlagen und 8 % Ein-Tor-Pleiten',
      wie:'Gezählt werden die Niederlagen mit 9:10, geteilt durch alle eigenen Niederlagen.',
      cond:'Höchster Anteil an 9:10-Niederlagen unter allen eigenen Niederlagen, ab 25 Niederlagen und mindestens 8 %',
      val:p => (p.losses >= 25 && p.bitter/p.losses >= 0.08) ? p.bitter/p.losses : null,
      ev:(p,v) => `${Math.round(v*100)} % aller ${p.losses} Niederlagen endeten 9:10 · ${p.bitter} Stück`
    }},

  {id:'freefall', name:'Der Sturzflug', short:'Sturzflug', ic:'crownFallen', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Von einem Saisonende zum nächsten',
      mind:'10 Partien in beiden Saisons und 150 Elo Verlust',
      wie:'Verglichen werden die Elo-Endstände zweier aufeinanderfolgender Saisons, in denen jeweils mindestens zehn Partien gespielt wurden. Gewertet wird der größte Rückgang.',
      cond:'Größter Elo-Verlust von einem Saisonende zum nächsten, ab 10 Partien in beiden Saisons und 150 Elo',
      val:p => (p.fall && p.fall.d <= -150) ? -p.fall.d : null,
      ev:p => `${Math.round(p.fall.d)} Elo von ${p.fall.from} auf ${p.fall.to}`,
      zeit:p => p.fall ? p.fall.to : ''
    }},

  {id:'sieve', name:'Das Scheunentor', short:'Sieb', ic:'hole', tone:'red', art:'schatten',
    // Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1].
    monat:{
      beiname:'Der Durchlässige',
      art:'schatten',
      klasse:'selten', aus:1.82,
      wie:'Gezählt werden die Tore, die das eigene Team kassiert hat, während dieser Spieler hinten stand, geteilt durch die Zahl dieser Partien.',
      cond:'Mindestens 9,5 Gegentore je Abwehrspiel, ab 5 Abwehrspielen',
      ...(_stWertung(
        p => p.defG >= ST_TEIL,
        p => p.defConceded / p.defG,
        9.5,
        (p, v) => `${komma(v)} Gegentore je Abwehrspiel · ${p.defG} Spiele`))},
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, alle Abwehrspiele',
      mind:'30 Abwehrspiele',
      wie:'Die Gegentore je Abwehrspiel gegen die Gegentore je Partie über die ganze Laufbahn. Gewertet wird der Anstieg, nicht die Höhe: gefragt ist, ob es hinten schlechter läuft als sonst, und diese Frage hängt nicht am Niveau.',
      cond:'Größter Anstieg der Gegentore in der Abwehr gegenüber dem eigenen Laufbahnschnitt, ab 30 Abwehrspielen',
      val:p => {
        if(p.defG < 30) return null;
        const d = (p.defConceded/p.defG) - (p.ga/p.games);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${komma(v)} Gegentore mehr je Abwehrspiel · ${komma(p.defConceded/p.defG)} statt ${komma(p.ga/p.games)}`
    }},

  {id:'angstgegner', name:'Der Angstgegner', short:'Angst', ic:'devilMask', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Geplagte',
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
        p=>`${p._ag.w} von ${p._ag.n} gegen ${pname(p._ag.g)}`))},
    // Dieselbe Frage ueber die ganze Laufbahn [§13.1]. Zwanzig Duelle statt
    // acht: was ein Monat als Serie zeigt, muss eine Laufbahn als Muster
    // zeigen. Gezaehlt wird gegen die Duelle gegen GENAU diesen Gegner und
    // nicht gegen alle Partien [§C37].
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, je Gegner',
      mind:'20 Duelle gegen denselben Gegner',
      wie:'Für jeden Gegner mit mindestens zwanzig Duellen steht der eigene Niederlagenanteil. Gewertet wird der höchste davon. Der Nenner sind die Duelle gegen genau diesen Gegner und nicht alle eigenen Partien.',
      cond:'Höchster Niederlagenanteil gegen einen einzelnen regelmäßigen Gegner, ab 20 Duellen',
      val:p => p.angstQ != null ? 1 - p.angstQ : null,
      ev:p => `${Math.round((1-p.angstQ)*100)} % der ${p.angstN} Duelle gegen einen einzelnen Gegner verloren · ${p.angstN - p.angstW} Pleiten`
    }},

  {id:'untersoll', name:'Das Untersoll', short:'Untersoll', ic:'chartDown', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Gehemmte',
      art:'schatten',
      klasse:'besonders', aus:1.81,
      wie:'Dieselbe Rechnung wie beim Übersoll, nur andersherum.',
      cond:'Mindestens 20 Prozentpunkte unter der eigenen Elo-Erwartung',
      ...(_stWertung(
        p=>p.games>=8,
        p=>p.expQ-p.q,
        0.2,
        p=>`${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`))},
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn',
      mind:'40 Partien',
      wie:'Dieselbe Rechnung wie beim Übersoll, in die andere Richtung: die mittlere Siegchance vor den eigenen Partien gegen die tatsächliche Siegquote. Gewertet wird der Rückstand.',
      cond:'Größter Rückstand der Siegquote auf die eigene Elo-Erwartung, ab 40 Partien',
      val:p => {
        if(p.games < 40) return null;
        const d = (p.expSum/p.games) - (p.wins/p.games);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${Math.round(v*100)} Punkte unter der Rechnung · ${pct(p.wins/p.games)} statt ${pct(p.expSum/p.games)} % in ${p.games} Partien`
    }},

  // ── Vier neue Schanden [§C35] ────────────────────────────────────
  // Jede fragt nach dem ABSTAND ZUM EIGENEN oder gegen eine Teilmenge, nicht
  // nach dem Niveau. Eine Schande, die das Niveau misst, gehoert immer
  // demselben Spieler: gemessen hielt der Zehnte der Siegquote sechs von elf
  // Haltungen der Schandtafel, sobald die Kandidaten das reine Niveau
  // fragten. Dieselbe Begruendung wie bei der Chronik fuer die Mitte des
  // Feldes [§C38].
  {id:'misfire', name:'Die Ladehemmung', short:'Torarm', ic:'misfireBall', tone:'red', art:'schatten',
    monat:{
      beiname:'Der Harmlose',
      art:'schatten',
      klasse:'selten', aus:1.81,
      wie:'Verglichen werden die Tore des eigenen Teams je Sturmspiel mit denen je Partie über alles. Gefragt ist nicht, wer wenig Tore sieht, sondern wer vorne weniger beiträgt als hinten.',
      cond:'Mindestens 1,2 Tore je Sturmspiel unter dem eigenen Mittel, ab 5 Sturmspielen und 8 Partien',
      ...(_stWertung(
        p => p.atkG >= ST_TEIL && p.games >= TITLE_MIN_GAMES,
        p => (p.gf / p.games) - (p.atkGoals / p.atkG),
        1.2,
        (p, v) => `${komma(v)} Tore weniger im Sturm · `
           + `${komma(p.atkGoals/p.atkG)} statt ${komma(p.gf/p.games)} in ${p.atkG} Sturmspielen`))},
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, alle Sturmspiele',
      mind:'30 Sturmspiele',
      wie:'Die eigenen Tore je Partie über die ganze Laufbahn gegen die eigenen Tore je Sturmspiel. Gewertet wird der Rückgang, nicht die Höhe: gefragt ist, ob es vorne schlechter läuft als sonst.',
      cond:'Größter Rückgang der eigenen Tore im Sturm gegenüber dem eigenen Laufbahnschnitt, ab 30 Sturmspielen',
      val:p => {
        if(p.atkG < 30) return null;
        const d = (p.gf/p.games) - (p.atkGoals/p.atkG);
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${komma(v)} eigene Tore weniger je Sturmspiel · ${komma(p.atkGoals/p.atkG)} statt ${komma(p.gf/p.games)}`
    }},

  // Nur die Laufbahn: auf der Monatsachse schiebt diese Frage ihre Schwelle
  // gemessen hoechstens 1,39 σ hinaus, und darunter liegt ihr Bester kaum
  // weiter draussen als der Schnitt [§C39]. Ein Monat ist zu kurz dafuer —
  // fuenf Gelegenheiten zu antworten sind ein Wurf, fuenfundzwanzig ein
  // Muster.
  {id:'noanswer', name:'Die stumme Antwort', short:'Stumm', ic:'mutedReply', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn',
      mind:'25 Partien direkt nach einer Niederlage',
      wie:'Dieselbe Rechnung wie beim Stehaufmann, in die andere Richtung: die Siegquote direkt nach einer eigenen Niederlage gegen die Siegquote in allen übrigen eigenen Partien. Gewertet wird der Einbruch.',
      cond:'Größter Einbruch direkt nach einer Niederlage, ab 25 Gelegenheiten',
      val:p => {
        if(p.afterLossOpp < 25) return null;
        const rest = p.games - p.afterLossOpp;
        if(rest < 1) return null;
        const d = (p.wins - p.afterLoss)/rest - p.afterLoss/p.afterLossOpp;
        return d > 0 ? d : null;
      },
      ev:(p,v) => `${Math.round(v*100)} %-Punkte weniger nach einer Pleite · ${pct(p.afterLoss/p.afterLossOpp)} statt ${pct((p.wins - p.afterLoss)/(p.games - p.afterLossOpp))} % sonst`
    }},

  {id:'favflop', name:'Der Wackelkandidat', short:'Wackel', ic:'wobbleStep', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, alle Favoritenspiele',
      mind:'20 Partien als Favorit',
      wie:'Favorit heißt: die Elo-Rechnung gab dem eigenen Team vor dem Anpfiff mehr als 55 Prozent Siegchance. Gewertet wird der Niederlagenanteil in genau diesen Partien, also dieselbe Teilmenge wie beim Souverän.',
      cond:'Höchster Niederlagenanteil als Favorit, ab 20 Partien als Favorit',
      val:p => p.favN >= 20 ? p.favL/p.favN : null,
      ev:(p,v) => `${Math.round(v*100)} % der ${p.favN} Favoritenspiele verloren · ${p.favL} Niederlagen`
    }},

  {id:'ballast', name:'Der Klotz am Bein', short:'Klotz', ic:'dragWeight', tone:'red', art:'schatten',
    allzeit:{
      kammer:'shame', basis:0,
      zeitraum:'Ganze Laufbahn, je Partner',
      mind:'3 Partner mit je 15 gemeinsamen Partien',
      wie:'Die spiegelbildliche Rechnung zum Katalysator aus derselben Zahl: für jeden Partner die gemeinsame Siegquote gegen dessen Quote in allen übrigen Partien, gewichtet nach den gemeinsamen Partien. Gewertet wird der Rückgang.',
      cond:'Größter negativer Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
      val:p => (p.einflussN >= 3 && p.einflussD != null && p.einflussD < 0) ? -p.einflussD : null,
      ev:(p,v) => `${Math.round(v*100)} %-Punkte verlieren die ${p.einflussN} Partner an dieser Seite häufiger`
    }},

  // ═══ MONATSCHRONIKEN ══════════════════════════════════════════════
  // Keine davon fragt „wer ist der Beste". Sie fragen nach der Abweichung
  // von der Erwartung, nach Konstanz, nach dem Verhaeltnis zum Ligamittel
  // oder zu einem bestimmten anderen Spieler [§C39]. Drei weitere stehen
  // oben bei ihrer Allzeitwertung: dieselbe Frage auf zwei Zeitachsen
  // gehoert in EINE Disziplin [§13.1].

  {id:'tagesregent', name:'Der Tagesregent', short:'Regent', ic:'crownPlus', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Tagesherrscher',
      art:'koennen',
      klasse:'legendaer', aus:2.6,
      wie:'Player of the Day ist, wer an einem Spieltag die beste Bilanz hat. Gezählt wird der Anteil an den eigenen Spieltagen.',
      cond:'An mindestens 60 % der eigenen Spieltage Player of the Day, ab 4 Spieltagen',
      ...(_stWertung(
        p=>p.days>=4,
        p=>p.potd/p.days,
        0.6,
        (p,v)=>`Player of the Day an ${p.potd} der ${p.days} Spieltage · ${pct(v)} %`))}},

  {id:'thron', name:'Auf dem Thron', short:'Thron', ic:'temple', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unantastbare',
      art:'koennen',
      klasse:'legendaer', aus:2.64,
      wie:'Gemessen wird der schlechteste Platz, den die Liga-Tabelle am Ende eines Spieltags zeigte. Gezählt wird jeder Spieltag des Monats, auch einer ohne eigene Partie: wer aussetzt, kann überholt werden.',
      cond:'An keinem Spieltag des Monats aus den ersten zwei Plätzen der Liga gefallen',
      ...(_stWertung(
        p=>p.thronRang != null,
        p=>-p.thronRang,
        -2,
        (p)=>`Nie schlechter als Platz ${p.thronRang} · ${p.tagN} eigene Spieltage`))}},

  {id:'angstfrei', name:'Ohne Angstgegner', short:'Angstfrei', ic:'shieldCheck', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Furchtlose',
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
      beiname:'Der Dauerregent',
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
      beiname:'Der Überlegene',
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
      beiname:'Der Aufholer',
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
      beiname:'Der Wegbereiter',
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
      beiname:'Der Saubermann',
      art:'koennen',
      klasse:'besonders', aus:1.89,
      wie:'Ein Sieg zu null oder zu eins ist die seltenste Art zu gewinnen.',
      cond:'Mindestens 10 % der eigenen Siege mit höchstens einem Gegentor, ab 5 Siegen',
      ...(_stWertung(
        p=>p.wins>=ST_TEIL,
        p=>p.partien.filter(s=>s.win&&s.ga<=1).length/p.wins,
        0.1,
        p=>`${p.partien.filter(s=>s.win&&s.ga<=1).length} von ${p.wins} Siegen mit höchstens einem Gegentor`))}},

  {id:'bollwerk', name:'Das Bollwerk', short:'Bollwerk', ic:'dominator', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unüberwindliche',
      art:'koennen',
      klasse:'selten', aus:1.87,
      wie:'Die Gegentore je Partie gegen den Schnitt aller, die in diesem Monat gespielt haben.',
      cond:'Mindestens 1,5 Gegentore je Partie unter dem Schnitt aller Spieler des Monats',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>_stMittel(Object.values(c.P).map(x=>x.ga/x.games))-p.ga/p.games,
        1.5,
        (p,v,c)=>`${komma(p.ga/p.games)} Gegentore je Partie · Liga ${komma(_stMittel(Object.values(c.P).map(x=>x.ga/x.games)))}`))}},

  {id:'ausreisser2', name:'Der Ausreißer', short:'Ausreißer', ic:'godRay', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Ausreißer',
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
      beiname:'Der Ausdauernde',
      art:'koennen',
      klasse:'selten', aus:1.79,
      wie:'Die jeweils letzte Partie jedes eigenen Spieltags. Wer sie gewinnt, geht im Plus nach Hause.',
      cond:'Mindestens 75 % der letzten Partien eines Spieltags gewonnen, ab 5 Spieltagen',
      ...(_stWertung(
        p=>p.tagN>=ST_TEIL,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return l.filter(s=>s.win).length/l.length;},
        0.75,
        p=>{const l=Object.values(p.tagGrp).map(a=>a[a.length-1]);return `${l.filter(s=>s.win).length} von ${l.length} Tagesabschlüssen gewonnen`;}))}},

  {id:'umschwung', name:'Der Umschwung', short:'Wende', ic:'overtake', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Verwandelte',
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

  {id:'aufholjagd', name:'Die Antwort', short:'Antwort', ic:'rematch', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Trotzige',
      art:'koennen',
      klasse:'besonders', aus:1.71,
      wie:'Nur die Partien, die auf eine Pleite folgen. Gemessen wird der Anteil, nicht die längste Serie.',
      cond:'Mindestens 80 % der Partien direkt nach einer Niederlage gewonnen, ab 5 Gelegenheiten',
      ...(_stWertung(
        p=>_stNachPleite(p).length>=ST_TEIL,
        p=>{const d=_stNachPleite(p);return d.filter(s=>s.win).length/d.length;},
        0.8,
        p=>{const d=_stNachPleite(p);return `${d.filter(s=>s.win).length} von ${d.length} Antworten nach einer Pleite`;}))}},

  {id:'favschreck', name:'Der Favoritenschreck', short:'Schreck', ic:'giantSlayer', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Favoritenschreck',
      art:'koennen',
      klasse:'selten', aus:1.7,
      wie:'Klarer Favorit heißt: das gegnerische Team hatte vorher mindestens 65 Prozent Siegchance.',
      cond:'Mindestens 40 % gegen klare Favoriten, ab 5 solchen Partien',
      ...(_stWertung(
        p=>p.partien.filter(s=>s.exp<=CHANCE_UPSET).length>=ST_TEIL,
        p=>{const d=p.partien.filter(s=>s.exp<=CHANCE_UPSET);return d.filter(s=>s.win).length/d.length;},
        0.4,
        p=>{const d=p.partien.filter(s=>s.exp<=CHANCE_UPSET);return `${d.filter(s=>s.win).length} von ${d.length} gegen klare Favoriten`;}))}},

  {id:'formgipfel', name:'Der Formgipfel', short:'Formgipfel', ic:'chartUp', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Entfesselte',
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
      beiname:'Der Unmögliche',
      art:'koennen',
      klasse:'legendaer', aus:1.57,
      wie:'Die Rechnung gab vor jeder Partie eine Siegchance. Daraus folgt, wie wahrscheinlich der ganze Monat so oder besser ausgeht.',
      cond:'Ein Monat, den die Elo-Rechnung mit höchstens 2 % erwartet hat',
      ...(_stWertung(
        p=>p.games>=8,
        p=>1-_stPBinom(p.exp,p.wins),
        0.98,
        (p,v)=>`${p.wins} von ${p.games} Siegen · erwartet waren ${pct(1-v)} %`))}},

  {id:'schwachstelle', name:'Ohne Schwachstelle', short:'Lückenlos', ic:'kingClass', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Lückenlose',
      art:'koennen',
      klasse:'legendaer', aus:1.57,
      wie:'Fünf Teilquoten desselben Monats, und gewertet wird die schwächste davon. Anderswo zählt ein Ausschlag nach oben; hier zählt, dass es nirgends einen Einbruch gibt.',
      cond:'In allen fünf Lagen mindestens 50 %: vorne, hinten, gegen die Stärkeren, in engen Partien und nach einer Niederlage, ab 5 Partien je Lage',
      ...(_stWertung(
        (p,c)=>_stLagen(p,c)!=null,
        (p,c)=>{const q=_stLagen(p,c);return q?Math.min(...Object.values(q)):null;},
        0.5,
        (p,v,c)=>{const q=_stLagen(p,c);
      return `vorne ${pct(q.vorne)} %, hinten ${pct(q.hinten)} %, gegen oben ${pct(q.oben)} %, `
      +`eng ${pct(q.eng)} %, nach Pleite ${pct(q.antwort)} %`;}))}},

  {id:'schwachewoche', name:'Ohne schwache Woche', short:'Durchweg', ic:'weekly', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Beständige',
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
      beiname:'Der Erwartungstreue',
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
      beiname:'Der Grundsolide',
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

  {id:'beidseitig', name:'Der Beidfüßige', short:'Beidfüßig', ic:'sort', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Beidfüßige',
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

  // ── Zweite Runde: neun Chroniken mehr [§C39] ─────────────────────
  // Alle an den echten Partien kalibriert. Was hier nicht steht, hat eine
  // der beiden Regeln gerissen: die Schwelle liess sich nicht 1,5 σ
  // hinausschieben, oder der Wert hing an der Spielzahl. „Die Sammlung"
  // (wie viele verschiedene Ergebnisse) korrelierte mit −0,91 zur
  // Spielzahl — wer zwoelf Partien spielt, hat zwoelf verschiedene
  // Ergebnisse —, „Der Tag gegen die Rechnung" mit +0,56.
  {id:'wochwunder', name:'Die Woche gegen die Rechnung', short:'Wunder', ic:'underdog', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Wundertäter',
      art:'koennen',
      klasse:'legendaer', aus:2.79,
      wie:'Gerechnet wird die Wahrscheinlichkeit, in dieser Woche so viele Siege oder mehr zu holen. Partie für Partie aus der Siegchance, die vor dem Anpfiff stand.',
      cond:'Eine Kalenderwoche, die die Elo-Rechnung mit höchstens 0,5 % erwartet hat, ab 6 Partien in dieser Woche',
      ...(_stWertung(
        p=>_stWochGross(p).length>=1,
        p=>-Math.log10(Math.max(1e-6, Math.min(..._stWochGross(p)
             .map(a=>_stPBinom(a.map(s=>s.exp), a.filter(s=>s.win).length))))),
        -Math.log10(0.005),
        (p,v)=>`Eine Woche, die mit ${komma(Math.pow(10,-v)*100)} % erwartet war · ${_stWochGross(p).length} Wochen gewertet`))}},

  {id:'gleichmut', name:'Der Gleichmut', short:'Gleichmut', ic:'weight', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Gleichmütige',
      art:'konstanz',
      klasse:'legendaer', aus:3.20,
      wie:'Nicht wie hoch gewonnen wird, sondern wie gleichmäßig. Wer jede Partie mit zwei Toren Unterschied beendet, steht vor dem, der 10:0 und 0:10 abwechselt.',
      cond:'Die Tordifferenz jeder Partie bleibt im Schnitt höchstens 3,0 Tore vom eigenen Mittel entfernt',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>-_stStreu(p.partien.map(s=>s.gf-s.ga)),
        -3.0,
        (p,v)=>`${komma(-v)} Tore Streuung um ${p.gd/p.games<0?'−':'+'}${komma(Math.abs(p.gd/p.games))} im Schnitt`))}},

  {id:'zweiteluft', name:'Die zweite Luft', short:'Luft', ic:'flameDouble', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Spätzünder',
      art:'koennen',
      klasse:'legendaer', aus:2.11,
      wie:'Der Vergleich läuft innerhalb der eigenen Spieltage: dieselben Gegner, dieselbe Woche, nur später am Tag.',
      cond:'Ab der vierten Partie eines Spieltags mindestens 40 Prozentpunkte stärker als in den ersten drei, ab 5 Partien in jedem Block',
      ...(_stWertung(
        p=>_stTagBlock(p).frueh.length>=ST_TEIL && _stTagBlock(p).spaet.length>=ST_TEIL,
        p=>{const b=_stTagBlock(p); return _stQuote(b.spaet)-_stQuote(b.frueh);},
        0.40,
        (p)=>{const b=_stTagBlock(p);
          return `${pct(_stQuote(b.spaet))} % ab der vierten Partie, ${pct(_stQuote(b.frueh))} % davor`;}))}},

  {id:'auferstehung', name:'Die Auferstehung', short:'Rückkehr', ic:'trophyCheck', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Unbeugsame',
      art:'koennen',
      klasse:'legendaer', aus:2.14,
      wie:'Nach einer Pleite fragt „Die Antwort". Zwei am Stück sind die Stelle, an der ein Tag kippt.',
      cond:'Jede Partie nach zwei Pleiten am Stück gewonnen, ab 5 solchen Gelegenheiten',
      ...(_stWertung(
        p=>_stNachZwei(p).length>=ST_TEIL,
        p=>_stQuote(_stNachZwei(p)),
        1,
        (p)=>{const a=_stNachZwei(p);
          return `${a.filter(s=>s.win).length} von ${a.length} Partien nach zwei Pleiten am Stück`;}))}},

  {id:'nulldiaet', name:'Die Nulldiät', short:'Nulldiät', ic:'egg', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Zugeknöpfte',
      art:'koennen',
      klasse:'selten', aus:2.31,
      wie:'Gezählt wird der Anteil, nicht die Anzahl. Ein Spiel geht auf zehn, drei Gegentore sind eine geschlossene Partie.',
      cond:'Mindestens 20 % der Partien mit höchstens drei Gegentoren',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>p.partien.filter(s=>s.ga<=3).length/p.games,
        0.20,
        (p,v)=>`${p.partien.filter(s=>s.ga<=3).length} von ${p.games} Partien mit höchstens 3 Gegentoren · ${pct(v)} %`))}},

  {id:'serienbrecher', name:'Der Serienbrecher', short:'Brecher', ic:'flameBreak', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Serienbrecher',
      art:'koennen',
      klasse:'legendaer', aus:1.60,
      wie:'Die Serie des Gegners wird für jede Partie neu nachgezählt, mit dem Stand vor dem Anpfiff.',
      cond:'Mindestens 70 % gegen Gegner, die zum Zeitpunkt der Partie drei Siege am Stück tragen, ab 5 solchen Partien',
      ...(_stWertung(
        p=>p.brechG>=ST_TEIL,
        p=>p.brechW/p.brechG,
        0.70,
        (p,v)=>`${p.brechW} von ${p.brechG} gegen eine laufende Serie · ${pct(v)} %`))}},

  {id:'wochenschluss', name:'Der Wochenschluss', short:'Schluss', ic:'medal', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Vollender',
      art:'koennen',
      klasse:'selten', aus:1.83,
      wie:'Der letzte Ball einer Woche ist der, der stehen bleibt, bis wieder gespielt wird.',
      cond:'Jede letzte Partie einer Kalenderwoche gewonnen, ab 4 Wochen mit je 3 Partien',
      ...(_stWertung(
        p=>_stWochLetzte(p).length>=4,
        p=>_stQuote(_stWochLetzte(p)),
        1,
        (p)=>{const a=_stWochLetzte(p);
          return `${a.filter(s=>s.win).length} von ${a.length} Wochenabschlüssen gewonnen`;}))}},

  {id:'rollenfest', name:'Favorit wie Außenseiter', short:'Rollen', ic:'swords', tone:'blue', art:'leistung',
    monat:{
      beiname:'Der Unbeeindruckte',
      art:'konstanz',
      klasse:'selten', aus:1.68,
      wie:'Favorit ist über 55 % Siegchance, Außenseiter unter 45 %. Gemessen wird der Abstand zwischen beiden Quoten, nicht wie hoch sie liegen.',
      cond:'Als klarer Favorit und als Außenseiter höchstens 5 Prozentpunkte auseinander, ab 5 Partien in jeder Lage',
      ...(_stWertung(
        p=>_stRollen(p).fav.length>=ST_TEIL && _stRollen(p).aus.length>=ST_TEIL,
        p=>{const r=_stRollen(p); return -Math.abs(_stQuote(r.fav)-_stQuote(r.aus));},
        -0.05,
        (p)=>{const r=_stRollen(p);
          return `${pct(_stQuote(r.fav))} % als Favorit, ${pct(_stQuote(r.aus))} % als Außenseiter`;}))}},

  {id:'aufstieg', name:'Der Aufstieg', short:'Aufstieg', ic:'medalTrio', tone:'gold', art:'leistung',
    monat:{
      beiname:'Der Aufsteiger',
      art:'koennen',
      klasse:'besonders', aus:1.61,
      wie:'Verglichen wird der Tabellenplatz am ersten eigenen Spieltag mit dem am letzten Spieltag des Monats. Die Tabelle ist die des Monats, sie startet für alle gleich.',
      cond:'Im Monat mindestens 8 Plätze in der Liga-Tabelle gewonnen',
      ...(_stWertung(
        p=>p.platzErst != null && p.platzLetzt != null,
        p=>p.platzErst-p.platzLetzt,
        8,
        (p,v)=>`von Platz ${p.platzErst} auf Platz ${p.platzLetzt} · ${v} Plätze`))}},

  {id:'zitterkoenig', name:'Der Zitterkönig', short:'Zittersieg', ic:'brokenHeart', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Zitterkönig',
      art:'fuegung',
      klasse:'legendaer', aus:3.84,
      wie:'Knapp heißt höchstens zwei Tore Vorsprung. Gezählt wird der Anteil an den eigenen Siegen, nicht an allen Partien.',
      cond:'JEDER einzelne Sieg des Monats war knapp, ab 6 Siegen',
      ...(_stWertung(
        p=>p.wins>=6,
        p=>p.partien.filter(s=>s.win&&s.gf-s.ga<=2).length/p.wins,
        1,
        p=>`${p.partien.filter(s=>s.win&&s.gf-s.ga<=2).length} von ${p.wins} Siegen waren knapp`))}},

  {id:'nervenkitzel', name:'Der Nervenkitzel', short:'Kitzel', ic:'cone', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Dauerzitterer',
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
      beiname:'Der Befreite',
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
      beiname:'Der Spezialist',
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
      beiname:'Der Spektakuläre',
      art:'fuegung',
      klasse:'besonders', aus:2.54,
      wie:'Der Torschnitt der eigenen Partien gegen den aller Partien desselben Monats.',
      cond:'In den eigenen Partien fallen mindestens 1 Tore mehr als im Ligaschnitt des Monats',
      ...(_stWertung(
        p=>p.games>=8,
        (p,c)=>(p.gf+p.ga)/p.games-c.L.torSchnitt,
        1,
        (p,v,c)=>`${komma((p.gf+p.ga)/p.games)} Tore je Partie · Liga ${komma(c.L.torSchnitt)}`))}},

  {id:'lieblingszahl', name:'Die Lieblingszahl', short:'Die Zahl', ic:'hundred', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Gewohnheitstäter',
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

  {id:'wechselhaft', name:'Der Wechselhafte', short:'Wechsel', ic:'weatherMix', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Wechselhafte',
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
      beiname:'Der Kontrastreiche',
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

  {id:'kaltblut', name:'Das Kaltblut', short:'Kaltblut', ic:'iceCube', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Kaltblütige',
      art:'fuegung',
      klasse:'legendaer', aus:1.61,
      wie:'Ein Tor Unterschied heißt: der letzte Ball hat entschieden.',
      cond:'Mindestens 80 % der Partien gewonnen, die mit einem Tor Unterschied endeten, ab 5 solchen Partien',
      ...(_stWertung(
        p=>_stEinTor(p).length>=ST_TEIL,
        p=>_stQuote(_stEinTor(p)),
        0.80,
        (p,v)=>{const a=_stEinTor(p);
          return `${a.filter(s=>s.win).length} von ${a.length} Partien um den letzten Ball · ${pct(v)} %`;}))}},

  {id:'randlage', name:'Immer am Rand', short:'Am Rand', ic:'search', tone:'purple', art:'ereignis',
    monat:{
      beiname:'Der Grenzgänger',
      art:'fuegung',
      klasse:'selten', aus:1.95,
      wie:'Keine Leistung, eine Fügung: wem die engen Partien zufallen, entscheidet niemand selbst.',
      cond:'Mindestens 25 % der eigenen Partien endeten mit genau einem Tor Unterschied',
      ...(_stWertung(
        p=>p.games>=TITLE_MIN_GAMES,
        p=>_stEinTor(p).length/p.games,
        0.25,
        (p,v)=>`${_stEinTor(p).length} von ${p.games} Partien mit einem Tor Unterschied · ${pct(v)} %`))}}
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
    kunst:d.monat.art, klasse:d.monat.klasse, aus:d.monat.aus, beiname:d.monat.beiname,
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

