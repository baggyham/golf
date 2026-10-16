
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import EditHandicap from './EditHandicap.jsx';
import ChangePassword from '../auth/ChangePassword.jsx';
import AdminStatus from '../admin/AdminStatus.jsx';
import AdminOnly from "../auth/AdminOnly.jsx";

export default function PlayerProfile() {
    const { player } = useAuth();
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    if (!player) {
        return null;
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <AdminOnly>
                <AdminStatus />
            </AdminOnly>
            {/* Welcome */}
            <div className="rounded-2xl bg-fairway-950 p-6 text-white">
                <p className="text-sm text-green-200">MY PROFILE</p>

                <h1 className="mt-2 text-2xl font-bold">
                    Welcome back, {player.displayName}
                </h1>

                <p className="mt-1 text-sm text-green-100">
                    Ready for your next round?
                </p>
            </div>

            {/* Player information */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="text-lg font-semibold text-fairway-950">
                    Player details
                </h2>

                <div className="mt-4 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Name</span>
                        <span className="font-medium">{player.displayName}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-gray-500">Username</span>
                        <span className="font-medium">@{player.username}</span>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                        <EditHandicap />
                    </div>
                </div>
            </section>

            {/* Account settings */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-fairway-950">
                        Account settings
                    </h2>

                    <button
                        type="button"
                        onClick={() => setShowPasswordForm((value) => !value)}
                        className="text-sm font-medium text-fairway-800 hover:underline"
                    >
                        {showPasswordForm ? 'Cancel' : 'Change password'}
                    </button>
                </div>

                {showPasswordForm && <ChangePassword />}
            </section>
        </div>
    );
}
