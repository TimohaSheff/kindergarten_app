import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  alpha,
  CircularProgress
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  ChildCare as ChildCareIcon,
  Schedule as ScheduleIcon,
  EventNote as AttendanceIcon,
  Assessment as ProgressIcon,
  LocalActivity as ServicesIcon,
  Comment as RecommendationsIcon,
  RestaurantMenu as MenuItemIcon,
  Contacts as ContactsIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import { getPhotoUrl } from '../utils/photoUtils';

const drawerWidth = 280;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    flexGrow: 1,
    padding: '12px',
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: `calc(100% - ${drawerWidth}px)`,
  }),
);

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
  color: theme.palette.text.primary,
  width: `calc(100% - ${drawerWidth}px)`,
  marginLeft: drawerWidth,
  zIndex: theme.zIndex.drawer + 1,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(99, 102, 241, 0.1)',
    position: 'fixed',
    height: '100vh',
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: '6px'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderRadius: '3px'
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'transparent'
    }
  }
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));

const StyledListItem = styled(ListItem)(({ theme, active }) => ({
  margin: theme.spacing(0.5, 1),
  borderRadius: '12px',
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.04),
    transform: 'translateX(4px)'
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
  position: 'relative',
  paddingBottom: theme.spacing(2),
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '48px',
    height: '4px',
    background: theme.palette.primary.main,
    borderRadius: '2px'
  }
}));

const Layout = () => {
  const theme = useTheme();
  const { user, logout, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const pageColors = {
    '/': theme.palette.primary.main,
    '/welcome': theme.palette.primary.dark,
    '/groups': theme.palette.success.main,
    '/schedule': theme.palette.warning.main,
    '/progress': theme.palette.error.main,
    '/services': theme.palette.secondary.main,
    '/recommendations': theme.palette.info.main,
    '/menu': theme.palette.success.dark,
    '/users': theme.palette.info.dark,
    '/contacts': theme.palette.grey[700],
    '/profile': theme.palette.grey[700],
    '/children': theme.palette.primary.light,
    '/attendance': theme.palette.warning.dark
  };

  // Проверка аутентификации
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [loading, isAuthenticated]);

  // Обработка редиректа
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/login', { state: { from: location.pathname } });
    }
  }, [shouldRedirect, navigate, location.pathname]);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ background: 'linear-gradient(135deg, #F8FAFF 0%, #F0F7FF 100%)' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const menuItems = [
    { title: 'Главная', icon: HomeIcon, path: '/', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Дети', icon: ChildCareIcon, path: '/children', roles: ['teacher', 'parent'] },
    { title: 'Группы', icon: GroupIcon, path: '/groups', roles: ['admin', 'teacher', 'psychologist'] },
    { title: 'Расписание', icon: ScheduleIcon, path: '/schedule', roles: ['admin', 'teacher', 'parent'] },
    { title: 'Посещаемость', icon: AttendanceIcon, path: '/attendance', roles: ['admin', 'teacher'] },
    { title: 'Прогресс', icon: ProgressIcon, path: '/progress', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Услуги', icon: ServicesIcon, path: '/services', roles: ['admin', 'parent'] },
    { title: 'Рекомендации', icon: RecommendationsIcon, path: '/recommendations', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Меню', icon: MenuItemIcon, path: '/menu', roles: ['admin', 'teacher', 'parent'] },
    { title: 'Пользователи', icon: PersonIcon, path: '/users', roles: ['admin'] },
    { title: 'Контакты', icon: ContactsIcon, path: '/contacts', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      background: 'linear-gradient(135deg, #F8FAFF 0%, #F0F7FF 100%)'
    }}>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700
            }}
          >
            МБОУ "Образовательный центр № 4"
          </Typography>
          <IconButton 
            onClick={handleMenuClick} 
            size="small"
            sx={{
              border: '2px solid',
              borderColor: 'primary.light',
              p: 0.5
            }}
          >
            <Avatar sx={{ 
              bgcolor: 'primary.main',
              background: user?.photo_path ? 'none' : 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
              width: 32, 
              height: 32 
            }}
              src={user?.photo_path ? getPhotoUrl(user.photo_path) : undefined}
            >
              {!user?.photo_path && (user?.first_name?.[0] || user?.email?.[0]?.toUpperCase())}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/profile')} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" sx={{ color: pageColors['/profile'] }} />
              </ListItemIcon>
              <ListItemText primary="Профиль" />
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} />
              </ListItemIcon>
              <ListItemText primary="Выйти" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </StyledAppBar>
      <StyledDrawer variant="permanent">
        <DrawerHeader>
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{ 
              fontWeight: 600,
              color: 'primary.main',
              py: 2
            }}
          >
            Навигация
          </Typography>
        </DrawerHeader>
        <Divider sx={{ borderColor: 'rgba(99, 102, 241, 0.08)' }} />
        <List sx={{ pt: 2 }}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const color = pageColors[item.path];
            
            return (
              <StyledListItem
                button
                key={item.path}
                onClick={() => navigate(item.path)}
                active={isActive ? 1 : 0}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? color : alpha(color, 0.6),
                  minWidth: 40
                }}>
                  <Icon />
                </ListItemIcon>
                <ListItemText 
                  primary={item.title}
                  primaryTypographyProps={{
                    sx: {
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? color : 'text.primary'
                    }
                  }}
                />
              </StyledListItem>
            );
          })}
        </List>
      </StyledDrawer>
      <Main>
        <DrawerHeader />
        <Box sx={{ p: 1 }}>
          <Outlet context={{ PageTitle }} />
        </Box>
      </Main>
    </Box>
  );
};

export default Layout; 