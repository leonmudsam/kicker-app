// ─── §11.6e — Die Insignium-Karte des Tages [§C30, §C33] ─────────────
// Eine Karte je Spieltag für die Leiter, neben der Ewigen Tafel: die Tafel
// zeigt, wer Prestige gewinnt und verliert, diese Karte, was das am Zeichen
// ändert. Gebaut im Generator (`insignium_tag`, 27-news-generator.js), hier
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
// Die Bewegung, die die Schlagzeile trägt: das Zeichen davor klein und leise,
// der Pfeil, das Zeichen danach groß mit dem Gesicht. Jeder Grad hat seine
// eigene Zeichnung [§C30], also zeigt die Bühne auch einen neuen Grad als
// Verwandlung. Ein Rückfall zeigt dieselbe Bühne mit dem Pfeil nach unten.
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
function _newsInsTagKopf(s){
  const d = (s && s.dataRef) || {}, z = (d.zuege || [])[0], pm = pmap();
  if(!z || !pm[z.pid]) return '';
  const S = INSIGNIEN[z.nach.stufe];
  const pfeil = `<svg class="ni-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>`;
  // Die drei Grade der Stufe als Punkte: welcher erreicht ist, sieht man am
  // Zeichen nur, wenn man es sucht.
  const grade = S.key === 'stern' ? '' : `<span class="ni-gr">${INSIGNIUM_GRAD_NAME.map((g, i) =>
    `<i class="${i < z.nach.grad ? 'da' : i === z.nach.grad ? 'jetzt' : ''}">${g}</i>`).join('')}</span>`;
  return `<div class="ni-b ni-${esc(z.art)}" data-pid="${esc(z.pid)}">`
    + `<span class="ni-alt">${_insZeichen(z.pid, z.vor, true)}</span>${pfeil}`
    + `<span class="ni-neu">${_insZeichen(z.pid, z.nach)}<span class="ni-av">${avHtml(pm[z.pid], '', {px:30})}</span></span>`
    + `<span class="ni-t"><em>${esc(_insArtWort(z))}</em><b>${esc(_insLageName(z.nach))}</b>${grade}`
    + `<small><b class="num">${z.nach.punkte}</b> Prestige</small></span></div>`;
}
// Die übrigen Bewegungen des Tages als Zeilen, je mit Gesicht, Satz,
// Zeichen und dem Prestige des Tages. Höchstens drei; das Blatt zeigt alle.
function _newsInsTagZeilen(s){
  const d = (s && s.dataRef) || {}, l = (d.zuege || []).slice(1), pm = pmap();
  if(!l.length) return '';
  const lb = d.laufbahn || {};
  const text = z => z.art === 'ab' ? `fällt auf den ${INSIGNIEN[z.nach.stufe].name} zurück`
    : z.art === 'grad' ? (INSIGNIEN[z.nach.stufe].key === 'stern' ? `erreicht die ${z.nach.zacken}. Zacke`
      : `steigt auf ${_insLageName(z.nach)}`)
    : z.wieder ? `trägt wieder den ${INSIGNIEN[z.nach.stufe].name}` : `erreicht den ${INSIGNIEN[z.nach.stufe].name}`;
  const zeile = z => {
    if(!pm[z.pid]) return '';
    const w = lb[z.pid], dl = w ? Math.round(Number(w.nach) || 0) - Math.round(Number(w.vor) || 0) : 0;
    return `<div class="ni-z${z.art === 'ab' ? ' ab' : ''}" data-pid="${esc(z.pid)}">${rcpAvHtml(z.pid, 20, {})}`
      + `<span class="ni-z-t"><b>${esc(pm[z.pid].name)}</b> ${esc(text(z))}</span>`
      + `<span class="ni-z-z">${_insZeichen(z.pid, z.nach, true)}</span>`
      + (dl ? `<em class="num ${dl > 0 ? 'g' : 'r'}">${dl > 0 ? '+' : '−'}${Math.abs(dl)} P</em>` : '') + `</div>`;
  };
  return `<div class="ni-zs">${l.slice(0, 3).map(zeile).join('')}`
    + (l.length > 3 ? `<div class="ni-z mehr">+${l.length - 3} weitere</div>` : '') + `</div>`;
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
