import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Link,
  Divider,
  Stack,
  Paper,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

const defaultStaff = [
  {
    name: 'Иванова Мария Петровна',
    position: 'Заведующая',
    phone: '+7 (4922) 12-34-56',
    email: 'director@oc4.ru',
    color: '#6366F1'
  },
  {
    name: 'Петрова Анна Ивановна',
    position: 'Воспитатель',
    phone: '+7 (4922) 12-34-57',
    email: 'teacher1@oc4.ru',
    color: '#10B981'
  },
  {
    name: 'Сидорова Елена Владимировна',
    position: 'Воспитатель',
    phone: '+7 (4922) 12-34-58',
    email: 'teacher2@oc4.ru',
    color: '#F59E0B'
  }
];

const Contacts = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [contactInfo, setContactInfo] = useState([
    {
      icon: PhoneIcon,
      title: 'Телефон',
      content: '+7 (4922) 12-34-56',
      link: 'tel:+74922123456',
      color: '#6366F1'
    },
    {
      icon: EmailIcon,
      title: 'Email',
      content: 'info@oc4.ru',
      link: 'mailto:info@oc4.ru',
      color: '#10B981'
    },
    {
      icon: LocationIcon,
      title: 'Адрес',
      content: 'г. Владимир, ул. Примерная, д. 123',
      link: 'https://yandex.ru/maps/-/CCUZZMuWkD',
      color: '#F59E0B'
    },
    {
      icon: TimeIcon,
      title: 'Часы работы',
      content: 'Пн-Пт: 7:00 - 19:00',
      color: '#3B82F6'
    }
  ]);
  const [staff, setStaff] = useState(defaultStaff);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.staff.getAll();
        if (Array.isArray(response)) {
          setStaff(response);
        }
      } catch (error) {
        console.error('Error fetching staff:', error);
        setStaff(defaultStaff);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLoginClick = () => {
    navigate('/login', { state: { from: '/contacts' } });
  };

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Верхняя навигация */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'white',
          p: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 0
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{
            borderRadius: '8px',
            borderColor: 'primary.main',
            '&:hover': {
              borderColor: 'primary.dark',
              bgcolor: 'rgba(25, 118, 210, 0.04)'
            }
          }}
        >
          На главную
        </Button>
        <Stack direction="row" spacing={2}>
          {!isAuthenticated && (
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={handleLoginClick}
              sx={{
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)'
              }}
            >
              Войти
            </Button>
          )}
        </Stack>
      </Paper>

      <Container maxWidth="lg">
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ 
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Контакты
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                Свяжитесь с нами удобным для вас способом
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Левая колонка с контактами и сотрудниками */}
              <Grid item xs={12} md={6}>
                {/* Контактная информация */}
                <Grid container spacing={3} sx={{ mb: 6 }}>
                  {contactInfo.map((item, index) => (
                    <Grid item xs={12} sm={6} key={`contact-${item.title}-${index}`}>
                      <Card sx={{ 
                        height: '100%',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                        }
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: item.color,
                              mr: 2,
                              width: 48,
                              height: 48,
                              boxShadow: `0 4px 8px ${item.color}40`
                            }}>
                              <item.icon />
                            </Avatar>
                            <Typography variant="h6">{item.title}</Typography>
                          </Box>
                          {item.link ? (
                            <Link
                              href={item.link}
                              target={item.title === 'Адрес' ? '_blank' : '_self'}
                              color="inherit"
                              underline="hover"
                              sx={{
                                display: 'block',
                                transition: 'color 0.2s ease-in-out',
                                '&:hover': {
                                  color: item.color
                                }
                              }}
                            >
                              <Typography variant="body1">{item.content}</Typography>
                            </Link>
                          ) : (
                            <Typography variant="body1">{item.content}</Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* Сотрудники */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h4" component="h2" gutterBottom sx={{ 
                    fontWeight: 600,
                    mb: 4
                  }}>
                    Наши сотрудники
                  </Typography>
                  <Grid container spacing={3}>
                    {staff.map((person, index) => (
                      <Grid item xs={12} key={`staff-${person.name}-${index}`}>
                        <Card sx={{ 
                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                          }
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Avatar sx={{ 
                                bgcolor: person.color,
                                mr: 2,
                                width: 56,
                                height: 56,
                                fontSize: '1.5rem',
                                boxShadow: `0 4px 8px ${person.color}40`
                              }}>
                                {person.name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>{person.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                  {person.position}
                                </Typography>
                              </Box>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={1}>
                              {person.phone && (
                                <Link 
                                  href={`tel:${person.phone}`} 
                                  color="inherit" 
                                  underline="hover"
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s ease-in-out',
                                    '&:hover': {
                                      color: person.color
                                    }
                                  }}
                                >
                                  <PhoneIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                  <Typography variant="body2">{person.phone}</Typography>
                                </Link>
                              )}
                              {person.email && (
                                <Link 
                                  href={`mailto:${person.email}`} 
                                  color="inherit" 
                                  underline="hover"
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'color 0.2s ease-in-out',
                                    '&:hover': {
                                      color: person.color
                                    }
                                  }}
                                >
                                  <EmailIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                  <Typography variant="body2">{person.email}</Typography>
                                </Link>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>

              {/* Правая колонка с картой */}
              <Grid item xs={12} md={6}>
                <Card sx={{ 
                  position: 'sticky',
                  top: 24,
                  overflow: 'hidden',
                  height: 'calc(100vh - 48px)'
                }}>
                  <Box sx={{ height: '100%' }}>
                    <iframe
                      src="https://yandex.ru/map-widget/v1/?ll=40.406635%2C56.129057&z=15"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      title="Карта"
                      style={{ border: 0 }}
                      allowFullScreen
                    />
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
};

export default Contacts;