// Baut die Entwurfsseite der dritten Aufwertung: `node mockup/aufwertung-3/bau.js`
//
// Lädt die ausgelieferte index.html mit den echten Partien der Liga
// (tests/fixtures), fotografiert jede Ansicht, legt den Entwurf aus
// entwurf.js/entwurf.css hinein und fotografiert sie noch einmal — an
// derselben Stelle. So rechnet der Entwurf mit den Daten und Bauteilen der
// App, und jede Ansicht steht neben dem, was heute zu sehen ist. In die App
// fließt davon nichts [CLAUDE.md §2].
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

const P = n => `(players.find(p=>p.name==='${n}')||{}).id`;
const zu = `for(let i=0;i<6;i++) try{closeSheet(true)}catch(e){}`;
// Jede Ansicht: wie man hinkommt, wo der Entwurf ansetzt und was er tut.
const ANSICHTEN = [
  {id:'liga', titel:'Liga', gruppe:'Reiter',
   auf:`${zu};tab='ranking';period='season';render()`, anker:'#main .ui-tabs', tun:`__E.liga()`,
   punkte:['Das Titelrennen steht über der Rangliste: die Saison-Elo der ersten drei an jedem Spieltag, der Erste golden, darunter das Band, wer an welchem Tag vorn lag.',
           'Es ist dasselbe Bauteil wie in der Meister-Karte und im Saison-Rückblick (saisonRennenHtml) — die Liga zeigt den laufenden Monat damit so, wie der Rückblick ihn später zeigt.',
           'Die Linien zeichnen sich von links nach rechts auf, bei Bewegungsruhe stehen sie.']},
  {id:'positionen', titel:'Positionen', gruppe:'Reiter',
   auf:`${zu};tab='positions';render()`, anker:'#main .ui-switch', tun:`__E.positionen()`,
   punkte:['Die Rollen-Landkarte: jeder Spieler steht dort, wo sich sein Sturm- und sein Abwehrwert kreuzen — dieselben Werte wie in der Liste darunter (posWert).',
           'Oben rechts liegt das Feld der Allrounder, leise hinterlegt. Wer stärker stürmt, steht unten rechts, wer stärker verteidigt, oben links.',
           'Die Gesichter kommen nacheinander, gestaffelt — nur Deckkraft und Größe bewegen sich.']},
  {id:'teams', titel:'Teams', gruppe:'Reiter',
   auf:`${zu};tab='teams';render()`, anker:'#main .search', tun:`__E.teams()`,
   punkte:['Das Netz der Duos: jeder Spieler sitzt auf einem Kreis, jede Linie ist ein Duo ab vier gemeinsamen Partien.',
           'Die Dicke zählt die Partien, die Farbe sagt die Richtung: Grün gewinnt öfter, Rot verliert öfter, Metall liegt dazwischen [§C25].',
           'Man sieht auf einen Blick, wer mit wem spielt und welche Paare tragen — die Liste darunter bleibt die Rangfolge.']},
  {id:'verlauf', titel:'Verlauf', gruppe:'Reiter',
   auf:`${zu};tab='history';render()`, anker:'#main .mlist', tun:`__E.verlauf()`,
   punkte:['Der Verlauf ist nach Spieltagen gegliedert: Wochentag, Datum, Zahl der Partien, darunter der Tag als Bahn — ein Strich je Partie, so hoch, wie klar das Ergebnis war.',
           'Jede Partie zeigt ihre Gesichter: die Sieger links und hell, die Verlierer rechts und leiser, der Stand in der Mitte mit seiner Uhrzeit — wie die Bühne einer Partie [§C27].',
           'Die Elo je Spieler steht im Fuß, die Auszeichnungen als Zeichen statt als Wolke aus Namen.']},
  {id:'match', titel:'Match eintragen', gruppe:'Reiter',
   auf:`${zu};Object.assign(M,{A1:${P('Leon')},A2:${P('Maxi')},B1:${P('Martin')},B2:${P('Julian')}});tab='match';render()`, anker:'#main .score-board', tun:`__E.match()`,
   punkte:['Sobald vier Spieler stehen, zeigt die Eingabe die Siegchance aus der Elo — mit dem Wort dazu (chanceWort), wie im Blatt einer Partie.',
           'Darunter, was ein Sieg je Spieler ungefähr bringt: wer gegen Favoriten antritt, sieht vor dem Anpfiff, worum es geht.']},
  {id:'profil', titel:'Profil', gruppe:'Blätter',
   auf:`${zu};showPlayer(${P('Jane')})`, anker:'#sheet .pp-sec-title', tun:`__E.profil(${P('Jane')})`,
   punkte:['Der Spielkalender: die letzten zwölf Wochen als Raster, eine Zelle je Tag. Grün, wo mehr gewonnen als verloren wurde, Rot umgekehrt, kräftiger mit mehr Partien.',
           'Er beantwortet, was die Zahlen darüber nicht sagen: wann jemand spielt, wie regelmäßig, und ob ein schwacher Monat an wenigen schlechten Tagen hängt.']},
  {id:'h2h', titel:'Direkter Vergleich', gruppe:'Blätter',
   auf:`${zu};showH2H(${P('Leon')},${P('Martin')})`, anker:'#sheet > div:nth-child(5)', tun:`__E.h2h(${P('Leon')},${P('Martin')})`,
   punkte:['Jede Begegnung als Balken: nach oben, wer links steht, nach unten der andere, so hoch, wie deutlich es ausging.',
           'Von links nach rechts in der Reihenfolge der Partien — Serien und Wenden der Rivalität sind zu sehen, ohne eine Zahl zu lesen.']},
  {id:'saison', titel:'Saison-Rückblick', gruppe:'Rückblicke',
   auf:`${zu};showSeasonRecap(seasons.find(s=>s.id==='2026-07'),{force:true})`, anker:'#sheet .podest', tun:`__E.saison('2026-07')`,
   punkte:['Unter dem Podest steht das Titelrennen des Monats, die Tage an der Spitze und die Saison des Meisters als Zellen — dieselben drei Bauteile wie im Blatt der Meister-Karte.',
           'Der Rückblick erzählt damit, wie der Titel zustande kam, nicht nur, wer ihn hat.']},
  {id:'woche', titel:'Spieler der Woche', gruppe:'Rückblicke',
   auf:`${zu};showPotwRecap({force:true})`, anker:'#sheet .rcp-held', tun:`__E.woche()`,
   punkte:['Die Woche des Helden als sieben Spalten: oben die Siege, unten die Niederlagen, ein Tag ohne Partie bleibt leise stehen.',
           'Darunter das Feld der Woche: jeder Spieler mit Siegen nach rechts und Niederlagen nach links um eine gemeinsame Null — der Held in Gold, weil er den Titel trägt [§C25].',
           'Die Balken wachsen nacheinander auf, bei Bewegungsruhe stehen sie.']},
  {id:'tag', titel:'Spieler des Tages', gruppe:'Rückblicke',
   auf:`${zu};showPotdRecap({force:true})`, anker:'#sheet .rcp-held', tun:`__E.tag()`,
   punkte:['Der Tag des Helden als Bahn — ein Feld je Partie, wie im Story-Blatt (_ndTagesbahn) —, darunter seine Elo über den Tag als Linie.',
           'Und das Feld des Tages, dasselbe Bauteil wie in der Woche: wer an diesem Tag wie oft gewonnen und verloren hat.']},
];

const OUT = path.join(HIER, 'bilder');
fs.mkdirSync(OUT, {recursive:true});
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:360, height:900}, hasTouch:true, deviceScaleFactor:1.5});
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e.stack || e).slice(0, 300)));
  await page.setContent('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + styles + '<style>' + fs.readFileSync(path.join(HIER, 'entwurf.css'), 'utf8') + '</style></head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = src => page.evaluate(s => window.__k.eval(s), src);
  await K(SETUP);
  await K(fs.readFileSync(path.join(HIER, 'entwurf.js'), 'utf8'));
  // Beide Bilder an derselben Stelle: der Anker steht 120 px unter der Kante.
  const hin = sel => page.evaluate(sel => {
    const el = document.querySelector(sel); if(!el) return 'kein Anker ' + sel;
    const sh = el.closest('#sheet');
    if(sh){ sh.scrollTop += el.getBoundingClientRect().top - sh.getBoundingClientRect().top - 120; }
    else window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 140);
    return 'ok';
  }, sel);
  const wo = () => page.evaluate(() => { const sh = document.getElementById('sheet');
    return {sheet: sh && sh.classList.contains('show') ? sh.scrollTop : null, win: window.scrollY}; });
  const zurueck = w => page.evaluate(w => { const sh = document.getElementById('sheet');
    if(w.sheet != null && sh) sh.scrollTop = w.sheet; else window.scrollTo(0, w.win); }, w);
  for(const a of ANSICHTEN){
    await K(a.auf);
    await page.waitForTimeout(500);
    const r = await hin(a.anker);
    if(r !== 'ok') console.log(a.id + ': ' + r);
    const w = await wo();
    await page.waitForTimeout(150);
    await page.screenshot({path: path.join(OUT, a.id + '-heute.jpg'), type:'jpeg', quality:74});
    await K(a.tun);
    await zurueck(w);
    await page.waitForTimeout(1600);
    await page.screenshot({path: path.join(OUT, a.id + '-entwurf.jpg'), type:'jpeg', quality:74});
    console.log('ok ' + a.id);
  }
  await browser.close();
  if(fehler.length) console.log('FEHLER\n' + [...new Set(fehler)].join('\n'));
  fs.writeFileSync(path.join(HIER, 'index.html'), seite());
  console.log('index.html geschrieben');
})();

// ── Die Seite ──────────────────────────────────────────────────────────
function seite(){
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const gruppen = [...new Set(ANSICHTEN.map(a => a.gruppe))];
  const karte = a => `<section class="ans" id="${a.id}">
    <h3>${esc(a.titel)}</h3>
    <div class="paar">
      <figure><figcaption>Heute</figcaption><img src="bilder/${a.id}-heute.jpg" alt="${esc(a.titel)} heute" loading="lazy" width="360" height="900"></figure>
      <figure class="neu"><figcaption>Entwurf</figcaption><img src="bilder/${a.id}-entwurf.jpg" alt="${esc(a.titel)} im Entwurf" loading="lazy" width="360" height="900"></figure>
    </div>
    <ul>${a.punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
  </section>`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dritte Aufwertung</title>
<!-- Gebaut von bau.js aus der ausgelieferten App und entwurf.js/entwurf.css.
     Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0a0c0b;--bg2:#0f1311;--surface:#141a16;--line:#28332b;--ink:#eef3ef;--ink2:#b9c4bd;--muted:#717f76;--faint:#4a554e;--acid:#BEF264;--gold:#f7cf4a}
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
.paar{display:grid;grid-template-columns:repeat(2,minmax(0,360px));gap:14px}
figure{margin:0}
figcaption{font:600 10.5px 'Sometype Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
figure.neu figcaption{color:var(--acid)}
figure img{display:block;width:100%;height:auto;border-radius:20px;border:1px solid var(--line)}
figure.neu img{border-color:rgba(190,242,100,.35)}
.ans ul{margin:14px 0 0 18px;max-width:760px;color:var(--ink2);font-size:14px}
.ans li{margin:4px 0}
.offen{margin-top:40px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;color:var(--ink2);font-size:14px}
.offen b{color:var(--ink)}
@media(max-width:560px){.paar{gap:8px}figure img{border-radius:14px}}
</style></head><body><main>
<h1>Dritte Aufwertung</h1>
<p class="unter">Jede Ansicht zweimal, bei 360 px: links, wie sie heute aussieht, rechts der Entwurf. Gebaut ist der Entwurf in der echten App mit den echten Partien der Liga und ihren eigenen Bauteilen — eingebaut ist davon noch nichts.</p>
<div class="regeln">
  <div><b>Ein Bauteil, überall dasselbe</b>Das Titelrennen, die Tagesbahn, die runden Chips und die Abschnittsköpfe sind die, die die App schon hat. Neu sind das Feld, die Woche, der Kalender, die Landkarte und das Netz — und jedes davon steht an mehr als einer Stelle.</div>
  <div><b>Farbe sagt etwas</b>Grün und Rot nur für gewonnen und verloren, Gold nur für den, der einen Titel trägt, alles Übrige Metall. Keine neue Farbe.</div>
  <div><b>Bewegung, die erklärt</b>Balken wachsen auf, Linien zeichnen sich in Spielreihenfolge, Gesichter kommen nacheinander. Nur Transform und Deckkraft, bei Bewegungsruhe steht alles.</div>
  <div><b>Telefon zuerst</b>Alles ist bei 360 px gebaut und gemessen, jede Grafik skaliert mit der Breite und läuft nicht über den Rand.</div>
</div>
<nav>${ANSICHTEN.map(a => `<a href="#${a.id}">${esc(a.titel)}</a>`).join('')}</nav>
${gruppen.map(g => `<h2>${esc(g)}</h2>` + ANSICHTEN.filter(a => a.gruppe === g).map(karte).join('')).join('')}
<div class="offen"><b>Was hier nicht steht:</b> Awards, Rekorde, Chronik, Feed, Laufbahn, Duo-Blatt und das Blatt einer Partie sind in den letzten Runden schon gezeichnet worden — Kacheln mit Feld und Lauf, Belege, Bühne, Bildzonen je Kartensorte, die Leiter und jetzt die Aura. Dort gibt es nichts nachzuholen, nur die neuen Bausteine wiederzuverwenden: das Feld passt ins Award-Blatt, der Kalender ins Duo-Blatt.</div>
</main></body></html>`;
}
