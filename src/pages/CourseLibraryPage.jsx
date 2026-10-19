import { useCallback, useEffect, useState } from 'react';
import { emptyHoles } from '../lib/courseLibrary.js';
import { listClubs, saveClub, removeClub, saveCourse, removeCourse, saveTee, removeTee } from '../repositories/courseLibraryRepository.js';

const input = 'min-h-11 w-full rounded-xl border px-3 py-2';
const button = 'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold';
const surface = { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' };
function CourseHolesEditor({ holes, onChange }) {
  const indexes = holes.map(h => Number(h.strokeIndex));
  const indexCounts = indexes.reduce((counts, value) => {
    if (Number.isInteger(value) && value >= 1 && value <= 18) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
  const missing = Array.from({ length: 18 }, (_, i) => i + 1).filter(n => !indexCounts[n]);
  const parTotal = (start, end) => holes.slice(start, end).reduce((sum, h) => sum + (Number(h.par) || 0), 0);
  const update = (index, field, value) => onChange(holes.map((h, i) => i === index ? { ...h, [field]: value } : h));
  return <div className="space-y-4">
    <p className="baggy-muted text-sm">Enter par and stroke index for each hole, using the course scorecard. Stroke indexes must use 1–18 exactly once.</p>
    <div className="grid grid-cols-3 gap-2" aria-label="Course par totals">
      {[['OUT', parTotal(0, 9)], ['IN', parTotal(9, 18)], ['TOTAL', parTotal(0, 18)]].map(([label, value]) =>
        <div key={label} className="rounded-xl border px-2 py-3 text-center" style={{ borderColor: 'var(--line)', background: 'var(--surface-alt, var(--surface))' }}>
          <div className="baggy-muted text-[11px] font-bold uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        </div>
      )}
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 9].map(start => <section key={start} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between px-3 py-3" style={{ background: 'var(--surface-alt, var(--surface))', borderBottom: '1px solid var(--line)' }}>
          <h3 className="text-sm font-bold">{start === 0 ? 'Front nine' : 'Back nine'}</h3>
          <span className="baggy-muted text-xs font-semibold">Par {parTotal(start, start + 9)}</span>
        </div>
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-2 px-3 py-2 text-xs font-bold uppercase tracking-wide baggy-muted">
          <span>Hole</span><span>Par</span><span>SI</span>
        </div>
        {holes.slice(start, start + 9).map((hole, localIndex) => {
          const i = start + localIndex;
          const si = Number(hole.strokeIndex);
          const repeated = indexCounts[si] > 1;
          const invalid = !Number.isInteger(si) || si < 1 || si > 18 || repeated;
          return <div key={i} className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-2 border-t px-3 py-1.5" style={{ borderColor: 'var(--line)' }}>
            <span className="text-sm font-bold tabular-nums">{i + 1}</span>
            <input aria-label={`Hole ${i + 1} par`} type="number" inputMode="numeric" min="3" max="6" required className={`${input} text-center tabular-nums`} style={surface} value={hole.par} onChange={e => update(i, 'par', e.target.value)} />
            <input aria-label={`Hole ${i + 1} stroke index`} aria-invalid={invalid} type="number" inputMode="numeric" min="1" max="18" required className={`${input} text-center tabular-nums`} style={{ ...surface, borderColor: invalid ? 'var(--danger, #b45349)' : 'var(--line)' }} value={hole.strokeIndex} onChange={e => update(i, 'strokeIndex', e.target.value)} />
          </div>;
        })}
      </section>)}
    </div>
    {missing.length > 0 && <p role="status" className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)' }}>Missing SI: <strong>{missing.join(', ')}</strong>{Object.values(indexCounts).some(n => n > 1) ? ' · Highlighted SI values are repeated.' : ''}</p>}
    {missing.length === 0 && <p role="status" className="baggy-muted text-sm">All 18 stroke indexes assigned.</p>}
  </div>;
}

const commonTeeColours = ['White', 'Yellow', 'Red'];
const lessCommonTeeColours = ['Blue', 'Black'];
const teeColours = [...commonTeeColours, ...lessCommonTeeColours];
const blankTee = { colour: 'White', courseRating: '', slopeRating: '', yardage: '' };
const primaryButton = { background: 'var(--primary)', color: 'var(--on-primary)' };
const teeSwatches = { White: '#f6f5f0', Yellow: '#e4bf46', Red: '#d65354', Blue: '#477cc2', Black: '#22282a' };

export default function CourseLibraryPage({ onBack }) {
  const [clubs, setClubs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const reload = useCallback(async () => { setClubs(await listClubs()); }, []);
  useEffect(() => {
    let active = true;
    listClubs().then(data => { if (active) setClubs(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  const selectedClub = clubs.find(c => c.id === selectedClubId);
  const selectedCourse = selectedClub?.courses?.find(c => c.id === selectedCourseId);
  const editorClub = clubs.find(c => c.id === editor?.clubId);
  const editorCourse = editorClub?.courses?.find(c => c.id === editor?.courseId);

  async function commit(action, afterSuccess) {
    setBusy(true);
    setError('');
    try {
      await action();
      await reload();
      setEditor(null);
      afterSuccess?.();
    } catch (e) {
      setError(e.message || 'Could not save changes.');
    } finally {
      setBusy(false);
    }
  }

  function deleteEditingItem() {
    if (!editor?.id || busy) return;
    const { type, id, clubId, courseId } = editor;
    const name = editor.fields?.name || editor.fields?.colour || type;
    if (!window.confirm(`Delete ${name}? This cannot be undone. Existing tournaments will not be modified.`)) return;
    if (type === 'club') {
      commit(() => removeClub(id), () => { setSelectedClubId(null); setSelectedCourseId(null); });
    } else if (type === 'course') {
      commit(() => removeCourse(clubId, id), () => setSelectedCourseId(null));
    } else {
      commit(() => removeTee(clubId, courseId, id));
    }
  }

  const openClubEditor = (club) => setEditor({
    type: 'club',
    id: club?.id,
    fields: { name: club?.name || '', location: club?.location || '' },
  });
  const openCourseEditor = (course) => setEditor({
    type: 'course', clubId: selectedClub.id, id: course?.id,
    fields: { name: course?.name || '', holes: course?.holes?.map(h => ({ ...h })) || emptyHoles() },
  });
  const openTeeEditor = (tee) => setEditor({
    type: 'tee', clubId: selectedClub.id, courseId: selectedCourse.id, id: tee?.id,
    fields: tee ? { ...tee } : { ...blankTee },
  });

  const goBack = () => {
    if (editor) { setEditor(null); return; }
    if (selectedCourseId) { setSelectedCourseId(null); return; }
    if (selectedClubId) { setSelectedClubId(null); return; }
    onBack?.();
  };

  const pageTitle = editor
    ? `${editor.id ? 'Edit' : 'Add'} ${editor.type === 'tee' ? 'tee set' : editor.type}`
    : selectedCourse?.name || selectedClub?.name || 'Clubs & courses';
  const context = editor?.type === 'tee' ? editorCourse?.name
    : editor?.type === 'course' ? editorClub?.name
      : selectedCourse ? selectedClub?.name
        : selectedClub ? 'Golf club' : 'Course library';

  return <div className={`mx-auto w-full max-w-4xl min-w-0 ${editor?.type === 'tee' ? 'flex min-h-0 flex-col gap-3 overflow-hidden' : 'space-y-4 pb-8'}`} style={editor?.type === 'tee' ? { height: '100%', maxHeight: 'calc(100dvh - 9rem)' } : undefined}>
    <header className="flex min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" aria-label="Back" onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ color: 'var(--ink)' }}>←</button>
        <div className="min-w-0">
          <p className="baggy-gold truncate text-[11px] font-bold uppercase tracking-wider">{context || 'BaggyGolf'}</p>
          <h1 className="truncate text-xl font-bold sm:text-2xl">{pageTitle}</h1>
        </div>
      </div>
      {!editor && selectedCourse && <button type="button" onClick={() => openCourseEditor(selectedCourse)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold baggy-muted" aria-label="Edit course">Edit</button>}
      {!editor && selectedClub && !selectedCourse && <button type="button" onClick={() => openClubEditor(selectedClub)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold baggy-muted" aria-label="Edit club">Edit</button>}
    </header>

    {error && <p role="alert" className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{error}</p>}

    {!editor && !selectedClub && <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="baggy-muted text-sm">{clubs.length} {clubs.length === 1 ? 'club' : 'clubs'}</p>
        <button type="button" className={button} style={primaryButton} onClick={() => openClubEditor(null)}>+ Add club</button>
      </div>
      {clubs.length === 0 && <p className="baggy-surface rounded-xl p-5 text-sm">No clubs yet. Add your first one to get started.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {clubs.map(club => <button key={club.id} type="button" className="baggy-surface flex min-w-0 items-center justify-between gap-3 rounded-2xl p-4 text-left transition-opacity hover:opacity-85" onClick={() => { setSelectedClubId(club.id); setSelectedCourseId(null); }}>
          <span className="min-w-0"><span className="block truncate font-bold">{club.name}</span><span className="baggy-muted mt-1 block truncate text-xs">{club.location ? `${club.location} · ` : ''}{(club.courses || []).length} {(club.courses || []).length === 1 ? 'course' : 'courses'}</span></span>
          <span aria-hidden="true" className="baggy-muted shrink-0 text-xl">›</span>
        </button>)}
      </div>
    </section>}

    {!editor && selectedClub && !selectedCourse && <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="baggy-muted min-w-0 truncate text-sm">{selectedClub.location || `${(selectedClub.courses || []).length} courses`}</p>
        <button type="button" className={`${button} shrink-0`} style={primaryButton} onClick={() => openCourseEditor(null)}>+ Add course</button>
      </div>
      {(selectedClub.courses || []).length === 0 && <p className="baggy-surface rounded-xl p-5 text-sm">No courses yet. Add one to start building the library.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {(selectedClub.courses || []).map(course => <button key={course.id} type="button" className="baggy-surface flex min-w-0 items-center justify-between gap-3 rounded-2xl p-4 text-left transition-opacity hover:opacity-85" onClick={() => setSelectedCourseId(course.id)}>
          <span className="min-w-0"><span className="block truncate font-bold">{course.name}</span><span className="baggy-muted mt-1 block text-xs">Par {(course.holes || []).reduce((sum, h) => sum + Number(h.par || 0), 0)} · {(course.teeSets || []).length} tee sets</span></span>
          <span aria-hidden="true" className="baggy-muted shrink-0 text-xl">›</span>
        </button>)}
      </div>
    </section>}

    {!editor && selectedCourse && <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="baggy-muted min-w-0 text-sm">18 holes · Par {(selectedCourse.holes || []).reduce((sum, h) => sum + Number(h.par || 0), 0)}</p>
        <button type="button" className={`${button} shrink-0`} style={primaryButton} onClick={() => openTeeEditor(null)}>+ Add tee</button>
      </div>
      {(selectedCourse.teeSets || []).length === 0 && <p className="baggy-surface rounded-xl p-5 text-sm">No tee sets yet. Add a colour and its ratings.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {(selectedCourse.teeSets || []).map(tee => <button key={tee.id} type="button" onClick={() => openTeeEditor(tee)} className="baggy-surface flex min-w-0 items-center gap-3 rounded-2xl p-4 text-left transition-opacity hover:opacity-85" aria-label={`Edit ${tee.colour || tee.name} tees`}>
          <span className="h-5 w-5 shrink-0 rounded-full border" style={{ background: teeSwatches[tee.colour] || 'var(--surface-alt, var(--surface))', borderColor: 'var(--line)' }} aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block truncate font-bold">{tee.colour || tee.name} tees</span><span className="baggy-muted mt-1 block text-xs">CR {tee.courseRating} · Slope {tee.slopeRating} · {tee.yardage} yd</span></span>
          <span aria-hidden="true" className="baggy-muted shrink-0 text-xl">›</span>
        </button>)}
      </div>
    </section>}

    {editor && <form className={editor.type === 'tee' ? 'baggy-surface flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto rounded-2xl p-3 sm:p-5' : 'baggy-surface space-y-4 rounded-2xl p-4 sm:p-6'} onSubmit={e => {
      e.preventDefault();
      const fields = editor.fields;
      if (editor.type === 'club') commit(() => saveClub(editor.id, fields));
      else if (editor.type === 'course') commit(() => saveCourse(editor.clubId, editor.id, fields));
      else commit(() => saveTee(editor.clubId, editor.courseId, editor.id, fields));
    }}>
      {editor.type !== 'tee' && <label className="block text-sm font-semibold">Name<input required maxLength={100} className={`${input} mt-1`} style={surface} value={editor.fields.name} onChange={e => setEditor(prev => ({ ...prev, fields: { ...prev.fields, name: e.target.value } }))} /></label>}
      {editor.type === 'club' && <label className="block text-sm font-semibold">Location (optional)<input maxLength={150} className={`${input} mt-1`} style={surface} value={editor.fields.location || ''} onChange={e => setEditor(prev => ({ ...prev, fields: { ...prev.fields, location: e.target.value } }))} /></label>}
      {editor.type === 'course' && <CourseHolesEditor holes={editor.fields.holes} onChange={holes => setEditor(prev => ({ ...prev, fields: { ...prev.fields, holes } }))} />}
      {editor.type === 'tee' && <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 block text-sm font-semibold">Tee colour
          <select required className={`${input} mt-1`} style={surface} value={editor.fields.colour ?? 'White'} onChange={e => setEditor(prev => ({ ...prev, fields: { ...prev.fields, colour: e.target.value } }))}>
            <optgroup label="Common tee colours">{commonTeeColours.map(colour => <option key={colour} value={colour}>{colour}</option>)}</optgroup>
            <optgroup label="Other tee colours">{lessCommonTeeColours.map(colour => <option key={colour} value={colour}>{colour}</option>)}</optgroup>
            {!teeColours.some(colour => colour.toLowerCase() === String(editor.fields.colour ?? '').toLowerCase()) && editor.fields.colour && <optgroup label="Existing colour"><option value={editor.fields.colour}>{editor.fields.colour}</option></optgroup>}
          </select>
        </label>
        {[['courseRating', 'Course rating'], ['slopeRating', 'Slope rating'], ['yardage', 'Total yardage (yd)']].map(([key, label]) => <label key={key} className={`block text-sm font-semibold ${key === 'yardage' ? 'col-span-2' : ''}`}>{label}
          <input required type="number" inputMode={key === 'courseRating' ? 'decimal' : 'numeric'} min={key === 'courseRating' ? 50 : key === 'slopeRating' ? 55 : 1000} max={key === 'courseRating' ? 90 : key === 'slopeRating' ? 155 : 10000} step={key === 'courseRating' ? '0.1' : '1'} className={`${input} mt-1`} style={surface} value={editor.fields[key] ?? ''} onChange={e => setEditor(prev => ({ ...prev, fields: { ...prev.fields, [key]: e.target.value } }))} />
        </label>)}
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={busy} type="submit" className={button} style={primaryButton}>{busy ? 'Saving…' : 'Save'}</button>
        <button disabled={busy} type="button" className={button} style={surface} onClick={() => setEditor(null)}>Cancel</button>
        {editor.id && <button disabled={busy} type="button" className="ml-auto min-h-11 px-2 text-sm font-medium" style={{ color: 'var(--danger, #b45349)' }} onClick={deleteEditingItem}>Delete</button>}
      </div>
    </form>}
  </div>;
}
