// Entwurf der vierten Aufwertung: die Karten „Am Spieltag". Wird von bau.js
// IN die ausgelieferte App gelegt (über den Prüfzugang der Tests) und rechnet
// mit ihren Daten und Bauteilen. Nichts davon ist Teil der App [CLAUDE.md §2].
//
// Der Befund: 55 der 73 Karten im Vierzehn-Tage-Fenster sind Partie-Karten,
// und jede beginnt mit demselben Ergebnisband — vier Wappen, der Stand, zwei
// Namen. Der Fuß wechselt schon nach dem Anlass [§C33], aber er ist eine
// Zeile unter einem Kopf, der immer gleich aussieht. Der Entwurf lässt deshalb
// den KOPF dem Anlass folgen und zeigt in jedem Anlass eine Zahl, die es auf
// der Karte bisher nicht gab:
//
//   gewöhnliche Partie   das Spielfeld: wer wo stand, Elo je Spieler
//   Ein-Tor-Krimi        die Anzeigetafel und die Bilanz in engen Partien
//   klarer Sieg          wie oft die Liga so deutlich gespielt hat
//   Außenseitersieg      die Wippe: das Elo-Gewicht beider Teams
//   Spitzenwechsel,      die Monatstabelle vor und nach der Partie
//   Rangsprung
//   Serie                der Lauf gegen den eigenen Bestwert und die Liga
//   Wende                die Elo-Kurve der letzten zwölf Partien
//   Rivalität            jede Begegnung der beiden als Balken
//   dieselben Vier       eine Karte für die ganze Runde
//
// Regeln: Farben nach §C25 (Grün/Rot nur Richtung, Gold nur Titel, sonst
// Metall), vorhandene Bauteile zuerst [§C27], bewegt wird nur transform und
// Deckkraft, und bei Bewegungsruhe steht alles.
window.__F = (() => {
  const pm = pmap();
  const M = id => (matches || []).find(x => x.id === id);
  const nm = id => (pm[id] && pm[id].name) || '?';
  const seite = (m, id) => (m.a1 === id || m.a2 === id) ? 'A' : 'B';
  const gew = (m, id) => seite(m, id) === m.winner;
  const team = (m, s) => s === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
  const W = m => team(m, m.winner), L = m => team(m, m.winner === 'A' ? 'B' : 'A');
  const chip = id => pm[id] ? avHtml(pm[id], '', {}) : '';
  const wap = (id, px) => pm[id] ? avHtml(pm[id], '', {ins:true, px:px || 48, feuer:0}) : '';
  const delta = (id, m) => _newsEloDelta(id, m.id);
  const vz = v => v == null ? '' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v);
  const chance = m => {
    const h = getHistoryByMatchId().get(m.id);
    const e = h && h.expA != null ? h.expA : m.exp_a;
    return e == null ? null : (m.winner === 'A' ? e : 1 - e);
  };
  const chrono = () => (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  const eigene = (pid, bis) => chrono().filter(x => mts(x) <= mts(bis) && [x.a1, x.a2, x.b1, x.b2].includes(pid));
  const namen = ids => _namenListe ? _namenListe(ids.map(nm)) : ids.map(nm).join(' und ');
  const zahlwort = n => ['null','eine','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn'][n] || String(n);

  // ── Der Anlass, in derselben Rangfolge wie _newsSpielFuss [§C33] ──────
  function anlass(s){
    const d = s.dataRef || {};
    const m = d.matchId ? M(d.matchId) : null;
    if(!m) return {key:'?'};
    const fakten = _newsSpielFakten(s);
    const f = t => fakten.find(x => x.type === t);
    const c = chance(m);
    const diff = Math.abs(m.score_a - m.score_b);
    let x;
    if((x = f('lead_change')) && x.newLeader) return {key:'spitze', m, x};
    if((x = f('streak_killer')) && x.victimPid) return {key:'riss', m, x};
    if((x = f('win_streak')) && x.streak) return {key:'serie', m, x};
    if((x = f('team_streak')) && x.streak) return {key:'teamserie', m, x};
    if(c != null && c < CHANCE_UPSET) return {key:'aussenseiter', m, c};
    const wende = W(m).map(pid => ({pid, n:_newsPleitenVor(pid, m)})).filter(w => w.n >= 3).sort((a, b) => b.n - a.n)[0];
    if(wende) return {key:'wende', m, x:wende};
    if((x = f('rivalry_milestone')) && x.a && x.b) return {key:'duell', m, x};
    if(f('badge_unlocked') || f('badge_marken')) return {key:'medaille', m};
    const sprung = W(m).map(pid => ({pid, r:_newsRankChange(pid, m.id)})).filter(w => w.r && w.r.pre - w.r.post >= 2);
    if(sprung.length) return {key:'rang', m, x:sprung};
    if(diff === 1) return {key:'krimi', m, c};
    if(diff >= 6) return {key:'deutlich', m};
    return {key:'feld', m, c};
  }
  const ANLASS_NAME = {spitze:'Spitzenwechsel', riss:'Serienbruch', serie:'Serie', teamserie:'Teamserie',
    aussenseiter:'Außenseitersieg', wende:'Wende', duell:'Rivalität', medaille:'Auszeichnung', rang:'Rangsprung',
    krimi:'Ein-Tor-Krimi', deutlich:'Klarer Sieg', feld:'Ergebnis'};
  const KURZ = {aussenseiter:'Außenseiter', krimi:'Krimi', deutlich:'Klar', spitze:'Spitze', rang:'Sprung', medaille:'Marke', teamserie:'Serie', riss:'Bruch'};
  const ANLASS_IC = {spitze:'crown', riss:'flameBreak', serie:'flame', teamserie:'flame', aussenseiter:'underdog',
    wende:'comeback', duell:'crossedSwords', medaille:'medal', rang:'stepsUp', krimi:'thriller', deutlich:'target', feld:'ball'};

  // ── Die Ergebniszeile: das Band in einer Zeile ────────────────────────
  // Wo die Grafik darunter die Aussage trägt, braucht der Kopf nur noch
  // den Stand und die vier Gesichter — als Chips, nicht als Wappen.
  function zeile(m){
    const aw = m.winner === 'A';
    const s = (ids, w, re) => `<span class="ef-z-s${w ? ' w' : ''}${re ? ' re' : ''}">`
      + `<span class="ef-z-avs">${ids.map(chip).join('')}</span><span class="ef-z-n">${ids.map(id => `<span>${esc(nm(id))}</span>`).join('')}</span></span>`;
    return `<div class="ef-zeile">${s(team(m, 'A'), aw)}<b class="ef-z-sc num"><em class="${aw ? 'w' : ''}">${m.score_a}</em>`
      + `<i>:</i><em class="${aw ? '' : 'w'}">${m.score_b}</em></b>${s(team(m, 'B'), !aw, true)}</div>`;
  }

  // ── Das Spielfeld: die gewöhnliche Partie ─────────────────────────────
  // Die Karte zeigte nie, wer wo stand — die Rolle ist aber die halbe
  // Geschichte einer Kicker-Partie. Die vier stehen auf ihren Stangen in der
  // Reihenfolge des Tisches: Abwehr A, Sturm B, Sturm A, Abwehr B. Unter
  // jedem die Elo der Partie; die Elo-Waage darunter entfällt damit.
  function spielfeld(a){
    const m = a.m;
    const rolle = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_pos'];
    const def = s => team(m, s).find(id => rolle(id) === 'def') || team(m, s)[0];
    const atk = s => team(m, s).find(id => id !== def(s));
    const slots = [[def('A'), 'Abwehr', 11], [atk('B'), 'Sturm', 35], [atk('A'), 'Sturm', 65], [def('B'), 'Abwehr', 89]];
    const c = a.c;
    return `<div class="ef-feld">
      <span class="ef-f-tor l"></span><span class="ef-f-tor r"></span><span class="ef-f-mitte"></span>
      ${slots.map(([id, r, x], i) => `<i class="ef-f-stange" style="left:${x}%"></i><span class="ef-f-rolle" style="left:${x}%">${r}</span>`
        + `<div class="ef-f-sp${gew(m, id) ? ' w' : ''} t${seite(m, id)}" style="left:${x}%;--i:${i}">${wap(id, 48)}`
        + `<b>${esc(nm(id))}</b><em class="${(delta(id, m) || 0) >= 0 ? 'g' : 'r'} num">${vz(delta(id, m))}</em></div>`).join('')}
      <div class="ef-f-sc"><b class="num"><em class="${m.winner === 'A' ? 'w' : ''}">${m.score_a}</em><i>:</i><em class="${m.winner === 'B' ? 'w' : ''}">${m.score_b}</em></b>
        ${c != null ? `<span>${Math.round(c * 100)} % Chance</span>` : ''}</div>
    </div>`;
  }

  // ── Die Anzeigetafel: der Ein-Tor-Krimi ───────────────────────────────
  function anzeigetafel(a){
    const m = a.m, aw = m.winner === 'A';
    const t = (s, w) => `<div class="ef-at-t${w ? ' w' : ''}"><b class="num">${s === 'A' ? m.score_a : m.score_b}</b>`
      + `<span>${team(m, s).map(chip).join('')}</span><em>${esc(team(m, s).map(nm).join(' und '))}</em></div>`;
    return `<div class="ef-at">${t('A', aw)}<div class="ef-at-m"><span>EIN TOR</span>`
      + (a.c != null ? `<em>${Math.round(a.c * 100)} : ${100 - Math.round(a.c * 100)}</em><i>Chance vorher</i>` : '')
      + `</div>${t('B', !aw)}</div>`;
  }
  // Wer gewinnt die engen Partien? Je Sieger die letzten acht mit einem Tor
  // Unterschied bis zu dieser, und die Bilanz aller.
  function nerven(a){
    const m = a.m;
    const z = W(m).map(pid => {
      const eng = eigene(pid, m).filter(x => Math.abs(x.score_a - x.score_b) === 1);
      const w = eng.filter(x => gew(x, pid)).length;
      const zell = eng.slice(-8).map(x => `<i class="${gew(x, pid) ? 'w' : 'l'}${x === m ? ' jetzt' : ''}"></i>`).join('');
      return `<div class="ef-nv-z">${chip(pid)}<b>${esc(nm(pid))}</b><span class="ef-nv-c">${zell}</span>`
        + `<em class="num">${w}:${eng.length - w}</em></div>`;
    }).join('');
    return `<div class="ef-nv"><div class="ef-k">Enge Partien bis zu dieser</div>${z}</div>`;
  }

  // ── Die Verteilung: der klare Sieg ────────────────────────────────────
  // „Zuletzt so deutlich am …" sagte, wann; nicht, wie selten. Zehn Säulen,
  // eine je Ergebnis von 10:9 bis 10:0, gezählt über die Liga bis zu dieser
  // Partie — diese hell, die deutlicheren leiser dahinter.
  function verteilung(a){
    const m = a.m, diff = Math.abs(m.score_a - m.score_b);
    const bis = chrono().filter(x => mts(x) <= mts(m));
    const n = Array(11).fill(0);
    bis.forEach(x => n[Math.abs(x.score_a - x.score_b)]++);
    const max = Math.max(...n.slice(1));
    const so = bis.filter(x => Math.abs(x.score_a - x.score_b) >= diff).length;
    let zuletzt = null;
    bis.forEach(x => { if(x !== m && Math.abs(x.score_a - x.score_b) >= diff) zuletzt = x; });
    const saeulen = [];
    for(let d = 1; d <= 10; d++){
      saeulen.push(`<span class="ef-vt-s${d === diff ? ' jetzt' : d > diff ? ' mehr' : ''}" style="--i:${d}">`
        + `<i style="height:${(n[d] / max * 100).toFixed(0)}%"></i><em>${10 - d}</em></span>`);
    }
    return `<div class="ef-vt"><div class="ef-vt-k"><div class="ef-k">Alle ${bis.length} Partien nach Gegentoren</div></div>
      <div class="ef-vt-g">${saeulen.join('')}</div>
      <div class="ef-vt-f"><b class="num">${so}</b> von ${bis.length} Partien so deutlich oder deutlicher`
      + `${zuletzt ? ` · zuletzt am ${datumFmt(mts(zuletzt), 'tm')}` : ''}</div></div>`;
  }

  // ── Die Wippe: der Außenseitersieg ────────────────────────────────────
  // Das Gewicht ist die Elo vor dem Anstoß. Der Favorit sitzt unten, wie es
  // die Rechnung erwartet hat — gewonnen hat die leichte Seite.
  function wippe(a){
    const m = a.m, h = getHistoryByMatchId().get(m.id) || {};
    const elo = ids => Math.round(ids.reduce((s, id) => s + ((h.eloBefore || {})[id] || 0), 0) / ids.length);
    const fav = L(m), dog = W(m);
    const gap = Math.max(0, elo(fav) - elo(dog));
    const th = Math.min(13, 5 + gap / 25) * Math.PI / 180;
    const px = 150, py = 86, r = 104;
    const lx = px - r * Math.cos(th), ly = py + r * Math.sin(th);
    const rx = px + r * Math.cos(th), ry = py - r * Math.sin(th);
    const pct = Math.round(a.c * 100);
    const sitz = (x, y, ids, w) => `<div class="ef-wp-t${w ? ' w' : ''}" style="left:${(x / 300 * 100).toFixed(1)}%;top:${(y / 120 * 100).toFixed(1)}%">`
      + `<span class="ef-wp-avs">${ids.map(chip).join('')}</span></div>`;
    const schild = (x, y, ids, txt, w, oben) => `<div class="ef-wp-l${w ? ' w' : ''}${oben ? ' oben' : ''}" style="left:${(x / 300 * 100).toFixed(1)}%;top:${(y / 120 * 100).toFixed(1)}%">`
      + `<b>${esc(ids.map(nm).join(' & '))}</b><span>${txt}</span></div>`;
    return `<div class="ef-wp">
      <svg viewBox="0 0 300 120" aria-hidden="true">
        <path class="ef-wp-dr" d="M${px} ${py}L${px - 13} ${py + 24}H${px + 13}Z"/>
        <line class="ef-wp-bk" x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}"/>
        <circle class="ef-wp-ax" cx="${px}" cy="${py}" r="3.5"/>
      </svg>
      ${sitz(lx + 6, ly - 4, fav, false)}${sitz(rx - 6, ry - 4, dog, true)}
      ${schild(lx + 6, ly - 33, fav, `Ø ${vz(elo(fav)).replace('+', '')} Elo · ${100 - pct} %`, false, true)}
      ${schild(rx - 10, ry + 8, dog, `Ø ${vz(elo(dog)).replace('+', '')} Elo · ${pct} %`, true)}
      <div class="ef-wp-gap"><b class="num">${gap}</b><span>Elo Gefälle</span></div>
    </div>`;
  }

  // ── Die Tabelle vorher und nachher: Spitzenwechsel und Rangsprung ─────
  // Eine Linie je Spieler von seinem Platz vor der Partie zu dem danach.
  // Wer durch diese Partie steigt, ist grün, wer dadurch fällt, rot — die
  // Richtung [§C25]; die übrigen bleiben Metall. Die neue Spitze trägt Gold.
  function tabelle(a, spitze){
    const m = a.m, snap = getRankSnapshots()[m.id];
    if(!snap) return '';
    const fokus = new Set(spitze ? [a.x.newLeader, a.x.prevLeader] : a.x.map(w => w.pid));
    const alle = Object.keys(snap.postRank);
    let ids = alle.filter(id => snap.postRank[id] <= 5 || snap.preRank[id] <= 5 || fokus.has(id));
    const tief = Math.max(...ids.map(id => Math.max(snap.preRank[id] || 0, snap.postRank[id] || 0)));
    ids = alle.filter(id => (snap.preRank[id] || 99) <= tief || (snap.postRank[id] || 99) <= tief);
    const zeilen = Math.min(tief, 9);
    ids = ids.filter(id => snap.preRank[id] <= zeilen && snap.postRank[id] <= zeilen);
    const y = r => 14 + (r - 1) * 19, H = y(zeilen) + 12;
    const dabei = new Set([m.a1, m.a2, m.b1, m.b2]);
    const linien = ids.map(id => {
      const p = snap.preRank[id], q = snap.postRank[id];
      const k = !dabei.has(id) || p === q ? 'm' : q < p ? 'g' : 'r';
      return {id, p, q, k: fokus.has(id) || (dabei.has(id) && p !== q) ? k : 'm'};
    }).sort((u, v) => (u.k === 'm') - (v.k === 'm'));
    const t = (x, yy, txt, cls, anchor) => `<text x="${x}" y="${yy + 3.5}" class="${cls}" text-anchor="${anchor}">${esc(txt)}</text>`;
    const svg = linien.slice().reverse().map(l => `<path class="ef-tb-l ${l.k}" d="M106 ${y(l.p)}C150 ${y(l.p)} 150 ${y(l.q)} 194 ${y(l.q)}"/>`
      + `<circle class="ef-tb-p ${l.k}" cx="106" cy="${y(l.p)}" r="2.6"/><circle class="ef-tb-p ${l.k}" cx="194" cy="${y(l.q)}" r="2.6"/>`
      + t(98, y(l.p), nm(l.id) + '  ' + l.p, 'ef-tb-t ' + l.k, 'end')
      + t(202, y(l.q), l.q + '  ' + nm(l.id), 'ef-tb-t ' + l.k + (spitze && l.q === 1 ? ' gold' : ''), 'start')).join('');
    return `<div class="ef-tb"><div class="ef-tb-k"><span>vor der Partie</span><span class="ef-k">Monatstabelle</span><span>danach</span></div>
      <svg viewBox="0 0 300 ${H}" aria-hidden="true">${svg}</svg></div>`;
  }

  // ── Der Lauf gegen den eigenen Bestwert und die Liga: die Serie ───────
  // „3 Siege nacheinander · Marke 5" sagte, wie weit es zur nächsten runden
  // Zahl ist. Ob drei für diesen Spieler viel sind, sagte es nicht.
  function serienleiter(a){
    const m = a.m, pid = a.x.pid, laenge = a.x.streak;
    const lauf = {}, best = {};
    let ligaBest = 0, ligaWer = null;
    for(const x of chrono()){
      if(mts(x) >= mts(m)) break;
      [x.a1, x.a2, x.b1, x.b2].forEach(id => {
        lauf[id] = gew(x, id) ? (lauf[id] || 0) + 1 : 0;
        if(lauf[id] > (best[id] || 0)) best[id] = lauf[id];
        if(lauf[id] > ligaBest){ ligaBest = lauf[id]; ligaWer = id; }
      });
    }
    const eig = best[pid] || 0;
    const n = Math.min(16, Math.max(laenge, eig, ligaBest));
    const zellen = Array.from({length:n}, (_, i) => `<i class="${i < laenge ? 'w' : ''}${i + 1 === eig ? ' eig' : ''}${i + 1 === ligaBest ? ' liga' : ''}" style="--i:${i}"></i>`).join('');
    const marke = (k, txt, cls) => k ? `<span class="ef-sl-m ${cls}${k / n > .6 ? ' re' : ''}" style="left:${(k / n * 100).toFixed(1)}%">${esc(txt)}</span>` : '';
    return `<div class="ef-sl"><div class="ef-sl-k">${chip(pid)}<b>${esc(nm(pid))}</b><em class="num">${laenge} in Folge</em></div>
      <div class="ef-sl-r">${zellen}</div>
      <div class="ef-sl-ms">${ligaBest === eig && ligaWer === pid ? marke(eig, 'eigener Bestwert ' + eig + ' · Liga-Rekord', 'eig')
        : marke(eig, 'eigener Bestwert ' + eig, 'eig') + (ligaBest !== eig ? marke(ligaBest, 'Liga ' + ligaBest + (ligaWer ? ' · ' + nm(ligaWer) : ''), 'liga') : '')}</div></div>`;
  }

  // ── Die Elo-Kurve: die Wende ──────────────────────────────────────────
  // Die letzten zwölf Partien des Siegers als Linie, aufsummiert aus der
  // Elo jeder Partie; die Pleiten davor als rote Punkte, dieser Sieg grün.
  function kurve(a){
    const m = a.m, pid = a.x.pid;
    const reihe = eigene(pid, m).slice(-12);
    let s = 0;
    const pkt = [{v:0}].concat(reihe.map(x => ({v:(s += (delta(pid, x) || 0)), w:gew(x, pid), jetzt:x === m})));
    const lo = Math.min(...pkt.map(p => p.v)), hi = Math.max(...pkt.map(p => p.v));
    const X = i => 12 + i * (276 / (pkt.length - 1)), Y = v => 10 + (hi - v) / Math.max(1, hi - lo) * 54;
    const pfad = pkt.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
    const punkte = pkt.slice(1).map((p, i) => `<circle class="${p.w ? 'w' : 'l'}${p.jetzt ? ' jetzt' : ''}" cx="${X(i + 1).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${p.jetzt ? 5 : 2.8}"/>`).join('');
    const d = delta(pid, m);
    return `<div class="ef-ku"><div class="ef-ku-k">${chip(pid)}<b>${esc(nm(pid))}</b><span>${a.x.n} Pleiten, dann <em class="g num">${vz(d)}</em></span></div>
      <svg viewBox="0 0 300 74" aria-hidden="true"><line class="ef-ku-0" x1="6" x2="294" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>
      <path class="ef-ku-l" pathLength="1" d="${pfad}"/>${punkte}</svg>
      <div class="ef-k">Elo über die letzten ${reihe.length} Partien</div></div>`;
  }

  // ── Jede Begegnung: die Rivalität ─────────────────────────────────────
  function begegnungen(a){
    const m = a.m, A = a.x.a, B = a.x.b;
    const alle = chrono().filter(x => mts(x) <= mts(m) && [x.a1, x.a2, x.b1, x.b2].includes(A)
      && [x.a1, x.a2, x.b1, x.b2].includes(B) && seite(x, A) !== seite(x, B));
    const zeig = alle.slice(-30);
    const aw = alle.filter(x => gew(x, A)).length;
    const bw = 20, gapx = 300 / Math.max(zeig.length, 12);
    const balken = zeig.map((x, i) => {
      const d = Math.abs(x.score_a - x.score_b), h = 6 + d * 2.6, w = gew(x, A);
      return `<rect class="${w ? 'a' : 'b'}${x === m ? ' jetzt' : ''}" x="${(i * gapx + 1).toFixed(1)}" y="${w ? 34 - h : 36}" width="${(gapx - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" style="--i:${i}"/>`;
    }).join('');
    return `<div class="ef-bg"><div class="ef-bg-k"><span>${chip(A)}<b>${esc(nm(A))}</b><em class="num">${aw}</em></span>`
      + `<span class="ef-bg-vs">gegeneinander</span><span class="re"><em class="num">${alle.length - aw}</em><b>${esc(nm(B))}</b>${chip(B)}</span></div>
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><line class="ef-bg-0" x1="0" x2="300" y1="35" y2="35"/>${balken}</svg>
      <div class="ef-k">${alle.length}. Begegnung · Balken so hoch wie der Abstand</div></div>`;
  }

  const KOPF = {feld: spielfeld, krimi: anzeigetafel, aussenseiter: wippe,
    spitze: a => zeile(a.m), rang: a => zeile(a.m), serie: a => zeile(a.m), wende: a => zeile(a.m), duell: a => zeile(a.m)};
  const FUSS = {feld: () => MARKE, krimi: nerven, deutlich: verteilung, aussenseiter: () => MARKE,
    spitze: a => tabelle(a, true), rang: a => tabelle(a, false), serie: serienleiter, wende: kurve, duell: begegnungen};
  // Der Satz unter der Schlagzeile streicht die Siegchance und die Elo, wenn
  // der Fuß sie zeigt (_newsSpielSatz). Spielfeld und Wippe zeigen beides im
  // Kopf; die Marke sagt das dem Satz, ohne selbst etwas zu zeichnen.
  const MARKE = '<span hidden class="nf-bogen nf-eloc"></span>';

  // ── Die Runde der Vier ────────────────────────────────────────────────
  // 182 der 466 Partien liegen in Runden: dieselben vier, innerhalb einer
  // Stunde, meist mit wechselnden Paarungen (48 von 57 Runden). Im Feed
  // standen sie als drei bis sechs Karten untereinander, mit denselben vier
  // Wappen in jedem Band. Eine Runde ist ein Abend am Tisch und eine Karte.
  function runde(stories){
    const ms = stories.map(s => M(s.dataRef.matchId)).sort((a, b) => mts(a) - mts(b));
    const ids = [ms[0].a1, ms[0].a2, ms[0].b1, ms[0].b2];
    const z = {};
    ids.forEach(id => { z[id] = {w:0, l:0, e:0}; });
    ms.forEach(m => ids.forEach(id => { gew(m, id) ? z[id].w++ : z[id].l++; z[id].e += delta(id, m) || 0; }));
    const rang = ids.slice().sort((a, b) => z[b].w - z[a].w || z[b].e - z[a].e);
    const maxE = Math.max(8, ...ids.map(id => Math.abs(z[id].e)));
    const paarungen = new Set(ms.map(m => [[m.a1, m.a2].sort().join('+'), [m.b1, m.b2].sort().join('+')].sort().join('|'))).size;
    const min = Math.round((mts(ms[ms.length - 1]) - mts(ms[0])) / 60000);
    const top = rang[0], allein = z[top].w > z[rang[1]].w;
    const titel = allein
      ? `${nm(top)} gewinnt die Runde: ${z[top].w} von ${ms.length}`
      : `${namen(rang.filter(id => z[id].w === z[top].w))} teilen sich die Runde`;
    const satz = `${zahlwort(ms.length).replace(/^./, c => c.toUpperCase())} Partien in ${min} Minuten`
      + (paarungen === 3 ? ', jede Paarung mindestens einmal.' : paarungen > 1 ? `, ${zahlwort(paarungen)} Paarungen.` : ', immer dieselben Teams.');
    const tafel = rang.map((id, i) => `<div class="ef-rd-sp${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">${wap(id, 48)}`
      + `<b>${esc(nm(id))}</b><span class="num">${z[id].w}:${z[id].l}</span>`
      + `<i class="ef-rd-e ${z[id].e >= 0 ? 'g' : 'r'}"><u style="width:${(Math.abs(z[id].e) / maxE * 100).toFixed(0)}%"></u></i>`
      + `<em class="num ${z[id].e >= 0 ? 'g' : 'r'}">${vz(Math.round(z[id].e))}</em></div>`).join('');
    const reihen = stories.slice().sort((a, b) => mts(M(a.dataRef.matchId)) - mts(M(b.dataRef.matchId))).map((s, i) => {
      const m = M(s.dataRef.matchId), an = anlass(s), aw = m.winner === 'A';
      const t = (sd, w) => `<span class="ef-rd-t${w ? ' w' : ''}">${team(m, sd).map(chip).join('')}</span>`;
      return `<div class="ef-rd-p" style="--i:${i}"><span class="ef-rd-u num">${datumFmt(mts(m), 'uhr')}</span>${t('A', aw)}`
        + `<b class="num"><em class="${aw ? 'w' : ''}">${m.score_a}</em>:<em class="${aw ? '' : 'w'}">${m.score_b}</em></b>${t('B', !aw)}`
        + (an.key !== 'feld' ? `<span class="ef-rd-a">${svgI(ANLASS_IC[an.key] || 'clock')}<span>${esc(KURZ[an.key] || ANLASS_NAME[an.key])}</span></span>` : '<span class="ef-rd-a leer"></span>')
        + `</div>`;
    }).join('');
    const neu = stories.some(s => s._neu);
    return `<div class="nf-card nf-s-spiel ef-runde" data-sid="runde_${esc(stories[0].id)}">
      ${_newsMotiv('spiel', stories[0])}
      <div class="nf-top"><span class="nf-rub"><i>${svgI('users')}</i><b>DIE RUNDE</b></span>
        <span class="nf-when">${svgI('clock')}${esc(datumFmt(mts(ms[0]), 'uhr'))} – ${esc(datumFmt(mts(ms[ms.length - 1]), 'uhr'))}</span></div>
      <div class="ef-rd-tafel">${tafel}</div>
      <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(titel)}</div><div class="nf-d">${_newsBetont(satz)}</div></div>
        <span class="nf-chev">${svgI('chevron')}</span></div>
      <div class="ef-rd-ps">${reihen}</div>
    </div>`;
  }
  // Runden finden: im Feed direkt benachbarte Partie-Karten derselben vier
  // Spieler, die höchstens eine Stunde auseinanderliegen.
  const st = {};
  function rundenFinden(){
    const karten = [...document.querySelectorAll('#sheet .nf-card.nf-s-spiel')];
    const gruppen = [];
    let g = null;
    karten.forEach(k => {
      const s = st[k.dataset.sid], m = s && s.dataRef && M(s.dataRef.matchId);
      const set = m && [m.a1, m.a2, m.b1, m.b2].sort().join(',');
      const nachbar = g && k.previousElementSibling === g.karten[g.karten.length - 1];
      if(m && g && nachbar && g.set === set && Math.abs(mts(m) - g.t) <= 3600000){
        g.karten.push(k); g.stories.push(s); g.t = mts(m);
      } else {
        g = m ? {set, karten:[k], stories:[s], t:mts(m)} : null;
        if(g) gruppen.push(g);
      }
    });
    return gruppen.filter(x => x.karten.length >= 2);
  }

  return {
    anlass, st, ANLASS_NAME,
    aufzeichnen(){
      const orig = _newsCardHtmlM2;
      _newsCardHtmlM2 = function(s){ st[s.id] = s; return orig.apply(this, arguments); };
    },
    anwenden(){
      const origCard = _newsCardHtmlM2, origBand = _newsErgebnisBand, origFuss = _newsSpielFuss;
      let jetzt = null;
      _newsCardHtmlM2 = function(s){ jetzt = s; try { return origCard.apply(this, arguments); } finally { jetzt = null; } };
      _newsErgebnisBand = function(matchId){
        const s = jetzt;
        if(s && _newsSorte(s) === 'spiel' && (s.dataRef || {}).matchId === matchId){
          const a = anlass(s); if(KOPF[a.key]) return KOPF[a.key](a);
        }
        return origBand(matchId);
      };
      _newsSpielFuss = function(s){
        const a = anlass(s);
        return FUSS[a.key] ? FUSS[a.key](a) : origFuss(s);
      };
    },
    runden(){
      const gr = rundenFinden();
      gr.forEach(g => {
        const tmp = document.createElement('div');
        tmp.innerHTML = runde(g.stories);
        const neu = tmp.firstElementChild;
        g.karten[0].parentNode.insertBefore(neu, g.karten[0]);
        g.karten.forEach(k => k.remove());
      });
      return gr.map(g => ({id:'runde_' + g.stories[0].id, von:g.karten.map(k => k.dataset.sid)}));
    },
    rundenVorschau(){ return rundenFinden().map(g => g.karten.map(k => k.dataset.sid)); }
  };
})();
'entwurf geladen';
