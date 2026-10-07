// Läuft in app.html nach dem Code der App. Im rechten Fenster (#neu) setzt
// es den neuen Zeichensatz ein und treibt die Effekte, die CSS allein nicht
// kann: einmal hochzählen, einmal hereinkommen, der Hof im Profilkopf.
// Beide Fenster hören auf die Vergleichsseite (postMessage): Reiter
// wechseln, ein Blatt öffnen, Bewegung reduzieren.
(function(){
  var K = window.__k.eval;
  var neu = location.hash === '#neu';
  var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function still(){ return ruhig || document.documentElement.classList.contains('ruhe'); }

  if(neu){
    document.documentElement.classList.add('v6');
    // Zeichen tauschen, bevor irgendetwas gerechnet oder gezeichnet ist:
    // Stories und Töpfe nehmen den Schlüssel aus dem Katalog mit.
    K('(' + function(Z){
      Object.assign(ICONS, Z.NEU);
      var pos = {};
      Z.WECHSEL.forEach(function(w){
        var sys = w[0], id = w[1], nach = w[2], x;
        if(sys === 'Award') AW_IC[id] = nach;
        else if(sys === 'Badge'){ x = BADGES.find(function(b){ return b.id === id; }); if(x) x.ic = nach; }
        else if(sys === 'Rekord' || sys === 'Monatschronik'){ x = DISZIPLINEN.find(function(d){ return d.id === id; }); if(x) x.ic = nach; }
        else if(sys === 'News'){ if(NEWS_CATEGORIES[id]) NEWS_CATEGORIES[id].ic = nach; }
        else if(sys === 'Rang'){ x = RANKS.find(function(r){ return r.label === id; }); if(x) x.icon = nach; }
        else if(sys === 'Ring'){ if(AV_RINGS[id]) AV_RINGS[id].ic = nach; }
        else if(sys === 'Spieltag'){ if(SP_ANLASS[id]) SP_ANLASS[id].ic = nach; }
        else if(sys === 'Position') pos[id] = nach;
      });
      var alt = posClassify;
      posClassify = function(a){ var r = alt(a); if(pos[r.label]) r.icon = pos[r.label]; return r; };
      return 'ok';
    } + ')(' + JSON.stringify(window.__ZEICHEN) + ')');
  }

  window.__nachSetup = function(){
    if(!neu) return;
    var gesehen = new WeakSet(), gezaehlt = false;
    // E2: die Kopfzahlen zählen beim ersten Zeigen einmal hoch. Danach
    // stehen sie: wer zwischen Reitern wechselt, will lesen, nicht zusehen.
    function zaehlen(root){
      if(gezaehlt || still()) return;
      var vs = root.querySelectorAll('.stat-strip .v, .hof-zahl, .lz-zahl');
      if(!vs.length) return;
      gezaehlt = true;
      vs.forEach(function(el){
        var t = el.textContent, m = t.match(/^(\D*)(\d[\d.]*)(.*)$/);
        if(!m) return;
        var bis = parseInt(m[2].replace(/\./g, ''), 10), t0 = performance.now();
        el.classList.add('v6-zaehlt');
        (function f(jetzt){
          var p = Math.min(1, (jetzt - t0) / 900), w = Math.round(bis * (1 - Math.pow(1 - p, 3)));
          el.textContent = m[1] + w.toLocaleString('de-DE') + m[3];
          if(p < 1) requestAnimationFrame(f); else el.textContent = t;
        })(t0);
      });
    }
    // E3: Kacheln kommen einmal herein, wenn sie ins Bild scrollen.
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.remove('v6-warten');
        e.target.classList.add('v6-da');
      });
    }, {threshold:.25});
    function kacheln(root){
      var spalte = 0;
      root.querySelectorAll('.aw-trophy, .rek').forEach(function(el){
        if(gesehen.has(el)) return;
        gesehen.add(el);
        if(still()) return;
        el.style.setProperty('--v6-i', String(spalte++ % 2));
        el.classList.add('v6-warten');
        io.observe(el);
      });
    }
    // E6: der Hof im Profilkopf ist ein eigenes Element, damit nur seine
    // Deckkraft und Größe sich bewegen.
    function hof(root){
      root.querySelectorAll('.pp-header').forEach(function(h){
        if(h.querySelector(':scope > .v6-hof')) return;
        var d = document.createElement('div'); d.className = 'v6-hof';
        h.insertBefore(d, h.firstChild);
      });
    }
    function alles(root){ zaehlen(root); kacheln(root); hof(root); }
    var mo = new MutationObserver(function(){ alles(document.getElementById('main')); alles(document.getElementById('sheet')); });
    mo.observe(document.getElementById('main'), {childList:true, subtree:true});
    mo.observe(document.getElementById('sheet'), {childList:true, subtree:true});
    alles(document);
  };

  // Steuerung durch die Vergleichsseite.
  window.addEventListener('message', function(e){
    var d = e.data || {};
    if(d.ruhe !== undefined) document.documentElement.classList.toggle('ruhe', !!d.ruhe);
    if(d.tab){
      K('try{closeSheet&&closeSheet()}catch(e){};tab=' + JSON.stringify(d.tab) + ';ligaSeasonId=null;awPeriod="season";render();"ok"');
      window.scrollTo(0, 0);
    }
    if(d.profil){ var r = document.querySelector('#main .rrow[data-detail]'); if(r) K('showPlayer(' + JSON.stringify(r.dataset.detail) + ');"ok"'); }
    if(d.feed) K('openNewsFeed();try{_newsFeedRest()}catch(e){};"ok"');
    if(d.zu) K('try{closeSheet()}catch(e){};"ok"');
  });
})();
