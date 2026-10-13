// Die Vergleichsseite: beide Rahmen mit denselben Einstellungen laden,
// „Zurückkommen" an beide schicken, auf dem Telefon einen zeigen.
(function(){
  var $ = function(id){ return document.getElementById(id); };
  function adresse(art){
    return 'app.html#' + art + '&fall=' + $('sFall').value + '&netz=' + $('sNetz').value
      + '&langsam=' + ($('sLangsam').checked ? 1 : 0) + '&ruhe=' + ($('sRuhe').checked ? 1 : 0) + '&t=' + Date.now();
  }
  function oeffnen(){
    $('fHeute').src = adresse('heute');
    $('fNeu').src = adresse('neu');
  }
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
      var f = b.dataset.zeige === 'neu' ? $('fNeu') : $('fHeute');
      f.src = adresse(b.dataset.zeige);
    });
  });
  oeffnen();
})();
