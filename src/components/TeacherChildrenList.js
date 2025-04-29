import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Check as CheckIcon, 
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isValid, isAfter } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api, childrenApi } from '../api/api';

const TeacherChildrenList = ({ teacherId, showAttendance = false }) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openDateDialog, setOpenDateDialog] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { user } = useAuth();

  const handleAttendance = async (childId, isPresent) => {
    try {
      setError(null);
      await api.updateRegularAttendance(childId, selectedDate, isPresent);
      
      setSnackbar({
        open: true,
        message: 'Посещаемость успешно обновлена',
        severity: 'success'
      });
      
      // Обновляем список детей
      await fetchChildren();
    } catch (error) {
      setError('Ошибка при обновлении посещаемости');
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении посещаемости',
        severity: 'error'
      });
      console.error('Error updating attendance:', error);
    }
  };

  const fetchChildren = async () => {
    if (!teacherId) {
      setError('Не указан идентификатор учителя');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const allChildren = await childrenApi.getAllChildren();
      // Фильтруем детей по учителю
      const teacherChildren = allChildren.filter(child => child.teacher_id === teacherId);
      setChildren(teacherChildren);
    } catch (error) {
      setError('Ошибка при загрузке списка детей');
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [teacherId]);

  const handleDateChange = (date) => {
    try {
      if (!date) {
        throw new Error('Пожалуйста, выберите дату');
      }
      
      if (!isValid(date)) {
        throw new Error('Некорректная дата');
      }
      
      const now = new Date();
      if (isAfter(date, now)) {
        throw new Error('Дата не может быть в будущем');
      }
      
      setSelectedDate(date);
    } catch (error) {
      setError(error.message);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  const handleViewHistory = async (child) => {
    setSelectedChild(child);
    setLoadingHistory(true);
    setError(null);
    
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // История за последний месяц
      const history = await api.getRegularAttendance(child.id, startDate, new Date());
      setAttendanceHistory(history);
      setOpenDateDialog(true);
    } catch (error) {
      setError('Ошибка при загрузке истории посещаемости');
      setSnackbar({
        open: true,
        message: 'Ошибка при загрузке истории посещаемости',
        severity: 'error'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDateDialog(false);
    setSelectedChild(null);
    setAttendanceHistory([]);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {showAttendance && (
        <Box sx={{ mb: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <DatePicker
              label="Дата посещения"
              value={selectedDate}
              onChange={handleDateChange}
              slotProps={{ 
                textField: { 
                  fullWidth: true,
                  error: !!error && error.includes('дата')
                } 
              }}
            />
          </LocalizationProvider>
        </Box>
      )}
      
      {children.length === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Нет детей в списке
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ФИО ребенка</TableCell>
                <TableCell>Группа</TableCell>
                <TableCell>Платные услуги</TableCell>
                {showAttendance && (
                  <>
                    <TableCell>История</TableCell>
                    <TableCell>Посещаемость</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {children.map((child) => (
                <TableRow key={child.id}>
                  <TableCell>{child.fullName || 'Не указано'}</TableCell>
                  <TableCell>{child.group || 'Не указано'}</TableCell>
                  <TableCell>
                    {child.paidServices && child.paidServices.length > 0 ? (
                      <List dense>
                        {child.paidServices.map((service) => (
                          <ListItem key={service.id}>
                            <ListItemText 
                              primary={service.name || 'Не указано'}
                              secondary={`Статус: ${service.status || 'Не указан'}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Нет платных услуг
                      </Typography>
                    )}
                  </TableCell>
                  {showAttendance && (
                    <>
                      <TableCell>
                        <Tooltip title="Просмотреть историю посещений">
                          <IconButton
                            onClick={() => handleViewHistory(child)}
                            color="primary"
                          >
                            <CalendarIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckIcon />}
                            onClick={() => handleAttendance(child.id, true)}
                          >
                            Присутствует
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            startIcon={<CloseIcon />}
                            onClick={() => handleAttendance(child.id, false)}
                          >
                            Отсутствует
                          </Button>
                        </Stack>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={openDateDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          История посещений: {selectedChild?.fullName}
        </DialogTitle>
        <DialogContent>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : attendanceHistory.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Нет данных о посещениях за последний месяц
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceHistory.map((record) => (
                    <TableRow key={record.date}>
                      <TableCell>
                        {format(new Date(record.date), 'dd.MM.yyyy')}
                      </TableCell>
                      <TableCell>
                        <Typography
                          color={record.status === 'present' ? 'success.main' : 'error.main'}
                        >
                          {record.status === 'present' ? 'Присутствовал' : 'Отсутствовал'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TeacherChildrenList; 