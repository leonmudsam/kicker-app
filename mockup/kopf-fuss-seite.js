// Baut `kopf-fuss.html`: Köpfe und Füße der Karte einer Partie, dritte
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
// Welche Plätze einer Leiste ihre Zahl tragen: bis zwölf alle, darüber der
// erste, jeder fünfte und der letzte. Bei dreißig Plätzen lägen die Zahlen
// sonst acht Pixel auseinander und liefen ineinander.
const beschriftet = (r, n) => n <= 12 || r === 1 || r === n || (r % 5 === 0 && n - r >= 3);

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
  // Kantersieg: die Lücke der Verlierer ist der Abstand. Die fehlenden Tore
  // stehen als eine goldene Klammer mit der Zahl darin, wo sonst leere Ringe
  // stünden. Vorher lag ein Stempel schräg über den Pucks und verdeckte drei
  // davon.
  kantersieg:k => `<div class="kf-pucks kanter">
      <div class="kf-pk-z w">${paar(k.W)}<span class="kf-pk-r">${Array.from({length:10}, (_, i) => `<i class="${i < k.hoch ? 'w' : ''}"></i>`).join('')}</span><b class="num">${k.hoch}</b></div>
      <div class="kf-pk-z">${paar(k.L)}<span class="kf-pk-r">${'<i class="l"></i>'.repeat(k.tief)}<em class="kf-luecke" style="grid-column:span ${10 - k.tief}"><b class="num">+${k.hoch - k.tief}</b><small>Tore Abstand</small></em></span><b class="num">${k.tief}</b></div>
    </div>`,
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
  // Rechnung gegen Ergebnis: eine Skala von 0 bis 100 %, oben die
  // Siegchance vor dem Anstoß, unten der Anteil der Tore danach, dazwischen
  // der Abstand. Die zwei Beschriftungen stehen auf verschiedenen Seiten der
  // Skala und können sich deshalb nicht treffen; am Rand richten sie sich
  // nach innen aus, statt hinauszuragen.
  erwartung:k => {
    const t = prozent(k.hoch, k.hoch + k.tief), c = k.chance, d = t - c;
    const art = Math.abs(d) <= 5 ? 'gleich' : d > 0 ? 'plus' : 'minus';
    const urteil = {gleich:'genau nach Rechnung', plus:'deutlicher als gerechnet', minus:'knapper als gerechnet'}[art];
    const lab = (v, wo, text) => `<span class="kf-ew-l ${wo} ${v < 22 ? 'li' : v > 78 ? 're' : ''}" style="left:${v}%"><b class="num">${v}\u00a0%</b><small>${text}</small></span>`;
    return `<div class="kf-erw">
      <div class="kf-ew-k">${paar(k.W, 'w')}${stand(k)}${paar(k.L)}</div>
      <div class="kf-ew-s ${art}">${lab(c, 'o', 'Siegchance')}
        <div class="kf-ew-a"><i style="left:50%"></i>${art === 'gleich'
          // Bis fünf Punkte auseinander lagen die zwei Marken übereinander;
          // dann ist es eine, der Ring mit dem Punkt darin.
          ? `<em class="c t" style="left:${(c + t) / 2}%"></em>`
          : `<u style="left:${Math.min(c, t)}%;width:${Math.abs(d)}%"></u><em class="c" style="left:${c}%"></em><em class="t" style="left:${t}%"></em>`}</div>
        ${lab(t, 'u', 'Anteil Tore')}</div>
      <em class="kf-ew-u ${art}">${urteil}</em></div>`;
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
  // Gegen die Form: die letzten fünf jedes Spielers als Formkurve, jeder
  // Sieg ein Schritt nach oben, jede Niederlage einer nach unten; die Linie
  // in der Farbe, wohin sie am Ende zeigt. Darunter die Siege von fünf.
  form:k => {
    const f = x => k.vor[x].letzte.reduce((a, c) => a + c, 0);
    const kurve = x => { const l = k.vor[x].letzte; let s = 0;
      const pkt = [[0, 0]].concat(l.map((r, i) => [i + 1, s += r ? 1 : -1]));
      const X = i => 3 + i * 8, Y = v => (13 - v * 2.2).toFixed(1);
      return `<svg class="kf-fk ${s > 0 ? 'auf' : s < 0 ? 'ab' : ''}" viewBox="0 0 46 26" aria-hidden="true"><line x1="1" x2="45" y1="13" y2="13" class="kf-fk-0"/>
        <path d="${pkt.map(([i, v], j) => (j ? 'L' : 'M') + X(i) + ' ' + Y(v)).join('')}" class="kf-fk-l"/>${pkt.slice(1).map(([i, v], j) => `<circle cx="${X(i)}" cy="${Y(v)}" r="1.9" class="${l[j] ? 's' : 'n'}"/>`).join('')}</svg>`; };
    return titel(`<span>Die letzten fünf</span><span>Siege <span class="num">${k.W.reduce((a, x) => a + f(x), 0)}:${k.L.reduce((a, x) => a + f(x), 0)}</span></span>`)
      + vier(k, x => `${kurve(x)}<small class="num">${f(x)}/5</small>`);
  },
  // Tabellenduell: die vier Gesichter in ihren Spalten, unter jedem der
  // Platz danach und wie viele Plätze er gutmachte oder verlor; darunter die
  // Tabelle als Leiste, die vier als Marken, der Weg von vorher als Strich.
  // Die Gesichter standen vorher selbst auf der Leiste: zwei Nachbarn in der
  // Tabelle lagen 20 px auseinander, und die Gesichter sind 22 px breit.
  rang:k => {
    const n = Math.max(k.tabelle, ...Object.values(k.platz)), X = r => (r - 1) / Math.max(1, n - 1) * 100;
    const unter = x => { const a = k.platzVor[x], c = k.platz[x], d = a ? a - c : 0;
      return `<span class="kf-rg-p"><b class="num">${c}.</b>${!a ? '<i class="neu">neu</i>' : d > 0 ? `<i class="auf num">↑${d}</i>` : d < 0 ? `<i class="ab num">↓${-d}</i>` : '<i class="num">=</i>'}</span>`; };
    const marke = x => { const a = k.platzVor[x], c = k.platz[x], w = k.W.includes(x);
      return (a && a !== c ? `<u class="${c < a ? 'auf' : 'ab'}" style="left:${Math.min(X(a), X(c))}%;width:${Math.abs(X(a) - X(c))}%"></u>` : '')
        + `<em class="${w ? 'w' : ''}" style="left:${X(c)}%"></em>`; };
    return titel(`<span>Tabelle danach</span><span class="num">${n} Plätze</span>`) + vier(k, unter)
      + `<div class="kf-rg-l">${Array.from({length:n}, (_, i) => `<i style="left:${X(i + 1)}%" class="${i < 3 ? 'top' : ''}">${beschriftet(i + 1, n) ? `<small class="num">${i + 1}</small>` : ''}</i>`).join('')}${k.W.concat(k.L).map(marke).join('')}</div>`;
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
  // Außenseiter: die Paare auf Säulen aus ihrem Elo, die kleinere gewinnt;
  // in der Mitte ein Zeiger, wie viel Siegchance die Rechnung ihr gab.
  aussenseiter:k => {
    const e = ids => ids.reduce((a, x) => a + k.eloVor[x], 0) / ids.length;
    const ew = e(k.W), el = e(k.L), lo = Math.min(ew, el) - 40, hi = Math.max(ew, el);
    const h = v => Math.round(22 + (v - lo) / Math.max(1, hi - lo) * 34);
    const w = Math.PI * (1 - k.chance / 100), zx = (30 + 22 * Math.cos(w)).toFixed(1), zy = (29 - 22 * Math.sin(w)).toFixed(1);
    return `<div class="kf-david">
      <span class="kf-dv-s w" style="--h:${h(ew)}px">${ic('crown')}${paar(k.W)}<i></i><small class="num">Ø\u00a0${Math.round(ew)}</small></span>
      <span class="kf-dv-m">${stand(k)}<svg class="kf-gauge" viewBox="0 0 60 34" aria-hidden="true"><path d="M8 29A22 22 0 0 1 52 29" class="kf-gg-g"/>
        <path d="M8 29A22 22 0 0 1 ${zx} ${zy}" class="kf-gg-s"/><line x1="30" y1="29" x2="${zx}" y2="${zy}" class="kf-gg-z"/><circle cx="30" cy="29" r="2.6" class="kf-gg-m"/></svg>
        <small class="num">${k.chance}\u00a0% Siegchance</small></span>
      <span class="kf-dv-s" style="--h:${h(el)}px">${paar(k.L)}<i></i><small class="num">Ø\u00a0${Math.round(el)}</small></span></div>`;
  },
};
const KOPF_NAME = {tafel:'Anzeigetafel', pucks:'Torpucks', strom:'Elo-Strom', erwartung:'Rechnung gegen Ergebnis',
  serien:'Serie gegen Serie', form:'Gegen die Form', rang:'Tabellenduell',
  duo:'Duo gegen Duo', fotofinish:'Fotofinish', zunull:'Zu null', aussenseiter:'David gegen Goliath', kantersieg:'Kantersieg'};

// ── Die Füße ────────────────────────────────────────────────────────
const fkopf = (icon, label, wert) => `<div class="kf-f-k"><i>${ic(icon)}</i><span>${label}</span>${wert != null ? `<b class="num">${wert}</b>` : ''}</div>`;
// Eine Zahl bricht nie von ihrem Wort: „13" am Zeilenende und „Siege in
// Folge" darunter las sich wie zwei Angaben, ebenso „Platz" ohne seine Zahl.
// Nur diese Paare: jede Lücke vor und nach jeder Zahl zu schließen machte aus
// „Maxi, 69 von 137 Duellen" ein Stück, das nicht mehr umbrechen konnte.
const EINHEIT = /(\d[\d.,]*\.?) (?=(Siege?n?|Elo|Partien|Partie|Duell(en?)?|Tor(en?)?|Mal|Spiele?|Niederlagen|Plätze|Tage?n?|%)(?![\wäöüß]))/g;
const satz = s => `<div class="kf-satz">${s.replace(EINHEIT, '$1\u00a0').replace(/(Platz|zum|bei|nach|von|auf|um) (?=[+−-]?\d)/g, '$1\u00a0')}</div>`;
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
        ${beschriftet(i + 1, n) || i + 1 === x.nach || i + 1 === x.vor ? `<text x="${X(i + 1)}" y="55" class="kf-tp-t${i + 1 === x.nach ? ' an' : ''}">${i + 1}</text>` : ''}`).join('')}
      <path d="M${X(x.vor)} 34Q${m} ${-6},${X(x.nach) + 4} 26" class="kf-tp-p"/><circle cx="${X(x.vor)}" cy="40" r="5" class="kf-tp-a"/></svg>
      <span class="kf-tp-av" style="left:${X(x.nach) - 11}px">${av(x.pid)}</span></div>`
      + satz(`${b(nm(x.pid))} springt mit dem Sieg von Platz ${x.vor} auf Platz ${x.nach}.`);
  },
  // Das Zählwerk und darunter die Leiste der Marken: die erreichten
  // gefüllt, die heutige leuchtend, die nächste als Ring.
  zaehlwerk:(k, x) => { const M = [50, 100, 150, 200, 250, 300, 400, 500], bis = M.filter(m => m <= x.wert).slice(-5), nach = M.find(m => m > x.wert);
    return fkopf('hundred', x.art === 'sieg' ? 'Siege' : 'Partien', null)
    + `<div class="kf-zw">${av(x.pid)}<span class="kf-zw-z">${String(x.wert).split('').map(d => `<span class="kf-flap w"><b>${d}</b></span>`).join('')}</span>
      <small>${x.art === 'sieg' ? 'Siege' : 'Partien'}</small></div>
      <div class="kf-zw-l">${bis.concat(nach ? [nach] : []).map(m => `<span class="${m === x.wert ? 'jetzt' : m < x.wert ? 'da' : ''}"><i></i><small class="num">${m}</small></span>`).join('')}</div>`
    + satz(x.art === 'sieg' ? `${b(nm(x.pid))} gewinnt zum ${x.wert}. Mal, in ${x.n} Partien.` : `${b(nm(x.pid))} bestreitet die ${x.wert}. Partie, ${x.s} davon gewonnen.`); },
  fluch:(k, x) => fkopf('bannbruch', 'Fluch gebrochen', `nach ${x.n}`) + `<div class="kf-duell">${av(x.w)}${dominos(x.folge, true)}${av(x.l)}</div>`
    + satz(`${b(nm(x.w))} verlor die letzten ${x.n} Duelle gegen ${b(nm(x.l))}. Jetzt nicht mehr.`),
  // Bilanz gekippt: eine Wippe. Die Seite des Siegers liegt jetzt unten,
  // gestrichelt die Lage vor der Partie; wie weit sie kippt, folgt der
  // Bilanz, aber mindestens so weit, dass man es sieht.
  kippt:(k, x) => { const q = x.s / x.n, q0 = (x.s - 1) / (x.n - 1), grad = Math.PI / 180;
    // Breite der Karte 244 px: x in Prozent, y in Pixeln; die Seite des
    // Siegers (links) liegt unten, die alte Lage war höchstens waagrecht.
    const w = Math.min(13, Math.max(6, (q - .5) * 160)) * grad, w0 = -Math.min(13, Math.max(0, (.5 - q0) * 160)) * grad;
    const H = 80, M = 50, Y = 40, PX = 2.44, r = v => v.toFixed(1);
    const ende = (a, s) => [M + s * H * Math.cos(a) / PX, Y - s * H * Math.sin(a)];
    const [lx, ly] = ende(w, -1), [rx, ry] = ende(w, 1), [gx, gy] = ende(w0, -1), [hx, hy] = ende(w0, 1);
    return fkopf('scaleBalance', 'Bilanz gekippt', `${x.s}:${x.n - x.s}`) + `<div class="kf-wippe">
      <svg viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true"><line x1="${r(gx)}" y1="${r(gy)}" x2="${r(hx)}" y2="${r(hy)}" class="kf-wp-alt"/>
        <line x1="${r(lx)}" y1="${r(ly)}" x2="${r(rx)}" y2="${r(ry)}" class="kf-wp-b"/><path d="M${M} ${Y}l-6 14h12z" class="kf-wp-d"/></svg>
      <span class="kf-wp-a w" style="left:calc(${r(lx)}% - 11px);top:${r(ly - 23)}px">${av(x.w)}</span><b class="kf-wp-n w num" style="left:calc(${r(lx)}% - 40px);top:${r(ly - 19)}px">${x.s}</b>
      <span class="kf-wp-a" style="left:calc(${r(rx)}% - 11px);top:${r(ry - 23)}px">${av(x.l)}</span><b class="kf-wp-n num" style="left:calc(${r(rx)}% + 14px);top:${r(ry - 19)}px">${x.n - x.s}</b></div>`
      + satz(`${b(nm(x.w))} führt jetzt gegen ${b(nm(x.l))}, ${x.s} von ${x.n} Duellen gewonnen.`); },
  // Jubiläum: die runde Zahl in einem Ring aus der Bilanz, der Anteil des
  // Ersten hell; bei einem Paar, wie oft es zusammen gewann.
  jubilaeum:(k, x) => { const U = 2 * Math.PI * 24, q = x.s / x.n;
    return fkopf(x.art === 'duo' ? 'handshake' : 'crossedSwords', x.art === 'duo' ? 'Gemeinsame Partien' : 'Duelle', `${x.n}.`)
    + `<div class="kf-jub">${av(x.ids[0])}<span class="kf-jub-m"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24" class="kf-jb-g"/>
        <circle cx="28" cy="28" r="24" class="kf-jb-s" stroke-dasharray="${(q * U).toFixed(1)} ${U.toFixed(1)}"/></svg><b class="num">${x.n}</b></span>${av(x.ids[1])}</div>
      <div class="kf-jub-u num">${x.art === 'duo' ? `<span><b>${x.s}</b> gewonnen</span><span><b>${x.n - x.s}</b> verloren</span>` : `<span><b>${x.s}</b> Siege</span><span><b>${x.n - x.s}</b> Siege</span>`}</div>`
    + satz(x.art === 'duo' ? `${b(und(x.ids))} spielen zum ${x.n}. Mal zusammen, ${x.s} davon gewonnen.` : `${b(nm(x.ids[0]))} gegen ${b(nm(x.ids[1]))}: das ${x.n}. Duell, ${x.s}:${x.n - x.s}.`); },
  // Zu null im Monat: der Monat als Säulen, je Tag eine, jedes Spiel zu
  // null ein Stein darin, der heutige gold; ab dem fünften am selben Tag
  // steht die Zahl statt der Steine. Vorher stand jedes Spiel als Kachel mit
  // vier Gesichtern: bei sieben im Monat brach das in drei Reihen, und die
  // Gesichter waren zu klein für ihre Buchstaben. Punkte auf einem
  // Zeitstrahl lagen an zwei Tagen hintereinander übereinander.
  westen:(k, x) => { const [y, m] = x.sid.split('-').map(Number), tage = new Date(y, m, 0).getDate();
    const je = {}; x.liste.forEach(w => { const d = new Date(w.t).getDate(); (je[d] = je[d] || []).push(w.mid === k.mid); });
    return fkopf('weisseWeste', `Zu null im ${monat(x.sid)}`, x.n) + `<div class="kf-wt" style="--tage:${tage}">${Array.from({length:tage}, (_, i) => {
        const l = je[i + 1] || [], an = l.includes(true);
        return `<span class="${an ? 'an' : ''}">${l.length > 4 ? `<b class="num">${l.length}</b>` : l.map(h => `<i class="${h ? 'an' : ''}"></i>`).join('')}${[1, 8, 15, 22, tage].includes(i + 1) ? `<small class="num">${i + 1}.</small>` : ''}</span>`; }).join('')}</div>`
      + satz(`Das ${x.n}. Spiel zu null im ${monat(x.sid)}, ${b(und(k.W))} gewinnen 10:0.`); },
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
    return fkopf('calendar', `Spieltage im ${monat(x.sid)}`, x.n) + `<div class="kf-kal">${av(x.pid)}<span class="kf-kal-g">${['M', 'D', 'M', 'D', 'F', 'S', 'S'].map(w => `<small>${w}</small>`).join('')}${'<i class="leer"></i>'.repeat(start)}${Array.from({length:tage}, (_, i) =>
      `<i class="${set.has(i + 1) ? 's' : ''}${+k.tag.slice(8) === i + 1 ? ' jetzt' : ''}"></i>`).join('')}</span></div>`
      + satz(`${b(nm(x.pid))} spielt am ${x.n}. Tag im ${monat(x.sid)}.`); },
  // Ein besonderer Ausgang, dessen Kopf eben schon stand, rückt in den Fuß.
  fotofinish:k => fkopf('thriller', 'Ein Tor', '10:9') + `<div class="kf-ziel klein">${[[k.W, k.hoch, true], [k.L, k.tief, false]].map(([ids, n, w]) =>
    `<div class="kf-bahn${w ? ' w' : ''}">${paar(ids)}<span class="kf-b-b"><i style="width:${n * 10}%"></i></span><b class="num">${n}</b></div>`).join('')}<span class="kf-flagge"></span></div>`
    + satz(`Ein Tor trennt ${b(und(k.W))} und ${b(und(k.L))}.`),
  // Kantersieg im Fuß: nicht noch einmal die Pucks, die der Kopf als
  // Grundansicht schon zeigen kann, sondern die zehn Tore der Sieger als
  // Leiste: so viele, wie die Verlierer auch schossen, grau, der Abstand
  // gold.
  kanter:k => fkopf('hundred', 'Kantersieg', '+' + (k.hoch - k.tief)) + `<div class="kf-abst">${paar(k.W)}<span class="kf-ab-r">${Array.from({length:k.hoch}, (_, i) =>
      `<i class="${i < k.tief ? '' : 'a'}"></i>`).join('')}</span></div><div class="kf-ab-u num"><span>${k.tief} ${k.tief === 1 ? "Gegentor" : "Gegentore"}</span><span><b>+${k.hoch - k.tief}</b> Abstand</span></div>`
    + satz(`${b(und(k.W))} gewinnen mit ${k.hoch - k.tief} Toren Abstand.`),
  aussenseiter:k => fkopf('underdog', 'Gegen die Rechnung', k.chance + '\u00a0%') + `<div class="kf-ch">${paar(k.W)}<span class="kf-ch-b"><i style="width:${k.chance}%"></i><small class="num">${k.chance}\u00a0%</small><small class="num">${100 - k.chance}\u00a0%</small></span>${paar(k.L, 'aus')}</div>`
    + satz(`${b(und(k.W))} gewinnen mit ${k.chance} % Siegchance.`),
  zunull:k => fkopf('weisseWeste', 'Zu null', '10:0') + `<div class="kf-nl-f">${paar(k.W)}<b class="num">10</b><i>:</i><b class="num null">0</b>${paar(k.L, 'aus')}</div>` + satz(`${b(und(k.L))} bleiben ohne Tor.`),
};
const FUSS_NAME = {riss:'Serie gerissen', spitze:'Spitze', rangsprung:'Tabellensprung', zaehlwerk:'Zählwerk',
  fluch:'Fluch gebrochen', kippt:'Bilanz gekippt', jubilaeum:'Jubiläum', westen:'Zu null im Monat',
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
    ['erwartung', 'Eine Skala von 0 bis 100 %: oben die Siegchance vor dem Anstoß als Ring, unten der Anteil der Tore danach als Punkt, dazwischen der Abstand, darunter das Urteil. Liegen beide bis fünf Punkte beieinander, sind sie eine Marke: genau nach Rechnung.', 'Siegchance zwischen 35 und 65 %']]],
  ['Besondere Ausgänge', 'Sie sind selbst die Geschichte und tragen den Kopf, außer derselbe stand auf einer der Karten davor (bei 10:9 und Kantersieg drei, sonst zwei): dann rückt der Ausgang in den Fuß.', [
    ['fotofinish', 'Zwei Bahnen bis zur Zielflagge: die Sieger erreichen sie, die Verlierer stehen ein Tor davor.', '10:9'],
    ['zunull', 'Der Kasten der Verlierer bleibt leer, ihre Gesichter blass.', '10:0'],
    ['aussenseiter', 'Die Paare auf Säulen aus ihrem Elo, die kleinere trägt die Krone; in der Mitte ein Zeiger, wie viel Siegchance die Rechnung den Siegern gab.', 'Siegchance unter 35 %'],
    ['kantersieg', 'Die Pucks, und wo den Verlierern Tore fehlen, steht der Abstand als goldene Klammer. Nichts liegt über den Pucks.', 'mindestens sieben Tore Abstand']]],
  ['Befunde', 'Sie zeigen, was die vier mitbrachten. Sie kommen, wenn ihr Gewicht nach dem Abklingen noch 34 erreicht.', [
    ['serien', 'Unter jedem Gesicht die Serie vor der Partie, Flamme oder Eis: bei den Siegern der nächste Schritt, bei den Verlierern ihr Ende.', 'eine Serie ab 3 auf der einen und ab 2 auf der anderen Seite, oder eine ab 5'],
    ['form', 'Die letzten fünf jedes Spielers als Formkurve, jeder Sieg ein Schritt nach oben, jede Niederlage einer nach unten, in der Farbe, wohin sie zeigt; oben die Siege beider Paare.', 'die Verlierer kamen mit mindestens drei Siegen mehr aus ihren letzten fünf'],
    ['rang', 'Unter jedem Gesicht der Platz danach und wie viele Plätze es hinauf oder hinunter ging; darunter die Tabelle als Leiste mit den vier als Marken, der Weg der Sieger über der Leiste, der der Verlierer darunter.', 'belastbare Tabelle, einer der ersten zwei dabei, mindestens vier Plätze Abstand'],
    ['duo', 'Jedes Paar in einem Ring aus seiner gemeinsamen Bilanz.', 'beide Paare haben mindestens sechsmal zusammen gespielt']]],
];
const FUESSE = [
  ['Ereignisse', 'Sie geschehen einmal und gehen vor.', [
    ['spitze', 'Neue Spitze oder Spitze in Reichweite: die ersten fünf mit ihrem Elo, die Krone an Platz 1.', 'ein Sieger übernimmt Platz 1, oder steht danach auf 2 oder 3, höchstens 12 Elo dahinter'],
    ['riss', 'Die Flammen der Serie als Kette, das letzte Glied gerissen.', 'ein Verlierer hatte mindestens fünf Siege in Folge'],
    ['fluch', 'Die letzten Duelle als Dominos, rot bis auf den letzten.', 'der Sieger verlor die letzten fünf oder mehr Duelle gegen einen der Verlierer'],
    ['kippt', 'Eine Wippe: die Seite des Siegers liegt jetzt unten, gestrichelt die Lage vor der Partie, an jedem Ende die Siege.', 'ab 16 Duellen führt der Sieger mit diesem Sieg zum ersten Mal'],
    ['rangsprung', 'Die Tabelle als Treppe, der Sprung als Bogen.', 'belastbare Tabelle, mindestens zwei Plätze nach oben'],
    ['zaehlwerk', 'Die Zahl auf Klappziffern, darunter die Leiste der Marken: die erreichten gefüllt, die heutige leuchtend, die nächste als Ring.', 'der 50., 100., 150. … Sieg oder die 50., 100. … Partie'],
    ['jubilaeum', 'Die runde Zahl in einem Ring aus der Bilanz zwischen den zwei Gesichtern, darunter die Siege.', 'die 25., 50., 75. … gemeinsame Partie eines Paars oder das 25., 50. … Duell zweier'],
    ['westen', 'Der Monat als Säulen, je Tag eine, jedes Spiel zu null ein Stein, das heutige gold; ab dem fünften am selben Tag die Zahl.', '10:0'],
    ['wochenrennen', 'Die Siegquote der Woche ab fünf Siegen.', 'ein Sieger übernimmt die Führung der Woche']]],
  ['Zustände', 'Sie gelten über viele Partien und treten zurück, wenn sie eben schon standen.', [
    ['serie', 'Die Flammen der laufenden Serie, die jüngste hell.', 'ein Sieger gewinnt mindestens zum dritten Mal in Folge'],
    ['wende', 'Die letzten zehn als Dominos, die Pleiten und der Sieg danach.', 'ein Sieger verlor davor mindestens dreimal in Folge'],
    ['plus', 'Das Elo des Tages, unter null rot, die Partie, die ins Plus dreht.', 'ab der vierten Partie des Tages, nach einem Tief von mindestens −25'],
    ['hoehe', 'Das Elo des Tages als Berg über der Linie bei +50, mit Fahne.', 'ein Sieger kommt heute zum ersten Mal über +50'],
    ['sprung', 'Die Elo-Kurve des Monats, dieser Schritt in Gold.', 'ab der achten Partie im Monat der größte Gewinn, mindestens 22'],
    ['halb', 'Die Siegquote des Monats bis zur Linie bei 50 %.', 'ab der zehnten Partie im Monat erreicht sie 50 % von unten'],
    ['partner', 'Die Siegquote mit jedem Partner, der heutige hervorgehoben.', 'mit diesem Partner die beste Quote, mindestens acht Partien, jede vierte'],
    ['kalender', 'Der Monat als Kalender mit den Wochentagen, die Spieltage gefüllt, heute umrandet.', 'der 8., 12., 16. oder 20. Spieltag im Monat'],
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

// Gezählt wird, was die Seite beschreibt: ein besonderer Ausgang, der in den
// Fuß rückt, ist derselbe Entwurf wie sein Kopf und kein eigener Fuß.
const kopfZahl = KOEPFE.reduce((a, g) => a + g[2].length, 0), fussZahl = FUESSE.reduce((a, g) => a + g[2].length, 0);
// Was `kopf-fuss-pruef.js` zuletzt gemessen hat, wenn es gelaufen ist.
let PR = null;
try { PR = JSON.parse(fs.readFileSync(path.join(__dirname, '.kopf-fuss-pruef.json'), 'utf8')); } catch(e){}
const maxK = Math.max(...Object.values(N.kopfZahl)), maxF = Math.max(...Object.values(N.fussZahl));
const seite = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Köpfe und Füße</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${appCss}</style>
<style>${fs.readFileSync(path.join(__dirname, 'kopf-fuss.css'), 'utf8')}</style>
</head><body class="kf-seite">
<header class="kf-held">
  <p class="kf-ober">Die Karte einer Partie · Entwürfe, dritte Runde</p>
  <h1>Köpfe und Füße</h1>
  <p class="kf-lead">Der Kopf zeigt immer alle vier Gesichter und den Endstand: auf einen Blick ist klar, dass hier eine Partie gespielt wurde und wer sie gewann. Was er dazu zeigt, wechselt. Der Fuß zeigt, was an dieser Partie besonders war. Gezeichnet aus den ${N.partien} echten Partien bis Oktober, gewählt mit der Regel unten.</p>
  <div class="kf-kennz">
    <span><b class="num">${kopfZahl}</b> Köpfe</span><span><b class="num">${fussZahl}</b> Füße</span>
    <span><b class="num">${z((maxK / N.partien * 100).toFixed(1))} %</b> höchster Anteil eines Kopfs</span>
    <span><b class="num">${N.kopfFolge.max === 1 ? 'nie' : N.kopfFolge.max + '×'}</b> derselbe Kopf hintereinander</span>
    <span><b class="num">${N.fussFolge.max === 1 ? 'nie' : N.fussFolge.max + '×'}</b> derselbe Fuß hintereinander</span>
    ${PR ? `<span><b class="num">${PR.ueber + PR.raus + PR.ab + PR.umbruch}</b> Überschneidungen und Überläufe in ${PR.karten} Karten</span>` : ''}
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
  ${PR ? `<h3>Gemessen</h3><p class="kf-satz-l">Jeder Kopf und jeder Fuß ist an jeder Partie gezeichnet, an der er zutrifft, je als eigene Karte: ${PR.karten} Karten, in Chromium nachgemessen. ${PR.raus} Teile ragen über Kopf oder Fuß hinaus, ${PR.ueber} Gesichter, Beschriftungen oder Zeichen überschneiden sich, ${PR.ab} Namen oder Zahlen sind abgeschnitten, ${PR.umbruch} Beschriftungen brechen um. Wo es mehr gibt, als Platz hat, steht die Zahl: eine Serie ab elf als „+n“ vor der Kette, ab dem fünften Spiel zu null an einem Tag die Zahl in der Säule, bei mehr als zwölf Plätzen nur jede fünfte Platzzahl an der Leiste, in den Listen die ersten fünf. Eine Zahl bricht nie von ihrem Wort.</p>` : ''}
  <p class="kf-satz-l">In zehn Karten am Stück stand derselbe Kopf höchstens ${N.kopfFenster.max}-mal (${esc(KOPF_NAME[N.kopfFenster.wer])}), derselbe Fuß höchstens ${N.fussFenster.max}-mal (${esc(FUSS_NAME[N.fussFenster.wer])}).</p>
</section>
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'kopf-fuss.html'), seite);
if(process.argv[2]) fs.writeFileSync(process.argv[2], seite.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head><body class="kf-seite">/, '<div class="kf-seite">').replace(/<\/body><\/html>$/, '</div>'));
console.log('kopf-fuss.html · ' + Math.round(seite.length / 1024) + ' kB');
// Die Prüfseite (KF_ALLE=daten.json KF_ALLE_HTML=ziel.html): jeder Kopf und
// jeder Fuß an jeder Partie, an der er zutrifft, je als eigene Karte. Sie
// wird nicht veröffentlicht; an ihr wird gemessen, dass nichts übersteht,
// sich überschneidet oder abgeschnitten wird.
if(process.env.KF_ALLE && process.env.KF_ALLE_HTML){
  const A = JSON.parse(fs.readFileSync(process.env.KF_ALLE, 'utf8'));
  const l = [];
  A.karten.forEach(k => {
    k.kk.forEach(h => l.push(Object.assign({}, k, {kopf:h, fuss:null, fussX:null})));
    k.ff.forEach(f => l.push(Object.assign({}, k, {kopf:'tafel', fuss:f.key, fussX:f.x})));
    k.kk.filter(h => ['fotofinish', 'zunull', 'aussenseiter', 'kantersieg'].includes(h))
      .forEach(h => l.push(Object.assign({}, k, {kopf:'tafel', fuss:h === 'kantersieg' ? 'kanter' : h, fussX:{}})));
  });
  fs.writeFileSync(process.env.KF_ALLE_HTML, seite.replace(/<body class="kf-seite">[\s\S]*<\/body>/,
    `<body class="kf-seite"><div class="kf-reihe" style="flex-wrap:wrap">${l.map(k => bild(k)).join('')}</div></body>`));
  console.log('Prüfseite · ' + l.length + ' Karten');
}
