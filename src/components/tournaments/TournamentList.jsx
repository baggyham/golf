import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getMyTournaments } from '../../repositories/tournamentRepository.js';

const SECTIONS = [
  { id: 'current', title: 'Current', empty: 'No tournament is in progress.' },
  { id: 'upcoming', title: 'Upcoming', empty: 'No upcoming tournaments or drafts.' },
  { id: 'past', title: 'Past', empty: 'No completed tournaments yet.' },
];

function sectionFor(tournament) {
  // Dates alone must not start or complete a competition.
  const status = String(tournament.status ?? 'draft').toLowerCase();
  if (['completed', 'finished', 'finalised', 'finalized'].includes(status)) return 'past';
  if (['in_progress', 'in-progress', 'active', 'live'].includes(status)) return 'current';
  return 'upcoming';
}

function formatDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || 'Date TBC';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function TournamentCard({ tournament, onOpen }) {
  const playerCount = Object.keys(tournament.participants ?? {}).length;
  const label = String(tournament.status || 'draft').replaceAll('_', ' ');

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-base font-bold text-fairway-950 sm:text-lg">
            {tournament.name || 'Untitled tournament'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
          {label}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {playerCount} {playerCount === 1 ? 'player' : 'players'} ·{' '}
        {tournament.handicapMode === 'fixed' ? 'Fixed handicap' : 'Course handicap'}
      </p>

      <button
        type="button"
        onClick={() => onOpen(tournament.id)}
        className="mt-4 min-h-11 w-full rounded-lg bg-fairway-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fairway-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fairway-950 sm:w-auto"
      >
        Open tournament →
      </button>
    </article>
  );
}

export default function TournamentList({ onSelectTournament, onCreate }) {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      return () => { active = false; };
    }

    async function loadTournaments() {
      setLoading(true);
      setError('');
      try {
        const data = await getMyTournaments(user.uid);
        if (active) setTournaments(data);
      } catch (err) {
        console.error('Failed to load tournaments:', err);
        if (active) setError('Unable to load tournaments.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTournaments();
    return () => { active = false; };
  }, [user?.uid]);

  const grouped = useMemo(() => {
    const result = { current: [], upcoming: [], past: [] };
    for (const tournament of tournaments) result[sectionFor(tournament)].push(tournament);
    result.current.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
    result.upcoming.sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''));
    result.past.sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
    return result;
  }, [tournaments]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fairway-950">Tournaments</h1>
          <p className="mt-1 text-sm text-slate-500">Your competitions, all in one place.</p>
        </div>

      </header>

      <button type="button" onClick={onCreate}
        className="flex min-h-14 w-full items-center justify-between rounded-xl px-5 py-4 text-left font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{background: 'var(--primary, #173d30)'}}>
        <span><span className="block">Create tournament</span><span className="mt-1 block text-xs font-normal opacity-80">Organise a competition with up to four players</span></span>
        <span aria-hidden="true" className="text-2xl">+</span>
      </button>

      {loading && <p className="text-sm text-slate-500">Loading tournaments...</p>}
      {!loading && error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {!loading && !error && SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`tournaments-${section.id}`} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id={`tournaments-${section.id}`} className="text-lg font-bold text-fairway-950">
              {section.title}
            </h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {grouped[section.id].length}
            </span>
          </div>
          {grouped[section.id].length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
              {section.empty}
            </p>
          ) : (
            <div className="grid gap-3">
              {grouped[section.id].map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onOpen={onSelectTournament}
                />
              ))}
            </div>
          )}
        </section>
      ))}
      {!loading && !error && (
        <p className="text-xs text-slate-500">
          Tournaments move between sections when their status changes. Dates alone do not start or finish a tournament.
        </p>
      )}
    </div>
  );
}
