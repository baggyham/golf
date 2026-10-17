import {useEffect, useState, useCallback} from 'react';
import {useAuth} from '../../hooks/useAuth.js';
import {getTournament, startTournament, completeTournament} from '../../repositories/tournamentRepository.js';
import {
    getTournamentRounds,
} from '../../repositories/roundRepository.js';
import AddRound from './rounds/AddRound.jsx';
import RoundList from './rounds/RoundList.jsx';

export default function TournamentOverview({tournamentId, onBack, onDraftManagementChange}) {
    const {user} = useAuth();
    const [tournament, setTournament] = useState(null);
    const [managementSection, setManagementSection] = useState(null);
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

    useEffect(() => {
        onDraftManagementChange?.(Boolean(tournament && tournament.createdBy === user?.uid && tournament.status === 'draft'));
        return () => onDraftManagementChange?.(false);
    }, [onDraftManagementChange, tournament, user?.uid]);

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

    const isDraftManager = isOrganiser && tournament.status === 'draft';
    // The draft organiser screen replaces main navigation, not the live scoring tabs.

    const configuredRounds = rounds.filter((round) => Boolean(round.scorecard)).length;
    const allRoundsConfigured = rounds.length > 0 && configuredRounds === rounds.length;
    const managementSections = [
        {id: 'tournament-players', title: 'Players', detail: `${participants.length} participants · Handicap snapshots`, icon: '01'},
        {id: 'tournament-rounds', title: 'Rounds & courses', detail: `${configuredRounds} of ${rounds.length} scorecards configured`, icon: '02'},
        {id: 'tournament-details', title: 'Tournament settings', detail: 'Format, dates & handicap mode', icon: '03'},
    ];

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

            {isDraftManager && managementSection && (
                <button type="button" onClick={() => setManagementSection(null)} className="baggy-surface rounded-xl px-4 py-3 text-sm font-semibold">← Back to tournament setup</button>
            )}

            {isDraftManager && !managementSection && (
                <section className="space-y-4" aria-label="Draft tournament setup">
                    <div className="rounded-2xl p-5 text-white" style={{background: 'var(--primary, #173D30)'}}>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{color: 'var(--gold, #D9BA77)'}}>Draft tournament</p>
                        <h2 className="mt-2 text-2xl font-bold">{tournament.name}</h2>
                        <p className="mt-2 text-sm text-white/80">{participants.length} player{participants.length === 1 ? '' : 's'} · {rounds.length} round{rounds.length === 1 ? '' : 's'}</p>
                        <p className="mt-2 text-sm text-white/90">
                            {roundsLoading ? 'Checking round setup…' : roundsError ? 'Could not check round setup' : allRoundsConfigured ? 'All round scorecards configured' : `${configuredRounds} of ${rounds.length} round scorecards configured`}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {managementSections.map((item) => (
                            <button key={item.id} type="button" onClick={() => setManagementSection(item.id)} className="baggy-surface flex min-h-20 w-full items-center gap-3 rounded-xl p-4 text-left transition hover:opacity-80">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{background: 'var(--surface-soft, #EDF0E8)', color: 'var(--ink, #173D30)'}}>{item.icon}</span>
                                <span className="min-w-0 flex-1"><span className="block font-semibold">{item.title}</span><span className="baggy-muted block text-xs">{item.detail}</span></span>
                                <span aria-hidden="true" className="baggy-muted">→</span>
                            </button>
                        ))}
                        <div className="baggy-surface flex min-h-20 items-center gap-3 rounded-xl p-4 opacity-75">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold" style={{background: 'var(--surface-soft, #EDF0E8)'}}>04</span>
                            <span className="flex-1"><span className="block font-semibold">Appearance</span><span className="baggy-muted block text-xs">Tournament colours & branding · Coming next</span></span>
                        </div>
                    </div>
                </section>
            )}

            {isOrganiser && tournament.status === 'draft' && !managementSection && (
                <section className="baggy-surface space-y-3 rounded-xl p-5">
                    <h2 className="font-semibold text-fairway-950">Ready to play?</h2>
                    <p className="text-sm text-slate-700">
                        Start when your rounds and scorecards are configured. Starting locks round setup.
                    </p>
                    {startError && <p role="alert" className="text-sm text-red-600">{startError}</p>}
                    <button type="button" disabled={starting || roundsLoading || Boolean(roundsError) || !allRoundsConfigured}
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

            {(!isDraftManager || managementSection === 'tournament-details') && (
            <section id="tournament-details" className="baggy-surface scroll-mt-24 rounded-xl p-5">
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
            )}

            {(!isDraftManager || managementSection === 'tournament-players') && (
            <section id="tournament-players" className="baggy-surface scroll-mt-24 rounded-xl p-5">
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
            )}

            {(!isDraftManager || managementSection === 'tournament-rounds') && (
            <section id="tournament-rounds" className="baggy-surface scroll-mt-24 space-y-4 rounded-xl p-5">
                <h2 className="text-lg font-semibold">
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
            )}

        </div>
    );
}
