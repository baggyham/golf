
/**
 * Round to the nearest whole number,
 * with exact halves rounded away from zero.
 */
export function roundHandicap(value) {
    if (!Number.isFinite(value)) {
        throw new Error('Invalid handicap value.');
    }

    return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

/**
 * WHS Course Handicap, 18 holes.
 */
export function calculateCourseHandicap({
                                            handicapIndex,
                                            slopeRating,
                                            courseRating,
                                            par,
                                        }) {
    if (
        !Number.isFinite(handicapIndex) ||
        handicapIndex < -10 ||
        handicapIndex > 54
    ) {
        throw new Error('Invalid Handicap Index.');
    }

    if (
        !Number.isInteger(slopeRating) ||
        slopeRating < 55 ||
        slopeRating > 155
    ) {
        throw new Error('Slope Rating must be between 55 and 155.');
    }

    if (
        !Number.isFinite(courseRating) ||
        courseRating <= 0
    ) {
        throw new Error('Invalid Course Rating.');
    }

    if (!Number.isInteger(par) || par < 54 || par > 108) {
        throw new Error('Invalid course par.');
    }

    const unrounded =
        handicapIndex * (slopeRating / 113) +
        (courseRating - par);

    return roundHandicap(unrounded);
}

/**
 * Find the Playing Handicap for a tournament participant.
 *
 * Fixed mode uses the tournament's stored handicap directly.
 * Course mode calculates a handicap from the round's tee ratings.
 *
 * No additional handicap allowance is applied.
 */
export function getRoundPlayingHandicap(
    participant,
    handicapMode,
    round,
) {
    if (handicapMode === 'fixed') {
        const handicap = participant.fixedPlayingHandicap;

        if (!Number.isInteger(handicap)) {
            throw new Error('Fixed Playing Handicap is missing.');
        }

        return handicap;
    }

    if (handicapMode === 'course') {
        if (!round.scorecard?.holes || !round.teeRatings) {
            throw new Error('Round scorecard or tee ratings are missing.');
        }

        return calculateCourseHandicap({
            handicapIndex: participant.handicapIndexSnapshot,
            slopeRating: round.teeRatings.slopeRating,
            courseRating: round.teeRatings.courseRating,
            par: round.scorecard.totalPar,
        });
    }

    throw new Error('Unknown tournament handicap mode.');
}

/**
 * Handicap strokes allocated to one hole.
 *
 * Also supports plus handicaps (negative Playing Handicaps).
 */
export function getHoleHandicapStrokes(
    playingHandicap,
    strokeIndex,
) {
    if (!Number.isInteger(playingHandicap)) {
        throw new Error('Playing Handicap must be a whole number.');
    }

    if (
        !Number.isInteger(strokeIndex) ||
        strokeIndex < 1 ||
        strokeIndex > 18
    ) {
        throw new Error('Invalid stroke index.');
    }

    if (playingHandicap >= 0) {
        return (
            Math.floor(playingHandicap / 18) +
            (strokeIndex <= playingHandicap % 18 ? 1 : 0)
        );
    }

    const strokesGiven = Math.abs(playingHandicap);

    const strokes = Math.floor(strokesGiven / 18) +
        (strokeIndex > 18 - (strokesGiven % 18) ? 1 : 0);
    return strokes === 0 ? 0 : -strokes;
}

/** Sum the par values for a complete course. */
export function coursePar(course) {
  if (!Array.isArray(course?.holes) || course.holes.length !== 18) {
    throw new Error('An 18-hole course is required.');
  }
  return course.holes.reduce((sum, hole) => sum + hole.par, 0);
}

/** Legacy unrounded Course Handicap for the original UI. */
export function unroundedCourseHandicap(handicapIndex, course) {
  const par = coursePar(course);
  const slopeRating = Number(course.slopeRating ?? course.slope ?? 113);
  const courseRating = Number(course.courseRating ?? course.rating ?? par);

  if (!Number.isFinite(handicapIndex) || handicapIndex < -10 || handicapIndex > 54 ||
      !Number.isInteger(slopeRating) || slopeRating < 55 || slopeRating > 155 ||
      !Number.isFinite(courseRating) || courseRating <= 0) {
    throw new Error('Invalid handicap or course ratings.');
  }
  return handicapIndex * (slopeRating / 113) + courseRating - par;
}

export function courseHandicap(handicapIndex, course) {
  return roundHandicap(unroundedCourseHandicap(handicapIndex, course));
}

/** Legacy UI allowance applies to the unrounded handicap before rounding. */
export function playingHandicap(handicapIndex, course, allowance = 1) {
  if (!Number.isFinite(allowance) || allowance < 0 || allowance > 1) {
    throw new Error('Invalid handicap allowance.');
  }
  return roundHandicap(unroundedCourseHandicap(handicapIndex, course) * allowance);
}

export function strokesReceived(playingHandicapValue, strokeIndex) {
  return getHoleHandicapStrokes(playingHandicapValue, strokeIndex);
}
