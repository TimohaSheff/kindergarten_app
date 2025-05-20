import React, { useState, useEffect, useRef } from 'react';
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
    ListItemAvatar,
    CircularProgress
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon, PhotoCamera as PhotoCameraIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import ChildForm from './ChildForm';
import ChildrenList from './ChildrenList';
import { getPhotoUrl, processPhoto, handlePastedImage } from '../utils/photoUtils';
import { childrenApi } from '../api/api';
import { API_CONFIG } from '../config';
import { useSnackbar } from '../hooks/useSnackbar';
import { useDialog } from '../hooks/useDialog';
import { formatDate, getAge } from '../utils/date';
import { logger } from '../utils/logger';

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

const BASE_URL = process.env.REACT_APP_API_URL?.split('/api')[0] || 'http://localhost:3001';

const ChildrenManagement = ({ canEdit = false, viewMode = 'full', userRole }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showSnackbar } = useSnackbar();
    const { isOpen: openDialog, data: selectedChild, openDialog: handleOpenDialog, closeDialog: handleCloseDialog } = useDialog();
    const isMounted = useRef(true);
    const initialFetchDone = useRef(false);
    const fetchInProgress = useRef(false);
    const groupId = searchParams.get('groupId');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const [children, setChildren] = useState([]);
    const [filteredChildren, setFilteredChildren] = useState([]);
    const [currentGroup, setCurrentGroup] = useState(null);
    const [groups, setGroups] = useState([]);
    const [parents, setParents] = useState([]);
    const [services, setServices] = useState([]);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [childToDelete, setChildToDelete] = useState(null);
    const [childrenCount, setChildrenCount] = useState(0);
    const [filteredChildrenCount, setFilteredChildrenCount] = useState(0);
    const [selectedChildId, setSelectedChildId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        date_of_birth: '',
        parent_id: '',
        group_id: groupId || '',
        allergies: '',
        services: [],
        photo: null,
        photo_mime_type: null
    });

    const { PageTitle } = useOutletContext();

    useEffect(() => {
        console.log('Основной useEffect запущен:', {
            groupId,
            userRole,
            isAuthenticated,
            currentMountState: isMounted.current
        });

        if (!isAuthenticated) {
            console.log('Пользователь не аутентифицирован');
            return;
        }

        let isEffectActive = true;
        isMounted.current = true;

        const fetchData = async () => {
            if (fetchInProgress.current) {
                console.log('Загрузка уже выполняется, пропускаем');
                return;
            }

            try {
                fetchInProgress.current = true;
                setIsLoading(true);
                setError(null);
                
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Отсутствует токен авторизации');
                }

                console.log('Начало загрузки данных...');
                const [childrenData, groupData] = await Promise.all([
                    fetchChildren(),
                    groupId ? fetchCurrentGroup() : Promise.resolve(null)
                ]);
                
                if (!isEffectActive) {
                    console.log('Эффект больше не активен, прерываем обновление');
                    return;
                }

                console.log('Данные получены:', {
                    hasChildrenData: !!childrenData,
                    childrenCount: childrenData?.length,
                    hasGroupData: !!groupData,
                    isEffectActive
                });

                if (childrenData && Array.isArray(childrenData)) {
                    console.log('Данные успешно загружены:', {
                        childrenCount: childrenData.length,
                        groupData,
                        firstChild: childrenData[0]
                    });
                }
                
                initialFetchDone.current = true;
                
            } catch (error) {
                console.error('Ошибка в fetchData:', error);
                if (isMounted.current && error.message !== 'Request canceled' && error.message !== 'Request debounced') {
                    const errorMessage = error.message || 'Ошибка при загрузке данных';
                    setError(errorMessage);
                    showSnackbar({
                        message: errorMessage,
                        severity: 'error'
                    });

                    if (error.response?.status === 401) {
                        navigate('/login');
                    }
                }
            } finally {
                if (isEffectActive) {
                    setIsLoading(false);
                    fetchInProgress.current = false;
                    console.log('Загрузка завершена, состояния:', {
                        isLoading: false,
                        fetchInProgress: false,
                        childrenCount: children?.length,
                        filteredChildrenCount: filteredChildren?.length
                    });
                }
            }
        };

        fetchData();

        return () => {
            console.log('Очистка эффекта');
            isEffectActive = false;
            isMounted.current = false;
            fetchInProgress.current = false;
        };
    }, [groupId, isAuthenticated]);

    useEffect(() => {
        if (userRole === 'parent' && children.length > 0) {
            // Для родителя всегда показываем всех его детей
            setFilteredChildren(children);
            
            // Если есть дети, получаем информацию о группе первого ребенка
            const firstChild = children[0];
            if (firstChild.group_id) {
                fetchCurrentGroup(firstChild.group_id);
            }
        }
    }, [children, userRole]);

    const getPhotoUrlFunc = (path) => {
        if (!path) return null;
        
        // Убираем лишние 'uploads/photos' из пути
        const cleanPath = path.replace(/^uploads\/photos\//, '');
        
        // Формируем полный URL
        return `${process.env.REACT_APP_API_URL}/uploads/photos/${cleanPath}`;
    };

    const fetchChildren = async () => {
        try {
            console.log('Начало загрузки детей:', {
                groupId,
                userRole: user.role,
                userId: user.id || user.user_id,
                user
            });

            let response;
            if (user.role === 'parent') {
                // Для родителя получаем только его детей
                response = await childrenApi.getAll({ parent_id: user.id || user.user_id });
            } else {
                // Для остальных ролей получаем детей с учетом группы
                response = await childrenApi.getAll({ group_id: groupId });
            }

            console.log('Ответ от сервера:', response);

            if (!response || !response.data) {
                throw new Error('Нет данных в ответе сервера');
            }

            // Группируем детей по их ID и объединяем данные воспитателей
            const childrenMap = new Map();
            
            Array.isArray(response.data) && response.data.forEach(child => {
                const childId = child.id || child.child_id;
                
                if (childrenMap.has(childId)) {
                    // Если ребенок уже есть в Map, добавляем информацию о втором воспитателе
                    const existingChild = childrenMap.get(childId);
                    if (child.teacher && (!existingChild.teachers || !existingChild.teachers.some(t => t.id === child.teacher.id))) {
                        existingChild.teachers = existingChild.teachers || [];
                        existingChild.teachers.push(child.teacher);
                    }
                } else {
                    // Если ребенка еще нет, создаем новую запись
                    const newChild = {
                        ...child,
                        teachers: child.teacher ? [child.teacher] : []
                    };
                    delete newChild.teacher; // Удаляем старое поле teacher
                    childrenMap.set(childId, newChild);
                }
            });

            const childrenData = Array.from(childrenMap.values());
            console.log('Данные детей после обработки:', childrenData);

            setChildren(childrenData);
            setFilteredChildren(childrenData);
            setChildrenCount(childrenData.length);
            setFilteredChildrenCount(childrenData.length);
            setError(null);

            return childrenData;
        } catch (err) {
            console.error('Ошибка при загрузке детей:', err);
            setError('Ошибка при получении списка детей');
            setChildren([]);
            setFilteredChildren([]);
            setChildrenCount(0);
            setFilteredChildrenCount(0);
            throw err;
        }
    };

    const fetchCurrentGroup = async (groupIdToFetch = groupId) => {
        if (!groupIdToFetch || !isMounted.current) return null;
        
        try {
            console.log(`Запрос данных о группе ${groupIdToFetch}...`);
            
            const response = await axios.get('/groups');
            console.log('Получен список групп:', response.data);
            
            const groupData = response.data.find(group => 
                group.id === parseInt(groupIdToFetch) || 
                group.group_id === parseInt(groupIdToFetch)
            );
            
            if (!groupData) {
                throw new Error(`Группа с ID ${groupIdToFetch} не найдена`);
            }
            
            console.log(`Получен ответ для группы ${groupIdToFetch}:`, groupData);
            
            const normalizedGroupData = {
                id: groupData.group_id || groupData.id,
                group_id: groupData.group_id || groupData.id,
                name: groupData.group_name || groupData.name,
                group_name: groupData.group_name || groupData.name,
                age_range: groupData.age_range,
                teacher_id: groupData.teacher_id,
                children_count: groupData.children_count
            };
            
            console.log('Нормализованные данные группы:', normalizedGroupData);
            
            if (isMounted.current) {
                setCurrentGroup(normalizedGroupData);
            }
            
            return normalizedGroupData;
        } catch (error) {
            console.error(`Ошибка при загрузке информации о группе ${groupIdToFetch}:`, error);
            
            if (error.response?.status === 404) {
                showSnackbar({
                    message: `Группа с ID ${groupIdToFetch} не найдена`,
                    severity: 'warning'
                });
            } else {
                showSnackbar({
                    message: error.message || 'Ошибка при загрузке информации о группе',
                    severity: 'error'
                });
            }
            throw error;
        }
    };

    const fetchParents = async () => {
        if (user.role === 'parent') return;
        
        try {
            const response = await axios.getParents();
            setParents(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error('Ошибка при загрузке родителей:', error);
            showSnackbar({
                message: error.message || 'Ошибка при загрузке списка родителей',
                severity: 'error'
            });
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const { base64Data, previewUrl, mimeType } = await processPhoto(file);
                setFormData(prev => ({
                    ...prev,
                    photo: base64Data,
                    photo_mime_type: mimeType
                }));
                setPhotoPreview(previewUrl);
                
                showSnackbar({
                    message: 'Фото успешно загружено',
                    severity: 'success'
                });
            } catch (error) {
                showSnackbar({
                    message: error.message,
                    severity: 'error'
                });
            }
        }
    };

    const handlePaste = async (e) => {
        try {
            const result = await handlePastedImage(e);
            if (result) {
                const { base64Data, previewUrl, mimeType } = result;
                setFormData(prev => ({
                    ...prev,
                    photo: base64Data,
                    photo_mime_type: mimeType
                }));
                setPhotoPreview(previewUrl);
            }
        } catch (error) {
            showSnackbar({
                message: error.message,
                severity: 'error'
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;
        
        if (name === 'services') {
            processedValue = Array.isArray(value) 
                ? value.map(v => Number(v)).filter(v => !isNaN(v) && v !== 0)
                : [];
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));
    };

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Преобразуем сервисы в массив чисел
            const services = Array.isArray(formData.services) 
                ? formData.services.map(Number).filter(id => !isNaN(id) && id > 0)
                : [];

            // Преобразуем аллергии в формат PostgreSQL array
            const allergiesArray = formData.allergies 
                ? `{${formData.allergies.split(',').map(a => a.trim()).filter(Boolean).map(a => `"${a}"`).join(',')}}`
                : '{}';

            const [firstName, ...lastNameParts] = formData.name.split(' ');
            const lastName = lastNameParts.join(' ');

            const childData = {
                name: formData.name, // Оставляем полное имя
                first_name: firstName || '',
                last_name: lastName || '',
                date_of_birth: formData.date_of_birth,
                parent_id: Number(formData.parent_id),
                group_id: Number(formData.group_id),
                allergies: allergiesArray,
                services: services // Отправляем как массив чисел
            };

            console.log('Отправляемые данные:', {
                originalFormData: formData,
                processedData: childData,
                selectedChild: selectedChild
            });

            if (selectedChild) {
                await childrenApi.update(selectedChild.id, childData);
                showSnackbar({ message: 'Данные ребенка успешно обновлены', severity: 'success' });
            } else {
                await childrenApi.create(childData);
                showSnackbar({ message: 'Ребенок успешно добавлен', severity: 'success' });
            }

            handleCloseDialog();
            await fetchChildren();
        } catch (error) {
            console.error('Ошибка при сохранении данных:', error);
            setError(error.message || 'Произошла ошибка при сохранении данных');
            showSnackbar({
                message: error.message || 'Произошла ошибка при сохранении данных',
                severity: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (childId) => {
        setChildToDelete(childId);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        try {
            setIsLoading(true);
            console.log('Удаление ребенка:', childToDelete);
            
            const result = await childrenApi.delete(childToDelete);
            console.log('Результат удаления:', result);
            
            // Обновляем оба списка: общий и отфильтрованный
            setChildren(prevChildren => 
                prevChildren.filter(child => String(child.id) !== String(childToDelete))
            );
            setFilteredChildren(prevChildren => 
                prevChildren.filter(child => String(child.id) !== String(childToDelete))
            );
            
            showSnackbar({
                message: result.message || 'Ребенок успешно удален',
                severity: 'success'
            });
            
            setDeleteDialogOpen(false);
            setChildToDelete(null);
        } catch (error) {
            console.error('Ошибка при удалении ребенка:', error);
            showSnackbar({
                message: error.message || 'Ошибка при удалении ребенка',
                severity: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (child) => {
        try {
            console.log('Открываем форму редактирования для ребенка:', child);

            // Загружаем необходимые данные, если их еще нет
            const loadData = async () => {
                try {
                    console.log('Начало загрузки данных для формы редактирования');
                    
                    const [parentsResponse, groupsResponse, servicesResponse] = await Promise.all([
                        axios.get('/users', { 
                            params: { role: 'parent' } 
                        }),
                        axios.get('/groups'),
                        axios.get('/services')
                    ]);

                    console.log('Получены сырые ответы:', {
                        parents: parentsResponse?.data,
                        groups: groupsResponse?.data,
                        services: servicesResponse?.data
                    });

                    // Фильтруем родителей из общего списка пользователей
                    const parentsData = Array.isArray(parentsResponse?.data) 
                        ? parentsResponse.data
                            .filter(user => user.role === 'parent')
                            .map(parent => ({
                                id: String(parent.id || parent.user_id),
                                name: parent.name || `${parent.first_name} ${parent.last_name}`.trim(),
                                role: parent.role
                            }))
                        : [];

                    // Обрабатываем группы
                    const groupsData = Array.isArray(groupsResponse?.data) 
                        ? groupsResponse.data.map(group => ({
                            id: String(group.id || group.group_id),
                            name: group.name || group.group_name,
                            age_range: group.age_range
                        }))
                        : [];

                    // Обрабатываем услуги
                    const servicesData = Array.isArray(servicesResponse?.data)
                        ? servicesResponse.data.map(service => ({
                            id: String(service.id || service.service_id),
                            name: service.name || service.service_name,
                            description: service.description
                        }))
                        : [];

                    console.log('Обработанные данные:', {
                        parents: parentsData,
                        groups: groupsData,
                        services: servicesData
                    });

                    // Обновляем состояния только если есть данные
                    setParents(parentsData);
                    setGroups(groupsData);
                    setServices(servicesData);

                } catch (error) {
                    console.error('Ошибка при загрузке данных:', error);
                    showSnackbar({
                        message: 'Ошибка при загрузке списков данных',
                        severity: 'warning'
                    });
                }
            };

            // Всегда загружаем свежие данные при открытии формы
            await loadData();

            // Форматируем дату из ISO в YYYY-MM-DD
            const formattedDate = child.date_of_birth ? 
                child.date_of_birth.split('T')[0] : '';

            // Форматируем аллергии
            const allergies = Array.isArray(child.allergies) ? 
                child.allergies.join(', ') : 
                (typeof child.allergies === 'string' ? child.allergies : '');

            // Форматируем услуги
            const childServices = Array.isArray(child.services) ?
                child.services.map(s => String(s.id || s)).filter(Boolean) :
                [];

            const formDataToSet = {
                name: child.name || '',
                date_of_birth: formattedDate,
                parent_id: String(child.parent_id || ''),
                group_id: String(child.group_id || groupId || ''),
                allergies: allergies,
                services: childServices,
                photo: null,
                photo_mime_type: null,
                photo_path: child.photo_path || null
            };

            console.log('Подготовленные данные для формы:', formDataToSet);
            setFormData(formDataToSet);
            handleOpenDialog(child);
            
        } catch (error) {
            console.error('Ошибка при открытии формы редактирования:', error);
            showSnackbar({
                message: 'Ошибка при открытии формы редактирования',
                severity: 'error'
            });
        }
    };

    if (loading || isLoading) {
        return (
            <Box 
                display="flex" 
                flexDirection="column" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="80vh" 
                gap={3}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    zIndex: 1000
                }}
            >
                <CircularProgress size={60} thickness={4} />
                <Typography variant="h6" color="text.secondary">
                    Загрузка данных...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {groupId 
                        ? `Загружаем список детей для группы ${groupId}...` 
                        : 'Загружаем список всех детей...'}
                </Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh" gap={3} p={3}>
                <Alert severity="error" sx={{ maxWidth: 600, width: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Ошибка при загрузке данных
                    </Typography>
                    <Typography variant="body2">{error}</Typography>
                </Alert>
                <Button 
                    variant="contained" 
                    onClick={() => {
                        setIsLoading(true);
                        setError(null);
                        Promise.all([
                            fetchCurrentGroup(),
                            fetchChildren()
                        ]).finally(() => {
                            if (isMounted.current) {
                                setIsLoading(false);
                            }
                        });
                    }}
                    startIcon={<RefreshIcon />}
                >
                    Повторить загрузку
                </Button>
            </Box>
        );
    }

    console.log('Рендеринг списка детей:', {
        childrenCount: children?.length,
        filteredChildrenCount: filteredChildren?.length,
        isLoading,
        error,
        currentGroup
    });

    return (
        <Box>
            <Box sx={{ pl: 3, pt: 3 }}>
                <PageTitle>Мои Дети</PageTitle>
            </Box>
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
                            {userRole === 'parent' ? 'Мои дети' : (currentGroup ? `Группа: ${currentGroup.name || 'Неизвестная группа'}` : '')}
                        </Typography>
                        {userRole !== 'parent' && (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {
                                    setFormData({
                                        name: '',
                                        date_of_birth: '',
                                        parent_id: '',
                                        group_id: groupId || '',
                                        allergies: '',
                                        services: [],
                                        photo: null,
                                        photo_mime_type: null
                                    });
                                    handleOpenDialog(null);
                                }}
                                startIcon={<AddIcon />}
                            >
                                Добавить ребенка
                            </Button>
                        )}
                    </Box>
                    <ChildrenList
                        children={filteredChildren}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        canEdit={canEdit}
                        currentGroup={currentGroup}
                        isLoading={isLoading}
                        getPhotoUrl={getPhotoUrlFunc}
                        showTeacherInfo={userRole === 'parent'}
                    />
                    <ChildForm
                        open={openDialog}
                        onClose={handleCloseDialog}
                        onSubmit={handleSubmit}
                        formData={formData}
                        setFormData={setFormData}
                        groups={groups}
                        parents={parents}
                        services={services}
                        photoPreview={photoPreview}
                        handlePhotoChange={handlePhotoUpload}
                        handlePaste={handlePaste}
                        selectedChild={selectedChild}
                        isEdit={!!selectedChild}
                    />
                    
                    {/* Диалог подтверждения удаления */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                    >
                        <DialogTitle>Подтверждение удаления</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Вы действительно хотите удалить этого ребенка? Это действие нельзя будет отменить.
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button 
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={isLoading}
                            >
                                Отмена
                            </Button>
                            <Button 
                                onClick={handleConfirmDelete}
                                color="error"
                                disabled={isLoading}
                                variant="contained"
                            >
                                {isLoading ? 'Удаление...' : 'Удалить'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            )}
        </Box>
    );
};

export default ChildrenManagement;