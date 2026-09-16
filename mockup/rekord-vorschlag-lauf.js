// Der Lauf: rechnet vierzehn Kandidaten fuer neue Liga-Rekorde an den ECHTEN
// Partien der Liga nach und prueft jeden gegen die vier Tore, die der Katalog
// verlangt [§C35, §C39]:
//
//   1. Haengt der Wert an der Spielzahl?   (Korrelation, erlaubt bis 0,35)
//   2. Ist er fuer die Mitte erreichbar?   (Rang des Halters in der Siegquote)
//   3. Steht die halbe Liga im Rennen?     (wie viele die Mindestzahl erfuellen)
//   4. Schlaegt die Bestmarke weit aus?    (Ausschlag in Standardabweichungen)
//
// Ergebnis ist `.rekord-vorschlag.json`, aus der `rekord-vorschlag-seite.js`
// die Seite baut.
//
//   node mockup/rekord-vorschlag-lauf.js && node mockup/rekord-vorschlag-seite.js
//
// Die Rohsicht (jede Partie aus der Sicht eines Spielers, gruppiert nach
// Spieltag, Woche, Partner und Gegner) wird hier nachgebaut — genau die, die
// `_seasonTitleCtx` fuer den MONAT schon hat und die `_chronicleCtx` fuer die
// LAUFBAHN noch fehlt. Das ist der eigentliche Vorschlag: eine Rohsicht fuer
// beide Zeitachsen, danach ist jeder neue Rekord ein Schwellenwert.
'use strict';
const fs = require('fs');
const ROOT = '/home/user/kicker-app';
const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const packed = fs.readFileSync(ROOT + '/tests/fixtures/matches.txt', 'utf8').trim();
const MS = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4 + k] === 0 ? 'atk' : 'def';
  return { id:'m' + String(i).padStart(4, '0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3),
    score_a:f[8], score_b:f[9], winner:f[10] === 0 ? 'A' : 'B',
    exp_a:f[11] / 1000, ts:f[12] * 1000 };
});
MS.sort((a, b) => a.ts - b.ts);
const name = id => NAMES[IDS.indexOf(id)] || '?';

// ── Die Rohsicht ────────────────────────────────────────────────────
const tagKey = ts => { const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0'); };
const monatKey = ts => { const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const wocheKey = ts => { const d = new Date(ts);
  const mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return tagKey(mo.getTime()); };

const P = {};
IDS.forEach(id => { P[id] = {id, partien:[], games:0, wins:0, gf:0, ga:0, gd:0, expSum:0}; });
MS.forEach(m => {
  const ids = [m.a1, m.a2, m.b1, m.b2];
  const mateOf = id => id === m.a1 ? m.a2 : id === m.a2 ? m.a1 : id === m.b1 ? m.b2 : m.b1;
  ids.forEach((id, k) => {
    if(!id) return;
    const p = P[id];
    const onA = k < 2;
    const w = (onA && m.winner === 'A') || (!onA && m.winner === 'B');
    const gf = onA ? m.score_a : m.score_b;
    const ga = onA ? m.score_b : m.score_a;
    const pos = [m.a1_pos, m.a2_pos, m.b1_pos, m.b2_pos][k];
    const exp = onA ? m.exp_a : 1 - m.exp_a;
    p.partien.push({win:w, gf, ga, pos, exp, ts:m.ts, tag:tagKey(m.ts),
                    monat:monatKey(m.ts), wk:wocheKey(m.ts),
                    // Der Wochentag gehoert zur Rohsicht wie der Spieltag: wer
                    // wann Zeit hat, waehlt niemand, und genau deshalb kann eine
                    // Frage darauf jedem zufallen.
                    wtag:new Date(m.ts).getDay(),
                    mate:mateOf(id), geg: onA ? [m.b1, m.b2] : [m.a1, m.a2]});
    p.games++; p.gf += gf; p.ga += ga; p.gd += gf - ga; p.expSum += exp;
    if(w) p.wins++;
  });
});
const grp = (p, feld) => { const o = {};
  p.partien.forEach(s => { const k = feld(s); if(k) (o[k] = o[k] || []).push(s); });
  return o; };
IDS.forEach(id => {
  const p = P[id];
  p.q = p.games ? p.wins / p.games : 0;
  p.expQ = p.games ? p.expSum / p.games : 0;
  p.tagGrp = grp(p, s => s.tag);
  p.monatGrp = grp(p, s => s.monat);
  p.wochGrp = grp(p, s => s.wk);
  p.wtagGrp = grp(p, s => 'w' + s.wtag);
  p.partnerGrp = grp(p, s => s.mate);
  p.gegnerGrp = (() => { const o = {};
    p.partien.forEach(s => s.geg.forEach(g => { if(g) (o[g] = o[g] || []).push(s); }));
    return o; })();
});

// Der Erste der Liga nach Siegquote. „Der Unbequeme" fragt nach den Duellen
// gegen ihn: EIN Gegner, dieselbe Zahl fuer alle, und wer ihn schlaegt, hat
// das unabhaengig von der eigenen Spielzahl getan.
// Die drei staerksten nach Siegquote. „Der Gipfelstuermer" fragt nach den
// Duellen gegen sie: derselbe Gegnerkreis fuer alle, und wer ihn schlaegt,
// hat das unabhaengig von der eigenen Spielzahl getan.
const LIGA_TOP3 = IDS.filter(id => P[id].games >= 30)
  .sort((a, b) => P[b].q - P[a].q).slice(0, 3);

const quote = a => a.length ? a.filter(s => s.win).length / a.length : 0;
const streu = a => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
const pct = v => Math.round(v * 100);
// Eine Dezimalzahl traegt hier ein Komma — die Oberflaeche der App schreibt
// „6,9 Gegentore", und ein Beleg dieser Seite ist derselbe Satz [§C27].
const komma = (v, n) => (Number(v) || 0).toFixed(n == null ? 1 : n).replace('.', ',');
const pp = v => (v >= 0 ? '+' : '') + Math.round(v * 100);

// `quelle` nennt die Monatschronik, deren Frage sie auf die Laufbahn hebt —
// derselbe Name, dasselbe Zeichen, nur die andere Zeitachse [§13.1]. `art`
// entscheidet das Prestige [§C34], `zufall` die Kammer [§C35]. Alle
// Kandidaten, deren Wert nicht mit der Siegquote laeuft, messen kein Koennen
// und stehen deshalb als Fuegung da: sie sollen jemandem gehoeren koennen,
// nicht jemanden auszeichnen.
// ── Die Suche ───────────────────────────────────────────────────────
// Statt einzelne Kandidaten zu erfinden, wird JEDE Kennzahl ueber JEDE
// Teilmenge gerechnet und durch dieselben Tore geschickt. Das ist der
// Unterschied zwischen einem Vorschlag und einer Suche: Die erste Runde hat
// achtzehn Fragen geraten und fuenf behalten; hier entstehen alle
// Kombinationen, und die Tore entscheiden.
//
// Jede Teilmenge nennt ihre Mindestzahl UND die Zahl der Partien, die eine
// Laufbahn dafuer braucht. Das ist das erste Tor: ein Rekord, der sechzig
// Partien fordert, gehoert dem Vielspieler, weil ihn ausser ihm niemand
// halten KANN. Gerechnet wird mit dem Bestand eines Spielers, der fuenfzig
// Partien hat — etwa zwanzig Siege, je fuenfundzwanzig Sturm- und
// Abwehrspiele, zwoelf bis vierzehn Spieltage, acht bis zwoelf Duelle gegen
// jeden anderen.
const TEIL = [
  {id:'alle',    n:'über die ganze Laufbahn', f:p => p.partien,                                  min:25, braucht:25},
  {id:'unter',   n:'als Außenseiter',         f:p => p.partien.filter(s => s.exp < 0.45),        min:15, braucht:30},
  {id:'favorit', n:'als Favorit',             f:p => p.partien.filter(s => s.exp > 0.55),        min:15, braucht:30},
  {id:'offen',   n:'auf Augenhöhe',           f:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55), min:12, braucht:35},
  {id:'sturm',   n:'im Sturm',                f:p => p.partien.filter(s => s.pos === 'atk'),     min:12, braucht:25},
  {id:'abwehr',  n:'in der Abwehr',           f:p => p.partien.filter(s => s.pos === 'def'),     min:12, braucht:25},
  {id:'nachP',   n:'nach einer Niederlage',   f:p => nach(p, false),                             min:15, braucht:30},
  {id:'nachS',   n:'nach einem Sieg',         f:p => nach(p, true),                              min:12, braucht:30},
  {id:'eng',     n:'in engen Partien',        f:p => p.partien.filter(s => Math.abs(s.gf - s.ga) <= 1), min:10, braucht:40},
  {id:'klar',    n:'in klaren Partien',       f:p => p.partien.filter(s => Math.abs(s.gf - s.ga) >= 5), min:10, braucht:30},
  {id:'top',     n:'gegen die besten drei',   f:p => p.partien.filter(s => s.geg.some(g => LIGA_TOP3.includes(g))), min:15, braucht:30},
  {id:'rest',    n:'gegen den Rest der Liga', f:p => p.partien.filter(s => !s.geg.some(g => LIGA_TOP3.includes(g))), min:15, braucht:30},
  {id:'auftakt', n:'in der ersten Partie eines Spieltags', f:p => tagPos(p, 'erste'),            min:10, braucht:30},
  {id:'schluss', n:'in der letzten Partie eines Spieltags', f:p => tagPos(p, 'letzte'),          min:10, braucht:30},
  {id:'langtag', n:'an langen Spieltagen',    f:p => [].concat(...Object.values(p.tagGrp).filter(a => a.length >= 5)), min:15, braucht:30},
  {id:'erste25', n:'in den ersten 25 Partien', f:p => p.partien.slice(0, 25),                    min:25, braucht:25},
  {id:'letzte25',n:'in den letzten 25 Partien', f:p => p.partien.slice(-25),                     min:25, braucht:25}
];

const MASS = [
  {id:'quote',  n:'Die Siegquote',              f:d => quote(d),
   ev:d => `${pct(quote(d))} % gewonnen`},
  {id:'abw',    n:'Der Abstand zur Rechnung',   f:d => abw(d),
   ev:d => `${pp(abw(d))} Punkte über der Rechnung, ${pct(quote(d))} % statt ${pct(erw(d))} %`},
  {id:'diff',   n:'Die Tordifferenz je Partie', f:d => summe(d, s => s.gf - s.ga) / d.length,
   ev:d => `${komma(summe(d, s => s.gf - s.ga) / d.length, 2)} Tore Differenz je Partie`},
  {id:'tore',   n:'Die eigenen Tore je Partie', f:d => summe(d, s => s.gf) / d.length,
   ev:d => `${komma(summe(d, s => s.gf) / d.length)} eigene Tore je Partie`},
  {id:'gegen',  n:'Die Gegentore je Partie',    f:d => -summe(d, s => s.ga) / d.length,
   ev:d => `${komma(summe(d, s => s.ga) / d.length)} Gegentore je Partie`},
  {id:'ruhe',   n:'Die Gleichmäßigkeit der Ergebnisse', f:d => -streu(d.map(s => s.gf - s.ga)),
   ev:d => `${komma(streu(d.map(s => s.gf - s.ga)))} Tore Streuung um `
         + `${summe(d, s => s.gf - s.ga) < 0 ? '−' : '+'}`
         + `${komma(Math.abs(summe(d, s => s.gf - s.ga) / d.length))} im Schnitt`},
  {id:'klarS',  n:'Der Anteil klarer Siege',    f:d => d.filter(s => s.win && s.gf - s.ga >= 5).length / d.length,
   ev:d => `${pct(d.filter(s => s.win && s.gf - s.ga >= 5).length / d.length)} % mit `
         + `5 Toren Vorsprung oder mehr, ${d.filter(s => s.win && s.gf - s.ga >= 5).length} von ${d.length}`},
  {id:'engS',   n:'Der Anteil knapper Siege',   f:d => d.filter(s => s.win && s.gf - s.ga === 1).length / d.length,
   ev:d => `${pct(d.filter(s => s.win && s.gf - s.ga === 1).length / d.length)} % mit einem Tor `
         + `Vorsprung, ${d.filter(s => s.win && s.gf - s.ga === 1).length} von ${d.length}`},
  {id:'anteil', n:'Der Torenteil',              f:d => { const g = summe(d, s => s.gf), a = summe(d, s => s.ga);
     return (g + a) ? g / (g + a) : 0; },
   ev:d => `${pct(summe(d, s => s.gf) / (summe(d, s => s.gf) + summe(d, s => s.ga)))} % aller Tore, `
         + `${summe(d, s => s.gf)}:${summe(d, s => s.ga)}`}
];

// ── Die Namenstafel ─────────────────────────────────────────────────
// Nur eine Kombination mit Namen kommt auf die Seite. Die uebrigen werden
// gerechnet und gezaehlt, aber nicht aufgeschrieben: eine Liste aus
// „Die Gegentore je Partie nach einem Sieg" ist eine Tabelle, kein Katalog.
// Ausgewaehlt ist, was keinen bestehenden Eintrag doppelt und was sich von
// den anderen Ausgewaehlten in Kennzahl UND Teilmenge unterscheidet.
const NAMEN = {
  // `konstanz` gibt es fuer einen Liga-Rekord nicht: §10.2 kennt nur
  // `leistung`, `ereignis` und `schatten`, und ein ungueltiger Wert faellt
  // still auf `ereignis`. Gleichmaessigkeit ist ausserdem kein Beleg fuer
  // Koennen — sie gehoert in die Kammer der Fuegungen [§C35], und dort
  // wiegt sie halb so viel. Das Tor „der Halter bleibt nicht unter seiner
  // Erwartung" sorgt dafuer, dass sie trotzdem keine Schattenseite ist.
  'ruhe|abwehr':   {name:'Der Unaufgeregte', art:'ereignis', zufall:'quote',
    frage:'Wer hält in der Abwehr die Ergebnisse am engsten zusammen?'},
  'ruhe|unter':    {name:'Der Gelassene', art:'ereignis', zufall:'quote',
    frage:'Wessen Ergebnisse schwanken als Außenseiter am wenigsten?'},
  'ruhe|auftakt':  {name:'Der Kaltstarter', art:'ereignis', zufall:'quote',
    frage:'Wer legt in der ersten Partie eines Spieltags immer dasselbe Ergebnis hin?'},
  'ruhe|sturm':    {name:'Der Kaltschnäuzige', art:'ereignis', zufall:'quote',
    frage:'Wessen Ergebnisse schwanken im Sturm am wenigsten?'},
  'engS|offen':    {name:'Der Nadelstecher', art:'leistung', zufall:'',
    frage:'Wer entscheidet die offenen Partien am häufigsten mit einem Tor?'},
  'engS|erste25':  {name:'Der Zitterauftakt', art:'ereignis', zufall:'quote',
    frage:'Wer hat seine ersten 25 Partien am häufigsten mit einem Tor gewonnen?'},
  'engS|langtag':  {name:'Der Zäheste', art:'leistung', zufall:'',
    frage:'Wer holt an langen Spieltagen die meisten knappen Siege?'},
  'engS|unter':    {name:'Der Stichler', art:'leistung', zufall:'',
    frage:'Wer gewinnt als Außenseiter am häufigsten mit genau einem Tor?'},
  'abw|schluss':   {name:'Der Schlussmann', art:'leistung', zufall:'',
    frage:'Wie weit über der Rechnung liegt die letzte Partie eines Spieltags?'},
  'abw|abwehr':    {name:'Der Abwehrchef', art:'leistung', zufall:'',
    frage:'Wie weit über der Rechnung liegt die Leistung in der Abwehr?'},
  'klarS|offen':   {name:'Der Überraschende', art:'leistung', zufall:'',
    frage:'Wer macht aus einer offenen Partie am häufigsten einen klaren Sieg?'},
  'klarS|letzte25':{name:'Die starke Phase', art:'leistung', zufall:'',
    frage:'Wer holt in den letzten 25 Partien die meisten klaren Siege?'},
  'gegen|letzte25':{name:'Die dichte Phase', art:'leistung', zufall:'',
    frage:'Wer lässt in den letzten 25 Partien am wenigsten zu?'},
  'gegen|favorit': {name:'Der Pflichterfüller', art:'leistung', zufall:'',
    frage:'Wer lässt als Favorit am wenigsten zu?'},
  'klarS|favorit': {name:'Der Erwartbare', art:'leistung', zufall:'',
    frage:'Wer macht die Favoritenrolle am häufigsten deutlich?'},
  'tore|abwehr':   {name:'Der Mitspieler', art:'leistung', zufall:'',
    frage:'Wer trifft aus der Abwehr heraus am häufigsten selbst?'}
};

// ── Werkzeug ────────────────────────────────────────────────────────
const summe = (a, f) => a.reduce((n, s) => n + f(s), 0);
const erw = a => a.length ? summe(a, s => s.exp) / a.length : 0;
// Der Abstand zur RECHNUNG, nicht zur eigenen Quote: gegen die eigene
// gerechnet dreht eine Abweichung die Rangliste um.
const abw = a => a.length ? quote(a) - erw(a) : 0;
function nach(p, win){
  const t = p.partien.slice().sort((a, b) => a.ts - b.ts), out = [];
  for(let i = 1; i < t.length; i++) if(t[i - 1].win === win) out.push(t[i]);
  return out;
}
function tagPos(p, w){
  return Object.values(p.tagGrp).filter(a => a.length >= 2).map(a => {
    const t = a.slice().sort((x, y) => x.ts - y.ts);
    return w === 'erste' ? t[0] : t[t.length - 1]; });
}

// ── Die Tore ────────────────────────────────────────────────────────
const korr = (a, b) => {
  const n = a.length; if(n < 3) return 0;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sa = 0, sb = 0, sab = 0;
  for(let i = 0; i < n; i++){ sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2;
    sab += (a[i] - ma) * (b[i] - mb); }
  return (sa && sb) ? sab / Math.sqrt(sa * sb) : 0;
};
// ── Haengt der Wert an der Spielzahl, wenn man das Koennen herausrechnet? ──
// Die rohe Korrelation zur Partienzahl taeuscht in dieser Liga: die
// schwaechsten Spieler spielen auch am wenigsten (Alex 39 Partien und 26 %,
// Anton 9 und 22 %), waehrend Jane mit 97 Partien auf Rang vier steht.
// Gemessen liegt die Korrelation zwischen Partienzahl und Siegquote bei
// +0,49. Damit laeuft JEDER Koennen-Rekord mit der Spielzahl mit, ohne von
// ihr zu haengen — und ein Tor auf die rohe Zahl wirft genau die Rekorde
// weg, die der Katalog braucht.
// Gefragt ist die Teilkorrelation: was bleibt von der Abhaengigkeit uebrig,
// wenn die Siegquote schon erklaert ist? Das ist die Frage, die §C39 mit
// „haengt nicht an der Spielzahl" meint.
function teilKorr(v, sp, q){
  const rvs = korr(v, sp), rvq = korr(v, q), rsq = korr(sp, q);
  const n = (1 - rvq * rvq) * (1 - rsq * rsq);
  return n <= 0 ? 0 : (rvs - rvq * rsq) / Math.sqrt(n);
}
const GEW = IDS.filter(id => P[id].games >= 30);
const QRANG = (() => { const l = GEW.slice().sort((a, b) => P[b].q - P[a].q);
  const o = {}; l.forEach((id, i) => { o[id] = i + 1; }); return {rang:o, n:l.length}; })();
const TOP3_LIGA = GEW.slice().sort((a, b) => P[b].q - P[a].q).slice(0, 3);

// Jede Kombination aus Kennzahl und Teilmenge, durch dieselben Tore.
const alleKomb = [];
TEIL.forEach(t => MASS.forEach(m => {
  const drin = GEW.filter(id => t.f(P[id]).length >= t.min);
  const werte = drin.map(id => ({id, v:m.f(t.f(P[id])), spiele:P[id].games,
      ev:m.ev(t.f(P[id])),
      // Der Abstand zur Erwartung in GENAU der Teilmenge, die der Rekord
      // misst. „Der Gelassene" gehoerte Alex mit 3,1 Toren Streuung um
      // −4,2 im Schnitt: gleichmaessig, weil er gleichmaessig verliert.
      // Ein Rekord, dessen Halter in der gemessenen Menge unter seiner
      // eigenen Erwartung bleibt, ist keine Leistung, sondern eine
      // Schattenseite im Positiven.
      // Gemessen wird gegen die ERWARTUNG und nicht gegen null: in der
      // Teilmenge „als Aussenseiter" ist die Tordifferenz bei jedem
      // negativ, und ein Tor darauf haette die ganze Teilmenge gestrichen —
      // samt dem Rekord fuer den, der als Aussenseiter trotzdem gewinnt.
      diff:abw(t.f(P[id]))}))
    .filter(x => isFinite(x.v)).sort((a, b) => b.v - a.v);
  if(werte.length < 3) return;
  const vs = werte.map(x => x.v);
  const mittel = vs.reduce((a, b) => a + b, 0) / vs.length;
  const sd = streu(vs);
  if(!sd) return;
  const halter = werte[0];
  const top3 = werte.slice(0, 3).map(x => x.id);
  const rein = teilKorr(vs, werte.map(x => x.spiele), werte.map(x => P[x.id].q));
  const nm = NAMEN[m.id + '|' + t.id] || null;
  alleKomb.push({
    key:m.id + '|' + t.id, name:nm ? nm.name : (m.n + ' ' + t.n),
    benannt:!!nm, frage:nm ? nm.frage : (m.n + ' ' + t.n + '?'),
    art:nm ? nm.art : 'leistung', zufall:nm ? nm.zufall : '',
    mass:m.n, teil:t.n, mindText:mindSatz(t),
    braucht:t.braucht,
    halter:name(halter.id), halterRang:QRANG.rang[halter.id],
    halterSpiele:halter.spiele, beleg:halter.ev, halterDiff:halter.diff,
    imRennen:werte.length, ligaGewertet:QRANG.n,
    ausschlag:(halter.v - mittel) / sd,
    korrSpiele:korr(vs, werte.map(x => x.spiele)),
    korrRein:rein,
    korrQuote:korr(vs, werte.map(x => P[x.id].q)),
    // Stehen auf dem Podest dieselben drei wie in der Rangliste? Eine
    // Korrelationsschwelle taugt dafuer nicht: ein Koennen-Rekord
    // korreliert mit der Siegquote, weil er Koennen MISST, und Rekorde
    // sind auch dazu da, zu zeigen, wer am meisten kann. Gefragt ist,
    // ob er das Feld umordnet oder die Rangliste wiederholt.
    kopie:top3.every(id => TOP3_LIGA.includes(id)),
    top3:top3.map(name), top3Liga:TOP3_LIGA.map(name),
    gleich:werte.filter(x => x.v === halter.v).length,
    // Wer im Rennen steht, hat wie viele Partien? Steht dort niemand mit
    // unter hundert, ist die Bedingung selbst eine Spielzahl-Huerde.
    kleinsteSpielzahl:Math.min(...werte.map(x => x.spiele)),
    rangfolge:werte.slice(0, 5).map(x => ({name:name(x.id), rang:QRANG.rang[x.id],
      wert:x.v, ev:x.ev, spiele:x.spiele}))
  });
}));
// ── Eine zweite Familie: die Differenz zweier Fenster ──────────────
// „Die Steigerung" verglich das letzte Drittel der Laufbahn mit dem ERSTEN.
// Das belohnt, wer schlecht angefangen hat: je tiefer der erste Abschnitt,
// desto leichter der Rekord. Zwei gleich lange Fenster, die beide
// mitwandern, fragen stattdessen nach der Form von jetzt — und der Rekord
// kann jedes halbe Jahr den Halter wechseln.
const DIFF = [
  {id:'auf25', name:'Der Aufschwung', art:'ereignis', zufall:'quote', braucht:50,
   frage:'Wie viel besser laufen die letzten 25 Partien als die 25 davor?',
   mindText:'ab 50 Partien',
   min:p => p.games >= 50,
   a:p => p.partien.slice(-25), b:p => p.partien.slice(-50, -25),
   mass:{id:'quote', n:'Die Siegquote', f:d => quote(d)},
   ev:p => `${pp(quote(p.partien.slice(-25)) - quote(p.partien.slice(-50, -25)))} Punkte: `
         + `${pct(quote(p.partien.slice(-25)))} % in den letzten 25, `
         + `${pct(quote(p.partien.slice(-50, -25)))} % in den 25 davor`},

  {id:'rollen', name:'Der Rollenlose', art:'konstanz', zufall:'', braucht:25,
   frage:'Bei wem ist es am gleichgültigsten, ob er vorne oder hinten steht?',
   mindText:'ab 12 Partien je Position',
   min:p => p.partien.filter(x => x.pos === 'atk').length >= 12
         && p.partien.filter(x => x.pos === 'def').length >= 12,
   a:p => p.partien.filter(x => x.pos === 'atk'), b:p => p.partien.filter(x => x.pos === 'def'),
   mass:{id:'abw', n:'Der Abstand zur Rechnung', f:d => abw(d)}, negBetrag:true,
   ev:p => `${pp(abw(p.partien.filter(x => x.pos === 'atk')))} Punkte über der Rechnung `
         + `vorne, ${pp(abw(p.partien.filter(x => x.pos === 'def')))} hinten`},

  {id:'lage', name:'Der Unbeeindruckte', art:'konstanz', zufall:'', braucht:30,
   frage:'Bei wem ist es am gleichgültigsten, ob er Favorit oder Außenseiter ist?',
   mindText:'ab 15 Partien in jeder Lage',
   min:p => p.partien.filter(x => x.exp > 0.55).length >= 15
         && p.partien.filter(x => x.exp < 0.45).length >= 15,
   a:p => p.partien.filter(x => x.exp > 0.55), b:p => p.partien.filter(x => x.exp < 0.45),
   mass:{id:'abw', n:'Der Abstand zur Rechnung', f:d => abw(d)}, negBetrag:true,
   ev:p => `${pp(abw(p.partien.filter(x => x.exp > 0.55)))} Punkte über der Rechnung als `
         + `Favorit, ${pp(abw(p.partien.filter(x => x.exp < 0.45)))} als Außenseiter`}
];
DIFF.forEach(d => {
  const drin = GEW.filter(id => d.min(P[id]));
  const werte = drin.map(id => {
    const roh = d.mass.f(d.a(P[id])) - d.mass.f(d.b(P[id]));
    const men = d.a(P[id]).concat(d.b(P[id]));
    return {id, v:d.negBetrag ? -Math.abs(roh) : roh, spiele:P[id].games, ev:d.ev(P[id]),
      diff:abw(men)};
  }).filter(x => isFinite(x.v)).sort((a, b) => b.v - a.v);
  if(werte.length < 3) return;
  const vs = werte.map(x => x.v);
  const mittel = vs.reduce((a, b) => a + b, 0) / vs.length, sd = streu(vs);
  if(!sd) return;
  const h = werte[0], top3 = werte.slice(0, 3).map(x => x.id);
  alleKomb.push({
    key:'diff|' + d.id, name:d.name, benannt:true, frage:d.frage,
    art:d.art, zufall:d.zufall, mass:d.mass.n, teil:'zwei Fenster im Vergleich',
    mindText:d.mindText, braucht:d.braucht,
    halter:name(h.id), halterRang:QRANG.rang[h.id], halterSpiele:h.spiele, beleg:h.ev,
    halterDiff:h.diff,
    imRennen:werte.length, ligaGewertet:QRANG.n,
    ausschlag:(h.v - mittel) / sd,
    korrSpiele:korr(vs, werte.map(x => x.spiele)),
    korrRein:teilKorr(vs, werte.map(x => x.spiele), werte.map(x => P[x.id].q)),
    korrQuote:korr(vs, werte.map(x => P[x.id].q)),
    kopie:top3.every(id => TOP3_LIGA.includes(id)),
    top3:top3.map(name), top3Liga:TOP3_LIGA.map(name),
    gleich:werte.filter(x => x.v === h.v).length,
    kleinsteSpielzahl:Math.min(...werte.map(x => x.spiele)),
    rangfolge:werte.slice(0, 5).map(x => ({name:name(x.id), rang:QRANG.rang[x.id],
      wert:x.v, ev:x.ev, spiele:x.spiele}))
  });
});

function mindSatz(t){
  return t.id === 'alle' ? 'ab 25 Partien'
    : t.id === 'erste25' || t.id === 'letzte25' ? 'ab 25 Partien'
    : `ab ${t.min} Partien ${t.n}`;
}

const TORE_PRUEF = e => [
  e.braucht <= 50,
  e.kleinsteSpielzahl <= 100,
  e.korrRein <= 0.35,
  e.korrRein >= -0.70,
  !e.kopie,
  e.ausschlag >= 1.5,
  e.imRennen * 2 >= e.ligaGewertet,
  e.gleich * 3 <= e.imRennen,
  e.halterDiff >= 0
];
alleKomb.forEach(e => { e.durch = TORE_PRUEF(e).every(Boolean); });
const ergebnis = alleKomb.filter(e => e.durch && e.benannt)
  .sort((a, b) => b.ausschlag - a.ausschlag);

// ── Was es fuer die Laufbahn bedeutet ───────────────────────────────
// Der Prestige-Stand kommt aus der App, nicht aus einer zweiten Rechnung:
// `dist/index.html` wird geladen und `prestigeTabelle` gefragt [§C27].
const laufbahn = (() => {
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
    static now(){ return FIXED; }
  };
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
  const ch = () => new Proxy(function(){}, {get(_, pp2){return pp2 === 'then' ? undefined : ch()},
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
    const T = prestigeTabelle();
    // ── Wie knapp stehen die Verfolger? ──────────────────────────────
    // Ein Rekord, dessen Zweiter ein Prozent dahinter liegt, ist der
    // spannendste im Katalog — und der einzige, von dem man weiss, dass er
    // erreichbar ist. Gerechnet wird der relative Abstand, weil die
    // Einheiten von Prozenten bis Elo-Punkten reichen.
    const A = allChronicles();
    const spiele = {}; players.forEach(p => { spiele[p.id] =
      matches.filter(m => m.a1===p.id||m.a2===p.id||m.b1===p.id||m.b2===p.id).length; });
    const knapp = CHRONICLES.map(c => {
      const r = (typeof chronicleRang === 'function') ? chronicleRang(c.id) : [];
      if(!r || r.length < 2) return null;
      const a = r[0].wert, b = r[1].wert;
      if(a == null || b == null || !isFinite(a) || !isFinite(b)) return null;
      const rel = a === 0 ? 0 : Math.abs((a - b) / Math.abs(a));
      const e = A.byId[c.id];
      return { id:c.id, name:c.name, kind:c.kind, neg:!!c.neg, cond:c.cond || '',
        halter:e ? e.pids.map(x => pmap()[x].name) : [],
        halterSpiele:e ? e.pids.map(x => spiele[x]) : [],
        zweiter:(pmap()[r[1].pid]||{}).name, zweiterSpiele:spiele[r[1].pid],
        belegA:r[0].ev, belegB:r[1].ev, abstand:rel,
        geteilt:e ? e.pids.length : 0 };
    }).filter(Boolean).sort((x, y) => x.abstand - y.abstand);
    // ── Und welche Bedingung sperrt einen 50-Spieler aus? ────────────
    // Aus der Bedingung gelesen, nicht geraten: jede Mindestzahl steht im
    // Klartext im Katalog. Umgerechnet auf den Bestand eines Spielers mit
    // fuenfzig Partien und vierzig Prozent Siegquote.
    const HAT = {Spielen:50, Partien:50, Siegen:20, Niederlagen:30,
      Sturmspielen:25, Abwehrspielen:25, Gelegenheiten:35, Spieltagen:13,
      Wochen:10};
    const huerde = CHRONICLES.map(c => {
      const m = /ab (\\d+)\\s+([A-Za-zÄÖÜäöüß]+)/.exec(c.cond || '');
      if(!m) return null;
      const n = +m[1], einheit = m[2];
      const hat = HAT[einheit];
      if(hat == null) return null;
      return { name:c.name, cond:c.cond, n, einheit, hat, zu:n > hat };
    }).filter(Boolean);
    const je = players.map(p => { const Q = prestigeOf(p.id);
      return {name:p.name, punkte:Math.round(Q.punkte), stufe:Q.stufe,
        stufeName:(INSIGNIEN[Q.stufe]||{}).name,
        fehlt:Q.naechste ? Math.round(Q.naechste.min - Q.punkte) : null,
        ziel:Q.naechste ? (INSIGNIEN[Q.stufe+1]||{}).name : '',
        rekord:Math.round(((T.byPid[p.id]||{}).teile||{}).rekord||0)};
    }).sort((a,b)=>b.punkte-a.punkte);
    let monat=0, rekord=0;
    Object.keys(T.byPid).forEach(pid => { const t = T.byPid[pid].teile||{};
      monat += t.monat||0; rekord += t.rekord||0; });
    // Welche Namen der Katalog als Monatschronik fuehrt und welche als
    // Liga-Rekord. Die Seite schrieb „Monatschronik ‚Der Wiedergaenger'"
    // ueber einen Eintrag, den es nur als Liga-Rekord gibt — die Herkunft
    // gehoert gelesen, nicht geraten.
    const herkunft = {};
    DISZIPLINEN.forEach(d => { herkunft[d.name] =
      (d.monat ? 'chronik' : '') + (d.allzeit ? (d.monat ? '+rekord' : 'rekord') : ''); });
    return {knapp, huerde, je, monat:Math.round(monat), rekord:Math.round(rekord),
      rekorde:CHRONICLES.length, wertRekord:PRESTIGE_REKORD,
      artGewicht:PRESTIGE_ART, herkunft,
      insignien:INSIGNIEN.map(x=>({name:x.name, min:x.min}))};
  })())`));
})();

// ── Nur die drei Arten, die es gibt ─────────────────────────────────
// §10.2 kennt `leistung`, `ereignis` und `schatten`. Ein anderer Wert faellt
// still auf `ereignis` und wiegt die Haelfte — und niemand sieht es. Zwei
// Vorschlaege standen hier als `konstanz`, was nur fuer eine Monatschronik
// gueltig ist [§C39].
(() => {
  const gueltig = new Set(Object.keys(laufbahn.artGewicht));
  const falsch = ergebnis.filter(e => !gueltig.has(e.art)).map(e => e.name + ' (' + e.art + ')');
  if(falsch.length){
    console.error('Ungueltige art: ' + falsch.join(', ')
      + ' — gueltig sind ' + [...gueltig].join(', '));
    process.exit(1);
  }
})();

// ── Kein Name zweimal ───────────────────────────────────────────────
// „Der Ausdauernde" und „Der Deutliche" waren schon vergeben: der erste als
// Beiname von „Der Endspurt", der zweite als eigene Monatschronik. Ein
// Katalog mit zwei Eintraegen desselben Namens ist im Profil nicht mehr
// auseinanderzuhalten. Gelesen wird aus dem Katalog der App, nicht geraten.
(() => {
  const kat = fs.readFileSync(ROOT + '/src/js/32-chronik-katalog.js', 'utf8');
  const belegt = new Set();
  [...kat.matchAll(/name:'([^']+)'/g)].forEach(m => belegt.add(m[1]));
  [...kat.matchAll(/beiname:'([^']+)'/g)].forEach(m => belegt.add(m[1]));
  const doppelt = ergebnis.filter(e => belegt.has(e.name)).map(e => e.name);
  const eigen = {};
  ergebnis.forEach(e => { eigen[e.name] = (eigen[e.name] || 0) + 1; });
  const intern = Object.keys(eigen).filter(k => eigen[k] > 1);
  if(doppelt.length || intern.length){
    console.error('Name schon vergeben: ' + doppelt.concat(intern).join(', '));
    process.exit(1);
  }
})();

const aus = {
  gebaut:new Date().toISOString().slice(0, 16).replace('T', ' '),
  laufbahn,
  partien:MS.length, spieler:QRANG.n,
  // Der Grund, warum die rohe Korrelation nicht taugt, als Zahl.
  korrSpielzahlQuote: korr(GEW.map(id => P[id].games), GEW.map(id => P[id].q)),
  kombinationen:alleKomb.length,
  bestanden:alleKomb.filter(e => e.durch).length,
  benannt:ergebnis.length,
  top3Liga:TOP3_LIGA.map(name),
  spielzahlen:GEW.sort((a, b) => P[b].games - P[a].games)
    .map(id => ({name:name(id), spiele:P[id].games, quote:pct(P[id].q),
      erwartet:pct(P[id].expQ), rang:QRANG.rang[id],
      tage:Object.keys(P[id].tagGrp).length})),
  kandidaten:ergebnis
};
fs.writeFileSync(__dirname + '/.rekord-vorschlag.json', JSON.stringify(aus, null, 1));
console.log('Gewertete Spieler: ' + QRANG.n + ' · Rangliste: ' + TOP3_LIGA.map(name).join(', '));
console.log('  ' + alleKomb.length + ' Kombinationen, ' + aus.bestanden
  + ' bestehen alle Tore, ' + ergebnis.length + ' davon benannt');
ergebnis.forEach(e => console.log('  %s  %s (R%d, %d Partien)  aus %s  rein %s  rQ %s  braucht %d',
  e.name.padEnd(22), e.halter.padEnd(9), e.halterRang, e.halterSpiele,
  e.ausschlag.toFixed(2), e.korrRein.toFixed(2), e.korrQuote.toFixed(2), e.braucht));

// Der Bericht steht. Die Zeitgeber der App laufen weiter und rufen `loadAll`
// gegen eine Attrappe von Supabase; deren Fehler landet in einem Handler, der
// `esc` auf ein Proxy-Objekt wirft. Das hat mit dem Lauf nichts zu tun.
process.exit(0);
