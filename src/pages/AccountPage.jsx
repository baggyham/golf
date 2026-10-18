import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../contexts/ThemeContext.jsx';
import ChangePassword from '../components/auth/ChangePassword.jsx';
import CareerShowcase from '../components/profile/CareerShowcase.jsx';
import PlayerIdentity from '../components/profile/PlayerIdentity.jsx';
import PlayersDirectory from '../components/profile/PlayersDirectory.jsx';
import EditHandicap from '../components/players/EditHandicap.jsx';

export default function AccountPage({ onOpenTournament, onOpenPlayer, onSectionChange }) {
  const { player, user } = useAuth();
  const { preference, setPreference } = useTheme();
  const [tab, setTab] = useState('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  if (!player) return null;
  const tabs = [{ id: 'profile', label: 'My profile' }, { id: 'players', label: 'Players' }, { id: 'settings', label: 'Settings' }];
  return <div className="mx-auto max-w-4xl space-y-5">
    <section className="baggy-surface rounded-2xl p-4 sm:p-5"><PlayerIdentity player={player} large /></section>
    <div role="tablist" aria-label="Account sections" className="baggy-surface grid grid-cols-3 gap-1 rounded-xl p-1">{tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => { setTab(item.id); onSectionChange?.(item.id); }} className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${tab === item.id ? 'baggy-hero text-white' : 'baggy-muted'}`}>{item.label}</button>)}</div>
    {tab === 'profile' && <div role="tabpanel" aria-label="My profile"><CareerShowcase playerId={user?.uid} onOpenTournament={onOpenTournament} expanded /></div>}
    {tab === 'players' && <div role="tabpanel" aria-label="Players"><PlayersDirectory onOpenPlayer={onOpenPlayer}/></div>}
    {tab === 'settings' && <div role="tabpanel" aria-label="Settings" className="space-y-4">
      <section className="baggy-surface rounded-2xl p-5"><h2 className="mb-3 text-lg font-bold">Your handicap</h2><EditHandicap/><p className="baggy-muted mt-3 text-xs">Changes won't affect handicaps locked into an existing tournament.</p></section>
      <section className="baggy-surface rounded-2xl p-5"><h2 className="mb-3 text-lg font-bold">Appearance</h2><label className="baggy-muted block text-sm" htmlFor="account-appearance">App theme</label><select id="account-appearance" value={preference} onChange={e => setPreference(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border px-3" style={{background:'var(--surface)',color:'var(--ink)',borderColor:'var(--line)'}}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></section>
      <section className="baggy-surface rounded-2xl p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Security</h2><button type="button" onClick={() => setShowPasswordForm(value => !value)} className="baggy-gold min-h-11 text-sm font-semibold">{showPasswordForm ? 'Cancel' : 'Change password'}</button></div>{showPasswordForm && <div className="mt-4"><ChangePassword/></div>}</section>
    </div>}
  </div>;
}
