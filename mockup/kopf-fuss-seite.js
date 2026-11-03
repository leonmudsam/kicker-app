// Baut `kopf-fuss.html`: die Karte einer Partie, sechste Runde. Jede Karte
// folgt der Regel des Katalogs (`kopf-fuss-katalog.js`): der Kopf zeigt, wie
// die Partie ausging, die Schlagzeile den Hauptanlass, der Fuß zeichnet ihn,
// darunter höchstens drei weitere Anlässe. Die Seite zeigt zuerst den Aufbau
// an einer Karte, dann jeden Kopf und jeden Fuß als Galerie, einen Spieltag
// am Stück, die Regel mit ihren Fällen und den Katalog.
//
//   node tools/build.mjs && node mockup/kopf-fuss-anlaesse.js && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js [ziel.html]
//
// Gezeichnet wird mit den Bildern der App, wo sie eines hat (`kopfHtml`,
// `fussHtml` aus dem Lauf); eigene Zeichnungen gibt es nur für die Köpfe und
// Füße, die die App nicht kennt (`KOPF_BILD`, `FUSS_BILD`). Rahmen, Zeilen,
// Namenszeile und Gesichter sind die der App aus `dist/index.html`.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {ANLASS, KOPF, THEMA} = require('./kopf-fuss-katalog.js');
const N = JSON.parse(fs.readFileSync(path.join(__dirname, '.kopf-fuss.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
const appCss = (html.slice(0, html.indexOf('</head>')).match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
  .map(s => s.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, '')).join('\n');

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nm = id => N.name[id] || '?';
const av = id => N.av[id] || '';
const ic = k => N.ic[k] || '';
const b = s => `<b>${esc(s)}</b>`;
const z = v => String(v).replace('.', ',');
const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
const uhr = t => new Date(t).toTimeString().slice(0, 5);
const datum = t => new Date(t).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
const monat = sid => new Date(sid + '-15T12:00:00').toLocaleDateString('de-DE', {month:'long'});
const anteil = n => z((n / N.partien * 100).toFixed(1)) + ' %';
let uid = 0;

// ── Die eigenen Köpfe ───────────────────────────────────────────────
// Jeder zeigt den Endstand und alle vier Gesichter, die Sieger links, und
// endet mit der Namenszeile der App (`.sp-nz`): „Jane, Leo schlagen
// Stefan, Maxi“. Mit „gegen“ las man den Sieger nur an der Helligkeit ab.
const namen = k => `<div class="sp-nz"><span class="w">${k.W.map(x => `<span>${b(nm(x))}</span>`).join('')}</span>`
  + `<span class="sp-nz-gg">schlagen</span><span class="re">${k.L.map(x => `<span>${b(nm(x))}</span>`).join('')}</span></div>`;
const paar = (ids, cls) => `<span class="kf-paar${cls ? ' ' + cls : ''}">${ids.map(av).join('')}</span>`;
const stand = k => `<span class="kf-stand num"><b>${k.hoch}</b><i>:</i><span>${k.tief}</span></span>`;
// Ein Paar mit dem, was die Partie jedem an Elo brachte: grün die Sieger,
// rot die Verlierer.
const seite = (k, w) => { const ids = w ? k.W : k.L;
  return `<div class="kf-tf-s${w ? ' w' : ''}">${paar(ids)}<span class="num">${ids.map(x => vz(k.delta[x])).join(' ')}</span></div>`; };
// Drei Zahlen als Leiste, wie unter einem Ergebnis im Fernsehen.
const leiste = l => `<div class="kf-stat">${l.map(([lab, v]) => `<span><b class="num">${esc(v)}</b><small>${esc(lab)}</small></span>`).join('')}</div>`;
const KOPF_BILD = {
  // Die Anzeigetafel: der Endstand auf Klappziffern, neben jedem Paar, was
  // die Partie ihm an Elo brachte, unter den Ziffern die Siegchance. Die
  // Leiste „Elo je Sieger“ ist fort: dieselbe Zahl stand schon neben dem
  // Paar.
  tafel:k => `<div class="kf-tafel">${seite(k, true)}
      <div class="kf-tf-m"><div class="kf-tf-z"><span class="kf-flap w"><b>${k.hoch}</b></span><i></i><span class="kf-flap"><b>${k.tief}</b></span></div>
        <small class="kf-tf-c num">Chance vorher ${k.chance} %</small></div>${seite(k, false)}
    </div>`,
  // Torpucks: jedes Tor ein Puck, die fehlenden als leere Ringe.
  pucks:k => {
    const reihe = (n, w) => Array.from({length:10}, (_, i) => `<i class="${i < n ? (w ? 'w' : 'l') : ''}"></i>`).join('');
    return `<div class="kf-pucks">
      <div class="kf-pk-z w">${paar(k.W)}<span class="kf-pk-r">${reihe(k.hoch, true)}</span><b class="num">${k.hoch}</b></div>
      <div class="kf-pk-z">${paar(k.L)}<span class="kf-pk-r">${reihe(k.tief, false)}<u style="--von:${k.tief}"></u></span><b class="num">${k.tief}</b></div>
    </div>`;
  },
  // Elo-Strom: was von den Verlierern zu den Siegern floss, als Ströme, so
  // breit wie die Punkte.
  strom:k => {
    const id = 'kfs' + (uid++), W = 240, Hh = 92, y = [15, 63];
    const breit = x => Math.max(2.5, Math.min(10, Math.abs(k.delta[x]) / 2.2));
    const pfad = (i, j) => `M${W - 32} ${y[j]}C${W / 2 + 16} ${y[j]},${W / 2 - 16} ${y[i]},32 ${y[i]}`;
    const stroeme = k.L.map((l, j) => k.W.map((w, i) => `<path class="kf-st-p" d="${pfad(i, j)}" stroke="url(#${id})" stroke-width="${breit(l).toFixed(1)}"/>`).join('')).join('');
    const sp = (x, i, w) => `<span class="kf-st-a${w ? ' w' : ''}" style="top:${y[i] - 15}px;${w ? 'left' : 'right'}:2px">${av(x)}<b class="num">${vz(k.delta[x])}</b></span>`;
    return `<div class="kf-strom"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="1" x2="0" y1="0" y2="0">
        <stop offset="0" stop-color="#f0566a"/><stop offset=".5" stop-color="#f7cf4a"/><stop offset="1" stop-color="#BEF264"/></linearGradient></defs>${stroeme}</svg>
      ${k.W.map((x, i) => sp(x, i, true)).join('')}${k.L.map((x, j) => sp(x, j, false)).join('')}
      <span class="kf-st-m">${stand(k)}</span></div>`;
  },
  // Das Herzschlagfinale, ein Tor Abstand: die Paare an den Enden, dazwischen
  // ein Herzschlag. Bei den Siegern schlägt er bis zum letzten Tor hoch, bei
  // den Verlierern zuckt er noch einmal und läuft flach aus. Darunter die
  // Chance vorher, das Elo je Sieger und der wievielte Krimi des Monats. Die
  // App zeigte zwei Klapptafeln mit „9 : 10“, die Verlierer links.
  krimi:k => {
    const W = 'M0 25H10l3-5 3 5h3l2 6 4-27 4 33 3-14h4q4-8 8 0H60';
    const L = 'M0 25h9l2-6 2 9 2-4h4l1 2 1-1H60';
    const pair = (ids, w) => `<span class="kf-kr-p${w ? ' w' : ''}">${ids.map(av).join('')}</span>`;
    return `<div class="kf-krimi">${pair(k.W, true)}
      <span class="kf-ekg w"><svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true"><path d="${W}"/></svg><i></i></span>
      <span class="kf-kr-m"><small>Ein Tor</small>${stand(k)}</span>
      <span class="kf-ekg"><svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true"><path d="${L}"/></svg></span>
      ${pair(k.L, false)}</div>`
      + leiste([['Chance vorher', k.chance + ' %'], ['Elo je Sieger', vz(Math.round(k.W.reduce((a, x) => a + k.delta[x], 0) / 2))],
        ['Krimi im Monat', k.krimiNr + '.']]);
  },
  // Zu null: unter jedem Paar das Tor, in das es traf — bei den Siegern
  // zehn Bälle im Netz unter der grünen Zehn, bei den Verlierern das leere,
  // goldene Tor unter der goldenen Null. Vorher stand das leere Tor links
  // unter den Siegern: gemeint war ihr eigenes, gelesen wurde „0 Tore“ unter
  // der Zehn. Darunter das Band in einer Zeile: das wievielte Zu null des
  // Monats; „kein Gegentor“ und „10 Gegentore“ sind fort, das sagt der Stand.
  zunull:k => {
    const netz = `<path class="kf-nt-n" d="${Array.from({length:11}, (_, i) => `M${16 + i * 6.8} 2V46`).join('')}${Array.from({length:8}, (_, i) => `M16 ${2 + i * 6.3}H84`).join('')}M6 10L16 2M94 10L84 2M6 54L16 46M94 54L84 46"/>`;
    const rahmen = `<path class="kf-nt-r" d="M6 55V10H94V55"/><path class="kf-nt-b" d="M2 55H98"/>`;
    const lage = [[17, 48.5], [27.5, 48.5], [38, 48.5], [48.5, 48.5], [59, 48.5], [69.5, 48.5], [80, 48.5], [32, 38.5], [42.5, 38.5], [53, 38.5]];
    const baelle = lage.map(([cx, cy], i) => `<circle class="kf-nt-ball" cx="${cx}" cy="${cy}" r="5" style="--i:${i}"/>`).join('');
    const id = 'kfn' + (uid++);
    return `<div class="kf-nul">
      <div class="kf-nul-p">${paar(k.W)}</div>
      <span class="kf-nul-z num"><b>${k.hoch}</b><i>:</i><u>0</u></span>
      <div class="kf-nul-p aus">${paar(k.L)}</div>
      <div class="kf-nul-tore"><svg class="kf-nul-t voll" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}b" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#f4ffd8"/><stop offset=".45" stop-color="#BEF264"/><stop offset="1" stop-color="#5f8a22"/></radialGradient></defs>
        ${netz}<g fill="url(#${id}b)">${baelle}</g>${rahmen}</svg>
      <svg class="kf-nul-t leer" viewBox="0 0 100 58" aria-hidden="true"><defs><radialGradient id="${id}" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#f7cf4a" stop-opacity=".32"/><stop offset="1" stop-color="#f7cf4a" stop-opacity="0"/></radialGradient></defs>
        <rect class="kf-nt-glut" x="6" y="6" width="88" height="50" fill="url(#${id})"/>${netz}${rahmen}</svg></div>
      <em class="kf-nul-b">${ic('weisseWeste')}<b>Zu null</b><small class="num">${k.westen}. im ${monat(k.sid)}</small></em>
    </div>`;
  }
};

// ── Die eigenen Füße ────────────────────────────────────────────────
// Nur für die Anlässe, die die App nicht zeichnet, im Rahmen ihrer Füße
// (`.sp-fk`) und mit ihrer kleinen Überschrift (`.sp-k`), die sagt, was
// die Achsen zeigen. Was der Fuß bedeutet, sagt die Schlagzeile oder, ist
// er nicht der Hauptanlass, der Titel über ihm; die eigene Überschrift mit
// Zeichen und Wert („Höhenmeter heute +75“) wiederholte sie.
const fk = (titel, inhalt) => `<div class="sp-k">${esc(titel)}</div>${inhalt}`;
// Ein Liniendiagramm: links die Achse mit runden Werten, unten Anfang und
// Ende, eine Bezugslinie mit ihrem Wert, die Linie 2 px, darunter eine
// Fläche in einem Zehntel ihrer Farbe, am Ende Punkt und Wert. Die Werte der
// Achse weichen der Bezugslinie aus.
const schritt = span => [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(s => span / s <= 4) || 1000;
function kurve(v, o){
  const W = 244, H = o.h || 78, LI = 30, RE = 34, OB = 8, UN = 15, n = v.length - 1, f = o.fmt || (y => String(y));
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
// Eine kleine Rangliste: Platz, Gesicht und Name, ein Balken von 0 bis
// `max`, der Wert und eine Zahl daneben; optional ein Strich für den Schnitt.
const rangTabelle = (l, o) => `<table class="kf-rl"><thead><tr><th></th><th></th><th></th><th>${esc(o.kopf[0])}</th><th>${esc(o.kopf[1])}</th></tr></thead><tbody>${l.map((q, i) =>
  `<tr class="${q.id === o.hervor ? 'an' : ''}"><td class="num">${i + 1}.</td><td>${av(q.id)}<span>${esc(nm(q.id))}</span></td>
   <td class="kf-rl-b"><i style="width:${Math.min(100, q.wert / o.max * 100).toFixed(1)}%"></i>${o.schnitt != null ? `<u style="left:${(o.schnitt / o.max * 100).toFixed(1)}%"></u>` : ''}</td>
   <td class="num">${esc(q.zahl)}</td><td class="num kf-rl-a">${esc(q.neben)}</td></tr>`).join('')}</tbody></table>`;
const FUSS_BILD = {
  // Die Bilanzkurve zweier über alle Duelle: nach jedem Duell, wie weit der
  // Sieger vorn (über null) oder hinten lag; der letzte Schritt kreuzt.
  kippt:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fk('Bilanz, Duell für Duell', `<div class="kf-lgz">${av(x.w)}<small>über null: ${esc(nm(x.w))} vorn</small>${av(x.l)}<small>darunter: ${esc(nm(x.l))}</small></div>`
      + kurve(v, {ref:0, zwei:true, fmt:vz, x:['1. Duell', `${n}. Duell`], ende:`${x.s}:${x.n - x.s}`, letzt:true})); },
  // Die Woche als Rangliste: Quote bis 100 %, Siege von Partien.
  woche:(k, x) => fk('Siegquote der Woche, ab fünf Siegen',
    rangTabelle(x.liste.map(q => ({id:q.pid, wert:q.q, zahl:q.q + ' %', neben:`${q.s}/${q.n}`})), {hervor:x.pid, max:100, kopf:['Quote', 'Siege']})),
  // Das Elo des Tages: über null grün, darunter rot.
  plus:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fk(`Elo heute, ${nm(x.pid)}`, kurve(v, {ref:0, zwei:true, fmt:vz, x:['Start', `${n}. Partie`]})); },
  // Das Elo des Tages mit der Linie bei +75 und einer Fahne am Ende.
  hoehe:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fk(`Elo heute, ${nm(x.pid)}`, kurve(v, {ref:75, lo:0, fmt:vz, x:['Start', `${n}. Partie`],
      extra:(X, Y) => `<path class="kf-fahne" d="M${X(n).toFixed(1)} ${(Y(v[n]) - 5).toFixed(1)}v-13l9 3.5-9 3.5"/>`})); },
  // Das Elo des Monats, dieser Schritt in Gold.
  monatsbest:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fk(`Elo im ${monat(k.sid)}, ${nm(x.pid)}`, kurve(v, {letzt:true, x:['1. Partie', `${n + 1}. Partie`], ende:`${v[n]}`})); },
  // Die Siegquote des Monats mit der Linie bei 50 %.
  halb:(k, x) => { const v = x.verlauf, n = v.length - 1;
    return fk(`Siegquote im ${monat(k.sid)}, ${nm(x.pid)}`, kurve(v, {ref:50, lo:0, hi:100, fmt:y => y + ' %', x:['1. Partie', `${n + 1}. Partie`]})); },
  // Die Partner als Rangliste, der Strich ist die Quote mit allen.
  partner:(k, x) => fk(`Siegquote je Partner, ${nm(x.pid)}`,
    rangTabelle(x.liste.map(q => ({id:q.pid, wert:q.q, zahl:q.q + ' %', neben:`${q.n} Sp.`})), {hervor:x.mit, max:100, schnitt:x.allg, kopf:['Quote', 'Partien']})
    + `<div class="kf-rl-lg"><i></i>${x.allg} % mit allen</div>`)
};
// Die Namen der Zeichnungen, für Galerie und Verteilung.
const BILD_NAME = {spitze:'Tabelle vorher und nachher', rang:'Tabelle vorher und nachher', medaille:'Medaille', serie:'Serie gegen den Bestwert',
  riss:'Gerissene Serie', gegner:'Duelle gegen einen', zaehlwerk:'Zählwerk', hoch:'Höchststand', duell:'Jede Begegnung', gipfel:'Gipfel der Tabelle',
  revanche:'Vorher und jetzt', chemie:'Duo-Ring', teamserie:'Duo-Serie', tagesring:'Tagesring', premiere:'Premiere', wende:'Elo-Kurve',
  rolle:'Seite der Rolle', rueckkehr:'Tage ohne Partie', ueberholt:'Überholt', uhr:'Uhr des Tages', duoserie:'Duo gegen Duo',
  kippt:'Bilanzkurve', woche:'Rangliste der Woche', plus:'Elo des Tages', hoehe:'Elo des Tages mit +75', monatsbest:'Elo des Monats',
  halb:'Siegquote des Monats', partner:'Partner-Rangliste'};
const bildName = f => BILD_NAME[String(f).replace(/^app:/, '')] || f;

// ── Die Karte ───────────────────────────────────────────────────────
// Kopf, Schlagzeile mit Satz, die Zeilen, der Fuß — in dieser Folge, und
// jeder Anlass höchstens einmal: der Hauptanlass in der Schlagzeile, der des
// Fußes (ist es ein anderer) als Titel über seiner Zeichnung, die übrigen
// als Zeilen, höchstens drei, der Rest als Zahl. `nr` setzt die Nummern
// des Aufbaus an Kopf, Schlagzeile, Zeilen und Fuß.
const gleich = (a, c) => !!a && !!c && a.art === c.art && a.text === c.text;
const nummer = (o, n) => o && o.nr ? `<b class="kf-nr" aria-hidden="true">${n}</b>` : '';
const zeile = a => `<div class="nf-sam-z${a.neg ? ' neg' : ''}${a.brk ? ' brk' : ''}${ANLASS[a.art].quelle === 'neu' ? ' kf-neu' : ''}">${a.html}`
  + (a.klasse ? `<b class="nf-sam-kl">${esc(a.klasse)}</b>` : '') + '</div>';
const zeilen = (k, o) => k.zeilen.length ? `<div class="nf-sam kf-sam">${k.zeilen.map(zeile).join('')}${k.weitere ? `<div class="nf-sam-m">+${k.weitere} weitere</div>` : ''}${nummer(o, 3)}</div>` : '';
const fussBild = k => k.fussHtml || `<div class="sp-fk kf-fk kf-f-${k.fuss.art}">${FUSS_BILD[k.fuss.art](k, k.fuss.x)}</div>`;
const fuss = (k, o) => {
  if(!k.fuss) return '';
  // Zeichnet der Fuß nicht den Hauptanlass, steht dessen Zeile als
  // Bildunterschrift darunter, klein: über dem Bild las sie sich wie eine
  // vierte Zeile, gleich nach „+ X weitere“.
  const titel = gleich(k.fuss, k.haupt) ? '' : `<div class="kf-fuss-t">${k.fuss.html}</div>`;
  return `<div class="kf-fuss-app${titel ? ' mit-t' : ''}">${fussBild(k)}${titel}${nummer(o, 4)}</div>`;
};
const kopfBild = k => k.kopfHtml ? `<div class="kf-kopf-app">${k.kopfHtml}</div>`
  : `<div class="kf-kopf kf-k-${k.kopf}">${KOPF_BILD[k.kopf](k)}${namen(k)}</div>`;
const karte = (k, o) => {
  o = o || {};
  // Der Satz gehört zur Schlagzeile: hat der Hauptanlass keinen, steht
  // keiner da. Vorher sprang der Satz des Ergebnisses ein, und unter „Jane
  // steht heute bei +75 Elo“ stand „Nur 1 Tor trennt beide Teams“ — eine
  // andere Nachricht, und die sagt schon der Kopf.
  const h = k.haupt, titel = h ? h.text : k.ergebnis.titel, satz = h ? h.satz : k.ergebnis.satz;
  return `<div class="nf-card nf-s-spiel nfc-highlight kf-karte${o.nr ? ' kf-anat' : ''}">
    <div class="nf-top"><span class="nf-rub"><i>${ic('spielfeld')}</i><b>AM SPIELTAG</b></span><span class="nf-when">${ic('clock')}${uhr(k.t)}</span></div>
    ${kopfBild(k)}${nummer(o, 1)}
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(titel)}</div>${satz ? `<div class="nf-d">${esc(satz)}</div>` : ''}</div><span class="nf-chev">${ic('chevron')}</span>${nummer(o, 2)}</div>
    ${zeilen(k, o)}${fuss(k, o)}
  </div>`;
};
const bild = (k, unter, o) => `<figure class="kf-bsp"><div class="nf-wrap nf-liste"><div class="nf-feed">${karte(k, o)}</div></div>
    <figcaption>${esc(datum(k.t))}, ${uhr(k.t)} · Kopf ${esc(KOPF[k.kopf].name)} · ${k.haupt ? 'Anlass ' + esc(ANLASS[k.haupt.art].name) : 'ohne Anlass'}${k.fuss ? ' · Fuß ' + esc(bildName(ANLASS[k.fuss.art].fuss)) : ''}${unter ? ' · ' + unter : ''}</figcaption></figure>`;
// Eine Kachel der Galerie: nur Kopf oder nur Fuß, im Rahmen einer Karte,
// darunter Name, Bedingung und Zahl.
const kachel = (inhalt, titel, wann, zahl) => `<figure class="kf-kachel"><div class="nf-wrap nf-liste"><div class="nf-feed"><div class="nf-card nf-s-spiel kf-karte kf-nur">${inhalt}</div></div></div>
    <figcaption><b>${esc(titel)}</b><span>${esc(wann)}</span>${zahl ? `<small class="num">${zahl}</small>` : ''}</figcaption></figure>`;

// ── Die Seite ───────────────────────────────────────────────────────
const S = N.stat;
const verteilung = (zahl, name, sortiert) => {
  const l = sortiert ? Object.keys(zahl) : Object.keys(zahl).sort((a, c) => zahl[c] - zahl[a]), max = Math.max(...l.map(k => zahl[k]));
  return `<div class="kf-vt">${l.map(k => `<div class="kf-vt-z"><span>${esc(name(k))}</span><span class="kf-vt-b"><i style="width:${(zahl[k] / max * 100).toFixed(1)}%"></i></span>
    <b class="num">${zahl[k]}</b><small class="num">${anteil(zahl[k])}</small></div>`).join('')}</div>`;
};
// Die Bilder der Füße zusammengefasst: dasselbe Bild für mehrere Anlässe
// (das Zählwerk für Siege, Elo und Spiele) ist eine Zeile.
const fussNachBild = {};
Object.keys(S.fuss).forEach(f => { const n = bildName(f); fussNachBild[n] = (fussNachBild[n] || 0) + S.fuss[f]; });
const QUELLE = [['app', 'Meldungen der App', 'Was der Generator zu einer Partie schreibt. Sie stehen heute schon als Zeilen im Bündel; hier zählen sie nach ihrem Gewicht.'],
  ['form', 'Formen der App', 'Was die App aus der Partie selbst liest und heute als Kopf oder Fuß zeigt. Sagt eine Meldung schon dasselbe, entfällt die Form.'],
  ['partie', 'Aus der Partie', 'Was die App heute nur als Fuß zeichnet, ohne Meldung. Hier bekommt es einen Satz.'],
  ['neu', 'Neu', 'Was die App weder meldet noch zeichnet. Jedes mit eigener Zeichnung.']];
const anlassTabelle = q => `<table class="kf-kat"><thead><tr><th>Anlass</th><th>Thema</th><th>Wann</th><th class="num">Gewicht</th><th>Zeichnung</th>
    <th class="num">trifft zu</th><th class="num">Schlagzeile</th><th class="num">Fuß</th><th class="num">Zeile</th><th class="num">weitere</th><th class="num">nur Blatt</th></tr></thead><tbody>
  ${Object.keys(ANLASS).filter(a => ANLASS[a].quelle === q).map(a => { const x = ANLASS[a];
    return `<tr><td><b>${esc(x.name)}</b>${x.zustand ? '<small>Zustand</small>' : ''}${x.neg ? '<small>Pleite</small>' : ''}${x.gewicht < 30 ? '<small>Nebensache</small>' : ''}</td>
      <td>${esc(THEMA[x.thema])}</td><td>${esc(x.wann)}${x.deckt ? `<small>entfällt neben: ${esc(x.deckt.map(d => ANLASS[d].name).join(', '))}</small>` : ''}</td>
      <td class="num">${x.gewicht}</td><td>${x.fuss ? esc(bildName(x.fuss)) + (x.fuss.startsWith('app:') ? '' : ' <small>neu</small>') : '<small>keine</small>'}</td>
      <td class="num">${S.zutreffend[a] || 0}</td><td class="num">${S.haupt[a] || 0}</td><td class="num">${S.alsFuss[a] || 0}</td><td class="num">${S.alsZeile[a] || 0}</td><td class="num">${S.alsWeitere[a] || 0}</td><td class="num">${S.alsNeben[a] || 0}</td></tr>`; }).join('')}
  </tbody></table>`;
let PR = null;
try { PR = JSON.parse(fs.readFileSync(path.join(__dirname, '.kopf-fuss-pruef.json'), 'utf8')); } catch(e){}
const proz = n => Math.round(n / N.partien * 100) + ' %';

// Die Galerie der Köpfe: je Kopf seine jüngste Karte, nur der Kopf.
const kopfKachel = k => { const x = (N.bsp.kopf[k] || [])[0]; if(!x) return '';
  return kachel(kopfBild(x), KOPF[k].name, KOPF[k].wann === 'immer' ? 'reihum' : KOPF[k].wann, `${S.kopf[k] || 0} Karten · ${anteil(S.kopf[k] || 0)}`); };
// Die Galerie der Füße: je Zeichnung eine Kachel mit der jüngsten Karte,
// auf der sie den Hauptanlass zeichnet; darunter alle Anlässe, die sie
// tragen, in der Gruppe ihrer ersten Quelle.
const ZEICHNUNG = {};
Object.keys(ANLASS).filter(a => ANLASS[a].fuss).forEach(a => { const f = ANLASS[a].fuss; (ZEICHNUNG[f] = ZEICHNUNG[f] || []).push(a); });
const fussKachel = f => { const arten = ZEICHNUNG[f];
  const a = arten.find(x => N.bsp.fuss[x] && gleich(N.bsp.fuss[x].fuss, N.bsp.fuss[x].haupt)) || arten.find(x => N.bsp.fuss[x]);
  if(!a) return '';
  const n = arten.reduce((s, y) => s + (S.alsFuss[y] || 0), 0);
  return kachel(`<div class="kf-fuss-app">${fussBild(N.bsp.fuss[a])}</div>`, bildName(f), arten.map(y => ANLASS[y].name).join(' · '), `${n} Karten`); };
const fussGruppen = [['app', 'Zu den Meldungen der App'], ['form', 'Formen der App'], ['partie', 'Aus der Partie'], ['neu', 'Neu in diesem Entwurf']]
  .map(([q, t]) => [t, Object.keys(ZEICHNUNG).filter(f => ANLASS[ZEICHNUNG[f][0]].quelle === q)]).filter(g => g[1].length);

// Die Fälle der Regel, je mit einem Satz.
const F = N.bsp.faelle;
const fall = (k, satz) => k ? `<div class="kf-fall"><p>${satz}</p>${bild(k)}</div>` : '';
const nebenSatz = k => k && k.neben && k.neben.length ? ` Nur im Blatt: ${k.neben.map(t => '„' + esc(t) + '“').join(', ')}.` : '';

const seiteHtml = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Köpfe und Füße</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${appCss}</style>
<style>${fs.readFileSync(path.join(__dirname, 'kopf-fuss.css'), 'utf8')}</style>
</head><body class="kf-seite">
<header class="kf-held">
  <p class="kf-ober">Die Karte einer Partie · Entwürfe, sechste Runde</p>
  <h1>Köpfe und Füße</h1>
  <p class="kf-lead">Eine Partie, eine Karte, eine Ordnung: oben, wie es ausging, darunter der wichtigste Anlass mit seiner Zeichnung, dazwischen höchstens drei weitere. Die Sieger stehen immer links. Gerechnet an den ${N.partien} echten Partien bis Oktober.</p>
  <div class="kf-kennz">
    <span><b class="num">${Object.keys(KOPF).length}</b> Köpfe</span>
    <span><b class="num">${Object.keys(ZEICHNUNG).length}</b> Füße</span>
    <span><b class="num">${Object.keys(ANLASS).length}</b> Anlässe in ${Object.keys(THEMA).length} Themen</span>
    <span><b class="num">${z(S.zeilenSchnitt.toFixed(1))}</b> Zeilen je Karte</span>
    <span><b class="num">${proz(S.weitere)}</b> der Karten mit „+ weitere“</span>
    <span><b class="num">${S.kopfFolge === 1 ? 'nie' : S.kopfFolge + '×'}</b> derselbe Kopf zweimal hintereinander</span>
    ${PR ? `<span><b class="num">${PR.ueber + PR.raus + PR.ab + PR.umbruch}</b> Überschneidungen in ${PR.karten} Karten</span>` : ''}
  </div>
  <nav><a href="#aufbau">Aufbau</a><a href="#koepfe">Köpfe</a><a href="#fuesse">Füße</a><a href="#tag">Ein Spieltag</a><a href="#regel">Die Regel</a><a href="#katalog">Katalog</a><a href="#verteilung">Verteilung</a></nav>
</header>

<section id="aufbau" class="kf-abschnitt">
  <h2>So ist eine Karte gebaut</h2>
  <div class="kf-aufbau">
    ${N.bsp.anatomie ? bild(N.bsp.anatomie, '', {nr:true}) : ''}
    <ol class="kf-teile">
      <li><b>Kopf · wie es ausging.</b> Endstand und alle vier Gesichter, die Sieger links. Die Zeile darunter sagt es in Worten: „schlagen“. Ein besonderer Ausgang hat sein festes Bild, sonst wechseln die Grundansichten. Der Kopf zeigt nie einen Anlass.</li>
      <li><b>Schlagzeile · der Hauptanlass.</b> Der schwerste Anlass der Partie, der keine Pleite ist. Gibt es keinen, ist das Ergebnis die Schlagzeile.</li>
      <li><b>Zeilen · höchstens drei.</b> Die nächsten Anlässe, ein neues Thema zuerst. Mehr steht als „+ X weitere“. Eine Nebensache steht nur im Blatt.</li>
      <li><b>Fuß · die Zeichnung zum Anlass.</b> Meist zeichnet er die Schlagzeile. Stand dieselbe Zeichnung eben schon, zeichnet er den nächsten Anlass, dann mit dessen Zeile als Titel.</li>
    </ol>
  </div>
</section>

<section id="koepfe" class="kf-abschnitt">
  <h2>Die Köpfe</h2>
  <p class="kf-satz-l">Ein besonderer Ausgang hat immer dasselbe Bild, in dieser Rangfolge, außer er stand auf einer der zwei Karten davor. Sonst kommt die Grundansicht, die am längsten nicht dran war. Neu sind Anzeigetafel, Torpucks, Elo-Strom, Zu null und das Herzschlagfinale; die übrigen zeichnet die App, hier mit den Siegern links.</p>
  <h3>Besondere Ausgänge</h3>
  <div class="kf-galerie">${Object.keys(KOPF).filter(k => KOPF[k].art === 'ausgang').map(kopfKachel).join('')}</div>
  <h3>Grundansichten</h3>
  <div class="kf-galerie">${Object.keys(KOPF).filter(k => KOPF[k].art === 'grund').map(kopfKachel).join('')}</div>
</section>

<section id="fuesse" class="kf-abschnitt">
  <h2>Die Füße</h2>
  <p class="kf-satz-l">Jede Zeichnung einmal, an der jüngsten Karte, auf der sie den Hauptanlass zeichnet. Unter dem Namen stehen alle Anlässe, die sie tragen.</p>
  ${fussGruppen.map(([t, l]) => `<h3>${esc(t)}</h3><div class="kf-galerie">${l.map(fussKachel).join('')}</div>`).join('')}
</section>

<section id="tag" class="kf-abschnitt">
  <h2>Ein Spieltag am Stück</h2>
  <p class="kf-satz-l">${esc(datum(N.tag.karten[0].t))}: alle ${N.tag.karten.length} Partien des Tages in ihrer Reihenfolge, so, wie der Feed sie zeigen würde. <span class="kf-legende"></span>Zeilen mit dem Strich links sind neu in diesem Entwurf; in der App sähen sie aus wie jede andere.</p>
  <div class="kf-reihe">${N.tag.karten.map(k => bild(k)).join('')}</div>
</section>

<section id="regel" class="kf-abschnitt">
  <h2>Die Regel</h2>
  <p class="kf-satz-l">Alles steht in einem Katalog (<code>kopf-fuss-katalog.js</code>): jeder Anlass und jeder Kopf mit Name, Thema, Gewicht, Zeichnung und Bedingung. Die Karte entsteht in fünf Schritten.</p>
  <ol class="kf-schritte">
    <li><b>Sammeln.</b> Jede Meldung der App zur Partie, jede Form der App, die aus der Partie zutrifft, und die neuen Fakten. Was dieselbe Sache sagt, steht einmal.</li>
    <li><b>Gewichten.</b> Jede Art hat ein festes Gewicht. Ein Zustand (Serie, Rivalität, Form) verliert 20, wenn er auf einer der drei Karten davor Hauptanlass war.</li>
    <li><b>Schlagzeile.</b> Der schwerste Anlass, der keine Pleite ist. Gibt es nur Pleiten, ist das Ergebnis die Schlagzeile.</li>
    <li><b>Fuß.</b> Die Zeichnung des schwersten Anlasses, der eine hat, also meist des Hauptanlasses. Stand dieselbe Zeichnung eben schon, die des nächsten; dann steht dessen Zeile als Titel über ihr.</li>
    <li><b>Zeilen.</b> Die übrigen, höchstens drei, ein neues Thema zuerst; mehr steht als „+ X weitere“. Eine Nebensache (Gewicht unter 30) steht nur im Blatt.</li>
  </ol>
  <h3>Die Fälle</h3>
  <div class="kf-faelle">
    ${fall(F.weitere, `<b>Mehr als drei.</b> Die drei schwersten, je ein anderes Thema, der Rest als Zahl.${nebenSatz(F.weitere)}`)}
    ${fall(F.fussTitel, `<b>Der Fuß zeichnet einen anderen Anlass.</b> Die Zeichnung der Schlagzeile stand auf der Karte davor; der Fuß nimmt den nächsten und trägt dessen Zeile als Titel.${nebenSatz(F.fussTitel)}`)}
    ${fall(F.neben, `<b>Nebensachen nur im Blatt.</b> Was leicht wiegt, macht die Karte nicht länger.${nebenSatz(F.neben)}`)}
    ${fall(F.ohne, `<b>Kein Anlass.</b> Das Ergebnis ist die Schlagzeile, eine Pleite steht als Zeile darunter.${nebenSatz(F.ohne)}`)}
  </div>
  <h3>Vorher und jetzt</h3>
  <div class="kf-tab-w"><table class="kf-kat kf-vgl"><thead><tr><th></th><th>Die App heute</th><th>Dieser Entwurf</th></tr></thead><tbody>
    <tr><td>Kopf</td><td>Sieger links oder rechts, je nach Seite; „gegen“</td><td>Sieger immer links; „schlagen“</td></tr>
    <tr><td>Schlagzeile</td><td>bis drei Anlässe, bis 96 Zeichen</td><td>der Hauptanlass</td></tr>
    <tr><td>Zeilen</td><td>vier, dann „und n weitere“; auch der Anlass der Schlagzeile und des Fußes</td><td>höchstens drei, ein neues Thema zuerst, dann „+ X weitere“; Nebensachen nur im Blatt</td></tr>
    <tr><td>Anlass des Fußes noch einmal als Zeile</td><td class="num">${S.appDoppelt} von ${N.partien} Karten</td><td class="num">0</td></tr>
  </tbody></table></div>
  <h3>Ergänzen</h3>
  <p class="kf-satz-l">Ein neuer Anlass ist eine Zeile in <code>ANLASS</code> mit Thema und Gewicht. Kommt er aus der App, nennt er den Typ ihrer Meldung oder ihre Form, und die Zeichnung der App kommt mit. Ist er neu, steht seine Bedingung in <code>neueFakten</code> (<code>kopf-fuss-lauf.js</code>) und seine Zeichnung in <code>FUSS_BILD</code> (<code>kopf-fuss-seite.js</code>). Ein neuer Kopf ist eine Zeile in <code>KOPF</code> und, ist er neu, ein Eintrag in <code>KOPF_BILD</code>. Sonst ändert sich nichts.</p>
</section>

<section id="katalog" class="kf-abschnitt">
  <h2>Der Katalog</h2>
  <p class="kf-satz-l">Jede Art mit Thema, Bedingung, Gewicht und Zeichnung, und wie oft sie in den ${N.partien} Partien zutraf, Schlagzeile war, im Fuß stand, als Zeile stand, unter „+ weitere“ fiel oder als Nebensache nur im Blatt stand.</p>
  ${QUELLE.map(([q, titel, satz], i) => `<details class="kf-det"${i === 0 ? ' open' : ''}><summary>${esc(titel)} <small class="num">${Object.keys(ANLASS).filter(a => ANLASS[a].quelle === q).length}</small></summary>
    <p class="kf-satz-l">${esc(satz)}</p><div class="kf-tab-w">${anlassTabelle(q)}</div></details>`).join('')}
  <details class="kf-det"><summary>Die Köpfe <small class="num">${Object.keys(KOPF).length}</small></summary>
    <div class="kf-tab-w"><table class="kf-kat"><thead><tr><th>Kopf</th><th>Art</th><th>Wann</th><th>Zeichnung</th><th class="num">Karten</th><th class="num">Anteil</th></tr></thead><tbody>
    ${Object.keys(KOPF).map(k => `<tr><td><b>${esc(KOPF[k].name)}</b></td><td>${KOPF[k].art === 'ausgang' ? 'Ausgang, Rang ' + KOPF[k].vorrang : 'Grundansicht'}</td><td>${esc(KOPF[k].wann)}</td><td>${KOPF[k].quelle === 'app' ? 'der App' : 'neu'}</td>
      <td class="num">${S.kopf[k] || 0}</td><td class="num">${anteil(S.kopf[k] || 0)}</td></tr>`).join('')}</tbody></table></div></details>
</section>

<section id="verteilung" class="kf-abschnitt">
  <h2>Verteilung</h2>
  <div class="kf-zwei">
    <div><h3>Köpfe</h3>${verteilung(S.kopf, k => KOPF[k].name)}</div>
    <div><h3>Füße nach Zeichnung</h3>${verteilung(fussNachBild, k => k)}</div>
    <div><h3>Schlagzeilen nach Anlass, die häufigsten zwölf</h3>${verteilung(Object.fromEntries(Object.entries(S.haupt).sort((a, c) => c[1] - a[1]).slice(0, 12)), a => ANLASS[a].name)}</div>
    <div><h3>Zeilen je Karte</h3>${verteilung(Object.fromEntries(['0', '1', '2', '3'].map(x => [x, S.zeilen[x] || 0])), x => (['keine', 'eine', 'zwei', 'drei'][+x]) + (x === '1' ? ' Zeile' : ' Zeilen'), true)}</div>
  </div>
  <p class="kf-satz-l">In zehn Karten am Stück stand derselbe Kopf höchstens ${S.kopfFenster.max}-mal (${esc(KOPF[S.kopfFenster.wer].name)}), dieselbe Fuß-Zeichnung höchstens ${S.fussFenster.max}-mal (${esc(bildName(S.fussFenster.wer))}). Derselbe Kopf stand ${S.kopfFolge === 1 ? 'nie' : 'höchstens ' + S.kopfFolge + '-mal'} hintereinander, dieselbe Fuß-Zeichnung höchstens ${S.fussFolge}-mal. ${S.ohneFuss} Karten haben keinen Fuß, weil keiner ihrer Anlässe eine Zeichnung hat; ${S.fussNichtHaupt} zeichnen einen anderen Anlass als die Schlagzeile. ${S.neben} Nebensachen stehen nur im Blatt.</p>
  ${PR ? `<h3>Gemessen</h3><p class="kf-satz-l">Jeder Kopf und jeder Anlass mit Zeichnung ist an jeder Partie gezeichnet, an der er zutrifft: ${PR.karten} Karten, in Chromium nachgemessen. ${PR.raus} Teile ragen über Kopf, Zeilen oder Fuß hinaus, ${PR.ueber} überschneiden sich, ${PR.ab} Namen oder Zahlen sind abgeschnitten, ${PR.umbruch} Beschriftungen brechen um. Die Wappen der App stehen hier als einfache Gesichter, damit die Seite leicht bleibt.</p>` : ''}
</section>
<script>
// Bewegung nur im Bild: eine Karte läuft, wenn sie hereinkommt; davor
// steht sie still, auf dem ersten Bild ihrer Bewegung.
(() => { const io = 'IntersectionObserver' in window && new IntersectionObserver(l => l.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('im-bild'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -12% 0px'});
  document.querySelectorAll('.kf-karte').forEach(c => io ? io.observe(c) : c.classList.add('im-bild')); })();
</script>
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'kopf-fuss.html'), seiteHtml);
if(process.argv[2]) fs.writeFileSync(process.argv[2], seiteHtml.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head><body class="kf-seite">/, '<div class="kf-seite">').replace(/<\/body><\/html>$/, '</div>'));
console.log('kopf-fuss.html · ' + Math.round(seiteHtml.length / 1024) + ' kB');

// Die Prüfseite (KF_ALLE=daten.json KF_ALLE_HTML=ziel.html): jede Variante
// aus dem Lauf als eigene Karte. Sie wird nicht veröffentlicht.
if(process.env.KF_ALLE && process.env.KF_ALLE_HTML){
  const A = JSON.parse(fs.readFileSync(process.env.KF_ALLE, 'utf8'));
  fs.writeFileSync(process.env.KF_ALLE_HTML, seiteHtml.replace(/<body class="kf-seite">[\s\S]*<\/body>/,
    `<body class="kf-seite"><div class="kf-reihe" style="flex-wrap:wrap">${A.karten.map(k => bild(k)).join('')}</div></body>`));
  console.log('Prüfseite · ' + A.karten.length + ' Karten');
}
