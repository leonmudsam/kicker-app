// Baut den Entwurf für Start, Reiter und Blätter: `node mockup/start/bau.js`
//
// Schreibt zwei Dateien:
//   app.html   — die ausgelieferte index.html mit den echten Partien der Liga
//                (tests/fixtures) und dem echten Startablauf: `loadAll` läuft,
//                der Stand des Geräts kommt nach 40 ms, die Datenbank ist eine
//                Attrappe, die nach einer wählbaren Zeit antwortet und nichts
//                speichert. `#heute&…` ist die App, wie sie ist, `#neu&…` mit
//                entwurf.css und entwurf-app.js.
//   index.html — die Vergleichsseite: heute und Entwurf nebeneinander und
//                bedienbar, mit Fall, Netz und Telefon zum Umschalten.
// In die App fließt davon nichts [CLAUDE.md §2].
const fs = require('fs');
const path = require('path');
const HIER = __dirname, WURZEL = path.join(HIER, '..', '..');

const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n, i) => '00000000-0000-4000-8000-' + String(i).padStart(12, '0'));
const packed = fs.readFileSync(path.join(WURZEL, 'tests', 'fixtures', 'matches.txt'), 'utf8').trim();
const MATCHES = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4 + k] === 0 ? 'atk' : 'def';
  return {id:'m' + String(i).padStart(4, '0'), a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3), score_a:f[8], score_b:f[9],
    winner:f[10] === 0 ? 'A' : 'B', exp_a:f[11] / 1000, created_at:new Date(f[12] * 1000).toISOString(), deltas:{}};
});
const TIERE = ['eagle', 'owl', 'unicorn', 'wolf', 'shark', null, 'wizard', 'moai', 'raccoon', 'monkey', 'eggplant', 'alien'];
const PLAYERS = NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:TIERE[i], created_at:'2026-05-01T00:00:00Z'}));
const SEASONS = [
  {id:'2026-08', label:'August 2026', start_date:'2026-07-31', end_date:'2026-08-31'},
  {id:'2026-07', label:'Juli 2026', start_date:'2026-06-30', end_date:'2026-07-31'},
  {id:'2026-06', label:'Juni 2026', start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-05', label:'Mai 2026', start_date:'2026-04-30', end_date:'2026-05-31'},
];
const NOW = new Date(2026, 7, 26, 21, 0, 0).getTime();
const VORABEND = new Date(2026, 7, 24, 22, 0, 0).getTime();

// ── Die Liga bis zum Abend des 25. ──────────────────────────────────────
// Stand des Geräts und Datenbank kennen dieselben Partien: der Entwurf
// handelt vom Öffnen, nicht davon, was seitdem gespielt wurde. Gelesen hat
// das Gerät zuletzt am Abend des 24. — die Stories des 25. sind ungelesen.
const bis = d => MATCHES.filter(m => new Date(m.created_at).getTime() < new Date(2026, 7, d).getTime()).length;
const nGelesen = bis(25), nLive = bis(26);

const rt = require(path.join(WURZEL, 'tests', 'runtime.js')).createRuntime();
const K = rt.K;
K(`players = ${JSON.stringify(PLAYERS)}; matches = ${JSON.stringify(MATCHES)}; seasons = ${JSON.stringify(SEASONS)};
  invalidateCache(); const _r = simulateEloWithSliders(matches); const _m = {};
  _r.history.forEach(h => { _m[h.matchId] = h.deltas; }); matches.forEach(x => { x.deltas = _m[x.id] || {}; }); invalidateCache(); 0`);
const MIT_DELTAS = JSON.parse(K('JSON.stringify(matches)'));
// Abgeschlossene Monate tragen ihr Podest wie in der Datenbank; der
// laufende noch nicht.
const SAISONS = JSON.parse(K(`JSON.stringify((() => { const g = getGlobalSim(); return seasons.map(s => {
  if(s.id === '2026-08') return Object.assign({}, s);
  const snap = g.seasonEndElos[s.id] || {}, pl = g.seasonPlayed[s.id] || {};
  const top = Object.keys(pl).filter(id => pl[id] > 0).map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0}))
    .sort((a, b) => b.elo - a.elo);
  return Object.assign({}, s, {top_elo:JSON.stringify(top.slice(0, 3)), player_id:top[0] ? top[0].id : null}); }); })())`));
// Die Stories, die das Gerät am Vorabend kannte — mit dem Code der App
// gerechnet, nicht nachgebaut.
rt.setNow(VORABEND);
K(`matches = matches.slice(0, ${nGelesen}); invalidateCache(); 0`);
const STORY_ZEILEN = JSON.parse(K(`JSON.stringify((_buildStories() || []).map(_storyToRow))`));
const STAND_NEUESTE = STORY_ZEILEN.reduce((mx, r) => Math.max(mx, new Date(r.event_at).getTime() || 0), 0);
console.log('Partien', nLive, '· Stories bis zum 24.', STORY_ZEILEN.length);

const DATEN = {players:PLAYERS, matches:MIT_DELTAS.slice(0, nLive), seasons:SAISONS,
  storyZeilen:STORY_ZEILEN, standNeueste:STAND_NEUESTE, now:NOW};

// ── Die App, wie sie ausgeliefert wird ─────────────────────────────────
const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
// Der Start gehört der Attrappe: sie setzt erst den Stand und ruft dann
// `loadAll` selbst — derselbe Ablauf wie in der App, nur mit bekannter Zeit.
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*entwurf*/');
if(code === blocks[0]) throw new Error('Startzeile nicht gefunden');
code = code.replace(/navigator\.serviceWorker\.register\('sw\.js'\)/, 'Promise.resolve()');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const fonts = (kopf.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/) || [''])[0];
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
const bodyHtml = html.slice(html.indexOf('>', bodyStart) + 1, html.indexOf('<script', bodyStart))
  .replace(/src="icon\.png"/g, 'src="../../icon.png"');
const lies = n => fs.readFileSync(path.join(HIER, n), 'utf8');

const appHtml = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Kicker Liga — Start im Entwurf</title>
<!-- Gebaut von bau.js aus der ausgelieferten index.html. Die Datenbank ist
     eine Attrappe: sie antwortet mit den echten Partien der Liga aus
     tests/fixtures und speichert nichts. -->
${fonts}
${styles}
<style>${lies('entwurf.css')}</style>
</head><body>${bodyHtml}
<script>window.__DATEN = ${JSON.stringify(DATEN)};</script>
<script>${lies('sim.js')}</script>
<script>${code}</script>
<script>${lies('entwurf-app.js')}</script>
<script>window.__start();</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'app.html'), appHtml);
console.log('app.html', Math.round(appHtml.length / 1024), 'KB');

// ── Die Vergleichsseite ───────────────────────────────────────────────
const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ABLAUF = require(path.join(HIER, 'ablauf.js'));
const zeitleiste = ABLAUF.zeitleiste.map(([t, heute, neu]) => `<tr><th class="num">${esc(t)}</th><td>${esc(heute)}</td><td>${esc(neu)}</td></tr>`).join('');
const teile = ABLAUF.teile.map(([wo, heute, neu, tel]) => `<article class="pf-a"><h3>${esc(wo)}</h3>
  <div class="pf-a-z"><span>Heute</span><p>${esc(heute)}</p></div>
  <div class="pf-a-z neu"><span>Entwurf</span><p>${esc(neu)}</p></div>
  ${tel ? `<div class="pf-a-z tel"><span>Telefon</span><p>${esc(tel)}</p></div>` : ''}</article>`).join('');
const regeln = ABLAUF.regeln.map(([r, g]) => `<li><b>${esc(r)}</b> ${esc(g)}</li>`).join('');

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Start im Entwurf</title>
<!-- Gebaut von bau.js. Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
${fonts}
${styles}
<style>${lies('seite.css')}</style></head><body><main>
<h1>Öffnen, Reiter, Blätter im Entwurf</h1>
<p class="pf-unter">Die App, wie sie jetzt startet, und der Entwurf — beide mit dem echten Startablauf: das Telefon übersetzt das Skript, zeichnet den Stand vom letzten Öffnen und fragt dann die Datenbank. Im Entwurf überbrückt ein Startbild die Ladezeit; das Zeichen fliegt an seinen Platz, und die App baut sich auf: untere Leiste, Kopf, Wähler, Karten. Über Platz 1, 2 und 3 zieht ein Licht in ihrem Metall, ungelesene Stories werden hervorgehoben, und jeder Reiter baut sich beim Betreten auf. Wer sofort tippt, bekommt keine Vorführung: jede Berührung beendet sie.</p>
<div class="pf-steuer">
  <label>Start <select id="sFall">
    <option value="pause">Nach einer Pause</option>
    <option value="kurz">Gerade erst offen gewesen</option>
    <option value="erst">Erster Start, nichts gespeichert</option></select></label>
  <label>Netz <select id="sNetz"><option value="400">schnell</option><option value="1400" selected>normal</option><option value="3500">langsam</option></select></label>
  <label><input type="checkbox" id="sLangsam"> Älteres Telefon</label>
  <label><input type="checkbox" id="sRuhe"> Bewegung aus</label>
  <button type="button" id="sStart" class="pf-k an">Neu öffnen</button>
</div>
<p class="pf-hinweis">Beide Fassungen warten zuerst so lange, wie ein Telefon das Skript übersetzt: 450 ms, mit „Älteres Telefon“ 900 ms — dazu rechnet dann jeder Reiterwechsel 350 ms. Zum Ansehen der Reiter unten in der Leiste wechseln, zum Feed oben auf „News“ tippen.</p>
<div class="pf-seg" role="tablist"><button type="button" class="an" data-zeige="heute">Heute</button><button type="button" data-zeige="neu">Entwurf</button></div>
<div class="pf-tel">
  <figure class="heute zeigt"><figcaption>Heute</figcaption><iframe id="fHeute" title="Heute"></iframe></figure>
  <figure class="neu"><figcaption>Entwurf</figcaption><iframe id="fNeu" title="Entwurf"></iframe></figure>
</div>
<h2>Der Ablauf beim Öffnen</h2>
<div class="pf-tab"><table><thead><tr><th>Zeit</th><th>Heute</th><th>Entwurf</th></tr></thead><tbody>${zeitleiste}</tbody></table></div>
<h2>Die Regeln</h2>
<ul class="pf-regeln">${regeln}</ul>
<h2>Was sich ändert</h2>
<div class="pf-liste">${teile}</div>
</main>
<script>${lies('seite.js')}</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'index.html'), seite);
console.log('index.html', Math.round(seite.length / 1024), 'KB');
