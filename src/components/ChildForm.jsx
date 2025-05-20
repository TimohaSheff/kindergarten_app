import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Box,
    IconButton,
    Avatar,
    CircularProgress,
    Grid,
    Alert,
    FormHelperText,
    Chip
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon, Person as PersonIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from '../utils/axios';
import { useSnackbar } from '../hooks/useSnackbar';

const StyledAvatar = styled(Avatar)(({ theme }) => ({
    width: 80,
    height: 80,
    margin: '0 auto',
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.primary.main,
    border: '3px solid #fff',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    '& .MuiSvgIcon-root': {
        fontSize: '2.5rem',
    },
}));

const VisuallyHiddenInput = styled('input')`
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    bottom: 0;
    left: 0;
    white-space: nowrap;
    width: 1px;
`;

const ChildForm = ({
    open,
    onClose,
    onSubmit,
    formData,
    setFormData,
    groups: initialGroups = [],
    parents: initialParents = [],
    services: initialServices = [],
    photoPreview,
    handlePhotoChange,
    handlePaste,
    selectedChild,
    isEdit
}) => {
    const { showSnackbar } = useSnackbar();
    const isEditMode = isEdit !== undefined ? isEdit : !!selectedChild;
    const [submitting, setSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [parents, setParents] = useState(initialParents);
    const [groups, setGroups] = useState(initialGroups);
    const [services, setServices] = useState(initialServices);

    useEffect(() => {
        const loadData = async () => {
            if (!open) return;
            
            try {
                setIsLoading(true);
                setError(null);
                
                console.log('Начало загрузки данных для формы редактирования:', {
                    selectedChild,
                    formData
                });
                
                const [parentsResponse, groupsResponse, servicesResponse] = await Promise.all([
                    axios.get('/users', { params: { role: 'parent' } }),
                    axios.get('/groups'),
                    axios.get('/services')
                ]);

                console.log('Получены сырые ответы:', {
                    parents: parentsResponse?.data,
                    groups: groupsResponse?.data,
                    services: servicesResponse?.data
                });

                // Обрабатываем данные
                const processedData = {
                    parents: Array.isArray(parentsResponse?.data) 
                        ? parentsResponse.data
                            .filter(user => user.role === 'parent')
                            .map(parent => ({
                                id: String(parent.id || parent.user_id),
                                name: parent.name || `${parent.first_name} ${parent.last_name}`.trim(),
                                role: parent.role
                            }))
                        : [],
                    groups: Array.isArray(groupsResponse?.data)
                        ? groupsResponse.data.map(group => ({
                            id: String(group.id || group.group_id),
                            name: group.name || group.group_name,
                            age_range: group.age_range
                        }))
                        : [],
                    services: Array.isArray(servicesResponse?.data)
                        ? servicesResponse.data.map(service => ({
                            id: String(service.id || service.service_id),
                            name: service.name || service.service_name,
                            description: service.description
                        }))
                        : []
                };

                console.log('Обработанные данные:', processedData);

                // Проверяем наличие данных
                if (!processedData.parents.length || !processedData.groups.length) {
                    console.error('Проблема с данными:', {
                        parentsLength: processedData.parents.length,
                        groupsLength: processedData.groups.length,
                        servicesLength: processedData.services.length,
                        rawParents: parentsResponse,
                        rawGroups: groupsResponse,
                        rawServices: servicesResponse
                    });
                    throw new Error('Не удалось загрузить необходимые данные');
                }

                // Обновляем состояния
                setParents(processedData.parents);
                setGroups(processedData.groups);
                setServices(processedData.services);

                // Если это режим редактирования, обновляем данные формы
                if (selectedChild && isEditMode) {
                    const updatedFormData = {
                        name: selectedChild.name || '',
                        date_of_birth: selectedChild.date_of_birth ? selectedChild.date_of_birth.split('T')[0] : '',
                        parent_id: String(selectedChild.parent_id || ''),
                        group_id: String(selectedChild.group_id || ''),
                        allergies: Array.isArray(selectedChild.allergies) 
                            ? selectedChild.allergies.join(', ')
                            : selectedChild.allergies || '',
                        services: Array.isArray(selectedChild.services)
                            ? selectedChild.services.map(s => String(s.id || s))
                            : [],
                        photo: null,
                        photo_mime_type: null,
                        photo_path: selectedChild.photo_path
                    };

                    console.log('Обновление данных формы:', {
                        selectedChild,
                        updatedFormData
                    });

                    setFormData(updatedFormData);
                }

                setIsLoading(false);
                console.log('Данные успешно загружены');

            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setError(error.message || 'Ошибка при загрузке данных');
                showSnackbar({
                    message: error.message || 'Ошибка при загрузке данных',
                    severity: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [open, selectedChild, isEditMode]);

    useEffect(() => {
        console.log('ChildForm данные:', {
            formData,
            parents,
            groups,
            services,
            selectedChild
        });
    }, [formData, parents, groups, services, selectedChild]);

    // Проверяем, есть ли значение в списке опций
    const isValueInOptions = (value, options) => {
        if (!value || !options?.length) return false;
        const stringValue = String(value);
        return options.some(option => String(option.id) === stringValue);
    };

    // Получаем безопасное значение для селекта
    const getSafeSelectValue = (value, options) => {
        if (!value || !options?.length) return '';
        const stringValue = String(value);
        return isValueInOptions(stringValue, options) ? stringValue : '';
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log('handleChange:', { name, value, currentFormData: formData });
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleServicesChange = (event) => {
        const selectedValues = event.target.value;
        console.log('handleServicesChange:', { selectedValues, currentServices: services });
        setFormData(prev => ({
            ...prev,
            services: selectedValues
                .map(value => Number(value))
                .filter(value => !isNaN(value) && value > 0)
        }));
    };

    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }
        
        if (!formData.name) {
            console.error('Имя ребенка обязательно');
            return;
        }
        
        try {
            setSubmitting(true);
            await onSubmit();
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Безопасные значения для селектов
    const safeParentId = getSafeSelectValue(formData.parent_id, parents);
    const safeGroupId = getSafeSelectValue(formData.group_id, groups);
    const safeServices = Array.isArray(formData.services) 
        ? formData.services.filter(serviceId => 
            services.some(service => String(service.id) === String(serviceId))
        )
        : [];

    console.log('Значения селектов:', {
        formDataParentId: formData.parent_id,
        safeParentId,
        parents: parents.map(p => ({ id: p.id, name: p.name })),
        formDataGroupId: formData.group_id,
        safeGroupId,
        groups: groups.map(g => ({ id: g.id, name: g.name })),
        formDataServices: formData.services,
        safeServices,
        services: services.map(s => ({ id: s.id, name: s.name }))
    });

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '12px',
                    padding: '8px'
                }
            }}
        >
            <DialogTitle 
                sx={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 600,
                    pb: 1 
                }}
            >
                {isEditMode ? 'Редактировать информацию о ребенке' : 'Добавить нового ребенка'}
            </DialogTitle>
            <DialogContent>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        mt: 2
                    }}
                >
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Grid container spacing={2}>
                        <Grid item xs={12} display="flex" justifyContent="center" alignItems="center">
                            <Box sx={{ position: 'relative' }}>
                                {photoPreview ? (
                                    <StyledAvatar src={photoPreview} />
                                ) : selectedChild?.photo_path ? (
                                    <StyledAvatar src={selectedChild.photo_path} />
                                ) : (
                                    <StyledAvatar>
                                        <PersonIcon />
                                    </StyledAvatar>
                                )}
                                <IconButton
                                    color="primary"
                                    aria-label="загрузить фото"
                                    component="label"
                                    sx={{
                                        position: 'absolute',
                                        bottom: -8,
                                        right: -8,
                                        backgroundColor: 'white',
                                        boxShadow: 1,
                                        '&:hover': {
                                            backgroundColor: 'white',
                                        }
                                    }}
                                >
                                    <PhotoCameraIcon />
                                    <input
                                        type="file"
                                        hidden
                                        onChange={handlePhotoChange}
                                        accept="image/*"
                                    />
                                </IconButton>
                            </Box>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                label="Имя ребенка"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                variant="outlined"
                                size="small"
                                error={!formData.name}
                                helperText={!formData.name ? 'Обязательное поле' : ''}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                label="Дата рождения"
                                name="date_of_birth"
                                type="date"
                                value={formData.date_of_birth || ''}
                                onChange={handleChange}
                                variant="outlined"
                                size="small"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                error={!formData.date_of_birth}
                                helperText={!formData.date_of_birth ? 'Обязательное поле' : ''}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl 
                                fullWidth 
                                size="small" 
                                error={!formData.parent_id}
                            >
                                <InputLabel>Родитель *</InputLabel>
                                <Select
                                    required
                                    name="parent_id"
                                    value={parents.length > 0 ? safeParentId : ''}
                                    onChange={handleChange}
                                    label="Родитель *"
                                    disabled={isLoading || !parents.length}
                                >
                                    {isLoading ? (
                                        <MenuItem value="">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={20} />
                                                <span>Загрузка...</span>
                                            </Box>
                                        </MenuItem>
                                    ) : !parents.length ? (
                                        <MenuItem value="">
                                            Нет доступных родителей
                                        </MenuItem>
                                    ) : (
                                        parents.map((parent) => (
                                            <MenuItem key={parent.id} value={String(parent.id)}>
                                                {parent.name}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                                {!formData.parent_id && (
                                    <FormHelperText>Обязательное поле</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl 
                                fullWidth 
                                size="small"
                                error={!formData.group_id}
                            >
                                <InputLabel>Группа *</InputLabel>
                                <Select
                                    required
                                    name="group_id"
                                    value={groups.length > 0 ? safeGroupId : ''}
                                    onChange={handleChange}
                                    label="Группа *"
                                    disabled={isLoading || !groups.length}
                                >
                                    {isLoading ? (
                                        <MenuItem value="">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={20} />
                                                <span>Загрузка...</span>
                                            </Box>
                                        </MenuItem>
                                    ) : !groups.length ? (
                                        <MenuItem value="">
                                            Нет доступных групп
                                        </MenuItem>
                                    ) : (
                                        groups.map((group) => (
                                            <MenuItem key={group.id} value={String(group.id)}>
                                                {group.name}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                                {!formData.group_id && (
                                    <FormHelperText>Обязательное поле</FormHelperText>
                                )}
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Аллергии"
                                name="allergies"
                                value={formData.allergies || ''}
                                onChange={handleChange}
                                variant="outlined"
                                size="small"
                                multiline
                                rows={2}
                                helperText="Укажите аллергии через запятую"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Дополнительные услуги</InputLabel>
                                <Select
                                    multiple
                                    name="services"
                                    value={services.length > 0 ? safeServices : []}
                                    onChange={handleServicesChange}
                                    label="Дополнительные услуги"
                                    disabled={isLoading || !services.length}
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const service = services.find(s => String(s.id) === String(value));
                                                return service ? (
                                                    <Chip 
                                                        key={value} 
                                                        label={service.name} 
                                                        size="small"
                                                        sx={{ 
                                                            backgroundColor: 'primary.light',
                                                            color: 'white'
                                                        }}
                                                    />
                                                ) : null;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {isLoading ? (
                                        <MenuItem value="">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={20} />
                                                <span>Загрузка...</span>
                                            </Box>
                                        </MenuItem>
                                    ) : !services.length ? (
                                        <MenuItem value="">
                                            Нет доступных услуг
                                        </MenuItem>
                                    ) : (
                                        services.map((service) => (
                                            <MenuItem key={service.id} value={String(service.id)}>
                                                {service.name}
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                                <FormHelperText>Выберите дополнительные услуги</FormHelperText>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
                <Button 
                    onClick={onClose}
                    size="small"
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 3
                    }}
                >
                    Отмена
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained" 
                    color="primary"
                    size="small"
                    disabled={submitting}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        px: 3
                    }}
                >
                    {submitting ? 
                        <CircularProgress size={20} color="inherit" /> : 
                        isEditMode ? 'Сохранить' : 'Добавить'
                    }
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChildForm; 