/** Read-only presentation of the final, saved tournament result. No recalculation. */
export default function FinalTournamentResults({ tournament, rounds = [], onOpenPlayer }) {
  const standings = Array.isArray(tournament?.finalStandings) ? tournament.finalStandings : [];
  if (!standings.length) {
    return <section className="baggy-surface rounded-2xl p-5"><h2 className="font-bold">Final results</h2><p className="baggy-muted mt-2 text-sm">Final standings are not available yet.</p></section>;
  }
  const winners = standings.filter((row) => row.position === 1);
  const roundColumns = rounds.filter((round) => round.status === 'completed');
  const theme = { color: 'var(--ink)' };
  return (
    <div className="space-y-4" aria-label="Final tournament results">
      <section className="tournament-hero rounded-2xl px-5 py-7 text-center" aria-label="Tournament champions">
        <span className="text-4xl" role="img" aria-label="Trophy">🏆</span>
        <p className="mt-3 text-xs font-bold uppercase tracking-[.2em]" style={{color:'var(--gold)'}}>{winners.length > 1 ? 'Joint champions' : 'Tournament champion'}</p>
        <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">{winners.map((row) => row.displayName).join(' & ')}</h2>
        <p className="mt-1 text-sm text-white/75">{tournament.name}</p>
        <p className="mt-4 text-3xl font-bold tabular-nums">{winners[0]?.totalPoints ?? 0} <span className="text-base font-medium text-white/75">pts</span></p>
      </section>

      <section className="baggy-surface overflow-hidden rounded-2xl" aria-labelledby="final-standings-heading">
        <div className="px-4 pb-2 pt-4 sm:px-5"><h2 id="final-standings-heading" className="text-lg font-bold">Final standings</h2><p className="baggy-muted mt-1 text-xs">Official Stableford points · Ties share a position</p></div>
        <ol className="px-3 pb-3 sm:px-4">
          {standings.map((row) => (
            <li key={row.playerId} className="flex min-h-16 items-center gap-3 border-b px-2 py-3 last:border-b-0" style={{borderColor:'var(--line)'}}>
              <span className="w-8 shrink-0 text-center text-xl" aria-label={`Position ${row.position}`}>{row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : String(row.position)}</span>
              <div className="min-w-0 flex-1"><button type="button" disabled={!onOpenPlayer} onClick={() => onOpenPlayer?.(row.playerId)} className="truncate text-left font-semibold hover:underline disabled:no-underline" style={theme}>{row.displayName}</button><p className="baggy-muted text-xs">{row.position === 1 ? (winners.length > 1 ? 'Joint champion' : 'Champion') : `${row.position}${row.position === 2 ? 'nd' : row.position === 3 ? 'rd' : 'th'} place`}</p></div>
              <strong className="shrink-0 text-lg tabular-nums" style={theme}>{row.totalPoints} <span className="baggy-muted text-xs font-normal">pts</span></strong>
            </li>
          ))}
        </ol>
      </section>

      {roundColumns.length > 0 && <section className="baggy-surface rounded-2xl p-4 sm:p-5" aria-labelledby="round-breakdown-heading">
        <h2 id="round-breakdown-heading" className="text-lg font-bold">Round-by-round</h2>
        <p className="baggy-muted mt-1 text-xs">Official points from completed rounds</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-64 text-sm">
            <thead><tr className="border-b text-left" style={{borderColor:'var(--line)'}}><th scope="col" className="px-2 py-2 font-semibold">Player</th>{roundColumns.map((round, i) => <th key={round.id} scope="col" title={round.name} className="px-2 py-2 text-right font-semibold">R{i+1}</th>)}<th scope="col" className="px-2 py-2 text-right font-bold">Total</th></tr></thead>
            <tbody>{standings.map((row) => <tr key={row.playerId} className="border-b last:border-0" style={{borderColor:'var(--line)'}}><th scope="row" className="px-2 py-3 text-left font-medium">{row.displayName}</th>{roundColumns.map((round) => <td key={round.id} className="px-2 py-3 text-right tabular-nums">{row.roundPoints?.[round.id] ?? '—'}</td>)}<td className="px-2 py-3 text-right font-bold tabular-nums">{row.totalPoints}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="baggy-muted mt-2 text-xs">{roundColumns.map((round, i) => `R${i + 1}: ${round.name}`).join(' · ')}</p>
      </section>}
    </div>
  );
}
