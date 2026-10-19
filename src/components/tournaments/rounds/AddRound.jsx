import { useEffect, useMemo, useState } from 'react';
import { listClubs } from '../../../repositories/courseLibraryRepository.js';
import { createRound } from '../../../repositories/roundRepository.js';

const fieldClass = 'mt-1 block min-h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-offset-2';
const fieldStyle = { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' };

export default function AddRound({ tournament, onCreated, roundNumber = 1 }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(`Round ${roundNumber}`);
  const [date, setDate] = useState(tournament.startDate || '');
  const [mode, setMode] = useState('library');
  const [courseName, setCourseName] = useState('');
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teeId, setTeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [libraryError, setLibraryError] = useState(false);

  useEffect(() => {
    let mounted = true;
    listClubs()
      .then(items => { if (mounted) setClubs(items); })
      .catch(() => { if (mounted) setLibraryError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const club = useMemo(() => clubs.find(item => item.id === clubId), [clubs, clubId]);
  const course = club?.courses?.find(item => item.id === courseId);
  const tee = course?.teeSets?.find(item => item.id === teeId);
  const librarySelection = mode === 'library' && club && course && tee ? { club, course, tee } : null;
  const par = course?.holes?.reduce((sum, hole) => sum + Number(hole.par || 0), 0);

  function nextStep() {
    if (!name.trim() || name.trim().length > 80 || !date ||
      (tournament.startDate && date < tournament.startDate) ||
      (tournament.endDate && date > tournament.endDate)) {
      setError('Enter a round name and a date within the tournament dates.');
      return;
    }
    setError('');
    setStep(1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (step === 0) { nextStep(); return; }
    if (mode === 'library' && !librarySelection) {
      setError('Choose a club, course and tee colour, or select Manual.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const roundId = await createRound(tournament, {
        name: name.trim(),
        date,
        courseName: mode === 'manual' ? courseName.trim() : undefined,
        librarySelection,
      });
      await onCreated?.({ roundId, usedLibrary: Boolean(librarySelection) });
    } catch (err) {
      setError(err?.message || 'Could not add the round.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}
      className="baggy-surface flex w-full min-w-0 max-h-[calc(100dvh-120px)] flex-col overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--line)' }}>
      <header className="shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{step === 0 ? 'Round details' : 'Course & tees'}</h2>
          <span className="baggy-muted text-xs tabular-nums">{step + 1} / 2</span>
        </div>
        <div className="mt-2 flex gap-1.5" aria-label={`Step ${step + 1} of 2`}>
          {[0, 1].map(index => (
            <span key={index} className="h-1 flex-1 rounded-full"
              style={{ background: index <= step ? 'var(--primary)' : 'var(--line)' }} />
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {step === 0 ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="round-name">Name
              <input id="round-name" required maxLength={80} value={name}
                onChange={e => setName(e.target.value)} className={fieldClass} style={fieldStyle} />
            </label>
            <label className="block text-sm font-semibold" htmlFor="round-date">Date
              <input id="round-date" type="date" required
                min={tournament.startDate || undefined} max={tournament.endDate || undefined}
                value={date} onChange={e => setDate(e.target.value)}
                className={fieldClass} style={fieldStyle} />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Course setup method">
              {[['library', 'Library'], ['manual', 'Manual']].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={mode === value}
                  onClick={() => { setMode(value); setError(''); }}
                  className="min-h-10 rounded-lg border px-2 py-2 text-sm font-semibold"
                  style={{ borderColor: mode === value ? 'var(--primary)' : 'var(--line)',
                    background: mode === value ? 'var(--surface-soft)' : 'var(--surface)' }}>
                  {label}
                </button>
              ))}
            </div>
            {mode === 'library' ? (
              <div className="space-y-2.5">
                <label className="block text-sm font-semibold" htmlFor="library-club">Club
                  <select id="library-club" className={fieldClass} style={fieldStyle} value={clubId}
                    disabled={loading} onChange={e => { setClubId(e.target.value); setCourseId(''); setTeeId(''); }}>
                    <option value="">{loading ? 'Loading…' : 'Select club'}</option>
                    {clubs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold" htmlFor="library-course">Course
                  <select id="library-course" className={fieldClass} style={fieldStyle} value={courseId}
                    disabled={!club} onChange={e => { setCourseId(e.target.value); setTeeId(''); }}>
                    <option value="">Select course</option>
                    {(club?.courses || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold" htmlFor="library-tee">Tees
                  <select id="library-tee" className={fieldClass} style={fieldStyle} value={teeId}
                    disabled={!course} onChange={e => setTeeId(e.target.value)}>
                    <option value="">Select colour</option>
                    {(course?.teeSets || []).map(item => <option key={item.id} value={item.id}>{item.color || item.name}</option>)}
                  </select>
                </label>
                {librarySelection && (
                  <p className="baggy-muted text-xs" aria-live="polite">
                    Par {par} · CR {tee.courseRating} · Slope {tee.slopeRating}
                  </p>
                )}
                {!loading && (clubs.length === 0 || libraryError) && (
                  <p className="baggy-muted text-xs">{libraryError ? 'Library unavailable.' : 'No clubs saved yet.'} Use Manual to continue.</p>
                )}
              </div>
            ) : (
              <label className="block text-sm font-semibold" htmlFor="course-name">
                Course name <span className="baggy-muted font-normal">(optional)</span>
                <input id="course-name" maxLength={120} value={courseName}
                  onChange={e => setCourseName(e.target.value)} placeholder="Enter course name"
                  className={fieldClass} style={fieldStyle} />
              </label>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t px-4 py-2.5"
        style={{ borderColor: 'var(--line)' }}>
        {step === 1 && (
          <button type="button" disabled={saving}
            onClick={() => { setStep(0); setError(''); }}
            className="min-h-11 rounded-lg border px-4 text-sm font-semibold"
            style={{ borderColor: 'var(--line)' }}>Back</button>
        )}
        <button type="submit" disabled={saving || (step === 1 && mode === 'library' && loading)}
          className="min-h-11 flex-1 rounded-lg px-4 text-sm font-bold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--on-primary, white)' }}>
          {saving ? 'Adding…' : step === 0 ? 'Continue' : 'Add round'}
        </button>
      </footer>
    </form>
  );
}
