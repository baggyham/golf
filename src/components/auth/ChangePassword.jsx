
import { useState } from 'react';
import { changePassword } from '../../services/authService.js';

export default function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();

        if (newPassword.length < 8) {
            setError('New password must contain at least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await changePassword(currentPassword, newPassword);

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess('Your password has been updated.');
        } catch (err) {
            switch (err.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                    setError('Your current password is incorrect.');
                    break;
                case 'auth/weak-password':
                    setError('Please choose a stronger password.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many attempts. Please try again later.');
                    break;
                default:
                    setError('Unable to update your password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
        >
            <div>
                <h2 className="text-lg font-semibold text-fairway-950">
                    Change password
                </h2>
                <p className="text-sm text-gray-500">
                    Enter your current password to set a new one.
                </p>
            </div>

            <div className="space-y-1">
                <label htmlFor="current-password" className="text-sm font-medium">
                    Current password
                </label>
                <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div className="space-y-1">
                <label htmlFor="new-password" className="text-sm font-medium">
                    New password
                </label>
                <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            <div className="space-y-1">
                <label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm new password
                </label>
                <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-3"
                />
            </div>

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {success && (
                <p role="status" className="text-sm text-green-700">
                    {success}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-fairway-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
                {loading ? 'Updating...' : 'Update password'}
            </button>
        </form>
    );
}
