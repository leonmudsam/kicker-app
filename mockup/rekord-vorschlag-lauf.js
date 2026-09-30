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
  {id:'alle',    n:'über die ganze Laufbahn', f:p => p.partien,                                  min:25, braucht:25, minHoch:70, brauchtHoch:70},
  {id:'unter',   n:'als Außenseiter',         f:p => p.partien.filter(s => s.exp < 0.45),        min:15, braucht:30, minHoch:40, brauchtHoch:80},
  {id:'favorit', n:'als Favorit',             f:p => p.partien.filter(s => s.exp > 0.55),        min:15, braucht:30, minHoch:40, brauchtHoch:80},
  {id:'offen',   n:'auf Augenhöhe',           f:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55), min:10, braucht:35, minHoch:30, brauchtHoch:85},
  {id:'sturm',   n:'im Sturm',                f:p => p.partien.filter(s => s.pos === 'atk'),     min:10, braucht:25, minHoch:40, brauchtHoch:80},
  {id:'abwehr',  n:'in der Abwehr',           f:p => p.partien.filter(s => s.pos === 'def'),     min:10, braucht:25, minHoch:40, brauchtHoch:80},
  {id:'nachP',   n:'nach einer Niederlage',   f:p => nach(p, false),                             min:15, braucht:30, minHoch:40, brauchtHoch:80},
  {id:'nachS',   n:'nach einem Sieg',         f:p => nach(p, true),                              min:10, braucht:30, minHoch:35, brauchtHoch:80},
  {id:'eng',     n:'in engen Partien',        f:p => p.partien.filter(s => Math.abs(s.gf - s.ga) <= 1), min:10, braucht:40, minHoch:25, brauchtHoch:100},
  {id:'klar',    n:'in klaren Partien',       f:p => p.partien.filter(s => Math.abs(s.gf - s.ga) >= 5), min:10, braucht:30, minHoch:30, brauchtHoch:90},
  {id:'top',     n:'gegen die besten drei',   f:p => p.partien.filter(s => s.geg.some(g => LIGA_TOP3.includes(g))), min:15, braucht:30, minHoch:40, brauchtHoch:80},
  {id:'rest',    n:'gegen den Rest der Liga', f:p => p.partien.filter(s => !s.geg.some(g => LIGA_TOP3.includes(g))), min:15, braucht:30, minHoch:40, brauchtHoch:80},
  {id:'auftakt', n:'in der ersten Partie eines Spieltags', f:p => tagPos(p, 'erste'),            min:10, braucht:30, minHoch:25, brauchtHoch:75},
  {id:'schluss', n:'in der letzten Partie eines Spieltags', f:p => tagPos(p, 'letzte'),          min:10, braucht:30, minHoch:25, brauchtHoch:75},
  {id:'langtag', n:'an langen Spieltagen',    f:p => [].concat(...Object.values(p.tagGrp).filter(a => a.length >= 5)), min:15, braucht:30, minHoch:40, brauchtHoch:80},
  // ── Eine Teilmenge muss mitwandern ───────────────────────────────
  // „In den ersten 25 Partien" stand hier und ist gefallen: der Abschnitt
  // ist nach 25 Partien fertig und aendert sich nie wieder. Ein Rekord
  // darauf kann den Halter nicht mehr wechseln — er waere ab dem Tag seiner
  // Vergabe ein Eintrag im Museum. Dasselbe gilt fuer jede Teilmenge, die am
  // ANFANG einer Laufbahn verankert ist.
  {id:'letzte30',n:'in den letzten 30 Partien', f:p => p.partien.slice(-30),                     min:30, braucht:30}
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
  // ── OFFEN: die Bedingung ist mit 50 Partien erfuellbar ───────────
  'klarS|letzte30|offen': {name:'Die starke Phase', art:'leistung', zufall:'',
    frage:'Wer holt in den letzten 30 Partien die meisten klaren Siege?'},
  'gegen|letzte30|offen': {name:'Die dichte Phase', art:'leistung', zufall:'',
    frage:'Wer lässt in den letzten 30 Partien am wenigsten zu?'},
  'diff|auf25': {name:'Der Aufschwung', art:'leistung', zufall:'',
    frage:'Wer hat sich von den 25 Partien davor zu den letzten 25 am meisten gesteigert?'},
  'quote|schluss|offen': {name:'Der Schlussmann', art:'leistung', zufall:'',
    frage:'Wer gewinnt die letzte Partie eines Spieltags am häufigsten?'},
  'tore|unter|offen': {name:'Der Angreifer', art:'leistung', zufall:'',
    frage:'Wer trifft als Außenseiter am häufigsten selbst?'},
  'gegen|favorit|offen': {name:'Der Pflichterfüller', art:'leistung', zufall:'',
    frage:'Wer lässt als Favorit am wenigsten zu?'},
  'klarS|favorit|offen': {name:'Der Souverän', art:'leistung', zufall:'',
    frage:'Wer gewinnt als Favorit am häufigsten klar?'},

  // ── ANSPRUCH: eine hoehere Schwelle ist erlaubt ──────────────────
  // Hier darf ein Rekord verlangen, dass jemand die Frage ueber eine lange
  // Strecke beantwortet hat. Alle anderen Tore gelten unveraendert.
  'abw|abwehr|anspruch': {name:'Der Abwehrchef', art:'leistung', zufall:'',
    frage:'Wie weit über der Rechnung liegt die Leistung in der Abwehr?'},
  'tore|abwehr|anspruch': {name:'Der Mitspieler', art:'leistung', zufall:'',
    frage:'Wer trifft über achtzig Partien aus der Abwehr heraus am häufigsten selbst?'},
  'anteil|rest|anspruch': {name:'Der Hausherr', art:'leistung', zufall:'',
    frage:'Wer holt gegen den Rest der Liga den größten Anteil aller Tore?'},
  // `konstanz` gibt es fuer einen Liga-Rekord nicht: §10.2 kennt nur
  // `leistung`, `ereignis` und `schatten`, und ein ungueltiger Wert faellt
  // still auf `ereignis`. Gleichmaessigkeit ist ausserdem kein Beleg fuer
  // Koennen — sie gehoert in die Kammer der Fuegungen [§C35].
  'ruhe|sturm|anspruch': {name:'Die Handschrift', art:'ereignis', zufall:'quote',
    frage:'Wessen Ergebnisse im Sturm schwanken über achtzig Partien am wenigsten?'},
  'ruhe|rest|anspruch': {name:'Der Unaufgeregte', art:'ereignis', zufall:'quote',
    frage:'Wessen Ergebnisse gegen den Rest der Liga schwanken am wenigsten?'},

  // ── Gestrichen, mit Grund ────────────────────────────────────────
  // DREI Rekorde auf „knappe Siege" (auf Augenhoehe, an langen Spieltagen,
  // als Aussenseiter) sind ganz gefallen, und nicht nur wegen der Haeufung:
  // „Das Sonntagskind" misst im Katalog schon den Anteil gewonnener
  // Ein-Tor-Spiele und „Der Nervenkitzler" den Anteil der 10:9-Siege. Eine
  // vierte Fassung derselben Frage sammelt sich beim selben Halter — genau
  // das verbietet §C35. Von den sieben Rekorden, die Jane hielt, waren drei
  // davon.
  // VIER Rekorde auf „Gleichmaessigkeit" (in der Abwehr, im Tagesauftakt,
  // gegen den Rest, als Favorit) sind zwei geworden. Drei Teilmengen
  // derselben Kennzahl sind dieselbe Aussage in drei Ausschnitten.
  // Und DREI Rekorde in der Abwehr sind zwei: der Abstand zur Rechnung und
  // die eigenen Tore. Die Gleichmaessigkeit dort ist im Sturm-Rekord
  // aufgegangen.
  // „Die Wiedergutmachung" (klare Siege nach einer Pleite), „Der Trotzkopf"
  // (Siegquote als Aussenseiter) und „Der Wortgetreue" (Gleichmaessigkeit
  // als Favorit) sind gefallen, damit kein Spieler mehr als ein Drittel der
  // Tafel haelt: mit ihnen stand Martin bei sieben von dreizehn, und eine
  // Tafel, die zur Haelfte einem gehoert, ist seine Bestenliste.
};



// ── Werkzeug ────────────────────────────────────────────────────────
// ── Jede Schwelle steht auf einem 5er-Raster ───────────────────────
// Eine Bedingung ist eine Absprache und keine Messung: „ab 22 Siegen" sieht
// aus wie das Ergebnis einer Rechnung, und das ist sie auch — sie stammt aus
// einer Kalibrierung. Gelesen wird sie aber als Regel, und eine Regel mit
// einer krummen Zahl liest sich wie ein Versehen. Gerundet wird auf das
// naechste Vielfache von fuenf; was darunter liegt, auf zweieinhalb, damit
// aus einer kleinen Schwelle nicht null wird.
// Die MESSWERTE bleiben unberuehrt: ein Beleg nennt den Wert, nach dem
// sortiert wird [§10.2], und zwei auf dasselbe Vielfache gerundete Werte
// haetten keine Reihenfolge mehr.
function raster(v){
  const n = Math.round(v / 5) * 5;
  return n === 0 ? Math.round(v * 2) / 2 * (Math.abs(v) >= 1.25 ? 2 : 1) || 2.5 : n;
}
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

// ── Zwei Kammern ────────────────────────────────────────────────────
// Nicht jeder Rekord muss mit fuenfzig Partien erreichbar sein. Ein Rekord
// ist auch dazu da, Koennen zu belohnen, und eine hoehere Schwelle ist dafuer
// legitim: wer sie haelt, hat sie ueber eine lange Strecke gehalten.
//
// Die Schwelle ist deshalb keine Bedingung, sondern eine **Kammer**:
//   OFFEN    — die Bedingung ist mit 50 Partien erfuellbar. Der Rekord fuer
//              jeden, und gemessen gehoert er meistens dem, der wenig spielt
//              und gut ist.
//   ANSPRUCH — eine hoehere Schwelle ist erlaubt. Dafuer muss der Rekord
//              etwas messen, das die Rangliste nicht schon sagt, und sein
//              Wert darf trotzdem keine Ansammlung sein: eine Rate, keine
//              Anzahl. Sonst haelt ihn wieder, wer am meisten spielt.
//
// Was in BEIDEN Kammern gilt: der Wert haengt nicht an der Spielzahl (mit
// herausgerechnetem Koennen), das Podest ist nicht das der Rangliste, die
// Bestmarke schlaegt weit aus und ist nicht geschenkt, und ihr Halter bleibt
// in der gemessenen Menge nicht unter seiner eigenen Erwartung.
// Was sich unterscheidet: in der offenen Kammer muss jemand mit unter
// hundert Partien im Rennen stehen und die halbe Liga die Bedingung
// erfuellen; in der anspruchsvollen genuegt ein Drittel — sonst waere die
// Kammer durch ihre eigene Definition leer.
const KAMMERN = [
  {id:'offen',    name:'offen',    min:t => t.min,     braucht:t => t.braucht},
  {id:'anspruch', name:'Anspruch', min:t => t.minHoch, braucht:t => t.brauchtHoch}
];

// Jede Kombination aus Kennzahl, Teilmenge und Kammer.
const alleKomb = [];
KAMMERN.forEach(kam => TEIL.forEach(t => MASS.forEach(m => {
  const schwelle = kam.min(t);
  if(schwelle == null) return;
  const drin = GEW.filter(id => t.f(P[id]).length >= schwelle);
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
  const nm = NAMEN[m.id + '|' + t.id + '|' + kam.id] || null;
  alleKomb.push({
    kammer:kam.id, kammerName:kam.name,
    key:m.id + '|' + t.id + '|' + kam.id, name:nm ? nm.name : (m.n + ' ' + t.n),
    benannt:!!nm, frage:nm ? nm.frage : (m.n + ' ' + t.n + '?'),
    art:nm ? nm.art : 'leistung', zufall:nm ? nm.zufall : '',
    mass:m.n, teil:t.n, mindText:mindSatz(t, schwelle),
    braucht:kam.braucht(t), schwelle,
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
})));
// ── Eine zweite Familie: die Differenz zweier Fenster ──────────────
// „Die Steigerung" verglich das letzte Drittel der Laufbahn mit dem ERSTEN.
// Das belohnt, wer schlecht angefangen hat: je tiefer der erste Abschnitt,
// desto leichter der Rekord. Zwei gleich lange Fenster, die beide
// mitwandern, fragen stattdessen nach der Form von jetzt — und der Rekord
// kann jedes halbe Jahr den Halter wechseln.
const DIFF = [
  {id:'auf25', braucht:50,
   mindText:'ab 50 Partien',
   min:p => p.games >= 50,
   a:p => p.partien.slice(-25), b:p => p.partien.slice(-50, -25),
   mass:{id:'quote', n:'Die Siegquote', f:d => quote(d)},
   ev:p => `${pp(quote(p.partien.slice(-25)) - quote(p.partien.slice(-50, -25)))} Punkte: `
         + `${pct(quote(p.partien.slice(-25)))} % in den letzten 25, `
         + `${pct(quote(p.partien.slice(-50, -25)))} % in den 25 davor`},

  {id:'rollen', braucht:25,
   mindText:'ab 10 Partien je Position',
   min:p => p.partien.filter(x => x.pos === 'atk').length >= 10
         && p.partien.filter(x => x.pos === 'def').length >= 10,
   a:p => p.partien.filter(x => x.pos === 'atk'), b:p => p.partien.filter(x => x.pos === 'def'),
   mass:{id:'abw', n:'Der Abstand zur Rechnung', f:d => abw(d)}, negBetrag:true,
   ev:p => `${pp(abw(p.partien.filter(x => x.pos === 'atk')))} Punkte über der Rechnung `
         + `vorne, ${pp(abw(p.partien.filter(x => x.pos === 'def')))} hinten`},

  {id:'lage', braucht:30,
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
  // Name, Art und Frage stehen auch hier in NAMEN und nicht am Eintrag.
  // Beides zu fuehren hiess, dass „Der Aufschwung" in NAMEN als `leistung`
  // stand und auf der Seite als FUEGUNG — die Familie gewann still, und
  // niemand sah die zweite Angabe [§C27].
  const nm = NAMEN['diff|' + d.id];
  alleKomb.push({
    kammer:'offen', kammerName:'offen',
    key:'diff|' + d.id, name:nm ? nm.name : d.id, benannt:!!nm,
    frage:nm ? nm.frage : '',
    art:nm ? nm.art : 'leistung', zufall:nm ? nm.zufall : '',
    mass:d.mass.n, teil:'zwei Fenster im Vergleich',
    mindText:d.mindText, braucht:d.braucht, schwelle:d.braucht,
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

function mindSatz(t, schwelle){
  return (t.id === 'alle' || t.id === 'erste25' || t.id === 'letzte30')
    ? `ab ${schwelle} Partien`
    : `ab ${schwelle} Partien ${t.n}`;
}

const TORE_PRUEF = e => [
  // Die Kammer wird nicht geprueft, sie wird zugeteilt: `braucht` entscheidet,
  // in welche der Eintrag gehoert.
  e.kammer === 'offen' ? e.braucht <= 50 : e.braucht > 50,
  // In der offenen Kammer muss jemand mit unter hundert Partien im Rennen
  // stehen — sonst ist die Bedingung selbst die Huerde, auch wenn die Zahl
  // klein aussieht. In der anspruchsvollen ist gerade das der Punkt.
  e.kammer === 'offen' ? e.kleinsteSpielzahl <= 100 : true,
  e.korrRein <= 0.35,
  e.korrRein >= -0.70,
  !e.kopie,
  e.ausschlag >= 1.5,
  // Die halbe Liga in der offenen Kammer, ein Drittel in der anspruchsvollen:
  // eine hohe Schwelle schliesst per Definition Leute aus, und ein Tor auf
  // die Haelfte haette die Kammer leer gelassen.
  e.kammer === 'offen' ? e.imRennen * 2 >= e.ligaGewertet
                       : e.imRennen * 3 >= e.ligaGewertet,
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
    // ── Welche Schwelle des Katalogs steht krumm? ───────────────────
    // Dieselbe Regel wie fuer den Vorschlag: eine Bedingung ist eine
    // Absprache, und eine Regel mit einer krummen Zahl liest sich wie ein
    // Versehen. Gelesen aus dem Klartext der Bedingung.
    const krumm = [];
    CHRONICLES.forEach(c => {
      const zahlen = [...(c.cond || '').matchAll(
        /(−?\\d+(?:[.,]\\d+)?)\\s*(%|Siegen|Spielen|Partien|Niederlagen|Sturmspielen|Abwehrspielen|Gelegenheiten|Spieltagen|Wochen|solchen)/g)];
      zahlen.forEach(z => {
        const v = parseFloat(String(z[1]).replace('−', '-').replace(',', '.'));
        const r = Math.round(v / 5) * 5;
        if(v !== r) krumm.push({name:c.name, roh:z[0],
          soll:(r === 0 ? Math.round(v * 2) / 2 : r) + ' ' + z[2]});
      });
    });
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
    return {knapp, huerde, krumm, je, monat:Math.round(monat), rekord:Math.round(rekord),
      rekorde:CHRONICLES.length, wertRekord:PRESTIGE_REKORD,
      artGewicht:PRESTIGE_ART, herkunft,
      insignien:INSIGNIEN.map(x=>({name:x.name, min:x.min}))};
  })())`));
})();

// ── Hoechstens zwei je Kennzahl und je Teilmenge ────────────────────
// Vier Rekorde auf „Gleichmaessigkeit" und drei auf „knappe Siege" sind
// dieselbe Aussage in verschiedenen Ausschnitten, und sie sammeln sich beim
// selben Halter: von den sieben gehoerten sieben Jane. Eine Kennzahl darf
// deshalb hoechstens zweimal vorkommen und eine Teilmenge auch — sonst ist
// der Katalog eine Tabelle ueber eine Frage und kein Katalog.
(() => {
  const jeMass = {}, jeTeil = {};
  ergebnis.forEach(e => {
    const [m, t] = e.key.split('|');
    jeMass[m] = (jeMass[m] || 0) + 1;
    jeTeil[t] = (jeTeil[t] || 0) + 1;
  });
  const zuViel = Object.keys(jeMass).filter(k => jeMass[k] > 2).map(k => 'Kennzahl ' + k + ': ' + jeMass[k])
    .concat(Object.keys(jeTeil).filter(k => jeTeil[k] > 2).map(k => 'Teilmenge ' + k + ': ' + jeTeil[k]));
  if(zuViel.length){
    console.error('Mehr als zwei Rekorde auf derselben Frage: ' + zuViel.join(', '));
    process.exit(1);
  }
})();

// ── Kein Halter traegt mehr als ein Drittel der Tafel ───────────────
// Die Haeufung auf einer Frage war nur die halbe Ursache. Nachdem sieben
// Rekorde auf „knappe Siege" und „Gleichmaessigkeit" gefallen waren, hielt
// Martin sieben der dreizehn uebrigen: dieselbe Tafel, ein anderer Name
// darauf. Gemessen wird deshalb der Halter selbst — wer mehr als ein Drittel
// traegt, macht aus dem Katalog seine Bestenliste. Der Anteil ist streng,
// weil die Suche ueberhaupt nur fuenf verschiedene Halter hergibt.
(() => {
  const je = {};
  ergebnis.forEach(e => { je[e.halter] = (je[e.halter] || 0) + 1; });
  const zuViel = Object.keys(je).filter(k => je[k] * 3 > ergebnis.length)
    .map(k => k + ': ' + je[k] + ' von ' + ergebnis.length);
  if(zuViel.length){
    console.error('Ein Halter traegt mehr als ein Drittel der Tafel: ' + zuViel.join(', '));
    process.exit(1);
  }
})();

// ── Kein toter Name in der Tafel ────────────────────────────────────
// Ein Eintrag in NAMEN, den keine Kombination trifft, ist ein Name fuer
// einen Rekord, den es nicht gibt — und beim naechsten Lesen sucht jemand
// danach. „Der Zitterlauf" stand hier, nachdem seine Kombination ein Tor
// gerissen hatte.
(() => {
  const getroffen = new Set(alleKomb.filter(e => e.benannt && e.durch).map(e => e.key));
  const tot = Object.keys(NAMEN).filter(k => !getroffen.has(k));
  if(tot.length){
    console.error('Name ohne Rekord: ' + tot.map(k => NAMEN[k].name + ' (' + k + ')').join(', '));
    process.exit(1);
  }
})();

// ── Jede Teilmenge wandert mit ──────────────────────────────────────
// Eine Teilmenge, die am ANFANG einer Laufbahn verankert ist, aendert sich
// nach ihrer Fuellung nie wieder: „in den ersten 25 Partien" ist fertig,
// sobald jemand 25 Partien hat, und ein Rekord darauf kann den Halter nicht
// mehr wechseln. Gepruefet wird es an den Daten und nicht am Namen: liefert
// die Teilmenge fuer jeden Spieler dasselbe wie vor zwanzig Partien, ist sie
// eingefroren.
(() => {
  const eingefroren = [];
  TEIL.forEach(t => {
    const jetzt = GEW.map(id => t.f(P[id]).map(x => x.ts).join(','));
    const frueher = GEW.map(id => {
      const kopie = {...P[id], partien:P[id].partien.slice(0, -20)};
      kopie.tagGrp = {};
      kopie.partien.forEach(x => (kopie.tagGrp[x.tag] = kopie.tagGrp[x.tag] || []).push(x));
      return t.f(kopie).map(x => x.ts).join(',');
    });
    if(jetzt.every((v, i) => v === frueher[i] && v !== '')) eingefroren.push(t.id);
  });
  if(eingefroren.length){
    console.error('Teilmenge ist eingefroren, der Rekord koennte den Halter nie wechseln: '
      + eingefroren.join(', '));
    process.exit(1);
  }
})();

// ── Jede Schwelle auf dem 5er-Raster ────────────────────────────────
// Sonst wandert eine krumme Zahl unbemerkt in eine Bedingung: fuenf
// Teilmengen standen auf zwoelf, und „ab 12 Partien in der Abwehr" liest
// sich wie eine Kalibrierung, die jemand vergessen hat zu runden.
(() => {
  const krumm = ergebnis.filter(e => e.schwelle % 5 !== 0 || e.braucht % 5 !== 0)
    .map(e => e.name + ' (' + e.schwelle + '/' + e.braucht + ')');
  if(krumm.length){
    console.error('Schwelle nicht auf dem 5er-Raster: ' + krumm.join(', '));
    process.exit(1);
  }
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
if(process.env.ALLE){
  alleKomb.filter(e => e.durch).sort((a, b) => b.ausschlag - a.ausschlag).forEach(e =>
    console.log('  ' + e.kammer.padEnd(9) + e.ausschlag.toFixed(2).padStart(5) + ' σ  '
      + e.halter.padEnd(9) + '(R' + e.halterRang + ', ' + String(e.halterSpiele).padStart(3)
      + ')  ' + e.key.padEnd(24) + e.mass + ' ' + e.teil));
}
console.log('  ' + alleKomb.length + ' Kombinationen, ' + aus.bestanden
  + ' bestehen alle Tore, ' + ergebnis.length + ' davon benannt');
ergebnis.forEach(e => console.log('  %s  %s (R%d, %d Partien)  aus %s  rein %s  rQ %s  braucht %d',
  e.name.padEnd(22), e.halter.padEnd(9), e.halterRang, e.halterSpiele,
  e.ausschlag.toFixed(2), e.korrRein.toFixed(2), e.korrQuote.toFixed(2), e.braucht));

// Der Bericht steht. Die Zeitgeber der App laufen weiter und rufen `loadAll`
// gegen eine Attrappe von Supabase; deren Fehler landet in einem Handler, der
// `esc` auf ein Proxy-Objekt wirft. Das hat mit dem Lauf nichts zu tun.
process.exit(0);
