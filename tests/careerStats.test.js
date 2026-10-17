import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCareerStats } from '../src/lib/careerStats.js';

const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
const tournament = { id: 't1', name: 'Club Open', status: 'completed', handicapMode: 'fixed', endDate: '2026-10-01', participants: { a: { displayName: 'A', fixedPlayingHandicap: 0 } }, winnerIds: ['a'], finalStandings: [{ playerId: 'a', position: 1, totalPoints: 42 }] };
const round = { id: 'r1', name: 'First Round', status: 'completed', date: '2026-10-01', scorecard: { holes } };

test('awards only completed verified scores and completed tournament honours', () => {
  const verified = { playerId: 'a', holes: [2, 3, ...Array(16).fill(4)] };
  const result = calculateCareerStats('a', [tournament], [{ tournament, round, verified }]);
  assert.equal(result.wins, 1);
  assert.equal(result.podiums, 1);
  assert.equal(result.roundsPlayed, 1);
  assert.equal(result.eagleCount, 1);
  assert.equal(result.birdieCount, 1);
  assert.equal(result.bestRound, 39);
  assert.equal(result.awards.some(a => a.title === 'Champion'), true);
  assert.equal(result.awards.some(a => a.title === 'Eagle'), true);
  const draft = { ...tournament, status: 'in_progress' };
  const ignored = calculateCareerStats('a', [draft], [{ tournament: draft, round, verified }]);
  assert.equal(ignored.roundsPlayed, 0);
  assert.equal(ignored.wins, 0);
});

test('separates honours from on-course statistics without duplicate trophy badges', () => {
  const verified = { playerId: 'a', holes: Array(18).fill(3) };
  const result = calculateCareerStats('a', [tournament], [{ tournament, round, verified }]);
  assert.equal(result.honours.length, 1);
  assert.equal(result.honours[0].title, 'Champion');
  assert.equal(result.awards.some(a => a.type === 'round'), true); // backwards compatibility
  assert.equal(result.fortyPlusRounds, 1);
  assert.equal(typeof result.averagePoints, 'number');
});
