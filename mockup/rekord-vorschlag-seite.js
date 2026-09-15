// Baut aus dem Lauf die Seite `rekord-vorschlag.html`: achtzehn Kandidaten
// fuer neue Liga-Rekorde, jeder an den echten Partien gemessen und gegen die
// fuenf Tore gestellt, die der Katalog verlangt. Fuenf ueberleben.
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
const L = D.laufbahn;

// ── Die fuenf Tore ──────────────────────────────────────────────────
// Vier stehen so in der Arbeitsanweisung [§C35, §C39]; das fuenfte kommt aus
// derselben Absicht und stand dort noch nicht: ein Rekord, dessen Wert fast
// perfekt mit der Siegquote laeuft, wiederholt die Rangliste und ist kein
// eigener Eintrag. Gemessen wird das als Korrelation zur Siegquote.
const TORE = [
  {k:'spiele', name:'hängt nicht an der Spielzahl', regel:'|r| ≤ 0,35',
   pruef:e => Math.abs(e.korrSpiele) <= 0.35, wert:e => 'r = ' + z2(e.korrSpiele)},
  {k:'quote', name:'wiederholt nicht die Rangliste', regel:'|r| ≤ 0,70',
   pruef:e => Math.abs(e.korrQuote) <= 0.70, wert:e => 'r = ' + z2(e.korrQuote)},
  {k:'rennen', name:'die halbe Liga steht im Rennen', regel:'≥ die Hälfte',
   pruef:e => e.imRennen * 2 >= e.ligaGewertet, wert:e => e.imRennen + ' von ' + e.ligaGewertet},
  {k:'aus', name:'die Bestmarke schlägt weit aus', regel:'≥ 1,5 σ',
   pruef:e => e.ausschlag >= 1.5, wert:e => z2(e.ausschlag) + ' σ'},
  {k:'mitte', name:'nicht nur für die Spitze', regel:'Halter nicht in den besten drei',
   pruef:e => e.halterRang > 3, wert:e => 'Rang ' + e.halterRang + ' von ' + e.ligaGewertet}
];
const bestanden = e => TORE.filter(t => t.pruef(e)).length;
const durch = e => bestanden(e) === TORE.length;

// Warum ein Kandidat gescheitert ist — in einem Satz, aus der Messung.
const GRUND = {
  gleichauf:'Der Vergleich mit der EIGENEN Quote dreht die Rangliste um: wer hoch steht, hat einen hohen Abzug. Der Rekord ginge damit systematisch an das untere Ende — genauso einseitig wie an die Spitze.',
  'gleichauf2':'Mit der Erwartung statt der eigenen Quote verglichen kippt es ins Gegenteil: dann misst die Frage wieder das Können, und der Ausschlag reicht nicht.',
  punktgenau2:'Je mehr Partien, desto näher liegt die Quote an der Erwartung — der Wert hängt damit doch an der Spielzahl. Die zweite Fassung rechnet in Standardfehlern und löst genau das.',
  beidseitig:'Der Beste liegt kaum weiter draußen als der Durchschnitt: ein Rekord, den fast jeder fast hält, ist keine Bestmarke.',
  rollenfest:'Der Abstand zwischen zwei Quoten schrumpft mit der Spielzahl, weil beide Quoten ruhiger werden. Beide Fassungen scheitern daran.',
  'rollenfest2':'Dieselbe Ursache wie in der ersten Fassung, nur stärker: r = −0,94 zur Spielzahl.',
  kontrast:'Vier Partner mit je fünfzehn gemeinsamen Partien ist selbst eine Spielzahl-Hürde: nur vier von elf stehen überhaupt im Rennen.',
  angstfrei:'Die schwächste Quote gegen einen regelmäßigen Gegner läuft fast perfekt mit der Siegquote. Der Rekord wäre die Rangliste unter anderem Namen.',
  breitenwirkung:'Dieselbe Ursache: wer gut ist, steht gegen jeden im Plus.',
  zweiteluft:'Der Abstand zwischen früh und spät schrumpft mit der Spielzahl, und der Ausschlag reicht auch in der zweiten Fassung nicht.',
  'zweiteluft2':'Mit der Erwartung verglichen verschwindet die Verzerrung nicht: derselbe Ausschlag von 1,15 σ, dieselbe Abhängigkeit von der Spielzahl.',
  kopfhoch:'Wie viele eigene Spieltage nicht negativ enden, ist die Siegquote in anderer Verpackung: r = 0,99.',
  schwaechstertag:'Der beste schlechteste Tag gehört fast immer dem besten Spieler: r = 0,88.'
};

const zeile = e => {
  const ok = durch(e);
  return `<tr class="${ok ? 'ja' : 'nein'}">
    <td><b>${esc(e.name)}</b><code>${esc(e.id)}</code>
      <span class="frage">${esc(e.frage)}</span></td>
    <td class="bed">${esc(e.mindText)}</td>
    ${TORE.map(t => `<td class="tor ${t.pruef(e) ? 'gut' : 'schlecht'}">${esc(t.wert(e))}</td>`).join('')}
    <td class="urteil">${ok
      ? '<span class="ok">aufnehmen</span>'
      : '<span class="weg">fällt aus</span>'}</td>
  </tr>`;
};

const nehmen = D.kandidaten.filter(durch);
const raus = D.kandidaten.filter(e => !durch(e));

// Was die fuenf fuer die Laufbahn bedeuten. Der Grundwert eines Rekords ist
// PRESTIGE_REKORD × PRESTIGE_ART[art], geteilt durch die Zahl der Halter.
const wertJe = D.laufbahn.wertRekord * (D.laufbahn.artGewicht.ereignis || 1);
const proSpieler = {};
nehmen.forEach(e => { proSpieler[e.halter] = (proSpieler[e.halter] || 0) + 1; });
const laufbahnTabelle = L.je.map(p => {
  const n = proSpieler[p.name] || 0;
  // Wiederholung derselben Sache zaehlt gedaempft [§C34]; verschiedene
  // Rekorde zaehlen jeder voll. Fuenf verschiedene Rekorde also voll.
  const plus = n * wertJe;
  const neuFehlt = p.fehlt == null ? null : p.fehlt - plus;
  return `<tr class="${n ? 'ja' : ''}">
    <td><b>${esc(p.name)}</b></td>
    <td class="mono nz">${p.punkte}</td>
    <td class="mono">${esc(p.stufeName)}</td>
    <td class="mono nz">${p.rekord}</td>
    <td class="mono nz ${n ? 'gold' : 'null'}">${n ? '+' + plus : '—'}</td>
    <td class="bed">${p.fehlt == null ? 'oben angekommen'
      : neuFehlt <= 0
        ? '<b class="ok">erreicht den ' + esc(p.ziel) + '</b>'
        : p.fehlt + ' bis zum ' + esc(p.ziel) + (n ? ', danach ' + neuFehlt : '')}</td>
  </tr>`;
}).join('');

const spielzahl = D.spielzahlen.map(p => `<tr><td><b>${esc(p.name)}</b></td>
  <td class="mono nz">${p.spiele}</td><td class="mono nz">${p.quote} %</td>
  <td class="mono nz">${p.rang}</td></tr>`).join('');

const steckbrief = nehmen.map(e => `<div class="sb">
  <div class="sb-k"><b>${esc(e.name)}</b>
    <span class="sb-kam">${e.zufall ? 'Kammer Fügungen' : 'Kammer ' + (e.art === 'konstanz' ? 'Bestmarken' : 'Können')}</span></div>
  <div class="sb-frage">${esc(e.frage)}</div>
  <table class="sb-t">
    <tr><td>Quelle</td><td>Monatschronik „${esc(e.quelle)}" — derselbe Name, dasselbe Zeichen,
      nur die andere Zeitachse [§13.1]</td></tr>
    <tr><td>Bedingung</td><td>${esc(e.mindText)}</td></tr>
    <tr><td>Halter heute</td><td><b>${esc(e.halter)}</b> — Rang ${e.halterRang} von
      ${e.ligaGewertet} in der Siegquote, ${e.halterSpiele} Partien</td></tr>
    <tr><td>Beleg</td><td>${esc(e.beleg)}</td></tr>
    <tr><td>Im Rennen</td><td>${e.imRennen} von ${e.ligaGewertet} Spielern</td></tr>
    <tr><td>Ausschlag</td><td>${z2(e.ausschlag)} σ über dem Mittel der Gewerteten</td></tr>
    <tr><td>Spielzahl</td><td>r = ${z2(e.korrSpiele)} — ${Math.abs(e.korrSpiele) < 0.15
      ? 'praktisch unabhängig' : 'schwach, unter der Grenze von 0,35'}</td></tr>
    <tr><td>Siegquote</td><td>r = ${z2(e.korrQuote)} — ${Math.abs(e.korrQuote) < 0.35
      ? 'keine Wiederholung der Rangliste' : 'erkennbar, aber weit von einer Kopie entfernt'}</td></tr>
  </table>
  <div class="sb-rang">${e.rangfolge.map((x, i) =>
    `<span><i>${i + 1}.</i> ${esc(x.name)} <u>Rang ${x.rang}</u><em>${esc(x.ev)}</em></span>`).join('')}</div>
</div>`).join('');

const seite = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Neue Liga-Rekorde für die Mitte des Feldes</title>
${fonts}
${styles}
<style>
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:'Sometype Mono',ui-monospace,monospace;padding:0 0 70px}
  .rv{max-width:1180px;margin:0 auto;padding:24px 16px}
  .rv h1{font-family:'Archivo Black',sans-serif;font-size:29px;line-height:1.08;margin:0 0 8px}
  .rv h2{font-family:'Archivo Black',sans-serif;font-size:16px;margin:40px 0 8px}
  .rv h3{font-family:'Archivo Black',sans-serif;font-size:12.5px;margin:22px 0 7px;color:var(--ink2)}
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
  table.st td > code{display:block;margin-top:1px}
  table.st tr.nein{opacity:.6}
  table.st tr.ja td{background:rgba(163,230,53,.045)}
  .frage{display:block;color:var(--muted);font-size:10.5px;margin-top:4px;line-height:1.45;max-width:38ch}
  .mono{font-variant-numeric:tabular-nums;color:var(--ink2);white-space:nowrap}
  .nz{text-align:right}
  .null{color:var(--faint)}
  .gold{color:var(--gold)}
  .bed{color:var(--muted);font-size:11px;line-height:1.55}
  .tor{font-variant-numeric:tabular-nums;font-size:10.5px;text-align:right;white-space:nowrap}
  .tor.gut{color:var(--acid)}
  .tor.schlecht{color:var(--red)}
  .urteil{white-space:nowrap}
  .ok{color:var(--acid);font-size:10.5px}
  .weg{color:var(--red);font-size:10.5px}
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
  <h1>Rekorde, die nicht der Spitze gehören</h1>
  <p>Gesucht sind Liga-Rekorde, die <b>nicht den Vielspieler</b> und <b>nicht den Besten</b>
     belohnen: erreichbar für die Mitte des Feldes, besonders, auf einer <b>Abweichung</b>
     gebaut und aus den Fragen der Monatschroniken abgeleitet, ohne einen bestehenden
     Eintrag zu doppeln. Achtzehn Kandidaten wurden an den echten Partien gerechnet.
     <b>Fünf</b> überstehen alle fünf Tore.</p>
  <p>Das Ergebnis ist selbst die wichtigste Aussage: die meisten
     Abweichungsfragen hängen entweder doch an der Spielzahl oder sie wiederholen die
     Rangliste. Welche das sind und warum, steht unten mit Zahl und Grund.</p>

  <div class="karten">
    <div class="kz"><b>${D.kandidaten.length}</b><span>Kandidaten gerechnet</span></div>
    <div class="kz gold"><b>${nehmen.length}</b><span>bestehen alle fünf Tore</span></div>
    <div class="kz"><b>${raus.length}</b><span>fallen aus, mit Grund</span></div>
    <div class="kz"><b>${L.rekorde}</b><span>Rekorde heute im Katalog</span></div>
    <div class="kz"><b>${nehmen.filter(e => e.halterRang > 3).length}</b><span>neue Halter außerhalb der besten drei</span></div>
    <div class="kz"><b>${wertJe}</b><span>Prestige je neuem Rekord</span></div>
  </div>

  <h2>Der eigentliche Vorschlag: eine Rohsicht für beide Zeitachsen</h2>
  <p>Die Monatschroniken fragen längst nach Abweichungen — nach dem schwächsten Spieltag,
     dem unangenehmsten Gegner, der Spanne zwischen bestem und schwächstem Monat. Sie
     können das, weil <code>_seasonTitleCtx</code> je Spieler eine <b>Rohsicht</b> anlegt:
     jede Partie aus seiner Sicht, gruppiert nach Spieltag, Woche, Partner und Gegner.
     <code>_chronicleCtx</code>, die dieselben Fragen über die ganze Laufbahn stellen
     müsste, hat diese Rohsicht nicht — sie führt vierzig Zähler, und jede neue Frage
     bräuchte einen neuen.</p>
  <p>Deshalb steht am Anfang keine Liste von Rekorden, sondern <b>ein Umbau</b>:
     <code>_chronicleCtx</code> legt dieselbe Rohsicht an und ruft dasselbe
     <code>_rohGruppen</code>. Danach ist ein neuer Liga-Rekord kein neuer Zähler mehr,
     sondern <b>ein <code>allzeit:</code>-Block an einer Disziplin, die es schon gibt</b> —
     derselbe Name, dasselbe Zeichen, derselbe Ton, nur die andere Zeitachse und eine
     eigene Schwelle. Genau so tragen <code>spotless</code>, <code>evenkeel</code> und
     <code>drought</code> heute beide Achsen [§13.1]. Das ist die Antwort auf
     „skalierbar": jede der fünfzig Monatschroniken, deren Frage die Tore besteht, wird
     mit drei Zeilen zum Rekord, und die beiden Achsen können nicht auseinanderdriften,
     weil sie dieselbe Frage lesen.</p>

  <h2>Die fünf Tore</h2>
  <div class="regeln">
    ${TORE.map(t => `<div class="regel"><b>${esc(t.name)}</b>
      <span><em>${esc(t.regel)}</em> — ${esc({
        spiele:'Der Wert darf nicht mit der Zahl der Partien laufen, sonst hält den Rekord, wer am meisten spielt [§C39].',
        quote:'Ein Wert, der fast perfekt mit der Siegquote läuft, ist die Rangliste unter anderem Namen. Vier der achtzehn Kandidaten scheitern allein daran.',
        rennen:'Mindestens die halbe Liga muss die Mindestzahl erfüllen, sonst ist die Bedingung selbst die Hürde [§C35].',
        aus:'Der Beste muss mindestens 1,5 Standardabweichungen weiter draußen liegen als der Durchschnitt, sonst hält ihn fast jeder fast [§C39].',
        mitte:'Der heutige Halter darf nicht aus den besten drei kommen — das ist die Frage, um die es hier überhaupt geht.'
      }[t.k])}</span></div>`).join('')}
  </div>

  <h2>Alle achtzehn Kandidaten, gemessen</h2>
  <table class="st">
    <thead><tr><th>Kandidat</th><th>Bedingung</th>
      ${TORE.map(t => `<th class="nz">${esc(t.name.split(' ').slice(0, 3).join(' '))}</th>`).join('')}
      <th>Urteil</th></tr></thead>
    <tbody>${D.kandidaten.map(zeile).join('')}</tbody>
  </table>

  <h2>Die fünf, die bleiben</h2>
  ${steckbrief}

  <h2>Warum die anderen dreizehn ausfallen</h2>
  <table class="st">
    <thead><tr><th>Kandidat</th><th>Grund</th></tr></thead>
    <tbody>${raus.map(e => `<tr><td><b>${esc(e.name)}</b></td>
      <td class="bed">${esc(GRUND[e.id] || 'Ein Tor gerissen, siehe Tabelle oben.')}</td></tr>`).join('')}</tbody>
  </table>
  <p>Zwei Ergebnisse sind dabei mehr als eine Absage. <b>Erstens:</b> eine Abweichung
     darf nicht gegen die <b>eigene</b> Quote gerechnet werden. „Auf Augenhöhe" tut das
     und dreht damit die Rangliste um — r = ${z2((D.kandidaten.find(e => e.id === 'gleichauf') || {}).korrQuote || 0)}
     zur Siegquote heißt: der Rekord ginge systematisch an das untere Ende, genauso
     einseitig wie an die Spitze. <b>Zweitens:</b> die Abhängigkeit von der Spielzahl
     lässt sich wegrechnen, wenn man den Abstand in <b>Standardfehlern</b> misst statt in
     Prozentpunkten. „Der Erwartungstreue" fällt in der ersten Fassung mit
     r = ${z2((D.kandidaten.find(e => e.id === 'punktgenau2') || {}).korrSpiele || 0)} durch
     und besteht in der zweiten mit r = ${z2((D.kandidaten.find(e => e.id === 'punktgenau2b') || {}).korrSpiele || 0)}
     — bei gleichzeitig größerem Ausschlag. Dieselbe Rechnung passt auf jede künftige
     Frage nach „wie nah an null".</p>

  <h2>Was es für die Laufbahn bedeutet</h2>
  <p>Ein Liga-Rekord ist eine der drei Quellen des Prestiges [§C34]. Der Grundwert ist
     <code>PRESTIGE_REKORD</code> × <code>PRESTIGE_ART[art]</code>, geteilt durch die Zahl
     der heutigen Halter und nach dem Gesetz der fallenden Erträge. Alle fünf neuen
     Einträge sind <b>Fügungen</b> (<code>zufall:'quote'</code>, <code>art:'ereignis'</code>):
     sie messen keine Fähigkeit, also wiegen sie halb so viel wie ein Beleg für
     Können — ${wertJe} statt ${wertJe * 2} Punkte. Das ist kein Kompromiss, sondern
     genau die Absicht von §C35: <em>sie sollen jemandem gehören können, nicht jemanden
     auszeichnen.</em></p>
  <table class="st">
    <thead><tr><th>Spieler</th><th class="nz">Prestige</th><th>Stufe</th>
      <th class="nz">davon Rekorde</th><th class="nz">neu</th><th>bis zur nächsten Stufe</th></tr></thead>
    <tbody>${laufbahnTabelle}</tbody>
  </table>
  <p>Gemessen geht <b>keiner</b> der fünf Rekorde an die besten drei der Liga. Die Halter
     stehen auf Rang ${nehmen.map(e => e.halterRang).sort((a, b) => a - b).join(', ')} von
     ${nehmen[0] ? nehmen[0].ligaGewertet : 11} der Siegquote. Der Katalog verschiebt damit
     ${nehmen.length * wertJe} Punkte Prestige ausschließlich in die untere Hälfte — und
     einer davon entscheidet eine Stufe: die Zahlen oben sagen, wer danach den nächsten
     Reif trägt.</p>
  <p>Für das Gleichgewicht der drei Quellen heißt das: die Rekorde stehen heute bei
     ${L.rekord} Punkten gegen ${L.monat} aus den Monatswertungen. Fünf Fügungen legen
     rund ${nehmen.length * wertJe} dazu, also gut ${Math.round(100 * nehmen.length * wertJe / L.rekord)} %
     — die Reihenfolge der Quellen bleibt, und keine Stufe der Insignium-Leiter wird
     dadurch billig. <code>tests/disziplinen</code> rechnet das nach und fällt, wenn es
     kippt [§10.3]: die Zusicherungen sind der Prüfstein, nicht diese Seite.</p>

  <h2>Wie sie im Story-System auftauchen</h2>
  <div class="regeln">
    <div class="regel"><b>Ohne eine Zeile Code</b><span>Der Generator läuft über
      <code>CHRONICLES</code>, nicht über eine eigene Liste. Ein neuer Eintrag meldet sich
      damit automatisch als <code>rekord_erstmals</code> (Breaking, weil es den Rekord noch
      nie gab), <code>rekord_geholt</code> oder <code>rekord_gesteigert</code>.</span></div>
    <div class="regel"><b>Im Moment der Ewigen Tafel</b><span>Die Tafel-Achse bündelt alle
      Änderungen derselben Minute oder Partie zu einer Karte. Fünf neue Rekorde erzeugen
      deshalb keine fünf neuen Karten, sondern fünf Zeilen in der Karte, die es ohnehin
      gibt. Gemessen trägt eine Tafel-Sammelkarte heute im Schnitt acht Zeilen.</span></div>
    <div class="regel"><b>Nur, wer gespielt hat</b><span>Eine Fügung wechselt den Halter
      auch, weil ein anderer gespielt und seinen Anteil verschlechtert hat. Die Karte
      kommt nur, wenn mindestens einer der Genannten an diesem Tag angetreten ist — genau
      dafür gibt es die Regel schon.</span></div>
    <div class="regel"><b>Und nicht als Schattenseite</b><span>Keiner der fünf ist negativ.
      „Der Wechselhafte" klingt danach, ist aber eine Fügung: wem die schwankenden Tage
      zufallen, entscheidet niemand selbst. Rot bleibt der Richtung [§C25].</span></div>
  </div>

  <h2>Was beim Einbauen dazugehört</h2>
  <p>Jeder Eintrag braucht dieselben Felder wie jeder andere [§10.2]: <code>allzeit.cond</code>
     (die Bedingung im Klartext), <code>allzeit.wie</code> (was die Zahl bedeutet),
     <code>allzeit.val</code> und <code>allzeit.raw</code>, <code>allzeit.min</code>,
     <code>allzeit.ev</code> (beginnt mit dem Wert, nach dem sortiert wird),
     <code>zufall:'quote'</code> für die Kammer und ein Eintrag in
     <code>_chronicleCtx</code>. Dazu drei Zusicherungen in <code>tests/disziplinen</code>,
     die diese Seite prüfbar machen: die Korrelation zur Spielzahl unter 0,35, die zur
     Siegquote unter 0,70, und der Ausschlag über 1,5 σ. Ohne die drei ist dieser Vorschlag
     eine Bitte.</p>

  <h2>Die Liga, an der gemessen wurde</h2>
  <table class="st" style="max-width:520px">
    <thead><tr><th>Spieler</th><th class="nz">Partien</th><th class="nz">Siegquote</th>
      <th class="nz">Rang</th></tr></thead>
    <tbody>${spielzahl}</tbody>
  </table>

  <div class="fuss">
    Erzeugt mit <code>node mockup/rekord-vorschlag-lauf.js &amp;&amp; node mockup/rekord-vorschlag-seite.js</code>.
    Die Rohsicht wird im Lauf nachgebaut — genau die, die <code>_seasonTitleCtx</code> für
    den Monat schon hat; Prestige, Stufen und Schwellen kommen aus
    <code>dist/index.html</code>. Kein Teil des Bauablaufs: <code>tools/check.mjs</code> und
    <code>tests/run.mjs</code> sehen diesen Ordner nicht. Nichts davon ist eingebaut —
    diese Seite ist der Vorschlag, nicht die Änderung.
  </div>
</div>
</body></html>`;

fs.writeFileSync(__dirname + '/rekord-vorschlag.html', seite);
console.log('geschrieben:', seite.length, 'Zeichen · aufnehmen:',
  nehmen.map(e => e.name).join(', '));
