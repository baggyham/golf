import { useMemo } from 'react';
import { useTournamentLiveScores } from '../../hooks/useTournamentLiveScores.js';
import { calculateTournamentLeaderboard } from '../../lib/tournamentLeaderboard.js';

export default function TournamentStandings({ tournament, onOpenTournament, showOpenAction = true }) {
  const { rounds, loading, error } = useTournamentLiveScores(tournament.id);
  const { rows, calculationError } = useMemo(() => {
    if (loading || error) return { rows: [], calculationError: '' };
    try {
      return { rows: calculateTournamentLeaderboard(tournament, rounds), calculationError: '' };
    } catch (err) {
      return { rows: [], calculationError: err.message || 'Unable to calculate standings.' };
    }
  }, [tournament, rounds, loading, error]);
  const activeRound = rounds.find(({ round }) => round.status === 'in_progress')?.round;
  return (
    <section className="space-y-2" aria-label="Tournament standings">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold ">Overall standings</h4>
        <span className="text-xs baggy-gold">{rows.some((row) => row.hasProvisional) ? 'Includes provisional scores' : 'Official completed rounds only'}</span>
      </div>
      {activeRound && <p className="text-sm baggy-muted">Current round: {activeRound.name}</p>}
      {loading && <p className="text-sm baggy-muted">Loading scores…</p>}
      {(error || calculationError) && <p role="alert" className="text-sm text-red-600">{error || calculationError}</p>}
      {!loading && !error && !calculationError && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">Player</th><th className="text-right">Total</th><th className="text-right">Official</th><th className="text-right">Holes</th><th className="text-right">Review</th></tr></thead>
            <tbody>{rows.map((row) => <tr className="border-b last:border-0" key={row.playerId}>
              <td className="py-2">{row.position}. {row.displayName}</td>
              <td className="text-right font-semibold">{row.points}</td><td className="text-right">{row.officialPoints}</td>
              <td className="text-right">{row.holesScored}</td>
              <td className="text-right">{row.disputedHoles ? `⚠ ${row.disputedHoles}` : '—'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs baggy-muted">Completed rounds use organiser-verified scores; active and awaiting-verification rounds use provisional scores. Total includes both. Ties use scored-hole count for display only.</p>
      {showOpenAction && onOpenTournament && <button type="button" onClick={() => onOpenTournament(tournament.id)} className="min-h-11 rounded-lg bg-baggygolf-primary px-4 text-sm font-semibold text-white">Open tournament / Enter scores →</button>}
    </section>
  );
}
