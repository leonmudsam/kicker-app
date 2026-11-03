// Was die App heute über jede Partie sagt: Kalendertag für Kalendertag läuft
// der echte Generator über die echten Partien (wie `story-logik-lauf.js`),
// und am Abend jedes Spieltags wird für jede seiner Partien die Karte
// gelesen, die der Feed zeigt — Schlagzeile, Text und jede Zeile ihres
// Bündels, so, wie `_satzZeile` sie schreibt. Die Entwürfe der Köpfe und
// Füße zeigen damit nicht nur einen Anlass, sondern alles, was die Partie
// trägt.
//
//   node tools/build.mjs && node mockup/kopf-fuss-anlaesse.js && node mockup/kopf-fuss-lauf.js && node mockup/kopf-fuss-seite.js
//
// Ergebnis ist `.kopf-fuss-anlaesse.json` (nicht eingecheckt): je Partie
// {titel, text, teile:[{typ, titel, html, ic, neg, brk}]}. `html` ist die
// Zeile, wie das Sammelband der App sie setzt (`_newsBetont`), samt Zeichen.
'use strict';
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
// Wie `story-logik-lauf.js`: die Saisontabelle trägt an jedem Tag genau die
// Monate, die bis dahin zu sind.
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

const tagKey = ms => { const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const spieltage = new Set(liga.map(m => tagKey(Date.parse(m.created_at))));
const je = {};
const t0 = Date.now();
let n = 0;
for(let t = new Date(tagKey(ersterMs) + 'T00:00:00').getTime(); t <= letzterMs + 864e5; t += 864e5){
  const tag = new Date(t), jetzt = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), 23, 59, 40).getTime();
  setNow(jetzt);
  try {
    K(`(() => {
      matches = ALLE.filter(m => new Date(m.created_at).getTime() <= ${jetzt});
      seasons = ALLE_SAISONS.filter(s => seasonEnd(s.id).getTime() < ${jetzt});
      invalidateCache();
      _cache._stories = [...DB.values()].sort(_storyFolge);
      _cache._buildStoriesKey = null; _cache._buildStoriesResult = null;
      _buildStories().forEach(s => { if(!DB.has(s.id)) DB.set(s.id, s); });
      return 0;
    })()`);
  } catch(e){ console.error('Generator', tagKey(jetzt), String(e).slice(0, 160)); }
  if(!spieltage.has(tagKey(jetzt))) continue;
  // Die Karte jeder Partie dieses Tages, wie der Feed sie am Abend zeigt.
  // Alle Zeilen, nicht die ersten vier: die Entwürfe sollen zeigen, was
  // eine Partie trägt, auch wenn es mehr ist, als die Karte heute zeigt.
  try {
    const heute = JSON.parse(K(`(() => {
      const ab = newsAnzeigeAb(${jetzt});
      _cache._stories = [...DB.values()]
        .filter(s => new Date(s.when).getTime() >= ab && new Date(s.when).getTime() <= ${jetzt}).sort(_storyFolge);
      _cache._consolFrom = null; _cache._frischVon = null; _cache._snapshotConsolFrom = null;
      const tk = ${JSON.stringify(tagKey(jetzt))}, aus = {};
      getStoriesCache().forEach(s => {
        const d = s.dataRef || {};
        if(!d.matchId || (d.type !== 'spiel' && !(d.type === 'sammel' && d.quelle === 'spiel'))) return;
        if(tagKey(new Date(s.when)) !== tk) return;
        const teile = (d.teile || []).map(t => ({typ:t.typ || t.type || '', titel:t.titel || '', ic:t.ic || '',
          neg:!!t.neg, brk:!!t.brk, klasse:t.klasse || '', wert:t.wert || '', marke:t.marke || '',
          html:'<i class="nf-sam-i">' + svgI(t.ic || 'chartBar') + '</i><span>' + _newsBetont(t.titel || '') + '</span>'}));
        aus[d.matchId] = {titel:s.title, text:s.desc || '', brk:_isBreaking(s), teile};
      });
      return JSON.stringify(aus);
    })()`));
    Object.assign(je, heute);
    n += Object.keys(heute).length;
  } catch(e){ console.error('Feed', tagKey(jetzt), String(e).slice(0, 160)); }
  if(n && n % 100 < 6) console.error('  … ' + tagKey(jetzt) + ' · ' + n + ' Partien · ' + Math.round((Date.now() - t0) / 1000) + ' s');
}
fs.writeFileSync(path.join(__dirname, '.kopf-fuss-anlaesse.json'), JSON.stringify(je));
const typen = {};
Object.values(je).forEach(k => k.teile.forEach(t => { typen[t.typ] = (typen[t.typ] || 0) + 1; }));
console.log(Object.keys(je).length + ' Partien · ' + Math.round((Date.now() - t0) / 1000) + ' s');
console.log(JSON.stringify(typen));
