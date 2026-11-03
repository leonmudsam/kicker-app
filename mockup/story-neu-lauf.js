// Neue Stories, an den echten Partien gemessen: Anlässe und Grafiken, die es
// in der App noch nicht gibt. Der Lauf rechnet jeden Entwurf über alle 616
// Partien bis Oktober — mit den Zahlen der App (Elo vor und nach jeder
// Partie aus `getGlobalSim().history`, die Siegchance `exp_a`, die
// Rangliste mit `_storyRangFrei`, die Leiter der Meilensteine
// `_ladderCrossing`) — und hält fest, wie oft er ausgelöst hätte und welche
// Fälle die besten Beispiele sind. Die Karten zeichnet `story-neu-seite.js`.
//
//   node tools/build.mjs && node mockup/story-neu-lauf.js && node mockup/story-logik-seite.js
//
// Die Uhr ist die der Liga (Europe/Berlin): Tage, Wochen, Monate und
// Uhrzeiten wie auf den Telefonen der Liga.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {createRuntime} = require(path.join(ROOT, 'tests', 'runtime.js'));

const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const NAME = Object.fromEntries(IDS.map((id, i) => [id, NAMES[i]]));
const liga = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'oktober.txt'), 'utf8').trim().split(';').map((row, i) => {
  const f = row.split(',').map(Number), pos = j => f[4 + j] === 0 ? 'atk' : 'def';
  return {id:'o' + String(i).padStart(4, '0'), a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3), score_a:f[8], score_b:f[9],
    winner:f[10] === 0 ? 'A' : 'B', exp_a:f[11] / 1000, created_at:new Date(f[12] * 1000).toISOString(), deltas:{}};
}).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

const {K, setNow} = createRuntime();
setNow(Date.parse(liga[liga.length - 1].created_at) + 7 * 864e5);
K(`players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5, avatar_id:null})))};
  matches = ${JSON.stringify(liga)};
  seasons = []; invalidateCache();
  const _d = new Map(simulateEloWithSliders(matches).history.map(h => [h.matchId, h.deltas]));
  matches.forEach(m => { m.deltas = _d.get(m.id) || {}; }); invalidateCache(); 0`);

const H = new Map(JSON.parse(K(`JSON.stringify(getGlobalSim().history.map(h => [h.matchId, {vor:h.eloBefore, nach:h.eloAfter}]))`)));
const FREI = JSON.parse(K(`JSON.stringify(matches.map(m => _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei))`));
const AV = JSON.parse(K(`JSON.stringify(Object.fromEntries(players.map(p => [p.id, avHtml(p, '', {})])))`));
const IC = JSON.parse(K(`JSON.stringify(Object.fromEntries(['clock', 'chevron', 'boomerang', 'scaleBalance', 'flame', 'target',
  'stepsUp', 'spitzenwechsel', 'hundred', 'chartBar', 'trendUp'].map(k => [k, svgI(k)])))`));
// Die Marken der Leiter, einmal aus der App gelesen.
const LEITER = JSON.parse(K(`JSON.stringify(Array.from({length:10000}, (_, i) => i + 1).filter(v => _ladderCrossing(v - 1, v, 1) === v))`));

// ── Grundlagen je Partie ────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const tagKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const sidOf = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const wocheVon = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const P = liga.map((m, i) => {
  const t = Date.parse(m.created_at), A = [m.a1, m.a2], B = [m.b1, m.b2], aw = m.winner === 'A';
  const h = H.get(m.id) || {vor:{}, nach:{}};
  const delta = {};
  A.concat(B).forEach(id => { delta[id] = (h.nach[id] || 0) - (h.vor[id] || 0); });
  return {i, id:m.id, t, tag:tagKey(t), sid:sidOf(t), woche:wocheVon(t), W:aw ? A : B, L:aw ? B : A,
    hoch:Math.max(m.score_a, m.score_b), tief:Math.min(m.score_a, m.score_b),
    chance:{[m.a1]:m.exp_a, [m.a2]:m.exp_a, [m.b1]:1 - m.exp_a, [m.b2]:1 - m.exp_a},
    tore:{[m.a1]:m.score_a, [m.a2]:m.score_a, [m.b1]:m.score_b, [m.b2]:m.score_b},
    delta, nach:h.nach, frei:FREI[i]};
});
const spieltage = [...new Set(P.map(p => p.tag))];
// Wer in einer Saison bis zu einer Partie gespielt hat: die Rangliste der
// App zählt nur sie (`rankList`).
const imMonat = {};
P.forEach(p => { const s = imMonat[p.sid] || (imMonat[p.sid] = new Set()); p.W.concat(p.L).forEach(x => s.add(x)); p.dabei = new Set(s); });
const rangliste = p => [...p.dabei].map(id => ({id, elo:Math.round(p.nach[id] || 0)})).sort((a, b) => b.elo - a.elo);

// ── 1. Der Elo-Fluss des Tages ──────────────────────────────────────
// Wer wem an einem Tag Elo abgenommen hat: der Verlust jedes Verlierers
// geht zu gleichen Teilen an die beiden Sieger, je Paar verrechnet.
const fluss = spieltage.map(tag => {
  const ms = P.filter(p => p.tag === tag);
  const roh = {}, netto = {};
  ms.forEach(p => {
    p.L.forEach(l => p.W.forEach(w => { const k = l + '|' + w; roh[k] = (roh[k] || 0) + Math.abs(p.delta[l]) / 2; }));
    p.W.concat(p.L).forEach(x => { netto[x] = (netto[x] || 0) + p.delta[x]; });
  });
  const paare = [];
  Object.keys(roh).forEach(k => {
    const [l, w] = k.split('|'), zurueck = roh[w + '|' + l] || 0, v = roh[k] - zurueck;
    if(v > 0.5) paare.push({von:l, zu:w, v:Math.round(v)});
  });
  const geber = Object.keys(netto).filter(x => netto[x] < 0), nehmer = Object.keys(netto).filter(x => netto[x] > 0);
  const strom = paare.filter(f => geber.includes(f.von) && nehmer.includes(f.zu)).sort((a, b) => b.v - a.v);
  return {tag, partien:ms.length, strom, netto:Object.fromEntries(Object.entries(netto).map(([k, v]) => [k, Math.round(v)])),
    groesster:strom[0] || null};
});
const FLUSS_MIN = 8;
const flussTage = fluss.filter(f => f.partien >= FLUSS_MIN && f.strom.length >= 3);

// ── 2. Die Bilanz kippt ─────────────────────────────────────────────
// Die direkte Bilanz zweier Spieler über alle Duelle (gegeneinander am
// Tisch) wechselt den Führenden: erst führte der eine, jetzt der andere.
const duell = {}, kippt = [];
P.forEach(p => p.W.forEach(w => p.L.forEach(l => {
  const k = [w, l].sort().join('|'), d = duell[k] || (duell[k] = {a:k.split('|')[0], verlauf:[0], leader:null, tiefst:0});
  const diff = d.verlauf[d.verlauf.length - 1] + (w === d.a ? 1 : -1);
  d.verlauf.push(diff);
  const neu = diff > 0 ? d.a : diff < 0 ? k.split('|')[1] : null;
  if(neu && d.leader && neu !== d.leader && d.verlauf.length - 1 >= 12){
    // Wie lange und wie deutlich der andere vorher führte.
    const vorher = d.verlauf.slice(0, -1), spanne = Math.max(...vorher.map(x => (neu === d.a ? -x : x)));
    kippt.push({mid:p.id, t:p.t, tag:p.tag, neu, alt:d.leader, n:d.verlauf.length - 1, spanne,
      verlauf:d.verlauf.map(x => neu === d.a ? x : -x), stand:Math.abs(diff)});
  }
  if(neu) d.leader = neu;
})));

// ── 3. Jagd auf den Rekord ──────────────────────────────────────────
// Die längste Siegesserie aller Zeiten ist die Marke. Eine laufende Serie
// einen Sieg darunter ist eine Jagd, gleichauf ein eingestellter Rekord;
// darüber meldet die App schon den neuen Rekord (`streak_record`).
const serie = {}, jagd = [];
let rekord = 0, halter = [];
P.forEach(p => {
  const vorRekord = rekord, vorHalter = halter.slice();
  p.L.forEach(l => { serie[l] = 0; });
  p.W.forEach(w => { serie[w] = (serie[w] || 0) + 1; });
  p.W.forEach(w => {
    const s = serie[w];
    if(vorRekord >= 5 && (s === vorRekord - 1 || s === vorRekord))
      jagd.push({mid:p.id, t:p.t, tag:p.tag, pid:w, s, rekord:vorRekord, halter:vorHalter, art:s === vorRekord ? 'gleich' : 'jagd'});
  });
  p.W.forEach(w => { if(serie[w] > rekord){ rekord = serie[w]; halter = [w]; } else if(serie[w] === rekord && !halter.includes(w)) halter.push(w); });
});

// ── 4. Gegen die Erwartung (Woche) ──────────────────────────────────
// Je Spieler die Siege einer Woche gegen die Siege, die die Siegchancen
// vor jeder Partie erwarten ließen.
const wochen = [...new Set(P.map(p => p.woche))];
const erwartung = wochen.map(w => {
  const je = {};
  P.filter(p => p.woche === w).forEach(p => p.W.concat(p.L).forEach(x => {
    const j = je[x] || (je[x] = {pid:x, n:0, s:0, e:0});
    j.n++; j.e += p.chance[x]; if(p.W.includes(x)) j.s++;
  }));
  const l = Object.values(je).filter(j => j.n >= 6).map(j => Object.assign(j, {e:Math.round(j.e * 10) / 10, d:Math.round((j.s - j.e) * 10) / 10}))
    .sort((a, b) => b.d - a.d);
  return {woche:w, liste:l, oben:l[0] || null};
}).filter(x => x.liste.length >= 4);

// ── 5. Die Woche in Plätzen ─────────────────────────────────────────
// Der Platz jedes Spielers am Ende jedes Spieltags der Woche, im Monat des
// letzten Spieltags.
const plaetze = wochen.map(w => {
  const ms = P.filter(p => p.woche === w);
  if(!ms.length) return null;
  const sid = ms[ms.length - 1].sid;
  const tage = [...new Set(ms.filter(p => p.sid === sid).map(p => p.tag))];
  if(tage.length < 3) return null;
  const spalten = tage.map(tag => { const letzte = P.filter(p => p.tag === tag).pop();
    return {tag, frei:letzte.frei, rang:rangliste(letzte).map(x => x.id)}; });
  const alle = [...new Set(spalten.flatMap(s => s.rang))];
  const zeilen = alle.map(id => ({pid:id, platz:spalten.map(s => { const r = s.rang.indexOf(id); return r < 0 ? null : r + 1; })}));
  const sprung = zeilen.map(z => { const p = z.platz.filter(x => x != null); return {pid:z.pid, d:p.length > 1 ? p[0] - p[p.length - 1] : 0}; })
    .sort((a, b) => b.d - a.d);
  return {woche:w, sid, spalten:spalten.map(s => ({tag:s.tag, frei:s.frei})), zeilen, auf:sprung[0], ab:sprung[sprung.length - 1]};
}).filter(Boolean);
const PLATZ_MIN = 3;
const plaetzeTreffer = plaetze.filter(x => x.auf && x.auf.d >= PLATZ_MIN && x.spalten[x.spalten.length - 1].frei);

// ── 6. Die Spitze rückt zusammen ────────────────────────────────────
// Nach einem Vorsprung von mindestens 40 Elo liegen Platz 1 und 2 wieder
// höchstens 5 auseinander — erst in einer belastbaren Tabelle.
const eng = [], verlaufJe = {};
{
  let sid = null, maxGap = 0;
  P.forEach(p => {
    if(p.sid !== sid){ sid = p.sid; maxGap = 0; }
    if(!p.frei) return;
    const r = rangliste(p);
    if(r.length < 2) return;
    const gap = r[0].elo - r[1].elo;
    (verlaufJe[sid] = verlaufJe[sid] || []).push({mid:p.id, t:p.t, gap, eins:r[0].id, zwei:r[1].id});
    if(gap >= 40) maxGap = Math.max(maxGap, gap);
    if(maxGap >= 40 && gap <= 5){
      eng.push({mid:p.id, t:p.t, tag:p.tag, sid, gap, von:maxGap, eins:r[0], zwei:r[1], drei:r[2] || null,
        verlauf:verlaufJe[sid].map(x => x.gap)});
      maxGap = 0;
    }
  });
}

// ── 7. Kurz vor der Marke ───────────────────────────────────────────
// Wer am Morgen eines Tages nah an einer Marke steht, die die App feiert:
// dieselbe Leiter (1, 2,5, 5 je Zehnerpotenz), Partien ab 10, Siege ab
// 100, Tore ab 500.
const naechste = (wert, min) => LEITER.find(v => v > wert && v >= min) || null;
const stand = {};
const vorschau = [];
{
  const alleTage = [];
  for(let t = Date.parse(liga[0].created_at); t <= P[P.length - 1].t + 864e5; t += 864e5) alleTage.push(tagKey(t));
  let i = 0;
  [...new Set(alleTage)].forEach(tag => {
    // Der Stand vor dem Tag: alle Partien davor.
    while(i < P.length && P[i].tag < tag){
      const p = P[i++];
      p.W.concat(p.L).forEach(x => { const s = stand[x] || (stand[x] = {p:0, s:0, g:0, zuletzt:0});
        s.p++; if(p.W.includes(x)) s.s++; s.g += p.tore[x]; s.zuletzt = p.t; });
    }
    const t0 = new Date(tag + 'T15:00:00').getTime();
    const nah = [];
    Object.keys(stand).forEach(id => {
      const s = stand[id];
      if(t0 - s.zuletzt > 21 * 864e5) return;
      const m1 = naechste(s.p, 10), m2 = naechste(s.s, 100), m3 = naechste(s.g, 500);
      if(m1 && m1 - s.p <= 3) nah.push({pid:id, art:'Partie', wert:s.p, marke:m1, fehlt:m1 - s.p});
      if(m2 && m2 - s.s <= 3) nah.push({pid:id, art:'Sieg', wert:s.s, marke:m2, fehlt:m2 - s.s});
      if(m3 && m3 - s.g <= 20) nah.push({pid:id, art:'Tor', wert:s.g, marke:m3, fehlt:m3 - s.g});
    });
    if(nah.length) vorschau.push({tag, nah:nah.sort((a, b) => a.fehlt / (a.art === 'Tor' ? 10 : 1) - b.fehlt / (b.art === 'Tor' ? 10 : 1))});
  });
}

// ── 8. Die Uhr der Liga ─────────────────────────────────────────────
// Wann im Monat angestoßen wurde, je Stunde.
const uhrJe = {};
P.forEach(p => { const h = new Date(p.t).getHours(); const u = uhrJe[p.sid] || (uhrJe[p.sid] = new Array(24).fill(0)); u[h]++; });

// ── 9. Halbzeit gegen den Vormonat ──────────────────────────────────
// Am 15. die Siegquote des laufenden Monats gegen die des ganzen Vormonats,
// je Spieler mit mindestens fünf Partien in beiden.
const halbzeit = [];
[...new Set(P.map(p => p.sid))].forEach((sid, k, l) => {
  if(!k) return;
  const vor = l[k - 1], bis = new Date(sid + '-15T15:00:00').getTime();
  const q = (f) => { const je = {}; P.filter(f).forEach(p => p.W.concat(p.L).forEach(x => {
    const j = je[x] || (je[x] = {n:0, s:0}); j.n++; if(p.W.includes(x)) j.s++; })); return je; };
  const a = q(p => p.sid === vor), b = q(p => p.sid === sid && p.t <= bis);
  const zeilen = Object.keys(b).filter(x => a[x] && a[x].n >= 5 && b[x].n >= 5)
    .map(x => ({pid:x, vor:Math.round(a[x].s / a[x].n * 100), jetzt:Math.round(b[x].s / b[x].n * 100), n:b[x].n}))
    .sort((x, y) => (y.jetzt - y.vor) - (x.jetzt - x.vor));
  if(zeilen.length >= 4) halbzeit.push({sid, vor, zeilen});
});

// ── Beispiele ───────────────────────────────────────────────────────
const nimm = (l, f, n) => l.slice().sort(f).slice(0, n);
const aus = {
  partien:liga.length, spieltage:spieltage.length, wochen:wochen.length, av:AV, ic:IC, name:NAME,
  fluss:{min:FLUSS_MIN, n:flussTage.length, von:spieltage.length,
    ab50:fluss.filter(f => f.groesster && f.groesster.v >= 50).length, ab40:fluss.filter(f => f.groesster && f.groesster.v >= 40).length,
    bsp:nimm(flussTage, (a, b) => (b.groesster ? b.groesster.v : 0) - (a.groesster ? a.groesster.v : 0), 1)
      .concat(flussTage.slice(-1))},
  kippt:{n:kippt.length, paare:new Set(kippt.map(k => [k.neu, k.alt].sort().join('|'))).size,
    bsp:nimm(kippt, (a, b) => b.spanne - a.spanne, 1).concat(kippt.slice(-1))},
  jagd:{n:jagd.filter(j => j.art === 'jagd').length, gleich:jagd.filter(j => j.art === 'gleich').length,
    bsp:[jagd.filter(j => j.art === 'jagd').slice(-1)[0], jagd.filter(j => j.art === 'gleich').slice(-1)[0]].filter(Boolean)},
  erwartung:{n:erwartung.filter(x => x.oben && x.oben.d >= 2).length, ab3:erwartung.filter(x => x.oben && x.oben.d >= 3).length, von:erwartung.length,
    bsp:nimm(erwartung, (a, b) => b.oben.d - a.oben.d, 1).concat(erwartung.slice(-1))},
  plaetze:{min:PLATZ_MIN, n:plaetzeTreffer.length, von:plaetze.length,
    bsp:nimm(plaetzeTreffer, (a, b) => b.auf.d - a.auf.d, 1).concat(plaetzeTreffer.slice(-1))},
  eng:{n:eng.length, bsp:eng.slice(-2)},
  vorschau:{n:vorschau.length, bsp:vorschau.filter(v => v.nah.length >= 3).slice(-2)},
  uhr:{je:uhrJe},
  halbzeit:{n:halbzeit.length, bsp:halbzeit.slice(-1)},
};
fs.writeFileSync(path.join(__dirname, '.story-neu.json'), JSON.stringify(aus));
console.log(JSON.stringify({fluss:[aus.fluss.n, aus.fluss.von, aus.fluss.ab40, aus.fluss.ab50], erw3:aus.erwartung.ab3, kippt:[aus.kippt.n, aus.kippt.paare], jagd:[aus.jagd.n, aus.jagd.gleich],
  erwartung:[aus.erwartung.n, aus.erwartung.von], plaetze:[aus.plaetze.n, aus.plaetze.von], eng:aus.eng.n,
  vorschau:aus.vorschau.n, halbzeit:aus.halbzeit.n}));
