import {useEffect, useState, useCallback} from 'react';
import {useAuth} from '../../hooks/useAuth.js';
import {getTournament, startTournament, completeTournament} from '../../repositories/tournamentRepository.js';
import {
    getTournamentRounds,
} from '../../repositories/roundRepository.js';
import AddRound from './rounds/AddRound.jsx';
import RoundList from './rounds/RoundList.jsx';

export default function TournamentOverview({tournamentId, onBack}) {
    const {user} = useAuth();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completeError, setCompleteError] = useState('');
    const [startError, setStartError] = useState('');
    const [rounds, setRounds] = useState([]);
    const [roundsLoading, setRoundsLoading] = useState(true);
    const [roundsError, setRoundsError] = useState('');

    const loadRounds = useCallback(async () => {
        if (!tournamentId) return;

        setRoundsLoading(true);
        setRoundsError('');

        try {
            const data = await getTournamentRounds(tournamentId);
            setRounds(data);
        } catch (err) {
            console.error('Failed to load rounds:', err);
            setRoundsError('Could not load tournament rounds.');
        } finally {
            setRoundsLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        loadRounds();
    }, [loadRounds]);

    useEffect(() => {
        let active = true;

        async function loadTournament() {
            setLoading(true);
            setError('');
            setTournament(null);

            try {
                const data = await getTournament(tournamentId);

                if (active) {
                    setTournament(data);
                }
            } catch (err) {
                console.error('Tournament loading failed:', err);

                if (active) {
                    setError('Could not load tournament.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadTournament();

        return () => {
            active = false;
        };
    }, [tournamentId]);

    if (loading) {
        return <p>Loading tournament...</p>;
    }

    if (error) {
        return <p role="alert" className="text-red-600">{error}</p>;
    }

    if (!tournament) {
        return <p>Tournament not found.</p>;
    }

    async function handleStart() {
        if (!window.confirm('Start this tournament? Round setup will be locked.')) return;
        setStarting(true);
        setStartError('');
        try {
            await startTournament(tournamentId);
            const updated = await getTournament(tournamentId);
            setTournament(updated);
        } catch (err) {
            setStartError(err.message || 'Unable to start tournament.');
        } finally {
            setStarting(false);
        }
    }

    async function handleComplete() {
        if (!window.confirm('Complete tournament and lock the final results?')) return;
        setCompleting(true);
        setCompleteError('');
        try {
            await completeTournament(tournamentId);
            setTournament(await getTournament(tournamentId));
        } catch (err) {
            setCompleteError(err.message || 'Unable to complete tournament.');
        } finally {
            setCompleting(false);
        }
    }

    const isOrganiser = tournament.createdBy === user?.uid;

    const participants = Object.entries(
        tournament.participants ?? {},
    );

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <button
                type="button"
                onClick={onBack}
                className="text-sm font-medium text-fairway-800"
            >
                ← Back to tournaments
            </button>

            <header>
                <h1 className="text-2xl font-bold text-fairway-950">
                    {tournament.name}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    {tournament.startDate} — {tournament.endDate}
                </p>
            </header>

            {isOrganiser && tournament.status === 'draft' && (
                <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <h2 className="font-semibold text-fairway-950">Ready to play?</h2>
                    <p className="text-sm text-slate-700">
                        Start when your rounds and scorecards are configured. This locks round setup.
                    </p>
                    {startError && <p role="alert" className="text-sm text-red-600">{startError}</p>}
                    <button type="button" disabled={starting || roundsLoading || Boolean(roundsError)}
                        onClick={handleStart}
                        className="min-h-11 rounded-lg bg-fairway-950 px-5 text-sm font-semibold text-white disabled:opacity-50">
                        {starting ? 'Starting…' : 'Start tournament'}
                    </button>
                </section>
            )}

            {isOrganiser && tournament.status === 'in_progress' && (
                <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="font-semibold">Finish competition</h2>
                    <p className="text-sm text-gray-600">
                        All rounds must be completed and all players verified before finalising.
                    </p>
                    {completeError && <p role="alert" className="text-sm text-red-600">{completeError}</p>}
                    <button type="button" disabled={completing || roundsLoading || Boolean(roundsError)}
                        onClick={handleComplete}
                        className="min-h-11 rounded-lg bg-fairway-950 px-5 text-sm font-semibold text-white disabled:opacity-50">
                        {completing ? 'Completing…' : 'Complete tournament'}
                    </button>
                </section>
            )}

            {tournament.status === 'completed' && Array.isArray(tournament.finalStandings) && (
                <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Final results</h2>
                    <p className="text-sm text-gray-600">
                        Winner{tournament.winnerIds?.length === 1 ? '' : 's'}: {' '}
                        {tournament.finalStandings.filter((row) => row.position === 1)
                            .map((row) => row.displayName).join(', ')}
                    </p>
                    <ol className="space-y-2">
                        {tournament.finalStandings.map((row) => (
                            <li key={row.playerId} className="flex justify-between gap-4 text-sm">
                                <span>{row.position}. {row.displayName}</span>
                                <strong>{row.totalPoints} pts</strong>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold">
                    Tournament details
                </h2>

                <div className="space-y-2 text-sm">
                    <p>Status: {tournament.status}</p>
                    <p>Format: {tournament.format}</p>
                    <p>
                        Handicap mode:{' '}
                        {tournament.handicapMode === 'fixed'
                            ? 'Fixed Playing Handicap'
                            : 'Course Handicap'}
                    </p>
                    <p>
                        Your role: {isOrganiser ? 'Organiser' : 'Player'}
                    </p>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-lg font-semibold">
                    Players ({participants.length})
                </h2>

                <div className="space-y-3">
                    {participants.map(([playerId, player]) => (
                        <div
                            key={playerId}
                            className="flex items-center justify-between border-b border-gray-100 pb-3"
                        >
                            <div>
                                <p className="font-medium">
                                    {player.displayName}
                                </p>

                                <p className="text-xs text-gray-500">
                                    Starting HI: {player.handicapIndexSnapshot ?? '—'}
                                </p>
                            </div>

                            <div className="text-right">
                                {tournament.handicapMode === 'fixed' ? (
                                    <>
                                        <p className="font-semibold">
                                            {player.fixedPlayingHandicap}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Playing Handicap
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">
                                        Calculated per round
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-fairway-950">
                    Tournament rounds
                </h2>

                {roundsLoading ? (
                    <p className="text-sm text-gray-500">Loading rounds...</p>
                ) : roundsError ? (
                    <p role="alert" className="text-sm text-red-600">
                        {roundsError}
                    </p>
                ) : (
                    <RoundList
                        rounds={rounds}
                        tournament={tournament}
                        onScorecardSaved={loadRounds}
                    />
                )}

                {isOrganiser && tournament.status === 'draft' && (
                    <AddRound
                        tournament={tournament}
                        onCreated={loadRounds}
                    />
                )}
            </section>

        </div>
    );
}
