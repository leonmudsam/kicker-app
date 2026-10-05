// ═══════════════════════════════════════════════════════════════════════
// [§C40] DAS KARRIEREENDE
// ═══════════════════════════════════════════════════════════════════════
// Wer die Gruppe verlässt, spielt keine neue Partie mehr, und trotzdem stand
// er weiter in der Ewigen Tafel, hielt Rekorde, die niemand mehr holen
// konnte, und sperrte Plätze für die, die noch spielen. Löschen hätte seine
// Geschichte genommen, Ausblenden (`hidden`) nimmt sie auch: ein
// ausgeblendeter Spieler fällt aus jeder Rechnung, auch aus vergangenen
// Monaten. Das Karriereende trennt beides:
//
//   LEGACY bleibt. Jeder Zeitraum, der vor dem Karriereende ABGESCHLOSSEN
//   war, bleibt, wie er war: der Juni mit seinem zweiten Platz, die
//   Auszeichnungen, die Monatschroniken, der Titel, jede Partie.
//   AKTIVE LIGA vergleicht ohne ihn. Rangliste der Ewigen Tafel, Liga-Rekorde,
//   der laufende Monat, Woche und Tag, Teams und Positionen, Prestige-Rang,
//   News: dort steht nur, wer noch spielt.
//
// Die Regel steht an EINER Stelle (`ligaAktiv`), und jede Abfrage wählt
// ausdrücklich zwischen `sichtbar` (nicht ausgeblendet — für die Geschichte)
// und `ligaAktiv` (tritt im Zeitraum an). Eine rohe `.hidden`-Abfrage lässt
// `tests/ruhestand` nicht mehr zu: genau so wäre ein Ruheständler mit dem
// nächsten neuen Feature wieder irgendwo aufgetaucht.
//
// Das Profil eines Ruheständlers ist EINGEFROREN: Prestige, Insignium,
// Rekorde und Rang stehen so, wie sie im Moment des Karriereendes standen
// (`ruhestandStand`). Gerechnet wird mit derselben Engine wie für alle,
// nur zum Zeitpunkt des Karriereendes und in einem eigenen Cache
// (`_ruheRechnen`) — gespeichert wird nichts als der Zeitpunkt.

// Bis wann ein Karriereende zählt. Außerhalb der Zeitmaschine zählt jedes;
// in ihr nur die, die VOR dem gerechneten Spieler lagen — er selbst steht
// in seinem eigenen Stand noch mitten in der Liga.
let _ruheStichtag = Infinity;

function _spielerVon(x){ return typeof x === 'string' ? pmap()[x] : x; }

// Der Zeitpunkt des Karriereendes in Millisekunden, sonst 0.
function ruhestandMs(x){
  const p = _spielerVon(x);
  if(!p || !p.retired_at) return 0;
  const t = Date.parse(p.retired_at);
  return isFinite(t) ? t : 0;
}
function imRuhestand(x){ const t = ruhestandMs(x); return t > 0 && t <= _ruheStichtag; }

// Nicht ausgeblendet. Für alles, was Geschichte ist: eine Partie, ein
// Direkter Vergleich, ein Name in einem alten Rückblick.
function sichtbar(x){ const p = _spielerVon(x); return !!p && !p.hidden; }

// Tritt in dem Zeitraum an, der bei `bisMs` endet. Ohne `bisMs` ist das
// der Zeitraum, der noch läuft — dort tritt kein Ruheständler mehr an. Ein
// Zeitraum, der bei seinem Karriereende schon zu war, gehört ihm weiter:
// darin hat er gespielt, und dort bleibt er stehen.
function ligaAktiv(x, bisMs){
  const p = _spielerVon(x);
  if(!p || p.hidden) return false;
  if(!imRuhestand(p)) return true;
  return bisMs != null && isFinite(bisMs) && bisMs <= ruhestandMs(p);
}

// Hatte er zum Zeitpunkt `ms` schon aufgehört? Für alles, was je Partie
// gerechnet wird: eine Partie vor dem Karriereende gehört der Liga, in der
// er noch spielte, und die Auszeichnungen daraus bleiben [§C40]. Ausblenden
// ist davon unberührt — es nahm schon immer nur aus der Anzeige.
function imRuhestandAm(x, ms){
  const t = ruhestandMs(x);
  return t > 0 && t <= _ruheStichtag && ms > t;
}

// Die Ruheständler, der jüngste Abschied zuerst.
function ruhestandSpieler(){
  return players.filter(p => sichtbar(p) && imRuhestand(p))
    .sort((a, b) => ruhestandMs(b) - ruhestandMs(a));
}

// ── Die Zeitmaschine ────────────────────────────────────────────────────
// Rechnet `fn` so, wie die Liga im Moment des Karriereendes stand. Alle
// Töpfe hängen an `_cache`, und der wird für die Dauer der Rechnung gegen
// einen leeren getauscht: ein Stand MIT dem Ruheständler darf nie in einem
// Topf landen, aus dem die aktive Liga liest. Ein Schlüssel je Topf hätte
// dasselbe getan — und jeder künftige Topf hätte ihn vergessen können.
// Was außerhalb von `_cache` gemerkt wird, hängt nur an den Partien und
// nicht daran, wer antritt (`tests/ruhestand` misst das am Ergebnis).
function _ruheRechnen(pid, fn){
  const t = ruhestandMs(pid);
  const altCache = _cache, altStichtag = _ruheStichtag;
  _cache = {version: altCache.version};
  _ruheStichtag = t - 1;
  try { return fn(t); }
  finally { _cache = altCache; _ruheStichtag = altStichtag; }
}

// Was den eingefrorenen Stand bestimmt: die Partien bis zum Karriereende,
// die Rechenregeln und die eingefrorenen Monate. Eine neue Partie danach
// ändert ihn nicht — sie bekommt damit auch keinen neuen Lauf. Gerechnet
// einmal je Datenstand, und nur über die Partien bis dorthin.
function _ruheSig(pid){
  const t = ruhestandMs(pid);
  const key = pid + '_' + t + '_' + matches.length + '_' + _cache.version;
  if(!_cache._ruheSig) _cache._ruheSig = {};
  if(_cache._ruheSig[key] != null) return _cache._ruheSig[key];
  // Mit der Version im Schlüssel wächst der Topf sonst über jede Version mit.
  _topfDeckel(_cache._ruheSig, 16);
  let h = 2166136261 >>> 0, n = 0;
  const mische = s => { for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } };
  for(const m of matches){
    if(mts(m) > t) continue;
    n++;
    mische(m.id + m.a1 + m.a2 + m.b1 + m.b2 + m.a1_pos + m.b1_pos + m.score_a + ':' + m.score_b + m.winner
      + JSON.stringify(m.deltas || {}) + (m.exp_a == null ? '' : m.exp_a));
  }
  mische(JSON.stringify(cfg || {}));
  (seasons || []).forEach(s => { if(seasonEnd(s.id).getTime() <= t) mische(s.id + JSON.stringify(s.titles || '') + JSON.stringify(s.top_elo || '')); });
  // Nur ein früheres Karriereende ändert die Liga, in der er aufgehört hat.
  players.forEach(p => { const tp = ruhestandMs(p); if(p.id !== pid && tp && tp < t) mische(p.id + p.retired_at); });
  const sig = n + '_' + (h >>> 0).toString(36);
  _cache._ruheSig[key] = sig;
  return sig;
}

// Der eingefrorene Stand eines Ruheständlers: Prestige mit Insignium,
// Rekorde, Rang. Außerhalb von `_cache` gemerkt, weil er sich mit einer
// neuen Partie anderer nicht ändert — nach jeder Partie neu zu rechnen
// hieße, bei jedem Öffnen des Feeds die Liga zweimal zu rechnen.
const _ruheStandMemo = new Map();
function ruhestandStand(pid){
  const sig = _ruheSig(pid);
  const alt = _ruheStandMemo.get(pid);
  if(alt && alt.sig === sig) return alt.stand;
  const stand = _ruheRechnen(pid, t => {
    let prestige = null, rekorde = [], rang = null, prestigeTab = null;
    try { prestige = prestigeOf(pid, t); } catch(e){ prestige = null; }
    try { prestigeTab = prestigeTabelle(t); } catch(e){ prestigeTab = null; }
    try { rekorde = chroniclesOfPlayer(pid, t); } catch(e){ rekorde = []; }
    // Der Rang aus der Elo-Bahn BIS zum Karriereende: die Karriere-Elo der
    // anderen wächst weiter, und mit ihr verschöbe sich sonst sein Rang.
    try { rang = _rangTabelle(getSeasonAvgElos(t))[pid] || null; } catch(e){ rang = null; }
    return {t, prestige, rekorde, rang,
            prestigePlatz: prestigeTab ? prestigeTab.rang.indexOf(pid) + 1 : 0,
            prestigeVon: prestigeTab ? prestigeTab.rang.length : 0};
  });
  _ruheStandMemo.set(pid, {sig, stand});
  return stand;
}

// Ein Stand zu einem früheren Zeitpunkt, für ein Blatt aus der Zeit vor
// dem Karriereende. Selten, also klein gemerkt.
const _ruheBisMemo = new Map();
function _ruheBis(pid, bisMs, fn){
  const k = pid + '_' + bisMs + '_' + _ruheSig(pid);
  if(_ruheBisMemo.has(k)) return _ruheBisMemo.get(k);
  if(_ruheBisMemo.size > 24) _ruheBisMemo.delete(_ruheBisMemo.keys().next().value);
  const v = _ruheRechnen(pid, () => fn());
  _ruheBisMemo.set(k, v);
  return v;
}

// ── Speichern ───────────────────────────────────────────────────────────
// Gespeichert wird nur der Zeitpunkt (`players.retired_at`). Alles andere ist
// eine Ableitung — sonst hätte ein Eintrag, den es beim Karriereende noch
// nicht gab, keinen Stand, und eine bearbeitete alte Partie stünde neben
// einem Profil, das sie nicht kennt.
async function karriereSetzen(pid, beenden){
  const wert = beenden ? new Date().toISOString() : null;
  const {error} = await sb.from('players').update({retired_at: wert}).eq('id', pid);
  if(error){
    // 42703: die Spalte gibt es nicht — die Migration in datenbank/ fehlt.
    const fehlt = /retired_at|42703|column/i.test(String(error.message || error.code || ''));
    return {ok:false, fehlt, error};
  }
  return {ok:true, wert};
}

// ── Gelöscht wird nur, wer nie gespielt hat [§C40] ────────────────────
// Ohne Partie gibt es nichts, das bleiben müsste: Name und Bild sind alles.
// Wer gespielt hat, ist Teil der Geschichte der anderen — jede seiner
// Partien trägt drei weitere Namen, deren Elo, Serien und Rekorde gegen ihn
// gerechnet sind. Gelöscht stand dort ein Fragezeichen, und die Rechnung
// der drei anderen lief gegen niemanden. Für jemanden, der aufhört, gibt es
// das Karriereende, für einen Fehlgriff das Ausblenden.
// Gefragt wird die DATENBANK, nicht die geladene Liste: die ist leer,
// solange der erste Abruf läuft oder wenn er fehlschlug, und dann hätte das
// Profil einen Spieler mit Partien für löschbar gehalten.
async function spielerLoeschen(pid){
  const {count, error} = await sb.from('matches').select('id', {count:'exact', head:true})
    .or(['a1', 'a2', 'b1', 'b2'].map(k => k + '.eq.' + pid).join(','));
  if(error || typeof count !== 'number') return {ok:false, grund:'netz'};
  if(count > 0) return {ok:false, grund:'partien', zahl:count};
  const {error:e2} = await sb.from('players').delete().eq('id', pid);
  if(e2) return {ok:false, grund:'netz'};
  return {ok:true};
}
