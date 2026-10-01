// Entwurf der dritten Aufwertung — wird von bau.js IN die ausgelieferte App
// gelegt (über den Prüfzugang der Tests) und rechnet mit ihren Daten und
// Bauteilen. Nichts davon ist Teil der App [CLAUDE.md §2]: jede Funktion
// hier baut eine Ansicht nach, die erst nach Freigabe eingebaut wird.
//
// Regeln, an die sich jeder Baustein hält:
// - Farben nach dem Farbgesetz [§C25]: Grün/Rot nur für Richtung (Sieg,
//   Niederlage), Gold nur für Titel, sonst Metall; die Rangfarbe für „ich".
// - Vorhandene Bauteile zuerst [§C27]: rcpAbschnitt, rcpZahlenHtml,
//   saisonRennenHtml, _ndTagesbahn, avHtml, rcpPaarHtml.
// - Ein Balken wächst, er erscheint nicht; bei Bewegungsruhe steht er.
// - Bewegt wird nur transform und Deckkraft.
window.__E = (() => {
  const pm = pmap();
  const nm = id => (pm[id] && pm[id].name) || '?';
  const dabei = (m, id) => [m.a1, m.a2, m.b1, m.b2].includes(id);
  const sieg = (m, id) => ((m.a1 === id || m.a2 === id) ? m.winner === 'A' : m.winner === 'B');
  // Ein Gesicht ohne Wappen: der runde Chip der Rückblicke [§C27].
  const av = (id, px) => pm[id] ? rcpPaarHtml([id], px) : '';
  const wt = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const wtLang = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dd = d => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
  const tabKopf = (t, r) => `<div class="st-sec e-sec">${esc(t)}${r ? `<em class="num">${esc(r)}</em>` : ''}</div>`;

  // ── Das Feld: jeder Spieler eine Zeile, Siege nach rechts, Niederlagen
  //    nach links, um eine gemeinsame Null. Der Held steht in Gold.
  function feld(ms, held){
    const z = {};
    ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(id => {
      if(!id) return; z[id] = z[id] || {w:0, l:0};
      sieg(m, id) ? z[id].w++ : z[id].l++;
    }));
    const ids = Object.keys(z).sort((a, b) => (z[b].w - z[b].l) - (z[a].w - z[a].l) || z[b].w - z[a].w);
    const max = Math.max(1, ...ids.map(id => Math.max(z[id].w, z[id].l)));
    return `<div class="e-feld">${ids.map((id, i) => `<div class="e-feld-z${id === held ? ' held' : ''}" style="--i:${i}">
      <span class="e-feld-n">${esc(nm(id))}</span>
      <span class="e-feld-b"><i class="l" style="width:${(z[id].l / max * 50).toFixed(1)}%"></i><u></u><i class="w" style="width:${(z[id].w / max * 50).toFixed(1)}%"></i></span>
      <span class="e-feld-v num">${z[id].w}:${z[id].l}</span></div>`).join('')}</div>`;
  }

  // ── Die Woche eines Spielers: sieben Spalten, oben die Siege, unten die
  //    Niederlagen. Ein Tag ohne Partie ist ein Strich, kein Loch.
  function woche(ms, pid, start){
    const tage = Array.from({length:7}, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    const je = tage.map(d => { const k = tagKey(d); const e = ms.filter(m => tagKey(new Date(mts(m))) === k && dabei(m, pid));
      return {d, w:e.filter(m => sieg(m, pid)).length, l:e.filter(m => !sieg(m, pid)).length}; });
    const max = Math.max(1, ...je.map(x => Math.max(x.w, x.l)));
    return `<div class="e-woche">${je.map((x, i) => `<div class="e-wo-t${x.w + x.l ? '' : ' leer'}" style="--i:${i}">
      <span class="e-wo-o"><i style="height:${(x.w / max * 100).toFixed(0)}%"></i></span>
      <span class="e-wo-u"><i style="height:${(x.l / max * 100).toFixed(0)}%"></i></span>
      <span class="e-wo-l">${wt[x.d.getDay()]}</span>
      <span class="e-wo-v num">${x.w + x.l ? x.w + ':' + x.l : '–'}</span></div>`).join('')}</div>`;
  }

  // ── Die Elo eines Tages als Linie über seine Partien. Gerechnet wird
  //    nichts: die Deltas stehen an jeder Partie.
  function eloBahn(ms, pid){
    const e = ms.filter(m => dabei(m, pid)).sort((a, b) => mts(a) - mts(b));
    if(e.length < 2) return '';
    let s = 0; const pts = [0];
    e.forEach(m => { s += Math.round((m.deltas || {})[pid] || 0); pts.push(s); });
    const W = 320, H = 70, lo = Math.min(...pts), hi = Math.max(...pts), sp = hi - lo || 1;
    const x = i => (8 + i * (W - 16) / (pts.length - 1)).toFixed(1);
    const y = v => (H - 10 - (v - lo) / sp * (H - 22)).toFixed(1);
    const d = 'M' + pts.map((v, i) => x(i) + ',' + y(v)).join('L');
    const null0 = y(0);
    return `<div class="e-elo"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <line class="e-elo-0" x1="0" x2="${W}" y1="${null0}" y2="${null0}"/>
      <path class="e-elo-fl" d="${d}L${x(pts.length - 1)},${null0}L${x(0)},${null0}Z"/>
      <path class="e-elo-l" pathLength="1" d="${d}"/>
      ${pts.map((v, i) => i ? `<circle class="${v >= pts[i - 1] ? 'w' : 'l'}" cx="${x(i)}" cy="${y(v)}" r="3"/>` : '').join('')}
    </svg><div class="e-elo-z num"><span>Start</span><b class="${s >= 0 ? 'pos' : 'neg'}">${s >= 0 ? '+' : ''}${s} Elo</b></div></div>`;
  }

  return {
    // 1. Liga: das Titelrennen über der Rangliste.
    liga(){
      const sid = currentSeason().id, g = getGlobalSim();
      const ids = Object.keys(g.playedSeason || {}).filter(id => g.playedSeason[id] > 0)
        .sort((a, b) => g.elo[b] - g.elo[a]).slice(0, 3);
      const rennen = saisonRennenHtml(sid, ids);
      if(!rennen) return;
      const ziel = document.querySelector('#main .ui-tabs');
      ziel.insertAdjacentHTML('beforebegin', `<div class="e-karte">${tabKopf('Das Titelrennen', 'Elo je Spieltag')}${rennen}</div>`);
    },

    // 2. Positionen: die Rollen-Landkarte. Jeder Spieler steht dort, wo
    //    sein Sturm- und sein Abwehrwert sich kreuzen.
    positionen(){
      const statsMap = allPlayerStats();
      const wert = (p, pos) => { const s = statsMap[p.id] || playerStats(p.id);
        const g = pos === 'atk' ? s.atkG : s.defG, w = pos === 'atk' ? s.atkW : s.defW;
        const gs = pos === 'atk' ? (s.atkGoals || 0) : (s.defConceded || 0);
        const perf = posPerfFrom(p.id, matches);
        return g ? 100 * posWert(pos, g, w, gs / g, pos === 'atk' ? perf.aPerfAvg : perf.dPerfAvg) : null; };
      const pkt = activePlayers().map(p => ({p, a:wert(p, 'atk'), d:wert(p, 'def')})).filter(x => x.a != null && x.d != null);
      if(pkt.length < 3) return;
      const W = 300, H = 240;
      const lx = v => 24 + v / 100 * (W - 40), ly = v => H - 22 - v / 100 * (H - 40);
      const punkte = pkt.map((x, i) => `<span class="e-rk-p" style="left:${(lx(x.a) / W * 100).toFixed(1)}%;top:${(ly(x.d) / H * 100).toFixed(1)}%;--i:${i}" title="${esc(x.p.name)}">${av(x.p.id, 26)}</span>`).join('');
      const html = `<div class="e-karte">${tabKopf('Die Rollen-Landkarte', 'Sturm × Abwehr')}
        <div class="e-rk"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
          <rect class="e-rk-q" x="${lx(50)}" y="${ly(100)}" width="${lx(100) - lx(50)}" height="${ly(50) - ly(100)}"/>
          <line class="e-rk-m" x1="${lx(50)}" x2="${lx(50)}" y1="${ly(0)}" y2="${ly(100)}"/>
          <line class="e-rk-m" x1="${lx(0)}" x2="${lx(100)}" y1="${ly(50)}" y2="${ly(50)}"/>
          <line class="e-rk-a" x1="${lx(0)}" x2="${lx(100)}" y1="${ly(0)}" y2="${ly(0)}"/>
          <line class="e-rk-a" x1="${lx(0)}" x2="${lx(0)}" y1="${ly(0)}" y2="${ly(100)}"/>
          <text x="${lx(100)}" y="${ly(0) + 15}" text-anchor="end">Sturm →</text>
          <text x="${lx(0)}" y="${ly(100) - 6}">↑ Abwehr</text>
          <text class="q" x="${lx(75)}" y="${ly(96)}" text-anchor="middle">Allrounder</text>
          <text class="q" x="${lx(75)}" y="${ly(4)}" text-anchor="middle">Stürmer</text>
          <text class="q" x="${lx(25)}" y="${ly(96)}" text-anchor="middle">Verteidiger</text>
        </svg>${punkte}</div>
        <div class="e-hinweis">Oben rechts steht, wer auf beiden Positionen trägt. Ein Gesicht antippen öffnet das Positions-Profil.</div></div>`;
      document.querySelector('#main .ui-switch').insertAdjacentHTML('beforebegin', html);
    },

    // 3. Teams: das Netz der Duos. Jede Linie ist ein Duo ab vier Partien,
    //    so dick wie es oft gespielt hat, grün, wo es mehr gewinnt, rot, wo
    //    es mehr verliert.
    teams(){
      const ids = activePlayers().map(p => p.id);
      const n = ids.length, W = 300, R = 112, cx = 150, cy = 140;
      const lage = {}; ids.forEach((id, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; lage[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
      const duo = {};
      matches.forEach(m => [[m.a1, m.a2, m.winner === 'A'], [m.b1, m.b2, m.winner === 'B']].forEach(([x, y, w]) => {
        if(!lage[x] || !lage[y]) return; const k = [x, y].sort().join('|'); duo[k] = duo[k] || {g:0, w:0}; duo[k].g++; if(w) duo[k].w++; }));
      // Nur die achtzehn meistgespielten: alle 43 Duos waren ein Knäuel, in dem
      // keine Linie mehr zu verfolgen war.
      const ks = Object.keys(duo).filter(k => duo[k].g >= 4).sort((a, b) => duo[b].g - duo[a].g).slice(0, 18).reverse();
      const gmax = Math.max(1, ...ks.map(k => duo[k].g));
      const linien = ks.map((k, i) => { const [x, y] = k.split('|'), q = duo[k].w / duo[k].g;
        const cls = q >= .6 ? 'w' : q <= .4 ? 'l' : 'm';
        return `<line class="e-netz-l ${cls}" style="--i:${i}" x1="${lage[x][0].toFixed(1)}" y1="${lage[x][1].toFixed(1)}" x2="${lage[y][0].toFixed(1)}" y2="${lage[y][1].toFixed(1)}" stroke-width="${(1 + duo[k].g / gmax * 7).toFixed(1)}"/>`; }).join('');
      const gesichter = ids.map(id => `<span class="e-netz-p" style="left:${(lage[id][0] / W * 100).toFixed(1)}%;top:${(lage[id][1] / 280 * 100).toFixed(1)}%">${av(id, 30)}</span>`).join('');
      const html = `<div class="e-karte">${tabKopf('Das Netz der Duos', 'die ' + ks.length + ' häufigsten')}
        <div class="e-netz"><svg viewBox="0 0 ${W} 280" aria-hidden="true">${linien}</svg>${gesichter}</div>
        <div class="e-leg"><span class="w">gewinnt öfter</span><span class="m">ausgeglichen</span><span class="l">verliert öfter</span><span class="d">Dicke = Partien</span></div></div>`;
      document.querySelector('#main .search').insertAdjacentHTML('beforebegin', html);
    },

    // 4. Verlauf: nach Tagen gegliedert, jede Partie mit Gesichtern.
    verlauf(){
      const liste = [...matches].reverse().slice(0, 20);
      let tag = null, html = '';
      const tagMs = k => matches.filter(m => tagKey(new Date(mts(m))) === k).sort((a, b) => mts(a) - mts(b));
      liste.forEach(m => {
        const d = new Date(mts(m)), k = tagKey(d);
        if(k !== tag){
          tag = k; const alle = tagMs(k);
          html += `<div class="e-vtag"><div class="e-vtag-k"><b>${wtLang[d.getDay()]}</b><span class="num">${dd(d)}</span><em class="num">${alle.length} ${alle.length === 1 ? 'Partie' : 'Partien'}</em></div>
            <div class="e-vtag-bahn">${alle.map((x, i) => { const diff = Math.abs(x.score_a - x.score_b);
              return `<i style="--h:${(25 + diff * 7.5).toFixed(0)}%;--i:${i}" class="${diff <= 1 ? 'eng' : diff >= 7 ? 'klar' : ''}"></i>`; }).join('')}</div></div>`;
        }
        const aW = m.winner === 'A';
        const sw = aW ? [m.a1, m.a2] : [m.b1, m.b2], sl = aW ? [m.b1, m.b2] : [m.a1, m.a2];
        const hoch = Math.max(m.score_a, m.score_b), tief = Math.min(m.score_a, m.score_b);
        const delta = id => { const v = Math.round((m.deltas || {})[id] || 0); return `<span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : ''}${v}</span>`; };
        const earned = badgesEarnedInMatch(m.id);
        const uhr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        html += `<div class="e-partie">
          <div class="e-p-seite w">${rcpPaarHtml(sw, 30)}<span class="e-p-n">${esc(nm(sw[0]))}<br>${esc(nm(sw[1]))}</span></div>
          <div class="e-p-mitte"><b class="num">${hoch}:${tief}</b><span class="num">${uhr}</span></div>
          <div class="e-p-seite l"><span class="e-p-n">${esc(nm(sl[0]))}<br>${esc(nm(sl[1]))}</span>${rcpPaarHtml(sl, 30)}</div>
          <div class="e-p-fuss"><span class="e-p-d num">${sw.map(delta).join(' ')}</span>${earned.length ? `<span class="e-p-a">${earned.slice(0, 4).map(e => badgeIc(e.badge, '13px')).join('')}${earned.length > 4 ? `<em>+${earned.length - 4}</em>` : ''}</span>` : ''}<span class="e-p-d num r">${sl.map(delta).join(' ')}</span></div>
        </div>`;
      });
      document.querySelector('#main .mlist').outerHTML = `<div class="e-vlist">${html}</div>`;
    },

    // 5. Match: die Siegchance, während man aufstellt.
    match(){
      const g = getGlobalSim(), e = id => g.elo[id] != null ? g.elo[id] : 0;
      const a = (e(M.A1) + e(M.A2)) / 2, b = (e(M.B1) + e(M.B2)) / 2;
      const c = expected(a, b), pa = Math.round(c * 100);
      const html = `<div class="e-karte e-chance">${tabKopf('Die Siegchance', 'aus der Elo')}
        <div class="e-ch-reihe"><span class="a">${rcpPaarHtml([M.A1, M.A2], 28)}<b class="num">${pa} %</b></span>
          <span class="e-ch-wort">${esc(chanceWort(c))}</span>
          <span class="b"><b class="num">${100 - pa} %</b>${rcpPaarHtml([M.B1, M.B2], 28)}</span></div>
        <div class="e-ch-bahn"><i class="a" style="width:${pa}%"></i><i class="b" style="width:${100 - pa}%"></i><u style="left:50%"></u></div>
        <div class="e-hinweis">Aus der Elo beider Teams vor dem Anpfiff, dieselbe Rechnung wie im Blatt einer Partie.</div></div>`;
      document.querySelector('#main .score-board').insertAdjacentHTML('beforebegin', html);
    },

    // 6. Profil: der Spielkalender der letzten zwölf Wochen.
    profil(pid){
      const heute = new Date(Math.max(...matches.map(mts)));
      const ende = new Date(heute); ende.setHours(0, 0, 0, 0); ende.setDate(ende.getDate() + (7 - ((ende.getDay() + 6) % 7) - 1));
      const start = new Date(ende); start.setDate(start.getDate() - 7 * 12 + 1);
      const je = {};
      matches.forEach(m => { if(!dabei(m, pid)) return; const k = tagKey(new Date(mts(m))); je[k] = je[k] || {w:0, l:0}; sieg(m, pid) ? je[k].w++ : je[k].l++; });
      let zellen = '', spiele = 0, tage = 0;
      for(let i = 0; i < 84; i++){
        const d = new Date(start); d.setDate(d.getDate() + i);
        const x = je[tagKey(d)];
        let cls = 'leer', st = '';
        if(x){ tage++; spiele += x.w + x.l; const q = x.w / (x.w + x.l); cls = q > .5 ? 'w' : q < .5 ? 'l' : 'm';
          st = ` style="--s:${(.35 + Math.min(1, (x.w + x.l) / 8) * .65).toFixed(2)}"`; }
        zellen += `<i class="${cls}"${st} title="${dd(d)}${x ? ' · ' + x.w + ':' + x.l : ''}"></i>`;
      }
      const html = `<div class="pp-sec-title" style="margin-top:18px"><div class="l"><h4>Der Spielkalender</h4></div><div class="m num">${spiele} Partien</div></div>
        <div class="e-kal"><div class="e-kal-wt"><span>Mo</span><span></span><span>Mi</span><span></span><span>Fr</span><span></span><span>So</span></div><div class="e-kal-g">${zellen}</div></div>
        <div class="e-leg"><span class="w">mehr gewonnen</span><span class="m">ausgeglichen</span><span class="l">mehr verloren</span><span class="d">Kräftiger = mehr Partien</span></div>`;
      const anker = document.querySelector('#sheet .pp-sec-title');
      anker.insertAdjacentHTML('beforebegin', html);
    },

    // 7. Direkter Vergleich: jede Begegnung als Balken, darüber die Bilanz.
    h2h(a, b){
      const alle = matches.filter(m => dabei(m, a) && dabei(m, b) && sieg(m, a) !== sieg(m, b)).sort((x, y) => mts(x) - mts(y));
      if(alle.length < 2) return;
      // Höchstens die letzten vierzig: bei hundertzehn Begegnungen wäre ein
      // Balken schmaler als ein Pixel.
      const ms = alle.slice(-40);
      const W = 320, H = 110, mitte = 55, n = ms.length;
      const bw = Math.min(14, (W - 16) / n - 2);
      let s = 0; const lauf = [0];
      const balken = ms.map((m, i) => { const w = sieg(m, a), diff = Math.abs(m.score_a - m.score_b), h = 8 + diff * 4.2;
        s += w ? 1 : -1; lauf.push(s);
        const x = 8 + i * (W - 16) / n;
        return `<rect class="${w ? 'w' : 'l'}" style="--i:${i}" x="${x.toFixed(1)}" y="${(w ? mitte - h : mitte).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`; }).join('');
      const html = `${rcpAbschnitt(alle.length > n ? 'Die letzten ' + n + ' Begegnungen' : 'Jede Begegnung', alle.length > n ? alle.length + ' insgesamt' : n)}
        <div class="e-h2h"><div class="e-h2h-n"><span>${esc(nm(a))} gewinnt ↑</span><span>${esc(nm(b))} gewinnt ↓</span></div>
          <svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="e-h2h-0" x1="0" x2="${W}" y1="${mitte}" y2="${mitte}"/>${balken}</svg>
          <div class="e-hinweis">Je höher der Balken, desto deutlicher das Ergebnis. Von links nach rechts in der Reihenfolge, in der gespielt wurde.</div></div>`;
      const ziel = document.querySelector('#sheet > div:nth-child(5)');
      if(ziel) ziel.insertAdjacentHTML('beforebegin', `<div class="e-h2h-box">${html}</div>`);
    },

    // 8. Saison-Rückblick: das Rennen unter dem Podest.
    saison(sid){
      const R = saisonRang(sid), ids = R.slice(0, 3).map(x => x.id);
      const html = rcpAbschnitt('Das Titelrennen') + saisonRennenHtml(sid, ids)
        + rcpAbschnitt('Tage an der Spitze') + saisonSpitzeHtml(sid, ids)
        + rcpAbschnitt('Die Saison des Meisters', R[0] ? nm(R[0].id) : '') + saisonZellenHtml(sid, ids[0]);
      const ziel = [...document.querySelectorAll('#sheet .rcp-section')].find(x => /Rangliste/i.test(x.textContent));
      if(ziel) ziel.insertAdjacentHTML('beforebegin', html);
    },

    // 9. Woche: die Woche des Helden und das ganze Feld.
    woche(){
      const r = _potwLastWeekRange();
      const ms = matches.filter(m => mts(m) >= r.start.getTime() && mts(m) <= r.end.getTime());
      const held = document.querySelector('#sheet .rcp-held[data-detail]');
      const pid = held ? held.getAttribute('data-detail') : null;
      if(!pid) return;
      held.insertAdjacentHTML('afterend', rcpAbschnitt('Die Woche von ' + nm(pid)) + woche(ms, pid, r.start)
        + rcpAbschnitt('Das Feld der Woche', ms.length + ' Partien') + feld(ms, pid));
    },

    // 10. Tag: die Bahn des Helden, seine Elo und das Feld des Tages.
    tag(){
      const d = _potdLastDayData(); if(!d) return;
      const held = document.querySelector('#sheet .rcp-held[data-detail]');
      const pid = held ? held.getAttribute('data-detail') : null;
      if(!pid) return;
      held.insertAdjacentHTML('afterend', rcpAbschnitt('Der Tag von ' + nm(pid)) + _ndTagesbahn(pid, d.dayMatches).replace(/<div class="nd-tml">[\s\S]*$/, '')
        + eloBahn(d.dayMatches, pid) + rcpAbschnitt('Das Feld des Tages', d.dayMatches.length + ' Partien') + feld(d.dayMatches, pid));
    },
  };
})();
'bereit';
