import { useState, useCallback } from 'react';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import CreateTournament from './components/tournaments/CreateTournament.jsx';
import TournamentList from './components/tournaments/TournamentList.jsx';
import TournamentOverview from './components/tournaments/TournamentOverview.jsx';
import ActiveScorecardPage from './pages/ActiveScorecardPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);
  const [draftManagementOpen, setDraftManagementOpen] = useState(false);
  const onActiveTournamentChange = useCallback((t) => setActiveTournament(t), []);

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
    <AppShell activePage={activePage} onNavigate={navigate} activeTournament={activeTournament} hideNavigation={activePage === 'createTournament' || activePage === 'tournamentOverview'} hideHeader={activePage === 'createTournament'}>
      {activePage === 'home' && <HomePage
        onActiveTournamentChange={onActiveTournamentChange}
        onNavigate={navigate}
        onManageTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />}
      {activePage === 'profile' && <AccountPage onBack={() => navigate('home')} />}


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

      {activePage === 'activeScorecard' && activeTournament?.id && (
        <ActiveScorecardPage tournamentId={activeTournament.id} />
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
