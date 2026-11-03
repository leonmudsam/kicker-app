// Fun Facts um 15 Uhr, Entwurf: an jedem Tag der echten Liga, an dem bis 15
// Uhr keine Partie lief, um 15 Uhr dasselbe wie die App — ihr Generator
// zieht seinen Fun Fact (für den Vergleich) — und daneben jeder Fakt des
// Katalogs (`fun-fakten-katalog.js`) auf demselben Stand, mit seiner
// Spannung. Gewählt wird nach der Regel des Katalogs: prüfen, sperren,
// wählen, lockern.
//
//   node tools/build.mjs && node mockup/fun-fakten-lauf.js && node mockup/fun-fakten-seite.js
//
// Ergebnis ist `.fun-fakten.json` (nicht eingecheckt). Was die App rechnet —
// Wertung des Monats, Liga-Rekorde, Chronik, Prestige, Auszeichnungen —,
// liest der Lauf aus ihr (`tests/runtime.js` über `dist/index.html`); was
// nur aus den Partien folgt (Paare, Positionen, Duelle, Erwartung, Marken),
// zählt er selbst.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {createRuntime} = require(path.join(ROOT, 'tests', 'runtime.js'));
const {RUBRIK, FAKT} = require('./fun-fakten-katalog.js');

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
const letzterMs = Date.parse(liga[liga.length - 1].created_at);
setNow(letzterMs + 7 * 864e5);
// Wie `kopf-fuss-anlaesse.js`: die Saisontabelle trägt an jedem Tag genau
// die Monate, die bis dahin zu sind, und die Stories liegen in einem
// Speicher wie in der Datenbank (die erste Fassung einer ID gewinnt).
K(`players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5, avatar_id:null})))};
  matches = ${JSON.stringify(liga)};
  globalThis.ALLE = matches.slice();
  seasons = ['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10']
    .map(id => ({id, label:seasonLabel(id), start_date:'', end_date:''}));
  invalidateCache();
  const _d = new Map(simulateEloWithSliders(matches).history.map(h => [h.matchId, h.deltas]));
  matches.forEach(m => { m.deltas = _d.get(m.id) || {}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s => { const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
    const top = Object.keys(pl).filter(id => pl[id] > 0)
      .map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0})).sort((a, b) => b.elo - a.elo);
    s.top_elo = JSON.stringify(top.slice(0, 3)); s.player_id = top[0] ? top[0].id : null; });
  globalThis.ALLE_SAISONS = seasons.slice();
  globalThis.DB = new Map();
  invalidateCache(); 0`);
// Elo nach jeder Partie, aus der Bahn der App.
const H = new Map(JSON.parse(K(`JSON.stringify(getGlobalSim().history.map(h => [h.matchId, h.eloAfter]))`)));
const AV = JSON.parse(K(`JSON.stringify(Object.fromEntries(players.map(p => [p.id, avHtml(p, '', {})])))`));

const pad = n => String(n).padStart(2, '0');
const tagKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const nm = id => NAME[id];
const r1 = x => Math.round(x);
const pct = x => Math.round(x * 100);
const MONAT = t => new Date(t).toLocaleDateString('de-DE', {month:'long'});
const ZAHL = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
const zahlwort = n => n <= 12 ? ZAHL[n] : String(n);
const vzL = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const mal = n => n === 1 ? 'einmal' : n === 2 ? 'zweimal' : n === 3 ? 'dreimal' : n + '-mal';
const und = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' und ' + l[l.length - 1] : (l[0] || '');
// Die Leiter der runden Zahlen wie in der App (`_ladderCrossing`): 1, 2,5
// und 5 je Zehnerpotenz, ab einer Untergrenze.
const leiter = min => { const l = []; for(let p = 1; p <= 1e5; p *= 10) [1, 2.5, 5].forEach(r => { const v = r * p; if(Number.isInteger(v) && v >= min) l.push(v); }); return l.sort((a, b) => a - b); };
const naechste = (n, min) => leiter(min).find(v => v > n);
const GERN = new Set(['common', 'rare', 'legendary']);

// ── Der Stand aus den Partien ───────────────────────────────────────
// Alles, was ein Fakt aus den Partien bis zu einem Zeitpunkt braucht.
function stand(T){
  const bis = liga.filter(m => Date.parse(m.created_at) <= T);
  const S = {n:bis.length, erste:bis.length ? Date.parse(bis[0].created_at) : 0, sp:{}, duo:{}, h2h:{}, partner:{}, paarung:{}, wtag:[0, 0, 0, 0, 0, 0, 0], std:{}};
  const sp = id => S.sp[id] || (S.sp[id] = {g:0, w:0, tore:0, elo:[], pos:{atk:{g:0, w:0}, def:{g:0, w:0}}, posFolge:[], erw:[], aussen:{g:0, w:0}});
  bis.forEach(m => {
    const t = Date.parse(m.created_at), aw = m.winner === 'A', d = new Date(t), el = H.get(m.id) || {};
    S.wtag[(d.getDay() + 6) % 7]++; S.std[d.getHours()] = (S.std[d.getHours()] || 0) + 1;
    [[m.a1, m.a1_pos, true], [m.a2, m.a2_pos, true], [m.b1, m.b1_pos, false], [m.b2, m.b2_pos, false]].forEach(([id, pos, a]) => {
      const s = sp(id), won = a === aw, e = a ? m.exp_a : 1 - m.exp_a;
      s.g++; if(won) s.w++; s.tore += a ? m.score_a : m.score_b;
      s.pos[pos].g++; if(won) s.pos[pos].w++; s.posFolge.push(pos);
      s.erw.push({e, w:won ? 1 : 0, t});
      if(e < .45){ s.aussen.g++; if(won) s.aussen.w++; }
      if(el[id] != null) s.elo.push({t, e:el[id]});
    });
    [[m.a1, m.a2, aw], [m.b1, m.b2, !aw]].forEach(([x, y, won]) => {
      const k = [x, y].sort().join('|'), q = S.duo[k] || (S.duo[k] = {g:0, w:0, l:[]});
      q.g++; if(won) q.w++; q.l.push(won ? 1 : 0);
      [[x, y], [y, x]].forEach(([u, v]) => { const pa = S.partner[u] || (S.partner[u] = {}); if(!pa[v]) pa[v] = t; });
    });
    const dk = [[m.a1, m.a2].sort().join('|'), [m.b1, m.b2].sort().join('|')], pk = dk.slice().sort().join('#');
    (S.paarung[pk] = S.paarung[pk] || []).push({s:dk[aw ? 0 : 1], t});
    const W = aw ? [m.a1, m.a2] : [m.b1, m.b2], L = aw ? [m.b1, m.b2] : [m.a1, m.a2];
    W.forEach(w => L.forEach(l => { (S.h2h[w + '|' + l] = S.h2h[w + '|' + l] || []).push(1); (S.h2h[l + '|' + w] = S.h2h[l + '|' + w] || []).push(0); }));
  });
  return S;
}

// ── Die Fakten ──────────────────────────────────────────────────────
// Je Art eine Funktion: (Stand, App, Uhr) → Liste von Fällen, jeder mit
// Spielern, Spannung, Schlagzeile, Satz und den Daten seiner Zeichnung.
const fall = (key, pids, spannung, title, desc, bild) => ({key, pids, spannung:Math.max(0, Math.min(100, Math.round(spannung))), title, desc, bild});
const FAKTEN = {
  titel_rennen:(S, A, U) => {
    const r = A.rank;
    if(U.tagNr < 7 || U.rest < 8 || r.length < 2) return [];
    const gap = r[0].elo - r[1].elo;
    if(gap > 40) return [];
    const dritter = r[2] && r[0].elo - r[2].elo <= 60 ? r[2] : null;
    const title = gap <= 3 ? `${nm(r[0].id)} und ${nm(r[1].id)} gleichauf an der Spitze des ${U.monat}s`
      : `${nm(r[0].id)} führt den ${U.monat} mit ${gap} Elo vor ${nm(r[1].id)}`;
    const desc = (dritter ? `${nm(dritter.id)} folgt mit ${r[0].elo - dritter.elo} Elo Rückstand. ` : '') + `Noch ${U.rest} Tage bis zum Monatsende.`;
    return [fall('titel_rennen', [r[0].id, r[1].id].concat(dritter ? [dritter.id] : []), 95 - gap * 1.2 + (dritter ? 6 : 0), title, desc,
      {r:r.slice(0, 4).map(x => ({p:x.id, elo:x.elo, g:x.games})), rest:U.rest})];
  },
  titel_wechsel:(S, A, U) => {
    const l = U.fuehrung.filter(x => x.p);
    let w = 0; for(let i = 1; i < l.length; i++) if(l[i].p !== l[i - 1].p) w++;
    if(w < 3 || !A.rank[0]) return [];
    const wer = [...new Set(l.map(x => x.p))];
    return [fall('titel_wechsel', wer.slice(0, 3), 40 + w * 7, `Die Spitze des ${U.monat}s wechselte schon ${mal(w)}`,
      `${und(wer.map(nm))} standen im ${U.monat} schon oben. Heute führt ${nm(A.rank[0].id)}.`, {tage:U.fuehrung, wechsel:w, monatTage:U.monatTage})];
  },
  schluss_sprint:(S, A, U) => {
    const r = A.rank;
    if(U.rest > 7 || r.length < 2) return [];
    const an = r.filter(x => r[0].elo - x.elo <= 40);
    if(an.length < 2) return [];
    const title = U.rest === 0 ? `Letzter Tag im ${U.monat}: ${an.length > 2 ? zahlwort(an.length) + ' können' : nm(an[1].id) + ' kann'} ${nm(r[0].id)} noch abfangen`
      : `Noch ${U.rest} ${U.rest === 1 ? 'Tag' : 'Tage'}: ${an.length === 2 ? `${nm(an[0].id)} und ${nm(an[1].id)} machen den ${U.monat} unter sich aus` : `${zahlwort(an.length)} können den ${U.monat} noch gewinnen`}`;
    const desc = `${nm(r[0].id)} führt mit ${r[0].elo - r[1].elo} Elo vor ${nm(r[1].id)}.`;
    return [fall('schluss_sprint', an.slice(0, 4).map(x => x.id), 70 + an.length * 6 - U.rest * 3 + Math.max(0, 20 - (r[0].elo - r[1].elo)) / 2, title, desc,
      {r:an.slice(0, 4).map(x => ({p:x.id, elo:x.elo})), rest:U.rest, monatTage:U.monatTage})];
  },
  rekord_jagd:(S, A) => A.rek.filter(x => x.r.length >= 2 && x.r[0].wert > 0 && x.r[1].wert > 0 && x.r[1].wert < x.r[0].wert && x.r[1].wert / x.r[0].wert >= .85)
    .map(x => { const q = x.r[1].wert / x.r[0].wert;
      return fall('rekord_jagd', [x.r[1].pid, x.r[0].pid], 50 + (q - .85) / .15 * 45, `${nm(x.r[1].pid)} rückt an den Rekord „${x.name}“ heran`,
        `${nm(x.r[0].pid)} hält ihn, ${nm(x.r[1].pid)} hat ${String(Math.floor(q * 1000) / 10).replace('.', ',')} % davon.`, {name:x.name, r:x.r.slice(0, 3).map(y => ({p:y.pid, w:y.wert, ev:y.ev}))}); }),
  rekord_tafel:(S, A) => {
    const z = A.rekZ;
    if(z.length < 2 || z[0].n - z[1].n > 2 || z[0].n < 3) return [];
    const gleich = z[0].n === z[1].n;
    return [fall('rekord_tafel', [z[0].pid, z[1].pid], gleich ? 62 : 52 - (z[0].n - z[1].n) * 4,
      gleich ? `${nm(z[0].pid)} und ${nm(z[1].pid)} halten gleich viele Liga-Rekorde` : `${nm(z[0].pid)} hält ${z[0].n} Liga-Rekorde, ${nm(z[1].pid)} ${z[1].n}`,
      z[2] ? `Dahinter ${nm(z[2].pid)} mit ${z[2].n}.` : '', {r:z.slice(0, 5).map(y => ({p:y.pid, n:y.n}))})];
  },
  auszeich_selten:(S, A) => {
    const halter = {};
    A.badges.forEach(b => b.l.forEach(x => { if(x.r === 'legendary' || x.r === 'rare') (halter[x.id] = halter[x.id] || {name:x.name, r:x.r, p:[]}).p.push(b.pid); }));
    return Object.keys(halter).filter(id => halter[id].p.length <= 2).map(id => { const h = halter[id];
      return fall('auszeich_selten', h.p, (h.r === 'legendary' ? 66 : 50) + (h.p.length === 1 ? 8 : 0),
        h.p.length === 1 ? `Nur ${nm(h.p[0])} trägt „${h.name}“` : `Nur ${nm(h.p[0])} und ${nm(h.p[1])} tragen „${h.name}“`,
        `${h.r === 'legendary' ? 'Legendär' : 'Selten'}: ${zahlwort(IDS.length - h.p.length)} der Liga haben die Auszeichnung noch nie geholt.`,
        {name:h.name, r:h.r, p:h.p, alle:IDS}); });
  },
  auszeich_marke:(S, A) => {
    const out = [];
    // Nur, was man gern holt: eine Auszeichnung, die keiner will, zählt
    // hier nicht mit.
    A.badges.forEach(b => b.l.forEach(x => { if(x.n < 4 || !GERN.has(x.r)) return; const z = naechste(x.n, 5);
      if(z && z - x.n === 1) out.push(fall('auszeich_marke', [b.pid], (x.r === 'legendary' ? 64 : x.r === 'rare' ? 56 : 46) + Math.min(12, z / 5),
        `Noch einmal „${x.name}“, und ${nm(b.pid)} holt sie zum ${z}. Mal`, `${x.n}-mal steht sie schon in der Vitrine.`, {name:x.name, r:x.r, n:x.n, ziel:z})); }));
    return out;
  },
  chronik_monat:(S, A, U) => {
    if(U.tagNr < 10) return [];
    const je = {};
    A.titel.forEach(t => (je[t.pid] = je[t.pid] || []).push(t.name));
    return Object.keys(je).filter(p => je[p].length >= 3).map(p => fall('chronik_monat', [p], 40 + je[p].length * 7,
      `${nm(p)} hält im ${U.monat} schon ${zahlwort(je[p].length)} Einträge der Chronik`,
      `Darunter „${je[p][0]}“ und „${je[p][1]}“. ${A.titel.length} Einträge sind im ${U.monat} vergeben.`,
      {p, l:je[p], alle:A.titel.length}));
  },
  laufbahn_marke:(S) => {
    const out = [];
    Object.keys(S.sp).forEach(p => { const s = S.sp[p];
      [['Sieg', s.w, 100], ['Spiel', s.g, 100], ['Tor', s.tore, 500]].forEach(([was, n, min]) => {
        const z = naechste(n, min); if(!z) return;
        const fehlt = z - n;
        if(fehlt > 3) return;
        const plur = {Sieg:fehlt === 1 ? 'Sieg' : 'Siege', Spiel:fehlt === 1 ? 'Spiel' : 'Spiele', Tor:fehlt === 1 ? 'Tor' : 'Tore'}[was];
        out.push(fall('laufbahn_marke', [p], 74 - fehlt * 7 + Math.min(10, z / 100),
          `${nm(p)} fehl${fehlt === 1 ? 't' : 'en'} ${fehlt === 1 ? (was === 'Spiel' ? 'ein' : 'ein') : zahlwort(fehlt)} ${plur} zum ${z}. ${was}`,
          was === 'Sieg' ? `${n} Siege aus ${s.g} Partien.` : was === 'Spiel' ? `${s.w} davon gewonnen.` : `${n} Tore in ${s.g} Partien.`,
          {p, was, n, ziel:z}));
      }); });
    return out;
  },
  laufbahn_gipfel:(S, A, U) => {
    const out = [];
    Object.keys(S.sp).forEach(p => { const e = S.sp[p].elo; if(e.length < 30) return;
      let top = e[0]; e.forEach(x => { if(x.e > top.e) top = x; });
      const jetzt = e[e.length - 1], fehlt = r1(top.e - jetzt.e);
      if(fehlt <= 0 || fehlt > 12 || U.T - top.t < 14 * 864e5) return;
      out.push(fall('laufbahn_gipfel', [p], 62 - fehlt * 2, `${nm(p)} fehlen ${fehlt} Elo zum eigenen Höchststand`,
        `${r1(top.e)} Elo am ${new Date(top.t).toLocaleDateString('de-DE', {day:'numeric', month:'long'})}, heute ${r1(jetzt.e)}.`,
        {p, top:{t:top.t, e:r1(top.e)}, kurve:e.filter((x, i) => i % Math.max(1, Math.floor(e.length / 60)) === 0 || i === e.length - 1).map(x => r1(x.e))}));
    });
    return out;
  },
  insig_schwelle:(S, A) => A.pres.filter(x => x.naechste && x.fehlt > 0 && x.fehlt <= 150).map(x =>
    fall('insig_schwelle', [x.pid], 72 - x.fehlt / 5 + x.stufe * 2, `${nm(x.pid)} fehlen ${x.fehlt} Prestige zum ${x.naechste}`,
      `Heute ${x.ins}, ${x.punkte} Prestige.`, {p:x.pid, punkte:x.punkte, stufe:x.stufe, fehlt:x.fehlt, stufen:A.stufen})),
  insig_duell:(S, A) => {
    const out = [], l = A.pres;
    // Erst ab 300 Prestige: im Mai trennten „3 Prestige“ zwei mit 11 und 8.
    for(let i = 1; i < l.length; i++){ const d = l[i - 1].punkte - l[i].punkte;
      if(d <= 60 && l[i].punkte >= 300) out.push(fall('insig_duell', [l[i].pid, l[i - 1].pid], 60 - d / 2 + (i <= 2 ? 6 : 0),
        d === 0 ? `${nm(l[i - 1].pid)} und ${nm(l[i].pid)}: gleich viel Prestige` : `${d} Prestige trennen ${nm(l[i - 1].pid)} und ${nm(l[i].pid)}`,
        `Platz ${i} und ${i + 1} im Prestige der Liga.`, {a:{p:l[i - 1].pid, n:l[i - 1].punkte}, b:{p:l[i].pid, n:l[i].punkte}, platz:i})); }
    return out;
  },
  team_chemie:(S) => Object.keys(S.duo).filter(k => S.duo[k].g >= 10).map(k => {
    const [a, b] = k.split('|'), q = S.duo[k].w / S.duo[k].g, qa = S.sp[a].w / S.sp[a].g, qb = S.sp[b].w / S.sp[b].g, plus = q - (qa + qb) / 2;
    return plus >= .12 ? fall('team_chemie', [a, b], 40 + plus * 150, `Zusammen gewinnen ${nm(a)} und ${nm(b)} ${pct(q)} %`,
      `Allein ${nm(a)} ${pct(qa)} %, ${nm(b)} ${pct(qb)} %. ${S.duo[k].g} Partien zu zweit.`, {a, b, q:pct(q), qa:pct(qa), qb:pct(qb), g:S.duo[k].g}) : null; }).filter(Boolean),
  team_ungeschlagen:(S) => Object.keys(S.duo).filter(k => S.duo[k].g >= 4 && S.duo[k].w === S.duo[k].g).map(k => { const [a, b] = k.split('|');
    return fall('team_ungeschlagen', [a, b], 48 + S.duo[k].g * 4, `${nm(a)} und ${nm(b)} haben zu zweit noch nie verloren`,
      `${zahlwort(S.duo[k].g)} Partien, ${zahlwort(S.duo[k].g)} Siege.`, {a, b, l:S.duo[k].l}); }),
  team_nie:(S) => {
    const out = [], p = Object.keys(S.sp).filter(x => S.sp[x].g >= 60);
    p.forEach((a, i) => p.slice(i + 1).forEach(b => { if(S.duo[[a, b].sort().join('|')]) return;
      out.push(fall('team_nie', [a, b], 42 + Math.min(S.sp[a].g, S.sp[b].g) / 20, `${nm(a)} und ${nm(b)} haben noch nie zusammen gespielt`,
        `${S.sp[a].g} und ${S.sp[b].g} Partien, keine davon auf derselben Seite.`,
        {a, b, m:IDS.map(x => IDS.map(y => x === y ? -1 : (S.duo[[x, y].sort().join('|')] || {g:0}).g))})); }));
    return out;
  },
  position_seiten:(S) => Object.keys(S.sp).map(p => { const s = S.sp[p].pos;
    if(s.atk.g < 15 || s.def.g < 15) return null;
    const qa = s.atk.w / s.atk.g, qd = s.def.w / s.def.g, d = qa - qd;
    return Math.abs(d) >= .2 ? fall('position_seiten', [p], 42 + Math.abs(d) * 80,
      `Im Sturm gewinnt ${nm(p)} ${pct(qa)} %, in der Abwehr ${pct(qd)} %`,
      `${s.atk.g} Partien vorn, ${s.def.g} hinten.`, {p, atk:{g:s.atk.g, q:pct(qa)}, def:{g:s.def.g, q:pct(qd)}}) : null; }).filter(Boolean),
  abweich_mehr:(S) => Object.keys(S.sp).map(p => { const l = S.sp[p].erw.slice(-40); if(l.length < 40) return null;
    const d = l.reduce((s, x) => s + x.w - x.e, 0);
    if(d < 4) return null;
    let k = 0; const kurve = [0].concat(l.map(x => +(k += x.w - x.e).toFixed(2)));
    return fall('abweich_mehr', [p], 44 + d * 5, `${nm(p)} gewinnt mehr, als die Chancen sagen`,
      `In den letzten 40 Partien ${l.filter(x => x.w).length} Siege, erwartet waren ${r1(l.reduce((s, x) => s + x.e, 0))}.`, {p, d:+d.toFixed(1), kurve}); }).filter(Boolean),
  abweich_weniger:(S) => Object.keys(S.sp).map(p => { const l = S.sp[p].erw.slice(-40); if(l.length < 40) return null;
    const d = l.reduce((s, x) => s + x.w - x.e, 0);
    if(d > -4) return null;
    let k = 0; const kurve = [0].concat(l.map(x => +(k += x.w - x.e).toFixed(2)));
    return fall('abweich_weniger', [p], 38 + -d * 4, `${nm(p)} fehlen Siege auf die eigenen Chancen`,
      `In den letzten 40 Partien ${l.filter(x => x.w).length} Siege, erwartet waren ${r1(l.reduce((s, x) => s + x.e, 0))}.`, {p, d:+d.toFixed(1), kurve}); }).filter(Boolean),
  abweich_aussen:(S) => Object.keys(S.sp).map(p => { const a = S.sp[p].aussen; if(a.g < 12) return null;
    const q = a.w / a.g; if(q < .48) return null;
    return fall('abweich_aussen', [p], 40 + (q - .48) * 200, `Als Außenseiter gewinnt ${nm(p)} ${pct(q)} %`,
      `${a.w} von ${a.g} Partien mit einer Siegchance unter 45 %.`, {p, q:pct(q), g:a.g, w:a.w}); }).filter(Boolean),
  duell_serie:(S) => Object.keys(S.h2h).map(k => { const l = S.h2h[k]; let n = 0;
    for(let i = l.length - 1; i >= 0 && l[i] === 1; i--) n++;
    // Wer nie verloren hat, ist „Nie verloren“, nicht eine Serie.
    if(n < 6 || n === l.length) return null;
    const [a, b] = k.split('|');
    return fall('duell_serie', [a, b], 42 + n * 4, `${nm(a)} hat ${nm(b)} ${zahlwort(n)} Duelle in Folge geschlagen`,
      `Insgesamt ${l.filter(x => x).length}:${l.filter(x => !x).length} in ${l.length} Duellen.`, {a, b, l:l.slice(-14), n}); }).filter(Boolean),
  duell_kipp:(S) => Object.keys(S.h2h).map(k => { const [a, b] = k.split('|'); if(a > b) return null;
    const l = S.h2h[k], w = l.filter(x => x).length, v = l.length - w;
    if(l.length < 30 || Math.abs(w - v) > 1) return null;
    const vorn = w >= v ? a : b, hinten = vorn === a ? b : a;
    return fall('duell_kipp', [a, b], 50 + (w === v ? 10 : 0) + Math.min(10, l.length / 20),
      w === v ? `${nm(a)} und ${nm(b)}: ${w}:${v} nach ${l.length} Duellen` : `Ein Sieg, und ${nm(hinten)} gleicht gegen ${nm(vorn)} aus`,
      w === v ? 'Keiner liegt vorn.' : `${Math.max(w, v)}:${Math.min(w, v)} für ${nm(vorn)} nach ${l.length} Duellen.`,
      {a, b, w, v, l:l.slice(-20)}); }).filter(Boolean),
  titel_meister:(S, A, U) => {
    const r = A.rankAll, m = A.meister;
    if(U.tagNr < 5 || !m || r.length < 4) return [];
    const i = r.findIndex(x => x.id === m.pid);
    if(i < 0) return [];
    const platz = i + 1, hinten = platz >= r.length - 1;
    return [fall('titel_meister', [m.pid], platz === 1 ? 72 : platz <= 3 ? 56 : hinten ? 60 : 40,
      platz === 1 ? `${nm(m.pid)} verteidigt: Platz 1 auch im ${U.monat}` : `Der Meister des ${m.monat}s steht im ${U.monat} auf Platz ${platz}`,
      platz === 1 ? `${r[0].elo - r[1].elo} Elo vor ${nm(r[1].id)}.` : `${nm(r[0].id)} führt, ${r[0].elo - r[i].elo} Elo vor ${nm(m.pid)}.`,
      {r:r.slice(0, 12).map(x => ({p:x.id})), m:m.pid, monat:m.monat})];
  },
  rekord_wechsel:(S, A, U) => A.rek.map(x => {
    const h = U.halter[x.id] || [], jetzt = x.r[0];
    if(!jetzt || (x.r[1] && x.r[1].wert === jetzt.wert)) return null;
    let i = h.length - 1; while(i >= 0 && h[i].pid === jetzt.pid) i--;
    if(i < 0 || i === h.length - 1) return null;
    const seit = h[i + 1].T, alt = h[i].pid, tage = Math.round((U.T - seit) / 864e5);
    if(tage > 14) return null;
    return fall('rekord_wechsel', [jetzt.pid, alt], 64 - tage * 1.5, `${nm(jetzt.pid)} hält jetzt „${x.name}“`,
      `Seit ${tage <= 1 ? 'gestern' : tage + ' Tagen'}; davor hielt ihn ${nm(alt)}.`, {name:x.name, neu:{p:jetzt.pid, ev:jetzt.ev}, alt}); }).filter(Boolean),
  form_monat:(S, A, U) => { if(U.tagNr < 7) return [];
    const T0 = new Date(new Date(U.T).getFullYear(), new Date(U.T).getMonth(), 1).getTime();
    return Object.keys(S.sp).map(p => { const e = S.sp[p].elo, vor = e.filter(x => x.t < T0), im = e.filter(x => x.t >= T0);
      if(!vor.length || im.length < 8) return null;
      const g = r1(im[im.length - 1].e - vor[vor.length - 1].e);
      if(g < 60) return null;
      const siege = S.sp[p].erw.filter(x => x.t >= T0 && x.w).length;
      return fall('form_monat', [p], 46 + g / 4, `${nm(p)} hat im ${U.monat} schon +${g} Elo geholt`, `${siege} von ${im.length} Partien im ${U.monat} gewonnen.`,
        {p, g, kurve:[r1(vor[vor.length - 1].e)].concat(im.map(x => r1(x.e)))}); }).filter(Boolean); },
  team_alle:(S, A, U) => Object.keys(S.sp).map(p => { const pa = S.partner[p] || {}, andere = IDS.filter(x => x !== p);
    if(!andere.every(x => pa[x])) return null;
    const letzter = andere.reduce((m, x) => pa[x] > pa[m] ? x : m, andere[0]);
    if(U.T - pa[letzter] > 30 * 864e5) return null;
    return fall('team_alle', [p, letzter], 55, `${nm(p)} hat jetzt mit allen ${zahlwort(andere.length)} zusammengespielt`,
      `Als Letzter kam ${nm(letzter)} dazu, am ${new Date(pa[letzter]).toLocaleDateString('de-DE', {day:'numeric', month:'long'})}.`,
      {p, letzter, l:andere.map(x => ({p:x, g:(S.duo[[p, x].sort().join('|')] || {g:0}).g}))}); }).filter(Boolean),
  position_wechsel:(S) => Object.keys(S.sp).map(p => { const f = S.sp[p].posFolge; if(f.length < 60) return null;
    const qj = f.slice(-20).filter(x => x === 'atk').length / 20, qv = f.slice(-60, -20).filter(x => x === 'atk').length / 40, d = qj - qv;
    if(Math.abs(d) < .3) return null;
    return fall('position_wechsel', [p], 48 + Math.abs(d) * 50, d > 0 ? `${nm(p)} spielt jetzt vorn` : `${nm(p)} spielt jetzt hinten`,
      `In den letzten 20 Partien ${pct(qj)} % im Sturm, in den 40 davor ${pct(qv)} %.`, {p, qj:pct(qj), qv:pct(qv)}); }).filter(Boolean),
  duell_weisse:(S) => Object.keys(S.h2h).map(k => { const l = S.h2h[k]; if(l.length < 6 || l.some(x => !x)) return null;
    const [a, b] = k.split('|');
    return fall('duell_weisse', [a, b], 46 + l.length * 3, `${nm(a)} hat gegen ${nm(b)} noch nie verloren`,
      `${l.length}:0 in ${l.length} Duellen.`, {a, b, l:l.slice(-14), n:l.length}); }).filter(Boolean),
  duell_vier:(S) => Object.keys(S.paarung).map(k => { const l = S.paarung[k]; if(l.length < 5) return null;
    const [d1, d2] = k.split('#'), w1 = l.filter(x => x.s === d1).length, w2 = l.length - w1, q = Math.max(w1, w2) / l.length;
    if(q < .8) return null;
    const vorn = w1 >= w2 ? d1 : d2, hinten = vorn === d1 ? d2 : d1, V = vorn.split('|'), Hn = hinten.split('|');
    return fall('duell_vier', V.concat(Hn), 44 + l.length * 2 + (q === 1 ? 8 : 0),
      `${nm(V[0])} und ${nm(V[1])} gegen ${nm(Hn[0])} und ${nm(Hn[1])}: ${Math.max(w1, w2)}:${Math.min(w1, w2)}`,
      `${zahlwort(l.length)} Begegnungen genau dieser zwei Paare, die letzte am ${new Date(l[l.length - 1].t).toLocaleDateString('de-DE', {day:'numeric', month:'long'})}.`,
      {v:V, h:Hn, w:Math.max(w1, w2), l:Math.min(w1, w2), folge:l.slice(-12).map(x => x.s === vorn ? 1 : 0)}); }).filter(Boolean),
  liga_marke:(S) => { const z = Math.ceil((S.n + 1) / 100) * 100, fehlt = z - S.n;
    if(S.n < 50 || fehlt > 5) return [];
    return [fall('liga_marke', [], 46 + (5 - fehlt) * 4 + (z % 500 === 0 ? 10 : 0),
      `Noch ${fehlt === 1 ? 'eine Partie' : zahlwort(fehlt) + ' Partien'} bis zur ${z}. Partie der Liga`,
      `${S.n} Partien seit dem ${new Date(S.erste).toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'})}.`, {p:null, was:'Liga', n:S.n, ziel:z})]; },
  // Die Form der letzten 14 Tage gegen den Rest der Liga: das Elo, das
  // jeder in diesem Fenster gewann oder verlor.
  form_liga:(S, A, U) => { const T0 = U.T - 14 * 864e5;
    const l = Object.keys(S.sp).map(p => { const e = S.sp[p].elo, vor = e.filter(x => x.t < T0), im = e.filter(x => x.t >= T0);
      return vor.length && im.length >= 4 ? {p, d:r1(im[im.length - 1].e - vor[vor.length - 1].e), n:im.length} : null; }).filter(Boolean).sort((a, b) => b.d - a.d);
    if(l.length < 6 || l[0].d < 30 || l[0].d - l[1].d < 15) return [];
    return [fall('form_liga', [l[0].p], 46 + (l[0].d - l[1].d) / 2, `${nm(l[0].p)} ist die Form der Liga: ${vzL(l[0].d)} Elo in zwei Wochen`,
      `Dahinter ${nm(l[1].p)} mit ${vzL(l[1].d)}; ${l.filter(x => x.d < 0).length} der ${l.length} verloren in der Zeit Elo.`, {l, p:l[0].p})]; },
  // Die Siegquote der letzten 14 Tage gegen die eigene Laufbahn, für jeden
  // der Liga: wer liegt am weitesten über sich selbst.
  form_quote:(S, A, U) => { const T0 = U.T - 14 * 864e5;
    const l = Object.keys(S.sp).map(p => { const e = S.sp[p].erw, im = e.filter(x => x.t >= T0), vor = e.filter(x => x.t < T0);
      return im.length >= 8 && vor.length >= 20 ? {p, q:pct(im.filter(x => x.w).length / im.length), qa:pct(vor.filter(x => x.w).length / vor.length), n:im.length} : null; }).filter(Boolean)
      .map(x => Object.assign(x, {d:x.q - x.qa})).sort((a, b) => b.d - a.d);
    if(l.length < 5 || l[0].d < 20) return [];
    return [fall('form_quote', [l[0].p], 44 + l[0].d, `${nm(l[0].p)} gewinnt seit zwei Wochen ${l[0].q} %, sonst ${l[0].qa} %`,
      `${l[0].n} Partien in 14 Tagen; niemand der Liga liegt weiter über der eigenen Laufbahn.`, {l, p:l[0].p})]; },
  liga_spanne:(S, A, U) => { const akt = Object.keys(S.sp).filter(p => S.sp[p].g >= 20 && S.sp[p].elo.filter(x => x.t <= U.T - 30 * 864e5).length >= 20);
    const elo = (p, T) => { const e = S.sp[p].elo.filter(x => x.t <= T); return e.length ? e[e.length - 1].e : null; };
    const jetzt = akt.map(p => ({p, e:elo(p, U.T)})), vor = akt.map(p => ({p, e:elo(p, U.T - 30 * 864e5)})).filter(x => x.e != null);
    if(jetzt.length < 6 || vor.length < 6) return [];
    const lo = l => Math.min(...l.map(x => x.e)), hi = l => Math.max(...l.map(x => x.e)), a = r1(hi(jetzt) - lo(jetzt)), b = r1(hi(vor) - lo(vor));
    if(Math.abs(a - b) < 40) return [];
    return [fall('liga_spanne', [], 34, a < b ? 'Die Liga rückt zusammen' : 'Die Liga zieht auseinander',
      `${a} Elo zwischen dem Ersten und dem Letzten, vor 30 Tagen ${b}.`,
      {jetzt:jetzt.map(x => ({p:x.p, e:r1(x.e)})), vor:{lo:r1(lo(vor)), hi:r1(hi(vor))}, a, b})]; },
  liga_wochentag:(S) => { if(S.n < 100) return [];
    const i = S.wtag.indexOf(Math.max(...S.wtag)), q = S.wtag[i] / S.n;
    if(q < .25) return [];
    const TAG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    return [fall('liga_wochentag', [], 28, `${TAG[i]} ist der Tag der Liga`, `${pct(q)} % aller ${S.n} Partien fielen auf einen ${TAG[i]}.`, {w:S.wtag, i})]; },
  liga_stunde:(S) => { if(S.n < 100) return [];
    const h = Object.keys(S.std).map(Number).sort((a, b) => S.std[b] - S.std[a])[0];
    return [fall('liga_stunde', [], 24, `Um ${h} Uhr wird am meisten gekickert`, `${S.std[h]} von ${S.n} Partien begannen zwischen ${h} und ${h + 1} Uhr.`,
      {s:Object.fromEntries(Object.entries(S.std).map(([k, v]) => [k, v])), h})]; }
};
Object.keys(FAKT).forEach(k => { if(!FAKTEN[k]) throw new Error('Fakt ohne Rechnung: ' + k); });

// ── Wählen ──────────────────────────────────────────────────────────
// Die Sperren der Durchgänge; der vierte lässt nur noch die Art der
// letzten vier und das Paar aus Art und Spieler gelten, der fünfte nichts.
const SPERRE = [
  {art:10, rubrik:2, spieler:3, paar:true},
  {art:10, rubrik:2, spieler:1, paar:true},
  {art:10, rubrik:1, spieler:0, paar:true},
  {art:4,  rubrik:0, spieler:0, paar:true},
  // Der Notnagel: an einem Tag blieb sonst nichts, weil jeder Fakt, den
  // die Paar-Sperre ließ, zu den letzten vier gehörte — und in der ersten
  // Woche der Liga trifft kaum etwas zu.
  {art:0,  rubrik:0, spieler:0, paar:false}
];
const PAAR_TAGE = 90;
const los = s => { let h = 2166136261 >>> 0; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function waehle(kand, spur, U){
  // Das Titelrennen kennt keine Paar-Sperre: es sind jeden Monat dieselben
  // oben, und der Schlussspurt des Septembers fiel sonst aus, weil Martin
  // schon im August vorn lag.
  const paarFrei = f => FAKT[f.key].spitze || !spur.some(x => x.key === f.key && U.T - x.T <= PAAR_TAGE * 864e5 && f.pids.some(p => x.pids.includes(p)))
    && !(f.pids.length === 0 && spur.some(x => x.key === f.key && U.T - x.T <= PAAR_TAGE * 864e5));
  for(let d = 0; d < SPERRE.length; d++){
    // `slice(-0)` ist die ganze Liste: eine Sperre über null Fun Facts
    // sperrte sonst alles, was je stand.
    const s = SPERRE[d], jung = n => n ? spur.slice(-n) : [];
    const frei = kand.filter(f => (!s.paar || paarFrei(f))
      && !jung(Math.min(s.art, FAKT[f.key].abstand || s.art)).some(x => x.key === f.key)
      && !jung(s.rubrik).some(x => FAKT[x.key].rubrik === FAKT[f.key].rubrik)
      && (FAKT[f.key].spitze || !jung(s.spieler).some(x => x.pids.some(p => f.pids.includes(p)))));
    // Wer in den letzten zehn Fun Facts schon stand, verliert je Auftritt
    // zehn Punkte: sonst trugen die, die viel spielen und viel halten,
    // jeden vierten Tag.
    const oft = f => FAKT[f.key].spitze ? 0 : f.pids.reduce((n, p) => n + spur.slice(-10).filter(x => x.pids.includes(p)).length, 0);
    const wert = f => f.spannung - 10 * oft(f);
    if(frei.length) return {f:frei.sort((a, b) => wert(b) - wert(a) || los(U.tag + a.key + a.pids.join()) - los(U.tag + b.key + b.pids.join()))[0], durchgang:d};
  }
  return null;
}

// ── Der Lauf ────────────────────────────────────────────────────────
const ersterMs = Date.parse(liga[0].created_at);
const TAGE = [], spur = [], fuehrung = {}, beste = {}, HALTER = {};
let fehlerApp = 0;
const t0 = Date.now();
// Tag für Tag über das Datum, nicht über 24 Stunden: am Ende der Sommerzeit
// stand der 25. Oktober sonst zweimal da.
for(let d0 = new Date(tagKey(ersterMs) + 'T00:00:00'); d0.getTime() <= letzterMs + 864e5; d0 = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1)){
  const t = d0.getTime(), tag = tagKey(t), d = new Date(t), T = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 0, 0).getTime();
  setNow(T);
  const vorher = liga.some(m => tagKey(Date.parse(m.created_at)) === tag && Date.parse(m.created_at) <= T);
  // Der Generator der App läuft an jedem Tag um 15 Uhr: so kennt sie die
  // Fun Facts der Tage davor und ihre Sperren wie im Betrieb.
  let A = null;
  try {
    A = JSON.parse(K(`(() => {
      matches = ALLE.filter(m => new Date(m.created_at).getTime() <= ${T});
      seasons = ALLE_SAISONS.filter(s => seasonEnd(s.id).getTime() < ${T});
      invalidateCache();
      _cache._stories = [...DB.values()].sort(_storyFolge);
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      _buildStories().forEach(s => { if(!DB.has(s.id)) DB.set(s.id, s); });
      const sid = currentSeason().id, C = _seasonTitleCtx(sid);
      const aus = {sid, rank:C.rank.map(r => ({id:r.id, elo:Math.round(r.elo), games:r.games})),
        rankAll:C.rankAll.filter(r => r.games > 0).map(r => ({id:r.id, elo:Math.round(r.elo), games:r.games}))};
      const vs = (ALLE_SAISONS.filter(x => x.id < sid).slice(-1)[0] || null), vz = vs && seasons.find(x => x.id === vs.id);
      aus.meister = vz && vz.player_id ? {pid:vz.player_id, monat:new Date(vz.id + '-15T12:00:00').toLocaleDateString('de-DE', {month:'long'})} : null;
      if(${vorher}) return JSON.stringify(aus);
      const amb = DB.get('ambient_${tag}_15');
      if(amb){ const d = amb.dataRef || {};
        aus.app = {key:d.sub || '', rubrik:d.ambientRubrik || '', title:amb.title, desc:amb.desc || '',
          pids:Array.isArray(d.ambientPids) ? d.ambientPids : d.ambientPid ? [d.ambientPid] : [], html:_newsCardHtmlM2(amb, true)}; }
      aus.rek = CHRONICLES.filter(c => !c.neg && c.kind !== 'fuegung' && c.val).map(c => ({id:c.id, name:c.name,
        r:chronicleRang(c.id).slice(0, 3).map(x => ({pid:x.pid, wert:x.wert, ev:x.ev}))}));
      aus.rekZ = rekordZaehlung().slice(0, 5);
      aus.titel = (seasonTitles(sid).awarded || []).map(a => ({id:a.titleId, name:a.name, pid:a.pid, ev:a.ev}));
      const P = prestigeTabelle();
      aus.pres = P.rang.map(pid => { const x = prestigeOf(pid);
        return {pid, punkte:Math.round(x.punkte), stufe:x.stufe, ins:INSIGNIEN[x.stufe].name, naechste:x.naechste ? x.naechste.name : '', fehlt:Math.round(x.fehlt)}; });
      aus.stufen = INSIGNIEN.map(s => ({name:s.name, min:s.min}));
      aus.badges = players.filter(p => ligaAktiv(p)).map(p => ({pid:p.id,
        l:(getCachedBadges(p.id) || []).map(b => ({id:b.id, name:b.name, n:b.count || 1, r:rarityOf(b.id)}))}));
      return JSON.stringify(aus);
    })()`));
  } catch(e){ fehlerApp++; console.error('App', tag, String(e).slice(0, 160)); continue; }
  // Wer um 15 Uhr den Monat anführt, Tag für Tag: für den Wechsel an der
  // Spitze.
  const sid = tag.slice(0, 7);
  (fuehrung[sid] = fuehrung[sid] || []).push({tag, p:A.rank[0] ? A.rank[0].id : null});
  if(vorher) continue;
  const monatTage = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const U = {T, tag, tagNr:d.getDate(), monat:MONAT(T), rest:monatTage - d.getDate(), monatTage, fuehrung:fuehrung[sid].slice()};
  // Wer jeden Rekord an diesem Tag hält: für den Wechsel des Halters.
  (A.rek || []).forEach(x => { if(x.r[0]) (HALTER[x.id] = HALTER[x.id] || []).push({T, pid:x.r[0].pid}); });
  U.halter = HALTER;
  const S = stand(T);
  const kand = [];
  Object.keys(FAKTEN).forEach(k => { let l = []; try { l = FAKTEN[k](S, A, U) || []; } catch(e){ console.error(k, tag, String(e).slice(0, 120)); }
    l.forEach(f => kand.push(f)); });
  const w = waehle(kand, spur, U);
  if(w){ spur.push({key:w.f.key, pids:w.f.pids, T, tag}); }
  // Je Art der spannendste Fall des ganzen Laufs: das Beispiel der Seite.
  kand.forEach(f => { if(!beste[f.key] || f.spannung > beste[f.key].spannung) beste[f.key] = Object.assign({tag}, f); });
  TAGE.push({tag, T, app:A.app || null, wahl:w ? Object.assign({durchgang:w.durchgang}, w.f) : null,
    kand:kand.map(f => ({key:f.key, pids:f.pids, spannung:f.spannung, title:f.title}))});
  if(TAGE.length % 20 === 0) console.error(`  … ${tag} · ${TAGE.length} Tage · ${Math.round((Date.now() - t0) / 1000)} s`);
}

// ── Was die Wahl ergibt ─────────────────────────────────────────────
const zahl = l => l.reduce((o, k) => { if(k != null) o[k] = (o[k] || 0) + 1; return o; }, {});
const reihe = (l, f) => l.map(f);
const folgeMax = l => { let m = 0, n = 0; for(let i = 0; i < l.length; i++){ n = i && l[i] && l[i] === l[i - 1] ? n + 1 : 1; m = Math.max(m, n); } return m; };
const abstandMin = (l, gleich) => { let m = Infinity; for(let i = 0; i < l.length; i++) for(let j = i + 1; j < l.length && j - i < m; j++) if(gleich(l[i], l[j])) m = j - i; return m; };
const E = TAGE.map(x => x.wahl).filter(Boolean), Aq = TAGE.map(x => x.app).filter(Boolean);
const paare = (l, art) => { const s = {}; l.forEach(x => (x.pids.length ? x.pids : ['']).forEach(p => { const k = x.key + '|' + p; s[k] = (s[k] || 0) + 1; })); return Object.values(s).filter(n => n > 1).length; };
const spieler = l => zahl(l.flatMap(x => x.pids));
const STAT = {
  tage:TAGE.length, fehlerApp,
  entwurf:{n:E.length, arten:Object.keys(zahl(E.map(x => x.key))).length, rubriken:zahl(E.map(x => FAKT[x.key].rubrik)), art:zahl(E.map(x => x.key)),
    spieler:spieler(E), ohneSpieler:E.filter(x => !x.pids.length).length, paarWieder:paare(E),
    artAbstand:abstandMin(E, (a, b) => a.key === b.key), rubrikFolge:folgeMax(E.map(x => FAKT[x.key].rubrik)),
    spielerAbstand:abstandMin(E, (a, b) => a.pids.some(p => b.pids.includes(p))), durchgang:zahl(TAGE.filter(x => x.wahl).map(x => x.wahl.durchgang)),
    spannung:E.length ? Math.round(E.reduce((s, x) => s + x.spannung, 0) / E.length) : 0},
  app:{n:Aq.length, arten:Object.keys(zahl(Aq.map(x => x.key))).length, art:zahl(Aq.map(x => x.key)), spieler:spieler(Aq), paarWieder:paare(Aq),
    artAbstand:abstandMin(Aq, (a, b) => a.key === b.key), spielerAbstand:abstandMin(Aq, (a, b) => a.pids.some(p => b.pids.includes(p)))},
  kandidaten:zahl(TAGE.flatMap(x => [...new Set(x.kand.map(f => f.key))])),
  kandJeTag:TAGE.length ? +(TAGE.reduce((s, x) => s + x.kand.length, 0) / TAGE.length).toFixed(1) : 0
};
fs.writeFileSync(path.join(__dirname, '.fun-fakten.json'), JSON.stringify({av:AV, name:NAME, ids:IDS, tage:TAGE, beste, stat:STAT}));
console.log(JSON.stringify(STAT, null, 1).slice(0, 3000));
console.log(TAGE.length + ' Tage · ' + Math.round((Date.now() - t0) / 1000) + ' s');
