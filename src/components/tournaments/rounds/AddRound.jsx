
import { useState } from 'react';
import { createRound } from '../../../repositories/roundRepository.js';

export default function AddRound({ tournament, onCreated }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [courseName, setCourseName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();

        setSaving(true);
        setError('');

        try {
            await createRound(tournament, {
                name,
                date,
                courseName,
            });

            setName('');
            setDate('');
            setCourseName('');

            await onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-baggygolf-line bg-baggygolf-surface p-5"
        >
            <h3 className="text-lg font-semibold text-baggygolf-950">
                Add round
            </h3>

            <div>
                <label htmlFor="round-name" className="mb-1 block text-sm font-medium">
                    Round name
                </label>
                <input
                    id="round-name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Round 1"
                    className="w-full rounded-lg border border-baggygolf-line p-3"
                />
            </div>

            <div>
                <label htmlFor="round-date" className="mb-1 block text-sm font-medium">
                    Date
                </label>
                <input
                    id="round-date"
                    type="date"
                    required
                    min={tournament.startDate}
                    max={tournament.endDate}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-lg border border-baggygolf-line p-3"
                />
            </div>

            <div>
                <label htmlFor="course-name" className="mb-1 block text-sm font-medium">
                    Course (optional)
                </label>
                <input
                    id="course-name"
                    maxLength={120}
                    value={courseName}
                    onChange={(event) => setCourseName(event.target.value)}
                    placeholder="Course name"
                    className="w-full rounded-lg border border-baggygolf-line p-3"
                />
                <p className="mt-1 text-xs text-baggygolf-muted">
                    We'll connect this to your saved course library later.
                </p>
            </div>

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}

            <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-baggygolf-primary px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
                {saving ? 'Adding round...' : 'Add round'}
            </button>
        </form>
    );
}
