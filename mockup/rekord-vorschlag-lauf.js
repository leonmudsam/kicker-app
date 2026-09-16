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
const LIGA_ERSTER = IDS.filter(id => P[id].games >= 30)
  .sort((a, b) => P[b].q - P[a].q)[0];

const quote = a => a.length ? a.filter(s => s.win).length / a.length : 0;
const streu = a => { if(a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length); };
const pct = v => Math.round(v * 100);
// Eine Dezimalzahl traegt hier ein Komma — die Oberflaeche der App schreibt
// „6,9 Gegentore", und ein Beleg dieser Seite ist derselbe Satz [§C27].
const komma = (v, n) => (Number(v) || 0).toFixed(n == null ? 1 : n).replace('.', ',');
const pp = v => (v >= 0 ? '+' : '') + Math.round(v * 100);

// ── Die Kandidaten ──────────────────────────────────────────────────
// `quelle` nennt die Monatschronik, deren Frage sie auf die Laufbahn hebt —
// derselbe Name, dasselbe Zeichen, nur die andere Zeitachse [§13.1]. `art`
// entscheidet das Prestige [§C34], `zufall` die Kammer [§C35]. Alle
// Kandidaten, deren Wert nicht mit der Siegquote laeuft, messen kein Koennen
// und stehen deshalb als Fuegung da: sie sollen jemandem gehoeren koennen,
// nicht jemanden auszeichnen.
// `sorte` sagt, WIE gemessen wird, und entscheidet damit, welche Tore fuer
// einen Kandidaten ueberhaupt gelten [§C35]: eine **Quote** mittelt ueber
// eine Laufbahn und muss erreichbar sein und weit ausschlagen; ein **Fund**
// ist ein einzelnes Zusammentreffen und darf selten sein und sogar
// unbesetzt bleiben — sonst waere es keiner. Die Quotentore auf einen Fund
// anzuwenden hiesse, das Seltene abzuschaffen.
const K = [
  {id:'gleichauf', name:'Auf Augenhöhe', quelle:'Auf Augenhöhe', art:'leistung', zufall:'', sorte:'quote',
   frage:'Wie viel besser läuft es in den Partien, die die Rechnung offen sah?',
   min:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55).length >= 25,
   wert:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return quote(d) - p.q; },
   ev:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return `${pct(quote(d))} % in ${d.length} offenen Partien, sonst ${pct(p.q)} %`; },
   mindText:'ab 25 offenen Partien'},

  {id:'steigerung', name:'Die Steigerung', quelle:'Die Steigerung', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit liegt das letzte Drittel der Laufbahn über dem ersten?',
   min:p => p.games >= 60,
   wert:p => { const n = Math.floor(p.games / 3);
     return quote(p.partien.slice(-n)) - quote(p.partien.slice(0, n)); },
   ev:p => { const n = Math.floor(p.games / 3);
     return `${pct(quote(p.partien.slice(-n)))} % im letzten Drittel, `
          + `${pct(quote(p.partien.slice(0, n)))} % im ersten`; },
   mindText:'ab 60 Partien'},

  {id:'punktgenau2', name:'Der Erwartungstreue', quelle:'Der Erwartungstreue', art:'konstanz', zufall:'', sorte:'quote',
   frage:'Wessen Laufbahn trifft die Elo-Erwartung am genauesten?',
   min:p => p.games >= 60,
   wert:p => -Math.abs(p.q - p.expQ),
   ev:p => `${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet`,
   mindText:'ab 60 Partien'},

  {id:'metronom', name:'Das Metronom', quelle:'Das Metronom', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit liegen bester und schwächster Monat auseinander?',
   min:p => Object.values(p.monatGrp).filter(a => a.length >= 8).length >= 3,
   wert:p => { const q = Object.values(p.monatGrp).filter(a => a.length >= 8).map(quote);
     return -(Math.max(...q) - Math.min(...q)); },
   ev:p => { const q = Object.values(p.monatGrp).filter(a => a.length >= 8).map(quote);
     return `${pct(Math.min(...q))} % im schwächsten, ${pct(Math.max(...q))} % im besten von `
          + `${q.length} Monaten`; },
   mindText:'ab 3 Monaten mit je 8 Partien'},

  {id:'beidseitig', name:'Der Beidfüßige', quelle:'Der Beidfüßige', art:'konstanz', zufall:'', sorte:'quote',
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

  {id:'rollenfest', name:'Favorit wie Außenseiter', quelle:'Favorit wie Außenseiter', art:'konstanz', zufall:'', sorte:'quote',
   frage:'Spielt jemand als Favorit genauso wie als Außenseiter?',
   min:p => p.partien.filter(s => s.exp > 0.55).length >= 20
         && p.partien.filter(s => s.exp < 0.45).length >= 20,
   wert:p => -Math.abs(quote(p.partien.filter(s => s.exp > 0.55))
                     - quote(p.partien.filter(s => s.exp < 0.45))),
   ev:p => `${pct(quote(p.partien.filter(s => s.exp > 0.55)))} % als Favorit, `
         + `${pct(quote(p.partien.filter(s => s.exp < 0.45)))} % als Außenseiter`,
   mindText:'ab 20 Partien in jeder Lage'},

  {id:'gleichmut', name:'Der Gleichmut', quelle:'Der Gleichmut', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie gleichmäßig fallen die Ergebnisse aus?',
   min:p => p.games >= 60,
   wert:p => -streu(p.partien.map(s => s.gf - s.ga)),
   ev:p => `${komma(streu(p.partien.map(s => s.gf - s.ga)))} Tore Streuung um `
         + `${p.gd / p.games < 0 ? '−' : '+'}${komma(Math.abs(p.gd / p.games))} im Schnitt`,
   mindText:'ab 60 Partien'},

  {id:'wechselhaft', name:'Der Wechselhafte', quelle:'Der Wechselhafte', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wessen Spieltage sehen am wenigsten wie der andere aus?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => { const q = Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote);
     return Math.sqrt(q.reduce((x, y) => x + (y - p.q) * (y - p.q), 0) / q.length); },
   ev:p => { const q = Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote);
     return `${pct(Math.min(...q))} % am schwächsten, ${pct(Math.max(...q))} % am stärksten `
          + `von ${q.length} Spieltagen`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  {id:'kontrast', name:'Der Kontrast', quelle:'Der Kontrast', art:'ereignis', zufall:'quote', sorte:'quote',
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

  {id:'angstfrei', name:'Ohne Angstgegner', quelle:'Ohne Angstgegner', art:'leistung', zufall:'', sorte:'quote',
   frage:'Wie gut läuft es gegen den unangenehmsten Gegner?',
   min:p => Object.values(p.gegnerGrp).filter(a => a.length >= 15).length >= 6,
   wert:p => Math.min(...Object.values(p.gegnerGrp).filter(a => a.length >= 15).map(quote)),
   ev:p => { const gg = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return `${gg.length} regelmäßige Gegner, gegen keinen unter `
          + `${pct(Math.min(...gg.map(quote)))} %`; },
   mindText:'ab 6 Gegnern mit je 15 Duellen'},

  {id:'breitenwirkung', name:'Gegen jeden bestanden', quelle:'Gegen jeden bestanden', art:'leistung', zufall:'', sorte:'quote',
   frage:'Gegen wie viele regelmäßige Gegner steht jemand im Plus?',
   min:p => Object.values(p.gegnerGrp).filter(a => a.length >= 15).length >= 6,
   wert:p => { const r = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return r.filter(a => a.filter(s => s.win).length * 2 > a.length).length / r.length; },
   ev:p => { const r = Object.values(p.gegnerGrp).filter(a => a.length >= 15);
     return `gegen ${r.filter(a => a.filter(s => s.win).length * 2 > a.length).length} von `
          + `${r.length} regelmäßigen Gegnern im Plus`; },
   mindText:'ab 6 Gegnern mit je 15 Duellen'},

  {id:'zweiteluft', name:'Die zweite Luft', quelle:'Die zweite Luft', art:'leistung', zufall:'', sorte:'quote',
   frage:'Wie viel stärker läuft es ab der vierten Partie eines Spieltags?',
   min:p => { const b = block(p); return b.spaet.length >= 25 && b.frueh.length >= 25; },
   wert:p => { const b = block(p); return quote(b.spaet) - quote(b.frueh); },
   ev:p => { const b = block(p);
     return `${pct(quote(b.spaet))} % ab der vierten Partie, ${pct(quote(b.frueh))} % davor`; },
   mindText:'ab 25 Partien in jedem Block'},

  {id:'kopfhoch', name:'Der Tagesabschluss', quelle:'Der Tagesabschluss', art:'konstanz', zufall:'', sorte:'quote',
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
  {id:'gleichauf2', name:'Auf Augenhöhe (2. Fassung)', quelle:'Auf Augenhöhe', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit liegt die Quote in offenen Partien über der Rechnung, die sie offen sah?',
   min:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55).length >= 25,
   wert:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return quote(d) - d.reduce((n, s) => n + s.exp, 0) / d.length; },
   ev:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return `${pct(quote(d))} % in ${d.length} offenen Partien, erwartet waren `
          + `${pct(d.reduce((n, s) => n + s.exp, 0) / d.length)} %`; },
   mindText:'ab 25 offenen Partien'},

  {id:'punktgenau2b', name:'Der Erwartungstreue (2. Fassung)', quelle:'Der Erwartungstreue', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wessen Laufbahn trifft die Erwartung am genauesten, gemessen in Standardfehlern?',
   min:p => p.games >= 60,
   // Der Abstand in Standardfehlern statt in Prozentpunkten: bei mehr Partien
   // wird derselbe Prozentpunkt zu einer groesseren Abweichung, und damit
   // haengt der Wert nicht mehr an der Spielzahl.
   wert:p => -Math.abs(p.q - p.expQ) * Math.sqrt(p.games),
   ev:p => `${pct(p.q)} % gespielt, ${pct(p.expQ)} % erwartet, aus ${p.games} Partien`,
   mindText:'ab 60 Partien'},

  {id:'zweiteluft2', name:'Die zweite Luft (2. Fassung)', quelle:'Die zweite Luft', art:'ereignis', zufall:'quote', sorte:'quote',
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

  {id:'rollenfest2', name:'Favorit wie Außenseiter (2. Fassung)', quelle:'Favorit wie Außenseiter', art:'konstanz', zufall:'', sorte:'quote',
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

  {id:'schwaechstertag', name:'Der schwächste Tag', quelle:'Der schwächste Tag', art:'konstanz', zufall:'', sorte:'quote',
   frage:'Wie gut ist der schlechteste Spieltag einer Laufbahn noch?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => Math.min(...Object.values(p.tagGrp).filter(a => a.length >= 3).map(quote)),
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return `schwächster von ${t.length} Spieltagen: ${pct(Math.min(...t.map(quote)))} %`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  // ═══ ZWEITE RUNDE: achtzehn weitere ═══════════════════════════════
  // Die erste Runde hob die Fragen der Monatschroniken auf die Laufbahn.
  // Fuenf bestanden, und alle fuenf messen eine Abweichung ueber viele
  // Partien. Was dem Katalog danach noch fehlt, sind zwei andere Sorten:
  //
  //   Die FUeGUNG DER AUSLOSUNG — wer welches Los zieht, welchen Partner,
  //   welchen Gegner, welchen Wochentag. Das waehlt niemand, also kann es
  //   jedem zufallen, und es hat mit Koennen nichts zu tun.
  //
  //   Der MOMENT IM TAG — die erste Partie, die letzte, der Tag nach einem
  //   Fehlstart, die Rueckkehr nach einer Pause. Jeder Spieltag bringt
  //   davon je einen, unabhaengig davon, wie viele Partien jemand spielt.
  //
  // Dazu vier FUNDE: einzelne Zusammentreffen, die selten sein duerfen. Sie
  // sind die einzige Sorte, die ein Gelegenheitsspieler an einem einzigen
  // Nachmittag holen kann — und genau deshalb gehoert sie dazu.

  // ── Die Fuegung der Auslosung ────────────────────────────────────
  {id:'ausgelost', name:'Der Ausgeloste', quelle:'Auf Augenhöhe', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wem fällt das ausgeglichenste Los zu?',
   min:p => p.games >= 60,
   wert:p => p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55).length / p.games,
   ev:p => { const d = p.partien.filter(s => s.exp >= 0.45 && s.exp <= 0.55);
     return `${pct(d.length / p.games)} % der Partien auf Augenhöhe, ${d.length} von ${p.games}`; },
   mindText:'ab 60 Partien'},

  {id:'herausgefordert', name:'Der Herausgeforderte', quelle:'Der schwerste Tag', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wer ging über die ganze Laufbahn am häufigsten als Außenseiter ins Spiel?',
   min:p => p.games >= 60,
   wert:p => -p.expQ,
   ev:p => `${pct(p.expQ)} % mittlere Siegchance über ${p.games} Partien`,
   mindText:'ab 60 Partien'},

  {id:'wandergeselle', name:'Der Wandergeselle', quelle:'Der Kontrast', art:'konstanz', zufall:'', sorte:'quote',
   frage:'Bei wem ist es am gleichgültigsten, wer daneben steht?',
   min:p => Object.values(p.partnerGrp).filter(a => a.length >= 12).length >= 4,
   wert:p => -streu(Object.values(p.partnerGrp).filter(a => a.length >= 12).map(quote)),
   ev:p => { const q = Object.values(p.partnerGrp).filter(a => a.length >= 12).map(quote);
     return `${pp(streu(q))} Punkte Streuung über ${q.length} regelmäßige Partner`; },
   mindText:'ab 4 Partnern mit je 12 Partien'},

  {id:'wochentagsfest', name:'Der Wochentagsfeste', quelle:'Das Metronom', art:'konstanz', zufall:'', sorte:'quote',
   frage:'Bei wem spielt es keine Rolle, welcher Wochentag es ist?',
   min:p => Object.values(p.wtagGrp).filter(a => a.length >= 12).length >= 3,
   wert:p => -streu(Object.values(p.wtagGrp).filter(a => a.length >= 12).map(quote)),
   ev:p => { const q = Object.values(p.wtagGrp).filter(a => a.length >= 12).map(quote);
     return `${pp(streu(q))} Punkte Streuung über ${q.length} Wochentage`; },
   mindText:'ab 3 Wochentagen mit je 12 Partien'},

  {id:'unbequem', name:'Der Unbequeme', quelle:'Ohne Angstgegner', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung läuft es gegen den Ersten der Liga?',
   min:p => (p.gegnerGrp[LIGA_ERSTER] || []).length >= 15 && p.id !== LIGA_ERSTER,
   wert:p => abw(p.gegnerGrp[LIGA_ERSTER]),
   ev:p => { const d = p.gegnerGrp[LIGA_ERSTER];
     return `${pp(abw(d))} Punkte über der Rechnung in ${d.length} Duellen gegen `
          + `${name(LIGA_ERSTER)}`; },
   mindText:'ab 15 Duellen gegen den Ersten'},

  {id:'selbstlaeufer', name:'Der Selbstläufer', quelle:'Der Kontrast', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung läuft es neben dem schwächsten regelmäßigen Partner?',
   min:p => schwachPartner(p) != null,
   wert:p => abw(p.partnerGrp[schwachPartner(p)]),
   ev:p => { const k = schwachPartner(p); const d = p.partnerGrp[k];
     return `${pp(abw(d))} Punkte über der Rechnung in ${d.length} Partien neben `
          + `${name(k)}`; },
   mindText:'ab 12 Partien neben dem schwächsten regelmäßigen Partner'},

  // ── Der Moment im Tag ────────────────────────────────────────────
  {id:'fehlstart', name:'Der Fehlstarter', quelle:'Der Tagesabschluss', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie oft wird ein Spieltag nach einer Auftaktniederlage noch positiv?',
   min:p => tageMit(p, a => !a[0].win, 3).length >= 8,
   wert:p => { const t = tageMit(p, a => !a[0].win, 3);
     return t.filter(a => a.filter(s => s.win).length * 2 > a.length).length / t.length; },
   ev:p => { const t = tageMit(p, a => !a[0].win, 3);
     return `${t.filter(a => a.filter(s => s.win).length * 2 > a.length).length} von `
          + `${t.length} Spieltagen nach einer Auftaktniederlage noch gewonnen`; },
   mindText:'ab 8 Spieltagen mit Auftaktniederlage'},

  {id:'anspieler', name:'Der Anspieler', quelle:'Die zweite Luft', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung liegt die erste Partie eines Spieltags?',
   min:p => tagesPartie(p, 'erste').length >= 20,
   wert:p => abw(tagesPartie(p, 'erste')),
   ev:p => { const d = tagesPartie(p, 'erste');
     return `${pp(abw(d))} Punkte über der Rechnung in ${d.length} Auftaktpartien, `
          + `${pct(quote(d))} % gewonnen`; },
   mindText:'ab 20 Auftaktpartien'},

  {id:'schlussmann', name:'Der Schlussmann', quelle:'Die zweite Luft', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung liegt die letzte Partie eines Spieltags?',
   min:p => tagesPartie(p, 'letzte').length >= 20,
   wert:p => abw(tagesPartie(p, 'letzte')),
   ev:p => { const d = tagesPartie(p, 'letzte');
     return `${pp(abw(d))} Punkte über der Rechnung in ${d.length} Schlusspartien, `
          + `${pct(quote(d))} % gewonnen`; },
   mindText:'ab 20 Schlusspartien'},

  {id:'standhaft', name:'Der Standhafte', quelle:'Der Tagesabschluss', art:'konstanz', zufall:'', sorte:'quote',
   frage:'An wie vielen eigenen Spieltagen bleibt jemand nicht ohne Sieg?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return t.filter(a => a.some(s => s.win)).length / t.length; },
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return `${t.filter(a => a.some(s => s.win)).length} von ${t.length} Spieltagen `
          + `mit mindestens einem Sieg`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  {id:'aufwaermen', name:'Die Aufwärmphase', quelle:'Die Steigerung', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'An wie vielen Spieltagen läuft die zweite Hälfte besser als die erste?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 4).length >= 10,
   wert:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 4);
     return t.filter(a => { const h = haelften(a);
       return quote(h[1]) > quote(h[0]); }).length / t.length; },
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 4);
     const n = t.filter(a => { const h = haelften(a); return quote(h[1]) > quote(h[0]); }).length;
     return `${n} von ${t.length} Spieltagen in der zweiten Hälfte stärker`; },
   mindText:'ab 10 Spieltagen mit je 4 Partien'},

  {id:'langstreckler', name:'Der Langstreckler', quelle:'Die zweite Luft', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung liegen die langen Spieltage?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 6).length >= 4,
   wert:p => abw([].concat(...Object.values(p.tagGrp).filter(a => a.length >= 6))),
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 6);
     const d = [].concat(...t);
     return `${pp(abw(d))} Punkte über der Rechnung an ${t.length} Tagen mit `
          + `6 oder mehr Partien`; },
   mindText:'ab 4 Spieltagen mit je 6 Partien'},

  {id:'rueckkehrer', name:'Der Rückkehrer', quelle:'Auf Augenhöhe', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'Wie weit über der Rechnung liegt die erste Partie nach einer Pause?',
   min:p => pause(p).length >= 8,
   wert:p => abw(pause(p)),
   ev:p => { const d = pause(p);
     return `${pp(abw(d))} Punkte über der Rechnung in ${d.length} Partien nach `
          + `mindestens ${PAUSE_TAGE} Tagen ohne eigenes Spiel`; },
   mindText:'ab 8 Rückkehrpartien'},

  {id:'buchhalter', name:'Der Buchhalter', quelle:'Die Punktlandung', art:'ereignis', zufall:'quote', sorte:'quote',
   frage:'An wie vielen Spieltagen geht das eigene Torkonto genau auf?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 12,
   wert:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return t.filter(a => a.reduce((n, s) => n + s.gf - s.ga, 0) === 0).length / t.length; },
   ev:p => { const t = Object.values(p.tagGrp).filter(a => a.length >= 3);
     return `${t.filter(a => a.reduce((n, s) => n + s.gf - s.ga, 0) === 0).length} von `
          + `${t.length} Spieltagen mit einem Torkonto von genau null`; },
   mindText:'ab 12 Spieltagen mit je 3 Partien'},

  // ── Vier Funde ───────────────────────────────────────────────────
  // Ein Fund darf selten sein und sogar unbesetzt bleiben [§C35]; die
  // Quotentore gelten fuer ihn nicht. Gemessen wird stattdessen, wie viele
  // ihn ueberhaupt schon einmal getroffen haben — bleibt mehr als die
  // Haelfte leer, ist die Sache zu selten, um ein Eintrag zu sein.
  // Dafuer braucht jeder Fund seine eigene Untergrenze (`abFund`): ein Lauf
  // von EINER Partie ist keine Serie, und ein einziges Spiel ohne Gegentor
  // ist noch kein Tag ohne Gegentor. Ohne diese Grenze traegt jeder
  // Spieler einen Wert, und der Deckel geht ins Leere.
  {id:'weisseweste', abFund:2, name:'Die weiße Weste', quelle:'Der makellose Tag', art:'ereignis', zufall:'fund', sorte:'fund',
   frage:'Wie viele Partien ohne ein einziges Gegentor an einem Spieltag?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 8,
   wert:p => Math.max(0, ...Object.values(p.tagGrp).map(a => a.filter(s => s.ga === 0).length)),
   ev:p => { const n = Math.max(0, ...Object.values(p.tagGrp).map(a => a.filter(s => s.ga === 0).length));
     return `${n} Partien ohne Gegentor am stärksten solchen Spieltag`; },
   mindText:'ab 8 Spieltagen mit je 3 Partien'},

  {id:'rundumschlag', abFund:3, name:'Der Rundumschlag', quelle:'Gegen jeden bestanden', art:'ereignis', zufall:'fund', sorte:'fund',
   frage:'Gegen wie viele verschiedene Gegner an einem Tag gewonnen, ohne gegen einen zu verlieren?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 8,
   wert:p => Math.max(0, ...Object.values(p.tagGrp).map(a => {
     const auf = {};
     a.forEach(s => s.geg.forEach(g => { if(g) (auf[g] = auf[g] || []).push(s.win); }));
     const rein = Object.keys(auf).filter(g => auf[g].every(Boolean));
     return Object.keys(auf).some(g => !auf[g].every(Boolean)) ? 0 : rein.length;
   })),
   ev:p => { const n = Math.max(0, ...Object.values(p.tagGrp).map(a => {
       const auf = {};
       a.forEach(s => s.geg.forEach(g => { if(g) (auf[g] = auf[g] || []).push(s.win); }));
       return Object.keys(auf).some(g => !auf[g].every(Boolean)) ? 0 : Object.keys(auf).length; }));
     return `${n} Gegner an einem Tag geschlagen, ohne gegen einen zu verlieren`; },
   mindText:'ab 8 Spieltagen mit je 3 Partien'},

  {id:'zahlendreher', abFund:1, name:'Der Zahlendreher', quelle:'Der Wiedergänger', art:'ereignis', zufall:'fund', sorte:'fund',
   frage:'Wie oft kommen an einem Tag ein Ergebnis und sein Spiegelbild beide vor?',
   min:p => Object.values(p.tagGrp).filter(a => a.length >= 3).length >= 8,
   wert:p => Object.values(p.tagGrp).filter(a => {
     const st = new Set(a.map(s => s.gf + ':' + s.ga));
     return a.some(s => s.gf !== s.ga && st.has(s.ga + ':' + s.gf));
   }).length,
   ev:p => { const n = Object.values(p.tagGrp).filter(a => {
       const st = new Set(a.map(s => s.gf + ':' + s.ga));
       return a.some(s => s.gf !== s.ga && st.has(s.ga + ':' + s.gf)); }).length;
     return `${n} Spieltage mit einem Ergebnis und seinem Spiegelbild`; },
   mindText:'ab 8 Spieltagen mit je 3 Partien'},

  {id:'serientaeter', abFund:2, name:'Der Serientäter', quelle:'Der Wiedergänger', art:'ereignis', zufall:'fund', sorte:'fund',
   frage:'Wie viele eigene Partien nacheinander endeten mit demselben Stand?',
   min:p => p.games >= 40,
   wert:p => { let best = 1, lauf = 1;
     for(let i = 1; i < p.partien.length; i++){
       const a = p.partien[i], b = p.partien[i - 1];
       lauf = (a.gf === b.gf && a.ga === b.ga) ? lauf + 1 : 1;
       if(lauf > best) best = lauf;
     }
     return best; },
   ev:p => { let best = 1, lauf = 1, stand = '';
     for(let i = 1; i < p.partien.length; i++){
       const a = p.partien[i], b = p.partien[i - 1];
       lauf = (a.gf === b.gf && a.ga === b.ga) ? lauf + 1 : 1;
       if(lauf > best){ best = lauf; stand = a.gf + ':' + a.ga; }
     }
     return `${best} Partien nacheinander${stand ? ' mit ' + stand : ''}`; },
   mindText:'ab 40 Partien'}
];

// ── Werkzeug der zweiten Runde ──────────────────────────────────────
// Der Abstand zur Rechnung, nicht zur eigenen Quote: gegen die EIGENE Quote
// gerechnet dreht eine Abweichung die Rangliste um — das ist das Ergebnis
// der ersten Runde, und jeder neue Kandidat folgt ihm.
function abw(a){
  if(!a || !a.length) return 0;
  return quote(a) - a.reduce((n, s) => n + s.exp, 0) / a.length;
}
// Die Partien eines Spieltags in Spielreihenfolge. `tagGrp` gruppiert, aber
// die Reihenfolge innerhalb einer Gruppe ist die des Einlesens.
function tagSort(a){ return a.slice().sort((x, y) => x.ts - y.ts); }
function tageMit(p, pruef, mind){
  return Object.values(p.tagGrp).filter(a => a.length >= (mind || 1))
    .map(tagSort).filter(pruef);
}
function tagesPartie(p, welche){
  return Object.values(p.tagGrp).filter(a => a.length >= 2).map(a => {
    const t = tagSort(a); return welche === 'erste' ? t[0] : t[t.length - 1]; });
}
function haelften(a){
  const t = tagSort(a), m = Math.floor(t.length / 2);
  return [t.slice(0, m), t.slice(-m)];
}
// Die erste Partie nach einer Pause ohne eigenes Spiel. Wer zurueckkommt,
// hat dieselbe Lage wie jeder andere — das waehlt niemand.
// Die DREI Tage sind gemessen, nicht geraten: bei sieben Tagen hatten
// gemessen vier von zwoelf Spielern gar keine Rueckkehr und der Median lag
// bei einer einzigen, also stand die Frage fuer die halbe Liga nie offen.
// Bei drei Tagen sind es zehn von zwoelf mit acht und mehr — und drei Tage
// sind fuer eine Liga, die mehrmals in der Woche spielt, eine Pause.
const PAUSE_TAGE = 3;
function pause(p){
  const t = p.partien.slice().sort((a, b) => a.ts - b.ts);
  const out = [];
  for(let i = 1; i < t.length; i++)
    if(t[i].ts - t[i - 1].ts >= PAUSE_TAGE * 864e5) out.push(t[i]);
  return out;
}
// Der regelmaessige Partner mit der schwaechsten eigenen Laufbahnquote.
function schwachPartner(p){
  const k = Object.keys(p.partnerGrp).filter(x => p.partnerGrp[x].length >= 12);
  if(k.length < 2) return null;
  return k.sort((a, b) => P[a].q - P[b].q)[0];
}

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
  // ── Kommt die Mitte ueberhaupt vor? ──────────────────────────────
  // Das bisherige Tor fragte nur nach dem HALTER. Ein Rekord, dessen
  // Bestmarke einem Spieler aus der Mitte gehoert, dahinter aber nur die
  // Spitze stehen laesst, ist beim naechsten Halterwechsel wieder ein
  // Rekord der Spitze — die Zahl von heute sagt nichts darueber, wem er
  // morgen gehoert. Gemessen wird deshalb das Podest: mindestens einer der
  // besten drei muss aus der UNTEREN Haelfte der Siegquote kommen.
  const untenAb = Math.ceil(qRang.n / 2);
  const dreiUnten = werte.slice(0, 3).filter(x => qRang.rang[x.id] > untenAb).length;
  // Und wie viele haben einen Fund ueberhaupt schon einmal getroffen? Fuer
  // eine Quote ist das die Zahl im Rennen, fuer einen Fund die eigentliche
  // Frage [§C35].
  const belegt = werte.filter(x => x.v >= (k.abFund || 1)).length;
  // Wie viele halten die Bestmarke punktgleich? Halten sie mehrere, tragen
  // sie alle [§C32] — und der Grundwert teilt sich durch ihre Zahl [§C34].
  // Bei „Der Serientaeter" sind es gemessen fuenf, und das ist der Grund,
  // warum sein Ausschlag so klein ist: die Spitze ist ein Plateau.
  const gleich = halter ? werte.filter(x => x.v === halter.v).length : 0;
  return {
    id:k.id, name:k.name, quelle:k.quelle, art:k.art, zufall:k.zufall,
    sorte:k.sorte || 'quote', dreiUnten, belegt, untenAb, abFund:k.abFund || 0, gleich,
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
    // Welche Namen der Katalog als Monatschronik fuehrt und welche als
    // Liga-Rekord. Die Seite schrieb „Monatschronik ‚Der Wiedergaenger'"
    // ueber einen Eintrag, den es nur als Liga-Rekord gibt — die Herkunft
    // gehoert gelesen, nicht geraten.
    const herkunft = {};
    DISZIPLINEN.forEach(d => { herkunft[d.name] =
      (d.monat ? 'chronik' : '') + (d.allzeit ? (d.monat ? '+rekord' : 'rekord') : ''); });
    return {je, monat:Math.round(monat), rekord:Math.round(rekord),
      rekorde:CHRONICLES.length, wertRekord:PRESTIGE_REKORD,
      artGewicht:PRESTIGE_ART, herkunft,
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
ergebnis.forEach(e => console.log('  %s  Halter %s (Rang %d/%d)  Rennen %d  aus %s  rSpiele %s  rQuote %s  unten %d',
  e.name.padEnd(26), e.halter.padEnd(9), e.halterRang, e.ligaGewertet, e.imRennen,
  e.ausschlag.toFixed(2), e.korrSpiele.toFixed(2), e.korrQuote.toFixed(2), e.dreiUnten));

// Der Bericht steht. Die Zeitgeber der App laufen weiter und rufen `loadAll`
// gegen eine Attrappe von Supabase; deren Fehler landet in einem Handler, der
// `esc` auf ein Proxy-Objekt wirft. Das hat mit dem Lauf nichts zu tun.
process.exit(0);
