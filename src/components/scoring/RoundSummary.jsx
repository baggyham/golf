import { useMemo } from 'react';
import { getRoundPlayingHandicap } from '../../lib/handicap.js';
import { calculateRoundStableford } from '../../lib/stableford.js';
import { emptyScorecard } from '../../repositories/scoreEntryRepository.js';
import GolfScorecardTable from './GolfScorecardTable.jsx';

/** Adapts this recorder's provisional score entries to the reusable paper scorecard. */
export default function RoundSummary({ tournament, round, participants, cards, onSelectHole }) {
  const holes = round.scorecard?.holes ?? [];
  const players = useMemo(() => participants.map(([id, player]) => {
    const scores = cards[id] ?? emptyScorecard();
    let playingHandicap = null;
    let points = Array(18).fill(null);
    try {
      playingHandicap = getRoundPlayingHandicap(player, tournament.handicapMode, round);
      const calculated = calculateRoundStableford({ holes, scores, playingHandicap });
      points = calculated.holes.map((hole) => hole.points);
    } catch { /* Course ratings or handicap may not be set yet. */ }
    return { id, name: player.displayName || player.username || 'Player', playingHandicap, scores, points };
  }), [participants, cards, holes, round, tournament.handicapMode]);

  return <div className="space-y-2">
    <p className="text-xs" style={{ color: 'var(--muted, #667469)' }}>Tap a hole number to edit scores.</p>
    <GolfScorecardTable holes={holes} players={players} onSelectHole={onSelectHole} statusLabel="Provisional scores" />
  </div>;
}
