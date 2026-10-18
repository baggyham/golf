export const emptyHoles = () => Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }));
const text = (v, label) => { const s = String(v ?? '').trim(); if (!s || s.length > 100) throw new Error(`${label} must be 1–100 characters.`); return s; };
const num = (v, label, min, max, whole = false) => { const n = Number(v); if (v === '' || !Number.isFinite(n) || n < min || n > max || (whole && !Number.isInteger(n))) throw new Error(`${label} must be ${min}–${max}.`); return n; };
export function validateHoles(holes) {
  if (!Array.isArray(holes) || holes.length !== 18) throw new Error('A course needs exactly 18 holes.');
  const result = holes.map((h, i) => ({ number: i + 1, par: num(h.par, `Hole ${i + 1} par`, 3, 6, true), strokeIndex: num(h.strokeIndex, `Hole ${i + 1} SI`, 1, 18, true) }));
  if (new Set(result.map(h => h.strokeIndex)).size !== 18) throw new Error('Stroke indexes must contain each number from 1 to 18 exactly once.');
  return result;
}
export function validateTee(input) {
  return { name: text(input.name, 'Tee name'), colour: text(input.colour, 'Tee colour'), courseRating: num(input.courseRating, 'Course rating', 50, 90), slopeRating: num(input.slopeRating, 'Slope rating', 55, 155, true), yardage: num(input.yardage, 'Total yardage', 1000, 10000, true), gender: input.gender === 'women' ? 'women' : 'men' };
}
export function validateCourse(input) { return { name: text(input.name, 'Course name'), holes: validateHoles(input.holes) }; }
export function validateClub(input) { return { name: text(input.name, 'Club name'), location: String(input.location ?? '').trim().slice(0, 150) }; }
