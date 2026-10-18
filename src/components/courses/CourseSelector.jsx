
export default function CourseSelector({ courses, onSelectTee }) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-baggygolf-950">
                Select a course and tee
            </h2>

            {courses.map((course) => (
                <div
                    key={course.id}
                    className="rounded-xl border border-baggygolf-line bg-baggygolf-surface p-4"
                >
                    <h3 className="text-lg font-semibold text-baggygolf-950">
                        {course.name}
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {(course.teeSets ?? []).map((tee) => (
                            <button
                                key={tee.id}
                                type="button"
                                onClick={() => onSelectTee(course, tee)}
                                className="rounded-lg border border-baggygolf-line p-4 text-left transition hover:border-baggygolf-800 hover:bg-baggygolf-50"
                            >
                                <div className="mb-2 flex items-center gap-2">
                  <span
                      className="h-3 w-3 rounded-full border border-baggygolf-line"
                      style={{
                          backgroundColor: tee.colour?.toLowerCase() ?? 'gray',
                      }}
                  />

                                    <span className="font-semibold">{tee.name}</span>
                                </div>

                                <div className="space-y-1 text-sm text-baggygolf-muted">
                                    <p>Par: {tee.par}</p>
                                    <p>Course Rating: {tee.courseRating}</p>
                                    <p>Slope Rating: {tee.slopeRating}</p>
                                    <p>Distance: {tee.yardage} yards</p>
                                    <p>Gender: {tee.gender ?? 'Not specified'}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
