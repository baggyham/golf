import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCourseSnapshot } from './courseSelection.js';
const holes = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
const club = { id: 'club', name: 'Golf Club' };
const course = { id: 'course', name: 'Main', holes };
const tee = { id: 'tee', name: 'White', colour: 'white', courseRating: 71.4, slopeRating: 130, yardage: 6250, gender: 'men' };
test('snapshots a course and tee with an independent hole array', () => {
 const snapshot = makeCourseSnapshot(club, course, tee);
 assert.equal(snapshot.totalPar, 72);
 assert.equal(snapshot.slopeRating, 130);
 assert.deepEqual(snapshot.source, { clubId:'club', courseId:'course', teeId:'tee' });
 holes[0].par = 3;
 assert.equal(snapshot.holes[0].par, 4);
});
test('rejects missing tee sets and invalid scorecards', () => {
 assert.throws(() => makeCourseSnapshot(club,course,null), /Select a club/);
 assert.throws(() => makeCourseSnapshot(club,{...course,holes:[{par:4}]},tee), /18 holes/);
});
