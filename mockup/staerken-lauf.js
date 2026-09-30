// Der Lauf: rechnet Kandidaten fuer Liga-Rekorde nach, die eine ERRUNGENSCHAFT
// JE GELEGENHEIT messen — und baut daraus `mockup/staerken.html`.
//
//   node mockup/staerken-lauf.js
//
// Zwei Fragen stehen dahinter, und sie haben dieselbe Antwort.
//
//   • „Der Platzhirsch" misst den Anteil eigener Spieltage als Player of the
//     Day, „Der Wochenherr" den Anteil eigener Wochen. Beide zaehlen nicht,
//     WIE OFT etwas gelang, sondern wie oft von wie vielen Gelegenheiten.
//     Von dieser Bauart gibt es genau zwei Rekorde.
//   • Julian steht auf Platz drei der Siegquote und haelt sieben von
//     zweiundsechzig Haltungen, Jane vier, Jannik drei. Was ihnen fehlt, ist
//     keine Leistung, sondern eine Frage, die diese Leistung nennt: sie
//     spielen weniger, und zwanzig der siebenundfuenfzig Rekorde messen ein
//     NIVEAU ueber eine lange Strecke.
//
// Der Katalog hat die Antwort schon. Siebenundvierzig Monatschroniken tragen
// nur die Monatsachse, und ein Dutzend davon fragt genau nach einem Anteil je
// Gelegenheit: „Gegen jeden bestanden", „Die Auferstehung", „Der
// Serienbrecher", „Ohne Angstgegner", „Der Ausgleicher", „Ohne
// Schwachstelle". Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin
// [§13.1], also kostet ein solcher Rekord keinen neuen Namen, kein neues
// Icon und keinen neuen Beinamen — nur eine zweite Achse.
//
// Dazu kommt ein einziger neuer Eintrag: „Das Uebersoll". Der Code nennt ihn
// heute schon (`untersoll.monat.wie` sagt „dieselbe Rechnung wie beim
// Uebersoll, nur andersherum", und §C38 fuehrt ihn als Beispiel), aber es
// gibt ihn nicht. Die Schande steht ohne ihre Vorderseite da.
//
// Die Tore, alle an den echten 466 Partien:
//
//   1. Haengt der Wert an der Spielzahl? Erlaubt bis 0,35 — oder nicht mehr
//      als die SIEGQUOTE selbst im gleichen Feld haengt. In dieser Liga
//      spielen die Starken auch viel (Leon 355, Martin 211), also traegt jede
//      Koennens-Kennzahl eine Grundkorrelation, die nichts mit dem Zaehlen
//      von Gelegenheiten zu tun hat.
//   2. Steht der Bestwert an der DECKE? Drei Spieler gleichauf auf 100 %
//      ist keine Bestmarke, sondern eine Bedingung, die jeder erfuellt.
//      Daran ist „Anteil der Wochen mit Elo-Gewinn" gefallen.
//   3. Ist der Eintrag vergeben? Eine leere Tafel sagt nichts.
//   4. Steht jemand mit unter hundert Partien im Rennen? Sonst ist es doch
//      wieder ein Rekord fuer den Vielspieler [§C35].
//   5. Liegt jede Schwelle und jede Mindestzahl auf einem 5er-Schritt?
//   6. Nennt der Kandidat seinen naechsten Nachbarn im Katalog, und messen
//      die beiden verschieden? Dieselbe Frage mit derselben Antwort sammelt
//      sich beim selben Halter.
//   7. Kammer-Tor: haelt niemand mehr als ein Viertel der Kammer?
//   8. Kammer-Tor: kommen Julian, Jane UND Jannik vor? Das ist die Frage,
//      mit der dieser Lauf angefangen hat. Ohne dieses Tor haette man
//      fuenfzehn Rekorde dazugebaut und nichts veraendert.
'use strict';
const fs = require('fs');
const ROOT = '/home/user/kicker-app';
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const MS = fs.readFileSync(ROOT + '/tests/fixtures/matches.txt', 'utf8').trim()
  .split(';').map((row, i) => {
    const f = row.split(',').map(Number);
    const pos = k => f[4 + k] === 0 ? 'atk' : 'def';
    return { id:'m' + i, a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
      a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3),
      score_a:f[8], score_b:f[9], winner:f[10] === 0 ? 'A' : 'B',
      exp_a:f[11] / 1000, ts:f[12] * 1000 };
  }).sort((a, b) => a.ts - b.ts);
const name = id => NAMES[IDS.indexOf(id)] || '?';
const tagKey = ts => { const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0'); };
const monKey = ts => tagKey(ts).slice(0, 7);

// Die Linien der Elo-Rechnung, wie in der App [§5.2].
const CHANCE_OFFEN = 0.45, CHANCE_FAVORIT = 0.55;

// ── Die Rohsicht ────────────────────────────────────────────────────
// Jede Partie aus der Sicht eines Spielers, in Spielreihenfolge — dieselbe
// Struktur, die `_chronicleCtx` fuer die Laufbahn und `_seasonTitleCtx` fuer
// den Monat schon haben. `gegLauf` traegt die Siegesserie des starken
// Gegners VOR dem Anpfiff: „Der Serienbrecher" braucht den Stand von damals,
// und der ist nur in Spielreihenfolge zu haben.
function rohBau(ms, ids){
  const P = {}; ids.forEach(id => { P[id] = {id, partien:[]}; });
  const lauf = {};
  ms.forEach(m => {
    const vier = [m.a1, m.a2, m.b1, m.b2];
    const posAlle = [m.a1_pos, m.a2_pos, m.b1_pos, m.b2_pos];
    const vor = {}; vier.forEach(id => { vor[id] = lauf[id] || 0; });
    vier.forEach((id, k) => {
      if(!id || !P[id]) return;
      const onA = k < 2;
      const geg = onA ? [m.b1, m.b2] : [m.a1, m.a2];
      P[id].partien.push({
        win: (onA && m.winner === 'A') || (!onA && m.winner === 'B'),
        gf: onA ? m.score_a : m.score_b, ga: onA ? m.score_b : m.score_a,
        pos: posAlle[k], exp: onA ? m.exp_a : 1 - m.exp_a,
        ts: m.ts, tag: tagKey(m.ts),
        mate: onA ? (k === 0 ? m.a2 : m.a1) : (k === 2 ? m.b2 : m.b1), geg,
        gegLauf: Math.max(vor[geg[0]] || 0, vor[geg[1]] || 0) });
    });
    vier.forEach((id, k) => { const onA = k < 2;
      lauf[id] = ((onA && m.winner === 'A') || (!onA && m.winner === 'B'))
        ? (lauf[id] || 0) + 1 : 0; });
  });
  ids.forEach(id => {
    const p = P[id], s = p.partien;
    p.games = s.length;
    p.wins = s.filter(x => x.win).length;
    p.q = p.games ? p.wins / p.games : 0;
    p.expQ = p.games ? s.reduce((a, x) => a + x.exp, 0) / p.games : 0;
    p.tagGrp = {}; s.forEach(x => (p.tagGrp[x.tag] = p.tagGrp[x.tag] || []).push(x));
    p.gegnerGrp = {}; s.forEach(x => x.geg.forEach(g => {
      if(g) (p.gegnerGrp[g] = p.gegnerGrp[g] || []).push(x); }));
    p.partnerGrp = {}; s.forEach(x => {
      if(x.mate) (p.partnerGrp[x.mate] = p.partnerGrp[x.mate] || []).push(x); });
  });
  return P;
}
const LAUF = rohBau(MS, IDS);
const MONATE = [...new Set(MS.map(m => monKey(m.ts)))].sort();
const MON = {}; MONATE.forEach(k => { MON[k] = rohBau(MS.filter(m => monKey(m.ts) === k), IDS); });
const CHRONIK_MIN_TAGE = 5;                     // wie in der App
const MON_GEWERTET = MONATE.filter(k => new Set(MS.filter(m => monKey(m.ts) === k)
  .map(m => tagKey(m.ts))).size >= CHRONIK_MIN_TAGE);

// ── Werkzeug ────────────────────────────────────────────────────────
const q = a => a.length ? a.filter(x => x.win).length / a.length : 0;
const pct = v => Math.round(v * 100);
const komma = (v, n) => (Number(v) || 0).toFixed(n == null ? 1 : n)
  .replace('.', ',').replace(/^-/, '−');   // echtes Minus [§C27]
const pp = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100));
const korr = (xs, ys) => {
  const n = xs.length; if(n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : 0;
};
const streuung = a => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
// Teilmengen, die mehrere Kandidaten brauchen
const gegN = (p, min) => Object.keys(p.gegnerGrp).filter(k => p.gegnerGrp[k].length >= min);
const matN = (p, min) => Object.keys(p.partnerGrp).filter(k => p.partnerGrp[k].length >= min);
const nachZwei = p => p.partien.filter((x, i) => i > 1 && !p.partien[i-1].win && !p.partien[i-2].win);
const tagBlock = p => { const f = [], s = [];
  Object.values(p.tagGrp).forEach(a => { if(a.length < 5) return;
    a.slice().sort((x, y) => x.ts - y.ts).forEach((x, i) => (i >= 3 ? s : f).push(x)); });
  return {frueh:f, spaet:s}; };
const auftakt = p => Object.values(p.tagGrp)
  .map(a => a.slice().sort((x, y) => x.ts - y.ts)[0]);
const lagen = p => {
  const a = p.partien.filter(x => x.pos === 'atk'), d = p.partien.filter(x => x.pos === 'def');
  const o = p.partien.filter(x => x.exp < CHANCE_OFFEN);
  const e = p.partien.filter(x => Math.abs(x.gf - x.ga) <= 1);
  const n = p.partien.filter((x, i) => i > 0 && !p.partien[i-1].win);
  const min = 15;
  if(a.length < min || d.length < min || o.length < min || e.length < min || n.length < min) return null;
  return {vorne:q(a), hinten:q(d), oben:q(o), eng:q(e), antwort:q(n)};
};

// ── Die Kandidaten ──────────────────────────────────────────────────
// `wert` gibt GROESSER IST BESSER zurueck oder null, wenn die Mindestzahl
// nicht erfuellt ist. `ev` beginnt mit dem Wert, nach dem sortiert wird
// [§C35]. `quelle` ist die Monatschronik, deren Frage der Rekord auf die
// Laufbahn hebt; `nachbar` der naechste bestehende Rekord und der Grund,
// warum er etwas anderes misst.
const KAND = [
// ══ Kammer I: der Anteil an den eigenen Gelegenheiten ═══════════════
{id:'kopfhoch', familie:'tag', kammer:'anteil', achse:'laufbahn',
 name:'Der Tagesabschluss', short:'Tagesende',
 quelle:'An mindestens 100 % der eigenen Spieltage eine ausgeglichene oder positive Bilanz, ab 3 Spieltagen',
 frage:'Wie viele der eigenen Spieltage endeten nicht im Minus?',
 cond:'Höchster Anteil eigener Spieltage mit ausgeglichener oder positiver Bilanz, ab 15 eigenen Spieltagen',
 wie:'Ein Tag zählt, wenn am Ende mindestens so viele Siege wie Niederlagen stehen. Der Nenner sind alle eigenen Spieltage, nicht die Partien und nicht der Kalender: wer an zwanzig Tagen dabei war, wird an zwanzig gemessen.',
 nachbar:{name:'Der makellose Tag', warum:'verlangt einen Tag OHNE jede Niederlage und zählt nur volle Spieltage ab drei Partien. Ein Tag mit 2:1 ist dort keiner, hier schon.'},
 // Keine Wertuntergrenze: „mindestens 60 %" liess nur vier Spieler ins
 // Rennen, und ein Rennen aus vier sagt nichts darueber, ob der Rekord
 // erreichbar ist. Den Bestwert haelt ohnehin der Beste.
 wert:p => { const t = Object.values(p.tagGrp); if(t.length < 15) return null;
   return t.filter(a => a.filter(x => x.win).length * 2 >= a.length).length / t.length; },
 ev:(p, v) => { const t = Object.values(p.tagGrp);
   return pct(v) + ' % der Spieltage nicht im Minus · '
     + t.filter(a => a.filter(x => x.win).length * 2 >= a.length).length
     + ' von ' + t.length; }},

{id:'breitenwirkung', familie:'gegner', kammer:'anteil', achse:'laufbahn',
 name:'Gegen jeden bestanden', short:'Gegen alle',
 quelle:'Gegen JEDEN regelmäßigen Gegner mehr Siege als Niederlagen, ab 4 solchen Gegnern',
 frage:'Gegen wie viele der regelmäßigen Gegner steht die Bilanz im Plus?',
 cond:'Höchster Anteil regelmäßiger Gegner mit positiver Bilanz, ab 4 Gegnern mit je 15 Duellen',
 wie:'Regelmäßig heißt mindestens fünfzehn Duelle über die Laufbahn. Der Nenner sind diese Gegner, nicht alle elf: wer gegen jemanden dreimal gespielt hat, weiß nichts über eine Bilanz.',
 nachbar:{name:'Der Angstgegner', warum:'ist die Schattenseite und nennt EINEN Gegner. Hier zählt die Breite, und ein einziges schlechtes Duell kostet nur einen Anteilsschritt.'},
 wert:p => { const g = gegN(p, 15); if(g.length < 4) return null;
   return g.filter(k => q(p.gegnerGrp[k]) > 0.5).length / g.length; },
 ev:(p, v) => { const g = gegN(p, 15);
   return pct(v) + ' % der regelmäßigen Gegner im Plus · '
     + g.filter(k => q(p.gegnerGrp[k]) > 0.5).length + ' von ' + g.length; }},

{id:'auferstehung', familie:'folge', kammer:'anteil', achse:'laufbahn',
 name:'Die Auferstehung', short:'Rückkehr',
 quelle:'Jede Partie nach zwei Pleiten am Stück gewonnen, ab 5 solchen Gelegenheiten',
 frage:'Wie oft folgt auf zwei Pleiten am Stück ein Sieg?',
 cond:'Höchster Anteil gewonnener Partien direkt nach zwei Pleiten am Stück, ab 15 solchen Gelegenheiten',
 wie:'Gezählt wird die Partie nach der zweiten Pleite in Folge, nicht die nach jeder Pleite. Der Nenner sind alle diese Gelegenheiten, also hat der Vielspieler keinen Vorteil: er hat mehr davon, aber der Anteil bleibt derselbe.',
 nachbar:{name:'Der Stehaufmann', warum:'misst den Abstand zur eigenen Quote nach EINER Pleite. Zwei am Stück sind die Stelle, an der ein Tag kippt, und das Niveau steht hier für sich.'},
 wert:p => { const a = nachZwei(p); return a.length >= 15 ? q(a) : null; },
 ev:(p, v) => { const a = nachZwei(p);
   return pct(v) + ' % nach zwei Pleiten am Stück · ' + a.filter(x => x.win).length
     + ' von ' + a.length; }},

{id:'serienbrecher', familie:'folge', kammer:'anteil', achse:'laufbahn',
 name:'Der Serienbrecher', short:'Brecher',
 quelle:'Mindestens 70 % gegen Gegner, die zum Zeitpunkt der Partie drei Siege am Stück tragen, ab 5 solchen Partien',
 frage:'Wie oft endet eine laufende Serie an einem selbst?',
 cond:'Höchster Anteil gewonnener Partien gegen einen Gegner mit drei Siegen am Stück, ab 20 solchen Partien',
 wie:'Die Serie des Gegners wird für jede Partie neu nachgezählt, mit dem Stand vor dem Anpfiff. Der Nenner sind alle Partien gegen einen Serienträger, auch die verlorenen.',
 nachbar:{name:'Der Gigantentöter', warum:'fragt nach der Elo-Rechnung, nicht nach der Form. Ein Gegner mit drei Siegen am Stück kann der Schwächere sein, und dann zählt er dort gar nicht.'},
 wert:p => { const a = p.partien.filter(x => x.gegLauf >= 3);
   return a.length >= 20 ? q(a) : null; },
 ev:(p, v) => { const a = p.partien.filter(x => x.gegLauf >= 3);
   return pct(v) + ' % gegen eine laufende Serie · ' + a.filter(x => x.win).length
     + ' von ' + a.length; }},

{id:'nulldiaet', familie:'tore', kammer:'anteil', achse:'laufbahn',
 name:'Die Nulldiät', short:'Nulldiät',
 quelle:'Mindestens 20 % der Partien mit höchstens drei Gegentoren',
 frage:'Wie oft bleibt eine ganze Partie geschlossen?',
 cond:'Höchster Anteil eigener Partien mit höchstens drei Gegentoren, ab 40 Partien',
 wie:'Ein Spiel geht auf zehn, drei Gegentore sind eine geschlossene Partie. Der Nenner sind alle Partien, auch die vorne gespielten: eine Partie ist zu zweit geschlossen worden oder nicht.',
 nachbar:{name:'Der Fels', warum:'rechnet Gegentore je Partie und nur in der Abwehr, ab fünfzig Abwehrspielen. Ein Mittelwert verdeckt, ob viele mittlere oder wenige hohe Partien dahinterstehen.'},
 wert:p => p.games >= 40 ? p.partien.filter(x => x.ga <= 3).length / p.games : null,
 ev:(p, v) => pct(v) + ' % der Partien mit höchstens 3 Gegentoren · '
   + p.partien.filter(x => x.ga <= 3).length + ' von ' + p.games},

{id:'zunull', familie:'tore', kammer:'anteil', achse:'laufbahn',
 name:'Die weiße Weste', short:'Weste',
 quelle:'Mindestens 10 % der eigenen Siege mit höchstens einem Gegentor, ab 5 Siegen',
 frage:'Wie oft gelingt der Sieg, ohne den Gegner ins Spiel zu lassen?',
 cond:'Höchster Anteil eigener Siege mit höchstens einem Gegentor, ab 20 Siegen',
 wie:'Der Nenner sind alle eigenen Siege, nicht alle Partien: gefragt ist die ART zu gewinnen und nicht, wie oft gewonnen wird.',
 nachbar:{name:'Der Zerstörer', warum:'zählt Kantersiege ab fünf Toren Unterschied. Ein 10:4 ist dort ein Kantersieg und hier keine weiße Weste.'},
 wert:p => p.wins >= 20
   ? p.partien.filter(x => x.win && x.ga <= 1).length / p.wins : null,
 ev:(p, v) => pct(v) + ' % der Siege mit höchstens einem Gegentor · '
   + p.partien.filter(x => x.win && x.ga <= 1).length + ' von ' + p.wins},

{id:'kaltstart', familie:'tag', kammer:'anteil', achse:'laufbahn',
 name:'Der Kaltstart', short:'Kaltstart',
 quelle:'Mindestens 85 % der ersten Partien eines Spieltags gewonnen, ab 5 Spieltagen',
 frage:'Wie oft steht der Auftakt eines Spieltags am Ende auf der eigenen Seite?',
 cond:'Höchster Anteil gewonnener Auftaktpartien eines eigenen Spieltags, ab 15 eigenen Spieltagen',
 wie:'Die jeweils erste eigene Partie jedes eigenen Spieltags, ohne Aufwärmen. Der Nenner sind die Spieltage, also zählt jeder Tag genau einmal.',
 nachbar:{name:'Der letzte Ball', warum:'misst den Abstand des Schlussspiels zu den übrigen Partien desselben Tages. Der Auftakt ist die andere Kante des Tages und hängt an keiner Vorgeschichte.'},
 wert:p => { const a = auftakt(p); return a.length >= 15 ? q(a) : null; },
 ev:(p, v) => { const a = auftakt(p);
   return pct(v) + ' % der Auftaktpartien gewonnen · ' + a.filter(x => x.win).length
     + ' von ' + a.length; }},

// ══ Kammer II: die schwaechste Stelle ══════════════════════════════
// Die Kammer, die Julian, Jane und Jannik erreicht. Sie fragt nicht nach dem
// besten Wert einer Laufbahn, sondern nach dem SCHLECHTESTEN: gegen wen es am
// schlechtesten laeuft, neben wem, in welcher Lage. Ein Ausschlag nach oben
// gehoert dem, der viel spielt und einmal Glueck hatte; eine Untergrenze
// gehoert dem, der nirgends einbricht.
{id:'uebersoll', familie:'rechnung', kammer:'lage', achse:'neu',
 name:'Das Übersoll', short:'Übersoll',
 quelle:'—',
 frage:'Wie weit liegt die Siegquote über dem, was die Elo-Rechnung erwartet hat?',
 cond:'Größter Abstand der Siegquote über die eigene Elo-Erwartung, ab 40 Partien',
 wie:'Die Elo-Rechnung gibt jeder Partie eine Siegchance. Über die Laufbahn gemittelt ergibt das die erwartete Quote; gewertet wird, wie weit die tatsächliche darüber liegt, in Prozentpunkten. Die Erwartung wächst mit jedem Sieg mit, also ist der Abstand kein Niveau: wer stark ist, muss dafür immer stärker spielen.',
 nachbar:{name:'Das Untersoll', warum:'ist dieselbe Rechnung andersherum und die einzige Schattenseite ohne Vorderseite. Ihr Erklärtext nennt das Übersoll bereits als Bezug, und den gab es nicht.'},
 wert:p => p.games >= 40 ? p.q - p.expQ : null,
 ev:(p, v) => pp(v) + ' Punkte über der Rechnung · ' + pct(p.q) + ' % statt '
   + pct(p.expQ) + ' % in ' + p.games + ' Partien',
 // Der neue Eintrag braucht auch die Monatsachse, sonst ist er eine halbe
 // Disziplin [§10.2]. `monWert` ist die Rechnung des Monats, `monAb` die
 // kalibrierte Schwelle auf einem 5er-Schritt.
 monWert:p => p.games >= 8 ? p.q - p.expQ : null,
 monStufe:'pp', monBeiname:'Der Übertreffer', monArt:'koennen'},

{id:'schwachstelle', familie:'lagen', kammer:'lage', achse:'laufbahn',
 name:'Ohne Schwachstelle', short:'Lückenlos',
 quelle:'In allen fünf Lagen mindestens 50 %, ab 5 Partien je Lage',
 frage:'Wie gut läuft es in der schwächsten von fünf Lagen?',
 cond:'Höchste Siegquote in der schwächsten von fünf Lagen: vorne, hinten, gegen die Stärkeren, in engen Partien und nach einer Niederlage, ab 15 Partien je Lage',
 wie:'Fünf Teilquoten derselben Laufbahn, und gewertet wird die schwächste davon. Der Katalog belohnt sonst überall einen Ausschlag; hier zählt, dass es nirgends einen Einbruch gibt. Eine hohe Quote in vier Lagen hilft nicht, wenn die fünfte durchhängt.',
 nachbar:{name:'Der Wandler', warum:'misst die Verteilung auf Sturm und Abwehr, nicht die Leistung darin. Wer beide Positionen gleich oft spielt und nur auf einer gewinnt, hält den Wandler und hier nichts.'},
 wert:p => { const l = lagen(p); return l ? Math.min.apply(null, Object.values(l)) : null; },
 ev:(p, v) => { const l = lagen(p);
   return pct(v) + ' % in der schwächsten Lage · vorne ' + pct(l.vorne) + ' %, hinten '
     + pct(l.hinten) + ' %, gegen oben ' + pct(l.oben) + ' %, eng ' + pct(l.eng)
     + ' %, nach Pleite ' + pct(l.antwort) + ' %'; }},

{id:'angstfrei', familie:'gegner', kammer:'lage', achse:'laufbahn',
 name:'Ohne Angstgegner', short:'Angstfrei',
 quelle:'Gegen JEDEN regelmäßigen Gegner mindestens 75 %, ab 5 Gegnern mit je 4 Duellen',
 frage:'Wie gut läuft es gegen den unangenehmsten Gegner?',
 cond:'Höchste Siegquote gegen den schwächsten eigenen Gegnerwert, ab 4 Gegnern mit je 15 Duellen',
 wie:'Nicht der Lieblingsgegner zählt, sondern der unangenehmste. Gegen wen läuft es am schlechtesten, und wie schlecht ist das noch. Regelmäßig heißt fünfzehn Duelle: gegen drei Gegner zu verlieren ist kein Muster.',
 nachbar:{name:'Gegen jeden bestanden', warum:'zählt, gegen wie viele Gegner die Bilanz im Plus steht. Eine Untergrenze ist strenger als ein Anteil: sie fällt mit einem einzigen schlechten Duell.'},
 wert:p => { const g = gegN(p, 15); if(g.length < 4) return null;
   return Math.min.apply(null, g.map(k => q(p.gegnerGrp[k]))); },
 ev:(p, v) => { const g = gegN(p, 15);
   return pct(v) + ' % gegen den unangenehmsten Gegner · ' + g.length
     + ' regelmäßige Gegner, gegen keinen weniger'; }},

{id:'ausgleich', familie:'partner', kammer:'lage', achse:'laufbahn',
 name:'Der Ausgleicher', short:'Ausgleich',
 quelle:'Neben JEDEM Partner mindestens 60 %, ab 3 Partnern mit je 5 Partien',
 frage:'Wie gut läuft es neben dem schwächsten Partner?',
 cond:'Höchste Siegquote neben dem schwächsten eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien',
 wie:'Nicht der beste Partner zählt, sondern der schlechteste. Es geht darum, mit wem auch immer zu bestehen. Der Nenner ist je Partner die Zahl der gemeinsamen Partien, also hilft es nicht, mit einem starken Partner besonders oft gespielt zu haben.',
 nachbar:{name:'Der Katalysator', warum:'misst, wie viel die Partner NEBEN diesem Spieler gewinnen, verglichen mit ohne. Hier geht es um die eigene Quote, und der Vergleich läuft zwischen den Partnern statt gegen deren Laufbahn.'},
 wert:p => { const m = matN(p, 15); if(m.length < 3) return null;
   return Math.min.apply(null, m.map(k => q(p.partnerGrp[k]))); },
 ev:(p, v) => { const m = matN(p, 15);
   const k = m.map(x => ({x, v:q(p.partnerGrp[x])})).sort((a, b) => a.v - b.v)[0];
   return pct(v) + ' % neben dem schwächsten Partner · ' + m.length
     + ' Partner ab 15 gemeinsamen Partien'; }},

{id:'metronom', familie:'tag', kammer:'lage', achse:'laufbahn',
 name:'Das Metronom', short:'Metronom',
 quelle:'Zwischen bestem und schwächstem Spieltag höchstens 15 Prozentpunkte, ab 3 Spieltagen mit je 3 Partien',
 frage:'Wie weit streuen die Tagesquoten um die eigene Quote?',
 cond:'Geringste Streuung der eigenen Tagesquoten, ab 15 eigenen Spieltagen mit je 3 Partien',
 wie:'Für jeden vollen eigenen Spieltag steht eine Tagesquote. Über eine ganze Laufbahn liegt zwischen bestem und schwächstem Tag fast immer die volle Spanne, also wird nicht die Spanne gemessen, sondern die Streuung: wie weit ein durchschnittlicher Tag von der eigenen Quote abweicht.',
 nachbar:{name:'Die Handschrift', warum:'misst die Streuung der Tordifferenz je Partie im Sturm. Eine ruhige Tordifferenz ist kein ruhiger Spieltag: vier knappe Niederlagen an einem Abend streuen dort gar nicht und hier maximal.'},
 wert:p => { const tq = Object.values(p.tagGrp).filter(a => a.length >= 3).map(a => q(a));
   return tq.length >= 15 ? -streuung(tq) : null; },
 ev:(p, v) => { const tq = Object.values(p.tagGrp).filter(a => a.length >= 3).map(a => q(a));
   return komma(-v * 100) + ' Punkte Streuung der Tagesquoten · ' + tq.length
     + ' volle Spieltage'; }},

{id:'zweiteluft', familie:'tag', kammer:'lage', achse:'laufbahn',
 name:'Die zweite Luft', short:'Luft',
 quelle:'Ab der vierten Partie eines Spieltags mindestens 40 Prozentpunkte stärker als in den ersten drei, ab 5 Partien in jedem Block',
 frage:'Wie viel besser läuft es später an einem langen Spieltag?',
 cond:'Größter Abstand der Siegquote ab der vierten Partie eines Spieltags zu den ersten drei, ab 15 Partien in jedem Block',
 wie:'Der Vergleich läuft innerhalb der eigenen Spieltage: dieselben Gegner, dieselbe Woche, nur später am Tag. Gezählt werden nur Tage mit mindestens fünf eigenen Partien, sonst gibt es keinen späten Block.',
 nachbar:{name:'Der letzte Ball', warum:'nimmt die eine Schlusspartie jedes Tages. Hier geht es um den ganzen späten Block, und der hängt an der Ausdauer statt am einzelnen Moment.'},
 wert:p => { const b = tagBlock(p);
   return (b.frueh.length >= 15 && b.spaet.length >= 15) ? q(b.spaet) - q(b.frueh) : null; },
 ev:(p, v) => { const b = tagBlock(p);
   return pp(v) + ' Punkte stärker ab der vierten Partie · ' + pct(q(b.spaet))
     + ' % gegen ' + pct(q(b.frueh)) + ' %'; }},

{id:'gleichauf', familie:'rechnung', kammer:'lage', achse:'laufbahn',
 name:'Auf Augenhöhe', short:'Auf Höhe',
 quelle:'In offenen Partien mindestens 20 Prozentpunkte stärker als sonst, ab 5 offenen Partien',
 frage:'Wie viel besser läuft es, wenn die Rechnung nichts vorgibt?',
 cond:'Größter Abstand der Siegquote in offenen Partien zur eigenen Gesamtquote, ab 20 offenen Partien',
 wie:'Offen heißt: die Rechnung gab beiden Teams zwischen 45 und 55 Prozent. Verglichen wird die Quote darin mit der eigenen Gesamtquote, also messen alle gegen ihr eigenes Niveau und nicht gegeneinander.',
 nachbar:{name:'Die ruhige Hand', warum:'nimmt die engen Partien, also die nach dem ERGEBNIS knappen. Offen ist eine Aussage über den Anpfiff, eng eine über den Abpfiff.'},
 wert:p => { const o = p.partien.filter(x => x.exp >= CHANCE_OFFEN && x.exp <= CHANCE_FAVORIT);
   return o.length >= 20 ? q(o) - p.q : null; },
 ev:(p, v) => { const o = p.partien.filter(x => x.exp >= CHANCE_OFFEN && x.exp <= CHANCE_FAVORIT);
   return pp(v) + ' Punkte besser in offenen Partien · ' + o.filter(x => x.win).length
     + ' von ' + o.length + ', sonst ' + pct(p.q) + ' %'; }},

{id:'beidseitig', familie:'lagen', kammer:'lage', achse:'laufbahn',
 name:'Der Beidfüßige', short:'Beidfüßig',
 quelle:'Auf beiden Positionen höchstens 1 Prozentpunkt neben der eigenen Gesamtquote, ab 5 Partien je Position',
 frage:'Wie weit liegt die schwächere der beiden Positionen von der eigenen Quote entfernt?',
 cond:'Geringster Abstand beider Positionsquoten zur eigenen Gesamtquote, ab 25 Partien je Position',
 wie:'Die Quote im Sturm und die in der Abwehr, beide gegen die eigene Gesamtquote. Gewertet wird der größere der beiden Abstände, also hilft eine passende Position nicht, wenn die andere abfällt.',
 nachbar:{name:'Der Wandler', warum:'fragt nach der Verteilung der Einsätze, nicht nach der Leistung. Beides zusammen wäre erst die ganze Aussage, und der Wandler kennt nur die eine Hälfte.'},
 wert:p => { const a = p.partien.filter(x => x.pos === 'atk'), d = p.partien.filter(x => x.pos === 'def');
   if(a.length < 25 || d.length < 25) return null;
   return -Math.max(Math.abs(q(a) - p.q), Math.abs(q(d) - p.q)); },
 ev:(p, v) => { const a = p.partien.filter(x => x.pos === 'atk'), d = p.partien.filter(x => x.pos === 'def');
   return komma(-v * 100) + ' Punkte Abstand zur eigenen Quote · ' + pct(q(a))
     + ' % vorne, ' + pct(q(d)) + ' % hinten, ' + pct(p.q) + ' % gesamt'; }}
];

// ── Die Messung ─────────────────────────────────────────────────────
const IM_FELD = IDS.filter(id => LAUF[id].games >= 20);   // gewertete Spieler
const Q_RANG = {};
IM_FELD.slice().sort((a, b) => LAUF[b].q - LAUF[a].q).forEach((id, i) => { Q_RANG[id] = i + 1; });
const DREI_BESTE = IM_FELD.slice().sort((a, b) => LAUF[b].q - LAUF[a].q).slice(0, 3);
const ZIEL = ['Julian', 'Jane', 'Jannik'];                // die drei ohne Rekord

// Wie stark haengt in diesem Feld die SIEGQUOTE an der Spielzahl? Das ist die
// Messlatte fuer Tor 1: eine Koennens-Kennzahl darf so abhaengig sein wie das
// Koennen selbst, aber nicht abhaengiger.
const Q_KORR_FELD = korr(IM_FELD.map(id => LAUF[id].games), IM_FELD.map(id => LAUF[id].q));

const ERG = KAND.map(k => {
  const alle = IM_FELD.map(id => ({id, v:k.wert(LAUF[id])}))
    .filter(x => x.v != null && isFinite(x.v))
    .sort((a, b) => b.v - a.v);
  const best = alle.length ? alle[0].v : null;
  const halter = alle.filter(x => Math.abs(x.v - best) < 1e-9);
  const deckel = alle.length ? alle.filter(x => Math.abs(x.v - Math.max.apply(null,
    alle.map(y => y.v))) < 1e-9).length : 0;
  const kKorr = korr(alle.map(x => LAUF[x.id].games), alle.map(x => x.v));
  const qKorr = korr(alle.map(x => LAUF[x.id].q), alle.map(x => x.v));
  const kleinste = alle.length ? Math.min.apply(null, alle.map(x => LAUF[x.id].games)) : 0;
  // Tor 5: jede Zahl der Bedingung auf einem 5er-Schritt — aber erst ab zehn.
  // Unter zehn ist ein 5er-Schritt keine Rundung, sondern eine andere Regel:
  // „ab 5 Partnern" statt „ab 3 Partnern" verlangt fast das Doppelte, und
  // vier regelmaessige Gegner sind in einer Liga aus zwoelf Leuten das Mass
  // fuer eine Aussage ueber die Breite.
  const zahlen = [...k.cond.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|Partien|Siegen|Duellen|Spieltagen|Gegnern|Partnern|Prozentpunkte)/g)]
    .map(m => parseFloat(String(m[1]).replace(',', '.')));
  const krumm = zahlen.filter(v => v >= 10 && Math.abs(v / 5 - Math.round(v / 5)) > 1e-9);
  const tore = {
    spielzahl: Math.abs(kKorr) <= 0.35 || Math.abs(kKorr) <= Math.abs(Q_KORR_FELD) + 1e-9,
    decke: alle.length >= 3 && deckel <= 2,
    vergeben: halter.length > 0,
    offen: alle.some(x => LAUF[x.id].games < 100),
    raster: krumm.length === 0,
    nachbar: !!(k.nachbar && k.nachbar.warum)
  };
  tore.alle = Object.keys(tore).filter(x => x !== 'alle').every(x => tore[x]);
  return {k, alle, halter, deckel, kKorr, qKorr, kleinste, krumm, tore,
    ev:halter.length ? k.ev(LAUF[halter[0].id], halter[0].v) : ''};
});

// ── Die Monatsachse des einen neuen Eintrags ────────────────────────
// Ein neuer Eintrag braucht Art, Klasse und Ausschlag [§C39]. Der Ausschlag
// ist keine Meinung: er sagt, wie weit die Schwelle vom Schnitt aller liegt,
// die in dieser Disziplin je gewertet wurden, in Standardabweichungen.
const NEU = KAND.filter(k => k.achse === 'neu').map(k => {
  const werte = [];
  const felder = {};
  MON_GEWERTET.forEach(mk => {
    felder[mk] = IDS.map(id => ({id, v:k.monWert(MON[mk][id])}))
      .filter(x => x.v != null && isFinite(x.v)).sort((a, b) => b.v - a.v);
    felder[mk].forEach(x => werte.push(x.v));
  });
  // Die Schwelle wird nicht gewuerfelt, sie wird gemessen: gesucht ist die
  // HOECHSTE Schwelle auf einem 5er-Schritt, die in den gewerteten Monaten
  // ueberhaupt jemand erfuellt. Hoeher gelegt waere die Chronik nie zu holen,
  // tiefer gelegt gaebe sie mehr als einen Halter je Monat her [§C32].
  const halterBei = ab => { const h = [];
    MON_GEWERTET.forEach(mk => { const top = felder[mk][0];
      if(top && top.v >= ab - 1e-9) h.push({monat:mk, id:top.id, v:top.v}); });
    return h; };
  let ab = 0.05, halter = halterBei(ab);
  for(let t = 0.50; t >= 0.05; t -= 0.05){
    const h = halterBei(t);
    if(h.length >= 1){ ab = Math.round(t * 100) / 100; halter = h; break; }
  }
  const m = werte.reduce((a, b) => a + b, 0) / (werte.length || 1);
  const sd = streuung(werte);
  return {k, ab, werte, halter, aus:sd ? (ab - m) / sd : 0,
    rate:halter.length / (MON_GEWERTET.length || 1),
    rateOk:halter.length <= MON_GEWERTET.length, ausOk:sd ? (ab - m) / sd >= 1.5 : false};
});

// ── Was die Tafel heute traegt ──────────────────────────────────────
// Der Bestand kommt aus der App und nicht aus einer zweiten Rechnung [§C27]:
// `dist/index.html` wird geladen und `allChronicles` gefragt.
const HEUTE = (() => {
  const htm = fs.readFileSync(ROOT + '/dist/index.html', 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, bl = []; while((m = re.exec(htm))) bl.push(m[1]);
  bl.sort((a, b) => b.length - a.length);
  let code = bl[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
  const lc = code.lastIndexOf('})();');
  code = code.slice(0, lc) + '\nglobalThis.__k={eval:c=>eval(c)};\n' + code.slice(lc);
  const FIXED = new Date('2026-08-27T12:00:00Z').getTime();
  const RD = Date;
  globalThis.Date = class extends RD {
    constructor(...a){ if(a.length === 0) super(FIXED); else super(...a); }
    static now(){ return FIXED; } };
  const el = () => ({ style:{}, classList:{add(){},remove(){},contains(){return false}},
    addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){},
    querySelector(){return null}, querySelectorAll(){return []}, setAttribute(){},
    getAttribute(){return null}, insertAdjacentHTML(){}, focus(){}, click(){},
    scrollIntoView(){}, dataset:{}, children:[], innerHTML:'', textContent:'' });
  globalThis.window = { addEventListener(){}, removeEventListener(){},
    location:{href:'',hash:'',reload(){}}, matchMedia:() => ({matches:false,
    addEventListener(){}, addListener(){}}), navigator:{}, scrollTo(){}, setTimeout,
    clearTimeout, history:{pushState(){},replaceState(){},back(){}},
    innerWidth:430, innerHeight:932 };
  globalThis.document = { getElementById:() => el(), querySelector:() => null,
    querySelectorAll:() => [], createElement:() => el(), body:el(), documentElement:el(),
    addEventListener(){}, removeEventListener(){}, head:el(), visibilityState:'visible', title:'' };
  globalThis.localStorage = { _d:{}, getItem(k){return this._d[k] ?? null},
    setItem(k, v){this._d[k] = String(v)}, removeItem(k){delete this._d[k]}, clear(){this._d = {}} };
  Object.defineProperty(globalThis, 'navigator', {configurable:true, writable:true,
    value:{onLine:true, userAgent:'node', serviceWorker:{register(){return Promise.resolve()}},
           clipboard:{writeText(){return Promise.resolve()}}}});
  globalThis.location = window.location;
  globalThis.fetch = () => Promise.resolve({ok:true, json:() => Promise.resolve({}),
    text:() => Promise.resolve('')});
  const ch = () => new Proxy(function(){}, {get(_, p2){return p2 === 'then' ? undefined : ch()},
    apply(){return ch()}});
  globalThis.supabase = { createClient: () => ({from:() => ch(), channel:() => ch(),
    removeChannel(){}, rpc:() => ch()}) };
  globalThis.alert = () => {}; globalThis.confirm = () => true; globalThis.prompt = () => null;
  globalThis.requestAnimationFrame = f => setTimeout(f, 0);
  eval(code);
  const KK = globalThis.__k;
  KK.eval(`
    players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false,
      elo:0, atk:0.5, avatar_id:null})))};
    matches = ${JSON.stringify(MS.map(m => ({id:m.id, a1:m.a1, a2:m.a2, b1:m.b1, b2:m.b2,
      a1_pos:m.a1_pos, a2_pos:m.a2_pos, b1_pos:m.b1_pos, b2_pos:m.b2_pos,
      score_a:m.score_a, score_b:m.score_b, winner:m.winner, exp_a:m.exp_a,
      created_at:new Date(m.ts).toISOString(), deltas:{}})))};
    seasons = [
      {id:'2026-05',label:'Mai 2026',start_date:'2026-04-30',end_date:'2026-05-31'},
      {id:'2026-06',label:'Juni 2026',start_date:'2026-05-31',end_date:'2026-06-30'},
      {id:'2026-07',label:'Juli 2026',start_date:'2026-06-30',end_date:'2026-07-31'}
    ];
    invalidateCache();
    const _rc = simulateEloWithSliders(matches);
    const _d = {}; _rc.history.forEach(h=>{_d[h.matchId]=h.deltas;});
    matches.forEach(m=>{ m.deltas=_d[m.id]||{}; });
    invalidateCache(); 'bereit'`);
  return JSON.parse(KK.eval(`JSON.stringify((function(){
    const A = allChronicles();
    const halt = {}; players.forEach(p => { halt[p.name] = []; });
    Object.keys(A.byId).forEach(cid => {
      const e = A.byId[cid];
      (e.pids || []).forEach(pid => { halt[pname(pid)].push(
        {id:cid, name:e.name || cid, neg:!!e.neg}); });
    });
    // Wie viele Monatschroniken haben keine Laufbahn-Achse, und wie viele
    // Rekorde verlangen eine hohe Mindestzahl? Beides gelesen und nicht
    // behauptet: die Mindestzahl steht im Klartext in der Bedingung.
    const nurMonat = DISZIPLINEN.filter(d => d.monat && !d.allzeit).length;
    const hoheHuerde = CHRONICLES.filter(c => {
      // Doppelt escapen: diese Zeile steht in einem Template-Literal, und
      // dort wird aus \\d ein blankes d.
      const m = [...String(c.cond || '').matchAll(/ab (\\d+)\\s*(Partien|Spielen|Sturmspielen|Abwehrspielen|Siegen|Niederlagen|Gelegenheiten|Duellen)/g)];
      return m.some(x => Number(x[1]) >= 40);
    }).length;
    return {halt, katalog:CHRONICLES.length, nurMonat, hoheHuerde,
      vergeben:Object.keys(A.byId).length,
      haltungen:Object.keys(A.byId).reduce((n, cid) => n + (A.byId[cid].pids || []).length, 0)};
  })())`));
})();

// ── Tor 7: dieselbe Frage, derselbe Halter ──────────────────────────
// Eine Kennzahl auf drei Teilmengen ist dieselbe Frage in drei Ausschnitten
// und sammelt sich beim selben Halter [§C35]. Gemessen wird das nicht am
// Namen, sondern an der MENGE, die eine Frage befragt: der Gegnerkreis, der
// Partnerkreis, der eigene Spieltag, die Reihenfolge, die Tore, die
// Elo-Rechnung, die fuenf Lagen. Zwei Eintraege derselben Familie mit
// demselben Halter sind einer zu viel. Es bleibt der, der WENIGER an der
// Siegquote haengt: ein knapper Abstand zum Zweiten ist kein Mangel, sondern
// das Beste, was ein Rekord haben kann (er wechselt dann den Halter), also
// taugt er nicht als Kriterium. Gefragt ist, welche der beiden Fragen etwas
// hinzufuegt, das die Siegquote nicht schon sagt.
const FAMNAME = {gegner:'der Gegnerkreis', partner:'der Partnerkreis',
  tag:'der eigene Spieltag', folge:'die Reihenfolge', tore:'die Tore',
  rechnung:'die Elo-Rechnung', lagen:'die fünf Lagen'};
ERG.forEach(e => { e.abstand = e.alle.length < 2 ? 0
  : (() => { const b = e.alle[0].v, z = e.alle[1].v, u = e.alle[e.alle.length - 1].v;
      return (b - u) ? (b - z) / (b - u) : 0; })();
  e.familieOk = true; e.grund = ''; });
Object.keys(FAMNAME).forEach(f => {
  const drin = ERG.filter(e => e.k.familie === f && e.tore.alle)
    .sort((a, b) => Math.abs(a.qKorr) - Math.abs(b.qKorr));
  const belegt = {};
  drin.forEach(e => {
    const doppelt = e.halter.find(h => belegt[h.id]);
    if(doppelt){ e.familieOk = false;
      e.grund = 'dieselbe Familie (' + FAMNAME[f] + ') und derselbe Halter wie „'
        + belegt[doppelt.id] + '", und der Wert haengt staerker an der Siegquote'; }
    else e.halter.forEach(h => { belegt[h.id] = e.k.name; });
  });
});
ERG.forEach(e => { e.traegt = e.tore.alle && e.familieOk; });

// ── Die Kammer-Tore ─────────────────────────────────────────────────
const KAMMERN = ['anteil', 'lage'];
const KTOR = {};
KAMMERN.forEach(kam => {
  const traeger = ERG.filter(e => e.k.kammer === kam && e.traegt);
  const haltungen = [];
  traeger.forEach(e => e.halter.forEach(h => haltungen.push(name(h.id))));
  const zahl = {}; haltungen.forEach(n => { zahl[n] = (zahl[n] || 0) + 1; });
  const groesster = Object.keys(zahl).sort((a, b) => zahl[b] - zahl[a])[0];
  KTOR[kam] = {
    traeger:traeger.length, haltungen:haltungen.length, zahl,
    groesster, groesstZahl:groesster ? zahl[groesster] : 0,
    ausserhalb: traeger.some(e => e.halter.some(h => !DREI_BESTE.includes(h.id))),
    drei: ZIEL.filter(n => haltungen.includes(n))
  };
});
// Tor 8 gilt ueber die ganze Tafel und nicht je Kammer. „Kein Halter traegt
// mehr als ein Viertel der Tafel" [§C35] ist eine Aussage ueber den Bestand,
// nicht ueber einen Stapel neuer Eintraege: dass die Haelfte der Kammer an
// Julian geht, IST die Absicht dieses Laufs. Gemessen wird deshalb der
// Bestand danach — mit den heutigen Haltungen aus der App.
const ALLE_HALTUNGEN = [];
ERG.filter(e => e.traegt).forEach(e => e.halter.forEach(h => ALLE_HALTUNGEN.push(name(h.id))));
const DREI_DA = ZIEL.filter(n => ALLE_HALTUNGEN.includes(n));
// Der Bestand danach: heutige Haltungen ohne Schattenseiten plus die neuen.
const TAFEL_NACH = {};
Object.keys(HEUTE.halt).forEach(n => { TAFEL_NACH[n] = HEUTE.halt[n].filter(x => !x.neg).length; });
ALLE_HALTUNGEN.forEach(n => { TAFEL_NACH[n] = (TAFEL_NACH[n] || 0) + 1; });
const NACH_SUMME = Object.values(TAFEL_NACH).reduce((a, b) => a + b, 0);
const NACH_GROESSTER = Object.keys(TAFEL_NACH).sort((a, b) => TAFEL_NACH[b] - TAFEL_NACH[a])[0];
const VIERTEL_OK = TAFEL_NACH[NACH_GROESSTER] <= NACH_SUMME / 4;

// ── Bericht ─────────────────────────────────────────────────────────
const KAMNAME = {anteil:'Kammer I — der Anteil an den eigenen Gelegenheiten',
  lage:'Kammer II — die schwächste Stelle'};
console.log('\n' + MS.length + ' echte Partien, ' + IM_FELD.length + ' gewertete Spieler, '
  + MON_GEWERTET.length + ' gewertete Monate');
console.log('Siegquote und Spielzahl haengen in diesem Feld mit r = '
  + komma(Q_KORR_FELD, 2) + ' zusammen — das ist die Messlatte fuer Tor 1.\n');
console.log('Heute: ' + HEUTE.katalog + ' Rekorde im Katalog, ' + HEUTE.vergeben
  + ' vergeben, ' + HEUTE.haltungen + ' Haltungen');
Object.keys(HEUTE.halt).sort((a, b) => HEUTE.halt[b].length - HEUTE.halt[a].length)
  .forEach(n => { const h = HEUTE.halt[n];
    console.log('  ' + n.padEnd(10) + String(h.filter(x => !x.neg).length).padStart(2)
      + ' Rekorde' + (h.some(x => x.neg) ? ', ' + h.filter(x => x.neg).length + ' Schatten' : '')); });

KAMMERN.forEach(kam => {
  console.log('\n' + KAMNAME[kam]);
  ERG.filter(e => e.k.kammer === kam).forEach(e => {
    const t = e.tore;
    console.log('\n  ' + (e.traegt ? '+' : '-') + ' ' + e.k.name
      + '  [' + (e.k.achse === 'neu' ? 'neue Disziplin' : 'zweite Achse')
      + ', Familie: ' + FAMNAME[e.k.familie] + ']');
    console.log('      ' + e.k.cond);
    console.log('      Halter: ' + (e.halter.map(h => name(h.id) + ' (q'
      + Q_RANG[h.id] + ', ' + LAUF[h.id].games + ' Partien)').join(' & ') || 'frei'));
    console.log('      ' + e.ev);
    console.log('      im Rennen ' + e.alle.length + ', kleinste Spielzahl ' + e.kleinste
      + ', r(Spiele) = ' + komma(e.kKorr, 2) + ', r(Siegquote) = ' + komma(e.qKorr, 2));
    console.log('      ' + Object.keys(t).filter(x => x !== 'alle')
      .map(x => (t[x] ? '✓ ' : '✗ ') + x).join('  '));
    console.log('      Verfolger: ' + e.alle.slice(1, 4).map(x => name(x.id)).join(', ')
      + ', Abstand zum Zweiten ' + pct(e.abstand) + ' % der Spannweite');
    if(e.grund) console.log('      faellt: ' + e.grund);
  });
  const K = KTOR[kam];
  console.log('\n  Kammer: ' + K.traeger + ' tragen, ' + K.haltungen + ' Haltungen, '
    + 'groesster Halter ' + K.groesster + ' mit ' + K.groesstZahl);
  console.log('  ' + (K.ausserhalb
    ? 'nicht nur die drei Besten der Siegquote'
    : 'alle Eintraege dieser Kammer gehen an die drei Besten der Siegquote'));
});
NEU.forEach(n => {
  console.log('\n  Monatsachse von „' + n.k.name + '": Schwelle ' + pp(n.ab)
    + ' Punkte, Ausschlag ' + komma(n.aus, 2) + ' sigma, ' + n.halter.length
    + ' Halter in ' + MON_GEWERTET.length + ' Monaten ('
    + n.halter.map(h => name(h.id) + ' ' + h.monat).join(', ') + ')'
    + '  ' + (n.ausOk ? '\u2713' : '\u2717') + ' Ausschlag ab 1,5 sigma  '
    + (n.rateOk ? '\u2713' : '\u2717') + ' hoechstens ein Halter je Monat');
});
console.log('\nTor 8 ueber beide Kammern: ' + (DREI_DA.length === 3 ? '✓' : '✗')
  + ' ' + DREI_DA.join(', ') + ' von ' + ZIEL.join(', '));
const NACH = TAFEL_NACH;
console.log('\nTor 8: ' + (VIERTEL_OK ? '\u2713' : '\u2717') + ' groesster Halter '
  + NACH_GROESSTER + ' mit ' + NACH[NACH_GROESSTER] + ' von ' + NACH_SUMME
  + ' Haltungen (' + pct(NACH[NACH_GROESSTER] / NACH_SUMME) + ' %, erlaubt 25 %)');
console.log('\nVerteilung danach:');
Object.keys(NACH).sort((a, b) => NACH[b] - NACH[a]).forEach(n => {
  const vor = HEUTE.halt[n].filter(x => !x.neg).length;
  console.log('  ' + n.padEnd(10) + String(vor).padStart(2) + ' → '
    + String(NACH[n]).padStart(2) + (NACH[n] > vor ? '  +' + (NACH[n] - vor) : ''));
});

// ── Die Seite ───────────────────────────────────────────────────────
// Bewusst schmucklos: sie zeigt, WELCHE Rekorde es werden koennten, an
// welcher Frage sie haengen und was die Messung von ihnen haelt — nicht, wie
// sie in der App aussaehen.
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const TOR = (ok, txt) => `<span class="t ${ok ? 'j' : 'n'}">${esc(txt)}</span>`;
const karte = e => {
  const k = e.k;
  return `<div class="kand ${e.traegt ? 'ok' : 'rot'}">
    <div class="kopf"><b>${esc(k.name)}</b>
      <span class="sh">${esc(k.short)}</span>
      <span class="art ${k.achse}">${k.achse === 'neu' ? 'neue Disziplin' : 'zweite Achse'}</span>
      <span class="fam">${esc(FAMNAME[k.familie])}</span>
      <span class="ur">${e.traegt ? 'trägt' : 'trägt nicht'}</span></div>
    <div class="frage">${esc(k.frage)}</div>
    <div class="cond">${esc(k.cond)}</div>
    <div class="wie">${esc(k.wie)}</div>
    ${k.achse === 'laufbahn' ? `<div class="quelle"><i>Monatschronik heute:</i>
      ${esc(k.quelle)}</div>` : ''}
    <div class="nachbar"><i>nächster Nachbar:</i> <b>${esc(k.nachbar.name)}</b>
      ${esc(k.nachbar.warum)}</div>
    ${e.grund ? '<div class="fallt">fällt: ' + esc(e.grund) + '</div>' : ''}
    <div class="axe">
      <div class="ax"><div class="axk">Halter heute</div>
        <div class="halt">${esc(e.halter.map(h => name(h.id)).join(' & ') || '— frei —')}
          ${e.halter[0] ? '<span class="kk">Siegquote Platz ' + Q_RANG[e.halter[0].id]
            + ' · ' + LAUF[e.halter[0].id].games + ' Partien</span>' : ''}</div>
        <div class="ev">${esc(e.ev)}</div>
        <div class="liste">${e.alle.slice(0, 6).map((x, i) =>
          '<span>' + (i + 1) + '. ' + esc(name(x.id)) + ' <i>q' + Q_RANG[x.id]
          + '</i></span>').join('')}</div>
      </div>
      <div class="ax"><div class="axk">Die Tore</div>
        <div class="tore">
          ${TOR(e.tore.spielzahl, 'Spielzahl r = ' + komma(e.kKorr, 2)
            + ' (Siegquote ' + komma(Q_KORR_FELD, 2) + ')')}
          ${TOR(e.tore.decke, e.deckel === 1 ? 'ein Bestwert, keine Decke'
            : e.deckel + ' teilen den Bestwert')}
          ${TOR(e.tore.vergeben, e.halter.length ? 'vergeben' : 'unbesetzt')}
          ${TOR(e.tore.offen, 'kleinste Spielzahl im Rennen: ' + e.kleinste)}
          ${TOR(e.tore.raster, e.krumm.length ? 'krumme Schwelle: ' + e.krumm.join(', ')
            : 'jede Zahl auf einem 5er-Schritt')}
          ${TOR(e.tore.nachbar, 'Nachbar benannt')}
          ${TOR(e.familieOk, e.familieOk ? 'einzige seiner Familie bei diesem Halter'
            : 'Familie doppelt besetzt')}
          <span class="t i">Abstand zum Zweiten ${pct(e.abstand)} % der Spannweite</span>
          <span class="t i">im Rennen ${e.alle.length} von ${IM_FELD.length}</span>
          <span class="t i">r mit der Siegquote ${komma(e.qKorr, 2)}</span>
        </div>
      </div>
    </div></div>`;
};
const kammerBlock = kam => {
  const K = KTOR[kam];
  return `<h2>${esc(KAMNAME[kam])}</h2>
    <div class="kam">
      <span class="t ${K.traeger ? 'j' : 'n'}">${K.traeger} von
        ${ERG.filter(e => e.k.kammer === kam).length} tragen</span>
      <span class="t i">größter Halter ${esc(String(K.groesster))}
        mit ${K.groesstZahl} von ${K.haltungen}</span>
      <span class="t i">${K.ausserhalb
        ? 'nicht nur die drei Besten der Siegquote'
        : 'alle Einträge gehen an die drei Besten der Siegquote'}</span>
      <span class="t i">erreicht: ${esc(K.drei.join(', ') || 'keinen der drei')}</span>
    </div>
    ${ERG.filter(e => e.k.kammer === kam).map(karte).join('')}`;
};
const vorNach = Object.keys(NACH).sort((a, b) => NACH[b] - NACH[a]).map(n => {
  const vor = HEUTE.halt[n].filter(x => !x.neg).length;
  return `<tr class="${NACH[n] > vor ? 'plus' : ''}"><td>${esc(n)}</td>
    <td>Platz ${Q_RANG[IDS[NAMES.indexOf(n)]] || '—'}</td>
    <td>${LAUF[IDS[NAMES.indexOf(n)]].games}</td>
    <td>${vor}</td><td><b>${NACH[n]}</b></td>
    <td>${NACH[n] > vor ? '+' + (NACH[n] - vor) : ''}</td></tr>`;
}).join('');

const SEITE = `<!doctype html><meta charset="utf-8">
<title>Anteil je Gelegenheit und die schwächste Stelle — Vorschlag</title>
<style>
 body{background:#0c0e0d;color:#d7dbd8;font:14px/1.5 system-ui,sans-serif;margin:0;padding:22px;
   max-width:1080px}
 h1{font-size:21px;margin:0 0 4px} h2{font-size:16px;margin:30px 0 4px;color:#e8ecea}
 p{margin:6px 0;color:#9fa8a3;max-width:72ch}
 code{background:#181c1a;padding:1px 4px;border-radius:3px;font-size:12px}
 table{border-collapse:collapse;margin:8px 0;font-size:13px}
 td,th{padding:3px 12px 3px 0;text-align:left;vertical-align:top}
 th{color:#7d8781;font-weight:600}
 tr.plus td{color:#7fc99a}
 .warn{border-left:3px solid #c8a24a;background:#17150f;padding:10px 14px;margin:16px 0}
 .warn b{color:#c8a24a}
 .kam{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 4px}
 .kand{background:#131614;border:1px solid #232825;border-left-width:3px;
   border-radius:8px;padding:12px 14px;margin:8px 0}
 .kand.ok{border-left-color:#7fc99a} .kand.rot{border-left-color:#f0566a}
 .kopf{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
 .kopf b{font-size:15px;color:#fff}
 .sh,.art,.ur,.fam{font-size:11px;padding:1px 6px;border-radius:4px;background:#1d2220;color:#8b948f}
 .art.neu{background:#1b1622;color:#b49ad6}
 .art.laufbahn{background:#22201a;color:#c8a24a}
 .ur{margin-left:auto;background:#14231a;color:#7fc99a}
 .kand.rot .ur{background:#25151a;color:#f0566a}
 .frage{margin:7px 0 0;color:#fff;font-size:14px}
 .cond{margin:3px 0 2px;color:#e2e6e3;font-size:13px}
 .wie,.quelle,.nachbar{color:#858e89;font-size:12px;max-width:86ch}
 .quelle,.nachbar{margin-top:5px}
 .quelle i,.nachbar i{color:#6f7873;font-style:normal}
 .nachbar b{color:#a9b2ad;font-weight:600}
 .fallt{margin-top:5px;font-size:12px;color:#f0566a}
 .axe{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
 .ax{flex:1 1 320px;background:#0f1211;border:1px solid #1e2321;border-radius:6px;padding:9px 11px}
 .axk{font-size:11px;color:#6f7873;text-transform:uppercase;letter-spacing:.05em}
 .halt{color:#fff;font-size:14px;margin:3px 0}
 .kk{font-size:11px;color:#8b948f;background:#1d2220;padding:1px 6px;border-radius:4px}
 .ev{color:#9fa8a3;font-size:12px}
 .liste{display:flex;gap:9px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:#7d8781}
 .liste i{color:#5f6864;font-style:normal}
 .tore{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}
 .t{font-size:11px;padding:2px 7px;border-radius:4px}
 .t.j{background:#101d16;color:#7fc99a} .t.n{background:#25151a;color:#f0566a}
 .t.i{background:#16191c;color:#8fa8c4}
</style>
<h1>Anteil je Gelegenheit und die schwächste Stelle</h1>
<p>Gerechnet an den <b>${MS.length} echten Partien</b> der Liga, ${IM_FELD.length}
gewertete Spieler, ${MON_GEWERTET.length} gewertete Monate. Gebaut von
<code>mockup/staerken-lauf.js</code>. Die Herleitung steht in
<code>mockup/README-staerken.md</code>.</p>
<div class="warn"><b>Zwei Fragen, eine Antwort.</b> „Der Platzhirsch" und „Der
Wochenherr" sind die einzigen zwei Rekorde, die eine Errungenschaft je
Gelegenheit messen. Und Julian steht auf Platz ${Q_RANG[IDS[NAMES.indexOf('Julian')]]}
der Siegquote, hält aber nur ${HEUTE.halt.Julian.filter(x => !x.neg).length} von
${Object.keys(HEUTE.halt).reduce((n, x) => n + HEUTE.halt[x].filter(y => !y.neg).length, 0)}
Haltungen; Jane ${HEUTE.halt.Jane.filter(x => !x.neg).length},
Jannik ${HEUTE.halt.Jannik.filter(x => !x.neg).length}. Beides hat denselben Grund:
${HEUTE.hoheHuerde} der ${HEUTE.katalog} Rekorde verlangen eine Mindestzahl von
vierzig Partien oder mehr, und wer weniger spielt, kommt dort nicht vor. In diesem
Feld hängen Siegquote und Spielzahl mit r = ${komma(Q_KORR_FELD, 2)} zusammen.</div>
<p>Der Katalog hat die Antwort schon: ${HEUTE.nurMonat} Monatschroniken tragen nur die
Monatsachse, und ein Dutzend davon fragt genau nach einem Anteil je Gelegenheit.
Dieselbe Frage auf zwei Zeitachsen bleibt EINE Disziplin [§13.1] — ein solcher
Rekord kostet keinen neuen Namen, kein Icon und keinen Beinamen, nur eine zweite
Achse. Nur ein Eintrag ist wirklich neu: <b>Das Übersoll</b>, das der Code in
<code>untersoll.monat.wie</code> schon als Bezug nennt.</p>
${kammerBlock('anteil')}
${kammerBlock('lage')}
<h2>Die Monatsachse des neuen Eintrags</h2>
${NEU.map(n => `<p><b>${esc(n.k.name)}</b> · Schwelle ${esc(pp(n.ab))} Prozentpunkte,
  Ausschlag <b>${esc(komma(n.aus, 2))} σ</b>, ${n.halter.length} Halter in
  ${MON_GEWERTET.length} gewerteten Monaten
  (${esc(n.halter.map(h => name(h.id) + ' ' + h.monat).join(', ') || 'keiner')}).
  Beiname „${esc(n.k.monBeiname)}", Art ${esc(n.k.monArt)}.</p>
  <div class="kam"><span class="t ${n.ausOk ? 'j' : 'n'}">Ausschlag
    ${esc(komma(n.aus, 2))} σ, verlangt sind 1,5 [§C39]</span>
    <span class="t ${n.rateOk ? 'j' : 'n'}">höchstens ein Halter je gewerteten
    Monat [§C32]</span></div>`).join('')}
<h2>Die Tafel davor und danach</h2>
<table><tr><th>Spieler</th><th>Siegquote</th><th>Partien</th><th>Rekorde heute</th>
<th>danach</th><th></th></tr>${vorNach}</table>
<div class="kam">
  <span class="t ${DREI_DA.length === 3 ? 'j' : 'n'}">Tor 8: ${DREI_DA.length === 3
    ? 'alle drei' : 'nur ' + esc(DREI_DA.join(', '))} von Julian, Jane und Jannik
    bekommen einen Eintrag</span>
  <span class="t ${VIERTEL_OK ? 'j' : 'n'}">größter Halter der Tafel danach:
    ${esc(NACH_GROESSTER)} mit ${NACH[NACH_GROESSTER]} von ${NACH_SUMME}
    (${pct(NACH[NACH_GROESSTER] / NACH_SUMME)} %, erlaubt 25 %)</span>
  <span class="t ${ERG.some(e => e.traegt && e.halter.some(h => !DREI_BESTE.includes(h.id))) ? 'j' : 'n'}">
    ${ERG.filter(e => e.traegt && e.halter.some(h => !DREI_BESTE.includes(h.id))).length}
    Einträge gehen nicht an die drei Besten der Siegquote</span>
</div>
<p>Die Verteilung IN diesem Stapel ist bewusst schief: Julian bekommt die meisten
Einträge, und genau darum ging es. Das Viertel-Tor aus §C35 ist eine Aussage über
den Bestand, nicht über einen Stapel neuer Einträge, und der Bestand bleibt
darunter.</p>
`;
fs.writeFileSync(ROOT + '/mockup/staerken.html', SEITE);
console.log('\nmockup/staerken.html geschrieben (' + (SEITE.length / 1024).toFixed(0) + ' kB)');

process.exit(0);
