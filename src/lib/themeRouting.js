import { majorThemeById, tournamentTier } from './majorThemes.js';

/** Which Major preset should own the app palette for this screen? */
export function majorThemeIdForView({ activePage, activeTournament, selectedTournamentId, overviewTournament }) {
  const tournament = activePage === 'tournamentOverview'
    ? (overviewTournament?.id === selectedTournamentId ? overviewTournament : null)
    : activeTournament;

  if (tournamentTier(tournament) !== 'major') return null;
  return majorThemeById(tournament.majorThemeId)?.id ?? null;
}
