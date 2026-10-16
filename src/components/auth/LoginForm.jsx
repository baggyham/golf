
import { useState } from 'react';
import { login } from '../../services/authService.js';

export default function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();

        setLoading(true);
        setError('');

        try {
            await login(username, password);
        } catch (err) {
            console.error('Login failed:', err.code);
            setError('Invalid username or password');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-fairway-50 p-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-lg"
            >
                <div>
                    <h1 className="text-3xl font-bold text-fairway-950">
                        Fairway
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Sign in to your golf account
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="username"
                        className="mb-1 block text-sm font-medium"
                    >
                        Username
                    </label>

                    <input
                        id="username"
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-3"
                        required
                    />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="mb-1 block text-sm font-medium"
                    >
                        Password
                    </label>

                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-3"
                        required
                    />
                </div>

                {error && (
                    <p role="alert" className="text-sm text-red-600">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-fairway-950 p-3 font-semibold text-white hover:bg-fairway-800 disabled:opacity-50"
                >
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
        </main>
    );
}
