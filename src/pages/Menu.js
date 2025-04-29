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
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Paper,
  styled
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Restaurant as RestaurantIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/api';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '16px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledMealType = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 600,
  fontSize: '1.1rem',
  marginBottom: theme.spacing(2),
  paddingBottom: theme.spacing(1),
  borderBottom: `2px solid ${theme.palette.primary.light}`,
}));

const StyledDishItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.02)',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  }
}));

const Menu = () => {
  const { user } = useAuth();
  const [menu, setMenu] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState({});
  const [editingDay, setEditingDay] = useState(null);
  const [editingMealType, setEditingMealType] = useState(null);
  const [editingMealIndex, setEditingMealIndex] = useState(-1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [availableDishes, setAvailableDishes] = useState([]); // Список всех доступных блюд

  const daysOfWeek = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница'
  ];

  const mealTypes = [
    'Завтрак',
    'Второй завтрак',
    'Обед',
    'Полдник',
    'Ужин'
  ];

  // Структура категорий для каждого приема пищи
  const mealTypeCategories = {
    'Завтрак': ['Второе блюдо', 'Третье блюдо', 'Напиток'],
    'Второй завтрак': ['Третье блюдо', 'Напиток'],
    'Обед': ['Первое блюдо', 'Второе блюдо', 'Третье блюдо', 'Напиток'],
    'Полдник': ['Третье блюдо', 'Напиток'],
    'Ужин': ['Второе блюдо', 'Третье блюдо', 'Напиток']
  };

  // Функция для создания пустого меню на неделю
  const createEmptyWeekMenu = () => {
    return daysOfWeek.map(day => {
      const dayMenu = { day };
      mealTypes.forEach(mealType => {
        dayMenu[mealType] = [];
      });
      return dayMenu;
    });
  };

  // Загрузка списка всех доступных блюд
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        console.log('Fetching available dishes...');
        const dishes = await api.getAllDishes();
        console.log('Fetched dishes:', dishes);
        
        // Фильтруем блюда по текущей группе
        const selectedGroupData = groups.find(g => g.group_id === selectedGroup);
        const filteredDishes = dishes?.filter(dish => 
          !dish.group_name || // Общие блюда без привязки к группе
          dish.group_name === selectedGroupData?.group_name // Блюда текущей группы
        ) || [];
        
        console.log('Filtered dishes for group:', {
          groupName: selectedGroupData?.group_name,
          totalDishes: dishes?.length,
          filteredDishes: filteredDishes.length
        });
        
        setAvailableDishes(filteredDishes);
        
        if (!filteredDishes || filteredDishes.length === 0) {
          console.warn('No dishes available for current group');
          setSnackbar({
            open: true,
            message: 'Нет доступных блюд для текущей группы',
            severity: 'warning'
          });
        }
      } catch (error) {
        console.error('Error fetching dishes:', error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке списка блюд',
          severity: 'error'
        });
        setAvailableDishes([]);
      }
    };
    
    if (selectedGroup) {
      fetchDishes();
    }
  }, [selectedGroup, groups]); // Добавляем зависимость от selectedGroup и groups

  // Загрузка групп
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        let groupsData;
        
        console.log('Fetching groups for user role:', user.role);
        
        if (user.role === 'admin') {
          groupsData = await api.getGroups();
        } else if (user.role === 'teacher') {
          groupsData = await api.getTeacherGroups(user.id);
        } else if (user.role === 'parent') {
          groupsData = await api.getParentChildGroup(user.id);
        }
        
        setGroups(groupsData || []);
        
        if (groupsData?.length > 0) {
          setSelectedGroup(groupsData[0].group_id);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      loadMenu();
    } else {
      setMenu(createEmptyWeekMenu());
    }
  }, [selectedGroup, selectedWeek]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      if (!selectedGroup) {
        console.warn('No group selected');
        setMenu(createEmptyWeekMenu());
        return;
      }

      // Загружаем данные из weekly_menu для отображения
      const weeklyMenuData = await api.getWeeklyMenu(selectedGroup);
      
      // Загружаем доступные блюда из таблицы menu для редактирования
      const availableDishesData = await api.getAllDishes();
      
      // Фильтруем блюда по текущей группе
      const selectedGroupData = groups.find(g => g.group_id === selectedGroup);
      const filteredDishes = availableDishesData?.filter(dish => 
        dish.group_name === selectedGroupData?.group_name
      ) || [];
      
      setAvailableDishes(filteredDishes);

      // Если меню пустое, создаем пустую структуру
      if (!weeklyMenuData || weeklyMenuData.length === 0) {
        console.log('No menu data found, creating empty menu structure');
        setMenu(createEmptyWeekMenu());
        return;
      }

      // Форматируем меню с учетом фильтрации по группе и категориям
      const formattedMenu = daysOfWeek.map(day => {
        const dayMenu = { day };
        mealTypes.forEach(mealType => {
          const mealsForType = weeklyMenuData.filter(
            item => item.meal_day === day && 
                   item.meal_type === mealType &&
                   item.group_name === selectedGroupData?.group_name &&
                   mealTypeCategories[mealType].includes(item.category) // Проверяем соответствие категории
          );
          dayMenu[mealType] = mealsForType.map(meal => ({
            dish_id: meal.dish_id,
            dish_name: meal.dish_name,
            weight: meal.weight,
            category: meal.category,
            group_name: meal.group_name
          }));
        });
        return dayMenu;
      });

      setMenu(formattedMenu);
    } catch (error) {
      console.error('Error loading menu:', error);
      setSnackbar({ open: true, message: 'Ошибка при загрузке меню', severity: 'error' });
      setMenu(createEmptyWeekMenu());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (day, mealType, meal = {}, index = -1) => {
    console.log('Opening dialog with:', { day, mealType, meal, availableDishes });
    
    // Если это новое блюдо (не редактирование)
    if (!meal.category) {
      // Получаем категории для данного типа приема пищи
      const categories = mealTypeCategories[mealType] || [];
      // Устанавливаем первую доступную категорию по умолчанию
      meal.category = categories[0] || '';
    }
    meal.meal_type = mealType; // Устанавливаем тип приема пищи
    
    setEditingDay(day);
    setEditingMealType(mealType);
    setEditingMeal(meal);
    setEditingMealIndex(index);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMeal({});
    setEditingDay(null);
    setEditingMealType(null);
    setEditingMealIndex(-1);
  };

  const handleAddDish = (day, mealType, category) => {
    console.log('Adding dish:', { day, mealType, category });
    // Если категория не указана, берем первую доступную для данного типа приема пищи
    const defaultCategory = category || mealTypeCategories[mealType][0];
    
    setEditingDay(day);
    setEditingMealType(mealType);
    setEditingMeal({
      day: day,
      meal_type: mealType,
      category: defaultCategory,
      dish_id: null,
      dish_name: '',
      weight: ''
    });
    setOpenDialog(true);
  };

  const handleEditMeal = (meal) => {
    console.log('Editing meal:', meal);
    const dishToEdit = availableDishes.find(d => d.name === meal.dish_name);
    setEditingMeal({
      ...meal,
      dish_id: dishToEdit?.id || null
    });
    setOpenDialog(true);
  };

  const handleSaveMeal = async () => {
    try {
      if (!editingMeal.dish_id || !editingDay || !editingMealType) {
        setSnackbar({ open: true, message: 'Пожалуйста, заполните все поля', severity: 'error' });
        return;
      }

      const selectedDish = availableDishes.find(d => d.id === editingMeal.dish_id);
      if (!selectedDish) {
        setSnackbar({ open: true, message: 'Выбранное блюдо не найдено', severity: 'error' });
        return;
      }

      // Получаем название группы
      const selectedGroupData = groups.find(g => g.group_id === selectedGroup);
      if (!selectedGroupData) {
        setSnackbar({ open: true, message: 'Группа не найдена', severity: 'error' });
        return;
      }

      // Сохраняем в weekly_menu
      const weeklyMenuData = {
        group_name: selectedGroupData.group_name,
        meal_day: editingDay,
        meal_type: editingMealType,
        dish_id: editingMeal.dish_id,
        category: selectedDish.category,
        weight: selectedDish.default_weight || selectedDish.weight,
        group_id: selectedGroup
      };

      console.log('Saving weekly menu item:', weeklyMenuData);

      if (editingMealIndex === -1) {
        // Создаем новую запись
        await api.createWeeklyMenuItem(weeklyMenuData);
      } else {
        // Обновляем существующую запись
        await api.updateWeeklyMenuItem(editingMeal.id, weeklyMenuData);
      }

      handleCloseDialog();
      loadMenu();
      setSnackbar({ open: true, message: 'Меню успешно обновлено', severity: 'success' });
    } catch (error) {
      console.error('Error saving meal:', error);
      setSnackbar({ open: true, message: 'Ошибка при сохранении меню', severity: 'error' });
    }
  };

  const renderDishes = (dayMenu, mealType) => {
    return mealTypeCategories[mealType].map((category) => {
      // Получаем данные о выбранной группе
      const selectedGroupData = groups.find(g => g.group_id === selectedGroup);
      
      // Фильтруем блюда по категории и группе для текущего типа приема пищи
      const dishes = dayMenu[mealType]?.filter(dish => 
        dish.category === category && 
        (!dish.group_name || dish.group_name === selectedGroupData?.group_name)
      ) || [];
      
      // Фильтруем доступные блюда по категории и группе для кнопки добавления
      const availableDishesForCategory = availableDishes.filter(dish => 
        dish.category === category && 
        (!dish.group_name || dish.group_name === selectedGroupData?.group_name)
      );
      
      return (
        <Box key={`${mealType}-${category}`} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ 
            color: 'text.secondary',
            fontWeight: 500,
            display: 'block',
            mb: 0.5
          }}>
            {category} ({availableDishesForCategory.length} доступно)
          </Typography>
          
          {dishes.map((dish, dishIndex) => (
            <Box 
              key={`dish-${dishIndex}-${dish.dish_name}`}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.5,
                '&:not(:last-child)': {
                  borderBottom: '1px solid',
                  borderColor: 'rgba(0, 0, 0, 0.06)'
                }
              }}
            >
              <Typography variant="body2" sx={{ 
                fontWeight: 500,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                {dish.dish_name}
                <Typography 
                  component="span" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {dish.weight} г
                </Typography>
              </Typography>
              {(user.role === 'admin' || user.role === 'teacher') && (
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(dayMenu.day, mealType, dish, dishIndex)}
                  sx={{
                    p: 0.5,
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    }
                  }}
                >
                  <EditIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              )}
            </Box>
          ))}
          
          {(user.role === 'admin' || user.role === 'teacher') && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog(dayMenu.day, mealType, { category: category })}
              sx={{
                mt: 0.5,
                py: 0.25,
                px: 1,
                borderRadius: '4px',
                textTransform: 'none',
                fontSize: '0.75rem',
                color: 'primary.main',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                }
              }}
            >
              Добавить {category.toLowerCase()}
            </Button>
          )}
        </Box>
      );
    });
  };

  const renderMealDialog = () => {
    // Получаем выбранную группу
    const selectedGroupData = groups.find(g => g.group_id === selectedGroup);
    
    // Получаем все блюда текущего дня
    const currentDayMenu = menu.find(dayMenu => dayMenu.day === editingDay);
    const allDishesInCurrentDay = currentDayMenu ? 
      Object.values(currentDayMenu)
        .filter(value => Array.isArray(value)) // Фильтруем только массивы (списки блюд)
        .flat()
        .map(dish => dish.dish_id) : [];

    console.log('All dishes in current day:', allDishesInCurrentDay);

    // Получаем допустимые категории для текущего типа приема пищи
    const allowedCategories = editingMealType ? mealTypeCategories[editingMealType] : [];

    // Фильтруем блюда
    const filteredDishes = Array.isArray(availableDishes) ? availableDishes
      .filter(dish => {
        // Проверяем принадлежность к группе
        const groupMatch = dish.group_name === selectedGroupData?.group_name;
        
        // Проверяем, что категория блюда соответствует допустимым категориям для данного типа приема пищи
        const isValidCategory = allowedCategories.includes(dish.category);
        
        // Проверяем на дубликаты во всех приемах пищи текущего дня
        const isDuplicate = allDishesInCurrentDay.includes(dish.id);

        // Если редактируем существующее блюдо, разрешаем его выбрать
        const isCurrentDish = editingMeal?.dish_id === dish.id;

        return groupMatch && isValidCategory && (!isDuplicate || isCurrentDish);
      })
      // Сортируем по категориям и имени
      .sort((a, b) => {
        const categoryCompare = a.category.localeCompare(b.category);
        return categoryCompare !== 0 ? categoryCompare : a.name.localeCompare(b.name);
      }) : [];

    console.log('Filtered dishes:', {
      total: availableDishes?.length,
      filtered: filteredDishes.length,
      group: selectedGroupData?.group_name,
      allowedCategories,
      dishesInDay: allDishesInCurrentDay.length,
      mealType: editingMealType,
      editingDishId: editingMeal?.dish_id
    });

    return (
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            padding: '24px',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          fontWeight: 600,
          color: 'primary.main'
        }}>
          {editingMeal?.id ? 'Редактирование блюда' : 'Добавление блюда'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                День недели
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {editingDay || ''}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                Прием пищи
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {editingMealType || ''}
              </Typography>
            </Box>

            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel>Блюдо</InputLabel>
              <Select
                value={editingMeal?.dish_id || ''}
                onChange={(e) => {
                  const selectedDish = availableDishes.find(d => d.id === e.target.value);
                  console.log('Selected dish:', selectedDish);
                  if (selectedDish) {
                    setEditingMeal({ 
                      ...editingMeal, 
                      dish_id: selectedDish.id,
                      dish_name: selectedDish.name,
                      category: selectedDish.category,
                      weight: selectedDish.default_weight || selectedDish.weight,
                      meal_type: selectedDish.meal_type
                    });
                  }
                }}
                label="Блюдо"
                sx={{ borderRadius: '8px' }}
              >
                {filteredDishes.length > 0 ? (
                  filteredDishes.map((dish) => (
                    <MenuItem key={dish.id} value={dish.id}>
                      {dish.name} ({dish.category}) - {dish.default_weight || dish.weight} г
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    Нет доступных блюд для выбранных параметров
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Категория
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {editingMeal?.category || ''}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Вес (г)
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {editingMeal?.weight || ''}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ pt: 3 }}>
          <Button 
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            size="small"
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              mr: 1
            }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSaveMeal}
            variant="contained"
            size="small"
            disabled={!editingMeal?.dish_id}
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              px: 3
            }}
          >
            {editingMeal?.id ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Обработчик изменения выбранной группы
  const handleGroupChange = (event) => {
    const newGroupId = event.target.value;
    setSelectedGroup(newGroupId);
    // При смене группы очищаем текущее меню и загружаем новое
    setMenu(createEmptyWeekMenu());
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3
        }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Меню
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={selectedGroup || ''}
                onChange={handleGroupChange}
                label="Группа"
                sx={{ borderRadius: '8px' }}
              >
                {groups.map((group) => (
                  <MenuItem key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingMeal({});
                  setOpenDialog(true);
                }}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  px: 2,
                  py: 0.75,
                }}
              >
                Добавить блюдо
              </Button>
            )}
          </Box>
        </Box>

        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Неделя</InputLabel>
                <Select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  label="Неделя"
                  sx={{ borderRadius: '8px' }}
                >
                  <MenuItem value="current">Текущая неделя</MenuItem>
                  <MenuItem value="next">Следующая неделя</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2}>
          {menu.filter(dayMenu => daysOfWeek.includes(dayMenu.day)).map((dayMenu, dayIndex) => (
            <Grid item xs={12} key={`day-${dayIndex}`}>
              <StyledCard sx={{ p: 0 }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    pb: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <RestaurantIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {dayMenu.day}
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {mealTypes.map((mealType) => (
                      <Grid item xs={12} md={6} lg={4} key={`meal-${mealType}`}>
                        <Box sx={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                          borderRadius: '8px',
                          p: 1.5,
                          height: '100%'
                        }}>
                          <Typography variant="subtitle2" sx={{ 
                            color: 'primary.main',
                            fontWeight: 600,
                            mb: 1,
                            pb: 0.5,
                            borderBottom: '2px solid',
                            borderColor: 'primary.light',
                            display: 'inline-block'
                          }}>
                            {mealType}
                          </Typography>
                          
                          <Box sx={{ mt: 1 }}>
                            {renderDishes(dayMenu, mealType)}
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </StyledCard>
            </Grid>
          ))}
        </Grid>

        {renderMealDialog()}

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

export default Menu; 