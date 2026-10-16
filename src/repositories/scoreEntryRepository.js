import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
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

export async function saveMyScoreEntry(tournament, round, playerId, scores) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (!tournament.participants?.[user.uid]) {
    throw new Error('Only tournament participants can enter scores.');
  }
  if (!tournament.participants?.[playerId]) {
    throw new Error('Select a tournament participant.');
  }
  if (tournament.status !== 'in_progress' || round.status !== 'in_progress') {
    throw new Error('Scores can only be saved while the round is in progress.');
  }
  validateScores(scores);

  const ref = scorecardReference(tournament.id, round.id, playerId, user.uid);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    playerId,
    recordedBy: user.uid,
    holes: scores,
    createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
