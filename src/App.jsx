import { useState, useCallback, useEffect } from 'react';
import { useTheme } from './contexts/ThemeContext.jsx';
import { majorThemeIdForView } from './lib/themeRouting.js';
import AppShell from './components/layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import PlayerProfilePage from './pages/PlayerProfilePage.jsx';
import CreateTournament from './components/tournaments/CreateTournament.jsx';
import TournamentList from './components/tournaments/TournamentList.jsx';
import CourseLibraryPage from './pages/CourseLibraryPage.jsx';
import TournamentOverview from './components/tournaments/TournamentOverview.jsx';
import ActiveScorecardPage from './pages/ActiveScorecardPage.jsx';
import ActiveTournamentLayout from './components/layout/ActiveTournamentLayout.jsx';
import './styles/active-tournament.css';

export default function App() {
  const { setActiveMajorId } = useTheme();
  const [activePage, setActivePage] = useState('home');
  const [accountSection, setAccountSection] = useState('profile');
  const [profilePlayerId, setProfilePlayerId] = useState(null);
  const [playerProfileOrigin, setPlayerProfileOrigin] = useState('profile');
  const [returnPage, setReturnPage] = useState('home');
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [activeTournament, setActiveTournament] = useState(null);
  const [overviewTournament, setOverviewTournament] = useState(null);
  const [draftManagementOpen, setDraftManagementOpen] = useState(false);
  const onActiveTournamentChange = useCallback((t) => setActiveTournament(t), []);
  const onOverviewTournamentChange = useCallback((t) => setOverviewTournament(t), []);
  useEffect(() => {
    // The selected draft/managed tournament owns the palette while its setup is open.
    // On other screens, use the active competition (or the standard BaggyGolf theme).
    const majorId = majorThemeIdForView({
      activePage,
      activeTournament,
      selectedTournamentId,
      overviewTournament,
    });
    setActiveMajorId(majorId);
    return () => setActiveMajorId(null);
  }, [activePage, activeTournament, selectedTournamentId, overviewTournament, setActiveMajorId]);

  function openPlayerProfile(id) {
    if (!id) return;
    setPlayerProfileOrigin(activePage);
    if (activePage !== 'profile') setReturnPage(activePage);
    setProfilePlayerId(id);
    setActivePage('playerProfile');
  }
  function navigate(page) {
    if (page === 'profile' && activePage !== 'playerProfile') setReturnPage(activePage);
    if (page === 'activeScorecard' && activeTournament) {
      setSelectedTournamentId(activeTournament.id);
      setActivePage('activeScorecard');
      return;
    }
    if (page === 'home' || page === 'tournaments') setSelectedTournamentId(null);
    setActivePage(page);
  }

  return (
    <AppShell activePage={activePage} accountSection={accountSection} onNavigate={navigate} activeTournament={activeTournament} hideNavigation={activePage === 'createTournament' || activePage === 'tournamentOverview'} hideHeader={activePage === 'createTournament' || (activePage === 'tournamentOverview' && draftManagementOpen)}>
      {activeTournament && (activePage === 'home' || activePage === 'activeScorecard' || ((activePage === 'profile' || activePage === 'playerProfile') && (returnPage === 'home' || returnPage === 'activeScorecard'))) ? (
        <div className={activePage === 'profile' || activePage === 'playerProfile' ? 'hidden' : 'flex min-h-0 flex-1 flex-col'} aria-hidden={activePage === 'profile' || activePage === 'playerProfile'}><ActiveTournamentLayout tournament={activeTournament}>
          <div className={(activePage === 'home' || ((activePage === 'profile' || activePage === 'playerProfile') && returnPage === 'home')) ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={activePage !== 'home'}>
      <HomePage
        onActiveTournamentChange={onActiveTournamentChange}
        onOpenPlayer={openPlayerProfile}
        onNavigate={navigate}
        onManageTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />
          </div>
          <div className={(activePage === 'activeScorecard' || ((activePage === 'profile' || activePage === 'playerProfile') && returnPage === 'activeScorecard')) ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={activePage !== 'activeScorecard'}>
            <ActiveScorecardPage tournamentId={activeTournament.id} />
          </div>
        </ActiveTournamentLayout></div>
      ) : activePage === 'home' ? (
      <HomePage
        onActiveTournamentChange={onActiveTournamentChange}
        onOpenPlayer={openPlayerProfile}
        onNavigate={navigate}
        onManageTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }}
        onOpenTournament={(id) => {
          setSelectedTournamentId(id);
          setActivePage('tournamentOverview');
        }}
      />
      ) : null}
      {activePage === 'profile' && <AccountPage onOpenPlayer={openPlayerProfile} onSectionChange={setAccountSection} onOpenTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }} />}


      {activePage === 'playerProfile' && <PlayerProfilePage playerId={profilePlayerId} onBack={() => navigate(playerProfileOrigin === 'playerProfile' ? 'profile' : playerProfileOrigin)} onOpenTournament={(id) => { setSelectedTournamentId(id); setActivePage('tournamentOverview'); }} />}
      {activePage === 'tournaments' && (
        <TournamentList
          onCreate={() => navigate('createTournament')}
          onOpenCourseLibrary={() => navigate('courseLibrary')}
          onSelectTournament={(id) => {
            setSelectedTournamentId(id);
            setActivePage('tournamentOverview');
          }}
        />
      )}

      {activePage === 'courseLibrary' && <CourseLibraryPage onBack={() => navigate('tournaments')} />}

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
          onTournamentChange={onOverviewTournamentChange}
          onDraftManagementChange={setDraftManagementOpen}
          onOpenPlayer={openPlayerProfile}
          onBack={() => navigate(activeTournament?.id === selectedTournamentId ? 'home' : 'tournaments')}
        />
      )}
    </AppShell>
  );
}
