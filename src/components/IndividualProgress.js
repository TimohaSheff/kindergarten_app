import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  useTheme,
  alpha,
  Grid,
  IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import EditIcon from '@mui/icons-material/Edit';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: theme.shape.borderRadius * 2,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledProgress = styled(LinearProgress)(({ theme, customcolor }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: alpha(customcolor || theme.palette.primary.main, 0.1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    background: `linear-gradient(135deg, ${customcolor || theme.palette.primary.main} 0%, ${alpha(customcolor || theme.palette.primary.main, 0.8)} 100%)`
  }
}));

const developmentParams = [
  { id: 'active_speech', name: 'Активная речь', color: '#4F46E5', type: 'score', max: 10 },
  { id: 'games', name: 'Игровая деятельность', color: '#10B981', type: 'score', max: 10 },
  { id: 'art_activity', name: 'Художественная деятельность', color: '#F59E0B', type: 'score', max: 10 },
  { id: 'constructive_activity', name: 'Конструктивная деятельность', color: '#EF4444', type: 'score', max: 10 },
  { id: 'sensory_development', name: 'Сенсорное развитие', color: '#6366F1', type: 'score', max: 10 },
  { id: 'movement_skills', name: 'Двигательные навыки', color: '#8B5CF6', type: 'score', max: 10 },
  { id: 'height_cm', name: 'Рост', color: '#EC4899', type: 'number', max: 200, unit: 'см', showInTable: true },
  { id: 'weight_kg', name: 'Вес', color: '#14B8A6', type: 'number', max: 100, unit: 'кг', showInTable: true }
];

const IndividualProgress = ({ child, onEdit }) => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'psychologist';
  const theme = useTheme();

  if (!child) {
    return (
      <StyledCard>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Информация о ребенке недоступна
          </Typography>
        </CardContent>
      </StyledCard>
    );
  }

  // Функция для безопасного преобразования значения в число
  const safeParseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // Функция для форматирования значения с учетом типа параметра
  const formatValue = (value, param) => {
    if (value === null || value === undefined) return '0.0';
    const numValue = safeParseNumber(value);
    
    if (param.type === 'number') {
      return numValue.toFixed(1);
    } else if (param.type === 'score') {
      return Math.min(Math.max(numValue, 0), param.max).toFixed(1);
    }
    return numValue.toFixed(1);
  };

  // Функция для нормализации значения для прогресс-бара
  const normalizeValue = (value, param) => {
    const numValue = safeParseNumber(value);
    if (param.type === 'number') {
      return (numValue / param.max) * 100;
    } else if (param.type === 'score') {
      return Math.min(Math.max((numValue / param.max) * 100, 0), 100);
    }
    return Math.min(Math.max(numValue * 10, 0), 100);
  };

  const developmentParamsOnly = developmentParams.filter(param => !param.showInTable);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {child.first_name} {child.last_name}
          </Typography>
          {canEdit && (
            <IconButton onClick={() => onEdit(child)}>
              <EditIcon />
            </IconButton>
          )}
        </Box>

        {/* Показатели развития */}
        <Box>
          {developmentParamsOnly.map(param => {
            const rawValue = child.progress?.[param.id];
            const value = safeParseNumber(rawValue);
            const normalizedValue = normalizeValue(value, param);

            return (
              <Box key={param.id} sx={{ mb: 2 }}>
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
                    {formatValue(value, param)}
                    {param.type === 'number' ? ` ${param.unit}` : ` из ${param.max}`}
                  </Typography>
                </Box>
                <StyledProgress
                  variant="determinate"
                  value={normalizedValue}
                  customcolor={param.color}
                />
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default IndividualProgress;