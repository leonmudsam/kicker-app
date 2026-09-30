// ╔═══ §11.0e ─── DIE FAKTEN EINER STORY ───────────────────────────────╗
//     Karte, Sammelband, Detailblatt und Punktewirkung entstanden bisher an
//     drei verschiedenen Stellen aus drei verschiedenen Rechnungen. Deshalb
//     stand auf einer Karte „Julian holt einen Liga-Rekord: +100 Prestige",
//     im Blatt daneben eine andere Zahl und in der Laufbahn eine dritte: 100
//     ist der GRUNDWERT, und was ankommt, entscheidet erst die Halterzahl und
//     die Wurzeldämpfung über alle heute gehaltenen Rekorde [§C34].
//
//     Diese Datei ist die eine Wahrheit dazwischen. Sie rechnet selbst
//     nichts nach: sie fragt `allChronicles`, `seasonTitleHalter`,
//     `seasonTitleOf` und `prestigeTabelle` — und zwar mit EINEM Zeitschnitt
//     je Stand. Zwei sichtbare Sätze aus zwei verschiedenen Zeitschnitten
//     sind der Fehler, den die ganze Datei verhindert.
//
//     Vier Dinge stehen hier:
//       _storyStand(bisMs)      ein Stand der Liga zu EINEM Zeitpunkt
//       _storyTagGrenzen(ms)    der Spieltag als Paar aus Vorher und Nachher
//       _prestigeWirkung(…)     was eine Änderung wirklich gebracht hat
//       _storyRangFrei(sid)     ist die Rangliste dieser Saison belastbar
// ╚═════════════════════════════════════════════════════════════════════════╝

// ─── Ein Stand der Liga ──────────────────────────────────────────────
// Kein eigener Zwischenspeicher: die vier zentralen Funktionen merken ihr
// Ergebnis selbst, und ein zweiter Topf daneben wäre eine zweite Wahrheit.
// Der Stand ist nur die Klammer, die den Zeitschnitt festhält — wer ihn
// weiterreicht, kann ihn nicht mehr verwechseln.
//
// `bisMs === 0` heißt „jetzt". Das ist wichtig für die Kosten: ohne Schnitt
// treffen alle vier Funktionen ihren heißen Cache, mit Schnitt rechnen sie
// (gemessen ~60 ms für `prestigeTabelle`). Ein Generatorlauf braucht genau
// zwei Stände, und `_schnitt` wirft einen Schnitt hinter der letzten Partie
// ohnehin weg [§3].
function _storyStand(bisMs){
  const ms = bisMs || 0;
  const schnitt = ms || undefined;
  return {
    bisMs: ms,
    // Die Liga-Rekorde als {id: {pids, val, ev}}.
    rekorde(){
      try { return (allChronicles(schnitt) || {}).byId || {}; } catch(e){ return {}; }
    },
    // Die vollständige Monatstafel: ein Spieler kann mehrere Disziplinen
    // anführen. `null` heißt „dieser Monat ist noch nicht gewertet" und ist
    // etwas anderes als „gewertet, aber niemand hält sie" [§C32].
    chronik(sid){
      try { return seasonTitleHalter(sid, schnitt); } catch(e){ return null; }
    },
    // Der EINE Monatseintrag, der im Profil steht und fürs Prestige zählt.
    // Wer drei Disziplinen anführt, hat trotzdem genau einen [§C32].
    profil(pid, sid){
      try { return seasonTitleOf(pid, sid, schnitt) || null; } catch(e){ return null; }
    },
    // Punkte, Stufe, Grad und jede einzelne Quelle mit Rang und Staffel.
    prestige(pid){
      try { return prestigeOf(pid, schnitt) || null; } catch(e){ return null; }
    }
  };
}

// ─── Der Spieltag als Paar ───────────────────────────────────────────
// Für eine Match-Geschichte ist der Vergleich die Partie. Für die Ewige
// Tafel, die Monatstafel und das Insignium ist er der TAG: ein Halterfeld
// wird im Lauf eines Nachmittags enger und wieder weiter, und wer am Abend
// nachsieht, will nicht drei Karten über denselben Rekord lesen. Verglichen
// wird deshalb der Stand vor der ersten Partie des Tages mit dem nach der
// letzten — ein Wechsel, der am selben Abend zurückgedreht wurde, ist keine
// Nachricht mehr. Welche Partie die endgültige Änderung ausgelöst hat, steht
// trotzdem im Detail.
//
// `nachMs` ist 0, solange der Tag der jüngste der Datenbank ist: dann ist
// „nachher" gleich „jetzt", und alle zentralen Funktionen treffen ihren
// heißen Cache. Für einen älteren Tag steht dort der Zeitstempel seiner
// letzten Partie, damit sich ein Monat Partie für Partie nachspielen lässt.
function _storyTagGrenzen(ms){
  if(!ms) return null;
  const d = new Date(ms); d.setHours(0, 0, 0, 0);
  const von = d.getTime(), bis = von + 864e5 - 1;
  let letzte = 0, erste = 0, n = 0;
  (matches || []).forEach(m => {
    const t = mts(m);
    if(t < von || t > bis) return;
    n++;
    if(!erste || t < erste) erste = t;
    if(t > letzte) letzte = t;
  });
  if(!n) return null;
  const juengste = matches.length ? mts(matches[matches.length - 1]) : 0;
  return {tag: tagKey(von), vonMs: von, erste, letzte, partien: n,
          vorMs: von - 1,
          nachMs: letzte >= juengste ? 0 : letzte,
          istHeute: letzte >= juengste};
}

// ─── Was eine Änderung wirklich gebracht hat ─────────────────────────
// Nie den rohen Grundwert als erhaltene Punkte zeigen. Ein zehnter Rekord
// gibt nicht 100 Prestige: er wird durch die Zahl seiner Halter geteilt,
// landet auf einem Rang im Rekordstapel und wird dort durch die Wurzel
// seiner Staffel geteilt — und weil er die anderen Rekorde mit verschiebt,
// ist der Nettozuwachs am Ende noch eine dritte Zahl. Gemessen stand auf
// einer Karte „+100", während die Laufbahn um 34 Punkte stieg.
//
// Gefragt werden deshalb zwei Stände, und der Unterschied IST die Antwort.
// `quellen` nennt für jede Rekord- und Monatsquelle des NEUEN Stands, was
// sie im Stapel wirklich wiegt; damit kann das Blatt die Rechnung zeigen,
// ohne sie ein zweites Mal aufzuschreiben.
function _prestigeWirkung(pid, vorStand, nachStand){
  const a = (vorStand && vorStand.prestige(pid)) || null;
  const b = (nachStand && nachStand.prestige(pid)) || null;
  const p = x => (x && isFinite(x.punkte)) ? x.punkte : 0;
  const t = (x, k) => (x && x.teile && isFinite(x.teile[k])) ? x.teile[k] : 0;
  const quellen = {};
  ((b && b.quellen) || []).forEach(q => {
    if(q.q !== 'rekord' && q.q !== 'monat') return;
    quellen[q.q + ':' + q.id] = {
      art: q.q, id: q.id, name: q.name || '',
      grundwert: Math.round(q.basis || q.grundwert || q.voll || 0),
      halter: q.halter || 1,
      rang: q.rang || 0,
      staffel: q.staffel || 1,
      wert: Math.round((q.p || 0) * 10) / 10
    };
  });
  const zahl = k => ((b && b.quellen) || []).filter(q => q.q === k).length;
  return {
    vor: Math.round(p(a)), nach: Math.round(p(b)),
    delta: Math.round(p(b) - p(a)),
    stufeVor: a ? a.stufe : 0, stufeNach: b ? b.stufe : 0,
    gradVor: a ? a.grad : 0,   gradNach: b ? b.grad : 0,
    rekordVor: Math.round(t(a, 'rekord')), rekordNach: Math.round(t(b, 'rekord')),
    rekordDelta: Math.round(t(b, 'rekord') - t(a, 'rekord')),
    monatVor: Math.round(t(a, 'monat')),   monatNach: Math.round(t(b, 'monat')),
    monatDelta: Math.round(t(b, 'monat') - t(a, 'monat')),
    rekordZahl: zahl('rekord'), monatZahl: zahl('monat'),
    quellen
  };
}

// ─── Ist die Rangliste belastbar? ────────────────────────────────────
// Am ersten Tag einer Saison steht jeder bei null, und die erste Partie
// macht ihren Sieger zum Tabellenführer. Gemessen ergab das nach jedem
// Monatswechsel eine Kette von Breaking-Karten über eine Tabelle, die es
// noch gar nicht gibt: „Neuer Spitzenreiter" dreimal an einem Vormittag,
// dazu jeder neue Elo-Bestwert als eigene Meldung.
//
// Belastbar heißt deshalb: genug Partien UND genug Spieler, die wirklich
// dabei waren. Die gebrauchte Spielerzahl wächst mit der Liga, bleibt aber
// zwischen vier und sechs — in einer Liga aus zwölf Leuten sind sechs
// regelmäßige Spieler eine Tabelle, in einer aus fünf sind es vier.
const STORY_RANG_MIN_PARTIEN = 15;
const STORY_RANG_MIN_EINSAETZE = 4;
function _storyRangFrei(sid, bisMs){
  let ms = [];
  try { ms = matchesInSeason(sid) || []; } catch(e){ ms = []; }
  if(bisMs) ms = ms.filter(m => mts(m) <= bisMs);
  const je = {};
  ms.forEach(m => [m.a1, m.a2, m.b1, m.b2].forEach(x => {
    if(x) je[x] = (je[x] || 0) + 1; }));
  const aktiv = Object.keys(je).length;
  const gebraucht = Math.max(4, Math.min(6, Math.ceil(aktiv * 0.75)));
  const genug = Object.keys(je).filter(x => je[x] >= STORY_RANG_MIN_EINSAETZE).length;
  return {frei: ms.length >= STORY_RANG_MIN_PARTIEN && genug >= gebraucht,
          partien: ms.length, aktiv, genug, gebraucht};
}

// ─── Die Gruppe entsteht vor dem Breaking ────────────────────────────
// Breaking war einmal eine Eigenschaft der einzelnen Meldung, und damit riss
// es zusammen, was zusammengehört: „Neuer Spitzenreiter: Maxi" stand als
// eigene Karte neben „Maxi und Henry: Absoluter Sieger" aus demselben 10:0.
// Die Reihenfolge ist deshalb verbindlich — erst der Gruppenschlüssel, dann
// die Darstellungsstufe [§C33].
//
// Der Schlüssel sagt, WARUM zwei Fakten zusammengehören. Nur zeitliche Nähe
// reicht nicht: „Johannes und Anton verlieren zusammen alles" trug einmal
// „Maxi: Nerven aus Stahl" als zweite Zeile, weil beide in derselben Minute
// entstanden sind.
const STORY_GRUPPE = {
  match:  'match',    // dieselbe Partie, Ursache und Wirkung
  leader: 'leader',   // derselbe Rangverlauf an einem Tag
  table:  'table',    // dieselbe dauerhafte Tafel am Tagesabschluss
  form:   'form',     // dieselbe Formtafel am Tagesabschluss
  awards: 'awards',   // niedrige Auszeichnungen ohne eigene Matchgeschichte
  recap:  'recap'     // feste Rückblicke
};
function _storyGruppeKey(art, schluessel){
  if(!STORY_GRUPPE[art] || !schluessel) return '';
  return art + ':' + schluessel;
}

// Ein einzelner belegbarer Fakt. Die ID ist deterministisch: dieselbe Lage
// ergibt auf jedem Gerät dieselbe ID, sonst legen zwei Telefone zwei Zeilen
// für dasselbe Ereignis an. Gespeichert werden die IDs und die WERTE, nicht
// nur der fertige Satz — Karte und Blatt bauen daraus dieselbe Aussage.
function _storyEreignis(o){
  const akt = (o.actorIds || []).filter(Boolean).slice().sort();
  return {
    id: [o.type, o.matchId || tagKey(o.occurredAt || Date.now()),
         o.subjectKey || '', akt.join('-')].join('|'),
    type: o.type,
    occurredAt: o.occurredAt || null,
    matchId: o.matchId || null,
    actorIds: (o.actorIds || []).filter(Boolean),
    subjectKey: o.subjectKey || '',
    title: o.title || '',
    text: o.text || '',
    evidence: o.evidence || '',
    importance: o.importance || 0,
    detail: o.detail || null
  };
}
