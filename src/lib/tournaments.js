// Plain JavaScript domain functions. No browser APIs or React imports.
export const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const today = () => new Date().toLocaleDateString('en-CA');

export function validateCourse(course) {
  if (!course.name?.trim() || !course.tees?.trim()) return 'Enter a course name and tee name.';
  if (
    !Number.isFinite(Number(course.courseRating)) ||
    Number(course.courseRating) < 40 ||
    Number(course.courseRating) > 90
  )
    return 'Course Rating must be between 40 and 90.';
  if (
    !Number.isInteger(Number(course.slopeRating)) ||
    Number(course.slopeRating) < 55 ||
    Number(course.slopeRating) > 155
  )
    return 'Slope Rating must be between 55 and 155.';
  if (course.holes?.length !== 18) return 'The course must have exactly 18 holes.';
  if (
    course.holes.some(
      (h) => !Number.isInteger(Number(h.par)) || Number(h.par) < 3 || Number(h.par) > 6,
    )
  )
    return 'Every hole needs a valid par (3–6).';
  const indices = course.holes.map((h) => Number(h.strokeIndex)).sort((a, b) => a - b);
  if (indices.some((n, i) => n !== i + 1))
    return 'Stroke indices must include each number from 1 to 18 exactly once.';
  return null;
}

export function createTournament({ title, date, allowance, course, players }) {
  if (!title?.trim()) throw Error('Give the tournament a name.');
  if (!date) throw Error('Choose a tournament date.');
  const problem = validateCourse(course);
  if (problem) throw Error(problem);
  if (players.length < 1 || players.length > 4) throw Error('Select between 1 and 4 players.');
  if (
    players.some(
      (p) =>
        !p.name?.trim() ||
        !Number.isFinite(Number(p.handicapIndex)) ||
        Number(p.handicapIndex) < -10 ||
        Number(p.handicapIndex) > 54,
    )
  )
    throw Error('Check the selected players and their Handicap Index values.');
  return {
    id: createId(),
    title: title.trim(),
    date,
    status: 'active',
    allowance: Number(allowance),
    // Snapshots: editing a saved player or course must not rewrite old results.
    course: clone(course),
    players: clone(players),
    scores: Object.fromEntries(players.map((p) => [p.id, Array(18).fill(null)])),
    createdAt: new Date().toISOString(),
  };
}

export function updateScore(tournament, playerId, holeIndex, strokes) {
  if (tournament.status === 'completed') return tournament;
  if (!tournament.scores[playerId] || holeIndex < 0 || holeIndex >= 18) return tournament;
  if (strokes !== null && (!Number.isInteger(strokes) || strokes < 0 || strokes > 30))
    return tournament;
  return {
    ...tournament,
    scores: {
      ...tournament.scores,
      [playerId]: tournament.scores[playerId].map((score, index) =>
        index === holeIndex ? strokes : score,
      ),
    },
  };
}

export function isComplete(tournament) {
  return tournament.players.every(
    (player) =>
      tournament.scores[player.id]?.length === 18 &&
      tournament.scores[player.id].every((s) => s !== null),
  );
}
