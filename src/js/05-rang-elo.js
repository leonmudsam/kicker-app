// ╔═══ §2.7 ─── RANG-SYSTEM (Durchschnitts-Saison-Elo) ─────────────────╗
//     Spieler-Rang ergibt sich aus dem durchschnittlichen Saison-Elo über
//     alle absolvierten Saisons.
// ╚═════════════════════════════════════════════════════════════════════════╝
const RANKS=[
  {label:'Legende',   icon:'rang5',  color:'var(--gold)',   pct:0.10},
  {label:'Elite',     icon:'rang4',   color:'var(--purple)', pct:0.30},
  {label:'Stark',     icon:'rang3',  color:'var(--acid)',   pct:0.60},
  {label:'Solide',    icon:'rang2', color:'var(--blue)',   pct:0.85},
  {label:'Einsteiger',icon:'rang1',   color:'var(--orange)', pct:1.00},
];

// Mit `bisMs` der Stand bis dorthin — für den eingefrorenen Rang eines
// Ruheständlers [§C40], der sich mit späteren Partien anderer nicht
// verschieben darf.
function getSeasonAvgElos(bisMs){
  // Direkter Lookup aus getGlobalSim — der globale Sim hat bereits Karriere-Elo
  // (gewichteter Durchschnitt aller Saison-End-Elos). Vermeidet Doppelberechnung.
  const sim=bisMs==null?getGlobalSim():getSimAt(bisMs);
  const avgs={};
  players.forEach(p=>{
    avgs[p.id]=sim.careerElo[p.id]!==null && sim.careerElo[p.id]!==undefined
      ? Math.round(sim.careerElo[p.id]) : null;
  });
  return avgs;
}
// Die Rangstufen der Ewigen Tafel aus einer Elo-Tabelle. Eine Stelle für
// die Reihenfolge, damit der eingefrorene Rang dieselbe Rechnung nimmt wie
// der heutige [§C27].
function _rangTabelle(avgs){
  const ranked=players
    .filter(p=>ligaAktiv(p)&&avgs[p.id]!==null&&avgs[p.id]!==undefined)
    .sort((a,b)=>avgs[b.id]-avgs[a.id]);
  const result={};
  ranked.forEach((p,idx)=>{
    const pct=(idx+1)/ranked.length;
    const rank=RANKS.find(r=>pct<=r.pct)||RANKS[RANKS.length-1];
    result[p.id]={...rank,avg:avgs[p.id],perzentil:pct*100};
  });
  return result;
}
function getAllPlayerRanks(){
  const key='allRanks_'+matches.length+'_'+_cache.version;
  if(_cache._allRanksKey===key) return _cache._allRanksData;
  const result=_rangTabelle(getSeasonAvgElos());
  _cache._allRanksKey=key;
  _cache._allRanksData=result;
  return result;
}

// Wie weit vorn jemand in der Ewigen Tafel steht, in Prozent der aktiven
// Liga. Ein Ruheständler behält den Wert seines Karriereendes [§C40].
function rangPerzentil(id){
  const r=getPlayerRank(id);
  return r&&r.perzentil||0;
}

function getPlayerRank(id){
  // Ein Ruheständler trägt den Rang, mit dem er aufgehört hat [§C40] — die
  // Liga von heute vergleicht ihn nicht mehr.
  if(imRuhestand(id)) return ruhestandStand(id).rang||null;
  return getAllPlayerRanks()[id]||null;
}

// Das Rangabzeichen. Die Gestaltung steht in 02-ranking.css; hier bleibt nur
// die Farbe, weil sie vom Rang kommt und sonst als fünf Klassen im CSS
// stünde. Vorher trug das Abzeichen seine zehn Angaben im style-Attribut —
// wer die Höhe ändern wollte, musste sie im JavaScript suchen.
function rankBadgeHtml(id, size='sm'){
  const r=getPlayerRank(id); if(!r) return '';
  return `<span class="rangab${size==='lg'?' gross':''}" style="--rc:${r.color}"
    >${svgI(r.icon)}${esc(r.label)}</span>`;
}


// ── Eine Metrikleiste für alle vier Zeiträume [§C28] ─────────────────
// Vorher hatte jeder Reiter im Liga-Tab seine eigene Bedienung: die Saison
// gar keine, Woche und Tag zwei Knöpfe mit der Aufschrift „Nach Siegen" /
// „Nach Elo", die Ewige Tafel fünf mit anderer Aufschrift. Drei Sprachen
// für dieselbe Frage. Jetzt steht überall dieselbe Leiste, und der erste
// Eintrag ist die Leitgröße des Zeitraums: nach ihr wird der Erste
// bestimmt, und nur in ihr steht er als Kopfzeile über der Liste.
// Elo heißt dabei im Zeitraum der Zuwachs, in Saison und Gesamt der Stand —
// beides ist „die Elo dieses Zeitraums", nur einmal als Strecke und einmal
// als Punkt.
const METRIC_LABEL={elo:'Elo',wins:'Siege',winrate:'Siegquote',
  goaldiff:'Torbilanz',prestige:'Prestige',games:'Spiele'};
// Fünf Reiter teilen sich 328 px: „Siegquote" stand dort als „Siegq…".
// Im Reiter reicht das Wort, das die Spalte meint; unter der Zahl steht
// weiter der volle Name.
const METRIC_REITER={winrate:'Quote'};
// Die LIGA-Rangliste ist die Elo-Rangliste — in Saison, Woche und Tag gibt
// es dort nichts zu sortieren. Wer nach Siegrate oder Tordiff schaut, sucht
// keine Rangliste, sondern eine Bestenliste, und die steht im Awards-Tab.
// Nur die EWIGE TAFEL blickt über Saisons hinweg; dort ist die Frage „wer
// hat die beste Quote über drei Saisons" tatsächlich eine andere Frage als
// „wer hat die höchste Karriere-Elo", und nur dort steht die Leiste.
// Ein Zeitraum mit genau einer Metrik zeigt gar keine Leiste — das fällt
// unten in metrikLeisteHtml von selbst heraus.
// Die Ewige Tafel sortierte einmal nach „Serie". Eine laufende Serie ist
// aber eine Aussage über DIESE WOCHE, und sie stand in einer Tabelle, die
// über alle Saisons blickt — drei Siege am Stück brachten dort einen
// Karrierespieler vor jemanden mit dreihundert Partien. Wer die Serien
// sehen will, findet sie im Awards-Tab, wo sie hingehören. An ihrer Stelle
// steht jetzt das Prestige [§C34]: die einzige Zahl, die über die ganze
// Laufbahn geht, und die, die das Zeichen an jedem Avatar erklärt.
const PERIOD_METRICS={
  season:['elo'],
  week:  ['elo'],
  day:   ['elo'],
  all:   ['elo','winrate','goaldiff','prestige','games']
};
// Welche Metrik gilt gerade? rankMetric wird auch vom Positionen-Tab
// benutzt (dort 'atk'/'def'), und nicht jeder Zeitraum kennt jede Metrik.
// Statt das an jeder Lesestelle zu prüfen, fällt es hier einmal auf die
// Leitgröße zurück.
function metrikFuer(per){
  const liste = PERIOD_METRICS[per] || PERIOD_METRICS.all;
  return liste.includes(rankMetric) ? rankMetric : liste[0];
}
// Die Leiste selbst — ein Bauteil. Wo es nichts zu wählen gibt, steht auch
// keine Leiste: ein Umschalter mit einem Eintrag ist eine Behauptung, keine
// Bedienung.
function metrikLeisteHtml(per){
  const liste = PERIOD_METRICS[per] || PERIOD_METRICS.all;
  if(liste.length < 2) return '';
  const jetzt = metrikFuer(per);
  return `<div class="ui-tabs">${liste.map(k =>
    `<button data-metric="${k}" class="${jetzt===k?'on':''}">${METRIC_REITER[k]||METRIC_LABEL[k]}</button>`
  ).join('')}</div>`;
}

// ╔═══ §2.8 ─── ERWEITERTES ELO + AUTO-POSITION ────────────────────────╗
//     K-Faktor + Gewichtung + Score-Spread laut cfg.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Bestehende DB-Felder bleiben gleich. Neu: dynamischer K + Margin-of-Victory,
// rein clientseitig berechnet (kein Schema-Umbau nötig).
function expected(a,b){ return 1/(1+Math.pow(10,(b-a)/400)); }

// ─── Wo die Elo-Rechnung ihre Grenzen zieht ──────────────────────────
// Drei Linien, und jede stand als blanke Zahl an mehreren Stellen: Favorit ab
// 55 Prozent Siegchance, auf Augenhoehe von 45 bis 55, Aussenseiter-Sieg
// unter 35. Die 0,35 stand in der Auszeichnung „Upset King" und in BEIDEN
// Chronik-Durchlaeufen — drei Stellen, die dasselbe Ereignis zaehlen und
// deshalb gleich zaehlen muessen [§10.2]. Die Formel selbst stand zweimal da:
// `expected` hier und ein wortgleiches `localExp` in der Elo-Engine.
const CHANCE_FAVORIT = 0.55;
const CHANCE_OFFEN = 0.45;
const CHANCE_UPSET = 0.35;
// Und darunter die Sensation. Die Linie trennt zwei Kartensorten des Feeds,
// die sich sonst doppeln wuerden: unter 20 Prozent erzaehlt der Favoritensturz
// („Der Gigantentoeter"), von 20 bis 35 die Ergebniskarte. Beide Zahlen
// standen blank da, und damit war ihre Zusammengehoerigkeit nicht zu sehen.
const CHANCE_SENSATION = 0.20;
// Ob die Linie selbst noch dazugehoert, ist je Wertung kalibriert: „Der
// Favoritenschreck" verlangt „mindestens 65 Prozent fuer die Gegenseite" und
// zaehlt deshalb `<= CHANCE_UPSET`, der Aussenseiter-Sieg zaehlt `<`. Die
// Grenze ist dieselbe, die Randbedingung nicht — und sie wird nicht
// stillschweigend vereinheitlicht, weil die Schwellen daran geeicht sind.
// Das Wort zu einer Siegchance, an EINER Stelle: die Skala im Blatt einer
// Partie und der Bogen auf ihrer Karte sagen sonst zu 30 % zwei Dinge.
function chanceWort(c){
  return c < CHANCE_SENSATION ? 'Sensation' : c < CHANCE_UPSET ? 'Außenseiter'
       : c < CHANCE_FAVORIT ? 'Augenhöhe' : 'Favorit';
}
function riskWeights(hi,lo,rs){ const gap=Math.min(Math.abs(hi-lo)/400,1); const s=rs*gap; return {strong:1-s,weak:1+s}; }

// ─── §2.8a Das Positionsprofil [§C44] ──────────────────────────────────
// Eine Zahl zwischen 0 und 1: wie sehr jemand Stürmer ist. Sie fragt zwei
// Dinge und rechnet beide als Chance (log-odds), damit sie sich addieren:
//   1) Wo ist jemand besser?  POS_LEISTUNG mal der Abstand der Leistung je
//      Partie, vorne gegen hinten, beide gemessen am eigenen Schnitt und mit
//      POS_SCHRUMPF Partien dorthin gezogen. Leistung heißt: Sieg und
//      Torverhältnis, beide gegen die Erwartung der Partie, je zur Hälfte.
//      Die Erwartung kommt aus der Elo aller vier, sie kennt also Gegner
//      und Mitspieler.
//   2) Wo spielt jemand?  ln((Sturmpartien + 1) / (Abwehrpartien + 1)),
//      voll gewogen, solange eine Seite kaum Partien hat, und mit Partien
//      auf beiden Seiten bis auf POS_MENGE_MIN herunter: dann sagt die
//      Leistung, wo jemand hingehört, und die Aufstellung nur noch wenig.
// Das Ergebnis liegt zwischen 5 und 95 %: ganz am Rand trüge der
// Positionsbonus der Elo-Rechnung (`posFactor`) mehr, als eine Einstufung
// sicher sagen kann.
//
// Vorher zählte die Häufigkeit voll und die Leistung mit dem Faktor 4: bei
// Henry stand −2,5 aus der Aufstellung gegen −0,5 aus der Leistung, und wer
// gleich viel vorne und hinten spielte, aber vorne klar schwächer war (Leo,
// 14 Prozentpunkte), stand bei 35 % Sturm, kaum anders als ein Spieler ohne
// jeden Unterschied. Noch davor verglich die Leistungshälfte die SUMME der
// Überperformance je Position und stellte Henry bei 29 % Sturm ein.
//
// Das Torverhältnis kommt dazu, weil es an den echten Partien verlässlicher
// misst als der Sieg allein: ein 9:10 ist fast ein Unentschieden, ein 2:10
// nicht. Geteilt in zwei Hälften der Partien stimmte der Abstand vorne
// gegen hinten mit Toren zu 0,62 überein, mit Siegen allein zu 0,41.
// Erwartet wird ein Vorsprung, so wie die Siegchance über 50 % liegt: bei
// 75 % Siegchance ein Viertel der Tore mehr (10:6).
//
// Der eigene Schnitt als Maßstab, nicht null: wer insgesamt unter der
// Erwartung spielt, ist deshalb nicht auf beiden Seiten gleich schwach,
// und wer selten vorne steht, wird dort am eigenen Schnitt gemessen, bis
// genug Partien dazukommen. Die Konstanten sind an den 611 Partien der
// Liga gemessen (Henry 6 %, Jane 8 %, Leo 28 %, Maxi 55 %, Jannik 65 %,
// Leon 77 %, Julian 82 %).
const POS_SCHRUMPF = 15;
const POS_LEISTUNG = 10;
const POS_MENGE_MIN = .25;

// Das Torverhältnis einer Partie gegen ihre Erwartung, aus Sicht einer
// Seite: Vorsprung durch alle Tore, weniger der Vorsprung, den die
// Siegchance erwarten lässt. Eine Stelle für die Elo-Rechnung, den
// Rückfall in `posPerfFrom` und die Chronik [§C27].
function posTorLeistung(gf, ga, exp){
  return gf + ga ? (gf - ga) / (gf + ga) - (exp - .5) : 0;
}
// Die Zähler je Spieler, die beide Elo-Rechnungen Partie für Partie
// fortschreiben: Partien, Siege, Leistung (Sieg und Tore gegen die
// Erwartung) und der Elo-Abstand zu Gegnern und Mitspieler, den das
// Blatt der Einstufung zeigt. Beide Rechnungen führten je eine eigene
// Kopie dieser Zeilen. `vorher` ist der Elo-Stand vor der Partie; ohne
// ihn bleiben Gegner und Mitspieler ungezählt.
function posZaehler(){
  return {aG:0,aW:0,dG:0,dW:0,aPerf:0,dPerf:0,aTor:0,dTor:0,aGeg:0,dGeg:0,aMit:0,dMit:0};
}
function posZaehlenPartie(zaehler, m, aWon, expA, vorher){
  [[m.a1,m.a1_pos,m.a2,true],[m.a2,m.a2_pos,m.a1,true],[m.b1,m.b1_pos,m.b2,false],[m.b2,m.b2_pos,m.b1,false]]
  .forEach(([id,pos,mate,onA])=>{
    const t=zaehler[id]; if(!t) return;
    const s=pos==='atk'?'a':'d', won=onA?aWon:!aWon, exp=onA?expA:1-expA;
    t[s+'G']++; if(won) t[s+'W']++;
    t[s+'Perf']+=(won?1:0)-exp;
    t[s+'Tor']+=posTorLeistung(onA?m.score_a:m.score_b, onA?m.score_b:m.score_a, exp);
    if(vorher && t[s+'Geg']!=null){
      const opp=onA?[m.b1,m.b2]:[m.a1,m.a2];
      t[s+'Geg']+=(vorher[opp[0]]+vorher[opp[1]])/2-vorher[id];
      t[s+'Mit']+=vorher[mate]-vorher[id];
    }
  });
}

function posPerfFrom(id, matchSubset){
  const schnitt = (t, s) => {
    const g = t[s + 'G'];
    return {[s + 'Wr']: g ? t[s + 'W'] / g : null, [s + 'PerfAvg']: g ? t[s + 'Perf'] / g : null,
      [s + 'TorAvg']: g ? t[s + 'Tor'] / g : null,
      [s + 'GegAvg']: g && t[s + 'Geg'] != null ? t[s + 'Geg'] / g : null,
      [s + 'MitAvg']: g && t[s + 'Mit'] != null ? t[s + 'Mit'] / g : null};
  };
  const aus = t => ({aG:t.aG, aW:t.aW, dG:t.dG, dW:t.dW, ...schnitt(t, 'a'), ...schnitt(t, 'd')});
  if (!matchSubset || matchSubset === matches) {
    const t = getGlobalSim().posTracker[id];
    if (t) return aus(t);
  }
  // Ohne die Elo-Rechnung fehlt der Stand vor jeder Partie: Gegner und
  // Mitspieler bleiben hier leer statt null Elo Abstand zu zeigen.
  const t = {...posZaehler(), aGeg:null, dGeg:null, aMit:null, dMit:null};
  for(const m of matchSubset) posZaehlenPartie({[id]:t}, m, m.winner==='A', m.exp_a!=null ? m.exp_a : 0.5);
  return aus(t);
}

// ─── Der Positionswert [§5.2] ────────────────────────────────────────
// Die eine Zahl, nach der die Positions-Rangliste sortiert und die dort
// als „Wert" rechts steht. Sie wiegt vier Dinge gegeneinander:
//   Siegquote auf der Position — die Hauptsache
//   Leistung gegen die Erwartung — berücksichtigt Mate- und Gegnerstärke
//   Rollenbeitrag — vorne die eigenen Tore, hinten die zugelassenen
//   Erfahrung — wächst asymptotisch, ab etwa 25 Spielen praktisch voll
// Baseline: 5 Tore/Spiel sind neutral, 10 exzellent, 0 katastrophal.
//
// Sie steht hier und nicht in der Ansicht, weil zwei Stellen sie brauchen:
// die Positions-Rangliste und der Liga-Rekord darauf [§13.1]. Zwei getrennte
// Rechnungen über dieselbe Frage driften auseinander, und dann stünde in der
// Chronik ein anderer Bester als in der Liste.
//
// ZWEI Verwendungen, EINE Formel, ein Unterschied: die Rangliste wiegt die
// ERFAHRUNG mit, der Liga-Rekord darf das nicht. Eine Mindestzahl entscheidet
// dort nur über die Teilnahme; wer sie erfüllt hat, soll seinen Wert nicht
// mehr durch weitere Partien steigern können — sonst gehört der Rekord wieder
// dem Vielspieler [§C35]. `posLeistung` ist deshalb der gemeinsame Kern, und
// `posWert` ist derselbe Kern mal Erfahrung. Zwei getrennte Formeln nebeneinander
// wären die Doppelung, die diese Stelle gerade verhindert [§C27].
function posLeistung(pos, g, w, goalsAvg, perfAvg){
  if(!g) return 0;
  const perfBonus = (perfAvg || 0) * 0.25;
  const roleBonus = pos === 'atk'
    ? Math.max(0, Math.min(1, goalsAvg/10)) * 0.2
    : Math.max(0, Math.min(1, (10-goalsAvg)/10)) * 0.2;
  return w/g + perfBonus + roleBonus;
}
function posWert(pos, g, w, goalsAvg, perfAvg){
  if(!g) return 0;
  return posLeistung(pos, g, w, goalsAvg, perfAvg) * (1 - Math.exp(-g/5));
}

// Die Lage eines Spielers auf beiden Positionen, aus jeder Form, in der
// die Zahlen anfallen: `posPerfFrom` (aG/dG und Mittelwerte), der Kontext
// der Chronik (atkG/defG und Summen) und der Zähler der Elo-Rechnung
// (aG/dG und Summen). Eine Rechnung für Profil, Elo, die stärkere Rolle im
// Profil, „Der Wandler" und das Durchwechseln [§C27]: vorher stand eine
// Kopie davon in der Elo-Rechnung, und die Rollen im Profil fragten nach
// der rohen Siegquote — drei Antworten auf die Frage, wo jemand besser ist.
//   rA, rD    Leistung je Partie vorne und hinten gegen den eigenen Schnitt
//   anteil    Anteil der Partien vorne
//   menge     wie stark die Aufstellung noch zählt (1 bis POS_MENGE_MIN)
//   wert      das Profil
//   staerker  'atk', 'def' oder 'beide' (bis drei Prozentpunkte Abstand,
//             und ohne Partien auf einer Seite)
// Fehlen die Tore ganz, zählt der Sieg allein — so rechnen gebaute Fälle
// in den Tests, die nur die Siegleistung angeben.
function positionsLage(p){
  p = p || {};
  const aG = Number(p.aG != null ? p.aG : p.atkG) || 0;
  const dG = Number(p.dG != null ? p.dG : p.defG) || 0;
  const summe = (g, roh, avg) => roh != null ? (Number(roh) || 0) : avg != null ? (Number(avg) || 0) * g : null;
  const seite = (g, sieg, tor) => tor == null ? (sieg || 0) : ((sieg || 0) + tor) / 2;
  const aS = seite(aG, summe(aG, p.aPerf != null ? p.aPerf : p.atkPerf, p.aPerfAvg),
    summe(aG, p.aTor != null ? p.aTor : p.atkTor, p.aTorAvg));
  const dS = seite(dG, summe(dG, p.dPerf != null ? p.dPerf : p.defPerf, p.dPerfAvg),
    summe(dG, p.dTor != null ? p.dTor : p.defTor, p.dTorAvg));
  const n = aG + dG;
  if(!n) return {aG, dG, anteil:.5, rA:0, rD:0, menge:1, wert:.5, staerker:'beide'};
  const schnitt = (aS + dS) / n;
  const rA = (aS - aG * schnitt) / (aG + POS_SCHRUMPF);
  const rD = (dS - dG * schnitt) / (dG + POS_SCHRUMPF);
  const selten = Math.min(aG, dG);
  const menge = 1 - selten / (selten + POS_SCHRUMPF) * (1 - POS_MENGE_MIN);
  const lg = menge * Math.log((aG + 1) / (dG + 1)) + POS_LEISTUNG * (rA - rD);
  const staerker = (!aG || !dG || Math.abs(rA - rD) <= .03) ? 'beide' : rA > rD ? 'atk' : 'def';
  return {aG, dG, anteil:aG / n, rA, rD, menge, staerker,
    wert:Math.min(.95, Math.max(.05, 1 / (1 + Math.exp(-lg))))};
}
function positionsProfilWert(p){ return positionsLage(p).wert; }

// Der Positionsbonus der Elo-Rechnung [§3.6]. Auf der Seite, auf der das
// Profil schwächer ist, bringt ein Sieg mehr, und eine Niederlage kostet
// um genauso viel weniger: bis POS_GRENZE. Auf der stärkeren Seite gibt es
// beim Sieg einen Dämpfer und bei der Niederlage einen Abzug dazu, halb so
// viel: bis POS_DAEMPFER. Wie viel davon gilt, sagt allein die Klarheit der
// Einstufung — 0 bei 50 % Sturm, voll bei 5 oder 95 % —, mal zwei mal
// Swing: bei einem Swing von 50 % wächst der Ausschlag genau mit der
// Klarheit, darüber erreichen klare Profile die Grenze früher.
//
// Vorher hing der Ausschlag am Anteil der Partien auf der ANDEREN Seite,
// damit sich Bonus und Abzug über die eigenen Partien aufhoben. Wer fast nur
// hinten spielt, bekam hinten dadurch fast nichts: Henry gewann in der Abwehr
// und verlor 0,49 von 57 Elo (0,8 %). Und wer gleich oft auf beiden Seiten
// stand, trug den größten Abzug: Leo (72 % Verteidiger) verlor nach einer
// Niederlage hinten 2,48, Leon (78 % Stürmer) nach derselben vorne nur 1,37.
// Noch davor maß der Bonus gegen 50:50 ohne Grenze und zog einem
// Spezialisten bei jedem Sieg ein Sechstel ab (Henry hinten 0,83 und 1,17).
//
// Ohne Ausgleich über die eigenen Partien steht ein reiner Spezialist auf
// Dauer etwas tiefer, aber nicht weit: die Elo gleicht sich nach. Wer hinten
// bei jedem Sieg 5 % weniger bekommt und 5 % mehr verliert, steht dort im
// Gleichgewicht, wenn die Erwartung seines Teams um 2,5 Punkte tiefer liegt;
// weil sie aus dem Schnitt beider Spieler kommt, sind das rund 35 Elo der
// eigenen.
const POS_GRENZE = 0.10;
const POS_DAEMPFER = 0.05;
function posFactor(lage, pos, sw){
  const a = lage.wert;
  const klar = Math.min(1, Math.abs(a - .5) / .45);
  const anteil = Math.min(1, 2 * (sw || 0) * klar);
  if(!anteil) return 1;
  const schwach = a < .5 ? 'atk' : 'def';
  return pos === schwach ? 1 + POS_GRENZE * anteil : 1 - POS_DAEMPFER * anteil;
}
// Sturm-Anteil 0..1 nach dem Positionsprofil.
function atkStrengthFrom(id, matchSubset){
  return positionsProfilWert(posPerfFrom(id,matchSubset));
}
// Live-Stärke aus allen aktuellen Matches (für Anzeige & Vorschau)
function atkStrength(id){ return atkStrengthFrom(id, matches); }

// ╔═══ §2.9 ─── POSITIONS-KLASSIFIZIERUNG (7 Stufen) ───────────────────╗
//     Reine Sturm-Spieler -> "Stürmer", reine Abwehr -> "Verteidiger",
//     Mischformen -> 5 Zwischenstufen.
// ╚═════════════════════════════════════════════════════════════════════════╝
// Wandelt das Positionsprofil (0,05 bis 0,95) in ein Label + Icon um.
// Feingranular: 60/40-Splits sollen NICHT als reines "Flex" durchrutschen.
function posClassify(autoAtk){
  const a = autoAtk;
  if(a >= 0.78) return {label:'Reiner Stürmer',     icon:'posReinSturm',       tone:'atk'};
  if(a >= 0.60) return {label:'Stürmer',            icon:'posSturm',        tone:'atk'};
  if(a >= 0.54) return {label:'Sturm-Flex',         icon:'posSturmFlex',        tone:'atk'};
  if(a >  0.46) return {label:'Flex',               icon:'posFlex',       tone:'flex'};
  if(a >  0.40) return {label:'Abwehr-Flex',        icon:'posAbwehrFlex',      tone:'def'};
  if(a >  0.22) return {label:'Verteidiger',        icon:'posAbwehr',      tone:'def'};
  return                {label:'Reiner Verteidiger', icon:'posReinAbwehr', tone:'def'};
}


// Margin-of-Victory Multiplikator (klares Ergebnis zählt mehr, knappes weniger)
function movMult(sa,sb){
  const diff=Math.abs(sa-sb), total=Math.max(sa+sb,1);
  // 1.0 bei knapp, bis ~1+mov_max_boost bei Kantersieg; logarithmisch gedämpft
  const maxBoost = cfg.mov_max_boost ?? 0.4;
  return 1 + maxBoost*(diff/(total)) * (Math.log(diff+1)/Math.log(11));
}

// computeMatch nutzt jetzt DIESELBE Engine wie der Recalc (simulateElo),
// damit die beim Speichern erzeugten Deltas exakt dem entsprechen, was nach
// einer späteren Neuberechnung in der DB steht. Es gibt nur noch EINE Wahrheit.
//
// Vorgehen: Wir bauen ein hypothetisches Match-Objekt, hängen es chronologisch
// an die aktuelle Saison-Matchliste an und lassen simulateElo darüber laufen.
// Die Deltas/exp_a des hypothetischen Matches lesen wir aus dem History-Eintrag.
function computeMatch(teamA, teamB, winner, sa, sb){
  // Optimierung: Wir starten vom End-State des gecachten globalen Sim und simulieren
  // nur das eine hypothetische Match darauf. Bei großen Match-Historien ~100× schneller.
  const HYPO_ID = '__hypo__';
  const hypo = {
    id: HYPO_ID,
    a1: teamA[0].id, a1_pos: teamA[0].pos,
    a2: teamA[1].id, a2_pos: teamA[1].pos,
    b1: teamB[0].id, b1_pos: teamB[0].pos,
    b2: teamB[1].id, b2_pos: teamB[1].pos,
    score_a: sa, score_b: sb, winner,
    created_at: new Date().toISOString()
  };

  const globalSim = getGlobalSim();
  const sim = simulateEloWithSliders([hypo], {
    initialState: globalSim,
    initialCurSeason: globalSim.curSeason
  });
  const entry = sim.history.find(h => h.matchId === HYPO_ID);
  const res = entry ? {...entry.deltas} : {};
  const expA = entry ? entry.expA : 0.5;

  // mov nur für die Anzeige ("Kantersieg ×…") — identische Formel wie in der Engine.
  const rawMov = movMult(sa, sb);
  return {res, expA, mov: rawMov};
}

// ─── Schreiben, was sich geändert hat ───────────────────────────────
// Eine neue Partie schrieb die Positionsstärke ALLER Spieler, auch derer,
// die nicht mitgespielt hatten, und eine gelöschte oder bearbeitete die
// Deltas ALLER Partien der Liga — gemessen 498 Anfragen in zwanzig Runden
// hintereinander, um am Ende fast überall denselben Wert zu schreiben. Für
// die Ansicht gebraucht wird davon nichts: die App rechnet aus den Partien
// [§3.1c]. Geschrieben wird deshalb nur, was sich wirklich geändert hat.
// Verglichen wird mit Spielraum: eine Zahl, die einmal durch die Datenbank
// gegangen ist, kann in der letzten Stelle abweichen, und dann schriebe
// jeder Durchlauf alles noch einmal.
function _zahlAnders(a, b){ return !(Math.abs((+a || 0) - (+b || 0)) < 1e-6); }
function _deltaAnders(m, patch){
  if(!m) return true;
  if(_zahlAnders(m.exp_a, patch.exp_a)) return true;
  const a = m.deltas || {}, b = patch.deltas || {};
  const k = new Set([...Object.keys(a), ...Object.keys(b)]);
  for(const id of k) if(_zahlAnders(a[id], b[id])) return true;
  return false;
}
// Positionsstärke und Saison-Elo der Spieler: in der Datenbank nur ein
// Abbild der Partien (die Rangliste liest sie nicht), deshalb nur, wo sie
// abweichen, und danach lokal nachgezogen — sonst schriebe der nächste
// Durchlauf dieselben Werte noch einmal.
async function _spielerSchreiben(){
  const map = getSeasonEloMap(), schreiben = [];
  players.forEach(p => {
    const atk = atkStrengthFrom(p.id, matches);
    const elo = Math.round(map[p.id] ?? cfg.start_elo);
    const o = {};
    if(_zahlAnders(atk, p.atk)) o.atk = atk;
    if(elo !== Math.round(p.elo)) o.elo = elo;
    if(!Object.keys(o).length) return;
    schreiben.push(sb.from('players').update(o).eq('id', p.id).then(r => {
      if(r && r.error) throw r.error;
      Object.assign(p, o);
    }));
  });
  await Promise.all(schreiben);
}

async function persistNewMatch(newMatchId) {
  // Ein neues Match am Ende ändert nie vorherige Match-Deltas. Seine eigenen
  // stehen schon in der Zeile (`computeMatch`); neu geschrieben werden sie
  // nur, wenn die Rechnung mit dem Zeitpunkt der Datenbank anders ausgeht.
  const sim = getGlobalSim();
  const entry = sim.history.find(h => h.matchId === newMatchId);
  const m = matches.find(x => x.id === newMatchId);
  const patch = entry && {id:newMatchId, deltas:entry.deltas, exp_a:entry.expA};
  const schreiben = [_spielerSchreiben()];
  if(patch && _deltaAnders(m, patch)){
    schreiben.push(sb.from('matches').update({deltas:patch.deltas, exp_a:patch.exp_a}).eq('id', newMatchId)
      .then(r => { if(r && r.error) throw r.error; if(m){ m.deltas = patch.deltas; m.exp_a = patch.exp_a; } }));
  }
  await Promise.all(schreiben);
}

// Die Liga aus einer Partienliste neu rechnen, nur auf dem Gerät: die
// Liste wird zu `matches`, jede Partie trägt ihre neuen Deltas. Zurück
// kommt, was die Datenbank danach braucht — die Partien, deren Deltas sich
// geändert haben. Verglichen wird VOR dem Einsetzen, sonst wäre nichts mehr
// anders.
function ligaNeuRechnen(matchList){
  const {matchPatches} = recalcHistory(matchList);
  const vorher = new Map(matchList.map(m => [m.id, m]));
  const geaendert = matchPatches.filter(p => _deltaAnders(vorher.get(p.id), p));
  const neu = new Map(geaendert.map(p => [p.id, p]));
  // Ohne Änderung bleiben die Töpfe: das Nachholen rechnet meist nach und
  // findet nichts, und danach rechnete jeder Reiter kalt.
  const anders = geaendert.length || matchList !== matches;
  matches = matchList.map(m => {
    const p = neu.get(m.id);
    return p ? {...m, deltas:p.deltas, exp_a:p.exp_a} : m;
  });
  if(anders) invalidateCache();
  return {geaendert};
}

// Schreibt eine neu gerechnete Liga in die Datenbank: die geänderten
// Deltas, Positionsstärke und Saison-Elo, und die Archive der vergangenen
// Monate, in denen sich etwas geändert hat. Vorher wurde JEDER vergangene
// Monat geleert und neu archiviert, auch wenn nur die letzte Partie von heute
// gelöscht war — und mit ihm seine eingefrorene Chronik. `monate` nennt
// zusätzlich Monate, die sich ohne geänderte Delta geändert haben: die
// gelöschte Partie selbst taucht in keiner Rechnung mehr auf.
// Updates laufen in Batches parallel, um Rate-Limits zu respektieren (Supabase ~100 req/s).
async function rechnungSchreiben(r, monate){
  const BATCH = 25;
  const deltas = r.geaendert.map(p => () => sb.from('matches').update({deltas:p.deltas, exp_a:p.exp_a}).eq('id', p.id)
    .then(x => { if(x && x.error) throw x.error; }));
  for(let i = 0; i < deltas.length; i += BATCH) await Promise.all(deltas.slice(i, i + BATCH).map(f => f()));
  await _spielerSchreiben();
  // Archivierte Saison-Snapshots invalidieren → autoArchiveSeasons schreibt
  // sie neu. `titles` muss mit: die eingefrorene Chronik steht auf der alten
  // Elo-Kurve, und „+148 Elo gegenueber der Vorsaison" waere eine Behauptung
  // ueber Zahlen, die es nicht mehr gibt.
  const vergangen = new Set(allPastSeasons());
  const betroffen = new Set(monate || []);
  const zeit = new Map(matches.map(m => [m.id, m.created_at]));
  r.geaendert.forEach(p => { const t = zeit.get(p.id); if(t) betroffen.add(seasonOf(t).id); });
  const leeren = [...betroffen].filter(sid => vergangen.has(sid));
  if(!leeren.length) return;
  await Promise.all(leeren.map(sid => sb.from('seasons').update({top_elo: JSON.stringify([]), titles: null}).eq('id', sid)));
  // Lokal: top_elo leeren, damit autoArchiveSeasons sie als stale erkennt
  seasons.forEach(s => { if(leeren.includes(s.id)){ s.top_elo = JSON.stringify([]); s.titles = null; } });
  await autoArchiveSeasons();
}
// Rechnen und Schreiben in einem, für den Knopf „Neu berechnen" und das
// Nachholen nach einem abgebrochenen Schreiben [§3.1c].
async function persistRecalc(matchList, monate){
  const r = ligaNeuRechnen(matchList);
  await rechnungSchreiben(r, monate);
  return r;
}
