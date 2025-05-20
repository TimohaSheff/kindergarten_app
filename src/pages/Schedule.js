import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
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
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';
import { useSnackbar } from '../hooks/useSnackbar';
import { useGroups } from '../hooks/useGroups';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse } from 'date-fns';
import { ru } from 'date-fns/locale';

// Ленивая загрузка компонентов
const ScheduleForm = lazy(() => import('../components/schedule/ScheduleForm'));
const ScheduleTable = lazy(() => import('../components/schedule/ScheduleTable'));

const Schedule = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [schedule, setSchedule] = useState([]);
  const { showSnackbar } = useSnackbar();
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  const [children, setChildren] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    action: '',
    time_of_day: '',
    group_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const { PageTitle } = useOutletContext();

  useEffect(() => {
    const fetchChildren = async () => {
      if (user.role === 'parent') {
        try {
          const response = await api.children.getAll({ parent_id: user.id });
          console.log('Получены дети родителя:', response);
          
          if (Array.isArray(response.data)) {
            // Создаем Map для удаления дубликатов по id
            const uniqueChildrenMap = new Map();
            
            response.data.forEach(child => {
              const childId = child.id || child.child_id;
              if (!uniqueChildrenMap.has(childId)) {
                uniqueChildrenMap.set(childId, {
                  id: childId,
                  child_id: childId,
                  name: child.name,
                  group_name: child.group_name || ''
                });
              }
            });
            
            const formattedChildren = Array.from(uniqueChildrenMap.values());
            console.log('Отформатированные данные детей (уникальные):', formattedChildren);
            
            setChildren(formattedChildren);
            
            if (formattedChildren.length > 0) {
              const firstChild = formattedChildren[0];
              console.log('Устанавливаем первого ребенка:', firstChild);
              setSelectedChild(firstChild);
              setSelectedGroup(firstChild.group_name);
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке списка детей:', error);
          showSnackbar({
            message: 'Ошибка при загрузке списка детей',
            severity: 'error'
          });
        }
      }
    };

    fetchChildren();
  }, [user.role, user.id]);

  const fetchSchedule = async () => {
    if (!selectedGroup) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.schedule.getByGroup(selectedGroup);
      
      // Функция для конвертации времени в минуты
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      // Сортируем расписание по времени
      const sortedSchedule = response.sort((a, b) => {
        const timeA = timeToMinutes(a.time_of_day.split('-')[0].trim());
        const timeB = timeToMinutes(b.time_of_day.split('-')[0].trim());
        return timeA - timeB;
      });
      
      setSchedule(sortedSchedule);
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке расписания:', error);
      setSchedule([]);
      setError('Не удалось загрузить расписание');
      showSnackbar({
        message: 'Не удалось загрузить расписание',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [selectedGroup]);

  const handleOpenDialog = (item = null) => {
    if (item) {
      console.log('Editing schedule item:', item);
      setEditingSchedule(item);
      try {
        const [start, end] = item.time_of_day.split('-');
        const startDate = parse(start.trim(), 'HH:mm', new Date());
        const endDate = parse(end.trim(), 'HH:mm', new Date());
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid time format');
        }
        
        setStartTime(startDate);
        setEndTime(endDate);
        setFormData({
          action: item.action || '',
          time_of_day: item.time_of_day || '',
          group_name: selectedGroup
        });
      } catch (error) {
        console.error('Error parsing time:', error);
        showSnackbar({
          message: 'Ошибка при обработке времени',
          severity: 'error'
        });
      }
    } else {
      setEditingSchedule(null);
      setStartTime(null);
      setEndTime(null);
      setFormData({
        action: '',
        time_of_day: '',
        group_name: selectedGroup
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchedule(null);
    setFormData({
      action: '',
      time_of_day: '',
      group_name: selectedGroup
    });
  };

  const handleTimeChange = (newStartTime, newEndTime) => {
    try {
      if (newStartTime && newEndTime) {
        if (!(newStartTime instanceof Date && !isNaN(newStartTime)) || 
            !(newEndTime instanceof Date && !isNaN(newEndTime))) {
          console.error('Invalid date objects:', { newStartTime, newEndTime });
          return;
        }

        const formattedStart = format(newStartTime, 'HH:mm');
        const formattedEnd = format(newEndTime, 'HH:mm');
        
        setFormData(prev => ({
          ...prev,
          time_of_day: `${formattedStart}-${formattedEnd}`
        }));
      }
    } catch (error) {
      console.error('Error formatting time:', error);
    }
  };

  const handleSave = async (scheduleItem) => {
    try {
      if (!scheduleItem.action || !scheduleItem.time_of_day) {
        showSnackbar({
          message: 'Заполните все поля',
          severity: 'error'
        });
        return;
      }

      setLoading(true);
      
      const dataToSave = {
        action: scheduleItem.action,
        time_of_day: scheduleItem.time_of_day,
        group_name: selectedGroup
      };

      if (editingSchedule) {
        await api.schedule.update(editingSchedule.schedule_id, dataToSave);
        showSnackbar({
          message: 'Расписание успешно обновлено',
          severity: 'success'
        });
      } else {
        await api.schedule.create(dataToSave);
        showSnackbar({
          message: 'Расписание успешно создано',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
      await fetchSchedule();
    } catch (error) {
      console.error('Ошибка при сохранении расписания:', error);
      showSnackbar({
        message: error.message || 'Ошибка при сохранении расписания',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await api.schedule.delete(scheduleToDelete);
      
      const scheduleData = await api.schedule.getByGroup(selectedGroup);
      if (Array.isArray(scheduleData)) {
        setSchedule(scheduleData);
      }
      
      showSnackbar({ 
        message: 'Расписание удалено', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error deleting schedule:', err);
      showSnackbar({ 
        message: err.message || 'Ошибка при удалении расписания', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);
  };

  if (groupsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (groupsError || error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Alert severity="error">
          {groupsError || error}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 2 }}>
        <PageTitle>Расписание</PageTitle>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
          mb: 4 
        }}>
          {user.role === 'parent' ? (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Ребенок</InputLabel>
              <Select
                value={selectedChild?.id || ''}
                onChange={(e) => {
                  const child = children.find(c => c.id === e.target.value);
                  console.log('Выбран ребенок:', child);
                  setSelectedChild(child);
                  if (child) {
                    setSelectedGroup(child.group_name);
                  }
                }}
                label="Ребенок"
                size="small"
              >
                {children.map((child) => (
                  <MenuItem 
                    key={`child-${child.id}`} 
                    value={child.id}
                  >
                    {child.name} - {child.group_name || 'Группа не указана'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Группа</InputLabel>
              <Select
                value={selectedGroup}
                onChange={(e) => {
                  console.log('Selected group changed to:', e.target.value);
                  setSelectedGroup(e.target.value);
                }}
                label="Группа"
                size="small"
              >
                {Array.isArray(groups) && groups.map((group) => (
                  <MenuItem 
                    key={group.id} 
                    value={group.name}
                  >
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {user.role !== 'parent' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              disabled={!selectedGroup}
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
              Добавить расписание
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        ) : (
          <Box mt={3}>
            <Suspense fallback={<CircularProgress />}>
              <ScheduleTable
                schedule={schedule}
                onEdit={user.role !== 'parent' ? handleOpenDialog : undefined}
                onDelete={user.role !== 'parent' ? handleDelete : undefined}
              />
            </Suspense>
          </Box>
        )}

        {user.role !== 'parent' && (
          <Suspense fallback={<CircularProgress />}>
            <ScheduleForm
              open={openDialog}
              onClose={handleCloseDialog}
              formData={formData}
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onSave={handleSave}
            />
          </Suspense>
        )}

        {user.role !== 'parent' && (
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
                Вы действительно хотите удалить это расписание? Это действие нельзя будет отменить.
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
        )}
      </Box>
    </Container>
  );
};

export default Schedule;