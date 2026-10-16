import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOfficialLeaderboard } from '../src/lib/officialLeaderboard.js';
import { calculateTournamentLeaderboard } from '../src/lib/tournamentLeaderboard.js';
const holes=Array.from({length:18},(_,i)=>({number:i+1,par:4,strokeIndex:i+1}));
const tournament={handicapMode:'fixed',participants:{a:{displayName:'Alex',fixedPlayingHandicap:18},b:{displayName:'Ben',fixedPlayingHandicap:18}}};
const mk=(id,status)=>({id,status,date:'2027-06-11',scorecard:{holes,totalPar:72}});
const official=(id,strokes)=>({playerId:id,holes:Array(18).fill(strokes)});
const entry=(id,strokes)=>({playerId:id,recordedBy:id,holes:[strokes,...Array(17).fill(null)],createdAt:{seconds:1}});
test('completed round uses official results and ignores conflicting provisional entries',()=>{
  const r=calculateTournamentLeaderboard(tournament,[{round:mk('r1','completed'),entries:[entry('a',1)],verifiedScores:{a:official('a',5),b:official('b',4)}}]);
  assert.equal(r.find(x=>x.playerId==='a').points,36);
  assert.equal(r.find(x=>x.playerId==='a').officialPoints,36);
  assert.equal(r.find(x=>x.playerId==='b').points,54);
  assert.equal(r.find(x=>x.playerId==='a').disputedHoles,0);
});
test('official points plus active provisional points remain separate',()=>{
  const r=calculateTournamentLeaderboard(tournament,[
    {round:mk('r1','completed'),entries:[],verifiedScores:{a:official('a',5),b:official('b',5)}},
    {round:mk('r2','in_progress'),entries:[entry('a',4)],verifiedScores:{}},
  ]);
  const alex=r.find(x=>x.playerId==='a');
  assert.equal(alex.officialPoints,36);
  assert.equal(alex.provisionalPoints,3);
  assert.equal(alex.points,39);
  assert.equal(alex.holesScored,19);
});
test('never fall back to provisional scores on a completed round',()=>{
  assert.throws(()=>calculateOfficialLeaderboard(tournament,mk('r1','completed'),{a:official('a',5)}),/Missing or invalid verified/);
});
test('ignore draft rounds',()=>{
  const rows=calculateTournamentLeaderboard(tournament,[{round:mk('r1','draft'),entries:[entry('a',4)],verifiedScores:{}}]);
  assert.equal(rows[0].points,0);
});
