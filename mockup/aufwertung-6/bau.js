// Baut die Entwurfsseite der sechsten Aufwertung: `node mockup/aufwertung-6/bau.js`
//
// Schreibt zwei Dateien:
//   app.html   — die ausgelieferte index.html mit den echten Partien der Liga
//                (tests/fixtures), ohne Datenbank: Supabase ist eine Attrappe,
//                `fetch` antwortet nie, `loadAll` läuft nicht. Mit `#neu` trägt
//                sie die Effekte aus entwurf.css und den Zeichensatz aus
//                zeichen.js.
//   index.html — die Vergleichsseite: beide Fassungen nebeneinander und
//                bedienbar, darunter die Effekte und die Zeichen im Einzelnen.
// In die App fließt davon nichts [CLAUDE.md §2].
const fs = require('fs');
const path = require('path');
const HIER = __dirname, WURZEL = path.join(HIER, '..', '..');
const {NEU, WECHSEL, FAMILIEN, BEDIENUNG} = require('./zeichen.js');

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
const PLAYERS = NAMES.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5, avatar_id:null, created_at:'2026-05-01T00:00:00Z'}));
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
// Die Bedienung setzt manche Zeichen direkt. Im Entwurf nimmt sie das neue,
// heute das alte — eine Datei für beide Fenster.
BEDIENUNG.forEach(([ort, alt, neu, , stelle]) => {
  const n = code.split(stelle).length - 1;
  if(!n) throw new Error('Stelle nicht gefunden: ' + ort);
  const a = alt.split(', '), b = neu.split(', ');
  let ersatz = stelle;
  a.forEach((k, i) => { ersatz = ersatz.split(`'${k}'`).join(`(window.__NEU?'${b[i]}':'${k}')`); });
  code = code.split(stelle).join(ersatz);
});
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const fonts = (kopf.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/) || [''])[0];
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
// Das Symbol liegt zwei Ebenen höher; eine Kopie hier wäre eine zweite Quelle.
const bodyHtml = html.slice(html.indexOf('>', bodyStart) + 1, html.indexOf('<script', bodyStart)).replace(/src="icon\.png"/g, 'src="../../icon.png"');

const BOOT = `(function(){
  window.__NEU = location.hash === '#neu';
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
  _cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
  setConn(activePlayers().length+' Spieler · '+matches.length+' Matches','ok');
  render(); 'bereit'`;

const appHtml = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Kicker Liga — Entwurf</title>
<!-- Gebaut von bau.js aus der ausgelieferten index.html. Ohne Datenbank:
     die Partien sind die echten der Liga aus tests/fixtures. -->
${fonts}
${styles}
<style>${fs.readFileSync(path.join(HIER, 'entwurf.css'), 'utf8')}</style>
</head><body>${bodyHtml}
<script>${BOOT}</script>
<script>${code}</script>
<script>window.__ZEICHEN = ${JSON.stringify({NEU, WECHSEL})};</script>
<script>${fs.readFileSync(path.join(HIER, 'entwurf-app.js'), 'utf8')}</script>
<script>window.__k.eval(${JSON.stringify(SETUP)}); window.__nachSetup();</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'app.html'), appHtml);
console.log('app.html', Math.round(appHtml.length / 1024), 'KB');

// ── Die Zeichen: wer trägt welches, heute und im Entwurf ────────────────
const {K} = require(path.join(WURZEL, 'tests', 'runtime.js')).createRuntime();
const roh = JSON.parse(K(`JSON.stringify((()=>{
  const u = [];
  const add = (sys, id, name, ic, sinn) => { if(ic) u.push({sys, id, name, ic, sinn:String(sinn || '').replace(/<[^>]+>/g, '')}); };
  Object.entries(AW_IC).forEach(([k,ic]) => add('Award', k, (AWARD_META[k]||{}).title || k, ic, (AWARD_META[k]||{}).why));
  BADGES.forEach(b => add('Badge', b.id, b.name, b.ic, b.desc));
  DISZIPLINEN.forEach(d => add(d.monat ? 'Monatschronik' : 'Rekord', d.id, d.name, d.ic, (d.monat || d.allzeit || {}).cond));
  Object.entries(NEWS_CATEGORIES).forEach(([k,c]) => add('News', k, c.label, c.ic, 'Rubrik im Feed'));
  RANKS.forEach(x => add('Rang', x.label, x.label, x.icon, 'Rangstufe'));
  Object.entries(AV_RINGS).forEach(([k,x]) => add('Ring', k, x.label, x.ic, 'Ring am Avatar'));
  [0.9,0.7,0.57,0.5,0.43,0.3,0.1].forEach(a => { const p = posClassify(a); add('Position', p.label, p.label, p.icon, 'Rolle in der Positionen-Ansicht'); });
  Object.entries(SP_ANLASS).forEach(([k,x]) => add('Spieltag', k, x.name || x.label || k, x.ic, 'Anlass einer Partie im Feed'));
  return {u, icons:ICONS};
})())`));
const ICONS_ALT = roh.icons;
const W = {}; WECHSEL.forEach(w => { W[w[0] + '/' + w[1]] = w; });
const nutz = roh.u.map(x => ({...x, neu:(W[x.sys + '/' + x.id] || [])[2] || x.ic}));
const zahl = liste => { const je = {}; liste.forEach(x => { je[x] = (je[x] || 0) + 1; }); return je; };
const bedien = [];
BEDIENUNG.forEach(([ort, alt, neu, grund]) => { const a = alt.split(', '), b = neu.split(', ');
  a.forEach((k, i) => bedien.push({sys:'Bedienung', id:ort + i, name:ort, ic:k, neu:b[i], sinn:grund})); });
const jeAlt = zahl(nutz.map(x => x.ic)), jeNeu = zahl(nutz.concat(bedien).map(x => x.neu));
const mehrAlt = Object.keys(jeAlt).filter(k => jeAlt[k] > 1);
const mehrNeu = Object.keys(jeNeu).filter(k => jeNeu[k] > 1);
const doppeltNeu = mehrNeu.filter(k => !FAMILIEN[k]);
if(doppeltNeu.length) throw new Error('Zeichen mit zwei Bedeutungen im Entwurf: ' + doppeltNeu.join(', '));
console.log('Verwendungen', nutz.length, 'Zeichen heute', Object.keys(jeAlt).length, 'mehrfach', mehrAlt.length,
  '· Entwurf', Object.keys(jeNeu).length, 'Familien', mehrNeu.length, 'neue Zeichnungen', Object.keys(NEU).length);

// Doppelt definierte Schlüssel im Quelltext: der zweite überschreibt den
// ersten still.
const quelle = fs.readFileSync(path.join(WURZEL, 'src', 'js', '02-icons.js'), 'utf8');
const schl = [...quelle.matchAll(/^\s{2}([A-Za-z0-9]+)\s*:/gm)].map(x => x[1]);
const doppelSchl = [...new Set(schl.filter((k, i) => schl.indexOf(k) !== i))];

const svg = (p, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${p || ''}</svg>`;
const ALLE = Object.assign({}, ICONS_ALT, NEU);
const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const zeile = x => {
  const w = W[x.sys + '/' + x.id];
  return `<tr class="${w ? 'pg-' + w[3] : ''}"><td><span class="pg-sys">${esc(x.sys)}</span> ${esc(x.name)}<small>${esc(x.sinn)}</small></td>
    <td class="pg-ic">${svg(ALLE[x.ic])}<code>${esc(x.ic)}</code><small>${jeAlt[x.ic] > 1 ? 'trägt heute ' + jeAlt[x.ic] + ' Dinge' : ''}</small></td>
    <td class="pg-ic ${w ? 'pg-neu' : ''}">${svg(ALLE[x.neu])}<code>${esc(x.neu)}</code><small>${w ? (w[3] === 'neu' ? 'eigene Zeichnung' : 'dieselbe Sache: ' + esc(w[4] || FAMILIEN[x.neu] || '')) : ''}</small></td></tr>`;
};
// Nur Einträge, die heute ein Zeichen mit anderen teilen oder sich ändern.
const betroffen = nutz.filter(x => jeAlt[x.ic] > 1 || W[x.sys + '/' + x.id]);
const gruppen = {};
betroffen.forEach(x => { (gruppen[x.ic] = gruppen[x.ic] || []).push(x); });
const gruppenHtml = Object.entries(gruppen).sort((a, b) => b[1].length - a[1].length).map(([ic, l]) =>
  `<tbody><tr class="pg-grp"><th colspan="3"><span>${svg(ALLE[ic])}<code>${esc(ic)}</code> heute für ${l.length === 1 ? 'einen Eintrag' : l.length + ' Einträge'}</span></th></tr>${l.map(zeile).join('')}</tbody>`).join('');
const familienHtml = mehrNeu.sort((a, b) => jeNeu[b] - jeNeu[a]).map(k => `<div class="pg-fam"><span class="zk">${svg(ALLE[k])}</span>
  <div><b>${esc(FAMILIEN[k])}</b><small>${nutz.concat(bedien).filter(x => x.neu === k).map(x => esc(x.sys + ' · ' + x.name)).join(', ')}</small></div></div>`).join('');
const bedienHtml = BEDIENUNG.map(([ort, alt, neu, grund]) => `<tr class="pg-neu"><td>${esc(ort)}<small>${esc(grund)}</small></td>
  <td class="pg-ic">${alt.split(', ').map(k => svg(ALLE[k]) + '<code>' + esc(k) + '</code> ').join('')}</td>
  <td class="pg-ic pg-neu">${neu.split(', ').map(k => svg(ALLE[k]) + '<code>' + esc(k) + '</code> ').join('')}</td></tr>`).join('');
const TOENE = ['', 'gold', 'gruen', 'blau', 'viol', 'rot', 'bronze'];
const galerieHtml = Object.keys(NEU).map((k, i) => `<figure class="pg-gal"><span class="zk g ${TOENE[i % TOENE.length]}">${svg(NEU[k])}</span>
  <span class="zk k ${TOENE[i % TOENE.length]}">${svg(NEU[k])}</span><span class="pg-nackt">${svg(NEU[k])}</span><figcaption>${esc(k)}</figcaption></figure>`).join('');
const ZWILLINGE = [
  ['chartUp', 'trendUp', 'formGipfel', 'Dieselbe Linie zweimal. „Der Formgipfel“ bekommt eine Linie mit Gipfelpunkt; trendUp bleibt „Der Nachzügler“.'],
  ['chartDown', 'trendDown', 'sollMinus', 'Dieselbe Linie zweimal. „Das Untersoll“ wird das Spiegelbild von „Das Übersoll“.'],
  ['weight', 'weightSmall', 'weight', 'Zwei Hanteln für dieselbe Sache: „Carry“ nimmt die Hantel von „Carry-King“, die kleine fällt weg.'],
  ['brick', 'concreteWall', 'betonmauer', 'Zwei Mauern. Die Betonmauer ist ein Duo-Award und zeigt jetzt zwei Köpfe hinter der Mauer.'],
  ['rainCloud', 'blackDay', 'schwarzerTag', 'Zwei Regenwolken. „Schwarzer Tag“ wird eine verdunkelte Sonne.'],
  ['brokenHeart', 'heartBroken', 'pille', 'Zwei gebrochene Herzen. Die 9:10-Pleite wird zur bitteren Pille; das Herz bleibt „Schlechtestes Team“.'],
  ['overtake', 'sideSwap', 'ueberholen', 'Zwei Pfeilpaare. Das Überholmanöver fährt im Bogen um den Gegner herum.'],
  ['rocket', 'edit', 'rakete', 'Die Rakete las sich bei 14 px als Stift. Neu gezeichnet mit Rumpf, Fenster und Flossen.'],
];
const zwillingeHtml = ZWILLINGE.map(([a, b, n, t]) => `<div class="pg-zw"><span>${svg(ALLE[a])}<code>${a}</code></span><span>${svg(ALLE[b])}<code>${b}</code></span><span class="pg-pf">→</span><span class="pg-neu">${svg(ALLE[n])}<code>${n}</code></span><p>${esc(t)}</p></div>`).join('');

const EFFEKTE = [
  ['E1', 'Platz 1 bis 3', 'Über die Metallkante links läuft alle neun Sekunden ein Licht von oben nach unten, versetzt um eine Drittelsekunde je Platz. Gold, Silber, Bronze wie die Kante.', 'transform: scaleY, opacity · endlos mit langer Pause'],
  ['E2', 'Kopfzahlen', 'Spieler, Matches und Top-Elo zählen beim ersten Zeigen einmal hoch (0,9 s). Danach stehen sie — auch beim Wechsel zurück.', 'Text, einmal je Start'],
  ['E3', 'Award- und Rekordkacheln', 'Jede Kachel hebt sich beim Hereinscrollen einmal an ihren Platz, das Zeichen bekommt einen kurzen Glanz. Zwei Spalten, leicht versetzt.', 'transform, opacity · einmal je Kachel'],
  ['E4', 'Untere Leiste', 'Unter dem gewählten Reiter liegt ein weicher Hof in Acid, beim Wechsel macht das Zeichen einen kurzen Stoß.', 'opacity, transform: scale · einmal je Wechsel'],
  ['E5', 'Blätter', 'Das Blatt fährt wie heute herein; sein Inhalt setzt sich mit kurzer Federung nach, Abschnitt für Abschnitt.', 'transform, opacity · einmal je Blatt'],
  ['E6', 'Profilkopf', 'Eine Lichtkante im Rangton oben, darunter ein Hof, der beim Öffnen einmal aufgeht und dann ruhig steht.', 'opacity, transform: scale · einmal je Profil'],
  ['E7', 'Druck', 'Wer eine Zeile oder Kachel drückt, sieht einen kurzen hellen Rand statt nur des Schrumpfens.', 'Schatten, nur während des Drucks'],
];
const effekteHtml = EFFEKTE.map(([k, wo, was, wie]) => `<div class="pg-ef"><b><span>${k}</span>${esc(wo)}</b><p>${esc(was)}</p><small>${esc(wie)}</small></div>`).join('');

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sechste Aufwertung</title>
<!-- Gebaut von bau.js. Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
${fonts}
${styles}
<style>
body{padding:28px 16px 80px;overflow-x:hidden}
body::before{display:none}
main{max-width:1180px;margin:0 auto;position:relative;z-index:1}
h1{font-family:'Archivo Black',sans-serif;font-weight:400;font-size:clamp(26px,5vw,40px);letter-spacing:-.02em;line-height:1.1}
.pg-unter{color:var(--ink2);max-width:780px;margin-top:10px;font-size:15px}
.pg-unter b{color:var(--ink)}
h2{font:600 12px 'Sometype Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:56px 0 6px}
h2+p.pg-ab,p.pg-ab{color:var(--ink2);max-width:800px;font-size:14px;margin-bottom:14px}
nav.pg-inhalt{display:flex;flex-wrap:wrap;gap:6px;margin:20px 0 4px}
nav.pg-inhalt a{font:600 11px 'Sometype Mono',monospace;letter-spacing:.06em;color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:5px 10px}
.pg-steuer{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 14px;position:sticky;top:0;z-index:5;padding:8px 0;background:linear-gradient(var(--bg) 80%,transparent)}
.pg-steuer button{font:600 12px 'Space Grotesk',sans-serif;color:var(--ink2);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 12px;cursor:pointer}
.pg-steuer button:hover{color:var(--ink);border-color:var(--muted)}
.pg-steuer button.pg-an{color:var(--bg);background:var(--acid);border-color:var(--acid)}
.pg-vgl{display:grid;grid-template-columns:repeat(2,minmax(0,380px));gap:22px;justify-content:start}
figure{margin:0}
figcaption{font:600 10.5px 'Sometype Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
figure.pg-neu figcaption{color:var(--acid)}
.pg-tel{width:380px;max-width:100%;height:780px;border:0;display:block;border-radius:28px;background:var(--bg);
  box-shadow:0 0 0 1px var(--line2),0 0 0 7px #050706,0 0 0 8px var(--line),0 30px 60px -30px #000}
.pg-efs{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.pg-ef{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13px;color:var(--ink2)}
.pg-ef b{display:flex;gap:8px;align-items:baseline;color:var(--ink);margin-bottom:4px}
.pg-ef b span{font:600 10.5px 'Sometype Mono',monospace;color:var(--acid)}
.pg-ef small{display:block;margin-top:6px;font:500 10.5px 'Sometype Mono',monospace;color:var(--faint)}
.pg-prinz{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;margin-top:10px}
.pg-prinz div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13px;color:var(--ink2)}
.pg-prinz b{display:block;color:var(--ink);margin-bottom:3px}
.pg-zahlen{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0}
.pg-zahlen div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.pg-zahlen b{display:block;font-family:'Archivo Black',sans-serif;font-weight:400;font-size:28px;line-height:1.1}
.pg-zahlen span{font-size:12px;color:var(--muted)}
.pg-zahlen .g b{color:var(--acid)}
svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:var(--strich,2);stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
.pg-tab{border-collapse:collapse;width:100%;font-size:13px;color:var(--ink2)}
.pg-tab td,.pg-tab th{padding:7px 10px 7px 0;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.pg-tab tr.pg-grp th{padding-top:20px;color:var(--ink);font-weight:600;border-bottom:1px solid var(--line2)}
.pg-tab tr.pg-grp th span{display:flex;align-items:center;gap:8px}
.pg-tab tr.pg-grp th svg{color:var(--muted)}
.pg-tab td small{display:block;color:var(--faint);font-size:11.5px;margin-top:2px}
.pg-tab td.pg-ic{white-space:nowrap;width:200px}
.pg-tab td.pg-ic svg{vertical-align:middle;margin-right:6px}
.pg-tab td.pg-ic.pg-neu{color:var(--acid)}
.pg-tab td.pg-ic.pg-neu small{white-space:normal}
.pg-tab code{font:500 11px 'Sometype Mono',monospace;color:var(--muted)}
.pg-sys{font:600 9.5px 'Sometype Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:1px 5px;margin-right:4px}
.pg-tab tr.pg-gleich td.pg-ic.pg-neu{color:var(--blue)}
.pg-fams{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px}
.pg-fam{display:flex;gap:10px;align-items:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px}
.pg-fam b{color:var(--ink)} .pg-fam small{display:block;color:var(--muted);font-size:11.5px;margin-top:2px}
.pg-fam .zk svg{width:18px;height:18px}
.pg-gals{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.pg-gal{display:grid;grid-template-columns:auto auto auto;align-items:center;justify-content:start;gap:10px;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.pg-gal figcaption{grid-column:1/-1;margin:0;letter-spacing:.04em;text-transform:none;font-size:11px}
.pg-gal .zk.g svg{width:26px;height:26px}
.pg-gal .zk.k svg{width:15px;height:15px}
.pg-gal .pg-nackt svg{width:14px;height:14px;color:var(--ink2)}
.pg-zws{display:grid;gap:8px}
.pg-zw{display:grid;grid-template-columns:110px 110px 24px 120px 1fr;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13px;color:var(--ink2)}
.pg-zw span{display:flex;gap:6px;align-items:center}
.pg-zw code{font:500 11px 'Sometype Mono',monospace;color:var(--muted)}
.pg-zw .pg-neu{color:var(--acid)}
.pg-zw .pg-pf{color:var(--faint)}
.pg-zw p{margin:0}
.pg-h3{font-size:18px;margin:34px 0 4px}
.pg-offen{margin-top:30px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;color:var(--ink2);font-size:14px}
.pg-offen b{color:var(--ink)} .pg-offen li{margin:6px 0 6px 18px}
@media(max-width:820px){.pg-tab{table-layout:fixed}.pg-tab td,.pg-tab th{padding-right:6px;overflow-wrap:anywhere}.pg-tab code{word-break:break-all}.pg-vgl{grid-template-columns:minmax(0,1fr)}.pg-zw{grid-template-columns:1fr 1fr}.pg-zw p{grid-column:1/-1}.pg-zw .pg-pf{display:none}.pg-tab td.pg-ic{width:auto;white-space:normal}}
</style></head><body><main>
<h1>Sechste Aufwertung: Licht, Bewegung, ein Zeichen je Bedeutung</h1>
<p class="pg-unter">Links die App, wie sie heute ist, rechts der Entwurf — beide mit den echten ${MATCHES.length} Partien der Liga, ohne Datenbank, und <b>beide bedienbar</b>. Aufbau und Karten bleiben, wie sie sind. Neu sind <b>sieben leise Effekte</b>, die nur dort laufen, wo etwas selten ist oder gerade hereinkommt, und ein <b>Zeichensatz, in dem kein Zeichen zwei Dinge bedeutet</b>: ${Object.keys(NEU).length} neue Zeichnungen, ${mehrAlt.length} heute mehrfach vergebene Zeichen aufgelöst. Eingebaut ist davon nichts.</p>
<nav class="pg-inhalt"><a href="#vergleich">Nebeneinander</a><a href="#effekte">Die Effekte</a><a href="#zeichen">Die Zeichen</a><a href="#familien">Was ein Zeichen teilen darf</a><a href="#neu">Neue Zeichnungen</a><a href="#zwillinge">Zwillinge</a><a href="#offen">Beim Einbau</a></nav>

<h2 id="vergleich">Nebeneinander</h2>
<p class="pg-ab">Die Knöpfe steuern beide Fenster zugleich. Am besten zu sehen: <b>Liga</b> (Licht an Platz 1–3, Kopfzahlen, Leiste unten), <b>Awards</b> (Kacheln beim Scrollen), <b>Profil</b> (Hof im Kopf, Blatt setzt sich), <b>Positionen</b> und <b>News</b> (neue Zeichen).</p>
<div class="pg-steuer">
  <button data-tab="ranking">Liga</button><button data-tab="positions">Positionen</button><button data-tab="awards">Awards</button>
  <button data-tab="teams">Teams</button><button data-tab="history">Verlauf</button>
  <button data-tu="profil">Profil von Platz 1</button><button data-tu="feed">News</button><button data-tu="zu">Blatt schließen</button>
  <button id="ruhe">Bewegung reduzieren</button>
</div>
<div class="pg-vgl">
  <figure><figcaption>Heute</figcaption><iframe class="pg-tel" src="app.html" title="Die App heute"></iframe></figure>
  <figure class="pg-neu"><figcaption>Entwurf</figcaption><iframe class="pg-tel" src="app.html#neu" title="Die App im Entwurf"></iframe></figure>
</div>

<h2 id="effekte">Die Effekte</h2>
<p class="pg-ab">Jeder Effekt bewegt nur Lage und Deckkraft — das rechnet die Grafikkarte, und eine offene Ansicht kostet weiter fast nichts [§C27]. Endlos läuft nur das Licht an Platz 1 bis 3, mit neun Sekunden Pause; alles andere läuft einmal. Bei „Bewegung reduzieren“ steht alles im Endzustand.</p>
<div class="pg-efs">${effekteHtml}</div>
<div class="pg-prinz">
  <div><b>Die Zahl bleibt vorne</b>Kein Effekt liegt über einer Zahl oder einem Namen. Das Licht läuft über die Kante, nicht über den Text; der Hof liegt hinter dem Wappen; Kacheln glänzen am Zeichen, nicht am Wert.</div>
  <div><b>Gold nur für Titel</b>Das Licht an Platz 1 ist Gold, an 2 und 3 Silber und Bronze. Der Hof im Profil trägt den Rangton, der Reiter unten Acid, die Farbe des Bedienens [§C25].</div>
  <div><b>Was schon da ist, bleibt</b>Lichtlauf auf Podest und Titelkarten, Glut der Eilmeldung, Feuer am Avatar und Aura der Titel bleiben unverändert. Der Entwurf ergänzt nur, wo heute nichts geschieht.</div>
</div>

<h2 id="zeichen">Die Zeichen</h2>
<p class="pg-ab">Heute tragen ${mehrAlt.length} Zeichen mehr als eine Sache: die Krone steht für den Meistertitel, den Traummonat, die Highlights, die Legende, den Titelverteidiger und den Spitzenwechsel; der Blitz für Stürmer, Sturm-Flex, den kompletten Stürmer und die Eilmeldung. Der Entwurf folgt einer Regel: <b>ein Zeichen, eine Bedeutung</b>. Dieselbe Sache in mehreren Systemen behält ein Zeichen (die Siegesserie ist als Award, Badge und Ring dieselbe Flamme), verschiedene Sachen teilen nie eins. Die Tabelle zeigt jeden Eintrag, dessen Zeichen heute geteilt ist oder sich ändert; <span style="color:var(--acid)">grün</span> eine eigene Zeichnung, <span style="color:var(--blue)">blau</span> das Zeichen derselben Sache.</p>
<div class="pg-zahlen">
  <div><b>${nutz.length}</b><span>Verwendungen in neun Systemen</span></div>
  <div><b>${mehrAlt.length}</b><span>Zeichen tragen heute mehr als eine Sache</span></div>
  <div class="g"><b>${Object.keys(NEU).length}</b><span>neue Zeichnungen</span></div>
  <div class="g"><b>0</b><span>Zeichen mit zwei Bedeutungen im Entwurf</span></div>
  <div><b>${doppelSchl.length}</b><span>Schlüssel heute doppelt im Quelltext (${doppelSchl.map(esc).join(', ')})</span></div>
</div>
<table class="pg-tab"><thead><tr><th>Eintrag</th><th>heute</th><th>Entwurf</th></tr></thead>${gruppenHtml}</table>

<h3 class="pg-h3">In der Bedienung und im Feed</h3>
<p class="pg-ab">Manche Zeichen setzt der Code direkt, außerhalb der Kataloge: Schalter, Kopfzeilen, die Rubriken und Filter des Feeds. Auch sie folgen der Regel. Der Schalter „Sturm“ zeigt die Position, nicht den Blitz des kompletten Stürmers; die Rubrik „Breaking“ nimmt die Sirene der Kategorie, statt sie ein zweites Mal festzulegen.</p>
<table class="pg-tab"><thead><tr><th>Ort</th><th>heute</th><th>Entwurf</th></tr></thead><tbody>${bedienHtml}</tbody></table>

<h2 id="familien">Was ein Zeichen teilen darf</h2>
<p class="pg-ab">Diese ${mehrNeu.length} Zeichen tragen im Entwurf mehrere Einträge — jedes mit genau einer Bedeutung. Ein neuer Eintrag darf ein Zeichen nur nehmen, wenn er dieselbe Sache meint; sonst braucht er ein eigenes.</p>
<div class="pg-fams">${familienHtml}</div>

<h2 id="neu">Neue Zeichnungen</h2>
<p class="pg-ab">Im 24er-Raster, nur Linien mit dem Strich des Katalogs, in den drei Größen der Zeichenkachel (Blattkopf, Zeile) und nackt bei 14 px. Ränge sind jetzt eine Leiter aus Winkeln, Positionen der halbierte Tisch von oben mit dem Platz des Spielers.</p>
<div class="pg-gals">${galerieHtml}</div>

<h2 id="zwillinge">Zwillinge</h2>
<p class="pg-ab">Zeichnungen, die unter zwei Namen fast gleich aussehen. Bei 14 px sind sie nicht zu unterscheiden.</p>
<div class="pg-zws">${zwillingeHtml}</div>

<div class="pg-offen" id="offen"><b>Beim Einbau zu klären:</b><ul>
<li>Gespeicherte Stories tragen ihren Zeichenschlüssel. Umbenannte und weggefallene Schlüssel (${['weightSmall','heartBroken','concreteWall','chartUp','chartDown','blackDay','overtake','rocket'].join(', ')}) bleiben deshalb als Verweis auf die neue Zeichnung lesbar; der Snapshot-Vertrag bleibt unberührt [§C33].</li>
<li>Die Schlüssel ${doppelSchl.map(esc).join(' und ')} stehen zweimal im Quelltext; der zweite gilt. Die erste Fassung fällt weg, eine Zusicherung verhindert, dass es wieder passiert.</li>
<li>Award „Favoritenschreck“ und Monatschronik „Der Favoritenschreck“ messen verschiedene Dinge (größter überwundener Elo-Abstand eines Duos gegen Quote gegen Favoriten) und tragen deshalb verschiedene Zeichen — aber denselben Namen. Einer von beiden braucht einen anderen.</li>
<li>Außerhalb des Katalogs stehen eigene Zeichnungen in der unteren Leiste, im Rückblick, in der Suche, im Kalender, als Häkchen, x, Chevrons, Trichter, Stift, Papierkorb, dazu Pfeile als Schriftzeichen (▲▼ ↗↘→ ✓ ⇄ ↻). Sie wandern in den Katalog, damit dieselbe Prüfung sie sieht.</li>
<li>Die Rubriken des Feeds legen ihr Zeichen an zwei Stellen fest (NEWS_CATEGORIES und die Rubrik in 30a-news-karte.js). Beim Einbau liest die Rubrik aus der Kategorie, dann kann es nicht mehr auseinanderlaufen.</li>
<li>Stories setzen beim Erzeugen ein eigenes Zeichen (Jubiläum, Historie, Positionswechsel), Blattabschnitte ebenso („Woraus“, „Typische Aufstellung“). Sie bekommen dieselbe Prüfung; gespeicherte Stories behalten ihr Zeichen über den Verweis oben.</li>
<li>Neues Gesetz §C41 „Ein Zeichen, eine Bedeutung“ mit einer Zusicherung über alle Systeme und jedes Zeichen, das der Code wörtlich setzt: ein Zeichen mit mehr als einem Träger muss als Familie mit einer Bedeutung eingetragen sein.</li>
</ul></div>
</main>
<script>
(function(){
  var fr = [].slice.call(document.querySelectorAll('iframe.tel'));
  function an(m){ fr.forEach(function(f){ f.contentWindow.postMessage(m, '*'); }); }
  document.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick = function(){ an({tab:b.dataset.tab}); }; });
  document.querySelectorAll('[data-tu]').forEach(function(b){ b.onclick = function(){
    if(b.dataset.tu === 'profil'){ an({tab:'ranking'}); setTimeout(function(){ an({profil:1}); }, 120); }
    else { var o = {}; o[b.dataset.tu] = 1; an(o); } }; });
  var r = document.getElementById('ruhe');
  r.onclick = function(){ r.classList.toggle('pg-an'); an({ruhe:r.classList.contains('pg-an')}); };
})();
</script>
</body></html>`;
fs.writeFileSync(path.join(HIER, 'index.html'), seite);
console.log('index.html', Math.round(seite.length / 1024), 'KB');
