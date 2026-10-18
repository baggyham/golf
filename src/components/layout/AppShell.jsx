import { useTheme } from '../../contexts/ThemeContext.jsx';

function NavIcon({ name }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    trophy: <><path d="M8 4h8v6a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 14v5m-4 2h8"/></>,
    scorecard: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[name]}</svg>;
}

export default function AppShell({ activePage, onNavigate, children, activeTournament, hideNavigation = false, hideHeader = false }) {
  const { preference, setPreference } = useTheme();
  const live = Boolean(activeTournament);
  const compactHome = activePage === 'home' && !hideNavigation && !hideHeader;
  const links = live ? [{ id: 'home', label: 'Leaderboard', icon: 'trophy' }, { id: 'scorecard', label: 'Scorecard', icon: 'scorecard' }] : [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'tournaments', label: 'Tournaments', icon: 'trophy' }];
  const currentSection = activePage === 'home' ? 'home' : activePage === 'profile' || activePage === 'admin' ? null : live && (activePage === 'activeScorecard' || activePage === 'tournamentOverview') ? 'scorecard' : 'tournaments';
  const nav = (mobile) => links.map(({ id, label, icon }) => <button key={id} type="button" onClick={() => id === 'scorecard' ? onNavigate('activeScorecard') : onNavigate(id)} aria-current={currentSection === id ? 'page' : undefined} className={mobile ? `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${currentSection === id ? 'font-bold' : 'opacity-60'}` : `flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${currentSection === id ? 'baggy-surface' : 'opacity-65 hover:opacity-100'}`} style={{color:'var(--ink)'}}><NavIcon name={icon}/><span>{label}</span></button>);
  return <div className={compactHome ? "h-[100dvh] overflow-hidden" : "min-h-screen"} style={{background:'var(--bg)',color:'var(--ink)'}}>
    {!hideHeader && <header className="border-b" style={{background:'var(--surface)',borderColor:'var(--line)'}}><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button type="button" onClick={() => onNavigate('home')} className="text-2xl font-black tracking-tight" aria-label="baggygolf home">baggygolf<span className="baggy-gold">.</span></button>
      <div className="flex items-center gap-2"><label htmlFor="baggy-appearance" className="sr-only">Appearance</label><select id="baggy-appearance" aria-label="Appearance" value={preference} onChange={event => setPreference(event.target.value)} className="min-h-11 rounded-xl border px-2 text-xs" style={{background:'var(--surface)',borderColor:'var(--line)',color:'var(--ink)'}}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><button type="button" onClick={() => onNavigate('profile')} aria-label="Open account" aria-current={activePage === 'profile' ? 'page' : undefined} className="flex h-11 w-11 items-center justify-center rounded-full border" style={{borderColor:'var(--line)'}}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg></button></div>
    </div></header>}
    {!hideNavigation && <nav aria-label="Main navigation" className="hidden border-b sm:block" style={{background:'var(--surface)',borderColor:'var(--line)'}}><div className="mx-auto flex max-w-5xl gap-2 px-6 py-2">{nav(false)}</div></nav>}
    <main className={compactHome ? "mx-auto h-[calc(100dvh-145px-env(safe-area-inset-bottom))] max-w-5xl min-h-0 overflow-y-auto px-4 py-3 sm:h-[calc(100dvh-146px)] sm:px-6 sm:py-4" : `mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 ${hideNavigation ? 'pb-8' : 'pb-28'}`}>{children}</main>
    {!hideNavigation && <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] shadow-lg sm:hidden" style={{background:'var(--surface)',borderColor:'var(--line)'}}><div className="mx-auto grid max-w-md grid-cols-2">{nav(true)}</div></nav>}
  </div>;
}
