import React, { useState, useEffect } from 'react';
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
import { groupsApi, scheduleApi } from '../api/api';
import { useSnackbar } from 'notistack';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse } from 'date-fns';
import { ru } from 'date-fns/locale';

const Schedule = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [schedule, setSchedule] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    action: '',
    time_of_day: '',
    group_name: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загрузка групп
        const groupsData = await groupsApi.getGroups();
        console.log('Received groups data:', groupsData);

        // Проверяем и нормализуем данные групп
        const normalizedGroups = (groupsData || []).map((group, index) => ({
          ...group,
          id: group.id || `temp-${index}`,
          value: group.group_name || group.name, // Используем group_name из БД
          name: group.group_name || group.name || `Группа ${index + 1}` // Используем group_name из БД
        })).filter(group => group.name);
        
        console.log('Normalized groups:', normalizedGroups);
        setGroups(normalizedGroups);
        
        if (normalizedGroups.length > 0) {
          setSelectedGroup(normalizedGroups[0].name);
          console.log('Selected initial group:', normalizedGroups[0].name);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchSchedule = async () => {
    if (!selectedGroup) {
      setSchedule([]);
      setError('Пожалуйста, выберите группу');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const scheduleData = await scheduleApi.getScheduleByGroup(selectedGroup);
      if (!Array.isArray(scheduleData)) {
        throw new Error('Неверный формат данных расписания');
      }
      setSchedule(scheduleData);
      setError(null);
    } catch (error) {
      console.error('Ошибка при загрузке расписания:', error);
      setSchedule([]);
      setError(error.message || 'Не удалось загрузить расписание');
      enqueueSnackbar('Не удалось загрузить расписание', { variant: 'error' });
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
      const [start, end] = item.time_of_day.split('-');
      setStartTime(parse(start, 'HH:mm', new Date()));
      setEndTime(parse(end, 'HH:mm', new Date()));
      setFormData({
        action: item.action || '',
        time_of_day: item.time_of_day || '',
        group_name: selectedGroup
      });
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
  };

  const handleTimeChange = (newStartTime, newEndTime) => {
    if (newStartTime && newEndTime) {
      const formattedStart = format(newStartTime, 'HH:mm');
      const formattedEnd = format(newEndTime, 'HH:mm');
      setFormData({
        ...formData,
        time_of_day: `${formattedStart}-${formattedEnd}`
      });
    }
  };

  const handleSave = async (scheduleItem) => {
    try {
      console.log('Сохранение элемента расписания:', scheduleItem);
      
      if (editingSchedule) {
        console.log('Обновление существующего элемента:', editingSchedule.schedule_id);
        await scheduleApi.updateScheduleItem(editingSchedule.schedule_id, {
          ...scheduleItem,
          group_name: selectedGroup
        });
        setSnackbar({
          open: true,
          message: 'Расписание успешно обновлено',
          severity: 'success'
        });
      } else {
        console.log('Создание нового элемента расписания');
        await scheduleApi.createScheduleItem({
          ...scheduleItem,
          group_name: selectedGroup
        });
        setSnackbar({
          open: true,
          message: 'Расписание успешно создано',
          severity: 'success'
        });
      }
      
      setOpenDialog(false);
      setEditingSchedule(null);
      
      // Обновляем список расписания
      console.log('Обновление списка расписания после сохранения');
      await fetchSchedule();
    } catch (error) {
      console.error('Ошибка при сохранении расписания:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при сохранении расписания',
        severity: 'error'
      });
    }
  };

  const handleDelete = (id) => {
    setScheduleToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await scheduleApi.deleteScheduleItem(scheduleToDelete);
      
      const scheduleData = await scheduleApi.getScheduleByGroup(selectedGroup);
      if (Array.isArray(scheduleData)) {
        setSchedule(scheduleData);
      }
      
      setSnackbar({ 
        open: true, 
        message: 'Расписание удалено', 
        severity: 'success' 
      });
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setSnackbar({ 
        open: true, 
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Расписание
          </Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={selectedGroup || ''}
              onChange={(e) => {
                console.log('Selected group changed to:', e.target.value);
                setSelectedGroup(e.target.value);
              }}
              label="Группа"
            >
              {groups.map((group, index) => (
                <MenuItem 
                  key={group.id || `group-${index}`} 
                  value={group.name || ''}
                >
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Добавить расписание
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Время</TableCell>
                    <TableCell>Активность</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.map((item) => (
                    <TableRow key={item.schedule_id}>
                      <TableCell>{item.time_of_day}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpenDialog(item)} size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(item.schedule_id)} size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {schedule.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Расписание не найдено
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)'
            }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {editingSchedule ? 'Редактировать расписание' : 'Добавить расписание'}
              </Typography>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TimePicker
                    label="Начало"
                    value={startTime}
                    onChange={(newValue) => {
                      setStartTime(newValue);
                      if (endTime) {
                        handleTimeChange(newValue, endTime);
                      }
                    }}
                    sx={{ flex: 1 }}
                    ampm={false}
                    format="HH:mm"
                  />
                  <TimePicker
                    label="Конец"
                    value={endTime}
                    onChange={(newValue) => {
                      setEndTime(newValue);
                      if (startTime) {
                        handleTimeChange(startTime, newValue);
                      }
                    }}
                    sx={{ flex: 1 }}
                    ampm={false}
                    format="HH:mm"
                  />
                </Box>
              </LocalizationProvider>
              <TextField
                required
                fullWidth
                label="Активность"
                value={formData.action || ''}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                multiline
                rows={2}
                error={!formData.action}
                helperText={!formData.action ? 'Обязательное поле' : ''}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseDialog}
              sx={{ borderRadius: '8px' }}
            >
              Отмена
            </Button>
            <Button 
              onClick={() => handleSave(formData)} 
              variant="contained"
              disabled={!formData.time_of_day || !formData.action}
              sx={{ borderRadius: '8px' }}
            >
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

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

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: '8px' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Schedule;