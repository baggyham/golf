import { useState } from 'react';
import { useCareerStats } from '../../hooks/useCareerStats.js';

const ICONS = { Champion: '🏆', 'Runner-up': '🥈', 'Third place': '🥉', 'Longest drive': '🏌️', 'Closest to the pin': '🎯' };
function Stat({ value, label }) {
  return <div className="baggy-surface rounded-2xl px-2 py-4 text-center"><p className="text-2xl font-bold tabular-nums">{value}</p><p className="baggy-muted mt-1 text-xs">{label}</p></div>;
}
function Overview({ stats, onProfile }) {
  const honourCounts = [
    { title: 'Titles', icon: '🏆', count: stats.honours.filter(a => a.position === 1).length },
    { title: 'Runner-up', icon: '🥈', count: stats.honours.filter(a => a.position === 2).length },
    { title: 'Third', icon: '🥉', count: stats.honours.filter(a => a.position === 3).length },
  ];
  return <div className="space-y-5">
    <section aria-label="Career statistics" className="grid grid-cols-3 gap-2 sm:gap-3"><Stat value={stats.wins} label="Wins"/><Stat value={stats.podiums} label="Podiums"/><Stat value={stats.roundsPlayed} label="Rounds"/></section>
    <section aria-labelledby="honours-heading" className="baggy-surface rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2"><h2 id="honours-heading" className="text-lg font-bold">Honours</h2>{onProfile && <button type="button" onClick={onProfile} className="baggy-gold min-h-11 text-sm font-semibold">View all →</button>}</div>
      <div className="grid grid-cols-3 gap-2 text-center">{honourCounts.map(h => <div key={h.title} className="min-w-0"><div className="text-2xl" aria-hidden="true">{h.icon}</div><p className="mt-1 text-lg font-bold tabular-nums">{h.count}</p><p className="baggy-muted text-xs">{h.title}</p></div>)}</div>
      {!stats.honours.length && <p className="baggy-muted mt-3 text-center text-xs">Your first tournament honour will appear here.</p>}
    </section>
    <section aria-labelledby="course-heading" className="baggy-surface rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2"><h2 id="course-heading" className="text-lg font-bold">On the course</h2>{onProfile && <button type="button" onClick={onProfile} className="baggy-gold min-h-11 text-sm font-semibold">Career stats →</button>}</div>
      <div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-xl font-bold tabular-nums">{stats.bestRound ?? '—'}</p><p className="baggy-muted text-xs">Best points</p></div><div><p className="text-xl font-bold tabular-nums">{stats.eagleCount}</p><p className="baggy-muted text-xs">Eagles</p></div><div><p className="text-xl font-bold tabular-nums">{stats.birdieCount}</p><p className="baggy-muted text-xs">Birdies</p></div></div>
    </section>
  </div>;
}
function MajorHonours({ stats, onOpenTournament }) {
  const results = stats.majorResults ?? [];
  return <section aria-labelledby="major-honours-heading" className="baggy-surface rounded-2xl p-4 sm:p-5">
    <div className="mb-3 flex items-center gap-2"><span aria-hidden="true" className="text-xl">🏆</span><h2 id="major-honours-heading" className="text-lg font-bold">Major championships</h2></div>
    <div className="mb-4 grid grid-cols-3 gap-2"><Stat value={stats.majorWins ?? 0} label="Titles"/><Stat value={stats.majorPodiums ?? 0} label="Podiums"/><Stat value={stats.majorsPlayed ?? results.length} label="Played"/></div>
    {!results.length ? <p className="baggy-muted text-sm">No completed Major appearances yet.</p> : <div className="divide-y" style={{borderColor:'var(--line)'}}>{results.map(result => {
      const placing = result.champion ? 'Champion' : result.jointFirst ? 'Joint first · unresolved' : result.position === 2 ? 'Runner-up' : result.position === 3 ? 'Third place' : result.position ? `Position ${result.position}` : 'Result pending';
      return <div key={result.id} className="flex items-center gap-3 py-3">
        <div className="min-w-0 flex-1"><p className="font-semibold">{result.name}</p><p className="baggy-muted mt-1 text-xs">{result.date || 'Completed Major'} · {placing}</p></div>
        {onOpenTournament && <button type="button" onClick={() => onOpenTournament(result.id)} className="baggy-gold min-h-11 shrink-0 text-xs font-semibold" aria-label={`View results for ${result.name}`}>Results →</button>}
      </div>;
    })}</div>}
  </section>;
}
function Details({ stats, onOpenTournament }) {
  const [tab, setTab] = useState('honours');
  const tabs = [{ id: 'honours', label: 'Honours' }, { id: 'stats', label: 'Career stats' }, { id: 'history', label: 'History' }];
  const events = [...stats.tournaments].sort((a,b) => String(b.endDate || '').localeCompare(String(a.endDate || '')));
  return <div className="space-y-4">
    <section aria-label="Career statistics" className="grid grid-cols-3 gap-2"><Stat value={stats.wins} label="Wins"/><Stat value={stats.podiums} label="Podiums"/><Stat value={stats.roundsPlayed} label="Rounds"/></section>
    <MajorHonours stats={stats} onOpenTournament={onOpenTournament}/>
    <div role="tablist" aria-label="Your golfing record" className="baggy-surface grid grid-cols-3 gap-1 rounded-xl p-1">{tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`min-h-11 rounded-lg px-1 text-xs font-semibold sm:text-sm ${tab === t.id ? 'baggy-hero text-white' : 'baggy-muted'}`}>{t.label}</button>)}</div>
    {tab === 'honours' && <section role="tabpanel" aria-label="Honours" className="baggy-surface rounded-2xl p-4 sm:p-5"><h2 className="mb-3 text-lg font-bold">Tournament honours</h2>{!stats.honours.length ? <p className="baggy-muted text-sm">No tournament honours yet.</p> : <div className="divide-y" style={{borderColor:'var(--line)'}}>{stats.honours.map(award => <div key={award.id} className="flex items-center gap-3 py-3"><span aria-hidden="true" className="text-2xl">{ICONS[award.title] || '🏅'}</span><div className="min-w-0 flex-1"><p className="font-semibold">{award.title}</p><p className="baggy-muted text-xs">{award.event}{award.date ? ` · ${award.date}` : ''}</p></div>{onOpenTournament && <button type="button" onClick={() => onOpenTournament(award.tournamentId)} className="baggy-gold min-h-11 shrink-0 text-xs font-semibold">View →</button>}</div>)}</div>}</section>}
    {tab === 'stats' && <section role="tabpanel" aria-label="Career statistics" className="baggy-surface rounded-2xl p-4 sm:p-5"><h2 className="mb-3 text-lg font-bold">On-course records</h2><dl className="grid grid-cols-2 gap-3">{[{label:'Major championships',value:stats.majorWins ?? 0},{label:'Major podiums',value:stats.majorPodiums ?? 0},{label:'Best Stableford round',value:stats.bestRound == null ? '—' : `${stats.bestRound} pts`},{label:'Eagles',value:stats.eagleCount},{label:'Birdies',value:stats.birdieCount},{label:'40+ point rounds',value:stats.fortyPlusRounds},{label:'Average points',value:stats.averagePoints == null ? '—' : stats.averagePoints.toFixed(1)},{label:'Rounds played',value:stats.roundsPlayed}].map(s => <div key={s.label} className="rounded-xl border p-3" style={{borderColor:'var(--line)'}}><dd className="text-xl font-bold tabular-nums">{s.value}</dd><dt className="baggy-muted mt-1 text-xs">{s.label}</dt></div>)}</dl><p className="baggy-muted mt-4 text-xs">Calculated only from verified rounds in completed tournaments.</p></section>}
    {tab === 'history' && <section role="tabpanel" aria-label="Tournament history" className="space-y-3">{!events.length ? <div className="baggy-surface rounded-2xl p-5"><p className="baggy-muted text-sm">No completed tournaments yet.</p></div> : events.map(t => <div className="baggy-surface flex items-center gap-3 rounded-2xl p-4" key={t.id}><div className="min-w-0 flex-1"><p className="font-semibold">{t.name}</p><p className="baggy-muted text-xs">{t.endDate || 'Completed'}{(t.winnerIds || []).includes(stats.playerId) ? ' · Champion' : ''}</p></div>{onOpenTournament && <button type="button" className="baggy-gold min-h-11 text-sm font-semibold" onClick={() => onOpenTournament(t.id)}>Results →</button>}</div>)}</section>}
  </div>;
}
export default function CareerShowcase({ playerId, onOpenTournament, onProfile, expanded = false }) {
  const { stats, loading, error } = useCareerStats(playerId);
  if (loading) return <section aria-label="Golf career" className="baggy-surface rounded-2xl p-5"><p className="baggy-muted text-sm">Loading your golfing record…</p></section>;
  if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!stats) return null;
  return expanded ? <Details stats={stats} onOpenTournament={onOpenTournament}/> : <Overview stats={stats} onProfile={onProfile}/>;
}
