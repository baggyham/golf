import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import EditHandicap from '../components/players/EditHandicap.jsx';
import TournamentStandings from '../components/scoring/TournamentStandings.jsx';
import { getMyTournaments } from '../repositories/tournamentRepository.js';

const LIVE_STATUSES = new Set(['in_progress', 'in-progress', 'active', 'live']);
const PAST_STATUSES = new Set(['completed', 'finished', 'finalised', 'finalized']);

function formatDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date TBC';
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function HomePage({ onNavigate, onOpenTournament }) {
  const { player, user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!user?.uid) {
      setTournaments([]);
      setLoading(false);
      return () => { active = false; };
    }

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getMyTournaments(user.uid);
        if (active) setTournaments(data);
      } catch (err) {
        console.error('Home tournament loading failed:', err);
        if (active) setError('Tournament highlights are unavailable right now.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user?.uid]);

  const { current, past } = useMemo(() => {
    const current = [];
    const past = [];
    for (const tournament of tournaments) {
      const status = String(tournament.status ?? 'draft').toLowerCase();
      if (LIVE_STATUSES.has(status)) current.push(tournament);
      if (PAST_STATUSES.has(status)) past.push(tournament);
    }
    current.sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
    past.sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
    return { current, past };
  }, [tournaments]);

  if (!player) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wider text-fairway-800">Home</p>
        <h1 className="mt-1 text-2xl font-bold text-fairway-950">Welcome back, {player.displayName}</h1>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-fairway-950">Your Handicap Index</h2>
        <EditHandicap />
        <p className="mt-3 text-xs text-gray-500">
          Updating your HI won't change handicap snapshots in existing tournaments.
        </p>
      </section>

      <section aria-label="Golf statistics" className="grid grid-cols-3 gap-3">
        {['Wins', 'Rounds', 'Badges'].map((label) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-fairway-950">—</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      {loading && <p className="text-sm text-slate-500">Loading tournament highlights…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {!loading && !error && current.length > 0 && (
        <section aria-labelledby="active-tournaments" className="space-y-3">
          <h2 id="active-tournaments" className="text-xl font-bold text-fairway-950">Current tournament</h2>
          {current.map((tournament) => (
            <article key={tournament.id} className="rounded-xl border border-emerald-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-fairway-950">{tournament.name}</h3>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">In progress</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
              </p>
              <TournamentStandings tournament={tournament} onOpenTournament={onOpenTournament} />
            </article>
          ))}
        </section>
      )}

      {!loading && !error && current.length === 0 && (
        <section aria-labelledby="past-highlights" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="past-highlights" className="text-xl font-bold text-fairway-950">Tournament history</h2>
            <button type="button" onClick={() => onNavigate('tournaments')}
              className="min-h-11 text-sm font-semibold text-fairway-800">View all →</button>
          </div>
          {past.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
              <p className="font-semibold text-fairway-950">Your past competitions will appear here</p>
              <p className="mt-2 text-sm text-slate-600">
                Once a tournament is marked as completed, you can revisit it from Home.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.slice(0, 3).map((tournament) => (
                <article key={tournament.id} className="rounded-xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fairway-800">Completed tournament</p>
                  <h3 className="mt-1 text-lg font-bold text-fairway-950">{tournament.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)} ·{' '}
                    {Object.keys(tournament.participants ?? {}).length} players
                  </p>
                  <button type="button" onClick={() => onOpenTournament(tournament.id)}
                    className="mt-3 min-h-11 text-sm font-semibold text-fairway-800">
                    View tournament →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && !error && current.length > 0 && (
        <button type="button" onClick={() => onNavigate('tournaments')}
          className="min-h-11 text-sm font-semibold text-fairway-800">Browse all tournaments →</button>
      )}
    </div>
  );
}
