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
import { getPhotoUrl } from '../utils/photoUtils';
import { useOutletContext } from 'react-router-dom';

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
  width: 180,
  height: 180,
  margin: '0 auto 16px',
  border: `4px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.3s ease-in-out',
  fontSize: '4rem',
  fontWeight: 500,
  '&:hover': {
    transform: 'scale(1.02)',
    boxShadow: `0 12px 48px ${alpha(theme.palette.primary.main, 0.3)}`,
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input': {
    color: theme.palette.text.primary,
    fontWeight: 500,
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.primary,
    fontWeight: 500,
  },
  '& .Mui-disabled': {
    WebkitTextFillColor: theme.palette.text.primary,
    color: theme.palette.text.primary,
    opacity: 0.8,
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  borderRadius: '12px',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  fontWeight: 600,
  padding: '8px',
  fontSize: '0.875rem',
  margin: '16px auto 0',
  minWidth: 'auto',
  width: 'fit-content',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
  },
  '& .MuiChip-label': {
    padding: '0 8px'
  }
}));

const Profile = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { PageTitle } = useOutletContext();
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
    createdAt: '',
    group: '',
    role: 'parent',
    avatar: null,
    children: []
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
        const data = await api.profile.get();
        console.log('Полученные данные профиля:', data);
        
        // Форматируем дату создания из БД
        let createdAt = 'Не указана';
        
        if (data.created_at) {
          try {
            const dateStr = data.created_at;
            console.log('Дата создания из профиля:', dateStr, typeof dateStr);
            
            // Если это строка с датой
            if (typeof dateStr === 'string') {
              let datePart = dateStr;
              
              // Удаляем миллисекунды, если они есть
              if (datePart.includes('.')) {
                datePart = datePart.split('.')[0];
              }
              
              // Для формата с пробелом или T
              if (datePart.includes(' ') || datePart.includes('T')) {
                [datePart] = datePart.split(/[ T]/);
              }
              
              // Извлекаем компоненты даты
              if (datePart && datePart.includes('-')) {
                const [year, month, day] = datePart.split('-');
                if (year && month && day) {
                  createdAt = `${day}.${month}.${year}`;
                  console.log('Отформатированная дата из строки:', createdAt);
                }
              }
            }
            // Если это timestamp
            else if (!isNaN(dateStr) && (typeof dateStr === 'number' || !isNaN(Number(dateStr)))) {
              const timestamp = typeof dateStr === 'number' ? dateStr : Number(dateStr);
              const date = new Date(timestamp);
              if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                createdAt = `${day}.${month}.${year}`;
                console.log('Отформатированная дата из timestamp:', createdAt);
              }
            }
          } catch (error) {
            console.error('Ошибка при форматировании даты:', error);
            createdAt = 'Не указана';
          }
        } else {
          console.log('Дата создания отсутствует в данных профиля:', data);
        }
        
        // Получаем детей через отдельный запрос, если пользователь - родитель
        let childrenData = [];
        if (data.role === 'parent' || user?.role === 'parent') {
          try {
            const childrenResponse = await api.children.getAll({ parent_id: data.user_id || user.id });
            console.log('Данные о детях из отдельного запроса:', childrenResponse);
            
            // Фильтруем уникальных детей по child_id и форматируем их имена
            const uniqueChildren = Array.from(new Map(
              (childrenResponse.data || []).map(child => [
                child.child_id, 
                {
                  ...child,
                  name: child.name || `${child.first_name} ${child.last_name}`.trim()
                }
              ])
            ).values());
            
            childrenData = uniqueChildren;
          } catch (error) {
            console.error('Ошибка при загрузке детей:', error);
          }
        }

        setUserData({
          firstName: data.first_name || data.firstName || '',
          lastName: data.last_name || data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          createdAt: createdAt,
          group: data.group || '',
          role: data.role || user?.role || 'parent',
          avatar: data.photo_path || data.avatar || null,
          children: childrenData
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

    fetchUserData();
  }, [user]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleEdit = () => {
    if (userData.role === 'parent') {
      setSnackbar({
        open: true,
        message: 'Редактирование профиля недоступно для родителей',
        severity: 'warning'
      });
      return;
    }
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.profile.update(user.id, userData);
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
      await api.profile.changePassword(user.id, {
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
        console.log('Загрузка файла:', {
          name: file.name,
          type: file.type,
          size: file.size
        });

        const formData = new FormData();
        formData.append('avatar', file);

        console.log('Отправка запроса на загрузку аватара...');
        const response = await api.profile.uploadAvatar(user.id, formData);
        
        console.log('Ответ сервера:', response);

        setUserData(prevData => ({
          ...prevData,
          avatar: response.avatarUrl || response.avatar
        }));

        setSnackbar({
          open: true,
          message: 'Аватар успешно обновлен',
          severity: 'success'
        });
        setError(null);
      } catch (err) {
        console.error('Ошибка при загрузке аватара:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        
        let errorMessage = 'Ошибка при загрузке аватара';
        if (err.response?.status === 413) {
          errorMessage = 'Файл слишком большой';
        } else if (err.response?.status === 415) {
          errorMessage = 'Неподдерживаемый формат файла';
        } else if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }

        setError(errorMessage);
        setSnackbar({
          open: true,
          message: errorMessage,
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
          <CardContent sx={{ 
            textAlign: 'center', 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <input
              accept="image/*"
              type="file"
              id="avatar-input"
              hidden
              onChange={handleAvatarChange}
              disabled={userData.role === 'parent'}
            />
            <label htmlFor="avatar-input">
              <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                <StyledAvatar
                  src={userData.avatar ? getPhotoUrl(userData.avatar) : null}
                  alt={`${userData.firstName} ${userData.lastName}`}
                >
                  {!userData.avatar && `${userData.firstName?.[0]}${userData.lastName?.[0]}`}
                </StyledAvatar>
                {userData.role !== 'parent' && (
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'background.paper' },
                      width: '40px',
                      height: '40px'
                    }}
                  >
                    <CameraIcon />
                  </IconButton>
                )}
              </Box>
            </label>
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
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Личная информация
              </Typography>
              {!editMode && userData.role !== 'parent' && (
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
              )}
              {editMode && (
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
                <StyledTextField
                  fullWidth
                  label="Имя"
                  value={userData.firstName}
                  onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                  disabled={!editMode || userData.role === 'parent'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  fullWidth
                  label="Фамилия"
                  value={userData.lastName}
                  onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                  disabled={!editMode || userData.role === 'parent'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  fullWidth
                  label="Email"
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                  disabled={!editMode || userData.role === 'parent'}
                  type="email"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  fullWidth
                  label="Телефон"
                  value={userData.phone}
                  onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                  disabled={!editMode || userData.role === 'parent'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  fullWidth
                  label="Дата создания аккаунта"
                  value={userData.createdAt || 'Не указана'}
                  disabled
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              {userData.role === 'parent' && (
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Дети"
                    value={userData.children?.map(child => child.name || `${child.first_name} ${child.last_name}`.trim()).filter(Boolean).join(', ') || 'Нет данных о детях'}
                    disabled
                    multiline
                  />
                </Grid>
              )}
              {userData.role !== 'admin' && userData.role !== 'psychologist' && userData.role !== 'parent' && (
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Группа"
                    value={userData.group}
                    disabled
                  />
                </Grid>
              )}
            </Grid>
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
        <Box sx={{ pl: 3, pt: 1 }}>
          <PageTitle>Профиль</PageTitle>
        </Box>

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
            value="settings"
            label="Настройки"
            icon={<SettingsIcon />}
          />
        </Tabs>

        {selectedTab === 'personal' && renderPersonalInfo()}
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