import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProvisionalLeaderboard } from '../src/lib/leaderboard.js';

const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
const tournament = { handicapMode: 'fixed', participants: {
  a: { displayName: 'Alex', fixedPlayingHandicap: 18 },
  b: { displayName: 'Ben', fixedPlayingHandicap: 18 },
} };
const round = { scorecard: { holes, totalPar: 72 } };
function entry(playerId, recordedBy, scores) {
  return { playerId, recordedBy, holes: [ ...scores, ...Array(18 - scores.length).fill(null) ], createdAt: { seconds: 100 } };
}

test('self-score wins conflicts and disputes remain visible', () => {
  const board = calculateProvisionalLeaderboard(tournament, round, [entry('a', 'a', [5]), entry('a', 'b', [6])]);
  assert.equal(board[0].playerId, 'a');
  assert.equal(board[0].points, 2);
  assert.equal(board[0].disputedHoles, 1);
  assert.equal(board[0].holesScored, 1);
});

test('marker-only scores count provisionally; missing holes do not count', () => {
  const board = calculateProvisionalLeaderboard(tournament, round, [entry('b', 'a', [4, 'pickup'])]);
  const ben = board.find(p => p.playerId === 'b');
  assert.equal(ben.points, 3);
  assert.equal(ben.holesScored, 2);
  assert.equal(ben.disputedHoles, 0);
});
