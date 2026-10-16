import {createContext, useCallback, useEffect, useState} from 'react';
import {observeAuth} from '../services/authService.js';
import {getPlayer} from '../repositories/playerRepository.js';

export const AuthContext = createContext(null);

export function AuthProvider({children}) {
    const [user, setUser] = useState(null);
    const [player, setPlayer] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refreshPlayer = useCallback(async () => {
        if (!user) {
            return;
        }

        const updatedPlayer = await getPlayer(user.uid);

        setPlayer(updatedPlayer);
    }, [user]);

    useEffect(() => {
        let requestId = 0;

        const unsubscribe = observeAuth(async (firebaseUser) => {
            const currentRequest = ++requestId;

            setLoading(true);
            setError(null);
            setUser(firebaseUser);
            setPlayer(null);
            setIsAdmin(false);

            if (firebaseUser) {
                try {
                    const [tokenResult, profile] = await Promise.all([
                        firebaseUser.getIdTokenResult(true),
                        getPlayer(firebaseUser.uid),
                    ]);

                    if (currentRequest === requestId) {
                        setIsAdmin(tokenResult.claims.admin === true);
                        setPlayer(profile);
                    }
                } catch (err) {
                    console.error('Failed to load account:', err);

                    if (currentRequest === requestId) {
                        setError('Unable to load your account.');
                    }
                }
            }

            if (currentRequest === requestId) {
                setLoading(false);
            }
        });

        return () => {
            requestId++;
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                player,
                isAdmin,
                loading,
                error,
                refreshPlayer,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
