import { useEffect, useState } from 'react';
import { getAllPlayers } from '../../repositories/playerRepository.js';
import PlayerIdentity from './PlayerIdentity.jsx';

export default function PlayersDirectory({ onOpenPlayer }) {
  const [state, setState] = useState({ players: [], loading: true, error: '' });
  useEffect(() => {
    let live = true;
    getAllPlayers().then(players => { if (live) setState({ players: players.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || ''))), loading: false, error: '' }); })
      .catch(() => { if (live) setState({ players: [], loading: false, error: 'Unable to load players.' }); });
    return () => { live = false; };
  }, []);
  if (state.loading) return <p className="baggy-muted text-sm">Loading players…</p>;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  return <section className="space-y-2" aria-label="BaggyGolf players">
    {!state.players.length && <p className="baggy-muted text-sm">No players found.</p>}
    {state.players.map(player => <button key={player.id} type="button" onClick={() => onOpenPlayer(player.id)} className="baggy-surface block w-full rounded-2xl p-4 text-left transition-opacity hover:opacity-80"><PlayerIdentity player={player}/></button>)}
  </section>;
}
