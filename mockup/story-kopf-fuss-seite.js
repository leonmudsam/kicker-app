// Der Teil „Neue Köpfe und Füße" der Übersicht: Entwürfe für die Karte einer
// Partie, gezeichnet als ganze Karte aus echten Partien (`.story-neu.json`,
// Abschnitt `kf`, aus `story-neu-lauf.js`). Der Kopf zeigt immer alle vier
// und das Ergebnis aus Sicht der Sieger, wie die Köpfe der App; darunter die
// Namenszeile, die Schlagzeile und der Fuß, in den Klassen der App
// (`sp-fk`, `sp-nz`, `sp-lg`). Neu ist, was im Kopf und im Fuß steht.
//
// Gebraucht von `story-logik-seite.js`; allein gerufen tut die Datei nichts.
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function neueKoepfe(esc){
  const datei = path.join(__dirname, '.story-neu.json');
  if(!fs.existsSync(datei)) return null;
  const N = JSON.parse(fs.readFileSync(datei, 'utf8'));
  if(!N.kf) return null;
  const nm = id => N.name[id] || '?';
  const av = id => N.av[id] || '';
  const ic = k => N.ic[k] || '';
  const b = s => `<b>${esc(s)}</b>`;
  const z = v => String(v).replace('.', ',');
  const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
  const datum = t => new Date(t + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
  const uhr = t => new Date(t).toTimeString().slice(0, 5);
  const monat = sid => new Date(sid + '-15T12:00:00').toLocaleDateString('de-DE', {month:'long'});
  const stand = k => `<b class="sp-st num"><em>${k.hoch}</em>:${k.tief}</b>`;
  const flamme = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-3 1-3s.5 2 2 2c-1-3 2-4 2-9z"/></svg>`;

  // ── Die Köpfe ─────────────────────────────────────────────────────
  // Vier Spalten, die Sieger links, die Verlierer rechts, das Ergebnis in
  // der Mitte; unter jedem Gesicht, was der Kopf über ihn weiß.
  const spalten = (k, unter, mitte) => `<div class="sk-vier">
      ${k.W.map(x => `<div class="sk-sp w">${av(x)}${unter(x, true)}</div>`).join('')}
      <div class="sk-mitte">${mitte || stand(k)}</div>
      ${k.L.map(x => `<div class="sk-sp">${av(x)}${unter(x, false)}</div>`).join('')}
    </div>`;
  const kopf = {
    serien:k => `<em class="sk-k-t">Serie gegen Serie</em>${spalten(k, (x, sieg) => {
      const s = k.vor[x].serie;
      if(!s) return `<span class="sk-fl aus">–</span>`;
      return sieg ? `<span class="sk-fl">${flamme}<b class="num">${s}</b><i>→ ${s + 1}</i></span>`
        : `<span class="sk-fl riss">${flamme}<b class="num">${s}</b><i>endet</i></span>`; })}`,
    form:k => {
      const f = x => k.vor[x].letzte.reduce((a, c) => a + c, 0), fw = k.W.reduce((a, x) => a + f(x), 0), fl = k.L.reduce((a, x) => a + f(x), 0);
      return `<em class="sk-k-t">Gegen die Form <span class="num">${fw} aus 10</span> gegen <span class="num">${fl} aus 10</span></em>${spalten(k, x =>
        `<span class="sk-punkte">${k.vor[x].letzte.map(r => `<i class="${r ? 's' : 'n'}"></i>`).join('')}</span><small class="num">${f(x)}/5</small>`)}`;
    },
    tag:k => `<em class="sk-k-t">Der Tag bis hierher</em>${spalten(k, (x, sieg) => {
      const e = k.vor[x].tagElo, folge = e.map((v, i) => v - (i ? e[i - 1] : 0) > 0 ? 1 : 0);
      return `<span class="sk-punkte">${folge.map(r => `<i class="${r ? 's' : 'n'}"></i>`).join('')}<i class="${sieg ? 's' : 'n'} jetzt"></i></span>`
        + `<small class="num">${k.vor[x].tag.s + (sieg ? 1 : 0)}:${k.vor[x].tag.n - k.vor[x].tag.s + (sieg ? 0 : 1)}</small>`; })}`,
    kreuz:k => {
      const zelle = (w, l) => { const c = k.kreuz.find(q => q.w === w && q.l === l) || {s:0, n:0};
        return `<span class="sk-kz ${c.s * 2 < c.n ? 'n' : c.s * 2 > c.n ? 's' : ''}"><b class="num">${c.s}:${c.n - c.s}</b></span>`; };
      const s = k.kreuz.reduce((a, c) => a + c.s, 0), n = k.kreuz.reduce((a, c) => a + c.n, 0);
      return `<em class="sk-k-t">Die vier Einzelduelle vorher</em><div class="sk-kreuz">
        <div class="sk-kreuz-m"><span></span>${k.L.map(av).join('')}
          ${k.W.map(w => `${av(w)}${k.L.map(l => zelle(w, l)).join('')}`).join('')}</div>
        <div class="sk-kreuz-r">${stand(k)}<small>vorher <b class="num">${s}:${n - s}</b> in Einzelduellen</small></div></div>`;
    },
    grund:k => spalten(k, () => ''),
  };

  // ── Die Füße ──────────────────────────────────────────────────────
  const linie = (v, o) => {
    const W = 300, H0 = o.h || 64, lo = Math.min(...v, o.lo != null ? o.lo : Infinity), hi = Math.max(...v, o.hi != null ? o.hi : -Infinity);
    const X = i => 6 + i * (W - 12) / Math.max(1, v.length - 1), Y = y => 6 + (hi - y) * (H0 - 14) / Math.max(1, hi - lo);
    const d = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('');
    return {W, H0, X, Y, d};
  };
  const fuss = {
    plus:(k, x) => {
      const v = x.verlauf, L = linie(v, {lo:0, hi:0}), n = v.length - 1, tief = Math.min(...v);
      return `<div class="sk-fuss"><div class="sk-f-k"><span>${av(x.pid)}${b(nm(x.pid))}</span><em class="num">Tagestief ${vz(tief)}, jetzt <b>${vz(v[n])}</b></em></div>
        <svg class="sn-svg" viewBox="0 0 ${L.W} ${L.H0}"><clipPath id="skp-${k.mid}"><rect x="0" y="${L.Y(0)}" width="${L.W}" height="${L.H0}"/></clipPath>
          <path class="sn-flaeche-neg" clip-path="url(#skp-${k.mid})" d="${L.d}L${L.X(n)} ${L.Y(0)}L${L.X(0)} ${L.Y(0)}Z"/>
          <line class="sn-null" x1="6" x2="${L.W - 6}" y1="${L.Y(0)}" y2="${L.Y(0)}"/><path class="sn-linie" d="${L.d}"/>
          <path class="sn-linie pos" d="M${L.X(n - 1)} ${L.Y(v[n - 1])}L${L.X(n)} ${L.Y(v[n])}"/><circle class="sn-pos" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/></svg>
        <div class="sp-lg">${b(nm(x.pid))} lag heute bei ${vz(tief)} Elo und steht nach der ${n}. Partie des Tages im Plus.</div></div>`;
    },
    // Die ersten fünf als Liste, je mit dem Abstand zu Platz 1 als Balken:
    // auf einer gemeinsamen Elo-Linie lagen gerade die Nahen übereinander,
    // und um die geht es.
    spitze:(k, x) => {
      const l = x.liste, max = l[0].elo, weit = Math.max(1, ...l.map(q => max - q.elo));
      const r = l.findIndex(q => q.id === x.pid), gap = max - l[r].elo;
      return `<div class="sk-fuss"><div class="sk-f-k"><span>${av(x.pid)}${b(nm(x.pid))}</span><em class="num">Abstand zu Platz 1</em></div>
        <div class="sk-bars">${l.map((q, i) => `<div class="sk-bar ${q.id === x.pid ? 'heute' : ''}${i === 0 ? ' eins' : ''}"><span>${i + 1}. ${esc(nm(q.id))}</span>
          <span class="sk-bar-b"><i style="width:${i ? Math.max(3, (max - q.elo) / weit * 100) : 0}%"></i></span><b class="num">${i ? '−' + (max - q.elo) : q.elo}</b></div>`).join('')}</div>
        <div class="sp-lg">${b(nm(x.pid))} steht jetzt auf Platz ${r + 1}, ${gap} Elo hinter ${b(nm(l[0].id))}.</div></div>`;
    },
    halb:(k, x) => {
      const v = x.verlauf, L = linie(v, {lo:0, hi:100}), n = v.length - 1;
      return `<div class="sk-fuss"><div class="sk-f-k"><span>${av(x.pid)}${b(nm(x.pid))}</span><em class="num">Siegquote im ${esc(monat(k.sid))}</em></div>
        <svg class="sn-svg" viewBox="0 0 ${L.W} ${L.H0}"><line class="sn-null" x1="6" x2="${L.W - 6}" y1="${L.Y(50)}" y2="${L.Y(50)}"/>
          <text class="sn-t sn-klein" x="${L.W - 6}" y="${L.Y(50) - 3}" text-anchor="end">50 %</text>
          <path class="sn-linie" d="${L.d}"/><circle class="sn-pos" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/></svg>
        <div class="sp-lg">${b(nm(x.pid))} steht nach ${x.n} Partien im ${esc(monat(k.sid))} wieder bei ${v[n]} Prozent.</div></div>`;
    },
    partner:(k, x) => `<div class="sk-fuss"><div class="sk-f-k"><span>${av(x.pid)}${b(nm(x.pid))}</span><em>Siegquote mit jedem Partner</em></div>
        <div class="sk-bars">${x.liste.slice(0, 5).map(q => `<div class="sk-bar ${q.pid === x.mit ? 'heute' : ''}"><span>${esc(nm(q.pid))}</span>
          <span class="sk-bar-b"><i style="width:${q.q}%"></i><u style="left:${x.allg}%"></u></span><b class="num">${q.q} %</b></div>`).join('')}</div>
        <div class="sp-lg">Mit ${b(nm(x.mit))} gewinnt ${b(nm(x.pid))} ${x.liste.find(q => q.pid === x.mit).q} Prozent, im Schnitt ${x.allg}. Kein Partner bringt mehr.</div></div>`,
    sprung:(k, x) => {
      const v = x.verlauf, L = linie(v, {}), n = v.length - 1;
      return `<div class="sk-fuss"><div class="sk-f-k"><span>${av(x.pid)}${b(nm(x.pid))}</span><em class="num">Elo im ${esc(monat(k.sid))}</em></div>
        <svg class="sn-svg" viewBox="0 0 ${L.W} ${L.H0}"><path class="sn-linie" d="${L.d}"/>
          <path class="sn-linie gold dick" d="M${L.X(n - 1)} ${L.Y(v[n - 1])}L${L.X(n)} ${L.Y(v[n])}"/>
          <circle class="sn-gold" cx="${L.X(n)}" cy="${L.Y(v[n])}" r="3.5"/><text class="sn-t sk-gold" x="${L.X(n)}" y="${Math.max(10, L.Y(v[n]) - 8)}" text-anchor="end">+${x.gewinn}</text></svg>
        <div class="sp-lg">${b('+' + x.gewinn)} Elo, der größte Sprung von ${b(nm(x.pid))} in diesem Monat.</div></div>`;
    },
  };

  // ── Schlagzeilen ──────────────────────────────────────────────────
  const und = ids => ids.map(nm).join(' und ');
  const titel = k => {
    if(k.kopfZeigt === 'serien'){
      const w = k.W.filter(x => k.vor[x].serie >= 3).sort((a, c) => k.vor[c].serie - k.vor[a].serie)[0];
      const l = k.L.filter(x => k.vor[x].serie >= 3).sort((a, c) => k.vor[c].serie - k.vor[a].serie)[0];
      return `${nm(w)} baut die Serie auf ${k.vor[w].serie + 1} aus, die ${k.vor[l].serie}er-Serie von ${nm(l)} endet`;
    }
    if(k.kopfZeigt === 'form') return `${und(k.W)} gewinnen gegen die Form`;
    if(k.kopfZeigt === 'tag') return `${und(k.W)} holen den ersten Sieg des Tages`;
    if(k.kopfZeigt === 'kreuz') return `${und(k.W)} siegen gegen die eigene Bilanz`;
    return `${und(k.W)} gewinnen gegen ${und(k.L)}`;
  };

  const karte = k => {
    const f = ['spitze', 'plus', 'sprung', 'halb', 'partner'].find(x => k.fuss.includes(x));
    return `<div class="nf-card nf-s-spiel nfc-highlight sn-karte sk-karte">
      <div class="nf-top"><span class="nf-rub"><i>${ic('trendUp')}</i><b>AM SPIELTAG</b></span><span class="nf-when">${ic('clock')}${uhr(k.t)}</span></div>
      <div class="sp-fk sk-kopf">${kopf[k.kopfZeigt](k)}</div>
      <div class="sp-nz"><span class="w">${k.W.map(x => `<span><b>${esc(nm(x))}</b></span>`).join('')}</span><span class="sp-nz-gg">gegen</span>
        <span class="re">${k.L.map(x => `<span><b>${esc(nm(x))}</b></span>`).join('')}</span></div>
      <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(titel(k))}</div></div><span class="nf-chev">${ic('chevron')}</span></div>
      ${f ? fuss[f](k, k[f][0]) : `<div class="sk-fuss sk-leer"><div class="sp-lg">Kein neuer Fuß in dieser Partie: hier bleibt der Fuß der App, ${esc(appName(k.app && k.app.fuss))}.</div></div>`}
    </div>`;
  };

  // Die Namen der Köpfe und Füße der App, für den Vergleich unter jeder Karte.
  const APP = {tacho:'Tacho', muenze:'Münzwurf', tauziehen:'Tauziehen', abstand:'Abstand', zeile:'Ergebniszeile', feld:'Spielfeld',
    mosaik:'Mosaik', streu:'Streuung', gefaelle:'Gefälle', transfer:'Transfer', krimi:'Krimi', deutlich:'Klarer Sieg',
    aussenseiter:'Außenseiter', weste:'Weiße Weste', chemie:'Chemie', medaille:'Auszeichnung', gegner:'Gegner', rang:'Rangsprung',
    riss:'Serienbruch', zaehlwerk:'Zählwerk', spitze:'Spitzenwechsel', serie:'Serie', teamserie:'Duo-Serie', duell:'Rivalität',
    hoch:'Höchststand', revanche:'Revanche', tagesring:'Tagesring', premiere:'Premiere', rolle:'Rolle', wende:'Wende',
    verteilung:'Verteilung', uhr:'Uhr des Tages', ueberholt:'Überholt', duoserie:'Duo gegen Duo', gipfel:'Gipfel',
    nerven:'Nerven', rueckkehr:'Rückkehr'};
  const appName = k => k ? (APP[k] || k) : 'keiner';

  // ── Regeln ────────────────────────────────────────────────────────
  const Z = N.kf.zahl, je = x => `${Z[x] || 0} von ${N.partien} Partien`;
  const KOEPFE = [
    ['serien', 'Serie gegen Serie', 'Zwei laufende Serien treffen aufeinander, eine geht weiter, eine reißt. Unter jedem Gesicht die Serie vor der Partie, bei den Siegern mit dem nächsten Schritt, bei den Verlierern als Ende.',
      'Auf beiden Seiten bringt mindestens einer eine Siegesserie von drei oder mehr mit.', '36', 'Der Fuß „Serie" zeigt eine Serie, nicht das Aufeinandertreffen zweier.'],
    ['form', 'Gegen die Form', 'Die letzten fünf Partien jedes Spielers als Punkte: wer mit Form kam und wer ohne, und wer trotzdem gewann.',
      'Alle vier haben fünf Partien davor; die Sieger holten daraus zusammen höchstens drei Siege, die Verlierer mindestens sieben.', '34', 'Außenseiter rechnet mit der Siegchance aus Elo, nicht mit der Form der letzten Tage.'],
    ['tag', 'Erster Sieg des Tages', 'Wie der Tag bis hierher lief, Partie für Partie, die heutige als letzter Punkt; daneben die Tagesbilanz nach der Partie.',
      'Beide Sieger haben heute noch nicht gewonnen und zusammen mindestens vier Partien gespielt.', '46', 'Der Tagesring zählt die Siege eines guten Tages; hier ist es das Gegenteil.'],
    ['kreuz', 'Kreuzduelle', 'Die vier Einzelduelle zwischen den Siegern und den Verlierern, jedes mit der Bilanz aller Partien gegeneinander davor; rot, wo der Sieger hinten lag.',
      'Mindestens 16 Einzelduelle vorher, von denen die Sieger höchstens 35 Prozent gewannen.', '28', 'Der Fuß „Gegner" nennt ein einzelnes Duell (Fluch, Lieblingsgegner), nicht alle vier.'],
  ];
  const FUESSE = [
    ['spitze', 'Abstand zur Spitze', 'Was der Sieg für das Titelrennen heißt: die ersten fünf auf einer Elo-Linie, der Abstand zu Platz 1 als Klammer.',
      'Ein Sieger steht danach auf Platz 2 oder 3, höchstens 10 Elo hinter Platz 1, hat mit der Partie mindestens 10 gutgemacht; nur in einer belastbaren Tabelle.', '34', '„Überholt" zeigt, an wem jemand vorbeizog, nicht wie nah die Spitze ist.'],
    ['plus', 'Ins Plus gedreht', 'Das Elo des Tages Partie für Partie, unter null rot, die Partie, die ins Plus dreht, grün.',
      'Ab der vierten Partie des Tages; der Spieler lag heute bei mindestens −30 und steht nach der Partie über null.', '30', 'Neu: kein Fuß rechnet heute mit dem Tag als Konto.'],
    ['sprung', 'Größter Sprung des Monats', 'Die Elo-Kurve des Monats eines Siegers mit diesem Schritt in Gold.',
      'Ab der achten Partie im Monat; der Gewinn ist der größte des Spielers in diesem Monat und mindestens 25.', '26', '„Transfer" vergleicht mit der ganzen Liga, dieser Fuß mit dem eigenen Monat.'],
    ['halb', 'Wieder bei 50 Prozent', 'Die Siegquote des Monats Partie für Partie, die Linie bei 50 Prozent, der Punkt, an dem sie erreicht wird.',
      'Ab der zehnten Partie im Monat; die Quote lag davor unter 50 und erreicht sie mit diesem Sieg. Über 50 springt sie mit einem Sieg nie.', '22', 'Neu: die Siegquote steht heute nur im Profil.'],
    ['partner', 'Der beste Partner', 'Die Siegquote eines Siegers mit jedem Partner (ab sechs Partien), der heutige hervorgehoben, der eigene Schnitt als Strich.',
      'Der gemeinsame Sieg ist ein fünfter (5., 10., 15. …), mindestens acht gemeinsame Partien, die Quote mindestens 15 Punkte über dem eigenen Schnitt, und kein anderer Partner liegt höher.', '24', '„Chemie" zeigt das Duo, dieser Fuß die Wahl eines Spielers unter allen Partnern.'],
  ];
  const regel = ([id, name, was, wann, rang, abgrenzung]) => `<article class="sk-regel">
      <h4>${esc(name)}</h4><p>${esc(was)}</p>
      <dl class="sl-fakten"><dt>Wann</dt><dd>${esc(wann)}</dd><dt>Rang</dt><dd>${esc(rang)} (wie Rückkehr 32, Chemie 26, Uhr 24)</dd>
        <dt>Abgrenzung</dt><dd>${esc(abgrenzung)}</dd><dt>Gemessen</dt><dd>${esc(je(id))}</dd></dl></article>`;

  const html = `<section id="kopf-fuss" class="sl-abschnitt">
    <h2>Neue Köpfe und Füße</h2>
    <p class="sl-satz-l">Entwürfe für die Karte einer Partie. Der Kopf zeigt wie bisher alle vier und das Ergebnis aus Sicht der Sieger, darunter die Namen; neu ist, was er über die vier weiß. Der Fuß sagt, was die Partie bedeutet. Jede Karte ist eine echte Partie, in der Kopf und Fuß beide ausgelöst hätten; die Regeln sind an allen ${N.partien} Partien gezählt. Wie bei den Köpfen der App ginge ein besonderer Ausgang (Krimi, klarer Sieg, Außenseiter, weiße Weste) vor, und ein neuer Kopf stünde nach seinem Rang unter den Befunden; ein neuer Fuß stünde nach seinem Rang unter den Ereignissen der Partie. Unter jeder Karte steht, was die App in dieser Partie heute zeigt.</p>
    <div class="sl-bsp-l">${N.kf.bsp.map(k => `<figure class="sl-bsp"><div class="nf-wrap nf-liste"><div class="nf-feed">${karte(k)}</div></div>
      <figcaption class="sl-bsp-c"><span>${esc(datum(k.tag))}, ${uhr(k.t)}</span><span>Kopf: ${esc((KOEPFE.find(q => q[0] === k.kopfZeigt) || ['', 'Ergebnis'])[1])}</span>
        ${k.fuss.length ? `<span>Fuß: ${esc(k.fuss.map(f => (FUESSE.find(q => q[0] === f) || ['', f])[1]).join(', '))}</span>` : ''}
        ${k.app ? `<span class="sk-heute">Heute in der App: Kopf ${esc(appName(k.app.kopf))}, Fuß ${esc(appName(k.app.fuss))}</span>` : ''}</figcaption></figure>`).join('')}</div>
    <h3 class="sl-gruppe">Die Köpfe</h3><div class="sk-regeln">${KOEPFE.map(regel).join('')}</div>
    <h3 class="sl-gruppe">Die Füße</h3><div class="sk-regeln">${FUESSE.map(regel).join('')}</div>
  </section>`;

  const css = `
.sk-kopf{display:flex;flex-direction:column;gap:7px}
.sk-k-t{font:600 8.5px 'Sometype Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-style:normal}
.sk-k-t .num{color:var(--ink2)}
.sk-vier{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto repeat(2,minmax(0,1fr));align-items:start;gap:4px}
.sk-sp{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.sk-sp .av{--av:26px!important;width:26px!important;height:26px!important;font-size:10px!important}
.sk-sp:not(.w) .av{opacity:.75}
.sk-mitte{align-self:center;padding:0 4px}
.sk-mitte .sp-st{font-size:26px}
.sk-fl{display:flex;align-items:center;gap:2px;font-size:10px;color:var(--ink2)}
.sk-fl svg{width:13px;height:13px;fill:var(--orange)}
.sk-fl b{font:400 13px 'Archivo Black',sans-serif;color:var(--ink)}
.sk-fl i{font-style:normal;color:var(--acid);font-size:9.5px;white-space:nowrap}
.sk-fl.riss svg{fill:var(--faint)}.sk-fl.riss b{color:var(--muted);text-decoration:line-through}.sk-fl.riss i{color:var(--red)}
.sk-fl.aus{color:var(--faint)}
.sk-punkte{display:flex;gap:2px}
.sk-punkte i{width:7px;height:7px;border-radius:2px;background:var(--red);opacity:.85}
.sk-punkte i.s{background:var(--acid)}
.sk-punkte i.jetzt{outline:1.5px solid var(--ink);outline-offset:1px}
.sk-sp small{font-size:9.5px;color:var(--muted)}
.sk-kreuz{display:flex;align-items:center;justify-content:space-between;gap:10px}
.sk-kreuz-m{display:grid;grid-template-columns:26px repeat(2,46px);gap:4px;align-items:center;justify-items:center}
.sk-kreuz-m .av{--av:22px!important;width:22px!important;height:22px!important;font-size:8.5px!important}
.sk-kz{width:46px;padding:4px 0;border-radius:6px;background:var(--surface3);text-align:center;font-size:12px;color:var(--ink2)}
.sk-kz.n{background:rgba(240,86,106,.16);color:var(--red)}.sk-kz.s{background:rgba(190,242,100,.12);color:var(--acid)}
.sk-kreuz-r{display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right}
.sk-kreuz-r small{font-size:10px;color:var(--muted);max-width:120px}
.sk-fuss{padding:10px 13px 10px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:6px;margin-top:4px}
.sk-fuss .sp-lg{margin-top:0}
.sk-heute{flex-basis:100%;color:var(--sl-ink2)}
.sk-f-k{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--ink2)}
.sk-f-k>span{display:flex;align-items:center;gap:5px}.sk-f-k .av{--av:18px;width:18px;height:18px;font-size:7px}
.sk-f-k em{font:500 10px 'Sometype Mono',monospace;color:var(--muted);font-style:normal}.sk-f-k em b{color:var(--acid)}
.sn-linie.pos{stroke:var(--acid);stroke-width:2.2}.sn-linie.dick{stroke-width:2.6}
.sk-klammer{fill:none;stroke:var(--gold);stroke-width:1.4}
.sk-gold{fill:var(--gold)}.sk-acid{fill:var(--acid);font-weight:700}.sk-grau{fill:var(--line2)}
.sk-bars{display:flex;flex-direction:column;gap:4px}
.sk-bar{display:grid;grid-template-columns:76px minmax(0,1fr) 38px;align-items:center;gap:8px;font-size:11px;color:var(--muted)}
.sk-bar-b{position:relative;height:7px;border-radius:4px;background:var(--surface3)}
.sk-bar-b i{position:absolute;inset:0 auto 0 0;border-radius:4px;background:var(--line2)}
.sk-bar-b u{position:absolute;top:-3px;bottom:-3px;width:1.5px;background:var(--ink2)}
.sk-bar.heute{color:var(--ink)}.sk-bar.heute .sk-bar-b i{background:var(--acid)}.sk-bar b{text-align:right;color:var(--ink2)}
.sk-bar.eins{color:var(--gold)}.sk-bar.eins b{color:var(--gold)}
.sk-regeln{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px 24px}
.sk-regel{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--sl-linie);padding-top:12px;font-size:14px;color:var(--sl-ink2)}
.sk-regel h4{font-family:var(--sl-display);font-size:17px;letter-spacing:0;text-transform:none;color:var(--sl-ink);margin:0}`;
  return {html, css, nav:'<a href="#kopf-fuss">Kopf &amp; Fuß</a>'};
};
