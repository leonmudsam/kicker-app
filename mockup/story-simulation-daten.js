// 100 Partien, frisch erfunden — dieselbe Form wie die echten, andere Zahlen.
// Deterministisch: derselbe Lauf ergibt dieselbe Liga.
'use strict';
function rng(seed){ let s = seed >>> 0; return () => {
  s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const NAMEN = ['Nina','Tobi','Sina','Ben','Mira','Jonas','Lea','Kai','Timo','Ida'];
const IDS = NAMEN.map((n,i) => '10000000-0000-4000-8000-' + String(i).padStart(12,'0'));
// Spielstärke — sie steuert nur die Auslosung des Ergebnisses, nicht die Anzeige.
const STAERKE = [0.62, 0.58, 0.55, 0.52, 0.50, 0.48, 0.46, 0.44, 0.40, 0.36];

function baueLiga(seed, anzahl){
  const r = rng(seed);
  const spieler = NAMEN.map((n,i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5,
    avatar_id:null, created_at:'2026-06-01T00:00:00Z'}));
  // Spieltage: Mo/Mi/Fr, 6 bis 12 Partien, 10:00 bis 18:00.
  const matches = [];
  let tag = new Date(2026, 6, 6, 10, 0, 0);   // Montag, 6. Juli 2026
  while(matches.length < anzahl){
    const wd = tag.getDay();
    if(wd === 1 || wd === 3 || wd === 5){
      const n = 6 + Math.floor(r() * 7);
      let uhr = 10 * 60 + Math.floor(r() * 60);
      for(let i = 0; i < n && matches.length < anzahl; i++){
        // Wer heute spielt: vier aus der Liga, die Stammspieler häufiger.
        const pool = spieler.map((p,idx) => ({idx, w: r() + (idx < 6 ? 0.5 : 0)}))
          .sort((a,b) => b.w - a.w).slice(0, 4).map(x => x.idx);
        const [x1,x2,x3,x4] = pool;
        const sA = (STAERKE[x1] + STAERKE[x2]) / 2, sB = (STAERKE[x3] + STAERKE[x4]) / 2;
        const exp = 1 / (1 + Math.pow(10, (sB - sA) * 8));
        const aGewinnt = r() < exp;
        // Der Verlierer trifft meistens, aber nicht immer.
        const w = r();
        const verlierer = w < 0.14 ? 9 : w < 0.3 ? 8 : w < 0.5 ? 7
                        : w < 0.68 ? 6 : w < 0.8 ? 5 : w < 0.88 ? 3 : w < 0.95 ? 1 : 0;
        const min = uhr + Math.floor(r() * 14) + 6;
        uhr = min;
        const d = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(),
                           Math.floor(min / 60), min % 60, 0);
        matches.push({
          id: 'sim' + String(matches.length).padStart(4,'0'),
          a1: IDS[x1], a2: IDS[x2], b1: IDS[x3], b2: IDS[x4],
          a1_pos: r() < 0.5 ? 'atk' : 'def', a2_pos: r() < 0.5 ? 'def' : 'atk',
          b1_pos: r() < 0.5 ? 'atk' : 'def', b2_pos: r() < 0.5 ? 'def' : 'atk',
          score_a: aGewinnt ? 10 : verlierer, score_b: aGewinnt ? verlierer : 10,
          winner: aGewinnt ? 'A' : 'B',
          exp_a: Math.round(exp * 1000) / 1000,
          created_at: d.toISOString(), deltas: {}
        });
      }
    }
    tag = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate() + 1, 10, 0, 0);
  }
  const letzte = new Date(matches[matches.length-1].created_at);
  // Saisons: Juli und August 2026.
  const seasons = [
    {id:'2026-07', label:'Juli 2026',   start_date:'2026-06-30', end_date:'2026-07-31'},
    {id:'2026-08', label:'August 2026', start_date:'2026-07-31', end_date:'2026-08-31'}
  ];
  return {spieler, matches, seasons, letzte};
}
module.exports = {baueLiga, NAMEN, IDS};
