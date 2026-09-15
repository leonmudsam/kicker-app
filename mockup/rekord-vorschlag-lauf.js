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
  p.partnerGrp = grp(p, s => s.mate);
  p.gegnerGrp = (() => { const o = {};
    p.partien.forEach(s => s.geg.forEach(g => { if(g) (o[g] = o[g] || []).push(s); }));
    return o; })();
});

const quote = a => a.length ? a.filter(s => s.win).length / a.length : 0;
const streu = a => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
const pct = v => Math.round(v * 100);
const pp = v => (v >= 0 ? '+' : '') + Math.round(v * 100);

// ── Die Kandidaten ──────────────────────────────────────────────────
// `quelle` nennt die Monatschronik, deren Frage sie auf die Laufbahn hebt —
// derselbe Name, dasselbe Zeichen, nur die andere Zeitachse [§13.1]. `art`
// entscheidet das Prestige [§C34], `zufall` die Kammer [§C35]. Alle
// Kandidaten, deren Wert nicht mit der Siegquote laeuft, messen kein Koennen
// und stehen deshalb als Fuegung da: sie sollen jemandem gehoeren koennen,
// nicht jemanden auszeichnen.
const K = [
  {id:'gleichauf', name:'Auf Augenhöhe', quelle:'Auf Augenhöhe', art:'leistung', zufall:'',
   frage:'Wie viel besser läuft es in den Partien, die die Rechnung offen sah?',
   min:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55).length >= 25,
   wert:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return quote(d) - p.q; },
   ev:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return `${pct(quote(d))} % in ${d.length} offenen Partien, sonst ${pct(p.q)} %`; },
   mindText:'ab 25 offenen Partien'},

  {id:'steigerung', name:'Die Steigerung', quelle:'Die Steigerung', art:'ereignis', zufall:'quote',
   frage:'Wie weit liegt das letzte Drittel der Laufbahn über dem ersten?',
   min:p => p.games >= 60,
   wert:p => { const n = Math.floor(p.games / 3);
     return quote(p.partien.slice(-n)) - quote(p.partien.slice(0, n)); },
   ev:p => { const n = Math.floor(p.games / 3);
     return `${pct(quote(p.partien.slice(-n)))} % im letzten Drittel, `
          + `${pct(quote(p.partien.slice(0, n)))} % im ersten`; },
   mindText:'ab 60 Partien'},

  {id:'punktgenau2', name:'Der Erwartungstreue', quelle:'Der Erwartungstreue', art:'konstanz', zufall:'',
   frage:'Wessen Laufbahn trifft die Elo-Erwartung am genauesten?',
   min:p => p.games >= 60,
   wert:p => -Math.abs(p.q - p.expQ),
   ev:p => `${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`,
   mindText:'ab 60 Partien'},

  {id:'metronom', name:'Das Metronom', quelle:'Das Metronom', art:'ereignis', zufall:'quote',
   frage:'Wie weit liegen bester und schwächster Monat auseinander?',
   min:p => Object.values(p.monatGrp).filter(a => a.length >= 8).length >= 3,
   wert:p => { const q = Object.values(p.monatGrp).filter(a => a.length >= 8).map(quote);
     return -(Math.max(...q) - Math.min(...q)); },
   ev:p => { const q = Object.values(p.monatGrp).filter(a => a.length >= 8).map(quote);
     return `${pct(Math.min(...q))} % im schwächsten, ${pct(Math.max(...q))} % im besten von `
          + `${q.length} Monaten`; },
   mindText:'ab 3 Monaten mit je 8 Partien'},

  {id:'beidseitig', name:'Der Beidfüßige', quelle:'Der Beidfüßige', art:'konstanz', zufall:'',
   frage:'Spielt jemand vorne genauso stark wie hinten?',
   min:p => p.partien.filter(s => s.pos === 'atk').length >= 25
         && p.partien.filter(s => s.pos === 'def').length >= 25,
   wert:p => { const a = p.partien.filter(s => s.pos === 'atk');
     const d = p.partien.filter(s => s.pos === 'def');
     return -Math.max(Math.abs(quote(a) - p.q), Math.abs(quote(d) - p.q)); },
   ev:p => { const a = p.partien.filter(s => s.pos === 'atk');
     const d = p.partien.filter(s => s.pos === 'def');
     return `${pct(quote(a))} % vorne, ${pct(quote(d))} % hinten, ${pct(p.q)} % insgesamt`; },
   mindText:'ab 25 Partien je Position'},

  {id:'rollenfest', name:'Favorit wie Außenseiter', quelle:'Favorit wie Außenseiter', art:'konstanz', zufall:'',
   frage:'Spielt jemand als Favorit genauso wie als Außenseiter?',
   min:p => p.partien.filter(s => s.exp > 0.55).length >= 20
         && p.partien.filter(s => s.exp < 0.45).length >= 20,
   wert:p => -Math.abs(quote(p.partien.filter(s => s.exp > 0.55))
                     - quote(p.partien.filter(s => s.exp < 0.45))),
   ev:p => `${pct(quote(p.partien.filter(s => s.exp > 0.55)))} % als Favorit, `
         + `${pct(quote(p.partien.filter(s => s.exp < 0.45)))} % als Außenseiter`,
   mindText:'ab 20 Partien in jeder Lage'},

  {id:'gleichmut', name:'Der Gleichmut', quelle:'Der Gleichmut', art:'ereignis', zufall:'quote',
   frage:'Wie gleichmäßig fallen die Ergebnisse aus?',
   min:p => p.games >= 60,
   wert:p => -streu(p.partien.map(s => s.gf - s.ga)),
   ev:p => `${streu(p.partien.map(s => s.gf - s.ga)).toFixed(1)} Tore Streuung um `
         + `${(p.gd / p.games >= 0 ? '+' : '')}${(p.gd / p.games).toFixed(1)} im Schnitt`,
   mindText:'ab 60 Partien'},

  {id:'wechselhaft', name:'Der Wechselhafte', quelle:'Der Wechselhafte', art:'ereignis', zufall:'quote',
   frage:'Wessen Spieltage sehen am wenigsten wie der andere aus?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => { const q = Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote);
     return Math.sqrt(q.reduce((x, y) => x + (y - p.q) * (y - p.q), 0) / q.length); },
   ev:p => { const q = Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote);
     return `${pct(Math.min(...q))} % am schwächsten, ${pct(Math.max(...q))} % am stärksten `
          + `von ${q.length} Spieltagen`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  {id:'kontrast', name:'Der Kontrast', quelle:'Der Kontrast', art:'ereignis', zufall:'quote',
   frage:'Wie weit liegen bester und schwächster Partner auseinander?',
   min:p => Object.values(p.partnerGrp).filter(a => a.length >= 15).length >= 4,
   wert:p => { const q = Object.keys(p.partnerGrp).filter(k => p.partnerGrp[k].length >= 15)
       .map(k => ({k, q:quote(p.partnerGrp[k])})).sort((a, b) => b.q - a.q);
     return q[0].q - q[q.length - 1].q; },
   ev:p => { const q = Object.keys(p.partnerGrp).filter(k => p.partnerGrp[k].length >= 15)
       .map(k => ({k, q:quote(p.partnerGrp[k])})).sort((a, b) => b.q - a.q);
     return `${pct(q[0].q)} % neben ${name(q[0].k)}, ${pct(q[q.length - 1].q)} % neben `
          + `${name(q[q.length - 1].k)}`; },
   mindText:'ab 4 Partnern mit je 15 Partien'},

  {id:'angstfrei', name:'Ohne Angstgegner', quelle:'Ohne Angstgegner', art:'leistung', zufall:'',
   frage:'Wie gut läuft es gegen den unangenehmsten Gegner?',
   min:p => Object.values(p.gegnerGrp).filter(a => a.length >= 15).length >= 6,
   wert:p => Math.min(...Object.values(p.gegnerGrp).filter(a => a.length >= 15).map(quote)),
   ev:p => { const gg = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return `${gg.length} regelmäßige Gegner, gegen keinen unter `
          + `${pct(Math.min(...gg.map(quote)))} %`; },
   mindText:'ab 6 Gegnern mit je 15 Duellen'},

  {id:'breitenwirkung', name:'Gegen jeden bestanden', quelle:'Gegen jeden bestanden', art:'leistung', zufall:'',
   frage:'Gegen wie viele regelmäßige Gegner steht jemand im Plus?',
   min:p => Object.values(p.gegnerGrp).filter(a => a.length >= 15).length >= 6,
   wert:p => { const r = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return r.filter(a => a.filter(s => s.win).length * 2 > a.length).length / r.length; },
   ev:p => { const r = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return `gegen ${r.filter(a => a.filter(s => s.win).length * 2 > a.length).length} von `
          + `${r.length} regelmäßigen Gegnern im Plus`; },
   mindText:'ab 6 Gegnern mit je 15 Duellen'},

  {id:'zweiteluft', name:'Die zweite Luft', quelle:'Die zweite Luft', art:'leistung', zufall:'',
   frage:'Wie viel stärker läuft es ab der vierten Partie eines Spieltags?',
   min:p => { const b = block(p); return b.spaet.length >= 25 && b.frueh.length >= 25; },
   wert:p => { const b = block(p); return quote(b.spaet) - quote(b.frueh); },
   ev:p => { const b = block(p);
     return `${pct(quote(b.spaet))} % ab der vierten Partie, ${pct(quote(b.frueh))} % davor`; },
   mindText:'ab 25 Partien in jedem Block'},

  {id:'kopfhoch', name:'Der Tagesabschluss', quelle:'Der Tagesabschluss', art:'konstanz', zufall:'',
   frage:'Wie viele eigene Spieltage enden nicht negativ?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return t.filter(a => a.filter(s => s.win).length * 2 >= a.length).length / t.length; },
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return `${t.filter(a => a.filter(s => s.win).length * 2 >= a.length).length} von `
          + `${t.length} Spieltagen nicht negativ`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  // ── Vier Kandidaten in der zweiten Fassung ───────────────────────
  // Die erste Fassung vergleicht mit der EIGENEN Quote. Das ist rechnerisch
  // eine Umkehrung der Rangliste: wer hoch steht, hat einen hohen Abzug, wer
  // tief steht, einen niedrigen. Verglichen wird deshalb mit der ERWARTUNG
  // derselben Partien — dann hebt sich das Niveau heraus, und uebrig bleibt,
  // was jemand aus der Lage gemacht hat.
  {id:'gleichauf2', name:'Auf Augenhöhe (2. Fassung)', quelle:'Auf Augenhöhe', art:'ereignis', zufall:'quote',
   frage:'Wie weit liegt die Quote in offenen Partien über der Rechnung, die sie offen sah?',
   min:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55).length >= 25,
   wert:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return quote(d) - d.reduce((n, s) => n + s.exp, 0) / d.length; },
   ev:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return `${pct(quote(d))} % in ${d.length} offenen Partien, erwartet waren `
          + `${pct(d.reduce((n, s) => n + s.exp, 0) / d.length)} %`; },
   mindText:'ab 25 offenen Partien'},

  {id:'punktgenau2b', name:'Der Erwartungstreue (2. Fassung)', quelle:'Der Erwartungstreue', art:'ereignis', zufall:'quote',
   frage:'Wessen Laufbahn trifft die Erwartung am genauesten, gemessen in Standardfehlern?',
   min:p => p.games >= 60,
   // Der Abstand in Standardfehlern statt in Prozentpunkten: bei mehr Partien
   // wird derselbe Prozentpunkt zu einer groesseren Abweichung, und damit
   // haengt der Wert nicht mehr an der Spielzahl.
   wert:p => -Math.abs(p.q - p.expQ) * Math.sqrt(p.games),
   ev:p => `${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet, aus ${p.games} Partien`,
   mindText:'ab 60 Partien'},

  {id:'zweiteluft2', name:'Die zweite Luft (2. Fassung)', quelle:'Die zweite Luft', art:'ereignis', zufall:'quote',
   frage:'Wie viel besser als die Rechnung läuft es ab der vierten Partie eines Tages?',
   min:p => { const b = block(p); return b.spaet.length >= 25 && b.frueh.length >= 25; },
   wert:p => { const b = block(p);
     const ab = a => quote(a) - a.reduce((n, s) => n + s.exp, 0) / a.length;
     return ab(b.spaet) - ab(b.frueh); },
   ev:p => { const b = block(p);
     const ab = a => quote(a) - a.reduce((n, s) => n + s.exp, 0) / a.length;
     return `${pp(ab(b.spaet))} Punkte über der Rechnung ab der vierten Partie, `
          + `${pp(ab(b.frueh))} davor`; },
   mindText:'ab 25 Partien in jedem Block'},

  {id:'rollenfest2', name:'Favorit wie Außenseiter (2. Fassung)', quelle:'Favorit wie Außenseiter', art:'konstanz', zufall:'',
   frage:'Liegt jemand als Favorit genauso weit über der Rechnung wie als Außenseiter?',
   min:p => p.partien.filter(s => s.exp > 0.55).length >= 20
         && p.partien.filter(s => s.exp < 0.45).length >= 20,
   wert:p => { const ab = a => quote(a) - a.reduce((n, s) => n + s.exp, 0) / a.length;
     return -Math.abs(ab(p.partien.filter(s => s.exp > 0.55))
                    - ab(p.partien.filter(s => s.exp < 0.45))); },
   ev:p => { const ab = a => quote(a) - a.reduce((n, s) => n + s.exp, 0) / a.length;
     return `${pp(ab(p.partien.filter(s => s.exp > 0.55)))} Punkte als Favorit, `
          + `${pp(ab(p.partien.filter(s => s.exp < 0.45)))} als Außenseiter`; },
   mindText:'ab 20 Partien in jeder Lage'},

  {id:'schwaechstertag', name:'Der schwächste Tag', quelle:'Der schwächste Tag', art:'konstanz', zufall:'',
   frage:'Wie gut ist der schlechteste Spieltag einer Laufbahn noch?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => Math.min(...Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote)),
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return `schwächster von ${t.length} Spieltagen: ${pct(Math.min(...t.map(quote)))} %`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'}
];

function block(p){
  const frueh = [], spaet = [];
  Object.values(p.tagGrp).forEach(a => {
    a.slice().sort((x, y) => x.ts - y.ts).forEach((s, i) => (i < 3 ? frueh : spaet).push(s));
  });
  return {frueh, spaet};
}

// ── Die vier Tore ───────────────────────────────────────────────────
const korr = (a, b) => {
  const n = a.length; if(n < 3) return 0;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sa = 0, sb = 0, sab = 0;
  for(let i = 0; i < n; i++){ sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2;
    sab += (a[i] - ma) * (b[i] - mb); }
  return (sa && sb) ? sab / Math.sqrt(sa * sb) : 0;
};
const qRang = (() => {
  const l = IDS.filter(id => P[id].games >= 30).sort((a, b) => P[b].q - P[a].q);
  const o = {}; l.forEach((id, i) => { o[id] = i + 1; });
  return {rang:o, n:l.length};
})();

const ergebnis = K.map(k => {
  const drin = IDS.filter(id => P[id].games >= 30 && k.min(P[id]));
  const werte = drin.map(id => ({id, v:k.wert(P[id]), ev:k.ev(P[id]), spiele:P[id].games}));
  werte.sort((a, b) => b.v - a.v);
  const vs = werte.map(x => x.v);
  const mittel = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
  const sd = streu(vs);
  const halter = werte[0] || null;
  return {
    id:k.id, name:k.name, quelle:k.quelle, art:k.art, zufall:k.zufall,
    frage:k.frage, mindText:k.mindText,
    imRennen:drin.length, ligaGewertet:qRang.n,
    halter:halter ? name(halter.id) : '—',
    halterSpiele:halter ? halter.spiele : 0,
    halterRang:halter ? qRang.rang[halter.id] : 0,
    beleg:halter ? halter.ev : '',
    ausschlag: sd ? (halter.v - mittel) / sd : 0,
    // Haengt der Wert an der Spielzahl? Gerechnet ueber alle, die im Rennen
    // stehen — genau die Frage, die §C39 mit 0,35 deckelt.
    korrSpiele: korr(werte.map(x => x.v), werte.map(x => x.spiele)),
    // Und haengt er an der Siegquote? Ein Rekord, der die Rangliste
    // wiederholt, gehoert nicht in den Katalog [§C35].
    korrQuote: korr(werte.map(x => x.v), werte.map(x => P[x.id].q)),
    rangfolge: werte.slice(0, 5).map(x => ({name:name(x.id), rang:qRang.rang[x.id],
      wert:x.v, ev:x.ev, spiele:x.spiele}))
  };
});

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
    return {je, monat:Math.round(monat), rekord:Math.round(rekord),
      rekorde:CHRONICLES.length, wertRekord:PRESTIGE_REKORD,
      artGewicht:PRESTIGE_ART,
      insignien:INSIGNIEN.map(x=>({name:x.name, min:x.min}))};
  })())`));
})();

const aus = {
  gebaut:new Date().toISOString().slice(0, 16).replace('T', ' '),
  laufbahn,
  partien:MS.length, spieler:qRang.n,
  spielzahlen:IDS.filter(id => P[id].games >= 30)
    .sort((a, b) => P[b].games - P[a].games)
    .map(id => ({name:name(id), spiele:P[id].games, quote:pct(P[id].q), rang:qRang.rang[id]})),
  kandidaten:ergebnis
};
fs.writeFileSync(__dirname + '/.rekord-vorschlag.json', JSON.stringify(aus, null, 1));
console.log('Kandidaten: ' + ergebnis.length + ' · gewertete Spieler: ' + qRang.n);
ergebnis.forEach(e => console.log('  %s  Halter %s (Rang %d/%d)  Rennen %d  aus %s  rSpiele %s  rQuote %s',
  e.name.padEnd(26), e.halter.padEnd(9), e.halterRang, e.ligaGewertet, e.imRennen,
  e.ausschlag.toFixed(2), e.korrSpiele.toFixed(2), e.korrQuote.toFixed(2)));
