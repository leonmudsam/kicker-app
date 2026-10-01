// ─── §11.6c — Die Karten „Am Spieltag" [§C33] ────────────────────────
// 55 der 73 Karten im Vierzehn-Tage-Fenster sind Partie-Karten, und jede
// begann mit demselben Ergebnisband — vier Wappen, der Stand, zwei Namen.
// Der Fuß wechselte schon nach dem Anlass, aber er war eine Zeile unter
// einem Kopf, der immer gleich aussah. Jetzt folgt auch der KOPF dem Anlass,
// und jeder Anlass zeigt eine Zahl, die es auf der Karte vorher nicht gab:
//
//   gewöhnliche Partie   das Spielfeld: wer wo stand, Elo je Spieler
//   Ein-Tor-Krimi        die Anzeigetafel und die Bilanz in engen Partien
//   klarer Sieg          wie oft die Liga so deutlich gespielt hat
//   Außenseitersieg      die Wippe: das Elo-Gewicht beider Teams
//   Spitzenwechsel,      die Monatstabelle vor und nach der Partie
//   Rangsprung
//   Serie                der Lauf gegen den eigenen Bestwert und die Liga
//   Serienbruch          die gerissene Kette und wer sie gerissen hat
//   Teamserie            der Lauf des Duos und seine Bilanz als Ring
//   Wende                die Elo-Kurve der letzten zwölf Partien
//   Rivalität            jede Begegnung der beiden als Balken
//   Auszeichnung         die Medaille und wer sie in der Liga trägt
//   Spieler des Tages    die Tagesbahn und die Elo über den Tag
//   dieselben Vier       eine Karte für die ganze Runde
//
// JEDES BAUTEIL HAT ZWEI HÄLFTEN: `…Daten` rechnet aus den Partien, `…Bild`
// zeichnet nur, was es bekommt. Die Liga wächst — aus 466 Partien werden
// 4 660 und 46 600, aus „Leo" wird „Maximilian-Alexander" —, und eine
// Zeichnung, die mit den Zahlen von heute passt, läuft mit denen von morgen
// über. Weil das Bild nur Daten nimmt, zeichnet `tests/blatt` jedes Bauteil
// auch mit Grenzwerten und misst, dass nichts übereinanderliegt und nichts
// abgeschnitten wird.
//
// NICHTS WIRD GEKÜRZT ODER GESCHRUMPFT. Ein „…" versteckte, wer gemeint ist,
// und ein Name, der kleiner wird, damit er in eine Spalte passt, sah neben
// seinen Nachbarn falsch aus. Ein Name steht deshalb in der Grafik nur, wo
// sie Platz für ihn hat — auf dem Spielfeld unter seinem Wappen, in der
// Tabelle an seiner Linie —, und ob er passt, entscheidet eine feste Regel
// (`_spPasst`: kein Wort länger, als die Spalte Zeichen fasst), keine
// Messung. Passt er nicht, oder ist die Grafik eng wie die Wippe, steht er
// in einer TEXTSTELLE darunter (`.sp-lg`), ein Name je Zeile, die wie ein
// Satz umbricht.
//
// JEDE RECHNUNG LÄUFT EINMAL JE DATENSTAND (`_spBasis`, eine WeakMap an
// `matches` wie `matchesOfPlayer` [§3 Caching]): die Partien in
// Spielreihenfolge, die Ergebnisverteilung als Präfixsumme, der Serienstand
// vor jeder Partie und die Runden. Jede Karte liest daraus, statt die ganze
// Liga noch einmal abzulaufen — bei 46 600 Partien und sechzig Karten wären
// das sonst 2,8 Millionen Schritte bei jedem Öffnen des Feeds.

// Eine Zahl mit Tausenderpunkt: aus 21:27 wird mit den Jahren 2.100:2.700.
// Einmal gebaut, wie `datumFmt`.
const _SP_ZAHL = new Intl.NumberFormat('de-DE');
function _spZahl(n){ return _SP_ZAHL.format(Math.abs(Math.round(Number(n) || 0))); }
function _spVz(v){
  if(v == null) return '';
  return (v > 0 ? '+' : v < 0 ? '−' : '±') + _spZahl(v);
}
function _spName(id){ const p = pmap()[id]; return (p && p.name) || '?'; }
// Ein Name im Satz einer Textstelle, fett wie im Kartentext [§C33].
function _spNb(id){ return `<b>${esc(_spName(id))}</b>`; }
function _spUnd(ids){
  return ids.length > 1
    ? ids.slice(0, -1).map(_spNb).join(', ') + ' und ' + _spNb(ids[ids.length - 1])
    : _spNb(ids[0]);
}
// Untereinander statt mit „und": jeder Name eine eigene Zeile.
function _spStapel(ids){ return ids.map(id => `<span>${_spNb(id)}</span>`).join(''); }
function _spUnter(html){ return `<div class="sp-lg">${html}</div>`; }
// Passt ein Name in eine Spalte, die n Zeichen fasst? Umbrechen darf er an
// Leerzeichen und Bindestrich, also zählt das längste Wort. Gerechnet für
// das schmalste Telefon (320 px), damit es auf jedem passt.
function _spPasst(ids, n, ganz){
  return ids.every(id => {
    const t = String(_spName(id));
    return ganz ? t.length <= n : t.split(/[\s-]+/).every(w => w.length <= n);
  });
}
function _spChip(id){ const p = pmap()[id]; return p ? avHtml(p, '', {}) : ''; }
function _spChips(ids){ return `<span class="sp-chips">${ids.map(_spChip).join('')}</span>`; }
function _spWappen(id, px){ const p = pmap()[id]; return p ? avHtml(p, '', {ins:true, px:px || 48, feuer:0}) : ''; }
function _spSeite(m, id){ return (m.a1 === id || m.a2 === id) ? 'A' : 'B'; }
function _spGew(m, id){ return _spSeite(m, id) === m.winner; }
function _spTeam(m, s){ return s === 'A' ? [m.a1, m.a2] : [m.b1, m.b2]; }
function _spSieger(m){ return _spTeam(m, m.winner); }
function _spVerlierer(m){ return _spTeam(m, m.winner === 'A' ? 'B' : 'A'); }
function _spStand(d){
  return `<em class="${d.aw ? 'w' : ''}">${d.sa}</em><i>:</i><em class="${d.aw ? '' : 'w'}">${d.sb}</em>`;
}

// ── Ein Durchlauf je Datenstand ──────────────────────────────────────
// Eine Runde: dieselben vier am Tisch, Partie auf Partie, höchstens eine
// Stunde zwischen zwei Partien und keine fremde dazwischen [§C33]. Gemessen
// an den 466 Partien der Liga liegen die Abstände innerhalb einer Runde bei
// 11 Minuten im Median und unter 17 Minuten in neun von zehn Fällen, die
// zwischen zwei Runden derselben vier bei mindestens 84 Minuten — zwischen
// 40 und 84 liegt gar keiner, die Grenze ist also keine Frage des Geschmacks.
const RUNDE_LUECKE_MS = 60 * 60 * 1000;
const _spBasisMemo = new WeakMap();
function _spBasis(){
  let b = _spBasisMemo.get(matches);
  if(b) return b;
  const chrono = (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  const idx = new Map(chrono.map((m, i) => [m.id, i]));
  // kum[d][i]: Partien mit d Toren Abstand unter den ersten i der Liga.
  const kum = Array.from({length:11}, () => new Int32Array(chrono.length + 1));
  const lauf = {}, best = {}, vor = new Map();
  let liga = 0, ligaWer = null;
  const runde = new Map();
  let r = null;
  chrono.forEach((m, i) => {
    const d = Math.min(10, Math.abs(m.score_a - m.score_b));
    for(let k = 0; k < 11; k++) kum[k][i + 1] = kum[k][i] + (k === d ? 1 : 0);
    const ids = [m.a1, m.a2, m.b1, m.b2];
    vor.set(m.id, {best:Object.fromEntries(ids.map(id => [id, best[id] || 0])), liga, ligaWer});
    ids.forEach(id => {
      lauf[id] = _spGew(m, id) ? (lauf[id] || 0) + 1 : 0;
      if(lauf[id] > (best[id] || 0)) best[id] = lauf[id];
      if(lauf[id] > liga){ liga = lauf[id]; ligaWer = id; }
    });
    // Die Runde wächst nur mit der DIREKT folgenden Partie: spielt jemand
    // anderes dazwischen, ist sie zu. Und nur am selben Kalendertag — die
    // Karte steht unter einem Tageskopf.
    const set = ids.slice().sort().join(',');
    const t = mts(m), tag = tagKey(t);
    if(r && r.set === set && r.tag === tag && t - r.t <= RUNDE_LUECKE_MS){
      r.ids.push(m.id); r.t = t;
    } else {
      r = {set, tag, t, ids:[m.id]};
    }
    runde.set(m.id, r);
  });
  b = {chrono, idx, kum, vor, runde, byId:new Map(chrono.map(m => [m.id, m]))};
  _spBasisMemo.set(matches, b);
  return b;
}
function _spMatch(id){ return _spBasis().byId.get(id); }
// Die eigenen Partien bis einschließlich `bis`.
function _spEigene(pid, bis){
  const l = matchesOfPlayer(pid, matches), i = l.indexOf(bis);
  return i < 0 ? l : l.slice(0, i + 1);
}
// Die Siegchance der Sieger aus der Elo-Bahn, wie im Blatt der Partie.
function _spChance(m){
  const h = getHistoryByMatchId().get(m.id);
  const e = h && h.expA != null ? h.expA : m.exp_a;
  return e == null ? null : (m.winner === 'A' ? e : 1 - e);
}

// ── Der Anlass, in fester Rangfolge: das erste, was zutrifft ─────────
// Was die Schlagzeile als Anlass nennt (Rivalitätsmarke, Auszeichnung),
// steht vor dem, was nur aus den Partien abgeleitet ist (Wende,
// Rangsprung): „Auszeichnung in einer Partie für …" stand sonst über dem
// Bild einer Wende, von der die Karte gar nicht erzählt. Eine seltene oder
// legendäre Auszeichnung steht vor allem außer der Tabellenspitze: die
// Schlagzeile nennt sie zuerst.
function _spAnlass(s){
  const d = s.dataRef || {};
  const m = d.matchId ? _spMatch(d.matchId) : null;
  if(!m) return {key:''};
  const fakten = _newsSpielFakten(s);
  const f = t => fakten.find(x => x.type === t);
  const c = _spChance(m);
  const diff = Math.abs(m.score_a - m.score_b);
  let x;
  if((x = f('lead_change')) && x.newLeader) return {key:'spitze', m, x};
  if((x = fakten.find(y => y.type === 'badge_unlocked' && (y.rarity === 'rare' || y.rarity === 'legendary'))) && x.badgeId)
    return {key:'medaille', m, x:{pid:x.playerId, badgeId:x.badgeId}};
  if((x = f('streak_killer')) && x.victimPid) return {key:'riss', m, x};
  if((x = f('win_streak')) && x.streak) return {key:'serie', m, x};
  if((x = f('team_streak')) && x.streak && x.a && x.b) return {key:'teamserie', m, x};
  if(c != null && c < CHANCE_UPSET) return {key:'aussenseiter', m, c};
  if((x = f('rivalry_milestone')) && x.a && x.b) return {key:'duell', m, x};
  if((x = f('badge_unlocked')) && x.badgeId) return {key:'medaille', m, x:{pid:x.playerId, badgeId:x.badgeId}};
  if((x = f('badge_marken')) && Array.isArray(x.marken) && x.marken.length) return {key:'medaille', m, x:x.marken[0]};
  const wende = _spSieger(m).map(pid => ({pid, n:_newsPleitenVor(pid, m)}))
    .filter(w => w.n >= 3).sort((a, b) => b.n - a.n)[0];
  if(wende) return {key:'wende', m, x:wende};
  const sprung = _spSieger(m).map(pid => ({pid, r:_newsRankChange(pid, m.id)}))
    .filter(w => w.r && w.r.pre - w.r.post >= 2);
  if(sprung.length) return {key:'rang', m, x:sprung};
  if(diff === 1) return {key:'krimi', m, c};
  if(diff >= 6) return {key:'deutlich', m};
  return {key:'feld', m, c};
}
const SP_ANLASS = {
  spitze:      {name:'Spitzenwechsel',  kurz:'Spitze',      ic:'crown'},
  riss:        {name:'Serienbruch',     kurz:'Bruch',       ic:'flameBreak'},
  serie:       {name:'Serie',           kurz:'Serie',       ic:'flame'},
  teamserie:   {name:'Teamserie',       kurz:'Duo-Serie',   ic:'duo'},
  aussenseiter:{name:'Außenseitersieg', kurz:'Außenseiter', ic:'underdog'},
  wende:       {name:'Wende',           kurz:'Wende',       ic:'comeback'},
  duell:       {name:'Rivalität',       kurz:'Rivalität',   ic:'crossedSwords'},
  medaille:    {name:'Auszeichnung',    kurz:'Marke',       ic:'medal'},
  rang:        {name:'Rangsprung',      kurz:'Sprung',      ic:'stepsUp'},
  krimi:       {name:'Ein-Tor-Krimi',   kurz:'Krimi',       ic:'thriller'},
  deutlich:    {name:'Klarer Sieg',     kurz:'Klar',        ic:'target'},
  feld:        {name:'Ergebnis',        kurz:'',            ic:'ball'}
};

// ── Die Ergebniszeile: das Band in einer Zeile ───────────────────────
// Wo die Grafik darunter die Aussage trägt, braucht der Kopf nur den Stand
// und die vier Gesichter als Chips. Die Namen stehen unter ihren Gesichtern,
// je Seite eine halbe Karte breit, und brechen wie ein Satz um.
function _spZeileDaten(m){
  return {A:_spTeam(m, 'A'), B:_spTeam(m, 'B'), sa:m.score_a, sb:m.score_b, aw:m.winner === 'A'};
}
function _spZeileBild(d){
  const s = (ids, w, re) => `<span class="sp-z-s${w ? ' w' : ''}${re ? ' re' : ''}">${_spChips(ids)}`
    + `<span class="sp-z-n">${_spStapel(ids)}</span></span>`;
  return `<div class="sp-zeile">${s(d.A, d.aw)}<b class="sp-z-sc num">${_spStand(d)}</b>${s(d.B, !d.aw, true)}</div>`;
}
// Das Band des klaren Siegs: dieselben Wappen wie das Ergebnisband der App,
// die Namen aber je einer in seiner Zeile — „Johannes & Jannik" in einer
// Zeile wurde gekürzt.
function _spBandBild(d){
  const s = (ids, w, re) => `<div class="sp-band-s${w ? ' w' : ''}${re ? ' re' : ''}"><span class="sp-band-avs">`
    + `${ids.map(id => _spWappen(id, 48)).join('')}</span><span class="sp-z-n">${_spStapel(ids)}</span></div>`;
  return `<div class="sp-band">${s(d.A, d.aw)}<div class="sp-band-sc num">${_spStand(d)}</div>${s(d.B, !d.aw, true)}</div>`;
}

// ── Das Spielfeld: die gewöhnliche Partie ────────────────────────────
// Die Karte zeigte nie, wer wo stand — die Rolle ist aber die halbe
// Geschichte einer Kicker-Partie. Die vier stehen auf ihren Stangen in der
// Reihenfolge des Tisches: Abwehr A, Sturm B, Sturm A, Abwehr B. Unter
// jedem die Elo der Partie; die Elo-Waage entfällt damit.
function _spFeldDaten(a){
  const m = a.m;
  const rolle = id => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_pos'];
  const def = s => _spTeam(m, s).find(id => rolle(id) === 'def') || _spTeam(m, s)[0];
  const atk = s => _spTeam(m, s).find(id => id !== def(s));
  const slot = (id, r) => ({id, r, w:_spGew(m, id), d:_newsEloDelta(id, m.id)});
  return {slots:[slot(def('A'), 'Abwehr'), slot(atk('B'), 'Sturm'), slot(atk('A'), 'Sturm'), slot(def('B'), 'Abwehr')],
    sa:m.score_a, sb:m.score_b, aw:m.winner === 'A', c:a.c};
}
// Das Feld ist ein Fluss und keine Fläche mit festen Plätzen: der Stand
// oben, darunter vier Spalten, eine je Stange, und jede wächst mit ihrem
// Namen. Stangen, Mittellinie und Kreis liegen dahinter und tragen keine
// Schrift. Passen die Namen nicht unter ihre Stange, steht die Aufstellung
// darunter in zwei Spalten, eine je Team.
function _spFeldBild(d){
  const innen = _spPasst(d.slots.map(s => s.id), 9);
  const aufst = w => d.slots.filter(s => s.w === w).sort((a, b) => (a.r === 'Abwehr') - (b.r === 'Abwehr'))
    .map(s => `<span><i>${s.r}</i>${_spNb(s.id)}</span>`).join('');
  return `<div class="sp-feld">
    <span class="sp-f-tor l"></span><span class="sp-f-tor r"></span><span class="sp-f-mitte"></span>
    ${[12.5, 37.5, 62.5, 87.5].map(x => `<i class="sp-f-stange" style="left:${x}%"></i>`).join('')}
    <div class="sp-f-sc"><b class="num">${_spStand(d)}</b>${d.c != null ? `<span>${Math.round(d.c * 100)} % Chance</span>` : ''}</div>
    <div class="sp-f-reihe">${d.slots.map((s, i) => `<div class="sp-f-sp${s.w ? ' w' : ''}" style="--i:${i}">`
      + `<span class="sp-f-rolle">${s.r}</span>${_spWappen(s.id, 48)}`
      + (innen ? `<span class="sp-f-n">${esc(_spName(s.id))}</span>` : '')
      + `<em class="${(s.d || 0) >= 0 ? 'g' : 'r'} num">${_spVz(s.d)}</em></div>`).join('')}</div>
  </div>${innen ? '' : `<div class="sp-aufst"><div class="w">${aufst(true)}</div><div class="re">${aufst(false)}</div></div>`}`;
}

// ── Die Anzeigetafel: der Ein-Tor-Krimi ──────────────────────────────
function _spTafelDaten(a){
  return {A:_spTeam(a.m, 'A'), B:_spTeam(a.m, 'B'), sa:a.m.score_a, sb:a.m.score_b, aw:a.m.winner === 'A', c:a.c};
}
function _spTafelBild(d){
  const t = (ids, sc, w) => `<div class="sp-at-t${w ? ' w' : ''}"><b class="num">${sc}</b>${_spChips(ids)}</div>`;
  const pa = d.c == null ? null : Math.round((d.aw ? d.c : 1 - d.c) * 100);
  return `<div class="sp-at"><div class="sp-at-g">${t(d.A, d.sa, d.aw)}<div class="sp-at-m"><span>EIN TOR</span>`
    + (pa != null ? `<em>${pa} : ${100 - pa}</em><i>Chance vorher</i>` : '')
    + `</div>${t(d.B, d.sb, !d.aw)}</div>`
    + `<div class="sp-at-n"><span class="${d.aw ? 'w' : ''}">${_spStapel(d.A)}</span><span class="re${d.aw ? '' : ' w'}">${_spStapel(d.B)}</span></div></div>`;
}
// Wer gewinnt die engen Partien? Je Sieger die letzten acht mit einem Tor
// Unterschied bis zu dieser, und die Bilanz aller.
function _spNervenDaten(a){
  const m = a.m;
  return {zeilen:_spSieger(m).map(pid => {
    const eng = _spEigene(pid, m).filter(x => Math.abs(x.score_a - x.score_b) === 1);
    const w = eng.filter(x => _spGew(x, pid)).length;
    return {id:pid, w, l:eng.length - w, zellen:eng.slice(-8).map(x => _spGew(x, pid) ? (x === m ? 'W' : 'w') : 'l')};
  })};
}
// Der Name steht über seinen Zellen und hat die ganze Zeile: neben den
// Zellen blieben ihm sechzig Pixel. Die Bilanz steht in einer Spalte so
// breit wie sie selbst; die Zellen nehmen, was übrig ist.
function _spNervenBild(d){
  const z = d.zeilen.map(r => `<div class="sp-nv-z">${_spChip(r.id)}<span class="sp-nv-m"><span class="sp-nv-n">${_spNb(r.id)}</span>`
    + `<span class="sp-nv-c">${r.zellen.map(c => `<i class="${c === 'l' ? 'l' : 'w'}${c === 'W' ? ' jetzt' : ''}"></i>`).join('')}</span></span>`
    + `<em class="num">${_spZahl(r.w)}:${_spZahl(r.l)}</em></div>`).join('');
  return `<div class="sp-nv"><div class="sp-k">Enge Partien bis zu dieser</div>${z}</div>`;
}

// ── Die Verteilung: der klare Sieg ───────────────────────────────────
// „Zuletzt so deutlich am …" sagte, wann; nicht, wie selten. Zehn Säulen,
// eine je Ergebnis von 10:9 bis 10:0, gezählt über die Liga bis zu dieser
// Partie — diese hell, die deutlicheren leiser dahinter. Gelesen aus der
// Präfixsumme: eine Karte kostet elf Zugriffe, nicht einen Lauf.
function _spVerteilungDaten(a){
  const m = a.m, b = _spBasis(), i = b.idx.get(m.id) + 1, diff = Math.min(10, Math.abs(m.score_a - m.score_b));
  const n = b.kum.map(k => k[i]);
  let so = 0;
  for(let k = diff; k <= 10; k++) so += n[k];
  let zuletzt = null;
  for(let j = i - 2; j >= 0; j--){
    const x = b.chrono[j];
    if(Math.abs(x.score_a - x.score_b) >= diff){ zuletzt = mts(x); break; }
  }
  return {n, diff, gesamt:i, so, zuletzt};
}
function _spVerteilungBild(d){
  const max = Math.max(1, ...d.n.slice(1));
  const saeulen = [];
  for(let k = 1; k <= 10; k++){
    saeulen.push(`<span class="sp-vt-s${k === d.diff ? ' jetzt' : k > d.diff ? ' mehr' : ''}" style="--i:${k}">`
      + `<i style="height:${(d.n[k] / max * 100).toFixed(0)}%"></i><em>${10 - k}</em></span>`);
  }
  return `<div class="sp-vt"><div class="sp-k">Alle ${_spZahl(d.gesamt)} Partien nach Gegentoren</div>
    <div class="sp-vt-g">${saeulen.join('')}</div>
    <div class="sp-vt-f"><b class="num">${_spZahl(d.so)}</b> von ${_spZahl(d.gesamt)} Partien so deutlich oder deutlicher`
    + `${d.zuletzt ? `, zuletzt am ${datumFmt(d.zuletzt, 'tm')}` : ''}</div></div>`;
}

// ── Die Wippe: der Außenseitersieg ───────────────────────────────────
// Das Gewicht ist die Elo vor dem Anstoß. Der Favorit sitzt unten, wie es
// die Rechnung erwartet hat — gewonnen hat die leichte Seite. Die Schilder
// stehen unter der Bahn in zwei Spalten und nicht an den Enden des Balkens:
// dort liefen lange Namen über die Kante und in die Zahl.
function _spWippeDaten(a){
  const m = a.m, h = getHistoryByMatchId().get(m.id) || {};
  const elo = ids => Math.round(ids.reduce((s, id) => s + ((h.eloBefore || {})[id] || 0), 0) / ids.length);
  return {fav:_spVerlierer(m), dog:_spSieger(m), eloFav:elo(_spVerlierer(m)), eloDog:elo(_spSieger(m)),
    pct:Math.max(1, Math.round(a.c * 100)), sa:m.score_a, sb:m.score_b, aw:m.winner === 'A'};
}
function _spWippeBild(d){
  const gap = Math.max(0, d.eloFav - d.eloDog);
  const th = Math.min(13, 5 + gap / 25) * Math.PI / 180;
  const px = 150, py = 86, r = 104;
  const lx = px - r * Math.cos(th), ly = py + r * Math.sin(th);
  const rx = px + r * Math.cos(th), ry = py - r * Math.sin(th);
  const P = (x, y) => `left:${(x / 300 * 100).toFixed(1)}%;top:${(y / 120 * 100).toFixed(1)}%`;
  const minus = v => (v < 0 ? '−' : '') + _spZahl(v);
  const schild = (ids, e, p, w) => `<div class="sp-wp-l${w ? ' w' : ''}"><span class="sp-wp-n">${_spStapel(ids)}</span>`
    + `<span class="sp-wp-z">Ø ${minus(e)} Elo · ${p} %</span></div>`;
  return `<div class="sp-wp">
    <div class="sp-wp-kopf"><b class="sp-wp-st num">${_spStand(d)}</b>
      <span class="sp-wp-gap"><b class="num">${_spZahl(gap)}</b><span>Elo Gefälle</span></span></div>
    <div class="sp-wp-bahn">
      <svg viewBox="0 0 300 120" aria-hidden="true">
        <path class="sp-wp-dr" d="M${px} ${py}L${px - 13} ${py + 24}H${px + 13}Z"/>
        <line class="sp-wp-bk" x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}"/>
        <circle class="sp-wp-ax" cx="${px}" cy="${py}" r="3.5"/>
      </svg>
      <div class="sp-wp-t" style="${P(lx + 8, ly - 4)}">${_spChips(d.fav)}</div>
      <div class="sp-wp-t w" style="${P(rx - 8, ry - 4)}">${_spChips(d.dog)}</div>
    </div>
    <div class="sp-wp-ls">${schild(d.fav, d.eloFav, 100 - d.pct, false)}${schild(d.dog, d.eloDog, d.pct, true)}</div>
  </div>`;
}

// ── Die Tabelle vorher und nachher: Spitzenwechsel und Rangsprung ────
// Eine Linie je Spieler von seinem Platz vor der Partie zu dem danach. Wer
// durch diese Partie steigt, ist grün, wer dadurch fällt, rot — die Richtung
// [§C25]; die übrigen bleiben Metall. Die neue Spitze trägt Gold. Höchstens
// neun Zeilen: in einer Liga mit vierzig Spielern ginge sonst die Bewegung
// zwischen Platz 31 und 33 in einer Wand aus Linien unter.
function _spTabelleDaten(a, spitze){
  const m = a.m, snap = getRankSnapshots()[m.id];
  if(!snap || !snap.preRank || !snap.postRank) return null;
  const fokus = new Set(spitze ? [a.x.newLeader, a.x.prevLeader].filter(Boolean) : a.x.map(w => w.pid));
  const dabei = new Set([m.a1, m.a2, m.b1, m.b2]);
  const fr = [...fokus].flatMap(id => [snap.preRank[id], snap.postRank[id]]).filter(Boolean);
  if(!fr.length) return null;
  const unten = Math.max(...fr), von = Math.max(1, Math.min(Math.min(...fr), unten - 8)), bis = von + 8;
  const zeilen = Object.keys(snap.postRank)
    .filter(id => snap.preRank[id] >= von && snap.preRank[id] <= bis && snap.postRank[id] >= von && snap.postRank[id] <= bis)
    .map(id => {
      const p = snap.preRank[id], q = snap.postRank[id];
      return {id, p, q, k:(fokus.has(id) || dabei.has(id)) && p !== q ? (q < p ? 'g' : 'r') : 'm'};
    });
  return {zeilen, von, bis, spitze};
}
// Eine SVG-Zeichnung kennt keinen Umbruch, also steht in ihr kein Name: an
// den Enden jeder Linie das Gesicht und der Platz, links der Name, wenn alle
// in die Spalte passen, und darunter in einem Satz, wer sich bewegt hat.
// Die Gesichter liegen als HTML über der Zeichnung, damit sie dieselben
// Chips sind wie überall [§C27].
function _spTabelleBild(d){
  if(!d || !d.zeilen.length) return '';
  const H = (d.bis - d.von + 1) * 22;
  const y = r => (r - d.von) * 22 + 11;
  const reihen = d.zeilen.slice().sort((u, v) => (u.k !== 'm') - (v.k !== 'm'));
  const linien = reihen.map(l => `<path class="sp-tb-l ${l.k}" d="M98 ${y(l.p)}C150 ${y(l.p)} 150 ${y(l.q)} 202 ${y(l.q)}"/>`).join('');
  const mitNamen = _spPasst(d.zeilen.map(l => l.id), 10, true);
  const ende = (l, links) => `<span class="sp-tb-e ${l.k}${links ? '' : ' re'}${d.spitze && !links && l.q === 1 ? ' gold' : ''}" `
    + `style="top:${(y(links ? l.p : l.q) / H * 100).toFixed(2)}%">`
    + (links ? `${mitNamen ? `<i>${esc(_spName(l.id))}</i>` : _spChip(l.id)}<b class="num">${_spZahl(l.p)}</b>`
             : `<b class="num">${_spZahl(l.q)}</b>${_spChip(l.id)}`)
    + `</span>`;
  const bewegt = d.zeilen.filter(l => l.k !== 'm').sort((u, v) => u.q - v.q);
  const satz = bewegt.map(l => `${_spNb(l.id)} ${l.k === 'g' ? 'steigt' : 'fällt'} von ${_spZahl(l.p)} auf ${_spZahl(l.q)}`
    + (d.spitze && l.q === 1 ? ' und führt' : '')).join(', ');
  return `<div class="sp-tb"><div class="sp-tb-k"><span>vorher</span><span class="sp-k">Monatstabelle${d.von > 1 ? ` ab Platz ${_spZahl(d.von)}` : ''}</span><span>danach</span></div>
    <div class="sp-tb-f" style="height:${H}px"><svg viewBox="0 0 300 ${H}" preserveAspectRatio="none" aria-hidden="true">${linien}</svg>
    ${reihen.map(l => ende(l, true) + ende(l, false)).join('')}</div>
    ${satz ? _spUnter(satz + '.') : ''}</div>`;
}

// ── Der Lauf gegen den eigenen Bestwert und die Liga: die Serie ──────
// „3 Siege nacheinander · Marke 5" sagte, wie weit es zur nächsten runden
// Zahl ist. Ob drei für diesen Spieler viel sind, sagte es nicht. Bis
// sechzehn steht eine Zelle je Sieg, darüber ein Balken auf derselben Skala.
// Die Marken stehen als Striche auf der Bahn und ihre Namen in einer Zeile
// darunter: an der Bahn selbst lagen zwei nahe Marken übereinander.
function _spSerieDaten(a){
  const v = _spBasis().vor.get(a.m.id), pid = a.x.pid;
  return {pid, laenge:a.x.streak, eig:v.best[pid] || 0, liga:v.liga, ligaWer:v.ligaWer};
}
function _spSerieBild(d){
  const max = Math.max(d.laenge, d.eig, d.liga, 1);
  const zellen = max <= 16;
  const pos = k => (k / max * 100).toFixed(2);
  const bahn = zellen
    ? Array.from({length:max}, (_, i) => `<i class="${i < d.laenge ? 'w' : ''}" style="--i:${i}"></i>`).join('')
    : `<i class="sp-sl-voll" style="width:${pos(d.laenge)}%"></i>`;
  const strich = (k, cls) => k ? `<u class="${cls}" style="left:${pos(k)}%"></u>` : '';
  const selbst = d.ligaWer === d.pid && d.liga === d.eig;
  const legende = (d.eig ? `<span class="eig">eigener Bestwert ${_spZahl(d.eig)}${selbst ? ', zugleich Liga-Rekord' : ''}</span>` : '')
    + (!selbst && d.liga ? `<span class="liga">Liga-Rekord ${_spZahl(d.liga)}${d.ligaWer ? ` von ${_spNb(d.ligaWer)}` : ''}</span>` : '');
  return `<div class="sp-sl"><div class="sp-sl-k">${_spChip(d.pid)}<em class="num">${_spZahl(d.laenge)} in Folge</em><span class="sp-sl-n">${_spNb(d.pid)}</span></div>
    <div class="sp-sl-r${zellen ? '' : ' balken'}">${bahn}${strich(d.eig, 'eig')}${selbst ? '' : strich(d.liga, 'liga')}</div>
    <div class="sp-sl-ms">${legende}</div></div>`;
}

// ── Die gerissene Kette: der Serienbruch ─────────────────────────────
// Die Serie war die Leistung des anderen, also steht sie als Kette aus
// Siegen da und an ihrem Ende der Riss in Rot [§C25]; hinter dem Riss die,
// die ihn gesetzt haben. Bis zwanzig Glieder einzeln, darüber geschlossen.
function _spRissDaten(a){ return {opfer:a.x.victimPid, laenge:a.x.streak, brecher:_spSieger(a.m)}; }
function _spRissBild(d){
  const n = Math.max(1, d.laenge), einzeln = n <= 20;
  const breite = 228, w = einzeln ? breite / n : breite;
  const glieder = einzeln
    ? Array.from({length:n}, (_, i) => `<rect class="sp-rk-g${i % 2 ? ' q' : ''}" x="${(i * w + 1.5).toFixed(1)}" y="${i % 2 ? 19 : 13}" `
        + `width="${Math.max(2, w + 3).toFixed(1)}" height="${i % 2 ? 8 : 20}" rx="${i % 2 ? 4 : 7}" style="--i:${i}"/>`).join('')
    : `<rect class="sp-rk-g" x="1.5" y="13" width="${breite}" height="20" rx="10"/>`;
  return `<div class="sp-rk"><svg viewBox="0 0 300 46" aria-hidden="true">${glieder}`
    + `<path class="sp-rk-x" d="M${breite + 12} 9l7 9-6 3 8 14M${breite + 22} 8l-3 10 6 2-4 15"/></svg>`
    + `<div class="sp-rk-u"><span class="sp-rk-o">${_spChip(d.opfer)}<em class="num">${_spZahl(n)} Siege</em></span>`
    + `<span class="sp-rk-b">${_spChips(d.brecher)}</span></div>`
    + _spUnter(`${_spZahl(n)} Siege in Folge von ${_spNb(d.opfer)}, beendet von ${_spUnd(d.brecher)}.`) + `</div>`;
}

// ── Das Duo: der Lauf zu zweit und die gemeinsame Bilanz als Ring ─────
// Im Ring steht die Siegquote — drei Zeichen, egal wie viele Partien es
// werden; die Bilanz selbst steht in der Textstelle darunter.
function _spDuoDaten(a){
  const m = a.m, A = a.x.a, B = a.x.b;
  const zusammen = _spEigene(A, m).filter(x => [x.a1, x.a2, x.b1, x.b2].includes(B) && _spSeite(x, A) === _spSeite(x, B));
  const w = zusammen.filter(x => _spGew(x, A)).length;
  return {A, B, laenge:a.x.streak, w, l:zusammen.length - w};
}
function _spDuoBild(d){
  const anteil = d.w / Math.max(1, d.w + d.l), U = 2 * Math.PI * 22;
  const lauf = d.laenge <= 16
    ? Array.from({length:d.laenge}, (_, i) => `<i style="--i:${i}"></i>`).join('')
    : `<i class="voll"></i>`;
  return `<div class="sp-duo"><svg viewBox="0 0 56 56" aria-hidden="true">
      <circle class="sp-duo-b" cx="28" cy="28" r="22"/>
      <circle class="sp-duo-w" cx="28" cy="28" r="22" stroke-dasharray="${(anteil * U).toFixed(1)} ${U.toFixed(1)}" transform="rotate(-90 28 28)"/>
      <text x="28" y="32" text-anchor="middle">${Math.round(anteil * 100)} %</text></svg>
    <div class="sp-duo-r"><div class="sp-duo-k">${_spChips([d.A, d.B])}<em class="num">${_spZahl(d.laenge)} in Folge</em></div>
      <div class="sp-duo-l${d.laenge > 16 ? ' balken' : ''}">${lauf}</div></div></div>`
    + _spUnter(`${_spUnd([d.A, d.B])} zusammen: ${_spZahl(d.w)} ${d.w === 1 ? 'Sieg' : 'Siege'}, ${_spZahl(d.l)} ${d.l === 1 ? 'Niederlage' : 'Niederlagen'}.`);
}

// ── Die Elo-Kurve: die Wende ─────────────────────────────────────────
// Die letzten zwölf Partien des Siegers als Linie, aufsummiert aus der Elo
// jeder Partie; die Pleiten davor als rote Punkte, dieser Sieg grün.
function _spKurveDaten(a){
  const m = a.m, pid = a.x.pid;
  let s = 0;
  const werte = _spEigene(pid, m).slice(-12).map(x => ({v:(s += (_newsEloDelta(pid, x.id) || 0)), w:_spGew(x, pid), jetzt:x === m}));
  return {pid, werte, n:a.x.n, d:_newsEloDelta(pid, m.id)};
}
function _spKurveBild(d){
  const pkt = [{v:0}].concat(d.werte);
  const lo = Math.min(...pkt.map(p => p.v)), hi = Math.max(...pkt.map(p => p.v));
  const X = i => 12 + i * (276 / Math.max(1, pkt.length - 1)), Y = v => 10 + (hi - v) / Math.max(1, hi - lo) * 54;
  const pfad = pkt.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
  const punkte = pkt.slice(1).map((p, i) => `<circle class="${p.w ? 'w' : 'l'}${p.jetzt ? ' jetzt' : ''}" cx="${X(i + 1).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="${p.jetzt ? 5 : 2.8}"/>`).join('');
  return `<div class="sp-ku"><div class="sp-ku-k">${_spChip(d.pid)}`
    + `<span class="sp-ku-s">${_spZahl(d.n)} Pleiten, dann <em class="g num">${_spVz(d.d)}</em></span></div>
    <svg viewBox="0 0 300 74" aria-hidden="true"><line class="sp-ku-0" x1="6" x2="294" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>
    <path class="sp-ku-l" pathLength="1" d="${pfad}"/>${punkte}</svg>
    ${_spUnter(`Elo von ${_spNb(d.pid)} über die letzten ${_spZahl(d.werte.length)} Partien.`)}</div>`;
}

// ── Jede Begegnung: die Rivalität ────────────────────────────────────
// Gezeigt werden die letzten dreißig; die Bilanz darüber zählt alle, bis zu
// dieser Partie — die Marke steht an ihrer Partie [§C33].
function _spDuellDaten(a){
  const m = a.m, A = a.x.a, B = a.x.b;
  const alle = _spEigene(A, m).filter(x => [x.a1, x.a2, x.b1, x.b2].includes(B) && _spSeite(x, A) !== _spSeite(x, B));
  return {A, B, gesamt:alle.length, aw:alle.filter(x => _spGew(x, A)).length,
    spiele:alle.slice(-30).map(x => ({a:_spGew(x, A), diff:Math.abs(x.score_a - x.score_b), jetzt:x === m}))};
}
function _spDuellBild(d){
  const gapx = 300 / Math.max(d.spiele.length, 12);
  const balken = d.spiele.map((x, i) => {
    const h = 6 + x.diff * 2.6;
    return `<rect class="${x.a ? 'a' : 'b'}${x.jetzt ? ' jetzt' : ''}" x="${(i * gapx + 1).toFixed(1)}" y="${x.a ? 34 - h : 36}" width="${Math.max(1, gapx - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" style="--i:${i}"/>`;
  }).join('');
  const mehr = d.gesamt > d.spiele.length ? `, davon die letzten ${_spZahl(d.spiele.length)}` : '';
  return `<div class="sp-bg"><div class="sp-bg-k"><span>${_spChip(d.A)}<em class="num">${_spZahl(d.aw)}</em></span>`
    + `<span class="sp-k">Siege</span><span class="re"><em class="num">${_spZahl(d.gesamt - d.aw)}</em>${_spChip(d.B)}</span></div>
    <svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true"><line class="sp-bg-0" x1="0" x2="300" y1="35" y2="35"/>${balken}</svg>
    ${_spUnter(`${_spNb(d.A)} oben, ${_spNb(d.B)} unten: ${_spZahl(d.gesamt)} ${d.gesamt === 1 ? 'Begegnung' : 'Begegnungen'}${mehr}.`)}</div>`;
}

// ── Die Medaille: die Auszeichnung und wer sie in der Liga trägt ─────
// „Selten" ist ein Wort; wie selten, zeigt die Liga: jeder Spieler ein
// Platz, wer sie trägt, mit Gesicht, wer sie in dieser Partie geholt hat,
// gerahmt. Violett ist die Familie der Auszeichnungen, Gold nur die
// legendäre [§C25]. Ab sechzehn Spielern werden die Plätze zu Punkten —
// vierzig Gesichter in einer Zeile wären eine Wand.
function _spMedailleDaten(a){
  const b = (typeof BADGES !== 'undefined' ? BADGES : []).find(x => x.id === a.x.badgeId);
  if(!b) return null;
  const ids = activePlayers().map(p => p.id);
  const traeger = ids.filter(id => (getCachedBadges(id) || []).some(x => x.id === b.id));
  return {name:b.name, ic:b.ic, klasse:rarityOf(b.id), wer:a.x.pid, rang:a.x.rang || 0, ids, traeger};
}
function _spMedailleBild(d){
  if(!d) return '';
  const tr = new Set(d.traeger), viele = d.ids.length > 16;
  const ton = d.klasse === 'legendary' ? 'gold' : 'viol';
  const kl = {legendary:'Legendär', rare:'Selten', common:'Gewöhnlich'}[d.klasse] || '';
  const plaetze = d.ids.slice().sort((a, b) => (tr.has(b) - tr.has(a)) || ((b === d.wer) - (a === d.wer))).map(id =>
    viele ? `<i class="${tr.has(id) ? 'hat' : ''}${id === d.wer ? ' neu' : ''}"></i>`
          : `<span class="${tr.has(id) ? 'hat' : ''}${id === d.wer ? ' neu' : ''}">${tr.has(id) ? _spChip(id) : ''}</span>`).join('');
  const wer = d.wer && pmap()[d.wer]
    ? (d.rang > 1 ? `, ${_spNb(d.wer)} zum ${_spZahl(d.rang)}. Mal` : `, neu dabei ${_spNb(d.wer)}`) : '';
  return `<div class="sp-md">${zkHtml(d.ic, 'g', ton)}<div class="sp-md-r">
      <div class="sp-md-k"><b>${esc(d.name)}</b><em class="${ton}">${kl}</em></div>
      <div class="sp-md-p${viele ? ' punkte' : ''}">${plaetze}</div>
      ${_spUnter(`${_spZahl(d.traeger.length)} von ${_spZahl(d.ids.length)} tragen sie${wer}.`)}</div></div>`;
}

// ── Der Spieler des Tages: die Tagesbahn und die Elo über den Tag ────
// Die Karte nannte Siegquote, Bilanz und Platz als drei Zahlen — dass der
// Tag mit zwei Pleiten anfing und mit fünf Siegen endete, stand nirgends.
// Die Bahn ist dasselbe Bild wie im Blatt (_ndTagesbahn) [§C27]; die Linie
// darüber zeigt, wie die Elo des Tages zustande kam. Ab vierundzwanzig
// Partien werden die Felder schmaler, nicht weniger.
function _spTagDaten(s){
  const d = s.dataRef || {}, pid = d.playerId;
  if(!pid) return null;
  const tag = tagKey(s.when);
  const ms = matchesOfPlayer(pid, matches).filter(x => tagKey(mts(x)) === tag);
  let e = 0;
  return {pid, partien:ms.map(x => ({w:_spGew(x, pid), e:(e += (_newsEloDelta(pid, x.id) || 0))})), elo:e};
}
function _spTagBild(d){
  if(!d || !d.partien.length) return '';
  const pkt = [{e:0}].concat(d.partien), n = pkt.length;
  const lo = Math.min(...pkt.map(p => p.e)), hi = Math.max(...pkt.map(p => p.e));
  const X = i => 8 + i * (284 / Math.max(1, n - 1)), Y = v => 6 + (hi - v) / Math.max(1, hi - lo) * 34;
  const w = d.partien.filter(p => p.w).length, l = d.partien.length - w;
  return `<div class="sp-tg"><svg viewBox="0 0 300 46" aria-hidden="true">
      <path class="sp-tg-f" d="M${X(0)} 46${pkt.map((p, i) => `L${X(i).toFixed(1)} ${Y(p.e).toFixed(1)}`).join('')}L${X(n - 1).toFixed(1)} 46Z"/>
      <path class="sp-tg-l" pathLength="1" d="${pkt.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.e).toFixed(1)}`).join('')}"/></svg>
    <div class="sp-tg-b${d.partien.length > 24 ? ' eng' : ''}">${d.partien.map((p, i) => `<i class="${p.w ? 'w' : 'l'}" style="--i:${i}"></i>`).join('')}</div>
    <div class="sp-tg-z"><span><b class="num">${_spZahl(w)}</b> ${w === 1 ? 'Sieg' : 'Siege'}, <b class="num">${_spZahl(l)}</b> ${l === 1 ? 'Niederlage' : 'Niederlagen'}</span>`
    + `<span><b class="num ${d.elo >= 0 ? 'g' : 'r'}">${_spVz(d.elo)}</b> Elo</span></div></div>`;
}

// ── Kopf und Fuß je Anlass ───────────────────────────────────────────
// Spielfeld und Wippe zeigen Siegchance UND Elo je Spieler im Kopf, die
// Anzeigetafel die Siegchance; der Satz streicht dann, was dort steht
// (`_newsSpielSatz`). Die Wippe zeigt die Elo VOR dem Anstoß und nicht den
// Gewinn, also bleibt der Gewinn im Satz.
const _spZeile = a => _spZeileBild(_spZeileDaten(a.m));
const SP_KOPF = {
  feld:a => _spFeldBild(_spFeldDaten(a)), krimi:a => _spTafelBild(_spTafelDaten(a)),
  aussenseiter:a => _spWippeBild(_spWippeDaten(a)), deutlich:a => _spBandBild(_spZeileDaten(a.m)),
  spitze:_spZeile, rang:_spZeile, serie:_spZeile, wende:_spZeile, duell:_spZeile,
  riss:_spZeile, teamserie:_spZeile, medaille:_spZeile
};
const SP_FUSS = {
  krimi:a => _spNervenBild(_spNervenDaten(a)), deutlich:a => _spVerteilungBild(_spVerteilungDaten(a)),
  spitze:a => _spTabelleBild(_spTabelleDaten(a, true)), rang:a => _spTabelleBild(_spTabelleDaten(a, false)),
  serie:a => _spSerieBild(_spSerieDaten(a)), wende:a => _spKurveBild(_spKurveDaten(a)),
  duell:a => _spDuellBild(_spDuellDaten(a)), riss:a => _spRissBild(_spRissDaten(a)),
  teamserie:a => _spDuoBild(_spDuoDaten(a)), medaille:a => _spMedailleBild(_spMedailleDaten(a))
};
const SP_ZEIGT = {feld:{chance:true, elo:true}, krimi:{chance:true}, aussenseiter:{chance:true}};
// Gemerkt je Datenstand und Karte: der Feed zeichnet sich bei jedem Filter,
// jedem Zurück aus einem Blatt und jeder neuen Story neu, und die Bilder
// hängen nur an den Partien und den Namen. `matches` und `players` werden
// immer ersetzt, nie an Ort und Stelle verändert [§3 Caching].
const _spBildMemo = new WeakMap();
function _spBild(s){
  let proStand = _spBildMemo.get(matches);
  if(!proStand){ proStand = new WeakMap(); _spBildMemo.set(matches, proStand); }
  const alt = proStand.get(s);
  if(alt && alt.pl === players) return alt;
  let r = {kopf:'', fuss:'', zeigt:{}, key:'', pl:players};
  try {
    const a = _spAnlass(s);
    if(a.key){
      r = {key:a.key, kopf:SP_KOPF[a.key](a) || _newsErgebnisBand(a.m.id),
           fuss:(SP_FUSS[a.key] ? SP_FUSS[a.key](a) : '') || '', zeigt:SP_ZEIGT[a.key] || {}, pl:players};
      if(a.key === 'feld' || a.key === 'krimi' || a.key === 'aussenseiter'){
        if(a.c == null) r.zeigt = Object.assign({}, r.zeigt, {chance:false});
      }
    }
  } catch(e){
    r = {kopf:'', fuss:'', zeigt:{}, key:'', pl:players};
  }
  proStand.set(s, r);
  return r;
}

// ── Die Runde der Vier [§C33] ────────────────────────────────────────
// 182 der 466 Partien liegen in Runden: dieselben vier, Partie auf Partie,
// meist mit wechselnden Paarungen (48 von 57 Runden). Im Feed standen sie
// als zwei bis sechs Karten untereinander, mit denselben vier Wappen in
// jedem Band. Eine Runde ist ein Tag am Tisch und eine Karte.
//
// WAS EINMAL DASTEHT, BLEIBT STEHEN. Die Runde ist eine Ableitung bei der
// Anzeige wie die Sammelkarte; im Bestand behält jede Partie ihre Karte.
// Und sie ist die Karte der ERSTEN Partie: dieselbe ID, derselbe Platz,
// derselbe Zeitpunkt. Nach Partie 1 steht die Partie-Karte da, mit Partie 2
// wird genau diese Karte zur Runde, jede weitere kommt als Zeile dazu. Eine
// zweite Partie-Karte steht dadurch nie allein im Feed, also kann auch keine
// verschwinden — dieselbe Regel wie beim Tafel-Moment, der beim Dazukommen
// einer Zeile dieselbe Karte bleibt. Erst ab der dritten Partie
// zusammenzulegen hieße: nach der zweiten stehen zwei Karten da, und mit der
// dritten verschwindet eine davon.
//
// Breaking bleibt eine eigene Karte: es darf an nichts scheitern, auch
// nicht an einer Runde. Die Partie steht in der Runde dann als Zeile mit
// Marke, und Antippen öffnet die Breaking-Karte. Gebildet wird die Runde aus
// den PARTIEN (`_spBasis().runde`), nicht aus den Karten, die im Feed
// zufällig nebeneinanderstehen: eine Tafel-Karte dazwischen zerlegte sie
// sonst in zwei, und dieselbe Runde sähe je nach Feed anders aus.
const RUNDE_ZEILEN = 8;
function _newsIstPartieKarte(s){
  const d = (s && s.dataRef) || {};
  if(!d.matchId) return false;
  return d.type === 'spiel' || (d.type === 'sammel' && d.quelle === 'spiel');
}
function _newsRunden(list){
  if(!Array.isArray(list) || list.length < 2) return list;
  const b = _spBasis();
  const proRunde = new Map();
  list.forEach(s => {
    if(!_newsIstPartieKarte(s)) return;
    const r = b.runde.get(s.dataRef.matchId);
    if(!r || r.ids.length < 2) return;
    let g = proRunde.get(r);
    if(!g){ g = {r, karten:[], brk:[]}; proRunde.set(r, g); }
    (_isBreaking(s) ? g.brk : g.karten).push(s);
  });
  if(!proRunde.size) return list;
  const ersetzt = new Map(), weg = new Set();
  proRunde.forEach(g => {
    if(g.karten.length < 2) return;
    const glieder = g.karten.slice().sort((x, y) => mts(_spMatch(x.dataRef.matchId)) - mts(_spMatch(y.dataRef.matchId)));
    const erste = glieder[0];
    const runde = _newsRundeKarte(erste, glieder, g.brk, g.r);
    if(!runde) return;
    ersetzt.set(erste.id, runde);
    glieder.slice(1).forEach(x => weg.add(x.id));
  });
  if(!ersetzt.size) return list;
  return list.filter(s => !weg.has(s.id)).map(s => ersetzt.get(s.id) || s);
}
// Die Karte der Runde trägt die ID und den Zeitpunkt ihrer ersten Partie.
// `glieder` sind die Karten, die sie aufnimmt — mit ihnen öffnet das Blatt
// jede Partie einzeln, und an ihnen hängt der Lesestand: die Runde ist neu,
// solange eine ihrer Partien neu ist (`_newsGelesen`). Sonst schluckte der
// Lesestand, der am Zeitpunkt der ersten Partie hängt, jede weitere.
function _newsRundeKarte(erste, glieder, brk, r){
  const ms = r.ids.map(_spMatch).filter(Boolean);
  if(ms.length < 2) return null;
  const ids = [ms[0].a1, ms[0].a2, ms[0].b1, ms[0].b2];
  const z = {};
  ids.forEach(id => { z[id] = {id, w:0, l:0, e:0}; });
  ms.forEach(m => ids.forEach(id => { _spGew(m, id) ? z[id].w++ : z[id].l++; z[id].e += _newsEloDelta(id, m.id) || 0; }));
  const spieler = ids.map(id => z[id]).sort((a, b) => b.w - a.w || b.e - a.e);
  const top = spieler[0];
  const vorn = spieler.filter(x => x.w === top.w).map(x => x.id);
  const n = ms.length;
  // Die Schlagzeile nennt, wer die Runde gewonnen hat. Spielen immer
  // dieselben zwei Teams, ist es ein Duell und kein Turnier: dann gewinnt
  // ein Team oder beide trennen sich. Wechseln die Paarungen und steht
  // niemand allein vorn, teilen sie sich die Runde — alle vier hieße, jeder
  // hat gleich oft gewonnen.
  const paarungen = new Set(ms.map(m => [[m.a1, m.a2].sort().join('+'), [m.b1, m.b2].sort().join('+')].sort().join('|'))).size;
  const ein = ms[0], teamA = [ein.a1, ein.a2], teamB = [ein.b1, ein.b2];
  const seiteGew = t => ms.filter(m => _spGew(m, t[0])).length;
  const zwei = t => _namenListe(t.map(_spName));
  let title;
  if(paarungen === 1){
    const wa = seiteGew(teamA), wb = n - wa;
    title = wa === wb
      ? `${zwei(teamA)} trennen sich von ${zwei(teamB)} ${wa}:${wb}`
      : `${zwei(wa > wb ? teamA : teamB)} gewinnen die Runde gegen ${zwei(wa > wb ? teamB : teamA)} ${Math.max(wa, wb)}:${Math.min(wa, wb)}`;
  } else if(vorn.length === 1){
    title = `${_spName(top.id)} gewinnt die Runde mit ${top.w} von ${n} Partien`;
  } else if(vorn.length === 4){
    title = `${_namenListe(vorn.map(_spName))} gewinnen je ${top.w === 1 ? 'eine Partie' : top.w + ' Partien'}`;
  } else {
    title = `${_namenListe(vorn.map(_spName))} teilen sich die Runde`;
  }
  // Die Uhrzeiten stehen im Satz: an ihnen lässt sich die Runde nachlesen,
  // und zwei Runden mit gleich vielen Partien trugen sonst denselben Satz.
  const desc = `${n} Partien zwischen ${datumFmt(mts(ms[0]), 'uhr')} und ${datumFmt(mts(ms[n - 1]), 'uhr')} Uhr`
    + (paarungen === 3 ? ', jede Paarung mindestens einmal.' : paarungen > 1 ? `, ${paarungen} verschiedene Paarungen.` : ', immer dieselben Teams.');
  // Die Karte jeder Partie, auch einer Breaking-Partie: daran öffnet das
  // Blatt sie. Die Teile tragen die Meldungen ihrer Partie-Karten, damit
  // der Faden eine Meldung in der Runde wiederfindet [§C33].
  const karteVon = {};
  glieder.concat(brk).forEach(k => { karteVon[k.dataRef.matchId] = k.id; });
  const brkIds = new Set(brk.map(k => k.dataRef.matchId));
  const teile = [];
  glieder.forEach(k => {
    const d = k.dataRef || {};
    if(d.type === 'sammel' && Array.isArray(d.teile)) d.teile.forEach(t => teile.push(t));
    else teile.push({id:k.id, typ:d.type});
  });
  const letzte = glieder[glieder.length - 1];
  return {
    id:erste.id, when:erste.when, cat:erste.cat, ic:'users',
    prio:Math.max(...glieder.map(k => k.prio || 0)),
    title, desc,
    dataRef:{
      type:'runde', playerIds:ids, teile, glieder,
      partien:ms.map(m => ({id:m.id, karte:karteVon[m.id] || null, brk:brkIds.has(m.id)})),
      spieler, paarungen, bis:letzte.when
    }
  };
}
// Der Anlass einer Partie in der Runde: aus ihrer Karte, falls sie eine hat.
function _spRundeAnlass(d, mid){
  const k = (d.glieder || []).find(x => x.dataRef.matchId === mid);
  if(!k) return '';
  try { return _spAnlass(k).key; } catch(e){ return ''; }
}
// Die Tafel der Runde ist eine Tabelle: eine Zeile je Spieler, der Name in
// der breiten Spalte. In vier Spalten nebeneinander hatte jeder Name ein
// Viertel der Karte.
function _spRundeTafel(sp){
  const allein = sp[0].w > sp[1].w;
  const maxE = Math.max(8, ...sp.map(x => Math.abs(x.e)));
  return `<div class="sp-rd-tafel">${sp.map((x, i) => `<div class="sp-rd-sp${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">${_spChip(x.id)}`
    + `<span class="sp-rd-m"><span class="sp-rd-n">${_spNb(x.id)}</span>`
    + `<i class="sp-rd-e ${x.e >= 0 ? 'g' : 'r'}"><u style="width:${(Math.abs(x.e) / maxE * 100).toFixed(0)}%"></u></i></span>`
    + `<span class="sp-rd-wl num">${_spZahl(x.w)}:${_spZahl(x.l)}</span>`
    + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${_spVz(x.e)}</em></div>`).join('')}</div>`;
}
// Eine Partie der Runde in einer Zeile: Uhrzeit, Paarung, Stand und ihr
// Anlass. Die Uhrzeit steht in jeder Zeile — an ihr lässt sich die Runde
// nachvollziehen, Partie für Partie.
function _spRundeZeile(d, p, i, mitGlied){
  const m = _spMatch(p.id);
  if(!m) return '';
  const aw = m.winner === 'A';
  const t = (ids, w) => `<span class="sp-rd-t${w ? ' w' : ''}">${_spChips(ids)}</span>`;
  const an = p.brk ? 'brk' : _spRundeAnlass(d, p.id);
  const a = an === 'brk' ? {kurz:'Breaking', ic:'bolt'} : SP_ANLASS[an];
  const ziel = mitGlied && p.karte ? ` data-glied="${esc(p.karte)}"` : '';
  return `<div class="sp-rd-p${p.brk ? ' brk' : ''}" style="--i:${i}"${ziel}><span class="sp-rd-u num">${datumFmt(mts(m), 'uhr')}</span>${t(_spTeam(m, 'A'), aw)}`
    + `<b class="num">${_spStand({sa:m.score_a, sb:m.score_b, aw})}</b>${t(_spTeam(m, 'B'), !aw)}`
    + (a && a.kurz ? `<span class="sp-rd-a">${svgI(a.ic)}<span>${esc(a.kurz)}</span></span>` : '<span></span>')
    + `</div>`;
}
// Die Karte: oben die Tabelle der Runde, darunter die Schlagzeile und jede
// Partie in einer Zeile. Höchstens acht Partien stehen als Zeile, der Rest
// als Zahl darunter — keine wird versteckt: das Blatt zeigt alle.
function _newsRundeHtml(s, isRead, gross, fadenHtml){
  const d = s.dataRef || {};
  const ps = d.partien || [];
  const zeig = ps.slice(0, RUNDE_ZEILEN);
  // Die Karte des Tages darf die Runde tragen: sie nimmt die Karten ihrer
  // Partien auf, und mit ihnen das Band, das eine davon trug.
  return `<div class="nf-card nf-s-spiel nf-runde nfc-${esc(s.cat || 'fun')}${gross ? ' nf-gross' : ''}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('spiel', s)}
    ${gross ? '<div class="nf-gross-band">' + svgI('star') + 'DIE KARTE DES TAGES</div>' : ''}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('users')}</i><b>DIE RUNDE</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    ${_spRundeTafel(d.spieler || [])}
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div><div class="nf-d">${_newsBetont(s.desc || '')}</div></div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    <div class="sp-rd-ps">${zeig.map((p, i) => _spRundeZeile(d, p, i, false)).join('')}`
    + (ps.length > zeig.length ? `<div class="sp-rd-mehr">und ${_spZahl(ps.length - zeig.length)} weitere Partien im Blatt</div>` : '')
    + `</div>${fadenHtml || ''}</div>`;
}
// Das Blatt der Runde: die Tabelle, wer mit wem an welcher Stange stand, und
// jede Partie mit ihrer Uhrzeit. Antippen öffnet die Karte der Partie.
// Die Aufstellung ist eine Matrix — eine Spalte je Partie, eine Zeile je
// Spieler —, in Blöcken zu acht: dreiundzwanzig Spalten wären auf einem
// Telefon Striche.
function _newsRundeBlatt(s){
  const d = s.dataRef || {};
  const ps = (d.partien || []).map(p => _spMatch(p.id)).filter(Boolean);
  const ids = (d.spieler || []).map(x => x.id);
  if(!ps.length || !ids.length) return '';
  const rolle = (m, id) => m[(m.a1 === id ? 'a1' : m.a2 === id ? 'a2' : m.b1 === id ? 'b1' : 'b2') + '_pos'];
  const bloecke = [];
  for(let i = 0; i < ps.length; i += 8) bloecke.push(ps.slice(i, i + 8));
  const matrix = bloecke.map(bl => `<div class="sp-rm" style="--n:${bl.length}">`
    + `<span></span>${bl.map(m => `<span class="sp-rm-u num">${datumFmt(mts(m), 'uhr')}</span>`).join('')}`
    + ids.map(id => `${_spChip(id)}${bl.map(m => {
        const w = _spGew(m, id), r = rolle(m, id);
        return `<span class="sp-rm-z ${w ? 'w' : 'l'}">${r === 'def' ? 'A' : r === 'atk' ? 'S' : ''}</span>`;
      }).join('')}`).join('') + `</div>`).join('');
  // Die Zeilen tragen Gesichter; wer welches ist, sagt die Textstelle darunter.
  const legende = _spUnter(`Von oben nach unten: ${_spUnd(ids)}. S steht für Sturm, A für Abwehr, grün für gewonnen, rot für verloren.`);
  return `<div class="nd-section">Die Tabelle der Runde</div>${_spRundeTafel(d.spieler)}`
    + `<div class="nd-section">Wer mit wem</div><div class="sp-rms">${matrix}</div>${legende}`
    + `<div class="nd-section">Die Partien</div><div class="sp-rd-ps nd-rd">${(d.partien || []).map((p, i) => _spRundeZeile(d, p, i, true)).join('')}</div>`;
}
