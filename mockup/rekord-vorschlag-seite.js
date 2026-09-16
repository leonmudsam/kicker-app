// Baut aus dem Lauf die Seite `rekord-vorschlag.html`. Gezeigt werden NUR
// die Rekorde, die jedes Tor bestehen — die Kombinationen, die ausfallen,
// werden gezaehlt und nicht aufgeschrieben: eine Liste aus „Die Gegentore je
// Partie nach einem Sieg" ist eine Tabelle, kein Katalog.
'use strict';
const fs = require('fs');
const D = JSON.parse(fs.readFileSync(__dirname + '/.rekord-vorschlag.json', 'utf8'));
const html = fs.readFileSync('/home/user/kicker-app/dist/index.html', 'utf8');
const kopf = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
const styles = (kopf.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
const fonts = (kopf.match(/<link[^>]+fonts[^>]*>/gi) || []).join('\n');
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const z2 = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const pz = v => (Math.round(v * 1000) / 10).toFixed(1).replace('.', ',');
const L = D.laufbahn;
// Eine kleine Zahl steht im Fliesstext als Wort.
const WORT = ['keine','eine','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn',
  'elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn',
  'zwanzig','einundzwanzig'];
const wort = n => WORT[n] || String(n);

// ── Die acht Tore ───────────────────────────────────────────────────
const TORE = [
  {k:'braucht', name:'mit 50 Partien erreichbar', regel:'≤ 50 Partien',
   pruef:e => e.braucht <= 50, wert:e => e.braucht + ' Partien',
   warum:'Das erste und wichtigste Tor. Ein Rekord, der sechzig Partien fordert, gehört dem Vielspieler — nicht, weil er besser spielt, sondern weil ihn außer ihm niemand halten KANN. Gerechnet wird mit dem Bestand eines Spielers, der fünfzig Partien hat: etwa zwanzig Siege, je fünfundzwanzig Sturm- und Abwehrspiele, dreizehn Spieltage, acht bis zwölf Duelle gegen jeden anderen.'},
  {k:'klein', name:'der Wenigspieler steht im Rennen', regel:'jemand mit unter 100 Partien',
   pruef:e => e.kleinsteSpielzahl <= 100, wert:e => 'ab ' + e.kleinsteSpielzahl + ' Partien',
   warum:'Die Gegenprobe zur Rechnung darüber, an den echten Daten. Erfüllt die Bedingung niemand mit unter hundert Partien, ist sie selbst die Hürde — dann hilft es nichts, dass die Zahl auf dem Papier klein aussieht.'},
  {k:'rein', name:'hängt nicht an der Spielzahl', regel:'Teilkorrelation ≤ 0,35',
   pruef:e => e.korrRein <= 0.35, wert:e => 'r = ' + z2(e.korrRein),
   warum:'Und zwar mit herausgerechnetem Können. Die rohe Korrelation täuscht in dieser Liga: die schwächsten Spieler spielen auch am wenigsten, gemessen r = ' + z2(D.korrSpielzahlQuote) + ' zwischen Partienzahl und Siegquote. Damit läuft JEDER Können-Rekord mit der Spielzahl mit, ohne von ihr zu hängen — ein Tor auf die rohe Zahl wirft genau die Rekorde weg, die der Katalog braucht.'},
  {k:'invers', name:'und auch nicht umgekehrt', regel:'Teilkorrelation ≥ −0,70',
   pruef:e => e.korrRein >= -0.70, wert:e => 'r = ' + z2(e.korrRein),
   warum:'Ein Rekord, der bei gleichem Können den mit den WENIGSTEN Partien bevorzugt, ist ein Spielzahl-Rekord mit umgekehrtem Vorzeichen. Er wäre so willkürlich wie der andere.'},
  {k:'kopie', name:'wiederholt nicht die Rangliste', regel:'nicht dasselbe Podest',
   pruef:e => !e.kopie, wert:e => e.kopie ? 'dieselben drei' : e.top3.join(', '),
   warum:'Gemessen am Podest, nicht an einer Korrelation. Ein Können-Rekord läuft mit der Siegquote, weil er Können MISST, und Rekorde sind auch dazu da, zu zeigen, wer am meisten kann. Die Frage ist deshalb nicht, ob die Zahlen zusammenhängen, sondern ob dieselben drei vorne stehen wie im Liga-Tab (' + D.top3Liga.join(', ') + '). Dann sagt der Rekord nichts Neues.'},
  {k:'aus', name:'die Bestmarke schlägt weit aus', regel:'≥ 1,5 σ',
   pruef:e => e.ausschlag >= 1.5, wert:e => z2(e.ausschlag) + ' σ',
   warum:'Der Beste muss mindestens 1,5 Standardabweichungen weiter draußen liegen als der Durchschnitt, sonst hält ihn fast jeder fast [§C39].'},
  {k:'rennen', name:'die halbe Liga steht im Rennen', regel:'≥ die Hälfte',
   pruef:e => e.imRennen * 2 >= e.ligaGewertet,
   wert:e => e.imRennen + ' von ' + e.ligaGewertet,
   warum:'Sonst ist die Bedingung selbst die Hürde [§C35].'},
  {k:'geteilt', name:'die Bestmarke ist nicht geschenkt', regel:'höchstens ein Drittel hält sie',
   pruef:e => e.gleich * 3 <= e.imRennen,
   wert:e => e.gleich === 1 ? 'einer allein' : e.gleich + ' von ' + e.imRennen,
   warum:'Eine Bestmarke, die jeder geschenkt bekommt, ist keine mehr [§C35]. Und wo sieben von zehn punktgleich vorne liegen, teilt sich der Grundwert durch sieben [§C34].'}
];

const N = D.kandidaten;
const wenig = N.filter(e => e.halterSpiele < 100);
const steck = N.map(e => `<div class="sb">
  <div class="sb-k"><b>${esc(e.name)}</b>
    <span class="sb-kam">${e.zufall ? 'Kammer Fügungen' : 'Kammer '
      + (e.art === 'konstanz' ? 'Bestmarken' : 'Können')}</span></div>
  <div class="sb-frage">${esc(e.frage)}</div>
  <table class="sb-t">
    <tr><td>Gemessen</td><td>${esc(e.mass)} ${esc(e.teil)}</td></tr>
    <tr><td>Bedingung</td><td>${esc(e.mindText)} — eine Laufbahn braucht dafür
      <b>${e.braucht} Partien</b></td></tr>
    <tr><td>Halter heute</td><td><b>${esc(e.halter)}</b> mit
      <b>${e.halterSpiele} Partien</b>, Rang ${e.halterRang} von ${e.ligaGewertet}
      in der Siegquote</td></tr>
    <tr><td>Beleg</td><td>${esc(e.beleg)}</td></tr>
    <tr><td>Podest</td><td>${esc(e.top3.join(', '))} — die Rangliste sagt
      ${esc(e.top3Liga.join(', '))}</td></tr>
    <tr><td>Ausschlag</td><td>${z2(e.ausschlag)} σ über dem Mittel der Gewerteten</td></tr>
    <tr><td>Spielzahl</td><td>r = ${z2(e.korrRein)} mit herausgerechnetem Können
      ${Math.abs(e.korrRein) < 0.15 ? '— praktisch unabhängig'
        : '— unter der Grenze von 0,35'} · roh r = ${z2(e.korrSpiele)}</td></tr>
    <tr><td>Siegquote</td><td>r = ${z2(e.korrQuote)} — ${e.korrQuote > 0.6
      ? 'misst erkennbar Können, ordnet das Feld aber um'
      : e.korrQuote < -0.2 ? 'läuft der Rangliste sogar entgegen'
      : 'mit der Rangliste hat der Wert wenig zu tun'}</td></tr>
  </table>
  <div class="sb-rang">${e.rangfolge.map((x, i) =>
    `<span><i>${i + 1}.</i> ${esc(x.name)} <u>${x.spiele} Partien</u><em>${esc(x.ev)}</em></span>`
    ).join('')}</div>
</div>`).join('');

const spielzahl = D.spielzahlen.map(p => `<tr class="${p.spiele < 100 ? 'ja' : ''}">
  <td><b>${esc(p.name)}</b></td><td class="mono nz">${p.spiele}</td>
  <td class="mono nz">${p.tage}</td><td class="mono nz">${p.quote} %</td>
  <td class="mono nz">${p.erwartet} %</td>
  <td class="mono nz ${p.quote - p.erwartet >= 0 ? 'gut' : 'schlecht'}">${
    (p.quote - p.erwartet >= 0 ? '+' : '−') + Math.abs(p.quote - p.erwartet)}</td>
  <td class="mono nz">${p.rang}</td></tr>`).join('');

const knappT = L.knapp.slice(0, 12).map(k => `<tr class="${k.abstand <= 0.02 ? 'ja' : ''}">
  <td><b>${esc(k.name)}</b><span class="frage">${esc(k.cond)}</span></td>
  <td class="mono nz">${k.abstand === 0 ? 'geteilt' : pz(k.abstand) + ' %'}</td>
  <td class="bed">${esc(k.halter.join(', '))}
    <span class="klein">${k.halterSpiele.join(' / ')} Partien</span></td>
  <td class="bed">${esc(k.zweiter)}
    <span class="klein">${k.zweiterSpiele} Partien</span></td>
  <td class="bed">${esc(k.belegB)}</td></tr>`).join('');

const huerdeT = L.huerde.filter(h => h.zu).map(h => `<tr>
  <td><b>${esc(h.name)}</b></td>
  <td class="mono nz">${h.n} ${esc(h.einheit)}</td>
  <td class="mono nz">${h.hat}</td>
  <td class="bed">${esc(h.cond)}</td></tr>`).join('');

const wertJe = L.wertRekord * (L.artGewicht.ereignis || 1);
const wertKoennen = L.wertRekord * (L.artGewicht.leistung || 1);
const wertVon = e => L.wertRekord * (L.artGewicht[e.art] != null ? L.artGewicht[e.art] : 1);
// ── Gestapelt, nicht addiert ────────────────────────────────────────
// §C34: Liga-Rekorde werden nach Wert sortiert und dann gestaffelt —
// Platz 1–2 voll, 3–5 durch √2, 6–8 durch √3, danach alle drei eine
// Wurzelstufe weiter. Sieben Rekorde mal achtundvierzig zu rechnen waere
// um die Haelfte zu hoch, und gerade bei einem Halter mit sieben neuen
// Eintraegen ist das der Unterschied zwischen einer Stufe und keiner.
// Es bleibt eine OBERGRENZE: die Rekorde, die jemand schon haelt, besetzen
// die vollen Plaetze zuerst.
function stapel(werte){
  const w = werte.slice().sort((a, b) => b - a);
  return Math.round(w.reduce((n, v, i) => n + v / Math.sqrt(Math.floor(i / 3) + 1), 0));
}

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Liga-Rekorde, die jeder holen kann</title>
${fonts}
${styles}
<style>
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:'Sometype Mono',ui-monospace,monospace;padding:0 0 70px}
  .rv{max-width:1180px;margin:0 auto;padding:24px 16px}
  .rv h1{font-family:'Archivo Black',sans-serif;font-size:29px;line-height:1.08;margin:0 0 8px}
  .rv h2{font-family:'Archivo Black',sans-serif;font-size:16px;margin:40px 0 8px}
  .rv p{color:var(--ink2);font-size:12.5px;line-height:1.7;max-width:82ch;margin:0 0 10px}
  .lead{color:var(--muted);font-size:10.5px;text-transform:uppercase;letter-spacing:.15em;margin:0 0 16px}
  code{font-size:10.5px;color:var(--purple);background:transparent}
  .karten{display:grid;grid-template-columns:repeat(auto-fit,minmax(146px,1fr));gap:9px;margin:16px 0 4px}
  .kz{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 13px}
  .kz b{display:block;font-family:'Archivo Black',sans-serif;font-size:22px;line-height:1}
  .kz span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;
    letter-spacing:.11em;margin-top:6px;line-height:1.4}
  .kz.gold b{color:var(--gold)}
  table.st{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:6px}
  table.st th{text-align:left;color:var(--muted);font-weight:400;font-size:9px;
    text-transform:uppercase;letter-spacing:.11em;padding:0 7px 7px;border-bottom:1px solid var(--line);
    vertical-align:bottom}
  table.st td{padding:8px 7px;border-bottom:1px solid var(--line);vertical-align:top}
  table.st td b{display:block;color:var(--ink);font-weight:700;font-size:12px}
  table.st tr.ja td{background:rgba(163,230,53,.045)}
  .frage{display:block;color:var(--muted);font-size:10.5px;margin-top:4px;line-height:1.45;max-width:42ch}
  .klein{display:block;color:var(--faint);font-size:9.5px;margin-top:2px}
  .mono{font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}
  .nz{text-align:right}
  .gut{color:var(--acid)}
  .schlecht{color:var(--red)}
  .bed{color:var(--muted);font-size:11px;line-height:1.55}
  .regeln{display:grid;gap:9px;margin-top:10px}
  .regel{background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--gold);
    border-radius:11px;padding:11px 13px}
  .regel b{display:block;font-family:'Archivo Black',sans-serif;font-size:12.5px;margin-bottom:5px}
  .regel span{color:var(--ink2);font-size:11.5px;line-height:1.65}
  .regel em{color:var(--acid);font-style:normal}
  .sb{background:var(--bg2);border:1px solid var(--line);border-left:3px solid var(--acid);
    border-radius:13px;padding:12px 14px;margin-bottom:9px}
  .sb-k{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
  .sb-k b{font-family:'Archivo Black',sans-serif;font-size:14px}
  .sb-kam{color:var(--purple);font-size:9.5px;text-transform:uppercase;letter-spacing:.1em}
  .sb-frage{color:var(--ink2);font-size:12px;margin:5px 0 9px;line-height:1.55}
  table.sb-t{width:100%;border-collapse:collapse;font-size:11px}
  table.sb-t td{padding:4px 0;vertical-align:top;color:var(--ink2);line-height:1.55}
  table.sb-t td:first-child{width:118px;color:var(--muted);font-size:9.5px;
    text-transform:uppercase;letter-spacing:.09em;padding-top:6px}
  .sb-rang{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;
    border-top:1px solid var(--line);padding-top:9px}
  .sb-rang span{background:var(--surface);border:1px solid var(--line);border-radius:9px;
    padding:6px 9px;font-size:10.5px;color:var(--ink2);max-width:250px}
  .sb-rang i{color:var(--faint);font-style:normal;margin-right:3px}
  .sb-rang u{color:var(--muted);font-size:9.5px;text-decoration:none;margin-left:4px}
  .sb-rang em{display:block;color:var(--faint);font-size:9.5px;font-style:normal;margin-top:3px;line-height:1.4}
  .fuss{color:var(--faint);font-size:10.5px;margin-top:40px;line-height:1.75;
    border-top:1px solid var(--line);padding-top:14px}
  @media(max-width:900px){.frage{display:none}}
</style></head><body>
<div class="rv">
  <div class="lead">Vorschlag · gemessen an ${D.partien} echten Partien · Stand ${esc(D.gebaut)}</div>
  <h1>Liga-Rekorde, die jeder holen kann</h1>
  <p>Ein Rekord darf zeigen, wer am meisten kann. Er darf nicht zeigen, wer am meisten
     gespielt hat. Der Unterschied steckt nicht in der Frage, sondern in der
     <b>Bedingung</b>: „ab 60 Spielen" gehört dem Vielspieler, weil ihn außer ihm niemand
     halten kann. Gesucht sind deshalb Rekorde, die jemand mit <b>fünfzig Partien</b> in
     der Laufbahn erreichen kann.</p>
  <p>Gerechnet wurde nicht geraten: <b>${D.kombinationen}</b> Kombinationen aus
     ${WORT[9]} Kennzahlen und ${wort(17)} Teilmengen, jede an den echten Partien gemessen
     und durch dieselben acht Tore geschickt. <b>${D.bestanden}</b> bestehen sie,
     <b>${wort(N.length)}</b> davon haben einen Namen bekommen — ausgewählt danach, dass
     sie keinen bestehenden Eintrag doppeln und sich voneinander in Kennzahl UND Teilmenge
     unterscheiden. Die übrigen sind gezählt und nicht aufgeschrieben: eine Liste aus
     „Die Gegentore je Partie nach einem Sieg" ist eine Tabelle, kein Katalog.</p>

  <div class="karten">
    <div class="kz"><b>${D.kombinationen}</b><span>Kombinationen gerechnet</span></div>
    <div class="kz"><b>${D.bestanden}</b><span>bestehen alle acht Tore</span></div>
    <div class="kz gold"><b>${N.length}</b><span>benannt und vorgeschlagen</span></div>
    <div class="kz gold"><b>${wenig.length}</b><span>davon gehören einem Spieler mit unter 100 Partien</span></div>
    <div class="kz"><b>${L.huerde.filter(h => h.zu).length}</b><span>bestehende Rekorde sperren einen 50-Spieler aus</span></div>
    <div class="kz"><b>${L.knapp.filter(k => k.abstand > 0 && k.abstand <= 0.02).length}</b><span>bestehende Rekorde stehen unter 2 % vor dem Fall</span></div>
  </div>

  <h2>Die acht Tore</h2>
  <p>Vier stehen so in der Arbeitsanweisung [§C35, §C39]. Die anderen vier sind hier
     entstanden, und zwei davon sind selbst das Ergebnis der Messung.</p>
  <div class="regeln">
    ${TORE.map(t => `<div class="regel"><b>${esc(t.name)}</b>
      <span><em>${esc(t.regel)}</em> — ${esc(t.warum)}</span></div>`).join('')}
  </div>

  <h2>Die ${wort(N.length)} Rekorde</h2>
  <p>Nach Ausschlag geordnet. Jeder Steckbrief nennt, was gemessen wird, wie viele Partien
     die Bedingung braucht, wer ihn heute hält und mit wie vielen Partien — und die besten
     fünf mit ihrer eigenen Zahl.</p>
  ${steck}

  <h2>Wer wenig spielt und trotzdem gut ist</h2>
  <p>Die Liga hat zwei solche Profile. <b>Jane</b> steht mit ${
     (D.spielzahlen.find(p => p.name === 'Jane') || {}).spiele} Partien auf Rang
     ${(D.spielzahlen.find(p => p.name === 'Jane') || {}).rang} der Siegquote und liegt
     ${Math.abs((D.spielzahlen.find(p => p.name === 'Jane') || {}).quote
       - (D.spielzahlen.find(p => p.name === 'Jane') || {}).erwartet)} Punkte über der
     eigenen Erwartung — das ist der drittbeste Wert der Liga. <b>Jannik</b> steht mit
     ${(D.spielzahlen.find(p => p.name === 'Jannik') || {}).spiele} Partien über Maxi
     (${(D.spielzahlen.find(p => p.name === 'Maxi') || {}).spiele}) und Leo
     (${(D.spielzahlen.find(p => p.name === 'Leo') || {}).spiele}).</p>
  <p>Gemessen gehen <b>${wenig.length} der ${wort(N.length)}</b> neuen Rekorde an einen
     Spieler mit unter hundert Partien: ${esc([...new Set(wenig.map(e => e.halter))].join(', ')
     )}. Das ist kein Zufall und kein Ausgleich, sondern die Folge des ersten Tors: wo die
     Bedingung bei fünfundzwanzig Partien liegt, entscheidet die Leistung und nicht der
     Umfang. Die Liga zum Vergleich — hervorgehoben, wer unter hundert Partien hat:</p>
  <table class="st" style="max-width:660px">
    <thead><tr><th>Spieler</th><th class="nz">Partien</th><th class="nz">Spieltage</th>
      <th class="nz">Siegquote</th><th class="nz">erwartet</th><th class="nz">Abstand</th>
      <th class="nz">Rang</th></tr></thead>
    <tbody>${spielzahl}</tbody>
  </table>

  <h2>Bestehende Rekorde, die ein 50-Spieler nie halten kann</h2>
  <p>Aus dem Katalog gelesen, nicht geraten: jede Mindestzahl steht im Klartext in der
     Bedingung. Umgerechnet auf den Bestand eines Spielers mit fünfzig Partien und vierzig
     Prozent Siegquote — etwa zwanzig Siege, je fünfundzwanzig Sturm- und Abwehrspiele,
     fünfunddreißig Gelegenheiten nach einer Niederlage.
     <b>${L.huerde.filter(h => h.zu).length} von ${L.huerde.length}</b> Rekorden mit
     lesbarer Mindestzahl sind für ihn unerreichbar. Bei sechs von ihnen ist es nicht die
     Frage, die ihn aussperrt, sondern nur die Zahl dahinter: „Der Fels" fragt nach den
     Gegentoren in der Abwehr, und dieselbe Frage bei zwölf Abwehrspielen bestünde jedes
     Tor dieser Seite.</p>
  <table class="st">
    <thead><tr><th>Rekord</th><th class="nz">verlangt</th><th class="nz">ein 50-Spieler hat</th>
      <th>Bedingung</th></tr></thead>
    <tbody>${huerdeT}</tbody>
  </table>

  <h2>Bestehende Rekorde, die knapp nicht gefallen sind</h2>
  <p>Der relative Abstand zwischen Halter und Zweitem, weil die Einheiten von Prozenten bis
     Elo-Punkten reichen. Fünf Rekorde sind heute <b>geteilt</b> — dort ist der Abstand null
     und der nächste Halter steht schon oben mit drauf. Darunter stehen die, bei denen ein
     einzelner Nachmittag reicht: <b>${esc((L.knapp.find(k => k.abstand > 0) || {}).name)}</b>
     trennt ${pz((L.knapp.find(k => k.abstand > 0) || {}).abstand)} Prozent. Besonders
     bemerkenswert ist „Der Zerstörer": dort steht <b>Jannik mit
     ${(L.knapp.find(k => k.name === 'Der Zerstörer') || {}).zweiterSpiele} Partien</b>
     0,8 Prozent hinter Martin mit 211 — und die Bedingung „ab 22 Siegen" ist genau die,
     die ihn bei fünfzig Partien ausgesperrt hätte.</p>
  <table class="st">
    <thead><tr><th>Rekord</th><th class="nz">Abstand</th><th>Halter</th><th>Zweiter</th>
      <th>Beleg des Zweiten</th></tr></thead>
    <tbody>${knappT}</tbody>
  </table>

  <h2>Was es für die Laufbahn bedeutet</h2>
  <p>Ein Liga-Rekord ist eine der drei Quellen des Prestiges [§C34]. Der Grundwert ist
     <code>PRESTIGE_REKORD</code> × <code>PRESTIGE_ART[art]</code>, geteilt durch die Zahl
     der heutigen Halter: <b>${wertKoennen}</b> Punkte für einen Beleg für Können,
     <b>${wertJe}</b> für eine Fügung. Von den ${wort(N.length)} Vorschlägen sind
     ${wort(N.filter(e => e.zufall).length)} Fügungen und
     ${wort(N.filter(e => !e.zufall).length)} Belege für Können — und das ist die Absicht:
     Rekorde sind auch dazu da, zu zeigen, wer am meisten kann. Nur soll das nicht heißen,
     wer am meisten gespielt hat.</p>
  <p>Gerechnet ist die Spalte <b>gestapelt</b> und nicht addiert: Platz 1–2 zählen voll,
     3–5 durch √2, 6–8 durch √3 [§C34]. Sie bleibt eine <b>Obergrenze</b>, weil die
     Rekorde, die jemand schon hält, die vollen Plätze zuerst besetzen.</p>
  <p><b>Und eine Zahl, die zur Entscheidung gehört:</b> Jane hält heute
     ${wort(N.filter(e => e.halter === 'Jane').length)} der ${wort(N.length)} Vorschläge.
     Das ist keine Auswahl, sondern der Befund: bei einer Bedingung von fünfundzwanzig
     Partien entscheidet die Leistung, und Jane liegt
     ${Math.abs((D.spielzahlen.find(p => p.name === 'Jane') || {}).quote
       - (D.spielzahlen.find(p => p.name === 'Jane') || {}).erwartet)} Punkte über der
     eigenen Erwartung. Wer das zu viel für einen Kopf findet, baut nicht alle
     ${wort(N.length)} ein — die Steckbriefe stehen nach Ausschlag geordnet, und die
     ersten drei ihrer Sorte tragen die Aussage schon.</p>
  <table class="st">
    <thead><tr><th>Spieler</th><th class="nz">Prestige</th><th>Stufe</th>
      <th class="nz">davon Rekorde</th><th class="nz">neu</th>
      <th>bis zur nächsten Stufe</th></tr></thead>
    <tbody>${L.je.map(p => {
      const mein = N.filter(e => e.halter === p.name);
      const n = mein.length;
      const plus = stapel(mein.map(wertVon));
      const neuFehlt = p.fehlt == null ? null : p.fehlt - plus;
      return `<tr class="${n ? 'ja' : ''}">
        <td><b>${esc(p.name)}</b></td>
        <td class="mono nz">${p.punkte}</td>
        <td class="mono">${esc(p.stufeName)}</td>
        <td class="mono nz">${p.rekord}</td>
        <td class="mono nz ${n ? 'gut' : ''}">${n ? '+' + plus : '—'}</td>
        <td class="bed">${p.fehlt == null ? 'oben angekommen'
          : neuFehlt <= 0 ? '<b class="gut">erreicht den ' + esc(p.ziel) + '</b>'
          : p.fehlt + ' bis zum ' + esc(p.ziel) + (n ? ', danach ' + neuFehlt : '')}</td>
      </tr>`; }).join('')}</tbody>
  </table>

  <h2>Was beim Einbauen dazugehört</h2>
  <p>Jeder Eintrag braucht dieselben Felder wie jeder andere [§10.2]:
     <code>allzeit.cond</code>, <code>allzeit.wie</code>, <code>allzeit.val</code>,
     <code>allzeit.min</code>, <code>allzeit.ev</code> (beginnt mit dem Wert, nach dem
     sortiert wird) und einen Eintrag in <code>_chronicleCtx</code>. Dazu drei
     Zusicherungen in <code>tests/disziplinen</code>, die diese Seite prüfbar machen: die
     Teilkorrelation zur Spielzahl unter 0,35, der Ausschlag über 1,5 σ und — die
     wichtigste, die es heute noch nicht gibt — <b>die Bedingung ist mit fünfzig Partien
     erfüllbar</b>. Ohne die dritte wandert der Katalog mit jedem neuen Eintrag ein Stück
     weiter zum Vielspieler, und niemand sieht es.</p>
  <p>Der Umbau davor bleibt derselbe: <code>_chronicleCtx</code> bekommt die
     <b>Rohsicht</b>, die <code>_seasonTitleCtx</code> für den Monat schon hat — jede
     Partie aus der Sicht eines Spielers, gruppiert nach Spieltag, Woche, Partner und
     Gegner. Danach ist jeder dieser ${wort(N.length)} Rekorde ein
     <code>allzeit:</code>-Block an einer Disziplin und keine neue Rechnung.</p>

  <div class="fuss">
    Erzeugt mit <code>node mockup/rekord-vorschlag-lauf.js &amp;&amp; node mockup/rekord-vorschlag-seite.js</code>.
    Die Rohsicht wird im Lauf nachgebaut; Prestige, Stufen, Schwellen, die Rekordlage und
    jede Mindestzahl kommen aus <code>dist/index.html</code>, damit die Zahlen zur App
    gehören und nicht zu einer zweiten Rechnung. Kein Teil des Bauablaufs:
    <code>tools/check.mjs</code> und <code>tests/run.mjs</code> sehen diesen Ordner nicht.
    Nichts davon ist eingebaut — diese Seite ist der Vorschlag, nicht die Änderung.
  </div>
</div>
</body></html>`;

fs.writeFileSync(__dirname + '/rekord-vorschlag.html', seite);
console.log('geschrieben: ' + seite.length + ' Zeichen · ' + N.length + ' Rekorde · '
  + wenig.length + ' davon bei unter 100 Partien');
