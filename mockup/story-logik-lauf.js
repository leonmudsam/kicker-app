// Der Lauf: spielt die ECHTEN Partien der Liga (Mai bis Oktober 2026)
// Kalendertag für Kalendertag nach, lässt an jedem Tag den echten Generator
// laufen, speichert wie die App (eine Zeile je ID, die erste gewinnt, nie
// geändert [§C33]) und liest danach, was der Feed an jedem Tag daraus zeigt.
// Jede Kartenform wird beim ersten Auftauchen mit den Funktionen der App
// gezeichnet, Karte und Blatt: `_newsCardHtmlM2` und `openNewsDetail`. Es
// gibt hier keine nachgebaute Zeichnung und keine nachgebaute Regel.
//
//   node tools/build.mjs && node mockup/story-logik-lauf.js && node mockup/story-logik-seite.js
//
// Ergebnis ist `.story-logik.json`, aus der `story-logik-seite.js` die Seite
// baut. Gelesen wird `dist/index.html` (über `tests/runtime.js`), dieselbe
// Datei, die die Testsuiten prüfen.
'use strict';
// Die Uhr der Liga: Tage, Wochen und Uhrzeiten wie auf den Telefonen der
// Liga. Ohne sie rechnete der Lauf in der Zeitzone des Rechners, und auf
// einem Server standen alle Partien zwei Stunden früher.
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {createRuntime} = require(path.join(ROOT, 'tests', 'runtime.js'));

const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const liga = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'oktober.txt'), 'utf8').trim().split(';').map((row, i) => {
  const f = row.split(',').map(Number), pos = j => f[4 + j] === 0 ? 'atk' : 'def';
  return {id:'o' + String(i).padStart(4, '0'), a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3), score_a:f[8], score_b:f[9],
    winner:f[10] === 0 ? 'A' : 'B', exp_a:f[11] / 1000, created_at:new Date(f[12] * 1000).toISOString(), deltas:{}};
});

const {K, setNow} = createRuntime();
const ersterMs = Math.min(...liga.map(m => Date.parse(m.created_at)));
const letzterMs = Math.max(...liga.map(m => Date.parse(m.created_at)));
setNow(letzterMs + 7 * 864e5);
// Die Saisontabelle trägt in der App nur abgeschlossene Monate; der Lauf
// gibt ihr an jedem Tag genau die, die bis dahin zu sind. Mit allen auf
// einmal stand am Morgen nach einem Monatswechsel ein Titel, der noch nicht
// vergeben war (`tests/tafel`).
K(`players = ${JSON.stringify(NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5, avatar_id:null})))};
  matches = ${JSON.stringify(liga)};
  matches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  globalThis.ALLE = matches.slice();
  seasons = ['2026-05','2026-06','2026-07','2026-08','2026-09','2026-10']
    .map(id => ({id, label:seasonLabel(id), start_date:'', end_date:''}));
  invalidateCache();
  const _d = new Map(simulateEloWithSliders(matches).history.map(h => [h.matchId, h.deltas]));
  matches.forEach(m => { m.deltas = _d.get(m.id) || {}; });
  invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s => { const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
    const top = Object.keys(pl).filter(id => pl[id] > 0)
      .map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0})).sort((a, b) => b.elo - a.elo);
    s.top_elo = JSON.stringify(top.slice(0, 3)); s.player_id = top[0] ? top[0].id : null; });
  globalThis.ALLE_SAISONS = seasons.slice();
  globalThis.DB = new Map();
  invalidateCache(); 0`);

// ── Kartenform ──────────────────────────────────────────────────────
// Eine Form ist, was im Feed als eigene Art Karte steht: der Typ, und wo ein
// Typ mehrere Gestalten hat, deren Achse (Sammelkarte nach Quelle, Ehrung
// nach Zeitraum, Zeichen-Karte nach Schluss). Die Variante wählt die
// Beispiele innerhalb einer Form aus, damit sie sich unterscheiden.
const FORM_JS = `(s => {
  const d = s.dataRef || {}, t = d.type || '-';
  if(t === 'sammel') return 'sammel:' + (d.quelle || 'spiel');
  if(t === 'ehrung') return 'ehrung:' + (d.periode || 'runde');
  if(t === 'insignium_tag') return 'insignium_tag' + (d.schluss ? ':' + d.schluss : '');
  if(t === 'ambient') return 'ambient';
  return t;
})`;
// Was eine Karte an Zeichnungen und Anlässen trägt. Ein Beispiel wird
// gezeichnet, wenn es mindestens eins davon zum ersten Mal zeigt: jeder Kopf
// und jeder Fuß einer Partie, jeder Anlass in einem Bündel, jede Grafik
// eines Fun Facts.
const MARKEN_JS = `(s => {
  const d = s.dataRef || {}, t = d.type || '-', m = [];
  const sv = d.scoreVisualKey || (((d.visual || {}).score) || {}).key;
  const ov = d.occasionVisualKey || (((d.visual || {}).occasion) || {}).key;
  if(t === 'spiel'){ m.push('kopf:' + (sv || d.resultKind || '?')); if(ov) m.push('fuss:' + ov); }
  if(t === 'sammel'){
    (d.teile || []).forEach(x => m.push('teil:' + (x.typ || '?') + (x.kammer ? ':' + x.kammer : '')));
    if(d.kopfTyp) m.push('kopf:' + d.kopfTyp);
    if(d.breaking) m.push('brk');
    if((d.teile || []).some(x => x && x.neg)) m.push('neg');
  }
  if(t === 'ambient') m.push('bild:' + (((d.bild || {}).f) || (d.leiter ? 'leiter' : '-')));
  if(t === 'potd'){ m.push('potd'); if(d.gegenstueck) m.push('gegen'); if((d.ehrung || []).length) m.push('ehrung');
    if(d.ehrungIn) m.push('in:' + d.ehrungIn); }
  if(t === 'insignium_tag'){ m.push((d.zuege || []).length > 1 ? 'viele' : 'eins');
    if((d.zuege || []).some(z => z && z.art === 'ab')) m.push('ab'); if(_isBreaking(s)) m.push('brk'); }
  if(t === 'ehrung'){ m.push(d.periode || 'runde'); if(_isBreaking(s)) m.push('brk');
    if((d.spieler || []).length > 5) m.push('viele'); if(d.gegenstueck) m.push('gegen'); }
  if(!m.length) m.push(t + (_isBreaking(s) ? ':brk' : ''));
  return m;
})`;

const tagKey = ms => { const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const formen = {};             // Form → Zählung, Uhrzeiten, Beispiele
const gesehen = new Set();     // im Feed gesehene IDs
const zusammen = new Set();    // Karten mit zusammengeführten Meldungen
const markenJe = new Map();    // ID → Marken, die sie je gezeigt hat
const proTag = [];
const GRENZE = {'spiel':24, 'sammel:spiel':30, 'sammel:tafel':8, 'ambient':16};
const t0 = Date.now();
const RUHE_MS = new Date(2026, 9, 20, 18, 0, 0).getTime();
let ruhe = false;

for(let t = new Date(tagKey(ersterMs) + 'T00:00:00').getTime(); t <= letzterMs + 5 * 864e5; t += 864e5){
  const tag = new Date(t), jetzt = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), 23, 59, 40).getTime();
  setNow(jetzt);
  // Ein Karriereende kommt in den Partien nicht vor. Damit seine Karte zu
  // sehen ist, beendet Anton (zuletzt am 08.10.) die Karriere am 20.10. um
  // 18:00 — erst, wenn die Uhr dort ist, sonst stünde er vorher schon
  // außerhalb der Liga [§C40]. Die Seite sagt, dass es gestellt ist.
  if(jetzt >= RUHE_MS && !ruhe){
    ruhe = true;
    K(`(() => { const p = players.find(x => x.name === 'Anton');
      p.retired_at = new Date(${RUHE_MS}).toISOString(); invalidateCache(); return 0; })()`);
  }
  // Die Datenbank liegt im Kontext der App: eine Zeile je ID, die erste
  // gewinnt, und der Generator sieht den Bestand wie in der App.
  let neu = 0;
  try {
    neu = +K(`(() => {
      matches = ALLE.filter(m => new Date(m.created_at).getTime() <= ${jetzt});
      seasons = ALLE_SAISONS.filter(s => seasonEnd(s.id).getTime() < ${jetzt});
      invalidateCache();
      _cache._stories = [...DB.values()].sort(_storyFolge);
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      let n = 0;
      _buildStories().forEach(s => { if(!DB.has(s.id)){ DB.set(s.id, s); n++; } });
      return n;
    })()`);
  } catch(e){ console.error('Generator', tagKey(jetzt), String(e).slice(0, 160)); }
  // Was der Feed an diesem Abend zeigt: die gespeicherten Zeilen ab dem
  // selben Tag des Vormonats, verdichtet wie in der App.
  let feed = [];
  try {
    feed = JSON.parse(K(`(() => {
      const ab = newsAnzeigeAb(${jetzt});
      _cache._stories = [...DB.values()]
        .filter(s => new Date(s.when).getTime() >= ab && new Date(s.when).getTime() <= ${jetzt}).sort(_storyFolge);
      _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
      const form = ${FORM_JS}, marken = ${MARKEN_JS};
      return JSON.stringify(getStoriesCache().map(s => ({id:s.id, form:form(s), marken:marken(s),
        when:new Date(s.when).getTime(), prio:s.prio, cat:s.cat, brk:_isBreaking(s), seite:_newsSeite(s),
        sorte:_newsSorte(s), neg:_newsIstNegativ(s), teile:((s.dataRef || {}).teile || []).length,
        member:((s.dataRef || {}).memberIds || []).length, title:s.title, desc:s.desc})));
    })()`));
  } catch(e){ console.error('Feed', tagKey(jetzt), String(e).slice(0, 160)); }
  const heute = feed.filter(s => tagKey(s.when) === tagKey(jetzt));
  proTag.push({tag:tagKey(jetzt), neu, feed:feed.length, heute:heute.length,
    spieltag:liga.some(m => tagKey(Date.parse(m.created_at)) === tagKey(jetzt))});
  // Jede Karte beim ersten Auftauchen zählen und, wo der Form noch
  // Beispiele fehlen, zeichnen: Karte und Blatt, wie die App sie zeigt.
  const zeichnen = [];
  // Eine Karte kann sich nach ihrem ersten Abend noch ändern, ohne dass
  // ihre Zeile sich ändert: der härteste Tag hängt sich am nächsten Lauf an
  // den Spieler des Tages, die Tafel wächst in Fassungen. Gezählt wird
  // deshalb je Karte einmal, ihre Marken aber an jedem Abend, an dem sie im
  // Feed steht, und gezeichnet wird, sobald sie eine Marke zum ersten Mal
  // zeigt.
  feed.forEach(s => {
    const f = formen[s.form] || (formen[s.form] = {n:0, brk:0, neg:0, uhr:{}, seite:{}, prio:{}, cat:{}, sorte:{},
      teileMax:0, member:0, ids:[], marken:{}, abgedeckt:[], beispiele:[]});
    if(!gesehen.has(s.id)){
      gesehen.add(s.id);
      f.n++; if(s.brk) f.brk++; if(s.neg) f.neg++;
      const d = new Date(s.when), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      f.uhr[hm] = (f.uhr[hm] || 0) + 1;
      f.seite[s.seite] = (f.seite[s.seite] || 0) + 1;
      f.prio[s.prio] = (f.prio[s.prio] || 0) + 1;
      f.cat[s.cat] = (f.cat[s.cat] || 0) + 1;
      f.sorte[s.sorte] = (f.sorte[s.sorte] || 0) + 1;
      if(f.ids.length < 6) f.ids.push(s.id);
    }
    f.teileMax = Math.max(f.teileMax, s.teile);
    if(s.member > 1 && !zusammen.has(s.id)){ zusammen.add(s.id); f.member++; }
    const hat = markenJe.get(s.id) || new Set();
    s.marken.forEach(k => { if(!hat.has(k)){ hat.add(k); f.marken[k] = (f.marken[k] || 0) + 1; } });
    markenJe.set(s.id, hat);
    const neuDa = s.marken.filter(k => f.abgedeckt.indexOf(k) < 0);
    if(neuDa.length && f.beispiele.length + zeichnen.filter(x => x.form === s.form).length < (GRENZE[s.form] || 4)){
      f.abgedeckt.push(...neuDa); zeichnen.push(s);
    }
  });
  if(zeichnen.length){
    const bilder = JSON.parse(K(`(() => {
      const st = getStoriesCache();
      return JSON.stringify(${JSON.stringify(zeichnen.map(s => s.id))}.map(id => {
        const s = st.find(x => x.id === id);
        if(!s) return null;
        let karte = '', blatt = '', ndKlasse = '';
        try { karte = _newsCardHtmlM2(s, false, false, ''); } catch(e){ karte = '<!-- ' + e + ' -->'; }
        try { openNewsDetail(id); } catch(e){}
        try { const nd = document.getElementById('nd'); blatt = nd.innerHTML || ''; ndKlasse = nd.className || ''; nd.innerHTML = ''; } catch(e){}
        return {id, karte, blatt, ndKlasse, dataRef:s.dataRef, title:s.title, desc:s.desc, ic:s.ic};
      }));
    })()`));
    bilder.forEach((b, i) => {
      if(!b) return;
      const s = zeichnen[i];
      formen[s.form].beispiele.push(Object.assign({marken:s.marken, when:s.when, prio:s.prio, brk:s.brk,
        seite:s.seite, neg:s.neg, tag:tagKey(s.when)}, b));
    });
  }
  if(proTag.length % 15 === 0) console.error('  … ' + tagKey(jetzt) + ' · ' + K('DB.size') + ' Zeilen · ' + Math.round((Date.now() - t0) / 1000) + ' s');
}

// ── Was in der Datenbank liegt ──────────────────────────────────────
const gebildet = {};
JSON.parse(K(`(() => { const form = ${FORM_JS};
  return JSON.stringify([...DB.values()].map(s => form(s))); })()`))
  .forEach(f => { gebildet[f] = (gebildet[f] || 0) + 1; });

// Je Anlass zwei gespeicherte Zeilen, wie der Generator sie schrieb: die
// meisten stehen im Feed nicht für sich, sondern als Zeile der Karte ihrer
// Partie oder der Tafel.
const roh = JSON.parse(K(`(() => { const form = ${FORM_JS}, je = {};
  [...DB.values()].sort((a, b) => new Date(b.when) - new Date(a.when)).forEach(s => {
    const f = form(s), l = je[f] || (je[f] = []);
    if(l.length < 2) l.push({id:s.id, title:s.title, desc:s.desc, when:new Date(s.when).getTime(), prio:s.prio,
      cat:s.cat, ic:s.ic, matchId:(s.dataRef || {}).matchId || null, brk:_isBreaking(s)});
  });
  return JSON.stringify(je); })()`));

// Die Zahlen, die im Code stehen — nicht abgeschrieben, sondern gelesen.
const konstanten = JSON.parse(K(`JSON.stringify({limits:NEWS_LIMITS, prio:STORY_PRIO, fenster:NEWS_FENSTER_TAGE,
  halten:NEWS_HALTEN_TAGE, abgemeldet:STORY_ABGEMELDET, pauseTage:NEWS_PAUSE_TAGE,
  seiten:NEWS_SEITEN, ehrungSchluss:EHRUNG_SCHLUSS, ehrungKopf:[...EHRUNG_KOPF],
  badgeMarken:NEWS_BADGE_MARKEN, badgeMarkenKlein:NEWS_BADGE_MARKEN_KLEIN,
  insOben:INSIGNIUM_OBEN})`));

fs.writeFileSync(path.join(__dirname, '.story-logik.json'), JSON.stringify({
  partien:liga.length, spieler:NAMES.length, erster:tagKey(ersterMs), letzter:tagKey(letzterMs),
  zeilen:K('DB.size'), formen, gebildet, roh, proTag, konstanten, ruheMs:RUHE_MS}));
console.log('Formen ' + Object.keys(formen).length + ' · Zeilen ' + K('DB.size') + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
