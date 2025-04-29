import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import theme from './theme';

// Компоненты страниц
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Welcome from './pages/Welcome';
import ChildrenList from './pages/ChildrenList';
import Groups from './pages/Groups';
import Schedule from './pages/Schedule';
import Attendance from './pages/Attendance';
import Progress from './pages/Progress';
import Services from './pages/Services';
import Finance from './pages/Finance';
import Recommendations from './pages/Recommendations';
import Menu from './pages/Menu';
import Contacts from './pages/Contacts';
import Users from './pages/Users';
import Profile from './pages/Profile';

// Компонент загрузки
const LoadingScreen = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

// Защищенный маршрут
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/welcome" />;
  }

  return <Layout>{children}</Layout>;
};

// Публичный маршрут
const PublicRoute = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return children;
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={3000}>
        <AuthProvider>
          <AccessibilityProvider>
            <Router>
              <Routes>
                {/* Публичные маршруты */}
                <Route
                  path="/"
                  element={
                    <PublicRoute>
                      <Home />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <PublicRoute>
                      <Contacts />
                    </PublicRoute>
                  }
                />

                {/* Защищенные маршруты */}
                <Route
                  path="/welcome"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'psychologist']}>
                      <Welcome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/children"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'psychologist']}>
                      <ChildrenList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'psychologist']}>
                      <Groups />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/schedule"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent']}>
                      <Schedule />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                      <Attendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progress"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'psychologist']}>
                      <Progress />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent']}>
                      <Services />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Finance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recommendations"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'psychologist']}>
                      <Recommendations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/menu"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent']}>
                      <Menu />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'teacher', 'parent', 'psychologist']}>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Перенаправление для неизвестных маршрутов */}
                <Route
                  path="*"
                  element={<Navigate to="/" replace />}
                />
              </Routes>
            </Router>
          </AccessibilityProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
