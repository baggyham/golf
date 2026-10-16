/**
 * Select provisional scores from independent Firestore scorecard submissions.
 *
 * Scorecard document shape:
 * { playerId, recordedBy, holes: [number | 'pickup' | null, ...], createdAt }
 *
 * A player's own entry wins PER HOLE, not across their entire scorecard.
 * When there is no self-entry, the earliest submitted marker's entry wins.
 * Ties (including missing timestamps) are resolved by recorder UID to keep
 * results deterministic across devices and query ordering.
 * Conflicts are flagged, never silently discarded or treated as verification.
 */

const HOLE_COUNT = 18;

function isScore(value) {
  return value === 'pickup' || (Number.isInteger(value) && value >= 1 && value <= 30);
}

function timestampOrder(value) {
  if (value && typeof value.seconds === 'number') {
    return value.seconds * 1_000_000_000 + (value.nanoseconds ?? 0);
  }
  return Number.POSITIVE_INFINITY;
}

function compareEntries(a, b) {
  const aTime = timestampOrder(a.createdAt);
  const bTime = timestampOrder(b.createdAt);
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;
  return a.recordedBy.localeCompare(b.recordedBy);
}

/**
 * @param {string} playerId - Tournament participant whose results are selected
 * @param {Array<object>} entries - All independent scorecard submissions for a round
 * @returns {{playerId: string, scores: Array, holes: Array, disputes: Array, completedHoles: number, disputedHoles: number}}
 */
export function reconcilePlayerScores(playerId, entries) {
  if (typeof playerId !== 'string' || !playerId) {
    throw new Error('A player ID is required.');
  }
  if (!Array.isArray(entries)) {
    throw new Error('Score entries must be an array.');
  }

  const relevant = entries.filter((entry) => entry?.playerId === playerId);

  for (const entry of relevant) {
    if (typeof entry.recordedBy !== 'string' || !entry.recordedBy ||
        !Array.isArray(entry.holes) || entry.holes.length !== HOLE_COUNT ||
        entry.holes.some((score) => score !== null && !isScore(score))) {
      throw new Error(`Invalid score submission for player ${playerId}.`);
    }
  }

  const holes = Array.from({ length: HOLE_COUNT }, (_, index) => {
    const submitted = relevant
      .filter((entry) => isScore(entry.holes[index]))
      .sort(compareEntries);

    const selfEntry = submitted.find((entry) => entry.recordedBy === playerId);
    const selected = selfEntry ?? submitted[0] ?? null;
    const differentValues = new Set(submitted.map((entry) => entry.holes[index]));
    const disputed = differentValues.size > 1;

    return {
      holeNumber: index + 1,
      grossStrokes: selected?.holes[index] ?? null,
      recordedBy: selected?.recordedBy ?? null,
      source: selected ? (selfEntry ? 'self' : 'marker') : null,
      disputed,
      submissions: submitted.map((entry) => ({
        recordedBy: entry.recordedBy,
        grossStrokes: entry.holes[index],
      })),
    };
  });

  const disputes = holes.filter((hole) => hole.disputed);

  return {
    playerId,
    scores: holes.map((hole) => hole.grossStrokes),
    holes,
    disputes,
    completedHoles: holes.filter((hole) => hole.grossStrokes !== null).length,
    disputedHoles: disputes.length,
  };
}

/** Build provisional scorecards for a tournament's participant map. */
export function reconcileRoundScores(participants, entries) {
  if (!participants || typeof participants !== 'object' || Array.isArray(participants)) {
    throw new Error('A participants map is required.');
  }
  return Object.fromEntries(
    Object.keys(participants).map((playerId) => [
      playerId,
      reconcilePlayerScores(playerId, entries),
    ]),
  );
}
