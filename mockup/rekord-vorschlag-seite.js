// Baut aus dem Lauf die Seite `rekord-vorschlag.html`: sechsunddreissig
// Kandidaten fuer neue Liga-Rekorde, jeder an den echten Partien gemessen und
// gegen die Tore gestellt, die der Katalog verlangt.
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
// Eine kleine Zahl steht im Fliesstext als Wort: „Die sechs, die bleiben",
// nicht „Die 6, die bleiben". In einer Tabellenzelle bleibt die Ziffer.
const WORT = ['keine','eine','zwei','drei','vier','fünf','sechs','sieben','acht','neun',
  'zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn',
  'neunzehn','zwanzig','einundzwanzig','zweiundzwanzig','dreiundzwanzig','vierundzwanzig',
  'fünfundzwanzig','sechsundzwanzig','siebenundzwanzig','achtundzwanzig','neunundzwanzig',
  'dreißig','einunddreißig','zweiunddreißig','dreiunddreißig','vierunddreißig',
  'fünfunddreißig','sechsunddreißig'];
const wort = n => WORT[n] || String(n);
// Woher eine Frage kommt, sagt der Katalog der App, nicht diese Seite: „Der
// Wiedergaenger" stand hier als „Monatschronik", es gibt ihn aber nur als
// Liga-Rekord. Gelesen wird `DISZIPLINEN` aus `dist/index.html`.
const herkunftText = q => ({
  chronik:'Monatschronik', rekord:'Liga-Rekord',
  'chronik+rekord':'Monatschronik und Liga-Rekord'
}[(L.herkunft || {})[q]] || 'Verwandt mit');

// ── Die Tore ────────────────────────────────────────────────────────
// Vier stehen so in der Arbeitsanweisung [§C35, §C39]. Drei kommen aus
// derselben Absicht und standen dort noch nicht:
//
//   „wiederholt nicht die Rangliste" — ein Wert, der fast perfekt mit der
//   Siegquote laeuft, ist der Liga-Tab unter anderem Namen.
//
//   „die Mitte kommt vor" — das alte Tor fragte nur nach dem HALTER von
//   heute. Steht dahinter nur die Spitze, ist der Rekord beim naechsten
//   Wechsel wieder einer der Spitze; gemessen wird deshalb das Podest.
//
//   „mehr als die Haelfte hat den Fund" — die Quotentore gelten fuer einen
//   Fund nicht, sonst schafft man das Seltene ab [§C35]. An seine Stelle
//   tritt die Frage, ob er ueberhaupt erreichbar ist.
//
// `gilt` sagt, fuer welche Sorte ein Tor zaehlt. Ein Tor, das fuer einen
// Kandidaten nicht gilt, wird nicht als bestanden gezaehlt und nicht als
// gerissen — es steht als Strich da.
const TORE = [
  {k:'spiele', name:'hängt nicht an der Spielzahl', regel:'|r| ≤ 0,35',
   pruef:e => Math.abs(e.korrSpiele) <= 0.35, wert:e => 'r = ' + z2(e.korrSpiele)},
  {k:'quote', name:'wiederholt nicht die Rangliste', regel:'|r| ≤ 0,70',
   pruef:e => Math.abs(e.korrQuote) <= 0.70, wert:e => 'r = ' + z2(e.korrQuote)},
  {k:'rennen', name:'die halbe Liga steht im Rennen', regel:'≥ die Hälfte',
   gilt:e => e.sorte === 'quote',
   pruef:e => e.imRennen * 2 >= e.ligaGewertet, wert:e => e.imRennen + ' von ' + e.ligaGewertet},
  {k:'aus', name:'die Bestmarke schlägt weit aus', regel:'≥ 1,5 σ',
   gilt:e => e.sorte === 'quote',
   pruef:e => e.ausschlag >= 1.5, wert:e => z2(e.ausschlag) + ' σ'},
  {k:'belegt', name:'der Fund ist erreichbar', regel:'mehr als die Hälfte hat ihn',
   gilt:e => e.sorte === 'fund',
   pruef:e => e.belegt * 2 >= e.imRennen, wert:e => e.belegt + ' von ' + e.imRennen},
  {k:'mitte', name:'nicht nur für die Spitze', regel:'Halter nicht in den besten drei',
   pruef:e => e.halterRang > 3, wert:e => 'Rang ' + e.halterRang + ' von ' + e.ligaGewertet},
  {k:'unten', name:'die Mitte kommt vor', regel:'einer der besten drei aus der unteren Hälfte',
   pruef:e => e.dreiUnten >= 1, wert:e => e.dreiUnten + ' von 3'},
  {k:'geteilt', name:'die Bestmarke ist nicht geschenkt', regel:'höchstens ein Drittel hält sie',
   pruef:e => e.gleich * 3 <= e.imRennen, wert:e => e.gleich + ' von ' + e.imRennen}
];
const gilt = (t, e) => !t.gilt || t.gilt(e);
const offen = e => TORE.filter(t => gilt(t, e));
const durch = e => offen(e).every(t => t.pruef(e));
const gerissen = e => offen(e).filter(t => !t.pruef(e));

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
  schwaechstertag:'Der beste schlechteste Tag gehört fast immer dem besten Spieler: r = 0,88.',
  metronom:'Die Bestmarke gehört der Mitte, dahinter aber steht nur die Spitze: keiner der besten drei kommt aus der unteren Hälfte. Beim nächsten Halterwechsel wäre es ein Rekord der Spitze — genau das fängt das neue sechste Tor ab.',

  // ── Zweite Runde ─────────────────────────────────────────────────
  herausgefordert:'Wer immer Außenseiter war, ist die Rangliste auf den Kopf gestellt: r = −0,96 zur Siegquote. Die mittlere Siegchance einer Laufbahn IST das Urteil der Liga über ihren Spieler, nur aus der Sicht der anderen.',
  wandergeselle:'Wem es gleichgültig ist, wer daneben steht, ist der, der ohnehin gewinnt: r = 0,89. Nur sechs stehen im Rennen, und unter den besten drei ist niemand aus der unteren Hälfte.',
  wochentagsfest:'Besteht sechs von sieben Toren und reißt das letzte: die Bestmarke gehört Rang 4, aber dahinter stehen nur Spieler aus der oberen Hälfte. Derselbe Befund wie beim Metronom, und aus demselben Grund abgelehnt.',
  unbequem:'Der Abstand zur Rechnung in einem einzigen Duell-Paar schwankt zu stark: 1,29 σ reichen nicht, und mit r = 0,48 hängt er an der Zahl der Duelle. Eine Frage an EINEN Gegner braucht mehr Partien, als die Liga hergibt.',
  selbstlaeufer:'Neben dem schwächsten Partner über der Rechnung zu liegen, kann nur, wer selbst stark ist: r = 0,82. Es ist „Der Katalysator" unter anderem Namen, und den gibt es schon.',
  fehlstart:'Einen Fehlstart aufzuholen ist Können, nicht Fügung: r = 0,89 zur Siegquote. Dazu hängt die Zahl der Gelegenheiten an der Spielzahl (r = 0,51) — wer mehr spielt, verliert häufiger eine Auftaktpartie.',
  anspieler:'Die erste Partie eines Tages ist keine eigene Frage: wer gut ist, gewinnt sie auch. r = 0,91, und der Ausschlag reicht ohnehin nicht.',
  schlussmann:'Dasselbe am anderen Ende des Tages: r = 0,84. Die Rechnung kennt die Uhrzeit nicht, also bleibt vom Abstand nur das Können übrig.',
  standhaft:'Nicht ohne Sieg zu bleiben schafft fast jeder an fast jedem Tag: 0,62 σ heißt, der Beste liegt kaum weiter draußen als der Durchschnitt, und sieben von zehn halten die Bestmarke punktgleich. Eine Bestmarke, die jeder fast hält, ist keine.',
  aufwaermen:'Knapp gerissen, und zwar am ersten Tor: r = −0,36 zur Spielzahl bei einer Grenze von 0,35. Wer viele Partien am Tag spielt, hat längere Hälften und damit ruhigere Quoten. Dazu fehlt die Mitte auf dem Podest.',
  langstreckler:'Die langen Tage sind die, an denen die Vielspieler antreten, und über der Rechnung liegen dort die Besten: r = 0,96. Der Zusatz „ab 6 Partien" macht daraus keine eigene Frage.',
  rueckkehrer:'Fünf von sieben Toren gerissen. Die Rückkehr nach einer Pause ist keine eigene Lage: die Rechnung stimmt auch dort, und was übrig bleibt, ist wieder das Können (r = 0,74). Die Zahl der Pausen hängt zudem an der Spielzahl.',
  buchhalter:'Ein aufgehendes Torkonto ist eine Fügung — aber die Zahl der Gelegenheiten ist die Spielzahl: r = 0,69. Dazu steht kein Spieler aus der unteren Hälfte auf dem Podest.',
  weisseweste:'Der Fund ist zu selten: genau EIN Spieler von elf hat je zwei Partien ohne Gegentor an einem Tag geschafft. §C35 erlaubt, dass die Hälfte leer steht, nicht zehn von elf.',
  rundumschlag:'Der Fund ist erreichbar (acht von elf haben ihn), aber er gehört dem Ersten der Liga und hängt an der Spielzahl: wer an einem Tag sechs verschiedene Gegner schlägt, muss erst einmal sechs Partien spielen.',
  serientaeter:'Besteht sechs Tore und reißt das siebte: der Fund ist erreichbar, unabhängig von der Spielzahl und keine Wiederholung der Rangliste — aber sieben von zehn haben drei Partien nacheinander mit demselben Stand. Die Spitze ist ein Plateau, und ein Rekord, den sieben gleichzeitig tragen, zeichnet niemanden aus; sein Grundwert teilt sich durch sieben [§C34, §C35]. Eine höhere Grenze löst das nicht: bei vier Partien nacheinander steht die Liste leer.',
  zahlendreher:'r = 0,99 zur Spielzahl — das ist die reinste Anwesenheitsliste des ganzen Vorschlags. Wer 348 Partien spielt, erlebt zwangsläufig mehr Tage mit einem Ergebnis und seinem Spiegelbild als jemand mit 90.'
};

const zeile = e => {
  const ok = durch(e);
  return `<tr class="${ok ? 'ja' : 'nein'}">
    <td><b>${esc(e.name)}</b><code>${esc(e.id)}</code>
      <span class="frage">${esc(e.frage)}</span></td>
    <td class="bed">${esc(e.mindText)}</td>
    ${TORE.map(t => gilt(t, e)
      ? `<td class="tor ${t.pruef(e) ? 'gut' : 'schlecht'}">${esc(t.wert(e))}</td>`
      : '<td class="tor leer">—</td>').join('')}
    <td class="urteil">${ok
      ? '<span class="ok">aufnehmen</span>'
      : '<span class="weg">fällt aus</span>'}</td>
  </tr>`;
};

const nehmen = D.kandidaten.filter(durch);
const raus = D.kandidaten.filter(e => !durch(e));
// Die erste Runde hob die Fragen der Monatschroniken auf die Laufbahn; die
// zweite fragt nach der Auslosung, nach dem Moment im Tag und nach vier
// Funden. Getrennt gezeigt, weil die zweite Runde eine andere Frage stellt
// und ihr Ergebnis fuer sich steht.
const RUNDE2 = new Set(['ausgelost','herausgefordert','wandergeselle','wochentagsfest',
  'unbequem','selbstlaeufer','fehlstart','anspieler','schlussmann','standhaft',
  'aufwaermen','langstreckler','rueckkehrer','buchhalter','weisseweste',
  'rundumschlag','zahlendreher','serientaeter']);
const r1 = D.kandidaten.filter(e => !RUNDE2.has(e.id));
const r2 = D.kandidaten.filter(e => RUNDE2.has(e.id));
const funde = D.kandidaten.filter(e => e.sorte === 'fund');

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
    <span class="sb-kam">${e.zufall ? 'Kammer Fügungen' : 'Kammer ' + (e.art === 'konstanz' ? 'Bestmarken' : 'Können')}${
      e.sorte === 'fund' ? ' · Fund' : ''}</span></div>
  <div class="sb-frage">${esc(e.frage)}</div>
  <table class="sb-t">
    <tr><td>Quelle</td><td>${esc(herkunftText(e.quelle))} „${esc(e.quelle)}" — derselbe
      Name, dasselbe Zeichen, ${(L.herkunft || {})[e.quelle] === 'rekord'
        ? 'und eine zweite Frage an denselben Eintrag'
        : 'nur die andere Zeitachse [§13.1]'}</td></tr>
    <tr><td>Bedingung</td><td>${esc(e.mindText)}</td></tr>
    <tr><td>Halter heute</td><td><b>${esc(e.halter)}</b> — Rang ${e.halterRang} von
      ${e.ligaGewertet} in der Siegquote, ${e.halterSpiele} Partien</td></tr>
    <tr><td>Beleg</td><td>${esc(e.beleg)}</td></tr>
    <tr><td>Im Rennen</td><td>${e.imRennen} von ${e.ligaGewertet} Spielern${
      e.sorte === 'fund' ? `, und ${e.belegt} haben den Fund schon einmal getroffen` : ''}</td></tr>
    <tr><td>Ausschlag</td><td>${z2(e.ausschlag)} σ über dem Mittel der Gewerteten${
      e.sorte === 'fund' ? ' — für einen Fund kein Tor [§C35]' : ''}</td></tr>
    <tr><td>Die Mitte</td><td>${e.dreiUnten} der besten drei ${e.dreiUnten === 1 ? 'kommt' : 'kommen'}
      aus der unteren Hälfte der Siegquote (ab Rang ${e.untenAb + 1})</td></tr>
    <tr><td>Halter</td><td>${e.gleich === 1 ? 'einer allein'
      : e.gleich + ' halten die Bestmarke punktgleich'} von ${e.imRennen} im Rennen</td></tr>
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
  .tor.leer{color:var(--faint)}
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
  <h1>Rekorde, die jeder holen kann</h1>
  <p>Gesucht sind Liga-Rekorde, die <b>nicht den Vielspieler</b> und <b>nicht den Besten</b>
     belohnen: erreichbar für die ganze Liga, besonders, auf einer <b>Abweichung</b> oder
     einer <b>Fügung</b> gebaut und ohne einen der ${L.rekorde} bestehenden Einträge zu
     doppeln. ${D.kandidaten.length} Kandidaten wurden an den echten Partien gerechnet.
     <b>${wort(nehmen.length)}</b> überstehen jedes Tor, das für sie gilt.</p>
  <p>Zwei Runden. Die <b>erste</b> hebt die Fragen der Monatschroniken auf die Laufbahn:
     dieselbe Frage, andere Zeitachse [§13.1]. Die <b>zweite</b> fragt nach dem, was
     niemand wählt — welches Los die Auslosung zuteilt, wer daneben steht, welcher
     Wochentag es ist, welcher Moment im Spieltag es ist — und nach vier <b>Funden</b>,
     einzelnen Zusammentreffen, die ein Gelegenheitsspieler an einem einzigen Nachmittag
     treffen kann.</p>
  <p>Das Ergebnis ist selbst die wichtigste Aussage: die meisten dieser Fragen hängen
     entweder doch an der Spielzahl oder sie wiederholen die Rangliste. Welche das sind
     und warum, steht unten mit Zahl und Grund — ${raus.length} Absagen, jede mit ihrer
     eigenen Messung.</p>

  <div class="karten">
    <div class="kz"><b>${D.kandidaten.length}</b><span>Kandidaten gerechnet</span></div>
    <div class="kz gold"><b>${nehmen.length}</b><span>bestehen jedes Tor</span></div>
    <div class="kz"><b>${raus.length}</b><span>fallen aus, mit Grund</span></div>
    <div class="kz"><b>${L.rekorde}</b><span>Rekorde heute im Katalog</span></div>
    <div class="kz"><b>${funde.length}</b><span>davon Funde, mit eigenem Tor</span></div>
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

  <h2>Die ${wort(TORE.length)} Tore</h2>
  <p>Vier stehen so in der Arbeitsanweisung [§C35, §C39]. Drei sind hier entstanden, und
     eines davon ist selbst ein Ergebnis: „die Mitte kommt vor" nimmt eine Sache aus der
     ersten Runde wieder zurück, die dort bestanden hatte.</p>
  <div class="regeln">
    ${TORE.map(t => `<div class="regel"><b>${esc(t.name)}</b>
      <span><em>${esc(t.regel)}</em>${t.gilt ? ' · nur für '
        + (t.k === 'belegt' ? 'Funde' : 'Quoten') : ''} — ${esc({
        spiele:'Der Wert darf nicht mit der Zahl der Partien laufen, sonst hält den Rekord, wer am meisten spielt [§C39]. Das ist das Tor, an dem die meisten Funde scheitern: ein Zusammentreffen braucht Gelegenheiten, und Gelegenheiten sind Partien.',
        quote:'Ein Wert, der fast perfekt mit der Siegquote läuft, ist die Rangliste unter anderem Namen. Vierzehn der Kandidaten scheitern daran, und das ist der häufigste Grund von allen.',
        rennen:'Mindestens die halbe Liga muss die Mindestzahl erfüllen, sonst ist die Bedingung selbst die Hürde [§C35].',
        aus:'Der Beste muss mindestens 1,5 Standardabweichungen weiter draußen liegen als der Durchschnitt, sonst hält ihn fast jeder fast [§C39].',
        belegt:'Für einen Fund gelten die Quotentore nicht — eine Quotenschwelle darauf anzuwenden hieße, das Seltene abzuschaffen [§C35]. An ihre Stelle tritt die Frage, ob er überhaupt erreichbar ist: höchstens die Hälfte darf leer stehen. Jeder Fund braucht dafür seine Untergrenze, sonst trägt jeder Spieler einen Wert und der Deckel geht ins Leere.',
        mitte:'Der heutige Halter darf nicht aus den besten drei kommen — das ist die Frage, um die es hier überhaupt geht.',
        geteilt:'Und sie darf nicht bei so vielen gleichzeitig liegen, dass sie niemanden mehr auszeichnet: „eine Bestmarke, die jeder geschenkt bekommt, ist keine mehr" [§C35]. Gemessen fällt daran „Der Serientäter" — sieben von zehn Spielern haben drei Partien nacheinander mit demselben Stand, also wäre der Rekord ein Plateau und sein Grundwert durch sieben geteilt [§C34]. Dasselbe beim „Standhaften". Genau dieser Fall war der Grund, warum der Ausschlag dort so klein ausfällt, und das Tor macht die Ursache sichtbar statt nur die Folge.',
        unten:'Und dahinter darf nicht wieder nur die Spitze stehen. Das alte Tor fragte allein nach dem Halter von HEUTE; steht auf den Plätzen zwei und drei niemand aus der unteren Hälfte, ist der Rekord beim nächsten Wechsel wieder einer der Spitze. Gemessen am Podest fällt damit „Das Metronom" aus der ersten Runde heraus — eine Sache, die fünf Tore bestanden hatte.'
      }[t.k])}</span></div>`).join('')}
  </div>

  <h2>Erste Runde: die Fragen der Monatschroniken, auf die Laufbahn gehoben</h2>
  <table class="st">
    <thead><tr><th>Kandidat</th><th>Bedingung</th>
      ${TORE.map(t => `<th class="nz">${esc(t.name.split(' ').slice(0, 3).join(' '))}</th>`).join('')}
      <th>Urteil</th></tr></thead>
    <tbody>${r1.map(zeile).join('')}</tbody>
  </table>

  <h2>Zweite Runde: die Auslosung, der Moment im Tag und vier Funde</h2>
  <p>Die erste Runde fragt überall nach einer Abweichung über viele Partien. Was dem
     Katalog danach fehlt, sind zwei andere Sorten. Die <b>Fügung der Auslosung</b>: wer
     welches Los zieht, welchen Partner, welchen Gegner, welchen Wochentag — das wählt
     niemand, also kann es jedem zufallen. Und der <b>Moment im Tag</b>: die erste Partie,
     die letzte, der Tag nach einem Fehlstart, die Rückkehr nach einer Pause. Jeder
     Spieltag bringt davon je einen, unabhängig davon, wie viele Partien jemand spielt.</p>
  <table class="st">
    <thead><tr><th>Kandidat</th><th>Bedingung</th>
      ${TORE.map(t => `<th class="nz">${esc(t.name.split(' ').slice(0, 3).join(' '))}</th>`).join('')}
      <th>Urteil</th></tr></thead>
    <tbody>${r2.map(zeile).join('')}</tbody>
  </table>

  <h2>Die ${wort(nehmen.length)}, die bleiben</h2>
  ${steckbrief}

  <h2>Warum die anderen ${wort(raus.length)} ausfallen</h2>
  <table class="st">
    <thead><tr><th>Kandidat</th><th>Grund</th></tr></thead>
    <tbody>${raus.map(e => `<tr><td><b>${esc(e.name)}</b></td>
      <td class="bed">${esc(GRUND[e.id] || 'Ein Tor gerissen, siehe Tabelle oben.')}</td></tr>`).join('')}</tbody>
  </table>
  <p>Vier Ergebnisse sind dabei mehr als eine Absage. <b>Erstens:</b> eine Abweichung
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
  <p><b>Drittens:</b> ein <b>Moment im Tag</b> ist keine eigene Frage. „Der Anspieler",
     „Der Schlussmann", „Der Fehlstarter", „Der Rückkehrer" und „Der Langstreckler" messen
     alle den Abstand zur Rechnung in einem ausgewählten Moment — und die Rechnung kennt
     die Uhrzeit nicht. Was übrig bleibt, ist wieder das Können: r =
     ${z2((D.kandidaten.find(e => e.id === 'anspieler') || {}).korrQuote || 0)} bis
     ${z2((D.kandidaten.find(e => e.id === 'langstreckler') || {}).korrQuote || 0)} zur
     Siegquote. Der Moment schneidet die Partien nur anders auf, er stellt keine neue
     Frage. <b>Viertens:</b> ein <b>Fund</b> zerfällt an genau zwei Stellen. Entweder er
     ist zu selten — „Die weiße Weste" hat gemessen EIN Spieler von elf je geschafft —
     oder er ist eine Anwesenheitsliste: „Der Zahlendreher" steht bei
     r = ${z2((D.kandidaten.find(e => e.id === 'zahlendreher') || {}).korrSpiele || 0)}
     zur Spielzahl, weil jeder Spieltag eine neue Gelegenheit ist. Und wer diese beiden
     Klippen umschifft, landet auf der dritten: „Der Serientäter" ist für
     ${(D.kandidaten.find(e => e.id === 'serientaeter') || {}).belegt} von
     ${(D.kandidaten.find(e => e.id === 'serientaeter') || {}).imRennen} erreichbar und
     unabhängig von Spielzahl und Rangliste — aber
     ${(D.kandidaten.find(e => e.id === 'serientaeter') || {}).gleich} halten die
     Bestmarke punktgleich. Ein Rekord, den sieben von zehn gleichzeitig tragen, ist
     keiner mehr, und sein Grundwert teilt sich durch sieben [§C34]. Damit fällt von den
     vier Funden jeder, und keiner aus demselben Grund. Das ist die ehrlichste Absage
     dieser Seite: die Idee ist richtig, die vier Ausführungen sind es nicht.</p>

  <h2>Was es für die Laufbahn bedeutet</h2>
  <p>Ein Liga-Rekord ist eine der drei Quellen des Prestiges [§C34]. Der Grundwert ist
     <code>PRESTIGE_REKORD</code> × <code>PRESTIGE_ART[art]</code>, geteilt durch die Zahl
     der heutigen Halter und nach dem Gesetz der fallenden Erträge.
     ${nehmen.filter(e => e.zufall).length} der ${nehmen.length} neuen Einträge sind
     <b>Fügungen</b> (<code>art:'ereignis'</code> mit <code>zufall</code>): sie messen
     keine Fähigkeit, also wiegen sie halb so viel wie ein Beleg für Können —
     ${wertJe} statt ${wertJe * 2} Punkte. Das ist kein Kompromiss, sondern genau die
     Absicht von §C35: <em>sie sollen jemandem gehören können, nicht jemanden
     auszeichnen.</em> Ein <b>Fund</b> ist nicht dabei, und das ist das Ergebnis der
     zweiten Runde: von den vier gerechneten fällt jeder, und jeder aus einem anderen
     Grund. Die Lücke zwischen „zu selten" und „nur eine Anwesenheitsliste" ist schmaler,
     als sie aussieht.</p>
  <table class="st">
    <thead><tr><th>Spieler</th><th class="nz">Prestige</th><th>Stufe</th>
      <th class="nz">davon Rekorde</th><th class="nz">neu</th><th>bis zur nächsten Stufe</th></tr></thead>
    <tbody>${laufbahnTabelle}</tbody>
  </table>
  <p>Gemessen geht <b>keiner</b> der ${nehmen.length} Rekorde an die besten drei der Liga.
     Die Halter stehen auf Rang
     ${nehmen.map(e => e.halterRang).sort((a, b) => a - b).join(', ')} von
     ${nehmen[0] ? nehmen[0].ligaGewertet : 11} der Siegquote, und auf jedem Podest steht
     mindestens einer aus der unteren Hälfte — das ist das siebte Tor, und es ist der
     Unterschied zwischen „gehört heute der Mitte" und „kann der Mitte gehören". Der
     Katalog verschiebt damit ${nehmen.length * wertJe} Punkte Prestige in die untere
     Hälfte, und einer davon entscheidet eine Stufe: die Zahlen oben sagen, wer danach
     den nächsten Reif trägt.</p>
  <p>Für das Gleichgewicht der drei Quellen heißt das: die Rekorde stehen heute bei
     ${L.rekord} Punkten gegen ${L.monat} aus den Monatswertungen. ${nehmen.length} neue Einträge legen
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
    <div class="regel"><b>Und nicht als Schattenseite</b><span>Keiner davon ist negativ.
      „Der Wechselhafte" klingt danach, ist aber eine Fügung: wem die schwankenden Tage
      zufallen, entscheidet niemand selbst. Rot bleibt der Richtung [§C25].</span></div>
  </div>

  <h2>Was beim Einbauen dazugehört</h2>
  <p>Jeder Eintrag braucht dieselben Felder wie jeder andere [§10.2]: <code>allzeit.cond</code>
     (die Bedingung im Klartext), <code>allzeit.wie</code> (was die Zahl bedeutet),
     <code>allzeit.val</code> und <code>allzeit.raw</code>, <code>allzeit.min</code>,
     <code>allzeit.ev</code> (beginnt mit dem Wert, nach dem sortiert wird),
     <code>zufall</code> für die Kammer und ein Eintrag in <code>_chronicleCtx</code>.
     Ein Fund braucht außerdem seine Untergrenze, unter der er als nicht getroffen gilt.
     Dazu vier Zusicherungen in <code>tests/disziplinen</code>, die diese Seite prüfbar
     machen: die Korrelation zur Spielzahl unter 0,35, die zur Siegquote unter 0,70, der
     Ausschlag über 1,5 σ und mindestens einer der besten drei aus der unteren Hälfte der
     Siegquote. Die letzte gibt es heute noch nicht, und sie ist die wichtigste: sie ist
     der Unterschied zwischen einem Rekord, der der Mitte gehört, und einem, den die
     Mitte holen kann. Ohne die vier ist dieser Vorschlag eine Bitte.</p>

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
