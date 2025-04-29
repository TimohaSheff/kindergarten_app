import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  AvatarGroup,
  Chip,
  Tooltip,
  Fade,
  styled,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useGroups } from '../hooks/useGroups';
import api from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DailySchedule from '../components/DailySchedule';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '24px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
  }
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  background: 'rgba(99, 102, 241, 0.1)',
  '&:hover': {
    background: 'rgba(99, 102, 241, 0.2)',
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  borderRadius: '12px',
  fontWeight: 600,
  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(129, 140, 248, 0.1) 100%)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
}));

const GroupCard = ({ group, onClick }) => (
    <Card 
        sx={{ 
            minWidth: 275, 
            cursor: 'pointer',
            '&:hover': {
                boxShadow: 3
            }
        }}
        onClick={() => onClick(group)}
    >
        <CardContent>
            <Typography variant="h5" component="div">
                {group.group_name}
            </Typography>
            <Typography sx={{ mb: 1.5 }} color="text.secondary">
                Возраст: {group.age_range}
            </Typography>
            <Typography variant="body2">
                Количество детей: {group.children_count}
            </Typography>
            <Typography variant="body2">
                Воспитатели: {group.teachers || 'Не назначены'}
            </Typography>
        </CardContent>
    </Card>
);

const BASE_URL = process.env.REACT_APP_API_URL?.split('/api')[0] || 'http://localhost:3002';

const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('data:')) return photoPath;
  return `${BASE_URL}/${photoPath}`;
};

const Groups = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { groups, loading, error, createGroup, updateGroup, deleteGroup } = useGroups();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [openMenuDialog, setOpenMenuDialog] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    group_name: '',
    age_range: '',
    caretaker_full_name: ''
  });

  const [selectedGroupSchedule, setSelectedGroupSchedule] = useState([]);
  const [selectedGroupMenu, setSelectedGroupMenu] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [dialogError, setDialogError] = useState('');

  useEffect(() => {
    if (groups && groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    }
  }, [groups]);

  const handleOpenDialog = (group = null) => {
    if (group) {
      setFormData({
        group_name: group.group_name,
        age_range: group.age_range,
        caretaker_full_name: group.caretaker_full_name
      });
      setEditMode(true);
      setSelectedGroup(group);
    } else {
      setFormData({
        group_name: '',
        age_range: '',
        caretaker_full_name: ''
      });
      setEditMode(false);
      setSelectedGroup(null);
    }
    setDialogError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      group_name: '',
      age_range: '',
      caretaker_full_name: ''
    });
    setEditMode(false);
    setSelectedGroup(null);
    setDialogError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.group_name.trim()) {
        setDialogError('Название группы обязательно');
        return;
      }

      if (editMode && selectedGroup) {
        await updateGroup(selectedGroup.group_id, formData);
      } else {
        await createGroup(formData);
      }
      handleCloseDialog();
    } catch (err) {
      setDialogError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить эту группу?')) {
      try {
        await deleteGroup(id);
        setSnackbar({ open: true, message: 'Группа успешно удалена', severity: 'success' });
      } catch (err) {
        console.error('Error deleting group:', err);
        setSnackbar({ open: true, message: err.message || 'Произошла ошибка при удалении', severity: 'error' });
      }
    }
  };

  // Добавляем функцию форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Некорректная дата';
    }
  };

  const handleViewDetails = async (group) => {
    try {
      console.log('Fetching details for group:', group);
      const groupId = group.group_id || group.id;
      if (!groupId) {
        throw new Error('ID группы не определен');
      }
      const response = await api.getGroupChildrenDetails(groupId);
      console.log('Received group details:', response);
      
      if (!response || !response.children) {
        throw new Error('Некорректный формат данных от сервера');
      }
      
      const formattedChildren = response.children.map(child => {
        // Обработка массива services
        let services = [];
        try {
          if (child.services) {
            if (Array.isArray(child.services)) {
              services = child.services;
            } else if (typeof child.services === 'string') {
              services = child.services
                .replace(/[{}]/g, '')
                .split(',')
                .map(Number)
                .filter(id => !isNaN(id));
            }
          }
        } catch (e) {
          console.error('Error parsing services:', e);
        }

        // Обработка массива allergies
        let allergies = [];
        try {
          if (child.allergies) {
            if (Array.isArray(child.allergies)) {
              allergies = child.allergies;
            } else if (typeof child.allergies === 'string') {
              allergies = child.allergies
                .replace(/[{}]/g, '')
                .split(',')
                .map(a => a.trim())
                .filter(Boolean);
            }
          }
        } catch (e) {
          console.error('Error parsing allergies:', e);
        }

        // Обработка даты рождения
        const birthDate = child.date_of_birth ? child.date_of_birth.split('T')[0] : null;

        // Формируем объект с данными ребенка
        return {
          id: child.child_id,
          name: child.name,
          date_of_birth: birthDate,
          photo: child.photo,
          group_id: child.group_id,
          group_name: child.group_name,
          services: services,
          allergies: allergies,
          parent_id: child.parent_id || child.parent_user_id,
          parent_name: child.parent_name,
          parent_email: child.parent_email,
          parent_first_name: child.parent_first_name,
          parent_last_name: child.parent_last_name
        };
      });
      
      setSelectedGroupDetails({
        id: group.id || group.group_id,
        group_id: group.group_id || group.id,
        group_name: group.group_name || group.name,
        children: formattedChildren
      });
      
      console.log('Set group details:', selectedGroupDetails);
      setOpenDetailsDialog(true);
    } catch (err) {
      console.error('Error fetching group details:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Ошибка при загрузке деталей группы', 
        severity: 'error' 
      });
    }
  };

  const handleViewSchedule = async (group) => {
    try {
      const schedule = await api.getScheduleByGroup(group.id);
      setSelectedGroupDetails(group);
      setSelectedGroupSchedule(schedule);
      setOpenScheduleDialog(true);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Ошибка при загрузке расписания', 
        severity: 'error' 
      });
    }
  };

  const handleViewMenu = async (group) => {
    try {
      const menu = await api.getWeeklyMenu(group.id);
      setSelectedGroupDetails(group);
      setSelectedGroupMenu(menu);
      setOpenMenuDialog(true);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Ошибка при загрузке меню', 
        severity: 'error' 
      });
    }
  };

  const handleSaveSchedule = async (schedule) => {
    try {
      await api.saveGroupSchedule(selectedGroupDetails.id, schedule);
      setSelectedGroupSchedule(schedule);
      setSnackbar({ 
        open: true, 
        message: 'Режим дня сохранен', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error saving schedule:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Ошибка при сохранении режима дня', 
        severity: 'error' 
      });
    }
  };

  const handleSaveMenu = async (menu) => {
    try {
      await api.saveWeeklyMenu(selectedGroupDetails.id, menu);
      setSelectedGroupMenu(menu);
      setSnackbar({ 
        open: true, 
        message: 'Меню сохранено', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error saving menu:', err);
      setSnackbar({ 
        open: true, 
        message: err.message || 'Ошибка при сохранении меню', 
        severity: 'error' 
      });
    }
  };

  const handleGroupClick = (group) => {
    console.log('Group clicked:', group);
    const groupId = group.group_id || group.id;
    if (!groupId) {
        setSnackbar({
            open: true,
            message: 'ID группы не определен',
            severity: 'error'
        });
        return;
    }
    navigate(`/children?groupId=${groupId}`);
  };

  const handleCloseDetails = () => {
    setOpenDetailsDialog(false);
    setSelectedGroup(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Группы
          </Typography>
          {user?.role === 'admin' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              data-testid="add-group-button"
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                borderRadius: '12px',
                textTransform: 'none',
                px: 3,
                py: 1
              }}
            >
              Добавить группу
            </Button>
          )}
        </Box>

        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <StyledCard onClick={() => handleGroupClick(group)} sx={{ cursor: 'pointer' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <GroupIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                      {group.group_name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="group-age-label">
                      Возрастная группа: {group.age_range}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} data-testid="group-children-count">
                      Количество детей: {group.children_count || 0}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Воспитатели:
                    </Typography>
                    {group.caretaker_full_name?.split(',').map((teacher, index) => (
                      <Typography 
                        key={index}
                        variant="body1" 
                        color="text.primary" 
                        sx={{ 
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        {teacher.trim()}
                      </Typography>
                    ))}
                  </Box>

                  {user?.role === 'admin' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                      <StyledIconButton onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(group);
                      }}>
                        <EditIcon />
                      </StyledIconButton>
                      <StyledIconButton onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
                      }}>
                        <DeleteIcon />
                      </StyledIconButton>
                    </Box>
                  )}
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog}
          PaperProps={{
            sx: {
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              p: 4,
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            p: 0,
            mb: 4
          }}>
            {editMode ? 'Редактировать группу' : 'Добавить группу'}
          </DialogTitle>
          <DialogContent sx={{ p: 0, minWidth: 400 }}>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                autoFocus
                label="Название группы"
                name="group_name"
                fullWidth
                value={formData.group_name}
                onChange={handleInputChange}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  }
                }}
              />
              <TextField
                label="Возрастная группа"
                name="age_range"
                fullWidth
                value={formData.age_range}
                onChange={handleInputChange}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  }
                }}
              />
              <TextField
                label="Воспитатели"
                name="caretaker_full_name"
                fullWidth
                multiline
                rows={2}
                value={formData.caretaker_full_name}
                onChange={handleInputChange}
                helperText="Укажите ФИО воспитателей через запятую"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 4 }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                color: '#6B7280',
                mr: 2
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              data-testid="save-group-button"
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                px: 4,
                py: 1.5
              }}
            >
              {editMode ? 'Сохранить' : 'Добавить'}
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
            sx={{ width: '100%', borderRadius: '8px' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Dialog
          open={openDetailsDialog}
          onClose={handleCloseDetails}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              p: 4,
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            p: 0,
            mb: 4
          }}>
            Дети группы: {selectedGroupDetails?.group_name || selectedGroupDetails?.name}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {selectedGroupDetails?.children?.length > 0 ? (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Всего детей: {selectedGroupDetails.children.length}
                  </Typography>
                  {user?.role === 'admin' && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => navigate('/children')}
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                        borderRadius: '12px',
                        textTransform: 'none',
                        px: 3,
                        py: 1
                      }}
                    >
                      Добавить ребенка
                    </Button>
                  )}
                </Box>
                <Grid container spacing={3}>
                  {selectedGroupDetails.children.map((child) => (
                    <Grid item xs={12} sm={6} md={4} key={child.id}>
                      <StyledCard>
                        <CardContent>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                            <Avatar
                                src={child.photo_path ? getPhotoUrl(child.photo_path) : null}
                                sx={{ width: 100, height: 100, mb: 2 }}
                                onError={(e) => {
                                    console.error('Ошибка загрузки фото:', {
                                        childId: child.id,
                                        photoPath: child.photo_path,
                                        fullUrl: child.photo_path ? getPhotoUrl(child.photo_path) : null
                                    });
                                    e.target.src = null;
                                    e.target.onError = null;
                                }}
                            >
                                <PersonIcon sx={{ fontSize: 60 }} />
                            </Avatar>
                            <Typography variant="h6" gutterBottom>
                                {child.name}
                            </Typography>
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              Дата рождения: {formatDate(child.date_of_birth)}
                            </Typography>
                            {child.allergies && (
                              <Typography variant="body2" color="text.secondary" paragraph>
                                Аллергии: {Array.isArray(child.allergies) ? child.allergies.join(', ') : child.allergies}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" paragraph>
                              Родитель: {child.parent_name || 
                                       (child.parent_first_name && child.parent_last_name ? 
                                        `${child.parent_first_name} ${child.parent_last_name}` : 
                                        'Не указан')}
                            </Typography>
                            {(child.parent_email && child.parent_email !== 'Не указан') && (
                              <Typography variant="body2" color="text.secondary" paragraph>
                                Email родителя: {child.parent_email}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" paragraph>
                              Группа: {child.group_name || 'Не указана'}
                            </Typography>
                          </Box>

                          {child.services && child.services.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" color="primary" gutterBottom>
                                Дополнительные услуги:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {child.services.map((serviceId) => (
                                  <Chip
                                    key={serviceId}
                                    label={`Услуга ${serviceId}`}
                                    size="small"
                                    sx={{
                                      borderRadius: '12px',
                                      background: 'rgba(99, 102, 241, 0.1)',
                                      color: 'primary.main'
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </CardContent>
                      </StyledCard>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                py: 4 
              }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  В этой группе пока нет детей
                </Typography>
                {user?.role === 'admin' && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/children')}
                    sx={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                      borderRadius: '12px',
                      textTransform: 'none',
                      px: 3,
                      py: 1
                    }}
                  >
                    Добавить детей
                  </Button>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 4 }}>
            <Button
              onClick={handleCloseDetails}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openScheduleDialog}
          onClose={() => setOpenScheduleDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              p: 4,
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            p: 0,
            mb: 4
          }}>
            {selectedGroupDetails?.name} - Режим дня
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <DailySchedule
              schedule={selectedGroupSchedule}
              onSave={handleSaveSchedule}
              isAdmin={user?.role === 'admin'}
            />
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 4 }}>
            <Button
              onClick={() => setOpenScheduleDialog(false)}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openMenuDialog}
          onClose={() => setOpenMenuDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              p: 4,
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            p: 0,
            mb: 4
          }}>
            {selectedGroupDetails?.name} - Меню
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {/* Menu component content */}
          </DialogContent>
          <DialogActions sx={{ p: 0, mt: 4 }}>
            <Button
              onClick={() => setOpenMenuDialog(false)}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Закрыть
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Groups; 