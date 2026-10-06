// DIE AKTIVE LIGA OHNE RUHESTÄNDLER [§C40] — im echten Browser, über alles,
// was ein Reiter zeigt.
//
// Die anderen Suiten prüfen die Rechnungen, aus denen die Ansichten lesen.
// Diese prüft, was auf dem Bildschirm steht: jeder Reiter der Navigation,
// jeder Wähler darin und jeder Einblick, in jeder Kombination bis zur Tiefe
// drei, und die Spielerwahl der Eingabe. Sie kennt keine einzelne Ansicht —
// ein Reiter, ein Wähler oder eine Liste, die es heute noch nicht gibt,
// wird genauso abgesucht. Gesucht wird der Ruheständler mit Name und ID.
//
// Er darf nur dort stehen, wo eine Ansicht es ausdrücklich erlaubt:
// innerhalb von `[data-ruhestand]` (die Liste der Ruheständler) und in
// `[data-bis]`, einem Stück Geschichte, das bis zu diesem Zeitpunkt reicht —
// dort nur, wenn es vor seinem Karriereende endet. Und in den Reitern, die
// Geschichte sind (`GESCHICHTE`): der Verlauf zeigt jede Partie, auch seine.
const fs = require('fs');
const chromium = require('./browser.js').ladeChromium();
if(!chromium){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Was ein Reiter zeigt, lässt sich nur gerendert absuchen.');
  console.log('  Lokal: npm install --no-save playwright-core');
  process.exit(2);
}

// Reiter, die Geschichte sind und ihn deshalb zeigen dürfen. Ein neuer
// Reiter steht NICHT hier und wird damit abgesucht, bis jemand entscheidet,
// dass er Geschichte ist.
const GESCHICHTE = ['history'];
const TIEFE = 3;

const NAMES = ['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const IDS = NAMES.map((n,i) => '00000000-0000-4000-8000-' + String(i).padStart(12,'0'));
const packed = fs.readFileSync(__dirname + '/fixtures/matches.txt', 'utf8').trim();
const MATCHES = packed.split(';').map((row, i) => {
  const f = row.split(',').map(Number);
  const pos = k => f[4+k] === 0 ? 'atk' : 'def';
  return {id:'m' + String(i).padStart(4,'0'),
    a1:IDS[f[0]], a2:IDS[f[1]], b1:IDS[f[2]], b2:IDS[f[3]],
    a1_pos:pos(0), a2_pos:pos(1), b1_pos:pos(2), b2_pos:pos(3),
    score_a:f[8], score_b:f[9], winner:f[10] === 0 ? 'A' : 'B',
    exp_a:f[11]/1000, created_at:new Date(f[12]*1000).toISOString(), deltas:{}};
});
// Er hört eine Minute nach der letzten Partie der Liga auf: alles, was er
// gespielt hat, liegt davor, und der laufende Monat vergleicht ohne ihn.
const RUHE = 'Martin', RUHE_ID = IDS[NAMES.indexOf(RUHE)];
const ENDE = new Date(Math.max(...MATCHES.map(m => Date.parse(m.created_at))) + 60000).toISOString();
const PLAYERS = NAMES.map((n,i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:null, created_at:'2026-05-01T00:00:00Z', retired_at: n === RUHE ? ENDE : null}));
const SEASONS = [
  {id:'2026-05', label:'Mai 2026',    start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026',   start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026',   start_date:'2026-06-30', end_date:'2026-07-31'},
];
const NOW = Date.parse(ENDE) + 3 * 3600e3;

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
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
  const RD = Date, N = ${NOW};
  window.Date = class extends RD { constructor(...a){ a.length?super(...a):super(N); } static now(){ return N; } };
})();
`;

let fails = 0, checks = 0;
const ok = (c, msg, det) => {
  checks++; if(!c) fails++;
  console.log((c ? '  ok  ' : '  ✗   ') + '  ' + msg + (det ? (c ? '  (' + det + ')' : '  [' + det + ']') : ''));
};

// Die Zustände, mit denen ein Reiter beginnt. Vor jedem Pfad wird auf sie
// zurückgesetzt, damit ein Pfad nicht vom vorigen abhängt.
const ZUSTAND = ['period','ligaSeasonId','ligaSicht','awView','awPeriod','awSeasonId','awWeekStart',
  'rekKammer','rankMetric','teamView','teamSort','posSort','einblickOffen','teamSearch','histFilter'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = async src => page.evaluate(s => window.__k.eval(s), src);
  await K(`
    players = ${JSON.stringify(PLAYERS)};
    matches = ${JSON.stringify(MATCHES)};
    seasons = ${JSON.stringify(SEASONS)};
    invalidateCache();
    const _rc = simulateEloWithSliders(matches);
    const _d = {}; _rc.history.forEach(h => { _d[h.matchId] = h.deltas; });
    matches.forEach(m => { m.deltas = _d[m.id] || {}; });
    invalidateCache();
    globalThis.__start = {${ZUSTAND.map(z => z + ':' + z).join(',')}};
    'bereit'`);
  ok(errors.length === 0, 'Skript lädt ohne Fehler', errors[0]);
  ok(await K(`imRuhestand('${RUHE_ID}') && !ligaAktiv('${RUHE_ID}')`), RUHE + ' ist im Ruhestand');

  // Die Reiter kommen aus der Navigation selbst, die Eingabe dazu.
  const reiter = (await K('NAV.map(n => n[0])')).concat(['match']);
  const warte = () => page.waitForTimeout(60);
  const wurzel = async t => {
    await K(`${ZUSTAND.map(z => z + ' = __start.' + z).join('; ')}; tab = ${JSON.stringify(t)}; render();`);
    await warte();
  };
  // Jeder Knopf eines Reiters ist eine mögliche Wahl: Wähler, Kammern,
  // Einblicke und alles, was künftig dazukommt. Ein Knopf, der ein Blatt
  // öffnet, ändert den Reiter nicht und wird über den Abdruck des Reiters
  // als schon gesehen erkannt. Was nur zeigt, wer ein Ruheständler ist, wird
  // nicht aufgeklappt. Die Eingabe wird nur abgesucht, nicht gedrückt: ihre
  // Knöpfe zählen Tore und speichern.
  const WAHL = 'button, [role=tab]';
  const knoepfe = () => page.evaluate(sel => [...document.querySelectorAll('#main ' + sel.split(', ').join(', #main '))]
    .filter(b => !b.closest('[data-ruhestand]')).map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)), WAHL);
  const druecke = i => page.evaluate(([sel, i]) => {
    const b = [...document.querySelectorAll('#main ' + sel.split(', ').join(', #main '))].filter(b => !b.closest('[data-ruhestand]'))[i];
    if(b) b.click();
  }, [WAHL, i]);
  const absuchen = () => page.evaluate(([id, name, ende]) => {
    const main = document.getElementById('main').cloneNode(true);
    main.querySelectorAll('[data-ruhestand]').forEach(e => e.remove());
    main.querySelectorAll('[data-bis]').forEach(e => { if(+e.dataset.bis <= ende) e.remove(); });
    const t = main.textContent.replace(/\s+/g, ' ');
    const i = t.search(new RegExp('\\b' + name + '\\b'));
    return {id: main.outerHTML.includes(id), name: i >= 0 ? t.slice(Math.max(0, i - 50), i + 30) : '',
            sig: main.innerHTML.length + ':' + main.textContent.length, leer: !main.textContent.trim()};
  }, [RUHE_ID, RUHE, Date.parse(ENDE)]);

  for(const t of reiter){
    console.log('\n═══ REITER ' + t + (GESCHICHTE.includes(t) ? ' — Geschichte, nicht abgesucht' : '') + ' ═══');
    if(GESCHICHTE.includes(t)) continue;
    const gesehen = new Set(), funde = [];
    let ansichten = 0;
    // Breitensuche über Pfade aus Knopfnummern, jeder ab dem Anfangszustand.
    let reihe = [[]];
    for(let tiefe = 0; tiefe <= TIEFE && reihe.length; tiefe++){
      const naechste = [];
      for(const pfad of reihe){
        await wurzel(t);
        for(const i of pfad){ await druecke(i); await warte(); }
        const s = await absuchen();
        if(gesehen.has(s.sig)) continue;
        gesehen.add(s.sig);
        ansichten++;
        if(s.id || s.name){
          const namen = await knoepfe();
          funde.push(pfad.map(i => namen[i] || i).join(' › ') + ': ' + (s.name || 'nur die ID'));
        }
        if(tiefe < TIEFE && t !== 'match'){
          const n = (await knoepfe()).length;
          for(let i = 0; i < n; i++) naechste.push(pfad.concat(i));
        }
      }
      reihe = naechste;
    }
    ok(ansichten > 0 && !funde.length, t + ': ' + RUHE + ' steht in keiner Ansicht der aktiven Liga',
       funde.length ? funde.slice(0, 3).join(' | ') : ansichten + ' Ansichten');
  }

  // Die Spielerwahl der Eingabe zeigt ihre Liste erst beim Tippen.
  console.log('\n═══ DIE SPIELERWAHL ═══');
  await wurzel('match');
  const felder = await page.evaluate(() => document.querySelectorAll('#main [data-combo]').length);
  const angeboten = [];
  for(let i = 0; i < felder; i++){
    const f = page.locator('#main [data-combo]').nth(i);
    await f.focus();
    await f.fill(RUHE.slice(0, 3));
    await warte();
    const s = await absuchen();
    if(s.id || s.name) angeboten.push(i);
    await f.press('Escape');
    await f.fill('');
  }
  ok(felder >= 4 && !angeboten.length, 'kein Feld der Eingabe bietet ' + RUHE + ' an',
     angeboten.length ? 'Feld ' + angeboten.join(', ') : felder + ' Felder');

  // Gegenprobe: ohne Karriereende steht er in derselben Suche überall da.
  // Ohne sie wäre eine Suche, die gar nichts findet, immer grün.
  console.log('\n═══ GEGENPROBE ═══');
  await K(`pmap()['${RUHE_ID}'].retired_at = null; invalidateCache();`);
  await wurzel('ranking');
  const da = await absuchen();
  await K(`pmap()['${RUHE_ID}'].retired_at = ${JSON.stringify(ENDE)}; invalidateCache();`);
  ok(da.id && !!da.name, 'ohne Karriereende findet dieselbe Suche ihn in der Liga', da.name);
  ok(errors.length === 0, 'kein Fehler beim Durchklicken', errors[0]);

  await browser.close();
  console.log('\n' + (fails ? '✗ ' + fails + ' von ' + checks + ' CHECKS FEHLGESCHLAGEN' : '✓ ALLE ' + checks + ' CHECKS BESTANDEN'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('ABBRUCH ' + (e.stack || e)); process.exit(1); });
