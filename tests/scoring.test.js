import test from 'node:test';
import assert from 'node:assert/strict';
import {
  playingHandicap,
  roundHandicap,
  strokesReceived,
  unroundedCourseHandicap,
} from '../src/lib/handicap.js';
import { pointsOnHole, playerSummary } from '../src/lib/stableford.js';
import { sampleCourse } from '../src/data/sample.js';

test('WHS course handicap formula', () => {
  assert.ok(
    Math.abs(unroundedCourseHandicap(12, sampleCourse) - ((12 * 125) / 113 + 71.8 - 72)) < 1e-10,
  );
});
test('allowance applies before rounding', () => {
  const value = unroundedCourseHandicap(18, sampleCourse);
  assert.equal(playingHandicap(18, sampleCourse, 0.95), roundHandicap(value * 0.95));
});
test('half values round away from zero', () => {
  assert.equal(roundHandicap(2.5), 3);
  assert.equal(roundHandicap(-2.5), -3);
});
test('stroke allocation works over 18 and for plus handicaps', () => {
  assert.equal(strokesReceived(24, 6), 2);
  assert.equal(strokesReceived(24, 7), 1);
  assert.equal(strokesReceived(-2, 17), -1);
  assert.equal(strokesReceived(-2, 16), 0);
});
test('stableford scores and not-played state', () => {
  assert.equal(pointsOnHole(5, { par: 4, strokeIndex: 6 }, 12), 2);
  assert.equal(pointsOnHole(9, { par: 4, strokeIndex: 6 }, 12), 0);
  assert.equal(pointsOnHole(null, { par: 4, strokeIndex: 6 }, 12), null);
});
test('total ignores blanks', () => {
  const scores = Array(18).fill(null);
  scores[0] = 5;
  const summary = playerSummary(scores, sampleCourse, 12);
  assert.equal(summary.holesPlayed, 1);
  assert.equal(summary.points, 2);
});
