// Diese Datei wird NICHT als Modul geladen, sondern als Quelltext in die
// laufende App evaluiert (`story-simulation-lauf.js`). Sie liest den Feed
// aus der App und rechnet fuer jede weggefallene Story nach, welche Regel
// gegriffen hat — sie nennt jede, die zutrifft, nicht nur die erste.
(function(){
  var roh = _buildStories();
  _cache._stories = roh.slice().sort(function(a,b){ return new Date(b.when)-new Date(a.when); });
  _cache._consolFrom = null; _cache._frischVon = null;
  var feed = getStoriesCache();
  function tagKey(w){ var d = new Date(w);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  var gebuendelt = {};
  feed.forEach(function(s){ (((s.dataRef||{}).teile)||[]).forEach(function(t){ gebuendelt[t.titel] = 1; }); });
  var imFeed = {}; feed.forEach(function(s){ imFeed[s.id] = 1; });

  var lauteTage = {};
  feed.forEach(function(s){ var t = (s.dataRef||{}).type;
    if(t !== 'ambient' && t !== 'season_endgame') lauteTage[tagKey(s.when)] = 1; });

  var rohSort = roh.slice().sort(function(a,b){ return new Date(b.when)-new Date(a.when); });
  var proTag = {}, tagRang = {}, proTyp = {}, typRang = {};
  rohSort.forEach(function(s){ var k = tagKey(s.when); (proTag[k] = proTag[k]||[]).push(s); });
  Object.keys(proTag).forEach(function(k){
    proTag[k].slice().sort(function(a,b){ return (b.prio||0)-(a.prio||0); })
      .forEach(function(s,i){ tagRang[s.id] = i+1; });
  });
  rohSort.forEach(function(s){ var t = (s.dataRef||{}).type||'-';
    proTyp[t] = (proTyp[t]||0)+1; typRang[s.id] = proTyp[t]; });

  var OHNE_DECKEL = ['lead_change','elo_record','streak_record','season_recap',
                     'season_endgame','ambient','group','sammel','woche'];

  var zeilen = roh.map(function(s){
    var d = s.dataRef || {};
    var drin = !!imFeed[s.id];
    var brk = false; try { brk = !!_isBreaking(s); } catch(e){}
    var gruende = [];
    if(!drin){
      if(gebuendelt[s.title]) gruende.push('in eine Sammelkarte gebündelt');
      if(d.type === 'ambient' && lauteTage[tagKey(s.when)])
        gruende.push('Fun Fact an einem Tag mit Nachrichten');
      if(OHNE_DECKEL.indexOf(d.type) < 0 && typRang[s.id] > 2)
        gruende.push('dritte Karte derselben Sorte');
      if(!brk && tagRang[s.id] > NEWS_LIMITS.proTag)
        gruende.push('über dem Tagesdeckel von ' + NEWS_LIMITS.proTag);
      if(!gruende.length) gruende.push('Doublette oder überholt');
    }
    return {id:s.id, typ:d.type||'-', titel:s.title, text:s.desc,
            zeit:new Date(s.when).getTime(), prio:s.prio||0,
            tag:tagKey(s.when), tagRang:tagRang[s.id], typRang:typRang[s.id],
            breaking:brk, drin:drin, gruende:gruende};
  });

  // Die Tafel, wie die App sie zeichnet — echte Karten, echtes Markup.
  var seen = new Set();
  var gruppen = [];
  feed.forEach(function(st){
    var k = tagKey(st.when);
    var g = gruppen[gruppen.length-1];
    if(g && g.k === k) g.items.push(st);
    else gruppen.push({k:k, label:_newsDayLabel(st.when), datum:_newsDayDate(st.when), items:[st]});
  });
  var tafel = gruppen.map(function(g){
    var tk = _newsTagKarte(g.items, _newsDayKey(g.items[0].when));
    return '<div class="nf-tag" data-tag="'+g.k+'"><div class="nf-tag-z1">'
      + '<span class="nf-tag-wt">'+g.label+'</span>'
      + '<span class="nf-tag-dt">'+g.datum+'</span>'
      + '<span class="nf-tag-n">'+g.items.length+(g.items.length===1?' KARTE':' KARTEN')+'</span></div></div>'
      + '<div class="nf-feed">'
      + g.items.map(function(st){ return _newsCardHtmlM2(st, false, st.id === tk); }).join('')
      + '</div>';
  }).join('');

  // Blätter: für jede Karte des Feeds das Detail, wie es sich öffnet.
  var blaetter = feed.map(function(s){
    var b = ''; try { b = _newsDetailBody(s); } catch(e){ b = ''; }
    return {id:s.id, titel:s.title, sorte:_newsSorte(s), body:b};
  });

  var proSpieler = {};
  feed.forEach(function(s){ (_newsPids(s)||[]).forEach(function(p){
    var n = (pmap()[p]||{}).name || '?'; proSpieler[n] = (proSpieler[n]||0)+1; }); });

  return {roh:roh.length, feed:feed.length, zeilen:zeilen, tafel:tafel,
          blaetter:blaetter, proSpieler:proSpieler,
          deckelTag: NEWS_LIMITS.proTag,
          spieltage: (function(){ var t = {}; matches.forEach(function(m){
            t[tagKey(m.created_at)] = (t[tagKey(m.created_at)]||0)+1; }); return t; })(),
          rangliste: (function(){
            var c = (getGlobalSim()||{}).careerElo || {};
            return Object.keys(c).filter(function(id){ return pmap()[id]; })
              .sort(function(a,b){ return c[b]-c[a]; })
              .map(function(id){ return {name:pmap()[id].name, elo:Math.round(c[id])}; });
          })()};
})()
