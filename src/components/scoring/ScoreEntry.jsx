import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import RoundSummary from './RoundSummary.jsx';
import { getRoundPlayingHandicap } from '../../lib/handicap.js';
import { calculateRoundStableford } from '../../lib/stableford.js';
import { emptyScorecard, getMyScoreEntry, saveMyScoreEntry } from '../../repositories/scoreEntryRepository.js';

const PRESETS = [
  { label: 'Eagle', symbol: '🦅', toScore: (par) => par - 2 },
  { label: 'Birdie', symbol: '🐦', toScore: (par) => par - 1 },
  { label: 'Par', symbol: '⛳', toScore: (par) => par },
  { label: 'Bogey', symbol: '+1', toScore: (par) => par + 1 },
  { label: 'Double', symbol: '+2', toScore: (par) => par + 2 },
  { label: 'Snowman', symbol: '☃️', toScore: () => 8 },
  { label: 'Pickup', symbol: '✋', toScore: () => 'pickup' },
];


export default function ScoreEntry({ tournament, round }) {
  const { user } = useAuth();
  const participants = useMemo(() => Object.entries(tournament.participants ?? {}), [tournament.participants]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const holeStripRef = useRef(null);
  const [expandedPlayer, setExpandedPlayer] = useState(user?.uid ?? '');
  const [cards, setCards] = useState({});
  const [saveStatus, setSaveStatus] = useState({});
  const cardsRef = useRef({});
  const revisionRef = useRef({});
  const savedRevisionRef = useRef({});
  const timersRef = useRef({});
  const writingRef = useRef({});
  const aliveRef = useRef(true);
  const savingContextRef = useRef({ tournament, round });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const holes = round.scorecard?.holes;
  const canEdit = tournament.status === 'in_progress' && round.status === 'in_progress';

  savingContextRef.current = { tournament, round };

  // Save one recorder/player card at a time. Revisions stop an older write
  // from marking newer edits as saved, and prevent overlapping writes.
  async function flushCard(id) {
    clearTimeout(timersRef.current[id]);
    if (writingRef.current[id]) return;
    if ((revisionRef.current[id] ?? 0) === (savedRevisionRef.current[id] ?? 0)) return;
    const { tournament: activeTournament, round: activeRound } = savingContextRef.current;
    if (activeTournament.status !== 'in_progress' || activeRound.status !== 'in_progress') return;
    writingRef.current[id] = true;
    if (aliveRef.current) setSaveStatus((s) => ({ ...s, [id]: 'saving' }));
    try {
      while ((revisionRef.current[id] ?? 0) !== (savedRevisionRef.current[id] ?? 0)) {
        const snapshotRevision = revisionRef.current[id];
        const snapshot = [...cardsRef.current[id]];
        await saveMyScoreEntry(activeTournament, activeRound, id, snapshot);
        savedRevisionRef.current[id] = snapshotRevision;
      }
      if (aliveRef.current) setSaveStatus((s) => ({ ...s, [id]: 'saved' }));
    } catch (err) {
      if (aliveRef.current) {
        setSaveStatus((s) => ({ ...s, [id]: 'error' }));
        setError(`Unable to save ${activeTournament.participants?.[id]?.displayName ?? 'player'}: ${err.message}`);
      }
    } finally {
      writingRef.current[id] = false;
    }
  }

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      // Start any pending saves when navigating away; the writes are best-effort.
      for (const id of Object.keys(timersRef.current)) {
        clearTimeout(timersRef.current[id]);
        if ((revisionRef.current[id] ?? 0) !== (savedRevisionRef.current[id] ?? 0)) void flushCard(id);
      }
    };
  // Only teardown on unmount. Tournament/round changes remount the scoring view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setCards({});
    setSaveStatus({});
    cardsRef.current = {};
    revisionRef.current = {};
    savedRevisionRef.current = {};
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    setHoleIndex(0);
    setShowSummary(false);
    Promise.all(participants.map(async ([id]) => {
      const entry = await getMyScoreEntry(tournament.id, round.id, id);
      return [id, entry?.holes ?? emptyScorecard()];
    })).then((entries) => {
      if (mounted) {
        const loaded = Object.fromEntries(entries);
        cardsRef.current = loaded;
        setCards(loaded);
      }
    }).catch((err) => {
      if (mounted) setError(err.message || 'Unable to load scorecards.');
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [tournament.id, round.id, participants]);

  // Keep the selected hole visible without changing the page's vertical scroll.
  useEffect(() => {
    const strip = holeStripRef.current;
    const selected = strip?.querySelector('[aria-current="true"]');
    if (!strip || !selected) return;
    const target = selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.offsetWidth) / 2;
    strip.scrollTo({ left: target, behavior: 'smooth' });
  }, [holeIndex]);

  function updateScore(playerId, value) {
    if (!canEdit || loading) return;
    const updatedCard = [...(cardsRef.current[playerId] ?? emptyScorecard())];
    updatedCard[holeIndex] = value;
    cardsRef.current = { ...cardsRef.current, [playerId]: updatedCard };
    setCards(cardsRef.current);
    const nextRevision = (revisionRef.current[playerId] ?? 0) + 1;
    revisionRef.current[playerId] = nextRevision;
    setSaveStatus((s) => ({ ...s, [playerId]: 'pending' }));
    setError('');
    clearTimeout(timersRef.current[playerId]);
    timersRef.current[playerId] = setTimeout(() => { void flushCard(playerId); }, 750);
  }

  if (!user || !tournament.participants?.[user.uid]) return <p>Only tournament participants can enter scores.</p>;
  if (!holes || holes.length !== 18) return <p>Configure the round scorecard first.</p>;
  if (!participants.length) return <p>No players in this tournament.</p>;

  const hole = holes[holeIndex];
  const cardFor = (id) => cards[id] ?? emptyScorecard();

  return (
    <section className="space-y-4 rounded-2xl p-3 sm:p-5" style={{ background: 'var(--bg, #F6F4EB)', color: 'var(--ink, #173D30)' }}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold, #987540)' }}>{tournament.name} · {round.name}</p>
        <h3 className="mt-1 text-2xl font-semibold">Scorecard</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted, #68796C)' }}>{showSummary ? 'Review the full round and jump back to any hole.' : 'Tap a player to record their strokes for each hole.'}</p>
        <button type="button" className="mt-3 rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--line, #E1E6DA)', background: 'var(--surface, white)' }} onClick={() => setShowSummary((value) => !value)}>{showSummary ? '← Back to score entry' : 'View full scorecard'}</button>
      </div>

      {showSummary ? (
        loading ? <p role="status">Loading scorecards…</p> : <RoundSummary tournament={tournament} round={round} participants={participants} cards={cards} onSelectHole={(index) => { setHoleIndex(index); setShowSummary(false); }} />
      ) : (<>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted, #68796C)' }}>Holes · Swipe to navigate</p>
        <div
          ref={holeStripRef}
          role="group"
          aria-label="Choose a hole"
          className="flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-2"
          style={{ touchAction: 'pan-x', scrollbarWidth: 'thin' }}
        >
          {holes.map((h, i) => {
            const recorded = participants.filter(([id]) => cardFor(id)[i] != null).length;
            const selected = holeIndex === i;
            return (
              <button
                key={h.number ?? i}
                type="button"
                aria-label={`Hole ${i + 1}, ${recorded} of ${participants.length} scores entered`}
                aria-current={selected ? 'true' : undefined}
                onClick={() => setHoleIndex(i)}
                className="relative flex h-12 w-12 shrink-0 snap-center items-center justify-center rounded-xl border text-sm font-semibold"
                style={{
                  borderColor: selected ? 'var(--primary, #173D30)' : 'var(--line, #E1E6DA)',
                  background: selected ? 'var(--primary, #173D30)' : 'var(--surface, white)',
                  color: selected ? 'var(--on-primary, white)' : 'var(--ink, #173D30)',
                }}
              >
                {i + 1}
                {recorded > 0 && (
                  <span aria-hidden="true" className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: recorded === participants.length ? 'var(--gold, #D9BA77)' : 'var(--muted, #68796C)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--muted, #68796C)' }}>Hole dots: gold = all players entered · grey = some entered · no dot = none entered.</p>

      <div className="rounded-2xl p-4 text-white" style={{ background: 'var(--primary, #173D30)' }}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="rounded-xl bg-white/15 p-3 disabled:opacity-30" aria-label="Previous hole" disabled={holeIndex === 0} onClick={() => setHoleIndex((n) => n - 1)}>‹</button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-white/70">Hole</p>
            <p className="text-3xl font-bold tabular-nums">{hole.number ?? holeIndex + 1}<span className="text-sm font-normal text-white/70"> / 18</span></p>
          </div>
          <button type="button" className="rounded-xl bg-white/15 p-3 disabled:opacity-30" aria-label="Next hole" disabled={holeIndex === 17} onClick={() => setHoleIndex((n) => n + 1)}>›</button>
        </div>
        <div className="mt-4 flex justify-center gap-10 text-center">
          <div><p className="text-xs text-white/70">PAR</p><p className="text-xl font-semibold">{hole.par}</p></div>
          <div><p className="text-xs text-white/70">STROKE INDEX</p><p className="text-xl font-semibold">{hole.strokeIndex}</p></div>
        </div>
      </div>

      {loading ? <p role="status">Loading scorecards…</p> : (
        <div className="space-y-2">
          {participants.map(([id, participant]) => {
            const strokes = cardFor(id)[holeIndex];
            const expanded = expandedPlayer === id;
            let points = null;
            let totalPoints = null;
            let completedHoles = 0;
            try {
              const handicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
              const calculated = calculateRoundStableford({ holes, scores: cardFor(id), playingHandicap: handicap });
              points = calculated.holes[holeIndex]?.points ?? null;
              totalPoints = calculated.totalPoints;
              completedHoles = calculated.completedHoles;
            } catch { /* Round handicap is not configured. */ }
            return (
              <div key={id} className="rounded-xl border p-3" style={{ background: 'var(--surface, white)', borderColor: expanded ? 'var(--primary, #173D30)' : 'var(--line, #E1E6DA)' }}>
                <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setExpandedPlayer(expanded ? '' : id)} aria-expanded={expanded}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{participant.displayName ?? 'Player'} {id === user.uid && <span className="text-xs font-normal" style={{ color: 'var(--muted, #68796C)' }}>(you)</span>}</p>
                    <p className="text-xs" style={{ color: 'var(--muted, #68796C)' }}>{points === null ? (strokes == null ? 'No score yet' : 'Points unavailable') : `${points} pts on this hole`}
                      {totalPoints !== null && ` · ${totalPoints} total pts (${completedHoles}/18)`}
                      {' · '}{saveStatus[id] === 'error' ? 'Save failed' : saveStatus[id] === 'saving' ? 'Saving…' : saveStatus[id] === 'pending' ? 'Unsaved changes' : saveStatus[id] === 'saved' ? 'Saved' : 'Ready'}</p>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-xl font-bold tabular-nums">{strokes === 'pickup' ? 'P/U' : strokes ?? '—'}</span><span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span></div>
                </button>
                {expanded && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {PRESETS.map((preset) => {
                        const value = preset.toScore(hole.par);
                        const valid = value === 'pickup' || value >= 1 && value <= 30;
                        return <button key={preset.label} type="button" disabled={!canEdit || !valid}
                          onClick={() => updateScore(id, value)}
                          className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center disabled:opacity-40"
                          aria-pressed={strokes === value}
                          style={{ background: strokes === value ? 'var(--surface-soft, #EDF0E8)' : 'var(--bg, #F6F4EB)', borderColor: strokes === value ? 'var(--primary, #173D30)' : 'var(--line, #E1E6DA)' }}>
                          <span className="text-lg leading-tight">{preset.symbol}</span><span className="text-[11px] font-semibold">{preset.label}</span>
                        </button>;
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm" style={{ color: 'var(--muted, #68796C)' }}>Adjust gross strokes</span>
                      <div className="flex items-center gap-3">
                        <button type="button" aria-label={`Remove one stroke for ${participant.displayName}`} disabled={!canEdit || strokes === 1}
                          className="h-11 w-11 rounded-xl border text-xl font-bold disabled:opacity-40" style={{ borderColor: 'var(--line, #E1E6DA)' }}
                          onClick={() => updateScore(id, typeof strokes === 'number' ? Math.max(1, strokes - 1) : Math.max(1, hole.par - 1))}>−</button>
                        <span className="w-8 text-center text-lg font-bold tabular-nums">{typeof strokes === 'number' ? strokes : '—'}</span>
                        <button type="button" aria-label={`Add one stroke for ${participant.displayName}`} disabled={!canEdit || strokes === 30}
                          className="h-11 w-11 rounded-xl border text-xl font-bold disabled:opacity-40" style={{ borderColor: 'var(--line, #E1E6DA)' }}
                          onClick={() => updateScore(id, typeof strokes === 'number' ? Math.min(30, strokes + 1) : hole.par + 1)}>+</button>
                      </div>
                    </div>
                    {canEdit && <button type="button" className="text-sm underline" style={{ color: 'var(--muted, #68796C)' }} onClick={() => updateScore(id, null)}>Clear this hole</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && !loading && (
        <div role="status" className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line, #E1E6DA)' }}>
          <p className="font-medium">Scores save automatically</p>
          <p className="mt-1" style={{ color: 'var(--muted, #68796C)' }}>
            {participants.some(([id]) => saveStatus[id] === 'error') ? 'Some changes could not be saved. Check your connection and retry.'
              : participants.some(([id]) => saveStatus[id] === 'saving') ? 'Saving scorecards…'
                : participants.some(([id]) => saveStatus[id] === 'pending') ? 'Changes waiting to save…'
                  : 'All entered scores saved.'}
          </p>
          {participants.some(([id]) => saveStatus[id] === 'error') && (
            <button type="button" className="mt-2 rounded-lg border px-3 py-2 font-semibold" onClick={() => {
              setError('');
              participants.filter(([id]) => saveStatus[id] === 'error').forEach(([id]) => { void flushCard(id); });
            }}>Retry failed saves</button>
          )}
        </div>
      )}
      {!canEdit && <p className="text-sm" role="status">Score entry is locked for this round.</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </>)}
    </section>
  );
}
