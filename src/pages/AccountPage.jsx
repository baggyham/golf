import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import ChangePassword from '../components/auth/ChangePassword.jsx';
import CareerShowcase from '../components/profile/CareerShowcase.jsx';
import EditHandicap from '../components/players/EditHandicap.jsx';

export default function AccountPage({ onBack, onOpenTournament }) {
  const { player, user } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  if (!player) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-baggygolf-800 hover:underline">
        ← Back to Home
      </button>
      <header>
        <h1 className="text-2xl font-bold text-baggygolf-950">Your account</h1>
        <p className="mt-1 text-sm text-baggygolf-muted">Personal details and security settings.</p>
      </header>

      <section className="rounded-xl border border-baggygolf-line bg-baggygolf-surface p-5">
        <h2 className="text-lg font-semibold text-baggygolf-950">Personal details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-baggygolf-muted">Name</dt><dd className="font-medium">{player.displayName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-baggygolf-muted">Username</dt><dd className="font-medium">@{player.username}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Handicap Index" className="rounded-xl border border-baggygolf-line bg-baggygolf-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-baggygolf-950">Your handicap</h2>
        <EditHandicap />
        <p className="baggy-muted mt-3 text-xs">Changes won't affect handicaps already locked into a tournament.</p>
      </section>

      <CareerShowcase playerId={user?.uid} onOpenTournament={onOpenTournament} expanded />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-baggygolf-950">Security</h2>
          <button type="button" onClick={() => setShowPasswordForm((value) => !value)}
            className="text-sm font-semibold text-baggygolf-800 hover:underline">
            {showPasswordForm ? 'Cancel' : 'Change password'}
          </button>
        </div>
        {showPasswordForm && <ChangePassword />}
      </section>


    </div>
  );
}
