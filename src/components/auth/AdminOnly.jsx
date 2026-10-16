import { useAuth } from '../../hooks/useAuth.js';

export default function AdminOnly({ children }) {
    const { isAdmin, loading } = useAuth();

    if (loading || !isAdmin) {
        return null;
    }

    return children;
}