import { tournamentTheme } from '../../contexts/ThemeContext.jsx';
import { tournamentTier } from '../../lib/majorThemes.js';
import {useEffect, useState, useCallback} from 'react';
import {useAuth} from '../../hooks/useAuth.js';
import {getTournament, startTournament, completeTournament, updateDraftParticipantHandicap} from '../../repositories/tournamentRepository.js';
import {
    getTournamentRounds,
} from '../../repositories/roundRepository.js';
import AddRound from './rounds/AddRound.jsx';
import RoundList from './rounds/RoundList.jsx';
import RoundSetupEditor from './rounds/RoundSetupEditor.jsx';
import FinalTournamentResults from './FinalTournamentResults.jsx';
import HistoricalRoundScorecard from './HistoricalRoundScorecard.jsx';
import ChampionshipPlayoff from './ChampionshipPlayoff.jsx';

export default function TournamentOverview({tournamentId, onBack, onDraftManagementChange, onTournamentChange}) {
    const {user} = useAuth();
    const [tournament, setTournament] = useState(null);
    const [managementSection, setManagementSection] = useState(null);
    const [addingRound, setAddingRound] = useState(false);
    const [editingRoundId, setEditingRoundId] = useState(null);
    const [historicalRoundId, setHistoricalRoundId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [starting, setStarting] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completeError, setCompleteError] = useState('');
    const [playoffState, setPlayoffState] = useState({required: null, status: null});
    const [startError, setStartError] = useState('');
    const [rounds, setRounds] = useState([]);
    const [roundsLoading, setRoundsLoading] = useState(true);
    const [roundsError, setRoundsError] = useState('');
    const [editingPlayerId, setEditingPlayerId] = useState(null);
    const [handicapDraft, setHandicapDraft] = useState('');
    const [handicapError, setHandicapError] = useState('');
    const [savingHandicap, setSavingHandicap] = useState(false);
    const [focusedScoring, setFocusedScoring] = useState(false);

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

    // Apply this tournament's Major preset throughout the draft setup screens.
    // Ignore a previously loaded tournament while another ID is being fetched.
    useEffect(() => {
        onTournamentChange?.(tournament?.id === tournamentId ? tournament : null);
    }, [tournament, tournamentId, onTournamentChange]);

    // Restore the active competition palette when leaving tournament management.
    useEffect(() => () => onTournamentChange?.(null), [onTournamentChange]);

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

    async function saveHandicap(playerId) {
        const fixed = tournament.handicapMode === 'fixed';
        const text = handicapDraft.trim();
        const value = Number(text);
        if (!text || !Number.isFinite(value) || value < -10 || value > 54 || (fixed && !Number.isInteger(value))) {
            setHandicapError(fixed ? 'Enter a whole number from -10 to 54.' : 'Enter a number from -10 to 54.');
            return;
        }
        setSavingHandicap(true);
        setHandicapError('');
        try {
            const participants = await updateDraftParticipantHandicap(tournamentId, playerId, value);
            setTournament((prev) => ({...prev, participants}));
            setEditingPlayerId(null);
        } catch (err) {
            setHandicapError(err.message || 'Could not update handicap.');
        } finally {
            setSavingHandicap(false);
        }
    }

    function beginHandicapEdit(playerId, player) {
        const current = tournament.handicapMode === 'fixed' ? player.fixedPlayingHandicap : player.handicapIndexSnapshot;
        setEditingPlayerId(playerId);
        setHandicapDraft(current == null ? '' : String(current));
        setHandicapError('');
    }

    const isOrganiser = tournament.createdBy === user?.uid;

    const participants = Object.entries(
        tournament.participants ?? {},
    );

    const isDraftManager = isOrganiser && tournament.status === 'draft';
    // The draft organiser screen replaces main navigation, not the live scoring tabs.

    const configuredRounds = rounds.filter((round) => Boolean(round.scorecard) && (tournament.handicapMode !== 'course' || Boolean(round.teeRatings))).length;
    const allRoundsConfigured = rounds.length > 0 && configuredRounds === rounds.length;
    const managementSections = [
        {id: 'tournament-players', title: 'Players', detail: `${participants.length} selected`, icon: '01'},
        {id: 'tournament-rounds', title: 'Rounds & courses', detail: roundsLoading ? 'Loading rounds…' : `${configuredRounds} / ${rounds.length} configured`, icon: '02'},
        {id: 'tournament-details', title: 'Review & start', detail: 'Check setup and begin', icon: '03'},
    ];
    const isDraftHome = isDraftManager && !managementSection;
    const sectionTitle = managementSections.find((item) => item.id === managementSection)?.title;
    const editedRound = rounds.find((round) => round.id === editingRoundId);
    const focusedRoundScreen = addingRound || Boolean(editingRoundId);

    return (
        <div className={`tournament-scope mx-auto max-w-3xl ${focusedScoring ? 'flex min-h-0 flex-col gap-2 overflow-hidden' : focusedRoundScreen ? 'space-y-3 pb-2' : 'space-y-4 pb-8'}`} style={focusedScoring ? {...tournamentTheme(tournament), height: 'calc(100dvh - 120px)', maxHeight: 'calc(100dvh - 120px)'} : tournamentTheme(tournament)}>
            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => { if (addingRound) setAddingRound(false); else if (editingRoundId) setEditingRoundId(null); else if (isDraftManager && managementSection) setManagementSection(null); else onBack?.(); }}
                    className="min-h-11 text-sm font-semibold" style={{color: 'var(--ink)'}}
                >
                    ← {focusedRoundScreen ? 'Rounds & courses' : isDraftManager && managementSection ? 'Tournament setup' : 'Tournaments'}
                </button>
                {isDraftManager && managementSection && !focusedRoundScreen && <span className="baggy-muted text-xs">DRAFT SETUP</span>}
            </div>

            {isDraftManager ? (
                <>
                    {managementSection !== 'tournament-rounds' && <section className="tournament-hero rounded-2xl px-5 py-5" aria-label="Tournament status">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest" style={{color: 'var(--gold)'}}>Draft tournament</p>
                            <span className="rounded-full border border-white/30 px-2.5 py-1 text-xs">{participants.length} players</span>
                        </div>
                        {tournamentTier(tournament) === 'major' && <p className="text-xs font-bold uppercase tracking-widest" style={{color:'var(--gold)'}}>★ Major championship</p>}
                        <h1 className="mt-2 text-2xl font-bold leading-tight">{tournament.name}</h1>
                        <p className="mt-1 text-sm text-white/75">{tournament.startDate} — {tournament.endDate}</p>
                        <div className="mt-4 flex items-center gap-2 border-t border-white/20 pt-3 text-sm">
                            <span aria-hidden="true" style={{color: 'var(--gold)'}}>●</span>
                            <span>{roundsLoading ? 'Checking rounds…' : roundsError ? 'Unable to check rounds' : allRoundsConfigured ? 'All rounds configured' : `${configuredRounds} of ${rounds.length} rounds configured`}</span>
                        </div>
                    </section>}
                    {isDraftHome ? (
                        <>
                            <section className="space-y-2" aria-label="Configure tournament">
                                <h2 className="px-1 text-base font-bold">Tournament setup</h2>
                                {managementSections.map((item) => (
                                    <button key={item.id} type="button" onClick={() => { setAddingRound(false); setManagementSection(item.id); }}
                                        className="baggy-surface flex min-h-18 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:opacity-80">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                                            style={{background: 'var(--surface-soft)', color: 'var(--ink)'}}>{item.icon}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold">{item.title}</span>
                                            <span className="baggy-muted block text-xs">{item.detail}</span>
                                        </span>
                                        <span className="baggy-muted" aria-hidden="true">›</span>
                                    </button>
                                ))}
                            </section>
                        </>
                    ) : managementSection === 'tournament-rounds' && addingRound ? (
                        <AddRound tournament={tournament} roundNumber={rounds.length + 1}
                            onCreated={async ({roundId, usedLibrary}) => {
                                await loadRounds();
                                setAddingRound(false);
                                // Library rounds already have the 18-hole card and tee ratings.
                                // Manual rounds need a scorecard before they are ready.
                                setEditingRoundId(usedLibrary ? null : roundId);
                            }} />
                    ) : managementSection === 'tournament-rounds' && editingRoundId ? (
                        editedRound ? <RoundSetupEditor key={editedRound.id} tournament={tournament} round={editedRound}
                            onSaved={async () => { await loadRounds(); setEditingRoundId(null); }} />
                            : <p className="baggy-muted text-sm">{roundsLoading ? 'Loading round…' : 'Round not found. Return to rounds and try again.'}</p>
                    ) : (
                        <section className="baggy-surface rounded-xl p-4 sm:p-5" aria-label={sectionTitle}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="text-lg font-bold">{sectionTitle}</h2>
                                {managementSection === 'tournament-rounds' && (
                                    <button type="button" onClick={() => setAddingRound(true)}
                                        className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold"
                                        style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
                                        + Add round
                                    </button>
                                )}
                            </div>
                            {managementSection === 'tournament-details' && (
                                <dl className="space-y-3 text-sm">
                                    {[
                                        ['Status', 'Draft'],
                                        ['Start date', tournament.startDate],
                                        ['End date', tournament.endDate],
                                        ['Format', tournament.format],
                                        ['Handicap mode', tournament.handicapMode === 'fixed' ? 'Fixed Playing Handicap' : 'Course Handicap'],
                                    ].map(([name, value]) => (
                                        <div key={name} className="flex justify-between gap-4 border-b pb-2" style={{borderColor: 'var(--line)'}}>
                                            <dt className="baggy-muted">{name}</dt><dd className="text-right font-semibold">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            {managementSection === 'tournament-players' && (
                                <div className="space-y-2">
                                    {participants.map(([id, player]) => {
                                        const fixed = tournament.handicapMode === 'fixed';
                                        const current = fixed ? player.fixedPlayingHandicap : player.handicapIndexSnapshot;
                                        const editing = editingPlayerId === id;
                                        return (
                                            <div key={id} className="border-b py-2" style={{borderColor: 'var(--line)'}}>
                                                <div className="flex min-h-12 items-center justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-semibold">{player.displayName}</p>
                                                        <p className="baggy-muted text-xs">{fixed ? `Starting HI ${player.handicapIndexSnapshot ?? '—'}` : 'Tournament HI snapshot'}</p>
                                                    </div>
                                                    {editing ? (
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            <input aria-label={`Handicap for ${player.displayName}`} type="number" inputMode="decimal" step={fixed ? '1' : '0.1'} min="-10" max="54"
                                                                value={handicapDraft} onChange={(e) => setHandicapDraft(e.target.value)} disabled={savingHandicap}
                                                                onKeyDown={(e) => {if (e.key === 'Enter') saveHandicap(id); if (e.key === 'Escape') setEditingPlayerId(null);}}
                                                                className="w-14 rounded-md border px-1 py-2 text-center text-sm" style={{background:'var(--surface)', borderColor:'var(--line)', color:'var(--ink)'}}/>
                                                            <button type="button" onClick={() => saveHandicap(id)} disabled={savingHandicap} aria-label="Confirm handicap" className="flex h-9 w-9 items-center justify-center rounded-md font-bold" style={{color:'var(--primary)'}}>✓</button>
                                                            <button type="button" onClick={() => {setEditingPlayerId(null); setHandicapError('');}} disabled={savingHandicap} aria-label="Cancel handicap edit" className="flex h-9 w-9 items-center justify-center rounded-md">✕</button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex shrink-0 items-center gap-1">
                                                            <div className="text-right"><p className="font-bold">{current ?? '—'}</p><p className="baggy-muted text-[10px]">{fixed ? 'Playing HCP' : 'HI'}</p></div>
                                                            <button type="button" onClick={() => beginHandicapEdit(id, player)} aria-label={`Edit handicap for ${player.displayName}`}
                                                                className="flex h-9 w-9 items-center justify-center rounded-lg" style={{color:'var(--ink)'}}>✎</button>
                                                        </div>
                                                    )}
                                                </div>
                                                {editing && handicapError && <p role="alert" className="mt-1 text-xs text-red-600">{handicapError}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {managementSection === 'tournament-rounds' && (
                                <div className="space-y-3">
                                    {roundsLoading ? <p className="baggy-muted text-sm">Loading rounds…</p> : roundsError ?
                                        <div role="alert" className="space-y-2 text-sm text-red-600"><p>{roundsError}</p><button type="button" onClick={loadRounds} className="underline">Retry</button></div> :
                                        <RoundList rounds={rounds} tournament={tournament} onScorecardSaved={loadRounds} onEditRound={isDraftManager ? setEditingRoundId : undefined}/>}
                                </div>
                            )}
                            {managementSection === 'tournament-players' && (
                                <button type="button" onClick={() => setManagementSection('tournament-rounds')}
                                    className="mt-4 min-h-12 w-full rounded-lg px-4 text-sm font-bold"
                                    style={{background: 'var(--primary)', color: 'var(--on-primary)'}}>
                                    Continue to rounds →
                                </button>
                            )}
                            {managementSection === 'tournament-rounds' && (
                                <button type="button" onClick={() => setManagementSection('tournament-details')}
                                    className="mt-4 min-h-12 w-full rounded-lg px-4 text-sm font-bold"
                                    style={{background: 'var(--primary)', color: 'var(--on-primary)'}}>
                                    Continue to review →
                                </button>
                            )}
                            {managementSection === 'tournament-details' && (
                                <div className="mt-4 space-y-2">
                                    {startError && <p role="alert" className="text-sm text-red-600">{startError}</p>}
                                    <button type="button" disabled={starting || roundsLoading || Boolean(roundsError) || !allRoundsConfigured}
                                        onClick={handleStart}
                                        className="min-h-12 w-full rounded-lg px-4 text-sm font-bold disabled:opacity-50"
                                        style={{background: 'var(--primary)', color: 'var(--on-primary)'}}>
                                        {starting ? 'Starting…' : 'Start tournament'}
                                    </button>
                                    {!allRoundsConfigured && <p className="baggy-muted text-center text-xs">Configure every round before starting.</p>}
                                </div>
                            )}
                        </section>
                    )}
                </>
            ) : (
                <>
                    {!focusedScoring && <header className="space-y-1">
                        {tournamentTier(tournament) === 'major' && <p className="text-xs font-bold uppercase tracking-widest" style={{color:'var(--gold)'}}>★ Major championship</p>}
                        <h1 className="text-2xl font-bold">{tournament.name}</h1>
                        <p className="baggy-muted text-sm">{tournament.startDate} — {tournament.endDate} · {tournament.status.replaceAll('_', ' ')}</p>
                    </header>}
                    {tournament.status === 'completed' && (historicalRoundId ? (
                        <HistoricalRoundScorecard key={historicalRoundId} tournament={tournament} round={rounds.find(r => r.id === historicalRoundId)} onBack={() => setHistoricalRoundId(null)} />
                    ) : (
                        <>
                          <FinalTournamentResults tournament={tournament} rounds={rounds} />
                          <section className="baggy-surface rounded-2xl p-4 sm:p-5" aria-label="Historical scorecards">
                            <h2 className="text-lg font-bold">Official scorecards</h2>
                            <div className="mt-3 space-y-2">{rounds.filter(r => r.status === 'completed').map(round => (
                              <button type="button" key={round.id} onClick={() => setHistoricalRoundId(round.id)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left" style={{borderColor:'var(--line)'}}>
                                <span><span className="block font-semibold">{round.name}</span><span className="baggy-muted block text-xs">{round.courseName || 'View verified scores'} · {round.date}</span></span><span aria-hidden="true">›</span>
                              </button>
                            ))}</div>
                          </section>
                        </>
                    ))}
                    {!historicalRoundId && <section className={focusedScoring ? 'flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-xl' : 'baggy-surface rounded-xl p-3 sm:p-4'}>
                        {!focusedScoring && <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">Rounds</h2><span className="baggy-muted text-xs">{rounds.length} total</span></div>}
                        {roundsLoading ? <p className="baggy-muted text-sm">Loading rounds…</p> : roundsError ?
                            <p role="alert" className="text-sm text-red-600">{roundsError}</p> :
                            <RoundList rounds={rounds} tournament={tournament} onScorecardSaved={loadRounds} onFocusedScoringChange={setFocusedScoring}/>}
                    </section>}
                    {!focusedScoring && tournament.status === 'in_progress' && tournamentTier(tournament) === 'major' &&
                        !roundsLoading && !roundsError && rounds.length > 0 && rounds.every(round => round.status === 'completed') && (
                          <ChampionshipPlayoff tournament={tournament} rounds={rounds} onStatus={setPlayoffState} />
                        )}
                    {!focusedScoring && isOrganiser && tournament.status === 'in_progress' && (
                        <section className="baggy-surface space-y-3 rounded-xl p-4" aria-label="Complete tournament">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-bold">Complete tournament</h2>
                                <span className="baggy-muted text-xs">Final step</span>
                            </div>
                            {completeError && <p role="alert" className="text-sm text-red-600">{completeError}</p>}
                            <button type="button" disabled={completing || roundsLoading || Boolean(roundsError) || !rounds.length || !rounds.every((round) => round.status === 'completed') || (tournamentTier(tournament) === 'major' && (playoffState.required === null || (playoffState.required && playoffState.status !== 'completed')))}
                                onClick={handleComplete} className="min-h-12 w-full rounded-lg px-4 text-sm font-semibold disabled:opacity-50"
                                style={{background: 'var(--primary)', color: 'var(--on-primary)'}}>
                                {completing ? 'Completing…' : 'Complete tournament'}
                            </button>
                            {(tournamentTier(tournament) === 'major' && rounds.length > 0 && rounds.every((round) => round.status === 'completed') && (playoffState.required === null || (playoffState.required && playoffState.status !== 'completed'))) && (
                                <p className="baggy-muted text-xs">{playoffState.required === null ? 'Checking championship results…' : 'Complete the championship playoff to crown a winner.'}</p>
                            )}
                            {(!rounds.length || rounds.some((round) => round.status !== 'completed')) && (
                                <p className="baggy-muted text-xs">Complete every round and resolve any Major playoff before finishing the tournament.</p>
                            )}
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
