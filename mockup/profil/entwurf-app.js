// Läuft in app.html nach dem Code der App. Öffnet das Profil, das die
// Adresse nennt (#heute:<id> oder #neu:<id>), und hört auf die
// Vergleichsseite (postMessage): anderer Spieler, Bewegung aus.
// Im Entwurf (#neu) ergänzt es, was beim Einbau 18-profil.js schriebe: die
// Hülle des Ordensbands um den Beinamen und das Feuer an einer laufenden
// Siegesserie ab drei. Lauflicht, Randlicht und Kurve trägt die App selbst.
(function(){
  var K = window.__k.eval;
  var teile = (location.hash || '#heute').slice(1).split(':');
  var neu = teile[0] === 'neu';
  if(neu) document.documentElement.classList.add('neu');
  if(teile[2] === 'ruhe') document.documentElement.classList.add('ruhe');

  function schmuecken(root){
    if(!neu || !root) return;
    root.querySelectorAll('.pp-title-pill').forEach(function(p){
      if(p.parentNode.classList.contains('neu-band')) return;
      var b = document.createElement('span'); b.className = 'neu-band';
      p.parentNode.insertBefore(b, p); b.appendChild(p);
    });
    var lauf = root.querySelector('.pp-st.lauf-sieg .v');
    if(lauf && !lauf.querySelector('.neu-feuer') && (parseInt(lauf.textContent, 10) || 0) >= 3){
      var f = document.createElement('span'); f.className = 'neu-feuer';
      f.innerHTML = K('svgI("flame")'); lauf.appendChild(f);
    }
  }

  function oeffnen(pid){
    if(!pid) return;
    try { K('closeSheet(true)'); } catch(e){}
    K('showPlayer(' + JSON.stringify(pid) + ')');
    var sh = document.getElementById('sheet');
    schmuecken(sh);
    if(sh) sh.scrollTop = 0;
  }

  window.__nachSetup = function(){
    var sh = document.getElementById('sheet');
    if(sh && window.MutationObserver){
      new MutationObserver(function(){ schmuecken(sh); }).observe(sh, {childList:true});
    }
    setTimeout(function(){ oeffnen(teile[1]); }, 60);
  };

  window.addEventListener('message', function(e){
    var d = e.data || {};
    if(d.ruhe !== undefined) document.documentElement.classList.toggle('ruhe', !!d.ruhe);
    if(d.spieler) oeffnen(d.spieler);
  });
})();
