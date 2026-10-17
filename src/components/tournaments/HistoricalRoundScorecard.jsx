import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { getRoundPlayingHandicap } from '../../lib/handicap.js';
import { calculateRoundStableford } from '../../lib/stableford.js';
import GolfScorecardTable from '../scoring/GolfScorecardTable.jsx';

/** A read-only historical card sourced exclusively from verifiedScores. */
export default function HistoricalRoundScorecard({ tournament, round, onBack }) {
  const [official, setOfficial] = useState({ loading: true, cards: {}, error: '' });
  useEffect(() => {
    let live = true;
    setOfficial({ loading: true, cards: {}, error: '' });
    getDocs(collection(db, 'tournaments', tournament.id, 'rounds', round.id, 'verifiedScores'))
      .then(snapshot => {
        if (live) setOfficial({ loading: false, cards: Object.fromEntries(snapshot.docs.map(doc => [doc.id, doc.data().holes])), error: '' });
      })
      .catch(() => { if (live) setOfficial({ loading: false, cards: {}, error: 'Unable to load verified scorecards.' }); });
    return () => { live = false; };
  }, [tournament.id, round.id]);

  const { players, error } = useMemo(() => {
    const holes = round.scorecard?.holes ?? [];
    if (holes.length !== 18) return { players: [], error: 'This round has no complete course scorecard.' };
    try {
      return { players: Object.entries(tournament.participants ?? {}).map(([id, participant]) => {
        const scores = official.cards[id];
        if (!Array.isArray(scores) || scores.length !== 18) throw new Error('A verified player scorecard is missing.');
        const playingHandicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
        const points = calculateRoundStableford({ holes, scores, playingHandicap }).holes.map(hole => hole.points);
        return { id, name: participant.displayName || participant.username || 'Player', playingHandicap, scores, points };
      }), error: '' };
    } catch (err) { return { players: [], error: err.message }; }
  }, [official.cards, round, tournament]);

  return <div className="space-y-4" aria-label="Historical round scorecard">
    <button type="button" onClick={onBack} className="min-h-11 font-semibold" style={{ color: 'var(--ink)' }}>← Back to results</button>
    <div><p className="baggy-gold text-xs font-bold uppercase tracking-wider">Official scorecard</p><h2 className="text-xl font-bold">{round.name}</h2><p className="baggy-muted text-sm">{round.courseName || 'Course'} · {round.date}</p></div>
    {official.loading ? <p role="status" className="baggy-muted text-sm">Loading verified scores…</p> : official.error ? <p role="alert" className="text-sm text-red-600">{official.error}</p> : error ? <p role="alert" className="text-sm text-red-600">{error}</p> : <GolfScorecardTable holes={round.scorecard.holes} players={players} statusLabel="Official verified scores · Read-only" />}
  </div>;
}
