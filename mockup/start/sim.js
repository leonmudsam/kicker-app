// Die Attrappe um die App, für heute und Entwurf gleich: eine Datenbank, die
// mit den echten Partien der Liga antwortet und nichts speichert, der Stand
// des Geräts, eine feste Uhr und die Zeit, die ein Telefon braucht, um das
// Skript zu übersetzen. Läuft VOR dem Code der App; `__start` danach setzt
// den Stand und ruft `loadAll` — derselbe Ablauf wie in 37-boot.js.
(function(){
  var D = window.__DATEN;
  // Die Vergleichsseite gibt die Einstellungen im Namen des Rahmens mit;
  // wer app.html direkt öffnet, schreibt sie hinter #.
  var quelle = /^(heute|neu)(&|$)/.test(window.name || '') ? window.name : (location.hash || '#heute').slice(1);
  var teile = quelle.split('&');
  var q = {};
  teile.slice(1).forEach(function(t){ var kv = t.split('='); q[kv[0]] = decodeURIComponent(kv[1] || ''); });
  var S = window.__SIM = {
    art: teile[0] === 'neu' ? 'neu' : 'heute',
    fall: /^(pause|kurz|erst)$/.test(q.fall) ? q.fall : 'pause',  // nach einer Pause · gerade erst offen · erster Start
    netz: +(q.netz || 1400),        // Antwortzeit der Datenbank in ms
    langsam: q.langsam === '1',     // älteres Telefon: Skript und Reiter rechnen länger
    ruhe: q.ruhe === '1',
    ohne: (q.ohne || '').split(','),  // Teile des Entwurfs abschalten, zum Messen
    t0: performance.now()
  };
  // So lange übersetzt ein Telefon das Skript der App, bevor es irgendetwas
  // zeigen kann (gemessen 650 kB, Mittelklasse rund 450 ms, älter rund 900).
  S.skript = S.langsam ? 900 : 450;
  if(S.ruhe) document.documentElement.classList.add('ruhe');

  // Die Uhr steht am Abend des 26. August, wie in den Tests.
  var RD = Date, N = D.now;
  window.Date = class extends RD { constructor(...a){ a.length ? super(...a) : super(N + (performance.now() - S.t0)); }
    static now(){ return N + (performance.now() - S.t0); } };

  // Der Lesestand des Feeds: nach einer Pause sind die Stories des letzten
  // Spieltags ungelesen, nach fünf Minuten nicht. Beide Rahmen liegen auf
  // derselben Adresse und teilen sich den Speicher; jeder setzt ihn beim
  // Laden neu, damit keiner den anderen beeinflusst.
  try {
    Object.keys(localStorage).forEach(function(k){ if(/^eso_news|^kicker_/.test(k)) localStorage.removeItem(k); });
    localStorage.setItem('eso_news_stand_v1', String(S.fall === 'kurz' ? N - 300000 : D.standNeueste));
  } catch(e){}

  function klon(x){ return JSON.parse(JSON.stringify(x)); }
  // Was die Datenbank auf eine Anfrage sagt. Geschrieben wird nie: die
  // Attrappe antwortet „erledigt" und behält nichts.
  function antwort(tabelle, ops){
    var schreibt = ops.some(function(o){ return /^(insert|upsert|update|delete)$/.test(o[0]); });
    if(schreibt) return {data:null, error:null};
    if(tabelle === 'players') return {data:klon(D.players), error:null};
    if(tabelle === 'matches') return {data:klon(D.matches), error:null};
    if(tabelle === 'config') return {data:null, error:null};
    if(tabelle === 'seasons') return {data:klon(D.seasons), error:null};
    if(tabelle === 'stories'){
      var r = ops.filter(function(o){ return o[0] === 'range'; })[0];
      var zeilen = klon(D.storyZeilen);
      return {data:r ? zeilen.slice(r[1][0], r[1][1] + 1) : zeilen, error:null};
    }
    return {data:[], error:null};
  }
  function verzug(tabelle, ops){
    var schreibt = ops.some(function(o){ return /^(insert|upsert|update|delete)$/.test(o[0]); });
    if(!schreibt && /^(players|matches|config|seasons)$/.test(tabelle)) return S.netz;
    return 40;
  }
  function anfrage(tabelle){
    var ops = [];
    var p = new Proxy(function(){}, {
      get: function(_, name){
        if(name === 'then') return function(ja, nein){
          var a = antwort(tabelle, ops);
          return new Promise(function(r){ setTimeout(function(){ r(a); }, verzug(tabelle, ops)); }).then(ja, nein);
        };
        return function(){ ops.push([name, [].slice.call(arguments)]); return p; };
      }
    });
    return p;
  }
  var stumm = function(){ return new Proxy(function(){}, {get:function(_, p){ return p === 'then' ? undefined : stumm(); }, apply:function(){ return stumm(); }}); };
  window.supabase = {createClient: function(){ return {from:anfrage, channel:function(){ return stumm(); }, removeChannel:function(){}, rpc:function(){ return stumm(); }}; }};
  window.fetch = function(){ return new Promise(function(){}); };

  window.__start = function(){
    var K = window.__k.eval;
    // Der Stand des Geräts: dieselbe Form wie aus IndexedDB, nach 40 ms, mit
    // denselben Partien wie die Datenbank. Geschrieben wird er nicht — sonst
    // stünde im nächsten Rahmen der Stand des vorigen.
    K(`_standLesen = async function(){
      const S = window.__SIM, D = window.__DATEN;
      if(S.fall === 'erst') return null;
      await new Promise(r => setTimeout(r, 40));
      const roh = {p:JSON.parse(JSON.stringify(D.players)), m:JSON.parse(JSON.stringify(D.matches)),
        c:null, se:JSON.parse(JSON.stringify(D.seasons))};
      return {version:BUILD_VERSION, fp:_standHash(JSON.stringify([roh.p, roh.m, roh.c, roh.se])), roh,
        stories:D.storyZeilen.map(_rowToStory)};
    };
    _standSchreiben = async function(){};
    // Der Hinweis „x neue Stories" merkt sich, wann er zuletzt kam. Beide
    // Rahmen teilen den Speicher; ohne das zeigte ihn nur der schnellere.
    _newsLoadToastState = function(){ return {lastCount:0, lastTs:0}; };
    _newsSaveToastState = function(){};
    // Ein älteres Telefon: der Reiterwechsel rechnet 350 ms am Stück, in
    // beiden Fassungen an derselben Stelle.
    (function(){ const r0 = render; render = function(){
      const root = document.getElementById('main');
      if(window.__SIM.langsam && root._renderTab && root._renderTab !== tab){
        const t = performance.now(); while(performance.now() - t < 350){} }
      return r0.apply(this, arguments); }; })();
    0`);
    // Was das Telefon zeigt, solange es das Skript übersetzt: heute nichts
    // als den Grund (#app ist bis zum ersten Skript versteckt), im Entwurf
    // das Startbild — festes Markup, das schon vor dem Übersetzen steht.
    if(window.__entwurfStartbild) window.__entwurfStartbild();
    var teile = ['app', 'botnav', 'fab'].map(function(id){ return document.getElementById(id); });
    var sichtbar = teile.map(function(e){ return e.style.display; });
    teile.forEach(function(e){ e.style.display = 'none'; });
    setTimeout(function(){
      teile.forEach(function(e, i){ e.style.display = sichtbar[i]; });
      if(window.__entwurf) window.__entwurf();
      K('loadAll(); 0');
    }, S.skript);
  };

  window.addEventListener('message', function(e){
    var d = e.data || {};
    if(d.ruhe !== undefined) document.documentElement.classList.toggle('ruhe', !!d.ruhe);
  });
})();
