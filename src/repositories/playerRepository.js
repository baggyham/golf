import {
    doc,
    getDoc,
    updateDoc,
    getDocs,
    collection,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '../config/firebase.js';

// Retrieve a player's Firestore profile
export async function getPlayer(playerId) {
    if (!playerId) {
        throw new Error('Player ID is required');
    }

    const playerRef = doc(db, 'players', playerId);
    const snapshot = await getDoc(playerRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    };
}

export async function getAllPlayers() {
    const snapshot = await getDocs(collection(db, 'players'));

    return snapshot.docs.map((player) => ({
        id: player.id,
        ...player.data(),
    }));
}

// Update a player's own Handicap Index
export async function updateOwnHandicap(playerId, handicapIndex) {
    const handicap = Number(handicapIndex);

    if (!Number.isFinite(handicap) || handicap < -10 || handicap > 54) {
        throw new Error('Invalid Handicap Index');
    }

    await updateDoc(doc(db, 'players', playerId), {
        handicapIndex: handicap,
        updatedAt: serverTimestamp(),
    });
}