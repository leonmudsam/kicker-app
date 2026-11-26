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
  const rubrikVon = key => {
    if(/^award_/.test(key)) return 'auszeichnung';
    if(/^rivalry_/.test(key)) return 'duell';
    if(/^personal_/.test(key)) return 'persoenlich';
    // Die acht Fragen [§C33]; die Präfixe davor lesen gespeicherte Karten,
    // deren Zeile noch keine `ambientRubrik` trug.
    if(/^(duo_|rolle_)/.test(key)) return 'persoenlich';
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
// Dazu die Halbzeit am 15. und der Jahresrückblick am 1. Januar, die am
// Datum hängen und nicht am Los.
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
        + (vor > 0 ? `kamen ${vor} Elo dazu.` : vor < 0 ? `gingen ${-vor} Elo verloren.` : `stand die Elo still.`)
        + (!zweiter ? '' : zweiter.vorn ? ` Mehr holte nur ${nameOf(zweiter.p)}, ${zweiter.d} Elo.` : ` Dahinter folgt ${nameOf(zweiter.p)} mit ${zweiter.d} Elo.`),
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
      title:`${nameOf(pid)} gewinnt ${komma(c.v)} Partien mehr als erwartet`,
      desc:`${x.w14} Siege aus ${x.g14} Partien in 14 Tagen, die Elo aller vier ließ ${komma(x.e14)} erwarten.`
        + (!neben ? '' : i === 0 ? ` Dahinter folgt ${nameOf(neben.id)} mit ${komma(neben.v)} mehr.` : ` Weiter darüber liegt nur ${nameOf(neben.id)}, mit ${komma(neben.v)}.`),
      vv:'+' + komma(c.v), vl:'Siege über der Erwartung',
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
      desc:`${x.w14} von ${x.g14} in 14 Tagen, in den ${x.gV} Partien davor ${sonst}\u00a0%.`
        + (r[0] === c ? ` Bei keinem liegt die Form weiter über der eigenen Laufbahn.` : ''),
      vv:jetztQ + '\u00a0%', vl:'in 14 Tagen',
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
    const fehlt = !einer ? '' : c.art === 'siege' ? 'Es fehlt ein Sieg. ' : c.art === 'partien' ? 'Es fehlt eine Partie. ' : 'Es fehlt ein Tor. ';
    const desc = c.art === 'prestige'
      ? `${c.ist} Prestige, ${pct(1 - c.rest / Math.max(1, c.ziel - c.vonMin))}\u00a0% der Stufe ${c.vonName} sind geschafft.`
      : fehlt + (c.art === 'siege' ? `${c.ist} Siege aus ${x.g} Partien, ${c.zu14} davon in den letzten 14 Tagen.`
        : c.art === 'partien' ? `${c.ist} Partien bisher, ${c.zu14} davon in den letzten 14 Tagen.`
        : `${c.ist} Tore aus ${x.g} Partien, ${c.zu14} davon in den letzten 14 Tagen.`);
    // Die Marke davor ist der Anfang des Rings: er zeigt den Weg von der
    // letzten runden Zahl zur nächsten, nicht von null.
    let vorher = c.art === 'prestige' ? c.vonMin : 0;
    if(c.art !== 'prestige'){
      const rund = c.art === 'tore' ? toreRund : (v => _rundeMarke(v, 50));
      for(let v = c.ist; v > 0; v--) if(rund(v)){ vorher = v; break; }
    }
    return { cat:'personal', ic:c.art === 'prestige' ? 'peak' : 'marke', prio:5,
      title, desc: tausender(desc), vv:String(c.rest), vl:'fehlen',
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
      ? `Im ${monat(letzterT.sid)} kam „${e.name || 'der erste Eintrag'}“ dazu, nach ${c.z.filter(y => !y[4] && y[1] !== null).length - 1} Monaten ohne.`
      : `Zuletzt „${e.name || ''}“ im ${monat(letzterT.sid)}. `
        + (andere > 0 ? `${zahl} Monate in Folge schaffte sonst nur ${andere === 1 ? 'einer' : wort(andere)}.`
          : `${zahl} Monate in Folge schaffte sonst niemand.`);
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
    const pp = Math.round(wert(k) * 100);
    return { cat:'team', ic:'duo', prio:5,
      title:k === ks[0] ? `Kein Duo spielt deutlicher über der Erwartung als ${nameOf(a)} und ${nameOf(b)}`
        : `${nameOf(a)} und ${nameOf(b)} spielen zusammen ${pp} Prozentpunkte über der Erwartung`,
      desc:`${d.w} Siege aus ${d.g} gemeinsamen Partien, die Elo der vier ließ ${komma(d.e)} erwarten.`,
      vv:'+' + pp, vl:'Prozentpunkte',
      dataRef:{ ambientPids:[a, b], pairKind:'team', bild:{f:'chemie', a, b, pp, g:d.g, w:d.w, e:+d.e.toFixed(1),
        dz:ks.slice(0, 3).filter(y => y !== k).slice(0, 2).map(y => [...y.split('|'), Math.round(wert(y) * 100), duo[y].g])} } };
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
        desc:`${jetztN} von ${x.g14} Partien der letzten 14 Tage ${wo}, davor ${vorQ}\u00a0%. `
          + (st === 'beide' ? `Das Positionsprofil sieht ${nameOf(id)} in Sturm und Abwehr gleichauf.`
            : `Das Positionsprofil sieht ${nameOf(id)} ${st === 'atk' ? 'im Sturm' : 'in der Abwehr'} stärker.`),
        vv:pct(jetztN / x.g14) + '\u00a0%', vl:wo,
        dataRef:{ ambientPid:id, bild:bild(id, 'wechsel', x.aG14 / x.g14, x.aGV / x.gV) } };
    }
    const id = wahl.id, l = L[id], sturmStark = l.staerker === 'atk';
    const n = l.aG + l.dG, dort = sturmStark ? l.dG : l.aG;
    const stark = sturmStark ? l.rA : l.rD, schw = sturmStark ? l.rD : l.rA;
    return { cat:'personal', ic:'sideSwap', prio:4,
      title:`${nameOf(id)} steht meist ${sturmStark ? 'in der Abwehr' : 'im Sturm'} und ist ${sturmStark ? 'im Sturm' : 'in der Abwehr'} stärker`,
      desc:`${dort} von ${n} Partien ${sturmStark ? 'in der Abwehr' : 'im Sturm'}. `
        + `${sturmStark ? 'Im Sturm' : 'In der Abwehr'} ${pp(stark)} Prozentpunkte ${stark >= 0 ? 'über' : 'unter'} dem eigenen Schnitt, `
        + `${sturmStark ? 'in der Abwehr' : 'im Sturm'} ${pp(schw)} ${schw >= 0 ? 'darüber' : 'darunter'}.`,
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
    const wer = !sieger.length ? '' : hit.art === 'partien'
      ? `, gewonnen von ${_namenListe(sieger.map(nameOf))} mit ${standFuer(hit.m)}`
      : ` in einer Partie, die ${_namenListe(sieger.map(nameOf))} mit ${standFuer(hit.m)} gewannen`;
    const monat = seasonLabel(cur).split(' ')[0], im = mon[cur] || 0;
    const davor = sids.filter(s => s < cur).map(s => mon[s]);
    const vergleich = davor.length && im > Math.max(...davor) ? `, mehr als in jedem Monat davor` : '';
    const einheit = hit.art === 'partien' ? 'Partien' : 'Tore';
    return { cat:'history', ic:'hundred', prio:5,
      title: hit.art === 'partien' ? `Die Liga hat ihre ${hit.n}. Partie gespielt` : `In der Liga ist das ${hit.n}. Tor gefallen`,
      desc: tausender(`${hit.art === 'partien' ? 'Gespielt' : 'Gefallen'} am ${datumFmt(hit.m.created_at, 'tmx')}${wer}. `
        + `Im ${monat} kamen bisher ${im} ${einheit} dazu${vergleich}.`),
      vv:String(hit.n), vl:einheit,
      dataRef:{ ambientPids:sieger.slice(0, 2), bild:{f:'liga', art:hit.art, n:hit.n, mid:hit.m.id, sieger,
        summe:[bis.length, tore, new Set(bis.map(m => tagKey(m.created_at))).size], stand:standFuer(hit.m),
        m:sids.map(s => [String(seasonLabel(s)).split(' ')[0].slice(0, 3), mon[s]]), hl:sids.indexOf(cur)} } };
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
    pflicht: (tag, stunde) => stunde >= 15 && Number(tag.slice(8, 10)) === 15,
    make: () => {
      if(typeof seasonTitles !== 'function') return null;
      let T2 = null, sid = null;
      try { sid = currentSeason().id; T2 = seasonTitles(sid); } catch(e){ return null; }
      if(!T2) return null;
      const offen = SEASON_TITLES.length - T2.awarded.length;
      const fuehrend = T2.champ && pm[T2.champ.pid] ? T2.champ : null;
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
      try { tab = saisonRang(sid).filter(e => pm[e.id]).slice(0, 5).map(e => [e.id, Math.round(e.elo), e.wins + e.losses]); } catch(e){ tab = []; }
      return { cat:'season', ic:'stopwatch', prio:6,
        title:`Halbzeit im ${seasonLabel(sid)}`,
        // Kurz genug für die Karte: mit der Zahl der Partien des Führenden
        // und den vergebenen Chroniken war der Satz auf 288 px abgeschnitten.
        // Die Chroniken stehen im Blatt, im Satz nur, wenn die Karte sie
        // statt der Positionen zeigt. Vor „%" ein fester Abstand, sonst stand
        // es allein am Anfang einer Zeile.
        desc: `${T2.matches} Partien an ${T2.days} Spieltagen. `
          + (fuehrend ? `${nameOf(fuehrend.pid)} führt mit ${fuehrend.elo} Elo. ` : '')
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

