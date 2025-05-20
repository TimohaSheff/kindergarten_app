import React, { useState, memo } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Avatar,
    Chip,
    IconButton,
    Box,
    Tooltip
} from '@mui/material';
import { 
    Edit as EditIcon, 
    Delete as DeleteIcon, 
    Person as PersonIcon,
    School as SchoolIcon,
    Event as EventIcon,
    LocalActivity as ActivityIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

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
    backgroundColor: theme.palette.primary.lighter,
    color: theme.palette.primary.dark,
    border: 'none',
    '&.error': {
        backgroundColor: theme.palette.error.lighter,
        color: theme.palette.error.dark,
    },
    '&.primary': {
        backgroundColor: theme.palette.primary.lighter,
        color: theme.palette.primary.dark,
    }
}));

const InfoRow = ({ icon: Icon, text }) => (
    <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 1,
        color: 'text.secondary'
    }}>
        <Icon sx={{ fontSize: '1.2rem' }} />
        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            {text}
        </Typography>
    </Box>
);

const ChildCard = memo(({ child, onEdit, onDelete, getPhotoUrl }) => {
    if (!child || !child.id) {
        console.error('Получены некорректные данные ребенка:', child);
        return null;
    }

    const photoUrl = child.photo_path && getPhotoUrl 
        ? getPhotoUrl(child.photo_path)
        : '/assets/images/placeholder-child.png';

    const handleImageError = (e) => {
        e.target.src = '/assets/images/placeholder-child.png';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Не указана';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Некорректная дата');
            }
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    };

    // Разделяем имя и фамилию ребенка
    const [firstName, lastName] = (child.name || '').split(' ');

    return (
        <StyledCard>
            <CardContent>
                <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" alignItems="flex-start" gap={2}>
                        <StyledAvatar
                            src={photoUrl}
                            onError={handleImageError}
                            alt={child.name}
                            sx={{ mb: 0 }}
                        >
                            {!photoUrl && (firstName?.[0] || <PersonIcon />)}
                        </StyledAvatar>
                        <Box>
                            <Typography variant="h6" component="div" sx={{ mb: 0.5 }}>
                                {firstName}
                            </Typography>
                            <Typography variant="subtitle1" color="text.primary" sx={{ mb: 0.5 }}>
                                {lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Дата рождения: {formatDate(child.date_of_birth)}
                            </Typography>
                            {child.group_name && (
                                <Typography variant="body2" color="text.secondary">
                                    Группа: {child.group_name}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {child.parent && (
                        <Box>
                            <Typography variant="subtitle2" color="text.primary" gutterBottom>
                                Информация о родителе
                            </Typography>
                            <Box pl={2} display="flex" flexDirection="column" gap={0.5}>
                                {child.parent.name && (
                                    <Typography variant="body2" color="text.secondary">
                                        ФИО: {child.parent.name}
                                    </Typography>
                                )}
                                {child.parent.phone && (
                                    <Typography variant="body2" color="text.secondary">
                                        Телефон: {child.parent.phone}
                                    </Typography>
                                )}
                                {child.parent.email && (
                                    <Typography variant="body2" color="text.secondary">
                                        Email: {child.parent.email}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}

                    {Array.isArray(child.allergies) && child.allergies.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" color="text.primary" gutterBottom>
                                Аллергии
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5} pl={2}>
                                {child.allergies.map((allergy, index) => (
                                    <Chip
                                        key={`${child.id}-allergy-${index}`}
                                        label={allergy}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    {Array.isArray(child.services) && child.services.length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" color="text.primary" gutterBottom>
                                Дополнительные услуги
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={0.5} pl={2}>
                                {child.services.map((service, index) => (
                                    <Chip
                                        key={`${child.id}-service-${service.id || index}`}
                                        label={typeof service === 'string' ? service : service.name}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            </CardContent>
            {(onEdit || onDelete) && (
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    {onEdit && (
                        <Tooltip title="Редактировать">
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof onEdit === 'function') {
                                        console.log('Редактирование ребенка:', child);
                                        onEdit(child);
                                    }
                                }}
                                size="small"
                                color="primary"
                            >
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {onDelete && (
                        <Tooltip title="Удалить">
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof onDelete === 'function' && child.id) {
                                        console.log('Удаление ребенка:', child.id);
                                        onDelete(child.id);
                                    }
                                }}
                                size="small"
                                color="error"
                            >
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </CardActions>
            )}
        </StyledCard>
    );
});

ChildCard.displayName = 'ChildCard';

export default ChildCard; 