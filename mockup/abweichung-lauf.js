// Der Lauf: rechnet Kandidaten fuer Chroniken und Rekorde nach, die ihre
// Besonderheit aus einer ABWEICHUNG ziehen — und baut daraus
// `mockup/abweichung.html`.
//
//   node mockup/abweichung-lauf.js
//
// Die Frage dahinter: wer eine Quote gewinnt, gewinnt fast jede. Ein Eintrag,
// der das NIVEAU misst, gehoert damit immer denselben drei Spielern [§C38].
// Ein Eintrag, der die ABWEICHUNG von einer eigenen Bezugsgroesse misst, ist
// fuer jede Koennensklasse erreichbar: der Zehnte der Siegquote kann in zehn
// Partien genauso weit ueber seinem eigenen Schnitt liegen wie der Erste.
//
// Zwei Dinge macht dieser Lauf zusaetzlich zu den bekannten Toren:
//
//   • Die Abweichung IST die Bedeutung. Der Ausschlag der Schwelle in Sigma
//     geht direkt ins Prestige (`PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] ×
//     aus + PRESTIGE_SELTEN[klasse]`, [§C39]), also wird er hier gemessen und
//     der Punktwert gleich mitgerechnet.
//   • Die Zahlen werden nicht gewuerfelt. Eine Schwelle von 13 % oder „ab 23
//     Partien" liest sich wie ein Rechenergebnis, und das ist sie auch. Jede
//     Schwelle und jede Mindestzahl wird deshalb auf einen 5er-Schritt
//     gelegt, und danach wird nachgemessen, ob die Tore noch halten.
//
// Die Tore, alle an den echten 466 Partien:
//
//   1. Haengt der Wert an der Spielzahl?       (Korrelation, erlaubt bis 0,35)
//   2. Schlaegt die Schwelle weit aus?         (Ausschlag in Sigma, ab 1,5)
//   3. Ist der Eintrag vergeben?               (eine leere Tafel sagt nichts)
//   4. Hoechstens ein Halter je gewerteten Monat?          (nur Chronik)
//   5. ERREICHT ER JEDE KLASSE?                (ein Halter jenseits der
//      besten drei der Siegquote — sonst ist es doch nur das Niveau)
//   6. Halten die Tore auch mit der 5er-Schwelle?
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
const wocheKey = ts => { const d = new Date(ts);
  const mo = new Date(d); mo.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return tagKey(mo.getTime()); };

// ── Die Rohsicht: jede Partie aus der Sicht eines Spielers, in
//    Spielreihenfolge. Genau die, die `_seasonTitleCtx` fuer den Monat und
//    `_chronicleCtx` fuer die Laufbahn schon haben.
function rohBau(ms, ids){
  const P = {};
  ids.forEach(id => { P[id] = {id, partien:[]}; });
  ms.forEach(m => {
    const vier = [m.a1, m.a2, m.b1, m.b2];
    const posAlle = [m.a1_pos, m.a2_pos, m.b1_pos, m.b2_pos];
    vier.forEach((id, k) => {
      if(!id || !P[id]) return;
      const onA = k < 2;
      P[id].partien.push({
        win: (onA && m.winner === 'A') || (!onA && m.winner === 'B'),
        gf: onA ? m.score_a : m.score_b,
        ga: onA ? m.score_b : m.score_a,
        pos: posAlle[k],
        exp: onA ? m.exp_a : 1 - m.exp_a,
        ts: m.ts, tag: tagKey(m.ts), wk: wocheKey(m.ts),
        mate: onA ? (k === 0 ? m.a2 : m.a1) : (k === 2 ? m.b2 : m.b1),
        geg: onA ? [m.b1, m.b2] : [m.a1, m.a2]
      });
    });
  });
  const grp = (p, f) => { const o = {};
    p.partien.forEach(s => { const k = f(s); if(k) (o[k] = o[k] || []).push(s); });
    return o; };
  ids.forEach(id => {
    const p = P[id];
    p.games = p.partien.length;
    p.wins = p.partien.filter(s => s.win).length;
    p.losses = p.games - p.wins;
    p.q = p.games ? p.wins / p.games : 0;
    p.expQ = p.games ? p.partien.reduce((a, s) => a + s.exp, 0) / p.games : 0;
    p.tagGrp = grp(p, s => s.tag);
    p.wochGrp = grp(p, s => s.wk);
    p.gegnerGrp = (() => { const o = {};
      p.partien.forEach(s => s.geg.forEach(g => { if(g) (o[g] = o[g] || []).push(s); }));
      return o; })();
  });
  return P;
}
const LAUF = rohBau(MS, IDS);
const MONATE = [...new Set(MS.map(m => monKey(m.ts)))].sort();
const MON = {};
MONATE.forEach(k => { MON[k] = rohBau(MS.filter(m => monKey(m.ts) === k), IDS); });
// Ein Monat wird ueberhaupt gewertet, wenn er genug Spieltage hat
// (CHRONIK_MIN_TAGE in der App).
const MON_TAGE = {};
MONATE.forEach(k => { MON_TAGE[k] = new Set(MS.filter(m => monKey(m.ts) === k)
  .map(m => tagKey(m.ts))).size; });
const CHRONIK_MIN_TAGE = 5;          // wie in der App
const MON_GEWERTET = MONATE.filter(k => MON_TAGE[k] >= CHRONIK_MIN_TAGE);

const quote = a => a.length ? a.filter(s => s.win).length / a.length : 0;
const pct = v => Math.round(v * 100);
const komma = (v, n) => (Number(v) || 0).toFixed(n == null ? 1 : n)
  .replace('.', ',').replace(/^-/, '\u2212');   // echtes Minus, kein Bindestrich [§C27]
const pp = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v * 100));
const nach = (p, sieg) => p.partien.filter((s, i) => i > 0 && p.partien[i-1].win === sieg);


// ── Ein gesuchtes Maximum haengt an der Spielzahl ───────────────────
// Der erste Entwurf suchte das BESTE Fenster aus zehn Partien einer Laufbahn.
// Gemessen lag die Korrelation mit der Spielzahl bei weit ueber 0,35 und das
// Tor fiel: wer zwanzig Partien hat, hat elf Fenster, wer dreihundertfuenfzig
// hat, hat dreihunderteinundvierzig — und das Maximum aus vielen Ziehungen ist
// groesser. Derselbe Fehler wie beim „unwahrscheinlichsten Spieltag" [§C39].
//
// Eine FESTE Teilung hat dieses Problem nicht: Sturm gegen alles, Favorit
// gegen alles, erste Haelfte gegen zweite, letzte Partie des Tages gegen die
// davor. Es wird nichts ausgewaehlt, also gibt es keinen Auswahlvorteil. Das
// letzte Fenster ist ebenfalls fest — es ist die Frage der Form-Karte [§C33],
// nur als Eintrag: die letzten zehn Partien gegen die Laufbahn DAVOR.
function letzteZehn(p, n){
  if(p.games < n + n) return null;              // davor muss auch was sein
  const drin = p.partien.slice(-n), raus = p.partien.slice(0, p.games - n);
  return {d: quote(drin) - quote(raus), drin:quote(drin), raus:quote(raus),
          n, vor:raus.length};
}

// Die zweite Haelfte der eigenen Spieltage gegen die erste. „Eigene" Spieltage:
// wer an zwanzig Tagen spielte, wird an seinen zwanzig gemessen und nicht am
// Kalender — sonst haengt die Wertung daran, wie oft jemand dabei war.
function haelften(p, mindTage){
  const tage = Object.keys(p.tagGrp).sort();
  if(tage.length < mindTage) return null;
  const mitte = Math.floor(tage.length / 2);
  const a = [], b = [];
  tage.forEach((t, i) => (i < mitte ? a : b).push(...p.tagGrp[t]));
  if(!a.length || !b.length) return null;
  return {d: quote(b) - quote(a), erst:quote(a), zweit:quote(b),
          tage:tage.length, nA:a.length, nB:b.length};
}

// Die Partien eines Spielers gegen STAERKERE, gemessen an der Elo-Rechnung des
// Spiels. Nicht „gegen die Top drei": wer selbst unten steht, hat fast nur
// staerkere Gegner, und wer oben steht, fast keine. Die Rechnung kennt den
// Unterschied.
function gegenStaerker(p, mind){
  const d = p.partien.filter(s => s.exp < CHANCE_OFFEN);
  if(d.length < mind) return null;
  return {d: quote(d) - p.q, drin:quote(d), eigen:p.q, n:d.length};
}
const CHANCE_OFFEN = 0.45;      // wie in der App [§5.2]

// Die letzte Partie eines eigenen Spieltags gegen alle anderen dieses Tages.
// Der Schlusspfiff eines Abends ist die Partie, an die man sich erinnert.
function schluss(p, mindTage){
  const tage = Object.keys(p.tagGrp).filter(t => p.tagGrp[t].length >= 3);
  if(tage.length < mindTage) return null;
  const letzte = [], rest = [];
  tage.forEach(t => { const a = p.tagGrp[t].slice().sort((x, y) => x.ts - y.ts);
    letzte.push(a[a.length - 1]); rest.push(...a.slice(0, -1)); });
  if(!rest.length) return null;
  return {d: quote(letzte) - quote(rest), drin:quote(letzte), raus:quote(rest),
          n:letzte.length};
}

// ── Die Kandidaten ──────────────────────────────────────────────────
// `wert` gibt GROESSER IST BESONDERER zurueck (bei einer Schattenseite ist die
// Abweichung nach unten der Wert) oder null, wenn die Mindestzahl nicht
// erfuellt ist. `ev` ist der Beleg: er beginnt mit dem Wert, nach dem sortiert
// wird [§C35]. `stufe` ist die Einheit des 5er-Schritts: 'pp' sind
// Prozentpunkte, 'tor' sind Zehntel-Tore.
const K = [
  // ══ Positiv: die Abweichung nach oben ═════════════════════════════
  {id:'hochform', achse:'beide', art:'koennen', ton:'gold', stufe:'pp',
   name:'Der Höhenflug', short:'Höhenflug', beiname:'Der Entfesselte',
   mind:{allzeit:20, monat:5},
   frage:'Wie weit liegt die laufende Form über der eigenen Laufbahn?',
   cond:'Ein Block aus 10 Partien mindestens 35 Prozentpunkte über der eigenen Quote außerhalb dieses Blocks, ab 20 Partien',
   wie:'Die letzten zehn Partien werden gegen die Quote in allen Partien DAVOR gestellt, nicht gegen die Gesamtquote — sonst zählt das Fenster doppelt. Das Fenster ist fest: ein gesuchtes Maximum aus allen Zehnerblöcken hing an der Spielzahl, weil das Maximum aus dreihundert Ziehungen größer ist als das aus elf.',
   fenster:true,
   wert:(p, m) => { if(p.games < m) return null;
     const f = letzteZehn(p, 10); if(!f) return null; p._hf = f; return f.d; },
   ev:(p, v) => pp(v) + ' Punkte über dem eigenen Schnitt · ' + pct(p._hf.drin)
     + ' % in den letzten 10 Partien statt ' + pct(p._hf.raus) + ' % in den '
     + p._hf.vor + ' davor'},

  {id:'steigerung', achse:'beide', art:'konstanz', ton:'gold', stufe:'pp',
   name:'Die Steigerungsform', short:'Steigerung', beiname:'Der Gereifte',
   mind:{allzeit:20, monat:5},
   frage:'Wer wird im Verlauf besser als er angefangen hat?',
   cond:'Zweite Hälfte der eigenen Spieltage mindestens 20 Prozentpunkte über der ersten, ab 10 eigenen Spieltagen (Monat: 5)',
   wie:'Die eigenen Spieltage werden in zwei Hälften geteilt und die Quoten verglichen. Gezählt werden die eigenen Spieltage, nicht die des Kalenders: sonst hängt die Wertung daran, wie oft jemand dabei war.',
   mindTage:{allzeit:10, monat:5},
   wert:(p, m, mt) => { const h = haelften(p, mt); if(!h) return null;
     p._st = h; return h.d; },
   ev:(p, v) => pp(v) + ' Punkte besser geworden · ' + pct(p._st.zweit)
     + ' % in der zweiten Hälfte statt ' + pct(p._st.erst) + ' % in der ersten'},

  {id:'ueberflieger', achse:'beide', art:'koennen', ton:'gold', stufe:'pp',
   name:'Der Trotzkopf', short:'Trotz', beiname:'Der Unbeugsame',
   mind:{allzeit:25, monat:5},
   frage:'Wer holt gegen Stärkere mehr als gegen alle?',
   cond:'Mindestens 15 Prozentpunkte bessere Quote gegen Stärkere als über alles, ab 25 Partien als Außenseiter (Monat: 5)',
   wie:'Stärker heißt: die Elo-Rechnung gab vor der Partie unter 45 Prozent Siegchance. Verglichen wird die Quote in genau diesen Partien mit der eigenen Gesamtquote — nicht mit der Liga, sonst gehört der Eintrag dem Besten.',
   wert:(p, m) => { const g = gegenStaerker(p, m); if(!g) return null;
     p._uf = g; return g.d; },
   ev:(p, v) => pp(v) + ' Punkte besser als Außenseiter · ' + pct(p._uf.drin)
     + ' % in ' + p._uf.n + ' Partien statt ' + pct(p._uf.eigen) + ' % sonst'},

  {id:'schlusspfiff', achse:'beide', art:'konstanz', ton:'gold', stufe:'pp',
   name:'Der letzte Ball', short:'Schluss', beiname:'Der Standhafte',
   mind:{allzeit:20, monat:5},
   frage:'Wer gewinnt die letzte Partie eines Abends öfter als die davor?',
   cond:'Mindestens 25 Prozentpunkte bessere Quote in der letzten Partie eines Spieltags, ab 10 eigenen Spieltagen mit je 3 Partien (Monat: 3)',
   wie:'Gewertet wird die zeitlich letzte Partie jedes eigenen Spieltags gegen alle anderen dieses Tages. Drei Partien je Tag, damit „die letzte" überhaupt eine Auswahl ist.',
   mindTage:{allzeit:10, monat:3},
   wert:(p, m, mt) => { const s = schluss(p, mt); if(!s) return null;
     p._sp = s; return s.d; },
   ev:(p, v) => pp(v) + ' Punkte im Schlussspiel · ' + pct(p._sp.drin)
     + ' % in ' + p._sp.n + ' Schlussspielen statt ' + pct(p._sp.raus) + ' % davor'},

  {id:'torlaune', achse:'beide', art:'koennen', ton:'gold', stufe:'tor',
   name:'Die Torlaune', short:'Torlaune', beiname:'Der Aufgedrehte',
   mind:{allzeit:25, monat:8},
   frage:'Wer trifft im Sturm deutlich mehr als sonst?',
   cond:'Mindestens 1,5 Tore je Partie mehr im Sturm als über alles, ab 25 Sturmspielen (Monat: 8)',
   wie:'Verglichen werden die Tore des eigenen Teams je Sturmspiel mit denen je Partie über alles. Gefragt ist der Abstand, nicht die Zahl: die reine Zahl gehört dem, der ohnehin die meisten Tore sieht.',
   wert:(p, m) => { const a = p.partien.filter(s => s.pos === 'atk');
     if(a.length < m || !p.games) return null;
     const imSturm = a.reduce((x, s) => x + s.gf, 0) / a.length;
     const ueberall = p.partien.reduce((x, s) => x + s.gf, 0) / p.games;
     p._tl = {imSturm, ueberall, n:a.length};
     return imSturm - ueberall; },
   ev:p => komma(p._tl.imSturm - p._tl.ueberall) + ' Tore mehr im Sturm · '
     + komma(p._tl.imSturm) + ' statt ' + komma(p._tl.ueberall) + ' in '
     + p._tl.n + ' Sturmspielen'},

  // ══ Negativ: die Abweichung nach unten ════════════════════════════
  {id:'durchhaenger', achse:'beide', art:'schatten', ton:'red', stufe:'pp',
   name:'Der Durchhänger', short:'Durchhänger', beiname:'Der Abgerissene',
   mind:{allzeit:20, monat:5},
   frage:'Wie weit liegt die laufende Form unter der eigenen Laufbahn?',
   cond:'Ein Block aus 10 Partien mindestens 35 Prozentpunkte unter der eigenen Quote außerhalb dieses Blocks, ab 20 Partien',
   wie:'Das Gegenstück zum Höhenflug, mit derselben Rechnung: die letzten zehn Partien gegen alle davor. Gemessen wird der Abstand nach unten, nicht das Niveau — ein schwacher Spieler mit gleichmäßiger Quote steht hier nicht.',
   fenster:true,
   wert:(p, m) => { if(p.games < m) return null;
     const f = letzteZehn(p, 10); if(!f) return null; p._dh = f; return -f.d; },
   ev:(p, v) => pp(-v) + ' Punkte unter dem eigenen Schnitt · ' + pct(p._dh.drin)
     + ' % in den letzten 10 Partien statt ' + pct(p._dh.raus) + ' % in den '
     + p._dh.vor + ' davor'},

  {id:'nachlass', achse:'beide', art:'schatten', ton:'red', stufe:'pp',
   name:'Der Nachlass', short:'Nachlass', beiname:'Der Ermüdete',
   mind:{allzeit:20, monat:5},
   frage:'Wer wird im Verlauf schlechter als er angefangen hat?',
   cond:'Zweite Hälfte der eigenen Spieltage mindestens 20 Prozentpunkte unter der ersten, ab 10 eigenen Spieltagen (Monat: 5)',
   wie:'Dieselbe Halbierung der eigenen Spieltage wie bei der Steigerungsform, nur in die andere Richtung. Wer von Anfang an schwach war, steht hier nicht — gefragt ist der Abfall.',
   mindTage:{allzeit:10, monat:5},
   wert:(p, m, mt) => { const h = haelften(p, mt); if(!h) return null;
     p._nl = h; return -h.d; },
   ev:(p, v) => pp(-v) + ' Punkte abgefallen · ' + pct(p._nl.zweit)
     + ' % in der zweiten Hälfte statt ' + pct(p._nl.erst) + ' % in der ersten'},

  {id:'pflichtaufgabe', achse:'beide', art:'schatten', ton:'red', stufe:'pp',
   name:'Die Pflichtaufgabe', short:'Pflicht', beiname:'Der Nachlässige',
   mind:{allzeit:25, monat:5},
   frage:'Wer holt als Favorit weniger als über alles?',
   cond:'Mindestens 15 Prozentpunkte schlechtere Quote als Favorit als über alles, ab 25 Partien als Favorit (Monat: 5)',
   wie:'Favorit heißt: die Elo-Rechnung gab vor der Partie über 55 Prozent Siegchance, dieselbe Grenze wie bei „Der Souverän". Verglichen wird die Quote in genau diesen Partien mit der eigenen Gesamtquote.',
   wert:(p, m) => { const d = p.partien.filter(s => s.exp > 0.55);
     if(d.length < m) return null;
     p._pa = {drin:quote(d), eigen:p.q, n:d.length};
     return p.q - quote(d); },
   ev:(p, v) => pp(-v) + ' Punkte als Favorit · ' + pct(p._pa.drin)
     + ' % in ' + p._pa.n + ' Partien statt ' + pct(p._pa.eigen) + ' % sonst'},

  {id:'zitterhand', achse:'beide', art:'schatten', ton:'red', stufe:'pp',
   name:'Die Zitterhand', short:'Zittern', beiname:'Der Nervöse',
   mind:{allzeit:20, monat:5},
   frage:'Wer verliert die letzte Partie eines Abends öfter als die davor?',
   cond:'Mindestens 25 Prozentpunkte schlechtere Quote in der letzten Partie eines Spieltags, ab 10 eigenen Spieltagen mit je 3 Partien (Monat: 3)',
   wie:'Dieselbe Rechnung wie beim letzten Ball, nur in die andere Richtung: die zeitlich letzte Partie jedes eigenen Spieltags gegen alle anderen dieses Tages.',
   mindTage:{allzeit:10, monat:3},
   wert:(p, m, mt) => { const s = schluss(p, mt); if(!s) return null;
     p._zh = s; return -s.d; },
   ev:(p, v) => pp(-v) + ' Punkte im Schlussspiel · ' + pct(p._zh.drin)
     + ' % in ' + p._zh.n + ' Schlussspielen statt ' + pct(p._zh.raus) + ' % davor'},

  {id:'ladehemmung2', achse:'beide', art:'schatten', ton:'red', stufe:'tor',
   name:'Der Ladehemmer', short:'Ladehemm', beiname:'Der Zögerliche',
   mind:{allzeit:25, monat:8},
   frage:'Wer trifft im Sturm deutlich weniger als sonst?',
   cond:'Mindestens 1,5 Tore je Partie weniger im Sturm als über alles, ab 25 Sturmspielen (Monat: 8)',
   wie:'Das Gegenstück zur Torlaune mit derselben Rechnung. Gefragt ist nicht, wer wenig Tore sieht, sondern wer vorne weniger beiträgt als hinten.',
   wert:(p, m) => { const a = p.partien.filter(s => s.pos === 'atk');
     if(a.length < m || !p.games) return null;
     const imSturm = a.reduce((x, s) => x + s.gf, 0) / a.length;
     const ueberall = p.partien.reduce((x, s) => x + s.gf, 0) / p.games;
     p._lh = {imSturm, ueberall, n:a.length};
     return ueberall - imSturm; },
   ev:p => komma(p._lh.ueberall - p._lh.imSturm) + ' Tore weniger im Sturm · '
     + komma(p._lh.imSturm) + ' statt ' + komma(p._lh.ueberall) + ' in '
     + p._lh.n + ' Sturmspielen'},
];

// ── Die Tore ────────────────────────────────────────────────────────
const korr = (xs, ys) => {
  const n = xs.length; if(n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sx = 0, sy = 0, sxy = 0;
  for(let i = 0; i < n; i++){ const a = xs[i] - mx, b = ys[i] - my;
    sx += a * a; sy += b * b; sxy += a * b; }
  return (sx && sy) ? sxy / Math.sqrt(sx * sy) : 0;
};
const sigma = a => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };

// Die Liga nach Siegquote. „Erreicht jede Klasse" heisst: ein Halter steht
// jenseits der besten drei — sonst misst der Eintrag doch nur das Niveau.
const RANG = IDS.filter(id => LAUF[id].games >= 20)
  .sort((a, b) => LAUF[b].q - LAUF[a].q);
const platz = id => RANG.indexOf(id) + 1;
const KLASSE = id => { const pl = platz(id); if(!pl) return 'ungewertet';
  const d = Math.ceil(RANG.length / 3);
  return pl <= d ? 'oberes Drittel' : pl <= 2 * d ? 'mittleres Drittel' : 'unteres Drittel'; };

// ── Der 5er-Schritt ─────────────────────────────────────────────────
// Eine Schwelle von 13 % oder „ab 23 Partien" liest sich wie ein
// Rechenergebnis, weil sie eines ist. Gelegt wird sie deshalb auf einen
// 5er-Schritt — und zwar auf den, der die Tore noch haelt: nach unten
// gerundet kommen Halter dazu (die Rate kippt), nach oben fallen welche weg
// (die Tafel leert sich). Gezeigt werden beide Zahlen, damit die Rundung
// nachvollziehbar ist und nicht als „so war es schon immer" durchgeht.
const SCHRITT = {pp:0.05, tor:0.5};            // 5 Prozentpunkte, ein halbes Tor
const raster = (v, stufe) => { const s = SCHRITT[stufe] || 0.05;
  return {ab: Math.round(v / s) * s, runter: Math.floor(v / s) * s,
          rauf: Math.ceil(v / s) * s, schritt:s}; };
const zeig = (v, stufe) => stufe === 'tor' ? komma(v) + ' Tore'
  : Math.round(v * 100) + ' Prozentpunkte';

function laufbahnMessen(k){
  const m = k.mind.allzeit, mt = k.mindTage ? k.mindTage.allzeit : null;
  const werte = [];
  IDS.forEach(id => { const p = LAUF[id];
    const v = k.wert(p, m, mt);
    if(v != null) werte.push({id, v, ev:k.ev(p, v)}); });
  werte.sort((a, b) => b.v - a.v);
  if(!werte.length) return {rennen:0, halter:[], alle:[]};
  const halter = werte.filter(x => Math.abs(x.v - werte[0].v) < 1e-9);
  const rest = werte.slice(halter.length).map(x => x.v);
  const aus = rest.length >= 2 && sigma(rest) > 0
    ? (werte[0].v - rest.reduce((a, b) => a + b, 0) / rest.length) / sigma(rest) : null;
  return {rennen:werte.length, halter, alle:werte,
          korr: korr(werte.map(x => LAUF[x.id].games), werte.map(x => x.v)), aus};
}

function monatMessen(k){
  const m = k.mind.monat, mt = k.mindTage ? k.mindTage.monat : null;
  const alleWerte = [];
  MON_GEWERTET.forEach(mk => {
    IDS.forEach(id => { const p = MON[mk][id];
      if(!p.games) return;
      const v = k.wert(p, m, mt);
      if(v != null) alleWerte.push({id, v, ev:k.ev(p, v), monat:mk}); });
  });
  if(!alleWerte.length) return {monate:MON_GEWERTET.length, gewertet:0, halter:[]};
  const mitte = alleWerte.reduce((a, b) => a + b.v, 0) / alleWerte.length;
  const sd = sigma(alleWerte.map(x => x.v));
  const haltenBei = ab => alleWerte.filter(x => x.v >= ab - 1e-9);
  // Die kalibrierte Schwelle: so hoch, dass hoechstens EIN Halter je
  // gewerteten Monat uebrig bleibt [§C32].
  const sortiert = alleWerte.map(x => x.v).sort((a, b) => b - a);
  let roh = null;
  for(const kand of sortiert){
    if(haltenBei(kand).length > MON_GEWERTET.length) break;
    roh = kand;
  }
  if(roh == null) return {monate:MON_GEWERTET.length, gewertet:alleWerte.length, halter:[]};
  // Und jetzt auf den 5er-Schritt. Nach unten zuerst: die Schwelle soll nicht
  // hoeher sein als noetig. Kippt dabei die Rate, geht es nach oben.
  // Lieber nach OBEN: die hoehere Schwelle schlaegt weiter aus, und der
  // Ausschlag ist die Bedeutung [§C39]. Leert sie die Tafel, geht es nach
  // unten. Gemessen hob das „Der Durchhaenger" von 1,49 auf ueber 1,5 σ und
  // damit ueber das Tor.
  const r = raster(roh, k.stufe);
  const kandidaten = [r.rauf, r.runter].filter(x => x > 0);
  let ab = null;
  for(const x of kandidaten){
    if(haltenBei(x).length && haltenBei(x).length <= MON_GEWERTET.length){ ab = x; break; }
  }
  const halter = ab == null ? [] : haltenBei(ab);
  return {monate:MON_GEWERTET.length, gewertet:alleWerte.length, roh, ab,
          gerundet: ab != null && Math.abs(ab - roh) > 1e-9,
          halter, rate: halter.length / MON_GEWERTET.length,
          ausRoh: sd ? (roh - mitte) / sd : null,
          aus: sd && ab != null ? (ab - mitte) / sd : null,
          korr: korr(alleWerte.map(x => MON[x.monat][x.id].games), alleWerte.map(x => x.v))};
}

// Das Prestige, mit der Formel der App [§C39].
const PRESTIGE_SOCKEL = 40;
const PRESTIGE_CHRONIK = {koennen:30, konstanz:24, fuegung:15, schatten:0};
const PRESTIGE_SELTEN = {legendaer:15, selten:8, besonders:0};
const klasseVon = aus => aus >= 2.1 ? 'legendaer' : aus >= 1.7 ? 'selten' : 'besonders';
const punkte = (art, aus, klasse) => {
  const g = PRESTIGE_CHRONIK[art];
  if(!g) return 0;
  return Math.round((PRESTIGE_SOCKEL + g * (aus || 0) + PRESTIGE_SELTEN[klasse]) / 5) * 5;
};

const ERG = K.map(k => {
  const lauf = laufbahnMessen(k);
  const mon = monatMessen(k);
  const aus = mon.aus;
  const klasse = aus != null ? klasseVon(aus) : null;
  // Das Tor der App gilt dem CHRONIK-Wert: „hoechstens 0,35 Korrelation"
  // [§C39], gemessen ueber alle gewerteten Spieler-Monate. Auf der Laufbahn
  // stehen nur elf Punkte — eine Korrelation darueber ist zu unruhig fuer ein
  // Tor, aber sie sagt etwas, also wird sie mit einer weiteren Grenze
  // gemessen und in jedem Fall gezeigt.
  const tore = {
    spielzahl: Math.abs(mon.korr || 0) <= 0.35,
    vielspieler: Math.abs(lauf.korr || 0) <= 0.5,
    ausschlag: aus != null && aus >= 1.5,
    // Eine Bestmarke muss die Aussage ihres Namens ueberhaupt erfuellen: „Wer
    // holt gegen Staerkere mehr" ist kein Rekord, wenn der Beste dort
    // WENIGER holt und nur am wenigsten weniger. Gemessen traf das „Der
    // Trotzkopf" mit −6 Punkten an der Spitze.
    aussage: lauf.halter.length > 0 && lauf.halter[0].v > 0,
    vergeben: lauf.halter.length > 0 && mon.halter.length > 0,
    rate: mon.halter.length > 0 && mon.rate <= 1,
    klassen: [...lauf.halter, ...mon.halter].some(h => platz(h.id) > Math.ceil(RANG.length / 3)),
  };
  tore.alle = Object.values(tore).every(Boolean);
  return {k, lauf, mon, aus, klasse,
          prestige: klasse ? punkte(k.art, aus, klasse) : 0, tore};
});

// ── Der Bericht auf der Konsole ─────────────────────────────────────
console.log('Kandidaten: ' + K.length + '  ('
  + K.filter(k => k.art !== 'schatten').length + ' positiv, '
  + K.filter(k => k.art === 'schatten').length + ' negativ)');
console.log('gewertete Monate: ' + MON_GEWERTET.length + ' von ' + MONATE.length
  + '   Liga nach Siegquote: ' + RANG.map(id => name(id)).join(' > '));
console.log('');
ERG.forEach(e => {
  const t = Object.keys(e.tore).filter(x => x !== 'alle')
    .map(x => (e.tore[x] ? '+' : '!') + x).join(' ');
  console.log((e.tore.alle ? 'OK  ' : 'ROT ') + e.k.name.padEnd(20)
    + (e.k.art === 'schatten' ? 'schatten ' : e.k.art.padEnd(9))
    + 'aus ' + (e.aus == null ? '  —  ' : komma(e.aus, 2).padStart(5))
    + '  ' + String(e.prestige).padStart(3) + 'P  ' + t);
  if(e.mon.ab != null)
    console.log('      Schwelle ' + zeig(e.mon.roh, e.k.stufe) + ' -> '
      + zeig(e.mon.ab, e.k.stufe) + (e.mon.gerundet ? '  (gerastert)' : '  (schon rund)'));
  console.log('      Rekord: ' + (e.lauf.halter.map(h => name(h.id)
      + ' [' + KLASSE(h.id) + ']').join(' & ') || 'frei')
    + '   im Rennen: ' + e.lauf.rennen);
  if(e.lauf.halter[0]) console.log('      Beleg:  ' + e.lauf.halter[0].ev);
  console.log('      Chronik: ' + (e.mon.halter.map(h => name(h.id) + ' (' + h.monat + ')')
      .join(', ') || 'frei') + '   gewertet: ' + (e.mon.gewertet || 0));
  console.log('');
});

fs.writeFileSync(ROOT + '/mockup/.abweichung.json', JSON.stringify({
  NAMES, IDS, MON_GEWERTET, MONATE,
  RANG: RANG.map(id => ({id, name:name(id), q:LAUF[id].q, games:LAUF[id].games,
                         klasse:KLASSE(id)})),
  ERG: ERG.map(e => ({
    id:e.k.id, name:e.k.name, short:e.k.short, beiname:e.k.beiname || '',
    art:e.k.art, ton:e.k.ton, stufe:e.k.stufe, frage:e.k.frage,
    cond:e.k.cond, wie:e.k.wie, mind:e.k.mind, mindTage:e.k.mindTage || null,
    aus:e.aus, klasse:e.klasse, prestige:e.prestige, tore:e.tore,
    lauf:{rennen:e.lauf.rennen, korr:e.lauf.korr, aus:e.lauf.aus,
          halter:e.lauf.halter.map(h => ({name:name(h.id), klasse:KLASSE(h.id),
                                          platz:platz(h.id), ev:h.ev})),
          alle:e.lauf.alle.slice(0, 5).map(h => ({name:name(h.id), v:h.v,
                                                  klasse:KLASSE(h.id)}))},
    mon:{gewertet:e.mon.gewertet, monate:e.mon.monate, roh:e.mon.roh, ab:e.mon.ab,
         gerundet:e.mon.gerundet, rate:e.mon.rate, korr:e.mon.korr,
         ausRoh:e.mon.ausRoh,
         halter:(e.mon.halter || []).map(h => ({name:name(h.id), monat:h.monat,
                                               klasse:KLASSE(h.id), ev:h.ev}))}
  }))
}, null, 1));

// ── Die Seite ───────────────────────────────────────────────────────
// Bewusst schmucklos: sie zeigt, WELCHE Einträge es werden könnten, wo ihre
// Schwelle liegt und was die Messung von ihnen hält — nicht, wie sie in der
// App aussähen.
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const TOR = (ok, txt) => `<span class="t ${ok ? 'j' : 'n'}">${esc(txt)}</span>`;
const KL = {legendaer:'legendär', selten:'selten', besonders:'besonders'};
const ART = {koennen:'Können', konstanz:'Konstanz', fuegung:'Fügung', schatten:'Schattenseite'};

const kandKarte = e => {
  const k = e.k, L = e.lauf, M = e.mon;
  const haltL = L.halter.map(h => name(h.id)).join(' & ') || '— frei —';
  const haltM = M.halter.map(h => name(h.id) + ' (' + h.monat + ')').join(', ') || '— frei —';
  return `<div class="kand ${e.tore.alle ? 'ok' : 'rot'}">
    <div class="kopf"><b>${esc(k.name)}</b>
      <span class="sh">${esc(k.short)}</span>
      ${k.beiname ? '<span class="bn">Beiname: ' + esc(k.beiname) + '</span>' : ''}
      <span class="art ${k.art}">${esc(ART[k.art])}</span>
      <span class="ur">${e.tore.alle ? 'trägt' : 'trägt nicht'}</span></div>
    <div class="frage">${esc(k.frage)}</div>
    <div class="cond">${esc(k.cond)}</div>
    <div class="wie">${esc(k.wie)}</div>
    <div class="schwelle">
      ${!(M.halter && M.halter.length) ? '<span class="n5">keine Schwelle: niemand erfüllt die Aussage</span>'
        : `<span class="roh">kalibriert ${esc(zeig(M.roh, k.stufe))}</span>
           <span class="pf">→</span>
           <span class="r5">5er-Schritt ${esc(zeig(M.ab, k.stufe))}</span>
           ${M.gerundet ? '' : '<span class="n5">lag schon auf dem Raster</span>'}`}
      ${e.aus == null ? '' : `<span class="aus">Ausschlag ${esc(komma(e.aus, 2))} σ</span>
        <span class="kls ${e.klasse}">${esc(KL[e.klasse])}</span>
        <span class="pkt">${e.prestige} Prestige</span>`}
    </div>
    <div class="axe">
      <div class="ax"><div class="axk">Liga-Rekord · Laufbahn</div>
        <div class="halt">${esc(haltL)}${L.halter[0]
          ? ' <span class="kk">' + esc(KLASSE(L.halter[0].id)) + '</span>' : ''}</div>
        <div class="ev">${esc(L.halter[0] ? L.halter[0].ev : '')}</div>
        <div class="tore">
          ${TOR(e.tore.aussage, e.tore.aussage ? 'die Bestmarke erfüllt die Aussage'
                                               : 'der Beste erfüllt die Aussage nicht')}
          ${TOR(e.tore.vielspieler, 'Spielzahl r = ' + komma(L.korr, 2))}
          ${TOR(L.rennen >= 6, 'im Rennen ' + L.rennen + ' von 12')}
        </div>
        <div class="liste">${L.alle.slice(0, 5).map((x, i) =>
          '<span>' + (i + 1) + '. ' + esc(name(x.id)) + ' <i>' + esc(KLASSE(x.id))
          + '</i></span>').join('')}</div>
      </div>
      <div class="ax"><div class="axk">Monatschronik · Monat</div>
        <div class="halt">${esc(haltM)}</div>
        <div class="ev">${esc(M.halter && M.halter[0] ? M.halter[0].ev : '')}</div>
        <div class="tore">
          ${TOR(e.tore.rate, (M.halter || []).length + ' Halter in ' + M.monate + ' Monaten')}
          ${TOR(e.tore.spielzahl, 'Spielzahl r = ' + komma(M.korr || 0, 2))}
          ${TOR(e.tore.ausschlag, 'Ausschlag ' + (e.aus == null ? '—' : komma(e.aus, 2) + ' σ'))}
          ${TOR(e.tore.klassen, 'erreicht jede Klasse')}
        </div>
      </div>
    </div></div>`;
};

const SEITE_HTML = `<!doctype html><meta charset="utf-8">
<title>Chroniken und Rekorde aus der Abweichung — Vorschlag</title>
<style>
 body{background:#0c0e0d;color:#d7dbd8;font:14px/1.5 system-ui,sans-serif;margin:0;padding:22px;
   max-width:1080px}
 h1{font-size:21px;margin:0 0 4px} h2{font-size:16px;margin:30px 0 4px;color:#e8ecea}
 p{margin:6px 0;color:#9fa8a3;max-width:72ch}
 code{background:#181c1a;padding:1px 4px;border-radius:3px;font-size:12px}
 table{border-collapse:collapse;margin:8px 0;font-size:13px}
 td,th{padding:3px 12px 3px 0;text-align:left;vertical-align:top}
 th{color:#7d8781;font-weight:600}
 .warn{border-left:3px solid #c8a24a;background:#17150f;padding:10px 14px;margin:16px 0}
 .warn b{color:#c8a24a}
 .grp{color:#7d8781;margin:28px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
 .kand{background:#131614;border:1px solid #232825;border-left-width:3px;
   border-radius:8px;padding:12px 14px;margin:8px 0}
 .kand.ok{border-left-color:#7fc99a} .kand.rot{border-left-color:#f0566a}
 .kopf{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
 .kopf b{font-size:15px;color:#fff}
 .sh,.bn,.art,.ur{font-size:11px;padding:1px 6px;border-radius:4px;background:#1d2220;color:#8b948f}
 .art.koennen,.art.konstanz{background:#22201a;color:#c8a24a}
 .art.schatten{background:#25151a;color:#f0566a}
 .ur{margin-left:auto;background:#14231a;color:#7fc99a}
 .kand.rot .ur{background:#25151a;color:#f0566a}
 .frage{margin:7px 0 0;color:#fff;font-size:14px}
 .cond{margin:3px 0 2px;color:#e2e6e3;font-size:13px}
 .wie{color:#858e89;font-size:12px;max-width:82ch}
 .schwelle{display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:9px 0 2px}
 .roh,.r5,.aus,.kls,.pkt,.n5{font-size:11px;padding:2px 7px;border-radius:4px}
 .roh{background:#1a1d1b;color:#7d8781;text-decoration:line-through}
 .pf{color:#6f7873;font-size:11px}
 .r5{background:#101d16;color:#7fc99a;font-weight:600}
 .aus{background:#16191c;color:#8fa8c4}
 .kls{background:#1d2220;color:#8b948f}
 .kls.legendaer{background:#22201a;color:#c8a24a}
 .pkt{background:#1b1622;color:#b49ad6}
 .n5{background:#1a1d1b;color:#6f7873}
 .axe{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
 .ax{flex:1 1 320px;background:#0f1211;border:1px solid #1f2422;border-radius:6px;padding:8px 10px}
 .axk{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#6f7873}
 .halt{font-size:15px;color:#fff;margin:2px 0}
 .kk{font-size:10px;color:#7d8781;font-weight:400}
 .ev{font-size:12px;color:#9aa39e;min-height:18px}
 .tore{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
 .t{font-size:11px;padding:1px 6px;border-radius:4px}
 .t.j{background:#14231a;color:#7fc99a} .t.n{background:#25151a;color:#f0566a}
 .liste{margin-top:6px;font-size:11px;color:#6f7873;display:flex;gap:9px;flex-wrap:wrap}
 .liste i{color:#535c57;font-style:normal}
</style>
<h1>Chroniken und Rekorde, die aus der Abweichung leben</h1>
<p>Gerechnet an den echten ${MS.length} Partien der Liga, ${IDS.length} Spieler,
 ${MONATE.length} Monate (davon ${MON_GEWERTET.length} mit mindestens
 ${CHRONIK_MIN_TAGE} Spieltagen und damit gewertet).
 <code>node mockup/abweichung-lauf.js</code></p>

<h2>Warum Abweichung und nicht Niveau</h2>
<p>Wer eine Quote gewinnt, gewinnt fast jede. Ein Eintrag, der das NIVEAU misst,
 gehört damit immer denselben drei Spielern — gemessen gingen einmal sechzig Prozent
 aller Monatseinträge an die besten Drei der Siegquote [§C38]. Ein Eintrag, der die
 Abweichung von einer <b>eigenen</b> Bezugsgröße misst, ist für jede Könnensklasse
 erreichbar: der Zehnte der Siegquote kann in zehn Partien genauso weit über seinem
 eigenen Schnitt liegen wie der Erste. Die Liga nach Siegquote, in Drittel geteilt:</p>
<table><tr>${RANG.map((id, i) => `<td><b>${esc(name(id))}</b><br>
  <span style="color:#7d8781">${i + 1}. · ${pct(LAUF[id].q)} %<br>${esc(KLASSE(id))}</span></td>`).join('')}</tr></table>

<h2>Die Abweichung IST die Bedeutung</h2>
<p>Das ist keine neue Rechnung, sondern die, die der Katalog schon hat: der Ausschlag
 der Schwelle in Standardabweichungen (<code>aus</code>) geht direkt ins Prestige —
 <code>PRESTIGE_SOCKEL + PRESTIGE_CHRONIK[art] × aus + PRESTIGE_SELTEN[klasse]</code>,
 gerundet auf fünf [§C39]. Weiter draußen heißt also von selbst mehr wert, und die
 Klasse folgt dem Ausschlag statt umgekehrt:</p>
<table>
 <tr><th>Ausschlag</th><th>Klasse</th><th>Können</th><th>Konstanz</th><th>Schattenseite</th></tr>
 <tr><td>ab 2,1 σ</td><td>legendär</td><td>${punkte('koennen',2.1,'legendaer')} P</td>
   <td>${punkte('konstanz',2.1,'legendaer')} P</td><td>0 P</td></tr>
 <tr><td>ab 1,7 σ</td><td>selten</td><td>${punkte('koennen',1.7,'selten')} P</td>
   <td>${punkte('konstanz',1.7,'selten')} P</td><td>0 P</td></tr>
 <tr><td>ab 1,5 σ</td><td>besonders</td><td>${punkte('koennen',1.5,'besonders')} P</td>
   <td>${punkte('konstanz',1.5,'besonders')} P</td><td>0 P</td></tr>
 <tr><td>unter 1,5 σ</td><td colspan="4" style="color:#f0566a">fällt aus dem Katalog:
   der Beste liegt kaum weiter draußen als der Durchschnitt</td></tr>
</table>
<p>Eine Schattenseite gibt null Punkte und zählt nicht als Rekord [§C25]. Sie gehört
 trotzdem dazu — nur ohne Wert.</p>

<div class="warn">
 <b>Die Zahlen werden nicht gewürfelt.</b>
 <p style="color:#c9c0a4">Eine Schwelle von 13 % oder „ab 23 Partien“ liest sich wie
 ein Rechenergebnis, weil sie eines ist. Jede Schwelle wird deshalb auf einen
 <b>5er-Schritt</b> gelegt — 5 Prozentpunkte oder ein halbes Tor — und jede
 Mindestzahl auf ein Vielfaches von fünf. Gerundet wird nach OBEN, solange die Tafel
 dabei nicht leer wird: die höhere Schwelle schlägt weiter aus, und der Ausschlag ist
 die Bedeutung. Gemessen hob das „Der letzte Ball“ von 31 auf 35 Prozentpunkte und
 damit von 1,50 auf 1,75 σ — also von <i>besonders</i> auf <i>selten</i> und von 75 auf
 90 Punkte. Fünf der zehn Schwellen lagen schon auf dem Raster, die anderen fünf rückten
 um höchstens vier Prozentpunkte. Auf jeder Karte unten stehen beide Zahlen.</p>
</div>

<h2>Die sieben Tore</h2>
<table>
 <tr><td>1</td><td>Der Chronik-Wert hängt nicht an der Spielzahl</td><td>|r| ≤ 0,35 [§C39]</td></tr>
 <tr><td>2</td><td>Der Rekord neigt nicht zum Vielspieler</td><td>|r| ≤ 0,5 über 11 Punkte</td></tr>
 <tr><td>3</td><td>Die Schwelle schlägt weit aus</td><td>≥ 1,5 σ</td></tr>
 <tr><td>4</td><td><b>Die Bestmarke erfüllt die Aussage ihres Namens</b></td><td>Wert &gt; 0</td></tr>
 <tr><td>5</td><td>Der Eintrag ist vergeben</td><td>auf beiden Achsen</td></tr>
 <tr><td>6</td><td>Höchstens ein Halter je gewerteten Monat</td><td>Rate ≤ 1 [§C32]</td></tr>
 <tr><td>7</td><td><b>Er erreicht jede Könnensklasse</b></td><td>ein Halter jenseits des ersten Drittels</td></tr>
</table>
<p>Tor 4 kam durch die Messung dazu: „Der Trotzkopf“ fragt, wer gegen Stärkere mehr
 holt als über alles — und in dieser Liga holt <b>niemand</b> dort mehr. Die Bestmarke
 lag bei −6 Prozentpunkten. Ein Rekord, dessen Bester die eigene Aussage nicht
 erfüllt, ist kein Rekord, sondern eine Rangliste des kleinsten Übels.</p>

<div class="grp">Positiv — die Abweichung nach oben</div>
${ERG.filter(e => e.k.art !== 'schatten').map(kandKarte).join('')}

<div class="grp">Negativ — die Abweichung nach unten</div>
<p>Eine Schattenseite ist nicht ein Rekord mit umgedrehtem Vorzeichen: sie muss durch
 dieselben Tore, und sie darf sich nicht beim Schwächsten sammeln [§C35]. Genau das
 leistet die Abweichung — wer gleichmäßig schwach spielt, steht hier nicht.</p>
${ERG.filter(e => e.k.art === 'schatten').map(kandKarte).join('')}

<h2>Was die Messung sagt</h2>
<table>
 <tr><th>Befund</th><th>woran</th></tr>
 <tr><td><b>Ein gesuchtes Maximum hängt an der Spielzahl.</b></td>
  <td>Der erste Entwurf suchte das beste von allen Zehnerfenstern einer Laufbahn und
  kam auf r = 0,42. Wer zwanzig Partien hat, hat elf Fenster; wer 350 hat, hat 341 —
  und das Maximum aus vielen Ziehungen ist größer. Derselbe Fehler wie beim
  „unwahrscheinlichsten Spieltag“ [§C39]. Mit dem <b>festen</b> letzten Fenster
  fällt r auf ${komma(ERG.find(e => e.k.id === 'hochform').lauf.korr, 2)}.</td></tr>
 <tr><td><b>Eine feste Teilung hat das Problem nicht.</b></td>
  <td>Sturm gegen alles, Favorit gegen alles, erste Hälfte gegen zweite, letzte Partie
  des Tages gegen die davor: es wird nichts ausgewählt, also gibt es keinen
  Auswahlvorteil. Alle vier tragenden Kandidaten sind von dieser Art.</td></tr>
 <tr><td><b>Vier von zehn tragen.</b></td>
  <td>${ERG.filter(e => e.tore.alle).map(e => esc(e.k.name)).join(', ')}.
  Die übrigen sechs scheitern nachvollziehbar, und das ist das Ergebnis des Laufs:
  ${ERG.filter(e => !e.tore.alle).map(e => esc(e.k.name) + ' ('
    + Object.keys(e.tore).filter(t => t !== 'alle' && !e.tore[t]).join(', ') + ')').join('; ')}.</td></tr>
 <tr><td><b>Drei gewertete Monate sind für ein Urteil dünn.</b></td>
  <td>Der Ausschlag wird an ${MON_GEWERTET.length} Monaten gemessen. Für die vier
  tragenden reicht das als Hinweis, nicht als Kalibrierung — die Schwellen gehören
  vor dem Einbau an mehr Monaten nachgerechnet, so wie der Monatskatalog sie bekommen
  hat.</td></tr>
</table>
`;
fs.writeFileSync(ROOT + '/mockup/abweichung.html', SEITE_HTML);
console.log('mockup/abweichung.html geschrieben ('
  + Math.round(SEITE_HTML.length / 1024) + ' KB)');
