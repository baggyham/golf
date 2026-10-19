import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRoundsByCreation } from '../src/lib/roundOrder.js';

test('rounds display in creation order, regardless of playing date', () => {
  const created = [
    { id: 'second', date: '2026-10-01', createdAt: { seconds: 200, nanoseconds: 0 } },
    { id: 'first', date: '2026-10-20', createdAt: { seconds: 100, nanoseconds: 0 } },
    { id: 'third', date: '2026-09-01', createdAt: { seconds: 300, nanoseconds: 0 } },
  ];
  assert.deepEqual(sortRoundsByCreation(created).map((round) => round.id), ['first', 'second', 'third']);
  assert.equal(created[0].id, 'second', 'original array is not mutated');
});

test('creation timestamp supports Firestore toMillis and Date', () => {
  const created = [
    { id: 'later', createdAt: { toMillis: () => 30000 } },
    { id: 'earlier', createdAt: new Date(10000) },
  ];
  assert.deepEqual(sortRoundsByCreation(created).map((round) => round.id), ['earlier', 'later']);
});

test('missing timestamps keep legacy query order and do not hide rounds', () => {
  const created = [{ id: 'first' }, { id: 'second' }, { id: 'new', createdAt: { seconds: 10 } }];
  assert.deepEqual(sortRoundsByCreation(created).map((round) => round.id), ['new', 'first', 'second']);
});
