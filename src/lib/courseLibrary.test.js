import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyHoles, validateHoles, validateCourse, validateTee, validateClub } from './courseLibrary.js';

test('standard 18-hole course and SI validates', () => { const result = validateCourse({ name: 'Old Course', holes: emptyHoles() }); assert.equal(result.holes.length, 18); assert.equal(result.holes.reduce((n,h)=>n+h.par,0),72); });
test('rejects duplicate stroke indexes', () => { const holes = emptyHoles(); holes[1].strokeIndex = 1; assert.throws(() => validateHoles(holes), /Stroke indexes/); });
test('rejects non-18 hole input', () => assert.throws(() => validateHoles([]), /18 holes/));
test('validates tee sets', () => { const t = validateTee({name:'White',colour:'White',courseRating:'71.4',slopeRating:'130',yardage:'6500',gender:'men'}); assert.equal(t.slopeRating,130); assert.equal(t.courseRating,71.4); });
test('rejects invalid tee rating', () => assert.throws(()=>validateTee({name:'White',colour:'White',courseRating:71,slopeRating:200,yardage:6500}),/Slope/));
test('validates club name', () => assert.equal(validateClub({name:' Royal Golf ',location:'Kent'}).name,'Royal Golf'));
