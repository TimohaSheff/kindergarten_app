import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Fade
} from '@mui/material';
import {
  Person as PersonIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  minHeight: '140px',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  cursor: 'pointer',
  display: 'flex',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 48,
  height: 48,
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1)
}));

const ChildSelector = ({ children, onChildSelect, selectedChild }) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ 
        fontWeight: 600,
        mb: 3,
        color: 'text.primary'
      }}>
        Дети в группе ({children.length})
      </Typography>

      {children.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 2, 
          background: 'rgba(255, 255, 255, 0.7)',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <Typography variant="body1" color="text.secondary">
            Нет детей для отображения в выбранной группе
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={1}>
          {children.map((child) => (
            <Grid item xs={12} sm={6} md={4} key={child.child_id}>
              <Fade in timeout={500}>
                <StyledCard 
                  onClick={() => onChildSelect(child)}
                  sx={selectedChild?.child_id === child.child_id ? {
                    border: '2px solid',
                    borderColor: 'primary.main'
                  } : {}}
                >
                  <CardContent sx={{ 
                    textAlign: 'center', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    padding: '8px !important'
                  }}>
                    <StyledAvatar>
                      {child.name.charAt(0)}
                    </StyledAvatar>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        lineHeight: 1.2,
                        textAlign: 'center',
                        width: '100%',
                        px: 0.5
                      }}
                    >
                      {child.name}
                    </Typography>
                  </CardContent>
                </StyledCard>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ChildSelector; 