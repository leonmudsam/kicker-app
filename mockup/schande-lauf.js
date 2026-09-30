// Der Lauf: rechnet Kandidaten fuer neue SCHANDREKORDE (Laufbahn) und
// SCHANDCHRONIKEN (Monat) an den echten Partien der Liga nach und baut
// daraus `mockup/schande.html`.
//
//   node mockup/schande-lauf.js
//
// Heute traegt der Katalog 5 Schandrekorde von 46 und 3 Schandchroniken von
// 53. Eine Schande ist nicht einfach ein Rekord mit umgedrehtem Vorzeichen:
// sie muss durch DIESELBEN Tore wie jeder andere Eintrag [§C35, §C39] und
// durch ein sechstes, das nur fuer sie gilt.
//
//   1. Haengt der Wert an der Spielzahl?      (Korrelation, erlaubt bis 0,35)
//   2. Steht die halbe Liga im Rennen?        (wer die Mindestzahl erfuellt)
//   3. Ist sie vergeben?                      (eine leere Tafel sagt nichts)
//   4. Schlaegt die Schwelle weit aus?        (Ausschlag in Sigma, ab 1,5)
//   5. Findet eine Chronik hoechstens einen Halter je Monat?
//   6. SAMMELT SIE SICH BEIM SCHWAECHSTEN?    (kein Halter ueber ein Viertel)
//
// Das sechste Tor ist das eigentliche Problem. Wer schlechter spielt,
// verliert jede Quote — eine Schande, die nur mangelndes Koennen misst,
// gehoert am Ende demselben Spieler, und dann ist sie keine Tafel, sondern
// eine Rangliste von hinten. Dagegen hilft dasselbe Mittel wie oben: nach
// dem ABSTAND ZUM EIGENEN fragen statt nach dem Niveau [§C38].
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

// ── Die Kandidaten ──────────────────────────────────────────────────
// `wert` gibt GROESSER IST SCHLIMMER zurueck (die Tafel zeigt den Schlimmsten)
// oder null, wenn die Mindestzahl nicht erfuellt ist. `ev` ist der Beleg: er
// beginnt mit dem Wert, nach dem sortiert wird [§C35].
const K = [
  // ══ A) Bestehende Schand-Disziplinen bekommen ihre fehlende Achse ══
  //    Dieselbe Frage auf zwei Zeitachsen gehoert in EINE Disziplin [§13.1] —
  //    so wie `spotless`, `evenkeel` und `drought` es schon tun.
  {id:'sieve', achse:'monat', neu:'monat', gruppe:'A',
   name:'Das Scheunentor', short:'Sieb', beiname:'Der Durchlässige',
   cond:'Meiste Gegentore je Abwehrspiel im Monat, ab 8 Abwehrspielen',
   wie:'Gezählt werden die Tore, die das eigene Team kassiert hat, während dieser Spieler hinten stand, geteilt durch die Zahl dieser Partien.',
   wert:p => { const d = p.partien.filter(s => s.pos === 'def');
     return d.length >= 8 ? d.reduce((a, s) => a + s.ga, 0) / d.length : null; },
   ev:(p, v) => { const d = p.partien.filter(s => s.pos === 'def');
     return komma(v) + ' Gegentore je Abwehrspiel · ' + d.length + ' Spiele'; }},

  {id:'abyss', achse:'monat', neu:'monat', gruppe:'A',
   name:'Das Fass ohne Boden', short:'Debakel', beiname:'Der Eingebrochene',
   cond:'Höchster Anteil 0:10-Niederlagen an den Pleiten des Monats, ab 6 Pleiten',
   wie:'Ein 0:10 ist die höchstmögliche Niederlage. Der Nenner sind die eigenen Pleiten des Monats und nicht alle Partien: gefragt ist, WIE jemand verliert.',
   wert:p => p.losses >= 6
     ? p.partien.filter(s => !s.win && s.gf === 0 && s.ga === 10).length / p.losses : null,
   ev:(p, v) => pct(v) + ' % aller ' + p.losses + ' Pleiten endeten 0:10 · '
     + p.partien.filter(s => !s.win && s.gf === 0 && s.ga === 10).length + ' Debakel'},

  {id:'hardluck', achse:'monat', neu:'monat', gruppe:'A',
   name:'Der Pechvogel', short:'Pechvogel', beiname:'Der Unglückliche',
   cond:'Höchster Anteil 9:10-Niederlagen an den Pleiten des Monats, ab 6 Pleiten',
   wie:'Ein 9:10 ist die knappste mögliche Niederlage. Der Nenner sind die eigenen Pleiten und nicht die engen Partien: gefragt ist, wie jemand verliert, nicht wie eng es zuging.',
   wert:p => p.losses >= 6
     ? p.partien.filter(s => !s.win && s.gf === 9 && s.ga === 10).length / p.losses : null,
   ev:(p, v) => pct(v) + ' % aller ' + p.losses + ' Pleiten endeten 9:10 · '
     + p.partien.filter(s => !s.win && s.gf === 9 && s.ga === 10).length + ' davon'},

  {id:'angstgegner', achse:'allzeit', neu:'allzeit', gruppe:'A',
   name:'Der Angstgegner', short:'Angst',
   cond:'Niedrigste Siegquote gegen EINEN Gegner, ab 20 Duellen gegen ihn',
   wie:'Gesucht wird der Gegner, gegen den am wenigsten zu holen war. Der Nenner sind die Duelle gegen genau diesen Gegner; zwanzig davon, damit es keine Serie ist.',
   wert:p => { let b = null;
     Object.keys(p.gegnerGrp).forEach(g => { const d = p.gegnerGrp[g];
       if(d.length < 20) return; const q = quote(d);
       if(!b || q < b.q) b = {q, g, n:d.length, w:d.filter(s => s.win).length}; });
     p._ag = b; return b ? 1 - b.q : null; },
   ev:p => pct(1 - p._ag.q) + ' % verloren gegen ' + name(p._ag.g) + ' · '
     + p._ag.w + ' von ' + p._ag.n},

  {id:'untersoll', achse:'allzeit', neu:'allzeit', gruppe:'A',
   name:'Das Untersoll', short:'Untersoll',
   cond:'Größter Abstand der Siegquote unter die eigene Elo-Erwartung, ab 40 Partien',
   wie:'Die Elo-Rechnung gibt jeder Partie eine Siegchance. Über die Laufbahn gemittelt ergibt das die erwartete Quote; gewertet wird, wie weit die tatsächliche darunter liegt, in Prozentpunkten.',
   wert:p => p.games >= 40 ? p.expQ - p.q : null,
   ev:(p, v) => pp(-v) + ' Punkte unter der Rechnung · ' + pct(p.q) + ' % statt '
     + pct(p.expQ) + ' % in ' + p.games + ' Partien'},

  // ══ B) Neue Schand-Disziplinen mit BEIDEN Achsen ══════════════════
  {id:'misfire', achse:'beide', neu:'beide', gruppe:'B',
   name:'Die Ladehemmung', short:'Torarm', beiname:'Der Harmlose',
   cond:'Größter Rückstand der eigenen Tore im Sturm auf das eigene Mittel, ab 30 Sturmspielen (Monat: 8)',
   wie:'Verglichen werden die Tore des eigenen Teams je Sturmspiel mit denen je Partie über alles. Gefragt ist nicht, wer wenig Tore sieht, sondern wer vorne WENIGER beiträgt als hinten — die reine Zahl gehört sonst dem, der selten gewinnt.',
   mind:{allzeit:30, monat:8},
   wert:(p, m) => { const a = p.partien.filter(s => s.pos === 'atk');
     if(a.length < m || !p.games) return null;
     const imSturm = a.reduce((x, s) => x + s.gf, 0) / a.length;
     const ueberall = p.partien.reduce((x, s) => x + s.gf, 0) / p.games;
     p._lh = {imSturm, ueberall, n:a.length};
     return ueberall - imSturm; },
   ev:p => komma(p._lh.ueberall - p._lh.imSturm) + ' Tore weniger im Sturm · '
     + komma(p._lh.imSturm) + ' statt ' + komma(p._lh.ueberall) + ' in '
     + p._lh.n + ' Sturmspielen'},

  {id:'blankday', achse:'beide', neu:'beide', gruppe:'B',
   name:'Der Fehltag', short:'Fehltag', beiname:'Der Sieglose',
   cond:'Höchster Anteil eigener Spieltage ohne einen Sieg, ab 10 Spieltagen mit je 3 Partien (Monat: 3)',
   wie:'Gezählt werden die eigenen Spieltage mit mindestens drei Partien, an denen kein einziger Sieg heraussprang. Der Nenner sind genau diese Spieltage, nicht die Partien — mit zwei Partien ist ein sieglose Tag ein Wurf, mit drei eine Aussage.',
   mind:{allzeit:10, monat:3},
   wert:(p, m) => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     if(t.length < m) return null;
     p._ft = {ohne:t.filter(a => !a.some(s => s.win)).length, n:t.length};
     return p._ft.ohne / t.length; },
   ev:(p, v) => pct(v) + ' % der Spieltage ohne Sieg · ' + p._ft.ohne + ' von ' + p._ft.n},

  {id:'noanswer', achse:'beide', neu:'beide', gruppe:'B',
   name:'Die stumme Antwort', short:'Stumm', beiname:'Der Geknickte',
   cond:'Größter Einbruch der Siegquote direkt nach einer eigenen Pleite, ab 25 Gelegenheiten (Monat: 6)',
   wie:'Der Nenner sind die Partien, die direkt auf eine eigene Niederlage folgen — die Gelegenheiten zu antworten. Verglichen wird die Quote dort mit der eigenen Quote über alles, in Prozentpunkten: die reine Quote gehört sonst dem, der ohnehin selten gewinnt. Das Gegenstück zum Stehaufmann.',
   mind:{allzeit:25, monat:6},
   wert:(p, m) => { const a = nach(p, false);
     if(a.length < m) return null;
     p._sa = {q:quote(a), n:a.length};
     return p.q - quote(a); },
   ev:p => pp(p._sa.q - p.q) + ' Punkte nach einer Pleite · ' + pct(p._sa.q)
     + ' % statt ' + pct(p.q) + ' % in ' + p._sa.n + ' Gelegenheiten'},

  // ══ C) Nur Rekord: eine Laufbahn-Frage, die ein Monat nicht traegt ══
  {id:'favflop', achse:'allzeit', neu:'allzeit', gruppe:'C',
   name:'Der Wackelkandidat', short:'Wackel',
   cond:'Höchster Anteil Niederlagen als Favorit, ab 20 Partien als Favorit',
   wie:'Favorit ist, wem die Elo-Rechnung vor der Partie über 60 Prozent Siegchance gab. Der Nenner sind genau diese Partien. Das Gegenstück zum Souverän.',
   wert:p => { const f = p.partien.filter(s => s.exp > 0.6);
     return f.length >= 20 ? 1 - quote(f) : null; },
   ev:(p, v) => { const f = p.partien.filter(s => s.exp > 0.6);
     return pct(v) + ' % als Favorit verloren · ' + f.filter(s => !s.win).length
       + ' von ' + f.length; }},

  {id:'ballast', achse:'allzeit', neu:'allzeit', gruppe:'C',
   name:'Der Klotz am Bein', short:'Klotz',
   cond:'Größter Abstand der Mitspieler zu ihrer eigenen Quote, ab 3 Partnern mit je 10 gemeinsamen Spielen',
   wie:'Für jeden Partner wird die Quote an dieser Seite mit seiner Quote ohne diesen Partner verglichen. Gewertet wird der Mittelwert über alle Partner, in Prozentpunkten.',
   wert:p => { const mates = {};
     p.partien.forEach(s => { if(s.mate) (mates[s.mate] = mates[s.mate] || []).push(s); });
     const nutz = Object.keys(mates).filter(m => mates[m].length >= 10);
     if(nutz.length < 3) return null;
     const d = nutz.map(m => {
       const mit = quote(mates[m]);
       const ohne = quote(LAUF[m].partien.filter(s => s.mate !== p.id));
       return mit - ohne; });
     p._kl = {n:nutz.length, d: d.reduce((a, b) => a + b, 0) / d.length};
     return -p._kl.d; },
   ev:p => pp(p._kl.d) + ' Punkte für die Mitspieler · ' + p._kl.n + ' Partner'},

  // ══ D) Nur Chronik: eine Monatsfrage ═══════════════════════════════
  {id:'relapse', achse:'monat', neu:'monat', gruppe:'D',
   name:'Der Rückfall', short:'Rückfall', beiname:'Der Nachlassende',
   cond:'Zweite Hälfte der eigenen Spieltage mindestens 30 Prozentpunkte unter der ersten, ab 4 Spieltagen',
   wie:'Die eigenen Spieltage des Monats werden halbiert und die Siegquote beider Hälften verglichen, in Prozentpunkten. Das Gegenstück zur Steigerung.',
   wert:p => { const t = Object.keys(p.tagGrp).sort();
     if(t.length < 4) return null;
     const h = Math.floor(t.length / 2);
     const e = [].concat(...t.slice(0, h).map(k => p.tagGrp[k]));
     const z = [].concat(...t.slice(h).map(k => p.tagGrp[k]));
     if(e.length < 3 || z.length < 3) return null;
     p._rf = {e:quote(e), z:quote(z), en:e.length, zn:z.length};
     return quote(e) - quote(z); },
   ev:(p, v) => pp(-v) + ' Punkte zum Schluss · ' + pct(p._rf.e) + ' % in den ersten '
     + p._rf.en + ', ' + pct(p._rf.z) + ' % in den letzten ' + p._rf.zn + ' Partien'},

  {id:'dutyfail', achse:'monat', neu:'monat', gruppe:'D',
   name:'Die verschenkte Pflicht', short:'Pflicht', beiname:'Der Fehlbare',
   cond:'Als Favorit mindestens 30 Prozentpunkte unter der Erwartung, ab 6 Partien als Favorit',
   wie:'Favorit ist, wem die Rechnung über 60 Prozent Siegchance gab. Verglichen wird die tatsächliche Quote in genau diesen Partien mit der dort erwarteten, in Prozentpunkten.',
   wert:p => { const f = p.partien.filter(s => s.exp > 0.6);
     if(f.length < 6) return null;
     const erw = f.reduce((a, s) => a + s.exp, 0) / f.length;
     p._pf = {q:quote(f), erw, n:f.length};
     return erw - quote(f); },
   ev:(p, v) => pp(-v) + ' Punkte unter der Pflicht · ' + pct(p._pf.q) + ' % statt '
     + pct(p._pf.erw) + ' % in ' + p._pf.n + ' Partien als Favorit'},

  {id:'weakweek', achse:'monat', neu:'monat', gruppe:'D',
   name:'Die Fehlwoche', short:'Fehlwoche', beiname:'Der Wackelige',
   cond:'Schwächste eigene Woche mindestens 35 Prozentpunkte unter dem eigenen Monat, ab 2 Wochen mit je 3 Partien',
   wie:'Gesucht wird die eigene Woche mit der schlechtesten Quote und der Abstand zur eigenen Quote des ganzen Monats, in Prozentpunkten. Das Gegenstück zu „Ohne schwache Woche".',
   wert:p => { const w = Object.keys(p.wochGrp).filter(k => p.wochGrp[k].length >= 3);
     if(w.length < 2) return null;
     let b = null;
     w.forEach(k => { const q = quote(p.wochGrp[k]);
       if(!b || q < b.q) b = {q, k, n:p.wochGrp[k].length}; });
     p._fw = b; return p.q - b.q; },
   ev:(p, v) => pp(-v) + ' Punkte in der schwächsten Woche · ' + pct(p._fw.q)
     + ' % statt ' + pct(p.q) + ' % im Monat'}
];

// ── Was es heute schon gibt ─────────────────────────────────────────
// Fuer das Konzentrations-Tor zaehlt die GANZE Schandtafel, nicht nur der
// Zuwachs: eine neue Schande verteilt sich gut oder schlecht im Verhaeltnis
// zu den fuenf, die schon stehen. `freefall` fehlt hier — der Elo-Sturz
// zwischen zwei Monaten braucht die Bahn der Simulation, die dieser Lauf
// nicht nachbaut; er ist gemessen ohnehin eine Fuegung.
const BESTAND = [
  {id:'drought', name:'Die Durststrecke',
   wert:p => { let l = 0, b = 0;
     p.partien.forEach(s => { if(s.win) l = 0; else { l++; if(l > b) b = l; } });
     return b >= 7 ? b : null; },
   ev:(p, v) => v + ' Niederlagen am Stück'},
  {id:'abyss_a', name:'Das Fass ohne Boden',
   wert:p => { const d = p.partien.filter(s => !s.win && s.gf === 0 && s.ga === 10).length;
     return (p.losses >= 25 && d / p.losses >= 0.03) ? d / p.losses : null; },
   ev:(p, v) => pct(v) + ' % aller ' + p.losses + ' Pleiten endeten 0:10'},
  {id:'hardluck_a', name:'Der Pechvogel',
   wert:p => { const b = p.partien.filter(s => !s.win && s.gf === 9 && s.ga === 10).length;
     return (p.losses >= 25 && b / p.losses >= 0.08) ? b / p.losses : null; },
   ev:(p, v) => pct(v) + ' % aller ' + p.losses + ' Pleiten endeten 9:10'},
  {id:'sieve_a', name:'Das Scheunentor',
   wert:p => { const d = p.partien.filter(s => s.pos === 'def');
     const g = d.length ? d.reduce((a, s) => a + s.ga, 0) / d.length : 0;
     return (d.length >= 30 && g >= 6) ? g : null; },
   ev:(p, v) => komma(v) + ' Gegentore je Abwehrspiel'}
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
const sigma = (a) => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };

// Die Liga nach Siegquote — fuer „wer haelt es" und das Konzentrations-Tor.
const RANG = IDS.filter(id => LAUF[id].games >= 20)
  .sort((a, b) => LAUF[b].q - LAUF[a].q);
const platz = id => RANG.indexOf(id) + 1;

function laufbahnMessen(k){
  const m = k.mind ? k.mind.allzeit : null;
  const werte = [];
  IDS.forEach(id => { const p = LAUF[id];
    const v = k.mind ? k.wert(p, m) : k.wert(p);
    if(v != null) werte.push({id, v, ev:k.ev(p, v)}); });
  werte.sort((a, b) => b.v - a.v);
  const halter = werte.filter(x => Math.abs(x.v - werte[0].v) < 1e-9);
  const r = korr(werte.map(x => LAUF[x.id].games), werte.map(x => x.v));
  const rest = werte.slice(halter.length).map(x => x.v);
  const aus = rest.length >= 2 && sigma(rest) > 0
    ? (werte[0].v - rest.reduce((a, b) => a + b, 0) / rest.length) / sigma(rest) : null;
  return {rennen:werte.length, halter, alle:werte, korr:r, aus};
}

function monatMessen(k){
  const m = k.mind ? k.mind.monat : null;
  const treffer = [];       // {monat, halter[], alle[]}
  const alleWerte = [];
  MON_GEWERTET.forEach(mk => {
    const werte = [];
    IDS.forEach(id => { const p = MON[mk][id];
      if(!p.games) return;
      const v = k.mind ? k.wert(p, m) : k.wert(p);
      if(v != null) werte.push({id, v, ev:k.ev(p, v), monat:mk}); });
    werte.sort((a, b) => b.v - a.v);
    werte.forEach(w => alleWerte.push(w));
    if(werte.length) treffer.push({monat:mk, werte});
  });
  // Die Schwelle: so hoch, dass hoechstens EIN Halter je gewerteten Monat
  // uebrig bleibt [§C32]. Gesucht wird sie, nicht geraten.
  const sortiert = alleWerte.map(x => x.v).sort((a, b) => b - a);
  let ab = null, halter = [];
  for(const kand of sortiert){
    const h = alleWerte.filter(x => x.v >= kand - 1e-9);
    if(h.length > MON_GEWERTET.length) break;
    ab = kand; halter = h;
  }
  const mitte = alleWerte.reduce((a, b) => a + b.v, 0) / (alleWerte.length || 1);
  const sd = sigma(alleWerte.map(x => x.v));
  return {monate:MON_GEWERTET.length, gewertet:alleWerte.length,
          ab, halter, rate: halter.length / MON_GEWERTET.length,
          aus: sd ? (ab - mitte) / sd : null,
          korr: korr(alleWerte.map(x => MON[x.monat][x.id].games), alleWerte.map(x => x.v))};
}

const ERG = K.map(k => {
  const o = {k};
  if(k.achse === 'allzeit' || k.achse === 'beide') o.lauf = laufbahnMessen(k);
  if(k.achse === 'monat' || k.achse === 'beide') o.mon = monatMessen(k);
  return o;
});

// ── Das sechste Tor: sammelt sich die Schande beim Schwaechsten? ────
const haltungen = {}, woher = {};
const zaehl = (id, was) => { haltungen[id] = (haltungen[id] || 0) + 1;
  (woher[id] = woher[id] || []).push(was); };
const BEST_ERG = BESTAND.map(b => {
  const werte = [];
  IDS.forEach(id => { const v = b.wert(LAUF[id]);
    if(v != null) werte.push({id, v, ev:b.ev(LAUF[id], v)}); });
  werte.sort((x, y) => y.v - x.v);
  const halter = werte.filter(x => Math.abs(x.v - werte[0].v) < 1e-9);
  halter.forEach(h => zaehl(h.id, b.name));
  return {id:b.id, name:b.name, halter, rennen:werte.length};
});
ERG.forEach(e => { (e.lauf ? e.lauf.halter : []).forEach(h => zaehl(h.id, e.k.name)); });
const gesamtHaltungen = Object.values(haltungen).reduce((a, b) => a + b, 0);
const konzentration = Object.keys(haltungen).map(id => ({
  id, name:name(id), n:haltungen[id], anteil: haltungen[id] / (gesamtHaltungen || 1),
  platz: platz(id), was: woher[id]
})).sort((a, b) => b.n - a.n);

fs.writeFileSync(ROOT + '/mockup/.schande.json', JSON.stringify({
  NAMES, IDS, ERG, BEST_ERG, konzentration, gesamtHaltungen,
  MON_GEWERTET, MON_TAGE, RANG: RANG.map(id => ({id, name:name(id),
    q: LAUF[id].q, games: LAUF[id].games}))
}, null, 1));
console.log('Kandidaten: ' + K.length
  + '  (Rekord ' + K.filter(k => k.achse !== 'monat').length
  + ', Chronik ' + K.filter(k => k.achse !== 'allzeit').length + ')');
console.log('gewertete Monate: ' + MON_GEWERTET.length + ' von ' + MONATE.length);
ERG.forEach(e => {
  const t = [];
  if(e.lauf) t.push('Rekord: ' + (e.lauf.halter.map(h => name(h.id)).join(' & ') || 'frei')
    + ' | im Rennen ' + e.lauf.rennen + '/12 | r=' + komma(e.lauf.korr, 2)
    + (e.lauf.aus != null ? ' | ' + komma(e.lauf.aus, 2) + 'σ' : ''));
  if(e.mon) t.push('Chronik: ' + e.mon.halter.length + ' Halter in '
    + e.mon.monate + ' Monaten (Rate ' + komma(e.mon.rate, 2) + ')'
    + ' | r=' + komma(e.mon.korr, 2)
    + (e.mon.aus != null ? ' | ' + komma(e.mon.aus, 2) + 'σ' : ''));
  console.log('  ' + e.k.name.padEnd(24) + t.join('   ||   '));
});
console.log('\nBestand (die vier nachrechenbaren von fünf):');
BEST_ERG.forEach(b => console.log('  ' + b.name.padEnd(24)
  + (b.halter.map(h => name(h.id)).join(' & ') || 'frei') + '   im Rennen ' + b.rennen + '/12'));
console.log('\nKonzentration der GANZEN Schandtafel (Bestand + neu):');
konzentration.forEach(c => console.log('  ' + name(c.id).padEnd(10)
  + c.n + ' Haltungen (' + pct(c.anteil) + ' %)   Platz ' + c.platz + ' der Siegquote'));

// ── Die Seite ───────────────────────────────────────────────────────
// Bewusst schmucklos: sie soll zeigen, WELCHE Einträge es werden könnten und
// was die Messung von ihnen hält — nicht, wie sie in der App aussähen.
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const TOR = (ok, txt) => `<span class="t ${ok ? 'j' : 'n'}">${esc(txt)}</span>`;
const GRUPPE = {
  A: ['Bestand bekommt seine fehlende Achse',
      'Dieselbe Frage auf zwei Zeitachsen gehört in EINE Disziplin [§13.1] — so wie '
      + '<code>spotless</code>, <code>evenkeel</code> und <code>drought</code> es schon tun. '
      + 'Fünf Schand-Disziplinen tragen heute nur eine der beiden.'],
  B: ['Neu, mit beiden Achsen',
      'Drei Fragen, die es noch gar nicht gibt — jede als Gegenstück zu einem '
      + 'bestehenden positiven Eintrag, und jede auf Laufbahn UND Monat.'],
  C: ['Neu, nur Rekord',
      'Eine Laufbahn-Frage, die ein Monat nicht trägt: vier Wochen sind zu kurz, '
      + 'um sie zu messen.'],
  D: ['Neu, nur Chronik',
      'Eine Monatsfrage. Über eine ganze Laufbahn mitteln sich diese Werte weg.']
};
const kandKarte = (e) => {
  const k = e.k;
  const z = [];
  if(e.lauf){
    const L = e.lauf;
    const halt = L.halter.map(h => NAMES[IDS.indexOf(h.id)]).join(' & ') || '— frei —';
    z.push(`<div class="ax"><div class="axk">Schandrekord · Laufbahn</div>
      <div class="halt">${esc(halt)}</div>
      <div class="ev">${esc(L.halter[0] ? L.halter[0].ev : '')}</div>
      <div class="tore">
        ${TOR(L.halter.length > 0, L.halter.length ? 'vergeben' : 'niemand hält es')}
        ${TOR(L.rennen >= 6, 'im Rennen ' + L.rennen + ' von 12')}
        ${TOR(Math.abs(L.korr) <= 0.35, 'Spielzahl r = ' + komma(L.korr, 2))}
        ${TOR(L.aus == null || L.aus >= 1.5, 'Ausschlag ' + (L.aus == null ? '—' : komma(L.aus, 2) + ' σ'))}
      </div>
      <div class="liste">${L.alle.slice(0, 5).map((x, i) =>
        '<span>' + (i + 1) + '. ' + esc(NAMES[IDS.indexOf(x.id)]) + '</span>').join('')}</div>
    </div>`);
  }
  if(e.mon){
    const M = e.mon;
    const halt = M.halter.map(h => NAMES[IDS.indexOf(h.id)] + ' (' + h.monat + ')').join(', ');
    z.push(`<div class="ax"><div class="axk">Schandchronik · Monat</div>
      <div class="halt">${esc(halt || '— frei —')}</div>
      <div class="ev">${esc(M.halter[0] ? M.halter[0].ev : '')}</div>
      <div class="tore">
        ${TOR(M.halter.length > 0, M.halter.length + ' Halter in ' + M.monate + ' Monaten')}
        ${TOR(M.rate <= 1.0001, 'Rate ' + komma(M.rate, 2) + ' je Monat')}
        ${TOR(Math.abs(M.korr) <= 0.35, 'Spielzahl r = ' + komma(M.korr, 2))}
        ${TOR(M.aus != null && M.aus >= 1.5, 'Ausschlag ' + (M.aus == null ? '—' : komma(M.aus, 2) + ' σ'))}
      </div></div>`);
  }
  return `<div class="kand">
    <div class="kopf"><b>${esc(k.name)}</b>
      <span class="sh">${esc(k.short)}</span>
      ${k.beiname ? '<span class="bn">Beiname: ' + esc(k.beiname) + '</span>' : ''}
      <span class="neu">${k.neu === 'beide' ? 'Rekord + Chronik'
        : k.neu === 'monat' ? 'Chronik neu' : 'Rekord neu'}</span></div>
    <div class="cond">${esc(k.cond)}</div>
    <div class="wie">${esc(k.wie)}</div>
    <div class="axe">${z.join('')}</div></div>`;
};
const SEITE = `<!doctype html><meta charset="utf-8">
<title>Schandrekorde und Schandchroniken — Vorschlag</title>
<style>
 body{background:#0c0e0d;color:#d7dbd8;font:14px/1.5 system-ui,sans-serif;margin:0;padding:22px;
   max-width:1080px}
 h1{font-size:21px;margin:0 0 4px} h2{font-size:16px;margin:30px 0 4px;color:#e8ecea}
 p{margin:6px 0;color:#9fa8a3;max-width:70ch}
 code{background:#181c1a;padding:1px 4px;border-radius:3px;font-size:12px}
 .warn{border-left:3px solid #f0566a;background:#1a1112;padding:10px 14px;margin:16px 0}
 .warn b{color:#f0566a}
 table{border-collapse:collapse;margin:8px 0;font-size:13px}
 td,th{padding:3px 12px 3px 0;text-align:left;vertical-align:top}
 th{color:#7d8781;font-weight:600}
 .grp{color:#7d8781;margin:26px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
 .kand{background:#131614;border:1px solid #232825;border-radius:8px;padding:12px 14px;margin:8px 0}
 .kopf{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
 .kopf b{font-size:15px;color:#fff}
 .sh,.bn,.neu{font-size:11px;padding:1px 6px;border-radius:4px;background:#1d2220;color:#8b948f}
 .neu{background:#22201a;color:#c8a24a}
 .cond{margin:6px 0 2px;color:#e2e6e3;font-size:13px}
 .wie{color:#858e89;font-size:12px;max-width:80ch}
 .axe{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
 .ax{flex:1 1 300px;background:#0f1211;border:1px solid #1f2422;border-radius:6px;padding:8px 10px}
 .axk{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#6f7873}
 .halt{font-size:15px;color:#fff;margin:2px 0}
 .ev{font-size:12px;color:#9aa39e}
 .tore{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
 .t{font-size:11px;padding:1px 6px;border-radius:4px}
 .t.j{background:#14231a;color:#7fc99a} .t.n{background:#25151a;color:#f0566a}
 .liste{margin-top:6px;font-size:11px;color:#6f7873;display:flex;gap:9px;flex-wrap:wrap}
</style>
<h1>Schandrekorde und Schandchroniken — was möglich ist</h1>
<p>Gerechnet an den echten ${MS.length} Partien der Liga, ${IDS.length} Spieler,
 ${MONATE.length} Monate (davon ${MON_GEWERTET.length} mit mindestens
 ${CHRONIK_MIN_TAGE} Spieltagen und damit gewertet).
 <code>node mockup/schande-lauf.js</code></p>

<h2>Wo die Tafel heute steht</h2>
<table>
 <tr><th></th><th>gesamt</th><th>davon Schande</th></tr>
 <tr><td>Liga-Rekorde</td><td>46</td><td>5 &nbsp;<span style="color:#7d8781">(Durststrecke, Fass ohne Boden, Pechvogel, Sturzflug, Scheunentor)</span></td></tr>
 <tr><td>Monatschroniken</td><td>53</td><td>3 &nbsp;<span style="color:#7d8781">(Durststrecke, Angstgegner, Untersoll)</span></td></tr>
</table>
<p>Eine Schande zählt nicht fürs Insignium und nicht als Rekord: <code>art:'schatten'</code>
 setzt <code>neg</code>, und daran hängen <code>PRESTIGE_CHRONIK.schatten = 0</code>,
 der übersprungene Rekord in der Prestige-Rechnung, die Zahl im Profil und in der
 Rangliste sowie die rote Farbe [§C25]. Das gilt für jeden neuen Eintrag
 unverändert mit — es ist nichts nachzubauen.</p>

<h2>Die sechs Tore</h2>
<p>Dieselben fünf wie für jeden anderen Eintrag [§C35, §C39] — und ein sechstes,
 das nur für die Schande gilt.</p>
<table>
 <tr><td>1</td><td>Der Wert hängt nicht an der Spielzahl</td><td>|r| ≤ 0,35</td></tr>
 <tr><td>2</td><td>Die halbe Liga steht im Rennen</td><td>≥ 6 von 12</td></tr>
 <tr><td>3</td><td>Er ist vergeben</td><td>eine leere Tafel sagt nichts</td></tr>
 <tr><td>4</td><td>Die Schwelle schlägt weit aus</td><td>≥ 1,5 σ</td></tr>
 <tr><td>5</td><td>Eine Chronik findet höchstens einen Halter je Monat</td><td>Rate ≤ 1</td></tr>
 <tr><td>6</td><td><b>Sie sammelt sich nicht beim Schwächsten</b></td><td>kein Halter über ein Viertel</td></tr>
</table>

<div class="warn">
 <b>Das sechste Tor ist das eigentliche Problem — und es steht heute schon offen.</b>
 <p style="color:#c9b0b4">Wer schlechter spielt, verliert jede Quote. Eine Schande, die
 das NIVEAU misst, gehört damit immer demselben Spieler, und dann ist die Tafel keine
 Tafel, sondern eine Rangliste von hinten. Gemessen über Bestand und Vorschlag zusammen
 (${gesamtHaltungen} Haltungen):</p>
 <table>${konzentration.map(c => `<tr><td><b>${esc(c.name)}</b></td>
   <td>${c.n} Haltungen</td><td style="color:${c.anteil > 0.25 ? '#f0566a' : '#7fc99a'}">${pct(c.anteil)} %</td>
   <td style="color:#7d8781">Platz ${c.platz} der Siegquote</td>
   <td style="color:#7d8781">${esc(c.was.join(', '))}</td></tr>`).join('')}</table>
 <p style="color:#c9b0b4">Schon heute hält Stefan zwei der vier nachrechenbaren
 bestehenden. Der Ausweg steht in den Daten: die Einträge, die NICHT an ihn gehen,
 fragen nach dem Abstand zum Eigenen oder nach einer Fügung — der Pechvogel geht an
 Jane (Platz 4), der Wackelkandidat an Leo (Platz 7), die stumme Antwort an Johannes.
 Die, die das Niveau messen, gehen alle an denselben. Zwei Kandidaten haben genau
 dadurch ihr Tor bestanden: „Die Ladehemmung“ ging von r = −0,35 auf +0,14 und
 „Die stumme Antwort“ von −0,40 auf +0,06, nachdem sie nach dem Abstand zum
 eigenen Mittel fragen statt nach der reinen Zahl.</p>
</div>

${['A','B','C','D'].map(g => `<div class="grp">${esc(GRUPPE[g][0])}</div>
  <p>${GRUPPE[g][1]}</p>
  ${ERG.filter(e => e.k.gruppe === g).map(kandKarte).join('')}`).join('')}

<h2>Was noch nicht trägt</h2>
<table>
 <tr><td><b>Der Fehltag</b></td><td>r = −0,54 auf der Laufbahn, −0,44 im Monat.
   Wer wenig spielt, hat wenige Spieltage, und ein einziger sieglose Tag wiegt
   dort schwer. Das Tor hält ihn zurück; in dieser Form nicht einbaubar.</td></tr>
 <tr><td><b>Die Talfahrt</b><br><span style="color:#7d8781">Der Abstürzende</span></td>
   <td>Größter Elo-Einbruch innerhalb des Monats. Nicht gerechnet: der Wert steht als
   <code>maxDD</code> schon in <code>_seasonTitleCtx</code>, dieser Lauf baut die
   Elo-Bahn nicht nach. Als Idee vollständig, als Zahl offen.</td></tr>
 <tr><td><b>Das Kellerkind</b><br><span style="color:#7d8781">Der Abgehängte</span></td>
   <td>Schlechtester Tabellenplatz an jedem Tagesende, das Gegenstück zu „Auf dem
   Thron“. Liest <code>thronRang</code>, dieselbe Quelle. Verdacht: misst reines
   Niveau und landet damit auf Tor 6.</td></tr>
 <tr><td><b>Der Rückfall</b>, <b>Die verschenkte Pflicht</b>, <b>Die Fehlwoche</b></td>
   <td>Ausschlag unter 1,5 σ — aber gemessen an nur ${MON_GEWERTET.length} gewerteten
   Monaten. Diese Zahl ist zu dünn für ein Urteil; sie braucht die Kalibrierung an
   mehr Monaten, so wie der Monatskatalog sie bekommen hat.</td></tr>
</table>
<p style="margin-top:18px">Vorschlag zur Reihenfolge: Gruppe A zuerst — fünf fehlende
 Achsen, kein neuer Gedanke, jede Zahl steht schon in einer Engine. Dann Gruppe B und C,
 soweit die Tore halten. Gruppe D erst nach einer Kalibrierung über mehr Monate.</p>
`;
fs.writeFileSync(ROOT + '/mockup/schande.html', SEITE);
console.log('\nmockup/schande.html geschrieben ('
  + Math.round(SEITE.length / 1024) + ' KB)');
