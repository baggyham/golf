import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

import './styles/tailwind.css';
import './styles/theme.css';
import { ThemeProvider } from './contexts/ThemeContext.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <ThemeProvider>
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        </ThemeProvider>
        </AuthProvider>
    </StrictMode>,
);