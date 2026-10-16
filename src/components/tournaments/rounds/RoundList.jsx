import {useState} from 'react';
import RoundScorecardEditor from './RoundScorecardEditor.jsx';
import RoundHandicaps from './RoundHandicaps.jsx';
import {useAuth} from '../../../hooks/useAuth.js';
import ScoreEntry from '../../scoring/ScoreEntry.jsx';
import LiveLeaderboard from '../../scoring/LiveLeaderboard.jsx';
import OfficialLeaderboard from '../../scoring/OfficialLeaderboard.jsx';
import ScoreVerification from '../../scoring/ScoreVerification.jsx';
import {changeRoundStatus, completeRound} from '../../../repositories/roundRepository.js';

export default function RoundList({
                                      rounds,
                                      tournament,
                                      onScorecardSaved,
                                  }) {
    const [editingRoundId, setEditingRoundId] = useState(null);
    const [scoringRoundId, setScoringRoundId] = useState(null);
    const [busyRoundId, setBusyRoundId] = useState(null);
    const [roundError, setRoundError] = useState('');

    async function handleStatusChange(roundId, action) {
        const message = action === 'start' ? 'Start this round?' : 'Finish live scoring for this round?';
        if (!window.confirm(message)) return;
        setBusyRoundId(roundId);
        setRoundError('');
        try {
            await changeRoundStatus(tournament.id, roundId, action);
            await onScorecardSaved?.();
            setScoringRoundId(null);
        } catch (error) {
            setRoundError(error.message || 'Could not update round.');
        } finally {
            setBusyRoundId(null);
        }
    }
    async function handleComplete(roundId) {
        if (!window.confirm('Lock this round and use confirmed scores as official results? This cannot be undone.')) return;
        setBusyRoundId(roundId);
        setRoundError('');
        try {
            await completeRound(tournament.id, roundId);
            await onScorecardSaved?.();
        } catch (error) {
            setRoundError(error.message || 'Could not complete the round.');
        } finally {
            setBusyRoundId(null);
        }
    }
    const {user} = useAuth();
    const isOrganiser = user?.uid === tournament.createdBy;

    if (rounds.length === 0) {
        return <p className="text-sm text-gray-500">No rounds added yet.</p>;
    }

    return (
        <div className="space-y-4">
            {roundError && <p role="alert" className="text-sm text-red-600">{roundError}</p>}
            {rounds.map((round) => {
                const isEditing = editingRoundId === round.id;

                return (
                    <article
                        key={round.id}
                        className="space-y-4 rounded-lg border border-gray-200 p-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold">{round.name}</h3>
                                <p className="text-sm text-gray-500">
                                    {round.date} · {round.courseName || 'No course selected'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {round.scorecard ? 'Scorecard configured' : 'Scorecard needed'}
                                    {' · '}Status: {round.status.replaceAll('_', ' ')}
                                </p>
                            </div>

                            {round.scorecard && round.status === 'in_progress' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setScoringRoundId(
                                            scoringRoundId === round.id ? null : round.id,
                                        )
                                    }
                                    className="text-sm font-semibold text-fairway-800"
                                >
                                    {scoringRoundId === round.id
                                        ? 'Close score entry'
                                        : 'Enter scores'}
                                </button>
                            )}

                            {isOrganiser && tournament.status === 'in_progress' && round.status === 'draft' && (
                                <button type="button" disabled={Boolean(busyRoundId)}
                                    onClick={() => handleStatusChange(round.id, 'start')}
                                    className="rounded bg-fairway-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                    Start round
                                </button>
                            )}
                            {isOrganiser && round.status === 'in_progress' && (
                                <button type="button" disabled={Boolean(busyRoundId)}
                                    onClick={() => handleStatusChange(round.id, 'finish')}
                                    className="rounded border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-50">
                                    Finish round
                                </button>
                            )}
                        {isOrganiser && round.status === 'awaiting_verification' && (
                                <button type="button" disabled={Boolean(busyRoundId)}
                                    onClick={() => handleComplete(round.id)}
                                    className="rounded bg-fairway-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                    {busyRoundId === round.id ? 'Completing...' : 'Complete round'}
                                </button>
                            )}
                            {isOrganiser && round.status === 'draft' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingRoundId(isEditing ? null : round.id)
                                    }
                                    className="text-sm font-semibold text-fairway-800"
                                >
                                    {isEditing ? 'Close editor' : 'Edit scorecard'}
                                </button>
                            )}
                        </div>

                        {isEditing && (
                            <RoundScorecardEditor
                                tournament={tournament}
                                round={round}
                                onSaved={onScorecardSaved}
                            />
                        )}

                        <RoundHandicaps
                            tournament={tournament}
                            round={round}
                            onSaved={onScorecardSaved}
                        />

                        {round.scorecard && ['in_progress', 'awaiting_verification'].includes(round.status) && (
                            <LiveLeaderboard tournament={tournament} round={round} />
                        )}

                        {round.status === 'completed' && (
                            <p className="text-sm font-medium text-green-700">Round completed — official scorecards locked.</p>
                        )}

                        {round.status === 'completed' && (
                            <OfficialLeaderboard tournament={tournament} round={round} />
                        )}

                        {isOrganiser && round.status === 'awaiting_verification' && (
                            <ScoreVerification tournament={tournament} round={round} />
                        )}

                        {scoringRoundId === round.id && (
                            <ScoreEntry
                                tournament={tournament}
                                round={round}
                            />
                        )}

                    </article>
                );
            })}
        </div>
    );
}
