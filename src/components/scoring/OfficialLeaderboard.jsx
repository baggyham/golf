import { useMemo } from 'react';
import { useOfficialScores } from '../../hooks/useOfficialScores.js';
import { calculateOfficialLeaderboard } from '../../lib/officialLeaderboard.js';

export default function OfficialLeaderboard({ tournament, round }) {
  const {scores,loading,error}=useOfficialScores(tournament.id,round.id);
  const result=useMemo(()=>{
    if(loading || error) return {rows:[],calculationError:''};
    try { return {rows:calculateOfficialLeaderboard(tournament,round,scores),calculationError:''}; }
    catch(err){ return {rows:[],calculationError:err.message}; }
  },[tournament,round,scores,loading,error]);
  return <section className="space-y-3 rounded-xl border border-baggygolf-line bg-baggygolf-surface p-4" aria-label="Official round standings">
    <div className="flex justify-between"><h3 className="font-semibold">Official round standings</h3><span className="text-xs text-green-700">Verified</span></div>
    {loading && <p>Loading official results…</p>}
    {(error || result.calculationError) && <p role="alert" className="text-sm text-red-600">{error || result.calculationError}</p>}
    {!loading && !error && !result.calculationError && <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr><th className="py-2 text-left">Player</th><th className="py-2 text-right">Points</th><th className="py-2 text-right">Holes</th></tr></thead>
      <tbody>{result.rows.map((r)=><tr key={r.playerId} className="border-t"><td className="py-3">{r.position}. {r.displayName}</td><td className="text-right font-semibold">{r.points}</td><td className="text-right">{r.holesScored}/18</td></tr>)}</tbody>
    </table></div>}
  </section>;
}
