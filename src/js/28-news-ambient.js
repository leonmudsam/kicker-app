// ─── §11.1b — Ambiente Fun-Fact-Stories (v8.5, v9.5) ─────────────────
// Erzeugt Fun Facts / persönliche Nuggets / Rivalitäten / Historie, damit der
// Feed auch OHNE neue Matches lebendig wirkt.
//
// KERNPRINZIP (kein Spam, Cross-Device-konsistent):
//   - RHYTHMUS: hoechstens ein Fun Fact pro Tag, fest um 15:00 Uhr, und nur,
//     solange die letzte Partie weniger als AMBIENT_RUHE_TAGE zurueckliegt.
//     Verpasste stille Tage im Feed-Fenster werden beim naechsten Oeffnen gefuellt.
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
function _buildAmbientStories(now, pm, nameOf, tagesStories){
  const out = [];
  if(!Array.isArray(AMBIENT_SLOTS) || !AMBIENT_SLOTS.length) return out;
  // Taeglich; _isAmbientDay ist derzeit immer true.
  if(!_isAmbientDay(now)) return out;

  const templates = _ambientTemplatePool(now, pm, nameOf);
  if(!templates.length) return out;

  // ── Fällige Slots samt Nachlauf ──────────────────────────────────────
  // Ein Slot entsteht beim ersten Öffnen nach 15 Uhr. Wurde die Liga mehrere
  // Tage nicht geöffnet, werden stille vergangene Tage des Feed-Fensters
  // deterministisch nachgetragen. Tage mit Partien oder Saisonabschluss
  // bleiben frei, ebenso jeder Tag, an dem die letzte Partie vor dem Slot
  // AMBIENT_RUHE_TAGE oder länger zurückliegt. Ein persistierter Slot wird
  // nie neu gezogen.
  //
  // Der Zeitstempel ist die SLOT-STUNDE und nicht der Moment des Entstehens.
  // Er war einmal `now`; damit nannte die Karte die Uhrzeit ihres Lesers und
  // nicht 15:00. Schlimmer: `event_at` gewinnt beim ersten Insert
  // und gilt dann für alle Geräte, also hing die Stelle der Karte im Feed
  // daran, wer die App zuerst geöffnet hat. Die Slot-Stunde ist dagegen aus
  // der ID ableitbar und auf jedem Gerät dieselbe. Dass die Karte damit unter
  // spätere Partien rutscht, ist richtig: der Feed ist chronologisch [§C33]
  // und eine Partie nach 15 Uhr darf den publizierten Funfact nicht entfernen.
  //
  // Datum und Uhrzeit kommen aus DERSELBEN lokalen Zeit. Vorher stand im
  // Schlüssel das UTC-Datum, in `when` aber die lokale Slot-Zeit — zwischen
  // Mitternacht und der UTC-Grenze trug eine Story deshalb ein Datum, das nicht
  // zu ihrem Zeitstempel passte.
  const _dayMs = 86400000;
  const dueSlots = [];
  const slotHours = AMBIENT_SLOTS.slice().sort((a, b) => a - b);
  const tageMitMatch = new Set((matches || []).map(m => tagKey(m.created_at)));
  // Die Zeitpunkte aller Partien, aufsteigend: der Slot fragt nach der
  // letzten davor (`AMBIENT_RUHE_TAGE`).
  const partienMs = (matches || []).map(mts).filter(Number.isFinite).sort((a, b) => a - b);
  const ruhtSeit = slotMs => {
    let lo = 0, hi = partienMs.length;
    while(lo < hi){ const mi = (lo + hi) >> 1; if(partienMs[mi] <= slotMs) lo = mi + 1; else hi = mi; }
    return lo ? slotMs - partienMs[lo - 1] : Infinity;
  };
  const generation = Array.isArray(tagesStories) ? tagesStories : [];
  // Fehlende stille Tage werden innerhalb des Feed-Fensters nachgetragen.
  // Vergangene Tage sind nur still, wenn an ihnen gar nicht gespielt wurde.
  // Heute entscheidet dagegen der Stand um exakt 15 Uhr: ein Match danach
  // darf den zu diesem Zeitpunkt bereits publizierten Funfact nicht löschen.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - NEWS_FENSTER_TAGE + 1);
  for(let tag = new Date(start); tag <= now; tag.setDate(tag.getDate() + 1)){
    const dk = tagKey(tag), istHeute = dk === tagKey(now);
    for(const slotHour of slotHours){
      const faellig = new Date(tag.getFullYear(), tag.getMonth(), tag.getDate(), slotHour, 0, 0, 0);
      if(faellig.getTime() > now.getTime()) continue;
      if(!istHeute && tageMitMatch.has(dk)) continue;
      if(istHeute && (matches || []).some(m => tagKey(m.created_at) === dk && mts(m) <= faellig.getTime())) continue;
      if(ruhtSeit(faellig.getTime()) >= AMBIENT_RUHE_TAGE * _dayMs) continue;
      const saisonEnde = generation.some(s => (s.dataRef || {}).type === 'season_recap'
        && tagKey(s.when) === dk && new Date(s.when).getTime() <= faellig.getTime());
      if(saisonEnde) continue;
      dueSlots.push({dateKey: dk, slotHour, when: faellig});
    }
  }
  if(!dueSlots.length) return out;

  // Bereits persistierte Ambient-Stories: (a) ein Slot, der schon existiert, wird
  // nicht neu abgeleitet (Daten-Drift-Schutz, er kommt ohnehin aus dem DB-Cache);
  // (b) die der letzten Tage sperren ihren Fun-Fact-Typ bzw. ihre Köpfe.
  const known = (Array.isArray(_cache._stories) ? _cache._stories : [])
    .filter(s => s && typeof s.id === 'string' && s.id.indexOf('ambient_') === 0);
  const knownById = new Map(known.map(s => [s.id, s]));
  // Wer in den drei Tagen vor einem Slot keine eigene Karte hatte — Spieler
  // des Tages, Woche, Runde, Tafel —, wird im ersten Durchgang bevorzugt.
  // Die Sperren darunter kennen nur die Fun Facts; gemessen standen damit
  // sieben von elf Spielern auf den ausgewählten Karten einer Woche und die
  // übrigen nur auf ihren Partien [§C33]. Eine Partie-Karte zählt nicht: wer
  // oft spielt, steht oft darauf, und das ist der Spielplan. Eine Karte ohne
  // Person bevorzugt niemanden und kommt erst im nächsten Durchgang.
  const feedPidsZwischen = (vonMs, bisMs) => {
    const set = new Set();
    if(typeof _newsPids !== 'function') return set;
    generation.forEach(s => {
      const t = new Date(s.when).getTime(), d = s.dataRef || {};
      if(!(t >= vonMs && t <= bisMs) || d.type === 'spiel' || d.type === 'ambient') return;
      try { (_newsPids(s) || []).forEach(p => set.add(p)); } catch(e){}
    });
    return set;
  };

  // v9.11: Cooldown ist PRO Typ. Standard = AMBIENT_COOLDOWN_DAYS; ein Template
  // darf ihn via `cooldown` verkürzen (z.B. fun_random_stat, dessen Inhalt bei
  // jedem Lauf variiert → darf früher wiederkommen).
  const cooldownDaysOf = {};
  for(const t of templates) cooldownDaysOf[t.key] = t.cooldown || AMBIENT_COOLDOWN_DAYS;
  const pidsOf = dr => !dr ? [] : (Array.isArray(dr.ambientPids) ? dr.ambientPids : (dr.ambientPid ? [dr.ambientPid] : []));
  // Die Rubrik jeder Frage [§C33]; die Präfixe darunter lesen gespeicherte
  // Karten, deren Zeile noch keine `ambientRubrik` trug. Ein Duo hat seine
  // eigene Rubrik: die Chemie stand unter „Spieler im Fokus" und nannte
  // zwei. Gespeicherte Karten tragen ihre Rubrik in der Zeile und bleiben,
  // wie sie sind. Je Rubrik stehen drei bis fünf Fragen, damit die Sperre
  // der Rubrik davor nie die halbe Liste nimmt.
  const RUBRIK = {
    form_aufwind:'form', form_erwartung:'form', form_gegen_laufbahn:'form', form_serie:'form', form_gipfel:'form',
    laufbahn_marke:'laufbahn', tafel_karriere:'laufbahn', laufbahn_rennen:'laufbahn', titel_sterne:'laufbahn',
    chronik_reihe:'chronik', rekord_reichweite:'chronik', saison_rueckblick:'chronik',
    duo_chemie:'duo', duo_rangliste:'duo', duo_lauf:'duo', duo_saison:'duo',
    rolle_seite:'persoenlich', positionen_spitze:'persoenlich', partner_netz:'persoenlich', saison_vergleich:'persoenlich',
    prestige_leiter:'auszeichnung', auszeichnung_monat:'auszeichnung',
    rivalitaet:'duell',
    liga_marke:'liga', saison_spitze:'liga'
  };
  const rubrikVon = key => {
    if(RUBRIK[key]) return RUBRIK[key];
    if(/^award_/.test(key)) return 'auszeichnung';
    if(/^rivalry_/.test(key)) return 'duell';
    if(/^personal_/.test(key)) return 'persoenlich';
    if(/^duo_/.test(key)) return 'duo';
    if(/^rolle_/.test(key)) return 'persoenlich';
    if(/^(insignium_|titelband_|laufbahn_)/.test(key)) return 'laufbahn';
    if(/^(chronicle_|season_|history_|chronik_)/.test(key)) return 'chronik';
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
    // Steht der Slot schon in der DB, ist nichts nachzutragen — es sei denn,
    // die Karte dort ist abgemeldet (`_storyAbgemeldet`): dann gibt sie den
    // Slot frei, und der Ersatz bekommt die nächste freie ID (`_2`, `_3`, …),
    // weil die Datenbank keine Zeile ändert [§C33]. Am 28.10. schrieb ein
    // Gerät mit der Fassung vor dem Streichen des Umsteigers um 15:19 dessen
    // Karte in den Slot; die neue Fassung blendete sie aus und fand den Slot
    // belegt, und der Tag blieb ohne Fun Fact.
    let slotId = 'ambient_' + slot.dateKey + '_' + slot.slotHour, belegt = false;
    for(let n = 2; knownById.has(slotId); n++){
      if(!_storyAbgemeldet(knownById.get(slotId))){ belegt = true; break; }
      slotId = 'ambient_' + slot.dateKey + '_' + slot.slotHour + '_' + n;
    }
    if(belegt) continue;

    // Sperren immer aus Sicht des SLOT-TAGES, nicht aus Sicht von jetzt.
    const refMs = new Date(slot.dateKey + 'T00:00:00').getTime();
    // v9.11: Typ-Cooldown — was zuletzt lief, kommt nicht sofort wieder.
    const cooldownKeys = new Set();
    // Innerhalb desselben Tages bleibt der Typ eindeutig.
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
        // Eine These OHNE Person ist der Typ selbst. Gemerkt wurde sie nicht,
        // weil die Schleife ueber die Koepfe lief und es dort keinen gibt:
        // „2 tragen den Reif, 7 den Schildring" haengt an der ganzen Liga.
        // Gemessen ueber vierzig nachgespielte Tage stand `insignium_stand`
        // damit nach drei, vier und sechs Tagen wieder da — der Typ-Cooldown
        // von sieben Tagen faellt ab dem zweiten Durchgang, und ein
        // personenloses Template liefert immer ein Ergebnis.
        if(!h.pids.length) recentPaare.add(h.sub + '|');
        for(const pid of h.pids) recentPaare.add(h.sub + '|' + pid);
      }
    }

    // Die Rubrik des Fun Facts davor ist immer gesperrt, egal wie lange er
    // her ist. Zwischen zwei stillen Tagen liegen oft Spieltage ohne Slot,
    // und die Sperre ueber zwei Tage liess nach vier Tagen „Auszeichnung"
    // unter „Auszeichnung" stehen — im Feed direkt untereinander.
    let letzte = null;
    for(const h of history){ if(h.ts < refMs && h.rubrik && (!letzte || h.ts > letzte.ts)) letzte = h; }
    if(letzte) recentRubriken.add(letzte.rubrik);
    const feedPids = feedPidsZwischen(refMs - 3 * _dayMs, slot.when.getTime());

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

    // Der 15-Uhr-Slot mischt aktuelle Staende und Rueckblicke.
    const rolle = _ambientRolleFuerSlot(slot.slotHour);
    // Vier Durchgaenge. Die Paar-Sperre (derselbe Fakt ueber dieselbe Person
    // hoechstens einmal im Monat) gilt in jedem: findet keiner etwas Frisches,
    // bleibt der Slot leer — ein Fun Fact entsteht nur, wenn er etwas Neues
    // sagt. Seit ein Fun Fact eine von acht Fragen beantwortet [§C33], liess
    // der letzte Durchgang sie fallen und schrieb dieselbe Duo-Chemie ueber
    // dieselben zwei nach acht Tagen wieder, in vierzig Tagen fuenfzehnmal.
    // Durchgang −1 ist Durchgang 0 mit einer Bedingung mehr: die Karte zeigt
    // jemanden, der in den drei Tagen davor keine eigene Karte hatte.
    for(let pass = -1; pass < 4 && !chosen; pass++){
      for(const idx of order){
        const t = templates[idx];
        // Ein Rückblick mit festem Termin gehört seinem Tag und nicht dem
        // Los: die Halbzeit stand gezogen am 9. im Feed.
        if(typeof t.pflicht === 'function') continue;
        if(usedToday.has(t.key)) continue;
        if(pass <= 0 && cooldownKeys.has(t.key)) continue;
        if(pass < 2 && (usedRubriken.has(rubrikVon(t.key)) || recentRubriken.has(rubrikVon(t.key)))) continue;
        if(pass < 2){
          const r = _ambientRolleVon(t.key);
          if(rolle !== 'mix' && r && r !== rolle) continue;
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
        if(pass < 0 && (!pids.length || pids.some(p => feedPids.has(p)))) continue;
        // Derselbe Fakt über dieselbe Person nicht zweimal im Monat, in
        // keinem Durchgang.
        if(pids.length
            ? pids.some(p => recentPaare.has(t.key + '|' + p))
            : recentPaare.has(t.key + '|')) continue;
        chosen = res; chosenKey = t.key; break;
      }
    }
    if(chosenPflicht){ chosen = chosenPflicht; chosenKey = chosenPflichtKey; }
    if(!chosen) continue;
    // Sofort in die Historie eintragen: ein nachfolgender Backfill-Tag sieht
    // diesen Eintrag bereits und meidet Typ und Kopf.
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
                             // Der große Wert wie der Satz: lange Zahlen mit Tausenderpunkt.
                             chosen.vv != null ? {vv: tausender(chosen.vv), vl: chosen.vl || ''} : {})
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

// ── Was ein Fun Fact ist [§C33] ───────────────────────────────────────
// Ein Fun Fact erzählt eine Entwicklung, keinen Einzeleintrag. Hier standen
// vierzig Vorlagen, und die meisten nannten einen Stand: „Jannik holte
// zuletzt Gold", „Johannes führt bei ‚Der makellose Tag', 29 von 118
// vergeben", „Leo ist Dauergast, 312 Partien", eine Zufallskennzahl eines
// Zufallsspielers. Dazu dieselben Bilder immer wieder — Podest, Rennen,
// Strichliste —, und was eine Karte sagte, sagte die Rangliste schon.
//
// Jede Vorlage beantwortet jetzt genau EINE Frage, und jede hat ihr eigenes
// Bild aus echten Daten (`bild.f`, gezeichnet in 30c-news-fakt.js):
//   form_aufwind         wer hat in vierzehn Tagen am meisten Elo geholt?
//   form_erwartung       wer gewinnt mehr, als die Elo aller vier erwarten ließ?
//   form_gegen_laufbahn  wessen Form liegt am weitesten über der eigenen Laufbahn?
//   laufbahn_marke       wem fehlt wenig bis zu einer runden Marke der Laufbahn?
//   chronik_reihe        wessen Reihe in der Chronik ist ununterbrochen, wer ist neu?
//   duo_chemie           welches Duo spielt am deutlichsten über der Erwartung?
//   rolle_seite          wer wechselte die Position, wer spielt meist auf der schwächeren?
//   liga_marke           welche runde Zahl hat die Liga erreicht, und wie wuchs sie?
// Mit acht Fragen blieb jeder zweite Slot leer; dazu kamen siebzehn, jede
// mit einer Frage, die keine andere stellt:
//   saison_spitze        wer kletterte in einer Woche aufs Podest des Monats?
//   tafel_karriere       was bewegte sich auf dem Podest der Ewigen Tafel?
//   laufbahn_rennen      wer holt bei Siegen, Partien, Toren der Laufbahn auf?
//   titel_sterne         wie verteilen sich die Meistertitel?
//   prestige_leiter      was bewegte sich vorn im Prestige, auf der Leiter?
//   auszeichnung_monat   wer holt im Monat die meisten Auszeichnungen?
//   form_serie           wessen Serie läuft, und wie weit ist die Bestmarke?
//   form_gipfel          wer steht so hoch wie in keinem Monat zuvor?
//   saison_vergleich     wer sprang vom Ende des Vormonats aufs Podest?
//   rekord_reichweite    wem fehlen zwei Siege zu einem Rekord der Form?
//   saison_rueckblick    wo steht das Podest des Vormonats jetzt?
//   positionen_spitze    was bewegte sich in der Rangliste einer Position?
//   partner_netz         mit wem bildete jemand noch nie ein Duo?
//   duo_rangliste        welches Duo kam vorn in die Teams-Liste?
//   duo_lauf             welches Duo gewinnt gerade zusammen in Folge?
//   duo_saison           wer liegt im Rennen um das Team der Saison vorn?
//   rivalitaet           welches Duell hat sich gedreht oder steht gleich?
// Dazu die Halbzeit am 15. und der Jahresrückblick am 1. Januar, die am
// Datum hängen und nicht am Los.
//
// Ein Fun Fact liest sich beim ersten Mal [§C33]. Der Titel ist ein
// Hauptsatz — wer, was, wie viel —, der Text belegt in höchstens zwei
// kurzen Sätzen, was der Titel nicht sagt. Keine verneinte Steigerung
// („Kein Duo spielt deutlicher … als …"), keine Rechenwörter („über der
// Erwartung", „ließ … erwarten", „Prozentpunkte"), erwartete Siege ganz:
// „die Elo der vier ließ 43,7 erwarten" stand über einem Duo, und niemand
// verstand den Satz beim ersten Lesen.
//
// Jede Vorlage nennt ihre Mindestmenge als Konstante in ihrem Kopf, gemessen
// an den echten Partien: ein Fun Fact entsteht nur, wenn seine Daten tragen.
// Die Liga spielt an etwa vier Tagen der Woche, ein Spieler kommt in
// vierzehn Tagen auf zwanzig bis vierzig Partien.
//
// Gesehen wird nur, was bis zum Zeitpunkt der Ziehung gespielt war
// (`mts(m) <= now`): die Karte von 15 Uhr weiß nichts von einer Partie um
// 17 Uhr. Gesperrt ist jeder Ruheständler [§C40] — ein Fun Fact vergleicht
// über die Laufbahn mit der Liga von heute (`ligaAktiv`).
function _ambientTemplatePool(now, pm, nameOf){
  const aktiv = id => ligaAktiv(pm[id]);
  const activePids = Object.keys(pm).filter(aktiv);
  const T = [];
  const TAG = 86400000, jetzt = now.getTime(), ab14 = jetzt - 14 * TAG, ab56 = jetzt - 56 * TAG;

  // ── Eine Schleife für alle ──────────────────────────────────────────
  // Laufbahn, die vierzehn Tage und die sechs Wochen davor, je Spieler in
  // einem Durchgang über die Partien bis zur Ziehung. Gemerkt für den einen
  // Aufbau des Pools: jede Vorlage fragt dieselben Zahlen.
  let _memo = null;
  const lage = () => {
    if(_memo) return _memo;
    const bis = (matches || []).filter(m => mts(m) <= jetzt);
    const je = {};
    const zu = id => je[id] || (je[id] = {g:0, w:0, gf:0, g14:0, w14:0, e14:0, d14:0, gf14:0,
      aG14:0, dG14:0, gV:0, wV:0, aGV:0, dGV:0, dV:0, tage:new Map(), tageN:new Map(), tage14:new Set(),
      fav:[0, 0, 0], aus:[0, 0, 0]});
    bis.forEach(m => {
      const t = mts(m), e = m.exp_a != null && isFinite(m.exp_a) ? Number(m.exp_a) : .5, aW = m.winner === 'A';
      [[m.a1, m.a1_pos, true], [m.a2, m.a2_pos, true], [m.b1, m.b1_pos, false], [m.b2, m.b2_pos, false]].forEach(([id, pos, aufA]) => {
        if(!id || !pm[id]) return;
        const x = zu(id), w = aufA ? aW : !aW, gf = (aufA ? m.score_a : m.score_b) || 0;
        const dl = Number((m.deltas || {})[id]) || 0;
        x.g++; if(w) x.w++; x.gf += gf;
        // Der Verlauf je Spieltag, im Fenster getrennt vom Tag davor: der
        // Tag, an dem das Fenster um 15 Uhr beginnt, hat Partien auf beiden
        // Seiten der Grenze.
        if(t >= ab56){
          const k = (t >= ab14 ? 'b' : 'a') + tagKey(m.created_at);
          x.tage.set(k, (x.tage.get(k) || 0) + dl); x.tageN.set(k, (x.tageN.get(k) || 0) + 1);
        }
        if(t >= ab14){
          const ex = aufA ? e : 1 - e, seite = ex >= .5 ? x.fav : x.aus;
          x.g14++; if(w) x.w14++; x.e14 += ex; x.d14 += dl; x.gf14 += gf;
          seite[0]++; if(w) seite[1]++; seite[2] += ex;
          if(pos === 'atk') x.aG14++; else x.dG14++;
          x.tage14.add(tagKey(m.created_at));
        } else {
          x.gV++; if(w) x.wV++;
          if(pos === 'atk') x.aGV++; else x.dGV++;
          if(t >= ab56) x.dV += dl;
        }
      });
    });
    return _memo = {bis, je};
  };
  const von = id => lage().je[id] || null;
  // Der Beste nach einem Wert, bei Gleichstand der mit mehr Partien im
  // Fenster und dann der Name: dieselbe Ziehung auf jedem Gerät.
  const besteNach = (ids, wert) => ids.map(id => ({id, v:wert(id)})).filter(x => x.v != null && isFinite(x.v))
    .sort((a, b) => b.v - a.v || (von(b.id).g14 - von(a.id).g14) || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
  const pct = q => Math.round(q * 100);
  // Gezogen wird unter den ersten drei, die die Schwelle nehmen, nicht
  // immer der Erste: die Sperre derselben These über dieselbe Person
  // (`AMBIENT_PAAR_COOLDOWN_DAYS`) ließ sonst nach wenigen Tagen jede Frage
  // leer, weil sie stets denselben Kopf nannte, und der Notnagel schrieb
  // genau die Wiederholung, die sie verhindern soll. Ein Superlativ steht
  // nur im Satz, wenn der Gezogene der Erste ist.
  const ziehe = (l, rng) => l[Math.min(l.length - 1, Math.floor((rng ? rng() : 0) * Math.min(3, l.length)))];
  const wort = n => ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'][n] || String(n);

  // ── 1. Der Aufwind: wer holt in vierzehn Tagen am meisten Elo ────────
  // Gezählt werden die Punkte der Partien, nicht der Stand: die Elo beginnt
  // jeden Monat neu [§3.5a], und ein Stand am 3. sagte über die Form so
  // wenig wie einer am 30. Die Summe der Deltas läuft über die Grenze des
  // Monats hinweg. Die Kurve zeigt acht Wochen, die letzten zwei hell, und
  // die sechs Wochen davor stehen im Satz: ohne sie ist ein Plus von 60 kein
  // Aufwind, sondern vielleicht der Normalfall. Ein Aufwind holt in zwei
  // Wochen mehr als in den sechs davor und mindestens AUFWIND_MIN_ELO: an
  // den echten Partien holt der Beste der vierzehn Tage zwischen 50 und 340,
  // und unter hundert war es meist der Erste eines ruhigen Fensters. Ohne
  // AUFWIND_MIN_DAVOR Partien vor dem Fenster gibt es kein Davor: „In den
  // sechs Wochen davor stand die Elo still" stand über einem, der erst zwei
  // Wochen dabei war.
  const AUFWIND_MIN_PARTIEN = 8, AUFWIND_MIN_ELO = 100, AUFWIND_MIN_DAVOR = 20;
  T.push({ key:'form_aufwind', make: rng => {
    const ids = activePids.filter(id => { const x = von(id);
      return x && x.g14 >= AUFWIND_MIN_PARTIEN && x.gV >= AUFWIND_MIN_DAVOR && x.d14 >= AUFWIND_MIN_ELO && x.d14 > x.dV; });
    const r = besteNach(ids, id => von(id).d14);
    if(!r.length) return null;
    const pid = ziehe(r, rng).id, x = von(pid), plus = Math.round(x.d14), vor = Math.round(x.dV);
    const ks = [...x.tage.keys()].sort();
    let sum = 0;
    const v = [0].concat(ks.map(k => Math.round(sum += x.tage.get(k))));
    const k = ks.filter(z => z[0] === 'a').length;
    // Die Spieltage des Fensters für das Blatt: Tag, Elo, Partien.
    const tg = ks.filter(z => z[0] === 'b').map(z => { const d = new Date(z.slice(1) + 'T12:00:00');
      return [datumFmt(d, 'wt').slice(0, 2) + ' ' + datumFmt(d, 'tm'), Math.round(x.tage.get(z)), x.tageN.get(z)]; });
    // Der Satz nennt den Nächsten: hinter dem Ersten den Zweiten, sonst den,
    // der noch mehr holte.
    const i = r.findIndex(y => y.id === pid), neben = i === 0 ? r[1] : r[0];
    const zweiter = neben ? {p:neben.id, d:Math.round(von(neben.id).d14), vorn:i !== 0} : null;
    return { cat:'personal', ic:'trendUp', prio:5,
      title:`${nameOf(pid)} holt in 14 Tagen ${plus} Elo`,
      desc:`${x.w14} Siege aus ${x.g14} Partien. In den sechs Wochen davor `
        + (vor > 0 ? `kamen ${vor} Elo dazu.` : vor < 0 ? `gingen ${-vor} Elo verloren.` : `stand die Elo still.`),
      vv:'+' + plus, vl:'Elo in 14 Tagen',
      dataRef:{ ambientPid:pid, bild:{f:'aufwind', p:pid, v, k, d:plus, vor, g:x.g14, w:x.w14,
        x:[datumFmt(new Date(ab56), 'tm'), datumFmt(now, 'tm')], nb:zweiter, tg} } };
  }});

  // ── 2. Über der Erwartung: mehr Siege, als die Elo aller vier versprach ─
  // Die Erwartung ist die der Partie (`m.exp_a`), aus der Elo von Gegnern
  // und Mitspieler vor ihr — dieselbe Erwartung wie im Positionsprofil
  // [§C44]. Wer viele Siege holt, weil er mit Starken spielt, steht hier
  // nicht vorn; wer mit Schwächeren gewinnt, schon. Gezählt wird der Sieg,
  // nicht das Torverhältnis: „gewinnt 3,4 Partien mehr als erwartet" ist
  // ein Satz, den man nachzählen kann.
  // Ab drei Siegen über der Erwartung: an den echten Partien lag der Erste
  // der vierzehn Tage zwischen 1,5 und 7, und darunter trennte ihn vom
  // Zweiten oft eine Zehntelpartie.
  const ERWARTUNG_MIN_PARTIEN = 10, ERWARTUNG_MIN_PLUS = 3;
  T.push({ key:'form_erwartung', make: rng => {
    const ids = activePids.filter(id => { const x = von(id); return x && x.g14 >= ERWARTUNG_MIN_PARTIEN; });
    const r = besteNach(ids, id => von(id).w14 - von(id).e14).filter(y => y.v > 0);
    const q = r.filter(y => y.v >= ERWARTUNG_MIN_PLUS);
    if(!q.length) return null;
    const c = ziehe(q, rng), pid = c.id, x = von(pid), i = r.indexOf(c);
    // Die Zeilen sind die ersten drei, der Gezogene steht darin; ist er
    // Vierter, steht er als dritte Zeile.
    const zeilen = r.slice(0, 3).concat(i > 2 ? [c] : []).slice(-3).map(y => { const z = von(y.id);
      return {p:y.id, w:z.w14, g:z.g14, e:+z.e14.toFixed(1), hell:y === c ? 1 : 0}; });
    const neben = i === 0 ? r[1] : r[0];
    return { cat:'personal', ic:'sollPlus', prio:5,
      title:`${nameOf(pid)} gewinnt ${Math.round(c.v)} Partien mehr als erwartet`,
      desc:`${x.w14} Siege aus ${x.g14} Partien in 14 Tagen. Nach Elo waren ${Math.round(x.e14)} zu erwarten.`,
      vv:'+' + Math.round(c.v), vl:'Siege mehr als erwartet',
      dataRef:{ ambientPid:pid, bild:{f:'erwartung', z:zeilen,
        fav:[x.fav[0], x.fav[1], +x.fav[2].toFixed(1)], aus:[x.aus[0], x.aus[1], +x.aus[2].toFixed(1)]} } };
  }});

  // ── 3. Form gegen Laufbahn: die Quote der vierzehn Tage gegen die davor ─
  // „Beste Siegquote der letzten 14 Tage" stand hier und kürte meist, wer
  // ohnehin am meisten gewinnt. Gefragt ist, wer über sich selbst
  // hinauswächst: die Laufbahn davor ist der Maßstab. Nur nach oben — ein
  // Formtief ist kein Fun Fact über jemanden [§C33].
  const FORM_MIN_PARTIEN = 10, FORM_MIN_LAUFBAHN = 40, FORM_MIN_ABSTAND = .12;
  T.push({ key:'form_gegen_laufbahn', make: rng => {
    const ids = activePids.filter(id => { const x = von(id); return x && x.g14 >= FORM_MIN_PARTIEN && x.gV >= FORM_MIN_LAUFBAHN; });
    const r = besteNach(ids, id => { const x = von(id); return x.w14 / x.g14 - x.wV / x.gV; }).filter(y => y.v > 0);
    const q = r.filter(y => y.v >= FORM_MIN_ABSTAND);
    if(!q.length) return null;
    const c = ziehe(q, rng), pid = c.id, x = von(pid), jetztQ = pct(x.w14 / x.g14), sonst = pct(x.wV / x.gV);
    const zeilen = r.slice(0, 3).concat(r.indexOf(c) > 2 ? [c] : []).slice(-3).map(y => { const z = von(y.id);
      return {p:y.id, v:pct(z.wV / z.gV), j:pct(z.w14 / z.g14), g:z.g14, w:z.w14, hell:y === c ? 1 : 0}; });
    return { cat:'personal', ic:'steigerung', prio:5,
      title:`${nameOf(pid)} gewinnt zuletzt ${jetztQ}\u00a0% der Partien`,
      desc:`${x.w14} Siege aus ${x.g14} Partien in 14 Tagen. Davor gewann ${nameOf(pid)} ${sonst}\u00a0% von ${x.gV} Partien.`,
      vv:jetztQ + '\u00a0%', vl:'Siegquote in 14 Tagen',
      dataRef:{ ambientPid:pid, bild:{f:'hantel', z:zeilen} } };
  }});

  // ── 4. Eine Marke in Sicht ──────────────────────────────────────────
  // Siege und Partien an denselben Marken wie die Karte einer Partie
  // (`_rundeMarke`: jede fünfzigste, dazu 100, 250, 500 …), Tore an jeder
  // fünfhundertsten und der Leiter ab 100, Prestige an der nächsten Stufe
  // des Insigniums. „In Sicht" heißt: am nächsten Spieltag erreichbar, so
  // schnell, wie der Spieler in den vierzehn Tagen Partien, Siege und Tore
  // sammelte — eine Marke, die rechnerisch drei Spieltage entfernt liegt,
  // ist noch keine Nachricht. Gewählt wird die nächste, gemessen an diesem
  // Tempo. Prestige hat kein Tempo je Partie, es kommt in Sprüngen; dort
  // zählt der Rest der Stufe.
  // Tore erst ab 500: jedes Tor des Teams zählt für beide, ein Spieler
  // kommt auf rund acht je Partie, und „7 Tore bis zum 100. Tor" war nach
  // zwölf Partien erreicht.
  const MARKE_MIN_PARTIEN = 4, MARKE_PRESTIGE_REST = .06;
  const toreRund = v => v >= 500 && (v % 500 === 0 || _ladderCrossing(v - 1, v, 500) === v);
  T.push({ key:'laufbahn_marke', make: rng => {
    const kand = [];
    const naechste = (ist, rund) => { let v = ist + 1; while(!rund(v)) v++; return v; };
    activePids.forEach(id => {
      const x = von(id);
      if(!x || x.g14 < MARKE_MIN_PARTIEN || !x.tage14.size) return;
      const jeTag = x.g14 / x.tage14.size;
      const neben = [
        {art:'siege', ist:x.w, rate:x.w14 / x.g14, rund:v => _rundeMarke(v, 50)},
        {art:'partien', ist:x.g, rate:1, rund:v => _rundeMarke(v, 50)},
        {art:'tore', ist:x.gf, rate:x.gf14 / x.g14, rund:toreRund}];
      neben.forEach(o => {
        if(!(o.rate > 0)) return;
        const ziel = naechste(o.ist, o.rund), rest = ziel - o.ist, partien = rest / o.rate;
        if(partien <= jeTag) kand.push({id, art:o.art, ist:o.ist, ziel, rest, nah:partien / jeTag, zu14:o.art === 'siege' ? x.w14 : o.art === 'partien' ? x.g14 : x.gf14});
      });
      let P = null; try { P = prestigeOf(id); } catch(e){ P = null; }
      if(P && P.naechste && P.punkte > 0){
        const spanne = Math.max(1, P.naechste.min - P.insignie.min);
        if(P.fehlt / spanne <= MARKE_PRESTIGE_REST) kand.push({id, art:'prestige', ist:P.punkte, ziel:P.naechste.min,
          rest:P.fehlt, nah:P.fehlt / spanne / MARKE_PRESTIGE_REST, stufe:P.naechste.key, name:P.naechste.name,
          vonMin:P.insignie.min, vonKey:P.insignie.key, vonName:P.insignie.name});
      }
    });
    if(!kand.length) return null;
    kand.sort((a, b) => a.nah - b.nah || b.ziel - a.ziel || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
    // Je Spieler seine nächste Marke, gezogen unter den drei nächsten.
    const je = kand.filter((y, i) => kand.findIndex(z => z.id === y.id) === i);
    const c = ziehe(je, rng), n = nameOf(c.id), x = von(c.id);
    // Fehlt genau eins, steht der Spieler davor: „fehlt ein Sieg bis zum
    // 50." endete auf der Ordnungszahl, „bis zum 50. Sieg" nannte den Sieg
    // zweimal.
    const einer = c.rest === 1;
    const title = c.art === 'prestige' ? `${n} fehlen ${c.rest} Prestige bis zum ${c.name}`
      : c.art === 'siege' ? (einer ? `${n} steht vor dem ${c.ziel}. Sieg` : `${n} fehlen ${c.rest} Siege bis zum ${c.ziel}. Sieg`)
      : c.art === 'partien' ? (einer ? `${n} steht vor der ${c.ziel}. Partie` : `${n} fehlen ${c.rest} Partien bis zur ${c.ziel}. Partie`)
      : (einer ? `${n} steht vor dem ${c.ziel}. Tor` : `${n} fehlen ${c.rest} Tore bis zum ${c.ziel}. Tor`);
    // „Es fehlt ein Sieg" stand unter „steht vor dem 250. Sieg": derselbe
    // Satz zweimal.
    const desc = c.art === 'prestige'
      ? `${n} hat ${c.ist} Prestige. Vom ${c.vonName} bis zum ${c.name} sind ${pct(1 - c.rest / Math.max(1, c.ziel - c.vonMin))}\u00a0% geschafft.`
      : c.art === 'siege' ? `${c.ist} Siege aus ${x.g} Partien. In den letzten 14 Tagen kamen ${c.zu14} dazu.`
        : c.art === 'partien' ? `${c.ist} Partien bisher. In den letzten 14 Tagen kamen ${c.zu14} dazu.`
        : `${c.ist} Tore aus ${x.g} Partien. In den letzten 14 Tagen kamen ${c.zu14} dazu.`;
    // Die Marke davor ist der Anfang des Rings: er zeigt den Weg von der
    // letzten runden Zahl zur nächsten, nicht von null.
    let vorher = c.art === 'prestige' ? c.vonMin : 0;
    if(c.art !== 'prestige'){
      const rund = c.art === 'tore' ? toreRund : (v => _rundeMarke(v, 50));
      for(let v = c.ist; v > 0; v--) if(rund(v)){ vorher = v; break; }
    }
    return { cat:'personal', ic:c.art === 'prestige' ? 'peak' : 'marke', prio:5,
      title, desc: tausender(desc), vv:String(c.rest), vl:c.art === 'prestige' ? 'Prestige fehlen' : c.art === 'siege' ? (einer ? 'Sieg fehlt' : 'Siege fehlen')
        : c.art === 'partien' ? (einer ? 'Partie fehlt' : 'Partien fehlen') : (einer ? 'Tor fehlt' : 'Tore fehlen'),
      dataRef:{ ambientPid:c.id, prestige:c.art === 'prestige',
        bild:{f:'marke', p:c.id, art:c.art, ist:c.ist, ziel:c.ziel, vorher, rest:c.rest,
          stufe:c.stufe || null, name:c.name || null, vonKey:c.vonKey || null} } };
  }});

  // ── 5. Die Chronik einer Laufbahn ───────────────────────────────────
  // Die Chronik vergibt jeden Monat ihre Einträge [§C39], und wer sie
  // Monat für Monat hält, sieht man nur in der Matrix. Gezählt werden die
  // abgeschlossenen Monate: der laufende kann bis zu seinem Ende noch
  // wechseln. Er steht im Bild gestrichelt dabei, wie in der Matrix, und
  // zählt nicht mit. Eine Schattenseite zählt nicht als Eintrag einer
  // Reihe — sie steht rot in der Zelle, aber eine Reihe aus Schattenseiten
  // ist kein Fun Fact über jemanden.
  //   gold   in jedem der letzten Monate ein legendärer Eintrag, ab zwei
  //   reihe  in jedem der letzten Monate ein Eintrag, ab CHRONIK_MIN_REIHE,
  //          und nur, solange es höchstens CHRONIK_MAX_GLEICH andere so
  //          weit gebracht haben: an den echten Partien hielten zehn von
  //          zwölf im Juni und im Juli einen Eintrag, und „steht in jedem
  //          Monat" war dann die Regel und keine Nachricht
  //   neu    der erste Eintrag überhaupt im letzten Monat, nach Monaten ohne
  const CHRONIK_MIN_REIHE = 3, CHRONIK_MAX_GLEICH = 2, CHRONIK_MIN_GOLD = 2;
  T.push({ key:'chronik_reihe', make: rng => {
    let alle = [];
    try { alle = allSeasonTitles().slice().reverse(); } catch(e){ alle = []; }
    const zu = alle.filter(t => !t.live && seasonEnd(t.sid).getTime() <= jetzt);
    if(zu.length < 2) return null;
    const cols = alle.filter(t => seasonStart(t.sid).getTime() <= jetzt).slice(-8);
    const zellen = id => cols.map(t => {
      const a = chronikEintragVon(t, id), offen = !zu.includes(t);
      const gewertet = (t.awarded || []).some(x => x.pid === id) || (t.empty || []).includes(id);
      if(!a) return [t.sid, gewertet ? '' : null, '', '', offen ? 1 : 0];
      return [t.sid, chronikZellStufe(t, id) || '', a.ic || 'trophy', a.short || a.name || '', offen ? 1 : 0];
    });
    const kand = [];
    activePids.forEach(id => {
      const z = zellen(id), fest = z.filter(c => !c[4]);
      const positiv = c => !!(c[1] && c[1] !== 'schatten');
      let lauf = 0, gold = 0;
      for(let i = fest.length - 1; i >= 0 && positiv(fest[i]); i--) lauf++;
      for(let i = fest.length - 1; i >= 0 && fest[i][1] === 'legendaer'; i--) gold++;
      const gesamt = fest.filter(positiv).length, gespielt = fest.filter(c => c[1] !== null).length;
      if(gold >= CHRONIK_MIN_GOLD) kand.push({id, art:'gold', z, lauf:gold, w:300 + gold});
      else if(lauf >= CHRONIK_MIN_REIHE) kand.push({id, art:'reihe', z, lauf, w:200 + lauf});
      else if(gesamt === 1 && positiv(fest[fest.length - 1]) && gespielt >= 3) kand.push({id, art:'neu', z, lauf:1, w:100 + gespielt});
    });
    const gleich = c => kand.filter(y => y.art === c.art && y.lauf >= c.lauf).length - 1;
    const r = kand.filter(c => c.art !== 'reihe' || gleich(c) <= CHRONIK_MAX_GLEICH)
      .sort((a, b) => b.w - a.w || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
    if(!r.length) return null;
    const c = ziehe(r, rng), n = nameOf(c.id), letzterT = zu[zu.length - 1];
    const monat = sid => String(seasonLabel(sid)).split(' ')[0];
    const e = chronikEintragVon(letzterT, c.id) || {};
    const andere = gleich(c);
    const zahl = wort(c.lauf).replace(/^./, s => s.toUpperCase());
    const title = c.art === 'gold' ? `${n} hält ${wort(c.lauf)} Monate in Folge eine legendäre Chronik`
      : c.art === 'reihe' ? `${n} steht seit ${monat(c.z.filter(y => !y[4]).slice(-c.lauf)[0][0])} in jedem Monat der Chronik`
      : `${n} steht zum ersten Mal in der Chronik`;
    const desc = c.art === 'neu'
      ? `Im ${monat(letzterT.sid)} kam „${e.name || 'der erste Eintrag'}“ dazu. Davor blieben ${wort(c.z.filter(y => !y[4] && y[1] !== null).length - 1)} Monate ohne Eintrag.`
      : `Zuletzt kam im ${monat(letzterT.sid)} „${e.name || ''}“ dazu. `
        + (andere > 0 ? `${zahl} Monate in Folge schaffte sonst nur ${andere === 1 ? 'einer' : wort(andere)}.`
          : `Das schaffte sonst keiner.`);
    return { cat:'history', ic:'verlauf', prio:4, title, desc,
      vv:String(c.lauf), vl:c.art === 'neu' ? 'erster Eintrag' : 'Monate in Folge',
      dataRef:{ ambientPid:c.id, bild:{f:'chronik', p:c.id, art:c.art, z:c.z, lauf:c.lauf} } };
  }});

  // ── 6. Die Chemie eines Duos ────────────────────────────────────────
  // Dieselbe Rechnung wie das Netz der Duos [§C44]: Sieg und Torverhältnis
  // gegen die Erwartung der Partie, je zur Hälfte, die Summe geteilt durch
  // die gemeinsamen Partien plus `POS_SCHRUMPF`. Die Siegquote fragte etwas
  // anderes: zwei Starke gewinnen zusammen immer, zwei Schwächere nie, und
  // „gewinnen zusammen" stand über einem Duo, das genau so spielte, wie
  // seine Elo es versprach. Gezeigt wird nur ein Duo, das in den vierzehn
  // Tagen zusammen gespielt hat — die Chemie von vor drei Monaten ist
  // Geschichte, kein Fun Fact.
  const CHEMIE_MIN_PARTIEN = 12, CHEMIE_MIN_WERT = .05;
  T.push({ key:'duo_chemie', make: rng => {
    const duo = {};
    lage().bis.forEach(m => {
      const e = m.exp_a != null && isFinite(m.exp_a) ? Number(m.exp_a) : .5;
      [[m.a1, m.a2, m.winner === 'A', m.score_a, m.score_b, e], [m.b1, m.b2, m.winner === 'B', m.score_b, m.score_a, 1 - e]]
        .forEach(([a, b, w, gf, ga, ex]) => {
          if(!a || !b || !aktiv(a) || !aktiv(b)) return;
          const k = paarKey(a, b), d = duo[k] || (duo[k] = {g:0, s:0, w:0, e:0, t:0});
          d.g++; if(w) d.w++; d.e += ex; d.t = Math.max(d.t, mts(m));
          d.s += ((w ? 1 : 0) - ex + posTorLeistung(gf, ga, ex)) / 2;
        });
    });
    const wert = k => duo[k].s / (duo[k].g + POS_SCHRUMPF);
    const ks = Object.keys(duo).filter(k => duo[k].g >= CHEMIE_MIN_PARTIEN && duo[k].t >= ab14 && wert(k) >= CHEMIE_MIN_WERT)
      .sort((a, b) => wert(b) - wert(a) || duo[b].g - duo[a].g || (a < b ? -1 : 1));
    if(!ks.length) return null;
    const k = ziehe(ks, rng), d = duo[k], [a, b] = k.split('|');
    // Gewählt wird nach der Rechnung des Netzes; gesagt wird, was man
    // nachzählen kann: Siege gegen die Siege, die die Elo erwarten ließ.
    // „Kein Duo spielt deutlicher über der Erwartung als …" verstand beim
    // ersten Lesen niemand.
    const pp = Math.round(wert(k) * 100), mehr = Math.round(d.w - d.e);
    const nn = `${nameOf(a)} und ${nameOf(b)}`;
    return { cat:'team', ic:'duo', prio:5,
      title:mehr >= 2 ? `${nn} gewinnen ${wort(mehr)} Partien mehr als erwartet` : `${nn} gewinnen zusammen mehr als erwartet`,
      // Die Zahlen stehen in der Bahn darunter; der Satz sagt, woher die
      // Erwartung kommt. „Die Elo der vier ließ 43,7 erwarten" warf die
      // Frage auf, was die Gegner damit zu tun haben.
      desc:`Erwartet ist, was die Elo beider Duos vor jeder Partie voraussagt.`,
      vv:'+' + mehr, vl:'Siege mehr als erwartet',
      // Ohne zweites Duo im Bild: eine Karte über ein Duo zeigte zwei, und
      // „Julian und Henry · 18 Partien" hatte mit der Aussage nichts zu tun.
      dataRef:{ ambientPids:[a, b], pairKind:'team', bild:{f:'chemie', a, b, pp, m:mehr, g:d.g, w:d.w, e:+d.e.toFixed(1)} } };
  }});

  // ── 7. Die Rolle: wo jemand spielt und wo er besser ist ─────────────
  // Das Positionsprofil [§C44] und seine Landkarte: waagerecht, wo jemand
  // spielt, senkrecht, wo er gegen den eigenen Schnitt besser ist. Zwei
  // Geschichten erzählt sie: der Wechsel (in den vierzehn Tagen steht
  // jemand deutlich öfter auf der anderen Seite als davor) und der Spieler,
  // der meist auf der Seite steht, auf der er schwächer ist. Der Wechsel
  // geht vor, er ist eine Entwicklung. „X gehört nach vorn" maß die rohe
  // Siegquote je Position und widersprach damit dem Profil im Profil.
  const ROLLE_MIN_PARTIEN = 10, ROLLE_MIN_LAUFBAHN = 30, ROLLE_MIN_WECHSEL = .35;
  const ROLLE_MIN_GESAMT = 40, ROLLE_MIN_ABSTAND = .05, ROLLE_MIN_ANTEIL = .6;
  T.push({ key:'rolle_seite', make: rng => {
    const L = {};
    activePids.forEach(id => { try { L[id] = positionsLage(posPerfFrom(id, lage().bis)); } catch(e){} });
    const ids = Object.keys(L).filter(id => L[id].aG + L[id].dG > 0);
    if(!ids.length) return null;
    const skala = Math.max(.10, ...ids.map(id => Math.abs(L[id].rA - L[id].rD)));
    const pp = v => Math.round(Math.abs(v) * 100);
    const bonus = (l, pos) => { try { return Math.round((posFactor(l, pos, cfg.pos_swing) - 1) * 100); } catch(e){ return 0; } };
    const wechsel = besteNach(ids.filter(id => { const x = von(id); return x && x.g14 >= ROLLE_MIN_PARTIEN && x.gV >= ROLLE_MIN_LAUFBAHN; }),
      id => { const x = von(id); return Math.abs(x.aG14 / x.g14 - x.aGV / x.gV); }).filter(y => y.v >= ROLLE_MIN_WECHSEL);
    // Beim Wechsel steht das Gesicht dort, wo der Spieler in den vierzehn
    // Tagen stand, und der Ring dort, wo er davor stand; die Höhe bleibt die
    // des Profils über die ganze Laufbahn.
    const bild = (id, art, a, a0) => ({f:'landkarte', p:id, art, a:+a.toFixed(3), d:+(L[id].rA - L[id].rD).toFixed(3),
      st:L[id].staerker, s:+skala.toFixed(3), a0:a0 == null ? null : +a0.toFixed(3),
      aG:L[id].aG, dG:L[id].dG, rA:Math.round(L[id].rA * 100), rD:Math.round(L[id].rD * 100),
      // Was das Profil in der Elo bewirkt: der Positionsbonus eines Siegs
      // auf jeder Seite [§C44], so wie er am Tag der Karte galt.
      fa:bonus(L[id], 'atk'), fd:bonus(L[id], 'def')});
    const schwach = besteNach(ids.filter(id => {
      const l = L[id];
      if(l.aG + l.dG < ROLLE_MIN_GESAMT || l.staerker === 'beide' || Math.abs(l.rA - l.rD) < ROLLE_MIN_ABSTAND) return false;
      return (l.staerker === 'atk' ? 1 - l.anteil : l.anteil) >= ROLLE_MIN_ANTEIL;
    }), id => Math.abs(L[id].rA - L[id].rD));
    const alle = wechsel.map(y => ({id:y.id, art:'wechsel'}))
      .concat(schwach.filter(y => !wechsel.some(w => w.id === y.id)).map(y => ({id:y.id, art:'schwach'})));
    if(!alle.length) return null;
    const wahl = ziehe(alle, rng);
    if(wahl.art === 'wechsel'){
      const id = wahl.id, x = von(id), sturm = x.aG14 / x.g14 > x.aGV / x.gV;
      const jetztN = sturm ? x.aG14 : x.dG14, vorQ = pct(sturm ? x.aGV / x.gV : x.dGV / x.gV);
      const wo = sturm ? 'im Sturm' : 'in der Abwehr';
      const st = L[id].staerker;
      return { cat:'personal', ic:'sideSwap', prio:5,
        title:`${nameOf(id)} steht zuletzt meist ${wo}`,
        desc:`In 14 Tagen stand ${nameOf(id)} in ${jetztN} von ${x.g14} Partien ${wo}, davor in ${vorQ}\u00a0%. `
          + (st === 'beide' ? `Sturm und Abwehr liegen ${nameOf(id)} gleich gut.`
            : `Stärker ist ${nameOf(id)} ${st === 'atk' ? 'im Sturm' : 'in der Abwehr'}.`),
        vv:pct(jetztN / x.g14) + '\u00a0%', vl:wo,
        dataRef:{ ambientPid:id, bild:bild(id, 'wechsel', x.aG14 / x.g14, x.aGV / x.gV) } };
    }
    const id = wahl.id, l = L[id], sturmStark = l.staerker === 'atk';
    const n = l.aG + l.dG, dort = sturmStark ? l.dG : l.aG;
    const stark = sturmStark ? l.rA : l.rD, schw = sturmStark ? l.rD : l.rA;
    return { cat:'personal', ic:'sideSwap', prio:4,
      title:`${nameOf(id)} steht meist ${sturmStark ? 'in der Abwehr' : 'im Sturm'} und ist ${sturmStark ? 'im Sturm' : 'in der Abwehr'} stärker`,
      // Die Zahl des Profils steht im Bild und im Blatt; der Satz sagt,
      // was sie heißt. „5 Prozentpunkte über dem eigenen Schnitt" las
      // niemand als „spielt dort besser".
      desc:`${dort} von ${n} Partien ${sturmStark ? 'in der Abwehr' : 'im Sturm'}. `
        + `${sturmStark ? 'Im Sturm' : 'In der Abwehr'} spielt ${nameOf(id)} besser als im eigenen Schnitt.`,
      vv:pct(dort / n) + '\u00a0%', vl:sturmStark ? 'in der Abwehr' : 'im Sturm',
      dataRef:{ ambientPid:id, bild:bild(id, 'schwach', l.anteil, null) } };
  }});

  // ── 8. Die Liga in Zahlen: eine runde Marke und wie sie wuchs ───────
  // Hier standen „7.512 Tore in 466 Partien" und „Die Liga lebt seit 96
  // Tagen" — Zahlen, die jeden Tag stimmten und an keinem eine Nachricht
  // waren. Die Karte meldet sich jetzt nur, wenn die Liga eine runde Marke
  // überschritten hat, in den sieben Tagen davor, und zeigt dazu jeden
  // Monat als Säule: so sieht man, ob die Liga schneller wird. Die Partie,
  // die die Marke riss, steht mit ihren Siegern im Satz.
  const LIGA_FRISCH_TAGE = 7;
  T.push({ key:'liga_marke', make: () => {
    const bis = lage().bis;
    if(bis.length < 50) return null;
    const rundP = v => v >= 100 && (v < 1000 ? v % 100 === 0 : v % 500 === 0);
    const rundT = v => v >= 1000 && (v < 20000 ? v % 1000 === 0 : v % 5000 === 0);
    let tore = 0, hit = null;
    bis.forEach((m, i) => {
      const vor = tore; tore += (m.score_a || 0) + (m.score_b || 0);
      if(mts(m) < jetzt - LIGA_FRISCH_TAGE * TAG) return;
      if(rundP(i + 1)) hit = {art:'partien', n:i + 1, m};
      else if(!hit || hit.art !== 'partien'){ for(let v = vor + 1; v <= tore; v++) if(rundT(v)){ hit = {art:'tore', n:v, m}; } }
    });
    if(!hit) return null;
    const mon = {};
    bis.forEach(m => { const sid = (seasonOf(m.created_at) || {}).id; if(!sid) return;
      mon[sid] = (mon[sid] || 0) + (hit.art === 'partien' ? 1 : (m.score_a || 0) + (m.score_b || 0)); });
    const sids = Object.keys(mon).sort().slice(-8);
    const cur = (seasonOf(hit.m.created_at) || {}).id;
    const sieger = (hit.m.winner === 'A' ? [hit.m.a1, hit.m.a2] : [hit.m.b1, hit.m.b2]).filter(id => sichtbar(pm[id]));
    const wer = sieger.length ? _namenListe(sieger.map(nameOf)) : '';
    const monat = seasonLabel(cur).split(' ')[0], im = mon[cur] || 0;
    const davor = sids.filter(s => s < cur).map(s => mon[s]);
    const vergleich = davor.length && im > Math.max(...davor) ? `, mehr als in jedem Monat davor` : '';
    const tag = datumFmt(hit.m.created_at, 'tmx');
    const einheit = hit.art === 'partien' ? 'Partien' : 'Tore';
    return { cat:'history', ic:'hundred', prio:5,
      title: hit.art === 'partien' ? `Die Liga hat ihre ${hit.n}. Partie gespielt` : `In der Liga ist das ${hit.n}. Tor gefallen`,
      desc: tausender((wer ? `${wer} ${sieger.length > 1 ? 'gewannen' : 'gewann'} die Partie am ${tag} mit ${standFuer(hit.m)}. ` : `Gespielt wurde sie am ${tag}. `)
        + `Im ${monat} ${hit.art === 'partien' ? 'sind es' : 'fielen'} bisher ${im} ${einheit}${vergleich}.`),
      vv:String(hit.n), vl:einheit,
      dataRef:{ ambientPids:sieger.slice(0, 2), bild:{f:'liga', art:hit.art, n:hit.n, mid:hit.m.id, sieger,
        summe:[bis.length, tore, new Set(bis.map(m => tagKey(m.created_at))).size], stand:standFuer(hit.m),
        m:sids.map(s => [String(seasonLabel(s)).split(' ')[0].slice(0, 3), mon[s]]), hl:sids.indexOf(cur)} } };
  }});

  // ══ Die zweite Runde: Stände der Liga, Duos, Saisons ══════════════════
  // Mit acht Fragen blieb an rund jedem zweiten stillen Tag der Slot leer:
  // die Sperre derselben These über dieselbe Person hält dreißig Tage, und
  // acht Fragen über zwölf Spieler waren nach zwei Wochen ausgesprochen.
  // Abwechslung entsteht durch mehr Fragen, nicht durch eine weichere
  // Sperre [§C33]. Jede Frage unten fragt etwas, das keine andere fragt,
  // und jede liest die Rechnung des Teils der App, zu dem ihr Knopf führt.

  // Der Monat der Ziehung. `currentSeason` fragt die Uhr des Geräts, und ein
  // nachgetragener Slot gehört dem Monat seines Tages.
  const sidJetzt = (seasonOf(now) || {}).id || null;
  const tagImMonat = now.getDate();
  const monatVon = sid => String(seasonLabel(sid)).split(' ')[0];
  const sidVor = sid => { const [y, mo] = String(sid).split('-').map(Number);
    return mo > 1 ? y + '-' + String(mo - 1).padStart(2, '0') : (y - 1) + '-12'; };
  const sichtbarId = id => !!pm[id] && sichtbar(pm[id]);

  // ── Ein zweiter Durchgang für Reihen, Duos und Duelle ─────────────────
  // Die laufende Serie und die beste je Spieler, die Elo jeder Saison mit
  // ihrem höchsten Stand, jede gemeinsame Partie eines Duos in Folge und
  // jedes Duell zweier Spieler — alles bis zur Ziehung, in einem Lauf.
  let _memoV = null;
  const verlauf = () => {
    if(_memoV) return _memoV;
    const je = {}, duo = {}, duell = {};
    const zu = id => je[id] || (je[id] = {serie:0, best:0, seit:0, peak:null, peakSid:null, sid:{}, partner:new Map(), mitAb:new Map()});
    lage().bis.forEach(m => {
      const t = mts(m), sid = (seasonOf(m.created_at) || {}).id, aW = m.winner === 'A', dl = m.deltas || {};
      [[m.a1, m.a2, aW, m.score_a, m.score_b], [m.b1, m.b2, !aW, m.score_b, m.score_a]].forEach(([x, y, w, gf, ga]) => {
        [[x, y], [y, x]].forEach(([id, mit]) => {
          if(!id || !pm[id]) return;
          const z = zu(id), s = z.sid[sid] || (z.sid[sid] = {g:0, w:0, e:0});
          s.g++; if(w) s.w++; s.e += Number(dl[id]) || 0;
          // Die Elo einer Saison beginnt bei `cfg.start_elo` und ist die
          // Summe ihrer Punkte — dieselbe Zahl wie `seasonEndElos`, aber an
          // jedem Schnitt.
          const elo = cfg.start_elo + s.e;
          if(z.peak == null || elo > z.peak){ z.peak = elo; z.peakSid = sid; z.peakT = t; }
          z.serie = w ? z.serie + 1 : 0;
          if(w && z.serie === 1) z.seit = t;
          if(z.serie > z.best) z.best = z.serie;
          if(mit && pm[mit]){ z.partner.set(mit, (z.partner.get(mit) || 0) + 1); if(!z.mitAb.has(mit)) z.mitAb.set(mit, t); }
        });
        if(!x || !y || !pm[x] || !pm[y]) return;
        const k = paarKey(x, y), d = duo[k] || (duo[k] = {g:0, w:0, gf:0, ga:0, serie:0, best:0, t:0, se:{}, sg:{}, l:[]});
        d.g++; if(w) d.w++; d.gf += gf || 0; d.ga += ga || 0; d.t = t;
        d.serie = w ? d.serie + 1 : 0; if(d.serie > d.best) d.best = d.serie;
        d.l.push([t, w ? 1 : 0, gf || 0, ga || 0]);
        // Der gemeinsame Elo-Zuwachs eines Monats, die Rechnung des Teams
        // der Saison (`_seasonTeamOfBerechnet`: die Punkte beider aus den
        // gemeinsamen Partien).
        d.se[sid] = (d.se[sid] || 0) + (Number(dl[x]) || 0) + (Number(dl[y]) || 0);
        d.sg[sid] = (d.sg[sid] || 0) + 1;
      });
      [m.a1, m.a2].forEach(a => [m.b1, m.b2].forEach(b => {
        if(!a || !b || !pm[a] || !pm[b]) return;
        const k = paarKey(a, b);
        (duell[k] || (duell[k] = [])).push([t, aW ? a : b]);
      }));
    });
    return _memoV = {je, duo, duell};
  };
  const vl = id => verlauf().je[id] || null;

  // Die Tabelle eines Monats zu einem Zeitpunkt: Elo, Partien, Siege, je
  // Spieler, der darin gespielt hat. Ein Monat ist ein Zeitraum [§C40]: wer
  // in ihm spielte, steht darin. Geordnet wie `saisonRang`, nach der Elo.
  const tabelle = (sid, bisMs) => {
    const o = {};
    lage().bis.forEach(m => {
      if(mts(m) > bisMs || (seasonOf(m.created_at) || {}).id !== sid) return;
      const aW = m.winner === 'A';
      [[m.a1, aW], [m.a2, aW], [m.b1, !aW], [m.b2, !aW]].forEach(([id, w]) => {
        if(!id || !sichtbarId(id)) return;
        const x = o[id] || (o[id] = {id, e:0, g:0, w:0});
        x.e += Number((m.deltas || {})[id]) || 0; x.g++; if(w) x.w++;
      });
    });
    return Object.values(o).map(x => ({id:x.id, elo:Math.round(cfg.start_elo + x.e), g:x.g, w:x.w}))
      .sort((a, b) => b.elo - a.elo || b.w - a.w || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
  };
  const platzIn = (l, id) => l.findIndex(x => x.id === id) + 1;

  // Die Karriere-Elo zu einem Zeitpunkt: der Schnitt der Saison-Endstände,
  // gewichtet nach Partien (`_eloErgebnis`), aus den Partien bis dahin.
  const karriere = bisMs => {
    const s = {};
    lage().bis.forEach(m => {
      if(mts(m) > bisMs) return;
      const sid = (seasonOf(m.created_at) || {}).id;
      [m.a1, m.a2, m.b1, m.b2].forEach(id => {
        if(!id || !pm[id]) return;
        const k = id + '|' + sid, x = s[k] || (s[k] = {id, e:0, g:0});
        x.e += Number((m.deltas || {})[id]) || 0; x.g++;
      });
    });
    const o = {};
    Object.values(s).forEach(x => { const y = o[x.id] || (o[x.id] = {id:x.id, sum:0, g:0});
      y.sum += (cfg.start_elo + x.e) * x.g; y.g += x.g; });
    return Object.values(o).filter(x => aktiv(x.id)).map(x => ({id:x.id, elo:Math.round(x.sum / x.g), g:x.g}))
      .sort((a, b) => b.elo - a.elo || b.g - a.g || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
  };

  // Was sich auf einem Podest in vierzehn Tagen getan hat. `jetzt` und
  // `vor` sind geordnete Listen mit `id`; zurück kommt der erste Wechsel
  // auf den drei Plätzen (wer neu oben steht, wer neu auf dem Podest) oder
  // der engste Abstand zweier Nachbarn darauf.
  const podestLage = (jetztL, vorL, wert, eng) => {
    const drei = jetztL.slice(0, 3), alt = vorL.map(x => x.id);
    const out = [];
    drei.forEach((x, i) => {
      // Wer vor vierzehn Tagen nicht in der Liste stand, ist neu darin.
      const vorher = alt.indexOf(x.id), neu = vorher < 0;
      if((neu || vorher > i) && (i === 0 || neu || vorher > 2)) out.push({art:i === 0 ? 'spitze' : 'podest', id:x.id, platz:i + 1,
        vorher:neu ? 0 : vorher + 1, ueber:vorL[i] && vorL[i].id !== x.id ? vorL[i].id : null});
    });
    for(let i = 0; i < drei.length - 1; i++){
      const d = wert(drei[i]) - wert(drei[i + 1]);
      if(d <= eng(drei[i])) out.push({art:'eng', id:drei[i + 1].id, vor:drei[i].id, platz:i + 2, d});
    }
    return out;
  };

  // ── 9. Die Spitze des Monats und wie sie sich in einer Woche bewegte ──
  // Die Tabelle des Monats mit der Bewegung seit der Vorwoche. Zur Halbzeit
  // am 15. steht schon die Halbzeit, am Anfang eines Monats sagt eine Woche
  // nichts, am Ende steht der Meister bald selbst im Feed. Erzählt wird,
  // was sich bewegt: wer in einer Woche aufs Podest kletterte, wer die
  // Spitze übernahm, oder wie eng es oben steht. Ab SPITZE_MIN_TAGE
  // Spieltagen im Monat, sonst ist die Tabelle ein Zufall der ersten Abende;
  // eng heißt höchstens SPITZE_ENG Elo, an den echten Partien trennten
  // Erste und Zweite zur Monatsmitte meist 20 bis 90.
  const SPITZE_MIN_TAGE = 5, SPITZE_ENG = 12, SPITZE_MIN_PARTIEN = 10, SPITZE_SPRUNG = 2;
  T.push({ key:'saison_spitze', make: rng => {
    if(!sidJetzt || tagImMonat < 8 || tagImMonat > 27 || tagImMonat === 15) return null;
    const ab = jetzt - 7 * TAG;
    if(ab <= seasonStart(sidJetzt).getTime()) return null;
    const tage = new Set(lage().bis.filter(m => (seasonOf(m.created_at) || {}).id === sidJetzt).map(m => tagKey(m.created_at)));
    if(tage.size < SPITZE_MIN_TAGE) return null;
    const l = tabelle(sidJetzt, jetzt), v = tabelle(sidJetzt, ab);
    if(l.length < 5) return null;
    const kand = podestLage(l, v, x => x.elo, () => SPITZE_ENG)
      .filter(c => aktiv(c.id) && (c.art !== 'podest' || c.vorher - c.platz >= SPITZE_SPRUNG || !c.vorher)
        && (l[platzIn(l, c.id) - 1] || {}).g >= SPITZE_MIN_PARTIEN
        && (c.art !== 'eng' || (l[platzIn(l, c.vor) - 1] || {}).g >= SPITZE_MIN_PARTIEN));
    if(!kand.length) return null;
    const c = ziehe(kand, rng), x = l[platzIn(l, c.id) - 1], mon = monatVon(sidJetzt);
    const y = v[platzIn(v, c.id) - 1] || null, plus = x.elo - (y ? y.elo : cfg.start_elo);
    const n = nameOf(c.id);
    let title, desc;
    if(c.art === 'spitze'){
      title = c.ueber ? `${n} übernimmt die Spitze des ${mon} von ${nameOf(c.ueber)}` : `${n} steht an der Spitze des ${mon}`;
      desc = `${n} holte in sieben Tagen ${plus} Elo. Jetzt sind es ${x.elo} aus ${x.g} Partien.`;
    } else if(c.art === 'podest'){
      title = c.vorher ? `${n} klettert in einer Woche von Platz ${c.vorher} auf Platz ${c.platz}`
        : `${n} steht nach einer Woche auf Platz ${c.platz}`;
      desc = (plus > 0 ? `${n} holte in sieben Tagen ${plus} Elo. ` : '') + `Vorn liegt ${nameOf(l[0].id)} mit ${l[0].elo} Elo.`;
    } else {
      const um = c.d === 0 ? 'keine Elo' : c.d === 1 ? 'ein Elo' : c.d + ' Elo';
      title = c.d === 0 ? `${nameOf(c.vor)} und ${n} stehen im ${mon} gleichauf auf Platz ${c.platz - 1}`
        : c.platz === 2 ? `${nameOf(c.vor)} führt im ${mon} mit ${um} vor ${n}`
        : `${nameOf(c.vor)} liegt im ${mon} ${um} vor ${n} auf Platz 2`;
      desc = `${nameOf(c.vor)} hat ${l[c.platz - 2].elo} Elo aus ${l[c.platz - 2].g} Partien, ${n} ${x.elo} aus ${x.g}.`;
    }
    const pids = c.art === 'eng' ? [c.vor, c.id] : [c.id];
    return { cat:'season', ic:'chartBar', prio:5, title, desc,
      vv:String(x.elo), vl:'Elo im ' + mon,
      dataRef:{ ambientPids:pids, bild:{f:'tabelle', sid:sidJetzt, seit:datumFmt(new Date(ab), 'tm'), hl:pids,
        z:l.slice(0, 5).map(r => [r.id, r.elo, platzIn(v, r.id), r.g])} } };
  }});

  // ── 10. Die Ewige Tafel: das Podest der Karriere-Elo ─────────────────
  // Die Karriere-Elo ist der Schnitt der Saisonenden, gewichtet nach
  // Partien, und bewegt sich langsam: ein Wechsel auf ihrem Podest ist eine
  // Nachricht, ein Stand nicht. Erzählt wird, wer in vierzehn Tagen aufs
  // Podest kam oder vorbeizog, oder welche Nachbarn darauf höchstens
  // TAFEL_ENG Elo trennen. Die Tafel ist die ganze aktive Liga, wie im
  // Reiter; wer genannt wird, hat TAFEL_MIN_PARTIEN Partien der Laufbahn,
  // so viele wie ein Monat — mit zwanzig Partien stand jemand nach seinem
  // ersten guten Monat auf dem Podest.
  const TAFEL_MIN_PARTIEN = 40, TAFEL_ENG = 10;
  T.push({ key:'tafel_karriere', make: rng => {
    const l = karriere(jetzt), v = karriere(ab14);
    if(l.length < 4 || v.length < 4) return null;
    const kand = podestLage(l, v, x => x.elo, () => TAFEL_ENG)
      .filter(c => l[c.platz - 1].g >= TAFEL_MIN_PARTIEN && (c.art !== 'eng' || l[c.platz - 2].g >= TAFEL_MIN_PARTIEN));
    if(!kand.length) return null;
    const c = ziehe(kand, rng), n = nameOf(c.id), x = l[c.platz - 1];
    const y = v.find(z => z.id === c.id);
    const title = c.art === 'spitze' ? (c.ueber ? `${n} überholt ${nameOf(c.ueber)} an der Spitze der Ewigen Tafel` : `${n} führt die Ewige Tafel an`)
      : c.art === 'podest' ? `${n} steht neu auf Platz ${c.platz} der Ewigen Tafel`
      : c.d === 0 ? `${nameOf(c.vor)} und ${n} stehen auf der Ewigen Tafel gleichauf`
      : `${nameOf(c.vor)} liegt auf der Ewigen Tafel ${c.d} Elo vor ${n}`;
    const desc = c.art === 'eng'
      ? `${nameOf(c.vor)} hat ${l[c.platz - 2].elo} Karriere-Elo aus ${l[c.platz - 2].g} Partien, ${n} ${x.elo} aus ${x.g}.`
      : c.vorher ? `Vor 14 Tagen stand ${n} auf Platz ${c.vorher}. Jetzt sind es ${x.elo} Karriere-Elo aus ${x.g} Partien.`
      : `${n} hat ${x.elo} Karriere-Elo aus ${x.g} Partien.`;
    const pids = c.art === 'eng' ? [c.vor, c.id] : [c.id];
    return { cat:'history', ic:'tafelStein', prio:5, title, desc, vv:String(x.elo), vl:'Karriere-Elo',
      dataRef:{ ambientPids:pids, bild:{f:'karriere', hl:pids,
        pd:l.slice(0, 5).map(z => ({p:z.id, t:z.elo + ' Elo', v:(v.findIndex(q => q.id === z.id) + 1) || 0, g:z.g}))} } };
  }});

  // ── 11. Die Laufbahn in Summen: wer aufholt ───────────────────────────
  // Die meisten Siege, Partien und Tore der Laufbahn, der Erste und der
  // Zweite. Ein Stand an der Spitze ist der Normalfall; erzählt wird, wenn
  // der Zweite in dreißig Tagen deutlich aufgeholt hat oder vorbeizog.
  // Aufgeholt heißt mindestens RENNEN_AUFHOLEN des alten Abstands und
  // RENNEN_MIN_ZAHL in der Einheit: an den echten Partien wuchs ein Abstand
  // um drei bis zehn Siege im Monat, und eine Partie weniger ist kein Rennen.
  // Vorbeigezogen heißt: der Zweite von heute führte vor dreißig Tagen.
  // Beide Stände brauchen RENNEN_BASIS in der Einheit — in den ersten
  // Wochen der Liga zog jeder an jedem vorbei.
  const RENNEN_AUFHOLEN = .3, RENNEN_MIN_ZAHL = {siege:4, partien:8, tore:40}, RENNEN_BASIS = {siege:50, partien:100, tore:800};
  T.push({ key:'laufbahn_rennen', make: rng => {
    const ab30 = jetzt - 30 * TAG;
    const zaehle = bisMs => { const o = {};
      lage().bis.forEach(m => { if(mts(m) > bisMs) return; const aW = m.winner === 'A';
        [[m.a1, aW, m.score_a], [m.a2, aW, m.score_a], [m.b1, !aW, m.score_b], [m.b2, !aW, m.score_b]].forEach(([id, w, gf]) => {
          if(!id || !aktiv(id)) return; const x = o[id] || (o[id] = {siege:0, partien:0, tore:0});
          x.partien++; if(w) x.siege++; x.tore += gf || 0; }); });
      return o; };
    const A = zaehle(jetzt), B = zaehle(ab30);
    const kand = [];
    ['siege', 'partien', 'tore'].forEach(art => {
      const r = Object.keys(A).sort((a, b) => A[b][art] - A[a][art] || nameOf(a).localeCompare(nameOf(b), 'de'));
      if(r.length < 3) return;
      const [eins, zwei] = r, alt = id => (B[id] || {})[art] || 0;
      if(alt(zwei) < RENNEN_BASIS[art]) return;
      const jetztAb = A[eins][art] - A[zwei][art], vorAb = alt(eins) - alt(zwei);
      // Gleichstand ist kein Überholen: „Jetzt steht es 265 zu 265".
      if(vorAb < 0 && jetztAb > 0)
        kand.push({art, an:'vorbei', p:eins, q:zwei, jetztAb, vorAb:-vorAb, w:3});
      else if(vorAb > jetztAb && vorAb - jetztAb >= RENNEN_MIN_ZAHL[art] && (vorAb - jetztAb) / Math.max(1, vorAb) >= RENNEN_AUFHOLEN)
        kand.push({art, an:'auf', p:zwei, q:eins, jetztAb, vorAb, w:2});
    });
    if(!kand.length) return null;
    kand.sort((a, b) => b.w - a.w);
    const c = ziehe(kand, rng), n = nameOf(c.p), o = nameOf(c.q);
    const wortE = {siege:['Siegen', 'Siege', 'Sieg'], partien:['Partien', 'Partien', 'Partie'], tore:['Toren', 'Tore', 'Tor']}[c.art];
    const title = c.an === 'vorbei' ? `${n} überholt ${o} bei den ${wortE[0]} der Laufbahn`
      : `${n} liegt bei den ${wortE[0]} der Laufbahn nur noch ${tausender(String(c.jetztAb))} hinter ${o}`;
    const desc = tausender(c.an === 'vorbei'
      ? `Vor 30 Tagen lag ${o} noch ${c.vorAb} ${c.vorAb === 1 ? wortE[2] : wortE[1]} vorn. Jetzt steht es ${A[c.p][c.art]} zu ${A[c.q][c.art]}.`
      : `Vor 30 Tagen waren es noch ${c.vorAb}. ${o} hat ${A[c.q][c.art]}, ${n} ${A[c.p][c.art]}.`);
    const fuehrt = c.an === 'vorbei' ? c.p : c.q, folgt = c.an === 'vorbei' ? c.q : c.p;
    return { cat:'personal', ic:'trendUp', prio:5, title, desc, vv:tausender(String(A[c.p][c.art])), vl:wortE[1],
      dataRef:{ ambientPid:c.p, bild:{f:'aufholjagd', art:c.art, an:c.an,
        z:[[fuehrt, A[fuehrt][c.art], (B[fuehrt] || {})[c.art] || 0], [folgt, A[folgt][c.art], (B[folgt] || {})[c.art] || 0]], hl:c.p} } };
  }});

  // ── 12. Die Meistertitel der Liga ─────────────────────────────────────
  // Meister ist, wer einen abgeschlossenen Monat auf Platz 1 der Elo
  // beendet (`seasonChampion`). Ab TITEL_MIN_SAISONS abgeschlossenen Monaten
  // ist das eine Reihe; ging jeder Titel an einen anderen, sagt die Karte
  // das, ohne Person.
  const TITEL_MIN_SAISONS = 3;
  T.push({ key:'titel_sterne', make: () => {
    let zu = [];
    try { zu = (allPastSeasons() || []).filter(sid => seasonEnd(sid).getTime() < jetzt).sort(); } catch(e){ zu = []; }
    const meister = zu.map(sid => [sid, seasonChampion(sid)]).filter(x => x[1] && pm[x[1]]);
    if(meister.length < TITEL_MIN_SAISONS) return null;
    const n = {};
    meister.forEach(([, pid]) => { n[pid] = (n[pid] || 0) + 1; });
    const r = Object.keys(n).filter(aktiv).sort((a, b) => n[b] - n[a] || nameOf(a).localeCompare(nameOf(b), 'de'));
    if(!r.length) return null;
    const letzter = meister[meister.length - 1], N = meister.length;
    const alleVerschieden = Object.keys(n).length === N;
    const eins = r[0], k = n[eins];
    if(!alleVerschieden && k < 2) return null;
    // Je Monat der Meister mit seiner Elo zum Monatsende und der Zweite:
    // der Abstand sagt, wie knapp der Titel war.
    const monate = meister.slice(-6).map(([sid, pid]) => { const t = tabelle(sid, seasonEnd(sid).getTime());
      return [sid, pid, (t[0] || {}).elo || 0, t[1] ? t[1].id : null, t[1] ? t[1].elo : null]; });
    const title = alleVerschieden ? `Jeder der ${wort(N)} Monate hatte einen anderen Meister`
      : k === N ? `${nameOf(eins)} holte alle ${wort(N)} Meistertitel der Liga`
      : `${nameOf(eins)} holte ${wort(k)} der ${wort(N)} Meistertitel der Liga`;
    const zuletzt = monate[monate.length - 1];
    const knapp = monate.filter(x => x[4] != null).sort((a, b) => (a[2] - a[4]) - (b[2] - b[4]))[0];
    const desc = alleVerschieden ? `Den ${monatVon(letzter[0])} gewann ${nameOf(letzter[1])}, davor ${_namenListe(meister.slice(0, -1).reverse().map(x => nameOf(x[1])))}.`
      : (k === N ? '' : `Den ${monatVon(zuletzt[0])} gewann ${nameOf(zuletzt[1])}. `)
        + (knapp ? `Am knappsten war der ${monatVon(knapp[0])}, ${knapp[2] - knapp[4]} Elo vor ${nameOf(knapp[3])}.` : '');
    return { cat:'history', ic:'trophy', prio:4, title, desc:desc.trim(), vv:String(alleVerschieden ? N : k), vl:'Meistertitel',
      dataRef:{ ambientPids:alleVerschieden ? [] : [eins], bild:{f:'meister', hl:alleVerschieden ? null : eins, m:monate} } };
  }});

  // ── 13. Die Leiter der Liga: das Prestige der Spitze ────────────────
  // Das Prestige ist die Insignium-Leiter [§C34]: die ersten fünf stehen
  // auf ihr an der Stelle ihrer Punkte, jede Stufe mit ihrem Zeichen.
  // Erzählt wird ein Wechsel auf den ersten drei Plätzen in vierzehn Tagen
  // oder ein Abstand zweier Nachbarn darauf von höchstens PRESTIGE_ENG der
  // Punkte des Vorderen. Gerechnet mit dem Zeitschnitt der Ziehung
  // (`prestigeTabelle`), wie jede Story [§11.0e].
  const PRESTIGE_ENG = .03, PRESTIGE_MIN = 300;
  T.push({ key:'prestige_leiter', make: rng => {
    let A = null, B = null;
    try { A = prestigeTabelle(jetzt); B = prestigeTabelle(ab14); } catch(e){ return null; }
    const liste = P => (P.rang || []).filter(aktiv).map(id => ({id, p:Math.round(P.byPid[id].punkte)})).filter(x => x.p > 0);
    const l = liste(A), v = liste(B);
    if(l.length < 4) return null;
    // Unter PRESTIGE_MIN Punkten ist ein Platz eine Frage der ersten
    // Auszeichnungen: am fünften Tag der Liga stand Maxi mit 29 auf Platz 2.
    const kand = podestLage(l, v, x => x.p, x => x.p * PRESTIGE_ENG).filter(c => l[c.platz - 1].p >= PRESTIGE_MIN);
    if(!kand.length) return null;
    const c = ziehe(kand, rng), n = nameOf(c.id), x = l[c.platz - 1], y = v.find(z => z.id === c.id);
    let P = null; try { P = prestigeOf(c.id, jetzt); } catch(e){ P = null; }
    const title = c.art === 'spitze' ? (c.ueber ? `${n} überholt ${nameOf(c.ueber)} im Prestige` : `${n} führt im Prestige`)
      : c.art === 'podest' ? `${n} steht im Prestige neu auf Platz ${c.platz}`
      : `${nameOf(c.vor)} liegt im Prestige ${c.d} Punkte vor ${n}`;
    const desc = tausender((c.art === 'eng'
      ? `${nameOf(c.vor)} hat ${l[c.platz - 2].p} Prestige, ${n} ${x.p}.`
      : y && y.p > 0 ? `${n} holte in 14 Tagen ${x.p - y.p} Prestige und hat jetzt ${x.p}.` : `${n} hat ${x.p} Prestige.`)
      + (P && P.insignie ? ` Das Zeichen ist der ${P.insignie.name}.` : ''));
    const pids = c.art === 'eng' ? [c.vor, c.id] : [c.id];
    const stufen = INSIGNIEN.map(s => [s.key, s.min, s.name]);
    return { cat:'personal', ic:'peak', prio:5, title, desc, vv:tausender(String(x.p)), vl:'Prestige',
      dataRef:{ ambientPids:pids, prestige:true, bild:{f:'leiter', hl:pids, st:stufen,
        z:l.slice(0, 5).map(z => { let q = null; try { q = prestigeOf(z.id, jetzt); } catch(e){}
          return [z.id, z.p, q ? q.insignie.key : null]; })} } };
  }});

  // ── 14. Die Auszeichnungen des Monats ─────────────────────────────────
  // Wer im laufenden Monat die meisten Auszeichnungen holte, gezählt wie
  // im Rückblick und in der Ehrung: als Unterschied zweier Stände des
  // Prestiges an den Grenzen des Zeitraums (`rcpLaufbahnDaten`) [§C27].
  // Verglichen mit dem ganzen Vormonat desselben Spielers — eine Zahl ohne
  // Maßstab ist ein Einzeleintrag. Ab dem 8., ab AUSZ_MIN Auszeichnungen:
  // an den echten Partien holte der Beste eines Monats 15 bis 40.
  const AUSZ_MIN = 8;
  T.push({ key:'auszeichnung_monat', make: rng => {
    if(!sidJetzt || tagImMonat < 8) return null;
    const von = seasonStart(sidJetzt).getTime() + 1;
    let D = [], V = [];
    try { D = rcpLaufbahnDaten(von, jetzt); } catch(e){ return null; }
    const vs = sidVor(sidJetzt);
    try { const g = rcpMonatGrenzen(vs); V = rcpLaufbahnDaten(g.von, g.bis); } catch(e){ V = []; }
    const zahl = x => (x.posten || []).reduce((n, q) => n + (q.mal || 0), 0);
    const r = D.filter(x => aktiv(x.pid)).map(x => ({id:x.pid, n:zahl(x), posten:x.posten || []}))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n || nameOf(a.id).localeCompare(nameOf(b.id), 'de'));
    const q = r.filter(x => x.n >= AUSZ_MIN);
    if(!q.length || r.length < 3) return null;
    const c = ziehe(q, rng), n = nameOf(c.id), mon = monatVon(sidJetzt);
    const vor = V.find(x => x.pid === c.id), vorN = vor ? zahl(vor) : 0;
    const gold = c.posten.filter(p => p.klasse === 'legendary').reduce((s, p) => s + p.mal, 0);
    const allein = c === r[0] && (!r[1] || r[1].n < c.n);
    const mehr = r.filter(x => x.n > c.n).map(x => nameOf(x.id)), gleich = r.filter(x => x !== c && x.n === c.n).map(x => nameOf(x.id));
    const title = allein ? `${n} holt im ${mon} die meisten Auszeichnungen` : `${n} holt im ${mon} schon ${c.n} Auszeichnungen`;
    const desc = (allein ? `Es sind ${c.n}` + (gold ? `, ${gold === 1 ? 'eine' : wort(gold)} davon legendär. ` : '. ')
      : mehr.length ? `Mehr ${mehr.length > 1 ? 'holten' : 'holte'} nur ${_namenListe(mehr)}. `
      : `Genauso viele ${gleich.length > 1 ? 'holten' : 'holte'} ${_namenListe(gleich)}. `)
      // Einen Vormonat ohne eine Partie der Liga gibt es nicht: „Im April
      // holte Maxi keine" stand im ersten Monat.
      + (vorN ? `Im ganzen ${monatVon(vs)} waren es ${vorN}.`
        : lage().bis.some(m => (seasonOf(m.created_at) || {}).id === vs) ? `Im ${monatVon(vs)} holte ${n} keine.` : '');
    // Je Zeile die Felder ihrer Klassen: legendär, selten, gewöhnlich.
    const klassen = x => ['legendary', 'rare', 'common'].map(k => x.posten.filter(p => p.klasse === k).reduce((s, p) => s + p.mal, 0));
    const zeilen = r.slice(0, 3).concat(r.indexOf(c) > 2 ? [c] : []).slice(-3);
    return { cat:'personal', ic:'medal', prio:5, title, desc:desc.trim(), vv:String(c.n), vl:'im ' + mon,
      dataRef:{ ambientPid:c.id, bild:{f:'ausbeute', sid:sidJetzt, hl:c.id, vor:vorN, vm:monatVon(vs),
        z:zeilen.map(x => [x.id, x.n].concat(klassen(x)))} } };
  }});

  // ── 15. Eine laufende Serie und wie weit es zur Bestmarke ist ────────
  // Wer gerade SERIE_MIN Partien in Folge gewonnen hat, gegen die eigene
  // beste Serie und die längste der Liga (der Rekord „Der Unaufhaltsame").
  // Eine Serie ist erst ab fünf eine Nachricht: an den echten Partien hatte
  // fast jeder schon einmal vier in Folge.
  const SERIE_MIN = 5;
  T.push({ key:'form_serie', make: rng => {
    const ids = activePids.filter(id => { const z = vl(id); return z && z.serie >= SERIE_MIN; });
    if(!ids.length) return null;
    const r = besteNach(ids, id => vl(id).serie);
    const c = ziehe(r, rng), z = vl(c.id), n = nameOf(c.id);
    // Die längste Serie der anderen: wer den Rekord selbst hält, steht
    // sonst neben seiner eigenen Zahl.
    const liga = Math.max(0, ...Object.keys(verlauf().je).filter(id => id !== c.id && aktiv(id)).map(id => verlauf().je[id].best));
    const eigen = z.best, ab = datumFmt(new Date(z.seit), 'tm');
    const title = z.serie > liga ? `${n} gewinnt ${z.serie} Partien in Folge, länger als jede Serie der Liga`
      : z.serie === liga ? `${n} stellt mit ${z.serie} Siegen in Folge die längste Serie der Liga ein`
      : z.serie >= eigen ? `${n} gewinnt ${z.serie} Partien in Folge, so viele wie nie zuvor`
      : `${n} gewinnt seit ${z.serie} Partien`;
    const desc = `Seit dem ${ab} hat ${n} keine Partie verloren. `
      + (z.serie >= liga ? `Die längste Serie eines anderen liegt bei ${liga}.`
        : z.serie >= eigen ? `Die längste der Liga liegt bei ${liga}.`
        : eigen >= liga ? `Den Rekord der Liga hält ${n} selbst, mit ${eigen}.`
        : `Die eigene Bestmarke liegt bei ${eigen}, die der Liga bei ${liga}.`);
    return { cat:'personal', ic:'flame', prio:5, title, desc, vv:String(z.serie), vl:'Siege in Folge',
      dataRef:{ ambientPid:c.id, bild:{f:'serie', p:c.id, n:z.serie, best:eigen, liga, seit:ab} } };
  }});

  // ── 16. So hoch wie nie: die Elo des Monats gegen den eigenen Gipfel ──
  // Die Elo beginnt jeden Monat bei null [§3.5a]; der höchste Stand, den
  // jemand je in einem Monat hatte, ist der eigene Gipfel. Erzählt wird,
  // wer ihn in diesem Monat erreicht hat oder höchstens GIPFEL_NAH davor
  // steht, ab GIPFEL_MIN_PARTIEN im Monat und GIPFEL_MIN_ELO: ein Gipfel
  // bei 60 Elo ist keiner.
  const GIPFEL_NAH = 25, GIPFEL_MIN_PARTIEN = 10, GIPFEL_MIN_ELO = 150;
  T.push({ key:'form_gipfel', make: rng => {
    if(!sidJetzt) return null;
    const kand = [];
    activePids.forEach(id => {
      const z = vl(id), s = z && z.sid[sidJetzt];
      if(!s || s.g < GIPFEL_MIN_PARTIEN || z.peak == null || z.peak < GIPFEL_MIN_ELO) return;
      const elo = cfg.start_elo + s.e, frisch = z.peakSid === sidJetzt && z.peakT >= ab14;
      if(frisch || z.peak - elo <= GIPFEL_NAH) kand.push({id, elo:Math.round(elo), peak:Math.round(z.peak), frisch, sid:z.peakSid});
    });
    if(!kand.length) return null;
    kand.sort((a, b) => (b.frisch - a.frisch) || b.peak - a.peak);
    const c = ziehe(kand, rng), n = nameOf(c.id), mon = monatVon(sidJetzt);
    // Der Verlauf des Monats Partie für Partie: am Ende eines Spieltags
    // fehlte der Gipfel, wenn er mitten am Tag lag.
    const tage = [];
    let sum = cfg.start_elo;
    const v = [cfg.start_elo];
    lage().bis.filter(m => (seasonOf(m.created_at) || {}).id === sidJetzt && [m.a1, m.a2, m.b1, m.b2].includes(c.id))
      .forEach(m => { sum += Number((m.deltas || {})[c.id]) || 0; v.push(Math.round(sum)); tage.push(tagKey(m.created_at)); });
    // Der höchste Stand vor diesem Monat, für den Satz und als Linie im
    // Bild: so hoch stand die Elo in keinem Monat davor.
    let vorher = null;
    { const s2 = {};
      lage().bis.forEach(m => { const sid = (seasonOf(m.created_at) || {}).id; if(sid === sidJetzt || ![m.a1, m.a2, m.b1, m.b2].includes(c.id)) return;
        s2[sid] = (s2[sid] || cfg.start_elo) + (Number((m.deltas || {})[c.id]) || 0);
        if(vorher == null || s2[sid] > vorher.e) vorher = {e:Math.round(s2[sid]), sid}; }); }
    const neu = c.sid === sidJetzt;
    const title = neu ? (c.elo >= c.peak ? `${n} steht mit ${c.elo} Elo so hoch wie nie` : `${n} erreichte im ${mon} den eigenen Höchststand`)
      : `${n} fehlen ${c.peak - c.elo} Elo zum eigenen Höchststand`;
    const desc = neu
      ? (c.elo < c.peak ? `Der Höchststand lag bei ${c.peak} Elo, jetzt sind es ${c.elo}. ` : '')
        + (vorher ? `In keinem Monat davor kam ${n} über ${vorher.e}.` : '')
      : `Den Höchststand von ${c.peak} Elo erreichte ${n} im ${monatVon(c.sid)}. Im ${mon} sind es jetzt ${c.elo}.`;
    const tg = tage;
    return { cat:'personal', ic:'peak', prio:5, title, desc:desc.trim(), vv:String(c.elo), vl:'Elo im ' + mon,
      dataRef:{ ambientPid:c.id, bild:{f:'gipfel', p:c.id, v, peak:neu ? (vorher ? vorher.e : null) : c.peak, neu:neu ? 1 : 0,
        x:tg.length ? [datumFmt(new Date(tg[0] + 'T12:00:00'), 'tm'), datumFmt(new Date(tg[tg.length - 1] + 'T12:00:00'), 'tm')] : [], mon} } };
  }});

  // ── 17. Der Monat gegen den Monat davor ───────────────────────────────
  // Wer jetzt auf dem Podest des Monats steht und den Monat davor weit
  // hinten beendete — der Sprung zwischen zwei Saisons. Ein Platz ist nur
  // auf dem Podest ein Fun Fact [§C33], also nur nach oben. Die Plätze der
  // letzten Monate stehen im Bild als Reihe, wie im Positionsverlauf.
  // Ab VERGLEICH_MIN_PARTIEN Partien in beiden Monaten und VERGLEICH_SPRUNG
  // Plätzen Sprung, ab dem 8. des Monats.
  const VERGLEICH_MIN_PARTIEN = 10, VERGLEICH_SPRUNG = 3;
  T.push({ key:'saison_vergleich', make: rng => {
    if(!sidJetzt || tagImMonat < 8) return null;
    const vs = sidVor(sidJetzt);
    const l = tabelle(sidJetzt, jetzt), v = tabelle(vs, seasonEnd(vs).getTime());
    if(l.length < 5 || v.length < 5) return null;
    const kand = l.slice(0, 3).map((x, i) => ({x, i, y:v.find(z => z.id === x.id)}))
      .filter(c => aktiv(c.x.id) && c.y && c.x.g >= VERGLEICH_MIN_PARTIEN && c.y.g >= VERGLEICH_MIN_PARTIEN
        && platzIn(v, c.x.id) - (c.i + 1) >= VERGLEICH_SPRUNG);
    if(!kand.length) return null;
    const c = ziehe(kand, rng), n = nameOf(c.x.id), pv = platzIn(v, c.x.id), mon = monatVon(sidJetzt);
    // Die Plätze der letzten sechs Monate, der laufende zuletzt.
    const sids = [];
    for(let s = sidJetzt, k = 0; k < 6; k++, s = sidVor(s)) sids.unshift(s);
    const reihe = sids.map(s => { const t = s === sidJetzt ? l : tabelle(s, seasonEnd(s).getTime());
      const p = platzIn(t, c.x.id); return [s, p, t.length]; }).filter(x => x[1] > 0);
    const qj = pct(c.x.w / c.x.g), qv = pct(c.y.w / c.y.g);
    return { cat:'season', ic:'steigerung', prio:5,
      title:`${n} springt von Platz ${pv} im ${monatVon(vs)} auf Platz ${c.i + 1}`,
      desc:`Im ${mon} hat ${n} ${c.x.elo} Elo aus ${c.x.g} Partien. Die Siegquote stieg von ${qv} auf ${qj}\u00a0%.`,
      vv:'Platz ' + (c.i + 1), vl:'im ' + mon,
      dataRef:{ ambientPid:c.x.id, bild:{f:'saisons', p:c.x.id, mo:reihe.map(x => [monatVon(x[0]).slice(0, 3), x[1], x[2]])} } };
  }});

  // ── 18. Ein Rekord in Reichweite ──────────────────────────────────────
  // Die beiden Rekorde, deren Wert mit jeder Partie wandert: „Der Lauf"
  // (die letzten vierzig) und „Der Höhenflug" (die letzten zwanzig gegen
  // die zwanzig davor). Ein Rekord aus einer längsten Reihe wächst nur mit
  // einer laufenden Serie und steht bei der Serie; einer aus einem Anteil
  // der Laufbahn bewegt sich kaum. Erzählt wird, wem höchstens REICH_SIEGE
  // Siege im Fenster zum Bestwert fehlen. Die Rechnung ist die des
  // Rekords (`_chronicleCtx`, `allChronicles`) am Zeitpunkt der Ziehung;
  // `nextRecordFor` kennt keinen Zeitschnitt und nur Reihen.
  // Ein Rekord, den das erste Fenster der Liga vergab, ist noch keiner:
  // im Juni hielt Maxi „Der Höhenflug" mit drei Siegen mehr. Erst ab
  // REICH_REKORDE[…].min ist er ein Ziel.
  const REICH_SIEGE = 2, REICH_REKORDE = {lauf:{n:40, min:.6}, hochform:{n:20, min:.25}};
  T.push({ key:'rekord_reichweite', make: rng => {
    let C = null, A = null;
    try { C = _chronicleCtx(jetzt); A = allChronicles(jetzt); } catch(e){ return null; }
    const kand = [];
    Object.keys(REICH_REKORDE).forEach(cid => {
      const def = CHRONICLE_BY_ID[cid], lead = A.byId[cid], fenster = REICH_REKORDE[cid].n;
      if(!def || !lead || lead.val < REICH_REKORDE[cid].min) return;
      activePids.forEach(id => {
        const P = C.P[id];
        if(!P || (lead.pids || []).includes(id)) return;
        const v = def.val(P, C);
        if(v == null || !isFinite(v)) return;
        // Ein Sieg mehr im Fenster hebt den Anteil um ein Vierzigstel (der
        // Lauf) oder ein Zwanzigstel (der Höhenflug).
        const fehlt = Math.round((lead.val - v) * fenster);
        if(fehlt >= 1 && fehlt <= REICH_SIEGE) kand.push({id, cid, v, fehlt, lead, fenster, P});
      });
    });
    if(!kand.length) return null;
    kand.sort((a, b) => a.fehlt - b.fehlt || b.v - a.v);
    const c = ziehe(kand, rng), n = nameOf(c.id), def = CHRONICLE_BY_ID[c.cid];
    const halter = (c.lead.pids || []).filter(aktiv);
    if(!halter.length) return null;
    // Der Wert des Rekords, wie sein Beleg ihn nennt: Siege aus vierzig
    // oder der Sprung in Prozentpunkten.
    const mein = c.cid === 'lauf' ? `${c.P.l40W} von 40` : `+${Math.round(c.v * 20)} Siege`;
    const stand = c.cid === 'lauf' ? `${Math.round(c.lead.val * 40)} von 40` : `+${Math.round(c.lead.val * 20)} Siege`;
    const zahlw = c.fehlt === 1 ? 'ein Sieg' : wort(c.fehlt) + ' Siege';
    const title = `${n} ${c.fehlt === 1 ? 'fehlt' : 'fehlen'} ${zahlw} zum Rekord „${def.name}“`;
    const desc = (c.cid === 'lauf'
      ? `${n} gewann ${c.P.l40W} der letzten 40 Partien`
      : `${n} gewann ${Math.round(c.P.hfNeu * 20)} der letzten 20 Partien und ${Math.round(c.P.hfAlt * 20)} der 20 davor`)
      + `. Den Rekord ${halter.length > 1 ? 'halten' : 'hält'} ${_namenListe(halter.map(nameOf))}.`;
    return { cat:'history', ic:def.ic || 'trophy', prio:5, title, desc, vv:String(c.fehlt), vl:c.fehlt === 1 ? 'Sieg fehlt' : 'Siege fehlen',
      dataRef:{ ambientPid:c.id, chronicle:c.cid, bild:{f:'ziel', p:c.id, ic:def.ic || 'trophy', halter, mein, stand,
        nah:Math.max(0, Math.min(1, c.v / Math.max(1e-9, c.lead.val))), cid:c.cid, name:def.name} } };
  }});

  // ── 19. Der Monat davor und wo sein Podest jetzt steht ───────────────
  // Der Rückblick auf den letzten Monat steht am Ersten im Feed. Ein paar
  // Tage später fragt man, was aus seinem Podest geworden ist: jeder der
  // drei mit dem Platz von jetzt. Vom 3. bis zum 12., ab drei Spieltagen
  // im neuen Monat; der Knopf öffnet den Saison-Rückblick [§C31].
  const RUECKBLICK_MIN_TAGE = 3;
  T.push({ key:'saison_rueckblick', make: () => {
    if(!sidJetzt || tagImMonat < 3 || tagImMonat > 12) return null;
    const vs = sidVor(sidJetzt);
    if(!(seasons || []).some(s => s.id === vs)) return null;
    const tage = new Set(lage().bis.filter(m => (seasonOf(m.created_at) || {}).id === sidJetzt).map(m => tagKey(m.created_at)));
    if(tage.size < RUECKBLICK_MIN_TAGE) return null;
    const alt = tabelle(vs, seasonEnd(vs).getTime()).slice(0, 3), l = tabelle(sidJetzt, jetzt);
    if(alt.length < 3) return null;
    const jetztP = alt.map(x => platzIn(l, x.id));
    const oben = alt.filter((x, i) => jetztP[i] >= 1 && jetztP[i] <= 3);
    const mv = monatVon(vs), mon = monatVon(sidJetzt), mei = alt[0].id;
    let team = null; try { team = seasonTeamOf(vs); } catch(e){ team = null; }
    const meisterVorn = jetztP[0] === 1;
    const title = meisterVorn ? `${nameOf(mei)}, Meister des ${mv}, führt auch den ${mon} an`
      : !oben.length ? `Das Podest des ${mv} steht im ${mon} nicht mehr vorn`
      : oben.length === 3 ? `Das Podest des ${mv} steht auch im ${mon} vorn`
      : `Vom Podest des ${mv} ${oben.length === 1 ? 'ist' : 'sind'} im ${mon} nur ${_namenListe(oben.map(x => nameOf(x.id)))} vorn`;
    const team2 = team && pm[team[0]] && pm[team[1]] ? `${nameOf(team[0])} und ${nameOf(team[1])}` : '';
    const desc = meisterVorn ? `Den ${mv} gewann ${nameOf(mei)} mit ${alt[0].elo} Elo.` + (team2 ? ` Team der Saison wurden ${team2}.` : '')
      : `Meister des ${mv} wurde ${nameOf(mei)}` + (team2 ? `, Team der Saison ${team2}.` : '.') + ` Im ${mon} führt ${nameOf(l[0].id)}.`;
    // Der große Wert wechselt mit dem Titel: der Platz des Meisters von
    // jetzt. Die Elo des Vormonats stand über allen Titeln gleich, die Zahl
    // der Podestplätze über zweien.
    return { cat:'season', ic:'calendar', prio:4, title, desc, vv:jetztP[0] ? 'Platz ' + jetztP[0] : String(alt[0].elo),
      vl:jetztP[0] ? 'Meister im ' + mon : 'Elo im ' + mv,
      dataRef:{ ambientPids:alt.map(x => x.id).filter(aktiv), seasonRecap:vs, bild:{f:'vormonat', sid:vs, mon,
        pd:alt.map((x, i) => ({p:x.id, t:x.elo + ' Elo', j:jetztP[i], g:x.g})), team:team || null} } };
  }});

  // ── 20. Die Positions-Rangliste: wer auf einer Position vorn steht ───
  // Der Wert der Positions-Rangliste (`posWert` [§5.2]) über die Partien
  // bis zur Ziehung — die Frage, wer auf einer Position der Beste der Liga
  // ist, nicht die des Positionsprofils [§C44]. Erzählt wird ein Wechsel
  // auf dem Podest einer Position in vierzehn Tagen oder ein Abstand zweier
  // Nachbarn von höchstens POSITION_ENG Punkten im Wert.
  // Wer genannt wird, hat POSITION_MIN Partien dort, so viele wie ein
  // Liga-Rekord auf der Position verlangt: am fünften Tag stand Julian mit
  // sechs Sturmpartien auf Platz 2.
  const POSITION_ENG = 2, POSITION_MIN = 25;
  T.push({ key:'positionen_spitze', make: rng => {
    const liste = bisMs => {
      const ms = lage().bis.filter(m => mts(m) <= bisMs), o = {};
      ms.forEach(m => { const aW = m.winner === 'A';
        [[m.a1, m.a1_pos, aW, m.score_a, m.score_b], [m.a2, m.a2_pos, aW, m.score_a, m.score_b],
         [m.b1, m.b1_pos, !aW, m.score_b, m.score_a], [m.b2, m.b2_pos, !aW, m.score_b, m.score_a]].forEach(([id, pos, w, gf, ga]) => {
          if(!id || !aktiv(id)) return; const s = o[id] || (o[id] = {atkG:0, atkW:0, defG:0, defW:0, atkGoals:0, defConceded:0});
          if(pos === 'atk'){ s.atkG++; if(w) s.atkW++; s.atkGoals += gf || 0; } else { s.defG++; if(w) s.defW++; s.defConceded += ga || 0; } }); });
      const je = {atk:[], def:[]};
      Object.keys(o).forEach(id => { let perf = {}; try { perf = posPerfFrom(id, ms); } catch(e){ perf = {}; }
        ['atk', 'def'].forEach(pos => { const s = o[id], g = pos === 'atk' ? s.atkG : s.defG, w = pos === 'atk' ? s.atkW : s.defW;
          if(!g) return; const ga = (pos === 'atk' ? s.atkGoals : s.defConceded) / g;
          const pa = pos === 'atk' ? perf.aPerfAvg : perf.dPerfAvg;
          je[pos].push({id, g, w, wert:Math.round(posWert(pos, g, w, ga, pa) * 100), pa:pa || 0}); }); });
      ['atk', 'def'].forEach(pos => je[pos].sort((a, b) => b.wert - a.wert || b.pa - a.pa || b.w / b.g - a.w / a.g));
      return je;
    };
    const A = liste(jetzt), B = liste(ab14);
    const kand = [];
    ['atk', 'def'].forEach(pos => { if(A[pos].length < 4) return;
      podestLage(A[pos], B[pos], x => x.wert, () => POSITION_ENG)
        .filter(c => A[pos][c.platz - 1].g >= POSITION_MIN && (c.art !== 'eng' || A[pos][c.platz - 2].g >= POSITION_MIN))
        .forEach(c => kand.push(Object.assign(c, {pos}))); });
    if(!kand.length) return null;
    const c = ziehe(kand, rng), n = nameOf(c.id), l = A[c.pos], x = l[c.platz - 1];
    const wo = c.pos === 'atk' ? 'im Sturm' : 'in der Abwehr', Wo = c.pos === 'atk' ? 'Im Sturm' : 'In der Abwehr';
    const title = c.art === 'spitze' ? (c.ueber ? `${n} löst ${nameOf(c.ueber)} als Bester ${wo} ab` : `${n} ist der Beste ${wo}`)
      : c.art === 'podest' ? `${n} steht ${wo} neu auf Platz ${c.platz}`
      : c.d === 0 ? `${Wo} stehen ${nameOf(c.vor)} und ${n} gleichauf`
      : `${nameOf(c.vor)} liegt ${wo} knapp vor ${n}`;
    // Bei „knapp vor" nennt der Text zuerst den, der vorn liegt: „Leon
    // gewann …, Julian kommt dort auf …" unter „Julian liegt vor Leon"
    // las sich verkehrt herum, und „einen Punkt" war ein Wert, den die
    // Karte nicht erklärt.
    const desc = c.art === 'eng'
      ? `${nameOf(c.vor)} gewann dort ${l[c.platz - 2].w} von ${l[c.platz - 2].g} Partien, ${n} ${x.w} von ${x.g}.`
      : `${n} gewann ${x.w} von ${x.g} Partien ${wo}, ${pct(x.w / x.g)}\u00a0%. `
        + (c.vorher ? `Vor 14 Tagen stand ${n} dort auf Platz ${c.vorher}.` : `Vor 14 Tagen stand ${n} dort noch nicht in der Liste.`);
    const pids = c.art === 'eng' ? [c.vor, c.id] : [c.id];
    return { cat:'personal', ic:c.pos === 'atk' ? 'bolt' : 'shield', prio:5, title, desc, vv:String(x.wert), vl:'Wert ' + wo,
      dataRef:{ ambientPids:pids, bild:{f:'position', pos:c.pos, hl:pids,
        pd:l.slice(0, 5).map(z => ({p:z.id, t:String(z.wert), v:(B[c.pos].findIndex(q => q.id === z.id) + 1) || 0, g:z.g, w:z.w}))} } };
  }});

  // ── 21. Mit wem jemand noch nie zusammen stand ───────────────────────
  // Das Netz eines Spielers: jeder Partner der aktiven Liga, die Linie so
  // stark wie die gemeinsamen Partien. Erzählt wird, wem nach
  // NETZ_MIN_PARTIEN Partien höchstens NETZ_MAX_FEHLT Partner fehlen — nur
  // solche, die selbst NETZ_MIN_PARTNER Partien haben, sonst fehlt der
  // Neue —, oder wer in vierzehn Tagen den letzten fehlenden fand.
  const NETZ_MIN_PARTIEN = 60, NETZ_MAX_FEHLT = 3, NETZ_MIN_PARTNER = 30;
  T.push({ key:'partner_netz', make: rng => {
    const feld = activePids.filter(id => (von(id) || {}).g >= NETZ_MIN_PARTNER);
    if(feld.length < 6) return null;
    const kand = [];
    feld.forEach(id => {
      const z = vl(id), x = von(id);
      if(!z || x.g < NETZ_MIN_PARTIEN) return;
      // Wer fehlt, hat in den vierzehn Tagen selbst gespielt: mit jemandem,
      // der seit Wochen nicht kam, ist das Duo kein Ziel, und „Mit Alex …"
      // stand in vierzig Tagen fünfmal über fünf Spielern.
      const andere = feld.filter(o => o !== id), fehlt = andere.filter(o => !z.partner.has(o) && (von(o) || {}).g14 > 0);
      if(andere.some(o => !z.partner.has(o) && !fehlt.includes(o))) return;
      if(fehlt.length && fehlt.length <= NETZ_MAX_FEHLT) kand.push({id, art:'fehlt', fehlt, n:andere.length});
      // Mit allen heißt mit der ganzen aktiven Liga, nicht nur mit den
      // Stammspielern: „mit allen sechs" stand über einer Liga von zwölf.
      else if(!fehlt.length && activePids.every(o => o === id || z.partner.has(o))){
        const letzter = andere.map(o => [o, z.mitAb.get(o)]).sort((a, b) => b[1] - a[1])[0];
        if(letzter && letzter[1] >= ab14) kand.push({id, art:'voll', letzter:letzter[0], n:andere.length});
      }
    });
    if(!kand.length) return null;
    kand.sort((a, b) => (a.art === 'voll' ? 0 : a.fehlt.length) - (b.art === 'voll' ? 0 : b.fehlt.length));
    const c = ziehe(kand, rng), n = nameOf(c.id), z = vl(c.id), x = von(c.id);
    const meist = [...z.partner.entries()].filter(e => feld.includes(e[0])).sort((a, b) => b[1] - a[1])[0];
    const title = c.art === 'voll' ? `${n} spielte jetzt mit jedem der Liga im Duo`
      : `${n} spielte noch nie mit ${_namenListe(c.fehlt.map(nameOf))} im Duo`;
    const desc = (c.art === 'voll' ? `Zuletzt kam ${nameOf(c.letzter)} dazu, nach ${x.g} Partien. `
      : `Mit ${c.n - c.fehlt.length} von ${c.n} möglichen Partnern spielte ${n} schon zusammen. `)
      + (meist ? `Am häufigsten mit ${nameOf(meist[0])}, ${meist[1]}-mal.` : '');
    return { cat:'personal', ic:'users', prio:4, title, desc, vv:String(c.n - (c.fehlt || []).length), vl:'von ' + c.n + ' Partnern',
      dataRef:{ ambientPid:c.id, bild:{f:'partnernetz', p:c.id, fehlt:c.fehlt || [], neu:c.letzter || null,
        z:feld.filter(o => o !== c.id).map(o => [o, z.partner.get(o) || 0])} } };
  }});

  // ── 22. Die Duo-Rangliste: wer oben steht und wer dazukam ────────────
  // Die Teams-Liste über alle Saisons: Duos ab `DUOS_AB` gemeinsamen
  // Partien, nach Siegquote, dann Torbilanz, dann Partien — dieselbe
  // Ordnung wie dort. Erzählt wird ein Wechsel auf den ersten drei Plätzen
  // in vierzehn Tagen; das Duo, um das es geht, hat DUOLISTE_MIN Partien,
  // sonst steht oben, wer viermal zusammen gewann.
  const DUOLISTE_MIN = 10;
  T.push({ key:'duo_rangliste', make: rng => {
    const liste = bisMs => Object.keys(verlauf().duo).map(k => { const d = verlauf().duo[k];
      const l = d.l.filter(e => e[0] <= bisMs), g = l.length, w = l.filter(e => e[1]).length;
      const gd = l.reduce((s, e) => s + e[2] - e[3], 0); return {id:k, g, w, gd}; })
      .filter(x => x.g >= DUOS_AB && x.id.split('|').every(aktiv))
      .sort((a, b) => b.w / b.g - a.w / a.g || b.gd - a.gd || b.g - a.g);
    const l = liste(jetzt), v = liste(ab14);
    if(l.length < 5) return null;
    const kand = podestLage(l, v, x => x.w / x.g, () => -1).filter(c => (l[c.platz - 1] || {}).g >= DUOLISTE_MIN);
    if(!kand.length) return null;
    const c = ziehe(kand, rng), x = l[c.platz - 1], [a, b] = c.id.split('|');
    const nn = `${nameOf(a)} und ${nameOf(b)}`;
    const title = c.art === 'spitze' ? `${nn} führen die Rangliste der Duos an` : `${nn} stehen bei den Duos neu auf Platz ${c.platz}`;
    const desc = `${x.w} Siege aus ${x.g} gemeinsamen Partien, ${pct(x.w / x.g)}\u00a0%. `
      + (c.vorher ? `Vor 14 Tagen standen die beiden auf Platz ${c.vorher}.` : `Vor 14 Tagen standen die beiden noch nicht in der Liste.`);
    return { cat:'team', ic:'duo', prio:5, title, desc, vv:pct(x.w / x.g) + '\u00a0%', vl:'Siegquote zusammen',
      dataRef:{ ambientPids:[a, b], pairKind:'team', bild:{f:'duopodest', hl:c.id,
        pd:l.slice(0, 5).map(z => [...z.id.split('|'), z.w, z.g, (v.findIndex(q => q.id === z.id) + 1) || 0])} } };
  }});

  // ── 23. Ein Duo in Serie ──────────────────────────────────────────────
  // Zwei, die zusammen DUOLAUF_MIN Partien in Folge gewonnen haben, mit
  // der eigenen besten Serie als Maßstab. Nur, wenn die letzte gemeinsame
  // Partie in den vierzehn Tagen liegt: eine Serie von vor zwei Monaten,
  // die nie gerissen ist, läuft nicht.
  const DUOLAUF_MIN = 5;
  T.push({ key:'duo_lauf', make: rng => {
    const D = verlauf().duo;
    const ks = Object.keys(D).filter(k => D[k].serie >= DUOLAUF_MIN && D[k].t >= ab14 && k.split('|').every(aktiv))
      .sort((a, b) => D[b].serie - D[a].serie || D[b].g - D[a].g || (a < b ? -1 : 1));
    if(!ks.length) return null;
    const k = ziehe(ks, rng), d = D[k], [a, b] = k.split('|'), nn = `${nameOf(a)} und ${nameOf(b)}`;
    const liga = Math.max(...Object.keys(D).filter(q => q.split('|').every(aktiv)).map(q => D[q].best));
    const title = d.serie >= liga ? `${nn} halten mit ${d.serie} Siegen den Rekord der Duos`
      : `${nn} gewinnen zusammen seit ${d.serie} Partien`;
    const desc = (d.serie >= liga ? `Die ${d.serie} Siege in Folge sind die längste Serie eines Duos.`
      : d.serie >= d.best ? `So lang war die Serie der beiden noch nie.` : `Die beste Serie der beiden liegt bei ${d.best}.`)
      + (d.serie < liga ? ` Die längste eines Duos liegt bei ${liga}.` : ` Insgesamt gewannen die beiden ${d.w} von ${d.g} Partien.`);
    return { cat:'team', ic:'duo', prio:5, title, desc, vv:String(d.serie), vl:'Siege in Folge',
      dataRef:{ ambientPids:[a, b], pairKind:'team', bild:{f:'duoserie', a, b, n:d.serie, best:d.best, liga, seit:datumFmt(new Date((d.l[d.l.length - d.serie] || [d.t])[0]), 'tm')} } };
  }});

  // ── 24. Das Rennen um das Team der Saison ────────────────────────────
  // Team der Saison wird das Duo mit dem höchsten gemeinsamen Elo-Zuwachs
  // des Monats (`_seasonTeamOfBerechnet`). Ab dem 8. steht hier, wer vorn
  // liegt und mit welchem Abstand, ab DUOSAISON_MIN gemeinsamen Partien im
  // Monat: die Regel des Titels verlangt zwei, und ein Duo mit zwei
  // Partien führt am 8. zufällig.
  const DUOSAISON_MIN = 5;
  T.push({ key:'duo_saison', make: rng => {
    if(!sidJetzt || tagImMonat < 8) return null;
    const D = verlauf().duo;
    const ks = Object.keys(D).filter(k => (D[k].sg[sidJetzt] || 0) >= DUOSAISON_MIN && D[k].se[sidJetzt] > 0 && k.split('|').every(sichtbarId))
      .sort((a, b) => D[b].se[sidJetzt] - D[a].se[sidJetzt] || (a < b ? -1 : 1));
    if(ks.length < 3) return null;
    const q = ks.slice(0, 3).filter(k => k.split('|').every(aktiv));
    if(!q.length) return null;
    const k = ziehe(q, rng), i = ks.indexOf(k), d = D[k], [a, b] = k.split('|'), mon = monatVon(sidJetzt);
    const e = Math.round(d.se[sidJetzt]), nn = `${nameOf(a)} und ${nameOf(b)}`;
    const neben = i === 0 ? ks[1] : ks[0], ne = Math.round(D[neben].se[sidJetzt]), [c1, c2] = neben.split('|');
    const title = i === 0 ? `${nn} führen im Rennen um das Team der Saison`
      : `${nn} liegen ${ne - e} Elo hinter ${nameOf(c1)} und ${nameOf(c2)}`;
    const desc = (i === 0 ? `${e} Elo aus ${d.sg[sidJetzt]} gemeinsamen Partien im ${mon}. Dahinter folgen ${nameOf(c1)} und ${nameOf(c2)} mit ${ne}.`
      : `Es geht um das Team der Saison. Die beiden holten im ${mon} ${e} Elo aus ${d.sg[sidJetzt]} Partien.`);
    return { cat:'team', ic:'duo', prio:5, title, desc, vv:'+' + e, vl:'Elo zusammen',
      dataRef:{ ambientPids:[a, b], pairKind:'team', bild:{f:'duorennen', sid:sidJetzt, hl:k,
        z:ks.slice(0, 3).concat(i > 2 ? [k] : []).slice(-3).map(y => [...y.split('|'), Math.round(D[y].se[sidJetzt]), D[y].sg[sidJetzt]])} } };
  }});

  // ── 25. Ein Duell, das sich gedreht hat ───────────────────────────────
  // Zwei Spieler, die oft gegeneinander standen (RIVALE_MIN Duelle), und
  // was die letzten zehn sagen: wer die Bilanz insgesamt anführt und die
  // letzten zehn trotzdem verlor (`wende`), wer gerade RIVALE_SERIE in
  // Folge gewann (`serie`), oder ein Duell, das nach vielen Begegnungen
  // höchstens um eins auseinanderliegt (`knapp`). Das letzte Duell liegt in
  // den vierzehn Tagen.
  const RIVALE_MIN = 20, RIVALE_SERIE = 5, RIVALE_WENDE = 7;
  T.push({ key:'rivalitaet', make: rng => {
    const D = verlauf().duell, kand = [];
    Object.keys(D).forEach(k => {
      const l = D[k], [a, b] = k.split('|');
      if(l.length < RIVALE_MIN || l[l.length - 1][0] < ab14 || !aktiv(a) || !aktiv(b)) return;
      const wa = l.filter(e => e[1] === a).length, wb = l.length - wa;
      const zehn = l.slice(-10), za = zehn.filter(e => e[1] === a).length;
      let s = 0; const letzt = l[l.length - 1][1];
      for(let i = l.length - 1; i >= 0 && l[i][1] === letzt; i--) s++;
      if(s >= RIVALE_SERIE) kand.push({a, b, wa, wb, art:'serie', sieger:letzt, n:s, w:300 + s, l});
      else if(za >= RIVALE_WENDE && wa < wb) kand.push({a, b, wa, wb, art:'wende', sieger:a, n:za, w:200 + za, l});
      else if(10 - za >= RIVALE_WENDE && wb < wa) kand.push({a, b, wa, wb, art:'wende', sieger:b, n:10 - za, w:200 + 10 - za, l});
      else if(Math.abs(wa - wb) <= 1 && l.length >= RIVALE_MIN + 10) kand.push({a, b, wa, wb, art:'knapp', n:l.length, w:100 + l.length, l});
    });
    if(!kand.length) return null;
    kand.sort((x, y) => y.w - x.w || (x.a < y.a ? -1 : 1));
    const c = ziehe(kand, rng), na = nameOf(c.a), nb = nameOf(c.b);
    const s = c.sieger, o = s === c.a ? c.b : c.a, ns = s ? nameOf(s) : '', no = o ? nameOf(o) : '';
    const title = c.art === 'serie' ? `${ns} gewinnt ${c.n} Duelle in Folge gegen ${no}`
      : c.art === 'wende' ? `${ns} gewinnt ${c.n} der letzten zehn Duelle gegen ${no}`
      : `${na} und ${nb} stehen nach ${c.n} Duellen ${c.wa === c.wb ? 'gleichauf' : 'fast gleichauf'}`;
    const ws = s === c.a ? c.wa : c.wb, wo = s === c.a ? c.wb : c.wa;
    const desc = c.art === 'knapp' ? `${na} gewann ${c.wa}, ${nb} ${c.wb}. Das letzte Duell ging an ${nameOf(c.l[c.l.length - 1][1])}.`
      : c.art === 'wende' ? `Insgesamt liegt ${no} noch vorn, mit ${wo} zu ${ws} Siegen.`
      : `Insgesamt steht es ${ws} zu ${wo} für ${ns}.`;
    return { cat:'rivalry', ic:'crossedSwords', prio:5, title, desc, vv:String(c.n), vl:c.art === 'knapp' ? 'Duelle' : 'Siege',
      dataRef:{ ambientPids:[c.a, c.b], pairKind:'duell', bild:{f:'rivale', a:c.a, b:c.b, wa:c.wa, wb:c.wb, art:c.art, h:s === c.b ? 'b' : 'a',
        z:c.l.slice(-12).map(e => e[1] === c.a ? 'a' : 'b').join('')} } };
  }});

  // Wer wie viele Einträge der laufenden Tafel hält, die drei vorn — für
  // die Tafel der Halbzeit.
  const _tafelTraeger = (aw) => {
    const n = {};
    (aw || []).forEach(a => { if(pm[a.pid]) n[a.pid] = (n[a.pid] || 0) + 1; });
    return Object.keys(n).sort((x, y) => n[y] - n[x] || (x < y ? -1 : 1)).slice(0, 3).map(pid => [pid, n[pid]]);
  };
  // ── §11.1c Rückblicke mit festem Termin ─────────────────────────────
  // Woche und Monat hat der Generator schon: der gestaffelte Montags-Block
  // [§11.1] und der season_recap beim Archivieren. Was fehlte, waren die
  // beiden langen Blicke — Monatshalbzeit und Jahreswechsel. Sie hängen
  // NICHT am Losverfahren: `pflicht` belegt den Slot direkt, damit ein
  // Rückblick nie ausfällt, weil an dem Tag zufällig etwas anderes zog.

  // ── Die Halbzeit: Sturm und Abwehr des Monats ─────────────────────
  // Die Karte zeigte das Raster der vergebenen Monatschroniken, und ihr
  // Blatt „Die letzten zehn Partien" — die des Tabellenführers, ohne dass
  // sein Name darüberstand. Zur Halbzeit fragt man, wer im Monat vorne
  // liegt und wo: das Bild zeigt je Position die drei mit der besten
  // Siegquote im Monat (ab `HALBZEIT_MIN_PARTIEN` auf der Position), das
  // Blatt darunter die Spitze der Tabelle und die Monatschroniken. Ein
  // Monat ist ein Zeitraum [§C40]: wer in ihm spielte, steht darin.
  T.push({ key:'rueckblick_halbzeit',
    pflicht: (tag, stunde) => stunde >= 15 && AMBIENT_TERMIN.rueckblick_halbzeit(tag),
    make: () => {
      if(typeof seasonTitles !== 'function') return null;
      // Der Monat des Slots, nicht der Kalender des Geräts: ein am Ersten
      // nachgetragener 15. gehört dem Monat davor.
      let T2 = null, sid = null;
      // Mit dem Zeitschnitt des Slots: ohne ihn nannte die Halbzeit am 15.
      // den Stand vom Monatsende, „Leon führt nach 180 Partien mit 578 Elo".
      try { sid = sidJetzt || currentSeason().id; T2 = seasonTitles(sid, jetzt); } catch(e){ return null; }
      if(!T2) return null;
      const offen = SEASON_TITLES.length - T2.awarded.length;
      // Der Führende und die Spitze aus der Tabelle am Slot (`tabelle`): ein
      // abgeschlossener Monat trägt in `seasonTitles` den Endstand.
      const tab0 = tabelle(sid, jetzt).filter(e => pm[e.id]);
      const fuehrend = tab0[0] ? {pid:tab0[0].id, elo:tab0[0].elo} : null;
      const je = {atk:{}, def:{}};
      (matchesInSeason(sid) || []).filter(m => mts(m) <= now.getTime()).forEach(m => {
        const a = m.winner === 'A';
        [[m.a1, m.a1_pos, a], [m.a2, m.a2_pos, a], [m.b1, m.b1_pos, !a], [m.b2, m.b2_pos, !a]].forEach(([pid, pos, w]) => {
          if(!pid || !pm[pid] || !sichtbar(pid)) return;
          const o = je[pos === 'def' ? 'def' : 'atk'], x = o[pid] || (o[pid] = {g:0, w:0});
          x.g++; if(w) x.w++;
        });
      });
      const drei = o => Object.keys(o).filter(pid => o[pid].g >= HALBZEIT_MIN_PARTIEN)
        .sort((x, y) => (o[y].w / o[y].g) - (o[x].w / o[x].g) || o[y].g - o[x].g || nameOf(x).localeCompare(nameOf(y), 'de'))
        .slice(0, 3).map(pid => [pid, o[pid].w, o[pid].g]);
      const sturm = drei(je.atk), abwehr = drei(je.def);
      const q = x => Math.round(x[1] / x[2] * 100);
      let tab = [];
      tab = tab0.slice(0, 5).map(e => [e.id, e.elo, e.g]);
      return { cat:'season', ic:'stopwatch', prio:6,
        title:`Halbzeit im ${seasonLabel(sid)}`,
        // Kurz genug für die Karte: mit der Zahl der Partien des Führenden
        // und den vergebenen Chroniken war der Satz auf 288 px abgeschnitten.
        // Die Chroniken stehen im Blatt, im Satz nur, wenn die Karte sie
        // statt der Positionen zeigt. Vor „%" ein fester Abstand, sonst stand
        // es allein am Anfang einer Zeile.
        desc: (fuehrend ? `${nameOf(fuehrend.pid)} führt nach ${T2.matches} Partien mit ${fuehrend.elo} Elo. ` : `${T2.matches} Partien an ${T2.days} Spieltagen. `)
          + (sturm.length && abwehr.length
            ? `Im Sturm gewinnt ${nameOf(sturm[0][0])} ${q(sturm[0])}\u00a0%, in der Abwehr ${nameOf(abwehr[0][0])} ${q(abwehr[0])}\u00a0%.`
            : `${T2.awarded.length} von ${SEASON_TITLES.length} Monatschroniken sind vergeben.`),
        vv:String(offen), vl:'noch offen',
        dataRef:{ ambientPid: fuehrend ? fuehrend.pid : null, seasonTable:sid,
          bild:sturm.length && abwehr.length
            ? {f:'halbzeit', sturm, abwehr, tab, tafel:{voll:T2.awarded.length, alle:SEASON_TITLES.length, traeger:_tafelTraeger(T2.awarded)}}
            : {f:'tafel', voll:T2.awarded.length, alle:SEASON_TITLES.length, traeger:_tafelTraeger(T2.awarded)} } };
    }});

  T.push({ key:'rueckblick_jahr',
    pflicht: (tag, stunde) => stunde >= 10 && AMBIENT_TERMIN.rueckblick_jahr(tag),
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
        title:`${tausender(String(imJahr.length))} Partien spielte die Liga im Jahr ${jahr}`,
        desc: tausender(`An ${tage} Spieltagen fielen ${tore} Tore. `
          + (bester ? `${nameOf(bester)} holte ${zaehler[bester]} von ${meister.length} Meistertiteln.`
            : spitze ? `Im Prestige liegt ${nameOf(spitze)} vorn, mit ${Math.round(prestigeOf(spitze).punkte)} Punkten.` : '')).trim(),
        vv:String(imJahr.length), vl:'Partien',
        dataRef:{ ambientPid: spitze || null, prestige: !!spitze } };
    }});

  return T;
}

