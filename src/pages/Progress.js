import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Rating,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Fade,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon,
  Print as PrintIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { styled } from '@mui/material/styles';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChildSelector from '../components/ChildSelector';
import IndividualProgress from '../components/IndividualProgress';
import GroupProgress from '../components/GroupProgress';
import { api, progressApi, groupsApi, childrenApi } from '../api/api';
import { message } from 'antd';
import { Chart } from 'chart.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '24px',
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
  }
}));

const StyledRating = styled(Rating)(({ theme }) => ({
  '& .MuiRating-iconFilled': {
    color: '#6366F1',
  },
  '& .MuiRating-iconHover': {
    color: '#4F46E5',
  },
}));

const getQuarterFromDate = (dateString) => {
  if (!dateString) {
    console.warn('Дата не указана, используется текущая дата');
    return { quarter: 'q1' };
  }
  
  try {
    const cleanDateString = dateString.split('T')[0];
    const date = new Date(cleanDateString);
    
    if (isNaN(date.getTime())) {
      console.warn('Некорректный формат даты:', dateString);
      return { quarter: 'q1' };
    }
    
    const month = date.getMonth() + 1; // 1-12
    
    // Определяем квартал на основе месяца
    let quarter;
    if (month === 1) {
      quarter = 'q1';  // Январь
    } else if (month === 4) {
      quarter = 'q2';  // Апрель
    } else if (month === 7) {
      quarter = 'q3';  // Июль
    } else if (month === 10) {
      quarter = 'q4';  // Октябрь
    } else {
      // Для других месяцев определяем квартал по диапазону
      if (month <= 3) quarter = 'q1';
      else if (month <= 6) quarter = 'q2';
      else if (month <= 9) quarter = 'q3';
      else quarter = 'q4';
    }
    
    return { quarter };
  } catch (err) {
    console.error('Ошибка при определении квартала:', err, 'для даты:', dateString);
    return { quarter: 'q1' };
  }
};

// Функция для получения стандартной даты квартала
const getStandardQuarterDate = (year, quarter) => {
  switch(quarter) {
    case 'q1': return `${year}-01-01`;
    case 'q2': return `${year}-04-01`;
    case 'q3': return `${year}-07-01`;
    case 'q4': return `${year}-10-01`;
    default: return `${year}-01-01`;
  }
};

const developmentParams = [
  { id: 'active_speech', name: 'Активная речь', type: 'rating', max: 10, color: '#6366F1' },
  { id: 'games', name: 'Игровая деятельность', type: 'rating', max: 10, color: '#8B5CF6' },
  { id: 'art_activity', name: 'Художественная деятельность', type: 'rating', max: 10, color: '#EC4899' },
  { id: 'constructive_activity', name: 'Конструктивная деятельность', type: 'rating', max: 10, color: '#F59E0B' },
  { id: 'sensory_development', name: 'Сенсорное развитие', type: 'rating', max: 10, color: '#10B981' },
  { id: 'movement_skills', name: 'Двигательные навыки', type: 'rating', max: 10, color: '#3B82F6' },
  { id: 'height_cm', name: 'Рост (см)', type: 'number', max: 200, step: 1, color: '#6B7280' },
  { id: 'weight_kg', name: 'Вес (кг)', type: 'number', max: 100, step: 0.1, color: '#6B7280' }
];

const quarters = [
  { id: '', name: 'Выберите квартал' },
  { id: 'q1', name: '1 квартал (Янв-Март)' },
  { id: 'q2', name: '2 квартал (Апр-Июнь)' },
  { id: 'q3', name: '3 квартал (Июль-Сент)' },
  { id: 'q4', name: '4 квартал (Окт-Дек)' }
];

const Progress = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [children, setChildren] = useState([]);
  const [childrenProgress, setChildrenProgress] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [progress, setProgress] = useState([]);
  const [editingReport, setEditingReport] = useState(null);
  const [activeView, setActiveView] = useState(0);
  const [selectedYears, setSelectedYears] = useState([new Date().getFullYear().toString()]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [allGroupsProgress, setAllGroupsProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const canEdit = ['admin', 'psychologist'].includes(user?.role);

  const availableYears = ['2023', '2024', '2025'];

  // Удаляем все дублирующиеся объявления getAllGroupsAverages и оставляем только одно
  const getAllGroupsAverages = (selectedYear, selectedQuarter) => {
    if (!selectedYear || !selectedQuarter) return null;

    const groupSums = {};
    const groupCounts = {};
    
    developmentParams.forEach(param => {
      groupSums[param.id] = 0;
      groupCounts[param.id] = 0;
    });

    // Получаем средние значения для каждой группы
    groups.forEach(group => {
      const groupAverages = getGroupAverages(group.group_id, selectedYear, selectedQuarter);
      if (groupAverages) {
        developmentParams.forEach(param => {
          const value = groupAverages[param.id];
          if (typeof value === 'number' && !isNaN(value) && value > 0) {
            groupSums[param.id] += value;
            groupCounts[param.id]++;
          }
        });
      }
    });

    // Вычисляем общие средние значения
    const totalAverages = {};
    developmentParams.forEach(param => {
      if (groupCounts[param.id] > 0) {
        totalAverages[param.id] = parseFloat((groupSums[param.id] / groupCounts[param.id]).toFixed(1));
      } else {
        totalAverages[param.id] = 0;
      }
    });

    return totalAverages;
  };

  // Обработчик изменения группы
  const handleGroupChange = (event) => {
    const newGroupId = event.target.value;
    
    // Проверяем, что выбрана новая группа
    if (newGroupId !== selectedGroup) {
      // Очищаем список детей перед загрузкой новых
      setChildren([]);
      
      // Сбрасываем выбранного ребенка при смене группы
      if (selectedChild) {
        setSelectedChild(null);
      }
      
      // Устанавливаем новую группу
      setSelectedGroup(newGroupId);
      
      // Явно запускаем загрузку детей для новой группы
      if (newGroupId) {
        loadChildrenForGroup(newGroupId);
      }
    } else {
      // Перезагружаем данные для текущей группы
      loadChildrenForGroup(newGroupId);
    }
  };
  
  // Обработчик прямого выбора группы
  const handleDirectGroupSelect = (groupId) => {
    // Очищаем список детей перед загрузкой новых
    setChildren([]);
    
    // Если уже выбрана эта группа, пробуем обновить данные
    if (selectedGroup === groupId.toString()) {
      loadChildrenForGroup(groupId.toString());
      return;
    }
    
    // Сбрасываем выбранного ребенка при смене группы
    if (selectedChild) {
      setSelectedChild(null);
    }
    
    // Устанавливаем новую выбранную группу
    setSelectedGroup(groupId.toString());
    
    // Явно запускаем загрузку детей для этой группы
    loadChildrenForGroup(groupId.toString());
  };

  // Используем useMemo для мемоизации результатов фильтрации
  const filteredChildren = useMemo(() => {
    console.log('Фильтрация детей, выбранная группа:', selectedGroup);
    console.log('Общее количество детей:', children.length);
    
    // Фильтр для родителя
    if (user?.role === 'parent') {
      const filtered = children.filter(child => child.parent_id === user.user_id);
      console.log('Фильтр по родителю, найдено детей:', filtered.length);
      return filtered;
    }
    
    // Фильтр для группы
    if (selectedGroup) {
      const selectedGroupId = parseInt(selectedGroup);
      console.log('Выбранная группа ID (int):', selectedGroupId);
      
      // Проверяем, что children - массив
      if (!Array.isArray(children)) {
        console.warn('children не является массивом:', typeof children);
        return [];
      }
      
      // Логика фильтрации по группе с более детальной проверкой
      const filtered = children.filter(child => {
        if (!child) return false;
        
        // Проверка разных вариантов хранения ID группы
        const childGroupId = child.original_group_id 
          ? parseInt(child.original_group_id) 
          : child.group_id 
            ? parseInt(child.group_id) 
            : child.groupId 
              ? parseInt(child.groupId)
              : null;
        
        console.log(`Ребенок ${child.name}, ID группы: ${childGroupId}, совпадение: ${childGroupId === selectedGroupId}`);
        
        // Разрешаем отображение, если группы совпадают
        return childGroupId === selectedGroupId;
      });
      
      console.log('Отфильтровано по группе, найдено детей:', filtered.length);
      if (filtered.length === 0) {
        console.warn('Не найдено детей для группы:', selectedGroupId);
        console.log('Доступные ID групп:', 
          [...new Set(children.map(c => c?.original_group_id || c?.group_id || c?.groupId).filter(Boolean))]);
      }
      
      return filtered;
    }
    
    // Если не выбрана группа, возвращаем всех детей
    return children;
  }, [children, selectedGroup, user]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        
        // Проверяем доступность API
        const apiMethods = Object.keys(api || {});
        const groupApiMethods = Object.keys(groupsApi || {});
        
        let groupsData;
        let apiUsed = '';
        
        // Пробуем получить данные о группах
        try {
          if (groupsApi && groupsApi.getGroups) {
            groupsData = await groupsApi.getGroups();
            apiUsed = 'groupsApi.getGroups';
          } else {
            throw new Error('API для получения групп не найдено');
          }
        } catch (err) {
          console.error('Ошибка при вызове API групп:', err);
          throw err; // Пробрасываем ошибку дальше
        }

        // Проверка корректности структуры данных
        if (!groupsData) {
          throw new Error('Не получены данные о группах');
        }
        
        // Нормализация данных о группах
        let normalizedGroups = [];
        
        if (Array.isArray(groupsData)) {
          // Если получен массив групп
          normalizedGroups = groupsData.map(group => {
            // Проверяем наличие необходимых полей
            if (!group) return null;
            
            const groupId = group.group_id || group.id || group._id;
            if (!groupId) {
              console.warn('Группа без ID:', group);
              return null;
            }
            
            const groupName = group.name || group.group_name || group.title || 'Группа без названия';
            
            return {
              group_id: groupId,
              name: groupName
            };
          }).filter(Boolean); // Удаляем null элементы
        } else if (typeof groupsData === 'object') {
          // Если получен объект с группами
          normalizedGroups = Object.values(groupsData)
            .filter(Boolean)
            .map(group => {
              if (!group) return null;
              
              const groupId = group.group_id || group.id || group._id;
              if (!groupId) {
                console.warn('Группа без ID:', group);
                return null;
              }
              
              const groupName = group.name || group.group_name || group.title || 'Группа без названия';
              
              return {
                group_id: groupId,
                name: groupName
              };
            }).filter(Boolean); // Удаляем null элементы
        } else {
          throw new Error('Некорректный формат данных для групп: ' + typeof groupsData);
        }

        if (normalizedGroups.length === 0) {
          throw new Error('Не найдено ни одной валидной группы');
        }

        setGroups(normalizedGroups);
      } catch (err) {
        console.error('Ошибка при загрузке групп:', err);
        setError(err.message || 'Ошибка при загрузке групп');
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Выделим загрузку детей в отдельную функцию, которую можно вызывать повторно
  const loadChildrenForGroup = useCallback(async (groupId) => {
    if (!groupId) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let childrenData = [];
      
      try {
        const response = await axios.get(`${API_URL}/children`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            group_id: groupId
          }
        });
        childrenData = response.data;
      } catch (err) {
        console.error('Ошибка при получении детей через API:', err);
        throw err;
      }
      
      // Проверка данных
      if (!Array.isArray(childrenData)) {
        console.warn('Полученные данные не являются массивом, преобразуем:', typeof childrenData);
        if (typeof childrenData === 'object') {
          childrenData = Object.values(childrenData).filter(Boolean);
        } else {
          throw new Error(`Некорректные данные о детях: ${typeof childrenData}`);
        }
      }
      
      // Нормализация данных детей
      const selectedGroupId = parseInt(groupId);
      
      const normalizedChildren = childrenData.map(child => {
          if (!child) return null;
          
          const childId = child.child_id || child.id || child._id;
          if (!childId) {
            console.warn('Ребенок без ID:', child);
            return null;
          }
          
          // Формируем имя
          let fullName = '';
          if (child.name && child.surname) {
            fullName = `${child.surname} ${child.name}`;
            if (child.patronymic) fullName += ` ${child.patronymic}`;
          } else if (child.fullName) {
            fullName = child.fullName;
          } else if (child.firstname && child.lastname) {
            fullName = `${child.lastname} ${child.firstname}`;
          } else {
            fullName = child.name || `Ребенок #${childId || 'без ID'}`;
          }
          
          // Определяем правильный ID группы
          const childGroupId = child.group_id || child.groupId;
          
          return {
            child_id: childId,
            name: fullName,
            // Записываем оригинальный ID группы
            original_group_id: childGroupId,
            // Если у ребенка нет группы в данных API, устанавливаем выбранную группу
            group_id: childGroupId || selectedGroupId,
            ...Object.entries(child)
              .filter(([key]) => !['child_id', 'id', '_id', 'group_id', 'groupId', 'name', 'surname', 'patronymic', 'fullName'].includes(key))
              .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
              }, {})
          };
      }).filter(Boolean); // Удаляем null значения
      
      // Устанавливаем состояние
      setChildren(normalizedChildren);
      
      return normalizedChildren;
    } catch (err) {
      console.error('Ошибка при загрузке детей:', err);
      setError(`Ошибка при загрузке детей: ${err.message}`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Вспомогательная функция для очистки данных
  const clearChildrenData = useCallback(() => {
    setChildren([]);
    setSelectedChild(null);
    setChildrenProgress({});
  }, []);
  
  // Используем функцию loadChildrenForGroup в useEffect и при выборе группы
  useEffect(() => {
    if (selectedGroup) {
      clearChildrenData();
      loadChildrenForGroup(selectedGroup).then(async (loadedChildren) => {
        if (loadedChildren && loadedChildren.length > 0) {
          // Загружаем прогресс для всех детей группы
          for (const child of loadedChildren) {
            await fetchChildProgress(child.child_id);
          }
        }
      });
    }
  }, [selectedGroup, loadChildrenForGroup, clearChildrenData]);
  
  const fetchChildProgress = async (childId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!childId) {
        throw new Error('ID ребенка не указан');
      }
      
      const response = await axios.get(`${API_URL}/progress/child/${childId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        throw new Error('Нет данных в ответе');
      }

      let reports = [];
      if (Array.isArray(response.data)) {
        reports = response.data;
      } else if (response.data.progress && Array.isArray(response.data.progress)) {
        reports = response.data.progress;
      } else if (response.data.reports && Array.isArray(response.data.reports)) {
        reports = response.data.reports;
      }

      if (reports.length === 0) {
        setProgress({});
        setChildrenProgress(prev => ({
          ...prev,
          [childId]: {}
        }));
        setLoading(false);
        return;
      }

      // Группируем прогресс по годам и кварталам
      const progressByYearAndQuarter = {};

      reports.forEach(report => {
        if (!report.report_date) return;
        
        const reportDate = new Date(report.report_date);
        if (isNaN(reportDate.getTime())) {
          console.warn('Некорректная дата:', report.report_date);
          return;
        }
        
        const year = reportDate.getFullYear().toString();
        const month = reportDate.getMonth() + 1; // 1-12

        // Определяем квартал по месяцу точно как в БД
        let quarter;
        if (month === 1) quarter = 'q1';
        else if (month === 4) quarter = 'q2';
        else if (month === 7) quarter = 'q3';
        else if (month === 10) quarter = 'q4';
        else return; // Пропускаем записи с другими месяцами

        if (!progressByYearAndQuarter[year]) {
          progressByYearAndQuarter[year] = {};
        }

        // Сохраняем отчет
        const normalizedReport = {
          report_id: report.report_id,
          report_date: report.report_date,
          notes: report.notes || '',
          details: report.details || '',
          year: parseInt(year)
        };
        
        developmentParams.forEach(param => {
          const value = parseFloat(report[param.id]);
          normalizedReport[param.id] = isNaN(value) ? 0 : value;
        });
        
        progressByYearAndQuarter[year][quarter] = normalizedReport;
      });

      console.log('Обработанный прогресс:', progressByYearAndQuarter);

      setProgress(progressByYearAndQuarter);
      setChildrenProgress(prev => ({
        ...prev,
        [childId]: progressByYearAndQuarter
      }));

    } catch (error) {
      console.error('Ошибка при загрузке прогресса:', error);
      setError(error.message || 'Не удалось загрузить данные прогресса');
      setProgress({});
      setChildrenProgress(prev => ({
        ...prev,
        [childId]: {}
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = async (child) => {
    try {
      if (!child || !child.child_id) {
        throw new Error('Некорректные данные ребенка');
      }
      
      // Устанавливаем выбранного ребенка
      setSelectedChild(child);
      
      // Загружаем прогресс ребенка, если его еще нет в состоянии
      if (!childrenProgress[child.child_id]) {
        await fetchChildProgress(child.child_id);
      }
    } catch (err) {
      console.error('Error selecting child:', err);
      setError(err.message || 'Ошибка при выборе ребенка');
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при выборе ребенка',
        severity: 'error'
      });
    }
  };

  const handleSaveProgress = async (childId, progressData) => {
    if (!childId || !progressData) {
      setMessage({ text: 'Не указан ID ребенка или данные прогресса', type: 'error' });
      setSnackbarOpen(true);
      return;
    }

    try {
      // Проверяем обязательные поля
      const requiredFields = ['report_date', 'details'];
      const missingFields = requiredFields.filter(field => !progressData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
      }

      // Форматирование даты
      let formattedDate = progressData.report_date;
      if (formattedDate instanceof Date) {
        const year = formattedDate.getFullYear();
        const month = String(formattedDate.getMonth() + 1).padStart(2, '0');
        const day = String(formattedDate.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      } else if (typeof formattedDate === 'string') {
        // Если это строка в формате ISO или с временной зоной
        if (formattedDate.includes('T') || formattedDate.includes('Z')) {
          const date = new Date(formattedDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else if (!formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new Error('Неверный формат даты. Требуется формат YYYY-MM-DD');
        }
      } else {
        throw new Error('Неверный тип данных для даты');
      }

      // Подготовка данных для отправки
      const validatedData = {
        child_id: parseInt(childId),
        report_date: formattedDate,
        details: progressData.details?.trim() || ''
      };

      // Валидация числовых полей
      const ratingFields = [
        'active_speech',
        'games',
        'art_activity',
        'constructive_activity',
        'sensory_development',
        'movement_skills',
        'naming_skills'
      ];

      ratingFields.forEach(field => {
        if (progressData[field] !== undefined && progressData[field] !== null && progressData[field] !== '') {
          const value = parseInt(progressData[field]);
          if (!isNaN(value) && value >= 1 && value <= 10) {
            validatedData[field] = value;
          }
        }
      });

      // Валидация физических параметров
      ['height_cm', 'weight_kg'].forEach(field => {
        if (progressData[field] !== undefined && progressData[field] !== null && progressData[field] !== '') {
          const value = parseInt(progressData[field]);
          if (!isNaN(value) && value > 0) {
            validatedData[field] = value;
          }
        }
      });

      // Добавляем report_id только если он существует
      if (progressData.report_id) {
        validatedData.report_id = parseInt(progressData.report_id);
      }

      console.log('Подготовленные данные для сохранения:', validatedData);

      try {
        let response;
        if (validatedData.report_id) {
          response = await progressApi.updateProgress(validatedData.report_id, validatedData);
        } else {
          response = await progressApi.createProgress(validatedData);
        }

        console.log('Ответ сервера:', response);
        setMessage({ text: 'Прогресс успешно сохранен', type: 'success' });
        setSnackbarOpen(true);
        await fetchChildProgress(childId);
        setOpenDialog(false);
      } catch (error) {
        console.error('Ошибка при сохранении:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Ошибка при сохранении прогресса';
        setMessage({ text: errorMessage, type: 'error' });
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      setMessage({ text: error.message, type: 'error' });
      setSnackbarOpen(true);
    }
  };

  const handleEdit = (report) => {
    // Форматируем дату в YYYY-MM-DD при открытии формы редактирования
    const formattedReport = {
      report_id: report.report_id,
      report_date: report.report_date ? new Date(report.report_date).toISOString().split('T')[0] : '',
      details: report.details || '',
      active_speech: report.active_speech !== undefined ? Number(report.active_speech) : null,
      games: report.games !== undefined ? Number(report.games) : null,
      art_activity: report.art_activity !== undefined ? Number(report.art_activity) : null,
      constructive_activity: report.constructive_activity !== undefined ? Number(report.constructive_activity) : null,
      sensory_development: report.sensory_development !== undefined ? Number(report.sensory_development) : null,
      movement_skills: report.movement_skills !== undefined ? Number(report.movement_skills) : null,
      height_cm: report.height_cm !== undefined ? Number(report.height_cm) : null,
      weight_kg: report.weight_kg !== undefined ? Number(report.weight_kg) : null
    };

    setProgressData(formattedReport);
    setOpenDialog(true);
  };

  const renderChildProgress = (selectedChild, progressData) => {
    if (!selectedChild) {
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Выберите ребенка для просмотра прогресса
            </Typography>
          </CardContent>
        </StyledCard>
      );
    }

    if (!selectedQuarter) {
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Выберите квартал для просмотра прогресса
            </Typography>
          </CardContent>
        </StyledCard>
      );
    }

    if (!selectedYears || selectedYears.length === 0) {
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Выберите год для просмотра прогресса
            </Typography>
          </CardContent>
        </StyledCard>
      );
    }

    // Получаем данные для выбранного года и квартала
    const selectedYearData = progressData[selectedYears[0]];
    const selectedQuarterData = selectedYearData?.[selectedQuarter];

    if (!selectedQuarterData) {
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Нет данных о прогрессе за {quarters.find(q => q.id === selectedQuarter)?.name} {selectedYears[0]} года для {selectedChild.name}
            </Typography>
          </CardContent>
        </StyledCard>
      );
    }

    // Найдём оригинальный объект отчёта из всех отчетов ребёнка (если есть)
    let originalReport = selectedQuarterData;
    if (childrenProgress && selectedChild && childrenProgress[selectedChild.child_id]) {
      const allReports = Object.values(childrenProgress[selectedChild.child_id])
        .flatMap(yearObj => Object.values(yearObj));
      const found = allReports.find(r => r.report_id === selectedQuarterData.report_id);
      if (found) originalReport = found;
    }

    return (
      <Box>
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Прогресс за {quarters.find(q => q.id === selectedQuarter)?.name} {selectedYears[0]}
              </Typography>
              {canEdit && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setProgressData(originalReport);
                    setOpenDialog(true);
                  }}
                >
                  Редактировать
                </Button>
              )}
            </Box>
            {/* Показатели развития */}
            <Box sx={{ mb: 4 }}>
              {developmentParams.map(param => {
                const value = selectedQuarterData[param.id] || 0;
                return (
                  <Box key={param.id} sx={{ mb: 2.5 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      mb: 1,
                      flexWrap: 'wrap',
                      gap: 1
                    }}>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 500,
                          maxWidth: 'calc(100% - 80px)'
                        }}
                      >
                        {param.name}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ 
                        fontWeight: 500,
                        minWidth: '70px',
                        textAlign: 'right'
                      }}>
                        {value} {param.type === 'rating' ? 'из 10' : param.id === 'height_cm' ? 'см' : 'кг'}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={param.type === 'rating' ? value * 10 : (value / param.max) * 100} 
                      sx={{ 
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: alpha(param.color || '#6366F1', 0.1),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: param.color || '#6366F1',
                          borderRadius: 6
                        }
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
            {/* График и дополнительная информация оставляем без изменений */}
            <Box sx={{ minHeight: 450, mt: 6, mb: 4, '& canvas': { maxWidth: '100%' } }}>
              {renderProgressChart(progressData)}
            </Box>
            {selectedQuarterData.details && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                  Дополнительная информация:
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  {selectedQuarterData.details}
                </Typography>
              </Box>
            )}
          </CardContent>
        </StyledCard>
      </Box>
    );
  };

  const renderProgressChart = (data) => {
    if (!data) return null;

    // Используем только выбранный год (первый из selectedYears)
    const selectedYear = selectedYears[0];
    const yearData = data[selectedYear];
    
    if (!yearData) return null;

    // Определяем порядок кварталов
    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    
    // Получаем только существующие кварталы и сортируем их в правильном порядке
    const existingQuarters = Object.entries(yearData)
      .filter(([quarter, data]) => data !== null && quarterOrder.includes(quarter))
      .sort((a, b) => quarterOrder.indexOf(a[0]) - quarterOrder.indexOf(b[0]))
      .map(([quarter]) => quarter);

    console.log('Отладка порядка кварталов:', {
      yearData,
      existingQuarters,
      rawData: Object.entries(yearData)
    });

    // Формируем метки для кварталов в правильном порядке
    const labels = existingQuarters.map(q => {
      const quarterLabels = {
        q1: '1 кв. (Янв-Март)',
        q2: '2 кв. (Апр-Июнь)',
        q3: '3 кв. (Июль-Сент)',
        q4: '4 кв. (Окт-Дек)'
      };
      return quarterLabels[q] || '';
    });
    
    // Разделяем параметры на развитие и физические показатели
    const developmentDatasets = developmentParams
      .filter(param => param.type === 'rating')
      .map(param => ({
        label: param.name,
        data: existingQuarters.map(q => yearData[q]?.[param.id] || null),
        borderColor: param.color || '#6366F1',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'white',
        pointBorderColor: param.color || '#6366F1',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: 'y'
      }));

    const physicalDatasets = developmentParams
      .filter(param => param.type === 'number')
      .map(param => ({
        label: param.name,
        data: existingQuarters.map(q => yearData[q]?.[param.id] || null),
        borderColor: param.color || '#14B8A6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'white',
        pointBorderColor: param.color || '#14B8A6',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: param.id === 'height_cm' ? 'y2' : 'y3'
      }));

    const developmentChartData = {
      labels,
      datasets: developmentDatasets
    };

    const physicalChartData = {
      labels,
      datasets: physicalDatasets
    };

    const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 500
            },
            boxWidth: 24,
            boxHeight: 24,
            generateLabels: (chart) => {
              const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return labels.map(label => ({
                ...label,
                text: label.text.length > 25 ? label.text.substring(0, 25) + '...' : label.text
              }));
            }
          },
          margins: {
            bottom: 50
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1E293B',
        bodyColor: '#1E293B',
        bodyFont: {
          size: 12
        },
        titleFont: {
            size: 14,
          weight: 'bold'
        },
        padding: 12,
        boxPadding: 8,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const label = context.dataset.label;
              const param = developmentParams.find(p => p.name === label);
              if (param.type === 'number') {
                return `${label}: ${value} ${param.id === 'height_cm' ? 'см' : 'кг'}`;
              }
              return `${label}: ${value} баллов`;
          }
        }
      }
    },
    scales: {
        x: {
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
          },
          ticks: {
            font: {
              size: 16,
              weight: 500
            }
          }
        }
      }
    };

    const developmentOptions = {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Показатели развития',
          font: {
            size: 16,
            weight: 600
          },
          padding: 20
        }
      },
      scales: {
        ...commonOptions.scales,
      y: {
        beginAtZero: true,
        max: 10,
          position: 'left',
          title: {
            display: true,
            text: 'Баллы',
            font: {
              size: 14,
              weight: 500
            }
          },
        ticks: {
          stepSize: 1,
          font: {
              size: 14
            },
            callback: (value) => `${value} б.`
          }
        }
      }
    };

    const physicalOptions = {
      ...commonOptions,
      plugins: {
        ...commonOptions.plugins,
        title: {
          display: true,
          text: 'Физические показатели',
          font: {
            size: 16,
            weight: 600
          },
          padding: 20
        }
      },
      scales: {
        ...commonOptions.scales,
        y2: {
          beginAtZero: true,
          position: 'left',
          min: 0,
          max: 200,
          title: {
            display: true,
            text: 'см',
            font: {
              size: 14,
              weight: 500
            }
        },
        ticks: {
            stepSize: 20,
          font: {
              size: 14
            }
          }
        },
        y3: {
          beginAtZero: true,
          position: 'right',
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'кг',
            font: {
              size: 14,
            weight: 500
          }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            stepSize: 10,
            font: {
              size: 14
            }
          }
        }
      }
    };

    return (
      <Box>
        <Box sx={{ height: 400, mb: 4 }}>
          <Line data={developmentChartData} options={developmentOptions} />
        </Box>
        <Box sx={{ height: 400 }}>
          <Line data={physicalChartData} options={physicalOptions} />
        </Box>
      </Box>
    );
  };

  const handleViewChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleQuarterChange = (event) => {
    setSelectedQuarter(event.target.value);
  };

  const getGroupAverages = (groupId, selectedYear, selectedQuarter) => {
    if (!groupId || !selectedYear || !selectedQuarter) return null;

    // Фильтруем детей по группе
    const groupChildren = children.filter(child => {
      const childGroupId = child.original_group_id 
        ? parseInt(child.original_group_id) 
        : parseInt(child.group_id);
      return childGroupId === parseInt(groupId);
    });

    if (!groupChildren.length) return null;

    // Инициализируем объекты для подсчета сумм и количества значений
    const sums = {};
    const counts = {};
    developmentParams.forEach(param => {
      sums[param.id] = 0;
      counts[param.id] = 0;
    });

    // Для каждого ребенка в группе
    groupChildren.forEach(child => {
      // Получаем данные о прогрессе ребенка
      const childProgress = childrenProgress[child.child_id];
      if (childProgress && childProgress[selectedYear] && childProgress[selectedYear][selectedQuarter]) {
        const quarterData = childProgress[selectedYear][selectedQuarter];
        
        // Суммируем значения по каждому параметру
        developmentParams.forEach(param => {
          const value = parseFloat(quarterData[param.id]);
          if (!isNaN(value) && value !== null && value !== undefined) {
            sums[param.id] += value;
            counts[param.id]++;
          }
        });
      }
    });

    // Вычисляем средние значения
    const averages = {};
    developmentParams.forEach(param => {
      if (counts[param.id] > 0) {
        averages[param.id] = parseFloat((sums[param.id] / counts[param.id]).toFixed(1));
      } else {
        averages[param.id] = 0;
      }
    });

    return averages;
  };

  const renderParentContent = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Мои дети
          </Typography>
          {renderChildList(children)}
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        {selectedChild && childrenProgress[selectedChild.child_id] && renderChildProgress(selectedChild, childrenProgress[selectedChild.child_id])}
      </Grid>
    </Grid>
  );

  const renderTeacherContent = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Дети в группе
          </Typography>
          {renderChildList(children)}
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        {selectedChild && childrenProgress[selectedChild.child_id] && renderChildProgress(selectedChild, childrenProgress[selectedChild.child_id])}
      </Grid>
    </Grid>
  );

  const renderAdminContent = () => (
    <Box>
      <Box sx={{ 
        mb: 4, 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        background: 'white',
      }}>
        <Tabs
          value={selectedTab}
          onChange={handleViewChange}
          aria-label="progress view tabs"
          sx={{
            '.MuiTabs-indicator': {
              height: 3,
              borderRadius: 1.5,
            },
            '.MuiTab-root': {
              minWidth: 120,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              '&.Mui-selected': {
                color: 'primary.main'
              }
            }
          }}
        >
          <Tab 
            icon={<GroupIcon />} 
            label="Группы" 
            iconPosition="start"
          />
          <Tab 
            icon={<TimelineIcon />} 
            label="Общая статистика" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="admin-quarter-select-label">Квартал</InputLabel>
            <Select
              labelId="admin-quarter-select-label"
              value={selectedQuarter}
              onChange={handleQuarterChange}
              label="Квартал"
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center'
                }
              }}
            >
              {renderQuarterItems()}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="year-select-label">Год</InputLabel>
            <Select
              labelId="year-select-label"
              multiple
              value={selectedYears}
              onChange={handleYearChange}
              label="Год"
              renderValue={(selected) => selected.join(', ')}
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 0.5
                }
              }}
            >
              {availableYears.map((year) => (
                <MenuItem key={year} value={year}>
                  <Checkbox checked={selectedYears.includes(year)} />
                  <ListItemText primary={year} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {selectedTab < 1 && (
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="admin-group-select-label">Группа</InputLabel>
              <Select
                labelId="admin-group-select-label"
                value={selectedGroup}
                onChange={handleGroupChange}
                label="Группа"
                displayEmpty
                sx={{
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center'
                  }
                }}
              >
                {renderGroupItems()}
              </Select>
            </FormControl>
          </Grid>
        )}
      </Grid>

      {selectedTab === 0 && (
        selectedGroup ? (
          <>
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} md={5} lg={4}>
                <StyledCard sx={{ height: '100%', mb: 3 }}>
                  <CardContent>
                    <ChildSelector
                      children={filteredChildren}
                      onChildSelect={(child) => {
                        handleChildSelect(child);
                        fetchChildProgress(child.child_id);
                      }}
                      selectedChild={selectedChild}
                    />
                  </CardContent>
                </StyledCard>
              </Grid>
              <Grid item xs={12} md={7} lg={8}>
                <StyledCard sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                      <Box>
                        <Button 
                          variant="outlined"
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => {/* TODO: Добавить экспорт */}}
                        >
                          Экспорт
                        </Button>
                      </Box>
                    </Box>
                    
                    {selectedChild ? (
                      <>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            mb: 3
                          }}
                        >
                          Прогресс: {selectedChild.name}
                        </Typography>
                        {renderChildProgress(selectedChild, childrenProgress[selectedChild.child_id])}
                      </>
                    ) : (
                      <>
                        <Box sx={{ mb: 4 }}>
                        <GroupProgress
                            data={getGroupAverages(parseInt(selectedGroup), selectedYears[0], selectedQuarter)}
                          />
                        </Box>
                        <Box sx={{ height: 400 }}>
                            {renderGroupProgressChart(parseInt(selectedGroup))}
                        </Box>
                      </>
                    )}
                  </CardContent>
                </StyledCard>
              </Grid>
            </Grid>
          </>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 8, 
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Выберите группу, чтобы увидеть прогресс
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', px: 2 }}>
              После выбора группы вы сможете просмотреть общий прогресс группы и индивидуальный прогресс детей
            </Typography>
          </Box>
        )
      )}

      {selectedTab === 1 && (
          <StyledCard sx={{ mb: 3 }}>
            <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3 }}>
                  <Button 
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {/* TODO: Добавить экспорт */}}
                  >
                    Экспорт
                  </Button>
              </Box>
              
            <Box sx={{ mb: 4 }}>
              <GroupProgress
                data={getAllGroupsAverages(selectedYears[0], selectedQuarter)}
                showAllGroups
              />
            </Box>
            <Box sx={{ height: 400 }}>
                  {renderAllGroupsProgressChart()}
              </Box>
            </CardContent>
          </StyledCard>
      )}
    </Box>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400,
          textAlign: 'center'
        }}>
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h6" color="text.secondary">
            Загрузка данных...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 400,
          textAlign: 'center'
        }}>
          <Typography variant="h6" color="error" gutterBottom>
            Произошла ошибка
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {error}
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 3 }}
            onClick={() => window.location.reload()}
          >
            Перезагрузить страницу
          </Button>
        </Box>
      );
    }

    if (user.role === 'admin' || user.role === 'psychologist') {
      return renderAdminContent();
    }
    return user.role === 'parent' ? renderParentContent() : renderTeacherContent();
  };

  // Метод для отображения элементов выпадающего списка групп 
  const renderGroupItems = () => {
    if (!groups || groups.length === 0) {
      return (
        <MenuItem value="">
          <em>Нет доступных групп</em>
        </MenuItem>
      );
    }

    return [
      <MenuItem key="empty" value="">
        <em>Выберите группу</em>
      </MenuItem>,
      ...groups.map(group => {
        const groupId = group.group_id || group.id || '';
        const groupName = (group.name || group.group_name || 'Без названия')
          .replace(/группа\s*/gi, '')
          .trim();
        
        return (
          <MenuItem 
            key={groupId} 
            value={groupId.toString()} 
            sx={{
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              padding: '8px 16px',
              lineHeight: 1.2,
              minHeight: 'auto'
            }}
          >
            {groupName}
          </MenuItem>
        );
      })
    ];
  };

  // Функция для отображения графика прогресса группы
  const renderGroupProgressChart = (groupId) => {
    if (!selectedYears[0] || !selectedQuarter) return null;

    // Определяем порядок кварталов
    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    
    // Получаем средние показатели для всех кварталов в правильном порядке
    const groupData = {};
    
    // Получаем данные для каждого квартала
    quarterOrder.forEach(quarterId => {
      const quarterAverages = getGroupAverages(groupId, selectedYears[0], quarterId);
      if (quarterAverages && Object.values(quarterAverages).some(v => v > 0)) {
        groupData[quarterId] = quarterAverages;
      }
    });

    console.log('Отладка порядка кварталов в группе:', {
      groupData,
      quarterOrder
    });

    // Проверяем, есть ли данные хотя бы для одного квартала
    if (Object.keys(groupData).length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Нет данных для отображения
        </Typography>
      );
    }
    
    const chartData = {
      labels: quarterOrder.map(q => {
        const quarterLabels = {
          q1: '1 кв. (Янв-Март)',
          q2: '2 кв. (Апр-Июнь)',
          q3: '3 кв. (Июль-Сент)',
          q4: '4 кв. (Окт-Дек)'
        };
        return quarterLabels[q] || '';
      }),
      datasets: developmentParams
        .filter(param => param.type === 'rating')
        .map(param => ({
          label: param.name,
          data: quarterOrder.map(q => groupData[q]?.[param.id] || 0),
          borderColor: param.color || '#6366F1',
          backgroundColor: 'white',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'white',
          pointBorderColor: param.color || '#6366F1',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false
      }))
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: 500
            },
            boxWidth: 24,
            boxHeight: 24,
            generateLabels: (chart) => {
              const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return labels.map(label => ({
                ...label,
                text: label.text.length > 25 ? label.text.substring(0, 25) + '...' : label.text
              }));
            }
          },
          margins: {
            bottom: 50
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1E293B',
          bodyColor: '#1E293B',
          bodyFont: {
            size: 12
          },
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          padding: 12,
          boxPadding: 8,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const label = context.dataset.label;
              return `${label}: ${value.toFixed(1)} баллов`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          position: 'left',
          title: {
            display: true,
            text: 'Баллы',
            font: {
              size: 14,
              weight: 500
            }
          },
          ticks: {
            stepSize: 1,
            font: {
              size: 14
            },
            callback: (value) => `${value} б.`
          }
        },
        x: {
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
          },
          ticks: {
            font: {
              size: 14,
              weight: 500
            },
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  // Удаляем старую версию функции getAllGroupsAverages
  const renderAllGroupsProgressChart = () => {
    if (!selectedYears[0] || !selectedQuarter || !groups.length) return null;

    // Определяем порядок кварталов
    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    
    // Получаем средние показатели для всех кварталов в правильном порядке
    const allGroupsData = {};
    
    // Получаем данные для каждого квартала
    quarterOrder.forEach(quarterId => {
      const quarterAverages = getAllGroupsAverages(selectedYears[0], quarterId);
      if (quarterAverages && Object.values(quarterAverages).some(v => v > 0)) {
        allGroupsData[quarterId] = quarterAverages;
      }
    });

    // Проверяем, есть ли данные хотя бы для одного квартала
    if (Object.keys(allGroupsData).length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Нет данных для отображения
        </Typography>
      );
    }

    const chartData = {
      labels: quarterOrder.map(q => {
        const quarterLabels = {
          q1: '1 кв. (Янв-Март)',
          q2: '2 кв. (Апр-Июнь)',
          q3: '3 кв. (Июль-Сент)',
          q4: '4 кв. (Окт-Дек)'
        };
        return quarterLabels[q] || '';
      }),
      datasets: developmentParams
        .filter(param => param.type === 'rating')
        .map(param => ({
          label: param.name,
          data: quarterOrder.map(q => allGroupsData[q]?.[param.id] || 0),
          borderColor: param.color || '#6366F1',
          backgroundColor: 'white',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: 'white',
          pointBorderColor: param.color || '#6366F1',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: false
        }))
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              weight: 500
            },
            boxWidth: 24,
            boxHeight: 24,
            generateLabels: (chart) => {
              const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return labels.map(label => ({
                ...label,
                text: label.text.length > 25 ? label.text.substring(0, 25) + '...' : label.text
              }));
            }
          },
          margins: {
            bottom: 50
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1E293B',
          bodyColor: '#1E293B',
          bodyFont: {
            size: 12
          },
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          padding: 12,
          boxPadding: 8,
          borderColor: 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const value = context.raw;
              const label = context.dataset.label;
              return `${label}: ${value.toFixed(1)} баллов`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          position: 'left',
          title: {
            display: true,
            text: 'Баллы',
            font: {
              size: 14,
              weight: 500
            }
          },
          ticks: {
            stepSize: 1,
            font: {
              size: 14
            },
            callback: (value) => `${value} б.`
          }
        },
        x: {
          grid: {
            display: true,
            drawBorder: true,
            drawOnChartArea: true,
            drawTicks: true,
          },
          ticks: {
            font: {
              size: 14,
              weight: 500
            },
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    };

    return <Line data={chartData} options={options} />;
  };

  // Вспомогательная функция для получения данных группы для определенного квартала
  // Используется внутри renderGroupProgressChart
  const getGroupAveragesForQuarter = (groupId, quarterId) => {
    if (!groupId || !quarterId || !selectedYears[0]) return {};

    // Фильтруем детей по группе
    const groupChildren = children.filter(child => {
      const childGroupId = child.original_group_id ? parseInt(child.original_group_id) : parseInt(child.group_id);
      return childGroupId === parseInt(groupId);
    });
    
    if (!groupChildren.length) return {};

    const sums = {};
    const counts = {};

    // Инициализируем счетчики для всех параметров
    developmentParams.forEach(param => {
      sums[param.id] = 0;
      counts[param.id] = 0;
    });

    // Суммируем значения для каждого параметра
    groupChildren.forEach(child => {
      const childProgress = childrenProgress[child.child_id];
      if (childProgress && childProgress[selectedYears[0]] && childProgress[selectedYears[0]][quarterId]) {
        const quarterData = childProgress[selectedYears[0]][quarterId];
        developmentParams.forEach(param => {
          const value = parseFloat(quarterData[param.id]);
          if (!isNaN(value) && value !== null && value !== undefined) {
            sums[param.id] += value;
            counts[param.id]++;
          }
        });
      }
    });

    // Вычисляем средние значения
    const averages = {};
    developmentParams.forEach(param => {
      if (counts[param.id] > 0) {
        averages[param.id] = parseFloat((sums[param.id] / counts[param.id]).toFixed(1));
      } else {
        averages[param.id] = 0;
      }
    });

    return averages;
  };

  // Добавлям import для Filler плагина Chart.js
  useEffect(() => {
    // Регистрация плагина Filler для корректной работы графиков с fill опцией
    const registerFiller = async () => {
      try {
        const { Filler } = await import('chart.js');
        ChartJS.register(Filler);
      } catch (err) {
        console.error('Failed to register Filler plugin:', err);
      }
    };
    
    registerFiller();
  }, []);

  const renderChildList = (children) => {
    return (
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {children.map((child) => (
          <ListItem
            key={child.child_id}
            disablePadding
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <ListItemButton
              onClick={() => handleChildSelect(child)}
              selected={selectedChild?.child_id === child.child_id}
            >
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {child.name.charAt(0)}
              </Avatar>
              <ListItemText
                primary={child.name}
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: selectedChild?.child_id === child.child_id ? 600 : 400
                  }
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  };

  const renderStatistics = () => {
    if (!selectedQuarter || !selectedYears[0]) {
      return null;
    }

    const groupAverages = selectedGroup 
      ? getGroupAverages(selectedGroup, selectedYears[0], selectedQuarter)
      : allGroupsProgress;

    if (!groupAverages) {
      return (
        <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          Нет данных для выбранного периода
        </Typography>
      );
    }

    const metrics = {
      height: { label: 'Средний рост', unit: 'см' },
      weight: { label: 'Средний вес', unit: 'кг' },
      vision_left: { label: 'Среднее зрение (левый глаз)', unit: '' },
      vision_right: { label: 'Среднее зрение (правый глаз)', unit: '' }
    };

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {selectedGroup ? 'Статистика по группе' : 'Общая статистика'}
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(metrics).map(([key, { label, unit }]) => {
            const value = groupAverages[key];
            if (typeof value !== 'number' || isNaN(value)) return null;

            return (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h6">
                    {value.toFixed(2)}{unit}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const getAvailableQuarters = useCallback((selectedYear) => {
    if (!selectedYear) return [];
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    
    // Если выбран год из прошлого - доступны все кварталы
    if (parseInt(selectedYear) < currentYear) {
      return quarters.filter(q => q.id !== '');
    }
    
    // Если выбран будущий год - кварталы недоступны
    if (parseInt(selectedYear) > currentYear) {
      return [];
    }
    
    // Для текущего года определяем доступные кварталы на основе текущего месяца
    const availableQuarters = quarters.filter(q => {
      if (q.id === '') return true; // Оставляем пустой вариант
      
      // Определяем месяц квартала
      const quarterMonth = {
        q1: 1,  // Январь
        q2: 4,  // Апрель
        q3: 7,  // Июль
        q4: 10  // Октябрь
      }[q.id];
      
      // Квартал доступен, если его месяц уже наступил
      return currentMonth >= quarterMonth;
    });
    
    return availableQuarters;
  }, []);

  // Обновляем обработчик изменения года
  const handleYearChange = (event) => {
    const newYears = event.target.value;
    setSelectedYears(newYears);
    
    // Проверяем, доступен ли текущий выбранный квартал для нового года
    const availableQuarters = getAvailableQuarters(newYears[0]);
    const isCurrentQuarterAvailable = availableQuarters.some(q => q.id === selectedQuarter);
    
    if (!isCurrentQuarterAvailable) {
      setSelectedQuarter(''); // Сбрасываем выбор квартала
    }
  };

  // Обновляем рендер выпадающего списка кварталов
  const renderQuarterItems = () => {
    const availableQuarters = getAvailableQuarters(selectedYears[0]);
    
    return availableQuarters.map(quarter => (
      <MenuItem key={quarter.id} value={quarter.id}>
        {quarter.name}
      </MenuItem>
    ));
  };

  // Добавляем useEffect для расчета общего прогресса
  useEffect(() => {
    if (selectedYears[0] && selectedQuarter && groups.length > 0) {
      const progress = getAllGroupsAverages(selectedYears[0], selectedQuarter);
      setAllGroupsProgress(progress);
    }
  }, [selectedYears, selectedQuarter, groups]);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
    setMessage(null);
  };

  return (
    <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 700,
        background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Прогресс развития
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {renderContent()}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
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
              {progressData?.report_id ? 'Редактирование прогресса' : 'Новая запись о прогрессе'}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Дата отчета"
                value={progressData?.report_date || ''}
                onChange={(e) => setProgressData(prev => ({
                  ...prev,
                  report_date: e.target.value
                }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {developmentParams.map(param => (
              <Grid item xs={12} sm={6} key={param.id}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {param.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {param.description}
                  </Typography>
                  {param.type === 'number' ? (
                    <TextField
                      fullWidth
                      type="number"
                      value={progressData?.[param.id] || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setProgressData(prev => ({
                          ...prev,
                          [param.id]: value
                        }));
                      }}
                      inputProps={{
                        step: param.step || 1,
                        min: 0,
                        max: param.max
                      }}
                      size="small"
                    />
                  ) : (
                    <StyledRating
                      value={progressData?.[param.id] || 0}
                      onChange={(e, value) => {
                        setProgressData(prev => ({
                          ...prev,
                          [param.id]: value
                        }));
                      }}
                      max={param.max || 10}
                    />
                  )}
                </Box>
              </Grid>
            ))}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Дополнительная информация"
                value={progressData?.details || ''}
                onChange={(e) => setProgressData(prev => ({
                  ...prev,
                  details: e.target.value
                }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenDialog(false)} size="large">
            Отмена
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleSaveProgress(selectedChild?.child_id, progressData)}
            sx={{
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
              }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={message?.type || 'info'}>
          {message?.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Progress; 