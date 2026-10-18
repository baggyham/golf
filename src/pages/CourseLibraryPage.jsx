import { useCallback, useEffect, useState } from 'react';
import { emptyHoles } from '../lib/courseLibrary.js';
import { listClubs, saveClub, removeClub, saveCourse, removeCourse, saveTee, removeTee } from '../repositories/courseLibraryRepository.js';

const input = 'min-h-11 w-full rounded-xl border px-3 py-2';
const button = 'min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold';
const surface = { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' };
const blankTee = { name: '', colour: 'White', gender: 'men', courseRating: '', slopeRating: '', yardage: '' };
export default function CourseLibraryPage({ onBack }) {
  const [clubs, setClubs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const reload = useCallback(async () => { setClubs(await listClubs()); }, []);
  useEffect(() => { let active = true; listClubs().then(data => { if (active) setClubs(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  async function commit(action) { setBusy(true); setError(''); try { await action(); await reload(); setEditor(null); } catch (e) { setError(e.message || 'Could not save changes.'); } finally { setBusy(false); } }
  async function remove(label, action) { if (!window.confirm(`Delete ${label}? This cannot be undone. Existing tournaments will not be modified.`)) return; await commit(action); }
  const club = clubs.find(c => c.id === editor?.clubId);
  const course = club?.courses?.find(c => c.id === editor?.courseId);
  return <div className="mx-auto max-w-4xl space-y-5 pb-8">
    <header className="flex items-start justify-between gap-3"><div><p className="baggy-gold text-xs font-bold uppercase tracking-widest">BaggyGolf library</p><h1 className="text-3xl font-bold">Clubs & courses</h1><p className="baggy-muted mt-1 text-sm">Manage your shared course data. No external API required.</p></div><button className={button} style={surface} onClick={onBack}>Back</button></header>
    {error && <p role="alert" className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>{error}</p>}
    {!editor && <><button className={button} style={{ background: 'var(--primary)', color: 'var(--on-primary)' }} onClick={() => setEditor({ type: 'club', fields: { name: '', location: '' } })}>+ Add club</button>
      {clubs.length === 0 && <p className="baggy-surface rounded-xl p-5">No clubs yet. Add your first club to get started.</p>}
      {clubs.map(c => <section key={c.id} className="baggy-surface space-y-3 rounded-2xl p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{c.name}</h2><p className="baggy-muted text-xs">{c.location || 'Location not set'} · {(c.courses || []).length} courses</p></div><div className="flex gap-2"><button className={button} style={surface} onClick={() => setEditor({ type: 'club', id: c.id, fields: { name: c.name, location: c.location } })}>Edit</button><button className={button} style={surface} onClick={() => remove(c.name, () => removeClub(c.id))}>Delete</button></div></div>
        {(c.courses || []).map(co => <div key={co.id} className="space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{co.name}</h3><p className="baggy-muted text-xs">Par {co.holes?.reduce((n,h) => n + h.par,0)} · {(co.teeSets || []).length} tee sets</p></div><div className="flex gap-2"><button className={button} style={surface} onClick={() => setEditor({ type: 'course', clubId: c.id, id: co.id, fields: { name: co.name, holes: co.holes.map(h=>({...h})) } })}>Edit</button><button className={button} style={surface} onClick={() => remove(co.name, () => removeCourse(c.id, co.id))}>Delete</button></div></div>
          {(co.teeSets || []).map(tee => <div key={tee.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm" style={{ borderColor: 'var(--line)' }}><div><strong>{tee.name}</strong> · {tee.colour}<p className="baggy-muted text-xs">CR {tee.courseRating} · Slope {tee.slopeRating} · {tee.yardage} yd · {tee.gender}</p></div><div className="flex gap-2"><button className={button} style={surface} onClick={() => setEditor({ type: 'tee', clubId: c.id, courseId: co.id, id: tee.id, fields: { ...tee } })}>Edit</button><button className={button} style={surface} onClick={() => remove(tee.name, () => removeTee(c.id, co.id, tee.id))}>Delete</button></div></div>)}
          <button className={button} style={surface} onClick={() => setEditor({ type: 'tee', clubId: c.id, courseId: co.id, fields: { ...blankTee } })}>+ Add tee set</button></div>)}
        <button className={button} style={surface} onClick={() => setEditor({ type: 'course', clubId: c.id, fields: { name: '', holes: emptyHoles() } })}>+ Add course</button>
      </section>)}
    </>}
    {editor && <form className="baggy-surface space-y-4 rounded-2xl p-4 sm:p-6" onSubmit={e => { e.preventDefault(); const f = editor.fields; if (editor.type === 'club') commit(() => saveClub(editor.id, f)); else if (editor.type === 'course') commit(() => saveCourse(editor.clubId, editor.id, f)); else commit(() => saveTee(editor.clubId, editor.courseId, editor.id, f)); }}>
      <h2 className="text-xl font-bold">{editor.id ? 'Edit' : 'Add'} {editor.type === 'tee' ? 'tee set' : editor.type}</h2>
      {editor.type !== 'tee' && <label className="block text-sm font-semibold">Name<input required maxLength={100} className={`${input} mt-1`} style={surface} value={editor.fields.name} onChange={e => setEditor(s => ({ ...s, fields: { ...s.fields, name: e.target.value } }))}/></label>}
      {editor.type === 'club' && <label className="block text-sm font-semibold">Location (optional)<input maxLength={150} className={`${input} mt-1`} style={surface} value={editor.fields.location || ''} onChange={e=>setEditor(s=>({...s,fields:{...s.fields,location:e.target.value}}))}/></label>}
      {editor.type === 'course' && <><p className="baggy-muted text-sm">Set the par and stroke index for each of the 18 holes. Every SI from 1–18 must be used once.</p><div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2"><strong>Hole</strong><strong>Par</strong><strong>SI</strong>{editor.fields.holes.map((h,i) => <div key={i} className="contents"><span className="self-center text-sm font-semibold">{i+1}</span>{['par','strokeIndex'].map(field => <input key={field} aria-label={`Hole ${i+1} ${field}`} type="number" min={field==='par'?3:1} max={field==='par'?6:18} required className={input} style={surface} value={h[field]} onChange={e=>setEditor(s=>({...s,fields:{...s.fields,holes:s.fields.holes.map((row,j)=>j===i?{...row,[field]:e.target.value}:row)}}))}/>)}</div>)}</div></>}
      {editor.type === 'tee' && <div className="grid gap-3 sm:grid-cols-2">{[['name','Tee name'],['colour','Colour'],['courseRating','Course rating'],['slopeRating','Slope rating'],['yardage','Total yardage']].map(([key,label])=><label key={key} className="block text-sm font-semibold">{label}<input required type={['courseRating','slopeRating','yardage'].includes(key)?'number':'text'} step={key==='courseRating'?'0.1':'1'} className={`${input} mt-1`} style={surface} value={editor.fields[key] ?? ''} onChange={e=>setEditor(s=>({...s,fields:{...s.fields,[key]:e.target.value}}))}/></label>)}<label className="block text-sm font-semibold">Rating category<select className={`${input} mt-1`} style={surface} value={editor.fields.gender} onChange={e=>setEditor(s=>({...s,fields:{...s.fields,gender:e.target.value}}))}><option value="men">Men</option><option value="women">Women</option></select></label></div>}
      <div className="flex flex-wrap gap-2"><button disabled={busy} type="submit" className={button} style={{background:'var(--primary)',color:'var(--on-primary)'}}>{busy?'Saving…':'Save'}</button><button type="button" disabled={busy} className={button} style={surface} onClick={()=>setEditor(null)}>Cancel</button></div>
      {course && <p className="baggy-muted text-xs">Editing tee sets for {course.name}</p>}
    </form>}
  </div>;
}
