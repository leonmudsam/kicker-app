'use strict';
// Kleine, unabhängige Konzeptproben: keine App-Wertung und keine Elo-Engine.
// Die Eingabe sind ausschließlich die eigenen Partien in stabiler Reihenfolge.
function begegnungsFolgen(matches) {
  const sides = new Map(), fixed = new Map();
  let grenzverkehr = 0, fixpunkt = 0;
  for (const m of matches) {
    const known = v => v !== null && v !== undefined && v !== '';
    if (!m || !known(m.partner) || !Array.isArray(m.opponents) || m.opponents.length !== 2
        || !m.opponents.every(known) || new Set([m.partner, ...m.opponents]).size !== 3) {
      // Ein unbekanntes eigenes Match könnte ein Wiedersehen enthalten.
      // Es darf nicht aus der Folge herausgeschnitten werden.
      sides.clear(); fixed.clear(); continue;
    }
    const present = [[m.partner, 'partner'], ...m.opponents.map(id => [id, 'gegner'])];
    for (const [id, side] of present) {
      const previous = sides.get(id);
      const length = previous && previous.side !== side ? previous.length + 1 : 1;
      sides.set(id, {side, length});
      grenzverkehr = Math.max(grenzverkehr, length);
    }
    // Fixpunkt zählt ALLE eigenen Nachbarpartien, nicht nur Wiedersehen.
    const nextFixed = new Map();
    for (const id of m.opponents) {
      const length = (fixed.get(id) || 0) + 1;
      nextFixed.set(id, length); fixpunkt = Math.max(fixpunkt, length);
    }
    fixed.clear(); for (const [id, length] of nextFixed) fixed.set(id, length);
  }
  return {grenzverkehr, fixpunkt};
}

function teamGefalle(own, partner) {
  if (![own, partner].every(Number.isFinite)) return null;
  return Math.abs(own - partner);
}

function gegensprung(before, after) {
  const valid = m => m && typeof m.season === 'string' && m.season
    && m.partner !== null && m.partner !== undefined && m.partner !== ''
    && ['atk', 'def'].includes(m.role)
    && Array.isArray(m.opponents) && m.opponents.length === 2
    && new Set(m.opponents).size === 2
    && m.opponents.every(id => id !== null && id !== undefined && id !== '' && id !== m.partner)
    && Array.isArray(m.opponentElo) && m.opponentElo.length === 2
    && m.opponentElo.every(Number.isFinite);
  if (!valid(before) || !valid(after) || before.season !== after.season
      || before.partner !== after.partner || before.role !== after.role
      || before.opponents.some(id => after.opponents.includes(id))) return null;
  const mean = values => values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.abs(mean(after.opponentElo) - mean(before.opponentElo));
}

function rollenKontrast(groups, minimum = 1) {
  if (!Number.isInteger(minimum) || minimum < 1) throw new RangeError('Die Mindeststichprobe muss eine positive ganze Zahl sein.');
  // Die vier Gruppen werden von derselben Fachdefinition gebildet.
  // Gewicht pro Zielrolle ist 1/2, nicht abhängig vom Rollenpensum.
  const values = ['atkJa', 'atkNein', 'defJa', 'defNein'].map(key => {
    const group = groups[key];
    if (!Array.isArray(group) || group.length < minimum || !group.every(Number.isFinite)) return null;
    return group.reduce((sum, v) => sum + v, 0) / group.length;
  });
  if (values.some(v => v === null)) return null;
  return ((values[0] - values[1]) + (values[2] - values[3])) / 2;
}

module.exports = {begegnungsFolgen, teamGefalle, gegensprung, rollenKontrast};
