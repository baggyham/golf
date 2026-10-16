
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from 'firebase/auth';

import { auth } from '../config/firebase.js';

const AUTH_DOMAIN = 'auth.baggyham.com';

function usernameToEmail(username) {
    const normalized = username.trim().toLowerCase();

    if (
        normalized.length < 3 ||
        normalized.length > 32 ||
        !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(normalized)
    ) {
        throw new Error('Enter a valid username');
    }

    return `${normalized}@auth.baggyham.com`;
}

export async function login(username, password) {
    const email = usernameToEmail(username);

    return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
    return signOut(auth);
}

export function observeAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;

    if (!user || !user.email) {
        throw new Error('You must be logged in');
    }

    const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
    );

    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
}
