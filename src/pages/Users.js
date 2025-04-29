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
  styled
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  VpnKey as KeyIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';
import { ROLE_NAMES, ROLES } from '../constants/roles';

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
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    group: '',
    childName: '',
    photoFile: null,
    photoUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await api.getUsers();
        setUsers(data || []);
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
        name: user.name,
        email: user.email,
        role: user.role,
        password: '',
        group: user.group || '',
        childName: user.childName || '',
        photoFile: null,
        photoUrl: user.photoUrl || ''
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        role: '',
        password: '',
        group: '',
        childName: '',
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
    if (!formData.name.trim()) errors.name = 'Введите ФИО';
    if (!formData.email.trim()) errors.email = 'Введите email';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Некорректный email';
    if (!formData.role) errors.role = 'Выберите роль';
    if (!selectedUser && !formData.password) errors.password = 'Введите пароль';
    if (formData.role === 'teacher' && !formData.group) errors.group = 'Укажите группу';
    if (formData.role === 'parent' && !formData.childName) errors.childName = 'Укажите имя ребенка';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      if (selectedUser) {
        await api.updateUser(selectedUser.id, formData);
        const updatedUsers = await api.getUsers();
        setUsers(updatedUsers);
        showSnackbar('Пользователь обновлен', 'success');
      } else {
        await api.createUser(formData);
        const updatedUsers = await api.getUsers();
        setUsers(updatedUsers);
        showSnackbar('Пользователь добавлен', 'success');
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving user:', err);
      showSnackbar(err.message || 'Ошибка при сохранении пользователя', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.deleteUser(id);
      const updatedUsers = await api.getUsers();
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
          <Grid container spacing={3}>
            {users.map((user) => (
              <Grid item xs={12} sm={6} md={4} key={user.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={user.photoUrl}
                        sx={{ width: 56, height: 56, mr: 2 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                          {user.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip
                        label={ROLE_NAMES[user.role]}
                        sx={{
                          bgcolor: `${getRoleColor(user.role)}15`,
                          color: getRoleColor(user.role),
                          fontWeight: 600
                        }}
                      />
                      {user.group && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Группа: {user.group}
                        </Typography>
                      )}
                      {user.childName && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Ребенок: {user.childName}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="Редактировать">
                        <IconButton onClick={() => handleOpenDialog(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton onClick={() => handleDelete(user.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ФИО"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={!!formErrors.name}
                    helperText={formErrors.name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
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

                {formData.role === 'teacher' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Группа"
                      value={formData.group}
                      onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                      error={!!formErrors.group}
                      helperText={formErrors.group}
                    />
                  </Grid>
                )}

                {formData.role === 'parent' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="ФИО ребенка"
                      value={formData.childName}
                      onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                      error={!!formErrors.childName}
                      helperText={formErrors.childName}
                    />
                  </Grid>
                )}

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