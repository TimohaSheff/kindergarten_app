import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChildrenManagement from '../components/ChildrenManagement';
import { Box, Typography, Alert } from '@mui/material';

const ChildrenList = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Необходима авторизация для просмотра списка детей
        </Alert>
      </Box>
    );
  }

  // Проверяем, имеет ли пользователь доступ к просмотру детей
  const hasAccess = ['admin', 'teacher', 'psychologist', 'parent'].includes(user.role);
  
  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          У вас нет прав для просмотра списка детей
        </Alert>
      </Box>
    );
  }

  // Определяем права на редактирование
  const canEdit = ['admin', 'teacher'].includes(user.role);
  
  // Определяем режим просмотра
  let viewMode = 'limited';
  if (['admin', 'teacher', 'psychologist'].includes(user.role)) {
    viewMode = 'full';
  }

  return (
    <ChildrenManagement 
      canEdit={canEdit} 
      viewMode={viewMode}
      userRole={user.role}
    />
  );
};

export default ChildrenList; 