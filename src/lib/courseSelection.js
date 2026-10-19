import { validateHoles, validateTee } from './courseLibrary.js';

/** A self-contained historical snapshot; no later library update can change these values. */
export function makeCourseSnapshot(club, course, tee) {
  if (!club?.id || !course?.id || !tee?.id) throw new Error('Select a club, course and tee set.');
  const holes = validateHoles(course.holes);
  const rating = validateTee(tee);
  return {
    source: { clubId: club.id, courseId: course.id, teeId: tee.id },
    clubName: String(club.name).trim(),
    courseName: String(course.name).trim(),
    teeName: rating.name,
    teeColour: rating.colour,
    yardage: rating.yardage,
    holes,
    totalPar: holes.reduce((sum, hole) => sum + hole.par, 0),
    courseRating: rating.courseRating,
    slopeRating: rating.slopeRating,
  };
}
