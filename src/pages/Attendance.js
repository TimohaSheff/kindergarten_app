import React, { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { attendanceApi, groupsApi, childrenApi } from '../api/api';

const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState([]);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Загрузка групп
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const groupsData = await groupsApi.getGroups();
        console.log('Полученные группы:', groupsData);
        
        // Преобразуем данные групп в нужный формат
        const formattedGroups = groupsData.map(group => ({
          id: group.group_id || group.id,
          name: group.group_name || group.name
        }));
        
        console.log('Отформатированные группы:', formattedGroups);
        setGroups(formattedGroups);
        
        // Для учителя автоматически выбираем его группу
        if (user.role === 'teacher' && user.group_id) {
          const teacherGroup = formattedGroups.find(g => g.id === user.group_id);
          if (teacherGroup) {
            setSelectedGroup(teacherGroup.id);
          }
        }
        // Для остальных ролей выбираем первую группу
        else if (formattedGroups.length > 0 && user.role === 'admin') {
          setSelectedGroup(formattedGroups[0].id);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Ошибка при загрузке групп');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  // Загрузка детей при изменении группы
  useEffect(() => {
    const fetchChildren = async () => {
      if (!selectedGroup) return;

      try {
        setLoading(true);
        const childrenData = await childrenApi.getAllChildren(selectedGroup);
        console.log('Полученные данные детей:', childrenData);
        
        // Фильтруем детей в зависимости от роли пользователя и выбранной группы
        let filteredChildren = childrenData;
        if (user.role === 'teacher') {
          // Для учителя показываем только детей из его группы
          filteredChildren = childrenData.filter(child => 
            child.group_id === user.group_id || child.groupId === user.group_id
          );
        } else if (user.role === 'admin') {
          // Для администратора показываем детей только выбранной группы
          filteredChildren = childrenData.filter(child => 
            child.group_id === selectedGroup || child.groupId === selectedGroup
          );
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
        const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        const attendanceData = await attendanceApi.getGroupAttendance(
          selectedGroup,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Проверяем формат данных
        if (!Array.isArray(attendanceData)) {
          throw new Error('Некорректный формат данных от сервера');
        }

        // Преобразуем полученные данные в нужный формат с проверкой типов
        const attendanceMap = {};
        children.forEach(child => {
          attendanceMap[child.id] = {};
        });

        attendanceData.forEach(record => {
          if (
            typeof record.child_id === 'number' &&
            record.date &&
            typeof record.is_present === 'boolean'
          ) {
            const date = new Date(record.date);
            const day = date.getDate();
            
            if (!attendanceMap[record.child_id]) {
              attendanceMap[record.child_id] = {};
            }
            
            attendanceMap[record.child_id][day] = record.is_present;
          } else {
            console.error('Некорректный формат записи:', record);
          }
        });

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
  }, [selectedGroup, selectedDate, children]);

  // Получаем дни месяца
  const daysInMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0
  ).getDate();

  // Получаем текущую дату
  const currentDate = new Date();
  
  // Фильтруем дни, оставляя только те, что не превышают текущую дату
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .filter(day => {
      const checkDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      return checkDate <= currentDate;
    });

  // Обработчик изменения отметки посещаемости
  const handleAttendanceChange = async (childId, date, isPresent) => {
    try {
      setLoading(true);
      
      // Форматируем дату в YYYY-MM-DD
      const formattedDate = new Date(date).toISOString().split('T')[0];

      const attendanceData = {
        child_id: Number(childId),
        date: formattedDate,
        is_present: !isPresent // Инвертируем текущее состояние
      };
      
      console.log('Отправка данных посещаемости:', attendanceData);
      
      const result = await attendanceApi.markAttendance(attendanceData);
      
      if (!result || typeof result.is_present !== 'boolean') {
        throw new Error('Некорректный ответ от сервера');
      }

      // Обновляем состояние только после успешного ответа от сервера
      setAttendance(prev => {
        const newState = { ...prev };
        const [, , dayStr] = formattedDate.split('-');
        const day = parseInt(dayStr, 10);
        
        if (!newState[childId]) {
          newState[childId] = {};
        }
        
        newState[childId][day] = result.is_present;
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
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Посещаемость
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        {user.role === 'admin' && (
          <FormControl sx={{ minWidth: 200 }} error={!selectedGroup && groups.length > 0}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={selectedGroup}
              onChange={(e) => {
                console.log('Выбрана группа:', e.target.value);
                setSelectedGroup(e.target.value);
              }}
              label="Группа"
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Месяц</InputLabel>
          <Select
            value={selectedDate.getMonth()}
            onChange={(e) => setSelectedDate(new Date(selectedDate.getFullYear(), e.target.value))}
            label="Месяц"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i} value={i}>{getMonthName(i)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
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
        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 200, bgcolor: 'background.paper' }}>
                  ФИО ребенка
                </TableCell>
                {days.map(day => (
                  <TableCell
                    key={day}
                    align="center"
                    sx={{
                      minWidth: 50,
                      bgcolor: isWeekend(day) ? 'grey.100' : 'background.paper',
                      fontWeight: 'bold'
                    }}
                  >
                    {day}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {children.map(child => (
                <TableRow key={child.id}>
                  <TableCell component="th" scope="row" sx={{ bgcolor: 'background.paper' }}>
                    {child.name}
                  </TableCell>
                  {days.map(day => {
                    const isWeekendDay = isWeekend(day);
                    return (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{
                          bgcolor: isWeekendDay ? 'grey.100' : 'inherit',
                          cursor: canEditAttendance && !isWeekendDay ? 'pointer' : 'not-allowed'
                        }}
                        onClick={() => canEditAttendance && !isWeekendDay && handleAttendanceChange(
                          child.id, 
                          `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
                          !!attendance[child.id]?.[day]
                        )}
                      >
                        <Checkbox
                          checked={!!attendance[child.id]?.[day]}
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
    </Box>
  );
};

export default Attendance; 