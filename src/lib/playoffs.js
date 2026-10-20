import { getHoleHandicapStrokes, getRoundPlayingHandicap } from './handicap.js';
import { calculateRoundStableford } from './stableford.js';

export const PLAYOFF_FORMATS = ['full_round', 'sudden_death'];

export function tiedLeaders(standings) {
  if (!Array.isArray(standings) || standings.length < 2) return [];
  const best = Math.max(...standings.map(row => row.totalPoints));
  return standings.filter(row => row.totalPoints === best).map(row => row.playerId);
}

export function makePlayoffAttempt(tournament, round, playerIds, format) {
  if (!PLAYOFF_FORMATS.includes(format)) throw new Error('Choose a playoff format.');
  if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4 || new Set(playerIds).size !== playerIds.length) throw new Error('A playoff needs at least two tied players.');
  if (!Array.isArray(round?.scorecard?.holes) || round.scorecard.holes.length !== 18) throw new Error('Choose a configured 18-hole course.');
  const playingHandicaps = {};
  const scores = {};
  for (const id of playerIds) {
    if (!tournament.participants?.[id]) throw new Error('Invalid playoff participant.');
    playingHandicaps[id] = getRoundPlayingHandicap(tournament.participants[id], tournament.handicapMode, round);
    scores[id] = Array(18).fill(null);
  }
  return {
    format, playerIds, sourceRoundId: round.id, courseName: round.courseName || round.name || 'Playoff course',
    scorecard: round.scorecard, playingHandicaps, scores,
  };
}

export function validPlayoffScore(score, format) {
  return score === null || (format === 'full_round' && score === 'pickup') || (Number.isInteger(score) && score >= 1 && score <= 30);
}

/** Pure scoring: an unfinished hole is never assumed to be a tie or a win. */
export function evaluatePlayoff(playoff) {
  if (!PLAYOFF_FORMATS.includes(playoff?.format)) throw new Error('Invalid playoff format.');
  const { playerIds, scores, playingHandicaps, scorecard, format } = playoff;
  if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 4 || new Set(playerIds).size !== playerIds.length ||
      !Array.isArray(scorecard?.holes) || scorecard.holes.length !== 18) throw new Error('Invalid playoff setup.');
  for (const id of playerIds) {
    if (!Number.isInteger(playingHandicaps?.[id]) || !Array.isArray(scores?.[id]) || scores[id].length !== 18 ||
        scores[id].some(score => !validPlayoffScore(score, format))) throw new Error('Invalid playoff scores.');
  }
  if (format === 'full_round') {
    const totals = Object.fromEntries(playerIds.map(id => [id, calculateRoundStableford({
      holes: scorecard.holes, scores: scores[id], playingHandicap: playingHandicaps[id],
    })]));
    const complete = playerIds.every(id => totals[id].isComplete);
    const best = Math.max(...playerIds.map(id => totals[id].totalPoints));
    const leaders = playerIds.filter(id => totals[id].totalPoints === best);
    return { complete, winnerId: complete && leaders.length === 1 ? leaders[0] : null,
      tiedIds: complete ? leaders : [], totals, holesCompleted: Math.min(...playerIds.map(id => totals[id].completedHoles)) };
  }
  let contenders = [...playerIds];
  let holesCompleted = 0;
  for (let index = 0; index < 18; index += 1) {
    if (contenders.some(id => scores[id][index] === null)) break;
    const hole = scorecard.holes[index];
    const net = contenders.map(id => ({ id,
      value: scores[id][index] - getHoleHandicapStrokes(playingHandicaps[id], hole.strokeIndex),
    }));
    const lowest = Math.min(...net.map(row => row.value));
    contenders = net.filter(row => row.value === lowest).map(row => row.id);
    holesCompleted = index + 1;
    if (contenders.length === 1) {
      return { complete: true, winnerId: contenders[0], tiedIds: [], holesCompleted, contenders };
    }
  }
  return { complete: holesCompleted === 18, winnerId: null,
    tiedIds: holesCompleted === 18 ? contenders : [], holesCompleted, contenders };
}

/** Playoff scores never change the original Stableford totals. */
export function resolveMajorStandings(standings, winnerId) {
  const leaders = tiedLeaders(standings);
  if (!leaders.includes(winnerId)) throw new Error('Playoff winner must be a tied leader.');
  return standings.map(row => {
    if (row.playerId === winnerId) return { ...row, position: 1 };
    if (leaders.includes(row.playerId)) return { ...row, position: 2, playoffRunnerUp: true };
    return row;
  }).sort((a, b) => a.position - b.position || b.totalPoints - a.totalPoints || a.displayName.localeCompare(b.displayName));
}

/** The players still alive immediately before this hole, even when editing a previous hole. */
export function playoffContendersAt(playoff, holeIndex) {
  if (playoff.format !== 'sudden_death') return playoff.playerIds;
  if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= 18) throw new Error('Invalid hole.');
  const earlierOnly = {
    ...playoff,
    scores: Object.fromEntries(playoff.playerIds.map(id => [id,
      playoff.scores[id].map((score, index) => index < holeIndex ? score : null),
    ])),
  };
  return evaluatePlayoff(earlierOnly).contenders;
}
