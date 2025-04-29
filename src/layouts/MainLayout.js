import React from 'react';
import { Box } from '@mui/material';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const MainLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <Box 
      sx={{ 
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}
    >
      {isAuthenticated && <Navigation />}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          marginLeft: { xs: 0, sm: `${drawerWidth}px` },
          overflowX: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout; 