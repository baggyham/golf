import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTournamentLeaderboard } from '../src/lib/tournamentLeaderboard.js';

const participants = {
  a: { displayName: 'Anna' },
  b: { displayName: 'Ben' },
  c: { displayName: 'Claire' },
};

test('players with no submitted scores share first place until scoring starts', () => {
  const rows = calculateTournamentLeaderboard({ participants }, []);
  assert.deepEqual(rows.map(row => row.position), [1,1,1]);
});

test('tie positions are based on points rather than name or holes scored', () => {
  const participantsWithNames = { b: participants.b, a: participants.a, c: participants.c };
  const rows = calculateTournamentLeaderboard({ participants: participantsWithNames }, []);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.position), [1,1,1]);
});
