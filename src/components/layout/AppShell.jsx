const mainLinks = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'tournaments', label: 'Tournaments', icon: 'trophy' },
];

function NavIcon({ name }) {
  if (name === 'home') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9.5V21h14V9.5M9 21v-7h6v7" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 14v5m-4 2h8m-6-2h4" />
    </svg>
  );
}

export default function AppShell({ activePage, onNavigate, children }) {
  const currentSection = activePage === 'home' ? 'home' : activePage === 'profile' ? null : 'tournaments';

  return (
    <div className="min-h-screen bg-fairway-50 text-slate-900">
      <header className="border-b border-white/10 bg-fairway-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-xl font-black tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-label="Fairway home"
          >
            <span className="mr-2 text-emerald-300">⚑</span>fairway
          </button>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label="Open your profile and account settings"
            aria-current={activePage === 'profile' ? 'page' : undefined}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${activePage === 'profile' ? 'border-emerald-300 bg-white/20' : 'border-white/30 hover:bg-white/10'}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </svg>
          </button>
        </div>
      </header>

      <nav aria-label="Main navigation" className="hidden border-b border-slate-200 bg-white sm:block">
        <div className="mx-auto flex max-w-5xl gap-2 px-6 py-2">
          {mainLinks.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={currentSection === id ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${currentSection === id ? 'bg-fairway-950 text-white' : 'text-slate-600 hover:bg-fairway-100'}`}
            >
              <NavIcon name={icon} />{label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 sm:py-8">{children}</main>

      <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.06)] sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-2">
          {mainLinks.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={currentSection === id ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${currentSection === id ? 'text-fairway-950' : 'text-slate-500'}`}
            >
              <NavIcon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
