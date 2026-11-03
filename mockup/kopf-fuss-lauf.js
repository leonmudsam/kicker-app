// Köpfe und Füße der Karte einer Partie, siebte Runde. Der Lauf spielt alle
// 616 Partien bis Oktober nach und baut jede Karte nach der Regel des
// Katalogs (`kopf-fuss-katalog.js`, dort stehen die fünf Schritte):
// Anlässe sammeln, gewichten, Hauptanlass als Schlagzeile, Fuß, höchstens
// drei Zeilen. Der Kopf zeigt nur, wie die Partie ausging.
//
//   node tools/build.mjs && node mockup/kopf-fuss-anlaesse.js && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js
//
// Was die App über eine Partie sagt und zeichnet, kommt aus
// `.kopf-fuss-anlaesse.json`: ihre Meldungen, ihre Formen, jeder Kopf und
// jeder Fuß, gezeichnet mit ihren Funktionen. Dieser Lauf zählt nur, was die
// neuen Fakten brauchen: den Stand vor und nach jeder Partie.
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
  'calendar', 'target', 'stepsUp', 'hundred', 'trendUp', 'comeback', 'premiere', 'handshake', 'crossedSwords', 'bannbruch', 'medalTrio',
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
const S = {serie:{}, letzte:{}, tag:{}, tagElo:{}, h2h:{}, h2hFolge:{}, duo:{}, partner:{}, gesamt:{}, mon:{}, monSprung:{}, paarung:{}, fuehrt:{},
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
  const kreuz = p.W.flatMap(w => p.L.map(l => ({w, l, s:S.h2h[w + '|' + l] || 0, n:(S.h2h[w + '|' + l] || 0) + (S.h2h[l + '|' + w] || 0)})));
  const duoVor = {W:Object.assign({s:0, n:0}, S.duo[duoKey(...p.W)]), L:Object.assign({s:0, n:0}, S.duo[duoKey(...p.L)])};
  // Dieselben zwei Paare gegeneinander: jede frühere Begegnung genau dieser
  // vier in genau diesen Paaren, für die Paarung.
  const pk = [duoKey(...p.W), duoKey(...p.L)].sort().join('#');
  const paarungVor = (S.paarung[pk] || []).slice();
  // Wann jeder der Sieger zuletzt im Duell gegen jeden der Verlierer vorn
  // lag, gezählt in Duellen: eine Bilanz, die bei einem Sieg mal hin und mal
  // her kippt, ist keine Nachricht.
  const fuehrtVor = Object.fromEntries(p.W.flatMap(w => p.L.map(l => [w + '|' + l, S.fuehrt[w + '|' + l]])));
  // Mit wie vielen verschiedenen Partnern jeder vorher spielte, für das
  // erste gemeinsame Spiel.
  const partnerZahlVor = Object.fromEntries(vier.map(x => [x, Object.keys(S.partner[x] || {}).length]));
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
  p.W.forEach(w => p.L.forEach(l => [[w, l], [l, w]].forEach(([a, c]) => {
    const s = S.h2h[a + '|' + c] || 0, n = s + (S.h2h[c + '|' + a] || 0);
    if(s * 2 > n) S.fuehrt[a + '|' + c] = n; })));
  [[p.W[0], p.W[1], 1], [p.W[1], p.W[0], 1], [p.L[0], p.L[1], 0], [p.L[1], p.L[0], 0]].forEach(([a, b, s1]) => {
    const q = (S.partner[a] = S.partner[a] || {})[b] || (S.partner[a][b] = {s:0, n:0}); q.n++; q.s += s1; });
  if(p.tief === 0) (S.westen[p.sid] = S.westen[p.sid] || []).push({mid:p.id, W:p.W, L:p.L, t:p.t});
  (S.paarung[pk] = S.paarung[pk] || []).push({t:p.t, sieger:duoKey(...p.W), hoch:p.hoch, tief:p.tief});

  FAKT.push({p, vor, rangVor, rangNach, platz, kreuz, duoVor, wocheVorAlle, westenVor, paarungVor, fuehrtVor, partnerZahlVor,
    nach:Object.fromEntries(vier.map(x => [x, {serie:S.serie[x], tag:{s:S.tag[x].s, n:S.tag[x].n, folge:S.tag[x].folge.slice()},
      tagElo:S.tagElo[x].map(r1), mon:{s:S.mon[x].s, n:S.mon[x].n, q:S.mon[x].q.slice(), elo:S.mon[x].elo.slice()},
      gesamt:Object.assign({}, S.gesamt[x]), monTage:S.monTage[x].size, woche:Object.assign({}, S.woche[x])}])),
    wocheNach:JSON.parse(JSON.stringify(S.woche)),
    monTageNach:Object.fromEntries(vier.map(x => [x, [...S.monTage[x]].sort()])),
    partnerNach:p.W.map(w => ({pid:w, liste:Object.keys(S.partner[w]).filter(x => S.partner[w][x].n >= 6)
      .map(x => ({pid:x, n:S.partner[w][x].n, q:r1(S.partner[w][x].s / S.partner[w][x].n * 100)})).sort((a, b) => b.q - a.q)})),
    h2hFolge:p.W.flatMap(w => p.L.map(l => ({w, l, folge:S.h2hFolge[w + '|' + l].slice(-12)}))),
    duoNach:{W:Object.assign({}, S.duo[duoKey(...p.W)]), L:Object.assign({}, S.duo[duoKey(...p.L)])},
    westen:(S.westen[p.sid] || []).slice(),
    // Jedes Duell zweier seit dem ersten, für die Bilanzkurve.
    h2hVoll:p.W.flatMap(w => p.L.map(l => ({w, l, folge:S.h2hFolge[w + '|' + l].slice()})))});
});


const {ANLASS, KOPF, artVonMeldung} = require('./kopf-fuss-katalog.js');
const ANL = JSON.parse(fs.readFileSync(path.join(__dirname, '.kopf-fuss-anlaesse.json'), 'utf8'));
const nmL = id => NAME[id];
const vzL = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(Math.round(v));
const monatL = t => new Date(t).toLocaleDateString('de-DE', {month:'long'});

// Der größte Gewinn eines Spielers im Monat vor der Partie.
{
  const best = {}; let sid = null;
  FAKT.forEach(F => { if(F.p.sid !== sid){ sid = F.p.sid; leer(best); }
    F.monSprungVor = Object.assign({}, best);
    F.p.W.forEach(w => { best[w] = Math.max(best[w] || 0, F.p.delta[w]); }); });
}

// ── Die neuen Fakten ────────────────────────────────────────────────
// Nur, was die App nicht schon sagt oder zeichnet; die Schwellen stehen im
// Katalog bei `wann`. Jeder Fakt trägt die Daten seiner Zeichnung (`x`).
function neueFakten(F){
  const {p, vor, nach} = F, out = [];
  const add = (art, text, x) => out.push({art, text, x});
  F.kreuz.forEach(k => { const s = k.s + 1, n = k.n + 1, zuletzt = F.fuehrtVor[k.w + '|' + k.l];
    if(n >= 16 && k.s * 2 <= k.n && s * 2 > n && (zuletzt == null || n - zuletzt >= 10)){
      let d = 0; const voll = (F.h2hVoll.find(h => h.w === k.w && h.l === k.l) || {folge:[]}).folge;
      add('kippt', `${nmL(k.w)} geht im Duell gegen ${nmL(k.l)} in Führung, ${s}:${n - s}`,
        {w:k.w, l:k.l, s, n, verlauf:[0].concat(voll.map(r => (d += r ? 1 : -1)))});
    } });
  const wq = o => Object.keys(o).filter(k => o[k].s >= 5).map(k => ({pid:k, s:o[k].s, n:o[k].n, q:Math.round(o[k].s / o[k].n * 100)}))
    .sort((a, b) => b.q - a.q || b.s - a.s);
  const wVor = wq(F.wocheVorAlle)[0], wNach = wq(F.wocheNach);
  if(wNach[0] && p.W.includes(wNach[0].pid) && (!wVor || wVor.pid !== wNach[0].pid))
    add('woche', `${nmL(wNach[0].pid)} übernimmt die Woche, ${wNach[0].s} von ${wNach[0].n} gewonnen`, {pid:wNach[0].pid, liste:wNach.slice(0, 5)});
  const tagEnde = x => nach[x].tagElo[nach[x].tagElo.length - 1];
  const plus = p.W.find(x => vor[x].tagElo.length >= 3 && Math.min(...vor[x].tagElo) <= -25
    && vor[x].tagElo[vor[x].tagElo.length - 1] < 0 && tagEnde(x) > 0);
  if(plus) add('plus', `${nmL(plus)} dreht den Tag ins Plus, nach ${vzL(Math.min(...vor[plus].tagElo))} Elo`, {pid:plus, verlauf:[0].concat(nach[plus].tagElo)});
  const hoehe = p.W.find(x => tagEnde(x) >= 75 && Math.max(0, ...vor[x].tagElo) < 75);
  if(hoehe) add('hoehe', `${nmL(hoehe)} steht heute bei ${vzL(tagEnde(hoehe))} Elo`, {pid:hoehe, verlauf:[0].concat(nach[hoehe].tagElo)});
  const best = p.W.find(w => nach[w].mon.n >= 8 && p.delta[w] >= 22 && p.delta[w] > (F.monSprungVor[w] || 0));
  if(best) add('monatsbest', `${nmL(best)} holt ${Math.round(p.delta[best])} Elo, so viel wie in keiner Partie des Monats`,
    {pid:best, gewinn:Math.round(p.delta[best]), verlauf:nach[best].mon.elo});
  const halb = p.W.find(w => vor[w].mon.n >= 14 && vor[w].mon.s / vor[w].mon.n < .5 && nach[w].mon.s / nach[w].mon.n >= .5);
  if(halb) add('halb', `${nmL(halb)} gewinnt im ${monatL(p.t)} wieder jede zweite Partie`, {pid:halb, verlauf:nach[halb].mon.q, n:nach[halb].mon.n});
  const partner = F.partnerNach.find(x => { const mit = p.W.find(y => y !== x.pid), q = x.liste.find(y => y.pid === mit);
    return q && q.n >= 8 && x.liste[0].pid === mit && q.n % 8 === 0; });
  if(partner){ const mit = p.W.find(y => y !== partner.pid), allg = Math.round(nach[partner.pid].gesamt.s / nach[partner.pid].gesamt.n * 100);
    add('partner', `Mit ${nmL(mit)} gewinnt ${nmL(partner.pid)} ${partner.liste[0].q} % der Partien, sonst ${allg} %`,
      {pid:partner.pid, mit, liste:partner.liste.slice(0, 5), allg}); }
  return out;
}

// ── 1. Sammeln ──────────────────────────────────────────────────────
// Jede Meldung der App zur Partie (ohne die Ergebnis-Zeile), jede Form der
// App, alles, was die App aus der Partie zeichnet, und die neuen Fakten.
// Eine Art, deren Sache eine andere schon sagt (`deckt`), entfällt.
function sammeln(F, app){
  const l = [];
  // Die Klasse einer Auszeichnung steht bei gebündelten Meldungen nur in
  // ihrer Aufschrift (`klasse`): „Maxi und Julian holen ‚Absoluter Sieger‘“
  // stand sonst als gewöhnliche Auszeichnung in einer Zeile statt als
  // legendäre in der Schlagzeile.
  const klasse = t => t.rarity || ({'Legendär':'legendary', 'Selten':'rare'})[t.klasse] || '';
  app.teile.forEach(t => { const art = t.typ === 'spiel' ? null : artVonMeldung(t.typ, klasse(t));
    if(art) l.push({art, text:t.titel, satz:t.desc, html:t.html, neg:t.neg || !!ANLASS[art].neg, brk:t.brk, klasse:t.klasse}); });
  Object.keys(app.formen).forEach(form => { const art = Object.keys(ANLASS).find(k => ANLASS[k].form === form);
    if(art) l.push({art, text:app.formen[form].t, satz:app.formen[form].d, html:app.formen[form].html}); });
  ['premiere', 'wende', 'rolle'].forEach(art => { const x = app.partie[art];
    if(x && app.fuesse[art]) l.push({art, text:x.t, html:x.html}); });
  neueFakten(F).forEach(f => l.push(f));
  // Die Daten der Zeichnungen, die der Entwurf statt der App zeichnet.
  const D = app.daten || {};
  l.forEach(a => { const f = ANLASS[a.art].fuss;
    if(f === 'medaille'){ const kl = a.art === 'legendaer' ? 'legendary' : 'rare', m = (D.medaillen || []).filter(x => x.klasse === kl);
      a.x = m.find(x => String(a.text).includes(x.name)) || m[0] || null; }
    if(f === 'tabelle') a.x = ((a.art === 'spitze' ? app.fuesse.spitze : app.fuesse.rang) || {}).data || null;
    if(f === 'marken'){ const z = app.formen.zaehlwerk && app.formen.zaehlwerk.data;
      // Die Form der App zählt Siege (`sieg`) oder Spiele.
      a.x = D.marken && D.marken.length ? D.marken : z && z.wer ? [{pid:z.wer, wert:z.wert, label:z.sieg ? 'Sieg' : 'Spiel'}] : null; } });
  const da = new Set(l.map(a => a.art));
  return l.filter(a => !(ANLASS[a.art].deckt || []).some(k => da.has(k)));
}

// ── 2. bis 5. Die Karte ─────────────────────────────────────────────
// Gewicht aus dem Katalog; ein Zustand, der auf einer der drei Karten davor
// Hauptanlass war, verliert 20. Eine Pleite ist nie Hauptanlass; gibt es nur
// Pleiten, trägt das Ergebnis die Schlagzeile. Der Fuß zeichnet den schwersten mit Zeichnung, also
// meist den Hauptanlass, außer dieselbe Zeichnung stand eben schon. Die
// übrigen sind Zeilen, drei davon.
const ZEILEN_MAX = 3, NEBENSACHE = 30;
const hatBild = (a, app) => { const f = ANLASS[a.art].fuss; return !!f && (f.startsWith('app:') ? !!app.fuesse[f.slice(4)] : !!a.x); };
function karteBauen(anl, app, spurHaupt, fussZuletzt){
  const g = anl.map(a => Object.assign({}, a, {w:ANLASS[a.art].gewicht
      - (ANLASS[a.art].zustand && spurHaupt.slice(-3).includes(a.art) ? 20 : 0)}))
    .sort((a, b) => (a.neg ? 1 : 0) - (b.neg ? 1 : 0) || b.w - a.w);
  const haupt = g.find(a => !a.neg) || null;
  // Dieselbe Zeichnung nicht zweimal hintereinander: steht die des
  // Hauptanlasses schon auf der Karte davor, zeichnet der Fuß den nächsten
  // mit einer anderen, wenn es einen gibt.
  const bilder = g.filter(a => hatBild(a, app)), bild = a => ANLASS[a.art].fuss;
  const fuss = bilder.find(a => bild(a) !== fussZuletzt) || bilder[0] || null;
  // Ein neues Thema geht vor: erst je Thema die schwerste, dann, ist noch
  // Platz, die zweite eines Themas. Was dasselbe Thema hat wie Schlagzeile
  // oder Fuß, kommt erst danach.
  const themen = new Set([haupt, fuss].filter(Boolean).map(a => ANLASS[a.art].thema)), neu = [], wieder = [];
  g.filter(a => a !== haupt && a !== fuss).forEach(a => {
    const t = ANLASS[a.art].thema;
    if(!themen.has(t)){ neu.push(a); themen.add(t); } else wieder.push(a);
  });
  // Eine Nebensache (Gewicht unter NEBENSACHE) steht nur im Blatt: nicht
  // als Zeile und nicht in „+ X weitere“.
  const rest = neu.concat(wieder), zeile = rest.filter(a => a.w >= NEBENSACHE);
  return {haupt, fuss, zeilen:zeile.slice(0, ZEILEN_MAX), weitere:zeile.slice(ZEILEN_MAX), neben:rest.filter(a => a.w < NEBENSACHE)};
}

// ── Der Kopf ────────────────────────────────────────────────────────
// Ein besonderer Ausgang nach Vorrang, sonst die Grundansicht, die am
// längsten nicht dran war; gleich lange nach der Reihenfolge des Katalogs.
// Ob eine Ansicht der App zutrifft, sagt die App (`koepfe`); die eigenen
// prüfen ihre Regel hier.
const EIGENER_KOPF = {zunull:F => F.p.tief === 0, krimi:F => F.p.hoch - F.p.tief === 1,
  tafel:() => true, strom:() => true, pucks:() => true};
// Der wievielte Krimi (ein Tor Abstand) des Monats die Partie ist; das
// Zu null zählt `westen`.
{
  let sid = null, n = 0;
  FAKT.forEach(F => { if(F.p.sid !== sid){ sid = F.p.sid; n = 0; } if(F.p.hoch - F.p.tief === 1) n++; F.krimiNr = n; });
}
const trifft = (k, F, app) => KOPF[k].quelle === 'app' ? !!(app.koepfe[KOPF[k].app] && app.koepfe[KOPF[k].app].html) : EIGENER_KOPF[k](F);
function kopfWahl(F, app, spur){
  const keys = Object.keys(KOPF).filter(k => trifft(k, F, app));
  // Ein besonderer Ausgang, außer derselbe stand auf einer der zwei Karten
  // davor: der klare Sieg trifft auf jede fünfte Partie zu und stand sonst
  // viermal hintereinander.
  const aus = keys.filter(k => KOPF[k].art === 'ausgang').sort((a, b) => KOPF[a].vorrang - KOPF[b].vorrang)[0];
  if(aus && !spur.slice(-2).includes(aus)) return aus;
  const seit = k => { const i = spur.lastIndexOf(k); return i < 0 ? 1e9 : spur.length - i; };
  return keys.filter(k => KOPF[k].art === 'grund').sort((a, b) => seit(b) - seit(a))[0];
}

// ── Der Lauf ────────────────────────────────────────────────────────
const WAHL = [], spurHaupt = [], spurKopf = [], spurFuss = [];
FAKT.forEach(F => {
  const app = ANL[F.p.id];
  const anl = sammeln(F, app);
  const k = karteBauen(anl, app, spurHaupt, spurFuss[spurFuss.length - 1]);
  const kopf = kopfWahl(F, app, spurKopf);
  spurHaupt.push(k.haupt ? k.haupt.art : null); spurKopf.push(kopf); spurFuss.push(k.fuss ? ANLASS[k.fuss.art].fuss : null);
  WAHL.push({F, app, anl, kopf, karte:k});
});

// ── Was die Wahl ergibt ─────────────────────────────────────────────
const zahl = l => l.reduce((o, k) => { if(k != null) o[k] = (o[k] || 0) + 1; return o; }, {});
const folgen = reihe => { let max = 1, n = 1;
  for(let i = 1; i < reihe.length; i++){ if(reihe[i] && reihe[i] === reihe[i - 1]) n++; else n = 1; max = Math.max(max, n); }
  return max; };
const fenster = reihe => { let max = 0, wer = '';
  for(let i = 0; i + 10 <= reihe.length; i++){ const z = zahl(reihe.slice(i, i + 10));
    Object.keys(z).forEach(k => { if(z[k] > max){ max = z[k]; wer = k; } }); }
  return {max, wer}; };
const fussReihe = WAHL.map(w => w.karte.fuss ? ANLASS[w.karte.fuss.art].fuss : null);
const STAT = {
  partien:WAHL.length,
  kopf:zahl(WAHL.map(w => w.kopf)), kopfFolge:folgen(WAHL.map(w => w.kopf)), kopfFenster:fenster(WAHL.map(w => w.kopf)),
  haupt:zahl(WAHL.map(w => w.karte.haupt && w.karte.haupt.art)),
  fuss:zahl(fussReihe), fussFolge:folgen(fussReihe), fussFenster:fenster(fussReihe.filter(Boolean)),
  ohneAnlass:WAHL.filter(w => !w.karte.haupt).length, ohneFuss:WAHL.filter(w => !w.karte.fuss).length,
  fussNichtHaupt:WAHL.filter(w => w.karte.fuss && w.karte.fuss !== w.karte.haupt).length,
  // Wie oft jede Art zutrifft, und wie oft sie Hauptanlass, Fuß oder Zeile ist.
  zutreffend:zahl(WAHL.flatMap(w => w.anl.map(a => a.art))),
  alsZeile:zahl(WAHL.flatMap(w => w.karte.zeilen.map(a => a.art))),
  alsWeitere:zahl(WAHL.flatMap(w => w.karte.weitere.map(a => a.art))),
  alsFuss:zahl(WAHL.map(w => w.karte.fuss && w.karte.fuss.art)),
  zeilen:zahl(WAHL.map(w => w.karte.zeilen.length)), weitere:WAHL.filter(w => w.karte.weitere.length).length,
  alsNeben:zahl(WAHL.flatMap(w => w.karte.neben.map(a => a.art))), neben:WAHL.reduce((n, w) => n + w.karte.neben.length, 0),
  zeilenSchnitt:WAHL.reduce((n, w) => n + w.karte.zeilen.length, 0) / WAHL.length,
  weitereMax:Math.max(0, ...WAHL.map(w => w.karte.weitere.length)),
  // Die App heute: wie oft der Anlass ihres Fußes noch einmal als Zeile
  // steht (dieselbe Meldung in Zeile und Bild), und wie viele Zeilen sie zeigt.
  appDoppelt:WAHL.filter(w => { const f = w.app.app.fuss; if(!f) return false;
    const arten = w.app.teile.map(t => artVonMeldung(t.typ, t.rarity)).filter(Boolean);
    return arten.some(a => ANLASS[a].fuss === 'app:' + f); }).length,
  appMehrAlsVier:WAHL.filter(w => w.app.teile.filter(t => t.typ !== 'spiel').length > 4).length,
  appKopf:zahl(WAHL.map(w => w.app.app.kopf)), appFuss:zahl(WAHL.map(w => w.app.app.fuss || null))
};

// Die Zeichen der neuen Zeilen, wie die App sie setzt.
const NEU_IC = {kippt:'scaleBalance', woche:'weekKing', plus:'comeback', hoehe:'peak', monatsbest:'rakete', halb:'scaleBalance', partner:'partnerHebel'};
const NEU_HTML = {};
{
  const texte = [...new Set(WAHL.flatMap(w => w.anl.filter(a => !a.html).map(a => a.art + '|' + a.text)))];
  const html = JSON.parse(K(`JSON.stringify(${JSON.stringify(texte)}.map(x => { const [art, t] = [x.slice(0, x.indexOf('|')), x.slice(x.indexOf('|') + 1)];
    return '<i class="nf-sam-i">' + svgI(${JSON.stringify(NEU_IC)}[art] || 'chartBar') + '</i><span>' + _newsBetont(t) + '</span>'; }))`));
  texte.forEach((x, i) => { NEU_HTML[x] = html[i]; });
  // Auch auf der Karte: sie trägt Kopien der Anlässe mit ihrem Gewicht.
  WAHL.forEach(w => [w.anl, [w.karte.haupt, w.karte.fuss], w.karte.zeilen, w.karte.weitere].flat()
    .forEach(a => { if(a && !a.html) a.html = NEU_HTML[a.art + '|' + a.text]; }));
}
['crown', 'weekKing', 'comeback', 'peak', 'rakete', 'scaleBalance', 'partnerHebel', 'weisseWeste'].forEach(k => { if(!IC[k]) IC[k] = K(`svgI(${JSON.stringify(k)})`); });


// ── Die Karten für die Seite ────────────────────────────────────────
// Eine Karte trägt nur, was die Seite zeichnet: Gesichter, Stand, Elo, den
// Kopf (eigener oder der App), Schlagzeile, Satz, Zeilen und Fuß.
// Die Namenszeile unter jedem Kopf sagt, wie es ausging: „Jane, Leo
// schlagen Stefan, Maxi“. Mit „gegen“ las man den Sieger nur an der
// Helligkeit der Namen ab. Die Köpfe der App tragen dieselbe Zeile
// (`_spNz`); hier bekommt sie das Wort, das der Entwurf vorschlägt.
// Die Wippe der App stellt die Favoriten links unten hin, also die
// Verlierer: gespiegelt stehen die Sieger auch dort links (oben, sie
// waren leichter). Die Linie spiegelt das CSS der Seite.
const schlagen = h => h.replace(/<span class="sp-nz-gg">gegen<\/span>/g, '<span class="sp-nz-gg">schlagen</span>')
  .replace(/(class="sp-wp-t(?: w)?" style="left:)([\d.]+)%/g, (_, a, x) => a + (100 - +x).toFixed(1) + '%');
const anlassFuerSeite = a => a && {art:a.art, text:a.text, satz:a.satz || '', html:a.html || '', neg:!!a.neg, brk:!!a.brk, klasse:a.klasse || '', x:a.x || null};
const karte = w => {
  const {F, app} = w, p = F.p, vier = p.W.concat(p.L), k = w.karte;
  const ergebnis = app.teile.find(t => t.typ === 'spiel') || {titel:app.titel, desc:app.text};
  return {mid:p.id, t:p.t, tag:p.tag, sid:p.sid, W:p.W, L:p.L, hoch:p.hoch, tief:p.tief, chance:r1(p.chance * 100),
    delta:Object.fromEntries(vier.map(x => [x, r1(p.delta[x])])), westen:F.westen.length, krimiNr:F.krimiNr,
    kopf:w.kopf, kopfHtml:KOPF[w.kopf].quelle === 'app' ? schlagen(app.koepfe[KOPF[w.kopf].app].html) : '',
    ergebnis:{titel:ergebnis.titel, satz:ergebnis.desc || ''},
    haupt:anlassFuerSeite(k.haupt), fuss:anlassFuerSeite(k.fuss),
    fussHtml:k.fuss && ANLASS[k.fuss.art].fuss.startsWith('app:') ? app.fuesse[ANLASS[k.fuss.art].fuss.slice(4)].html : '',
    zeilen:k.zeilen.map(anlassFuerSeite), weitere:k.weitere.length};
};
// Je Anlass und je Kopf die jüngsten zwei Karten, auf denen er Hauptanlass
// oder Kopf ist; dazu der dichteste Spieltag im Oktober und die Karten mit
// den meisten Anlässen.
const bsp = {anlass:{}, kopf:{}};
Object.keys(ANLASS).forEach(a => { bsp.anlass[a] = WAHL.filter(w => w.karte.haupt && w.karte.haupt.art === a).slice(-2).reverse().map(karte); });
Object.keys(KOPF).forEach(k => { bsp.kopf[k] = WAHL.filter(w => w.kopf === k).slice(-2).reverse().map(karte); });
// Je Zeichnung eines Fußes die jüngste Karte, auf der sie den Hauptanlass
// zeichnet: so steht jede Zeichnung mit dem Satz, zu dem sie gehört.
bsp.fuss = {};
Object.keys(ANLASS).filter(a => ANLASS[a].fuss).forEach(a => {
  const l = WAHL.filter(w => w.karte.fuss && w.karte.fuss.art === a);
  const am = l.filter(w => w.karte.fuss === w.karte.haupt);
  if(l.length) bsp.fuss[a] = karte((am.length ? am : l)[(am.length ? am : l).length - 1]);
});
// Die Karte, an der die Seite den Aufbau zeigt: eigener Kopf, ein
// Hauptanlass mit eigenem Fuß, drei Zeilen und „+ weitere“; dazu je ein Fall
// der Regel.
const jung = l => l[l.length - 1];
const anat = jung(WAHL.filter(w => w.karte.haupt && w.karte.fuss === w.karte.haupt && w.karte.zeilen.length === 3
  && w.karte.weitere.length && KOPF[w.kopf].quelle === 'neu' && KOPF[w.kopf].art === 'grund'))
  || jung(WAHL.filter(w => w.karte.haupt && w.karte.fuss === w.karte.haupt && w.karte.zeilen.length >= 2));
bsp.anatomie = anat ? karte(anat) : null;
bsp.faelle = {
  weitere:jung(WAHL.filter(w => w.karte.weitere.length >= 2 && w !== anat)),
  fussTitel:jung(WAHL.filter(w => w.karte.fuss && w.karte.haupt && w.karte.fuss !== w.karte.haupt && w.karte.zeilen.length <= 1)),
  ohne:jung(WAHL.filter(w => !w.karte.haupt && w.karte.zeilen.length)) || jung(WAHL.filter(w => !w.karte.haupt)),
};
bsp.faelle.neben = jung(WAHL.filter(w => w.karte.neben.length >= 2 && w.karte.zeilen.length <= 1 && w.karte.haupt
  && w !== bsp.faelle.fussTitel && w !== bsp.faelle.weitere));
Object.keys(bsp.faelle).forEach(f => { const w = bsp.faelle[f];
  bsp.faelle[f] = w ? Object.assign(karte(w), {neben:w.karte.neben.map(a => a.text)}) : null; });
bsp.viele = WAHL.slice().sort((a, b) => b.anl.length - a.anl.length || b.F.p.t - a.F.p.t).slice(0, 4).map(karte);
const proTag = zahl(P.map(p => p.tag));
const dichtester = Object.keys(proTag).filter(t => t >= '2026-10-01').sort((a, b) => proTag[b] - proTag[a])[0];
const tagAmStueck = WAHL.filter(w => w.F.p.tag === dichtester).map(karte);
const aus = {partien:P.length, av:AV, ic:IC, name:NAME, stat:STAT, bsp, tag:{tag:dichtester, karten:tagAmStueck}};
fs.writeFileSync(path.join(__dirname, '.kopf-fuss.json'), JSON.stringify(aus));
// Für die Prüfung (KF_ALLE=ziel.json): jede Karte, wie sie gewählt ist, und
// dazu je Partie jeder Kopf, der zutrifft, und jeder Anlass mit Zeichnung
// als Fuß. So misst die Prüfung jede Zeichnung an jeder Partie.
if(process.env.KF_ALLE){
  const varianten = [];
  WAHL.forEach(w => {
    varianten.push(karte(w));
    Object.keys(KOPF).filter(k => trifft(k, w.F, w.app) && k !== w.kopf)
      .forEach(k => varianten.push(karte(Object.assign({}, w, {kopf:k, karte:{haupt:null, fuss:null, zeilen:[], weitere:[]}}))));
    w.anl.filter(a => hatBild(a, w.app) && a !== w.karte.fuss)
      .forEach(a => varianten.push(karte(Object.assign({}, w, {karte:{haupt:a, fuss:a, zeilen:[], weitere:[]}}))));
  });
  fs.writeFileSync(process.env.KF_ALLE, JSON.stringify({partien:P.length, av:AV, ic:IC, name:NAME, karten:varianten}));
}
console.log(JSON.stringify({kopf:STAT.kopf, haupt:STAT.haupt, fuss:STAT.fuss, ohneAnlass:STAT.ohneAnlass, ohneFuss:STAT.ohneFuss,
  fussNichtHaupt:STAT.fussNichtHaupt, zeilen:STAT.zeilen, weitere:STAT.weitere, weitereMax:STAT.weitereMax,
  kopfFolge:STAT.kopfFolge, kopfFenster:STAT.kopfFenster, fussFolge:STAT.fussFolge, fussFenster:STAT.fussFenster,
  appDoppelt:STAT.appDoppelt, appMehrAlsVier:STAT.appMehrAlsVier}));
