// Schneidet die einundzwanzig Zeichen der Insignium-Leiter aus der Vorlage
// und schreibt sie als src/js/35a-insignium-bilder.js [§C30].
//
//   node tools/insignium-bilder.js [kante] [qualität]
//
// Eine Vorlage ist EIN Bild mit Stufen in Zeilen, je Variante eine Zelle. Je Zeichen geschieht dasselbe:
//   1. Das Loch des Reifs wird vom Mittelpunkt aus gesucht: sein Mittelpunkt
//      ist die Mitte des Zeichens, sein Radius die Größe. Danach steht jedes
//      Zeichen mit demselben Innenradius (22 % der Kante) in derselben Mitte —
//      sonst säße das Gesicht in jeder Stufe woanders.
//   2. Der dunkle Grund wird zu Transparenz („Farbe zu Alpha" gegen die Farbe
//      im Loch), damit das Zeichen auf jeder Karte steht.
//   3. Das Zeichen wird spiegelgleich: die Vorlage ist gemalt, nicht
//      gespiegelt, und eine Seite trug mehr Schnörkel, eine Sichel saß höher,
//      und wo der Nachbar zu nah stand, war eine Spitze abgeschnitten. Aus der
//      besseren Hälfte wird die andere gespiegelt; die Mitte (Lilie, Krone,
//      Raute) bleibt original, sonst stünde dort eine Naht.
//   4. Kleine Inseln abseits des Zeichens fallen weg, und lange Spitzen laufen
//      weich aus, statt an der Zeichenfläche abzubrechen.
// Gerechnet wird im Browser (Canvas), weil Node kein WebP dekodiert.
const fs = require('fs');
const path = require('path');
const chromium = require('../tests/browser.js').ladeChromium();
if(!chromium){ console.error('Kein Chromium — npm install --no-save playwright-core'); process.exit(2); }
const WURZEL = path.join(__dirname, '..');
const S = +(process.argv[2] || 320), QUAL = +(process.argv[3] || .88), INNEN = .22;
// Zwei Vorlagen. Reif bis Kronenreif kommen aus der ersten, die je Stufe
// genau die drei Grade zeigt; der Ordensstern kommt aus der zweiten, die ihn
// feiner zeichnet — dort stehen je Stufe fünf Varianten, und genommen werden
// Anfang, Mitte und Ende, damit die drei Zacken-Bilder sichtbar
// auseinanderliegen.
// Je Zeile: der Streifen (y0, y1), ein Punkt im Loch des Reifs (x[], y), die
// Grenzen der Zellen (xg[], eine mehr als Zellen) und welche Zellen genommen
// werden. `fuge` ist der Abstand, den eine Zelle zu ihrer Grenze hält: die
// zweite Vorlage trägt zwischen den Zellen eine feine helle Linie, die erste
// ist aus Bildschirmfotos zusammengesetzt und stößt ohne Linie aneinander.
const QUELLEN = [
  {datei:'mockup/insignium-vorlage.webp', fuge:1, zeilen:[
    {key:'reif',    y0:0,   y1:154, y:77,  x:[62,229,398],  xg:[0,145,313,476], nimm:[0,1,2]},
    {key:'schild',  y0:154, y1:299, y:229, x:[60,227,400],  xg:[0,143,313,478], nimm:[0,1,2]},
    {key:'volute',  y0:299, y1:432, y:365, x:[77,235,398],  xg:[0,156,316,482], nimm:[0,1,2]},
    {key:'zier',    y0:432, y1:584, y:505, x:[62,227,398],  xg:[0,144,312,485], nimm:[0,1,2]},
    {key:'lorbeer', y0:584, y1:740, y:662, x:[75,242,408],  xg:[0,158,325,487], nimm:[0,1,2]},
    {key:'krone',   y0:740, y1:894, y:817, x:[77,240,402],  xg:[0,158,321,486], nimm:[0,1,2]},
  ]},
  {datei:'mockup/insignium-vorlage-stern.webp', fuge:4, zeilen:[
    {key:'stern',   y0:990, y1:1232, y:1105, x:[423,601,783,967,1158], xg:[331,515,688,878,1057,1262], nimm:[0,2,4], insel:.0008},
  ]},
];
// Welche Hälfte gespiegelt wird, fest je Zeichen und am Kontaktbogen geprüft
// (L oder R; ohne Eintrag entscheidet die Deckung).
const WAHL = {};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const out = {};
  for(const Q of QUELLEN){
  const src = 'data:image/webp;base64,' + fs.readFileSync(path.join(WURZEL, Q.datei)).toString('base64');
  const ZEILEN = Q.zeilen, FUGE = Q.fuge;
  Object.assign(out, await p.evaluate(async ({src, ZEILEN, WAHL, FUGE, S, INNEN, QUAL}) => {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
    const D = cx.getImageData(0, 0, W, H).data;
    const L = (x, y) => { const o = (y*W + x)*4; return .299*D[o] + .587*D[o+1] + .114*D[o+2]; };
    const res = {};
    ZEILEN.forEach((z, zi) => {
      // Die Zelle hält Abstand zu ihrer Grenze (`fuge`), sonst käme die helle
      // Linie zwischen zwei Zellen oder ein Stück des Nachbarn mit.
      const yOben = z.y0 + FUGE, yUnten = z.y1 - FUGE;
      res[z.key] = z.nimm.map((spalte, gi) => {
        const sx = z.x[spalte];
        const xL = z.xg[spalte] + FUGE, xR = z.xg[spalte + 1] - FUGE;
        // Das Loch des Reifs, mit Strahlen abgetastet: von der Mitte aus in 48
        // Richtungen bis zur ersten hellen Kante. Eine Flutfüllung lief durch
        // jede dunkle Stelle im Band nach außen und machte das Loch doppelt so
        // groß. Der Median der Strahlen ist der Innenradius, und aus je zwei
        // gegenüberliegenden Strahlen folgt die Mitte; zweimal nachgerichtet.
        let mx = sx, my = z.y, ri = 40;
        const hell = (x, y, l0) => L(Math.round(x), Math.round(y)) > l0 + 38;
        for(let runde = 0; runde < 3; runde++){
          const l0 = L(Math.round(mx), Math.round(my)), d = [];
          for(let k = 0; k < 48; k++){
            const a = k / 48 * Math.PI * 2; let r = 8;
            while(r < 90 && !hell(mx + Math.cos(a)*r, my + Math.sin(a)*r, l0)) r += .5;
            d.push(r);
          }
          let ex = 0, ey = 0, ne = 0;
          for(let k = 0; k < 24; k++){
            const a = k / 48 * Math.PI * 2, dd = (d[k] - d[k + 24]) / 2;
            ex += Math.cos(a) * dd; ey += Math.sin(a) * dd; ne++;
          }
          mx += ex / ne * 2; my += ey / ne * 2;
          ri = d.slice().sort((u, v) => u - v)[24];
        }
        // Der Grund: der Mittelwert im Loch.
        let bg = [0,0,0], n = 0;
        for(let y = Math.round(my - ri*.6); y <= my + ri*.6; y++) for(let x = Math.round(mx - ri*.6); x <= mx + ri*.6; x++){
          const o = (y*W + x)*4; bg[0] += D[o]; bg[1] += D[o+1]; bg[2] += D[o+2]; n++; }
        bg = bg.map(v => v / n);
        // Ausschnitt: 2,6 Innenradien nach jeder Seite, auf S Pixel gebracht.
        const halb = ri / (2 * INNEN);
        const o = document.createElement('canvas'); o.width = o.height = S;
        const oc = o.getContext('2d'); oc.imageSmoothingQuality = 'high';
        oc.drawImage(cv, mx - halb, my - halb, halb*2, halb*2, 0, 0, S, S);
        const od = oc.getImageData(0, 0, S, S), q = od.data;
        const sk = S / (halb*2);
        for(let yy = 0; yy < S; yy++) for(let xx = 0; xx < S; xx++){
          const i = (yy*S + xx)*4;
          const qx = mx - halb + xx / sk, qy = my - halb + yy / sk;
          // Außerhalb der eigenen Zelle: nichts vom Nachbarn.
          const rand = Math.min(qx - xL, xR - qx, qy - yOben, yUnten - qy);
          const zell = Math.max(0, Math.min(1, rand / 4));
          // Farbe zu Transparenz gegen den Grund: was heller ist als der Grund,
          // wird deckend im Maß seines Abstands.
          let a = 0;
          for(let c = 0; c < 3; c++) a = Math.max(a, (q[i+c] - bg[c]) / (255 - bg[c]));
          a = Math.max(0, Math.min(1, (a - .035) / .965));
          a = Math.pow(a, .85);
          if(a > .002) for(let c = 0; c < 3; c++) q[i+c] = Math.max(0, Math.min(255, (q[i+c] - bg[c]*(1 - a)) / a));
          q[i+3] = Math.round(a * 255 * zell);
        }
        // ── Spiegelgleich machen ──────────────────────────────────────
        // Die Vorlage ist gemalt und nicht gespiegelt: eine Seite trägt mehr
        // Schnörkel, eine Sichel sitzt höher, und wo der Nachbar zu nah stand,
        // ist eine Spitze abgeschnitten. Aus der besseren Hälfte wird die
        // andere gespiegelt; die Mitte (Lilie, Krone, Raute) bleibt original.
        const A = i => q[i*4+3];
        let achse = S/2, best = -1;
        for(let dx = -6; dx <= 6; dx += .5){
          const c = S/2 + dx; let s = 0;
          for(let yy = 0; yy < S; yy += 2) for(let xx = Math.round(c) + 4; xx < S; xx += 2){
            const xm = Math.round(2*c - xx); if(xm < 0) continue;
            s += Math.min(A(yy*S + xx), A(yy*S + xm));
          }
          if(s > best){ best = s; achse = c; }
        }
        let sumL = 0, sumR = 0;
        for(let yy = 0; yy < S; yy++) for(let xx = 0; xx < S; xx++){ const v = A(yy*S + xx); if(xx < achse) sumL += v; else sumR += v; }
        const seite = (WAHL[z.key] && WAHL[z.key][gi]) || (sumL >= sumR ? 'L' : 'R');
        // Dabei wird zugleich auf die Achse zentriert: gespiegelt wird um sie,
        // und sie landet genau auf der Mitte der Kante — sonst stünde das
        // Zeichen bis zu einem Pixel neben dem Gesicht.
        const alt = Float32Array.from(q), band = S * .035;
        const hol = (xs, yy, c) => {                // linear zwischen zwei Spalten
          const x0 = Math.floor(xs), f = xs - x0;
          const v = i => (i >= 0 && i < S) ? alt[(yy*S + i)*4 + c] : 0;
          return v(x0) * (1 - f) + v(x0 + 1) * f;
        };
        for(let yy = 0; yy < S; yy++) for(let xx = 0; xx < S; xx++){
          const d = xx - (S - 1) / 2, aufQuelle = seite === 'L' ? d < 0 : d > 0;
          const i = (yy*S + xx)*4;
          let w = aufQuelle ? 0 : 1;                          // Anteil der Spiegelung
          if(Math.abs(d) < band) w *= Math.max(0, (Math.abs(d) - band*.35) / (band*.65));
          for(let c = 0; c < 4; c++)
            q[i+c] = hol(achse + d, yy, c) * (1 - w) + hol(achse - d, yy, c) * w;
        }
        // ── Splitter entfernen: kleine Inseln abseits des Zeichens ──────────
        const lab = new Int32Array(S*S).fill(-1), groesse = [];
        for(let k = 0; k < S*S; k++){
          if(lab[k] >= 0 || q[k*4+3] < 40) continue;
          const id = groesse.length, st = [k]; let n = 0; lab[k] = id;
          while(st.length){ const m = st.pop(); n++; const x = m % S, y = (m - x) / S;
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(([u, v]) => { const x2 = x+u, y2 = y+v; if(x2<0||y2<0||x2>=S||y2>=S) return;
              const m2 = y2*S + x2; if(lab[m2] < 0 && q[m2*4+3] >= 40){ lab[m2] = id; st.push(m2); } }); }
          groesse.push(n);
        }
        // Die feinen Strahlen des Ordenssterns stehen frei neben dem Reif und
        // sind jeder für sich klein; mit derselben Grenze wie ein Splitter
        // fielen sie weg (`insel` an der Zeile).
        const gross = Math.max(...groesse), INSEL = z.insel || .02;
        for(let k = 0; k < S*S; k++){
          const x = k % S, y = (k - x) / S, r = Math.hypot(x - S/2, y - S/2);
          // Was nicht zu einer großen Fläche gehört, fällt: auch der schwache
          // Schein um einen Splitter.
          let raus = lab[k] >= 0 && groesse[lab[k]] < gross * INSEL;
          if(lab[k] < 0 && q[k*4+3] > 0){
            // schwacher Rest: nur behalten, wenn eine große Fläche nah ist
            let nah = false;
            for(let u = -3; u <= 3 && !nah; u++) for(let v = -3; v <= 3 && !nah; v++){
              const x2 = x+u, y2 = y+v; if(x2<0||y2<0||x2>=S||y2>=S) continue;
              const l2 = lab[y2*S + x2]; if(l2 >= 0 && groesse[l2] >= gross * INSEL) nah = true; }
            raus = !nah;
          }
          if(raus) q[k*4+3] = 0;
          // Lange Spitzen laufen weich aus, statt an der Kachel abzubrechen.
          // Die Zeichenfläche der App reicht 72 Einheiten um die Mitte, das
          // sind 42,3 % der Kante (INS_R / .235 = 170,2 Einheiten Kante).
          // Bis dorthin ist alles ausgelaufen; sonst schnitte der Rand der
          // Fläche eine Spitze gerade ab.
          const f = Math.max(0, Math.min(1, (S*.423 - r) / (S*.05)));
          // Das Loch gehört dem Gesicht. Die erste Vorlage ist aus
          // Bildschirmfotos zusammengesetzt, und im Loch des Kronenreifs lag
          // ein heller Schein, der als Dunst über dem Gesicht stand. Innen
          // läuft deshalb alles bis kurz vor den Innenrand (22 %) aus.
          const innen = Math.max(0, Math.min(1, (r - S*.19) / (S*.02)));
          q[k*4+3] = q[k*4+3] * f * innen;
        }
        oc.putImageData(od, 0, 0);
        return {url: o.toDataURL('image/webp', QUAL), ri, mx, my, seite, achse: +(achse - S/2).toFixed(1)};
      });
    });
    return res;
  }, {src, ZEILEN, WAHL, FUGE, S, INNEN, QUAL}));
  }
  await b.close();
  let js = `// ─── Die Zeichen der Insignium-Leiter [§C30] ───────────────────────────
// ERZEUGT von tools/insignium-bilder.js aus mockup/insignium-vorlage.webp und
// mockup/insignium-vorlage-stern.webp —
// nicht von Hand bearbeiten. Je Stufe drei Bilder, eines je Grad (beim
// Ordensstern je Zacke), ${S} × ${S} Pixel, der Innenrand des Reifs bei 22 % der Kante und
// die Bandmitte bei 24 %: so liegt der Reif jedes Bildes auf INS_R.
// Gezeichnet ist alles im Violett der Elite; die übrigen Ränge färbt der
// Filter \`rf\` aus \`_insDefs\` um.
const INS_BILD = {\n`;
  for(const k in out) js += `  ${k}: [\n` + out[k].map(x => `    '${x.url}'`).join(',\n') + `],\n`;
  js += '};\n';
  fs.writeFileSync(path.join(WURZEL, 'src/js/35a-insignium-bilder.js'), js);
  for(const k in out) console.log(k.padEnd(8), out[k].map(x => Math.round(x.url.length/1024) + 'K ' + x.seite).join('  '));
  console.log('geschrieben:', Math.round(js.length / 1024), 'KB');
})();
