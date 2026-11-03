// Misst jede Zeichnung an jeder Partie, an der sie zutrifft: nicht nur die
// zwei Beispiele je Kopf und Fuß auf der Seite, sondern alle Köpfe und Füße
// aller 616 Partien bis Oktober, je als eigene Karte. So steht auch die
// Partie mit der längsten Serie, dem vollsten Monat zu null und den engsten
// Plätzen auf dem Prüfstand.
//
//   node tools/build.mjs && node mockup/kopf-fuss-anlaesse.js && node mockup/kopf-fuss-pruef.js
//
// Gemessen wird in Chromium am gezeichneten Markup, je Kopf und je Fuß:
//  • über den Rand — ein Teil ragt über den Kasten hinaus (der Kopf schneidet
//    es ab, im Fuß steht es über der Karte);
//  • Überschneidung — zwei Gesichter, zwei Beschriftungen oder zwei Zeichen
//    liegen übereinander (Wippe, Leiste, Säulen, Pucks, Formkurven …);
//  • abgeschnitten — ein Name oder eine Zahl passt nicht in ihr Feld;
//  • Umbruch — eine Beschriftung außer dem Satz des Fußes bricht um.
// Die Zeilen unter der Schlagzeile (`.nf-sam`) zählen für die ersten drei mit.
// Das Ergebnis steht in `.kopf-fuss-pruef.json` und auf der Seite; der Lauf
// endet rot, wenn eine Zahl nicht null ist.
'use strict';
process.env.TZ = 'Europe/Berlin';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {chromium} = require('playwright');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kopf-fuss-'));
const daten = path.join(tmp, 'alle.json'), seite = path.join(tmp, 'alle.html');
const node = (datei, env) => execFileSync(process.execPath, [path.join(__dirname, datei)], {env:Object.assign({}, process.env, env), stdio:['ignore', 'pipe', 'inherit']});
node('kopf-fuss-lauf.js', {KF_ALLE:daten});
node('kopf-fuss-seite.js', {KF_ALLE:daten, KF_ALLE_HTML:seite});

(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({viewport:{width:1300, height:900}, deviceScaleFactor:1});
  const fehler = [];
  p.on('pageerror', e => fehler.push(String(e)));
  p.on('console', m => { if(m.type() === 'error') fehler.push(m.text()); });
  await p.goto('file://' + seite, {timeout:300000});
  await p.evaluate(() => document.fonts.ready);
  // Gemessen wird der Endstand, nicht ein Bild mitten im Aufklappen.
  await p.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {karten:0, raus:[], ueber:[], ab:[], umbruch:[]};
    const name = c => c.closest('figure').querySelector('figcaption').textContent.split(' · ').slice(0, 3).join(' · ');
    const cls = e => (e.getAttribute('class') || e.tagName.toLowerCase()).slice(0, 40);
    const rect = e => e.getBoundingClientRect();
    const sicht = e => { const q = rect(e), s = getComputedStyle(e);
      return q.width > 0 && q.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
    const mitText = e => [...e.childNodes].some(t => t.nodeType === 3 && t.textContent.trim());
    // Zeichen ohne eigenen Text, die einander trotzdem nicht berühren dürfen.
    const ZEICHEN = '.kf-wt i, .kf-rg-l em, .kf-zw-l i, .kf-wp-a, .kf-wp-n, .kf-tp-av, .kf-kal-g i, .kf-pk-r i, .kf-luecke, .kf-dom i, '
      + '.kf-kette i, .kf-kette u, .kf-fk, .kf-gauge, .kf-st-a, .kf-st-m, .kf-flap, .kf-tor, .kf-dv-s i, .kf-ew-a em, .kf-jub-m, '
      + '.kf-b-b, .kf-ch-b, .kf-ab-r i, .kf-sb i, .kf-nul-t, .kf-nul-b, .kf-od>i, .kf-sz-s>i, .kf-em-l em, .kf-rg-l em';
    document.querySelectorAll('.kf-karte').forEach(c => {
      out.karten++;
      const n = name(c);
      // Die Zeilen (`.nf-sam`) zählen mit: Text bricht dort um, aber nichts
      // darf übereinander liegen oder über den Rand stehen.
      ['.kf-kopf', '.kf-fuss', '.nf-sam'].forEach(sel => {
        const box = c.querySelector(sel); if(!box) return;
        const B = rect(box), alle = [...box.querySelectorAll('*')].filter(sicht);
        alle.forEach(e => {
          if(e.closest('svg') && e.tagName !== 'svg' && e.tagName !== 'text') return;
          const q = rect(e), d = Math.max(B.left - q.left, q.right - B.right, B.top - q.top, q.bottom - B.bottom);
          if(d > .5) out.raus.push(`${n} | ${sel} | ${cls(e)} | ${d.toFixed(1)} px`);
        });
        const atome = alle.filter(e => {
          if(e.closest('.av') && !e.classList.contains('av')) return false;
          if(e.classList.contains('av') || e.tagName === 'text' || e.matches(ZEICHEN)) return true;
          return !e.closest('svg') && mitText(e);
        });
        // Zeile für Zeile: ein umbrochener Satzteil ist als Ganzes ein
        // Rechteck über beide Zeilen und träfe sonst jeden Nachbarn.
        for(let i = 0; i < atome.length; i++) for(let j = i + 1; j < atome.length; j++){
          const a = atome[i], b = atome[j];
          if(a.contains(b) || b.contains(a)) continue;
          let treffer = null;
          [...a.getClientRects()].forEach(x => [...b.getClientRects()].forEach(y => {
            const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
            if(!treffer && w > 1 && h > 1 && w * h > 6) treffer = w.toFixed(0) + '×' + h.toFixed(0);
          }));
          if(treffer) out.ueber.push(`${n} | ${sel} | ${cls(a)} ⟂ ${cls(b)} | ${treffer}`);
        }
        alle.forEach(e => {
          if(e.closest('svg')) return;
          const s = getComputedStyle(e);
          // Quer abgeschnitten, oder nach seinen Zeilen (`line-clamp`) unten.
          if((e.scrollWidth > e.clientWidth + 1 && s.overflow !== 'visible')
             || (+s.webkitLineClamp > 0 && e.scrollHeight > e.clientHeight + 1))
            out.ab.push(`${n} | ${sel} | ${cls(e)} | „${e.textContent.trim().slice(0, 30)}“`);
        });
        if(sel !== '.nf-sam') alle.forEach(e => {
          if(e.closest('svg') || e.closest('.kf-satz') || e.closest('.av') || !mitText(e)) return;
          const s = getComputedStyle(e), lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.25;
          if(s.display === 'grid' || s.display === 'flex') return;
          const innen = rect(e).height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) - parseFloat(s.borderTopWidth) - parseFloat(s.borderBottomWidth);
          const zeilen = e.getClientRects().length > 1 ? e.getClientRects().length : Math.floor(innen / lh + .35);
          // Ein Name unter einer Medaille darf auf so viele Zeilen umbrechen,
          // wie sein `line-clamp` erlaubt; jede andere Beschriftung auf keine.
          if(zeilen > Math.max(1, +s.webkitLineClamp || 0)) out.umbruch.push(`${n} | ${sel} | ${cls(e)} | „${e.textContent.trim().slice(0, 40)}“`);
        });
      });
    });
    return out;
  });
  await br.close();
  fs.rmSync(tmp, {recursive:true, force:true});

  // Je Zeichnung und Befund gezählt, mit einem Beispiel.
  const zeig = (titel, l) => {
    const g = {};
    l.forEach(x => { const t = x.split(' | '), teil = t[0].split(' · ');
      const key = (t[1] === '.kf-kopf' ? teil[1] : teil[2]) + ' | ' + t[2]; (g[key] = g[key] || []).push(x); });
    console.log(`${l.length ? '✗' : '✓'} ${titel}: ${l.length}`);
    Object.keys(g).sort((a, b) => g[b].length - g[a].length).slice(0, 12)
      .forEach(k => console.log(`    ${g[k].length}× ${k}\n       z. B. ${g[k][0]}`));
  };
  console.log(`${r.karten} Karten`);
  if(fehler.length) console.log('✗ Fehler der Seite: ' + fehler.slice(0, 3).join(' · '));
  zeig('über den Rand', r.raus); zeig('Überschneidung', r.ueber); zeig('abgeschnitten', r.ab); zeig('Umbruch', r.umbruch);
  const erg = {karten:r.karten, raus:r.raus.length, ueber:r.ueber.length, ab:r.ab.length, umbruch:r.umbruch.length, fehler:fehler.length};
  fs.writeFileSync(path.join(__dirname, '.kopf-fuss-pruef.json'), JSON.stringify(erg));
  // Die Seite nennt, was eben gemessen wurde.
  node('kopf-fuss-seite.js', {});
  process.exit(erg.raus + erg.ueber + erg.ab + erg.umbruch + erg.fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
