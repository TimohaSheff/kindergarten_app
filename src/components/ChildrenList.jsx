import React, { memo, useState } from 'react';
import { Grid, Button, Box, Typography, Paper, Pagination } from '@mui/material';
import ChildCard from './ChildCard';
import { PersonOff as PersonOffIcon } from '@mui/icons-material';
import {
    Card,
    CardContent,
    CardActions,
    IconButton,
    Avatar,
    Chip,
    Divider
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Person as PersonIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { formatDate, getAge } from '../utils/date';

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
    marginRight: theme.spacing(2),
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

const ChildrenList = memo(({
    children,
    onEdit,
    onDelete,
    onAdd,
    canEdit,
    groups,
    services,
    getPhotoUrl,
    parents,
    currentGroup,
    isLoading,
    showTeacherInfo = false
}) => {
    const [page, setPage] = useState(1);
    const childrenPerPage = 8;

    console.log('ChildrenList props:', {
        childrenCount: children?.length,
        hasEdit: !!onEdit,
        hasDelete: !!onDelete,
        canEdit,
        hasGroups: !!groups?.length,
        hasServices: !!services?.length,
        hasGetPhotoUrl: !!getPhotoUrl,
        hasParents: !!parents?.length,
        currentGroup,
        isLoading
    });

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const getCurrentPageChildren = () => {
        const startIndex = (page - 1) * childrenPerPage;
        const endIndex = startIndex + childrenPerPage;
        const pageChildren = children.slice(startIndex, endIndex);
        
        // Отладочное логирование
        console.log('Дети на текущей странице:', pageChildren.map(child => ({
            id: child.id,
            child_id: child.child_id,
            name: child.name
        })));
        
        return pageChildren;
    };

    // Проверяем, что children является массивом и содержит элементы
    const hasChildren = Array.isArray(children) && children.length > 0;

    if (!Array.isArray(children)) {
        console.error('Ошибка: children не является массивом:', children);
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error">
                    Ошибка: Некорректный формат данных
                </Typography>
            </Box>
        );
    }

    if (!hasChildren) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <PersonOffIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                    Нет детей в списке
                </Typography>
                {currentGroup && (
                    <Typography variant="body2" color="text.secondary">
                        В группе "{currentGroup.name}" пока нет детей
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <>
            <Grid container spacing={3}>
                {getCurrentPageChildren().map((child, index) => {
                    // Генерируем уникальный ключ, используя комбинацию id и индекса
                    const uniqueKey = `${child.id || child.child_id || 'child'}-${index}`;
                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={uniqueKey}>
                            <StyledCard>
                                <CardContent sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', mb: 2 }}>
                                        <StyledAvatar src={child.photo_path ? getPhotoUrl(child.photo_path) : null}>
                                            {!child.photo_path && <PersonIcon />}
                                        </StyledAvatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6" component="h2" gutterBottom>
                                                {child.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Возраст: {getAge(child.date_of_birth)} лет
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Дата рождения: {formatDate(child.date_of_birth)}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {child.group_name && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" color="primary">
                                                Группа:
                                            </Typography>
                                            <Typography variant="body2">
                                                {child.group_name}
                                            </Typography>
                                        </Box>
                                    )}

                                    {child.parent && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" color="primary">
                                                Родитель:
                                            </Typography>
                                            <Typography variant="body2">
                                                {child.parent.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Тел: {child.parent.phone}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Email: {child.parent.email}
                                            </Typography>
                                        </Box>
                                    )}

                                    {showTeacherInfo && child.teachers && child.teachers.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" color="primary">
                                                {child.teachers.length > 1 ? 'Воспитатели:' : 'Воспитатель:'}
                                            </Typography>
                                            {child.teachers.map((teacher, index) => (
                                                <Box key={teacher.id || index} sx={{ mb: index < child.teachers.length - 1 ? 1 : 0 }}>
                                                    <Typography variant="body2">
                                                        {teacher.name}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Тел: {teacher.phone}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Email: {teacher.email}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}

                                    {child.allergies && child.allergies.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" color="error">
                                                Аллергии:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {child.allergies.map((allergy, index) => (
                                                    <StyledChip
                                                        key={index}
                                                        label={allergy}
                                                        className="error"
                                                        size="small"
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}

                                    {child.services && child.services.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="subtitle2" color="primary">
                                                Дополнительные услуги:
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {child.services.map((service) => (
                                                    <StyledChip
                                                        key={service.id}
                                                        label={service.name}
                                                        className="primary"
                                                        size="small"
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    )}
                                </CardContent>
                                
                                {canEdit && (
                                    <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                                        <IconButton onClick={() => onEdit(child)} color="primary" size="small">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton onClick={() => onDelete(child.id)} color="error" size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    </CardActions>
                                )}
                            </StyledCard>
                        </Grid>
                    );
                })}
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                    count={Math.ceil(children.length / childrenPerPage)}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                />
            </Box>
        </>
    );
});

ChildrenList.displayName = 'ChildrenList';

export default ChildrenList; 