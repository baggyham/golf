import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';

export const emptyScorecard = () => Array(18).fill(null);

export function validateScores(scores) {
  if (!Array.isArray(scores) || scores.length !== 18) {
    throw new Error('A scorecard must contain exactly 18 hole values.');
  }
  for (const [index, score] of scores.entries()) {
    if (score === null || score === 'pickup') continue;
    if (!Number.isInteger(score) || score < 1 || score > 30) {
      throw new Error(`Invalid gross strokes on hole ${index + 1}.`);
    }
  }
}

function scorecardReference(tournamentId, roundId, playerId, recordedBy) {
  // Auth UIDs don't contain '/', so the combined ID is unambiguous.
  return doc(db, 'tournaments', tournamentId, 'rounds', roundId,
    'scoreEntries', `${playerId}_${recordedBy}`);
}

export async function getMyScoreEntry(tournamentId, roundId, playerId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  const snapshot = await getDoc(
    scorecardReference(tournamentId, roundId, playerId, user.uid),
  );
  return snapshot.exists() ? snapshot.data() : null;
}

export class ScoreConflictError extends Error {
  constructor(message = 'This scorecard was changed on another device. Review the changes before syncing.') {
    super(message);
    this.name = 'ScoreConflictError';
  }
}

// expectedHoles is the server version seen when the local draft began.
// undefined means an older recovered draft without a known baseline: never
// silently replace a scorecard that may have changed on another device.
export async function saveMyScoreEntry(tournament, round, playerId, scores, expectedHoles) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (!tournament.participants?.[user.uid] || !tournament.participants?.[playerId]) {
    throw new Error('Only tournament participants can enter scores.');
  }
  validateScores(scores);
  const ref = scorecardReference(tournament.id, round.id, playerId, user.uid);
  const tournamentRef = doc(db, 'tournaments', tournament.id);
  const roundRef = doc(db, 'tournaments', tournament.id, 'rounds', round.id);
  return runTransaction(db, async (transaction) => {
    const [liveTournament, liveRound, entry] = await Promise.all([
      transaction.get(tournamentRef), transaction.get(roundRef), transaction.get(ref),
    ]);
    if (liveTournament.data()?.status !== 'in_progress' || liveRound.data()?.status !== 'in_progress') {
      throw new ScoreConflictError('This round is no longer open for scoring. Your local draft has not been uploaded.');
    }
    const remoteHoles = entry.exists() ? entry.data().holes : null;
    if (expectedHoles === undefined || JSON.stringify(remoteHoles) !== JSON.stringify(expectedHoles)) {
      throw new ScoreConflictError();
    }
    transaction.set(ref, {
      playerId,
      recordedBy: user.uid,
      holes: scores,
      createdAt: entry.exists() ? entry.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return [...scores];
  });
}
