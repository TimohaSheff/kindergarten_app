import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  Badge,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  CardActions,
  Tooltip,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon,
  Palette as PaletteIcon,
  School as SchoolIcon,
  SportsGymnastics as SportsIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Attendance from './Attendance';
import { api } from '../api/api';

// Обновленная группировка направлений
const directionGroups = {
  'Творческое развитие': [
    'Творческое развитие'
  ],
  'Образовательные программы': [
    'Образовательные программы'
  ],
  'Физическое развитие': [
    'Физическое развитие'
  ]
};

const directionIcons = {
  'Творческое развитие': PaletteIcon,
  'Образовательные программы': SchoolIcon,
  'Физическое развитие': SportsIcon
};

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  minHeight: '220px',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '12px',
  background: '#fff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledCardContent = styled(CardContent)({
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '16px',
  '&:last-child': {
    paddingBottom: '16px'
  }
});

const Services = ({ canEdit, canManageRequests }) => {
  const { user } = useAuth();
  const theme = useTheme();
  
  // Обновляем проверку роли пользователя - только админ и воспитатель
  const hasEditRights = user?.role === 'admin' || user?.role === 'teacher';
  const canEditServices = hasEditRights || canEdit;
  const canManageServiceRequests = hasEditRights || canManageRequests;

  const [selectedTab, setSelectedTab] = useState(0);
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetailsOpen, setServiceDetailsOpen] = useState(false);
  const [detailedService, setDetailedService] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Загрузка услуг
        const servicesData = await api.getServices();
        setServices(servicesData || []);

        // Загрузка заявок на услуги
        if (canManageServiceRequests || user.role === 'parent') {
          const requestsData = await api.getServiceRequests();
          
          // Для родителей фильтруем только их заявки
          if (user.role === 'parent') {
            setRequests(requestsData.filter(req => req.parentId === user.id));
          } else {
            setRequests(requestsData);
          }
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, canManageServiceRequests]);

  const handleAddService = () => {
    setEditingService({
      service_name: '',
      description: '',
      price: '',
      duration: '36 занятий',
      total_price: '',
      days_of_week: '',
      time: '',
      teachers: '',
      category: ''
    });
    setOpenDialog(true);
    setServiceDetailsOpen(false);
  };

  const handleEditService = (service) => {
    // Преобразуем числовые значения в строки для полей формы
    setEditingService({
      ...service,
      price: service.price.toString(),
      total_price: service.total_price.toString()
    });
    setOpenDialog(true);
    setServiceDetailsOpen(false);
  };

  const handleOpenServiceDetails = (service) => {
    setDetailedService(service);
    setServiceDetailsOpen(true);
  };

  const handleSaveService = async (service) => {
    try {
      setLoading(true);
      
      const serviceData = {
        service_name: service.service_name,
        description: service.description,
        price: parseFloat(service.price),
        duration: service.duration,
        total_price: parseFloat(service.total_price),
        days_of_week: service.days_of_week,
        time: service.time,
        teachers: service.teachers,
        category: service.category
      };
      
      if (service.service_id) {
        await api.updateService(service.service_id, serviceData);
      } else {
        await api.createService(serviceData);
      }

      // Обновляем список услуг
      const servicesData = await api.getServices();
      setServices(servicesData || []);
    
    setSnackbar({
      open: true,
      message: 'Услуга успешно сохранена',
      severity: 'success'
    });
    setOpenDialog(false);
    } catch (err) {
      console.error('Error saving service:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при сохранении услуги',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    try {
      setLoading(true);
      await api.deleteService(serviceId);

      // Обновляем список услуг
      const servicesData = await api.getServices();
      setServices(servicesData || []);

      setSnackbar({
        open: true,
        message: 'Услуга успешно удалена',
        severity: 'success'
      });
      setServiceDetailsOpen(false);
    } catch (err) {
      console.error('Error deleting service:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при удалении услуги',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEnrollDialog = (service) => {
    setSelectedService(service);
    setEnrollDialog(true);
    setServiceDetailsOpen(false);
  };

  const handleEnrollRequest = async (serviceId) => {
    try {
      setLoading(true);
      await api.createServiceRequest(serviceId);

      // Обновляем список заявок
      const requestsData = await api.getServiceRequests();
      if (user.role === 'parent') {
        setRequests(requestsData.filter(req => req.parentId === user.id));
      } else {
        setRequests(requestsData);
      }

    setSnackbar({
      open: true,
        message: 'Заявка успешно отправлена',
      severity: 'success'
    });
      setEnrollDialog(false);
    } catch (err) {
      console.error('Error creating request:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при отправке заявки',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await api.approveServiceRequest(requestId);

      // Обновляем список заявок
      const requestsData = await api.getServiceRequests();
      setRequests(requestsData);

      // Обновляем список услуг
      const servicesData = await api.getServices();
      setServices(servicesData || []);

    setSnackbar({
      open: true,
        message: 'Заявка успешно одобрена',
      severity: 'success'
    });
    } catch (err) {
      console.error('Error approving request:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при одобрении заявки',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      await api.rejectServiceRequest(requestId);

      // Обновляем список заявок
      const requestsData = await api.getServiceRequests();
      setRequests(requestsData);

    setSnackbar({
      open: true,
      message: 'Заявка отклонена',
      severity: 'success'
    });
    } catch (err) {
      console.error('Error rejecting request:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при отклонении заявки',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const groupKey = service.category || 'Uncategorized'; 
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(service);
    return acc;
  }, {});

  const directions = ['all', ...Object.keys(directionGroups)];

  const renderTabs = () => {
    return (
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 48
            }
          }}
        >
          <Tab label="Услуги" />
          {canManageServiceRequests && <Tab label="Заявки" />}
          {canManageServiceRequests && <Tab label="Одобренные заявки" />}
        </Tabs>
      </Box>
    );
  };

  const renderRequests = (status) => (
    <List>
      {requests
        .filter(r => r.status === status)
        .map((request) => {
          const service = services.find(s => s.service_id === request.service_id);
          return (
            <ListItem
              key={request.request_id}
              sx={{ 
                mb: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 1
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {request.child_name} - {service?.service_name || 'Название услуги не найдено'}
                  </Typography>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Родитель: {request.parent_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Дата заявки: {new Date(request.request_date).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
              {status === 'pending' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Одобрить">
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); handleApproveRequest(request.request_id); }}
                      color="success"
                      size="small"
                    >
                      <CheckIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Отклонить">
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); handleRejectRequest(request.request_id); }}
                      color="error"
                      size="small"
                    >
                      <CloseIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Chip
                label={
                  status === 'pending' ? 'На рассмотрении' :
                  status === 'approved' ? 'Одобрено' : 'Отклонено'
                }
                color={
                  status === 'pending' ? 'warning' :
                  status === 'approved' ? 'success' : 'error'
                }
                size="small"
                sx={{ ml: 2 }}
              />
            </ListItem>
          );
        })
      }
    </List>
  );

  const renderDirectionTabs = () => (
    <Box sx={{ mb: 4, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <CategoryIcon sx={{ mr: 1 }} />
        Направления
      </Typography>
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={selectedDirection}
          onChange={(e, newValue) => setSelectedDirection(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minWidth: 'auto',
              px: 3,
              py: 2,
            },
          }}
        >
          <Tab 
            value="all"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CategoryIcon sx={{ mr: 1 }} />
                Все направления
              </Box>
            }
            sx={{ 
              fontWeight: selectedDirection === 'all' ? 700 : 400,
              color: selectedDirection === 'all' ? 'primary.main' : 'text.secondary',
            }}
          />
          {Object.keys(directionGroups).map((direction) => {
            const Icon = directionIcons[direction] || CategoryIcon;
            return (
              <Tab
                key={direction}
                value={direction}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Icon sx={{ mr: 1 }} />
                    {direction}
                  </Box>
                }
                sx={{ 
                  fontWeight: selectedDirection === direction ? 700 : 400,
                  color: selectedDirection === direction ? 'primary.main' : 'text.secondary',
                }}
              />
            );
          })}
        </Tabs>
      </Paper>
    </Box>
  );

  const renderServiceCard = (service) => {
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={service.service_id}>
        <StyledCard onClick={() => handleOpenServiceDetails(service)}>
          <StyledCardContent>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              mb: 1
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '90%'
                }}
              >
                {service.service_name}
              </Typography>
              {canEditServices && (
                <Tooltip title="Редактировать">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleEditService(service); }}
                    sx={{ ml: 0.5, p: 0.25 }}
                  >
                    <EditIcon sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            <Box sx={{ 
              display: 'flex', 
              gap: 0.5, 
              mb: 1, 
              flexWrap: 'wrap'
            }}>
              <Chip
                label={service.category}
                size="small"
                sx={{
                  fontSize: '0.7rem',
                  height: '18px',
                  '& .MuiChip-label': { px: 0.75 }
                }}
              />
            </Box>

            <Typography 
              variant="body2" 
              sx={{ 
                mb: 1.5, 
                fontSize: '0.8rem',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                minHeight: '3.6em'
              }}
            >
              {service.description}
            </Typography>

            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1,
              mt: 'auto'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTimeIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {service.duration}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MoneyIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {service.price}₽ / занятие
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '0.75rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {service.teachers}
                </Typography>
              </Box>
            </Box>
          </StyledCardContent>
        </StyledCard>
      </Grid>
    );
  };

  const renderContent = () => {
    if (selectedTab === 0) {
      return (
        <>
          {renderDirectionTabs()}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {services
              .filter(service => selectedDirection === 'all' || service.category === selectedDirection)
              .map(service => renderServiceCard(service))}
          </Grid>
        </>
      );
    }

    if (selectedTab === 1 && canManageServiceRequests) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Новые заявки
          </Typography>
          {renderRequests('pending')}
        </Box>
      );
    }

    if (selectedTab === 2 && canManageServiceRequests) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Одобренные заявки
          </Typography>
          {renderRequests('approved')}
        </Box>
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Платные услуги
        </Typography>
        {canEditServices && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddService}
            sx={{ borderRadius: '8px' }}
          >
            Добавить услугу
          </Button>
        )}
      </Box>

      {renderTabs()}
      {renderContent()}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          {editingService?.service_id ? 'Редактировать услугу' : 'Добавить услугу'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              fullWidth
              label="Название услуги"
              value={editingService?.service_name || ''}
              onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
              error={!editingService?.service_name}
              helperText={!editingService?.service_name ? 'Обязательное поле' : ''}
            />
            <TextField
              required
              fullWidth
              label="Описание"
              multiline
              rows={3}
              value={editingService?.description || ''}
              onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
              error={!editingService?.description}
              helperText={!editingService?.description ? 'Обязательное поле' : ''}
            />
            <TextField
              required
              select
              fullWidth
              label="Категория"
              value={editingService?.category || ''}
              onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
              error={!editingService?.category}
              helperText={!editingService?.category ? 'Обязательное поле' : ''}
            >
              {Object.keys(directionGroups).map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              fullWidth
              label="Стоимость за занятие"
              type="number"
              value={editingService?.price || ''}
              onChange={(e) => {
                const price = Number(e.target.value);
                const lessonsMatch = editingService?.duration?.match(/\d+/);
                const lessonsCount = lessonsMatch ? parseInt(lessonsMatch[0], 10) : 36;
                setEditingService({
                  ...editingService,
                  price: e.target.value,
                  total_price: (price * lessonsCount).toString()
                });
              }}
              error={!editingService?.price}
              helperText={!editingService?.price ? 'Обязательное поле' : ''}
              InputProps={{
                inputProps: { min: 0 }
              }}
            />
            <TextField
              required
              fullWidth
              label="Продолжительность курса (напр., 36 занятий)"
              value={editingService?.duration || ''}
              onChange={(e) => {
                  const duration = e.target.value;
                  const price = Number(editingService?.price || 0);
                  const lessonsMatch = duration.match(/\d+/);
                  const lessonsCount = lessonsMatch ? parseInt(lessonsMatch[0], 10) : 0;
                   setEditingService({ 
                     ...editingService, 
                     duration: duration,
                     total_price: (price * lessonsCount).toString()
                    });
                }}
              error={!editingService?.duration}
              helperText={!editingService?.duration ? 'Обязательное поле' : 'Например: 36 занятий'}
            />
             <TextField
              disabled
              fullWidth
              label="Общая стоимость курса"
              value={editingService?.total_price ? `${editingService.total_price} ₽` : '0 ₽'}
              InputProps={{ readOnly: true }}
            />
            <TextField
              required
              fullWidth
              label="Дни недели"
              value={editingService?.days_of_week || ''}
              onChange={(e) => setEditingService({ ...editingService, days_of_week: e.target.value })}
              error={!editingService?.days_of_week}
              helperText={!editingService?.days_of_week ? 'Обязательное поле' : 'Например: Понедельник, Среда, Пятница'}
            />
            <TextField
              required
              fullWidth
              label="Время занятий"
              value={editingService?.time || ''}
              onChange={(e) => setEditingService({ ...editingService, time: e.target.value })}
              error={!editingService?.time}
              helperText={!editingService?.time ? 'Обязательное поле' : 'Например: 16:30-17:00'}
            />
            <TextField
              required
              fullWidth
              label="Преподаватели"
              multiline
              rows={2}
              value={editingService?.teachers || ''}
              onChange={(e) => setEditingService({ ...editingService, teachers: e.target.value })}
              error={!editingService?.teachers}
              helperText={!editingService?.teachers ? 'Обязательное поле' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Отмена
          </Button>
          <Button 
            variant="contained" 
            onClick={() => handleSaveService(editingService)}
            disabled={
              !editingService?.service_name || 
              !editingService?.description ||
              !editingService?.category ||
              !editingService?.price || editingService?.price <= 0 ||
              !editingService?.duration ||
              !editingService?.days_of_week ||
              !editingService?.time ||
              !editingService?.teachers
            }
            sx={{ borderRadius: '8px' }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={serviceDetailsOpen}
        onClose={() => setServiceDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' }
        }}
      >
        {detailedService && (
          <>
            <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {detailedService.service_name}
                </Typography>
                <IconButton onClick={() => setServiceDetailsOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
               <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                    {detailedService.description}
                  </Typography>
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                     <CategoryIcon color="action" />
                     <Chip label={detailedService.category} size="small" />
                  </Box>
                   <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                     <PersonIcon color="action" />
                     <Typography variant="body2">{detailedService.teachers}</Typography>
                  </Box>
                  {canEditServices && (
                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditService(detailedService)}
                        sx={{ 
                          borderRadius: '8px',
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteService(detailedService.service_id)}
                        sx={{ 
                          borderRadius: '8px',
                          bgcolor: 'error.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'error.dark',
                          }
                        }}
                      >
                        Удалить
                      </Button>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} md={5}>
                  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Детали</Typography>
                    <Divider sx={{ mb: 2 }}/>
                     <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScheduleIcon color="action" />
                        <Typography variant="body2">{detailedService.days_of_week}</Typography>
                     </Box>
                     <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon color="action" />
                        <Typography variant="body2">{detailedService.time}</Typography>
                     </Box>
                     <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon color="action" />
                        <Typography variant="body2">{detailedService.duration}</Typography>
                     </Box>
                     <Divider sx={{ my: 2 }}/>
                     <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon color="action" />
                        <Typography variant="body2">{detailedService.price} ₽ за занятие</Typography>
                     </Box>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MoneyIcon color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{detailedService.total_price} ₽ за курс</Typography>
                     </Box>
                  </Paper>
                </Grid>
               </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button 
                onClick={() => setServiceDetailsOpen(false)}
                variant="outlined"
                sx={{ borderRadius: '8px' }}
              >
                Закрыть
              </Button>
              <Button 
                variant="contained" 
                startIcon={<SendIcon />}
                onClick={() => handleOpenEnrollDialog(detailedService)}
                sx={{ 
                  borderRadius: '8px',
                  bgcolor: 'success.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                Записаться
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={enrollDialog}
        onClose={() => setEnrollDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Запись на услугу
              </Typography>
              <IconButton onClick={() => setEnrollDialog(false)}>
                  <CloseIcon />
              </IconButton>
           </Box>
        </DialogTitle>
        <DialogContent>
          {selectedService && (
            <Box sx={{ pt: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 2 
                }}
              >
                {selectedService.service_name}
              </Typography>
              
              <Typography 
                variant="body1" 
                paragraph 
                sx={{ 
                  fontSize: '1rem',
                  lineHeight: 1.6,
                  color: 'text.primary',
                  mb: 3
                }}
              >
                {selectedService.description}
              </Typography>

              <Typography variant="body1" sx={{ mb: 2 }}>
                Вы уверены, что хотите отправить заявку на запись на услугу "{selectedService.service_name}"?
              </Typography>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MoneyIcon color="action" />
                      <Typography variant="body2">{selectedService.price} ₽ за занятие</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MoneyIcon color="action" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedService.total_price} ₽ за курс</Typography>
                  </Box>
              </Paper>

            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setEnrollDialog(false)}
            sx={{ borderRadius: '8px' }}
          >
            Отмена
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SendIcon />}
            onClick={() => handleEnrollRequest(selectedService.service_id)}
            sx={{ 
              borderRadius: '8px',
              px: 3
            }}
            disabled={loading}
          >
            {loading ? 'Отправка...' : 'Отправить заявку'}
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
  );
};

export default Services; 