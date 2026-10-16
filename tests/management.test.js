import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCourse, samplePlayers } from '../src/data/sample.js';
import {
  createTournament,
  isComplete,
  updateScore,
  validateCourse,
} from '../src/lib/tournaments.js';
import { pointsOnHole } from '../src/lib/stableford.js';

test('validates all 18 unique stroke indices', () => {
  assert.equal(validateCourse(sampleCourse), null);
  const wrong = structuredClone(sampleCourse);
  wrong.holes[0].strokeIndex = wrong.holes[1].strokeIndex;
  assert.match(validateCourse(wrong), /each number/);
});

test('new tournaments snapshot players and courses, with empty scores', () => {
  const t = createTournament({
    title: 'Autumn Open',
    date: '2026-10-14',
    allowance: 1,
    course: sampleCourse,
    players: samplePlayers,
  });
  samplePlayers[0].name = 'Edited source';
  assert.equal(t.players[0].name, 'You');
  assert.equal(t.scores[t.players[0].id].length, 18);
  assert.equal(t.scores[t.players[0].id][0], null);
});

test('scores update immutably and a finished tournament is locked', () => {
  const t = createTournament({
    title: 'Test',
    date: '2026-10-14',
    allowance: 1,
    course: sampleCourse,
    players: samplePlayers.slice(0, 1),
  });
  const after = updateScore(t, t.players[0].id, 0, 5);
  assert.equal(t.scores[t.players[0].id][0], null);
  assert.equal(after.scores[t.players[0].id][0], 5);
  assert.equal(
    updateScore({ ...after, status: 'completed' }, t.players[0].id, 0, 4).scores[
      t.players[0].id
    ][0],
    5,
  );
});

test('picked-up holes record zero Stableford points and can finish a round', () => {
  const t = createTournament({
    title: 'Test',
    date: '2026-10-14',
    allowance: 1,
    course: sampleCourse,
    players: samplePlayers.slice(0, 1),
  });
  assert.equal(pointsOnHole(0, sampleCourse.holes[0], 18), 0);
  assert.equal(isComplete(t), false);
  const id = t.players[0].id;
  const complete = { ...t, scores: { [id]: Array(18).fill(0) } };
  assert.equal(isComplete(complete), true);
});
