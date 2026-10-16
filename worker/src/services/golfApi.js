const API_BASE_URL = 'https://uk-golf-course-data-api.p.rapidapi.com';
const API_HOST = 'uk-golf-course-data-api.p.rapidapi.com';

async function requestGolfApi(path, env, params = {}) {
    const url = new URL(`${API_BASE_URL}${path}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    });

    const response = await fetch(url, {
        headers: {
            'X-RapidAPI-Key': env.UK_GOLF_API_KEY,
            'X-RapidAPI-Host': API_HOST,
        },
    });

    if (!response.ok) {
        console.error('UK Golf API error:', response.status);
        throw new Error(`UK Golf API returned ${response.status}`);
    }

    return response.json();
}

export function searchClubs(search, limit, env) {
    return requestGolfApi('/clubs', env, {
        search,
        per_page: limit,
    });
}

export function getClubCourses(clubId, env) {
    return requestGolfApi(
        `/clubs/${encodeURIComponent(clubId)}/courses`,
        env,
    );
}

export function getCourseScorecard(courseId, env) {
    return requestGolfApi(
        `/courses/${encodeURIComponent(courseId)}/scorecard`,
        env,
    );
}
