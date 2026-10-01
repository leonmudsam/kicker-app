/* Standalone design asset factory. No application data or title calculations. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TitleAura = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const styles = {
    korona: {name:'Korona', subtitle:'Warmes, aufgefächertes Licht', description:'Ein weicher Goldschein mit unterschiedlich langen Lichtstrahlen. Ab den mittleren Stufen schimmern einzelne Goldpartikel im äußeren Licht.'},
    halo: {name:'Halo', subtitle:'Feine, schwebende Lichtkreise', description:'Ein diffuser Lichthof, durchzogen von offenen, leuchtenden Bögen. Wenige Lichtpunkte bewegen sich langsam auf ihren Bahnen.'},
    aurora: {name:'Aurora', subtitle:'Fließende Schleier aus Licht', description:'Sanfte Lichtschleier lösen sich hinter dem Reif. Ihre hellen Kanten fließen langsam um die Mitte, begleitet von fein verteiltem Goldstaub.'}
  };
  const levels = [
    {name:'Funke', detail:'Ein bereits sichtbarer, warmer Lichthof tritt hinter dem gesamten Insignium hervor.'},
    {name:'Glut', detail:'Der Lichtsaum wird breiter. Ein heller Kern gibt dem Schein mehr Tiefe.'},
    {name:'Schimmer', detail:'Erste feinere Lichtstrukturen treten aus dem weichen Hintergrund hervor.'},
    {name:'Lichthof', detail:'Feinere Lichtstrukturen und erste, ruhig schimmernde Goldpartikel kommen hinzu.'},
    {name:'Resonanz', detail:'Eine zweite Lichtschicht füllt die Außenkontur und verstärkt den Schimmer.'},
    {name:'Strahlkraft', detail:'Längere Lichtbahnen und sichtbar mehr Goldstaub erweitern die Auszeichnung.'},
    {name:'Glorie', detail:'Ein zusätzlicher Lichtimpuls läuft sehr langsam durch den äußeren Schein.'},
    {name:'Sonnenwind', detail:'Breitere Lichtstrukturen, gegenläufige Bewegung und dichterer Goldstaub erzeugen räumliche Tiefe.'},
    {name:'Zenit', detail:'Der große äußere Lichthof gewinnt klare Akzente und einzelne helle Lichtsterne.'},
    {name:'Unvergänglich', detail:'Die volle Lichtkomposition: weite Strahlung, zwei bewegte Tiefenebenen und sparsame brillante Reflexe.'}
  ];
  const n = x => +x.toFixed(2);
  const pt = (r,a) => [500+Math.cos(a)*r,500+Math.sin(a)*r];
  const p = x => x.map(n).join(' ');
  const path = (d,attributes='') => `<path d="${d}" ${attributes}/>`;
  const seed = i => {const x=Math.sin(i*91.127+36.11)*43758.5453; return x-Math.floor(x);};
  const arc = (r,start,end) => `M${p(pt(r,start))}A${r} ${r} 0 ${end-start>Math.PI?1:0} 1 ${p(pt(r,end))}`;
  function render(style, level, options={}) {
    if(!styles[style])style='korona';
    level=Math.min(10,Math.max(1,Math.round(Number(level)||1)));
    const id=(options.prefix||`titel-aura-${style}-${String(level).padStart(2,'0')}-`).replace(/[^a-zA-Z0-9_-]/g,'')+'-';
    const t=(level-1)/9, radius=345+95*t;
    const radial=(name,stops,r=470)=>`<radialGradient id="${id}${name}" gradientUnits="userSpaceOnUse" cx="500" cy="500" r="${r}">${stops.map(([o,c,a])=>`<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
    const defs=`<defs>
      ${radial('bloom',[[0,'#ffd69a',0],[.3,'#ffd69a',0],[.4,'#ffd486',.04],[.6,'#f5bc57',.20+.14*t],[.73,'#f3c570',.14+.12*t],[.88,'#cfa14e',.04+.045*t],[1,'#d4aa62',0]],radius+32)}
      ${radial('hot',[[0,'#fff3d3',0],[.37,'#fff0c7',0],[.5,'#fff0ce',.1+.13*t],[.57,'#f7d997',.22+.16*t],[.65,'#efc275',.08],[.83,'#d7ae67',0]],radius+5)}
      ${radial('beam',[[0,'#fff1ca',0],[.36,'#fff2d4',0],[.49,'#ffedc0',.23+.18*t],[.65,'#eaca85',.28+.22*t],[.84,'#d7b072',.07+.07*t],[1,'#be924d',0]],radius+12)}
      ${radial('thread',[[.25,'#fff4d6',0],[.49,'#fff3d4',.12],[.65,'#ffe4a6',.28+.2*t],[.88,'#dbba7a',.08],[1,'#cab181',0]],radius+25)}
      <linearGradient id="${id}arc" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="#f8dd9e" stop-opacity="0"/><stop offset=".22" stop-color="#fce8b7" stop-opacity=".15"/><stop offset=".5" stop-color="#fff4d3" stop-opacity=".7"/><stop offset=".72" stop-color="#dfb771" stop-opacity=".22"/><stop offset="1" stop-color="#dcb875" stop-opacity="0"/></linearGradient>
      <linearGradient id="${id}veil" x1=".1" y1=".1" x2=".9" y2=".9"><stop stop-color="#fce5b5" stop-opacity="0"/><stop offset=".28" stop-color="#f5d797" stop-opacity=".65"/><stop offset=".55" stop-color="#f4ce81" stop-opacity=".38"/><stop offset=".8" stop-color="#cfb788" stop-opacity=".18"/><stop offset="1" stop-color="#d4b583" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}point"><stop stop-color="#fffae5"/><stop offset=".14" stop-color="#ffe7ae" stop-opacity=".8"/><stop offset=".4" stop-color="#f4cd83" stop-opacity=".3"/><stop offset="1" stop-color="#edc079" stop-opacity="0"/></radialGradient>
      <filter id="${id}soft" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="8"/></filter>
      <filter id="${id}haze" x="-45%" y="-45%" width="190%" height="190%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="18"/></filter>
      <filter id="${id}edge" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.2"/></filter>
      <mask id="${id}outside" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="white"/><circle cx="500" cy="500" r="184" fill="black"/></mask>
    </defs>`;
    let main='',sub='',details='';
    if(style==='korona') {
      let beams='',threads='';
      const count=30+level*7;
      for(let i=0;i<count;i++){
        const a=i/count*Math.PI*2+seed(i+8)*.07;
        const inner=202+seed(i+14)*40,outer=radius*(.76+seed(i+23)*.25),width=.013+seed(i+31)*(.018+t*.023);
        const d=`M${p(pt(inner,a-width*.35))}Q${p(pt((inner+outer)*.5,a-width*.8))} ${p(pt(outer,a-width))}Q${p(pt(outer+5,a))} ${p(pt(outer,a+width))}Q${p(pt((inner+outer)*.5,a+width*.7))} ${p(pt(inner,a+width*.35))}Z`;
        beams+=path(d,`fill="url(#${id}beam)" opacity="${n(.25+seed(i+17)*.61)}"`);
        if(level>=3&&i%3===0)threads+=path(`M${p(pt(235,a))}L${p(pt(outer*.97,a))}`,`fill="none" stroke="url(#${id}thread)" stroke-width="${n(.65+seed(i+1)*.9)}" opacity=".65"`);
      }
      main=`<g filter="url(#${id}soft)">${beams}</g>${threads}`;
      if(level>=5) {
        for(let i=0;i<14+level*2;i++){
          const a=i/(14+level*2)*Math.PI*2+.1,r=radius*(.84+seed(i+221)*.09);
          sub+=path(`M${p(pt(220,a))}L${p(pt(r,a-.014))}L${p(pt(r,a+.014))}Z`,`fill="url(#${id}beam)" opacity=".45"`);
        }
        sub=`<g filter="url(#${id}soft)">${sub}</g>`;
      }
    } else if(style==='halo') {
      for(let i=0;i<2+Math.floor(level/2);i++){
        const r=245+i*(14+level*.7),start=.2+i*.83,end=start+Math.PI*(.73+seed(i+9)*.45);
        main+=path(arc(n(r),start,end),`fill="none" stroke="url(#${id}arc)" stroke-width="${i===0?3.2:1.3}" opacity="${n(.54+level*.027)}"`);
        main+=path(arc(n(r),start,end),`fill="none" stroke="url(#${id}arc)" stroke-width="12" filter="url(#${id}soft)" opacity=".23"`);
        if(i>1&&level>=5){const [x,y]=pt(r,start+.6);main+=`<circle cx="${n(x)}" cy="${n(y)}" r="8" fill="url(#${id}point)"/>`;}
      }
      if(level>=4)sub+=path(arc(n(radius*.85),.8,5.6),`fill="none" stroke="url(#${id}arc)" stroke-width="1.1" opacity=".38"`);
      if(level>=8)sub+=path(arc(n(radius*.92),2,5.1),`fill="none" stroke="url(#${id}arc)" stroke-width="2.2" opacity=".62"`);
    } else {
      const count=3+Math.floor(level*.5);
      for(let i=0;i<count;i++){
        const r=radius*(.65+i*.027),angle=i*67+10;
        const d=`M${500-r} 540 C${500-r*.94} ${500-r*.79} ${500+r*.36} ${500-r*1.3} ${500+r*.9} ${500-r*.22} C${500+r*1.04} ${500+r*.49} ${500+r*.3} ${500+r*.96} ${500-r*.49} ${500+r*.64}`;
        main+=`<g transform="rotate(${angle} 500 500)">`;
        main+=path(d,`fill="none" stroke="url(#${id}veil)" stroke-width="${20+level*1.7}" filter="url(#${id}haze)" opacity="${.24+level*.025}"`);
        main+=path(d,`fill="none" stroke="url(#${id}veil)" stroke-width="${3+level*.26}" filter="url(#${id}edge)" opacity="${.32+level*.02}"`);
        main+='</g>';
      }
      if(level>=6)sub+=`<ellipse cx="500" cy="500" rx="${n(radius*.81)}" ry="${n(radius*.69)}" transform="rotate(-28 500 500)" fill="none" stroke="url(#${id}arc)" stroke-width="1.4" opacity=".38"/>`;
    }
    if(level>=4) {
      const count=5+(level-4)*5;
      for(let i=0;i<count;i++){
        const a=seed(i+112)*Math.PI*2,r=267+seed(i+517)*(radius-245);
        const [x,y]=pt(r,a),size=1.1+seed(i+346)*1.5;
        details+=`<g class="ta-speck" style="--ta-delay:-${n(seed(i+8)*8)}s;--ta-speed:${n(3.5+seed(i+12)*5)}s"><circle cx="${n(x)}" cy="${n(y)}" r="${n(size*4.4)}" fill="url(#${id}point)" opacity=".35"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(size*.55)}" fill="#f5dda4" opacity="${n(.23+seed(i+14)*.5)}"/></g>`;
      }
    }
    if(level>=9){
      for(let i=0;i<level-6;i++){
        const a=.37+i*2.2,[x,y]=pt(radius*.81,a),s=level===10?8:5;
        details+=`<g class="ta-speck" style="--ta-delay:-${i*1.6}s;--ta-speed:7s"><circle cx="${n(x)}" cy="${n(y)}" r="17" fill="url(#${id}point)" opacity=".5"/>`;
        details+=path(`M${n(x)} ${n(y-s)}Q${n(x+1)} ${n(y-1)} ${n(x+s)} ${n(y)}Q${n(x+1)} ${n(y+1)} ${n(x)} ${n(y+s)}Q${n(x-1)} ${n(y+1)} ${n(x-s)} ${n(y)}Q${n(x-1)} ${n(y-1)} ${n(x)} ${n(y-s)}Z`,'fill="#fff2cf" opacity=".68"')+'</g>';
      }
    }
    const wave=level>=7?`<circle class="ta-wave" cx="500" cy="500" r="${n(radius*.77)}" fill="none" stroke="url(#${id}arc)" stroke-width="2.5" filter="url(#${id}edge)" opacity=".19"/>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" class="ta-light ta-${style}" role="img" aria-labelledby="${id}title ${id}desc"><title id="${id}title">${styles[style].name} · ${level} Titel · ${levels[level-1].name}</title><desc id="${id}desc">${levels[level-1].detail} Transparenter Lichtschein für die Ebene hinter Insignium und Avatar.</desc>${defs}<g mask="url(#${id}outside)"><g class="ta-bloom"><circle cx="500" cy="500" r="${radius+32}" fill="url(#${id}bloom)"/><circle cx="500" cy="500" r="${radius+5}" fill="url(#${id}hot)"/></g><g class="ta-rays">${main}</g><g class="ta-counter">${sub}</g>${wave}<g class="ta-dust">${details}</g></g></svg>`;
  }
  return {styles,levels,render};
});
