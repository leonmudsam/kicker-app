// ─── §11.1b — Ambiente Fun-Fact-Stories (v8.5, v9.5) ─────────────────
// Erzeugt Fun Facts / persönliche Nuggets / Rivalitäten / Historie, damit der
// Feed auch OHNE neue Matches lebendig wirkt.
//
// KERNPRINZIP (kein Spam, Cross-Device-konsistent):
//   - RHYTHMUS (v9.7): zwei Fun Facts pro TAG, um 10:00 und 19:00. _isAmbientDay
//     ist immer true; ein Slot entsteht erst ab seiner Uhrzeit.
//   - Story-ID ist tages+stunden-deterministisch: `ambient_<datum>_<stunde>`.
//     → ON CONFLICT DO NOTHING beim Upload: der erste Insert gewinnt den
//       Timestamp, alle Geräte sehen exakt dieselbe Story.
//   - Welchen Fun Fact der Slot zeigt, entscheidet ein aus dem Datum geseedeter
//     Pseudo-Zufall (mulberry32) — „random" fürs Gefühl, aber überall identisch.
//   - COOLDOWN: Fun-Fact-Typen, die in den letzten AMBIENT_COOLDOWN_DAYS Tagen
//     schon liefen, werden gesperrt → Rotation statt vorhersehbarer Reihenfolge,
//     keine schnellen Wiederholungen. Ist alles gesperrt, wird die Sperre gelöst.
//   - Die Inhalte stammen aus echten Daten (allPlayerStats, H2H-Map, Scores) —
//     nichts wird erfunden. Liefert ein Template kein Ergebnis (zu wenig Daten),
//     wird deterministisch das nächste genommen.
function _buildAmbientStories(now, pm, nameOf){
  const out = [];
  if(!Array.isArray(AMBIENT_SLOTS) || !AMBIENT_SLOTS.length) return out;
  // v9.7: täglich, mehrere Slots (10:00 & 19:00). _isAmbientDay ist immer true.
  if(!_isAmbientDay(now)) return out;

  const templates = _ambientTemplatePool(now, pm, nameOf);
  if(!templates.length) return out;

  // ── Ein Slot entsteht HEUTE oder gar nicht ───────────────────────────
  // Ein Slot entsteht, wenn jemand die App nach seiner Uhrzeit öffnet. Wer
  // abends nicht hineinsieht, verpasst den 19-Uhr-Slot — und einmal wurden
  // deshalb die letzten drei Tage nachgetragen, mit `when` auf der damaligen
  // Slot-Zeit. Beides war falsch:
  //   • Eine Karte, die JETZT entsteht und ein Datum von vorgestern trägt,
  //     steht unter einem Tageskopf, den der Leser längst gelesen hat, und der
  //     Lesestand zählt sie damit als gelesen [§C33]. Sie wird nie gesehen.
  //   • Ihr Inhalt entstand aus den HEUTIGEN Zahlen und aus der Rotation, wie
  //     sie heute aussieht — eine Behauptung über einen Stand, den es an jenem
  //     Tag nicht gab. Gemessen zog derselbe Slot damit zwei verschiedene
  //     Karten, je nachdem wann gefragt wurde.
  // Nachgetragen wird deshalb nur, was zu HEUTE gehört, und der Zeitstempel
  // ist der Moment des Entstehens: eine neue Karte ist die neueste Karte.
  // Ihre ID trägt weiter Datum und Slot-Stunde, also entsteht sie genau einmal,
  // und beim Upload gewinnt der erste Insert den Zeitstempel für alle Geräte.
  //
  // Datum und Uhrzeit kommen aus DERSELBEN lokalen Zeit. Vorher stand im
  // Schlüssel das UTC-Datum, in `when` aber die lokale Slot-Zeit — zwischen
  // Mitternacht und der UTC-Grenze trug eine Story deshalb ein Datum, das nicht
  // zu ihrem Zeitstempel passte.
  const _dayMs = 86400000;
  const dueSlots = [];
  const slotHours = AMBIENT_SLOTS.slice().sort((a, b) => a - b);
  // An welchen Tagen wurde gespielt? Der Abend-Slot schweigt dann.
  // Keine der Partien hat je vor 10 Uhr angefangen, der Vormittags-Slot steht
  // also immer vor dem Spieltag. Die letzte hat um 18 Uhr angefangen: um 19 Uhr
  // ist der Spieltag vorbei, und dann ist alles von diesem Tag interessanter
  // als eine Zahl, die seit Wochen gilt.
  const _spieltage = new Set();
  (matches || []).forEach(m => {
    _spieltage.add(tagKey(m.created_at));
  });
  {
    const dk = tagKey(now);
    for(const slotHour of slotHours){
      const faellig = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
                               slotHour, 0, 0, 0);
      if(faellig.getTime() > now.getTime()) continue;   // Slot ist noch nicht fällig
      if(slotHour >= AMBIENT_ABEND_AB && _spieltage.has(dk)) continue;
      // `when` ist JETZT, nicht die Slot-Stunde: die Karte entsteht in diesem
      // Moment und ist damit die neueste. Mit der Slot-Stunde rutschte ein um
      // 22 Uhr nachgetragener 10-Uhr-Slot unter alles, was der Leser an diesem
      // Tag schon gelesen hat.
      dueSlots.push({dateKey: dk, slotHour, when: new Date(now.getTime())});
    }
  }
  if(!dueSlots.length) return out;

  // Bereits persistierte Ambient-Stories: (a) ein Slot, der schon existiert, wird
  // nicht neu abgeleitet (Daten-Drift-Schutz, er kommt ohnehin aus dem DB-Cache);
  // (b) die der letzten Tage sperren ihren Fun-Fact-Typ bzw. ihre Köpfe.
  const known = (Array.isArray(_cache._stories) ? _cache._stories : [])
    .filter(s => s && typeof s.id === 'string' && s.id.indexOf('ambient_') === 0);
  const knownById = new Map(known.map(s => [s.id, s]));

  // v9.11: Cooldown ist PRO Typ. Standard = AMBIENT_COOLDOWN_DAYS; ein Template
  // darf ihn via `cooldown` verkürzen (z.B. fun_random_stat, dessen Inhalt bei
  // jedem Lauf variiert → darf früher wiederkommen).
  const cooldownDaysOf = {};
  for(const t of templates) cooldownDaysOf[t.key] = t.cooldown || AMBIENT_COOLDOWN_DAYS;
  const pidsOf = dr => !dr ? [] : (Array.isArray(dr.ambientPids) ? dr.ambientPids : (dr.ambientPid ? [dr.ambientPid] : []));
  const rubrikVon = key => {
    if(/^award_/.test(key)) return 'auszeichnung';
    if(/^rivalry_/.test(key)) return 'duell';
    if(/^personal_/.test(key)) return 'persoenlich';
    if(/^(insignium_|titelband_)/.test(key)) return 'laufbahn';
    if(/^(chronicle_|season_|history_)/.test(key)) return 'chronik';
    if(/^(form_|fun_streak|fun_comeback)/.test(key)) return 'form';
    return 'liga';
  };

  // Die Rotation der letzten Tage, aus dem was in der DB liegt. Steht der
  // Bestand noch nicht bereit — `loadAll` zeichnet, bevor `syncStoriesViaDb`
  // gelaufen ist —, zieht der Lauf ohne Sperren und damit eine andere Karte als
  // der Lauf mit Bestand. Fuer den Slot von heute ist das die erste und einzige
  // Ziehung; alles Aeltere steht schon in der DB. Damit der Bestand ueberhaupt
  // gesehen wird, traegt der Memo-Schluessel des Generators die Zahl der
  // gespeicherten Fun Facts, und `syncStoriesViaDb` laedt sie, bevor es zieht.
  const history = [];
  for(const s of known){
    const md = /^ambient_(\d{4}-\d{2}-\d{2})_/.exec(s.id);
    if(!md) continue;
    const sub = (s.dataRef && s.dataRef.sub) || null;
    history.push({day: md[1], ts: new Date(md[1] + 'T00:00:00').getTime(), sub,
                  rubrik:(s.dataRef && s.dataRef.ambientRubrik) || rubrikVon(sub || ''),
                  pids: pidsOf(s.dataRef)});
  }

  for(const slot of dueSlots){
    const slotId = 'ambient_' + slot.dateKey + '_' + slot.slotHour;
    const existing = knownById.get(slotId);
    if(existing) continue;   // steht schon in der DB — nichts nachzutragen

    // Sperren immer aus Sicht des SLOT-TAGES, nicht aus Sicht von jetzt.
    const refMs = new Date(slot.dateKey + 'T00:00:00').getTime();
    // v9.11: Typ-Cooldown — was zuletzt lief, kommt nicht sofort wieder.
    const cooldownKeys = new Set();
    // Innerhalb desselben Tages darf ein Typ nicht zweimal kommen, damit 10:00
    // und 19:00 nie denselben Fun Fact zeigen.
    const usedToday = new Set();
    const usedRubriken = new Set();
    const recentRubriken = new Set();
    // v9.10 + v9.14: Same-Player-Sperre, heute (usedPids) und über die letzten
    // AMBIENT_PLAYER_COOLDOWN_DAYS (recentPids). Viele Templates sind „Wer führt
    // bei Stat X?"-Superlative und zeigen bei einem dominanten Spieler alle auf
    // denselben Kopf — ohne die Sperre feiert der Feed tagelang den Platzhirsch.
    const usedPids = new Set();
    const recentPids = new Set();
    // Typ und Kopf zusammen: `sub|pid` der letzten AMBIENT_PAAR_COOLDOWN_DAYS Tage.
    const recentPaare = new Set();
    for(const h of history){
      if(h.day === slot.dateKey){
        if(h.sub) usedToday.add(h.sub);
        if(h.rubrik) usedRubriken.add(h.rubrik);
        for(const pid of h.pids) usedPids.add(pid);
      }
      const age = refMs - h.ts;
      if(age < 0) continue;   // liegt nach diesem Slot — zählt hier nicht
      if(h.sub && age <= (cooldownDaysOf[h.sub] || AMBIENT_COOLDOWN_DAYS) * _dayMs) cooldownKeys.add(h.sub);
      if(h.rubrik && age <= AMBIENT_RUBRIK_COOLDOWN_DAYS * _dayMs) recentRubriken.add(h.rubrik);
      if(age <= AMBIENT_PLAYER_COOLDOWN_DAYS * _dayMs){ for(const pid of h.pids) recentPids.add(pid); }
      if(h.sub && age <= AMBIENT_PAAR_COOLDOWN_DAYS * _dayMs){
        for(const pid of h.pids) recentPaare.add(h.sub + '|' + pid);
      }
    }

    const rng = _ambientRng(_ambientHash(slot.dateKey + '_' + slot.slotHour));
    // Templates in geseedeter Reihenfolge prüfen; erstes passende mit Ergebnis
    // gewinnt → variiert pro Slot/Tag, bleibt aber deterministisch.
    // v9.11: GEWICHTETE Reihenfolge — ein Template mit `weight` > 1 kommt
    // `weight`-fach in den Lostopf und landet dadurch statistisch früher, wird
    // also bei gleicher Eignung öfter gewählt (mehr „Mischung", kein Monopol).
    const bag = [];
    templates.forEach((t, i) => { const w = Math.max(1, t.weight || 1); for(let k = 0; k < w; k++) bag.push(i); });
    const seenIdx = new Set();
    const order = [];
    for(const i of _ambientShuffle(bag, rng)){ if(!seenIdx.has(i)){ seenIdx.add(i); order.push(i); } }
    let chosen = null, chosenKey = null;
    // Pass 0: Typ-Cooldown + heute-schon-genutzter Typ + Same-Player (heute UND
    //         letzte Tage) meiden → ideal frisch.
    // Pass 1: Typ-Cooldown gelockert, Same-Player (heute + letzte Tage) bleibt
    //         gesperrt → Namens-Rotation hat Vorrang vor Typ-Frische.
    // Pass 2: Notnagel — auch Same-Player erlaubt (falls nur der Platzhirsch
    //         überhaupt Templates befüllt), Typ-Sperre des Tages bleibt.
    // PFLICHT-SLOTS gehen vor: Ein Rückblick, der auf ein Datum gehört,
    // darf nicht vom Losverfahren abhängen. Trifft eine Pflicht-Bedingung
    // zu und liefert das Template ein Ergebnis, ist der Slot vergeben.
    let chosenPflicht = null, chosenPflichtKey = null;
    for(const t of templates){
      if(typeof t.pflicht !== 'function') continue;
      if(!t.pflicht(slot.dateKey, slot.slotHour)) continue;
      let res = null;
      try { res = t.make(_ambientRng(_ambientHash(slot.dateKey + '_p'))); } catch(e){ res = null; }
      if(res){ chosenPflicht = res; chosenPflichtKey = t.key; break; }
    }

    // Blickrichtung des Slots: 10:00 schaut nach vorn, 19:00 zurueck [§11.0].
    // In den ersten beiden Durchgaengen zaehlt sie, im dritten nicht mehr —
    // ein leerer Slot waere schlimmer als ein Fun Fact zur falschen Zeit.
    const rolle = _ambientRolleFuerSlot(slot.slotHour);
    // Vier Durchgaenge. Die Paar-Sperre (derselbe Fakt ueber dieselbe Person
    // hoechstens einmal im Monat) gilt in den ersten dreien; erst der vierte
    // laesst sie fallen, damit ein Slot nie leer bleibt. Vorher galt sie nur in
    // den ersten beiden, und der Notnagel-Durchgang schrieb genau die
    // Wiederholung, die sie verhindern soll.
    for(let pass = 0; pass < 4 && !chosen; pass++){
      for(const idx of order){
        const t = templates[idx];
        if(usedToday.has(t.key)) continue;
        if(pass === 0 && cooldownKeys.has(t.key)) continue;
        if(pass < 2 && (usedRubriken.has(rubrikVon(t.key)) || recentRubriken.has(rubrikVon(t.key)))) continue;
        if(pass < 2){
          const r = _ambientRolleVon(t.key);
          if(r && r !== rolle) continue;
        }
        let res = null;
        try { res = t.make(rng); } catch(e){ res = null; }
        if(!res) continue;
        const pids = pidsOf(res.dataRef);
        if(pass < 2){
          // Sowohl heute schon gefeierte (usedPids) als auch in den letzten
          // AMBIENT_PLAYER_COOLDOWN_DAYS Tagen gefeierte (recentPids) Köpfe meiden.
          if(pids.length && pids.some(p => usedPids.has(p) || recentPids.has(p))) continue;
        }
        // Derselbe Fakt über dieselbe Person nicht zweimal im Monat. Diese
        // Sperre haelt bis in den dritten Durchgang.
        if(pass < 3 && pids.length && pids.some(p => recentPaare.has(t.key + '|' + p))) continue;
        chosen = res; chosenKey = t.key; break;
      }
    }
    if(chosenPflicht){ chosen = chosenPflicht; chosenKey = chosenPflichtKey; }
    if(!chosen) continue;
    // Sofort in die Historie eintragen: der zweite fällige Slot desselben Tages
    // sieht diesen Eintrag und meidet Typ und Kopf — sonst zeigten 10 und 19 Uhr
    // dieselbe Zahl.
    history.push({day: slot.dateKey, ts: refMs, sub: chosenKey,
                  rubrik:rubrikVon(chosenKey), pids: pidsOf(chosen.dataRef)});

    out.push({
      id:    slotId,
      cat:   chosen.cat,
      ic:    chosen.ic,
      title: chosen.title,
      desc:  chosen.desc,
      when:  slot.when,
      // Niedrige Prio + KEIN limitierender dataRef.pid (nur ambientPid/-Pids),
      // damit ambiente Stories nicht vom Per-Player-Limit geschluckt werden.
      // Der Rang eines Templates (2 bis 7) ordnet nur den Fun-Fact-Topf
      // untereinander. Als blanke Zahl stand er auf derselben Skala wie eine
      // Pleitenserie und damit im falschen Band [§11.0a]; er wird deshalb
      // auf das Fun-Fact-Band abgebildet.
      prio:  STORY_PRIO.ambient
             + Math.max(0, Math.min(AMBIENT_PRIO_SPANNE, (chosen.prio || 4))),
      // v9.17: vv/vl = optionale Kennzahl für den Mini-Chip rechts auf der Karte
      // (_newsVisual). Fun Facts standen bisher als reiner Text im Feed, während
      // jede andere Story ihre Zahl groß anzeigt — die Kennzahl macht sie auf
      // einen Blick lesbar. Wandert in dataRef, damit sie mitpersistiert wird.
      dataRef: Object.assign({type:'ambient', sub: chosenKey, ambientRubrik:rubrikVon(chosenKey)},
                             chosen.dataRef || {},
                             chosen.vv != null ? {vv: String(chosen.vv), vl: chosen.vl || ''} : {})
    });
  }
  return out;
}

// FNV-1a-Hash → 32-bit Seed (deterministisch, schnell).
function _ambientHash(str){
  let h = 2166136261 >>> 0;
  for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
// mulberry32 PRNG → reproduzierbare Pseudo-Zufallszahlen [0,1).
function _ambientRng(seed){
  let a = seed >>> 0;
  return function(){
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Fisher-Yates mit geseedetem rng (verändert das Original nicht).
function _ambientShuffle(arr, rng){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// Template-Pool: jede make()-Funktion liefert {cat, ic, title, desc, prio?,
// dataRef?} aus ECHTEN Daten — oder null, wenn die Datenlage nicht reicht.
// Icons sind bewusst auf die in NEWS_CATEGORIES bekannten beschränkt.
function _ambientTemplatePool(now, pm, nameOf){
  const stats = (typeof allPlayerStats === 'function') ? (allPlayerStats() || {}) : {};
  const activePids = Object.keys(pm).filter(pid => pm[pid] && !pm[pid].hidden);
  const withStats = activePids.filter(pid => stats[pid] && stats[pid].games > 0);
  const T = [];

  // ── v9.13: Zeitbasierte "Form"-Aggregation der letzten 14 Tage ──
  // EINMALIG (lazy + memoisiert) über nur die jüngsten Matches. `matches` ist
  // aufsteigend nach created_at sortiert → wir laufen von hinten und brechen ab,
  // sobald ein Match älter als das Fenster ist (O(Fenster) statt O(alle)).
  // Positionen (atk/def), enge Spiele (Tordiff ≤ 2) und 1-Tor-Siege werden
  // gleich mitgezählt, damit ALLE Form-Templates diese eine Schleife teilen —
  // pro Pool-Aufbau wird sie höchstens einmal ausgeführt.
  const RECENT_DAYS = 14;
  let _recentMemo;
  const recentAgg = () => {
    if(_recentMemo) return _recentMemo;
    const cutoff = now.getTime() - RECENT_DAYS * 86400000;
    const agg = {};
    let count = 0;
    for(let i = matches.length - 1; i >= 0; i--){
      const m = matches[i];
      if(mts(m) < cutoff) break; // asc-sortiert → alles davor ist älter
      count++;
      const diff = Math.abs((m.score_a||0) - (m.score_b||0));
      const aWon = m.winner === 'A';
      const seats = [[m.a1, m.a1_pos, true], [m.a2, m.a2_pos, true], [m.b1, m.b1_pos, false], [m.b2, m.b2_pos, false]];
      for(const [id, pos, onA] of seats){
        if(!id || !pm[id] || pm[id].hidden) continue;
        const won = onA ? aWon : !aWon;
        const gf = onA ? (m.score_a||0) : (m.score_b||0);
        const ga = onA ? (m.score_b||0) : (m.score_a||0);
        let a = agg[id];
        if(!a) a = agg[id] = { g:0, w:0, aG:0, aGoals:0, aW:0, dG:0, dGa:0, cg:0, cw:0, c1w:0 };
        a.g++; if(won) a.w++;
        if(pos === 'atk'){ a.aG++; a.aGoals += gf; if(won) a.aW++; }
        else if(pos === 'def'){ a.dG++; a.dGa += ga; }
        if(diff <= 2){ a.cg++; if(won) a.cw++; }
        if(won && diff === 1) a.c1w++;
      }
    }
    _recentMemo = { agg, count };
    return _recentMemo;
  };
  // Deterministischer "Bester nach Metrik"-Picker (Gleichstand → kleinere pid).
  const _formPick = (elig, metric) => {
    let best = null;
    for(const pid of elig){
      const v = metric(pid);
      if(v == null) continue;
      if(!best || v > best.v || (v === best.v && pid < best.pid)) best = { pid, v };
    }
    return best;
  };

  // ── Fun Fact: Tore insgesamt ──
  // ── Fun Fact: die Tore der Liga ──
  // Vorher standen hier drei Karten: „Tor-Bilanz", „Kicker-Tag" und „Liga in
  // Zahlen". Der Kicker-Tag meldete, dass montags am meisten gespielt wird —
  // Montag IST der Spieltag, die Karte sagte also, dass die Liga ihren Termin
  // einhält. „Liga in Zahlen" nannte keinen Spieler und behauptete mit „und es
  // werden mehr" etwas über die Zukunft. Übrig bleibt eine Karte, die zwei
  // Zahlen verbindet: wie viele Tore fallen und wie eine Partie meistens ausgeht.
  T.push({ key:'fun_goals', make: () => {
    if(matches.length < 10) return null;
    let g = 0; const cnt = {};
    for(const m of matches){
      g += (m.score_a||0) + (m.score_b||0);
      const hi = Math.max(m.score_a||0, m.score_b||0), lo = Math.min(m.score_a||0, m.score_b||0);
      const k = hi + ':' + lo;
      cnt[k] = (cnt[k] || 0) + 1;
    }
    let bk = null, bn = 0;
    for(const k in cnt) if(cnt[k] > bn){ bn = cnt[k]; bk = k; }
    if(!bk) return null;
    return { cat:'fun', ic:'thriller', prio:3,
      title:`${g} Tore in ${matches.length} Partien`,
      desc:`Im Schnitt fallen ${komma(g/matches.length)} Tore pro Spiel. Am häufigsten endet eine Partie ${bk}, das war ${bn} Mal so.`,
      vv: g, vl:'Tore' };
  }});

  // ── Persönlich: Siegquoten-Führer (min. 5 Spiele) ──
  T.push({ key:'personal_wr', make: () => {
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(!elig.length) return null;
    elig.sort((a,b) => stats[b].wr - stats[a].wr);
    const pid = elig[0], st = stats[pid];
    return { cat:'personal', ic:'crown', prio:4,
      // v9.17: Der Filter ist „ab 5 Spielen" — das gehört auch in den Text,
      // sonst behauptet die News eine Liga-Bestmarke, die sie gar nicht prüft.
      title:`${nameOf(pid)} gewinnt einfach`,
      desc:`Beste Siegquote der Liga (ab 5 Spielen): ${Math.round(st.wr*100)}% aus ${st.games} Partien.`,
      vv: Math.round(st.wr*100)+'%', vl:'Siegquote',
      dataRef:{ ambientPid: pid } };
  }});

  // ── Persönlich: Vielspieler ──
  T.push({ key:'personal_grinder', make: () => {
    if(!withStats.length) return null;
    const pid = withStats.slice().sort((a,b) => stats[b].games - stats[a].games)[0];
    if(stats[pid].games < 10) return null;
    return { cat:'personal', ic:'medalTrio', prio:3,
      title:`${nameOf(pid)} ist Dauergast`,
      desc:`Niemand spielt mehr: ${stats[pid].games} Partien auf dem Konto.`,
      vv: stats[pid].games, vl:'Spiele',
      dataRef:{ ambientPid: pid } };
  }});

  // ── Persönlich: heißeste aktuelle Serie ──
  T.push({ key:'personal_streak', make: () => {
    if(!withStats.length) return null;
    const pid = withStats.slice().sort((a,b) => (stats[b].curStreak||0) - (stats[a].curStreak||0))[0];
    const cs = stats[pid].curStreak || 0;
    if(cs < 3) return null;
    return { cat:'personal', ic:'trendUp', prio:5,
      title:`${nameOf(pid)} läuft heiß`,
      desc:`${cs} Siege in Folge. Aktuell die heißeste Serie der Liga.`,
      vv: cs+'×', vl:'in Folge',
      dataRef:{ ambientPid: pid } };
  }});

  // ── Persönlich: die meisten eigenen Tore je Partie ──
  //    „Ø 8,7 Tore pro Spiel. Bestwert der Liga" stand hier, und drei Spieler
  //    lagen gemessen bei 8,7 — die Karte kürte stillschweigend den ersten der
  //    Sortierung. „Der Torjäger" gehört daneben Leon und misst die Tore je
  //    STURMSPIEL: zwei Bestwerte für fast dieselbe Frage, mit zwei Antworten.
  //    Gerechnet wird deshalb über den Rekord [§C27], und bei Gleichstand
  //    stehen alle Halter da.
  T.push({ key:'personal_scorer', make: () => {
    const rank = _rekRang('sniper');
    if(!rank.length) return null;
    const lead = _rekSpitze(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1){
      return { cat:'personal', ic:'ball', prio:3,
        title:`Gleichstand im Torrausch`,
        desc:`${_namesOf(lead)} treffen je ${komma(top.wert)} mal je Sturmspiel. Näher kommt niemand.`,
        vv: komma(top.wert), vl:'Ø Tore',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel' } };
    }
    return { cat:'personal', ic:'ball', prio:3,
      title:`${nameOf(top.pid)} trifft am laufenden Band`,
      desc: nxt
        ? `${_evSatz(top.ev)}. Bestwert der Liga, ${nameOf(nxt.pid)} folgt mit ${komma(nxt.wert)}.`
        : `${_evSatz(top.ev)}. Bestwert der Liga.`,
      vv: komma(top.wert), vl:'Ø Tore',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Rivalität: meistgespieltes Duell ──
  T.push({ key:'rivalry_most', make: () => {
    const map = (typeof _ensureH2HMap === 'function') ? _ensureH2HMap() : null;
    if(!map || !map.size) return null;
    let best = null;
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!pm[pa] || !pm[pb] || pm[pa].hidden || pm[pb].hidden) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 3) continue;
      if(!best || total > best.total) best = { pa, pb, total, wa, wb };
    }
    if(!best) return null;
    return { cat:'rivalry', ic:'crossedSwords', prio:4,
      title:`Duell der Liga: ${nameOf(best.pa)} vs ${nameOf(best.pb)}`,
      desc:`${best.total} direkte Duelle. Siege: ${nameOf(best.pa)} ${best.wa}, ${nameOf(best.pb)} ${best.wb}.`,
      vv: best.total, vl:'Duelle',
      dataRef:{ ambientPids:[best.pa, best.pb], pairKind:'duel' } };
  }});

  // ── Rivalität: engste Bilanz (min. 4) ──
  T.push({ key:'rivalry_close', make: () => {
    const map = (typeof _ensureH2HMap === 'function') ? _ensureH2HMap() : null;
    if(!map || !map.size) return null;
    let best = null;
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!pm[pa] || !pm[pb] || pm[pa].hidden || pm[pb].hidden) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 4) continue;
      const diff = Math.abs(wa - wb);
      if(!best || diff < best.diff || (diff === best.diff && total > best.total)) best = { pa, pb, wa, wb, total, diff };
    }
    if(!best) return null;
    return { cat:'rivalry', ic:'crossedSwords', prio:4,
      title:`Kopf-an-Kopf: ${nameOf(best.pa)} und ${nameOf(best.pb)}`,
      // Zwischen den beiden Zahlen stand ein Halbgeviertstrich, und der ist in
      // einem Satz ein Gedankenstrich und kein Bilanzstrich. Die Bilanz steht
      // jetzt als Doppelpunkt-Paar da, wie ueberall sonst in der App.
      desc:`${best.total} direkte Duelle, ${best.diff === 0 ? 'absolut ausgeglichen' : 'nur ' + best.diff + ' Sieg' + (best.diff === 1 ? '' : 'e') + ' Unterschied'}. ${best.diff === 0 ? `Es steht ${best.wa}:${best.wb}.` : `Es steht ${Math.max(best.wa, best.wb)}:${Math.min(best.wa, best.wb)} für ${nameOf(best.wa > best.wb ? best.pa : best.pb)}.`}`,
      vv: best.wa+':'+best.wb, vl:'Bilanz',
      dataRef:{ ambientPids:[best.pa, best.pb], pairKind:'duel' } };
  }});

  // ── Historie: Liga-Alter ──
  // ── Historie: das Jubiläum ──
  // Hieß „Die Liga lebt" und zählte den Kalender: die Zahl wuchs jeden Tag um
  // eins und war an keinem Tag eine Nachricht. Jetzt meldet sich die Karte nur
  // zu einer runden Zahl, und dann sagt sie, wer sie gespielt hat.
  T.push({ key:'history_age', make: () => {
    if(matches.length < 50) return null;
    const stufe = matches.length >= 1000 ? 500 : matches.length >= 300 ? 100 : 50;
    const marke = Math.floor(matches.length / stufe) * stufe;
    if(matches.length - marke > 5) return null;   // nur frisch nach der Marke
    const mObj = matches[marke - 1];
    if(!mObj) return null;
    const sieger = (mObj.winner === 'A' ? [mObj.a1, mObj.a2] : [mObj.b1, mObj.b2])
      .filter(id => pm[id] && !pm[id].hidden).map(nameOf);
    const d = new Date(mObj.created_at);
    const dd = String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.';
    return { cat:'history', ic:'calendar', prio:5,
      title:`Die ${marke}. Partie der Liga`,
      desc: sieger.length
        ? `Gespielt am ${dd}, gewonnen von ${sieger.join(' und ')} mit ${mObj.score_a}:${mObj.score_b}.`
        : `Gespielt am ${dd}, Endstand ${mObj.score_a}:${mObj.score_b}.`,
      vv: marke, vl:'Partien' };
  }});

  // ── Fun Fact: Torschützenkönig (meiste Karriere-Tore, v8.8) ──
  // v9.17: Der Mindestspiele-Filter ist hier raus. Die Aussage lautet „kein
  // Spieler hat mehr erzielt" — eine Gesamtsumme braucht keine Mindestanzahl,
  // und mit Filter wäre der Satz streng genommen nicht belegt.
  T.push({ key:'fun_top_scorer', make: () => {
    const elig = withStats.filter(pid => stats[pid].gf > 0);
    if(!elig.length) return null;
    const sorted = elig.slice().sort((a,b) => stats[b].gf - stats[a].gf);
    const pid = sorted[0];
    const runnerUp = sorted[1] ? stats[pid].gf - stats[sorted[1]].gf : null;
    return { cat:'personal', ic:'thriller', prio:3,
      title:`${nameOf(pid)} ist Torschützenkönig`,
      desc: runnerUp != null
        ? `${stats[pid].gf} Tore insgesamt. ${runnerUp} mehr als ${nameOf(sorted[1])} dahinter.`
        : `${stats[pid].gf} Tore insgesamt. Kein Spieler hat mehr erzielt.`,
      vv: stats[pid].gf, vl:'Tore',
      dataRef:{ ambientPid: pid } };
  }});

  // ── Fun Fact: aktueller Spitzenreiter (Elo-#1, v8.8) ──
  // v9.17 KONSISTENZ: Der Spitzenreiter kam aus getGlobalSim().elo, gefiltert
  // nach KARRIERE-Spielen ≥3. Die Rangliste (§5.1) zeigt dagegen die
  // SAISON-Tabelle aus periodPlayerStats('season') — wer in der laufenden Saison
  // noch nicht gespielt hat, steht dort gar nicht drin. Direkt nach einem
  // Saison-Reset stehen zudem alle auf dem Startwert, und die News kürte einen
  // beliebigen „Spitzenreiter" mit 0 Punkten Vorsprung. Jetzt dieselbe Quelle
  // und dieselbe Sortierung wie die Rangliste — eine Wahrheit, keine Abweichung.
  T.push({ key:'fun_leader', make: () => {
    if(typeof periodPlayerStats !== 'function') return null;
    const ranked = periodPlayerStats('season')
      .filter(r => pm[r.id] && !pm[r.id].hidden)
      .slice()
      .sort((a,b) => b.elo - a.elo || b.wins - a.wins);
    if(ranked.length < 2) return null;
    const lead = ranked[0].elo - ranked[1].elo;
    if(lead <= 0) return null; // Gleichstand an der Spitze → kein „thront"
    return { cat:'personal', ic:'crown', prio:4,
      title:`${nameOf(ranked[0].id)} thront an der Spitze`,
      desc:`${ranked[0].elo} Elo in dieser Saison. ${lead} Punkte vor ${nameOf(ranked[1].id)}.`,
      vv: ranked[0].elo, vl:'Elo',
      dataRef:{ ambientPid: ranked[0].id } };
  }});

  // ── Fun Fact: höchster Sieg aller Zeiten (v8.8) ──
  T.push({ key:'fun_biggest_win', make: () => {
    if(matches.length < 5) return null;
    let best = null;
    for(const m of matches){
      const hi = Math.max(m.score_a||0, m.score_b||0), lo = Math.min(m.score_a||0, m.score_b||0);
      const diff = hi - lo;
      if(!best || diff > best.diff) best = {diff, hi, lo, m};
    }
    if(!best || best.diff < 6) return null;
    const dt = new Date(best.m.created_at);
    return { cat:'fun', ic:'thriller', prio:3,
      title:'Klarste Klatsche der Liga',
      desc:`Höchster Sieg aller Zeiten: ${best.hi}:${best.lo} am ${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.`,
      vv: best.hi+':'+best.lo, vl:'Rekord' };
  }});

  // ── Fun Fact: aktivster Spieltag (v8.8) ──
  T.push({ key:'fun_busiest_day', make: () => {
    if(matches.length < 8) return null;
    const byDay = {};
    for(const m of matches){
      const dk = tagKey(m.created_at);
      byDay[dk] = (byDay[dk] || 0) + 1;
    }
    let bk = null, bn = 0;
    for(const dk in byDay){ if(byDay[dk] > bn){ bn = byDay[dk]; bk = dk; } }
    if(bn < 5) return null;
    const p = bk.split('-');
    return { cat:'fun', ic:'calendar', prio:2,
      title:'Rekord-Spieltag',
      desc:`Meiste Spiele an einem Tag: ${bn} Partien am ${p[2]}.${p[1]}.${p[0]}.`,
      vv: bn, vl:'Spiele' };
  }});

  // ══ Neue lebendige Fun Facts (v9.1) ══
  const _gsim = () => (typeof getGlobalSim === 'function') ? (getGlobalSim() || {}) : {};

  // ── Fun Fact: Random Top-1 eines Awards/Rankings ──
  T.push({ key:'fun_award_leader', make: (rng) => {
    const career = _gsim().careerElo || {};
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(elig.length < 2) return null;
    // v9.17: Kumulative Kennzahlen (Siege, Tore, Tordifferenz) werden über ALLE
    // Spieler mit Spielen ermittelt — eine Gesamtsumme braucht keine
    // Mindestanzahl. Nur die Karriere-Elo (eine Wertung, keine Summe) behält den
    // 5-Spiele-Filter, und der steht dann auch im Text.
    const cats = [
      { noun:'Meiste Siege',         ic:'trophy',  pool:withStats, val: pid => stats[pid].wins,               fmt: v => v+' Siege' },
      { noun:'Bestes Torverhältnis', ic:'chartUp', pool:withStats, val: pid => stats[pid].gf - stats[pid].ga, fmt: v => (v>0?'+':'')+v+' Tordifferenz' },
      { noun:'Meiste Tore',          ic:'ball',    pool:withStats, val: pid => stats[pid].gf,                 fmt: v => v+' Tore' },
      { noun:'Höchste Karriere-Elo', ic:'crown',   pool:elig,      val: pid => Math.round(career[pid]||0),    fmt: v => v+' Elo', qual:' (ab 5 Spielen)' },
    ];
    const c = cats[Math.floor(rng()*cats.length)];
    let best = null, second = null;
    for(const pid of c.pool){
      const v = c.val(pid);
      if(best === null || v > best.v){ second = best; best = {pid, v}; }
      else if(second === null || v > second.v){ second = {pid, v}; }
    }
    if(!best) return null;
    // Bei Gleichstand führt niemand allein. Der Vergleich schob den zweiten
    // Spieler mit DEMSELBEN Wert in den Else-Zweig, und die Karte las sich als
    // „221 Siege. Liga-Bestwert, vor Martin mit 221 Siegen" — ein Bestwert und
    // sein Gleichstand in einem Satz.
    if(second && second.v === best.v) return null;
    return { cat:'personal', ic:c.ic, prio:5,
      title:`${c.noun}: ${nameOf(best.pid)} führt`,
      desc: second
        ? `${c.fmt(best.v)}. Liga-Bestwert${c.qual||''}, vor ${nameOf(second.pid)} mit ${c.fmt(second.v)}.`
        : `${nameOf(best.pid)} hält den Liga-Bestwert${c.qual||''}. ${c.fmt(best.v)}.`,
      vv: best.v, vl: c.noun.replace(/^(Meiste|Bestes|Höchste)\s+/, ''),
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Fun Fact: Random Stat zu random Spieler ──
  // v9.11: bewusst höher gewichtet (weight 3) + kürzerer Cooldown (3 statt 7
  // Tage). Dieser Typ hat die größte inhaltliche Variabilität (zufälliger
  // Spieler × zufällige Kennzahl), darf also vergleichsweise öfter kommen, ohne
  // zu langweilen — Standard-Cooldown wäre sonst die harte Frequenz-Obergrenze.
  T.push({ key:'fun_random_stat', weight:3, cooldown:3, make: (rng) => {
    const elig = withStats.filter(pid => stats[pid].games >= 5);
    if(!elig.length) return null;
    const pid = elig[Math.floor(rng()*elig.length)];
    const st = stats[pid];
    // Vorher zog diese Karte eine BELIEBIGE Kennzahl: „Henry gewinnt 39 %
    // seiner Spiele" stand als Nachricht im Feed und sagte ihrem Helden, dass
    // er unterdurchschnittlich ist. Eine Meldung über einen Spieler soll ihn
    // belohnen — gesucht wird deshalb die Kennzahl, in der er am WEITESTEN
    // vorne steht, und genannt wird sein Platz darin.
    const felder = [
      {n:'Partien',          v:p2 => stats[p2].games,                        fmt:v => `${v} Partien`},
      {n:'Siegen',           v:p2 => stats[p2].wins,                         fmt:v => `${v} Siege`},
      {n:'erzielten Toren',  v:p2 => stats[p2].gf,                           fmt:v => `${v} Tore`},
      {n:'der Siegquote',    v:p2 => stats[p2].games ? stats[p2].wins/stats[p2].games : 0,
                             fmt:v => `${Math.round(v*100)} % Siegquote`},
      {n:'Toren je Partie',  v:p2 => stats[p2].games ? stats[p2].gf/stats[p2].games : 0,
                             fmt:v => `${komma(v)} Tore je Partie`},
    ];
    let bestes = null;
    felder.forEach(f => {
      const reihe = elig.slice().sort((x, y) => f.v(y) - f.v(x));
      const platz = reihe.indexOf(pid) + 1;
      if(!platz) return;
      if(!bestes || platz < bestes.platz) bestes = {f, platz, wert:f.v(pid), von:reihe.length};
    });
    if(!bestes) return null;
    return { cat:'personal', ic:'chartBar', prio:4,
      title: bestes.platz === 1
        ? `${nameOf(pid)} führt die Liga bei ${bestes.f.n} an`
        : `${nameOf(pid)} ist Nummer ${bestes.platz} bei ${bestes.f.n}`,
      desc:`${bestes.f.fmt(bestes.wert)}. Platz ${bestes.platz} von ${bestes.von}. `
         + `Das ist die Kennzahl, in der ${nameOf(pid)} am weitesten vorne steht.`,
      // „1 Platz" las sich wie eine Anzahl. Ein Rang heisst „Platz 1".
      vv: 'Platz ' + bestes.platz, vl:'von ' + (bestes.von || ''),
      dataRef:{ ambientPid: pid } };
  }});

  // ── Fun Fact: Platzierung in der ewigen Gesamt-Rangliste (random Spieler) ──
  // ── Gestrichen: „X auf Platz 12 von 12" ──
  // Der Typ zog einen zufälligen Spieler aus der Rangliste und nannte seinen
  // Platz. Bei zwölf Spielern traf das regelmäßig den Letzten, und eine Karte
  // über einen Spieler soll ihn belohnen. Die Kennzahl, in der jemand am
  // weitesten vorne steht, sucht `fun_random_stat`.

  // ── Fun Fact: längste gemeinsame Team-Serie ──
  // v9.17 FORMULIERUNG: Hieß pauschal „Rekord-Duo", zog aber ein ZUFÄLLIGES Duo
  // mit ≥3 gemeinsamen Siegen in Serie — das ist per Definition kein Rekord und
  // „einer der besten Läufe der Liga" war schlicht ungeprüft. Jetzt wird die
  // Bestmarke der Liga mitberechnet: nur das tatsächlich führende Duo heißt
  // „Rekord-Duo", alle anderen bekommen eine ehrliche Einordnung (Platz + Abstand
  // zur Bestmarke). Die Zufallsauswahl bleibt — sie sorgt für die Abwechslung.
  T.push({ key:'fun_team_record', make: (rng) => {
    const rec = {}; // teamKey → {ids, best, cur}
    for(const m of matches){
      const sides = [[m.a1,m.a2,m.winner==='A'],[m.b1,m.b2,m.winner==='B']];
      for(const [x,y,won] of sides){
        if(!x || !y) continue;
        const ids = [x,y].sort(), k = ids.join('|');
        if(!rec[k]) rec[k] = {ids, best:0, cur:0};
        rec[k].cur = won ? rec[k].cur + 1 : 0;
        if(rec[k].cur > rec[k].best) rec[k].best = rec[k].cur;
      }
    }
    const cands = Object.values(rec).filter(t =>
      t.best >= 3 && pm[t.ids[0]] && pm[t.ids[1]] && !pm[t.ids[0]].hidden && !pm[t.ids[1]].hidden);
    if(!cands.length) return null;
    // Bestmarke + Rang aus derselben Liste — keine zweite Berechnung.
    const ranked = cands.slice().sort((a,b) => b.best - a.best || (a.ids[0] < b.ids[0] ? -1 : 1));
    const topBest = ranked[0].best;
    // Gezogen wird aus dem vorderen Drittel, nicht aus allen. Gleichverteilt
    // ueber das Feld stand „Eingespielt: Martin & Stefan" ueber einem Duo auf
    // Platz 24 von 24 — eine Karte, die einen Spieler feiert und ihm dabei
    // sagt, dass er Letzter ist [§C33].
    const feld = ranked.slice(0, Math.max(3, Math.ceil(ranked.length / 3)));
    const t = feld[Math.floor(rng()*feld.length)] || feld[0];
    const rank = ranked.findIndex(x => x.ids[0] === t.ids[0] && x.ids[1] === t.ids[1]) + 1;
    const isRecord = t.best === topBest;
    const nm = `${nameOf(t.ids[0])} und ${nameOf(t.ids[1])}`;
    return { cat:'team', ic:'unstoppable', prio:isRecord ? 5 : 4,
      title: isRecord ? `Rekord-Duo: ${nm}` : `Eingespielt: ${nm}`,
      desc: isRecord
        ? `${t.best} gemeinsame Siege in Serie. Kein Duo der Liga war je länger unschlagbar.`
        : `${t.best} gemeinsame Siege in Serie. Das ist Platz ${rank} von ${ranked.length} Duos, `
          + `nur ${topBest - t.best} hinter der Bestmarke.`,
      vv: t.best, vl:'in Serie',
      dataRef:{ ambientPids:[t.ids[0], t.ids[1]], pairKind:'team' } };
  }});

  // ══ Zeitbasierte Form-Fakten (v9.13) — Momentaufnahme der letzten 14 Tage ══
  // Diese Typen leben von der aktuellen Form: das Fenster rollt täglich weiter,
  // die Bestenlisten ändern sich also von allein und bringen Abwechslung — ein
  // Mittelfeldspieler kann kurzfristig heiß laufen, auch wenn seine Karriere-Werte
  // unauffällig sind. Alle teilen recentAgg() (eine einzige Schleife, s.o.) und
  // greifen auf bereits vorhandene Konventionen zurück (Positionen atk/def,
  // enge Spiele Tordiff ≤ 2 = wie Clutch-Award, 1-Tor-Sieg = Zittersieg).

  // ── Beste Siegquote der letzten 14 Tage ──
  T.push({ key:'form_best_wr', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].g >= 4);
    const best = _formPick(elig, id => agg[id].w / agg[id].g);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'trendUp', prio:5,
      title:`${nameOf(best.pid)} ist in Topform`,
      desc:`Beste Siegquote der letzten 14 Tage: ${Math.round(best.v*100)}% aus ${a.g} Spielen.`,
      vv: Math.round(best.v*100)+'%', vl:'14 Tage',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Aktuell bester Stürmer (Ø Tore + Siegquote im Sturm, letzte 14 Tage) ──
  T.push({ key:'form_striker', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].aG >= 3);
    const best = _formPick(elig, id => agg[id].aGoals / agg[id].aG);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    const wrAtk = Math.round(a.aW / a.aG * 100);
    return { cat:'personal', ic:'bolt', prio:5,
      title:`${nameOf(best.pid)} ist der Sturm-Chef`,
      desc:`Bester Stürmer der letzten 14 Tage: Ø ${komma(best.v)} Tore und ${wrAtk}% Siege im Sturm.`,
      vv: komma(best.v), vl:'Ø Tore',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Aktuell bester Abwehrspieler (wenigste Gegentore als Abwehr, 14 Tage) ──
  T.push({ key:'form_defender', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].dG >= 3);
    // Wenigste Gegentore/Spiel = am besten → Negativ-Metrik maximieren.
    const best = _formPick(elig, id => -(agg[id].dGa / agg[id].dG));
    if(!best) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'shieldCheck', prio:5,
      title:`${nameOf(best.pid)} macht die Bude dicht`,
      desc:`Hinten kommt kaum etwas durch: ${komma(a.dGa/a.dG)} Gegentore im Schnitt aus ${a.dG} Spielen in der Abwehr, gerechnet über die letzten 14 Tage.`,
      vv: komma(a.dGa/a.dG), vl:'Ø Gegentore',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Clutch: höchste Siegquote in engen Spielen (Tordiff ≤ 2, 14 Tage) ──
  T.push({ key:'form_clutch', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].cg >= 3);
    const best = _formPick(elig, id => agg[id].cw / agg[id].cg);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'target', prio:5,
      title:`${nameOf(best.pid)} hat Nerven aus Stahl`,
      desc:`Gewinnt aktuell ${Math.round(best.v*100)}% der engen Spiele (Tordiff ≤ 2). ${a.cw} von ${a.cg} in 14 Tagen.`,
      vv: Math.round(best.v*100)+'%', vl:'eng gewonnen',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Knappe Siege: höchster Anteil 1-Tor-Siege an allen Spielen (14 Tage) ──
  T.push({ key:'form_close_wins', make: () => {
    const { agg, count } = recentAgg();
    if(count < 6) return null;
    const elig = Object.keys(agg).filter(id => agg[id].g >= 4 && agg[id].c1w >= 2);
    const best = _formPick(elig, id => agg[id].c1w / agg[id].g);
    if(!best || best.v <= 0) return null;
    const a = agg[best.pid];
    return { cat:'personal', ic:'nerves', prio:4,
      title:`${nameOf(best.pid)} zittert sich durch`,
      // „12 % ALLER Spiele der letzten 14 Tage" stand da, gerechnet war
      // aber der Anteil an den Partien DIESES Spielers — die Zahl gehoerte
      // dem Helden, der Satz der Liga. Und die Stichprobe gehoert zur
      // Aussage: „x von y", nicht nur der Anteil [§C37].
      desc:`${a.c1w} von ${a.g} Partien der letzten 14 Tage gewann `
        + `${nameOf(best.pid)} mit einem Tor Unterschied, das sind `
        + `${Math.round(best.v*100)} %.`,
      vv: a.c1w, vl:'Zittersiege',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ── Aktivster Spieler der letzten 14 Tage ──
  T.push({ key:'form_most_active', make: () => {
    const { agg, count } = recentAgg();
    if(count < 8) return null;
    const best = _formPick(Object.keys(agg), id => agg[id].g);
    if(!best || best.v < 4) return null;
    return { cat:'personal', ic:'medalTrio', prio:3,
      title:`${nameOf(best.pid)} gibt Vollgas`,
      desc:`Aktivster Spieler der letzten 14 Tage: ${best.v} Partien in zwei Wochen.`,
      vv: best.v, vl:'Spiele',
      dataRef:{ ambientPid: best.pid } };
  }});

  // ══ Award-Fokus (v9.17) ═══════════════════════════════════════════════
  // Wunsch: die Top-1-Spieler der Auszeichnungen sollen in den 10-und-19-Uhr-
  // News deutlich öfter vorkommen. Diese Typen sind darum höher gewichtet
  // (weight 2) — der Spieler-Cooldown (AMBIENT_PLAYER_COOLDOWN_DAYS) sorgt
  // weiterhin dafür, dass nicht tagelang derselbe Kopf gefeiert wird.
  //
  // WICHTIG: Alle Zahlen kommen aus den BESTEHENDEN Zählern (countDayWins,
  // countPeriodWins, getCachedBadges/rarityOf) — exakt die Werte, die auch im
  // Spielerprofil und im Auszeichnungen-Sheet stehen. Keine zweite Berechnung,
  // also auch keine Abweichung.

  // Kleiner Helfer: Rangliste über einen Award-Zähler, absteigend, Gleichstand
  // deterministisch nach pid. Liefert [{pid, v}] ohne Nullwerte.
  const _awardRank = (pids, val) => pids
    .map(pid => ({ pid, v: val(pid) || 0 }))
    .filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v || (a.pid < b.pid ? -1 : 1));
  // Bei Gleichstand an der Spitze darf kein Einzelner als Bestwert-Halter
  // ausgerufen werden („Bestwert, X folgt mit 3" bei 3:3 liest sich falsch).
  // Liefert alle Spieler mit dem Höchstwert.
  const _awardLeaders = rank => rank.filter(x => x.v === rank[0].v);
  // Die Aufzaehlung hat die App schon (`_namenListe`, §C27). Hier stand eine
  // zweite mit „&" dazwischen, und das Zeichen gehoert in eine Tabellenzelle,
  // nicht in einen Satz: „Leon & Martin liegen gleichauf" war die einzige
  // Stelle im Feed, die zwei Namen nicht ausschrieb [§C33].
  const _namesOf = arr => _namenListe(arr.map(x => nameOf(x.pid)));

  // ── Eine Führung ist die des REKORDS, nicht die der Anzahl [§C35] ──
  // „Leon ist der Tageskönig · 17× Spieler des Tages. Mehr als alle anderen"
  // stand im Feed, während „Der Platzhirsch" Julian gehört: Leon hat 17 von
  // 54 eigenen Spieltagen gewonnen (31 %), Julian 12 von 23 (52 %). Die Karte
  // kürte damit den, der am meisten dabei war, und widersprach dem
  // Rekorde-Reiter derselben App. Gemessen wird überall der Anteil und nicht
  // die Anzahl, sonst hält den Rekord, wer am meisten spielt.
  // Gerechnet wird deshalb nicht neu: `chronicleRang` ist die Reihenfolge,
  // die auch das Rekord-Blatt zeigt [§C27]. Zwei Rechnungen über dieselbe
  // Frage nennen irgendwann zwei verschiedene Beste.
  const _rekRang = (cid) => {
    if(typeof chronicleRang !== 'function') return [];
    try { return chronicleRang(cid) || []; } catch(e){ return []; }
  };
  // Alle, die den Bestwert punktgleich halten. Bei Gleichstand darf kein
  // Einzelner als Halter ausgerufen werden.
  const _rekSpitze = (r) => r.filter(x => x.wert === r[0].wert);

  // ── Award: der höchste Anteil gewonnener eigener Spieltage ──
  //    Dasselbe Maß wie „Der Platzhirsch" [§C35], aus derselben Reihenfolge.
  T.push({ key:'award_potd_leader', weight:2, make: () => {
    const rank = _rekRang('daylord');
    if(!rank.length) return null;
    const lead = _rekSpitze(rank), top = rank[0], nxt = rank[lead.length];
    const pct = x => Math.round(x.wert * 100) + ' %';
    if(lead.length > 1){
      return { cat:'badge', ic:'trophyDay', prio:5,
        title:`Kopf-an-Kopf um die Spieltage`,
        desc:`${_namesOf(lead)} beherrschen je ${pct(top)} der eigenen Spieltage.`,
        vv: pct(top), vl:'Spieltage',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel' } };
    }
    return { cat:'badge', ic:'trophyDay', prio:5,
      title:`${nameOf(top.pid)} ist der Tageskönig`,
      // Der Beleg des Rekords nennt Anteil UND Anzahl, und er steht an einer
      // Stelle. Vorher stand hier nur die Anzahl, und die gehört dem, der am
      // meisten dabei war.
      desc: nxt
        ? `${_evSatz(top.ev)}. Bestwert der Liga, ${nameOf(nxt.pid)} folgt mit ${pct(nxt)}.`
        : `${_evSatz(top.ev)}. Bisher hat das sonst niemand geschafft.`,
      vv: pct(top), vl:'Spieltage',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Der alte Zähler-Weg, nur noch für die Auszeichnungs-Vitrine ──
  T.push({ key:'award_potd_zahl', weight:1, make: () => {
    if(typeof countDayWins !== 'function') return null;
    const rank = _awardRank(activePids, pid => countDayWins(pid, matches));
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1){
      return { cat:'badge', ic:'trophyDay', prio:4,
        title:`Kopf-an-Kopf um die Tagessiege`,
        desc:`${_namesOf(lead)} stehen gleichauf bei je ${top.v}× Spieler des Tages.`,
        vv: top.v + '×', vl:'Tagessiege',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel' } };
    }
    // Hier steht bewusst KEIN „Bestwert der Liga": die Anzahl ist eine
    // Sammlung und keine Bestmarke, und der Rekord darauf misst den Anteil.
    return { cat:'badge', ic:'trophyDay', prio:4,
      title:`${nameOf(top.pid)} sammelt Tagessiege`,
      desc: nxt
        ? `${top.v}× Spieler des Tages, so oft wie sonst niemand. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`
        : `${top.v}× Spieler des Tages. Bislang der Einzige mit diesem Titel.`,
      vv: top.v + '×', vl:'Tagessiege',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Award: der höchste Anteil gewonnener eigener Wochen ──
  //    Dasselbe Maß wie „Der Wochenherr" [§C35], aus derselben Reihenfolge.
  //    „Leon beherrscht die Wochen · 6× Spieler der Woche. Bestwert der Liga"
  //    stand im Feed, und der Rekord gehörte Julian: Leon hat 4 von 15 eigenen
  //    Wochen gewonnen, Julian 4 von 13. Die Anzahl gehört dem, der öfter
  //    dabei war.
  T.push({ key:'award_potw_leader', weight:2, make: () => {
    const rank = _rekRang('weeklord');
    if(!rank.length) return null;
    const lead = _rekSpitze(rank), top = rank[0], nxt = rank[lead.length];
    const pct = x => Math.round(x.wert * 100) + ' %';
    if(lead.length > 1){
      return { cat:'badge', ic:'weekKing', prio:5,
        title:`Geteilte Macht über die Wochen`,
        desc:`${_namesOf(lead)} liegen gleichauf: je ${pct(top)} der eigenen Wochen gewonnen.`,
        vv: pct(top), vl:'Wochen',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel' } };
    }
    return { cat:'badge', ic:'weekKing', prio:5,
      title:`${nameOf(top.pid)} beherrscht die Wochen`,
      desc: nxt
        ? `${_evSatz(top.ev)}. Bestwert der Liga, ${nameOf(nxt.pid)} folgt mit ${pct(nxt)}.`
        : `${_evSatz(top.ev)}. Bisher hat das sonst niemand geschafft.`,
      vv: pct(top), vl:'Wochen',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Der Zähler daneben: eine Sammlung, keine Bestmarke ──
  T.push({ key:'award_potw_zahl', weight:1, make: () => {
    if(typeof countPeriodWins !== 'function') return null;
    const rank = _awardRank(activePids, pid => countPeriodWins(pid, matches, 'week'));
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1) return null;   // Gleichstand → das sagt die Anteilskarte
    return { cat:'badge', ic:'weekKing', prio:4,
      title:`${nameOf(top.pid)} sammelt Wochensiege`,
      desc: nxt
        ? `${top.v}× Spieler der Woche, so oft wie sonst niemand. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`
        : `${top.v}× Spieler der Woche. Bisher hat das sonst niemand geschafft.`,
      vv: top.v + '×', vl:'Wochensiege',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Award: meiste goldene Auszeichnungen ──
  T.push({ key:'award_gold_leader', weight:2, make: () => {
    if(typeof getCachedBadges !== 'function' || typeof rarityOf !== 'function') return null;
    const goldOf = pid => getCachedBadges(pid).filter(b => rarityOf(b.id) === 'legendary').length;
    const rank = _awardRank(activePids, goldOf);
    if(!rank.length) return null;
    const lead = _awardLeaders(rank), top = rank[0];
    if(lead.length > 1){
      return { cat:'badge', ic:'trophyStar', prio:6,
        title:`Wettrüsten in Gold`,
        desc:`${_namesOf(lead)} halten je ${top.v} goldene ${top.v === 1 ? 'Auszeichnung' : 'Auszeichnungen'}. Niemand hat mehr.`,
        vv: top.v, vl:'Gold',
        dataRef:{ ambientPids: lead.slice(0,2).map(x=>x.pid), pairKind:'duel' } };
    }
    const gold = getCachedBadges(top.pid).filter(b => rarityOf(b.id) === 'legendary');
    const names = gold.map(b => b.name);
    return { cat:'badge', ic:'trophyStar', prio:6,
      title:`${nameOf(top.pid)} sammelt Gold`,
      desc:`${top.v} goldene ${top.v === 1 ? 'Auszeichnung' : 'Auszeichnungen'}. ${names.join(', ')}.`,
      vv: top.v, vl:'Gold',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ── Award: die zuletzt vergebene goldene Auszeichnung ──
  T.push({ key:'award_latest_gold', weight:2, make: () => {
    if(typeof getBadgeEarnedCache !== 'function' || typeof rarityOf !== 'function') return null;
    const bMap = getBadgeEarnedCache();
    // Match-Index einmal aufbauen statt pro Badge-Event über alle Matches zu
    // suchen (O(Badges × Matches) → O(Matches + Badges)).
    const byId = new Map();
    for(const mm of matches) byId.set(mm.id, mm);
    let latest = null;
    for(const mid in bMap){
      const mObj = byId.get(mid);
      if(!mObj) continue;
      const t = mts(mObj);
      for(const ev of (bMap[mid] || [])){
        if(rarityOf(ev.badge.id) !== 'legendary') continue;
        if(!pm[ev.playerId] || pm[ev.playerId].hidden) continue;
        // ── Ein Fun Fact weiss nichts von einer spaeteren Partie ──
        // `now` ist die Uhrzeit des Slots, `matches` aber die ganze Liste.
        // Die Karte von 10 Uhr sah damit eine Auszeichnung aus einer Partie
        // um 11:39 und rechnete „vor -1 Tagen".
        if(t > now.getTime()) continue;
        if(!latest || t > latest.t) latest = { t, pid: ev.playerId, badge: ev.badge, mid };
      }
    }
    if(!latest) return null;
    const days = Math.floor((now.getTime() - latest.t) / 86400000);
    return { cat:'badge', ic: latest.badge.ic || 'trophyStar', prio:5,
      title:`${nameOf(latest.pid)} holte zuletzt Gold`,
      desc:`Die Auszeichnung „${latest.badge.name}" ${days === 0 ? 'heute' : days === 1 ? 'gestern' : 'vor ' + days + ' Tagen'}. ${latest.badge.desc}.`,
      // Ohne Wert blieb der grosse Block der Karte leer [§6].
      vv:String(days === 0 ? 'heute' : days === 1 ? 'gestern' : days),
      vl:days > 1 ? 'Tage her' : 'geholt',
      dataRef:{ ambientPid: latest.pid } };
  }});

  // ── Award: die meisten Auszeichnungen insgesamt ──
  T.push({ key:'award_total_leader', make: () => {
    if(typeof getCachedBadges !== 'function') return null;
    const rank = _awardRank(activePids, pid => getCachedBadges(pid).length);
    if(rank.length < 2) return null;
    const lead = _awardLeaders(rank), top = rank[0], nxt = rank[lead.length];
    if(lead.length > 1 || !nxt) return null; // Gleichstand → kein „hat die volle Vitrine"
    return { cat:'badge', ic:'medalTrio', prio:4,
      title:`${nameOf(top.pid)} hat die volle Vitrine`,
      desc:`${top.v} verschiedene Auszeichnungen freigeschaltet. ${nameOf(nxt.pid)} kommt auf ${nxt.v}.`,
      vv: top.v, vl:'Awards',
      dataRef:{ ambientPid: top.pid } };
  }});

  // ══ Persönliche Nuggets (v9.17) ═══════════════════════════════════════
  // Weniger Liga-Superlative, mehr Geschichten über EINEN Kopf — das ist es,
  // was einen Fun Fact persönlich macht. Alle Werte stammen aus allPlayerStats
  // bzw. der H2H-Map, beide bereits gecached.

  // ── Persönlich: Lieblingsgegner (höchste Siegquote im direkten Duell) ──
  T.push({ key:'personal_favourite_opp', weight:2, make: (rng) => {
    const map = (typeof _ensureH2HMap === 'function') ? _ensureH2HMap() : null;
    if(!map || !map.size) return null;
    const cands = [];
    for(const [k, e] of map){
      const [pa, pb] = k.split('|');
      if(!pm[pa] || !pm[pb] || pm[pa].hidden || pm[pb].hidden) continue;
      const wa = e.wins[pa]||0, wb = e.wins[pb]||0, total = wa + wb;
      if(total < 6) continue;
      if(wa >= wb && wa / total >= 0.7) cands.push({ pid: pa, opp: pb, w: wa, l: wb, total });
      if(wb >  wa && wb / total >= 0.7) cands.push({ pid: pb, opp: pa, w: wb, l: wa, total });
    }
    if(!cands.length) return null;
    const c = cands[Math.floor(rng()*cands.length)];
    return { cat:'rivalry', ic:'devilMask', prio:4,
      title:`${nameOf(c.opp)} ist ${nameOf(c.pid)}s Lieblingsgegner`,
      desc:`${c.w}:${c.l} aus ${c.total} direkten Duellen. Diese Paarung geht fast immer gleich aus.`,
      vv: c.w + ':' + c.l, vl:'Duelle',
      dataRef:{ ambientPids:[c.pid, c.opp], pairKind:'duel' } };
  }});

  // ── Persönlich: Lieblings-Mate (bestes gemeinsames Team) ──
  T.push({ key:'personal_best_mate', weight:2, make: (rng) => {
    const cands = [];
    for(const pid of withStats){
      const mates = stats[pid].mates || {};
      for(const mid in mates){
        const g = mates[mid].g, w = mates[mid].w;
        if(g < 6 || !pm[mid] || pm[mid].hidden) continue;
        if(w / g < 0.65) continue;
        // Nur einmal pro Paar (kleinere pid führt), sonst doppelte Kandidaten.
        if(pid > mid) continue;
        cands.push({ pid, mate: mid, g, w, wr: w/g });
      }
    }
    if(!cands.length) return null;
    const c = cands[Math.floor(rng()*cands.length)];
    return { cat:'team', ic:'duo', prio:4,
      title:`Beste Freunde: ${nameOf(c.pid)} und ${nameOf(c.mate)}`,
      desc:`Zusammen ${c.w} von ${c.g} Spielen gewonnen. ${Math.round(c.wr*100)}% als Duo.`,
      vv: Math.round(c.wr*100) + '%', vl:'als Duo',
      dataRef:{ ambientPids:[c.pid, c.mate], pairKind:'team' } };
  }});

  // ── Persönlich: Lieblingsposition (Sturm vs. Abwehr) ──
  T.push({ key:'personal_position', weight:2, make: (rng) => {
    const elig = withStats.filter(pid => stats[pid].atkG >= 5 && stats[pid].defG >= 5);
    if(!elig.length) return null;
    const pid = elig[Math.floor(rng()*elig.length)];
    const st = stats[pid];
    const atkWr = st.atkW / st.atkG, defWr = st.defW / st.defG;
    const diff = Math.abs(atkWr - defWr);
    if(diff < 0.1) {
      return { cat:'personal', ic:'refresh', prio:3,
        title:`${nameOf(pid)} ist beidfüßig`,
        desc:`Im Sturm ${Math.round(atkWr*100)}%, in der Abwehr ${Math.round(defWr*100)}%. Dem ist die Position egal.`,
        // Ohne Wert blieb der grosse Block der Karte leer. Die Aussage ist
        // die Quote, die in BEIDEN Rollen gilt — nicht der Abstand, der
        // hier gerade null sein soll.
        vv: Math.round((st.atkW + st.defW) / (st.atkG + st.defG) * 100) + '%',
        vl:'in beiden Rollen',
        dataRef:{ ambientPid: pid } };
    }
    const strong = atkWr > defWr;
    return { cat:'personal', ic: strong ? 'bolt2' : 'shieldStar', prio:4,
      title:`${nameOf(pid)} gehört ${strong ? 'nach vorn' : 'nach hinten'}`,
      desc: strong
        ? `Im Sturm ${Math.round(atkWr*100)}% Siege (${st.atkG} Spiele), in der Abwehr nur ${Math.round(defWr*100)}%.`
        : `In der Abwehr ${Math.round(defWr*100)}% Siege (${st.defG} Spiele), im Sturm nur ${Math.round(atkWr*100)}%.`,
      vv: Math.round((strong ? atkWr : defWr)*100) + '%', vl: strong ? 'im Sturm' : 'in Abwehr',
      dataRef:{ ambientPid: pid } };
  }});

  // ── Fun Fact: häufigstes Endergebnis der Liga ──
  // ── Saison-Titel: das Rennen um die laufende Tafel (§13, v9.18) ──────
  // Die Tafel wird erst am Monatsende vergeben. Damit der Monat trotzdem
  // Spannung hat, greift dieser Fun Fact den aktuellen Stand auf — als
  // normale Karte, NICHT als Breaking News. Der Saisonabschluss selbst
  // bleibt die einzige Breaking-Meldung des Titel-Systems.
  T.push({ key:'season_title_race', weight:2, make: () => {
    if(typeof seasonTitles !== 'function') return null;
    let T2 = null;
    try { T2 = seasonTitles(currentSeason().id); } catch(e){ return null; }
    if(!T2 || !T2.awarded.length) return null;
    const cur = T2.awarded.filter(a => pm[a.pid]);
    if(!cur.length) return null;
    // Bewusst deterministisch (kein Zufall), damit die memoisierte Story bei
    // gleichem Datenstand stabil bleibt. Den Tabellenführer muss hier niemand
    // mehr aussortieren: Platz 1 ist seit v9.18 kein Chronik-Eintrag mehr,
    // die Spitze bespielt die Saison-Endspurt-Story.
    const a = cur[0];
    const held = T2.awarded.length, open = SEASON_TITLES.length - held;
    return { cat:'season', ic:a.ic, prio:5,
      title:`${nameOf(a.pid)} führt bei „${a.name}"`,
      // „Das ist der Stand von heute" sagte nichts: jede Karte im Feed
      // traegt ihr Datum. Und der grosse Wert zaehlte die Eintraege des
      // Katalogs, waehrend die Schlagzeile von EINER Fuehrung erzaehlte —
      // zwei Aussagen auf einer Karte, und die Zahl gehoerte der falschen.
      desc:`${_evSatz(a.ev)}. ${held} von ${SEASON_TITLES.length} `
        + `Chronik-Einträgen sind vergeben, ${open} sind noch offen.`,
      vv:_chronKurz(a.ev), vl:'in Führung',
      dataRef:{ ambientPid:a.pid, seasonTable:T2.sid } };
  }});

  // ── Chronik: ein Liga-Rekord im Rampenlicht (§13.4b) ────────────────
  // Chroniken ändern sich selten — deshalb genau eine ruhige Karte, keine
  // Breaking News. Der Eintrag rotiert über den Tag im Slot, damit über die
  // Wochen alle Rekorde einmal drankommen.
  T.push({ key:'chronicle_spotlight', weight:2, make: () => {
    if(typeof chronicleHolders !== 'function') return null;
    let by = null;
    try { by = chronicleHolders(); } catch(e){ return null; }
    const recs = CHRONICLES.filter(d => by[d.id] && pm[by[d.id].pid]);
    if(!recs.length) return null;
    // Deterministisch aus dem Tag gewählt: gleicher Tag → gleiche Karte.
    const day = Math.floor(now.getTime() / 86400000);
    const d = recs[day % recs.length];
    const h = by[d.id];
    return { cat:'fun', ic:d.ic, prio:4,
      title:`${h.shared ? _chronHalterSatz(h) + ' halten' : nameOf(h.pid) + ' hält'} „${d.name}"`,
      // Die Bedingung stand hier im Klartext und machte aus zwei Zeilen
      // fünf. Sie gehört ins Detail, nicht auf die Karte — die Karte sagt,
      // WAS jemand hält, das Detail sagt, wofür.
      // Der Beleg endet mit einem Punkt, und danach stand ein Kleinbuchstabe:
      // „… gewonnen · 9. sonst hält ihn niemand." Der zweite Satz faengt jetzt
      // an, wo ein Satz anfaengt, und der Beleg traegt keinen Listentrenner
      // mehr mitten im Fliesstext.
      desc:`${_evSatz(h.ev)}. ${h.shared ? 'Diesen Bestwert halten mehrere punktgleich.' : 'Sonst hält diesen Bestwert niemand.'}`,
      vv:'1', vl:'Rekordhalter',
      dataRef:{ ambientPid:h.pid, chronicle:d.id } };
  }});


  // ── Prestige & Insignium (§13.8/§13.9) ──────────────────────────────
  // Fünf Karten, die das neue System sichtbar machen. Drei schauen nach
  // vorn (10:00), zwei zurück (19:00) — die Zuordnung steht in
  // AMBIENT_SLOT_ROLLE [§11.0]. `dataRef.prestige` sagt der Karte, dass
  // sie das Insignium des Spielers als Bild zeigen soll [§11.6b].

  T.push({ key:'prestige_fuehrung', weight:2, make: () => {
    if(typeof prestigeTabelle !== 'function') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    const rang = P.rang.filter(id => pm[id]);
    if(rang.length < 2) return null;
    const a = P.byPid[rang[0]], b = P.byPid[rang[1]];
    if(!a || !b || a.punkte <= 0) return null;
    const e = prestigeOf(rang[0]);
    return { cat:'highlight', ic:'trophyStar', prio:5,
      title:`${nameOf(rang[0])} führt das Prestige an`,
      desc:`${a.punkte} Punkte, ${a.punkte - b.punkte} mehr als ${nameOf(rang[1])}. `
        + `Am Wappen trägt ${nameOf(rang[0])} damit den ${e.insignie.name}`
        + (e.naechste ? `, bis zum ${e.naechste.name} fehlen ${e.fehlt}.` : `, die letzte Stufe.`),
      vv:String(a.punkte), vl:'Prestige',
      dataRef:{ ambientPid:rang[0], prestige:true } };
  }});

  T.push({ key:'prestige_schwelle', weight:2, make: () => {
    if(typeof prestigeTabelle !== 'function') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    // Wer ist der nächsten Stufe am nächsten? Wer schon auf der letzten
    // steht, zählt hier nicht — für ihn gibt es die Zacken-Karte nicht.
    let best = null;
    Object.keys(P.byPid).forEach(pid => {
      if(!pm[pid]) return;
      const e = prestigeOf(pid);
      if(!e.naechste || e.punkte <= 0) return;
      if(!best || e.fehlt < best.fehlt) best = e;
    });
    if(!best) return null;
    const spanne = best.naechste.min - best.insignie.min;
    return { cat:'season', ic:'peak', prio:5,
      title:`${nameOf(best.pid)} steht kurz vor dem ${best.naechste.name}`,
      desc:`Noch ${best.fehlt} Punkte bis zum ${best.naechste.name}, `
        + `${Math.round((1 - best.fehlt / spanne) * 100)} % der Stufe sind geschafft. `
        + `Dann ändert der Reif um das Wappen seine Form.`,
      vv:String(best.fehlt), vl:'fehlen',
      dataRef:{ ambientPid:best.pid, prestige:true } };
  }});

  T.push({ key:'prestige_schritt', weight:2, make: (rng) => {
    if(typeof prestigeSchritte !== 'function') return null;
    const kandidaten = activePids.filter(pid => {
      try { return prestigeSchritte(pid, 1).length > 0; } catch(e){ return false; }
    });
    if(!kandidaten.length) return null;
    const pid = kandidaten[Math.floor(rng() * kandidaten.length)] || kandidaten[0];
    const s = prestigeSchritte(pid, 1)[0];
    if(!s) return null;
    // „X liegt ‚Das Sonntagskind' am naechsten" sagte nicht, worum es geht,
    // und der Text darunter nannte nur den Halter: was jemand tun muss, um
    // den Rekord zu holen, stand nirgends. Die Karte sagt jetzt die Aufgabe
    // (die Bedingung aus dem Katalog), den Stand des Halters und den Gewinn.
    // „Holt er ihn" stand ausserdem einmal direkt hinter dem Namen des
    // HALTERS und zeigte damit auf den Falschen.
    const _bed = s.cond || '';
    // ── Die Karte nennt den eigenen Stand ───────────────────────────
    // Sie sagte die Schwelle und den Bestwert des Halters, aber nicht, wo
    // der Spieler selbst steht: „Martin & Julian haelt den Bestwert mit
    // 84 %" ist ohne die eigenen 71 % keine Auskunft darueber, wie weit es
    // noch ist. Mehrere Halter bekommen dazu ihr Verb — und „&" gehoert in
    // eine Tabellenzelle, nicht in einen Satz [§C33].
    const _mehr = (s.halterN || 0) > 1;
    const _halter = String(s.halter || '');
    const _stand = _halter && s.stand
      ? `${_halter} ${_mehr ? 'halten' : 'hält'} den Bestwert mit ${s.stand}`
      : String(s.txt || '');
    // „Kein anderer ist gerade so nah dran" behauptete einen Vergleich, den
    // die Karte nie angestellt hat: der Spieler wird unter allen gezogen,
    // die ueberhaupt einen offenen Schritt haben, nicht als der naechste.
    return { cat:'personal', ic:s.ic, prio:5,
      title:`${nameOf(pid)} kann „${s.name}" holen`,
      desc: (_bed ? `Dafür zählt: ${_bed}. ` : '')
        + (_stand ? _stand + '. ' : '')
        + (s.mein ? `${nameOf(pid)} steht bei ${s.mein}. ` : '')
        + `Gelingt es, bringt das ${s.gewinn} Prestige.`,
      // Der grosse Wert war die Aussicht auf Prestige — eine Zahl, die
      // niemand geholt hat, im Goldrahmen einer gehaltenen Bestmarke
      // [§C25]. Er zeigt jetzt den eigenen Stand: das ist die Zahl, mit
      // der man etwas anfangen kann. Fehlt er, steht der zu schlagende
      // Wert dort — auch das ist eine Tatsache und keine Aussicht.
      vv: s.mein || s.stand || ('+' + s.gewinn),
      vl: s.mein ? 'aktuell' : (s.stand ? 'zu schlagen' : 'Prestige'),
      dataRef:{ ambientPid:pid, prestige:true } };
  }});

  T.push({ key:'insignium_stand', make: () => {
    if(typeof prestigeTabelle !== 'function' || typeof INSIGNIEN === 'undefined') return null;
    let P = null; try { P = prestigeTabelle(); } catch(e){ return null; }
    const zahl = INSIGNIEN.map(() => 0);
    let n = 0;
    Object.keys(P.byPid).forEach(pid => {
      if(!pm[pid]) return;
      zahl[prestigeOf(pid).stufe]++; n++;
    });
    if(!n) return null;
    const hoechste = zahl.reduce((acc, v, i) => v > 0 ? i : acc, 0);
    const oben = INSIGNIEN[hoechste];
    const leer = INSIGNIEN.length - 1 - hoechste;
    return { cat:'history', ic:'medalTrio', prio:4,
      // „Die Liga traegt 1 verschiedene Insignien" war ein Zahlwort im
      // Plural, und der Satz darunter war eine Liste aus Etiketten samt
      // Nullen: „Reif: 12, Schildring: 0, Volutenkranz: 0". Genannt wird
      // jetzt nur, was auch jemand traegt, und im Satz stehen Traeger statt
      // Doppelpunkte [§C33].
      title: (function(){
        const k = zahl.filter(v => v > 0).length;
        return k === 1 ? `Die ganze Liga trägt dieselbe Stufe`
                       : `Die Liga trägt ${_zahlwortDe(k)} verschiedene Insignien`;
      })(),
      desc: INSIGNIEN.map((s, i) => ({s, v:zahl[i]})).filter(x => x.v > 0)
          // „7 traegt den Schildring" — die Zahl stand im Plural, das Verb
          // im Singular.
          .map(x => `${x.v === 1 ? 'einer trägt' : x.v + ' tragen'} den ${x.s.name}`)
          .reduce((txt, teil, i, arr) => txt + (i === 0 ? '' : i === arr.length - 1 ? ' und ' : ', ') + teil, '')
          .replace(/^./, c => c.toUpperCase())
        + `. Höchste getragene Stufe ist der ${oben.name}`
        + (leer > 0 ? `, darüber ${leer === 1 ? 'liegt noch eine Stufe' : 'liegen noch ' + leer + ' Stufen'}, die niemand erreicht hat.` : '.'),
      vv:String(n), vl:'gewertet',
      dataRef:{ ambientPids:[] } };
  }});

  T.push({ key:'titelband_stand', make: () => {
    if(typeof meisterTitel !== 'function') return null;
    const mit = activePids.map(pid => ({pid, n:meisterTitel(pid)}))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    if(!mit.length) return null;
    const top = mit[0];
    const gesamt = mit.reduce((a, x) => a + x.n, 0);
    return { cat:'history', ic:'crown', prio:4,
      title:`${nameOf(top.pid)} trägt die breiteste Schwinge`,
      desc:`${top.n} Meistertitel von ${gesamt}, die die Liga bisher vergeben hat. `
        + (mit.length === 1
            ? `Sonst hat noch niemand einen Monat gewonnen. Bei allen anderen steht das Titelband als leerer Umriss.`
            : `${mit.length} Spieler haben überhaupt schon einen geholt.`)
        + (top.n >= 5 ? ` Ab fünf Titeln sitzt die Krone obenauf. Die hat er.` : ''),
      vv:String(top.n), vl:'Titel',
      dataRef:{ ambientPid:top.pid, prestige:true } };
  }});


  // ── Rückblicke mit festem Termin (§11.1c) ───────────────────────────
  // Woche und Monat hat der Generator schon: der gestaffelte Montags-Block
  // [§11.1] und der season_recap beim Archivieren. Was fehlte, waren die
  // beiden langen Blicke — Monatshalbzeit und Jahreswechsel. Sie hängen
  // NICHT am Losverfahren: `pflicht` belegt den Slot direkt, damit ein
  // Rückblick nie ausfällt, weil an dem Tag zufällig etwas anderes zog.

  T.push({ key:'rueckblick_halbzeit',
    pflicht: (tag, stunde) => stunde >= 15 && Number(tag.slice(8, 10)) === 15,
    make: () => {
      if(typeof seasonTitles !== 'function') return null;
      let T2 = null, sid = null;
      try { sid = currentSeason().id; T2 = seasonTitles(sid); } catch(e){ return null; }
      if(!T2) return null;
      const offen = SEASON_TITLES.length - T2.awarded.length;
      const fuehrend = T2.champ && pm[T2.champ.pid] ? T2.champ : null;
      const ohne = (T2.empty || []).filter(id => pm[id]).length;
      return { cat:'season', ic:'stopwatch', prio:6,
        title:`Halbzeit im ${seasonLabel(sid)}`,
        desc: `${T2.matches} Partien an ${T2.days} Spieltagen. `
          + (fuehrend ? `${nameOf(fuehrend.pid)} führt mit ${fuehrend.elo} Elo aus ${fuehrend.games} Spielen. ` : '')
          + `${T2.awarded.length} von ${SEASON_TITLES.length} Monatswertungen sind vergeben, ${offen} noch offen`
          + (ohne ? `, ${ohne} Spieler ${ohne === 1 ? 'trägt' : 'tragen'} noch keine.` : '.')
          + ` Die zweite Monatshälfte entscheidet.`,
        vv:String(offen), vl:'noch offen',
        dataRef:{ ambientPid: fuehrend ? fuehrend.pid : null, seasonTable:sid } };
    }});

  T.push({ key:'rueckblick_jahr',
    pflicht: (tag, stunde) => stunde >= 10 && tag.slice(5) === '01-01',
    make: () => {
      if(typeof prestigeTabelle !== 'function') return null;
      const jahr = now.getFullYear() - 1;
      const imJahr = matches.filter(m => new Date(m.created_at).getFullYear() === jahr);
      if(!imJahr.length) return null;
      const tage = new Set(imJahr.map(m => String(m.created_at).slice(0, 10))).size;
      const tore = imJahr.reduce((a, m) => a + (m.score_a || 0) + (m.score_b || 0), 0);
      let P = null; try { P = prestigeTabelle(); } catch(e){ P = null; }
      const spitze = P && P.rang.find(id => pm[id]);
      let meister = [];
      try {
        meister = (allPastSeasons() || []).filter(sid => sid.slice(0, 4) === String(jahr))
          .map(sid => seasonChampion(sid)).filter(pid => pid && pm[pid]);
      } catch(e){ /* dann eben ohne */ }
      const zaehler = {};
      meister.forEach(pid => { zaehler[pid] = (zaehler[pid] || 0) + 1; });
      const bester = Object.keys(zaehler).sort((a, b) => zaehler[b] - zaehler[a])[0];
      return { cat:'history', ic:'calendar', prio:7,
        title:`${jahr} in Zahlen`,
        desc: `${imJahr.length} Partien an ${tage} Spieltagen, ${tore} Tore. `
          + (bester ? `${nameOf(bester)} holte ${zaehler[bester]} von ${meister.length} Meistertiteln. ` : '')
          + (spitze ? `Im Prestige steht ${nameOf(spitze)} vorn. ${prestigeOf(spitze).punkte} Punkte, ${prestigeOf(spitze).insignie.name}.` : ''),
        vv:String(imJahr.length), vl:'Partien',
        dataRef:{ ambientPid: spitze || null, prestige: !!spitze } };
    }});

  return T;
}

