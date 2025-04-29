import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    CardActions,
    Grid,
    IconButton,
    Typography,
    Avatar,
    Chip,
    Snackbar,
    Alert,
    ListItem,
    ListItemAvatar
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon, PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';

const StyledCard = styled(Card)(({ theme }) => ({
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    background: '#FFFFFF',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
    },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
    width: 80,
    height: 80,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    border: '3px solid #fff',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    '& .MuiSvgIcon-root': {
        fontSize: '2.5rem',
    },
}));

const StyledChip = styled(Chip)(({ theme }) => ({
    margin: '4px',
    borderRadius: '12px',
    height: '24px',
    fontSize: '0.75rem',
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
    border: 'none',
    '&.error': {
        backgroundColor: 'rgba(211, 47, 47, 0.08)',
        color: theme.palette.error.main,
    },
    '&.primary': {
        backgroundColor: 'rgba(25, 118, 210, 0.08)',
        color: theme.palette.primary.main,
    }
}));

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('data:')) return photoPath;
    
    // Добавляем логирование для отладки
    const fullUrl = `${BASE_URL}/${photoPath}`;
    console.log('Constructing photo URL:', {
        photoPath,
        baseUrl: BASE_URL,
        fullUrl
    });
    return fullUrl;
};

const ChildrenManagement = ({ canEdit = false, viewMode = 'full', userRole }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [filteredChildren, setFilteredChildren] = useState([]);
    const [currentGroup, setCurrentGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [parents, setParents] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedChild, setSelectedChild] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [childToDelete, setChildToDelete] = useState(null);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    const [formData, setFormData] = useState({
        name: '',
        date_of_birth: '',
        parent_id: '',
        group_id: '',
        allergies: '',
        services: [],
        photo: null,
        photo_mime_type: null
    });

    const [imageLoadError, setImageLoadError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const searchParams = new URLSearchParams(location.search);
                const groupId = searchParams.get('groupId');

                await Promise.all([
                    fetchChildren(),
                    fetchGroups(),
                    fetchParents(),
                    fetchServices()
                ]);

                if (groupId) {
                    const group = groups.find(g => (g.group_id || g.id) === Number(groupId));
                    setCurrentGroup(group);
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
    }, [location.search]);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const groupId = searchParams.get('groupId');

        if (groupId && children.length > 0) {
            const filtered = children.filter(child => 
                (child.group_id || child.id) === Number(groupId)
            );
            setFilteredChildren(filtered);
        } else {
            setFilteredChildren(children);
        }
    }, [children, location.search]);

    const fetchServices = async () => {
        try {
            const response = await axios.get('/services');
            setServices(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке услуг:', error);
        }
    };

    const fetchChildren = async () => {
        try {
            const response = await axios.get('/children');
            const processedChildren = response.data.map(child => ({
                ...child,
                services: Array.isArray(child.services) 
                    ? child.services.map(Number).filter(n => !isNaN(n))
                    : typeof child.services === 'string'
                        ? child.services.replace(/[{}\s]/g, '').split(',').filter(Boolean).map(Number)
                        : [],
                allergies: child.allergies || ''
            }));
            console.log('Обработанные данные детей:', processedChildren);
            setChildren(processedChildren);
        } catch (error) {
            console.error('Ошибка при загрузке детей:', error);
            setSnackbar({
                open: true,
                message: 'Ошибка при загрузке списка детей',
                severity: 'error'
            });
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await axios.get('/groups');
            if (response.data && Array.isArray(response.data)) {
                const validGroups = response.data.filter(
                    group => group && (group.group_id || group.id) && (group.group_name || group.name)
                );
                setGroups(validGroups);
            } else {
                console.error('Неверный формат данных групп:', response.data);
                setGroups([]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке групп:', error);
            if (error.response) {
                console.error('Ответ сервера:', error.response.data);
            }
            setGroups([]);
        }
    };

    const fetchParents = async () => {
        try {
            const response = await axios.get('/users?role=parent');
            setParents(response.data);
        } catch (error) {
            console.error('Ошибка при загрузке родителей:', error);
        }
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Проверяем размер файла (максимум 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    setSnackbar({
                        open: true,
                        message: 'Размер файла не должен превышать 5MB',
                        severity: 'error'
                    });
                    return;
                }

                // Проверяем тип файла
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(file.type)) {
                    setSnackbar({
                        open: true,
                        message: 'Поддерживаются только форматы JPEG, PNG и WEBP',
                        severity: 'error'
                    });
                    return;
                }

                // Конвертируем файл в base64
                const base64Data = await convertToBase64(file);
                console.log('Фото сконвертировано в base64');

                // Обновляем состояние формы
                setFormData(prev => ({
                    ...prev,
                    photo: base64Data
                }));

                // Создаем URL для превью
                const previewUrl = URL.createObjectURL(file);
                setPhotoPreview(previewUrl);
                
                setSnackbar({
                    open: true,
                    message: 'Фото успешно загружено',
                    severity: 'success'
                });
            } catch (error) {
                console.error('Ошибка при обработке фото:', error);
                setSnackbar({
                    open: true,
                    message: 'Ошибка при обработке фотографии',
                    severity: 'error'
                });
            }
        }
    };

    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') === 0) {
                const blob = item.getAsFile();
                
                // Проверяем размер файла
                if (blob.size > 5 * 1024 * 1024) {
                    setSnackbar({
                        open: true,
                        message: 'Размер файла не должен превышать 5MB',
                        severity: 'error'
                    });
                    return;
                }

                // Проверяем тип файла
                const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!validTypes.includes(blob.type)) {
                    setSnackbar({
                        open: true,
                        message: 'Поддерживаются только форматы JPEG, PNG и WEBP',
                        severity: 'error'
                    });
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    setPhotoPreview(reader.result);
                    setFormData(prev => ({
                        ...prev,
                        photo: reader.result
                    }));
                };
                reader.readAsDataURL(blob);
                break;
            }
        }
    };

    const handleOpenDialog = (child = null) => {
        if (child) {
            const birthDate = child.date_of_birth ? new Date(child.date_of_birth).toISOString().split('T')[0] : '';
            console.log('Редактируемый ребенок:', child);
            
            const groupId = child.group_id || child.id;
            const group = groups.find(g => g.id === groupId || g.group_id === groupId);
            
            setSelectedChild({
                ...child,
                id: child.child_id || child.id
            });
            
            setFormData({
                name: child.name,
                date_of_birth: birthDate,
                parent_id: child.parent_id,
                group_id: group ? groupId : '',
                allergies: Array.isArray(child.allergies) ? child.allergies.join(',') : child.allergies || '',
                services: Array.isArray(child.services) ? child.services.map(Number) : [],
                photo: null
            });
            
            // Устанавливаем превью фото с правильным URL
            if (child.photo_path) {
                const photoUrl = `${BASE_URL}/${child.photo_path}`;
                console.log('Setting photo preview URL:', photoUrl);
                setPhotoPreview(photoUrl);
                setImageLoadError(false);
            } else {
                setPhotoPreview(null);
            }
        } else {
            setSelectedChild(null);
            setFormData({
                name: '',
                date_of_birth: '',
                parent_id: '',
                group_id: '',
                allergies: '',
                services: [],
                photo: null
            });
            setPhotoPreview(null);
            setImageLoadError(false);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedChild(null);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log('Изменение поля:', name, 'Значение:', value, 'Тип:', typeof value);
        
        let processedValue = value;
        if (name === 'services') {
            console.log('Обработка services, исходное значение:', value);
            // Всегда преобразуем в массив чисел
            processedValue = Array.isArray(value) 
                ? value.map(v => Number(v))
                : typeof value === 'string'
                    ? [Number(value)]
                    : [];
            
            // Фильтруем невалидные значения
            processedValue = processedValue.filter(v => !isNaN(v) && v !== 0);
            console.log('Обработанное значение services:', processedValue);
        } else if (name === 'allergies') {
            // Обработка поля allergies
            processedValue = value || '';
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Отправляемые данные:', {
            ...formData,
            photo: formData.photo ? 'base64_data_present' : null
        });

        try {
            // Форматируем аллергии
            let formattedAllergies = null;
            if (formData.allergies) {
                if (typeof formData.allergies === 'string') {
                    formattedAllergies = formData.allergies.trim().toLowerCase() === 'нет' || 
                                       formData.allergies.trim() === '' 
                                       ? 'Аллергий нет' 
                                       : formData.allergies.split(',').map(a => a.trim()).filter(Boolean);
                } else if (Array.isArray(formData.allergies)) {
                    formattedAllergies = formData.allergies;
                }
            } else {
                formattedAllergies = 'Аллергий нет';
            }

            // Форматируем сервисы
            const formattedServices = formData.services && formData.services.length > 0 
                ? Array.isArray(formData.services) 
                    ? formData.services.map(Number).filter(n => !isNaN(n))
                    : [Number(formData.services)].filter(n => !isNaN(n))
                : [];

            const dataToSend = {
                name: formData.name.trim(),
                date_of_birth: formData.date_of_birth,
                parent_id: Number(formData.parent_id),
                group_id: Number(formData.group_id),
                allergies: formattedAllergies,
                services: formattedServices
            };

            // Добавляем фото только если оно было изменено
            if (formData.photo) {
                if (formData.photo.startsWith('data:')) {
                    dataToSend.photo = formData.photo.split(',')[1];
                } else {
                    dataToSend.photo = formData.photo;
                }
            }

            console.log('Отправка данных на сервер:', {
                ...dataToSend,
                photo: dataToSend.photo ? 'base64_data_present' : null
            });

            let response;
            if (selectedChild && selectedChild.id) {
                response = await axios.put(`/children/${selectedChild.id}`, dataToSend);
                console.log('Ответ сервера при обновлении:', response.data);
                setSnackbar({
                    open: true,
                    message: 'Данные ребенка успешно обновлены',
                    severity: 'success'
                });
            } else {
                response = await axios.post('/children', dataToSend);
                console.log('Ответ сервера при создании:', response.data);
                setSnackbar({
                    open: true,
                    message: 'Ребенок успешно добавлен',
                    severity: 'success'
                });
            }

            handleCloseDialog();
            await fetchChildren();
        } catch (error) {
            console.error('Ошибка при сохранении данных:', error);
            if (error.response?.data) {
                console.error('Детали ошибки:', error.response.data);
            }
            
            const errorMessage = error.response?.data?.message || 
                               error.response?.data?.error || 
                               error.message || 
                               'Неизвестная ошибка';
                               
            setSnackbar({
                open: true,
                message: `Ошибка при ${selectedChild ? 'обновлении' : 'создании'} записи: ${errorMessage}`,
                severity: 'error'
            });
        }
    };

    const handleDelete = async (childId) => {
        setChildToDelete(childId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setLoading(true);
            // Сначала пробуем удалить все рекомендации для этого ребенка
            try {
                await axios.delete(`/recommendations/child/${childToDelete}`);
            } catch (error) {
                console.warn('Ошибка при удалении рекомендаций:', error);
                // Продолжаем выполнение даже если рекомендации не удалось удалить
            }
            
            // Затем удаляем самого ребенка
            const response = await axios.delete(`/children/${childToDelete}`);
            
            if (response.status === 200) {
                await fetchChildren();
                setSnackbar({
                    open: true,
                    message: 'Ребенок успешно удален',
                    severity: 'success'
                });
                setDeleteDialogOpen(false);
                setChildToDelete(null);
            } else {
                throw new Error('Не удалось удалить ребенка');
            }
        } catch (error) {
            console.error('Ошибка при удалении ребенка:', error);
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'Ошибка при удалении ребенка',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setChildToDelete(null);
    };

    // Модифицируем отображение данных в зависимости от роли и режима просмотра
    const renderChildrenList = () => {
        return (
            <Grid container spacing={3}>
                {currentGroup && (
                    <Grid item xs={12}>
                        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h5" component="h2">
                                Группа: {currentGroup.group_name}
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/groups')}
                                sx={{
                                    borderRadius: '12px',
                                    textTransform: 'none'
                                }}
                            >
                                Вернуться к списку групп
                            </Button>
                        </Box>
                    </Grid>
                )}
                {filteredChildren.map((child) => (
                    <Grid item xs={12} sm={6} md={4} key={child.child_id || child.id}>
                        <StyledCard>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    mb: 2 
                                }}>
                                    <StyledAvatar
                                        src={child.photo_path ? getPhotoUrl(child.photo_path) : null}
                                        onError={(e) => {
                                            console.error('Ошибка загрузки изображения для:', {
                                                childId: child.child_id || child.id,
                                                photoPath: child.photo_path,
                                                fullUrl: child.photo_path ? getPhotoUrl(child.photo_path) : null,
                                                error: e
                                            });
                                            // Сбрасываем src и показываем иконку по умолчанию
                                            e.target.src = null;
                                            e.target.onError = null;
                                        }}
                                    >
                                        <PersonIcon />
                                    </StyledAvatar>
                                    <Typography 
                                        variant="h6" 
                                        sx={{ 
                                            fontWeight: 600,
                                            fontSize: '1.1rem',
                                            color: '#1a1a1a',
                                            mt: 1
                                        }}
                                    >
                                        {child.name}
                                    </Typography>
                                </Box>

                                <Box sx={{ mb: 1.5 }}>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mb: 0.5,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Дата рождения: {new Date(child.date_of_birth).toLocaleDateString('ru-RU')}
                                    </Typography>

                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mb: 0.5,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Группа: {groups.find(g => g.group_id === child.group_id)?.group_name || 'Не указана'}
                                    </Typography>

                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mb: 0.5,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Родитель: {child.parent_first_name && child.parent_last_name 
                                            ? `${child.parent_first_name} ${child.parent_last_name}`
                                            : parents.find(p => p.user_id === child.parent_id)?.name || 'Не указан'
                                        }
                                    </Typography>

                                    {child.parent_email && (
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'text.secondary',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            Email: {child.parent_email}
                                        </Typography>
                                    )}
                                </Box>

                                {/* Аллергии */}
                                {child.allergies && child.allergies.length > 0 && (
                                    <Box sx={{ mb: 1.5 }}>
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                                color: '#1a1a1a',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                mb: 0.5 
                                            }}
                                        >
                                            Аллергии:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {Array.isArray(child.allergies) 
                                                ? child.allergies.map((allergy, index) => (
                                                    <StyledChip
                                                        key={index}
                                                        label={allergy}
                                                        size="small"
                                                        className="error"
                                                    />
                                                ))
                                                : child.allergies.split(',').map((allergy, index) => (
                                                    <StyledChip
                                                        key={index}
                                                        label={allergy.trim()}
                                                        size="small"
                                                        className="error"
                                                    />
                                                ))
                                            }
                                        </Box>
                                    </Box>
                                )}

                                {/* Услуги */}
                                {child.services && child.services.length > 0 && (
                                    <Box sx={{ mb: 1 }}>
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                                color: '#1a1a1a',
                                                fontSize: '0.875rem',
                                                fontWeight: 600,
                                                mb: 0.5 
                                            }}
                                        >
                                            Дополнительные услуги:
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {child.services.map((serviceId) => {
                                                const service = services.find(s => s.service_id === serviceId);
                                                return (
                                                    <StyledChip
                                                        key={serviceId}
                                                        label={service ? service.service_name : `Услуга ${serviceId}`}
                                                        size="small"
                                                        className="primary"
                                                    />
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>

                            {canEdit && (
                                <CardActions sx={{ 
                                    justifyContent: 'flex-end', 
                                    p: 1.5,
                                    mt: 'auto',
                                    borderTop: '1px solid rgba(0, 0, 0, 0.05)'
                                }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog(child)}
                                        sx={{
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                            }
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(child.child_id || child.id)}
                                        sx={{
                                            color: 'error.main',
                                            '&:hover': {
                                                backgroundColor: 'rgba(211, 47, 47, 0.08)'
                                            }
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </CardActions>
                            )}
                        </StyledCard>
                    </Grid>
                ))}
            </Grid>
        );
    };

    return (
        <>
            {!['admin', 'teacher', 'psychologist', 'parent'].includes(userRole) ? (
                <Box sx={{ p: 3 }}>
                    <Alert severity="error">
                        У вас нет прав для управления детьми
                    </Alert>
                </Box>
            ) : (
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h4" component="h1">
                            Список детей
                        </Typography>
                        {canEdit && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => handleOpenDialog(null)}
                            >
                                Добавить ребенка
                            </Button>
                        )}
                    </Box>

                    {renderChildrenList()}

                    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                        <DialogTitle>
                            {selectedChild ? 'Редактировать ребенка' : 'Добавить ребенка'}
                        </DialogTitle>
                        <form onSubmit={handleSubmit} onPaste={handlePaste}>
                            <DialogContent>
                                <Box display="flex" flexDirection="column" gap={2}>
                                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                                        {photoPreview && (
                                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                                <img
                                                    src={photoPreview}
                                                    alt="Предпросмотр"
                                                    style={{
                                                        maxWidth: '200px',
                                                        maxHeight: '200px',
                                                        objectFit: 'contain',
                                                        borderRadius: '8px'
                                                    }}
                                                    onError={(e) => {
                                                        console.error('Ошибка загрузки превью');
                                                        setPhotoPreview(null);
                                                    }}
                                                />
                                            </Box>
                                        )}
                                        <Button
                                            variant="outlined"
                                            component="label"
                                            startIcon={<PhotoCameraIcon />}
                                            sx={{
                                                mb: 2,
                                                borderRadius: '8px',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                                                }
                                            }}
                                        >
                                            {photoPreview ? 'Изменить фото' : 'Добавить фото'}
                                            <input
                                                type="file"
                                                hidden
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handlePhotoChange}
                                            />
                                        </Button>
                                        {photoPreview && (
                                            <Button
                                                variant="text"
                                                color="error"
                                                onClick={() => {
                                                    setPhotoPreview(null);
                                                    setFormData(prev => ({ ...prev, photo: null }));
                                                }}
                                                sx={{ mb: 2 }}
                                            >
                                                Удалить фото
                                            </Button>
                                        )}
                                    </Box>
                                    <TextField
                                        name="name"
                                        label="Имя"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                    />
                                    <TextField
                                        name="date_of_birth"
                                        label="Дата рождения"
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>Группа</InputLabel>
                                        <Select
                                            value={formData.group_id || ''}
                                            onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                                            label="Группа"
                                        >
                                            <MenuItem value="">
                                                <em>Выберите группу</em>
                                            </MenuItem>
                                            {groups.map((group) => (
                                                <MenuItem key={group.group_id} value={group.group_id}>
                                                    {group.group_name} ({group.age_range})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth required>
                                        <InputLabel>Родитель</InputLabel>
                                        <Select
                                            name="parent_id"
                                            value={formData.parent_id}
                                            onChange={handleChange}
                                        >
                                            {parents.map((parent) => (
                                                <MenuItem key={parent.user_id} value={parent.user_id}>
                                                    {`${parent.last_name} ${parent.first_name}`}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        name="allergies"
                                        label="Аллергии"
                                        value={formData.allergies}
                                        onChange={handleChange}
                                        fullWidth
                                        multiline
                                        rows={2}
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>Платные услуги</InputLabel>
                                        <Select
                                            name="services"
                                            value={formData.services}
                                            onChange={handleChange}
                                            multiple
                                        >
                                            {services.map((service) => (
                                                <MenuItem key={service.service_id} value={service.service_id}>
                                                    {service.service_name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={handleCloseDialog}>Отмена</Button>
                                <Button type="submit" variant="contained">
                                    {selectedChild ? 'Сохранить' : 'Добавить'}
                                </Button>
                            </DialogActions>
                        </form>
                    </Dialog>

                    {/* Диалог подтверждения удаления */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={handleCancelDelete}
                        PaperProps={{
                            sx: {
                                borderRadius: '16px',
                                padding: '16px',
                                maxWidth: '400px'
                            }
                        }}
                    >
                        <DialogTitle sx={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'error.main',
                            pb: 1
                        }}>
                            Подтверждение удаления
                        </DialogTitle>
                        <DialogContent>
                            <Typography variant="body1" sx={{ mb: 2 }}>
                                Вы действительно хотите удалить этого ребенка? Это действие нельзя будет отменить.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Все связанные данные, включая рекомендации, также будут удалены.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: 2, pt: 0 }}>
                            <Button
                                onClick={handleCancelDelete}
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    px: 3
                                }}
                            >
                                Отмена
                            </Button>
                            <Button
                                onClick={handleConfirmDelete}
                                variant="contained"
                                color="error"
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    px: 3,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        boxShadow: 'none',
                                        backgroundColor: 'error.dark'
                                    }
                                }}
                            >
                                Удалить
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <Snackbar
                        open={snackbar.open}
                        autoHideDuration={4000}
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
            )}
        </>
    );
};

export default ChildrenManagement; 