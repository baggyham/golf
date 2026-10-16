import {
  searchClubs,
  getClubCourses,
} from './services/golfApi.js';
import { mapClubCourses } from './mappers/courseMapper.js';

import { jsonResponse } from './utils/responses.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (!env.UK_GOLF_API_KEY) {
      return jsonResponse({ error: 'API key not configured' }, 500);
    }

    // GET /clubs?search=Wentworth
    if (url.pathname === '/clubs') {
      const search = url.searchParams.get('search')?.trim() ?? '';
      const limit = Number(url.searchParams.get('limit') ?? 10);

      if (search.length > 100) {
        return jsonResponse(
            { error: 'Search must be 100 characters or fewer' },
            400,
        );
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
        return jsonResponse(
            { error: 'Limit must be between 1 and 20' },
            400,
        );
      }

      try {
        const data = await searchClubs(search, limit, env);
        return jsonResponse(data);
      } catch (error) {
        console.error('Club search failed:', error);
        return jsonResponse(
            { error: 'Could not retrieve golf clubs' },
            502,
        );
      }
    }

    // GET /clubs/:clubId/courses
    const coursesMatch = url.pathname.match(
        /^\/clubs\/([a-f0-9-]{36})\/courses$/,
    );

    if (coursesMatch) {
      try {
        const data = await getClubCourses(coursesMatch[1], env);

        const courses = mapClubCourses(data);

        return jsonResponse(courses);
      } catch (error) {
        console.error('Course lookup failed:', error);

        return jsonResponse(
            { error: 'Could not retrieve club courses' },
            502,
        );
      }
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};