// ╔═══ §10.1 ─── BIND (globaler Click-Dispatcher) ──────────────────────╗
//     Zentrale Stelle, die data-* Attribute auf Click-Handler mappt.
// ╚═════════════════════════════════════════════════════════════════════════╝
function bind(){
  const main=document.getElementById('main');if(!main) return;
  main.querySelectorAll('[data-info="positionen"]').forEach(b => b.onclick = zeigePositionsInfo);
  // Die Einblicke über den Ranglisten klappen auf, ohne neu zu zeichnen.
  einblickBinden(document.getElementById('main'));
  main.querySelectorAll('.einblick.auf .einblick-i').forEach(bindDetailLinks);
  // Die Spielersuche in der Ewigen Tafel ist entfallen. Ihr
  // Schnell-Neuzeichnen hat .rlist ohnehin selbst neu aufgebaut und kannte
  // weder das Podest noch die Heldenzeile — nach dem ersten Tastendruck
  // standen die ersten drei doppelt in der Liste.

  // Eine Suche ersetzt nur ihre Ergebnisliste. Das Feld selbst bleibt stehen:
  // keine Tastatur schließt, kein Cursor springt und keine Komposition bricht ab.
  const ts=document.getElementById('teamSearch');
  if(ts){
    let bild=null,komposition=false;
    const suchen=()=>{
      teamSearch=ts.value;
      if(komposition || bild!==null) return;
      bild=requestAnimationFrame(()=>{
        bild=null;
        if(komposition || tab!=='teams' || document.getElementById('teamSearch')!==ts) return;
        const ergebnis=vTeams(true),liste=document.getElementById('teamResults'),kopf=document.getElementById('teamCount');
        if(!liste || !kopf || !ergebnis || typeof ergebnis!=='object') return;
        liste.innerHTML=ergebnis.html;kopf.textContent=ergebnis.kopf;
        liste.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{
          const [a,b]=el.dataset.team.split('|');if(a&&b) showTeam(a,b);
        });
        // Die Duos mit Karriereende folgen derselben Suche [§C40]; zu
        // gezeichnet wird ihr Inhalt erst beim Aufklappen.
        const ruhe=document.querySelector('[data-einblick="ruhe_teams"].auf .einblick-i');
        if(ruhe){ ruhe.innerHTML=ergebnis.ruhe||''; bindDetailLinks(ruhe); }
        // Der letzte vollständige Render darf nicht dieselben alten Ergebnisse
        // behaupten, nachdem die Liste gezielt ausgetauscht worden ist.
        document.getElementById('main')._renderHtml=null;
      });
    };
    ts.oninput=e=>{teamSearch=ts.value;if(!e.isComposing) suchen();};
    ts.addEventListener('compositionstart',()=>{komposition=true;});
    ts.addEventListener('compositionend',()=>{komposition=false;suchen();});
  }

  main.querySelectorAll('[data-metric]').forEach(b=>b.onclick=()=>{rankMetric=b.dataset.metric;_renderNachEingabe();});
  // Der Zeitraumwechsel setzt die gewählte Saison zurück. Sie gilt nur unter
  // „Saison"; bliebe sie über einen Ausflug in „Woche" hinweg stehen, böten
  // die Saison-Tools darunter weiter den Mai an, während oben die laufende
  // Woche steht — und beim Zurückwechseln stünde plötzlich wieder der Mai da.
  main.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{
    period=b.dataset.period;ligaSeasonId=null;_renderNachEingabe();});
  // v9: Saison-Tools am Ende der Rangliste (Recap + Positionsverlauf)
  // Welche Saison gemeint ist, steht am Knopf — _seasonToolsHtml setzt sie
  // aus der Saison, die der Liga-Tab gerade zeigt.
  main.querySelectorAll('[data-seasontool]').forEach(b=>b.onclick=()=>{
    const sid=b.dataset.sid;
    if(b.dataset.seasontool==='pos'){ showPositionHistory(sid); return; }
    const s=seasons.find(x=>x.id===sid);
    if(s) showSeasonRecap(s);
  });
  const ap=document.getElementById('addPlayerBtn');if(ap)ap.onclick=showAddPlayer;

  // positions toggle (reuse rankMetric)
  main.querySelectorAll('[data-postoggle]').forEach(b=>b.onclick=()=>{rankMetric=b.dataset.postoggle;_renderNachEingabe();});
  main.querySelectorAll('[data-possort]').forEach(b=>b.onclick=()=>{posSort=b.dataset.possort;_renderNachEingabe();});

  // awards anklickbar
  main.querySelectorAll('[data-award]').forEach(el=>el.onclick=()=>showAward(el.dataset.award));
  main.querySelectorAll('[data-awperiod]').forEach(b=>b.onclick=()=>{awPeriod=b.dataset.awperiod;if(awPeriod!=='season')awSeasonId=null;if(awPeriod!=='week')awWeekStart=null;_renderNachEingabe();});
  main.querySelectorAll('[data-awview]').forEach(b=>b.onclick=()=>{awView=b.dataset.awview;rekKammer='';_renderNachEingabe();});
  main.querySelectorAll('[data-rekkammer]').forEach(b=>b.onclick=()=>{rekKammer=b.dataset.rekkammer;_renderNachEingabe();});
  // Rekorde- und Chronik-Reiter tragen dieselben Elemente wie das
  // Chronik-Blatt — also brauchen sie auch dessen Verdrahtung.
  if(awView!=='awards'){
    const c=document.getElementById('main');
    if(c) _bindChronikClicks(c);
    chronikMatrixScrollen(c);
  }
  // Die Saison-Zeitleiste liefert Knöpfe statt eines <select>. Gebunden wird
  // am Rahmen, nicht am einzelnen Knopf: das sind zwei Zuhörer statt einem
  // Dutzend, und die Zuordnung „welcher Einsatzort" hängt an der id, die das
  // Bauteil mitbringt.
  const swBind=(id,fn)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.onclick=e=>{
      const b=e.target.closest('[data-saisonwahl]');
      if(b && el.contains(b)) fn(b.dataset.saisonwahl);
    };
  };
  swBind('awSeasonPicker', sid=>{awSeasonId=sid;_renderNachEingabe();});
  swBind('ligaSeasonPicker', sid=>{
    ligaSeasonId = sid===currentSeason().id ? null : sid;
    _renderNachEingabe();window.scrollTo(0,0);});

  // Liga: Spieler/Duo-Umschalter
  main.querySelectorAll('[data-ligasicht]').forEach(b=>b.onclick=()=>{
    ligaSicht=b.dataset.ligasicht;_renderNachEingabe();});

  // teams toggle (eigene State-Variable teamView)
  main.querySelectorAll('[data-teamtoggle]').forEach(b=>b.onclick=()=>{teamView=b.dataset.teamtoggle;_renderNachEingabe();});
  
  // teams sort (neue State-Variable teamSort)
  main.querySelectorAll('[data-teamsort]').forEach(b=>b.onclick=()=>{teamSort=b.dataset.teamsort;_renderNachEingabe();});


  // detail
  main.querySelectorAll('[data-detail]').forEach(el=>el.onclick=()=>showPlayer(el.dataset.detail));
  // team detail
  main.querySelectorAll('[data-team]').forEach(el=>el.onclick=()=>{
    const [a,b]=el.dataset.team.split('|');
    if(a&&b) showTeam(a,b);
  });
  // head-to-head detail (asymmetrisch: erste ID = "Du", zweite = Gegenüber)
  main.querySelectorAll('[data-h2h]').forEach(el=>el.onclick=(e)=>{
    e.stopPropagation();
    const [a,b]=el.dataset.h2h.split('|');
    if(a&&b) showH2H(a,b);
  });
  // v9.16: Statistik-Karten öffnen die Top-5-Rangliste dahinter statt direkt
  // ein Profil. stopPropagation, damit ein umgebendes [data-detail]/[data-team]
  // nicht zusätzlich feuert.
  main.querySelectorAll('[data-toplist]').forEach(el=>{
    el.style.cursor='pointer';
    el.onclick=(e)=>{ e.stopPropagation(); openTopList(el.dataset.toplist); };
  });

  // Liga-Chronik (§13) — Einstieg im Awards-Tab
  const lcb=document.getElementById('ligaChronikBtn');
  if(lcb) lcb.onclick=()=>showLigaChronik();

  // history filter
  const hs=document.getElementById('histSel');if(hs)hs.onchange=()=>{histFilter=hs.value;_histPage=0;_renderNachEingabe();};
  main.querySelectorAll('[data-match]').forEach(el=>el.onclick=e=>{
    if(e.target.dataset.delmatch)return; showMatchDetail(el.dataset.match);});
  main.querySelectorAll('[data-delmatch]').forEach(el=>el.onclick=e=>{
    e.stopPropagation(); showMatchDetail(el.dataset.delmatch);});

  // ═══ PAGINIERUNGS-BUTTONS FÜR VERLAUFSTAB ═══
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  if(prevPageBtn) prevPageBtn.onclick = () => {
    _histPage = Math.max(0, _histPage - 1);
    _renderNachEingabe();
  };
  if(nextPageBtn) nextPageBtn.onclick = () => {
    _histPage = Math.min(+nextPageBtn.dataset.historymax, _histPage + 1);
    _renderNachEingabe();
  };

  // match builder
  if(document.getElementById('saveM')){
    // Positions-Dropdown — Partner-Position automatisch umdrehen
    main.querySelectorAll('[data-pos]').forEach(s=>s.onchange=()=>{
      readM();
      // Partner gleicher Team hat immer entgegengesetzte Position
      const k=s.dataset.pos;
      const partner = k==='A1'?'A2':k==='A2'?'A1':k==='B1'?'B2':'B1';
      M['p'+partner] = M['p'+k]==='atk' ? 'def' : 'atk';
      // Partner-Dropdown im DOM nachziehen
      const partnerSel=main.querySelector(`[data-pos="${partner}"]`);
      if(partnerSel) partnerSel.value=M['p'+partner];
      requestMatchPreview();
    });

    // Text-Modus: Combobox mit Vorschlägen
    main.querySelectorAll('[data-combo]').forEach(inp=>bindCombo(inp));

    // Score: Stepper
    main.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
      const[k,d]=b.dataset.step.split(',');M[k]=Math.max(0,Math.min(10,M[k]+(+d)));
      const el=document.getElementById(k==='sa'?'svA':'svB');if(el){if(el.tagName==='INPUT')el.value=M[k];else el.textContent=M[k];}requestMatchPreview();});
    // Score: Klick zum Eintippen
    main.querySelectorAll('[data-scoreedit]').forEach(sp=>sp.onclick=()=>makeScoreEditable(sp));

    document.getElementById('clearM').onclick=()=>{M={A1:'',A2:'',B1:'',B2:'',pA1:'atk',pA2:'def',pB1:'atk',pB2:'def',sa:0,sb:0};render();};
    // Durchwechseln: 4 gewählte Spieler random in neue Teams mischen
    const shuf=document.getElementById('shuffleBtn');
    if(shuf) shuf.onclick=()=>{
      const ids=[M.A1,M.A2,M.B1,M.B2].filter(Boolean);
      if(ids.length!==4){toast('Erst 4 Spieler auswählen',true);return;}
      // Fisher-Yates Shuffle
      for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
      M.A1=ids[0];M.A2=ids[1];M.B1=ids[2];M.B2=ids[3];
      // Positionen nach Stärke-Profil: höherer atkStrength = Sturm
      const assignPos=(p1,p2)=>{
        const a1=atkStrength(p1), a2=atkStrength(p2);
        // Wahrscheinlichkeit dass p1 stürmt: basierend auf relativem Stärke-Unterschied
        // Bei gleichem Profil (67% vs 70%) → fast 50/50
        // Bei klarem Unterschied (90% vs 30%) → fast sicher der Stärkere
        const diff=a1-a2; // positiv = p1 ist eher Stürmer
        // sigmoid-artige Mapping: diff=0 → 50%, diff=0.5 → ~88%, diff=-0.5 → ~12%
        const prob=1/(1+Math.exp(-diff*6));
        return Math.random()<prob?{s:p1,d:p2}:{s:p2,d:p1};
      };
      const tA=assignPos(M.A1,M.A2);
      M.pA1=M.A1===tA.s?'atk':'def'; M.pA2=M.A2===tA.s?'atk':'def';
      const tB=assignPos(M.B1,M.B2);
      M.pB1=M.B1===tB.s?'atk':'def'; M.pB2=M.B2===tB.s?'atk':'def';
      toast('Teams gemischt','ok');render();
    };
    document.getElementById('saveM').onclick=doSaveMatch;
    readM();updatePreview();
  }

  // settings sliders
  bindSlider('cfgK','k_factor',v=>v,v=>Math.round(v));
  bindSlider('cfgRisk','risk_split',v=>v/100,v=>Math.round(v));
  bindSlider('cfgPos','pos_swing',v=>v/100,v=>Math.round(v));
  bindSlider('cfgWinBoost','win_boost',v=>v/100,v=>Math.round(v));
  bindSlider('cfgMovDamp','mov_loss_damp',v=>v/100,v=>Math.round(v));
  bindSlider('cfgLowEloLossDamp','low_elo_loss_damp',v=>v/100,v=>Math.round(v));
  bindSlider('cfgBonus','match_bonus',v=>v/10,v=>Math.round(v));
  // Neue Slider
  bindSlider('cfgStartElo','start_elo',v=>v,v=>Math.round(v));
  bindSlider('cfgExpW','exp_weight',v=>v/100,v=>Math.round(v));
  bindSlider('cfgPosMin','pos_min_games',v=>v,v=>Math.round(v));
  bindSlider('cfgMovMax','mov_max_boost',v=>v/100,v=>Math.round(v));
  bindSlider('cfgExpProt','exp_protect_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgUdElo','underdog_elo_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgUdGames','underdog_games_max',v=>v/100,v=>Math.round(v));
  bindSlider('cfgNpMult','new_player_mult',v=>v/100,v=>Math.round(v));
  bindSlider('cfgNpMidMult','new_player_mid_mult',v=>v/100,v=>Math.round(v));
  bindSlider('cfgVetDamp','veteran_damp',v=>v/100,v=>Math.round(v));
  const recalcBtn=document.getElementById('recalcBtn');
  if(recalcBtn) recalcBtn.onclick=async()=>{
    if(!(await bestaetigen({ic:'alert', gefahr:true, ja:'Neu berechnen',
      titel:'Alle Partien neu berechnen?',
      text:'Die gespeicherte Elo jeder Partie wird mit den aktuellen Reglern überschrieben. Vergangene Saisons und Auszeichnungen können sich dadurch ändern. Das lässt sich nicht rückgängig machen.'}))) return;
    toast('Berechne alle Matches neu…');
    await persistRecalc(matches);
    toast('Neuberechnung abgeschlossen','ok');
    await loadAll();
  };
  const forceReloadBtn=document.getElementById('forceReloadBtn');
  if(forceReloadBtn) forceReloadBtn.onclick=forceReload;
    // lockBtn2 entfernt

  // Backup & Export (§12)
  const expXlsxBtn=document.getElementById('expXlsxBtn');
  if(expXlsxBtn) expXlsxBtn.onclick=exportMatchesXlsx;
  const expCsvBtn=document.getElementById('expCsvBtn');
  if(expCsvBtn) expCsvBtn.onclick=exportMatchesCsv;
  const expSaveBtn=document.getElementById('expSaveBtn');
  if(expSaveBtn) expSaveBtn.onclick=exportSavepoint;
  const impBackupBtn=document.getElementById('impBackupBtn');
  if(impBackupBtn) impBackupBtn.onclick=startBackupImport;

  // Ausgeblendete Spieler wieder einblenden
  main.querySelectorAll('[data-unhide]').forEach(btn=>btn.onclick=async()=>{
    await sb.from('players').update({hidden:false}).eq('id',btn.dataset.unhide);
    toast('Eingeblendet','ok');
    await loadAll();
  });
// POTW Recap Button in Wochenansicht
const potwRecapWeekBtn = document.getElementById('potwRecapWeekBtn');
if(potwRecapWeekBtn){
  potwRecapWeekBtn.onclick = () => showPotwRecap();
}
// POTD Recap Button in Tagesansicht — force-Aufruf umgeht localStorage-Check
const potdRecapDayBtn = document.getElementById('potdRecapDayBtn');
if(potdRecapDayBtn){
  potdRecapDayBtn.onclick = () => showPotdRecap({force:true});
}

  };


// Combobox: Tippen filtert Spieler, Auswahl setzt M[key]
function bindCombo(inp){
  const key=inp.dataset.combo;
  const list=document.querySelector(`[data-combolist="${key}"]`);
  if(!list) return;
  let blurTimer=null,komposition=false,aktiv=-1;
  list.id='match-options-'+key;list.setAttribute('role','listbox');
  inp.setAttribute('role','combobox');inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-controls',list.id);inp.setAttribute('aria-expanded','false');
  const schliessen=()=>{list.classList.remove('show');inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');aktiv=-1;};
  const chosenIds=()=>[M.A1,M.A2,M.B1,M.B2].filter((v,i)=>['A1','A2','B1','B2'][i]!==key&&v);
  const waehlen=o=>{
    const p=pmap()[o.dataset.pick];
    if(!inp.isConnected || !ligaAktiv(p) || chosenIds().includes(p.id)) return;
    M[key]=p.id;inp.value=p.name;inp.classList.add('filled');schliessen();
    readM();requestMatchPreview();
  };
  const renderList=(q)=>{
    const taken=chosenIds();
    const gSim=getGlobalSim();
    const rankElo=p=>gSim.careerElo[p.id]??p.elo; // Karriere-Elo für Sortierung
    const dispElo=p=>Math.round(gSim.elo[p.id]??cfg.start_elo); // Saison-Elo für Anzeige
    let arr=[...activePlayers()].sort((a,b)=>rankElo(b)-rankElo(a)).filter(p=>!taken.includes(p.id));
    if(q)arr=arr.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
    aktiv=-1;inp.removeAttribute('aria-activedescendant');
    list.innerHTML=arr.length ? arr.slice(0,8).map((p,i)=>`<div class="combo-opt" id="match-choice-${key}-${i}" role="option" aria-selected="false" data-pick="${p.id}">${esc(p.name)}<span class="ce">${dispElo(p)}</span></div>`).join('')
      : `<div class="combo-opt empty">Kein Treffer</div>`;
    list.classList.add('show');inp.setAttribute('aria-expanded','true');
    list.querySelectorAll('[data-pick]').forEach(o=>{
      // Den Eingabefokus erhalten; so klappt die Bildschirmtastatur nicht
      // zwischen Vorschlag und Auswahl zu und ein Blur-Timer gewinnt nie.
      o.onpointerdown=e=>e.preventDefault();o.onclick=()=>waehlen(o);
    });
  };
  inp.onfocus=()=>{clearTimeout(blurTimer);renderList(inp.value && pmap()[M[key]] && pmap()[M[key]].name===inp.value ? '' : inp.value);};
  inp.oninput=e=>{M[key]='';inp.classList.remove('filled');requestMatchPreview();if(!komposition&&!e.isComposing) renderList(inp.value);};
  inp.addEventListener('compositionstart',()=>{komposition=true;});
  inp.addEventListener('compositionend',()=>{komposition=false;M[key]='';renderList(inp.value);requestMatchPreview();});
  inp.onblur=()=>{clearTimeout(blurTimer);blurTimer=setTimeout(()=>{if(document.activeElement!==inp) schliessen();},180);};
  inp.onkeydown=e=>{
    if(komposition || e.isComposing || e.keyCode===229) return;
    if(e.key==='Escape'){e.preventDefault();schliessen();return;}
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      e.preventDefault();if(!list.classList.contains('show')) renderList(inp.value);
      const opts=[...list.querySelectorAll('[data-pick]')];if(!opts.length) return;
      aktiv=aktiv<0?(e.key==='ArrowDown'?0:opts.length-1):(aktiv+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;
      opts.forEach((o,i)=>{o.setAttribute('aria-selected',String(i===aktiv));o.style.background=i===aktiv?'var(--surface3)':'';});
      inp.setAttribute('aria-activedescendant',opts[aktiv].id);opts[aktiv].scrollIntoView({block:'nearest'});
    }else if(e.key==='Enter' && list.classList.contains('show')){
      const opts=list.querySelectorAll('[data-pick]'),o=opts[aktiv<0?0:aktiv];
      if(o){e.preventDefault();waehlen(o);}
    }
  };
}

// Score per Klick eintippbar machen, nur 0–10
function makeScoreEditable(span){
  const k=span.dataset.scoreedit;
  const inp=document.createElement('input');
  inp.type='number'; inp.min=0; inp.max=10; inp.value=M[k];
  inp.id=span.id;inp.className='sval-input num'; inp.inputMode='numeric';inp.setAttribute('aria-label',k==='sa'?'Tore Team A':'Tore Team B');
  span.replaceWith(inp); inp.focus(); inp.select();
  const lesen=()=>{
    let v=parseInt(inp.value,10);if(isNaN(v))v=0;v=Math.max(0,Math.min(10,v));
    if(inp.value!=='' && Number(inp.value)!==v) inp.value=v;
    M[k]=v;requestMatchPreview();return v;
  };
  const commit=()=>{
    if(!inp.isConnected) return;
    const v=lesen();
    const ns=document.createElement('span');
    ns.className='sval num'; ns.id=(k==='sa'?'svA':'svB'); ns.dataset.scoreedit=k; ns.textContent=v;
    inp.replaceWith(ns); ns.onclick=()=>makeScoreEditable(ns);
  };
  inp.onblur=commit;
  inp.oninput=lesen;
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();inp.blur();}};
}
function bindSlider(id,key,toState,toLabel){
  const sl=document.getElementById(id);if(!sl)return;
  sl.oninput=()=>{document.getElementById(id+'v').textContent=toLabel(+sl.value);};
  sl.onchange=async()=>{
    const newVal=toState(+sl.value);
    const o={};o[key]=newVal;
    // Lokales State sofort updaten (synchron) damit die Vorschau & nächster Match-Save den
    // neuen Wert sieht. DB- und localStorage-Persistenz folgt asynchron.
    cfg[key]=newVal;
    invalidateCache();
    // DB-Update versuchen
    let dbOk=false;
    try{
      const {error}=await sb.from('config').update(o).eq('id',1);
      if(!error) dbOk=true;
      else console.warn('Config DB-Update fehlgeschlagen für',key,':',error.message);
    }catch(e){
      console.warn('Config DB-Update Exception:',e);
    }
    // localStorage-Fallback (z.B. neue Spalten die noch nicht in DB existieren)
    // Diese Overrides werden bei loadAll auf das DB-cfg geschmolzen.
    if(!dbOk){
      try{
        const overrides=JSON.parse(localStorage.getItem('cfg_overrides')||'{}');
        overrides[key]=newVal;
        localStorage.setItem('cfg_overrides',JSON.stringify(overrides));
      }catch(e){}
    } else {
      // Wenn DB jetzt klappt: alten localStorage-Override entfernen (sonst überschreibt
      // er bei loadAll den frischen DB-Wert).
      try{
        const overrides=JSON.parse(localStorage.getItem('cfg_overrides')||'{}');
        if(key in overrides){
          delete overrides[key];
          localStorage.setItem('cfg_overrides',JSON.stringify(overrides));
        }
      }catch(e){}
    }
    toast(dbOk?'Gespeichert':'Lokal gespeichert','ok');
  };
}

