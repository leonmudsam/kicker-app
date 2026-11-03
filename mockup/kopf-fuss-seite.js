// Baut `kopf-fuss.html`: Köpfe und Füße der Karte einer Partie, zweite
// Runde. Jeder Entwurf als ganze Karte aus echten Partien (`.kopf-fuss.json`
// aus `kopf-fuss-lauf.js`), dazu die Regel, wann er kommt, wie oft er im
// Lauf kam, und die Auswahl, die für Abwechslung sorgt.
//
//   node tools/build.mjs && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js [ziel.html]
//
// Der Rahmen der Karte (`nf-card`, `nf-top`, `nf-gr`) und die Gesichter
// (`.av`) sind die der App, aus `dist/index.html`; neu ist nur, was im Kopf
// und im Fuß steht (`kf-*`). Jeder Kopf zeigt alle vier Gesichter und den
// Endstand aus Sicht der Sieger.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const N = JSON.parse(fs.readFileSync(path.join(__dirname, '.kopf-fuss.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const kopfHtml = html.slice(0, html.indexOf('</head>'));
const appCss = (kopfHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
  .map(s => s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n');

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nm = id => N.name[id] || '?';
const av = (id, cls) => (N.av[id] || '').replace('class="av"', `class="av${cls ? ' ' + cls : ''}"`);
const ic = k => N.ic[k] || '';
const b = s => `<b>${esc(s)}</b>`;
const z = v => String(v).replace('.', ',');
const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const und = ids => ids.map(nm).join(' und ');
const uhr = t => new Date(t).toTimeString().slice(0, 5);
const datum = t => new Date(t).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
const monat = sid => new Date(sid + '-15T12:00:00').toLocaleDateString('de-DE', {month:'long'});
const prozent = (a, n) => n ? Math.round(a / n * 100) : 0;
let uid = 0;

// ── Die Köpfe ───────────────────────────────────────────────────────
// Die Namen stehen unter jedem Kopf in derselben Zeile wie in der App:
// die Sieger links, die Verlierer rechts.
const namen = k => `<div class="kf-nz"><span class="w">${k.W.map(x => b(nm(x))).join('')}</span><i>gegen</i><span>${k.L.map(x => b(nm(x))).join('')}</span></div>`;
const paar = (ids, cls) => `<span class="kf-paar${cls ? ' ' + cls : ''}">${ids.map(x => av(x)).join('')}</span>`;
const stand = k => `<span class="kf-stand num"><b>${k.hoch}</b><i>:</i><span>${k.tief}</span></span>`;
const flamme = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c-1-3 2-4 2-9z"/></svg>`;
const eis = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke-width="2.2" stroke-linecap="round"/></svg>`;
// Vier Spalten, die Sieger links, die Verlierer rechts, der Endstand in der
// Mitte; unter jedem Gesicht, was der Kopf über ihn weiß.
const vier = (k, unter, mitte) => `<div class="kf-vier">
    ${k.W.map(x => `<div class="kf-sp w">${av(x)}${unter(x, true)}</div>`).join('')}
    <div class="kf-mitte">${mitte || stand(k)}</div>
    ${k.L.map(x => `<div class="kf-sp">${av(x)}${unter(x, false)}</div>`).join('')}
  </div>`;
const titel = t => `<em class="kf-k-t">${t}</em>`;

const KOPF = {
  // Die Anzeigetafel: der Endstand auf Klappziffern, daneben die Paare mit
  // dem, was die Partie ihnen an Elo brachte.
  tafel:k => `<div class="kf-tafel">
      <div class="kf-tf-s w">${paar(k.W)}<span class="num">${k.W.map(x => vz(k.delta[x])).join(' ')}</span></div>
      <div class="kf-tf-z"><span class="kf-flap w"><b>${k.hoch}</b></span><i></i><span class="kf-flap"><b>${k.tief}</b></span></div>
      <div class="kf-tf-s">${paar(k.L)}<span class="num">${k.L.map(x => vz(k.delta[x])).join(' ')}</span></div>
    </div>`,
  // Torpucks: jedes Tor ein Puck, die fehlenden als leere Ringe.
  pucks:k => {
    const reihe = (n, w) => Array.from({length:10}, (_, i) => `<i class="${i < n ? (w ? 'w' : 'l') : ''}"></i>`).join('');
    return `<div class="kf-pucks">
      <div class="kf-pk-z w">${paar(k.W)}<span class="kf-pk-r">${reihe(k.hoch, true)}</span><b class="num">${k.hoch}</b></div>
      <div class="kf-pk-z">${paar(k.L)}<span class="kf-pk-r">${reihe(k.tief, false)}<u style="--von:${k.tief};--bis:10"></u></span><b class="num">${k.tief}</b></div>
    </div>`;
  },
  // Kantersieg: die Pucks mit dem Abstand als Stempel.
  kantersieg:k => KOPF.pucks(k).replace('<div class="kf-pucks">', `<div class="kf-pucks kanter"><span class="kf-stempel num">+${k.hoch - k.tief}</span>`),
  // Elo-Strom: was von den Verlierern zu den Siegern floss, als Ströme,
  // so breit wie die Punkte.
  strom:k => {
    const id = 'kfs' + (uid++), W = 240, Hh = 98, y = [17, 67];
    const breit = x => Math.max(2.5, Math.min(10, Math.abs(k.delta[x]) / 2.2));
    const pfad = (i, j) => `M${W - 32} ${y[j]}C${W / 2 + 16} ${y[j]},${W / 2 - 16} ${y[i]},32 ${y[i]}`;
    const stroeme = k.L.map((l, j) => k.W.map((w, i) => `<path class="kf-st-p" d="${pfad(i, j)}" stroke="url(#${id})" stroke-width="${breit(l).toFixed(1)}"/>`).join('')).join('');
    const sp = (x, i, w) => `<span class="kf-st-a${w ? ' w' : ''}" style="top:${y[i] - 15}px;${w ? 'left' : 'right'}:2px">${av(x)}<b class="num">${vz(k.delta[x])}</b></span>`;
    return `<div class="kf-strom"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="1" x2="0" y1="0" y2="0">
        <stop offset="0" stop-color="#f0566a"/><stop offset=".5" stop-color="#f7cf4a"/><stop offset="1" stop-color="#BEF264"/></linearGradient></defs>${stroeme}</svg>
      ${k.W.map((x, i) => sp(x, i, true)).join('')}${k.L.map((x, j) => sp(x, j, false)).join('')}
      <span class="kf-st-m">${stand(k)}</span></div>`;
  },
  // Rechnung gegen Ergebnis: die Siegchance vor dem Anstoß gegen den Anteil
  // der Tore. Liegen beide nah, lief es nach Rechnung.
  erwartung:k => {
    const t = prozent(k.hoch, k.hoch + k.tief), c = k.chance, d = t - c;
    const urteil = Math.abs(d) <= 5 ? 'genau nach Rechnung' : d > 0 ? 'deutlicher als gerechnet' : 'knapper als gerechnet';
    const balken = (wert, lab) => `<div class="kf-ew-z"><small>${lab}</small><span class="kf-ew-b"><i style="width:${wert}%"></i></span><b class="num">${wert} %</b></div>`;
    return `<div class="kf-erw">
      <div class="kf-ew-k">${paar(k.W, 'w')}${stand(k)}${paar(k.L)}</div>
      ${balken(c, 'Siegchance')}${balken(t, 'Anteil Tore')}
      <em class="kf-ew-u ${Math.abs(d) <= 5 ? '' : d > 0 ? 'plus' : 'minus'}">${urteil}</em></div>`;
  },
  // Serie gegen Serie: unter jedem Gesicht die Serie davor, bei den Siegern
  // der nächste Schritt, bei den Verlierern ihr Ende.
  serien:k => titel('Serien vor der Partie') + vier(k, (x, sieg) => {
    const s = k.vor[x].serie;
    if(!s) return `<span class="kf-fl aus">–</span>`;
    if(s > 0) return sieg ? `<span class="kf-fl">${flamme}<b class="num">${s}</b><i>→ ${s + 1}</i></span>`
      : `<span class="kf-fl riss">${flamme}<b class="num">${s}</b><i>endet</i></span>`;
    return sieg ? `<span class="kf-fl eis wende">${eis}<b class="num">${-s}</b><i>vorbei</i></span>`
      : `<span class="kf-fl eis">${eis}<b class="num">${-s}</b><i>→ ${-s + 1}</i></span>`;
  }),
  // Gegen die Form: die letzten fünf jedes Spielers.
  form:k => {
    const f = x => k.vor[x].letzte.reduce((a, c) => a + c, 0);
    return titel(`<span>Die letzten fünf</span><span>Siege <span class="num">${k.W.reduce((a, x) => a + f(x), 0)}:${k.L.reduce((a, x) => a + f(x), 0)}</span></span>`)
      + vier(k, x => `<span class="kf-pkt">${k.vor[x].letzte.map(r => `<i class="${r ? 's' : 'n'}"></i>`).join('')}</span>`);
  },
  // Der Tag bis hierher, die heutige Partie als letzter Punkt.
  tag:k => titel('Heute bis hierher') + vier(k, (x, sieg) =>
    `<span class="kf-pkt">${k.vor[x].tag.folge.slice(-6).map(r => `<i class="${r ? 's' : 'n'}"></i>`).join('')}<i class="${sieg ? 's' : 'n'} jetzt"></i></span>`
    + `<small class="num">${k.nach[x].tag.s}:${k.nach[x].tag.n - k.nach[x].tag.s}</small>`),
  // Die vier Einzelduelle vorher.
  kreuz:k => {
    const zelle = (w, l) => { const c = k.kreuz.find(q => q.w === w && q.l === l) || {s:0, n:0};
      return `<span class="kf-kz ${c.s * 2 < c.n ? 'n' : c.s * 2 > c.n ? 's' : ''}"><b class="num">${c.s}:${c.n - c.s}</b></span>`; };
    const s = k.kreuz.reduce((a, c) => a + c.s, 0), n = k.kreuz.reduce((a, c) => a + c.n, 0);
    return `<div class="kf-kreuz"><div class="kf-kz-m"><span></span>${k.L.map(x => av(x)).join('')}
        ${k.W.map(w => `${av(w)}${k.L.map(l => zelle(w, l)).join('')}`).join('')}</div>
      <div class="kf-kz-r">${stand(k)}<small>vorher <b class="num">${s}:${n - s}</b> in den Einzelduellen</small></div></div>`;
  },
  // Tabellenduell: die Tabelle nach der Partie als Leiste, die Sieger
  // darüber, die Verlierer darunter, mit dem Weg von vorher.
  rang:k => {
    const n = Math.max(k.tabelle, ...Object.values(k.platz)), X = r => 12 + (r - 1) * 216 / Math.max(1, n - 1);
    const pfeil = x => { const a = k.platzVor[x], c = k.platz[x]; return a && a !== c ? `<u class="${c < a ? 'auf' : 'ab'}" style="left:${Math.min(X(a), X(c))}px;width:${Math.abs(X(a) - X(c))}px"></u>` : ''; };
    return `<div class="kf-k-t"><span>Tabelle danach</span>${stand(k)}</div><div class="kf-rang">
      <div class="kf-rg-o">${k.W.map(x => `<span class="kf-rg-a w" style="left:${X(k.platz[x])}px">${av(x)}<b class="num">${k.platz[x]}.</b></span>`).join('')}</div>
      <div class="kf-rg-l">${Array.from({length:n}, (_, i) => `<i style="left:${X(i + 1)}px" class="${i < 3 ? 'top' : ''}"></i>`).join('')}${k.W.concat(k.L).map(pfeil).join('')}</div>
      <div class="kf-rg-u">${k.L.map(x => `<span class="kf-rg-a" style="left:${X(k.platz[x])}px"><b class="num">${k.platz[x]}.</b>${av(x)}</span>`).join('')}</div></div>`;
  },
  // Duo gegen Duo: jedes Paar in einem Ring aus seiner gemeinsamen Bilanz.
  duo:k => {
    const ring = (d, ids, w) => { const q = d.n ? d.s / d.n : 0, U = 2 * Math.PI * 25;
      return `<span class="kf-duo-r${w ? ' w' : ''}"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" class="kf-dr-g"/>
        <circle cx="30" cy="30" r="25" class="kf-dr-s" stroke-dasharray="${(q * U).toFixed(1)} ${U.toFixed(1)}"/></svg>${paar(ids)}
        <small class="num">${d.s}:${d.n - d.s} zusammen</small></span>`; };
    return `<div class="kf-duo">${ring(k.duo.W, k.W, true)}${stand(k)}${ring(k.duo.L, k.L, false)}</div>`;
  },
  // Fotofinish: zwei Bahnen bis zur Zielflagge, die eine erreicht sie, die
  // andere steht ein Tor davor.
  fotofinish:k => `<div class="kf-ziel">${titel('Fotofinish')}
      ${[[k.W, k.hoch, true], [k.L, k.tief, false]].map(([ids, n, w]) => `<div class="kf-bahn${w ? ' w' : ''}">${paar(ids)}
        <span class="kf-b-b"><i style="width:${n * 10}%"></i></span><b class="num">${n}</b></div>`).join('')}
      <span class="kf-flagge"></span></div>`,
  // Zu null: der Kasten der Verlierer bleibt leer.
  zunull:k => `<div class="kf-null">
      <div class="kf-nl-s w">${paar(k.W)}<b class="num">${k.hoch}</b></div>
      <svg class="kf-tor" viewBox="0 0 64 44" aria-hidden="true"><path d="M4 42V6h56v36" class="kf-tor-r"/>
        <path d="M10 12h44M10 20h44M10 28h44M10 36h44M16 6v36M26 6v36M38 6v36M48 6v36" class="kf-tor-n"/><text x="32" y="30" class="kf-tor-z">0</text></svg>
      <div class="kf-nl-s aus">${paar(k.L)}</div>
      <em class="kf-nl-t">zu null</em></div>`,
  // Außenseiter: die Paare auf Säulen aus ihrem Elo; die kleinere gewinnt.
  aussenseiter:k => {
    const e = ids => ids.reduce((a, x) => a + k.eloVor[x], 0) / ids.length;
    const ew = e(k.W), el = e(k.L), lo = Math.min(ew, el) - 40, hi = Math.max(ew, el);
    const h = v => Math.round(26 + (v - lo) / Math.max(1, hi - lo) * 40);
    return `<div class="kf-david">
      <span class="kf-dv-s w" style="--h:${h(ew)}px">${ic('crown')}${paar(k.W)}<i></i><small class="num">Ø ${Math.round(ew)} Elo</small></span>
      <span class="kf-dv-m">${stand(k)}<small class="num">${k.chance} % Siegchance</small></span>
      <span class="kf-dv-s" style="--h:${h(el)}px">${paar(k.L)}<i></i><small class="num">Ø ${Math.round(el)} Elo</small></span></div>`;
  },
};
const KOPF_NAME = {tafel:'Anzeigetafel', pucks:'Torpucks', strom:'Elo-Strom', erwartung:'Rechnung gegen Ergebnis',
  serien:'Serie gegen Serie', form:'Gegen die Form', tag:'Heute bis hierher', kreuz:'Kreuzduelle', rang:'Tabellenduell',
  duo:'Duo gegen Duo', fotofinish:'Fotofinish', zunull:'Zu null', aussenseiter:'David gegen Goliath', kantersieg:'Kantersieg'};

// ── Die Füße ────────────────────────────────────────────────────────
const fkopf = (icon, label, wert) => `<div class="kf-f-k"><i>${ic(icon)}</i><span>${label}</span>${wert != null ? `<b class="num">${wert}</b>` : ''}</div>`;
const satz = s => `<div class="kf-satz">${s}</div>`;
const linie = (v, o) => {
  const W = 259, H0 = o.h || 58, lo = Math.min(...v, o.lo != null ? o.lo : Infinity), hi = Math.max(...v, o.hi != null ? o.hi : -Infinity);
  const X = i => 5 + i * (W - 10) / Math.max(1, v.length - 1), Y = y => 5 + (hi - y) * (H0 - 10) / Math.max(1, hi - lo);
  return {W, H0, X, Y, d:v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('')};
};
const dominos = (f, letzt) => `<span class="kf-dom">${f.map((r, i) => `<i class="${r ? 's' : 'n'}${letzt && i === f.length - 1 ? ' jetzt' : ''}"></i>`).join('')}</span>`;
const balkenListe = (l, wert, label, hervor, krone) => {
  const max = Math.max(1, ...l.map(wert));
  return `<div class="kf-bl">${l.map((x, i) => `<div class="kf-bl-z${x.pid === hervor ? ' an' : ''}">${av(x.pid)}<span>${esc(nm(x.pid))}</span>
    <span class="kf-bl-b"><i style="width:${Math.round(wert(x) / max * 100)}%"></i></span><b class="num">${label(x)}</b>${i === 0 && krone ? `<em>${ic(krone)}</em>` : ''}</div>`).join('')}</div>`;
};
const FUSS = {
  riss:(k, x) => fkopf('flameBreak', 'Serie gerissen', x.n) + `<div class="kf-kette">${av(x.pid)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:Math.min(x.n > 10 ? 9 : 10, x.n)}, () => `<i>${flamme}</i>`).join('')}<u></u></div>`
    + satz(`${b(nm(x.pid))} hatte ${x.n} Siege in Folge, ${b(und(k.W))} beenden die Serie.`),
  spitze:(k, x) => fkopf('crown', x.vorher ? 'Neue Spitze' : 'Spitze in Reichweite', x.vorher ? '1.' : vz(x.liste[0].elo - (x.liste.find(q => q.id === x.pid) || {elo:0}).elo).replace('−', '') + ' Elo')
    + balkenListe(x.liste.map(q => ({pid:q.id, elo:q.elo})), q => q.elo - x.liste[x.liste.length - 1].elo + 10, q => q.elo, x.pid, 'crown')
    + satz(x.vorher ? `${b(nm(x.pid))} löst ${b(nm(x.vorher))} an der Spitze ab.` : `${b(nm(x.pid))} liegt noch ${x.liste[0].elo - (x.liste.find(q => q.id === x.pid) || {}).elo} Elo hinter ${b(nm(x.liste[0].id))}.`),
  rangsprung:(k, x) => {
    const n = Math.max(x.vor, 8), X = r => 14 + (r - 1) * 212 / Math.max(1, n - 1), m = (X(x.vor) + X(x.nach)) / 2;
    return fkopf('stepsUp', 'Tabellensprung', `${x.vor}. → ${x.nach}.`) + `<div class="kf-treppe"><svg viewBox="0 0 240 58" aria-hidden="true">
      <line x1="${X(1)}" x2="${X(n)}" y1="40" y2="40" class="kf-tp-l"/>
      ${Array.from({length:n}, (_, i) => `<line x1="${X(i + 1)}" x2="${X(i + 1)}" y1="36" y2="44" class="kf-tp-l${i + 1 === x.nach ? ' an' : ''}"/>
        <text x="${X(i + 1)}" y="55" class="kf-tp-t${i + 1 === x.nach ? ' an' : ''}">${i + 1}</text>`).join('')}
      <path d="M${X(x.vor)} 34Q${m} ${-6},${X(x.nach) + 4} 26" class="kf-tp-p"/><circle cx="${X(x.vor)}" cy="40" r="5" class="kf-tp-a"/></svg>
      <span class="kf-tp-av" style="left:${X(x.nach) - 11}px">${av(x.pid)}</span></div>`
      + satz(`${b(nm(x.pid))} springt mit dem Sieg von Platz ${x.vor} auf Platz ${x.nach}.`);
  },
  zaehlwerk:(k, x) => fkopf('hundred', x.art === 'sieg' ? 'Siege' : 'Partien', null)
    + `<div class="kf-zw">${av(x.pid)}<span class="kf-zw-z">${String(x.wert).split('').map(d => `<span class="kf-flap w"><b>${d}</b></span>`).join('')}</span>
      <small>${x.art === 'sieg' ? 'Siege' : 'Partien'}</small></div>`
    + satz(x.art === 'sieg' ? `${b(nm(x.pid))} gewinnt zum ${x.wert}. Mal, in ${x.n} Partien.` : `${b(nm(x.pid))} bestreitet die ${x.wert}. Partie, ${x.s} davon gewonnen.`),
  marke:(k, x) => { const U = 2 * Math.PI * 22, q = x.s / x.ziel;
    return fkopf('target', 'Kurz vor der Marke', `${x.s} / ${x.ziel}`) + `<div class="kf-marke"><span class="kf-mk-r"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" class="kf-dr-g"/>
      <circle cx="27" cy="27" r="22" class="kf-mk-s" stroke-dasharray="${(q * U).toFixed(1)} ${U.toFixed(1)}"/></svg>${av(x.pid)}</span>
      <span class="kf-mk-t"><b class="num">noch 1</b><small>Sieg bis zum ${x.ziel}.</small></span></div>`
      + satz(`${b(nm(x.pid))} steht bei ${x.s} Siegen. Der nächste ist der ${x.ziel}.`); },
  fluch:(k, x) => fkopf('bannbruch', 'Fluch gebrochen', `nach ${x.n}`) + `<div class="kf-duell">${av(x.w)}${dominos(x.folge, true)}${av(x.l)}</div>`
    + satz(`${b(nm(x.w))} verlor die letzten ${x.n} Duelle gegen ${b(nm(x.l))}. Jetzt nicht mehr.`),
  kippt:(k, x) => { const q = x.s / x.n;
    return fkopf('scaleBalance', 'Bilanz gekippt', `${x.s}:${x.n - x.s}`) + `<div class="kf-waage">${av(x.w)}<span class="kf-wg-b"><i style="width:${Math.round(q * 100)}%"></i><u></u></span>${av(x.l)}</div>`
      + satz(`${b(nm(x.w))} führt jetzt gegen ${b(nm(x.l))}, ${x.s} von ${x.n} Duellen gewonnen.`); },
  jubilaeum:(k, x) => fkopf(x.art === 'duo' ? 'handshake' : 'crossedSwords', x.art === 'duo' ? 'Gemeinsame Partien' : 'Duelle', `${x.n}.`)
    + `<div class="kf-jub">${av(x.ids[0])}<span class="kf-jub-m num">${x.n}</span>${av(x.ids[1])}</div>`
    + satz(x.art === 'duo' ? `${b(und(x.ids))} spielen zum ${x.n}. Mal zusammen, ${x.s} davon gewonnen.` : `${b(nm(x.ids[0]))} gegen ${b(nm(x.ids[1]))}: das ${x.n}. Duell, ${x.s}:${x.n - x.s}.`),
  westen:(k, x) => fkopf('weisseWeste', `Zu null im ${monat(x.sid)}`, x.n) + `<div class="kf-westen">${x.liste.map(w => `<span class="${w.mid === k.mid ? 'an' : ''}">${paar(w.W)}<b class="num">10:0</b>${paar(w.L, 'aus')}</span>`).join('')}</div>`
    + satz(`Das ${x.n}. Spiel zu null im ${monat(x.sid)}.`),
  tagesrennen:(k, x) => fkopf('dayKing', 'Rennen um den Tag', null) + balkenListe(x.liste, q => q.s, q => `${q.s}:${q.n - q.s}`, x.pid, 'crown')
    + satz(`${b(nm(x.pid))} führt den Tag mit ${x.liste[0].s} Siegen an.`),
  wochenrennen:(k, x) => fkopf('weekKing', 'Rennen um die Woche', null) + balkenListe(x.liste, q => q.q, q => q.q + ' %', x.pid, 'crown')
    + satz(`${b(nm(x.pid))} übernimmt die Woche: ${x.liste[0].s} von ${x.liste[0].n} gewonnen.`),
  serie:(k, x) => { const n = Math.min(x.n > 10 ? 9 : 10, x.n);
    return fkopf('flame', 'Siegesserie', x.n) + `<div class="kf-kette lauf">${av(x.pid)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:n}, (_, i) => `<i class="${i === n - 1 ? 'jetzt' : ''}">${flamme}</i>`).join('')}</div>`
    + satz(`${b(nm(x.pid))} gewinnt zum ${x.n}. Mal in Folge.`); },
  wende:(k, x) => fkopf('comeback', 'Wende', `nach ${x.n}`) + `<div class="kf-duell solo">${av(x.pid)}${dominos(x.folge, true)}</div>`
    + satz(`${b(nm(x.pid))} beendet ${x.n} Niederlagen in Folge.`),
  premiere:(k, x) => fkopf('premiere', 'Erstes gemeinsames Spiel', '1.') + `<div class="kf-jub prem">${av(x.ids[0])}<span class="kf-jub-m num">1.</span>${av(x.ids[1])}</div>`
    + satz(`${b(und(x.ids))} spielen zum ersten Mal zusammen und gewinnen.`),
  plus:(k, x) => { const v = x.verlauf, L = linie(v, {lo:0, hi:0}), n = v.length - 1, tief = Math.min(...v), id = 'kfp' + (uid++);
    return fkopf('comeback', 'Ins Plus gedreht', vz(v[n])) + `<svg class="kf-svg" viewBox="0 0 ${L.W} ${L.H0}"><clipPath id="${id}"><rect x="0" y="${L.Y(0)}" width="${L.W}" height="${L.H0}"/></clipPath>
      <path class="kf-fl-neg" clip-path="url(#${id})" d="${L.d}L${L.X(n)} ${L.Y(0)}L${L.X(0)} ${L.Y(0)}Z"/>
      <line class="kf-null-l" x1="5" x2="${L.W - 5}" y1="${L.Y(0)}" y2="${L.Y(0)}"/><path class="kf-li" d="${L.d}"/>
      <path class="kf-li pos" d="M${L.X(n - 1)} ${L.Y(v[n - 1])}L${L.X(n)} ${L.Y(v[n])}"/><circle class="kf-pkt-p" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/></svg>`
      + satz(`${b(nm(x.pid))} lag heute bei ${vz(tief)} Elo und steht nach der ${n}. Partie im Plus.`); },
  hoehe:(k, x) => { const v = x.verlauf, L = linie(v, {lo:0, hi:Math.max(55, ...v)}), n = v.length - 1;
    return fkopf('peak', 'Höhenmeter heute', vz(v[n])) + `<svg class="kf-svg" viewBox="0 0 ${L.W} ${L.H0}">
      <path class="kf-berg" d="${L.d}L${L.X(n)} ${L.H0}L${L.X(0)} ${L.H0}Z"/><line class="kf-null-l gold" x1="5" x2="${L.W - 5}" y1="${L.Y(50)}" y2="${L.Y(50)}"/>
      <path class="kf-li pos" d="${L.d}"/><path class="kf-fahne" d="M${L.X(n)} ${L.Y(v[n])}v-16l11 4-11 4"/></svg>`
      + satz(`${b(nm(x.pid))} steht heute nach ${n} Partien bei ${vz(v[n])} Elo.`); },
  sprung:(k, x) => { const v = x.verlauf, L = linie(v, {}), n = v.length - 1;
    return fkopf('rakete', 'Größter Sprung im Monat', vz(x.gewinn)) + `<svg class="kf-svg" viewBox="0 0 ${L.W} ${L.H0}"><path class="kf-li" d="${L.d}"/>
      <path class="kf-li gold dick" d="M${L.X(n - 1)} ${L.Y(v[n - 1])}L${L.X(n)} ${L.Y(v[n])}"/><circle class="kf-pkt-g" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/></svg>`
      + satz(`${b(nm(x.pid))} holt ${x.gewinn} Elo, so viel wie in keiner Partie des Monats.`); },
  halb:(k, x) => { const v = x.verlauf, L = linie(v, {lo:0, hi:100}), n = v.length - 1;
    return fkopf('scaleBalance', 'Wieder bei 50 %', v[n] + ' %') + `<svg class="kf-svg" viewBox="0 0 ${L.W} ${L.H0}"><line class="kf-null-l" x1="5" x2="${L.W - 5}" y1="${L.Y(50)}" y2="${L.Y(50)}"/>
      <path class="kf-li" d="${L.d}"/><circle class="kf-pkt-p" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/></svg>`
      + satz(`${b(nm(x.pid))} gewinnt im Monat wieder jede zweite Partie, nach ${x.n} Partien.`); },
  partner:(k, x) => fkopf('partnerHebel', 'Der beste Partner', null)
    + balkenListe(x.liste.map(q => Object.assign({}, q)), q => q.q, q => q.q + ' %', x.mit, null)
    + satz(`Mit ${b(nm(x.mit))} gewinnt ${b(nm(x.pid))} öfter als mit jedem anderen, sonst ${x.allg} %.`),
  kalender:(k, x) => { const [y, m] = x.sid.split('-').map(Number), tage = new Date(y, m, 0).getDate(), start = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const set = new Set(x.tage.map(t => +t.slice(8)));
    return fkopf('calendar', `Spieltage im ${monat(x.sid)}`, x.n) + `<div class="kf-kal">${av(x.pid)}<span class="kf-kal-g">${'<i class="leer"></i>'.repeat(start)}${Array.from({length:tage}, (_, i) =>
      `<i class="${set.has(i + 1) ? 's' : ''}${+k.tag.slice(8) === i + 1 ? ' jetzt' : ''}"></i>`).join('')}</span></div>`
      + satz(`${b(nm(x.pid))} spielt am ${x.n}. Tag im ${monat(x.sid)}.`); },
  // Ein besonderer Ausgang, dessen Kopf eben schon stand, rückt in den Fuß.
  fotofinish:k => fkopf('thriller', 'Ein Tor', '10:9') + `<div class="kf-ziel klein">${[[k.W, k.hoch, true], [k.L, k.tief, false]].map(([ids, n, w]) =>
    `<div class="kf-bahn${w ? ' w' : ''}">${paar(ids)}<span class="kf-b-b"><i style="width:${n * 10}%"></i></span><b class="num">${n}</b></div>`).join('')}<span class="kf-flagge"></span></div>`
    + satz(`Ein Tor trennt ${b(und(k.W))} und ${b(und(k.L))}.`),
  kanter:k => fkopf('hundred', 'Kantersieg', '+' + (k.hoch - k.tief)) + KOPF.pucks(k) + satz(`${k.hoch - k.tief} Tore Abstand.`),
  aussenseiter:k => fkopf('underdog', 'Gegen die Rechnung', k.chance + ' %') + satz(`${b(und(k.W))} gewinnen mit ${k.chance} % Siegchance.`),
  zunull:k => fkopf('weisseWeste', 'Zu null', '10:0') + satz(`${b(und(k.L))} bleiben ohne Tor.`),
};
const FUSS_NAME = {riss:'Serie gerissen', spitze:'Spitze', rangsprung:'Tabellensprung', zaehlwerk:'Zählwerk', marke:'Kurz vor der Marke',
  fluch:'Fluch gebrochen', kippt:'Bilanz gekippt', jubilaeum:'Jubiläum', westen:'Zu null im Monat', tagesrennen:'Rennen um den Tag',
  wochenrennen:'Rennen um die Woche', serie:'Siegesserie', wende:'Wende', premiere:'Erstes gemeinsames Spiel', plus:'Ins Plus gedreht',
  hoehe:'Höhenmeter', sprung:'Größter Sprung', halb:'Wieder bei 50 %', partner:'Der beste Partner', kalender:'Spieltage im Monat',
  fotofinish:'Ein Tor (aus dem Kopf)', kanter:'Kantersieg (aus dem Kopf)', aussenseiter:'Gegen die Rechnung (aus dem Kopf)', zunull:'Zu null (aus dem Kopf)'};

// ── Die Schlagzeile ─────────────────────────────────────────────────
// Ein Ereignis des Fußes ist die Nachricht; sonst sagt der Kopf, wie die
// Partie ausging.
function schlagzeile(k){
  const x = k.fussX || {}, W = und(k.W), L = und(k.L);
  const f = {
    riss:() => `${W} beenden die Serie von ${nm(x.pid)}`,
    spitze:() => x.vorher ? `${nm(x.pid)} übernimmt die Spitze` : `${nm(x.pid)} rückt an die Spitze heran`,
    rangsprung:() => `${nm(x.pid)} springt auf Platz ${x.nach}`,
    zaehlwerk:() => x.art === 'sieg' ? `${x.wert}. Sieg für ${nm(x.pid)}` : `${x.wert}. Partie für ${nm(x.pid)}`,
    fluch:() => `${nm(x.w)} bricht den Fluch gegen ${nm(x.l)}`,
    kippt:() => `${nm(x.w)} dreht die Bilanz gegen ${nm(x.l)}`,
    jubilaeum:() => x.art === 'duo' ? `${und(x.ids)} spielen zum ${x.n}. Mal zusammen` : `${nm(x.ids[0])} gegen ${nm(x.ids[1])}, das ${x.n}. Duell`,
    westen:() => `${W} gewinnen zu null`,
    tagesrennen:() => `${nm(x.pid)} führt den Tag an`,
    wochenrennen:() => `${nm(x.pid)} übernimmt die Woche`,
    serie:() => `${nm(x.pid)} gewinnt zum ${x.n}. Mal in Folge`,
    wende:() => `${nm(x.pid)} beendet ${x.n} Pleiten in Folge`,
    premiere:() => `${W} gewinnen zum ersten Mal zusammen`,
    plus:() => `${nm(x.pid)} dreht den Tag ins Plus`,
    hoehe:() => `${nm(x.pid)} steht heute bei ${vz(x.verlauf[x.verlauf.length - 1])} Elo`,
  }[k.fuss];
  if(f) return f();
  return {fotofinish:`${W} retten das 10:9`, zunull:`${W} gewinnen zu null`, aussenseiter:`${W} stürzen die Favoriten`,
    kantersieg:`${W} siegen ${k.hoch}:${k.tief}`}[k.kopf] || `${W} setzen sich gegen ${L} durch`;
}

const karte = k => `<div class="nf-card nf-s-spiel nfc-highlight kf-karte">
    <div class="nf-top"><span class="nf-rub"><i>${ic('spielfeld')}</i><b>AM SPIELTAG</b></span><span class="nf-when">${ic('clock')}${uhr(k.t)}</span></div>
    <div class="kf-kopf kf-k-${k.kopf}">${KOPF[k.kopf](k)}${namen(k)}</div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(schlagzeile(k))}</div></div><span class="nf-chev">${ic('chevron')}</span></div>
    ${k.fuss && FUSS[k.fuss] ? `<div class="kf-fuss kf-f-${k.fuss}">${FUSS[k.fuss](k, k.fussX || {})}</div>` : ''}
  </div>`;
const bild = (k, unter) => `<figure class="kf-bsp"><div class="nf-wrap nf-liste"><div class="nf-feed">${karte(k)}</div></div>
    <figcaption>${esc(datum(k.t))}, ${uhr(k.t)} · Kopf ${esc(KOPF_NAME[k.kopf])} · ${k.fuss ? 'Fuß ' + esc(FUSS_NAME[k.fuss]) : 'ohne Fuß'}${unter ? ' · ' + unter : ''}</figcaption></figure>`;

// ── Die Regeln ──────────────────────────────────────────────────────
const KOEPFE = [
  ['Grundansichten', 'Jede trifft auf jede Partie zu und sagt so viel wie die anderen; sie wechseln sich ab, die am längsten nicht dran war, kommt.', [
    ['tafel', 'Der Endstand auf Klappziffern wie an einer Anzeigetafel, die Sieger leuchten; neben jedem Paar, was die Partie ihm an Elo brachte.', 'immer'],
    ['pucks', 'Jedes Tor ein Puck, zehn Plätze je Reihe: die Sieger voll, die Verlierer mit ihren Toren und den fehlenden als leere Ringe. Der Abstand ist zu sehen, ohne zu rechnen.', 'immer'],
    ['strom', 'Was die Verlierer abgeben, fließt als Strom zu den Siegern, so breit wie die Punkte; die Ziffer steht an jedem Gesicht.', 'immer'],
    ['erwartung', 'Die Siegchance vor dem Anstoß gegen den Anteil der Tore danach, darunter das Urteil: genau nach Rechnung, deutlicher oder knapper.', 'Siegchance zwischen 35 und 65 %']]],
  ['Besondere Ausgänge', 'Sie sind selbst die Geschichte und tragen den Kopf, außer derselbe stand auf einer der Karten davor (bei 10:9 und Kantersieg drei, sonst zwei): dann rückt der Ausgang in den Fuß.', [
    ['fotofinish', 'Zwei Bahnen bis zur Zielflagge: die Sieger erreichen sie, die Verlierer stehen ein Tor davor.', '10:9'],
    ['zunull', 'Der Kasten der Verlierer bleibt leer, ihre Gesichter blass.', '10:0'],
    ['aussenseiter', 'Die Paare auf Säulen aus ihrem Elo; die kleinere trägt die Krone, darunter die Siegchance.', 'Siegchance unter 35 %'],
    ['kantersieg', 'Die Pucks mit dem Abstand als Stempel.', 'mindestens sieben Tore Abstand']]],
  ['Befunde', 'Sie zeigen, was die vier mitbrachten. Sie kommen, wenn ihr Gewicht nach dem Abklingen noch 34 erreicht.', [
    ['serien', 'Unter jedem Gesicht die Serie vor der Partie, Flamme oder Eis: bei den Siegern der nächste Schritt, bei den Verlierern ihr Ende.', 'eine Serie ab 3 auf der einen und ab 2 auf der anderen Seite, oder eine ab 5'],
    ['form', 'Die letzten fünf jedes Spielers als Punkte, oben die Siege beider Paare.', 'die Verlierer kamen mit mindestens drei Siegen mehr aus ihren letzten fünf'],
    ['tag', 'Wie der Tag für jeden lief, die heutige Partie als letzter Punkt, darunter die Bilanz des Tages.', 'alle vier ab ihrer dritten Partie des Tages'],
    ['kreuz', 'Die vier Einzelduelle vorher als Tafel, rot, wo der Sieger hinten lag.', 'mindestens zwölf Einzelduelle, von denen die Sieger höchstens 40 % gewannen'],
    ['rang', 'Die Tabelle nach der Partie als Leiste, die Sieger darüber, die Verlierer darunter, der Weg von vorher als Strich.', 'belastbare Tabelle, einer der ersten zwei dabei, mindestens vier Plätze Abstand'],
    ['duo', 'Jedes Paar in einem Ring aus seiner gemeinsamen Bilanz.', 'beide Paare haben mindestens sechsmal zusammen gespielt']]],
];
const FUESSE = [
  ['Ereignisse', 'Sie geschehen einmal und gehen vor.', [
    ['spitze', 'Neue Spitze oder Spitze in Reichweite: die ersten fünf mit ihrem Elo, die Krone an Platz 1.', 'ein Sieger übernimmt Platz 1, oder steht danach auf 2 oder 3, höchstens 12 Elo dahinter'],
    ['riss', 'Die Flammen der Serie als Kette, das letzte Glied gerissen.', 'ein Verlierer hatte mindestens fünf Siege in Folge'],
    ['fluch', 'Die letzten Duelle als Dominos, rot bis auf den letzten.', 'der Sieger verlor die letzten fünf oder mehr Duelle gegen einen der Verlierer'],
    ['kippt', 'Die Bilanz zweier als Waage, die über die Mitte kippt.', 'ab 16 Duellen führt der Sieger mit diesem Sieg zum ersten Mal'],
    ['rangsprung', 'Die Tabelle als Treppe, der Sprung als Bogen.', 'belastbare Tabelle, mindestens zwei Plätze nach oben'],
    ['zaehlwerk', 'Die Zahl auf Klappziffern.', 'der 50., 100., 150. … Sieg oder die 50., 100. … Partie'],
    ['jubilaeum', 'Zwei Gesichter um eine runde Zahl.', 'die 25., 50., 75. … gemeinsame Partie eines Paars oder das 25., 50. … Duell zweier'],
    ['westen', 'Alle Spiele zu null des Monats als Kacheln, das heutige hell.', '10:0'],
    ['tagesrennen', 'Die Siege des Tages je Spieler, die Krone am Führenden.', 'ein Sieger führt den Tag allein an, mit mindestens drei Siegen, und vorher führte ein anderer'],
    ['wochenrennen', 'Die Siegquote der Woche ab fünf Siegen.', 'ein Sieger übernimmt die Führung der Woche']]],
  ['Zustände', 'Sie gelten über viele Partien und treten zurück, wenn sie eben schon standen.', [
    ['serie', 'Die Flammen der laufenden Serie, die jüngste hell.', 'ein Sieger gewinnt mindestens zum dritten Mal in Folge'],
    ['wende', 'Die letzten zehn als Dominos, die Pleiten und der Sieg danach.', 'ein Sieger verlor davor mindestens dreimal in Folge'],
    ['plus', 'Das Elo des Tages, unter null rot, die Partie, die ins Plus dreht.', 'ab der vierten Partie des Tages, nach einem Tief von mindestens −25'],
    ['hoehe', 'Das Elo des Tages als Berg über der Linie bei +50, mit Fahne.', 'ein Sieger kommt heute zum ersten Mal über +50'],
    ['sprung', 'Die Elo-Kurve des Monats, dieser Schritt in Gold.', 'ab der achten Partie im Monat der größte Gewinn, mindestens 22'],
    ['halb', 'Die Siegquote des Monats bis zur Linie bei 50 %.', 'ab der zehnten Partie im Monat erreicht sie 50 % von unten'],
    ['partner', 'Die Siegquote mit jedem Partner, der heutige hervorgehoben.', 'mit diesem Partner die beste Quote, mindestens acht Partien, jede vierte'],
    ['kalender', 'Der Monat als Kalender, die Spieltage gefüllt, heute umrandet.', 'der 8., 12., 16. oder 20. Spieltag im Monat'],
    ['marke', 'Ein Ring bis zur nächsten Marke.', 'nach dem Sieg fehlt einer bis zum 50., 100. … Sieg'],
    ['premiere', 'Zwei Gesichter um die 1.', 'das erste gemeinsame Spiel eines Paars, gewonnen']]],
];
const zahlText = (key, zahl, moeglich) => `<span class="kf-zahl num"><b>${zahl[key] || 0}</b> von ${N.partien}${moeglich[key] ? ` · zutreffend ${moeglich[key]}` : ''}</span>`;
const regelKopf = ([key, was, wann]) => `<article class="kf-regel">
    <h4>${esc(KOPF_NAME[key])}</h4><p>${esc(was)}</p><dl><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Im Lauf</dt><dd>${zahlText(key, N.kopfZahl, N.moeglichK)}</dd></dl>
    <div class="kf-bsp-l">${(N.bsp.kopf[key] || []).map(k => bild(k)).join('')}</div></article>`;
const regelFuss = ([key, was, wann]) => `<article class="kf-regel">
    <h4>${esc(FUSS_NAME[key])}</h4><p>${esc(was)}</p><dl><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Im Lauf</dt><dd>${zahlText(key, N.fussZahl, N.moeglichF)}</dd></dl>
    <div class="kf-bsp-l">${(N.bsp.fuss[key] || []).map(k => bild(k)).join('')}</div></article>`;

// ── Die Verteilung ──────────────────────────────────────────────────
const verteilung = (zahl, namen) => {
  const l = Object.keys(zahl).sort((a, c) => zahl[c] - zahl[a]), max = Math.max(...l.map(k => zahl[k]));
  return `<div class="kf-vt">${l.map(k => `<div class="kf-vt-z"><span>${esc(namen[k] || k)}</span><span class="kf-vt-b"><i style="width:${(zahl[k] / max * 100).toFixed(1)}%"></i></span>
    <b class="num">${zahl[k]}</b><small class="num">${z((zahl[k] / N.partien * 100).toFixed(1))} %</small></div>`).join('')}</div>`;
};

const kopfZahl = Object.keys(N.kopfZahl).length, fussZahl = Object.keys(N.fussZahl).length;
const maxK = Math.max(...Object.values(N.kopfZahl)), maxF = Math.max(...Object.values(N.fussZahl));
const seite = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Köpfe und Füße</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${appCss}</style>
<style>${fs.readFileSync(path.join(__dirname, 'kopf-fuss.css'), 'utf8')}</style>
</head><body class="kf-seite">
<header class="kf-held">
  <p class="kf-ober">Die Karte einer Partie · Entwürfe, zweite Runde</p>
  <h1>Köpfe und Füße</h1>
  <p class="kf-lead">Der Kopf zeigt immer alle vier Gesichter und den Endstand: auf einen Blick ist klar, dass hier eine Partie gespielt wurde und wer sie gewann. Was er dazu zeigt, wechselt. Der Fuß zeigt, was an dieser Partie besonders war. Gezeichnet aus den ${N.partien} echten Partien bis Oktober, gewählt mit der Regel unten.</p>
  <div class="kf-kennz">
    <span><b class="num">${kopfZahl}</b> Köpfe</span><span><b class="num">${fussZahl}</b> Füße</span>
    <span><b class="num">${z((maxK / N.partien * 100).toFixed(1))} %</b> höchster Anteil eines Kopfs</span>
    <span><b class="num">${N.kopfFolge.max === 1 ? 'nie' : N.kopfFolge.max + '×'}</b> derselbe Kopf hintereinander</span>
    <span><b class="num">${N.fussFolge.max === 1 ? 'nie' : N.fussFolge.max + '×'}</b> derselbe Fuß hintereinander</span>
  </div>
  <nav><a href="#tag">Ein Spieltag</a><a href="#koepfe">Die Köpfe</a><a href="#fuesse">Die Füße</a><a href="#wahl">Die Auswahl</a></nav>
</header>

<section id="tag" class="kf-abschnitt">
  <h2>Ein Spieltag am Stück</h2>
  <p class="kf-satz-l">${esc(datum(N.tag.karten[0].t))}: alle ${N.tag.karten.length} Partien des Tages in ihrer Reihenfolge, so, wie der Feed sie zeigen würde. Kein Kopf steht zweimal hintereinander, und jeder Fuß erzählt etwas anderes.</p>
  <div class="kf-reihe">${N.tag.karten.map(k => bild(k)).join('')}</div>
</section>

<section id="koepfe" class="kf-abschnitt">
  <h2>Die Köpfe</h2>
  ${KOEPFE.map(([g, satz, l]) => `<h3>${esc(g)}</h3><p class="kf-satz-l">${esc(satz)}</p><div class="kf-regeln">${l.map(regelKopf).join('')}</div>`).join('')}
</section>

<section id="fuesse" class="kf-abschnitt">
  <h2>Die Füße</h2>
  ${FUESSE.map(([g, satz, l]) => `<h3>${esc(g)}</h3><p class="kf-satz-l">${esc(satz)}</p><div class="kf-regeln">${l.map(regelFuss).join('')}</div>`).join('')}
</section>

<section id="wahl" class="kf-abschnitt">
  <h2>Die Auswahl</h2>
  <p class="kf-satz-l">Ein gutes Mittel statt immer dasselbe. Jede Zeichnung kommt, wenn sie etwas zu sagen hat, und tritt zurück, wenn sie eben schon stand.</p>
  <ul class="kf-liste">
    <li><b>Ein besonderer Ausgang zuerst.</b> 10:9, 10:0, ein Außenseitersieg und ein Kantersieg tragen den Kopf, außer derselbe stand auf einer der Karten davor; dann rückt er in den Fuß.</li>
    <li><b>Jeder Einsatz kostet.</b> −14, wenn die Zeichnung auf einer der letzten drei Karten stand, −3 für jede der letzten fünfzehn.</li>
    <li><b>Was zu selten kam, holt auf.</b> Liegt eine Zeichnung unter ihrem fairen Anteil der letzten vierzig Karten, zählt der Abstand mit.</li>
    <li><b>Nie zweimal hintereinander.</b> Weder Kopf noch Fuß, auch kein Spitzenwechsel; die Schlagzeile nennt ihn trotzdem.</li>
    <li><b>Höchstens zweimal am Tag.</b> Derselbe Fuß steht an einem Tag höchstens zweimal, ein Spitzenwechsel dreimal.</li>
    <li><b>Sonst die Grundansicht, die am längsten nicht dran war.</b> Anzeigetafel, Torpucks, Elo-Strom und Rechnung gegen Ergebnis wechseln reihum.</li>
    <li><b>Ein Fuß nur mit Anlass.</b> ${N.ohneFuss} von ${N.partien} Partien hatten keinen; dort steht keiner.</li>
  </ul>
  <div class="kf-zwei">
    <div><h3>Köpfe im Lauf</h3>${verteilung(N.kopfZahl, KOPF_NAME)}</div>
    <div><h3>Füße im Lauf</h3>${verteilung(N.fussZahl, FUSS_NAME)}</div>
  </div>
  <p class="kf-satz-l">In zehn Karten am Stück stand derselbe Kopf höchstens ${N.kopfFenster.max}-mal (${esc(KOPF_NAME[N.kopfFenster.wer])}), derselbe Fuß höchstens ${N.fussFenster.max}-mal (${esc(FUSS_NAME[N.fussFenster.wer])}).</p>
</section>
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'kopf-fuss.html'), seite);
if(process.argv[2]) fs.writeFileSync(process.argv[2], seite.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head><body class="kf-seite">/, '<div class="kf-seite">').replace(/<\/body><\/html>$/, '</div>'));
console.log('kopf-fuss.html · ' + Math.round(seite.length / 1024) + ' kB');
