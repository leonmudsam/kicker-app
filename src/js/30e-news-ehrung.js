// ╔═══ §11.6f ─── DIE EHRUNG ──────────────────────────────────────────╗
//     Welche Auszeichnungen nach einer Runde von Partien verdient wurden,
//     von wem, und was jede davon genau diesem Spieler an Prestige bringt.
//     Eine Auszeichnung stand bisher nur an ihrer Partie, und gewöhnliche
//     nur an runden Marken (die fünfte, die zehnte): wer an einem Nachmittag
//     elf holte, erfuhr von zwei. Was sie fürs Prestige wert waren, stand
//     nirgends — die Ewige Tafel zählt Rekorde und Chroniken, nicht
//     Auszeichnungen.
//
//     Die Karte entsteht zwei Stunden nach der letzten Partie, wenn keine
//     mehr dazukam (`EHRUNG_PAUSE_MS`), und erzählt alles seit der Karte
//     davor. Partien mit weniger als zwei Stunden Abstand gehören zu einer
//     Karte: 13:44 und 15:40 ergeben eine um 17:40; 13:02 und 15:30 zwei,
//     um 15:02 und um 17:30.
//
//     Was der Schluss eines Tages vergibt, trägt die Karte seines Spielers
//     des Tages (`_ehrungTagesSchluss`, [§11.0e]): Unschlagbar und
//     Comeback-Tag stehen dort und in keiner Ehrung einer Runde (`getragen`);
//     nur an einem Tag ohne Spieler des Tages kommen sie in der nächsten
//     Runde an. Woche und Monat haben ihre eigene Ehrung (`_newsZeitraum-
//     Ehrungen`): alle Auszeichnungen des Zeitraums, wie im Rückblick, direkt
//     unter dessen Karte.
//
//     Der Wert je Auszeichnung ist ihr Teilwert beim wievielten Mal
//     (`auszeichnungsTeilwert`): das erste und zweite Mal voll, danach eine
//     Stufe weniger [§C34]. Dieselbe Rechnung trägt die Laufbahn.
// ╚══════════════════════════════════════════════════════════════════════╝
const EHRUNG_PAUSE_MS = 2 * 3600e3;

// Eine Karte je abgeschlossener Runde im Fenster des Feeds. Die Grenzen
// werden über ALLE Partien gezogen: sonst begänne die erste Runde im
// Fenster bei null und nähme Auszeichnungen von vor zwei Wochen mit.
function _newsEhrungStories(nowMs, getragen){
  const out = [];
  const ms = (matches || []).slice().sort((a, b) => mts(a) - mts(b));
  if(!ms.length) return out;
  const ende = [], letzte = [];
  ms.forEach((m, i) => {
    const t = mts(m), n = i + 1 < ms.length ? mts(ms[i + 1]) : Infinity;
    if(n - t >= EHRUNG_PAUSE_MS){ ende.push(t + EHRUNG_PAUSE_MS); letzte.push(m); }
  });
  // Jede Verleihung mit ihrem Rang über die ganze Laufbahn: der wievielte
  // Erfolg es ist, entscheidet über seinen Wert. Zwei Partien können dieselbe
  // Sekunde tragen, deshalb zählt die Partie, nicht der Zeitstempel.
  const bMap = getBadgeEarnedCache();
  const mVon = new Map(ms.map(m => [m.id, m]));
  const zeiten = {}, ev = [];
  Object.keys(bMap).forEach(mid => {
    const m = mVon.get(mid);
    if(!m) return;
    const t = mts(m);
    (bMap[mid] || []).forEach(e => {
      const k = e.playerId + '|' + e.badge.id;
      (zeiten[k] = zeiten[k] || []).push({t, mid});
      const te = e.meta && e.meta.tagEnde;
      let wann = t;
      if(te){ const d = new Date(te + 'T00:00:00'); d.setHours(23, 57, 0, 0); wann = d.getTime(); }
      // Was den ganzen Tag beschreibt, trägt die Karte des Spielers des
      // Tages. Es stand in der nächsten Ehrung danach, oft der einer Runde
      // Tage später: Julians Unschlagbar vom 11.06. kam so in einer Karte
      // vom 15.06. an. Gezählt ist es oben schon: der Rang der nächsten
      // hängt daran.
      if(te && getragen && getragen.has(te + '|' + e.playerId + '|' + e.badge.id)) return;
      ev.push({pid:e.playerId, badge:e.badge, mid, t, wann});
    });
  });
  Object.keys(zeiten).forEach(k => zeiten[k].sort((a, b) => a.t - b.t));
  const rang = e => {
    const l = zeiten[e.pid + '|' + e.badge.id] || [];
    const i = l.findIndex(x => x.mid === e.mid);
    return i < 0 ? l.length : i + 1;
  };
  // Jede Verleihung gehört zu der ersten Karte, die nach ihr entsteht.
  const fenster = ende.map(() => []);
  ev.forEach(e => {
    let lo = 0, hi = ende.length;
    while(lo < hi){ const h = (lo + hi) >> 1; if(ende[h] > e.wann) hi = h; else lo = h + 1; }
    if(lo < ende.length) fenster[lo].push(e);
  });
  const seit = nowMs - NEWS_FENSTER_TAGE * 864e5;
  ende.forEach((T, i) => {
    if(T > nowMs || T < seit) return;
    const st = _newsEhrungStory(fenster[i], T, letzte[i], rang);
    if(st) out.push(st);
  });
  return out;
}

function _newsEhrungStory(liste, T, letzteM, rang){
  if(!liste.length) return null;
  const je = {};
  liste.forEach(e => {
    // Ein Zeitraum: wer darin gespielt hat, steht darin [§C40].
    if(!sichtbar(e.pid)) return;
    const n = rang(e);
    const p = auszeichnungsTeilwert(e.badge.id, n);
    // Was kein Prestige gibt, steht nicht in einer Ehrung: die Schattenseiten
    // meldet der Feed nicht [§C33].
    if(!(p > 0)) return;
    const j = je[e.pid] || (je[e.pid] = {pid:e.pid, summe:0, posten:{}});
    const q = j.posten[e.badge.id] || (j.posten[e.badge.id] =
      {id:e.badge.id, name:e.badge.name, ic:e.badge.ic, klasse:rarityOf(e.badge.id), mal:0, bis:0, p:0});
    q.mal++; q.bis = Math.max(q.bis, n); q.p += p; j.summe += p;
  });
  return _ehrungKarte(Object.values(je).map(j => ({pid:j.pid, summe:j.summe, posten:Object.values(j.posten)})),
    'ehrung_' + letzteM.id, T, {ab:Math.min(...liste.map(e => e.t)), bis:mts(letzteM)});
}

// Die Geehrten in ihrer Reihenfolge: je Spieler seine Posten (`{id, name,
// ic, klasse, mal, bis, p}`), die seltenste Klasse zuerst, darin der höchste
// Wert; die Spieler nach ihrer Summe. Für die Karte einer Runde, eines
// Zeitraums und die Zeilen unter dem Spieler des Tages dieselbe Ordnung.
const EH_ORD = {legendary:0, rare:1, common:2};
function _ehrungSpieler(roh){
  const r1 = x => Math.round(x * 10) / 10;
  return (roh || []).filter(j => j && j.summe > 0).map(j => ({pid:j.pid, summe:r1(j.summe),
    posten:j.posten.map(q => Object.assign({}, q, {p:r1(q.p)}))
      .sort((a, b) => (EH_ORD[a.klasse] - EH_ORD[b.klasse]) || (b.p - a.p) || a.name.localeCompare(b.name, 'de'))}))
    .sort((a, b) => (b.summe - a.summe) || pname(a.pid).localeCompare(pname(b.pid), 'de'));
}

// Die Karte aus den Geehrten. `ref` trägt, woher sie kommen — `ab` und
// `bis` einer Runde oder `periode` mit Woche oder Monat (nicht `schluss`:
// so heißt bei der Zeichen-Karte der Schluss, der sie auslöste).
function _ehrungKarte(roh, id, T, ref){
  const nm = pid => pname(pid);
  const spieler = _ehrungSpieler(roh);
  if(!spieler.length) return null;
  const zahl = spieler.reduce((n, x) => n + x.posten.reduce((m, q) => m + q.mal, 0), 0);
  const gesamt = Math.round(spieler.reduce((n, x) => n + x.summe, 0));
  // Ein Monat ehrt bis zu zwölf: „256 Auszeichnungen für Leon, Leo, Maxi,
  // Julian, Stefan …" wäre eine Zeile Namen, die die Säulen darüber schon
  // zeigen. Ab vier steht die Zahl.
  const wer = ref && ref.periode && spieler.length > 3 ? spieler.length + ' Spieler' : _namenKurz(spieler.map(x => nm(x.pid)));
  const title = (zahl === 1 ? 'Eine Auszeichnung' : zahl + ' Auszeichnungen') + ' für ' + wer;
  // Der Satz nennt die wertvollste Auszeichnung der Runde: die seltenste
  // Klasse, darin der höchste Wert. Die Summe nannte er nur, wenn nichts
  // Seltenes dabei war — und dieselbe Zahl stand im Fuß der Karte, je
  // Klasse. Ohne Doppelpunkt: das Blatt kürzt einen Satz mit Etikett auf
  // seinen Rest (`_ndLead`), und „Darunter eine seltene: …" stand dort als
  // Satzrest ohne Verb.
  let top = null;
  spieler.forEach(x => x.posten.forEach(q => {
    if(!top || EH_ORD[q.klasse] < EH_ORD[top.q.klasse] || (q.klasse === top.q.klasse && q.p > top.q.p))
      top = {pid:x.pid, q};
  }));
  const klasse = {legendary:', eine legendäre Auszeichnung', rare:', eine seltene Auszeichnung'}[top.q.klasse] || '';
  // Das wievielte Mal als Ziffer, wie im Blatt darunter („1. Mal"): mit
  // „zum ersten Mal" stand im Satz keine Zahl, und Prestige soll er nicht
  // nennen — das steht bei den Klassen.
  const desc = `${nm(top.pid)} holt dabei „${top.q.name}“ zum ${top.q.bis}. Mal${klasse}.`;
  return {
    id, cat:'badge', ic:'medal', when:new Date(T),
    prio:STORY_PRIO.ehrung, title, desc,
    dataRef:Object.assign({type:'ehrung', playerIds:spieler.map(x => x.pid), spieler, zahl, gesamt}, ref)
  };
}

// ── Was ein Schluss vergibt ─────────────────────────────────────────
// Manche Auszeichnung entsteht ohne Partie: mit dem Schluss des Tages um
// 23:59 der Spieler des Tages und, was den ganzen Tag beschreibt
// (Unschlagbar, Comeback-Tag), dazu Allwetter, Tag der Götter und der
// Award-Sammler, die an ihm hängen; mit dem Schluss der Woche am Montag um
// 00:00 der Spieler der Woche und wieder der Award-Sammler; mit dem Schluss
// des Monats Meister, Vize-Meister, Team der Saison und Untouchable.
// Welche Auszeichnung welcher Schluss vergeben kann, steht hier fest;
// `tests/ambient` rechnet an allen Schlüssen der echten Partien nach, dass
// keine fehlt. Über alle Auszeichnungen zu zählen kostete je Schluss das
// Zehnfache. Eine Schattenseite bringt kein Prestige und steht in keiner
// Ehrung (Schwarzer Tag, Zusammenbruch).
const EHRUNG_SCHLUSS = {
  tag:['potd', 'unbeatable', 'godly_streak', 'allwetter', 'comeback_day', 'award_collector'],
  woche:['potw', 'award_collector'],
  monat:['champion', 'vice_champion', 'team_of_season', 'untouchable']
};
// Was die Karte des Schlusses selbst als Schlagzeile trägt: der Spieler des
// Tages, der Woche, das Podest des Monats. Eine legendäre Auszeichnung
// daneben, die der Schluss vergab, macht die Karte zum Breaking [§C33] —
// sie hat sonst keine eigene; diese nicht, sonst stünde jeder Monat zweimal
// oben.
const EHRUNG_KOPF = new Set(['potd', 'potw', 'champion', 'vice_champion', 'team_of_season']);
const _ehrungBrichtVor = sp => (sp || []).some(x => ((x && x.posten) || [])
  .some(q => q && q.klasse === 'legendary' && !EHRUNG_KOPF.has(q.id)));

// Gezählt wird mit der Auszeichnung selbst (`count` mit Schnitt), eine
// Millisekunde vor dem Schluss gegen den Schluss: was dazwischen dazukam,
// hat er gebracht. Ein Zeitraum: wer darin stand, steht darin [§C40].
// `schon` sind die Verleihungen ('Spieler|Auszeichnung|wievieltes Mal'),
// die eine gespeicherte Ehrung schon nennt: eine Karte ist ein Snapshot
// [§C33], und was eine ältere Fassung in eine Runde legte, stünde sonst
// zweimal da.
function _ehrungSchlussPosten(schlussMs, ids, schon){
  const vor = schlussMs - 1, msA = _partienBis(vor), msB = _partienBis(schlussMs);
  const je = {};
  BADGES.forEach(b => {
    if(!ids.includes(b.id)) return;
    const klasse = rarityOf(b.id);
    (players || []).forEach(p => {
      if(!sichtbar(p)) return;
      let a = 0, n = 0;
      try { a = b.count(p.id, msA, vor) || 0; n = b.count(p.id, msB, schlussMs) || 0; } catch(e){ return; }
      if(!(n > a)) return;
      let wert = 0, mal = 0;
      for(let i = a + 1; i <= n; i++){
        if(schon && schon.has(p.id + '|' + b.id + '|' + i)) continue;
        wert += auszeichnungsTeilwert(b.id, i); mal++;
      }
      if(!(wert > 0)) return;
      const j = je[p.id] || (je[p.id] = {pid:p.id, summe:0, posten:[]});
      j.posten.push({id:b.id, name:b.name, ic:b.ic, klasse, mal, bis:n, p:wert});
      j.summe += wert;
    });
  });
  return Object.values(je);
}
// Was gespeicherte Ehrungen einer Runde schon nennen, je 'Spieler|
// Auszeichnung|wievieltes Mal'.
function _ehrungSchonGenannt(bestand){
  const schon = new Set();
  (Array.isArray(bestand) ? bestand : []).forEach(st => {
    const d = (st && st.dataRef) || {};
    if(d.type !== 'ehrung' || d.periode) return;
    (d.spieler || []).forEach(x => ((x && x.posten) || []).forEach(q => {
      for(let i = (q.bis | 0) - (q.mal | 0) + 1; i <= (q.bis | 0); i++) schon.add(x.pid + '|' + q.id + '|' + i);
    }));
  });
  return schon;
}

// ── Der Schluss eines Tages: eine Erweiterung des Spielers des Tages ──
// Eine eigene Karte je Tag stand direkt neben dem Spieler des Tages und
// nannte ihn ein zweites Mal; die Liga wollte sie dort, wo der Tag schon
// seine Karte hat. `rep` ist 23:59 des Tages, der Schluss.
function _ehrungTagesSchluss(rep, schon){
  return _ehrungSpieler(_ehrungSchlussPosten(rep, EHRUNG_SCHLUSS.tag, schon));
}

// ── Die Ehrung einer Woche und eines Monats ────────────────────────────
// Alle Auszeichnungen des Zeitraums, aus denselben zwei Ständen wie die
// Säulen seines Rückblicks (`rcpLaufbahnDaten`, `rcpWocheLaufbahn`) [§C27]:
// die Karte heißt „Geholt im Oktober 2026", also gehört alles hinein, was
// im Oktober geholt wurde, nicht nur, was die letzte Millisekunde vergab.
// Nur das zeigte die Ehrung des Schlusses, und neben dem Rückblick, der 256
// Auszeichnungen zählte, standen dort vier.
//
// Sie steht direkt unter der Karte ihres Zeitraums, zur selben Zeit: die
// Woche am Sonntag um 23:59:05 unter der Wochenkarte, der Monat am Ersten
// um 00:00 unter seinem Rückblick. Bei gleicher Zeit steht die wichtigere
// oben (`_storyFolge`). Vorher stand die Ehrung des Monats um 00:01 über
// dem Rückblick und die der Woche um 23:57 unter dem Spieler des Sonntags.
//
// Breaking ist sie nur, wenn der Schluss selbst eine legendäre Auszeichnung
// vergab, die keine Schlagzeile ist (der Award-Sammler am Montag): die
// legendären aus Partien hatten ihre eigene Karte, und der Monat ist es mit
// seinem Rückblick schon.
function _newsZeitraumEhrungen(nowMs){
  const out = [], seit = nowMs - NEWS_FENSTER_TAGE * 864e5;
  const wochen = new Set(), monate = new Set();
  (matches || []).forEach(m => {
    const t = mts(m);
    if(t > nowMs || t < seit - 31 * 864e5) return;
    wochen.add(wochenBeginn(new Date(t)).getTime());
    const s = seasonOf(m.created_at);
    if(s && s.id) monate.add(s.id);
  });
  const roh = daten => daten.map(x => ({pid:x.pid, summe:x.posten.reduce((n, q) => n + q.p, 0), posten:x.posten}));
  wochen.forEach(ab => {
    const ende = new Date(ab); ende.setDate(ende.getDate() + 7);
    const S = ende.getTime();
    if(S > nowMs || S < seit) return;
    const zu = _ehrungSpieler(_ehrungSchlussPosten(S, EHRUNG_SCHLUSS.woche));
    const st = _ehrungKarte(roh(rcpWocheLaufbahn(ab, S - 1)), 'ehrung_der_woche_' + tagKey(ab), S - 60000 + 5000,
      {periode:'woche', woche:tagKey(ab), von:ab, bis:S - 1, breaking:_ehrungBrichtVor(zu)});
    if(st) out.push(st);
  });
  monate.forEach(sid => {
    const S = seasonEnd(sid).getTime();
    if(S + 1 > nowMs || S + 1 < seit) return;
    const st = _ehrungKarte(roh(rcpLaufbahnDaten(seasonStart(sid).getTime(), S)), 'ehrung_des_monats_' + sid, S + 1,
      {periode:'monat', sid, breaking:false});
    if(st) out.push(st);
  });
  return out.sort((a, b) => a.when - b.when);
}

// Der Ton einer Klasse, wie überall: Gold legendär, Violett selten, Grün
// gewöhnlich [§C25].
function _ehrungTon(k){ return k === 'legendary' ? 'gold' : k === 'rare' ? 'viol' : 'gruen'; }
const EH_KLASSEN = [['legendary', 'legendär'], ['rare', 'selten'], ['common', 'gewöhnlich']];
const _ehZahl = v => komma(Math.round(v * 10) / 10).replace(',0', '');

// ── Die Säulen ──────────────────────────────────────────────────────
// Je Geehrtem eine Säule, wie im Säulenbild eines Spieltags: unten sein
// Wappen, Insignium und Gesicht wie in der Rangliste [§C27], darüber die Säule, so hoch wie das Prestige seiner Auszeichnungen
// gegen den, der am meisten bekam, darauf die Zahl und die Zeichenkachel
// seiner wertvollsten Auszeichnung [§C27]. Die Säule ist aus den
// Auszeichnungen gestapelt, die Seltenste oben, in der Farbe ihrer Klasse
// [§C25]: jede seltene und legendäre ein eigenes Stück, die gewöhnlichen
// zusammen eins — man sieht, woher das Prestige kommt, ohne eine Zahl je
// Auszeichnung. Auf der Karte stand vorher das Prestige je Spieler in Chips
// wie auf der Ewigen Tafel: dieselbe Form für eine andere Zahl las sich als
// dieselbe Nachricht. Ein Entwurf hängte Bänder mit Medaillen darunter —
// eine Zeichnung, die es sonst nirgends in der App gibt.
// `gross` ist das Blatt: dort steht der Name unter dem Gesicht. `o.still`
// lässt das Lauflicht der legendären weg: im Rückblick stehen Säulen,
// Podest und Wappen untereinander, und ein Licht je Säule wäre dort
// Schimmer ohne Aussage.
function _ehrungSaeulen(sp, gross, o){
  o = o || {};
  const pm = pmap();
  const da = sp.filter(x => pm[x.pid] && x.summe > 0);
  if(!da.length) return '';
  // Ein Wappen braucht 48 px, darunter bleibt nur das Gesicht
  // (`insAvWrap`). Die Karte ist im Feed bei 360 px nur 287 px breit: in
  // einer Reihe stehen höchstens fünf, im Blatt mit den Namen darunter vier;
  // wer mehr ehrt, teilt die Säulen auf gleich lange Reihen, die vorderen
  // für die mit dem meisten Prestige. Auf schmaleren Telefonen werden die
  // Wappen über die Breite der Bühne kleiner (`--je`, CSS), statt dass eine
  // Säule allein in die nächste Reihe bricht. Vorher standen auf der Karte
  // nackte Gesichter von 30 px — ohne das Insignium, das sie überall sonst
  // tragen.
  const WAPPEN = gross ? 52 : 48, JE_REIHE = gross ? 4 : 5;
  const reihen = Math.ceil(da.length / JE_REIHE), breite = Math.ceil(da.length / reihen);
  // Gleich lang heißt: um höchstens eine Säule verschieden, die längeren
  // vorn. Ein Umbruch nach je `breite` Säulen ließ zehn Geehrte einer Woche
  // als 4 + 4 + 2 stehen und dreizehn als 4 + 4 + 4 + 1.
  const schnitt = new Set();
  for(let r = 0, n = 0; r < reihen - 1; r++){
    n += Math.floor(da.length / reihen) + (r < da.length % reihen ? 1 : 0);
    schnitt.add(n);
  }
  const H = gross ? 96 : 52, MIN = 6, max = Math.max(...da.map(x => x.summe));
  let gold = 0;
  const saeule = (x, i) => {
    const h = Math.max(MIN, Math.round(H * x.summe / max));
    const posten = (x.posten || []).filter(q => q.p > 0);
    const gewoehnlich = posten.filter(q => q.klasse === 'common');
    const stuecke = posten.filter(q => q.klasse !== 'common')
      .map(q => ({klasse:q.klasse, p:q.p, name:q.name}))
      .concat(gewoehnlich.length ? [{klasse:'common', p:gewoehnlich.reduce((n, q) => n + q.p, 0),
        name:gewoehnlich.length === 1 ? gewoehnlich[0].name : gewoehnlich.length + ' gewöhnliche'}] : [])
      .map(q => `<i class="${q.klasse}" style="flex-grow:${q.p}" title="${esc(q.name)}"></i>`).join('');
    // Die Kachel zeigt die wertvollste Auszeichnung: die seltenste Klasse,
    // darin der höchste Wert — die Posten sind schon so geordnet.
    const top = posten[0];
    return `<span class="eh-s" data-pid="${esc(x.pid)}" style="--i:${i}">`
      + `<span class="eh-s-z" title="${esc(top ? top.name : '')}">${top ? _ehrungKachel(top, o.still ? null : () => gold++, gross ? '' : 'k') : ''}</span>`
      + `<em class="eh-s-w num">+${_ehZahl(x.summe)}</em>`
      + `<span class="eh-saeule" style="height:${h}px">${stuecke}</span>`
      + `<span class="eh-s-av" title="${esc(pm[x.pid].name)}">${rcpAvHtml(x.pid, WAPPEN, {})}</span>`
      + (gross ? `<b class="eh-s-n">${esc(pm[x.pid].name)}</b>` : '')
      + `</span>`
      // Der Umbruch steht ausdrücklich da: von selbst bräche die Reihe erst
      // am Rand und ließe einen allein in der zweiten.
      + (schnitt.has(i + 1) ? '<span class="eh-umbruch" aria-hidden="true"></span>' : '');
  };
  return `<div class="eh-buehne${gross ? ' gross' : breite >= 5 ? ' voll' : ''}" style="--je:${breite}">${da.map(saeule).join('')}</div>`;
}

// Die Zeichenkachel einer Auszeichnung in der Farbe ihrer Klasse [§C27].
// Eine legendäre trägt das Lauflicht wie im Profil, versetzt von Kachel zu
// Kachel (`naechste` zählt die goldenen einer Ansicht), damit es durch die
// Reihe wandert, statt überall zugleich aufzublitzen. Klein (`k`) überall
// außer auf der Bühne des Blatts. Ohne `naechste` steht sie still.
function _ehrungKachel(q, naechste, groesse){
  const z = zkHtml(q.ic, groesse == null ? 'k' : groesse, _ehrungTon(q.klasse));
  return q.klasse === 'legendary' && naechste ? z.replace(/<\/span>$/, glanzBahn(1 + naechste() * .35) + '</span>') : z;
}

// Die Klassen einer Runde: wie viele Auszeichnungen jeder Klasse und was sie
// zusammen an Prestige brachten. Nur Klassen, die vorkommen.
function _ehrungKlassen(sp){
  const k = {};
  sp.forEach(x => (x.posten || []).forEach(q => {
    const z = k[q.klasse] || (k[q.klasse] = {n:0, p:0});
    z.n += q.mal; z.p += q.p;
  }));
  return EH_KLASSEN.filter(([id]) => k[id] && k[id].p > 0).map(([id, wort]) => ({id, wort, n:k[id].n, p:k[id].p}));
}
const _ehrungKlasseHtml = z => `<span class="eh-k ${z.id}"><i></i><b class="num">${z.n}</b> ${esc(z.wort)}`
  + ` <em class="num">+${_ehZahl(z.p)}</em></span>`;

// Woher die Auszeichnungen einer Ehrung kommen, auf der Karte und im Blatt
// dieselbe Angabe [§C27]. Die Karte trug nur die Uhrzeit, zu der sie
// entstand — zwei Stunden nach der letzten Partie —, und neben „18:04" las
// sich eine Runde von 13:44 bis 15:55 wie eine Ehrung für den Abend. Heute
// und gestern als Wort, weiter zurück das Datum; über Mitternacht steht der
// zweite Tag dabei. `ab` ist die erste Partie, aus der eine Auszeichnung der
// Runde stammt — eine, die erst am Tagesende vergeben wird, kann vom Vortag
// sein.
// Zwei Teile, die zusammen einen Satz ergeben: `vor` sagt, was der Zeitraum
// bedeutet, `wann` nennt ihn. „Partien vom 06.10., 15:12 bis 08.10., 15:10"
// allein sagte nicht, wozu die Zahlen gehören, und vier Ziffern mit
// Doppelpunkt hinter einem Datum lasen sich auch als Ergebnis. Hinter JEDER
// Uhrzeit steht „Uhr": mit einem „Uhr" nur am Ende stand „vom 19.10., 17:17
// bis gestern, 16:04 Uhr" da, und die erste Zahl las sich wieder nicht als
// Uhrzeit. Die Karte setzt beide Teile untereinander, das Blatt
// hintereinander. Innerhalb eines Endes nur feste Leerzeichen, damit der
// Zeitraum nur vor dem „bis" umbricht: umbrochen stand „15:55" allein in
// der zweiten Zeile, getrennt von seinem „bis".
// Die Ehrung einer Woche oder eines Monats nennt den Zeitraum, nicht seine
// Partien: „Geholt in der Woche vom 19.10. bis 25.10.", „Geholt im Oktober
// 2026".
function _ehrungZeitraum(d){
  const jetzt = Date.now();
  const tag = t => tagKey(t) === tagKey(jetzt) ? 'heute'
    : tagKey(t) === gesternKey(jetzt) ? 'gestern' : datumFmt(t, 'tm');
  // Eine gespeicherte Ehrung eines Tages ohne Spieler des Tages, neben dem
  // sie aufgehen könnte (`_consolidateStories`): „Geholt am 22.10.".
  if(d && d.periode === 'tag' && d.tag){
    const w = tag(new Date(d.tag + 'T12:00:00').getTime());
    return /^\d/.test(w) ? {vor:'Geholt am', wann:w} : {vor:'Geholt', wann:w};
  }
  if(d && d.periode === 'woche' && d.von && d.bis)
    return {vor:'Geholt in der Woche', wann:`vom\u00a0${datumFmt(d.von, 'tm')} bis\u00a0${datumFmt(d.bis, 'tm')}`};
  if(d && d.periode === 'monat' && d.sid) return {vor:'Geholt im', wann:seasonLabel(d.sid)};
  if(!d || !d.ab || !d.bis) return null;
  const von = t => { const w = tag(t); return (/^\d/.test(w) ? 'vom' : 'von') + '\u00a0' + w; };
  const uhr = t => '\u00a0' + datumFmt(t, 'uhr') + '\u00a0Uhr';
  if(d.ab === d.bis) return {vor:'Geholt in der Partie', wann:`${von(d.ab)},${uhr(d.ab)}`};
  return {vor:'Geholt in den Partien', wann:`${von(d.ab)},${uhr(d.ab)} bis`
    + (tagKey(d.ab) === tagKey(d.bis) ? '' : '\u00a0' + tag(d.bis) + ',') + uhr(d.bis)};
}

// Die Karte: die Säulen als Bühne, darunter die Schlagzeile und, leise,
// aus welchen Partien die Auszeichnungen stammen. Ein Satz nannte das
// Seltenste, und im Fuß stand, was jede Klasse gebracht hat — beides
// Zusatztext unter einem Bild, das die Säulen, ihre Zeichenkachel und ihr
// Prestige schon zeigt, wie bei der Insignium-Karte. Satz, Klassen und was
// jeder genau geholt hat, stehen im Blatt. Mit einer legendären
// Auszeichnung trägt die Karte den Schimmer des Seltenen, wie eine einzelne
// seltene Auszeichnung im Feed [§C25]; eine seltene allein reicht nicht,
// sie steht in fast jeder Ehrung.
function _newsEhrungHtml(s, isRead, fadenHtml){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const zr = _ehrungZeitraum(d);
  if(d.periode === 'woche' || d.periode === 'monat') return _newsEhrungZeitraumHtml(s, d, sp, zr, isRead, fadenHtml);
  const glanz = sp.some(x => (x.posten || []).some(q => q.klasse === 'legendary'));
  return `<div class="nf-card nf-s-badge nf-ehrung nfc-badge${glanz ? ' nf-glanz' : ''}${isRead ? ' read' : ''}" data-sid="${esc(s.id)}"`
    + `${glanz ? ` style="--gv:${_newsGlanzVersatz(s.id)}s"` : ''}>
    ${_newsMotiv('badge', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI('medal')}</i><b>DIE EHRUNG</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    ${_ehrungSaeulen(sp, false)}
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${zr ? `<div class="eh-zr"><span class="eh-zr-k">${esc(zr.vor)}</span> <span class="eh-zr-t">${esc(zr.wann)}</span></div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span></div>${fadenHtml || ''}</div>`;
}

// ── Die Karte einer Woche und eines Monats ─────────────────────────────
// Sie steht unter der Karte ihres Zeitraums und sieht aus wie ein Teil von
// ihr, nicht wie eine Runde: Gold, die Farbe von Wochenkarte und
// Meisterbühne, statt des Violetts der Ehrung einer Runde; die Rubrik sagt,
// wessen Ehrung es ist. Oben stehen Schlagzeile und Zeitraum, darunter
// dieselben Säulen mit Namen wie im Rückblick und, was jede Klasse brachte
// [§C27] — eine Runde zeigt beides nur im Blatt, ein Zeitraum ist eine
// Bilanz, und die ist die Nachricht. Ohne Schimmer: ein Monat trägt fast
// immer eine legendäre, und der Rückblick darüber leuchtet schon.
function _newsEhrungZeitraumHtml(s, d, sp, zr, isRead, fadenHtml){
  const klassen = _ehrungKlassen(sp);
  const monat = d.periode === 'monat';
  return `<div class="nf-card nf-s-badge nf-ehrung nf-ehrung-zr zr-${monat ? 'monat' : 'woche'} nfc-badge${isRead ? ' read' : ''}" data-sid="${esc(s.id)}">
    ${_newsMotiv('badge', s)}
    <div class="nf-top"><span class="nf-rub"><i>${svgI(monat ? 'crown' : 'weekKing')}</i><b>${monat ? 'EHRUNG DES MONATS' : 'EHRUNG DER WOCHE'}</b></span>
      <span class="nf-when">${svgI('clock')}${esc(_newsUhrzeit(s.when))}${isRead ? '' : '<span class="nf-dot"></span>'}</span></div>
    <div class="nf-gr"><div class="nf-gr-r"><div class="nf-h">${esc(s.title)}</div>${zr ? `<div class="eh-zr"><span class="eh-zr-k">${esc(zr.vor)}</span> <span class="eh-zr-t">${esc(zr.wann)}</span></div>` : ''}</div>
      <span class="nf-chev">${svgI('chevron')}</span></div>
    ${_ehrungSaeulen(sp, true)}
    ${klassen.length ? `<div class="eh-fuss">${klassen.map(_ehrungKlasseHtml).join('')}</div>` : ''}${fadenHtml || ''}</div>`;
}

// ── Unter dem Spieler des Tages: was der Schluss des Tages vergab ──────
// Je Geehrtem eine Zeile: Gesicht, Name, darunter die Namen seiner
// Auszeichnungen, rechts ihre Zeichenkacheln in der Farbe ihrer Klasse und
// sein Prestige daraus [§C25]. Kein zweites Säulenbild: die Karte zeigt den
// Tag schon als Bahn. Das Blatt zeigt statt dieser Zeilen die Kästen der
// Ehrung (`_ehrungBloeckeHtml`).
function _ehrungTagHtml(sp){
  const pm = pmap();
  const l = (Array.isArray(sp) ? sp : []).filter(x => x && pm[x.pid] && x.summe > 0);
  if(!l.length) return '';
  const summe = l.reduce((n, x) => n + x.summe, 0);
  return `<div class="nf-eht"><div class="nf-eht-k"><i>${svgI('medal')}</i>`
    + `<span>Ehrung des Tages</span><b class="num">+${_ehZahl(summe)}</b></div>`
    + l.map(x => `<div class="nf-eht-z">${_spChip(x.pid)}`
      + `<span class="nf-eht-t"><b>${esc(_spName(x.pid))}</b><small>${esc(x.posten.map(q => q.name + (q.mal > 1 ? ' ×' + q.mal : '')).join(' · '))}</small></span>`
      + `<span class="nf-eht-a">${x.posten.map(q => zkHtml(q.ic, 'k', _ehrungTon(q.klasse))).join('')}</span>`
      + `<b class="num">+${_ehZahl(x.summe)}</b></div>`).join('')
    + `</div>`;
}

// ── Das Blatt ───────────────────────────────────────────────────────
// Oben dieselben Säulen groß, mit Namen. Darunter die Summe der Runde und,
// was jede Klasse dazu beitrug, als geteilter Balken; dann je Spieler jede
// Auszeichnung mit dem wievielten Mal und ihrem Wert. Unter jeder ein
// Strich, wie viel vom vollen Wert sie beim wievielten Mal noch bringt: das
// erklärte vorher nur ein Satz am Ende, gesehen hat es niemand.
//
// Seltene und legendäre stehen als eigene Zeile, die gewöhnlichen als
// Kacheln in zwei Spalten. Je eine Zeile für jede machte das Blatt einer
// Runde mit 35 Auszeichnungen fünf Bildschirme lang, und die Pflichterfüller
// und Zittersiege standen so groß da wie die „Nerven aus Stahl".
function _ndEhrungBlatt(s){
  const d = s.dataRef || {};
  const sp = Array.isArray(d.spieler) ? d.spieler : [];
  const pm = pmap();
  if(!sp.some(x => pm[x.pid])) return null;
  const kopf = `<div class="nd-buehne nd-eh">${_ehrungSaeulen(sp, true)}</div>`;
  const klassen = _ehrungKlassen(sp);
  const summe = klassen.reduce((n, z) => n + z.p, 0);
  const anteil = klassen.length ? `<div class="eh-anteil">`
    + `<div class="eh-anteil-k"><b class="num">+${_ehZahl(summe)}</b><span>Prestige für die Laufbahn</span></div>`
    + `<div class="eh-anteil-b">${klassen.map(z => `<i class="${z.id}" style="flex-grow:${z.p}"></i>`).join('')}</div>`
    + `<div class="eh-anteil-l">${klassen.map(_ehrungKlasseHtml).join('')}</div></div>` : '';
  const zeit = _ehrungZeitraum(d);
  // Ein Datum trägt seinen Punkt schon: „Geholt am 22.10.." stand doppelt.
  return {kopf, mitte: anteil + (zeit ? `<div class="nw-hinweis eh-zeit">${esc(zeit.vor + ' ' + zeit.wann)}${/\.$/.test(zeit.wann) ? '' : '.'}</div>` : '')
    + `<div class="nd-section">Wer was geholt hat</div>${_ehrungBloeckeHtml(sp)}`
    + `<div class="nw-hinweis">Das erste und zweite Mal zählt eine Auszeichnung voll, danach etwas weniger. `
    + `Der Strich unter jeder zeigt, wie viel vom vollen Wert bleibt.</div>`};
}
// Je Spieler sein Kasten, im Blatt einer Ehrung und unter dem Spieler des
// Tages derselbe [§C27].
function _ehrungBloeckeHtml(sp){
  const pm = pmap();
  const mal = q => q.mal === 1 ? `${q.bis}. Mal` : `${q.bis - q.mal + 1}.–${q.bis}. Mal`;
  // Der volle Wert ist, was dieselbe Auszeichnung beim ersten Mal bringt,
  // so oft genommen, wie sie diesmal kam.
  const voll = q => auszeichnungsTeilwert(q.id, 1) * q.mal;
  const rest = q => { const v = voll(q); return v > 0 ? Math.min(1, q.p / v) : 1; };
  const strich = q => `<span class="eh-q-m" role="img" aria-label="${Math.round(rest(q) * 100)} % des vollen Werts">`
    + `<i style="width:${(rest(q) * 100).toFixed(1)}%"></i></span>`;
  let gold = 0;
  const zeile = q => `<div class="eh-q ${esc(q.klasse)}">${_ehrungKachel(q, () => gold++)}
      <span class="eh-q-t"><b>${esc(q.name)}</b><small>${esc(_newsRarityLabel(q.klasse))} · ${esc(mal(q))}</small>${strich(q)}</span>
      <em class="num">+${_ehZahl(q.p)}<small>von ${_ehZahl(voll(q))}</small></em></div>`;
  // Oben die Zeichenkachel und der Wert, darunter der Name über die ganze
  // Breite: neben Zeichen und Wert brach „Pflichterfüller" mitten im Wort.
  const kachel = q => `<div class="eh-g-t ${esc(q.klasse)}">`
    + `<span class="eh-g-o">${_ehrungKachel(q, () => gold++)}<em class="num">+${_ehZahl(q.p)}</em></span>`
    + `<b>${esc(q.name)}</b><small>${esc(mal(q))}</small>${strich(q)}</div>`;
  return (Array.isArray(sp) ? sp : []).filter(x => x && pm[x.pid]).map((x, i) => {
    const gross = (x.posten || []).filter(q => q.klasse !== 'common');
    const klein = (x.posten || []).filter(q => q.klasse === 'common');
    return `<div class="eh-p" style="--i:${i}">
      <div class="eh-p-k" data-pid="${esc(x.pid)}" style="cursor:pointer">${rcpAvHtml(x.pid, 30, {})}
        <b>${esc(pm[x.pid].name)}</b><em class="num">+${_ehZahl(x.summe)}</em></div>
      ${gross.map(zeile).join('')}
      ${klein.length ? `<div class="eh-g">${klein.map(kachel).join('')}</div>` : ''}
    </div>`;
  }).join('');
}
