// Three-way merge. A baseline of null means the scorecard did not yet exist.
// An undefined baseline means the draft predates conflict tracking: require review.
import { validateLocalScores } from './scoreDraftValidation.js';

export function mergeScorecards(baseHoles, localHoles, remoteHoles) {
  if (!validateLocalScores(localHoles) || !validateLocalScores(remoteHoles) ||
      (baseHoles != null && !validateLocalScores(baseHoles))) {
    throw new Error('Invalid scorecard during merge.');
  }
  const knownBase = baseHoles !== undefined;
  const base = baseHoles ?? Array(18).fill(null);
  const merged = [];
  const conflicts = [];
  for (let i = 0; i < 18; i++) {
    const local = localHoles[i];
    const remote = remoteHoles[i];
    const original = base[i];
    if (local === remote) merged.push(local);
    else if (knownBase && local === original) merged.push(remote);
    else if (knownBase && remote === original) merged.push(local);
    else {
      merged.push(remote); // Never silently replace an unknown remote change.
      conflicts.push({ holeIndex: i, local, remote });
    }
  }
  return { merged, conflicts };
}
