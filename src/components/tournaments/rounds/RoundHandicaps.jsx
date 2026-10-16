
import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth.js';
import {
    saveRoundTeeRatings,
} from '../../../repositories/roundRepository.js';
import {
    getRoundPlayingHandicap,
} from '../../../lib/handicap.js';

export default function RoundHandicaps({
                                           tournament,
                                           round,
                                           onSaved,
                                       }) {
    const { user } = useAuth();

    const isOrganiser = user?.uid === tournament.createdBy;
    const isCourseMode = tournament.handicapMode === 'course';

    const [courseRating, setCourseRating] = useState(
        String(round.teeRatings?.courseRating ?? ''),
    );
    const [slopeRating, setSlopeRating] = useState(
        String(round.teeRatings?.slopeRating ?? ''),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setCourseRating(String(round.teeRatings?.courseRating ?? ''));
        setSlopeRating(String(round.teeRatings?.slopeRating ?? ''));
    }, [round.id, round.teeRatings]);

    async function handleSave(event) {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            await saveRoundTeeRatings(tournament, round.id, {
                courseRating,
                slopeRating,
            });

            await onSaved?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const participants = Object.entries(tournament.participants ?? {});

    return (
        <section className="space-y-4 rounded-lg bg-gray-50 p-4">
            <h4 className="font-semibold">Round handicaps</h4>

            {isCourseMode && isOrganiser && round.status === 'draft' && (
                <form onSubmit={handleSave} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">
                            Course Rating
                            <input
                                type="number"
                                step="0.1"
                                min="50"
                                max="90"
                                required
                                value={courseRating}
                                onChange={(event) => setCourseRating(event.target.value)}
                                className="mt-1 w-full rounded border border-gray-300 p-2"
                            />
                        </label>

                        <label className="text-sm">
                            Slope Rating
                            <input
                                type="number"
                                step="1"
                                min="55"
                                max="155"
                                required
                                value={slopeRating}
                                onChange={(event) => setSlopeRating(event.target.value)}
                                className="mt-1 w-full rounded border border-gray-300 p-2"
                            />
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded bg-fairway-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save tee ratings'}
                    </button>
                </form>
            )}

            {isCourseMode && !round.teeRatings && (
                <p className="text-sm text-amber-700">
                    Tee ratings are needed to calculate Playing Handicaps.
                </p>
            )}

            {isCourseMode && round.teeRatings && (
                <p className="text-xs text-gray-500">
                    Course Rating: {round.teeRatings.courseRating}
                    {' · '}
                    Slope Rating: {round.teeRatings.slopeRating}
                </p>
            )}

            {round.scorecard && participants.length > 0 && (
                <div className="space-y-2">
                    {participants.map(([playerId, participant]) => {
                        let playingHandicap = null;

                        try {
                            playingHandicap = getRoundPlayingHandicap(
                                participant,
                                tournament.handicapMode,
                                round,
                            );
                        } catch {
                            // Display an unavailable handicap until setup is complete.
                        }

                        return (
                            <div
                                key={playerId}
                                className="flex items-center justify-between border-b border-gray-200 py-2"
                            >
                                <div>
                                    <p className="font-medium">
                                        {participant.displayName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Tournament HI: {participant.handicapIndexSnapshot ?? '—'}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-lg font-bold">
                                        {playingHandicap ?? '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Playing Handicap
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!round.scorecard && (
                <p className="text-sm text-gray-500">
                    Configure the round scorecard to see handicaps.
                </p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-600">
                    {error}
                </p>
            )}
        </section>
    );
}
