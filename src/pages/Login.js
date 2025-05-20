import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
  useTheme,
  styled,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)'
  }
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  background: theme.palette.primary.main,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: theme.spacing(3)
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  padding: '12px 0',
  fontSize: '1rem',
  textTransform: 'none',
  fontWeight: 600,
  backgroundColor: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark
  }
}));

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const initialCheckDone = useRef(false);

  const from = location.state?.from || '/welcome';

  useEffect(() => {
    // Пропускаем проверку, если она уже была выполнена
    if (initialCheckDone.current) {
      return;
    }

    // Пропускаем проверку, если все еще идет загрузка
    if (authLoading) {
      return;
    }

    // Проверяем только isAuthenticated, не проверяем токен
    if (isAuthenticated) {
      navigate('/welcome', { replace: true });
    }

    initialCheckDone.current = true;
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Пожалуйста, заполните все поля');
      }

      const result = await login({ email, password });
      
      if (result && result.success) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Ошибка при входе в систему');
    } finally {
      setLoading(false);
    }
  };

  // Показываем загрузку при входе
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Показываем загрузку при проверке аутентификации
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <IconButton 
          onClick={() => navigate('/')} 
          color="primary"
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 1
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Fade in timeout={1000}>
          <StyledPaper>
            <LogoContainer>
              <Typography
                variant="h3"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  userSelect: 'none'
                }}
              >
                KG
              </Typography>
            </LogoContainer>

            <Typography
              component="h1"
              variant="h4"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: theme.palette.text.primary
              }}
            >
              Добро пожаловать
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  mb: 2,
                  borderRadius: '12px'
                }}
              >
                {error}
              </Alert>
            )}

            <Box 
              component="form" 
              onSubmit={handleSubmit} 
              sx={{ 
                width: '100%',
                '& .MuiTextField-root': { mb: 2 }
              }}
            >
              <TextField
                required
                fullWidth
                id="email"
                label="Email"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
              <TextField
                required
                fullWidth
                name="password"
                label="Пароль"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              />
              <StyledButton
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 2, mb: 2 }}
              >
                {loading ? 'Вход...' : 'Войти'}
              </StyledButton>
            </Box>
          </StyledPaper>
        </Fade>
      </Box>
    </Container>
  );
};

export default Login; 