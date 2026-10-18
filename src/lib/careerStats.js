import { calculateRoundStableford } from './stableford.js';
import { getRoundPlayingHandicap } from './handicap.js';

/** Build a player's career record using completed tournaments and verified rounds only. */
export function calculateCareerStats(playerId, completedTournaments, roundRecords = []) {
  const tournaments = completedTournaments.filter((t) => t.status === 'completed' && t.participants?.[playerId]);
  const wins = tournaments.filter((t) => (t.winnerIds ?? []).includes(playerId)).length;
  const podiums = tournaments.filter((t) => (t.finalStandings ?? []).some((row) => row.playerId === playerId && row.position <= 3)).length;
  const majors = tournaments.filter(t => t.tier === 'major');
  const majorWins = majors.filter(t => (t.winnerIds ?? []).includes(playerId)).length;
  const majorPodiums = majors.filter(t => (t.finalStandings ?? []).some(row => row.playerId === playerId && row.position <= 3)).length;
  const honours = tournaments.flatMap((t) => {
    const row = (t.finalStandings ?? []).find((r) => r.playerId === playerId);
    if (!row || ![1, 2, 3].includes(row.position)) return [];
    const labels = { 1: 'Champion', 2: 'Runner-up', 3: 'Third place' };
    return [{ id: `${t.id}-podium`, type: 'honour', title: labels[row.position], event: t.name, tournamentId: t.id, position: row.position, date: t.endDate }];
  });
  const completedRounds = roundRecords.filter(({ tournament, round, verified }) => tournament?.status === 'completed' && tournament.participants?.[playerId] && round?.status === 'completed' && Array.isArray(round.scorecard?.holes) && round.scorecard.holes.length === 18 && verified?.playerId === playerId && Array.isArray(verified.holes) && verified.holes.length === 18);
  const rounds = completedRounds.map(({ tournament, round, verified }) => {
    const playingHandicap = getRoundPlayingHandicap(tournament.participants[playerId], tournament.handicapMode, round);
    const result = calculateRoundStableford({ holes: round.scorecard.holes, scores: verified.holes, playingHandicap });
    if (!result.isComplete) return null;
    const eagles = result.holes.filter((hole) => typeof hole.grossStrokes === 'number' && hole.grossStrokes <= hole.par - 2).length;
    const birdies = result.holes.filter((hole) => typeof hole.grossStrokes === 'number' && hole.grossStrokes === hole.par - 1).length;
    return { tournamentId: tournament.id, event: tournament.name, roundId: round.id, roundName: round.name || 'Round', date: round.date, points: result.totalPoints, eagles, birdies };
  }).filter(Boolean);
  const bestRound = rounds.length ? Math.max(...rounds.map((r) => r.points)) : null;
  const eagleCount = rounds.reduce((sum, r) => sum + r.eagles, 0);
  const birdieCount = rounds.reduce((sum, r) => sum + r.birdies, 0);
  const awards = [...honours];
  for (const round of rounds) {
    if (round.eagles) awards.push({ id: `${round.tournamentId}-${round.roundId}-eagle`, type: 'round', title: `Eagle${round.eagles > 1 ? ` ×${round.eagles}` : ''}`, event: `${round.event} · ${round.roundName}`, tournamentId: round.tournamentId, date: round.date });
    if (round.points >= 40) awards.push({ id: `${round.tournamentId}-${round.roundId}-40`, type: 'round', title: '40+ Stableford', event: `${round.event} · ${round.roundName}`, tournamentId: round.tournamentId, date: round.date });
  }
  const fortyPlusRounds = rounds.filter(r => r.points >= 40).length;
  const averagePoints = rounds.length ? rounds.reduce((sum, r) => sum + r.points, 0) / rounds.length : null;
  return { playerId, honours, fortyPlusRounds, averagePoints, wins, podiums, majorWins, majorPodiums, roundsPlayed: rounds.length, tournamentsPlayed: tournaments.length, bestRound, eagleCount, birdieCount, awards, rounds, tournaments };
}
