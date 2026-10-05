// ─── §11.7 — Story-Detail (dynamisch je Typ) ─────────────────────────
// Detail-Popover (z-index 140) — kann ÜBER dem Sheet (100)
// liegen und ist unabhängig schließbar.
// ── Was unten in Zahlen steht, sagt der Satz oben nicht ────────────
// Der Satz der Tafel-Karte zaehlt auf, was passiert ist („Eine Bestmarke,
// ein Ausbau, zwei Monatschroniken und ein neues Insignium: …") — im FEED
// ist das die ganze Aussage. Im Blatt steht direkt darunter die Zahlenreihe
// mit denselben vier Angaben, und damit dieselbe Information zweimal in
// sechs Zeilen [§C27]. Der Kopf laesst die Aufzaehlung dort weg; was danach
// kommt — der Zuwachs fuer die Laufbahn — bleibt, denn das zaehlt die Reihe
// nicht auf [§C33 `_ndNeu`].
//
// Eine eigene Funktion, weil die Regel sonst nur im Zeichnen des Blatts
// stuende und damit nur mit einem Dokument zu messen waere.
function _ndLead(desc, body){
  const lead = String(desc || '');
  if(String(body || '').indexOf('rcp-z') < 0 || !/^[^:]+:\s+\S/.test(lead)) return lead;
  const rest = lead.replace(/^[^:]+:\s+/, '');
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : lead;
}

function openNewsDetail(sid){
  const stories = getStoriesCache();
  const s = stories.find(x => x.id === sid);
  if(!s) return;
  // ── Read-State (Bugfix v8.1) ──
  // Story IMMER hier markieren — egal über welchen Pfad geöffnet wurde
  // (Mini-Popup, Feed-Card, Direkt-Aufruf). _newsMarkSeen ist idempotent
  // (Set-Add), kein Risiko bei mehrfachem Aufruf.
  try {
    _newsMarkSeen(sid);
    newsBadgeRefresh();
    // Sichtbare Cards im Feed visuell synchron halten.
    // CSS.escape ist seit 2015 in allen relevanten Browsern verfügbar; defensiv
    // mit Fallback auf simples Escape für Edge-Cases.
    const escId = (window.CSS && CSS.escape) ? CSS.escape(sid) : sid.replace(/[\\"']/g, '\\$&');
    document.querySelectorAll('.nf-card[data-sid="'+escId+'"], .nf-hero[data-sid="'+escId+'"]').forEach(el => {
      el.classList.add('read'); el.classList.remove('important');
      el.querySelector('.nf-dot')?.remove();
    });
  } catch(e){}
  // v9: Breaking-Stories im Detail ebenfalls in der Breaking-Optik anzeigen.
  const dcat = _displayCat(s);
  const cat = NEWS_CATEGORIES[dcat] || NEWS_CATEGORIES.fun;
  // Body-HTML dynamisch je Typ — nutzt vorhandene Avatar/Stat-Helper
  const body = _newsDetailBody(s);
  // Der Kopf einer Partie trägt den Satz ohne Siegchance und Elo, wie die
  // Karte: die Bühne darunter zeigt beides [§C33].
  let lead = _ndLead(s.desc, body);
  // Auf der Bühne eines Rekords stehen Vorgänger und Wirkung gezeichnet; die
  // Sätze dazu standen im Kopf ein zweites Mal [§C33 `_ndNeu`].
  if(body.indexOf('nd-rk') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/^(Vorher (gehörte|hielt|hielten)|Für .+ heißt der Spieltag)/.test(x)).join(' ');
  // Die Bühne einer Stufe zeigt die Punkte, ihre drei Quellen und den Weg
  // zur nächsten; der Satz zählte dieselben Zahlen davor auf.
  if(body.indexOf('nd-is') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(Prestige zusammen|bis zum .+ fehlen|^Zuletzt stand die Stufe)/.test(x)).join(' ');
  // Die Form zeigt beide Quoten als Balken; der Satz bestand nur aus ihnen.
  if(body.indexOf('nd-fv') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(aus den letzten \d+ Partien|Laufbahn davor sind es)/.test(x)).join(' ');
  // Die Monatstafel zeigt Einträge und Träger als Säulen.
  if(body.indexOf('nd-mo') >= 0) lead = lead.split(/(?<=\.)\s+/)
    .filter(x => !/(Einträge? (gehen|geht|stehen|steht)|^Vorn steh)/.test(x)).join(' ');
  try { if(_newsSorte(s) === 'spiel') lead = _newsSpielSatz(lead, SP_ZEIGT_ALLES); } catch(e){}
  const nd = document.getElementById('nd');
  const bg = document.getElementById('ndBg');
  if(!nd || !bg) return;
  // Der Faden [§C33] in beide Richtungen: woran diese Karte anschließt und
  // welche spätere sie fortsetzt. Dieselbe Ableitung wie im Feed.
  let fadenHtml = '';
  try {
    const fd = _newsFaeden(stories);
    const zurueck = fd.get(sid);
    let weiter = null;
    fd.forEach((f, id) => { if(f.ziel === sid && !weiter) weiter = {art: f.art, von: id}; });
    fadenHtml = _newsFadenHtml(zurueck, stories) + _newsFadenHtml(weiter, stories, true);
  } catch(e){}
  // Das Blatt setzt fort, was die Karte angefangen hat: dieselbe Rubrik,
  // dasselbe Motiv, dieselben fetten Akzente [§C27]. Vorher stand oben der
  // Kategorienname aus der Datenbank („Badge & Awards"), den es auf der
  // Karte seit dem Rubrikband nicht mehr gibt.
  const sorte = _newsSorte(s);
  const brk = _isBreaking(s);
  const negativ = _newsIstNegativ(s);
  const tafelTon = sorte === 'tafel' ? _newsTafelTon(s) : '';
  const faktStil = sorte === 'fakt' && (s.dataRef || {}).type === 'ambient'
    ? (NEWS_AMBIENT_STIL[(s.dataRef || {}).ambientRubrik] || NEWS_AMBIENT_STIL.liga) : null;
  nd.className = 'nd nd-s-' + sorte + (tafelTon ? ' nd-tafel-' + tafelTon : '')
    + (faktStil ? ' nd-fakt-' + faktStil.ton : '')
    + (negativ ? ' nd-neg' : '') + (brk ? ' nd-brk' : '');
  // #nd ist der Scrollbehälter, nicht der Feed darunter. Eine Öffnung ist
  // immer ein neuer Lesestart, auch bei derselben Story oder einem Faden
  // aus dem offenen Blatt. Vor dem Markup zurücksetzen: kein Zwischenlayout
  // des neuen Inhalts und kein späterer Frame, der das Lesen zurückzieht.
  nd.scrollTop = 0;
  nd.innerHTML = `
    ${_newsMotiv(sorte, s)}
    ${brk ? '<div class="nf-brk-band"><span class="nf-brk-punkt"></span>BREAKING</div>' : ''}
    <div class="nd-head">
      <div class="nd-ic nv-cat-${dcat}">${svgI(ICONS[s.ic] ? s.ic : cat.ic)}</div>
      <div class="nd-title-wrap">
        <div class="nd-cat">${esc(_newsRubrik(sorte, s))}</div>
        <div class="nd-title">${esc(s.title)}</div>
        <div class="nd-when">${svgI('clock')}${esc(_newsWhenLabel(s.when))}</div>
      </div>
      <button class="nd-x" id="ndXBtn" aria-label="Schließen">×</button>
    </div>
    ${lead ? `<div class="nd-desc">${_newsBetont(lead)}</div>` : ''}
    ${body}
    ${fadenHtml ? `<div class="nd-faeden">${fadenHtml}</div>` : ''}
    ${_newsRueckblickKnopf(s)}
    <button class="nd-close" id="ndCloseBtn">Schließen</button>`;
  bg.classList.add('show');
  document.getElementById('ndCloseBtn').onclick = closeNewsDetail;
  document.getElementById('ndXBtn').onclick = closeNewsDetail;
  nd.querySelectorAll('.nf-faden[data-ziel]').forEach(el => {
    el.onclick = () => openNewsDetail(el.dataset.ziel);
  });
  nd.querySelectorAll('[data-rueckblick]').forEach(el => {
    el.onclick = () => {
      const [art, k] = String(el.dataset.rueckblick).split('|');
      closeNewsDetail();
      sheetNav(() => { try { art === 'abschied' ? zeigeAbschied(k) : art === 'tag' ? showPotdRecap({force:true, tag:k}) : showPotwRecap({woche:k}); } catch(e){} });
    };
  });
  // Match-Refs: bei Klick zum Match-Detail springen
  nd.querySelectorAll('[data-mid]').forEach(el => {
    el.onclick = () => {
      const mid = el.dataset.mid;
      closeNewsDetail();
      sheetNav(() => { try { showMatchDetail(mid); } catch(e){} }); // über den News-Feed stapeln
    };
  });
  // Player-Refs: zum Spielerprofil
  nd.querySelectorAll('[data-pid]').forEach(el => {
    el.onclick = () => {
      const pid = el.dataset.pid;
      closeNewsDetail();
      sheetNav(() => { try { showPlayer(pid); } catch(e){} }); // über den News-Feed stapeln
    };
  });
  // §13: Titel-Plaketten und der „Ganze Tafel"-Button im Saison-Abschluss
  nd.querySelectorAll('[data-tplayer]').forEach(el => {
    el.onclick = () => {
      const pid = el.dataset.tplayer;
      closeNewsDetail();
      sheetNav(() => { try { showPlayer(pid); } catch(e){} });
    };
  });
  nd.querySelectorAll('[data-season-table]').forEach(el => {
    el.onclick = () => {
      const sid = el.dataset.seasonTable;
      closeNewsDetail();
      sheetNav(() => { try { showSeasonTable(sid); } catch(e){} });
    };
  });
  nd.querySelectorAll('[data-chron]').forEach(el => {
    el.onclick = () => {
      const cid = el.dataset.chron;
      closeNewsDetail();
      sheetNav(() => { try { showChronicle(cid); } catch(e){} });
    };
  });
}
// ── Der Rückblick zur Story ──────────────────────────────────────────
// Spieler des Tages und die Woche haben einen eigenen Rückblick, und der war
// nur über den Liga-Reiter zu erreichen — und dort nur für den LETZTEN Tag
// und die LETZTE Woche. Wer die Karte drei Tage später las, kam an die
// Auswertung nicht mehr heran. Der Knopf öffnet den Rückblick IHRES Tages
// oder IHRER Woche.
function _newsRueckblickKnopf(s){
  const d = (s && s.dataRef) || {};
  if(d.type === 'karriereende' && d.pid && pmap()[d.pid])
    return `<button class="btn nd-rueck" type="button" data-rueckblick="${esc('abschied|' + d.pid)}">${svgI('hourglass')}Der ganze Abschied</button>`;
  const ziel = d.type === 'potd' && d.dayKey ? 'tag|' + d.dayKey
    : (d.type === 'woche' || d.type === 'potw') && d.woche ? 'woche|' + d.woche : '';
  if(!ziel) return '';
  return `<button class="btn nd-rueck" type="button" data-rueckblick="${esc(ziel)}">${svgI(ziel.indexOf('tag|') === 0 ? 'dayKing' : 'weekKing')}`
    + `${ziel.indexOf('tag|') === 0 ? 'Rückblick auf den Tag' : 'Rückblick auf die Woche'}</button>`;
}
function closeNewsDetail(){
  const bg = document.getElementById('ndBg');
  if(bg) bg.classList.remove('show');
}

// Detail-Body-HTML — schaltet nach dataRef.type. Für unbekannte Typen
// wird nur die Description angezeigt (Fallback).
//
// v8.1: massiv erweitert. Helper-Funktionen unten liefern wiederverwendbare
// Bausteine (Match-VS-Block, Elo-Delta, Form-Strip), die in mehreren Cases
// gemeinsam genutzt werden. Vermeidet duplizierte Berechnungen.
// Rang, Zeichen und Prestige unter dem Namen im Blatt. Ein Name allein sagt
// nicht, wer da gerade gefeiert wird — und das Wappen daneben zeigt die Stufe,
// ohne sie zu benennen.
function _newsRangZeile(pid){
  try {
    // Dieselbe Rechnung stand hier ein zweites Mal [§C27].
    const rang = _newsGesamtrang(pid);
    const P = (typeof prestigeOf === 'function') ? prestigeOf(pid) : null;
    const teile = [];
    // „Rang 6" stand hier als Text UND daneben als Rangabzeichen — dieselbe
    // Aussage zweimal. Das Abzeichen ist das Bauteil [§C27], die Zeile nennt,
    // was es nicht sagt.
    // „der Liga" las sich wie die Tabelle der laufenden Saison; gemeint ist
    // der Zeitraum „Gesamt" des Liga-Tabs, und die beiden Plaetze koennen
    // weit auseinanderliegen.
    if(rang > 0) teile.push('Platz ' + rang + ' der Gesamtliga');
    if(!_ndZeichenUnten){
      if(P && P.insignie) teile.push(P.insignie.name);
      if(P && P.punkte != null) teile.push(P.punkte + ' Prestige');
    }
    return teile.join(' · ');
  } catch(e){ return ''; }
}

// ── Ein Geruest fuer jedes Blatt ────────────────────────────────────
// Es gibt einunddreissig Story-Typen, und jeder brachte sein eigenes Blatt
// mit: mal eine Namenszeile mit Pfeil, mal ein Wert ohne Einordnung, mal gar
// nichts. Wer zwei Blaetter nacheinander oeffnete, fand nichts an derselben
// Stelle. Kopf und Fuss stehen deshalb jetzt an EINER Stelle, und die Cases
// liefern nur noch die Mitte.
//
// Der Kopf zeigt, um wen es geht: ein Wappen wie ueberall sonst [§C27], den
// Namen und darunter Rang, Zeichen und Prestige. Bei einer Partie steht das
// Was die Leute auf einer Karte miteinander zu tun haben, sagt der STORY-TYP
// und nicht die Kartenform. Gemessen stand unter „Martin schlaegt Leo im
// Spitzenspiel" die Zeile „als Duo" — die beiden standen sich gegenueber —,
// und unter „Johannes und Stefan bewegen die Ewige Tafel" ebenfalls: zwei
// Leute, die am selben Tag je einen eigenen Rekord holten. „als Duo" war die
// Vorgabe fuer alles, was genau zwei Wappen zeigt, und stimmte nur bei den
// beiden Duo-Serien.
function _ndBeziehung(s, anzahl){
  const t = ((s && s.dataRef) || {}).type || '';
  if(t === 'rivalry' || t === 'rivalry_milestone') return 'im direkten Duell';
  if(t === 'team_streak' || t === 'team_loss_streak') return 'als Duo';
  if(t === 'top_clash') return 'Sieger und Verlierer dieser Partie';
  if(t === 'streak_killer') return 'auf beiden Seiten der Partie';
  if(t === 'chronik_monat') return 'die meisten Einträge in diesem Monat';
  if(t === 'badge_unlocked') return 'mit derselben Auszeichnung';
  if(t === 'potd' || t === 'potw') return 'punktgleich an der Spitze';
  // Das Blatt einer Partie zeigt ihre Sieger. „in derselben Partie" stand
  // darunter — auf dem Blatt, das diese Partie IST.
  if(t === 'spiel') return 'gewinnen diese Partie';
  // Die Sammelkarte buendelt einen MOMENT, nicht zwingend eine Partie: die
  // Gruppe entsteht ueber die Minute [§C33].
  if(t === 'sammel'){
    const q = (s.dataRef || {}).quelle;
    // Auf der Karte ueber einen Erfolg haben die Beteiligten genau eines
    // miteinander zu tun: sie haben dasselbe geholt.
    if(q === 'erfolg') return 'mit demselben Erfolg';
    // Zwei Ergebnisse desselben Tages verbindet der Tag, nicht die Partie.
    if(q === 'ergebnis') return 'an diesem Spieltag';
    // Die Karte einer Partie hat ihre Partie: „im selben Moment" stimmt,
    // sagt aber weniger als das, was alle Zeilen gemeinsam haben.
    if(q === 'spiel' && (s.dataRef || {}).matchId) return 'in dieser Partie';
    return q === 'tafel' ? 'an der Ewigen Tafel' : 'im selben Moment';
  }
  if(((s && s.dataRef) || {}).matchId) return 'in derselben Partie';
  return 'gemeinsam auf dieser Karte';
}

// Ergebnis darueber, bei einem Duo stehen zwei Wappen nebeneinander.
function _newsBlattKopf(s){
  const d = s.dataRef || {};
  const pm = pmap();
  const nm = pid => (pm[pid] && pm[pid].name) || '';
  let ids = [];
  try { ids = (_newsPids(s) || []).filter(id => pm[id]); } catch(e){}
  // Die Meisterbühne IST der Kopf: das Podest darunter zeigt den Meister
  // groß, ein Wappen darüber sagte dasselbe ein zweites Mal [§C27].
  if(d.type === 'season_recap') return d.matchId ? _newsBlattErgebnis(d.matchId) : '';
  // Die Runde hat ihre Tabelle als Kopf; vier Wappen darüber sagten dasselbe.
  if(d.type === 'runde') return '';
  // Das Blatt einer Partie trägt die Zeichnung ihrer Karte als Bühne. Es
  // zeigte einen nackten Stand und darunter zwei Wappen mit „gewinnen diese
  // Partie", während die Karte darüber Spielfeld, Mosaik oder Revanche trug:
  // wer sie öffnete, verlor das Bild, wegen dem er getippt hatte.
  if(d.matchId && (d.type === 'spiel' || (d.type === 'sammel' && _newsSorte(s) === 'spiel'))){ const b = _ndBuehne(s); if(b) return b; }
  { const x = _ndEigenesBlatt(s); if(x) return x.kopf; }
  // Eigene Bühnen und die Runde verwenden kein Ergebnisband. Sein Markup
  // erst für den sichtbaren Rückfall bauen, statt es jedes Mal zu verwerfen.
  const erg = d.matchId ? _newsBlattErgebnis(d.matchId) : '';
  if(!ids.length) return erg;
  // Ein Duo hat keinen Rang [§C27] — zwei Wappen, zwei Namen, keine Zeile
  // darunter, die es fuer beide gaebe.
  //
  // ── So viele Wappen wie Namen ────────────────────────────────────
  // Gezeigt wurden immer die ersten ZWEI, waehrend die Zeile daneben bis zu
  // drei Namen nennt: gemessen stand „Johannes, Leo und Leon bewegen die
  // Ewige Tafel" ueber zwei Gesichtern, und welcher der drei fehlt, sagte
  // nichts. Der Deckel ist deshalb derselbe wie der von `_namenKurz` — drei,
  // und ab dem vierten zaehlt ein Chip den Rest, wie auf der Karte [§C27].
  if(ids.length > 1){
    const zeig = ids.slice(0, 3);
    const rest = ids.length - zeig.length;
    return erg + `<div class="nd-held nd-held-duo">
      <div class="nd-held-av">${zeig.map(id => avHtml(pm[id], '', {ins:true, px:48, feuer:0})).join('')}${
        rest > 0 ? `<span class="av nf-face-mehr nd-held-mehr">+${rest}</span>` : ''}</div>
      <div><div class="nd-held-nm">${esc(_namenKurz(ids.map(nm)))}</div>
      <div class="nd-held-un">${esc(_ndBeziehung(s, ids.length))}</div></div></div>`;
  }
  const pid = ids[0];
  // Das Rangabzeichen ist ein Bauteil, das die App schon hat [§C27] — im Blatt
  // stand statt seiner die Zeile „Rang 6", also derselbe Rang als nackter Text.
  let ab = ''; try { ab = rankBadgeHtml(pid) || ''; } catch(e){}
  return erg + `<div class="nd-held" data-pid="${esc(pid)}">
    ${avHtml(pm[pid], '', {ins:true, px:54, feuer:0})}
    <div><div class="nd-held-nm">${esc(nm(pid))}</div>
    <div class="nd-held-un">${ab}<span>${esc(_newsRangZeile(pid))}</span></div></div></div>`;
}

// Kopf und Fuß der Karte, groß. Beide tragen den Stand und die Namen.
function _ndBuehne(s){
  try {
    const b = _spBild(s);
    return b && b.kopf ? `<div class="nd-buehne">${b.kopf}${b.fuss || ''}</div>` : '';
  } catch(e){ return ''; }
}
// ── Was unter der Bühne einer Partie steht ───────────────────────────
// Nur Zeichnungen und keine Sätze darüber, was sie zeigen: die Blätter
// trugen unter jedem Abschnitt eine Zeile Kleingedrucktes, die erklärte,
// was die Grafik ohnehin zeigt. Und nur, was die Bühne nicht schon zeigt.
// Jede Partie aus Sicht ihrer Teilnehmer: wie oft sich Sieger und
// Verlierer als Gegner trafen, die Bilanz und die letzten zwölf, diese
// Partie zuletzt.
function _ndDuelle(m, nur){
  const F = _spFakten(m), l = F.gegner.filter(g => !nur || nur(g));
  if(!l.length) return '';
  return `<div class="nd-dd">${l.sort((a, b) => b.n - a.n).map((g, k) => {
    const f = g.folge.slice(-12);
    return `<div class="nd-dd-z" data-pid="${esc(g.w)}" style="--k:${k}">${_spChip(g.w)}`
      + `<span class="nd-dd-n">${esc(_spName(g.w))}<i>gegen</i>${esc(_spName(g.l))}</span>`
      + `<b class="num">${_spZahl(g.s)}:${_spZahl(g.n - g.s)}</b>`
      + `<span class="nd-lf">${f.map((w, j) => `<i class="${w ? 'w' : 'l'}${j === f.length - 1 ? ' dies' : ''}"></i>`).join('')}</span></div>`;
  }).join('')}</div>`;
}
// Der Tag als Leiste: jede Partie mit Stand und Uhrzeit, diese gerahmt.
function _ndTagLeiste(m){
  const tag = _spFormBasis().tage.get(tagKey(m.created_at)) || [];
  if(tag.length < 2) return '';
  return `<div class="nd-tl">${tag.map((y, k) => `<span class="nd-tl-z${y === m ? ' dies' : ''}" style="--k:${k}">`
    + `<b class="num">${Math.max(y.score_a, y.score_b)}:${Math.min(y.score_a, y.score_b)}</b>`
    + `<small class="num">${esc(datumFmt(y.created_at, 'uhr'))}</small></span>`).join('')}</div>`;
}
// Wie oft die Liga bis hier mit diesem Abstand endete: eine Säule je
// Abstand, diese hell und mit ihrem Anteil.
function _ndVerteilung(m){
  const F = _spFakten(m), v = F.vert.slice(1), sum = v.reduce((a, b) => a + b, 0) || 1, max = Math.max(1, ...v);
  return `<div class="nd-vt">${v.map((n, k) => `<span class="${k + 1 === F.diff ? 'dies' : ''}" style="--k:${k}">`
    + (k + 1 === F.diff ? `<em class="num">${_spZahl(Math.round(n / sum * 100))} %</em>` : '')
    + `<i style="height:${Math.max(3, Math.round(n / max * 100))}%"></i><b class="num">${k + 1}</b></span>`).join('')}</div>`
    + `<div class="nd-vt-l"><span>1 Tor Abstand</span><span>10 Tore</span></div>`;
}

// Das Ergebnis der Partie, aus der die Story stammt. Vorher stand es je nach
// Typ mal als Block, mal gar nicht.
function _newsBlattErgebnis(matchId){
  const m = (matches || []).find(x => x.id === matchId);
  if(!m) return '';
  const pm = pmap();
  const seite = ids => ids.filter(id => pm[id])
    .map(id => `<span class="nd-erg-n">${esc(pm[id].name)}</span>`).join('');
  const aWin = m.winner === 'A';
  const dt = new Date(m.created_at).toLocaleDateString('de-DE',
    {weekday:'long', day:'2-digit', month:'2-digit'});
  const uhr = datumFmt(m.created_at, 'uhr');
  return `<div class="nd-erg">
    <div class="nd-erg-z">${esc(dt)} um ${esc(uhr)}</div>
    <div class="nd-erg-r">
      <div class="nd-erg-s${aWin?' w':''}">${seite([m.a1, m.a2])}</div>
      <div class="nd-erg-sc"><b class="${aWin?'w':'v'}">${m.score_a}</b><i>:</i><b class="${aWin?'v':'w'}">${m.score_b}</b></div>
      <div class="nd-erg-s re${aWin?'':' w'}">${seite([m.b1, m.b2])}</div>
    </div></div>`;
}

// ── Das Medaillon ────────────────────────────────────────────────────
// Eine Auszeichnung ist das Einzige im Feed, das man sich VERDIENT — und sie
// stand als graue Zeile „Seltenheit: Negative" im Blatt. Jetzt trägt sie
// ihr Zeichen in einem Ring, der die Klasse trägt, darunter die Bedingung
// und die Zahl der Halter [§C34]. Die Klasse färbt den Ring, nicht die
// ganze Fläche [§C25].
function _newsMedaillon(ic, rarity, name, bedingung, badgeId){
  const r = rarity || 'common';
  let halter = '';
  try { halter = _newsBadgeHalterText(badgeId); } catch(e){}
  return `<div class="nd-med nd-med-${esc(r)}">
    <div class="nd-med-r">${svgI(ic || 'medal')}</div>
    <div class="nd-med-t">
      <div class="nd-med-n">${esc(name || '')}</div>
      <div class="nd-med-k">${esc(_newsRarityLabel(r))}</div>
      ${_ndNeu(bedingung) ? `<div class="nd-med-b">${esc(bedingung)}</div>` : ''}
    </div>
    ${halter ? `<div class="nd-med-h">${esc(halter)}</div>` : ''}
  </div>`;
}

// ── Die Verfolger ────────────────────────────────────────────────────
// Ein Rekord ohne Verfolger ist eine Zahl ohne Maßstab. Die drei Besten
// stehen deshalb im Blatt. Gelesen wird dieselbe Rangfolge, aus der auch der
// Rekorde-Reiter zeichnet [§C27].
//
// Wer den Rekord HÄLT, steht hier nicht: bei einem Rekord, den sich drei
// punktgleich teilen, füllten genau diese drei die Liste, und unter der
// Überschrift „Wer sonst noch vorne steht" standen dieselben drei Namen mit
// derselben Zahl, die der Kopf zwei Zeilen darüber schon nennt [§C33].
// Wer DAHINTER liegt — und niemand davor. Die Karte traegt den Wert, der
// bei ihrer Entstehung galt (er steckt in ihrer ID); die Liste rechnet
// HEUTE. Zwischen beidem koennen Partien liegen, und dann stand unter
// „Martin uebernimmt ‚Der Zerstoerer' · 24 %" ein Verfolger mit 25 % —
// eine Karte, die sich selbst widerspricht. Wer den Wert der Karte
// inzwischen ueberholt hat, steht nicht dahinter, sondern davor: die Liste
// laesst ihn weg und sagt stattdessen, wem der Rekord jetzt gehoert.
function _newsVerfolger(rekordId, halter, wert){
  if(!rekordId) return '';
  try {
    const rang = chronicleRang(rekordId);
    if(!Array.isArray(rang) || rang.length < 2) return '';
    const pm = pmap();
    const oben = (Array.isArray(halter) ? halter : []);
    const grenze = (wert == null || !isFinite(wert)) ? null : wert + 1e-9;
    const davor = grenze == null ? [] : rang.filter(r =>
      oben.indexOf(r.pid || r.id) < 0 && r.wert > grenze);
    const dahinter = rang.filter(r => oben.indexOf(r.pid || r.id) < 0
                                   && (grenze == null || r.wert <= grenze))
      .slice(0, 3);
    // ── Wie weit dahinter, sieht man ──────────────────────────────────
    // Die Liste nannte Rang, Name und Wert. Ob der Zweite knapp dran ist oder
    // weit weg, muss man daraus ausrechnen — und bei „84 %" gegen „81 %"
    // gegen „62 %" ist gerade das die Aussage. Der Balken zeigt den Anteil am
    // Bestwert. Nur wo er etwas bedeutet: ein Rekord, dessen Sortierwert
    // negativ ist (weniger Gegentore ist besser), hat keinen sinnvollen
    // Anteil, und dann bleibt der Balken weg.
    const basis = (wert != null && isFinite(wert) && wert > 0
                   && dahinter.every(r => isFinite(r.wert) && r.wert >= 0)) ? wert : null;
    const zeilen = dahinter.map((r, i) => {
      const pid = r.pid || r.id;
      if(!pm[pid]) return '';
      // Kein Mindestmaß: ein aufgerundeter Balken stellte den Vierten vor den
      // Dritten, und dann sagt er das Gegenteil von dem, was er soll.
      const anteil = basis ? Math.min(100, r.wert / basis * 100) : null;
      // Der Balken steht auf EIGENER Zeile und nicht neben dem Namen: die
      // Namensspalte ist so breit, wie der Wert daneben es uebrig laesst, und
      // damit war dieselbe Prozentzahl in jeder Zeile eine andere Laenge —
      // gemessen stand der Vierte mit einem laengeren Balken als der Dritte.
      return `<div class="nd-vf-z" data-pid="${esc(pid)}">
        <span class="nd-vf-n">${oben.length + i + 1}</span>
        ${avHtml(pm[pid], '', {ins:true, px:30, feuer:0})}
        <span class="nd-vf-nm">${esc(pm[pid].name)}</span>
        <b>${esc(_chronKurz(r.ev))}</b>
        ${anteil != null
          ? `<span class="nd-vf-b"><i style="width:${anteil.toFixed(1)}%"></i></span>` : ''}
      </div>`;
    }).filter(Boolean).join('');
    // Steht jemand darueber, ist der Rekord weitergewandert. Das gehoert
    // auf die Karte, nicht verschwiegen: sonst zeigt das Blatt eine
    // Bestmarke, die es nicht mehr gibt.
    const jetzt = davor.length ? `<div class="nd-stat-row">
        <div class="nd-stat-label">Hält ihn jetzt</div>
        <div class="nd-stat-val">${esc(davor.map(r => (pm[r.pid || r.id] || {}).name)
          .filter(Boolean).join(', '))}</div></div>` : '';
    return (zeilen || jetzt) ? `<div class="nd-section">Wer dahinter liegt</div>
      ${jetzt}<div class="nd-vf">${zeilen}</div>` : '';
  } catch(e){ return ''; }
}

// Die Partien eines Tages, an denen ein Spieler beteiligt war. „Kein anderer
// holte mehr Siege" ist eine Behauptung — das Blatt zeigt sie jetzt.
function _newsTagPartien(dayKey, pid){
  if(!dayKey) return [];
  try {
    const ids = new Set((Array.isArray(pid) ? pid : [pid]).filter(Boolean));
    return matches.filter(m => {
      if(tagKey(m.created_at) !== dayKey) return false;
      return !ids.size || [m.a1, m.a2, m.b1, m.b2].some(id => ids.has(id));
    });
  } catch(e){ return []; }
}

// ── Was oben steht, steht unten nicht noch einmal ────────────────────
// Der Kopf des Blatts zeigt Schlagzeile und Text der Karte. Steht derselbe
// Satz darunter ein zweites Mal, liest man ihn zweimal und erfaehrt nichts:
// beim Angstgegner stand „5× in Folge gegen denselben Gegner" als Bedingung
// im Medaillon, und drei Zeilen darueber im Text schon „Fuenf Pleiten in
// Folge gegen Maxi". Verglichen wird ohne Auszeichnung und ohne
// Grossschreibung, damit auch eine leicht umgestellte Fassung auffaellt.
let _ndOben = '';
function _ndNormal(t){
  return String(t == null ? '' : t)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[„""»«.,;:!?()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().toLowerCase();
}
function _ndNeu(txt){
  const n = _ndNormal(txt);
  if(!n || n.length < 12) return txt;
  return _ndOben.indexOf(n) >= 0 ? '' : txt;
}

// ── Die Leiter der Liga im Blatt ─────────────────────────────────────
// Jede Stufe eine Zeile, jedes Feld mit seinem Bild und darauf die Gesichter
// derer, die es an diesem Tag trugen — höchstens drei, danach die Zahl. Die
// Zeichen stehen im Violett der Vorlage: das Blatt gehört keinem Rang.
function _ndLigaLeiter(L){
  try {
    const pm = pmap(), felder = Array.isArray(L && L.felder) ? L.felder : [];
    const zeilen = INSIGNIEN.map((ins, i) => {
      const n = (INS_ZEICHEN[ins.key] || []).length || INSIGNIUM_GRADE;
      const f = Array.from({length:n}, (_, g) => {
        const da = felder.filter(x => x[1] === i && x[2] === g && pm[x[0]]).map(x => x[0]);
        let z = '';
        try { z = insigniumStufeSvg(ins.key, INS_BILD_RANG,
                ins.key === 'stern' ? ORDENSSTERN_START + g : 0, g) || ''; } catch(e){ z = ''; }
        const gesichter = da.slice(0, 3).map(pid =>
          `<span class="nd-ll-av" data-pid="${esc(pid)}">${avHtml(pm[pid], '', {px:18})}</span>`).join('')
          + (da.length > 3 ? `<span class="nd-ll-mehr num">+${da.length - 3}</span>` : '');
        return `<span class="nd-ll-f${da.length ? ' da' : ''}">${z}`
          + (gesichter ? `<span class="nd-ll-g">${gesichter}</span>` : '') + `</span>`;
      }).join('');
      return `<div class="nd-ll-z"><div class="nd-ll-n"><b>${esc(ins.name)}</b>`
        + `<span class="num">${i === 0 ? 'Start' : 'ab ' + ins.min}</span></div>`
        + `<div class="nd-ll-r">${f}</div></div>`;
    }).join('');
    return `<div class="nd-ll">${zeilen}</div>`;
  } catch(e){ return ''; }
}

// ── Das Insignium im Blatt ───────────────────────────────────────────
// Die Karte „Stefan trägt den Schildring" öffnete ein Blatt mit NULL Zeichen
// Inhalt: kein Zeichen, keine Leiter, keine Punkte. Ausgerechnet die Story,
// die von der Stufe handelt, zeigte sie nicht. Hier steht sie jetzt groß —
// dieselbe Zeichnung wie in der Laufbahn [§C27], daneben, wie weit es zur
// nächsten ist, und darunter die Leiter aus der Karte.
function _newsInsigniumBlock(pid, stufeIdx){
  try {
    const P = prestigeOf(pid);
    if(!P) return '';
    const stufe = (stufeIdx != null && INSIGNIEN[stufeIdx]) ? stufeIdx : (P.stufe || 0);
    const ins = INSIGNIEN[stufe] || INSIGNIEN[0];
    const rangLabel = (getPlayerRank(pid) || {}).label;
    let zeichen = '';
    try { zeichen = insigniumStufeSvg(ins.key, rangLabel, P.zacken, P.grad) || ''; } catch(e){}
    const n = P.naechste;
    // Der Anteil misst die STUFE, nicht die Laufbahn: „62 % geschafft" heißt,
    // wie weit es von dieser Schwelle zur nächsten ist.
    const anteil = n ? Math.max(0, Math.min(100,
      Math.round((P.punkte - ins.min) / Math.max(1, n.min - ins.min) * 100))) : 100;
    return `<div class="nd-ins">
      <div class="nd-ins-z">${zeichen}</div>
      <div class="nd-ins-t">
        <div class="nd-ins-n">${esc(ins.name)}</div>
        <div class="nd-ins-p"><b>${P.punkte}</b> Prestige${P.platz ? ` · Platz ${P.platz} von ${P.von}` : ''}</div>
        ${n ? `<div class="nd-ins-b"><i style="width:${anteil}%"></i></div>
          <div class="nd-ins-r">Noch <b>${P.fehlt}</b> bis zum ${esc(n.name)} · ${anteil} %</div>`
            : `<div class="nd-ins-r">Die letzte Stufe. Der Stern zählt weiter: noch
               <b>${P.naechsteZacke}</b> bis zur nächsten Zacke.</div>`}
      </div>
    </div>${_newsLeiter(pid)}`;
  } catch(e){ return ''; }
}

// Welche Partie steht schon im Kopf? Die Mitte darf sie dann nicht noch
// einmal zeigen: das Blatt trug dieselbe Begegnung zweimal untereinander,
// oben als Ergebnis und darunter als Match-Block.
let _ndKopfMatch = null;
// Steht das Insignium schon als Block in der Mitte? Dann nennt der Kopf es
// nicht noch einmal als Text.
let _ndZeichenUnten = false;

// Kopf und typ-eigene Mitte. Das Blatt endet danach direkt beim eindeutigen
// Schließen-Knopf; Profil- und Rückblick-Sprünge verdoppelten die Navigation.
function _newsDetailBody(s){
  const d = s.dataRef || {};
  // Die Mitte wird ZUERST gebaut. Nur so weiss der Kopf, ob das Zeichen schon
  // unten steht: sonst nannte er „Reif · 168 Prestige" und der Block darunter
  // sagte dasselbe noch einmal, mit Bild.
  _ndKopfMatch = d.matchId || null;
  _ndBlattJetzt = null;
  _ndOben = _ndNormal((s.title || '') + ' ' + (s.desc || ''));
  let mitte = '';
  try { mitte = _newsDetailMitte(s) || ''; } catch(e){ mitte = ''; }
  _ndKopfMatch = null;
  _ndOben = '';
  _ndZeichenUnten = mitte.indexOf('nd-ins') >= 0;
  const kopf = _newsBlattKopf(s);
  _ndZeichenUnten = false;
  return kopf + mitte;
}

// ── Der Spieltag als Bahn ────────────────────────────────────────────
// Das Blatt des Spielers des Tages zeigte jede Partie als vollen Vs-Block:
// vier Wappen, zwei Namenszeilen, ein Stand. An einem Tag mit zehn Partien
// sind das zehn solche Bloecke und vierzig Wappen — „Detail folgt der Groesse"
// warnt genau davor [§6]. Die Bahn zeigt den Tag dagegen in einer Zeile: ein
// Feld je Partie, gruen fuer einen Sieg, rot fuer eine Niederlage, in
// Spielreihenfolge. Darunter steht jede Partie kurz mit Uhrzeit, Stand und
// Gegner — das ist der Beleg, ohne die Wand.
function _ndTagesbahn(pid, liste, nurBahn){
  try {
    const ids = (Array.isArray(pid) ? pid : [pid]).filter(Boolean);
    if(!ids.length || !liste || !liste.length) return '';
    const haupt = ids[0];
    const pm = pmap();
    const reihe = liste.slice().sort((a, b) => mts(a) - mts(b));
    const sieg = m => {
      const aSeite = (m.a1 === haupt || m.a2 === haupt);
      return aSeite ? m.winner === 'A' : m.winner === 'B';
    };
    const dabei = m => [m.a1, m.a2, m.b1, m.b2].indexOf(haupt) >= 0;
    const eigene = reihe.filter(dabei);
    if(!eigene.length) return '';
    const felder = eigene.map(m => {
      const s = sieg(m);
      const hoch = Math.max(Number(m.score_a) || 0, Number(m.score_b) || 0);
      const tief = Math.min(Number(m.score_a) || 0, Number(m.score_b) || 0);
      return `<i class="${s ? 'w' : 'l'}">${s ? hoch + ':' + tief : tief + ':' + hoch}</i>`;
    }).join('');
    const zeilen = eigene.map(m => {
      const s = sieg(m);
      const aSeite = (m.a1 === haupt || m.a2 === haupt);
      const mit = (aSeite ? [m.a1, m.a2] : [m.b1, m.b2]).filter(x => x && x !== haupt);
      const geg = (aSeite ? [m.b1, m.b2] : [m.a1, m.a2]).filter(Boolean);
      const nm = x => (pm[x] && pm[x].name) || '?';
      const hoch = Math.max(Number(m.score_a) || 0, Number(m.score_b) || 0);
      const tief = Math.min(Number(m.score_a) || 0, Number(m.score_b) || 0);
      return `<div class="nd-tm ${s ? 'w' : 'l'}" data-mid="${esc(m.id)}">
        <span class="nd-tm-u">${esc(_newsUhrzeit(mts(m)))}</span>
        <span class="nd-tm-s">${s ? hoch + ':' + tief : tief + ':' + hoch}</span>
        <span class="nd-tm-g">${mit.length ? 'mit ' + esc(nm(mit[0])) + ', ' : ''}gegen ${
          esc(geg.map(nm).join(' & '))}</span>
      </div>`;
    }).join('');
    // Der Rückblick des Tages zeigt nur die Bahn: die Partien stehen dort
    // schon in den Höhepunkten.
    if(nurBahn) return `<div class="nd-bahn">${felder}</div>`;
    return `<div class="nd-bahn">${felder}</div><div class="nd-tml">${zeilen}</div>`;
  } catch(e){ return ''; }
}

// ── Die Wirkung auf die Laufbahn, gezeichnet ─────────────────────────
// Sie stand als Zeile da: „1205 → 1240 Prestige". Zwei Zahlen, die man erst
// lesen und dann verrechnen muss, und bei neun Zeilen darueber weiss niemand
// mehr, was daran ausschlaggebend war. Der Balken zeigt es: die Strecke von
// dieser Insignium-Schwelle zur naechsten, darin heller, was der Spieltag
// dazugelegt hat. Daneben der Zuwachs als Zahl und das Zeichen der Stufe.
//
// Gerechnet wird mit den GESPEICHERTEN Staenden und nicht mit `prestigeOf`:
// eine Karte von vorletzter Woche erzaehlt vom Stand von damals [§C31].
//
// ── Und sie zeigt, was verloren ging ──────────────────────────────────
// Jane zog bei „Der Lauf" mit Leon gleich, und Leon teilt den Rekord
// seitdem: sein Anteil halbiert sich, sein Prestige sinkt. Im Blatt stand
// bei ihm „±0" — ein Minus wurde als Null gezeigt, und der Balken kannte nur
// den Zuwachs. Ein Verlust steht jetzt rot da [§C25]: die Zahl mit Minus,
// das verlorene Stück als eigener Abschnitt im Balken, und fällt jemand
// unter eine Schwelle, sagt die Zeile „fällt auf …". Darunter steht, warum:
// welcher Rekord geteilt, verloren oder geholt wurde (`gruende`).
//
// Die Stufe kommt aus den Punkten und nicht aus der gespeicherten Zahl
// (`insigniumStufeVon`): die gespeicherte gehörte einer älteren Leiter.
function _ndWirkungBlock(je, gruende){
  const ids = Object.keys(je || {});
  if(!ids.length) return '';
  const pm = pmap();
  const hat = typeof INSIGNIEN !== 'undefined' && typeof insigniumStufeVon === 'function';
  const dl = pid => Math.round(Number(je[pid].nach) || 0) - Math.round(Number(je[pid].vor) || 0);
  // Der groesste Zuwachs zuerst: er ist das, was den Tag ausmacht. Wer
  // verloren hat, steht darunter.
  return ids.sort((a, b) => dl(b) - dl(a))
    .map(pid => {
      const w = je[pid];
      const nach = Math.round(Number(w.nach) || 0);
      const vor = Math.round(Number(w.vor) || 0);
      const delta = nach - vor;
      const sn = hat ? insigniumStufeVon(nach) : null;
      const sv = hat ? insigniumStufeVon(vor) : null;
      const ins = sn != null ? INSIGNIEN[sn] : null;
      const next = sn != null ? INSIGNIEN[sn + 1] : null;
      const auf = sn != null && sn > sv;
      const ab = sn != null && sn < sv;
      let zeichen = '';
      try {
        if(ins && typeof insigniumStufeSvg === 'function')
          zeichen = insigniumStufeSvg(ins.key, (getPlayerRank(pid) || {}).label, 0, 0) || '';
      } catch(e){}
      // Die Strecke ist die STUFE, nicht die Laufbahn: „noch 460 bis zum
      // Lorbeerreif" ist die Frage, die ein Traeger hat [§C30].
      let balken = '', rest = '';
      if(ins && next){
        const spanne = Math.max(1, next.min - ins.min);
        const lage = x => Math.max(0, Math.min(100, (x - ins.min) / spanne * 100));
        const bis = lage(nach);
        // Beim Aufstieg liegt der alte Stand unter dieser Schwelle, beim Fall
        // darüber: dann ist die ganze Strecke Zuwachs bzw. Verlust.
        const war = auf ? 0 : ab ? 100 : lage(vor);
        const fest = Math.min(bis, war);
        balken = `<span class="nd-wk-b"><i style="width:${fest.toFixed(1)}%"></i>`
          + (delta >= 0
              ? `<em style="width:${Math.max(0, bis - fest).toFixed(1)}%"></em>`
              : `<u style="width:${Math.max(0, war - fest).toFixed(1)}%"></u>`)
          + `</span>`;
        rest = ab
          ? `${nach} Prestige · noch ${Math.max(0, INSIGNIEN[sv].min - nach)} zurück zum ${esc(INSIGNIEN[sv].name)}`
          : `${nach} Prestige · noch ${Math.max(0, next.min - nach)} bis zum ${esc(next.name)}`;
      } else if(ins){
        rest = `${nach} Prestige · die letzte Stufe`;
      } else {
        rest = `${nach} Prestige`;
      }
      const marke = !ins ? ''
        : auf ? `<em>${esc('neu: ' + ins.name)}</em>`
        : ab ? `<em class="r">${esc('fällt auf ' + ins.name)}</em>`
        : `<em>${esc(ins.name)}</em>`;
      const gr = ((gruende && gruende[pid]) || []);
      const chips = gr.slice(0, 3).map(g => `<span class="nd-wk-g ${g.neg ? 'r' : 'g'}">${
        esc(g.verb)} <b>${esc(g.name)}</b></span>`).join('')
        + (gr.length > 3 ? `<span class="nd-wk-g">+${gr.length - 3}</span>` : '');
      const dz = delta > 0 ? '+' + delta : delta < 0 ? '−' + Math.abs(delta) : '±0';
      return `<div class="nd-wk${delta < 0 ? ' neg' : ''}${ab ? ' fall' : ''}" data-pid="${esc(pid)}" style="cursor:pointer">
        ${zeichen ? `<span class="nd-wk-z">${zeichen}${ab
          ? `<i class="nd-wk-ab">${svgI('trendDown')}</i>` : auf
          ? `<i class="nd-wk-auf">${svgI('trendUp')}</i>` : ''}</span>` : ''}
        <span class="nd-wk-t">
          <span class="nd-wk-n"><b>${esc((pm[pid] && pm[pid].name) || '?')}</b>${marke}</span>
          ${balken}
          <span class="nd-wk-r">${rest}</span>
          ${chips ? `<span class="nd-wk-gs">${chips}</span>` : ''}
        </span>
        <span class="nd-wk-d ${delta > 0 ? 'g' : delta < 0 ? 'r' : ''}">${dz}</span>
      </div>`;
    }).join('');
}

// Warum sich die Laufbahn eines Spielers an diesem Tag bewegt hat, aus den
// Zeilen eines Tafel-Moments: wer einen Rekord oder eine Chronik geholt,
// geteilt oder verloren hat. Die Zeilen tragen dafür die Halter vor und nach
// dem Tag; ohne sie (ältere Läufe) bleibt die Liste leer.
function _ndWirkungsGruende(teile){
  const out = {};
  const dazu = (pid, g) => { (out[pid] = out[pid] || []).push(g); };
  (teile || []).forEach(t => {
    const nach = t.halter || [], vor = t.vorher || [];
    const name = t.rname || '';
    if(!name || (!nach.length && !vor.length)) return;
    nach.forEach(pid => {
      if(vor.indexOf(pid) < 0) dazu(pid, {verb: vor.length ? 'übernimmt' : 'holt', name, neg:false});
      else if(nach.length < vor.length) dazu(pid, {verb:'hält allein', name, neg:false});
    });
    vor.forEach(pid => {
      if(nach.indexOf(pid) < 0) dazu(pid, {verb:'verliert', name, neg:true});
      else if(nach.length > vor.length) dazu(pid, {verb:'teilt', name, neg:true});
    });
  });
  // Ein Verlust zuerst: er erklärt das Minus daneben.
  Object.keys(out).forEach(pid => out[pid].sort((a, b) => b.neg - a.neg));
  return out;
}

// ── Die Siegchance als Skala ─────────────────────────────────────────
// „57 %" ist eine Zahl, die man erst lesen und dann einordnen muss: war das
// ein Pflichtsieg oder eine Sensation? Die Elo-Rechnung hat dafuer vier
// Linien [§5.2], und sie stehen an EINER Stelle. Der Balken zeigt, wo die
// Partie darin lag, und die Aufschrift nennt das Wort dazu.
function _ndChanceSkala(chance){
  const c = Number(chance);
  if(!isFinite(c) || c <= 0 || c >= 1) return '';
  const pct = Math.max(1, Math.round(c * 100));
  const wort = chanceWort(c);
  // Rot nur, wo die Rechnung dagegenstand: Gruen und Rot sind die Richtung
  // [§C25], Metall ist alles Uebrige.
  const ton = c < CHANCE_UPSET ? ' r' : (c >= CHANCE_FAVORIT ? ' g' : '');
  const linien = [CHANCE_SENSATION, CHANCE_UPSET, CHANCE_FAVORIT]
    .map(x => `<u style="left:${Math.round(x * 100)}%"></u>`).join('');
  return `<div class="nd-chance${ton}">
    <div class="nd-chance-b">${linien}<i style="width:${pct}%"></i></div>
    <div class="nd-chance-z"><span>Siegchance vor dem Anstoß</span>
      <span><b>${pct} %</b> · ${esc(wort)}</span></div>
  </div>`;
}

// ── Die Elo-Wirkung je Spieler ───────────────────────────────────────
// Vier Zahlen untereinander sagen nicht, wer am meisten gewonnen und wer am
// meisten verloren hat. Der Balken zeigt den Ausschlag, die Mitte ist die
// Null, und der Rang dahinter sagt, was die Partie in der Tabelle bewegt hat.
function _ndEloWirkung(matchId, pids){
  try {
    const liste = (pids || []).map(pid => ({pid, d: _newsEloDelta(pid, matchId)}))
      .filter(x => x.d != null);
    if(!liste.length) return '';
    const max = Math.max.apply(null, liste.map(x => Math.abs(x.d))) || 1;
    const pm = pmap();
    return liste.sort((a, b) => b.d - a.d).map(x => {
      const breit = Math.max(4, Math.round(Math.abs(x.d) / max * 50));
      const rk = _newsRankChange(x.pid, matchId);
      // Nur ein WECHSEL ist eine Aussage. „6 → 6" ist keine.
      const rang = (rk && rk.pre !== rk.post)
        ? `<em>Rang ${rk.pre} → ${rk.post}</em>` : '';
      return `<div class="nd-elo" data-pid="${esc(x.pid)}" style="cursor:pointer">
        <span class="nd-elo-n">${esc((pm[x.pid] && pm[x.pid].name) || '?')}</span>
        <span class="nd-elo-b"><i class="${x.d >= 0 ? 'p' : 'n'}" style="width:${breit}%"></i></span>
        <span class="nd-elo-v ${x.d >= 0 ? 'g' : 'r'}">${x.d >= 0 ? '+' : ''}${x.d}</span>
        ${rang}
      </div>`;
    }).join('');
  } catch(e){ return ''; }
}

// ── Die Blätter einer Serie [§C33] ──────────────────────────────────
// Sie zeigten die Serie als Reihe von Punkten und darunter Zahlen in
// Zeilen („Gemeinsame Bilanz bis hierher", „Tore 411:564"), und welche
// Partien die Serie waren, stand nirgends. Jetzt trägt die Bühne Gesicht,
// Zahl, Lauf und Zeitraum, und darunter steht jede Partie der Serie.
// Die Partien eines Laufs: die letzten n eigenen bis zu dieser, bei einem
// Duo nur die gemeinsamen auf derselben Seite.
function _ndLauf(pid, partner, bis, n){
  let l = _spEigene(pid, bis);
  if(partner) l = l.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(partner) && _spSeite(y, pid) === _spSeite(y, partner));
  return l.slice(-Math.max(1, n));
}
// Eine Liste solcher Zeilen: der Tag steht nur an der ersten Partie des
// Tages, zehnmal „25.08." untereinander sagt nichts.
function _ndPartieListe(l, fuer){
  return `<div class="nd-pzl">${l.map((y, k) => _ndPartieZeile(y, fuer, k, !k || tagKey(l[k - 1].created_at) !== tagKey(y.created_at))).join('')}</div>`;
}
// Eine Partie in einer Zeile aus Sicht dessen, um den es geht: Tag, die
// eigene Seite, der Stand mit den eigenen Toren zuerst, die Gegner.
function _ndPartieZeile(y, fuer, k, tagNeu){
  const w = _spGew(y, fuer), eig = _spTeam(y, _spSeite(y, fuer)), geg = _spTeam(y, _spSeite(y, fuer) === 'A' ? 'B' : 'A');
  const t = _spSeite(y, fuer) === 'A' ? [y.score_a, y.score_b] : [y.score_b, y.score_a];
  return `<div class="nd-pz ${w ? 'w' : 'l'}" data-mid="${esc(y.id)}" style="--k:${k || 0}">`
    + `<span class="nd-pz-t num">${tagNeu !== false ? `<small>${esc(datumFmt(y.created_at, 'tm'))}</small>` : ''}${esc(datumFmt(y.created_at, 'uhr'))}</span>${_spChips(eig)}`
    + `<b class="num">${t[0]}:${t[1]}</b><span class="nd-pz-gg">gegen</span>${_spChips(geg)}</div>`;
}
function _ndSerieBuehne(ids, n, neg, lauf, duo){
  const pm = pmap();
  const gesicht = duo ? `<span class="nd-sr-duo">${ids.map(_spChip).join('')}</span>`
    : (pm[ids[0]] ? avHtml(pm[ids[0]], '', {ins:true, px:64, feuer:0}) : '');
  const von = lauf.length ? datumFmt(lauf[0].created_at, 'tm') : '', bis = lauf.length ? datumFmt(lauf[lauf.length - 1].created_at, 'tm') : '';
  return `<div class="nd-buehne nd-sr${neg ? ' neg' : ''}"><div class="nd-sr-k">${gesicht}`
    + `<div class="nd-sr-z"><b class="num">${_spZahl(n)}</b><span>${neg ? (n === 1 ? 'Niederlage' : 'Niederlagen') : (n === 1 ? 'Sieg' : 'Siege')} in Folge</span>`
    + `<em>${esc(_namenListe(ids.map(_spName)))}</em></div></div>`
    + _newsSerienBand(n, neg, !neg)
    + (von ? `<div class="nd-sr-d num"><span>${esc(von)}</span><span>${esc(bis)}</span></div>` : '') + `</div>`;
}
// Wie oft jeder Partner dabei war, als Balken.
function _ndPartnerBalken(pid, lauf){
  const z = {};
  lauf.forEach(y => { const p = _spTeam(y, _spSeite(y, pid)).find(id => id !== pid); if(p) z[p] = (z[p] || 0) + 1; });
  const ids = Object.keys(z).sort((a, b) => z[b] - z[a]);
  // Lauter „1×" sagen nichts: die Zeile kommt erst, wenn einer öfter dabei war.
  if(ids.length < 2 || z[ids[0]] < 2) return '';
  const max = z[ids[0]];
  return `<div class="nd-bk">${ids.map((id, k) => `<div class="nd-bk-z" data-pid="${esc(id)}" style="--k:${k}">${_spChip(id)}`
    + `<span class="nd-bk-n">${esc(_spName(id))}</span><span class="nd-bk-b"><i style="width:${Math.round(z[id] / max * 100)}%"></i></span>`
    + `<b class="num">${z[id]}×</b></div>`).join('')}</div>`;
}
// Die Siegquote jedes der beiden mit dem anderen und mit allen übrigen
// Partnern, bis zu dieser Partie.
function _ndZusammenGetrennt(a, b, bis){
  const q = (pid, mit) => { const l = _spEigene(pid, bis), z = l.filter(y => [y.a1, y.a2, y.b1, y.b2].includes(mit) && _spSeite(y, pid) === _spSeite(y, mit));
    const o = l.filter(y => z.indexOf(y) < 0);
    return {mit:Math.round(z.filter(y => _spGew(y, pid)).length / Math.max(1, z.length) * 100), ohne:Math.round(o.filter(y => _spGew(y, pid)).length / Math.max(1, o.length) * 100)}; };
  const zeile = (wort, v, kl) => `<div class="nd-zg-r"><span>${wort}</span><span class="nd-zg-b"><i class="${kl}" style="width:${v}%"></i></span><b class="num">${v} %</b></div>`;
  return `<div class="nd-zg">${[[a, b], [b, a]].map(([p, o], k) => { const x = q(p, o);
    return `<div class="nd-zg-p" data-pid="${esc(p)}" style="--k:${k}"><div class="nd-zg-n">${_spChip(p)}<b>${esc(_spName(p))}</b></div>`
      + zeile('zusammen', x.mit, x.mit < x.ohne ? 'r' : 'g') + zeile('mit anderen', x.ohne, '') + `</div>`; }).join('')}</div>`;
}
// Was nach der letzten Partie des Laufs kam: die nächste eigene Partie.
function _ndWieWeiter(pid, partner, m){
  const l = matchesOfPlayer(pid, matches);
  const nach = l.slice(l.indexOf(m) + 1).find(y => !partner || ([y.a1, y.a2, y.b1, y.b2].includes(partner) && _spSeite(y, pid) === _spSeite(y, partner)));
  return nach ? _ndPartieZeile(nach, pid) : '';
}
function _ndSerieBlatt(s){
  const d = s.dataRef || {}, t = d.type;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m) return null;
  const ab = (ti, html) => html ? `<div class="nd-section">${esc(ti)}</div>${html}` : '';
  if(t === 'streak_killer'){
    const lauf = _ndLauf(d.victimPid, null, m, d.streak + 1);
    return {kopf:`<div class="nd-buehne">${_spRissBild(_spRissDaten({m, x:{victimPid:d.victimPid, streak:d.streak}}))}</div>`,
      mitte:ab('Die Serie, die riss', _ndPartieListe(lauf, d.victimPid))
        + ab('Die Brecher gegen ' + _spName(d.victimPid), _ndDuelle(m, g => g.l === d.victimPid))};
  }
  const duo = t === 'team_streak' || t === 'team_loss_streak';
  const neg = t === 'loss_streak' || t === 'team_loss_streak';
  const pid = duo ? d.a : d.pid, partner = duo ? d.b : null;
  if(!pid || !d.streak) return null;
  const lauf = _ndLauf(pid, partner, m, d.streak);
  let marken = '';
  if(t === 'win_streak'){ try { marken = _spSerieBild(_spSerieDaten({m:lauf[0], x:{pid, streak:d.streak}})); } catch(e){} }
  return {kopf:_ndSerieBuehne(duo ? [d.a, d.b] : [pid], d.streak, neg, lauf, duo),
    mitte:ab('Gegen die Bestmarken', marken)
      + ab(neg ? 'Niederlage für Niederlage' : 'Sieg für Sieg', _ndPartieListe(lauf, pid))
      + (duo ? ab('Zusammen und getrennt', _ndZusammenGetrennt(d.a, d.b, m)) : ab('Mit wem', _ndPartnerBalken(pid, lauf)))
      + ab('Die nächste Partie', _ndWieWeiter(pid, partner, m))};
}

// ── Das Blatt einer Rivalität [§C33] ────────────────────────────────
// Es zeigte zwei Gesichter mit „55 Siege" darunter und das Jubiläumsduell
// als Band; wie es zu der Bilanz kam, stand nirgends. Die Bühne trägt jetzt
// beide und die Zahl der Duelle, darunter das Tauziehen der Bilanz, dann
// den Verlauf, die letzten dreißig und die deutlichsten auf jeder Seite.
// Gezählt wird bis zur Partie der Karte.
function _ndRivalBlatt(s){
  const d = s.dataRef || {}, a = d.a, b = d.b, pm = pmap();
  if(!a || !b || !pm[a] || !pm[b]) return null;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  let l = _spEigene(a, m || undefined).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) !== _spSeite(y, b));
  if(!m) l = matchesOfPlayer(a, matches).filter(y => [y.a1, y.a2, y.b1, y.b2].includes(b) && _spSeite(y, a) !== _spSeite(y, b));
  if(!l.length) return null;
  const f = l.map(y => _spGew(y, a)), sa = f.filter(Boolean).length, n = l.length;
  const seite = id => `<div class="nd-rv-p" data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:64, feuer:0})}<b>${esc(_spName(id))}</b></div>`;
  const kopf = `<div class="nd-buehne nd-rv">${seite(a)}<div class="nd-rv-m"><b class="num">${_spZahl(n)}</b><span>Duelle</span></div>${seite(b)}`
    + `<div class="nd-rv-tau"><b class="num">${_spZahl(sa)}</b><span class="nd-rv-tb"><i style="width:${(sa / n * 100).toFixed(1)}%"></i></span><b class="num">${_spZahl(n - sa)}</b></div></div>`;
  // Der Verlauf: jede Begegnung schiebt die Linie, über der Null führt a.
  let k = 0;
  const v = [0].concat(f.map(w => (k += w ? 1 : -1)));
  const lo = Math.min(...v, 0), hi = Math.max(...v, 0), W = 300, H = 96;
  const X = i => 4 + i / Math.max(1, v.length - 1) * (W - 8), Y = x => 8 + (1 - (x - lo) / Math.max(1, hi - lo)) * (H - 16);
  const linie = `<div class="nd-li"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`
    + `<polyline points="${v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ')}"/>`
    + `<circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="3.5"/></svg>`
    + `<span class="nd-li-o">${esc(_spName(a))} vorn</span><span class="nd-li-u">${esc(_spName(b))} vorn</span></div>`;
  const letzte = f.slice(-30);
  const lauf = `<div class="nd-lf gross">${letzte.map((w, j) => `<i class="${w ? 'w' : 'l'}${j === letzte.length - 1 && m ? ' dies' : ''}"></i>`).join('')}</div>`;
  const deutlich = w => l.filter(y => _spGew(y, a) === w).sort((p, q) => Math.abs(q.score_a - q.score_b) - Math.abs(p.score_a - p.score_b))[0];
  const dl = [deutlich(true), deutlich(false)].filter(Boolean);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:(m ? ab('Das ' + n + '. Duell', _ndPartieListe([m], a)) : '')
    + ab('Wer wann vorn lag', n >= 3 ? linie : '')
    + ab(letzte.length < n ? 'Die letzten ' + letzte.length : 'Jedes Duell', lauf)
    + ab('Die deutlichsten', dl.length ? _ndPartieListe(dl, a) : '')};
}

// ── Das Blatt einer Auszeichnung [§C33] ─────────────────────────────
// Das Medaillon stand unter einem Band der Partie und dem Wappen, darunter
// „Elo aus dieser Partie" — eine Zahl, die mit der Auszeichnung nichts zu tun
// hat. Jetzt steht das Medaillon mit den Gesichtern als Bühne, darunter die
// Partie, in der sie geholt wurde, und jeder Spieler der Liga als Feld: hell,
// wer sie trägt. Die Zahl der Halter steht damit gezeichnet und nicht
// zusätzlich als Satz im Medaillon.
function _ndBadgeBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const pids = ((Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId]).filter(id => pm[id]);
  if(!pids.length || !d.badgeId) return null;
  const bdef = (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === d.badgeId) : null;
  const medaille = _newsMedaillon(s.ic || (bdef && bdef.ic) || 'medal', d.rarity,
    d.badgeName || (bdef && bdef.name) || '', bdef ? bdef.desc : '', null);
  const kopf = `<div class="nd-buehne nd-bd">${medaille}<div class="nd-bd-w">${pids.slice(0, 4).map(id =>
    `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:52, feuer:0})}<b>${esc(_spName(id))}</b></span>`).join('')}</div></div>`;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  const alle = Object.keys(pm).filter(id => sichtbar(pm[id]));
  const hat = id => (getCachedBadges(id) || []).some(b => b.id === d.badgeId);
  const traeger = alle.filter(hat).length;
  const feld = `<div class="nd-tg">${alle.sort((x, y) => hat(y) - hat(x)).map((id, k) => `<span class="${hat(id) ? 'hat' : ''}${pids.includes(id) ? ' dies' : ''}" data-pid="${esc(id)}" style="--k:${k}">`
    + `${_spChip(id)}<small>${esc(_spName(id))}</small></span>`).join('')}</div>`;
  const nem = d.nemesisOppId && pm[d.nemesisOppId] && _ndNormal(_ndOben).indexOf(_ndNormal(_spName(d.nemesisOppId))) < 0
    ? `<div class="nd-stat-row" data-pid="${esc(d.nemesisOppId)}" style="cursor:pointer"><div class="nd-stat-label">Gegen wen</div>`
      + `<div class="nd-stat-val neg">${esc(_spName(d.nemesisOppId))} ›</div></div>` : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Geholt in dieser Partie', m ? _ndPartieListe([m], pids[0]) : '') + nem
    + ab(traeger === 1 ? 'Nur einer trägt sie' : traeger + ' von ' + alle.length + ' tragen sie', traeger ? feld : '')};
}

// ── Das Blatt eines Liga-Rekords [§C33] ─────────────────────────────
// Es zeigte den Wert groß, darunter „Vorher gehalten von Leon ›" als Zeile
// und unter „Für die Laufbahn" je Halter einen Rechentext („Aktuelle Form ·
// Grundwert 150 ÷ 4 Halter · 18. Rekord ÷ √7 · 20 Rekorde: 1450 → 1465").
// Die Bühne zeigt jetzt den Wechsel als Bild — wer ihn vorher hielt, wer
// jetzt — und den Wert, beim Ausbau den alten durchgestrichen davor. Die
// Wirkung steht gezeichnet wie an der Tafel: Stufe, Zuwachs oder Verlust
// und der Weg zur nächsten Schwelle. Die Rechnung der Quelle steht im
// Laufbahn-Blatt, wohin jede Zeile führt.
function _ndRekordBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const neu = ((Array.isArray(d.halter) && d.halter.length) ? d.halter : (d.playerIds || [])).filter(id => pm[id]);
  if(!neu.length) return null;
  const vorRoh = (Array.isArray(d.vorher) ? d.vorher : []).filter(id => pm[id]);
  // Als Vorgänger steht nur, wer wirklich weg ist [§C33].
  const weg = vorRoh.filter(id => neu.indexOf(id) < 0);
  const def = (typeof CHRONICLE_BY_ID !== 'undefined') ? CHRONICLE_BY_ID[d.rekordId] : null;
  const wert = _chronKurz(d.ev);
  const alt = d.type === 'rekord_gesteigert' && d.evVorher ? _chronKurz(d.evVorher) : '';
  const kopf = _ndWechselBuehne({neu, weg, wert, alt, metall:!!d.zufall,
    label:d.kammerLabel || 'Bestmarke', name:d.rekordName || (def && def.name) || ''});
  // Die Wirkung aus den gespeicherten Ständen: eine Karte von vorletzter
  // Woche erzählt vom Stand von damals [§C31]. Ohne Stände (ältere Läufe)
  // steht, was der Rekord heute bringt, und kein Zuwachs.
  const lb = d.laufbahn || {}, je = {};
  Object.keys(lb).forEach(id => { if(pm[id] && lb[id] && lb[id].vor != null && lb[id].nach != null) je[id] = lb[id]; });
  let wirkung = '';
  if(Object.keys(je).length){
    wirkung = _ndWirkungBlock(je, _ndWirkungsGruende([{halter:neu, vorher:vorRoh, rname:d.rekordName || (def && def.name) || ''}]));
  } else {
    wirkung = neu.map(id => { let q = null;
      try { q = ((prestigeTabelle().byPid[id] || {}).quellen || []).find(x => x.q === 'rekord' && x.id === d.rekordId) || null; } catch(e){}
      return q ? `<div class="nd-stat-row" data-pid="${esc(id)}" style="cursor:pointer"><div class="nd-stat-label">${esc(_spName(id))}</div>`
        + `<div class="nd-stat-val acid">${esc(komma(q.p).replace(',0', ''))} Prestige aus diesem Rekord ›</div></div>` : ''; }).join('');
  }
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:(_ndNeu(d.cond) ? `<div class="tnote nd-rk-c">${esc(d.cond)}</div>` : '')
    // Alle Halter, nicht `playerIds`: die nennen höchstens drei, und der
    // vierte stand dann als Verfolger unter seinem eigenen Rekord.
    + _newsVerfolger(d.rekordId, neu, d.wert)
    + belegHtml({ev:d.ev})
    + ab('Wirkung auf die Laufbahn', wirkung)
    + (def ? `<button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>` : '')};
}

// ── Der Spieler des Tages [§C33] ────────────────────────────────────
// Unter dem Wappen standen zwei Kacheln „67 %" und „6 : 3", die der Satz
// darüber schon nennt. Die Bühne trägt jetzt Krone, Wappen und die Elo des
// Tages als Kurve über der Bahn; darunter das Feld des Tages — jeder, der
// gespielt hat, nach Siegen — und seine Partien.
function _ndPotdBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const pids = ((Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId]).filter(id => pm[id]);
  if(!pids.length || !d.dayKey) return null;
  const pid = pids[0];
  let kurve = '';
  try { kurve = _spTagBild(_spTagDaten(Object.assign({}, s, {dataRef:Object.assign({}, d, {playerId:pid})}))); } catch(e){}
  const kopf = `<div class="nd-buehne nd-pt"><div class="nd-pt-k"><span class="nd-pt-kr">${svgI('crown')}</span>`
    + pids.slice(0, 3).map(id => `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px:72, feuer:0})}</span>`).join('')
    + `</div><b class="nd-pt-n">${esc(_namenListe(pids.map(_spName)))}</b>${kurve}</div>`;
  const tag = (_spFormBasis().tage.get(d.dayKey) || []);
  const feld = {};
  tag.forEach(y => [y.a1, y.a2, y.b1, y.b2].forEach(id => { if(!pm[id]) return; feld[id] = feld[id] || {s:0, n:0}; feld[id].n++; if(_spGew(y, id)) feld[id].s++; }));
  const ids = Object.keys(feld).sort((a, b) => feld[b].s - feld[a].s || feld[b].s / feld[b].n - feld[a].s / feld[a].n);
  const max = Math.max(1, ...ids.map(id => feld[id].n));
  const balken = ids.length > 1 ? `<div class="nd-bk nd-ft">${ids.map((id, k) => `<div class="nd-bk-z${pids.includes(id) ? ' hell' : ''}" data-pid="${esc(id)}" style="--k:${k}">${_spChip(id)}`
    + `<span class="nd-bk-n">${esc(_spName(id))}</span><span class="nd-bk-b"><i style="width:${Math.round(feld[id].n / max * 100)}%"><u style="width:${Math.round(feld[id].s / feld[id].n * 100)}%"></u></i></span>`
    + `<b class="num">${feld[id].s} von ${feld[id].n}</b></div>`).join('')}</div>` : '';
  const liste = _newsTagPartien(d.dayKey, pids);
  const bahn = _ndTagesbahn(pids, liste);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Das Feld des Tages', balken) + ab(pids.length > 1 ? 'Der Tag der Tagessieger' : 'Der Tag in Partien', bahn)};
}

// ── Der Endspurt der Saison [§C33] ──────────────────────────────────
// Zwei Buchstaben-Kreise mit „11 Elo Diff" dazwischen und darunter
// „Verbleibend 6 Tage" als Zeile. Die Bühne zeigt die verbleibenden Tage als
// Ring, die beiden mit Wappen und Elo und den Abstand als Balken; darunter
// der Abstand Tag für Tag.
function _ndEndspurtBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), a = d.leader, b = d.second;
  if(!a || !b || !pm[a.pid] || !pm[b.pid]) return null;
  let h = null; try { h = getSeasonPositionHistory(d.sid); } catch(e){}
  const tage = (h && (h.totalDays || (h.eloByDay && h.eloByDay[a.pid] || []).length)) || 31;
  const zeile = (x, k) => `<div class="nd-es-z" data-pid="${esc(x.pid)}"><span class="nd-es-r num">${k}.</span>${avHtml(pm[x.pid], '', {ins:true, px:48, feuer:0})}`
    + `<b>${esc(_spName(x.pid))}</b><span class="num">${_spZahl(x.elo)} Elo</span></div>`;
  const kopf = `<div class="nd-buehne nd-es"><div class="nd-es-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="g"/>`
    + `<circle cx="40" cy="40" r="34" class="f" pathLength="1" style="stroke-dasharray:${Math.max(0, Math.min(1, 1 - d.daysLeft / tage)).toFixed(3)} 1"/></svg>`
    + `<b class="num">${d.daysLeft}</b><span>${d.daysLeft === 1 ? 'Tag' : 'Tage'}</span></div>`
    + `<div class="nd-es-r2">${zeile(a, 1)}<div class="nd-es-gap"><span><i style="width:${Math.min(100, d.gap / 100 * 100).toFixed(0)}%"></i></span><b class="num">${_spZahl(d.gap)} Elo</b></div>${zeile(b, 2)}</div></div>`;
  let linie = '';
  try {
    const ea = (h.eloByDay || {})[a.pid] || [], eb = (h.eloByDay || {})[b.pid] || [];
    const v = ea.map((x, i) => x != null && eb[i] != null ? x - eb[i] : null).filter(x => x != null);
    if(v.length >= 3){
      const lo = Math.min(...v, 0), hi = Math.max(...v, 0), W = 300, H = 90;
      const X = i => 4 + i / Math.max(1, v.length - 1) * (W - 8), Y = x => 8 + (1 - (x - lo) / Math.max(1, hi - lo)) * (H - 16);
      linie = `<div class="nd-li"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>`
        + `<polyline points="${v.map((x, i) => X(i).toFixed(1) + ',' + Y(x).toFixed(1)).join(' ')}"/><circle cx="${X(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="3.5"/></svg>`
        + `<span class="nd-li-o">${esc(_spName(a.pid))} vorn</span><span class="nd-li-u">${esc(_spName(b.pid))} vorn</span></div>`;
    }
  } catch(e){}
  return {kopf, mitte:linie ? `<div class="nd-section">Der Abstand Tag für Tag</div>${linie}` : ''};
}

// ── Ein Wechsel an der Ewigen Tafel als Bild [§C33] ─────────────────
// Rekord und Monatschronik wechseln auf dieselbe Weise den Halter, also
// zeigt sie EIN Bauteil [§C27]: wer weg ist, ein Pfeil, wer jetzt hält, der
// Wert groß und darunter der Name. Die Chronik trägt darüber ihr Zeichen —
// ihr Blatt war eine Spalte aus Zahlenkästen, Podest und Textzeilen.
function _ndWechselBuehne(o){
  const pm = pmap();
  const wap = (id, px) => `<span data-pid="${esc(id)}">${avHtml(pm[id], '', {ins:true, px, feuer:0})}</span>`;
  const neu = o.neu || [], weg = o.weg || [];
  const zeig = neu.slice(0, 4), rest = neu.length - zeig.length;
  return `<div class="nd-buehne nd-rk${o.metall ? ' metall' : ''}">`
    + (o.ic ? `<span class="nd-rk-ic">${zkHtml(o.ic, 'g', o.metall ? '' : 'gold')}</span>` : '')
    + `<div class="nd-rk-w">`
    + (weg.length ? `<div class="nd-rk-alt">${weg.slice(0, 3).map(id => wap(id, 48)).join('')}<small>vorher</small></div>`
      + `<svg class="nd-rk-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>` : '')
    + `<div class="nd-rk-neu">${zeig.map(id => wap(id, weg.length ? 52 : neu.length > 1 ? 60 : 76)).join('')}${rest > 0 ? `<span class="av nf-face-mehr">+${rest}</span>` : ''}`
    + `<small>${weg.length ? 'jetzt' : (neu.length > 1 ? 'halten ihn' : 'hält ihn')}</small></div></div>`
    + `<em class="nd-rk-h">${esc(_namenListe(neu.map(_spName)))}</em>`
    + (o.wert ? `<div class="nd-rk-v">${o.alt ? `<s class="num">${esc(o.alt)}</s>` : ''}<b class="num">${esc(o.wert)}</b><span>${esc(o.label || '')}</span></div>` : '')
    + `<div class="nd-rk-n">${esc(o.name || '')}</div>`
    + (o.marken && o.marken.length ? `<div class="nd-rk-m">${o.marken.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : '')
    + `</div>`;
}

// ── Drei Ebenen, die nicht dasselbe sind [§C32] ─────────────────────
// In der MONATSTAFEL kann ein Spieler mehrere Disziplinen führen, im PROFIL
// steht genau eine davon, und nur diese eine zählt fürs PRESTIGE [§C34].
// Die Zeile nannte einen Namen und einen Wert: wer „Der Nervenkitzel" neben
// „kein zusätzliches Prestige" las, konnte nicht sehen, dass dieser Name
// einem ANDEREN Eintrag gehört. Gezählt wird aus `seasonTitles` — derselben
// Quelle, aus der die Tafel selbst kommt — und zwar am Stand der Karte: die
// laufende Monatstafel ändert sich bei jeder Partie, und eine Karte von
// Dienstag erzählt vom Dienstag. Ein Bauteil für die beiden Karten, die
// davon erzählen [§C27]: den Wechsel und den Tag, an dem die Tafel aufgeht.
function _ndChronikEbenen(d, bisMs, ids, wertVon, modus, titleId){
  const pm = pmap();
  let T = null;
  try { T = seasonTitles(d.sid, bisMs); } catch(e){ T = null; }
  const awarded = (T && T.awarded) || [];
  return ids.map(pid => {
    const plus = Number(wertVon(pid)) || 0;
    const tp = awarded.find(a => a.pid === pid) || null;
    const titel = (tp && tp.name) || (d.titelJeSpieler || {})[pid] || '';
    const diese = (titleId && tp) ? tp.titleId === titleId : false;
    const n = awarded.filter(a => a.pid === pid).length;
    const ebenen = [];
    if(n) ebenen.push(n + (n === 1 ? ' Eintrag' : ' Einträge') + ' in der Tafel');
    if(diese) ebenen.push('im Profil steht diese');
    else if(titel) ebenen.push('im Profil „' + titel + '"');
    const aussage = modus === 'zuwachs'
      ? (plus > 0 ? '+' + plus + ' Prestige' : 'kein zusätzliches Prestige')
      : (plus > 0 ? String(plus).replace('.', ',') + ' Prestige · zählt aktuell'
                  : 'zählt aktuell nicht');
    return `<div class="nd-ce" data-pid="${esc(pid)}">${pm[pid] ? avHtml(pm[pid], '', {px:30}) : ''}
      <span class="nd-ce-t"><b>${esc(_spName(pid))}</b>${ebenen.length ? `<small>${esc(ebenen.join(' · '))}</small>` : ''}</span>
      <em class="${plus > 0 ? 'g' : ''}">${esc(aussage)}</em></div>`;
  }).join('');
}

// ── Eine Monatschronik wechselt den Halter [§C33] ───────────────────
// Dieselbe Bühne wie beim Rekord, dazu das Zeichen der Chronik und ihre
// Klasse. Darunter die vier Angaben ihres Werts, das Feld im Monat, wenn
// mehr als einer die Bedingung erfüllt (sonst stünde der Halter ein zweites
// Mal als Podest da), und die Wirkung gezeichnet wie an der Tafel.
function _ndChronikBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const def = (typeof SEASON_TITLE_BY_ID !== 'undefined') ? SEASON_TITLE_BY_ID[d.titleId] : null;
  const neu = ((Array.isArray(d.alle) && d.alle.length) ? d.alle : (d.playerIds || [])).filter(id => pm[id]);
  if(!neu.length || !d.sid) return null;
  const vor = (Array.isArray(d.vorher) ? d.vorher : []).filter(id => pm[id]);
  const weg = vor.filter(id => neu.indexOf(id) < 0);
  const name = d.chronName || (def && def.name) || '';
  const kl = CHRONIK_KLASSE_NAME[d.chronKlasse || (def && def.klasse)];
  const kopf = _ndWechselBuehne({neu, weg, wert:d.ev ? _chronKurz(d.ev) : '', label:'Monatschronik',
    name, marken:[kl, seasonLabel(d.sid)].filter(Boolean)});
  const bis = new Date(s.when).getTime() + 1;
  let podest = '';
  try {
    const C = _seasonTitleCtx(d.sid, Number.isFinite(bis) ? bis : undefined);
    const r = def && def.pick ? def.pick(C, new Set()) : null;
    if(r && r.rang && r.rang.length > 1){
      podest = _chronPodestHtml(r.rang.map(pid => {
        let w = ''; try { w = r.evFuer ? r.evFuer(pid) : ''; } catch(e){}
        return {pid, wert:_chronKurz(w), v:r.wert ? r.wert(pid) : null};
      }));
    }
  } catch(e){}
  const lb = d.laufbahn || {}, je = {};
  Object.keys(lb).forEach(id => { if(pm[id] && lb[id] && lb[id].vor != null && lb[id].nach != null) je[id] = lb[id]; });
  const wirkung = Object.keys(je).length
    ? _ndWirkungBlock(je, _ndWirkungsGruende([{halter:neu, vorher:vor, rname:name}])) : '';
  const beitragIds = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(id => pm[id]);
  const laufbahn = _newsChronikPrestige(d);
  const ebenen = beitragIds.length
    ? _ndChronikEbenen(d, Number.isFinite(bis) ? bis : undefined, beitragIds, pid => laufbahn.werte[pid], laufbahn.modus, d.titleId) : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  const cond = def && def.cond && _ndNeu(def.cond) ? def.cond : '';
  return {kopf, mitte:(cond ? `<div class="tnote nd-rk-c">${esc(cond)}</div>` : '')
    + (def ? _chronFaktenHtml(def) : '')
    + ab('Das Feld im Monat', podest)
    + ab('Wirkung auf die Laufbahn', wirkung)
    + ab('Tafel, Profil und Laufbahn', ebenen)
    + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`};
}

// ── Die Monatstafel als Bild [§C33] ─────────────────────────────────
// Zwei Karten erzählen von der ganzen Tafel eines Monats: der Tag, an dem
// sie aufgeht, und der Monatswechsel, an dem sie feststeht. Beide zeigten
// eine Zahl in einem Kasten und darunter Namen mit Textzeilen. Die Bühne
// trägt jetzt die Zahl der Einträge und je Träger einen Balken so lang wie
// seine Einträge; darunter steht jeder Eintrag als Zelle aus Zeichen,
// Kurzname und Gesicht — die Tafel selbst, so wie sie am Tag der Karte
// stand. Ein abgeschlossener Monat ist eingefroren, ein laufender wird an
// der Karte geschnitten.
function _ndMonatBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  if(!d.sid) return null;
  const offen = d.type === 'chronik_frei';
  const bis = offen ? new Date(s.when).getTime() + 1 : undefined;
  let T = null;
  try { T = seasonTitles(d.sid, Number.isFinite(bis) ? bis : undefined); } catch(e){ T = null; }
  const aw = ((T && T.awarded) || []).filter(a => pm[a.pid]);
  if(!aw.length) return null;
  const je = {};
  aw.forEach(a => { je[a.pid] = (je[a.pid] || 0) + 1; });
  const ids = Object.keys(je).sort((a, b) => je[b] - je[a] || _spName(a).localeCompare(_spName(b)));
  const max = Math.max(...ids.map(id => je[id]));
  // Je Träger ein Balken so lang wie seine Einträge, mit Gesicht und Name:
  // dasselbe Bauteil wie das Feld des Spielers des Tages [§C27].
  const balken = ids.slice(0, 6).map((id, k) => `<div class="nd-bk-z${k === 0 ? ' hell' : ''}" data-pid="${esc(id)}" style="--k:${k}">`
    + `${_spChip(id)}<span class="nd-bk-n">${esc(_spName(id))}</span>`
    + `<span class="nd-bk-b"><i style="width:${Math.round(je[id] / max * 100)}%"><u style="width:100%"></u></i></span>`
    + `<b class="num">${je[id]}</b></div>`).join('')
    + (ids.length > 6 ? `<div class="nd-mo-r num">und ${ids.length - 6} weitere</div>` : '');
  const kopf = `<div class="nd-buehne nd-mo${offen ? ' offen' : ''}"><div class="nd-mo-k"><b class="num">${aw.length}</b>`
    + `<span>${aw.length === 1 ? 'Eintrag' : 'Einträge'} · ${esc(seasonLabel(d.sid) || '')}</span>`
    + `<small>${ids.length === 1 ? 'ein Spieler' : ids.length + ' Spieler'}${offen ? ' · bis Monatsende offen' : ''}</small></div>`
    + `<div class="nd-bk nd-ft">${balken}</div></div>`;
  const zellen = aw.map((a, k) => `<span class="nd-mo-z" data-pid="${esc(a.pid)}" style="--k:${k}">`
    + `<i>${svgI(a.ic || 'scroll')}</i><b>${esc(a.name || a.short || '')}</b>${avHtml(pm[a.pid], '', {px:22})}</span>`).join('');
  // Am Tag, an dem die Tafel aufgeht, zählt ab jetzt jeder Eintrag fürs
  // Prestige [§C34]: die vorläufigen Profileinträge stehen deshalb dabei.
  let ebenen = '';
  if(offen){
    const tr = (Array.isArray(d.traeger) ? d.traeger : []).filter(id => pm[id]);
    const monatWert = pid => {
      try {
        const q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
          .find(x => x.q === 'monat' && (!x.sid || x.sid === d.sid));
        return q ? Math.round((q.p || 0) * 10) / 10 : 0;
      } catch(e){ return 0; }
    };
    if(tr.length) ebenen = `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
      + _ndChronikEbenen(d, Number.isFinite(bis) ? bis : undefined, tr, monatWert, 'bestand', '');
  }
  return {kopf, mitte:`<div class="nd-section">${offen ? 'Die Tafel an diesem Tag' : 'Die Tafel'}</div><div class="nd-mo-g">${zellen}</div>`
    + ebenen + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`};
}

// ── Der erste Eintrag überhaupt [§C33] ──────────────────────────────
// Der Moment, den ein Spieler aus der unteren Hälfte sonst nie im Feed
// sieht. Das Blatt zeigte „1." in einem Kasten und darunter das Medaillon;
// jetzt steht das Wappen mit dem Zeichen der Chronik auf der Bühne, die
// Zahl Eins dahinter, und darunter, wie die Laufbahn in der Chronik weiterging.
function _ndErstlingBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid] || !d.sid) return null;
  let t = null; try { t = seasonTitleOf(pid, d.sid); } catch(e){}
  const def = (t && typeof SEASON_TITLE_BY_ID !== 'undefined') ? SEASON_TITLE_BY_ID[t.titleId] : null;
  const kopf = `<div class="nd-buehne nd-er"><span class="nd-er-eins num">1</span>`
    + `<span class="nd-er-w" data-pid="${esc(pid)}">${avHtml(pm[pid], '', {ins:true, px:84, feuer:0})}`
    + `<span class="nd-er-ic">${zkHtml((t && t.ic) || (def && def.ic) || 'scroll', '', 'gold')}</span></span>`
    + `<b class="nd-er-n">${esc((t && t.name) || d.titel || '')}</b>`
    + `<span class="nd-er-m">${esc(seasonLabel(d.sid) || '')} · der erste Monatseintrag</span></div>`;
  // Die Monate seitdem als Zellen: hell, wo ein Eintrag steht.
  let reihe = '';
  try {
    const h = (seasonTitleHistory(pid) || []).filter(r => r.sid >= d.sid);
    if(h.length > 1) reihe = `<div class="nd-er-r">${h.map(r => `<span class="${r.title ? 'da' : ''}">`
      + `<i>${r.title ? svgI(r.title.ic || 'scroll') : ''}</i><small>${esc((seasonLabel(r.sid) || r.sid).split(' ')[0].slice(0, 3))}</small></span>`).join('')}</div>`;
  } catch(e){}
  const ab = (x, html) => html ? `<div class="nd-section">${esc(x)}</div>${html}` : '';
  return {kopf, mitte:(def && _ndNeu(def.cond) ? `<div class="tnote nd-rk-c">${esc(def.cond)}</div>` : '')
    + (t && _ndNeu(t.ev) ? `<div class="nd-er-ev">${_newsBetont(t.ev)}</div>` : '')
    + ab('Die Monate seitdem', reihe)
    + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`};
}

// ── Die neue Stufe [§C30] ───────────────────────────────────────────
// Die Stufe IST die Story. Das Blatt trug denselben Block wie jede
// Prestige-Karte: ein kleines Zeichen, eine Zeile Text und die Leiter. Die
// Bühne zeigt jetzt die Verwandlung — die Stufe davor leise, ein Pfeil, die
// neue groß um das Gesicht —, darunter woraus die Punkte kommen als ein
// Balken in drei Farben, der Weg durch die drei Grade dieser Stufe und die
// Leiter. Gerechnet wird mit dem gespeicherten Stand: eine Karte von
// vorletzter Woche erzählt vom Stand von damals, und die Stufe ist eine
// Ableitung aus den Punkten.
function _ndInsigniumBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid]) return null;
  const lb = (d.laufbahn || {})[pid] || null;
  const punkte = Number(d.punkte) || (lb && Number(lb.nach)) || 0;
  if(!punkte && d.stufe == null) return null;
  const i = punkte ? insigniumStufeVon(punkte) : (d.stufe | 0);
  const ins = INSIGNIEN[i], next = INSIGNIEN[i + 1];
  const rl = (getPlayerRank(pid) || {}).label;
  const gs = insigniumGradSchwellen(i);
  let grad = 0; gs.forEach((x, g) => { if(punkte >= x) grad = g; });
  const zacken = ins.key === 'stern' ? ORDENSSTERN_START + Math.floor(Math.max(0, punkte - ins.min) / ORDENSSTERN_SCHRITT) : 0;
  const zeichen = (key, z, g, bild) => { try { return insigniumStufeSvg(key, rl, z, g, bild ? {bild:true} : undefined) || ''; } catch(e){ return ''; } };
  const vorher = i > 0 ? INSIGNIEN[i - 1] : null;
  const kopf = `<div class="nd-buehne nd-is">`
    + `<div class="nd-is-w">${vorher ? `<span class="nd-is-alt">${zeichen(vorher.key, 0, 2, true)}<small>${esc(vorher.name)}</small></span>`
      + `<svg class="nd-rk-pf" viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8H34"/><path d="M28 3L35 8L28 13"/></svg>` : ''}`
    + `<span class="nd-is-neu" data-pid="${esc(pid)}"><span class="nd-is-z">${zeichen(ins.key, zacken, grad)}</span>`
    + `<span class="nd-is-av">${avHtml(pm[pid], '', {px:58})}</span></span></div>`
    + `<b class="nd-is-n">${esc(ins.name)}</b><span class="nd-is-p"><b class="num">${punkte}</b> Prestige · ${esc(_spName(pid))}</span>`
    + (d.wieder ? `<span class="nd-is-wd">wieder getragen${typeof d.wieder === 'string'
      ? ' · zuletzt ' + esc(datumFmt(d.wieder + 'T12:00:00', 'tm')) : ''}</span>` : '') + `</div>`;
  // Woraus die Punkte kommen. Gespeichert ist die Aufteilung im Satz der
  // Karte; jüngere Karten tragen sie zusätzlich als Zahlen.
  let teile = d.teile || null;
  if(!teile){
    const m = /(\d+) aus Auszeichnungen, (\d+) aus Monatschroniken und (\d+) aus Rekorden/.exec(String(s.desc || ''));
    if(m) teile = {auszeichnung:+m[1], monat:+m[2], rekord:+m[3]};
  }
  let quellen = '';
  if(teile){
    const q = [['auszeichnung', 'Auszeichnungen'], ['monat', 'Chroniken'], ['rekord', 'Rekorde']]
      .map(([k, l]) => ({k, l, v:Math.max(0, Math.round(Number(teile[k]) || 0))}));
    const sum = q.reduce((a, x) => a + x.v, 0);
    if(sum > 0) quellen = `<div class="nd-is-q"><span class="nd-is-qb">${q.map(x => x.v ? `<i class="${x.k}" style="width:${(x.v / sum * 100).toFixed(1)}%"></i>` : '').join('')}</span>`
      + `<span class="nd-is-ql">${q.map(x => `<span class="${x.k}"><b class="num">${x.v}</b>${x.l}</span>`).join('')}</span></div>`;
  }
  // Der Weg durch die Stufe: drei Grade als Strecken, je mit ihrem Bild,
  // der Stand als Marke, und am Ende die nächste Stufe mit ihrer Schwelle.
  // Was fehlt, steht im Satz der Karte; hier zeigt es die Strecke.
  let weg = '';
  if(next){
    const spanne = Math.max(1, next.min - ins.min);
    const lage = x => Math.max(0, Math.min(100, (x - ins.min) / spanne * 100));
    const grenzen = gs.concat([next.min]);
    weg = `<div class="nd-is-g"><div class="nd-is-gs">${gs.map((x, g) => `<span class="nd-is-gf${g <= grad ? ' da' : ''}${g === grad ? ' jetzt' : ''}" style="flex:${(lage(grenzen[g + 1]) - lage(x)).toFixed(1)} 1 0">`
      + `<span class="nd-is-gz">${zeichen(ins.key, 0, g, true)}</span><i></i><small class="num">${x}</small></span>`).join('')}`
      + `<em class="nd-is-gm" style="left:${lage(punkte).toFixed(1)}%"></em></div>`
      + `<span class="nd-is-ge"><span class="nd-is-gz">${zeichen(next.key, 0, 0, true)}</span><small class="num">${next.min}</small></span></div>`;
  }
  const leiter = `<div class="nf-leiter nd-is-l">${INSIGNIEN.map((x, k) => `<span class="nf-lt-p${k <= i ? ' hat' : ''}${k === i ? ' jetzt' : ''}">`
    + `${zeichen(x.key, k === i ? zacken : 0, k === i ? grad : 0, true)}</span>`).join('')}</div>`;
  const ab = (x, html) => html ? `<div class="nd-section">${esc(x)}</div>${html}` : '';
  return {kopf, mitte:ab('Woraus die Punkte kommen', quellen) + ab('Der Weg durch die Stufe', weg) + ab('Die Leiter', leiter)};
}

// ── Der Tafel-Moment als Zeitleiste [§C33] ──────────────────────────
// Die Tafel eines Tages rollt: jeder weitere Wechsel ersetzt ihre Karte
// [§C33], und das Blatt zeigte davon nur eine Liste aus Sätzen. Die Bühne
// legt jetzt jede Bewegung als Zeichen auf die Uhr des Tages, von der ersten
// bis zur jüngsten, und darunter jeden, um den es geht, mit Gesicht und
// Namen. Was eine Bewegung wert war, steht in der Wirkung darunter.
function _ndTafelMomentBlatt(s){
  const d = s.dataRef || {};
  if(d.type !== 'sammel' || (d.quelle !== 'tafel' && d.quelle !== 'form')) return null;
  const pm = pmap();
  const teile = (Array.isArray(d.teile) ? d.teile : []).filter(t => Number.isFinite(t.ms));
  if(!teile.length) return null;
  // ── Wer hat was bewegt ──────────────────────────────────────────
  // Hier stand eine Zeitachse des Tages mit gestapelten Zeichen über jeder
  // Minute, und darunter die Namen als lose Chips: welches Zeichen wem
  // gehörte und was es bedeutete, war nicht zu erkennen. Die Uhrzeit trägt
  // ohnehin jede Zeile der Liste darunter. Jetzt steht je Spieler eine
  // Zeile: Gesicht und Name, was er bewegt hat in Worten, und jede Bewegung
  // als Zeichen ihres Eintrags — Gold geholt, Silber ausgebaut, Violett die
  // Stufe, Rot abgegeben [§C25]. Wer am meisten gewonnen hat, steht oben.
  // Die Klassen heißen `nd-tw…`: `.nd-tm` ist die Partienzeile im Blatt des
  // Spielers des Tages, `.rek` die Karte des Rekorde-Reiters.
  const typ = t => String(t.typ || t.type || '');
  const je = new Map();
  const zu = (id, art, ic) => {
    if(!pm[id]) return;
    if(!je.has(id)) je.set(id, {rek:[], chr:[], aus:[], ins:[], weg:[]});
    je.get(id)[art].push(ic || 'trophy');
  };
  teile.forEach(t => {
    const ref = t.ref || {}, ty = typ(t);
    if(ty === 'insignium_stufe'){ zu(ref.pid || (t.pids || [])[0], 'ins', t.ic || 'medalTrio'); return; }
    const art = ty === 'rekord_gesteigert' ? 'aus' : ty.indexOf('chronik_') === 0 ? 'chr' : 'rek';
    const neu = (Array.isArray(t.halter) ? t.halter : []).filter(id => pm[id]);
    const vor = (Array.isArray(t.vorher) ? t.vorher : []).filter(id => pm[id]);
    if(!neu.length){ (t.pids || []).forEach(id => zu(id, art, t.ic)); return; }
    const dazu = neu.filter(id => vor.indexOf(id) < 0);
    const wer = art === 'aus' ? neu : vor.length && neu.length > vor.length && dazu.length ? dazu : neu;
    wer.forEach(id => zu(id, art, t.ic));
    if(art !== 'aus') vor.filter(id => neu.indexOf(id) < 0).forEach(id => zu(id, 'weg', t.ic));
  });
  const anz = (n, ein, mehr) => n === 1 ? 'eine ' + ein : (_BELEG_ZAHL[n] || String(n)) + ' ' + mehr;
  const zeilen = [...je.entries()].map(([id, x]) => {
    const gew = x.rek.length + x.chr.length + x.ins.length;
    const worte = [];
    if(x.rek.length) worte.push(anz(x.rek.length, 'Bestmarke', 'Bestmarken'));
    if(x.chr.length) worte.push(anz(x.chr.length, 'Monatschronik', 'Monatschroniken'));
    if(x.ins.length) worte.push('die nächste Stufe');
    if(x.aus.length) worte.push(x.aus.length === 1 ? 'ein Ausbau' : (_BELEG_ZAHL[x.aus.length] || String(x.aus.length)) + ' Ausbauten');
    const satz = (worte.length ? worte.join(', ').replace(/, ([^,]*)$/, ' und $1') : '')
      + (x.weg.length ? (worte.length ? ', ' : '') + 'gibt ' + (x.weg.length === 1 ? 'eine' : (_BELEG_ZAHL[x.weg.length] || String(x.weg.length))) + ' ab' : '');
    const zeichen = ['rek', 'chr', 'ins', 'aus', 'weg'].map(a => x[a].map(ic => `<i class="tw-${a}">${svgI(ic)}</i>`).join('')).join('');
    return {id, gew, alle:gew + x.aus.length, weg:x.weg.length,
      html:`<div class="nd-tw-z${gew ? '' : x.aus.length ? ' nur-aus' : ' nur-weg'}" data-pid="${esc(id)}">${_spChip(id)}`
        + `<span class="nd-tw-m"><b>${esc(_spName(id))}</b><small>${esc(satz)}</small></span>`
        + `<span class="nd-tw-i">${zeichen}</span></div>`};
  }).sort((a, b) => b.gew - a.gew || b.alle - a.alle || a.weg - b.weg || (_spName(a.id) < _spName(b.id) ? -1 : 1));
  const ms = teile.map(t => t.ms), t0 = Math.min(...ms), t1 = Math.max(...ms);
  const kopf = `<div class="nd-buehne nd-tw${d.quelle === 'form' ? ' form' : ''}">`
    + `<div class="nd-tw-k"><b class="num">${teile.length}</b><span>${teile.length === 1 ? 'Bewegung' : 'Bewegungen'}`
    + `${d.quelle === 'form' ? ' auf kurzer Strecke' : ' an der Ewigen Tafel'}</span>`
    + `<small class="num">${esc(_newsUhrzeit(t0))}${t1 !== t0 ? ' bis ' + esc(_newsUhrzeit(t1)) : ''}</small></div>`
    + `<div class="nd-tw-l">${zeilen.map((z, k) => z.html.replace('class="nd-tw-z', `style="--k:${k}" class="nd-tw-z`)).join('')}</div></div>`;
  return {kopf, mitte:null};
}

// Eine Zeile der Tafel als Bild statt als Satz: der Name des Eintrags, was
// geschah, und rechts der Wechsel aus Gesichtern mit dem Wert darunter. Ohne
// Halter (ältere Läufe) bleibt die Zeile, wie sie war.
function _ndTafelZeileBild(t){
  const pm = pmap();
  const typ = String(t.typ || t.type || '');
  const ref = t.ref || {};
  const chip = (id, aus) => pm[id] ? `<span class="nd-tz-f${aus ? ' aus' : ''}">${_spChip(id)}</span>` : '';
  if(typ === 'insignium_stufe' && ref.pid && pm[ref.pid]){
    const p = Number(ref.punkte) || 0;
    const i = p ? insigniumStufeVon(p) : (ref.stufe | 0);
    let z = '';
    try { z = insigniumStufeSvg(INSIGNIEN[i].key, (getPlayerRank(ref.pid) || {}).label, 0, 0, {bild:true}) || ''; } catch(e){}
    return {label:INSIGNIEN[i].name, verb:_spName(ref.pid) + ' erreicht', rechts:`<span class="nd-tz-w">${chip(ref.pid)}<span class="nd-tz-z">${z}</span></span>`
      + (p ? `<b class="nd-tz-v num">${p} P</b>` : '')};
  }
  const neu = (Array.isArray(t.halter) ? t.halter : []).filter(id => pm[id]);
  const vor = (Array.isArray(t.vorher) ? t.vorher : []).filter(id => pm[id]);
  if(!neu.length || !t.rname) return null;
  const weg = vor.filter(id => neu.indexOf(id) < 0);
  // Wer etwas getan hat: beim Gleichziehen die Neuen, sonst alle Halter.
  const dazu = neu.filter(id => vor.indexOf(id) < 0);
  const wer = vor.length && neu.length > vor.length && dazu.length ? dazu : neu;
  const mehr = wer.length > 1;
  const verb = typ === 'rekord_gesteigert' ? (mehr ? 'bauen aus' : 'baut aus')
    : !vor.length ? (mehr ? 'holen' : 'holt') : weg.length ? (mehr ? 'übernehmen' : 'übernimmt')
    : neu.length < vor.length ? (mehr ? 'halten allein' : 'hält allein')
    : neu.length > vor.length ? (mehr ? 'ziehen gleich' : 'zieht gleich') : (mehr ? 'halten' : 'hält');
  const wert = ref.ev ? _chronKurz(ref.ev) : '';
  const alt = typ === 'rekord_gesteigert' && ref.evVorher ? _chronKurz(ref.evVorher) : '';
  const pf = `<svg class="nd-tz-pf" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5H13"/><path d="M10 2L14 5L10 8"/></svg>`;
  return {label:t.rname, verb:_namenKurz(wer.map(_spName)) + ' ' + verb, rechts:`<span class="nd-tz-w">${weg.slice(0, 2).map(id => chip(id, true)).join('')}`
    + (weg.length ? pf : '') + neu.slice(0, 3).map(id => chip(id)).join('')
    + (neu.length > 3 ? `<span class="nd-tz-mehr num">+${neu.length - 3}</span>` : '') + `</span>`
    + (wert ? `<b class="nd-tz-v num">${alt ? `<s>${esc(alt)}</s> ` : ''}${esc(wert)}</b>` : '')};
}

// ── Ein Wappen und eine Zahl [§C33] ─────────────────────────────────
// Meilenstein, Jubiläum, Form und Ausschlag erzählen von EINEM Spieler und
// EINER Zahl. Ihre Blätter zeigten das Wappen im Kopf und die Zahl darunter
// in einem Kasten oder einer Zeile; die Bühne stellt beides zusammen.
function _ndHeldBuehne(pid, wert, label, neg, extra){
  const pm = pmap();
  return `<div class="nd-buehne nd-hz${neg ? ' neg' : ''}"><div class="nd-hz-k"><span data-pid="${esc(pid)}">${avHtml(pm[pid], '', {ins:true, px:64, feuer:0})}</span>`
    + `<span class="nd-hz-t"><em>${esc(_spName(pid))}</em><b class="num">${esc(String(wert))}</b><small>${esc(label)}</small></span></div>`
    + (extra || '') + `</div>`;
}
// Die Leiter einer Marke: zwei davor, diese, die nächste. Dieselbe Leiter,
// nach der der Generator die Marke vergibt (`_ladderCrossing`).
function _ndMarkenLeiter(wert, min, schritt){
  const marken = [];
  if(schritt){ for(let v = min; v <= wert + schritt; v += schritt) marken.push(v); }
  else { let p = 1; while(p <= wert * 10){ [1, 2.5, 5].forEach(r => { const v = r * p; if(Number.isInteger(v) && v >= min && v <= wert * 10) marken.push(v); }); p *= 10; } }
  marken.sort((a, b) => a - b);
  const i = marken.indexOf(wert);
  if(i < 0) return '';
  const zeig = marken.slice(Math.max(0, i - 2), i + 2);
  return `<div class="nd-ml">${zeig.map(v => `<span class="${v < wert ? 'da' : v === wert ? 'jetzt' : 'naechst'}"><b class="num">${_spZahl(v)}</b></span>`).join('<i></i>')}</div>`;
}
// Siege und Niederlagen bis zu einer Partie als ein Balken.
function _ndBilanzBalken(st){
  if(!st || !(st.wins + st.losses)) return '';
  const n = st.wins + st.losses, w = st.wins / n * 100;
  return `<div class="nd-bb"><span class="nd-bb-b"><i style="width:${w.toFixed(1)}%"></i><u style="width:${(100 - w).toFixed(1)}%"></u></span>`
    + `<span class="nd-bb-z"><span><b class="num">${_spZahl(st.wins)}</b> Siege</span><span><b class="num">${st.winRate} %</b></span><span><b class="num">${_spZahl(st.losses)}</b> Niederlagen</span></span></div>`;
}
// Die Elo einer Laufbahn bis zu einer Partie als Linie, die Marke gestrichelt.
function _ndEloLinie(pid, bisId, marke){
  let pkt = [];
  try {
    for(const h of (getGlobalSim().history || [])){
      const v = h.eloAfter && h.eloAfter[pid];
      if(v != null) pkt.push(v);
      if(h.matchId === bisId) break;
    }
  } catch(e){ pkt = []; }
  if(pkt.length < 3) return '';
  const lo = Math.min(...pkt, marke), hi = Math.max(...pkt, marke), W = 300, H = 90;
  const X = i => 4 + i / (pkt.length - 1) * (W - 8), Y = v => 6 + (hi - v) / Math.max(1, hi - lo) * (H - 12);
  return `<div class="nd-li nd-el"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><line class="nd-li-0" x1="0" x2="${W}" y1="${Y(marke).toFixed(1)}" y2="${Y(marke).toFixed(1)}"/>`
    + `<polyline points="${pkt.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}"/>`
    + `<circle cx="${X(pkt.length - 1).toFixed(1)}" cy="${Y(pkt[pkt.length - 1]).toFixed(1)}" r="3.5"/></svg>`
    + `<span class="nd-li-o num">${_spZahl(marke)}</span></div>`;
}
function _ndMeilensteinBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid]) return null;
  const art = {jubilee:['Partien', 10, 0], milestone_wins:['Siege', 100, 0], milestone_goals:['Tore', 500, 0],
    milestone_elo:['Elo', (cfg.start_elo ?? 1000) + 200, 100]}[d.type];
  const wert = d.type === 'jubilee' ? Number(d.total) : d.type === 'milestone_elo' ? Number(d.mark) || parseInt(d.milestone, 10) : parseInt(d.milestone, 10);
  if(!art || !Number.isFinite(wert)) return null;
  const kopf = _ndHeldBuehne(pid, _spZahl(wert), art[0], false, _ndMarkenLeiter(wert, art[1], art[2]));
  const st = _ndBilanzBis(pid, s);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  return {kopf, mitte:(d.type === 'milestone_elo' ? ab('Die Elo bis hierher', _ndEloLinie(pid, d.matchId, wert)) : '')
    + ab('Die Bilanz bis hierher', _ndBilanzBalken(st))
    + (m ? ab('Die Partie', _newsMatchVsBlock(d.matchId)) : '')};
}
// Die Form gegen den eigenen Schnitt: zwei Balken, und darunter die zehn
// Partien, aus denen die erste Zahl besteht.
function _ndFormBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid] || d.qJetzt == null || d.qBasis == null) return null;
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  const lauf = m ? _ndLauf(pid, null, m, FORM_FENSTER) : [];
  const zeile = (l, q, kl) => `<div class="nd-fv-z ${kl}"><span>${esc(l)}</span><span class="nd-fv-b"><i style="width:${Math.max(0, Math.min(100, q))}%"></i></span><b class="num">${q} %</b></div>`;
  const extra = `<div class="nd-fv">${zeile('letzte ' + FORM_FENSTER, d.qJetzt, 'jetzt')}${zeile('davor', d.qBasis, '')}</div>`
    + (lauf.length ? `<span class="nd-lf nd-hz-lf">${lauf.map((y, j) => `<i class="${_spGew(y, pid) ? 'w' : 'l'}${j === lauf.length - 1 ? ' dies' : ''}"></i>`).join('')}</span>` : '');
  const kopf = _ndHeldBuehne(pid, '+' + (d.vorsprung != null ? d.vorsprung : d.qJetzt - d.qBasis), 'Prozentpunkte über dem eigenen Schnitt', false, extra);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Die zehn Partien', lauf.length ? _ndPartieListe(lauf, pid) : '')};
}
// Der härteste Tag: die Elo des Tages als Kurve unter der Zahl, darunter
// der Tag in Partien.
function _ndAusschlagBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.pid;
  if(!pid || !pm[pid] || d.delta == null) return null;
  let kurve = '';
  try { kurve = _spTagBild(_spTagDaten({when:s.when, dataRef:{playerId:pid}})); } catch(e){}
  const kopf = _ndHeldBuehne(pid, (d.delta > 0 ? '+' : '−') + Math.abs(d.delta), 'Elo an diesem Tag', d.delta < 0, kurve);
  const liste = _newsTagPartien(tagKey(s.when), [pid]);
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Der Tag in Partien', _ndTagesbahn(pid, liste))};
}
// ── Das Spitzenspiel [§C33] ─────────────────────────────────────────
// Platz 1 gegen Platz 2 stand als zwei Zeilen „Platz 1 · Martin ›". Die
// Bühne zeigt beide mit ihrem Platz und das Ergebnis dazwischen, den Sieger
// hell; darunter dieselben Abschnitte wie das Blatt jeder Partie.
function _ndSpitzenspielBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m || !pm[d.p1] || !pm[d.p2]) return null;
  const sieger = _spSieger(m);
  const seite = (pid, platz) => `<span class="nd-ts-p${sieger.includes(pid) ? ' w' : ''}" data-pid="${esc(pid)}"><i class="num">${platz}.</i>`
    + `${avHtml(pm[pid], '', {ins:true, px:64, feuer:0})}<b>${esc(_spName(pid))}</b></span>`;
  const kopf = `<div class="nd-buehne nd-ts">${seite(d.p1, 1)}<span class="nd-ts-m"><b class="num">${_spStand({sa:m.score_a, sb:m.score_b, aw:m.winner === 'A'})}</b>`
    + `<small>${esc(_newsUhrzeit(mts(m)))}</small></span>${seite(d.p2, 2)}</div>`;
  return {kopf, mitte:_ndPartieAbschnitte(s)};
}
// ── Die runden Marken eines Tages ───────────────────────────────────
// Je Marke eine Kachel aus Zeichen, Zahl und Gesicht. Darunter, wofür es
// sie gibt — bei einer einzigen Marke steht das schon im Satz der Karte.
function _ndMarkenBlatt(s){
  const d = s.dataRef || {}, pm = pmap();
  const l = (Array.isArray(d.marken) ? d.marken : []).filter(x => pm[x.pid]);
  if(!l.length) return null;
  const def = id => (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === id) : null;
  const kopf = `<div class="nd-buehne nd-bm">${l.map((x, k) => {
    const b = def(x.badgeId) || {};
    const kl = (typeof rarityOf === 'function') ? rarityOf(x.badgeId) : 'common';
    return `<span class="nd-bm-k nf-bd-${esc(kl)}" data-pid="${esc(x.pid)}" style="--k:${k}"><span class="nd-bm-ic">${svgI(b.ic || 'medal')}</span>`
      + `<b class="num">${x.rang}.</b><em>${esc(x.name || b.name || '')}</em>`
      + `<span class="nd-bm-w">${_spChip(x.pid)}<small>${esc(_spName(x.pid))}</small></span></span>`;
  }).join('')}</div>`;
  const ids = [...new Set(l.map(x => x.badgeId))];
  const bed = l.length > 1 ? ids.map(id => { const b = def(id) || {};
    return rcpZeileHtml({ic:b.ic || 'medal', name:b.name || id, sub:b.desc || ''}); }).join('') : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  return {kopf, mitte:ab('Wofür es sie gibt', bed)
    + (d.matchId ? ab('Die Partie', _newsMatchVsBlock(d.matchId)) : '')};
}

// ── Der Fun Fact [§C33] ─────────────────────────────────────────────
// Der Fun Fact zeigte das Wappen im Kopf und die Zahl darunter in einem
// Kasten. Er handelt meistens von einem Spieler und einer Zahl, also steht
// beides auf derselben Bühne wie Meilenstein und Form. Darunter, was die
// Zahl einordnet: wer bei einem Rekord dahinter liegt, das Zeichen, wenn es
// um Prestige geht, sonst die letzten zehn Partien bis zum Tag der Karte.
function _ndFaktBlatt(s){
  const d = s.dataRef || {}, pm = pmap(), pid = d.ambientPid;
  // Ein Fun Fact mit Bild trägt es groß als Bühne [30c-news-fakt] — dasselbe
  // Bild wie die Karte, sonst verlöre das Blatt, wegen dem man getippt hat.
  // Darunter steht, was das Bild nicht zeigt.
  const bild = d.leiter ? '' : _faktBild(s, true);
  if(bild){
    const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
    const b = d.bild || {};
    let mitte = '';
    if(d.type === 'dry_spell') mitte = ab('Die letzte Partie', d.lastMatchId ? _newsBlattErgebnis(d.lastMatchId) : '');
    else if(b.f === 'duell' && pm[b.a] && pm[b.b]) mitte = ab('Jede Begegnung', h2hBegegnungenHtml(b.a, b.b));
    else if(d.prestige && pid && pm[pid]) mitte = ab('Der Stand am Zeichen', _newsInsigniumBlock(pid));
    else if(pid && pm[pid]) mitte = ab('Die letzten zehn Partien', _ndFaktLauf(pid, s));
    return {kopf:`<div class="nd-buehne nd-ff">${bild}</div>`, mitte};
  }
  if(d.leiter || !pid || !pm[pid] || d.vv == null || d.vv === '') return null;
  const kopf = _ndHeldBuehne(pid, d.vv, d.vl || '', false, '');
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  if(d.prestige) return {kopf, mitte:ab('Der Stand am Zeichen', _newsInsigniumBlock(pid))};
  if(d.chronicle) return {kopf, mitte:_newsVerfolger(d.chronicle, [pid], null)
    || ab('Die letzten zehn Partien', _ndFaktLauf(pid, s))};
  return {kopf, mitte:ab('Die letzten zehn Partien', _ndFaktLauf(pid, s))};
}
// Die zehn Partien vor der Karte als Lauf und als Bilanz.
function _ndFaktLauf(pid, s){
  const t = new Date(s.when).getTime();
  const l = matchesOfPlayer(pid, matches).filter(m => mts(m) <= t).slice(-10);
  if(!l.length) return '';
  const w = l.filter(m => _spGew(m, pid)).length;
  return `<span class="nd-lf nd-hz-lf">${l.map(m => `<i class="${_spGew(m, pid) ? 'w' : 'l'}"></i>`).join('')}</span>`
    + _ndBilanzBalken({wins:w, losses:l.length - w, winRate:Math.round(w / l.length * 100)});
}

// Welche Story ein eigenes Blatt mit Bühne hat. Kopf und Mitte kommen aus
// demselben Aufruf, gemerkt je Story, damit nichts doppelt gerechnet wird.
const _ND_BLATT = {win_streak:_ndSerieBlatt, loss_streak:_ndSerieBlatt, team_streak:_ndSerieBlatt,
  team_loss_streak:_ndSerieBlatt, streak_killer:_ndSerieBlatt, rivalry:_ndRivalBlatt,
  rivalry_milestone:_ndRivalBlatt, badge_unlocked:_ndBadgeBlatt,
  rekord_erstmals:_ndRekordBlatt, rekord_gesteigert:_ndRekordBlatt, rekord_geholt:_ndRekordBlatt,
  potd:_ndPotdBlatt, season_endgame:_ndEndspurtBlatt, chronik_geholt:_ndChronikBlatt,
  chronik_frei:_ndMonatBlatt, chronik_monat:_ndMonatBlatt, chronik_erstling:_ndErstlingBlatt,
  insignium_stufe:_ndInsigniumBlatt, sammel:_ndTafelMomentBlatt,
  jubilee:_ndMeilensteinBlatt, milestone_wins:_ndMeilensteinBlatt, milestone_goals:_ndMeilensteinBlatt,
  milestone_elo:_ndMeilensteinBlatt, top_form:_ndFormBlatt, elo_swing:_ndAusschlagBlatt,
  top_clash:_ndSpitzenspielBlatt, badge_marken:_ndMarkenBlatt, dry_spell:_ndFaktBlatt, ambient:_ndFaktBlatt,
  karriereende:_ndAbschiedBlatt};
// Das Blatt eines Karriereendes zeigt die Bühne und den Anfang des
// Abschieds; der ganze steht einen Knopf weiter [§C40].
function _ndAbschiedBlatt(s){
  const d = s.dataRef || {};
  if(!pmap()[d.pid]) return null;
  return {kopf:abschiedBuehneHtml(d.pid), mitte:abschiedMitteHtml(d.pid, true)};
}
// Gemerkt nur für einen Aufbau (`_newsDetailBody` leert es): an der Story
// hängend hielte es nach einer neuen Partie den alten Stand fest.
let _ndBlattJetzt = null;
function _ndEigenesBlatt(s){
  const f = _ND_BLATT[(s.dataRef || {}).type];
  if(!f) return null;
  if(_ndBlattJetzt && _ndBlattJetzt.s === s) return _ndBlattJetzt.x;
  let x = null;
  try { x = f(s); } catch(e){ x = null; }
  _ndBlattJetzt = {s, x};
  return x;
}

// ── Was unter der Bühne einer Partie steht [§C33] ──────────────────
// Zeichnungen in fester Folge, jede nur, wo die Bühne sie nicht schon zeigt:
// die Aufstellung, die Siegchance auf ihrer Skala, die Elo-Wirkung je
// Spieler, die direkten Duelle, der Tag und wie oft die Liga so ausgeht. Ein
// Abschnitt „Was dieses Spiel besonders macht" stand dort als Wort und Satz
// („Außenseiter-Sieg · Die Rechnung stand dagegen") über einer Skala, die
// genau das zeigt. Dieselbe Folge trägt das Blatt einer Partie und das
// ihres Bündels.
function _ndPartieAbschnitte(s){
  const d = s.dataRef || {};
  const m = d.matchId ? (matches || []).find(x => x.id === d.matchId) : null;
  if(!m) return '';
  let bild = '';
  try { bild = _spBild(s).kopf || ''; } catch(e){ bild = ''; }
  const zeigt = kl => bild.indexOf('class="' + kl) >= 0 || bild.indexOf('class="sp-fk ' + kl) >= 0;
  const beteiligt = _spSieger(m).concat(_spVerlierer(m));
  // Steht das Spielfeld schon auf der Bühne, trägt es Siegchance und Elo
  // je Spieler; die Abschnitte darunter nennen dann nur noch, was es nicht
  // zeigt — wer in der Tabelle den Platz gewechselt hat. Steht es als
  // Abschnitt, zeigt es nur die Aufstellung.
  const buehneFeld = zeigt('sp-feld');
  const c = d.chance != null ? d.chance : (d.quote != null ? d.quote / 100 : _spChance(m));
  const skala = buehneFeld || zeigt('sp-ta') || zeigt('sp-sd') || zeigt('sp-wp') ? '' : _ndChanceSkala(c);
  const mitRang = buehneFeld ? beteiligt.filter(pid => { const r = _newsRankChange(pid, m.id); return r && r.pre !== r.post; }) : beteiligt;
  const elo = !zeigt('sp-et') && mitRang.length ? _ndEloWirkung(m.id, mitRang) : '';
  const ab = (t, html) => html ? `<div class="nd-section">${esc(t)}</div>${html}` : '';
  let feld = '', duelle = '', tag = '', vert = '';
  try { feld = buehneFeld ? '' : `<div class="nd-feld">${_spFeldBild(Object.assign(_spFeldDaten({m, c:null}), {ohneElo:true}))}</div>`; } catch(e){}
  try { duelle = _ndDuelle(m); } catch(e){}
  try { tag = _ndTagLeiste(m); } catch(e){}
  try { vert = zeigt('sp-mo') || zeigt('sp-vt') ? '' : _ndVerteilung(m); } catch(e){}
  return ab('Wer wo stand', feld) + ab('Wie erwartbar war das', skala)
    + ab(buehneFeld ? 'In der Tabelle' : 'Was die Partie bewegt hat', elo)
    + ab('Die direkten Duelle', duelle) + ab('Der Tag', tag) + ab('Wie oft es so ausgeht', vert);
}

// Eine Überschrift ohne etwas darunter fällt weg. „Die Partie zum
// Meilenstein" stand über nichts, weil die Partie schon im Kopf stand und
// `_newsMatchVsBlock` sie nicht ein zweites Mal zeigt; dasselbe galt für
// jeden Abschnitt, dessen Inhalt leer ausfällt. Eine Regel an einer Stelle
// statt einer Bedingung an jeder Überschrift.
function _ndOhneLeere(html){
  return String(html || '').replace(/<div class="nd-section">[^<]*<\/div>\s*(?=<div class="nd-section">|$)/g, '');
}
function _newsDetailMitte(s){ return _ndOhneLeere(_ndMitteRoh(s)); }
function _ndMitteRoh(s){
  const d = s.dataRef || {};
  // Ein Blatt kann nur seine Bühne mitbringen und die Mitte dem Schalter
  // lassen (`mitte:null`): der Tafel-Moment teilt seine Liste mit den
  // übrigen Sammelkarten.
  { const x = _ndEigenesBlatt(s); if(x && x.mitte != null) return x.mitte; }
  const pm = pmap();
  const avM = (pid) => (typeof avHtml === 'function' && pm[pid]) ? avHtml(pm[pid]) : '';
  const nameOf = (pid) => (pm[pid] && pm[pid].name) || '?';
  // §13.4b: Chronik-Karten haben keinen eigenen `type` — sie hängen an jeder
  // Story, die eine Chronik nennt, und öffnen deren Liga-Ansicht.
  if(d.chronicle && CHRONICLE_BY_ID[d.chronicle]){
    const def = CHRONICLE_BY_ID[d.chronicle];
    const row = d.ambientPid ? `<div class="nd-stat-row" data-pid="${esc(d.ambientPid)}" style="cursor:pointer">
      <div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val gold">${esc(nameOf(d.ambientPid))} ›</div></div>` : '';
    return `<div class="nd-section">Liga-Rekord · ${esc(CHRON_KINDS[def.kind].label)}</div>${row}
      <div class="nd-stat-row"><div class="nd-stat-label">Bedingung</div>
        <div class="nd-stat-val">${esc(def.cond)}</div></div>
      <button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>`;
  }
  // ── Was der Rekord der Laufbahn bringt [§C34] ───────────────────
  // Auf einer Rekord-Karte stand nichts darüber, und wer den Grundwert
  // hineinschriebe, behauptete „+100 Prestige", während die Laufbahn um 34
  // Punkte steigt. Gezeigt werden deshalb die beiden Stände aus
  // `prestigeTabelle` vor und nach dem Tagesabschluss, die Rechnung der
  // Quelle im gemeinsamen Satz (`_prestigeQuellSatz` [§C27]) und der Anteil,
  // den alle heute gehaltenen Rekorde zusammen tragen. Eine Karte aus einem
  // älteren Lauf hat die beiden Stände nicht — sie zeigt dann die Rechnung
  // von heute und behauptet keinen Zuwachs.
  const rekordLaufbahn = (rid) => {
    const ids = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(pid => pm[pid]);
    if(!ids.length) return '';
    const lb = d.laufbahn || {};
    const zeilen = ids.map(pid => {
      const w = lb[pid] || null;
      let q = null;
      if(!w){
        try {
          q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
            .find(x => x.q === 'rekord' && x.id === rid) || null;
        } catch(e){}
        if(!q) return '';
      }
      const satz = _prestigeQuellSatz(w
        ? {q:'rekord', art:d.art || 'ereignis', kind:d.kammer || '',
           basis:w.basis, halter:w.halter, rang:w.rang, staffel:w.staffel}
        : q);
      const rechts = w
        ? `${w.vor} → ${w.nach} Prestige`
        : `${komma(q.p).replace(',0', '')} Prestige`;
      const anteil = w && w.zahl
        ? `${satz} · ${w.zahl} ${w.zahl === 1 ? 'Rekord' : 'Rekorde'}: `
          + `${w.anteilVor} → ${w.anteilNach}`
        : satz;
      return `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
        <div class="nd-stat-label">${esc(nameOf(pid))}<small>${esc(anteil)}</small></div>
        <div class="nd-stat-val acid">${esc(rechts)} ›</div></div>`;
    }).filter(Boolean).join('');
    return zeilen ? `<div class="nd-section">Für die Laufbahn</div>${zeilen}` : '';
  };

  try {
    switch(d.type){
      // Die Runde der Vier [§11.6c]: Tabelle, Aufstellung je Partie und jede
      // Partie mit ihrer Uhrzeit.
      case 'runde': return _newsRundeBlatt(s);
      // ── Die Ewige Tafel ─────────────────────────────────────────
      // Der ganze Awards-Reiter hatte im Blatt gar keinen Fall: wer eine
      // Rekord-Karte oeffnete, sah den Kopf und den Satz, den er auf der
      // Karte schon gelesen hatte. Jetzt steht dort der Wert gross, die
      // Bedingung, wem er vorher gehoerte und wer dahinter liegt.
      //
      // Alle drei Rekord-Meldungen teilen dieses Blatt. Nur `rekord_geholt`
      // hatte einen Fall, und der Schalter kennt keinen Rueckfall: ein
      // erstmals vergebener und ein ausgebauter Rekord oeffneten damit ein
      // Blatt mit NULL Zeichen Mitte, gemessen am gebauten Stand. Sie tragen
      // dieselben Felder — Wert, Bedingung, Vorgaenger, Verfolger — und der
      // Satz darueber sagt ohnehin schon, welcher der drei Faelle es ist
      // [§C33].
      case 'rekord_erstmals':
      case 'rekord_gesteigert':
      case 'rekord_geholt': {
        const def = (typeof CHRONICLE_BY_ID !== 'undefined') ? CHRONICLE_BY_ID[d.rekordId] : null;
        const wert = _chronKurz(d.ev);
        // Dieselben Halter in anderer Reihenfolge sind kein Wechsel: „Maxi,
        // Leo und Julian übernehmen" und darunter „Vorher gehalten von Maxi
        // und Julian und Leo" nannte dreimal dieselben drei Namen.
        const jetzt = (Array.isArray(d.playerIds) ? d.playerIds : []).slice().sort().join(',');
        const vorRoh = (Array.isArray(d.vorher) ? d.vorher : []).filter(pid => pm[pid]);
        const vor = vorRoh.slice().sort().join(',') === jetzt ? [] : vorRoh;
        // Der Beleg steht schon im Satz ueber dem Blatt — er stand hier ein
        // zweites Mal, Wort fuer Wort.
        return `<div class="nd-gwert ${d.zufall ? 'metall' : 'gold'}">
            <b>${esc(wert)}</b><span>${esc(d.kammerLabel || 'Bestmarke')}</span></div>
          ${_ndNeu(d.cond) ? `<div class="nd-stat-row"><div class="nd-stat-label">Bedingung</div>
            <div class="nd-stat-val" style="font-size:11px;text-align:right;max-width:62%">${esc(d.cond)}</div></div>` : ''}
          ${vor.length ? `<div class="nd-stat-row" data-pid="${esc(vor[0])}" style="cursor:pointer">
            <div class="nd-stat-label">Vorher gehalten von</div>
            <div class="nd-stat-val">${esc(_namenListe(vor.map(nameOf)))} ›</div></div>` : ''}
          ${_newsVerfolger(d.rekordId, d.playerIds, d.wert)}
          ${/* Woraus der Wert der KARTE besteht — ihr gespeicherter Beleg,
                nicht der von heute [§C33 „Und niemand davor"]. */ belegHtml({ev:d.ev})}
          ${rekordLaufbahn(d.rekordId)}
          ${def ? `<button class="btn ghost sm" data-chron="${esc(def.id)}" style="margin-top:12px;width:100%">Rekord öffnen</button>` : ''}`;
      }
      // Die Monatschronik ist EINE Karte je Monat [§C33]. Im Blatt stehen
      // deshalb die Traeger, nicht ein einzelner Eintrag.
      // Eine Monatschronik hat den Halter gewechselt. Das Blatt zeigt, was
      // die Chronik wert ist (dieselbe Zahlenreihe wie im Awards-Tab [§C27]),
      // die Bedingung, das Podest des Monats und den Weg in die Tafel.
      case 'chronik_geholt': {
        const def = (typeof SEASON_TITLE_BY_ID !== 'undefined')
          ? SEASON_TITLE_BY_ID[d.titleId] : null;
        let podest = '', erfuellt = 0;
        try {
          const C = _seasonTitleCtx(d.sid);
          const r = def && def.pick ? def.pick(C, new Set()) : null;
          if(r && r.rang && r.rang.length){
            erfuellt = r.rang.length;
            podest = _chronPodestHtml(r.rang.map(pid => {
              let w = ''; try { w = r.evFuer ? r.evFuer(pid) : ''; } catch(e){}
              return {pid, wert:_chronKurz(w), v:r.wert ? r.wert(pid) : null};
            }));
          }
        } catch(e){}
        // Die Bedingung nur, wenn sie nicht schon oben steht [§C33 `_ndNeu`].
        const cond = (def && def.cond && _ndNeu(def.cond)) ? def.cond : '';
        const beitragIds = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(pid => pm[pid]);
        const laufbahn = _newsChronikPrestige(d);
        const beitrag = beitragIds.length
          ? `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
            + _ndChronikEbenen(d, undefined, beitragIds, pid => laufbahn.werte[pid],
                            laufbahn.modus, d.titleId)
          : '';
        return (def ? _chronFaktenHtml(def) : '')
          + (cond ? `<div class="tnote">${esc(cond)}</div>` : '')
          + (podest ? `<div class="nd-section">Dieser Monat</div>${podest}` : '')
          + (erfuellt > 1 ? `<div class="tnote">${erfuellt} erfüllen die Bedingung in diesem Monat.</div>` : '')
          + beitrag
          + `<button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      // Der Tag, an dem die Monatstafel aufgeht. Sie zeigt die vorläufigen
      // Profileinträge und die echte Punktewirkung — dieselbe Zeile wie beim
      // Chronik-Wechsel [§C27]. Ein `titleId` gibt es hier nicht: die Karte
      // handelt von der ganzen Tafel, nicht von einem Eintrag.
      case 'chronik_frei': {
        // `traeger` und nicht `playerIds`: auf der Karte steht kein Name,
        // damit der Deckel je Spieler die Karte nicht mitzaehlt [§C33].
        const ids = (Array.isArray(d.traeger) ? d.traeger : []).filter(pid => pm[pid]);
        // Der Monatsanteil aus der zentralen Tabelle, nicht aus dem Katalog:
        // je Spieler und Monat zählt genau eine Chronik [§C32].
        const monatWert = pid => {
          try {
            const q = ((prestigeTabelle().byPid[pid] || {}).quellen || [])
              .find(x => x.q === 'monat' && (!x.sid || x.sid === d.sid));
            return q ? Math.round((q.p || 0) * 10) / 10 : 0;
          } catch(e){ return 0; }
        };
        return `<div class="nd-gwert metall"><b>${esc(String(d.eintraege != null ? d.eintraege : ''))}</b>
            <span>Einträge in der Chronik</span></div>
          ${ids.length ? `<div class="nd-section">Tafel, Profil und Laufbahn</div>`
            + _ndChronikEbenen(d, undefined, ids, monatWert, 'bestand', '') : ''}
          <button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      case 'chronik_monat': {
        const ids = (Array.isArray(d.playerIds) ? d.playerIds : []).filter(pid => pm[pid]);
        // Neben dem Namen steht die Wertung, die er in diesem Monat haelt —
        // eine leere Spalte sagte gar nichts.
        const titelVon = pid => { try { const t = seasonTitleOf(pid, d.sid);
          return t && t.name ? t.name : ''; } catch(e){ return ''; } };
        return `<div class="nd-gwert gold"><b>${esc(String(d.eintraege != null ? d.eintraege : ids.length))}</b>
            <span>Einträge im ${esc(seasonLabel(d.sid) || '')}</span></div>
          ${ids.length ? `<div class="nd-section">Wer eingetragen ist</div>
          <div class="nd-vf">${ids.slice(0, 5).map(pid => `<div class="nd-vf-z" data-pid="${esc(pid)}">
            ${avHtml(pm[pid], '', {ins:true, px:30, feuer:0})}
            <span class="nd-vf-nm">${esc(nameOf(pid))}</span>
            <b class="nd-vf-t">${esc(titelVon(pid))}</b></div>`).join('')}</div>` : ''}
          <button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      // Der erste Eintrag ueberhaupt — der Moment, den ein Spieler aus der
      // unteren Haelfte sonst nie im Feed sieht [§C33]. Er verdient mehr als
      // eine Zeile.
      case 'chronik_erstling': {
        // Der Beleg stand nur im Satz oben. Hier gehoert er hin: was war die
        // Bedingung, und mit welcher Zahl hat er sie erfuellt.
        let t = null; try { t = seasonTitleOf(d.pid, d.sid); } catch(e){}
        const def = (t && typeof SEASON_TITLE_BY_ID !== 'undefined') ? SEASON_TITLE_BY_ID[t.id] : null;
        return `<div class="nd-gwert gold"><b>1.</b><span>Eintrag in der Chronik</span></div>
          <div class="nd-med nd-med-erst">
            <div class="nd-med-r">${svgI((t && t.ic) || (def && def.ic) || 'scroll')}</div>
            <div class="nd-med-t">
              <div class="nd-med-n">${esc((t && t.name) || d.titel || '')}</div>
              <div class="nd-med-k">${esc(seasonLabel(d.sid) || '')}</div>
              ${def && _ndNeu(def.cond) ? `<div class="nd-med-b">${esc(def.cond)}</div>` : ''}
            </div>
            ${t && _ndNeu(t.ev) ? `<div class="nd-med-h">${_newsBetont(t.ev)}</div>` : ''}
          </div>
          <button class="btn ghost sm" data-season-table="${esc(d.sid)}" style="margin-top:12px;width:100%">Ganze Tafel öffnen</button>`;
      }
      case 'top_clash': {
        // v9.3: Ränge explizit — Platz 1 (Sieger) & Platz 2 (Verfolger),
        // beide antippbar; darunter das Spitzenspiel als Match-VS-Block.
        const rankRows = (d.p1 && d.p2) ? `
          <div class="nd-stat-row" data-pid="${esc(d.p1)}" style="cursor:pointer"><div class="nd-stat-label">Platz 1</div><div class="nd-stat-val acid">${esc(nameOf(d.p1))} ›</div></div>
          <div class="nd-stat-row" data-pid="${esc(d.p2)}" style="cursor:pointer"><div class="nd-stat-label">Platz 2</div><div class="nd-stat-val">${esc(nameOf(d.p2))} ›</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return (rankRows ? `<div class="nd-section">Duell an der Spitze</div>${rankRows}` : '')
             + (matchHtml ? `<div class="nd-section">Das Spitzenspiel</div>${matchHtml}` : '');
      }
      case 'elo_record': {
        // v9.4: Rekordhalter (antippbar) + Rekordwert + auslösendes Match.
        const row = d.pid ? `<div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer"><div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val acid">${esc(nameOf(d.pid))} ›</div></div>` : '';
        const eloRow = d.elo!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Höchststand</div><div class="nd-stat-val acid">${d.elo} Elo</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return `<div class="nd-section">Liga-Rekord</div>${row}${eloRow}` + (matchHtml ? `<div class="nd-section">Rekord-Match</div>${matchHtml}` : '');
      }
      case 'streak_record': {
        const row = d.pid ? `<div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer"><div class="nd-stat-label">Rekordhalter</div><div class="nd-stat-val acid">${esc(nameOf(d.pid))} ›</div></div>` : '';
        const sRow = d.streak!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Siege in Folge</div><div class="nd-stat-val acid">${d.streak}</div></div>` : '';
        return `<div class="nd-section">Liga-Rekord</div>${row}${sRow}`;
      }
      case 'giant_slayer': {
        const pct = d.chance!=null ? `<div class="nd-stat-row"><div class="nd-stat-label">Siegchance</div><div class="nd-stat-val red">${Math.max(1,Math.round(d.chance*100))}%</div></div>` : '';
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        return `<div class="nd-section">Die Sensation</div>${pct}` + (matchHtml ? matchHtml : '');
      }
      // ── Das Blatt einer Partie ───────────────────────────────────
      // Unter der Bühne stehen Zeichnungen in fester Folge, jede nur, wo die
      // Bühne sie nicht schon zeigt: die Aufstellung, die Siegchance auf
      // ihrer Skala, die Elo-Wirkung je Spieler, die direkten Duelle, der
      // Tag und wie oft die Liga so ausgeht. Ein Abschnitt „Was dieses Spiel
      // besonders macht" stand dort als Wort und Satz („Außenseiter-Sieg ·
      // Die Rechnung stand dagegen") über einer Skala, die genau das zeigt.
      case 'spiel': return _ndPartieAbschnitte(s);
      // Zeilen aus aelteren Laeufen: der Generator bildet den Typ nicht mehr.
      case 'match_result': {
        const fakten = {
          zu_null: ['Ohne Gegentor', 'Kein Treffer für die Gegenseite'],
          upset:   ['Vor dem Spiel', d.chance != null ? `${Math.max(1, Math.round(d.chance * 100))} % Siegchance` : 'Außenseiter'],
          krimi:   ['Entscheidung', '1 Tor Unterschied'],
          kanter:  ['Entscheidung', `${d.margin || 0} Tore Unterschied`],
          eng:     ['Entscheidung', `${d.margin || 2} Tore Unterschied`]
        }[d.resultKind] || ['Ergebnis', 'Besondere Partie'];
        return `<div class="nd-section">Was dieses Spiel besonders macht</div>
          <div class="nd-stat-row"><div class="nd-stat-label">${esc(fakten[0])}</div>
            <div class="nd-stat-val acid">${esc(fakten[1])}</div></div>`;
      }
      case 'group': {
        // v8.8: zusammengefasste Karte ("N Pechvögel: …") — alle Beteiligten
        // tappbar, mit ihrem jeweiligen Wert (frag).
        const pids = Array.isArray(d.playerIds) ? d.playerIds : [];
        const frags = Array.isArray(d.frags) ? d.frags : [];
        const rows = pids.map((pid, i) => {
          const m = (frags[i] || '').match(/\(([^)]*)\)/);
          const val = m ? m[1] : '›';
          return `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">${esc(val)}</div></div>`;
        }).join('');
        return `<div class="nd-section">Beteiligte</div>${rows}`;
      }
      case 'potd': {
        // Der Held gross, darunter sein Rang und sein Zeichen, dann ein Satz
        // mit der Bedingung und erst danach die Zahlen. Vorher stand hier eine
        // Zeile mit dem Namen und ein Pfeil: „4 Siege · 57%" ohne die Angabe,
        // ab wie vielen Partien gewertet wird, liest sich wie eine
        // Karriere-Siegquote.
        const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
        const wr = d.wr != null ? Math.round(d.wr * 100) : null;
        const nl = (d.wins != null && d.games != null) ? (d.games - d.wins) : null;
        // Hier stand, ab wie vielen Partien gewertet wird und wann die Karte
        // erscheint. Das ist die Bauanleitung des Feeds, nicht die Nachricht:
        // wer das Blatt oeffnet, will wissen, was passiert ist, und der Kopf
        // darueber hat es schon gesagt. Die Zahlen darunter erklaeren sich
        // selbst.
        const satz = '';
        const gitter = `<div class="nd-gitter">
            ${wr != null ? `<div><b class="g">${wr} %</b><span>Siegquote</span></div>` : ''}
            ${d.wins != null ? `<div><b>${d.wins}${nl != null ? ' : ' + nl : ''}</b><span>Siege${nl != null ? ' zu Niederlagen' : ''}</span></div>` : ''}
          </div>`;
        const weitere = pids.length > 1
          ? `<div class="nd-section">Punktgleich</div>` + pids.slice(1).map(pid =>
              `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
                <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">›</div></div>`).join('')
          : '';
        // Die Partien des Tages. „Kein anderer holte mehr Siege" ist eine
        // Behauptung, und das Blatt zeigte sie nicht. Die Liste darf nicht
        // nach vier Zeilen abbrechen: an vollen Spieltagen gingen dadurch
        // genau die Partien verloren, auf denen die Tageswertung beruht.
        const tag = _newsTagPartien(d.dayKey, pids);
        const bahn = _ndTagesbahn(pids, tag);
        const spiele = bahn
          ? `<div class="nd-section">${pids.length > 1 ? 'Der Tag der Tagessieger' : 'Der Tag in Partien'}</div>` + bahn
          : (tag.length
              ? `<div class="nd-section">Die Partien an diesem Tag</div>`
                + tag.map(m => _newsMatchVsBlock(m.id)).join('')
              : '');
        return satz + gitter + weitere + spiele;
      }
      // ── Die Woche: sechs Wertungen in einem Blatt ────────────────────
      // Der Wochenrueckblick stand vorher als sechs Karten ueber den Montag
      // verteilt. Jetzt ist er eine Karte, und das Blatt traegt jede Wertung
      // als eigene Zeile mit Gesicht und Zahl — nichts geht verloren, aber der
      // Feed traegt statt sechs Karten eine.
      case 'woche': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        // „3 Partien an 2 Tagen" steht schon im Text der Karte, drei Zeilen
        // darueber. Die Zeile bleibt nur, wenn er sie nicht nennt.
        const kopfWert = `${d.spiele || 0} an ${d.tage || 0} ${d.tage === 1 ? 'Tag' : 'Tagen'}`;
        // Der Text sagt „20 Spiele an 4 Tagen", die Zeile „20 an 4 Tagen" —
        // verglichen wurde nur die zweite Form, und beide standen da.
        const nennt = [kopfWert, `${d.spiele || 0} Spiele an ${d.tage || 0}`,
          `${d.spiele || 0} Partien an ${d.tage || 0}`]
          .some(v => _ndOben.indexOf(_ndNormal(v)) >= 0);
        const kopf = nennt ? '' : `<div class="nd-stat-row">
            <div class="nd-stat-label">Partien in dieser Woche</div>
            <div class="nd-stat-val acid">${esc(kopfWert)}</div></div>`;
        // Jede Wertung als Zeile: Gesicht, Name, Wertung und Zahl. Darunter
        // stand je ein Satz („Julian hat in dieser Woche 101 Elo gutgemacht.
        // Das ist der größte Anstieg der Liga."), der Zahl und Wertung daneben
        // ein zweites Mal sagte, und die Namen standen als Pillen ohne Gesicht.
        const zeilen = teile.map(t => {
          const ids = (Array.isArray(t.pids) ? t.pids : []).filter(pid => pm[pid]).slice(0, 2);
          return `<div class="nd-wo-z${t.held ? ' gold' : ''}"${ids[0] ? ` data-pid="${esc(ids[0])}"` : ''}>
              <span class="sp-chips">${ids.map(_spChip).join('')}</span>
              <span class="nd-wo-t"><b>${esc(_namenListe(ids.map(nameOf)))}</b><small>${esc(t.label || '')}</small></span>
              <b class="nd-wo-w num">${esc(t.wert || '')}</b></div>`;
        }).join('');
        return `<div class="nd-section">Die Woche</div>${kopf}
          <div class="nd-wo">${zeilen}</div>`;
      }
      // ── Die Sammelkarte: was im selben Moment passiert ist ───────────
      // Der Kopf fasst zusammen. Darunter stehen alle Teile gleichrangig;
      // keines davon wird zum heimlichen zweiten Kopf.
      case 'sammel': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        // Die Ergebnis-Karte handelt von zwei Partien, und eine Partie sieht
        // man am Ergebnis. Auf der Karte ist dafuer kein Platz [§C27], im
        // Blatt schon: jede Zeile bekommt ihr eigenes Band. Ohne das stand
        // dort zweimal ein Satz ueber ein Spiel, dessen Stand nur im
        // Sammelband der Karte zu sehen war.
        const jeZeileBand = d.quelle === 'ergebnis';
        // Jede Änderung mit ihrer eigenen Uhrzeit: ein Tafel-Moment umfasst
        // mehrere Partien, und die Liste stand ohne jeden Zeitbezug da. Das
        // Ergebnis der eigenen Partie kommt dazu, wo es ein anderes ist als
        // das Band über der Liste — als Stand, nicht als zweites Band: neun
        // Bänder mit je vier Wappen sind das, wovor „Detail folgt der Größe"
        // warnt [§C33].
        const zeileStand = t => {
          if(!t.matchId || t.matchId === d.matchId) return '';
          const m = (matches || []).find(x => x.id === t.matchId);
          if(!m) return '';
          return standFuer(m);
        };
        const tafelBild = d.quelle === 'tafel' || d.quelle === 'form';
        const _zeile = t => {
          const uhr = t.ms ? _newsUhrzeit(t.ms) : '';
          const stand = zeileStand(t);
          const zeit = [uhr, stand].filter(Boolean).join(' · ');
          // Eine Zeile der Tafel ist ein Bild aus Gesichtern und Wert; ihr
          // Satz stand darunter und wiederholte beides [§C33].
          const bild = tafelBild ? _ndTafelZeileBild(t) : null;
          if(bild) return `<div class="nw-zeile nw-tz${t.neg ? ' neg' : ''}"${
              (t.pids && t.pids[0]) ? ` data-pid="${esc(t.pids[0])}" style="cursor:pointer"` : ''}>
              ${t.ic ? `<i class="nw-ic">${svgI(t.ic)}</i>` : ''}
              <span class="nw-tz-t"><span class="nw-label">${esc(bild.label)}</span>${
                t.klasse ? `<b class="nw-kl">${esc(t.klasse)}</b>` : ''}${t.marke ? `<b class="nw-mk">${esc(t.marke)}</b>` : ''}
                <small>${esc([bild.verb, zeit].filter(Boolean).join(' · '))}</small></span>
              <span class="nw-tz-r">${bild.rechts}</span></div>`;
          return `<div class="nw-zeile${t.neg ? ' neg' : ''}"${
              (t.pids && t.pids[0]) ? ` data-pid="${esc(t.pids[0])}" style="cursor:pointer"` : ''}>
              <div class="nw-zeile-kopf">${t.ic
                ? `<i class="nw-ic">${svgI(t.ic)}</i>` : ''}<span class="nw-label">${
                esc(t.titel || '')}</span>${
                t.klasse ? `<b class="nw-kl">${esc(t.klasse)}</b>` : ''}${
                t.marke ? `<b class="nw-mk">${esc(t.marke)}</b>` : ''}${
                t.wert ? `<span class="nw-wert">${esc(t.wert)}</span>` : ''}</div>
              ${zeit ? `<div class="nw-satz num">${esc(zeit)}</div>` : ''}
              ${jeZeileBand && t.matchId ? _newsMatchVsBlock(t.matchId) : ''}
              ${_ndNeu(t.text) ? `<div class="nw-satz">${esc(t.text)}</div>` : ''}
            </div>`;
        };
        // ── Zweiundzwanzig Zeilen sind keine Liste, sie sind eine Wand ──
        // Gemessen trug ein Tafel-Moment 22 Zeilen — sechs Bestmarken, neun
        // Ausbauten, fuenf Chroniken und zwei Insignien — und sie standen als
        // EIN Stapel untereinander. Wer ihn oeffnete, konnte nicht sehen, was
        // ein Wechsel und was nur ein besserer Wert war. Gruppen mit Zeichen
        // und Zahl machen das navigierbar; `rcpAbschnitt` ist die
        // Ueberschrift, die die App dafuer schon hat [§C31].
        const gruppiert = (function(){
          if(d.quelle !== 'tafel' && d.quelle !== 'form') return '';
          if(typeof rcpAbschnitt !== 'function') return '';
          // Unter vier Zeilen sagt eine Gruppierung nichts. Erst danach
          // zeichnen, sonst würde ihre komplette, verworfene Liste gebaut.
          if(teile.length < 4) return '';
          const typ = t => String((t && (t.typ || t.type)) || '');
          const gr = [
            {t:'Bestmarken', f:x => typ(x).indexOf('rekord_') === 0
                                 && typ(x) !== 'rekord_gesteigert'},
            {t:'Monatschroniken', f:x => typ(x).indexOf('chronik_') === 0},
            {t:'Neue Insignien', f:x => typ(x) === 'insignium_stufe'},
            {t:'Ausbauten', f:x => typ(x) === 'rekord_gesteigert'}
          ];
          const rest = teile.slice();
          const aus = [];
          gr.forEach(g => {
            const l = rest.filter(g.f);
            l.forEach(x => rest.splice(rest.indexOf(x), 1));
            if(l.length) aus.push(rcpAbschnitt(g.t, l.length)
              + `<div class="nw-liste">${l.map(_zeile).join('')}</div>`);
          });
          if(rest.length) aus.push(`<div class="nw-liste">${rest.map(_zeile).join('')}</div>`);
          return aus.join('');
        })();
        // ── Ein Bereich für die Wirkung, nicht einer je Zeile ───────────
        // Die Punktewirkung eines Spieltags ist je Spieler EINE Zahl, egal
        // aus welcher Zeile sie kommt: beide Stände gehören dem Tag, nicht
        // dem einzelnen Rekord [§11.0e]. Je Zeile gezeigt stünde dieselbe
        // Rechnung neunmal untereinander; hier steht sie einmal je Spieler.
        const wirkung = (function(){
          const je = {};
          teile.forEach(t => {
            const lb = t.lb;
            if(!lb) return;
            Object.keys(lb).forEach(pid => { if(!je[pid] && pm[pid]) je[pid] = lb[pid]; });
          });
          const ids = Object.keys(je);
          if(!ids.length) return '';
          return `<div class="nd-section">Wirkung auf die Laufbahn</div>`
            + _ndWirkungBlock(je, _ndWirkungsGruende(teile));
        })();
        // ── Das Bündel einer Partie ──────────────────────────────────
        // Es trägt die Zeichnung seiner Karte als Bühne [§C33], darunter, was
        // an der Partie hängt, und dann dieselben Abschnitte wie das Blatt
        // der Partie. Die Zeile der Partie selbst fällt weg: sie IST die
        // Bühne, und ihr Satz stand wortgleich ein zweites Mal darunter. Die
        // Uhrzeit fällt in jeder Zeile weg, die zu dieser Partie gehört —
        // neunmal „14:32" untereinander sagt nichts.
        if(d.matchId && _newsSorte(s) === 'spiel'){
          const eigen = teile.filter(t => String(t.typ || t.type || '') !== 'spiel');
          const zl = eigen.map(t => _zeile(Object.assign({}, t, {ms:t.matchId && t.matchId !== d.matchId ? t.ms : null}))).join('');
          return (zl ? `<div class="nd-section">Was dazu gehört</div><div class="nw-liste">${zl}</div>` : '')
            + _ndPartieAbschnitte(s) + wirkung;
        }
        // Die Gruppierung und das Matchblatt haben ihre Zeilen bereits.
        // Nur der tatsächlich sichtbare Rückfall zeichnet die flache Liste.
        const zeilen = gruppiert ? '' : teile.map(_zeile).join('');
        const mv = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        // Die Ueberschrift sagt, was die Liste ist. „In dieser Partie" stand
        // auch ueber der Karte, auf der drei Spieler dieselbe Stufe
        // erreichen — und die entsteht am Ende eines Spieltags, nicht in
        // einer Partie.
        // ── Was hier relevant ist, steht in Zahlen davor ────────────
        // Neun Zeilen untereinander sagen nicht, wovon der Tag handelt: wie
        // viele Rekorde wirklich den Halter gewechselt haben, wie viele nur
        // ausgebaut wurden, wie viele Chroniken dazukamen und was am Ende an
        // Prestige haengenblieb. Die Zahlenreihe ist das Bauteil, das die
        // Rueckblicke dafuer schon haben [§C31].
        const uebersicht = (function(){
          if(d.quelle !== 'tafel' && d.quelle !== 'form') return '';
          if(typeof rcpZahlenHtml !== 'function') return '';
          const typ = t => String((t && (t.typ || t.type)) || '');
          const wech = teile.filter(t => typ(t).indexOf('rekord_') === 0
            && typ(t) !== 'rekord_gesteigert').length;
          const aus = teile.filter(t => typ(t) === 'rekord_gesteigert').length;
          const chr = teile.filter(t => typ(t).indexOf('chronik_') === 0).length;
          const insz = teile.filter(t => typ(t) === 'insignium_stufe').length;
          let plus = 0, minus = 0;
          const gez = {};
          teile.forEach(t => { const lb = t.lb; if(!lb) return;
            Object.keys(lb).forEach(pid => { if(gez[pid]) return; gez[pid] = 1;
              const dd = Math.round(Number(lb[pid].nach) || 0) - Math.round(Number(lb[pid].vor) || 0);
              if(dd > 0) plus += dd; else minus -= dd; }); });
          const z = [
            wech ? {v: wech, l: wech === 1 ? 'Bestmarke' : 'Bestmarken', ton:'gold'} : null,
            aus ? {v: aus, l: aus === 1 ? 'Ausbau' : 'Ausbauten'} : null,
            chr ? {v: chr, l: chr === 1 ? 'Chronik' : 'Chroniken'} : null,
            insz ? {v: insz, l: insz === 1 ? 'Insignium' : 'Insignien'} : null,
            plus ? {v: '+' + plus, l:'Prestige', ton:'gold'} : null,
            // Was andere dabei verloren haben, steht daneben und nicht darin:
            // ein Minus in derselben Summe hiesse, der Tag haette weniger
            // gebracht, und er hat zwei Dinge getan [§C25].
            minus ? {v: '−' + minus, l:'verloren', ton:'rot'} : null
          ].filter(Boolean);
          return z.length > 1 ? rcpZahlenHtml(z) : '';
        })();
        const kopfzeile = d.quelle === 'tafel' ? 'An der Ewigen Tafel'
          : d.quelle === 'form' ? 'Auf kurzer Strecke'
          : d.quelle === 'spieler' ? 'Alles in diesem Moment'
          : d.quelle === 'erfolg' ? 'Alle mit diesem Erfolg'
          : d.quelle === 'ergebnis' ? 'Diese beiden Partien'
          : 'In dieser Partie';
        // ── Eine Ueberschrift ueber Ueberschriften sagt nichts ─────────
        // „An der Ewigen Tafel" stand als Sammelueberschrift direkt ueber
        // „Bestmarken 1" und „Monatschroniken 2" — und dieselbe Aussage stand
        // auf demselben Blatt schon dreimal: in der Rubrik, in der
        // Schlagzeile („… bewegen die Ewige Tafel") und unter den Wappen
        // („an der Ewigen Tafel"). Wo die Liste ihre eigenen Ueberschriften
        // traegt, faellt die darueber weg; ohne Gruppierung bleibt sie, denn
        // dann hat die Liste keine [§C33].
        return uebersicht
          + (gruppiert
              ? `${mv}${gruppiert}`
              : `<div class="nd-section">${kopfzeile}</div>${mv}<div class="nw-liste">${zeilen}</div>`)
          + wirkung;
      }
      // Die Stufe IST die Story — und das Blatt war leer.
      case 'insignium_stufe': {
        // Darunter stand „Die beiden obersten Stufen erreicht kaum jemand,
        // deshalb ist diese Karte Breaking [§C30]" — die App erklaerte dem
        // Leser ihre eigene Regel und zitierte dabei ihren Paragraphen. Dass
        // die Stufe selten ist, sagt die Leiter im Block darueber.
        return `<div class="nd-section">Die neue Stufe</div>`
          + _newsInsigniumBlock(d.pid, d.stufe);
      }
      case 'ambient': {
        // Vorher stand hier „Im Fokus: Stefan" — ein Wappen mit dem Namen, den
        // der Kopf zwei Zeilen darüber schon zeigt, und sonst NICHTS. Wer eine
        // Prestige-Karte öffnete, sah kein Zeichen, keine Leiter, keine Zahl.
        // Jetzt trägt jede ambiente Karte ihren Wert groß, und wo es ums
        // Prestige geht, steht die Leiter dabei — sie IST die Aussage.
        const wertBlock = (d.vv != null && d.vv !== '')
          ? `<div class="nd-gwert ${d.prestige ? 'gold' : ''}"><b>${esc(String(d.vv))}</b>`
            + `<span>${esc(d.vl || '')}</span></div>` : '';
        // Die Leiter der Liga: jedes Feld mit den Gesichtern, die es tragen,
        // so wie es am Tag der Karte stand [§C30].
        if(d.leiter) return wertBlock + `<div class="nd-section">Die Leiter der Liga</div>`
          + _ndLigaLeiter(d.leiter);
        if(d.ambientPid && pm[d.ambientPid]){
          return wertBlock
            + (d.prestige ? `<div class="nd-section">Der Stand am Zeichen</div>`
                            + _newsInsigniumBlock(d.ambientPid) : '')
            + (!wertBlock && !d.prestige ? `<div class="nd-section">Im Fokus</div>
              <div class="nd-vs"><div class="nd-vs-p" data-pid="${esc(d.ambientPid)}">
                ${avM(d.ambientPid)}<div class="nd-vs-name">${esc(nameOf(d.ambientPid))}</div>
              </div></div>` : '');
        }
        if(wertBlock && !(Array.isArray(d.ambientPids) && d.ambientPids.length === 2)) return wertBlock;
        if(Array.isArray(d.ambientPids) && d.ambientPids.length === 2 && pm[d.ambientPids[0]] && pm[d.ambientPids[1]]){
          const [pa, pb] = d.ambientPids;
          // v9.17: Paare sind nicht automatisch Gegner. Team-Stories (z.B. die
          // gemeinsame Siegesserie eines Duos) wurden bisher als „Duell … vs …"
          // gerendert, obwohl die beiden ZUSAMMEN spielen. pairKind kommt aus dem
          // Template; für bereits persistierte Rows ohne Feld entscheidet die
          // Kategorie ('team' → Team, sonst Duell).
          const isTeam = d.pairKind === 'team' || (!d.pairKind && s.cat === 'team');
          return `<div class="nd-section">${isTeam ? 'Das Duo' : 'Duell'}</div>
            <div class="nd-vs">
              <div class="nd-vs-p" data-pid="${esc(pa)}">${avM(pa)}<div class="nd-vs-name">${esc(nameOf(pa))}</div></div>
              <div class="nd-vs-mid">${isTeam ? '&amp;' : 'vs'}</div>
              <div class="nd-vs-p" data-pid="${esc(pb)}">${avM(pb)}<div class="nd-vs-name">${esc(nameOf(pb))}</div></div>
            </div>`;
        }
        return '';
      }
      case 'season_endgame': {
        const pA = d.leader, pB = d.second;
        return `<div class="nd-section">Top-2 Stand</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(pA.pid)}">
              ${avM(pA.pid)}
              <div class="nd-vs-name">${esc(nameOf(pA.pid))}</div>
              <div class="nd-vs-elo">${pA.elo} Elo</div>
            </div>
            <div class="nd-vs-mid">${d.gap}<div class="nd-vs-mid-sub">Elo Diff</div></div>
            <div class="nd-vs-p" data-pid="${esc(pB.pid)}">
              ${avM(pB.pid)}
              <div class="nd-vs-name">${esc(nameOf(pB.pid))}</div>
              <div class="nd-vs-elo">${pB.elo} Elo</div>
            </div>
          </div>
          <div class="nd-stat-row"><div class="nd-stat-label">Verbleibend</div><div class="nd-stat-val acid">${d.daysLeft} ${d.daysLeft===1?'Tag':'Tage'}</div></div>`;
      }
      case 'lead_change': {
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        const eloChg = d.matchId ? _newsEloDelta(d.newLeader, d.matchId) : null;
        const rankInfo = d.matchId ? _newsRankChange(d.newLeader, d.matchId) : null;
        // Die Spitze kann an einem Tag mehrmals wechseln. Der Kopf zeigt den
        // Stand am Ende des Tages; wer nur ihn sieht, erfaehrt nicht, dass
        // die Tabelle zwischendurch schon einmal jemand anderem gehoerte.
        // Gezeigt wird deshalb jeder Wechsel aus `events` — dieselben Fakten,
        // aus denen die Karte entsteht [§11.0e]. Bei genau einem Wechsel
        // bleiben die Zeilen weg: er steht zwei Zeilen darueber schon [§C33].
        const ev = Array.isArray(d.events) ? d.events : [];
        const wechselHtml = ev.length > 1 ? ev.map(e => {
          const nach = (e.detail && e.detail.nach) || e.actorIds[0];
          const vor  = (e.detail && e.detail.vor)  || e.actorIds[1];
          return rcpZeileHtml({ic:'kingClass', name:nameOf(nach),
            sub:'von ' + nameOf(vor) + (e.evidence ? ', ' + e.evidence : ''),
            rechts:e.occurredAt ? _newsUhrzeit(e.occurredAt) : '',
            attr:`data-pid="${esc(nach)}" style="cursor:pointer"`});
        }).join('') : '';
        return `<div class="nd-section">Wechsel an der Spitze</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.newLeader)}">
              ${avM(d.newLeader)}
              <div class="nd-vs-name">${esc(nameOf(d.newLeader))}</div>
              <div class="nd-vs-elo" style="color:var(--acid)">neuer #1</div>
            </div>
            <div class="nd-vs-mid">↑<div class="nd-vs-mid-sub">${d.zurueck ? 'holt zurück' : 'übernimmt'}</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.prevLeader)}">
              ${avM(d.prevLeader)}
              <div class="nd-vs-name">${esc(nameOf(d.prevLeader))}</div>
              <div class="nd-vs-elo">vorher #1</div>
            </div>
          </div>
          ${eloChg !== null ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Elo-Veränderung</div>
            <div class="nd-stat-val ${eloChg>=0?'pos':'neg'}">${eloChg>=0?'+':''}${eloChg}</div>
          </div>` : ''}
          ${rankInfo ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Tabelle</div>
            <div class="nd-stat-val acid">#${rankInfo.pre} → #${rankInfo.post}</div>
          </div>` : ''}
          ${wechselHtml ? `<div class="nd-section">Alle ${ev.length} Wechsel des Tages</div>${wechselHtml}` : ''}
          ${matchHtml ? `<div class="nd-section">Die Partie</div>${matchHtml}` : ''}`;
      }
      case 'top_form': {
        const form = _newsRecentForm(d.pid, 10, s);
        return `<div class="nd-section">Die letzten 10 Partien bis hierher</div>
          ${form.strip ? `<div class="nd-form-strip">${form.strip}</div>` : ''}
          <div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(d.pid))}</div>
            <div class="nd-stat-val acid">${d.wins}/10 Siege</div></div>
          ${form.currentStreak >= 2 ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege in Folge</div>
            <div class="nd-stat-val acid">${form.currentStreak}</div></div>` : ''}`;
      }
      case 'loss_streak': {
        // Die Reihe der letzten zehn steht nur, wenn sie mehr zeigt als die
        // Serie selbst: bei zehn Pleiten in Folge ist sie dieselbe Zeichnung
        // ein zweites Mal. Die Zeile „Leo · 10× Niederlage in Folge" darunter
        // nannte dieselbe Zahl ein drittes Mal und ist weg [§C33 `_ndNeu`].
        const form = d.streak < 10 ? _newsRecentForm(d.pid, 10, s) : {strip:''};
        return `<div class="nd-section">Die Serie</div>
          ${_newsSerienBand(d.streak, true)}
          ${form.strip ? `<div class="nd-section">Die letzten 10 Partien bis hierher</div>
          <div class="nd-form-strip">${form.strip}</div>` : ''}`;
      }
      case 'badge_unlocked': {
        // v8.6: bei konsolidierten Karten (mehrere Spieler, gleicher Badge im
        // selben Match) alle Beteiligten listen; sonst der einzelne Spieler.
        const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
        const matchHtml = d.matchId ? _newsMatchVsBlock(d.matchId) : '';
        const eloChg = (pids.length === 1 && d.matchId) ? _newsEloDelta(pids[0], d.matchId) : null;
        // Das Blatt einer Auszeichnung soll belohnen. Vorher stand dort eine
        // Zeile „Spieler: Leo ›" — obwohl der Kopf schon Leo zeigte —, darunter
        // „Seltenheit: Negative" in Englisch. Jetzt traegt es das Medaillon,
        // die Klasse und die Zahl der Halter: „einer von zwoelf" ist das, was
        // eine Auszeichnung wert macht [§C34].
        const bdef = (typeof BADGES !== 'undefined')
          ? BADGES.find(b => b.id === d.badgeId) : null;
        const medaille = _newsMedaillon(s.ic || (bdef && bdef.ic) || 'medal', d.rarity,
          d.badgeName || (bdef && bdef.name) || '', bdef ? bdef.desc : '', d.badgeId);
        // Mehrere Spieler nur dann als Liste — bei einem steht er im Kopf.
        const playersHtml = pids.length > 1
          ? `<div class="nd-section">${pids.length} Spieler</div>` + pids.map(pid =>
              `<div class="nd-stat-row" data-pid="${esc(pid)}" style="cursor:pointer">
                <div class="nd-stat-label">${esc(nameOf(pid))}</div><div class="nd-stat-val">›</div></div>`).join('')
          : '';
        // Den Gegner nennt der Text der Karte schon; die Zeile bleibt nur,
        // wenn er dort nicht steht — antippbar ist sie in beiden Faellen.
        const nemRow = (d.nemesisOppId && _ndNormal(_ndOben).indexOf(_ndNormal(nameOf(d.nemesisOppId))) < 0)
          ? `<div class="nd-stat-row" data-pid="${esc(d.nemesisOppId)}" style="cursor:pointer">
            <div class="nd-stat-label">Gegen wen</div>
            <div class="nd-stat-val neg">${esc(nameOf(d.nemesisOppId))} ›</div></div>` : '';
        return medaille + playersHtml + nemRow
          + (eloChg !== null ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Elo aus dieser Partie</div>
            <div class="nd-stat-val ${eloChg>=0?'pos':'neg'}">${eloChg>=0?'+':''}${eloChg}</div></div>` : '')
          + (matchHtml ? `<div class="nd-section">Die Partie</div>${matchHtml}` : '');
      }
      // Die gesammelten runden Marken eines Tages. Bei EINER Marke ist das
      // dieselbe Aussage wie bei einer einzelnen Auszeichnung, also dasselbe
      // Bauteil [§C27]: das Medaillon mit Klasse, Bedingung und Halterzahl.
      // Bei mehreren traegt jede Zeile ihren Traeger, ihr Zeichen und die
      // Zahl — ohne diesen Fall blieb das Blatt leer, und ein leeres Blatt
      // ist schlimmer als eine Wiederholung [§C33].
      case 'badge_marken': {
        const l = Array.isArray(d.marken) ? d.marken : [];
        const def = id => (typeof BADGES !== 'undefined') ? BADGES.find(b => b.id === id) : null;
        if(l.length === 1){
          const b0 = def(l[0].badgeId);
          return _newsMedaillon((b0 && b0.ic) || s.ic || 'medal',
              (typeof rarityOf === 'function') ? rarityOf(l[0].badgeId) : 'common',
              l[0].name || (b0 && b0.name) || '', b0 ? b0.desc : '', l[0].badgeId)
            + (d.matchId ? `<div class="nd-section">Die Partie</div>`
                + _newsMatchVsBlock(d.matchId) : '');
        }
        return `<div class="nd-section">${l.length} runde Marken</div>`
          + l.map(x => rcpZeileHtml({ic:(def(x.badgeId) || {}).ic || 'medal',
              name:nameOf(x.pid), sub:x.name,
              rechts:'zum ' + x.rang + '. Mal',
              attr:`data-pid="${esc(x.pid)}" style="cursor:pointer"`})).join('');
      }
      case 'rivalry': {
        // Live-Bilanz aus matches berechnen — günstig, da rivalry-Stories selten sind.
        const h2h = _newsH2HRecord(d.a, d.b);
        return `<div class="nd-section">Die Kontrahenten</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.a)}">
              ${avM(d.a)}
              <div class="nd-vs-name">${esc(nameOf(d.a))}</div>
              <div class="nd-vs-elo">${esc(_newsRangKurz(d.a) || '')}</div>
            </div>
            <div class="nd-vs-mid">VS<div class="nd-vs-mid-sub">${d.n} Duelle</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.b)}">
              ${avM(d.b)}
              <div class="nd-vs-name">${esc(nameOf(d.b))}</div>
              <div class="nd-vs-elo">${esc(_newsRangKurz(d.b) || '')}</div>
            </div>
          </div>
          ${_newsBilanzBalken(d.a, d.b, h2h.aWins, h2h.bWins)}
          ${h2h.lastMatchId ? `<div class="nd-section">Letztes Duell</div>${_newsMatchVsBlock(h2h.lastMatchId)}` : ''}`;
      }
      // Zwei, die zusammen spielen, hatten im Blatt gar keinen Fall: das
      // Duo-Blatt zeigte den Kopf und den Satz von der Karte. Jetzt steht die
      // Serie als Lauf da und darunter, wie oft die beiden ueberhaupt
      // zusammen gespielt haben.
      case 'team_streak':
      case 'team_loss_streak': {
        const verloren = d.type === 'team_loss_streak';
        let tw = null;
        try { tw = teamStatsFromMatches(_ndBisPartie(s)).find(t =>
          (t.ids || []).includes(d.a) && (t.ids || []).includes(d.b)); } catch(e){}
        // Die Zahl der Partien steht schon als Lauf darueber — sie stand hier
        // ein zweites Mal als Ziffer.
        //
        // Und die letzte gemeinsame Partie steht nur da, wenn die Karte keine
        // eigene nennt. Seit die Marke an ihrer ausloesenden Partie haengt,
        // zeigt der Kopf diese schon, und darunter stand eine ZWEITE
        // Begegnung derselben beiden — die Partie steht hoechstens einmal im
        // Blatt [§C27].
        let letzte = null;
        if(!d.matchId){
          try { letzte = [...matches].reverse().find(m =>
            [m.a1, m.a2].every(x => x === d.a || x === d.b) ||
            [m.b1, m.b2].every(x => x === d.a || x === d.b)); } catch(e){}
        }
        return `<div class="nd-section">${verloren ? 'Die Durststrecke' : 'Die Serie'}</div>
          ${_newsSerienBand(d.streak, verloren)}
          ${tw ? `<div class="nd-stat-row"><div class="nd-stat-label">Gemeinsame Bilanz bis hierher</div>
            <div class="nd-stat-val">${tw.w}:${tw.g - tw.w}</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Siegquote als Duo</div>
            <div class="nd-stat-val ${tw.w * 2 >= tw.g ? 'acid' : 'neg'}">${Math.round(tw.w / tw.g * 100)} %</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">Tore</div>
            <div class="nd-stat-val">${tw.gf}:${tw.ga}</div></div>` : ''}
          ${letzte && letzte.id !== _ndKopfMatch
            ? `<div class="nd-section">Die letzte gemeinsame Partie</div>${_newsMatchVsBlock(letzte.id)}` : ''}`;
      }
      case 'jubilee': {
        // Karriere-Bilanz nutzen statt nur Total — bestehende Stats-Funktion.
        const stats = _ndBilanzBis(d.pid, s);
        return `<div class="nd-section">Die ersten ${esc(String(d.total))} Spiele</div>
          ${stats ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege / Niederlagen</div>
            <div class="nd-stat-val">${stats.wins} / ${stats.losses}</div></div>
          <div class="nd-stat-row">
            <div class="nd-stat-label">Siegquote</div>
            <div class="nd-stat-val acid">${stats.winRate} %</div></div>` : ''}
          ${d.matchId ? `<div class="nd-section">Die Jubiläumspartie</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      case 'quiet_week': {
        return `<div class="nd-section">Aktivität</div>
          <div class="nd-stat-row"><div class="nd-stat-label">Letzte 7 Tage</div><div class="nd-stat-val">${d.lastWeek} Spiele</div></div>
          <div class="nd-stat-row"><div class="nd-stat-label">4-Wochen-Schnitt</div><div class="nd-stat-val">${d.avg} Spiele</div></div>`;
      }
      case 'season_recap': {
        // Der Monatsrückblick und die Monatschronik sind zwei verschiedene
        // Geschichten: hier stehen Saisonspitze und Spielgeschehen, dort die
        // vergebenen Chronik-Einträge.
        //
        // ── Die Meisterbühne [§C31] ────────────────────────────────
        // Das Blatt nannte drei Elo-Zahlen untereinander und darunter die
        // Saison-ID. Wie der Titel zustande kam — ob der Meister die Spitze
        // nie hergab oder sie am letzten Tag holte —, stand nirgends. Jetzt:
        // das Podest unter einem Strahlenkranz, das Rennen um die Spitze als
        // Linien, die Tage vorn als Balken und die Saison des Meisters als
        // Zellen, eine je Partie. Alles aus den Bauteilen, die der
        // Saison-Rückblick auch zeichnet [§C27].
        const rang = saisonRang(d.sid);
        const te = Array.isArray(d.topElo) ? d.topElo : [];
        const ids = te.map(x => x && x.id).filter(id => id && pm[id]);
        const monat = typeof seasonLabel === 'function' ? seasonLabel(d.sid) : '';
        const buehne = rang.length ? `<div class="nd-meister">
            <div class="nd-ms-band">${svgI('crown')}<span>Meister</span><i>${esc(monat)}</i></div>
            <div class="nf-meister gross"><span class="nf-ms-strahl" aria-hidden="true"></span>${
              saisonPodestHtml(d.sid, rang, {px1:96, px:64, attr:'data-pid'})}</div></div>` : '';
        const rennen = saisonRennenHtml(d.sid, ids);
        const spitze = saisonSpitzeHtml(d.sid, ids);
        const r = rang.find(x => x.id === d.championId);
        // Drei Zellen je Reihe: eine vierte bricht bei 360 px in eine eigene
        // Zeile um und steht dann doppelt so breit da wie ihre Nachbarn.
        const meister = r ? rcpZahlenHtml([
          {v: Math.round(r.wins / Math.max(1, r.wins + r.losses) * 100) + ' %', l:'Siegquote', ton:'gold'},
          {v: r.wins + ':' + r.losses, l:'Siege zu Niederlagen'},
          {v: (r.diff >= 0 ? '+' : '') + r.diff, l:'Torbilanz'}
        ]) + saisonZellenHtml(d.sid, d.championId) : '';
        const f = d.fakten || {};
        const zahlen = (f.spiele != null || f.tore != null) ? rcpZahlenHtml([
          f.spiele != null ? {v: f.spiele, l:'Partien'} : null,
          f.toreJeSpiel != null ? {v: komma(f.toreJeSpiel), l:'Tore je Partie'} : null,
          f.engeSpiele != null ? {v: f.engeSpiele, l:'knapp entschieden'} : null
        ]) : '';
        const klar = f.klarstes && f.klarstes.matchId
          ? `<div class="nd-section">Klarstes Ergebnis</div>${_newsMatchVsBlock(f.klarstes.matchId)}` : '';
        const torreich = f.torreichstes && f.torreichstes.matchId
          && (!f.klarstes || f.torreichstes.matchId !== f.klarstes.matchId)
          ? `<div class="nd-section">Torreichstes Spiel</div>${_newsMatchVsBlock(f.torreichstes.matchId)}` : '';
        return buehne
          + (rennen ? `<div class="nd-section">Das Titelrennen</div>${rennen}` : '')
          + (spitze ? `<div class="nd-section">An der Spitze</div>${spitze}` : '')
          + (meister ? `<div class="nd-section">Die Saison von ${esc(nameOf(d.championId))}</div>${meister}` : '')
          + (zahlen ? `<div class="nd-section">Der Monat in Zahlen</div>${zahlen}` : '')
          + klar + torreich;
      }
      // Die Karte sagt, dass der Monat eine Tabelle hat, und ihr Blatt zeigte
      // nur die Saison-ID — eine Zeichenkette, die niemanden interessiert. Die
      // Angaben liegen im `dataRef`: die beiden an der Spitze, ihr Abstand und
      // die Stichprobe, ab der gewertet wird. Der Vs-Block und die Zahlenreihe
      // sind die Bauteile, die die App dafuer schon hat [§C27].
      case 'season_start': {
        const pA = d.leader, pB = d.second;
        // Wappen wie überall [§C27]: dort standen zwei Buchstaben-Kreise.
        const avW = pid => pm[pid] ? avHtml(pm[pid], '', {ins:true, px:56, feuer:0}) : '';
        const vs = (pA && pB) ? `<div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(pA.pid)}">
              ${avW(pA.pid)}
              <div class="nd-vs-name">${esc(nameOf(pA.pid))}</div>
              <div class="nd-vs-elo">${pA.elo} Elo</div>
            </div>
            <div class="nd-vs-mid">${d.gap}<div class="nd-vs-mid-sub">Elo Diff</div></div>
            <div class="nd-vs-p" data-pid="${esc(pB.pid)}">
              ${avW(pB.pid)}
              <div class="nd-vs-name">${esc(nameOf(pB.pid))}</div>
              <div class="nd-vs-elo">${pB.elo} Elo</div>
            </div>
          </div>` : '';
        const z = (typeof rcpZahlenHtml === 'function') ? rcpZahlenHtml([
          d.partien ? {v: d.partien, l: d.partien === 1 ? 'Partie' : 'Partien'} : null,
          d.aktive ? {v: d.aktive, l:'Gewertete'} : null
        ].filter(Boolean)) : '';
        return (vs ? `<div class="nd-section">Oben in der Tabelle</div>${vs}` : '')
          + (z ? `<div class="nd-section">Die Stichprobe</div>${z}` : '');
      }
      // Neue Typen (Phase 8) hängen sich hier dran an
      case 'milestone_wins':
      case 'milestone_goals':
      case 'milestone_elo': {
        const stats = _ndBilanzBis(d.pid, s);
        return `<div class="nd-section">Meilenstein</div>
          <div class="nd-stat-row" data-pid="${esc(d.pid)}" style="cursor:pointer">
            <div class="nd-stat-label">${esc(nameOf(d.pid))}</div>
            <div class="nd-stat-val gold">${esc(d.milestone)}</div></div>
          ${stats ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Bilanz bis zu dieser Partie</div>
            <div class="nd-stat-val">${stats.wins} : ${stats.losses}</div></div>` : ''}
          ${d.matchId ? `<div class="nd-section">Die Partie zum Meilenstein</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      case 'elo_swing': {
        // Vorher stand hier der Name — den der Kopf zwei Zeilen darueber schon
        // zeigt — und die Zahl, die auf der Karte stand. Jetzt traegt das Blatt
        // den Ausschlag gross und daneben, woher er kommt.
        const form = _newsRecentForm(d.pid, 10, s);
        let elo = null;
        try { elo = Math.round(((getGlobalSim() || {}).careerElo || {})[d.pid]); } catch(e){}
        return `<div class="nd-gwert ${d.delta >= 0 ? '' : 'rot'}">
            <b>${d.delta >= 0 ? '+' : ''}${d.delta}</b><span>Elo an diesem Tag</span></div>
          ${form.strip ? `<div class="nd-section">Die letzten Partien</div>
            <div class="nd-form-strip">${form.strip}</div>` : ''}
          ${elo ? `<div class="nd-stat-row"><div class="nd-stat-label">Stand jetzt</div>
            <div class="nd-stat-val">${elo} Elo</div></div>` : ''}
          ${form.currentStreak >= 2 ? `<div class="nd-stat-row">
            <div class="nd-stat-label">Siege in Folge an diesem Tag</div>
            <div class="nd-stat-val ${d.delta >= 0 ? 'acid' : 'neg'}">${form.currentStreak}</div></div>` : ''}`;
      }
      // ── v8.2 Neue Typen ──
      case 'streak_killer': {
        // „Gestoppt von X" und „−7er Serie" standen wortgleich schon im Text
        // der Karte. Das Blatt zeigt stattdessen, was der Satz nicht sagt:
        // wann die Serie begann und wie lange sie gehalten hat.
        const lauf = _newsSerienLauf(d.victimPid, d.matchId, d.streak);
        const gitter = `<div class="nd-gitter">
            <div><b class="g">${d.streak}</b><span>Siege nacheinander</span></div>
            ${lauf.tage != null ? `<div><b>${lauf.tage}</b><span>${lauf.tage === 1 ? 'Tag' : 'Tage'} lang gehalten</span></div>` : ''}
          </div>`;
        const zeit = lauf.von ? `<div class="nd-satz">Die Serie begann am <b>${esc(lauf.von)}</b>`
            + (lauf.bis ? ` und endete am <b>${esc(lauf.bis)}</b>.` : '.') + `</div>` : '';
        // Acht ist eine Zahl, die Reihe zeigt, wie lang acht sind — dasselbe
        // Bauteil, mit dem eine laufende Serie im Feed steht [§C27].
        const band = (typeof _newsSerienBand === 'function')
          ? _newsSerienBand(d.streak, false) : '';
        return `<div class="nd-section">Die Serie von ${esc(nameOf(d.victimPid))}</div>`
          + band + gitter + zeit;
      }
      case 'rivalry_milestone': {
        const h2h = _newsH2HRecord(d.a, d.b);
        return `<div class="nd-section">Historische Bilanz</div>
          <div class="nd-vs">
            <div class="nd-vs-p" data-pid="${esc(d.a)}">
              ${avM(d.a)}
              <div class="nd-vs-name">${esc(nameOf(d.a))}</div>
              <div class="nd-vs-elo">${h2h.aWins} Siege</div>
            </div>
            <div class="nd-vs-mid">${d.n}<div class="nd-vs-mid-sub">Duelle</div></div>
            <div class="nd-vs-p" data-pid="${esc(d.b)}">
              ${avM(d.b)}
              <div class="nd-vs-name">${esc(nameOf(d.b))}</div>
              <div class="nd-vs-elo">${h2h.bWins} Siege</div>
            </div>
          </div>
          ${d.matchId ? `<div class="nd-section">Das Jubiläumsduell</div>${_newsMatchVsBlock(d.matchId)}` : ''}`;
      }
      case 'win_streak': {
        // „Aktuelle Serie" stand über einer Marke, die an ihrer Partie hängt
        // und nach dem Riss stehen bleibt [§C33]; darunter dieselbe Zahl als
        // Punktreihe und als Zeile — dreimal eine Serie.
        return `<div class="nd-section">Die Serie</div>
          ${_newsSerienBand(d.streak, false)}`;
      }
      case 'dry_spell': {
        return `<div class="nd-section">Liga-Pause</div>
          <div class="nd-stat-row">
            <div class="nd-stat-label">Tage ohne Match</div>
            <div class="nd-stat-val gold">${d.daysSince}</div></div>
          ${d.lastMatchId ? `<div class="nd-section">Letztes Match</div>${_newsMatchVsBlock(d.lastMatchId)}` : ''}`;
      }
    }
  } catch(e){ /* defensiv */ }
  return '';
}

// ─── §11.7b — Detail-Body Helper (v8.1) ──────────────────────────────
// Wiederverwendbare Sub-Renderer und Stats-Funktionen für die einzelnen
// Detail-Body-Cases. Alle nutzen bestehende Caches; keine eigenen Walks.

// Wann begann die Serie, die hier endet? Steht nirgends sonst: die Karte
// nennt nur ihre Laenge, und das Blatt wiederholte das bisher.
function _newsSerienLauf(pid, matchId, laenge){
  try {
    const idx = matches.findIndex(m => m.id === matchId);
    if(idx < 0 || !laenge) return {};
    const eigene = [];
    for(let i = idx - 1; i >= 0 && eigene.length < laenge; i--){
      const m = matches[i];
      if([m.a1, m.a2, m.b1, m.b2].indexOf(pid) < 0) continue;
      eigene.push(m);
    }
    if(!eigene.length) return {};
    const erste = eigene[eigene.length - 1];
    const fmt = m => datumFmt(m.created_at, 'tm');
    const tage = Math.max(1, Math.round(
      (new Date(matches[idx].created_at) - new Date(erste.created_at)) / 86400000));
    return {von: fmt(erste), bis: fmt(matches[idx]), tage};
  } catch(e){ return {}; }
}

// Match-VS-Block: 2v2 Layout mit Spieler-Avataren, Namen, Score und Datum.
// Klickbar (data-mid) → springt zum Match-Detail über den existierenden
// Click-Handler in openNewsDetail.
function _newsMatchVsBlock(matchId){
  try {
    // Steht diese Partie schon als Ergebnis im Kopf des Blatts, entfaellt sie
    // hier. Sonst stuende dieselbe Begegnung zweimal untereinander.
    if(matchId && matchId === _ndKopfMatch) return '';
    const m = matches.find(x => x.id === matchId);
    if(!m) return '';
    const pm = pmap();
    const av = pid => (pm[pid] && typeof avHtml === 'function')
      ? avHtml(pm[pid], '')
      : '<span class="av" style="background:var(--surface)"></span>';
    const nm = pid => (pm[pid] && pm[pid].name) || '?';
    const aWon = m.winner === 'A';
    const dt = new Date(m.created_at);
    const dStr = datumFmt(dt, 'tmj');
    return `<div class="nd-match" data-mid="${esc(m.id)}">
      <div class="nd-match-side ${aWon?'won':'lost'}">
        <div class="nd-match-avs">${av(m.a1)}${av(m.a2)}</div>
        <div class="nd-match-names">${esc(nm(m.a1))} & ${esc(nm(m.a2))}</div>
      </div>
      <div class="nd-match-score">
        <div class="nd-match-score-val">${m.score_a}:${m.score_b}</div>
        <div class="nd-match-score-date">${dStr}</div>
      </div>
      <div class="nd-match-side ${!aWon?'won':'lost'}">
        <div class="nd-match-avs">${av(m.b1)}${av(m.b2)}</div>
        <div class="nd-match-names">${esc(nm(m.b1))} & ${esc(nm(m.b2))}</div>
      </div>
    </div>`;
  } catch(e){ return ''; }
}

// Elo-Delta für einen Spieler in einem bestimmten Match. Nutzt bestehenden
// getHistoryByMatchId-Cache (Map<matchId, {deltas, eloBefore, eloAfter}>).
function _newsEloDelta(pid, matchId){
  try {
    const hist = getHistoryByMatchId();
    const entry = hist.get(matchId);
    if(!entry || !entry.deltas) return null;
    const d = entry.deltas[pid];
    if(d === undefined || d === null) return null;
    return Math.round(d);
  } catch(e){ return null; }
}

// Pre/Post-Rank für einen Spieler an einem Match. Nutzt getRankSnapshots-Cache.
function _newsRankChange(pid, matchId){
  try {
    const snaps = getRankSnapshots();
    const snap = snaps[matchId];
    if(!snap || !snap.preRank || !snap.postRank) return null;
    const pre = snap.preRank[pid];
    const post = snap.postRank[pid];
    if(!pre || !post) return null;
    return {pre, post};
  } catch(e){ return null; }
}

// Form-Strip + Win-Streak der letzten N Matches. Walks die filter()-Variante
// nur über matches (gesamt) — wird im Detail aufgerufen, also einmalig.
// `bis` ist die Story, deren Blatt die Reihe zeigt: gezählt wird bis zu IHRER
// Partie, nicht bis heute. Das Blatt der 10er-Pleitenserie von 14:20 zeigte
// unter „10 Pleiten nacheinander" die letzten zehn Partien von JETZT — mit dem
// Sieg von 14:32 am Ende, der die Serie beendet hat und von dem die Karte gar
// nicht erzählt.
function _newsRecentForm(pid, n, bis){
  const arr = [];
  const d = (bis && bis.dataRef) || {};
  let start = matches.length - 1;
  if(d.matchId){
    const k = matches.findIndex(m => m.id === d.matchId);
    if(k >= 0) start = k;
  } else if(bis && bis.when){
    const t = new Date(bis.when).getTime();
    while(start >= 0 && new Date(matches[start].created_at).getTime() > t) start--;
  }
  for(let i = start; i >= 0 && arr.length < n; i--){
    if(matchOf(pid, matches[i])) arr.unshift(matches[i]);
  }
  if(!arr.length) return {strip:'', currentStreak:0};
  const strip = arr.map(m => {
    const w = won(pid, m);
    return `<div class="nd-form-dot ${w?'w':'l'}" title="${w?'Sieg':'Niederlage'}"></div>`;
  }).join('');
  // Aktuelle Sieges-Streak (von hinten zählen)
  let curStreak = 0;
  for(let i = arr.length - 1; i >= 0; i--){
    if(won(pid, arr[i])) curStreak++;
    else break;
  }
  return {strip, currentStreak: curStreak};
}

// H2H-Bilanz Spieler A vs Spieler B (egal welche Teamkonstellation).
// Iteriert einmal über matches; bei großen Datensätzen kann das auf
// getPairsCache umgestellt werden — derzeit aber günstig genug.
// H2H-Lazy-Cache (v8.4): Statt für jedes Detail ALLE matches zu walken
// (O(N) pro Lookup → bei 100k Matches teuer), wird beim ersten H2H-Lookup
// EINE Map über alle Spieler-Paarungen gebaut und gecached. Danach ist jeder
// _newsH2HRecord-Lookup O(1). Build-Kosten: einmalig O(N × 4) (4 Kreuz-Paare
// pro Match), amortisiert über alle Detail-Aufrufe.
// Key bindet an matches.length + _cache.version → invalidateCache(['news'])
// (§3) löscht _h2hMap/_h2hKey, der Version-Tick bricht den Key zusätzlich.
function _ensureH2HMap(){
  const key = 'h2h_' + matches.length + '_' + _cache.version;
  if(_cache._h2hKey === key && _cache._h2hMap) return _cache._h2hMap;
  const map = new Map();
  for(let i = 0; i < matches.length; i++){
    const m = matches[i];
    const sideA = [m.a1, m.a2], sideB = [m.b1, m.b2];
    const ts = mts(m);
    const aWon = m.winner === 'A';
    // Alle 4 Kreuz-Paare (je 1 Spieler aus A gegen 1 aus B) sind H2H-Gegner.
    for(let x = 0; x < 2; x++){
      for(let y = 0; y < 2; y++){
        const pa = sideA[x], pb = sideB[y];
        if(!pa || !pb) continue;
        const k = pa < pb ? pa + '|' + pb : pb + '|' + pa;
        let e = map.get(k);
        if(!e){ e = {wins:{}, lastMatchId:null, lastTs:0}; map.set(k, e); }
        const winnerPid = aWon ? pa : pb;
        e.wins[winnerPid] = (e.wins[winnerPid] || 0) + 1;
        if(ts > e.lastTs){ e.lastTs = ts; e.lastMatchId = m.id; }
      }
    }
  }
  _cache._h2hKey = key;
  _cache._h2hMap = map;
  return map;
}
function _newsH2HRecord(aPid, bPid){
  const map = _ensureH2HMap();
  const k = aPid < bPid ? aPid + '|' + bPid : bPid + '|' + aPid;
  const e = map.get(k);
  if(!e) return {aWins:0, bWins:0, lastMatchId:null};
  // aWins/bWins richten sich nach der Aufruf-Reihenfolge (nicht nach dem
  // kanonischen Map-Key) → korrekt unabhängig von der Argument-Sortierung.
  return {aWins: e.wins[aPid] || 0, bWins: e.wins[bPid] || 0, lastMatchId: e.lastMatchId};
}

// Die Partien bis zu der, von der eine Story erzählt. Ein Blatt, das neben
// „100 Spiele" die Bilanz von HEUTE nennt („221 / 134"), widerspricht sich
// selbst; dasselbe bei der gemeinsamen Bilanz unter einer Duo-Serie.
function _ndBisPartie(s){
  const d = (s && s.dataRef) || {};
  if(d.matchId){
    const k = matches.findIndex(m => m.id === d.matchId);
    if(k >= 0) return matches.slice(0, k + 1);
  }
  if(s && s.when){
    const t = new Date(s.when).getTime();
    return matches.filter(m => new Date(m.created_at).getTime() <= t);
  }
  return matches;
}
function _ndBilanzBis(pid, s){
  let wins = 0, losses = 0;
  _ndBisPartie(s).forEach(m => { if(!matchOf(pid, m)) return; if(won(pid, m)) wins++; else losses++; });
  const total = wins + losses;
  return total ? {wins, losses, winRate: Math.round(wins / total * 100)} : null;
}

// ─── Hookup: News-Button-Click + Backdrop-Close ──────────────────────
(function attachNewsHandlers(){
  const ready = () => {
    const btn = document.getElementById('newsBtn');
    if(btn && !btn._newsBound){
      btn._newsBound = true;
      // Der Knopf öffnet direkt den vollen Feed. Das Vorschau-Popup davor
      // gibt es nicht mehr [§11.5].
      btn.onclick = openNewsFeed;
    }
    // ndBg (Story-Detail): KEIN Backdrop-Close (User-Wunsch v8.1): Stories
    // sollen bewusst konsumiert werden → nur X-Button oder der
    // „Schließen"-Knopf unten beenden den Detail-View.
    const ndBg = document.getElementById('ndBg');
    if(ndBg && !ndBg._newsBound){
      ndBg._newsBound = true;
      // Backdrop-Click schließt das Detail NICHT mehr — bewusstes Schließen
      // erfolgt nur via X-Button oder Schließen-Button.
    }
  };
  if(document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();

