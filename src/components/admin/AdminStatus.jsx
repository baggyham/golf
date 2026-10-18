import { useAuth } from '../../hooks/useAuth.js';

export default function AdminStatus() {
    const { player, isAdmin } = useAuth();

    return (
        <div className="rounded-xl border border-baggygolf-line bg-baggygolf-surface p-4">
            <h2 className="font-semibold">Account permissions</h2>

            <p className="mt-2 text-sm">
                Player: {player?.displayName ?? 'Unknown'}
            </p>

            <p className="text-sm">
                Role: {isAdmin ? 'Administrator' : 'Player'}
            </p>
        </div>
    );
}