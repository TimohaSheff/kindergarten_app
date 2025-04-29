import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Button,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
  Fade,
  CircularProgress,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Switch
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Cake as BirthdayIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  PhotoCamera as CameraIcon,
  Visibility as VisibilityIcon,
  FormatSize as FormatSizeIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { styled } from '@mui/material/styles';
import { api } from '../api/api';
import { getRoleName } from '../constants/roles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '24px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05) rotate(5deg)',
    boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.3)}`,
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  borderRadius: '12px',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  fontWeight: 600,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  }
}));

const Profile = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { 
    isHighContrastMode, 
    isBigFontMode, 
    toggleHighContrastMode, 
    toggleBigFontMode 
  } = useAccessibility();
  const [selectedTab, setSelectedTab] = useState('personal');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    group: '',
    role: '',
    avatar: null
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const data = await api.getUserProfile(user.id);
        setUserData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          birthDate: data.birthDate || '',
          group: data.group || '',
          role: data.role || user?.role || 'parent',
          avatar: data.avatar || null
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError(err.message || 'Ошибка при загрузке профиля');
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке профиля',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchUserData();
    }
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.updateUserProfile(user.id, userData);
      setSnackbar({ open: true, message: 'Профиль обновлен', severity: 'success' });
      setEditMode(false);
      setError(null);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Ошибка при обновлении профиля');
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении профиля',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSnackbar({ open: true, message: 'Пароли не совпадают', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      await api.changePassword(user.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSnackbar({ open: true, message: 'Пароль изменен', severity: 'success' });
      setOpenPasswordDialog(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setError(null);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.message || 'Ошибка при изменении пароля');
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при изменении пароля',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setLoading(true);
        const formData = new FormData();
        formData.append('avatar', file);
        const response = await api.uploadAvatar(user.id, formData);
        setUserData({ ...userData, avatar: response.avatarUrl });
        setSnackbar({
          open: true,
          message: 'Аватар успешно обновлен',
          severity: 'success'
        });
        setError(null);
      } catch (err) {
        console.error('Error uploading avatar:', err);
        setError(err.message || 'Ошибка при загрузке аватара');
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке аватара',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const renderPersonalInfo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <StyledCard>
          <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
            <input
              accept="image/*"
              type="file"
              id="avatar-input"
              hidden
              onChange={handleAvatarChange}
            />
            <label htmlFor="avatar-input">
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <StyledAvatar
                  src={userData.avatar}
                  alt={`${userData.firstName} ${userData.lastName}`}
                >
                  {userData.firstName?.[0]}{userData.lastName?.[0]}
                </StyledAvatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'background.paper' }
                  }}
                >
                  <CameraIcon />
                </IconButton>
              </Box>
            </label>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
              {userData.firstName} {userData.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {userData.email}
            </Typography>
            <StyledChip
              label={getRoleName(userData.role)}
              icon={userData.role === 'parent' ? <PersonIcon /> : <SchoolIcon />}
            />
          </CardContent>
        </StyledCard>
      </Grid>
      <Grid item xs={12} md={8}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Личная информация
              </Typography>
              {!editMode ? (
                <Button
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  sx={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                    }
                  }}
                >
                  Редактировать
                </Button>
              ) : (
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  sx={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                    }
                  }}
                >
                  Сохранить
                </Button>
              )}
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={userData.firstName}
                  onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Фамилия"
                  value={userData.lastName}
                  onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  disabled={!editMode}
                  type="email"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Телефон"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Адрес"
                  value={userData.address}
                  onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                  disabled={!editMode}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Дата рождения"
                  value={userData.birthDate}
                  onChange={(e) => setUserData({ ...userData, birthDate: e.target.value })}
                  disabled={!editMode}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Группа"
                  value={userData.group}
                  disabled
                />
              </Grid>
            </Grid>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  const renderSecuritySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Безопасность
            </Typography>
            <List>
              <ListItem sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 4 }}>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Изменить пароль"
                    secondary="Обновите ваш пароль для безопасности"
                  />
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => setOpenPasswordDialog(true)}
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    color: 'primary.main',
                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08)
                    },
                    minWidth: '120px',
                    height: '40px'
                  }}
                >
                  Изменить
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  const renderSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Настройки доступности
            </Typography>
            <List>
              <ListItem sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 4 }}>
                  <ListItemIcon>
                    <VisibilityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Режим высокой контрастности"
                    secondary="Увеличивает контрастность для лучшей читаемости"
                  />
                </Box>
                <Switch
                  checked={isHighContrastMode}
                  onChange={toggleHighContrastMode}
                  color="primary"
                />
              </ListItem>
              <ListItem sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, mr: 4 }}>
                  <ListItemIcon>
                    <FormatSizeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Увеличенный шрифт"
                    secondary="Делает текст более крупным и читаемым"
                  />
                </Box>
                <Switch
                  checked={isBigFontMode}
                  onChange={toggleBigFontMode}
                  color="primary"
                />
              </ListItem>
            </List>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box sx={{ pt: { xs: 4, sm: 6 } }}>
        <Typography 
          variant="h4" 
          sx={{
            fontWeight: 700,
            mb: 4,
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: isBigFontMode ? '2.5rem' : '2rem'
          }}
        >
          Профиль
        </Typography>

        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{ mb: 3 }}
        >
          <Tab
            value="personal"
            label="Личная информация"
            icon={<PersonIcon />}
          />
          <Tab
            value="security"
            label="Безопасность"
            icon={<SecurityIcon />}
          />
          <Tab
            value="settings"
            label="Настройки"
            icon={<SettingsIcon />}
          />
        </Tabs>

        {selectedTab === 'personal' && renderPersonalInfo()}
        {selectedTab === 'security' && renderSecuritySettings()}
        {selectedTab === 'settings' && renderSettings()}
      </Box>
    );
  };

  return (
    <>
      {renderContent()}

      <Dialog
        open={openPasswordDialog}
        onClose={() => setOpenPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Изменить пароль
            </Typography>
            <IconButton onClick={() => setOpenPasswordDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Текущий пароль"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
            <TextField
              fullWidth
              label="Новый пароль"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            />
            <TextField
              fullWidth
              label="Подтвердите новый пароль"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenPasswordDialog(false)}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            startIcon={<SaveIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
              }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Profile; 