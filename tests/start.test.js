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
  // Keine Anfrage verlässt den Rechner: die Supabase-Bibliothek und die
  // Schriften kommen vom eigenen Server. Ein Service Worker holt fremde
  // Quellen selbst, an jeder Umleitung des Browsers vorbei — mit der echten
  // Bibliothek spräche der Test sonst mit der echten Datenbank.
  return (html.slice(0, boot) + 'if(window.__vorStart) window.__vorStart(s => eval(s));\n' + html.slice(boot))
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/g, '/attrappe.js')
    .replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]*/g, '/schrift.css');
})();
if(/cdn\.jsdelivr\.net|fonts\.googleapis\.com\/css2/.test(SEITE)) throw new Error('Eine fremde Adresse ist übrig');
// Der Service Worker neben der Seite. `swFassung` gibt ihm eine andere
// Fassung (eine neue Auslieferung), `seiteAus` lässt die Seite scheitern
// (kein Netz).
const SW_DATEI = path.join(path.dirname(ZIEL), 'sw.js');
let swFassung = null, seiteAus = false;
const ETAG = '"seite-1"';
const anfragen = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  anfragen.push({pfad:url.pathname, cb:url.searchParams.has('_cb'), inm:req.headers['if-none-match'] || null, t:Date.now(),
    modus:req.headers['sec-fetch-mode'] || ''});
  if(url.pathname === '/attrappe.js'){ res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(ATTRAPPE); }
  if(url.pathname === '/schrift.css'){ res.writeHead(200, {'Content-Type':'text/css'}); return res.end(''); }
  if(url.pathname === '/sw.js'){
    if(!fs.existsSync(SW_DATEI)){ res.writeHead(404); return res.end(); }
    let sw = fs.readFileSync(SW_DATEI, 'utf8');
    if(swFassung) sw = sw.replace(/const SW_FASSUNG = '[^']*';/, `const SW_FASSUNG = '${swFassung}';`);
    res.writeHead(200, {'Content-Type':'text/javascript', 'Cache-Control':'no-cache'}); return res.end(sw);
  }
  if((url.pathname === '/' || url.pathname === '/index.html') && seiteAus){ res.writeHead(503); return res.end(); }
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
    // Archivierte Monate bleiben wie in der echten Datenbank liegen:
    // sonst archivierte jeder Start neu und zeichnete danach noch einmal.
    let archiv = {}; try { archiv = JSON.parse(localStorage.getItem('attrappe_seasons') || '{}'); } catch(e){}
    const saisons = D.seasons.filter(x => !archiv[x.id]).concat(Object.values(archiv))
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
    const tab = {players:D.players, matches:D.matches, seasons:saisons, stories:[],
      config:{id:1, k_factor:32, risk_split:.6, pos_swing:.45, start_elo:0, win_boost:1.12,
        mov_loss_damp:.5, match_bonus:1.5, low_elo_loss_damp:0}}[t];
    return {data: tab === undefined ? [] : JSON.parse(JSON.stringify(tab)), error:null};
  };
  const kette = (t, ops) => new Proxy(function(){}, {
    get(_, p){
      if(p === 'then'){
        if(!ops.some(o => ['insert','update','upsert','delete'].includes(o))) window.__lesen.push(t);
        // __langsam hält jede Leseabfrage zurück (ein langsames Netz),
        // __fehler lässt sie scheitern (kein Netz).
        const r = (window.__fehler && !ops.some(o => ['insert','update','upsert','delete'].includes(o)))
          ? {data:null, error:{message:'kein Netz'}} : antwort(t, ops);
        return (ja) => new Promise(f => setTimeout(() => f(r), window.__langsam || 0)).then(ja);
      }
      return kette(t, ops.concat(String(p)));
    },
    apply(_, __, args){
      const o = ops[ops.length-1];
      if(['insert','update','upsert','delete'].includes(o)) window.__schreib.push(t + '.' + o);
      if(t === 'seasons' && o === 'upsert' && args[0]) try {
        const archiv = JSON.parse(localStorage.getItem('attrappe_seasons') || '{}');
        archiv[args[0].id] = args[0]; localStorage.setItem('attrappe_seasons', JSON.stringify(archiv));
      } catch(e){}
      return kette(t, ops);
    }
  });
  const kanal = () => new Proxy(function(){}, {get(_, p){ return p === 'then' ? undefined : kanal(); }, apply(){ return kanal(); }});
  window.supabase = {createClient: () => ({
    from: t => kette(t, []), channel: kanal, removeChannel(){},
    rpc: (...a) => { window.__schreib.push('rpc'); return kette('rpc', []); } })};
})();`;

// Die Fixtures tragen keine gespeicherten Deltas. Die Datenbank tut es, und
// ohne sie stünde jede Elo auf null — das Saisonarchiv hielte jeden Monat für
// unfertig („alter Bug") und schriebe ihn bei jedem Start neu. Gerechnet
// werden sie mit der App selbst, wie in tools/performance.cjs.
const DATEN = (() => {
  const {K, setNow} = require('./runtime.js').createRuntime();
  setNow(new Date(2026, 7, 26, 21).getTime());
  K(`players=${JSON.stringify(fixtures.players)};matches=${JSON.stringify(fixtures.matches)};seasons=[];invalidateCache();
    const d=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h.deltas]));
    matches.forEach(m=>m.deltas=d.get(m.id)||{});invalidateCache();`);
  return {players:fixtures.players, matches:K('matches'), seasons:fixtures.seasons};
})();
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
    // Der Service Worker bekommt einen eigenen Kontext (unten): hier stünde
    // er zwischen der Seite und jeder Zusicherung über den Start ohne ihn.
    const ctx = await browser.newContext({viewport:{width:390, height:844}, serviceWorkers:'block'});
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
    // ── Vorwärmen im Leerlauf ─────────────────────────────────────────
    // Nach dem Start rechnet niemand mehr kalt, wenn ein Reiter aufgeht.
    await w.page.waitForFunction(() => window.__K('_vorwaermAuftrag === null'), null, {timeout:60000});
    const kalt = await w.page.evaluate(() => {
      const K = window.__K;
      K(`window.__kalt = 0;
        for(const f of ['simulateElo','_awardRankingsUncached','_seasonTitleCtxRechnen','teamStatsFromMatches']){
          const alt = eval(f); eval(f + ' = function(){ window.__kalt++; return alt.apply(this, arguments); }');
        }`);
      const je = {};
      for(const z of ["tab='positions';rankMetric='atk'", "tab='awards';awView='awards';awPeriod='season';awSeasonId=null",
                      "tab='awards';awView='rekorde'", "tab='awards';awView='chronik'", "tab='teams'"]){
        // Der Kontext der Rekorde ist ein Memo, das auch bei jedem Treffer
        // gerufen wird; gezählt wird, ob sein Topf wächst.
        const ctx = () => Object.keys(_cache._chronCtxBis || {}).length + (_cache._chronCtxKey ? 1 : 0);
        const vor = window.__kalt, c0 = K('(' + ctx + ')()'); K(z + ';render()');
        je[z] = window.__kalt - vor + (K('(' + ctx + ')()') - c0);
      }
      return je;
    });
    for(const [z, n] of Object.entries(kalt)) ok(n === 0, 'Nach dem Vorwärmen rechnet der erste Aufruf nichts kalt: ' + z + (n ? ' (' + n + ' kalte Rechnungen)' : ''));
    // Neue Daten brechen einen laufenden Auftrag ab; er rechnet nicht für
    // einen Stand weiter, den es nicht mehr gibt.
    ok(await w.page.evaluate(async () => {
      const K = window.__K; K('_vorwaermen(); window.__auftrag = _vorwaermAuftrag; invalidateCache();');
      await new Promise(r => setTimeout(r, 1500));
      return K('window.__auftrag.schritt === 0');
    }), 'Ein neuer Datenstand bricht das Vorwärmen ab');
    ok(w.fehler.length === 0, 'Worker-Start ohne Seitenfehler' + (w.fehler.length ? ': ' + w.fehler[0] : ''));
    await w.page.close();

    // ── Der Schnellstart aus dem letzten Stand ────────────────────────
    // Die Starts oben haben ihn gespeichert. Das Netz antwortet jetzt erst
    // nach drei Sekunden: bis dahin steht die Liga aus dem Stand da, und
    // nichts wird geschrieben.
    const q = await neueSeite(ctx);
    await q.page.addInitScript(() => {
      window.__langsam = 3000;
      window.__vorStart = K => { window.__K = K; };
    });
    const t0 = Date.now();
    await q.page.goto(BASIS);
    await q.page.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:10000});
    const schnell = Date.now() - t0;
    const vorLive = await q.page.evaluate(() => ({
      schreib:window.__K('window.__schreib.length'), html:document.getElementById('main').innerHTML,
      conn:(document.getElementById('connText')||{}).textContent || '', knoten:!!(window.__knoten = document.getElementById('main').firstElementChild),
      stories:window.__K('Array.isArray(_cache._stories) ? _cache._stories.length : 0')}));
    ok(schnell < 2500, `Die Liga steht aus dem Stand, bevor das Netz antwortet (${schnell} ms bei 3000 ms Netz)`);
    ok(vorLive.schreib === 0, 'Der Schnellstart schreibt nichts in die Datenbank');
    ok(vorLive.conn === 'verbinde…', 'Bis der Live-Abruf da ist, steht „verbinde…“');
    ok(vorLive.stories > 20, 'Der Feed hat seine Stories schon aus dem Stand');
    await q.page.waitForFunction(() => window.__K('_lastLoadFingerprint !== null && window.__schreib.some(x => x.startsWith("stories."))'), null, {timeout:60000});
    const nachLive = await q.page.evaluate(() => ({html:document.getElementById('main').innerHTML,
      gleicherKnoten:document.getElementById('main').firstElementChild === window.__knoten}));
    ok(nachLive.html === vorLive.html, 'Der Live-Abruf mit denselben Daten zeigt dasselbe Markup wie der Stand');
    ok(nachLive.gleicherKnoten, 'Derselbe Stand wird nicht ein zweites Mal gezeichnet');
    ok(q.fehler.length === 0, 'Schnellstart ohne Seitenfehler' + (q.fehler.length ? ': ' + q.fehler[0] : ''));
    // Ohne Netz bleibt der Stand stehen; die Fehlerkarte ersetzt ihn nicht.
    await q.page.close();
    const o = await neueSeite(ctx);
    await o.page.addInitScript(() => { window.__fehler = true; window.__langsam = 300; window.__vorStart = K => { window.__K = K; }; });
    await o.page.goto(BASIS);
    await o.page.waitForFunction(() => window.__K && window.__K('_loadAllPromise === null'), null, {timeout:20000});
    ok(await o.page.evaluate(() => !!document.querySelector('#main .rlist') && !document.querySelector('#main .empty')),
      'Ohne Netz bleibt der letzte Stand stehen, statt einer Fehlerkarte');
    // Ein Stand einer anderen Fassung der App gilt nicht.
    await o.page.evaluate(() => new Promise(ja => { const r = indexedDB.open('kicker-stand', 1);
      r.onsuccess = () => { const tx = r.result.transaction('stand', 'readwrite'); const st = tx.objectStore('stand');
        const g = st.get('liga'); g.onsuccess = () => { const x = g.result; x.version = '1999.01.01.x'; st.put(x, 'liga'); };
        tx.oncomplete = () => { r.result.close(); ja(); }; }; }));
    await o.page.close();
    const f = await neueSeite(ctx);
    await f.page.addInitScript(() => { window.__langsam = 2500; window.__vorStart = K => { window.__K = K; }; });
    await f.page.goto(BASIS);
    await f.page.waitForTimeout(1200);
    ok(await f.page.evaluate(() => !document.querySelector('#main .rlist')), 'Ein Stand einer anderen Fassung wird nicht gezeichnet');
    await f.page.close();

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

    // ── Der Service Worker ────────────────────────────────────────────
    const swCtx = await browser.newContext({viewport:{width:390, height:844}});
    await swCtx.addInitScript(({daten, jetzt}) => {
      window.__startDaten = daten;
      const RD = Date;
      window.Date = class extends RD{ constructor(...a){ a.length ? super(...a) : super(jetzt); } static now(){ return jetzt; } };
      window.setInterval = () => 0;
      window.__vorStart = K => { window.__K = K; };
    }, {daten:DATEN, jetzt:JETZT});
    // Jede Anfrage dieses Kontexts, die nicht an den eigenen Server geht.
    const fremd = [];
    swCtx.on('request', r => { if(!r.url().startsWith(BASIS) && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) fremd.push(r.url()); });
    const s1 = await swCtx.newPage();
    const swFehler = []; s1.on('pageerror', e => swFehler.push(e.message));
    await s1.goto(BASIS);
    await s1.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    const fassung = await s1.evaluate(() => window.__K('BUILD_VERSION'));
    const topf = await s1.evaluate(async () => {
      await navigator.serviceWorker.ready;
      for(let i = 0; i < 50; i++){
        const namen = await caches.keys();
        const seite = namen.find(n => n.startsWith('kicker-seite-'));
        if(seite && await (await caches.open(seite)).match(navigator.serviceWorker.controller ? location.origin + '/' : location.href)) return namen;
        await new Promise(r => setTimeout(r, 100));
      }
      return caches.keys();
    });
    ok(topf.includes('kicker-seite-' + fassung), 'Der Service Worker hält die Seite unter ihrer Fassung (' + topf.join(', ') + ')');
    await s1.close();
    // Ohne Netz kommt die Seite aus dem Topf, die Liga aus dem Stand.
    seiteAus = true; anfragen.length = 0;
    const s2 = await swCtx.newPage(); s2.on('pageerror', e => swFehler.push(e.message));
    await s2.goto(BASIS);
    await s2.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    ok(await s2.evaluate(() => !!navigator.serviceWorker.controller), 'Ohne Netz öffnet die App aus dem Service Worker');
    // Der Update-Check geht trotzdem ans Netz, nicht an den Topf.
    for(let i = 0; i < 80 && !anfragen.some(x => x.cb); i++) await s2.waitForTimeout(100);
    ok(anfragen.some(x => x.cb && x.modus !== 'navigate'), 'Der Update-Check fragt das Netz, nicht den Service Worker');
    // `forceReload` lädt die Seite aus dem Netz, nicht aus dem Topf.
    seiteAus = false; anfragen.length = 0;
    await Promise.all([s2.waitForNavigation({timeout:20000}), s2.evaluate(() => window.__K('forceReload()'))]);
    await s2.waitForFunction(() => document.querySelector('#main .rlist'), null, {timeout:20000});
    ok(anfragen.some(x => x.cb && x.modus === 'navigate'), 'Neu laden holt die Seite aus dem Netz');
    // Eine neue Fassung räumt den Topf der alten.
    swFassung = 'neu-1';
    const nachher = await s2.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      for(let i = 0; i < 80; i++){
        const namen = await caches.keys();
        if(namen.includes('kicker-seite-neu-1') && namen.filter(n => n.startsWith('kicker-seite-')).length === 1) return namen;
        await new Promise(r => setTimeout(r, 100));
      }
      return caches.keys();
    });
    ok(nachher.includes('kicker-seite-neu-1') && !nachher.includes('kicker-seite-' + fassung),
      'Eine neue Fassung räumt den Topf der alten (' + nachher.join(', ') + ')');
    ok(fremd.length === 0, 'Keine Anfrage geht an eine fremde Adresse' + (fremd.length ? ': ' + fremd[0] : ''));
    ok(swFehler.length === 0, 'Service Worker ohne Seitenfehler' + (swFehler.length ? ': ' + swFehler[0] : ''));
    await swCtx.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log(fails ? `${fails} von ${checks} CHECKS FEHLGESCHLAGEN` : `ALLE ${checks} CHECKS BESTANDEN`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(1); });
