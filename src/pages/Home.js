import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Avatar,
  Stack,
  Paper,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import {
  School as SchoolIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Restaurant as FoodIcon,
  Palette as PaletteIcon,
  SportsBasketball as SportIcon,
  Login as LoginIcon,
  ContactPhone as ContactPhoneIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const iconMap = {
  'school': SchoolIcon,
  'time': TimeIcon,
  'group': GroupIcon,
  'food': FoodIcon,
  'palette': PaletteIcon,
  'sport': SportIcon
};

const Home = () => {
  const navigate = useNavigate();
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Локальные данные вместо API
        const data = [
          {
            id: 1,
            title: "Образование",
            description: "Качественное дошкольное образование",
            iconKey: "school"
          },
          {
            id: 2,
            title: "Расписание",
            description: "Гибкий график работы",
            iconKey: "time"
          },
          {
            id: 3,
            title: "Группы",
            description: "Маленькие группы для лучшего внимания",
            iconKey: "group"
          },
          {
            id: 4,
            title: "Питание",
            description: "Сбалансированное питание",
            iconKey: "food"
          },
          {
            id: 5,
            title: "Творчество",
            description: "Развитие творческих способностей",
            iconKey: "palette"
          },
          {
            id: 6,
            title: "Спорт",
            description: "Физическое развитие",
            iconKey: "sport"
          }
        ];
        setFeatures(data.map(feature => ({
          ...feature,
          icon: iconMap[feature.iconKey] || SchoolIcon
        })));
        setError(null);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F0F7FF 0%, #E6E9FF 100%)',
        position: 'relative',
        overflow: 'hidden',
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
      {/* Декоративные элементы */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      {/* Верхняя навигация */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'white',
          p: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'primary.main'
          }}
        >
          МБОУ "Образовательный центр № 4"
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ContactPhoneIcon />}
            onClick={() => navigate('/contacts')}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              borderColor: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(99, 102, 241, 0.04)'
              }
            }}
          >
            Контакты
          </Button>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => navigate('/welcome')}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
              }
            }}
          >
            Войти
          </Button>
        </Stack>
      </Paper>

      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 4, md: 6 },
          pb: { xs: 4, md: 6 },
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Заголовок */}
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              mb: 3,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
              background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            МБОУ г. Владимира "Образовательный центр № 4"
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.8,
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.4rem' },
              mb: 5
            }}
          >
            Создаём уютную и безопасную среду для развития вашего ребёнка.
            Наши опытные педагоги помогают детям расти и учиться через игру и творчество.
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '24px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease-in-out',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      p: 4
                    }}
                  >
                    <Avatar
                      className="feature-icon"
                      sx={{
                        width: 88,
                        height: 88,
                        mb: 3,
                        background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)',
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.1) rotate(5deg)'
                        }
                      }}
                    >
                      <feature.icon sx={{ fontSize: 44 }} />
                    </Avatar>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        fontSize: '1.5rem'
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        lineHeight: 1.6,
                        fontSize: '1.1rem'
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Home;