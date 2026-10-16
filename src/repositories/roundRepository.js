
import {
    collection,
    doc,
    getDocs,
    query,
    orderBy,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../config/firebase.js';
import { validateRound } from '../lib/roundValidation.js';
import { validateScorecard } from '../lib/scorecardValidation.js';

export async function createRound(tournament, { name, date, courseName }) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('You must be logged in.');
    }

    if (user.uid !== tournament.createdBy) {
        throw new Error('Only the tournament organiser can add rounds.');
    }

    validateRound({ name, date }, tournament);

    const roundsRef = collection(
        db,
        'tournaments',
        tournament.id,
        'rounds',
    );

    const roundRef = doc(roundsRef);
    const tournamentRef = doc(db, 'tournaments', tournament.id);

    await runTransaction(db, async (transaction) => {
        const tournamentSnapshot = await transaction.get(tournamentRef);

        if (!tournamentSnapshot.exists()) {
            throw new Error('Tournament no longer exists.');
        }

        const currentTournament = tournamentSnapshot.data();

        if (
            currentTournament.createdBy !== user.uid ||
            currentTournament.status !== 'draft'
        ) {
            throw new Error('You cannot add rounds to this tournament.');
        }

        if (!currentTournament.startDate ||
            !currentTournament.endDate ||
            date < currentTournament.startDate ||
            date > currentTournament.endDate) {
            throw new Error('Round date is outside tournament dates.');
        }

        transaction.set(roundRef, {
            name: name.trim(),
            date,
            courseName: courseName?.trim() || null,
            status: 'draft',
            createdAt: serverTimestamp(),
        });

        transaction.update(tournamentRef, {
            updatedAt: serverTimestamp(),
        });
    });

    return roundRef.id;
}

export async function getTournamentRounds(tournamentId) {
    const roundsRef = collection(
        db,
        'tournaments',
        tournamentId,
        'rounds',
    );

    const snapshot = await getDocs(
        query(roundsRef, orderBy('date', 'asc')),
    );

    return snapshot.docs.map((round) => ({
        id: round.id,
        ...round.data(),
    }));
}

export async function saveRoundScorecard(tournament, roundId, holes) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('You must be logged in.');
    }

    if (user.uid !== tournament.createdBy) {
        throw new Error('Only the organiser can edit a scorecard.');
    }

    validateScorecard(holes);

    const roundRef = doc(
        db,
        'tournaments',
        tournament.id,
        'rounds',
        roundId,
    );

    await runTransaction(db, async (transaction) => {
        const roundSnapshot = await transaction.get(roundRef);

        if (!roundSnapshot.exists()) {
            throw new Error('Round not found.');
        }

        if (roundSnapshot.data().status !== 'draft') {
            throw new Error('This round can no longer be edited.');
        }

        transaction.update(roundRef, {
            scorecard: {
                holes,
                totalPar: holes.reduce((sum, hole) => sum + hole.par, 0),
            },
            updatedAt: serverTimestamp(),
        });
    });
}


export async function saveRoundTeeRatings(
    tournament,
    roundId,
    { courseRating, slopeRating },
) {
    const user = auth.currentUser;

    if (!user || user.uid !== tournament.createdBy) {
        throw new Error('Only the organiser can change tee ratings.');
    }

    const rating = Number(courseRating);
    const slope = Number(slopeRating);

    if (!Number.isFinite(rating) || rating < 50 || rating > 90) {
        throw new Error('Enter a valid Course Rating (50–90).');
    }

    if (!Number.isInteger(slope) || slope < 55 || slope > 155) {
        throw new Error('Slope Rating must be between 55 and 155.');
    }

    const roundRef = doc(
        db,
        'tournaments',
        tournament.id,
        'rounds',
        roundId,
    );

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roundRef);

        if (!snapshot.exists()) {
            throw new Error('Round not found.');
        }

        if (snapshot.data().status !== 'draft') {
            throw new Error('Tee ratings are locked for this round.');
        }

        transaction.update(roundRef, {
            teeRatings: {
                courseRating: rating,
                slopeRating: slope,
            },
            updatedAt: serverTimestamp(),
        });
    });
}



/**
 * Advance a round through the playable part of its lifecycle.
 * Completion is intentionally NOT supported until verified scores exist.
 */
export async function changeRoundStatus(tournamentId, roundId, action) {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be logged in.');
    if (!tournamentId || !roundId) throw new Error('Tournament and round are required.');
    if (!['start', 'finish'].includes(action)) throw new Error('Invalid round action.');

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const roundsRef = collection(tournamentRef, 'rounds');
    const roundRef = doc(roundsRef, roundId);

    // Collect round refs, then read their current state inside the transaction.
    // The parent tournament is already running, so no new rounds can be added.
    const roundList = await getDocs(query(roundsRef, orderBy('date', 'asc')));

    await runTransaction(db, async (transaction) => {
        const tournamentSnap = await transaction.get(tournamentRef);
        if (!tournamentSnap.exists()) throw new Error('Tournament not found.');

        const tournament = tournamentSnap.data();
        if (tournament.createdBy !== user.uid) {
            throw new Error('Only the organiser can manage rounds.');
        }
        if (tournament.status !== 'in_progress') {
            throw new Error('The tournament must be in progress.');
        }

        // Firestore transaction reads must precede writes.
        const states = [];
        for (const listedRound of roundList.docs) {
            const snapshot = await transaction.get(listedRound.ref);
            if (!snapshot.exists()) throw new Error('Round list changed. Please retry.');
            states.push({ id: snapshot.id, ...snapshot.data() });
        }

        const target = states.find((round) => round.id === roundId);
        if (!target) throw new Error('Round not found.');

        if (action === 'start') {
            if (target.status !== 'draft') throw new Error('Only draft rounds can be started.');
            if (states.some((round) => round.status === 'in_progress')) {
                throw new Error('Finish the current round first.');
            }
            if (states.some((round) => round.status === 'awaiting_verification')) {
                throw new Error('Verify the previous round before starting another.');
            }
            if (!Array.isArray(target.scorecard?.holes) || target.scorecard.holes.length !== 18) {
                throw new Error('Configure the 18-hole scorecard first.');
            }
            if (tournament.handicapMode === 'course' && !target.teeRatings) {
                throw new Error('Save the tee ratings first.');
            }

            transaction.update(roundRef, {
                status: 'in_progress',
                startedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        } else {
            if (target.status !== 'in_progress') {
                throw new Error('Only an active round can be finished.');
            }
            transaction.update(roundRef, {
                status: 'awaiting_verification',
                finishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    });
}

/** Complete and lock a round only after every participant has an official card. */
export async function completeRound(tournamentId, roundId) {
    const user = auth.currentUser;
    if (!user) throw new Error('You must be signed in.');

    const tournamentRef = doc(db, 'tournaments', tournamentId);
    const roundRef = doc(tournamentRef, 'rounds', roundId);

    await runTransaction(db, async (transaction) => {
        const tournamentSnap = await transaction.get(tournamentRef);
        const roundSnap = await transaction.get(roundRef);
        if (!tournamentSnap.exists() || !roundSnap.exists()) {
            throw new Error('Tournament or round not found.');
        }
        const tournament = tournamentSnap.data();
        const round = roundSnap.data();
        if (tournament.createdBy !== user.uid) {
            throw new Error('Only the organiser can complete the round.');
        }
        if (tournament.status !== 'in_progress' || round.status !== 'awaiting_verification') {
            throw new Error('This round is not awaiting verification.');
        }
        const playerIds = Object.keys(tournament.participants ?? {});
        if (playerIds.length < 1 || playerIds.length > 4) {
            throw new Error('The tournament must have between one and four participants.');
        }
        // Read all verified cards before any write; the transaction retries if one changes.
        const verified = [];
        for (const playerId of playerIds) {
            verified.push({
                playerId,
                snapshot: await transaction.get(doc(roundRef, 'verifiedScores', playerId)),
            });
        }
        const missing = verified.filter(({ snapshot }) =>
            !snapshot.exists() || !Array.isArray(snapshot.data().holes) ||
            snapshot.data().holes.length !== 18 ||
            snapshot.data().holes.some((v) => !(v === 'pickup' || (Number.isInteger(v) && v >= 1 && v <= 30)))
        ).map(({ playerId }) => tournament.participants[playerId]?.displayName || playerId);
        if (missing.length) {
            throw new Error(`Verify all 18 holes before completing the round: ${missing.join(', ')}`);
        }
        transaction.update(roundRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    });
}
