import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePlayoff, makePlayoffAttempt, playoffContendersAt, resolveMajorStandings, tiedLeaders } from '../src/lib/playoffs.js';
const players = { a: { displayName: 'Alpha', fixedPlayingHandicap: 0 }, b: { displayName: 'Bravo', fixedPlayingHandicap: 0 }, c: { displayName: 'Charlie', fixedPlayingHandicap: 0 } };
const tournament = { participants: players, handicapMode: 'fixed' };
const round = { id: 'original', courseName: 'Club Course', scorecard: {
  holes: Array.from({ length: 18 }, (_, i) => ({ number:i+1, par:4, strokeIndex:i+1 })), totalPar:72,
} };
function scenario(format, ids = ['a','b']) {return makePlayoffAttempt(tournament, round, ids, format);}
function fill(value) {return Array(18).fill(value);}

test('full 18-hole playoff crowns sole Stableford winner', () => {
  const p = scenario('full_round'); p.scores.a = fill(4); p.scores.b = fill(5);
  const result = evaluatePlayoff(p);
  assert.equal(result.complete, true); assert.equal(result.winnerId, 'a');
  assert.equal(result.totals.a.totalPoints, 36); assert.equal(result.totals.b.totalPoints, 18);
});
test('a tied full round needs another attempt', () => {
  const p = scenario('full_round'); p.scores.a = fill(4); p.scores.b = fill(4);
  assert.deepEqual(evaluatePlayoff(p).tiedIds, ['a','b']);
  assert.equal(evaluatePlayoff(p).winnerId, null);
});
test('missing holes never decide a full-round champion', () => {
  const p = scenario('full_round'); p.scores.a[0]=3; p.scores.b[0]=5;
  assert.equal(evaluatePlayoff(p).complete, false);
  assert.equal(evaluatePlayoff(p).winnerId, null);
});
test('pickup counts as zero Stableford points only in full round', () => {
  const p = scenario('full_round'); p.scores.a=fill(4); p.scores.b=fill('pickup');
  assert.equal(evaluatePlayoff(p).winnerId,'a');
  p.format='sudden_death'; assert.throws(() => evaluatePlayoff(p), /Invalid playoff scores/);
});
test('sudden death eliminates high scorer and then settles on unique lowest net', () => {
  const p = scenario('sudden_death',['a','b','c']);
  p.scores.a[0]=4; p.scores.b[0]=4; p.scores.c[0]=5;
  assert.deepEqual(evaluatePlayoff(p).contenders, ['a','b']);
  assert.deepEqual(playoffContendersAt(p,1), ['a','b']);
  p.scores.a[1]=3; p.scores.b[1]=4;
  assert.equal(evaluatePlayoff(p).winnerId,'a'); assert.equal(evaluatePlayoff(p).holesCompleted,2);
});
test('sudden death with 18 tied holes requires another attempt', () => {
  const p = scenario('sudden_death'); p.scores.a=fill(4); p.scores.b=fill(4);
  assert.equal(evaluatePlayoff(p).complete,true);
  assert.deepEqual(evaluatePlayoff(p).tiedIds,['a','b']);
});
test('net strokes apply different fixed playing handicaps in sudden death', () => {
  const p = scenario('sudden_death'); p.playingHandicaps.a = 18;
  p.scores.a[0]=5; p.scores.b[0]=4;
  assert.equal(evaluatePlayoff(p).winnerId, null); // both net 4
  p.scores.a[1]=4; p.scores.b[1]=4;
  assert.equal(evaluatePlayoff(p).winnerId,'a');
});
test('only the tied first-place players are eligible, points stay unchanged', () => {
  const original=[{playerId:'a',displayName:'Alpha',position:1,totalPoints:65},
    {playerId:'b',displayName:'Bravo',position:1,totalPoints:65},
    {playerId:'c',displayName:'Charlie',position:3,totalPoints:60}];
  assert.deepEqual(tiedLeaders(original),['a','b']);
  const result=resolveMajorStandings(original,'b');
  assert.deepEqual(result.map(row=>[row.playerId,row.position,row.totalPoints]),[['b',1,65],['a',2,65],['c',3,60]]);
  assert.deepEqual(original.map(row=>row.position),[1,1,3]);
});
test('playoff champion must be one of the tied leaders', () => {
  assert.throws(()=>resolveMajorStandings([{playerId:'a',totalPoints:65},{playerId:'b',totalPoints:65},{playerId:'c',totalPoints:60}],'c'),/tied leader/);
});
test('course-handicap mode derives the playoff playing handicap from the selected course', () => {
  const t={handicapMode:'course', participants: {a:{displayName:'Alpha',handicapIndexSnapshot:15}, b:{displayName:'Bravo',handicapIndexSnapshot:10}}};
  const r={...round,teeRatings:{courseRating:72,slopeRating:113}};
  assert.equal(makePlayoffAttempt(t,r,['a','b'],'full_round').playingHandicaps.a,15);
});
