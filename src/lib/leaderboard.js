import { reconcileRoundScores } from './scoreReconciliation.js';
import { getRoundPlayingHandicap } from './handicap.js';
import { calculateRoundStableford } from './stableford.js';

/** Derive provisional leaderboard from the independent, unverified submissions. */
export function calculateProvisionalLeaderboard(tournament, round, entries) {
  if (!Array.isArray(entries)) throw new Error('Score entries must be an array.');
  const holes = round?.scorecard?.holes;
  if (!Array.isArray(holes) || holes.length !== 18) {
    throw new Error('Configure the round scorecard before viewing the leaderboard.');
  }
  const participants = tournament?.participants ?? {};
  const reconciled = reconcileRoundScores(participants, entries);
  return Object.entries(participants).map(([playerId, participant]) => {
    const playingHandicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
    const provisional = reconciled[playerId];
    const stableford = calculateRoundStableford({ holes, scores: provisional.scores, playingHandicap });
    return {
      playerId,
      displayName: participant.displayName || 'Player',
      playingHandicap,
      points: stableford.totalPoints,
      holesScored: stableford.completedHoles,
      disputedHoles: provisional.disputedHoles,
      isComplete: stableford.isComplete,
      scorecard: provisional,
    };
  }).sort((a, b) => b.points - a.points || b.holesScored - a.holesScored || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId))
    .map((row, index) => ({ ...row, position: index + 1 }));
}
