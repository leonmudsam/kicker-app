// ─── §11.6d — Die Bausteine einer Karte im Feed ─────────────────────────
// Rubrik, Zeichen, Motiv, Bänder und Köpfe, aus denen _newsCardHtmlM2
// (30-news-ui.js) eine Karte zusammensetzt [§C33].
// Die Rubrik ueber der Karte, wie in einer Zeitung. Sie sagt, aus welchem
// Teil der Liga die Nachricht kommt, und ist an der Sorte ablesbar — die
// elf Kategorien der Datenbank waren eine Sortierhilfe fuer den, der sie
// gebaut hat, und standen als „Badge & Awards" ueber einer Auszeichnung.
function _newsRubrik(sorte, s){
  const d = (s && s.dataRef) || {};
  if(_isBreaking(s)) return 'BREAKING';
  if(d.type === 'runde') return 'DIE RUNDE';
  switch(sorte){
    case 'spiel':  return 'AM SPIELTAG';
    case 'tafel':  return 'EWIGE TAFEL';
    case 'ins':    return 'DAS ZEICHEN';
    case 'held':   return d.type === 'potw' ? 'SPIELER DER WOCHE' : 'SPIELER DES TAGES';
    case 'woche':  return 'DIE WOCHE';
    case 'duell':  return 'DAS DUELL';
    case 'serie':  return d.type === 'team_loss_streak' || d.type === 'loss_streak'
                        ? 'DIE DURSTSTRECKE' : 'DIE SERIE';
    case 'badge':  return 'AUSZEICHNUNG';
    case 'marke':  return 'BESTMARKE';
    // Was diese beiden Karten sind, sagt die Rubrik: einmal ein Spieler, der
    // in einem Moment mehreres holt, einmal ein Erfolg, den mehrere zugleich
    // erreichen.
    case 'spieler':return 'ALLES AUF EINMAL';
    case 'erfolg': return 'GEMEINSAM GEHOLT';
    default:       return d.type === 'ambient'
      ? (NEWS_AMBIENT_STIL[d.ambientRubrik] || NEWS_AMBIENT_STIL.liga).label
      : 'LIGA IN ZAHLEN';
  }
}

// Ein Zeichen je Sorte. Es steht immer an derselben Stelle und ist damit die
// zweite Ablesehilfe neben der Bauform.
function _newsSorteIcon(sorte, s){
  if(_isBreaking(s)) return 'sirene';
  switch(sorte){
    // Der Spieltag trug gekreuzte Klingen, das Duell trägt Klingen — als
    // Motiv nebeneinander war das dieselbe Zeichnung in zwei Größen.
    case 'spiel':  return 'spielfeld';
    case 'tafel':  return 'tafelStein';
    case 'ins':    return 'shieldStar';
    case 'held':   return 'crown';
    case 'woche':  return 'calendar';
    case 'duell':  return 'crossedSwords';
    case 'serie':  return (s && (s.dataRef||{}).type || '').indexOf('loss') >= 0
                        ? 'dropTriple' : 'flame';
    case 'badge':  return 'abzeichen';
    case 'marke':  return 'marke';
    // Drei Pokale fuer den, der mehreres auf einmal holt; zwei Gestalten fuer
    // den Erfolg, den mehrere teilen. Keine der beiden Zeichnungen steht
    // schon an einer anderen Rubrik [§C27].
    case 'spieler':return 'medalTrio';
    case 'erfolg': return 'users';
    default:       return 'chartBar';
  }
}

// ── Fette Akzente ───────────────────────────────────────────────────
// Der Kartentext trug alles in derselben Stärke, und das Auge fand darin
// weder das Ergebnis noch den Namen. Betont wird genau dreierlei: das
// Ergebnis einer Partie, jede Zahl mit ihrer Einheit und die Namen der
// Liga. Mehr wäre wieder gleich laut.
//
// Es ist eine Ableitung aus dem Text, keine Änderung an ihm — genau wie
// `_isBreaking` und `_displayCat` [§C33]. Persistierte Karten gewinnen sie
// deshalb ohne Umschreiben mit.
function _newsBetont(txt){
  let t = esc(String(txt == null ? '' : txt));
  // Ergebnisse und Daten zuerst: „10:5" darf nicht als zwei einzelne Zahlen
  // zerfallen, und „24.08." verlor sonst seinen Schlusspunkt aus dem Fettdruck.
  t = t.replace(/\b(\d{1,2}\s?:\s?\d{1,2})\b/g, '<b>$1</b>');
  t = t.replace(/\b(\d{1,2}\.\d{1,2}\.?)(?!\d)/g, '<b>$1</b>');
  // Dann Zahlen mit Einheit und alleinstehende Zahlen, aber nicht die schon
  // ausgezeichneten und nicht die in einem Datum.
  t = t.replace(/(^|[^\d>.,])(\d+(?:[.,]\d+)?\s?%?)(?![\d<]|\.\d)/g,
    (m, vor, z) => vor + '<b>' + z + '</b>');
  try {
    const namen = Object.keys(pmap()).map(id => pmap()[id].name)
      .filter(Boolean).sort((a, b) => b.length - a.length);
    namen.forEach(n => {
      const e = esc(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('(^|[^\\w>])(' + e + ')(?![\\w<])', 'g'), '$1<b>$2</b>');
    });
  } catch(e){}
  return t;
}

// ── Das Motiv ────────────────────────────────────────────────────────
// Dasselbe Zeichen wie im Rubrikband, nur groß und sehr leise am rechten
// Rand. Es färbt die Karte, ohne ein zweites Zeichen für dieselbe Aussage
// einzuführen [§C27]. Vorher waren zehn Karten untereinander zehn gleich
// große dunkle Rechtecke, und die Sorte stand allein in neun Punkt Schrift
// darüber.
function _newsMotiv(sorte, s){
  return `<span class="nf-motiv" aria-hidden="true">${svgI(_newsSorteIcon(sorte, s))}</span>`;
}

// ── Der Bilanzbalken ─────────────────────────────────────────────────
// Das Kräfteverhältnis zweier Spieler als geteilter Streifen. „Leon führt
// mit 116:72" ist eine Zahl, die man erst lesen und dann verrechnen muss;
// der Balken zeigt sie vorher.
function _newsBilanzBalken(aPid, bPid, aW, bW){
  const g = (aW || 0) + (bW || 0);
  if(!g) return '';
  const pm = pmap();
  const nm = id => (pm[id] && pm[id].name) || '?';
  const pa = Math.round(aW / g * 100);
  return `<div class="nf-bil">
    <div class="nf-bil-b"><i style="width:${pa}%"></i></div>
    <div class="nf-bil-z"><span><b>${aW}</b> ${esc(nm(aPid))}</span>
      <span>${esc(nm(bPid))} <b>${bW}</b></span></div>
  </div>`;
}

// ── Der Serienlauf ───────────────────────────────────────────────────
// Die Partien einer Serie als Punkte. „7 Siege" ist eine Zahl, die Reihe
// zeigt, wie lang sieben sind. Ab zwölf Punkten steht der Rest als Ziffer:
// eine Reihe, die über die Karte hinausläuft, sagt nichts mehr.
function _newsSerienBand(laenge, verloren, mitZiel){
  const n = Math.max(0, Number(laenge) || 0);
  if(!n) return '';
  const zeige = Math.min(n, 12);
  // Die Karte einer Siegesserie zeigt die nächste Marke als leere Felder:
  // man sieht, wie weit es noch ist. Eine Pleitenserie hat kein Ziel —
  // eine Marke, auf die man zuläuft, wäre dort ein Wunsch [§C25].
  const ziel = mitZiel && !verloren ? naechsteSerienMarke(n) : 0;
  const leer = ziel && ziel <= 12 ? ziel - zeige : 0;
  // Rechts steht, was die Punkte zaehlen. Ohne die Angabe war die halbe
  // Bandbreite leer, und die Reihe sagte nicht, ob sie Siege oder Pleiten
  // meint.
  return `<div class="nf-ser${verloren ? ' r' : ''}">`
    + Array.from({length: zeige}, () => '<i></i>').join('')
    + Array.from({length: leer}, () => '<i class="x"></i>').join('')
    + (n > zeige ? `<em>+${n - zeige}</em>` : '')
    + `<span>${n} ${verloren ? 'Pleiten' : 'Siege'} nacheinander${ziel ? ` · Marke ${ziel}` : ''}</span></div>`;
}

// ── Das Sammelband ──────────────────────────────────────────────────
// Eine Sammelkarte trug die Schlagzeile ihres staerksten Ereignisses und
// sonst nichts: „Maxi: Nerven aus Stahl" stand erst im Blatt, und wer die
// Karte nur ueberflog, hat es nie gesehen. Buendeln darf nichts verstecken
// [§C33] — jede weitere Zeile steht deshalb mit ihrem Zeichen auf der Karte
// selbst, kurz und in einer Reihe.
//
// Der Gruppentitel wird vorsichtshalber herausgefiltert; aktuelle Karten
// bauen ihn eigens, sodass regulaer jede Einzelzeile im Band bleibt.
function _newsSammelBand(teile, kopfTitel, vollstaendig){
  const alle = Array.isArray(teile) ? teile : [];
  // Alte persistierte Karten koennen noch einen Gruppentitel als Zeile
  // enthalten; nur diese echte Doppelung faellt heraus.
  const kt = (Array.isArray(kopfTitel) ? kopfTitel : [kopfTitel])
    .map(x => String(x || '').trim()).filter(Boolean);
  const rest = alle.filter(t => kt.indexOf(String(t.titel || '').trim()) < 0);
  if(!rest.length) return '';
  // Drei Zeilen und dahinter die Zahl. Eine Sammelkarte zeigt mehr, aber
  // nicht alles: gemessen trug ein Tafel-Moment neunzehn Zeilen, und die
  // Karte bedeckte damit den ganzen Bildschirm — die vollstaendige Liste
  // versteckte alles andere. Gezeigt werden die staerksten
  // `NEWS_LIMITS.sammelZeilen`; `rest` steht nach `prio` sortiert, also
  // Bestmarke vor Monatschronik vor Insignium. Das Blatt zeigt jede Zeile.
  const grenze = vollstaendig
    ? Math.min(rest.length, NEWS_LIMITS.sammelZeilen || rest.length) : 3;
  // ── Ein Ausbau steht nicht auf der Karte ──────────────────────────
  // „Wichtig ist, was wirklich in der Chronik steht und welcher Rekord
  // wirklich uebernommen wurde" — ein Ausbau ist keins von beidem: derselbe
  // Halter, ein besserer Wert, kein Wechsel. Gemessen trug ein Tafel-Moment
  // achtzehn Zeilen, elf davon Ausbauten, und bei vier Plaetzen standen zwei
  // Wechsel und zwei Ausbauten auf der Karte. Sie zaehlen jetzt in die Zahl
  // dahinter; das Blatt zeigt jede Zeile [§C33].
  //
  // Gibt es NUR Ausbauten, bleibt die staerkste stehen: eine Karte mit einem
  // leeren Band ist schlimmer als eine, die einen Ausbau nennt.
  const wechsel = rest.filter(t => String((t && (t.typ || t.type)) || '') !== 'rekord_gesteigert');
  const zeige = (wechsel.length ? wechsel : rest).slice(0, grenze);
  const uebrig = rest.length - zeige.length;
  // In einer gemischten Tafel-Karte bekommt jede Spur den Ton ihrer Kammer.
  // Der Kartenkopf bleibt eine gemeinsame Geschichte, die Zeilen verraten
  // aber sofort, ob darunter Rekord, Bestmarke, Chronik, Fügung, Schatten
  // oder ein neues Insignium zusammengekommen sind.
  const tafelTon = t => {
    const typ = String((t && (t.typ || t.type)) || '');
    if(typ === 'insignium_stufe') return 'insignium';
    if(typ.indexOf('chronik_') === 0) return 'chronik';
    if(typ.indexOf('rekord_') !== 0) return '';
    if(t.kammer === 'mark') return 'marke';
    if(t.kammer === 'fuegung') return 'fuegung';
    if(t.kammer === 'shame') return 'schatten';
    return 'rekord';
  };
  // Die Marke sagt in zwei Worten, welche Zeile in der Monatstafel landet
  // [§C32] — Metall, sie zeichnet niemanden aus [§C25].
  return `<div class="nf-sam">${zeige.map(t => {
    const ton = tafelTon(t);
    // ── Der Anlass des Breaking traegt eine Marke ─────────────────
    // Die Karte bricht die Spalte, weil EINE ihrer Zeilen Breaking ist. Sie
    // stand zuletzt und ohne jedes Zeichen: die lauteste Karte des Feeds
    // behauptete eine Dringlichkeit, die sie selbst nicht belegte. Sie
    // steht jetzt zuerst [§C33] und sagt es auch — Rot, weil das die
    // Richtung von Breaking ist [§C25].
    return `<div class="nf-sam-z${ton ? ' nf-sam-'+ton : ''}${t.neg ? ' neg' : ''}${t.brk ? ' brk' : ''}" data-story-id="${esc(t.id || '')}"><i class="nf-sam-i">${svgI(t.ic || 'chartBar')}</i>`
    + `<span>${_newsBetont(t.titel || '')}</span>`
    + (t.brk ? `<b class="nf-sam-brk">Der Anlass</b>` : '')
    + (t.marke ? `<b class="nf-sam-k">${esc(t.marke)}</b>` : '')
    // Die Klasse einer seltenen Auszeichnung: Violett, die Familie der
    // Auszeichnungen [§C25] — Gold waere ein Titel, Rot eine Richtung.
    + (t.klasse ? `<b class="nf-sam-kl">${esc(t.klasse)}</b>` : '')
    // Auf der Ergebnis-Karte ist der Stand die Aussage. „Ben und Jonas
    // gewinnen ohne Gegentor" ohne die 10:0 daneben ist die halbe Nachricht,
    // und in den Satz gehört sie nicht: die Zeile kürzt sich [§C32].
    + (t.wert ? `<b class="nf-sam-w">${esc(t.wert)}</b>` : '')
    + `</div>`;
  }).join('')}`
    + (uebrig > 0 ? `<div class="nf-sam-m">und ${uebrig} weitere</div>` : '')
    + `</div>`;
}

// ── Wer verliert, steht auf der Karte ─────────────────────────────────
// Ein Rekord, den jemand übernimmt oder mit einem anderen teilt, kostet den
// bisherigen Halter Prestige, und davon stand auf der Karte nichts: die
// Schlagzeile feiert die Neuen, und wer seinen Anteil abgeben musste, erfuhr
// es erst im Blatt — oder gar nicht, solange es dort „±0" hieß. Die Zeile
// nennt je Verlierer den Verlust und, wenn er eine Schwelle unterschreitet,
// die Stufe, auf die er fällt. Rot ist die Richtung [§C25]; die Karte bleibt
// die der Gewinner, deshalb steht der Verlust unter dem Band und nicht im
// Kopf. Gelesen wird die gespeicherte Wirkung der Karte, wie im Blatt.
//
// Je Verlierer ein Chip: Gesicht, Name, Betrag — und nur, wenn die Stufe
// fällt, ein Pfeil mit ihr. Vorher stand „VERLIERT" als Wort vor einer
// Reihe aus „Leon −77 auf Volutenkranz", und bei drei Namen brach das in
// eine zweite Zeile, in der Betrag und Stufe nicht mehr zu ihrem Namen
// gehörten. Der Chip hält zusammen, was zusammengehört, und das Wort davor
// sagt, wovon der Betrag abgeht: Prestige.
function _newsVerlustBand(s){
  const d = (s && s.dataRef) || {};
  const je = {};
  const nimm = lb => { if(lb) Object.keys(lb).forEach(pid => { if(!je[pid]) je[pid] = lb[pid]; }); };
  if(d.type === 'sammel') (d.teile || []).forEach(t => nimm(t.lb));
  else nimm(d.laufbahn);
  const pm = pmap();
  const weg = Object.keys(je).filter(pid => pm[pid]).map(pid => {
    const vor = Math.round(Number(je[pid].vor) || 0), nach = Math.round(Number(je[pid].nach) || 0);
    return {pid, d: nach - vor, ab: insigniumStufeVon(nach) < insigniumStufeVon(vor)
      ? INSIGNIEN[insigniumStufeVon(nach)].name : ''};
  }).filter(x => x.d < 0).sort((a, b) => a.d - b.d);
  if(!weg.length) return '';
  return `<div class="nf-verlust"><span class="nf-verlust-l">${svgI('trendDown')}Prestige</span>`
    + `<span class="nf-verlust-w">${weg.slice(0, 3).map(x =>
      `<b class="nf-vl">${rcpAvHtml(x.pid, 18, {})}<i>${esc(pm[x.pid].name)}</i>`
      + `<em class="num">−${-x.d} P</em>${x.ab ? `<u>↓ ${esc(x.ab)}</u>` : ''}</b>`).join('')}${weg.length > 3
      ? `<b class="nf-vl mehr">+${weg.length - 3}</b>` : ''}</span></div>`;
}

// Die Zahlen einer Spieltags-Karte. Sie stehen im Fuß, damit der Satz sie
// nicht wiederholen muss — und nur, wo die Zeichnung sie nicht schon zeigt:
// die gerissene Kette zählt die Serie, die Tabelle die Plätze.
function _newsSpielZahlen(s, anlass){
  const d = s.dataRef || {};
  const out = [];
  if(d.streak && anlass !== 'riss') out.push({v: d.streak, l:'Siege, jetzt beendet', f:'g'});
  if(d.gap && anlass !== 'spitze' && anlass !== 'rang')
    out.push({v: 'Platz ' + (d.winnerRank || d.gap), l:'schlägt Platz ' + (d.loserRank || '')});
  // Die Tordifferenz steht nicht darin: der Kopf zeigt beide Zahlen, und
  // „4 Tore Unterschied" unter einem 6:10 rechnet dem Leser vor, was er
  // gerade gelesen hat.
  return out;
}

// Die Fakten einer Partie-Karte kommen aus den ungebündelten Meldungen
// (`_newsRohIndex`), weil eine Sammelzeile nur Titel und Zeichen trägt.
// Kopf und Fuß, die daraus entstehen, stehen in `30b-news-spieltag.js`.
function _newsRohIndex(){
  const roh = Array.isArray(_cache._stories) ? _cache._stories : [];
  let m = _newsRohMemo.get(roh);
  if(!m){ m = new Map(roh.map(x => [x.id, x])); _newsRohMemo.set(roh, m); }
  return m;
}
const _newsRohMemo = new WeakMap();
function _newsSpielFakten(s){
  const d = s.dataRef || {};
  if(d.type !== 'sammel' || !Array.isArray(d.teile)) return [d];
  const idx = _newsRohIndex();
  return d.teile.flatMap(t => {
    const ref = (t && t.ref) || ((idx.get(t && t.id) || {}).dataRef)
      || {type:t && (t.typ || t.type)};
    // Eine Gruppenzeile traegt mehrere urspruengliche Ereignisse. Die
    // Grafik darf deren Serienwerte nicht verlieren, weil im Rohindex nur
    // die einzelnen IDs und keine kuenstliche Gruppen-ID stehen.
    return ref.type === 'group' && Array.isArray(ref.members)
      ? ref.members.map(m => Object.assign({}, ref, m, {type:m.type || ref.sub})) : [ref];
  });
}
// Die Wende: wie viele Partien in Folge ein Sieger vor dieser verloren hat.
// Gezählt wird rückwärts ab der Partie, nicht ab heute [§C33].
function _newsPleitenVor(pid, m){
  const eig = matchesOfPlayer(pid, matches);
  let i = eig.indexOf(m), n = 0;
  if(i < 0) return 0;
  for(i--; i >= 0; i--){
    const x = eig[i];
    const aSeite = x.a1 === pid || x.a2 === pid;
    if((aSeite && x.winner === 'A') || (!aSeite && x.winner === 'B')) break;
    n++;
  }
  return n;
}
// ── Was die Zeichnung zeigt, sagt der Satz nicht [§C33] ──────────────
// „Vor dem Anstoß lag die Siegchance bei 81 %. Für Maxi bringt der Sieg +7
// Elo." stand über einem Spielfeld, das 81 % und Maxis +7 schon zeigt —
// dieselben zwei Zahlen zweimal in einer Karte. Wie `_ndLead` im Blatt eine
// Ableitung aus dem Text, also gilt sie auch für gespeicherte Karten; der
// Text selbst bleibt, das Blatt und die Datenbank tragen ihn weiter.
// Gestrichen werden nur Sätze, die NICHTS als diese Zahlen sagen: „Nur 30 %
// Siegchance vor dem Anstoß. Trotzdem …" ist die Geschichte eines
// Außenseitersiegs und bleibt stehen. Was die Zeichnung zeigt, sagt sie
// selbst (`zeigt`), statt dass hier in ihrem Markup gesucht wird.
function _newsSpielSatz(desc, zeigt){
  const t = String(desc || '');
  const chance = !!(zeigt && zeigt.chance), elo = !!(zeigt && zeigt.elo);
  if(!chance && !elo) return t;
  return t.split(/(?<=\.)\s+/).map(x => {
    const z = x.match(/^Die Siegchance lag vor dem Anstoß bei (\d+) %(?:, für (.+) bringt der Sieg (\+\d+) Elo)?\.$/);
    if(z){
      if(chance && (elo || !z[2])) return '';
      if(chance) return `Für ${z[2]} bringt der Sieg ${z[3]} Elo.`;
      if(elo && z[2]) return `Die Siegchance lag vor dem Anstoß bei ${z[1]} %.`;
      return x;
    }
    if(chance && /^Vor dem Anstoß lag die Siegchance bei \d+ %\.$/.test(x)) return '';
    if(elo && /^Für .+ bringt der Sieg \+\d+ Elo\.$/.test(x)) return '';
    return x;
  }).filter(Boolean).join(' ');
}

// ── Der Faden [§C33] ────────────────────────────────────────────────
// Eine Karte, die eine frühere fortsetzt, sagt es. Im Feed standen „Anton
// und Johannes verlieren zusammen alles" am 24.08. und „Johannes und Anton
// stürzen die Favoriten" am 26.08. als zwei Fremde — dass die zweite die
// erste beendet, musste der Leser selbst finden. Der Faden ist eine
// ABLEITUNG wie `_isBreaking`: nichts davon wird gespeichert, und er zeigt
// nur auf eine Karte, die im Feed steht und älter ist.
//
// Gefragt wird nach dem Fakt, nicht nach der Karte: eine Sammelkarte trägt
// ihre Zeilen, und die Serie, die sie beendet, kann in einer anderen
// Sammelkarte stecken. Deshalb läuft die Suche über die ungebündelten
// Meldungen (`_newsTexteAuffrischen`, dieselbe Referenz wie in
// `getStoriesCache`) und bildet sie auf die Karte ab, in der sie stehen.
//
// Jede Beziehung wird an den Partien nachgeprüft, nicht am Wortlaut: eine
// Pleitenserie ist erst mit dem ERSTEN Sieg danach gewendet, eine Revanche
// nur die nächste Begegnung derselben zwei Duos, und eine Serie endet nur,
// wenn dazwischen keine Niederlage lag. Ohne diese Prüfung zeigte jede
// spätere Partie derselben Leute auf dieselbe alte Karte.
//
// Die „Rückkehr" aus dem Entwurf gibt es nicht: die Karte der Pause fällt
// mit der nächsten Partie weg (`_consolidateStories` prüft `lastMatchId`),
// also steht nie eine im Feed, auf die eine Rückkehr zeigen könnte.
const NEWS_FADEN_ART = {
  ende:     {kap:'ENDE',          vor:'Beendet'},
  wende:    {kap:'WENDE',         vor:'Beendet'},
  revanche: {kap:'REVANCHE',      vor:'Antwort auf'},
  zurueck:  {kap:'RÜCKEROBERUNG', vor:'Folgt auf'},
  weiter:   {kap:'FORTSETZUNG',   vor:'Setzt fort'},
  spitze:   {kap:'WECHSEL',       vor:'Folgt auf'},
};
const _newsFadenMemo = new WeakMap();
function _newsFaeden(cards){
  const roh = Array.isArray(_cache._stories) ? _cache._stories : [];
  const alt = _newsFadenMemo.get(roh);
  if(alt && alt.m === matches && alt.n === cards.length) return alt.map;
  const map = new Map();
  _newsFadenMemo.set(roh, {m: matches, n: cards.length, map});
  const rohId = new Map(roh.map(x => [x.id, x]));
  // Jede Meldung → die Karte, in der sie steht.
  const karteVon = new Map();
  const glieder = new Map();
  cards.forEach(c => {
    const d = c.dataRef || {};
    const ids = d.type === 'sammel' && Array.isArray(d.teile)
      ? d.teile.map(t => t && t.id).filter(Boolean) : [c.id];
    const g = ids.map(id => rohId.get(id) || (id === c.id ? c : null)).filter(Boolean);
    g.forEach(x => karteVon.set(x.id, c));
    glieder.set(c.id, g);
  });
  const idx = new Map();
  const reihe = [...(matches || [])].sort((a, b) => mts(a) - mts(b));
  reihe.forEach((m, i) => idx.set(m.id, i));
  const sieger = m => m.winner === 'A' ? [m.a1, m.a2] : [m.b1, m.b2];
  const verlierer = m => m.winner === 'A' ? [m.b1, m.b2] : [m.a1, m.a2];
  const gleich = (x, y) => x.length === y.length && x.every(v => y.includes(v));
  // Lag zwischen zwei Partien (beide ausgeschlossen) eine, auf die `f` passt?
  const dazwischen = (vonId, bisId, f) => {
    const a = idx.get(vonId), b = idx.get(bisId);
    if(a == null || b == null || a >= b) return true;
    for(let i = a + 1; i < b; i++) if(f(reihe[i])) return true;
    return false;
  };
  // Alle Meldungen, zeitlich von neu nach alt — die jüngste passende ältere
  // Karte gewinnt.
  const alle = [];
  cards.forEach(c => (glieder.get(c.id) || []).forEach(x => alle.push({x, c})));
  alle.sort((p, q) => new Date(q.c.when) - new Date(p.c.when));
  const suche = (c, f) => {
    const t = new Date(c.when).getTime();
    for(const {x, c: k} of alle){
      if(k === c || new Date(k.when).getTime() >= t) continue;
      if(f(x.dataRef || {}, x)) return k;
    }
    return null;
  };
  const RANG = ['ende', 'wende', 'revanche', 'zurueck', 'spitze', 'weiter'];
  cards.forEach(c => {
    let best = null;
    const nimm = (art, ziel) => {
      if(!ziel) return;
      if(!best || RANG.indexOf(art) < RANG.indexOf(best.art)) best = {art, ziel: ziel.id};
    };
    (glieder.get(c.id) || []).forEach(x => {
      const d = x.dataRef || {};
      const t = d.type || '';
      if(t === 'streak_killer' && d.victimPid && d.matchId){
        const v = d.victimPid;
        nimm('ende', suche(c, e => e.type === 'win_streak' && e.pid === v && e.matchId
          && !dazwischen(e.matchId, d.matchId, m => verlierer(m).includes(v))));
      }
      if(t === 'spiel' && d.matchId){
        const m = reihe[idx.get(d.matchId)];
        if(!m) return;
        const w = sieger(m), l = verlierer(m);
        // Die Wende: der erste gemeinsame Sieg nach der Pleitenserie des Duos,
        // oder der erste eigene nach einer Pleitenserie.
        nimm('wende', suche(c, e => e.type === 'team_loss_streak' && e.matchId
          && gleich([e.a, e.b], w)
          && !dazwischen(e.matchId, d.matchId, n => gleich(sieger(n), w))));
        nimm('wende', suche(c, e => e.type === 'loss_streak' && e.matchId && w.includes(e.pid)
          && !dazwischen(e.matchId, d.matchId, n => sieger(n).includes(e.pid))));
        // Die Revanche: die vorige Begegnung genau dieser zwei Duos ging an
        // die andere Seite.
        let vor = null;
        for(let i = idx.get(m.id) - 1; i >= 0; i--){
          const n = reihe[i];
          const seiten = [[n.a1, n.a2], [n.b1, n.b2]];
          if(seiten.some(sd => gleich(sd, w)) && seiten.some(sd => gleich(sd, l))){ vor = n; break; }
        }
        // Nur über Tage: das Rückspiel direkt danach ist am Kicker der Normalfall
        // und keine Geschichte — gemessen waren es sieben von zehn Fäden, und
        // jede zweite Partie eines Spieltags zeigte auf die davor.
        if(vor && gleich(sieger(vor), l) && tagKey(mts(vor)) !== tagKey(mts(m))){
          const k = karteVon.get('spiel_' + vor.id);
          if(k && k !== c && new Date(k.when) < new Date(c.when)) nimm('revanche', k);
        }
      }
      // Dieselbe Serie über mehrere Tage: derselbe Lauf, eine frühere Marke.
      if(/^(win_streak|loss_streak|team_streak|team_loss_streak)$/.test(t) && d.lauf){
        nimm('weiter', suche(c, e => e.type === t && e.lauf === d.lauf
          && (e.pid || '') === (d.pid || '') && (e.a || '') === (d.a || '') && (e.b || '') === (d.b || '')));
      }
      // Derselbe Rekord, dieselbe Monatschronik: wer ihn vor der früheren
      // Karte hielt und ihn jetzt wieder hat, holt ihn zurück.
      if((/^rekord_/.test(t) && d.rekordId) || (t === 'chronik_geholt' && d.titleId)){
        const zielK = suche(c, e => t === 'chronik_geholt'
          ? e.type === 'chronik_geholt' && e.titleId === d.titleId && e.sid === d.sid
          : /^rekord_/.test(e.type || '') && e.rekordId === d.rekordId);
        if(zielK){
          const ze = (glieder.get(zielK.id) || []).map(y => y.dataRef || {})
            .find(e => t === 'chronik_geholt' ? e.titleId === d.titleId : e.rekordId === d.rekordId) || {};
          const jetzt = d.halter || d.playerIds || [];
          const damalsWeg = ze.vorher || [];
          const damalsNeu = ze.halter || ze.playerIds || [];
          const zurueck = jetzt.some(p => damalsWeg.includes(p)) && !jetzt.some(p => damalsNeu.includes(p));
          nimm(zurueck ? 'zurueck' : 'weiter', zielK);
        }
      }
      if(t === 'lead_change' && d.sid){
        nimm('spitze', suche(c, e => e.type === 'lead_change' && e.sid === d.sid));
      }
    });
    if(best) map.set(c.id, best);
  });
  return map;
}
// `nach` ist die Gegenrichtung für das Blatt: dort steht auch, welche
// spätere Karte diese fortsetzt — sonst endet die Geschichte an der Stelle,
// an der man sie gerade liest.
function _newsFadenHtml(faden, stories, nach){
  if(!faden) return '';
  const ziel = (stories || []).find(x => x.id === (nach ? faden.von : faden.ziel));
  const art = NEWS_FADEN_ART[faden.art];
  if(!ziel || !art) return '';
  const tag = datumFmt(ziel.when, 'tm');
  return `<button class="nf-faden" type="button" data-ziel="${esc(ziel.id)}">`
    // Tag vor Titel: der Titel kürzt sich, und in einer Zeile ging dabei das
    // Datum verloren — gerade das sagt, wie weit die Geschichte zurückreicht.
    + `${svgI('faden')}<span><i>${nach ? 'Geht weiter' : esc(art.vor)} · ${esc(tag)}</i> <b>${esc(ziel.title)}</b></span>`
    + `<em>${esc(art.kap)}</em></button>`;
}

// Eine einzige Quelle für den Chronik-Beitrag in Karte und Detailblatt.
// Neue Karten speichern den tatsächlichen Zuwachs beim Wechsel. Bei alten
// Daten lesen wir stattdessen den heute gezählten Beitrag aus der zentralen
// Prestige-Tabelle; ein alter Katalogwert wird nie als neues Plus ausgegeben.
function _newsChronikPrestige(d){
  const ids = [...new Set([
    ...(Array.isArray(d.playerIds) ? d.playerIds : []),
    ...Object.keys((d.prestigeDelta && typeof d.prestigeDelta === 'object')
      ? d.prestigeDelta : {})
  ])];
  const runde = x => Math.round((Number(x) || 0) * 10) / 10;
  if(d.prestigeDelta && typeof d.prestigeDelta === 'object'){
    return {modus:'zuwachs', werte:Object.fromEntries(ids.map(pid =>
      [pid, runde(d.prestigeDelta[pid])]))};
  }
  const werte = {};
  ids.forEach(pid => {
    werte[pid] = 0;
    try {
      const titel = seasonTitleOf(pid, d.sid);
      if(!titel || titel.titleId !== d.titleId) return;
      const q = (prestigeOf(pid).quellen || []).find(x => x.q === 'monat'
        && x.id === d.titleId && (!x.sid || x.sid === d.sid));
      if(q && q.p > 0) werte[pid] = runde(q.p);
    } catch(e){}
  });
  return {modus:'bestand', werte};
}

// Der große Wert einer Tafel-Karte. Ein Rekord lebt von seiner Zahl, nicht
// vom Satz darüber.
function _newsTafelWert(s){
  const d = s.dataRef || {};
  // Bei einer Chronik ist das Prestige die Aussage: der Beleg steht im Satz,
  // die Klasse dahinter, und was sie WERT ist, sagt sonst nichts auf der
  // Karte. Die erste Zahl des Belegs waere „4 von 5" gewesen — richtig, aber
  // ohne Bezug.
  if(d.type === 'chronik_geholt'){
    // Neue Karten tragen die echte Differenz der Monats-Summe je Spieler.
    // Alte persistierte Karten fallen auf `zeigt` zurueck: Eine Chronik, die
    // gar nicht in der Monatstafel steht, darf auch dort kein +X behaupten.
    // ── Eine Null ist kein grosser Wert ─────────────────────────────
    // Auf der Karte stand „0 ZUSAETZLICH", und daneben ein Satz, der den
    // Grund nur andeutete. Eine Null im groessten Schriftgrad der Karte
    // liest sich wie ein Fehler: sie behauptet, der Erfolg sei nichts wert,
    // obwohl er eine legendaere Chronik sein kann. Er zaehlt nur nicht
    // ZUSAETZLICH, weil je Monat ein Eintrag in der Tafel steht [§C32] und
    // ein staerkerer den Platz haelt. Dann faellt der Wert weg, und den
    // Grund nennt der Satz mit Namen.
    const beitrag = _newsChronikPrestige(d);
    if(beitrag.modus === 'zuwachs'){
      const plus = Object.values(beitrag.werte).filter(x => x > 0);
      if(!plus.length) return null;
      const gleich = plus.every(x => x === plus[0]);
      if(plus.length > 1 && gleich) return {v:'+' + plus[0], l:'je Spieler'};
      if(plus.length > 1) return {v:'+' + plus.reduce((a, x) => a + x, 0), l:'zusammen'};
      return {v:'+' + plus[0], l:'Prestige'};
    }
    // Persistierte Karten aus älteren Builds kennen noch keine Differenz.
    // Statt ihren damaligen Katalogwert weiter als neues Plus auszugeben,
    // wird ihr HEUTIGER Laufbahnbeitrag aus derselben Prestigequelle gelesen.
    // Hat inzwischen eine bessere Chronik desselben Monats übernommen, ist
    // dieser Beitrag null.
    const aktuell = Object.values(beitrag.werte).filter(x => x > 0);
    if((d.playerIds || []).length){
      if(!aktuell.length) return null;
      const wert = Math.round(aktuell.reduce((a, x) => a + x, 0) * 10) / 10;
      return {v:String(wert).replace('.', ','), l:'zählt aktuell'};
    }
    if(d.zeigt === false) return null;
    return (d.punkte | 0) > 0 ? {v:'+' + d.punkte, l:'Prestige'} : null;
  }
  if(d.eintraege != null) return {v: d.eintraege, l:'Einträge'};
  // ── „Wechsel" zaehlt nur, was gewechselt hat ─────────────────────
  // Gezaehlt waren alle Zeilen, und damit stand „18 WECHSEL" ueber einem
  // Moment, in dem elf davon Ausbauten waren: derselbe Halter, ein besserer
  // Wert, kein Wechsel [§C33]. Die Aufschrift sagt, was die Zahl zaehlt.
  if(d.teile && d.teile.length){
    const w = d.teile.filter(t => t && t.typ !== 'rekord_gesteigert').length;
    if(w) return {v: w, l: w === 1 ? 'Wechsel' : 'Wechsel'};
    return {v: d.teile.length, l: d.teile.length === 1 ? 'Ausbau' : 'Ausbauten'};
  }
  // „Bestwert" war geraten. Die Zahl kommt aus einem Regex ueber den
  // Fliesstext, und bei „Der Wandler" stand damit „0 %" unter der
  // Aufschrift BESTWERT — der Wert ist dort ein UNTERSCHIED zwischen zwei
  // Positionen, und je kleiner er ist, desto besser. Ein Bestwert von null
  // liest sich wie ein Fehler.
  //
  // Wie die Zahl heisst, weiss der Katalog: die Kammer sagt, was ein
  // Eintrag ueberhaupt ist [§C35]. Ein Liga-Rekord ist ein Bestwert, eine
  // Fuegung nicht, und eine Schattenseite schon gar nicht.
  // ── Und der Wert wird nicht mehr geraten ─────────────────────────
  // Gelesen wurde die erste Zahl des FLIESSTEXTS, ohne Vorzeichen und ohne
  // Einheit: unter „Maxi, Julian, Jane und Johannes uebernehmen ‚Der
  // Hoehenflug'" stand damit „10 %", waehrend der Satz darunter „+10
  // %-Punkte, 70 % in den letzten 10 statt 60 %" nennt — ein Unterschied
  // liest sich als Anteil, und das Plus fehlt. Der Beleg beginnt garantiert
  // mit dem Sortierwert [§C35], also steht er dort und muss nicht gesucht
  // werden; nur alte Karten ohne `ev` fallen auf den Satz zurueck.
  // Ohne „-Punkte": der grosse Wert bleibt kurz, sonst brach „+10 %-Punkte"
  // in zwei Zeilen und drueckte die Schlagzeile daneben auf drei [§C27]. Das
  // Vorzeichen sagt, dass es ein Unterschied ist; die Einheit nennt der Satz.
  const zahl = /^\s*([+−-]?\d+(?:[.,]\d+)?\s?(?:%|Elo|Tore)?)/;
  const m = String(d.ev || '').match(zahl)
         || String(s.desc || '').match(zahl)
         || String(s.desc || '').match(/(\d+[.,]?\d*\s?%|\d+)/);
  if(!m) return null;
  let label = 'Bestwert';
  try {
    const def = d.rekordId && CHRONICLE_BY_ID[d.rekordId];
    const k = def && CHRON_KINDS[def.kind];
    if(k) label = k.label;
  } catch(e){}
  return {v: m[1], l: label};
}

// Der Rang eines Spielers als kurze Angabe fürs Zahlenband.
// Der Platz in der GESAMT-Rangliste — dieselbe Quelle wie der Zeitraum
// „Gesamt" im Liga-Tab (`careerElo` aus getGlobalSim), also dieselbe Zahl,
// die dort über dem Namen steht [§C27]. Das ist NICHT der Platz in der
// laufenden Saison: wer über die ganze Ligageschichte Siebter ist, kann
// diesen Monat Zweiter sein, und „Rang 7 in der Liga" behauptete auf einer
// Karte über einen guten Spieltag genau das Gegenteil von dem, was gerade
// passiert war.
//
// EINE Stelle rechnet das. Die Zeile im Blatt rechnete es ein zweites Mal
// nach, und zwei Rechnungen über dieselbe Frage laufen irgendwann
// auseinander [§C27].
function _newsGesamtrang(pid){
  try {
    const career = (getGlobalSim() || {}).careerElo || {};
    // Ein Ruheständler hat keinen Platz in der Liga von heute [§C40].
    const ids = Object.keys(career).filter(id => ligaAktiv(pmap()[id]));
    ids.sort((a, b) => (career[b] ?? 0) - (career[a] ?? 0));
    return ids.indexOf(pid) + 1;
  } catch(e){ return 0; }
}
function _newsRangKurz(pid){
  const r = _newsGesamtrang(pid);
  return r > 0 ? 'Rang ' + r : null;
}

// Wie selten die Auszeichnung ist, in Worten. Vier Klassen, nicht drei: die
// Schande fiel vorher durch und stand als „Negative" im Blatt.
function _newsRarityLabel(r){
  return r === 'legendary' ? 'Legendär' : r === 'rare' ? 'Selten'
       : r === 'negative' ? 'Schande' : 'Gewöhnlich';
}

// Wie viele der Liga diese Auszeichnung tragen. Das ist die Gegenprobe zur
// Klasse [§C34] und die Zahl, die eine Auszeichnung belohnend macht: „einer
// von zwölf" sagt mehr als „Legendär".
function _newsBadgeHalterText(badgeId){
  if(!badgeId) return '';
  try {
    const ids = Object.keys(pmap()).filter(id => sichtbar(pmap()[id]));
    const n = ids.filter(id => (getCachedBadges(id) || []).some(b => b.id === badgeId)).length;
    if(!n) return '';
    return n === 1 ? 'als Einziger in der Liga' : `${n} von ${ids.length} tragen sie`;
  } catch(e){ return ''; }
}

// Zwölf Sorten, zwölf Bauformen. Eine Karte soll man an der FORM erkennen,
// bevor man den ersten Satz gelesen hat. Vorher unterschied die Sorten nur
// eine Randfarbe, und zehn Karten untereinander sahen alle gleich aus. Die
// ruhigen Farbfamilien im CSS sind die zweite Orientierung, nicht die Form.
function _newsSorte(s){
  const d = (s && s.dataRef) || {};
  const t = d.type || '';
  if(t === 'woche') return 'woche';                       // Zeilen der Wertungen
  if(t === 'runde') return 'spiel';                       // die Runde der Vier [§11.6c]
  if(t === 'insignium_stufe') return 'ins';               // die Leiter
  if(t === 'ambient') return 'fakt';                      // leise, eine Zahl
  if(t === 'potd' || t === 'potw') return 'held';         // Wappen groß, Zahlenband
  // Der Meister ist der Held schlechthin. Ohne diese Zeile fiel er auf
  // „fakt" — die leiseste Karte des Feeds trug die Nachricht, die es je
  // Monat genau einmal gibt, und Gold gehört den Titeln [§C25].
  if(t === 'season_recap') return 'held';
  // Das Karriereende erzählt eine ganze Laufbahn: der Held mit seinem
  // Wappen, wie es beim Abschied stand [§C40].
  if(t === 'karriereende') return 'held';
  if(t === 'badge_unlocked') return 'badge';              // das Zeichen der Auszeichnung
  // Die gesammelten runden Marken eines Tages sind dieselbe Sache in der
  // Mehrzahl und tragen deshalb dieselbe Form [§C27]. Ohne diese Zeile fiele
  // sie auf „fakt" und waere die leiseste Karte des Feeds.
  if(t === 'badge_marken') return 'badge';
  if(t === 'sammel'){
    // Zwei eigene Formen fuer die beiden zusammenfuehrenden Karten. Sie sahen
    // als Tafel- oder Spieltagskarte aus wie die Meldung, von der sie eine
    // von mehreren buendeln — und die eine handelt von EINEM Spieler, die
    // andere von EINEM Erfolg. Das ist vor dem ersten Satz zu sehen [§C27].
    if(d.quelle === 'spieler') return 'spieler';
    if(d.quelle === 'erfolg')  return 'erfolg';
    // Die kurze Strecke ist dieselbe Kammer und damit dieselbe Form [§C25].
    return (d.quelle === 'tafel' || d.quelle === 'form') ? 'tafel' : 'spiel';
  }
  if((s && s.cat) === 'tafel' || t.indexOf('rekord_') === 0 || t.indexOf('chronik_') === 0) return 'tafel';
  // Rivalitaet, Serie und Duo sind drei verschiedene Aussagen und sahen als
  // eine Sorte gleich aus: an einem Spieltag standen drei Karten „ZU ZWEIT"
  // untereinander, die von drei verschiedenen Dingen erzaehlten.
  if(t === 'rivalry' || t === 'rivalry_milestone') return 'duell';
  if(t === 'team_streak' || t === 'team_loss_streak'
     || t === 'win_streak' || t === 'loss_streak') return 'serie';
  if(d.matchId) return 'spiel';                           // Ergebnisband
  if(d.pid) return 'marke';                               // ein Wappen, ein Wert
  return 'fakt';
}

// Das Ergebnisband: vier Wappen und der Endstand über der Schlagzeile. Wer
// nur scrollt, sieht schon, wer gegen wen gespielt hat und wie es ausging.
function _newsErgebnisBand(matchId){
  if(!matchId) return '';
  const m = (matches || []).find(x => x.id === matchId);
  if(!m) return '';
  const pm = pmap();
  const team = ids => {
    const echt = ids.filter(id => pm[id]);
    return `<span class="nf-erg-avs">${echt
      .map(id => avHtml(pm[id], '', {ins:true, px:48, feuer:0})).join('')}</span>`
      // Ein Name je Zeile: „Johannes & Jannik" in einer Zeile wurde mit „…"
      // gekürzt, und gerade der zweite Name fehlte [§11.6c].
      + `<span class="nf-erg-team">${echt.map(id => `<span>${esc(pm[id].name)}</span>`).join('')}</span>`;
  };
  const aWin = m.winner === 'A';
  return `<div class="nf-erg">
    <div class="nf-erg-s${aWin?' w':''}">${team([m.a1, m.a2])}</div>
    <div class="nf-erg-sc"><b class="${aWin?'w':'v'}">${m.score_a}</b>`
    + `<i>:</i><b class="${aWin?'v':'w'}">${m.score_b}</b></div>
    <div class="nf-erg-s re${aWin?'':' w'}">${team([m.b1, m.b2])}</div>
  </div>`;
}

// Der große Wert links, daneben wofür er steht. Bei einem Rekord ist die Zahl
// die Hauptsache, nicht der Satz darüber.
function _newsWertBlock(wert, label, farbe){
  if(!wert) return '';
  // Ein langer Wert wird kleiner, nicht zweizeilig: „+10 %" brach zu „+10"
  // und „%" untereinander und drueckte die Schlagzeile auf drei Zeilen. Die
  // Stufe steht hier, weil nur hier die Laenge bekannt ist [§C27].
  const n = String(wert).length;
  const lang = n > 8 ? 2 : (n > 5 ? 1 : 0);
  return `<div class="nf-wert ${farbe || ''}"${lang ? ` data-lang="${lang}"` : ''}>`
       + `<b>${esc(String(wert))}</b>`
       + (label ? `<span>${esc(label)}</span>` : '') + `</div>`;
}

// Die Insignium-Leiter: sieben Zeichen, die erreichten hell, das eigene umrandet.
// Damit sieht man auf einen Blick, wo jemand steht und wie weit es noch ist.
// Das Zeichen, um das eine Erfolgs-Karte geht. Nur dort, wo der Erfolg
// ueberhaupt eines HAT: eine Insignium-Stufe hat eins, ein Jubilaeum nicht.
function _newsErfolgZeichen(s){
  const d = (s && s.dataRef) || {};
  if(d.kopfTyp !== 'insignium_stufe') return '';
  const stufe = INSIGNIEN[d.stufe | 0];
  if(!stufe) return '';
  const pid = (Array.isArray(d.playerIds) ? d.playerIds[0] : null);
  let z = '';
  try {
    z = insigniumStufeSvg(stufe.key, (getPlayerRank(pid) || {}).label, 0, 0) || '';
  } catch(e){ z = ''; }
  return z ? `<span class="nf-erf-z">${z}</span>` : '';
}

function _newsLeiter(pid){
  try {
    const P = prestigeOf(pid);
    if(!P) return '';
    const stufe = P.stufe || 0;
    // Die ECHTEN Zeichen, nicht gefärbte Punkte. Vorher stand hier ein
    // CSS-Kreis je Stufe (`repeating-conic-gradient`), und der hatte mit dem
    // Zeichen, das ein Spieler trägt, nichts zu tun: Rosetten in fünf
    // Farben, wo Reif, Schildring und Volutenkranz stehen müssten. `insigniumStufeSvg` trägt seine Verläufe
    // selbst [§C30] und funktioniert deshalb auch im Blatt.
    // Der Grad ist der eigene nur an der eigenen Stufe; die übrigen stehen
    // im ersten Grad, sonst behauptete die Leiter einen Ausbau, den es an
    // dieser Stufe nie gab.
    const rangLabel = (getPlayerRank(pid) || {}).label;
    const punkte = INSIGNIEN.map((ins, i) => {
      let z = '';
      try { z = insigniumStufeSvg(ins.key, rangLabel,
                  i === stufe ? (P.zacken || 0) : 0,
                  i === stufe ? (P.grad || 0) : 0) || ''; } catch(e){ z = ''; }
      return `<span class="nf-lt-p${i <= stufe ? ' hat' : ''}${i === stufe ? ' jetzt' : ''}">${z}</span>`;
    }).join('');
    const rest = P.naechste ? `${P.punkte} / ${P.naechste.min}` : `${P.punkte}`;
    return `<div class="nf-leiter">${punkte}<span class="nf-lt-t">${esc(rest)}</span></div>`;
  } catch(e){ return ''; }
}

// Die Leiter der ganzen Liga [§C30]: jede Stufe im ersten Grad, darunter,
// wie viele sie tragen. Gezeichnet im Violett der Vorlage — die Karte gehört
// keinem Spieler, also auch keinem Rang. Eine Stufe ohne Träger steht leise
// da, aber sie steht da: sie ist der Grund der Karte.
function _newsLigaLeiter(L){
  try {
    const je = Array.isArray(L && L.je) ? L.je : [];
    const f = INSIGNIEN.map((ins, i) => {
      const n = je[i] | 0;
      let z = '';
      try { z = insigniumStufeSvg(ins.key, INS_BILD_RANG, 0, 0) || ''; } catch(e){ z = ''; }
      return `<span class="nf-ll-f"><span class="nf-lt-p${n ? ' hat' : ''}">${z}</span>`
        + `<span class="nf-ll-n num${n ? '' : ' leer'}">${n || '–'}</span></span>`;
    }).join('');
    return `<div class="nf-leiter nf-ll">${f}<span class="nf-lt-t">Träger je Stufe</span></div>`;
  } catch(e){ return ''; }
}

// Das Zahlenband im Fuß: bis zu drei Werte mit ihrer Bezeichnung. Es steht
// dort, wo die Karte sonst aufhört, und trägt das, was der Satz nicht sagen
// muss.
function _newsZahlband(werte){
  const w = (werte || []).filter(x => x && x.v != null && x.v !== '');
  if(!w.length) return '';
  return `<div class="nf-zb">${w.slice(0, 3).map(x =>
    `<div><b class="${x.f || ''}">${esc(String(x.v))}</b><span>${esc(x.l || '')}</span></div>`).join('')}</div>`;
}

// ── Die Meisterbühne im Feed [§C31] ─────────────────────────────────
// Das Podest kommt aus derselben Rangliste wie im Saison-Rückblick
// (`saisonRang`); die Karte nennt aber, was bei ihrer Entstehung galt, also
// steht der Meister aus dem `dataRef` in der Mitte. Kleiner als im Blatt:
// 64 und 52 px, darunter bliebe vom Wappen nichts [§6]. Hinter dem Ersten
// liegt ein Strahlenkranz in Gold — er ist Licht und keine Form, und bei
// Bewegungsruhe steht er still.
// Der Kopf der Karte eines Karriereendes: dasselbe Wappen wie im Blatt,
// kleiner — 84 px, darunter bliebe vom Band nichts [§6].
function _newsAbschiedKopf(d){
  const p = pmap()[d.pid];
  if(!p) return '';
  return `<div class="nf-abschied" data-pid="${esc(d.pid)}"><span class="nf-ab-strahl" aria-hidden="true"></span>`
    + `${rcpAvHtml(d.pid, 84, {band:true, titel:d.titel || 0})}</div>`;
}
function _newsMeisterKopf(d){
  try {
    const rang = saisonRang(d.sid);
    if(!rang.length) return '';
    return `<div class="nf-meister"><span class="nf-ms-strahl" aria-hidden="true"></span>${
      saisonPodestHtml(d.sid, rang, {px1:64, px:52, klasse:'nf-podest', attr:'data-mpid'})}</div>`;
  } catch(e){ return ''; }
}
function _newsMeisterFuss(d){
  try {
    const te = Array.isArray(d.topElo) ? d.topElo : [];
    const ids = te.map(x => x && x.id).filter(Boolean);
    const sp = saisonSpitze(d.sid);
    const n = sp.tage[d.championId] || 0;
    const vorsprung = te[0] && te[1] ? Math.max(0, te[0].elo - te[1].elo) : null;
    const r = saisonRang(d.sid).find(x => x.id === d.championId);
    const sp2 = r ? r.wins + r.losses : 0;
    return saisonRennenHtml(d.sid, ids, {klein:true}) + _newsZahlband([
      {v: sp.spieltage ? n + ' von ' + sp.spieltage : null, l:'Spieltage vorn', f:'g'},
      {v: vorsprung != null ? '+' + vorsprung : null, l:'Elo vor Platz 2'},
      {v: sp2 ? Math.round(r.wins / sp2 * 100) + ' %' : null, l:'Siegquote'}
    ]);
  } catch(e){ return ''; }
}

// Breaking-Hero — das Herzstück oben im Sheet, bewusst dramatisch.
// v9.1: etwas längerer, spannenderer Hero-Text je Breaking-Typ — display-seitig
// aus dataRef gebaut (wirkt auch auf bereits persistierte Rows). Bewusst 1–2
// Sätze: soll neugierig machen, aber nicht von den Stories darunter ablenken.
// Fällt auf s.desc zurück, wenn die Datenlage nicht reicht.
function _breakingHeroText(s){
  const d = (s && s.dataRef) || {};
  const pm = pmap();
  const nm = id => (pm[id] && pm[id].name) || '?';
  try {
    switch(d.type){
      // ── Der Monat heißt, wie er heißt ────────────────────────────
      // „Die Saison 2026-08 ist Geschichte" nannte die Saison-ID, eine
      // Zeichenkette, die niemanden interessiert, und „Vor Johannes." war ein
      // Satz ohne Verb [§C33]. Elo, Vorsprung und Tage vorn stehen auf der
      // Karte im Podest und im Zahlenband; der Nachsatz erzählt, was dort
      // nicht steht: wann der Titel entschieden war.
      case 'season_recap': {
        const te = Array.isArray(d.topElo) ? d.topElo : [];
        const cid = d.championId || (te[0] && te[0].id);
        const champ = nm(cid);
        const monat = d.sid ? seasonLabel(d.sid) : 'Die Saison';
        let lauf = '';
        try {
          const sp = saisonSpitze(d.sid), f = sp.folge;
          const mm = String(d.sid || '').slice(5, 7);
          let i = f.length - 1;
          while(i > 0 && f[i - 1].pid === cid) i--;
          if(f.length && f[f.length - 1].pid === cid){
            lauf = i === 0
              ? ` ${champ} lag vom ersten Spieltag an vorn und gab die Spitze nie ab.`
              : ` Die Spitze wechselte ${sp.wechsel === 1 ? 'einmal' : (_BELEG_ZAHL[sp.wechsel] ? _BELEG_ZAHL[sp.wechsel] + 'mal' : sp.wechsel + '-mal')}, `
                + `und vom ${String(f[i].day).padStart(2, '0')}.${mm}. an blieb ${champ} vorn.`;
          }
        } catch(e){}
        return `${monat} ist entschieden: ${champ} holt den Titel.` + lauf;
      }
      // ── Der Nachsatz nennt eine Zahl ────────────────────────────
      // „Machtwechsel an der Tabellenspitze: X verdraengt Y und uebernimmt
      // die Fuehrung. Das Titelrennen ist wieder voellig offen." war ein
      // Etikett mit Doppelpunkt am Satzanfang [§C33], nannte keine einzige
      // Zahl und behauptete eine offene Lage, die bei 91 Elo Vorsprung
      // nicht stimmt. Und es stand „X verdraengt X", wenn X die Spitze am
      // selben Tag abgab und zurueckholte.
      case 'lead_change': {
        const wv = Number(d.wechsel) || 1;
        const holt = d.zurueck
          ? `${nm(d.newLeader)} holt sich die Spitze von ${nm(d.prevLeader)} zurück`
          : `${nm(d.newLeader)} verdrängt ${nm(d.prevLeader)} von der Spitze`;
        return holt
          + (d.elo != null ? ` und steht bei ${d.elo} Elo.` : '.')
          + (d.gap != null ? ` ${d.gap} Elo Vorsprung auf den Zweiten.` : '')
          + (wv > 1 ? ` ${wv} Wechsel an einem Tag.` : '');
      }
      case 'top_clash': {
        // p1/p2 (v9.3): Platz-1- bzw. Platz-2-Spieler namentlich. Fallback auf
        // Sieger-Team für alte, vor v9.3 persistierte Stories.
        const a = d.p1 ? nm(d.p1) : (Array.isArray(d.winners) ? d.winners.map(nm).join(' & ') : '');
        const b = d.p2 ? nm(d.p2) : null;
        return b
          ? `Gipfeltreffen an der Spitze: Tabellenführer ${a} bezwingt Verfolger ${b} im direkten Duell und baut den Vorsprung an der Spitze aus.`
          : `Gipfeltreffen an der Spitze: ${a} setzt sich im Spitzenspiel durch und zieht weiter davon.`;
      }
      // Der Countdown hat keinen Nachsatz. Er hiess „Nur noch 6 Tage bis zum
      // Saisonende: Martin führt, doch der Vorsprung von 11 Elo ist alles
      // andere als sicher. Jetzt zählt jedes Spiel." Drei Fehler: ein Etikett
      // mit Doppelpunkt am Satzanfang, jede Zahl darin stand in der
      // Schlagzeile („Noch 6 Tage um den Monat") und im Text („Martin führt
      // mit 390 Elo, Leon liegt 11 dahinter") schon, und der Schlusssatz
      // nennt keine [§C33]. Wo es nichts Neues zu sagen gibt, gibt es keinen
      // dritten Satz: der Aufrufer unterdrueckt den Rueckfall auf `desc`.
      case 'badge_unlocked':
        return `${nm(d.playerId)} schnappt sich mit „${d.badgeName || s.title}" eine der seltensten Auszeichnungen der Liga. Das gelingt fast niemandem.`;
      case 'elo_record':
        return `${nm(d.pid)} schreibt Liga-Geschichte: Mit ${d.elo} Elo steht kein Spieler jemals höher. Eine neue Bestmarke für die Ewigkeit. Wer traut sich, sie anzugreifen?`;
      case 'streak_record':
        return `${nm(d.pid)} stellt einen Liga-Rekord für die Ewigkeit auf: ${d.streak} Siege in Folge. Keine Serie war jemals länger. Wer stoppt diesen Lauf?`;
      case 'giant_slayer': {
        const w = Array.isArray(d.winners) ? d.winners.map(nm).join(' & ') : '';
        const l = Array.isArray(d.losers) ? d.losers.map(nm).join(' & ') : 'den Favoriten';
        const pct = d.chance!=null ? Math.max(1, Math.round(d.chance*100)) : null;
        return `Die Sensation des Spieltags: Mit nur ${pct!=null?pct+'%':'minimaler'} Siegchance bezwingt ${w} das Favoriten-Team ${l}. So einen Coup sieht man in der Liga fast nie.`;
      }
      // ── Eine gebuendelte Karte erbt ihr Breaking von einer Zeile ──
      // Der Schalter kennt sieben Typen und fiel sonst auf `desc` zurueck;
      // weil der Nachsatz bei Gleichheit unterdrueckt wird, blieb er auf
      // jeder gebuendelten Breaking-Karte ganz leer. Gezeigt wird deshalb
      // der lange Satz DES ANLASSES: die Zeile im Sammelband nennt ihn
      // kurz, der Nachsatz erzaehlt ihn aus [§C33].
      case 'sammel': {
        const teile = Array.isArray(d.teile) ? d.teile : [];
        const anlass = teile.find(t => t && t.brk) || null;
        const lang = anlass && String(anlass.text || '').trim();
        if(lang) return lang;
        break;
      }
    }
  } catch(e){}
  return s.desc || '';
}
// Der Tageskopf trug zuerst die Schlagzeile der wichtigsten Karte — und die
// stand damit zweimal untereinander, im Kopf und als erste Karte darunter.
// Er nennt jetzt die Bilanz des Tages: wie viel gespielt wurde und von wem.
// Das steht sonst nirgends im Feed und wiederholt keine Karte.
// Die Partien eines Kalendertags. Bewusst nicht `matchesByDay`: das
// schluesselt nach `toISOString()` und damit nach UTC, der Feed gruppiert
// aber nach Ortszeit (`tagKey`) — an einer Tagesgrenze fielen beide
// auseinander und die Karte des Tages haenge am falschen Tag.
function _newsTagMs(dayKey){
  try {
    const out = [];
    (matches || []).forEach(m => { if(tagKey(m.created_at) === dayKey) out.push(m); });
    return out;
  } catch(e){ return []; }
}
// Welche Karte ist die Karte des Tages? Nicht automatisch der Spieler des
// Tages, sondern die Geschichte mit dem groessten Nachrichtenwert. Die
// Generator-Prioritaet allein taugt dafuer nicht: POTD muss im normalen Feed
// verlaesslich sichtbar sein und hat deshalb eine hohe Prioritaet, ist aber
// nicht an jedem Spieltag die spannendste Geschichte. Seltenheit, Umbruch,
// Ueberraschung und mehrere zusammenfallende Ereignisse wiegen hier staerker.
function _newsTagSpannung(s){
  const d = (s && s.dataRef) || {};
  const t = d.type || '';
  if(_isBreaking(s)) return 1200 + (s.prio || 0);
  const basis = {
    giant_slayer:980, top_clash:940, rekord_geholt:900,
    rekord_erstmals:920, rekord_gesteigert:870, chronik_geholt:850,
    insignium_stufe:840, badge_unlocked:800, lead_change:980,
    elo_record:1000, streak_record:1000, team_streak:770,
    match_result:760,
    win_streak:750, rivalry_milestone:730, rivalry:690,
    potd:620, potw:640, woche:700
  };
  let wert = basis[t] || 560;
  if(t === 'giant_slayer' && d.chance != null)
    wert += Math.round((1 - Math.max(0, Math.min(1, d.chance))) * 100);
  if(t === 'badge_unlocked') wert += d.rarity === 'legendary' ? 130 : d.rarity === 'rare' ? 55 : 0;
  if(t === 'insignium_stufe') wert += Math.max(0, Number(d.stufe) || 0) * 25;
  if(t === 'chronik_geholt') wert += Math.min(80, Math.max(0, Number(d.punkte) || 0) / 2);
  if(t === 'sammel'){
    const teile = Array.isArray(d.teile) ? d.teile : [];
    const kopf = d.kopfTyp ? _newsTagSpannung({prio:s.prio, dataRef:{type:d.kopfTyp}}) : 620;
    wert = kopf + Math.min(120, Math.max(0, teile.length - 1) * 35);
  }
  return wert + Math.min(25, Math.max(0, Number(s.prio) || 0) / 10);
}

// Die gewaehlte Geschichte wird darunter gross gezeigt, statt im Kopf noch
// einmal aufgeschrieben zu werden.
//
// Es gibt sie **nur an Spieltagen**. An einem Tag ohne Partie ist nichts
// passiert, was ein Tag von einem anderen unterscheidet: dort standen sonst
// ein Fun Fact oder eine Zufallsstatistik groß im Bild, die mit diesem Tag
// nichts zu tun haben und gestern genauso dagestanden hätten.
// ── Wer kann das Band tragen? [§C33] ────────────────────────────────
// Vier Sorten nicht, und jede aus ihrem eigenen Grund.
// **Breaking** nicht: die Karte ist im Feed ohnehin die lauteste — voller
// Rahmen, pulsierender Balken, Schein hinter der ganzen Flaeche. Das Band
// darueber sagt dasselbe ein zweites Mal [§C27] und nimmt es genau der
// Karte, die sonst keine Moeglichkeit hat, herauszustehen.
// **Der Spieler des Tages** nicht: er ist eine Pflichtkarte und steht an
// jedem gewerteten Spieltag da. Er traegt seine Goldkante schon und haette
// das Band an jedem ruhigen Tag von selbst — dann zeichnet es nichts aus.
// **Ein Rueckblick** nicht: Woche, Monat und Saison erzaehlen von einem
// Zeitraum, das Band gehoert dem TAG.
// **Eine Karte mit negativer Richtung** nicht: das Band ist golden, und Gold
// gehoert dem Titel [§C25]. Gemessen trug „Anton: Die Talfahrt" — fuenf
// Niederlagen in Folge, eine Schande — an einem Spieltag das Band und damit
// den goldenen Auswahlschimmer, als waere die Pleite die Geschichte des Tages.
// Die Liste steht hier und nicht im Aufruf, weil `tests/ambient` und
// `tests/blatt` dieselbe Frage stellen und sie sich vorher jeder selbst
// beantwortet haben — zwei Listen fuer dieselbe Aussage waere eine zu viel.
const NEWS_TAGKARTE_OHNE = new Set(['ambient', 'dry_spell', 'season_endgame',
  'quiet_week', 'season_start', 'potd', 'potw', 'woche', 'chronik_monat',
  'season_recap', 'runde']);
function _newsTagKarteWuerdig(st){
  if(NEWS_TAGKARTE_OHNE.has(((st && st.dataRef) || {}).type || '')) return false;
  if(_newsIstNegativ(st)) return false;
  return !_isBreaking(st);
}
function _newsTagKarte(items, dayKey){
  if(!Array.isArray(items) || !items.length) return null;
  const tagMs = _newsTagMs(dayKey);
  if(!tagMs.length) return null;   // an diesem Tag wurde nicht gespielt
  // Sie steht, sobald der Spieltag entschieden ist — nicht erst um 23:59.
  // Zwei Bedingungen, eine reicht: die Zahl der Partien (`tagKartePartien`,
  // gemessen der Median der Liga) oder die Stunde (`tagKarteStunde`), die die
  // kurzen Tage auffaengt. Vorher wurde die Karte zwanzig Minuten nach dem
  // ersten Spiel vergeben: der Rekord, der gerade wechselte, war die einzige
  // Karte des Tages und damit automatisch die staerkste, waehrend der
  // Spieltag noch lief und der Spieler des Tages noch gar nicht feststand.
  // Danach stand sie erst um 23:59 und damit einen halben Tag, nachdem die
  // letzte Partie gelaufen war [§C33].
  // Ein Spiel ist kein Spieltag: bei genau einer Partie gibt es kein Band.
  if(tagMs.length < NEWS_LIMITS.tagKarteMin) return null;
  if(tagMs.length >= NEWS_LIMITS.tagKartePartien){
    // Nicht ab der Zahl allein, sondern ab dem MOMENT, in dem sie erreicht
    // ist: sonst stuende das Band am Morgen des naechsten Tages rueckwirkend
    // auch ueber einer Karte, die vor der fuenften Partie entstanden ist.
    const zeiten = tagMs.map(m => mts(m)).sort((a, b) => a - b);
    if(Date.now() < zeiten[NEWS_LIMITS.tagKartePartien - 1]) return null;
  } else {
    const frei = new Date(dayKey + 'T00:00:00');
    frei.setHours(NEWS_LIMITS.tagKarteStunde, 0, 0, 0);
    if(Date.now() < frei.getTime()) return null;
  }
  const kandidaten = items.filter(_newsTagKarteWuerdig);
  if(!kandidaten.length) return null;
  const beste = kandidaten.slice().sort((a, b) =>
    (_newsTagSpannung(b) - _newsTagSpannung(a))
      || ((b.prio || 0) - (a.prio || 0))
      || String(a.id || '').localeCompare(String(b.id || '')))[0];
  if(!beste) return null;
  // Staerker als eine Tagesbilanz, sonst kein Band [§C33].
  if(_newsTagSpannung(beste) < (NEWS_LIMITS.tagKarteSpannung || 0)) return null;
  return beste.id;
}
function _renderNewsFeed(){
  _sheetSetReopen(()=>_renderNewsFeed());
  const stories = getStoriesCache();
  const seen = _newsLoadSeen();
  const stand = _newsLesestand();
  const gelesen = s => _newsGelesen(s, seen, stand);
  // Vier Chips, nicht elf. Elf Rubriken sind eine Sortierhilfe für den, der
  // sie gebaut hat, nicht für den, der liest. Jeder Chip trägt seine Anzahl,
  // damit man vorher sieht, ob sich das Tippen lohnt.
  const _istTafel   = s => s.cat === 'tafel' || (s.dataRef||{}).quelle === 'tafel'
    || (s.dataRef||{}).quelle === 'form';
  const _istSpieltag = s => {
    const d = s.dataRef || {};
    // Die Filter sind redaktionelle Seiten, keine sich überschneidenden
    // Suchbegriffe. Eine Tafelmeldung darf ihren Match-Zeitpunkt tragen,
    // ohne deshalb zugleich im Spieltag-Chip zu erscheinen.
    if(_istTafel(s)) return false;
    if(d.type === 'ambient') return false;
    return !!(d.matchId || d.type === 'potd' || d.type === 'woche' || d.type === 'runde' ||
              (d.type === 'sammel' && d.quelle === 'spiel'));
  };
  // Jeder Chip traegt sein Zeichen — dasselbe wie im Rubrikband der Karten,
  // zu denen er filtert [§C27]. Vier gleich aussehende Pillen unterschied
  // vorher nur ihr Wort.
  const filters = [
    {k:'all',      label:'Alle',     ic:'newspaper',  test:() => true},
    {k:'breaking', label:'Breaking', ic:'sirene',       test:_isBreaking},
    {k:'tafel',    label:'Tafel',    ic:'tafelStein', test:_istTafel},
    {k:'spieltag', label:'Spieltag', ic:'spielfeld', test:_istSpieltag},
  ];
  const aktiv = filters.find(f => f.k === _newsFeedFilter) || filters[0];
  const cards = _newsFeedFilter === 'all' ? stories : stories.filter(aktiv.test);

  const filterBar = `<div class="nf-chips">
    ${filters.map(f => {
      const n = f.k === 'all' ? stories.length : stories.filter(f.test).length;
      return `<button class="nf-chip-f${_newsFeedFilter===f.k?' on':''}${f.k==='breaking'?' brk':''}" data-f="${f.k}">`
           + `${svgI(f.ic)}${esc(f.label)}<i>${n}</i></button>`;
    }).join('')}
  </div>`;

  // Die Tafel: ein Tageskopf, darunter alle Karten dieses Tages. Breaking
  // bleibt an seinem Platz in der Chronologie und wird nicht nach oben
  // gezogen — es trägt stattdessen einen roten Kopfbalken.
  let listHtml, nachreichen = [];
  if(!cards.length){
    listHtml = '<div class="nf-empty">Keine Stories in dieser Auswahl.</div>';
  } else {
    // Über alle Karten des Feeds, nicht nur die des Filters: der Faden
    // gehört der Geschichte und nicht der Auswahl.
    const faeden = _newsFaeden(stories);
    const jeTag = new Map();
    stories.forEach(st => {
      const k = tagKey(st.when);
      if(!jeTag.has(k)) jeTag.set(k, []);
      jeTag.get(k).push(st);
    });
    const gruppen = [];
    cards.forEach(st => {
      const k = tagKey(st.when);
      const g = gruppen[gruppen.length-1];
      if(g && g.k === k) g.items.push(st);
      else gruppen.push({k, label:_newsDayLabel(st.when), datum:_newsDayDate(st.when), items:[st]});
    });
    gruppen.forEach(g => {
      const neu = g.items.filter(st => !gelesen(st)).length;
      // Die Wahl gehoert dem ganzen Tag, nicht dem aktiven Filter. Sonst
      // koennte dieselbe Tafel je Reiter eine andere „Karte des Tages" haben.
      const alleDesTages = jeTag.get(g.k) || [];
      const tagesKarte = _newsTagKarte(alleDesTages, g.k);
      // Der Kopf traegt Wochentag, Datum und die Zahl der Karten — sonst
      // nichts. Die Bilanz („3 Partien · 4 Spieler") und die Gesichter standen
      // darunter und wiederholten, was die Karten des Tages ohnehin zeigen:
      // vier Wappen ueber vier Karten, auf denen dieselben vier Wappen
      // stehen. Der Kopf ist eine Marke auf dem Zeitstrahl, kein Vorspann.
      // Der Tagesschluessel steht am Kopf: die Bilanz des Tages ist aus dem
      // Markup verschwunden, und ohne ihn liesse sich nicht mehr pruefen, ob
      // an diesem Tag ueberhaupt gespielt wurde.
      const kopf = `<div class="nf-tag" data-tag="${esc(g.k)}">
        <div class="nf-tag-z1"><span class="nf-tag-wt">${esc(g.label)}</span>`
        + `<span class="nf-tag-dt">${esc(g.datum)}</span>`
        + `<span class="nf-tag-n${neu?' neu':''}">${neu ? neu + ' NEU' : g.items.length + (g.items.length===1?' KARTE':' KARTEN')}</span></div>`
        + `</div>`;
      // Keine fertig gezeichnete zweite Haelfte im Speicher: nur kleine
      // Auftraege. Auch ein einzelner sehr grosser Tag bleibt teilbar.
      for(let i = 0; i < g.items.length; i += 4){
        const stapel = g.items.slice(i, i + 4), erster = i === 0;
        nachreichen.push({tag:g.k, erster, kopf:erster ? kopf : '', anzahl:stapel.length,
          html:() => stapel.map(st => _newsCardHtmlM2(st, gelesen(st),
            st.id === tagesKarte, _newsFadenHtml(faeden.get(st.id), stories))).join('')});
      }
    });
    // ── Zuerst, was man sieht ─────────────────────────────────────────
    // Der Feed trägt rund siebzig Karten und 3400 Knoten, und beim Öffnen
    // rechnete der Browser Stil und Layout für alle auf einmal: gemessen
    // 75 ms ohne und 350 ms mit gedrosselter CPU, und das Skript selbst war
    // davon nicht einmal ein Zehntel. Auch die Grafik-/Markup-Arbeit gehoert
    // erst zu dem Teil, der dran ist. Vorher wurde ALLES gebaut und nur das
    // Einfuegen vertagt. Zwoelf Karten zuerst, der Rest in kleinen Takten.
    let n = 0, sofort = 0;
    const oben = [];
    while(sofort < nachreichen.length && n < NEWS_FEED_SOFORT){
      const job = nachreichen[sofort++]; n += job.anzahl;
      // Fortsetzung desselben Tages ohne zweiten Tageskopf/Feedcontainer.
      if(job.erster){
        if(oben.length) oben.push('</div>');
        oben.push(job.kopf + `<div class="nf-feed" data-feed-tag="${esc(job.tag)}">`);
      }
      oben.push(job.html());
    }
    oben.push('</div>');
    listHtml = oben.join('');
    nachreichen = nachreichen.slice(sofort);
  }

  const datum = new Date().toLocaleDateString('de-DE',
    {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  // Der Gelesen-Knopf steht dort, wo auch die Zahl steht, die ihn erklärt.
  // Ohne offene Stories fällt beides weg.
  const offen = stories.filter(x => !gelesen(x)).length;
  const gelesenKnopf = offen
    ? `<button class="nf-gelesen" id="nvMarkAllBtn" type="button">ALLES GELESEN <b>${offen}</b></button>`
    : '';
  openSheet(`
    <div class="nf-wrap">
      <div class="nf-kopf nf-kopf-tafel">
        <div><div class="nf-masthead">LIGA NEWS</div>
        <div class="nf-datum">${esc(datum)}</div></div>
        ${gelesenKnopf}
      </div>
      ${filterBar}
    </div>
    <div class="nf-wrap nf-liste" style="padding-top:0">${listHtml}</div>
  `);
  const sheetEl = document.getElementById('sheet');
  const liste = sheetEl.querySelector('.nf-liste');
  _newsFeedOffen = nachreichen.length && liste
    ? {liste, jobs:nachreichen, index:0, version:_cache.version} : null;
  if(_newsFeedOffen) _newsFeedPlan(_newsFeedOffen);

  // Filter-Click → re-render (billig, Daten aus Cache).
  const sheet = document.getElementById('sheet');
  sheet.querySelectorAll('.nf-chips button[data-f]').forEach(el => {
    el.onclick = () => { _newsFeedFilter = el.dataset.f; _renderNewsFeed(); };
  });
  // „Alle als gelesen markieren" — markiert ALLE Cache-Stories.
  const markBtn = document.getElementById('nvMarkAllBtn');
  if(markBtn){
    markBtn.onclick = () => {
      try { _newsMarkAllSeen(); } catch(e){}
      try { newsBadgeRefresh(); } catch(e){}
      sheet.querySelectorAll('.nf-card, .nf-hero').forEach(el => {
        el.classList.add('read'); el.classList.remove('important');
        el.querySelector('.nf-dot')?.remove();
      });
      // Die Leiste zeigt die Zahl der offenen Stories; nach dem Markieren ist
      // sie null, also gehört sie weg. Neu zeichnen statt den Knopf abblenden.
      _renderNewsFeed();
    };
  }
  // Ein Lauscher an der Liste statt einer an jeder Karte: die Karten, die
  // erst nach dem ersten Bild dazukommen, sind beim Binden noch nicht da.
  if(liste) liste.onclick = ev => {
    // Der Faden öffnet die frühere Karte, nicht die, in der er steht.
    const f = ev.target.closest && ev.target.closest('.nf-faden[data-ziel]');
    if(f){ ev.stopPropagation(); openNewsDetail(f.dataset.ziel); return; }
    // Karten + Hero klickbar → Detail.
    const el = ev.target.closest && ev.target.closest('[data-sid]');
    if(!el || !liste.contains(el)) return;
    const sid = el.dataset.sid;
    _newsMarkSeen(stories.find(s => s.id === sid) || sid);
    el.classList.add('read'); el.classList.remove('important');
    el.querySelector('.nf-dot')?.remove();
    newsBadgeRefresh();
    openNewsDetail(sid);
  };
}
// Der Rest des Feeds, nach dem ersten Bild. Steht die Liste nicht mehr im
// Dokument — eine Karte wurde schon geöffnet, das Blatt geschlossen —,
// fällt er weg: angehängt landete er sonst im nächsten Blatt.
let _newsFeedOffen = null;
const NEWS_FEED_SOFORT = 12;
function _newsFeedRest(alles = true){
  const o = _newsFeedOffen;
  if(!o) return;
  if(!o.liste.isConnected || !_isNewsFeedOpen()){ _newsFeedOffen = null; return; }
  if(o.version !== _cache.version){ _renderNewsFeed(); return; }
  // Direkter Aufruf kann weiterhin vollstaendig fuellen (z.B. Geometrie-
  // Pruefung). Automatisch hoechstens vier Karten je ruhigem Takt.
  do {
    const job = o.jobs[o.index++];
    const ziel = job.erster ? o.liste : o.liste.querySelector(`[data-feed-tag="${job.tag}"]`);
    if(!ziel){ _renderNewsFeed(); return; }
    const html = job.html();
    ziel.insertAdjacentHTML('beforeend', job.erster
      ? job.kopf + `<div class="nf-feed" data-feed-tag="${esc(job.tag)}">${html}</div>` : html);
  } while(alles && o.index < o.jobs.length);
  if(o.index >= o.jobs.length) _newsFeedOffen = null;
}
function _newsFeedPlan(o){
  requestAnimationFrame(() => {
    // Ein Filterwechsel/Neuoeffnen hat einen eigenen Auftrag. Der alte
    // Callback darf nicht versehentlich DIESE neue Liste nachreichen.
    if(_newsFeedOffen !== o) return;
    const zeichnen = () => {
      if(_newsFeedOffen !== o) return;
      _newsFeedRest(false);
      if(_newsFeedOffen === o) _newsFeedPlan(o);
    };
    if(window.requestIdleCallback) window.requestIdleCallback(zeichnen, {timeout:100});
    else setTimeout(zeichnen, 0);
  });
}

