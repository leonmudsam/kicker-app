// Misst, was `langlebig-lauf.js` nach gut vier Jahren Liga gezeichnet hat:
// jede Art Karte mit ihrem längsten Text und ihrer längsten Zahl, Karte und
// Blatt, in Chromium. Gezählt wird, was mit vielen Jahren kaputtgeht:
//  • über den Rand — ein Teil ragt seitlich aus Karte oder Blatt;
//  • abgeschnitten — ein Text passt nicht in sein Feld;
//  • gekürzt — ein Text endet mit „…“;
//  • zu klein — eine Schrift unter 8 px;
//  • quer — das Blatt lässt sich seitlich scrollen.
// Dazu die Sätze, die mit Jahren nicht mehr stimmen, und die Laufzeit des
// Generators je Tag. Schreibt `langlebig.html`; endet rot, wenn etwas
// über den Rand ragt, abgeschnitten ist oder das Blatt quer scrollt.
//
//   node tools/build.mjs && node mockup/langlebig-lauf.js && node mockup/langlebig-pruef.js [ziel.html]
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {chromium} = require('playwright');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '.langlebig.json'), 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const z = v => String(v).replace('.', ',');

// Je Art die Beispiele, ohne doppelte.
const faelle = [];
Object.keys(D.arten).sort().forEach(art => { const a = D.arten[art], ids = new Set();
  ['zahl', 'laenge'].forEach(w => { const b = a[w]; if(!b || ids.has(b.id)) return; ids.add(b.id); faelle.push(Object.assign({art, was:w, n:a.n}, b)); }); });
const kopf = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Sometype+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap">
<style>${D.css}</style><style>html,body{height:auto;overflow:auto;background:var(--bg)}
.ll-f{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;padding:10px}
.ll-k{width:320px}.ll-k .nf-wrap{padding:0 16px}.ll-k .nf-card{content-visibility:visible}
.ll-b{width:360px}.ll-b .nd{position:relative;max-height:none;overflow-x:hidden;overflow-y:visible;transform:none;opacity:1;visibility:visible}
*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body>`;
const messSeite = kopf + `<div class="ll-f">${faelle.map((f, i) => `<div class="ll-k" data-i="${i}"><div class="nf-wrap nf-liste"><div class="nf-feed">${f.karte}</div></div></div>
  ${f.blatt ? `<div class="ll-b" data-i="${i}"><div class="${esc(f.ndKlasse || 'nd')}">${f.blatt}</div></div>` : ''}`).join('')}</div></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'langlebig-')), datei = path.join(tmp, 'mess.html');
  fs.writeFileSync(datei, messSeite);
  const br = await chromium.launch();
  const p = await br.newPage({viewport:{width:1400, height:900}, deviceScaleFactor:1});
  await p.goto('file://' + datei, {timeout:180000});
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const out = [];
    const sicht = e => { const q = e.getBoundingClientRect(), s = getComputedStyle(e); return q.width > 0 && q.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
    const mitText = e => [...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim());
    document.querySelectorAll('.ll-k, .ll-b').forEach(w => {
      const i = +w.dataset.i, wo = w.classList.contains('ll-k') ? 'Karte' : 'Blatt';
      const box = w.firstElementChild, B = box.getBoundingClientRect();
      [...box.querySelectorAll('*')].filter(sicht).forEach(e => {
        if(e.closest('svg') && e.tagName !== 'svg') return;
        const q = e.getBoundingClientRect(), s = getComputedStyle(e);
        const d = Math.max(B.left - q.left, q.right - B.right);
        if(d > .5 && !e.closest('.nf-motiv') && !e.classList.contains('nf-motiv')) out.push({i, wo, art:'raus', was:(e.className && e.className.baseVal == null ? e.className : e.tagName).toString().slice(0, 40), wert:d.toFixed(1) + ' px', text:e.textContent.trim().slice(0, 40)});
        if(!mitText(e) || e.closest('svg')) return;
        if(e.scrollWidth > e.clientWidth + 1 && s.overflow !== 'visible' && !e.classList.contains('av') && !e.closest('.av'))
          out.push({i, wo, art:s.textOverflow === 'ellipsis' ? 'gekürzt' : 'ab', was:String(e.className).slice(0, 40), text:e.textContent.trim().slice(0, 50)});
        // Die Initialen im Gesicht sind ein Zeichen, kein Text: sie stehen
        // überall in der App so klein.
        if(parseFloat(s.fontSize) < 8 && !e.closest('.av')) out.push({i, wo, art:'klein', was:String(e.className).slice(0, 40), wert:s.fontSize, text:e.textContent.trim().slice(0, 30)});
      });
      // Quer scrollt nur, was nicht abschneidet: das Blatt schneidet seitlich
      // ab (`.nd`), und das Motiv dahinter ragt mit Absicht über den Rand.
      const ox = getComputedStyle(box).overflowX;
      if(wo === 'Blatt' && ox !== 'hidden' && ox !== 'clip' && box.scrollWidth > box.clientWidth + 1) out.push({i, wo, art:'quer', was:'nd', wert:(box.scrollWidth - box.clientWidth) + ' px', text:''});
    });
    return out;
  });
  await br.close();
  fs.rmSync(tmp, {recursive:true, force:true});

  const ART = {raus:'über den Rand', ab:'abgeschnitten', gekuerzt:'gekürzt mit „…“', klein:'Schrift unter 8 px', quer:'Blatt scrollt quer'};
  const zahl = k => r.filter(x => x.art === k).length;
  const g = D.laufzeit.map(x => x.gen).sort((a, b) => a - b), k = D.laufzeit.map(x => x.kons).sort((a, b) => a - b);
  const median = l => l[l.length >> 1] || 0;
  // Ab einer Sekunde in Sekunden, mit Komma.
  const dauer = ms => ms >= 1000 ? z(Math.round(ms / 100) / 10) + ' s' : ms + ' ms';
  console.log(`${faelle.length} Fälle aus ${Object.keys(D.arten).length} Arten`);
  ['raus', 'ab', 'gekürzt', 'klein', 'quer'].forEach(a => { const l = r.filter(x => x.art === a);
    console.log(`${l.length ? (a === 'gekürzt' || a === 'klein' ? '•' : '✗') : '✓'} ${a}: ${l.length}`);
    l.slice(0, 8).forEach(x => console.log(`    ${faelle[x.i].art} · ${x.wo} · ${x.was} · ${x.wert || ''} „${x.text}“`)); });
  console.log(`Generator je Tag: Median ${median(g)} ms, höchstens ${g[g.length - 1]} ms; Bündeln Median ${median(k)} ms`);
  D.befunde.forEach(b => console.log(`  Text · ${b.name} · ${b.form} · „${b.treffer}“`));

  // ── Der Bericht ──
  const befundZeilen = r.map(x => `<tr><td>${esc(faelle[x.i].art)}</td><td>${esc(x.wo)}</td><td>${esc(ART[x.art === 'gekürzt' ? 'gekuerzt' : x.art])}</td><td>${esc(x.text)}</td><td class="num">${esc(x.wert || '')}</td></tr>`).join('');
  const lz = D.laufzeit, max = Math.max(...lz.map(x => x.gen), 1);
  const balken = lz.map((x, i) => `<i style="height:${(x.gen / max * 100).toFixed(1)}%" title="${esc(x.tag)}: ${x.gen} ms"></i>`).join('');
  // Der Titel steht vorn: nur die ersten 8 KB werden nach ihm durchsucht,
  // und das CSS der App davor ist größer.
  const html = kopf.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
    '$&<title>Langlebigkeit der Stories</title><meta name="claude:viewport-fit-sides" content="cover">').replace('<body>', `<style>
    :root{color-scheme:dark}
    body{font-family:'Space Grotesk',system-ui,sans-serif;color:var(--ink);padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));line-height:1.5}
    .ll-h,.ll-s{max-width:1180px;margin:0 auto 44px}.ll-h h1{font:400 clamp(32px,7vw,56px)/1 'Archivo Black',sans-serif;margin:8px 0 12px}
    .ll-o{font:600 12px 'Sometype Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .ll-l{max-width:72ch;color:var(--ink2)}.ll-z{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
    .ll-z span{border:1px solid var(--line);border-radius:14px;padding:9px 13px;font-size:12.5px;color:var(--ink2);background:var(--surface)}
    .ll-z b{display:block;font:400 21px 'Archivo Black',sans-serif;color:var(--blue,#56b4e8)}
    .ll-s h2{font:400 clamp(24px,4.5vw,32px)/1.1 'Archivo Black',sans-serif;margin-bottom:10px}
    .ll-t{max-width:100%;overflow-x:auto}.ll-t table{border-collapse:collapse;font-size:12.5px;color:var(--ink2);min-width:680px}
    .ll-t th{font:600 10px 'Sometype Mono',monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);text-align:left;padding:6px 10px;border-bottom:1px solid var(--line2)}
    .ll-t td{padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:top}.ll-t .num{text-align:right;font-family:'Sometype Mono',monospace}
    .ll-lz{display:flex;align-items:flex-end;gap:1px;height:90px;border-bottom:1px solid var(--line2);max-width:760px}
    .ll-lz i{flex:1;min-width:1px;background:var(--blue,#56b4e8);opacity:.7;border-radius:1px 1px 0 0}
    .ll-k figcaption{font:500 10.5px 'Sometype Mono',monospace;color:var(--muted);padding:4px 16px 10px}
  </style><body>`) + `
  <header class="ll-h"><p class="ll-o">Stories · nach gut vier Jahren</p><h1>Langlebigkeit der Stories</h1>
    <p class="ll-l">Die echten Partien bis Oktober neunmal hintereinander, jedes Mal 23 Wochen später, mit vertauschten Spielern und jedem vierten Ergebnis gedreht: ${D.liga.partien} Partien vom ${esc(D.liga.von)} bis ${esc(D.liga.bis)}, ${D.liga.monate} Monate. Die letzten 150 Tage, mit einem Jahreswechsel, liefen Tag für Tag durch den Generator der App; von jeder Art Karte stehen hier die Fälle mit der längsten Zahl und dem längsten Text, Karte und Blatt in Chromium gemessen.</p>
    <div class="ll-z"><span><b class="num">${D.liga.partien}</b> Partien</span><span><b class="num">${D.zahlen.spiele}</b> Partien des Fleißigsten</span>
      <span><b class="num">${Object.keys(D.arten).length}</b> Arten Karten</span><span><b class="num">${dauer(median(g))}</b> Generator je Tag, Median</span>
      <span><b class="num">${dauer(g[g.length - 1])}</b> höchstens</span>
      <span><b class="num">${zahl('raus') + zahl('ab') + zahl('quer')}</b> Überläufe und Abschnitte</span><span><b class="num">${D.befunde.length}</b> Sätze, die nicht mehr stimmen</span></div></header>
  <section class="ll-s"><h2>Laufzeit des Generators, Tag für Tag</h2><div class="ll-lz">${balken}</div>
    <p class="ll-l">Jeder Balken ein Tag der letzten 150, die Höhe die Zeit für alle Stories dieses Tages (höchstens ${dauer(g[g.length - 1])}), in Node auf einem Rechner, nicht auf einem Telefon. Bündeln für den Feed: Median ${dauer(median(k))}.</p></section>
  <section class="ll-s"><h2>Sätze, die mit Jahren nicht mehr stimmen</h2><div class="ll-t"><table><thead><tr><th>Befund</th><th>Art</th><th>Stelle</th><th>Satz</th></tr></thead><tbody>
    ${D.befunde.map(b => `<tr><td>${esc(b.name)}</td><td>${esc(b.form)}</td><td>„${esc(b.treffer)}“</td><td>${esc(b.text.slice(0, 160))}</td></tr>`).join('') || '<tr><td colspan="4">keine</td></tr>'}</tbody></table></div></section>
  <section class="ll-s"><h2>Gemessen in Karte und Blatt</h2><div class="ll-t"><table><thead><tr><th>Art</th><th>Wo</th><th>Befund</th><th>Text</th><th class="num">Wert</th></tr></thead><tbody>
    ${befundZeilen || '<tr><td colspan="5">keine</td></tr>'}</tbody></table></div></section>
  <section class="ll-s"><h2>Jede Art mit ihrer längsten Zahl</h2><div class="ll-f">${faelle.filter(f => f.was === 'zahl').map(f => `<figure class="ll-k"><div class="nf-wrap nf-liste"><div class="nf-feed">${f.karte}</div></div>
    <figcaption>${esc(f.art)} · ${f.n} Karten · ${esc(f.tag)} · ${f.ziffern} Ziffern</figcaption></figure>`).join('')}</div></section>
  </body></html>`;
  fs.writeFileSync(path.join(__dirname, 'langlebig.html'), html);
  if(process.argv[2]) fs.writeFileSync(process.argv[2], html.replace(/^[\s\S]*?<title>/, '<title>').replace(/<\/head><body>/, '').replace(/<\/body><\/html>$/, ''));
  console.log('langlebig.html · ' + Math.round(html.length / 1024) + ' kB');
  process.exit(zahl('raus') + zahl('ab') + zahl('quer') ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
