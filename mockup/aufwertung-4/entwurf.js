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
// JEDES BAUTEIL HAT ZWEI HÄLFTEN: `…Daten` rechnet aus den Partien, `…Bild`
// zeichnet nur, was es bekommt. Die Liga wächst — aus 466 Partien werden
// 4 660 und 46 600, aus „Leo" wird „Maximilian-Alexander" —, und eine
// Zeichnung, die mit den Zahlen von heute passt, läuft mit denen von morgen
// über. Weil das Bild nur Daten nimmt, zeichnet bau.js jedes Bauteil auch mit
// erfundenen Grenzwerten und misst, dass nichts übereinanderliegt und nichts
// ohne Auslassungszeichen abgeschnitten wird (`pruefen`).
//
// Was dafür überall gilt:
// - Ein Name steht in einer eigenen Zeile und endet mit „…", nie unter oder
//   über etwas anderem. In einer SVG-Zeichnung, die kein „…" kennt, kürzt
//   ihn `kurz` auf eine feste Zeichenzahl.
// - Eine Zahl, die mit der Liga wächst, trägt ab 1 000 den Tausenderpunkt
//   (`zahl`), und wo sie in einer festen Zelle steht, wird sie kleiner statt
//   breiter (`lang`).
// - Was mit der Zahl wächst (Zellen, Zeilen, Balken), hat einen Deckel und
//   sagt, was dahinter liegt.
// - Farben nach §C25 (Grün/Rot nur Richtung, Gold nur Titel, sonst Metall),
//   vorhandene Bauteile zuerst [§C27], bewegt wird nur transform und
//   Deckkraft, und bei Bewegungsruhe steht alles.
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
  const zahl = n => Math.abs(n) >= 1000 ? Math.abs(n).toLocaleString('de-DE') : String(Math.abs(n));
  const vz = v => v == null ? '' : (v > 0 ? '+' : v < 0 ? '−' : '±') + zahl(Math.round(v));
  const minus = v => (v < 0 ? '−' : '') + zahl(Math.round(v));
  // Länger als die Zelle, für die der Text gebaut ist: eine Stufe kleiner.
  const lang = (t, a, b) => { const n = String(t).length; return n > b ? ' sehrlang' : n > a ? ' lang' : ''; };
  const kurz = (t, n) => { const s = String(t); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  // Ein Name je Zeile, mit Auslassungszeichen: zwei Namen mit „&" in einer
  // Zeile brachen auf dem Telefon nach dem ersten ab.
  const namen = ids => ids.map(id => `<span>${esc(nm(id))}</span>`).join('');
  const chips = ids => `<span class="ef-chips">${ids.map(chip).join('')}</span>`;
  const chance = m => {
    const h = getHistoryByMatchId().get(m.id);
    const e = h && h.expA != null ? h.expA : m.exp_a;
    return e == null ? null : (m.winner === 'A' ? e : 1 - e);
  };
  const chrono = () => (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  const eigene = (pid, bis) => chrono().filter(x => mts(x) <= mts(bis) && [x.a1, x.a2, x.b1, x.b2].includes(pid));
  const namenSatz = ids => _namenListe(ids.map(nm));
  const zahlwort = n => ['null','eine','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf'][n] || zahl(n);

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
  const zeileDaten = m => ({A:team(m, 'A'), B:team(m, 'B'), sa:m.score_a, sb:m.score_b, aw:m.winner === 'A'});
  function zeileBild(d){
    const s = (ids, w, re) => `<span class="ef-z-s${w ? ' w' : ''}${re ? ' re' : ''}">${chips(ids)}<span class="ef-n">${namen(ids)}</span></span>`;
    return `<div class="ef-zeile">${s(d.A, d.aw)}<b class="ef-z-sc num"><em class="${d.aw ? 'w' : ''}">${d.sa}</em>`
      + `<i>:</i><em class="${d.aw ? '' : 'w'}">${d.sb}</em></b>${s(d.B, !d.aw, true)}</div>`;
  }

  // ── Das Spielfeld: die gewöhnliche Partie ─────────────────────────────
  // Die Karte zeigte nie, wer wo stand — die Rolle ist aber die halbe
  // Geschichte einer Kicker-Partie. Die vier stehen auf ihren Stangen in der
  // Reihenfolge des Tisches: Abwehr A, Sturm B, Sturm A, Abwehr B. Unter
  // jedem die Elo der Partie; die Elo-Waage darunter entfällt damit.
  function spielfeldDaten(a){
    const m = a.m;
    const rolle = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_pos'];
    const def = s => team(m, s).find(id => rolle(id) === 'def') || team(m, s)[0];
    const atk = s => team(m, s).find(id => id !== def(s));
    const slot = (id, r) => ({id, r, w:gew(m, id), d:delta(id, m), t:seite(m, id)});
    return {slots:[slot(def('A'), 'Abwehr'), slot(atk('B'), 'Sturm'), slot(atk('A'), 'Sturm'), slot(def('B'), 'Abwehr')],
      sa:m.score_a, sb:m.score_b, aw:m.winner === 'A', c:a.c};
  }
  function spielfeldBild(d){
    const X = [11, 35, 65, 89];
    return `<div class="ef-feld">
      <span class="ef-f-tor l"></span><span class="ef-f-tor r"></span><span class="ef-f-mitte"></span>
      ${d.slots.map((s, i) => `<i class="ef-f-stange" style="left:${X[i]}%"></i><span class="ef-f-rolle" style="left:${X[i]}%">${s.r}</span>`
        + `<div class="ef-f-sp${s.w ? ' w' : ''}" style="left:${X[i]}%;--i:${i}">${wap(s.id, 48)}`
        + `<b class="ef-n"><span>${esc(nm(s.id))}</span></b><em class="${(s.d || 0) >= 0 ? 'g' : 'r'} num">${vz(s.d)}</em></div>`).join('')}
      <div class="ef-f-sc"><b class="num"><em class="${d.aw ? 'w' : ''}">${d.sa}</em><i>:</i><em class="${d.aw ? '' : 'w'}">${d.sb}</em></b>
        ${d.c != null ? `<span>${Math.round(d.c * 100)} % Chance</span>` : ''}</div>
    </div>`;
  }

  // ── Die Anzeigetafel: der Ein-Tor-Krimi ───────────────────────────────
  const tafelDaten = a => ({A:team(a.m, 'A'), B:team(a.m, 'B'), sa:a.m.score_a, sb:a.m.score_b, aw:a.m.winner === 'A', c:a.c});
  function tafelBild(d){
    const t = (ids, sc, w) => `<div class="ef-at-t${w ? ' w' : ''}"><b class="num${lang(sc, 2, 3)}">${sc}</b>`
      + `${chips(ids)}<span class="ef-n">${namen(ids)}</span></div>`;
    return `<div class="ef-at">${t(d.A, d.sa, d.aw)}<div class="ef-at-m"><span>EIN TOR</span>`
      + (d.c != null ? `<em>${Math.round(d.c * 100)} : ${100 - Math.round(d.c * 100)}</em><i>Chance vorher</i>` : '')
      + `</div>${t(d.B, d.sb, !d.aw)}</div>`;
  }
  // Wer gewinnt die engen Partien? Je Sieger die letzten acht mit einem Tor
  // Unterschied bis zu dieser, und die Bilanz aller.
  function nervenDaten(a){
    const m = a.m;
    return {zeilen:W(m).map(pid => {
      const eng = eigene(pid, m).filter(x => Math.abs(x.score_a - x.score_b) === 1);
      const w = eng.filter(x => gew(x, pid)).length;
      return {id:pid, w, l:eng.length - w, zellen:eng.slice(-8).map(x => gew(x, pid) ? (x === m ? 'W' : 'w') : 'l')};
    })};
  }
  function nervenBild(d){
    const z = d.zeilen.map(r => `<div class="ef-nv-z">${chip(r.id)}<b class="ef-n"><span>${esc(nm(r.id))}</span></b>`
      + `<span class="ef-nv-c">${r.zellen.map(c => `<i class="${c === 'l' ? 'l' : 'w'}${c === 'W' ? ' jetzt' : ''}"></i>`).join('')}</span>`
      + `<em class="num">${zahl(r.w)}:${zahl(r.l)}</em></div>`).join('');
    return `<div class="ef-nv"><div class="ef-k">Enge Partien bis zu dieser</div>${z}</div>`;
  }

  // ── Die Verteilung: der klare Sieg ────────────────────────────────────
  // „Zuletzt so deutlich am …" sagte, wann; nicht, wie selten. Zehn Säulen,
  // eine je Ergebnis von 10:9 bis 10:0, gezählt über die Liga bis zu dieser
  // Partie — diese hell, die deutlicheren leiser dahinter.
  function verteilungDaten(a){
    const m = a.m, diff = Math.abs(m.score_a - m.score_b);
    const bis = chrono().filter(x => mts(x) <= mts(m));
    const n = Array(11).fill(0);
    bis.forEach(x => n[Math.abs(x.score_a - x.score_b)]++);
    let zuletzt = null;
    bis.forEach(x => { if(x !== m && Math.abs(x.score_a - x.score_b) >= diff) zuletzt = mts(x); });
    return {n, diff, gesamt:bis.length, so:bis.filter(x => Math.abs(x.score_a - x.score_b) >= diff).length, zuletzt};
  }
  function verteilungBild(d){
    const max = Math.max(1, ...d.n.slice(1));
    const saeulen = [];
    for(let k = 1; k <= 10; k++){
      saeulen.push(`<span class="ef-vt-s${k === d.diff ? ' jetzt' : k > d.diff ? ' mehr' : ''}" style="--i:${k}">`
        + `<i style="height:${(d.n[k] / max * 100).toFixed(0)}%"></i><em>${10 - k}</em></span>`);
    }
    return `<div class="ef-vt"><div class="ef-k">Alle ${zahl(d.gesamt)} Partien nach Gegentoren</div>
      <div class="ef-vt-g">${saeulen.join('')}</div>
      <div class="ef-vt-f"><b class="num">${zahl(d.so)}</b> von ${zahl(d.gesamt)} Partien so deutlich oder deutlicher`
      + `${d.zuletzt ? `, zuletzt am ${datumFmt(d.zuletzt, 'tm')}` : ''}</div></div>`;
  }

  // ── Die Wippe: der Außenseitersieg ────────────────────────────────────
  // Das Gewicht ist die Elo vor dem Anstoß. Der Favorit sitzt unten, wie es
  // die Rechnung erwartet hat — gewonnen hat die leichte Seite. Die Schilder
  // stehen am Rand der Karte und nicht an den Enden des Balkens: dort liefen
  // lange Namen über die Kante und in die Zahl in der Mitte.
  function wippeDaten(a){
    const m = a.m, h = getHistoryByMatchId().get(m.id) || {};
    const elo = ids => Math.round(ids.reduce((s, id) => s + ((h.eloBefore || {})[id] || 0), 0) / ids.length);
    return {fav:L(m), dog:W(m), eloFav:elo(L(m)), eloDog:elo(W(m)), pct:Math.round(a.c * 100)};
  }
  function wippeBild(d){
    const gap = Math.max(0, d.eloFav - d.eloDog);
    const th = Math.min(13, 5 + gap / 25) * Math.PI / 180;
    const px = 150, py = 86, r = 104;
    const lx = px - r * Math.cos(th), ly = py + r * Math.sin(th);
    const rx = px + r * Math.cos(th), ry = py - r * Math.sin(th);
    const P = (x, y) => `left:${(x / 300 * 100).toFixed(1)}%;top:${(y / 120 * 100).toFixed(1)}%`;
    const schild = (ids, e, p, w) => `<div class="ef-wp-l${w ? ' w' : ' fav'}"><b class="ef-n"><span>${esc(ids.map(nm).join(' & '))}</span></b>`
      + `<span>Ø ${minus(e)} Elo</span><span>${p} % Chance</span></div>`;
    return `<div class="ef-wp">
      <div class="ef-wp-gap"><b class="num">${zahl(gap)}</b><span>Elo Gefälle</span></div>
      <div class="ef-wp-bahn">
        <svg viewBox="0 0 300 120" aria-hidden="true">
          <path class="ef-wp-dr" d="M${px} ${py}L${px - 13} ${py + 24}H${px + 13}Z"/>
          <line class="ef-wp-bk" x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}"/>
          <circle class="ef-wp-ax" cx="${px}" cy="${py}" r="3.5"/>
        </svg>
        <div class="ef-wp-t" style="${P(lx + 8, ly - 4)}">${chips(d.fav)}</div>
        <div class="ef-wp-t w" style="${P(rx - 8, ry - 4)}">${chips(d.dog)}</div>
      </div>
      <div class="ef-wp-ls">${schild(d.fav, d.eloFav, 100 - d.pct, false)}${schild(d.dog, d.eloDog, d.pct, true)}</div>
    </div>`;
  }

  // ── Die Tabelle vorher und nachher: Spitzenwechsel und Rangsprung ─────
  // Eine Linie je Spieler von seinem Platz vor der Partie zu dem danach.
  // Wer durch diese Partie steigt, ist grün, wer dadurch fällt, rot — die
  // Richtung [§C25]; die übrigen bleiben Metall. Die neue Spitze trägt Gold.
  // Höchstens neun Zeilen: in einer Liga mit vierzig Spielern ginge sonst die
  // Bewegung zwischen Platz 31 und 33 in einer Wand aus Linien unter.
  function tabelleDaten(a, spitze){
    const m = a.m, snap = getRankSnapshots()[m.id];
    if(!snap) return null;
    const fokus = new Set(spitze ? [a.x.newLeader, a.x.prevLeader] : a.x.map(w => w.pid));
    const dabei = new Set([m.a1, m.a2, m.b1, m.b2]);
    const alle = Object.keys(snap.postRank);
    // Das Fenster: die Plätze um die Bewegung, oben angefangen, neun lang.
    const fr = [...fokus].flatMap(id => [snap.preRank[id], snap.postRank[id]]).filter(Boolean);
    const unten = Math.max(...fr), von = Math.max(1, Math.min(Math.min(...fr), unten - 8)), bis = von + 8;
    const zeilen = alle.filter(id => snap.preRank[id] >= von && snap.preRank[id] <= bis && snap.postRank[id] >= von && snap.postRank[id] <= bis)
      .map(id => {
        const p = snap.preRank[id], q = snap.postRank[id];
        const k = (fokus.has(id) || dabei.has(id)) && p !== q ? (q < p ? 'g' : 'r') : 'm';
        return {id, p, q, k};
      });
    return {zeilen, von, bis, spitze};
  }
  function tabelleBild(d){
    if(!d) return '';
    const y = r => 14 + (r - d.von) * 19, H = y(d.bis) + 12;
    // SVG kennt kein „…": der Name wird auf zwölf Zeichen gekürzt, die
    // Platzzahl hat bis zu drei Stellen, und beides passt in 92 Einheiten.
    const t = (x, yy, txt, cls, anchor) => `<text x="${x}" y="${yy + 3.5}" class="${cls}" text-anchor="${anchor}">${esc(txt)}</text>`;
    const reihen = d.zeilen.slice().sort((u, v) => (u.k !== 'm') - (v.k !== 'm'));
    const svg = reihen.map(l => `<path class="ef-tb-l ${l.k}" d="M106 ${y(l.p)}C150 ${y(l.p)} 150 ${y(l.q)} 194 ${y(l.q)}"/>`
      + `<circle class="ef-tb-p ${l.k}" cx="106" cy="${y(l.p)}" r="2.6"/><circle class="ef-tb-p ${l.k}" cx="194" cy="${y(l.q)}" r="2.6"/>`
      + t(98, y(l.p), kurz(nm(l.id), 12) + '  ' + l.p, 'ef-tb-t ' + l.k, 'end')
      + t(202, y(l.q), l.q + '  ' + kurz(nm(l.id), 12), 'ef-tb-t ' + l.k + (d.spitze && l.q === 1 ? ' gold' : ''), 'start')).join('');
    return `<div class="ef-tb"><div class="ef-tb-k"><span>vorher</span><span class="ef-k">Monatstabelle${d.von > 1 ? ` ab Platz ${d.von}` : ''}</span><span>danach</span></div>
      <svg viewBox="0 0 300 ${H}" aria-hidden="true">${svg}</svg></div>`;
  }

  // ── Der Lauf gegen den eigenen Bestwert und die Liga: die Serie ───────
  // „3 Siege nacheinander · Marke 5" sagte, wie weit es zur nächsten runden
  // Zahl ist. Ob drei für diesen Spieler viel sind, sagte es nicht. Bis
  // sechzehn steht eine Zelle je Sieg; darüber ein Balken auf derselben
  // Skala — sechzig Zellen wären Striche. Die Marken stehen als Striche auf
  // der Bahn und ihre Namen in einer Zeile darunter: an der Bahn selbst
  // lagen zwei nahe Marken übereinander.
  function serieDaten(a){
    const m = a.m, pid = a.x.pid;
    const lauf = {}, best = {};
    let liga = 0, ligaWer = null;
    for(const x of chrono()){
      if(mts(x) >= mts(m)) break;
      [x.a1, x.a2, x.b1, x.b2].forEach(id => {
        lauf[id] = gew(x, id) ? (lauf[id] || 0) + 1 : 0;
        if(lauf[id] > (best[id] || 0)) best[id] = lauf[id];
        if(lauf[id] > liga){ liga = lauf[id]; ligaWer = id; }
      });
    }
    return {pid, laenge:a.x.streak, eig:best[pid] || 0, liga, ligaWer};
  }
  function serieBild(d){
    const max = Math.max(d.laenge, d.eig, d.liga, 1);
    const zellen = max <= 16;
    const n = zellen ? max : 100;
    const pos = k => (k / max * 100).toFixed(2);
    const bahn = zellen
      ? Array.from({length:n}, (_, i) => `<i class="${i < d.laenge ? 'w' : ''}" style="--i:${i}"></i>`).join('')
      : `<i class="ef-sl-voll" style="width:${pos(d.laenge)}%"></i>`;
    const strich = (k, cls) => k ? `<u class="${cls}" style="left:${pos(k)}%"></u>` : '';
    const selbst = d.ligaWer === d.pid && d.liga === d.eig;
    const legende = [d.eig ? `<span class="eig">eigener Bestwert ${zahl(d.eig)}${selbst ? ', zugleich Liga-Rekord' : ''}</span>` : '',
      !selbst && d.liga ? `<span class="liga">Liga-Rekord ${zahl(d.liga)}${d.ligaWer ? ` von ${esc(nm(d.ligaWer))}` : ''}</span>` : ''].join('');
    return `<div class="ef-sl"><div class="ef-sl-k">${chip(d.pid)}<b class="ef-n"><span>${esc(nm(d.pid))}</span></b><em class="num">${zahl(d.laenge)} in Folge</em></div>
      <div class="ef-sl-r${zellen ? '' : ' balken'}">${bahn}${strich(d.eig, 'eig')}${selbst ? '' : strich(d.liga, 'liga')}</div>
      <div class="ef-sl-ms">${legende}</div></div>`;
  }

  // ── Die Elo-Kurve: die Wende ──────────────────────────────────────────
  // Die letzten zwölf Partien des Siegers als Linie, aufsummiert aus der
  // Elo jeder Partie; die Pleiten davor als rote Punkte, dieser Sieg grün.
  function kurveDaten(a){
    const m = a.m, pid = a.x.pid;
    let s = 0;
    const werte = eigene(pid, m).slice(-12).map(x => ({v:(s += (delta(pid, x) || 0)), w:gew(x, pid), jetzt:x === m}));
    return {pid, werte, n:a.x.n, d:delta(pid, m)};
  }
  function kurveBild(d){
    const pkt = [{v:0}].concat(d.werte);
    const lo = Math.min(...pkt.map(p => p.v)), hi = Math.max(...pkt.map(p => p.v));
    const X = i => 12 + i * (276 / Math.max(1, pkt.length - 1)), Y = v => 10 + (hi - v) / Math.max(1, hi - lo) * 54;
    const pfad = pkt.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
    const punkte = pkt.slice(1).map((p, i) => `<circle class="${p.w ? 'w' : 'l'}${p.jetzt ? ' jetzt' : ''}" cx="${X(i + 1).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${p.jetzt ? 5 : 2.8}"/>`).join('');
    return `<div class="ef-ku"><div class="ef-ku-k">${chip(d.pid)}<b class="ef-n"><span>${esc(nm(d.pid))}</span></b>`
      + `<span class="ef-ku-s">${zahl(d.n)} Pleiten, dann <em class="g num">${vz(d.d)}</em></span></div>
      <svg viewBox="0 0 300 74" aria-hidden="true"><line class="ef-ku-0" x1="6" x2="294" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>
      <path class="ef-ku-l" pathLength="1" d="${pfad}"/>${punkte}</svg>
      <div class="ef-k">Elo über die letzten ${zahl(d.werte.length)} Partien</div></div>`;
  }

  // ── Jede Begegnung: die Rivalität ─────────────────────────────────────
  // Gezeigt werden die letzten dreißig; die Bilanz darüber zählt alle.
  function duellDaten(a){
    const m = a.m, A = a.x.a, B = a.x.b;
    const alle = chrono().filter(x => mts(x) <= mts(m) && [x.a1, x.a2, x.b1, x.b2].includes(A)
      && [x.a1, x.a2, x.b1, x.b2].includes(B) && seite(x, A) !== seite(x, B));
    return {A, B, gesamt:alle.length, aw:alle.filter(x => gew(x, A)).length,
      spiele:alle.slice(-30).map(x => ({a:gew(x, A), diff:Math.abs(x.score_a - x.score_b), jetzt:x === m}))};
  }
  function duellBild(d){
    const gapx = 300 / Math.max(d.spiele.length, 12);
    const balken = d.spiele.map((x, i) => {
      const h = 6 + x.diff * 2.6;
      return `<rect class="${x.a ? 'a' : 'b'}${x.jetzt ? ' jetzt' : ''}" x="${(i * gapx + 1).toFixed(1)}" y="${x.a ? 34 - h : 36}" width="${Math.max(1, gapx - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" style="--i:${i}"/>`;
    }).join('');
    const mehr = d.gesamt > d.spiele.length ? `, davon die letzten ${zahl(d.spiele.length)}` : '';
    return `<div class="ef-bg"><div class="ef-bg-k"><span>${chip(d.A)}<b class="ef-n"><span>${esc(nm(d.A))}</span></b><em class="num">${zahl(d.aw)}</em></span>`
      + `<span class="re"><em class="num">${zahl(d.gesamt - d.aw)}</em><b class="ef-n"><span>${esc(nm(d.B))}</span></b>${chip(d.B)}</span></div>
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><line class="ef-bg-0" x1="0" x2="300" y1="35" y2="35"/>${balken}</svg>
      <div class="ef-k">${zahl(d.gesamt)} Begegnungen${mehr}</div></div>`;
  }

  // ── Die Runde der Vier ────────────────────────────────────────────────
  // 182 der 466 Partien liegen in Runden: dieselben vier, innerhalb einer
  // Stunde, meist mit wechselnden Paarungen (48 von 57 Runden). Im Feed
  // standen sie als drei bis sechs Karten untereinander, mit denselben vier
  // Wappen in jedem Band. Eine Runde ist ein Tag am Tisch und eine Karte.
  // Höchstens acht Partien stehen als Zeile, der Rest als Zahl darunter.
  const RUNDE_ZEILEN = 8;
  function rundeDaten(stories){
    const ps = stories.map(s => ({s, m:M(s.dataRef.matchId)})).sort((a, b) => mts(a.m) - mts(b.m));
    const ms = ps.map(p => p.m);
    const ids = [ms[0].a1, ms[0].a2, ms[0].b1, ms[0].b2];
    const z = {};
    ids.forEach(id => { z[id] = {id, w:0, l:0, e:0}; });
    ms.forEach(m => ids.forEach(id => { gew(m, id) ? z[id].w++ : z[id].l++; z[id].e += delta(id, m) || 0; }));
    return {
      spieler: ids.map(id => z[id]).sort((a, b) => b.w - a.w || b.e - a.e),
      partien: ps.map(({s, m}) => ({t:mts(m), A:team(m, 'A'), B:team(m, 'B'), sa:m.score_a, sb:m.score_b, aw:m.winner === 'A', anlass:anlass(s).key})),
      paarungen: new Set(ms.map(m => [[m.a1, m.a2].sort().join('+'), [m.b1, m.b2].sort().join('+')].sort().join('|'))).size,
      sid: stories[0].id
    };
  }
  function rundeBild(d){
    const sp = d.spieler, top = sp[0], allein = top.w > sp[1].w;
    const n = d.partien.length;
    const min = Math.round((d.partien[n - 1].t - d.partien[0].t) / 60000);
    const titel = allein
      ? `${nm(top.id)} gewinnt die Runde: ${zahl(top.w)} von ${zahl(n)}`
      : `${namenSatz(sp.filter(x => x.w === top.w).map(x => x.id))} teilen sich die Runde`;
    const satz = `${zahlwort(n).replace(/^./, c => c.toUpperCase())} Partien in ${zahl(min)} Minuten`
      + (d.paarungen === 3 ? ', jede Paarung mindestens einmal.' : d.paarungen > 1 ? `, ${zahlwort(d.paarungen)} Paarungen.` : ', immer dieselben Teams.');
    const maxE = Math.max(8, ...sp.map(x => Math.abs(x.e)));
    const tafel = sp.map((x, i) => {
      const wl = `${zahl(x.w)}:${zahl(x.l)}`;
      return `<div class="ef-rd-sp${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">${wap(x.id, 48)}`
        + `<b class="ef-n"><span>${esc(nm(x.id))}</span></b><span class="ef-rd-wl num${lang(wl, 5, 7)}">${wl}</span>`
        + `<i class="ef-rd-e ${x.e >= 0 ? 'g' : 'r'}"><u style="width:${(Math.abs(x.e) / maxE * 100).toFixed(0)}%"></u></i>`
        + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${vz(x.e)}</em></div>`;
    }).join('');
    const zeig = d.partien.slice(0, RUNDE_ZEILEN);
    const reihen = zeig.map((p, i) => {
      const t = (ids, w) => `<span class="ef-rd-t${w ? ' w' : ''}">${chips(ids)}</span>`;
      return `<div class="ef-rd-p" style="--i:${i}"><span class="ef-rd-u num">${datumFmt(p.t, 'uhr')}</span>${t(p.A, p.aw)}`
        + `<b class="num"><em class="${p.aw ? 'w' : ''}">${p.sa}</em>:<em class="${p.aw ? '' : 'w'}">${p.sb}</em></b>${t(p.B, !p.aw)}`
        + (p.anlass !== 'feld' ? `<span class="ef-rd-a">${svgI(ANLASS_IC[p.anlass] || 'ball')}<span>${esc(KURZ[p.anlass] || ANLASS_NAME[p.anlass] || '')}</span></span>` : '<span></span>')
        + `</div>`;
    }).join('') + (n > zeig.length ? `<div class="ef-rd-mehr">und ${zahl(n - zeig.length)} weitere Partien</div>` : '');
    return `<div class="nf-card nf-s-spiel ef-runde" data-sid="runde_${esc(d.sid)}">
      ${_newsMotiv('spiel', {dataRef:{}})}
      <div class="nf-top"><span class="nf-rub"><i>${svgI('users')}</i><b>DIE RUNDE</b></span>
        <span class="nf-when">${svgI('clock')}${esc(datumFmt(d.partien[0].t, 'uhr'))} – ${esc(datumFmt(d.partien[n - 1].t, 'uhr'))}</span></div>
      <div class="ef-rd-tafel">${tafel}</div>
      <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(titel)}</div><div class="nf-d">${_newsBetont(satz)}</div></div>
        <span class="nf-chev">${svgI('chevron')}</span></div>
      <div class="ef-rd-ps">${reihen}</div>
    </div>`;
  }

  // Kopf und Fuß je Anlass: Daten und Bild hintereinander.
  const KOPF = {feld: a => spielfeldBild(spielfeldDaten(a)), krimi: a => tafelBild(tafelDaten(a)), aussenseiter: a => wippeBild(wippeDaten(a)),
    spitze: a => zeileBild(zeileDaten(a.m)), rang: a => zeileBild(zeileDaten(a.m)), serie: a => zeileBild(zeileDaten(a.m)),
    wende: a => zeileBild(zeileDaten(a.m)), duell: a => zeileBild(zeileDaten(a.m))};
  // Der Satz unter der Schlagzeile streicht die Siegchance und die Elo, wenn
  // der Fuß sie zeigt (_newsSpielSatz). Spielfeld und Wippe zeigen beides im
  // Kopf; die Marke sagt das dem Satz, ohne selbst etwas zu zeichnen.
  const MARKE = '<span hidden class="nf-bogen nf-eloc"></span>';
  const FUSS = {feld: () => MARKE, aussenseiter: () => MARKE, krimi: a => nervenBild(nervenDaten(a)),
    deutlich: a => verteilungBild(verteilungDaten(a)), spitze: a => tabelleBild(tabelleDaten(a, true)),
    rang: a => tabelleBild(tabelleDaten(a, false)), serie: a => serieBild(serieDaten(a)),
    wende: a => kurveBild(kurveDaten(a)), duell: a => duellBild(duellDaten(a))};

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

  // ── Die Grenzwerte ────────────────────────────────────────────────────
  // Jedes Bild einmal mit Zahlen, die die Liga in einigen Jahren haben kann,
  // und mit Namen, die keiner hat. Die Spieler bleiben echte Spieler — ihre
  // Wappen hängen an ihrer Laufbahn —, nur die Namen werden für die Probe
  // ersetzt und danach zurückgestellt.
  const LANGE_NAMEN = ['Maximilian-Alexander', 'Bartholomäus', 'Jean-Baptiste von Hohenstein', 'Konstantinopel',
    'Anneliese-Charlotte', 'Wolfgang Amadeus', 'Christophorus', 'Friederike-Sophie', 'Leopoldine', 'Ottokar', 'Kunigunde', 'Ferdinand'];
  function grenzwerte(){
    const ids = Object.keys(pm).slice(0, 4);
    const [a, b, c, e] = ids;
    const d0 = Date.now();
    const zellen = Array.from({length:8}, (_, i) => i % 3 ? 'w' : 'l'); zellen[7] = 'W';
    const spiele = Array.from({length:30}, (_, i) => ({a:i % 2 === 0, diff:(i * 7) % 10 + 1, jetzt:i === 29}));
    return [
      ['Ergebniszeile', zeileBild({A:[a, b], B:[c, e], sa:9, sb:10, aw:false})],
      ['Spielfeld', spielfeldBild({slots:[{id:a, r:'Abwehr', w:true, d:1234}, {id:b, r:'Sturm', w:false, d:-1234}, {id:c, r:'Sturm', w:true, d:999}, {id:e, r:'Abwehr', w:false, d:-99999}], sa:10, sb:9, aw:true, c:.03})],
      ['Anzeigetafel', tafelBild({A:[a, b], B:[c, e], sa:10, sb:9, aw:true, c:.5}) + nervenBild({zeilen:[{id:a, w:12345, l:9876, zellen}, {id:b, w:999, l:1000, zellen}]})],
      ['Verteilung', verteilungBild({n:[0, 9000, 8500, 8000, 7000, 6000, 4000, 2000, 900, 90, 9], diff:8, gesamt:45495, so:999, zuletzt:d0})],
      ['Wippe', wippeBild({fav:[a, b], dog:[c, e], eloFav:12345, eloDog:-9876, pct:1})],
      ['Tabelle', tabelleBild({von:118, bis:126, spitze:false, zeilen:[{id:a, p:118, q:126, k:'r'}, {id:b, p:126, q:118, k:'g'}, {id:c, p:121, q:121, k:'m'}, {id:e, p:122, q:123, k:'m'}]})],
      ['Serie mit Balken', serieBild({pid:a, laenge:57, eig:120, liga:340, ligaWer:b})],
      ['Serie mit Zellen', serieBild({pid:a, laenge:15, eig:15, liga:16, ligaWer:b})],
      ['Elo-Kurve', kurveBild({pid:a, n:999, d:12345, werte:Array.from({length:12}, (_, i) => ({v:i < 11 ? -i * 900 : 4000, w:i === 11, jetzt:i === 11}))})],
      ['Rivalität', duellBild({A:a, B:b, gesamt:98765, aw:45678, spiele})],
      ['Runde', rundeBild({sid:'probe', paarungen:3,
        spieler:[{id:a, w:12, l:11, e:12345}, {id:b, w:11, l:12, e:-9999}, {id:c, w:10, l:13, e:0}, {id:e, w:9, l:14, e:-12345}],
        partien:Array.from({length:23}, (_, i) => ({t:d0 + i * 600000, A:[a, b], B:[c, e], sa:10, sb:9, aw:i % 2 === 0, anlass:['aussenseiter', 'krimi', 'riss', 'feld'][i % 4]}))})],
    ];
  }

  // ── Die Messung ───────────────────────────────────────────────────────
  // Zwei Dinge dürfen nie passieren: ein Text liegt auf einem anderen Text
  // oder auf einem Gesicht, und ein Text wird abgeschnitten, ohne dass ein
  // „…" das sagt. Gemessen wird am sichtbaren Teil: ein Name, der mit „…"
  // endet, ist so breit wie das, was von ihm zu sehen ist.
  function pruefen(wurzel){
    const fehler = [];
    const box = wurzel.getBoundingClientRect();
    const clip = el => {
      let r = null;
      for(let p = el.parentElement; p && p !== wurzel.parentElement; p = p.parentElement){
        const cs = getComputedStyle(p);
        if(cs.overflowX !== 'visible' || cs.overflowY !== 'visible'){
          const q = p.getBoundingClientRect();
          r = r ? {l:Math.max(r.l, q.left), t:Math.max(r.t, q.top), r:Math.min(r.r, q.right), b:Math.min(r.b, q.bottom)}
                : {l:q.left, t:q.top, r:q.right, b:q.bottom};
        }
      }
      return r;
    };
    const teile = [];
    const tw = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    for(let n = tw.nextNode(); n; n = tw.nextNode()){
      if(!n.textContent.trim()) continue;
      const el = n.parentElement;
      // Die Initialen im Gesicht gehören zum Gesicht.
      if(el.closest('[hidden],svg,.av,.rav')) continue;
      if(getComputedStyle(el).visibility === 'hidden' || !el.getClientRects().length) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      const c = clip(n);
      const txt = n.textContent.trim().slice(0, 24);
      // Je Zeile ein Kasten: ein umbrechender Satz ist als ein Rechteck so
      // breit wie die Karte und läge damit über jedem Wort neben ihm.
      [...rg.getClientRects()].forEach(roh => {
        if(roh.width < 1) return;
        if(c && (roh.right > c.r + 1 || roh.left < c.l - 1)){
          let el2 = el, ell = false;
          while(el2 && el2 !== wurzel){ if(getComputedStyle(el2).textOverflow === 'ellipsis'){ ell = true; break; } el2 = el2.parentElement; }
          if(!ell) fehler.push(`abgeschnitten ohne „…": „${txt}"`);
        }
        const sicht = c ? {l:Math.max(roh.left, c.l), t:Math.max(roh.top, c.t), r:Math.min(roh.right, c.r), b:Math.min(roh.bottom, c.b)}
                        : {l:roh.left, t:roh.top, r:roh.right, b:roh.bottom};
        teile.push({art:'text', txt, r:sicht, n});
      });
    }
    wurzel.querySelectorAll('.ef-tb text').forEach(t => {
      const q = t.getBoundingClientRect();
      teile.push({art:'text', txt:t.textContent.slice(0, 24), r:{l:q.left, t:q.top, r:q.right, b:q.bottom}});
    });
    wurzel.querySelectorAll('.av, .rav').forEach(a => {
      if(a.closest('.rav') && !a.classList.contains('rav')) return;
      const q = a.getBoundingClientRect(), c = clip(a);
      const r = {l:q.left, t:q.top, r:q.right, b:q.bottom};
      if(c){ r.l = Math.max(r.l, c.l); r.t = Math.max(r.t, c.t); r.r = Math.min(r.r, c.r); r.b = Math.min(r.b, c.b); }
      if(r.r > r.l && r.b > r.t) teile.push({art:'gesicht', txt:'Gesicht', r});
    });
    teile.forEach(t => {
      if(t.r.r - t.r.l < 1) return;
      if(t.r.l < box.left - 1 || t.r.r > box.right + 1) fehler.push(`ragt aus der Karte: „${t.txt}"`);
    });
    for(let i = 0; i < teile.length; i++) for(let j = i + 1; j < teile.length; j++){
      const u = teile[i], v = teile[j];
      if(u.art === 'gesicht' && v.art === 'gesicht') continue;
      if(u.n && u.n === v.n) continue;
      const w = Math.min(u.r.r, v.r.r) - Math.max(u.r.l, v.r.l), h = Math.min(u.r.b, v.r.b) - Math.max(u.r.t, v.r.t);
      if(w > 1.5 && h > 1.5) fehler.push(`liegt übereinander: „${u.txt}" und „${v.txt}"`);
    }
    return [...new Set(fehler)];
  }

  return {
    anlass, st, ANLASS_NAME, pruefen,
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
        tmp.innerHTML = rundeBild(rundeDaten(g.stories));
        g.karten[0].parentNode.insertBefore(tmp.firstElementChild, g.karten[0]);
        g.karten.forEach(k => k.remove());
      });
      return gr.map(g => ({id:'runde_' + g.stories[0].id, von:g.karten.map(k => k.dataset.sid)}));
    },
    rundenVorschau(){ return rundenFinden().map(g => g.karten.map(k => k.dataset.sid)); },
    // Die Grenzwerte in eine Spalte so breit wie eine Karte im Feed.
    probe(breite){
      const alt = Object.keys(pm).map(id => [id, pm[id].name]);
      Object.keys(pm).forEach((id, i) => { pm[id].name = LANGE_NAMEN[i % LANGE_NAMEN.length]; });
      let html;
      try { html = grenzwerte().map(([t, h]) => `<div class="ef-probe-t">${esc(t)}</div>`
        + (h.startsWith('<div class="nf-card') ? h : `<div class="nf-card nf-s-spiel ef-probe-k">${h}</div>`)).join(''); }
      finally { alt.forEach(([id, n]) => { pm[id].name = n; }); }
      let w = document.getElementById('efProbe');
      if(!w){ w = document.createElement('div'); w.id = 'efProbe'; document.body.appendChild(w); }
      w.style.width = breite + 'px';
      w.innerHTML = html;
      return [...w.querySelectorAll('.nf-card')].length;
    },
  };
})();
'entwurf geladen';
