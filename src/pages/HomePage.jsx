import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import EditHandicap from '../components/players/EditHandicap.jsx';
import TournamentStandings from '../components/scoring/TournamentStandings.jsx';
import { getMyTournaments } from '../repositories/tournamentRepository.js';
import { tournamentTheme } from '../contexts/ThemeContext.jsx';

const LIVE = new Set(['in_progress', 'in-progress', 'active', 'live']);
const PAST = new Set(['completed', 'finished', 'finalised', 'finalized']);
function formatDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return 'Date TBC'; return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }

export default function HomePage({ onNavigate, onOpenTournament, onActiveTournamentChange, onManageTournament }) {
  const { player, user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    if (!user?.uid) { setTournaments([]); setLoading(false); return () => { mounted = false; }; }
    setLoading(true); setError('');
    getMyTournaments(user.uid).then(data => { if (mounted) setTournaments(data); }).catch(err => { console.error(err); if (mounted) setError('Tournament highlights are unavailable.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [user?.uid]);
  const { current, past } = useMemo(() => ({
    current: tournaments.filter(t => LIVE.has(String(t.status ?? '').toLowerCase())).sort((a,b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
    past: tournaments.filter(t => PAST.has(String(t.status ?? '').toLowerCase())).sort((a,b) => (b.endDate ?? '').localeCompare(a.endDate ?? '')),
  }), [tournaments]);
  useEffect(() => {
    // Keep the active tournament while this page remounts/refetches.
    // Clearing it during loading temporarily switches the bottom nav back to Home.
    if (loading || error) return;
    onActiveTournamentChange?.(current[0] ?? null);
  }, [current, loading, error, onActiveTournamentChange]);
  if (!player) return null;
  if (loading) return <p className="baggy-muted">Loading your clubhouse…</p>;
  if (current.length) {
    const tournament = current[0];
    return <div className="tournament-scope mx-auto max-w-3xl space-y-5" style={tournamentTheme(tournament)}>
      <header><p className="tournament-accent text-xs font-bold uppercase tracking-[0.2em]">Tournament in progress</p><h1 className="mt-2 text-3xl font-bold">{tournament.name}</h1><p className="baggy-muted mt-1 text-sm">Live cumulative Stableford standings</p></header>
      {tournament.createdBy === user?.uid && <div className="flex justify-end"><button type="button" onClick={() => onManageTournament(tournament.id)} className="min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold" style={{ borderColor: 'var(--theme-primary, #173d30)', color: 'var(--theme-primary, #173d30)' }}>Manage tournament</button></div>}
      <section className="tournament-hero rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Current standings</h2><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">LIVE</span></div><TournamentStandings tournament={tournament} showOpenAction={false}/></section>
      {current.length > 1 && <p className="baggy-muted text-sm">You have {current.length} active tournaments. Browse Tournaments to view the others.</p>}
      {error && <p role="alert">{error}</p>}
    </div>;
  }
  return <div className="mx-auto max-w-3xl space-y-6">
    <header><p className="baggy-gold text-xs font-bold uppercase tracking-[0.2em]">The clubhouse</p><h1 className="mt-2 text-3xl font-bold">Good to see you, {player.displayName?.split(' ')[0] || 'golfer'}.</h1><p className="baggy-muted mt-2">Here's how your golf is looking.</p></header>
    <section aria-label="Your Handicap Index" className="baggy-hero rounded-2xl p-5 sm:p-6"><p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/75">Your Handicap Index</p><div className="[&_button]:text-[#D9BA77] [&_button]:font-bold [&_p]:text-white [&_label]:text-white [&_input]:text-slate-900"><EditHandicap/></div><p className="mt-4 text-xs text-white/70">Changes won't affect handicaps already locked into a tournament.</p></section>
    <section aria-label="Golf statistics" className="grid grid-cols-3 gap-3">{['Wins','Rounds','Awards'].map(label => <div key={label} className="baggy-surface rounded-2xl p-4 text-center"><p className="text-2xl font-bold">—</p><p className="baggy-muted mt-1 text-xs">{label}</p></div>)}</section>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <section aria-labelledby="history-title"><div className="mb-3 flex items-center justify-between gap-3"><h2 id="history-title" className="text-xl font-bold">Your tournaments</h2><button type="button" onClick={() => onNavigate('tournaments')} className="baggy-gold min-h-11 text-sm font-bold">View all →</button></div>
      {past.length === 0 ? <div className="baggy-surface rounded-2xl p-5"><p className="font-semibold">Your tournament history starts here</p><p className="baggy-muted mt-2 text-sm">Completed events, champions and memorable rounds will appear here.</p></div> : <div className="space-y-3">{past.slice(0,3).map(t => <article key={t.id} className="baggy-surface rounded-2xl p-5"><p className="baggy-gold text-xs font-bold uppercase tracking-wider">Completed tournament</p><h3 className="mt-1 text-lg font-bold">{t.name}</h3><p className="baggy-muted mt-1 text-sm">{formatDate(t.startDate)} – {formatDate(t.endDate)}</p><button type="button" onClick={() => onOpenTournament(t.id)} className="baggy-gold mt-3 min-h-11 text-sm font-bold">View results →</button></article>)}</div>}
    </section>
  </div>;
}
