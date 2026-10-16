import { calculateOfficialLeaderboard } from './officialLeaderboard.js';

/** Pure final standings from completed rounds and organiser-verified scorecards. */
export function calculateFinalTournamentResults(tournament, roundData) {
  if (!Array.isArray(roundData) || roundData.length === 0) {
    throw new Error('A tournament needs at least one completed round.');
  }
  const participants = Object.entries(tournament.participants ?? {});
  if (participants.length < 1 || participants.length > 4) {
    throw new Error('Invalid tournament participants.');
  }
  const totals = new Map(participants.map(([id, p]) => [id, {
    playerId: id, displayName: p.displayName ?? 'Player', totalPoints: 0,
    roundPoints: {},
  }]));
  for (const { round, verifiedScores } of roundData) {
    if (round.status !== 'completed') {
      throw new Error(`${round.name || 'A round'} is not completed.`);
    }
    const rows = calculateOfficialLeaderboard(tournament, round, verifiedScores);
    for (const row of rows) {
      const total = totals.get(row.playerId);
      if (!total) throw new Error('A verified player is not a tournament participant.');
      total.totalPoints += row.points;
      total.roundPoints[round.id] = row.points;
    }
  }
  const standings = [...totals.values()].sort((a, b) =>
    b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName) || a.playerId.localeCompare(b.playerId)
  );
  let previousPoints = null;
  let position = 0;
  standings.forEach((row, index) => {
    if (row.totalPoints !== previousPoints) position = index + 1;
    row.position = position;
    previousPoints = row.totalPoints;
  });
  return {
    standings,
    winnerIds: standings.filter((row) => row.position === 1).map((row) => row.playerId),
  };
}
