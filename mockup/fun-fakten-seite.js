// Baut `fun-fakten.html`: die Fun Facts um 15 Uhr, Entwurf. Jede Karte steht
// im Rahmen der App (`_newsCardHtmlM2`, gelesen über `tests/runtime.js`), mit
// der Zeichnung ihres Fakts als Kopf (`BILD`). Die Seite zeigt einen Monat
// Tag für Tag neben dem, was die App an denselben Tagen zog, dann jeden Fakt
// an seinem spannendsten Fall, die Regel und die Verteilung.
//
//   node tools/build.mjs && node mockup/fun-fakten-lauf.js && node mockup/fun-fakten-seite.js [ziel.html]
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {createRuntime} = require(path.join(ROOT, 'tests', 'runtime.js'));
const {RUBRIK, FAKT} = require('./fun-fakten-katalog.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '.fun-fakten.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const appCss = (html.slice(0, html.indexOf('</head>')).match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
  .map(s => s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n');

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nm = id => D.name[id] || '?';
const av = id => D.av[id] || '';
const farbe = id => ((D.av[id] || '').match(/background:([^;"]+)/) || [])[1] || 'var(--line2)';
const z = v => String(v).replace('.', ',');
const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const datum = t => new Date(t).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
const kopf = t => `<div class="fx-k">${esc(t)}</div>`;
const name = id => `<span class="fx-n">${esc(nm(id))}</span>`;

// ── Die Zeichnungen ─────────────────────────────────────────────────
// Eine Familie: oben eine kleine Überschrift, die sagt, was die Achse zeigt;
// Gesicht und Name an jedem Spieler; die Farbe der Rubrik (`--fx`) nur an
// dem, worum es geht, alles andere in Metall. Linien 2 px, Flächen ein
// Zehntel ihrer Farbe, am Ende einer Linie Punkt und Wert.
const BILD = {
  // Die Rennbahn: je Spieler eine Bahn, das Gesicht steht bei seinem Elo im
  // Monat; rechts der Rückstand auf die Spitze.
  bahn:(b) => { const e = b.r.map(x => x.elo), lo = Math.min(...e) - 6, hi = Math.max(...e) + 6;
    return kopf(`Wertung des Monats · noch ${b.rest} Tage`) + `<div class="fx-bahn">${b.r.map((x, i) => `<div class="fx-bz${i ? '' : ' eins'}">
      ${name(x.p)}<span class="fx-bt"><i style="left:${((x.elo - lo) / (hi - lo) * 100).toFixed(1)}%">${av(x.p)}</i></span>
      <b class="num">${i ? vz(x.elo - b.r[0].elo) : x.elo}</b></div>`).join('')}</div>`; },
  // Wer an jedem Tag des Monats um 15 Uhr vorn lag, als Streifen in seiner
  // Farbe; darunter jeder mit seinen Tagen.
  fuehrung:(b) => { const n = {};
    b.tage.forEach(x => { if(x.p) n[x.p] = (n[x.p] || 0) + 1; });
    const zellen = Array.from({length:b.monatTage}, (_, i) => { const x = b.tage[i];
      return `<i style="${x && x.p ? 'background:' + farbe(x.p) : ''}"${x ? '' : ' class="spaeter"'}></i>`; }).join('');
    return kopf(`Die Spitze, Tag für Tag · ${b.wechsel} Wechsel`) + `<div class="fx-fs">${zellen}</div>
      <div class="fx-fl">${Object.keys(n).sort((a, c) => n[c] - n[a]).map(p => `<span>${av(p)}${name(p)}<b class="num">${n[p]}</b></span>`).join('')}</div>`; },
  // Der Countdown: die Tage bis zum Monatsende als Ring, daneben die
  // Anwärter mit ihrem Rückstand.
  countdown:(b) => { const R = 26, U = 2 * Math.PI * R, rest = Math.max(0, b.rest);
    return kopf('Bis zum Monatsende') + `<div class="fx-cd"><span class="fx-cd-r"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" class="g"/>
      <circle cx="32" cy="32" r="${R}" class="v" stroke-dasharray="${(U * (b.monatTage - rest) / b.monatTage).toFixed(1)} ${U.toFixed(1)}"/></svg>
      <b class="num">${rest}</b><small>${rest === 1 ? 'Tag' : 'Tage'}</small></span>
      <div class="fx-cd-l">${b.r.map((x, i) => `<div class="fx-cd-z${i ? '' : ' eins'}">${av(x.p)}${name(x.p)}<span class="fx-bar"><i style="width:${(100 - Math.min(40, b.r[0].elo - x.elo) / 40 * 100).toFixed(0)}%"></i></span><b class="num">${i ? vz(x.elo - b.r[0].elo) : x.elo}</b></div>`).join('')}</div></div>`; },
  // Die Jagd: der Halter bei 100 %, der Zweite, wie nah er ist, und die
  // Linie des Rekords.
  jagd:(b) => { const max = b.r[0].w;
    return kopf(`Liga-Rekord · ${b.name}`) + `<div class="fx-jg">${b.r.slice(0, 2).map((x, i) => `<div class="fx-jg-z${i ? ' jaeger' : ''}">${av(x.p)}
      <span class="fx-jg-m">${name(x.p)}<span class="fx-bar"><i style="width:${(x.w / max * 100).toFixed(1)}%"></i></span><small>${esc(x.ev)}</small></span>
      <b class="num">${i ? z(Math.floor(x.w / max * 1000) / 10) + ' %' : 'Rekord'}</b></div>`).join('')}</div>`; },
  // Säulen: die Rekorde je Spieler, die ersten zwei in der Farbe.
  saeulen:(b) => { const max = Math.max(...b.r.map(x => x.n));
    return kopf('Liga-Rekorde je Spieler') + `<div class="fx-sl">${b.r.map((x, i) => `<span class="${i < 2 ? 'vorn' : ''}"><b class="num">${x.n}</b>
      <i style="height:${(x.n / max * 100).toFixed(0)}%"></i>${av(x.p)}${name(x.p)}</span>`).join('')}</div>`; },
  // Zwölf Gesichter, die Liga: hell nur, wer die Auszeichnung trägt.
  zwoelf:(b) => kopf(`${b.r === 'legendary' ? 'Legendär' : 'Selten'} · ${b.name}`)
    + `<div class="fx-zw ${b.r}">${b.alle.map(p => `<span class="${b.p.includes(p) ? 'hat' : ''}">${av(p)}</span>`).join('')}</div>`
    + `<div class="fx-zw-t">${b.p.map(name).join('<i>·</i>')}<small>trägt sie, ${b.alle.length - b.p.length} nicht</small></div>`,
  // Perlen: jede Verleihung eine, die fehlende leuchtet; ab 25 als Balken.
  perlen:(b, f) => {
    if(f.key === 'team_ungeschlagen') return kopf('Zu zweit, jede Partie') + `<div class="fx-pa">${av(b.a)}${av(b.b)}<span class="fx-pr">${b.l.map(() => '<i class="w"></i>').join('')}</span><b class="num">${b.l.length}:0</b></div>`;
    const viele = b.ziel > 25;
    return kopf(`${b.name} · bis zur ${b.ziel}`) + `<div class="fx-pa">${av(f.pids[0])}${viele
      ? `<span class="fx-bar breit"><i style="width:${(b.n / b.ziel * 100).toFixed(1)}%"></i><u></u></span>`
      : `<span class="fx-pr">${Array.from({length:b.ziel}, (_, i) => `<i class="${i < b.n ? 'w' : 'offen'}"></i>`).join('')}</span>`}<b class="num">${b.n}/${b.ziel}</b></div>`; },
  // Die Einträge der Chronik eines Spielers im laufenden Monat.
  chronik:(b) => kopf(`Chronik des Monats · ${b.l.length} von ${b.alle}`) + `<div class="fx-ch">${av(b.p)}<span class="fx-ch-l">${b.l.slice(0, 5).map(t => `<em>${esc(t)}</em>`).join('')}${b.l.length > 5 ? `<em class="mehr">+${b.l.length - 5}</em>` : ''}</span></div>`,
  // Das Zählwerk: die Zahl heute, die Marke, dazwischen die fehlenden.
  zaehler:(b) => { const fehlt = b.ziel - b.n, ziffern = String(b.n).split('');
    return kopf(b.was === 'Liga' ? 'Partien der Liga' : `${b.was === 'Sieg' ? 'Siege' : b.was === 'Spiel' ? 'Spiele' : 'Tore'} in der Laufbahn`) + `<div class="fx-zl${b.p ? '' : ' ohne'}">${b.p ? av(b.p) : ''}
      <span class="fx-zl-z">${ziffern.map(c => `<i>${c}</i>`).join('')}</span><span class="fx-zl-f">${Array.from({length:fehlt}, () => '<i></i>').join('')}</span>
      <span class="fx-zl-m"><b class="num">${b.ziel}</b><small>noch ${fehlt}</small></span></div>`; },
  // Die Laufbahn als Kurve, der Gipfel mit Fahne, heute ein Punkt.
  gipfel:(b) => { const v = b.kurve, W = 244, H = 70, lo = Math.min(...v) - 10, hi = Math.max(...v, b.top.e) + 6;
    const X = i => 6 + i * (W - 50) / Math.max(1, v.length - 1), Y = y => 6 + (hi - y) * (H - 14) / (hi - lo);
    const d = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('');
    const ti = v.indexOf(Math.max(...v));
    return kopf('Elo der Laufbahn') + `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="ref" x1="6" x2="${W - 44}" y1="${Y(b.top.e).toFixed(1)}" y2="${Y(b.top.e).toFixed(1)}"/>
      <path class="fl" d="${d}L${X(v.length - 1).toFixed(1)} ${H}L6 ${H}Z"/><path class="ln" d="${d}"/>
      <path class="fahne" d="M${X(ti).toFixed(1)} ${(Y(v[ti]) - 2).toFixed(1)}v-12l8 3-8 3"/>
      <circle class="pt" cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="4"/>
      <text x="${W - 40}" y="${(Y(b.top.e) + 3).toFixed(1)}" class="ref">${b.top.e}</text>
      <text x="${(X(v.length - 1) + 7).toFixed(1)}" y="${(Y(v[v.length - 1]) + 12).toFixed(1)}" class="w">${v[v.length - 1]}</text></svg>`; },
  // Die Leiter: sieben Stufen, die heutige hell, der Spieler darin, die
  // Schwelle der nächsten.
  leiter:(b) => { const st = b.stufen, i = b.stufe, von = st[i].min, bis = st[i + 1] ? st[i + 1].min : von + 500;
    return kopf(`Insignium · ${b.punkte} Prestige`) + `<div class="fx-lt">${st.map((s, k) => `<span class="${k < i ? 'unter' : k === i ? 'jetzt' : k === i + 1 ? 'naechste' : ''}">
      ${k === i ? `<i style="left:${((b.punkte - von) / (bis - von) * 100).toFixed(1)}%">${av(b.p)}</i>` : ''}<small>${esc(s.name)}</small></span>`).join('')}</div>
      <div class="fx-lt-t"><b class="num">noch ${b.fehlt}</b> bis ${esc(st[i + 1] ? st[i + 1].name : '')}</div>`; },
  // Das Tau: zwei an den Enden, die Mitte bei gleich, der Knoten da, wo es
  // steht.
  tau:(b, f) => { const duell = f.key === 'duell_kipp';
    const a = duell ? {p:b.a, n:b.w} : b.a, c = duell ? {p:b.b, n:b.v} : b.b;
    const q = a.n + c.n ? a.n / (a.n + c.n) : .5;
    // Die Zahlen stehen unter den Namen: vierstelliges Prestige ließ dem
    // Tau zwischen den Gesichtern keinen Platz.
    return kopf(duell ? `Bilanz nach ${b.w + b.v} Duellen` : `Prestige · Platz ${b.platz} und ${b.platz + 1}`) + `<div class="fx-tau">${av(a.p)}
      <span class="fx-tau-s"><u></u><i style="left:${(q * 100).toFixed(1)}%"></i></span>${av(c.p)}</div>
      <div class="fx-tau-n"><span>${name(a.p)}<b class="num">${a.n}</b></span><span>${name(c.p)}<b class="num">${c.n}</b></span></div>`; },
  // Drei Balken: jeder allein, beide zusammen.
  chemie:(b) => kopf(`Siegquote · ${b.g} Partien zu zweit`) + `<div class="fx-cm">
      <div>${av(b.a)}${name(b.a)}<span class="fx-bar"><i style="width:${b.qa}%"></i></span><b class="num">${b.qa} %</b></div>
      <div>${av(b.b)}${name(b.b)}<span class="fx-bar"><i style="width:${b.qb}%"></i></span><b class="num">${b.qb} %</b></div>
      <div class="zus"><span class="fx-paar">${av(b.a)}${av(b.b)}</span><span class="fx-n">zusammen</span><span class="fx-bar"><i style="width:${b.q}%"></i></span><b class="num">${b.q} %</b></div></div>`,
  // Das Netz der Paare: wer mit wem wie oft auf einer Seite stand, das
  // leere Feld der zwei leuchtet.
  netz:(b) => { const ids = D.ids, max = Math.max(...b.m.flat());
    const zelle = (i, j) => { const n = b.m[i][j], an = (ids[i] === b.a && ids[j] === b.b) || (ids[i] === b.b && ids[j] === b.a);
      return `<i class="${an ? 'an' : n < 0 ? 'x' : n === 0 ? 'nie' : ''}" style="${n > 0 ? `opacity:${(.2 + .8 * n / max).toFixed(2)}` : ''}"></i>`; };
    return kopf('Zusammen gespielt, jedes Paar der Liga') + `<div class="fx-nz"><span class="fx-nz-g">${ids.map((x, i) => ids.map((y, j) => j < i ? zelle(i, j) : '<i class="leer"></i>').join('')).join('')}</span>
      <span class="fx-nz-t">${av(b.a)}${av(b.b)}<small>nie auf<br>einer Seite</small></span></div>`; },
  // Zwei Seiten: Abwehr und Sturm mit der Linie bei 50 %.
  seiten:(b) => kopf('Siegquote nach Position') + `<div class="fx-sd">${av(b.p)}<span class="fx-sd-l">
      <div class="${b.def.q > b.atk.q ? 'besser' : ''}"><small>Abwehr</small><span class="fx-bar"><i style="width:${b.def.q}%"></i><u></u></span><b class="num">${b.def.q} %</b></div>
      <div class="${b.atk.q > b.def.q ? 'besser' : ''}"><small>Sturm</small><span class="fx-bar"><i style="width:${b.atk.q}%"></i><u></u></span><b class="num">${b.atk.q} %</b></div></span></div>`,
  // Siege gegen die Erwartung, Partie für Partie aufsummiert.
  erwartung:(b, f) => { const v = b.kurve, W = 244, H = 72, lo = Math.min(0, ...v) - .5, hi = Math.max(0, ...v) + .5;
    const X = i => 26 + i * (W - 60) / (v.length - 1), Y = y => 6 + (hi - y) * (H - 16) / (hi - lo);
    const d = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join(''), neg = b.d < 0;
    return kopf('Siege über der Erwartung, letzte 40') + `<svg class="fx-svg${neg ? ' neg' : ''}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line class="ref" x1="26" x2="${W - 34}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/><text class="ax" x="20" y="${(Y(0) + 3).toFixed(1)}">±0</text>
      <path class="fl" d="${d}L${X(v.length - 1).toFixed(1)} ${Y(0).toFixed(1)}L26 ${Y(0).toFixed(1)}Z"/><path class="ln" d="${d}"/>
      <circle class="pt" cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="4"/>
      <text class="w" x="${(X(v.length - 1) + 7).toFixed(1)}" y="${(Y(v[v.length - 1]) + 4).toFixed(1)}">${vz(Math.round(b.d))}</text>
      <text class="ax" x="26" y="${H - 2}">vor 40 Partien</text><text class="ax re" x="${X(v.length - 1).toFixed(1)}" y="${H - 2}">heute</text></svg>`
      + `<div class="fx-lg">${av(f.pids[0])}${name(f.pids[0])}</div>`; },
  // Der Tacho: die Quote als Außenseiter, die Marke bei 50 %.
  tacho2:(b) => { const R = 40, a = Math.PI * (1 - b.q / 100), x = 50 + R * Math.cos(a), y = 50 - R * Math.sin(a);
    return kopf('Als Außenseiter, Siegchance unter 45 %') + `<div class="fx-tc"><svg viewBox="0 0 100 56" aria-hidden="true"><path class="g" d="M10 50A40 40 0 0 1 90 50"/>
      <path class="v" d="M10 50A40 40 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}"/><line class="m" x1="50" y1="6" x2="50" y2="14"/></svg>
      <span class="fx-tc-w"><b class="num">${b.q} %</b><small>${b.w} von ${b.g}</small></span>${av(b.p)}</div>`; },
  // Die Kette der letzten Duelle, die Serie am Ende hervorgehoben.
  kette:(b) => kopf(`Die letzten ${b.l.length} Duelle`) + `<div class="fx-kt">${av(b.a)}<span class="fx-kt-l">${b.l.map((x, i) => `<i class="${x ? 'w' : 'l'}${i >= b.l.length - b.n ? ' serie' : ''}"></i>`).join('')}</span>${av(b.b)}</div>
      <div class="fx-tau-n">${name(b.a)}${name(b.b)}</div>`,
  // Die Wertung des Monats als Kette der Gesichter, der Meister des
  // Vormonats mit Krone auf seinem Platz.
  reihe:(b) => kopf(`Wertung des Monats · Meister des ${b.monat}s`) + `<div class="fx-rh" style="--n:${b.r.length}">${b.r.map((x, i) =>
    `<span class="${x.p === b.m ? 'm' : ''}">${x.p === b.m ? '<em aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 18h18l-1.6-10-4.9 4-2.5-7-2.5 7-4.9-4z"/></svg></em>' : '<em></em>'}${av(x.p)}<small class="num">${i + 1}</small></span>`).join('')}</div>`,
  // Der Wechsel eines Rekords: der alte Halter blass, der neue mit Licht.
  wechsel:(b) => kopf(`Liga-Rekord · ${b.name}`) + `<div class="fx-wx"><span class="alt">${av(b.alt)}${name(b.alt)}</span><i aria-hidden="true"></i>
    <span class="neu">${av(b.neu.p)}${name(b.neu.p)}</span></div><div class="fx-wx-t">${esc(b.neu.ev)}</div>`,
  // Das Elo des Monats, Partie für Partie, ab dem Stand vor dem Monat.
  monatskurve:(b, f) => { const v = b.kurve, W = 244, H = 70, lo = Math.min(...v) - 5, hi = Math.max(...v) + 5;
    const X = i => 6 + i * (W - 44) / Math.max(1, v.length - 1), Y = y => 6 + (hi - y) * (H - 16) / (hi - lo);
    const d = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('');
    return kopf('Elo im Monat, Partie für Partie') + `<svg class="fx-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line class="ref" x1="6" x2="${W - 38}" y1="${Y(v[0]).toFixed(1)}" y2="${Y(v[0]).toFixed(1)}"/>
      <path class="fl" d="${d}L${X(v.length - 1).toFixed(1)} ${Y(v[0]).toFixed(1)}L6 ${Y(v[0]).toFixed(1)}Z"/><path class="ln" d="${d}"/>
      <circle class="pt" cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="4"/>
      <text class="w" x="${(X(v.length - 1) + 7).toFixed(1)}" y="${(Y(v[v.length - 1]) + 4).toFixed(1)}">+${b.g}</text>
      <text class="ax" x="6" y="${H - 2}">Monatsbeginn</text><text class="ax re" x="${X(v.length - 1).toFixed(1)}" y="${H - 2}">heute</text></svg>
      <div class="fx-lg">${av(b.p)}${name(b.p)}</div>`; },
  // Der Stern: einer in der Mitte, um ihn jeder, mit dem er gespielt hat,
  // der Neue hell.
  stern:(b) => { const n = b.l.length, R = 42, C = 52, max = Math.max(...b.l.map(x => x.g));
    const pos = i => { const w = -Math.PI / 2 + i * 2 * Math.PI / n; return [C + R * Math.cos(w), C + R * Math.sin(w)]; };
    return kopf(`Partner, mit allen ${n}`) + `<div class="fx-sn"><span class="fx-sn-b"><svg viewBox="0 0 104 104" aria-hidden="true">${b.l.map((x, i) => { const [px, py] = pos(i);
      return `<line x1="${C}" y1="${C}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" class="${x.p === b.letzter ? 'neu' : ''}" style="opacity:${(.25 + .75 * x.g / max).toFixed(2)}"/>`; }).join('')}</svg>
      <i class="mitte" style="left:${C}px;top:${C}px">${av(b.p)}</i>${b.l.map((x, i) => { const [px, py] = pos(i); return `<i class="${x.p === b.letzter ? 'neu' : ''}" style="left:${px.toFixed(1)}px;top:${py.toFixed(1)}px">${av(x.p)}</i>`; }).join('')}</span>
      <span class="fx-sn-t">${av(b.letzter)}${name(b.letzter)}<small>zuletzt dazu</small></span></div>`; },
  // Zwei Balken: wie oft im Sturm, in den 40 Partien davor und in den
  // letzten 20.
  anteil:(b) => kopf('Anteil im Sturm') + `<div class="fx-sd">${av(b.p)}<span class="fx-sd-l">
      <div><small>40 davor</small><span class="fx-bar"><i style="width:${b.qv}%"></i><u></u></span><b class="num">${b.qv} %</b></div>
      <div class="besser"><small>letzte 20</small><span class="fx-bar"><i style="width:${b.qj}%"></i><u></u></span><b class="num">${b.qj} %</b></div></span></div>`,
  // Dieselben vier: die zwei Paare, ihre Bilanz und die letzten Begegnungen.
  paarung:(b) => kopf('Genau diese zwei Paare') + `<div class="fx-pg"><span class="fx-paar">${av(b.v[0])}${av(b.v[1])}</span>
      <b class="num">${b.w}:${b.l}</b><span class="fx-paar">${av(b.h[0])}${av(b.h[1])}</span></div>
      <div class="fx-kt fx-pg-k"><span class="fx-kt-l">${b.folge.map(x => `<i class="${x ? 'w serie' : 'l'}"></i>`).join('')}</span></div>`,
  // Die Spanne der Liga: jeder als Punkt auf der Elo-Achse, die Klammer
  // heute und gestrichelt die vor 30 Tagen.
  spanne:(b) => { const e = b.jetzt.map(x => x.e), lo = Math.min(...e, b.vor.lo) - 10, hi = Math.max(...e, b.vor.hi) + 10, X = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
    const unten = b.jetzt.reduce((m, x) => x.e < m.e ? x : m), oben = b.jetzt.reduce((m, x) => x.e > m.e ? x : m);
    return kopf('Elo der Liga, heute und vor 30 Tagen') + `<div class="fx-sp"><u class="vor" style="left:${X(b.vor.lo)}%;width:${(X(b.vor.hi) - X(b.vor.lo)).toFixed(1)}%"></u>
      <u class="jetzt" style="left:${X(Math.min(...e))}%;width:${(X(Math.max(...e)) - X(Math.min(...e))).toFixed(1)}%"></u>
      ${b.jetzt.map(x => `<i style="left:${X(x.e)}%;background:${farbe(x.p)}"></i>`).join('')}</div>
      <div class="fx-sp-n"><span>${av(unten.p)}${name(unten.p)}</span><b class="num">${b.a} Elo <small>vorher ${b.b}</small></b><span>${name(oben.p)}${av(oben.p)}</span></div>`; },
  // Die Form der Liga: jeder als Balken von der Mitte, nach rechts, was er
  // in 14 Tagen gewann, nach links, was er verlor; der Erste in der Farbe.
  formbalken:(b) => { const max = Math.max(...b.l.map(x => Math.abs(x.d)), 1), l = b.l.slice(0, 8);
    return kopf(`Elo in den letzten 14 Tagen${b.l.length > 8 ? ' · die ersten acht' : ''}`) + `<div class="fx-fb">${l.map((x, i) => `<div class="${i ? '' : 'eins'}${x.d < 0 ? ' neg' : ''}">${av(x.p)}${name(x.p)}
      <span class="fx-fb-s"><u></u><i style="${x.d < 0 ? `right:50%;width:${(-x.d / max * 50).toFixed(1)}%` : `left:50%;width:${(x.d / max * 50).toFixed(1)}%`}"></i></span><b class="num">${vz(x.d)}</b></div>`).join('')}</div>`; },
  // Jeder als Pfeil von der Quote seiner Laufbahn (Kreis) zur Quote der
  // letzten 14 Tage (Punkt); der mit dem größten Sprung in der Farbe.
  formpunkte:(b) => { const l = b.l.slice(0, 8);
    return kopf('Siegquote: Laufbahn → letzte 14 Tage') + `<div class="fx-fp">${l.map((x, i) => { const a = Math.min(x.qa, x.q), c = Math.max(x.qa, x.q);
      return `<div class="${i ? '' : 'eins'}${x.d < 0 ? ' neg' : ''}">${av(x.p)}${name(x.p)}<span class="fx-fp-s"><u></u><em style="left:${a}%;width:${c - a}%"></em><s style="left:${x.qa}%"></s><i style="left:${x.q}%"></i></span><b class="num">${x.q} %</b></div>`; }).join('')}</div>`; },
  // Die Woche als Säulen, der Tag der Liga in der Farbe.
  woche:(b) => { const max = Math.max(...b.w);
    return kopf('Partien je Wochentag') + `<div class="fx-wo">${b.w.map((n, i) => `<span class="${i === b.i ? 'an' : ''}"><b class="num">${n}</b><i style="height:${(n / max * 100).toFixed(0)}%"></i><small>${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][i]}</small></span>`).join('')}</div>`; },
  // Die Stunden des Tages als Säulen.
  stunden:(b) => { const h = Object.keys(b.s).map(Number), von = Math.min(...h), bis = Math.max(...h), max = Math.max(...Object.values(b.s));
    return kopf('Partien je Stunde') + `<div class="fx-wo fx-st">${Array.from({length:bis - von + 1}, (_, k) => { const s = von + k, n = b.s[s] || 0;
      return `<span class="${s === b.h ? 'an' : ''}"><i style="height:${(n / max * 100).toFixed(0)}%"></i><small>${s % 2 ? '' : s}</small></span>`; }).join('')}</div>`; }
};
Object.keys(FAKT).forEach(k => { if(!BILD[FAKT[k].bild]) throw new Error('Zeichnung fehlt: ' + FAKT[k].bild); });

// ── Die Karte im Rahmen der App ─────────────────────────────────────
// Der Rahmen kommt aus `_newsCardHtmlM2`: die Zeichnung als Kopf
// (`bild.f = 'neu'`), die Rubrik als Aufschrift, Zeichen und Uhrzeit wie
// bei jedem Fun Fact.
const NAMES = Object.values(D.name), IDS = D.ids;
const {K, setNow} = createRuntime();
setNow(Date.parse('2026-10-31T12:00:00+01:00'));
K(`players = ${JSON.stringify(IDS.map((id, i) => ({id, name:NAMES[i], hidden:false, elo:0, atk:0.5, avatar_id:null})))}; matches = []; invalidateCache();
  _FF_FORM.neu = b => b.html;
  ${Object.keys(RUBRIK).map(r => `NEWS_AMBIENT_STIL.x_${r} = {label:${JSON.stringify(RUBRIK[r].label)}, ton:${JSON.stringify(RUBRIK[r].ton)}};`).join('\n')}
  globalThis._ffKarte = (o) => _newsCardHtmlM2({id:'ambient_' + o.id, cat:'fun', ic:o.ic, title:o.title, desc:o.desc, when:new Date(o.T), prio:30,
    dataRef:{type:'ambient', sub:o.key, ambientRubrik:'x_' + o.rubrik, bild:{f:'neu', html:o.html}}}, true); 0`);
let nr = 0;
const karte = (f, T) => { const F = FAKT[f.key];
  // `fx-b-…`, nicht `fx-…`: der Rahmen hieß sonst wie ein Teil darin
  // (`.fx-tau`) und bekam dessen Raster, die Überschrift stand im Tau.
  const bild = `<div class="fx fx-b-${F.bild} fx-r-${F.rubrik}">${BILD[F.bild](f.bild, f)}</div>`;
  return K(`_ffKarte(${JSON.stringify({id:String(nr++), key:f.key, rubrik:F.rubrik, ic:F.ic, title:f.title, desc:f.desc, T, html:bild})})`); };
const feed = h => `<div class="nf-wrap nf-liste"><div class="nf-feed">${h}</div></div>`;

// ── Die Seite ───────────────────────────────────────────────────────
const S = D.stat, E = S.entwurf, A = S.app;
const okt = D.tage.filter(t => t.tag >= '2026-10-01');
const zahlen = (o, name, max) => { const l = Object.keys(o).sort((a, b) => o[b] - o[a]), m = Math.max(...l.map(k => o[k]));
  return `<div class="ff-vt">${l.slice(0, max || 99).map(k => `<div class="ff-vt-z"><span>${name(k)}</span><span class="ff-vt-b"><i style="width:${(o[k] / m * 100).toFixed(1)}%"></i></span><b class="num">${o[k]}</b></div>`).join('')}</div>`; };
const spielerVgl = () => { const l = IDS.slice().sort((a, b) => (E.spieler[b] || 0) - (E.spieler[a] || 0)), m = Math.max(...IDS.map(p => Math.max(E.spieler[p] || 0, A.spieler[p] || 0)));
  return `<div class="ff-sv">${l.map(p => `<div class="ff-sv-z">${av(p)}<span>${esc(nm(p))}</span>
    <span class="ff-sv-b"><i class="e" style="width:${((E.spieler[p] || 0) / m * 100).toFixed(1)}%"></i><i class="a" style="width:${((A.spieler[p] || 0) / m * 100).toFixed(1)}%"></i></span>
    <b class="num">${E.spieler[p] || 0}</b><small class="num">${A.spieler[p] || 0}</small></div>`).join('')}</div>`; };
const appName = k => k || '—';
const tagesTabelle = () => `<table class="ff-tab"><thead><tr><th>Tag</th><th>Die App</th><th>Der Entwurf</th><th class="num">Spannung</th><th class="num">Lockerung</th></tr></thead><tbody>
  ${D.tage.slice().reverse().map(t => `<tr><td class="num">${esc(datum(t.T))}</td><td>${t.app ? esc(t.app.title) + `<small>${esc(appName(t.app.key))}</small>` : '<small>keiner</small>'}</td>
    <td>${t.wahl ? esc(t.wahl.title) + `<small>${esc(FAKT[t.wahl.key].name)} · ${esc(RUBRIK[FAKT[t.wahl.key].rubrik].name)}</small>` : '<small>keiner</small>'}</td>
    <td class="num">${t.wahl ? t.wahl.spannung : ''}</td><td class="num">${t.wahl ? (t.wahl.durchgang ? t.wahl.durchgang : '—') : ''}</td></tr>`).join('')}</tbody></table>`;
const katalog = () => Object.keys(RUBRIK).map(r => { const arten = Object.keys(FAKT).filter(k => FAKT[k].rubrik === r);
  return `<h3>${esc(RUBRIK[r].name)}</h3><div class="ff-gal">${arten.map(k => { const b = D.beste[k], F = FAKT[k];
    return `<figure class="ff-kat">${b ? feed(karte(b, b.T || Date.parse(b.tag + 'T15:00:00'))) : '<div class="ff-leer">trat im Lauf nicht ein</div>'}
      <figcaption><b>${esc(F.name)}</b><span>${esc(F.wann)}</span><small>Spannung: ${esc(F.spannung)}</small>
      <small class="num">trifft an ${S.kandidaten[k] || 0} von ${S.tage} Tagen zu · gewählt ${E.art[k] || 0}-mal${b ? ' · Beispiel vom ' + esc(datum(Date.parse(b.tag + 'T15:00:00'))) : ''}</small></figcaption></figure>`; }).join('')}</div>`; }).join('');

const seite = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fun Facts um 15 Uhr</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${appCss}</style>
<style>${fs.readFileSync(path.join(__dirname, 'fun-fakten.css'), 'utf8')}</style>
</head><body class="ff-seite">
<header class="ff-held">
  <p class="ff-ober">Fun Facts um 15 Uhr · Entwurf</p>
  <h1>Was heute spannend ist</h1>
  <p class="ff-lead">Ein Fun Fact am Tag, an jedem Tag ohne Partie bis 15 Uhr. Die App zieht ihn heute per Los aus ${Object.keys(A.art).length > 0 ? 'ihren' : ''} Vorlagen, und die meisten sagen „X führt bei Y“. Der Entwurf prüft ${Object.keys(FAKT).length} Fakten aus ${Object.keys(RUBRIK).length} Rubriken — Titelrennen, Saisonschluss, Rekorde, Auszeichnungen, Chronik, Laufbahn, Insignium, Teams, Positionen, Abweichung, Duelle, Liga — und nimmt den spannendsten, der nicht eben erst dran war. Gerechnet an den ${S.tage} Tagen der echten Liga von Mai bis Oktober.</p>
  <div class="ff-kennz">
    <span><b class="num">${Object.keys(FAKT).length}</b> Fakten, ${Object.keys(RUBRIK).length} Rubriken</span>
    <span><b class="num">${S.kandJeTag}</b> treffen je Tag zu</span>
    <span><b class="num">${E.arten}</b> verschiedene Fakten in ${E.n} Tagen <small>App ${A.arten}</small></span>
    <span><b class="num">${Object.keys(E.spieler).length}</b> Spieler im Fun Fact <small>App ${Object.keys(A.spieler).length}</small></span>
    <span><b class="num">${E.paarWieder}</b> Wiederholungen von Fakt und Spieler <small>App ${A.paarWieder}</small></span>
    <span><b class="num">${E.artAbstand === Infinity ? '—' : E.artAbstand}</b> Fun Facts mindestens zwischen zwei gleichen <small>App ${A.artAbstand === Infinity ? '—' : A.artAbstand}</small></span>
  </div>
  <nav><a href="#monat">Ein Monat</a><a href="#katalog">Alle Fakten</a><a href="#regel">Die Regel</a><a href="#verteilung">Verteilung</a></nav>
</header>

<section id="monat" class="ff-abschnitt">
  <h2>Der Oktober, Tag für Tag</h2>
  <p class="ff-satz">Jeder Tag ohne Partie bis 15 Uhr: oben der Fun Fact des Entwurfs, darunter klein, was die App an diesem Tag zog.</p>
  <div class="ff-reihe">${okt.map(t => `<div class="ff-tag"><div class="ff-datum">${esc(datum(t.T))}${t.wahl ? `<small>Spannung ${t.wahl.spannung}</small>` : ''}</div>
    ${t.wahl ? feed(karte(t.wahl, t.T)) : '<div class="ff-leer">kein Fakt</div>'}
    <div class="ff-app"><small>Die App</small>${t.app ? feed(t.app.html) : '<div class="ff-leer">keiner</div>'}</div></div>`).join('')}</div>
</section>

<section id="katalog" class="ff-abschnitt">
  <h2>Alle Fakten</h2>
  <p class="ff-satz">Jeder Fakt an seinem spannendsten Fall im ganzen Lauf, mit Bedingung, wovon die Spannung abhängt und wie oft er zutraf und gewählt wurde.</p>
  ${katalog()}
</section>

<section id="regel" class="ff-abschnitt">
  <h2>Die Regel</h2>
  <ol class="ff-schritte">
    <li><b>Prüfen.</b> Um 15 Uhr rechnet jeder Fakt auf dem Stand der Liga, ob er zutrifft, mit welchen Spielern und wie spannend: 0 bis 100, je knapper, näher oder seltener, desto mehr.</li>
    <li><b>Sperren.</b> Nicht dieselbe Art wie in den letzten zehn Fun Facts (der Schlussspurt: drei), nicht dieselbe Rubrik wie in den letzten zwei, kein Spieler aus den letzten drei, und dieselbe Art über denselben Spieler höchstens alle neunzig Tage. Das Titelrennen kennt die Sperren für Spieler nicht: oben stehen jeden Monat dieselben.</li>
    <li><b>Wählen.</b> Der spannendste, der frei ist; wer in den letzten zehn Fun Facts schon stand, verliert je Auftritt zehn Punkte. Gleich spannend entscheidet das Los des Datums, auf jedem Gerät dasselbe.</li>
    <li><b>Lockern.</b> Bleibt nichts, gelten erst die Spieler nur noch für den letzten Fun Fact, dann die Rubrik nur noch für den letzten, dann die Art nur noch für die letzten vier; ganz zuletzt gilt keine Sperre mehr. Ein Tag bleibt nie leer.</li>
  </ol>
  <p class="ff-satz">Die App zieht per Los mit Sperren für Art (sieben Tage), Rubrik (zwei Tage), Spieler (zwei Tage) und Art mit Spieler (dreißig Tage); wie knapp ein Rennen ist, weiß das Los nicht. Ihre Rubriken sind sieben, die des Entwurfs zwölf: Titelrennen, Saisonschluss, Rekorde, Teams, Positionen und Abweichung kommen dazu, die Laufbahn teilt sich mit dem Insignium.</p>
  <p class="ff-satz">Gelockert werden musste an ${Object.entries(E.durchgang).filter(([d]) => d !== '0').reduce((s, [, n]) => s + n, 0)} von ${E.n} Tagen (${Object.entries(E.durchgang).map(([d, n]) => `Stufe ${d}: ${n}`).join(', ')}).</p>
</section>

<section id="verteilung" class="ff-abschnitt">
  <h2>Verteilung</h2>
  <div class="ff-zwei">
    <div><h3>Rubriken im Entwurf</h3>${zahlen(E.rubriken, r => esc(RUBRIK[r].name))}</div>
    <div><h3>Spieler · Entwurf und <span class="ff-a">App</span></h3>${spielerVgl()}</div>
    <div><h3>Fakten im Entwurf</h3>${zahlen(E.art, k => esc(FAKT[k].name))}</div>
    <div><h3>Vorlagen der App</h3>${zahlen(A.art, k => esc(k))}</div>
  </div>
  <h3>Jeder Tag</h3>
  <div class="ff-tab-w">${tagesTabelle()}</div>
</section>
<script>
(() => { const io = 'IntersectionObserver' in window && new IntersectionObserver(l => l.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('im-bild'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -10% 0px'});
  document.querySelectorAll('.nf-card').forEach(c => io ? io.observe(c) : c.classList.add('im-bild')); })();
</script>
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'fun-fakten.html'), seite);
if(process.argv[2]) fs.writeFileSync(process.argv[2], seite.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head><body class="ff-seite">/, '<div class="ff-seite">').replace(/<\/body><\/html>$/, '</div>'));
console.log('fun-fakten.html · ' + Math.round(seite.length / 1024) + ' kB');

// Die Prüfseite (FF_ALLE_HTML=ziel.html): jede gewählte Karte des Laufs und
// jedes Beispiel des Katalogs, ohne Text drumherum. Sie wird nicht
// veröffentlicht.
if(process.env.FF_ALLE_HTML){
  const alle = D.tage.filter(t => t.wahl).map(t => karte(t.wahl, t.T))
    .concat(Object.keys(D.beste).map(k => karte(D.beste[k], Date.parse(D.beste[k].tag + 'T15:00:00'))));
  fs.writeFileSync(process.env.FF_ALLE_HTML, seite.replace(/<body class="ff-seite">[\s\S]*<\/body>/,
    `<body class="ff-seite"><div class="ff-gal">${alle.map(h => `<figure class="ff-kat">${feed(h)}</figure>`).join('')}</div></body>`));
  console.log('Prüfseite · ' + alle.length + ' Karten');
}
