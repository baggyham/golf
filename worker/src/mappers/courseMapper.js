export function mapClubCourses(courses) {
    if (!Array.isArray(courses)) {
        return [];
    }

    return courses.map((course) => ({
        id: course.id,
        name: course.name,
        holes: course.holes,
        par: course.par,

        teeSets: (course.tee_sets ?? []).map((tee) => ({
            id: tee.id,
            name: tee.name,
            colour: tee.colour,
            gender: tee.gender,
            yardage: tee.total_yardage,
            metres: tee.total_metres,
            par: tee.par,
            courseRating: tee.course_rating,
            slopeRating: tee.slope_rating,
        })),
    }));
}