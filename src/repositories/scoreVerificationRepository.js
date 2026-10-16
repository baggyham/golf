import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { validateVerifiedCard } from '../lib/verification.js';

export function listenToVerifiedScores(tournamentId, roundId, onData, onError) {
  const path = collection(db, 'tournaments', tournamentId, 'rounds', roundId, 'verifiedScores');
  return onSnapshot(path,
    (snapshot) => onData(Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()]))),
    onError,
  );
}

/** Writes an official snapshot and immutable audit event atomically. */
export async function verifyPlayerScore(tournament, round, playerId, holes, reason) {
  const user = auth.currentUser;
  if (!user || user.uid !== tournament.createdBy) {
    throw new Error('Only the tournament organiser can confirm scores.');
  }
  if (!tournament.participants?.[playerId]) {
    throw new Error('The selected player is not in this tournament.');
  }
  if (round.status !== 'awaiting_verification') {
    throw new Error('Finish the round before confirming scores.');
  }
  validateVerifiedCard(holes);
  const note = String(reason ?? '').trim();
  if (note.length > 500) throw new Error('Keep the verification note under 500 characters.');

  const roundRef = doc(db, 'tournaments', tournament.id, 'rounds', round.id);
  const officialRef = doc(roundRef, 'verifiedScores', playerId);
  const auditRef = doc(collection(roundRef, 'verificationEvents'));

  await runTransaction(db, async (transaction) => {
    const [currentRound, previousOfficial] = await Promise.all([
      transaction.get(roundRef), transaction.get(officialRef),
    ]);
    if (!currentRound.exists() || currentRound.data().status !== 'awaiting_verification') {
      throw new Error('Round status changed. Reload before confirming.');
    }
    const before = previousOfficial.exists() ? previousOfficial.data().holes : null;
    const changed = before && before.some((score, index) => score !== holes[index]);
    if (changed && !note) throw new Error('Give a reason when changing a confirmed scorecard.');
    transaction.set(officialRef, {
      playerId,
      holes,
      verifiedBy: user.uid,
      verifiedAt: serverTimestamp(),
      revision: previousOfficial.exists() ? (previousOfficial.data().revision ?? 1) + 1 : 1,
      note,
      eventId: auditRef.id,
    });
    transaction.set(auditRef, {
      playerId,
      eventId: auditRef.id,
      previousHoles: before,
      confirmedHoles: holes,
      verifiedBy: user.uid,
      verifiedAt: serverTimestamp(),
      note,
    });
  });
}
