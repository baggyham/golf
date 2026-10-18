export function validateLocalScores(scores) {
  return Array.isArray(scores) && scores.length === 18 && scores.every(
    (value) => value === null || value === 'pickup' || (Number.isInteger(value) && value >= 1 && value <= 30),
  );
}
