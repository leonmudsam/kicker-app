// Eingaben werden sofort quittiert, teure Ansichten erst nach dem ersten
// Bild gebaut. Geprüft werden Reihenfolge und Arbeit, keine CI-Zeitgrenze.
if(!require('./browser.js').ladeChromium()){
  console.log('ÜBERSPRUNGEN — kein Chromium verfügbar.');
  process.exit(2);
}
const {createHarness}=require('../tools/performance.cjs');
let checks=0,fails=0;
const ok=(c,s)=>{checks++;if(!c)fails++;console.log((c?'  ok  ':'  ✗   ')+s);};
(async()=>{
  const {browser,page,K,errors}=await createHarness();
  try{
    const start=await K(`(() => {
      tab='ranking';render();window.__renderFn=render;window.__renderZahl=0;
      render=function(){window.__renderZahl++;return window.__renderFn()};
      const main=document.getElementById('main'),alt=main.firstElementChild;
      document.querySelector('[data-nav="positions"]').click();
      return {markiert:document.querySelector('[data-nav="positions"]').classList.contains('on'),
        wartend:main.getAttribute('aria-busy')==='true',alt:alt===main.firstElementChild,
        ruht:main.inert,zahl:window.__renderZahl};})()`);
    ok(start.markiert,'Die gewählte Navigation antwortet im Eingabe-Aufruf');
    ok(start.wartend && start.alt && start.zahl===0,'Die teure Ansicht wartet auf das erste Rückmeldungsbild');
    ok(start.ruht,'Der alte Reiter ist während eines Tabwechsels nicht versehentlich bedienbar');
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('window.__renderZahl===1 && !document.getElementById("main").inert'),'Der Reiter wird einmal gebaut und wieder freigegeben');

    const burst=await K(`(() => {
      window.__renderZahl=0;
      for(const id of ['teams','awards','history','positions','history'])
        document.querySelector('[data-nav="'+id+'"]').click();
      return {zahl:window.__renderZahl,tab,aktiv:document.querySelector('[data-nav="history"]').classList.contains('on')};})()`);
    ok(burst.zahl===0 && burst.tab==='history' && burst.aktiv,'Schnelle Taps bewahren sofort die letzte Absicht');
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('window.__renderZahl===1 && !!document.getElementById("histSel")'),'Ein Tap-Burst baut nur die zuletzt gewählte Ansicht');

    await K(`tab='ranking';render();window.__renderZahl=0;
      document.querySelector('[data-nav="teams"]').click();tab='history';render();`);
    await page.waitForTimeout(100);
    ok(await K('window.__renderZahl===1 && !!document.getElementById("histSel")'),'Ein unmittelbarer Render entzieht alter geplanter Arbeit den Besitz');
    ok(await K('!document.getElementById("main").inert && document.getElementById("main").getAttribute("aria-busy")!=="true"'),'Abbrechen hinterlässt keine Eingabesperre');

    // Ein schon ausgelieferter Callback muss selbst dann still bleiben,
    // wenn cancelAnimationFrame ihn nicht mehr erreichen kann.
    const stale=await K(`(() => {
      window.__rafFn=requestAnimationFrame;window.__cancelFn=cancelAnimationFrame;window.__jobs=[];
      window.requestAnimationFrame=fn=>{window.__jobs.push(fn);return 999};window.cancelAnimationFrame=()=>{};
      tab='ranking';render();window.__renderZahl=0;
      document.querySelector('[data-nav="teams"]').click();const alt=window.__jobs.shift();
      tab='history';render();if(alt)alt();
      window.requestAnimationFrame=window.__rafFn;window.cancelAnimationFrame=window.__cancelFn;
      return !!alt;})()`);
    await page.waitForTimeout(100);
    ok(stale && await K('window.__renderZahl===1'),'Auch ein verspäteter Frame-Callback zeichnet keinen überholten Reiter');

    const frisch=await K(`(() => {
      tab='ranking';render();document.querySelector('[data-nav="history"]').click();
      invalidateCache();return _cache.version;})()`);
    await page.waitForFunction(()=>document.getElementById('main').getAttribute('aria-busy')!=='true');
    ok(await K('document.getElementById("main")._renderVersion')===frisch,'Ein geplanter Wechsel zeichnet den aktuellen Datenstand');
    ok(await K('document.querySelector("[data-nav=history]").getAttribute("aria-current")==="page"'),'Die aktive Navigation ist auch ohne Farbe erkennbar');

    // Hintergrundabrufe dürfen einen Regler unter dem Finger nicht ersetzen.
    const tick=await K(`(() => {window.__loadFn=loadAll;window.__ticks=0;loadAll=()=>{window.__ticks++};
      tab='settings';_tickDaten();const ruht=window.__ticks===0;
      tab='history';_tickDaten();loadAll=window.__loadFn;return {ruht,weiter:window.__ticks===1};})()`);
    ok(tick.ruht && tick.weiter,'Einstellungen ruhen unter Eingabe, Anzeige-Reiter behalten ihren Hintergrundtakt');
    await K(`window.__dbFn=sb.from;window.__archFn=autoArchiveSeasons;window.__syncFn=syncStoriesViaDb;
      window.__antwort={players,matches,config:cfg,seasons};window.__datenFehler=false;
      sb.from=table=>{const q={select:()=>q,order:()=>q,eq:()=>q,single:()=>q,
        then:resolve=>resolve(window.__datenFehler?{error:new Error('Eingabe-Testfehler')}:{data:window.__antwort[table]})};return q;};
      autoArchiveSeasons=async()=>{};syncStoriesViaDb=async()=>{};
      tab='match';M={A1:'',A2:players[1].id,B1:players[2].id,B2:players[3].id,pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:10,sb:5};
      render();window.__feld=document.querySelector('[data-combo="A1"]');window.__feld.focus();
      window.__feld.value='Noch nicht ausgewählt';window.__feld.setSelectionRange(7,7);
      _lastLoadFingerprint=null;0;`);
    await K('loadAll()');
    ok(await K('document.querySelector("[data-combo=A1]")===window.__feld && document.activeElement===window.__feld && window.__feld.value==="Noch nicht ausgewählt" && window.__feld.selectionStart===7'),
      'Auch ein bereits laufender Datenabruf bewahrt freien Eingabetext, Fokus und Cursor');
    await K('window.__datenFehler=true;loadAll()');
    ok(await K('document.querySelector("[data-combo=A1]")===window.__feld && window.__feld.value==="Noch nicht ausgewählt"'),
      'Ein fehlgeschlagener Datenabruf ersetzt kein laufendes Matchformular');
    await K(`window.__datenFehler=false;tab='settings';render();window.__regler=document.getElementById('cfgK');
      window.__regler.value='17';window.__regler.focus();_lastLoadFingerprint=null;loadAll();`);
    await K('loadAll()');
    ok(await K('document.getElementById("cfgK")===window.__regler && window.__regler.value==="17" && document.activeElement===window.__regler'),
      'Eine späte Datenantwort ersetzt keinen Regler unter dem Finger');
    await K('sb.from=window.__dbFn;autoArchiveSeasons=window.__archFn;syncStoriesViaDb=window.__syncFn');
    await K('render=window.__renderFn');
    ok(errors.length===0,'Keine Browserfehler beim Zusammenfassen und Abbrechen');
  }finally{await browser.close();}
  console.log(fails?`${fails} von ${checks} CHECKS FEHLGESCHLAGEN`:`ALLE ${checks} CHECKS BESTANDEN`);
  if(fails)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
