// Baut aus dem Ergebnis des Laufs die Seite `story-simulation.html`:
// die echte Tafel, jede erzeugte Story mit ihrem Urteil, die Zahlen je Tag
// und jedes Blatt. Die Stile kommen aus der ausgelieferten App.
//
'use strict';
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/.story-simulation.json', 'utf8'));
const html = fs.readFileSync('/home/user/kicker-app/dist/index.html', 'utf8');
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
// Der Gradienten-Topf des Insigniums lebt im Rumpf, außerhalb von #app [§C30].
const bodyStart = html.indexOf('<body', html.indexOf('</head>'));
const rumpf = html.slice(bodyStart, html.indexOf('<script', bodyStart));
const insDefs = (rumpf.match(/<svg id="insDefs"[\s\S]*?<\/svg>/i) || [''])[0];
const fonts = (kopf.match(/<link[^>]+fonts[^>]*>/gi) || []).join('\n');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uhr = ms => { const d = new Date(ms);
  return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0')
       + '. ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0'); };

const zeilen = D.zeilen.slice().sort((a,b) => b.zeit - a.zeit);
const proTyp = {};
zeilen.forEach(z => { const t = proTyp[z.typ] = proTyp[z.typ] || {roh:0, feed:0};
  t.roh++; if(z.drin) t.feed++; });
const feedProTag = {};
zeilen.filter(z => z.drin).forEach(z => { feedProTag[z.tag] = (feedProTag[z.tag]||0)+1; });

const gruende = {};
zeilen.filter(z => !z.drin).forEach(z => z.gruende.forEach(g => { gruende[g] = (gruende[g]||0)+1; }));

const tabelle = zeilen.map(z => `
  <tr class="${z.drin ? 'ja' : 'nein'}">
    <td class="mono">${uhr(z.zeit)}</td>
    <td class="mono nz">${z.prio}</td>
    <td class="typ">${esc(z.typ)}</td>
    <td><b>${esc(z.titel)}</b><span class="tx">${esc(z.text)}</span></td>
    <td class="urteil">${z.drin
      ? '<span class="ok">im Feed</span>' + (z.breaking ? ' <span class="brk">breaking</span>' : '')
      : '<span class="weg">weg</span> <span class="grund">' + esc(z.gruende.join(' · ')) + '</span>'}</td>
  </tr>`).join('');

const typTabelle = Object.keys(proTyp).sort((a,b) => proTyp[b].roh - proTyp[a].roh)
  .map(t => `<tr><td class="typ">${esc(t)}</td><td class="mono nz">${proTyp[t].roh}</td>
    <td class="mono nz ${proTyp[t].feed ? '' : 'null'}">${proTyp[t].feed}</td></tr>`).join('');

const spieltage = Object.keys(D.spieltage).sort();
const tagBalken = spieltage.map(k => {
  const n = D.spieltage[k], f = feedProTag[k] || 0;
  return `<div class="tb"><i style="height:${Math.min(100, n*8)}px"></i>
    <em style="height:${Math.min(100, f*16)}px"></em>
    <span>${k.slice(8)}.${k.slice(5,7)}.</span><u>${n}/${f}</u></div>`;
}).join('');

const blaetter = D.blaetter.map(b => `
  <details class="blatt">
    <summary>${esc(b.titel)} <i>${esc(b.sorte)}</i></summary>
    <div class="nd nd-s-${esc(b.sorte)}">${b.body}</div>
  </details>`).join('');

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Story-Simulation — 100 Partien</title>
${fonts}
${styles}
<style>
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:'Sometype Mono',ui-monospace,monospace;padding:0 0 60px}
  .sim{max-width:1180px;margin:0 auto;padding:22px 16px}
  .sim h1{font-family:'Archivo Black',sans-serif;font-size:26px;line-height:1.1;margin:0 0 6px}
  .sim h2{font-family:'Archivo Black',sans-serif;font-size:15px;margin:34px 0 10px;
    letter-spacing:-.01em}
  .sim p{color:var(--ink2);font-size:12.5px;line-height:1.65;max-width:76ch;margin:0 0 10px}
  .sim .lead{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.14em;
    margin:0 0 18px}
  .karten{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:14px 0 6px}
  .kz{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 13px}
  .kz b{display:block;font-family:'Archivo Black',sans-serif;font-size:23px;line-height:1}
  .kz span{display:block;color:var(--muted);font-size:9.5px;text-transform:uppercase;
    letter-spacing:.11em;margin-top:6px}
  .kz.gold b{color:var(--gold)}
  .spalten{display:grid;grid-template-columns:minmax(320px,420px) 1fr;gap:26px;align-items:start}
  @media(max-width:900px){.spalten{grid-template-columns:1fr}}
  .tafel{background:var(--bg2);border:1px solid var(--line);border-radius:16px;
    padding:10px 10px 16px;position:sticky;top:12px}
  table.st{width:100%;border-collapse:collapse;font-size:11.5px}
  table.st th{text-align:left;color:var(--muted);font-weight:400;font-size:9.5px;
    text-transform:uppercase;letter-spacing:.11em;padding:0 8px 7px;border-bottom:1px solid var(--line)}
  table.st td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
  table.st tr.nein{opacity:.62}
  table.st td b{display:block;color:var(--ink);font-weight:700;font-size:12px}
  table.st td .tx{display:block;color:var(--muted);font-size:10.5px;margin-top:3px;line-height:1.45}
  .mono{font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}
  .nz{text-align:right}
  .null{color:var(--faint)}
  .typ{color:var(--purple);font-size:10.5px;white-space:nowrap}
  .urteil{white-space:normal;min-width:150px}
  .ok{color:var(--acid);font-size:10.5px}
  .brk{color:#ff5a4d;font-size:10px}
  .weg{color:var(--red);font-size:10.5px}
  .grund{display:block;color:var(--muted);font-size:10px;margin-top:3px;line-height:1.4}
  .balken{display:flex;gap:7px;align-items:flex-end;flex-wrap:wrap;margin:10px 0 4px}
  .tb{display:flex;flex-direction:column;align-items:center;gap:3px;width:52px}
  .tb i,.tb em{display:block;width:13px;border-radius:3px 3px 0 0}
  .tb i{background:var(--line2)}
  .tb em{background:var(--acid);margin-top:-2px}
  .tb span{color:var(--muted);font-size:9px}
  .tb u{color:var(--ink2);font-size:9.5px;text-decoration:none}
  .tbwrap{display:flex;gap:2px;align-items:flex-end}
  .legende{color:var(--muted);font-size:10.5px;margin-top:4px}
  .regeln{display:grid;gap:9px;margin-top:10px}
  .regel{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--gold);
    border-radius:11px;padding:11px 13px}
  .regel b{display:block;font-family:'Archivo Black',sans-serif;font-size:12.5px;margin-bottom:4px}
  .regel span{color:var(--ink2);font-size:11.5px;line-height:1.6}
  .regel em{color:var(--acid);font-style:normal}
  details.blatt{background:var(--surface);border:1px solid var(--line);border-radius:11px;
    margin-bottom:7px;overflow:hidden}
  details.blatt summary{cursor:pointer;padding:10px 13px;font-size:12px;font-weight:700;
    list-style:none;display:flex;justify-content:space-between;gap:10px;align-items:center}
  details.blatt summary i{color:var(--purple);font-style:normal;font-size:10px;
    text-transform:uppercase;letter-spacing:.1em}
  details.blatt .nd{position:static;transform:none;max-height:none;padding:0 13px 14px;
    background:transparent;border:0;box-shadow:none;width:auto}
  .fuss{color:var(--faint);font-size:10.5px;margin-top:34px;line-height:1.7;
    border-top:1px solid var(--line);padding-top:14px}
</style></head><body>
${insDefs}
<div class="sim">
  <div class="lead">Simulation · 100 erfundene Partien · Logik der App, neue Daten</div>
  <h1>Was die Liga aus hundert Partien erzählt</h1>
  <p>Zehn Spieler, hundert Partien an dreizehn Spieltagen vom 6. Juli bis zum 3. August 2026.
     Die Partien sind erfunden, gerechnet und erzählt wird mit dem Code der App:
     dieselbe Elo-Engine, derselbe Story-Generator, dieselbe Konsolidierung, dieselben
     Karten. Stand der Auswertung ist der 4. August 2026, 12:00.</p>

  <div class="karten">
    <div class="kz"><b>100</b><span>Partien</span></div>
    <div class="kz"><b>13</b><span>Spieltage</span></div>
    <div class="kz"><b>${D.roh}</b><span>Stories erzeugt</span></div>
    <div class="kz gold"><b>${D.feed}</b><span>im Feed</span></div>
    <div class="kz"><b>${Math.max.apply(null, Object.keys(feedProTag).map(k => feedProTag[k]))}</b><span>höchstens je Tag</span></div>
    <div class="kz"><b>${Object.keys(D.proSpieler).length}</b><span>Spieler mit Gesicht</span></div>
  </div>

  <h2>Die Tafel, wie sie im Feed steht</h2>
  <div class="spalten">
    <div class="tafel">${D.tafel}</div>
    <div>
      <h2 style="margin-top:0">Jede erzeugte Story, und was mit ihr passiert ist</h2>
      <p>Der Generator bildet ${D.roh} Stories. ${D.feed} stehen im Feed. Der Rest fällt weg,
         und jede Zeile sagt warum.</p>
      <table class="st">
        <thead><tr><th>Zeit</th><th>Prio</th><th>Sorte</th><th>Schlagzeile</th><th>Urteil</th></tr></thead>
        <tbody>${tabelle}</tbody>
      </table>
    </div>
  </div>

  <h2>Wie viel je Spieltag</h2>
  <div class="balken">${tagBalken}</div>
  <div class="legende">Grau: Partien an diesem Tag. Grün: Karten im Feed. Die Zahl darunter nennt beides.</div>

  <h2>Welche Sorten entstehen</h2>
  <table class="st" style="max-width:520px">
    <thead><tr><th>Sorte</th><th class="nz">erzeugt</th><th class="nz">im Feed</th></tr></thead>
    <tbody>${typTabelle}</tbody>
  </table>

  <h2>Warum etwas wegfällt</h2>
  <table class="st" style="max-width:520px">
    <thead><tr><th>Grund</th><th class="nz">Karten</th></tr></thead>
    <tbody>${Object.keys(gruende).sort((a,b) => gruende[b]-gruende[a])
      .map(g => `<tr><td>${esc(g)}</td><td class="mono nz">${gruende[g]}</td></tr>`).join('')}</tbody>
  </table>

  <h2>Und die Blätter dahinter</h2>
  <p>Jede Karte öffnet ein Blatt. Hier stehen sie alle, gebaut aus denselben Daten.</p>
  ${blaetter}

  <div class="fuss">
    Erzeugt aus <code>dist/index.html</code> — Elo, Chronik, Rekorde, Prestige, Generator,
    Konsolidierung und Kartenbau kommen unverändert aus der App. Erfunden sind allein die
    hundert Partien und die zehn Namen. Die Zuordnung „warum weggefallen" ist nachgerechnet:
    sie prüft dieselben Bedingungen, die die Konsolidierung anwendet, und nennt jede, die
    zutrifft — nicht nur die erste.
  </div>
</div>
</body></html>`;

fs.writeFileSync('/home/user/kicker-app/mockup/story-simulation.html', seite);
console.log('geschrieben:', seite.length, 'Zeichen');
