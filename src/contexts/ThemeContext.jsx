import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'baggygolf-appearance';
const DEFAULT_THEME = { primary: '#173D30', accent: '#D9BA77' };

function initialPreference() {
  try { return ['light', 'dark', 'system'].includes(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : 'system'; }
  catch { return 'system'; }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(initialPreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  function changePreference(value) {
    if (!['light', 'dark', 'system'].includes(value)) return;
    setPreference(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* private browsing */ }
  }
  const value = useMemo(() => ({ preference, mode, setPreference: changePreference }), [preference, mode]);
  return <ThemeContext.Provider value={value}><div data-appearance={mode} className="baggy-theme min-h-screen">{children}</div></ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}

// Only allow hex colours through to inline CSS custom properties.
export function tournamentTheme(tournament) {
  const raw = tournament?.theme;
  const valid = (value, fallback) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  return { '--tournament-primary': valid(raw?.primary, DEFAULT_THEME.primary), '--tournament-accent': valid(raw?.accent, DEFAULT_THEME.accent) };
}
