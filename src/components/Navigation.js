import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Divider,
  Fade,
  Collapse,
  ListItemButton,
  Typography,
  Button,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Schedule as ScheduleIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  ContactPhone as ContactPhoneIcon,
  Description as DescriptionIcon,
  Restaurant as RestaurantIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  LocalOffer as LocalOfferIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const drawerWidth = 280;

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: 'white',
  boxShadow: 'none',
  borderBottom: '1px solid rgba(145, 107, 216, 0.12)',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  color: theme.palette.text.secondary,
  '&:hover': {
    color: theme.palette.primary.main,
    backgroundColor: 'rgba(145, 107, 216, 0.04)',
  },
  '&.active': {
    color: theme.palette.primary.main,
    backgroundColor: 'rgba(145, 107, 216, 0.08)',
  },
}));

const Navigation = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSubmenuClick = (text) => {
    setOpenSubmenu(openSubmenu === text ? null : text);
  };

  const getMenuItems = () => {
    const menuItems = [];

    // Общие пункты меню для всех ролей
    menuItems.push(
      {
        text: 'Главная',
        icon: HomeIcon,
        path: '/',
        color: theme.palette.primary.main
      },
      {
        text: 'Контакты',
        icon: ContactPhoneIcon,
        path: '/contacts',
        color: theme.palette.info.main
      }
    );

    if (user) {
      // Меню для авторизованных пользователей
      if (user.role === 'admin') {
        menuItems.push(
          {
            text: 'Пользователи',
            icon: PersonIcon,
            path: '/dashboard/users',
            color: theme.palette.success.main
          },
          {
            text: 'Группы',
            icon: GroupIcon,
            path: '/groups',
            color: theme.palette.info.main
          },
          {
            text: 'Расписание',
            icon: ScheduleIcon,
            path: '/schedule',
            color: theme.palette.warning.main
          },
          {
            text: 'Прогресс',
            icon: AssessmentIcon,
            path: '/progress',
            color: theme.palette.error.main
          },
          {
            text: 'Рекомендации',
            icon: DescriptionIcon,
            path: '/recommendations',
            color: theme.palette.secondary.main
          },
          {
            text: 'Меню',
            icon: RestaurantIcon,
            path: '/menu',
            color: theme.palette.info.dark
          },
          {
            text: 'Платные услуги',
            icon: SchoolIcon,
            path: '/services',
            color: theme.palette.info.main
          }
        );
      } else if (user.role === 'teacher') {
        menuItems.push(
          {
            text: 'Моя группа',
            icon: PersonIcon,
            path: '/children',
            color: theme.palette.success.main
          },
          {
            text: 'Посещаемость',
            icon: AssessmentIcon,
            path: '/attendance',
            color: theme.palette.info.main
          },
          {
            text: 'Расписание',
            icon: ScheduleIcon,
            path: '/schedule',
            color: theme.palette.info.main
          },
          {
            text: 'Прогресс',
            icon: AssessmentIcon,
            path: '/progress',
            color: theme.palette.warning.main
          },
          {
            text: 'Рекомендации',
            icon: DescriptionIcon,
            path: '/recommendations',
            color: theme.palette.info.dark
          },
          {
            text: 'Меню',
            icon: RestaurantIcon,
            path: '/menu',
            color: theme.palette.error.main
          }
        );
      } else if (user.role === 'parent') {
        menuItems.push(
          {
            text: 'Информация',
            icon: PersonIcon,
            path: '/children',
            color: theme.palette.success.main
          },
          {
            text: 'Расписание',
            icon: ScheduleIcon,
            path: '/schedule',
            color: theme.palette.warning.main
          },
          {
            text: 'Посещаемость',
            icon: AssessmentIcon,
            path: '/attendance',
            color: theme.palette.success.main
          },
          {
            text: 'Прогресс',
            icon: AssessmentIcon,
            path: '/progress',
            color: theme.palette.error.main
          },
          {
            text: 'Рекомендации',
            icon: DescriptionIcon,
            path: '/recommendations',
            color: theme.palette.secondary.main
          },
          {
            text: 'Меню',
            icon: RestaurantIcon,
            path: '/menu',
            color: theme.palette.info.dark
          },
          {
            text: 'Платные услуги',
            icon: SchoolIcon,
            path: '/services',
            color: theme.palette.info.main
          }
        );
      } else if (user.role === 'psychologist') {
        menuItems.push(
          {
            text: 'Группы',
            icon: GroupIcon,
            path: '/groups',
            color: theme.palette.info.main
          },
          {
            text: 'Прогресс',
            icon: AssessmentIcon,
            path: '/progress',
            color: theme.palette.warning.main
          },
          {
            text: 'Рекомендации',
            icon: DescriptionIcon,
            path: '/recommendations',
            color: theme.palette.info.main
          }
        );
      }

      menuItems.push({
        text: 'Профиль',
        icon: PersonIcon,
        path: '/profile',
        color: theme.palette.grey[700]
      });
    } else {
      // Добавляем кнопку входа для неавторизованных пользователей
      menuItems.push({
        text: 'Войти',
        icon: PersonIcon,
        path: '/login',
        color: theme.palette.primary.main
      });
    }

    return menuItems;
  };

  const renderMenuItem = (item, depth = 0) => {
    const isSelected = location.pathname === item.path;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenu === item.text;

    return (
      <React.Fragment key={item.text}>
        <ListItem
          disablePadding
          sx={{
            display: 'block',
            mb: 0.5,
            pl: depth * 2,
          }}
        >
          <ListItemButton
            onClick={() => {
              if (hasSubmenu) {
                handleSubmenuClick(item.text);
              } else {
                navigate(item.path);
                if (isMobile) handleDrawerToggle();
              }
            }}
            sx={{
              minHeight: 48,
              px: 2.5,
              py: 1.5,
              borderRadius: 2,
              backgroundColor: isSelected ? alpha(item.color, 0.08) : 'transparent',
              '&:hover': {
                backgroundColor: alpha(item.color, 0.12),
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isSelected ? item.color : alpha(item.color, 0.7),
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <item.icon />
            </ListItemIcon>
            <ListItemText
              primary={item.text}
              sx={{
                '& .MuiListItemText-primary': {
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? item.color : 'text.primary',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease-in-out'
                },
              }}
            />
            {hasSubmenu && (
              <Box component="span" sx={{ color: alpha(item.color, 0.7) }}>
                {isSubmenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Box>
            )}
          </ListItemButton>
        </ListItem>
        {hasSubmenu && (
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map(subItem => renderMenuItem(subItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)',
      backdropFilter: 'blur(20px)'
    }}>
      <Box sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1) rotate(5deg)',
            }
          }}
        >
          <SchoolIcon />
        </Avatar>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            МБОУ
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500
            }}
          >
            г. Владимира "ОЦ № 4"
          </Typography>
        </Box>
      </Box>

      <List sx={{
        flex: 1,
        px: 2,
        py: 3,
        overflowY: 'hidden',
        '&::-webkit-scrollbar': {
          display: 'none'
        }
      }}>
        {getMenuItems().map(item => renderMenuItem(item))}
      </List>

      {user && (
        <Box
          sx={{
            p: 3,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            background: alpha(theme.palette.background.paper, 0.5)
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={logout}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              borderColor: alpha(theme.palette.error.main, 0.5),
              color: theme.palette.error.main,
              '&:hover': {
                borderColor: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08)
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            Выйти
          </Button>
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Мобильная версия */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(231, 235, 240, 0.8)'
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Десктопная версия */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: drawerWidth,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(231, 235, 240, 0.8)',
          minHeight: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1200
        }}
      >
        <StyledAppBar position="sticky">
          <Toolbar>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* ... existing navigation items ... */}
            </Box>
          </Toolbar>
        </StyledAppBar>
        {drawer}
      </Box>
    </>
  );
};

export default Navigation; 