import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecentFinishes, ordinalFinish } from '../src/lib/recentForm.js';
const t = (id, position, endDate, format='stableford') => ({id,name:`Event ${id}`,status:'completed',participants:{p:{}},endDate,format,finalStandings:[{playerId:'p',position}]});
test('recent form uses official individual placements and most recent events',()=>{
 const rows=getRecentFinishes([t('old',3,'2026-01-01'),t('new',1,'2026-10-01','stroke_play'),t('bad',null,'2026-11-01'),{...t('draft',1,'2026-12-01'),status:'draft'}],'p');
 assert.deepEqual(rows.map(r=>r.id),['new','old']);assert.deepEqual(rows.map(r=>r.formatLabel),['Stroke','Stableford']);
});
test('does not infer individual placement from team or missing results',()=>{
 const event={...t('team',1,'2026-10-01','scramble'), finalStandings:[{teamId:'a',position:1}]};
 assert.deepEqual(getRecentFinishes([event], 'p'),[]);
});
test('formats ordinal positions',()=>{
 assert.equal(ordinalFinish(1),'1st');assert.equal(ordinalFinish(12),'12th');assert.equal(ordinalFinish(23),'23rd');
});
