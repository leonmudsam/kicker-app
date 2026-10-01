// Baut die Entwurfsseite der vierten Aufwertung: `node mockup/aufwertung-4/bau.js`
//
// Lädt die ausgelieferte index.html mit den echten Partien der Liga
// (tests/fixtures), öffnet den Feed, fotografiert je Anlass eine Karte „Am
// Spieltag", legt den Entwurf aus entwurf.js/entwurf.css hinein und
// fotografiert dieselbe Karte noch einmal. So rechnet der Entwurf mit den
// Daten und Bauteilen der App. In die App fließt davon nichts [CLAUDE.md §2].
const fs = require('fs');
const path = require('path');
const HIER = __dirname, WURZEL = path.join(HIER, '..', '..');
const chromium = require(path.join(WURZEL, 'tests', 'browser.js')).ladeChromium();
if(!chromium){ console.log('Kein Chromium — npm install --no-save playwright-core'); process.exit(2); }

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

const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*mockup*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
const bodyHtml = html.slice(bodyStart, html.indexOf('<script', bodyStart)).replace(/<script[\s\S]*?<\/script>/gi, '');

const BOOT = `(function(){
  const stub = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:stub()}, apply(){return stub()}});
  window.supabase = {createClient: () => ({from: () => stub(), channel: () => stub(), removeChannel(){}, rpc: () => stub()})};
  window.fetch = () => new Promise(()=>{});
  window.setInterval = () => 0;
  const RD = Date, N = ${NOW};
  window.Date = class extends RD { constructor(...a){ a.length?super(...a):super(N); } static now(){ return N; } };
})();`;
const SETUP = `
  players = ${JSON.stringify(PLAYERS)}; matches = ${JSON.stringify(MATCHES)}; seasons = ${JSON.stringify(SEASONS)};
  unlocked = true; invalidateCache();
  const _rc = simulateEloWithSliders(matches); const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
  matches.forEach(m => { m.deltas = _d[m.id] || {}; }); invalidateCache();
  const _g = getGlobalSim();
  seasons.forEach(s => { const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
    const top = Object.keys(pl).filter(id => pl[id] > 0).map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0}))
      .sort((a,b) => b.elo - a.elo);
    s.top_elo = JSON.stringify(top.slice(0,3)); s.player_id = top[0] ? top[0].id : null; });
  invalidateCache(); 'bereit'`;

// Je Anlass: was die Karte heute zeigt und was der Entwurf daraus macht.
const ANLAESSE = [
  {key:'feld', titel:'Die gewöhnliche Partie', kopf:'Das Spielfeld',
   punkte:['Die häufigste Karte des Feeds. Statt Ergebnisband und Elo-Waage steht die Partie auf dem Tisch: Abwehr, Sturm, Sturm, Abwehr — in der Reihenfolge der Stangen.',
           'Neu ist die Rolle: wer hinten und wer vorne stand, zeigte bisher keine Karte. Unter jedem Wappen die Elo dieser Partie, in der Mitte Stand und Siegchance.',
           'Die Sieger hell, die Verlierer leiser — wie im Band, nur dass man jetzt sieht, gegen wen jemand direkt gespielt hat.']},
  {key:'krimi', titel:'Der Ein-Tor-Krimi', kopf:'Die Anzeigetafel',
   punkte:['Der Kopf wird zur Anzeigetafel mit Klappziffern, die Mitte sagt „EIN TOR" und wie die Chancen vorher standen.',
           'Darunter, was nur hier interessiert: wie die Sieger in engen Partien dastehen — die letzten acht als Zellen, diese markiert, dahinter die Bilanz aller.']},
  {key:'deutlich', titel:'Der klare Sieg', kopf:'Das Band und die Verteilung',
   punkte:['„So deutlich zuletzt am …" sagte, wann. Die Säulen sagen, wie selten: jedes Ergebnis von 10:9 bis 10:0, gezählt über die ganze Liga bis zu dieser Partie.',
           'Dieses Ergebnis grün, die noch deutlicheren dahinter heller — darunter die Zahl in einem Satz.']},
  {key:'aussenseiter', titel:'Der Außenseitersieg', kopf:'Die Wippe',
   punkte:['Das Gewicht ist die Elo vor dem Anstoß: der Favorit sitzt unten, wie die Rechnung es erwartet hat, und gewonnen hat die leichte Seite.',
           'Die Neigung folgt dem Elo-Gefälle, die Zahl steht darüber; Siegchance und Elo-Schnitt beider Teams stehen an ihren Enden. Bogen und Chips entfallen.']},
  {key:'rang', titel:'Rangsprung und Spitzenwechsel', kopf:'Die Tabelle vorher und nachher',
   punkte:['Eine Linie je Spieler vom Platz vor der Partie zum Platz danach: wer durch diese Partie steigt, grün, wer dadurch fällt, rot, alle übrigen Metall [§C25].',
           'Man sieht nicht nur „Platz 7 → 5", sondern an wem jemand vorbeigezogen ist. Der Kopf schrumpft auf die Ergebniszeile, die Grafik bekommt den Platz.',
           'Beim Spitzenwechsel dasselbe Bauteil, und die neue Spitze trägt Gold — die Tabellenführung ist ein Titel auf Zeit. Im Fenster dieser Aufnahmen wechselte die Spitze nicht, deshalb ohne eigenes Bild.']},
  {key:'serie', titel:'Die Serie', kopf:'Der Lauf gegen den eigenen Bestwert',
   punkte:['Der Lauf misst sich am eigenen Bestwert und am Rekord der Liga, beide als Marke über der Reihe. Drei Siege in Folge sind für den einen Alltag und für den anderen die beste Zeit seiner Laufbahn.',
           'Die nächste runde Marke steht weiter im Blatt.']},
  {key:'wende', titel:'Die Wende', kopf:'Die Elo-Kurve',
   punkte:['Die letzten zwölf Partien des Siegers als Linie aus der Elo jeder Partie: die Pleiten davor als rote Punkte, dieser Sieg groß und grün.',
           'Man sieht, wie tief es vorher ging und wie viel der eine Sieg zurückholt.']},
  {key:'duell', titel:'Die Rivalitätsmarke', kopf:'Jede Begegnung',
   punkte:['Jede Partie der beiden gegeneinander als Balken: nach oben für den einen, nach unten für den anderen, so hoch, wie deutlich es ausging; diese grün.',
           'Serien und Wenden der Rivalität stehen da, ohne dass man eine Zahl liest.']},
];
const OUT = path.join(HIER, 'bilder');
fs.mkdirSync(OUT, {recursive:true});
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:360, height:900}, hasTouch:true, deviceScaleFactor:2});
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e.stack || e).slice(0, 300)));
  // Die Eindämmung des Feeds legt Karten außerhalb des Bildes erst beim
  // Hineinscrollen [§C30] — für die Aufnahmen wird jede sofort gelegt.
  await page.setContent('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + styles + '<style>.nf-card{content-visibility:visible!important}' + fs.readFileSync(path.join(HIER, 'entwurf.css'), 'utf8') + '</style></head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = src => page.evaluate(s => window.__k.eval(s), src);
  await K(SETUP);
  await K(fs.readFileSync(path.join(HIER, 'entwurf.js'), 'utf8'));
  await K('__F.aufzeichnen()');
  const feed = async () => { await K(`for(let i=0;i<6;i++) try{closeSheet(true)}catch(e){};
    _cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); openNewsFeed()`);
    await page.waitForTimeout(900); };
  await feed();
  const runden = await K('__F.rundenVorschau()');
  const inRunde = new Set(runden.flat());
  const arten = await K(`[...document.querySelectorAll('#sheet .nf-card.nf-s-spiel')].map(k => [k.dataset.sid, __F.anlass(__F.st[k.dataset.sid]).key])`);
  const zaehl = {};
  arten.forEach(([, k]) => { zaehl[k] = (zaehl[k] || 0) + 1; });
  console.log('Anlässe im Feed', zaehl, 'Runden', runden.map(r => r.length));
  // Je Anlass die jüngste Karte, die nicht in einer Runde steht.
  const wahl = {};
  arten.forEach(([sid, k]) => { if(!wahl[k] && !inRunde.has(sid)) wahl[k] = sid; });
  arten.forEach(([sid, k]) => { if(!wahl[k]) wahl[k] = sid; });
  const rundeBsp = runden.slice().sort((a, b) => b.length - a.length)[0];
  const shot = async (sid, datei) => {
    const el = page.locator(`#sheet [data-sid="${sid}"]`).first();
    await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
    await el.screenshot({path: path.join(OUT, datei), type:'jpeg', quality:80});
  };
  const ueberblick = async datei => {
    await page.setViewportSize({width:360, height:2000});
    await K(`document.getElementById('sheet').scrollTop = 0`);
    await page.waitForTimeout(700);
    await page.screenshot({path: path.join(OUT, datei), type:'jpeg', quality:76});
    await page.setViewportSize({width:360, height:900});
  };
  await ueberblick('feed-heute.jpg');
  for(const a of ANLAESSE){ if(wahl[a.key]) await shot(wahl[a.key], a.key + '-heute.jpg'); else console.log('kein Beispiel für ' + a.key); }
  // Die Runde heute: ihre Karten untereinander, als ein Bild.
  if(rundeBsp){
    const box = await page.evaluate(ids => {
      const r = ids.map(id => document.querySelector(`#sheet [data-sid="${id}"]`).getBoundingClientRect());
      return {top: Math.min(...r.map(x => x.top)), bottom: Math.max(...r.map(x => x.bottom)), left: r[0].left, width: r[0].width};
    }, rundeBsp);
    await K(`document.getElementById('sheet').scrollTop += ${Math.round(box.top - 60)}`);
    await page.setViewportSize({width:360, height:Math.round(box.bottom - box.top + 140)});
    await page.waitForTimeout(400);
    const b2 = await page.evaluate(ids => {
      const r = ids.map(id => document.querySelector(`#sheet [data-sid="${id}"]`).getBoundingClientRect());
      return {x: r[0].left, y: Math.min(...r.map(x => x.top)), width: r[0].width, height: Math.max(...r.map(x => x.bottom)) - Math.min(...r.map(x => x.top))};
    }, rundeBsp);
    await page.screenshot({path: path.join(OUT, 'runde-heute.jpg'), type:'jpeg', quality:80, clip:b2});
    await page.setViewportSize({width:360, height:900});
  }
  // Der Entwurf
  await K('__F.anwenden()');
  await feed();
  for(const a of ANLAESSE){ if(wahl[a.key]) await shot(wahl[a.key], a.key + '-entwurf.jpg'); }
  const rd = await K('__F.runden()');
  const rdId = rundeBsp && (rd.find(r => r.von[0] === rundeBsp[0]) || {}).id;
  if(rdId) await shot(rdId, 'runde-entwurf.jpg');
  await ueberblick('feed-entwurf.jpg');
  await browser.close();
  if(fehler.length) console.log('FEHLER\n' + [...new Set(fehler)].join('\n'));
  const info = {zaehl, runden: runden.length, rundeLaenge: rundeBsp ? rundeBsp.length : 0, karten: arten.length};
  fs.writeFileSync(path.join(HIER, 'index.html'), seite(info));
  console.log('index.html geschrieben');
})();

// ── Die Seite ──────────────────────────────────────────────────────────
function seite(info){
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paar = (id, titel, kopf, punkte) => `<section class="ans" id="${id}">
    <h3>${esc(titel)} <span>${esc(kopf)}</span></h3>
    <div class="paar">
      <figure><figcaption>Heute</figcaption><img src="bilder/${id}-heute.jpg" alt="${esc(titel)} heute" loading="lazy"></figure>
      <figure class="neu"><figcaption>Entwurf</figcaption><img src="bilder/${id}-entwurf.jpg" alt="${esc(titel)} im Entwurf" loading="lazy"></figure>
    </div>
    <ul>${punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  </section>`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vierte Aufwertung</title>
<!-- Gebaut von bau.js aus der ausgelieferten App und entwurf.js/entwurf.css.
     Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0c0b;--surface:#141a16;--line:#28332b;--ink:#eef3ef;--ink2:#b9c4bd;--muted:#717f76;--acid:#BEF264;--gold:#f7cf4a}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5;padding:28px 16px 60px}
main{max-width:1000px;margin:0 auto}
h1{font-family:'Archivo Black',sans-serif;font-weight:400;font-size:clamp(26px,5vw,40px);letter-spacing:-.02em}
.unter{color:var(--ink2);max-width:720px;margin-top:8px}
.regeln{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:22px 0 10px}
.regeln div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13px;color:var(--ink2)}
.regeln b{display:block;color:var(--ink);margin-bottom:3px}
nav{display:flex;flex-wrap:wrap;gap:6px;margin:18px 0 6px}
nav a{font:600 11px 'Sometype Mono',monospace;letter-spacing:.06em;color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:5px 10px}
nav a:hover{color:var(--ink);border-color:var(--muted)}
h2{font:600 12px 'Sometype Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:40px 0 4px}
.ans{border-top:1px solid var(--line);padding:22px 0 8px}
.ans h3{font-size:20px;margin-bottom:12px}
.ans h3 span{font:600 11px 'Sometype Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--acid);margin-left:8px}
.paar{display:grid;grid-template-columns:repeat(2,minmax(0,360px));gap:14px;align-items:start}
figure{margin:0}
figcaption{font:600 10.5px 'Sometype Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
figure.neu figcaption{color:var(--acid)}
figure img{display:block;width:100%;height:auto;border-radius:16px}
.ans ul{margin:14px 0 0 18px;max-width:760px;color:var(--ink2);font-size:14px}
.ans li{margin:4px 0}
.offen{margin-top:40px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;color:var(--ink2);font-size:14px}
.offen b{color:var(--ink)} .offen li{margin:4px 0 4px 18px}
@media(max-width:560px){.paar{gap:8px}figure img{border-radius:12px}}
</style></head><body><main>
<h1>Vierte Aufwertung: Am Spieltag</h1>
<p class="unter">Von ${info.karten} Partie-Karten im Feed der letzten vierzehn Tage beginnt heute jede mit demselben Ergebnisband: vier Wappen, der Stand, zwei Namen. Der Entwurf lässt den Kopf dem Anlass folgen und zeigt in jedem Anlass eine Zahl, die auf der Karte bisher fehlte. Gebaut ist er in der echten App mit den echten Partien und ihren Bauteilen, bei 360 px — eingebaut ist davon noch nichts.</p>
<div class="regeln">
  <div><b>Der Kopf folgt dem Anlass</b>Spielfeld, Anzeigetafel, Wippe und Ergebniszeile statt immer desselben Bands. Wo die Grafik die Aussage trägt, schrumpft der Kopf auf eine Zeile.</div>
  <div><b>Neue Zahlen statt neuer Wörter</b>Rollen, Bilanz in engen Partien, Ergebnisverteilung, Elo-Gefälle, Tabellenbewegung, eigener Bestwert, Elo-Kurve, jede Begegnung — alles gerechnet aus den Partien bis zu dieser.</div>
  <div><b>Farbe sagt etwas</b>Grün und Rot nur für die Richtung, Gold nur für die neue Spitze, alles Übrige Metall [§C25]. Keine neue Farbe.</div>
  <div><b>Eine Runde, eine Karte</b>${info.runden} Runden im Fenster: dieselben vier am Tisch, Partie auf Partie. Sie werden eine Karte mit der Tabelle der Runde.</div>
</div>
<nav><a href="#feed">Der Feed</a><a href="#runde">Die Runde</a>${ANLAESSE.map(a => `<a href="#${a.key}">${esc(a.titel)}</a>`).join('')}</nav>
<h2>Der Feed als Ganzes</h2>
${paar('feed', 'Die ersten Karten', 'Heute und im Entwurf', ['Dieselben Partien, dieselbe Reihenfolge. Links beginnt jede Karte mit demselben Band, rechts sieht jede Karte nach dem aus, wovon sie erzählt.'])}
<h2>Zusammenführen</h2>
${paar('runde', 'Die Runde der Vier', 'Eine Karte statt ' + info.rundeLaenge, [
  '182 der 466 Partien der Liga liegen in Runden: dieselben vier am Tisch, keine Stunde zwischen zwei Partien, und in 48 von 57 Runden wechseln die Paarungen. Im Feed standen sie als Karten untereinander, mit denselben vier Wappen in jedem Band.',
  'Die Runde wird eine Karte: oben die Tabelle der Runde — jeder mit Siegen, Niederlagen und der Elo, die er in der Runde gewonnen oder abgegeben hat —, darunter jede Partie in einer Zeile mit Uhrzeit, Paarung, Stand und ihrem Anlass.',
  'Die Schlagzeile sagt, wer die Runde gewonnen hat; der Satz, wie lange sie ging und wie oft die Paarung wechselte. Im Blatt stehen die Einzelkarten weiter vollständig.'])}
<h2>Je Anlass</h2>
${ANLAESSE.map(a => paar(a.key, a.titel, a.kopf, a.punkte)).join('')}
<div class="offen"><b>Beim Einbau zu klären:</b><ul>
<li>Die Runde ändert, was eine Karte ist: bisher hat jede Partie ihre eigene [§C33]. Sie bliebe es im Bestand und im Blatt; zusammengeführt würde nur in der Anzeige, wie bei der Sammelkarte.</li>
<li>Spielfeld und Wippe zeigen Siegchance und Elo im Kopf — der Satz darunter streicht sie dann wie heute bei Bogen und Chips (_newsSpielSatz).</li>
<li>Alle Grafiken rechnen aus den Partien bis zu ihrer eigenen, nicht bis heute — eine Karte von vorletzter Woche erzählt vom Stand von damals.</li>
</ul></div>
</main></body></html>`;
}
