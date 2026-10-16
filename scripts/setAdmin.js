import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

const credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

if (!credentialsPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not configured');
}

const serviceAccount = JSON.parse(
    readFileSync(credentialsPath, 'utf8'),
);

initializeApp({
    credential: cert(serviceAccount),
});

const ADMIN_EMAIL = 'stephen.sabo@auth.baggyham.com';

async function setAdmin() {
    try {
        const auth = getAuth();

        // Find your existing Firebase account.
        const user = await auth.getUserByEmail(ADMIN_EMAIL);

        // Preserve any existing custom claims.
        const claims = {
            ...user.customClaims,
            admin: true,
        };

        await auth.setCustomUserClaims(user.uid, claims);

        // Verify that the claim was applied.
        const updatedUser = await auth.getUser(user.uid);

        console.log('Administrator configured:', {
            uid: updatedUser.uid,
            email: updatedUser.email,
            admin: updatedUser.customClaims?.admin,
        });
    } catch (error) {
        console.error('Failed to configure administrator:', error);
        process.exitCode = 1;
    }
}

setAdmin();
