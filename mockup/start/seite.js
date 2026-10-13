// Die Vergleichsseite: beide Rahmen mit denselben Einstellungen laden,
// „Zurückkommen" an beide schicken, auf dem Telefon einen zeigen.
(function(){
  var $ = function(id){ return document.getElementById(id); };
  function einstellung(art){
    return art + '&fall=' + $('sFall').value + '&netz=' + $('sNetz').value
      + '&langsam=' + ($('sLangsam').checked ? 1 : 0) + '&ruhe=' + ($('sRuhe').checked ? 1 : 0);
  }
  // Jedes Öffnen setzt einen neuen Rahmen ein. Nur die Adresse hinter #
  // zu ändern lud die Seite nicht neu — der Browser sprang innerhalb
  // derselben Seite, und „Neu öffnen" begann den Start gar nicht von vorn.
  // Die Einstellungen reisen im Namen des Rahmens (window.name), nicht
  // hinter #: eine veröffentlichte Seite reicht # nicht immer durch.
  function rahmen(art){
    var alt = $(art === 'neu' ? 'fNeu' : 'fHeute'), f = document.createElement('iframe');
    f.id = alt.id; f.title = alt.title;
    f.name = einstellung(art);
    f.src = 'app.html#' + einstellung(art);
    alt.parentNode.replaceChild(f, alt);
  }
  function oeffnen(){ rahmen('heute'); rahmen('neu'); }
  ['sFall', 'sNetz', 'sLangsam'].forEach(function(id){ $(id).addEventListener('change', oeffnen); });
  $('sRuhe').addEventListener('change', function(){
    [$('fHeute'), $('fNeu')].forEach(function(f){ f.contentWindow.postMessage({ruhe:$('sRuhe').checked}, '*'); });
  });
  $('sStart').addEventListener('click', oeffnen);
  $('sZurueck').addEventListener('click', function(){
    [$('fHeute'), $('fNeu')].forEach(function(f){ f.contentWindow.postMessage({zurueck:true}, '*'); });
  });
  document.querySelectorAll('.pf-seg button').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.pf-seg button').forEach(function(x){ x.classList.toggle('an', x === b); });
      document.querySelectorAll('.pf-tel figure').forEach(function(f){ f.classList.toggle('zeigt', f.classList.contains(b.dataset.zeige)); });
      // Auf dem Telefon steht nur ein Rahmen; der versteckte hätte seinen
      // Start schon hinter sich. Er beginnt deshalb neu, wenn man ihn zeigt.
      rahmen(b.dataset.zeige);
    });
  });
  oeffnen();
})();
