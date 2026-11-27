// ═══════════════════════════════════════════════════════════════════════
// [§C33] DAS BILD EINES FUN FACTS
// ═══════════════════════════════════════════════════════════════════════
// Jeder Fun Fact trug dieselbe Form: eine große Zahl links, der Satz rechts.
// „3 Tage ohne Spiel", „41 Awards", „3830 Prestige" und „7:2 Duelle" standen
// untereinander und sahen gleich aus — die Pause wie die Vitrine, das Duell
// wie das Prestige. Jede Vorlage legt jetzt die Daten ihres Bilds in
// `dataRef.bild` [28-news-ambient], und hier wird daraus der Kopf ihres
// Anlasses: das Rennen der ersten drei, das Tauziehen zweier Spieler, der Lauf
// eines Duos, die Tage der Pause, die Vitrine, die Stufe der Leiter, die zwei
// Rollen, die Verteilung der Ergebnisse, die Säulen der Spieltage, der Platz
// im Feld, die Tafel des Monats und das Zählwerk.
//
// Gezeichnet wird nur, was gespeichert ist — ein Fun Fact ist eine Ziehung
// und erzählt vom Tag, an dem er stand. Eine ältere Karte ohne `bild` behält
// ihre Zahl links. Die Bilder sind leise wie die Karte [§C25]: Metall, die
// Farbe ihrer Familie (`--story`) nur am Ersten und an dem, worum es geht.
//
// Die Karte trägt Titel und Bild, keinen Satz [§C33]; das Bild belegt den
// Titel und nennt keine seiner Zahlen noch einmal als Beschriftung — es darf
// sie als Größe zeigen (Balken, Bogen, Lage). „+7 Siege mehr als erwartet"
// stand unter „gewinnen sieben Partien mehr als erwartet". Beschriftungen
// sind Achsen und Namen, keine Sätze, und nicht unter 9 px.
//
// Jedes Bild nennt die Namen seiner Spieler im Text, nicht nur als Gesicht:
// wer den Feed überfliegt, will wissen, wer gemeint ist, und ein Gesicht mit
// zwei Buchstaben sagt das nicht [§C33]. Kein Name wird gekürzt; er bricht um.

function _ffChip(pid){ const p = pmap()[pid]; return p ? avHtml(p, '', {}) : ''; }
function _ffNm(pid){ return `<span class="ff-nm">${esc(_spName(pid))}</span>`; }
function _ffPct(x){ return Math.max(0, Math.min(100, Math.round((Number(x) || 0) * 1000) / 10)); }

function _faktBild(s, gross){
  const d = (s && s.dataRef) || {};
  // Die Pause ist kein Fun Fact aus dem Slot, sie trägt ihre Zahlen aber
  // schon im `dataRef` [27-news-generator].
  if(d.type === 'dry_spell') return _ffPause(d);
  const b = d.bild;
  if(!b || typeof b !== 'object') return '';
  const f = _FF_FORM[b.f];
  if(!f) return '';
  let h = '';
  try { h = f(b, d) || ''; } catch(e){ h = ''; }
  return h ? `<div class="ff ff-${esc(b.f)}${gross ? ' gross' : ''}">${h}</div>` : '';
}

// ── Das Rennen: die ersten drei als Balken ──────────────────────────────
// Die Breite rechnet die Vorlage aus; hier steht nur, wie lang.
function _ffRennen(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  return r.map((x, k) => `<div class="ff-r${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}`
    + `<span class="ff-r-m">${_ffNm(x.p)}<span class="ff-bar"><i style="width:${_ffPct(x.w)}%"></i></span></span>`
    + `<b class="num">${esc(String(x.t))}</b></div>`).join('');
}

// ── Das Podest: Platz zwei, eins, drei, die Höhe nach dem Platz ─────────
// Für einen Bestwert der Liga: wer ihn hält, steht oben, und die beiden
// dahinter stehen daneben. Wie bei jedem Podest der App [§C27] ist die Höhe
// der Platz und nicht der Wert; den nennt die Zahl im Sockel. Mit `ins` trägt
// jeder sein Wappen — beim Prestige ist das Zeichen die Aussage.
function _ffPodest(b){
  const pm = pmap(), r = (b.r || []).filter(x => pm[x.p]);
  if(!r.length) return '';
  const folge = r.length >= 3 ? [1, 0, 2] : r.length === 2 ? [1, 0] : [0];
  return `<div class="ff-pd">` + folge.map(k => `<span class="ff-pd-s p${k + 1}" style="--k:${k}">`
    + (b.ins ? avHtml(pm[r[k].p], '', {ins:true, px:48, feuer:0}) : _ffChip(r[k].p))
    + `${_ffNm(r[k].p)}<em><b class="num">${esc(String(r[k].t))}</b><small class="num">${k + 1}</small></em></span>`).join('') + `</div>`;
}

// ── Die Sammlung: jeder Titel ein Feld ──────────────────────────────────
// Eine Anzahl ist keine Quote: sie wächst mit jedem Titel, und genau das
// zeigt die Reihe — siebzehn Felder sind siebzehn Tage.
function _ffSammlung(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  return r.map((x, k) => {
    const n = Math.max(0, x.n | 0), z = Math.min(n, 30);
    return `<div class="ff-sm${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}<span class="ff-r-m">${_ffNm(x.p)}`
      + `<span class="ff-zl">${'<i class="w"></i>'.repeat(z)}${n > z ? '<i class="mehr"></i>' : ''}</span></span>`
      + `<b class="num">${esc(String(x.t))}</b></div>`;
  }).join('');
}

// ── Die Sterne: Meistertitel wie am Zeichen [§C26] ─────────────────────
// Höchstens fünf, dann die Zahl — dieselbe Regel wie unter dem Wappen.
function _ffSterne(b){
  const r = (b.r || []).filter(x => pmap()[x.p]);
  if(!r.length) return '';
  const stern = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7z"/></svg>';
  return r.map((x, k) => {
    const n = Math.max(0, x.n | 0);
    return `<div class="ff-sn${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x.p)}${_ffNm(x.p)}`
      + `<span class="ff-sn-s">${stern.repeat(Math.min(5, n))}${n > 5 ? `<b class="num">${n}</b>` : ''}</span></div>`;
  }).join('');
}

// ── Das Zählwerk einer Summe: die Ziffern des Ersten, der Zweite dahinter
function _ffZahl(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const z = b.zweiter && pm[b.zweiter.p] ? b.zweiter : null;
  return `<div class="ff-zw"><span class="ff-zw-z">${String(b.n | 0).split('').map((c, i) => `<i class="num" style="--k:${i}">${c}</i>`).join('')}</span>`
    + `<span class="ff-zw-m"><span class="ff-zw-p">${_ffChip(b.p)}${_ffNm(b.p)}</span>`
    + (z ? `<small class="num">+${(b.n | 0) - (z.n | 0)} vor <b>${esc(_spName(z.p))}</b> mit ${z.n | 0}</small>` : '') + `</span></div>`;
}

// ── Das Tauziehen zweier Spieler ────────────────────────────────────────
function _ffDuell(b){
  const pm = pmap();
  if(!pm[b.a] || !pm[b.b]) return '';
  const n = (b.wa | 0) + (b.wb | 0);
  const pa = n ? Math.round((b.wa | 0) / n * 100) : 50;
  return `<div class="ff-dl"><span class="ff-dl-s${b.wa >= b.wb ? ' vorn' : ''}">${_ffChip(b.a)}<b class="num">${b.wa | 0}</b></span>`
    + `<span class="ff-dl-bar"><i style="width:${pa}%"></i></span>`
    + `<span class="ff-dl-s re${b.wb > b.wa ? ' vorn' : ''}"><b class="num">${b.wb | 0}</b>${_ffChip(b.b)}</span></div>`
    + `<div class="ff-dl-n">${_ffNm(b.a)}<small class="num">${n} Duelle</small>${_ffNm(b.b)}</div>`;
}

// ── Ein Duo: zwei Gesichter, darunter jede gemeinsame Partie oder der Lauf
function _ffDuo(b){
  const pm = pmap();
  if(!pm[b.a] || !pm[b.b]) return '';
  let zellen = '', zahl = '';
  if(b.g){
    const g = Math.min(40, b.g | 0), w = Math.round((b.w | 0) / (b.g | 0) * g);
    zellen = Array.from({length:g}, (_, i) => `<i class="${i < w ? 'w' : ''}"></i>`).join('');
    zahl = `${b.w | 0} von ${b.g | 0}`;
  } else if(b.lauf){
    const best = Math.max(b.lauf | 0, b.best | 0), zeig = Math.min(20, best);
    zellen = Array.from({length:zeig}, (_, i) => `<i class="${i < Math.min(zeig, b.lauf | 0) ? 'w' : 'ziel'}"></i>`).join('');
    zahl = (b.lauf | 0) >= best ? `${b.lauf | 0} in Serie` : `${b.lauf | 0} von ${best}`;
  }
  return `<div class="ff-duo"><span class="ff-duo-k">${_ffChip(b.a)}${_ffChip(b.b)}</span>`
    + `<span class="ff-duo-m"><span class="ff-duo-n">${_ffNm(b.a)}<i>und</i>${_ffNm(b.b)}</span>`
    + `<span class="ff-zl">${zellen}</span></span><b class="num">${esc(zahl)}</b></div>`;
}

// ── Die Pause: ein Feld je Tag seit der letzten Partie ──────────────────
// Die letzte Partie hell, die Tage danach leer, und wo die längste Pause der
// Liga endete, eine Marke — so sieht man, ob es knapp wird.
function _ffPause(d){
  const n = Math.max(0, d.daysSince | 0), rek = Math.max(0, d.maxGapDays | 0);
  if(!n) return '';
  const len = Math.min(28, Math.max(n, rek) + 1);
  const zellen = Array.from({length:len}, (_, i) => i === 0 ? '<i class="sp"></i>'
    : `<i class="${i <= n ? 'still' : ''}${i === rek && rek < len ? ' pz-max' : ''}"></i>`).join('');
  return `<div class="ff ff-pause"><span class="ff-zl">${zellen}</span>`
    + `<div class="ff-pz-l"><span>letzte Partie</span>`
    + (rek && rek !== n ? `<span>längste Pause: <b class="num">${rek}</b> Tage</span>` : '') + `</div></div>`;
}

// ── Die Vitrine: jede Auszeichnung des Katalogs als Feld ────────────────
// Neue Karten zählen jedes Mal (`gesamt`, je Auszeichnung `n`): ein Feld
// leuchtet so stark, wie oft sie geholt wurde, und die große Zahl ist die
// Summe. Gespeicherte Karten ohne `gesamt` zeigen weiter „41 von 50".
function _ffVitrine(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const hat = new Set(b.hat || []), n = b.n || {};
  const kat = b.gold ? BADGES.filter(x => rarityOf(x.id) === 'legendary') : BADGES;
  const max = Math.max(1, ...kat.map(x => Number(n[x.id]) || 0));
  const st = x => b.gesamt && hat.has(x.id)
    ? ` style="--a:${(0.45 + 0.55 * Math.log1p(Number(n[x.id]) || 1) / Math.log1p(max)).toFixed(2)}"` : '';
  const felder = kat.map(x => `<i class="${hat.has(x.id) ? 'hat ' + rarityOf(x.id) : ''}"${st(x)}>${svgI(x.ic || 'trophy')}</i>`).join('');
  const zahl = b.gesamt ? `${_spZahl(b.gesamt)}<small> geholt</small>` : `${hat.size}<small> von ${kat.length}</small>`;
  return `<div class="ff-vt-k">${_ffChip(b.p)}${_ffNm(b.p)}<b class="num">${zahl}</b></div>`
    + `<span class="ff-vt${b.gold ? ' gold' : ''}">${felder}</span>`;
}

// ── Die Medaille: die zuletzt vergebene goldene Auszeichnung ────────────
function _ffMedaille(b){
  const pm = pmap(), x = BADGES.find(y => y.id === b.b);
  if(!pm[b.p] || !x) return '';
  const alle = Object.keys(pm).filter(id => sichtbar(pm[id])).length;
  const n = Math.max(1, Math.min(alle, b.n | 0));
  return `<div class="ff-md"><span class="ff-md-z">${zkHtml(x.ic || 'trophyStar', 'g', 'viol')}${_ffChip(b.p)}</span>`
    + `<span class="ff-md-m"><b>${esc(x.name)}</b>${_ffNm(b.p)}`
    + `<span class="ff-pk">${Array.from({length:alle}, (_, i) => `<i class="${i < n ? 'hat' : ''}"></i>`).join('')}</span>`
    + `<small class="num">${n} von ${alle} tragen sie</small></span></div>`;
}

// ── Die Stufe: das Zeichen von jetzt, der Weg, das nächste ──────────────
function _ffStufe(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const rang = (getPlayerRank(b.p) || {}).label;
  const z = k => { try { return insigniumStufeSvg(k, rang, 0, {bild:true}) || ''; } catch(e){ return ''; } };
  const sp = Math.max(1, (b.nachMin | 0) - (b.vonMin | 0));
  const anteil = Math.max(0, Math.min(1, ((b.punkte | 0) - (b.vonMin | 0)) / sp));
  const name = k => ((INSIGNIEN.find(x => x.key === k) || {}).name || '');
  return `<div class="ff-st"><span class="ff-st-z">${z(b.von)}<small>${esc(name(b.von))}</small></span>`
    + `<span class="ff-st-m">${_ffNm(b.p)}<span class="ff-bar"><i style="width:${(anteil * 100).toFixed(1)}%"></i></span>`
    + `<small class="num">${b.punkte | 0} von ${b.nachMin | 0}</small></span>`
    + `<span class="ff-st-z naechst">${z(b.nach)}<small>${esc(name(b.nach))}</small></span></div>`;
}

// ── Das Ziel: der eigene Stand gegen den Bestwert ───────────────────────
function _ffZiel(b){
  const pm = pmap();
  if(!pm[b.p]) return '';
  const halter = (b.halter || []).filter(id => pm[id]);
  return `<div class="ff-zi">${zkHtml(b.ic || 'trophy', '', '')}<span class="ff-zi-m">`
    + `<span class="ff-zi-r">${_ffChip(b.p)}${_ffNm(b.p)}<b class="num">${esc(b.mein || '')}</b><span class="ff-bar"><i style="width:${_ffPct(b.nah)}%"></i></span></span>`
    + (halter.length ? `<span class="ff-zi-r halter"><span class="sp-chips">${halter.map(_ffChip).join('')}</span><span class="ff-nms">${halter.map(_ffNm).join('')}</span>`
      + `<b class="num">${esc(b.stand || '')}</b><span class="ff-bar"><i style="width:100%"></i></span></span>` : '')
    + `</span></div>`;
}

// ── Die Rollen: Sturm links, Abwehr rechts, um eine gemeinsame Mitte ────
function _ffRolle(b){
  if(!pmap()[b.p]) return '';
  const s = Math.max(0, Math.min(100, b.s | 0)), a = Math.max(0, Math.min(100, b.a | 0));
  const stark = Math.abs(s - a) < 10 ? '' : s > a ? 's' : 'a';
  return `<div class="ff-rl-k">${_ffChip(b.p)}${_ffNm(b.p)}</div>`
    + `<div class="ff-rl${stark ? ' st-' + stark : ''}"><span class="ff-rl-l"><b class="num">${s} %</b><small>Sturm · ${b.gs | 0} Partien</small></span>`
    + `<span class="ff-rl-b"><span><i class="s" style="width:${s}%"></i></span><span><i class="a" style="width:${a}%"></i></span></span>`
    + `<span class="ff-rl-r"><b class="num">${a} %</b><small>Abwehr · ${b.ga | 0} Partien</small></span></div>`;
}

// ── Die Verteilung der Ergebnisse 10:0 bis 10:9 ─────────────────────────
function _ffVerteilung(b){
  const je = (b.je || []).map(x => x | 0);
  if(je.length !== 10) return '';
  const max = Math.max(1, ...je), hl = new Set(b.hl || []);
  return `<span class="ff-vs">${je.map((n, i) => `<span class="${hl.has(i) ? 'hl' : ''}" style="--k:${i}">`
    + `<b class="num">${n}</b><em><i style="height:${Math.max(n ? 4 : 0, n / max * 100).toFixed(1)}%"></i></em><small class="num">:${i}</small></span>`).join('')}</span>`;
}

// ── Säulen der Spieltage oder Wochen, die gemeinte hervorgehoben ─────────
function _ffSaeulen(b){
  const v = (b.v || []).map(x => x | 0);
  if(v.length < 2) return '';
  const max = Math.max(1, ...v), hl = new Set(b.hl || []);
  return `<span class="ff-sa${b.still ? ' still' : ''}">${v.map((n, i) => `<i class="${hl.has(i) ? 'hl' : ''}" style="height:${Math.max(6, n / max * 100).toFixed(1)}%;--k:${i}"></i>`).join('')}</span>`
    + `<div class="ff-sa-l"><span>${esc(b.l || '')}</span><span>die letzten ${v.length}</span></div>`;
}

// ── Der Platz im Feld: ein Punkt je Spieler, das eigene Gesicht an seinem
function _ffPlatz(b){
  if(!pmap()[b.p]) return '';
  const von = Math.max(1, Math.min(30, b.von | 0)), pl = Math.max(1, Math.min(von, b.platz | 0));
  return `<div class="ff-pl">${Array.from({length:von}, (_, i) => i + 1 === pl
      ? `<span class="ich">${_ffChip(b.p)}</span>` : `<i class="${i + 1 < pl ? 'vor' : ''}"></i>`).join('')}</div>`
    + `<div class="ff-pl-l">${_ffNm(b.p)}<span><b class="num">Platz ${pl}</b> von ${von}${b.t ? ' · ' + esc(b.t) : ''}</span></div>`;
}

// ── Die Tafel des Monats: jeder Eintrag ein Feld, die Träger daneben ────
function _ffTafel(b){
  const alle = Math.max(1, b.alle | 0), voll = Math.max(0, Math.min(alle, b.voll | 0));
  const tr = (b.traeger || []).filter(x => pmap()[x[0]]);
  return `<div class="ff-tf"><span class="ff-zl dicht">${Array.from({length:alle}, (_, i) => `<i class="${i < voll ? 'w' : ''}"></i>`).join('')}</span>`
    + `<span class="ff-tf-l"><b class="num">${voll}</b><small>von ${alle} vergeben</small></span></div>`
    + (tr.length ? `<div class="ff-tf-t">${tr.map(x => `<span>${_ffChip(x[0])}${_ffNm(x[0])}<b class="num">${x[1]}</b></span>`).join('')}</div>` : '');
}

// ── Die Halbzeit: Sturm und Abwehr des Monats nebeneinander ────────────
// Je Position die drei mit der besten Siegquote im Monat, dieselbe Zeile
// wie das Rennen [§C27]: Gesicht, Name, Balken der Quote, die Quote. Der
// Erste jeder Seite in der Farbe der Karte.
function _ffHalbzeit(b){
  const seite = (l, ic, wort) => {
    const z = (l || []).filter(x => pmap()[x[0]]);
    if(!z.length) return '';
    return `<div class="ff-hz-s"><div class="ff-hz-k">${svgI(ic)}<b>${wort}</b></div>`
      + z.map((x, k) => { const q = x[2] ? Math.round(x[1] / x[2] * 100) : 0;
        return `<div class="ff-r${k === 0 ? ' eins' : ''}" style="--k:${k}">${_ffChip(x[0])}`
          + `<span class="ff-r-m">${_ffNm(x[0])}<span class="ff-bar"><i style="width:${q}%"></i></span></span>`
          + `<b class="num">${q}\u00a0%</b></div>`; }).join('') + `</div>`;
  };
  const s = seite(b.sturm, 'bolt', 'Sturm'), a = seite(b.abwehr, 'shield', 'Abwehr');
  return s && a ? `<div class="ff-hz">${s}${a}</div>` : '';
}

// ── Das Zählwerk: die runde Partie, wer sie gewonnen hat ───────────────
function _ffZaehler(b){
  const ziffern = String(b.n | 0).split('').map((z, i) => `<i class="num" style="--k:${i}">${z}</i>`).join('');
  const s = (b.sieger || []).filter(id => pmap()[id]);
  return `<div class="ff-zw"><span class="ff-zw-z">${ziffern}</span><span class="ff-zw-m">`
    + (s.length ? `<span class="sp-chips">${s.map(_ffChip).join('')}</span><span>${s.map(_ffNm).join('<i>und</i>')}</span>` : '')
    + (b.stand ? `<b class="num">${esc(b.stand)}</b>` : '') + `</span></div>`;
}

// ── Die laufende Serie: derselbe Lauf wie auf der Karte einer Serie [§C27]
function _ffLauf(b){
  if(!pmap()[b.p]) return '';
  return `<div class="ff-lf">${_ffChip(b.p)}${_ffNm(b.p)}</div>${_newsSerienBand(b.n | 0, false, true)}`;
}

// ── Die Zeichner ─────────────────────────────────────────────────────
// Die Formen oben zeichnen Karten aus der Zeit, als ein Fun Fact einen
// Stand nannte (Podest, Rennen, Strichliste, Vitrine …). Keine Vorlage
// erzeugt sie mehr, aber gespeicherte Karten tragen sie als Snapshot
// [§C33], und ohne ihren Zeichner stünden sie leer im Feed. Die acht
// Formen der Fragen [28-news-ambient] stehen hier in der Tabelle selbst:
// sie teilen sich ein paar Helfer, die sonst auf der obersten Ebene neben
// den Bezeichnern der ganzen App lägen.
const _FF_FORM = (() => {
  const pm = () => pmap();
  // Ein Gesicht trägt seinen Spieler, damit es im Blatt das Profil öffnet
  // wie jedes andere Gesicht dort [§C33].
  const mitPid = (html, pid) => String(html || '').replace(/^<(\w+) /, `<$1 data-pid="${esc(pid)}" `);
  const chip = pid => mitPid(_ffChip(pid), pid);
  // Eine Zahl ab fünf Stellen mit Tausenderpunkt, darunter ohne [§C27]: das
  // Bild steht neben einem Satz, der „1301 Tore" schreibt.
  const zahl = n => tausender(String(Math.round(Number(n) || 0)));
  const vz = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + String(Math.abs(n)).replace('.', ',');
  const prozent = (x, von) => Math.max(0, Math.min(100, von > 0 ? x / von * 100 : 0)).toFixed(1);
  // Das Gesicht als Wappen ab 48 px, darunter als Gesicht [allgemein].
  const gesicht = (pid, px) => px >= 48 ? mitPid(avHtml(pm()[pid], '', {ins:true, px, feuer:0}), pid)
    : `<span class="ff-av" style="--av:${px}px">${chip(pid)}</span>`;

  // ── Der Aufwind: die Kurve der Elo über acht Wochen ───────────────
  // Die Kurve ist `_spLinie` [§C27] mit der Bezugslinie am Beginn der
  // vierzehn Tage. Die Wochen davor stehen in Metall, die vierzehn Tage
  // darüber in Grün, mit ihrer Fläche bis zur Bezugslinie: Grün zeigt hier
  // die Richtung [§C25]. Mit `zwei` stand jeder Abschnitt unter der
  // Bezugslinie rot da, auch der Anstieg davor — ein Plus von 215 las sich
  // als Absturz. Das Gesicht sitzt dort, wo die Linie endet; Lage und
  // Punkte nimmt der Zeichner aus seiner eigenen Zeichnung, damit beides
  // nie auseinanderläuft.
  const aufwind = b => {
    const v = (b.v || []).map(Number);
    if(!pm()[b.p] || v.length < 3) return '';
    const n = v.length - 1, k = Math.max(0, Math.min(n - 1, b.k | 0));
    let svg = _spLinie(v, {ref:v[k], fmt:_spVz, ende:'', x:b.x || []});
    const p = /<circle class="sp-ln-p[^"]*" cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
    const linie = /<path class="sp-ln-l" d="([^"]+)"/.exec(svg);
    const ref = /<line class="sp-ln-r"[^>]* y1="([\d.]+)"/.exec(svg);
    if(linie && ref){
      const pkt = linie[1].slice(1).split('L').map(t => t.trim().split(/\s+/).map(Number)).slice(k);
      const yr = Number(ref[1]), d = 'M' + pkt.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L');
      const fl = `${d}L${pkt[pkt.length - 1][0].toFixed(1)} ${yr.toFixed(1)}L${pkt[0][0].toFixed(1)} ${yr.toFixed(1)}Z`;
      svg = svg.replace(/(<circle class="sp-ln-p)/, `<path class="ff-af-fl" d="${fl}"/><path class="ff-af-hl" d="${d}"/>$1`);
    }
    const face = p ? `<span class="ff-af-p" style="left:${(Number(p[1]) / 244 * 100).toFixed(2)}%;top:${(Number(p[2]) / 80 * 100).toFixed(2)}%">${chip(b.p)}</span>` : '';
    // Kein „+124 · Elo in 14 Tagen" im Kopf: die Zahl steht im Titel, und
    // die Kurve zeigt sie als Höhe über der Bezugslinie.
    return `<div class="ff-af-k">${_ffNm(b.p)}<span class="ff-leg"><span class="g">zuletzt</span><span class="m">davor</span></span></div>`
      + `<div class="sp-ln metall ff-af"><div class="ff-af-l">${svg}${face}</div></div>`;
  };

  // ── Über der Erwartung: geholte Siege gegen die erwarteten ─────────
  // Je Spieler eine Bahn so lang wie seine Partien: der Balken die Siege,
  // der Strich die Erwartung. Der Abstand zwischen beiden ist die Aussage,
  // die Zahl rechts nennt ihn. Die Farbe der Karte trägt die Zeile dessen,
  // von dem die Karte handelt (`hell`), nicht zwingend die erste.
  const erwartung = b => {
    const r = (b.z || []).filter(x => pm()[x.p] && x.g > 0);
    if(!r.length) return '';
    return r.map((x, i) => `<div class="ff-ew-z${x.hell ? ' eins' : ''}" style="--k:${i}">${chip(x.p)}`
      + `<span class="ff-r-m">${_ffNm(x.p)}<span class="ff-ew-b"><i style="width:${prozent(x.w, x.g)}%"></i>`
      + `<u style="left:${prozent(x.e, x.g)}%"></u></span></span>`
      // Rechts die Siege aus den Partien; den Abstand zur Erwartung zeigt
      // die Bahn, und für den Genannten nennt ihn der Titel.
      + `<span class="ff-ew-w"><b class="num">${x.w | 0}</b><small class="num">von ${x.g | 0}</small></span></div>`).join('')
      + `<div class="ff-leg"><span class="g">Siege</span><span class="e">erwartet</span></div>`;
  };

  // ── Form gegen Laufbahn: die Hantel ────────────────────────────────
  // Links der Punkt der Laufbahn davor, rechts der der vierzehn Tage, die
  // Stange dazwischen ist der Sprung. Eine Achse für alle, 0 bis 100 %,
  // sonst sähe ein Sprung von 40 auf 53 so groß aus wie einer von 60 auf 89.
  const hantel = b => {
    const r = (b.z || []).filter(x => pm()[x.p]);
    if(!r.length) return '';
    return r.map((x, i) => {
      const lo = Math.min(x.v, x.j), hi = Math.max(x.v, x.j);
      return `<div class="ff-ht-z${x.hell ? ' eins' : ''}" style="--k:${i}">${chip(x.p)}`
        + `<span class="ff-r-m">${_ffNm(x.p)}<span class="ff-ht-b"><s style="left:${lo}%;width:${hi - lo}%"></s>`
        + `<i class="v" style="left:${x.v}%"></i><i class="j" style="left:${x.j}%"></i></span></span>`
        // Rechts der Sprung; die Quote der vierzehn Tage steht im Titel und
        // als Punkt auf der Achse.
        + `<span class="ff-ew-w"><b class="num">${esc(vz(x.j - x.v))}</b></span></div>`;
    }).join('') + `<div class="ff-ht-z ax" aria-hidden="true"><span></span><span class="ff-ht-b">`
      + `<em style="left:0">0</em><em style="left:50%">50</em><em style="left:100%">100\u00a0%</em></span><span></span></div>`
      + `<div class="ff-leg"><span class="v">Laufbahn davor</span><span class="j">14 Tage</span></div>`;
  };

  // ── Eine Marke in Sicht: der Ring von der letzten runden Zahl zur nächsten
  const MARKE_WORT = {siege:['Sieg', 'Siege', 'zum'], partien:['Partie', 'Partien', 'zur'], tore:['Tor', 'Tore', 'zum']};
  const marke = b => {
    if(!pm()[b.p]) return '';
    const sp = Math.max(1, (b.ziel | 0) - (b.vorher | 0)), q = Math.max(0, Math.min(1, ((b.ist | 0) - (b.vorher | 0)) / sp));
    const R = 33, U = 2 * Math.PI * R;
    const ring = `<svg viewBox="0 0 80 80" aria-hidden="true"><circle class="ff-mk-t" cx="40" cy="40" r="${R}"/>`
      + `<circle class="ff-mk-f" cx="40" cy="40" r="${R}" stroke-dasharray="${(U * q).toFixed(1)} ${U.toFixed(1)}" transform="rotate(-90 40 40)"/>`
      // Die Marke selbst: ein Strich oben, wo der Ring sich schließt.
      + `<line class="ff-mk-ziel" x1="40" y1="${40 - R - 5}" x2="40" y2="${40 - R + 5}"/></svg>`;
    const pr = b.art === 'prestige';
    const w = MARKE_WORT[b.art] || ['', '', ''];
    let neben = '';
    if(pr && b.stufe){
      const rang = (getPlayerRank(b.p) || {}).label;
      try { neben = `<span class="ff-mk-z">${insigniumStufeSvg(b.stufe, rang, 0, {bild:true}) || ''}</span>`; } catch(e){ neben = ''; }
    }
    // Rest und Ziel stehen im Titel; das Bild zeigt den Stand und das Tempo
    // der vierzehn Tage (`z14`), der Ring den Weg von der letzten Marke.
    // Gespeicherte Karten ohne `z14` zeigen nur den Stand.
    return `<div class="ff-mk"><span class="ff-mk-r${pr ? ' ins' : ''}">${ring}<span class="ff-mk-g">${gesicht(b.p, pr ? 48 : 40)}</span></span>`
      + `<span class="ff-mk-m">${_ffNm(b.p)}<span class="ff-mk-n"><b class="num">${zahl(b.ist)}</b>`
      + `<em>${esc(pr ? 'Prestige' : w[1])}</em></span>`
      // Ist das Tempo so groß wie der Rest des Titels, steht es nicht da:
      // „fehlen 4 Partien" über „+4 in 14 Tagen".
      + (b.z14 > 0 && b.z14 !== (b.rest | 0) ? `<small class="num">+${zahl(b.z14)} in 14 Tagen</small>` : '') + `</span>${neben}</div>`;
  };

  // ── Die Chronik einer Laufbahn: die Monatsreihe als Zellen ─────────
  // Dieselbe Zelle wie in der Matrix der Chronik [§C27]: Farbe und Gewicht
  // der Stufe, das Zeichen des Eintrags, der laufende Monat gestrichelt.
  // Ein Strich heißt gewertet ohne Eintrag, ein leeres Feld nicht gewertet.
  const chronik = b => {
    const z = (b.z || []);
    if(!pm()[b.p] || !z.length) return '';
    const zellen = z.map((c, i) => {
      const [sid, kl, ic, kurz, offen] = c;
      const mon = `<small>${esc(String(seasonLabel(sid)).split(' ')[0].slice(0, 3))}</small>`;
      if(kl == null) return `<span class="ff-cr-c" style="--k:${i}"><span class="ff-cr-leer"></span>${mon}</span>`;
      if(!kl) return `<span class="ff-cr-c" style="--k:${i}"><span class="ff-cr-leer gewertet"><span class="lc-dash">—</span></span>${mon}</span>`;
      const t = titleTone(CHRONIK_STUFE_TON[kl] || 'silver');
      return `<span class="ff-cr-c" style="--k:${i}"><span class="lc-cell${offen ? ' live' : ''}" data-kl="${esc(kl)}" style="--tt:${t.c};--ttr:${t.rgb};--k:${i}">`
        + `<span class="i">${svgI(ic || 'trophy')}</span><span class="n">${esc(kurz || '')}</span></span>${mon}</span>`;
    }).join('');
    // Wie viele Monate in Folge, sagt der Titel; die Zellen zeigen sie.
    return `<div class="ff-cr-k">${chip(b.p)}${_ffNm(b.p)}</div>`
      + `<div class="ff-cr" style="--n:${z.length}">${zellen}</div>`;
  };

  // ── Die Chemie eines Duos: zwei Gesichter und ihr Bogen ───────────
  // Der Bogen ist die Linie aus dem Netz der Duos [§C27], gefärbt wie
  // dort: Grün, wo mehr gewonnen wurde als erwartet. Die Zahl sind die
  // Siege mehr als nach Elo erwartet: „+6 über der Erwartung" in
  // Prozentpunkten las niemand. Gespeicherte Karten tragen Siege und
  // Erwartung (`w`, `e`) und zeigen dieselbe Zahl.
  // Darunter die Bahn der Erwartung, wie bei „mehr Siege als erwartet":
  // der Balken die Siege, der Strich die Erwartung. Hier stand ein zweites
  // Duo mit seinen Partien („Julian und Henry · 18 Partien"); was es mit
  // der Karte zu tun hatte, sagte nichts, und eine Karte über ein Duo
  // zeigte zwei.
  const chemie = b => {
    if(!pm()[b.a] || !pm()[b.b]) return '';
    const dick = (1.6 + Math.min(1, (b.g | 0) / 60) * 4.4).toFixed(1);
    const mehr = b.m != null ? b.m : Math.round((b.w | 0) - (Number(b.e) || 0));
    return `<div class="ff-cm"><span class="ff-cm-p">${gesicht(b.a, 36)}${_ffNm(b.a)}</span>`
      + `<span class="ff-cm-m"><svg viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><path class="netz-l w" d="M4 32Q60 -8 116 32" stroke-width="${dick}"/></svg>`
      // Unter dem Bogen die gemeinsamen Partien; wie viele Siege mehr, sagt
      // der Titel, und die Bahn zeigt es als Abstand zwischen Balken und
      // Strich. Gespeicherte Karten ohne `g` tragen die Zahl im Bogen.
      + (b.g > 0 ? `<b class="num">${b.g | 0}</b><small>Partien zusammen</small>` : `<b class="num">${esc(vz(mehr | 0))}</b><small>Siege mehr</small>`) + `</span>`
      + `<span class="ff-cm-p">${gesicht(b.b, 36)}${_ffNm(b.b)}</span></div>`
      + (b.g > 0 ? `<div class="ff-cm-ew"><span class="ff-ew-b"><i style="width:${prozent(b.w | 0, b.g)}%"></i>`
        + `<u style="left:${prozent(Number(b.e) || 0, b.g)}%"></u></span></div>`
        + `<div class="ff-leg"><span class="g">Siege</span><span class="e">erwartet</span></div>` : '');
  };

  // ── Die Rolle: ein Ausschnitt der Rollen-Landkarte ─────────────────
  // Dieselbe Karte wie über der Positions-Rangliste [§C44]: waagerecht der
  // Anteil im Sturm, senkrecht, wo die Leistung gegen den eigenen Schnitt
  // besser ist, die beiden passenden Felder getönt. Hier steht nur der eine
  // Spieler darin; beim Wechsel zeigt ein Pfeil, woher er kommt.
  const landkarte = b => {
    if(!pm()[b.p]) return '';
    const W = 300, H = 120, MX = W / 2, MY = H / 2, s = Math.max(.10, Number(b.s) || .10);
    const X = a => 24 + Math.max(0, Math.min(1, a)) * (W - 48);
    const Y = d => MY - Math.max(-1, Math.min(1, d / s)) * (MY - 22);
    const x = X(b.a), y = Y(b.d), x0 = b.a0 == null ? null : X(b.a0);
    const pfeil = x0 == null ? '' : `<line class="ff-lk-w" x1="${x0.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + (x0 < x ? -16 : 16)).toFixed(1)}" y2="${y.toFixed(1)}"/>`
      + `<circle class="ff-lk-v" cx="${x0.toFixed(1)}" cy="${y.toFixed(1)}" r="6"/>`;
    // Die Felder stehen auf der Seite, auf der das Gesicht nicht steht:
    // links lag „in der Abwehr stärker" unter dem Namen dessen, der meist in
    // der Abwehr spielt.
    return `<div class="ff-lk${x < MX ? ' re' : ''}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`
      + `<rect class="rk-q" x="${MX}" y="0" width="${MX}" height="${MY}"/><rect class="rk-q" x="0" y="${MY}" width="${MX}" height="${MY}"/>`
      + `<line class="rk-m" x1="${MX}" x2="${MX}" y1="0" y2="${H}"/><line class="rk-m" x1="0" x2="${W}" y1="${MY}" y2="${MY}"/>`
      + `<rect class="rk-a" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="8"/>${pfeil}</svg>`
      + `<span class="ff-lk-f o">im Sturm stärker</span><span class="ff-lk-f u">in der Abwehr stärker</span>`
      + `<span class="rk-p" data-pid="${esc(b.p)}" style="left:${(x / W * 100).toFixed(2)}%;top:${(y / H * 100).toFixed(2)}%;--r:13px">${rcpAvHtml(b.p, 26, {})}<b>${esc(_spName(b.p))}</b></span></div>`
      + `<div class="rk-ax"><span>← meist in der Abwehr</span><span>meist im Sturm →</span></div>`;
  };

  // ── Die Liga in Zahlen: die Marke auf Klappziffern, die Monate als Säulen
  // Die Klappziffern sind die des Zählwerks [§C27]; die Säule des Monats,
  // in dem die Marke fiel, trägt die Farbe der Karte, die übrigen Metall.
  const liga = b => {
    const m = (b.m || []).map(x => [String(x[0] || ''), Math.max(0, Number(x[1]) || 0)]);
    if(!(b.n > 0) || !m.length) return '';
    const max = Math.max(1, ...m.map(x => x[1]));
    const s = (b.sieger || []).filter(id => pm()[id]);
    // Die Marke steht im Titel; die Klappziffern zeigten sie ein zweites
    // Mal. Oben steht jetzt die Partie, die sie riss: Sieger, Stand, Tag.
    const mm = b.mid ? (matches || []).find(x => x.id === b.mid) : null;
    const tag = b.tag || (mm ? datumFmt(mm.created_at, 'tmx') : '');
    return `<div class="ff-lg-k">${s.length ? `<span class="sp-chips">${s.map(chip).join('')}</span><span class="ff-lg-n">${s.map(_ffNm).join('<i>und</i>')}</span>` : ''}`
      + `<span class="ff-lg-p">${b.stand ? `<b class="num">${esc(b.stand)}</b>` : ''}${tag ? `<small class="num">${esc(tag)}</small>` : ''}</span></div>`
      + `<div class="ff-mo">${m.map((x, i) => `<span class="${i === b.hl ? 'hl' : ''}" style="--k:${i}"><b class="num">${zahl(x[1])}</b>`
        + `<em><i style="height:${Math.max(4, x[1] / max * 100).toFixed(1)}%"></i></em><small>${esc(x[0])}</small></span>`).join('')}</div>`
      + `<div class="ff-leg"><span>${b.art === 'tore' ? 'Tore' : 'Partien'} je Monat</span></div>`;
  };

  // ══ Die Bilder der zweiten Runde [28-news-ambient] ════════════════════
  // Wie die acht davor: Metall, die Farbe der Karte (`--story`) an dem,
  // worum es geht, Gold nur am Titel, Grün und Rot nur für eine Richtung
  // [§C25]. Ein Name steht unter oder neben jedem Gesicht [§C33].

  // Ein Podest mit Wert und Unterzeile, Platz zwei, eins, drei; die Höhe ist
  // der Platz [§C27]. `ins` trägt das Wappen, `u` je Stufe eine Zeile unter
  // dem Sockel (der Platz vor vierzehn Tagen, der Platz von jetzt).
  const podest = (l, o) => {
    const r = (l || []).filter(x => pm()[x.p]).slice(0, 3);
    if(!r.length) return '';
    const hl = new Set(o.hl || []);
    const folge = r.length >= 3 ? [1, 0, 2] : r.length === 2 ? [1, 0] : [0];
    return `<div class="ff-pd ff-pd2">` + folge.map(k => { const x = r[k];
      return `<span class="ff-pd-s p${k + 1}${hl.has(x.p) ? ' hl' : ''}" style="--k:${k}">`
        + (o.ins ? gesicht(x.p, 48) : `<span class="ff-av" style="--av:${k ? 30 : 36}px">${chip(x.p)}</span>`)
        + `${_ffNm(x.p)}<em><b class="num">${esc(String(x.t))}</b>${o.ohnePlatz ? '' : `<small class="num">${k + 1}</small>`}</em>`
        + (o.u ? `<i class="ff-pd-u">${o.u(x, k)}</i>` : '') + `</span>`; }).join('') + `</div>`;
  };
  const bewegung = (jetzt, vorher) => !vorher ? `<i class="ff-bw neu">neu</i>`
    : vorher > jetzt ? `<i class="ff-bw auf">▲${vorher - jetzt}</i>`
    : vorher < jetzt ? `<i class="ff-bw ab">▼${jetzt - vorher}</i>` : `<i class="ff-bw">–</i>`;

  // ── Die Tabelle des Monats mit der Bewegung seit der Vorwoche ─────
  // Platz, Gesicht, Name, Elo, und wie viele Plätze es in sieben Tagen
  // waren. Die Zeilen, um die es geht, in der Farbe der Karte.
  const tabelle = b => {
    const z = (b.z || []).filter(x => pm()[x[0]]);
    if(z.length < 3) return '';
    const hl = new Set(b.hl || []);
    return `<div class="ff-tb">` + z.map((x, i) => `<div class="ff-tb-z${hl.has(x[0]) ? ' hl' : ''}" style="--k:${i}">`
      + `<b class="num ff-tb-p">${i + 1}</b>${chip(x[0])}${_ffNm(x[0])}`
      + `<span class="ff-tb-e num">${zahl(x[1])}<small> Elo</small></span>${bewegung(i + 1, x[2])}</div>`).join('')
      + `</div><div class="ff-leg"><span>Bewegung seit dem ${esc(b.seit || '')}</span></div>`;
  };

  // ── Die Ewige Tafel: das Podest der Karriere-Elo mit Wappen ───────
  // Unter jeder Stufe die Bewegung in vierzehn Tagen, wie in der Tabelle
  // des Monats; hat sich oben nichts bewegt, steht keine.
  const mitBewegung = (b, o) => {
    const l = (b.pd || []).slice(0, 3), still = l.every((x, k) => x.v === k + 1);
    const h = podest(b.pd, Object.assign({hl:b.hl}, o, still ? {} : {u:(x, k) => bewegung(k + 1, x.v)}));
    return h && !still ? h + `<div class="ff-leg"><span>Bewegung in 14 Tagen</span></div>` : h;
  };
  const karriere = b => mitBewegung(b, {ins:true});

  // ── Die Aufholjagd: zwei Bahnen auf einer gezoomten Achse ──────────
  // Bei 300 gegen 290 Partien wären zwei volle Balken gleich lang. Die
  // Achse beginnt deshalb knapp unter dem kleinsten der vier Stände, und
  // der Strich auf jeder Bahn ist der Stand vor dreißig Tagen.
  const AUF_WORT = {siege:'Siege', partien:'Partien', tore:'Tore'};
  const aufholjagd = b => {
    const z = (b.z || []).filter(x => pm()[x[0]]);
    if(z.length !== 2) return '';
    const werte = z.flatMap(x => [x[1], x[2]]), lo0 = Math.min(...werte), hi = Math.max(...werte);
    const lo = Math.max(0, lo0 - Math.max(1, (hi - lo0) * .15)), sp = Math.max(1, hi - lo);
    const w = v => ((v - lo) / sp * 100).toFixed(1);
    return `<div class="ff-aj"><div class="ff-hz-k">${svgI(b.art === 'tore' ? 'ball' : b.art === 'siege' ? 'trophy' : 'spielfeld')}<b>${esc(AUF_WORT[b.art] || '')} der Laufbahn</b></div>`
      + z.map((x, i) => `<div class="ff-aj-z${x[0] === b.hl ? ' hl' : ''}" style="--k:${i}">${chip(x[0])}`
      + `<span class="ff-r-m">${_ffNm(x[0])}<span class="ff-aj-b"><i style="width:${w(x[1])}%"></i><u style="left:${w(x[2])}%"></u></span></span>`
      + `<b class="num">${zahl(x[1])}</b></div>`).join('')
      // Der Abstand von heute stand hier und im Titel („nur noch 5
      // hinter"); Bahn und Strich zeigen beide Abstände als Länge.
      + `</div>`
      + `<div class="ff-leg"><span class="g">heute</span><span class="e">vor 30 Tagen</span></div>`;
  };

  // ── Die Meister: je Monat der Stern, das Gesicht, der Abstand ──────
  // Gold, denn es ist ein Titel [§C25]; wer sie gesammelt hat, steht hell.
  const STERN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.7l-5.6 3.1 1.3-6.2L3 9.3l6.3-.7z"/></svg>';
  const meister = b => {
    const m = (b.m || []).filter(x => pm()[x[1]]);
    if(m.length < 2) return '';
    return `<div class="ff-ms" style="--n:${m.length}">` + m.map((x, i) => `<span class="ff-ms-c${!b.hl || x[1] === b.hl ? ' hl' : ''}" style="--k:${i}">`
      + `<small>${esc(String(seasonLabel(x[0])).split(' ')[0])}</small>${STERN}${gesicht(x[1], 30)}${_ffNm(x[1])}`
      + `<b class="num">${zahl(x[2])}</b>${x[4] != null ? `<i class="num">+${zahl(x[2] - x[4])}</i>` : ''}</span>`).join('') + `</div>`
      + `<div class="ff-leg"><span>Elo zum Monatsende und Vorsprung</span></div>`;
  };

  // ── Die Leiter: Bahnen des Prestiges mit den Stufen als Sprossen ──
  // Jede Bahn reicht bis zu den Punkten, die Sprossen stehen an den
  // Grenzen der Stufen des Insigniums; über der ersten Bahn das Zeichen
  // jeder Stufe, die eine Bahn erreicht oder als nächste vor sich hat.
  const leiter = b => {
    const z = (b.z || []).filter(x => pm()[x[0]]), st = (b.st || []);
    if(z.length < 3 || !st.length) return '';
    // Die Achse beginnt an der Stufe des Hintersten: von null an lagen
    // Schildring und Volutenkranz übereinander, und alle Bahnen begannen
    // im selben leeren Stück.
    const max = Math.max(...z.map(x => x[1])), min = Math.min(...z.map(x => x[1]));
    const naechste = st.find(s => s[1] > max), unten = st.filter(s => s[1] <= min).pop();
    const lo = unten ? unten[1] : 0, ende = naechste ? naechste[1] : max * 1.08;
    const w = v => Math.max(0, Math.min(100, (v - lo) / Math.max(1, ende - lo) * 100)).toFixed(2);
    const sichtbarSt = st.filter(s => s[1] >= lo && s[1] <= ende);
    const hl = new Set(b.hl || []);
    const rang = pid => (getPlayerRank(pid) || {}).label;
    const zeichen = s => { try { return insigniumStufeSvg(s[0], rang(z[0][0]), 0, {bild:true}) || ''; } catch(e){ return ''; } };
    const sprossen = sichtbarSt.map(s => `<u style="left:${w(s[1])}%"></u>`).join('');
    return `<div class="ff-lt"><div class="ff-lt-z ax" aria-hidden="true"><span></span><span class="ff-lt-b">`
      // Ein Name steht nur, wo er Platz hat; das Zeichen steht immer. Auf
      // 288 px lagen Volutenkranz und Zierkranz übereinander.
      + (() => { let letzt = -100; return sichtbarSt.map((s, i) => { const x = Number(w(s[1])), mitName = x - letzt >= 45 || i === sichtbarSt.length - 1;
        if(mitName) letzt = x;
        return `<em class="${i === 0 ? 'li' : i === sichtbarSt.length - 1 ? 're' : ''}" style="left:${x}%">${zeichen(s)}<small${mitName ? '' : ' class="still"'}>${mitName ? esc(s[2]) : '&nbsp;'}</small></em>`; }).join(''); })()
      + `</span><span></span></div>`
      + z.map((x, i) => `<div class="ff-lt-z${hl.has(x[0]) ? ' hl' : ''}" style="--k:${i}">${chip(x[0])}`
        + `<span class="ff-r-m">${_ffNm(x[0])}<span class="ff-lt-b"><i style="width:${w(x[1])}%"></i>${sprossen}</span></span>`
        + `<b class="num">${zahl(x[1])}</b></div>`).join('') + `</div>`;
  };

  // ── Die Ausbeute des Monats: je Spieler eine Bahn aus drei Klassen ─
  // Legendär Gold, selten Violett, gewöhnlich Metall — die Farben der
  // Klassen überall [§C25]; die Länge ist die Zahl der Auszeichnungen.
  const ausbeute = b => {
    const z = (b.z || []).filter(x => pm()[x[0]]);
    if(!z.length) return '';
    const max = Math.max(1, ...z.map(x => x[1]));
    return z.map((x, i) => `<div class="ff-ab-z${x[0] === b.hl ? ' hl' : ''}" style="--k:${i}">${chip(x[0])}`
      + `<span class="ff-r-m">${_ffNm(x[0])}<span class="ff-ab-b" style="width:${(x[1] / max * 100).toFixed(1)}%">`
      + [['legendary', x[2]], ['rare', x[3]], ['common', x[4]]].filter(q => q[1] > 0).map(q => `<i class="${q[0]}" style="flex-grow:${q[1]}"></i>`).join('')
      + `</span></span><b class="num">${zahl(x[1])}</b></div>`).join('')
      + `<div class="ff-leg ff-ab-leg"><span class="legendary">legendär</span><span class="rare">selten</span><span class="common">gewöhnlich</span></div>`;
  };

  // ── Die Serie: je Sieg ein Feld, dahinter die Bestmarken ───────────
  // Die Felder der Serie in der Farbe der Karte, gestrichelt bis zur
  // eigenen Bestmarke, der Strich die längste Serie der Liga.
  // Ein Duo in Serie zeichnet sich gleich, mit zwei Gesichtern (`a`, `b`).
  const serie = b => {
    const duo = b.a && b.b;
    if(duo ? !(pm()[b.a] && pm()[b.b]) : !pm()[b.p]) return '';
    const n = b.n | 0, best = b.best | 0, liga = b.liga | 0, len = Math.min(24, Math.max(n, best, liga));
    const felder = Array.from({length:len}, (_, i) => `<i class="${i < n ? 'w' : i < best ? 'ziel' : 'leer'}${i + 1 === liga && liga > n ? ' liga' : ''}" style="--k:${i}"></i>`).join('');
    const wer = duo ? `<span class="sp-chips">${chip(b.a)}${chip(b.b)}</span><span class="ff-nms ff-und">${_ffNm(b.a)}${_ffNm(b.b)}</span>`
      : `${gesicht(b.p, 30)}${_ffNm(b.p)}`;
    // Die Länge der Serie steht im Titel; die Felder zeigen sie.
    return `<div class="ff-se-k">${wer}</div>`
      + `<span class="ff-se">${felder}</span>`
      + `<div class="ff-leg"><span class="g">seit dem ${esc(b.seit || '')}</span>`
      + (best > n ? `<span class="z">${duo ? 'beste der beiden' : 'eigene Bestmarke'} ${best}</span>` : '')
      + (liga > n ? `<span class="l">${duo ? 'längste eines Duos' : 'längste der Liga'} ${liga}</span>` : '') + `</div>`;
  };

  // ── Der Gipfel: die Elo des Monats gegen den höchsten Stand davor ──
  // Dieselbe Kurve wie der Aufwind (`_spLinie`), die Bezugslinie ist der
  // höchste Stand eines Monats davor; was darüber liegt, ist neu.
  const gipfel = b => {
    const v = (b.v || []).map(Number);
    if(!pm()[b.p] || v.length < 3) return '';
    // Ohne `zwei`: unter der Bezugslinie läge sonst der ganze Monat rot,
    // und der Weg zum Gipfel las sich als Absturz [§C25].
    const svg = _spLinie(v, {ref:b.peak != null ? b.peak : undefined, fmt:y => (y < 0 ? '−' : '') + _spZahl(y), ende:'', x:b.x || []});
    const p = /<circle class="sp-ln-p[^"]*" cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
    const face = p ? `<span class="ff-af-p" style="left:${(Number(p[1]) / 244 * 100).toFixed(2)}%;top:${(Number(p[2]) / 80 * 100).toFixed(2)}%">${chip(b.p)}</span>` : '';
    // Die Elo von jetzt nennt der Titel oder zeigt das Ende der Kurve.
    return `<div class="ff-af-k">${_ffNm(b.p)}<span class="ff-leg"><span>Elo im ${esc(b.mon || '')}</span></span></div>`
      + `<div class="sp-ln metall ff-af ff-gp"><div class="ff-af-l">${svg}${face}</div></div>`
      + (b.peak != null ? `<div class="ff-leg"><span class="r">${b.neu ? 'bester Monat davor' : 'eigener Höchststand'}</span></div>` : '');
  };

  // ── Die Saisons: der Platz Monat für Monat ─────────────────────────
  // Platz 1 oben, eine Linie durch die Monate wie im Positionsverlauf
  // [§C27]; der laufende Monat in der Farbe der Karte, die Plätze des
  // Podests in ihrem Metall.
  const saisons = b => {
    // Die Monate stehen unter `mo`, nicht unter `r`: `r` ist überall sonst
    // eine Rangliste von Spielern ({p, w}), und eine Reihe von Monaten unter
    // demselben Namen las jede Prüfung als Rennen.
    const r = (b.mo || []).filter(x => x[1] > 0);
    if(!pm()[b.p] || r.length < 2) return '';
    const W = 244, H = 84, n = r.length, unten = Math.max(4, ...r.map(x => x[1]));
    const X = i => 40 + i * (W - 58) / Math.max(1, n - 1), Y = p => 14 + (p - 1) / Math.max(1, unten - 1) * (H - 36);
    const d = r.map((x, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x[1]).toFixed(1)).join('');
    const metall = p => p === 1 ? 'm1' : p === 2 ? 'm2' : p === 3 ? 'm3' : '';
    // Ein Platz, den der Titel nennt, steht auch an einem früheren Monat nicht.
    const genannt = new Set(r.slice(-2).map(x => x[1]));
    // Die beiden letzten Plätze stehen nicht in ihren Punkten: der Titel
    // nennt sie („von Platz 8 im Juli auf Platz 3"), die Höhe zeigt sie. Die
    // Monate davor tragen ihren Platz, die Achse den ersten. Jeder Platz
    // steht im Blatt.
    return `<div class="ff-ss-k">${gesicht(b.p, 30)}${_ffNm(b.p)}</div><div class="ff-ss"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
      + `<line class="ff-ss-g" x1="30" x2="${W - 8}" y1="${Y(1).toFixed(1)}" y2="${Y(1).toFixed(1)}"/>`
      + `<text class="ax" x="2" y="${(Y(1) + 3.6).toFixed(1)}">1.</text>`
      + `<path class="ff-ss-l" d="${d}"/>`
      + r.map((x, i) => `<g class="ff-ss-p ${metall(x[1])}${i === n - 1 ? ' jetzt' : ''}"><circle cx="${X(i).toFixed(1)}" cy="${Y(x[1]).toFixed(1)}" r="${i < n - 2 ? 10 : 7}"/>`
        + (i < n - 2 && !genannt.has(x[1]) ? `<text x="${X(i).toFixed(1)}" y="${(Y(x[1]) + 3.6).toFixed(1)}">${x[1]}</text>` : '')
        + `<text class="m" x="${X(i).toFixed(1)}" y="${H - 3}">${esc(x[0])}</text></g>`).join('') + `</svg></div>`;
  };

  // ── Der Monat davor: sein Podest und der Platz von jetzt ───────────
  const vormonat = b => podest(b.pd, {ins:true, u:x => x.j ? `im ${esc(b.mon || '')} <b class="num">${x.j}.</b>` : `im ${esc(b.mon || '')} ohne Partie`});

  // ── Eine Position: ihr Zeichen, das Podest mit dem Wert ────────────
  const position = b => {
    const pd = mitBewegung(b, {});
    return pd ? `<div class="ff-hz-k ff-po-k">${svgI(b.pos === 'atk' ? 'bolt' : 'shield')}<b>${b.pos === 'atk' ? 'Sturm' : 'Abwehr'}</b><small>Wert der Rangliste</small></div>${pd}` : '';
  };

  // ── Das Netz eines Spielers: jeder Partner auf einem Kreis ─────────
  // Die Linie so stark wie die gemeinsamen Partien, wie im Netz der Duos
  // [§C27]; wer fehlt, steht ohne Linie und gestrichelt, wer neu dazukam,
  // in der Farbe der Karte. Jeder Name klein unter seinem Gesicht.
  const partnernetz = b => {
    const z = (b.z || []).filter(x => pm()[x[0]]);
    if(!pm()[b.p] || z.length < 4) return '';
    const fehlt = new Set(b.fehlt || []), max = Math.max(1, ...z.map(x => x[1]));
    const n = z.length, pos = i => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [50 + 41 * Math.cos(a), 50 + 38 * Math.sin(a)]; };
    const linien = z.map((x, i) => { if(!x[1]) return ''; const [px, py] = pos(i);
      return `<line class="netz-l${x[0] === b.neu ? ' neu' : ''}" x1="50" y1="50" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke-width="${(.8 + x[1] / max * 3.4).toFixed(2)}"/>`; }).join('');
    return `<div class="ff-pn"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${linien}</svg>`
      + z.map((x, i) => { const [px, py] = pos(i);
        return `<span class="ff-pn-p${fehlt.has(x[0]) ? ' fehlt' : ''}${x[0] === b.neu ? ' neu' : ''}" style="left:${px.toFixed(1)}%;top:${py.toFixed(1)}%">${chip(x[0])}<b>${esc(_spName(x[0]))}</b></span>`; }).join('')
      + `<span class="ff-pn-m">${gesicht(b.p, 40)}${_ffNm(b.p)}</span></div>`;
  };

  // ── Die Duos: ein Podest aus Paaren ────────────────────────────────
  // Ein Duo hat keinen Rang und kein Wappen [allgemein]: zwei Gesichter,
  // die Höhe der Stufe ist die Reihenfolge der Teams-Liste, im Sockel die
  // Siegquote, darunter die gemeinsamen Partien.
  const duopodest = b => {
    const r = (b.pd || []).filter(x => pm()[x[0]] && pm()[x[1]]).slice(0, 3);
    if(!r.length) return '';
    const folge = r.length >= 3 ? [1, 0, 2] : r.length === 2 ? [1, 0] : [0];
    return `<div class="ff-pd ff-pd2 ff-dp">` + folge.map(k => { const x = r[k], key = paarKey(x[0], x[1]);
      return `<span class="ff-pd-s p${k + 1}${key === b.hl ? ' hl' : ''}" style="--k:${k}"><span class="sp-chips">${chip(x[0])}${chip(x[1])}</span>`
        + `<span class="ff-nms">${_ffNm(x[0])}${_ffNm(x[1])}</span>`
        + `<em><b class="num">${Math.round(x[2] / Math.max(1, x[3]) * 100)}&nbsp;%</b><small class="num">${x[2]} von ${x[3]}</small></em></span>`; }).join('') + `</div>`;
  };

  // ── Das Rennen um das Team der Saison: Paare als Bahnen ────────────
  const duorennen = b => {
    const z = (b.z || []).filter(x => pm()[x[0]] && pm()[x[1]]);
    if(!z.length) return '';
    const max = Math.max(1, ...z.map(x => x[2]));
    return z.map((x, i) => `<div class="ff-dr-z${paarKey(x[0], x[1]) === b.hl ? ' hl' : ''}" style="--k:${i}"><span class="sp-chips">${chip(x[0])}${chip(x[1])}</span>`
      + `<span class="ff-r-m"><span class="ff-nms">${_ffNm(x[0])}${_ffNm(x[1])}</span><span class="ff-bar"><i style="width:${(Math.max(0, x[2]) / max * 100).toFixed(1)}%"></i></span></span>`
      + `<span class="ff-ew-w"><b class="num">${esc(vz(x[2]))}</b><small class="num">${x[3]} Partien</small></span></div>`).join('')
      + `<div class="ff-leg"><span>Elo zusammen im Monat</span></div>`;
  };

  // ── Das Duell: das Tauziehen, darunter die letzten Begegnungen ─────
  // Jede Begegnung ein Feld auf der Seite ihres Siegers, links der eine,
  // rechts der andere, die jüngste zuletzt.
  const rivale = b => {
    // Ohne „N Duelle" unter dem Tauziehen: nach so vielen Duellen fragt der
    // Titel eines Gleichstands, und die Summe zeigt die Bahn.
    const t = _ffDuell(b).replace(/<small class="num">\d+ Duelle<\/small>/, '<span></span>');
    if(!t) return '';
    const z = String(b.z || '').split('').filter(c => c === 'a' || c === 'b');
    // Oben die Siege dessen, von dem die Karte handelt (`h`), unten die
    // des anderen; ohne ihn der Linke oben.
    const h = b.h === 'b' ? 'b' : 'a';
    return t + (z.length ? `<div class="ff-rv">${z.map((c, i) => `<i class="${c === h ? 'o' : 'u'}" style="--k:${i}"></i>`).join('')}</div>`
        // Ohne die Zahl der Felder: „die letzten 12" stand unter „gewinnt
        // 12 Duelle in Folge".
        + `<div class="ff-leg ff-rv-l"><span>jüngstes Duell rechts</span></div>` : '');
  };

  return {
    rennen:_ffRennen, podest:_ffPodest, sammlung:_ffSammlung, sterne:_ffSterne, zahl:_ffZahl, duell:_ffDuell, duo:_ffDuo, vitrine:_ffVitrine, medaille:_ffMedaille,
    stufe:_ffStufe, ziel:_ffZiel, rolle:_ffRolle, verteilung:_ffVerteilung, saeulen:_ffSaeulen,
    platz:_ffPlatz, tafel:_ffTafel, zaehler:_ffZaehler, lauf:_ffLauf, halbzeit:_ffHalbzeit,
    aufwind, erwartung, hantel, marke, chronik, chemie, landkarte, liga,
    tabelle, karriere, aufholjagd, meister, leiter, ausbeute, serie, duoserie:serie, gipfel, saisons, vormonat, position,
    partnernetz, duopodest, duorennen, rivale
  };
})();
