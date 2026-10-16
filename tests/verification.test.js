import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareVerification, validateVerifiedCard } from '../src/lib/verification.js';

const blank = () => Array(18).fill(null);
const submitted = (playerId, recordedBy, edits) => {
  const holes = blank();
  for (const [hole, score] of Object.entries(edits)) holes[Number(hole) - 1] = score;
  return { playerId, recordedBy, holes };
};

test('self score preferred; a disagreeing marker is flagged', () => {
  const result = prepareVerification('stephen', [
    submitted('stephen', 'alex', { 1: 6 }),
    submitted('stephen', 'stephen', { 1: 5 }),
  ]);
  assert.equal(result.scores[0], 5);
  assert.equal(result.disputedHoles, 1);
});

test('paper-only hole can be entered during verification', () => {
  const result = prepareVerification('stephen', []);
  assert.equal(result.scores[0], null);
  const complete = result.scores.map(() => 'pickup');
  complete[0] = 5;
  assert.equal(validateVerifiedCard(complete), true);
});

test('cannot verify missing holes', () => {
  assert.throws(() => validateVerifiedCard(blank()), /Hole 1/);
});

test('preserves existing confirmed scores when editing', () => {
  const official = { holes: Array(18).fill(5) };
  const result = prepareVerification('stephen', [submitted('stephen', 'alex', { 1: 6 })], official);
  assert.equal(result.scores[0], 5);
  assert.equal(result.hasOfficialScore, true);
});
