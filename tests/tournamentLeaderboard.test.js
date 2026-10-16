import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTournamentLeaderboard } from '../src/lib/tournamentLeaderboard.js';

const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
const tournament = { handicapMode: 'fixed', participants: {
  a: { displayName: 'Alex', fixedPlayingHandicap: 18 },
  b: { displayName: 'Ben', fixedPlayingHandicap: 18 },
} };
const round = (id, status = 'in_progress') => ({ id, date: '2027-06-11', status, scorecard: { holes, totalPar: 72 } });
const entry = (playerId, recordedBy, strokes) => ({ playerId, recordedBy, holes: [...strokes, ...Array(18 - strokes.length).fill(null)], createdAt: { seconds: 1 } });

test('adds points across rounds without counting missing holes', () => {
  const rows = calculateTournamentLeaderboard(tournament, [
    { round: round('r1', 'awaiting_verification'), entries: [entry('a', 'a', [5, 4])] },
    { round: round('r2'), entries: [entry('a', 'a', [6]), entry('b', 'b', [4])] },
  ]);
  const alex = rows.find((x) => x.playerId === 'a');
  assert.equal(alex.points, 2 + 3 + 1);
  assert.equal(alex.holesScored, 3);
  assert.equal(alex.roundsPlayed, 2);
  assert.equal(rows.find((x) => x.playerId === 'b').holesScored, 1);
});

test('self entry takes priority and disagreements are counted', () => {
  const rows = calculateTournamentLeaderboard(tournament, [
    { round: round('r1'), entries: [entry('a', 'a', [5]), entry('a', 'b', [6])] },
  ]);
  assert.equal(rows.find((x) => x.playerId === 'a').points, 2);
  assert.equal(rows.find((x) => x.playerId === 'a').disputedHoles, 1);
});

test('ignores unstarted draft rounds', () => {
  const rows = calculateTournamentLeaderboard(tournament, [
    { round: round('draft', 'draft'), entries: [entry('a', 'a', [4])] },
  ]);
  assert.equal(rows.find((x) => x.playerId === 'a').points, 0);
});
