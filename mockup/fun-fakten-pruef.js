// Misst jede Zeichnung der Fun Facts: jede gewählte Karte des Laufs und
// jedes Beispiel des Katalogs, in Chromium am gezeichneten Markup.
//
//   node tools/build.mjs && node mockup/fun-fakten-lauf.js && node mockup/fun-fakten-pruef.js
//
// Gemessen wird in der Zeichnung (`.ff-neu`):
//  • über den Rand — ein Teil ragt über die Zeichnung hinaus;
//  • Überschneidung — zwei Gesichter, zwei Beschriftungen oder zwei Zeichen
//    liegen übereinander;
//  • abgeschnitten — ein Name oder eine Zahl passt nicht in ihr Feld, außer
//    dort, wo die Zeichnung absichtlich mit „…“ kürzt (`text-overflow`);
//  • Umbruch — eine Beschriftung bricht um.
// Der Lauf endet rot, wenn eine Zahl nicht null ist.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {chromium} = require('playwright');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fun-fakten-'));
const seite = path.join(tmp, 'alle.html');
execFileSync(process.execPath, [path.join(__dirname, 'fun-fakten-seite.js')], {env:Object.assign({}, process.env, {FF_ALLE_HTML:seite}), stdio:['ignore', 'pipe', 'inherit']});

(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({viewport:{width:1300, height:900}, deviceScaleFactor:1});
  const fehler = [];
  p.on('pageerror', e => fehler.push(String(e)));
  await p.goto('file://' + seite, {timeout:120000});
  await p.evaluate(() => document.fonts.ready);
  await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const out = {karten:0, raus:[], ueber:[], ab:[], umbruch:[]};
    const rect = e => e.getBoundingClientRect();
    const sicht = e => { const q = rect(e), s = getComputedStyle(e); return q.width > 0 && q.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
    const mitText = e => [...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim());
    const cls = e => (e.getAttribute('class') || e.tagName.toLowerCase()).slice(0, 40);
    // Zeichen ohne eigenen Text, die einander nicht berühren dürfen.
    const ZEICHEN = '.fx-pr i, .fx-kt-l i, .fx-zl-f i, .fx-zl-z i, .fx-tau-s i, .fx-fs i, .fx-nz-g i, .fx-bar, .fx-svg, .fx-cd-r';
    document.querySelectorAll('.ff.ff-neu').forEach(box => {
      out.karten++;
      const n = box.closest('.nf-card').querySelector('.nf-h').textContent.trim().slice(0, 60);
      const B = rect(box), alle = [...box.querySelectorAll('*')].filter(sicht);
      alle.forEach(e => {
        if(e.closest('svg') && e.tagName !== 'svg' && e.tagName !== 'text') return;
        const q = rect(e), d = Math.max(B.left - q.left, q.right - B.right, B.top - q.top, q.bottom - B.bottom);
        if(d > .5) out.raus.push(`${n} | ${cls(e)} | ${d.toFixed(1)} px`);
      });
      const atome = alle.filter(e => {
        if(e.closest('.av') && !e.classList.contains('av')) return false;
        if(e.classList.contains('av') || e.tagName === 'text' || e.matches(ZEICHEN)) return true;
        return !e.closest('svg') && mitText(e);
      });
      for(let i = 0; i < atome.length; i++) for(let j = i + 1; j < atome.length; j++){
        const a = atome[i], b = atome[j];
        if(a.contains(b) || b.contains(a)) continue;
        let t = null;
        [...a.getClientRects()].forEach(x => [...b.getClientRects()].forEach(y => {
          const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
          if(!t && w > 1 && h > 1 && w * h > 6) t = w.toFixed(0) + '×' + h.toFixed(0);
        }));
        if(t) out.ueber.push(`${n} | ${cls(a)} ⟂ ${cls(b)} | ${t}`);
      }
      alle.forEach(e => {
        if(e.closest('svg')) return;
        const s = getComputedStyle(e);
        if(e.scrollWidth > e.clientWidth + 1 && s.overflow !== 'visible' && s.textOverflow !== 'ellipsis' && !e.classList.contains('av'))
          out.ab.push(`${n} | ${cls(e)} | „${e.textContent.trim().slice(0, 30)}“`);
        // Ein Gesicht ist höher als seine Zeile Buchstaben, das ist kein Umbruch.
        if(!mitText(e) || s.display === 'grid' || s.display === 'flex' || e.closest('.av')) return;
        const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.25;
        const zeilen = e.getClientRects().length > 1 ? e.getClientRects().length : Math.floor((rect(e).height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)) / lh + .35);
        if(zeilen > 1 && !e.closest('.fx-nz-t')) out.umbruch.push(`${n} | ${cls(e)} | „${e.textContent.trim().slice(0, 40)}“`);
      });
    });
    return out;
  });
  await br.close();
  fs.rmSync(tmp, {recursive:true, force:true});
  const zeig = (titel, l) => {
    const g = {};
    l.forEach(x => { const t = x.split(' | '), k = t.slice(1, -1).join(' | ') || t[1]; (g[k] = g[k] || []).push(x); });
    console.log(`${l.length ? '✗' : '✓'} ${titel}: ${l.length}`);
    Object.keys(g).sort((a, b) => g[b].length - g[a].length).slice(0, 10).forEach(k => console.log(`    ${g[k].length}× ${k}\n       z. B. ${g[k][0]}`));
  };
  console.log(`${r.karten} Zeichnungen`);
  if(fehler.length) console.log('✗ Fehler der Seite: ' + fehler.slice(0, 3).join(' · '));
  zeig('über den Rand', r.raus); zeig('Überschneidung', r.ueber); zeig('abgeschnitten', r.ab); zeig('Umbruch', r.umbruch);
  const erg = {karten:r.karten, raus:r.raus.length, ueber:r.ueber.length, ab:r.ab.length, umbruch:r.umbruch.length, fehler:fehler.length};
  process.exit(erg.raus + erg.ueber + erg.ab + erg.umbruch + erg.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
