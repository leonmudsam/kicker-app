// Reproduzierbare lokale Messung mit den echten Liga-Fixtures, ohne Backend.
// node tools/performance.cjs [--ausgabe=<Pfad.json>] [--profil] [--cpu=4] [--mobil]
// Gemessen wird synchrones JavaScript samt erstem Layout, kein Netzwerk.
const fs=require('node:fs');
const path=require('node:path');
const chromium=require('../tests/browser.js').ladeChromium();
if(!chromium) throw new Error('Die Messung benötigt den vorhandenen Chromium-Testbrowser.');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(require('../tests/ziel.js'),'utf8');
const blocks=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).sort((a,b)=>b.length-a.length);
let code=blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/,'/* Messstand ohne Boot-Abfragen */');
const end=code.lastIndexOf('})();');
code=code.slice(0,end)+'\nwindow.__perfEval=s=>eval(s);\n'+code.slice(end);
const head=html.slice(0,html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g,'');
const styles=(head.match(/<style[^>]*>[\s\S]*?<\/style>/gi)||[]).join('\n');
const body=html.slice(html.indexOf('<body'),html.indexOf('<script',html.indexOf('<body')));
const names=['Alex','Anton','Henry','Jane','Jannik','Johannes','Julian','Leo','Leon','Martin','Maxi','Stefan'];
const ids=names.map((_,i)=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
const data=fs.readFileSync(path.join(root,'tests/fixtures/matches.txt'),'utf8').trim().split(';').map((row,i)=>{
  const f=row.split(',').map(Number),pos=k=>f[4+k]===0?'atk':'def';
  return {id:'m'+String(i).padStart(4,'0'),a1:ids[f[0]],a2:ids[f[1]],b1:ids[f[2]],b2:ids[f[3]],
    a1_pos:pos(0),a2_pos:pos(1),b1_pos:pos(2),b2_pos:pos(3),score_a:f[8],score_b:f[9],winner:f[10]===0?'A':'B',exp_a:f[11]/1000,created_at:new Date(f[12]*1000).toISOString(),deltas:{}};
});
const players=names.map((name,i)=>({id:ids[i],name,hidden:false,elo:0,atk:.5,avatar_id:null}));
const seasons=['05','06','07'].map(m=>({id:'2026-'+m,start_date:`2026-${m}-01`,end_date:`2026-${m}-31`}));
const boot=`(() => {
  const stub=()=>new Proxy(function(){},{get(_,p){return p==='then'?undefined:stub()},apply(){return stub()}});
  window.supabase={createClient:()=>({from:()=>stub(),channel:()=>stub(),rpc:()=>stub(),removeChannel(){}})};
  window.fetch=()=>new Promise(()=>{}); window.setInterval=()=>0;
  const RD=Date;window.__perfJetzt=new RD(2026,7,26,21).getTime();
  window.Date=class extends RD{constructor(...a){a.length?super(...a):super(window.__perfJetzt)}static now(){return window.__perfJetzt}};
})();`;
const setup=`
  players=${JSON.stringify(players)}; matches=${JSON.stringify(data)}; seasons=${JSON.stringify(seasons)};
  invalidateCache();
  const delta=new Map(simulateEloWithSliders(matches).history.map(h=>[h.matchId,h.deltas]));
  matches.forEach(m=>m.deltas=delta.get(m.id)||{}); invalidateCache();
  const sim=getGlobalSim();
  seasons.forEach(s=>{
    const pl=sim.seasonPlayed[s.id]||{},e=sim.seasonEndElos[s.id]||{};
    s.top_elo=JSON.stringify(Object.keys(pl).filter(id=>pl[id]>0).map(id=>({id,elo:Math.round(e[id]||0),wins:0,losses:0})).sort((a,b)=>b.elo-a.elo).slice(0,3));
  });
  invalidateCache();
`;
const cases=[
  ['Liga',`tab='ranking';period='season';rankMetric='elo';`,'render()'],
  ['Positionen',`tab='positions';rankMetric='atk';`,'render()'],
  ['Rekorde',`tab='awards';awView='rekorde';rekKammer='';`,'render()'],
  ['Chronik',`tab='awards';awView='chronik';`,'render()'],
  ['Verlauf',`tab='history';histFilter='all';_histPage=0;`,'render()'],
  ['Profil',`tab='ranking';` ,`showPlayer('${ids[8]}')`],
  ['News',`_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;`,'openNewsFeed()']
];
const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function createHarness({cpu=1}={}){
  if(!Number.isFinite(cpu) || cpu<1 || cpu>20) throw new Error('CPU-Faktor muss zwischen 1 und 20 liegen.');
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><html><head><meta charset="utf-8">'+styles+'</head>'+body+'</html>');
    await page.addScriptTag({content:boot});await page.addScriptTag({content:code});
    const K=s=>page.evaluate(s=>window.__perfEval(s),s);
    await K(setup);
    if(cpu!==1){
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    }
    return {browser,page,K,errors};
  }catch(e){await browser.close();throw e;}
}
module.exports={createHarness};
if(require.main===module) (async()=>{
  const cpu=Number((process.argv.find(a=>a.startsWith('--cpu='))||'--cpu=1').slice(6));
  const {browser,page,K,errors}=await createHarness({cpu});
  try{
    const profiling=process.argv.includes('--profil');
    if(profiling) await K(`(() => {
      window.__perfZaehler={};
      const names=['playerStats','simulateElo','getGlobalSim','seasonPeakElos','_periodWinnerMap','getBadgeEarnedCache','prestigeTabelle','allChronicles','_chronicleCtx','_seasonTitleCtx','seasonTitles','getAllPlayerRanks','_spWappen','_newsCardHtmlM2','_newsFaeden','getCachedAwardRankings','_buildStories','getStoriesCache','openSheet','showPlayer'];
      for(const name of names){
        try{const fn=eval(name);if(typeof fn!=='function')continue;
          const wrapped=function(...args){const t=performance.now();try{return fn.apply(this,args)}finally{const z=window.__perfZaehler[name]||(window.__perfZaehler[name]={aufrufe:0,ms:0});z.aufrufe++;z.ms+=performance.now()-t;}};
          eval(name+'=wrapped');
        }catch(e){}
      }
    })()`);
    const result={partien:data.length,viewport:390,cpuFaktor:cpu,browser:browser.version(),einheit:'ms · synchrones JS + erstes Layout · Median',messungen:[]};
    for(const [label,prepare,action] of cases){
      const cold=[],warm=[];let last;
      for(let i=0;i<3;i++){
        await K(`closeSheet(true);players=players.slice();matches=matches.slice();invalidateCache();${prepare}`);
        last=await K(`(() => {const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;void document.getElementById('main').offsetHeight;return performance.now()-t;})()`);
        cold.push(last);
        for(let j=0;j<3;j++) warm.push(await K(`(() => {const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;void document.getElementById('main').offsetHeight;return performance.now()-t;})()`));
      }
      result.messungen.push({ansicht:label,kalt:+median(cold).toFixed(2),warm:+median(warm).toFixed(2)});
      console.log(label,JSON.stringify(result.messungen.at(-1)));
    }
    if(process.argv.includes('--mobil')){
      result.interaktionen=[];
      const actions=[
        ['Tabwechsel',`closeSheet(true);tab='ranking';period='season';render();` ,`document.querySelector('[data-nav="history"]').click()`],
        ['Profil erstmals',`closeSheet(true);tab='ranking';render();`, `showPlayer('${ids[8]}')`],
        ['News öffnen',`closeSheet(true);_cache._stories=_buildStories();_cache._consolFrom=null;_cache._frischVon=null;`, 'openNewsFeed()'],
        ['Generator kalt',`closeSheet(true);invalidateCache();`, '_buildStories()']
      ];
      for(const [ansicht,prepare,action] of actions){
        await K(prepare);
        const r=await K(`(async()=>{
          const frames=[],tasks=[];let ende=false,last=performance.now();
          const obs=new PerformanceObserver(list=>list.getEntries().forEach(e=>tasks.push(e.duration)));
          obs.observe({type:'longtask',buffered:false});
          const frame=t=>{frames.push(t-last);last=t;if(!ende)requestAnimationFrame(frame)};
          last=await new Promise(requestAnimationFrame);requestAnimationFrame(frame);
          await new Promise(requestAnimationFrame);
          const t=performance.now();${action};void document.getElementById('sheet').offsetHeight;
          void document.getElementById('main').offsetHeight;const synchron=performance.now()-t;
          await new Promise(r=>setTimeout(r,900));ende=true;obs.disconnect();
          return {synchron:+synchron.toFixed(2),laengstesBild:+Math.max(0,...frames).toFixed(2),
            longTasks:tasks.length,laengsterTask:+Math.max(0,...tasks).toFixed(2)};
        })()`);
        result.interaktionen.push({ansicht,...r});console.log(ansicht,JSON.stringify(r));
      }
    }
    if(profiling) result.profil=await page.evaluate(()=>window.__perfZaehler);
    if(errors.length) throw new Error(errors.join('\n'));
    console.log(JSON.stringify(result,null,2));
    const output=process.argv.find(a=>a.startsWith('--ausgabe='));
    if(output) fs.writeFileSync(path.resolve(root,output.slice(10)),JSON.stringify(result,null,2)+'\n');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
