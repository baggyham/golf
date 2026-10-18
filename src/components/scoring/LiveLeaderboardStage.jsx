import { useMemo } from 'react';
import { useTournamentLiveScores } from '../../hooks/useTournamentLiveScores.js';
import { calculateTournamentLeaderboard } from '../../lib/tournamentLeaderboard.js';

function RankIcon({ position, tied }) {
  return <div className={`live-rank ${position === 1 ? 'live-rank-first' : ''}`} aria-label={`Position ${position}`}>{position === 1 ? '★' : tied ? `T${position}` : String(position).padStart(2, '0')}</div>;
}

export default function LiveLeaderboardStage({ tournament, onOpenPlayer }) {
  const { rounds, loading, error } = useTournamentLiveScores(tournament.id);
  const { rows, calculationError } = useMemo(() => {
    if (loading || error) return { rows: [], calculationError: '' };
    try { return { rows: calculateTournamentLeaderboard(tournament, rounds), calculationError: '' }; }
    catch (err) { return { rows: [], calculationError: err.message || 'Unable to calculate standings.' }; }
  }, [tournament, rounds, loading, error]);
  const activeRound = rounds.find(({ round }) => round.status === 'in_progress')?.round;
  const leader = rows[0];
  const positionCounts = new Map();
  for (const row of rows) positionCounts.set(row.position, (positionCounts.get(row.position) ?? 0) + 1);
  const jointLeaders = (positionCounts.get(1) ?? 0) > 1;
  const provisional = rows.some(row => row.hasProvisional);
  return <section aria-label="Live tournament leaderboard" className="live-stage baggy-surface">
    <div className="live-stage-top">
      <div className="live-stage-eyebrow"><span className="live-pulse" aria-hidden="true"/> {activeRound ? 'LIVE NOW' : 'TOURNAMENT STANDINGS'}</div>
      <div className="live-stage-subtitle">{activeRound?.name || 'Overall standings'} <span aria-hidden="true">·</span> {provisional ? 'Including provisional scores' : 'Verified scores'}</div>
    </div>
    {loading && <p className="baggy-muted p-5 text-sm">Loading live scores…</p>}
    {(error || calculationError) && <p className="p-5 text-sm text-red-600" role="alert">{error || calculationError}</p>}
    {!loading && !error && !calculationError && <div className="live-stage-list">
      {rows.length === 0 && <p className="baggy-muted p-5 text-sm">Standings will appear once the competition begins.</p>}
      {rows.map((row) => <div key={row.playerId} className={`live-competitor ${row.position === 1 ? 'live-competitor-leader' : ''}`}>
        <div className="live-competitor-identity"><RankIcon position={row.position} tied={(positionCounts.get(row.position) ?? 0) > 1}/>
          <div className="min-w-0"><button type="button" onClick={() => onOpenPlayer?.(row.playerId)} disabled={!onOpenPlayer} className="live-competitor-name text-left hover:underline disabled:cursor-default disabled:no-underline" aria-label={`View ${row.displayName} profile`}>{row.displayName}</button>
            <div className="live-competitor-meta">{row.holesScored} holes scored{row.hasProvisional ? ' · Provisional' : ''}{row.disputedHoles ? ` · ${row.disputedHoles} to review` : ''}</div>
          </div>
        </div>
        <div className="live-competitor-score"><div className="live-competitor-points tabular-nums">{row.points}</div><div className="live-competitor-points-label">POINTS</div>
          {row.position === 1 ? <div className="live-competitor-gap">{jointLeaders ? 'JOINT LEADER' : 'LEADER'}</div> : <div className="live-competitor-gap tabular-nums">{leader && leader.points > row.points ? `−${leader.points - row.points} pts` : 'TIED'}</div>}
        </div>
      </div>)}
    </div>}
    <div className="live-stage-footer">Official rounds use verified scores. Live scores are provisional until confirmed.</div>
  </section>;
}
