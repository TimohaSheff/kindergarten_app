import React, { useState, useEffect } from 'react';
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
  Snackbar,
  Alert,
  IconButton,
  Divider,
  Paper,
  styled,
  Tabs,
  Tab
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Restaurant as RestaurantIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api, { menuApi } from '../api/api';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '12px',
  background: '#ffffff',
  boxShadow: 'none',
  border: '1px solid',
  borderColor: 'rgba(145, 107, 216, 0.1)',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    borderColor: '#916BD8',
    transform: 'translateY(-2px)',
  }
}));

const StyledMealType = styled(Typography)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: 600,
  fontSize: '1rem',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  marginBottom: theme.spacing(2),
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
  const { PageTitle } = useOutletContext();
  const { user } = useAuth();
  const [menu, setMenu] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('current');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMeal, setEditingMeal] = useState({
    name: '',
    weight: '',
    meal_type: '',
    category: '',
    group_id: ''
  });
  const [editingDay, setEditingDay] = useState(null);
  const [editingMealType, setEditingMealType] = useState(null);
  const [editingMealIndex, setEditingMealIndex] = useState(-1);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [availableDishes, setAvailableDishes] = useState([]); // Список всех доступных блюд
  const [editingMealDialog, setEditingMealDialog] = useState(false);
  const [selectedDayMeal, setSelectedDayMeal] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [manageDishesDialog, setManageDishesDialog] = useState(false);
  const [editingDishId, setEditingDishId] = useState(null);

  const daysOfWeek = [
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница'
  ];

  // Добавляем маппинг дней недели в числа
  const dayToNumber = {
    'Понедельник': 1,
    'Вторник': 2,
    'Среда': 3,
    'Четверг': 4,
    'Пятница': 5
  };

  const numberToDay = {
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница'
  };

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
    'Второй завтрак': ['Второе блюдо', 'Третье блюдо', 'Напиток'],
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
        const response = await menuApi.getDishes();
        const dishes = response?.data || [];
        console.log('Fetched dishes:', dishes);
        
        // Добавляем подробное логирование
        console.log('Current selected group:', {
          selectedGroup,
          selectedGroupType: typeof selectedGroup
        });
        
        if (!Array.isArray(dishes)) {
          console.warn('Dishes data is not an array:', dishes);
          setAvailableDishes([]);
          return;
        }
        
        console.log('All dishes group IDs:', dishes.map(d => ({
          id: d.id,
          group_id: d.group_id,
          group_id_type: typeof d.group_id,
          name: d.name
        })));
        
        // Фильтруем блюда по текущей группе, приводим ID к строке для сравнения
        const filteredDishes = dishes.filter(dish => 
          String(dish.group_id) === String(selectedGroup)
        );
        
        console.log('Filtered dishes:', {
          totalDishes: dishes.length,
          filteredCount: filteredDishes.length,
          selectedGroup,
          filteredDishes
        });
        
        setAvailableDishes(filteredDishes);
        
        if (filteredDishes.length === 0) {
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
  }, [selectedGroup]);

  // Загрузка групп
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        let groupsData;
        
        console.log('Fetching groups for user role:', user.role);
        
        if (user.role === 'admin') {
          const response = await api.groups.getAll();
          groupsData = response?.data || [];
        } else if (user.role === 'teacher') {
          const response = await api.getTeacherGroups(user.id);
          groupsData = response?.data || [];
        } else if (user.role === 'parent') {
          const response = await api.getParentChildGroup(user.id);
          groupsData = response?.data || [];
        }
        
        console.log('Received groups data:', groupsData);
        
        // Убедимся, что groupsData является массивом
        const groups = Array.isArray(groupsData) ? groupsData : [];
        setGroups(groups);
        
        if (groups.length > 0) {
          setSelectedGroup(groups[0].group_id);
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
        console.log('No group selected');
        setMenu(createEmptyWeekMenu());
        return;
      }

      console.log('Loading menu for group:', selectedGroup, 'week:', selectedWeek);

      // Загружаем данные из weekly_menu для отображения
      const weekNumber = selectedWeek === 'current' ? 1 : 2;
      const weeklyMenuResponse = await menuApi.getWeeklyMenu(selectedGroup, weekNumber);
      const weeklyMenuData = weeklyMenuResponse?.data || [];
      
      console.log('Loaded weekly menu data:', {
        raw: weeklyMenuData,
        count: weeklyMenuData.length,
        sampleItem: weeklyMenuData[0]
      });
      
      // Загружаем доступные блюда из таблицы menu для редактирования
      const availableDishesResponse = await menuApi.getDishes();
      const availableDishesData = availableDishesResponse?.data || [];
      
      console.log('Loaded available dishes:', {
        count: availableDishesData.length,
        sampleDish: availableDishesData[0],
        fields: availableDishesData[0] ? Object.keys(availableDishesData[0]) : []
      });
      
      // Фильтруем блюда по текущей группе
      const filteredDishes = availableDishesData.filter(dish => 
        Number(dish.group_id) === Number(selectedGroup)
      );
      
      setAvailableDishes(filteredDishes);

      // Если меню пустое, создаем пустую структуру
      if (!weeklyMenuData || weeklyMenuData.length === 0) {
        console.log('Creating empty menu structure for group:', selectedGroup);
        setMenu(createEmptyWeekMenu());
        return;
      }

      // Форматируем меню с учетом фильтрации по группе и категориям
      const formattedMenu = daysOfWeek.map(day => {
        const dayMenu = { day };
        mealTypes.forEach(mealType => {
          // Фильтруем блюда для текущего дня и типа приема пищи
          const mealsForType = weeklyMenuData.filter(item => {
            const dayMatch = numberToDay[item.meal_day] === day;
            const mealTypeMatch = item.meal_type === mealType;
            
            console.log(`Filtering for ${day} - ${mealType}:`, {
              item,
              dayMatch,
              mealTypeMatch,
              itemMealDay: item.meal_day,
              itemMealType: item.meal_type,
              expectedDay: day,
              expectedMealType: mealType
            });
            
            return dayMatch && mealTypeMatch;
          });

          console.log(`Found meals for ${day} - ${mealType}:`, mealsForType);

          // Находим соответствующие блюда в availableDishes и объединяем данные
          dayMenu[mealType] = mealsForType.map(meal => {
            const dish = availableDishesData.find(d => d.id === meal.dish_id);
            if (!dish) {
              console.warn(`Dish not found for id ${meal.dish_id}`);
              return null;
            }

            return {
              menu_id: meal.menu_id,
            dish_id: meal.dish_id,
              dish_name: dish.name,
              weight: dish.default_weight || dish.weight || '0 г',
              category: dish.category,
              group_id: meal.group_id,
              week_number: meal.week_number,
              meal_type: meal.meal_type
            };
          }).filter(Boolean); // Удаляем null значения
        });
        return dayMenu;
      });

      console.log('Formatted menu:', {
        structure: formattedMenu,
        sample: formattedMenu[0],
        meals: formattedMenu[0]?.['Завтрак']
      });

      setMenu(formattedMenu);
    } catch (error) {
      console.error('Error loading menu:', error);
      setMenu(createEmptyWeekMenu());
      setSnackbar({ 
        open: true, 
        message: 'Ошибка при загрузке меню', 
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (day, mealType, meal = {}, index = -1) => {
    console.log('Opening dialog with:', { day, mealType, meal, availableDishes });
    
    setEditingDay(day);
    setEditingMealType(mealType);
    setEditingMealIndex(index);

    // Если это редактирование существующего блюда
    if (meal.dish_id || meal.menu_id) {
      const existingDish = availableDishes.find(d => d.id === meal.dish_id);
      if (existingDish) {
        setEditingMeal({
          ...meal,
          menu_id: meal.menu_id,
          dish_id: existingDish.id,
          dish_name: existingDish.name,
          category: existingDish.category,
          meal_type: mealType,
          weight: existingDish.default_weight || meal.weight || '0 г'
        });
      }
    } else {
      // Если это новое блюдо
      setEditingMeal({
        ...meal,
        category: meal.category || '', // Используем переданную категорию
        meal_type: mealType,
        weight: '0 г'
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMeal({
      name: '',
      weight: '',
      meal_type: '',
      category: '',
      group_id: ''
    });
    setEditingDay(null);
    setEditingMealType(null);
    setEditingMealIndex(-1);
  };

  const handleAddDish = (day, mealType, category) => {
    console.log('Adding dish:', { day, mealType, category });
    
    handleOpenDialog(day, mealType, {
      day: day,
      meal_type: mealType,
      category: category, // Передаем выбранную категорию
      dish_id: null,
      dish_name: '',
      weight: ''
    });
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
      if (!editingMeal.name || !editingMeal.weight || !editingMeal.meal_type || !editingMeal.category || !selectedGroup) {
        setSnackbar({
          open: true,
          message: 'Пожалуйста, заполните все поля',
          severity: 'error'
        });
        return;
      }

      // Создаем новое блюдо
      const newDish = {
        name: editingMeal.name,
        weight: editingMeal.weight,
        meal_type: editingMeal.meal_type,
        category: editingMeal.category,
        group_id: selectedGroup,
        date: new Date().toISOString().split('T')[0] // Добавляем текущую дату в формате YYYY-MM-DD
      };

      // Создаем блюдо через API
      const createdDish = await menuApi.createDish(newDish);
      
      if (createdDish?.id) {
        // Добавляем блюдо в меню
        await menuApi.createMenuItem({
          dish_id: createdDish.id,
          meal_day: dayToNumber[editingDay] || 1,
          group_id: selectedGroup,
          week_number: selectedWeek === 'current' ? 1 : 2,
          meal_type: editingMeal.meal_type
        });
        
        setSnackbar({
          open: true,
          message: 'Блюдо успешно добавлено',
          severity: 'success'
        });
        
        handleCloseDialog();
        await loadMenu(); // Перезагружаем меню
      } else {
        throw new Error('Не удалось создать блюдо');
      }
    } catch (error) {
      console.error('Error saving dish:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Ошибка при сохранении блюда',
        severity: 'error'
      });
    }
  };

  // Функция форматирования веса
  const formatWeight = (weight) => {
    if (!weight) return '0\u00A0г';
    // Убираем все "г" и пробелы с конца строки
    const cleanWeight = weight.replace(/\s*г\s*$/, '').trim();
    return `${cleanWeight}\u00A0г`;
  };

  const renderDishes = (dayMenu, mealType) => {
    // Находим текущую группу
    const currentGroup = groups.find(g => g.group_id === selectedGroup);
    const isJuniorOrMiddleGroup = currentGroup?.name?.toLowerCase().includes('младшая') || 
                                 currentGroup?.name?.includes('средняя');

    // Создаем объект с блюдами по категориям, берем только первое блюдо для каждой категории
    const dishesByCategory = {};
    mealTypeCategories[mealType].forEach(category => {
      const dishes = dayMenu[mealType]?.filter(dish => dish.category === category) || [];
      // Берем только первое блюдо для каждой категории
      dishesByCategory[category] = dishes.length > 0 ? [dishes[0]] : [];
    });

    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderRadius: '12px',
        p: 1,
        border: '1px solid',
        borderColor: 'rgba(145, 107, 216, 0.1)',
        position: 'relative',
        height: '100%',
        flex: 1
      }}>
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FAFAFA',
          borderRadius: '8px',
          p: 1,
          height: '100%',
          flex: 1
        }}>
          <Box sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            {Object.entries(dishesByCategory).map(([category, dishes], index, array) => {
              if (isJuniorOrMiddleGroup && mealType === 'Второй завтрак' && category === 'Второе блюдо') {
                return null;
              }
      
              return (
                <Box key={category} sx={{ 
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  p: 0.75,
                  boxShadow: '0 1px 2px rgba(145, 107, 216, 0.05)',
                }}>
                  <Typography variant="caption" sx={{ 
                    color: '#916BD8',
                    fontWeight: 600,
                    display: 'block',
                    mb: 0.5,
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px'
                  }}>
                    {category}
                  </Typography>
          
                  {dishes.length > 0 ? (
                    <Box 
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        px: 1.5,
                        backgroundColor: 'rgba(145, 107, 216, 0.03)',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'rgba(145, 107, 216, 0.08)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          backgroundColor: 'rgba(145, 107, 216, 0.08)',
                          borderColor: 'rgba(145, 107, 216, 0.2)',
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ 
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: '#2D3748'
                      }}>
                        {dishes[0].dish_name}
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontSize: '0.75rem',
                            color: '#916BD8',
                            fontWeight: 600,
                            backgroundColor: 'rgba(145, 107, 216, 0.08)',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {formatWeight(dishes[0].weight)}
                        </Typography>
                      </Typography>
                    </Box>
                  ) : (
                    <Box 
                      sx={{
                        py: 1,
                        px: 1.5,
                        backgroundColor: 'rgba(145, 107, 216, 0.03)',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'rgba(145, 107, 216, 0.08)',
                        color: '#718096',
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}
                    >
                      Блюдо не выбрано
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
          
          {(user.role === 'admin' || user.role === 'teacher') && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => handleOpenMealDialog(dayMenu.day, mealType, dishesByCategory)}
              sx={{
                mt: 1.5,
                py: 1,
                backgroundColor: '#916BD8',
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#7B5AB9',
                  boxShadow: 'none',
                }
              }}
            >
              Редактировать меню
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  const renderMealDialog = () => {
    return (
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            backgroundColor: '#FAFAFA'
          }
        }}
      >
        <DialogTitle sx={{ 
          p: 2,
          background: 'linear-gradient(45deg, #916BD8 0%, #9F7AE7 100%)',
          color: '#fff',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <RestaurantIcon sx={{ fontSize: '1.2rem' }} />
          Добавление блюда
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            mt: 1
          }}>
            <TextField
              fullWidth
              label="Название блюда"
              value={editingMeal.name || ''}
              onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
              size="small"
              sx={{
                backgroundColor: '#fff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />

            <TextField
              fullWidth
              label="Вес (например: 100 г)"
              value={editingMeal.weight || ''}
              onChange={(e) => setEditingMeal({ ...editingMeal, weight: e.target.value })}
              size="small"
              sx={{
                backgroundColor: '#fff',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px'
                }
              }}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Прием пищи</InputLabel>
              <Select
                value={editingMeal.meal_type || ''}
                onChange={(e) => setEditingMeal({ ...editingMeal, meal_type: e.target.value })}
                label="Прием пищи"
                sx={{ 
                  backgroundColor: '#fff',
                  borderRadius: '8px'
                }}
              >
                {mealTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Категория</InputLabel>
              <Select
                value={editingMeal.category || ''}
                onChange={(e) => setEditingMeal({ ...editingMeal, category: e.target.value })}
                label="Категория"
                sx={{ 
                  backgroundColor: '#fff',
                  borderRadius: '8px'
                }}
              >
                <MenuItem value="Первое блюдо">Первое блюдо</MenuItem>
                <MenuItem value="Второе блюдо">Второе блюдо</MenuItem>
                <MenuItem value="Третье блюдо">Третье блюдо</MenuItem>
                <MenuItem value="Напиток">Напиток</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 2,
          backgroundColor: '#fff',
          borderTop: '1px solid rgba(145, 107, 216, 0.1)',
          gap: 1
        }}>
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{ 
              flex: 1,
              color: '#916BD8',
              borderColor: 'rgba(145, 107, 216, 0.2)',
              '&:hover': {
                borderColor: '#916BD8',
                backgroundColor: 'rgba(145, 107, 216, 0.08)'
              }
            }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSaveMeal}
            variant="contained"
            sx={{ 
              flex: 1,
              backgroundColor: '#916BD8',
              '&:hover': {
                backgroundColor: '#7B5AB9'
              }
            }}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Обработчик изменения выбранной группы
  const handleGroupChange = (event) => {
    const newGroupId = event.target.value;
    console.log('Group change:', {
      newGroupId,
      newGroupIdType: typeof newGroupId,
      rawValue: event.target.value
    });
    setSelectedGroup(newGroupId); // Оставляем значение как есть, без преобразования
    setMenu(createEmptyWeekMenu());
  };

  // Добавляем функцию для очистки меню на неделю
  const handleClearWeekMenu = async () => {
    try {
      if (!selectedGroup) {
        setSnackbar({
          open: true,
          message: 'Выберите группу',
          severity: 'error'
        });
        return;
      }

      const weekNumber = selectedWeek === 'current' ? 1 : 2;
      await menuApi.deleteWeeklyMenu(selectedGroup, weekNumber);
      
      setSnackbar({
        open: true,
        message: 'Меню на неделю очищено',
        severity: 'success'
      });
      
      await loadMenu();
    } catch (error) {
      console.error('Error clearing week menu:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при очистке меню',
        severity: 'error'
      });
    }
  };

  // Добавляем функцию удаления блюда
  const handleDeleteDishFromMenu = async (menuId) => {
    try {
      console.log('Attempting to delete menu item:', menuId);
      
      // Удаляем элемент меню
      await menuApi.deleteMenuItem(menuId);
      
      setSnackbar({
        open: true,
        message: 'Блюдо успешно удалено из меню',
        severity: 'success'
      });

      // Закрываем диалог редактирования
      setEditingMealDialog(false);

      // Обновляем только текущее меню
      await loadMenu();
    } catch (error) {
      console.error('Error deleting menu item:', {
        error,
        menuId,
        message: error.message,
        response: error.response?.data
      });
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Ошибка при удалении блюда из меню',
        severity: 'error'
      });
    }
  };

  // Добавляем новую функцию для удаления блюда из списка доступных блюд
  const handleDeleteDish = async (dishId) => {
    try {
      console.log('Attempting to delete dish from available dishes:', dishId);
      
      await menuApi.deleteDish(dishId);
      
      setSnackbar({
        open: true,
        message: 'Блюдо успешно удалено',
        severity: 'success'
      });

      // Обновляем список доступных блюд
      const response = await menuApi.getDishes();
      const dishes = response?.data || [];
      
      if (Array.isArray(dishes)) {
        const filteredDishes = dishes.filter(dish => 
          String(dish.group_id) === String(selectedGroup)
        );
        setAvailableDishes(filteredDishes);
      } else {
        console.warn('Received non-array dishes data:', dishes);
        setAvailableDishes([]);
      }
    } catch (error) {
      console.error('Error deleting dish:', {
        error,
        dishId,
        message: error.message,
        response: error.response?.data
      });
      
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || 'Ошибка при удалении блюда',
        severity: 'error'
      });
    }
  };

  // Функция открытия диалога редактирования приема пищи
  const handleOpenMealDialog = (day, mealType, meals) => {
    // Преобразуем существующие блюда в формат для диалога
    const formattedMeals = {};
    
    // Для каждой категории берем только первое блюдо
    Object.entries(meals).forEach(([category, dishes]) => {
      if (dishes && dishes.length > 0) {
        const dish = dishes[0]; // Берем только первое блюдо из категории
        formattedMeals[category] = {
          dish_id: dish.dish_id,
          menu_id: dish.menu_id,
          dish_name: dish.dish_name,
          weight: dish.weight,
          category: dish.category
        };
      }
    });

    setSelectedDayMeal({
      day,
      mealType,
      meals: formattedMeals
    });
    setEditingMealDialog(true);
  };

  // Функция сохранения изменений в приеме пищи
  const handleSaveMealChanges = async () => {
    try {
      if (!selectedDayMeal) return;

      const { day, mealType, meals } = selectedDayMeal;
      const dayNumber = dayToNumber[day];
      const weekNumber = selectedWeek === 'current' ? 1 : 2;

      // Для каждой категории
      for (const category in meals) {
        const meal = meals[category];
        
        // Если блюдо не выбрано, пропускаем
        if (!meal?.dish_id) continue;

        // Проверяем существующие блюда этой категории
        const existingMeals = menu
          .find(dayMenu => dayMenu.day === day)?.[mealType]
          ?.filter(m => m.category === category) || [];

        // Если есть существующие блюда
        if (existingMeals.length > 0) {
          // Обновляем первое блюдо и удаляем остальные
          for (let i = 0; i < existingMeals.length; i++) {
            if (i === 0 && meal.dish_id) {
              // Обновляем первое блюдо
              await menuApi.updateMenuItem(existingMeals[i].menu_id, {
                dish_id: meal.dish_id,
                meal_day: dayNumber,
                group_id: selectedGroup,
                week_number: weekNumber,
                meal_type: mealType
              });
            } else {
              // Удаляем лишние блюда
              await menuApi.deleteMenuItem(existingMeals[i].menu_id);
            }
          }
        } else if (meal.dish_id) {
          // Если блюд этой категории нет, создаем новое
          await menuApi.createMenuItem({
            dish_id: meal.dish_id,
            meal_day: dayNumber,
            group_id: selectedGroup,
            week_number: weekNumber,
            meal_type: mealType
          });
        }
      }

      setEditingMealDialog(false);
      await loadMenu();
      setSnackbar({
        open: true,
        message: 'Меню обновлено',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving meal changes:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при сохранении изменений',
        severity: 'error'
      });
    }
  };

  // Добавляем диалог редактирования приема пищи
  const renderMealEditDialog = () => {
    if (!selectedDayMeal) return null;

    const currentGroup = groups.find(g => g.group_id === selectedGroup);
    const isJuniorOrMiddleGroup = currentGroup?.name?.toLowerCase().includes('младшая') || 
                                 currentGroup?.name?.toLowerCase().includes('средняя');

    return (
      <Dialog
        open={editingMealDialog}
        onClose={() => setEditingMealDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{
          p: 2.5,
          background: 'linear-gradient(135deg, primary.lighter 0%, #fff 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <RestaurantIcon color="primary" sx={{ fontSize: '1.5rem' }} />
            <Box>
              <Typography color="primary" sx={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.2 }}>
                {selectedDayMeal.mealType}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {selectedDayMeal.day}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mealTypeCategories[selectedDayMeal.mealType].map((category) => {
              // Фильтруем доступные блюда для данной категории
              const availableDishesForCategory = availableDishes.filter(dish => {
                const baseMatch = Number(dish.group_id) === Number(selectedGroup) && 
                                dish.category === category;

                if (category === 'Второе блюдо') {
                  if (selectedDayMeal.mealType === 'Завтрак') {
                    return baseMatch && dish.meal_type === 'Завтрак';
                  } else if (selectedDayMeal.mealType === 'Второй завтрак') {
                    if (isJuniorOrMiddleGroup) return false;
                    return baseMatch && dish.meal_type === 'Второй завтрак';
                  } else if (['Обед', 'Ужин'].includes(selectedDayMeal.mealType)) {
                    return baseMatch && dish.meal_type === 'Обед';
                  }
                }
                return baseMatch;
              });

              // Если нет доступных блюд для категории, пропускаем её
              if (availableDishesForCategory.length === 0 && !selectedDayMeal.meals[category]) {
                return null;
              }

              return (
                <Box
                  key={category}
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: '#fff'
                    }
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      mb: 1.5,
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {category}
                  </Typography>

                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedDayMeal.meals[category]?.dish_id || ''}
                      onChange={(e) => {
                        const selectedDish = availableDishesForCategory.find(d => d.id === e.target.value);
                        setSelectedDayMeal(prev => ({
                          ...prev,
                          meals: {
                            ...prev.meals,
                            [category]: selectedDish ? {
                              dish_id: selectedDish.id,
                              menu_id: prev.meals[category]?.menu_id,
                              dish_name: selectedDish.name,
                              weight: selectedDish.default_weight || '0 г',
                              category: selectedDish.category
                            } : null
                          }
                        }));
                      }}
                      displayEmpty
                      sx={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'divider'
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main'
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>Выберите блюдо</em>
                      </MenuItem>
                      {availableDishesForCategory.map((dish) => (
                        <MenuItem 
                          key={dish.id} 
                          value={dish.id}
                          sx={{
                            borderRadius: '6px',
                            my: 0.5,
                            '&:hover': {
                              backgroundColor: 'primary.lighter'
                            }
                          }}
                        >
                          <Box sx={{ width: '100%' }}>
                            <Typography sx={{ 
                              fontWeight: 500,
                              color: 'text.primary',
                              mb: 0.5
                            }}>
                              {dish.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{
                                display: 'inline-block',
                                color: 'primary.main',
                                backgroundColor: 'primary.lighter',
                                px: 1,
                                py: 0.25,
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {formatWeight(dish.default_weight || dish.weight)}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedDayMeal.meals[category]?.menu_id && (
                    <Button
                      onClick={() => handleDeleteDishFromMenu(selectedDayMeal.meals[category].menu_id)}
                      color="error"
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteIcon sx={{ fontSize: '1rem' }} />}
                      sx={{ 
                        mt: 1.5,
                        borderRadius: '6px',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: 'error.lighter'
                        }
                      }}
                    >
                      Удалить блюдо
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 2.5,
          gap: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: '#f8fafc'
        }}>
          <Button 
            onClick={() => setEditingMealDialog(false)}
            variant="outlined"
            sx={{ 
              flex: 1,
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.lighter'
              }
            }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSaveMealChanges}
            variant="contained"
            sx={{ 
              flex: 1,
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                backgroundColor: 'primary.dark'
              }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Функция открытия диалога управления блюдами
  const handleOpenManageDishes = () => {
    setEditingMeal({
      name: '',
      weight: '',
      meal_type: '',
      category: '',
      group_id: selectedGroup
    });
    setEditingDishId(null);
    setManageDishesDialog(true);
  };

  // Функция закрытия диалога управления блюдами
  const handleCloseManageDishes = () => {
    setManageDishesDialog(false);
    setEditingDishId(null);
    setEditingMeal({
      name: '',
      weight: '',
      meal_type: '',
      category: '',
      group_id: ''
    });
  };

  // Функция редактирования существующего блюда
  const handleEditExistingDish = (dish) => {
    setEditingMeal({
      name: dish.name,
      weight: dish.weight,
      meal_type: dish.meal_type,
      category: dish.category,
      group_id: dish.group_id
    });
    setEditingDishId(dish.id);
  };

  // Функция сохранения блюда (нового или существующего)
  const handleSaveDish = async () => {
    try {
      console.log('Attempting to save dish:', {
        editingMeal,
        editingDishId,
        selectedGroup
      });

      // Проверяем обязательные поля
      const requiredFields = {
        name: editingMeal.name?.trim(),
        weight: editingMeal.weight?.trim(),
        meal_type: editingMeal.meal_type,
        category: editingMeal.category,
        group_id: selectedGroup
      };

      // Проверяем, что все поля заполнены
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => {
          const fieldNames = {
            name: 'название',
            weight: 'вес',
            meal_type: 'прием пищи',
            category: 'категория',
            group_id: 'группа'
          };
          return fieldNames[key];
        });

      if (missingFields.length > 0) {
        const errorMessage = `Пожалуйста, заполните следующие поля: ${missingFields.join(', ')}`;
        console.warn('Validation failed:', errorMessage);
        
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
        return;
      }

      // Форматируем вес: убираем 'г' и оставляем только число
      let formattedWeight = editingMeal.weight.trim();
      formattedWeight = formattedWeight.replace(/[^\d.]/g, ''); // Оставляем только цифры и точку

      const dishData = {
        name: editingMeal.name.trim(),
        weight: formattedWeight, // Изменено с default_weight на weight
        meal_type: editingMeal.meal_type,
        category: editingMeal.category,
        group_id: Number(selectedGroup),
        date: new Date().toISOString().split('T')[0] // Добавляем дату
      };

      console.log('Sending dish data to server:', dishData);

      let response;
      if (editingDishId) {
        // Обновляем существующее блюдо
        console.log('Updating existing dish:', editingDishId);
        response = await menuApi.updateDish(editingDishId, dishData);
      } else {
        // Создаем новое блюдо
        console.log('Creating new dish');
        response = await menuApi.createDish(dishData);
      }

      console.log('Server response:', response);

      if (!response || !response.data) {
        throw new Error('Сервер вернул пустой ответ');
      }

      setSnackbar({
        open: true,
        message: editingDishId ? 'Блюдо успешно обновлено' : 'Блюдо успешно добавлено',
        severity: 'success'
      });
      
      handleCloseManageDishes();
      await loadMenu();
    } catch (error) {
      console.error('Error saving dish:', {
        error,
        message: error.message,
        response: error.response?.data
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0] ||
                          error.message || 
                          'Ошибка при сохранении блюда';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // Диалог управления блюдами
  const renderManageDishesDialog = () => {
    return (
      <Dialog
        open={manageDishesDialog}
        onClose={handleCloseManageDishes}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            backgroundColor: '#FAFAFA'
          }
        }}
      >
        <DialogTitle sx={{
          p: 2,
          background: 'linear-gradient(45deg, #916BD8 0%, #9F7AE7 100%)',
          color: '#fff',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <RestaurantIcon sx={{ fontSize: '1.2rem' }} />
          {editingDishId ? 'Редактирование блюда' : 'Добавление блюда'}
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ mt: 2, mb: 3 }}>
            <Grid container spacing={2}>
              {/* Форма для создания/редактирования блюда */}
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Название блюда"
                    value={editingMeal.name || ''}
                    onChange={(e) => setEditingMeal({ ...editingMeal, name: e.target.value })}
                    size="small"
                    sx={{
                      backgroundColor: '#fff',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px'
                      }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Вес (например: 100 г)"
                    value={editingMeal.weight || ''}
                    onChange={(e) => setEditingMeal({ ...editingMeal, weight: e.target.value })}
                    size="small"
                    sx={{
                      backgroundColor: '#fff',
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px'
                      }
                    }}
                  />

                  <FormControl fullWidth size="small">
                    <InputLabel>Прием пищи</InputLabel>
                    <Select
                      value={editingMeal.meal_type || ''}
                      onChange={(e) => setEditingMeal({ ...editingMeal, meal_type: e.target.value })}
                      label="Прием пищи"
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '8px'
                      }}
                    >
                      {mealTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth size="small">
                    <InputLabel>Категория</InputLabel>
                    <Select
                      value={editingMeal.category || ''}
                      onChange={(e) => setEditingMeal({ ...editingMeal, category: e.target.value })}
                      label="Категория"
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: '8px'
                      }}
                    >
                      <MenuItem value="Первое блюдо">Первое блюдо</MenuItem>
                      <MenuItem value="Второе блюдо">Второе блюдо</MenuItem>
                      <MenuItem value="Третье блюдо">Третье блюдо</MenuItem>
                      <MenuItem value="Напиток">Напиток</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Список существующих блюд */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
                  Существующие блюда
                </Typography>
                <Box sx={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 1
                }}>
                  {availableDishes.map((dish) => (
                    <Box
                      key={dish.id}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        borderRadius: '8px',
                        backgroundColor: dish.id === editingDishId ? 'primary.lighter' : 'background.paper',
                        border: '1px solid',
                        borderColor: dish.id === editingDishId ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'primary.lighter',
                          borderColor: 'primary.main'
                        }
                      }}
                      onClick={() => handleEditExistingDish(dish)}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <Box onClick={() => handleEditExistingDish(dish)} sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {dish.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {dish.category}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              •
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {dish.meal_type}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              •
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                              {formatWeight(dish.default_weight || dish.weight)}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDish(dish.id);
                          }}
                          sx={{
                            ml: 1,
                            '&:hover': {
                              backgroundColor: 'error.lighter'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{
          p: 2,
          backgroundColor: '#fff',
          borderTop: '1px solid rgba(145, 107, 216, 0.1)',
          gap: 1
        }}>
          <Button
            onClick={handleCloseManageDishes}
            variant="outlined"
            sx={{
              flex: 1,
              color: '#916BD8',
              borderColor: 'rgba(145, 107, 216, 0.2)',
              '&:hover': {
                borderColor: '#916BD8',
                backgroundColor: 'rgba(145, 107, 216, 0.08)'
              }
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSaveDish}
            variant="contained"
            sx={{
              flex: 1,
              backgroundColor: '#916BD8',
              '&:hover': {
                backgroundColor: '#7B5AB9'
              }
            }}
          >
            {editingDishId ? 'Сохранить изменения' : 'Добавить блюдо'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <PageTitle>Меню</PageTitle>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        mb: 3,
        mt: 2
      }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Неделя</InputLabel>
            <Select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              label="Неделя"
              sx={{ 
                height: '40px',
                borderRadius: '8px'
              }}
            >
              <MenuItem value="current">Текущая неделя</MenuItem>
              <MenuItem value="next">Следующая неделя</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="group-select-label">Группа</InputLabel>
            <Select
              labelId="group-select-label"
              id="group-select"
              value={selectedGroup || ''}
              onChange={handleGroupChange}
              label="Группа"
              sx={{ 
                height: '40px',
                borderRadius: '8px'
              }}
            >
              {groups.map((group) => (
                <MenuItem key={group.group_id} value={group.group_id}>
                  {group.group_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {user?.role === 'admin' && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleClearWeekMenu}
              sx={{
                height: '40px',
                minWidth: '200px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                textTransform: 'none'
              }}
            >
              Очистить меню недели
            </Button>
          )}
          {(user.role === 'admin' || user.role === 'teacher') && (
            <Button
              variant="contained"
              startIcon={<RestaurantIcon />}
              onClick={handleOpenManageDishes}
              sx={{
                height: '40px',
                minWidth: '200px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                padding: '8px 16px',
                backgroundColor: 'primary.main',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }
              }}
            >
              Управление блюдами
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="Дни недели"
        >
          {daysOfWeek.map((day, index) => (
            <Tab key={day} label={day} />
          ))}
        </Tabs>
      </Paper>

      {menu.map((dayMenu, index) => (
        <Box
          key={dayMenu.day}
          sx={{
            display: selectedTab === index ? 'block' : 'none'
          }}
        >
          <Grid container spacing={2}>
            {mealTypes.map((mealType) => (
              <Grid item xs={12} md={6} lg={4} key={`meal-${mealType}`}>
                <Box sx={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.02)', 
                  borderRadius: '8px',
                  p: 1.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
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
                  </Box>
                  
                  <Box sx={{ 
                    mt: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {renderDishes(dayMenu, mealType)}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {renderManageDishesDialog()}
      {renderMealDialog()}
      {renderMealEditDialog()}

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

export default Menu; 