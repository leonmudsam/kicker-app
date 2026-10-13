// Baut den Entwurf für das Spielerprofil: `node mockup/profil/bau.js`
//
// Schreibt zwei Dateien:
//   app.html   — die ausgelieferte index.html mit den echten Partien der Liga
//                (tests/fixtures), ohne Datenbank: Supabase ist eine Attrappe,
//                `fetch` antwortet nie, `loadAll` läuft nicht. `#heute:<id>`
//                öffnet das Profil, wie es ist, `#neu:<id>` mit entwurf.css.
//   index.html — die Vergleichsseite: heute und Entwurf nebeneinander und
//                bedienbar, ein Spieler je Rang, darunter jede Änderung mit
//                ihrem Grund und dem, was sie auf dem Telefon kostet.
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
// Ein paar Gesichter, damit das Profil aussieht wie in der Liga: dort trägt
// fast jeder ein Tier statt Initialen.
const TIERE = ['eagle', 'owl', 'unicorn', 'wolf', 'shark', null, 'wizard', 'moai', 'raccoon', 'monkey', 'eggplant', 'alien'];
const PLAYERS = NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:TIERE[i], created_at:'2026-05-01T00:00:00Z'}));
const SEASONS = [
  {id:'2026-05', label:'Mai 2026', start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026', start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026', start_date:'2026-06-30', end_date:'2026-07-31'},
  {id:'2026-08', label:'August 2026', start_date:'2026-07-31', end_date:'2026-08-31'},
];
const NOW = new Date(2026, 7, 26, 21, 0, 0).getTime();

// ── Die App, wie sie ausgeliefert wird ─────────────────────────────────
const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
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

const BOOT = `(function(){
  var stub = function(){ return new Proxy(function(){}, {get:function(_,p){return p==='then'?undefined:stub()}, apply:function(){return stub()}}); };
  window.supabase = {createClient: function(){ return {from: function(){return stub()}, channel: function(){return stub()}, removeChannel:function(){}, rpc: function(){return stub()}}; }};
  window.fetch = function(){ return new Promise(function(){}); };
  var RD = Date, N = ${NOW};
  window.Date = class extends RD { constructor(...a){ a.length?super(...a):super(N); } static now(){ return N; } };
})();`;
const SETUP = `
  loadAll = function(){ return Promise.resolve(); }; checkForUpdate = function(){};
  players = ${JSON.stringify(PLAYERS)}; matches = ${JSON.stringify(MATCHES)}; seasons = ${JSON.stringify(SEASONS)};
  unlocked = true; invalidateCache();
  const _rc = simulateEloWithSliders(matches); const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
  matches.forEach(m => { m.deltas = _d[m.id] || {}; }); invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s => { const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
    const top = Object.keys(pl).filter(id => pl[id] > 0).map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0}))
      .sort((a,b) => b.elo - a.elo);
    s.top_elo = JSON.stringify(top.slice(0,3)); s.player_id = top[0] ? top[0].id : null; });
  invalidateCache();
  setConn(activePlayers().length+' Spieler · '+matches.length+' Matches','ok');
  render(); 'bereit'`;

const appHtml = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Kicker Liga — Profil im Entwurf</title>
<!-- Gebaut von bau.js aus der ausgelieferten index.html. Ohne Datenbank:
     die Partien sind die echten der Liga aus tests/fixtures. -->
${fonts}
${styles}
<style>${fs.readFileSync(path.join(HIER, 'entwurf.css'), 'utf8')}</style>
</head><body>${bodyHtml}
<script>${BOOT}</script>
<script>${code}</script>
<script>${fs.readFileSync(path.join(HIER, 'entwurf-app.js'), 'utf8')}</script>
<script>window.__k.eval(${JSON.stringify(SETUP)}); window.__nachSetup();</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'app.html'), appHtml);
console.log('app.html', Math.round(appHtml.length / 1024), 'KB');

// ── Ein Spieler je Rang, aus denselben Partien ─────────────────────────
const {K} = require(path.join(WURZEL, 'tests', 'runtime.js')).createRuntime();
K(`players = ${JSON.stringify(PLAYERS)}; matches = ${JSON.stringify(MATCHES)}; seasons = ${JSON.stringify(SEASONS)};
  invalidateCache(); const _r = simulateEloWithSliders(matches); const _m = {};
  _r.history.forEach(h => { _m[h.matchId] = h.deltas; }); matches.forEach(x => { x.deltas = _m[x.id] || {}; }); invalidateCache(); 0`);
const RAENGE = JSON.parse(K(`JSON.stringify(RANKS.map(r => {
  const p = players.find(x => (getPlayerRank(x.id) || {}).label === r.label);
  return p ? {rang:r.label, id:p.id, name:p.name, ton:rangTon(p.id).c, stufe:prestigeOf(p.id).insignie.name} : null;
}).filter(Boolean))`));
console.log('Ränge', RAENGE.map(r => r.rang + ' ' + r.name).join(' · '));

// ── Was sich ändert ───────────────────────────────────────────────────
// [Bauteil, heute, im Entwurf, auf dem Telefon]
const AENDERUNGEN = [
  ['Grundsatz', 'Das Profil lebt, wo etwas gewonnen ist: Lauflicht über Titeln und Rekorden, Licht am Rand des Kopfs, die Kurve, die sich zeichnet.',
   'Das bleibt. Dazu ein Motiv für alles Verliehene: was jemand bekommen hat, hängt als Band oder Wimpel — Beiname, Liga-Titel, Platz 1 bis 3 einer Saison, der Rang.',
   'Bänder und Wimpel sind Formen aus clip-path und Verläufen, einmal gemalt.'],
  ['Beiname', 'Eine goldene Pille unter dem Namen, gestrichelt, solange der Monat läuft.',
   'Ein Ordensband mit zwei eingekerbten Enden, die etwas tiefer hängen. Läuft der Monat noch, sind seine Kanten gestrichelt. Beim Öffnen entrollt es sich einmal.',
   'Einmal beim Öffnen, 0,55 s, nur transform und opacity. Kein Schimmer: der Kopf lebt von Aura und Insignium.'],
  ['Liga Titel', 'Kacheln mit goldenem oder blauem Rand.',
   'Wimpel an einer Stange: oben zwei Ösen, unten ein Schwalbenschwanz, das Zeichen als Medaillon. Gold für Spieler der Saison, Blau für das Team. Das Lauflicht läuft weiter darüber.',
   '—'],
  ['Saisonverlauf', 'Platz 1 trägt Gold und einen Punkt oben, 2 und 3 einen Rand.',
   'Platz 1 bis 3 hängen an ihrem Medaillenband in Gold, Silber oder Bronze, die Platzzahl im selben Ton.',
   '—'],
  ['Karriere-Rang', 'Der Rangname in Rangfarbe.',
   'Der Rangname steht auf einem Band in seiner Farbe — dasselbe Motiv wie das Ordensband, aber in der Farbe, die „ich“ heißt [§C25].',
   '—'],
  ['Liga-Rekorde', 'Das Zeichen in einem Kästchen.',
   'Das Zeichen eines gehaltenen Rekords sitzt auf einer goldenen Rosette, der Form einer Ehrenschleife. Schattenseiten bleiben eckig: sie sind nichts, was man verliehen bekommt.',
   '—'],
  ['Beziehungen', 'Gesicht, Name, Quote, Balken.',
   'Das Gesicht trägt den Ring seiner Richtung, Grün oder Rot, wie der Balken darunter.',
   '—'],
  ['Siegesserien', 'Die laufende Serie mit Kante in ihrer Richtung.',
   'Ab drei Siegen in Folge steht das Feuer neben der Zahl.',
   '—'],
  ['Überschriften', 'Die Zahl rechts als Text.',
   'Die Zahl als kleine Marke, wie die Zähler in den Reitern.',
   '—'],
];

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const knoepfe = RAENGE.map((r, i) => `<button type="button" class="pf-r${i === 0 ? ' an' : ''}" data-id="${esc(r.id)}" style="--t:${esc(r.ton)}">`
  + `<i></i><b>${esc(r.rang)}</b><span>${esc(r.name)} · ${esc(r.stufe)}</span></button>`).join('');
const liste = AENDERUNGEN.map(([wo, heute, neu, tel]) => `<article class="pf-a"><h3>${esc(wo)}</h3>
  <div class="pf-a-z"><span>Heute</span><p>${esc(heute)}</p></div>
  <div class="pf-a-z neu"><span>Entwurf</span><p>${esc(neu)}</p></div>
  ${tel !== '—' ? `<div class="pf-a-z tel"><span>Telefon</span><p>${esc(tel)}</p></div>` : ''}</article>`).join('');
const erster = RAENGE[0] ? RAENGE[0].id : IDS[0];

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Profil im Entwurf</title>
<!-- Gebaut von bau.js. Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
${fonts}
${styles}
<style>
body{padding:24px 16px 80px;overflow-x:hidden}
body::before{display:none}
main{max-width:1100px;margin:0 auto;position:relative;z-index:1}
h1{font-family:'Archivo Black',sans-serif;font-weight:400;font-size:clamp(24px,5vw,38px);letter-spacing:-.02em;line-height:1.1}
.pf-unter{color:var(--ink2);max-width:760px;margin-top:10px;font-size:15px;line-height:1.5}
.pf-wahl{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 14px}
.pf-r{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:9px 12px 9px 26px;position:relative;
  border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink2);cursor:pointer;text-align:left}
.pf-r i{position:absolute;left:10px;top:13px;width:9px;height:9px;border-radius:50%;background:var(--t);box-shadow:0 0 8px var(--t)}
.pf-r b{font-size:13px;color:var(--ink)}
.pf-r span{font-family:'Sometype Mono',monospace;font-size:10px;color:var(--muted)}
.pf-r.an{border-color:var(--t);background:linear-gradient(180deg,color-mix(in srgb,var(--t) 16%,transparent),transparent),var(--surface)}
.pf-opt{display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--ink2);margin-bottom:16px}
.pf-opt label{display:flex;gap:6px;align-items:center;cursor:pointer}
.pf-seg{display:none;gap:4px;padding:4px;border-radius:12px;background:var(--surface);border:1px solid var(--line);margin-bottom:12px}
.pf-seg button{flex:1;padding:8px;border-radius:9px;border:0;background:none;color:var(--muted);font-weight:700;cursor:pointer}
.pf-seg button.an{background:var(--surface3);color:var(--ink)}
.pf-tel{display:grid;grid-template-columns:repeat(2,390px);gap:28px;justify-content:center}
.pf-tel figure{margin:0}
.pf-tel figcaption{font-family:'Sometype Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0 0 8px 4px}
.pf-tel figure.neu figcaption{color:var(--acid)}
.pf-tel iframe{width:390px;height:820px;border:1px solid var(--line2);border-radius:34px;background:var(--bg);display:block;
  box-shadow:0 30px 60px -30px rgba(0,0,0,.9)}
h2{font-family:'Archivo Black',sans-serif;font-weight:400;font-size:22px;margin:44px 0 14px}
.pf-liste{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.pf-a{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.pf-a h3{font-size:15px;margin:0 0 10px}
.pf-a-z{display:grid;grid-template-columns:62px 1fr;gap:8px;margin-top:8px}
.pf-a-z span{font-family:'Sometype Mono',monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-top:3px}
.pf-a-z.neu span{color:var(--acid)}
.pf-a-z.tel span{color:var(--blue)}
.pf-a-z p{margin:0;font-size:13px;line-height:1.5;color:var(--ink2)}
@media(max-width:860px){
  .pf-seg{display:flex}
  .pf-tel{grid-template-columns:1fr}
  .pf-tel figure{display:none}
  .pf-tel figure.zeigt{display:block}
  .pf-tel figcaption{display:none}
  .pf-tel iframe{width:100%;height:78vh;border-radius:24px}
}
</style></head><body><main>
<h1>Das Spielerprofil im Entwurf</h1>
<p class="pf-unter">Links die App, wie sie jetzt ist — mit dem Lauflicht über dem Gewonnenen und dem Licht am Rand des Kopfs. Rechts der nächste Schritt: was verliehen ist, hängt als Band oder Wimpel. Der Beiname als Ordensband, die Liga-Titel als Wimpel an einer Stange, Platz 1 bis 3 einer Saison an ihrem Medaillenband, der Rang auf einem Band in seiner Farbe. Beide mit den echten Partien und bedienbar.</p>
<div class="pf-wahl">${knoepfe}</div>
<div class="pf-opt"><label><input type="checkbox" id="pfRuhe"> Bewegung aus</label><span>Die Profile lassen sich scrollen und antippen wie in der App.</span></div>
<div class="pf-seg"><button type="button" class="an" data-seite="neu">Entwurf</button><button type="button" data-seite="heute">Heute</button></div>
<div class="pf-tel">
  <figure data-seite="heute"><figcaption>Heute</figcaption><iframe src="app.html#heute:${esc(erster)}" title="Das Profil heute"></iframe></figure>
  <figure class="neu zeigt" data-seite="neu"><figcaption>Entwurf</figcaption><iframe src="app.html#neu:${esc(erster)}" title="Das Profil im Entwurf"></iframe></figure>
</div>
<h2>Was sich ändert</h2>
<div class="pf-liste">${liste}</div>
</main>
<script>
(function(){
  var fr = [].slice.call(document.querySelectorAll('.pf-tel iframe'));
  function an(msg){ fr.forEach(function(f){ try { f.contentWindow.postMessage(msg, '*'); } catch(e){} }); }
  document.querySelectorAll('.pf-r').forEach(function(b){
    b.onclick = function(){
      document.querySelectorAll('.pf-r').forEach(function(x){ x.classList.toggle('an', x === b); });
      an({spieler:b.getAttribute('data-id')});
    };
  });
  document.getElementById('pfRuhe').onchange = function(e){ an({ruhe:e.target.checked}); };
  document.querySelectorAll('.pf-seg button').forEach(function(b){
    b.onclick = function(){
      var s = b.getAttribute('data-seite');
      document.querySelectorAll('.pf-seg button').forEach(function(x){ x.classList.toggle('an', x === b); });
      document.querySelectorAll('.pf-tel figure').forEach(function(f){ f.classList.toggle('zeigt', f.getAttribute('data-seite') === s); });
    };
  });
})();
</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'index.html'), seite);
console.log('index.html', Math.round(seite.length / 1024), 'KB');
