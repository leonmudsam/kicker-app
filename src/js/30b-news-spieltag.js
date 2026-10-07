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
//   Serienbruch          der gerissene Lauf und wer ihn beendet hat
//   Teamserie            der Lauf des Duos und seine Bilanz als Ring
//   Wende                die Elo-Kurve der letzten zwölf Partien
//   Rivalität            jede Begegnung der beiden als Balken
//   seltene Auszeichnung die Medaille und wer sie in der Liga trägt
//   Premiere             der erste gemeinsame Sieg eines Duos und der Versuch
//   Rollentausch         ein Sieg auf der ungewohnten Seite und ihr Anteil
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
// Eine Runde: ein Block von Partien ohne eine Pause über dreißig Minuten
// (`RUNDE_PAUSE_MS`), in dem nur dieselben vier gespielt haben, und das
// mindestens dreimal [§C33]. Spielt im Block ein Fünfter, ist es keine
// Runde; zwei Partien sind ein Rückspiel und keine Runde. Gemessen an den
// 466 Partien der Liga liegen die Abstände innerhalb einer Runde bei 11
// Minuten im Median und unter 17 Minuten in neun von zehn Fällen; so
// ergeben sich 29 Runden aus 115 Partien.
const RUNDE_PAUSE_MS = 30 * 60 * 1000;
// Drei Partien und nicht zwei: zwei sind ein Rückspiel. Die Zahl steht an
// einer Stelle, weil sie an zwei gefragt wird — beim Bilden der Runden und
// beim Bauen der Story —, und eine Grenze, die zweimal blank dasteht, ändert
// man einmal und hat dann zwei.
const RUNDE_MIN = 3;
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
  const bloecke = [];
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
    // Ein Block endet mit der ersten Pause über dreißig Minuten.
    const set = ids.slice().sort().join(',');
    const t = mts(m);
    if(r && t - r.t <= RUNDE_PAUSE_MS){
      r.ids.push(m.id); r.t = t; if(r.set !== set) r.set = null;
    } else {
      r = {set, t, ids:[m.id]};
      bloecke.push(r);
    }
  });
  const runden = bloecke.filter(x => x.set && x.ids.length >= RUNDE_MIN);
  b = {chrono, idx, kum, vor, runden, byId:new Map(chrono.map(m => [m.id, m]))};
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
//
// DIE MEDAILLE GEHÖRT DEM SELTENEN. Sie stand auch für jede gewöhnliche
// Auszeichnung und jede runde Marke, und gemessen trug damit jede dritte
// Partie-Karte eines Spieltags dieselbe Medaille — auf einem 10:9 der
// „Zittersieg", obwohl die Anzeigetafel genau das zeigt. Eine gewöhnliche
// Auszeichnung steht als Zeile im Sammelband; und was eine Auszeichnung nur
// als Ergebnis erzählt (`SP_ERGEBNIS_BADGE`, dieselbe Liste wie
// `BADGE_DECKT`), zeigt das Bild des Ergebnisses.
//
// DER RANGSPRUNG BRAUCHT EINE TABELLE. Am Monatsanfang springt jeder Sieger
// zwei Plätze, weil die Tabelle aus drei Leuten besteht — gemessen trug am
// ersten Spieltag eines Monats jede zweite Karte die Tabelle. Er zählt erst,
// wenn die Rangliste belastbar ist (`_storyRangFrei`), wie der Spitzenwechsel.
const SP_ERGEBNIS_BADGE = new Set(['perfect_win', 'upset_king', 'krimi', 'nerves_of_steel', 'nail_biter']);
function _spAnlass(s){
  const d = s.dataRef || {};
  const m = d.matchId ? _spMatch(d.matchId) : null;
  if(!m) return {key:''};
  const fakten = _newsSpielFakten(s);
  const f = t => fakten.find(x => x.type === t);
  const c = _spChance(m);
  let x;
  if((x = f('lead_change')) && x.newLeader) return {key:'spitze', m, x};
  if((x = fakten.find(y => y.type === 'badge_unlocked' && (y.rarity === 'rare' || y.rarity === 'legendary')
      && (!SP_ERGEBNIS_BADGE.has(y.badgeId) || (y.rang > 1 && _badgeTakt('rare', y.rang))))) && x.badgeId)
    return {key:'medaille', m, x:{pid:x.playerId, badgeId:x.badgeId, rang:x.rang}};
  if((x = f('streak_killer')) && x.victimPid) return {key:'riss', m, x};
  if((x = f('win_streak')) && x.streak) return {key:'serie', m, x};
  if((x = f('team_streak')) && x.streak && x.a && x.b) return {key:'teamserie', m, x};
  if(c != null && c < CHANCE_UPSET) return {key:'aussenseiter', m, c};
  if((x = f('rivalry_milestone')) && x.a && x.b) return {key:'duell', m, x};
  return _spAnlassDaten(m, c);
}
// Der Teil des Anlasses, der allein aus den Partien kommt. Der Generator
// fragt ihn, um zu wissen, ob eine Partie gewöhnlich ist und eine Form
// bekommt [§C33] — die übrigen Anlässe kommen aus den Meldungen derselben
// Partie und machen sie ohnehin zu einem Bündel mit eigener Schlagzeile.
function _spAnlassDaten(m, c){
  if(c === undefined) c = _spChance(m);
  const diff = Math.abs(m.score_a - m.score_b);
  let x;
  if((x = _spPremiereDaten(m))) return {key:'premiere', m, x};
  const wende = _spSieger(m).map(pid => ({pid, n:_newsPleitenVor(pid, m)}))
    .filter(w => w.n >= 3).sort((a, b) => b.n - a.n)[0];
  if(wende) return {key:'wende', m, x:wende};
  let frei = false;
  try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  const sprung = frei ? _spSieger(m).map(pid => ({pid, r:_newsRankChange(pid, m.id)}))
    .filter(w => w.r && w.r.pre - w.r.post >= 2) : [];
  if(sprung.length) return {key:'rang', m, x:sprung};
  if((x = _spRolleDaten(m))) return {key:'rolle', m, x};
  if(diff === 1) return {key:'krimi', m, c};
  if(diff >= 6) return {key:'deutlich', m};
  return {key:'feld', m, c};
}
const SP_ANLASS = {
  spitze:      {name:'Spitzenwechsel',  kurz:'Spitze',      ic:'spitzenwechsel'},
  riss:        {name:'Serienbruch',     kurz:'Bruch',       ic:'flameBreak'},
  serie:       {name:'Serie',           kurz:'Serie',       ic:'flame'},
  teamserie:   {name:'Teamserie',       kurz:'Duo-Serie',   ic:'unstoppable'},
  aussenseiter:{name:'Außenseitersieg', kurz:'Außenseiter', ic:'underdog'},
  wende:       {name:'Wende',           kurz:'Wende',       ic:'comeback'},
  duell:       {name:'Rivalität',       kurz:'Rivalität',   ic:'crossedSwords'},
  medaille:    {name:'Auszeichnung',    kurz:'Marke',       ic:'abzeichen'},
  rang:        {name:'Rangsprung',      kurz:'Sprung',      ic:'stepsUp'},
  premiere:    {name:'Premiere',        kurz:'Premiere',    ic:'premiere'},
  rolle:       {name:'Rollentausch',    kurz:'Rolle',       ic:'posSwap'},
  krimi:       {name:'Ein-Tor-Krimi',   kurz:'Krimi',       ic:'pinch'},
  deutlich:    {name:'Klarer Sieg',     kurz:'Klar',        ic:'thumbsUp'},
  feld:        {name:'Ergebnis',        kurz:'',            ic:'spielfeld'}
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
  // Die Mitte zeigt den Abstand, denn um ihn geht es: der Stand groß, der
  // Sieger hell, darunter je Tor des Siegers ein Feld — so viele, wie die
  // Gegenseite auch geschossen hat, leise, und der Abstand hell. Der Stand
  // stand allein und kursiv da: `_spStand` baut ihn aus `<em>`, und hier
  // fehlte die Regel, die das aufhebt.
  const hoch = Math.max(d.sa, d.sb), tief = Math.min(d.sa, d.sb);
  const felder = hoch <= 20 ? Array.from({length:hoch}, (_, i) => `<i class="${i < tief ? '' : 'a'}" style="--i:${i}"></i>`).join('') : '';
  return `<div class="sp-band">${s(d.A, d.aw)}<div class="sp-band-m"><div class="sp-band-sc num">${_spStand(d)}</div>`
    + (felder ? `<span class="sp-band-g">${felder}</span>` : '')
    + `<span class="sp-band-d num">+${_spZahl(hoch - tief)}</span></div>${s(d.B, !d.aw, true)}</div>`;
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
      + (d.ohneElo ? '' : `<em class="${(s.d || 0) >= 0 ? 'g' : 'r'} num">${_spVz(s.d)}</em>`) + `</div>`).join('')}</div>
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

// ── Der gerissene Lauf: der Serienbruch ──────────────────────────────
// Die Serie war die Leistung des anderen, also steht sie groß da: die Zahl,
// rot durchgestrichen [§C25], daneben wer sie getragen hat und ob sie sein
// Bestwert war, und darunter derselbe Lauf wie bei einer laufenden Serie
// [§C27] — ein Feld je Sieg, am Ende das rote Feld der Partie, die ihn
// beendet hat. Es war eine Kette aus Gliedern mit einem gezackten Strich am
// Ende: eine eigene Bildsprache für dieselbe Serie, die eine Karte weiter
// als Lauf steht, und der Strich las sich als Kratzer. Bis zwanzig Felder
// einzeln, darüber ein Balken.
function _spRissDaten(a){
  const v = _spBasis().vor.get(a.m.id) || {best:{}};
  return {opfer:a.x.victimPid, laenge:a.x.streak, brecher:_spSieger(a.m), eig:v.best[a.x.victimPid] || 0};
}
function _spRissBild(d){
  const n = Math.max(1, d.laenge), einzeln = n <= 20;
  const lauf = einzeln
    ? Array.from({length:n}, (_, i) => `<i class="w" style="--i:${i}"></i>`).join('')
    : `<i class="w sp-rk-voll" style="--i:0"></i>`;
  const best = d.eig > n ? `eigener Bestwert ${_spZahl(d.eig)}` : d.eig === n ? 'der eigene Bestwert' : '';
  return `<div class="sp-rk"><div class="sp-rk-k">`
    + `<span class="sp-rk-z"><b class="num">${_spZahl(n)}</b><s></s></span>`
    + `<span class="sp-rk-t">${_spChip(d.opfer)}<span><em>Siege in Folge</em>${best ? `<small>${best}</small>` : ''}</span></span>`
    + `<span class="sp-rk-b"><small>beendet</small>${_spChips(d.brecher)}</span></div>`
    + `<div class="sp-rk-r${einzeln ? '' : ' balken'}" style="--n:${einzeln ? n : 1}">${lauf}<i class="x" style="--i:${einzeln ? n : 1}">${svgI('x')}</i></div>`
    + _spUnter(`${_spZahl(n)} Siege in Folge von ${_spNb(d.opfer)}, beendet von ${_spUnd(d.brecher)}.`) + `</div>`;
}

// ── Die Premiere: zwei, die zum ersten Mal zusammen gewinnen ─────────
// Ein Duo, das zum ersten Mal zusammen spielt und gewinnt, oder eins, das
// nach mehreren Versuchen den ersten gemeinsamen Sieg holt. Die Zahl ist der
// Versuch: wie viele gemeinsame Partien es dafür gebraucht hat, als Lauf aus
// roten Feldern und dem grünen am Ende — derselbe Lauf wie bei Serie und
// Serienbruch [§C27]. Gezählt wird erst ab dem dritten Versuch: ein Sieg im
// zweiten ist keine Geschichte.
function _spPremiereDaten(m){
  const [A, B] = _spSieger(m);
  if(!A || !B) return null;
  const zusammen = _spEigene(A, m).filter(x => x !== m && [x.a1, x.a2, x.b1, x.b2].includes(B)
    && _spSeite(x, A) === _spSeite(x, B));
  if(zusammen.some(x => _spGew(x, A))) return null;
  if(zusammen.length && zusammen.length < 2) return null;
  return {A, B, versuch:zusammen.length + 1};
}
function _spPremiereBild(d){
  const n = d.versuch, lauf = n <= 20
    ? Array.from({length:n - 1}, (_, i) => `<i class="l" style="--i:${i}"></i>`).join('') + `<i class="w" style="--i:${n - 1}"></i>`
    : `<i class="l sp-pm-voll" style="--i:0"></i><i class="w" style="--i:1"></i>`;
  const was = n === 1 ? `<b class="num">1.</b><span><em>gemeinsame Partie</em><small>und gleich gewonnen</small></span>`
    : `<b class="num">${_spZahl(n)}.</b><span><em>Versuch</em><small>der erste gemeinsame Sieg</small></span>`;
  return `<div class="sp-pm"><div class="sp-pm-k"><span class="sp-pm-d">${_spChip(d.A)}<i>${svgI('handshake')}</i>${_spChip(d.B)}</span>`
    + `<span class="sp-pm-t">${was}</span></div>`
    + (n > 1 ? `<div class="sp-pm-r" style="--n:${n <= 20 ? n : 2}">${lauf}</div>` : '')
    + _spUnter(n === 1 ? `${_spUnd([d.A, d.B])} spielen zum ersten Mal zusammen.`
      : `${_spUnd([d.A, d.B])} gewinnen zum ersten Mal zusammen, nach ${_spZahl(n - 1)} Niederlagen zu zweit.`) + `</div>`;
}

// ── Der Rollentausch: ein Sieg auf der ungewohnten Seite ──────────────
// Wer fast immer hinten steht und vorn gewinnt, hat etwas anderes gezeigt
// als sonst. Die Zahl ist der Anteil der Rolle an der eigenen Laufbahn bis
// zu dieser Partie, gezeichnet wie der Strahl im Positions-Profil [§C27]:
// Sturm von links, Abwehr von rechts, und die heutige Seite trägt die Marke.
// Erst ab zwanzig Partien und unter einem Viertel — vorher ist keine Seite
// gewohnt.
function _spRolleDaten(m){
  let best = null;
  _spSieger(m).forEach(pid => {
    const r = m[(m.a1 === pid ? 'a1' : m.a2 === pid ? 'a2' : m.b1 === pid ? 'b1' : 'b2') + '_pos'];
    const vor = _spEigene(pid, m).filter(x => x !== m);
    if(vor.length < 20) return;
    const rolle = x => x[(x.a1 === pid ? 'a1' : x.a2 === pid ? 'a2' : x.b1 === pid ? 'b1' : 'b2') + '_pos'];
    const dort = vor.filter(x => rolle(x) === r);
    const anteil = dort.length / vor.length;
    if(anteil >= 0.25 || (best && best.anteil <= anteil)) return;
    best = {pid, r, anteil, dort:dort.length, alle:vor.length, w:dort.filter(x => _spGew(x, pid)).length};
  });
  return best;
}
function _spRolleBild(d){
  const sturm = d.r === 'atk' ? d.anteil : 1 - d.anteil;
  const pct = v => Math.round(v * 100);
  const name = d.r === 'atk' ? 'Sturm' : 'Abwehr';
  return `<div class="sp-ro"><div class="sp-ro-k">${_spChip(d.pid)}<span><em>heute im ${name}</em>`
    + `<small>${_spZahl(d.dort)} von ${_spZahl(d.alle)} Partien vorher dort</small></span>`
    + `<b class="num">${_spZahl(pct(d.anteil))} %</b></div>`
    + `<div class="sp-ro-s"><i class="atk${d.r === 'atk' ? ' heute' : ''}" style="width:${(sturm * 100).toFixed(1)}%"></i>`
    + `<i class="def${d.r === 'def' ? ' heute' : ''}"></i></div>`
    + `<div class="sp-ro-l"><span>Sturm ${_spZahl(pct(sturm))} %</span><span>Abwehr ${_spZahl(100 - pct(sturm))} %</span></div>`
    + _spUnter(`${_spNb(d.pid)} steht sonst selten im ${name} und gewinnt dort. Bilanz dort vorher ${_spZahl(d.w)}:${_spZahl(d.dort - d.w)}.`) + `</div>`;
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
    + _spUnter(`${d.nurAnlass ? 'Gemeinsam' : _spUnd([d.A, d.B]) + ' zusammen'}: ${_spZahl(d.w)} ${d.w === 1 ? 'Sieg' : 'Siege'}, ${_spZahl(d.l)} ${d.l === 1 ? 'Niederlage' : 'Niederlagen'}.`);
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
  // Wer eine Auszeichnung trägt, ist Geschichte [§C40]: ein späteres
  // Karriereende nimmt der Karte ihre Träger nicht.
  const ids = players.filter(p => sichtbar(p)).map(p => p.id);
  // Kein heutiger Badge-Zensus fuer eine vergangene Partie: der kanonische
  // Event-Cache weiss, WANN jemand Traeger wurde und das wievielte Mal es
  // war. Ein Index am vorhandenen Datenstand ersetzt Vollrechnungen je
  // Spieler und Medaille. Cache-Versionen koennen den Event-Cache ersetzen,
  // ohne matches zu ersetzen, darum gehoert seine Referenz in den Guard.
  const B = _spBasis(), quelle = getBadgeEarnedCache();
  if(!B.medaillen || B.medaillen.quelle !== quelle){
    const erste = new Map(), vergaben = new Map();
    B.chrono.forEach((m, i) => {
      const gesehen = new Set();
      (quelle[m.id] || []).forEach(ev => {
        const badge = ev.badge && ev.badge.id, pid = ev.playerId;
        if(!badge || !pid) return;
        const k = pid + '|' + badge;
        if(gesehen.has(k)) return;
        gesehen.add(k);
        let traeger = erste.get(badge);
        if(!traeger){ traeger = new Map(); erste.set(badge, traeger); }
        if(!traeger.has(pid)) traeger.set(pid, i);
        let folge = vergaben.get(k);
        if(!folge){ folge = []; vergaben.set(k, folge); }
        folge.push(i);
      });
    });
    B.medaillen = {quelle, erste, vergaben};
  }
  const i = B.idx.get(a.m && a.m.id), erst = B.medaillen.erste.get(b.id);
  const traeger = ids.filter(id => erst && erst.has(id) && erst.get(id) <= i);
  // Numerische Matchpositionen statt eines langen UUID-Schluessels je
  // Vergabe halten den Index klein. Der Rang braucht nur eine binaere Suche
  // im bereits vorhandenen Eventverlauf, keine neue Badge-Rechnung.
  let rang = Number.isInteger(a.x.rang) && a.x.rang > 0 ? a.x.rang : 0;
  if(!rang && i != null){
    const folge = B.medaillen.vergaben.get(a.x.pid + '|' + b.id) || [];
    let lo = 0, hi = folge.length;
    while(lo < hi){ const mid = (lo + hi) >>> 1; if(folge[mid] <= i) lo = mid + 1; else hi = mid; }
    if(lo && folge[lo - 1] === i) rang = lo;
  }
  const erreicht = rang >= 150 ? [Math.floor(rang / 25) * 25 - 25, Math.floor(rang / 25) * 25]
    : NEWS_BADGE_MARKEN.filter(k => k <= rang).slice(-2);
  return {name:b.name, ic:b.ic, klasse:rarityOf(b.id), wer:a.x.pid, rang, ids, traeger,
    wiederholung:rang > 1, marken:erreicht.concat(_badgeNaechsteMarke(rang))};
}
function _spMedailleBild(d){
  if(!d) return '';
  const tr = new Set(d.traeger), viele = d.ids.length > 16;
  const ton = d.klasse === 'legendary' ? 'gold' : 'viol';
  const kl = {legendary:'Legendär', rare:'Selten', common:'Gewöhnlich'}[d.klasse] || '';
  // Nur neue Snapshots besitzen diesen Schalter. Alte V2-Drawings ohne ihn
  // bleiben in ihrer publizierten Traegerform, auch wenn inzwischen mehr
  // Verleihungen existieren. Wiederholungen sagen nie "neu dabei".
  if(d.wiederholung && d.rang > 1){
    const marken = (d.marken || []).slice(-3);
    const schritte = marken.map(n => `<span class="${n < d.rang ? 'hat' : n === d.rang ? 'jetzt' : ''}"><b class="num">${_spZahl(n)}</b></span>`).join('');
    const naechste = marken.find(n => n > d.rang);
    return `<div class="sp-md sp-md-wieder ${ton}">${zkHtml(d.ic, 'g', ton)}<div class="sp-md-r">`
      + `<div class="sp-md-k"><b>${esc(d.name)}</b><em class="${ton}">${kl}</em></div>`
      + `<div class="sp-md-zahl"><b class="num">${_spZahl(d.rang)}.</b><span>Mal</span>${_spChip(d.wer)}</div>`
      + (schritte ? `<div class="sp-md-marken" aria-label="Verleihungsmarken">${schritte}</div>` : '')
      + _spUnter(`${_spNb(d.wer)} erreicht sie erneut.`
        + (naechste ? ` Noch ${_spZahl(naechste - d.rang)} bis zur ${_spZahl(naechste)}. Vergabe.` : ''))
      + `</div></div>`;
  }
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

// ── Die gewöhnliche Partie hat dreizehn Gesichter [§C33] ─────────────
// Gut die Hälfte aller Partie-Karten hatte keinen Anlass, und jede davon
// trug dasselbe Spielfeld: gemessen 31 von 59 Partie-Karten im Fenster, und
// der Feed sah dadurch an jedem Spieltag gleich aus. Jede gewöhnliche Partie
// hat aber etwas, das nur sie hat — eine runde Zahl, einen Gegner, gegen
// den es immer klappt, eine Revanche, einen Tag, an dem nichts danebengeht.
// Dreizehn Formen fragen danach, jede mit einer Regel (`wann`), einem
// Gewicht (`rang`: je seltener und erzählender, desto höher), einer
// Schlagzeile samt Satz (`text`) und einem Bild. Das Spielfeld bleibt eine
// davon.
//
// IN JEDER FORM STEHT DER STAND (`_spSt`), und zwar dort, wo er zur
// Zeichnung gehört — im Feld des Mosaiks, unter der Nadel, als Ende des
// Kalenders. Wer den Feed überfliegt, will wissen, welche Partie es war;
// beim Tagesring stand er zuerst nur im Satz.
//
// ALLES RECHNET BIS ZU DIESER PARTIE, und die Wahl auch (`_spForm`): sie
// sieht nur die Partien davor. Eine Karte behält damit ihre Form, ihre
// Schlagzeile und ihren Satz, wenn später gespielt wird — was einmal
// dasteht, bleibt stehen [§C33]. Deshalb entscheidet sie der Generator und
// nicht die Anzeige: Kopf, Schlagzeile und Satz kommen aus derselben Wahl.

// Der Stand gehört dem Sieger: seine Zahl zuerst und hell [§C33].
function _spSt(d){ return `<b class="sp-st num"><em>${_spZahl(d.hoch)}</em>:${_spZahl(d.tief)}</b>`; }
// Die Namen beider Teams als Textstelle unter der Zeichnung, je einer in
// seiner Zeile [§11.6c].
function _spNz(W, L, wort){
  return `<div class="sp-nz"><span class="w">${_spStapel(W)}</span><span class="sp-nz-gg">${wort || 'gegen'}</span>`
    + `<span class="re">${_spStapel(L)}</span></div>`;
}
// Wie lange etwas her ist, in der Einheit, die man sagen würde.
function _spSeit(ms){
  const min = Math.max(1, Math.round(ms / 60000));
  if(min < 60) return {n:min, e:min === 1 ? 'Minute' : 'Minuten'};
  const h = Math.round(min / 60);
  if(h < 24) return {n:h, e:h === 1 ? 'Stunde' : 'Stunden'};
  const t = Math.round(h / 24);
  if(t < 14) return {n:t, e:t === 1 ? 'Tag' : 'Tagen'};
  const w = Math.round(t / 7);
  return {n:w, e:'Wochen'};
}

// Die Partien je Kalendertag und je Partie Siegchance, Abstand und Gewinn
// der Sieger: einmal je Datenstand, wie `_spBasis`.
const _spFormBasisMemo = new WeakMap();
function _spFormBasis(){
  let b = _spFormBasisMemo.get(matches);
  if(b) return b;
  const chrono = _spBasis().chrono, tage = new Map();
  chrono.forEach(m => { const k = tagKey(m.created_at); if(!tage.has(k)) tage.set(k, []); tage.get(k).push(m); });
  const punkte = chrono.map(m => ({c:_spChance(m), d:Math.abs(m.score_a - m.score_b),
    g:_spSieger(m).reduce((s, id) => s + (_newsEloDelta(id, m.id) || 0), 0)}));
  b = {tage, punkte, fakten:new Map(), kand:new Map(), wahl:new Map()};
  _spFormBasisMemo.set(matches, b);
  return b;
}

// Die Fakten einer Partie, alle bis einschließlich dieser.
function _spFakten(m){
  const FB = _spFormBasis();
  let F = FB.fakten.get(m.id);
  if(F) return F;
  const B = _spBasis(), i = B.idx.get(m.id);
  const W = _spSieger(m), L = _spVerlierer(m), alle = W.concat(L);
  const h = getHistoryByMatchId().get(m.id) || {};
  F = {m, i, W, L, c:_spChance(m), diff:Math.abs(m.score_a - m.score_b),
    hoch:Math.max(m.score_a, m.score_b), tief:Math.min(m.score_a, m.score_b), delta:{}, elo:{}, zahl:{}};
  alle.forEach(id => {
    F.delta[id] = _newsEloDelta(id, m.id) || 0;
    F.elo[id] = Math.round((h.eloBefore || {})[id] != null ? h.eloBefore[id] : cfg.start_elo);
    const eig = _spEigene(id, m);
    F.zahl[id] = {p:eig.length, s:eig.filter(x => _spGew(x, id)).length};
  });
  F.gewinn = W.reduce((s, id) => s + F.delta[id], 0);
  const mit = (x, id) => x.a1 === id || x.a2 === id || x.b1 === id || x.b2 === id;
  const duo = _spEigene(W[0], m).filter(x => mit(x, W[1]) && _spSeite(x, W[0]) === _spSeite(x, W[1]));
  F.duo = {p:duo.length, s:duo.filter(x => _spGew(x, W[0])).length, folge:duo.map(x => _spGew(x, W[0]))};
  // Spieler gegen Spieler: wie oft sich ein Sieger und ein Verlierer als
  // Gegner trafen und wie viele Niederlagen gegen ihn direkt davor lagen.
  F.gegner = [];
  W.forEach(w => L.forEach(l => {
    const folge = _spEigene(w, m).filter(x => mit(x, l) && _spSeite(x, w) !== _spSeite(x, l)).map(x => _spGew(x, w));
    let fluch = 0;
    for(let k = folge.length - 2; k >= 0 && !folge[k]; k--) fluch++;
    F.gegner.push({w, l, n:folge.length, s:folge.filter(Boolean).length, folge, fluch});
  }));
  const tag = FB.tage.get(tagKey(m.created_at)) || [m];
  F.tag = tag.slice(0, tag.indexOf(m) + 1);
  // Die Revanche: dieselben zwei Duos haben sich vorher getroffen, und
  // damals gewann die andere Seite.
  const wSet = W.slice().sort().join(), lSet = L.slice().sort().join();
  const team = (x, s) => _spTeam(x, s).slice().sort().join();
  const vorher = _spEigene(W[0], m).slice(0, -1).reverse().find(x => {
    const a = team(x, 'A'), b = team(x, 'B');
    return (a === wSet && b === lSet) || (a === lSet && b === wSet);
  });
  if(vorher && _spSieger(vorher).slice().sort().join() === lSet) F.revanche = {vorher, ms:mts(m) - mts(vorher)};
  F.treffen = _spEigene(W[0], m).filter(x => { const a = team(x, 'A'), b = team(x, 'B');
    return (a === wSet && b === lSet) || (a === lSet && b === wSet); });
  F.pause = W.map(id => { const eig = _spEigene(id, m), v = eig[eig.length - 2];
    return {id, tage:v ? Math.floor((mts(m) - mts(v)) / 86400000) : null, vorher:v}; });
  let frei = false;
  try { frei = _storyRangFrei(seasonOf(m.created_at).id, mts(m)).frei; } catch(e){}
  F.rang = {};
  alle.forEach(id => { F.rang[id] = frei ? _newsRankChange(id, m.id) : null; });
  F.vert = B.kum.map(k => k[i + 1]);
  FB.fakten.set(m.id, F);
  return F;
}

const SP_RUND = new Set([5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200]);
const _spMarke = n => n >= 50 && n % 50 === 0;
const _spNl = ids => _namenListe(ids.map(_spName));

// Strengere V2-Befunde fuer Grafiken, die sonst fast jede normale Partie
// erklaeren koennten. Die historischen 13 Formen behalten ihre Regeln;
// neue Score-Snapshots verwenden diese belastbareren Anlaesse.
function _spMosaikBefund(F){
  if(F.hoch !== 10 || F.diff < 2 || F.diff > 5) return null;
  const gesamt = F.vert.slice(1).reduce((s, n) => s + n, 0);
  if(gesamt < 30) return null;
  const n = F.vert[F.diff] || 0, max = Math.max(...F.vert.slice(1, 10));
  const selten = n <= Math.max(2, Math.floor(gesamt * 0.04));
  // Der Modalwert bleibt oft ueber viele Partien derselbe. Er ist nur bei
  // jeder fuenften Bestaetigung neu erzaehlenswert; eine allgemeine runde
  // Ergebnismarke erst in Zehnerschritten.
  const haeufig = n === max && n / gesamt >= 0.18 && n >= 5 && n % 5 === 0;
  const marke = n >= 10 && n % 10 === 0;
  return selten || haeufig || marke
    ? {grund:selten ? 'selten' : (haeufig ? 'haeufig' : 'marke')} : null;
}
function _spTransferBefund(F){
  if(F.i < 60 || !Number.isFinite(F.gewinn)) return null;
  const g = _spFormBasis().punkte.slice(0, F.i).map(p => p.g).filter(Number.isFinite);
  const platz = 1 + g.filter(v => v >= F.gewinn).length;
  const grenze = Math.max(1, Math.ceil((g.length + 1) * 0.05));
  return platz <= grenze ? {platz, gesamt:g.length + 1} : null;
}

// ── Die Formen: Regel, Daten, Bild und Text ──────────────────────────
// `wann` gibt die Daten der Regel oder null, `daten` macht daraus, was das
// Bild braucht — nur Zahlen und IDs, damit `tests/blatt` jedes Bild auch
// mit Grenzwerten zeichnen kann [§11.6c].
const SP_FORM = {
  // Das Mosaik: wie gewöhnlich dieses Ergebnis ist. Zehn Felder von 10:0
  // bis 10:9, jedes so hell, wie oft die Liga bis hier so endete.
  mosaik:{rang:12, ic:'chartBar',
    wann:F => F.diff >= 2 && F.diff <= 3 && F.hoch === 10 ? {} : null,
    gewicht:x => x.grund === 'selten' ? 28 : (x.grund === 'haeufig' ? 22 : 18),
    daten:(F, x) => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, diff:F.diff,
      n:F.vert.slice(), mal:F.vert[F.diff], grund:x.grund,
      gesamt:F.vert.slice(1).reduce((s, n) => s + n, 0)}),
    text:(F, x) => {
      const eig = _spEigene(F.W[0], F.m).filter(x => _spGew(x, F.W[0]) && Math.abs(x.score_a - x.score_b) === F.diff).length;
      if(!x.grund) return {t:`${_spNl(F.W)} gewinnen das ${F.vert[F.diff]}. ${F.hoch}:${F.tief} der Liga`,
        d:`Für ${_spName(F.W[0])} ist es der ${eig}. Sieg mit diesem Ergebnis.`};
      const art = x.grund === 'selten' ? 'seltenen' : 'häufigsten';
      return {t:x.grund === 'marke'
          ? `${_spNl(F.W)} gewinnen das ${F.vert[F.diff]}. ${F.hoch}:${F.tief} der Liga`
          : `${_spNl(F.W)} landen beim ${art} Ergebnis der Liga`,
        d:`Für ${_spName(F.W[0])} ist es der ${eig}. Sieg mit diesem Ergebnis.`};
    }},
  // Pflicht erfüllt: der Favorit gewinnt, und die Nadel zeigt, wie sicher
  // es vorher aussah.
  tacho:{rang:20, ic:'target',
    wann:F => F.c != null && F.c >= 0.62 && F.diff < 6 ? {} : null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, pct:Math.round(F.c * 100), klar:F.diff >= 4}),
    text:(F, x) => {
      if(x && x.leicht) return {t:`${_spNl(F.W)} gewinnen mit leichtem Vorteil`,
        d:`${F.hoch}:${F.tief} gegen ${_spNl(F.L)}. Vor der Partie lagen beide Teams nah beieinander.`};
      const w = F.W[0], als = _spEigene(w, F.m).slice(0, -1).filter(x => { const c = _spChance(x);
        return c != null && (_spGew(x, w) ? c : 1 - c) >= 0.62; });
      const g = als.filter(x => _spGew(x, w)).length;
      return {t:`${_spNl(F.W)} lösen die Favoritenrolle ein`,
        d:als.length >= 5 ? `${_spName(w)} gewinnt als Favorit ${Math.round(g / als.length * 100)} % aller Partien.`
          : `${_spName(w)} geht zum ${als.length + 1}. Mal als Favorit in eine Partie.`};
    }},
  // Erwartung gegen Ergebnis: das Ergebnis weicht deutlich von der Rechnung
  // ab. Die Liga bis hier als Wolke, die Erwartung als Linie, diese Partie
  // als Punkt.
  streu:{rang:34, ic:'ausreisser',
    wann:F => F.i >= 50 && F.c != null && ((F.c >= 0.7 && F.diff <= 2) || (F.c < 0.5 && F.diff >= 5)) ? {knapp:F.c >= 0.7} : null,
    daten:(F, x) => {
      const pk = _spFormBasis().punkte.slice(0, F.i).filter(p => p.c != null);
      const bins = {};
      pk.forEach(p => { const k = Math.min(19, Math.floor(p.c * 20)) + '_' + Math.min(10, p.d); bins[k] = (bins[k] || 0) + 1; });
      const erw = [];
      for(let k = 0; k < 10; k++){ const z = pk.filter(p => p.c >= k / 10 && p.c < (k + 1) / 10);
        if(z.length >= 4) erw.push([k / 10 + 0.05, z.reduce((s, p) => s + p.d, 0) / z.length]); }
      const so = pk.filter(p => x.knapp ? (p.c >= 0.7 && p.d <= F.diff) : (p.c < 0.5 && p.d >= F.diff)).length;
      return {W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, c:F.c, diff:F.diff, knapp:x.knapp,
        bins:Object.keys(bins).map(k => { const [a, b] = k.split('_').map(Number); return {c:(a + 0.5) / 20, d:b, n:bins[k]}; }),
        erw, so, gesamt:pk.length};
    },
    text:(F, x) => {
      const pk = _spFormBasis().punkte.slice(0, F.i).filter(p => p.c != null && Math.abs(p.c - F.c) < 0.05);
      const soll = pk.length >= 4 ? pk.reduce((s, p) => s + p.d, 0) / pk.length : null;
      return {t:`${_spNl(F.W)} gewinnen ${x.knapp ? 'knapper' : 'klarer'} als gedacht`,
        // Die Siegchance steht in der Zeichnung, der Satz nennt den Schnitt,
        // den die Linie nur zeigt.
        d:soll != null ? `So eine Ausgangslage endet im Schnitt mit ${komma(soll)} Toren Abstand.`
          : `In dieser Lage ist es erst die ${pk.length + 1}. Partie der Liga.`};
    }},
  // Der Elo-Transfer: historische Formregel. Neue V2-Scorekarten schalten
  // ihn über `_spTransferBefund` nur für die obersten fünf Prozent frei.
  transfer:{rang:30, ic:'boomerang',
    wann:F => {
      if(F.i < 50) return null;
      const g = _spFormBasis().punkte.slice(0, F.i).map(p => p.g).sort((a, b) => b - a);
      return F.gewinn >= g[Math.floor(g.length * 0.12)] ? {} : null;
    },
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, delta:Object.assign({}, F.delta), gewinn:F.gewinn}),
    text:F => {
      const pk = _spFormBasis().punkte, B = _spBasis();
      let z = null;
      for(let j = F.i - 1; j >= 0; j--) if(pk[j].g >= F.gewinn){ z = B.chrono[j]; break; }
      return {t:`${_spZahl(F.gewinn)} Elo wechseln die Seite`,
        d:z ? `So viel brachte zuletzt eine Partie am ${datumFmt(mts(z), 'tm')}` : 'So viel brachte bis hier keine Partie der Liga.'};
    }},
  // Eingespielt: ein Duo, das zusammen fast immer gewinnt, oder eine runde
  // Zahl gemeinsamer Siege.
  chemie:{rang:26, ic:'handshake',
    wann:F => (F.duo.p >= 12 && F.duo.s / F.duo.p >= 0.75) || (SP_RUND.has(F.duo.s) && F.duo.p >= 5) ? {rund:SP_RUND.has(F.duo.s)} : null,
    gewicht:x => x.rund ? 38 : 0,
    daten:F => ({A:F.W[0], B:F.W[1], L:F.L, hoch:F.hoch, tief:F.tief, s:F.duo.s, p:F.duo.p, folge:F.duo.folge.slice(-30)}),
    text:(F, x) => {
      const q = id => { const p = F.W.find(o => o !== id);
        const ohne = _spEigene(id, F.m).filter(y => !(_spTeam(y, _spSeite(y, id)).includes(p)));
        return Math.round(ohne.filter(y => _spGew(y, id)).length / Math.max(1, ohne.length) * 100); };
      return {t:x.rund ? `${_spNl(F.W)} feiern den ${F.duo.s}. gemeinsamen Sieg` : `${_spNl(F.W)} sind eingespielt`,
        d:`Mit anderen Partnern gewinnt ${_spName(F.W[0])} ${q(F.W[0])} % und ${_spName(F.W[1])} ${q(F.W[1])} %.`};
    }},
  // Der Lieblingsgegner und der gebrochene Fluch: Spieler gegen Spieler.
  gegner:{rang:24, ic:'crossedSwords',
    wann:F => {
      const fluch = F.gegner.filter(g => g.fluch >= 5).sort((a, b) => b.fluch - a.fluch)[0];
      if(fluch) return {g:fluch, fluch:true};
      const lieb = F.gegner.filter(g => g.n >= 6 && g.s / g.n >= 0.75 && g.s % 5 === 0).sort((a, b) => b.s / b.n - a.s / a.n || b.n - a.n)[0];
      return lieb ? {g:lieb, fluch:false} : null;
    },
    gewicht:x => x.fluch ? 42 : 0,
    daten:(F, x) => ({w:x.g.w, l:x.g.l, W:F.W, L:F.L, s:x.g.s, n:x.g.n, folge:x.g.folge.slice(-24), fluch:x.fluch ? x.g.fluch : 0, hoch:F.hoch, tief:F.tief}),
    text:(F, x) => {
      const g = x.g, eig = _spEigene(g.w, F.m).slice(0, -1).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(g.l) && _spSeite(y, g.w) !== _spSeite(y, g.l));
      if(x.fluch){
        const s = eig.filter(y => _spGew(y, g.w)).pop();
        return {t:`${_spName(g.w)} schlägt ${_spName(g.l)} wieder`,
          d:s ? `Der letzte Sieg gegen ${_spName(g.l)} war am ${datumFmt(mts(s), 'tm')}` : `Es ist der erste Sieg gegen ${_spName(g.l)} nach ${g.fluch} Niederlagen.`};
      }
      let k = 0; for(let j = eig.length - 1; j >= 0 && _spGew(eig[j], g.w); j--) k++;
      return {t:`${_spName(g.w)} schlägt ${_spName(g.l)} zum ${g.s}. Mal`,
        d:k ? `Das ist der ${k + 1}. Sieg in Folge gegen ${_spName(g.l)}.`
          : `Die letzte Niederlage gegen ${_spName(g.l)} war am ${datumFmt(mts(eig[eig.length - 1]), 'tm')}`};
    }},
  // Die Revanche: dieselben zwei Duos, und diesmal gewinnt die andere Seite.
  revanche:{rang:28, ic:'rematch',
    wann:F => F.revanche || null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, vHoch:Math.max(F.revanche.vorher.score_a, F.revanche.vorher.score_b),
      vTief:Math.min(F.revanche.vorher.score_a, F.revanche.vorher.score_b), seit:_spSeit(F.revanche.ms)}),
    text:F => {
      const s = F.treffen.filter(y => _spGew(y, F.W[0])).length, n = F.treffen.length;
      return {t:F.revanche.ms <= 1800000 ? `${_spNl(F.W)} antworten sofort` : `${_spNl(F.W)} holen sich die Revanche`,
        // Die Bilanz steht als Satz und nicht als „x:y": ein zweiter Stand im Text
        // neben dem der Partie liest sich als ihr Ergebnis.
        d:n <= 2 ? `Es ist das ${n}. Treffen dieser beiden Duos.`
          : s === n - s ? `Von ${n} Treffen dieser beiden Duos gingen je ${s} an jede Seite.`
          : `Von ${n} Treffen dieser beiden Duos gingen ${Math.max(s, n - s)} an ${_spNl(s > n - s ? F.W : F.L)}.`};
    }},
  // Gipfeltreffen: der Erste und der Zweite der Monatstabelle am selben Tisch.
  gipfel:{rang:26, ic:'peak',
    wann:F => { const r = F.W.concat(F.L).map(id => F.rang[id] && F.rang[id].pre);
      return r.includes(1) && r.includes(2) ? {} : null; },
    daten:F => ({hoch:F.hoch, tief:F.tief, zeilen:F.W.concat(F.L).map(id => ({id, pre:F.rang[id] ? F.rang[id].pre : null,
      post:F.rang[id] ? F.rang[id].post : null, w:F.W.includes(id)})).sort((a, b) => (a.pre || 999) - (b.pre || 999))}),
    text:F => {
      const ids = F.W.concat(F.L), eins = ids.find(id => F.rang[id] && F.rang[id].pre === 1), zwei = ids.find(id => F.rang[id] && F.rang[id].pre === 2);
      const gleich = F.W.includes(eins) === F.W.includes(zwei);
      const t = gleich ? (F.W.includes(eins) ? `Die beiden Ersten gewinnen zusammen` : `${_spNl(F.W)} schlagen die beiden Ersten`)
        : `${_spName(F.W.includes(eins) ? eins : zwei)} gewinnt das Gipfeltreffen`;
      const neu = ids.find(id => F.rang[id] && F.rang[id].post === 1);
      return {t, d:neu ? `Nach der Partie führt ${_spName(neu)} die Monatstabelle.` : `${_spName(eins)} war vorher Erster.`};
    }},
  // Zurück am Tisch: ein Sieg nach mindestens zehn Tagen ohne Partie.
  rueckkehr:{rang:32, ic:'doorReturn',
    wann:F => F.pause.filter(p => p.tage != null && p.tage >= 10).sort((a, b) => b.tage - a.tage)[0] || null,
    daten:(F, x) => ({id:x.id, mit:F.W.find(o => o !== x.id), tage:x.tage, L:F.L, hoch:F.hoch, tief:F.tief}),
    text:(F, x) => ({t:`${_spName(x.id)} ist zurück`, d:`Die letzte Partie davor war am ${datumFmt(mts(x.vorher), 'tm')}`}),
  },
  // Zwei Welten: im Sieger-Duo liegen mindestens 220 Elo zwischen beiden.
  gefaelle:{rang:16, ic:'weight',
    wann:F => Math.abs(F.elo[F.W[0]] - F.elo[F.W[1]]) >= 220 ? {} : null,
    daten:F => ({W:F.W, L:F.L, hoch:F.hoch, tief:F.tief, elo:Object.assign({}, F.elo)}),
    text:F => ({t:`${_spNl(F.W)} gewinnen als ungleiches Paar`,
      d:`Für ${_spName(F.W[0])} bringt der Sieg ${_spVz(F.delta[F.W[0]])} Elo, für ${_spName(F.W[1])} ${_spVz(F.delta[F.W[1]])}.`})},
  // Der Tagesring: ein Sieger hat heute mindestens vier Partien gespielt und
  // drei von vier gewonnen.
  tagesring:{rang:22, ic:'sunrise',
    wann:F => {
      const t = F.W.map(id => ({id, ms:F.tag.filter(x => [x.a1, x.a2, x.b1, x.b2].includes(id))}))
        .map(t => Object.assign(t, {s:t.ms.filter(x => _spGew(x, t.id)).length}))
        .filter(t => t.ms.length >= 4 && t.s / t.ms.length >= 0.75).sort((a, b) => b.s - a.s)[0];
      return t || null;
    },
    daten:(F, x) => ({id:x.id, mit:F.W.find(o => o !== x.id), L:F.L, hoch:F.hoch, tief:F.tief, folge:x.ms.slice(-24).map(y => _spGew(y, x.id))}),
    text:(F, x) => ({t:`${_spName(x.id)} ist heute nicht zu stoppen`,
      d:`Der Tag bringt bisher ${_spVz(x.ms.reduce((s, y) => s + (_newsEloDelta(x.id, y.id) || 0), 0))} Elo.`})},
  // Das Zählwerk: eine runde Zahl fällt in dieser Partie.
  zaehlwerk:{rang:44, ic:'hundred',
    wann:F => {
      for(const id of F.W) if(_spMarke(F.zahl[id].s)) return {wert:F.zahl[id].s, sieg:true, wer:id};
      for(const id of F.W.concat(F.L)) if(_spMarke(F.zahl[id].p)) return {wert:F.zahl[id].p, sieg:false, wer:id};
      return (F.i + 1) % 100 === 0 ? {wert:F.i + 1, sieg:false, wer:null} : null;
    },
    daten:(F, x) => ({wer:x.wer, wert:x.wert, sieg:x.sieg, W:F.W, L:F.L, hoch:F.hoch, tief:F.tief}),
    text:(F, x) => {
      if(!x.wer) return {t:`Die Liga spielt ihre ${x.wert}. Partie`, d:`Die erste war am ${datumFmt(mts(_spBasis().chrono[0]), 'tmj')}.`};
      const eig = _spEigene(x.wer, F.m);
      if(x.sieg) return {t:`${_spName(x.wer)} feiert den ${x.wert}. Sieg`, d:`Dafür brauchte es ${eig.length} Partien.`};
      const s = F.zahl[x.wer].s;
      return {t:`${_spName(x.wer)} bestreitet die ${x.wert}. Partie`, d:`${s} davon endeten mit einem Sieg.`};
    }},
  // Das Spielfeld: wer an welcher Stange stand. Es bleibt der Rückfall und
  // erzählt dann, wie oft sich genau diese beiden Duos schon trafen.
  feld:{rang:8, ic:'ball',
    wann:() => ({}),
    daten:F => _spFeldDaten({m:F.m, c:F.c}),
    text:F => {
      const n = F.treffen.length;
      return {t:`${_spNl(F.W)} setzen sich gegen ${_spNl(F.L)} durch`,
        d:n > 1 ? `Diese beiden Duos treffen sich zum ${n}. Mal.` : `Diese beiden Duos spielen zum 1. Mal gegeneinander.`};
    }}
};

// Die Kandidaten einer Partie, schwerste zuerst.
function _spFormKand(m){
  const FB = _spFormBasis();
  let k = FB.kand.get(m.id);
  if(k) return k;
  const F = _spFakten(m);
  k = Object.keys(SP_FORM).map(key => { const f = SP_FORM[key]; let x = null;
    try { x = f.wann(F); } catch(e){ x = null; }
    return x ? {key, x, rang:Math.max(f.rang, f.gewicht ? f.gewicht(x) : 0)} : null; })
    .filter(Boolean).sort((a, b) => b.rang - a.rang);
  FB.kand.set(m.id, k);
  return k;
}
// Ist die Partie eine gewöhnliche, also ohne Anlass aus den Partien selbst?
function _spIstFeld(m){
  const c = _spChance(m);
  return !(c != null && c < CHANCE_UPSET) && _spAnlassDaten(m).key === 'feld';
}
// ── Die Wahl: abwechslungsreich und trotzdem fest ────────────────────
// Die schwerste zutreffende Form, die in den beiden gewöhnlichen Partien
// davor nicht stand; was in den zehn davor schon stand, wiegt sieben Punkte
// weniger, und das Spielfeld kommt höchstens einmal je fünf. „Davor" ist
// die Form, die dort WIRKLICH steht: die Kette läuft einmal je Datenstand
// von der ersten Partie an. Ein Fenster, das für jede Karte zwölf Partien
// zurück neu anfing, nahm für die Partie davor gemessen fünfmal eine andere
// Form an als die, die dort stand, und dann standen zwei gleiche
// hintereinander. Die Kette sieht nur Partien vor der Karte, also bleibt
// eine Form stehen, wenn später gespielt wird [§C33].
function _spForm(m){
  const FB = _spFormBasis();
  let w = FB.wahl.get(m.id);
  if(w) return w;
  const B = _spBasis(), bis = B.idx.get(m.id);
  if(!FB.spur){ FB.spur = []; FB.spurBis = -1; }
  for(let j = FB.spurBis + 1; j <= bis; j++){
    const x = B.chrono[j], spur = FB.spur;
    FB.spurBis = j;
    if(!_spIstFeld(x)) continue;
    const k = _spFormKand(x), zuletzt = spur[spur.length - 1];
    const oft = key => spur.slice(-10).filter(s => s === key).length;
    const frei = k.filter(c => !spur.slice(-2).includes(c.key) && (c.key !== 'feld' || !spur.slice(-4).includes('feld')))
      .map(c => Object.assign({}, c, {eff:c.rang - 7 * oft(c.key)})).sort((a, b) => b.eff - a.eff);
    // Ist alles Zutreffende gerade erst dagewesen, kommt das Spielfeld: es
    // passt immer, und zweimal dieselbe Form hintereinander liest sich wie
    // eine Wiederholung.
    const c = frei[0] || k.find(c => c.key === 'feld' && zuletzt !== 'feld') || k.find(c => c.key !== zuletzt) || k[0];
    FB.wahl.set(x.id, c);
    spur.push(c.key);
  }
  // Eine Partie mit Anlass ist nicht Teil der Kette; fragt doch jemand,
  // bekommt sie die schwerste Form, ohne die Kette zu verschieben.
  return FB.wahl.get(m.id) || _spFormKand(m)[0];
}
// Schlagzeile und Satz einer gewöhnlichen Partie, oder null. Neue V2-Karten
// formulieren die Partie aus derselben Score-Wahl, die sie anschliessend
// zeichnen. Der Text einer gespeicherten Karte steht in der Karte; die alte
// Formkette (`_spForm`) zeichnet nur noch das Bild historischer V1-Karten.
function _spScoreText(m){
  if(!_spIstFeld(m)) return null;
  const w = _spScoreWahl(m);
  if(w && w.key === 'zeile') return SP_FORM.feld.text(_spFakten(m), {});
  if(w && w.key === 'abstand'){
    const F = _spFakten(m);
    return {t:`${_spNl(F.W)} gewinnen mit ${F.diff} Toren Abstand`,
      d:`${F.hoch}:${F.tief} gegen ${_spNl(F.L)}. Der Abstand ist die Geschichte dieser Partie.`};
  }
  return w && SP_FORM[w.key] ? SP_FORM[w.key].text(_spFakten(m), w.x) : null;
}
function _spFormBild(m){
  const w = _spForm(m), f = SP_FORM[w.key];
  return {key:w.key, glanz:w.key === 'zaehlwerk' || w.key === 'rueckkehr' || w.key === 'transfer' || (w.key === 'gegner' && w.x.fluch),
    html:SP_FORM_BILD[w.key](f.daten(_spFakten(m), w.x))};
}

// ── Die Bilder der Formen ────────────────────────────────────────────
// Jedes zeichnet nur, was `daten` ihm gibt [§11.6c].
function _spMosaikBild(d){
  const sum = d.n.reduce((s, v) => s + v, 0) || 1, max = Math.max(1, ...d.n.slice(1));
  const feld = k => `<div class="sp-mo-k${k === d.diff ? ' jetzt' : ''}" style="--a:${(d.n[k] / max).toFixed(2)};--i:${10 - k}">`
    + (k === d.diff ? _spSt(d) : `<b class="num">10:${10 - k}</b>`) + `<span class="num">${_spZahl(Math.round(d.n[k] / sum * 100))} %</span></div>`;
  const label = d.grund === 'selten' ? 'SELTENER AUSGANG'
    : (d.grund === 'haeufig' ? 'HÄUFIGSTER AUSGANG' : 'RUNDE ERGEBNISMARKE');
  const beleg = d.grund === 'marke'
    ? `${_spZahl(d.mal)}. Partie mit diesem Abstand`
    : `${_spZahl(d.mal)} von ${_spZahl(d.gesamt || sum)} Partien`;
  return `<div class="sp-fk sp-mo"><div class="sp-mo-g">${Array.from({length:10}, (_, i) => feld(10 - i)).join('')}</div>`
    + (d.grund ? `<div class="sp-mo-a"><b>${label}</b><span>${beleg}</span></div>` : '')
    + _spNz(d.W, d.L) + `</div>`;
}
function _spTachoBild(d){
  const a = p => { const w = (p / 100 * 180 - 180) * Math.PI / 180; return [50 + 40 * Math.cos(w), 50 + 40 * Math.sin(w)]; };
  const [x1, y1] = a(d.pct);
  const ticks = [0, 25, 50, 75, 100].map(t => { const w = (t / 100 * 180 - 180) * Math.PI / 180;
    return `<line x1="${(50 + 33 * Math.cos(w)).toFixed(1)}" y1="${(50 + 33 * Math.sin(w)).toFixed(1)}" x2="${(50 + 29 * Math.cos(w)).toFixed(1)}" y2="${(50 + 29 * Math.sin(w)).toFixed(1)}"/>`; }).join('');
  return `<div class="sp-fk sp-ta"><div class="sp-ta-u"><svg viewBox="0 0 100 56" aria-hidden="true">
      <path class="sp-ta-g" d="M10 50A40 40 0 0 1 90 50"/><path class="sp-ta-f" d="M10 50A40 40 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>
      <g class="sp-ta-t">${ticks}</g><g class="sp-ta-n" style="--w:${(d.pct / 100 * 180 - 90).toFixed(1)}deg"><line x1="50" y1="50" x2="50" y2="17"/><circle cx="50" cy="50" r="3.2"/></g></svg>
      <b class="num">${_spZahl(d.pct)} %</b><span>Siegchance vorher</span></div>
    <div class="sp-ta-r">${_spChips(d.W)}${_spSt(d)}<em>${d.klar ? 'so klar wie erwartet' : 'knapper als die Rechnung'}</em></div></div>`
    + _spNz(d.W, d.L);
}
function _spStreuBild(d){
  const X = c => 6 + c * 88, Y = v => 52 - Math.min(10, v) * 4.4;
  const max = Math.max(1, ...d.bins.map(b => b.n));
  const wolke = d.bins.map(b => `<rect x="${(X(b.c) - 2.1).toFixed(1)}" y="${(Y(b.d) - 2.1).toFixed(1)}" width="4.2" height="4.2" rx="1" style="opacity:${(0.15 + b.n / max * 0.6).toFixed(2)}"/>`).join('');
  const erw = d.erw.map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
  return `<div class="sp-fk sp-sd"><svg viewBox="0 0 100 56" aria-hidden="true">
      <line class="sp-sd-ax" x1="6" y1="54" x2="96" y2="54"/><line class="sp-sd-ax" x1="6" y1="4" x2="6" y2="54"/>
      <g class="sp-sd-w">${wolke}</g>${erw ? `<polyline class="sp-sd-e" points="${erw}"/>` : ''}
      <circle class="sp-sd-r" cx="${X(d.c).toFixed(1)}" cy="${Y(d.diff).toFixed(1)}" r="4.6"/><circle class="sp-sd-p" cx="${X(d.c).toFixed(1)}" cy="${Y(d.diff).toFixed(1)}" r="2.2"/></svg>
    <div class="sp-sd-t">${_spSt(d)}<em>${d.knapp ? 'knapper als erwartet' : 'deutlicher als erwartet'}</em>
      <span>bei <b class="num">${_spZahl(Math.round(d.c * 100))} %</b> Siegchance so ${d.knapp ? 'eng' : 'klar'} nur <b class="num">${_spZahl(d.so)}</b> von <b class="num">${_spZahl(d.gesamt)}</b></span></div>
    <div class="sp-sd-a"><span>↑ Tore Abstand</span><span>Siegchance →</span></div></div>`
    + _spNz(d.W, d.L);
}
function _spTransferBild(d){
  const seite = (ids, w) => `<div class="sp-et-s${w ? ' w' : ''}">${ids.map(id => `<div class="sp-et-p">${_spWappen(id, 48)}`
    + `<em class="num ${d.delta[id] >= 0 ? 'g' : 'r'}">${_spVz(d.delta[id])}</em></div>`).join('')}</div>`;
  const punkte = Array.from({length:12}, (_, k) => `<i style="--i:${k};top:${(8 + (k * 37) % 84)}%"></i>`).join('');
  return `<div class="sp-fk sp-et">${seite(d.L, false)}<div class="sp-et-m">${punkte}`
    + `<b class="num">${_spVz(d.gewinn)}</b><span>Elo</span>${_spSt(d)}</div>${seite(d.W, true)}</div>`
    + _spNz(d.L, d.W, 'an');
}
function _spChemieBild(d){
  const n = d.folge.length, r = 21, U = 2 * Math.PI * r, l = U / Math.max(1, n);
  const seg = d.folge.map((w, k) => `<circle r="${r}" cx="28" cy="28" class="${w ? 'w' : 'l'}${k === n - 1 ? ' jetzt' : ''}" `
    + `style="stroke-dasharray:${Math.max(0.5, l - 1.2).toFixed(2)} ${(U - l + 1.2).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--i:${k}"/>`).join('');
  return `<div class="sp-fk sp-ch"><div class="sp-ch-d">${_spWappen(d.A, 48)}<div class="sp-ch-r"><svg viewBox="0 0 56 56" aria-hidden="true">${seg}</svg>`
    + `<span><b class="num">${_spZahl(d.s)}.</b><i>DUO-SIEG</i></span></div>${_spWappen(d.B, 48)}</div>`
    + `<div class="sp-ch-u">${_spSt(d)}<span><b class="num">${_spZahl(d.s)}</b> von <b class="num">${_spZahl(d.p)}</b> zusammen gewonnen</span></div></div>`
    + (d.nurAnlass ? '' : _spNz([d.A, d.B], d.L));
}
function _spGegnerBild(d){
  return `<div class="sp-fk sp-gg"><div class="sp-gg-p w">${_spWappen(d.w, 48)}</div>
    <div class="sp-gg-m"><em>${d.fluch ? 'Fluch gebrochen' : 'Lieblingsgegner'}</em>
      <span class="sp-gg-b num"><b>${_spZahl(d.s)}</b>:${_spZahl(d.n - d.s)}</span>
      <span class="sp-gg-r">${d.folge.map((w, k) => `<i class="${w ? 'w' : 'l'}${k === d.folge.length - 1 ? ' jetzt' : ''}" style="--i:${k}"></i>`).join('')}</span>
      <span class="sp-gg-h">heute ${_spSt(d)}</span></div>
    <div class="sp-gg-p">${_spWappen(d.l, 48)}</div></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spRevancheBild(d){
  return `<div class="sp-fk sp-rv"><span class="sp-rv-c">${_spChips(d.W)}</span>
    <div class="sp-rv-m"><span class="sp-rv-t alt"><i>vorher</i><b class="num">${_spZahl(d.vTief)}:${_spZahl(d.vHoch)}</b></span>
      <span class="sp-rv-p"><svg viewBox="0 0 60 24" aria-hidden="true"><path d="M4 18C18 2 42 2 56 16"/><path class="k" d="M50 15L56 16L55 10"/></svg>
        <i>nach ${_spZahl(d.seit.n)} ${d.seit.e}</i></span>
      <span class="sp-rv-t neu"><i>jetzt</i>${_spSt(d)}</span></div>
    <span class="sp-rv-c re">${_spChips(d.L)}</span></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
function _spGipfelBild(d){
  return `<div class="sp-fk sp-gp">${d.zeilen.map((z, k) => `<div class="sp-gp-z${z.w ? ' w' : ''}" style="--i:${k}">`
    + `<span class="num">${z.pre ? _spZahl(z.pre) + '.' : '–'}</span>${_spChip(z.id)}<span class="sp-gp-n">${esc(_spName(z.id))}</span>`
    + `<em class="num ${z.post && z.pre && z.post < z.pre ? 'g' : z.post && z.pre && z.post > z.pre ? 'r' : ''}">${z.post && z.post !== z.pre ? '→ ' + _spZahl(z.post) + '.' : '='}</em></div>`).join('')}
    <div class="sp-gp-f">${_spSt(d)}<span>Platz 1 und 2 am Tisch</span></div></div>`;
}
function _spRueckkehrBild(d){
  const n = Math.min(28, d.tage + 1);
  return `<div class="sp-fk sp-zu">${_spWappen(d.id, 48)}<div class="sp-zu-m">
      <span class="sp-zu-z"><b class="num">${_spZahl(d.tage)}</b> Tage ohne Partie</span>
      <span class="sp-zu-k">${Array.from({length:n}, (_, k) => `<i class="${k === 0 ? 'alt' : ''}" style="--i:${k}"></i>`).join('')}${_spSt(d)}</span></div></div>`
    + (d.nurAnlass ? '' : _spUnter(`${_spNb(d.id)} mit ${_spNb(d.mit)} gegen ${_spUnd(d.L)}.`));
}
function _spGefaelleBild(d){
  const ids = d.W.concat(d.L), lo = Math.min(...ids.map(id => d.elo[id])), hi = Math.max(...ids.map(id => d.elo[id]));
  const h = id => 20 + Math.round((d.elo[id] - lo) / Math.max(1, hi - lo) * 60);
  const s = (id, w, k) => `<span class="sp-gf-s${w ? ' w' : ''}" style="--i:${k}"><b class="num">${(d.elo[id] < 0 ? '−' : '') + _spZahl(d.elo[id])}</b>`
    + `<i style="height:${h(id)}%"></i>${_spChip(id)}</span>`;
  const team = (t, w, k) => `<div class="sp-gf-t${w ? ' w' : ''}"><div class="sp-gf-ss">${t.map((id, j) => s(id, w, k + j)).join('')}</div>`
    + `<small class="num">${_spZahl(Math.abs(d.elo[t[0]] - d.elo[t[1]]))} Elo dazwischen</small></div>`;
  return `<div class="sp-fk sp-gf">${team(d.W, true, 0)}${_spSt(d)}${team(d.L, false, 2)}</div>` + _spNz(d.W, d.L);
}
function _spTagesringBild(d){
  const n = d.folge.length, r = 30, U = 2 * Math.PI * r, l = U / n, s = d.folge.filter(Boolean).length;
  const seg = d.folge.map((w, k) => `<circle r="${r}" cx="38" cy="38" class="${w ? 'w' : 'l'}${k === n - 1 ? ' jetzt' : ''}" `
    + `style="stroke-dasharray:${Math.max(0.5, l - 2.4).toFixed(2)} ${(U - l + 2.4).toFixed(2)};stroke-dashoffset:${(-l * k).toFixed(2)};--i:${k}"/>`).join('');
  return `<div class="sp-fk sp-tr"><div class="sp-tr-r"><svg viewBox="0 0 76 76" aria-hidden="true">${seg}</svg><span>${_spWappen(d.id, 48)}</span></div>
    <div class="sp-tr-t"><em>heute</em><span class="sp-tr-z"><b class="num">${_spZahl(s)}</b> von ${_spZahl(n)}</span>
      <span class="sp-tr-j">Partie ${_spZahl(n)} ${_spSt(d)}</span></div></div>`
    + (d.nurAnlass ? '' : _spUnter(`${_spNb(d.id)} mit ${_spNb(d.mit)} gegen ${_spUnd(d.L)}.`));
}
function _spZaehlwerkBild(d){
  const z = String(d.wert).padStart(3, '0').split('');
  const einheit = d.label || (d.wer ? (d.sieg ? 'Sieg' : 'Partie') : 'Partie der Liga');
  // Die Ziffer steht als Text da, das Rollband ist ein Pseudo-Element: ein Band aus
  // zehn Ziffern hinter overflow:hidden ist für jede Messung abgeschnittener Text,
  // und ohne Bewegung braucht es niemand.
  const rolle = c => `<span class="sp-zw-r" style="--z:${c}"><b>${c}</b></span>`;
  return `<div class="sp-fk sp-zw">${d.wer ? _spWappen(d.wer, 48) : `<span class="sp-zw-l">${svgI('ball')}</span>`}
    <div class="sp-zw-m"><span class="sp-zw-w num">${z.map(rolle).join('')}<b>.</b></span>
      <span class="sp-zw-u">${einheit + (!d.nurAnlass && d.wer && _spPasst([d.wer], 12, true) ? ` von ${esc(_spName(d.wer))}` : '')}</span></div>
    <div class="sp-zw-s">${_spSt(d)}</div></div>`
    + (d.nurAnlass ? '' : _spNz(d.W, d.L));
}
const SP_FORM_BILD = {mosaik:_spMosaikBild, tacho:_spTachoBild, streu:_spStreuBild, transfer:_spTransferBild,
  chemie:_spChemieBild, gegner:_spGegnerBild, revanche:_spRevancheBild, gipfel:_spGipfelBild,
  rueckkehr:_spRueckkehrBild, gefaelle:_spGefaelleBild, tagesring:_spTagesringBild, zaehlwerk:_spZaehlwerkBild,
  feld:_spFeldBild};

// ── Kopf und Fuß je Anlass ───────────────────────────────────────────
// Ein Anlass trägt die Ergebniszeile als Kopf und seine Grafik als Fuß; die
// gewöhnliche Partie trägt ihre Form. Die Ergebniszeile wechselte sich
// einmal mit dem Spielfeld ab, damit es überhaupt vorkam — seit es eine
// von dreizehn Formen ist, stand es damit auf gut der Hälfte der Karten,
// und der Feed sah an jedem Spieltag gleich aus.
const _spZeile = a => _spZeileBild(_spZeileDaten(a.m));
const SP_KOPF = {
  krimi:a => _spTafelBild(_spTafelDaten(a)),
  aussenseiter:a => _spWippeBild(_spWippeDaten(a)), deutlich:a => _spBandBild(_spZeileDaten(a.m)),
  spitze:_spZeile, rang:_spZeile, serie:_spZeile, wende:_spZeile, duell:_spZeile,
  riss:_spZeile, teamserie:_spZeile, medaille:_spZeile, premiere:_spZeile, rolle:_spZeile
};
const SP_FUSS = {
  krimi:a => _spNervenBild(_spNervenDaten(a)), deutlich:a => _spVerteilungBild(_spVerteilungDaten(a)),
  spitze:a => _spTabelleBild(_spTabelleDaten(a, true)), rang:a => _spTabelleBild(_spTabelleDaten(a, false)),
  serie:a => _spSerieBild(_spSerieDaten(a)), wende:a => _spKurveBild(_spKurveDaten(a)),
  duell:a => _spDuellBild(_spDuellDaten(a)), riss:a => _spRissBild(_spRissDaten(a)),
  teamserie:a => _spDuoBild(_spDuoDaten(a)), medaille:a => _spMedailleBild(_spMedailleDaten(a)),
  premiere:a => _spPremiereBild(a.x), rolle:a => _spRolleBild(a.x)
};

// ── Zwei unabhängige Bildebenen je Partie ────────────────────────────
// Die obere Ebene erklärt immer sofort Paarung und Endstand. Die optionale
// untere Ebene erklärt den Anlass. Beide werden samt Zeichnungsdaten beim
// Publizieren gespeichert und danach nie aus neueren Partien rekonstruiert.
const SP_SCORE_FORMEN = new Set(['mosaik','tacho','streu','transfer','gefaelle','feld']);
const SP_ANLASS_FORMEN = new Set(['chemie','gegner','revanche','gipfel','rueckkehr','tagesring','zaehlwerk']);
function _spVisualHash(v){
  let h = 2166136261 >>> 0, s = String(v || '');
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function _spScoreSpezial(m){
  const c = _spChance(m), diff = Math.abs(m.score_a - m.score_b);
  if(c != null && c < CHANCE_UPSET)
    return {key:'aussenseiter', x:{c}};
  if(diff === 1) return {key:'krimi', x:{c}};
  if(diff >= 6) return {key:'deutlich', x:{}};
  return null;
}
function _spScoreKandidaten(m){
  const F = _spFakten(m);
  const k = _spFormKand(m)
    .filter(x => SP_SCORE_FORMEN.has(x.key) && !['feld','mosaik','transfer'].includes(x.key));
  const mosaik = _spMosaikBefund(F);
  if(mosaik) k.push({key:'mosaik', x:mosaik,
    rang:Math.max(SP_FORM.mosaik.rang, SP_FORM.mosaik.gewicht(mosaik))});
  const transfer = _spTransferBefund(F);
  if(transfer) k.push({key:'transfer', x:transfer,
    rang:SP_FORM.transfer.rang + (transfer.platz === 1 ? 8 : 0)});
  // Auch eine gewoehnliche Partie braucht eine echte Auswahl. Bisher blieb
  // nach den strengen Statistikfiltern oft NUR das Spielfeld uebrig: drei
  // normale Partien hintereinander ergaben damit dreimal dieselbe Grafik.
  // Diese Grundformen zeigen immer wahre, aber verschiedene Seiten des Spiels.
  if(F.c != null && F.c >= .56 && !k.some(x => x.key === 'tacho'))
    k.push({key:'tacho', x:{leicht:F.c < .62}, rang:14});
  if(F.diff >= 3 && F.diff < 6) k.push({key:'abstand', x:{}, rang:13});
  k.push({key:'zeile', x:{}, rang:10});
  k.push({key:'feld', x:{}, rang:SP_FORM.feld.rang});
  const jeKey = new Map();
  k.forEach(x => { const alt = jeKey.get(x.key); if(!alt || x.rang > alt.rang) jeKey.set(x.key, x); });
  return [...jeKey.values()].sort((a, b) => b.rang - a.rang || a.key.localeCompare(b.key));
}
// Die fachlich staerkste passende Scoreform gewinnt. Variation ist ein
// Abschlag fuer kuerzlich wirklich verwendete Formen, kein Zufallsgriff in
// die ersten drei Kandidaten. Nur fachlich passende Alternativen duerfen
// wechseln; dieselbe Form steht nicht direkt hintereinander. Ein besonderer
// Ausgang bleibt auch bei einem anderen Scorekopf als Anlass sichtbar.
function _spScoreWahl(m){
  const FB = _spFormBasis(), B = _spBasis();
  const roh = Array.isArray(_cache._stories) ? _cache._stories : null;
  // Die Spur muss die publizierten Formen kennen. Eine Neuberechnung mit
  // neuen Auswahlregeln zaehlte bisher fuer die alten Spielfeldkarten andere
  // Formen und waehlte deshalb auch fuer die naechste Partie das Spielfeld.
  // Ein Index pro Storybestand, danach ein chronologischer Durchlauf.
  if(FB.scoreFrom !== roh || FB.scoreVersion !== _cache.version){
    FB.scoreFrom = roh; FB.scoreVersion = _cache.version;
    FB.scorePublished = new Map();
    (roh || []).forEach(s => {
      const d = s.dataRef || {};
      if(d.type === 'spiel' && d.matchId && d.visual && d.visual.version === 2
         && d.visual.score && d.visual.score.key) FB.scorePublished.set(d.matchId, d.visual);
    });
    FB.scoreWahl = new Map(); FB.scoreSpur = []; FB.scoreBis = -1;
  }
  let w = FB.scoreWahl && FB.scoreWahl.get(m.id);
  if(w) return w;
  if(!FB.scoreWahl){ FB.scoreWahl = new Map(); FB.scoreSpur = []; FB.scoreBis = -1; }
  const bis = B.idx.get(m.id);
  for(let j = FB.scoreBis + 1; j <= bis; j++){
    const x = B.chrono[j], spezial = _spScoreSpezial(x);
    FB.scoreBis = j;
    const publiziert = FB.scorePublished.get(x.id);
    if(publiziert){
      const fest = {key:publiziert.score.key, x:{}};
      FB.scoreWahl.set(x.id, fest); FB.scoreSpur.push(fest.key);
      continue;
    }
    if(spezial){
      // Auch zwei Krimis oder klare Siege brauchen nicht denselben Kopf.
      // Die Besonderheit reist als Anlassgrafik darunter mit, statt dass
      // die Abwechslung einen falschen Matchbefund erfindet.
      const spur = FB.scoreSpur;
      w = spezial;
      if(spur[spur.length - 1] === spezial.key){
        const alt = _spScoreKandidaten(x).filter(c => c.key !== spezial.key)
          .map(c => Object.assign({}, c, {eff:c.rang
            - 8 * spur.slice(-2).filter(k => k === c.key).length
            - 3 * spur.slice(-8).filter(k => k === c.key).length,
            los:_spVisualHash(x.id + '|' + c.key)}))
          .sort((a, b) => b.eff - a.eff || b.rang - a.rang || a.los - b.los)[0];
        if(alt) w = alt;
      }
      FB.scoreWahl.set(x.id, w);
      FB.scoreSpur.push(w.key);
      continue;
    }
    const spur = FB.scoreSpur, zuletzt = spur[spur.length - 1];
    const gewertet = _spScoreKandidaten(x).map(c => {
      const zweimal = spur.slice(-2).filter(k => k === c.key).length;
      const achtmal = spur.slice(-8).filter(k => k === c.key).length;
      const zwoelfmal = c.key === 'transfer' ? spur.slice(-12).filter(k => k === c.key).length : 0;
      return Object.assign({}, c, {eff:c.rang - 8 * zweimal - 3 * achtmal - 7 * zwoelfmal,
        los:_spVisualHash(x.id + '|' + c.key)});
    }).sort((a, b) => b.eff - a.eff || b.rang - a.rang || a.los - b.los);
    w = gewertet[0] || {key:'feld', x:{}, rang:SP_FORM.feld.rang};
    if(w.key === zuletzt){
      // Der alte Zwei-Punkte-Korridor erlaubte trotz gueltiger Alternativen
      // wiederholte Streudiagramme und Spielfelder. Eignung wurde bereits
      // oben geprueft; unter diesen Kandidaten gilt der direkte Wechsel.
      const anders = gewertet.find(c => c.key !== zuletzt);
      if(anders) w = anders;
    }
    FB.scoreWahl.set(x.id, w);
    spur.push(w.key);
  }
  return FB.scoreWahl.get(m.id) || {key:'feld', x:{}, rang:SP_FORM.feld.rang};
}
function _spScoreSnapshot(m){
  const w = _spScoreWahl(m), c = _spChance(m);
  const fest = _spFormBasis().scorePublished.get(m.id);
  if(fest) return fest.score;
  if(w.key === 'aussenseiter') return {key:w.key, data:_spWippeDaten({m, c})};
  if(w.key === 'krimi') return {key:w.key, data:_spTafelDaten({m, c})};
  if(w.key === 'deutlich') return {key:w.key, data:_spZeileDaten(m)};
  if(w.key === 'zeile' || w.key === 'abstand') return {key:w.key, data:_spZeileDaten(m)};

  const F = _spFakten(m);
  return {key:w.key, data:SP_FORM[w.key].daten(F, w.x)};
}
function _spAnlassSnapshot(m, fakten, scoreKey){
  const f = t => fakten.find(x => x.type === t), c = _spChance(m);
  let a = null, x;
  if((x = f('lead_change')) && x.newLeader) a = {key:'spitze', m, x};
  else if((x = fakten.find(y => y.type === 'badge_unlocked'
      && (y.rarity === 'rare' || y.rarity === 'legendary')
      && (!SP_ERGEBNIS_BADGE.has(y.badgeId) || (y.rang > 1 && _badgeTakt('rare', y.rang))))) && x.badgeId)
    a = {key:'medaille', m, x:{pid:x.playerId, badgeId:x.badgeId, rang:x.rang}};
  else if((x = f('streak_killer')) && x.victimPid) a = {key:'riss', m, x};
  else if((x = f('jubilee')) && x.pid && x.total)
    a = {key:'zaehlwerk', m, x:{wer:x.pid, wert:Number(x.total), label:'Partie'}};
  else if((x = f('milestone_wins')) && x.pid)
    a = {key:'zaehlwerk', m, x:{wer:x.pid, wert:parseInt(x.milestone, 10), label:'Sieg'}};
  else if((x = f('milestone_goals')) && x.pid)
    a = {key:'zaehlwerk', m, x:{wer:x.pid, wert:parseInt(x.milestone, 10), label:'Tor'}};
  else if((x = f('milestone_elo')) && x.pid)
    a = {key:'zaehlwerk', m, x:{wer:x.pid, wert:Number(x.mark) || parseInt(x.milestone, 10), label:'Elo'}};
  else if((x = f('win_streak')) && x.streak) a = {key:'serie', m, x};
  else if((x = f('team_streak')) && x.streak && x.a && x.b) a = {key:'teamserie', m, x};
  else if((x = f('rivalry_milestone')) && x.a && x.b) a = {key:'duell', m, x};
  if(!a){
    const d = _spAnlassDaten(m, c);
    if(['premiere','wende','rang','rolle'].includes(d.key)) a = d;
  }
  if(a){
    if(a.key === 'zaehlwerk'){
      const F = _spFakten(m);
      return {key:a.key, data:{wer:a.x.wer, wert:a.x.wert, label:a.x.label,
        W:F.W, L:F.L, hoch:F.hoch, tief:F.tief}};
    }
    const daten = {
      spitze:() => _spTabelleDaten(a, true), rang:() => _spTabelleDaten(a, false),
      serie:() => _spSerieDaten(a), wende:() => _spKurveDaten(a),
      duell:() => _spDuellDaten(a), riss:() => _spRissDaten(a),
      teamserie:() => _spDuoDaten(a), medaille:() => _spMedailleDaten(a),
      premiere:() => a.x, rolle:() => a.x
    };
    if(daten[a.key]) return {key:a.key, data:daten[a.key]()};
  }

  // Hat ein wiederholter Sonderfall oben absichtlich eine neutrale Form,
  // bleibt sein eigentlicher Anlass hier sichtbar.
  const diff = Math.abs(m.score_a - m.score_b);
  if(c != null && c < CHANCE_UPSET && scoreKey !== 'aussenseiter')
    return {key:'aussenseiter', data:_spWippeDaten({m, c})};
  if(diff === 1 && scoreKey !== 'krimi')
    return {key:'nerven', data:_spNervenDaten({m, c})};
  if(diff >= 6 && scoreKey !== 'deutlich')
    return {key:'verteilung', data:_spVerteilungDaten({m})};

  const F = _spFakten(m);
  const form = _spFormKand(m).find(k => SP_ANLASS_FORMEN.has(k.key));
  if(form) return {key:form.key, data:SP_FORM[form.key].daten(F, form.x)};
  // Knappheit und Klarheit besitzen jeweils eine zweite, vom Score getrennte
  // Erklärgrafik. Sie wird nur ergänzt, wenn kein stärkerer Anlass vorliegt.
  if(scoreKey === 'krimi') return {key:'nerven', data:_spNervenDaten({m, c})};
  if(scoreKey === 'deutlich') return {key:'verteilung', data:_spVerteilungDaten({m})};
  return null;
}
function _spVisualSnapshot(m, fakten){
  const score = _spScoreSnapshot(m);
  const fest = _spFormBasis().scorePublished.get(m.id);
  if(fest) return fest;
  return {version:2, score, occasion:_spAnlassSnapshot(m, fakten || [], score.key)};
}
function _spScoreBild(v){
  if(!v || !v.key) return '';
  const spezial = {krimi:_spTafelBild, aussenseiter:_spWippeBild, deutlich:_spBandBild,
    zeile:_spZeileBild, abstand:_spBandBild};
  if(spezial[v.key]) return spezial[v.key](v.data);
  return SP_FORM_BILD[v.key] ? SP_FORM_BILD[v.key](v.data) : '';
}
function _spOccasionBild(v){
  if(!v || !v.key) return '';
  const data = v.data && typeof v.data === 'object'
    ? Object.assign({}, v.data, {nurAnlass:true}) : v.data;
  const bild = {
    spitze:_spTabelleBild, rang:_spTabelleBild, serie:_spSerieBild,
    wende:_spKurveBild, duell:_spDuellBild, riss:_spRissBild,
    teamserie:_spDuoBild, medaille:_spMedailleBild,
    premiere:_spPremiereBild, rolle:_spRolleBild,
    nerven:_spNervenBild, verteilung:_spVerteilungBild,
    aussenseiter:_spWippeBild
  };
  if(bild[v.key]) return bild[v.key](data);
  return SP_FORM_BILD[v.key] ? SP_FORM_BILD[v.key](data) : '';
}
// Der Satz einer Partie nannte überall dieselben zwei Zahlen — „Die
// Siegchance lag vor dem Anstoß bei 73 %, für Maxi bringt der Sieg +13
// Elo" —, und an keiner Stelle sagten sie etwas über DIESE Partie. Er
// verliert sie deshalb überall (`_newsSpielSatz`); die gewöhnliche Partie
// bekommt ihren Satz aus ihrer Form, und das Blatt zeigt beide Zahlen
// gezeichnet.
const SP_ZEIGT_ALLES = {chance:true, elo:true};
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
  let r = {kopf:'', fuss:'', zeigt:{}, key:'', form:'', glanz:false, pl:players};
  try {
    const basis = _newsSpielFakten(s).find(x => x.type === 'spiel') || s.dataRef || {};
    const v = basis.visual;
    if(v && v.version === 2 && v.score){
      const ok = v.occasion && v.occasion.key;
      r = {key:ok || v.score.key, form:v.score.key,
        glanz:['zaehlwerk','rueckkehr','transfer'].includes(ok || v.score.key),
        kopf:_spScoreBild(v.score), fuss:_spOccasionBild(v.occasion),
        zeigt:SP_ZEIGT_ALLES, pl:players};
      proStand.set(s, r);
      return r;
    }
    const a = _spAnlass(s);
    if(a.key === 'feld'){
      const f = _spFormBild(a.m);
      r = {key:'feld', form:f.key, glanz:f.glanz, kopf:f.html, fuss:'', zeigt:SP_ZEIGT_ALLES, pl:players};
    } else if(a.key){
      r = {key:a.key, form:'', glanz:false, kopf:SP_KOPF[a.key](a) || _newsErgebnisBand(a.m.id),
           fuss:(SP_FUSS[a.key] ? SP_FUSS[a.key](a) : '') || '', zeigt:SP_ZEIGT_ALLES, pl:players};
    }
  } catch(e){
    r = {kopf:'', fuss:'', zeigt:{}, key:'', form:'', glanz:false, pl:players};
  }
  proStand.set(s, r);
  return r;
}

// ── Die Runde der Vier [§C33] ────────────────────────────────────────
// Dieselben vier, Partie auf Partie, standen als Karten untereinander, und
// dass es eine Runde war, sah man nur an den Wappen. Die Runde ist deshalb
// eine eigene Story — ZUSÄTZLICH zu den Karten ihrer Partien, die einzeln
// bleiben, mit ihrem eigenen Bild [§C33]. Sie entsteht, wenn die Runde zu
// ist: dreißig Minuten nach der letzten Partie, und dieser Zeitpunkt ist ihr
// Zeitstempel. Vorher weiß niemand, ob noch eine Partie kommt.
//
// Die Runde war zuerst eine Ableitung bei der Anzeige, die die Karten ihrer
// Partien aufnahm. Damit stand bei vier Spielern nur noch die Runde da, und
// die Bilder der einzelnen Partien — Spielfeld, Anzeigetafel, Wippe — gingen
// verloren. Jetzt ist sie eine Story wie jede andere: die ID trägt die erste
// Partie, gespeichert wird sie einmal, und was einmal dasteht, bleibt.
function _newsRundenStories(nowMs){
  const out = [];
  const seit = nowMs - NEWS_FENSTER_TAGE * 86400000;
  _spBasis().runden.forEach(r => {
    const ende = r.t + RUNDE_PAUSE_MS;
    if(ende > nowMs || r.t < seit) return;
    const st = _newsRundeStory(r, ende);
    if(st) out.push(st);
  });
  return out;
}
function _newsRundeStory(r, ende){
  const ms = r.ids.map(_spMatch).filter(Boolean);
  if(ms.length < RUNDE_MIN) return null;
  const ids = [ms[0].a1, ms[0].a2, ms[0].b1, ms[0].b2];
  const z = {};
  ids.forEach(id => { z[id] = {id, w:0, l:0, e:0}; });
  ms.forEach(m => ids.forEach(id => { _spGew(m, id) ? z[id].w++ : z[id].l++; z[id].e += _newsEloDelta(id, m.id) || 0; }));
  const spieler = ids.map(id => z[id]).sort((a, b) => b.w - a.w || b.e - a.e);
  const top = spieler[0];
  const vorn = spieler.filter(x => x.w === top.w).map(x => x.id);
  const n = ms.length;
  const paarungen = new Set(ms.map(m => paarKey([m.a1, m.a2].sort().join('+'), [m.b1, m.b2].sort().join('+')))).size;
  // Die Schlagzeile nennt, wer die Runde gewonnen hat. Spielen immer
  // dieselben zwei Teams, ist es ein Duell und kein Turnier: dann gewinnt
  // ein Team oder beide trennen sich. Wechseln die Paarungen und steht
  // niemand allein vorn, teilen sie sich die Runde — alle vier hieße, jeder
  // hat gleich oft gewonnen.
  const teamA = [ms[0].a1, ms[0].a2], teamB = [ms[0].b1, ms[0].b2];
  const zwei = t => _namenListe(t.map(_spName));
  let title;
  if(paarungen === 1){
    const wa = ms.filter(m => _spGew(m, teamA[0])).length, wb = n - wa;
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
  // Die Uhrzeiten stehen im Satz: an ihnen lässt sich die Runde nachlesen.
  const desc = `${n} Partien zwischen ${datumFmt(mts(ms[0]), 'uhr')} und ${datumFmt(mts(ms[n - 1]), 'uhr')} Uhr`
    + (paarungen === 3 ? ', jede Paarung mindestens einmal.' : paarungen > 1 ? `, ${paarungen} verschiedene Paarungen.` : ', immer dieselben Teams.');
  return {
    id:'runde_' + ms[0].id, cat:'highlight', ic:'users', when:new Date(ende),
    prio:STORY_PRIO.runde, title, desc,
    dataRef:{type:'runde', matchIds:ms.map(m => m.id), playerIds:ids, spieler, paarungen}
  };
}
// Der Anlass einer Partie der Runde: aus ihrer Karte im Feed, damit die Zeile
// dasselbe Zeichen trägt wie die Karte darüber [§C27].
const _spKarteMemo = new WeakMap();
function _spKarteDerPartie(mid){
  const l = getStoriesCache();
  let m = _spKarteMemo.get(l);
  if(!m){
    m = new Map();
    l.forEach(s => { const d = s.dataRef || {};
      if(d.matchId && (d.type === 'spiel' || (d.type === 'sammel' && d.quelle === 'spiel'))) m.set(d.matchId, s); });
    _spKarteMemo.set(l, m);
  }
  return m.get(mid) || null;
}
// Die Tafel der Runde ist eine Tabelle: eine Zeile je Spieler, der Name in
// der breiten Spalte. In vier Spalten nebeneinander hatte jeder Name ein
// Viertel der Karte.
function _spRundeTafel(sp){
  if(!sp || sp.length < 2) return '';
  const allein = sp[0].w > sp[1].w;
  const maxE = Math.max(8, ...sp.map(x => Math.abs(x.e)));
  return `<div class="sp-rd-tafel">${sp.map((x, i) => `<div class="sp-rd-sp${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">${_spChip(x.id)}`
    + `<span class="sp-rd-m"><span class="sp-rd-n">${_spNb(x.id)}</span>`
    + `<i class="sp-rd-e ${x.e >= 0 ? 'g' : 'r'}"><u style="width:${(Math.abs(x.e) / maxE * 100).toFixed(0)}%"></u></i></span>`
    + `<span class="sp-rd-wl num">${_spZahl(x.w)}:${_spZahl(x.l)}</span>`
    + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${_spVz(x.e)}</em></div>`).join('')}</div>`;
}
// Eine Partie der Runde in einer Zeile: Uhrzeit, Paarung, Stand und ihr
// Anlass. Im Blatt öffnet die Zeile das Blatt der Partie.
function _spRundeZeile(mid, i, imBlatt){
  const m = _spMatch(mid);
  if(!m) return '';
  const aw = m.winner === 'A';
  const t = (ids, w) => `<span class="sp-rd-t${w ? ' w' : ''}">${_spChips(ids)}</span>`;
  let an = '';
  try { const k = _spKarteDerPartie(mid); an = k ? _spAnlass(k).key : ''; } catch(e){ an = ''; }
  const a = SP_ANLASS[an];
  return `<div class="sp-rd-p" style="--i:${i}"${imBlatt ? ` data-mid="${esc(mid)}"` : ''}><span class="sp-rd-u num">${datumFmt(mts(m), 'uhr')}</span>${t(_spTeam(m, 'A'), aw)}`
    + `<b class="num">${_spStand({sa:m.score_a, sb:m.score_b, aw})}</b>${t(_spTeam(m, 'B'), !aw)}`
    + (a && a.kurz ? `<span class="sp-rd-a">${svgI(a.ic)}<span>${esc(a.kurz)}</span></span>` : '<span></span>')
    + `</div>`;
}
// Die Karte ist eine ZUSAMMENFASSUNG, und sie sagt es. Sie trug die Tabelle,
// die Schlagzeile und darunter jede Partie als Zeile mit vier Wappen — und
// genau diese Partien stehen direkt darunter als eigene Karten: wer scrollte,
// las jedes Spiel zweimal, und was die Runde ist, stand nirgends. Jetzt nennt
// eine Kennzeile, was hier zusammengefasst wird, die Tabelle steht als eine
// Reihe aus vier Feldern, und die Partien nur noch als Streifen aus Uhrzeit und
// Stand — die Wappen und den Anlass trägt jede Partie auf ihrer eigenen Karte.
// Die Fläche ist leiser und ohne Schein: die Karte erzählt nichts Neues,
// sie bündelt. Das Motiv bleibt — jede Karte trägt ihres [§C27]. Das Blatt
// zeigt alles.
// Die Tabelle der Runde in einer Reihe: vier Felder, der Sieger vorn. Ein
// Name steht nur, wenn er in ein Viertel der Breite passt [§C33]; sonst
// nennt die Kennzeile darüber alle vier.
function _spRundeKurz(sp){
  if(!sp || sp.length < 2) return '';
  const allein = sp[0].w > sp[1].w;
  const namen = _spPasst(sp.map(x => x.id), 9);
  return `<div class="sp-rq">${sp.map((x, i) => `<div class="sp-rq-f${i === 0 && allein ? ' erst' : ''}" style="--i:${i}">`
    + `${_spChip(x.id)}${namen ? `<span class="sp-rq-n">${esc(_spName(x.id))}</span>` : ''}`
    + `<span class="sp-rq-wl num">${_spZahl(x.w)}:${_spZahl(x.l)}</span>`
    + `<em class="num ${x.e >= 0 ? 'g' : 'r'}">${_spVz(x.e)}</em></div>`).join('')}</div>`;
}
function _spRundeStreifen(ids){
  return `<div class="sp-rs">${ids.map((mid, i) => {
    const m = _spMatch(mid);
    if(!m) return '';
    const hoch = Math.max(m.score_a, m.score_b), tief = Math.min(m.score_a, m.score_b);
    return `<span class="sp-rs-z" style="--i:${i}"><i class="num">${datumFmt(mts(m), 'uhr')}</i><b class="num">${_spZahl(hoch)}:${_spZahl(tief)}</b></span>`;
  }).join('')}</div>`;
}
function _newsRundeHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const ps = d.matchIds || [];
  const ids = (d.spieler || []).map(x => x.id);
  return `<div class="nf-card nf-s-spiel nf-runde nfc-${esc(s.cat || 'fun')}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('spiel', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('users')}</i><b>DIE RUNDE</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    <div class="sp-rd-was">Zusammenfassung von ${_spZahl(ps.length)} Partien am Stück, nur ${esc(_namenListe(ids.map(_spName)))}</div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div><div class="nf-d">${_newsBetont(s.desc || '')}</div></div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    ${_spRundeKurz(d.spieler || [])}${_spRundeStreifen(ps)}${fadenHtml || ''}</div>`;
}
// Das Blatt der Runde: die Tabelle, wer mit wem an welcher Stange stand, und
// jede Partie mit ihrer Uhrzeit. Die Aufstellung ist eine Matrix — eine
// Spalte je Partie, eine Zeile je Spieler —, in Blöcken zu acht:
// dreiundzwanzig Spalten wären auf einem Telefon Striche.
function _newsRundeBlatt(s){
  const d = s.dataRef || {};
  const ps = (d.matchIds || []).map(_spMatch).filter(Boolean);
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
  // Die Zeilen stehen in derselben Folge wie die Tabelle darüber, mit
  // Gesicht. Eine Legende („Von oben nach unten: … S steht für Sturm, A für
  // Abwehr, grün für gewonnen …") erklärte die Zeichnung, statt sie zu zeigen.
  return `<div class="nd-section">Die Tabelle der Runde</div>${_spRundeTafel(d.spieler)}`
    + `<div class="nd-section">Wer mit wem</div><div class="sp-rms">${matrix}</div>`
    + `<div class="nd-section">Die Partien</div><div class="sp-rd-ps nd-rd">${(d.matchIds || []).map((mid, i) => _spRundeZeile(mid, i, true)).join('')}</div>`;
}
