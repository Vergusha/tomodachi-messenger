import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { createAppTheme } from './theme';
import { AuthProvider } from './contexts/AuthContext';

import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Home from './pages/Home';
import ProfilePage from './pages/ProfilePage';
import { useAuth } from './contexts/AuthContext';

// Create a theme context to manage theme mode
import { createContext, useContext } from 'react';

type ThemeContextType = {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
};

export const ThemeContext = createContext<ThemeContextType>({
  toggleColorMode: () => {},
  mode: 'dark'
});

export const useThemeContext = () => useContext(ThemeContext);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return null;
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Auth routes (redirect to home if already logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return null;

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// App wrapper with providers
const AppWrapper = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

// Main app component
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <AuthRoute>
            <Login />
          </AuthRoute>
        } />
        <Route path="/register" element={
          <AuthRoute>
            <Register />
          </AuthRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

// Root component with theme
const Root = () => {
  // Check if user prefers dark mode
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Get theme preference from localStorage or use system preference
  const savedTheme = localStorage.getItem('themeMode');
  const initialMode = savedTheme ? savedTheme as 'light' | 'dark' : prefersDarkMode ? 'dark' : 'light';
  
  const [mode, setMode] = useState<'light' | 'dark'>(initialMode);
  
  // Create theme based on mode
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  
  // Create theme context value
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode],
  );
  
  // Effect to detect system theme changes
  useEffect(() => {
    if (!savedTheme) {
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode, savedTheme]);
  
  return (
    <ThemeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <AppWrapper />
        </Box>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default Root;
