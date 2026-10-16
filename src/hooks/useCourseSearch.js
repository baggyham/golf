
import { useRef, useState } from 'react';
import { searchClubs } from '../services/golfApi.js';

export function useCourseSearch() {
  const [query, setQuery] = useState('');
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const requestRef = useRef(null);

  async function search() {
    const term = query.trim();

    if (term.length < 3 || loading) {
      return;
    }

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLoading(true);
    setError(null);
    setSearched(false);
    setClubs([]);

    try {
      const response = await searchClubs(term, {
        limit: 10,
        signal: controller.signal,
      });

      // UK Golf API returns { total, page, clubs: [...] }
      setClubs(response.clubs ?? []);
      setSearched(true);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  function updateQuery(value) {
    setQuery(value);
    setClubs([]);
    setSearched(false);
    setError(null);
  }

  return {
    query,
    setQuery: updateQuery,
    clubs,
    loading,
    error,
    searched,
    search,
  };
}
