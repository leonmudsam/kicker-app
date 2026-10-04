'use strict';

// Isolierter Konzept-Audit. Liest ausschließlich die feste Testfixture;
// keine Live-App, zweite Elo-Rechnung, Datenbank oder Dateiausgabe.
const fs = require('node:fs');
const path = require('node:path');

const NAMES = [
  'Alex', 'Anton', 'Henry', 'Jane', 'Jannik', 'Johannes',
  'Julian', 'Leo', 'Leon', 'Martin', 'Maxi', 'Stefan'
];
const MIN_GAMES = 30;
const FIXTURE = path.resolve(__dirname, '../../tests/fixtures/matches.txt');
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'
});

const known = value => value !== null && value !== undefined && value !== '';
const isRole = value => ['atk', 'def', 0, 1].includes(value);
const stamp = value => Number.isFinite(value) ? new Date(value).toISOString() : null;

/**
 * Rohwerte einer bereits chronologisch geordneten persönlichen Matchfolge.
 * Mindestspiele werden NICHT hier angewendet: auch heart:0 ist ein gültiger
 * Messwert. seq: {partner, role, gf, ga, won, opponents, id?, timestamp?, day?}.
 * Unbekannte Partner/Rollen unterbrechen deren jeweilige Folge.
 */
function recordRuns(seq) {
  const result = {
    games: seq.length,
    echo: 0, heart: 0, wander: 0, commuter: 0,
    escape: null, repeater: 0, needle: null, roleSwitch: null,
    proof: {}
  };
  const run = {echo: 0, heart: 0, wander: 0, commuter: 0};
  const dailyScores = new Map();
  const opponentLossRuns = new Map();
  let previous = null, oneGoalGames = 0, roleSwitches = 0;

  seq.forEach((m, index) => {
    const scoreKnown = Number.isFinite(m.gf) && Number.isFinite(m.ga);
    const score = scoreKnown ? `${m.gf}:${m.ga}` : null;
    const previousScore = previous && Number.isFinite(previous.gf)
      && Number.isFinite(previous.ga) ? `${previous.gf}:${previous.ga}` : null;
    const oneGoal = scoreKnown && Math.abs(m.gf - m.ga) === 1;
    const partnerKnown = known(m.partner);
    const roleKnown = isRole(m.role);
    const switched = previous && roleKnown && isRole(previous.role)
      && previous.role !== m.role;

    if (oneGoal) oneGoalGames++;
    if (switched) roleSwitches++;

    run.echo = !scoreKnown ? 0
      : previousScore === score ? run.echo + 1 : 1;
    run.heart = oneGoal ? run.heart + 1 : 0;
    run.wander = !partnerKnown ? 0
      : previous && known(previous.partner) && previous.partner !== m.partner
        ? run.wander + 1 : 1;
    run.commuter = !roleKnown ? 0 : switched ? run.commuter + 1 : 1;

    for (const key of Object.keys(run)) {
      if (run[key] <= result[key]) continue;
      result[key] = run[key];
      result.proof[key] = {
        from: seq[index - run[key] + 1].id ?? index - run[key] + 1,
        to: m.id ?? index,
        timestamp: stamp(m.timestamp), score
      };
    }

    const day = m.day || (Number.isFinite(m.timestamp)
      ? dayFormatter.format(new Date(m.timestamp)) : null);
    if (day && scoreKnown) {
      const scoreKey = `${day}|${score}`;
      const occurrences = (dailyScores.get(scoreKey) || 0) + 1;
      dailyScores.set(scoreKey, occurrences);
      result.repeater = Math.max(result.repeater, occurrences);
    }

    // Ausschließlich ein tatsächlich geschlossener Bann ist ein Ereignis.
    // Andere Gegner und Partnerwechsel berühren diesen Gegner-Faden nicht.
    if (typeof m.won === 'boolean') {
      for (const opponent of new Set(m.opponents || [])) {
        if (!known(opponent)) continue;
        const losses = opponentLossRuns.get(opponent) || 0;
        if (m.won) {
          if (losses > (result.escape ?? 0)) {
            result.escape = losses;
            result.proof.escape = {
              opponent, losses, closedBy: m.id ?? index,
              timestamp: stamp(m.timestamp)
            };
          }
          opponentLossRuns.set(opponent, 0);
        } else {
          opponentLossRuns.set(opponent, losses + 1);
        }
      }
    }
    previous = m;
  });

  // Zusätzliche Stichprobenbasis der beiden BESTEHENDEN Vergleichsrekorde.
  if (seq.length >= 40) {
    result.needle = oneGoalGames / seq.length;
    result.roleSwitch = roleSwitches / (seq.length - 1);
  }
  return result;
}

/**
 * Serienstopp braucht den Ligafaden, nicht nur die persönliche Matchfolge:
 * ein Gegner kann seine Serie in Partien mit anderen Spielern verlängern.
 * matches: {players:[a1,a2,b1,b2], winner:'A'|'B', id, timestamp?}.
 * Rückgabe: Map Spieler-ID -> {stopped: Zahl|null, proof: Beleg|null}.
 * Mindestspiele bleiben Sache der Vergabe. Eine tatsächlich gestoppte
 * Einerserie ist bereits ein gültiger Rohwert; ohne Ereignis bleibt null.
 */
function measureStops(matches) {
  const runs = new Map(), result = new Map();
  const timed = matches.every(match => Number.isFinite(match.timestamp));
  const ordered = matches.map((match, index) => ({match, index}))
    .sort((a, b) => {
      // Ohne vollständige Zeitbasis ist ausschließlich die übergebene
      // Reihenfolge bekannt, etwa bei kleinen synthetischen Testfolgen.
      if (!timed) return a.index - b.index;
      return a.match.timestamp - b.match.timestamp
        || String(a.match.id ?? a.index).localeCompare(String(b.match.id ?? b.index));
    });

  for (const {match: m, index} of ordered) {
    if (!Array.isArray(m.players) || m.players.length !== 4
        || m.players.some(pid => !known(pid)) || new Set(m.players).size !== 4
        || !['A', 'B'].includes(m.winner)) {
      throw new TypeError('Serienstopp braucht vier eindeutige Spieler und ein gültiges Gewinnerteam.');
    }
    // Alle vier VORHER-Werte auf einmal lesen. Die spätere Reihenfolge der
    // Spieler darf niemals einen bereits zurückgesetzten Gegnerstand sehen.
    const before = new Map(m.players.map(pid => [pid, runs.get(pid) || 0]));
    m.players.forEach((pid, slot) => {
      if (!result.has(pid)) result.set(pid, {stopped: null, proof: null});
      const side = slot < 2 ? 'A' : 'B';
      if (m.winner !== side) return;
      const personal = result.get(pid);
      const opponents = m.players.slice(side === 'A' ? 2 : 0, side === 'A' ? 4 : 2);
      for (const opponent of opponents) {
        const wins = before.get(opponent);
        if (wins <= (personal.stopped ?? 0)) continue;
        personal.stopped = wins;
        personal.proof = {
          opponent, wins, stoppedBy: m.id ?? index,
          timestamp: stamp(m.timestamp)
        };
      }
    });
    // Erst nachdem BEIDE Gewinner ihre Gegnerstände gelesen haben, alle
    // Serien fortschreiben. Andere Partien/Tage/Monate beenden sie nicht.
    m.players.forEach((pid, slot) => {
      runs.set(pid, (slot < 2 ? 'A' : 'B') === m.winner ? before.get(pid) + 1 : 0);
    });
  }
  return result;
}

function pearson(a, b) {
  if (a.length < 2) return null;
  const mean = xs => xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const ma = mean(a), mb = mean(b);
  let xx = 0, yy = 0, xy = 0;
  a.forEach((x, i) => {
    const dx = x - ma, dy = b[i] - mb;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  });
  return xx && yy ? xy / Math.sqrt(xx * yy) : null;
}

function ranks(players, key) {
  // Durchschnittsränge bei Gleichstand, nicht künstlich nach Siegen trennen.
  return players.map(p => players.filter(q => q[key] > p[key]).length
    + (players.filter(q => q[key] === p[key]).length + 1) / 2);
}

function measureFixture(fixturePath = FIXTURE) {
  const matches = fs.readFileSync(fixturePath, 'utf8').trim().split(';')
    .filter(Boolean).map((row, index) => {
      const f = row.split(',').map(Number);
      return {
        id: 'm' + String(index).padStart(4, '0'),
        players: f.slice(0, 4), roles: f.slice(4, 8),
        a: f[8], b: f[9], winner: f[10] === 0 ? 'A' : 'B',
        timestamp: f[12] * 1000
      };
    }).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));

  const personal = NAMES.map(() => []);
  matches.forEach(m => {
    const day = dayFormatter.format(new Date(m.timestamp));
    m.players.forEach((pid, slot) => {
      const side = slot < 2 ? 'A' : 'B';
      personal[pid].push({
        id: m.id, timestamp: m.timestamp, day,
        partner: m.players[slot ^ 1], role: m.roles[slot],
        opponents: m.players.slice(side === 'A' ? 2 : 0, side === 'A' ? 4 : 2),
        won: m.winner === side,
        gf: side === 'A' ? m.a : m.b,
        ga: side === 'A' ? m.b : m.a
      });
    });
  });

  const stopped = measureStops(matches);
  const rows = NAMES.map((name, pid) => {
    const raw = recordRuns(personal[pid]);
    if (raw.proof.escape) {
      raw.proof.escape.opponentName = NAMES[raw.proof.escape.opponent];
    }
    const stop = stopped.get(pid);
    raw.stopped = stop?.stopped ?? null;
    if (stop?.proof) {
      raw.proof.stopped = {...stop.proof, opponentName: NAMES[stop.proof.opponent]};
    }
    return {name, pid, eligible: raw.games >= MIN_GAMES, ...raw};
  });
  const rated = rows.filter(p => p.eligible);
  const top = key => {
    const candidates = rated.filter(p => Number.isFinite(p[key]));
    if (!candidates.length) return {key, value: null, holders: []};
    const best = Math.max(...candidates.map(p => p[key]));
    return {key, value: best,
      holders: candidates.filter(p => p[key] === best).map(p => p.name)};
  };
  const comparison = (a, b) => {
    const players = rated.filter(p => Number.isFinite(p[a]) && Number.isFinite(p[b]));
    const ha = top(a).holders, hb = top(b).holders;
    const union = new Set([...ha, ...hb]).size;
    return {
      a, b, n: players.length,
      pearson: pearson(players.map(p => p[a]), players.map(p => p[b])),
      spearman: pearson(ranks(players, a), ranks(players, b)),
      holderJaccard: union ? ha.filter(name => hb.includes(name)).length / union : null
    };
  };

  return {
    fixtureMatches: matches.length,
    timezone: 'Europe/Berlin', globalMinimumGames: MIN_GAMES,
    counts: {matches: matches.length, players: rows.length, rated: rated.length},
    rows,
    leaders: ['echo', 'heart', 'wander', 'commuter', 'escape',
      'stopped', 'repeater', 'needle', 'roleSwitch'].map(top),
    comparisons: [comparison('echo', 'repeater'), comparison('heart', 'needle'),
      comparison('commuter', 'roleSwitch')]
  };
}

module.exports = {measureFixture, recordRuns, measureStops};

if (require.main === module) {
  const result = measureFixture();
  console.log(`${result.fixtureMatches} Fixture-Partien · ${result.counts.rated}/${result.counts.players} gewertet · ${result.timezone}`);
  result.leaders.forEach(p => console.log(`${p.key}: ${p.value} · ${p.holders.join(', ') || 'kein Ereignis'}`));
  result.comparisons.forEach(p => console.log(`${p.a}/${p.b}: Spearman ${p.spearman?.toFixed(3)} · Halter-Jaccard ${p.holderJaccard?.toFixed(3)}`));
}
