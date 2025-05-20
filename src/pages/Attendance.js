import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
  Button,
  Tooltip,
  Snackbar,
  Alert,
  InputLabel,
  CircularProgress,
  Container
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { attendanceApi, groupsApi, childrenApi } from '../api/api';
import { useGroups } from '../hooks/useGroups';

const Attendance = () => {
  const { user } = useAuth();
  const { PageTitle } = useOutletContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState([]);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const { groups: groupsContext, loading: groupsLoading } = useGroups();
  
  // Убедимся, что groups всегда массив
  const safeGroups = Array.isArray(groupsContext) ? groupsContext : [];

  // Загрузка детей при изменении группы
  useEffect(() => {
    const fetchChildren = async () => {
      if (!selectedGroup) return;

      try {
        setLoading(true);
        // Находим ID группы по её имени
        const selectedGroupData = safeGroups.find(g => g.name === selectedGroup);
        if (!selectedGroupData) {
          throw new Error('Группа не найдена');
        }

        console.log('Fetching children with params:', { group_id: selectedGroupData.id });
        const response = await childrenApi.getAll({ group_id: selectedGroupData.id });
        const childrenData = response.data;
        console.log('Полученные данные детей:', childrenData);
        
        // Фильтруем детей в зависимости от роли пользователя и выбранной группы
        let filteredChildren = childrenData;
        if (user.role === 'teacher') {
          // Для учителя показываем только детей из его группы
          filteredChildren = childrenData.filter(child => 
            String(child.group_id) === String(user.group_id)
          );
        } else if (user.role === 'admin') {
          // Для администратора показываем детей только выбранной группы
          filteredChildren = childrenData;
        }
        
        // Преобразуем данные детей в нужный формат
        const formattedChildren = filteredChildren.map(child => ({
          id: child.child_id || child.id,
          name: child.name || child.full_name || 'Без имени'
        }));
        
        console.log('Отформатированные данные детей:', formattedChildren);
        setChildren(formattedChildren);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching children:', err);
        setError('Ошибка при загрузке списка детей');
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [selectedGroup, user]);

  // Загрузка существующих отметок посещаемости при изменении месяца или группы
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!selectedGroup || !children.length) return;

      try {
        setLoading(true);
        // Находим ID группы по её имени
        const selectedGroupData = safeGroups.find(g => g.name === selectedGroup);
        if (!selectedGroupData) {
          throw new Error('Группа не найдена');
        }

        const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        const response = await attendanceApi.getGroupAttendance(
          selectedGroupData.id,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        console.log('Получены данные посещаемости:', response);

        // Проверяем наличие данных в ответе
        const attendanceData = response?.data || [];

        // Преобразуем полученные данные в нужный формат
        const attendanceMap = {};
        children.forEach(child => {
          attendanceMap[child.id] = {};
        });

        attendanceData.forEach(record => {
          try {
            const childId = String(record.child_id);
            const date = new Date(record.date);
            const day = date.getDate();
            const isPresent = Boolean(record.is_present);

            if (!attendanceMap[childId]) {
              attendanceMap[childId] = {};
            }

            attendanceMap[childId][day] = isPresent;
          } catch (err) {
            console.error('Ошибка обработки записи посещаемости:', record, err);
          }
        });

        console.log('Обработанные данные посещаемости:', attendanceMap);
        setAttendance(attendanceMap);
        setError(null);
      } catch (error) {
        console.error('Ошибка при получении данных посещаемости:', error);
        setError('Ошибка при получении данных посещаемости');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedGroup, selectedDate, children, safeGroups]);

  // Получаем дни месяца
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate();

  // Получаем текущую дату
  const currentDate = new Date();
  
  // Создаем массив всех дней месяца без фильтрации
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Проверяем, является ли дата в будущем
  const isFutureDate = (day) => {
    const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkDate > today;
  };

  // Получаем название дня недели
  const getDayName = (day) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return dayNames[date.getDay()];
  };

  // Обработчик изменения отметки посещаемости
  const handleAttendanceChange = async (childId, date, isPresent) => {
    try {
      setLoading(true);
      
      // Форматируем дату в YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split('T')[0];

      const attendanceData = {
        child_id: childId,
        date: formattedDate,
        is_present: !isPresent // Инвертируем текущее состояние
      };
      
      console.log('Отправка данных посещаемости:', attendanceData);
      
      await attendanceApi.markAttendance(attendanceData);

      // Обновляем состояние только после успешного ответа от сервера
      setAttendance(prev => {
        const newState = { ...prev };
        const [, , dayStr] = formattedDate.split('-');
        const day = parseInt(dayStr, 10);
        
        if (!newState[childId]) {
          newState[childId] = {};
        }
        
        newState[childId][day] = !isPresent;
        return newState;
      });

      setSnackbar({
        open: true,
        message: 'Посещаемость успешно обновлена',
        severity: 'success'
      });
    } catch (error) {
      console.error('Ошибка при обновлении посещаемости:', error);
      setError(error.message || 'Ошибка при обновлении посещаемости');
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при обновлении посещаемости',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Проверяем, является ли день выходным
  const isWeekend = (day) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Получаем название месяца
  const getMonthName = (monthIndex) => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель',
      'Май', 'Июнь', 'Июль', 'Август',
      'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[monthIndex];
  };

  // Проверяем, может ли пользователь редактировать посещаемость
  const canEditAttendance = ['admin', 'teacher'].includes(user?.role);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 2 }}>
        <PageTitle>Посещаемость</PageTitle>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
          mb: 4 
        }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Месяц</InputLabel>
            <Select
              value={selectedDate.getMonth()}
              onChange={(e) => setSelectedDate(new Date(selectedDate.getFullYear(), e.target.value))}
              label="Месяц"
              size="small"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i} value={i}>{getMonthName(i)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              label="Группа"
              size="small"
            >
              {safeGroups.map((group) => (
                <MenuItem key={group.id} value={group.name}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {!selectedGroup ? null : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : children.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          В выбранной группе нет детей
        </Alert>
      ) : (
        <TableContainer component={Paper} sx={{ 
          maxHeight: 'calc(100vh - 300px)', 
          overflow: 'auto',
          '& .MuiTable-root': {
            borderCollapse: 'separate',
            borderSpacing: 0,
          }
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 'bold', 
                    width: '200px',
                    minWidth: '200px',
                    maxWidth: '200px',
                    bgcolor: 'background.paper',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    borderRight: '1px solid rgba(224, 224, 224, 1)'
                  }}
                >
                  ФИО ребенка
                </TableCell>
                {days.map(day => (
                  <TableCell
                    key={day}
                    align="center"
                    sx={{
                      width: '50px',
                      minWidth: '50px',
                      maxWidth: '50px',
                      bgcolor: isWeekend(day) ? 'grey.100' : 'background.paper',
                      fontWeight: 'bold',
                      p: 1
                    }}
                  >
                    <Box>
                      <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {getDayName(day)}
                      </Typography>
                      <Typography variant="body2">
                        {day}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {children.map(child => (
                <TableRow key={child.id}>
                  <TableCell 
                    component="th" 
                    scope="row" 
                    sx={{ 
                      bgcolor: 'background.paper',
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      borderRight: '1px solid rgba(224, 224, 224, 1)'
                    }}
                  >
                    {child.name}
                  </TableCell>
                  {days.map(day => {
                    const isWeekendDay = isWeekend(day);
                    const isPresent = !!attendance[child.id]?.[day];
                    const isFuture = isFutureDate(day);
                    return (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{
                          width: '50px',
                          minWidth: '50px',
                          maxWidth: '50px',
                          bgcolor: isWeekendDay ? 'grey.100' : isFuture ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                          cursor: canEditAttendance && !isWeekendDay ? 'pointer' : 'not-allowed',
                          p: 0,
                          '& .MuiCheckbox-root': {
                            p: 0.5
                          }
                        }}
                        onClick={() => canEditAttendance && !isWeekendDay && handleAttendanceChange(
                          child.id, 
                          `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                          isPresent
                        )}
                      >
                        <Checkbox
                          checked={isPresent}
                          color="primary"
                          size="small"
                          disabled={!canEditAttendance || isWeekendDay}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Attendance; 