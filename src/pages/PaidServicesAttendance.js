import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { servicesApi } from '../api/api';
import { childrenApi } from '../api/api';

const PaidServicesAttendance = ({ canEdit = false, showOnlyOwnGroup = false, showOnlyOwnChild = false }) => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedService, setSelectedService] = useState('');
  const [attendance, setAttendance] = useState({});
  const [services, setServices] = useState([]);
  const [children, setChildren] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Загрузка услуг
        const servicesData = await servicesApi.getServices();
        setServices(servicesData);
        if (servicesData.length > 0) {
          setSelectedService(servicesData[0].id);
        }

        // Загрузка детей
        let childrenData = await childrenApi.getAllChildren();
        
        // Фильтрация детей в зависимости от роли пользователя
        if (showOnlyOwnChild && user?.role === 'parent') {
          childrenData = childrenData.filter(child => child.parentId === user.id);
        } else if (showOnlyOwnGroup && user?.role === 'teacher') {
          childrenData = childrenData.filter(child => child.group === user.group);
        }
        
        setChildren(childrenData);

        // Загрузка данных посещаемости за выбранный месяц
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        
        const attendanceData = await servicesApi.getServiceAttendance(
          selectedService,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Преобразование данных в нужный формат
        const formattedAttendance = {};
        childrenData.forEach(child => {
          formattedAttendance[child.id] = {};
          servicesData.forEach(service => {
            if (child.services.includes(service.id)) {
              formattedAttendance[child.id][service.id] = {};
            }
          });
        });

        // Заполнение данными с сервера
        if (Array.isArray(attendanceData)) {
          attendanceData.forEach(record => {
            if (
              record &&
              typeof record.child_id === 'number' &&
              typeof record.service_id === 'number' &&
              record.date &&
              typeof record.is_present === 'boolean'
            ) {
              const date = new Date(record.date);
              const day = date.getDate();
              
              if (!formattedAttendance[record.child_id]) {
                formattedAttendance[record.child_id] = {};
              }
              if (!formattedAttendance[record.child_id][record.service_id]) {
                formattedAttendance[record.child_id][record.service_id] = {};
              }
              
              formattedAttendance[record.child_id][record.service_id][day] = record.is_present;
            }
          });
        }

        setAttendance(formattedAttendance);
      } catch (error) {
        console.error('Error fetching data:', error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке данных',
          severity: 'error'
        });
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, selectedService, showOnlyOwnChild, showOnlyOwnGroup, user]);

  const handleAttendanceChange = async (childId, serviceId, dayIndex) => {
    if (!canEdit) return;
    
    try {
      const date = new Date(selectedYear, selectedMonth, dayIndex + 1);
      const formattedDate = date.toISOString().split('T')[0];

      // Подготовка данных для обновления
      const updatedAttendance = {
        ...attendance
      };

      if (!updatedAttendance[childId]) {
        updatedAttendance[childId] = {};
      }
      if (!updatedAttendance[childId][serviceId]) {
        updatedAttendance[childId][serviceId] = {};
      }

      const currentValue = updatedAttendance[childId][serviceId][dayIndex + 1] || false;
      updatedAttendance[childId][serviceId][dayIndex + 1] = !currentValue;

      // Сохранение изменений на сервере
      const result = await servicesApi.updateServiceAttendance({
        child_id: childId,
        service_id: serviceId,
        date: formattedDate,
        is_present: !currentValue
      });

      if (!result || typeof result.is_present !== 'boolean') {
        throw new Error('Некорректный ответ от сервера');
      }

      // Обновляем состояние только после успешного ответа от сервера
      setAttendance(updatedAttendance);
    } catch (error) {
      console.error('Error updating attendance:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при сохранении данных',
        severity: 'error'
      });
    }
  };

  const handleSave = async () => {
    try {
      // Преобразуем данные в формат для сервера
      const attendanceRecords = [];
      Object.entries(attendance).forEach(([childId, childServices]) => {
        Object.entries(childServices).forEach(([serviceId, serviceDays]) => {
          Object.entries(serviceDays).forEach(([day, isPresent]) => {
            attendanceRecords.push({
              child_id: Number(childId),
              service_id: Number(serviceId),
              date: new Date(selectedYear, selectedMonth, Number(day)).toISOString().split('T')[0],
              is_present: Boolean(isPresent)
            });
          });
        });
      });

      // Сохранение всех данных посещаемости на сервере
      await servicesApi.saveServiceAttendance(attendanceRecords);

      setSnackbar({
        open: true,
        message: 'Данные посещаемости сохранены',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving attendance:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при сохранении данных',
        severity: 'error'
      });
    }
  };

  const getDayName = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    return dayNames[date.getDay()];
  };

  const isWeekend = (day) => {
    const date = new Date(selectedYear, selectedMonth, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getServiceDays = (service) => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const serviceDays = Array(daysInMonth).fill(false);
    
    service.schedule.forEach(schedule => {
      const dayOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
        .indexOf(schedule.day);
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        if (date.getDay() === dayOfWeek) {
          serviceDays[day - 1] = true;
        }
      }
    });
    
    return serviceDays;
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: 'calc(100vh - 250px)'
    }}>
      {services.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          gap: 2
        }}>
          <Typography variant="h6" color="text.secondary">
            Нет доступных платных занятий
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Пожалуйста, обратитесь к администратору для добавления платных занятий
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                size="small"
              >
                {[
                  'Январь', 'Февраль', 'Март', 'Апрель',
                  'Май', 'Июнь', 'Июль', 'Август',
                  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
                ].map((month, index) => (
                  <MenuItem key={index} value={index}>{month}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <Select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                size="small"
              >
                {services.map(service => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {canEdit && (
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                  }
                }}
              >
                Сохранить
              </Button>
            )}
          </Box>

          <TableContainer component={Paper} sx={{ 
            borderRadius: 2,
            flex: 1,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 350px)'
          }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    width: '250px', 
                    minWidth: '250px',
                    fontWeight: 600, 
                    fontSize: '0.9rem', 
                    bgcolor: 'white',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                    borderRight: '1px solid rgba(224, 224, 224, 1)'
                  }}>
                    Ребенок
                  </TableCell>
                  {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() },
                    (_, i) => i + 1).map(day => {
                    const service = services.find(s => s.id === selectedService);
                    const isServiceDay = service ? getServiceDays(service)[day - 1] : false;
                    
                    return (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{
                          fontWeight: 600,
                          width: '60px',
                          minWidth: '60px',
                          bgcolor: isWeekend(day) ? 'rgba(0, 0, 0, 0.04)' : 
                                  isServiceDay ? 'rgba(99, 102, 241, 0.1)' : 'white',
                          p: 0.5,
                          px: 0
                        }}
                      >
                        <Box>
                          <Typography variant="caption" display="block" sx={{ fontSize: '0.8rem' }}>
                            {getDayName(day)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                            {day}
                          </Typography>
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {children
                  .filter(child => child.services.includes(selectedService))
                  .map(child => (
                    <TableRow key={child.id} hover>
                      <TableCell sx={{ 
                        width: '250px',
                        minWidth: '250px',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        position: 'sticky',
                        left: 0,
                        bgcolor: 'white',
                        zIndex: 1,
                        borderRight: '1px solid rgba(224, 224, 224, 1)'
                      }}>
                        {child.name}
                      </TableCell>
                      {Array.from(
                        { length: new Date(selectedYear, selectedMonth + 1, 0).getDate() },
                        (_, dayIndex) => {
                          const service = services.find(s => s.id === selectedService);
                          const isServiceDay = service ? getServiceDays(service)[dayIndex] : false;
                          
                          return (
                            <TableCell
                              key={dayIndex}
                              align="center"
                              sx={{
                                width: '60px',
                                minWidth: '60px',
                                bgcolor: isWeekend(dayIndex + 1) ? 'rgba(0, 0, 0, 0.04)' : 
                                        isServiceDay ? 'rgba(99, 102, 241, 0.1)' : 'inherit',
                                p: 0.5,
                                px: 0
                              }}
                            >
                              {isServiceDay && (
                                <Checkbox
                                  checked={attendance[child.id]?.[selectedService]?.[dayIndex] || false}
                                  onChange={() => handleAttendanceChange(child.id, selectedService, dayIndex)}
                                  disabled={!canEdit}
                                  size="small"
                                  sx={{
                                    '& .MuiSvgIcon-root': {
                                      fontSize: '1.2rem'
                                    }
                                  }}
                                />
                              )}
                            </TableCell>
                          );
                        }
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default PaidServicesAttendance; 