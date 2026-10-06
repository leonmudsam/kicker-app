// ╔═══ §0.2 ─── BUILD-VERSION & UPDATE-CHECK ───────────────────────────╗
//     Die Version vergibt `tools/build.mjs` als Datum und Hash über den
//     ausgelieferten Inhalt. Der Hintergrund-Check holt die index.html mit
//     Cache-Bust und zeigt ein Banner, wenn sie eine andere Version trägt.
// ╚═════════════════════════════════════════════════════════════════════════╝
const BUILD_VERSION='2026.08.28.1';
// Neu laden mit Cache-Bust: der Banner und der Knopf in den Einstellungen
// brechen damit den Seitencache von iOS-PWA und Browser.
function forceReload(){
  const u=new URL(location.href);
  u.searchParams.set('_cb',Date.now());
  // replace statt assign damit der alte Eintrag nicht in der History bleibt
  location.replace(u.toString());
}
// Update-Check per Conditional Request: mit If-None-Match antwortet GitHub
// Pages bei unveränderter Datei mit 304 ohne Body. Ohne ETag degradiert das
// zum vollen Abruf.
//
// Der ETag lebte nur im Speicher. Jeder Start begann deshalb ohne und lud die
// ganze Seite (1,7 MB, ohne Kompression gerechnet) erneut herunter — genau in
// dem Moment, in dem auch die vier Datenabfragen laufen. Er steht jetzt mit
// der Version, zu der er gehört, im Speicher des Geräts: nur wenn diese
// Version die laufende ist, gilt er. Sonst hätte ein Gerät, das den Banner
// gesehen und nicht neu geladen hat, beim nächsten Start ein 304 auf die neue
// Fassung bekommen und den Banner nie wieder gesehen.
const UPD_LS = 'kicker_upd_v1';
let _updEtag=(()=>{
  try{
    const s=JSON.parse(localStorage.getItem(UPD_LS)||'null');
    return s && s.version===BUILD_VERSION && s.etag ? s.etag : null;
  }catch(e){ return null; }
})();
// Der erste Check wartet, bis der erste Datenlauf gezeichnet hat und die
// Seite ruht: er ist nie eilig, die Rangliste schon.
let _updErster=true;
async function checkForUpdate(){
  try{
    if(_updErster){
      _updErster=false;
      try{ if(_loadAllPromise) await _loadAllPromise; }catch(e){}
      await _leerlauf(3000);
    }
    const url=location.pathname+'?_cb='+Date.now();
    const r=await fetch(url,{cache:'no-store',headers:_updEtag?{'If-None-Match':_updEtag}:{}});
    if(r.status===304)return; // unverändert — kein Body übertragen
    if(!r.ok)return;
    const etag=r.headers.get('ETag');
    const text=await r.text();
    const m=text.match(/const BUILD_VERSION=['"]([^'"]+)['"]/);
    if(!m||!m[1])return;
    // In dieser Sitzung gilt jeder ETag: auch nach dem Banner soll der
    // Fünf-Minuten-Takt nicht jedes Mal die ganze Seite holen. Für den
    // nächsten Start gemerkt wird aber nur der eigene — der einer neuen
    // Fassung gilt erst, wenn sie läuft.
    _updEtag=etag;
    if(m[1]===BUILD_VERSION){
      try{ if(etag) localStorage.setItem(UPD_LS, JSON.stringify({etag, version:BUILD_VERSION})); }catch(e){}
      return;
    }
    if(document.getElementById('updateBanner'))return;
    const b=document.createElement('div');
    b.id='updateBanner';
    b.style.cssText='position:fixed;top:calc(var(--safe-top) + 10px);left:50%;transform:translateX(-50%);z-index:9000;background:var(--acid);color:var(--acid-deep);font-family:inherit;font-size:12.5px;font-weight:700;padding:9px 14px;border-radius:12px;box-shadow:var(--shadow-acid);display:flex;gap:10px;align-items:center;cursor:pointer;max-width:92vw;white-space:nowrap';
    b.innerHTML='<span>Neue Version ('+m[1]+')</span><span style="background:rgba(0,0,0,.18);padding:4px 9px;border-radius:8px">Neu laden</span>';
    b.onclick=forceReload;
    document.body.appendChild(b);
  }catch(e){/* offline / CORS — still ignorieren */}
}

// ---- STATE ----
let players=[], matches=[], cfg={k_factor:32,risk_split:0.6,pos_swing:0.45,start_elo:0,
  win_boost:1.12,mov_loss_damp:0.5,match_bonus:1.5,low_elo_loss_damp:0};
let tab='ranking', unlocked=true;
let rankMetric='elo';      // elo | atk | def | winrate | goaldiff | prestige
                           // atk/def kommen aus dem Positionen-Tab, der
                           // sich dieselbe Variable teilt [§5.2]
let teamSearch='';         // Suchfilter im Teams-Tab (Spieler- oder Team-Name)
let histFilter='all';      // all | <playerId>
let teamView='best';       // best | worst (Teams-Tab)
let teamSort='wr';         // wr | gd | elo (Teams-Sortierung) ← NEUE ZEILE
let posSort='wr';          // wr | wins (Positionen-Filter)
let period='season';          // all | season | week | month (Liga-Zeitraum)
// Welche Saison der Liga-Tab zeigt. null = die laufende. Beim Tabwechsel
// wird das zurückgesetzt: wer den Tab neu betritt, will den Stand von
// heute sehen, nicht den, den er vor zehn Minuten nachgeschlagen hat.
let ligaSeasonId=null;
// Was der Liga-Tab unter „Saison" zeigt: Rangliste der Spieler oder der
// Duos. Zwei Ranglisten über denselben Zeitraum, deshalb ein Reiter und
// keine zweite Seite.
let ligaSicht='spieler';   // spieler | duos
let awView='awards';       // awards | rekorde | chronik (Reiter im Awards-Tab)
// Welcher Einblick über der Rangliste aufgeklappt ist (15b-einblick.js).
// Er gehört zum Reiter: ein neuer Reiter beginnt geschlossen, ein
// Neuzeichnen im selben Reiter klappt ihn nicht zu.
let einblickOffen='';      // offene Einblicke, durch Leerzeichen getrennt: rollen netz ruhe_liga ruhe_pos ruhe_teams ruhe_chronik
// Welche Kammer der Rekorde-Reiter zeigt. Leer heißt alle vier. Sie gehört
// zum Reiter und nicht zur App: wer den Tab wechselt, will beim Zurückkommen
// die ganze Tafel sehen und nicht den Ausschnitt von vorhin.
let rekKammer='';          // '' | record | mark | fuegung | shame
// Der Awards-Tab kennt nur noch Saison und Woche. „Gesamt" war per
// Definition allzeit und sagte damit dasselbe wie der Rekorde-Reiter
// daneben — sechs Kacheln standen dort wörtlich doppelt. Als WERT gibt
// es 'all' weiterhin: das Award-Blatt aus einem Team-Profil zeigt die
// ganze Liga, und dafür ist es der richtige Zeitraum. Nur als Reiter
// gibt es ihn nicht mehr, und der Tabwechsel setzt ihn zurück.
let awPeriod='season';   // season | week ('all' nur im Blatt, ohne Reiter)
let awSeasonId=null;        // konkrete Saison für Award-Filter (null = aktuelle)
let awWeekStart=null;       // konkrete Woche (Date für Montag, lokale Zeit) für Award-Filter (null = aktuelle KW)

