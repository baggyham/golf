import { useEffect, useMemo, useState } from 'react';
import { saveRoundScorecard, saveRoundTeeRatings } from '../../../repositories/roundRepository.js';
import { validateScorecard } from '../../../lib/scorecardValidation.js';

const inputClass = 'min-h-10 w-full min-w-0 rounded-lg border px-2 py-2 text-center text-sm font-semibold tabular-nums outline-offset-2';
const fieldStyle = { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' };

function initialHoles(round) {
  return Array.from({ length: 18 }, (_, index) => {
    const saved = round.scorecard?.holes?.[index];
    return {
      number: index + 1,
      par: saved?.par ?? 4,
      strokeIndex: saved?.strokeIndex ?? index + 1,
    };
  });
}

const totalPar = (holes, start, end) => holes.slice(start, end).reduce((sum, hole) => sum + Number(hole.par || 0), 0);

function NinePanel({ start, holes, nine, saving, counts, setHole }) {
    const sum = totalPar(holes, start, start + 9);
    return (
      <section className={`${nine === start ? 'block' : 'hidden'} min-w-0 overflow-hidden rounded-xl border md:block`} style={{ borderColor: 'var(--line)' }} aria-label={start === 0 ? 'Front nine' : 'Back nine'}>
        <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ background: 'var(--surface-soft)', borderColor: 'var(--line)' }}>
          <h3 className="text-sm font-bold">{start === 0 ? 'Front nine' : 'Back nine'}</h3>
          <span className="baggy-muted text-xs">Par {sum}</span>
        </div>
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wide baggy-muted">
          <span>Hole</span><span className="text-center">Par</span><span className="text-center">SI</span>
        </div>
        {holes.slice(start, start + 9).map((hole, offset) => {
          const index = start + offset;
          const bad = !Number.isInteger(hole.strokeIndex) || hole.strokeIndex < 1 || hole.strokeIndex > 18 || counts[hole.strokeIndex] > 1;
          return (
            <div key={hole.number} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-3 border-t px-3 py-1.5" style={{ borderColor: 'var(--line)' }}>
              <span className="font-semibold tabular-nums">{hole.number}</span>
              <select aria-label={`Hole ${hole.number} par`} className={inputClass} style={fieldStyle} value={hole.par} disabled={saving} onChange={event => setHole(index, 'par', event.target.value)}>
                {[3, 4, 5, 6].map(value => <option key={value} value={value}>{value}</option>)}
              </select>
              <select aria-label={`Hole ${hole.number} stroke index`} aria-invalid={bad} className={inputClass} style={{ ...fieldStyle, borderColor: bad ? 'var(--danger, #bf5849)' : 'var(--line)' }} value={hole.strokeIndex} disabled={saving} onChange={event => setHole(index, 'strokeIndex', event.target.value)}>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          );
        })}
      </section>
    );
  }


/** Dedicated draft-round editor: one scorecard, one save action. */
export default function RoundSetupEditor({ tournament, round, onSaved }) {
  const [holes, setHoles] = useState(() => initialHoles(round));
  const [nine, setNine] = useState(0);
  const [courseRating, setCourseRating] = useState(String(round.teeRatings?.courseRating ?? ''));
  const [slopeRating, setSlopeRating] = useState(String(round.teeRatings?.slopeRating ?? ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setHoles(initialHoles(round));
    setNine(0);
    setCourseRating(String(round.teeRatings?.courseRating ?? ''));
    setSlopeRating(String(round.teeRatings?.slopeRating ?? ''));
    setError('');
  }, [round.id]);

  const counts = useMemo(() => {
    const occurrences = {};
    holes.forEach(hole => { const si = Number(hole.strokeIndex); occurrences[si] = (occurrences[si] || 0) + 1; });
    return occurrences;
  }, [holes]);
  const missing = Array.from({ length: 18 }, (_, index) => index + 1).filter(value => !counts[value]);
  const invalidIndices = holes.some(hole => !Number.isInteger(hole.strokeIndex) || hole.strokeIndex < 1 || hole.strokeIndex > 18 || counts[hole.strokeIndex] > 1);
  const needsRatings = tournament.handicapMode === 'course';
  const rating = Number(courseRating);
  const slope = Number(slopeRating);
  const ratingsValid = !needsRatings || (
    courseRating.trim() !== '' && slopeRating.trim() !== '' &&
    Number.isFinite(rating) && rating >= 50 && rating <= 90 &&
    Number.isInteger(slope) && slope >= 55 && slope <= 155
  );

  function setHole(index, field, value) {
    setHoles(current => current.map((hole, holeIndex) =>
      holeIndex === index ? { ...hole, [field]: Number(value) } : hole
    ));
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    if (saving || round.status !== 'draft') return;
    try {
      validateScorecard(holes);
      if (!ratingsValid) throw new Error('Enter a Course Rating (50–90) and Slope Rating (55–155).');
    } catch (err) {
      setError(err.message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Save separately using the existing validated, organiser-only Firestore actions.
      await saveRoundScorecard(tournament, round.id, holes);
      if (needsRatings) await saveRoundTeeRatings(tournament, round.id, { courseRating, slopeRating });
      await onSaved?.();
    } catch (err) {
      setError(err.message || 'Could not save round. Your edits are still here; please retry.');
    } finally {
      setSaving(false);
    }
  }


  return (
    <form onSubmit={save} className="baggy-surface flex w-full min-w-0 max-h-[calc(100dvh-120px)] flex-col overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)' }}>
      <header className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
        <p className="baggy-gold text-[11px] font-bold uppercase tracking-widest">Round setup</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-lg font-bold">{round.name}</h2>
          <span className="baggy-muted shrink-0 text-xs">{round.date}</span>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="grid grid-cols-3 gap-2" aria-label="Round par totals">
          {[['OUT', totalPar(holes, 0, 9)], ['IN', totalPar(holes, 9, 18)], ['TOTAL', totalPar(holes, 0, 18)]].map(([label, value]) => (
            <div key={label} className="rounded-xl border px-2 py-2 text-center" style={{ background: 'var(--surface-soft)', borderColor: 'var(--line)' }}>
              <p className="baggy-muted text-[10px] font-bold tracking-wider">{label}</p>
              <p className="text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:hidden" role="group" aria-label="Choose nine holes">
          {[[0, 'Front nine'], [9, 'Back nine']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={nine === value} onClick={() => setNine(value)} className="min-h-10 rounded-lg border px-2 text-sm font-semibold" style={{ borderColor: nine === value ? 'var(--primary)' : 'var(--line)', background: nine === value ? 'var(--surface-soft)' : 'var(--surface)' }}>{label}</button>
          ))}
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          <NinePanel start={0} holes={holes} nine={nine} saving={saving} counts={counts} setHole={setHole} />
          <NinePanel start={9} holes={holes} nine={nine} saving={saving} counts={counts} setHole={setHole} />
        </div>
        {invalidIndices && <p role="alert" className="text-sm" style={{ color: 'var(--danger, #b45349)' }}>Stroke indexes must be unique from 1–18.{missing.length > 0 ? ` Missing: ${missing.join(', ')}.` : ''}</p>}
        {needsRatings && (
          <section className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
            <h3 className="mb-2 text-sm font-bold">Tee ratings</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold">Course rating
                <input className={`${inputClass} mt-1`} style={fieldStyle} type="number" step="0.1" min="50" max="90" inputMode="decimal" required value={courseRating} disabled={saving} onChange={event => setCourseRating(event.target.value)} />
              </label>
              <label className="text-xs font-semibold">Slope rating
                <input className={`${inputClass} mt-1`} style={fieldStyle} type="number" step="1" min="55" max="155" inputMode="numeric" required value={slopeRating} disabled={saving} onChange={event => setSlopeRating(event.target.value)} />
              </label>
            </div>
          </section>
        )}
        {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger, #b45349)' }}>{error}</p>}
      </div>
      <footer className="flex shrink-0 gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--line)' }}>
        <button type="submit" disabled={saving || invalidIndices || !ratingsValid} className="min-h-11 min-w-0 flex-1 rounded-lg px-4 text-sm font-bold disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>{saving ? 'Saving…' : 'Save round'}</button>
      </footer>
    </form>
  );
}
