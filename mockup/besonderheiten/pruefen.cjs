'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {measureFixture,recordRuns,measureStops}=require('./messung.cjs');
const {begegnungsFolgen,teamGefalle,gegensprung,rollenKontrast}=require('./partie-messung.cjs');
const root=path.resolve(__dirname,'../..');
let checks=0;
function check(name,fn){fn();checks++;console.log('✓ '+name);}
const source=fs.readFileSync(path.join(root,'src/js/32-chronik-katalog.js'),'utf8');
const live=vm.runInNewContext(source+';DISZIPLINEN.map(d=>({id:d.id,name:d.name,monat:d.monat&&{art:d.monat.art,cond:d.monat.cond},allzeit:d.allzeit&&{kammer:d.allzeit.kammer,cond:d.allzeit.cond}}))');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'katalog.js'),'utf8'),sandbox);
check('Statischer Katalog stimmt vollständig mit src überein',()=>assert.equal(JSON.stringify(live),JSON.stringify(sandbox.window.BESONDERHEITEN_KATALOG)));
check('71 Rekorde und 60 Monatschroniken statt veralteter Entwurfszahlen',()=>{
  assert.equal(live.filter(d=>d.allzeit).length,71);
  assert.equal(live.filter(d=>d.monat).length,60);
});
const fixture=measureFixture();
const leaders=Object.fromEntries(fixture.leaders.map(d=>[d.key,d]));
check('Fixture-Zulassung und gemessene Bestwerte stimmen',()=>{
  assert.equal(fixture.fixtureMatches,466);assert.equal(fixture.counts.rated,11);
  assert.equal(fixture.rows.find(p=>p.name==='Anton').eligible,false);
  for(const [key,value,holders] of [['heart',3,['Jane','Martin']],['wander',21,['Stefan']],['commuter',10,['Leo','Maxi']],['escape',17,['Stefan']],['stopped',13,['Johannes','Leon','Martin']]]){
    assert.equal(leaders[key].value,value);assert.deepEqual(leaders[key].holders,holders);
  }
  assert.equal(leaders.echo.holders.length,7);
  assert.equal(fixture.rows.find(p=>p.name==='Stefan').proof.escape.closedBy,'m0365');
  assert.equal(fixture.rows.find(p=>p.name==='Johannes').proof.stopped.stoppedBy,'m0408');
  assert.equal(fixture.rows.find(p=>p.name==='Leon').proof.stopped.stoppedBy,'m0095');
  assert.equal(fixture.rows.find(p=>p.name==='Martin').proof.stopped.opponentName,'Julian');
});
const match=(gf,ga,extra={})=>({gf,ga,role:'atk',partner:'A',won:gf>ga,opponents:['G'],...extra});
check('Gleicher Ein-Tor-Anteil kann verschiedene Herzschlagläufe haben',()=>{
  const separated=recordRuns([1,7,1,7,1,7].map(n=>match(10,10-n)));
  const consecutive=recordRuns([1,1,1,7,7,7].map(n=>match(10,10-n)));
  assert.equal(separated.heart,1);assert.equal(consecutive.heart,3);
});
check('Kleine und negative Ergebnisfolgen werden nicht durch Mindestleistung gelöscht',()=>{
  assert.equal(recordRuns([match(2,10)]).heart,0);
  assert.equal(recordRuns([match(9,10)]).heart,1);
  assert.equal(recordRuns([match(9,10),match(9,10)]).heart,2);
  assert.equal(recordRuns([match(1,10),match(1,10)]).echo,2);
});
check('Partnerwiederkehr erlaubt; unbekannte Zuordnung unterbricht',()=>{
  assert.equal(recordRuns(['A','B','A','B'].map(partner=>match(2,10,{partner}))).wander,4);
  assert.equal(recordRuns(['A','B',null,'A','B'].map(partner=>match(2,10,{partner}))).wander,2);
});
check('Rollenfolge bricht an fehlender Position und setzt nicht nur eine Quote fort',()=>{
  assert.equal(recordRuns(['atk','def','atk','def'].map(role=>match(2,10,{role}))).commuter,4);
  assert.equal(recordRuns(['atk','def',null,'atk','def'].map(role=>match(2,10,{role}))).commuter,2);
});
check('Ausbruch verlangt Schluss-Sieg, kennt keinen 17er-Mindestwert',()=>{
  assert.equal(recordRuns([match(1,10)]).escape,null);
  assert.equal(recordRuns([match(1,10),match(10,7)]).escape,1);
  assert.equal(recordRuns([match(1,10),match(10,2,{opponents:['X']}),match(1,10),match(10,7)]).escape,2);
});
check('Ergebnis-Häufigkeit ist keine unmittelbare Folge',()=>{
  const r=recordRuns([match(10,8),match(10,7),match(10,8)].map(m=>({...m,day:'2026-08-03'})));
  assert.equal(r.echo,1);assert.equal(r.repeater,2);
});
check('Monatsbeispiele werden ohne falschen Mittelwert gerechnet',()=>{
  const old=(14+1)/(20+10),now=(8+8)/(10+40);
  assert.equal(old,.5);assert.equal(now,.32);
  assert.ok(Math.abs((.4-.4)-(.1-.35)-.25)<1e-12);
  const spiegel=2*10*9*10*9/(20*19*18*17);
  assert.ok(Math.abs(spiegel-.139318885449)<1e-10);
  const umkehr=2*9*21/(30*29);
  assert.ok(Math.abs(umkehr-.43448275862)<1e-10);
  assert.ok(Math.abs((Math.abs(.7-.2)+Math.abs(.1-.7)+Math.abs(.2-.1))*.5-.6)<1e-12);
});
const stopMatch=(players,winner,id,timestamp)=>({players,winner,id,timestamp});
check('Serienstopp liest beide Gegnerstände vor dem Fortschreiben; eins genügt',()=>{
  const r=measureStops([
    stopMatch(['A','B','C','D'],'A','start'),
    stopMatch(['A','B','C','D'],'B','stopp')
  ]);
  assert.equal(r.get('A').stopped,null);
  assert.equal(r.get('C').stopped,1);
  assert.equal(r.get('D').stopped,1);
  assert.equal(r.get('C').proof.opponent,'A');
  assert.equal(r.get('D').proof.stoppedBy,'stopp');
});
check('Serienstopp zählt fremde Partien mit und ordnet nach Zeit und stabiler ID',()=>{
  const r=measureStops([
    stopMatch(['A','B','C','D'],'B','m3',300),
    stopMatch(['A','X','Y','Z'],'A','m2',100),
    stopMatch(['A','B','C','D'],'A','m1',100)
  ]);
  assert.equal(r.get('C').stopped,2);
  assert.equal(r.get('D').stopped,2);
  assert.equal(r.get('C').proof.opponent,'A');
  assert.equal(r.get('X').stopped,null);
  assert.throws(()=>measureStops([stopMatch(['A','A','C','D'],'A','bad')]),TypeError);
});
check('Bilanzparadox summiert Tore derselben Partien statt Quoten zu mitteln',()=>{
  const games=[...Array.from({length:4},()=>match(10,0)),...Array.from({length:8},()=>match(9,10))];
  const gf=games.reduce((n,m)=>n+m.gf,0),ga=games.reduce((n,m)=>n+m.ga,0);
  const q=games.filter(m=>m.won).length/games.length,t=gf/(gf+ga);
  assert.equal(gf,112);assert.equal(ga,80);assert.equal(q,1/3);
  assert.ok((q-.5)*(t-.5)<0);
  assert.ok(Math.abs(Math.min(Math.abs(q-.5),Math.abs(t-.5))-1/12)<1e-12);
  assert.notEqual(t,games.reduce((n,m)=>n+m.gf/(m.gf+m.ga),0)/games.length);
});
check('Beziehungs- und Rollenbeispiele belohnen keine hohe Gesamtquote',()=>{
  assert.ok(Math.abs(Math.abs((.2-.25)-(.15-.6))-.4)<1e-12);
  const rival=(.4-.1)-(.2-.3);
  assert.ok(Math.abs(rival-.4)<1e-12);
  const a=.1-(-.1),b=-.05-.05;
  assert.ok(a*b<0);assert.equal(Math.min(Math.abs(a),Math.abs(b)),.1);
  assert.ok(Math.abs((.8-0)-(.4-.1)-.5)<1e-12);
});
check('Chancenpendel vergleicht dieselbe Zusammensetzung statt pauschaler Referenz',()=>{
  const p=Array.from({length:20},(_,i)=>i%2?.8:.2);
  const step=xs=>xs.slice(1).reduce((n,x,i)=>n+Math.abs(x-xs[i]),0)/(xs.length-1);
  const reference=p.reduce((n,x,i)=>n+p.reduce((s,y,j)=>s+(i===j?0:Math.abs(x-y)),0),0)/(p.length*(p.length-1));
  assert.ok(Math.abs(step(p)-.6)<1e-12);
  assert.ok(Math.abs(reference-6/19)<1e-12);
  assert.ok(Math.abs(step([...p].sort())-.6/19)<1e-12);
});
check('Profildivergenz ist symmetrisch, endlich bei Nullzellen und null bei gleichen Profilen',()=>{
  const p=[0,0,0,.2,.4,.2,0,0,0,.2],q=[0,.1,.1,.1,.1,.1,.1,.1,.1,.2];
  const js=(a,b)=>a.reduce((n,x,i)=>{
    const y=b[i],m=(x+y)/2;
    return n+.5*(x?x*Math.log2(x/m):0)+.5*(y?y*Math.log2(y/m):0);
  },0);
  assert.ok(Math.abs(p.reduce((n,x)=>n+x,0)-1)<1e-12);
  assert.ok(Math.abs(q.reduce((n,x)=>n+x,0)-1)<1e-12);
  assert.ok(Number.isFinite(js(p,q))&&js(p,q)>0&&js(p,q)<=1);
  assert.equal(js(p,q),js(q,p));assert.equal(js(p,p),0);
});
const ownMatch=(partner,opponents)=>({partner,opponents});
check('Grenzverkehr wächst am Wiedersehen, Fixpunkt verlangt jede eigene Partie',()=>{
  const result=begegnungsFolgen([
    ownMatch('J',['A','B']),ownMatch('C',['J','D']),
    ownMatch('E',['F','G']),ownMatch('J',['H','I'])
  ]);
  assert.equal(result.grenzverkehr,3);assert.equal(result.fixpunkt,1);
  assert.equal(begegnungsFolgen([
    ownMatch('A',['J','B']),ownMatch('C',['J','D']),
    ownMatch('E',['J','F']),ownMatch('G',['H','I'])
  ]).fixpunkt,3);
});
check('Fehlende Aufstellungen verbinden keine Personenfäden; kleine Folgen bleiben gültig',()=>{
  assert.deepEqual(begegnungsFolgen([
    ownMatch('J',['A','B']),ownMatch(null,[]),ownMatch('C',['J','D'])
  ]),{grenzverkehr:1,fixpunkt:1});
  assert.deepEqual(begegnungsFolgen([]),{grenzverkehr:0,fixpunkt:0});
  assert.equal(begegnungsFolgen([
    ownMatch('A',['J','B']),ownMatch('A',['J','B'])
  ]).grenzverkehr,1);
});
check('Teamgefälle ist symmetrisch, erlaubt null und verwechselt fehlende Elo nicht mit null',()=>{
  assert.equal(teamGefalle(120,20),100);assert.equal(teamGefalle(20,120),100);
  assert.equal(teamGefalle(0,0),0);assert.equal(teamGefalle(-.2,.3),.5);
  assert.equal(teamGefalle(null,20),null);assert.equal(teamGefalle(NaN,20),null);
});
check('Gegensprung nutzt beide getauschten Gegner und respektiert unmittelbare Lücken / Saisonreset',()=>{
  const first={season:'2026-08',partner:'A',role:'atk',opponents:['B','C'],opponentElo:[20,40]};
  const next={...first,opponents:['D','E'],opponentElo:[100,120]};
  assert.equal(gegensprung(first,next),80);assert.equal(gegensprung(next,first),80);
  assert.equal(gegensprung(first,{...next,opponentElo:[10,50]}),0);
  assert.equal(gegensprung(first,{...next,opponents:['C','E']}),null);
  assert.equal(gegensprung(first,{...next,season:'2026-09'}),null);
  assert.equal(gegensprung(first,{...next,partner:'X'}),null);
  assert.equal(gegensprung(null,next),null);
  assert.equal(gegensprung(first,{...next,opponentElo:[null,120]}),null);
});
check('Rollenvergleiche gewichten Rollen gleich, nicht das Pensum; negative Bestwerte gültig',()=>{
  const groups={atkJa:[-.1],atkNein:[-.3],defJa:[-.15],defNein:[-.25]};
  assert.ok(Math.abs(rollenKontrast(groups)-.15)<1e-12);
  assert.ok(Math.abs(rollenKontrast({...groups,atkJa:Array(100).fill(-.1)})-.15)<1e-12);
  assert.ok(rollenKontrast({...groups,atkJa:[-.5],defJa:[-.5]})<0);
  assert.equal(rollenKontrast({atkJa:[0],atkNein:[0],defJa:[0],defNein:[0]}),0);
  assert.equal(rollenKontrast({...groups,defJa:[]}),null);
  assert.equal(rollenKontrast(groups,10),null);
  assert.throws(()=>rollenKontrast(groups,0),RangeError);
});
check('Neue Monatskontraste und Referenzmedian stimmen exakt',()=>{
  assert.ok(Math.abs((.4-.4)-(.1-.4)-.3)<1e-12);
  assert.ok(Math.abs(Math.abs(-.4-(-.1)-(-.1)+(-.1))-.3)<1e-12);
  const previous=[20,40,60,70,70,80,80,90,100,100,120,150];
  assert.equal((previous[5]+previous[6])/2,80);
  assert.ok(Math.abs(Math.abs((.3-.4)-(.1-.4))-.2)<1e-12);
});
check('Rückspielwelle hat eine bedingte Reihenfolge-Referenz, nicht pauschal 50 Prozent',()=>{
  const reference=2*5*15/(20*19);
  assert.ok(Math.abs(reference-.39473684210526316)<1e-12);
  assert.ok(Math.abs(5/10-reference-.10526315789473684)<1e-12);
  assert.equal(2*0*20/(20*19),0);
});
check('Doppelzone verlangt beide Profilränder; ein einzelner Rand genügt nicht',()=>{
  const own={eng:8/20,klar:8/20},rest={eng:8/40,klar:8/40};
  assert.equal(Math.min(own.eng-rest.eng,own.klar-rest.klar),.2);
  assert.ok(!(.8-rest.eng>0&&0-rest.klar>0));
});
check('Torwende zählt die Höhe nur über Niederlagen, ohne ein Bilanzparadox zu erfinden',()=>{
  const old=[...Array(8).fill([10,9]),...Array(12).fill([4,10])];
  const now=[...Array(4).fill([10,9]),...Array(16).fill([8,10])];
  const values=games=>{
    const losses=games.filter(([a,b])=>a<b);
    return {q:(games.length-losses.length)/games.length,m:losses.reduce((n,[a,b])=>n+b-a,0)/losses.length,balance:games.reduce((n,[a,b])=>n+a-b,0)};
  };
  const a=values(old),b=values(now),dq=b.q-a.q,dm=b.m-a.m;
  assert.deepEqual(a,{q:.4,m:6,balance:-64});assert.deepEqual(b,{q:.2,m:2,balance:-28});
  assert.ok(dq*dm>0);assert.equal(Math.min(Math.abs(dq),Math.abs(dm)/10),.2);
});
function tauVerdichtung(values){
  let c=0,d=0,t=0;
  for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++){
    if(values[j]<values[i])c++;else if(values[j]>values[i])d++;else t++;
  }
  const p=values.length*(values.length-1)/2;
  return p&&p>t?(c-d)/Math.sqrt(p*(p-t)):null;
}
check('Verdichtung berücksichtigt Bindungen und ist nicht mit der Ergebnisverteilung identisch',()=>{
  const values=Array.from({length:10},(_,i)=>[10-i,10-i]).flat();
  const value=180/Math.sqrt(190*180);
  assert.equal(tauVerdichtung(values),value);
  assert.equal(tauVerdichtung([...values].reverse()),-value);
  assert.equal(tauVerdichtung(Array(20).fill(2)),null);
  assert.equal(tauVerdichtung([]),null);
  assert.ok(Math.abs(value-.9733285267845752)<1e-12);
});

(async()=>{
  const chromium=require('../../tests/browser.js').ladeChromium();
  if(!chromium){console.log('Browserprüfung übersprungen: kein Chromium verfügbar.');process.exitCode=2;return;}
  const browser=await chromium.launch();
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',e=>errors.push(e.message));
    const remote=[];page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
    await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
    await page.waitForFunction(()=>window.BESONDERHEITEN_VORSCHLAEGE?.length===39);
    const proposals=await page.evaluate(()=>window.BESONDERHEITEN_VORSCHLAEGE);
    check('Vorschlags-IDs sind eindeutig und kopieren keine Live-Disziplin',()=>{
      assert.equal(new Set(proposals.map(p=>p.id)).size,39);
      assert.equal(proposals.filter(p=>p.bereich==='rekorde').length,15);
      assert.equal(proposals.filter(p=>p.bereich==='monate').length,24);
      for(const p of proposals){
        if(p.katalogId){assert.equal(p.katalogId,'ausbruch');assert.ok(live.some(d=>d.id===p.katalogId&&d.monat&&!d.allzeit));}
        else assert.ok(!live.some(d=>d.id===p.id),'Doppelte Disziplin: '+p.id);
      }
    });
    check('Doppelgesicht und Umschaltmoment bleiben gemeinsame Disziplinen mit zwei Zeitachsen',()=>{
      for(const id of ['doppelgesicht','umschaltmoment']){
        const pair=proposals.filter(p=>p.disziplinId===id);
        assert.equal(pair.length,2);
        assert.deepEqual(pair.map(p=>p.bereich).sort(),['monate','rekorde']);
        assert.equal(new Set(pair.map(p=>p.titel)).size,1);
        assert.ok(!live.some(d=>d.id===id));
      }
      for(const p of proposals)for(const key of ['frage','rechnung','mind','abgrenzung','risiko','beleg'])assert.ok(p[key]?.length>20,p.id+' / '+key);
    });
    check('Keine Monatsleiter mehr unter Rekorden; Ersatz wächst direkt am Match',()=>{
      assert.ok(!proposals.some(p=>p.id==='lange-leiter'||p.titel==='Die lange Leiter'));
      assert.ok(proposals.some(p=>p.id==='grenzverkehr'&&p.bereich==='rekorde'));
      for(const p of proposals.filter(p=>p.bereich==='rekorde'))assert.ok(!/je Monat|abgeschlossene.*Monate/i.test(p.basis));
    });
    check('Tabzahlen folgen dem Datenstand und jede Erweiterung hat eine Grafik',()=>{
      assert.equal(proposals.filter(p=>p.grafik==='erweiterung').length,27);
    });
    assert.equal(await page.locator('#tab-rekorde span').textContent(),'15');
    assert.equal(await page.locator('#tab-monate span').textContent(),'24');checks+=2;
    const missingGraphics=await page.evaluate(()=>window.BESONDERHEITEN_VORSCHLAEGE.filter(p=>{
      const card=document.querySelector('[data-detail="'+p.id+'"]').closest('.idee');
      return !card.querySelector('.bahn,.matrix,.vergleich,.grafik,.profil');
    }).map(p=>p.id));
    check('Alle 39 Karten enthalten ihre erklärende Grafik',()=>assert.deepEqual(missingGraphics,[]));
    async function noOverflow(label){
      const bad=await page.evaluate(()=>{
        const vw=document.documentElement.clientWidth;
        const bad=[];
        if(document.documentElement.scrollWidth>vw+1) bad.push('Dokument');
        for(const e of document.querySelectorAll('.idee,.beispiel,.blatt-kopf,.blatt-inhalt,.fakten,.wertzeile')){
          if(!e.getClientRects().length)continue;
          const r=e.getBoundingClientRect();
          if(r.left<-.5||r.right>vw+.5||e.scrollWidth>e.clientWidth+1)bad.push(e.className);
        }
        return bad;
      });
      assert.deepEqual(bad,[],label+': '+bad.join(', '));checks++;
    }
    for(const width of [320,390,1100]){
      await page.setViewportSize({width,height:844});
      for(const panel of ['rekorde','monate','pruefung']){
        await page.locator('#tab-'+panel).click();
        await noOverflow(width+'px / '+panel);
      }
      for(const p of proposals){
        await page.locator('#tab-'+(p.bereich==='rekorde'?'rekorde':'monate')).click();
        await page.locator('[data-detail="'+p.id+'"]').click();
        assert.equal(await page.locator('#detail').evaluate(e=>e.scrollTop),0);
        assert.equal(await page.locator('#detail-titel').textContent(),p.titel);
        await noOverflow(width+'px / '+p.id);
        await page.locator('#detail').evaluate(e=>e.scrollTop=e.scrollHeight);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
        checks++;
      }
      console.log('✓ Alle Bereiche und '+proposals.length+' Blätter bei '+width+'px ohne Überlauf; Start oben / Escape');
    }
    await page.locator('#tab-rekorde').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-monate').getAttribute('aria-selected'),'true');checks++;
    await page.locator('#tab-pruefung').click();await page.locator('.bestand > summary').click();
    assert.equal(await page.locator('#bestand section details').count(),131);checks++;
    await noOverflow('Vollständiger Katalog');
    assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks+=2;
    const out=path.join(root,'dist');fs.mkdirSync(out,{recursive:true});
    await page.setViewportSize({width:390,height:844});
    await page.locator('#tab-rekorde').click();await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(out,'besonderheiten-rekorde.png'),fullPage:true});
    await page.locator('#tab-monate').click();await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(out,'besonderheiten-monate.png'),fullPage:true});
    await page.locator('[data-detail="ergebnisdialekt"]').click();
    await page.screenshot({path:path.join(out,'besonderheiten-blatt.png')});
    await page.keyboard.press('Escape');await page.locator('#tab-rekorde').click();
    await page.locator('[data-detail="rueckeroberung"]').click();
    await page.screenshot({path:path.join(out,'besonderheiten-rueckeroberung.png')});
    await page.keyboard.press('Escape');
    await page.locator('[data-detail="grenzverkehr"]').click();
    await page.screenshot({path:path.join(out,'besonderheiten-grenzverkehr.png')});
    await page.keyboard.press('Escape');await page.locator('#tab-monate').click();
    await page.locator('[data-detail="umschaltmoment-monat"]').click();
    await page.screenshot({path:path.join(out,'besonderheiten-umschaltmoment.png')});
    console.log('✓ '+checks+' Prüfungen; keine JavaScriptfehler oder externen Requests');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
