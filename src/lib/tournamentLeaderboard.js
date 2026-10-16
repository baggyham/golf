import { calculateProvisionalLeaderboard } from './leaderboard.js';
import { calculateOfficialLeaderboard } from './officialLeaderboard.js';

/** Official completed rounds plus provisional live/awaiting-verification rounds. */
export function calculateTournamentLeaderboard(tournament, roundsWithEntries) {
  if (!Array.isArray(roundsWithEntries)) throw new Error('Rounds must be an array.');
  const totals = new Map(Object.entries(tournament.participants ?? {}).map(([playerId, p]) => [playerId, {
    playerId, displayName: p.displayName ?? 'Player', points: 0, officialPoints: 0,
    provisionalPoints: 0, holesScored: 0, disputedHoles: 0, roundsPlayed: 0,
    roundPoints: {}, hasProvisional: false,
  }]));
  const ordered = [...roundsWithEntries].sort((a, b) =>
    (a.round.date ?? '').localeCompare(b.round.date ?? '') || a.round.id.localeCompare(b.round.id));
  for (const { round, entries, verifiedScores } of ordered) {
    if (!round?.id) throw new Error('Round ID is required.');
    if (round.status === 'draft') continue;
    if (!round.scorecard?.holes) throw new Error(`Round ${round.name || round.id} has no scorecard.`);
    const official = round.status === 'completed';
    const standings = official
      ? calculateOfficialLeaderboard(tournament, round, verifiedScores)
      : calculateProvisionalLeaderboard(tournament, round, entries ?? []);
    for (const score of standings) {
      const row = totals.get(score.playerId);
      if (!row) continue;
      row.points += score.points;
      if (official) row.officialPoints += score.points;
      else { row.provisionalPoints += score.points; row.hasProvisional = true; }
      row.holesScored += score.holesScored;
      row.disputedHoles += score.disputedHoles;
      if (score.holesScored > 0) row.roundsPlayed += 1;
      row.roundPoints[round.id] = score.points;
    }
  }
  return [...totals.values()]
    .sort((a, b) => b.points-a.points || b.holesScored-a.holesScored || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId))
    .map((row,i) => ({...row,position:i+1}));
}
