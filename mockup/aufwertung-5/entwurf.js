// Der Entwurf der fünften Aufwertung. Läuft IN der ausgelieferten App
// (bau.js) und rechnet mit ihren Daten und Bauteilen — kein zweiter
// Generator, keine erfundenen Zahlen. In die App fließt davon nichts
// [CLAUDE.md §2].
//
// Drei Teile:
//   1. Die Fakten einer Partie, gerechnet bis zu dieser Partie.
//   2. Die Köpfe: je Ereignis eine eigene Grafik, und eine Regel, wann sie
//      steht. Dazu die Kombinationen, wenn eine Partie mehrere Anlässe hat.
//   3. Die Blätter: ein gemeinsamer Bau (Bühne, Kernsatz, Warum besonders,
//      So kam es, Beteiligte), je Typ gefüllt.
(function(){
const V = window.__V = {};
const TAG = 86400000;
const pmV = () => pmap();
const nm = id => _spName(id);
const nb = id => `<b>${esc(nm(id))}</b>`;
const und = ids => _spUnd(ids);
const vz = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + _spZahl(n);
const pct = x => Math.round(x * 100);
const chip = id => _spChip(id);
const wappen = (id, px) => _spWappen(id, px || 48);
const ic = n => svgI(n);
const deckel = (n, max) => Math.max(0, Math.min(max, n));

// ── 1. Die Fakten einer Partie ─────────────────────────────────────────
// Alles bis EINSCHLIESSLICH dieser Partie: eine Karte von vorletzter Woche
// erzählt vom Stand von damals [§C31].
const _fMemo = new Map();
V.fakten = function(m){
  if(_fMemo.has(m.id)) return _fMemo.get(m.id);
  const B = _spBasis(), i = B.idx.get(m.id);
  const W = _spSieger(m), L = _spVerlierer(m);
  const h = getHistoryByMatchId().get(m.id) || {};
  const eb = h.eloBefore || {};
  const c = _spChance(m);
  const diff = Math.abs(m.score_a - m.score_b);
  const F = {m, i, W, L, c, diff, nr:i + 1, sa:m.score_a, sb:m.score_b, aw:m.winner === 'A'};
  F.hoch = Math.max(m.score_a, m.score_b); F.tief = Math.min(m.score_a, m.score_b);
  F.delta = {}; [...W, ...L].forEach(id => { F.delta[id] = _newsEloDelta(id, m.id) || 0; });
  F.elo = {}; [...W, ...L].forEach(id => { F.elo[id] = Math.round(eb[id] != null ? eb[id] : cfg.start_elo); });
  F.gewinn = W.reduce((s, id) => s + F.delta[id], 0);
  const eigene = id => _spEigene(id, m);
  // Zähler: Partien und Siege je Spieler bis hier.
  F.zahl = {};
  [...W, ...L].forEach(id => { const l = eigene(id); F.zahl[id] = {p:l.length, s:l.filter(x => _spGew(x, id)).length}; });
  // Das Duo der Sieger: jede gemeinsame Partie bis hier.
  const zusammen = (a, b) => eigene(a).filter(x => _spSeite(x, a) === _spSeite(x, b) && (x.a1 === b || x.a2 === b || x.b1 === b || x.b2 === b));
  const duo = zusammen(W[0], W[1]);
  F.duo = {p:duo.length, s:duo.filter(x => _spGew(x, W[0])).length, folge:duo.map(x => _spGew(x, W[0]))};
  // Der direkte Vergleich je Sieger gegen je Verlierer.
  F.gegner = [];
  W.forEach(w => L.forEach(l => {
    const l2 = eigene(w).filter(x => (x.a1 === l || x.a2 === l || x.b1 === l || x.b2 === l) && _spSeite(x, w) !== _spSeite(x, l));
    const folge = l2.map(x => _spGew(x, w));
    // Wie viele Niederlagen gegen ihn standen direkt vor dieser Partie?
    let fluch = 0; for(let k = folge.length - 2; k >= 0 && !folge[k]; k--) fluch++;
    F.gegner.push({w, l, n:folge.length, s:folge.filter(Boolean).length, folge, fluch});
  }));
  // Der Tag: alle Partien desselben Kalendertags.
  const tk = tagKey(m.created_at);
  const tag = B.chrono.filter(x => tagKey(x.created_at) === tk);
  F.tag = {alle:tag, pos:tag.indexOf(m), n:tag.length, key:tk};
  F.tagSieger = W.map(id => { const l = tag.filter(x => mts(x) <= mts(m) && [x.a1, x.a2, x.b1, x.b2].includes(id));
    return {id, folge:l.map(x => _spGew(x, id)), ids:l.map(x => x.id)}; });
  // Die Revanche: dieselben vier am selben Tag, eben andersherum ausgegangen.
  const set = [m.a1, m.a2, m.b1, m.b2].slice().sort().join(',');
  const vorher = tag.slice(0, F.tag.pos).reverse().find(x => [x.a1, x.a2, x.b1, x.b2].slice().sort().join(',') === set);
  if(vorher){
    const wv = _spSieger(vorher).slice().sort().join(','), wj = W.slice().sort().join(',');
    const gleicheTeams = [vorher.a1, vorher.a2].slice().sort().join(',') === wj || [vorher.b1, vorher.b2].slice().sort().join(',') === wj;
    if(gleicheTeams && wv !== wj) F.revanche = {vorher, min:Math.round((mts(m) - mts(vorher)) / 60000)};
  }
  // Die Rückkehr: wie lange die letzte eigene Partie zurückliegt.
  F.pause = W.map(id => { const l = eigene(id); const v = l[l.length - 2]; return {id, tage: v ? Math.floor((mts(m) - mts(v)) / TAG) : null, vorher:v}; });
  // Die Tabelle vor der Partie, wenn sie belastbar ist.
  let frei = false; try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  F.rang = {}; [...W, ...L].forEach(id => { F.rang[id] = frei ? _newsRankChange(id, m.id) : null; });
  // Wie oft ein Ergebnis mit diesem Abstand bis hier vorkam.
  F.vert = Array.from({length:11}, (_, d) => B.kum[d][i + 1]);
  _fMemo.set(m.id, F);
  return F;
};
// Die Liga-Verteilung von Siegchance und Abstand, für das Streudiagramm.
let _streu = null;
V.streuDaten = () => _streu || (_streu = _spBasis().chrono.map(x => ({id:x.id, c:_spChance(x), d:Math.abs(x.score_a - x.score_b)})).filter(p => p.c != null));
// Die größten Elo-Gewinne der Liga: ab welchem Gewinn ist einer groß?
let _swingGrenze = null;
V.swingGrenze = () => {
  if(_swingGrenze != null) return _swingGrenze;
  const g = _spBasis().chrono.map(x => _spSieger(x).reduce((s, id) => s + (_newsEloDelta(id, x.id) || 0), 0)).sort((a, b) => b - a);
  return (_swingGrenze = g[Math.floor(g.length * .12)] || 40);
};

// ── 2. Die Köpfe ───────────────────────────────────────────────────────
// Jede Variante hat eine Regel (`wann`, gibt Daten oder null zurück), ein
// Gewicht (`rang`: je seltener und erzählender, desto höher) und ein Bild.
// Die Wahl im Feed nimmt die schwerste zutreffende, die in den letzten
// zwei Partie-Karten nicht schon stand — und das Spielfeld höchstens auf
// jeder fünften.
const VAR = V.VAR = {};
const def = (key, o) => { VAR[key] = Object.assign({key}, o); };
// Jeder Kopf trägt oben sein Zeichen und seinen Namen: das Rubrikband bleibt
// „Am Spieltag", und die Form sagt selbst, wovon sie erzählt.
const kopfRahmen = (key, inner, extra) => `<div class="v5k v5k-${key}${extra ? ' ' + extra : ''}"><div class="v5k-marke">${ic(VAR[key].ic)}<b>${esc(VAR[key].name)}</b></div>${inner}</div>`;
const namenZeile = (W, L) => `<div class="v5-nz"><span class="w">${_spStapel(W)}</span><span class="v5-nz-gg">gegen</span><span>${_spStapel(L)}</span></div>`;
// Der Stand gehört dem Sieger: seine Zahl zuerst [§C33 „Das Ergebnis im Text gehört dem Sieger"].
const stand = F => `<b class="num v5-st"><em>${F.hoch}</em>:${F.tief}</b>`;

// 2.1 Das Tauziehen — die gewöhnliche Partie mit zwei bis fünf Toren
def('tauziehen', {name:'Das Tauziehen', ic:'scaleBalance', rang:10, art:'Ergebnis',
  regel:'Jede Partie mit zwei bis fünf Toren Abstand, wenn nichts Besonderes vorliegt. Die häufigste Form — sie ersetzt das Spielfeld als Grundform.',
  wann: F => F.diff >= 2 && F.diff <= 5 ? {} : null,
  bild: F => {
    const anteil = F.hoch / (F.hoch + F.tief);
    const pos = Math.round((F.aw ? 1 - anteil : anteil) * 100);
    const team = (ids, w) => `<div class="v5-tz-t${w ? ' w' : ''}">${ids.map(id => wappen(id, 48)).join('')}
      <span class="v5-tz-d num">${ids.map(id => `<i class="${F.delta[id] >= 0 ? 'g' : 'r'}">${vz(F.delta[id])}</i>`).join('')}</span></div>`;
    return kopfRahmen('tauziehen', `<div class="v5-tz">${team(_spTeam(F.m, 'A'), F.aw)}
      <div class="v5-tz-seil"><span class="v5-tz-band"></span><span class="v5-tz-mitte"></span>
        <span class="v5-tz-knoten" style="--pos:${pos}%"><b class="num">${F.hoch}:${F.tief}</b></span>
        <span class="v5-tz-zone ${F.aw ? 'l' : 'r'}"></span></div>
      ${team(_spTeam(F.m, 'B'), !F.aw)}</div>${namenZeile(F.W, F.L)}`);
  }});

// 2.2 Pflicht erfüllt — der Favorit setzt sich durch
def('tacho', {name:'Pflicht erfüllt', ic:'target', rang:20, art:'Erwartung',
  regel:'Der Favorit gewinnt: mindestens 62 % Siegchance vor dem Anstoß. Die Nadel zeigt, wie sicher es war — und der Stand, ob das Ergebnis so klar war wie die Rechnung.',
  wann: F => F.c != null && F.c >= .62 && F.diff < 6 ? {} : null,
  bild: F => {
    const w = pct(F.c), ang = -90 + F.c * 180;
    const bogen = (a0, a1, cls) => { const p = a => [50 + 40 * Math.cos((a - 180) * Math.PI / 180), 50 + 40 * Math.sin((a - 180) * Math.PI / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1); return `<path class="${cls}" d="M${x0.toFixed(1)} ${y0.toFixed(1)} A40 40 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; };
    return kopfRahmen('tacho', `<div class="v5-ta">
      <div class="v5-ta-uhr"><svg viewBox="0 0 100 56">${bogen(0, 180, 'v5-ta-grund')}${bogen(0, F.c * 180, 'v5-ta-fill')}
        ${[0, 25, 50, 75, 100].map(t => { const a = (t / 100 * 180 - 180) * Math.PI / 180; return `<line x1="${(50 + 34 * Math.cos(a)).toFixed(1)}" y1="${(50 + 34 * Math.sin(a)).toFixed(1)}" x2="${(50 + 30 * Math.cos(a)).toFixed(1)}" y2="${(50 + 30 * Math.sin(a)).toFixed(1)}" class="v5-ta-tick"/>`; }).join('')}
        <g class="v5-ta-nadel" style="--ang:${ang.toFixed(1)}deg"><line x1="50" y1="50" x2="50" y2="16"/><circle cx="50" cy="50" r="3.2"/></g></svg>
        <div class="v5-ta-w num">${w} %</div><div class="v5-ta-l">Siegchance vorher</div></div>
      <div class="v5-ta-r"><div class="v5-ta-chips">${_spChips(F.W)}</div>${stand(F)}
        <div class="v5-ta-wort">${F.diff >= 4 ? 'so klar wie erwartet' : 'knapper als die Rechnung'}</div>
        <div class="v5-ta-gg">${_spChips(F.L)}</div></div></div>${namenZeile(F.W, F.L)}`);
  }});

// 2.3 Erwartung gegen Ergebnis — das Streudiagramm
def('streu', {name:'Erwartung gegen Ergebnis', ic:'chartBar', rang:34, art:'Erwartung',
  regel:'Das Ergebnis weicht deutlich von der Rechnung ab: der Favorit (ab 70 %) gewinnt mit höchstens zwei Toren, oder eine offene Partie (unter 50 %) endet mit fünf und mehr. Die Partie steht als Punkt unter allen der Liga.',
  wann: F => F.c != null && ((F.c >= .7 && F.diff <= 2) || (F.c < .5 && F.diff >= 5)) ? {knapp:F.c >= .7} : null,
  bild: (F, x) => {
    const pts = V.streuDaten().filter(p => p.id !== F.m.id);
    const X = c => 8 + c * 84, Y = d => 52 - d * 4.4;
    // Die Erwartung: der mittlere Abstand je Zehntel Siegchance.
    const mittel = [];
    for(let k = 0; k < 10; k++){ const z = pts.filter(p => p.c >= k / 10 && p.c < (k + 1) / 10); if(z.length >= 4) mittel.push([X(k / 10 + .05), Y(z.reduce((s, p) => s + p.d, 0) / z.length)]); }
    const anteil = pts.filter(p => x.knapp ? (p.c >= .7 && p.d <= F.diff) : (p.c < .5 && p.d >= F.diff)).length;
    return kopfRahmen('streu', `<div class="v5-sd"><svg viewBox="0 0 100 58" class="v5-sd-svg">
        <line x1="8" y1="52" x2="94" y2="52" class="v5-sd-ax"/><line x1="8" y1="8" x2="8" y2="52" class="v5-sd-ax"/>
        ${pts.map(p => `<circle cx="${X(p.c).toFixed(1)}" cy="${(Y(p.d) + (p.id.charCodeAt(4) % 5 - 2) * .35).toFixed(1)}" r=".95" class="v5-sd-p"/>`).join('')}
        <polyline points="${mittel.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="v5-sd-erw"/>
        <circle cx="${X(F.c).toFixed(1)}" cy="${Y(F.diff).toFixed(1)}" r="5" class="v5-sd-ring"/>
        <circle cx="${X(F.c).toFixed(1)}" cy="${Y(F.diff).toFixed(1)}" r="2.3" class="v5-sd-dies"/>
      </svg>
      <div class="v5-sd-ach"><span>↑ Abstand</span><span>Chance →</span></div>
      <div class="v5-sd-t"><div class="v5-sd-z num">${stand(F)}</div><div class="v5-sd-w">${x.knapp ? 'knapper als erwartet' : 'deutlicher als erwartet'}</div>
        <div class="v5-sd-k">bei <b class="num">${pct(F.c)} %</b> Siegchance · so ${x.knapp ? 'eng' : 'klar'} nur <b class="num">${anteil}</b> von <b class="num">${pts.length}</b></div></div></div>
      ${namenZeile(F.W, F.L)}`);
  }});

// 2.4 Der Elo-Transfer — viel Elo wandert über den Tisch
def('transfer', {name:'Der Elo-Transfer', ic:'boomerang', rang:30, art:'Wirkung',
  regel:'Die Sieger gewinnen zusammen so viel Elo wie nur jede achte Partie der Liga. Die Punkte fließen sichtbar von einer Seite zur anderen.',
  wann: F => F.gewinn >= V.swingGrenze() ? {} : null,
  bild: F => {
    const seite = (ids, w) => `<div class="v5-et-s${w ? ' w' : ''}">${ids.map(id => `<div class="v5-et-p">${wappen(id, 48)}<b class="num ${F.delta[id] >= 0 ? 'g' : 'r'}">${vz(F.delta[id])}</b></div>`).join('')}</div>`;
    const teilchen = Array.from({length:14}, (_, k) => `<i style="--k:${k};--y:${(k * 37) % 100}%"></i>`).join('');
    return kopfRahmen('transfer', `<div class="v5-et">${seite(F.L, false)}
      <div class="v5-et-fluss">${teilchen}<span class="v5-et-sum num">${vz(F.gewinn)}<small>Elo</small></span>${stand(F)}</div>
      ${seite(F.W, true)}</div>
      <div class="v5-nz"><span>${_spStapel(F.L)}</span><span class="v5-nz-gg">an</span><span class="w">${_spStapel(F.W)}</span></div>`);
  }});

// 2.5 Eingespielt — das Duo der Sieger
const RUND = new Set([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100]);
def('chemie', {name:'Eingespielt', ic:'handshake', rang:26, art:'Duo',
  regel:'Das Sieger-Duo hat mindestens zwölf Partien zusammen und gewinnt drei von vier — oder erreicht eine runde Zahl gemeinsamer Siege (5, 10, 15, 20 …). Bei der runden Zahl wiegt die Karte schwerer.',
  wann: F => (F.duo.p >= 12 && F.duo.s / F.duo.p >= .75) || (RUND.has(F.duo.s) && F.duo.p >= 5) ? {rund:RUND.has(F.duo.s)} : null,
  gewicht: x => x.rund ? 38 : 0,
  bild: (F, x) => {
    const n = F.duo.folge.length, r = 21, u = 2 * Math.PI * r;
    const seg = F.duo.folge.slice(-30).map((w, k, a) => { const l = u / a.length; return `<circle r="${r}" cx="28" cy="28" class="v5-ch-seg ${w ? 'w' : 'l'}${k === a.length - 1 ? ' dies' : ''}" style="stroke-dasharray:${(l - 1.2).toFixed(2)} ${(u - l + 1.2).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--k:${k}"/>`; }).join('');
    return kopfRahmen('chemie', `<div class="v5-ch">${wappen(F.W[0], 52)}
      <div class="v5-ch-ring"><svg viewBox="0 0 56 56">${seg}</svg><div class="v5-ch-z"><b class="num">${F.duo.s}.</b><span>Sieg</span></div></div>
      ${wappen(F.W[1], 52)}</div>
      <div class="v5-ch-t">${und(F.W)} · <b class="num">${F.duo.s}</b> von <b class="num">${n}</b> gemeinsam gewonnen${x.rund ? '' : ` · <b class="num">${pct(F.duo.s / n)} %</b>`}</div>`);
  }});

// 2.6 Lieblingsgegner und gebrochener Fluch — Spieler gegen Spieler
def('gegner', {name:'Lieblingsgegner', ic:'crossedSwords', rang:24, art:'Duell',
  regel:'Ein Sieger schlägt einen der Verlierer zum 5., 10., 15. … Mal und hat mindestens drei von vier Duellen gegen ihn gewonnen — oder gewinnt nach mindestens fünf Niederlagen in Folge gegen ihn zum ersten Mal wieder (der gebrochene Fluch, schwerer).',
  wann: F => {
    const fluch = F.gegner.filter(g => g.fluch >= 5).sort((a, b) => b.fluch - a.fluch)[0];
    if(fluch) return {g:fluch, fluch:true};
    const lieb = F.gegner.filter(g => g.n >= 6 && g.s / g.n >= .75 && g.s % 5 === 0).sort((a, b) => b.s / b.n - a.s / a.n || b.n - a.n)[0];
    return lieb ? {g:lieb, fluch:false} : null;
  },
  gewicht: x => x.fluch ? 42 : 0,
  bild: (F, x) => {
    const g = x.g, folge = g.folge.slice(-24);
    return kopfRahmen('gegner', `<div class="v5-gg">
      <div class="v5-gg-p w">${wappen(g.w, 52)}</div>
      <div class="v5-gg-m"><div class="v5-gg-wort">${x.fluch ? `Fluch gebrochen` : `Lieblingsgegner`}</div>
        <div class="v5-gg-z num"><b>${g.s}</b><span>:</span>${g.n - g.s}</div>
        <div class="v5-gg-reihe">${folge.map((w, k) => `<i class="${w ? 'w' : 'l'}${k === folge.length - 1 ? ' dies' : ''}" style="--k:${k}"></i>`).join('')}</div>
        <div class="v5-gg-l">${x.fluch ? `nach ${g.fluch} Niederlagen in Folge` : 'jede Begegnung als Gegner'}</div></div>
      <div class="v5-gg-p">${wappen(g.l, 52)}</div></div>
      <div class="v5-nz"><span class="w">${nb(g.w)}</span><span class="v5-nz-gg">gegen</span><span>${nb(g.l)}</span></div>`);
  }});

// 2.7 Die Revanche — dieselben vier, eben andersherum
def('revanche', {name:'Die Revanche', ic:'rematch', rang:28, art:'Tag',
  regel:'Dieselben zwei Duos haben sich am selben Tag schon getroffen, und diesmal gewinnt die andere Seite. Beide Stände nebeneinander, der Pfeil zeigt die Antwort.',
  wann: F => F.revanche ? F.revanche : null,
  bild: (F, x) => {
    const v = x.vorher, vW = _spSieger(v);
    const tafel = (sa, sb, lab, cls) => `<div class="v5-rv-t ${cls}"><span>${lab}</span><b class="num">${sa}:${sb}</b></div>`;
    // Aus Sicht der heutigen Sieger: vorher verloren, jetzt gewonnen.
    const vorEig = Math.min(v.score_a, v.score_b), vorGeg = Math.max(v.score_a, v.score_b);
    return kopfRahmen('revanche', `<div class="v5-rv">
      <div class="v5-rv-chips">${_spChips(F.W)}</div>
      <div class="v5-rv-m">${tafel(vorEig, vorGeg, new Date(v.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}), 'alt')}
        <svg viewBox="0 0 60 30" class="v5-rv-pfeil"><path d="M4 22 C 18 2, 42 2, 56 20"/><path d="M50 19 L56 20 L55 14" class="kopf"/></svg>
        ${tafel(F.hoch, F.tief, 'jetzt', 'neu')}</div>
      <div class="v5-rv-chips re">${_spChips(F.L)}</div></div>
      <div class="v5-rv-l">Antwort nach <b class="num">${x.min}</b> Minuten · ${und(F.W)} drehen das Ergebnis gegen ${und(F.L)}</div>`);
  }});

// 2.8 Der Tagesring — wer heute nicht zu stoppen ist
def('tagesring', {name:'Der Tagesring', ic:'sunrise', rang:22, art:'Tag',
  regel:'Ein Sieger hat heute mindestens vier Partien gespielt und drei von vier gewonnen. Der Ring zeigt seinen Tag bis zu dieser Partie, Feld für Feld.',
  wann: F => { const t = F.tagSieger.filter(t => t.folge.length >= 4 && t.folge.filter(Boolean).length / t.folge.length >= .75)
    .sort((a, b) => b.folge.filter(Boolean).length - a.folge.filter(Boolean).length)[0]; return t || null; },
  bild: (F, x) => {
    const n = x.folge.length, r = 30, u = 2 * Math.PI * r, l = u / n, s = x.folge.filter(Boolean).length;
    const seg = x.folge.map((w, k) => `<circle r="${r}" cx="38" cy="38" class="v5-tr-seg ${w ? 'w' : 'l'}${k === n - 1 ? ' dies' : ''}" style="stroke-dasharray:${(l - 2.5).toFixed(2)} ${(u - l + 2.5).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--k:${k}"/>`).join('');
    return kopfRahmen('tagesring', `<div class="v5-tr"><div class="v5-tr-ring"><svg viewBox="0 0 76 76">${seg}</svg><div class="v5-tr-av">${wappen(x.id, 48)}</div></div>
      <div class="v5-tr-t"><div class="v5-tr-k">Heute</div><div class="v5-tr-z num"><b>${s}</b> von ${n}</div>
        <div class="v5-tr-s">${nb(x.id)} · Partie ${n} des Tages</div>
        <div class="v5-tr-erg">${stand(F)} <span>gegen ${und(F.L)}</span></div></div></div>`);
  }});

// 2.9 Das Zählwerk — runde Zahlen
const MARKE = n => n >= 50 && n % 50 === 0;
def('zaehlwerk', {name:'Das Zählwerk', ic:'hundred', rang:44, art:'Meilenstein',
  regel:'Eine runde Zahl fällt in dieser Partie: die 50., 100., 150. … Partie oder der 50., 100. … Sieg eines Spielers, oder die 50., 100. … Partie der Liga. Die Ziffern rollen auf die neue Zahl.',
  wann: F => {
    for(const id of F.W){ if(MARKE(F.zahl[id].s)) return {wert:F.zahl[id].s, was:'Sieg', wer:id}; }
    for(const id of [...F.W, ...F.L]){ if(MARKE(F.zahl[id].p)) return {wert:F.zahl[id].p, was:'Partie', wer:id}; }
    if(F.nr % 50 === 0) return {wert:F.nr, was:'Partie der Liga', wer:null};
    return null;
  },
  bild: (F, x) => {
    const ziff = String(x.wert).padStart(3, '0').split('');
    const rolle = z => `<span class="v5-zw-r"><span class="v5-zw-band" style="--z:${z}">${Array.from({length:10}, (_, k) => `<i>${k}</i>`).join('')}</span></span>`;
    return kopfRahmen('zaehlwerk', `<div class="v5-zw">${x.wer ? wappen(x.wer, 52) : `<div class="v5-zw-liga">${ic('ball')}</div>`}
      <div class="v5-zw-m"><div class="v5-zw-w num">${ziff.map(rolle).join('')}<span class="v5-zw-p">.</span></div>
        <div class="v5-zw-l">${x.was}${x.wer ? ` von ${nb(x.wer)}` : ''}</div></div></div>
      <div class="v5-zw-erg">${stand(F)} · ${und(F.W)} gegen ${und(F.L)}</div>`);
  }});

// 2.10 Anpfiff und Schlusspfiff — der Tag auf der Uhr
def('uhr', {name:'Anpfiff und Schlusspfiff', ic:'clock', rang:14, art:'Tag',
  regel:'Die erste oder letzte Partie eines Tages mit mindestens sechs Partien. Auf dem Zifferblatt steht jede Partie des Tages als Strich, diese hell.',
  wann: F => F.tag.n >= 6 && (F.tag.pos === 0 || F.tag.pos === F.tag.n - 1) ? {erste:F.tag.pos === 0} : null,
  bild: (F, x) => {
    const ang = t => { const d = new Date(t); const h = d.getHours() % 12 + d.getMinutes() / 60; return h / 12 * 360 - 90; };
    const pt = (a, r) => [50 + r * Math.cos(a * Math.PI / 180), 50 + r * Math.sin(a * Math.PI / 180)];
    const striche = F.tag.alle.map((y, k) => { const a = ang(y.created_at), [x0, y0] = pt(a, 33), [x1, y1] = pt(a, 42);
      return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="${y === F.m ? 'dies' : ''}" style="--k:${k}"/>`; }).join('');
    const a = ang(F.m.created_at), zeit = new Date(F.m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
    return kopfRahmen('uhr', `<div class="v5-uh"><div class="v5-uh-blatt"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" class="v5-uh-rand"/>
        ${Array.from({length:12}, (_, k) => { const [x0, y0] = pt(k * 30, 45), [x1, y1] = pt(k * 30, 47); return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" class="v5-uh-h"/>`; }).join('')}
        <g class="v5-uh-striche">${striche}</g>
        <g class="v5-uh-zeiger" style="--a:${(a + 90).toFixed(1)}deg"><line x1="50" y1="50" x2="50" y2="20"/></g><circle cx="50" cy="50" r="2.6" class="v5-uh-nabe"/></svg></div>
      <div class="v5-uh-t"><div class="v5-uh-k">${x.erste ? 'Anpfiff' : 'Schlusspfiff'}</div><div class="v5-uh-z num">${zeit}</div>
        <div class="v5-uh-s">${x.erste ? 'die erste' : 'die letzte'} von <b class="num">${F.tag.n}</b> Partien des Tages</div>
        <div class="v5-uh-erg">${stand(F)} <span>${und(F.W)}</span></div></div></div>`);
  }});

// 2.11 Das Mosaik der Ergebnisse — wie gewöhnlich ist dieses Ergebnis?
def('mosaik', {name:'Das Mosaik', ic:'chartBar', rang:12, art:'Ergebnis',
  regel:'Für die häufigen engen Ergebnisse (zwei bis drei Tore): zehn Kacheln von 10:0 bis 10:9, jede so hell, wie oft die Liga so endete — dieses Ergebnis leuchtet.',
  wann: F => F.diff >= 2 && F.diff <= 3 && F.hoch === 10 ? {} : null,
  bild: F => {
    const sum = F.vert.reduce((s, v) => s + v, 0) || 1;
    const max = Math.max.apply(null, F.vert.slice(1));
    const k = d => `<div class="v5-mo-k${d === F.diff ? ' dies' : ''}" style="--a:${(F.vert[d] / max).toFixed(2)};--i:${d}"><b class="num">10:${10 - d}</b><span class="num">${pct(F.vert[d] / sum)} %</span></div>`;
    return kopfRahmen('mosaik', `<div class="v5-mo-kopf">${_spChips(F.W)}${stand(F)}${_spChips(F.L)}</div>
      <div class="v5-mo">${Array.from({length:10}, (_, i) => k(10 - i)).join('')}</div>
      <div class="v5-mo-l">Das <b class="num">${F.vert[F.diff]}.</b> ${F.hoch}:${F.tief} der Liga · ${und(F.W)} gegen ${und(F.L)}</div>`);
  }});

// 2.12 Gipfeltreffen — die Spitze der Tabelle am selben Tisch
def('gipfel', {name:'Gipfeltreffen', ic:'peak', rang:26, art:'Tabelle',
  regel:'Mindestens drei der vier standen vor dem Anstoß unter den ersten vier der Monatstabelle (nur, wenn die Tabelle belastbar ist). Die Tabelle zeigt, wer gegen wen gespielt hat.',
  wann: F => { const r = [...F.W, ...F.L].filter(id => F.rang[id] && F.rang[id].pre <= 4); return r.length >= 3 ? {} : null; },
  bild: F => {
    const zeilen = [...F.W, ...F.L].map(id => ({id, pre:F.rang[id] ? F.rang[id].pre : 99, post:F.rang[id] ? F.rang[id].post : 99, w:F.W.includes(id)})).sort((a, b) => a.pre - b.pre);
    return kopfRahmen('gipfel', `<div class="v5-gp">${zeilen.map((z, k) => `<div class="v5-gp-z${z.w ? ' w' : ''}" style="--k:${k}">
        <span class="v5-gp-r num">${z.pre}.</span>${chip(z.id)}<span class="v5-gp-n">${esc(nm(z.id))}</span>
        <span class="v5-gp-pf num ${z.post < z.pre ? 'g' : z.post > z.pre ? 'r' : ''}">${z.post !== z.pre ? `→ ${z.post}.` : '='}</span></div>`).join('')}
      <div class="v5-gp-erg">${stand(F)}<span>Gipfeltreffen</span></div></div>`);
  }});

// 2.13 Zwei Welten — ein Duo aus Stark und Neu
def('gefaelle', {name:'Zwei Welten', ic:'weight', rang:16, art:'Duo',
  regel:'Im Sieger-Duo liegen mindestens 220 Elo zwischen beiden. Die vier Säulen zeigen die Elo vor dem Anstoß; die Klammer, wer zusammen gespielt hat.',
  wann: F => Math.abs(F.elo[F.W[0]] - F.elo[F.W[1]]) >= 220 ? {} : null,
  bild: F => {
    const ids = [...F.W, ...F.L], max = Math.max.apply(null, ids.map(id => F.elo[id])), min = Math.min.apply(null, ids.map(id => F.elo[id]));
    const h = id => 22 + Math.round((F.elo[id] - min) / Math.max(1, max - min) * 58);
    const saeule = (id, w, k) => `<div class="v5-gf-s${w ? ' w' : ''}" style="--h:${h(id)}%;--k:${k}"><b class="num">${_spZahl(F.elo[id])}</b><i></i>${chip(id)}</div>`;
    return kopfRahmen('gefaelle', `<div class="v5-gf"><div class="v5-gf-team w">${F.W.map((id, k) => saeule(id, true, k)).join('')}<span class="v5-gf-kl">${_spZahl(Math.abs(F.elo[F.W[0]] - F.elo[F.W[1]]))} Elo dazwischen</span></div>
      <div class="v5-gf-sc">${stand(F)}</div>
      <div class="v5-gf-team">${F.L.map((id, k) => saeule(id, false, k + 2)).join('')}<span class="v5-gf-kl">${_spZahl(Math.abs(F.elo[F.L[0]] - F.elo[F.L[1]]))} Elo dazwischen</span></div></div>
      ${namenZeile(F.W, F.L)}`);
  }});

// 2.14 Zurück am Tisch — der Sieg nach einer langen Pause
def('rueckkehr', {name:'Zurück am Tisch', ic:'doorReturn', rang:32, art:'Spieler',
  regel:'Ein Sieger hatte mindestens zehn Tage keine Partie. Der Kalender zeigt die Lücke und diese Partie an ihrem Ende.',
  wann: F => F.pause.filter(p => p.tage != null && p.tage >= 10).sort((a, b) => b.tage - a.tage)[0] || null,
  bild: (F, x) => {
    const n = Math.min(28, x.tage + 2), tage = Array.from({length:n}, (_, k) => k);
    return kopfRahmen('rueckkehr', `<div class="v5-rk5">${wappen(x.id, 52)}
      <div class="v5-rk5-m"><div class="v5-rk5-z"><b class="num">${x.tage}</b> Tage Pause</div>
        <div class="v5-rk5-kal">${tage.map(k => `<i class="${k === 0 ? 'alt' : k === n - 1 ? 'dies' : ''}" style="--k:${k}"></i>`).join('')}</div>
        <div class="v5-rk5-l">${nb(x.id)} ist zurück · ${stand(F)} gegen ${und(F.L)}</div></div></div>`);
  }});

// 2.15 Das Spielfeld bleibt — aber nur, wo die Rollen etwas sagen
def('feld', {name:'Das Spielfeld', ic:'ball', rang:8, art:'Rollen',
  regel:'Rückfall, wenn keine andere Form zutrifft, und höchstens auf jeder fünften Partie-Karte. Heute steht es auf gut der Hälfte.',
  wann: () => ({}),
  bild: F => _spFeldBild(_spFeldDaten({m:F.m, c:F.c}))});

// Das Gewicht einer Variante für diese Partie.
V.kandidaten = function(m){
  const F = V.fakten(m);
  return Object.values(VAR).map(v => { let x = null; try { x = v.wann(F); } catch(e){ x = null; }
    return x ? {key:v.key, x, rang:Math.max(v.rang, v.gewicht ? v.gewicht(x) : 0)} : null; })
    .filter(Boolean).sort((a, b) => b.rang - a.rang);
};
V.bildVon = function(key, m, x){
  const F = V.fakten(m);
  if(x === undefined){ try { x = VAR[key].wann(F); } catch(e){ x = null; } }
  return VAR[key].bild(F, x || {});
};

// Die Wahl über eine Folge von Partie-Karten (in Lesereihenfolge): die
// schwerste zutreffende Form, die in den beiden Karten davor nicht stand;
// das Spielfeld höchstens einmal je fünf.
V.folgeWaehlen = function(ms){
  const out = [], spur = [];
  ms.forEach(m => {
    const k = V.kandidaten(m);
    // Was in den letzten zehn Karten schon stand, wiegt weniger: dieselbe
    // Form darf wiederkommen, aber nicht als Regel.
    const oft = key => spur.slice(-10).filter(x => x === key).length;
    const frei = k.filter(c => !spur.slice(-2).includes(c.key) && (c.key !== 'feld' || !spur.slice(-4).includes('feld')))
      .map(c => Object.assign({}, c, {eff:c.rang - 7 * oft(c.key)})).sort((a, b) => b.eff - a.eff);
    let wahl = frei[0] || k.find(c => c.key !== 'feld') || k[0];
    spur.push(wahl.key); out.push({m, wahl, alle:k});
  });
  return out;
};

// ── 2b. Die Kombinationen ─────────────────────────────────────────────
// Hat eine Partie zwei Anlässe, stehen nie zwei volle Grafiken. Drei Formen:
//   Stempel — der zweite Anlass ist eine Marke (Zählwerk, Premiere, eine
//             Auszeichnung): er fällt als Stempel in die Ecke des Kopfs.
//   Geteilt — beide haben eine kleine Form (Lauf, Treppe, Ring): sie stehen
//             halb und halb nebeneinander.
//   Leiste  — ab drei Anlässen: der stärkste trägt den Kopf, die übrigen
//             stehen als Leiste darunter, jeder mit Zeichen und einer Zahl.
V.stempel = (icn, oben, unten, ton) => `<div class="v5-stempel ${ton || ''}"><span class="v5-stempel-ic">${ic(icn)}</span><b>${oben}</b><small>${unten}</small></div>`;
V.leiste = eintraege => `<div class="v5-leiste">${eintraege.map((e, k) => `<span class="v5-leiste-e ${e.ton || ''}" style="--k:${k}">${ic(e.ic)}<b>${e.t}</b></span>`).join('')}</div>`;

// ── 2c. Schlagzeile und Satz je Variante ─────────────────────────────────
// Die Form allein reicht nicht: „Leon und Maxi setzen sich durch" stand über
// jeder gewöhnlichen Partie. Jede Variante bringt ihre eigene Zeile mit, und
// der Satz nennt die Zahl, die die Grafik nicht zeigt.
const TEXT = {
  tauziehen: F => ({t:`${_namenListe(F.W.map(nm))} ziehen das Spiel zu sich`, d:`${F.hoch}:${F.tief} gegen ${_namenListe(F.L.map(nm))}. ${F.diff} Tore Abstand.`}),
  tacho: F => ({t:`${_namenListe(F.W.map(nm))} lösen ihre Favoritenrolle ein`, d:`${pct(F.c)} % Siegchance vor dem Anstoß, am Ende ${F.hoch}:${F.tief}.`}),
  streu: (F, x) => ({t:x.knapp ? `${_namenListe(F.W.map(nm))} gewinnen knapper als gedacht` : `${_namenListe(F.W.map(nm))} gewinnen klarer als gedacht`,
    d:`Bei ${pct(F.c)} % Siegchance endet es ${F.hoch}:${F.tief}.`}),
  transfer: F => ({t:`${_spZahl(F.gewinn)} Elo wechseln die Seite`, d:`${_namenListe(F.W.map(nm))} nehmen ${_namenListe(F.L.map(nm))} so viel ab wie selten in der Liga.`}),
  chemie: (F, x) => ({t:x.rund ? `${_namenListe(F.W.map(nm))} feiern den ${F.duo.s}. gemeinsamen Sieg` : `${_namenListe(F.W.map(nm))} sind eingespielt`,
    d:`${F.duo.s} von ${F.duo.p} gemeinsamen Partien gewonnen.`}),
  gegner: (F, x) => ({t:x.fluch ? `${nm(x.g.w)} schlägt ${nm(x.g.l)} wieder` : `${nm(x.g.w)} schlägt ${nm(x.g.l)} zum ${x.g.s}. Mal`,
    d:x.fluch ? `Nach ${x.g.fluch} Niederlagen in Folge gegen ${nm(x.g.l)}.` : `${x.g.s} von ${x.g.n} Duellen gewonnen.`}),
  revanche: (F, x) => ({t:x.min <= 30 ? `${_namenListe(F.W.map(nm))} antworten sofort` : `${_namenListe(F.W.map(nm))} holen sich die Revanche`,
    d:`${x.min} Minuten nach der Niederlage gegen dieselben zwei steht es ${F.hoch}:${F.tief}.`}),
  tagesring: (F, x) => ({t:`${nm(x.id)} ist heute nicht zu stoppen`, d:`${x.folge.filter(Boolean).length} Siege aus ${x.folge.length} Partien an diesem Tag.`}),
  zaehlwerk: (F, x) => ({t:x.wer ? `${nm(x.wer)} feiert den ${x.wert}. ${x.was === 'Sieg' ? 'Sieg' : 'Einsatz'}` : `Die ${x.wert}. Partie der Liga`, d:`${F.hoch}:${F.tief}, ${_namenListe(F.W.map(nm))} gegen ${_namenListe(F.L.map(nm))}.`}),
  uhr: (F, x) => ({t:x.erste ? `${_namenListe(F.W.map(nm))} eröffnen den Spieltag` : `${_namenListe(F.W.map(nm))} haben das letzte Wort`, d:`${F.hoch}:${F.tief} als ${x.erste ? 'erste' : 'letzte'} von ${F.tag.n} Partien.`}),
  mosaik: F => { const sum = F.vert.reduce((a, b) => a + b, 0) || 1; return {t:`${_namenListe(F.W.map(nm))} gewinnen ${F.hoch}:${F.tief}`, d:`So enden ${pct(F.vert[F.diff] / sum)} % aller Partien der Liga. Es ist das ${F.vert[F.diff]}. Mal.`}; },
  gipfel: F => ({t:`Gipfeltreffen: ${_namenListe(F.W.map(nm))} behalten die Oberhand`, d:`Drei der vier standen vorher unter den ersten vier.`}),
  gefaelle: F => ({t:`${_namenListe(F.W.map(nm))} gewinnen als ungleiches Paar`, d:`${_spZahl(Math.abs(F.elo[F.W[0]] - F.elo[F.W[1]]))} Elo lagen zwischen den beiden.`}),
  rueckkehr: (F, x) => ({t:`${nm(x.id)} ist zurück`, d:`Nach ${x.tage} Tagen ohne Partie gleich ein ${F.hoch}:${F.tief}.`}),
  feld: F => ({t:`${_namenListe(F.W.map(nm))} setzen sich gegen ${_namenListe(F.L.map(nm))} durch`, d:`Vor dem Anstoß lag die Siegchance bei ${F.c != null ? pct(F.c) : 50} %.`})
};
V.text = (key, m, x) => { const F = V.fakten(m); if(x === undefined) x = VAR[key].wann(F); return TEXT[key](F, x || {}); };

// Die Karte im Bau der App: Rubrikband, Kopf, Schlagzeile, Satz, Fuß.
V.karte = function(o){
  const rub = o.rub || 'AM SPIELTAG';
  return `<div class="nf-card nf-s-${o.sorte || 'spiel'} v5-card${o.glanz ? ' nf-glanz' : ''}${o.neg ? ' nf-neg' : ''}"${o.glanz ? ' style="--gv:1.2s"' : ''}${o.blatt ? ` data-blatt="${o.blatt}"` : ''}>
    <span class="nf-motiv" aria-hidden="true">${ic(o.ic || 'ball')}</span>
    <div class="nf-top"><span class="nf-rub"><i>${ic(o.ic || 'ball')}</i><b>${esc(rub)}</b></span><span class="nf-when">${ic('clock')}${esc(o.zeit || '')}</span></div>
    ${o.kopf || ''}
    <div class="nf-gr">${o.gesicht || ''}<div class="nf-gr-r"><div class="nf-h">${esc(o.titel)}</div><div class="nf-d">${_newsBetont(o.satz || '')}</div></div>
      <span class="nf-chev">${ic('chevron')}</span></div>
    ${o.fuss || ''}</div>`;
};
const zeitVon = m => { const d = new Date(m.created_at); return d.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'}) + ', ' + d.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}); };
V.zeitVon = zeitVon;
V.varKarte = function(key, m, x){
  const F = V.fakten(m), v = VAR[key];
  if(x === undefined) x = v.wann(F);
  const tx = TEXT[key](F, x || {});
  return V.karte({ic:v.ic, art:v.name.toUpperCase(), zeit:zeitVon(m), kopf:v.bild(F, x || {}), titel:tx.t, satz:tx.d,
    glanz:['zaehlwerk', 'gegner', 'rueckkehr', 'transfer'].includes(key) && (key !== 'gegner' || (x && x.fluch)), blatt:'partie_' + m.id + '_' + key});
};

// ── 3. Die Blätter ───────────────────────────────────────────────────────
// Ein Bau für jeden Typ, damit man zwei Blätter nacheinander öffnet und alles
// an derselben Stelle findet: die BÜHNE (die Grafik der Karte, groß und in
// Bewegung), der KERNSATZ mit drei Zahlen, dann Abschnitte in fester Folge —
// warum es besonders ist, wie es dazu kam, wer beteiligt war. Jeder Abschnitt
// trägt eine Zeile, die in Worten sagt, was die Grafik zeigt.
V.blatt = o => `<div class="v5b nd-s-${o.sorte || 'spiel'}${o.neg ? ' v5b-neg' : ''}${o.ton ? ' v5b-' + o.ton : ''}">
  <div class="v5b-kopf"><span class="v5b-rub"><i>${ic(o.ic || 'ball')}</i><b>${esc(o.rub)}</b></span><span class="v5b-zeit">${esc(o.zeit || '')}</span><span class="v5b-x">×</span></div>
  <div class="v5b-buehne">${o.buehne || ''}</div>
  <div class="v5b-text v5-a" style="--d:1"><h3>${esc(o.titel)}</h3><p>${_newsBetont(o.satz || '')}</p></div>
  ${o.chips && o.chips.length ? `<div class="v5b-chips v5-a" style="--d:2">${o.chips.map(c => `<div class="v5b-chip ${c.ton || ''}"><b class="num">${c.v}</b><span>${esc(c.l)}</span></div>`).join('')}</div>` : ''}
  ${(o.ab || []).filter(a => a && a.html).map((a, k) => `<section class="v5b-ab v5-a" style="--d:${3 + k}"><div class="v5b-ab-k">${ic(a.ic)}<b>${esc(a.t)}</b>${a.r ? `<span class="v5b-r">${a.r}</span>` : ''}</div>${a.erkl ? `<p class="v5b-erkl">${a.erkl}</p>` : ''}${a.html}</section>`).join('')}
  ${o.weiter ? `<div class="v5b-weiter v5-a" style="--d:${4 + (o.ab || []).length}">${o.weiter}</div>` : ''}
</div>`;
const knopf = (t, voll) => `<span class="v5b-knopf${voll ? ' voll' : ''}">${esc(t)}</span>`;

// Bausteine der Abschnitte — jeder zeigt eine Sache und nur diese.
const M = V.M = {};
// Wer was gewonnen hat: Ausschlag um die Null, dahinter der Rangwechsel.
M.beteiligte = F => {
  const ids = [...F.W, ...F.L].sort((a, b) => F.delta[b] - F.delta[a]);
  const max = Math.max.apply(null, ids.map(id => Math.abs(F.delta[id]))) || 1;
  return `<div class="v5-bt">${ids.map((id, k) => { const d = F.delta[id], r = F.rang[id];
    return `<div class="v5-bt-z" style="--k:${k}">${chip(id)}<span class="v5-bt-n">${esc(nm(id))}</span>
      <span class="v5-bt-b"><i class="${d >= 0 ? 'p' : 'n'}" style="--w:${Math.max(6, Math.round(Math.abs(d) / max * 50))}%"></i></span>
      <b class="num ${d >= 0 ? 'g' : 'r'}">${vz(d)}</b>${r && r.pre !== r.post ? `<em class="num ${r.post < r.pre ? 'g' : 'r'}">${r.pre}.→${r.post}.</em>` : '<em></em>'}</div>`; }).join('')}</div>`;
};
// Der Tag als Leiste: jede Partie eine Zelle mit Stand, diese gerahmt.
M.tag = (F, fuer) => `<div class="v5-tl">${F.tag.alle.map((y, k) => { const mit = fuer ? [y.a1, y.a2, y.b1, y.b2].includes(fuer) : true;
  const w = fuer ? _spGew(y, fuer) : null;
  return `<span class="v5-tl-z${y === F.m ? ' dies' : ''}${!mit ? ' leer' : ''}${w === true ? ' w' : w === false ? ' l' : ''}" style="--k:${k}"><b class="num">${Math.max(y.score_a, y.score_b)}:${Math.min(y.score_a, y.score_b)}</b><small class="num">${new Date(y.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</small></span>`; }).join('')}</div>`;
// Eine Reihe von Zellen (Lauf), gewachsen von links.
M.lauf = (folge, opt) => `<div class="v5-lf${opt && opt.gross ? ' gross' : ''}">${folge.map((w, k) => `<i class="${w ? 'w' : 'l'}${opt && opt.dies === k ? ' dies' : ''}" style="--k:${k}"></i>`).join('')}</div>`;
// Eine Linie, die sich zeichnet; die Null als Strich.
M.linie = (werte, opt) => {
  opt = opt || {};
  const W = 300, H = opt.h || 90, n = werte.length;
  const min = Math.min.apply(null, werte.concat(opt.null != null ? [opt.null] : [])), max = Math.max.apply(null, werte.concat(opt.null != null ? [opt.null] : []));
  const X = i => 6 + i / Math.max(1, n - 1) * (W - 12), Y = v => 8 + (1 - (v - min) / Math.max(1, max - min)) * (H - 16);
  const pts = werte.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ');
  const zweite = opt.zweite ? `<polyline points="${opt.zweite.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" class="v5-li-l2" pathLength="1"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="v5-li ${opt.cls || ''}">${opt.null != null ? `<line x1="0" x2="${W}" y1="${Y(opt.null).toFixed(1)}" y2="${Y(opt.null).toFixed(1)}" class="v5-li-0"/>` : ''}
    ${zweite}<polyline points="${pts}" class="v5-li-l" pathLength="1"/>
    <circle cx="${X(n - 1).toFixed(1)}" cy="${Y(werte[n - 1]).toFixed(1)}" r="4" class="v5-li-p"/></svg>`;
};
// Balken mit Namen, Anteil als Länge, Zahl dahinter.
M.balken = (zeilen, opt) => {
  const max = Math.max.apply(null, zeilen.map(z => z.v)) || 1;
  return `<div class="v5-bk">${zeilen.map((z, k) => `<div class="v5-bk-z${z.hell ? ' hell' : ''}" style="--k:${k}">${z.id ? chip(z.id) : ''}<span class="v5-bk-n">${esc(z.n)}</span>
    <span class="v5-bk-b"><i style="--w:${Math.max(3, Math.round(z.v / max * 100))}%"></i></span><b class="num">${esc(z.t)}</b></div>`).join('')}</div>`;
};
// Eine Zeitleiste von oben nach unten.
M.zeit = items => `<div class="v5-zs">${items.map((it, k) => `<div class="v5-zs-e ${it.ton || ''}" style="--k:${k}"><span class="v5-zs-p"></span>
  <span class="v5-zs-z num">${esc(it.zeit)}</span><div class="v5-zs-t">${it.html}</div></div>`).join('')}</div>`;
// Die Abstände der Liga als Säulen, dieser hell.
M.verteilung = (vert, dies) => { const max = Math.max.apply(null, vert.slice(1)) || 1;
  return `<div class="v5-vt">${vert.slice(1).map((v, k) => `<span class="${k + 1 === dies ? 'dies' : ''}" style="--k:${k};--h:${Math.max(3, Math.round(v / max * 100))}%"><i></i><b class="num">${k + 1}</b></span>`).join('')}</div><div class="v5-vt-l"><span>1 Tor Abstand</span><span>10 Tore</span></div>`; };
// Eine Partie in einer Zeile: Chips, Stand, Gegner.
M.partie = (y, fuer) => { const w = _spSieger(y), l = _spVerlierer(y), gew = fuer ? _spGew(y, fuer) : true;
  const eig = fuer ? (gew ? w : l) : w, geg = fuer ? (gew ? l : w) : l;
  return `<span class="v5-pz">${_spChips(eig)}<b class="num ${gew ? 'g' : 'r'}">${gew ? Math.max(y.score_a, y.score_b) : Math.min(y.score_a, y.score_b)}:${gew ? Math.min(y.score_a, y.score_b) : Math.max(y.score_a, y.score_b)}</b><span class="v5-pz-gg">gegen</span>${_spChips(geg)}</span>`; };
const tagZeit = m => new Date(m.created_at).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) + ' ' + new Date(m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});

// 3.1 Das Blatt einer gewöhnlichen Partie
V.blattPartie = function(m, key){
  const F = V.fakten(m), v = VAR[key], x = v.wann(F) || {}, tx = TEXT[key](F, x);
  const sum = F.vert.reduce((a, b) => a + b, 0) || 1;
  const gleich = F.vert[F.diff];
  const platz = 1 + F.vert.slice(1).filter(v => v > gleich).length;
  const gg = F.gegner.slice().sort((a, b) => b.n - a.n);
  return V.blatt({sorte:'spiel', ic:v.ic, rub:'AM SPIELTAG · ' + v.name.toUpperCase(), zeit:zeitVon(m),
    buehne:`<div class="v5b-gross">${v.bild(F, x)}</div>`, titel:tx.t, satz:tx.d,
    chips:[{v:`${F.hoch}:${F.tief}`, l:'Endstand', ton:'g'}, {v:F.c != null ? pct(F.c) + ' %' : '–', l:'Siegchance vorher'}, {v:vz(F.gewinn), l:'Elo für die Sieger', ton:'g'}],
    ab:[
      key === 'feld' ? null : {ic:'posSwap', t:'Wer wo stand', erkl:'Abwehr hinten, Sturm vorn, in der Reihenfolge der Stangen. Unter jedem die Elo, die ihm diese Partie gebracht oder gekostet hat.', html:_spFeldBild(_spFeldDaten({m, c:F.c}))},
      {ic:'chartBar', t:'Wie oft es so ausgeht', r:`${pct(gleich / sum)} % aller Partien`, erkl:`Jede Säule ein Abstand von einem bis zehn Toren, so hoch, wie oft die Liga bis zu dieser Partie so endete. ${gleich} von ${sum} Partien endeten wie diese — der ${platz}.-häufigste Abstand.`,
        html:M.verteilung(F.vert, F.diff)},
      {ic:'users', t:'Was die Partie bewegt hat', erkl:'Elo je Spieler, der größte Gewinn oben. Rechts der Platz in der Monatstabelle vorher und nachher, wo er sich geändert hat.', html:M.beteiligte(F)},
      {ic:'crossedSwords', t:'Die direkten Duelle', erkl:'Wie oft sich Sieger und Verlierer als Gegner trafen, und wer dabei vorn liegt. Die letzte Zelle ist diese Partie.',
        html:`<div class="v5-dd">${gg.slice(0, 4).map((g, k) => `<div class="v5-dd-z" style="--k:${k}">${chip(g.w)}<span class="v5-dd-n">${esc(nm(g.w))}<i>gegen</i>${esc(nm(g.l))}</span><b class="num">${g.s}:${g.n - g.s}</b>${M.lauf(g.folge.slice(-12))}</div>`).join('')}</div>`},
      {ic:'calendar', t:'Der Tag', r:`Partie ${F.tag.pos + 1} von ${F.tag.n}`, erkl:'Jede Partie dieses Tages in Spielreihenfolge, diese gerahmt.', html:M.tag(F)}
    ], weiter:knopf('Partie im Verlauf') + knopf('Direkter Vergleich', true)});
};

// 3.2 Die Siegesserie
V.blattSerie = function(s){
  const d = s.dataRef, pid = d.pid, m = _spMatch(d.matchId), start = _spMatch(d.lauf);
  const eig = _spEigene(pid, m), von = eig.indexOf(start), lauf = eig.slice(von);
  const vor = _spBasis().vor.get(start.id) || {}, best = (vor.best || {})[pid] || 0, liga = vor.liga || 0;
  const naechste = typeof naechsteSerienMarke === 'function' ? naechsteSerienMarke(d.streak) : null;
  const partner = {}; lauf.forEach(y => { const p = _spTeam(y, _spSeite(y, pid)).find(id => id !== pid); partner[p] = (partner[p] || 0) + 1; });
  const nach = matchesOfPlayer(pid, matches)[eig.length];
  const skala = Math.max(d.streak, best, liga, naechste || 0) + 1;
  const marke = (wert, label, cls) => `<span class="v5-sr-mk ${cls}" style="--p:${(wert / skala * 100).toFixed(1)}%"><i></i><b class="num">${wert}</b><small>${label}</small></span>`;
  return V.blatt({sorte:'serie', ic:'flame', rub:'SERIE', zeit:zeitVon(m),
    buehne:`<div class="v5-sr">${wappen(pid, 64)}<div class="v5-sr-z"><b class="num v5-roll" data-bis="${d.streak}">${d.streak}</b><span>Siege in Folge</span></div>
      <div class="v5-sr-f">${ic('flame')}</div></div>${M.lauf(lauf.map(() => true), {gross:true})}
      <div class="v5-sr-d"><span>${tagZeit(start)}</span><span>${tagZeit(m)}</span></div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:d.streak, l:'Siege in Folge', ton:'g'}, {v:best || '–', l:'eigener Bestwert vorher'}, {v:liga, l:'Rekord der Liga vorher'}],
    ab:[
      {ic:'peak', t:'Gegen die Bestmarken', erkl:`Die Serie als Balken, darüber der eigene Bestwert und der Rekord der Liga, wie sie VOR der Serie standen${naechste ? ', und die nächste runde Marke' : ''}.`,
        html:`<div class="v5-sr-spur"><span class="v5-sr-ist" style="--p:${(d.streak / skala * 100).toFixed(1)}%"></span>${best && best !== liga ? marke(best, 'eigener', 'eig') : ''}${marke(liga, best === liga ? 'eigener = Liga' : 'Liga', 'liga')}${naechste && naechste !== liga && naechste !== best ? marke(naechste, 'nächste', 'next') : ''}</div>`},
      {ic:'flame', t:'Sieg für Sieg', r:`${lauf.length} Partien`, erkl:'Jede Partie der Serie mit Partner, Stand und Gegnern.',
        html:M.zeit(lauf.map(y => ({zeit:tagZeit(y), html:M.partie(y, pid), ton:'w'})))},
      {ic:'handshake', t:'Mit wem', erkl:'Wie oft jeder Partner in dieser Serie dabei war.',
        html:M.balken(Object.keys(partner).sort((a, b) => partner[b] - partner[a]).map(id => ({id, n:nm(id), v:partner[id], t:partner[id] + '×'})))},
      {ic:'hourglass', t:'Wie es weiterging', html:`<div class="v5-wg">${nach ? (_spGew(nach, pid) ? `Die Serie läuft weiter: auch die nächste Partie am ${tagZeit(nach)} ging an ${nb(pid)}.` : `Am ${tagZeit(nach)} riss sie: ${M.partie(nach, pid)}`) : 'Die Serie läuft noch.'}</div>`}
    ], weiter:knopf('Profil') + knopf('Alle Serien der Liga', true)});
};

// 3.3 Die gemeinsame Pleitenserie — negativ, also rot
V.blattDuoPleite = function(s){
  const d = s.dataRef, a = d.a, b = d.b, m = _spMatch(d.matchId), start = _spMatch(d.lauf);
  const zus = _spEigene(a, m).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) === _spSeite(y, b));
  const lauf = zus.slice(zus.indexOf(start));
  const quote = (pid, mitPartner) => { const l = _spEigene(pid, m).filter(y => ([y.a1, y.a2, y.b1, y.b2].includes(mitPartner) && _spSeite(y, pid) === _spSeite(y, mitPartner)));
    const ohne = _spEigene(pid, m).filter(y => !l.includes(y));
    return {mit:l.filter(y => _spGew(y, pid)).length / (l.length || 1), ohne:ohne.filter(y => _spGew(y, pid)).length / (ohne.length || 1), nMit:l.length, nOhne:ohne.length}; };
  const qa = quote(a, b), qb = quote(b, a);
  const letzterSieg = zus.slice().reverse().find(y => _spGew(y, a));
  const knapp = lauf.filter(y => Math.abs(y.score_a - y.score_b) <= 2).length;
  return V.blatt({sorte:'serie', neg:true, ic:'trendDown', rub:'SERIE', zeit:zeitVon(m),
    buehne:`<div class="v5-dp"><div class="v5-dp-av">${wappen(a, 56)}${wappen(b, 56)}</div><div class="v5-dp-z"><b class="num">${d.streak}</b><span>gemeinsame Niederlagen in Folge</span></div></div>${M.lauf(lauf.map(() => false), {gross:true})}`,
    titel:s.title, satz:s.desc,
    chips:[{v:d.streak, l:'Niederlagen in Folge', ton:'r'}, {v:`${zus.filter(y => _spGew(y, a)).length}–${zus.filter(y => !_spGew(y, a)).length}`, l:'Siege und Niederlagen zusammen'}, {v:letzterSieg ? new Date(letzterSieg.created_at).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) : '–', l:'letzter gemeinsamer Sieg'}],
    ab:[
      {ic:'duo', t:'Zusammen und getrennt', erkl:'Die Siegquote jedes der beiden mit dem anderen und mit allen übrigen Partnern, über alle Partien bis zu dieser. Liegt „zusammen" deutlich tiefer, passt es gerade nicht.',
        html:`<div class="v5-zg">${[[a, qa], [b, qb]].map(([pid, q], k) => `<div class="v5-zg-p" style="--k:${k}">${chip(pid)}<span class="v5-zg-n">${esc(nm(pid))}</span>
          <div class="v5-zg-r"><span>zusammen</span><span class="v5-zg-b"><i class="r" style="--w:${pct(q.mit)}%"></i></span><b class="num">${pct(q.mit)} %</b></div>
          <div class="v5-zg-r"><span>mit anderen</span><span class="v5-zg-b"><i style="--w:${pct(q.ohne)}%"></i></span><b class="num">${pct(q.ohne)} %</b></div></div>`).join('')}</div>`},
      {ic:'thriller', t:'Wie knapp', r:`${knapp} von ${lauf.length} mit höchstens zwei Toren`, erkl:'Jede Niederlage der Serie als Balken, so lang wie der Abstand. Kurze Balken heißen: es fehlte wenig.',
        html:`<div class="v5-kn">${lauf.map((y, k) => { const dd = Math.abs(y.score_a - y.score_b); return `<span style="--k:${k};--h:${dd * 10}%"><i></i><b class="num">${Math.min(y.score_a, y.score_b)}:${Math.max(y.score_a, y.score_b)}</b></span>`; }).join('')}</div>`},
      {ic:'calendar', t:'Niederlage für Niederlage', html:M.zeit(lauf.map(y => ({zeit:tagZeit(y), html:M.partie(y, a), ton:'l'})))}
    ], weiter:knopf('Duo-Blatt', true)});
};

// 3.4 Der Serienbruch
V.blattRiss = function(s){
  const d = s.dataRef, m = _spMatch(d.matchId), F = V.fakten(m), opfer = d.victimPid;
  const eig = _spEigene(opfer, m), lauf = eig.slice(Math.max(0, eig.length - 1 - d.streak), eig.length - 1);
  const rd = _spRissDaten({m, x:{victimPid:opfer, streak:d.streak}});
  const gg = F.gegner.filter(g => g.l === opfer);
  return V.blatt({sorte:'serie', ic:'flameBreak', rub:'SERIENBRUCH', zeit:zeitVon(m),
    buehne:`<div class="v5b-gross v5-riss">${_spRissBild(rd)}</div>`, titel:s.title, satz:s.desc,
    chips:[{v:d.streak, l:'Siege, dann Schluss', ton:'r'}, {v:rd && rd.eig ? rd.eig : '–', l:'eigener Bestwert'}, {v:F.c != null ? pct(F.c) + ' %' : '–', l:'Siegchance der Brecher'}],
    ab:[
      {ic:'flame', t:'Die Serie, die riss', erkl:`${nb(opfer)} gewann ${d.streak} Partien hintereinander. Die rote Zeile ist diese Partie.`,
        html:M.zeit(lauf.map(y => ({zeit:tagZeit(y), html:M.partie(y, opfer), ton:'w'})).concat([{zeit:tagZeit(m), html:M.partie(m, opfer), ton:'l'}]))},
      {ic:'crossedSwords', t:'Die Brecher gegen ihn', erkl:'Wie die beiden bisher gegen ihn standen — als Gegner, jede Begegnung eine Zelle.',
        html:`<div class="v5-dd">${gg.map((g, k) => `<div class="v5-dd-z" style="--k:${k}">${chip(g.w)}<span class="v5-dd-n">${esc(nm(g.w))}<i>gegen</i>${esc(nm(g.l))}</span><b class="num">${g.s}:${g.n - g.s}</b>${M.lauf(g.folge.slice(-12))}</div>`).join('')}</div>`},
      {ic:'users', t:'Was die Partie bewegt hat', html:M.beteiligte(F)}
    ], weiter:knopf('Profil von ' + nm(opfer)) + knopf('Partie', true)});
};

// 3.5 Die Rivalität
V.blattRivalitaet = function(s){
  const d = s.dataRef, a = d.a, b = d.b, m = _spMatch(d.matchId);
  const l = _spEigene(a, m).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) !== _spSeite(y, b));
  const folge = l.map(y => _spGew(y, a)), sa = folge.filter(Boolean).length;
  let kum = 0; const verlauf = folge.map(w => (kum += w ? 1 : -1));
  const serie = w => { let best = 0, c = 0; folge.forEach(x => { c = x === w ? c + 1 : 0; best = Math.max(best, c); }); return best; };
  const hoechster = w => l.filter(y => _spGew(y, a) === w).sort((p, q) => Math.abs(q.score_a - q.score_b) - Math.abs(p.score_a - p.score_b))[0];
  const ha = hoechster(true), hb = hoechster(false);
  return V.blatt({sorte:'duell', ic:'crossedSwords', rub:'RIVALITÄT', zeit:zeitVon(m),
    buehne:`<div class="v5-rv5"><div class="v5-rv5-p">${wappen(a, 64)}<b>${esc(nm(a))}</b></div>
      <div class="v5-rv5-m"><b class="num v5-roll" data-bis="${d.n}">${d.n}</b><span>Duelle</span></div>
      <div class="v5-rv5-p">${wappen(b, 64)}<b>${esc(nm(b))}</b></div></div>
      <div class="v5-rv5-tau"><i style="--a:${(sa / l.length * 100).toFixed(1)}%"></i><b class="num">${sa}</b><b class="num">${l.length - sa}</b></div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:`${sa}:${l.length - sa}`, l:'Bilanz'}, {v:serie(true), l:`längste Serie ${nm(a)}`}, {v:serie(false), l:`längste Serie ${nm(b)}`}],
    ab:[
      {ic:'chartUp', t:'Wer wann vorn lag', erkl:`Jede Begegnung schiebt die Linie: ein Sieg von ${nb(a)} nach oben, einer von ${nb(b)} nach unten. Über dem Strich führt ${nb(a)}.`,
        html:M.linie(verlauf, {null:0, h:110, cls:'bronze'})},
      {ic:'swords', t:'Die letzten dreißig', erkl:'Jede Begegnung als Zelle, die neueste rechts.', html:M.lauf(folge.slice(-30))},
      {ic:'explosion', t:'Die deutlichsten', html:`<div class="v5-hp">${[ha, hb].filter(Boolean).map(y => `<div>${M.partie(y, a)}<small>${tagZeit(y)}</small></div>`).join('')}</div>`}
    ], weiter:knopf('Direkter Vergleich', true)});
};

// 3.6 Die Auszeichnung
V.blattAuszeichnung = function(s){
  const d = s.dataRef, b = BADGES.find(x => x.id === d.badgeId) || {}, m = d.matchId ? _spMatch(d.matchId) : null;
  const ids = activePlayers().map(p => p.id);
  const traeger = ids.filter(id => (getCachedBadges(id) || []).some(x => x.id === b.id));
  const kl = rarityOf(b.id), klName = {legendary:'Legendär', rare:'Selten', common:'Gewöhnlich', negative:'Schattenseite'}[kl] || kl;
  const neg = kl === 'negative';
  // Das wievielte Mal: gezählt über die Partien bis zu dieser.
  const cache = getBadgeEarnedCache();
  let mal = 0; for(const y of _spBasis().chrono){ mal += (cache[y.id] || []).filter(e => e.playerId === d.playerId && e.badge.id === b.id).length; if(m && y.id === m.id) break; }
  return V.blatt({sorte:'badge', neg, ic:'medal', rub:'AUSZEICHNUNG', zeit:m ? zeitVon(m) : '',
    buehne:`<div class="v5-md v5-md-${kl}"><div class="v5-md-ring"><span class="v5-md-glanz"></span>${ic(b.ic || 'medal')}</div>
      <div class="v5-md-t"><b>${esc(b.name || d.badgeName || '')}</b><span>${esc(klName)}</span></div>${wappen(d.playerId, 52)}</div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:esc(klName), l:'Klasse'}, {v:`${traeger.length} von ${ids.length}`, l:'tragen sie in der Liga'}, {v:mal + '.', l:`Mal für ${nm(d.playerId)}`}],
    ab:[
      m ? {ic:'check', t:'Was verlangt war', erkl:_ndNeu(b.desc) && b.desc !== s.desc ? esc(b.desc || '') : '', html:`<div class="v5-bd">${M.partie(m, d.playerId)}<span class="v5-bd-ok">${ic('check')} erfüllt in dieser Partie</span></div>`} : null,
      {ic:'users', t:'Wer sie trägt', erkl:'Jeder Spieler der Liga ein Platz. Hell, wer sie hat; gerahmt, wer sie hier geholt hat.',
        html:`<div class="v5-tg">${ids.map((id, k) => `<span class="${traeger.includes(id) ? 'hat' : ''}${id === d.playerId ? ' dies' : ''}" style="--k:${k}">${chip(id)}<small>${esc(nm(id))}</small></span>`).join('')}</div>`}
    ], weiter:knopf('Alle Auszeichnungen', true)});
};

// 3.7 Der Moment an der Ewigen Tafel — die Sammelkarte
V.blattTafel = function(s){
  const d = s.dataRef, teile = d.teile || [];
  const je = {};
  teile.forEach(t => Object.keys(t.lb || {}).forEach(pid => { const x = t.lb[pid]; je[pid] = je[pid] || {vor:x.vor, nach:x.nach}; je[pid].nach = x.nach; }));
  const pids = Object.keys(je).sort((p, q) => (je[q].nach - je[q].vor) - (je[p].nach - je[p].vor));
  const max = Math.max.apply(null, pids.map(p => Math.abs(je[p].nach - je[p].vor))) || 1;
  const art = t => t.typ === 'rekord_geholt' ? 'Bestmarke' : t.typ === 'rekord_gesteigert' ? 'Ausbau' : t.typ === 'chronik_geholt' ? 'Chronik' : t.typ === 'insignium_stufe' ? 'Insignium' : 'Eintrag';
  const zahl = k => teile.filter(t => art(t) === k).length;
  return V.blatt({sorte:'tafel', ic:'trophyStar', rub:'EWIGE TAFEL', zeit:s.when ? new Date(s.when).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'}) : '',
    buehne:`<div class="v5-ft">${teile.slice(0, 6).map((t, k) => `<div class="v5-ft-z" style="--k:${k}"><span class="v5-ft-ic">${ic(t.ic || 'trophyStar')}</span>
      <span class="v5-ft-k">${esc(art(t))}</span><span class="v5-ft-t">${esc(String(t.titel || '').replace(/^.*?„|“$|"$/g, ''))}</span><span class="v5-ft-av">${(t.halter || []).slice(0, 2).map(chip).join('')}</span></div>`).join('')}</div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:zahl('Bestmarke'), l:'Bestmarken gewechselt'}, {v:zahl('Chronik'), l:'Chroniken'}, {v:zahl('Insignium'), l:'Insignien'}],
    ab:[
      {ic:'chartUp', t:'Wer gewinnt, wer verliert', erkl:'Das Prestige jedes Beteiligten vor und nach dem Spieltag. Grün, was dazukam, rot, was ein anderer übernommen hat.',
        html:`<div class="v5-wf">${pids.map((p, k) => { const dd = je[p].nach - je[p].vor; return `<div class="v5-wf-z" style="--k:${k}">${chip(p)}<span class="v5-wf-n">${esc(nm(p))}</span>
          <span class="v5-wf-b"><i class="${dd >= 0 ? 'p' : 'n'}" style="--w:${Math.round(Math.abs(dd) / max * 50)}%"></i></span><b class="num ${dd >= 0 ? 'g' : 'r'}">${vz(dd)}</b><small class="num">${_spZahl(je[p].nach)}</small></div>`; }).join('')}</div>`},
      {ic:'scroll', t:'Jeder Eintrag', r:`${teile.length} Zeilen`, erkl:'Nach Art gruppiert; jede Zeile mit Uhrzeit und dem, was sie für die Laufbahn bringt.',
        html:['Bestmarke', 'Ausbau', 'Chronik', 'Insignium'].map(k => { const tt = teile.filter(t => art(t) === k); return tt.length ? `<div class="v5-gr-k">${k}<b class="num">${tt.length}</b></div>` + tt.map(t => `<div class="v5-gr-z">${ic(t.ic || 'trophyStar')}<div><b>${esc(t.titel || '')}</b><small>${esc(t.text || '')}</small></div></div>`).join('') : ''; }).join('')}
    ], weiter:knopf('Ewige Tafel öffnen', true)});
};

// 3.8 Der übernommene Rekord
V.blattRekord = function(s){
  const d = s.dataRef, def = (typeof CHRONICLE_BY_ID !== 'undefined') ? CHRONICLE_BY_ID[d.rekordId] : null;
  const neu = (Array.isArray(d.halter) && d.halter.length ? d.halter : d.playerIds) || [], alt = (d.vorher || []).filter(p => !neu.includes(p));
  let rang = []; try { rang = (chronicleRang(d.rekordId) || []).slice(0, 6); } catch(e){}
  const wertVon = r => r && (r.wert != null ? r.wert : r.v);
  return V.blatt({sorte:'tafel', ic:'trophyStar', rub:'EWIGE TAFEL · ' + String(d.kammerLabel || 'BESTMARKE').toUpperCase(), zeit:'',
    buehne:`<div class="v5-ug">${alt.length ? `<div class="v5-ug-alt">${alt.map(p => wappen(p, 52)).join('')}<small>vorher</small></div>
      <svg viewBox="0 0 60 20" class="v5-ug-pf"><path d="M2 10 H52"/><path d="M46 4 L54 10 L46 16" class="kopf"/></svg>` : ''}
      <div class="v5-ug-neu">${neu.slice(0, 4).map(p => wappen(p, 48)).join('')}<small>jetzt</small></div></div>
      <div class="v5-ug-w"><b class="num">${esc(_chronKurz(d.ev) || '')}</b><span>${esc(d.rekordName || (def && def.name) || '')}</span></div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:esc(_chronKurz(d.ev) || '–'), l:d.kammerLabel || 'Bestwert', ton:'g'}, {v:neu.length, l:neu.length === 1 ? 'Halter' : 'Halter, geteilt'}, {v:(d.basis != null ? d.basis : (def && def.allzeit && def.allzeit.basis)) != null ? (d.basis != null ? d.basis : def.allzeit.basis) + ' P' : '–', l:'Grundwert, vor dem Teilen'}],
    ab:[
      def && def.allzeit && def.allzeit.wie ? {ic:'info', t:'Wie gemessen wird', html:`<p class="v5b-erkl">${esc(def.allzeit.wie)}</p><div class="v5-cond">${esc(d.cond || def.cond || '')}</div>`} : null,
      rang.length ? {ic:'sort', t:'Wer dahinter liegt', erkl:'Die Besten dieses Rekords, wie die Tafel sie heute zählt.', html:`<div class="v5-vf">${rang.map((r, k) => `<div class="v5-vf-z${neu.includes(r.pid) ? ' hell' : ''}" style="--k:${k}"><span class="num">${k + 1}.</span>${chip(r.pid)}<span class="v5-vf-n">${esc(nm(r.pid))}</span><b class="num">${esc(_chronKurz(r.ev || '') || String(wertVon(r) ?? ''))}</b></div>`).join('')}</div>`} : null
    ], weiter:knopf('Rekord öffnen', true)});
};

// 3.9 Der Spieler des Tages
V.blattTag = function(s){
  const d = s.dataRef, pid = d.playerId, td = _spTagDaten(s);
  const tagMs = _spBasis().chrono.filter(y => tagKey(y.created_at) === d.dayKey);
  const feld = {}; tagMs.forEach(y => [y.a1, y.a2, y.b1, y.b2].forEach(id => { feld[id] = feld[id] || {s:0, n:0}; feld[id].n++; if(_spGew(y, id)) feld[id].s++; }));
  const eigene = tagMs.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(pid));
  const eloTag = eigene.reduce((sum, y) => sum + (_newsEloDelta(pid, y.id) || 0), 0);
  let k = 0; const kurve = [0].concat(eigene.map(y => (k += _newsEloDelta(pid, y.id) || 0)));
  return V.blatt({sorte:'held', ic:'crown', rub:'SPIELER DES TAGES', ton:'gold', zeit:new Date(d.dayKey).toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'2-digit'}),
    buehne:`<div class="v5-pt"><span class="v5-pt-krone">${ic('crown')}</span><div class="v5-pt-av nf-glanz">${wappen(pid, 88)}</div><b>${esc(nm(pid))}</b></div>${M.linie(kurve, {null:0, h:70, cls:'gold'})}${M.lauf(eigene.map(y => _spGew(y, pid)), {gross:true})}`,
    titel:s.title, satz:s.desc,
    chips:[{v:`${d.wins}/${d.games}`, l:'Siege', ton:'g'}, {v:pct(d.wr) + ' %', l:'Quote des Tages'}, {v:vz(eloTag), l:'Elo am Tag', ton:eloTag >= 0 ? 'g' : 'r'}],
    ab:[
      {ic:'sort', t:'Das Feld des Tages', erkl:'Jeder, der an diesem Tag gespielt hat, nach Siegen, dann nach Quote. Gold trägt nur der Sieger.',
        html:M.balken(Object.keys(feld).sort((p, q) => feld[q].s - feld[p].s || feld[q].s / feld[q].n - feld[p].s / feld[p].n).map(id => ({id, n:nm(id), v:feld[id].s, t:`${feld[id].s} von ${feld[id].n}`, hell:id === pid})))},
      {ic:'calendar', t:'Seine Partien', html:M.zeit(eigene.map(y => ({zeit:new Date(y.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}), html:M.partie(y, pid) + ` <em class="num ${(_newsEloDelta(pid, y.id) || 0) >= 0 ? 'g' : 'r'}">${vz(_newsEloDelta(pid, y.id) || 0)}</em>`, ton:_spGew(y, pid) ? 'w' : 'l'})))}
    ], weiter:knopf('Rückblick auf den Tag', true)});
};

// 3.10 Das Spitzenspiel
V.blattSpitze = function(s){
  const d = s.dataRef, m = _spMatch(d.matchId), F = V.fakten(m);
  const tab = _spTabelleBild(_spTabelleDaten({m, x:{newLeader:d.p1}}, true));
  return V.blatt({sorte:'spiel', ic:'crown', rub:'SPITZENSPIEL', zeit:zeitVon(m),
    buehne:`<div class="v5-sp"><div class="v5-sp-s w">${wappen(d.p1, 64)}<span class="v5-sp-r num">1.</span><b>${esc(nm(d.p1))}</b></div>
      <div class="v5-sp-m">${stand(F)}<span>Platz 1 gegen Platz 2</span></div>
      <div class="v5-sp-s">${wappen(d.p2, 64)}<span class="v5-sp-r num">2.</span><b>${esc(nm(d.p2))}</b></div></div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:`${F.hoch}:${F.tief}`, l:'Endstand'}, {v:F.c != null ? pct(F.c) + ' %' : '–', l:'Siegchance vorher'}, {v:vz(F.delta[d.p1] - F.delta[d.p2]), l:'Abstand gewachsen um', ton:'g'}],
    ab:[
      {ic:'stepsUp', t:'Die Tabelle vorher und nachher', erkl:'Eine Linie je Spieler vom Platz vor der Partie zum Platz danach.', html:tab},
      {ic:'users', t:'Was die Partie bewegt hat', html:M.beteiligte(F)}
    ], weiter:knopf('Tabelle', true)});
};

// 3.11 Der Endspurt der Saison
V.blattEndspurt = function(s){
  const d = s.dataRef, h = getSeasonPositionHistory(d.sid), a = d.leader.pid, b = d.second.pid;
  const ea = (h.eloByDay || {})[a] || [], eb = (h.eloByDay || {})[b] || [];
  const n = Math.min(ea.length, eb.length), diffs = Array.from({length:n}, (_, i) => (ea[i] || 0) - (eb[i] || 0));
  const proSieg = pid => { const l = matchesOfPlayer(pid, matches).filter(y => seasonOf(y.created_at).id === d.sid && _spGew(y, pid)); return Math.round(l.reduce((s2, y) => s2 + (_newsEloDelta(pid, y.id) || 0), 0) / (l.length || 1)); };
  const tageGes = h.totalDays || 31;
  return V.blatt({sorte:'tafel', ic:'hourglass', rub:'SAISON', zeit:'',
    buehne:`<div class="v5-es"><div class="v5-es-ring"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="g"/><circle cx="40" cy="40" r="34" class="f" style="--p:${(1 - d.daysLeft / tageGes).toFixed(3)}" pathLength="1"/></svg><b class="num">${d.daysLeft}</b><span>Tage</span></div>
      <div class="v5-es-r"><div class="v5-es-z">${chip(a)}<b>${esc(nm(a))}</b><span class="num">${_spZahl(d.leader.elo)}</span></div>
        <div class="v5-es-gap"><span><i style="--p:${Math.min(100, d.gap / 60 * 100).toFixed(0)}%"></i></span><b class="num">${d.gap} Elo</b></div>
        <div class="v5-es-z">${chip(b)}<b>${esc(nm(b))}</b><span class="num">${_spZahl(d.second.elo)}</span></div></div></div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:d.daysLeft, l:'Tage übrig'}, {v:d.gap, l:'Elo Abstand'}, {v:'≈ ' + Math.max(1, Math.round(d.gap / Math.max(1, proSieg(b)))), l:(Math.max(1, Math.round(d.gap / Math.max(1, proSieg(b)))) === 1 ? 'Sieg' : 'Siege') + ` fehlen ${nm(b)}`}],
    ab:[
      {ic:'chartUp', t:'Der Abstand Tag für Tag', erkl:`Über dem Strich liegt ${nb(a)} vorn, darunter ${nb(b)}. Jeder Punkt ist ein Tag des Monats.`, html:M.linie(diffs, {null:0, h:100, cls:'silber'})},
      {ic:'scaleBalance', t:'Was ein Sieg bringt', erkl:'Im Schnitt dieses Monats. Daraus folgt, wie viele Siege der Abstand ungefähr ist — vorausgesetzt, der andere verliert nicht.',
        html:M.balken([a, b].map(id => ({id, n:nm(id), v:proSieg(id), t:'+' + proSieg(id) + ' Elo je Sieg'})))}
    ], weiter:knopf('Positionsverlauf', true)});
};

// 3.12 Der Fun Fact — der Aktivste
V.blattFakt = function(s){
  const d = s.dataRef, seit = Date.now() - 14 * TAG;
  const z = {}; _spBasis().chrono.filter(y => mts(y) >= seit).forEach(y => [y.a1, y.a2, y.b1, y.b2].forEach(id => { z[id] = (z[id] || 0) + 1; }));
  const ids = Object.keys(z).sort((p, q) => z[q] - z[p]);
  return V.blatt({sorte:'fakt', ic:'rocket', rub:'FUN FACT · FORM', zeit:'',
    buehne:`<div class="v5-ff"><span class="v5-ff-ic">${ic('rocket')}</span><b class="num v5-roll" data-bis="${d.vv}">${esc(d.vv)}</b><span>${esc(d.vl)} in 14 Tagen</span>${wappen(d.ambientPid, 52)}</div>`,
    titel:s.title, satz:s.desc,
    chips:[{v:ids.indexOf(d.ambientPid) + 1 + '.', l:'in der Liga'}, {v:z[ids[1]] || 0, l:'der Zweite'}, {v:Math.round(ids.reduce((a, id) => a + z[id], 0) / ids.length), l:'im Schnitt'}],
    ab:[{ic:'chartBar', t:'Alle im Vergleich', erkl:'Partien jedes Spielers in den letzten vierzehn Tagen.', html:M.balken(ids.map(id => ({id, n:nm(id), v:z[id], t:z[id], hell:id === d.ambientPid})))}],
    weiter:knopf('Profil', true)});
};

// 3.13 Die Insignium-Stufe
V.blattInsignium = function(s){
  const d = s.dataRef, nums = String(s.desc).match(/(\d+) aus Auszeichnungen, (\d+) aus Monatschroniken und (\d+) aus Rekorden/);
  const q = nums ? {a:+nums[1], c:+nums[2], r:+nums[3]} : null, sum = q ? q.a + q.c + q.r : d.punkte;
  const st = insigniumStufeVon(d.punkte), nx = INSIGNIEN[st + 1];
  return V.blatt({sorte:'ins', ic:'shieldStar', rub:'INSIGNIUM', zeit:'',
    buehne:`<div class="v5-in"><div class="v5-in-glut"></div><div class="v5-in-z">${wappen(d.pid, 132)}</div><b>${esc(d.stufeName || INSIGNIEN[st].name)}</b><span>${esc(nm(d.pid))} steigt auf</span></div>${_newsLeiter(d.pid)}`,
    titel:s.title, satz:s.desc,
    chips:[{v:_spZahl(d.punkte), l:'Prestige'}, {v:INSIGNIEN[st].name, l:'Stufe ' + (st + 1) + ' von ' + INSIGNIEN.length}, {v:nx ? _spZahl(nx.min - d.punkte) : '–', l:nx ? 'bis ' + nx.name : ''}],
    ab:[q ? {ic:'chartBar', t:'Woher die Punkte kommen', erkl:'Die drei Quellen des Prestiges: Auszeichnungen, Monatschroniken und gehaltene Rekorde.',
      html:`<div class="v5-qu">${[['Auszeichnungen', q.a], ['Monatschroniken', q.c], ['Rekorde', q.r]].map(([n, v], k) => `<i style="--w:${(v / sum * 100).toFixed(1)}%;--k:${k}" class="q${k}"></i>`).join('')}</div>
        <div class="v5-qu-l">${[['Auszeichnungen', q.a], ['Monatschroniken', q.c], ['Rekorde', q.r]].map(([n, v], k) => `<span class="q${k}"><i></i>${n} <b class="num">${v}</b></span>`).join('')}</div>`} : null],
    weiter:knopf('Laufbahn', true)});
};

// ── 4. Kombinationen ─────────────────────────────────────────────────────
// Der Anlass der App (`_spAnlass`) bleibt, wie er ist, und trägt den Kopf.
// Was die neuen Varianten zusätzlich finden, kommt als Stempel, als zweite
// Hälfte oder als Leiste dazu.
const MARKE_VAR = {zaehlwerk:1, revanche:1, rueckkehr:1, chemie:1, gegner:1};
V.stempelVon = (key, F, x) => {
  if(key === 'zaehlwerk') return V.stempel('hundred', x.wert + '.', x.was === 'Sieg' ? 'Sieg' : x.was === 'Partie' ? 'Partie' : 'Liga', 'acid');
  if(key === 'revanche') return V.stempel('rematch', x.min + "'", 'Revanche', 'acid');
  if(key === 'rueckkehr') return V.stempel('doorReturn', x.tage, 'Tage Pause');
  if(key === 'chemie') return V.stempel('handshake', F.duo.s + '.', 'Duo-Sieg');
  if(key === 'gegner') return V.stempel('crossedSwords', x.g.s + ':' + (x.g.n - x.g.s), x.fluch ? 'Fluch weg' : 'gegen ' + nm(x.g.l));
  return '';
};
V.halbe = (key, F, x) => {
  const k = (icn, t) => `<div class="v5-geteilt-k">${ic(icn)}${t}</div>`;
  if(key === 'tagesring') return k('sunrise', 'Heute') + `<div class="v5-geteilt-g num">${x.folge.filter(Boolean).length}/${x.folge.length}</div>${M.lauf(x.folge)}<div class="v5-geteilt-u">${nb(x.id)} an diesem Tag</div>`;
  if(key === 'gegner') return k('crossedSwords', x.fluch ? 'Fluch gebrochen' : 'Lieblingsgegner') + `<div class="v5-geteilt-g num">${x.g.s}:${x.g.n - x.g.s}</div>${M.lauf(x.g.folge.slice(-14))}<div class="v5-geteilt-u">${nb(x.g.w)} gegen ${nb(x.g.l)}</div>`;
  if(key === 'chemie') return k('handshake', 'Eingespielt') + `<div class="v5-geteilt-g num">${F.duo.s}/${F.duo.p}</div>${M.lauf(F.duo.folge.slice(-14))}<div class="v5-geteilt-u">${und(F.W)} zusammen</div>`;
  if(key === 'transfer') return k('boomerang', 'Elo-Transfer') + `<div class="v5-geteilt-g num g">${vz(F.gewinn)}</div><div class="v5-geteilt-u">so viel wie nur jede achte Partie</div>`;
  if(key === 'gipfel') return k('peak', 'Gipfeltreffen') + `<div class="v5-geteilt-g num">${[...F.W, ...F.L].filter(id => F.rang[id] && F.rang[id].pre <= 4).length}/4</div><div class="v5-geteilt-u">vorher unter den ersten vier</div>`;
  if(key === 'uhr') return k('clock', x.erste ? 'Anpfiff' : 'Schlusspfiff') + `<div class="v5-geteilt-g num">${new Date(F.m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</div><div class="v5-geteilt-u">${x.erste ? 'erste' : 'letzte'} von ${F.tag.n} Partien</div>`;
  return '';
};
// Die Hälfte des App-Anlasses für die geteilte Form.
V.halbeAnlass = (a, F) => {
  const k = (icn, t) => `<div class="v5-geteilt-k">${ic(icn)}${t}</div>`;
  if(a.key === 'krimi') return k('thriller', 'Ein Tor') + `<div class="v5-geteilt-g">${stand(F)}</div><div class="v5-geteilt-u">bei ${F.c != null ? pct(F.c) : '–'} % Siegchance</div>`;
  if(a.key === 'serie' && a.x) return k('flame', 'Serie') + `<div class="v5-geteilt-g num g">${a.x.streak}</div>${M.lauf(Array(Math.min(16, a.x.streak)).fill(true))}<div class="v5-geteilt-u">${nb(a.x.pid)} in Folge</div>`;
  if(a.key === 'wende') return k('comeback', 'Wende') + `<div class="v5-geteilt-g num">${a.x.n}</div>${M.lauf(Array(a.x.n).fill(false).concat([true]))}<div class="v5-geteilt-u">Pleiten, dann Sieg für ${nb(a.x.pid)}</div>`;
  if(a.key === 'deutlich') return k('target', 'Klarer Sieg') + `<div class="v5-geteilt-g">${stand(F)}</div><div class="v5-geteilt-u">${F.diff} Tore Abstand</div>`;
  if(a.key === 'aussenseiter') return k('underdog', 'Außenseiter') + `<div class="v5-geteilt-g num g">${pct(F.c)} %</div><div class="v5-geteilt-u">Siegchance, trotzdem gewonnen</div>`;
  if(a.key === 'premiere') return k('handshake', 'Premiere') + `<div class="v5-geteilt-g num">${a.x.versuch || 1}.</div><div class="v5-geteilt-u">Versuch von ${und(F.W)}</div>`;
  return '';
};
// Die Kombination einer Partie: Anlass der App plus was die Varianten finden.
V.kombi = function(m){
  const F = V.fakten(m);
  const s = {id:'v5k_' + m.id, dataRef:{type:'spiel', matchId:m.id}};
  let a = {key:''}; try { a = _spAnlass(s); } catch(e){}
  const kand = V.kandidaten(m).filter(k => k.key !== 'feld' && k.rang >= 20);
  if(!a.key || a.key === 'feld' || !kand.length) return null;
  const marke = kand.find(k => MARKE_VAR[k.key]);
  const halb = kand.find(k => !MARKE_VAR[k.key] && V.halbe(k.key, F, k.x)) || kand.find(k => V.halbe(k.key, F, k.x));
  let form, kopf;
  const app = (SP_KOPF[a.key] ? SP_KOPF[a.key](a) : '') + (SP_FUSS[a.key] ? SP_FUSS[a.key](a) : '');
  if(kand.length >= 3){
    form = 'leiste';
    kopf = (SP_KOPF[a.key] ? SP_KOPF[a.key](a) : '') + V.leiste(kand.slice(0, 3).map(k => ({ic:VAR[k.key].ic, t:VAR[k.key].name, ton:MARKE_VAR[k.key] ? 'acid' : ''}))) + (SP_FUSS[a.key] ? SP_FUSS[a.key](a) : '');
  } else if(marke){
    form = 'stempel';
    kopf = `<div class="v5-mitstempel">${app}${V.stempelVon(marke.key, F, marke.x)}</div>`;
  } else if(halb && V.halbeAnlass(a, F)){
    form = 'geteilt';
    kopf = `<div class="v5k"><div class="v5-geteilt"><div>${V.halbeAnlass(a, F)}</div><div>${V.halbe(halb.key, F, halb.x)}</div></div>${namenZeile(F.W, F.L)}</div>`;
  } else return null;
  return {m, a, kand, form, kopf, F};
};
// Jeder Anlass nennt die, denen er gehört — dieselbe Regel wie die
// Schlagzeile eines Bündels in der App [§C33]: „Wende und Lieblingsgegner für
// Leon und Leo" schrieb beiden zu, was nur Leo gegen Maxi gelang.
const VAR_SATZ = {
  gegner:(F, x) => x.fluch ? `gebrochener Fluch für ${nm(x.g.w)} gegen ${nm(x.g.l)}` : `Lieblingsgegner ${nm(x.g.l)} für ${nm(x.g.w)}`,
  zaehlwerk:(F, x) => x.wer ? `${x.wert}. ${x.was === 'Sieg' ? 'Sieg' : 'Partie'} für ${nm(x.wer)}` : `${x.wert}. Partie der Liga`,
  revanche:F => `Revanche für ${_namenListe(F.W.map(nm))}`,
  rueckkehr:(F, x) => `Rückkehr von ${nm(x.id)}`,
  chemie:F => `${F.duo.s}. gemeinsamer Sieg für ${_namenListe(F.W.map(nm))}`,
  tagesring:(F, x) => `Tagesring für ${nm(x.id)}`
};
const ANLASS_ORT = {krimi:'im Ein-Tor-Krimi', deutlich:'mit einem klaren Sieg', aussenseiter:'im Favoritensturz'};
const anlassSatz = (a, F) => {
  const wer = a.x && (a.x.pid || a.x.playerId);
  const n = SP_ANLASS[a.key] ? SP_ANLASS[a.key].name : '';
  return wer ? `${n} für ${nm(wer)}` : `${n} für ${_namenListe(F.W.map(nm))}`;
};
V.kombiKarte = function(k){
  const an = SP_ANLASS[k.a.key] || {name:'', ic:'ball'};
  const c0 = k.kand[0], zweite = VAR_SATZ[c0.key] ? VAR_SATZ[c0.key](k.F, c0.x) : `${VAR[c0.key].name} für ${_namenListe(k.F.W.map(nm))}`;
  const titel = ANLASS_ORT[k.a.key] ? `${zweite.charAt(0).toUpperCase() + zweite.slice(1)} ${ANLASS_ORT[k.a.key]}` : `${anlassSatz(k.a, k.F)} und ${zweite}`;
  return V.karte({ic:an.ic, art:an.name.toUpperCase(), zeit:zeitVon(k.m), kopf:k.kopf, titel,
    satz:`${k.F.hoch}:${k.F.tief} gegen ${_namenListe(k.F.L.map(nm))}. ${k.F.c != null ? `Siegchance vorher ${pct(k.F.c)} %.` : ''}`, blatt:'partie_' + k.m.id + '_' + k.kand[0].key});
};

// ── 5. Der Feed: heute und im Entwurf ───────────────────────────────────
// Dieselben Karten in derselben Reihenfolge. Im Entwurf bekommt jede
// gewöhnliche Partie (heute das Spielfeld) ihre Variante nach der Regel der
// Abwechslung, und jede Partie mit Anlass ihren Stempel oder ihre Leiste.
V.feed = function(nKarten){
  const liste = document.querySelector('#sheet .nf-liste') || document.querySelector('#sheet');
  const knoten = [];
  let n = 0;
  for(const el of liste.querySelectorAll(':scope > *, :scope .nf-tag, :scope .nf-card')){
    if(knoten.includes(el) || knoten.some(k => k.contains(el))) continue;
    if(el.classList.contains('nf-card')){ if(n >= nKarten) break; n++; knoten.push(el); }
    else if(el.classList.contains('nf-tag')) knoten.push(el);
  }
  const st = {}; getStoriesCache().forEach(x => { st[x.id] = x; });
  const heute = knoten.map(el => el.outerHTML).join('');
  // Die Partie-Karten in Lesereihenfolge, für die Abwechslung.
  const plain = [];
  knoten.forEach(el => { if(el.classList.contains('nf-card') && el.querySelector(':scope > .sp-feld')){ const s = st[el.dataset.sid]; const mid = s && (s.dataRef || {}).matchId; if(mid) plain.push({el, s, m:_spMatch(mid)}); } });
  const wahl = new Map(V.folgeWaehlen(plain.map(p => p.m)).map(w => [w.m.id, w]));
  const zaehl = {heute:{}, entwurf:{}};
  const blaetter = {};
  const entwurf = knoten.map(el => {
    if(!el.classList.contains('nf-card')) return el.outerHTML;
    const s = st[el.dataset.sid] || {}, d = s.dataRef || {};
    const c = el.cloneNode(true);
    const art = el.querySelector(':scope > .sp-feld') ? 'feld' : el.querySelector(':scope > .sp-zeile') ? 'zeile' : 'anders';
    zaehl.heute[art] = (zaehl.heute[art] || 0) + 1;
    if(art === 'feld' && d.matchId){
      const w = wahl.get(d.matchId), v = VAR[w.wahl.key], F = V.fakten(w.m);
      const feld = c.querySelector(':scope > .sp-feld'), aufst = c.querySelector(':scope > .sp-aufst');
      if(aufst) aufst.remove();
      feld.outerHTML = v.bild(F, w.wahl.x);
      const ri = c.querySelector('.nf-rub i'); if(ri && v.key !== 'feld') ri.innerHTML = ic(v.ic);
      if(d.type === 'spiel' && v.key !== 'feld'){ const tx = TEXT[v.key](F, w.wahl.x), h = c.querySelector('.nf-h'), dd = c.querySelector('.nf-d'); if(h) h.textContent = tx.t; if(dd) dd.innerHTML = _newsBetont(tx.d); }
      if(['zaehlwerk', 'rueckkehr', 'transfer'].includes(v.key) || (v.key === 'gegner' && w.wahl.x.fluch)){ c.classList.add('nf-glanz'); c.style.setProperty('--gv', '.8s'); }
      zaehl.entwurf[v.key] = (zaehl.entwurf[v.key] || 0) + 1;
      c.dataset.blatt = 'partie_' + w.m.id + '_' + v.key;
      if(!blaetter[c.dataset.blatt]) blaetter[c.dataset.blatt] = V.blattPartie(w.m, v.key);
    } else if(art === 'zeile' && d.matchId){
      const m = _spMatch(d.matchId), F = V.fakten(m);
      const k = V.kandidaten(m).find(x => MARKE_VAR[x.key] && x.rang >= 20);
      const zeile = c.querySelector(':scope > .sp-zeile');
      if(k && zeile){ zeile.outerHTML = `<div class="v5-mitstempel">${zeile.outerHTML}${V.stempelVon(k.key, F, k.x)}</div>`; zaehl.entwurf['zeile+stempel'] = (zaehl.entwurf['zeile+stempel'] || 0) + 1; }
      else zaehl.entwurf.zeile = (zaehl.entwurf.zeile || 0) + 1;
    } else zaehl.entwurf[art] = (zaehl.entwurf[art] || 0) + 1;
    // Ein Blatt für den Typ, wo der Entwurf eins hat.
    if(!c.dataset.blatt){ const b = V.blattFuer(s); if(b){ c.dataset.blatt = 'st_' + s.id; blaetter[c.dataset.blatt] = b; } }
    return c.outerHTML;
  }).join('');
  return {heute, entwurf, zaehl, blaetter};
};
// Welches neue Blatt zu einer Story gehört.
V.blattFuer = function(s){
  const d = (s && s.dataRef) || {};
  try {
    if(d.type === 'win_streak') return V.blattSerie(s);
    if(d.type === 'team_loss_streak') return V.blattDuoPleite(s);
    if(d.type === 'streak_killer') return V.blattRiss(s);
    if(d.type === 'rivalry_milestone') return V.blattRivalitaet(s);
    if(d.type === 'badge_unlocked') return V.blattAuszeichnung(s);
    if(d.type === 'sammel' && d.quelle === 'tafel') return V.blattTafel(s);
    if(d.type === 'rekord_geholt') return V.blattRekord(s);
    if(d.type === 'potd') return V.blattTag(s);
    if(d.type === 'top_clash') return V.blattSpitze(s);
    if(d.type === 'season_endgame') return V.blattEndspurt(s);
    if(d.type === 'ambient' && d.sub === 'form_most_active') return V.blattFakt(s);
    if(d.type === 'insignium_stufe') return V.blattInsignium(s);
    if((d.type === 'spiel' || (d.type === 'sammel' && d.quelle === 'spiel')) && d.matchId){
      const m = _spMatch(d.matchId); const k = V.kandidaten(m)[0]; return V.blattPartie(m, k.key);
    }
  } catch(e){ return `<div class="v5b"><p style="padding:20px;color:var(--red)">${esc(String(e && e.stack || e)).slice(0, 400)}</p></div>`; }
  return '';
};
// Das heutige Blatt einer Story, wie die App es öffnet.
V.heuteBlatt = function(s){
  const liste = getStoriesCache();
  const drin = liste.includes(s);
  if(!drin) liste.push(s);
  try { openNewsDetail(s.id); } catch(e){}
  const nd = document.getElementById('nd');
  const html = nd ? nd.outerHTML : '';
  try { closeNewsDetail(); } catch(e){}
  if(!drin){ const i = liste.indexOf(s); if(i >= 0) liste.splice(i, 1); }
  return html;
};

// ── 6. Einsammeln ───────────────────────────────────────────────────────
// Je Variante ein Beispiel: zuerst aus den letzten vierzehn Tagen, sonst die
// jüngste Partie der Liga, auf die die Regel zutrifft.
V.sammeln = function(){
  const B = _spBasis(), seit = Date.now() - 14 * TAG;
  const fenster = B.chrono.filter(m => mts(m) >= seit);
  const zahl = {fenster:{}, liga:{}};
  B.chrono.forEach(m => V.kandidaten(m).forEach(k => { zahl.liga[k.key] = (zahl.liga[k.key] || 0) + 1; if(mts(m) >= seit) zahl.fenster[k.key] = (zahl.fenster[k.key] || 0) + 1; }));
  const gewaehlt = {}; V.folgeWaehlen(fenster.slice().reverse()).forEach(w => { gewaehlt[w.wahl.key] = (gewaehlt[w.wahl.key] || 0) + 1; });
  const varianten = Object.values(VAR).map(v => {
    const m = fenster.slice().reverse().find(y => { try { return v.wann(V.fakten(y)); } catch(e){ return false; } })
      || B.chrono.slice().reverse().find(y => { try { return v.wann(V.fakten(y)); } catch(e){ return false; } });
    if(!m) return {key:v.key, name:v.name, regel:v.regel, art:v.art, rang:v.rang, karte:'', fehlt:true};
    return {key:v.key, name:v.name, regel:v.regel, art:v.art, rang:v.rang, ic:v.ic, karte:V.varKarte(v.key, m), blattId:'partie_' + m.id + '_' + v.key,
      blatt:V.blattPartie(m, v.key), imFenster:mts(m) >= seit, zeit:zeitVon(m)};
  });
  // Kombinationen: je Form das jüngste Beispiel der Liga.
  const kombis = {};
  B.chrono.slice().reverse().some(m => { const k = V.kombi(m); if(k && !kombis[k.form]) kombis[k.form] = k; return kombis.stempel && kombis.geteilt && kombis.leiste; });
  const kombiOut = Object.keys(kombis).map(f => ({form:f, karte:V.kombiKarte(kombis[f]), anlass:(SP_ANLASS[kombis[f].a.key] || {}).name, dazu:kombis[f].kand.map(c => VAR[c.key].name),
    blattId:'partie_' + kombis[f].m.id + '_' + kombis[f].kand[0].key, blatt:V.blattPartie(kombis[f].m, kombis[f].kand[0].key)}));
  // Welche Paare von Anlass und Variante in der Liga zusammen vorkommen.
  const paare = {};
  B.chrono.forEach(m => { const k = V.kombi(m); if(!k) return; const key = ((SP_ANLASS[k.a.key] || {}).name || k.a.key) + '|' + k.kand[0].key + '|' + ({stempel:'Stempel', geteilt:'Halb und halb', leiste:'Leiste'}[k.form]); paare[key] = (paare[key] || 0) + 1; });
  // Die Blätter je Typ: heute und Entwurf.
  const roh = (_cache._stories || []).slice().sort((p, q) => new Date(q.when) - new Date(p.when));
  const anzeige = getStoriesCache();
  const finde = typ => anzeige.find(s => (s.dataRef || {}).type === typ) || roh.find(s => (s.dataRef || {}).type === typ);
  // Im Fenster gab es nur Schattenseiten; das Blatt zeigt deshalb die jüngste
  // seltene Auszeichnung der Liga, gebaut wie der Generator sie baut.
  let posBadge = roh.find(s => (s.dataRef || {}).type === 'badge_unlocked' && (s.dataRef || {}).rarity !== 'negative');
  if(!posBadge){
    const c = getBadgeEarnedCache();
    for(const m of B.chrono.slice().reverse()){
      const e = (c[m.id] || []).find(x => rarityOf(x.badge.id) === 'rare' && !SP_ERGEBNIS_BADGE.has(x.badge.id));
      if(e){ posBadge = {id:'v5badge_' + m.id, title:`${nm(e.playerId)}: ${e.badge.name}`, desc:e.badge.desc, when:new Date(m.created_at),
        dataRef:{type:'badge_unlocked', playerId:e.playerId, badgeId:e.badge.id, badgeName:e.badge.name, matchId:m.id, rarity:'rare'}}; break; }
    }
  }
  if(!posBadge) posBadge = finde('badge_unlocked');
  const typen = [
    ['spiel', 'Die Partie', anzeige.find(s => (s.dataRef || {}).type === 'spiel' && !/stürzen/.test(s.title)) || finde('spiel')],
    ['win_streak', 'Die Siegesserie', finde('win_streak')],
    ['team_loss_streak', 'Die gemeinsame Pleitenserie', finde('team_loss_streak')],
    ['streak_killer', 'Der Serienbruch', finde('streak_killer')],
    ['rivalry_milestone', 'Die Rivalität', finde('rivalry_milestone')],
    ['badge_unlocked', 'Die Auszeichnung', posBadge],
    ['sammel', 'Der Moment an der Ewigen Tafel', anzeige.find(s => (s.dataRef || {}).quelle === 'tafel')],
    ['rekord_geholt', 'Der übernommene Rekord', finde('rekord_geholt')],
    ['insignium_stufe', 'Die Insignium-Stufe', finde('insignium_stufe')],
    ['potd', 'Der Spieler des Tages', finde('potd')],
    ['top_clash', 'Das Spitzenspiel', finde('top_clash')],
    ['season_endgame', 'Der Endspurt', finde('season_endgame')],
    ['ambient', 'Der Fun Fact', roh.find(s => (s.dataRef || {}).sub === 'form_most_active') || anzeige.find(s => (s.dataRef || {}).sub === 'form_most_active')]
  ].filter(t => t[2]);
  const blaetter = typen.map(([typ, name, s]) => ({typ, name, titel:s.title, heute:V.heuteBlatt(s), entwurf:V.blattFuer(s)}));
  return {varianten, zahl, gewaehlt, nFenster:fenster.length, nLiga:B.chrono.length, kombis:kombiOut, paare, blaetter};
};
})();
