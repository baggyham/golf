
import { getHoleHandicapStrokes } from './handicap.js';

/**
 * Calculate Stableford points for a single hole.
 *
 * null       = No score entered
 * 'pickup'   = Player picked up (0 points)
 * number     = Gross strokes
 */
export function calculateHoleStableford({
                                          grossStrokes,
                                          par,
                                          strokeIndex,
                                          playingHandicap,
                                        }) {
  if (grossStrokes === null || grossStrokes === undefined) {
    return null;
  }

  if (!Number.isInteger(par) || par < 3 || par > 6) {
    throw new Error('Invalid hole par.');
  }

  const handicapStrokes = getHoleHandicapStrokes(
      playingHandicap,
      strokeIndex,
  );

  if (grossStrokes === 'pickup' || grossStrokes === 0) {
    return 0;
  }

  if (
      !Number.isInteger(grossStrokes) ||
      grossStrokes < 1 ||
      grossStrokes > 30
  ) {
    throw new Error('Gross strokes must be between 1 and 30.');
  }

  return Math.max(
      0,
      2 + par + handicapStrokes - grossStrokes,
  );
}

/**
 * Calculate totals for an 18-hole round.
 *
 * Missing holes do not count as completed.
 * Picked-up holes count as completed with 0 points.
 */
export function calculateRoundStableford({
                                           holes,
                                           scores,
                                           playingHandicap,
                                         }) {
  if (!Array.isArray(holes) || holes.length !== 18) {
    throw new Error('A valid 18-hole scorecard is required.');
  }

  if (!Array.isArray(scores) || scores.length !== 18) {
    throw new Error('Exactly 18 score entries are required.');
  }

  const results = holes.map((hole, index) => {
    const grossStrokes = scores[index];

    const handicapStrokes = getHoleHandicapStrokes(
        playingHandicap,
        hole.strokeIndex,
    );

    const points = calculateHoleStableford({
      grossStrokes,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      playingHandicap,
    });

    return {
      holeNumber: hole.number,
      par: hole.par,
      strokeIndex: hole.strokeIndex,
      grossStrokes,
      handicapStrokes,
      points,
    };
  });

  const completedHoles = results.filter(
      (hole) => hole.points !== null,
  ).length;

  const totalPoints = results.reduce(
      (total, hole) => total + (hole.points ?? 0),
      0,
  );

  return {
    holes: results,
    totalPoints,
    completedHoles,
    remainingHoles: 18 - completedHoles,
    isComplete: completedHoles === 18,
  };
}


/**
 * Legacy summary for the original tournament dashboard.
 *
 * Supports:
 * playerSummary(scores, course, playingHandicap)
 */
export function playerSummary(scores, course, playingHandicap) {
  const holes = course?.holes ?? [];

  if (!Array.isArray(holes) || holes.length !== 18) {
    return {
      totalPoints: 0,
      points: 0,
      holesPlayed: 0,
      completedHoles: 0,
      remainingHoles: 18,
      isComplete: false,
      holes: [],
    };
  }

  const rawScores = Array.isArray(scores) ? scores : [];

  const normalisedScores = Array.from(
      { length: 18 },
      (_, index) => {
        const score = rawScores[index];

        if (score === null || score === undefined || score === '') {
          return null;
        }

        if (score === 'pickup' || score === 0) {
          return 'pickup';
        }

        if (typeof score === 'object') {
          if (score.pickup === true) {
            return 'pickup';
          }

          const strokes = score.grossStrokes ?? score.strokes;

          if (strokes === null || strokes === undefined || strokes === '') {
            return null;
          }

          return Number(strokes);
        }

        return Number(score);
      },
  );

  const result = calculateRoundStableford({
    holes: holes.map((hole, index) => ({
      number: index + 1,
      par: hole.par,
      strokeIndex: hole.strokeIndex ?? hole.si,
    })),
    scores: normalisedScores,
    playingHandicap,
  });

  return {
    ...result,
    points: result.totalPoints,
    holesPlayed: result.completedHoles,
  };
}

/** Original Scorecard.jsx API: pointsOnHole(gross, hole, playingHandicap). */
export function pointsOnHole(grossStrokes, hole, playingHandicap) {
  return calculateHoleStableford({
    grossStrokes,
    par: hole.par,
    strokeIndex: hole.strokeIndex ?? hole.si,
    playingHandicap,
  });
}
