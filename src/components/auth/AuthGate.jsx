import { useEffect, useState } from 'react';
import { observeAuth, logout } from '../../services/authService.js';
import LoginForm from './LoginForm.jsx';

export default function AuthGate({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return observeAuth((firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <p className="p-6">Checking session...</p>;
    }

    if (!user) {
        return <LoginForm />;
    }

    return (
        <>
            <div className="flex justify-end bg-fairway-950 px-4 py-2">
                <button
                    type="button"
                    onClick={() => logout()}
                    className="text-sm font-medium text-white"
                >
                    Sign out
                </button>
            </div>

            {children}
        </>
    );
}
