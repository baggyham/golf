
import { useAuth } from '../../hooks/useAuth.js';
import LoginForm from './LoginForm.jsx';

export default function ProtectedRoute({ children }) {
    const { user, player, loading } = useAuth();

    if (loading) {
        return <p className="p-6">Loading baggygolf...</p>;
    }

    if (!user) {
        return <LoginForm />;
    }

    if (!player) {
        return (
            <p className="p-6">
                Your player profile could not be loaded.
                Please contact the administrator.
            </p>
        );
    }

    return children;
}
