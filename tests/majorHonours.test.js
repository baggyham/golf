import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCareerStats } from '../src/lib/careerStats.js';
const t = (id, tier, position, winners=['p']) => ({id, name:id, status:'completed',tier,participants:{p:{}},winnerIds:winners,finalStandings:[{playerId:'p',position}],endDate:id});
test('majors are distinguished without double counting overall wins', () => {
 const stats=calculateCareerStats('p',[t('2026-09-01','major',1),t('2026-08-01','casual',1)],[]);
 assert.equal(stats.wins,2);assert.equal(stats.majorWins,1);assert.equal(stats.majorsPlayed,1);
 assert.equal(stats.majorResults[0].champion,true);
});
test('an unresolved joint first is not an outright Major championship',()=>{
 const tied={...t('2026-10-01','major',1,['p','q']),finalStandings:[{playerId:'p',position:1},{playerId:'q',position:1}]};
 const stats=calculateCareerStats('p',[tied],[]);
 assert.equal(stats.majorWins,0);assert.equal(stats.majorPodiums,1);assert.equal(stats.majorResults[0].jointFirst,true);
});
test('appearance and podiums include non-winning Major finishes',()=>{
 const stats=calculateCareerStats('p',[t('2026-09-01','major',2,[]),t('2026-08-01','major',4,[])],[]);
 assert.equal(stats.majorsPlayed,2);assert.equal(stats.majorPodiums,1);
 assert.deepEqual(stats.majorResults.map(r=>r.position),[2,4]);
});
