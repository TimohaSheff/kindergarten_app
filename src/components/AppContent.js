import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';
import Layout from './Layout';
import Login from '../pages/Login';
import Schedule from '../pages/Schedule';
import Progress from '../pages/Progress';
import Welcome from '../pages/Welcome';
import Settings from '../pages/Settings';
import Groups from '../pages/Groups';
import Attendance from '../pages/Attendance';
import AttendancePage from '../pages/AttendancePage';
import Profile from '../pages/Profile';
import ChildrenList from '../pages/ChildrenList';
import Home from '../pages/Home';
import Contacts from '../pages/Contacts';
import Recommendations from '../pages/Recommendations';
import Menu from './Menu';
import Users from '../pages/Users';
import Finance from '../pages/Finance';
import Services from '../pages/Services';

const LoadingScreen = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 2,
      bgcolor: 'background.default'
    }}
  >
    <CircularProgress size={48} />
    <Typography variant="h6" color="text.secondary">
      Загрузка...
    </Typography>
  </Box>
);

const AppContent = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Определяем доступные маршруты для каждой роли
  const roleRoutes = {
    admin: [
      '/dashboard',
      '/profile',
      '/settings',
      '/dashboard/users',
      '/groups',
      '/children',
      '/schedule',
      '/progress',
      '/recommendations',
      '/menu',
      '/attendance',
      '/finance',
      '/services',
      '/contacts'
    ],
    teacher: [
      '/dashboard',
      '/profile',
      '/settings',
      '/schedule',
      '/progress',
      '/menu',
      '/recommendations',
      '/services',
      '/finance',
      '/attendance',
      '/children',
      '/contacts'
    ],
    parent: [
      '/dashboard',
      '/profile',
      '/settings',
      '/schedule',
      '/progress',
      '/recommendations',
      '/menu',
      '/finance',
      '/services',
      '/attendance',
      '/contacts'
    ],
    psychologist: [
      '/dashboard',
      '/profile',
      '/settings',
      '/groups',
      '/progress',
      '/recommendations',
      '/children',
      '/contacts'
    ]
  };

  // Функция проверки доступа к маршруту
  const hasAccess = (path) => {
    // Публичные маршруты, доступные всем
    const publicRoutes = ['/', '/login', '/contacts'];
    if (publicRoutes.includes(path)) return true;
    
    // Для защищенных маршрутов проверяем авторизацию и роль
    if (!isAuthenticated) return false;
    if (!user?.role) return false;
    return roleRoutes[user.role]?.includes(path);
  };

  // Компонент для защищенных маршрутов
  const ProtectedRoute = ({ path, children }) => {
    if (!hasAccess(path)) {
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <Routes>
      {/* Публичные маршруты */}
      <Route element={<Layout isPublic />}>
        <Route path="/" element={<Home />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
        } />
      </Route>

      {/* Защищенные маршруты */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={
          <ProtectedRoute path="/dashboard">
            <Welcome />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute path="/profile">
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute path="/settings">
            <Settings />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/users" element={
          <ProtectedRoute path="/dashboard/users">
            <Users />
          </ProtectedRoute>
        } />

        <Route path="/groups" element={
          <ProtectedRoute path="/groups">
            <Groups />
          </ProtectedRoute>
        } />

        <Route path="/children" element={
          <ProtectedRoute path="/children">
            <ChildrenList canEdit={['admin', 'teacher'].includes(user?.role)} />
          </ProtectedRoute>
        } />

        <Route path="/schedule" element={
          <ProtectedRoute path="/schedule">
            <Schedule 
              canEdit={['admin', 'teacher'].includes(user?.role)}
              showOnlyOwnGroup={user?.role === 'teacher'}
            />
          </ProtectedRoute>
        } />

        <Route path="/progress/*" element={
          <ProtectedRoute path="/progress">
            <Progress 
              canEdit={['admin', 'psychologist'].includes(user?.role)}
              showAllChildren={['admin', 'psychologist'].includes(user?.role)}
              showOnlyOwnGroup={user?.role === 'teacher'}
              showOnlyOwnChild={user?.role === 'parent'}
            />
          </ProtectedRoute>
        } />

        <Route path="/recommendations" element={
          <ProtectedRoute path="/recommendations">
            <Recommendations canEdit={['admin', 'psychologist'].includes(user?.role)} />
          </ProtectedRoute>
        } />

        <Route path="/menu" element={
          <ProtectedRoute path="/menu">
            <Menu 
              canEdit={['admin', 'teacher'].includes(user?.role)}
              showOnlyOwnGroup={user?.role === 'teacher'}
            />
          </ProtectedRoute>
        } />

        <Route path="/attendance" element={
          <ProtectedRoute path="/attendance">
            <AttendancePage />
          </ProtectedRoute>
        } />

        <Route path="/finance" element={
          <ProtectedRoute path="/finance">
            <Finance 
              canEdit={['admin', 'teacher'].includes(user?.role)}
              canSendReminders={['admin', 'teacher'].includes(user?.role)}
            />
          </ProtectedRoute>
        } />

        <Route path="/services" element={
          <ProtectedRoute path="/services">
            <Services 
              canEdit={['admin', 'teacher'].includes(user?.role)}
              canManageRequests={['admin', 'teacher'].includes(user?.role)}
            />
          </ProtectedRoute>
        } />
      </Route>

      {/* Перенаправление на главную для несуществующих маршрутов */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppContent; 