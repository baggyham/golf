
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { updateOwnHandicap } from '../../repositories/playerRepository.js';

export default function EditHandicap() {
    const { user, player, refreshPlayer } = useAuth();

    const [handicap, setHandicap] = useState(
        player?.handicapIndex?.toString() ?? '',
    );
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    function cancel() {
        setHandicap(player?.handicapIndex?.toString() ?? '');
        setEditing(false);
        setError('');
    }

    async function save(event) {
        event.preventDefault();

        const value = handicap.trim();

        if (value === '') {
            setError('Please enter your Handicap Index.');
            return;
        }

        const number = Number(value);

        if (!Number.isFinite(number) || number < -10 || number > 54) {
            setError('Enter a Handicap Index between -10 and 54.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            await updateOwnHandicap(user.uid, number);
            await refreshPlayer();

            setEditing(false);
            setMessage('Handicap Index updated successfully.');
        } catch (err) {
            console.error('Handicap update failed:', err);
            setError('Unable to update your handicap. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">Handicap Index</p>

                    <p className="text-2xl font-bold text-fairway-950">
                        {player.handicapIndex ?? 'Not set'}
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setHandicap(player?.handicapIndex?.toString() ?? '');
                            setMessage('');
                            setEditing(true);
                        }}
                        className="text-sm font-semibold text-fairway-800 hover:underline"
                    >
                        Edit handicap
                    </button>

                    {message && (
                        <p role="status" className="text-sm text-green-700">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={save} className="space-y-3">
            <label
                htmlFor="handicap-index"
                className="block text-sm font-medium text-gray-700"
            >
                Handicap Index
            </label>

            <input
                id="handicap-index"
                type="number"
                step="0.1"
                min="-10"
                max="54"
                required
                value={handicap}
                onChange={(event) => setHandicap(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-fairway-800 focus:outline-none"
            />

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-fairway-950 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save handicap'}
                </button>

                <button
                    type="button"
                    disabled={saving}
                    onClick={cancel}
                    className="rounded-lg border border-gray-300 px-4 py-2 font-medium"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
