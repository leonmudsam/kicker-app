// Baut die Entwurfsseite der fünften Aufwertung: `node mockup/aufwertung-5/bau.js`
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


const PROBE = process.argv.includes('--probe');
const OUT = path.join(HIER, 'index.html');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:360, height:900}, hasTouch:true, deviceScaleFactor:2});
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e.stack || e).slice(0, 400)));
  await page.setContent('<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + styles + '<style>.nf-card{content-visibility:visible!important}</style></head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = src => page.evaluate(s => window.__k.eval(s), src);
  await K(SETUP);
  await K(fs.readFileSync(path.join(HIER, 'entwurf.js'), 'utf8'));
  if(PROBE){
    console.log(await K(`(function(){
      const seit = Date.now() - 14 * 86400000;
      const ms = _spBasis().chrono.filter(m => mts(m) >= seit);
      const z = {}, zg = {};
      ms.forEach(m => __V.kandidaten(m).forEach(k => { z[k.key] = (z[k.key] || 0) + 1; }));
      __V.folgeWaehlen(ms.slice().reverse()).forEach(x => { zg[x.wahl.key] = (zg[x.wahl.key] || 0) + 1; });
      return JSON.stringify({n:ms.length, trifft:z, gewaehlt:zg});
    })()`));
    await browser.close(); return;
  }
  // Den Feed öffnen, wie die App ihn zeigt, samt dem nachgereichten Rest.
  await K(`_cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); _cache._consolFrom=null; _cache._frischVon=null;
    openNewsFeed(); try{ _newsFeedRest(); }catch(e){} 'x'`);
  await page.waitForTimeout(600);
  const daten = await K(`(function(){
    const alle = __V.feed(999);
    const kurz = __V.feed(16);
    const s = __V.sammeln();
    // Wie oft das Spielfeld heute über allen Partie-Karten steht.
    const karten = [...document.querySelectorAll('#sheet .nf-card.nf-s-spiel')];
    const heuteFeld = karten.filter(k => k.querySelector(':scope > .sp-feld')).length;
    return JSON.stringify({feed:kurz, zaehl:alle.zaehl, spielKarten:karten.length, heuteFeld, alleKarten:document.querySelectorAll('#sheet .nf-card').length,
      blaetterFeed:alle.blaetter, ...s});
  })()`);
  const D = JSON.parse(daten);
  // Die Verläufe und Zeichnungen der Wappen stehen im Topf der Seite.
  let topf = await K(`(document.getElementById('insDefs') || {}).outerHTML || ''`);
  // Bildadressen der Wappen sind Blob-Adressen und gelten nur in dieser
  // Seite: sie werden zu Daten-Adressen.
  const roh = JSON.stringify(D) + topf;
  const blobs = [...new Set(roh.match(/blob:[^"'\s)\\]+/g) || [])];
  const ersatz = await page.evaluate(async liste => {
    const out = {};
    for(const u of liste){
      out[u] = await new Promise(res => { const x = new XMLHttpRequest(); x.open('GET', u); x.responseType = 'blob';
        x.onload = () => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(x.response); }; x.onerror = () => res(''); x.send(); });
    }
    return out;
  }, blobs);
  const tausch = t => t.replace(/blob:[^"'\s)\\]+/g, u => ersatz[u] || u);
  const D2 = JSON.parse(tausch(JSON.stringify(D)));
  topf = tausch(topf);
  console.log('Varianten', D2.varianten.length, 'Kombis', D2.kombis.map(k => k.form).join(','), 'Blätter', D2.blaetter.length, 'Blobs', blobs.length, 'Feed-Zählung', JSON.stringify(D2.zaehl));
  fs.writeFileSync(OUT, seite(D2, topf));
  console.log('index.html geschrieben', Math.round(fs.statSync(OUT).size / 1024), 'KB');
  if(fehler.length) console.log('FEHLER\n' + [...new Set(fehler)].join('\n'));
  await browser.close();
})();

// ── Die Seite ──────────────────────────────────────────────────────────
function seite(D, topf){
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blaetter = {};
  let bn = 0;
  const bid = (id, html) => { if(!html) return ''; if(!blaetter[id]) blaetter[id] = {n:'b' + (bn++), html}; return blaetter[id].n; };
  const umziehen = html => html.replace(/data-blatt="([^"]+)"/g, (m, id) => { const b = blaetter[id]; return b ? `data-blatt="${b.n}"` : ''; });
  Object.keys(D.blaetterFeed).forEach(id => bid(id, D.blaetterFeed[id]));
  D.varianten.forEach(v => bid(v.blattId, v.blatt));
  D.kombis.forEach(k => bid(k.blattId, k.blatt));
  const fN = D.nFenster;
  const balken = (wert, max, cls) => `<span class="pg-st-b ${cls || ''}"><i style="width:${Math.round(wert / Math.max(1, max) * 100)}%"></i></span>`;
  const maxG = Math.max(...Object.values(D.gewaehlt));
  const ART_ANIM = {
    tauziehen:'Der Knoten rutscht von der Mitte zum Sieger — so weit, wie die Tore es sagen.',
    tacho:'Die Nadel schlägt bis zur Siegchance aus, der Bogen füllt sich mit.',
    streu:'Alle Partien der Liga als Punkte, diese pulst als Ring.',
    transfer:'Leuchtpunkte fließen ohne Pause von den Verlierern zu den Siegern.',
    chemie:'Der Ring baut sich Partie für Partie auf, die letzte atmet.',
    gegner:'Die Duelle fallen von links nach rechts, die letzte Zelle ist gerahmt.',
    revanche:'Der Pfeil zeichnet sich vom alten zum neuen Stand, der neue Stand wird gestempelt.',
    tagesring:'Die Felder des Tages laufen um das Wappen, die jüngste atmet.',
    zaehlwerk:'Die Ziffern rollen wie ein Kilometerzähler auf die neue Zahl.',
    uhr:'Der Zeiger dreht auf die Anstoßzeit, die Striche des Tages erscheinen in Reihenfolge.',
    mosaik:'Die Kacheln erscheinen von 10:9 bis 10:0, dieses Ergebnis glimmt.',
    gipfel:'Die vier Zeilen schieben sich in Tabellenreihenfolge herein.',
    gefaelle:'Die Säulen wachsen auf ihre Elo.',
    rueckkehr:'Die Tage der Pause erscheinen einzeln, der letzte leuchtet.',
    feld:'Wie heute.'
  };
  const FORM_TEXT = {
    stempel:'Der zweite Anlass ist eine Marke — eine runde Zahl, eine Revanche, eine Rückkehr, ein Duo-Jubiläum, ein Lieblingsgegner. Er fällt als Stempel in die Ecke des Kopfs und lässt die Grafik des ersten Anlasses unangetastet.',
    geteilt:'Beide Anlässe haben eine kleine Form (Lauf, Zahl, Ring). Sie stehen halb und halb nebeneinander, jede Hälfte mit Zeichen und Aufschrift.',
    leiste:'Ab drei Anlässen: der stärkste trägt den Kopf, die anderen stehen als Leiste aus Zeichen und Wort darunter. Nie drei Grafiken übereinander.'
  };
  const paare = Object.entries(D.paare).sort((a, b) => b[1] - a[1]).slice(0, 14);
  const varKarte = v => `<article class="pg-var" id="v-${v.key}">
      <div class="pg-var-k"><h3>${esc(v.name)}</h3><span class="pg-var-art">${esc(v.art)}</span><span class="pg-var-rang" title="Gewicht">Gewicht ${v.rang}</span></div>
      <div class="pg-var-g">
        <div class="pg-tel-k pg-box">${v.karte ? umziehen(v.karte) : '<p class="pg-leer">In den Partien der Liga kommt diese Form bisher nicht vor.</p>'}<button class="pg-nochmal" type="button" aria-label="Animation wiederholen">↻</button></div>
        <div class="pg-var-t">
          <p><b>Wann:</b> ${esc(v.regel)}</p>
          <p><b>Bewegung:</b> ${esc(ART_ANIM[v.key] || '')}</p>
          <div class="pg-var-z"><span><b>${D.zahl.fenster[v.key] || 0}</b> von ${fN} Partien der letzten 14 Tage erfüllen die Regel</span>
            <span><b>${D.gewaehlt[v.key] || 0}</b> davon stehen nach der Abwechslung im Feed</span>
            <span><b>${D.zahl.liga[v.key] || 0}</b> von ${D.nLiga} Partien der ganzen Liga</span></div>
          ${v.karte ? `<p class="pg-var-bsp">${v.imFenster ? 'Beispiel aus den letzten 14 Tagen' : 'Jüngstes Beispiel der Liga'}: ${esc(v.zeit)}. <a href="#" data-blatt="${blaetter[v.blattId] ? blaetter[v.blattId].n : ''}">Blatt öffnen</a></p>` : ''}
        </div></div></article>`;
  const blattPaar = b => `<section class="pg-bp" id="b-${b.typ}"><h3>${esc(b.name)}</h3><p class="pg-bp-t">${esc(b.titel)}</p>
      <div class="pg-bp-g"><figure><figcaption>Heute</figcaption><div class="pg-tel pg-tel-heute"><div class="nd-bg show">${b.heute || '<p class="pg-leer">Kein Blatt.</p>'}</div></div></figure>
      <figure class="neu"><figcaption>Entwurf <button class="pg-nochmal" type="button">↻</button></figcaption><div class="pg-tel pg-tel-neu">${b.entwurf}</div></figure></div></section>`;
  const gruppen = {};
  D.varianten.forEach(v => { (gruppen[v.art] = gruppen[v.art] || []).push(v); });
  const vorher = D.heuteFeld, spiel = D.spielKarten;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fünfte Aufwertung</title>
<!-- Gebaut von bau.js aus der ausgelieferten App und entwurf.js/entwurf.css.
     Eigenständige Seite ohne Bauablauf, kein Teil der App [CLAUDE.md §2]. -->
${styles}
<style>${fs.readFileSync(path.join(HIER, 'entwurf.css'), 'utf8')}</style>
<style>
body{padding:28px 16px 80px}
body::before{display:none}
main{max-width:1120px;margin:0 auto;position:relative;z-index:1}
h1{font-family:'Archivo Black',sans-serif;font-weight:400;font-size:clamp(26px,5vw,42px);letter-spacing:-.02em;line-height:1.1}
.pg-unter{color:var(--ink2);max-width:760px;margin-top:10px;font-size:15px}
.pg-unter b{color:var(--ink)}
nav.pg-inhalt{display:flex;flex-wrap:wrap;gap:6px;margin:20px 0 4px}
nav.pg-inhalt a{font:600 11px 'Sometype Mono',monospace;letter-spacing:.06em;color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:5px 10px}
nav.pg-inhalt a:hover{color:var(--ink);border-color:var(--muted)}
h2{font:600 12px 'Sometype Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:56px 0 6px}
h2+p.ab{color:var(--ink2);max-width:780px;font-size:14px;margin-bottom:14px}
.pg-regeln{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:22px 0 8px}
.pg-regeln div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13px;color:var(--ink2)}
.pg-regeln b{display:block;color:var(--ink);margin-bottom:3px}
.pg-zahlen{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:18px}
.pg-zahlen div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.pg-zahlen b{display:block;font-family:'Archivo Black',sans-serif;font-weight:400;font-size:28px;line-height:1.1}
.pg-zahlen span{font-size:12px;color:var(--muted)}
.pg-zahlen .g b{color:var(--acid)}
.pg-feedvgl{display:grid;grid-template-columns:repeat(2,minmax(0,360px));gap:18px;justify-content:start}
figure{margin:0}
figcaption{display:flex;align-items:center;gap:8px;font:600 10.5px 'Sometype Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
figure.neu figcaption{color:var(--acid)}
.pg-tel{width:360px;max-width:100%;height:760px;overflow-y:auto;overflow-x:hidden;border-radius:26px;background:var(--bg);
  box-shadow:0 0 0 1px var(--line2),0 0 0 7px #050706,0 0 0 8px var(--line),0 30px 60px -30px #000;overscroll-behavior:contain}
.pg-tel .nf-wrap{padding:12px 12px 30px}
.pg-tel .nf-card{margin-bottom:10px}
.pg-tel .nf-tag{margin:14px 2px 8px}
.pg-tel-heute .nd-bg{position:relative;inset:auto;opacity:1;pointer-events:auto;backdrop-filter:none;-webkit-backdrop-filter:none;background:none;padding:0;display:block;z-index:auto}
.pg-tel-heute .nd{max-height:none;transform:none;border-radius:0;border:0;min-height:100%;max-width:none}
.pg-tel-neu{background:var(--bg2)}
.pg-tel-k{width:360px;max-width:100%;padding:12px;border-radius:20px;background:var(--bg);box-shadow:0 0 0 1px var(--line2)}
.pg-box{position:relative}
.pg-nochmal{border:0;background:var(--surface2);color:var(--ink2);border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:14px;line-height:26px}
.pg-box>.pg-nochmal{position:absolute;right:-8px;top:-8px;box-shadow:0 0 0 1px var(--line2)}
.pg-gruppe{margin-top:26px}
.pg-gruppe>h3{font:600 11px 'Sometype Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.pg-var{border-top:1px solid var(--line);padding:20px 0 6px}
.pg-var-k{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.pg-var-k h3{font-size:20px}
.pg-var-art{font:600 10.5px 'Sometype Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--acid)}
.pg-var-rang{font:500 10.5px 'Sometype Mono',monospace;color:var(--faint)}
.pg-var-g{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:22px;align-items:start}
.pg-var-t{font-size:14px;color:var(--ink2);max-width:520px}
.pg-var-t p{margin-bottom:8px}
.pg-var-t b{color:var(--ink)}
.pg-var-z{display:flex;flex-direction:column;gap:3px;margin:10px 0;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font-size:12.5px}
.pg-var-z b{font-family:'Sometype Mono',monospace;color:var(--acid)}
.pg-var-bsp{font-size:12px;color:var(--muted)}
.pg-var-bsp a{color:var(--acid)}
.pg-leer{padding:20px;color:var(--muted);font-size:13px}
.pg-st{display:grid;grid-template-columns:150px minmax(0,1fr) 40px;gap:6px 10px;align-items:center;max-width:620px;font-size:13px;color:var(--ink2)}
.pg-st-b{height:10px;border-radius:5px;background:var(--surface2);overflow:hidden}
.pg-st-b i{display:block;height:100%;background:var(--acid);border-radius:5px}
.pg-st-b.heute i{background:var(--silber)}
.pg-st .z{font-family:'Sometype Mono',monospace;text-align:right;color:var(--ink)}
.pg-tab{border-collapse:collapse;font-size:12.5px;width:100%;max-width:620px;table-layout:fixed;color:var(--ink2);margin-top:10px}
.pg-tab td,.pg-tab th{padding:6px 12px 6px 0;border-bottom:1px solid var(--line);text-align:left}
.pg-tab th{font:600 10px 'Sometype Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.pg-kombis{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;margin-top:10px}
.pg-kombi h3{font-size:18px;margin-bottom:4px}
.pg-kombi p{font-size:13px;color:var(--ink2);margin-bottom:10px}
.pg-bp{border-top:1px solid var(--line);padding:22px 0 8px}
.pg-bp h3{font-size:20px}
.pg-bp-t{color:var(--muted);font-size:13px;margin:2px 0 12px}
.pg-bp-g{display:grid;grid-template-columns:repeat(2,minmax(0,360px));gap:18px}
.pg-prinz{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.pg-prinz div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13px;color:var(--ink2)}
.pg-prinz b{display:block;color:var(--ink);margin-bottom:3px}
.pg-offen{margin-top:30px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 18px;color:var(--ink2);font-size:14px}
.pg-offen b{color:var(--ink)} .pg-offen li{margin:5px 0 5px 18px}
[data-blatt]{cursor:pointer}
#modal{position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:16px}
#modal.auf{display:flex}
#modal .pg-tel{height:min(780px,92vh)}
@media(max-width:760px){.pg-var-g,.pg-feedvgl,.pg-bp-g{grid-template-columns:minmax(0,1fr)}.pg-tel{height:640px}}
</style></head><body><main>
<h1>Fünfte Aufwertung: Jede Partie ihr Bild, jedes Blatt eine Bühne</h1>
<p class="pg-unter">Im Feed der letzten vierzehn Tage sind <b>${spiel} von ${D.alleKarten}</b> Karten Partie-Karten, und <b>${vorher}</b> davon zeigen dasselbe Spielfeld. Der Entwurf gibt jeder Partie die Grafik, die zu ihrem Ereignis passt — vierzehn neue Köpfe mit festen Regeln, eine Regel für Abwechslung, drei Formen für Partien mit mehreren Anlässen — und baut die Blätter neu: eine Bühne, ein Satz, drei Zahlen, dann Abschnitte, die jeder in Worten sagen, was sie zeigen. Alles ist in der echten App mit den echten ${D.nLiga} Partien gerechnet und auf dieser Seite lebendig: <b>Karten antippen öffnet ihr Blatt</b>, ↻ spielt eine Animation noch einmal. Eingebaut ist davon nichts.</p>
<div class="pg-zahlen">
  <div><b>${vorher}/${spiel}</b><span>Partie-Karten mit Spielfeld heute</span></div>
  <div class="g"><b>${D.gewaehlt.feld || 0}/${fN}</b><span>Partien mit Spielfeld im Entwurf</span></div>
  <div class="g"><b>${Object.keys(D.gewaehlt).length}</b><span>verschiedene Köpfe über ${fN} Partien</span></div>
  <div><b>${Math.max(...Object.values(D.gewaehlt))}</b><span>Karten der häufigsten Form</span></div>
</div>
<nav class="pg-inhalt"><a href="#feed">Der Feed</a><a href="#varianten">Neue Kartenköpfe</a><a href="#wahl">Welche gewinnt</a><a href="#kombis">Kombinationen</a><a href="#blaetter">Die Blätter</a><a href="#bewegung">Bewegung</a><a href="#offen">Beim Einbau</a></nav>

<h2 id="feed">Der Feed, heute und im Entwurf</h2>
<p class="ab">Dieselben ersten sechzehn Karten in derselben Reihenfolge. Rechts bekommt jede gewöhnliche Partie ihre Form nach den Regeln unten, jede Partie mit Anlass behält ihre Grafik und bekommt einen Stempel, wo eine Marke dazukommt. Antippen öffnet das neue Blatt.</p>
<div class="pg-feedvgl">
  <figure><figcaption>Heute</figcaption><div class="pg-tel"><div class="nf-wrap">${D.feed.heute}</div></div></figure>
  <figure class="neu"><figcaption>Entwurf</figcaption><div class="pg-tel"><div class="nf-wrap">${umziehen(D.feed.entwurf)}</div></div></figure>
</div>

<h2 id="varianten">Neue Kartenköpfe</h2>
<p class="ab">Jede Form hat eine Regel, die aus den Partien bis zu dieser rechnet, und ein Gewicht: je seltener und erzählender, desto höher. Die Zahlen darunter sind gemessen. Das Spielfeld bleibt als Rückfall.</p>
${Object.keys(gruppen).map(g => `<div class="pg-gruppe"><h3>${esc(g)}</h3>${gruppen[g].map(varKarte).join('')}</div>`).join('')}

<h2 id="wahl">Welche Form gewinnt</h2>
<p class="ab">Meist treffen mehrere Regeln zu — eine Partie kann zugleich ein Gipfeltreffen, ein Lieblingsgegner und ein Tauziehen sein. Gewählt wird in Lesereihenfolge: die schwerste zutreffende Form, die in den beiden Karten davor nicht stand; was in den letzten zehn Karten schon stand, wiegt sieben Punkte weniger; das Spielfeld höchstens einmal je fünf Karten. Der Anlass der App (Serie, Krimi, Außenseiter …) geht allem vor und behält seine Grafik.</p>
<div class="pg-st">${Object.entries(D.gewaehlt).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span>${esc((D.varianten.find(v => v.key === k) || {}).name || k)}</span>${balken(n, maxG)}<span class="z">${n}</span>`).join('')}</div>
<p class="ab" style="margin-top:10px">Verteilung über die ${fN} Partien der letzten vierzehn Tage, wenn jede Partie eine Form bekommt. Heute stünde dort ${vorher} Mal das Spielfeld auf ${spiel} Karten.</p>

<h2 id="kombis">Wenn eine Partie mehrere Anlässe hat</h2>
<p class="ab">Nie zwei volle Grafiken übereinander. Die Form folgt daraus, was der zweite Anlass ist.</p>
<div class="pg-kombis">${D.kombis.map(k => `<div class="pg-kombi"><h3>${esc({stempel:'Der Stempel', geteilt:'Halb und halb', leiste:'Die Leiste'}[k.form])}</h3><p>${esc(FORM_TEXT[k.form])} Beispiel: ${esc(k.anlass)} mit ${esc(k.dazu.join(', '))}.</p><div class="pg-tel-k pg-box">${umziehen(k.karte)}<button class="pg-nochmal" type="button">↻</button></div></div>`).join('')}</div>
<table class="pg-tab"><tr><th>Anlass der App</th><th>dazu</th><th>Form</th><th>Partien der Liga</th></tr>
${paare.map(([k, n]) => { const [a, v, f] = k.split('|'); return `<tr><td>${esc(a)}</td><td>${esc((D.varianten.find(x => x.key === v) || {}).name || v)}</td><td>${esc(f)}</td><td>${n}</td></tr>`; }).join('')}</table>

<h2 id="blaetter">Die Blätter</h2>
<p class="ab">Heute ist jedes Blatt ein Fenster in der Mitte des Bildschirms mit einer Liste aus Zeilen; die neueren Typen (Runde, Partie) haben Grafiken, die älteren meist nur „Bezeichnung — Wert". Der Entwurf gibt jedem Typ denselben Bau: <b>Bühne</b> (die Grafik der Karte, groß und in Bewegung), <b>Kernsatz</b> mit drei Zahlen, dann Abschnitte in fester Folge — <b>warum besonders</b>, <b>wie es dazu kam</b>, <b>wer beteiligt war</b> —, jeder mit einer Zeile, die sagt, was die Grafik zeigt. Das Blatt füllt den Bildschirm, der Kopf bleibt beim Scrollen stehen.</p>
${D.blaetter.map(blattPaar).join('')}

<h2 id="bewegung">Bewegung, Licht und Zeichen</h2>
<div class="pg-prinz">
  <div><b>Jede Bewegung erklärt etwas</b>Der Knoten rutscht zum Sieger, die Nadel zur Siegchance, Punkte fließen vom Verlierer zum Sieger, Ziffern rollen auf die neue Zahl, Linien zeichnen sich in der Richtung der Zeit. Keine Bewegung nur zur Zierde.</div>
  <div><b>Einmal beim Hineinscrollen</b>Die Animation startet, wenn die Karte ins Bild kommt, und läuft einmal. Wiederholt (Puls, Fluss, Glimmen, Atmen) wird nur, was selten ist: der Elo-Transfer, das Streudiagramm, das Mosaik, der jüngste Tag im Ring.</div>
  <div><b>Das Blatt baut sich auf</b>Erst die Bühne mit einem Lichtlauf, dann Satz, Zahlen und Abschnitt für Abschnitt mit kurzem Versatz. Balken wachsen in Höhe und Deckkraft, nicht in der Breite — die Breite ist die Aussage.</div>
  <div><b>Licht gehört dem Seltenen</b>Der Lichtlauf (nf-glanz) liegt im Entwurf zusätzlich auf Zählwerk, Rückkehr, Elo-Transfer und gebrochenem Fluch. Gold bleibt dem Titel: Spieler des Tages, Tabellenspitze, Rekordwert [§C25].</div>
  <div><b>Ein Zeichen je Form</b>Jede neue Form trägt ihr eigenes Zeichen aus dem Katalog der App im Rubrikband (Waage, Ziel, Bumerang, Handschlag, Klingen, Revanche, Sonnenaufgang, Hundert, Uhr, Gipfel, Gewicht, Tür) — keine zwei Formen teilen eins.</div>
  <div><b>Bei Bewegungsruhe steht alles</b>Alle Animationen stehen unter prefers-reduced-motion: no-preference. Ohne sie zeigt jede Grafik sofort ihren Endzustand.</div>
</div>

<div class="pg-offen" id="offen"><b>Beim Einbau zu klären:</b><ul>
<li>Die Wahl der Form hängt an der Reihenfolge im Feed (Abwechslung) und muss deshalb bei der Anzeige fallen, nicht im Generator — wie heute der Wechsel zwischen Ergebniszeile und Spielfeld. Sie bleibt stabil, solange keine frühere Karte dazukommt; eine neue Partie oben verschiebt nur die Form der Karten, die direkt darunter liegen. Alternative: die Form aus der Partie-ID statt aus der Nachbarschaft würfeln, dann ist sie für immer fest, aber die Abwechslung ist nur statistisch.</li>
<li>Die neuen Schlagzeilen (Revanche, Rückkehr, Zählwerk …) ersetzen „setzt sich durch". Sie kommen aus dem Generator und gelten damit auch für gespeicherte Karten über die Auffrischung [§C33].</li>
<li>Rechnung: die Fakten einer Partie (Duo, direkter Vergleich, Tag, Revanche, Pause, Zähler) laufen je Partie über die eigenen Partien der vier Spieler. Beim Einbau gehören sie in _spBasis als ein Durchlauf je Datenstand, wie Serienstand und Ergebnisverteilung heute.</li>
<li>Der Knoten des Tauziehens bewegt left statt transform; beim Einbau als translateX über eine feste Breite.</li>
<li>Das Blatt als Vollbild statt Fenster ändert openNewsDetail (#nd) — der Inhalt bleibt Ableitung aus Story und Partien, nichts davon wird gespeichert.</li>
</ul></div>
</main>
<div id="modal"><div class="pg-tel pg-tel-neu" id="modalTel"></div></div>
${Object.values(blaetter).map(b => `<template id="${b.n}">${b.html}</template>`).join('')}
${topf}
<script>
(function(){
  var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rollen(root){ if(ruhig) return; root.querySelectorAll('.v5-roll').forEach(function(el){ var bis = parseFloat(el.dataset.bis), t0 = performance.now();
    if(!isFinite(bis)) return; (function f(t){ var p = Math.min(1, (t - t0) / 900); el.textContent = Math.round(bis * (1 - Math.pow(1 - p, 3))); if(p < 1) requestAnimationFrame(f); })(t0); }); }
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting && !e.target.classList.contains('sicht')){ e.target.classList.add('sicht'); rollen(e.target); } }); }, {threshold:.2});
  document.querySelectorAll('.nf-card, .v5b').forEach(function(el){ io.observe(el); });
  function nochmal(el){ el.querySelectorAll('.nf-card, .v5b').forEach(function(k){ k.classList.remove('sicht'); void k.offsetWidth; k.classList.add('sicht'); rollen(k); }); }
  document.addEventListener('click', function(e){
    var n = e.target.closest('.pg-nochmal'); if(n){ nochmal(n.closest('.pg-box, figure') || document); return; }
    var b = e.target.closest('[data-blatt]');
    if(b && b.dataset.blatt){ e.preventDefault(); var t = document.getElementById(b.dataset.blatt); if(!t) return;
      var tel = document.getElementById('modalTel'); tel.innerHTML = t.innerHTML; tel.scrollTop = 0; document.getElementById('modal').classList.add('auf');
      requestAnimationFrame(function(){ tel.querySelectorAll('.v5b').forEach(function(k){ k.classList.add('sicht'); rollen(k); }); }); return; }
    if(e.target.id === 'modal' || e.target.closest('#modal .v5b-x')) document.getElementById('modal').classList.remove('auf');
  });
})();
</script>
</body></html>`;
}
