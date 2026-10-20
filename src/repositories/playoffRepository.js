import { collection, doc, getDoc, getDocs, limit, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase.js';
import { calculateFinalTournamentResults } from '../lib/tournamentFinalization.js';
import { evaluatePlayoff, makePlayoffAttempt, tiedLeaders, validPlayoffScore, playoffContendersAt } from '../lib/playoffs.js';

function organiserOrThrow(tournament) {
  if (!auth.currentUser || auth.currentUser.uid !== tournament.createdBy) {
    throw new Error('Only the organiser can manage the championship playoff.');
  }
  if (tournament.status !== 'in_progress' || tournament.tier !== 'major') {
    throw new Error('Only an active Major can have a playoff.');
  }
}

function refs(id) {
  const tournament = doc(db, 'tournaments', id);
  return { tournament, playoff: doc(tournament, 'playoffs', 'championship'), rounds: collection(tournament, 'rounds') };
}

export async function getChampionshipPlayoff(tournamentId) {
  const snapshot = await getDoc(refs(tournamentId).playoff);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

// Read verified results *inside* the transaction, before any write.
async function verifiedStandings(transaction, tournament, roundList) {
  if (roundList.empty || roundList.size >= 100) throw new Error('No valid tournament rounds found.');
  const rounds = [];
  for (const roundDoc of roundList.docs) {
    const snapshot = await transaction.get(roundDoc.ref);
    if (!snapshot.exists() || snapshot.data().status !== 'completed') {
      throw new Error('Complete and verify every normal round before creating a playoff.');
    }
    rounds.push({ id: snapshot.id, ...snapshot.data() });
  }
  const roundData = [];
  for (const round of rounds) {
    const verifiedScores = {};
    for (const id of Object.keys(tournament.participants ?? {})) {
      const verified = await transaction.get(doc(db, 'tournaments', tournament.id, 'rounds', round.id, 'verifiedScores', id));
      if (!verified.exists()) throw new Error(`Verify every score in ${round.name}.`);
      verifiedScores[id] = verified.data();
    }
    roundData.push({ round, verifiedScores });
  }
  const results = calculateFinalTournamentResults(tournament, roundData);
  return { ...results, rounds };
}

export async function startChampionshipPlayoff(tournamentId, { format, sourceRoundId }) {
  const { tournament: tournamentRef, playoff: playoffRef, rounds: roundsRef } = refs(tournamentId);
  const listed = await getDocs(query(roundsRef, limit(100)));
  await runTransaction(db, async transaction => {
    const [snap, old] = await Promise.all([transaction.get(tournamentRef), transaction.get(playoffRef)]);
    if (!snap.exists()) throw new Error('Tournament not found.');
    const tournament = { id: tournamentId, ...snap.data() };
    organiserOrThrow(tournament);
    if (old.exists()) throw new Error('A championship playoff already exists.');
    const { standings, rounds } = await verifiedStandings(transaction, tournament, listed);
    const leaders = tiedLeaders(standings);
    if (leaders.length < 2) throw new Error('A playoff is only needed when the Major is tied for first.');
    const source = rounds.find(round => round.id === sourceRoundId);
    if (!source) throw new Error('Choose a course from the completed tournament rounds.');
    const setup = makePlayoffAttempt(tournament, source, leaders, format);
    transaction.set(playoffRef, {
      ...setup, status: 'in_progress', attempt: 1, history: [], winnerId: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

export async function savePlayoffHole(tournamentId, holeIndex, submitted) {
  if (!Number.isInteger(holeIndex) || holeIndex < 0 || holeIndex >= 18) throw new Error('Invalid hole.');
  const { tournament: tournamentRef, playoff: playoffRef } = refs(tournamentId);
  await runTransaction(db, async transaction => {
    const [tSnap, pSnap] = await Promise.all([transaction.get(tournamentRef), transaction.get(playoffRef)]);
    if (!tSnap.exists() || !pSnap.exists()) throw new Error('Playoff not found.');
    organiserOrThrow(tSnap.data());
    const playoff = pSnap.data();
    if (playoff.status !== 'in_progress') throw new Error('This playoff attempt is locked.');
    const eligible = playoffContendersAt(playoff, holeIndex);
    if (playoff.format === 'sudden_death' && holeIndex > evaluatePlayoff(playoff).holesCompleted) throw new Error('Complete the preceding hole first.');
    const scores = Object.fromEntries(playoff.playerIds.map(id => [id, [...playoff.scores[id]]]));
    // Correcting an earlier sudden-death hole invalidates later holes.
    if (playoff.format === 'sudden_death') {
      for (const id of playoff.playerIds) {
        for (let index = holeIndex + 1; index < 18; index += 1) scores[id][index] = null;
      }
    }
    for (const id of eligible) {
      const value = submitted[id];
      if (!validPlayoffScore(value, playoff.format)) throw new Error('Scores must be 1–30 strokes (or pickup for full rounds).');
      scores[id][holeIndex] = value;
    }
    transaction.update(playoffRef, { scores, updatedAt: serverTimestamp() });
  });
}

export async function finishPlayoffAttempt(tournamentId) {
  const { tournament: tournamentRef, playoff: playoffRef } = refs(tournamentId);
  await runTransaction(db, async transaction => {
    const [tSnap, pSnap] = await Promise.all([transaction.get(tournamentRef), transaction.get(playoffRef)]);
    if (!tSnap.exists() || !pSnap.exists()) throw new Error('Playoff not found.');
    organiserOrThrow(tSnap.data());
    const current = pSnap.data();
    if (current.status !== 'in_progress') throw new Error('This attempt has already finished.');
    const evaluation = evaluatePlayoff(current);
    if (!evaluation.complete) throw new Error('Finish the required playoff holes before confirming.');
    transaction.update(playoffRef, {
      status: evaluation.winnerId ? 'completed' : 'tied', winnerId: evaluation.winnerId,
      finishedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

export async function startNextPlayoffAttempt(tournamentId, { format, sourceRoundId }) {
  const { tournament: tournamentRef, playoff: playoffRef } = refs(tournamentId);
  const sourceRef = doc(tournamentRef, 'rounds', sourceRoundId);
  await runTransaction(db, async transaction => {
    const [tSnap, pSnap, roundSnap] = await Promise.all([
      transaction.get(tournamentRef), transaction.get(playoffRef), transaction.get(sourceRef),
    ]);
    if (!tSnap.exists() || !pSnap.exists() || !roundSnap.exists()) throw new Error('Missing tournament or course.');
    const tournament = tSnap.data();
    organiserOrThrow(tournament);
    const previous = pSnap.data();
    if (previous.status !== 'tied' || previous.attempt >= 10) throw new Error('A new attempt cannot be started.');
    const candidates = evaluatePlayoff(previous).tiedIds;
    const round = { id: sourceRoundId, ...roundSnap.data() };
    if (round.status !== 'completed') throw new Error('Choose a completed tournament round.');
    const setup = makePlayoffAttempt(tournament, round, candidates, format);
    transaction.update(playoffRef, {
      ...setup, status: 'in_progress', attempt: previous.attempt + 1, winnerId: null,
      history: [...(previous.history || []), {
        attempt: previous.attempt, format: previous.format, playerIds: previous.playerIds,
        sourceRoundId: previous.sourceRoundId, courseName: previous.courseName,
        scorecard: previous.scorecard, playingHandicaps: previous.playingHandicaps, scores: previous.scores,
      }],
      updatedAt: serverTimestamp(),
    });
  });
}

/** Official original-round tie, without trusting provisional leaderboard figures. */
export async function getMajorPlayoffNeed(tournament, rounds) {
  if (tournament.tier !== 'major' || rounds.length < 1 || rounds.some(round => round.status !== 'completed')) return [];
  const roundData = await Promise.all(rounds.map(async round => {
    const cards = await getDocs(collection(db, 'tournaments', tournament.id, 'rounds', round.id, 'verifiedScores'));
    return { round, verifiedScores: Object.fromEntries(cards.docs.map(card => [card.id, card.data()])) };
  }));
  return tiedLeaders(calculateFinalTournamentResults(tournament, roundData).standings);
}
