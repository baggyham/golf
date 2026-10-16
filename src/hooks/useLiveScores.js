import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';

/** Read-only live listener; score writes remain in scoreEntryRepository. */
export function useLiveScores(tournamentId, roundId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setEntries([]);
    setError('');
    setLoading(true);
    if (!tournamentId || !roundId) {
      setLoading(false);
      return undefined;
    }

    const entriesRef = collection(db, 'tournaments', tournamentId, 'rounds', roundId, 'scoreEntries');
    return onSnapshot(entriesRef, (snapshot) => {
      setEntries(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
    }, (reason) => {
      setError(reason.message || 'Unable to load live scores.');
      setLoading(false);
    });
  }, [tournamentId, roundId]);

  return { entries, loading, error };
}
