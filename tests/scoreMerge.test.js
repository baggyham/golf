import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeScorecards } from '../src/lib/scoreMerge.js';
const blank = () => Array(18).fill(null);
test('merges non-overlapping hole edits', () => {
  const base = blank(); const local = blank(); const remote = blank();
  local[0] = 5; remote[1] = 4;
  const result = mergeScorecards(base, local, remote);
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.merged[0], 5); assert.equal(result.merged[1], 4);
});
test('requires a decision for the same hole edited differently', () => {
  const base = blank(); const local = blank(); const remote = blank();
  local[0] = 5; remote[0] = 'pickup';
  const result = mergeScorecards(base, local, remote);
  assert.deepEqual(result.conflicts, [{ holeIndex: 0, local: 5, remote: 'pickup' }]);
  assert.equal(result.merged[0], 'pickup');
});
test('same edits are not conflicts', () => {
  const local = blank(); local[0] = 3;
  const result = mergeScorecards(blank(), local, local);
  assert.equal(result.conflicts.length, 0);
});
test('unknown baseline conservatively flags different values', () => {
  const local = blank(); const remote = blank(); local[0] = 4;
  const result = mergeScorecards(undefined, local, remote);
  assert.equal(result.conflicts.length, 1);
});
test('null baseline means scorecard did not exist', () => {
  const local = blank(); local[0] = 4;
  const result = mergeScorecards(null, local, blank());
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.merged[0], 4);
});
