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
// Das Besonderste des Tages als Bild: das Zeichen davor klein und leise, der
// Pfeil, das Zeichen danach groß mit dem Gesicht, darunter die Spur der
// Leiter; alle übrigen Bewegungen als kleine Zeilen unter der Schlagzeile.
// Jeder Grad hat seine eigene Zeichnung [§C30], also zeigt die Bühne auch
// einen neuen Grad als Verwandlung.
// Die Karte trägt keine Prestige-Zahl und keinen Satz unter der Schlagzeile.
// Gewinn und Verlust standen auf der Tafel-Karte desselben Tages und hier ein
// zweites Mal, der Satz erklärte, was die Spur zeigt, und von den übrigen
// Bewegungen standen höchstens drei da und der Rest als „+1 weitere" [§C33].
// Zahl und Satz stehen im Blatt.
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
// Einundzwanzig Felder, drei je Stufe, darunter die sieben Zeichen. Was
// schon vorher erreicht war, steht gefüllt, was der Tag dazubringt, leuchtet
// Violett [§C25], was ein Rückfall kostet, steht rot gestreift. So sieht
// man ohne einen Satz, ob ein Grad oder drei Stufen dazukamen und wo auf der
// Leiter das liegt. Das Zeichen der Stufe von jetzt steht größer und hell,
// das der Stufe davor halb: die übrigen sind nur die Leiter dahinter.
function _insSpur(z){
  const a = _insSpurPos(z.vor), b = _insSpurPos(z.nach), ab = z.art === 'ab';
  const rang = (getPlayerRank(z.pid) || {}).label;
  const feld = i => {
    const k = i === b ? 'da' : ab ? (i < b ? 'hat' : i <= a ? 'weg' : '')
      : (i <= a ? 'hat' : i < b ? 'neu' : '');
    return `<i class="${k}${i === a && a !== b ? ' alt' : ''}" style="--f:${i}"></i>`;
  };
  return `<div class="ni-spur${ab ? ' ab' : ''}" aria-hidden="true">` + INSIGNIEN.map((ins, s) => {
    let bild = '';
    try { bild = insigniumStufeSvg(ins.key, rang, 0, 0, {bild:true}) || ''; } catch(e){ bild = ''; }
    const lage = s === z.nach.stufe ? ' jetzt' : s === z.vor.stufe ? ' vorher' : s < z.nach.stufe ? ' hat' : '';
    return `<span class="ni-sp-s${lage}"><span class="ni-sp-f">`
      + [0, 1, 2].map(g => feld(s * INSIGNIUM_GRADE + g)).join('')
      + `</span><span class="ni-sp-z">${bild}</span></span>`;
  }).join('') + `</div>`;
}
// ── Die Verwandlung der Bühne ───────────────────────────────────────
// Zwei Zeichen und ein Pfeil, gelesen wie die Leiter: links die tiefere
// Stufe, rechts die höhere. Das Gesicht sitzt immer auf dem Zeichen, das der
// Spieler jetzt trägt, und der Pfeil zeigt vom alten zum neuen. Beim
// Aufstieg also „Zierkranz → Lorbeerreif (Gesicht)", mit zwei Ringen, die
// einmal nach außen laufen, UNTER der Zeichnung — über ihr darf nichts
// skalieren [§C30]. Beim Rückfall „Zierkranz (Gesicht) ← Lorbeerreif", rot
// und ohne Ringe. Stand das alte Zeichen beim Rückfall links und zeigte der
// Pfeil zurück auf es, stand das Gesicht neben einem Pfeil, der von ihm
// wegzeigte; mit dem Pfeil nach vorn las sich ein Abstieg als Aufstieg.
// Hinter beiden liegt eine Lichtbahn, die sie verbindet.
function _insVerwandlung(z){
  const pm = pmap(), ab = z.art === 'ab';
  // Der Pfeil zieht eine Spur aus zwei Strichen hinter sich her: die
  // Bewegung von einem Zeichen zum anderen, nicht nur ein Verweis.
  const pfeil = ab
    ? `<svg class="ni-pf zurueck" viewBox="0 0 48 16" aria-hidden="true"><path class="sp" d="M46 8H40M36 8H30"/><path d="M26 8H6"/><path d="M12 3L5 8L12 13"/></svg>`
    : `<svg class="ni-pf" viewBox="0 0 48 16" aria-hidden="true"><path class="sp" d="M2 8H8M12 8H18"/><path d="M22 8H42"/><path d="M36 3L43 8L36 13"/></svg>`;
  const wellen = ab ? '' : `<span class="ni-wl" aria-hidden="true"><i></i><i></i></span>`;
  const alt = `<span class="ni-alt">${_insZeichen(z.pid, z.vor, true)}</span>`;
  const neu = `<span class="ni-neu">${wellen}${_insZeichen(z.pid, z.nach)}`
    + `<span class="ni-av">${avHtml(pm[z.pid], '', {px:30})}</span></span>`;
  return ab ? `<div class="ni-sz" role="img" aria-label="Rückfall">${neu}${pfeil}${alt}</div>`
            : `<div class="ni-sz">${alt}${pfeil}${neu}</div>`;
}
// ── Die Bühne: das Besonderste des Tages ────────────────────────────
// Die erste Bewegung ist die besonderste: der Generator ordnet neue Stufen
// vor Grade und Grade vor Rückfälle, darin die höhere Stufe zuerst. Sie
// bekommt die Bühne — Wort und Lage darüber, die Verwandlung, die Spur der
// Leiter. Alle übrigen stehen klein unter der Schlagzeile, jede als Zeile.
// Jede Bewegung einzeln als gleich großes Bild, als Kacheln oder Zeilen mit
// eigener Spur, ließ keinen Anlass hervortreten und machte die Karte zu
// einer Liste.
function _newsInsTagKopf(s){
  const d = (s && s.dataRef) || {}, pm = pmap(), z = (d.zuege || [])[0];
  if(!z || !pm[z.pid] || !INSIGNIEN[(z.nach || {}).stufe | 0]) return '';
  return `<div class="ni-b ni-${esc(z.art)}" data-pid="${esc(z.pid)}">`
    + `<span class="ni-t"><em>${esc(_insArtWort(z))}</em><b>${esc(_insLageName(z.nach))}</b></span>`
    + _insVerwandlung(z) + _insSpur(z) + `</div>`;
}
// ── Die übrigen Bewegungen ──────────────────────────────────────────
// Jede als Zeile: Gesicht, was passiert ist, und die beiden Zeichen klein,
// gelesen wie die Bühne — beim Rückfall „neu ← alt". Alle, nicht drei und
// „+1 weitere"; ohne Prestige-Zahl, die steht auf der Tafel-Karte und im
// Blatt [§C33].
function _newsInsTagZeilen(s){
  const d = (s && s.dataRef) || {}, pm = pmap();
  const l = (d.zuege || []).slice(1).filter(z => z && pm[z.pid] && INSIGNIEN[(z.nach || {}).stufe | 0]);
  if(!l.length) return '';
  const text = z => z.art === 'ab' ? `fällt auf den ${INSIGNIEN[z.nach.stufe].name} zurück`
    : z.art === 'grad' ? (INSIGNIEN[z.nach.stufe].key === 'stern' ? `erreicht die ${z.nach.zacken}. Zacke`
      : `steigt auf ${_insLageName(z.nach)}`)
    : z.wieder ? `trägt wieder den ${INSIGNIEN[z.nach.stufe].name}` : `erreicht den ${INSIGNIEN[z.nach.stufe].name}`;
  const zeile = z => {
    const ab = z.art === 'ab';
    const alt = `<span class="ni-z-z alt">${_insZeichen(z.pid, z.vor, true)}</span>`;
    const neu = `<span class="ni-z-z">${_insZeichen(z.pid, z.nach, true)}</span>`;
    const pf = ab ? `<svg class="ni-z-pf zurueck" viewBox="0 0 12 10" aria-hidden="true"><path d="M11 5H2M5 2L1.5 5L5 8"/></svg>`
                  : `<svg class="ni-z-pf" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5H10M7 2L10.5 5L7 8"/></svg>`;
    return `<div class="ni-z ni-${esc(z.art)}" data-pid="${esc(z.pid)}">${rcpAvHtml(z.pid, 22, {})}`
      + `<span class="ni-z-t"><b>${esc(pm[z.pid].name)}</b> ${esc(text(z))}</span>`
      + `<span class="ni-z-w">${ab ? neu + pf + alt : alt + pf + neu}</span></div>`;
  };
  return `<div class="ni-zs">${l.map(zeile).join('')}</div>`;
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
    // Wie auf der Karte: links die tiefere Stufe, das Gesicht auf der von
    // jetzt, der Pfeil vom alten zum neuen Zeichen — beim Rückfall zurück.
    + `<div class="nd-is-w">${(() => {
        const alt = `<span class="nd-is-alt">${_insZeichen(z.pid, z.vor, true)}<small>${esc(_insLageName(z.vor))}</small></span>`;
        const neu = `<span class="nd-is-neu" data-pid="${esc(z.pid)}"><span class="nd-is-z">${_insZeichen(z.pid, z.nach)}</span>`
          + `<span class="nd-is-av">${avHtml(pm[z.pid], '', {px:58})}</span></span>`;
        return z.art === 'ab'
          ? neu + `<svg class="nd-rk-pf ab zurueck" viewBox="0 0 40 16" aria-hidden="true"><path d="M38 8H6"/><path d="M12 3L5 8L12 13"/></svg>` + alt
          : alt + `<svg class="nd-rk-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>` + neu;
      })()}</div>`
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
