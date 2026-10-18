import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreDraftKey, readScoreDraft, writeScoreDraft, clearScoreDraft} from '../src/lib/scoreDrafts.js';

function storage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}

test('drafts are scoped by tournament, round, player and recorder', () => {
  assert.notEqual(scoreDraftKey('a','r','p','u'), scoreDraftKey('a','r','p','other'));
  assert.notEqual(scoreDraftKey('a','r','p','u'), scoreDraftKey('a','different','p','u'));
});

test('drafts persist scorecards, pickups and empty holes, then clear', () => {
  const store = storage();
  const key = scoreDraftKey('a','r','p','u');
  const scores = Array(18).fill(null);
  scores[0] = 4;
  scores[1] = 'pickup';
  writeScoreDraft(store, key, scores);
  assert.deepEqual(readScoreDraft(store, key).holes, scores);
  clearScoreDraft(store, key);
  assert.equal(readScoreDraft(store, key), null);
});

test('invalid and corrupted drafts cannot overwrite a scorecard', () => {
  const store = storage();
  assert.throws(() => writeScoreDraft(store, 'x', [2]), /Invalid/);
  store.setItem('x', '{broken');
  assert.equal(readScoreDraft(store, 'x'), null);
  store.setItem('x', JSON.stringify({version: 1, holes: [2], editedAt: Date.now()}));
  assert.equal(readScoreDraft(store, 'x'), null);
});


test('drafts keep the remote baseline for safe recovery', () => {
  const store = storage();
  const key = scoreDraftKey('t', 'r', 'p', 'u');
  const before = Array(18).fill(null);
  const after = [...before];
  after[0] = 5;
  writeScoreDraft(store, key, after, before);
  assert.deepEqual(readScoreDraft(store, key).baseHoles, before);
});

test('legacy local drafts remain readable but have no safe baseline', () => {
  const store = storage();
  const key = 'legacy';
  store.setItem(key, JSON.stringify({version: 1, holes: Array(18).fill(null), editedAt: Date.now()}));
  assert.equal(readScoreDraft(store, key).baseHoles, undefined);
});
