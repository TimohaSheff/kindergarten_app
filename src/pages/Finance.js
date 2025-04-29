import React, { useState, useEffect } from 'react';
import {
  Box,
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
  IconButton,
  Chip,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  Calculate as CalculateIcon,
  Discount as DiscountIcon,
  School as SchoolIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';

// Константы для типов льгот
const DISCOUNT_TYPES = {
  MANY_CHILDREN: {
    id: 'MANY_CHILDREN',
    label: 'Многодетная семья',
    defaultDiscount: 50,
    description: 'Скидка 50% для многодетных семей'
  },
  DISABLED_CHILD: {
    id: 'DISABLED_CHILD',
    label: 'Ребенок-инвалид',
    defaultDiscount: 100,
    description: 'Полное освобождение от оплаты'
  },
  LOW_INCOME: {
    id: 'LOW_INCOME',
    label: 'Малоимущая семья',
    defaultDiscount: 50,
    description: 'Скидка от 30% до 100% в зависимости от статуса'
  },
  SINGLE_PARENT: {
    id: 'SINGLE_PARENT',
    label: 'Одинокий родитель',
    defaultDiscount: 30,
    description: 'Скидка 30-50% для одиноких родителей'
  },
  EDUCATION_EMPLOYEE: {
    id: 'EDUCATION_EMPLOYEE',
    label: 'Сотрудник образования',
    defaultDiscount: 30,
    description: 'Скидка 30-50% для работников образования'
  },
  PREPAYMENT: {
    id: 'PREPAYMENT',
    label: 'Предоплата',
    defaultDiscount: 10,
    description: 'Скидка до 10% при оплате за несколько месяцев'
  }
};

const Finance = ({ canEdit = false, canSendReminders = false }) => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState({
    type: '',
    amount: 0,
    reason: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [discounts, setDiscounts] = useState({});
  const [paidGroups, setPaidGroups] = useState({});
  const [extraServices, setExtraServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const DAILY_RATE = 194; // Стоимость одного дня
  const PAID_GROUP_MONTHLY_FEE = 1300; // Ежемесячная плата за платную группу

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Загрузка детей в зависимости от роли пользователя
        let childrenData;
        if (user.role === 'parent') {
          childrenData = await api.getAllChildren();
          childrenData = childrenData.filter(child => child.parentId === user.id);
        } else {
          childrenData = await api.getAllChildren();
        }
        setChildren(childrenData);

        // Загрузка данных о посещаемости
        const attendanceData = await api.getAttendance(
          selectedYear,
          selectedMonth + 1,
          childrenData.map(child => child.id)
        );

        // Преобразование данных посещаемости в нужный формат
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const formattedAttendance = {};
        childrenData.forEach(child => {
          formattedAttendance[child.id] = Array(daysInMonth).fill(false);
          const childAttendance = attendanceData.filter(a => a.childId === child.id);
          childAttendance.forEach(record => {
            const day = new Date(record.date).getDate() - 1;
            formattedAttendance[child.id][day] = record.present;
          });
        });
        setAttendance(formattedAttendance);

        // Загрузка данных о платных группах
        const groupsData = await api.getGroups();
        const paidGroupsData = {};
        childrenData.forEach(child => {
          const group = groupsData.find(g => g.id === child.groupId);
          paidGroupsData[child.id] = group?.isPaid || false;
        });
        setPaidGroups(paidGroupsData);

        // Загрузка данных о скидках
        const discountsData = await api.getDiscounts(
          selectedYear,
          selectedMonth + 1,
          childrenData.map(child => child.id)
        );
        const formattedDiscounts = {};
        childrenData.forEach(child => {
          const childDiscount = discountsData.find(d => d.childId === child.id);
          formattedDiscounts[child.id] = childDiscount || { amount: 0, reason: '' };
        });
        setDiscounts(formattedDiscounts);

        // Загрузка данных о дополнительных услугах
        const servicesData = await api.getExtraServices(
          selectedYear,
          selectedMonth + 1,
          childrenData.map(child => child.id)
        );
        const formattedServices = {};
        childrenData.forEach(child => {
          formattedServices[child.id] = servicesData.filter(s => s.childId === child.id);
        });
        setExtraServices(formattedServices);

        // Формирование данных о платежах
        const paymentsData = childrenData.map(child => ({
          id: child.id,
          childId: child.id,
          childName: child.name,
          parentName: child.parentName,
          isPaidGroup: paidGroupsData[child.id],
          discounts: formattedDiscounts[child.id] ? [formattedDiscounts[child.id]] : [],
          extraServices: formattedServices[child.id] || []
        }));
        setPayments(paymentsData);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, user]);

  const calculateAttendanceDays = (childId) => {
    if (!attendance[childId]) return 0;
    // Подсчитываем только рабочие дни (исключаем выходные)
    return attendance[childId].filter((day, index) => {
      const date = new Date(selectedYear, selectedMonth, index + 1);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      return day && !isWeekend;
    }).length;
  };

  const calculateExtraServicesTotal = (childId) => {
    if (!extraServices[childId]) return 0;
    return extraServices[childId].reduce((total, service) => {
      return total + (service.pricePerLesson * service.attendedLessons);
    }, 0);
  };

  const calculateTotal = (payment) => {
    const attendanceDays = calculateAttendanceDays(payment.childId);
    const baseAmount = attendanceDays * DAILY_RATE;
    const paidGroupFee = payment.isPaidGroup ? PAID_GROUP_MONTHLY_FEE : 0;
    const extraServicesTotal = calculateExtraServicesTotal(payment.childId);
    
    // Расчет суммы с учетом всех льгот
    const totalDiscount = payment.discounts?.reduce((sum, discount) => {
      const discountAmount = (baseAmount + paidGroupFee) * (discount.amount / 100);
      return sum + discountAmount;
    }, 0) || 0;

    return baseAmount + paidGroupFee + extraServicesTotal - totalDiscount;
  };

  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setOpenDialog(true);
  };

  const handleOpenDiscountDialog = (payment) => {
    setSelectedPayment(payment);
    setSelectedDiscount({
      type: '',
      amount: 0,
      reason: ''
    });
    setDiscountDialogOpen(true);
  };

  const handleAddDiscount = () => {
    if (!selectedDiscount.type || selectedDiscount.amount <= 0) {
      setSnackbar({
        open: true,
        message: 'Пожалуйста, заполните все поля льготы',
        severity: 'error'
      });
      return;
    }

    const updatedPayments = payments.map(payment => {
      if (payment.id === selectedPayment.id) {
        const newDiscounts = [...(payment.discounts || []), {
          ...selectedDiscount,
          id: Date.now(),
          label: DISCOUNT_TYPES[selectedDiscount.type].label
        }];
        return { ...payment, discounts: newDiscounts };
      }
      return payment;
    });

    setPayments(updatedPayments);
    setDiscountDialogOpen(false);
    setSnackbar({
      open: true,
      message: 'Льгота успешно добавлена',
      severity: 'success'
    });
  };

  const handleRemoveDiscount = (paymentId, discountId) => {
    const updatedPayments = payments.map(payment => {
      if (payment.id === paymentId) {
        const newDiscounts = payment.discounts.filter(d => d.id !== discountId);
        return { ...payment, discounts: newDiscounts };
      }
      return payment;
    });

    setPayments(updatedPayments);
    setSnackbar({
      open: true,
      message: 'Льгота удалена',
      severity: 'success'
    });
  };

  const renderPaymentDetails = (payment) => {
    const attendanceDays = calculateAttendanceDays(payment.childId);
    const baseAmount = attendanceDays * DAILY_RATE;
    const paidGroupFee = payment.isPaidGroup ? PAID_GROUP_MONTHLY_FEE : 0;
    const extraServicesTotal = calculateExtraServicesTotal(payment.childId);

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Базовая стоимость: {baseAmount} руб. ({attendanceDays} дней × {DAILY_RATE} руб.)
        </Typography>
        {payment.isPaidGroup && (
          <Typography variant="subtitle2" gutterBottom>
            Доплата за платную группу: {PAID_GROUP_MONTHLY_FEE} руб.
          </Typography>
        )}
        {extraServicesTotal > 0 && (
          <Typography variant="subtitle2" gutterBottom>
            Дополнительные услуги: {extraServicesTotal} руб.
          </Typography>
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Применённые льготы:
          </Typography>
          {payment.discounts?.map((discount) => (
            <Chip
              key={discount.id}
              label={`${discount.label} (${discount.amount}%)`}
              onDelete={canEdit ? () => handleRemoveDiscount(payment.id, discount.id) : undefined}
              sx={{ mr: 1, mb: 1 }}
            />
          ))}
        </Box>
        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
          Итого к оплате: {calculateTotal(payment)} руб.
        </Typography>
      </Box>
    );
  };

  const renderPayments = () => (
    <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Ребенок</TableCell>
            <TableCell>Родитель</TableCell>
            <TableCell>Тип группы</TableCell>
            <TableCell>Льготы</TableCell>
            <TableCell align="right">Сумма к оплате</TableCell>
            {canEdit && <TableCell align="right">Действия</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>{payment.childName}</TableCell>
              <TableCell>{payment.parentName}</TableCell>
              <TableCell>
                {payment.isPaidGroup ? 'Платная группа' : 'Бесплатная группа'}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {payment.discounts?.map((discount) => (
                    <Chip
                      key={discount.id}
                      label={`${discount.label} (${discount.amount}%)`}
                      size="small"
                    />
                  ))}
                </Box>
              </TableCell>
              <TableCell align="right">
                {calculateTotal(payment)} руб.
              </TableCell>
              {canEdit && (
                <TableCell align="right">
                  <Tooltip title="Добавить льготу">
                    <IconButton 
                      onClick={() => handleOpenDiscountDialog(payment)}
                      size="small"
                    >
                      <DiscountIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Редактировать">
                    <IconButton
                      onClick={() => handleEditPayment(payment)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const handleSavePayment = async (payment) => {
    try {
      setLoading(true);
      await api.savePayment(payment);
      
      setSnackbar({
        open: true,
        message: 'Платеж успешно сохранен',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving payment:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при сохранении платежа',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscount = async (childId, discount) => {
    try {
      setLoading(true);
      await api.saveDiscount(childId, selectedYear, selectedMonth + 1, discount);
      
      setDiscounts(prev => ({
        ...prev,
        [childId]: discount
      }));

      setSnackbar({
        open: true,
        message: 'Скидка успешно сохранена',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving discount:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при сохранении скидки',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDiscountDialogOpen(false);
    }
  };

  const handleSendReminder = async (childId) => {
    try {
      setLoading(true);
      await api.sendPaymentReminder(childId, selectedYear, selectedMonth + 1);
      
      setSnackbar({
        open: true,
        message: 'Напоминание успешно отправлено',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error sending reminder:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при отправке напоминания',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Финансы
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Управление оплатой и льготами
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Общая информация
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Стоимость дня:
                </Typography>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {DAILY_RATE}₽
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Доплата за платную группу:
                </Typography>
                <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {PAID_GROUP_MONTHLY_FEE}₽
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200, mr: 2 }}>
          <InputLabel>Месяц</InputLabel>
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            label="Месяц"
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
      </Box>

      {renderPayments()}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Редактировать платёж</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={selectedPayment?.isPaidGroup || false}
                  onChange={(e) => {
                    setSelectedPayment(prev => ({
                      ...prev,
                      isPaidGroup: e.target.checked
                    }));
                  }}
                />
              }
              label="Платная группа"
            />
            
            {selectedPayment && renderPaymentDetails(selectedPayment)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button variant="contained" onClick={() => {
            // Handle saving the updated payment
            setOpenDialog(false);
            handleSavePayment(selectedPayment);
          }}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={discountDialogOpen}
        onClose={() => setDiscountDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить льготу</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Тип льготы</InputLabel>
            <Select
              value={selectedDiscount.type}
              onChange={(e) => setSelectedDiscount({
                ...selectedDiscount,
                type: e.target.value,
                amount: DISCOUNT_TYPES[e.target.value]?.defaultDiscount || 0
              })}
              label="Тип льготы"
            >
              {Object.values(DISCOUNT_TYPES).map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.label} - {type.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Размер скидки (%)"
            type="number"
            value={selectedDiscount.amount}
            onChange={(e) => setSelectedDiscount({
              ...selectedDiscount,
              amount: Math.min(100, Math.max(0, Number(e.target.value)))
            })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Причина/Комментарий"
            multiline
            rows={3}
            value={selectedDiscount.reason}
            onChange={(e) => setSelectedDiscount({
              ...selectedDiscount,
              reason: e.target.value
            })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscountDialogOpen(false)}>Отмена</Button>
          <Button onClick={() => handleSaveDiscount(selectedPayment.childId, selectedDiscount)} variant="contained">
            Добавить
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
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Finance; 