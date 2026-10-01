(() => {
  'use strict';
  const {styles,levels,render}=TitleAura;
  const $=id=>document.getElementById(id);
  const state={style:'korona',level:6,crest:'zier',motion:true,solo:false};
  let uid=0;
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const number=n=>String(n).padStart(2,'0');
  const asset=(style=state.style,level=state.level)=>`assets/${style}/aura-${number(level)}.svg`;
  function emblem(style,level,animated=false){
    const node=document.createElement('div');node.className='ta-emblem'+(animated?' ta-animated':'');
    node.innerHTML=`<div class="ta-aura" aria-hidden="true">${render(style,level,{prefix:'preview-'+(++uid)})}</div><div class="ta-avatar" aria-hidden="true"><span>LM</span></div><img class="ta-insignium" src="insignien/${state.crest}.svg" alt="" width="1000" height="1000">`;
    return node;
  }
  function renderProgression(){
    $('progression').replaceChildren();
    levels.forEach((level,i)=>{
      const button=document.createElement('button');button.type='button';button.className='level-card';button.dataset.level=i+1;
      button.setAttribute('aria-label',`${i+1} Titel: ${level.name}`);
      button.setAttribute('aria-pressed',String(state.level===i+1));
      button.append(emblem(state.style,i+1));
      const foot=document.createElement('span');foot.className='level-card-footer';foot.innerHTML=`<b>${number(i+1)}</b><span>${level.name}</span>`;button.append(foot);
      button.addEventListener('click',()=>{state.level=i+1;update();});$('progression').append(button);
    });
  }
  function renderDirections(){
    $('directions').replaceChildren();
    Object.entries(styles).forEach(([key,style])=>{
      const button=document.createElement('button');button.type='button';button.className='direction-card';button.dataset.style=key;button.setAttribute('aria-pressed',String(key===state.style));
      button.append(emblem(key,state.level));
      const caption=document.createElement('div');caption.className='direction-caption';caption.innerHTML=`<h3>${style.name}</h3><p>${style.description}</p>`;button.append(caption);
      button.addEventListener('click',()=>{state.style=key;renderProgression();update();});$('directions').append(button);
    });
  }
  function motionStatus(){
    $('motionStatus').textContent=motionQuery.matches?'Ruhige Ansicht · reduzierte Bewegung aktiv':state.motion?'Licht bewegt sich · Insignium bleibt ruhig':'Bewegung pausiert · statische Ansicht';
    $('mainEmblem').classList.toggle('ta-still',!state.motion);
    $('motion').setAttribute('aria-pressed',String(state.motion));
    $('motion').innerHTML=`<span aria-hidden="true">${state.motion?'Ⅱ':'▷'}</span> Bewegung`;
  }
  function update(){
    const style=styles[state.style],level=levels[state.level-1];
    $('mainAura').innerHTML=render(state.style,state.level,{prefix:'hero-'+(++uid)});
    $('mainCrest').src=`insignien/${state.crest}.svg`;
    $('mainEmblem').setAttribute('aria-label',`${style.name}, ${state.level} Titel: ${level.name}${state.solo?', nur Licht':', hinter dem '+$('crest').selectedOptions[0].textContent}`);
    $('sceneCode').textContent=style.name.toUpperCase()+' / '+number(state.level);
    $('identityTitles').textContent=state.level+' TITEL';$('levelNumber').textContent=number(state.level);$('levelThreshold').textContent=state.level+' TITEL';
    $('levelName').textContent=level.name;$('levelDescription').textContent=level.detail;
    $('download').href=asset();
    $('download').download=`${state.style}-aura-${number(state.level)}.svg`;
    if(location.protocol==='file:'){$('download').removeAttribute('download');$('download').target='_blank';$('download').rel='noopener';$('download').innerHTML='SVG-Datei öffnen <span aria-hidden="true">↗</span>';}
    document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.level===state.level)));
    document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===state.style)));
    renderDirections();motionStatus();$('status').textContent=`${style.name}: ${state.level} Titel, ${level.name}.`;
  }
  Object.entries(styles).forEach(([key,style],i)=>{
    const button=document.createElement('button');button.type='button';button.className='style-choice';button.dataset.style=key;
    button.innerHTML=`<span aria-hidden="true">${['☼','◌','≈'][i]}</span><span><strong>${style.name}</strong><small>${style.subtitle}</small></span>`;
    button.addEventListener('click',()=>{state.style=key;renderProgression();update();});$('styles').append(button);
  });
  levels.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.dataset.level=i+1;b.textContent=i+1;b.setAttribute('aria-label',`${i+1} Titel anzeigen`);b.addEventListener('click',()=>{state.level=i+1;update();});$('levels').append(b);});
  $('crest').addEventListener('change',e=>{state.crest=e.target.value;renderProgression();update();});
  $('motion').addEventListener('click',()=>{state.motion=!state.motion;motionStatus();});
  $('solo').addEventListener('click',()=>{state.solo=!state.solo;document.body.classList.toggle('solo-light',state.solo);$('solo').setAttribute('aria-pressed',String(state.solo));update();});
  motionQuery.addEventListener('change',motionStatus);
  renderProgression();update();
})();
