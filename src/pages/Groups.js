import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  styled,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  ChildCare as ChildCareIcon
} from '@mui/icons-material';
import { useGroups } from '../hooks/useGroups';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import { useSnackbar } from '../hooks/useSnackbar';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.2s ease-in-out',
  borderRadius: '16px',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(3),
  '&:hover': {
    transform: 'translateY(-4px)',
    borderColor: theme.palette.primary.main,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  }
}));

const TeacherChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  color: theme.palette.primary.main,
  fontSize: '0.875rem',
  fontWeight: 500,
  height: '32px',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.2s ease-in-out',
  '& .MuiChip-label': {
    padding: '0 12px',
    lineHeight: '20px'
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderColor: alpha(theme.palette.primary.main, 0.3)
  }
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: '4px',
  textTransform: 'none',
  padding: '8px 20px',
  fontWeight: 600,
  fontSize: '1rem',
  boxShadow: 'none',
  '&.MuiButton-containedPrimary': {
    backgroundColor: theme.palette.primary.dark,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.primary.darker,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }
  },
  '&.MuiButton-containedSuccess': {
    backgroundColor: theme.palette.success.dark,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.success.darker,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }
  },
  '&.MuiButton-containedError': {
    backgroundColor: theme.palette.error.dark,
    color: theme.palette.common.white,
    '&:hover': {
      backgroundColor: theme.palette.error.darker,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }
  }
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 600,
  marginBottom: theme.spacing(4),
  color: theme.palette.text.primary,
  position: 'relative',
  paddingBottom: theme.spacing(2),
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '48px',
    height: '4px',
    background: theme.palette.primary.main,
    borderRadius: '2px'
  }
}));

const Groups = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { groups, teachers, isLoading, error, createGroup, updateGroup, deleteGroup } = useGroups();
  const { showSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age_range: '',
    selectedTeachers: []
  });

  const handleOpen = (group = null) => {
    if (group) {
      console.log('Открытие формы редактирования группы:', {
        groupId: group.id,
        groupData: group
      });
      
      setSelectedGroup(group);
      const teacherIds = group.teachers?.map(t => Number(t.id)) || [];
      
      console.log('ID учителей группы:', {
        original: group.teachers?.map(t => t.id),
        converted: teacherIds
      });
      
      setFormData({
        name: group.name || '',
        age_range: group.age_range || '',
        selectedTeachers: teacherIds
      });
    } else {
      setSelectedGroup(null);
      setFormData({
        name: '',
        age_range: '',
        selectedTeachers: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedGroup(null);
    setFormData({ name: '', age_range: '', selectedTeachers: [] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Отправка данных:', {
        formData,
        selectedGroup,
        selectedGroupId: selectedGroup?.id
      });

      // Преобразуем ID учителей в числа
      const preparedData = {
        ...formData,
        selectedTeachers: formData.selectedTeachers.map(id => {
          const numericId = Number(id);
          if (isNaN(numericId)) {
            throw new Error(`Некорректный ID учителя: ${id}`);
          }
          return numericId;
        })
      };

      console.log('Подготовленные данные:', preparedData);

      const result = selectedGroup 
        ? await updateGroup(selectedGroup.id, preparedData)
        : await createGroup(preparedData);
      
      if (result.success) {
        handleClose();
        showSnackbar({
          message: selectedGroup 
            ? 'Группа успешно обновлена' 
            : 'Группа успешно создана',
          severity: 'success'
        });
      } else {
        console.error('Ошибка при сохранении:', result.error);
        showSnackbar({
          message: result.error || 'Произошла ошибка при сохранении',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Ошибка при сохранении группы:', error);
      showSnackbar({
        message: error.message || 'Произошла ошибка при сохранении',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (e, groupId) => {
    e.stopPropagation();
    
    console.log('Попытка удаления группы:', {
      groupId,
      type: typeof groupId
    });
    
    if (window.confirm('Вы уверены, что хотите удалить эту группу?')) {
      try {
        const numericId = Number(groupId);
        if (isNaN(numericId)) {
          throw new Error(`Некорректный ID группы: ${groupId}`);
        }
        
        console.log('Удаление группы:', {
          originalId: groupId,
          numericId,
          type: typeof numericId
        });
        
        const result = await deleteGroup(numericId);
        if (result.success) {
          showSnackbar({
            message: 'Группа успешно удалена',
            severity: 'success'
          });
        }
      } catch (error) {
        console.error('Ошибка при удалении группы:', error);
        showSnackbar({
          message: error.message || 'Произошла ошибка при удалении группы',
          severity: 'error'
        });
      }
    }
  };

  const handleGroupClick = (group) => {
    console.log('Переход к детям группы:', {
      groupId: group.id,
      type: typeof group.id
    });
    navigate(`/children?groupId=${group.id}`);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4
        }}>
          <PageTitle>Группы</PageTitle>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
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
            Добавить группу
          </Button>
        </Box>

        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <StyledCard onClick={() => handleGroupClick(group)}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {group.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
                    <SchoolIcon sx={{ fontSize: '1.2rem', mr: 1 }} />
                    <Typography variant="body2">
                      Возраст: {group.age_range}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Воспитатели:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {group.teachers && group.teachers.length > 0 ? (
                          group.teachers.map((teacher) => (
                            <TeacherChip
                              key={teacher.id}
                              label={`${teacher.name}`}
                              size="medium"
                              sx={{ width: 'fit-content' }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Не назначены
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  mt: 'auto',
                  '& .MuiButton-root': {
                    flex: 1,
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }
                }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(group);
                    }}
                    sx={{ 
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.dark,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04)
                      }
                    }}
                  >
                    Изменить
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={(e) => handleDelete(e, group.id)}
                    sx={{ 
                      borderColor: theme.palette.error.main,
                      color: theme.palette.error.main,
                      '&:hover': {
                        borderColor: theme.palette.error.dark,
                        backgroundColor: alpha(theme.palette.error.main, 0.04)
                      }
                    }}
                  >
                    Удалить
                  </Button>
                </Box>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {selectedGroup ? 'Редактировать группу' : 'Создать группу'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Название группы"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextField
                margin="dense"
                label="Возрастной диапазон"
                fullWidth
                required
                value={formData.age_range}
                onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                placeholder="Например: 3-4 года"
              />
              <FormControl fullWidth margin="dense">
                <InputLabel>Воспитатели</InputLabel>
                <Select
                  multiple
                  value={formData.selectedTeachers || []}
                  onChange={(e) => {
                    const selectedValues = e.target.value.map(id => {
                      const numericId = Number(id);
                      if (isNaN(numericId)) {
                        console.error(`Некорректный ID учителя: ${id}`);
                        return null;
                      }
                      return numericId;
                    }).filter(Boolean);
                    
                    console.log('Выбраны учителя:', {
                      original: e.target.value,
                      converted: selectedValues
                    });
                    
                    setFormData(prev => ({ 
                      ...prev, 
                      selectedTeachers: selectedValues 
                    }));
                  }}
                  input={<OutlinedInput label="Воспитатели" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected || []).map((value) => {
                        const teacher = teachers.find(t => Number(t.id) === Number(value));
                        return (
                          <Chip 
                            key={value} 
                            label={teacher ? teacher.name : 'Неизвестный воспитатель'} 
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={Number(teacher.id)}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Отмена</Button>
              <Button type="submit" variant="contained" color="primary">
                {selectedGroup ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Groups;
