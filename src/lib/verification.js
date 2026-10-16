import { reconcilePlayerScores } from './scoreReconciliation.js';

export function prepareVerification(playerId, entries, official = null) {
  const reconciliation = reconcilePlayerScores(playerId, entries);
  return {
    ...reconciliation,
    // If previously confirmed, use that as the starting point for corrections.
    scores: official?.holes ? [...official.holes] : [...reconciliation.scores],
    hasOfficialScore: Boolean(official),
  };
}

export function validateVerifiedCard(scores) {
  if (!Array.isArray(scores) || scores.length !== 18) {
    throw new Error('Exactly 18 hole scores are required.');
  }
  for (const [index, score] of scores.entries()) {
    if (score !== 'pickup' && (!Number.isInteger(score) || score < 1 || score > 30)) {
      throw new Error(`Hole ${index + 1} needs a gross score or Pickup.`);
    }
  }
  return true;
}
