import { useEffect, useMemo, useState } from 'react';
import { listClubs } from '../../../repositories/courseLibraryRepository.js';
import { createRound } from '../../../repositories/roundRepository.js';

const fieldClass = 'w-full min-w-0 rounded-lg border border-baggygolf-line bg-baggygolf-surface p-3';

export default function AddRound({ tournament, onCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [mode, setMode] = useState('library');
  const [courseName, setCourseName] = useState('');
  const [clubs, setClubs] = useState([]);
  const [clubId, setClubId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teeId, setTeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    listClubs().then(items => { if (mounted) setClubs(items); })
      .catch(() => { if (mounted) setError('Unable to load the course library. You can use manual setup instead.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const club = useMemo(() => clubs.find(item => item.id === clubId), [clubs, clubId]);
  const course = club?.courses?.find(item => item.id === courseId);
  const tee = course?.teeSets?.find(item => item.id === teeId);
  const librarySelection = mode === 'library' && club && course && tee ? { club, course, tee } : null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    if (mode === 'library' && !librarySelection) {
      setError('Choose a club, course and tee set, or switch to manual setup.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createRound(tournament, {
        name, date,
        courseName: mode === 'manual' ? courseName : undefined,
        librarySelection,
      });
      setName(''); setDate(''); setCourseName('');
      await onCreated?.();
    } catch (err) {
      setError(err?.message || 'Could not create the round.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-baggygolf-line bg-baggygolf-surface p-5">
      <h3 className="text-lg font-semibold text-baggygolf-950">Add round</h3>
      <div>
        <label htmlFor="round-name" className="mb-1 block text-sm font-medium">Round name</label>
        <input id="round-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Round 1" className={fieldClass} />
      </div>
      <div>
        <label htmlFor="round-date" className="mb-1 block text-sm font-medium">Date</label>
        <input id="round-date" type="date" required min={tournament.startDate} max={tournament.endDate} value={date} onChange={e => setDate(e.target.value)} className={fieldClass} />
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-semibold">Course setup</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="course-mode" checked={mode === 'library'} onChange={() => setMode('library')} /> Course library</label>
          <label className="flex items-center gap-2"><input type="radio" name="course-mode" checked={mode === 'manual'} onChange={() => setMode('manual')} /> Manual setup</label>
        </div>
        {mode === 'library' ? (
          <div className="space-y-3">
            <div><label htmlFor="library-club" className="mb-1 block text-sm font-medium">Club</label>
              <select id="library-club" className={fieldClass} value={clubId} disabled={loading} onChange={e => { setClubId(e.target.value); setCourseId(''); setTeeId(''); }}>
                <option value="">{loading ? 'Loading clubs…' : 'Select club'}</option>
                {clubs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div><label htmlFor="library-course" className="mb-1 block text-sm font-medium">Course</label>
              <select id="library-course" className={fieldClass} value={courseId} disabled={!club} onChange={e => { setCourseId(e.target.value); setTeeId(''); }}>
                <option value="">Select course</option>
                {(club?.courses || []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div><label htmlFor="library-tee" className="mb-1 block text-sm font-medium">Tee set</label>
              <select id="library-tee" className={fieldClass} value={teeId} disabled={!course} onChange={e => setTeeId(e.target.value)}>
                <option value="">Select tee set</option>
                {(course?.teeSets || []).map(item => <option key={item.id} value={item.id}>{item.name} · CR {item.courseRating} · Slope {item.slopeRating}</option>)}
              </select>
            </div>
            {librarySelection && <p className="rounded-lg p-3 text-sm" style={{ background: 'var(--surface-soft)' }}>
              <strong>{club.name} · {course.name} · {tee.name}</strong><br />
              {course.holes?.length || 0} holes · Par {course.holes?.reduce((sum, h) => sum + Number(h.par), 0)} · CR {tee.courseRating} · Slope {tee.slopeRating}
              <span className="mt-1 block text-xs opacity-75">A snapshot of this course and tee set will be saved with the round.</span>
            </p>}
            {!loading && clubs.length === 0 && <p className="text-sm opacity-75">No clubs yet. Add a course in the library, or use manual setup.</p>}
          </div>
        ) : (
          <div>
            <label htmlFor="course-name" className="mb-1 block text-sm font-medium">Course name (optional)</label>
            <input id="course-name" maxLength={120} value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" className={fieldClass} />
            <p className="mt-1 text-xs text-baggygolf-muted">You'll enter the 18 holes and tee ratings after adding the round.</p>
          </div>
        )}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving || loading && mode === 'library'} className="rounded-lg bg-baggygolf-primary px-5 py-3 font-semibold text-white disabled:opacity-50">
        {saving ? 'Adding round…' : 'Add round'}
      </button>
    </form>
  );
}
