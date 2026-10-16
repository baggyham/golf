import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePlayerScores, reconcileRoundScores } from '../src/lib/scoreReconciliation.js';

const card = (playerId, recordedBy, selections, createdAt = null) => {
  const holes = Array(18).fill(null);
  for (const [hole, value] of Object.entries(selections)) holes[Number(hole) - 1] = value;
  return { playerId, recordedBy, holes, createdAt };
};
const timestamp = (seconds) => ({ seconds, nanoseconds: 0 });

test('empty scorecard has no scored or disputed holes', () => {
  const result = reconcilePlayerScores('alice', []);
  assert.equal(result.completedHoles, 0);
  assert.equal(result.disputedHoles, 0);
  assert.deepEqual(result.scores, Array(18).fill(null));
});

test('self-entry overrides earlier marker and flags the disagreement', () => {
  const entries = [
    card('alice', 'bob', { 1: 6 }, timestamp(1)),
    card('alice', 'alice', { 1: 5 }, timestamp(2)),
  ];
  const result = reconcilePlayerScores('alice', entries);
  assert.equal(result.scores[0], 5);
  assert.equal(result.holes[0].source, 'self');
  assert.equal(result.disputedHoles, 1);
});

test('matching independent entries are not disputed', () => {
  const result = reconcilePlayerScores('alice', [card('alice', 'alice', { 2: 4 }), card('alice', 'bob', { 2: 4 })]);
  assert.equal(result.scores[1], 4);
  assert.equal(result.disputedHoles, 0);
});

test('marker fills unscored self holes independently', () => {
  const result = reconcilePlayerScores('alice', [card('alice', 'alice', { 1: 3 }), card('alice', 'bob', { 2: 5 })]);
  assert.equal(result.scores[0], 3);
  assert.equal(result.scores[1], 5);
  assert.equal(result.completedHoles, 2);
});

test('marker fallback is earliest submitted, regardless of input order', () => {
  const entries = [card('alice', 'charlie', { 3: 7 }, timestamp(5)), card('alice', 'bob', { 3: 6 }, timestamp(4))];
  for (const input of [entries, [...entries].reverse()]) {
    const result = reconcilePlayerScores('alice', input);
    assert.equal(result.scores[2], 6);
    assert.equal(result.disputedHoles, 1);
  }
});

test('fallback with missing timestamps uses recorder UID consistently', () => {
  const result = reconcilePlayerScores('alice', [card('alice', 'charlie', { 4: 6 }), card('alice', 'bob', { 4: 5 })]);
  assert.equal(result.scores[3], 5);
});

test('pickup is a scored hole and differs from missing or other gross scores', () => {
  const result = reconcilePlayerScores('alice', [card('alice', 'alice', { 5: 'pickup' }), card('alice', 'bob', { 5: 9 })]);
  assert.equal(result.scores[4], 'pickup');
  assert.equal(result.completedHoles, 1);
  assert.equal(result.disputedHoles, 1);
});

test('other players entries are ignored, and round results include all participants', () => {
  const result = reconcileRoundScores({ alice: {}, bob: {} }, [card('alice', 'alice', { 1: 4 }), card('bob', 'bob', { 1: 5 })]);
  assert.equal(result.alice.scores[0], 4);
  assert.equal(result.bob.scores[0], 5);
});

test('malformed score submissions are rejected', () => {
  assert.throws(() => reconcilePlayerScores('alice', [card('alice', 'alice', { 1: 0 })]), /Invalid score/);
});
