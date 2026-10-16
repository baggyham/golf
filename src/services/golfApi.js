const API_URL = import.meta.env.VITE_GOLF_API_URL;

export async function searchClubs(search, { limit = 10, signal } = {}) {
  const query = search.trim();

  if (query.length < 3) {
    return [];
  }

  const url = new URL(`${API_URL}/clubs`);

  url.searchParams.set('search', query);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Club search failed (${response.status})`);
  }

  return response.json();
}

export async function getClubCourses(clubId, { signal } = {}) {
  if (!API_URL) {
    throw new Error('VITE_GOLF_API_URL is not configured');
  }

  if (!clubId) {
    throw new Error('Club ID is required');
  }

  const url = new URL(
      `/clubs/${encodeURIComponent(clubId)}/courses`,
      API_URL,
  );

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Course lookup failed (${response.status})`);
  }

  return response.json();
}
