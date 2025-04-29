import React, { useState } from 'react';
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
  alpha
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
  AttachMoney as FinanceIcon,
  Comment as RecommendationsIcon,
  RestaurantMenu as MenuItemIcon,
  Contacts as ContactsIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';

const drawerWidth = 280;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    flexGrow: 1,
    padding: '24px',
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: `calc(100% - ${drawerWidth}px)`,
  }),
);

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  color: theme.palette.text.primary,
  width: `calc(100% - ${drawerWidth}px)`,
  marginLeft: drawerWidth,
  zIndex: theme.zIndex.drawer + 1
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.12)',
    position: 'fixed',
    height: '100vh',
    overflowY: 'hidden'
  },
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
  borderRadius: '8px',
  backgroundColor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
  color: active ? theme.palette.primary.main : theme.palette.text.primary,
  '&:hover': {
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.05),
  }
}));

const menuItemColors = {
  '/': '#1976d2',
  '/welcome': '#1976d2',
  '/children': '#2196F3',
  '/groups': '#4CAF50',
  '/schedule': '#FF9800',
  '/attendance': '#F44336',
  '/progress': '#E91E63',
  '/services': '#9C27B0',
  '/finance': '#673AB7',
  '/recommendations': '#3F51B5',
  '/menu': '#009688',
  '/contacts': '#795548',
  '/users': '#607D8B',
  '/profile': '#455A64'
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  if (!user) {
    return null;
  }

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const menuItems = [
    { title: 'Главная', icon: HomeIcon, path: '/', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Дети', icon: ChildCareIcon, path: '/children', roles: ['teacher', 'parent'] },
    { title: 'Группы', icon: GroupIcon, path: '/groups', roles: ['admin', 'teacher', 'psychologist'] },
    { title: 'Расписание', icon: ScheduleIcon, path: '/schedule', roles: ['admin', 'teacher', 'parent'] },
    { title: 'Посещаемость', icon: AttendanceIcon, path: '/attendance', roles: ['admin', 'teacher'] },
    { title: 'Прогресс', icon: ProgressIcon, path: '/progress', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Услуги', icon: ServicesIcon, path: '/services', roles: ['admin', 'teacher', 'parent'] },
    { title: 'Финансы', icon: FinanceIcon, path: '/finance', roles: ['admin'] },
    { title: 'Рекомендации', icon: RecommendationsIcon, path: '/recommendations', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Меню', icon: MenuItemIcon, path: '/menu', roles: ['admin', 'teacher', 'parent'] },
    { title: 'Контакты', icon: ContactsIcon, path: '/contacts', roles: ['admin', 'teacher', 'parent', 'psychologist'] },
    { title: 'Пользователи', icon: PersonIcon, path: '/users', roles: ['admin'] },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <StyledAppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            МБОУ "Образовательный центр № 4"
          </Typography>
          <IconButton onClick={handleMenuClick} size="small">
            <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 35, height: 35 }}>
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
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
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                borderRadius: 2
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <PersonIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary="Профиль" />
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
              </ListItemIcon>
              <ListItemText primary="Выйти" />
            </MenuItem>
          </Menu>
        </Toolbar>
      </StyledAppBar>
      <StyledDrawer
        variant="permanent"
      >
        <DrawerHeader>
          <Typography variant="h6" sx={{ fontWeight: 600, py: 2 }}>
            Навигация
          </Typography>
        </DrawerHeader>
        <Divider />
        <List sx={{ pt: 2 }}>
          {menuItems
            .filter(item => item.roles.includes(user?.role))
            .map((item) => (
              <StyledListItem
                button
                key={item.path}
                onClick={() => navigate(item.path)}
                active={location.pathname === item.path ? 1 : 0}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path 
                    ? (menuItemColors[item.path] || menuItemColors['/'])
                    : alpha(menuItemColors[item.path] || menuItemColors['/'], 0.6),
                  minWidth: 40
                }}>
                  <item.icon />
                </ListItemIcon>
                <ListItemText 
                  primary={item.title}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: location.pathname === item.path ? 600 : 400,
                      color: location.pathname === item.path 
                        ? (menuItemColors[item.path] || menuItemColors['/'])
                        : theme.palette.text.primary
                    }
                  }}
                />
              </StyledListItem>
            ))}
        </List>
      </StyledDrawer>
      <Main>
        <Toolbar />
        {children}
      </Main>
    </Box>
  );
};

export default Layout; 