import React from 'react';
import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { AccessibilityProvider } from '../contexts/AccessibilityContext';

const RootLayout = () => {
  return (
    <AuthProvider>
      <AccessibilityProvider>
        <Outlet />
      </AccessibilityProvider>
    </AuthProvider>
  );
};

export default RootLayout; 