import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import RoundSummary from './RoundSummary.jsx';
import { getRoundPlayingHandicap, getHoleHandicapStrokes } from '../../lib/handicap.js';
import { calculateRoundStableford } from '../../lib/stableford.js';
import { emptyScorecard, getMyScoreEntry, saveMyScoreEntry } from '../../repositories/scoreEntryRepository.js';

export default function ScoreEntry({ tournament, round }) {
  const { user } = useAuth();
  const participants = useMemo(() => Object.entries(tournament.participants ?? {}), [tournament.participants]);
  const [holeIndex, setHoleIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const holeStripRef = useRef(null);
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

  const recordedCount = participants.filter(([id]) => cardFor(id)[holeIndex] != null).length;
  const statuses = participants.map(([id]) => saveStatus[id]);
  const savingMessage = statuses.includes('error') ? 'Save failed' : statuses.includes('saving') ? 'Saving…' : statuses.includes('pending') ? 'Unsaved changes' : 'Saved';

  return (
    <section
      className={showSummary ? 'space-y-3 rounded-2xl p-2 sm:p-4' : 'flex min-h-0 flex-col gap-2 rounded-2xl p-2 sm:gap-3 sm:p-4'}
      style={{
        background: 'var(--bg, #F6F4EB)',
        color: 'var(--ink, #173D30)',
        // Account for the app header, main padding and fixed mobile bottom nav.
        // Every participant count shares the same available height.
        ...(showSummary ? {} : { height: 'calc(100dvh - 190px)', minHeight: '280px' }),
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--gold, #987540)' }}>{tournament.name} · {round.name}</p>
          <h3 className="text-xl font-semibold">Scorecard</h3>
        </div>
        <button type="button" className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--line, #E1E6DA)', background: 'var(--surface, white)' }} onClick={() => setShowSummary((value) => !value)}>{showSummary ? '← Scores' : 'Full card'}</button>
      </div>

      {showSummary ? (
        loading ? <p role="status">Loading scorecards…</p> : <RoundSummary tournament={tournament} round={round} participants={participants} cards={cards} onSelectHole={(index) => { setHoleIndex(index); setShowSummary(false); }} />
      ) : (<>
        <div ref={holeStripRef} role="group" aria-label="Choose a hole" className="flex w-full shrink-0 snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain pb-1" style={{ touchAction: 'pan-x', scrollbarWidth: 'none' }}>
          {holes.map((h, i) => {
            const recorded = participants.filter(([id]) => cardFor(id)[i] != null).length;
            const selected = holeIndex === i;
            return (
              <button key={h.number ?? i} type="button" aria-label={`Hole ${i + 1}, ${recorded} of ${participants.length} scores entered`} aria-current={selected ? 'true' : undefined} onClick={() => setHoleIndex(i)}
                className="relative flex h-10 w-10 shrink-0 snap-center items-center justify-center rounded-lg border text-sm font-semibold"
                style={{ borderColor: selected ? 'var(--primary, #173D30)' : 'var(--line, #E1E6DA)', background: selected ? 'var(--primary, #173D30)' : 'var(--surface, white)', color: selected ? 'var(--on-primary, white)' : 'var(--ink, #173D30)' }}>
                {i + 1}
                {recorded > 0 && <span aria-hidden="true" className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style={{ background: recorded === participants.length ? 'var(--gold, #D9BA77)' : 'var(--muted, #68796C)' }} />}
              </button>
            );
          })}
        </div>

        {loading ? <p role="status">Loading scorecards…</p> : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border" style={{ background: 'var(--surface, white)', borderColor: 'var(--line, #E1E6DA)' }}>
            <div className="flex shrink-0 items-center justify-between px-3 py-4 sm:py-5" style={{ background: 'var(--primary, #173D30)', color: 'var(--on-primary, #FFFFFF)' }}>
              <button type="button" aria-label="Previous hole" disabled={holeIndex === 0} onClick={() => setHoleIndex((n) => n - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xl disabled:opacity-30">‹</button>
              <div className="text-center">
                <p className="text-2xl font-bold leading-tight">Hole {hole.number ?? holeIndex + 1} <span className="text-sm font-normal opacity-75">/ 18</span></p>
                <p className="mt-1 text-xs opacity-80">Par {hole.par} · SI {hole.strokeIndex} · {recordedCount}/{participants.length} entered</p>
              </div>
              <button type="button" aria-label="Next hole" disabled={holeIndex === 17} onClick={() => setHoleIndex((n) => n + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-xl disabled:opacity-30">›</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {participants.map(([id, participant], playerIndex) => {
              const strokes = cardFor(id)[holeIndex];
              let points = null;
              let shotsReceived = null;
              try {
                const handicap = getRoundPlayingHandicap(participant, tournament.handicapMode, round);
                shotsReceived = getHoleHandicapStrokes(handicap, hole.strokeIndex);
                points = calculateRoundStableford({ holes, scores: cardFor(id), playingHandicap: handicap }).holes[holeIndex]?.points ?? null;
              } catch { /* Handicap not configured yet. */ }
              const name = participant.displayName ?? 'Player';
              const pickedUp = strokes === 'pickup';
              return (
                <div key={id} className={`flex min-h-[74px] min-w-0 flex-1 items-center gap-2 px-3 py-2 ${playerIndex ? 'border-t' : ''}`} style={{ borderColor: 'var(--line, #E1E6DA)' }}>
                  <div className="min-w-0 flex-1 self-stretch flex flex-col justify-center gap-1.5">
                    <p className="truncate text-[13px] leading-tight font-semibold" title={name}>{name}</p>
                    <div className="flex h-2 items-center gap-1" title={shotsReceived == null ? 'Handicap shots unavailable' : `${shotsReceived} handicap strokes on this hole`} aria-label={shotsReceived == null ? 'Handicap strokes unavailable' : `${shotsReceived} handicap strokes on this hole`}>
                      {shotsReceived != null && shotsReceived > 0 && Array.from({ length: Math.min(shotsReceived, 5) }, (_, n) => (
                        <span key={n} aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--primary, #173D30)' }} />
                      ))}
                      {shotsReceived != null && shotsReceived < 0 && <span className="text-[10px]" style={{ color: 'var(--muted, #68796C)' }}>+{Math.abs(shotsReceived)}</span>}
                      {shotsReceived != null && shotsReceived > 5 && <span className="text-[10px]">+{shotsReceived - 5}</span>}
                    </div>
                    <button type="button" disabled={!canEdit} aria-pressed={pickedUp} aria-label={`${pickedUp ? 'Undo pickup' : 'Pick up'} for ${name}`}
                      onClick={() => updateScore(id, pickedUp ? null : 'pickup')}
                      className="mt-1.5 w-fit rounded-md border px-3 py-1.5 text-left text-[11px] font-medium leading-tight transition-colors disabled:opacity-40"
                      style={{ color: pickedUp ? 'var(--on-primary, white)' : 'var(--muted, #68796C)', background: pickedUp ? 'var(--primary, #173D30)' : 'var(--surface-soft, #EDF0E8)', borderColor: pickedUp ? 'var(--primary, #173D30)' : 'var(--line, #E1E6DA)' }}>
                      {pickedUp ? 'Picked up' : 'Pick up'}
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                    <button type="button" aria-label={`Remove one stroke for ${name}`} disabled={!canEdit || strokes === 1}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-semibold disabled:opacity-35" style={{ background: 'var(--surface-soft, #EDF0E8)' }}
                      onClick={() => updateScore(id, typeof strokes === 'number' ? Math.max(1, strokes - 1) : Math.max(1, hole.par - 1))}>−</button>
                    <span aria-live="polite" className="mx-1.5 flex h-11 min-w-10 items-center justify-center text-center text-xl font-extrabold tabular-nums sm:mx-2 sm:min-w-11 sm:text-2xl" style={{ color: 'var(--ink, #173D30)' }}>{pickedUp ? 'P/U' : strokes ?? '—'}</span>
                    <button type="button" aria-label={`Add one stroke for ${name}`} disabled={!canEdit || strokes === 30}
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xl font-semibold disabled:opacity-35" style={{ background: 'var(--surface-soft, #EDF0E8)' }}
                      onClick={() => updateScore(id, typeof strokes === 'number' ? Math.min(30, strokes + 1) : hole.par)}>+</button>
                    <div className="flex h-12 w-10 shrink-0 flex-col items-center justify-center text-center sm:w-11" style={{ color: 'var(--ink, #173D30)' }} aria-label={points == null ? 'Points not yet available' : `${points} Stableford points`}>
                      <p className="text-xl leading-none font-extrabold tabular-nums sm:text-2xl">{points ?? '—'}</p>
                      <p className="mt-1 text-[10px] font-semibold opacity-80">pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Keep ordinary save progress out of the layout, but announce it to assistive tech. */}
        <span className="sr-only" role="status" aria-live="polite">{canEdit ? savingMessage : 'Score entry locked'}</span>
        {statuses.includes('error') && (
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-2 py-1.5 text-xs text-red-800" role="alert">
            <span>Scores not saved</span>
            <button type="button" className="rounded-md border border-red-400 px-2 py-1 font-semibold" onClick={() => { setError(''); participants.filter(([id]) => saveStatus[id] === 'error').forEach(([id]) => { void flushCard(id); }); }}>Retry</button>
          </div>
        )}
        {error && <p role="alert" className="shrink-0 text-xs text-red-600">{error}</p>}
      </>)}
    </section>
  );
}
