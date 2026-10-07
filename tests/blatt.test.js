// DAS BLATT — was ein Sheet mit einer Berührung macht, im echten Browser.
//
// Drei Dinge, die man einer Datei nicht ansieht und die alle schon falsch
// waren:
//
//   1. WEM GEHÖRT EINE GESTE. Das Blatt zieht bei einem Wisch nach unten
//      mit und schließt sich. Dafür ruft es preventDefault — und damit
//      steht jedes waagerechte Scrollen darin still, sobald das Blatt die
//      Geste an sich reißt. Genau so war es: geprüft wurde nur die
//      senkrechte Strecke, und ein Querwisch driftet fast immer ein Stück
//      nach unten. In der Laufbahn-Vitrine sah das aus, als spränge sie
//      zurück.
//
//   2. OB MAN JEDE STUFE ERREICHT. Die Vitrine zeigt fünf Insignien, eine
//      groß in der Mitte. Wischen allein hat die letzte nie erreicht;
//      jetzt ist jede Karte auch ein Ziel zum Antippen.
//
//   3. OB EIN WAPPEN SEINE VERLÄUFE FINDET. Die zwölf Verläufe eines
//      Zeichens hängen nur am Rang und am Glanz der Schwinge, nicht am
//      Spieler. Sie stehen deshalb einmal im Dokument, und jedes Wappen
//      verweist darauf. Ein Verweis auf einen Verlauf, den es nicht gibt,
//      wirft keinen Fehler und färbt nichts rot — die Fläche bleibt
//      einfach schwarz. Genau deshalb wird hier nachgesehen.
//
//   4. OB IM HINTERGRUND GELADEN WIRD. `loadAll` holt alle Spieler und alle
//      Partien, alle dreißig Sekunden — früher auch dann, wenn das Telefon
//      in der Tasche steckte.
//
// Alles vier lässt sich nur gerendert prüfen: es hängt an Ereignissen, an
// scrollLeft und an dem, was nach einem render() noch im Dokument steht.
const fs = require('fs');
const chromium = require('./browser.js').ladeChromium();
if(!chromium){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  console.log('  Eine Geste hat kein Markup; sie lässt sich nur gerendert messen.');
  console.log('  Lokal: npm install --no-save playwright-core');
  process.exit(2);
}

// ── Die echten Partien der Liga, wie in tafel ──
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
const PLAYERS = NAMES.map((n,i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:.5,
  avatar_id:null, created_at:'2026-05-01T00:00:00Z'}));
const SEASONS = [
  {id:'2026-05', label:'Mai 2026',    start_date:'2026-04-30', end_date:'2026-05-31'},
  {id:'2026-06', label:'Juni 2026',   start_date:'2026-05-31', end_date:'2026-06-30'},
  {id:'2026-07', label:'Juli 2026',   start_date:'2026-06-30', end_date:'2026-07-31'},
  {id:'2026-08', label:'August 2026', start_date:'2026-07-31', end_date:'2026-08-31'},
];
const NOW = new Date(2026, 7, 26, 21, 0, 0).getTime();

const html = fs.readFileSync(require('./ziel.js'), 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, blocks = [];
while ((m = re.exec(html))) blocks.push(m[1]);
blocks.sort((a, b) => b.length - a.length);
let code = blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '/*t*/');
const lc = code.lastIndexOf('})();');
code = code.slice(0, lc) + '\nwindow.__k = {eval: c => eval(c)};\n' + code.slice(lc);
// Ohne die Stile der App misst man ein Dokument ohne Layout — und ein
// Karussell ohne overflow-x hat keinen Scrollbereich.
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
  console.log((c ? '  ok  ' : '  FAIL') + '  ' + msg + (!c && det ? ' → ' + det : ''));
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.setContent('<!doctype html><html><head><meta charset="utf-8">' + styles
    + '</head>' + bodyHtml + '</body></html>');
  await page.addScriptTag({content: BOOT});
  await page.addScriptTag({content: code});
  const K = async src => page.evaluate(s => window.__k.eval(s), src);
  ok(errors.length === 0, 'Skript lädt ohne Fehler', errors[0]);
  // Karten außerhalb des Bildschirms legt der Feed erst, wenn sie hineinkommen
  // (`content-visibility:auto`) — ihr Inhalt hat bis dahin keine Geometrie.
  // Gemessen wird hier aber, wie eine Karte AUSSIEHT, also so, wie sie auf
  // dem Bildschirm liegt. Dass die Regel greift, prüft ein eigener Check.
  await page.addStyleTag({content: '.nf-card{content-visibility:visible!important}'})
    .then(h => h.evaluate(e => e.id = 'cv-aus'));

  await K(`
    players = ${JSON.stringify(PLAYERS)};
    matches = ${JSON.stringify(MATCHES)};
    seasons = ${JSON.stringify(SEASONS)};
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
      s.top_elo = JSON.stringify(top.slice(0,3));
      s.player_id = top[0] ? top[0].id : null;
    });
    invalidateCache();
    bindSheetSwipe();
    'bereit'`);

  // ── DER INHALTSTAUSCH HÄNGT AM ENDE DES ZUSCHIEBENS ─────────────────
  //    Beim Zurückgehen schiebt sich das Kind-Blatt nach unten, der Inhalt
  //    wird getauscht, das Eltern-Blatt kommt hoch. Der Tausch baut das
  //    Eltern-Blatt neu, und der Feed kostet dabei gemessen über 100 ms
  //    Hauptthread — 94 % seines Markups sind die SVG der Wappen.
  //    Geplant war er per `setTimeout(200)`, und ein Timer ist nicht das Ende
  //    einer Transition: er läuft ab dem Aufruf, die Transition erst ab dem
  //    nächsten Style-Flush. Der Block fiel damit in die letzten Bilder des
  //    Zuschiebens und riss sie ab.
  //    Gemessen wird der ABSTAND zwischen dem `transitionend` des Zuschiebens
  //    und dem Tausch. Die Position des Blatts taugt dafür nicht — sie steht
  //    in beiden Fassungen auf 100 %, weil der Umbau vor dem nächsten Bild
  //    fertig wird. Und bei den echten 200 ms liegen Timer und Transitionsende
  //    so dicht beieinander, dass der Vergleich zufällig ausfällt: die Dauer
  //    wird deshalb für die Messung heruntergesetzt, damit ein Timer
  //    überhaupt von einem Ende zu unterscheiden ist.
  //    Das Kind-Blatt muss dafür erst stehen: wird es im selben Durchlauf
  //    geöffnet und geschlossen, wechselt sein Transform nie und es gibt
  //    überhaupt keine Transition, die enden könnte.
  console.log('\n═══ DER TAUSCH HÄNGT AM ENDE DES ZUSCHIEBENS ═══');
  const stapel = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const st = document.createElement('style');
    st.id = 'messDauer';
    st.textContent = '#sheet{transition-duration:20ms !important}';
    document.head.appendChild(st);
    K('openSheet("<h3>Eltern</h3><div id=\'elternMark\'>da</div>")');
    window.__swapT = null;
    K('_sheetSetReopen(function(){ window.__swapT = performance.now() - window.__t0;'
      + ' openSheet("<h3>Eltern</h3><div id=\'elternMark\'>da</div>"); })');
    K('_pushCurrentSheet(); openSheet("<h3>Kind</h3>")');
    return K('_sheetStack.length');
  });
  await page.waitForTimeout(500);
  const swap = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const sheet = document.getElementById('sheet');
    // Der eigene Horcher wird VOR dem Schließen gesetzt und läuft damit vor
    // dem des Blatts: das erste Ende ist gemessen, bevor getauscht wird.
    window.__enden = [];
    const horch = (e) => {
      if(e.target === sheet && e.propertyName === 'transform')
        window.__enden.push(performance.now() - window.__t0);
    };
    sheet.addEventListener('transitionend', horch);
    return new Promise(res => {
      window.__t0 = performance.now();
      K('closeSheet()');
      setTimeout(() => {
        sheet.removeEventListener('transitionend', horch);
        const s = document.getElementById('messDauer');
        if(s) s.remove();
        res({tausch: window.__swapT, enden: window.__enden,
             elternDa: !!document.getElementById('elternMark')});
      }, 1200);
    });
  });
  ok(stapel === 1, 'ein Eltern-Blatt liegt auf dem Stapel', String(stapel));
  ok(swap.elternDa, 'nach dem Zurückgehen steht das Eltern-Blatt wieder da');
  ok(swap.tausch != null, 'der Tausch wurde gemessen', String(swap.tausch));
  ok(swap.enden.length >= 1, 'das Zuschieben läuft als Transition zu Ende',
     JSON.stringify(swap.enden));
  // Am Ende gemessen: 5 ms Abstand. Mit dem Timer waren es 180 ms, und in
  // dieser Zeit stand das Blatt unten und wartete.
  const zuEnde = swap.enden[0];
  const abstand = swap.tausch != null && zuEnde != null ? swap.tausch - zuEnde : null;
  ok(abstand != null && abstand >= -5 && abstand <= 100,
     'der Tausch hängt am Ende des Zuschiebens, nicht an einem Timer',
     abstand == null ? 'nicht gemessen' : Math.round(abstand) + ' ms Abstand');

  console.log('\n═══ 1. EINE GESTE GEHÖRT EINEM ═══');
  // Gewischt wird mit echten Touch-Ereignissen. Gemessen werden die beiden
  // Dinge, die der Blatt-Zug tut: preventDefault rufen (damit steht das
  // waagerechte Scrollen still) und das Blatt verschieben.
  await K(`showLaufbahn(${JSON.stringify(IDS[8])})`);
  await page.waitForTimeout(400);
  const gesten = await page.evaluate(async () => {
    const sheet = document.getElementById('sheet');
    const ziel = document.querySelector('.lb-k') || sheet;
    const feuern = (typ, x, y) => {
      const T = new Touch({identifier:1, target:ziel, clientX:x, clientY:y});
      const leer = typ === 'touchend';
      const ev = new TouchEvent(typ, {touches: leer ? [] : [T], changedTouches:[T],
        targetTouches: leer ? [] : [T], bubbles:true, cancelable:true});
      ziel.dispatchEvent(ev);
      return ev;
    };
    const wisch = async (dx, dy) => {
      sheet.style.transform = '';
      feuern('touchstart', 200, 300);
      let verhindert = false;
      for(let i = 1; i <= 10; i++)
        if(feuern('touchmove', 200 + dx*i/10, 300 + dy*i/10).defaultPrevented) verhindert = true;
      // Der Zug zeichnet nur den jüngsten Stand je Bild. Dieselbe Geste
      // wird am gezeichneten Bild gemessen, nicht innerhalb ihres Aufrufs.
      await new Promise(requestAnimationFrame);
      const zug = sheet.style.transform;
      feuern('touchend', 200 + dx, 300 + dy);
      sheet.style.transform = '';
      return {verhindert, gezogen: /translateY\([^0]/.test(zug)};
    };
    return {
      // Ein Querwisch driftet fast immer nach unten — 22 px auf 140 sind
      // eine ruhige Hand, 40 auf 160 eine normale.
      quer:      await wisch(-140, 22),
      querStark: await wisch(-160, 40),
      querZurueck: await wisch(150, 30),
      // Und das Blatt muss weiter zuziehen, sonst hat der Schutz zu viel
      // verboten.
      runter:    await wisch(8, 120),
      schraeg:   await wisch(60, 110)
    };
  });
  ['quer','querStark','querZurueck'].forEach(k => {
    ok(!gesten[k].verhindert && !gesten[k].gezogen,
       `waagerecht (${k}): das Blatt lässt die Geste in Ruhe`,
       JSON.stringify(gesten[k]));
  });
  ['runter','schraeg'].forEach(k => {
    ok(gesten[k].verhindert && gesten[k].gezogen,
       `senkrecht (${k}): das Blatt zieht mit`,
       JSON.stringify(gesten[k]));
  });

  // Die beiden senkrechten Wische haben das Blatt geschlossen, und ein
  // geschlossenes Blatt wird am Ende des Zuschiebens geleert. Vorher blieb
  // sein Inhalt stehen, und die Vitrine darunter wurde in einem Blatt
  // gemessen, das gar nicht mehr offen war.
  await K(`closeSheet(true);showLaufbahn(${JSON.stringify(IDS[8])})`);
  await page.waitForTimeout(400);
  console.log('\n═══ 2. DIE VITRINE IST EIN ZIEL ═══');
  // Fünf Stufen, und jede muss man ansehen können. Wischen allein hat die
  // letzte nicht erreicht — die Geste gehörte dem Blatt. Antippen ist der
  // zweite Weg, und der geht immer.
  const vitrine = await page.evaluate(async () => {
    const d = document.getElementById('lbLeiter');
    if(!d) return {fehlt:true};
    const k = [...d.querySelectorAll('.lb-k')];
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const out = {karten:k.length, schritte:[]};
    // Rückwärts, damit auch der Sprung über die ganze Breite dabei ist.
    for(const i of [6, 0, 3, 1, 5, 2, 4]){
      k[i].click();
      await warte(700);
      const mitte = d.scrollLeft + d.clientWidth / 2;
      out.schritte.push({i,
        fokus: k.findIndex(x => x.classList.contains('fokus')),
        // Wie weit die Karte von der Mitte des Fensters weg liegt.
        ab: Math.round(Math.abs(k[i].offsetLeft + k[i].offsetWidth/2 - mitte))});
    }
    return out;
  });
  ok(!vitrine.fehlt && vitrine.karten === 7,
     'die Vitrine steht mit allen sieben Stufen', JSON.stringify(vitrine));
  if(!vitrine.fehlt){
    const daneben = vitrine.schritte.filter(s => s.fokus !== s.i);
    ok(daneben.length === 0, 'jede angetippte Stufe wird die gewählte',
       daneben.map(s => s.i + '→' + s.fokus).join(' '));
    // Nicht nur „irgendwie hin", sondern MITTIG: die Karte in der Mitte ist
    // die große, und eine halb angeschobene Karte ist keine Auswahl.
    const schief = vitrine.schritte.filter(s => s.ab > 2);
    ok(schief.length === 0, 'und liegt danach in der Mitte',
       schief.map(s => s.i + ': ' + s.ab + ' px daneben').join(' '));
  }

  // ── Alle Stufen [§C30] ──────────────────────────────────────────────
  //    Jedes Feld der Leiter steht im Blatt, das eigene ist markiert, und ein
  //    Feld anzutippen legt genau dieses Bild in die Vitrine: seine Stufe in
  //    die Mitte, seinen Grad als gezeigten Knopf. Vorher gab es die Grade
  //    nur als Marken, und wie ein Grad aussieht, sah man nirgends.
  const alle = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const felder = [...document.querySelectorAll('#lbAlle [data-lbfeld]')];
    if(!felder.length) return {fehlt:true};
    const d = document.getElementById('lbLeiter'), k = [...d.querySelectorAll('.lb-k')];
    const warte = ms => new Promise(r => setTimeout(r, ms));
    const jetzt = [...document.querySelectorAll('#lbAlle .lb-feld.jetzt')].map(b => b.getAttribute('data-lbfeld'));
    const bildVon = i => (k[i].querySelector('.lb-k-ins use') || {getAttribute:()=>''}).getAttribute('href');
    const out = {felder:felder.length, jetzt, schritte:[]};
    for(const f of ['5,2', '1,0', '3,1']){
      const [i, g] = f.split(',').map(Number);
      const vorher = bildVon(i);
      document.querySelector('#lbAlle [data-lbfeld="' + f + '"]').click();
      await warte(700);
      const zeigt = k[i].querySelector('[data-lbgrad].zeigt');
      out.schritte.push({f, fokus: k.findIndex(x => x.classList.contains('fokus')),
        zeigt: zeigt ? +zeigt.getAttribute('data-lbgrad') : null,
        bild: bildVon(i), soll: K('insigniumStufeSvg(INSIGNIEN[' + i + '].key, "Elite", '
          + (i === 6 ? 'ORDENSSTERN_START + ' + g : 0) + ', ' + g + ')').match(/href="([^"]+)"/)[1],
        vorher});
    }
    return out;
  });
  ok(!alle.fehlt && alle.felder === 21, 'die Laufbahn zeigt alle einundzwanzig Felder',
     JSON.stringify({felder: alle.felder}));
  ok(!alle.fehlt && alle.jetzt.length === 1, 'genau ein Feld ist das eigene', JSON.stringify(alle.jetzt));
  if(!alle.fehlt){
    const falsch = alle.schritte.filter(s => s.fokus !== +s.f[0] || s.zeigt !== +s.f[2]);
    ok(falsch.length === 0, 'ein angetipptes Feld liegt mit seinem Grad in der Vitrine',
       JSON.stringify(alle.schritte.map(s => ({f:s.f, fokus:s.fokus, zeigt:s.zeigt}))));
    const bild = alle.schritte.filter(s => !s.bild || s.bild.split('#').pop().split('"')[0] === '');
    ok(bild.length === 0 && alle.schritte.every(s => typeof s.bild === 'string' && s.bild.length > 1),
       'und die Vitrine zeigt dessen Bild', JSON.stringify(alle.schritte.map(s => s.bild)));
  }

  console.log('\n═══ 3. JEDES WAPPEN FINDET SEINE VERLÄUFE ═══');
  // Geprüft wird nach JEDEM Tabwechsel und jedem Blatt, denn genau daran
  // hängt es: render() ersetzt #app, openSheet ersetzt das Blatt — der Topf
  // mit den Verläufen steht außerhalb von beidem. Stünde er darin, wäre er
  // beim ersten Tabwechsel weg und jedes Metall danach schwarz.
  const verweise = [];
  for(const t of ['ranking', 'positions', 'awards', 'teams', 'history']){
    verweise.push(await page.evaluate(async (tab) => {
      const K = window.__k.eval.bind(window.__k);
      K('tab = ' + JSON.stringify(tab) + '; render()');
      await new Promise(r => requestAnimationFrame(r));
      const offen = new Set();
      document.querySelectorAll('svg *').forEach(e => {
        ['fill', 'stroke'].forEach(a => {
          const m = (e.getAttribute(a) || '').match(/^url\(#([^)]+)\)$/);
          if(m && !document.getElementById(m[1])) offen.add(m[1]);
        });
      });
      // Seit das Wappen in einer Liste ein `<use>` auf ein Symbol im selben
      // Topf ist [§C30], gilt dieselbe Frage fuer die Symbole: ein Verweis
      // auf eines, das es nicht gibt, wirft keinen Fehler und zeichnet
      // nichts — die Kachel bleibt leer. Gemessen wird deshalb beides.
      const verwaist = new Set();
      document.querySelectorAll('use').forEach(u => {
        const h = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
        const m = h.match(/^#(.+)$/);
        if(m && !document.getElementById(m[1])) verwaist.add(m[1]);
      });
      const t = document.getElementById('insDefs');
      return {tab, topf: !!t && !t.closest('#app') && !t.closest('.sheet'),
              wappen: document.querySelectorAll('svg.ins').length,
              // Gemessen wird das Bauteil der Liste (`.rav`, §C27), nicht
              // jede Zeichnung: die elf Stufen der Laufbahn tragen ihre
              // Verläufe absichtlich selbst und sind kein Verweis [§C30].
              rav: document.querySelectorAll('.rav > svg.ins').length,
              ravUse: document.querySelectorAll('.rav > svg.ins > use').length,
              // Nur die Wappen (`insy…`): im selben Topf stehen seit den
              // Bildern auch die Stufen der Leiter (`inst…`, §C30), und die
              // gehören nicht zu der Frage, wie viele Wappen sich eine
              // Zeichnung teilen.
              symbole: document.querySelectorAll('#insDefs defs > g[id^="insy"]').length,
              offen: [...offen].slice(0, 5), verwaist: [...verwaist].slice(0, 5)};
    }, t));
  }
  for(const ruf of ['showPlayer(players[8].id)', 'showLaufbahn(players[8].id)']){
    verweise.push(await page.evaluate(async (src) => {
      const K = window.__k.eval.bind(window.__k);
      K(src);
      await new Promise(r => requestAnimationFrame(r));
      const offen = new Set();
      document.querySelectorAll('svg *').forEach(e => {
        ['fill', 'stroke'].forEach(a => {
          const m = (e.getAttribute(a) || '').match(/^url\(#([^)]+)\)$/);
          if(m && !document.getElementById(m[1])) offen.add(m[1]);
        });
      });
      // Seit das Wappen in einer Liste ein `<use>` auf ein Symbol im selben
      // Topf ist [§C30], gilt dieselbe Frage fuer die Symbole: ein Verweis
      // auf eines, das es nicht gibt, wirft keinen Fehler und zeichnet
      // nichts — die Kachel bleibt leer. Gemessen wird deshalb beides.
      const verwaist = new Set();
      document.querySelectorAll('use').forEach(u => {
        const h = u.getAttribute('href') || u.getAttribute('xlink:href') || '';
        const m = h.match(/^#(.+)$/);
        if(m && !document.getElementById(m[1])) verwaist.add(m[1]);
      });
      const t = document.getElementById('insDefs');
      return {tab: src.split('(')[0], topf: !!t && !t.closest('#app') && !t.closest('.sheet'),
              wappen: document.querySelectorAll('svg.ins').length,
              // Gemessen wird das Bauteil der Liste (`.rav`, §C27), nicht
              // jede Zeichnung: die elf Stufen der Laufbahn tragen ihre
              // Verläufe absichtlich selbst und sind kein Verweis [§C30].
              rav: document.querySelectorAll('.rav > svg.ins').length,
              ravUse: document.querySelectorAll('.rav > svg.ins > use').length,
              // Nur die Wappen (`insy…`): im selben Topf stehen seit den
              // Bildern auch die Stufen der Leiter (`inst…`, §C30), und die
              // gehören nicht zu der Frage, wie viele Wappen sich eine
              // Zeichnung teilen.
              symbole: document.querySelectorAll('#insDefs defs > g[id^="insy"]').length,
              offen: [...offen].slice(0, 5), verwaist: [...verwaist].slice(0, 5)};
    }, ruf));
  }
  console.log('  Wappen je Ansicht: '
    + verweise.map(v => v.tab + '→' + v.wappen).join('  '));
  const ohneTopf = verweise.filter(v => !v.topf);
  // Er muss AUSSERHALB von #app und dem Blatt stehen, nicht nur irgendwo:
  // darin nimmt ihn das nächste render() mit, und dann hängt jedes Metall
  // daran, dass ihn zufällig jemand neu anlegt.
  ok(ohneTopf.length === 0,
     'der Topf mit den Verläufen steht außerhalb von #app und dem Blatt',
     ohneTopf.map(v => v.tab).join(', '));
  const gezeigt = verweise.filter(v => v.wappen > 0);
  ok(gezeigt.length >= 4, 'es werden überhaupt Wappen gezeichnet',
     verweise.map(v => v.tab + ':' + v.wappen).join(' '));
  const kaputt = verweise.filter(v => v.offen.length);
  ok(kaputt.length === 0, 'kein Verweis zeigt auf einen Verlauf, den es nicht gibt',
     kaputt.map(v => v.tab + ': ' + v.offen.join(', ')).join(' | '));
  const leer = verweise.filter(v => v.verwaist.length);
  ok(leer.length === 0, 'kein Verweis zeigt auf ein Symbol, das es nicht gibt',
     leer.map(v => v.tab + ': ' + v.verwaist.join(', ')).join(' | '));
  // Und die Wappen einer Ansicht sind wirklich Verweise: sonst stehen in der
  // Liste wieder 76 Kopien derselben Zeichnung.
  const kopien = verweise.filter(v => v.rav > 0 && v.ravUse < v.rav);
  ok(kopien.length === 0, 'jedes Wappen des Listen-Bauteils ist ein Verweis',
     kopien.map(v => v.tab + ': ' + v.ravUse + ' von ' + v.rav).join(' | '));
  const viele = verweise.filter(v => v.rav >= 10);
  ok(viele.length > 0 && viele.every(v => v.symbole >= 1 && v.symbole < v.rav),
     'viele Wappen teilen wenige Zeichnungen',
     verweise.map(v => v.tab + ':' + v.symbole + '/' + v.rav).join(' '));

  console.log('\n═══ 4. IM HINTERGRUND WIRD NICHT GELADEN ═══');
  // Der Takt ruft nicht mehr blind. Geprüft wird an der Stelle, an der es
  // zählt: wie oft `loadAll` wirklich gerufen wird.
  const takt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K('globalThis.__ALT_LOAD = loadAll; globalThis.__RUFE = 0;'
      + ' loadAll = () => { globalThis.__RUFE++; };');
    const zeig = v => Object.defineProperty(document, 'hidden',
      {configurable:true, get:() => v});
    const zahl = () => K('globalThis.__RUFE');
    const blatt = document.getElementById('sheet');
    blatt.classList.remove('show');
    K('tab = "ranking"');

    zeig(true);  K('_tickDaten()');
    const versteckt = zahl();
    zeig(false); K('_tickDaten()');
    const sichtbar = zahl();
    // Zurück aus dem Hintergrund: sofort, nicht erst beim nächsten Takt.
    document.dispatchEvent(new Event('visibilitychange'));
    const zurueck = zahl();
    // Ein offenes Blatt wird nicht unter den Fingern neu gezeichnet —
    // diese Bedingung stand schon im alten Takt und muss bleiben.
    blatt.classList.add('show'); K('_tickDaten()');
    const mitBlatt = zahl();
    blatt.classList.remove('show');
    // Und der Eingabe-Tab auch nicht.
    K('tab = "match"'); K('_tickDaten()');
    const imMatch = zahl();

    K('tab = "ranking"; loadAll = globalThis.__ALT_LOAD;');
    delete document.hidden;
    return {versteckt, sichtbar, zurueck, mitBlatt, imMatch};
  });
  ok(takt.versteckt === 0, 'versteckt: kein Laden',
     takt.versteckt + ' Aufrufe');
  ok(takt.sichtbar === 1, 'sichtbar: der Takt lädt',
     takt.sichtbar + ' Aufrufe');
  ok(takt.zurueck === 2, 'zurück aus dem Hintergrund: sofort, nicht erst in 30 Sekunden',
     takt.zurueck + ' Aufrufe');
  ok(takt.mitBlatt === 2 && takt.imMatch === 2,
     'offenes Blatt und Eingabe-Tab bleiben in Ruhe',
     'Blatt ' + takt.mitBlatt + ', Match ' + takt.imMatch);

  console.log('\n═══ DER REKORDE-REITER ═══');
  // Gemessen statt behauptet — und zwar am gerenderten Reiter mit den
  // echten Partien: fuenf Kammern, eine Besitzleiste, die dieselben
  // Haltungen zählt wie die Karten, und ein Filter, der genau eine Kammer
  // stehen lässt.
  const CHRONICLES_N = await page.evaluate(() => window.__k.eval('CHRONICLES.length'));
  const rek = await page.evaluate(() => {
    window.__k.eval('tab = "awards"; awView = "rekorde"; rekKammer = ""; render()');
    return {
      karten: document.querySelectorAll('#app .rek').length,
      kammern: [...document.querySelectorAll('#app .rek-g-n')].map(e => e.textContent.trim()),
      saeulen: [...document.querySelectorAll('#app .rek-sl .z')].map(e => +e.textContent),
      offen: [...document.querySelectorAll('#app .rek.offen')].length,
      // Die Chips mit ihrer Zahl. „Alle" steht zuerst und nennt den ganzen
      // Katalog; ohne die Zahlen war nicht zu sehen, ob eine Kammer
      // ueberhaupt gefuellt ist, und wieviele Rekorde es gibt.
      chips: [...document.querySelectorAll('#app .rek-kammern button')].map(b => ({
        k: b.dataset.rekkammer,
        n: +(b.querySelector('.n') || {textContent:''}).textContent })),
      // Und jede Kammer muss anklickbar sein: eine Leiste, die auf 430
      // Pixeln nicht zu erreichen ist, versteckt ihre Rekorde.
      leiste: (() => { const e = document.querySelector('#app .rek-kammern');
        return e ? {scroll: e.scrollWidth, sicht: e.clientWidth,
          schrift: Math.min(...[...e.querySelectorAll('button')].map(b => parseFloat(getComputedStyle(b).fontSize))),
          hoehe: Math.min(...[...e.querySelectorAll('button')].map(b => b.getBoundingClientRect().height))} : null; })(),
      // Die Besitzleiste trägt Zahl, Säule und Gesicht — und das Gesicht lief
      // unten aus der Karte.
      besitz: (() => { const k = document.querySelector('#app .rek-besitz');
        if(!k) return null; const r = k.getBoundingClientRect();
        return [...k.querySelectorAll('.rek-sl > *')].filter(x => { const q = x.getBoundingClientRect();
          return q.bottom > r.bottom - 1 || q.top < r.top; }).length; })()
    };
  });
  ok(rek.kammern.length === 5, 'der Reiter zeigt fuenf Kammern', rek.kammern.join(' · '));
  // Jeder Chip nennt seine Zahl, und „Alle" nennt den ganzen Katalog.
  const chipSoll = await page.evaluate(() => window.__k.eval(
    `(function(){ const z = {}; CHRONICLES.forEach(c => z[c.kind] = (z[c.kind]||0)+1);
       return z; })()`));
  const chipFehler = rek.chips.filter(c => c.k
    ? c.n !== chipSoll[c.k] : c.n !== CHRONICLES_N);
  ok(rek.chips.length === 6 && chipFehler.length === 0,
     'jeder Kammer-Chip nennt seine Zahl, „Alle" den ganzen Katalog',
     rek.chips.map(c => (c.k || 'alle') + ':' + c.n).join(' · '));
  // Die Kammern stehen ohne Wischen da, in lesbarer Größe und als Ziel,
  // das man trifft: als scrollende Leiste standen sechs Wörter in 11,5 px
  // eng aneinander, und die letzten beiden lagen hinter dem Rand.
  ok(rek.leiste && rek.leiste.scroll <= rek.leiste.sicht + 1 && rek.leiste.schrift >= 12.5 && rek.leiste.hoehe >= 34,
     'die Kammerfelder stehen auf dem Telefon vollstaendig und gross genug da',
     JSON.stringify(rek.leiste));
  ok(rek.besitz === 0, 'die Besitzleiste traegt Zahl, Säule und Gesicht innerhalb ihrer Karte',
     rek.besitz + ' Teile ragen hinaus');
  ok(rek.karten === CHRONICLES_N, 'jeder Rekord des Katalogs hat eine Karte',
     rek.karten + ' von ' + CHRONICLES_N);
  // Die Besitzleiste zählt dieselben Haltungen, die die Karten zeigen — und
  // zwar die, die ein Rekord SIND: eine Schattenseite und eine negative
  // Fuegung zaehlen nicht mit [§C25].
  const haltungen = await page.evaluate(() => window.__k.eval(
    `Object.values(allChronicles().byId)
       .reduce((n, e) => n + (e.neg ? 0 : e.pids.length), 0)`));
  const summe = rek.saeulen.reduce((a, b) => a + b, 0);
  ok(summe === haltungen, 'die Besitzleiste zählt so viele Haltungen wie die Tafel',
     summe + ' vs ' + haltungen);
  // Und sie sagt dieselbe Zahl wie das Podest der Ewigen Tafel und das
  // Profil. Sie tat es nicht: Martins Saeule stand auf 13, seine
  // Podestkarte auf „10 Rek.", und beides war unter demselben Wort zu
  // lesen. Gemessen wird je Spieler, nicht als Summe — eine Summe stimmt
  // auch dann, wenn zwei Spieler ihre Zahlen tauschen.
  const einig = await page.evaluate(() => window.__k.eval(
    `(function(){
       return rekordZaehlung().map(z => ({
         n: pname(z.pid), leiste: z.n,
         podest: chroniclesOfPlayer(z.pid).filter(x => !x.neg).length
       })).filter(r => r.leiste !== r.podest);
     })()`));
  ok(einig.length === 0, 'die Besitzleiste sagt je Spieler dieselbe Zahl wie das Podest',
     einig.map(r => r.n + ': ' + r.leiste + ' vs ' + r.podest).join(' · '));
  // Ein Rekord, den niemand hält, steht gestrichelt da statt zu fehlen.
  const unbesetzt = await page.evaluate(() => window.__k.eval(
    `(function(){ const h = chronicleHolders();
       return CHRONICLES.filter(c => !h[c.id]).length; })()`));
  ok(rek.offen === unbesetzt, 'jeder unbesetzte Rekord steht gestrichelt in seiner Kammer',
     rek.offen + ' gezeigt, ' + unbesetzt + ' unbesetzt');
  // Der Kammerfilter zeigt genau eine Kammer.
  const gefiltert = await page.evaluate(() => {
    window.__k.eval('rekKammer = "fuegung"; render()');
    const n = document.querySelectorAll('#app .rek-g-n').length;
    // Gemessen wird die KAMMER, nicht die Farbe: eine Fuegung, die von einer
    // Niederlage erzaehlt, traegt Rot und bleibt trotzdem eine Fuegung.
    const nurFuegung = [...document.querySelectorAll('#app .rek')]
      .every(e => e.dataset.kammer === 'fuegung');
    window.__k.eval('rekKammer = ""; render()');
    return {n, nurFuegung};
  });
  ok(gefiltert.n === 1 && gefiltert.nurFuegung,
     'der Kammerfilter zeigt genau eine Kammer', JSON.stringify(gefiltert));
  // Und jede Kammer zeigt genau ihre Zahl, „Alle" den ganzen Katalog. Ein
  // Rekord, den ein Filter verschluckt, ist unsichtbar — und genau das
  // faellt sonst niemandem auf.
  const jeKammer = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    const soll = K(`(function(){ const z = {}; CHRONICLES.forEach(c =>
      z[c.kind] = (z[c.kind]||0)+1); return z; })()`);
    const out = {};
    Object.keys(soll).concat(['']).forEach(k => {
      K('rekKammer = ' + JSON.stringify(k) + '; render()');
      out[k || 'alle'] = {ist: document.querySelectorAll('#app .rek').length,
                          soll: k ? soll[k] : K('CHRONICLES.length')};
    });
    K('rekKammer = ""; render()');
    return out;
  });
  const kammerFehler = Object.keys(jeKammer)
    .filter(k => jeKammer[k].ist !== jeKammer[k].soll)
    .map(k => k + ': ' + jeKammer[k].ist + ' statt ' + jeKammer[k].soll);
  ok(kammerFehler.length === 0,
     'jede Kammer zeigt ihre Zahl und „Alle" den ganzen Katalog',
     kammerFehler.join(' · ')
     || Object.keys(jeKammer).map(k => k + ':' + jeKammer[k].ist).join(' · '));

  // ── Was negativ ist, traegt Rot und zaehlt nicht ──────────────────
  // „Die bitterste Pleite" stand im Profil golden zwischen den Titeln und
  // machte aus sechs Rekorden sieben. Rot ist die Richtung [§C25], und ein
  // Rekord ist etwas, das man geholt hat.
  const negRot = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    // Ein Spieler, der etwas Negatives haelt.
    const pid = K(`(function(){ const p = players.find(p => chroniclesOfPlayer(p.id)
      .some(x => x.neg) && chroniclesOfPlayer(p.id).some(x => !x.neg));
      return p ? p.id : ''; })()`);
    if(!pid) return {keiner:true};
    const alle = K(`chroniclesOfPlayer('${pid}').length`);
    const positiv = K(`chroniclesOfPlayer('${pid}').filter(x => !x.neg).length`);
    K(`tab = "ranking"; render(); showPlayer('${pid}')`);
    const wrap = document.querySelector('#sheet .pp-root') || document.querySelector('#sheet');
    const karten = [...wrap.querySelectorAll('.chron-one')];
    const rot = karten.filter(e => {
      const c = getComputedStyle(e).getPropertyValue('--tt').trim();
      return /f0566a/i.test(c);
    }).length;
    // Das Profil hat mehrere Abschnittsköpfe — gesucht ist der ueber den
    // Rekord-Karten, nicht der erste im Blatt.
    const kopf = [...wrap.querySelectorAll('.pp-sec-title')].find(e => {
      const h = e.querySelector('h4');
      return h && /^(Liga-Rekord|Schattenseite)/.test(h.textContent.trim());
    });
    const zahl = kopf ? kopf.querySelector('.m') : null;
    // Steht die Schattenseite hinten?
    const negIdx = karten.map((e, i) => e.classList.contains('schatten') ? i : -1)
      .filter(i => i >= 0);
    const erste = karten.length ? Math.min(...negIdx) : -1;
    K('closeSheet && closeSheet()');
    return {alle, positiv, karten: karten.length, rot,
            zahl: zahl ? +zahl.textContent.trim() : null,
            negZuerst: erste === 0 && positiv > 0};
  });
  ok(!negRot.keiner, 'es gibt ein Profil mit Rekord und Schattenseite',
     JSON.stringify(negRot));
  ok(negRot.rot === negRot.alle - negRot.positiv,
     'jede negative Karte im Profil ist rot, keine andere',
     negRot.rot + ' rot von ' + (negRot.alle - negRot.positiv) + ' negativen');
  ok(negRot.zahl === negRot.positiv,
     'die Zahl neben „Liga-Rekorde" zaehlt nur das Positive',
     negRot.zahl + ' statt ' + negRot.positiv);
  ok(negRot.negZuerst === false, 'und das Negative steht nicht an erster Stelle');

  // ── Der offene Feed frischt sich auf ──────────────────────────────
  // `_isNewsFeedOpen` fragte nach `.nv-list-flat` — einer Klasse aus dem
  // alten Mini-Popup, die der Feed seit dem Umbau nicht mehr setzt. Damit war
  // er nie „offen", und eine Story, die per Realtime hereinkam, erschien erst
  // beim naechsten Oeffnen.
  const feedOffen = await page.evaluate(() => {
    const K = s => window.__k.eval(s);
    K('_cache._stories = _buildStories(); _cache._consolFrom = null; _cache._frischVon = null;');
    K('openNewsFeed(); _newsFeedRest()');
    const offen = K('_isNewsFeedOpen()');
    const karten = document.querySelectorAll('#sheet .nf-card').length;
    // Und die Auffrischung zeichnet wirklich NEU. Gezaehlt reicht nicht:
    // dieselbe Zahl steht auch da, wenn gar nichts passiert ist. Eine Marke
    // an einer Karte ueberlebt nur, wenn niemand neu zeichnet.
    const erste = document.querySelector('#sheet .nf-card');
    if(erste) erste.dataset.marke = 'alt';
    K('_refreshOpenNewsViews(); _newsFeedRest()');
    const nachher = document.querySelectorAll('#sheet .nf-card').length;
    const markeWeg = !document.querySelector('#sheet .nf-card[data-marke="alt"]');
    K('closeSheet && closeSheet()');
    const zu = K('_isNewsFeedOpen()');
    return {offen, karten, nachher, zu, markeWeg};
  });
  // Zuerst, was man sieht: die ersten Tage sofort, der Rest nach dem ersten
  // Bild — und dann alle Karten. Ein Klick auf eine nachgereichte Karte
  // öffnet ihr Blatt.
  const feedTeil = await page.evaluate(async () => {
    const K = s => window.__k.eval(s), w = ms => new Promise(r => setTimeout(r, ms));
    K('closeSheet(true); openNewsFeed()');
    const sofort = document.querySelectorAll('#sheet .nf-card').length;
    const erwartet = sofort + K('_newsFeedOffen ? _newsFeedOffen.jobs.reduce((n,j)=>n+j.anzahl,0) : 0');
    // Idle-Takte richten sich nach der Browserlast, nicht nach einer festen
    // Zahl Millisekunden. Auf die vollständige Liste warten, ohne ihren
    // synchronen Prüf-Flush aufzurufen und damit die Zusicherung zu umgehen.
    await new Promise((resolve, reject) => {
      const liste = document.querySelector('#sheet .nf-liste');
      let timer;
      const horch = new MutationObserver(() => {
        if(!K('_newsFeedOffen === null')) return;
        clearTimeout(timer); horch.disconnect(); resolve();
      });
      if(K('_newsFeedOffen === null')){ resolve(); return; }
      horch.observe(liste, {childList:true, subtree:true});
      // Nur ein Sicherheitsende für einen wirklich steckengebliebenen
      // Auftrag, keine Zusicherung über die Geschwindigkeit eines Geräts.
      timer = setTimeout(() => { horch.disconnect(); reject(new Error('Der Feed-Auftrag wird nicht vollständig fertig.')); }, 8000);
    });
    const danach = document.querySelectorAll('#sheet .nf-card').length;
    const letzte = [...document.querySelectorAll('#sheet .nf-liste .nf-card')].pop();
    const titel = letzte ? (letzte.querySelector('.nf-h') || {}).textContent : '';
    if(letzte) letzte.click();
    await w(400);
    const blatt = !!titel && ((document.getElementById('nd') || {}).innerText || '').indexOf(titel.trim().slice(0, 20)) >= 0;
    K('closeNewsDetail(); closeSheet(true)');
    return {sofort, danach, erwartet, blatt};
  });
  ok(feedTeil.sofort >= 8 && feedTeil.sofort <= 15 && feedTeil.danach === feedTeil.erwartet
     && feedTeil.danach > feedTeil.sofort * 2 && feedTeil.blatt,
     'der Feed zeichnet zuerst die oberen Tage und reicht den Rest nach dem ersten Bild nach',
     JSON.stringify(feedTeil));
  ok(feedOffen.offen === true, 'der offene News-Feed wird als offen erkannt',
     JSON.stringify(feedOffen));
  ok(feedOffen.karten > 0 && feedOffen.nachher === feedOffen.karten
     && feedOffen.markeWeg === true,
     'und die Auffrischung zeichnet ihn wirklich neu',
     feedOffen.karten + ' → ' + feedOffen.nachher
     + (feedOffen.markeWeg ? ', neu gezeichnet' : ', die alte Karte steht noch'));
  ok(feedOffen.zu === false, 'geschlossen ist er nicht mehr offen');

  console.log('\n═══ DIE TAFEL ═══');
  // Gemessen am gerenderten Feed: ein Tageskopf je Kalendertag, jede Karte
  // unter ihrem eigenen Tag, Filterchips mit Anzahl und ein Gelesen-Knopf,
  // der die Zahl der offenen Karten nennt. Vorher trennte die Tage eine
  // duenne Zeile, die man beim Scrollen uebersah: zwei Spieltage lasen sich
  // als einer.
  const tafel = await page.evaluate(() => {
    // Der Cache wird sonst aus der DB gefuellt; im Harness gibt es keine.
    // Der Generator liefert dieselben Stories, die die App persistiert haette.
    window.__k.eval('_cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); openNewsFeed(); _newsFeedRest()');
    const sheet = document.getElementById('sheet');
    const koepfe = sheet ? [...sheet.querySelectorAll('.nf-tag')] : [];
    const gruppen = sheet ? [...sheet.querySelectorAll('.nf-feed')] : [];
    // Wie viele verschiedene Kalendertage tragen die Karten wirklich?
    const tage = window.__k.eval(`(function(){
      const s = getStoriesCache();
      return new Set(s.map(x => tagKey(x.when))).size;
    })()`);
    const chips = (sheet ? [...sheet.querySelectorAll('.nf-chip-f')] : []).map(e => ({
      text: e.textContent.trim(), zahl: e.querySelector('i') ? +e.querySelector('i').textContent : null
    }));
    const knopf = sheet ? sheet.querySelector('.nf-gelesen') : null;
    const offen = window.__k.eval(`getStoriesCache().filter(x => !_newsLoadSeen().has(x.id)).length`);
    // Steht jede Karte unter dem Kopf ihres eigenen Tages?
    let falscherTag = 0;
    koepfe.forEach((k, i) => {
      const datum = (k.querySelector('.nf-tag-dt') || {}).textContent || '';
      const feed = gruppen[i];
      if(!feed) return;
      [...feed.querySelectorAll('.nf-card')].forEach(c => {
        const sid = c.dataset.sid;
        const soll = window.__k.eval(`(function(){
          const s = getStoriesCache().find(x => x.id === ${JSON.stringify(sid)});
          return s ? _newsDayDate(s.when) : '';
        })()`);
        if(soll && soll !== datum.trim()) falscherTag++;
      });
    });
    const k0 = koepfe[0] || null;
    const wt = k0 ? k0.querySelector('.nf-tag-wt') : null;
    const dt = k0 ? k0.querySelector('.nf-tag-dt') : null;
    // Steht im Kopf eine Zeile, die eine Karte darunter wortgleich wiederholt?
    let kopfDoppelt = 0, kopfDoppeltBsp = '';
    koepfe.forEach((k, i) => {
      const zeilen = [...k.querySelectorAll('.nf-tag-b, .nf-tag-h')]
        .map(e => e.textContent.trim()).filter(Boolean);
      const feed = gruppen[i];
      if(!feed) return;
      const titel = [...feed.querySelectorAll('.nf-h')].map(e => e.textContent.trim());
      zeilen.forEach(z => { if(titel.indexOf(z) >= 0){ kopfDoppelt++; kopfDoppeltBsp = z; } });
    });
    // Die Karte des Tages: hoechstens eine je Tag, und sie bleibt an ihrer
    // Uhrzeit stehen. Sie nach oben zu ziehen waere genau die Umsortierung,
    // die der Feed nicht mehr macht.
    let tagesKarten = 0, mehrfach = 0, nichtBeste = 0, tagOhneSpiel = 0;
    gruppen.forEach((feed, i) => {
      // An einem Tag ohne Partie ist nichts passiert, was ihn von einem
      // anderen unterscheidet: dort stand sonst ein Fun Fact gross im Bild.
      const kopf = koepfe[i];
      // Gefragt wird die App, nicht das Markup: die Bilanz des Tages stand
      // frueher als Zeile im Kopf und diente hier als Ersatzsignal — sie ist
      // raus, der Tagesschluessel steht dafuer am Kopf.
      const gespielt = kopf && window.__k.eval('_newsTagMs')(kopf.dataset.tag).length;
      if(!gespielt && feed.querySelector('.nf-card.nf-gross')) tagOhneSpiel++;
    });
    gruppen.forEach(feed => {
      const gr = [...feed.querySelectorAll('.nf-card.nf-gross')];
      tagesKarten += gr.length;
      if(gr.length > 1) mehrfach++;
      if(gr.length !== 1) return;
      // Traegt sie wirklich den hoechsten Nachrichtenwert ihres Tages?
      const ids = [...feed.querySelectorAll('.nf-card')].map(c => c.dataset.sid);
      // Gewertet wird nur, wer das Band tragen darf: Breaking ist im Feed
      // schon die lauteste Karte, der Spieler des Tages steht an jedem
      // Spieltag da, und ein Rueckblick gehoert keinem Tag [§C33]. Die
      // Frage stellt `_newsTagKarteWuerdig` — hier stand vorher eine
      // zweite Liste dafuer [§C27].
      const beste = window.__k.eval(`(function(){
        const ids = ${JSON.stringify(ids)};
        const s = getStoriesCache().filter(x => ids.indexOf(x.id) >= 0)
          .filter(_newsTagKarteWuerdig);
        s.sort((a,b) => (_newsTagSpannung(b)-_newsTagSpannung(a))
          || ((b.prio||0)-(a.prio||0)) || String(a.id||'').localeCompare(String(b.id||'')));
        return s.length ? s[0].id : '';
      })()`);
      if(beste && beste !== gr[0].dataset.sid) nichtBeste++;
    });
    return {koepfe: koepfe.length, tage, chips, falscherTag,
            kopfDoppelt, kopfDoppeltBsp, tagesKarten, mehrfach, nichtBeste, tagOhneSpiel,
            knopfText: knopf ? knopf.textContent.trim() : '', offen,
            wochentag: wt ? wt.textContent.trim() : '',
            datum: dt ? dt.textContent.trim() : '',
            roh: k0 ? k0.innerHTML.slice(0, 160) : ('kein Kopf; sheet=' + (!!sheet) + ' html=' + (sheet ? sheet.innerHTML.length : 0))};
  });
  ok(tafel.koepfe === tafel.tage, 'jeder Kalendertag bekommt genau einen Kopf',
     tafel.koepfe + ' Koepfe, ' + tafel.tage + ' Tage');
  ok(tafel.falscherTag === 0, 'jede Karte steht unter dem Kopf ihres Tages',
     tafel.falscherTag + ' daneben');
  ok(/^[A-ZÄÖÜ]+$/.test(tafel.wochentag || '') && /\d{2}\.\d{2}\.\d{2}/.test(tafel.datum || ''),
     'der Kopf nennt Wochentag und Datum', (tafel.wochentag + ' ' + tafel.datum).trim() || tafel.roh);
  ok(tafel.chips.length === 4, 'vier Filterchips, nicht elf Rubriken',
     tafel.chips.map(c => c.text).join(' · '));
  ok(tafel.chips.every(c => c.zahl !== null), 'jeder Chip traegt seine Anzahl',
     tafel.chips.map(c => c.zahl).join(', '));
  ok(!tafel.offen || tafel.knopfText.indexOf(String(tafel.offen)) >= 0,
     'der Gelesen-Knopf nennt die Zahl der offenen Karten',
     tafel.knopfText + ' / ' + tafel.offen);
  ok(tafel.kopfDoppelt === 0,
     'der Tageskopf wiederholt keine Schlagzeile aus seinem Tag',
     tafel.kopfDoppelt + ' doppelt: ' + tafel.kopfDoppeltBsp);
  ok(tafel.tagesKarten > 0 && tafel.mehrfach === 0,
     'hoechstens eine Karte des Tages je Tag',
     tafel.tagesKarten + ' Karten, ' + tafel.mehrfach + ' Tage mit mehreren');
  ok(tafel.nichtBeste === 0, 'die Karte des Tages traegt die spannendste Geschichte ihres Tages',
     tafel.nichtBeste + ' daneben');
  ok(tafel.tagOhneSpiel === 0, 'an einem Tag ohne Partie gibt es keine Karte des Tages',
     tafel.tagOhneSpiel + ' Tage');

  console.log('\n═══ DIE STORY-BLAETTER ═══');
  // Jedes Blatt hat denselben Bau: Kopf mit Wappen und Rang, dann die Mitte,
  // dann der Weg weiter. Vorher brachte jeder der einunddreissig Typen sein
  // eigenes mit, und wer zwei nacheinander oeffnete, fand nichts an derselben
  // Stelle.
  const blaetter = await page.evaluate(() => {
    const roh = window.__k.eval('JSON.stringify((function(){\n'
      + '  const roh = _buildStories();\n'
      + '  const alle = _consolidateStories(roh.slice().sort((a,b)=>new Date(b.when)-new Date(a.when)));\n'
      + '  const out = [], gesehen = {};\n'
      + '  alle.forEach(s => { const t = (s.dataRef||{}).type || "?";\n'
      + '    if(gesehen[t]) return; gesehen[t] = 1;\n'
      + '    let b = ""; try { b = _newsDetailBody(s); } catch(e){ b = "FEHLER:" + e.message; }\n'
      + '    out.push({typ:t, html:b, pids:(_newsPids(s)||[]).length, matchId:!!(s.dataRef||{}).matchId});\n'
      + '  });\n'
      + '  return out; })())');
    const arr = JSON.parse(roh);
    const box = document.createElement('div');
    let ohneKopf = 0, doppeltesSpiel = 0, fehler = 0, leer = 0;
    arr.forEach(x => {
      if(x.html.indexOf('FEHLER:') === 0){ fehler++; return; }
      if(!x.html.trim()){ leer++; return; }
      box.innerHTML = x.html;
      // Ein Blatt ueber einen Spieler traegt sein Wappen im Kopf.
      // Die Bühne einer Serie oder Partie ist der Kopf, wenn sie sein
      // Gesicht trägt [§C33].
      if(x.pids === 1 && !box.querySelector('.nd-held') && !box.querySelector('.nd-buehne .rav, .nd-buehne .av')) ohneKopf++;
      // Und die Partie steht hoechstens einmal darin.
      const erg = box.querySelectorAll('.nd-erg').length;
      const vs  = box.querySelectorAll('.nd-match').length;
      if(x.matchId && (erg + vs) > 1) doppeltesSpiel++;
    });
    return {n: arr.length, ohneKopf, doppeltesSpiel, fehler, leer,
            typen: arr.map(x => x.typ).join(', ')};
  });
  ok(blaetter.fehler === 0, 'kein Blatt wirft beim Bauen', blaetter.fehler + ' von ' + blaetter.n);
  ok(blaetter.leer === 0, 'kein Blatt bleibt leer', blaetter.leer + ' von ' + blaetter.n);
  ok(blaetter.ohneKopf === 0, 'jedes Blatt ueber einen Spieler traegt seinen Kopf',
     blaetter.ohneKopf + ' ohne');
  ok(blaetter.doppeltesSpiel === 0, 'die Partie steht hoechstens einmal im Blatt',
     blaetter.doppeltesSpiel + ' doppelt');

  console.log('\n═══ DAS RUBRIKBAND UND DER TAGESKOPF ═══');
  const design = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const karten = [...sheet.querySelectorAll('.nf-card')];
    const koepfe = [...sheet.querySelectorAll('.nf-tag')];
    // Der Tageskopf ist eine Marke auf dem Zeitstrahl, keine Karte: als
    // Kasten mit Rahmen und Fuellung sah er aus wie eine ungeoeffnete Story.
    const kopfStil = koepfe.length ? getComputedStyle(koepfe[0]) : null;
    // Jede Karte traegt genau eine Rubrik, und sie ist leiser als die
    // Schlagzeile darunter.
    let ohneRubrik = 0, zuLaut = 0, ohneKachel = 0;
    karten.forEach(c => {
      const r = c.querySelector('.nf-rub');
      const h = c.querySelector('.nf-h');
      if(!r){ if(!c.classList.contains('nf-brk')) ohneRubrik++; return; }
      // Das Zeichen sitzt in einer eigenen Kachel: frei stehend war es ein
      // Strich von elf Pixeln neben der Schrift.
      if(!r.querySelector('i svg')) ohneKachel++;
      if(!h) return;
      // Gemessen wird der TEXT der Rubrik, nicht ihr Behaelter: die
      // Schriftgroesse steht am inneren b, und am Behaelter zu messen liesse
      // die Zusicherung eine zu laute Rubrik durchgehen.
      const rt = r.querySelector('b') || r;
      const rs = parseFloat(getComputedStyle(rt).fontSize);
      const hs = parseFloat(getComputedStyle(h).fontSize);
      if(rs >= hs) zuLaut++;
    });
    // Die Tordifferenz steht nicht im Zahlenband, wenn das Ergebnis schon
    // darueber steht.
    let doppelteDiff = 0;
    karten.forEach(c => {
      if(!c.querySelector('.nf-erg')) return;
      [...c.querySelectorAll('.nf-zb span')].forEach(sp => {
        if(/Tore Unterschied/.test(sp.textContent)) doppelteDiff++;
      });
    });
    return {karten: karten.length, ohneRubrik, zuLaut, doppelteDiff, ohneKachel,
            kopfRahmen: kopfStil ? kopfStil.borderTopWidth + '|' + kopfStil.borderLeftWidth : '',
            kopfGrund: kopfStil ? kopfStil.backgroundImage : ''};
  });
  ok(design.ohneRubrik === 0, 'jede Karte traegt ihre Rubrik', design.ohneRubrik + ' ohne');
  ok(design.zuLaut === 0, 'die Rubrik ist leiser als die Schlagzeile', design.zuLaut + ' zu laut');
  ok(design.ohneKachel === 0, 'jede Rubrik traegt ihre Kachel', design.ohneKachel + ' ohne');
  ok(design.doppelteDiff === 0, 'die Tordifferenz steht nicht neben dem Ergebnis',
     design.doppelteDiff + ' doppelt');
  ok(design.kopfRahmen === '0px|0px' && design.kopfGrund === 'none',
     'der Tageskopf ist keine Karte', design.kopfRahmen + ' / ' + design.kopfGrund);

  console.log('\n═══ MOTIV, WINKEL UND FETTE AKZENTE ═══');
  const schmuck = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const karten = [...sheet.querySelectorAll('.nf-card')];
    let ohneMotiv = 0, ragtRaus = 0, ohneWinkel = 0, winkelUnten = 0, ohneAkzent = 0;
    karten.forEach(c => {
      const m = c.querySelector('.nf-motiv');
      if(!m){ ohneMotiv++; }
      else {
        // Halb angeschnitten sah das Wasserzeichen nach einem Fehler aus.
        const mb = m.getBoundingClientRect(), cb = c.getBoundingClientRect();
        if(mb.right > cb.right + 0.5 || mb.left < cb.left - 0.5) ragtRaus++;
      }
      const w = c.querySelector('.nf-chev');
      if(!w){ ohneWinkel++; }
      else {
        // Der Winkel steht NEBEN dem Satz, nicht darunter: als vierte Zeile
        // waere er eine eigene Zeile Text.
        const t = c.querySelector('.nf-gr-r');
        if(t){
          const wb = w.getBoundingClientRect(), tb = t.getBoundingClientRect();
          if(wb.left < tb.right - 1) winkelUnten++;
        }
      }
      // Steht eine Zahl im Satz, steht sie fett.
      const d = c.querySelector('.nf-d');
      if(d && /\d/.test(d.textContent) && !d.querySelector('b')) ohneAkzent++;
    });
    return {n: karten.length, ohneMotiv, ragtRaus, ohneWinkel, winkelUnten, ohneAkzent};
  });
  ok(schmuck.ohneMotiv === 0, 'jede Karte traegt ihr Motiv', schmuck.ohneMotiv + ' ohne');
  ok(schmuck.ragtRaus === 0, 'das Motiv steht ganz in der Karte', schmuck.ragtRaus + ' ragen raus');
  ok(schmuck.ohneWinkel === 0, 'jede Karte zeigt, dass sie sich oeffnet',
     schmuck.ohneWinkel + ' ohne Winkel');
  ok(schmuck.winkelUnten === 0, 'der Winkel steht neben dem Satz, nicht darunter',
     schmuck.winkelUnten + ' darunter');
  ok(schmuck.ohneAkzent === 0, 'jede Zahl im Kartentext steht fett',
     schmuck.ohneAkzent + ' ohne Akzent');

  console.log('\n═══ ZWÖLF SORTEN, RUHIGE FARBFAMILIEN ═══');
  const sorten = await page.evaluate(() => {
    const sorte = window.__k.eval('_newsSorte');
    const rubrik = window.__k.eval('_newsRubrik');
    const mach = t => ({dataRef:{type:t, a:'x', b:'y', streak:5, n:60}});
    // Drei Aussagen, drei Sorten: an einem Spieltag standen drei Karten
    // „ZU ZWEIT" untereinander, die von drei verschiedenen Dingen erzaehlten.
    const drei = ['rivalry', 'team_streak', 'team_woche'].map(t => sorte(mach(t)));
    const eindeutig = new Set(drei).size === 3;
    // Und die Rubrik unterscheidet Serie von Durststrecke.
    const sieg = rubrik('serie', mach('team_streak'));
    const pleite = rubrik('serie', mach('team_loss_streak'));
    // Jede Karte im Feed hat eine Sorte, die es im CSS auch gibt.
    const sheet = document.getElementById('sheet');
    const klassen = [...sheet.querySelectorAll('.nf-card')]
      .map(c => [...c.classList].find(k => k.indexOf('nf-s-') === 0) || '');
    return {drei, eindeutig, sieg, pleite, ohneSorte: klassen.filter(k => !k).length,
            verschieden: new Set(klassen).size};
  });
  ok(sorten.eindeutig, 'Rivalitaet, Serie und Duo sind drei verschiedene Sorten',
     sorten.drei.join(','));
  ok(sorten.sieg !== sorten.pleite, 'Siegesserie und Durststrecke tragen nicht dieselbe Rubrik',
     sorten.sieg + ' / ' + sorten.pleite);
  ok(sorten.ohneSorte === 0, 'jede Karte traegt ihre Sorte', sorten.ohneSorte + ' ohne');

  const zeichen = await page.evaluate(() => {
    const icon = window.__k.eval('_newsSorteIcon');
    const sorten = ['spiel','tafel','ins','held','woche','duell','serie','badge','marke',
                    'fakt','spieler','erfolg'];
    const namen = sorten.map(so => icon(so, {dataRef:{type:'x'}}));
    const doppelt = namen.filter((n, i) => namen.indexOf(n) !== i);
    return {namen, doppelt};
  });
  ok(zeichen.doppelt.length === 0,
     'keine zwei Rubriken tragen dasselbe Zeichen', zeichen.doppelt.join(', '));

  // Mehrere Tafel-Aenderungen desselben Zeitpunkts ergeben eine gemeinsame
  // Karte. Das
  // Markup wird aus vier synthetischen, ansonsten echten Story-Objekten
  // gebaut, damit der Test nicht an einer zufaelligen heutigen Schwelle haengt.
  const achse = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const ids=players.slice(0,4).map(p=>p.id), when=matches[matches.length-1].created_at;
      const teile=ids.map((pid,i)=>({id:'ui-ins-'+i,cat:'tafel',ic:'award',
        title:pname(pid)+' traegt den Schildring',desc:(300+i)+' Prestige zusammen.',
        when,prio:76,dataRef:{type:'insignium_stufe',pid,stufe:1,
          stufeName:'Schildring',punkte:300+i,oben:false}}));
      _cache._consolFrom=null;
      const s=_consolidateStories(teile).find(x=>(x.dataRef||{}).quelle==='tafel');
      return s ? _newsCardHtmlM2(s,false,false) : '';
    })()`);
    const host = document.createElement('div'); host.innerHTML = markup;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card.nf-s-tafel');
    if(!karte) return {fehlt:true};
    const rub = karte.querySelector('.nf-rub b');
    const farbe = rub ? getComputedStyle(rub).color : '';
    const out = {fehlt:false, rubrik: rub ? rub.textContent.trim() : '',
      // Der Erfolg ist das Subjekt, also stehen die Gesichter als Chips
      // nebeneinander — keins ist wichtiger als das andere [§C33].
      chips: karte.querySelectorAll('.nf-face-paar .av').length,
      zeilen: karte.querySelectorAll('.nf-sam-z').length,
      zeilenGetoent: karte.querySelectorAll('.nf-sam-z.nf-sam-insignium').length,
      rest: karte.querySelectorAll('.nf-sam-m').length,
      tafelMetall: farbe !== 'rgb(247, 207, 74)' && farbe !== 'rgb(167, 139, 250)'};
    host.remove(); return out;
  });
  ok(!achse.fehlt, 'die Karte fuer den gemeinsamen Erfolg steht im Feed',
     JSON.stringify(achse));
  ok(achse.rubrik === 'EWIGE TAFEL', 'sie traegt die gemeinsame Tafel-Rubrik', achse.rubrik);
  ok(achse.chips >= 2, 'und die Gesichter aller Beteiligten', achse.chips + ' Chips');
  ok(achse.zeilen >= 2 && achse.zeilenGetoent === achse.zeilen && achse.rest === 0,
     'jede Tafel-Zeile bleibt sichtbar und trägt den Ton ihres Inhalts',
     achse.zeilen + ' Zeilen, ' + achse.zeilenGetoent + ' getönt, ' + achse.rest + ' verschwiegen');
  ok(achse.tafelMetall, 'der gemeinsame Tafel-Moment traegt kuehles Metall statt Gold',
     String(achse.tafelMetall));

  // ── Das Blatt der Ewigen Tafel zeigt, was ausschlaggebend war ────
  //    Die Punktewirkung stand als Zeile „1205 → 1240 Prestige": zwei Zahlen,
  //    die man erst lesen und dann verrechnen muss, und bei neun Zeilen
  //    darueber weiss niemand mehr, was daran relevant ist. Jetzt tragen die
  //    Zahlenreihe davor und der Balken je Spieler die Aussage — beides ist
  //    gezeichnet, also wird es gemessen.
  const tafelBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const tage=[...new Set(matches.map(m=>tagKey(mts(m))))].sort();
      const tg=tage[tage.length-1];
      const m=_newsTagMs(tg)[0];
      const wann=new Date(mts(m));
      const ck=_storyGruppeKey('table', tg);
      const lb={};
      lb[players[0].id]={vor:1150,nach:1240,delta:90,stufeVor:2,stufeNach:2};
      lb[players[1].id]={vor:470,nach:520,delta:50,stufeVor:0,stufeNach:1};
      const l=[
        {id:'tw-0',cat:'tafel',ic:'trophyStar',when:wann,prio:80,
         title:'Ein Wechsel',desc:'Ein Satz mit 1 Zahl.',
         dataRef:{type:'rekord_geholt',rekordId:'rw',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[0].id,players[1].id]}},
        {id:'tw-1',cat:'tafel',ic:'chartBar',when:wann,prio:70,
         title:'Ein Ausbau',desc:'Ein Satz mit 2 Zahlen.',
         dataRef:{type:'rekord_gesteigert',rekordId:'ra',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[0].id]}},
        {id:'tw-2',cat:'tafel',ic:'calendar',when:wann,prio:62,
         title:'Eine Chronik',desc:'Ein Satz mit 3 Zahlen.',
         dataRef:{type:'chronik_geholt',titleId:'tc',matchId:m.id,causalKey:ck,
                  laufbahn:lb,playerIds:[players[1].id]}}
      ];
      _cache._consolFrom=null;
      const k=_consolidateStories(l).find(x=>(x.dataRef||{}).quelle==='tafel');
      return k ? _newsDetailBody(k) : '';
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const zellen = [...host.querySelectorAll('.rcp-z .rcp-z-s')]
      .map(z => (z.querySelector('.rcp-z-v')||{}).textContent + '|'
              + (z.querySelector('.rcp-z-l')||{}).textContent);
    const reihen = [...host.querySelectorAll('.nd-wk')];
    const raus = reihen.filter(r => {
      const b = r.querySelector('.nd-wk-b');
      if(!b) return true;
      const seg = [...b.children];
      if(seg.length !== 2) return true;
      const br = b.getBoundingClientRect();
      const sum = seg.reduce((n, x) => n + x.getBoundingClientRect().width, 0);
      return sum > br.width + 0.5;
    }).length;
    // Der Zuwachs des Tages ist sichtbar, nicht nur gerechnet: das hellere
    // Segment hat Breite.
    const ohneZuwachs = reihen.filter(r => {
      const seg = r.querySelectorAll('.nd-wk-b em');
      return !seg.length || seg[0].getBoundingClientRect().width <= 0;
    }).length;
    const out = {zellen, reihen: reihen.length, raus, ohneZuwachs,
      // Nur das Zeichen der Stufe, nicht der Pfeil eines Auf- oder Abstiegs.
      zeichen: host.querySelectorAll('.nd-wk-z > svg').length,
      werte: [...host.querySelectorAll('.nd-wk-d')].map(x => x.textContent.trim()).join(' ')};
    host.remove(); return out;
  });
  ok(tafelBlatt.zellen.length >= 4
     && tafelBlatt.zellen.some(z => /Bestmarke/.test(z))
     && tafelBlatt.zellen.some(z => /Ausbau/.test(z))
     && tafelBlatt.zellen.some(z => /Prestige/.test(z)),
     'das Blatt eines Tafel-Moments nennt Wechsel, Ausbauten und Prestige in Zahlen',
     tafelBlatt.zellen.join(' · '));
  ok(tafelBlatt.reihen === 2,
     'die Wirkung steht einmal je Spieler',
     tafelBlatt.reihen + ' Zeilen: ' + tafelBlatt.werte);
  ok(tafelBlatt.raus === 0,
     'ihr Balken bleibt in seiner Bahn',
     tafelBlatt.raus + ' laufen heraus');
  ok(tafelBlatt.ohneZuwachs === 0,
     'und der Zuwachs des Tages ist darin zu sehen',
     tafelBlatt.ohneZuwachs + ' ohne sichtbaren Zuwachs');
  ok(tafelBlatt.zeichen === 2,
     'jede Zeile zeigt das Zeichen ihrer Stufe',
     tafelBlatt.zeichen + ' Zeichen');

  // ── Ein Verlust ist zu sehen ───────────────────────────────────────
  //    Jane zog bei „Der Lauf" mit Leon gleich, und Leon stand im Blatt mit
  //    „±0": ein Minus wurde als Null gezeigt, und der Balken kannte nur den
  //    Zuwachs. Gemessen wird am gezeichneten Balken, ob das verlorene Stück
  //    Breite hat und in der Bahn bleibt, ob die Zahl rot ist und ob die
  //    Zeile den Grund und den Fall unter die Schwelle nennt.
  const verlust = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const a = players[0].id, b = players[1].id;
      const lo = INSIGNIEN[3].min;
      const je = {};
      je[a] = {vor:lo + 150, nach:lo + 300};
      je[b] = {vor:lo + 50, nach:lo - 60};
      return _ndWirkungBlock(je, _ndWirkungsGruende([
        {rname:'Der Lauf', halter:[a, b], vorher:[b]}]));
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const r = host.querySelector('.nd-wk.neg');
    const out = {da: !!r};
    if(r){
      const bahn = r.querySelector('.nd-wk-b').getBoundingClientRect();
      const weg = r.querySelector('.nd-wk-b u');
      const wr = weg ? weg.getBoundingClientRect() : null;
      out.weg = wr ? wr.width : 0;
      out.drin = wr ? (wr.right <= bahn.right + 0.5) : false;
      out.zahl = r.querySelector('.nd-wk-d').textContent.trim();
      out.rot = getComputedStyle(r.querySelector('.nd-wk-d')).color;
      out.fall = (r.querySelector('.nd-wk-n em.r') || {}).textContent || '';
      out.grund = (r.querySelector('.nd-wk-g.r') || {}).textContent || '';
      out.pfeil = !!r.querySelector('.nd-wk-ab svg');
      out.rand = r.getBoundingClientRect().right <= host.getBoundingClientRect().right + 0.5;
    }
    host.remove(); return out;
  });
  ok(verlust.da && verlust.weg > 0 && verlust.drin && verlust.rand,
     'ein Verlust steht als eigenes Stück im Balken und bleibt in der Bahn',
     JSON.stringify(verlust));
  ok(/^−110$/.test(verlust.zahl || '') && /240, 86, 106/.test(verlust.rot || ''),
     'und die Zahl trägt ihr Minus in Rot', verlust.zahl + ' ' + verlust.rot);
  ok(/fällt auf/.test(verlust.fall) && verlust.pfeil && /teilt/.test(verlust.grund),
     'die Zeile nennt den Fall unter die Schwelle und den geteilten Rekord',
     verlust.fall + ' · ' + verlust.grund);

  // ── Und jede KARTE passt auch ────────────────────────────────────
  //    Dasselbe fuer den Feed selbst: eine Karte, die bei 360 px aus ihrem
  //    Rand laeuft, schiebt die ganze Tafel waagerecht. Gepruefte Karten sind
  //    die echten des Fensters, jede Sorte einmal.
  const kartenMobil = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      _cache._stories = r.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null;
      const alle = getStoriesCache();
      const out = [], gesehen = {};
      alle.forEach(s => {
        const d = s.dataRef || {};
        const t = (d.type||'?') + (d.quelle ? '/' + d.quelle : '');
        if(gesehen[t]) return; gesehen[t] = 1;
        // Beide Fassungen: die gewoehnliche Karte und die des Tages, die
        // breiter baut und ein Band darueber traegt.
        out.push({typ:t, html:_newsCardHtmlM2(s, false, false)});
        out.push({typ:t + ' (gross)', html:_newsCardHtmlM2(s, false, true)});
      });
      return out;
    })())`);
    const arr = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.width = '360px';
    document.body.appendChild(host);
    const raus = [], ohneBild = [];
    // Eine Karte ohne Bildzone ist eine Textzeile in einer Tafel voller
    // Zeichnungen. Gezaehlt wird jedes Bauteil, das §C27 dafuer nennt:
    // Ergebnisband, grosser Wert, Leiter, Bilanzbalken, Serienlauf,
    // Sammelband, Zahlenband, Wochenliste, Duellband, Auszeichnungsfuss oder
    // das Gesicht selbst.
    // Die Karte am Spieltag traegt ihren Kopf nach dem Anlass [§11.6c], die
    // Runde ihre Tabelle.
    const BILD = ['ff','nf-erg','nf-wert','nf-leiter','nf-bil','nf-ser','nf-sam',
                  'nf-zb','nf-wl','nf-duell-band','nf-bd','nf-gr-l','nf-face',
                  'sp-zeile','sp-feld','sp-at','sp-wp','sp-band','sp-rd-tafel','sp-tg','sp-rq',
                  // V2 waehlt auch Mosaik, Tacho, Streuung und Gefaelle. Ihr
                  // gemeinsamer Bildrahmen ist kein fehlender Textkarten-Kopf.
                  'sp-fk'];
    arr.forEach(x => {
      host.innerHTML = x.html;
      const karte = host.querySelector('.nf-card');
      if(!karte) return;
      if(!BILD.some(c => karte.querySelector('.' + c))) ohneBild.push(x.typ);
      const kr = karte.getBoundingClientRect();
      karte.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.width > 0 && (r.right > kr.right + 0.5 || r.left < kr.left - 0.5))
          raus.push(x.typ + ' ' + (el.className || el.tagName));
      });
    });
    host.remove();
    return {n: arr.length, raus: [...new Set(raus)],
            ohneBild: [...new Set(ohneBild)]};
  });
  ok(kartenMobil.n >= 20, 'jede Sorte baut ihre Karte', kartenMobil.n + ' Fassungen');
  ok(kartenMobil.ohneBild.length === 0,
     'und jede traegt eine Bildzone, nicht nur Text',
     kartenMobil.ohneBild.join(', ') || 'jede mit Bild');
  ok(kartenMobil.raus.length === 0, 'und keine laeuft bei 360 px aus ihrem Rand',
     kartenMobil.raus.slice(0, 4).join(' | ') || 'keine');

  // ── Jedes Blatt passt auf das Telefon ────────────────────────────
  //    Gemessen am Blatt eines Tafel-Moments: die Zahlenreihe trug fuenf
  //    Zellen, „BESTMARKEN" war 75 px breit und die Zelle 62 — `overflow:
  //    hidden` schnitt die Aufschrift ab. Daneben endete „noch 1615 bis zum
  //    Ordensstern" als „noch 1615 bis zum Ord…" und nannte die Stufe nicht.
  //    Gefragt ist deshalb bei JEDEM Story-Typ, ob etwas aus seinem Kasten
  //    laeuft oder abgeschnitten ist — bei 360 px, der Breite, mit der die
  //    uebrigen Messungen dieser Suite rechnen.
  const mobil = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      _cache._stories = r.slice().sort((a,b)=>new Date(b.when)-new Date(a.when));
      _cache._consolFrom = null; _cache._frischVon = null;
      const alle = getStoriesCache();
      const out = [], gesehen = {};
      alle.concat(r).forEach(s => {
        const d = s.dataRef || {};
        const t = (d.type||'?') + (d.quelle ? '/' + d.quelle : '');
        if(gesehen[t]) return; gesehen[t] = 1;
        let b = ''; try { b = _newsDetailBody(s); } catch(e){ b = ''; }
        if(b) out.push({typ:t, html:b});
      });
      return out;
    })())`);
    const arr = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.style.overflow = 'hidden';
    document.body.appendChild(host);
    const raus = [], abgeschnitten = [];
    arr.forEach(x => {
      host.innerHTML = x.html;
      const hr = host.getBoundingClientRect();
      // Laeuft etwas ueber den Rand des Blatts hinaus?
      host.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(r.width > 0 && r.right > hr.right + 0.5)
          raus.push(x.typ + ' ' + el.className);
      });
      // Und ist ein Text abgeschnitten, obwohl er nicht kuerzen darf? Die
      // Aufschriften der Zahlenreihe und die Zeile der Wirkung sind die
      // gemessenen Faelle; eine Schlagzeile DARF kuerzen.
      host.querySelectorAll('.rcp-z-l, .nd-wk-r, .nd-chance-z, .nw-ic').forEach(el => {
        if(el.scrollWidth > el.clientWidth + 1)
          abgeschnitten.push(x.typ + ' ' + el.className + ' '
            + el.scrollWidth + '>' + el.clientWidth);
      });
    });
    host.remove();
    return {n: arr.length, raus: [...new Set(raus)], ab: [...new Set(abgeschnitten)]};
  });
  ok(mobil.n >= 15, 'jeder Story-Typ baut ein Blatt', mobil.n + ' Typen');
  ok(mobil.raus.length === 0, 'und keines laeuft bei 360 px aus seinem Rand',
     mobil.raus.slice(0, 4).join(' | ') || 'keines');
  ok(mobil.ab.length === 0, 'keine Aufschrift ist abgeschnitten',
     mobil.ab.slice(0, 4).join(' | ') || 'keine');

  // ── Der Spieltag als Bahn ────────────────────────────────────────
  //    Das Blatt des Spielers des Tages zeigte jede Partie als vollen
  //    Vs-Block: an einem Tag mit zehn Partien vierzig Wappen und eine Wand.
  //    Die Bahn zeigt den Tag in einer Zeile, und die Farbe IST die Aussage —
  //    also wird sie gemessen.
  const bahn = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const r = _buildStories();
      const p = r.find(s => (s.dataRef||{}).type === 'potd');
      if(!p) return null;
      const d = p.dataRef || {};
      const pids = (Array.isArray(d.playerIds) && d.playerIds.length) ? d.playerIds : [d.playerId];
      const held = pids[0];
      const tag = _newsTagPartien(d.dayKey, pids)
        .filter(m => [m.a1,m.a2,m.b1,m.b2].indexOf(held) >= 0)
        .sort((a,b) => mts(a) - mts(b));
      const siege = tag.map(m => {
        const aSeite = (m.a1 === held || m.a2 === held);
        return aSeite ? m.winner === 'A' : m.winner === 'B';
      });
      return {html:_newsDetailBody(p), n:tag.length, siege};
    })())`);
    if(roh === 'null') return {fehlt:true};
    const x = JSON.parse(roh);
    if(!x) return {fehlt:true};
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = x.html;
    document.body.appendChild(host);
    const felder = [...host.querySelectorAll('.nd-bahn i')];
    const zeilen = [...host.querySelectorAll('.nd-tm')];
    // Die Farbe folgt dem Ausgang, und die Reihenfolge ist die Zeit.
    const falsch = felder.filter((f, i) =>
      f.classList.contains('w') !== !!x.siege[i]).length;
    const bahnBox = host.querySelector('.nd-bahn');
    const raus = bahnBox ? felder.filter(f =>
      f.getBoundingClientRect().right > bahnBox.getBoundingClientRect().right + 0.5).length : 0;
    const out = {fehlt:false, n:x.n, felder:felder.length, zeilen:zeilen.length,
                 falsch, raus,
                 bloecke: host.querySelectorAll('.nd-match').length};
    host.remove(); return out;
  });
  ok(!bahn.fehlt && bahn.felder === bahn.n && bahn.zeilen === bahn.n,
     'die Bahn zeigt jede eigene Partie des Tages',
     bahn.felder + ' Felder und ' + bahn.zeilen + ' Zeilen von ' + bahn.n);
  ok(!bahn.fehlt && bahn.falsch === 0,
     'und jedes Feld traegt die Farbe seines Ausgangs',
     bahn.falsch + ' verkehrt');
  ok(!bahn.fehlt && bahn.raus === 0 && bahn.bloecke === 0,
     'sie bleibt in ihrer Zeile und ersetzt die Vs-Bloecke',
     bahn.raus + ' heraus, ' + bahn.bloecke + ' Bloecke');

  // ── Wie weit dahinter, sieht man ─────────────────────────────────
  //    Die Verfolgerliste nannte Rang, Name und Wert. Ob der Zweite knapp
  //    dran ist oder weit weg, musste man daraus ausrechnen — und bei „84 %"
  //    gegen „81 %" gegen „62 %" ist gerade das die Aussage. Der Balken zeigt
  //    den Anteil am Bestwert, und nur dort, wo er etwas bedeutet.
  const verfolger = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const roh = K(`JSON.stringify((function(){
      const out = [];
      // Ein Rekord mit positivem Sortierwert traegt den Balken, einer mit
      // negativem nicht: „weniger Gegentore ist besser" hat keinen Anteil.
      const byId = (allChronicles() || {}).byId || {};
      Object.keys(byId).forEach(id => {
        const r = byId[id];
        if(!r || !r.pids || !r.pids.length) return;
        const rang = chronicleRang(id) || [];
        if(rang.length < 3) return;
        out.push({id, wert:r.val, html:_newsVerfolger(id, r.pids, r.val)});
      });
      return out.slice(0, 40);
    })())`);
    const arr = JSON.parse(roh);
    const host = document.createElement('div');
    host.style.width = '360px';
    document.body.appendChild(host);
    let mitBalken = 0, ohneBalken = 0, raus = 0, falschRum = 0;
    arr.forEach(x => {
      host.innerHTML = x.html;
      const zeilen = [...host.querySelectorAll('.nd-vf-z')];
      const balken = [...host.querySelectorAll('.nd-vf-b')];
      if(!zeilen.length) return;
      if(x.wert > 0){
        if(balken.length === zeilen.length) mitBalken++; else ohneBalken++;
        // Der Balken bleibt in seiner Bahn, und weiter hinten ist er kuerzer.
        let vor = Infinity;
        balken.forEach(b => {
          const i = b.querySelector('i');
          if(!i) { raus++; return; }
          const ir = i.getBoundingClientRect(), br = b.getBoundingClientRect();
          if(ir.right > br.right + 0.5 || ir.width <= 0) raus++;
          if(ir.width > vor + 0.5) falschRum++;
          vor = ir.width;
        });
      } else if(balken.length){ ohneBalken++; }
    });
    host.remove();
    return {n: arr.length, mitBalken, ohneBalken, raus, falschRum};
  });
  ok(verfolger.mitBalken > 0 && verfolger.ohneBalken === 0,
     'jede Verfolgerzeile eines Rekords mit Anteil traegt ihren Balken',
     verfolger.mitBalken + ' Rekorde, ' + verfolger.ohneBalken + ' ohne');
  ok(verfolger.raus === 0, 'der Balken bleibt in seiner Bahn',
     verfolger.raus + ' laufen heraus');
  ok(verfolger.falschRum === 0, 'und wer weiter hinten liegt, hat den kuerzeren',
     verfolger.falschRum + ' verdreht');

  // ── Das Blatt einer Partie zeigt, was in ihr zu sehen war ────────
  //    Es hatte gar keinen Fall: wer eine Partie-Karte oeffnete, sah den
  //    Satz, den er auf der Karte schon gelesen hatte. Jetzt stehen die
  //    Siegchance auf ihrer Skala und die Elo-Wirkung je Spieler darin — und
  //    beides ist gezeichnet, also wird es gemessen und nicht behauptet.
  const spielBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const tage=[...new Set(matches.map(m=>tagKey(mts(m))))].sort();
      const m=_newsTagMs(tage[tage.length-1])[0];
      const w=m.winner==='A'?[m.a1,m.a2]:[m.b1,m.b2];
      const v=m.winner==='A'?[m.b1,m.b2]:[m.a1,m.a2];
      const s={id:'spiel_'+m.id,cat:'highlight',ic:'thriller',
        when:new Date(mts(m)),prio:41,
        title:'Zwei entscheiden ein enges Spiel',
        desc:'Vor dem Anstoss lag die Siegchance bei 57 %.',
        dataRef:{type:'spiel',resultKind:'eng',matchId:m.id,winners:w,losers:v,
                 playerIds:w,margin:2,quote:57}};
      return _newsDetailBody(s);
    })()`);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const sk = host.querySelector('.nd-chance');
    const bahn = sk && sk.querySelector('.nd-chance-b');
    const fuell = bahn && bahn.querySelector('i');
    const striche = bahn ? [...bahn.querySelectorAll('u')] : [];
    const zeilen = [...host.querySelectorAll('.nd-elo')];
    const raus = zeilen.filter(z => {
      const b = z.querySelector('.nd-elo-b i'), zr = z.getBoundingClientRect();
      if(!b) return true;
      const br = b.getBoundingClientRect();
      return br.right > zr.right + 0.5 || br.width <= 0;
    }).length;
    const out = {
      skala: !!sk, zeilen: zeilen.length, raus,
      fuellDrin: !!(fuell && bahn
        && fuell.getBoundingClientRect().right <= bahn.getBoundingClientRect().right + 0.5
        && fuell.getBoundingClientRect().width > 0),
      striche: striche.length,
      stricheDrin: bahn ? striche.filter(u => {
        const ur = u.getBoundingClientRect(), br = bahn.getBoundingClientRect();
        return ur.left >= br.left - 0.5 && ur.right <= br.right + 0.5;
      }).length : 0,
      werte: [...host.querySelectorAll('.nd-elo-v')].map(x => x.textContent.trim()).join(' ')
    };
    host.remove(); return out;
  });
  // ── Das Blatt einer Partie aus dem Feed [§C33] ─────────────────────
  // Es zeigte einen nackten Stand und zwei Wappen mit „gewinnen diese
  // Partie", während die Karte darüber ihre Zeichnung trug. Jetzt steht die
  // Zeichnung der Karte als Bühne darüber, und darunter nur, was die Bühne
  // nicht schon zeigt: kein zweiter Stand, keine zweite Siegchance, keine
  // zweite Elo je Spieler, kein Satz, der eine Grafik erklärt. Die Bilanz
  // der direkten Duelle wird aus den rohen Partien nachgerechnet.
  const partieBlatt = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    return JSON.parse(K(`JSON.stringify((function(){
      const pm = pmap(), name2id = {}; Object.keys(pm).forEach(id => { name2id[pm[id].name] = id; });
      const karten = getStoriesCache().filter(s => (s.dataRef||{}).matchId
        && ((s.dataRef||{}).type === 'spiel' || ((s.dataRef||{}).type === 'sammel' && _newsSorte(s) === 'spiel')));
      const falsch = []; let n = 0, duelle = 0, buendel = 0;
      const host = document.createElement('div'); host.style.width = '360px'; document.body.appendChild(host);
      karten.forEach(s => {
        const m = matches.find(x => x.id === s.dataRef.matchId); if(!m) return;
        const kopf = _spBild(s).kopf, html = _newsDetailBody(s);
        host.innerHTML = html; n++;
        const b = host.querySelector('.nd-buehne');
        if(!b || html.indexOf(kopf) < 0) falsch.push(s.id + ' ohne Bühne');
        if(host.querySelector('.nd-erg, .nd-held')) falsch.push(s.id + ' Stand oder Wappen doppelt');
        if(/besonders macht|gewinnen diese Partie|Siegchance lag|hängt daran|hängen daran/.test(host.textContent + ' ' + s.desc)) falsch.push(s.id + ' erklärt');
        if(s.dataRef.type === 'sammel'){ buendel++;
          if(s.dataRef.teile.filter(t => (t.typ || t.type) !== 'spiel').length !== host.querySelectorAll('.nw-zeile').length) falsch.push(s.id + ' Bündelzeilen'); }
        const chanceOben = /class="(sp-fk )?(sp-feld|sp-ta|sp-sd|sp-wp)/.test(kopf);
        if(chanceOben && host.querySelector('.nd-chance')) falsch.push(s.id + ' Siegchance doppelt');
        if(/class="(sp-fk )?sp-et/.test(kopf) && host.querySelector('.nd-elo')) falsch.push(s.id + ' Elo doppelt');
        if(/class="sp-feld/.test(kopf) && [...host.querySelectorAll('.nd-elo')].some(z => !z.querySelector('em'))) falsch.push(s.id + ' Elo neben dem Spielfeld');
        const fd = host.querySelector('.nd-feld');
        if(fd && (fd.querySelector('em.g, em.r') || getComputedStyle(fd.querySelector('.sp-f-sc')).display !== 'none')) falsch.push(s.id + ' Feld mit Stand oder Elo');
        const reihe = [...matches].sort((a, c) => mts(a) - mts(c)), vor = reihe.slice(0, reihe.indexOf(m) + 1);
        host.querySelectorAll('.nd-dd-z').forEach(z => {
          duelle++;
          const w = z.dataset.pid, l = name2id[z.querySelector('.nd-dd-n').lastChild.textContent];
          const geg = vor.filter(y => { const A = [y.a1, y.a2], B = [y.b1, y.b2];
            return (A.includes(w) && B.includes(l)) || (B.includes(w) && A.includes(l)); });
          const sw = geg.filter(y => (y.winner === 'A') === [y.a1, y.a2].includes(w)).length;
          if(z.querySelector('b').textContent !== sw + ':' + (geg.length - sw)) falsch.push(s.id + ' Duell ' + z.querySelector('b').textContent + ' statt ' + sw + ':' + (geg.length - sw));
        });
      });
      host.remove();
      return {n, duelle, falsch, buendel};
    })())`));
  });
  ok(partieBlatt.n > 20 && partieBlatt.buendel > 5 && partieBlatt.duelle > 40 && partieBlatt.falsch.length === 0,
     'das Blatt einer Partie und ihres Bündels trägt die Zeichnung der Karte als Bühne, darunter was daran hängt und nichts, was die Bühne schon zeigt, die Duelle aus den rohen Partien',
     partieBlatt.falsch.slice(0, 3).join(' | ') || partieBlatt.n + ' Blätter, davon ' + partieBlatt.buendel + ' Bündel, ' + partieBlatt.duelle + ' Duelle');
  ok(spielBlatt.skala, 'das Blatt einer Partie zeigt die Siegchance als Skala');
  ok(spielBlatt.fuellDrin,
     'ihr Balken bleibt in seiner Bahn',
     spielBlatt.fuellDrin ? 'innerhalb' : 'laeuft heraus');
  ok(spielBlatt.striche === 3 && spielBlatt.stricheDrin === 3,
     'und die drei Linien der Elo-Rechnung stehen darin',
     spielBlatt.stricheDrin + ' von ' + spielBlatt.striche);
  ok(spielBlatt.zeilen === 4,
     'die Elo-Wirkung steht je Spieler der Partie',
     spielBlatt.zeilen + ' Zeilen: ' + spielBlatt.werte);
  ok(spielBlatt.raus === 0,
     'und kein Ausschlag laeuft aus seiner Zeile',
     spielBlatt.raus + ' von ' + spielBlatt.zeilen);

  // ── Eine Sammelkarte bedeckt nicht den ganzen Bildschirm ─────────
  //    „Bündeln darf nichts verstecken" war fuer zwei bis vier Teile
  //    geschrieben. Gemessen trug ein Tafel-Moment neunzehn Zeilen — fuenf
  //    Bestmarken, dreizehn Monatschroniken und ein Insignium —, und die
  //    Karte war dreimal so hoch wie das Telefon: damit versteckte gerade
  //    die vollstaendige Liste alles andere. Auf der Karte stehen die
  //    staerksten, im Blatt jede Zeile.
  const flut = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const daten = K(`(function(){
      const when = matches[matches.length-1].created_at;
      const mk = (i) => ({id:'flut-'+i, cat:'tafel', ic:'trophyStar', when,
        prio: i < 5 ? 76 : i < 18 ? 62 : 40,
        title:(i < 5 ? 'Ein Rekord ' : i < 18 ? 'Eine Chronik ' : 'Ein Ausbau ') + i,
        desc:'Ein Satz mit ' + i + ' Zahlen.',
        dataRef:{type: i < 5 ? 'rekord_geholt' : i < 18 ? 'chronik_geholt' : 'rekord_gesteigert',
                 rekordId:'r'+i, titleId:'t'+i, playerIds:[players[i % 4].id]}});
      const l = []; for(let i = 0; i < 19; i++) l.push(mk(i));
      _cache._consolFrom = null;
      const s = _consolidateStories(l).find(x => (x.dataRef||{}).quelle === 'tafel');
      return s ? JSON.stringify({karte:_newsCardHtmlM2(s, false, false),
                                 blatt:_newsDetailMitte(s) || '',
                                 teile:(s.dataRef.teile||[]).length}) : '';
    })()`);
    if(!daten) return {fehlt:true};
    const d = JSON.parse(daten);
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = d.karte;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card');
    const zeilen = karte ? karte.querySelectorAll('.nf-sam-z').length : 0;
    const rest = karte ? karte.querySelector('.nf-sam-m') : null;
    const hoehe = karte ? karte.getBoundingClientRect().height : 0;
    // Gemessen wird die SCHRIFT, nicht der Kasten: mit 6 px Innenabstand
    // endete „und 13 weitere" einen Pixel ueber der Kartenkante, und die
    // Ecke von 14 px schnitt sie an.
    let luft = 0;
    if(rest && rest.firstChild){
      const r = document.createRange();
      r.selectNodeContents(rest);
      luft = Math.round(karte.getBoundingClientRect().bottom - r.getBoundingClientRect().bottom);
    }
    host.innerHTML = '<div class="nd">' + d.blatt + '</div>';
    const imBlatt = host.querySelectorAll('.nw-zeile').length;
    const out = {fehlt:false, teile:d.teile, zeilen, hoehe: Math.round(hoehe),
                 rest: rest ? rest.textContent.trim() : '', luft, imBlatt};
    host.remove(); return out;
  });
  ok(!flut.fehlt && flut.teile === 19,
     'ein Tafel-Moment kann neunzehn Spuren tragen', JSON.stringify(flut));
  ok(flut.zeilen === 4 && /15/.test(flut.rest),
     'die Karte zeigt die staerksten vier und zaehlt den Rest',
     flut.zeilen + ' Zeilen, „' + flut.rest + '"');
  ok(flut.hoehe < 640,
     'und bleibt damit kuerzer als ein Telefonbildschirm',
     flut.hoehe + ' px');
  // Die Ecke der Karte misst 14 px und `overflow:hidden` schneidet: was
  // darunter liegt, wird von der Rundung angeschnitten. Gemessen blieben
  // 10 px, und „und 13 weitere" sah aus wie ein Darstellungsfehler.
  ok(flut.luft >= 14,
     'und die Zahl der uebrigen Zeilen steht frei von der gerundeten Ecke',
     flut.luft + ' px Luft bei 14 px Radius');
  ok(flut.imBlatt === 19,
     'das Blatt zeigt trotzdem jede einzelne Zeile',
     flut.imBlatt + ' von ' + flut.teile);

  // ── Was oben steht, steht unten nicht noch einmal ────────────────
  //    `_breakingHeroText` hat nur fuer sieben Typen einen eigenen Satz und
  //    fiel sonst auf `s.desc` zurueck: gemessen stand der Teaser auf der
  //    gebuendelten Breaking-Karte zweimal untereinander.
  const brkKarte = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const markup = K(`(function(){
      const p = matches[matches.length-1];
      const l = [
        {id:'bk-1', cat:'team', ic:'medal', when:new Date(mts(p)), prio:90,
         title:pname(p.a1)+' und '+pname(p.a2)+': Absoluter Sieger',
         desc:'Ein Spiel 10:0 gewonnen.',
         dataRef:{type:'badge_unlocked', badgeId:'perfect_win', rarity:'legendary',
                  badgeName:'Absoluter Sieger', matchId:p.id,
                  playerIds:[p.a1, p.a2]}},
        {id:'bk-2', cat:'liga', ic:'crown', when:new Date(mts(p)), prio:93,
         title:'Neuer Spitzenreiter: '+pname(p.a1),
         desc:pname(p.a1)+' steht nach 1 Spiel an der Spitze.',
         dataRef:{type:'lead_change', newLeader:p.a1, prevLeader:p.b1,
                  matchId:p.id}}
      ];
      _cache._consolFrom = null;
      const s = _consolidateStories(l).find(x => (x.dataRef||{}).type === 'sammel');
      return s ? _newsCardHtmlM2(s, false, false) : '';
    })()`);
    if(!markup) return {fehlt:true};
    const host = document.createElement('div');
    host.style.width = '360px';
    host.innerHTML = markup;
    document.body.appendChild(host);
    const karte = host.querySelector('.nf-card');
    const d = karte ? karte.querySelector('.nf-d') : null;
    const sub = karte ? karte.querySelector('.nf-brk-sub') : null;
    // ── Der Anlass ist zu SEHEN, nicht nur zu lesen ────────────────
    //     Die Karte bricht die Spalte wegen EINER ihrer Zeilen, und die stand
    //     in derselben grauen Zeile wie die uebrigen — nur eine kleine Marke
    //     am rechten Rand sagte es. Gemessen wird deshalb die Zeile selbst:
    //     eine eigene Kante und eine eigene Flaeche.
    const zl = karte ? [].slice.call(karte.querySelectorAll('.nf-sam-z')) : [];
    const anl = zl.filter(x => x.classList.contains('brk'))[0] || null;
    const rest = zl.filter(x => !x.classList.contains('brk'))[0] || null;
    const out = {fehlt:false,
      brk: !!(karte && karte.classList.contains('nf-brk')),
      // Das Ergebnis steht im Kopf der Partie, der ihrem Anlass folgt [§11.6c].
      band: karte ? karte.querySelectorAll('.nf-erg, .sp-zeile, .sp-feld, .sp-at, .sp-wp, .sp-band').length : 0,
      zeilen: zl.length,
      anlassKante: anl ? getComputedStyle(anl).boxShadow : '',
      // Eine eigene Flaeche heisst: nicht durchsichtig. Ein Vergleich mit der
      // Nachbarzeile taugt nicht — in diesem Buendel ist jede Zeile Breaking,
      // und dann gibt es keine Nachbarzeile ohne Marke.
      anlassBrk: zl.filter(x => x.classList.contains('brk')).length,
      anlassFlaeche: !!(anl
        && getComputedStyle(anl).backgroundColor !== 'rgba(0, 0, 0, 0)'
        && getComputedStyle(anl).backgroundColor !== 'transparent'),
      anlassZahl: karte ? karte.querySelectorAll('.nf-brk-n').length : 0,
      doppelt: !!(sub && d && sub.textContent.trim() === d.textContent.trim())};
    host.remove(); return out;
  });
  ok(!brkKarte.fehlt && brkKarte.brk && brkKarte.band === 1 && brkKarte.zeilen === 2,
     'der gemeinsame Breaking-Moment zeigt Ergebnis und beide Meldungen',
     JSON.stringify(brkKarte));
  ok(brkKarte.anlassKante && brkKarte.anlassKante !== 'none' && brkKarte.anlassFlaeche,
     'und seine Anlass-Zeile traegt eine eigene Kante und eine eigene Flaeche',
     brkKarte.anlassKante + ' / Flaeche ' + brkKarte.anlassFlaeche);
  ok(brkKarte.anlassZahl === 1,
     'der Breaking-Balken einer gebuendelten Karte zeigt die Zahl der Meldungen',
     brkKarte.anlassZahl + ' Pille');
  ok(brkKarte.doppelt === false,
     'und seinen Teaser nur einmal, nicht als Nachsatz ein zweites Mal',
     String(brkKarte.doppelt));

  const palette = await page.evaluate(() => {
    const host = document.createElement('div');
    const sorten = ['spiel','tafel','ins','held','woche','duell','serie','badge','marke',
                    'fakt','spieler','erfolg'];
    const faktKeys = ['liga','persoenlich','form','duell','laufbahn','chronik','auszeichnung'];
    const tafelKeys = ['rekord','marke','chronik','fuegung','schatten','insignium'];
    const bau = window.__k.eval('_newsCardHtmlM2');
    host.innerHTML = sorten.map(s => `<div class="nf-card nf-s-${s}">
      <div class="nf-top"><span class="nf-rub"><i></i><b>${s}</b></span></div>
      <span class="nf-motiv"></span></div>`).join('')
      + '<div class="nf-card nf-s-tafel nf-gross"><div class="nf-gross-band"></div></div>'
      + '<div class="nf-card nf-s-held nf-gross"><div class="nf-gross-band"></div></div>'
      + '<div class="nd nd-s-tafel"><div class="nd-ic"></div><span class="nf-motiv"></span></div>'
      + '<div class="nd nd-s-serie nd-neg"><div class="nd-ic"></div></div>'
      + tafelKeys.map(k => `<div data-tafeltest="${k}" class="nf-card nf-s-tafel nf-tafel-${k}">
          <div class="nf-top"><span class="nf-rub"><b>${k}</b></span></div></div>`).join('')
      + faktKeys.map(k => `<div data-fakttest="${k}">${bau({
          id:'f_'+k, cat:'fun', ic:'chartBar', title:'Zahl der Liga',
          desc:'Ein echter Wert aus der Liga.', when:'2026-08-27T10:00:00Z',
          dataRef:{type:'ambient',ambientRubrik:k,vv:'12',vl:'Wert'}
        }, false, false)}</div>`).join('');
    document.body.appendChild(host);
    const farben = {};
    sorten.forEach(s => {
      const c = host.querySelector('.nf-s-' + s);
      farben[s] = {
        rubrik:getComputedStyle(c.querySelector('.nf-rub')).color,
        motiv:getComputedStyle(c.querySelector('.nf-motiv')).color,
        schimmer:getComputedStyle(c.querySelector('.nf-top')).backgroundImage
      };
    });
    const gross = [...host.querySelectorAll('.nf-gross-band')]
      .map(b => getComputedStyle(b, '::after').backgroundImage);
    const grossSchatten = [...host.querySelectorAll('.nf-gross')]
      .map(c => getComputedStyle(c).boxShadow);
    const fakten = {};
    faktKeys.forEach(k => {
      const c = host.querySelector(`[data-fakttest="${k}"] .nf-card`);
      fakten[k] = {
        rubrik:c.querySelector('.nf-rub b').textContent.trim(),
        farbe:getComputedStyle(c.querySelector('.nf-rub')).color,
        wert:getComputedStyle(c.querySelector('.nf-wert b')).color,
        grund:getComputedStyle(c).backgroundImage
      };
    });
    const tafelToene = {};
    tafelKeys.forEach(k => {
      const c = host.querySelector(`[data-tafeltest="${k}"] .nf-rub`);
      tafelToene[k] = getComputedStyle(c).color;
    });
    const detail = host.querySelector('.nd-s-tafel');
    const negativ = host.querySelector('.nd-neg');
    const out = {farben, gross, grossSchatten, fakten, tafelToene,
      detailIcon:getComputedStyle(detail.querySelector('.nd-ic')).color,
      detailMotiv:getComputedStyle(detail.querySelector('.nf-motiv')).color,
      detailLinie:getComputedStyle(detail, '::before').backgroundImage,
      negativ:getComputedStyle(negativ.querySelector('.nd-ic')).color};
    host.remove(); return out;
  });
  const farbe = s => palette.farben[s].rubrik;
  const kanalSpanne = c => {
    const n = (c.match(/\d+/g)||[]).slice(0,3).map(Number);
    return n.length === 3 ? Math.max(...n) - Math.min(...n) : 999;
  };
  const goldene = Object.keys(palette.farben).filter(s => farbe(s) === 'rgb(247, 207, 74)');
  ok(goldene.length === 2 && goldene.includes('held') && goldene.includes('woche'),
     'Gold bleibt allein Tages- und Wochensiegern', goldene.join(', ') || 'keine');
  ok(new Set(Object.values(palette.tafelToene)).size === 6
     && Object.values(palette.tafelToene).every(c => c !== farbe('held')),
     'jede Tafel-Kategorie traegt einen eigenen ruhigen Ton statt Gold',
     Object.values(palette.tafelToene).join(' / '));
  ok(farbe('ins') === farbe('badge') && farbe('badge') === farbe('spieler')
     && farbe('spieler') === farbe('erfolg') && farbe('ins') !== farbe('held'),
     'Laufbahn und Auszeichnungen bilden eine violette Familie', farbe('ins'));
  ok(farbe('spiel') === farbe('serie') && farbe('duell') !== farbe('spiel')
     && new Set(Object.values(palette.farben).map(x => x.rubrik)).size === 6
     && new Set(Object.values(palette.fakten).map(x => x.farbe)).size === 4
     && Object.values(palette.fakten).every(x => kanalSpanne(x.farbe) <= 30)
     && Object.values(palette.fakten).every(x => x.farbe === x.wert && x.grund !== 'none')
     && palette.fakten.liga.rubrik === 'LIGA IN ZAHLEN'
     && palette.fakten.form.rubrik === 'DIE FORMKURVE'
     && palette.fakten.duell.rubrik === 'DUELL IN ZAHLEN',
     'Spiel, Duell und Fakten bleiben in ruhigen, lesbaren Farbfamilien',
     new Set(Object.values(palette.fakten).map(x => x.farbe)).size + ' Fakten-Familien');
  ok(palette.gross[0] === palette.gross[1]
     && palette.gross[0].includes('247, 207, 74')
     && palette.grossSchatten.every(x => x.includes('247, 207, 74')),
     'die Karte des Tages traegt Band und aeusseren Schein immer in Gold',
     palette.grossSchatten.join(' / '));
  ok(palette.detailIcon === farbe('tafel') && palette.detailMotiv === farbe('tafel')
     && palette.detailLinie.includes('194, 201, 208'),
     'das Detailblatt setzt die Farbfamilie der Karte fort',
     palette.detailIcon + ' / ' + palette.detailLinie);
  ok(palette.negativ === 'rgb(240, 86, 106)',
     'eine negative Serie bleibt auch im Detailblatt rot', palette.negativ);

  console.log('\n═══ ROT BLEIBT DER RICHTUNG ═══');
  const richtung = await page.evaluate(() => {
    const bau = window.__k.eval('_newsCardHtmlM2');
    const roh = window.__k.eval('_buildStories()');
    const basis = roh[0];
    const huelle = document.createElement('div');
    document.getElementById('sheet').appendChild(huelle);
    const farbe = typ => {
      huelle.innerHTML = bau(Object.assign({}, basis, {dataRef:
        Object.assign({}, basis.dataRef || {}, {type: typ, a:'x', b:'y', streak:5})}), false, false);
      const r = huelle.querySelector('.nf-rub');
      return r ? getComputedStyle(r).color : '';
    };
    const pleite = farbe('team_loss_streak');
    const sieg = farbe('team_streak');
    huelle.remove();
    return {pleite, sieg, rot: /^rgb\(2[0-9]{2}, *[0-9]{1,3}, *[0-9]{1,3}\)/.test(pleite)};
  });
  ok(richtung.rot, 'die Durststrecke traegt Rot in der Rubrik', richtung.pleite);
  ok(richtung.pleite !== richtung.sieg, 'Serie und Durststrecke tragen nicht dieselbe Farbe',
     richtung.sieg + ' / ' + richtung.pleite);

  console.log('\n═══ KEINE LUECKEN IN DER KARTE ═══');
  const luecken = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const karten = [...sheet.querySelectorAll('.nf-card')];
    let zuHoch = 0, aerger = '';
    karten.forEach(c => {
      const l = c.querySelector('.nf-gr-l'), r = c.querySelector('.nf-gr-r');
      if(!l || !r) return;
      // Gemessen wird der INHALT der Bildzone, nicht ihr gestreckter Kasten:
      // die Spalte steht auf `align-self:stretch` und meldete sonst immer
      // dieselbe Hoehe wie der Text daneben.
      const kinder = [...l.children];
      if(!kinder.length) return;
      const oben = Math.min.apply(null, kinder.map(k => k.getBoundingClientRect().top));
      const unten = Math.max.apply(null, kinder.map(k => k.getBoundingClientRect().bottom));
      const inhalt = unten - oben;
      const text = r.getBoundingClientRect().height;
      if(inhalt > text + 12){ zuHoch++;
        aerger = aerger || (c.className.split(' ')[1] + ' ' + Math.round(inhalt) + '>' + Math.round(text)); }
    });
    // Das Duell traegt seine Wappen im Band ueber dem Text — nicht noch
    // einmal daneben.
    // Ein Duell traegt ein Band ueber dem Text — entweder die Bilanz beider
    // Wappen, oder, wenn eine konkrete Partie die Marke gerissen hat, das
    // Ergebnis dieser Partie. Beide uebereinander waeren zwei Baender fuer
    // dieselbe Aussage: „50. Duell" steht schon in der Schlagzeile [§C33].
    const duelle = [...sheet.querySelectorAll('.nf-s-duell')];
    const duellDoppelt = duelle.filter(c => c.querySelector('.nf-gr-l')).length;
    const duellBand = duelle.filter(c =>
      c.querySelector('.nf-duell-band') || c.querySelector('.nf-erg')).length;
    // Das Serienband sagt, was seine Punkte zaehlen.
    const baender = [...sheet.querySelectorAll('.nf-ser')];
    const ohneLabel = baender.filter(b => !b.querySelector('span')).length;
    // Und sie nimmt der Schlagzeile nicht den Platz. Wert und Gesichter
    // standen NEBENeinander, und die Spalte war damit so breit wie beide
    // zusammen: gemessen 169 von 316 Pixeln, also 53 % der Karte, waehrend
    // die Schlagzeile auf 77 px zusammengedrueckt wurde und mitten im Satz
    // abbrach. Uebereinander ist die Spalte so breit wie das Breitere von
    // beiden. Gemessen in Prozent und nicht in Pixeln: die Karte ist auf
    // jedem Telefon anders breit.
    let breit = 0, breitAerger = '', maxA = 0;
    karten.forEach(c => {
      const l = c.querySelector('.nf-gr-l');
      if(!l) return;
      const a = l.getBoundingClientRect().width / c.getBoundingClientRect().width;
      if(a > maxA){ maxA = a; breitAerger = c.className.split(' ')[1] + ' '
        + Math.round(a * 100) + '%'; }
      if(a > .28) breit++;
    });
    // Eine abgeschnittene Schlagzeile ist der Befund, nicht die Ursache:
    // `-webkit-line-clamp` schneidet still ab, und im Feed stand
    // „Johannes, Julian und zwei weitere bewegen die Ewige…".
    const koepfeAb = [...sheet.querySelectorAll('.nf-card .nf-h')]
      .filter(h => h.scrollHeight > h.clientHeight + 1);
    return {karten: karten.length, zuHoch, aerger, duelle: duelle.length,
            duellDoppelt, duellBand, baender: baender.length, ohneLabel,
            breit, breitAerger, ab: koepfeAb.length,
            abAerger: koepfeAb.length ? koepfeAb[0].textContent.trim().slice(0, 48) : ''};
  });
  ok(luecken.zuHoch === 0, 'die Bildzone macht die Karte nicht hoeher als ihr Text',
     luecken.zuHoch + ' zu hoch' + (luecken.aerger ? ' (' + luecken.aerger + ')' : ''));
  ok(luecken.duelle > 0 && luecken.duellBand === luecken.duelle,
     'das Duell traegt sein Band', luecken.duellBand + ' von ' + luecken.duelle);
  ok(luecken.duellDoppelt === 0, 'das Duell zeigt seine Wappen nur einmal',
     luecken.duellDoppelt + ' doppelt');
  ok(luecken.baender === 0 || luecken.ohneLabel === 0,
     'das Serienband nennt, was es zaehlt', luecken.ohneLabel + ' ohne');
  ok(luecken.breit === 0,
     'die Bildzone nimmt der Schlagzeile nicht den Platz',
     luecken.breit + ' ueber 28 % (breiteste: ' + luecken.breitAerger + ')');
  // Der Feed eines Zeitschnitts traegt nicht jede Sorte: gemessen standen im
  // Vierzehn-Tage-Fenster fuenf der zwoelf, und gerade die Marke — ein Wappen
  // UND ein Wert nebeneinander — kam nicht vor. Eine Stichprobe genuegt hier
  // nicht, also wird jede Sorte einmal gestellt und in derselben Spalte
  // gemessen. Der laengste Aufschrift-Fall steht dabei ausdruecklich drin:
  // „AKTUELLE FORM" zog die Spalte allein achtzig Pixel breit.
  const alleSorten = await page.evaluate(() => {
    const bau = window.__k.eval('_newsCardHtmlM2');
    const sorte = window.__k.eval('_newsSorte');
    const p = window.__k.eval('players.map(x => x.id)');
    const mid = window.__k.eval('matches[matches.length-1].id');
    const feed = document.querySelector('#sheet .nf-feed') || document.getElementById('sheet');
    const huelle = document.createElement('div');
    feed.appendChild(huelle);
    // `cat` entscheidet in `_newsSorte` mit: alles mit `cat:'tafel'` ist eine
    // Tafel-Karte, egal welchen Typ die Zeile traegt. Ohne diese Unterscheidung
    // fielen acht der dreizehn Faelle auf dieselbe Sorte.
    const karte = (titel, text, ref, cat) => ({id:'x', cat: cat || 'match',
      ic:'medal2', prio:50, title:titel, desc:text,
      when:new Date().toISOString(), dataRef:ref});
    // Die laengste Schlagzeile, die der Generator ueber die Fixtures
    // ueberhaupt bildet — gemessen 58 Zeichen bei einem Median von 34. Eine
    // erfundene, laengere Zeile bricht in jeder Spaltenbreite ab und wuerde
    // damit die Spalte nicht mehr messen.
    const lang = 'Maxi, Julian, Jane und Johannes uebernehmen „Der Hoehenflug"';
    const faelle = [
      karte(lang, 'Ein Rekord der Kammer Aktuelle Form wechselt: 72 %.',
            {type:'sammel', quelle:'form', rekordId:'best_record',
             playerIds:[p[5], p[6], p[8], p[9]],
             teile:[{titel:'a', pids:[p[5]]}, {titel:'b', pids:[p[6]]},
                    {titel:'c', pids:[p[8]]}]}, 'tafel'),
      karte(lang, 'Neun Wechsel an einem Tag.',
            {type:'sammel', quelle:'tafel', playerIds:[p[5], p[6], p[8]],
             teile:new Array(9).fill(0).map((_, i) => ({titel:'t' + i, pids:[p[5]]}))},
            'tafel'),
      karte(lang, 'Die vierte Stufe steht.', {type:'insignium_stufe', pid:p[9], stufe:3}),
      karte(lang, '5 von 6 gewonnen.', {type:'potd', playerId:p[9], wr:.83, wins:5, games:6}),
      karte(lang, 'Eine Auszeichnung mehr.', {type:'badge_unlocked', pid:p[9], badgeId:'wall'}),
      karte(lang, '12 Siege in Folge.', {type:'win_streak', pid:p[9], streak:12}),
      karte(lang, '18 Elo gewonnen.', {type:'elo_swing', pid:p[9], delta:18}),
      karte(lang, '15 Siege in Folge erreicht.', {type:'milestone', pid:p[9], streak:15}),
      karte(lang, 'Das 50. Duell.', {type:'rivalry_milestone', a:p[8], b:p[9], milestone:50}),
      karte(lang, 'Vier Erfolge im selben Moment.',
            {type:'sammel', quelle:'spieler', playerIds:[p[9]],
             teile:[{titel:'a'}, {titel:'b'}, {titel:'c'}, {titel:'d'}]}),
      karte(lang, 'Drei tragen jetzt dieselbe Stufe.',
            {type:'sammel', quelle:'erfolg', art:'insignium_stufe', stufe:2,
             playerIds:[p[7], p[8], p[9]],
             teile:[{titel:'a', pids:[p[7]]}, {titel:'b', pids:[p[8]]},
                    {titel:'c', pids:[p[9]]}]}),
      karte(lang, 'Leon fuehrt mit 91 Elo Vorsprung.',
            {type:'ambient', pid:p[8], vv:'91', vl:'Elo Vorsprung'}),
      karte(lang, 'Ein Ergebnis des Tages.', {type:'match_result', matchId:mid})
    ];
    const gemessen = [];
    faelle.forEach(f => {
      huelle.innerHTML = bau(f, false, false);
      const c = huelle.querySelector('.nf-card'), l = huelle.querySelector('.nf-gr-l');
      if(!c) return;
      // Ein Deckel auf der Spalte schneidet ab, statt zu schrumpfen: die
      // Chipgruppe traegt `flex-shrink:0`, und bei 72 px stand der Deckel
      // mitten in ihr — das dritte Zeichen („+2") war weg. Gemessen wird
      // deshalb, ob ein Kind ueber den INHALT der Spalte hinausragt, und
      // nicht nur, wie breit sie ist.
      let ueber = 0;
      if(l){
        const lb = l.getBoundingClientRect(), cs = getComputedStyle(l);
        const li = lb.left + parseFloat(cs.paddingLeft);
        const re = lb.right - parseFloat(cs.paddingRight)
                 - parseFloat(cs.borderRightWidth);
        [...l.children].forEach(k => {
          const kb = k.getBoundingClientRect();
          ueber = Math.max(ueber, Math.round(Math.max(0, kb.right - re)
                                           + Math.max(0, li - kb.left)));
        });
      }
      gemessen.push({s: sorte(f), ueber,
        a: l ? Math.round(l.getBoundingClientRect().width
                          / c.getBoundingClientRect().width * 100) : 0});
    });
    huelle.remove();
    return gemessen;
  });
  const sortenBreit = alleSorten.filter(x => x.a > 28);
  ok(new Set(alleSorten.map(x => x.s)).size >= 11,
     'jede Kartensorte wird einmal gestellt',
     new Set(alleSorten.map(x => x.s)).size + ' Sorten');
  ok(sortenBreit.length === 0,
     'und keine von ihnen gibt der Bildzone mehr als 28 % der Karte',
     sortenBreit.map(x => x.s + ' ' + x.a + ' %').join(', ')
     || 'breiteste ' + Math.max.apply(null, alleSorten.map(x => x.a)) + ' %');
  const sortenKlemm = alleSorten.filter(x => x.ueber > 0);
  ok(sortenKlemm.length === 0, 'und keine schneidet ihr eigenes Bild ab',
     sortenKlemm.map(x => x.s + ' ' + x.ueber + ' px').join(', '));

  ok(luecken.ab === 0, 'und keine Schlagzeile bricht ab',
     luecken.ab + ' abgeschnitten' + (luecken.abAerger ? ' („' + luecken.abAerger + '")' : ''));

  console.log('\n═══ DER RAND SAGT, WAS WIEGT ═══');
  const raender = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    // Gemessen wird eine Regel des Stylesheets, nicht die Nachrichtenlage.
    // Der Fun Fact stand nur zufaellig im Feed: an einem vollen Spieltag
    // faellt er weg [§C33], und dann verglich die Zusicherung Gold gegen
    // nichts. Die fehlende Sorte wird deshalb einmal gerendert, gemessen und
    // wieder entfernt — die Sorte, nicht der Tag, traegt die Aussage.
    const hilf = document.createElement('div');
    sheet.appendChild(hilf);
    const leihen = (sorte, extra) => {
      hilf.innerHTML = `<div class="nf-card nf-s-${sorte}${extra || ''}"></div>`;
      return hilf.querySelector('.nf-card');
    };
    const mess = (klasse, sorte, extra) => {
      const c = sheet.querySelector('.' + klasse) || (sorte ? leihen(sorte, extra) : null);
      if(!c) return null;
      const cs = getComputedStyle(c);
      return {kante: parseFloat(cs.borderLeftWidth), farbe: cs.borderTopColor};
    };
    const raus = {gold: mess('nf-s-held', 'held'),
                  fakt: mess('nf-s-fakt', 'fakt'),
                  spiel: mess('nf-s-spiel', 'spiel'),
                  neg: mess('nf-neg', 'serie', ' nf-neg')};
    hilf.remove();
    return raus;
  });
  ok(raender.gold && raender.fakt && raender.gold.kante > raender.fakt.kante,
     'die Siegerkarte traegt die staerkere Kante als der Fun Fact',
     JSON.stringify(raender));
  ok(raender.gold && raender.spiel && raender.gold.farbe !== raender.spiel.farbe,
     'Gold und Spieltag tragen nicht denselben Rahmen',
     (raender.gold||{}).farbe + ' / ' + (raender.spiel||{}).farbe);
  ok(!raender.neg || !raender.spiel || raender.neg.farbe !== raender.spiel.farbe,
     'die Schattenseite traegt ihren eigenen Rahmen [§C25]',
     (raender.neg||{}).farbe);

  console.log('\n═══ WAS SICH BEWEGT, RUHT AUF WUNSCH ═══');
  const bewegt = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const band = sheet.querySelector('.nf-gross-band');
    const stern = band && band.querySelector('svg');
    return {
      band: band ? getComputedStyle(band, '::after').animationName : null,
      stern: stern ? getComputedStyle(stern).animationName : null
    };
  });
  ok(bewegt.band && bewegt.band !== 'none',
     'die Karte des Tages bewegt sich', String(bewegt.band));
  ok(bewegt.stern && bewegt.stern !== 'none',
     'und ihr Stern atmet', String(bewegt.stern));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const ruhig = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const band = sheet.querySelector('.nf-gross-band');
    const stern = band && band.querySelector('svg');
    const punkt = sheet.querySelector('.nf-brk-punkt');
    return {
      band: band ? getComputedStyle(band, '::after').animationName : 'none',
      stern: stern ? getComputedStyle(stern).animationName : 'none',
      punkt: punkt ? getComputedStyle(punkt).animationName : 'none'
    };
  });
  ok(ruhig.band === 'none' && ruhig.stern === 'none' && ruhig.punkt === 'none',
     'bei prefers-reduced-motion steht alles still', JSON.stringify(ruhig));
  // Dieselbe Frage für die Zeichnungen im Blatt: ein Balken waechst auf, und
  // die Bahn laeuft in Spielreihenfolge auf. Beides ruht ebenso.
  const balkenRuhe = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="nd">'
      + '<div class="nd-chance"><div class="nd-chance-b"><i style="width:50%"></i></div></div>'
      + '<div class="nd-elo"><span class="nd-elo-b"><i class="p" style="width:30%"></i></span></div>'
      + '<div class="nd-bahn"><i class="w">10:4</i><i class="l">4:10</i></div></div>';
    document.body.appendChild(host);
    const n = el => el ? getComputedStyle(el).animationName : 'fehlt';
    const out = {chance:n(host.querySelector('.nd-chance-b i')),
                 elo:n(host.querySelector('.nd-elo-b i')),
                 bahn:n(host.querySelector('.nd-bahn i'))};
    host.remove(); return out;
  });
  ok(balkenRuhe.chance === 'none' && balkenRuhe.elo === 'none'
     && balkenRuhe.bahn === 'none',
     'und auch die Balken und die Bahn im Blatt', JSON.stringify(balkenRuhe));
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const balkenLebt = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="nd">'
      + '<div class="nd-chance"><div class="nd-chance-b"><i style="width:50%"></i></div></div>'
      + '<div class="nd-bahn"><i class="w">10:4</i><i class="l">4:10</i></div></div>';
    document.body.appendChild(host);
    const el = host.querySelector('.nd-chance-b i');
    const b2 = host.querySelectorAll('.nd-bahn i')[1];
    const out = {chance: el ? getComputedStyle(el).animationName : 'fehlt',
                 bahn: b2 ? getComputedStyle(b2).animationName : 'fehlt',
                 // Die Bahn laeuft nacheinander auf, nicht auf einmal.
                 verzug: b2 ? getComputedStyle(b2).animationDelay : '0s'};
    host.remove(); return out;
  });
  ok(balkenLebt.chance !== 'none' && balkenLebt.chance !== 'fehlt',
     'sonst waechst ein Balken auf', String(balkenLebt.chance));
  ok(balkenLebt.bahn !== 'none' && parseFloat(balkenLebt.verzug) > 0,
     'und die Bahn laeuft in Spielreihenfolge auf',
     balkenLebt.bahn + ' nach ' + balkenLebt.verzug);

  console.log('\n═══ DER GLANZ GEHOERT DEM TITEL ═══');
  // Breaking glimmt, die Karte des Tages traegt ein Lauflicht — und dasselbe
  // Licht liegt dort, wo Gold einen Titel bedeutet und EINER ihn traegt
  // [§C25]: der Erste des Podests, der Spieler des Tages und der Woche, der
  // Held eines Rueckblicks. Ein silberner Erster, eine gelesene Siegerkarte
  // und eine gewoehnliche Partie tragen es nicht.
  const glanz = async () => page.evaluate(() => {
    const host = document.createElement('div');
    // Podest, Rückblick und Blattkopf tragen ihre eigene Bahn (`glanzBahn`),
    // die Karten im Feed den Lauf selbst.
    const bahn = window.__k.eval('glanzBahn()');
    host.innerHTML = '<div class="podest"><div class="pod-karte gold erster" id="g1">' + bahn + '</div>'
      + '<div class="pod-karte silber erster" id="g2">' + bahn + '</div></div>'
      + '<div class="nf-card nf-s-held" id="g3"></div><div class="nf-card nf-s-held read" id="g4"></div>'
      + '<div class="nf-card nf-s-spiel" id="g5"></div><div class="rcp-held" id="g6">' + bahn + '</div>'
      + '<div class="nd nd-s-held"><div class="nd-head" id="g7">' + bahn + '</div></div>'
      + '<div class="nf-card nf-s-spiel nf-glanz" id="g8"></div>';
    document.body.appendChild(host);
    const a = id => { const e = host.querySelector('#' + id);
      return getComputedStyle(e.querySelector('.glanz-bahn') || e, '::after').animationName; };
    const out = {gold:a('g1'), silber:a('g2'), held:a('g3'), gelesen:a('g4'),
                 spiel:a('g5'), rueckblick:a('g6'), blatt:a('g7'), selten:a('g8')};
    host.remove(); return out;
  });
  const gl = await glanz();
  // Der Lauf fährt überall per `transform` (`glanzZug`): im Feed schneidet
  // die Karte ab, sonst seine eigene Bahn.
  const istGlanz = n => n === 'glanzZug';
  ok(gl.gold === 'glanzZug' && gl.held === 'glanzZug' && gl.rueckblick === 'glanzZug'
     && gl.blatt === 'glanzZug',
     'der Erste in Gold, der Spieler des Tages samt Blatt und der Held tragen den Glanz',
     JSON.stringify(gl));
  ok(!istGlanz(gl.silber) && !istGlanz(gl.gelesen) && !istGlanz(gl.spiel),
     'ein silberner Erster, eine gelesene und eine gewoehnliche Karte nicht',
     JSON.stringify(gl));
  // Das Seltene im Feed trägt einen leisen Lichtlauf in der Farbe seiner
  // Familie: nie in Gold, nie auf einer negativen Karte, nie doppelt auf
  // Breaking oder der Karte des Tages.
  const glFeed = await page.evaluate(() => {
    window.__k.eval('_cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); _cache._consolFrom = null; openNewsFeed(); _newsFeedRest()');
    const ks = [...document.querySelectorAll('#sheet .nf-card.nf-glanz')];
    return {n: ks.length, alle: document.querySelectorAll('#sheet .nf-card').length,
      falsch: ks.filter(k => k.matches('.nf-neg,.nf-brk,.nf-gross,.nf-s-held,.nf-s-woche')
        || /247,\s*207,\s*74/.test(getComputedStyle(k, '::after').backgroundImage)).map(k => k.dataset.sid)};
  });
  ok(gl.selten === 'glanzZug' && glFeed.n >= 3 && glFeed.n <= glFeed.alle / 3 && !glFeed.falsch.length,
     'das Seltene im Feed traegt einen Lichtlauf in seiner Familienfarbe, nicht in Gold und nicht auf einer negativen Karte',
     glFeed.n + ' von ' + glFeed.alle + ' Karten, falsch: ' + glFeed.falsch.slice(0, 3));
  // Der Hinweis „x neue Stories" ist ein Ereignis: die Zahl groß neben
  // einem Zeichen, ein Lichtlauf und ein Ring beim Erscheinen — und bei
  // Bewegungsruhe nichts davon.
  const toastLauf = async () => page.evaluate(() => {
    const t = document.getElementById('newsToast'), x = document.getElementById('newsToastTxt');
    window.__k.eval('_newsToastFuellen')(x, 59);
    t.classList.add('visible', 'show');
    const out = {n:(x.querySelector('.nt-n') || {}).textContent, ic:!!x.querySelector('.nt-ic svg'),
      glanz:getComputedStyle(t, '::after').animationName, ring:getComputedStyle(x.querySelector('.nt-ic')).animationName};
    t.classList.remove('visible', 'show');
    return out;
  });
  const ntLebt = await toastLauf();
  ok(ntLebt.n === '59' && ntLebt.ic && ntLebt.glanz === 'ntGlanz' && /ntRing/.test(ntLebt.ring),
     'der Hinweis auf neue Stories zeigt die Zahl gross mit Zeichen, Lichtlauf und Ring', JSON.stringify(ntLebt));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const ntRuhig = await toastLauf();
  ok(ntRuhig.glanz === 'none' && ntRuhig.ring === 'none', 'und bei Bewegungsruhe steht er still', JSON.stringify(ntRuhig));
  const glRuhig = await glanz();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(Object.values(glRuhig).every(v => v !== 'glanzZug'),
     'bei prefers-reduced-motion ruht der Glanz', JSON.stringify(glRuhig));

  // Im Verlauf steht der Sieger hell und der Verlierer leise, der Stand
  // ist nicht kursiv, die Partien stehen unter ihrem Tag; ein Duo zeigt
  // seine Bilanz als Balken.
  const listen = await page.evaluate(() => {
    // In einem eigenen Behälter gezeichnet: das offene Blatt gehört den
    // Prüfungen danach.
    const K = window.__k.eval, host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;width:360px';
    document.body.appendChild(host);
    host.innerHTML = K('vHistory()');
    const won = host.querySelector('.mteam.won'), lost = host.querySelector('.mteam.lost');
    const em = host.querySelector('.mscore em.w');
    const out = {farbe: won && lost ? getComputedStyle(won).color !== getComputedStyle(lost).color : false,
      kursiv: em ? getComputedStyle(em).fontStyle : 'fehlt', tage: host.querySelectorAll('.mtag').length,
      gesichter: host.querySelectorAll('.mrow .mteam-av .av').length};
    host.innerHTML = K('vTeams()');
    const r = host.querySelector('.tm-row'), bar = r && r.querySelector('.tm-bar i');
    const wl = r ? (r.querySelector('.tm-bil').textContent.match(/(\d+)–(\d+)/) || []) : [];
    out.balken = bar && wl.length ? Math.abs(bar.getBoundingClientRect().width / bar.parentElement.getBoundingClientRect().width
      - (+wl[1]) / ((+wl[1]) + (+wl[2]))) < 0.02 : false;
    host.remove();
    return out;
  });
  ok(listen.farbe && listen.kursiv === 'normal' && listen.tage >= 2 && listen.gesichter >= 40 && listen.balken,
     'im Verlauf steht der Sieger hell unter seinem Tag mit Gesichtern, und ein Duo zeigt seine Bilanz als Balken',
     JSON.stringify(listen));

  console.log('\n═══ DIE KARTEN AM SPIELTAG ═══');
  // Kopf und Fuß einer Partie folgen ihrem Anlass, und dieselben vier am
  // Tisch sind eine Runde [§11.6c]. Drei Dinge dürfen dabei nie passieren:
  // ein Text liegt auf einem anderen Text oder auf einem Gesicht, ein Text
  // ragt aus der Karte, und ein Text wird abgeschnitten — auch nicht mit
  // „…". Und nichts wird unter 8 px geschrumpft. Gemessen wird je
  // Zeilenkasten: ein umbrechender Satz ist als ein Rechteck so breit wie
  // die Karte und läge damit über jedem Wort neben ihm. Erst im Feed, dann
  // mit Grenzwerten, die die Liga in Jahren haben kann — und mit Namen, die
  // keiner hat.
  const PRUEFEN = function(wurzel){
    const fehler = [];
    const box = wurzel.getBoundingClientRect();
    const clip = el => {
      let r = null;
      for(let p = el.parentElement; p && p !== wurzel.parentElement; p = p.parentElement){
        const cs = getComputedStyle(p);
        if(cs.overflowX !== 'visible' || cs.overflowY !== 'visible'){
          const q = p.getBoundingClientRect();
          r = r ? {l:Math.max(r.l, q.left), t:Math.max(r.t, q.top), r:Math.min(r.r, q.right), b:Math.min(r.b, q.bottom)}
                : {l:q.left, t:q.top, r:q.right, b:q.bottom};
        }
      }
      return r;
    };
    const teile = [];
    let kleinste = 99;
    const tw = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT);
    for(let n = tw.nextNode(); n; n = tw.nextNode()){
      if(!n.textContent.trim()) continue;
      const el = n.parentElement;
      // Die Initialen im Gesicht gehören zum Gesicht; das Motiv ist Zierde.
      if(el.closest('[hidden],svg,.av,.rav,.nf-motiv')) continue;
      const cs = getComputedStyle(el);
      if(cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      const txt = n.textContent.trim().slice(0, 28);
      if(n.textContent.includes('…') && !el.closest('.nf-d,.nf-h')) fehler.push('gekürzt: „' + txt + '"');
      if(cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) fehler.push('mit „…" abgeschnitten: „' + txt + '"');
      kleinste = Math.min(kleinste, parseFloat(cs.fontSize));
      const rg = document.createRange(); rg.selectNodeContents(n);
      const c = clip(n);
      [...rg.getClientRects()].forEach(roh => {
        if(roh.width < 1) return;
        if(c && (roh.right > c.r + 1 || roh.left < c.l - 1 || roh.bottom > c.b + 1 || roh.top < c.t - 1)) fehler.push('abgeschnitten: „' + txt + '"');
        const sicht = c ? {l:Math.max(roh.left, c.l), t:Math.max(roh.top, c.t), r:Math.min(roh.right, c.r), b:Math.min(roh.bottom, c.b)}
                        : {l:roh.left, t:roh.top, r:roh.right, b:roh.bottom};
        teile.push({art:'text', txt, r:sicht, n});
      });
    }
    wurzel.querySelectorAll('svg text').forEach(t => {
      if(t.closest('.rav,.av')) return;
      const q = t.getBoundingClientRect();
      kleinste = Math.min(kleinste, parseFloat(getComputedStyle(t).fontSize));
      teile.push({art:'text', txt:t.textContent.slice(0, 28), r:{l:q.left, t:q.top, r:q.right, b:q.bottom}, n:t});
    });
    wurzel.querySelectorAll('.av, .rav').forEach(a => {
      if(a.closest('.rav') && !a.classList.contains('rav')) return;
      const q = a.getBoundingClientRect(), c = clip(a);
      const r = {l:q.left, t:q.top, r:q.right, b:q.bottom};
      if(c){ r.l = Math.max(r.l, c.l); r.t = Math.max(r.t, c.t); r.r = Math.min(r.r, c.r); r.b = Math.min(r.b, c.b); }
      if(r.r > r.l && r.b > r.t) teile.push({art:'gesicht', txt:'Gesicht', r});
    });
    teile.forEach(t => {
      if(t.r.r - t.r.l < 1) return;
      if(t.r.l < box.left - 1 || t.r.r > box.right + 1) fehler.push('ragt aus der Karte: „' + t.txt + '"');
    });
    for(let i = 0; i < teile.length; i++) for(let j = i + 1; j < teile.length; j++){
      const u = teile[i], v = teile[j];
      if(u.art === 'gesicht' && v.art === 'gesicht') continue;
      if(u.n && u.n === v.n) continue;
      const w = Math.min(u.r.r, v.r.r) - Math.max(u.r.l, v.r.l), h = Math.min(u.r.b, v.r.b) - Math.max(u.r.t, v.r.t);
      if(w > 1.5 && h > 1.5) fehler.push('liegt übereinander: „' + u.txt + '" und „' + v.txt + '"');
    }
    if(kleinste < 8) fehler.push('Schrift unter 8 px: ' + kleinste);
    return {fehler:[...new Set(fehler)], kleinste};
  };
  const spieltag = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const sheet = document.getElementById('sheet');
    sheet.querySelectorAll('.nf-card').forEach(c => { c.style.contentVisibility = 'visible'; });
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const karten = [...sheet.querySelectorAll('.nf-card.nf-s-spiel')];
    const fehler = [], formen = {};
    let kleinste = 99;
    const FORM = ['sp-feld','sp-at','sp-wp','sp-band','sp-zeile','sp-vt','sp-nv','sp-tb','sp-sl','sp-rk','sp-duo','sp-ku','sp-bg','sp-md','sp-rd-tafel','sp-pm','sp-ro','sp-rq'];
    karten.forEach(k => {
      const r = pruefen(k);
      r.fehler.forEach(f => fehler.push(k.dataset.sid + ': ' + f));
      kleinste = Math.min(kleinste, r.kleinste);
      FORM.forEach(c => { if(k.querySelector('.' + c)) formen[c] = (formen[c] || 0) + 1; });
    });
    const fd = [...sheet.querySelectorAll('.nf-faden')];
    fd.forEach(f => { const k = f.closest('.nf-card').getBoundingClientRect(), r = f.getBoundingClientRect();
      if(r.left < k.left - .5 || r.right > k.right + .5) fehler.push('Faden ragt aus der Karte'); });
    return {karten:karten.length, runden:sheet.querySelectorAll('.nf-runde').length, fehler, formen, kleinste, faeden:fd.length};
  }, PRUEFEN.toString());
  ok(spieltag.karten > 20 && spieltag.runden > 0 && Object.keys(spieltag.formen).length >= 8 && spieltag.faeden > 0
     && spieltag.fehler.length === 0,
     'im Feed liegt auf keiner Karte am Spieltag ein Text auf einem anderen oder einem Gesicht, keiner ragt hinaus oder ist abgeschnitten',
     spieltag.fehler.slice(0, 3).join(' | ') || spieltag.karten + ' Karten, ' + spieltag.runden + ' Runden, '
       + Object.keys(spieltag.formen).length + ' Formen, kleinste Schrift ' + spieltag.kleinste + ' px');
  // Die Grenzwerte: 45.495 Partien, eine Bilanz von 12.345:9.876, 98.765
  // Begegnungen, eine Elo von −12.345, eine Serie von 57 gegen einen
  // Bestwert von 120, eine Runde aus 23 Partien, Platz 118 bis 126 der
  // Tabelle — und Namen wie „Jean-Baptiste von Hohenstein". Die Spieler
  // bleiben echte Spieler, ihre Wappen hängen an ihrer Laufbahn; nur die
  // Namen werden für die Probe ersetzt und danach zurückgestellt. Gemessen
  // in der Breite einer Karte auf dem schmalsten Telefon und auf einem
  // gewöhnlichen.
  const grenz = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const html = K(`(function(){
      const LANG = ['Maximilian-Alexander', 'Bartholomäus', 'Jean-Baptiste von Hohenstein', 'Konstantinopel',
        'Anneliese-Charlotte', 'Wolfgang Amadeus', 'Christophorus', 'Friederike-Sophie', 'Leopoldine', 'Ottokar', 'Kunigunde', 'Ferdinand'];
      const alt = players.map(p => [p, p.name]);
      players.forEach((p, i) => { p.name = LANG[i % LANG.length]; });
      try {
        const alle = players.map(p => p.id);
        const [a, b, c, e] = alle;
        const [k1, k2, k3, k4] = [alle[5], alle[9], alle[10], alle[11]];
        const d0 = Date.now();
        const zellen = Array.from({length:8}, (_, i) => i % 3 ? 'w' : 'l'); zellen[7] = 'W';
        const spiele = Array.from({length:30}, (_, i) => ({a:i % 2 === 0, diff:(i * 7) % 10 + 1, jetzt:i === 29}));
        const ms = matches.slice(-23);
        const teile = [
          _spBandBild({A:[a, b], B:[c, e], sa:10, sb:2, aw:true}),
          _spZeileBild({A:[a, b], B:[c, e], sa:9, sb:10, aw:false}),
          _spFeldBild({slots:[{id:k1, r:'Abwehr', w:true, d:1234}, {id:k2, r:'Sturm', w:false, d:-1234}, {id:k3, r:'Sturm', w:true, d:999}, {id:k4, r:'Abwehr', w:false, d:-9999}], sa:10, sb:9, aw:true, c:.5}),
          _spFeldBild({slots:[{id:a, r:'Abwehr', w:true, d:1234}, {id:b, r:'Sturm', w:false, d:-1234}, {id:c, r:'Sturm', w:true, d:999}, {id:e, r:'Abwehr', w:false, d:-99999}], sa:10, sb:9, aw:true, c:.03}),
          _spTafelBild({A:[a, b], B:[c, e], sa:10, sb:9, aw:true, c:.5}) + _spNervenBild({zeilen:[{id:a, w:12345, l:9876, zellen}, {id:b, w:999, l:1000, zellen}]}),
          _spVerteilungBild({n:[0, 9000, 8500, 8000, 7000, 6000, 4000, 2000, 900, 90, 9], diff:8, gesamt:45495, so:999, zuletzt:d0}),
          _spWippeBild({fav:[a, b], dog:[c, e], eloFav:12345, eloDog:-9876, pct:1, sa:10, sb:9, aw:true}),
          _spTabelleBild({von:1, bis:9, spitze:true, zeilen:[{id:k2, p:2, q:1, k:'g'}, {id:k3, p:1, q:2, k:'r'}, {id:alle[8], p:3, q:3, k:'m'}, {id:k4, p:9, q:9, k:'m'}]}),
          _spTabelleBild({von:118, bis:126, spitze:false, zeilen:[{id:a, p:118, q:126, k:'r'}, {id:b, p:126, q:118, k:'g'}, {id:c, p:121, q:121, k:'m'}, {id:e, p:122, q:123, k:'m'}]}),
          _spSerieBild({pid:a, laenge:57, eig:120, liga:340, ligaWer:b}),
          _spSerieBild({pid:a, laenge:15, eig:15, liga:16, ligaWer:b}),
          _spRissBild({opfer:a, laenge:240, brecher:[c, e], eig:999}) + _spRissBild({opfer:b, laenge:19, brecher:[a, c], eig:19}),
          _spPremiereBild({A:a, B:b, versuch:1}) + _spPremiereBild({A:c, B:e, versuch:12345}) + _spPremiereBild({A:a, B:c, versuch:14}),
          _spRolleBild({pid:a, r:'atk', anteil:.0012, dort:12, alle:9876, w:12345}) + _spRolleBild({pid:b, r:'def', anteil:.249, dort:2490, alle:9999, w:1}),
          _spDuoBild({A:a, B:c, laenge:44, w:12345, l:9876}),
          _spKurveBild({pid:a, n:999, d:12345, werte:Array.from({length:12}, (_, i) => ({v:i < 11 ? -i * 900 : 4000, w:i === 11, jetzt:i === 11}))}),
          _spDuellBild({A:a, B:b, gesamt:98765, aw:45678, spiele}),
          _spMedailleBild({name:'Unüberwindliche Betonmauer der Liga', ic:'shield', klasse:'legendary', wer:a, rang:1234, ids:alle, traeger:alle.slice(0, 7)})
            + _spMedailleBild({name:'Mauer', ic:'shield', klasse:'rare', wer:a, rang:2, ids:Array.from({length:40}, (_, i) => alle[i % alle.length]), traeger:[]}),
          _spTagBild({pid:a, elo:-12345, partien:Array.from({length:31}, (_, i) => ({w:i % 3 > 0, e:(i % 5 - 2) * 1000}))}),
          // Die Formen der gewöhnlichen Partie [§C33], jede mit ihren Grenzwerten.
          _spMosaikBild({W:[a, b], L:[c, e], hoch:10, tief:8, diff:2, n:[0, 9000, 45495, 8000, 7000, 6000, 4000, 2000, 900, 90, 9], mal:45495}),
          _spTachoBild({W:[a, b], L:[c, e], hoch:10, tief:9, pct:99, klar:false}),
          _spStreuBild({W:[a, b], L:[c, e], hoch:10, tief:9, c:.99, diff:1, knapp:true, so:45495, gesamt:45495,
            bins:[{c:.5, d:3, n:9999}, {c:.97, d:10, n:1}, {c:.02, d:0, n:5}], erw:[[.05, 9], [.95, 1]]}),
          _spTransferBild({W:[a, b], L:[c, e], hoch:10, tief:0, delta:{[a]:12345, [b]:999, [c]:-12345, [e]:-999}, gewinn:13344}),
          _spChemieBild({A:a, B:b, L:[c, e], hoch:10, tief:9, s:12345, p:45495, folge:Array.from({length:30}, (_, i) => i % 4 > 0)}),
          _spGegnerBild({w:a, l:c, W:[a, b], L:[c, e], s:12345, n:45495, fluch:999, hoch:10, tief:9, folge:Array.from({length:24}, (_, i) => i > 22)}),
          _spRevancheBild({W:[a, b], L:[c, e], hoch:10, tief:9, vHoch:10, vTief:9, seit:{n:999, e:'Wochen'}}),
          _spGipfelBild({hoch:10, tief:9, zeilen:[{id:a, pre:1, post:126, w:true}, {id:b, pre:2, post:1, w:true}, {id:c, pre:118, post:2, w:false}, {id:e, pre:null, post:null, w:false}]}),
          _spRueckkehrBild({id:a, mit:b, tage:12345, L:[c, e], hoch:10, tief:9}),
          _spGefaelleBild({W:[a, b], L:[c, e], hoch:10, tief:9, elo:{[a]:12345, [b]:-12345, [c]:999, [e]:-999}}),
          _spTagesringBild({id:a, mit:b, L:[c, e], hoch:10, tief:9, folge:Array.from({length:24}, (_, i) => i % 5 > 0)}),
          _spZaehlwerkBild({wer:a, wert:45000, sieg:true, W:[a, b], L:[c, e], hoch:10, tief:9})
            + _spZaehlwerkBild({wer:null, wert:45400, sieg:false, W:[a, b], L:[c, e], hoch:10, tief:0})
        ].map(h => '<div class="nf-card nf-s-spiel">' + h + '</div>');
        const runde = {id:'probe', when:new Date(d0).toISOString(), cat:'highlight',
          title:'Jean-Baptiste von Hohenstein gewinnt die Runde mit 12 von 23 Partien',
          desc:'23 Partien zwischen 10:00 und 13:40 Uhr, jede Paarung mindestens einmal.',
          dataRef:{type:'runde', matchIds:ms.map(m => m.id),
            spieler:[{id:a, w:12, l:11, e:12345}, {id:b, w:11, l:12, e:-9999}, {id:c, w:10, l:13, e:0}, {id:e, w:9, l:14, e:-12345}]}};
        teile.push(_newsRundeHtml(runde, false, ''));
        teile.push('<div class="nf-card">' + _newsRundeBlatt(runde) + '</div>');
        return teile.join('');
      } finally { alt.forEach(([p, n]) => { p.name = n; }); }
    })()`);
    const out = {};
    [288, 360].forEach(breite => {
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:0;top:0;width:' + breite + 'px';
      host.innerHTML = html;
      document.body.appendChild(host);
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const fehler = [];
      let kleinste = 99;
      host.querySelectorAll(':scope > .nf-card').forEach((k, i) => {
        const r = pruefen(k);
        r.fehler.forEach(f => fehler.push('Teil ' + i + ': ' + f));
        kleinste = Math.min(kleinste, r.kleinste);
      });
      const feldScores = [...host.querySelectorAll('.sp-f-sc b')]
        .map(el => parseFloat(getComputedStyle(el).fontSize));
      out[breite] = {n:host.children.length, fehler:[...new Set(fehler)], kleinste,
        feldScores, scoreMin:Math.min(...feldScores)};
      host.remove();
    });
    return out;
  }, PRUEFEN.toString());
  ok(grenz[288].n >= 30 && grenz[288].fehler.length === 0 && grenz[360].fehler.length === 0
     && [288,360].every(b => grenz[b].feldScores.length >= 2 && grenz[b].scoreMin >= 24),
     'und mit Grenzwerten und langen Namen auch nicht, mit grossem Spielfeld-Score auf schmalen und gewöhnlichen Telefonen',
     grenz[288].fehler.concat(grenz[360].fehler).slice(0, 3).join(' | ')
       || grenz[288].n + ' Teile, kleinste Schrift ' + Math.min(grenz[288].kleinste, grenz[360].kleinste) + ' px');
  const fadenAuf = await page.evaluate(() => {
    const sheet = document.getElementById('sheet');
    const f = sheet.querySelector('.nf-faden');
    if(!f) return {ok:false};
    const ziel = sheet.querySelector('.nf-card[data-sid="' + CSS.escape(f.dataset.ziel) + '"] .nf-h');
    const vorher = document.getElementById('nd').innerHTML;
    f.click();
    const nd = document.getElementById('nd');
    const titel = (nd.querySelector('.nd-title') || {}).textContent || '';
    const weiter = [...nd.querySelectorAll('.nd-faeden .nf-faden')].map(x => x.textContent);
    try { window.__k.eval('closeNewsDetail()'); } catch(e){}
    return {ok: true, soll: ziel ? ziel.textContent : '(nicht im Feed)', titel,
            weiter: weiter.some(x => /Geht weiter/.test(x)), neu: nd.innerHTML !== vorher};
  });
  ok(fadenAuf.ok && fadenAuf.titel === fadenAuf.soll && fadenAuf.weiter,
     'der Faden oeffnet die fruehere Karte, und deren Blatt zeigt, wo es weitergeht',
     fadenAuf.titel + ' / ' + fadenAuf.soll);

  console.log('\n═══ BREAKING BRICHT DIE SPALTE ═══');
  const brk = await page.evaluate(() => {
    // Kein Breaking im Fenster: eines nachbauen und in denselben Feed haengen.
    const sheet = document.getElementById('sheet');
    const feed = sheet.querySelector('.nf-feed');
    if(!feed) return {ok:false};
    const roh = window.__k.eval('_buildStories()');
    const basis = roh[0];
    const fake = Object.assign({}, basis, {dataRef: Object.assign({}, basis.dataRef || {},
      {type:'lead_change'})});
    const html = window.__k.eval('_newsCardHtmlM2')(fake, false, false);
    const huelle = document.createElement('div');
    huelle.innerHTML = html;
    // Breaking steht in einer Hülle, die seinen Schein trägt.
    const aussen = huelle.firstElementChild;
    const karte = aussen.matches('.nf-card') ? aussen : aussen.querySelector('.nf-card');
    feed.appendChild(aussen);
    const bb = karte.getBoundingClientRect();
    const andere = [...feed.querySelectorAll('.nf-card:not(.nf-brk)')]
      .map(c => c.getBoundingClientRect().width);
    const band = karte.querySelector('.nf-brk-band');
    const res = {istBrk: karte.classList.contains('nf-brk'), breite: bb.width,
                 maxAndere: Math.max.apply(null, andere), band: !!band,
                 rahmen: getComputedStyle(karte).borderTopStyle,
                 schein: aussen.classList.contains('nf-brk-hof') ? getComputedStyle(aussen, '::before').animationName : 'keine Hülle'};
    aussen.remove();
    return res;
  });
  ok(brk.istBrk, 'ein Breaking-Anlass macht die Karte zur Breaking-Karte');
  ok(brk.breite > brk.maxAndere, 'Breaking steht breiter als jede andere Karte',
     brk.breite + ' gegen ' + brk.maxAndere);
  ok(brk.band, 'Breaking traegt seinen Balken');
  ok(brk.rahmen === 'solid', 'Breaking traegt immer den vollen Rahmen', brk.rahmen);
  ok(brk.schein === 'nfBrkGlut', 'der Schein von Breaking glimmt auf der Hülle hinter der Karte', brk.schein);

  // Was im Feed endlos läuft, rechnet die Grafikkarte: nur `transform` und
  // `opacity`. Ein wechselnder `box-shadow` oder eine wandernde
  // `background-position` verlangten jedes Bild einen Takt des
  // Hauptthreads über den ganzen Feed — gemessen rund 490 ms je Sekunde bei
  // vierfach gedrosselter CPU, solange der Feed offen stand, statt 3.
  const endlos = await page.evaluate(() => {
    const falsch = [];
    for(const a of document.getAnimations()){
      const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
      if(t.iterations !== Infinity || !a.effect.target || !a.effect.target.closest('#sheet')) continue;
      const props = new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k))
        .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)));
      const fremd = [...props].filter(k => k !== 'transform' && k !== 'opacity');
      if(fremd.length) falsch.push((a.animationName || '?') + ':' + fremd.join('+'));
    }
    return [...new Set(falsch)];
  });
  ok(!endlos.length, 'was im Feed endlos läuft, bewegt nur transform und opacity', endlos.join(', '));

  console.log('\n═══ JEDES BLATT ZEIGT SEINE STORY ═══');
  const inhalt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const mitte = window.__k.eval('_newsDetailMitte');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    const seen = {};
    let typen = 0, leer = 0, leerName = '';
    let insBlaetter = 0, mitZeichen = 0, mitLeiter = 0;
    let kopfDoppelt = 0;
    roh.forEach(s => {
      const d = s.dataRef || {};
      const k = (d.type || '?') + (d.sub ? ':' + d.sub : '');
      if(seen[k]) return; seen[k] = 1;
      typen++;
      let m = ''; try { m = mitte(s) || ''; } catch(e){ m = ''; }
      // Die Karte „X traegt den Schildring" oeffnete ein Blatt mit NULL
      // Zeichen Inhalt: ausgerechnet die Story, die von der Stufe handelt,
      // zeigte sie nicht.
      if(!m.trim()){ leer++; leerName = leerName || k; }
      const brauchtZeichen = d.type === 'insignium_stufe' || (d.type === 'ambient' && d.prestige);
      if(brauchtZeichen){
        insBlaetter++;
        // Die Stufe steht seit ihrem eigenen Blatt groß auf der Bühne, also
        // im Kopf; die Prestige-Karte trägt sie weiter als Block in der Mitte.
        let ganz = ''; try { ganz = body(s) || ''; } catch(e){}
        box.innerHTML = ganz;
        if(box.querySelector('.nd-ins svg, .nd-is-z svg')) mitZeichen++;
        if(box.querySelector('.nf-leiter')) mitLeiter++;
        // Und der Kopf nennt Stufe und Prestige dann nicht noch einmal als Text.
        let h = ''; try { h = body(s) || ''; } catch(e){}
        box.innerHTML = h;
        const un = box.querySelector('.nd-held-un');
        if(un && /Prestige/.test(un.textContent)) kopfDoppelt++;
      }
    });
    box.remove();
    return {typen, leer, leerName, insBlaetter, mitZeichen, mitLeiter, kopfDoppelt};
  });
  ok(inhalt.leer === 0, 'kein Blatt bleibt ohne Inhalt',
     inhalt.leer + ' von ' + inhalt.typen + ' (' + inhalt.leerName + ')');
  ok(inhalt.insBlaetter === 0 || inhalt.mitZeichen === inhalt.insBlaetter,
     'jedes Insignium-Blatt traegt sein Zeichen',
     inhalt.mitZeichen + ' von ' + inhalt.insBlaetter);
  ok(inhalt.insBlaetter === 0 || inhalt.mitLeiter === inhalt.insBlaetter,
     'und die Leiter dazu', inhalt.mitLeiter + ' von ' + inhalt.insBlaetter);
  ok(inhalt.kopfDoppelt === 0, 'der Kopf nennt das Prestige nicht ein zweites Mal',
     inhalt.kopfDoppelt + ' doppelt');

  console.log('\n═══ NICHTS SAGT ZWEIMAL DASSELBE ═══');
  const doppelt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    const norm = t => String(t || '').replace(/[„""»«.,;:!?()]/g, ' ')
      .replace(/\s+/g, ' ').trim().toLowerCase();
    const seen = {};
    let typen = 0, treffer = 0, bsp = '';
    roh.forEach(s => {
      const d = s.dataRef || {};
      const k = (d.type || '?') + (d.sub ? ':' + d.sub : '');
      if(seen[k]) return; seen[k] = 1;
      typen++;
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      // Der KOPF darf den Spieler und die Partie nennen — das ist seine
      // Aufgabe. Gemessen wird, was darunter steht.
      box.querySelectorAll('.nd-held, .nd-erg').forEach(e => e.remove());
      // Und die BESCHRIFTUNG einer Zeichnung ist keine Wiederholung: der Name
      // des Zeichens steht neben dem Zeichen, weil er dazugehoert — genau wie
      // der Name einer Auszeichnung neben ihrem Medaillon [§C27].
      box.querySelectorAll('.nd-med-n, .nd-ins-n').forEach(e => e.remove());
      const oben = norm((s.title || '') + ' ' + (s.desc || ''));
      // Ein SATZ, nicht ein Wort: der Name eines Zeichens neben seiner
      // Zeichnung ist eine Beschriftung, keine Wiederholung.
      const lauf = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      let n;
      while((n = lauf.nextNode())){
        const t = norm(n.nodeValue);
        if(t.length < 20 || t.indexOf(' ') < 0) continue;
        if(oben.indexOf(t) >= 0){ treffer++; bsp = bsp || (k + ': ' + t.slice(0, 44)); }
      }
    });
    box.remove();
    return {typen, treffer, bsp};
  });
  ok(doppelt.treffer === 0, 'kein Satz aus der Karte steht im Blatt noch einmal',
     doppelt.treffer + ' in ' + doppelt.typen + ' Arten (' + doppelt.bsp + ')');

  console.log('\n═══ DER KOPF DES BLATTS ═══');
  const kopf = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const box = document.createElement('div');
    document.body.appendChild(box);
    let einzel = 0, mitAbzeichen = 0, mitRangText = 0;
    roh.forEach(s => {
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      const held = box.querySelector('.nd-held:not(.nd-held-duo)');
      if(!held) return;
      einzel++;
      // Das Rangabzeichen ist ein Bauteil, das die App schon hat [§C27]; im
      // Blatt stand statt seiner die Zeile „Rang 6" als nackter Text.
      if(held.querySelector('.rangab')) mitAbzeichen++;
      // Kein \b vor „Rang": im textContent klebt das Abzeichen davor
      // („SolideRang 10"), und die Wortgrenze fiel damit weg.
      if(/Rang \d/.test(held.textContent)) mitRangText++;
    });
    box.remove();
    return {einzel, mitAbzeichen, mitRangText};
  });
  ok(kopf.einzel === 0 || kopf.mitAbzeichen === kopf.einzel,
     'jeder Blattkopf traegt sein Rangabzeichen',
     kopf.mitAbzeichen + ' von ' + kopf.einzel);
  ok(kopf.mitRangText === 0, 'und nennt den Rang nicht noch einmal als Text',
     kopf.mitRangText + ' doppelt');

  console.log('\n═══ DAS BLATT SCHMUECKT AUS ═══');
  const schmuckBlatt = await page.evaluate(() => {
    const roh = window.__k.eval('_buildStories()');
    const body = window.__k.eval('_newsDetailBody');
    const sorte = window.__k.eval('_newsSorte');
    const rang = window.__k.eval('chronicleRang');
    const dahinter = d => { const h = (d.halter && d.halter.length) ? d.halter : (d.playerIds || []);
      try { return (rang(d.rekordId) || []).some(r => h.indexOf(r.pid || r.id) < 0); } catch(e){ return false; } };
    const box = document.createElement('div');
    document.body.appendChild(box);
    let medaille = 0, badges = 0, namenDoppelt = 0, rekorde = 0, mitVerfolger = 0,
        serien = 0, mitLauf = 0;
    roh.forEach(s => {
      const t = (s.dataRef || {}).type;
      let h = ''; try { h = body(s) || ''; } catch(e){ return; }
      box.innerHTML = h;
      if(t === 'badge_unlocked'){
        badges++;
        if(box.querySelector('.nd-med')) medaille++;
        // Der Name der Auszeichnung steht in der Schlagzeile; im Blatt stand
        // er darunter ein zweites Mal.
        const nm = (s.dataRef || {}).badgeName || '';
        if(nm){
          const treffer = (box.textContent.match(new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          if(treffer > 1) namenDoppelt++;
        }
      }
      // Verlangt nur, wo jemand dahinter liegt: halten alle im Rennen den
      // Rekord, füllte vorher der vierte Halter die Liste unter sich selbst.
      if(t === 'rekord_geholt' && dahinter(s.dataRef || {})){
        rekorde++;
        if(box.querySelector('.nd-vf')) mitVerfolger++;
      }
      if(t === 'loss_streak' || t === 'win_streak' || t === 'team_streak' || t === 'team_loss_streak'){
        serien++;
        if(box.querySelector('.nf-ser')) mitLauf++;
      }
      if(sorte(s)) { /* jede Sorte hat eine */ }
    });
    box.remove();
    return {medaille, badges, namenDoppelt, rekorde, mitVerfolger, serien, mitLauf};
  });
  ok(schmuckBlatt.badges === 0 || schmuckBlatt.medaille === schmuckBlatt.badges,
     'jedes Auszeichnungs-Blatt traegt sein Medaillon',
     schmuckBlatt.medaille + ' von ' + schmuckBlatt.badges);
  ok(schmuckBlatt.namenDoppelt === 0, 'der Name der Auszeichnung steht nur einmal im Blatt',
     schmuckBlatt.namenDoppelt + ' doppelt');
  ok(schmuckBlatt.rekorde === 0 || schmuckBlatt.mitVerfolger === schmuckBlatt.rekorde,
     'jedes Rekord-Blatt nennt die Verfolger',
     schmuckBlatt.mitVerfolger + ' von ' + schmuckBlatt.rekorde);
  ok(schmuckBlatt.serien === 0 || schmuckBlatt.mitLauf === schmuckBlatt.serien,
     'jedes Serien-Blatt zeigt den Lauf',
     schmuckBlatt.mitLauf + ' von ' + schmuckBlatt.serien);

  // ── Die Chronik-Matrix: kein Kuerzel wird abgeschnitten ─────────────
  //    Die Zelle ist 60 px breit und laesst dem Kuerzel 54. Drei Kuerzel
  //    liefen darueber und standen als „Ohne Lüc…" in der Tafel, zwei weitere
  //    waren im Katalog schon mitten im Wort abgeschnitten („Nervenkitz").
  //    Gezaehlt wird nicht in Zeichen — „Umschwung" ist kuerzer als
  //    „Nachzügler" und breiter —, sondern die gerenderte Breite des Textes
  //    gegen die des Kastens. scrollWidth taugt dafuer nicht: er rundet auf
  //    ganze Pixel, und „Augenhöhe" ragte um ein Viertel Pixel heraus.
  // ── Die Zahlenreihe im Chronik-Blatt laeuft nicht ueber ─────────────
  //    Vier gleich breite Zellen, und in einer steht „Schattenseite": als
  //    18-px-Archivo lief das Wort ueber seine Zelle hinaus in die daneben,
  //    in der der Ausschlag steht. Gemessen wird die gerenderte Breite des
  //    Textes gegen die des Kastens — in Zeichen gezaehlt sagte es nichts:
  //    „legendär" ist neun Zeichen und passt, „Konstanz" acht und passt
  //    knapper.
  console.log('\n═══ DIE ZAHLENREIHE DER CHRONIK ═══');
  const zahlen = await page.evaluate(() => {
    const box = document.createElement('div');
    box.style.width = '430px';
    document.body.appendChild(box);
    const K = window.__k.eval.bind(window.__k);
    // Jede Chronik des Katalogs, nicht nur die, die heute jemand haelt.
    const ids = K('SEASON_TITLES.map(t => t.id)');
    box.innerHTML = ids.map(id =>
      K('_chronFaktenHtml(SEASON_TITLE_BY_ID[' + JSON.stringify(id) + '])')).join('');
    const zu = [];
    box.querySelectorAll('.rcp-z-v').forEach(e => {
      const r = document.createRange(); r.selectNodeContents(e);
      const tw = r.getBoundingClientRect().width;
      const cw = e.getBoundingClientRect().width;
      if(tw > cw + 0.01) zu.push(e.textContent.trim() + ' (' + tw.toFixed(1) + '>' + cw.toFixed(1) + ')');
    });
    const n = box.querySelectorAll('.rcp-z-v').length;
    box.remove();
    return {zu, n};
  });
  ok(zahlen.n > 0, 'die Zahlenreihe der Chronik wird gebaut', zahlen.n + ' Zellen');
  ok(zahlen.zu.length === 0, 'kein Wert laeuft ueber seine Zelle',
     zahlen.zu.slice(0, 3).join(', ') || 'keiner');

  console.log('\n═══ DIE CHRONIK-MATRIX ═══');
  const matrix = await page.evaluate(() => {
    const box = document.createElement('div');
    box.style.width = '430px';
    document.body.appendChild(box);
    box.innerHTML = window.__k.eval('ligaChronikMatrixHtml()');
    const zu = [];
    box.querySelectorAll('.lc-cell .n').forEach(e => {
      const r = document.createRange(); r.selectNodeContents(e);
      const tw = r.getBoundingClientRect().width;
      const cw = e.getBoundingClientRect().width;
      if(tw > cw + 0.01) zu.push(e.textContent.trim() + ' (' + tw.toFixed(1) + '>' + cw.toFixed(1) + ')');
    });
    // Das Gewicht der Klasse: dieselbe Farbe in drei Staerken [§C39].
    const grund = k => {
      const el = box.querySelector('.lc-cell[data-kl="' + k + '"]');
      if(!el) return null;
      const m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      return m ? +(m[3] === undefined ? 1 : m[3]) : null;
    };
    const zellen = box.querySelectorAll('.lc-cell').length;
    const ohneKlasse = [...box.querySelectorAll('.lc-cell')].filter(e => !e.dataset.kl).length;
    const r = {zu, zellen, ohneKlasse,
               leg:grund('legendaer'), sel:grund('selten'), bes:grund('besonders')};
    box.remove();
    return r;
  });
  ok(matrix.zellen > 0, 'die Matrix zeigt Zellen', matrix.zellen + ' Zellen');
  ok(matrix.zu.length === 0, 'kein Kuerzel wird in der Matrix abgeschnitten',
     matrix.zu.join(' | '));
  ok(matrix.ohneKlasse === 0, 'jede Zelle traegt die Klasse ihrer Chronik',
     matrix.ohneKlasse + ' ohne');
  // Alle drei Stufen, nicht nur die Enden: mit nur „legendaer > besonders"
  // blieb die Zusicherung gruen, als die legendaere Regel ganz fehlte — die
  // besondere allein reichte fuer den Vergleich.
  ok(matrix.leg !== null && matrix.sel !== null && matrix.bes !== null,
     'alle drei Klassen stehen in der Matrix',
     'legendaer ' + matrix.leg + ' selten ' + matrix.sel + ' besonders ' + matrix.bes);
  ok(matrix.leg > matrix.sel && matrix.sel > matrix.bes,
     'je seltener die Chronik, desto staerker leuchtet ihre Zelle',
     'legendaer ' + matrix.leg + ' > selten ' + matrix.sel + ' > besonders ' + matrix.bes);

  console.log('\n═══ CHRONIK-PRESTIGE IST NACHVOLLZIEHBAR ═══');
  const chronRechnung = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const daten = JSON.parse(K(`JSON.stringify((function(){
      const T=prestigeTabelle();
      for(const pid of T.rang){
        const qs=(prestigeOf(pid).quellen||[]).filter(q=>q.q==='monat');
        const q=qs.find(x=>x.staffel>1)||qs[0];
        if(q) return {pid,id:q.id,basis:q.grundwert,beitrag:q.p,rang:q.rang,staffel:q.staffel};
      }
      return null;
    })())`));
    if(!daten) return {fehlt:true,text:''};
    K('showLaufbahn(' + JSON.stringify(daten.pid) + ')');
    await new Promise(r => requestAnimationFrame(r));
    const gruppen=[...document.querySelectorAll('#sheet .lb-grp')];
    const grp=gruppen.find(e => /Monatschroniken/.test(e.textContent||''));
    const regelKnopf=document.querySelector('#sheet [data-prestige-regeln]');
    const regelHinweis=regelKnopf ? (regelKnopf.textContent||'').replace(/\s+/g,' ').trim() : '';
    const sport=/Sportliche Leistung/.test((document.querySelector('#sheet')||{}).textContent||'');
    if(regelKnopf){ regelKnopf.click(); await new Promise(r=>setTimeout(r,560)); }
    const regeln=[...document.querySelectorAll('#sheet .lb-regeln span')]
      .map(e=>(e.textContent||'').replace(/\s+/g,' ').trim());
    const regelHoehen=[...document.querySelectorAll('#sheet .lb-regeln span')]
      .map(e=>Math.round(e.getBoundingClientRect().height));
    return Object.assign({},daten,{
      text:grp ? grp.textContent.replace(/\s+/g,' ').trim() : '',
      regeln, regelHinweis, regelHoehen,
      regelTitel:(document.querySelector('#sheet h3')||{}).textContent||'',
      sport
    });
  });
  ok(!chronRechnung.fehlt && /Chronikwert/.test(chronRechnung.text),
     'das Laufbahnblatt nennt den unverkuerzten Chronik-Wert',
     chronRechnung.text.slice(0,180));
  ok(chronRechnung.rang === 1 || new RegExp(chronRechnung.rang + '\\. Chronik.*√' + chronRechnung.staffel).test(chronRechnung.text),
     'eine Wiederholung zeigt knapp ihre Herunterrechnung',
     chronRechnung.text.slice(0,220));
  ok(chronRechnung.regeln.length === 3
     && chronRechnung.regeln.every(x=>/\d+.*%/.test(x) && /nie 0/.test(x))
     && chronRechnung.regeln.every(x=>!/min\./.test(x)),
     'das Regel-Popup zeigt Legendary, Rare und Common nebeneinander',
     chronRechnung.regeln.join(' · '));
  ok(/Wie die Punkte entstehen/.test(chronRechnung.regelHinweis)
     && /Wert der Auszeichnungen/.test(chronRechnung.regelTitel),
     'die cleaner gehaltene Aufschlüsselung öffnet ihre Erklärung im Popup',
     chronRechnung.regelHinweis + ' → ' + chronRechnung.regelTitel);
  ok(chronRechnung.regelHoehen.length === 3
     && chronRechnung.regelHoehen.every(h=>h >= 140),
     'die drei Regelkarten haben genug vertikalen Leseraum',
     chronRechnung.regelHoehen.join(' / ') + ' px');
  ok(!chronRechnung.sport,
     'das Laufbahnblatt enthält keinen separaten Block für sportliche Leistung');

  console.log('\n═══ ROLLEN UND POSITIONSSTRAHL ═══');
  await page.setViewportSize({width:360, height:820});
  const rollen = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const ids = K('players.filter(p=>!p.hidden).map(p=>p.id)');
    const out = [];
    for(const pid of ids){
      K('showPlayer(' + JSON.stringify(pid) + ')');
      await new Promise(r => requestAnimationFrame(r));
      const root = document.querySelector('#sheet .pp-root');
      const cards = root ? [...root.querySelectorAll('.pp-rd')].filter(e => e.querySelector('.pp-rd-meta')) : [];
      const wr = cards.map(e => +(e.querySelector('.pp-rd-wr')||{}).childNodes[0]?.textContent || 0);
      const pos = root && root.querySelector('.pp-posprof');
      const slider = pos && pos.querySelector('.pp-slider');
      const fill = pos && pos.querySelector('.pp-fill');
      const sb = slider && slider.getBoundingClientRect(), fb = fill && fill.getBoundingClientRect();
      let ursprung = true;
      if(pos && sb && fb){
        if(pos.classList.contains('atk-seite')) ursprung = Math.abs(fb.left-sb.left) <= 1.5;
        else if(pos.classList.contains('def-seite')) ursprung = Math.abs(fb.right-sb.right) <= 1.5;
        else ursprung = Math.abs((fb.left+fb.right)/2-(sb.left+sb.right)/2) <= 1.5;
      }
      const rr = root && root.getBoundingClientRect();
      const pruef = root ? [...root.querySelectorAll('.pp-pos-combined,.pp-posprof')] : [];
      const spill = rr ? pruef.reduce((mx,e) => { const b=e.getBoundingClientRect();
        return Math.max(mx, b.right-rr.right, rr.left-b.left); }, 0) : 999;
      const def = cards.find(e=>e.classList.contains('def'));
      const probe = document.createElement('i');
      if(root){ probe.style.color='var(--ak)'; root.appendChild(probe); }
      out.push({pid, wr, cls:cards.map(e=>e.className), seite:pos ?
        (pos.classList.contains('atk-seite')?'atk':pos.classList.contains('def-seite')?'def':'neutral') : '',
        ursprung, overflow:spill,
        op:cards.map(e=>+getComputedStyle(e).opacity),
        schatten:cards.map(e=>getComputedStyle(e.querySelector('.pp-rd-ring')).boxShadow),
        textSchatten:cards.map(e=>getComputedStyle(e.querySelector('.pp-rd-wr')).textShadow),
        defFarbe:def ? getComputedStyle(def.querySelector('.pp-rd-lbl')).color : '',
        rangFarbe:root ? getComputedStyle(probe).color : ''});
      probe.remove();
    }
    K('closeSheet && closeSheet()');
    return out;
  });
  const beide = rollen.filter(r => r.wr.length === 2);
  const rollenFalsch = beide.filter(r => {
    const nah = Math.abs(r.wr[0]-r.wr[1]) <= 3;
    if(nah) return !r.cls.every(c => / neutral/.test(c));
    const hi = r.wr[0] > r.wr[1] ? 0 : 1, lo = 1-hi;
    return !/ stark/.test(r.cls[hi]) || !/ schwach/.test(r.cls[lo])
      || !(r.op[hi] > r.op[lo]) || r.schatten[hi] === 'none';
  });
  ok(beide.length > 0 && rollenFalsch.length === 0,
     'starke, schwache und nahezu gleiche Rollen sind eindeutig gewichtet',
     rollenFalsch.map(r=>r.pid).join(', ') || beide.length + ' Profile');
  ok(beide.every(r => r.op.every((op,i) => !/ schwach/.test(r.cls[i]) || op >= .7)
       && r.textSchatten.every((sh,i) => !/ stark/.test(r.cls[i]) || sh === 'none')),
     'die Nebenrolle bleibt lesbar und die starke Rolle leuchtet nicht weiss aus');
  ok(beide.every(r => !r.defFarbe || r.defFarbe === r.rangFarbe),
     'auch Abwehrdominanz behaelt die Rangfarbe',
     beide.filter(r=>r.defFarbe!==r.rangFarbe).map(r=>r.pid).join(', ') || beide.length + ' Profile');
  ok(['atk','def','neutral'].every(s => rollen.some(r => r.seite === s)),
     'der Positionsstrahl deckt Sturm, Abwehr und Flex ab',
     [...new Set(rollen.map(r=>r.seite))].join(', '));
  ok(rollen.every(r => r.ursprung),
     'jeder Strahl startet an der inhaltlich richtigen Seite');
  ok(rollen.every(r => r.overflow <= 1),
     'das Profil bleibt bei 360 px ohne horizontalen Ueberlauf',
     Math.max(...rollen.map(r=>r.overflow)).toFixed(1) + ' px');
  await page.setViewportSize({width:430, height:932});

  // ── Die Leiter im Blatt traegt die echten Zeichen ──────────────────
  //    Sie zeigte fuenf CSS-Kreise (`repeating-conic-gradient`) — fuenf
  //    Rosetten in fuenf Farben, wo Reif, Schildring, Volutenkranz,
  //    Lorbeerreif und Ordensstern stehen muessten. Ein Platzhalter, der mit
  //    dem Zeichen, das ein Spieler traegt, nichts zu tun hatte.
  console.log('\n═══ DIE LEITER IM BLATT ═══');
  const leiter = await page.evaluate(() => {
    const pids = window.__k.eval('players.filter(p=>!p.hidden).map(p=>p.id)');
    const box = document.createElement('div');
    box.style.width = '430px';
    document.body.appendChild(box);
    let mit = 0, ohne = 0, kleinste = 999, stufen = 0;
    pids.forEach(pid => {
      const h = window.__k.eval('_newsLeiter(' + JSON.stringify(pid) + ')');
      if(!h) return;
      box.innerHTML = h;
      const felder = box.querySelectorAll('.nf-lt-p');
      if(!felder.length) return;
      stufen = felder.length;
      felder.forEach(f => {
        if(f.querySelector('svg.ins')) mit++; else ohne++;
        const r = f.getBoundingClientRect();
        if(r.width < kleinste) kleinste = r.width;
      });
    });
    box.remove();
    return {mit, ohne, kleinste, stufen};
  });
  ok(leiter.mit > 0, 'die Leiter zeichnet ueberhaupt etwas', leiter.mit + ' Felder');
  ok(leiter.ohne === 0, 'jedes Feld der Leiter traegt sein echtes Zeichen',
     leiter.ohne + ' Felder ohne Zeichen');
  ok(leiter.stufen === 7, 'die Leiter zeigt alle sieben Stufen', leiter.stufen + ' Felder');
  // Unter 40 px bleibt vom Schildring ein Ring. Bei 28 px war er von der
  // blanken Stufe nicht zu unterscheiden, gemessen an der Zeichnung.
  ok(leiter.kleinste >= 40, 'ein Feld der Leiter ist mindestens 40 px breit',
     leiter.kleinste + ' px');

  // ── Der Schlitten deckt die Wahl, und er fährt [§C27] ────────────
  // Die Wahl eines Segmentwählers war ein Knopf, der die Farbe wechselt,
  // und zwischen zwei Wahlen sprang sie. Jetzt gleitet eine Fläche (außen)
  // oder ein Strich (innen) zum gewählten Segment. Lage und Breite rechnet
  // das CSS aus :has(); stimmt die Rechnung nicht, steht der Schlitten
  // neben dem Wort, und das sieht niemand an einem einzelnen Bild.
  console.log('\n═══ SCHLITTEN ═══');
  await page.setViewportSize({width:360, height:780});
  const schlitten = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const f = [];
    let gemessen = 0;
    const warte = () => new Promise(r => setTimeout(r, 420));
    for(const setz of ["tab='ranking';period='season';ligaSicht='duos'", "ligaSicht='spieler'", "period='week'",
        "period='all';rankMetric='winrate'", "tab='awards';awView='rekorde'", "awView='awards';awPeriod='week'",
        "awPeriod='season';tab='teams'", "tab='positions';rankMetric='def'"]){
      K(setz + ';render()');
      await warte();
      document.querySelectorAll('#main .ui-switch:not(.roll), #main .ui-tabs:not(.roll)').forEach(w => {
        const on = w.querySelector(':scope > button.on'); if(!on) return;
        const aussen = w.classList.contains('ui-switch');
        const cs = getComputedStyle(w, aussen ? '::before' : '::after');
        const links = parseFloat(cs.left) + new DOMMatrix(cs.transform).m41, breite = parseFloat(cs.width);
        const mitte = links + breite / 2, soll = on.offsetLeft + on.offsetWidth / 2;
        gemessen++;
        if(Math.abs(mitte - soll) > 1.5 || (aussen && Math.abs(breite - on.offsetWidth) > 1.5))
          f.push(setz + ': „' + on.textContent.trim() + '" ' + Math.round(mitte) + ' statt ' + Math.round(soll));
      });
    }
    // Nach dem Tipp zeichnet die Ansicht neu — der Schlitten muss trotzdem
    // dort anfangen, wo er stand, sonst springt er.
    K("tab='ranking';period='season';render()");
    await warte();
    const ziel = document.querySelector('#main .ui-switch [data-period="all"]');
    ziel.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
    ziel.click();
    // Die Bedienung zeigt zuerst ihre Rückmeldung und zeichnet dann die
    // neue Ansicht. Der Beobachter wartet genau auf deren Fertigmeldung,
    // nicht eine feste Zeit, die schon das Gleiten verstreichen ließe.
    await new Promise(resolve => {
      const main = document.getElementById('main');
      if(main.getAttribute('aria-busy') !== 'true'){ resolve(); return; }
      const horch = new MutationObserver(() => {
        if(main.getAttribute('aria-busy') === 'true') return;
        horch.disconnect(); resolve();
      });
      horch.observe(main, {childList:true, attributes:true, attributeFilter:['aria-busy']});
    });
    const w2 = document.querySelector('#main .ui-switch');
    const anfang = getComputedStyle(w2, '::before');
    const start = parseFloat(anfang.left) + new DOMMatrix(anfang.transform).m41;
    await warte();
    const fertig = getComputedStyle(w2, '::before');
    const ende = parseFloat(fertig.left) + new DOMMatrix(fertig.transform).m41;
    // Die Tage des Monats als Zellen: so viele, wie der Monat hat, und der
    // heutige gerahmt.
    K("period='season';render()");
    const t = (document.querySelector('#main .lauf-t') || {}).textContent || '';
    const [, jetzt, gesamt] = (t.match(/(\d+)\s*von\s*(\d+)/) || []).map(Number);
    const zellen = [...document.querySelectorAll('#main .lauf-z i')];
    const heute = zellen.findIndex(z => z.classList.contains('h')) + 1;
    const gespielt = zellen.filter(z => z.classList.contains('s')).length;
    const tage = new Set(K("matchesInPeriod('season').map(m=>tagKey(m.created_at))")).size;
    return {f, gemessen, start, ende, zellen:zellen.length, gesamt, jetzt, heute, gespielt, tage};
  });
  ok(schlitten.f.length === 0 && schlitten.gemessen >= 12, 'der Schlitten jedes Wählers steht unter der Wahl',
     schlitten.f.slice(0, 4).join(' · ') || schlitten.gemessen + ' Wähler');
  ok(schlitten.ende - schlitten.start > 40, 'der Schlitten gleitet nach dem Neuzeichnen, statt zu springen',
     Math.round(schlitten.start) + ' → ' + Math.round(schlitten.ende) + ' px');
  ok(schlitten.zellen === schlitten.gesamt && schlitten.heute === schlitten.jetzt && schlitten.gespielt === schlitten.tage,
     'der Monat steht als Zellen: jeder Tag eine, der heutige gerahmt, jeder Spieltag hell',
     schlitten.zellen + ' Zellen · ' + schlitten.gesamt + ' Tage · heute ' + schlitten.heute + '/' + schlitten.jetzt
     + ' · ' + schlitten.gespielt + ' von ' + schlitten.tage + ' Spieltagen');
  await page.emulateMedia({reducedMotion: 'reduce'});
  const schlittenRuhig = await page.evaluate(() => {
    const w = document.querySelector('#main .ui-switch');
    return getComputedStyle(w, '::before').transitionDuration;
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(/^0s(, 0s)*$/.test(schlittenRuhig), 'bei prefers-reduced-motion springt der Schlitten', schlittenRuhig);

  // ── Jeder Reiter bei 360 px ──────────────────────────────────────
  // Gemessen wurde bisher je Bauteil, und damit fiel durch, was zwischen
  // zwei Bauteilen liegt: der Knopf „Neu laden" trug die volle Breite von
  // `.btn` und lief 112 px aus den Einstellungen, eine Pille der Rekorde lief
  // aus der Karte, und ein Gesicht ohne eigenen Behälter hatte seine
  // Initialen oben links. Hier wird jeder Reiter einmal ganz gezeichnet.
  console.log('\n═══ LICHT, DAS DIE GRAFIKKARTE RECHNET ═══');
  // Die Effekte [§C27]: ein Lichtband im Metall über Platz 1 bis 3, der
  // Einlauf der Zeilen und Kacheln, Hof, Stoß und Lichtzug am Reiter, das
  // Blatt, das sich setzt, Hof und Lichtzug im Profilkopf. Jeder bewegt nur
  // `transform` und `opacity`, keiner bleibt mit einer Verschiebung stehen,
  // und bei Bewegungsruhe läuft keiner. Die Striche links an Platz 1 bis 3
  // sind weg: auf dem Telefon wirkten sie wie ein Fehler.
  const lichtMess = () => page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const bild = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const props = a => [...new Set(a.effect.getKeyframes().flatMap(k => Object.keys(k))
      .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)))];
    const out = {};
    K("closeSheet(true);tab='ranking';period='season';render()"); await bild();
    const tops = [...document.querySelectorAll('#main .rlist > .rrow.top1, #main .rlist > .rrow.top2, #main .rlist > .rrow.top3')];
    out.striche = tops.map(r => getComputedStyle(r, '::before').content).filter(c => c && c !== 'none' && c !== 'normal').length;
    const zug = document.getAnimations().filter(a => a.animationName === 'glanzZug' && a.effect.target.closest && a.effect.target.closest('#main .rrow'));
    out.zug = zug.length;
    out.zugZiel = zug.map(a => (a.effect.target.closest('.rrow').className.match(/top\d/) || ['?'])[0]).sort().join(' ');
    const bahn = tops.length ? tops[0].querySelector(':scope > .glanz-bahn') : null;
    out.zugUnter = bahn ? getComputedStyle(bahn).zIndex + '/' + getComputedStyle(tops[0]).isolation : 'fehlt';
    const zeile = document.querySelector('#main .rlist > .rrow');
    out.ein = zeile ? getComputedStyle(zeile).animationName : 'fehlt';
    out.einFuell = zeile ? getComputedStyle(zeile).animationFillMode : 'fehlt';
    const dreizehn = document.querySelector('#main .rlist > .rrow:nth-child(13)');
    out.einDreizehn = dreizehn ? getComputedStyle(dreizehn).animationName : 'none';
    // Was im ganzen Dokument endlos läuft, bewegt nur transform und opacity.
    out.endlosFremd = [...new Set(document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity)
      .flatMap(a => props(a).filter(k => k !== 'transform' && k !== 'opacity').map(k => a.animationName + ':' + k)))];
    const nav = document.querySelector('[data-nav="awards"]');
    nav.click(); await bild();
    const on = document.querySelector('.botnav button.on .ic');
    out.stoss = on ? getComputedStyle(on.querySelector('svg')).animationName : 'fehlt';
    out.pille = on ? getComputedStyle(on, '::after').animationName : 'fehlt';
    // Der Hof blendet in 0,3 s über; gemessen wird der Endstand.
    await new Promise(r => setTimeout(r, 400));
    out.hof = getComputedStyle(document.querySelector('.botnav button.on'), '::before').opacity;
    out.hofAus = getComputedStyle(document.querySelector('.botnav button:not(.on)'), '::before').opacity;
    K("tab='awards';awView='awards';awPeriod='season';render()"); await bild();
    const kachel = document.querySelector('#main .aw-trophy');
    out.kachel = kachel ? getComputedStyle(kachel).animationName : 'fehlt';
    out.kachelFuell = kachel ? getComputedStyle(kachel).animationFillMode : 'fehlt';
    const zk = document.querySelector('#main .aw-trophy .aw-t-kopf .zk');
    out.glanz = zk ? getComputedStyle(zk, '::after').animationName : 'fehlt';
    K("awView='rekorde';render()"); await bild();
    const rek = document.querySelector('#main .rek');
    out.rek = rek ? getComputedStyle(rek).animationName : 'fehlt';
    K("tab='ranking';render();showPlayer(players[0].id)"); await bild();
    const sheet = document.getElementById('sheet');
    const kind = sheet.querySelector(':scope > :not(.sheet-leiste)');
    out.setzen = kind ? getComputedStyle(kind).animationName : 'fehlt';
    out.setzenFuell = kind ? getComputedStyle(kind).animationFillMode : 'fehlt';
    out.leiste = getComputedStyle(sheet.querySelector('.sheet-leiste')).animationName;
    const kopf = sheet.querySelector('.pp-header');
    out.kopfHof = kopf ? getComputedStyle(kopf, '::before').animationName : 'fehlt';
    out.kopfZug = kopf ? getComputedStyle(kopf, '::after').animationName : 'fehlt';
    out.kopfHinten = kopf ? getComputedStyle(kopf, '::before').zIndex + '/' + getComputedStyle(kopf, '::after').zIndex + '/' + getComputedStyle(kopf).isolation : 'fehlt';
    out.unterBlatt = document.getAnimations().filter(a => a.animationName === 'glanzZug' && a.effect.target.closest && a.effect.target.closest('#main .rrow')).map(a => a.playState).join(',');
    await new Promise(r => setTimeout(r, 1900));
    out.setzenDanach = kind ? getComputedStyle(kind).transform : 'fehlt';
    K('closeSheet(true)'); await bild();
    K("tab='ranking';render()"); await new Promise(r => setTimeout(r, 900));
    out.einDanach = [...document.querySelectorAll('#main .rlist > .rrow')].slice(0, 12).map(r => getComputedStyle(r).transform).filter(t => t !== 'none').length;
    return out;
  });
  const li = await lichtMess();
  ok(li.striche === 0, 'Platz 1 bis 3 tragen keinen Strich an der Kante', li.striche + ' Striche');
  ok(li.zug === 3 && li.zugZiel === 'top1 top2 top3',
     'über Platz 1, 2 und 3 fährt je ein Lichtband in ihrem Metall', li.zug + ' · ' + li.zugZiel);
  ok(li.zugUnter === '-1/isolate', 'das Lichtband liegt unter Name und Zahl', li.zugUnter);
  ok(!li.endlosFremd.length, 'was in der App endlos läuft, bewegt nur transform und opacity', li.endlosFremd.join(', '));
  ok(li.unterBlatt === 'paused,paused,paused', 'unter einem offenen Blatt steht das Licht still', li.unterBlatt);
  ok(li.ein === 'einlaufen' && li.einFuell === 'backwards' && li.einDreizehn === 'none',
     'die ersten zwölf Zeilen laufen beim Zeichnen ein, die übrigen stehen', JSON.stringify([li.ein, li.einFuell, li.einDreizehn]));
  ok(li.einDanach === 0, 'nach dem Einlauf trägt keine Zeile eine Verschiebung', li.einDanach + ' verschoben');
  ok(li.stoss === 'reiterStoss' && li.pille === 'pilleZug' && li.hof === '1' && li.hofAus === '0',
     'der gewählte Reiter bekommt Hof, Stoß und Lichtzug, die anderen nicht', JSON.stringify([li.stoss, li.pille, li.hof, li.hofAus]));
  ok(li.kachel === 'einlaufen' && li.kachelFuell === 'backwards' && li.rek === 'einlaufen',
     'Award- und Rekordkacheln laufen beim Zeichnen ein und lassen den Druck frei',
     JSON.stringify([li.kachel, li.kachelFuell, li.rek]));
  ok(li.glanz === 'zeichenGlanz', 'über das Zeichen der Kachel läuft ein Glanz', li.glanz);
  ok(li.setzen === 'blattSetzen' && li.setzenFuell === 'backwards' && li.leiste === 'none',
     'der Inhalt eines Blatts setzt sich, die Leiste mit Griff und Schließen nicht', JSON.stringify([li.setzen, li.setzenFuell, li.leiste]));
  ok(li.setzenDanach === 'none', 'danach trägt kein Abschnitt eine Verschiebung', li.setzenDanach);
  ok(li.kopfHof === 'hofAuf' && li.kopfZug === 'kopfZug' && li.kopfHinten === '-1/-1/isolate',
     'im Profilkopf gehen Hof und Lichtzug auf, hinter Name und Wappen', li.kopfHof + ' · ' + li.kopfZug + ' · ' + li.kopfHinten);
  // Gemessen, nicht geschätzt: über einen Umlauf des Lichts rechnet der
  // Hauptthread keinen Stil und kein Layout neu.
  {
    await K("closeSheet(true);tab='ranking';period='season';render()");
    // Erst ausklingen lassen, was einmal läuft: das Zuschieben des Blatts,
    // der Einlauf und die Überblendung des Reiters rechnen selbst Stil.
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrik = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
    const a = await metrik(); await page.waitForTimeout(2500); const b = await metrik();
    const stil = b.RecalcStyleCount - a.RecalcStyleCount, lay = b.LayoutCount - a.LayoutCount;
    ok(stil === 0 && lay === 0, 'während das Licht läuft, rechnet der Hauptthread weder Stil noch Layout', stil + ' Stil, ' + lay + ' Layout in 2,5 s');
    await cdp.detach();
  }
  await page.emulateMedia({reducedMotion: 'reduce'});
  const liRuhig = await lichtMess();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(liRuhig.zug === 0 && liRuhig.ein === 'none' && liRuhig.stoss === 'none' && liRuhig.pille === 'none' && liRuhig.kachel === 'none'
     && liRuhig.glanz === 'none' && liRuhig.setzen === 'none' && liRuhig.kopfHof === 'none' && liRuhig.kopfZug === 'none',
     'bei prefers-reduced-motion läuft keiner dieser Effekte',
     JSON.stringify([liRuhig.zug, liRuhig.ein, liRuhig.stoss, liRuhig.pille, liRuhig.kachel, liRuhig.glanz, liRuhig.setzen, liRuhig.kopfHof, liRuhig.kopfZug]));

  console.log('\n═══ JEDER REITER BEI 360 PX ═══');
  await page.setViewportSize({width:360, height:780});
  // Gemessen bei 360 px, der schmalsten verbreiteten Breite: bei 390 passte
  // „Unaufhaltsam" gerade noch, bei 360 brach es mitten im Wort.
  await page.setViewportSize({width: 360, height: 780});
  const reiter = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const sichten = [
      ['Liga', "tab='ranking';period='season'"], ['Liga gesamt', "period='all'"],
      ['Liga Woche', "period='week'"], ['Liga Tag', "period='day'"],
      ['Positionen Sturm', "period='season';tab='positions';rankMetric='atk'"],
      ['Positionen Abwehr', "rankMetric='def'"],
      ['Awards', "tab='awards';awView='awards';awPeriod='season'"], ['Awards Woche', "awPeriod='week'"],
      ['Rekorde', "awPeriod='season';awView='rekorde'"], ['Chronik', "awView='chronik'"],
      ['Teams', "awView='awards';tab='teams'"], ['Verlauf', "tab='history'"],
      ['Match', "tab='match'"], ['Einstellungen', "tab='settings'"]];
    const W = document.documentElement.clientWidth, out = [];
    for(const [name, setz] of sichten){
      K(setz + ';render()');
      await new Promise(r => requestAnimationFrame(r));
      const raus = [], schief = [];
      document.querySelectorAll('#main *').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width || !r.height) return;
        let p = el.parentElement, scroller = false;
        while(p && p.id !== 'main'){ const cs = getComputedStyle(p);
          if(/(auto|scroll|hidden|clip)/.test(cs.overflowX)){ scroller = true; break; } p = p.parentElement; }
        if(!scroller && (r.right > W + 1 || r.left < -1))
          raus.push(el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' bis ' + Math.round(r.right));
      });
      document.querySelectorAll('#main .av').forEach(av => {
        const t = [...av.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if(!t) return;
        const rg = document.createRange(); rg.selectNodeContents(t);
        const a = av.getBoundingClientRect(), b = rg.getBoundingClientRect();
        if(Math.abs((a.left+a.right)/2 - (b.left+b.right)/2) > 2.5
          || Math.abs((a.top+a.bottom)/2 - (b.top+b.bottom)/2) > 3)
          schief.push(t.textContent.trim());
      });
      const fab = document.getElementById('fab');
      // Eine Dezimalzahl trägt ein Komma [§C27] — „4.00 Gegentore" stand in
      // der Betonmauer, „Ø 8.8" in der Positionsliste. Ein Datum („26.08.")
      // und die Version fallen durch den Ausschluss nach der Zahl heraus.
      const punkt = (document.getElementById('main').innerText
        .match(/(^|[^\d.,])\d{1,3}\.\d{1,2}(?![\d.])/g) || []).map(x => x.trim());
      // Eine Bilanz bricht nicht um, und die Torzeile der Positionen wird
      // nicht abgeschnitten: gemessen stand „81–" über „40", und „Ø 8.8 T…"
      // endete mitten im Wort.
      const bruch = [...document.querySelectorAll('#main .rmeta > span:first-child')]
        .filter(e => { const rg = document.createRange(); rg.selectNodeContents(e);
          return new Set([...rg.getClientRects()].map(r => Math.round(r.top))).size > 1; })
        .map(e => e.textContent);
      [...document.querySelectorAll('#main .rmeta-tore')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push(e.textContent));
      // Ein Reiter, dessen Wort abgeschnitten ist, sagt nicht, wonach er
      // sortiert: in der Ewigen Tafel standen „Siegq…" und „Torbil…".
      [...document.querySelectorAll('#main .ui-tabs button, #main .ui-switch button')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Reiter ' + e.textContent.trim()));
      // Ebenso der Name einer Award-Kachel: „Längste Siegesser…".
      [...document.querySelectorAll('#main .aw-t-lbl')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Kachel ' + e.textContent.trim()));
      // Und kein Wort darin bricht mitten durch: `overflow-wrap` verhindert
      // den Überlauf, den die Zeile darüber misst, und brach dafür
      // „Unaufhaltsa|m" und „Unzertren|nlich" — ohne Trennstrich, weil das
      // Telefon nicht jede Sprache trennen kann.
      [...document.querySelectorAll('#main .aw-t-lbl')].forEach(e => {
        const t = e.firstChild; if(!t || t.nodeType !== 3) return;
        // Nach einem Bindestrich darf die Zeile umbrechen: „Underdog-|Held".
        let i = 0;
        t.textContent.split(/[ -]/).forEach(w => {
          const rg = document.createRange(); rg.setStart(t, i); rg.setEnd(t, i + w.length); i += w.length + 1;
          if(w && new Set([...rg.getClientRects()].map(r => Math.round(r.top))).size > 1) bruch.push('Kachel ' + w + ' bricht');
        });
      });
      // Und die Nebenwertungen der Liga: „Längste Siege…", „4× Player of t…".
      [...document.querySelectorAll('#main .wk-hl-label, #main .wk-hl-detail')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).forEach(e => bruch.push('Nebenwertung ' + e.textContent.trim()));
      out.push({name, bruch:bruch.slice(0,3), punkt:punkt.slice(0,3), raus:[...new Set(raus)].slice(0,4), schief:schief.slice(0,4),
        fab: fab ? getComputedStyle(fab).display : ''});
    }
    K("tab='ranking';period='season';rankMetric='elo';awView='awards';render()");
    return out;
  });
  await page.setViewportSize({width: 390, height: 844});
  const reiterRaus = reiter.filter(r => r.raus.length);
  ok(reiterRaus.length === 0, 'kein Reiter läuft bei 360 px aus dem Bildschirm',
     reiterRaus.map(r => r.name + ': ' + r.raus.join(', ')).join(' | ') || reiter.length + ' Reiter');
  const reiterSchief = reiter.filter(r => r.schief.length);
  ok(reiterSchief.length === 0, 'jedes Gesicht trägt seine Initialen in der Mitte',
     reiterSchief.map(r => r.name + ': ' + r.schief.join(', ')).join(' | ') || 'alle mittig');
  const reiterBruch = reiter.filter(r => r.bruch.length);
  ok(reiterBruch.length === 0 && reiter.some(r => r.name === 'Positionen Sturm'),
     'Bilanz, Torzeile, Reiter und Kachelnamen stehen ungekürzt auf einer Zeile',
     reiterBruch.map(r => r.name + ': ' + r.bruch.join(', ')).join(' | ') || 'alle einzeilig');
  // Dieselbe Frage für die Blätter, die Zahlen mit Nachkommastelle zeigen.
  let blattPunkt = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    const blaetter = [['Profil', 'showPlayer(' + P('Leon') + ')'],
      ['Duo', 'showTeam(' + P('Leon') + ',' + P('Maxi') + ')'],
      // Leo und Maxi haben zwei Aufstellungen, die nebeneinander stehen.
      ['Duo mit zwei Aufstellungen', 'showTeam(' + P('Leo') + ',' + P('Maxi') + ')'],
      ['Partie', 'showMatchDetail(matches[matches.length-1].id)'],
      ['Vergleich', 'showH2H(' + P('Leon') + ',' + P('Martin') + ')'],
      ['Torjäger', "showAward('scorer')"], ['Betonmauer', "showAward('concreteWall')"],
      ['Wochenkönig', "period='week';openTopList('periodKing')"],
      ['Woche', 'showPotwRecap({force:true})'], ['Saison', 'showSeasonRecap(seasons[2])'],
      ['Laufbahn', 'showLaufbahn(' + P('Maxi') + ')'], ['Feed', 'openNewsFeed(); _newsFeedRest()'],
      ['Positionsverlauf', 'showPositionHistory(seasons[3].id)'],
      ['Liga-Chronik', 'showLigaChronik()'], ['Rangsystem', 'showRangSystem()'],
      ['Bilanzen', 'showPlayerH2HList(' + P('Leon') + ')'],
      ['Saisons', 'showPlayerSeasons(' + P('Leon') + ')'],
      ['Regeln', 'showPrestigeRegeln(' + P('Leon') + ')'],
      ['Auszeichnungen', 'showPlayerBadges(' + P('Jane') + ')'],
      ['Monatstafel', "showSeasonTable('2026-08')"], ['Rekord', 'showChronicle(CHRONICLES[0].id)'],
      ['Tag', 'showPotdRecap({force:true})'],
      ['Spieler bearbeiten', 'showEditPlayer(' + P('Leon') + ')'],
      ['Partie bearbeiten', 'showEditMatch(matches[matches.length-1].id)'],
      ['Neuer Spieler', 'showAddPlayer()']];
    const gesicht = [];
    const rand = [];
    const out = [], woerter = [];
    // Dieselbe Sache heißt überall gleich, und niemand wird angesprochen:
    // „Siegrate" neben „Siegquote", „Mate" neben „Partner", „Winrate",
    // „Tordiff", „Head-to-Head", „Team-Sheet", ein „du" in den Einstellungen
    // und „zu 3. gehalten".
    // Groß und klein: `innerText` liefert die Schreibweise nach
    // `text-transform`, und „Bester Mate" steht dort als „BESTER MATE".
    const WORT = /\b(Mate|Siegrate|Winrate|Tordiff|Head-to-Head|Sheet|Upset|All-Time|Tippe|Tap|Update|Highlights|Stats|Win-Rate|Performance|Peak|Savepoint|Backup)\b|\bSp\.|(?<![A-Za-zÄÖÜäöüß])[TG] = als|(?<![\d,])1 (?:Niederlagen|Siege)\b|(?<![A-Za-zÄÖÜäöüß])(min|mind|max)\.\s|zu \d+\. gehalten|\b(?:du|dein\w*)\b(?=\s[a-zäöü])/gi;
    for(const [name, auf] of blaetter){
      try{ K('closeSheet(true)'); K(auf); }catch(e){ out.push(name + ': ' + e.message); continue; }
      await new Promise(r => requestAnimationFrame(r));
      const txt = document.getElementById('sheet').innerText;
      const m = (txt.match(/(^|[^\d.,])\d{1,3}\.\d{1,2}(?![\d.])/g) || []).map(x => x.trim());
      if(m.length) out.push(name + ': ' + m.slice(0,3).join(' '));
      (txt.match(WORT) || []).forEach(w => woerter.push(name + ': ' + w));
      // Keine zwei Beschriftungen einer Achse übereinander: am 26. standen
      // im Positionsverlauf „25" und „26" als „2526".
      const ticks = [...document.querySelectorAll('#sheet .posv-x-tick')].map(t => t.getBoundingClientRect());
      for(let i = 1; i < ticks.length; i++)
        if(ticks[i].left < ticks[i-1].right) rand.push(name + ': Achse überlappt');
      // Und nichts läuft über den Rand des Blatts: die Beziehungskarten im
      // Profil standen mit „Schwächster Partner" 19 px darüber hinaus, die
      // Kachel „Monatschroniken" der Laufbahn zog ihre Spalte auf.
      // Gemessen wird am Innenrand: das Blatt hat 20 px Rand, und eine Karte,
      // die in ihn hineinläuft, steht sichtbar schief neben den anderen.
      // Ein Gesicht hat eine Größe, auch ohne Wappen: unter 48 px kam es
      // nackt zurück, und das Duo einer Durststrecke stand als „LMA" da.
      document.querySelectorAll('#sheet .av').forEach(a => {
        if(!a.textContent.trim()) return;
        const r = a.getBoundingClientRect();
        if(r.width && (r.width < 16 || Math.abs(r.width - r.height) > 1))
          gesicht.push(name + ': ' + a.textContent.trim() + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
      });
      const sh = document.getElementById('sheet'), sb = sh.getBoundingClientRect();
      const sr = {right: sb.right - parseFloat(getComputedStyle(sh).paddingRight)};
      sh.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if(!r.width || !r.height) return;
        let q = el.parentElement, scroller = false;
        // Ausgenommen ist, was ein Vorfahr abschneidet oder waagerecht
        // scrollt (Titelreihe, Karussell). Der senkrechte Scroller des
        // Blatts selbst zählt nicht, sonst wäre alles ausgenommen.
        while(q && q !== sh){ const ox = getComputedStyle(q).overflowX;
          if(/(hidden|clip)/.test(ox) || (/(auto|scroll)/.test(ox) && q.scrollHeight <= q.clientHeight + 1)){ scroller = true; break; }
          q = q.parentElement; }
        if(!scroller && r.right > sr.right + 1) rand.push(name + ': ' + String(el.className).split(' ')[0] + ' +' + Math.round(r.right - sr.right));
      });
    }
    K('closeSheet(true)');
    for(const [name, setz] of [['Liga', "tab='ranking'"], ['Teams', "tab='teams'"],
        ['Awards', "tab='awards';awView='awards'"], ['Einstellungen', "tab='settings'"]]){
      K(setz + ';render()');
      (document.getElementById('main').innerText.match(WORT) || []).forEach(w => woerter.push(name + ': ' + w));
    }
    K("tab='ranking';render()");
    return {out, woerter, rand:[...new Set(rand)].slice(0, 8), gesicht:[...new Set(gesicht)].slice(0, 6)};
  });
  ok(blattPunkt.gesicht.length === 0, 'jedes Gesicht in einem Blatt hat eine Größe und ist rund',
     blattPunkt.gesicht.join(' | ') || 'alle');
  ok(blattPunkt.rand.length === 0, 'kein Blatt läuft bei 360 px über seinen Rand',
     blattPunkt.rand.join(' | ') || 'alle innerhalb');
  const blattWort = blattPunkt.woerter;
  blattPunkt = blattPunkt.out;
  ok(blattWort.length === 0, 'dieselbe Sache heißt überall gleich, und niemand wird geduzt',
     [...new Set(blattWort)].join(' | ') || 'keine Abweichung');
  // ── Ein Kopf, ein Fuß [§C27] ──────────────────────────────────────
  // Blätter hatten fünf Köpfe, und geschlossen wurde nur durch Wischen oder
  // einen Knopf, den jedes Blatt selbst baute. Jedes Blatt mit Titel trägt
  // jetzt denselben Kopf aus Zeichenkachel, Titel und Unterzeile, jedes
  // Blatt den Knopf zum Schließen, und ein Fuß höchstens einen gefüllten
  // Knopf. Der Hinweis trägt seine Rolle, die Bestätigung nennt, was
  // verloren geht, und der zerstörende Knopf steht rechts.
  const kopfFuss = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    const mitKopf = [['Partie', 'showMatchDetail(matches[matches.length-1].id)'],
      ['Torjäger', "tab='awards';awPeriod='season';awSeasonId=null;showAward('scorer')"], ['Höchster Sieg', "showAward('biggest')"],
      ['Erzfeinde', "showAward('rivalry')"], ['Wochenkönig', "period='week';openTopList('periodKing')"],
      ['Rekord', 'showChronicle(CHRONICLES[0].id)'], ['Chronik', 'showDisziplin(SEASON_TITLES[0].id)'],
      ['Monatstafel', "showSeasonTable('2026-08')"], ['Liga-Chronik', 'showLigaChronik()'],
      ['Rangsystem', 'showRangSystem()'], ['Bilanzen', 'showPlayerH2HList(' + P('Leon') + ')'],
      ['Saisons', 'showPlayerSeasons(' + P('Leon') + ')'], ['Regeln', 'showPrestigeRegeln(' + P('Leon') + ')'],
      ['Auszeichnungen', 'showPlayerBadges(' + P('Jane') + ')'], ['Positionsverlauf', 'showPositionHistory(seasons[3].id)'],
      ['Spieler bearbeiten', 'showEditPlayer(' + P('Leon') + ')'], ['Partie bearbeiten', 'showEditMatch(matches[matches.length-1].id)'],
      ['Neuer Spieler', 'showAddPlayer()'],
      ['Awards im Profil', 'showPlayerAwards(' + P('Leon') + ',playerAwards(' + P('Leon') + ').filter(a=>a.rank===0))']];
    const f = [];
    for(const [name, auf] of mitKopf){
      try{ K('closeSheet(true)'); K(auf); }catch(e){ f.push(name + ': ' + e.message); continue; }
      const sh = document.getElementById('sheet');
      const kopf = sh.querySelector('.blatt-kopf');
      if(!kopf || !kopf.querySelector('.zk.g svg') || !kopf.querySelector('h3')) f.push(name + ': ohne Kopf');
      if(!sh.querySelector('#sheetZu')) f.push(name + ': ohne Schließen');
      sh.querySelectorAll('.blatt-fuss').forEach(fu => {
        const voll = [...fu.querySelectorAll('.btn')].filter(b => !b.classList.contains('ghost') && !b.classList.contains('gefahr'));
        if(voll.length > 1) f.push(name + ': ' + voll.length + ' gefüllte Knöpfe im Fuß');
      });
    }
    // Die Bühne im Award-Blatt einer Partie: Gesichter mit Größe, nicht als
    // Farbbalken über die ganze Breite.
    K("closeSheet(true);showAward('biggest')");
    const av = [...document.querySelectorAll('#sheet .buehne .av')];
    if(av.length !== 4 || av.some(a => a.getBoundingClientRect().width > 44)) f.push('Bühne: ' + av.map(a => Math.round(a.getBoundingClientRect().width)).join(','));
    // Schließen schließt.
    document.getElementById('sheetZu').click();
    await new Promise(r => setTimeout(r, 380));
    if(document.getElementById('sheet').classList.contains('show')) f.push('Schließen lässt das Blatt offen');
    // Der Hinweis und die Bestätigung.
    K("toast('Match gespeichert','ok',{sub:'Leon und Martin gewinnen 10:7',aktion:{label:'Rückgängig',fn:()=>{window.__rg=1}}})");
    const t = document.querySelector('.toast');
    if(!t.querySelector('.zk.gruen') || !/gewinnen/.test(t.textContent)) f.push('Hinweis ohne Rolle oder zweite Zeile');
    t.querySelector('.toast-akt').click();
    if(!window.__rg) f.push('Rückgängig führt nichts aus');
    const frage = K("bestaetigen({titel:'Partie löschen?',text:'Eine Partie',ja:'Löschen',gefahr:true,ic:'trash'})");
    await new Promise(r => setTimeout(r, 50));
    const d = document.querySelector('.dlg');
    const kn = d ? [...d.querySelectorAll('.btn')] : [];
    if(kn.length !== 2 || !kn[1].classList.contains('gefahr') || kn[0].textContent !== 'Abbrechen') f.push('Bestätigung: Knöpfe ' + kn.map(b => b.textContent).join('/'));
    if(kn[0]) kn[0].click();
    const antwort = await frage;
    if(antwort !== false) f.push('Abbrechen bestätigt');
    return f;
  });
  ok(kopfFuss.length === 0, 'jedes Blatt trägt denselben Kopf, Schließen und höchstens einen gefüllten Knopf',
     kopfFuss.slice(0, 5).join(' | ') || 'alle');

  // Jedes Award-Blatt, beide Zeiträume: ein Wert trägt seine Einheit
  // ausgeschrieben („6,5 /Sp.", „9,7 Gegen/Sp.", „4× POTD", „0 S · 3 Sp."),
  // eine Serie beginnt beim zweiten Ergebnis („1er Serie", „1er
  // Niederlagen"), eins steht in der Einzahl („1 Carries"), und die Spitze
  // heißt nicht „Best". Dazu dieselbe Zahl für dieselbe Überraschung: die
  // Kachel zeigte 71 %, die Chance der Gegenseite, Blatt und Liga 30 %. Und
  // die Liste des Underdog-Helden war nach Quote sortiert und zeigte die
  // Anzahl: Platz 5 stand mit 2× hinter Platz 2 mit 1×.
  const awBlatt = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    const KURZ = /\/Sp\.|Gegen\/|\bPOT[WD]\b|(^|\s)1 Carries\b|(^|\s)1er\b|\d S · |\bSp\.|\bBest ·/i;
    for(const p of ['season', 'week']){
      K("tab='awards';awView='awards';awPeriod='" + p + "';render()");
      for(const k of K('Object.keys(AWARD_META)')){
        K('closeSheet(true)'); K('showAward(' + JSON.stringify(k) + ')');
        const zeilen = document.getElementById('sheet').innerText.split('\n');
        zeilen.filter(z => KURZ.test(z)).forEach(z => fehler.push(p + ' ' + k + ': ' + z.trim()));
      }
      K('closeSheet(true)');
      const kachel = (document.querySelector('[data-award="upset"] .aw-t-val b') || {}).textContent;
      K("showAward('upset')");
      // Die Bühne nennt die Siegchance der Sieger [§C27].
      const blatt = (document.getElementById('sheet').innerText.match(/Siegchance (\d+)\s?%/) || [])[1];
      if(kachel && kachel !== blatt + '%') fehler.push(p + ' Überraschung: Kachel ' + kachel + ', Blatt ' + blatt + '%');
      K('closeSheet(true)');
      const ud = K("(awardRankings(awPeriod, awSeasonId).underdogList||[]).map(x=>x.pct)");
      if(ud.some((v, i) => i && v > ud[i-1])) fehler.push(p + ' Underdog-Held nicht nach Quote');
      K("showAward('underdog')");
      const udW = [...document.querySelectorAll('#sheet .aw-winner-val, #sheet .aw-li-val')].map(e => e.textContent.trim());
      if(ud.length && !udW.every(w => /^\d+%/.test(w))) fehler.push(p + ' Underdog-Held zeigt ' + udW.slice(0, 3).join(', '));
      K('closeSheet(true)');
    }
    // Neben den Siegern steht ihr Stand zuerst: „Stefan & Martin 8:10".
    K("period='season'; openTopList('periodUpset')");
    [...document.querySelectorAll('#sheet .aw-li-detail')].forEach(d => {
      const m = d.textContent.match(/^(\d+):(\d+)/);
      if(m && +m[1] < +m[2]) fehler.push('Überraschung: ' + d.textContent.trim());
    });
    // Wer im Profil einen Award auf Platz 1 trägt, steht auch im Blatt oben:
    // der Underdog-Held wertete im Profil die Anzahl, im Blatt die Quote,
    // und die Erzfeinde nannten im Blatt eine Rivalität, im Profil neun
    // Spieler aus vier gleichauf liegenden.
    K("awPeriod='season';awSeasonId=null;tab='awards';awView='awards';render()");
    const prof = K("(function(){ const o={}; activePlayers().forEach(p=>playerAwards(p.id).filter(a=>a.rank===0).forEach(a=>{ (o[a.key]=o[a.key]||[]).push(p.name); })); return o; })()");
    for(const k of K('Object.keys(AWARD_META)')){
      K('closeSheet(true)'); K('showAward(' + JSON.stringify(k) + ')');
      const sh = document.getElementById('sheet');
      // Die Namen einer Bühne stehen je Zeile einzeln [§C27].
      const buehne = t => [...t.querySelector('.buehne-n').childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' & ');
      let namen = [...sh.querySelectorAll('.aw-winner-name, .aw-winner-tied-name')].map(e => e.textContent.trim())
        .concat([...sh.querySelectorAll('.buehne-s')].map(buehne));
      if(k === 'rivalry') [...sh.querySelectorAll('.aw-li')].filter(r => r.querySelector('.aw-li-rank').textContent.trim() === '1.')
        .forEach(r => r.querySelectorAll('.aw-li-name').forEach(n => namen.push(n.textContent.replace(/^vs /i, '').trim())));
      if(k === 'upset' || k === 'biggest' || k === 'favoritenschreck')
        namen = [...sh.querySelectorAll('.buehne-s.sieg')].map(buehne);
      const blatt = [...new Set(namen.flatMap(n => n.split(' & ')).map(n => n.trim().toLowerCase()))].sort().join(',');
      const profil = [...new Set((prof[k] || []).map(n => n.toLowerCase()))].sort().join(',');
      if(blatt !== profil) fehler.push(k + ': Blatt ' + blatt + ' · Profil ' + profil);
    }
    K('closeSheet(true)');
    // Und in den letzten Spielen eines Duos und im Direkten Vergleich steht
    // der eigene Stand zuerst: neben dem roten Kreuz stand „10 : 8".
    const P = n => JSON.stringify(K('(players.find(p=>p.name===' + JSON.stringify(n) + ')||{}).id'));
    for(const auf of ['showTeam(' + P('Leo') + ',' + P('Maxi') + ')', 'showH2H(' + P('Leon') + ',' + P('Martin') + ')']){
      K('closeSheet(true)'); K(auf);
      document.querySelectorAll('#sheet .rrow[data-match]').forEach(r => {
        const m = r.textContent.match(/(\d+)\s*:\s*(\d+)\s*$/);
        // Nur die Zeilen mit Haken oder Kreuz; die Höhepunkte darüber tragen
        // ein eigenes Zeichen und ihren Stand ohnehin aus eigener Sicht.
        if(!m || !r.querySelector('polyline, path[d^="M6 6L18"]')) return;
        const sieg = !!r.querySelector('polyline');
        if(sieg !== (+m[1] > +m[2])) fehler.push(auf.slice(0, 8) + ': ' + (sieg ? 'Sieg ' : 'Niederlage ') + m[1] + ':' + m[2]);
      });
    }
    K("closeSheet(true); tab='ranking'; render()");
    return fehler;
  });
  ok(awBlatt.length === 0, 'jedes Award-Blatt nennt seine Einheit ganz, die Überraschung mit einer Zahl, den eigenen Stand zuerst und dieselbe Spitze wie das Profil',
     [...new Set(awBlatt)].slice(0, 6).join(' | ') || 'alle');
  // Der Feed legt nur, was zu sehen ist: rund siebzig Karten und 4600
  // Knoten kosteten beim Öffnen und bei jedem Zurück aus einem Story-Blatt
  // 110 bis 140 ms Layout. Breaking und die Karte des Tages sind
  // ausgenommen — ihr Schein liegt außerhalb der Fläche.
  const cv = await page.evaluate(async () => {
    const aus = document.getElementById('cv-aus'); if(aus) aus.disabled = true;
    window.__k.eval('closeSheet(true); openNewsFeed(); _newsFeedRest()');
    await new Promise(r => requestAnimationFrame(r));
    const karten = [...document.querySelectorAll('#sheet .nf-card')];
    const falsch = karten.filter(k => {
      const soll = (k.classList.contains('nf-brk') || k.classList.contains('nf-gross')) ? 'visible' : 'auto';
      return getComputedStyle(k).contentVisibility !== soll;
    }).map(k => k.className.split(' ').slice(0, 2).join('.'));
    window.__k.eval('closeSheet(true)');
    if(aus) aus.disabled = false;
    return {n: karten.length, falsch};
  });
  ok(cv.n > 20 && cv.falsch.length === 0,
     'der Feed legt Karten außerhalb des Bildschirms erst beim Hineinscrollen',
     cv.falsch.slice(0, 4).join(', ') || cv.n + ' Karten');
  // Die Beziehung unter den Wappen eines Story-Blatts sagt etwas: auf dem
  // Blatt einer Partie stand „in derselben Partie", auf der Karte einer
  // Partie „im selben Moment". Und die Wochenkarte nannte „20 an 4 Tagen"
  // direkt unter ihrem eigenen Satz „20 Spiele an 4 Tagen".
  const beziehung = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    const alle = K('getStoriesCache().map(s => ({id:s.id, t:(s.dataRef||{}).type, q:(s.dataRef||{}).quelle, m:!!(s.dataRef||{}).matchId}))');
    const ziel = alle.filter(x => x.t === 'spiel' || (x.t === 'sammel' && x.q === 'spiel' && x.m)).slice(0, 10)
      .concat(alle.filter(x => x.t === 'woche'));
    for(const x of ziel){
      K('closeSheet(true); openNewsDetail(' + JSON.stringify(x.id) + ')');
      // Ein Story-Blatt steht in #nd, nicht im Blatt-Stapel.
      const txt = (document.getElementById('nd') || {}).innerText || '';
      if(/in derselben Partie|im selben Moment/.test(txt)) fehler.push(x.id);
      if(x.t === 'woche' && /Spiele an \d+ Tag/.test(txt) && /Partien in dieser Woche/i.test(txt)) fehler.push(x.id + ' doppelt');
    }
    K('closeSheet(true); typeof closeNewsDetail === "function" && closeNewsDetail()');
    return {n: ziel.length, fehler};
  });
  ok(beziehung.n >= 3 && beziehung.fehler.length === 0,
     'ein Story-Blatt nennt eine Beziehung, die etwas sagt, und seine Zahl einmal',
     beziehung.fehler.join(', ') || beziehung.n + ' Blätter');
  // Das Blatt einer Serie zeigt den Stand ihrer Partie, nicht den von heute.
  // Unter „10 Pleiten nacheinander" stand „Letzte 10 Matches" mit dem Sieg,
  // der die Serie Stunden später beendet hat — und dieselbe Zahl als Band,
  // als Punktreihe und als Zeile.
  const serie = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const fehler = [];
    // Matchserien stehen jetzt in der gemeinsamen Partie-Karte. Ihre
    // Einzelblaetter bleiben als Legacy-Pfad pruefbar: die Roh-Snapshots
    // zeichnen, statt wegen korrekter Buendelung null Beispiele zu messen.
    const beispiele = K(`_cache._stories.filter(s => /^(loss_streak|win_streak|top_form)$/.test((s.dataRef||{}).type))
      .map(s => ({id:s.id, t:s.dataRef.type, mid:s.dataRef.matchId, html:_newsDetailBody(s)}))`);
    const nd = document.createElement('div');
    nd.style.width = '360px'; document.body.appendChild(nd);
    for(const {id,t,mid,html} of beispiele){
      nd.innerHTML = html;
      const punkte = [...nd.querySelectorAll('.nd-form-strip .nd-form-dot')];
      const letzter = punkte.length ? punkte[punkte.length - 1].classList.contains('w') : null;
      if(t === 'loss_streak' && letzter === true) fehler.push(id + ': Reihe endet mit Sieg');
      if(t === 'top_form' && letzter === false) fehler.push(id + ': Formkarte endet mit Pleite');
      if(/^(loss_streak|win_streak)$/.test(t)){
        const zeilen = nd.querySelector('.nd-pzl');
        const ende = zeilen && zeilen.lastElementChild;
        if(!ende || ende.dataset.mid !== mid) fehler.push(id + ': falsches Endspiel');
        if(ende && (ende.classList.contains('w') !== (t === 'win_streak')))
          fehler.push(id + ': falsche Richtung am Ende');
      }
      if(/in Folge<\/div>/.test(nd.innerHTML) && /× (Niederlage|Sieg) in Folge/.test(nd.innerText)) fehler.push(id + ': Zahl dreimal');
    }
    nd.remove();
    return {n: beispiele.length, fehler};
  });
  ok(serie.n > 0 && serie.fehler.length === 0,
     'das Blatt einer Serie zeigt den Stand ihrer Partie und die Zahl einmal',
     serie.fehler.slice(0, 3).join(' | ') || serie.n + ' Blätter');
  // Das Blatt einer Partie nennt ihre Sieger und die Siegchance aus der
  // Elo-Bahn, und jeder Spieler steht bei den Auszeichnungen einmal. Es
  // stand „Team A gewinnt", und fünf Marken zweier Spieler als fünf Karten.
  const partie = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const ids = K('matches.slice(-40).map(m=>m.id)');
    const fehler = [];
    let mitMarken = 0;
    for(const mid of ids){
      K('closeSheet(true);showMatchDetail(' + JSON.stringify(mid) + ')');
      const soll = K(`(function(){ const m=matches.find(x=>x.id===${JSON.stringify(mid)});
        const h=getHistoryByMatchId().get(m.id); const e=h&&h.expA!=null?h.expA:m.exp_a;
        return {namen:(m.winner==='A'?[m.a1,m.a2]:[m.b1,m.b2]).map(pname),
          pct:Math.max(1,Math.round((m.winner==='A'?e:1-e)*100))}; })()`);
      // Sieger und Siegchance stehen unter dem Stand auf der Bühne [§C27].
      const sub = (document.querySelector('#sheet .buehne-zeile') || {}).textContent || '';
      if(/Team [AB]/.test(sub) || !soll.namen.every(n => sub.includes(n)) || !sub.includes(soll.pct + ' %'))
        fehler.push(sub + ' / ' + soll.pct);
      const zeilen = [...document.querySelectorAll('#sheet .rrow .rname')].map(e => e.textContent.trim());
      if(zeilen.length) mitMarken++;
      if(new Set(zeilen).size !== zeilen.length) fehler.push('doppelt: ' + zeilen.join(','));
    }
    // Und ein Name in der Elo-Liste führt ins Profil.
    K('closeSheet(true);showMatchDetail(matches[matches.length-1].id)');
    const zeile = document.querySelector('#sheet [data-md-spieler]');
    let profil = false;
    if(zeile){ zeile.click(); await new Promise(r => setTimeout(r, 700));
      profil = !!document.querySelector('#sheet .pp-root'); }
    K('closeSheet(true)');
    return {fehler, mitMarken, profil};
  });
  ok(partie.profil, 'ein Name im Blatt einer Partie führt ins Profil');
  ok(partie.fehler.length === 0 && partie.mitMarken > 0,
     'das Blatt einer Partie nennt Sieger und Siegchance und jeden Spieler einmal',
     partie.fehler.slice(0,3).join(' | ') || partie.mitMarken + ' Partien mit Auszeichnungen');
  const reiterPunkt = reiter.filter(r => r.punkt.length).map(r => r.name + ': ' + r.punkt.join(' '));
  ok(reiterPunkt.length + blattPunkt.length === 0,
     'keine Dezimalzahl mit Punkt in einem Reiter oder Blatt',
     reiterPunkt.concat(blattPunkt).join(' | ') || 'alle mit Komma');
  ok(reiter.find(r => r.name === 'Match').fab === 'none'
     && reiter.find(r => r.name === 'Liga').fab !== 'none',
     'der Knopf „Match eintragen" fehlt nur auf der Match-Seite',
     reiter.map(r => r.name + ':' + r.fab).join(' '));
  // ── Die Meisterbühne [§C31] bei 360 px ─────────────────────────────
  // Podest, Titelrennen und Tage vorn stehen auf Karte und Blatt. Gemessen
  // wird, dass nichts davon über den Innenrand läuft, dass der Strahlenkranz
  // hinter dem Podest liegt und nicht davor, und dass Kranz und Linien bei
  // Bewegungsruhe stillstehen.
  await page.setViewportSize({width:360, height:780});
  const meisterMess = async () => page.evaluate(() => window.__k.eval(`(()=>{
    const sid = '2026-07', se = seasons.find(x => x.id === sid), top = JSON.parse(se.top_elo);
    const s = {id:'season_recap_' + sid, cat:'season', ic:'crown', title:'x', desc:'x',
      when:new Date(2026, 6, 31, 23, 50).getTime(), prio:92,
      dataRef:{type:'season_recap', sid, championId:top[0].id, championElo:top[0].elo, topElo:top, fakten:{}}};
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:0;top:0;width:328px';
    host.innerHTML = '<div class="nf-wrap">' + _newsCardHtmlM2(s, false, false, '') + '</div>'
      + '<div class="nd" style="position:static;transform:none;max-height:none">' + _newsDetailBody(s) + '</div>';
    document.body.appendChild(host);
    const raus = [];
    [host.querySelector('.nf-card'), host.querySelector('.nd')].forEach(box => {
      if(!box) { raus.push('fehlt'); return; }
      const b = box.getBoundingClientRect();
      box.querySelectorAll('.pod-karte, .srn-svg, .srn-band, .srn-leg, .srn-t, .srn-z, .nf-zb').forEach(e => {
        const r = e.getBoundingClientRect();
        if(r.left < b.left - 0.5 || r.right > b.right + 0.5) raus.push(e.className.baseVal || e.className);
      });
    });
    const kranz = host.querySelector('.nf-ms-strahl'), linie = host.querySelector('.srn-l.gold');
    const tage = host.querySelector('.srn-t .b i');
    const out = {raus, kranz:kranz ? getComputedStyle(kranz).animationName : 'fehlt',
      hinten:kranz ? getComputedStyle(kranz).zIndex : 'fehlt',
      linie:linie ? getComputedStyle(linie).animationName : 'fehlt',
      tage:tage ? getComputedStyle(tage).animationName : 'fehlt'};
    host.remove(); return out;
  })()`));
  const mb = await meisterMess();
  ok(mb.raus.length === 0, 'die Meisterbühne bleibt bei 360 px in Karte und Blatt', mb.raus.join(', '));
  ok(mb.hinten === '-1' && mb.kranz !== 'none' && mb.linie !== 'none' && mb.tage !== 'none',
     'der Strahlenkranz liegt hinter dem Podest, Kranz und Linien bewegen sich', JSON.stringify(mb));
  await page.emulateMedia({reducedMotion: 'reduce'});
  const mbRuhig = await meisterMess();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  ok(mbRuhig.kranz === 'none' && mbRuhig.linie === 'none' && mbRuhig.tage === 'none',
     'bei prefers-reduced-motion steht die Meisterbühne still', JSON.stringify(mbRuhig));

  // ── Kein Filter über dem Zeichen [§C30] ─────────────────────────────
  // Jedes Wappen trug `filter: drop-shadow(…)` am ganzen `svg.ins`, und
  // Safari rechnet ein SVG unter einem CSS-Filter in CSS-Pixeln und zieht
  // es hoch: auf dem Telefon standen alle Insignien mit Treppenkanten da,
  // wie ausgeschnitten. Dasselbe gilt für eine Ebene, die skaliert. Gesucht
  // wird über Liga, Positionen, Awards, Rekorde, Profil, Laufbahn und Feed;
  // ausgenommen ist nur das Entfärben einer Stufe, die niemand trägt.
  const _filterFunde = JSON.parse(await K(`(async()=>{
const warte=ms=>new Promise(r=>setTimeout(r,ms));
const funde={};
const pruef=(wo)=>{
  // Bilder direkt und über <use> verwiesene Gruppen: gezählt wird das Element, das sichtbar zeichnet
  const ziele=[...document.querySelectorAll('image, use')].filter(e=>{const h=e.getAttribute('href')||'';return e.tagName==='image'?(h.startsWith('data:image/svg')||h.startsWith('blob:')):/^#ins/.test(h);});
  ziele.forEach(im=>{let e=im.parentElement;const k=[];while(e&&e!==document.documentElement){const cs=getComputedStyle(e);
    const f=e.getAttribute&&e.getAttribute('filter');
    if(cs.filter&&cs.filter!=='none'&&!/grayscale/.test(cs.filter))k.push((e.className.baseVal??e.className)+':'+cs.filter.slice(0,30));
    if(f)k.push((e.className.baseVal??e.className)+':attr '+f);
    const m=cs.transform; if(m&&m.startsWith('matrix(')){const a=parseFloat(m.slice(7)); if(Math.abs(a-1)>.01&&!/nd-bg|nd |sheet/.test(e.className))k.push((e.className.baseVal??e.className)+':scale '+a);}
    e=e.parentElement;}
    if(k.length){const key=wo+' | '+k.join(' < ');funde[key]=(funde[key]||0)+1;}});
};
tab='ranking'; render(); await warte(50); pruef('liga'); tab='positions'; render(); await warte(50); pruef('positionen');
tab='awards'; awView='awards'; render(); await warte(50); pruef('awards');
awView='rekorde'; render(); await warte(50); pruef('rekorde');
const pid=players.find(p=>p.name==='Martin').id;
showPlayer(pid); await warte(900); pruef('profil');
try{ showLaufbahn&&showLaufbahn(pid);}catch(e){}
await warte(600); pruef('laufbahn');
closeSheet(true); openNewsFeed(); _newsFeedRest(); await warte(600); pruef('feed');
return JSON.stringify(funde,null,1);
})()
`));
  ok(Object.keys(_filterFunde).length === 0,
     'kein Insignium liegt unter einem Filter oder einer Skalierung',
     Object.keys(_filterFunde).slice(0, 4).join(' · '));
  await page.evaluate(() => { try { window.__k.eval('closeSheet(true)'); } catch(e){} });
  // Und groß ist die Zeichnung Vektor, kein Bild: ein `<image>` mit einer
  // SVG-Datei rastert Safari in seinen 170 Einheiten, und im Profilkopf
  // wurden sie auf 270 px gezogen [§C30]. Klein bleibt sie Bild — ein
  // Verweis klont die ganze Zeichnung, und der Feed öffnete damit doppelt
  // so langsam. Gemessen wird beides: der Profilkopf und die Laufbahn ohne
  // Bild, die Ranglistenzeile mit.
  const _vektor = await page.evaluate(async () => {
    const K = window.__k.eval;
    const w = ms => new Promise(r => setTimeout(r, ms));
    K("tab='ranking'; render()");
    const bildIn = el => { let n = 0; el.querySelectorAll('use').forEach(u => {
      const z = document.querySelector(u.getAttribute('href'));
      if(z && z.querySelector('image[href^="data:image/svg"], image[href^="blob:"]')) n++; });
      return n + el.querySelectorAll('image[href^="data:image/svg"], image[href^="blob:"]').length; };
    const zeile = bildIn(document.querySelector('#app .rrow') || document.body);
    const pid = K("players.find(p=>p.name==='Martin').id");
    K('showPlayer(' + JSON.stringify(pid) + ')'); await w(300);
    const kopf = document.querySelector('#sheet .pp-av-wrap');
    const profil = kopf ? bildIn(kopf) : -1;
    const vektor = kopf ? kopf.querySelectorAll('use[href^="#izg"]').length : 0;
    K('closeSheet(true)'); K('showLaufbahn(' + JSON.stringify(pid) + ')'); await w(300);
    // Die Karte in der Mitte der Vitrine ist groß und Vektor, die am Rand
    // stehen klein und als Bild; die Felder der ganzen Leiter sind rund 40 px
    // und Bild — dieselbe Grenze wie beim Wappen.
    const fk = document.querySelector('#lbLeiter .lb-k.fokus');
    const lb = fk ? bildIn(fk) : -1;
    const lbRand = bildIn(document.getElementById('lbLeiter'));
    const lbFelder = bildIn(document.getElementById('lbAlle'));
    K('closeSheet(true)');
    return {zeile, profil, vektor, lb, lbRand, lbFelder};
  });
  ok(_vektor.profil === 0 && _vektor.vektor > 0 && _vektor.lb === 0,
     'groß ist jedes Insignium eine Vektorzeichnung, kein eingebettetes Bild',
     JSON.stringify(_vektor));
  ok(_vektor.zeile > 0 && _vektor.lbFelder === 21 && _vektor.lbRand >= 5, 'klein bleibt es ein Bild, damit Liste, Feed, der Rand der Vitrine und die ganze Leiter schnell bleiben',
     JSON.stringify(_vektor));
  // Die Aura [§C36]: im Profilkopf bewegt, und zwar so, dass nur die
  // Grafikkarte arbeitet — höchstens drei Ebenen, jede ein Bild, und ihre
  // Bewegung ändert nur `transform` und Deckkraft. Ein Filter oder eine
  // Bewegung INNERHALB des SVG hiesse, die Unschärfe der Strahlen in jedem
  // Bild neu zu rechnen. Und sie steht dort genau einmal: nicht noch ein
  // zweites Mal still im Zeichen dahinter.
  const _aura = await page.evaluate(async () => {
    const K = window.__k.eval;
    const w = ms => new Promise(r => setTimeout(r, ms));
    const pid = K("(players.slice().sort((a,b)=>meisterTitel(b.id)-meisterTitel(a.id))[0]||{}).id");
    K('closeSheet(true); showPlayer(' + JSON.stringify(pid) + ')'); await w(300);
    const kopf = document.querySelector('#sheet .pp-av-wrap');
    const aura = kopf ? kopf.querySelectorAll('.aura') : [];
    const ebenen = aura[0] ? [...aura[0].children] : [];
    const imZeichen = kopf ? kopf.querySelectorAll('svg.ins image.aura-b').length : -1;
    const namen = ebenen.map(e => getComputedStyle(e).animationName).filter(n => n && n !== 'none');
    const fremd = [];
    for(const sh of document.styleSheets){ let r; try { r = sh.cssRules; } catch(e){ continue; }
      for(const k of r) if(k.type === CSSRule.KEYFRAMES_RULE && namen.includes(k.name))
        for(const f of k.cssRules) for(const prop of f.style)
          if(!/^(transform|opacity)$/.test(prop)) fremd.push(k.name + ':' + prop); }
    const filter = ebenen.filter(e => getComputedStyle(e).filter !== 'none').length;
    K('closeSheet(true)');
    return {titel:K('meisterTitel(' + JSON.stringify(pid) + ')'), auren:aura.length, ebenen:ebenen.length,
            bilder:ebenen.every(e => e.tagName === 'IMG'), imZeichen, namen, fremd, filter};
  });
  ok(_aura.titel > 0 && _aura.auren === 1 && _aura.ebenen >= 2 && _aura.ebenen <= 3 && _aura.bilder
     && _aura.imZeichen === 0 && _aura.namen.length >= 2 && _aura.fremd.length === 0 && _aura.filter === 0,
     'die Aura im Profilkopf steht einmal, in höchstens drei Bildebenen, und bewegt nur transform und Deckkraft',
     JSON.stringify(_aura));
  // Und das Bild steht im Dokument unter einer kurzen Adresse. Als Daten-URL
  // trug jedes Bild rund 190 Kilobyte, und jedes der rund 240 `<use>` im
  // Feed klonte sie mit: gemessen brauchte das Öffnen des Feeds im Median
  // 150 ms statt 46. Geprüft wird jedes Bild im Topf nach dem Öffnen.
  const _bildAdr = await page.evaluate(async () => {
    const K = window.__k.eval;
    K('closeSheet(true); openNewsFeed(); _newsFeedRest()');
    await new Promise(r => setTimeout(r, 300));
    const l = [...document.querySelectorAll('#insDefs image, #sheet image, #app image')]
      .map(b => (b.getAttribute('href') || '').length);
    K('closeSheet(true)');
    return {n: l.length, lang: l.filter(x => x > 300).length, max: Math.max(0, ...l)};
  });
  ok(_bildAdr.n > 0 && _bildAdr.lang === 0,
     'jedes Wappenbild im Dokument steht unter einer kurzen Adresse',
     _bildAdr.n + ' Bilder, ' + _bildAdr.lang + ' lang, längste ' + _bildAdr.max + ' Zeichen');

  console.log('\n═══ EINBLICKE, SIEGCHANCE, VERGLEICH UND RÜCKBLICKE ═══');
  await page.setViewportSize({width:360, height:780});
  // ── Der Einblick ist eine Zeile, die aufklappt ────────────────────
  //    Rollen-Landkarte und Netz der Duos nahmen als volle
  //    Karte den halben Bildschirm über der Rangliste. Zu ist der Einblick
  //    eine Zeile ohne Inhalt — gezeichnet wird erst beim Aufklappen —, auf
  //    bleibt er beim Neuzeichnen im selben Reiter, und ein neuer Reiter
  //    beginnt geschlossen. Offen liegt kein Text auf einem anderen.
  const einblick = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const out = {};
    const gezeichnet = () => new Promise((resolve, reject) => {
      const main = document.getElementById('main');
      if(main.getAttribute('aria-busy') !== 'true'){ resolve(); return; }
      let timer;
      const horch = new MutationObserver(() => {
        if(main.getAttribute('aria-busy') === 'true') return;
        clearTimeout(timer); horch.disconnect(); resolve();
      });
      horch.observe(main, {childList:true, attributes:true, attributeFilter:['aria-busy']});
      timer = setTimeout(() => { horch.disconnect(); reject(new Error('Der Reiterwechsel wird nicht fertig.')); }, 8000);
    });
    // Im Liga-Reiter gibt es keinen: das Titelrennen war dieselbe Frage wie
    // der Positionsverlauf darunter.
    K(`closeSheet(true); tab='ranking'; period='season'; render(); 'x'`);
    out.liga = document.querySelectorAll('#main [data-einblick]').length;
    for(const [t, key] of [['positions', 'rollen'], ['teams', 'netz']]){
      K(`closeSheet(true); tab='${t}'; period='season'; einblickOffen=''; render(); 'x'`);
      const box = document.querySelector('#main [data-einblick="' + key + '"]');
      if(!box){ out[key] = {fehlt:true}; continue; }
      const zu = {h: box.getBoundingClientRect().height, leer: !box.querySelector('.einblick-i').innerHTML.trim()};
      box.querySelector('.einblick-k').click();
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const i = box.querySelector('.einblick-i');
      const auf = {h: i.getBoundingClientRect().height, bild: !!i.querySelector('svg'),
                   aria: box.querySelector('.einblick-k').getAttribute('aria-expanded'), fehler: pruefen(box).fehler};
      K('render(); "x"');
      const nachRender = !!document.querySelector('#main [data-einblick="' + key + '"].auf svg');
      document.querySelector('.bnav [data-nav="history"], [data-nav="history"]').click();
      await gezeichnet();
      document.querySelector('[data-nav="' + t + '"]').click();
      await gezeichnet();
      const nachTab = !document.querySelector('#main [data-einblick="' + key + '"].auf');
      out[key] = {zu, auf, nachRender, nachTab};
    }
    return out;
  }, PRUEFEN.toString());
  const _eb = [einblick.rollen, einblick.netz];
  ok(einblick.liga === 0 && _eb.every(x => x && !x.fehlt && x.zu.h <= 46 && x.zu.leer),
     'Rollen-Landkarte und Netz der Duos stehen zu als schmale Zeile ohne Inhalt, der Liga-Reiter trägt keinen',
     JSON.stringify(Object.fromEntries(Object.entries(einblick).map(([k, v]) => [k, v.zu]))));
  ok(_eb.every(x => x.auf && x.auf.bild && x.auf.h > 120 && x.auf.aria === 'true' && x.auf.fehler.length === 0),
     'aufgeklappt zeigen sie ihre Grafik, und kein Text liegt auf einem anderen oder ragt hinaus',
     _eb.map(x => x.auf ? x.auf.fehler.slice(0, 2).join(' | ') || Math.round(x.auf.h) + ' px' : 'fehlt').join(' · '));
  ok(_eb.every(x => x.nachRender && x.nachTab),
     'ein Neuzeichnen im selben Reiter klappt sie nicht zu, ein Reiterwechsel schon',
     JSON.stringify(_eb.map(x => [x.nachRender, x.nachTab])));

  // ── Die Ruheständler stehen am Ende, zu [§C40] ─────────────────────
  //    Unter Gesamt, unter den Positionen und unter den Teams eine Zeile,
  //    die aufklappt. Darüber steht er nicht mehr: die Liste ist die der
  //    aktiven Liga. Aufgeklappt läuft keine Zeile über den Rand, und ein
  //    zweiter Einblick im selben Reiter klappt den ersten nicht zu — mit
  //    EINEM gemerkten Wert stand die Rollen-Landkarte nach dem nächsten
  //    Neuzeichnen geschlossen da.
  const ruhe = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const M = K("players.find(p => p.name === 'Martin').id");
    // Wie der Knopf: der Karriere-Teil wird vor dem Setzen gerechnet [§C40].
    K(`(() => { const p = pmap()['${M}'], t = Date.parse('2026-08-26T19:30:00Z'), k = _ruheKarriereBauen(p.id);
      p.retired_at = new Date(t).toISOString(); p.retired_stand = {v:RUHE_STAND_FASSUNG, t, karriere:k, abschluss:null};
      invalidateCache(); })(); 'x'`);
    const W = document.documentElement.clientWidth, out = {};
    for(const [name, setz, key] of [['gesamt', "tab='ranking';period='all'", 'ruhe_liga'],
        ['positionen', "tab='positions';period='season';rankMetric='atk'", 'ruhe_pos'],
        ['teams', "tab='teams';period='season'", 'ruhe_teams']]){
      K(`closeSheet(true); ${setz}; einblickOffen=''; render(); 'x'`);
      const box = document.querySelector('#main [data-einblick="' + key + '"]');
      if(!box){ out[name] = {fehlt:true}; continue; }
      const ausserhalb = [...document.querySelectorAll('#main [data-detail="' + M + '"], #main [data-team*="' + M + '"]')]
        .filter(e => !box.contains(e)).length;
      const leer = !box.querySelector('.einblick-i').innerHTML.trim();
      box.querySelector('.einblick-k').click();
      const i = box.querySelector('.einblick-i');
      const drin = i.querySelectorAll('[data-detail="' + M + '"], [data-team*="' + M + '"]').length;
      const raus = [...i.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect();
        return r.width && (r.right > W + 1 || r.left < -1); }).length;
      const ohneRang = !i.querySelector('.rrow .pos') && !i.querySelector('.tm-top');
      out[name] = {ausserhalb, leer, drin, raus, ohneRang, fehler: pruefen(box).fehler.slice(0, 2)};
    }
    K(`closeSheet(true); tab='positions'; einblickOffen='rollen ruhe_pos'; render(); 'x'`);
    out.beide = document.querySelectorAll('#main .einblick.auf').length;
    // Der Abschied: ein langes Blatt aus dem Baukasten der Rückblicke. Kein
    // Teil läuft über den Rand, kein Text endet mit „…", und die Karte im
    // Feed trägt dieselbe Bühne.
    K(`closeSheet(true); zeigeAbschied('${M}'); 'x'`);
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const sh = document.getElementById('sheet');
    out.abschied = {
      abschnitte: [...sh.querySelectorAll('.rcp-section')].map(e => e.textContent.trim().replace(/\d+$/, '').trim()),
      raus: [...sh.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > W + 1 || r.left < -1); }).length,
      kurz: [...sh.querySelectorAll('.rcp-zeile-s, .rcp-aw-name, .rcp-aw-val, .ab-duo-t b')]
        .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent).slice(0, 3),
      gold: !!sh.querySelector('.rcp-label:not(.metall)'),
      fehler: pruefen(sh.querySelector('.ab-buehne')).fehler.slice(0, 2)};
    K(`closeSheet(true); _cache._stories = _buildStories().slice().sort((a,b)=>new Date(b.when)-new Date(a.when)); openNewsFeed(); _newsFeedRest(); 'x'`);
    const karte = document.querySelector('.nf-card .nf-abschied');
    const kc = karte && karte.closest('.nf-card');
    out.karte = kc ? {brk: kc.classList.contains('nf-brk') || !!kc.querySelector('.nf-brk-band'),
      raus: [...kc.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), k = kc.getBoundingClientRect();
        return r.width && (r.right > k.right + 1 || r.left < k.left - 1); }).length} : null;
    K('closeSheet(true); "x"');
    K(`pmap()['${M}'].retired_at = null; pmap()['${M}'].retired_stand = null; einblickOffen=''; invalidateCache(); tab='ranking'; period='season'; render(); 'x'`);
    return out;
  }, PRUEFEN.toString());
  const _ru = [ruhe.gesamt, ruhe.positionen, ruhe.teams];
  ok(_ru.every(x => x && !x.fehlt && x.ausserhalb === 0 && x.leer && x.drin > 0),
     'Gesamt, Positionen und Teams zeigen den Ruheständler nur in der Zeile am Ende, zu und ohne Inhalt',
     JSON.stringify(ruhe));
  ok(_ru.every(x => x && x.raus === 0 && x.ohneRang && !(x.fehler || []).length),
     'aufgeklappt läuft keine Zeile bei 360 px über den Rand, und keine trägt einen Platz',
     JSON.stringify(_ru.map(x => x && [x.raus, x.ohneRang, x.fehler])));
  ok(ruhe.beide === 2, 'zwei Einblicke im selben Reiter bleiben beide offen', String(ruhe.beide));
  const _ab = ruhe.abschied || {};
  ok(['Saison für Saison', 'Besondere Momente', 'Die besten Partner', 'Gegenüber', 'Die Stärken',
      'Rekorde beim Abschied', 'Auszeichnungen'].every(t => (_ab.abschnitte || []).includes(t)),
     'der Abschied erzählt die Laufbahn: Saisons, Momente, Partner, Gegner, Stärken, Rekorde, Auszeichnungen',
     (_ab.abschnitte || []).join(' · '));
  ok(_ab.raus === 0 && !(_ab.kurz || []).length && !(_ab.fehler || []).length && !_ab.gold,
     'bei 360 px läuft im Abschied nichts über den Rand, nichts wird gekürzt, und die Marke ist Metall statt Gold',
     JSON.stringify({raus:_ab.raus, kurz:_ab.kurz, fehler:_ab.fehler, gold:_ab.gold}));
  ok(ruhe.karte && ruhe.karte.brk && ruhe.karte.raus === 0,
     'im Feed steht das Karriereende als Breaking-Karte mit seiner Bühne, nichts ragt hinaus', JSON.stringify(ruhe.karte));

  // ── Entfernen heißt bei Partien nicht Löschen [§C40] ──────────────
  //    „Komplett löschen" ließ in jeder Partie ein Fragezeichen zurück. Mit
  //    Partien bietet das Blatt das Karriereende und das Ausblenden an, und
  //    wer schon aufgehört hat, bekommt das Karriereende nicht ein zweites Mal.
  const weg = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    const sh = document.getElementById('sheet');
    const blick = async (pid) => {
      K(`closeSheet(true); showPlayer('${pid}'); 'x'`);
      for(let t = 0; t < 40 && !document.getElementById('delPlayer'); t++) await new Promise(r => setTimeout(r, 50));
      document.getElementById('delPlayer').click();
      for(let t = 0; t < 20 && !sh.querySelector('.pp-weg'); t++) await new Promise(r => setTimeout(r, 50));
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      const W = window.innerWidth;
      return {weg: !!sh.querySelector('.pp-weg'), loeschen: !!sh.querySelector('#deletePlayerBtn'),
        ende: !!sh.querySelector('#retirePlayerBtn'), aus: !!sh.querySelector('#hidePlayerBtn'),
        raus: [...sh.querySelectorAll('.pp-weg *')].filter(e => { const r = e.getBoundingClientRect();
          return r.width && (r.right > W + 1 || r.left < -1); }).length};
    };
    const pid = K('players.find(p => matches.some(m => [m.a1,m.a2,m.b1,m.b2].includes(p.id))).id');
    const aktiv = await blick(pid);
    // Wie der Knopf: der Karriere-Teil wird vor dem Setzen gerechnet [§C40].
    K(`(() => { const p = pmap()['${pid}'], t = Date.now() - 864e5, k = _ruheKarriereBauen(p.id);
      p.retired_at = new Date(t).toISOString(); p.retired_stand = {v:RUHE_STAND_FASSUNG, t, karriere:k, abschluss:null};
      invalidateCache(); })(); 'x'`);
    const ruhend = await blick(pid);
    K(`closeSheet(true); pmap()['${pid}'].retired_at = null; pmap()['${pid}'].retired_stand = null; invalidateCache(); 'x'`);
    return {aktiv, ruhend};
  });
  ok(weg.aktiv.weg && !weg.aktiv.loeschen && weg.aktiv.ende && weg.aktiv.aus && weg.aktiv.raus === 0
     && weg.ruhend.weg && !weg.ruhend.loeschen && !weg.ruhend.ende && weg.ruhend.aus,
     'wer Partien hat, wird nicht gelöscht: das Blatt bietet Karriereende und Ausblenden, ein Ruheständler nur das Ausblenden',
     JSON.stringify(weg));

  // ── Keine Partie nach dem Karriereende [§C40] ─────────────────────
  //    Das Bearbeiten einer Partie bot jeden Spieler an. Wer vor ihr
  //    aufgehört hat, steht nicht zur Wahl; wer schon in ihr steht, bleibt
  //    wählbar, und vor dem Karriereende gehört er dazu.
  const bearb = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const r = JSON.parse(K(`(() => {
      const ms = matches.slice().sort((a,b) => mts(a) - mts(b));
      const mitte = mts(ms[Math.floor(ms.length / 2)]);
      const p = players.find(x => ms.some(m => mts(m) > mitte && [m.a1,m.a2,m.b1,m.b2].includes(x.id)));
      p.retired_at = new Date(mitte).toISOString(); invalidateCache();
      const ohne = ms.find(m => mts(m) > mitte && ![m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const mit = ms.find(m => mts(m) > mitte && [m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const frueh = ms.find(m => mts(m) < mitte && ![m.a1,m.a2,m.b1,m.b2].includes(p.id));
      const angeboten = m => { closeSheet(true); showEditMatch(m.id);
        return !!document.querySelector('#sheet select[data-ep="A1"] option[value="' + p.id + '"]'); };
      const out = {nachher: angeboten(ohne), drin: angeboten(mit), vorher: angeboten(frueh)};
      // Auch gesetzt, etwa über ein altes Formular, speichert es nicht.
      closeSheet(true); showEditMatch(ohne.id);
      E.A1 = p.id; document.querySelector('#sheet [data-ep="A1"]').dispatchEvent(new Event('change'));
      const sel = document.querySelector('#sheet select[data-ep="A1"]');
      const o = document.createElement('option'); o.value = p.id; sel.appendChild(o); sel.value = p.id;
      sel.dispatchEvent(new Event('change'));
      out.gesperrt = document.getElementById('saveEdit').disabled;
      out.hinweis = document.getElementById('editWarn').textContent;
      closeSheet(true); p.retired_at = null; invalidateCache();
      return JSON.stringify(out);
    })()`));
    return r;
  });
  ok(!bearb.nachher && bearb.drin && bearb.vorher && bearb.gesperrt && /Karriere/.test(bearb.hinweis),
     'eine Partie nach dem Karriereende bietet den Ruheständler nicht an und speichert ihn nicht, eine davor schon',
     JSON.stringify(bearb));

  // ── Der Positionsverlauf zeigt sich selbst ───────────────────────
  //    Die Karte unter „Mehr zur Saison" trug die Elo der ersten drei —
  //    eine andere Grafik als das Blatt, das sie öffnet. Jetzt trägt sie
  //    denselben Verlauf vereinfacht: eine Linie je Spieler, der im Blatt
  //    eine Kurve hat, und die ersten drei darunter. Sie steht UNTER der
  //    Rangliste, ganz im Bild, und kein Text liegt auf einem anderen.
  const posKarte = await page.evaluate((pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); tab='ranking'; period='season'; ligaSeasonId=''; render(); 'x'`);
    const karte = document.querySelector('#main .seasontools .st-card.pos');
    const liste = document.querySelector('#main .rlist');
    if(!karte || !liste) return {fehlt:true};
    const r = karte.getBoundingClientRect();
    const out = {
      gross: karte.classList.contains('gross'),
      linien: karte.querySelectorAll('.posv-mini-l').length,
      soll: K(`getSeasonPositionHistory(ligaSaisonId()).activeIds.filter(id => getSeasonPositionHistory(ligaSaisonId()).positionsByDay[id].some(p => p !== null)).length`),
      legende: karte.querySelectorAll('.posv-mini-lg span').length,
      unterListe: r.top >= liste.getBoundingClientRect().bottom - 1,
      erste: karte === document.querySelector('#main .seasontools .st-card'),
      imBild: r.left >= 0 && r.right <= window.innerWidth + .5,
      fehler: pruefen(karte).fehler
    };
    karte.click();
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    out.oeffnet = document.getElementById('sheetBg').classList.contains('show') && !!document.querySelector('#sheet svg');
    K(`closeSheet(true); 'x'`);
    return out;
  }, PRUEFEN.toString());
  ok(!posKarte.fehlt && posKarte.gross && posKarte.linien >= 2 && posKarte.linien === posKarte.soll
     && posKarte.legende === Math.min(3, posKarte.soll) && posKarte.unterListe && posKarte.erste
     && posKarte.imBild && posKarte.fehler.length === 0 && posKarte.oeffnet,
     'der Positionsverlauf steht unter der Rangliste als erste Karte, zeigt jede Linie des Verlaufs und öffnet ihn',
     JSON.stringify(Object.assign({}, posKarte, {fehler: (posKarte.fehler || []).slice(0, 2)})));

  // ── Der Positionsverlauf liest sich als Tabelle über die Zeit ─────
  //    Er zeigte gerade Linien, die Namen mit „…" gekürzt neben dem
  //    Gesicht, einen Hinweis „Linie oder Gesicht antippen" und darunter
  //    einen leeren Kasten „Hier stehen die Einzelheiten". Jetzt: Kurven,
  //    die Tabelle des letzten Stands mit der Bewegung seit dem vorletzten
  //    Spieltag, und ein Detail erst, wenn jemand gewählt ist — mit seinem
  //    Platz an jedem Tag. Die Bewegung wird hier aus `positionsByDay`
  //    nachgerechnet, nicht aus dem Markup abgelesen.
  const posv = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); showPositionHistory(seasons[3].id); 'x'`);
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const d = K(`getSeasonPositionHistory(seasons[3].id)`);
    const jetzt = id => { const a = d.positionsByDay[id]; for(let i = a.length - 1; i >= 0; i--) if(a[i] !== null) return a[i]; return null; };
    const st = d.spielTage, out = {fehler: []};
    const sh = document.getElementById('sheet');
    const txt = sh.innerText;
    if(/…|antippen|Einzelheiten/.test(txt)) out.fehler.push('Hinweis oder Kürzung: ' + (txt.match(/.{0,20}(…|antippen|Einzelheiten).{0,10}/) || [''])[0]);
    const kurven = [...sh.querySelectorAll('.posv-line')].filter(p => / C /.test(p.getAttribute('d'))).length;
    if(kurven < d.activeIds.length - 1) out.fehler.push('Kurven ' + kurven);
    const ids = d.activeIds.filter(id => jetzt(id) !== null).sort((a, b) => jetzt(a) - jetzt(b));
    const rows = [...sh.querySelectorAll('.posv-row')];
    if(rows.map(r => r.dataset.pid).join() !== ids.join()) out.fehler.push('Reihenfolge der Tabelle');
    rows.forEach(r => {
      const a = d.positionsByDay[r.dataset.pid];
      const n = a[st[st.length - 1] - 1], v = st.length > 1 ? a[st[st.length - 2] - 1] : null;
      const soll = n == null ? '' : v == null ? 'neu' : v > n ? '▲' + (v - n) : v < n ? '▼' + (n - v) : '–';
      const ist = (r.querySelector('.posv-bw') || {}).textContent || '';
      if(ist !== soll) out.fehler.push(r.querySelector('.posv-nm').textContent + ': ' + ist + ' statt ' + soll);
      if(r.querySelector('.posv-nm').scrollWidth > r.querySelector('.posv-nm').clientWidth + 1) out.fehler.push('Name abgeschnitten');
    });
    const det = document.getElementById('posvDetail');
    out.vorher = det.hidden;
    const wahl = rows[2];
    wahl.click();
    document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
    const a = d.positionsByDay[wahl.dataset.pid];
    out.nachher = !det.hidden;
    out.zellen = det.querySelectorAll('.posv-tz span').length === d.lastDay;
    out.gold = det.querySelectorAll('.posv-tz span.eins').length === a.filter(x => x === 1).length;
    out.hl = wahl.classList.contains('hl') && !!sh.querySelector('.posv-line.hl[data-pid="' + wahl.dataset.pid + '"]');
    K(`closeSheet(true); 'x'`);
    return out;
  });
  ok(posv.fehler.length === 0 && posv.vorher && posv.nachher && posv.zellen && posv.gold && posv.hl,
     'der Positionsverlauf zeigt Kurven, die Tabelle mit ihrer Bewegung und erst nach der Wahl den Platz an jedem Tag',
     JSON.stringify(Object.assign({}, posv, {fehler: posv.fehler.slice(0, 3)})));

  // ── Jeder Fun Fact zeichnet seinen Anlass ─────────────────────────
  //    Alle Fun Facts standen als große Zahl links neben ihrem Satz. Jetzt
  //    trägt jede Vorlage ihr Bild — Rennen, Podest, Tauziehen, Pause,
  //    Vitrine … —, und das muss bei 288 und 360 px in seiner Karte bleiben:
  //    kein Text auf einem anderen, keiner abgeschnitten oder mit „…".
  const fakt = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    K(`closeSheet(true); 'x'`);
    const html = K(`(function(){
      const pm = pmap(), nameOf = pid => (pm[pid]||{}).name || '?', seen = new Set(), out = [];
      [new Date(2026, 7, 26, 15, 5), new Date(2026, 6, 20, 15, 5)].forEach(now => {
        const T = _ambientTemplatePool(now, pm, nameOf);
        for(let seed = 1; seed <= 4; seed++) T.forEach(t => {
          let r = null; try { r = t.make(_ambientRng(seed)); } catch(e){ return; }
          const b = r && r.dataRef && r.dataRef.bild;
          if(!b || seen.has(b.f + (b.ins ? 'i' : ''))) return; seen.add(b.f + (b.ins ? 'i' : ''));
          out.push(_newsCardHtmlM2({id:'ffb_' + t.key, title:r.title, desc:r.desc, when:now, cat:r.cat, ic:r.ic,
            dataRef:Object.assign({type:'ambient', sub:t.key}, r.dataRef)}, false, false, ''));
        });
      });
      out.push(_newsCardHtmlM2({id:'ffb_pause', title:'5 Tage ohne Spiel', desc:'Die längste Pause der Liga waren 9 Tage.',
        when:new Date(2026, 7, 26), cat:'fun', ic:'clock', dataRef:{type:'dry_spell', daysSince:5, maxGapDays:9}}, false, false, ''));
      return out.join('');
    })()`);
    const w = document.createElement('div');
    w.className = 'nf-wrap';
    document.body.appendChild(w);
    const out = {formen:0, fehler:[]};
    for(const breite of [288, 360]){
      w.style.cssText = 'position:absolute;left:0;top:0;width:' + breite + 'px;z-index:99999';
      w.innerHTML = html;
      w.querySelectorAll('.nf-card').forEach(c => { c.style.contentVisibility = 'visible'; });
      document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} });
      await new Promise(r => requestAnimationFrame(r));
      const ffs = [...w.querySelectorAll('.ff')];
      out.formen = Math.max(out.formen, ffs.length);
      ffs.forEach(ff => {
        const k = ff.closest('.nf-card').dataset.sid + ' ' + breite + ': ';
        const r = ff.getBoundingClientRect();
        ff.querySelectorAll('*').forEach(e => {
          const b = e.getBoundingClientRect();
          if(b.width && (b.right > r.right + .5 || b.left < r.left - .5)) out.fehler.push(k + 'läuft hinaus ' + (e.className.baseVal ?? e.className));
        });
        pruefen(ff).fehler.forEach(f => out.fehler.push(k + f));
      });
    }
    w.remove();
    return out;
  }, PRUEFEN.toString());
  ok(fakt.formen >= 12 && fakt.fehler.length === 0,
     'jedes Fun-Fact-Bild bleibt bei 288 und 360 px in seiner Karte, ohne Text auf Text und ohne Kürzung',
     fakt.formen + ' Bilder · ' + fakt.fehler.slice(0, 4).join(' | '));

  // ── Die Siegchance steht beim Aufstellen unter der Score-Karte ────
  //    Ohne Erklärsatz, aus derselben Rechnung, mit der die Partie danach
  //    gewertet wird, und in der Vorschau nach dem Stand nicht noch einmal.
  const chance = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    K(`tab='match'; M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0}; render(); updatePreview(); 'x'`);
    const leer = !document.querySelector('#chanceSlot .prob');
    K(`M.A1=players[8].id; M.A2=players[10].id; M.B1=players[3].id; M.B2=players[1].id; updatePreview(); 'x'`);
    const box = document.querySelector('#chanceSlot .m-chance');
    const soll = Math.round(K('computeMatch(teamsFromM().teamA, teamsFromM().teamB, "A", 10, 0).expA') * 100);
    const pa = box ? parseInt(box.querySelector('.pa').textContent, 10) : null;
    const pb = box ? parseInt(box.querySelector('.pb').textContent, 10) : null;
    const unter = box ? box.getBoundingClientRect().top >= document.querySelector('.score-board').getBoundingClientRect().bottom - 1 : false;
    const text = box ? box.textContent : '';
    K(`M.sa=10; M.sb=7; updatePreview(); 'x'`);
    const doppelt = document.querySelectorAll('#main .prob').length;
    K(`M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0}; tab='ranking'; render(); 'x'`);
    return {leer, da:!!box, pa, pb, soll, unter, erklaert:/Elo beider|Rechnung|aus der Elo/i.test(text), doppelt};
  });
  ok(chance.leer && chance.da && chance.pa === chance.soll && chance.pa + chance.pb === 100 && chance.unter
     && !chance.erklaert && chance.doppelt === 1,
     'die Siegchance steht beim Aufstellen unter der Score-Karte, ohne Erklärsatz und nur einmal',
     JSON.stringify(chance));

  // ── Jede Begegnung im Direkten Vergleich ──────────────────────────
  //    Ein Balken je Begegnung als Gegner, höchstens die letzten vierzig,
  //    und die Zahlen daneben zählen die gezeigten Siege — nachgerechnet
  //    an den rohen Partien.
  const vergleich = await page.evaluate(() => {
    const K = window.__k.eval.bind(window.__k);
    const a = K('players.find(p=>p.name==="Leon").id'), b = K('players.find(p=>p.name==="Martin").id');
    K(`showH2H(${JSON.stringify(a)}, ${JSON.stringify(b)}); 'x'`);
    const ms = K(`matches.filter(m => [m.a1,m.a2,m.b1,m.b2].includes(${JSON.stringify(a)}) && [m.a1,m.a2,m.b1,m.b2].includes(${JSON.stringify(b)})
      && ((m.a1===${JSON.stringify(a)}||m.a2===${JSON.stringify(a)}) !== (m.a1===${JSON.stringify(b)}||m.a2===${JSON.stringify(b)})))
      .sort((x,y)=>mts(x)-mts(y)).slice(-40).map(m => (m.a1===${JSON.stringify(a)}||m.a2===${JSON.stringify(a)}) ? m.winner==='A' : m.winner==='B')`);
    const box = document.querySelector('#sheet .h2h-bg');
    const res = {n: box ? box.querySelectorAll('rect').length : 0, soll: ms.length,
      aw: box ? +box.querySelectorAll('.h2h-bg-n b')[0].textContent : null, aSoll: ms.filter(Boolean).length,
      gruen: box ? box.querySelectorAll('rect.w').length : 0};
    K('closeSheet(true)');
    return res;
  });
  ok(vergleich.n === vergleich.soll && vergleich.n > 10 && vergleich.aw === vergleich.aSoll && vergleich.gruen === vergleich.aSoll,
     'der Direkte Vergleich zeigt jede der letzten Begegnungen als Balken und zählt die Siege wie die Partien',
     JSON.stringify(vergleich));

  // ── Die Rückblicke zeigen, wie es dazu kam ───────────────────────
  //    Woche: sieben Tage des Helden und das Feld; Tag: Bahn, Elo und
  //    Feld; Saison: Rangliste zuerst, darunter Titelrennen, Tage an der
  //    Spitze und die Saison des Meisters.
  const rueck = await page.evaluate(async (pruefenSrc) => {
    const pruefen = eval('(' + pruefenSrc + ')');
    const K = window.__k.eval.bind(window.__k);
    const warte = () => new Promise(r => setTimeout(r, 450));
    const fehler = h => { document.getAnimations().forEach(a => { try { a.finish(); } catch(e){} }); return pruefen(h).fehler; };
    const out = {};
    K(`closeSheet(true); showPotwRecap({woche:'2026-08-17'}); 'x'`); await warte();
    let sh = document.getElementById('sheet');
    const wochenMs = K(`matches.filter(m => tagKey(mts(m)) >= '2026-08-17' && tagKey(mts(m)) <= '2026-08-23')`);
    const imFeld = new Set(); wochenMs.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(x => imFeld.add(x)));
    out.woche = {titel: /KW 34/.test(sh.textContent) ? 'KW 34' : '', tage: sh.querySelectorAll('.rcp-wo-t').length,
      feld: sh.querySelectorAll('.rcp-feld-z').length, soll: imFeld.size, held: sh.querySelectorAll('.rcp-feld-z.held').length,
      fehler: [...sh.querySelectorAll('.rcp-feld, .rcp-woche')].flatMap(fehler)};
    K(`closeSheet(true); showPotdRecap({force:true, tag:'2026-08-24'}); 'x'`); await warte();
    sh = document.getElementById('sheet');
    const tagMs = K(`matches.filter(m => tagKey(mts(m)) === '2026-08-24').length`);
    out.tag = {bahn: !!sh.querySelector('.nd-bahn'), zeilen: sh.querySelectorAll('.nd-tml').length, elo: !!sh.querySelector('.rcp-elo svg'),
      feld: sh.querySelectorAll('.rcp-feld-z').length, partien: tagMs, datum: /24\. August/.test(sh.textContent),
      fehler: [...sh.querySelectorAll('.rcp-feld, .rcp-elo')].flatMap(fehler)};
    K(`closeSheet(true); showSeasonRecap(seasons.find(s=>s.id==='2026-07')); 'x'`); await warte();
    sh = document.getElementById('sheet');
    const kopf = [...sh.querySelectorAll('.rcp-section')].map(x => x.textContent.replace(/\d+/g, '').trim());
    out.saison = {rang: kopf.indexOf('Rangliste'), rennen: kopf.indexOf('Das Titelrennen'),
      spitze: kopf.indexOf('Tage an der Spitze'), meister: kopf.findIndex(x => /^Die Saison des Meisters/.test(x)),
      fehler: [...sh.querySelectorAll('.rcp-block')].flatMap(fehler)};
    K('closeSheet(true)');
    return out;
  }, PRUEFEN.toString());
  ok(rueck.woche.tage === 7 && rueck.woche.feld === rueck.woche.soll && rueck.woche.held === 1 && /KW 34/.test(rueck.woche.titel)
     && rueck.woche.fehler.length === 0,
     'der Wochenrückblick zeigt die gewählte Woche, die sieben Tage des Helden und jeden Spieler im Feld',
     JSON.stringify(rueck.woche).slice(0, 200));
  ok(rueck.tag.bahn && rueck.tag.zeilen === 0 && rueck.tag.elo && rueck.tag.feld > 3 && rueck.tag.datum && rueck.tag.fehler.length === 0,
     'der Tagesrückblick zeigt den gewählten Tag als Bahn, die Elo über den Tag und das Feld',
     JSON.stringify(rueck.tag).slice(0, 200));
  ok(rueck.saison.rang >= 0 && rueck.saison.rennen > rueck.saison.rang && rueck.saison.spitze > rueck.saison.rennen
     && rueck.saison.meister > rueck.saison.spitze && rueck.saison.fehler.length === 0,
     'der Saison-Rückblick zeigt die Rangliste zuerst, darunter Titelrennen, Tage an der Spitze und die Saison des Meisters',
     JSON.stringify(rueck.saison).slice(0, 200));

  // ── Aus der Story in ihren Rückblick ──────────────────────────────
  //    Spieler des Tages und die Woche öffnen den Rückblick IHRES Tages und
  //    IHRER Woche, nicht den letzten.
  const knopf = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    K(`_cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;'x'`);
    const potd = K(`JSON.stringify(getStoriesCache().filter(s=>(s.dataRef||{}).type==='potd').map(s=>({id:s.id, tag:s.dataRef.dayKey})))`);
    const woche = K(`JSON.stringify(getStoriesCache().filter(s=>(s.dataRef||{}).type==='woche').map(s=>({id:s.id, woche:s.dataRef.woche})))`);
    const res = [];
    for(const x of JSON.parse(potd).slice(-2).concat(JSON.parse(woche).slice(-1))){
      K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(x.id)}); 'x'`);
      const b = document.querySelector('#nd [data-rueckblick]');
      if(!b){ res.push({id:x.id, knopf:false}); continue; }
      b.click();
      const sh = document.getElementById('sheet');
      const k = x.tag || x.woche;
      const [y, m, d] = k.split('-').map(Number);
      // Die Wochenkarte trägt ihre ISO-Woche („2026-W34"), der Rückblick nennt sie „KW 34".
      const soll = x.tag ? new Date(y, m - 1, d).toLocaleDateString('de-DE', {weekday:'long', day:'numeric', month:'long'})
                         : 'KW ' + Number(k.split('-W')[1]);
      // Das Blatt kommt nach dem Zuschieben des vorigen. Fest 500 ms zu warten
      // war unter Last im Gesamtlauf zu kurz; gewartet wird auf den Inhalt.
      for(let t = 0; t < 30 && sh.textContent.indexOf(soll) < 0; t++) await new Promise(r => setTimeout(r, 100));
      res.push({id:x.id, knopf:true, auf: sh.textContent.indexOf(soll) >= 0, soll});
    }
    K('closeSheet(true)');
    return res;
  });
  ok(knopf.length >= 2 && knopf.every(x => x.knopf && x.auf),
     'die Story des Spielers des Tages und der Woche öffnet per Knopf den Rückblick ihres Tages und ihrer Woche',
     JSON.stringify(knopf).slice(0, 240));

  // ── Der Tafel-Moment: der Tag als Achse, die Zeile als Weg ──────────
  //    Oben stand je Spieler eine Zeile mit seinen Bewegungen — dieselbe
  //    Aussage wie die Liste darunter. Jetzt steht dort der Spieltag als
  //    Achse, und keine Säule ragt bei 360 px aus ihr heraus. Eine Zeile der
  //    Liste führte ins Profil; sie öffnet jetzt das Blatt ihres Eintrags.
  await page.setViewportSize({width:360, height:780});
  const moment = await page.evaluate(async () => {
    const K = window.__k.eval.bind(window.__k);
    K(`_cache._stories=_buildStories().sort((a,b)=>new Date(b.when)-new Date(a.when));_cache._consolFrom=null;_cache._frischVon=null;'x'`);
    const id = K(`(getStoriesCache().find(s=>(s.dataRef||{}).type==='sammel'&&s.dataRef.quelle==='tafel')||{}).id||''`);
    if(!id) return null;
    const auf = () => K(`closeSheet(true); openNewsFeed(); openNewsDetail(${JSON.stringify(id)}); 'x'`);
    auf();
    const nd = document.getElementById('nd');
    const f = nd.querySelector('.nd-ta-f');
    const fr = f ? f.getBoundingClientRect() : null;
    const raus = f ? [...f.querySelectorAll('.nd-ta-s')].filter(x => {
      const r = x.getBoundingClientRect();
      return r.left < fr.left - 0.5 || r.right > fr.right + 0.5 || r.top < fr.top - 0.5;
    }).length : -1;
    const out = {achse:!!f, saeulen:f ? f.querySelectorAll('.nd-ta-s').length : 0, raus,
      gesichter:nd.querySelectorAll('.nd-ta .av').length, wege:[]};
    const sh = document.getElementById('sheet');
    for(const art of ['chron', 'disz', 'laufbahn']){
      auf();
      const z = document.querySelector(`#nd .nw-tz[data-${art}]`);
      if(!z) continue;
      const wert = z.getAttribute('data-' + art);
      const soll = art === 'chron' ? K(`CHRONICLE_BY_ID[${JSON.stringify(wert)}].name`)
        : art === 'disz' ? K(`SEASON_TITLE_BY_ID[${JSON.stringify(wert.split('|')[0])}].name`)
        : 'Laufbahn';
      z.click();
      for(let t = 0; t < 30 && sh.textContent.indexOf(soll) < 0; t++) await new Promise(r => setTimeout(r, 100));
      out.wege.push({art, soll, auf:sh.textContent.indexOf(soll) >= 0, profil:!!sh.querySelector('.pp-header')});
    }
    K('closeSheet(true)');
    return out;
  });
  ok(moment && moment.achse && moment.saeulen > 0 && moment.raus === 0 && moment.gesichter === 0,
     'der Tafel-Moment zeigt oben den Spieltag als Achse ohne Gesichter, und keine Säule ragt bei 360 px hinaus',
     JSON.stringify(moment));
  ok(moment && moment.wege.some(w => w.art === 'chron') && moment.wege.every(w => w.auf && !w.profil),
     'eine Zeile des Tafel-Moments öffnet das Blatt ihres Rekords, ihrer Chronik oder die Laufbahn statt des Profils',
     JSON.stringify(moment && moment.wege));

  await page.setViewportSize({width:430, height:932});

  console.log('\n' + '═'.repeat(60));
  console.log(fails === 0 ? `ALLE ${checks} CHECKS BESTANDEN` : `${fails} von ${checks} CHECKS FEHLGESCHLAGEN`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
