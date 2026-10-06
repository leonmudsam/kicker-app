// ─── §11.8b — Der Story-Generator in einem Worker ────────────────────
// `_buildStories` rechnet kalt rund eine Sekunde am Stück (gemessen mit
// vierfach gedrosselter CPU an den 466 Partien der Liga), und das direkt nach
// dem Start: die Rangliste stand schon, aber ein Tippen in dieser Sekunde
// blieb liegen. `_leerlauf` verschob die Sekunde nur, es teilte sie nicht.
//
// Der Worker rechnet mit DEMSELBEN Code: er bekommt den ausgelieferten
// Skripttext dieser Seite, davor eine Attrappe für DOM und Speicher nach dem
// Vorbild von `tests/runtime.js`. Es gibt also keinen zweiten Generator, der
// auseinanderlaufen könnte — nur einen zweiten Ort, an dem derselbe läuft.
// Eingabe ist der Datenstand und die Uhrzeit, Ausgabe die Story-Objekte.
// Geht irgendetwas schief (kein Worker, kein Skripttext, ein Fehler, keine
// Antwort), rechnet der Hauptthread wie bisher; `tests/start` hält beide
// Ergebnisse aneinander.

// Der Skripttext ist nur während des ersten Durchlaufs greifbar: danach ist
// `document.currentScript` leer. Im Worker selbst und in den Rechentests
// ohne Browser gibt es ihn nicht — dort bleibt es beim Hauptthread.
const _APP_QUELLE = (typeof document !== 'undefined' && document.currentScript
  && document.currentScript.textContent) || null;
// Ein kalter Lauf auf einem schwachen Telefon braucht wenige Sekunden; wer
// länger schweigt, ist hängen geblieben, und der Hauptthread übernimmt.
const STORY_WORKER_MS = 20000;
let _storyWorker = null;          // Worker, oder false nach einem Fehlschlag
let _storyWorkerStand = null;     // was der Worker zuletzt bekommen hat
let _storyWorkerNr = 0;
const _storyWorkerWarten = new Map();

// Läuft NUR im Worker, vor dem App-Code: alles, was die IIFE beim Laden
// anfasst, ohne dass der Generator es braucht. Ein Element nimmt jede
// Zuweisung an, ein Speicher hält Werte nur im Worker.
function _storyWorkerAttrappe(){
  const el = () => ({innerHTML:'', textContent:'', style:{}, dataset:{}, children:[], attributes:{},
    classList:{add(){}, remove(){}, toggle(){}, contains(){ return false; }},
    setAttribute(k, v){ this.attributes[k] = v; }, getAttribute(k){ return this.attributes[k] ?? null; },
    appendChild(c){ this.children.push(c); return c; }, remove(){}, insertBefore(c){ this.children.push(c); return c; },
    addEventListener(){}, removeEventListener(){}, querySelector(){ return null; }, querySelectorAll(){ return []; },
    getBoundingClientRect(){ return {top:0, left:0, width:0, height:0}; }, closest(){ return null; }, contains(){ return false; }});
  const elemente = new Map(), ablage = new Map();
  const stub = () => new Proxy(function(){}, {get(_, p){ return p === 'then' ? undefined : stub(); }, apply(){ return stub(); }});
  self.window = self;
  self.document = {readyState:'complete', getElementById(id){ if(!elemente.has(id)) elemente.set(id, el()); return elemente.get(id); },
    createElement:() => el(), createTextNode:t => ({textContent:t}), querySelector:() => null, querySelectorAll:() => [],
    addEventListener(){}, removeEventListener(){}, body:el(), documentElement:el(), head:el(), visibilityState:'visible', hidden:false};
  self.localStorage = {getItem:k => ablage.has(k) ? ablage.get(k) : null, setItem:(k, v) => ablage.set(k, String(v)),
    removeItem:k => ablage.delete(k), key:i => [...ablage.keys()][i] ?? null, get length(){ return ablage.size; }};
  self.matchMedia = () => ({matches:false, addEventListener(){}, addListener(){}});
  self.requestAnimationFrame = () => 0; self.cancelAnimationFrame = () => {};
  self.setInterval = () => 0; self.clearInterval = () => {};
  self.alert = () => {}; self.confirm = () => true; self.prompt = () => null; self.scrollTo = () => {};
  self.history = {pushState(){}, replaceState(){}, back(){}, state:null};
  self.getComputedStyle = () => ({getPropertyValue:() => ''});
  self.supabase = {createClient:() => ({from:() => stub(), channel:() => stub(), rpc:() => stub(), removeChannel(){}})};
  self.fetch = () => new Promise(() => {});
  // Die Uhr des Generators ist die des Aufrufs: der Hauptthread schickt sie
  // mit, sonst läge der Worker um die Dauer der Nachricht daneben.
  const EchtesDatum = Date;
  self.Date = class extends EchtesDatum {
    constructor(...a){ a.length ? super(...a) : super(self.__jetzt ?? EchtesDatum.now()); }
    static now(){ return self.__jetzt ?? EchtesDatum.now(); }
  };
}
// Läuft NUR im Worker, nach dem App-Code. Ein neuer Datenstand wird nur
// übernommen, wenn er sich geändert hat; der Bestand der Stories jedes Mal.
// So trifft der Memo von `_buildStories` im Worker genau dann, wenn er auf
// dem Hauptthread getroffen hätte.
function _storyWorkerAntwort(){
  self.onmessage = (e) => {
    const d = e.data;
    try {
      self.__jetzt = d.jetzt;
      self.__nachricht = d;
      if(d.stand) self.__kickerEval('players=self.__nachricht.stand.players;matches=self.__nachricht.stand.matches;'
        + 'cfg=self.__nachricht.stand.cfg;seasons=self.__nachricht.stand.seasons;invalidateCache();');
      const stories = self.__kickerEval('_cache._stories=self.__nachricht.bestand;_buildStories()||[]');
      self.postMessage({nr:d.nr, ok:true, stories});
    } catch(err){
      self.postMessage({nr:d.nr, ok:false, fehler:String((err && err.message) || err)});
    }
  };
}

function _storyWorkerAus(){
  try { if(_storyWorker) _storyWorker.terminate(); } catch(e){}
  _storyWorker = false;
  _storyWorkerStand = null;
  _storyWorkerWarten.forEach(fertig => fertig(null));
  _storyWorkerWarten.clear();
}

function _storyWorkerStarten(){
  // Ohne die Boot-Zeile: der Worker lädt nichts und fragt nach keinem Update.
  let code = _APP_QUELLE.replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/, '');
  const ende = code.lastIndexOf('})();');
  code = code.slice(0, ende) + '\nself.__kickerEval = s => eval(s);\n' + code.slice(ende);
  const quelle = '(' + _storyWorkerAttrappe.toString() + ')();\n' + code + '\n(' + _storyWorkerAntwort.toString() + ')();';
  const url = URL.createObjectURL(new Blob([quelle], {type:'text/javascript'}));
  const w = new Worker(url);
  URL.revokeObjectURL(url);
  w.onmessage = (e) => {
    const fertig = _storyWorkerWarten.get(e.data && e.data.nr);
    if(!fertig) return;
    _storyWorkerWarten.delete(e.data.nr);
    if(e.data.ok) return fertig(e.data.stories);
    if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] worker', e.data.fehler);
    _storyWorkerAus();
    fertig(null);
  };
  w.onerror = (e) => {
    if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] worker', e && e.message);
    _storyWorkerAus();
  };
  return w;
}

// Die Stories des aktuellen Stands aus dem Worker, oder `null`, wenn der
// Hauptthread rechnen muss. Hat sich der Stand verändert, während der Worker
// rechnete, gilt seine Antwort nicht: veröffentlicht wird nur, was zum Stand
// von jetzt gehört — wie bisher, als der Generator im selben Moment lief.
function _storiesImWorker(){
  if(_storyWorker === false || !_APP_QUELLE || typeof Worker !== 'function' || typeof Blob !== 'function'){
    return Promise.resolve(null);
  }
  try { if(!_storyWorker) _storyWorker = _storyWorkerStarten(); }
  catch(e){ _storyWorkerAus(); return Promise.resolve(null); }
  const jetzt = {players, matches, cfg, seasons, version:_cache.version};
  const alt = _storyWorkerStand;
  const neu = !alt || alt.players !== players || alt.matches !== matches || alt.cfg !== cfg
    || alt.seasons !== seasons || alt.version !== _cache.version;
  return new Promise(fertig => {
    const nr = ++_storyWorkerNr;
    const uhr = setTimeout(() => {
      if(!_storyWorkerWarten.has(nr)) return;
      if(NEWS_DEBUG || window.NEWS_DEBUG) console.warn('[news] worker antwortet nicht');
      _storyWorkerAus();
    }, STORY_WORKER_MS);
    _storyWorkerWarten.set(nr, stories => {
      clearTimeout(uhr);
      const gleich = stories && players === jetzt.players && matches === jetzt.matches && cfg === jetzt.cfg
        && seasons === jetzt.seasons && _cache.version === jetzt.version;
      fertig(gleich ? stories : null);
    });
    try {
      _storyWorker.postMessage({nr, jetzt:Date.now(), bestand:_cache._stories || null,
        stand: neu ? {players, matches, cfg, seasons} : null});
      if(neu) _storyWorkerStand = jetzt;
    } catch(e){
      // Nicht klonbar oder der Worker ist weg: dieser Lauf auf dem Hauptthread.
      clearTimeout(uhr);
      _storyWorkerWarten.delete(nr);
      _storyWorkerAus();
      fertig(null);
    }
  });
}
