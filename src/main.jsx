import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

import './styles/tailwind.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        </AuthProvider>
    </StrictMode>,
);