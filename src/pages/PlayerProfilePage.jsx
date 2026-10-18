import { useEffect, useState } from 'react';
import { getPlayer } from '../repositories/playerRepository.js';
import CareerShowcase from '../components/profile/CareerShowcase.jsx';
import PlayerIdentity from '../components/profile/PlayerIdentity.jsx';

export default function PlayerProfilePage({ playerId, onBack, onOpenTournament }) {
  const [state, setState] = useState({ player: null, loading: true, error: '' });
  useEffect(() => {
    let live = true;
    setState({ player: null, loading: true, error: '' });
    getPlayer(playerId).then(player => { if (live) setState({ player, loading: false, error: player ? '' : 'Player not found.' }); })
      .catch(() => { if (live) setState({ player: null, loading: false, error: 'Unable to load player.' }); });
    return () => { live = false; };
  }, [playerId]);
  return <div className="mx-auto max-w-4xl space-y-5">
    <button type="button" onClick={onBack} className="baggy-gold min-h-11 text-sm font-semibold">← Return</button>
    {state.loading ? <p className="baggy-muted">Loading player profile…</p> : state.error ? <p role="alert">{state.error}</p> : <>
      <section className="baggy-surface rounded-2xl p-5"><PlayerIdentity player={state.player} large /></section>
      <CareerShowcase playerId={playerId} expanded onOpenTournament={onOpenTournament}/>
    </>}
  </div>;
}
