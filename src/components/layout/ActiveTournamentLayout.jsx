/** A stable header and content viewport shared by Leaderboard and Scorecard. */
export default function ActiveTournamentLayout({ tournament, children }) {
  return <div className="active-tournament-layout mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-2 sm:gap-3">
    <header className="active-tournament-heading flex shrink-0 items-center gap-3">
      <div className="min-w-0">
        <p className="baggy-gold text-[10px] font-extrabold uppercase tracking-[0.18em]">{tournament.tier === 'major' ? 'Major championship' : 'Competition in progress'}</p>
        <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{tournament.name}</h1>
      </div>
    </header>
    <div className="active-tournament-content flex min-h-0 flex-1 flex-col">{children}</div>
  </div>;
}
