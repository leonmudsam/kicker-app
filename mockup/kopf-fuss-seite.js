// Baut `kopf-fuss.html`: Köpfe und Füße der Karte einer Partie, vierte
// Runde, mit allen Anlässen als Zeilen. Jeder Entwurf als ganze Karte aus
// echten Partien (`.kopf-fuss.json` aus `kopf-fuss-lauf.js`), dazu die Regel, wann er kommt, wie oft er im
// Lauf kam, und die Auswahl, die für Abwechslung sorgt.
//
//   node tools/build.mjs && node mockup/kopf-fuss-anlaesse.js && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js [ziel.html]
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
// Drei Zahlen unter der Anzeigetafel, wie die Leiste unter einem Ergebnis im
// Fernsehen: die Siegchance vor dem Anstoß, der Anteil der Tore, was ein
// Sieger im Schnitt an Elo bekam.
const statLeiste = k => `<div class="kf-stat">${[['Siegchance', k.chance + '\u00a0%'], ['Anteil Tore', prozent(k.hoch, k.hoch + k.tief) + '\u00a0%'],
  ['Elo je Sieger', vz(Math.round(k.W.reduce((a, x) => a + k.delta[x], 0) / 2))]].map(([l, v]) => `<span><b class="num">${v}</b><small>${l}</small></span>`).join('')}</div>`;
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
    </div>${statLeiste(k)}`,
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
  // Serie gegen Serie als Säulendiagramm: je Spieler die Serie vor der
  // Partie (voll) und danach (Rahmen), Siege nach oben, Niederlagen nach
  // unten; darunter die Zahlen.
  serien:k => {
    // 3,5 px je Partie der Serie, ab sechs voll: bei zehn als Höchstem war
    // eine Serie von zwei vier Pixel hoch und kaum zu sehen.
    const saeule = (s, art) => s ? `<i class="${art} ${s > 0 ? 'auf' : 'ab'}" style="height:${(Math.min(6, Math.abs(s)) * 3.5).toFixed(1)}px"></i>` : `<i class="${art} null"></i>`;
    return titel(`<span>Serien</span><span class="kf-lg"><i class="v"></i>vorher<i class="n"></i>danach</span>`) + vier(k, (x, sieg) => {
      const s = k.vor[x].serie, n = k.nach[x].serie;
      const zahl = v => v > 0 ? `<span class="kf-fl">${flamme}<b class="num">${v}</b></span>` : v < 0 ? `<span class="kf-fl eis">${eis}<b class="num">${-v}</b></span>` : '<span class="kf-fl aus">–</span>';
      return `<span class="kf-sb">${saeule(s, 'v')}${saeule(n, 'n')}</span><span class="kf-sb-z">${zahl(s)}<i class="${sieg ? 'w' : ''}">→ ${n > 0 ? n : -n}</i></span>`;
    });
  },
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
    const d = k.paarung || {n:0, s:0};
    return `<div class="kf-duo">${ring(k.duo.W, k.W, true)}<span class="kf-duo-m">${stand(k)}<small class="num">${d.n ? `direkt ${d.s + 1}:${d.n - d.s}` : 'erstes Duell'}</small><small>${d.n ? `${d.n + 1}. Begegnung` : 'der zwei Paare'}</small></span>${ring(k.duo.L, k.L, false)}</div>`;
  },
  // Fotofinish: zwei Bahnen bis zur Zielflagge, die eine erreicht sie, die
  // andere steht ein Tor davor.
  fotofinish:k => `<div class="kf-ziel">${titel('Fotofinish')}
      ${[[k.W, k.hoch, true], [k.L, k.tief, false]].map(([ids, n, w]) => `<div class="kf-bahn${w ? ' w' : ''}">${paar(ids)}
        <span class="kf-b-b"><i style="width:${n * 10}%"></i></span><b class="num">${n}</b></div>`).join('')}
      <span class="kf-flagge"></span></div>`,
  // Zu null: der Kasten der Verlierer bleibt leer.
  // Zu null: zwei Tore. Das der Sieger leer und golden, das der Verlierer
  // mit zehn Bällen im Netz, dazwischen das Band und welches Zu-null des
  // Monats es ist. Vorher stand ein kleines Tor mit einer roten Null
  // zwischen den Paaren, und die seltenste Partie sah aus wie jede andere.
  zunull:k => {
    const netz = `<path class="kf-nt-n" d="${Array.from({length:11}, (_, i) => `M${16 + i * 6.8} 2V46`).join('')}${Array.from({length:8}, (_, i) => `M16 ${2 + i * 6.3}H84`).join('')}M6 10L16 2M94 10L84 2M6 54L16 46M94 54L84 46"/>`;
    const rahmen = `<path class="kf-nt-r" d="M6 55V10H94V55"/><path class="kf-nt-b" d="M2 55H98"/>`;
    const lage = [[17, 48.5], [27.5, 48.5], [38, 48.5], [48.5, 48.5], [59, 48.5], [69.5, 48.5], [80, 48.5], [32, 38.5], [42.5, 38.5], [53, 38.5]];
    const baelle = lage.map(([cx, cy], i) => `<circle class="kf-nt-ball" cx="${cx}" cy="${cy}" r="5" style="--i:${i}"/>`).join('');
    const id = 'kfn' + (uid++);
    return `<div class="kf-nul">
      <div class="kf-nul-p w">${paar(k.W)}</div>
      <span class="kf-nul-z num"><b>${k.hoch}</b><i>:</i><u>0</u></span>
      <div class="kf-nul-p aus">${paar(k.L)}</div>
      <div class="kf-nul-tore">
      <svg class="kf-nul-t leer" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#f7cf4a" stop-opacity=".32"/><stop offset="1" stop-color="#f7cf4a" stop-opacity="0"/></radialGradient></defs>
        <rect x="6" y="6" width="88" height="50" fill="url(#${id})"/>${netz}<text class="kf-nt-0" x="50" y="44">0</text>${rahmen}</svg>
      <svg class="kf-nul-t voll" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}b" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#f4ffd8"/><stop offset=".45" stop-color="#BEF264"/><stop offset="1" stop-color="#5f8a22"/></radialGradient></defs>
        ${netz}<g fill="url(#${id}b)">${baelle}</g>${rahmen}</svg>
      </div>
      <small class="kf-nul-u w">kein Gegentor</small><em class="kf-nul-b">${ic('weisseWeste')}<b>Zu null</b><small class="num">${k.westen}. im ${monat(k.sid)}</small></em><small class="kf-nul-u">${k.hoch} Gegentore</small>
    </div>`;
  },
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
// ── Ein Liniendiagramm ──────────────────────────────────────────────
// Jede Kurve im Fuß mit demselben Gerüst: links die Achse mit runden Werten,
// unten Anfang und Ende, eine Bezugslinie (null, +75, 50 %) in der Farbe des
// Fußes mit ihrem Wert, die Linie 2 px, darunter eine Fläche in einem Zehntel
// ihrer Farbe, am Ende ein Punkt mit Ring und daneben sein Wert. Vorher
// stand die Linie ohne Achse und ohne Zahl: man sah eine Form, aber keinen
// Wert. Die Werte der Achse weichen der Bezugslinie aus, statt mit ihrem
// Wert zusammenzufallen.
const schritt = span => [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(s => span / s <= 4) || 1000;
function kurve(v, o){
  const W = 244, H = o.h || 84, LI = 30, RE = 34, OB = 8, UN = 15, n = v.length - 1, f = o.fmt || (y => String(y));
  let lo = Math.min(...v, o.ref != null ? o.ref : Infinity, o.lo != null ? o.lo : Infinity);
  let hi = Math.max(...v, o.ref != null ? o.ref : -Infinity, o.hi != null ? o.hi : -Infinity);
  if(hi === lo){ hi += 1; lo -= 1; }
  const st = schritt(hi - lo); lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  const X = i => LI + i * (W - LI - RE) / Math.max(1, n), Y = y => OB + (hi - y) * (H - OB - UN) / (hi - lo);
  const r = x => x.toFixed(1);
  const ticks = []; for(let y = lo; y <= hi + 1e-9; y += st) if(o.ref == null || Math.abs(Y(y) - Y(o.ref)) >= 9) ticks.push(y);
  const d = v.map((y, i) => (i ? 'L' : 'M') + r(X(i)) + ' ' + r(Y(y))).join('');
  const basis = o.ref != null ? o.ref : lo, id = 'kfk' + (uid++);
  const flaeche = `${d}L${r(X(n))} ${r(Y(basis))}L${r(X(0))} ${r(Y(basis))}Z`;
  // Über und unter der Bezugslinie zwei Farben, wo die Kurve sie kreuzt.
  const fl = o.zwei
    ? `<clipPath id="${id}o"><rect x="0" y="0" width="${W}" height="${r(Y(o.ref))}"/></clipPath><clipPath id="${id}u"><rect x="0" y="${r(Y(o.ref))}" width="${W}" height="${H}"/></clipPath>
       <path class="kf-k-f" clip-path="url(#${id}o)" d="${flaeche}"/><path class="kf-k-f neg" clip-path="url(#${id}u)" d="${flaeche}"/>
       <path class="kf-k-l" clip-path="url(#${id}o)" d="${d}"/><path class="kf-k-l neg" clip-path="url(#${id}u)" d="${d}"/>`
    : `<path class="kf-k-f" d="${flaeche}"/><path class="kf-k-l" d="${d}"/>`;
  const ey = Math.min(H - UN - 1, Math.max(OB + 6, Y(v[n]) + 3.5));
  return `<svg class="kf-k" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${ticks.map(y => `<line class="kf-k-g" x1="${LI}" x2="${W - RE}" y1="${r(Y(y))}" y2="${r(Y(y))}"/><text class="kf-k-t" x="${LI - 5}" y="${r(Y(y) + 3)}">${esc(f(y))}</text>`).join('')}
    ${o.ref != null ? `<line class="kf-k-r" x1="${LI}" x2="${W - RE}" y1="${r(Y(o.ref))}" y2="${r(Y(o.ref))}"/><text class="kf-k-t ref" x="${LI - 5}" y="${r(Y(o.ref) + 3)}">${esc(f(o.ref))}</text>` : ''}
    ${fl}
    ${o.letzt ? `<path class="kf-k-l letzt" d="M${r(X(n - 1))} ${r(Y(v[n - 1]))}L${r(X(n))} ${r(Y(v[n]))}"/>` : ''}
    ${o.extra ? o.extra(X, Y) : ''}
    <circle class="kf-k-p${o.zwei && v[n] < o.ref ? ' neg' : ''}" cx="${r(X(n))}" cy="${r(Y(v[n]))}" r="4"/>
    <text class="kf-k-w" x="${r(X(n) + 8)}" y="${r(ey)}">${esc(o.ende != null ? o.ende : f(v[n]))}</text>
    <text class="kf-k-x" x="${LI}" y="${H - 3}">${esc((o.x || [])[0] || '')}</text><text class="kf-k-x re" x="${r(X(n))}" y="${H - 3}">${esc((o.x || [])[1] || '')}</text>
  </svg>`;
}
const dominos = (f, letzt) => `<span class="kf-dom">${f.map((r, i) => `<i class="${r ? 's' : 'n'}${letzt && i === f.length - 1 ? ' jetzt' : ''}"></i>`).join('')}</span>`;
// Eine kleine Rangliste als Tabelle: Platz, Gesicht und Name, ein Balken
// von 0 bis `max`, der Wert und eine Zahl daneben; optional ein Strich für
// den Schnitt. Dieselbe Form wie die Spitze, damit sich die Listen eines
// Feeds gleich lesen [§C27].
const rangTabelle = (l, o) => `<table class="kf-rl"><thead><tr><th></th><th></th><th></th><th>${esc(o.kopf[0])}</th><th>${esc(o.kopf[1])}</th></tr></thead><tbody>${l.map((q, i) =>
  `<tr class="${q.id === o.hervor ? 'an' : ''}"><td class="num">${i + 1}.</td><td>${av(q.id)}<span>${esc(nm(q.id))}</span></td>
   <td class="kf-rl-b"><i style="width:${Math.min(100, q.wert / o.max * 100).toFixed(1)}%"></i>${o.schnitt != null ? `<u style="left:${(o.schnitt / o.max * 100).toFixed(1)}%"></u>` : ''}</td>
   <td class="num">${esc(q.zahl)}</td><td class="num kf-rl-a">${esc(q.neben)}</td></tr>`).join('')}</tbody></table>`;
// Drei Zahlen als Leiste unter einer Zeichnung, wie unter der Anzeigetafel.
const leiste = l => `<div class="kf-stat">${l.map(([lab, v]) => `<span><b class="num">${esc(v)}</b><small>${esc(lab)}</small></span>`).join('')}</div>`;
// Die Bilanz zweier nach dieser Partie, aus den Duellen davor.
const bilanzNach = (k, w, l) => { const c = (k.kreuz || []).find(q => q.w === w && q.l === l); return c ? [c.s + 1, c.n + 1] : null; };
const FUSS = {
  riss:(k, x) => fkopf('flameBreak', 'Serie gerissen', x.n) + `<div class="kf-kette">${av(x.pid)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:Math.min(x.n > 10 ? 9 : 10, x.n)}, () => `<i>${flamme}</i>`).join('')}<u></u></div>`
    + satz(`${b(nm(x.pid))} hatte ${x.n} Siege in Folge, ${b(und(k.W))} beenden die Serie.`),
  // Die Spitze als Rangliste: Balken aus dem Elo über dem fünften, der Wert
  // am Ende, daneben der Abstand zum Ersten.
  spitze:(k, x) => { const l = x.liste, top = l[0].elo, lo = Math.min(...l.map(q => q.elo)) - 20, ich = l.find(q => q.id === x.pid) || l[0];
    return fkopf('crown', x.vorher ? 'Neue Spitze' : 'Spitze in Reichweite', x.vorher ? '1.' : `−${top - ich.elo} Elo`)
      + `<table class="kf-rl"><tbody>${l.map((q, i) => `<tr class="${q.id === x.pid ? 'an' : ''}"><td class="num">${i + 1}.</td><td>${av(q.id)}<span>${esc(nm(q.id))}</span></td>
        <td class="kf-rl-b"><i style="width:${((q.elo - lo) / Math.max(1, top - lo) * 100).toFixed(1)}%"></i></td><td class="num">${q.elo}</td><td class="num kf-rl-a">${i ? '−' + (top - q.elo) : ''}</td></tr>`).join('')}</tbody></table>`
      + satz(x.vorher ? `${b(nm(x.pid))} löst ${b(nm(x.vorher))} an der Spitze ab, ${top - l[1].elo} Elo vor dem Zweiten.` : `${b(nm(x.pid))} liegt noch ${top - ich.elo} Elo hinter ${b(nm(l[0].id))}.`); },
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
  fluch:(k, x) => { const bi = bilanzNach(k, x.w, x.l);
    return fkopf('bannbruch', 'Fluch gebrochen', `nach ${x.n}`) + `<div class="kf-duell">${av(x.w)}${dominos(x.folge, true)}${av(x.l)}</div>`
    + (bi ? leiste([['Pleiten', x.n], ['Bilanz', `${bi[0]}:${bi[1] - bi[0]}`], ['Duelle', bi[1]]]) : '')
    + satz(`${b(nm(x.w))} verlor die letzten ${x.n} Duelle gegen ${b(nm(x.l))}. Jetzt nicht mehr.`); },
  // Bilanz gekippt: die Bilanzkurve zweier über alle Duelle, nach jedem
  // Duell, wie weit der Sieger vorn (über null) oder hinten lag; der letzte
  // Schritt kreuzt die Linie. Darüber, wer wofür steht: Farbe allein sagt es
  // nicht.
  kippt:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fkopf('scaleBalance', 'Bilanz gekippt', `${x.s}:${x.n - x.s}`)
      + `<div class="kf-lgz">${av(x.w)}<small>über null: ${esc(nm(x.w))} vorn</small>${av(x.l)}<small>darunter: ${esc(nm(x.l))}</small></div>`
      + kurve(v, {ref:0, zwei:true, fmt:vz, x:['1. Duell', `${n}. Duell`], ende:`${x.s}:${x.n - x.s}`, letzt:true})
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
  // Das Rennen um die Woche als Tabelle: Quote als Balken von 0 bis 100 %,
  // daneben Siege von Partien.
  wochenrennen:(k, x) => fkopf('weekKing', 'Rennen um die Woche', null) + rangTabelle(x.liste.map(q => ({id:q.pid, wert:q.q,
      zahl:q.q + '\u00a0%', neben:`${q.s}/${q.n}`})), {hervor:x.pid, max:100, kopf:['Quote', 'Siege']})
    + satz(`${b(nm(x.pid))} übernimmt die Woche: ${x.liste[0].s} von ${x.liste[0].n} gewonnen.`),
  serie:(k, x) => { const n = Math.min(x.n > 10 ? 9 : 10, x.n);
    return fkopf('flame', 'Siegesserie', x.n) + `<div class="kf-kette lauf">${av(x.pid)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:n}, (_, i) => `<i class="${i === n - 1 ? 'jetzt' : ''}">${flamme}</i>`).join('')}</div>`
    + satz(`${b(nm(x.pid))} gewinnt zum ${x.n}. Mal in Folge.`); },
  wende:(k, x) => fkopf('comeback', 'Wende', `nach ${x.n}`) + `<div class="kf-duell solo">${av(x.pid)}${dominos(x.folge, true)}</div>`
    + leiste([['Pleiten', x.n], [`Siege aus ${x.folge.length}`, x.folge.filter(Boolean).length], ['Serie', 1]])
    + satz(`${b(nm(x.pid))} beendet ${x.n} Niederlagen in Folge.`),
  // Das erste gemeinsame Spiel als Tabelle: der wievielte Partner es für
  // jeden ist und wie viele Partien er schon hatte.
  premiere:(k, x) => fkopf('premiere', 'Erstes gemeinsames Spiel', '1.')
    + `<table class="kf-tb"><thead><tr><th></th><th>Partner</th><th>Partien</th></tr></thead><tbody>${x.ids.map((id, i) =>
      `<tr><td>${av(id)}<span>${esc(nm(id))}</span></td><td class="num">${x.partner ? x.partner[i] + '.' : '–'}</td><td class="num">${x.n ? x.n[i] : '–'}</td></tr>`).join('')}</tbody></table>`
    + satz(`${b(und(x.ids))} spielen zum ersten Mal zusammen und gewinnen.`),
  plus:(k, x) => { const v = x.verlauf, n = v.length - 1, tief = Math.min(...v);
    return fkopf('comeback', 'Ins Plus gedreht', vz(v[n])) + kurve(v, {ref:0, zwei:true, fmt:vz, x:['Start', `${n}. Partie`]})
      + satz(`${b(nm(x.pid))} lag heute bei ${vz(tief)} Elo und steht nach der ${n}. Partie im Plus.`); },
  hoehe:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fkopf('peak', 'Höhenmeter heute', vz(v[n])) + kurve(v, {ref:75, lo:0, fmt:vz, x:['Start', `${n}. Partie`],
        extra:(X, Y) => `<path class="kf-fahne" d="M${X(n).toFixed(1)} ${(Y(v[n]) - 5).toFixed(1)}v-13l9 3.5-9 3.5"/>`})
      + satz(`${b(nm(x.pid))} steht heute nach ${n} Partien bei ${vz(v[n])} Elo, zum ersten Mal über +75.`); },
  sprung:(k, x) => { const v = x.verlauf.slice(1), n = v.length - 1;
    return fkopf('rakete', 'Größter Gewinn im Monat', vz(x.gewinn)) + kurve(v, {letzt:true, x:['1. Partie', `${n + 1}. Partie`], ende:`${v[n]}`})
      + satz(`${b(nm(x.pid))} holt ${x.gewinn} Elo, so viel wie in keiner Partie des Monats, und steht bei ${v[n]}.`); },
  halb:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fkopf('scaleBalance', 'Wieder bei 50 %', v[n] + ' %') + kurve(v, {ref:50, lo:0, hi:100, fmt:y => y + ' %', x:['1. Partie', `${n + 1}. Partie`]})
      + satz(`${b(nm(x.pid))} gewinnt im Monat wieder jede zweite Partie, nach ${x.n} Partien.`); },
  // Der beste Partner als Tabelle: die Quote mit jedem Partner ab sechs
  // Partien, dazu die Zahl der Partien, und als Strich durch alle Balken die
  // Quote mit allen zusammen: wer darüber liegt, hebt ihn.
  partner:(k, x) => fkopf('partnerHebel', 'Der beste Partner', null)
    + rangTabelle(x.liste.map(q => ({id:q.pid, wert:q.q, zahl:q.q + '\u00a0%', neben:`${q.n} Sp.`})), {hervor:x.mit, max:100, schnitt:x.allg, kopf:['Quote', 'Partien']})
    + `<div class="kf-rl-lg"><i></i>${x.allg}\u00a0% mit allen</div>`
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
  // ── Füße für Anlässe der App ohne eigene Zeichnung ────────────────
  // Die Auszeichnungen der Partie als Medaillen, die Klasse als Farbe, bis
  // drei und dahinter die Zahl. Der Name steht unter der Medaille und bricht
  // auf zwei Zeilen um, nie in die Nachbarin.
  auszeichnung:(k, x) => { const l = x.liste, zeig = l.slice(0, 3), mehr = l.length - zeig.length;
    return fkopf('medalTrio', l.length > 1 ? `${l.length} Auszeichnungen` : 'Auszeichnung', null) + `<div class="kf-orden${l.length === 1 ? ' eins' : ''}">${zeig.map(o =>
      `<span class="kf-od ${o.klasse}"><i>${ic(o.ic)}</i><span><b>${esc(o.name)}</b>${o.mal > 1 ? `<small class="num">${o.mal}. Mal</small>` : ''}<em>${o.wer.map(id => av(id)).join('')}</em></span></span>`).join('')}
      ${mehr > 0 ? `<span class="kf-od-mehr num">+${mehr}</span>` : ''}</div>`
      + satz(l.length === 1 ? esc(l[0].titel).replace(/^(\S+( und \S+)?)/, '<b>$1</b>') + '.' : `${l.length} Auszeichnungen aus dieser Partie, ${zeig.map(o => '„' + esc(o.name) + '“').join(', ')}${mehr > 0 ? ` und ${mehr} weitere` : ''}.`); },
  // Zwei, die zusammen in Serie gewinnen: das Paar vor der Flammenkette.
  duoserie:(k, x) => { const n = Math.min(x.n > 10 ? 9 : 10, x.n);
    return fkopf('flame', 'Serie zu zweit', x.n) + `<div class="kf-kette lauf">${paar(x.ids)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:n}, (_, i) => `<i class="${i === n - 1 ? 'jetzt' : ''}">${flamme}</i>`).join('')}</div>`
      + satz(`${b(und(x.ids))} gewinnen zusammen zum ${x.n}. Mal in Folge.`); },
  // Pleiten in Folge: Eis statt Flammen, gedämpft.
  pleiten:(k, x) => { const n = Math.min(x.n > 10 ? 9 : 10, x.n);
    return fkopf('flameBreak', 'Pleiten in Folge', x.n) + `<div class="kf-kette eis">${av(x.pid)}${x.n > 10 ? `<em class="num">+${x.n - 9}</em>` : ''}${Array.from({length:n}, () => `<i>${eis}</i>`).join('')}</div>`
      + satz(`${b(nm(x.pid))} verliert zum ${x.n}. Mal in Folge.`); },
  // Revanche: die Begegnung davor und die von eben untereinander, dieselben
  // vier, die Seiten getauscht.
  revanche:(k, x) => { const v = x.vorher, heute = datum(v.t) === datum(k.t);
    const reihe = (wann, links, rechts, a, c, jetzt) => `<div class="kf-rv-z${jetzt ? ' jetzt' : ''}"><small class="num">${wann}</small>${paar(links)}<b class="num">${a}<i>:</i>${c}</b>${paar(rechts)}</div>`;
    return fkopf('boomerang', 'Revanche', `${k.hoch}:${k.tief}`) + `<div class="kf-rv">${reihe(heute ? uhr(v.t) : datum(v.t).replace(/^\w+\.,\s*/, ''), k.W, k.L, v.tief, v.hoch, false)}${reihe('jetzt', k.W, k.L, k.hoch, k.tief, true)}</div>`
      + satz(`${b(und(k.W))} verloren ${heute ? 'um ' + uhr(v.t) + ' Uhr' : 'am ' + datum(v.t).replace(/^\w+\.,\s*/, '')} ${v.tief}:${v.hoch} gegen ${b(und(k.L))} und drehen es jetzt.`); },
  // Spitzenspiel: die zwei Ersten auf ihren Stufen, wie sie vor der Partie
  // standen, die Krone beim Sieger.
  spitzenspiel:(k, x) => { const st = (id, pl, w, e, n) => `<span class="kf-sz-s${w ? ' w' : ''}" style="--h:${pl === 1 ? 34 : pl === 2 ? 24 : 16}px">${w ? ic('crown') : ''}${av(id)}<i><b class="num">${pl || '–'}.</b></i><small class="num">${e != null ? `${e} → ${n}` : ''}</small></span>`;
    return fkopf('crown', 'Spitzenspiel', null) + `<div class="kf-sz">${st(x.a, x.pa, true, x.ea, x.na)}<em>schlägt</em>${st(x.b, x.pb, false, x.eb, x.nb)}</div>`
      + satz(`${b(nm(x.a))} (${x.pa}.) schlägt ${b(nm(x.b))} (${x.pb}.) im Spitzenspiel.`); },
  // Formhoch: die letzten zehn als Punkte, die Siege gezählt.
  form10:(k, x) => fkopf('trendUp', 'In Form', `${x.s} von 10`) + `<div class="kf-duell solo">${av(x.pid)}${dominos(x.folge, true)}</div>`
    + leiste([['Siege', x.s], ['Niederlagen', 10 - x.s], ['Quote', x.s * 10 + '\u00a0%']])
    + satz(`${b(nm(x.pid))} gewinnt ${x.s} der letzten 10 Partien.`),
  // Der lange Tag: jede Partie des Tages ein Stein, Sieg hell.
  marathon:(k, x) => fkopf('stopwatch', 'Der lange Tag', `${x.n}.`) + `<div class="kf-duell solo">${av(x.pid)}${dominos(x.folge.slice(-15), true)}</div>`
    + `<div class="kf-ab-u num" style="margin-left:31px"><span>${x.folge.filter(Boolean).length} Siege</span><span>${x.folge.filter(r => !r).length} Niederlagen</span></div>`
    + satz(`${b(nm(x.pid))} bestreitet die ${x.n}. Partie des Tages${x.folge.length > 15 ? ', gezeigt die letzten 15' : ''}.`),
  // Eine Elo-Marke: die Skala um die Marke, vorher und nachher, die Marke
  // als goldene Linie.
  elomarke:(k, x) => { const lo = Math.min(x.vor, x.marke) - 20, hi = Math.max(x.nach, x.marke) + 20, X = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
    return fkopf('target', 'Elo-Marke', x.marke) + `<div class="kf-em">${av(x.pid)}<div class="kf-em-l"><u style="left:${X(x.vor)}%;width:${(X(x.nach) - X(x.vor)).toFixed(1)}%"></u>
        <i style="left:${X(x.marke)}%"><small class="num">${x.marke}</small></i><em class="v" style="left:${X(x.vor)}%"></em><em class="n" style="left:${X(x.nach)}%"></em></div></div>
      <div class="kf-ab-u num" style="margin-left:31px"><span>vorher ${x.vor}</span><span>jetzt <b>${x.nach}</b></span></div>`
      + satz(`${b(nm(x.pid))} knackt ${x.marke} Elo, von ${x.vor} auf ${x.nach}.`); },
  // ── Füße für die neuen Zeilen ────────────────────────────────────
  // Der Lieblingsgegner: die Duelle als Dominos, die Serie hell.
  liebling:(k, x) => { const bi = bilanzNach(k, x.w, x.l);
    return fkopf('crossedSwords', 'Serie gegen einen', `${x.n}×`) + `<div class="kf-duell">${av(x.w)}${dominos(x.folge, true)}${av(x.l)}</div>`
    + (bi ? leiste([['Serie', x.n], ['Bilanz', `${bi[0]}:${bi[1] - bi[0]}`], ['Quote', Math.round(bi[0] / bi[1] * 100) + '\u00a0%']]) : '')
    + satz(`${b(nm(x.w))} gewinnt zum ${x.n}. Mal in Folge gegen ${b(nm(x.l))}.`); },
  // Dieselben zwei Paare: jede Begegnung ein Stein, die Bilanz daneben.
  paarung:(k, x) => fkopf('crossedSwords', 'Dieselben vier', `${x.n}.`) + `<div class="kf-duell">${paar(x.W)}${dominos(x.folge, true)}${paar(x.L, 'aus')}</div>`
    + `<div class="kf-jub-u num"><span><b>${x.s}</b> Siege</span><span><b>${x.n - x.s}</b> Siege</span></div>`
    + satz(`${b(und(x.W))} gegen ${b(und(x.L))} zum ${x.n}. Mal, ${x.s}:${x.n - x.s}.`),
  zunull:k => fkopf('weisseWeste', 'Zu null', '10:0') + `<div class="kf-nl-f">${paar(k.W)}<b class="num">10</b><i>:</i><b class="num null">0</b>${paar(k.L, 'aus')}</div>` + satz(`${b(und(k.L))} bleiben ohne Tor.`),
};
const FUSS_NAME = {riss:'Serie gerissen', spitze:'Spitze', rangsprung:'Tabellensprung', zaehlwerk:'Zählwerk',
  fluch:'Fluch gebrochen', kippt:'Bilanz gekippt', jubilaeum:'Jubiläum', westen:'Zu null im Monat',
  wochenrennen:'Rennen um die Woche', serie:'Siegesserie', wende:'Wende', premiere:'Erstes gemeinsames Spiel', plus:'Ins Plus gedreht',
  hoehe:'Höhenmeter', sprung:'Größter Sprung', halb:'Wieder bei 50 %', partner:'Der beste Partner', kalender:'Spieltage im Monat',
  auszeichnung:'Auszeichnung', duoserie:'Serie zu zweit', pleiten:'Pleiten in Folge', revanche:'Revanche', spitzenspiel:'Spitzenspiel',
  form10:'In Form', marathon:'Der lange Tag', elomarke:'Elo-Marke', liebling:'Serie gegen einen', paarung:'Dieselben vier',
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
    liebling:() => `${nm(x.w)} gewinnt zum ${x.n}. Mal in Folge gegen ${nm(x.l)}`,
    paarung:() => `${W} gegen ${L} zum ${x.n}. Mal`,
  }[k.fuss];
  if(f) return f();
  return {fotofinish:`${W} retten das 10:9`, zunull:`${W} gewinnen zu null`, aussenseiter:`${W} stürzen die Favoriten`,
    kantersieg:`${W} siegen ${k.hoch}:${k.tief}`}[k.kopf] || `${W} setzen sich gegen ${L} durch`;
}

// ── Die Zeilen ──────────────────────────────────────────────────────
// Jeder Anlass der Partie als Zeile, wie das Sammelband der App sie setzt
// (`.nf-sam`): erst alle, die die App heute bündelt, dann die neuen Fakten
// dieses Entwurfs. Alle, nicht die ersten vier und „und n weitere“: wer die
// Karte überfliegt, soll alles sehen, was die Partie trägt. Ab der fünften
// rücken sie enger zusammen. Die neuen sind auf dieser Seite gestrichelt
// markiert; in der App sähen sie aus wie jede Zeile.
const zeilen = k => {
  const app = (k.app && k.app.teile) || [];
  const l = app.map(x => `<div class="nf-sam-z${x.neg ? ' neg' : ''}${x.brk ? ' brk' : ''}">${x.html}`
      + (x.brk ? '<b class="nf-sam-brk">Der Anlass</b>' : '') + (x.klasse ? `<b class="nf-sam-kl">${esc(x.klasse)}</b>` : '')
      + (x.wert ? `<b class="nf-sam-w">${esc(x.wert)}</b>` : '') + '</div>')
    .concat((k.zeilen || []).map(z => `<div class="nf-sam-z kf-neu" data-art="${esc(z.key)}"><i class="nf-sam-i">${ic(z.ic)}</i><span>${z.html}</span></div>`));
  return l.length ? `<div class="nf-sam kf-sam${l.length > 4 ? ' viele' : ''}">${l.join('')}</div>` : '';
};
// Die Schlagzeile: die der App, sobald sie Anlässe bündelt (höchstens drei,
// der stärkste zuerst); sonst die des Entwurfs aus seinem Fuß.
const titelVon = k => k.app && k.app.teile.length ? k.app.titel : schlagzeile(k);
const karte = k => `<div class="nf-card nf-s-spiel nfc-highlight kf-karte">
    <div class="nf-top"><span class="nf-rub"><i>${ic('spielfeld')}</i><b>AM SPIELTAG</b></span><span class="nf-when">${ic('clock')}${uhr(k.t)}</span></div>
    <div class="kf-kopf kf-k-${k.kopf}">${KOPF[k.kopf](k)}${namen(k)}</div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(titelVon(k))}</div>${k.app && k.app.text ? `<div class="nf-d">${esc(k.app.text)}</div>` : ''}</div><span class="nf-chev">${ic('chevron')}</span></div>
    ${zeilen(k)}
    ${k.fuss && FUSS[k.fuss] ? `<div class="kf-fuss kf-f-${k.fuss}">${FUSS[k.fuss](k, k.fussX || {})}</div>` : ''}
  </div>`;
const bild = (k, unter) => `<figure class="kf-bsp"><div class="nf-wrap nf-liste"><div class="nf-feed">${karte(k)}</div></div>
    <figcaption>${esc(datum(k.t))}, ${uhr(k.t)} · Kopf ${esc(KOPF_NAME[k.kopf])} · ${k.fuss ? 'Fuß ' + esc(FUSS_NAME[k.fuss]) : 'ohne Fuß'}${unter ? ' · ' + unter : ''}</figcaption></figure>`;

// ── Die Regeln ──────────────────────────────────────────────────────
const KOEPFE = [
  ['Grundansichten', 'Jede trifft auf jede Partie zu und sagt so viel wie die anderen; sie wechseln sich ab, die am längsten nicht dran war, kommt.', [
    ['tafel', 'Der Endstand auf Klappziffern wie an einer Anzeigetafel, die Sieger leuchten; neben jedem Paar, was die Partie ihm an Elo brachte; darunter eine Leiste mit drei Zahlen: Siegchance, Anteil der Tore, Elo je Sieger.', 'immer'],
    ['pucks', 'Jedes Tor ein Puck, zehn Plätze je Reihe: die Sieger voll, die Verlierer mit ihren Toren und den fehlenden als leere Ringe. Der Abstand ist zu sehen, ohne zu rechnen.', 'immer'],
    ['strom', 'Was die Verlierer abgeben, fließt als Strom zu den Siegern, so breit wie die Punkte; die Ziffer steht an jedem Gesicht.', 'immer'],
    ['erwartung', 'Eine Skala von 0 bis 100 %: oben die Siegchance vor dem Anstoß als Ring, unten der Anteil der Tore danach als Punkt, dazwischen der Abstand, darunter das Urteil. Liegen beide bis fünf Punkte beieinander, sind sie eine Marke: genau nach Rechnung.', 'Siegchance zwischen 35 und 65 %']]],
  ['Besondere Ausgänge', 'Sie sind selbst die Geschichte und tragen den Kopf, außer derselbe stand auf einer der Karten davor (bei 10:9 und Kantersieg drei, sonst zwei): dann rückt der Ausgang in den Fuß.', [
    ['fotofinish', 'Zwei Bahnen bis zur Zielflagge: die Sieger erreichen sie, die Verlierer stehen ein Tor davor.', '10:9'],
    ['zunull', 'Zwei Tore unter dem Endstand: das der Sieger leer und golden, mit der Null im Netz; das der Verlierer mit zehn Bällen, die hineinfallen. Dazwischen das Band, das wievielte Zu-null des Monats es ist, darunter „kein Gegentor“ und „10 Gegentore“, die Verlierer blass. Flutlicht von oben.', '10:0'],
    ['aussenseiter', 'Die Paare auf Säulen aus ihrem Elo, die kleinere trägt die Krone; in der Mitte ein Zeiger, wie viel Siegchance die Rechnung den Siegern gab.', 'Siegchance unter 35 %'],
    ['kantersieg', 'Die Pucks, und wo den Verlierern Tore fehlen, steht der Abstand als goldene Klammer. Nichts liegt über den Pucks.', 'mindestens sieben Tore Abstand']]],
  ['Befunde', 'Sie zeigen, was die vier mitbrachten. Sie kommen, wenn ihr Gewicht nach dem Abklingen noch 34 erreicht.', [
    ['serien', 'Ein Säulendiagramm je Spieler: die Serie vor der Partie voll, danach als Rahmen, Siege nach oben, Niederlagen nach unten; darunter die Zahl mit Flamme oder Eis und wohin sie geht.', 'eine Serie ab 3 auf der einen und ab 2 auf der anderen Seite, oder eine ab 5'],
    ['form', 'Die letzten fünf jedes Spielers als Formkurve, jeder Sieg ein Schritt nach oben, jede Niederlage einer nach unten, in der Farbe, wohin sie zeigt; oben die Siege beider Paare.', 'die Verlierer kamen mit mindestens drei Siegen mehr aus ihren letzten fünf'],
    ['rang', 'Unter jedem Gesicht der Platz danach und wie viele Plätze es hinauf oder hinunter ging; darunter die Tabelle als Leiste mit den vier als Marken, der Weg der Sieger über der Leiste, der der Verlierer darunter.', 'belastbare Tabelle, einer der ersten zwei dabei, mindestens vier Plätze Abstand'],
    ['duo', 'Jedes Paar in einem Ring aus seiner gemeinsamen Bilanz; in der Mitte die direkte Bilanz der zwei Paare und die wievielte Begegnung.', 'beide Paare haben mindestens sechsmal zusammen gespielt']]],
];
const FUESSE = [
  ['Ereignisse', 'Sie geschehen einmal und gehen vor.', [
    ['spitze', 'Neue Spitze oder Spitze in Reichweite: die ersten fünf als Rangliste, Balken aus dem Elo, der Wert und der Abstand zum Ersten.', 'ein Sieger übernimmt Platz 1, oder steht danach auf 2 oder 3, höchstens 12 Elo dahinter'],
    ['riss', 'Die Flammen der Serie als Kette, das letzte Glied gerissen.', 'ein Verlierer hatte mindestens fünf Siege in Folge'],
    ['fluch', 'Die letzten Duelle als Dominos, rot bis auf den letzten.', 'der Sieger verlor die letzten fünf oder mehr Duelle gegen einen der Verlierer'],
    ['kippt', 'Die Bilanzkurve über alle Duelle der zwei: nach jedem Duell, wie weit der Sieger vorn oder hinten lag, über null in seiner Farbe, darunter rot; der letzte Schritt kreuzt die Linie. Darüber, wer wofür steht.', 'ab 16 Duellen führt der Sieger mit diesem Sieg wieder, und zuletzt lag er vor mindestens zehn Duellen vorn oder nie'],
    ['rangsprung', 'Die Tabelle als Treppe, der Sprung als Bogen.', 'belastbare Tabelle, mindestens zwei Plätze nach oben'],
    ['zaehlwerk', 'Die Zahl auf Klappziffern, darunter die Leiste der Marken: die erreichten gefüllt, die heutige leuchtend, die nächste als Ring.', 'der 50., 100., 150. … Sieg oder die 50., 100. … Partie'],
    ['jubilaeum', 'Die runde Zahl in einem Ring aus der Bilanz zwischen den zwei Gesichtern, darunter die Siege.', 'die 25., 50., 75. … gemeinsame Partie eines Paars oder das 25., 50. … Duell zweier'],
    ['westen', 'Der Monat als Säulen, je Tag eine, jedes Spiel zu null ein Stein, das heutige gold; ab dem fünften am selben Tag die Zahl.', '10:0'],
    ['wochenrennen', 'Die Siegquote der Woche ab fünf Siegen als Tabelle: Platz, Balken bis 100 %, Quote, Siege von Partien.', 'ein Sieger übernimmt die Führung der Woche'],
    ['auszeichnung', 'Die Auszeichnungen der Partie als Medaillen, die Klasse als Farbe, darunter wer sie holt; bis drei, dahinter die Zahl.', 'die App meldet eine Auszeichnung oder eine runde Zahl einer Auszeichnung'],
    ['revanche', 'Die Begegnung davor und die von eben untereinander, dieselben vier.', 'die App meldet eine Revanche (dieselben Paare am selben Tag, davor klar verloren)'],
    ['spitzenspiel', 'Die zwei Ersten auf ihren Stufen, wie sie vor der Partie standen, die Krone beim Sieger, darunter das Elo vorher und nachher.', 'die App meldet ein Spitzenspiel'],
    ['elomarke', 'Die Skala um die Marke, vorher und nachher, die Marke als goldene Linie.', 'die App meldet eine Elo-Marke'],
    ['liebling', 'Die Duelle zweier als Dominos, die Serie hell.', 'ein Sieger gewinnt zum 8., 10., 12., 15., 20. … Mal in Folge gegen einen der Verlierer'],
    ['paarung', 'Jede Begegnung dieser zwei Paare ein Stein, darunter die Bilanz.', 'dieselben zwei Paare treffen zum 5., 10., 15. … Mal aufeinander']]],
  ['Zustände', 'Sie gelten über viele Partien und treten zurück, wenn sie eben schon standen.', [
    ['serie', 'Die Flammen der laufenden Serie, die jüngste hell.', 'ein Sieger gewinnt mindestens zum dritten Mal in Folge'],
    ['wende', 'Die letzten zehn als Dominos, die Pleiten und der Sieg danach.', 'ein Sieger verlor davor mindestens fünfmal in Folge'],
    ['plus', 'Das Elo des Tages als Diagramm mit Achse: über null grün, darunter rot, am Ende der Wert.', 'ab der vierten Partie des Tages, nach einem Tief von mindestens −25'],
    ['hoehe', 'Das Elo des Tages als Diagramm mit Achse, die Linie bei +75 mit ihrem Wert, am Ende die Fahne und der Wert.', 'ein Sieger kommt heute zum ersten Mal über +75'],
    ['sprung', 'Die Elo-Kurve des Monats mit Achse, dieser Schritt in Gold, am Ende der Stand.', 'ab der achten Partie im Monat der größte Gewinn, mindestens 22'],
    ['halb', 'Die Siegquote des Monats mit Achse von 0 bis 100 % und der Linie bei 50 %.', 'ab der fünfzehnten Partie im Monat erreicht sie 50 % von unten'],
    ['partner', 'Eine Tabelle der Partner ab sechs Partien: Quote als Balken, Partien, und als Strich durch alle Balken die Quote mit allen zusammen.', 'mit diesem Partner die beste Quote, mindestens acht Partien, jede achte'],
    ['kalender', 'Der Monat als Kalender mit den Wochentagen, die Spieltage gefüllt, heute umrandet.', 'der 12., 16. oder 20. Spieltag im Monat'],
    ['premiere', 'Eine kleine Tabelle: der wievielte Partner es für jeden ist und wie viele Partien er schon hatte.', 'das erste gemeinsame Spiel eines Paars, gewonnen'],
    ['duoserie', 'Das Paar vor der Flammenkette.', 'die App meldet eine Serie zu zweit'],
    ['form10', 'Die letzten zehn als Dominos.', 'die App meldet ein Formhoch'],
    ['marathon', 'Jede Partie des Tages ein Stein, darunter Siege und Niederlagen.', 'die App meldet die 10., 15. … Partie eines Spielers am Tag'],
    ['pleiten', 'Eis statt Flammen, gedämpft.', 'die App meldet fünf oder mehr Niederlagen in Folge']]],
];
const FAKTEN = [
  ['erstsieg', 'Erster Sieg gegen einen', 'gegen einen der Verlierer nach mindestens drei Duellen ohne Sieg; ab fünf Pleiten in Folge meldet die App das als Fluch'],
  ['liebling', 'Serie gegen einen', 'ein Sieger gewinnt zum 8., 10., 12., 15., 20. … Mal in Folge gegen einen der Verlierer'],
  ['kippt', 'Bilanz gekippt', 'ab 16 Duellen führt der Sieger wieder, und zuletzt lag er vor mindestens zehn Duellen vorn oder nie'],
  ['siege', 'Runde Zahl an Siegen', 'der 50., 100., 150. … Sieg; die Zahl der Spiele meldet die App selbst'],
  ['woche', 'Die Woche übernommen', 'ein Sieger übernimmt die beste Siegquote der Woche, ab fünf Siegen'],
  ['plus', 'Ins Plus gedreht', 'ab der vierten Partie des Tages, nach einem Tief von mindestens −25 Elo'],
  ['westen', 'Zu null im Monat', 'das zweite, dritte … 10:0 im Monat'],
  ['hoehe', 'Höhenmeter', 'ein Sieger kommt heute zum ersten Mal über +75 Elo'],
  ['sprung', 'Größter Gewinn im Monat', 'ab der achten Partie im Monat der größte Gewinn, mindestens 22 Elo'],
  ['wende', 'Wende', 'ein Sieger verlor davor mindestens fünfmal in Folge; die App meldet das Verlieren, nicht sein Ende'],
  ['paarung', 'Dieselben vier', 'dieselben zwei Paare treffen zum 5., 10., 15. … Mal aufeinander'],
  ['halb', 'Wieder bei 50 %', 'ab der fünfzehnten Partie im Monat erreicht die Siegquote 50 % von unten'],
  ['partner', 'Der beste Partner', 'mit diesem Partner die beste Quote, mindestens acht Partien, jede achte'],
  ['premiere', 'Erstes gemeinsames Spiel', 'zwei gewinnen ihr erstes gemeinsames Spiel'],
  ['kalender', 'Spieltage im Monat', 'der 12., 16. oder 20. Spieltag eines Spielers im Monat']];
const zahlText = (key, zahl, moeglich) => `<span class="kf-zahl num"><b>${zahl[key] || 0}</b> von ${N.partien}${moeglich[key] ? ` · zutreffend ${moeglich[key]}` : ''}</span>`;
const regelKopf = ([key, was, wann]) => `<article class="kf-regel">
    <h4>${esc(KOPF_NAME[key])}</h4><p>${esc(was)}</p><dl><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Im Lauf</dt><dd>${zahlText(key, N.kopfZahl, N.moeglichK)}</dd></dl>
    <div class="kf-bsp-l">${(N.bsp.kopf[key] || []).map(k => bild(k)).join('')}</div></article>`;
const regelFuss = ([key, was, wann]) => `<article class="kf-regel">
    <h4>${esc(FUSS_NAME[key])}</h4><p>${esc(was)}</p><dl><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Im Lauf</dt><dd>${zahlText(key, N.fussZahl, N.moeglichF)}</dd></dl>
    <div class="kf-bsp-l">${(N.bsp.fuss[key] || []).map(k => bild(k)).join('')}</div></article>`;

// ── Die Verteilung ──────────────────────────────────────────────────
const verteilung = (zahl, namen, inFolge) => {
  const l = inFolge ? Object.keys(zahl) : Object.keys(zahl).sort((a, c) => zahl[c] - zahl[a]), max = Math.max(...l.map(k => zahl[k]));
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
  <p class="kf-ober">Die Karte einer Partie · Entwürfe, vierte Runde</p>
  <h1>Köpfe und Füße</h1>
  <p class="kf-lead">Der Kopf zeigt immer alle vier Gesichter und den Endstand: auf einen Blick ist klar, dass hier eine Partie gespielt wurde und wer sie gewann. Was er dazu zeigt, wechselt. Darunter steht jeder Anlass der Partie als Zeile, alle, die die App heute bündelt, und neue Fakten, wenn sie selten und spannend sind. Der Fuß zeichnet den schwersten davon. Gezeichnet aus den ${N.partien} echten Partien bis Oktober, mit den Anlässen, die der Generator der App für jede von ihnen schrieb, gewählt mit der Regel unten.</p>
  <div class="kf-kennz">
    <span><b class="num">${kopfZahl}</b> Köpfe</span><span><b class="num">${fussZahl}</b> Füße</span>
    <span><b class="num">${z((maxK / N.partien * 100).toFixed(1))} %</b> höchster Anteil eines Kopfs</span>
    <span><b class="num">${N.kopfFolge.max === 1 ? 'nie' : N.kopfFolge.max + '×'}</b> derselbe Kopf hintereinander</span>
    <span><b class="num">${N.fussFolge.max === 1 ? 'nie' : N.fussFolge.max + '×'}</b> derselbe Fuß hintereinander</span>
    <span><b class="num">${N.zeilen.mitNeu}</b> Karten mit einer neuen Zeile</span>
    ${PR ? `<span><b class="num">${PR.ueber + PR.raus + PR.ab + PR.umbruch}</b> Überschneidungen und Überläufe in ${PR.karten} Karten</span>` : ''}
  </div>
  <nav><a href="#tag">Ein Spieltag</a><a href="#anlaesse">Alle Anlässe</a><a href="#neu">Neue Zeilen</a><a href="#koepfe">Die Köpfe</a><a href="#fuesse">Die Füße</a><a href="#wahl">Die Auswahl</a></nav>
</header>

<section id="tag" class="kf-abschnitt">
  <h2>Ein Spieltag am Stück</h2>
  <p class="kf-satz-l">${esc(datum(N.tag.karten[0].t))}: alle ${N.tag.karten.length} Partien des Tages in ihrer Reihenfolge, so, wie der Feed sie zeigen würde. Kein Kopf steht zweimal hintereinander, und jeder Fuß erzählt etwas anderes.</p>
  <div class="kf-reihe">${N.tag.karten.map(k => bild(k)).join('')}</div>
</section>

<section id="anlaesse" class="kf-abschnitt">
  <h2>Alle Anlässe einer Partie</h2>
  <p class="kf-satz-l">Die App bündelt jeden Anlass einer Partie in deren Karte, wie bisher: die Schlagzeile nennt höchstens drei, der stärkste zuerst; jeder Anlass steht als Zeile darunter; der Fuß zeichnet den schwersten, der eine eigene Zeichnung hat. Auf der Karte stehen heute vier Zeilen und danach „und n weitere“, das Blatt zeigt alle. In diesen Entwürfen steht jede Zeile auf der Karte, ab der fünften enger. ${N.zeilen.karten - (N.zeilen.verteilung['0'] || 0)} von ${N.zeilen.karten} Karten tragen mindestens eine Zeile, ${Object.keys(N.zeilen.verteilung).filter(x => +x > 4).reduce((a, x) => a + N.zeilen.verteilung[x], 0)} mehr als vier, höchstens ${N.zeilen.max}. <span class="kf-legende"></span>Die Zeilen mit dem Strich links sind die neuen aus dem nächsten Abschnitt; in der App sähen sie aus wie jede andere.</p>
  <div class="kf-zwei">
    <div><h3>Zeilen je Karte</h3>${verteilung(Object.fromEntries(Object.keys(N.zeilen.verteilung).sort((a, b) => a - b).map(x => [x, N.zeilen.verteilung[x]])), Object.fromEntries(Object.keys(N.zeilen.verteilung).map(x => [x, (['keine', 'eine', 'zwei', 'drei', 'vier'][+x] || x) + (x === '1' ? ' Zeile' : ' Zeilen')])), true)}</div>
  </div>
  <h3>Die Karten mit den meisten Zeilen</h3>
  <div class="kf-bsp-l">${N.bsp.viele.map(k => bild(k)).join('')}</div>
</section>

<section id="neu" class="kf-abschnitt">
  <h2>Neue Zeilen</h2>
  <p class="kf-satz-l">Spannende Fakten, die die App heute nicht meldet, als Zeile unter der Schlagzeile. Kein Spam: jede Art hat eine Schwelle, die sie selten macht; was die App schon als Anlass sagt, sagt keine neue Zeile noch einmal; je Karte höchstens drei, die schwersten; je Tag jede Art höchstens zweimal und derselbe Spieler mit derselben Art einmal. So tragen ${N.zeilen.mitNeu} von ${N.zeilen.karten} Karten eine neue Zeile, ${N.zeilen.weg} fielen über die drei hinaus weg. Wo eine neue Zeile eine eigene Zeichnung hat, kann der Fuß sie zeigen.</p>
  <div class="kf-regeln">${FAKTEN.map(([key, name, wann]) => `<article class="kf-regel">
    <h4>${esc(name)}</h4><dl><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Im Lauf</dt><dd><span class="kf-zahl num"><b>${N.zeilen.je[key] || 0}</b> von ${N.partien}</span></dd></dl>
    <div class="kf-bsp-l">${(N.bsp.zeile[key] || []).slice(0, 1).map(k => bild(k)).join('')}</div></article>`).join('')}</div>
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
