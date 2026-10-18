import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useCareerStats } from '../hooks/useCareerStats.js';
import { getMyTournaments } from '../repositories/tournamentRepository.js';
import { getRecentFinishes, ordinalFinish } from '../lib/recentForm.js';
import LiveLeaderboardStage from '../components/scoring/LiveLeaderboardStage.jsx';

const LIVE = new Set(['in_progress', 'in-progress', 'active', 'live']);
const PAST = new Set(['completed', 'finished', 'finalised', 'finalized']);
function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return 'Date TBC';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function DashboardStats({ playerId, onProfile }) {
  const { stats, loading, error } = useCareerStats(playerId);
  const number = (value) => loading ? '—' : value ?? '—';
  const honours = [
    { label: 'Titles', icon: '🏆', value: stats?.honours.filter(a => a.position === 1).length },
    { label: 'Runner-up', icon: '🥈', value: stats?.honours.filter(a => a.position === 2).length },
    { label: 'Third', icon: '🥉', value: stats?.honours.filter(a => a.position === 3).length },
  ];
  const onCourse = [
    { label: 'Best pts', value: stats?.bestRound },
    { label: 'Eagles', value: stats?.eagleCount },
    { label: 'Birdies', value: stats?.birdieCount },
  ];
  if (error) return <p role="alert" className="baggy-muted text-xs">Career stats unavailable.</p>;
  return <div className="grid min-h-0 shrink-0 gap-2 sm:gap-3">
    <section aria-label="Career statistics" className="grid grid-cols-3 gap-2">
      {[{ label: 'Wins', value: stats?.wins }, { label: 'Podiums', value: stats?.podiums }, { label: 'Rounds', value: stats?.roundsPlayed }].map(item =>
        <div key={item.label} className="baggy-surface rounded-xl px-2 py-2 text-center sm:py-3">
          <p className="text-xl font-extrabold tabular-nums sm:text-2xl">{number(item.value)}</p>
          <p className="baggy-muted text-[11px]">{item.label}</p>
        </div>)}
    </section>
    <section aria-labelledby="honours-heading" className="baggy-surface rounded-xl p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2"><h2 id="honours-heading" className="text-sm font-bold">Your honours</h2>
        <button type="button" onClick={onProfile} className="baggy-gold text-xs font-bold">View all →</button></div>
      <div className="grid grid-cols-3 gap-2 text-center">{honours.map(item => <div key={item.label}>
        <div aria-hidden="true" className="text-lg leading-6">{item.icon}</div>
        <p className="text-lg font-bold tabular-nums">{number(item.value)}</p>
        <p className="baggy-muted text-[11px]">{item.label}</p>
      </div>)}</div>
    </section>
    <section aria-labelledby="course-heading" className="baggy-surface rounded-xl p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2"><h2 id="course-heading" className="text-sm font-bold">On the course</h2>
        <button type="button" onClick={onProfile} className="baggy-gold text-xs font-bold">Career stats →</button></div>
      <div className="grid grid-cols-3 gap-2 text-center">{onCourse.map(item => <div key={item.label}>
        <p className="text-xl font-bold tabular-nums">{number(item.value)}</p>
        <p className="baggy-muted text-[11px]">{item.label}</p>
      </div>)}</div>
    </section>
  </div>;
}

function RecentForm({ tournaments, playerId }) {
  const finishes = useMemo(() => getRecentFinishes(tournaments, playerId, 5), [tournaments, playerId]);
  return <section aria-labelledby="form-heading" className="baggy-surface shrink-0 rounded-xl p-3 sm:p-4">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 id="form-heading" className="text-sm font-bold">Recent form</h2>
      <p className="baggy-muted text-[11px]">Last 5 competitions</p>
    </div>
    {finishes.length ? <div className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Recent competition finishes">
      {finishes.map(item => <div key={item.id} className="min-w-0 rounded-lg px-1 py-2 text-center" style={{background:'var(--surface-soft)'}} title={`${item.name} · ${item.formatLabel} · ${ordinalFinish(item.position)}`}>
        <p className="text-base font-extrabold tabular-nums sm:text-lg">{ordinalFinish(item.position)}</p>
        <p className="baggy-muted truncate text-[10px]">{item.formatLabel}</p>
      </div>)}
    </div> : <p className="baggy-muted text-xs">Your completed competition finishes will appear here.</p>}
  </section>;
}

export default function HomePage({ onNavigate, onOpenTournament, onActiveTournamentChange, onManageTournament }) {
  const { player, user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    if (!user?.uid) { setTournaments([]); setLoading(false); return () => { mounted = false; }; }
    setLoading(true); setError('');
    getMyTournaments(user.uid).then(data => { if (mounted) setTournaments(data); })
      .catch(err => { console.error(err); if (mounted) setError('Tournament highlights are unavailable.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user?.uid]);
  const { current, past } = useMemo(() => ({
    current: tournaments.filter(t => LIVE.has(String(t.status ?? '').toLowerCase())).sort((a,b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
    past: tournaments.filter(t => PAST.has(String(t.status ?? '').toLowerCase())).sort((a,b) => (b.endDate ?? '').localeCompare(a.endDate ?? '')),
  }), [tournaments]);
  useEffect(() => {
    if (loading || error) return;
    onActiveTournamentChange?.(current[0] ?? null);
  }, [current, loading, error, onActiveTournamentChange]);
  if (!player) return null;
  const active = current[0];
  const latest = past[0];
  const tournament = latest;
  // While a tournament is running, Home is the Leaderboard tab: no career dashboard.
  if (active) return <div className="live-home mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-2">
    {active.createdBy === user?.uid && <div className="flex shrink-0 justify-end"><button type="button" onClick={() => onManageTournament(active.id)} className="live-manage-button rounded-xl border px-3 py-1.5 text-xs font-bold" style={{borderColor:'var(--line)'}}>Manage tournament</button></div>}
    <LiveLeaderboardStage tournament={active}/>
    {error && <p role="alert" className="shrink-0 text-xs text-red-600">{error}</p>}
  </div>;
  return <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col gap-2 sm:gap-3">
    <header className="shrink-0">
      <p className="baggy-gold text-[10px] font-bold uppercase tracking-widest">The clubhouse</p>
      <h1 className="mt-0.5 text-xl font-bold leading-tight sm:text-2xl">Welcome back, {player.displayName?.split(' ')[0] || 'golfer'}.</h1>
    </header>
    <DashboardStats playerId={user?.uid} onProfile={() => onNavigate('profile')}/>
    <RecentForm tournaments={past} playerId={user?.uid}/>
    <section aria-labelledby="tournament-heading" className="baggy-surface shrink-0 rounded-xl p-3 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="tournament-heading" className="text-sm font-bold">Latest tournament</h2>
      </div>
      {loading ? <p className="baggy-muted text-xs">Loading tournaments…</p> : tournament ?
        <div className="flex items-center justify-between gap-3">
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenTournament(tournament.id)} aria-label={`Open ${tournament.name}`}>
            <p className="baggy-gold text-[10px] font-semibold uppercase tracking-wide">{`Completed · ${formatDate(latest.endDate)}`}</p>
            <p className="truncate text-sm font-bold sm:text-base">{tournament.name}</p>
          </button>
        </div> : <div className="flex items-center justify-between gap-3"><p className="baggy-muted text-xs">No tournaments yet.</p><button type="button" onClick={() => onNavigate('tournaments')} className="baggy-gold py-2 text-xs font-bold">Get started →</button></div>}
    </section>
    {error && <p role="alert" className="shrink-0 text-xs text-red-600">{error}</p>}
  </div>;
}
