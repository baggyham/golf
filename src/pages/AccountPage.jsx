import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import ChangePassword from '../components/auth/ChangePassword.jsx';
import AdminOnly from '../components/auth/AdminOnly.jsx';
import AdminStatus from '../components/admin/AdminStatus.jsx';

export default function AccountPage({ onBack, onOpenAdmin }) {
  const { player } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  if (!player) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-fairway-800 hover:underline">
        ← Back to Home
      </button>
      <header>
        <h1 className="text-2xl font-bold text-fairway-950">Your account</h1>
        <p className="mt-1 text-sm text-gray-500">Personal details and security settings.</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-fairway-950">Personal details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Name</dt><dd className="font-medium">{player.displayName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500">Username</dt><dd className="font-medium">@{player.username}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-fairway-950">Security</h2>
          <button type="button" onClick={() => setShowPasswordForm((value) => !value)}
            className="text-sm font-semibold text-fairway-800 hover:underline">
            {showPasswordForm ? 'Cancel' : 'Change password'}
          </button>
        </div>
        {showPasswordForm && <ChangePassword />}
      </section>

      <AdminOnly>
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-fairway-950">Administration</h2>
          <p className="text-sm text-gray-500">Tournament setup and management.</p>
          <button type="button" onClick={onOpenAdmin} className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-fairway-950 hover:bg-gray-50">Open admin →</button>
          <AdminStatus />
        </section>
      </AdminOnly>
    </div>
  );
}
