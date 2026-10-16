import { useState } from 'react';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { useAuth } from './hooks/useAuth.js';
import CreateTournament from './components/tournaments/CreateTournament.jsx';
import TournamentList from './components/tournaments/TournamentList.jsx';
import TournamentOverview from './components/tournaments/TournamentOverview.jsx';

export default function App() {
  const { isAdmin } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);

  function navigate(page) {
    if (page === 'home' || page === 'tournaments') setSelectedTournamentId(null);
    setActivePage(page);
  }

  return (
    <AppShell activePage={activePage} onNavigate={navigate}>
      {activePage === 'home' && <HomePage
        onNavigate={navigate}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />}
      {activePage === 'profile' && <AccountPage onBack={() => navigate('home')} onOpenAdmin={() => navigate('admin')} />}

      {activePage === 'admin' && isAdmin && (
        <AdminPage onBack={() => navigate('profile')} onCreate={() => navigate('createTournament')} />
      )}

      {activePage === 'tournaments' && (
        <TournamentList
          onSelectTournament={(id) => {
            setSelectedTournamentId(id);
            setActivePage('tournamentOverview');
          }}
        />
      )}

      {activePage === 'createTournament' && isAdmin && (
        <CreateTournament
          onCreated={(id) => {
            setSelectedTournamentId(id);
            setActivePage('tournamentOverview');
          }}
        />
      )}

      {activePage === 'tournamentOverview' && selectedTournamentId && (
        <TournamentOverview
          tournamentId={selectedTournamentId}
          onBack={() => navigate('tournaments')}
        />
      )}
    </AppShell>
  );
}
