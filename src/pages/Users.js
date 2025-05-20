import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
  Tooltip,
  FormHelperText,
  InputAdornment,
  CircularProgress,
  styled,
  Tabs,
  Tab,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  VpnKey as KeyIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { ROLE_NAMES, ROLES } from '../constants/roles';
import { getPhotoUrl } from '../utils/photoUtils';

// Создаем собственный компонент VisuallyHiddenInput
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    photoFile: null,
    photoUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const usersPerPage = 9;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.users.getAll();
        console.log('Полученные пользователи:', response);

        // Проверяем, что response.data существует и является массивом
        const usersData = Array.isArray(response.data) ? response.data : [];
        
        // Логируем информацию о родителях и их детях
        const parents = usersData.filter(user => user.role === 'parent');
        console.log('Родители и их дети:', parents.map(parent => ({
          parent: `${parent.first_name} ${parent.last_name}`,
          children: parent.children
        })));

        setUsers(usersData);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Ошибка при загрузке пользователей');
        showSnackbar('Ошибка при загрузке пользователей', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        password: '',
        photoFile: null,
        photoUrl: user.photoUrl || ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        password: '',
        photoFile: null,
        photoUrl: ''
      });
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = 'Введите имя';
    if (!formData.last_name.trim()) errors.last_name = 'Введите фамилию';
    if (!formData.email.trim()) errors.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Некорректный email';
    if (!formData.role) errors.role = 'Выберите роль';
    if (!selectedUser && !formData.password) errors.password = 'Введите пароль';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
        phone: formData.phone || null
      };

      let response;
      if (selectedUser) {
        // Обновление существующего пользователя
        response = await api.users.update(selectedUser.user_id, userData);
        showSnackbar('Пользователь обновлен', 'success');
      } else {
        // Создание нового пользователя
        userData.password = formData.password;
        response = await api.users.create(userData);
        showSnackbar('Пользователь добавлен', 'success');
      }

      // Обновляем список пользователей
      const updatedUsersResponse = await api.users.getAll();
      const updatedUsers = Array.isArray(updatedUsersResponse.data) ? updatedUsersResponse.data : [];
      setUsers(updatedUsers);
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сохранении пользователя';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.users.delete(id);
      const updatedUsersResponse = await api.users.getAll();
      const updatedUsers = Array.isArray(updatedUsersResponse.data) ? updatedUsersResponse.data : [];
      setUsers(updatedUsers);
      showSnackbar('Пользователь удален', 'success');
    } catch (err) {
      console.error('Error deleting user:', err);
      showSnackbar(err.message || 'Ошибка при удалении пользователя', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#6366F1';
      case 'teacher': return '#10B981';
      case 'parent': return '#F59E0B';
      case 'psychologist': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        photoFile: file,
        photoUrl: URL.createObjectURL(file)
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const filterUsersByRole = (users, role) => {
    if (!Array.isArray(users)) return [];
    return role === 'all' ? users : users.filter(user => user.role === role);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const getCurrentPageUsers = () => {
    if (!Array.isArray(users)) return [];
    const filteredUsers = filterUsersByRole(users, selectedTab);
    const startIndex = (page - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Управление пользователями
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Добавить пользователя
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={selectedTab} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minWidth: 'auto',
                    px: 3
                  }
                }}
              >
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>Все</span>
                      <Chip 
                        label={Array.isArray(users) ? users.length : 0} 
                        size="small" 
                        sx={{ bgcolor: 'rgba(0, 0, 0, 0.08)' }} 
                      />
                    </Box>
                  } 
                  value="all" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ROLE_NAMES.admin}</span>
                      <Chip 
                        label={Array.isArray(users) ? users.filter(u => u.role === 'admin').length : 0} 
                        size="small"
                        sx={{ bgcolor: `${getRoleColor('admin')}15`, color: getRoleColor('admin') }} 
                      />
                    </Box>
                  } 
                  value="admin" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ROLE_NAMES.psychologist}</span>
                      <Chip 
                        label={Array.isArray(users) ? users.filter(u => u.role === 'psychologist').length : 0} 
                        size="small"
                        sx={{ bgcolor: `${getRoleColor('psychologist')}15`, color: getRoleColor('psychologist') }} 
                      />
                    </Box>
                  } 
                  value="psychologist" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ROLE_NAMES.teacher}</span>
                      <Chip 
                        label={Array.isArray(users) ? users.filter(u => u.role === 'teacher').length : 0} 
                        size="small"
                        sx={{ bgcolor: `${getRoleColor('teacher')}15`, color: getRoleColor('teacher') }} 
                      />
                    </Box>
                  } 
                  value="teacher" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ROLE_NAMES.parent}</span>
                      <Chip 
                        label={Array.isArray(users) ? users.filter(u => u.role === 'parent').length : 0} 
                        size="small"
                        sx={{ bgcolor: `${getRoleColor('parent')}15`, color: getRoleColor('parent') }} 
                      />
                    </Box>
                  } 
                  value="parent" 
                />
              </Tabs>
            </Box>

            <Grid container spacing={3}>
              {getCurrentPageUsers().map((user) => (
                <Grid item xs={12} sm={6} md={4} key={user.user_id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', p: 2 }}>
                    <CardContent sx={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column',
                      p: 0,
                      '&:last-child': { pb: 0 }
                    }}>
                      {/* Верхняя часть с аватаром и основной информацией */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                        <Avatar
                          src={user.photo_path ? getPhotoUrl(user.photo_path) : undefined}
                          sx={{ 
                            width: 56, 
                            height: 56, 
                            mr: 2,
                            bgcolor: getRoleColor(user.role)
                          }}
                        >
                          {!user.photo_path && `${user.first_name?.[0]}${user.last_name?.[0]}`}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ mb: 0.5 }}>
                            {`${user.first_name} ${user.last_name}`}
                          </Typography>
                          <Chip
                            label={ROLE_NAMES[user.role]}
                            size="small"
                            sx={{
                              bgcolor: `${getRoleColor(user.role)}15`,
                              color: getRoleColor(user.role),
                              fontWeight: 500
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Контактная информация */}
                      <Box sx={{ mb: 'auto' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            mb: 1,
                            color: 'text.secondary'
                          }}
                        >
                          <EmailIcon sx={{ fontSize: 18, mr: 1, color: 'action.active' }} />
                          {user.email}
                        </Typography>
                        {user.phone && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              color: 'text.secondary'
                            }}
                          >
                            <PhoneIcon sx={{ fontSize: 18, mr: 1, color: 'action.active' }} />
                            {user.phone}
                          </Typography>
                        )}
                      </Box>

                      {/* Информация о группах/детях */}
                      {user.role === 'teacher' && Array.isArray(user.groups) && user.groups.length > 0 && (
                        <Box sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1
                            }}
                          >
                            <strong>Группы:</strong>
                            <span style={{ flex: 1 }}>{user.groups.join(', ')}</span>
                          </Typography>
                        </Box>
                      )}
                      {user.role === 'parent' && Array.isArray(user.children) && user.children.length > 0 && (
                        <Box sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'text.secondary',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 1
                            }}
                          >
                            <strong>Дети:</strong>
                            <span style={{ flex: 1 }}>
                              {user.children.join(', ')}
                            </span>
                          </Typography>
                        </Box>
                      )}

                      {/* Кнопки управления */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 1,
                        mt: 2
                      }}>
                        <Tooltip title="Редактировать">
                          <IconButton 
                            onClick={() => handleOpenDialog(user)}
                            size="small"
                            sx={{ color: 'action.active' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить">
                          <IconButton 
                            onClick={() => handleDelete(user.user_id)} 
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={Math.ceil(filterUsersByRole(users, selectedTab).length / usersPerPage)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          </>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={formData.photoUrl}
                      sx={{ width: 100, height: 100, mb: 1 }}
                    />
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<PhotoCameraIcon />}
                    >
                      Загрузить фото
                      <VisuallyHiddenInput type="file" accept="image/*" onChange={handlePhotoUpload} />
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Имя"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    error={!!formErrors.first_name}
                    helperText={formErrors.first_name}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Фамилия"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    error={!!formErrors.last_name}
                    helperText={formErrors.last_name}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={!!formErrors.email}
                    helperText={formErrors.email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth error={!!formErrors.role}>
                    <InputLabel>Роль</InputLabel>
                    <Select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      name="role"
                    >
                      <MenuItem value={ROLES.ADMIN}>{ROLE_NAMES.admin}</MenuItem>
                      <MenuItem value={ROLES.TEACHER}>{ROLE_NAMES.teacher}</MenuItem>
                      <MenuItem value={ROLES.PARENT}>{ROLE_NAMES.parent}</MenuItem>
                      <MenuItem value={ROLES.PSYCHOLOGIST}>{ROLE_NAMES.psychologist}</MenuItem>
                    </Select>
                    {formErrors.role && <FormHelperText>{formErrors.role}</FormHelperText>}
                  </FormControl>
                </Grid>

                {!selectedUser && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Пароль"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      error={!!formErrors.password}
                      helperText={formErrors.password}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <KeyIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} variant="contained">
              {selectedUser ? 'Сохранить' : 'Добавить'}
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
      </Box>
    </Container>
  );
};

export default Users; 