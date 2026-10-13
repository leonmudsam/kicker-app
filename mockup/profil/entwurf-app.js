// Läuft in app.html nach dem Code der App. Öffnet das Profil, das die
// Adresse nennt (#heute:<id> oder #neu:<id>), und hört auf die
// Vergleichsseite (postMessage): anderer Spieler, Bewegung aus.
// Im Entwurf (#neu) setzt es dem CSS zwei Werte, die heute nur als Text im
// Markup stehen: die Siegquote als Anteil und die Quote jeder Beziehung.
// Beim Einbau stünden sie als Variable im Markup von 18-profil.js.
(function(){
  var K = window.__k.eval;
  var teile = (location.hash || '#heute').slice(1).split(':');
  var neu = teile[0] === 'neu';
  if(neu) document.documentElement.classList.add('neu');
  if(teile[2] === 'ruhe') document.documentElement.classList.add('ruhe');

  function anteil(t){ var m = String(t || '').match(/(-?\d+(?:[.,]\d+)?)\s*%/); return m ? Math.max(0, Math.min(1, parseFloat(m[1].replace(',', '.')) / 100)) : null; }

  function schmuecken(root){
    if(!neu || !root) return;
    root.querySelectorAll('.pp-k').forEach(function(k){
      var q = anteil(k.textContent);
      if(q !== null) { k.style.setProperty('--q', q); k.classList.add('neu-quote'); }
    });
    root.querySelectorAll('.pp-r-rich').forEach(function(r){
      var v = r.querySelector('.stat .v'), q = v && anteil(v.textContent);
      if(q !== null && q !== undefined) r.style.setProperty('--q', q);
    });
    // Die Siegesserie: eine laufende Siegesserie leuchtet in Grün, eine
    // Pleitenserie in Rot — dieselbe Aussage wie die Zahl, nur auf einen Blick.
    root.querySelectorAll('.pp-st').forEach(function(s){
      var t = s.textContent;
      if(/Niederlage/.test(t) && /Aktuelle/i.test(t)) s.classList.add('neu-rot');
      else if(/Sieg/.test(t) && /Aktuelle/i.test(t)) s.classList.add('neu-gruen');
    });
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
    // Wer im Profil weitertippt (Laufbahn, Rekord, zurück), bekommt das
    // neue Markup ebenso geschmückt.
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
