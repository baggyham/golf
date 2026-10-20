import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './contexts/ThemeContext.jsx';
import { tournamentTier, majorThemeById } from './lib/majorThemes.js';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import CreateTournament from './components/tournaments/CreateTournament.jsx';
import TournamentList from './components/tournaments/TournamentList.jsx';
import TournamentOverview from './components/tournaments/TournamentOverview.jsx';
import ActiveScorecardPage from './pages/ActiveScorecardPage.jsx';
import ActiveTournamentLayout from './components/layout/ActiveTournamentLayout.jsx';
import './styles/active-tournament.css';

export default function App() {
  const { setActiveMajorId } = useTheme();
  const [activePage, setActivePage] = useState('home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);
  const [draftManagementOpen, setDraftManagementOpen] = useState(false);
  const onActiveTournamentChange = useCallback((t) => setActiveTournament(t), []);
  useEffect(() => {
    const major = activeTournament && tournamentTier(activeTournament) === 'major'
      ? majorThemeById(activeTournament.majorThemeId)
      : null;
    setActiveMajorId(major?.id ?? null);
    return () => setActiveMajorId(null);
  }, [activeTournament, setActiveMajorId]);

  function navigate(page) {
    if (page === 'activeScorecard' && activeTournament) {
      setSelectedTournamentId(activeTournament.id);
      setActivePage('activeScorecard');
      return;
    }
    if (page === 'home' || page === 'tournaments') setSelectedTournamentId(null);
    setActivePage(page);
  }

  return (
    <AppShell activePage={activePage} onNavigate={navigate} activeTournament={activeTournament} hideNavigation={activePage === 'createTournament' || activePage === 'tournamentOverview'} hideHeader={activePage === 'createTournament' || (activePage === 'tournamentOverview' && draftManagementOpen)}>
      {activeTournament && (activePage === 'home' || activePage === 'activeScorecard') ? (
        <ActiveTournamentLayout tournament={activeTournament} showHeading={activePage !== 'activeScorecard'}>
          <div className={activePage === 'home' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={activePage !== 'home'}>
      <HomePage
        onActiveTournamentChange={onActiveTournamentChange}
        onNavigate={navigate}
        onManageTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />
          </div>
          <div className={activePage === 'activeScorecard' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={activePage !== 'activeScorecard'}>
            <ActiveScorecardPage tournamentId={activeTournament.id} />
          </div>
        </ActiveTournamentLayout>
      ) : activePage === 'home' ? (
      <HomePage
        onActiveTournamentChange={onActiveTournamentChange}
        onNavigate={navigate}
        onManageTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />
      ) : null}
      {activePage === 'profile' && <AccountPage onBack={() => navigate('home')} onOpenTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }} />}


      {activePage === 'tournaments' && (
        <TournamentList
          onCreate={() => navigate('createTournament')}
          onSelectTournament={(id) => {
            setSelectedTournamentId(id);
            setActivePage('tournamentOverview');
          }}
        />
      )}

      {activePage === 'createTournament' && (
        <CreateTournament
          onCancel={() => navigate('tournaments')}
          onCreated={(id) => {
            setSelectedTournamentId(id);
            setActivePage('tournamentOverview');
          }}
        />
      )}


      {activePage === 'tournamentOverview' && selectedTournamentId && (
        <TournamentOverview
          tournamentId={selectedTournamentId}
          onDraftManagementChange={setDraftManagementOpen}
          onBack={() => navigate(activeTournament?.id === selectedTournamentId ? 'home' : 'tournaments')}
        />
      )}
    </AppShell>
  );
}
