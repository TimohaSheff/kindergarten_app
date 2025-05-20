import React, { useState, useEffect, useMemo } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Checkbox,
  CircularProgress,
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
import { useOutletContext } from 'react-router-dom';

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

const daysOfWeek = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница'
];

const Services = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { PageTitle } = useOutletContext();
  
  // Обновляем проверку роли пользователя - только админ и воспитатель
  const hasEditRights = user?.role === 'admin' || user?.role === 'teacher';
  const canEditServices = hasEditRights;
  const canManageServiceRequests = hasEditRights;

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
  const [selectedChild, setSelectedChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTime, setSelectedTime] = useState({
    start: '',
    end: ''
  });
  const [teachersList, setTeachersList] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Загружаем список услуг
        const servicesResponse = await api.services.getAll();
        console.log('Raw services data:', servicesResponse);
        console.log('Services data type:', typeof servicesResponse);
        console.log('Is array:', Array.isArray(servicesResponse.data));
        
        if (servicesResponse?.data) {
          setServices(servicesResponse.data);
        }

        // Загружаем заявки на услуги
        console.log('Fetching service requests...');
        const requestsResponse = await api.serviceRequests.getAll();
        console.log('Received requests data:', requestsResponse);
        if (requestsResponse?.data) {
          setRequests(requestsResponse.data);
        }

        // Если пользователь - родитель, загружаем только его детей
        if (user.role === 'parent') {
          console.log('Fetching children for parent:', user.user_id);
          const parentId = parseInt(String(user.user_id).trim());
          if (isNaN(parentId)) {
            throw new Error('Некорректный ID родителя');
          }
          const childrenResponse = await api.children.getAll({ parent_id: parentId });
          console.log('Received children data:', childrenResponse);
          if (childrenResponse?.data) {
            // Фильтруем уникальных детей по child_id
            const uniqueChildren = childrenResponse.data.filter((child, index, self) =>
              index === self.findIndex((c) => c.child_id === child.child_id)
            );
            console.log('Filtered unique children:', uniqueChildren);
            setChildren(uniqueChildren);
          }
          // Для родителя не загружаем список учителей
          return;
        }

        // Для остальных ролей загружаем список учителей
        try {
          const teachersResponse = await api.users.getAll({ include_children: true });
          if (teachersResponse?.data) {
            setTeachersList(teachersResponse.data);
          }
        } catch (error) {
          console.log('Error fetching teachers:', error);
          // Не показываем ошибку пользователю, так как это не критично для работы
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error);
        setLoading(false);
        setSnackbar({
          open: true,
          message: error.message || 'Ошибка при загрузке данных',
          severity: 'error'
        });
      }
    };

    fetchData();
  }, [user.role, canManageServiceRequests]);

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
      category: Object.keys(directionGroups)[0]
    });
    setSelectedDays([]);
    setSelectedTime({ start: '', end: '' });
    setOpenDialog(true);
    setServiceDetailsOpen(false);
  };

  const handleEditService = (service) => {
    console.log('Editing service:', service);
    
    // Преобразуем числовые значения в строки для полей формы
    setEditingService({
      ...service,
      price: service.price?.toString() || '',
      total_price: service.total_price?.toString() || '',
      category: service.category || Object.keys(directionGroups)[0],
      days_of_week: service.days_of_week || '',
      time: service.time || '',
      teachers: service.teachers || ''
    });
    
    // Инициализируем дни недели
    const daysArray = service.days_of_week ? service.days_of_week.split(', ').filter(day => daysOfWeek.includes(day)) : [];
    setSelectedDays(daysArray);
    
    // Инициализируем время
    const [start = '', end = ''] = service.time ? service.time.split('-') : [];
    setSelectedTime({ start, end });
    
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
      
      console.log('Original service data:', service);
      
      // Проверяем и форматируем данные перед отправкой
      const serviceData = {
        service_name: service.service_name.trim(),
        description: service.description.trim(),
        price: parseFloat(service.price),
        duration: service.duration.trim(),
        total_price: parseFloat(service.total_price),
        days_of_week: selectedDays.join(', '),
        time: `${selectedTime.start}-${selectedTime.end}`,
        teachers: service.teachers || '',
        category: service.category
      };

      console.log('Formatted service data:', serviceData);
      
      if (service.service_id) {
        console.log('Updating service:', service.service_id);
        const response = await api.services.update(service.service_id, serviceData);
        console.log('Update response:', response);
      } else {
        console.log('Creating new service');
        const response = await api.services.create(serviceData);
        console.log('Create response:', response);
      }

      // Обновляем список услуг
      const servicesData = await api.services.getAll();
      console.log('Updated services data:', servicesData);
      setServices(servicesData?.data || []);
    
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
      await api.services.delete(serviceId);

      // Обновляем список услуг
      const servicesData = await api.services.getAll();
      setServices(servicesData?.data || []);

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
    // Преобразуем ID услуги в число
    const serviceWithNumericId = {
      ...service,
      service_id: parseInt(String(service.service_id).trim())
    };
    console.log('Opening enroll dialog for service:', serviceWithNumericId);
    
    setSelectedService(serviceWithNumericId);
    setSelectedChild(null);
    setEnrollDialog(true);
    setServiceDetailsOpen(false);

    // Загружаем список детей для родителя
    if (user.role === 'parent') {
      const fetchChildren = async () => {
        try {
          setLoading(true);
          const parentId = parseInt(String(user.user_id).trim());
          if (isNaN(parentId)) {
            throw new Error('Некорректный ID родителя');
          }
          const response = await api.children.getAll({ parent_id: parentId });
          console.log('Received children data:', response);
          if (response?.data) {
            // Фильтруем уникальных детей по child_id и преобразуем их ID в числа
            const uniqueChildren = response.data
              .filter((child, index, self) =>
                index === self.findIndex((c) => c.child_id === child.child_id)
              )
              .map(child => ({
                ...child,
                child_id: parseInt(String(child.child_id).trim())
              }));
            console.log('Filtered unique children:', uniqueChildren);
            setChildren(uniqueChildren);
          }
        } catch (error) {
          console.error('Error fetching children:', error);
          setSnackbar({
            open: true,
            message: error.message || 'Ошибка при загрузке списка детей',
            severity: 'error'
          });
        } finally {
          setLoading(false);
        }
      };
      fetchChildren();
    }
  };

  const handleEnrollRequest = async (serviceId, childId) => {
    try {
      setLoading(true);
      console.log('Отправка заявки:', { serviceId, childId });

      // Проверяем наличие обязательных параметров
      if (!serviceId || !childId) {
        throw new Error('Необходимо указать service_id и child_id');
      }

      // Преобразуем ID в числа, удаляя возможные пробелы
      const numericServiceId = parseInt(String(serviceId).trim());
      const numericChildId = parseInt(String(childId).trim());

      // Проверяем корректность преобразования
      if (isNaN(numericServiceId) || isNaN(numericChildId)) {
        throw new Error('Некорректный формат ID услуги или ребенка');
      }

      console.log('Отправка заявки с преобразованными ID:', {
        service_id: numericServiceId,
        child_id: numericChildId
      });

      const response = await api.serviceRequests.create({
        service_id: numericServiceId,
        child_id: numericChildId
      });

      console.log('Ответ сервера:', response);

      if (response.status === 201 || response.status === 200) {
        // Обновляем список заявок
        const requestsData = await api.serviceRequests.getAll();
        setRequests(requestsData?.data || []);

        setSnackbar({
          open: true,
          message: 'Заявка успешно отправлена',
          severity: 'success'
        });
        setEnrollDialog(false);
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('Ошибка при отправке заявки:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Ошибка при отправке заявки',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await api.serviceRequests.approve(requestId);
      
      // Обновляем список заявок
      const requestsData = await api.serviceRequests.getAll();
      setRequests(requestsData || []);
      
      setSnackbar({
        open: true,
        message: 'Заявка успешно одобрена',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error approving service request:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при одобрении заявки',
        severity: 'error'
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.serviceRequests.reject(requestId);
      
      // Обновляем список заявок
      const requestsData = await api.serviceRequests.getAll();
      setRequests(requestsData || []);
      
      setSnackbar({
        open: true,
        message: 'Заявка отклонена',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error rejecting service request:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при отклонении заявки',
        severity: 'error'
      });
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await api.serviceRequests.delete(requestId);
      
      // Обновляем список заявок
      const requestsData = await api.serviceRequests.getAll();
      setRequests(requestsData || []);
      
      setSnackbar({
        open: true,
        message: 'Заявка успешно удалена',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting service request:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при удалении заявки',
        severity: 'error'
      });
    }
  };

  const groupedServices = useMemo(() => {
    console.log('Current services state:', services);
    console.log('Services state type:', typeof services);
    console.log('Is services array:', Array.isArray(services));
    
    if (!Array.isArray(services)) {
      console.error('Services is not an array:', services);
      return {};
    }
    
    return services.reduce((acc, service) => {
      if (!service) return acc;
      // Если категория null или undefined, используем 'Образовательные программы'
      const groupKey = service?.category || 'Образовательные программы';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push({
        ...service,
        category: service.category || 'Образовательные программы'
      });
      return acc;
    }, {});
  }, [services]);

  const directions = ['all', ...Object.keys(directionGroups)];

  const renderTabs = () => null;

  const renderParentRequests = () => (
    <List>
      {Array.isArray(requests) && requests.map((request) => (
        <ListItem
          key={request.request_id}
          divider
          secondaryAction={
            <Box>
              <Chip
                label={
                  request.status === 'pending' ? 'На рассмотрении' :
                  request.status === 'approved' ? 'Одобрено' :
                  'Отклонено'
                }
                color={
                  request.status === 'pending' ? 'warning' :
                  request.status === 'approved' ? 'success' :
                  'error'
                }
                size="small"
              />
            </Box>
          }
        >
          <ListItemText
            primary={request.service_name}
            secondary={
              <>
                <Typography component="span" variant="body2">
                  Ребенок: {request.child_name}
                </Typography>
                {request.teacher_names && (
                  <>
                    <br />
                    <Typography component="span" variant="body2">
                      Воспитатели: {request.teacher_names}
                    </Typography>
                  </>
                )}
              </>
            }
          />
        </ListItem>
      ))}
      {(!Array.isArray(requests) || requests.length === 0) && (
        <ListItem>
          <ListItemText primary="У вас пока нет заявок на услуги" />
        </ListItem>
      )}
    </List>
  );

  const renderRequests = (status = 'pending') => (
    <List>
      {Array.isArray(requests) ? (
        requests
          .filter(request => request.status === status)
          .map((request) => (
            <ListItem
              key={request.request_id}
              divider
              secondaryAction={
                <Box>
                  {status === 'pending' && canManageServiceRequests ? (
                    <>
                      <Tooltip title="Одобрить">
                        <IconButton
                          edge="end"
                          aria-label="approve"
                          onClick={() => handleApproveRequest(request.request_id)}
                          sx={{ color: 'success.main', mr: 1 }}
                        >
                          <CheckIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Отклонить">
                        <IconButton
                          edge="end"
                          aria-label="reject"
                          onClick={() => handleRejectRequest(request.request_id)}
                          sx={{ color: 'error.main', mr: 1 }}
                        >
                          <CloseIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : status === 'approved' ? (
                    <Tooltip title="Отклонить">
                      <IconButton
                        edge="end"
                        aria-label="reject"
                        onClick={() => handleRejectRequest(request.request_id)}
                        sx={{ color: 'error.main', mr: 1 }}
                      >
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  ) : status === 'rejected' ? (
                    <Tooltip title="Одобрить">
                      <IconButton
                        edge="end"
                        aria-label="approve"
                        onClick={() => handleApproveRequest(request.request_id)}
                        sx={{ color: 'success.main', mr: 1 }}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Удалить">
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteRequest(request.request_id)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemText
                primary={request.service_name}
                secondary={
                  <>
                    <Typography component="span" variant="body2">
                      Ребенок: {request.child_name}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      Родитель: {request.parent_name}
                    </Typography>
                    {request.teacher_names && (
                      <>
                        <br />
                        <Typography component="span" variant="body2">
                          Воспитатели: {request.teacher_names}
                        </Typography>
                      </>
                    )}
                  </>
                }
              />
            </ListItem>
          ))
      ) : (
        <ListItem>
          <ListItemText primary="Загрузка заявок..." />
        </ListItem>
      )}
      {Array.isArray(requests) && requests.filter(request => request.status === status).length === 0 && (
        <ListItem>
          <ListItemText primary={`Нет ${
            status === 'pending' ? 'новых' : 
            status === 'approved' ? 'одобренных' : 
            'отклоненных'
          } заявок`} />
        </ListItem>
      )}
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
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault();
                      handleEditService(service); 
                    }}
                    sx={{ ml: 0.5, p: 0.25 }}
                    tabIndex={0}
                    aria-label="Редактировать услугу"
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

  const handleTimeChange = (type) => (event) => {
    const newTime = {
      ...selectedTime,
      [type]: event.target.value
    };
    setSelectedTime(newTime);
    
    const timeString = `${newTime.start}-${newTime.end}`;
    setEditingService(prev => ({
      ...prev,
      time: timeString
    }));
  };

  const handleDaysChange = (event) => {
    const selectedDaysList = event.target.value;
    setSelectedDays(selectedDaysList);
    setEditingService(prev => ({
      ...prev,
      days_of_week: selectedDaysList.join(', ')
    }));
  };

  const handleTeachersChange = (event) => {
    const selectedTeachers = event.target.value;
    setEditingService(prev => ({
      ...prev,
      teachers: selectedTeachers.join(', ')
    }));
  };

  const renderContent = () => {
    if (selectedTab === 0) {
      return (
        <>
          {renderDirectionTabs()}
          <Grid container spacing={2}>
            {Array.isArray(services) && services
              .filter(service => selectedDirection === 'all' || service?.category === selectedDirection)
              .map(service => service && renderServiceCard(service))}
          </Grid>
        </>
      );
    }

    if (selectedTab === 1) {
      if (user.role === 'parent') {
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Мои заявки на услуги
            </Typography>
            {renderParentRequests()}
          </Box>
        );
      } else if (canManageServiceRequests) {
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Новые заявки
            </Typography>
            {renderRequests('pending')}
          </Box>
        );
      }
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

    if (selectedTab === 3 && canManageServiceRequests) {
      return (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Отклоненные заявки
          </Typography>
          {renderRequests('rejected')}
        </Box>
      );
    }
  };

  return (
    <Box>
      <Box sx={{ pl: 3, pt: 3 }}>
        <PageTitle>Платные услуги</PageTitle>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        p: 2
      }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
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
            {(canManageServiceRequests || user.role === 'parent') && (
              <Tab label={user.role === 'parent' ? "Мои заявки" : "Новые заявки"} />
            )}
            {canManageServiceRequests && <Tab label="Одобренные заявки" />}
            {canManageServiceRequests && <Tab label="Отклоненные заявки" />}
          </Tabs>
          {canEditServices && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddService}
              sx={{
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                padding: '8px 16px',
                height: '40px',
                backgroundColor: 'primary.main',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }
              }}
            >
              Добавить услугу
            </Button>
          )}
        </Box>

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
                fullWidth
                label="Название услуги"
                value={editingService?.service_name || ''}
                onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
              />
              
              <TextField
                fullWidth
                label="Описание"
                multiline
                rows={3}
                value={editingService?.description || ''}
                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
              />

              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={editingService?.category || ''}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                >
                  {Object.keys(directionGroups).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
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
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />

              <TextField
                fullWidth
                label="Продолжительность курса"
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
                helperText="Например: 36 занятий"
              />

              <TextField
                disabled
                fullWidth
                label="Общая стоимость курса"
                value={editingService?.total_price ? `${editingService.total_price} ₽` : '0 ₽'}
                InputProps={{ readOnly: true }}
              />

              <FormControl fullWidth>
                <InputLabel>Дни недели</InputLabel>
                <Select
                  multiple
                  value={selectedDays}
                  onChange={handleDaysChange}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {daysOfWeek.map((day) => (
                    <MenuItem key={day} value={day}>
                      <Checkbox checked={selectedDays.indexOf(day) > -1} />
                      <ListItemText primary={day} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Время начала"
                  type="time"
                  value={selectedTime.start}
                  onChange={handleTimeChange('start')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Время окончания"
                  type="time"
                  value={selectedTime.end}
                  onChange={handleTimeChange('end')}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 300 }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>Преподаватели</InputLabel>
                <Select
                  multiple
                  value={editingService?.teachers ? editingService.teachers.split(', ') : []}
                  onChange={handleTeachersChange}
                  renderValue={(selected) => selected.join(', ')}
                >
                  {teachersList.map((teacher) => (
                    <MenuItem key={teacher.user_id} value={`${teacher.first_name} ${teacher.last_name}`}>
                      <Checkbox checked={editingService?.teachers?.includes(`${teacher.first_name} ${teacher.last_name}`)} />
                      <ListItemText primary={`${teacher.first_name} ${teacher.last_name}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Выберите ребенка</InputLabel>
                  <Select
                    value={selectedChild || ''}
                    onChange={(e) => {
                      const childId = parseInt(String(e.target.value).trim());
                      console.log('Selected child ID:', childId, typeof childId);
                      setSelectedChild(childId);
                    }}
                    label="Выберите ребенка"
                  >
                    {children.map((child) => (
                      <MenuItem key={child.child_id} value={child.child_id}>
                        {child.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  Вы уверены, что хотите отправить заявку на запись на услугу "{selectedService.service_name}"?
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    onClick={() => setEnrollDialog(false)}
                    color="inherit"
                  >
                    Отмена
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleEnrollRequest(selectedService.service_id, selectedChild)}
                    disabled={!selectedChild || loading || !children || children.length === 0}
                    sx={{
                      minWidth: '120px'
                    }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Отправка...
                      </>
                    ) : 'Отправить'}
                  </Button>
                </Box>
              </Box>
            )}
          </DialogContent>
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
    </Box>
  );
};

export default Services; 