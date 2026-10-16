import { getRoundPlayingHandicap } from './handicap.js';
import { calculateRoundStableford } from './stableford.js';

/** Official results exist ONLY for completed rounds, from verifiedScores documents. */
export function calculateOfficialLeaderboard(tournament, round, verifiedScores) {
  if (round?.status !== 'completed') throw new Error('This round is not completed.');
  if (!Array.isArray(round.scorecard?.holes) || round.scorecard.holes.length !== 18) {
    throw new Error('Completed round has no valid scorecard.');
  }
  const participants = Object.entries(tournament.participants ?? {});
  return participants.map(([playerId, participant]) => {
    const official = verifiedScores?.[playerId];
    if (!official || official.playerId !== playerId ||
        !Array.isArray(official.holes) || official.holes.length !== 18 ||
        official.holes.some((s) => s !== 'pickup' && (!Number.isInteger(s) || s < 1 || s > 30))) {
      throw new Error(`Missing or invalid verified scorecard for ${participant.displayName || playerId}.`);
    }
    const playingHandicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
    const score = calculateRoundStableford({
      holes: round.scorecard.holes, scores: official.holes, playingHandicap,
    });
    return {
      playerId, displayName: participant.displayName || 'Player', playingHandicap,
      points: score.totalPoints, holesScored: score.completedHoles,
      disputedHoles: 0, isComplete: true, official: true,
    };
  }).sort((a,b) => b.points-a.points || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId))
    .map((row,index) => ({ ...row, position:index+1 }));
}
