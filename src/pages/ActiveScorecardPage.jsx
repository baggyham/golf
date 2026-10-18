import { useEffect, useState } from 'react';
import { getTournament } from '../repositories/tournamentRepository.js';
import { getTournamentRounds } from '../repositories/roundRepository.js';
import ScoreEntry from '../components/scoring/ScoreEntry.jsx';
import { tournamentTheme } from '../contexts/ThemeContext.jsx';

// A dedicated scoring destination: the Scorecard tab should not open
// TournamentOverview, where score entry is buried inside a round accordion.
export default function ActiveScorecardPage({ tournamentId }) {
  const [state, setState] = useState({ loading: true, tournament: null, rounds: [], error: '' });
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  useEffect(() => {
    let active = true;
    setState({ loading: true, tournament: null, rounds: [], error: '' });
    setSelectedRoundId(null);
    Promise.all([getTournament(tournamentId), getTournamentRounds(tournamentId)])
      .then(([tournament, rounds]) => {
        if (active) setState({ loading: false, tournament, rounds, error: '' });
      })
      .catch((error) => {
        if (active) setState({ loading: false, tournament: null, rounds: [], error: error.message || 'Unable to load scorecard.' });
      });
    return () => { active = false; };
  }, [tournamentId]);

  if (state.loading) return <p role="status" className="baggy-muted">Loading scorecard…</p>;
  if (state.error) return <p role="alert" className="text-red-600">{state.error}</p>;
  if (!state.tournament) return <p>Tournament not found.</p>;

  const eligible = state.rounds.filter((round) => round.scorecard?.holes?.length === 18 &&
    ['in_progress', 'awaiting_verification'].includes(round.status));
  const round = eligible.find((item) => item.id === selectedRoundId) ??
    eligible.find((item) => item.status === 'in_progress') ?? eligible[0];

  return (
    <div className="tournament-scope mx-auto flex h-full min-h-0 max-w-3xl flex-col gap-2" style={tournamentTheme(state.tournament)}>
      {eligible.length > 1 && (
        <div className="baggy-surface shrink-0 rounded-xl p-2">
          <label htmlFor="active-round" className="mb-1 block text-sm font-semibold">Round</label>
          <select id="active-round" value={round?.id ?? ''}
            onChange={(event) => setSelectedRoundId(event.target.value)}
            className="w-full min-h-11 rounded-lg border px-3" style={{ background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' }}>
            {eligible.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      )}
      {round ? <div className="min-h-0 flex-1"><ScoreEntry key={`${tournamentId}:${round.id}`} tournament={state.tournament} round={round} /></div> : (
        <section className="baggy-surface rounded-xl p-5">
          <h1 className="text-xl font-semibold">No round open for scoring</h1>
          <p className="baggy-muted mt-2 text-sm">Score entry will be available when a round starts and its 18-hole scorecard is configured.</p>
        </section>
      )}
    </div>
  );
}
