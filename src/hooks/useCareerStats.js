import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { getMyTournaments } from '../repositories/tournamentRepository.js';
import { calculateCareerStats } from '../lib/careerStats.js';

export function useCareerStats(playerId, initialTournaments = null) {
  const [state, setState] = useState({ stats: null, loading: true, error: '' });
  useEffect(() => {
    let live = true;
    if (!playerId) { setState({ stats: null, loading: false, error: '' }); return undefined; }
    setState({ stats: null, loading: true, error: '' });
    (async () => {
      const data = initialTournaments ?? await getMyTournaments(playerId);
      const completed = data.filter((t) => t.status === 'completed' && t.participants?.[playerId]);
      const records = [];
      for (const tournament of completed) {
        const rounds = await getDocs(collection(db, 'tournaments', tournament.id, 'rounds'));
        for (const document of rounds.docs) {
          const round = { id: document.id, ...document.data() };
          if (round.status !== 'completed') continue;
          // Query only this player's verified card, never provisional submissions.
          const card = await getDoc(doc(db, 'tournaments', tournament.id, 'rounds', round.id, 'verifiedScores', playerId));
          if (card.exists()) records.push({ tournament, round, verified: card.data() });
        }
      }
      if (live) setState({ stats: calculateCareerStats(playerId, completed, records), loading: false, error: '' });
    })().catch((error) => { console.error('Career record load failed', error); if (live) setState({ stats: null, loading: false, error: 'Unable to load your career record.' }); });
    return () => { live = false; };
  }, [playerId, initialTournaments]);
  return state;
}
