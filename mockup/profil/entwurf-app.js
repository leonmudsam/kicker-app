// Läuft in app.html nach dem Code der App. Öffnet das Profil, das die
// Adresse nennt (#heute:<id> oder #neu:<id>), und hört auf die
// Vergleichsseite (postMessage): anderer Spieler, Bewegung aus.
// Im Entwurf (#neu) ergänzt es das Markup um das, was beim Einbau
// 18-profil.js schriebe: die Bahn für das Licht am Rand des Kopfs, die
// Lauflicht-Ebene (`glanz-bahn`, dasselbe Bauteil wie Podest und Spieler
// des Tages) über dem Gewonnenen, den Ring am Endpunkt der Elo-Kurve und
// die Quoten als Variable statt nur als Text.
(function(){
  var K = window.__k.eval;
  var teile = (location.hash || '#heute').slice(1).split(':');
  var neu = teile[0] === 'neu';
  if(neu) document.documentElement.classList.add('neu');
  if(teile[2] === 'ruhe') document.documentElement.classList.add('ruhe');

  function anteil(t){ var m = String(t || '').match(/(-?\d+(?:[.,]\d+)?)\s*%/); return m ? Math.max(0, Math.min(1, parseFloat(m[1].replace(',', '.')) / 100)) : null; }
  function bahn(el, verzug, takt){
    if(!el || el.querySelector(':scope > .neu-gl')) return;
    var s = document.createElement('span');
    s.className = 'glanz-bahn neu-gl'; s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--gd', verzug.toFixed(2) + 's');
    if(takt) s.style.setProperty('--gz', takt + 's');
    el.appendChild(s);
  }

  function schmuecken(root){
    if(!neu || !root) return;
    var kopf = root.querySelector('.pp-header');
    if(kopf && !kopf.querySelector('.neu-rand')){
      var r = document.createElement('span'); r.className = 'neu-rand'; r.setAttribute('aria-hidden', 'true');
      r.appendChild(document.createElement('i')); kopf.appendChild(r);
    }
    // Die Kurve zeichnet sich: Länge 1, damit die Strichlänge nicht von der
    // Form der Kurve abhängt.
    var spark = root.querySelector('.pp-spark svg');
    if(spark && !spark.querySelector('.neu-ping')){
      var linie = spark.querySelector('path[stroke]'), punkt = spark.querySelector('circle');
      if(linie) linie.setAttribute('pathLength', '1');
      if(punkt){ var ring = punkt.cloneNode(); ring.setAttribute('class', 'neu-ping'); spark.appendChild(ring); }
    }
    root.querySelectorAll('.pp-k').forEach(function(k){
      if(!/Siegquote/i.test(k.textContent)) return;
      var q = anteil(k.textContent);
      if(q !== null){ k.style.setProperty('--q', q); k.classList.add('neu-quote'); }
    });
    root.querySelectorAll('.pp-r-rich').forEach(function(r){
      var v = r.querySelector('.stat .v'), q = v && anteil(v.textContent);
      if(q !== null && q !== undefined) r.style.setProperty('--q', q);
    });
    root.querySelectorAll('.pp-st').forEach(function(s){
      var t = s.textContent;
      if(!/Aktuelle/i.test(t)) return;
      if(/Niederlage/.test(t)) s.classList.add('neu-rot');
      else if(/Sieg/.test(t)) s.classList.add('neu-gruen');
    });
    // Das Licht wandert durch jede Reihe: Titel, gehaltene Rekorde, der
    // erste Platz einer Saison, die legendären Auszeichnungen als Welle.
    root.querySelectorAll('.pp-tr').forEach(function(el, i){ bahn(el, .4 + i * .6, 8); });
    root.querySelectorAll('.chron-one:not(.schatten):not(.next)').forEach(function(el, i){ bahn(el, 2.2 + i * .45, 8); });
    root.querySelectorAll('.pp-sn.gold').forEach(function(el, i){ bahn(el, 3 + i * .5, 8); });
    root.querySelectorAll('.pp-bmini.legendary').forEach(function(el, i){ bahn(el, 1 + i * .12, 9); });
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
    // neue Markup ebenso.
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
