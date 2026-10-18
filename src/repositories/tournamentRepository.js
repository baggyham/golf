import { majorThemeById } from '../lib/majorThemes.js';
import { calculateFinalTournamentResults } from '../lib/tournamentFinalization.js';

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    runTransaction,
    updateDoc,
    where,
} from 'firebase/firestore';

import { auth, db } from '../config/firebase.js';

/**
 * Create a new multi-day Stableford tournament.
 */
export async function createTournament({
                                           name,
                                           startDate,
                                           endDate,
                                           handicapMode,
                                           players,
                                           tier = 'casual',
                                           majorThemeId = null,
                                       }) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('You must be logged in.');
    }

    const tournamentName = name.trim();

    if (!tournamentName || tournamentName.length > 100) {
        throw new Error('Tournament name must be between 1 and 100 characters.');
    }

    // Validate tournament dates.
    const validDate = (value) => {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const parsed = new Date(`${value}T00:00:00Z`);

        return (
            !Number.isNaN(parsed.getTime()) &&
            parsed.toISOString().slice(0, 10) === value
        );
    };

    if (
        !validDate(startDate) ||
        !validDate(endDate) ||
        endDate < startDate
    ) {
        throw new Error('Enter a valid tournament date range.');
    }

    // Validate handicap mode.
    if (!['fixed', 'course'].includes(handicapMode)) {
        throw new Error('Invalid handicap mode.');
    }

    if (!['casual', 'major'].includes(tier)) throw new Error('Invalid competition tier.');
    if (tier === 'major' && !majorThemeById(majorThemeId)) {
        throw new Error('Select a valid Major theme.');
    }

    // Validate selected players.
    if (!Array.isArray(players) || players.length < 1 || players.length > 4) {
        throw new Error('Select between 1 and 4 players.');
    }

    const participants = {};

    for (const player of players) {
        if (!player.id || participants[player.id]) {
            throw new Error('Invalid or duplicate player.');
        }

        const handicapIndex = player.handicapIndex ?? null;

        if (
            handicapIndex !== null &&
            (!Number.isFinite(handicapIndex) ||
                handicapIndex < -10 ||
                handicapIndex > 54)
        ) {
            throw new Error(`Invalid Handicap Index for ${player.displayName}.`);
        }

        const fixedPlayingHandicap = player.fixedPlayingHandicap;

        if (
            handicapMode === 'fixed' &&
            (!Number.isInteger(fixedPlayingHandicap) ||
                fixedPlayingHandicap < -10 ||
                fixedPlayingHandicap > 54)
        ) {
            throw new Error(
                `Enter a valid whole-number Playing Handicap for ${player.displayName}.`,
            );
        }

        if (handicapMode === 'course' && handicapIndex === null) {
            throw new Error(`${player.displayName} needs a Handicap Index.`);
        }

        participants[player.id] = {
            displayName: player.displayName,
            handicapIndexSnapshot: handicapIndex,
            fixedPlayingHandicap:
                handicapMode === 'fixed' ? fixedPlayingHandicap : null,
        };
    }

    const tournament = {
        name: tournamentName,
        startDate,
        endDate,
        createdBy: user.uid,
        status: 'draft',
        format: 'stableford',
        tier,
        ...(tier === 'major' ? { majorThemeId } : {}),
        handicapMode,
        participants,
        participantIds: Object.keys(participants),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const reference = await addDoc(
        collection(db, 'tournaments'),
        tournament,
    );

    return reference.id;
}

/**
 * Tournaments that the player created OR is participating in.
 * Documents created before participantIds was added remain visible to
 * their organiser. They acquire participantIds when started.
 */
export async function getMyTournaments(userId) {
  if (!userId) throw new Error('User ID is required.');

  const tournamentsRef = collection(db, 'tournaments');
  const [owned, joined] = await Promise.all([
    getDocs(query(tournamentsRef, where('createdBy', '==', userId), limit(50))),
    getDocs(query(tournamentsRef, where('participantIds', 'array-contains', userId), limit(50))),
  ]);

  const results = new Map();
  for (const snapshot of [...owned.docs, ...joined.docs]) {
    results.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
  }
  return [...results.values()];
}

/**
 * Explicitly activate a draft. We check all round documents inside the
 * transaction, so a concurrent round edit causes a retry.
 */
export async function startTournament(tournamentId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (!tournamentId) throw new Error('Tournament ID is required.');

  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const roundsRef = collection(tournamentRef, 'rounds');
  const roundList = await getDocs(query(roundsRef, limit(100)));
  if (roundList.empty) throw new Error('Add at least one round before starting.');

  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(tournamentRef);
    if (!current.exists()) throw new Error('Tournament not found.');
    const tournament = current.data();
    if (tournament.createdBy !== user.uid) {
      throw new Error('Only the tournament organiser can start it.');
    }
    if (tournament.status !== 'draft') {
      throw new Error('Only draft tournaments can be started.');
    }

    const participants = Object.keys(tournament.participants ?? {});
    if (participants.length < 1 || participants.length > 4) {
      throw new Error('The tournament must have between 1 and 4 players.');
    }
    const rounds = [];
    for (const roundDoc of roundList.docs) {
      const snapshot = await transaction.get(roundDoc.ref);
      if (!snapshot.exists()) throw new Error('A round was removed. Try again.');
      rounds.push(snapshot.data());
    }

    for (const round of rounds) {
      if (round.status !== 'draft') throw new Error('Every round must be a draft.');
      const holes = round.scorecard?.holes;
      if (!Array.isArray(holes) || holes.length !== 18) {
        throw new Error(`${round.name ?? 'A round'} needs an 18-hole scorecard.`);
      }
      if (new Set(holes.map((hole) => hole.strokeIndex)).size !== 18 ||
          holes.some((hole, index) => hole.number !== index + 1 ||
            !Number.isInteger(hole.par) || hole.par < 3 || hole.par > 6 ||
            !Number.isInteger(hole.strokeIndex) || hole.strokeIndex < 1 || hole.strokeIndex > 18)) {
        throw new Error(`${round.name ?? 'A round'} has invalid hole information.`);
      }
      if (tournament.handicapMode === 'course') {
        const { courseRating, slopeRating } = round.teeRatings ?? {};
        if (!Number.isFinite(courseRating) || courseRating < 50 || courseRating > 90 ||
            !Number.isInteger(slopeRating) || slopeRating < 55 || slopeRating > 155) {
          throw new Error(`${round.name ?? 'A round'} needs valid tee ratings.`);
        }
      }
    }

    transaction.update(tournamentRef, {
      status: 'in_progress',
      participantIds: participants,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/**
 * Retrieve a single tournament by its Firestore document ID.
 */
export async function getTournament(tournamentId) {
    if (!tournamentId) {
        throw new Error('Tournament ID is required.');
    }

    const reference = doc(db, 'tournaments', tournamentId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    };
}

/** Finalise a tournament using only official, verified, completed round results. */
export async function completeTournament(tournamentId) {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be logged in.');
  if (!tournamentId) throw new Error('Tournament ID is required.');

  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const roundsRef = collection(tournamentRef, 'rounds');
  // Round creation is forbidden after starting a tournament.
  const listed = await getDocs(query(roundsRef, limit(100)));
  if (listed.empty) throw new Error('The tournament has no rounds.');
  if (listed.size === 100) throw new Error('Too many rounds to finalise safely.');

  await runTransaction(db, async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef);
    if (!tournamentSnap.exists()) throw new Error('Tournament not found.');
    const tournament = { id: tournamentId, ...tournamentSnap.data() };
    if (tournament.createdBy !== user.uid) {
      throw new Error('Only the organiser can complete this tournament.');
    }
    if (tournament.status !== 'in_progress') {
      throw new Error('Only an in-progress tournament can be completed.');
    }

    // Firestore transactions require all reads before the first write.
    const rounds = [];
    for (const listedRound of listed.docs) {
      const snapshot = await transaction.get(listedRound.ref);
      if (!snapshot.exists()) throw new Error('A round changed. Retry finalisation.');
      const round = { id: snapshot.id, ...snapshot.data() };
      if (round.status !== 'completed') {
        throw new Error(`${round.name || 'A round'} has not been completed.`);
      }
      rounds.push(round);
    }
    const participants = Object.keys(tournament.participants ?? {});
    const allRounds = [];
    for (const round of rounds) {
      const verifiedScores = {};
      for (const playerId of participants) {
        const cardRef = doc(roundsRef, round.id, 'verifiedScores', playerId);
        const card = await transaction.get(cardRef);
        if (!card.exists()) throw new Error(`Missing verified card for ${playerId} in ${round.name}.`);
        verifiedScores[playerId] = card.data();
      }
      allRounds.push({ round, verifiedScores });
    }
    const { standings, winnerIds } = calculateFinalTournamentResults(tournament, allRounds);
    transaction.update(tournamentRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finalStandings: standings,
      winnerIds,
    });
  });
}

/** Adjust a draft tournament handicap snapshot without changing player profiles. */
export async function updateDraftParticipantHandicap(tournamentId, playerId, value) {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in to edit a tournament handicap.');
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const snapshot = await getDoc(tournamentRef);
    if (!snapshot.exists()) throw new Error('Tournament not found.');
    const tournament = snapshot.data();
    if (tournament.createdBy !== currentUser.uid || tournament.status !== 'draft') {
        throw new Error('Only the organiser can edit draft handicaps.');
    }
    if (!Object.prototype.hasOwnProperty.call(tournament.participants ?? {}, playerId)) {
        throw new Error('Player is not in this tournament.');
    }
    const fixed = tournament.handicapMode === 'fixed';
    if (!Number.isFinite(value) || value < -10 || value > 54 || (fixed && !Number.isInteger(value))) {
        throw new Error(fixed ? 'Playing Handicap must be a whole number from -10 to 54.' : 'Handicap Index must be between -10 and 54.');
    }
    const participants = {
        ...tournament.participants,
        [playerId]: {
            ...tournament.participants[playerId],
            [fixed ? 'fixedPlayingHandicap' : 'handicapIndexSnapshot']: value,
        },
    };
    await updateDoc(tournamentRef, {participants, updatedAt: serverTimestamp()});
    return participants;
}
