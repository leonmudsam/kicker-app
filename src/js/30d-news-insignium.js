// ─── §11.6e — Die Insignium-Karte des Tages [§C30, §C33] ─────────────
// Eine Karte je Spieltag für die Leiter, neben der Ewigen Tafel: die Tafel
// zeigt, wer Prestige gewinnt und verliert, diese Karte, was das am Zeichen
// ändert — auf der Karte nur das Zeichen, das Prestige erst im Blatt. Gebaut im Generator (`insignium_tag`, 27-news-generator.js), hier
// stehen die Sätze, die Bühne, die Zeilen und das Blatt.

const INS_ORDNUNG = ['erste', 'zweite', 'dritte', 'vierte', 'fünfte', 'sechste', 'siebte'];

// Der Name einer Lage auf der Leiter, wie ihn das Laufbahnblatt schreibt:
// „Zierkranz III", am Ordensstern die Zacken.
function _insLageName(l){
  const ins = INSIGNIEN[(l && l.stufe) | 0];
  if(!ins) return '';
  return ins.key === 'stern' ? `${ins.name} mit ${(l.zacken | 0) || ORDENSSTERN_START} Zacken`
    : `${ins.name} ${INSIGNIUM_GRAD_NAME[(l.grad | 0)] || 'I'}`;
}

// ── Die Sätze der Karte ─────────────────────────────────────────────
// Eine Bewegung: ein ganzer Satz, der sagt, was passiert ist, und darunter,
// was die neue Lage bedeutet. Mehrere: die Schlagzeile als Reihe von
// Etiketten wie bei der Partie [§C33], höchstens drei, die Aufstiege zuerst.
// Gespeichert wird der Text der heutigen Karte bei jedem Lauf neu; die Karte
// eines vergangenen Tages behält ihren.
function _insTagTexte(zuege){
  const pm = pmap(), nm = pid => (pm[pid] && pm[pid].name) || '?';
  const l = (zuege || []).filter(z => z && INSIGNIEN[(z.nach || {}).stufe | 0]);
  if(!l.length) return {title:'', desc:''};
  const satz = z => {
    const n = nm(z.pid), S = INSIGNIEN[z.nach.stufe], vorS = INSIGNIEN[z.vor.stufe];
    const next = INSIGNIEN[z.nach.stufe + 1];
    if(z.art === 'auf') return {
      title: z.wieder ? `${n} trägt wieder den ${S.name}` : `${n} erreicht den ${S.name}`,
      // Was die Stufe in dieser Liga bedeutet: ihr Platz auf der Leiter, wo
      // sie beginnt und wie viele so hoch stehen.
      desc: (`Der ${S.name} ist die ${INS_ORDNUNG[z.nach.stufe] || ''} Stufe der Leiter und beginnt bei ${S.min} Prestige. `
        // Eine alte Einzelzeile kennt die Zahl der Träger nicht und
        // behauptet dann nichts darüber.
        + (z.traeger == null ? '' : (z.traeger | 0) <= 1 ? 'Niemand sonst in der Liga steht so hoch.'
          : `Diese Stufe oder eine höhere tragen jetzt ${z.traeger} von ${z.von} Spielern.`)).trim()};
    if(z.art === 'grad') return {
      title: S.key === 'stern' ? `${n} erreicht die ${z.nach.zacken}. Zacke am Ordensstern`
        : `${n} steigt auf ${_insLageName(z.nach)}`,
      desc: `Mit ${z.nach.punkte} Prestige stand ${n} noch nie so weit oben.`
        + (S.key === 'stern' ? ` Die nächste Zacke kommt bei ${S.min + (z.nach.zacken - ORDENSSTERN_START + 1) * ORDENSSTERN_SCHRITT}.`
          : next ? ` Bis zum ${next.name} fehlen ${Math.max(0, next.min - z.nach.punkte)}.` : '')};
    return {
      title: `${n} fällt auf den ${S.name} zurück`,
      desc: `Nach ${Math.max(0, z.vor.punkte - z.nach.punkte)} Prestige weniger an diesem Tag fehlen bis zum `
        + `${vorS.name} wieder ${Math.max(0, vorS.min - z.nach.punkte)}.`};
  };
  if(l.length === 1) return satz(l[0]);
  // Mehrere: Etiketten mit ihren Leuten, dasselbe Etikett für mehrere einmal.
  const etikett = z => z.art === 'ab' ? 'Rückfall'
    : z.art === 'grad' ? (INSIGNIEN[z.nach.stufe].key === 'stern' ? `${z.nach.zacken}. Zacke` : _insLageName(z.nach))
    : INSIGNIEN[z.nach.stufe].name;
  const reihe = [];
  l.forEach(z => { const e = etikett(z), da = reihe.find(x => x.e === e);
    if(da) da.n.push(nm(z.pid)); else reihe.push({e, n:[nm(z.pid)]}); });
  const teile = reihe.map(x => `${x.e} für ${_namenListe(x.n)}`);
  const weitere = n => n === 1 ? 'eine weitere Bewegung' : `${_zahlwortDe(n)} weitere`;
  let title = teile.length <= 3 ? _namenListe(teile) : `${teile.slice(0, 2).join(', ')} und ${weitere(teile.length - 2)}`;
  if(title.length > 96) title = `${teile[0]} und ${weitere(teile.length - 1)}`;
  return {title:title.charAt(0).toUpperCase() + title.slice(1), desc:satz(l[0]).desc};
}

// ── Die Bühne der Karte ─────────────────────────────────────────────
// Jede Bewegung des Tages als Bild: das Zeichen davor klein und leise, der
// Pfeil, das Zeichen danach groß mit dem Gesicht, darunter die Spur der
// Leiter. Jeder Grad hat seine eigene Zeichnung [§C30], also zeigt die Bühne
// auch einen neuen Grad als Verwandlung.
// Die Karte trägt keine Prestige-Zahl, keinen Satz unter der Schlagzeile und
// keine Zeilen. Gewinn und Verlust standen auf der Tafel-Karte desselben
// Tages und hier ein zweites Mal; der Satz erklärte, was die Spur zeigt; und
// nur die erste Bewegung war ein Bild, die übrigen standen als Text darunter,
// höchstens drei und der Rest als „+1 weitere" [§C33]. Zahl und Satz stehen
// im Blatt.
function _insZeichen(pid, l, bild){
  const ins = INSIGNIEN[(l && l.stufe) | 0];
  if(!ins) return '';
  try { return insigniumStufeSvg(ins.key, (getPlayerRank(pid) || {}).label, l.zacken | 0, l.grad | 0,
    bild ? {bild:true} : undefined) || ''; } catch(e){ return ''; }
}
function _insArtWort(z){
  return z.art === 'ab' ? 'Rückfall' : z.art === 'grad' ? 'Neuer Grad'
    : z.wieder ? 'Wieder erreicht' : 'Neue Stufe';
}
// Ein Feld der Spur je Grad, drei je Stufe. Der Ordensstern zählt danach
// Zacken; auf der Spur steht er in seinem letzten Feld, die Zahl der Zacken
// nennt die Schlagzeile.
function _insSpurPos(l){
  return Math.min(INSIGNIEN.length * INSIGNIUM_GRADE - 1, insigniumPos(l));
}
// ── Die Spur: die ganze Leiter, und wie weit der Tag darauf trägt ────
// Einundzwanzig Felder, drei je Stufe, bei einer einzelnen Bewegung darunter
// die sieben Zeichen. Was schon vorher erreicht war, steht gefüllt, was der
// Tag dazubringt, leuchtet Violett [§C25], was ein Rückfall kostet, steht rot
// gestreift. So sieht man ohne einen Satz, ob ein Grad oder drei Stufen
// dazukamen und wo auf der Leiter das liegt.
function _insSpur(z, mitZeichen){
  const a = _insSpurPos(z.vor), b = _insSpurPos(z.nach), ab = z.art === 'ab';
  const rang = (getPlayerRank(z.pid) || {}).label;
  const feld = i => {
    const k = i === b ? 'da' : ab ? (i < b ? 'hat' : i <= a ? 'weg' : '')
      : (i <= a ? 'hat' : i < b ? 'neu' : '');
    return `<i class="${k}${i === a && a !== b ? ' alt' : ''}"></i>`;
  };
  return `<div class="ni-spur${ab ? ' ab' : ''}${mitZeichen ? '' : ' knapp'}" aria-hidden="true">` + INSIGNIEN.map((ins, s) => {
    let bild = '';
    if(mitZeichen) try { bild = insigniumStufeSvg(ins.key, rang, 0, 0, {bild:true}) || ''; } catch(e){ bild = ''; }
    const lage = s === z.nach.stufe ? ' jetzt' : s === z.vor.stufe ? ' vorher' : s < z.nach.stufe ? ' hat' : '';
    return `<span class="ni-sp-s${lage}"><span class="ni-sp-f">`
      + [0, 1, 2].map(g => feld(s * INSIGNIUM_GRADE + g)).join('')
      + `</span>${mitZeichen ? `<span class="ni-sp-z">${bild}</span>` : ''}</span>`;
  }).join('') + `</div>`;
}
// ── Eine Verwandlung ────────────────────────────────────────────────
// Altes Zeichen, Pfeil, neues Zeichen mit Gesicht. Beim Aufstieg laufen zwei
// Ringe einmal nach außen, UNTER der Zeichnung — über ihr darf nichts
// skalieren [§C30]. Ein Rückfall ist kein Anlass für Bewegung: keine Ringe,
// der Pfeil rot, und am neuen Zeichen ein roter Pfeil nach unten. Ohne ihn
// las sich ein Rückfall vom Zierkranz auf den Volutenkranz wie ein Aufstieg,
// denn das Bild zeigt nur zwei Zeichen hintereinander.
function _insVerwandlung(z, gross){
  const pm = pmap(), ab = z.art === 'ab';
  // Gross zieht der Pfeil eine Spur aus drei Strichen hinter sich her: die
  // Bewegung von einem Zeichen zum anderen, nicht nur ein Verweis.
  const pfeil = gross
    ? `<svg class="ni-pf" viewBox="0 0 48 16" aria-hidden="true"><path class="sp" d="M2 8H8M12 8H18"/><path d="M22 8H42"/><path d="M36 3L43 8L36 13"/></svg>`
    : `<svg class="ni-pf" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 8H19"/><path d="M14 3L20 8L14 13"/></svg>`;
  const wellen = ab ? '' : `<span class="ni-wl" aria-hidden="true"><i></i><i></i></span>`;
  const runter = ab ? `<span class="ni-ru" role="img" aria-label="Rückfall"><svg viewBox="0 0 16 16" aria-hidden="true">`
    + `<path d="M8 3v9.5M3.5 8L8 12.5L12.5 8"/></svg></span>` : '';
  // Klein ist das neue Zeichen ein Bild, gross ein Vektor [§C30].
  return `<div class="ni-sz"><span class="ni-alt">${_insZeichen(z.pid, z.vor, true)}</span>${pfeil}`
    + `<span class="ni-neu">${wellen}${_insZeichen(z.pid, z.nach, !gross)}`
    + `<span class="ni-av">${avHtml(pm[z.pid], '', {px:gross ? 36 : 24})}</span>${runter}</span></div>`;
}
// Eine Bewegung füllt die Bühne mit der Spur samt Zeichen. Mehrere stehen
// als Kacheln nebeneinander, jede mit ihrer Verwandlung, ihrer Spur und dem
// Namen — alle, nicht die erste als Bild und die übrigen als Text. Wort und
// Lage stehen nicht darüber: das sagt die Schlagzeile, und neben zwei
// Zeichen lief „Volutenkranz I" aus der Karte.
function _newsInsTagKopf(s){
  const d = (s && s.dataRef) || {}, pm = pmap();
  const l = (d.zuege || []).filter(z => z && pm[z.pid] && INSIGNIEN[(z.nach || {}).stufe | 0]);
  if(!l.length) return '';
  if(l.length === 1){
    const z = l[0];
    return `<div class="ni-b ni-${esc(z.art)}" data-pid="${esc(z.pid)}">${_insVerwandlung(z, true)}${_insSpur(z, true)}</div>`;
  }
  return `<div class="ni-b ni-viele">${l.map(z =>
    `<div class="ni-k ni-${esc(z.art)}" data-pid="${esc(z.pid)}">${_insVerwandlung(z, false)}${_insSpur(z, false)}`
    + `<b class="ni-k-n">${esc(_spName(z.pid))}</b></div>`).join('')}</div>`;
}

// ── Das Blatt ───────────────────────────────────────────────────────
// Oben die Bewegung der Schlagzeile groß, darunter jede Bewegung mit ihrem
// Weg durch die Stufe und den drei Quellen des Prestiges an diesem Tag
// (`_ndWirkungBlock`, dasselbe Bauteil wie in der Tafel [§C27]) und am Ende
// die Leiter der Liga, wie sie an diesem Abend stand.
function _ndInsTagBlatt(s){
  const d = (s && s.dataRef) || {}, l = d.zuege || [], pm = pmap(), z = l[0];
  if(!z || !pm[z.pid]) return null;
  // Mehrere Bewegungen an einem Tag: jede steht im Kopf mit Zeichen, Gesicht
  // und neuer Lage, nebeneinander. Der Kopf zeigte nur die erste, und die
  // Schlagzeile darüber nannte drei Namen — zwei davon tauchten erst in der
  // Liste weiter unten auf [§C33].
  const da = l.filter(x => pm[x.pid]);
  const kopf = da.length > 1
    ? `<div class="nd-buehne nd-is nd-is-viele">` + da.map(x =>
        `<span class="nd-is-sp${x.art === 'ab' ? ' ab' : ''}" data-pid="${esc(x.pid)}">`
        + `<span class="nd-is-neu"><span class="nd-is-z">${_insZeichen(x.pid, x.nach)}</span>`
        + `<span class="nd-is-av">${avHtml(pm[x.pid], '', {px:30})}</span></span>`
        + `<b>${esc(_spName(x.pid))}</b><small>${esc(_insLageName(x.nach))}</small>`
        + `<em>${esc(_insArtWort(x))}</em></span>`).join('') + `</div>`
    : `<div class="nd-buehne nd-is">`
    + `<div class="nd-is-w"><span class="nd-is-alt">${_insZeichen(z.pid, z.vor, true)}<small>${esc(_insLageName(z.vor))}</small></span>`
    + `<svg class="nd-rk-pf${z.art === 'ab' ? ' ab' : ''}" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>`
    + `<span class="nd-is-neu" data-pid="${esc(z.pid)}"><span class="nd-is-z">${_insZeichen(z.pid, z.nach)}</span>`
    + `<span class="nd-is-av">${avHtml(pm[z.pid], '', {px:58})}</span></span></div>`
    + `<b class="nd-is-n">${esc(_insLageName(z.nach))}</b>`
    + `<span class="nd-is-p"><b class="num">${z.nach.punkte}</b> Prestige · ${esc(_spName(z.pid))}</span>`
    + `<span class="nd-is-wd">${esc(_insArtWort(z))}</span></div>`;
  const je = {};
  l.forEach(x => { if(pm[x.pid] && d.laufbahn && d.laufbahn[x.pid]) je[x.pid] = d.laufbahn[x.pid]; });
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  const weg = l.filter(x => pm[x.pid]).map(x => `<div class="ni-bw">${rcpAvHtml(x.pid, 20, {})}`
    + `<b>${esc(pm[x.pid].name)}</b><span>${esc(_insLageName(x.vor))} → ${esc(_insLageName(x.nach))}</span></div>`
    + _insWegHtml(x.pid, x.nach.punkte, x.vor.punkte)).join('');
  const leiter = Array.isArray(d.leiter) ? _newsLigaLeiter({je:d.leiter}) : '';
  return {kopf, mitte: ab(l.length > 1 ? 'Die Bewegungen' : 'Der Weg durch die Stufe', weg)
    + ab('Woher das Prestige kommt', _ndWirkungBlock(je, null, new Date(s.when).getTime()))
    + ab('Die Leiter der Liga an diesem Tag', leiter)};
}

// ── Alte Einzelzeilen werden zur Karte ihres Tages ───────────────────
// Bis zu dieser Karte stand jede neue Stufe als eigene Zeile
// (`insignium_stufe`) in der Ewigen Tafel. Diese Zeilen liegen gespeichert
// in der Datenbank und bleiben unverändert [§C33]; angezeigt werden sie als
// Insignium-Karte ihres Tages, damit ein Tag nicht zwei Formen hat. Gibt es
// für den Tag schon eine neue Karte, nimmt sie die alte Zeile nur als
// Mitglied auf (`memberIds`), verloren geht nichts.
function _insAltZuTag(list){
  if(!Array.isArray(list) || !list.some(s => ((s && s.dataRef) || {}).type === 'insignium_stufe')) return list;
  const neu = new Map(), alt = new Map(), rest = [];
  list.forEach(s => {
    const d = (s && s.dataRef) || {};
    if(d.type === 'insignium_tag') neu.set(d.tag || tagKey(s.when), s);
    if(d.type === 'insignium_stufe'){ const k = tagKey(s.when); (alt.get(k) || alt.set(k, []).get(k)).push(s); }
    else rest.push(s);
  });
  const ersetzt = new Map();
  alt.forEach((zeilen, tag) => {
    const da = neu.get(tag);
    if(da){
      const dd = da.dataRef || {};
      ersetzt.set(da.id, Object.assign({}, da, {dataRef:Object.assign({}, dd,
        {memberIds:[...new Set((dd.memberIds || [da.id]).concat(zeilen.map(x => x.id)))]})}));
      return;
    }
    const zuege = zeilen.map(x => {
      const d = x.dataRef || {}, lb = (d.laufbahn || {})[d.pid] || {};
      const lage = p => { const i = insigniumStufeVon(p), gs = insigniumGradSchwellen(i);
        return {stufe:i, grad:gs.reduce((g, sw, k) => p >= sw ? k : g, 0),
          zacken:INSIGNIEN[i].key === 'stern' ? ORDENSSTERN_START + Math.floor((p - INSIGNIEN[i].min) / ORDENSSTERN_SCHRITT) : 0,
          punkte:Math.round(p)}; };
      const nach = Number(d.punkte) || Number(lb.nach) || INSIGNIEN[d.stufe | 0].min;
      const vor = Number(lb.vor) || Math.max(0, INSIGNIEN[d.stufe | 0].min - 1);
      return {pid:d.pid, art:'auf', vor:lage(vor), nach:lage(nach), ms:new Date(x.when).getTime(),
        matchId:d.matchId || null, wieder:!!d.wieder};
    }).filter(z => z.pid);
    if(!zuege.length) return;
    const t = zeilen.length === 1 ? {title:zeilen[0].title, desc:zeilen[0].desc} : _insTagTexte(zuege);
    const lb = {};
    zeilen.forEach(x => Object.assign(lb, (x.dataRef || {}).laufbahn || {}));
    rest.push({id:'instag_' + tag, cat:'tafel', ic:'award', title:t.title, desc:t.desc,
      when:new Date(Math.max(...zeilen.map(x => new Date(x.when).getTime()))),
      prio:Math.max(...zeilen.map(x => x.prio | 0)),
      dataRef:{type:'insignium_tag', tag, zuege, playerIds:zuege.map(z => z.pid), laufbahn:lb,
        memberIds:zeilen.map(x => x.id)}});
  });
  return rest.map(s => ersetzt.get(s.id) || s);
}
