// Der Teil „Neue Stories" der Übersicht: Entwürfe für Anlässe und Grafiken,
// die es in der App noch nicht gibt, gezeichnet aus `.story-neu.json`
// (`story-neu-lauf.js`). Jede Karte steht im Rahmen der App (dieselben
// Klassen wie im Feed: Rubrik, Schlagzeile, Satz); neu ist die Zeichnung
// darin, und sie rechnet mit den echten Zahlen des Laufs.
//
// Gebraucht von `story-logik-seite.js`; allein gerufen tut die Datei nichts.
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function neueStories(esc){
  const datei = path.join(__dirname, '.story-neu.json');
  if(!fs.existsSync(datei)) return null;
  const N = JSON.parse(fs.readFileSync(datei, 'utf8'));
  const nm = id => N.name[id] || '?';
  const av = id => N.av[id] || '';
  const ic = k => N.ic[k] || '';
  const z = v => String(v).replace('.', ',');
  const vz = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + z(Math.abs(v));
  const datum = t => new Date(typeof t === 'string' ? t + 'T12:00:00' : t).toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit'});
  const kurz = t => new Date(typeof t === 'string' ? t + 'T12:00:00' : t).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) ;
  const uhr = t => new Date(t).toTimeString().slice(0, 5);
  const monat = sid => new Date(sid + '-15T12:00:00').toLocaleDateString('de-DE', {month:'long'});

  // Der Rahmen einer Karte wie im Feed.
  const karte = o => `<div class="nf-card nf-s-${o.sorte || 'fakt'} nfc-${o.cat || 'fun'} sn-karte">
    <div class="nf-top"><span class="nf-rub"><i>${ic(o.ic)}</i><b>${esc(o.rub)}</b></span>
      <span class="nf-when">${ic('clock')}${esc(o.when)}</span></div>
    <div class="sn-bild">${o.bild}</div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(o.title)}</div>${o.desc ? `<div class="nf-d">${o.desc}</div>` : ''}</div>
      <span class="nf-chev">${ic('chevron')}</span></div>
  </div>`;
  const b = s => `<b>${esc(s)}</b>`;

  // ── 1. Der Elo-Fluss des Tages ────────────────────────────────────
  // Links, wer abgab, rechts, wer nahm; jedes Band so breit wie das, was
  // zwischen den beiden floss.
  const flussBild = f => {
    const strom = f.strom.slice(0, 7);
    const links = [...new Set(strom.map(s => s.von))], rechts = [...new Set(strom.map(s => s.zu))];
    const summe = (ids, k) => ids.map(id => strom.filter(s => s[k] === id).reduce((n, s) => n + s.v, 0));
    const W = 320, H0 = 150, gap = 8, x0 = 74, x1 = W - 74, bw = 8;
    const ges = Math.max(summe(links, 'von').reduce((a, c) => a + c, 0), summe(rechts, 'zu').reduce((a, c) => a + c, 0));
    const skal = (H0 - gap * (Math.max(links.length, rechts.length) - 1)) / ges;
    const lage = (ids, k) => { let y = 4; return ids.map((id, i) => { const h = summe(ids, k)[i] * skal; const o = {id, y, h}; y += h + gap; return o; }); };
    const L = lage(links, 'von'), R = lage(rechts, 'zu');
    const offL = {}, offR = {};
    const baender = strom.map(s => {
      const l = L.find(x => x.id === s.von), r = R.find(x => x.id === s.zu), h = s.v * skal;
      const y0 = l.y + (offL[s.von] || 0), y1 = r.y + (offR[s.zu] || 0);
      offL[s.von] = (offL[s.von] || 0) + h; offR[s.zu] = (offR[s.zu] || 0) + h;
      const mx = (x0 + x1) / 2;
      return `<path class="sn-band" d="M${x0 + bw} ${y0}C${mx} ${y0} ${mx} ${y1} ${x1 - bw} ${y1}L${x1 - bw} ${y1 + h}C${mx} ${y1 + h} ${mx} ${y0 + h} ${x0 + bw} ${y0 + h}Z"/>`;
    }).join('');
    const knoten = (A, x, k, seite) => A.map(n => `<rect class="${seite === 'l' ? 'sn-neg' : 'sn-pos'}" x="${x}" y="${n.y}" width="${bw}" height="${Math.max(2, n.h)}" rx="2"/>`
      + `<text class="sn-t" x="${seite === 'l' ? x - 6 : x + bw + 6}" y="${n.y + n.h / 2 + 4}" text-anchor="${seite === 'l' ? 'end' : 'start'}">${esc(nm(n.id))}`
      + ` <tspan class="${seite === 'l' ? 'sn-tneg' : 'sn-tpos'}">${vz(f.netto[n.id])}</tspan></text>`).join('');
    return `<svg class="sn-svg" viewBox="0 0 ${W} ${H0 + 8}" role="img" aria-label="Elo-Fluss des Tages">${baender}${knoten(L, x0, 'von', 'l')}${knoten(R, x1 - bw, 'zu', 'r')}</svg>`;
  };

  // ── 2. Die Bilanz kippt ───────────────────────────────────────────
  const kipptBild = k => {
    const v = k.verlauf, W = 320, H0 = 110, n = v.length - 1;
    const lo = Math.min(...v, -1), hi = Math.max(...v, 1);
    const X = i => 10 + i * (W - 20) / n, Y = y => 8 + (hi - y) * (H0 - 16) / (hi - lo);
    const linie = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('');
    const siege = (n + k.stand) / 2;
    return `<div class="sn-kopfzeile"><span>${av(k.neu)}${b(nm(k.neu))}</span><span class="num sn-gross">${siege}:${n - siege}</span><span>${b(nm(k.alt))}${av(k.alt)}</span></div>
      <svg class="sn-svg" viewBox="0 0 ${W} ${H0}" role="img" aria-label="Verlauf der direkten Bilanz">
        <clipPath id="sno-${k.mid}"><rect x="0" y="0" width="${W}" height="${Y(0)}"/></clipPath>
        <clipPath id="snu-${k.mid}"><rect x="0" y="${Y(0)}" width="${W}" height="${H0}"/></clipPath>
        <path class="sn-flaeche-pos" clip-path="url(#sno-${k.mid})" d="${linie}L${X(n)} ${Y(0)}L${X(0)} ${Y(0)}Z"/>
        <path class="sn-flaeche-neg" clip-path="url(#snu-${k.mid})" d="${linie}L${X(n)} ${Y(0)}L${X(0)} ${Y(0)}Z"/>
        <line class="sn-null" x1="10" x2="${W - 10}" y1="${Y(0)}" y2="${Y(0)}"/>
        <path class="sn-linie" d="${linie}"/>
        <circle class="sn-pos" cx="${X(n)}" cy="${Y(v[n])}" r="4"/>
        <text class="sn-t sn-klein" x="10" y="${H0 - 2}">1. Duell</text>
        <text class="sn-t sn-klein" x="${W - 10}" y="${H0 - 2}" text-anchor="end">${n}. Duell</text>
      </svg>`;
  };

  // ── 3. Jagd auf den Rekord ────────────────────────────────────────
  const jagdBild = j => {
    const zellen = Array.from({length:j.rekord + 1}, (_, i) => i < j.s ? '<i class="voll"></i>'
      : i === j.rekord ? '<i class="ziel"></i>' : '<i></i>').join('');
    return `<div class="sn-jagd"><div class="sn-jagd-k"><span>${av(j.pid)}${b(nm(j.pid))}</span>
        <span class="num sn-gross">${j.s}<small> Siege in Folge</small></span></div>
      <div class="sn-zellen" style="--n:${j.rekord + 1}">${zellen}</div>
      <div class="sn-jagd-f"><span>Rekord ${b(String(j.rekord))}: ${j.halter.map(x => esc(nm(x))).join(' und ')}</span>
        <span>${j.art === 'gleich' ? 'gleichauf, der nächste Sieg ist Rekord' : 'noch ' + (j.rekord - j.s) + ' bis gleichauf'}</span></div></div>`;
  };

  // ── 4. Gegen die Erwartung ────────────────────────────────────────
  const erwBild = w => {
    const l = w.liste.slice(0, 6), max = Math.max(...l.map(x => x.n));
    return `<div class="sn-erw">${l.map(x => {
      const a = x.e / max * 100, e = x.s / max * 100, lo = Math.min(a, e), hi = Math.max(a, e);
      return `<div class="sn-erw-z"><span class="sn-erw-n">${av(x.pid)}${esc(nm(x.pid))}</span>
        <span class="sn-erw-b"><i class="sn-erw-s ${x.d >= 0 ? 'pos' : 'neg'}" style="left:${lo}%;width:${hi - lo}%"></i>
          <i class="sn-erw-e" style="left:${a}%"></i><i class="sn-erw-w ${x.d >= 0 ? 'pos' : 'neg'}" style="left:${e}%"></i></span>
        <span class="num ${x.d >= 0 ? 'sn-tpos' : 'sn-tneg'}">${vz(x.d)}</span></div>`; }).join('')}
      <div class="sn-erw-l"><span><i class="sn-erw-e"></i> erwartet</span><span><i class="sn-erw-w pos"></i> gewonnen</span></div></div>`;
  };

  // ── 5. Die Woche in Plätzen ───────────────────────────────────────
  const platzBild = p => {
    const W = 320, H0 = 150, sp = p.spalten.length, n = Math.max(...p.zeilen.flatMap(z => z.platz.filter(Boolean)));
    const X = i => 58 + i * (W - 116) / (sp - 1), Y = r => 8 + (r - 1) * (H0 - 16) / Math.max(1, n - 1);
    const zeile = z => {
      const hv = z.pid === p.auf.pid ? 'auf' : z.pid === p.ab.pid ? 'ab' : '';
      const pkt = z.platz.map((r, i) => r ? [X(i), Y(r)] : null).filter(Boolean);
      if(!pkt.length) return '';
      const erst = z.platz.find(Boolean), letzt = [...z.platz].reverse().find(Boolean);
      return `<g class="sn-bump ${hv}"><path d="${pkt.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('')}"/>`
        + pkt.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="${hv ? 3.2 : 2.2}"/>`).join('')
        + `<text x="${X(0) - 8}" y="${Y(erst) + 3.5}" text-anchor="end">${esc(nm(z.pid))}</text>`
        + `<text x="${X(sp - 1) + 8}" y="${Y(letzt) + 3.5}">${letzt}.</text></g>`;
    };
    const tage = p.spalten.map((s, i) => `<text class="sn-t sn-klein" x="${X(i)}" y="${H0 + 10}" text-anchor="middle">${esc(datum(s.tag).slice(0, 2))}</text>`).join('');
    const sort = p.zeilen.slice().sort((a, c) => (a.pid === p.auf.pid || a.pid === p.ab.pid ? 1 : 0) - (c.pid === p.auf.pid || c.pid === p.ab.pid ? 1 : 0));
    return `<svg class="sn-svg" viewBox="0 0 ${W} ${H0 + 14}" role="img" aria-label="Plätze der Woche">${sort.map(zeile).join('')}${tage}</svg>`;
  };

  // ── 6. Die Spitze rückt zusammen ──────────────────────────────────
  const engBild = e => {
    const v = e.verlauf, W = 320, H0 = 96, n = v.length - 1, hi = Math.max(...v, 10);
    const X = i => 10 + i * (W - 20) / Math.max(1, n), Y = y => 6 + (hi - y) * (H0 - 18) / hi;
    const pfad = v.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join('');
    const imax = v.indexOf(Math.max(...v));
    return `<div class="sn-kopfzeile"><span>${av(e.eins.id)}${b(nm(e.eins.id))} <span class="num">${e.eins.elo}</span></span>
        <span class="num sn-gross">${e.gap}<small> Elo</small></span><span><span class="num">${e.zwei.elo}</span> ${b(nm(e.zwei.id))}${av(e.zwei.id)}</span></div>
      <svg class="sn-svg" viewBox="0 0 ${W} ${H0}" role="img" aria-label="Vorsprung von Platz 1 vor Platz 2 im Monat">
        <path class="sn-flaeche-gold" d="${pfad}L${X(n)} ${Y(0)}L${X(0)} ${Y(0)}Z"/><path class="sn-linie gold" d="${pfad}"/>
        <line class="sn-null" x1="10" x2="${W - 10}" y1="${Y(0)}" y2="${Y(0)}"/>
        <circle class="sn-gold" cx="${X(imax)}" cy="${Y(v[imax])}" r="3"/><text class="sn-t sn-klein" x="${X(imax)}" y="${Y(v[imax]) - 6}" text-anchor="middle">${v[imax]}</text>
        <circle class="sn-gold" cx="${X(n)}" cy="${Y(v[n])}" r="4"/>
        <text class="sn-t sn-klein" x="10" y="${H0 - 1}">Tabelle freigegeben</text><text class="sn-t sn-klein" x="${W - 10}" y="${H0 - 1}" text-anchor="end">jetzt</text>
      </svg>`;
  };

  // ── 7. Kurz vor der Marke ─────────────────────────────────────────
  const zur = x => (x.art === 'Partie' ? 'bis zur ' : 'bis zum ') + x.marke + '. ' + x.art;
  const ring = x => {
    const r = 26, u = 2 * Math.PI * r, schritt = x.art === 'Tor' ? 20 : 3;
    const anteil = Math.max(.08, 1 - x.fehlt / (schritt + 1));
    return `<div class="sn-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="sn-ring-g" cx="32" cy="32" r="${r}"/>
        <circle class="sn-ring-v" cx="32" cy="32" r="${r}" stroke-dasharray="${(u * anteil).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 32 32)"/></svg>
      <b class="num">${x.fehlt}</b><span>${av(x.pid)}${esc(nm(x.pid))}</span><small>${zur(x)}</small></div>`;
  };

  // ── 8. Die Uhr der Liga ───────────────────────────────────────────
  // Ein Zifferblatt von 12 bis 24 Uhr wie eine Uhr: die Liga spielt gemessen
  // nur zwischen 12 und 21 Uhr. Auf einem Kreis über 24 Stunden stand die 12
  // unten, und alle Partien drängten sich links unten zusammen.
  const uhrBild = (je, sid) => {
    const max = Math.max(...je), ges = je.reduce((a, c) => a + c, 0), spitze = je.indexOf(max);
    const c = 80, r0 = 24, r1 = 72, w = h => ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
    const p = (rr, ww) => (c + rr * Math.cos(ww)).toFixed(1) + ' ' + (c + rr * Math.sin(ww)).toFixed(1);
    const balken = je.map((v, h) => {
      if(!v || h < 12) return '';
      const a = w(h) + .03, e = w(h + 1) - .03, r = r0 + (r1 - r0) * v / max;
      return `<path class="${h === spitze ? 'sn-gold' : 'sn-uhr-b'}" d="M${p(r0, a)}L${p(r, a)}A${r} ${r} 0 0 1 ${p(r, e)}L${p(r0, e)}A${r0} ${r0} 0 0 0 ${p(r0, a)}Z"/>`;
    }).join('');
    const striche = Array.from({length:12}, (_, i) => `<line class="sn-null" x1="${p(r1 + 2, w(i)).split(' ')[0]}" y1="${p(r1 + 2, w(i)).split(' ')[1]}" x2="${p(r1 + 6, w(i)).split(' ')[0]}" y2="${p(r1 + 6, w(i)).split(' ')[1]}"/>`).join('');
    const marken = [12, 15, 18, 21].map(h => `<text class="sn-t sn-klein" x="${p(82, w(h)).split(' ')[0]}" y="${(+p(82, w(h)).split(' ')[1] + 3).toFixed(1)}" text-anchor="middle">${h}</text>`).join('');
    return `<div class="sn-uhr"><svg class="sn-svg" viewBox="-8 -8 176 176" role="img" aria-label="Anstoßzeiten im ${esc(monat(sid))}">
        <circle class="sn-null-k" cx="${c}" cy="${c}" r="${r1}"/>${striche}${balken}${marken}
        <text class="sn-uhr-z" x="${c}" y="${c + 4}" text-anchor="middle">${spitze}</text><text class="sn-t sn-klein" x="${c}" y="${c + 16}" text-anchor="middle">Uhr</text></svg>
      <div class="sn-uhr-t"><b class="num sn-gross">${Math.round(max / ges * 100)} %</b><span>der ${ges} Partien im ${esc(monat(sid))} begannen zwischen ${spitze} und ${spitze + 1} Uhr</span></div></div>`;
  };

  // ── 9. Halbzeit gegen den Vormonat ────────────────────────────────
  const halbBild = h => {
    const W = 320, H0 = 150, l = h.zeilen, auf = l[0], ab = l[l.length - 1];
    const Y = q => 8 + (100 - q) * (H0 - 16) / 100, xa = 92, xb = W - 92;
    // Liegen die beiden Hervorgehobenen links dicht beieinander, rücken ihre
    // Namen auseinander: sonst stand „Henry 46 %" über „Jannik 43 %".
    const eng = Math.abs(Y(auf.vor) - Y(ab.vor)) < 12, ver = z => !eng ? 0 : (z === auf) === (Y(auf.vor) <= Y(ab.vor)) ? -6 : 6;
    const zeile = z => { const k = z === auf ? 'auf' : z === ab ? 'ab' : '';
      return `<g class="sn-bump ${k}"><path d="M${xa} ${Y(z.vor)}L${xb} ${Y(z.jetzt)}"/><circle cx="${xa}" cy="${Y(z.vor)}" r="2.6"/><circle cx="${xb}" cy="${Y(z.jetzt)}" r="2.6"/>`
        + (k ? `<text x="${xa - 8}" y="${Y(z.vor) + 3.5 + ver(z)}" text-anchor="end">${esc(nm(z.pid))} ${z.vor} %</text><text x="${xb + 8}" y="${Y(z.jetzt) + 3.5}">${z.jetzt} %</text>` : '') + `</g>`; };
    return `<svg class="sn-svg" viewBox="0 0 ${W} ${H0 + 14}" role="img" aria-label="Siegquote Vormonat gegen Monatshälfte">
      ${l.filter(z => z !== auf && z !== ab).map(zeile).join('')}${zeile(auf)}${zeile(ab)}
      <text class="sn-t sn-klein" x="${xa}" y="${H0 + 11}" text-anchor="middle">${esc(monat(h.vor))}</text>
      <text class="sn-t sn-klein" x="${xb}" y="${H0 + 11}" text-anchor="middle">bis 15. ${esc(monat(h.sid))}</text></svg>`;
  };

  // ── Die Entwürfe ──────────────────────────────────────────────────
  const E = [];
  const F1 = N.fluss.bsp[0], F2 = N.fluss.bsp[1];
  E.push({name:'Der Elo-Fluss', neu:'Wer wem an einem Tag Elo abgenommen hat. Die App zeigt Gewinn und Verlust je Spieler, aber nie, zwischen wem die Punkte gewandert sind.',
    anlass:'Ein Spieltag. Der Verlust jedes Verlierers geht zu gleichen Teilen an die beiden Sieger, je Paar gegeneinander verrechnet; gezeichnet wird nur, was von einem Abgeber des Tages zu einem Gewinner floss.',
    wann:'23:59, mit dem Spieler des Tages.', id:'fluss_<Tag>', seite:'Spieltag', rang:'60', brk:'Nie.',
    zus:`Immer als Abschnitt im Blatt des Spielers des Tages („Wohin die Elo floss"). Eine eigene Karte nur, wenn einer einem anderen an einem Tag mindestens 40 Elo abnimmt.`,
    karriere:'sichtbar: es sind die Partien des Tages.',
    mess:`Spieltage mit mindestens ${N.fluss.min} Partien: ${N.fluss.n} von ${N.fluss.von}. Eigene Karte (ab 40 Elo zwischen zwei): ${N.fluss.ab40}-mal in sechs Monaten.`,
    karten:[F1, F2].filter(Boolean).map(f => karte({rub:'AM SPIELTAG', ic:'boomerang', sorte:'spiel', cat:'highlight', when:'23:59',
      title:`${nm(f.groesster.zu)} nimmt ${nm(f.groesster.von)} ${f.groesster.v} Elo ab`,
      desc:`${datum(f.tag)}: ${b(String(f.partien))} Partien. Am meisten floss von ${b(nm(f.groesster.von))} zu ${b(nm(f.groesster.zu))}.`, bild:flussBild(f)}))});

  E.push({name:'Die Bilanz kippt', neu:'Der Moment, in dem die direkte Bilanz zweier Spieler den Führenden wechselt. Heute zeigt der Fuß einer Partie einen Fluch oder einen Lieblingsgegner, aber nicht, dass jemand nach Dutzenden Duellen erstmals vorne liegt.',
    anlass:'Eine Partie, in der der Sieger die direkte Bilanz gegen einen der Verlierer übernimmt, nachdem dieser vorher geführt hat; ab zwölf Duellen.',
    wann:'Zur Partie.', id:'kippt_<Spieler>_<Spieler>_<Partie>', seite:'Spieltag', rang:'57', brk:'Nie.',
    zus:'Zeile der Karte ihrer Partie, mit eigener Fußzeichnung: der Verlauf der Bilanz über alle Duelle, über der Nulllinie in Grün.',
    karriere:'sichtbar für beide: es sind ihre Duelle.',
    mess:`${N.kippt.n}-mal in sechs Monaten, zwischen ${N.kippt.paare} verschiedenen Paaren.`,
    karten:N.kippt.bsp.map(k => karte({rub:'AM SPIELTAG', ic:'scaleBalance', sorte:'spiel', cat:'rivalry', when:uhr(k.t),
      title:k.verlauf.slice(0, -1).some(x => x > 0) ? `${nm(k.neu)} holt die Führung gegen ${nm(k.alt)} zurück` : `${nm(k.neu)} liegt erstmals vor ${nm(k.alt)}`,
      desc:`Nach ${b(String(k.n))} Duellen führt ${b(nm(k.neu))} die direkte Bilanz. ${nm(k.alt)} lag zwischendurch ${b(String(k.spanne))} ${k.spanne === 1 ? 'Sieg' : 'Siege'} vorn.`, bild:kipptBild(k)}))});

  E.push({name:'Jagd auf den Rekord', neu:'Eine laufende Serie kurz vor der längsten aller Zeiten. Die App meldet den neuen Rekord, aber nicht die Partien davor, in denen er in Reichweite ist, und nicht das Einstellen.',
    anlass:'Eine Siegesserie erreicht einen Sieg unter der längsten der Liga (Jagd) oder dieselbe Länge (eingestellt), ab einem Rekord von fünf.',
    wann:'Zur Partie.', id:'jagd_<Spieler>_<Partie>', seite:'Spieltag', rang:'Jagd 80, eingestellt 92', brk:'Eingestellt ja (so selten wie der Rekord selbst), die Jagd nicht.',
    zus:'Zeile der Karte ihrer Partie; die Zeichnung zeigt die Serie als Felder bis zum Rekord.',
    karriere:'Jäger sichtbar; der Rekord wie in der Ewigen Tafel (ligaAktiv).',
    mess:`Jagd ${N.jagd.n}-mal, eingestellt ${N.jagd.gleich}-mal in sechs Monaten.`,
    karten:N.jagd.bsp.map(j => karte({rub:j.art === 'gleich' ? 'BREAKING' : 'AM SPIELTAG', ic:'flame', sorte:'serie', cat:j.art === 'gleich' ? 'breaking' : 'highlight', when:uhr(j.t),
      title:j.art === 'gleich' ? `${nm(j.pid)} stellt den Serien-Rekord ein` : `${nm(j.pid)} ist einen Sieg vom Rekord entfernt`,
      desc:`${datum(j.tag)}: ${b(String(j.s))} Siege in Folge. Die längste Serie der Liga hält${j.halter.length > 1 ? 'en' : ''} ${j.halter.map(x => b(nm(x))).join(' und ')} mit ${b(String(j.rekord))}.`, bild:jagdBild(j)}))});

  const W1 = N.erwartung.bsp[0];
  E.push({name:'Gegen die Erwartung', neu:'Wie viele Siege jemand in einer Woche geholt hat gegen die, die die Siegchancen vor jeder Partie erwarten ließen. Die Siegchance steht heute nur an der einzelnen Partie (Tacho).',
    anlass:'Die Woche: je Spieler mit mindestens sechs Partien die Summe der Siegchancen gegen die echten Siege.',
    wann:'Sonntag 23:59:05, mit der Woche.', id:'erwartung_<Woche>', seite:'Spieltag', rang:'62', brk:'Nie.',
    zus:'Siebte Wertung im Blatt der Woche; eine eigene Karte unter der Wochenkarte, wenn jemand mindestens drei Siege über der Erwartung liegt.',
    karriere:'sichtbar: es sind die Partien der Woche.',
    mess:`Mindestens zwei Siege über der Erwartung: ${N.erwartung.n} von ${N.erwartung.von} Wochen; mindestens drei: ${N.erwartung.ab3}.`,
    karten:N.erwartung.bsp.map(w => karte({rub:'DIE WOCHE', ic:'target', sorte:'woche', cat:'season', when:'23:59',
      title:`${nm(w.oben.pid)} gewinnt ${z(w.oben.d)} Spiele mehr als erwartet`,
      desc:`Woche vom ${kurz(w.woche)}: ${b(String(w.oben.s))} Siege in ${w.oben.n} Partien, erwartet waren ${b(z(w.oben.e))}.`, bild:erwBild(w)}))});

  E.push({name:'Die Woche in Plätzen', neu:'Der Weg durch die Tabelle über eine Woche, Spieltag für Spieltag. Heute steht die Bewegung nur im Monatsrückblick, als Pfeil am Ende.',
    anlass:'Die Woche: der Platz jedes Spielers am Ende jedes Spieltags, in der Tabelle des Monats, ab drei Spieltagen; erst in einer belastbaren Tabelle.',
    wann:'Sonntag 23:59:05, mit der Woche.', id:'plaetze_<Woche>', seite:'Tafel', rang:'58', brk:'Nie.',
    zus:`Abschnitt im Blatt der Woche; eine eigene Karte, wenn jemand in der Woche mindestens ${N.plaetze.min} Plätze gutmacht.`,
    karriere:'sichtbar: es ist die Tabelle des Monats.',
    mess:`${N.plaetze.n} von ${N.plaetze.von} Wochen mit mindestens drei Spieltagen.`,
    karten:N.plaetze.bsp.map(p => karte({rub:'DIE WOCHE', ic:'stepsUp', sorte:'woche', cat:'season', when:'23:59',
      title:`${nm(p.auf.pid)} klettert ${p.auf.d} Plätze`,
      desc:`Woche vom ${kurz(p.woche)}${p.ab.d < 0 ? `: ${b(nm(p.ab.pid))} verliert ${-p.ab.d} Plätze.` : ''}`, bild:platzBild(p)}))});

  E.push({name:'Die Spitze rückt zusammen', neu:'Wie ein großer Vorsprung an der Tabellenspitze schmilzt. Der Spitzenwechsel und der Schlusssprint der letzten sieben Tage sind gemeldet, das Zusammenrücken davor nicht.',
    anlass:'Nach einem Vorsprung von mindestens 40 Elo liegen Platz 1 und 2 wieder höchstens 5 Elo auseinander; erst in einer belastbaren Tabelle, danach erst wieder nach 40 Elo Abstand.',
    wann:'Zur Partie.', id:'eng_<Monat>_<Partie>', seite:'Spieltag', rang:'80', brk:'Nie: der Spitzenwechsel, der folgen kann, ist es.',
    zus:'Zeile der Karte ihrer Partie mit eigener Fußzeichnung: der Vorsprung über den Monat.',
    karriere:'sichtbar: es ist die Tabelle des Monats.',
    mess:`${N.eng.n}-mal in sechs Monaten.`,
    karten:N.eng.bsp.map(e => karte({rub:'AM SPIELTAG', ic:'spitzenwechsel', sorte:'spiel', cat:'highlight', when:uhr(e.t),
      title:`Nur noch ${e.gap} Elo zwischen ${nm(e.eins.id)} und ${nm(e.zwei.id)}`,
      desc:`${datum(e.tag)}: im ${esc(monat(e.sid))} lagen schon ${b(String(e.von))} Elo zwischen Platz 1 und 2.`, bild:engBild(e)}))});

  const V = N.vorschau.bsp[N.vorschau.bsp.length - 1];
  E.push({name:'Kurz vor der Marke', neu:'Was bald passiert: wer in Reichweite einer Marke steht, die die App feiert. Alle Meilensteine kommen heute erst, wenn sie erreicht sind.',
    anlass:'Am Morgen eines Tages: höchstens drei Partien oder Siege oder zwanzig Tore bis zur nächsten Marke derselben Leiter (Partien ab 10, Siege ab 100, Tore ab 500); nur, wer in den drei Wochen davor gespielt hat.',
    wann:'15:00, als Fun Fact.', id:'ambient_<Tag>_15 (Vorlage marke_bald)', seite:'Liga', rang:'wie Fun Facts', brk:'Nie.',
    zus:'Eine Vorlage im Topf der Fun Facts, mit Rotation und Sperre wie die übrigen; zieht höchstens drei Einträge.',
    karriere:'ligaAktiv: ein Ruheständler kommt keiner Marke näher.',
    mess:`An ${N.vorschau.n} Tagen stand mindestens einer kurz vor einer Marke.`,
    karten:V ? [karte({rub:'LIGA IN ZAHLEN', ic:'hundred', sorte:'fakt', cat:'personal', when:'15:00',
      title:V.nah.length > 1 ? `${V.nah.length} Marken in Reichweite` : `${nm(V.nah[0].pid)} steht kurz vor der Marke`,
      desc:V.nah.slice(0, 3).map(x => `${b(nm(x.pid))} ${x.fehlt === 1 ? 'fehlt ' + (x.art === 'Partie' ? 'eine Partie' : x.art === 'Sieg' ? 'ein Sieg' : 'ein Tor') : 'fehlen ' + x.fehlt + ' ' + (x.art === 'Partie' ? 'Partien' : x.art === 'Sieg' ? 'Siege' : 'Tore')} ${zur(x)}.`).join(' '),
      bild:`<div class="sn-ringe">${V.nah.slice(0, 3).map(ring).join('')}</div>`})] : []});

  const sids = Object.keys(N.uhr.je).filter(s => N.uhr.je[s].reduce((a, c) => a + c, 0) >= 60);
  E.push({name:'Die Uhr der Liga', neu:'Wann die Liga spielt. Die Uhr des Tages steht an einer Partie (ab der sechsten des Tages), die des ganzen Monats nirgends.',
    anlass:'Die Anstoßzeiten eines Monats je Stunde.',
    wann:'15:00, als Fun Fact, höchstens einmal im Monat.', id:'ambient_<Tag>_15 (Vorlage liga_uhr)', seite:'Liga', rang:'wie Fun Facts', brk:'Nie.',
    zus:'Eine Vorlage im Topf der Fun Facts.', karriere:'Keine Frage: es zählt die Liga, nicht ein Spieler.',
    mess:`Die meisten Partien beginnen zwischen 13 und 17 Uhr; ${sids.length} Monate mit mindestens 60 Partien.`,
    karten:sids.slice(-2).map(sid => { const je = N.uhr.je[sid], sp = je.indexOf(Math.max(...je));
      return karte({rub:'LIGA IN ZAHLEN', ic:'clock', sorte:'fakt', cat:'fun', when:'15:00',
        title:`Im ${monat(sid)} spielt die Liga um ${sp} Uhr`, desc:'', bild:uhrBild(je, sid)}); })});

  const Hz = N.halbzeit.bsp[0];
  E.push({name:'Halbzeit gegen den Vormonat', neu:'Wer im laufenden Monat besser oder schlechter spielt als im ganzen Vormonat. Die Halbzeit des Monats kennt heute nur die Monatstafel.',
    anlass:'Am 15.: die Siegquote bis dahin gegen die des ganzen Vormonats, je Spieler mit mindestens fünf Partien in beiden.',
    wann:'Am 15. um 15:00, als Fun Fact.', id:'ambient_<Tag>_15 (Vorlage halbzeit_vergleich)', seite:'Liga', rang:'wie Fun Facts', brk:'Nie.',
    zus:'Zweites Bild für den Platz der Halbzeit, im Wechsel mit der Monatstafel.', karriere:'sichtbar: es sind die eigenen Partien zweier Monate.',
    mess:`${N.halbzeit.n} Monate mit genug Spielern.`,
    karten:Hz ? [karte({rub:'LIGA IN ZAHLEN', ic:'chartBar', sorte:'fakt', cat:'fun', when:'15:00',
      title:`${nm(Hz.zeilen[0].pid)} spielt besser als im ${monat(Hz.vor)}`,
      desc:`${b(nm(Hz.zeilen[0].pid))} von ${Hz.zeilen[0].vor} auf ${b(Hz.zeilen[0].jetzt + ' %')}, ${b(nm(Hz.zeilen[Hz.zeilen.length - 1].pid))} von ${Hz.zeilen[Hz.zeilen.length - 1].vor} auf ${b(Hz.zeilen[Hz.zeilen.length - 1].jetzt + ' %')}.`,
      bild:halbBild(Hz)})] : []});

  const html = `<section id="neu" class="sl-abschnitt">
    <h2>Neue Stories</h2>
    <p class="sl-satz-l">Entwürfe für Anlässe und Grafiken, die es in der App noch nicht gibt. Jeder zeigt eine Tatsache, die heute keine Karte zeigt, gerechnet mit den Zahlen der App an denselben ${N.partien} Partien und im Rahmen der Karten des Feeds. Zu jedem steht, wann er käme, wie oft er gekommen wäre und wo er stünde.</p>
    ${E.map((e, i) => `<article class="sl-form sn-entwurf" id="neu-${i + 1}">
      <header class="sl-form-k"><h3>${esc(e.name)}</h3><span class="sl-id">${esc(e.id)}</span></header>
      <div class="sl-form-g"><div class="sl-form-t"><div><p class="sn-neu"><b>Neu:</b> ${esc(e.neu)}</p><p>${esc(e.anlass)}</p></div>
        <dl class="sl-fakten"><dt>Wann</dt><dd>${esc(e.wann)}</dd><dt>Steht</dt><dd>${esc(e.zus)}</dd>
          <dt>Breaking</dt><dd>${esc(e.brk)}</dd><dt>Seite</dt><dd>${esc(e.seite)}</dd><dt>Rang</dt><dd>${esc(e.rang)}</dd>
          <dt>Karriere</dt><dd>${esc(e.karriere)}</dd><dt>Gemessen</dt><dd>${esc(e.mess)}</dd></dl></div>
        <div class="sl-bsp-l">${e.karten.map(k => `<figure class="sl-bsp"><div class="nf-wrap nf-liste"><div class="nf-feed">${k}</div></div></figure>`).join('')}</div>
      </div></article>`).join('')}
  </section>`;

  const css = `
.sn-neu{color:var(--sl-ink)}.sn-neu b{color:var(--sl-akzent)}
.sn-bild{padding:4px 13px 2px;display:flex;flex-direction:column;gap:8px}
.sn-svg{width:100%;height:auto;display:block;overflow:visible}
.sn-t{fill:var(--ink2);font:500 10.5px 'Space Grotesk',system-ui,sans-serif}
.sn-klein{fill:var(--muted);font-size:9px;font-family:'Sometype Mono',ui-monospace,monospace}
.sn-tpos{fill:var(--acid);color:var(--acid);font-family:'Sometype Mono',ui-monospace,monospace}
.sn-tneg{fill:var(--red);color:var(--red);font-family:'Sometype Mono',ui-monospace,monospace}
.sn-pos{fill:var(--acid)}.sn-neg{fill:var(--red)}.sn-gold{fill:var(--gold)}
.sn-band{fill:var(--acid);opacity:.22}
.sn-null{stroke:var(--line2);stroke-dasharray:3 3}.sn-null-k{fill:none;stroke:var(--line)}
.sn-linie{fill:none;stroke:var(--ink);stroke-width:1.6}.sn-linie.gold{stroke:var(--gold)}
.sn-flaeche-pos{fill:var(--acid);opacity:.2}.sn-flaeche-neg{fill:var(--red);opacity:.2}.sn-flaeche-gold{fill:var(--gold);opacity:.14}
.sn-kopfzeile{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--ink2)}
.sn-kopfzeile>span{display:flex;align-items:center;gap:6px}
.sn-kopfzeile .av{--av:22px;width:22px;height:22px;font-size:8.5px;flex:0 0 auto}
.sn-gross{font-family:'Archivo Black',sans-serif;font-size:20px;color:var(--ink)}.sn-gross small{font:500 11px 'Space Grotesk',sans-serif;color:var(--muted)}
.sn-jagd{display:flex;flex-direction:column;gap:8px}
.sn-jagd-k,.sn-jagd-f{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;color:var(--ink2)}
.sn-jagd-k>span{display:flex;align-items:center;gap:6px}.sn-jagd-k .av{--av:22px;width:22px;height:22px;font-size:8.5px}
.sn-zellen{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:3px}
.sn-zellen i{height:14px;border-radius:3px;background:var(--surface3)}
.sn-zellen i.voll{background:linear-gradient(180deg,var(--orange),var(--gold))}
.sn-zellen i.ziel{background:transparent;outline:1.5px dashed var(--gold);outline-offset:-1.5px}
.sn-erw{display:flex;flex-direction:column;gap:6px}
.sn-erw-z{display:grid;grid-template-columns:86px minmax(0,1fr) 40px;align-items:center;gap:8px;font-size:12px;color:var(--ink2)}
.sn-erw-n{display:flex;align-items:center;gap:5px;overflow:hidden;white-space:nowrap}.sn-erw-n .av{--av:18px;width:18px;height:18px;font-size:7px;flex:0 0 auto}
.sn-erw-b{position:relative;height:14px;border-radius:7px;background:var(--surface2)}
.sn-erw-b i{position:absolute;top:50%;transform:translate(-50%,-50%)}
.sn-erw-s{height:4px;transform:translateY(-50%)!important;border-radius:2px}.sn-erw-s.pos{background:var(--acid);opacity:.55}.sn-erw-s.neg{background:var(--red);opacity:.55}
.sn-erw-e{width:9px;height:9px;border-radius:50%;border:1.5px solid var(--ink2);background:var(--bg)}
.sn-erw-w{width:9px;height:9px;border-radius:50%}.sn-erw-w.pos{background:var(--acid)}.sn-erw-w.neg{background:var(--red)}
.sn-erw-z .num{text-align:right}
.sn-erw-l{display:flex;gap:14px;font-size:10.5px;color:var(--muted)}.sn-erw-l span{display:flex;align-items:center;gap:5px}
.sn-erw-l i{position:static!important;transform:none!important;display:inline-block}
.sn-bump path{fill:none;stroke:var(--line2);stroke-width:1.4}.sn-bump circle{fill:var(--line2)}
.sn-bump text{fill:var(--muted);font:500 9.5px 'Space Grotesk',sans-serif}
.sn-bump.auf path{stroke:var(--acid);stroke-width:2.4}.sn-bump.auf circle{fill:var(--acid)}.sn-bump.auf text{fill:var(--acid);font-weight:700}
.sn-bump.ab path{stroke:var(--red);stroke-width:2.4}.sn-bump.ab circle{fill:var(--red)}.sn-bump.ab text{fill:var(--red);font-weight:700}
.sn-ringe{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.sn-ring{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center}
.sn-ring svg{width:64px;height:64px}.sn-ring-g{fill:none;stroke:var(--surface3);stroke-width:6}
.sn-ring-v{fill:none;stroke:var(--acid);stroke-width:6;stroke-linecap:round}
.sn-ring>b{position:absolute;top:19px;font:400 20px 'Archivo Black',sans-serif;color:var(--ink)}
.sn-ring>span{display:flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--ink)}
.sn-ring .av{--av:16px;width:16px;height:16px;font-size:6.5px}.sn-ring small{font-size:10px;color:var(--muted)}
.sn-uhr{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:12px}
.sn-uhr-b{fill:var(--acid);opacity:.55}.sn-uhr-z{fill:var(--ink);font:400 22px 'Archivo Black',sans-serif}
.sn-uhr-t{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--ink2)}
.sn-karte .nf-d b{color:var(--ink)}`;
  return {html, css, nav:'<a href="#neu">Neu</a>'};
};
