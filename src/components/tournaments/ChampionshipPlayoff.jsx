import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { calculateHoleStableford } from '../../lib/stableford.js';
import { getHoleHandicapStrokes } from '../../lib/handicap.js';
import { evaluatePlayoff, playoffContendersAt } from '../../lib/playoffs.js';
import {
  finishPlayoffAttempt, getChampionshipPlayoff, getMajorPlayoffNeed, savePlayoffHole,
  startChampionshipPlayoff, startNextPlayoffAttempt,
} from '../../repositories/playoffRepository.js';

const actionStyle = { background: 'var(--primary)', color: 'var(--on-primary)' };
const edgeStyle = { borderColor: 'var(--line)', color: 'var(--ink)' };
const btn = 'min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50';
const formats = [{ id: 'full_round', label: 'Full 18 holes' }, { id: 'sudden_death', label: 'Sudden death' }];

export default function ChampionshipPlayoff({ tournament, rounds, onStatus }) {
  const { user } = useAuth();
  const organiser = user?.uid === tournament.createdBy;
  const [requiredPlayers, setRequiredPlayers] = useState(null);
  const [playoff, setPlayoff] = useState(null);
  const [format, setFormat] = useState('full_round');
  const [sourceRoundId, setSourceRoundId] = useState(rounds[0]?.id || '');
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [need, existing] = await Promise.all([
      getMajorPlayoffNeed(tournament, rounds), getChampionshipPlayoff(tournament.id),
    ]);
    setRequiredPlayers(need);
    setPlayoff(existing);
    onStatus?.({required: need.length > 1, status: existing?.status || null});
    return existing;
  }, [tournament, rounds, onStatus]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([getMajorPlayoffNeed(tournament, rounds), getChampionshipPlayoff(tournament.id)])
      .then(([need, existing]) => {
        if (!mounted) return;
        setRequiredPlayers(need); setPlayoff(existing); onStatus?.({required: need.length > 1, status: existing?.status || null});
        if (existing?.status === 'in_progress') {
          const outcome = evaluatePlayoff(existing);
          const firstIncomplete = existing.format === 'sudden_death'
            ? outcome.holesCompleted
            : Array.from({length: 18}, (_, i) => i).find(i => existing.playerIds.some(id => existing.scores[id][i] === null));
          setIndex(Math.min(firstIncomplete ?? 17, 17));
        }
      })
      .catch(err => { if (mounted) setError(err.message || 'Could not load playoff.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [tournament, rounds, onStatus]);

  const evaluation = useMemo(() => {
    if (!playoff) return null;
    try { return evaluatePlayoff(playoff); } catch { return null; }
  }, [playoff]);
  const eligible = useMemo(() => playoff ? playoffContendersAt(playoff, index) : [], [playoff, index]);
  const hole = playoff?.scorecard?.holes?.[index];
  const currentIndex = playoff ? Math.min(index, 17) : 0;
  const needed = requiredPlayers?.length > 1;

  function moveHole(next) {
    if (!playoff || next < 0 || next > 17) return;
    setIndex(next);
    setDraft({});
    setError('');
  }

  async function run(action) {
    setBusy(true); setError('');
    try { await action(); await reload(); }
    catch (err) { setError(err.message || 'Playoff action failed.'); }
    finally { setBusy(false); }
  }

  if (loading) return <section className="baggy-surface rounded-xl p-3 text-sm baggy-muted">Checking championship playoff…</section>;
  if (requiredPlayers && !needed && !playoff && !error) return null;

  const isSetup = !playoff || playoff.status === 'tied';
  const champions = (playoff?.status === 'completed' && evaluation?.winnerId) ? [evaluation.winnerId] : [];
  const playerName = id => tournament.participants?.[id]?.displayName || 'Player';

  async function saveHole() {
    if (!playoff) return;
    const values = {};
    for (const id of eligible) {
      const entered = Object.hasOwn(draft, id) ? draft[id] : playoff.scores[id][currentIndex];
      const val = entered === 'pickup' ? 'pickup' : entered === '' || entered === null ? null : Number(entered);
      if (val === null || !(val === 'pickup' && playoff.format === 'full_round') &&
          !(Number.isInteger(val) && val >= 1 && val <= 30)) {
        setError(`Enter a valid gross score for ${playerName(id)}.`);
        return;
      }
      values[id] = val;
    }
    await run(async () => {
      await savePlayoffHole(tournament.id, currentIndex, values);
      const updated = await getChampionshipPlayoff(tournament.id);
      setPlayoff(updated);
      setDraft({});
      const outcome = evaluatePlayoff(updated);
      if (currentIndex < 17 && !outcome.complete &&
          (updated.format === 'full_round' || outcome.holesCompleted > currentIndex)) setIndex(currentIndex + 1);
    });
  }

  return (
    <section className="baggy-surface space-y-3 rounded-xl p-3 sm:p-4" aria-label="Major championship playoff">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold">Championship playoff</h2>
          <p className="baggy-muted text-xs">{isSetup ? 'Resolve the tie for first place' : playoff.format === 'full_round' ? '18-hole Stableford' : 'Net-stroke sudden death'}{playoff?.attempt > 1 ? ` · Attempt ${playoff.attempt}` : ''}</p>
        </div>
        {playoff?.status === 'completed' && <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--gold)' }}>Winner confirmed</span>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {needed && <p className="text-sm" style={{ color: 'var(--ink)' }}>
        {(isSetup && playoff?.status === 'tied' ? evaluation?.tiedIds : playoff?.playerIds || requiredPlayers).map(playerName).join(' · ')}
      </p>}
      {isSetup && organiser && needed && (
        <div className="space-y-3">
          {playoff?.status === 'tied' && <p className="baggy-muted text-xs">That attempt was tied. Previous scores are preserved; choose the next playoff.</p>}
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Playoff format">
            {formats.map(item => <button key={item.id} type="button" aria-pressed={format === item.id}
              onClick={() => setFormat(item.id)} className={`${btn} border px-2`} style={format === item.id ? { ...actionStyle, borderColor: 'var(--primary)' } : edgeStyle}>{item.label}</button>)}
          </div>
          <label className="block text-xs font-medium" style={{color: 'var(--muted)'}}>Course for playoff
            <select value={sourceRoundId} onChange={event => setSourceRoundId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border px-3 text-sm" style={{...edgeStyle, background:'var(--surface)'}}>
              {rounds.filter(round => round.scorecard?.holes?.length === 18).map(round => <option key={round.id} value={round.id}>{round.courseName || round.name}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy || !sourceRoundId} onClick={() => run(async () => {
            if (playoff?.status === 'tied') await startNextPlayoffAttempt(tournament.id, { format, sourceRoundId });
            else await startChampionshipPlayoff(tournament.id, { format, sourceRoundId });
            setIndex(0); setDraft({});
          })} className={`${btn} w-full`} style={actionStyle}>{busy ? 'Starting…' : playoff ? 'Start next playoff' : 'Start playoff'}</button>
        </div>
      )}
      {playoff?.status === 'in_progress' && evaluation && hole && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-lg p-2" style={{background:'var(--surface-soft)'}}>
            <button type="button" onClick={() => moveHole(index - 1)} disabled={index === 0} className="min-h-10 min-w-11 text-xl disabled:opacity-30" aria-label="Previous playoff hole">‹</button>
            <div className="text-center"><p className="text-sm font-bold">Hole {index + 1} <span className="baggy-muted font-normal">/ 18</span></p><p className="baggy-muted text-xs">Par {hole.par} · SI {hole.strokeIndex}</p></div>
            <button type="button" onClick={() => moveHole(index + 1)} disabled={index === 17 || (playoff.format === 'sudden_death' && (index >= evaluation.holesCompleted || evaluation.winnerId))} className="min-h-10 min-w-11 text-xl disabled:opacity-30" aria-label="Next playoff hole">›</button>
          </div>
          <div className="space-y-2">
            {eligible.map(id => {
              const recorded = playoff.scores[id][index];
              const entry = Object.hasOwn(draft, id) ? draft[id] : recorded;
              const point = recorded == null ? null : calculateHoleStableford({ grossStrokes: recorded, par: hole.par, strokeIndex: hole.strokeIndex, playingHandicap: playoff.playingHandicaps[id] });
              const net = Number.isInteger(recorded) ? recorded - getHoleHandicapStrokes(playoff.playingHandicaps[id], hole.strokeIndex) : null;
              return <div key={id} className="flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2" style={edgeStyle}>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{playerName(id)}</p><p className="baggy-muted text-[11px]">PH {playoff.playingHandicaps[id]}{playoff.format === 'full_round' ? ` · ${evaluation.totals[id].totalPoints} pts total` : point != null ? ` · Net ${net}` : ''}</p></div>
                {organiser && <input type="number" min="1" max="30" inputMode="numeric" aria-label={`${playerName(id)} gross strokes on hole ${index + 1}`} value={entry === 'pickup' ? '' : entry ?? ''}
                  onChange={event => setDraft(prev => ({ ...prev, [id]: event.target.value }))}
                  className="h-11 w-16 rounded-lg border text-center text-lg font-bold tabular-nums" style={{...edgeStyle,background:'var(--surface)'}} />}
                {!organiser && <strong className="text-lg tabular-nums">{recorded ?? '—'}</strong>}
                {organiser && playoff.format === 'full_round' && <button type="button" onClick={() => setDraft(prev => ({...prev, [id]: entry === 'pickup' ? '' : 'pickup'}))}
                  aria-pressed={entry === 'pickup'} className="min-h-11 rounded-md px-2 text-xs font-semibold" style={{background: entry === 'pickup' ? 'var(--primary)' : 'var(--surface-soft)', color: entry === 'pickup' ? 'var(--on-primary)' : 'var(--ink)'}}>Pickup</button>}
              </div>;
            })}
          </div>
          {organiser && <button type="button" disabled={busy} onClick={saveHole} className={`${btn} w-full`} style={actionStyle}>{busy ? 'Saving…' : 'Save hole →'}</button>}
          <p className="baggy-muted text-center text-xs">{playoff.format === 'full_round' ? `${evaluation.holesCompleted}/18 holes completed` : evaluation.winnerId ? 'A winner has emerged' : `${evaluation.holesCompleted} holes decided or tied`}</p>
          {organiser && evaluation.complete && <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(evaluation.winnerId ? `Confirm ${playerName(evaluation.winnerId)} as Major champion?` : 'Confirm this playoff was tied and arrange another?')) run(() => finishPlayoffAttempt(tournament.id));
          }} className={`${btn} w-full border`} style={edgeStyle}>{evaluation.winnerId ? 'Confirm playoff winner' : 'Finish tied attempt'}</button>}
        </div>
      )}
      {playoff?.status === 'completed' && champions.length > 0 && (
        <div className="rounded-lg p-3 text-center" style={{background:'var(--surface-soft)'}}><p className="text-xs font-semibold" style={{color:'var(--gold)'}}>★ PLAYOFF WINNER</p><p className="mt-1 font-bold">{playerName(champions[0])}</p><p className="baggy-muted text-xs">Ready to complete the Major</p></div>
      )}
      {playoff?.status === 'tied' && !organiser && <p className="baggy-muted text-sm">Awaiting the next championship playoff.</p>}
      {!needed && !playoff && error && <button className={`${btn} border`} style={edgeStyle} onClick={() => { setError(''); setLoading(true); reload().catch(e=>setError(e.message)).finally(()=>setLoading(false)); }}>Retry</button>}
    </section>
  );
}
