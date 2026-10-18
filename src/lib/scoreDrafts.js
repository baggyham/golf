// Local recovery for score entry. Keys are scoped to tournament, round, player and recorder.
// The draft is not an official scorecard; Firestore remains authoritative.
import { validateLocalScores } from './scoreDraftValidation.js';

export function scoreDraftKey(tournamentId, roundId, playerId, recorderId) {
  return `baggygolf:score-draft:v1:${[tournamentId, roundId, playerId, recorderId].map(encodeURIComponent).join(':')}`;
}

export function readScoreDraft(storage, key) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (![1, 2].includes(draft?.version) || !validateLocalScores(draft.holes) || !Number.isFinite(draft.editedAt)) return null;
    if (draft.version === 2 && draft.baseHoles !== undefined && draft.baseHoles !== null && !validateLocalScores(draft.baseHoles)) return null;
    return draft;
  } catch { return null; }
}

export function writeScoreDraft(storage, key, holes, baseHoles = undefined) {
  if (!validateLocalScores(holes)) throw new Error('Invalid local scorecard.');
  if (!storage) throw new Error('Local storage unavailable.');
  if (baseHoles !== undefined && baseHoles !== null && !validateLocalScores(baseHoles)) throw new Error('Invalid original scorecard.');
  storage.setItem(key, JSON.stringify({ version: 2, holes: [...holes], baseHoles, editedAt: Date.now() }));
}

export function clearScoreDraft(storage, key) {
  storage?.removeItem(key);
}
