// Köpfe und Füße der Karte einer Partie, zweite Runde: Entwürfe, an den
// echten Partien gemessen. Der Lauf spielt alle 616 Partien bis Oktober nach,
// rechnet je Partie, welcher Kopf und welcher Fuß zutreffen würde, und wählt
// mit der Regel, die die Seite beschreibt: ein besonderer Ausgang zuerst,
// dann ein Befund nach Gewicht, das mit jedem Einsatz abklingt und für
// Seltenes steigt, sonst die Grundansicht, die am längsten nicht dran war.
// Festgehalten wird, wie oft jede Zeichnung käme, wie oft dieselbe
// hintereinander stünde, und ein ganzer Spieltag am Stück.
//
//   node tools/build.mjs && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js
//
// Elo, Siegchance, Rangliste und Gesichter kommen aus der App
// (`getGlobalSim().history`, `exp_a`, `_storyRangFrei`, `avHtml`); alles
// andere zählt der Lauf aus den Partien selbst. Die Uhr ist die der Liga.
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
const IC = JSON.parse(K(`JSON.stringify(Object.fromEntries(['clock', 'chevron', 'flame', 'flameBreak', 'crown', 'dayKing', 'weekKing',
  'calendar', 'target', 'stepsUp', 'hundred', 'trendUp', 'comeback', 'premiere', 'handshake', 'crossedSwords', 'bannbruch',
  'weisseWeste', 'thriller', 'underdog', 'peak', 'scaleBalance', 'dauerbrenner', 'marke', 'kontrast', 'leiterAuf', 'stopwatch',
  'spielfeld', 'boomerang', 'partnerHebel', 'rakete'].map(k => [k, svgI(k)])))`));

// ── Grundlagen je Partie ────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const tagKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const sidOf = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
const wocheVon = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const r1 = x => Math.round(x);
const P = liga.map((m, i) => {
  const t = Date.parse(m.created_at), A = [m.a1, m.a2], B = [m.b1, m.b2], aw = m.winner === 'A';
  const h = H.get(m.id) || {vor:{}, nach:{}};
  const delta = {};
  A.concat(B).forEach(id => { delta[id] = (h.nach[id] || 0) - (h.vor[id] || 0); });
  const pos = {[m.a1]:m.a1_pos, [m.a2]:m.a2_pos, [m.b1]:m.b1_pos, [m.b2]:m.b2_pos};
  // Die Sieger und Verlierer je in der Reihenfolge Abwehr, Sturm: so stehen
  // sie in jedem Kopf an derselben Stelle.
  const ord = l => l.slice().sort((a, b) => (pos[a] === 'def' ? 0 : 1) - (pos[b] === 'def' ? 0 : 1));
  return {i, id:m.id, t, tag:tagKey(t), sid:sidOf(t), woche:wocheVon(t), W:ord(aw ? A : B), L:ord(aw ? B : A), pos,
    hoch:Math.max(m.score_a, m.score_b), tief:Math.min(m.score_a, m.score_b),
    chance:aw ? m.exp_a : 1 - m.exp_a, delta, vorElo:h.vor, nachElo:h.nach, frei:FREI[i]};
});

// ── Der Stand vor und nach jeder Partie ─────────────────────────────
// Alles, was ein Kopf oder Fuß über die vier wissen kann, zählt dieser
// Durchlauf aus den Partien davor.
const S = {serie:{}, letzte:{}, tag:{}, tagElo:{}, h2h:{}, h2hFolge:{}, duo:{}, partner:{}, gesamt:{}, mon:{}, monSprung:{},
  monTage:{}, woche:{}, westen:{}, imMonat:{}};
let tagAkt = null, sidAkt = null, wocheAkt = null;
const leer = o => Object.keys(o).forEach(k => delete o[k]);
const duoKey = (a, b) => [a, b].sort().join('|');
const MARKEN = [50, 100, 150, 200, 250, 300, 400, 500];
const FAKT = [];
P.forEach(p => {
  if(p.tag !== tagAkt){ tagAkt = p.tag; leer(S.tag); leer(S.tagElo); }
  if(p.sid !== sidAkt){ sidAkt = p.sid; leer(S.mon); leer(S.monSprung); leer(S.monTage); }
  if(p.woche !== wocheAkt){ wocheAkt = p.woche; leer(S.woche); }
  const vier = p.W.concat(p.L);
  const im = S.imMonat[p.sid] || (S.imMonat[p.sid] = new Set());
  const dabeiVor = new Set(im);
  vier.forEach(x => im.add(x));
  const vor = {};
  vier.forEach(x => {
    vor[x] = {serie:S.serie[x] || 0, letzte:(S.letzte[x] || []).slice(-5), tag:Object.assign({s:0, n:0, folge:[]}, S.tag[x] && {s:S.tag[x].s, n:S.tag[x].n, folge:S.tag[x].folge.slice()}),
      tagElo:(S.tagElo[x] || []).slice(), mon:Object.assign({s:0, n:0}, S.mon[x]), gesamt:Object.assign({s:0, n:0}, S.gesamt[x]),
      monTage:new Set(S.monTage[x] || []).size, woche:Object.assign({s:0, n:0}, S.woche[x])};
  });
  // Die Rangliste des Monats vor und nach der Partie: wer im Monat schon
  // gespielt hat, nach Elo (`rankList`).
  const liste = (elo, wer) => [...wer].map(id => ({id, elo:r1(elo[id] || 0)})).sort((a, b) => b.elo - a.elo);
  const rangVor = liste(p.vorElo, dabeiVor), rangNach = liste(p.nachElo, im);
  const platz = (l, id) => l.findIndex(x => x.id === id) + 1;
  // Der Tag der Liga bis hierher, für das Rennen um den Spieler des Tages.
  const tagSiegeVor = Object.fromEntries(Object.keys(S.tag).map(k => [k, S.tag[k].s]));
  const kreuz = p.W.flatMap(w => p.L.map(l => ({w, l, s:S.h2h[w + '|' + l] || 0, n:(S.h2h[w + '|' + l] || 0) + (S.h2h[l + '|' + w] || 0)})));
  const duoVor = {W:Object.assign({s:0, n:0}, S.duo[duoKey(...p.W)]), L:Object.assign({s:0, n:0}, S.duo[duoKey(...p.L)])};
  const wocheVorAlle = JSON.parse(JSON.stringify(S.woche));
  const westenVor = (S.westen[p.sid] || []).slice();

  // ── danach ──
  vier.forEach(x => {
    const sieg = p.W.includes(x);
    S.serie[x] = sieg ? Math.max(0, S.serie[x] || 0) + 1 : Math.min(0, S.serie[x] || 0) - 1;
    (S.letzte[x] = S.letzte[x] || []).push(sieg ? 1 : 0);
    const t = S.tag[x] || (S.tag[x] = {s:0, n:0, folge:[]}); t.n++; if(sieg) t.s++; t.folge.push(sieg ? 1 : 0);
    const e = S.tagElo[x] || (S.tagElo[x] = []); e.push((e.length ? e[e.length - 1] : 0) + p.delta[x]);
    const mo = S.mon[x] || (S.mon[x] = {s:0, n:0, q:[], elo:[]}); mo.n++; if(sieg) mo.s++; mo.q.push(r1(mo.s / mo.n * 100)); mo.elo.push(r1(p.nachElo[x] || 0));
    const g = S.gesamt[x] || (S.gesamt[x] = {s:0, n:0}); g.n++; if(sieg) g.s++;
    (S.monTage[x] = S.monTage[x] || new Set()).add(p.tag);
    const wo = S.woche[x] || (S.woche[x] = {s:0, n:0}); wo.n++; if(sieg) wo.s++;
  });
  p.W.forEach(w => p.L.forEach(l => {
    S.h2h[w + '|' + l] = (S.h2h[w + '|' + l] || 0) + 1;
    (S.h2hFolge[w + '|' + l] = S.h2hFolge[w + '|' + l] || []).push(1);
    (S.h2hFolge[l + '|' + w] = S.h2hFolge[l + '|' + w] || []).push(0);
  }));
  [[p.W, 1], [p.L, 0]].forEach(([d, s1]) => { const k = duoKey(...d), q = S.duo[k] || (S.duo[k] = {s:0, n:0}); q.n++; q.s += s1; });
  [[p.W[0], p.W[1], 1], [p.W[1], p.W[0], 1], [p.L[0], p.L[1], 0], [p.L[1], p.L[0], 0]].forEach(([a, b, s1]) => {
    const q = (S.partner[a] = S.partner[a] || {})[b] || (S.partner[a][b] = {s:0, n:0}); q.n++; q.s += s1; });
  if(p.tief === 0) (S.westen[p.sid] = S.westen[p.sid] || []).push({mid:p.id, W:p.W, L:p.L, t:p.t});

  FAKT.push({p, vor, rangVor, rangNach, platz, tagSiegeVor, kreuz, duoVor, wocheVorAlle, westenVor,
    nach:Object.fromEntries(vier.map(x => [x, {serie:S.serie[x], tag:{s:S.tag[x].s, n:S.tag[x].n, folge:S.tag[x].folge.slice()},
      tagElo:S.tagElo[x].map(r1), mon:{s:S.mon[x].s, n:S.mon[x].n, q:S.mon[x].q.slice(), elo:S.mon[x].elo.slice()},
      gesamt:Object.assign({}, S.gesamt[x]), monTage:S.monTage[x].size, woche:Object.assign({}, S.woche[x])}])),
    tagSiegeNach:Object.fromEntries(Object.keys(S.tag).map(k => [k, S.tag[k].s])),
    tagNach:Object.fromEntries(Object.keys(S.tag).map(k => [k, {s:S.tag[k].s, n:S.tag[k].n}])),
    tagSpieler:Object.keys(S.tag).length,
    wocheNach:JSON.parse(JSON.stringify(S.woche)),
    monTageNach:Object.fromEntries(vier.map(x => [x, [...S.monTage[x]].sort()])),
    partnerNach:p.W.map(w => ({pid:w, liste:Object.keys(S.partner[w]).filter(x => S.partner[w][x].n >= 6)
      .map(x => ({pid:x, n:S.partner[w][x].n, q:r1(S.partner[w][x].s / S.partner[w][x].n * 100)})).sort((a, b) => b.q - a.q)})),
    h2hFolge:p.W.flatMap(w => p.L.map(l => ({w, l, folge:S.h2hFolge[w + '|' + l].slice(-12)}))),
    duoNach:{W:Object.assign({}, S.duo[duoKey(...p.W)]), L:Object.assign({}, S.duo[duoKey(...p.L)])},
    westen:(S.westen[p.sid] || []).slice()});
});

// ── Welche Köpfe zutreffen ──────────────────────────────────────────
// Jeder Kopf zeigt die vier Gesichter und den Endstand; was er dazu zeigt,
// braucht einen Grund. `gewicht` ist, wie viel er über diese Partie sagt.
// Die Grundansichten (Anzeigetafel, Torpucks, Elo-Strom) treffen immer zu
// und sagen alle gleich viel: sie wechseln sich ab.
const KOPF_GRUND = ['tafel', 'pucks', 'strom', 'erwartung'];
const KOPF_SPEZIAL = ['fotofinish', 'zunull', 'aussenseiter', 'kantersieg'];
function koepfe(F){
  const {p, vor} = F, out = [];
  const diff = p.hoch - p.tief;
  // Ein besonderer Ausgang ist selbst die Geschichte.
  if(diff === 1) out.push({key:'fotofinish', w:90, spezial:true});
  if(p.tief === 0) out.push({key:'zunull', w:92, spezial:true});
  if(p.chance < .35) out.push({key:'aussenseiter', w:94, spezial:true});
  if(diff >= 7 && p.tief > 0) out.push({key:'kantersieg', w:70, spezial:true});
  // Serie gegen Serie: auf beiden Seiten läuft etwas, oder einer bringt
  // eine lange mit.
  const sW = Math.max(...p.W.map(x => vor[x].serie)), sL = Math.max(...p.L.map(x => vor[x].serie));
  if((sW >= 3 && sL >= 2) || (sL >= 3 && sW >= 2) || sW >= 5 || sL >= 5) out.push({key:'serien', w:46 + Math.max(sW, sL)});
  // Gegen die Form: die Sieger kamen aus ihren letzten fünf mit zusammen
  // höchstens vier Siegen, die Verlierer mit mindestens sieben.
  const f5 = x => vor[x].letzte.reduce((a, c) => a + c, 0);
  if(p.W.concat(p.L).every(x => vor[x].letzte.length === 5)){
    const fw = p.W.reduce((a, x) => a + f5(x), 0), fl = p.L.reduce((a, x) => a + f5(x), 0);
    if(fl - fw >= 3) out.push({key:'form', w:36 + 2 * (fl - fw)});
  }
  // Der Tag bis hierher: ab der dritten Partie des Tages für alle vier.
  if(p.W.concat(p.L).every(x => vor[x].tag.n >= 2)) out.push({key:'tag', w:34 + Math.min(10, Math.min(...p.W.concat(p.L).map(x => vor[x].tag.n)))});
  // Kreuzduelle: mindestens zwölf Einzelduelle vorher, die Sieger mit
  // höchstens 40 Prozent davon.
  const kn = F.kreuz.reduce((a, c) => a + c.n, 0), ks = F.kreuz.reduce((a, c) => a + c.s, 0);
  if(kn >= 12 && ks / kn <= .4) out.push({key:'kreuz', w:40 + r1((.4 - ks / kn) * 60)});
  // Tabellenduell: in einer belastbaren Tabelle, mit einem der ersten drei
  // oder einem Abstand von mindestens vier Plätzen.
  if(p.frei){
    const r = p.W.concat(p.L).map(x => F.platz(F.rangNach, x)).filter(Boolean);
    if(r.length === 4 && Math.min(...r) <= 2 && Math.max(...r) - Math.min(...r) >= 4) out.push({key:'rang', w:30 + (Math.min(...r) === 1 ? 8 : 0)});
  }
  // Duo gegen Duo: beide haben mindestens sechsmal zusammen gespielt.
  if(F.duoVor.W.n >= 6 && F.duoVor.L.n >= 6) out.push({key:'duo', w:30 + Math.min(12, r1((F.duoVor.W.n + F.duoVor.L.n) / 4))});
  // Rechnung gegen Ergebnis: eine Grundansicht, wo die Siegchance zwischen
  // 35 und 65 Prozent lag; darunter ist es ein Außenseitersieg.
  KOPF_GRUND.filter(k => k !== 'erwartung' || (p.chance >= .35 && p.chance <= .65)).forEach(k => out.push({key:k, w:20, grund:true}));
  return out;
}

// ── Welche Füße zutreffen ───────────────────────────────────────────
// Ein Ereignis geschieht einmal (eine gerissene Serie, eine Marke, der
// Sprung an die Spitze) und geht vor; ein Zustand gilt über viele Partien
// (eine Serie, der Tag im Plus) und tritt zurück, wenn er eben schon stand.
function fuesse(F){
  const {p, vor, nach} = F, out = [];
  const add = (key, w, x, ereignis) => out.push({key, w, x, ereignis:!!ereignis});
  // Ereignisse
  const rissL = p.L.filter(x => vor[x].serie >= 5).sort((a, b) => vor[b].serie - vor[a].serie)[0];
  if(rissL) add('riss', 70 + vor[rissL].serie, {pid:rissL, n:vor[rissL].serie, folge:FAKT_LETZTE(rissL, F)}, true);
  if(p.frei){
    const eins = F.rangNach[0], zwei = F.rangNach[1];
    const neu = p.W.find(w => eins && eins.id === w && F.rangVor[0] && F.rangVor[0].id !== w);
    if(neu) add('spitze', 96, {pid:neu, liste:F.rangNach.slice(0, 5), vorher:F.rangVor[0].id}, true);
    else {
      const jagd = p.W.find(w => { const r = F.platz(F.rangNach, w); return r >= 2 && r <= 3 && eins.elo - F.rangNach[r - 1].elo <= 12 && p.delta[w] >= 10; });
      if(jagd) add('spitze', 58, {pid:jagd, liste:F.rangNach.slice(0, 5)});
    }
    const sprung = p.W.map(w => ({pid:w, vor:F.platz(F.rangVor, w), nach:F.platz(F.rangNach, w)}))
      .filter(x => x.vor && x.nach && x.vor - x.nach >= 2).sort((a, b) => (b.vor - b.nach) - (a.vor - a.nach))[0];
    if(sprung) add('rangsprung', 60 + 2 * (sprung.vor - sprung.nach), Object.assign(sprung, {liste:F.rangNach.slice(0, Math.max(6, sprung.vor)).map(x => x.id)}), true);
  }
  const marke = p.W.concat(p.L).map(x => {
    const g = nach[x].gesamt;
    if(p.W.includes(x) && MARKEN.includes(g.s)) return {pid:x, art:'sieg', wert:g.s, n:g.n};
    if(MARKEN.includes(g.n)) return {pid:x, art:'partie', wert:g.n, s:g.s};
    return null;
  }).filter(Boolean).sort((a, b) => b.wert - a.wert)[0];
  if(marke) add('zaehlwerk', 62 + Math.min(20, marke.wert / 20), marke, true);
  const kurz = p.W.map(x => { const s = nach[x].gesamt.s, ziel = MARKEN.find(m => m > s);
    return ziel && ziel - s === 1 && ziel >= 50 ? {pid:x, s, ziel, n:nach[x].gesamt.n} : null; }).filter(Boolean)[0];
  if(kurz) add('marke', 44, kurz);
  const fluch = F.h2hFolge.map(h => { const f = h.folge.slice(0, -1); let n = 0;
    for(let i = f.length - 1; i >= 0 && f[i] === 0; i--) n++; return n >= 5 ? {w:h.w, l:h.l, n, folge:h.folge} : null; })
    .filter(Boolean).sort((a, b) => b.n - a.n)[0];
  if(fluch) add('fluch', 66 + fluch.n, fluch, true);
  const kippt = F.kreuz.map(k => { const s = k.s + 1, n = k.n + 1; return n >= 16 && k.s * 2 <= k.n && s * 2 > n ? {w:k.w, l:k.l, s, n} : null; })
    .filter(Boolean)[0];
  if(kippt) add('kippt', 64, Object.assign(kippt, {folge:(F.h2hFolge.find(h => h.w === kippt.w && h.l === kippt.l) || {}).folge}), true);
  const jub = [];
  [['W', p.W], ['L', p.L]].forEach(([s, d]) => { const n = F.duoNach[s].n; if(n >= 25 && n % 25 === 0) jub.push({art:'duo', ids:d, n, s:F.duoNach[s].s}); });
  F.kreuz.forEach(k => { const n = k.n + 1; if(n >= 25 && n % 25 === 0) jub.push({art:'duell', ids:[k.w, k.l], n, s:k.s + 1}); });
  if(jub.length) add('jubilaeum', 56, jub.sort((a, b) => b.n - a.n)[0], true);
  if(p.tief === 0) add('westen', 74, {liste:F.westen.slice(-8), n:F.westen.length, sid:p.sid}, true);
  // Das Rennen um den Spieler des Tages: ein Sieger übernimmt allein die
  // Führung, ab drei Siegen.
  const allein = o => { const max = Math.max(0, ...Object.values(o)), l = Object.keys(o).filter(k => o[k] === max);
    return max > 0 && l.length === 1 ? l[0] : null; };
  const tagVorn = allein(F.tagSiegeNach);
  if(tagVorn && p.W.includes(tagVorn) && F.tagSiegeNach[tagVorn] >= 3 && allein(F.tagSiegeVor) !== tagVorn)
    add('tagesrennen', 52, {pid:tagVorn, liste:Object.keys(F.tagNach).map(k => ({pid:k, s:F.tagNach[k].s, n:F.tagNach[k].n}))
      .sort((a, b) => b.s - a.s || a.n - b.n).slice(0, 5)}, true);
  // Das Rennen um den Spieler der Woche: höchste Siegquote ab fünf Siegen.
  const wq = o => Object.keys(o).filter(k => o[k].s >= 5).map(k => ({pid:k, s:o[k].s, n:o[k].n, q:o[k].s / o[k].n}))
    .sort((a, b) => b.q - a.q || b.s - a.s);
  const wVor = wq(F.wocheVorAlle)[0], wNach = wq(F.wocheNach);
  if(wNach[0] && p.W.includes(wNach[0].pid) && (!wVor || wVor.pid !== wNach[0].pid))
    add('wochenrennen', 50, {pid:wNach[0].pid, liste:wNach.slice(0, 5).map(x => ({pid:x.pid, s:x.s, n:x.n, q:r1(x.q * 100)}))}, true);
  // Zustände
  const serie = p.W.filter(x => nach[x].serie >= 3).sort((a, b) => nach[b].serie - nach[a].serie)[0];
  if(serie) add('serie', 30 + 2 * Math.min(10, nach[serie].serie), {pid:serie, n:nach[serie].serie});
  const wende = p.W.filter(x => vor[x].serie <= -3).sort((a, b) => vor[a].serie - vor[b].serie)[0];
  if(wende) add('wende', 34 - vor[wende].serie, {pid:wende, n:-vor[wende].serie, folge:FAKT_LETZTE(wende, F)});
  if(F.duoVor.W.n === 0) add('premiere', 18, {ids:p.W});
  const plus = p.W.find(x => vor[x].tagElo.length >= 3 && Math.min(...vor[x].tagElo) <= -25
    && vor[x].tagElo[vor[x].tagElo.length - 1] < 0 && nach[x].tagElo[nach[x].tagElo.length - 1] > 0);
  if(plus) add('plus', 48, {pid:plus, verlauf:[0].concat(nach[plus].tagElo)});
  const hoehe = p.W.find(x => nach[x].tagElo[nach[x].tagElo.length - 1] >= 50 && Math.max(0, ...vor[x].tagElo) < 50);
  if(hoehe) add('hoehe', 42, {pid:hoehe, verlauf:[0].concat(nach[hoehe].tagElo)});
  const sprungM = p.W.filter(w => nach[w].mon.n >= 8 && p.delta[w] >= 22 && p.delta[w] > (F.monSprungVor && F.monSprungVor[w] || 0));
  if(sprungM.length) add('sprung', 38, {pid:sprungM[0], gewinn:r1(p.delta[sprungM[0]]), verlauf:[0].concat(nach[sprungM[0]].mon.elo)});
  const halb = p.W.find(w => vor[w].mon.n >= 9 && vor[w].mon.s / vor[w].mon.n < .5 && nach[w].mon.s / nach[w].mon.n >= .5);
  if(halb) add('halb', 40, {pid:halb, verlauf:nach[halb].mon.q, n:nach[halb].mon.n});
  const best = F.partnerNach.find(x => { const mit = p.W.find(y => y !== x.pid), q = x.liste.find(y => y.pid === mit);
    return q && q.n >= 8 && x.liste[0].pid === mit && q.n % 4 === 0; });
  if(best) add('partner', 36, {pid:best.pid, mit:p.W.find(y => y !== best.pid), liste:best.liste.slice(0, 5),
    allg:r1(nach[best.pid].gesamt.s / nach[best.pid].gesamt.n * 100)});
  const kal = p.W.concat(p.L).find(x => [8, 12, 16, 20].includes(nach[x].monTage) && vor[x].monTage === nach[x].monTage - 1);
  if(kal) add('kalender', 34, {pid:kal, tage:F.monTageNach[kal], n:nach[kal].monTage, sid:p.sid});
  return out;
}
// Die letzten zehn Ergebnisse eines Spielers bis zu dieser Partie.
function FAKT_LETZTE(x, F){
  const l = [];
  for(let j = F.p.i; j >= 0 && l.length < 10; j--){ const q = P[j];
    if(q.W.includes(x)) l.unshift(1); else if(q.L.includes(x)) l.unshift(0); }
  return l;
}
// Der größte Gewinn eines Spielers im Monat vor der Partie, für „Sprung".
{
  const best = {}; let sid = null;
  FAKT.forEach(F => { if(F.p.sid !== sid){ sid = F.p.sid; leer(best); }
    F.monSprungVor = Object.assign({}, best);
    F.p.W.forEach(w => { best[w] = Math.max(best[w] || 0, F.p.delta[w]); }); });
}

// ── Die Wahl ────────────────────────────────────────────────────────
// Ein gutes Mittel statt immer dasselbe:
//  • Dieselbe Zeichnung steht nie zweimal hintereinander.
//  • Jeder Einsatz kostet: −14 auf einer der letzten drei Karten, −3 für
//    jede der letzten fünfzehn.
//  • Was seltener kam, als ihm zusteht, holt auf: der Abstand zum fairen
//    Anteil der letzten vierzig Karten zählt mit.
//  • Ein besonderer Ausgang trägt den Kopf, außer derselbe stand auf einer
//    der zwei Karten davor; dann rückt er in den Fuß.
//  • Ein Fuß steht höchstens zweimal am Tag, ein Spitzenwechsel dreimal.
const KOPF_REIHE = [], FUSS_REIHE = [], WAHL = [];
const zaehl = (reihe, k, n) => reihe.slice(-n).filter(x => x === k).length;
function wert(reihe, c, alle, fair){
  const anteil = zaehl(reihe, c.key, 40) / Math.max(1, Math.min(40, reihe.length));
  return c.w - 14 * Math.min(1, zaehl(reihe, c.key, 3)) - 3 * zaehl(reihe, c.key, 15)
    + 60 * Math.max(0, fair - anteil);
}
const tagZustand = {};
FAKT.forEach(F => {
  const p = F.p;
  if(!tagZustand.tag || tagZustand.tag !== p.tag){ tagZustand.tag = p.tag; tagZustand.n = {}; }
  // Kopf
  const kk = koepfe(F), letzter = KOPF_REIHE[KOPF_REIHE.length - 1];
  let kopf = null, verschoben = null;
  const spez = kk.filter(c => c.spezial).sort((a, b) => b.w - a.w)[0];
  const sperre = {fotofinish:3, kantersieg:3}[spez && spez.key] || 2;
  if(spez && !KOPF_REIHE.slice(-sperre).includes(spez.key)) kopf = spez;
  else if(spez) verschoben = spez.key;
  if(!kopf){
    const fair = 1 / 14;
    const befund = kk.filter(c => !c.spezial && !c.grund && c.key !== letzter)
      .map(c => Object.assign({}, c, {eff:wert(KOPF_REIHE, c, kk, fair)})).sort((a, b) => b.eff - a.eff)[0];
    if(befund && befund.eff >= 34) kopf = befund;
    else {
      const seit = k => { const i = KOPF_REIHE.lastIndexOf(k); return i < 0 ? 1e9 : KOPF_REIHE.length - i; };
      kopf = kk.filter(c => c.grund && c.key !== letzter).sort((a, b) => seit(b.key) - seit(a.key))[0];
    }
  }
  KOPF_REIHE.push(kopf.key);
  // Fuß
  const ff = fuesse(F);
  if(verschoben) ff.push({key:verschoben === 'kantersieg' ? 'kanter' : verschoben, w:40, x:{}, ereignis:false, ausKopf:true});
  const lf = FUSS_REIHE[FUSS_REIHE.length - 1];
  // Auch ein Spitzenwechsel nicht auf zwei Karten hintereinander: an einem
  // engen Tag wechselte die Spitze mit jeder Partie, und sechs von zehn
  // Karten trugen dieselbe Tabelle. Die Schlagzeile nennt ihn trotzdem.
  const gewertet = ff.filter(c => c.key !== lf && !(c.w >= 90 && FUSS_REIHE.slice(-2).includes(c.key)))
    .filter(c => (tagZustand.n[c.key] || 0) < (c.w >= 90 ? 3 : 2))
    .map(c => Object.assign({}, c, {eff:(c.ereignis ? 30 : 0) + wert(FUSS_REIHE.filter(Boolean), c, ff, 1 / 20)}))
    .sort((a, b) => b.eff - a.eff);
  const fuss = gewertet[0] || null;
  if(fuss) tagZustand.n[fuss.key] = (tagZustand.n[fuss.key] || 0) + 1;
  FUSS_REIHE.push(fuss ? fuss.key : null);
  WAHL.push({F, kopf:kopf.key, fuss:fuss ? fuss.key : null, fussX:fuss ? fuss.x : null, kandK:kk.map(c => c.key), kandF:ff.map(c => c.key)});
});

// ── Was die Wahl ergibt ─────────────────────────────────────────────
const zahl = l => l.reduce((o, k) => { if(k) o[k] = (o[k] || 0) + 1; return o; }, {});
const KZ = zahl(KOPF_REIHE), FZ = zahl(FUSS_REIHE);
const moeglichK = zahl(WAHL.flatMap(w => [...new Set(w.kandK)])), moeglichF = zahl(WAHL.flatMap(w => [...new Set(w.kandF)]));
const folgen = reihe => { let max = 1, n = 1, gleich = 0;
  for(let i = 1; i < reihe.length; i++){ if(reihe[i] && reihe[i] === reihe[i - 1]){ n++; gleich++; } else n = 1; max = Math.max(max, n); }
  return {max, gleich}; };
// Wie oft dieselbe Zeichnung in einem Fenster von zehn Karten stand: das
// Höchste, das ein Leser an einem Abend sieht.
const fenster = reihe => { let max = 0, wer = '';
  for(let i = 0; i + 10 <= reihe.length; i++){ const z = zahl(reihe.slice(i, i + 10));
    Object.keys(z).forEach(k => { if(z[k] > max){ max = z[k]; wer = k; } }); }
  return {max, wer}; };

// Die App über dieselben Partien, aus dem Lauf der Übersicht, wenn er da ist.
let APP = null;
try { const D = JSON.parse(fs.readFileSync(path.join(__dirname, '.story-logik.json'), 'utf8'));
  const m = (D.formen.spiel || {}).marken || {};
  APP = {kopf:{}, fuss:{}};
  Object.keys(m).forEach(k => { const [a, b] = k.split(':'); if(a === 'kopf') APP.kopf[b] = m[k]; if(a === 'fuss') APP.fuss[b] = m[k]; });
} catch(e){}

// ── Beispiele ───────────────────────────────────────────────────────
// Je Kopf und je Fuß zwei Karten aus dem Lauf, so gewählt, dass sich ihre
// Gegenstücke unterscheiden; dazu der Spieltag mit den meisten Partien am
// Stück, so, wie der Feed ihn zeigen würde.
const karte = w => {
  const {F} = w, p = F.p, vier = p.W.concat(p.L);
  return {mid:p.id, t:p.t, tag:p.tag, sid:p.sid, W:p.W, L:p.L, pos:p.pos, hoch:p.hoch, tief:p.tief, chance:r1(p.chance * 100),
    delta:Object.fromEntries(vier.map(x => [x, r1(p.delta[x])])), kopf:w.kopf, fuss:w.fuss, fussX:w.fussX,
    vor:Object.fromEntries(vier.map(x => [x, {serie:F.vor[x].serie, letzte:F.vor[x].letzte, tag:F.vor[x].tag}])),
    nach:Object.fromEntries(vier.map(x => [x, {serie:F.nach[x].serie, tag:F.nach[x].tag}])),
    kreuz:F.kreuz, duo:F.duoVor, platz:Object.fromEntries(vier.map(x => [x, F.platz(F.rangNach, x)])),
    platzVor:Object.fromEntries(vier.map(x => [x, F.platz(F.rangVor, x)])), tabelle:F.rangNach.length,
    eloVor:Object.fromEntries(vier.map(x => [x, r1(p.vorElo[x] || 0)])), westen:F.westen.length};
};
const bsp = {kopf:{}, fuss:{}};
Object.keys(KZ).forEach(k => {
  const l = WAHL.filter(w => w.kopf === k), mit = [];
  l.slice().reverse().forEach(w => { if(mit.length < 2 && w.fuss && !mit.some(y => y.fuss === w.fuss)) mit.push(w); });
  while(mit.length < 2 && l.length > mit.length) mit.push(l[l.length - 1 - mit.length]);
  bsp.kopf[k] = mit.map(karte);
});
Object.keys(FZ).forEach(k => {
  const l = WAHL.filter(w => w.fuss === k), mit = [];
  l.slice().reverse().forEach(w => { if(mit.length < 2 && !mit.some(y => y.kopf === w.kopf)) mit.push(w); });
  bsp.fuss[k] = mit.map(karte);
});
const proTag = zahl(P.map(p => p.tag));
const dichtester = Object.keys(proTag).filter(t => t >= '2026-10-01').sort((a, b) => proTag[b] - proTag[a])[0];
const tagAmStueck = WAHL.filter(w => w.F.p.tag === dichtester).map(karte);

const aus = {partien:P.length, av:AV, ic:IC, name:NAME, kopfZahl:KZ, fussZahl:FZ, moeglichK, moeglichF,
  ohneFuss:FUSS_REIHE.filter(x => !x).length,
  kopfFolge:folgen(KOPF_REIHE), fussFolge:folgen(FUSS_REIHE), kopfFenster:fenster(KOPF_REIHE), fussFenster:fenster(FUSS_REIHE),
  app:APP, bsp, tag:{tag:dichtester, karten:tagAmStueck}};
fs.writeFileSync(path.join(__dirname, '.kopf-fuss.json'), JSON.stringify(aus));
console.log(JSON.stringify({kopf:KZ, fuss:FZ, ohneFuss:aus.ohneFuss, moeglichK, moeglichF,
  kopfFolge:aus.kopfFolge, fussFolge:aus.fussFolge, kopfFenster:aus.kopfFenster, fussFenster:aus.fussFenster, tag:[dichtester, tagAmStueck.length]}));
