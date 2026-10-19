import { useEffect, useMemo, useState } from 'react';
import RoundScorecardEditor from './RoundScorecardEditor.jsx';
import RoundHandicaps from './RoundHandicaps.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import ScoreEntry from '../../scoring/ScoreEntry.jsx';
import LiveLeaderboard from '../../scoring/LiveLeaderboard.jsx';
import OfficialLeaderboard from '../../scoring/OfficialLeaderboard.jsx';
import ScoreVerification from '../../scoring/ScoreVerification.jsx';
import { sortRoundsByCreation } from '../../../lib/roundOrder.js';
import { changeRoundStatus, completeRound } from '../../../repositories/roundRepository.js';

const STATUS_TEXT = {
  draft: 'Not started',
  in_progress: 'In play',
  awaiting_verification: 'To verify',
  completed: 'Completed',
};

const buttonBase = 'min-h-10 rounded-lg px-3 text-sm font-semibold disabled:opacity-50';

export default function RoundList({ rounds, tournament, onScorecardSaved, onEditRound, onFocusedScoringChange }) {
  const { user } = useAuth();
  const isOrganiser = user?.uid === tournament.createdBy;
  const orderedRounds = useMemo(() => sortRoundsByCreation(rounds), [rounds]);
  const [openedRoundId, setOpenedRoundId] = useState(undefined);
  const [view, setView] = useState('live');
  const [visitedScoreEntryId, setVisitedScoreEntryId] = useState(null);
  const [editingRoundId, setEditingRoundId] = useState(null);
  const [busyRoundId, setBusyRoundId] = useState(null);
  const [roundError, setRoundError] = useState('');
  const focusedScoring = view === 'entry' && visitedScoreEntryId === openedRoundId;
  useEffect(() => { onFocusedScoringChange?.(focusedScoring); return () => onFocusedScoringChange?.(false); }, [focusedScoring, onFocusedScoringChange]);

  // Open the round currently requiring attention on first load only.
  // `null` is an intentional closed state, so user collapse is respected.
  useEffect(() => {
    if (openedRoundId !== undefined || tournament.status !== 'in_progress' || !orderedRounds.length) return;
    const current = orderedRounds.find((round) => round.status === 'in_progress')
      ?? orderedRounds.find((round) => round.status === 'awaiting_verification');
    setOpenedRoundId(current?.id ?? null);
  }, [openedRoundId, orderedRounds, tournament.status]);

  function toggleRound(id) {
    setOpenedRoundId((current) => current === id ? null : id);
    setView('live');
    setVisitedScoreEntryId(null);
    setEditingRoundId(null);
    setRoundError('');
  }

  async function handleStatusChange(roundId, action) {
    const message = action === 'start' ? 'Start this round?' : 'Finish live scoring for this round?';
    if (!window.confirm(message)) return;
    setBusyRoundId(roundId);
    setRoundError('');
    try {
      await changeRoundStatus(tournament.id, roundId, action);
      await onScorecardSaved?.();
      setView('live');
      setVisitedScoreEntryId(null);
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

  if (!orderedRounds.length) return <p className="baggy-muted text-sm">No rounds added yet.</p>;

  return (
    <div className={focusedScoring ? 'min-h-0 flex-1 overflow-hidden' : 'space-y-2'} aria-label="Rounds in creation order">
      {orderedRounds.map((round, index) => {
        if (focusedScoring && round.id !== openedRoundId) return null;
        const opened = openedRoundId === round.id;
        const isEditing = editingRoundId === round.id;
        const isLive = round.status === 'in_progress' && Boolean(round.scorecard);
        const scorecardReady = Array.isArray(round.scorecard?.holes) && round.scorecard.holes.length === 18;
        const readyToStart = scorecardReady && (tournament.handicapMode !== 'course' || Boolean(round.teeRatings));
        const subtitle = [round.courseName || 'Course not selected', round.date].filter(Boolean).join(' · ');
        const status = round.status === 'draft' && !readyToStart ? 'Needs setup' : (STATUS_TEXT[round.status] ?? round.status);

        return (
          <article key={round.id} className={focusedScoring ? 'flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border' : 'min-w-0 overflow-hidden rounded-xl border'} style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
            <button type="button" aria-expanded={opened} aria-controls={`round-actions-${round.id}`}
              onClick={() => toggleRound(round.id)}
              className={focusedScoring ? 'flex min-h-12 w-full shrink-0 items-center gap-2 px-3 py-2 text-left' : 'flex min-h-18 w-full items-center gap-3 px-3 py-3 text-left sm:px-4'}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                style={{ background: 'var(--surface-soft)', color: 'var(--ink)' }}>{String(index + 1).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{round.name}</span>
                <span className="baggy-muted block truncate text-xs">{subtitle}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: round.status === 'completed' ? 'var(--gold)' : 'var(--muted)' }}>{status}</span>
              <span aria-hidden="true" className="baggy-muted shrink-0 text-lg">{opened ? '⌃' : '›'}</span>
            </button>

            {opened && (
              <div id={`round-actions-${round.id}`} className={focusedScoring ? 'flex min-h-0 flex-1 flex-col gap-2 border-t px-2 py-2' : 'min-w-0 space-y-3 border-t px-3 py-3 sm:px-4'}
                style={{ borderColor: 'var(--line)' }}>
                {roundError && <p role="alert" className="text-sm text-red-600">{roundError}</p>}

                {round.status === 'draft' && isOrganiser && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => onEditRound ? onEditRound(round.id) : setEditingRoundId(isEditing ? null : round.id)}
                      className={`${buttonBase} border`} style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                      {isEditing && !onEditRound ? 'Close editor' : 'Edit round'}
                    </button>
                    {tournament.status === 'in_progress' && (
                      <button type="button" disabled={Boolean(busyRoundId) || !readyToStart}
                        onClick={() => handleStatusChange(round.id, 'start')}
                        className={buttonBase} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
                        {busyRoundId === round.id ? 'Starting…' : 'Start round'}
                      </button>
                    )}
                  </div>
                )}
                {round.status === 'draft' && !readyToStart && (
                  <p className="baggy-muted text-xs">Complete the scorecard{tournament.handicapMode === 'course' ? ' and tee ratings' : ''} before starting.</p>
                )}
                {isEditing && !onEditRound && <RoundScorecardEditor tournament={tournament} round={round} onSaved={onScorecardSaved} />}
                {isEditing && !onEditRound && tournament.handicapMode === 'course' && (
                  <RoundHandicaps tournament={tournament} round={round} onSaved={onScorecardSaved} showPlayerBreakdown={false} />
                )}

                {isLive && (
                  <>
                    <div className="grid grid-cols-2 gap-1 rounded-lg p-1" style={{ background: 'var(--surface-soft)' }} role="group" aria-label={`View ${round.name}`}>
                      {[
                        { id: 'live', label: 'Live scores' },
                        { id: 'entry', label: 'Enter scores' },
                      ].map((option) => (
                        <button key={option.id} type="button" aria-pressed={view === option.id}
                          onClick={() => { setView(option.id); if (option.id === 'entry') setVisitedScoreEntryId(round.id); }}
                          className="min-h-10 rounded-md px-2 text-sm font-semibold"
                          style={{ background: view === option.id ? 'var(--surface)' : 'transparent', color: 'var(--ink)', boxShadow: view === option.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {view === 'live' && <div className="min-w-0"><LiveLeaderboard tournament={tournament} round={round} /></div>}
                    {visitedScoreEntryId === round.id && (
                      <div className={view === 'entry' ? 'min-h-0 min-w-0 max-w-full flex-1 overflow-auto' : 'hidden'} aria-hidden={view !== 'entry'}>
                        <ScoreEntry key={round.id} tournament={tournament} round={round} />
                      </div>
                    )}
                    {isOrganiser && (
                      <button type="button" disabled={Boolean(busyRoundId)} onClick={() => handleStatusChange(round.id, 'finish')}
                        className={`${buttonBase} w-full border`} style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                        {busyRoundId === round.id ? 'Updating…' : 'Finish scoring & verify →'}
                      </button>
                    )}
                  </>
                )}

                {round.status === 'awaiting_verification' && (
                  <>
                    {isOrganiser ? (
                      <>
                        <button type="button" onClick={() => setView((current) => current === 'verify' ? 'live' : 'verify')}
                          aria-expanded={view === 'verify'} className={`${buttonBase} w-full`}
                          style={{ background: 'var(--surface-soft)', color: 'var(--ink)' }}>
                          {view === 'verify' ? 'Hide verification' : 'Review & verify scores'}
                        </button>
                        {view === 'verify' && <div className="min-w-0"><ScoreVerification tournament={tournament} round={round} /></div>}
                        <button type="button" disabled={Boolean(busyRoundId)} onClick={() => handleComplete(round.id)}
                          className={`${buttonBase} w-full`} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
                          {busyRoundId === round.id ? 'Completing…' : 'Complete round'}
                        </button>
                      </>
                    ) : <p className="baggy-muted text-sm">Waiting for the organiser to verify scores.</p>}
                  </>
                )}

                {round.status === 'completed' && (
                  <>
                    <button type="button" className={`${buttonBase} w-full border`} aria-expanded={view === 'official'}
                      onClick={() => setView((current) => current === 'official' ? 'live' : 'official')}
                      style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                      {view === 'official' ? 'Hide official results' : 'View official results'}
                    </button>
                    {view === 'official' && <OfficialLeaderboard tournament={tournament} round={round} />}
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
