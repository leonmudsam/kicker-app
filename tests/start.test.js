// Der Start der App, so wie ein Telefon ihn erlebt: die gebaute Seite von
// einem echten Server (eigener Ursprung, also mit localStorage, IndexedDB,
// Worker und Service Worker), Supabase als Attrappe mit Schreibprotokoll und
// den echten Partien. Die übrigen Suiten laden die App ohne Boot (sie
// entfernen `loadAll(); checkForUpdate();`) — was beim Start geschieht,
// prüft nur diese.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Start, Speicher des Geräts und Worker brauchen einen Browser.');
  process.exit(2);
}
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const chromium = require('./browser.js').ladeChromium();
const ZIEL = require('./ziel.js');
const {fixtures} = require('../tools/performance.cjs');

let checks = 0, fails = 0;
const ok = (c, msg) => { checks++; if(!c) fails++; console.log((c ? '  ok  ' : '  ✗   ') + msg); };

// ── Der Server: die gebaute Seite mit ETag, wie GitHub Pages ────────────
// Mit einem Zugang in den Gültigkeitsbereich der App, gesetzt VOR dem Boot:
// `window.__vorStart` (aus dem Init-Skript) bekommt `eval` der IIFE und kann
// so mitzählen, was der Start tut. Ohne `__vorStart` ändert er nichts.
const SEITE = (() => {
  const html = fs.readFileSync(ZIEL, 'utf8');
  const boot = html.search(/loadAll\(\);\s*\ncheckForUpdate\(\);/);
  if(boot < 0) throw new Error('Boot-Zeile nicht gefunden');
  return html.slice(0, boot) + 'if(window.__vorStart) window.__vorStart(s => eval(s));\n' + html.slice(boot);
})();
const ETAG = '"seite-1"';
const anfragen = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  anfragen.push({pfad:url.pathname, cb:url.searchParams.has('_cb'), inm:req.headers['if-none-match'] || null, t:Date.now()});
  if(url.pathname === '/' || url.pathname === '/index.html'){
    if(req.headers['if-none-match'] === ETAG){ res.writeHead(304, {ETag:ETAG}); return res.end(); }
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', ETag:ETAG, 'Cache-Control':'no-cache'});
    return res.end(SEITE);
  }
  if(url.pathname === '/icon.png'){ res.writeHead(204); return res.end(); }
  res.writeHead(404); res.end();
});

// ── Die Attrappe von Supabase: liest die Fixtures, schreibt mit ─────────
// Jede Abfrage ist eine Kette, die beim `await` ihre Tabelle beantwortet.
// Schreibende Methoden landen in `window.__schreib`.
const ATTRAPPE = `(() => {
  const D = window.__startDaten;
  window.__schreib = []; window.__lesen = [];
  const antwort = (t, ops) => {
    if(ops.some(o => ['insert','update','upsert','delete'].includes(o))) return {data:null, error:null};
    const tab = {players:D.players, matches:D.matches, seasons:D.seasons, stories:[],
      config:{id:1, k_factor:32, risk_split:.6, pos_swing:.45, start_elo:0, win_boost:1.12,
        mov_loss_damp:.5, match_bonus:1.5, low_elo_loss_damp:0}}[t];
    return {data: tab === undefined ? [] : JSON.parse(JSON.stringify(tab)), error:null};
  };
  const kette = (t, ops) => new Proxy(function(){}, {
    get(_, p){
      if(p === 'then'){
        if(!ops.some(o => ['insert','update','upsert','delete'].includes(o))) window.__lesen.push(t);
        const r = antwort(t, ops);
        return (ja) => Promise.resolve(r).then(ja);
      }
      return kette(t, ops.concat(String(p)));
    },
    apply(_, __, args){
      const o = ops[ops.length-1];
      if(['insert','update','upsert','delete'].includes(o)) window.__schreib.push(t + '.' + o);
      return kette(t, ops);
    }
  });
  const kanal = () => new Proxy(function(){}, {get(_, p){ return p === 'then' ? undefined : kanal(); }, apply(){ return kanal(); }});
  window.supabase = {createClient: () => ({
    from: t => kette(t, []), channel: kanal, removeChannel(){},
    rpc: (...a) => { window.__schreib.push('rpc'); return kette('rpc', []); } })};
})();`;

// Die Fixtures tragen keine gespeicherten Deltas; für den Start genügt das,
// denn geprüft wird, was er tut, nicht welche Elo herauskommt.
const DATEN = {players:fixtures.players, matches:fixtures.matches, seasons:fixtures.seasons};
const JETZT = new Date(2026, 7, 26, 21).getTime();

async function neueSeite(ctx){
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', e => fehler.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({contentType:'text/javascript', body:ATTRAPPE}));
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType:'text/css', body:''}));
  await page.route('https://fonts.gstatic.com/**', r => r.fulfill({status:404, body:''}));
  return {page, fehler};
}

(async () => {
  await new Promise(fertig => server.listen(0, '127.0.0.1', fertig));
  const BASIS = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch();
  try{
    const ctx = await browser.newContext({viewport:{width:390, height:844}});
    await ctx.addInitScript(({daten, jetzt}) => {
      window.__startDaten = daten;
      const RD = Date;
      window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
      window.setInterval = () => 0;
    }, {daten:DATEN, jetzt:JETZT});

    // ── Der Update-Check ──────────────────────────────────────────────
    // Erster Start: noch kein ETag. Der Check kommt erst, wenn die Liga
    // gezeichnet ist, und merkt sich den ETag seiner eigenen Version.
    const a = await neueSeite(ctx);
    await a.page.goto(BASIS);
    await a.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    const gezeichnet = Date.now();
    for(let i = 0; i < 80 && !anfragen.some(x => x.cb); i++) await a.page.waitForTimeout(100);
    await a.page.waitForTimeout(200);
    ok(await a.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('kicker_upd_v1')).etag === '"seite-1"'; } catch(e){ return false; } }),
      'Der ETag der eigenen Version wird auf dem Gerät gemerkt');
    const erster = anfragen.filter(x => x.cb);
    ok(erster.length === 1 && erster[0].inm === null, 'Erster Start: ein Update-Check, noch ohne ETag');
    ok(erster.length && erster[0].t >= gezeichnet - 50, 'Der Update-Check läuft erst, wenn die Liga steht');
    ok(a.fehler.length === 0, 'Erster Start ohne Seitenfehler' + (a.fehler.length ? ': ' + a.fehler[0] : ''));
    await a.page.close();

    // Zweiter Start: derselbe ETag geht mit, der Server antwortet ohne Body.
    anfragen.length = 0;
    const b = await neueSeite(ctx);
    await b.page.goto(BASIS);
    await b.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    await b.page.waitForTimeout(400);
    for(let i = 0; i < 50 && !anfragen.some(x => x.cb); i++) await b.page.waitForTimeout(100);
    const zweiter = anfragen.filter(x => x.cb);
    ok(zweiter.length === 1 && zweiter[0].inm === ETAG, 'Zweiter Start: der Update-Check sendet den gemerkten ETag');
    // Ein ETag, der einer anderen Version gehört, wird nicht gesendet: sonst
    // bekäme ein Gerät mit altem Stand ein 304 auf die neue Fassung.
    await b.page.evaluate(() => localStorage.setItem('kicker_upd_v1', JSON.stringify({etag:'"seite-1"', version:'1999.01.01.x'})));
    await b.page.close();
    anfragen.length = 0;
    const c = await neueSeite(ctx);
    await c.page.goto(BASIS);
    await c.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    for(let i = 0; i < 60 && !anfragen.some(x => x.cb); i++) await c.page.waitForTimeout(100);
    const dritter = anfragen.filter(x => x.cb);
    ok(dritter.length === 1 && dritter[0].inm === null, 'Ein ETag einer anderen Version wird nicht gesendet');
    await c.page.close();

    // ── Der Generator im Worker ───────────────────────────────────────
    // Der Start rechnet die Stories nicht auf dem Hauptthread, und der Worker
    // kommt zu denselben Stories wie der Hauptthread mit demselben Code.
    const w = await neueSeite(ctx);
    await w.page.addInitScript(() => {
      window.__vorStart = K => { window.__K = K; window.__haupt = 0;
        K('const __bs=_buildStories; _buildStories=function(){ window.__haupt++; return __bs.apply(this, arguments); }'); };
    });
    await w.page.goto(BASIS);
    await w.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'), null, {timeout:60000});
    ok(await w.page.evaluate(() => window.__haupt === 0), 'Beim Start rechnet der Hauptthread keine Story');
    ok(await w.page.evaluate(() => window.__K('window.__schreib.some(x => x.startsWith("stories."))')), 'Die Stories aus dem Worker werden veröffentlicht wie bisher');
    const gleich = await w.page.evaluate(async () => {
      const K = window.__K;
      const ausWorker = await K('_storiesImWorker()');
      const haupt = K('_buildStories()');
      const text = x => JSON.stringify(x);
      return {n:haupt.length, gleich:!!ausWorker && text(ausWorker) === text(haupt),
        // JSON macht aus Datum und Zahl dasselbe; der Typ jedes Zeitpunkts
        // muss eigens gleich sein. Gefragt wird nach dem Typ, nicht nach
        // `instanceof`: die feste Uhr der Suite ersetzt `Date`.
        when:!!ausWorker && ausWorker.length === haupt.length && ausWorker.every((s, i) =>
          Object.prototype.toString.call(s.when) === Object.prototype.toString.call(haupt[i].when))};
    });
    ok(gleich.n > 20 && gleich.gleich, `Worker und Hauptthread ergeben dieselben ${gleich.n} Stories (IDs, Texte, dataRef, Zeit)`);
    ok(gleich.when, 'Jeder Zeitpunkt kommt mit seinem Typ zurück (Datum bleibt Datum, Zahl bleibt Zahl)');
    // Ein zweiter Lauf ohne neue Daten schickt den Stand nicht noch einmal.
    ok(await w.page.evaluate(async () => { const K = window.__K; const v = K('_storyWorkerStand');
      await K('_storiesImWorker()'); return K('_storyWorkerStand') === v; }), 'Unveränderter Stand wird nicht erneut übertragen');
    ok(w.fehler.length === 0, 'Worker-Start ohne Seitenfehler' + (w.fehler.length ? ': ' + w.fehler[0] : ''));
    await w.page.close();

    // Ohne Worker rechnet der Hauptthread, und der Feed hat seine Stories.
    const r = await neueSeite(ctx);
    await r.page.addInitScript(() => {
      window.Worker = undefined;
      window.__vorStart = K => { window.__K = K; window.__haupt = 0;
        K('const __bs=_buildStories; _buildStories=function(){ window.__haupt++; return __bs.apply(this, arguments); }'); };
    });
    await r.page.goto(BASIS);
    await r.page.waitForFunction(() => window.__K && window.__K('Array.isArray(_cache._stories) && _cache._stories.length > 20'), null, {timeout:60000});
    ok(await r.page.evaluate(() => window.__haupt >= 1), 'Ohne Worker rechnet der Hauptthread wie bisher');
    await r.page.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(fails ? `${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `ALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
