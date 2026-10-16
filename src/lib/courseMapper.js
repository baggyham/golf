export function mapImportedCourse(club, course, tee) {
    if (!club || !course || !tee) {
        throw new Error('Club, course and tee are required');
    }

    return {
        id: crypto.randomUUID(),
        name: `${club.name} - ${course.name}`,
        clubId: club.id,
        externalCourseId: course.id,
        externalTeeId: tee.id,
        source: 'ukgolfapi',

        tee: tee.name,
        gender: tee.gender,

        par: tee.par,
        courseRating: tee.courseRating,
        slopeRating: tee.slopeRating,

        yardage: tee.yardage,
        metres: tee.metres,

        // Hole details are not available yet.
        holes: [],
    };
}