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
    return `<div class="ff-af-k">${_ffNm(b.p)}<span class="ff-af-w"><b class="num">${esc(_spVz(b.d | 0))}</b><small>Elo in 14 Tagen</small></span></div>`
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
      + `<span class="ff-ew-w"><b class="num">${esc(vz(+(x.w - x.e).toFixed(1)))}</b><small class="num">${x.w | 0} von ${x.g | 0}</small></span></div>`).join('')
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
        + `<span class="ff-ew-w"><b class="num">${esc(vz(x.j - x.v))}</b><small class="num">${x.v} → ${x.j}\u00a0%</small></span></div>`;
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
    const ziel = pr ? esc(b.name || '') : `${zahl(b.ziel)}. ${w[0]}`;
    const rest = b.rest | 0;
    let neben = '';
    if(pr && b.stufe){
      const rang = (getPlayerRank(b.p) || {}).label;
      try { neben = `<span class="ff-mk-z">${insigniumStufeSvg(b.stufe, rang, 0, {bild:true}) || ''}</span>`; } catch(e){ neben = ''; }
    }
    return `<div class="ff-mk"><span class="ff-mk-r${pr ? ' ins' : ''}">${ring}<span class="ff-mk-g">${gesicht(b.p, pr ? 48 : 40)}</span></span>`
      + `<span class="ff-mk-m">${_ffNm(b.p)}<span class="ff-mk-n"><b class="num">${zahl(rest)}</b>`
      + `<em>${esc(pr ? 'Prestige' : rest === 1 ? w[0] : w[1])}</em></span>`
      + `<small>bis ${pr ? 'zum' : w[2]} ${ziel}</small><small class="num">${zahl(b.ist)} von ${zahl(b.ziel)}</small></span>${neben}</div>`;
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
    const wort = b.art === 'neu' ? 'erster Eintrag' : b.art === 'gold' ? 'legendär in Folge' : 'Monate in Folge';
    return `<div class="ff-cr-k">${chip(b.p)}${_ffNm(b.p)}<span class="ff-cr-w">${b.art === 'neu' ? '' : `<b class="num">${b.lauf | 0}</b>`}<small>${wort}</small></span></div>`
      + `<div class="ff-cr" style="--n:${z.length}">${zellen}</div>`;
  };

  // ── Die Chemie eines Duos: zwei Gesichter und ihr Bogen ───────────
  // Der Bogen ist die Linie aus dem Netz der Duos [§C27], gefärbt wie
  // dort: Grün über der Erwartung. Darunter die beiden nächsten Duos als
  // Zeilen, damit die Zahl einen Maßstab hat.
  const chemie = b => {
    if(!pm()[b.a] || !pm()[b.b]) return '';
    const dick = (1.6 + Math.min(1, (b.g | 0) / 60) * 4.4).toFixed(1);
    const weitere = (b.dz || []).filter(x => pm()[x[0]] && pm()[x[1]]);
    return `<div class="ff-cm"><span class="ff-cm-p">${gesicht(b.a, 36)}${_ffNm(b.a)}</span>`
      + `<span class="ff-cm-m"><svg viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><path class="netz-l w" d="M4 32Q60 -8 116 32" stroke-width="${dick}"/></svg>`
      + `<b class="num">${esc(vz(b.pp | 0))}</b><small>über der Erwartung</small></span>`
      + `<span class="ff-cm-p">${gesicht(b.b, 36)}${_ffNm(b.b)}</span></div>`
      + (weitere.length ? `<div class="ff-cm-w">${weitere.map(x => `<span><span class="sp-chips">${chip(x[0])}${chip(x[1])}</span>`
        + `<span class="ff-nms">${_ffNm(x[0])}${_ffNm(x[1])}</span><b class="num">${esc(vz(x[2] | 0))}</b></span>`).join('')}</div>` : '');
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
    return `<div class="ff-lk"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">`
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
    const ziffern = String(b.n | 0).split('').map((c, i) => `<i class="num" style="--k:${i}">${c}</i>`).join('');
    return `<div class="ff-lg-k"><span class="ff-zw-z">${ziffern}</span><span class="ff-zw-m"><b>${b.art === 'tore' ? 'Tore der Liga' : 'Partien der Liga'}</b>`
      + (s.length ? `<span>${s.map(_ffNm).join('<i>und</i>')}</span>` : '') + (b.stand ? `<small class="num">${esc(b.stand)}</small>` : '') + `</span></div>`
      + `<div class="ff-mo">${m.map((x, i) => `<span class="${i === b.hl ? 'hl' : ''}" style="--k:${i}"><b class="num">${zahl(x[1])}</b>`
        + `<em><i style="height:${Math.max(4, x[1] / max * 100).toFixed(1)}%"></i></em><small>${esc(x[0])}</small></span>`).join('')}</div>`;
  };

  return {
    rennen:_ffRennen, podest:_ffPodest, sammlung:_ffSammlung, sterne:_ffSterne, zahl:_ffZahl, duell:_ffDuell, duo:_ffDuo, vitrine:_ffVitrine, medaille:_ffMedaille,
    stufe:_ffStufe, ziel:_ffZiel, rolle:_ffRolle, verteilung:_ffVerteilung, saeulen:_ffSaeulen,
    platz:_ffPlatz, tafel:_ffTafel, zaehler:_ffZaehler, lauf:_ffLauf, halbzeit:_ffHalbzeit,
    aufwind, erwartung, hantel, marke, chronik, chemie, landkarte, liga
  };
})();
