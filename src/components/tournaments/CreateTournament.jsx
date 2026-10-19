import { MAJOR_THEMES } from '../../lib/majorThemes.js';
import { useEffect, useState } from 'react';
import { getAllPlayers } from '../../repositories/playerRepository.js';
import { createTournament } from '../../repositories/tournamentRepository.js';

const BASE_STEPS = ['Details', 'Players', 'Review'];
const surname = (name = '') => name.trim().split(/\s+/).at(-1) || '';
const bySurname = (a, b) => surname(a.displayName).localeCompare(surname(b.displayName), 'en', { sensitivity: 'base' }) || a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' });
const inputClass = 'mt-2 min-h-11 min-w-0 w-full rounded-xl border px-3 py-2.5 outline-offset-2';
const panelClass = 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6';

function formatDate(date) {
  if (!date) return 'Not set';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export default function CreateTournament({ onCreated, onCancel }) {
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState('casual');
  const [majorThemeId, setMajorThemeId] = useState(null);
  const STEPS = tier === 'major' ? ['Details', 'Players', 'Theme', 'Review'] : BASE_STEPS;
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [handicapMode, setHandicapMode] = useState('fixed');
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [handicapDraft, setHandicapDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const selectedCount = Object.keys(selected).length;
  const selectedPlayers = players.filter(player => selected[player.id]).sort(bySurname);

  useEffect(() => {
    let active = true;
    getAllPlayers().then(data => { if (active) setPlayers([...data].sort(bySurname)); })
      .catch(() => { if (active) setError('Could not load player profiles. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function togglePlayer(player) {
    if (editingId === player.id) setEditingId(null);
    setSelected(previous => {
      const updated = { ...previous };
      if (updated[player.id]) delete updated[player.id];
      else {
        if (Object.keys(updated).length >= 4) return previous;
        updated[player.id] = {
          fixedPlayingHandicap: player.handicapIndex == null ? '' : String(Math.round(player.handicapIndex)),
        };
      }
      return updated;
    });
  }

  function beginHandicapEdit(player) {
    setHandicapDraft(selected[player.id].fixedPlayingHandicap);
    setEditingId(player.id);
  }

  function confirmHandicapEdit(player) {
    const value = handicapDraft.trim();
    if (value === '' || !Number.isInteger(Number(value)) || Number(value) < -10 || Number(value) > 54) {
      setFieldErrors(previous => ({ ...previous, [player.id]: 'Use a whole number from -10 to 54.' }));
      return;
    }
    setSelected(previous => ({ ...previous, [player.id]: { ...previous[player.id], fixedPlayingHandicap: value } }));
    setEditingId(null);
    setFieldErrors(previous => ({ ...previous, [player.id]: undefined }));
  }

  function next() {
    setError('');
    const errors = {};
    if (step === 0) {
      if (!name.trim() || name.trim().length > 100) errors.name = 'Enter a tournament name (up to 100 characters).';
      if (!startDate) errors.startDate = 'Choose a start date.';
      if (!endDate) errors.endDate = 'Choose an end date.';
      else if (startDate && endDate < startDate) errors.endDate = 'End date must be on or after the start date.';
    }
    if (step === 2 && tier === 'major' && !majorThemeId) errors.theme = 'Choose a championship theme.';
    if (step === 1) {
      if (selectedCount < 1) errors.players = 'Select at least one player.';
      if (handicapMode === 'course' && selectedPlayers.some(player => player.handicapIndex == null)) {
        errors.players = 'Every selected player needs a Handicap Index for course handicap mode.';
      }
      if (handicapMode === 'fixed') {
        selectedPlayers.forEach(player => {
          const value = selected[player.id].fixedPlayingHandicap;
          if (value === '' || !Number.isInteger(Number(value)) || Number(value) < -10 || Number(value) > 54) {
            errors[player.id] = 'Enter a whole-number handicap from -10 to 54.';
          }
        });
      }
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStep(current => Math.min(STEPS.length - 1, current + 1));
  }

  async function handleCreate() {
    if (saving || loading || step !== STEPS.length - 1) return;
    setSaving(true);
    setError('');
    const participants = selectedPlayers.map(player => ({
      id: player.id,
      displayName: player.displayName,
      handicapIndex: player.handicapIndex ?? null,
      fixedPlayingHandicap: selected[player.id].fixedPlayingHandicap === ''
        ? null : Number(selected[player.id].fixedPlayingHandicap),
    }));
    try {
      const id = await createTournament({ name, startDate, endDate, handicapMode, tier, majorThemeId, players: participants });
      onCreated?.(id);
    } catch (err) {
      setError(err?.message || 'Could not create tournament. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] min-h-0 w-full max-w-2xl flex-col gap-3 overflow-hidden sm:h-[calc(100dvh-4rem)]">
      <header className="shrink-0">
        <p className="baggy-gold text-[10px] font-bold uppercase tracking-[0.18em]">THE CLUBHOUSE · NEW COMPETITION</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Create tournament</h1>
      </header>

      <ol aria-label="Tournament creation steps" className="grid shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
        {STEPS.map((label, index) => (
          <li key={label} className="min-w-0">
            <div className="h-1.5 rounded-full" style={{ background: index <= step ? 'var(--primary, #173d30)' : 'var(--line, #d9e0d6)' }} />
            <p className="mt-2 text-xs font-semibold" style={{ color: index === step ? 'var(--ink)' : 'var(--muted)' }}>
              {index + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      <div className="baggy-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      {step === 0 && <section className={`${panelClass} space-y-3`} aria-labelledby="details-heading">
        <div><h2 id="details-heading" className="text-xl font-bold">Tournament details</h2><p className="baggy-muted mt-1 text-sm">Name, dates and format.</p></div>
        <label className="block text-sm font-semibold">Tournament name
          <input className={inputClass} style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} value={name} maxLength={100} onChange={event => setName(event.target.value)} placeholder="e.g. Sabo Open 2027" autoComplete="off" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "tournament-name-error" : undefined} />
          {fieldErrors.name && <span id="tournament-name-error" role="alert" className="mt-1 block text-xs text-red-600">{fieldErrors.name}</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">Start date
            <input className={inputClass} style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} type="date" value={startDate} onChange={event => { setStartDate(event.target.value); if (endDate && event.target.value > endDate) setEndDate(''); }} aria-invalid={Boolean(fieldErrors.startDate)} />
            {fieldErrors.startDate && <span role="alert" className="mt-1 block text-xs text-red-600">{fieldErrors.startDate}</span>}
          </label>
          <label className="block text-sm font-semibold">End date
            <input className={inputClass} style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} type="date" min={startDate || undefined} value={endDate} onChange={event => setEndDate(event.target.value)} aria-invalid={Boolean(fieldErrors.endDate)} />
            {fieldErrors.endDate && <span role="alert" className="mt-1 block text-xs text-red-600">{fieldErrors.endDate}</span>}
          </label>
        </div>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Competition type</legend>
          <div className="grid grid-cols-2 gap-3">{[{ value: 'casual', label: 'Casual', description: 'Regular competition' }, { value: 'major', label: 'Major', description: 'Championship' }].map(option => (
            <button type="button" key={option.value} aria-pressed={tier === option.value} onClick={() => setTier(option.value)}
              className="min-h-16 rounded-xl border p-3 text-left" style={{ borderColor: tier === option.value ? 'var(--primary)' : 'var(--line)', background: tier === option.value ? 'var(--surface-soft)' : 'var(--surface)' }}>
              <strong className="block text-sm">{option.label}</strong><span className="baggy-muted block text-xs">{option.description}</span>
            </button>
          ))}</div>
        </fieldset>
        <label className="block text-sm font-semibold">Handicap method
          <select aria-label="Handicap calculation" value={handicapMode} onChange={event => setHandicapMode(event.target.value)} className={inputClass}
            style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }}>
            <option value="fixed">Fixed playing handicap</option>
            <option value="course">Calculated from course and tees</option>
          </select>
        </label>
      </section>}

      {step === 1 && <section className={`${panelClass} space-y-3`} aria-labelledby="players-heading">
        <div><h2 id="players-heading" className="text-xl font-bold">Choose players <span className="baggy-muted text-base">({selectedCount}/4)</span></h2><p className="baggy-muted mt-1 text-sm">Tap to select up to four golfers.</p></div>
        {fieldErrors.players && <p role="alert" className="text-xs text-red-600">{fieldErrors.players}</p>}
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
        {loading && <p className="baggy-muted">Loading players…</p>}
        {!loading && players.length === 0 && <p className="baggy-muted">No player profiles found.</p>}
        <div className="space-y-2">{players.map(player => {
          const isSelected = Boolean(selected[player.id]);
          const isEditing = editingId === player.id;
          return <div key={player.id} className="rounded-xl border px-3 py-2" style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--line)', background: 'var(--surface)' }}>
            <div className="flex min-h-10 items-center gap-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={isSelected} disabled={!isSelected && selectedCount >= 4} onChange={() => togglePlayer(player)} />
                <span className="min-w-0 truncate text-sm font-semibold">{player.displayName}</span>
              </label>
              {isSelected && handicapMode === 'fixed' ? (
                <div className="flex h-11 shrink-0 items-center gap-1">
                  {isEditing ? <>
                    <label className="sr-only" htmlFor={`handicap-${player.id}`}>Playing Handicap for {player.displayName}</label>
                    <input id={`handicap-${player.id}`} type="number" min="-10" max="54" step="1" value={handicapDraft} onChange={event => setHandicapDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') confirmHandicapEdit(player); if (event.key === 'Escape') setEditingId(null); }} className="h-9 w-14 rounded-lg border px-1 text-center text-sm" style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }} />
                    <button type="button" aria-label={`Confirm handicap for ${player.displayName}`} onClick={() => confirmHandicapEdit(player)} className="flex h-9 w-8 items-center justify-center rounded-lg border text-sm font-bold" style={{ borderColor: 'var(--line)' }}>✓</button>
                    <button type="button" aria-label="Cancel handicap edit" onClick={() => setEditingId(null)} className="flex h-9 w-8 items-center justify-center rounded-lg border text-sm font-bold" style={{ borderColor: 'var(--line)' }}>✕</button>
                  </> : <>
                    <span className="baggy-muted text-xs">PH {selected[player.id].fixedPlayingHandicap || '—'}</span>
                    <button type="button" aria-label={`Edit playing handicap for ${player.displayName}`} title="Edit playing handicap" onClick={() => beginHandicapEdit(player)} className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: 'var(--line)' }}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 5 4 4M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" /></svg>
                    </button>
                  </>}
                </div>
              ) : <span className="baggy-muted shrink-0 text-xs">HI {player.handicapIndex ?? 'Not set'}</span>}
            </div>
            {fieldErrors[player.id] && <p role="alert" className="mt-1 text-right text-xs text-red-600">{fieldErrors[player.id]}</p>}
          </div>;
        })}</div>
      </section>}

      {tier === 'major' && step === 2 && <section className={`${panelClass} space-y-3`} aria-labelledby="themes-heading">
        <div><h2 id="themes-heading" className="text-xl font-bold">Choose a Major theme</h2>
          <p className="baggy-muted mt-1 text-sm">Choose your championship colours.</p></div>
        <div className="grid grid-cols-2 gap-3">{MAJOR_THEMES.map(theme => (
          <button type="button" key={theme.id} aria-pressed={majorThemeId === theme.id} onClick={() => setMajorThemeId(theme.id)}
            className="overflow-hidden rounded-xl border-2 text-left" style={{ borderColor: majorThemeId === theme.id ? 'var(--gold)' : 'var(--line)' }}>
            <span className="block p-3" style={{ background: theme.primary, color: '#FFFFFF' }}>
              <span className="block text-[10px] font-bold tracking-widest" style={{ color: theme.accent }}>MAJOR CHAMPIONSHIP</span>
              <span className="mt-2 block font-bold">{name.trim() || 'Your Championship'}</span>
              <span className="mt-2 block h-1 rounded-full" style={{ background: theme.accent }} />
            </span>
            <span className="block p-2 text-xs font-semibold" style={{ background: 'var(--surface)' }}>{theme.name} {majorThemeId === theme.id ? '✓' : ''}</span>
          </button>
        ))}</div>
        {fieldErrors.theme && <p role="alert" className="text-sm text-red-600">{fieldErrors.theme}</p>}
      </section>}

      {step === STEPS.length - 1 && <section className={`${panelClass} space-y-3`} aria-labelledby="review-heading">
        <div><h2 id="review-heading" className="text-xl font-bold">Review your tournament</h2></div>
        <div className="rounded-xl p-4" style={{ background: 'var(--surface-soft)' }}><p className="baggy-gold text-xs font-bold uppercase tracking-wider">Draft tournament</p><h3 className="mt-1 text-xl font-bold">{name.trim()}</h3><p className="baggy-muted mt-2 text-sm">{formatDate(startDate)} – {formatDate(endDate)}</p><p className="mt-2 text-xs font-semibold">{tier === 'major' ? `Major · ${MAJOR_THEMES.find(t => t.id === majorThemeId)?.name || 'Theme required'}` : 'Casual · Default BaggyGolf theme'}</p></div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-soft)' }}><p className="text-xl font-bold">{selectedCount}</p><p className="baggy-muted text-xs">Players</p></div>
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-soft)' }}><p className="text-sm font-bold">Stableford</p><p className="baggy-muted text-xs">Format</p></div>
          <div className="rounded-xl p-3" style={{ background: 'var(--surface-soft)' }}><p className="text-sm font-bold">{handicapMode === 'fixed' ? 'Fixed' : 'Course'}</p><p className="baggy-muted text-xs">Handicap</p></div>
        </div>
        <p className="baggy-muted text-xs">Review the essentials, then add your rounds and courses in tournament management.</p>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </section>}

      </div>
      <div className="flex shrink-0 gap-3 pb-1">
        <button type="button" disabled={saving} onClick={() => { setError(''); if (step === 0) onCancel?.(); else setStep(current => current - 1); }} className="min-h-12 rounded-xl border px-5 py-2 font-semibold disabled:opacity-50" style={{ borderColor: 'var(--line)' }}>{step === 0 ? 'Cancel' : 'Back'}</button>
        {step < STEPS.length - 1 ? <button type="button" disabled={loading && step === 1} onClick={next} className="min-h-12 flex-1 rounded-xl px-5 py-2 font-semibold text-white" style={{ background: 'var(--primary, #173d30)' }}>Continue →</button>
          : <button type="button" disabled={saving} onClick={handleCreate} className="min-h-12 flex-1 rounded-xl px-5 py-2 font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary, #173d30)' }}>{saving ? 'Creating…' : 'Create draft tournament'}</button>}
      </div>
    </div>
  );
}
