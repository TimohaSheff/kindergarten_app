import React, { useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
  Fade,
  SvgIcon,
  CircularProgress
} from '@mui/material';
import {
  Group as GroupIcon,
  Schedule as ScheduleIcon,
  Assessment as ProgressIcon,
  LocalActivity as ServicesIcon,
  Description as RecommendationsIcon,
  Contacts as ContactsIcon,
  Home as HomeIcon,
  Restaurant as MenuIcon,
  Person as PersonIcon,
  People as UsersIcon,
  EventNote as AttendanceIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: theme.spacing(3),
  background: '#ffffff',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
    '& .card-icon': {
      transform: 'scale(1.2) rotate(5deg)',
    }
  }
}));

const IconWrapper = styled(Box)(({ theme, color }) => ({
  width: 80,
  height: 80,
  borderRadius: theme.spacing(2.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${alpha(color, 0.12)} 0%, ${alpha(color, 0.24)} 100%)`,
  marginBottom: theme.spacing(3),
  transition: 'all 0.3s ease',
  '& svg': {
    fontSize: 40,
    color: color,
    transition: 'all 0.3s ease'
  }
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(4),
  '&:last-child': {
    paddingBottom: theme.spacing(4)
  }
}));

const Welcome = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!loading && !initialCheckDone.current) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
      }
      initialCheckDone.current = true;
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const cards = [
    {
      title: 'Главная',
      description: 'Вернуться на главную страницу',
      icon: HomeIcon,
      path: '/',
      roles: ['admin', 'teacher', 'parent', 'psychologist'],
      color: theme.palette.primary.main
    },
    {
      title: 'Группы',
      description: 'Управление группами и детьми',
      icon: GroupIcon,
      path: '/groups',
      roles: ['admin', 'psychologist'],
      color: theme.palette.info.main
    },
    {
      title: 'Расписание',
      description: 'Расписание занятий',
      icon: ScheduleIcon,
      path: '/schedule',
      roles: ['admin', 'teacher', 'parent'],
      color: theme.palette.warning.main
    },
    {
      title: 'Посещаемость',
      description: 'Учет посещаемости',
      icon: AttendanceIcon,
      path: '/attendance',
      roles: ['admin', 'teacher'],
      color: theme.palette.error.main
    },
    {
      title: 'Прогресс',
      description: 'Отслеживание прогресса детей',
      icon: ProgressIcon,
      path: '/progress',
      roles: ['admin', 'teacher', 'parent', 'psychologist'],
      color: theme.palette.success.main
    },
    {
      title: 'Рекомендации',
      description: 'Рекомендации по развитию и воспитанию',
      icon: RecommendationsIcon,
      path: '/recommendations',
      roles: ['admin', 'teacher', 'parent', 'psychologist'],
      color: theme.palette.info.main
    },
    {
      title: 'Меню',
      description: 'Меню питания на неделю',
      icon: MenuIcon,
      path: '/menu',
      roles: ['admin', 'teacher', 'parent'],
      color: theme.palette.warning.main
    },
    {
      title: 'Услуги',
      description: 'Дополнительные услуги',
      icon: ServicesIcon,
      path: '/services',
      roles: ['admin', 'parent'],
      color: theme.palette.secondary.main
    }
  ];

  const filteredItems = cards.filter(item => 
    Array.isArray(item.roles) && item.roles.includes(user.role)
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 4 },
        background: 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(255, 255, 255, 0.95) 100%)',
        position: 'relative',
        minHeight: 'calc(100vh - 64px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          opacity: 0.4,
          zIndex: 0,
          pointerEvents: 'none',
        }
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
        <Box sx={{ mb: { xs: 4, sm: 6 }, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 3,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Добро пожаловать, {user.first_name}!
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              maxWidth: '800px',
              margin: '0 auto',
              lineHeight: 1.6
            }}
          >
            Выберите нужный раздел для работы с системой
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {filteredItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={4} key={item.path}>
              <Fade in timeout={500 + index * 100}>
                <StyledCard onClick={() => navigate(item.path)}>
                  <StyledCardContent>
                    <IconWrapper color={item.color || theme.palette.primary.main} className="card-icon">
                      <SvgIcon component={item.icon} />
                    </IconWrapper>
                    <Typography variant="h6" gutterBottom align="center">
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      {item.description}
                    </Typography>
                  </StyledCardContent>
                </StyledCard>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Welcome; 