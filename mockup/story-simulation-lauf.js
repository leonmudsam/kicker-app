// Der Lauf: laedt `dist/index.html` in einen Browser, schiebt die hundert
// erfundenen Partien hinein und laesst den echten Generator, die echte
// Konsolidierung und den echten Kartenbau darueber laufen. Ergebnis ist
// `.story-simulation.json`, aus der `story-simulation-seite.js` die Seite baut.
//
//   node mockup/story-simulation-lauf.js && node mockup/story-simulation-seite.js
//
'use strict';
const fs = require('fs');
const chromium = require('/home/user/kicker-app/tests/browser.js').ladeChromium();
const {baueLiga} = require(__dirname + '/story-simulation-daten.js');

const ZIEL = '/home/user/kicker-app/dist/index.html';
const JETZT = new Date(2026, 7, 4, 12, 0, 0).getTime();   // 4. August 2026, 12:00

const html = fs.readFileSync(ZIEL, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = []; while((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a,b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);

const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
const bodyHtml = html.slice(bodyStart, html.indexOf('<script', bodyStart))
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const BOOT = `
(function(){
  const stub = () => new Proxy(function(){}, {get(_,p){return p==='then'?undefined:stub()}, apply(){return stub()}});
  window.supabase = {createClient: () => ({from: () => stub(), channel: () => stub(), removeChannel(){}, rpc: () => stub()})};
  window.fetch = () => new Promise(()=>{});
  window.setInterval = () => 0;
  const RD = Date, N = ${JETZT};
  window.Date = class extends RD { constructor(...a){ a.length?super(...a):super(N); } static now(){ return N; } };
})();
`;

(async () => {
  const L = baueLiga(20260908, 100);
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:420, height:900}});
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e.stack || e)));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = async src => page.evaluate(s => window.__k.eval(s), src);

  await K(`
    players = ${JSON.stringify(L.spieler)};
    matches = ${JSON.stringify(L.matches)};
    seasons = ${JSON.stringify(L.seasons)};
    invalidateCache();
    const _rc = simulateEloWithSliders(matches);
    const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
    matches.forEach(m => { m.deltas = _d[m.id] || {}; });
    invalidateCache();
    const _g = getGlobalSim();
    seasons.forEach(s => {
      const snap = _g.seasonEndElos[s.id] || {}, pl = _g.seasonPlayed[s.id] || {};
      const top = Object.keys(pl).filter(id => pl[id] > 0)
        .map(id => ({id, elo:Math.round(snap[id] ?? cfg.start_elo), wins:0, losses:0}))
        .sort((a,b) => b.elo - a.elo);
      s.top_elo = JSON.stringify(top.slice(0,3)); s.player_id = top[0] ? top[0].id : null;
    });
    invalidateCache(); 'bereit'`);

  const analyse = fs.readFileSync(__dirname + '/story-simulation-analyse.js', 'utf8');
  const daten = await page.evaluate(src => window.__k.eval(src), analyse);

  console.log(JSON.stringify({fehler: fehler.slice(0,2), roh: daten.roh, feed: daten.feed}));
  fs.writeFileSync(__dirname + '/.story-simulation.json', JSON.stringify(daten, null, 1));
  await browser.close();
})();
