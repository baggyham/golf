import { useMemo } from 'react';
import { useLiveScores } from '../../hooks/useLiveScores.js';
import { calculateProvisionalLeaderboard } from '../../lib/leaderboard.js';

export default function LiveLeaderboard({ tournament, round }) {
  const { entries, loading, error } = useLiveScores(tournament.id, round.id);
  const { standings, calculationError } = useMemo(() => {
    try {
      return { standings: calculateProvisionalLeaderboard(tournament, round, entries), calculationError: '' };
    } catch (reason) {
      return { standings: [], calculationError: reason.message || 'Unable to calculate standings.' };
    }
  }, [tournament, round, entries]);

  return (
    <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" aria-label="Live leaderboard">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Live leaderboard</h3>
        <span className="text-xs text-gray-500">Provisional</span>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading live scores…</p>}
      {(error || calculationError) && <p role="alert" className="text-sm text-red-600">{error || calculationError}</p>}
      {!loading && !error && !calculationError && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left">
              <th className="py-2 pr-2">Player</th><th className="px-2 text-right">Pts</th>
              <th className="px-2 text-right">Holes</th><th className="pl-2 text-right">Disputes</th>
            </tr></thead>
            <tbody>{standings.map((item) => (
              <tr key={item.playerId} className="border-b last:border-0">
                <td className="py-3 pr-2">{item.position}. {item.displayName}</td>
                <td className="px-2 text-right font-semibold">{item.points}</td>
                <td className="px-2 text-right">{item.holesScored}/18</td>
                <td className="pl-2 text-right">{item.disputedHoles ? `⚠ ${item.disputedHoles}` : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500">Self-entered scores take priority. Disputed and incomplete results are not official. Rankings use total points; ties are provisional.</p>
    </section>
  );
}
