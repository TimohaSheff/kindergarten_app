import React from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    LinearProgress,
    useTheme,
    alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
    background: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(10px)',
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: theme.shadows[3],
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[6]
    }
}));

const StyledProgress = styled(LinearProgress)(({ theme, customcolor }) => ({
    height: 10,
    borderRadius: 5,
    backgroundColor: alpha(customcolor, 0.1),
    '& .MuiLinearProgress-bar': {
        backgroundColor: customcolor,
        borderRadius: 5
    }
}));

const developmentParams = [
    { id: 'active_speech', name: 'Активная речь', color: '#4F46E5' },
    { id: 'games', name: 'Игровая деятельность', color: '#10B981' },
    { id: 'art_activity', name: 'Художественная деятельность', color: '#F59E0B' },
    { id: 'constructive_activity', name: 'Конструктивная деятельность', color: '#EF4444' },
    { id: 'sensory_development', name: 'Сенсорное развитие', color: '#6366F1' },
    { id: 'movement_skills', name: 'Физическая активность', color: '#8B5CF6' },
    { id: 'height_cm', name: 'Рост', color: '#EC4899', type: 'number', max: 200, unit: 'см', showInTable: true },
    { id: 'weight_kg', name: 'Вес', color: '#14B8A6', type: 'number', max: 100, unit: 'кг', showInTable: true }
];

const GroupProgress = ({ data, showAllGroups = false }) => {
    const theme = useTheme();

    if (!data) {
        return (
            <StyledCard>
                <CardContent>
                    <Typography variant="body1" color="text.secondary">
                        Данные о прогрессе недоступны
                    </Typography>
                </CardContent>
            </StyledCard>
        );
    }

    const developmentParamsOnly = developmentParams.filter(param => !param.showInTable);

    return (
        <StyledCard>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {showAllGroups ? 'Общий прогресс всех групп' : 'Прогресс группы'}
                </Typography>
                
                {/* Показатели развития */}
                <Grid container spacing={3}>
                    {developmentParamsOnly.map((param) => {
                        const value = data[param.id] || 0;
                        // Нормализуем значение от 1-10 до 0-100% для прогресс-бара
                        const normalizedValue = Math.min(Math.max(value * 10, 0), 100);

                        return (
                            <Grid item xs={12} key={param.id}>
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        mb: 1 
                                    }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {param.name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ 
                                            fontWeight: 600,
                                            color: param.color
                                        }}>
                                            {value.toFixed(1)} из 10
                                        </Typography>
                                    </Box>
                                    <StyledProgress
                                        variant="determinate"
                                        value={normalizedValue}
                                        customcolor={param.color}
                                    />
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            </CardContent>
        </StyledCard>
    );
};

export default GroupProgress; 