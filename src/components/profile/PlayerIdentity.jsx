export default function PlayerIdentity({ player, large = false }) {
  const initials = String(player?.displayName || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
  return <div className="flex items-center gap-3">
    <div aria-hidden="true" className={`${large ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base'} flex shrink-0 items-center justify-center rounded-full font-black`} style={{background:'var(--surface-soft)',color:'var(--ink)',border:'1px solid var(--line)'}}>{initials}</div>
    <div className="min-w-0"><h1 className={`${large ? 'text-2xl' : 'text-lg'} truncate font-extrabold`}>{player?.displayName || 'Player'}</h1><p className="baggy-muted text-sm">@{player?.username || 'player'} · HCP {Number.isFinite(player?.handicapIndex) ? player.handicapIndex.toFixed(1) : '—'}</p></div>
  </div>;
}
