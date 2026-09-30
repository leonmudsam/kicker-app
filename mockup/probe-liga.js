// Eine erfundene Liga zum Prüfen des Story-Systems. Nicht die echte Liga:
// andere Namen, andere IDs, eigene Datei — sie wird nie eingetragen.
//
// Zwei Teile. Erst eine **Vorgeschichte** von vier Monaten, damit Laufbahnen
// entstehen: Meilensteine, Jubiläen, Auszeichnungen und Liga-Rekorde brauchen
// eine Historie, sonst prüft man ein System, das noch nichts zu erzählen hat.
// Danach ein **Schaufenster** von einer Woche, in dem gezielt alles vorkommt,
// was der Feed zeigen können muss:
//
//   Mo  ein erstes 10:0 (legendäre Auszeichnung → Breaking), zwei Krimis,
//       ein echter Favoritensturz unter 20 % Siegchance
//   Mi  der volle Spieltag: zwölf Partien, eine Serie wächst auf fünfzehn
//       (zweite legendäre Auszeichnung), dazu Rekord- und Chronikwechsel
//   Fr  ein ruhiger Tag: ein Duo gewinnt alles, ein anderes verliert alles
//   Sa  kein Spiel — hier muss der Fun Fact tragen
//   So  vier Partien, danach die Wochenkarte
//
// Deterministisch: derselbe Aufruf ergibt dieselbe Liga.
'use strict';
function rng(seed){ let s = seed >>> 0; return () => {
  s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const NAMEN = ['Nico','Tobi','Sina','Ben','Mira','Jonas','Lea','Kai','Timo','Ida','Ella','Finn'];
const IDS = NAMEN.map((n, i) => '20000000-0000-4000-8000-' + String(i).padStart(12, '0'));
// Spielstärke. Sie steuert die Auslosung des Ergebnisses und die Siegchance,
// die vor dem Anpfiff im Datensatz steht — nicht die Anzeige.
const STAERKE = [0.63, 0.60, 0.57, 0.55, 0.53, 0.51, 0.49, 0.47, 0.45, 0.42, 0.39, 0.35];

const chance = (a, b, c, d) => {
  const sA = (STAERKE[a] + STAERKE[b]) / 2, sB = (STAERKE[c] + STAERKE[d]) / 2;
  return 1 / (1 + Math.pow(10, (sB - sA) * 8));
};

function baueProbeLiga(seed){
  const r = rng(seed);
  const spieler = NAMEN.map((n, i) => ({id:IDS[i], name:n, hidden:false, elo:0, atk:0.5,
    avatar_id:null, created_at:'2026-04-20T00:00:00Z'}));
  const matches = [];
  let nr = 0;
  // Eine Partie eintragen. `gewinnerA` erzwingt den Sieger, `tore` den Stand
  // des Verlierers; ohne Angabe wird beides ausgelost.
  const partie = (d, min, vier, opt) => {
    opt = opt || {};
    const [x1, x2, x3, x4] = vier;
    const exp = chance(x1, x2, x3, x4);
    const aGewinnt = opt.gewinnerA != null ? opt.gewinnerA : (r() < exp);
    const w = r();
    const tief = opt.tore != null ? opt.tore
      : (w < 0.12 ? 9 : w < 0.28 ? 8 : w < 0.48 ? 7 : w < 0.66 ? 6
        : w < 0.79 ? 5 : w < 0.88 ? 3 : w < 0.95 ? 1 : 0);
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                        Math.floor(min / 60), min % 60, 0);
    matches.push({
      id: 'pr' + String(nr++).padStart(4, '0'),
      a1:IDS[x1], a2:IDS[x2], b1:IDS[x3], b2:IDS[x4],
      a1_pos:'atk', a2_pos:'def', b1_pos:'atk', b2_pos:'def',
      score_a: aGewinnt ? 10 : tief, score_b: aGewinnt ? tief : 10,
      winner: aGewinnt ? 'A' : 'B',
      exp_a: Math.round(exp * 1000) / 1000,
      created_at: dt.toISOString(), deltas:{}
    });
    return matches[matches.length - 1];
  };
  // Vier Spieler für eine Partie ziehen. Die Stammspieler kommen häufiger,
  // damit Laufbahnen verschieden lang werden — genau wie in der echten Liga.
  const ziehen = () => spieler.map((p, i) => ({i, w:r() + (i < 7 ? 0.45 : 0)}))
    .sort((a, b) => b.w - a.w).slice(0, 4).map(x => x.i);

  // ── Vorgeschichte: 20. April bis 6. September, Mo/Mi/Fr ────────────
  let tag = new Date(2026, 3, 20, 10, 0, 0);
  const ende = new Date(2026, 8, 7, 0, 0, 0);
  while(tag < ende){
    const wd = tag.getDay();
    if(wd === 1 || wd === 3 || wd === 5){
      const n = 6 + Math.floor(r() * 7);
      let min = 10 * 60 + Math.floor(r() * 50);
      for(let i = 0; i < n; i++){
        partie(tag, min, ziehen());
        min += 7 + Math.floor(r() * 12);
      }
    }
    tag = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate() + 1, 10, 0, 0);
  }
  const vorgeschichte = matches.length;

  // ── Schaufenster: Montag, 7. bis Sonntag, 13. September ────────────
  // Nico (0) gewinnt in diesen fünf Spieltagen jede Partie: fünfzehn Siege in
  // Folge, damit die 5er-, 10er- und 15er-Marke fallen und die 15er
  // Auszeichnung als Breaking im Feed steht.
  const nico = 0;
  const mitNico = (gegner) => [nico, gegner[0], gegner[1], gegner[2]];

  // Montag: neun Partien
  {
    const d = new Date(2026, 8, 7);
    let min = 10 * 60 + 15;
    // Das erste 10:0 der Liga für Ben (3) — eine legendäre Auszeichnung.
    partie(d, min, [3, 5, 10, 11], {gewinnerA:true, tore:0}); min += 9;
    // Zwei Krimis.
    partie(d, min, [1, 6, 2, 8], {gewinnerA:true, tore:9}); min += 8;
    partie(d, min, [4, 9, 7, 10], {gewinnerA:false, tore:9}); min += 11;
    // Ein echter Favoritensturz: die beiden schwächsten schlagen die zwei
    // stärksten. Die Siegchance liegt damit unter 20 %.
    partie(d, min, [1, 2, 10, 11], {gewinnerA:false, tore:7}); min += 10;
    // Nico gewinnt dreimal.
    for(let i = 0; i < 3; i++){ partie(d, min, mitNico([6, 8, 9]), {gewinnerA:true}); min += 9; }
    partie(d, min, ziehen()); min += 8;
    partie(d, min, ziehen());
  }
  // Mittwoch: zwölf Partien, der volle Tag
  {
    const d = new Date(2026, 8, 9);
    let min = 10 * 60 + 5;
    for(let i = 0; i < 6; i++){ partie(d, min, mitNico([5, 7, 10]), {gewinnerA:true}); min += 8; }
    // Ein zweites 10:0, diesmal von Tobi (1) — dieselbe Auszeichnung, anderer
    // Spieler: die Karte darf deshalb nicht dieselbe Schlagzeile tragen.
    partie(d, min, [1, 4, 8, 11], {gewinnerA:true, tore:0}); min += 9;
    partie(d, min, [2, 3, 6, 9], {gewinnerA:true, tore:8}); min += 7;
    partie(d, min, [5, 10, 4, 7], {gewinnerA:false, tore:9}); min += 10;
    partie(d, min, ziehen()); min += 8;
    partie(d, min, ziehen()); min += 9;
    partie(d, min, ziehen());
  }
  // Freitag: sechs Partien, ruhiger
  {
    const d = new Date(2026, 8, 11);
    let min = 11 * 60;
    // Sina und Mira gewinnen fünf gemeinsame Partien in Folge, Timo und Ella
    // verlieren fünf.
    for(let i = 0; i < 5; i++){
      partie(d, min, [2, 4, 8, 10], {gewinnerA:true}); min += 9;
    }
    partie(d, min, mitNico([3, 7, 11]), {gewinnerA:true});
  }
  // Samstag: kein Spiel.
  // Sonntag: vier Partien
  {
    const d = new Date(2026, 8, 13);
    let min = 14 * 60;
    for(let i = 0; i < 4; i++){
      partie(d, min, mitNico([6, 9, 11]), {gewinnerA:true}); min += 10;
    }
  }

  const seasons = [
    {id:'2026-04', label:'April 2026',     start_date:'2026-03-31', end_date:'2026-04-30'},
    {id:'2026-05', label:'Mai 2026',       start_date:'2026-04-30', end_date:'2026-05-31'},
    {id:'2026-06', label:'Juni 2026',      start_date:'2026-05-31', end_date:'2026-06-30'},
    {id:'2026-07', label:'Juli 2026',      start_date:'2026-06-30', end_date:'2026-07-31'},
    {id:'2026-08', label:'August 2026',    start_date:'2026-07-31', end_date:'2026-08-31'},
    {id:'2026-09', label:'September 2026', start_date:'2026-08-31', end_date:'2026-09-30'}
  ];
  return {spieler, matches, seasons, vorgeschichte, NAMEN, IDS};
}
module.exports = {baueProbeLiga, NAMEN, IDS, STAERKE};
