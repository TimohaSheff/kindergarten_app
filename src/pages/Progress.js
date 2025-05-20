import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from '../utils/axios';  // Используем наш настроенный экземпляр axios
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
  Download as DownloadIcon,
  Refresh as RefreshIcon
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
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';

// Удаляем определение API_URL, так как используем настроенный axios
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Удаляем лишний console.log
// console.log('API URL:', API_URL);

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
  borderRadius: '16px',
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
  if (!dateString) return null;
  
  const month = parseInt(dateString.split('-')[1]);
  
  if (month >= 1 && month <= 3) return 'q1';
  if (month >= 4 && month <= 6) return 'q2';
  if (month >= 7 && month <= 9) return 'q3';
  if (month >= 10 && month <= 12) return 'q4';
  
  return null;
};

// Функция для получения стандартной даты квартала
const getStandardQuarterDate = (year, quarter) => {
  switch (quarter) {
    case 'q1':
      return `${year}-01-01`;
    case 'q2':
      return `${year}-04-01`;
    case 'q3':
      return `${year}-07-01`;
    case 'q4':
      return `${year}-10-01`;
    default:
      return null;
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
  const { PageTitle } = useOutletContext();
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [progressData, setProgressData] = useState({});
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [dialogOpen, setDialogOpen] = useState(false);
  const isMounted = useRef(true);

  const groupProgressByQuarters = (progressData) => {
    if (!progressData || !Array.isArray(progressData)) {
        return {};
    }

    const grouped = {};
    
    progressData.forEach(report => {
        const [year, month] = report.report_date.split('-');
        const monthNum = parseInt(month);
        
        // Определяем квартал
        let quarter;
        if (monthNum <= 3) quarter = 'q1';
        else if (monthNum <= 6) quarter = 'q2';
        else if (monthNum <= 9) quarter = 'q3';
        else quarter = 'q4';
        
        // Создаем структуру для года если её нет
        if (!grouped[year]) {
            grouped[year] = {
                q1: null,
                q2: null,
                q3: null,
                q4: null
            };
        }
        
        // Сохраняем последний отчет за квартал
        grouped[year][quarter] = report;
    });
    
    return grouped;
};

  // Выделим загрузку детей в отдельную функцию, которую можно вызывать повторно
  const loadChildrenForGroup = useCallback(async (groupId) => {
    try {
      console.log('Запрос детей для группы:', groupId);
      
      const response = await axios.get(`/groups/${groupId}/children`);
      console.log('Ответ сервера при загрузке детей:', {
        status: response.status,
        headers: response.headers,
        data: response.data
      });
      
      // Проверяем наличие данных в ответе
      if (!Array.isArray(response.data)) {
        console.error('Ответ сервера не является массивом:', response.data);
        setChildren([]);
        return;
      }
      
      // ID выбранной группы для фильтрации
      console.log('ID выбранной группы:', groupId);
      console.log('Количество детей в ответе:', response.data.length);
      
      // Нормализуем данные детей
      const normalizedChildren = response.data.map(child => {
        console.log('Исходные данные ребенка:', child);
        const normalizedChild = {
          id: child.child_id,
          child_id: child.child_id,
          name: child.name,
          group_id: parseInt(groupId),
          original_group_id: parseInt(groupId),
          services: child.service_names || [],
          parent: child.parent_first_name && child.parent_last_name ? {
            id: child.parent_id,
            name: `${child.parent_first_name} ${child.parent_last_name}`,
            firstName: child.parent_first_name,
            lastName: child.parent_last_name
          } : null
        };
        console.log('Нормализованные данные ребенка:', normalizedChild);
        return normalizedChild;
      });
      
      console.log('Все нормализованные данные детей:', normalizedChildren);
      setChildren(normalizedChildren);
      
    } catch (error) {
      console.error('Ошибка при загрузке детей:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      setChildren([]);
    }
  }, []);
  
  // Вспомогательная функция для очистки данных
  const clearChildrenData = useCallback(() => {
    setChildren([]);
    setSelectedChild(null);
    setChildrenProgress({});
  }, []);

  // Обновляем useEffect для загрузки данных
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        console.log('Нет данных пользователя, пропускаем загрузку');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Отсутствует токен авторизации');
        setError('Необходима авторизация');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Начало загрузки данных:', {
          userRole: user.role,
          token: 'Присутствует',
          apiConfig: {
            baseURL: axios.defaults.baseURL,
            headers: axios.defaults.headers
          }
        });
        
        if (user.role === 'parent') {
          // Для родителя загружаем только его детей
          console.log('Загрузка данных для родителя:', {
              userId: user.user_id,
              userRole: user.role,
              token: localStorage.getItem('token') ? 'Присутствует' : 'Отсутствует',
              user: user // Добавляем полные данные пользователя для отладки
          });
          
          try {
              const token = localStorage.getItem('token');
              if (!token) {
                  throw new Error('Отсутствует токен авторизации');
              }

              // Получаем список детей родителя
              console.log('Запрос детей для родителя:', {
                  endpoint: '/children',
                  params: { parent_id: user.user_id },
                  headers: {
                      'Authorization': `Bearer ${token.substring(0, 10)}...`,
                      'Content-Type': 'application/json'
                  }
              });

              const childrenResponse = await childrenApi.getAll({ parent_id: user.user_id });
          console.log('Ответ при загрузке детей родителя:', {
            status: childrenResponse?.status,
                  data: childrenResponse?.data,
                  requestedParentId: user.user_id,
                  headers: childrenResponse?.headers
          });
          
              if (!childrenResponse || !childrenResponse.data) {
            throw new Error('Не удалось получить данные о детях');
          }
          
              // Создаем Set для хранения уникальных ID детей
              const uniqueChildIds = new Set();
              const validChildren = childrenResponse.data
                  .filter(child => {
                      const isValid = String(child.parent_id) === String(user.user_id);
                      const isDuplicate = uniqueChildIds.has(child.child_id);
                      
                      if (isValid && !isDuplicate) {
                          uniqueChildIds.add(child.child_id);
                          return true;
                      }
                      return false;
                  })
                  .map(child => ({
                      ...child,
                      child_id: child.child_id,
                      parent_id: String(child.parent_id)
                  }));
              
              console.log('Отфильтрованные уникальные дети:', validChildren);
              
              if (validChildren.length === 0) {
                  console.log('У родителя нет привязанных детей:', {
                      receivedChildren: childrenResponse.data,
                      parentId: user.user_id
                  });
                  setChildren([]);
                  return;
              }
              
              setChildren(validChildren);
              
              // Если есть дети, автоматически выбираем первого и загружаем его прогресс
              if (validChildren.length > 0) {
                  const firstChild = validChildren[0];
                  console.log('Выбран первый ребенок:', {
                      childId: firstChild.child_id,
                      childName: firstChild.name,
                      parentId: firstChild.parent_id,
                      userId: user.user_id,
                      token: `Bearer ${token.substring(0, 10)}...`
                  });
                  
                  setSelectedChild(firstChild);
                  
                  try {
                      console.log('Попытка загрузки прогресса для ребенка:', {
                          childId: firstChild.child_id,
                          endpoint: `/progress/child/${firstChild.child_id}`,
                          token: `Bearer ${token.substring(0, 10)}...`,
                          parentId: user.user_id,
                          headers: {
                              'Authorization': `Bearer ${token.substring(0, 10)}...`,
                              'Content-Type': 'application/json'
                          }
                      });
                      
                      const progressResponse = await api.progress.get(firstChild.child_id);
                      console.log('Успешный ответ при загрузке прогресса:', {
              status: progressResponse?.status,
              data: progressResponse?.data
            });
            
            if (progressResponse) {
                          const groupedProgress = groupProgressByQuarters(progressResponse.data);
              setProgressData(groupedProgress);
            }
                  } catch (error) {
                      console.error('Ошибка при загрузке прогресса ребенка:', {
                          error,
                          response: error.response?.data,
                          status: error.response?.status,
                          config: error.config
                      });
                      
                      if (error.response?.status === 403) {
                          setError('У вас нет прав для просмотра прогресса этого ребенка. ' +
                                  'Убедитесь, что вы являетесь родителем данного ребенка.');
                      } else {
                          setError(`Ошибка при загрузке прогресса: ${error.message}`);
                      }
                  }
              }
          } catch (error) {
              console.error('Ошибка при загрузке данных для родителя:', {
                  error,
                  response: error.response?.data,
                  status: error.response?.status,
                  config: error.config
              });
              
              if (error.response) {
                  console.error('Ответ сервера:', error.response.data);
                  setError(`Ошибка при загрузке данных: ${error.response.data.message || error.message}`);
              } else {
                  setError('Ошибка при загрузке данных: ' + error.message);
              }
          }
        } else {
          // Для остальных ролей загружаем группы
          try {
            console.log('Загрузка данных о группах...');
            const response = await groupsApi.getAll();
            console.log('Ответ при загрузке групп:', {
              status: response?.status,
              data: response?.data,
              headers: response?.headers
            });
            
            if (!response || !response.data) {
              throw new Error('Не удалось получить данные о группах');
            }
            
            const groupsResponse = response.data;
            
            if (!Array.isArray(groupsResponse)) {
              throw new Error('Неверный формат данных о группах');
            }
            
            if (groupsResponse.length === 0) {
              console.log('Список групп пуст');
            }
            
            setGroups(groupsResponse);
            
            // Если есть группы, загружаем данные первой группы
            if (groupsResponse.length > 0) {
              const firstGroup = groupsResponse[0];
              setSelectedGroup(firstGroup.group_id);
              await loadChildrenForGroup(firstGroup.group_id);
            }
          } catch (groupError) {
            console.error('Ошибка при загрузке групп:', {
              message: groupError.message,
              response: groupError.response?.data,
              status: groupError.response?.status
            });
            setGroups([]);
            setError('Ошибка загрузки групп: ' + (groupError.message || 'неизвестная ошибка'));
          }
        }
      } catch (err) {
        console.error('Ошибка при загрузке данных:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(err.message || 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user, loadChildrenForGroup]);

  const canEdit = user && ['admin', 'psychologist'].includes(user.role);
  console.log('Права на редактирование:', { userRole: user?.role, canEdit });

  const availableYears = ['2023', '2024', '2025'];

  // Удаляем все дублирующиеся объявления getAllGroupsAverages и оставляем только одно
  const getAllGroupsAverages = (selectedYear, selectedQuarter) => {
    if (!selectedYear || !selectedQuarter) {
      console.log('Нет данных для расчета общих средних:', { selectedYear, selectedQuarter });
      return null;
    }

    console.log('Вычисляем общие средние, год:', selectedYear, 'квартал:', selectedQuarter);
    console.log('Данные прогресса:', childrenProgress);

    const groupSums = {};
    const groupCounts = {};
    
    developmentParams.forEach(param => {
      groupSums[param.id] = 0;
      groupCounts[param.id] = 0;
    });

    // Перебираем все данные прогресса
    Object.values(childrenProgress).forEach(childProgress => {
      if (childProgress[selectedYear]?.[selectedQuarter]) {
        const quarterData = childProgress[selectedYear][selectedQuarter];
        developmentParams.forEach(param => {
          const value = Number(quarterData[param.id]);
          if (!isNaN(value) && value > 0) {
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

    console.log('Общие средние значения:', totalAverages);
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
    
    if (!user) {
        console.warn('Attempt to filter children without user');
        return [];
    }
    
    if (user.role === 'parent') {
        // Используем Set для уникальных ID
        const uniqueIds = new Set();
        const filtered = children.filter(child => {
            const isParentChild = String(child.parent_id) === String(user.user_id);
            const isDuplicate = uniqueIds.has(child.child_id);
            
            if (isParentChild && !isDuplicate) {
                uniqueIds.add(child.child_id);
                return true;
            }
            return false;
        });
        
        console.log('Фильтр по родителю, найдено уникальных детей:', filtered.length);
        return filtered;
    }
    
    // Остальная логика фильтрации остается без изменений
    // ... existing code ...
    // Проверка на существование пользователя
    if (!user) {
      console.warn('Attempt to filter children without user');
      return [];
    }
    
    // Фильтр для родителя
    if (user.role === 'parent') {
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
        console.log('Загрузка прогресса для ребенка:', {
            childId,
            childIdType: typeof childId,
            user: {
                id: user.user_id,
                idType: typeof user.user_id,
                role: user.role
            }
        });
        
        // Проверяем права доступа
        if (user.role === 'parent') {
            // Проверяем, есть ли ребенок в списке детей родителя
            const isParentChild = children.some(child => {
                const childMatch = Number(child.child_id) === Number(childId);
                const parentMatch = Number(child.parent_id) === Number(user.user_id);
                
                console.log('Проверка соответствия:', {
                    child: {
                        id: child.child_id,
                        type: typeof child.child_id,
                        parentId: child.parent_id,
                        parentIdType: typeof child.parent_id
                    },
                    user: {
                        id: user.user_id,
                        type: typeof user.user_id
                    },
                    childMatch,
                    parentMatch
                });
                
                return childMatch && parentMatch;
            });
            
            if (!isParentChild) {
                console.error('Попытка доступа к прогрессу чужого ребенка:', {
                    requestedChildId: childId,
                    userId: user.user_id,
                    availableChildren: children.map(c => ({
                        id: c.child_id,
                        parentId: c.parent_id
                    }))
                });
                throw new Error('У вас нет прав для просмотра прогресса этого ребенка');
            }
        }

        const response = await api.progress.get(childId);
        
        console.log('Ответ сервера при загрузке прогресса:', {
            status: response.status,
            headers: response.headers,
            data: response.data
        });

        // Проверяем, что данные получены
        if (!response || !response.data) {
            console.warn('Нет данных прогресса для ребенка:', childId);
            return {
                [new Date().getFullYear().toString()]: {
                    q1: null,
                    q2: null,
                    q3: null,
                    q4: null
                }
            };
        }

        // Если данные уже в нужном формате по годам и кварталам
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
            console.log('Данные уже в нужном формате:', response.data);
            
            // Проверяем и нормализуем данные каждого квартала
            Object.keys(response.data).forEach(year => {
                Object.keys(response.data[year]).forEach(quarter => {
                    const quarterData = response.data[year][quarter];
                    if (quarterData && typeof quarterData === 'object') {
                        response.data[year][quarter] = {
                            report_id: quarterData.report_id,
                            report_date: quarterData.report_date,
                            details: quarterData.details || '',
                            active_speech: Number(quarterData.active_speech) || 0,
                            games: Number(quarterData.games) || 0,
                            art_activity: Number(quarterData.art_activity) || 0,
                            constructive_activity: Number(quarterData.constructive_activity) || 0,
                            sensory_development: Number(quarterData.sensory_development) || 0,
                            movement_skills: Number(quarterData.movement_skills) || 0,
                            height_cm: Number(quarterData.height_cm) || 0,
                            weight_kg: Number(quarterData.weight_kg) || 0
                        };
                    }
                });
            });

            // Добавляем текущий год, если его нет
            const currentYear = new Date().getFullYear().toString();
            if (!response.data[currentYear]) {
                response.data[currentYear] = {
                    q1: null,
                    q2: null,
                    q3: null,
                    q4: null
                };
            }

            console.log('Нормализованные данные прогресса:', response.data);
            return response.data;
        }

        // Если данные пришли в виде массива отчетов
        const progressData = Array.isArray(response.data) ? response.data : [response.data];
        console.log('Полученные данные прогресса:', progressData);
        
        const progressByYear = {};
        
        progressData.forEach(report => {
            if (!report?.report_date) {
                console.warn('Пропущен отчет без даты:', report);
                return;
            }

            const [year, month] = report.report_date.split('-');
            const monthNum = parseInt(month);
            
            // Определяем квартал
            let quarter;
            if (monthNum <= 3) quarter = 'q1';
            else if (monthNum <= 6) quarter = 'q2';
            else if (monthNum <= 9) quarter = 'q3';
            else quarter = 'q4';
            
            // Создаем структуру для года, если её нет
            if (!progressByYear[year]) {
                progressByYear[year] = {
                    q1: null,
                    q2: null,
                    q3: null,
                    q4: null
                };
            }
            
            // Нормализуем отчет
            const normalizedReport = {
                report_id: report.report_id,
                report_date: report.report_date,
                details: report.details || '',
                active_speech: Number(report.active_speech) || 0,
                games: Number(report.games) || 0,
                art_activity: Number(report.art_activity) || 0,
                constructive_activity: Number(report.constructive_activity) || 0,
                sensory_development: Number(report.sensory_development) || 0,
                movement_skills: Number(report.movement_skills) || 0,
                height_cm: Number(report.height_cm) || 0,
                weight_kg: Number(report.weight_kg) || 0
            };
            
            console.log(`Добавлен отчет за ${year} год, ${quarter} квартал:`, normalizedReport);
            progressByYear[year][quarter] = normalizedReport;
        });

        // Добавляем текущий год, если его нет
        const currentYear = new Date().getFullYear().toString();
        if (!progressByYear[currentYear]) {
            progressByYear[currentYear] = {
                q1: null,
                q2: null,
                q3: null,
                q4: null
            };
        }

        console.log('Итоговая структура прогресса:', progressByYear);
        return progressByYear;

    } catch (error) {
        console.error('Ошибка при загрузке прогресса:', error);
        console.error('Детали ошибки:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });
        setError(`Ошибка при загрузке прогресса: ${error.message}`);
        return {
            [new Date().getFullYear().toString()]: {
                q1: null,
                q2: null,
                q3: null,
                q4: null
            }
        };
    }
};

  // Обновляем useEffect для загрузки прогресса при изменении квартала или года
  useEffect(() => {
    const loadProgressData = async () => {
      if (selectedQuarter && selectedYears[0] && children.length > 0) {
        console.log('Начало загрузки прогресса:', {
            selectedQuarter,
            selectedYear: selectedYears[0],
            children
        });
        
        // Загружаем прогресс только для тех детей, для которых его еще нет
        for (const child of children) {
          try {
                console.log('Проверка прогресса для ребенка:', {
                    childId: child.child_id,
                    childName: child.name,
                    hasProgress: !!childrenProgress[child.child_id]
                });
                
            if (!childrenProgress[child.child_id]) {
              console.log('Загрузка прогресса для ребенка:', child.child_id);
                    const response = await api.progress.get(child.child_id);
                    console.log('Получены данные прогресса:', response.data);
              
                    if (response && response.data) {
                        // Обновляем состояние с новыми данными
                        setChildrenProgress(prev => {
                            const newState = {
                ...prev,
                                [child.child_id]: response.data
                            };
                            console.log('Обновление состояния childrenProgress:', newState);
                            return newState;
                        });
                        
                        // Если это текущий выбранный ребенок, обновляем progressData
                        if (selectedChild && selectedChild.child_id === child.child_id) {
                            console.log('Обновление progressData для текущего ребенка:', response.data);
                            setProgressData(response.data);
                        }
                    }
            }
          } catch (error) {
                console.error('Ошибка при загрузке прогресса для ребенка:', {
                    childId: child.child_id,
                    error: error.message
                });
          }
        }
      }
    };

    loadProgressData();
  }, [selectedQuarter, selectedYears, children, selectedChild]);

  const handleChildSelect = async (child) => {
    try {
        if (!child || !child.child_id) {
            throw new Error('Некорректные данные ребенка');
        }
        
        console.log('Выбран ребенок:', child);
        setSelectedChild(child);
        
        // Проверяем наличие данных в кэше
        if (childrenProgress[child.child_id]) {
            console.log('Используем кэшированные данные:', childrenProgress[child.child_id]);
            const cachedData = childrenProgress[child.child_id];
            
            // Обновляем год и квартал на основе кэшированных данных
            const years = Object.keys(cachedData);
            if (years.length > 0) {
                const latestYear = Math.max(...years);
                setSelectedYears([latestYear.toString()]);
                
                const quarters = Object.keys(cachedData[latestYear]);
                const availableQuarter = quarters.find(q => cachedData[latestYear][q] !== null);
                if (availableQuarter) {
                    setSelectedQuarter(availableQuarter);
                }
            }
            
            setProgressData(cachedData);
        } else {
            // Если данных нет, загружаем их
            console.log('Загружаем данные для ребенка:', child.child_id);
            const response = await api.progress.get(child.child_id);
            console.log('Получен ответ:', response);
            
            if (response?.data) {
                console.log('Полученные данные:', response.data);
                
                // Преобразуем данные в нужный формат, если они еще не в нем
                const formattedData = response.data;
                
                // Обновляем год и квартал
                const years = Object.keys(formattedData);
                console.log('Доступные годы:', years);
                
                if (years.length > 0) {
                    const latestYear = Math.max(...years);
                    console.log('Выбран год:', latestYear);
                    setSelectedYears([latestYear.toString()]);
                    
                    const quarters = Object.keys(formattedData[latestYear]);
                    const availableQuarter = quarters.find(q => formattedData[latestYear][q] !== null);
                    if (availableQuarter) {
                        console.log('Выбран квартал:', availableQuarter);
                        setSelectedQuarter(availableQuarter);
                    }
                }
                
                // Сохраняем данные
                console.log('Сохраняем данные:', formattedData);
                setProgressData(formattedData);
                setChildrenProgress(prev => ({
                    ...prev,
                    [child.child_id]: formattedData
                }));
            }
        }
        
    } catch (err) {
        console.error('Ошибка при выборе ребенка:', err);
        setError(err.message);
        setSnackbar({
            open: true,
            message: err.message,
            severity: 'error'
        });
    }
};

  // Вспомогательная функция для форматирования даты
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return '';
    }
  };

  // Форматирование даты в YYYY-MM-DD без манипуляций с часовым поясом
  const formatDateToYYYYMMDD = (date) => {
    if (!date) return '';
    
    try {
      // Если передана строка даты
      if (typeof date === 'string') {
        // Просто возвращаем часть до T, если она есть
        return date.split('T')[0];
      }
      
      // Если передан объект Date, форматируем его в строку
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      return '';
    } catch (err) {
      console.error('Ошибка форматирования даты:', err, date);
      return '';
    }
  };

  const handleSaveProgress = async (childId, progressData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Не найден токен авторизации');
      }

      if (!childId) {
        throw new Error('Не указан ID ребенка');
      }

      if (!progressData.report_date) {
        throw new Error('Не указана дата отчета');
      }

      // Определяем квартал на основе даты
      const quarter = getQuarterFromDate(progressData.report_date);
      const year = new Date(progressData.report_date).getFullYear();

      // Валидация данных перед отправкой
      const validatedData = {
        child_id: parseInt(childId),
        report_date: progressData.report_date,
        details: progressData.details || '',
        active_speech: Number(progressData.active_speech) || 0,
        games: Number(progressData.games) || 0,
        art_activity: Number(progressData.art_activity) || 0,
        constructive_activity: Number(progressData.constructive_activity) || 0,
        sensory_development: Number(progressData.sensory_development) || 0,
        weight_kg: Number(progressData.weight_kg) || 0,
        height_cm: Number(progressData.height_cm) || 0,
        movement_skills: Number(progressData.movement_skills) || 0,
        quarter,
        year
      };

      // Проверяем, что все числовые значения корректны
      Object.entries(validatedData).forEach(([key, value]) => {
        if (typeof value === 'number' && isNaN(value)) {
          throw new Error(`Некорректное значение для поля ${key}`);
        }
      });

      console.log('Отправляемые данные:', validatedData);

      let response;
      try {
        if (progressData.report_id) {
          console.log('Обновление существующей записи:', progressData.report_id);
          response = await axios.put(`/progress/${progressData.report_id}`, validatedData);
        } else {
          console.log('Создание новой записи');
          // Используем правильный путь API и добавляем обработку ошибок
          response = await axios.post('/progress', validatedData, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).catch(error => {
            console.error('Детали ошибки:', {
              response: error.response?.data,
              status: error.response?.status,
              message: error.message
            });
            throw new Error(error.response?.data?.message || error.message || 'Ошибка при создании записи');
          });
        }

        if (response.status === 200 || response.status === 201) {
          // Получаем обновленные данные
          const updatedProgress = await fetchChildProgress(childId);
          
          // Обновляем состояние локально
          if (childrenProgress[childId]) {
            const updatedChildProgress = {
              ...childrenProgress[childId],
              [year]: {
                ...childrenProgress[childId][year],
                [quarter]: response.data
              }
            };
            
            setChildrenProgress(prev => ({
              ...prev,
              [childId]: updatedChildProgress
            }));
          }

          setOpenDialog(false);
          setSnackbarMessage(progressData.report_id ? 'Прогресс успешно обновлен' : 'Прогресс успешно сохранен');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);

          return response;
        } else {
          throw new Error('Неожиданный ответ сервера');
        }
      } catch (error) {
        console.error('Ошибка при отправке запроса:', error);
        if (error.response) {
          console.error('Ответ сервера:', error.response.data);
          throw new Error(error.response.data.message || 'Ошибка сервера при сохранении данных');
        }
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      
      let errorMessage = 'Ошибка при сохранении прогресса';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      
      throw error;
    }
  };

  const handleEdit = (report) => {
    console.log('Редактирование отчета:', report);
    const date = new Date(report.report_date);
    // Преобразуем дату в формат YYYY-MM-DD без изменения дня
    const localDate = date.toISOString().split('T')[0];
    console.log('Преобразованная дата:', localDate);
    
    setProgressData({
      report_id: report.report_id,
      report_date: localDate,
      details: report.details || report.notes || '',
      active_speech: Number(report.active_speech) || 0,
      games: Number(report.games) || 0,
      art_activity: Number(report.art_activity) || 0,
      constructive_activity: Number(report.constructive_activity) || 0,
      sensory_development: Number(report.sensory_development) || 0,
      weight_kg: Number(report.weight_kg) || 0,
      height_cm: Number(report.height_cm) || 0,
      movement_skills: Number(report.movement_skills) || 0,
      quarter: getQuarterFromDate(localDate)
    });
    setOpenDialog(true);
  };

  const renderChildProgress = (selectedChild, progressData) => {
    console.log('Входные данные renderChildProgress:', {
        selectedChild,
        progressData,
        selectedQuarter,
        selectedYears
    });

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

    // Проверяем наличие данных прогресса
    if (!progressData || Object.keys(progressData).length === 0) {
        console.log('Нет данных прогресса');
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Нет данных о прогрессе
            </Typography>
          </CardContent>
        </StyledCard>
      );
    }

    // Получаем данные для выбранного года
    const selectedYear = selectedYears[0];
    console.log('Проверка данных года:', {
        selectedYear,
        yearData: progressData[selectedYear],
        allData: progressData
    });
    
    const selectedYearData = progressData[selectedYear];
    
    if (!selectedYearData) {
        console.log('Нет данных за год');
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
              <Typography variant="body1" color="text.secondary">
                        Нет данных о прогрессе за {selectedYear} год
              </Typography>
          </CardContent>
        </StyledCard>
      );
    }
    
    // Получаем данные за выбранный квартал
    const selectedQuarterData = selectedYearData[selectedQuarter];
    console.log('Проверка данных квартала:', {
        selectedQuarter,
        quarterData: selectedQuarterData
    });
    
    if (!selectedQuarterData) {
        console.log('Нет данных за квартал');
      return (
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" color="text.secondary">
                            Нет данных о прогрессе за {quarters.find(q => q.id === selectedQuarter)?.name} {selectedYear} года для {selectedChild.name}
              </Typography>
            </Box>
          </CardContent>
        </StyledCard>
      );
    }

    // Если есть данные, отображаем их
    return (
      <Box>
        <StyledCard sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Прогресс за {quarters.find(q => q.id === selectedQuarter)?.name} {selectedYear}
              </Typography>
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
                                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {param.name}
                      </Typography>
                                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
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

                    {/* График прогресса */}
                    <Box sx={{ minHeight: 450, mt: 6, mb: 4 }}>
              {renderProgressChart(progressData)}
            </Box>

                    {/* Дополнительная информация */}
            {selectedQuarterData.details && (
              <Box sx={{ mt: 4 }}>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Дополнительная информация:
                </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
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
    
    // Создаем структуру для данных, сгруппированных по фактическим кварталам
    const quarterData = {
      q1: null,
      q2: null,
      q3: null,
      q4: null
    };
    
    // Определяем квартал для каждого отчета
    Object.entries(yearData).forEach(([key, report]) => {
      if (report && report.report_date) {
        const dateParts = report.report_date.split('T')[0].split('-');
        if (dateParts.length >= 2) {
          const month = parseInt(dateParts[1], 10);
          let quarterFromDate;
          
          if (month >= 1 && month <= 3) quarterFromDate = 'q1';
          else if (month >= 4 && month <= 6) quarterFromDate = 'q2';
          else if (month >= 7 && month <= 9) quarterFromDate = 'q3';
          else if (month >= 10 && month <= 12) quarterFromDate = 'q4';
          
          // Сохраняем отчет в соответствующий квартал
          if (quarterFromDate) {
            quarterData[quarterFromDate] = report;
          }
        }
      }
    });

    // Получаем только существующие кварталы и сортируем их в правильном порядке
    const existingQuarters = quarterOrder.filter(q => quarterData[q] !== null);

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
        data: existingQuarters.map(q => quarterData[q]?.[param.id] || null),
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

    const physicalDatasets = [
      {
        label: 'Рост (см)',
        data: existingQuarters.map(q => quarterData[q]?.height_cm || null),
        borderColor: '#6B7280',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'white',
        pointBorderColor: '#6B7280',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: 'y2'
      },
      {
        label: 'Вес (кг)',
        data: existingQuarters.map(q => quarterData[q]?.weight_kg || null),
        borderColor: '#14B8A6',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'white',
        pointBorderColor: '#14B8A6',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: false,
        yAxisID: 'y3'
      }
    ];

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
            boxHeight: 24
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
          displayColors: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          },
          ticks: {
            stepSize: 1,
            font: {
              size: 12
            },
            callback: (value) => `${value} б.`
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12,
              weight: 500
            },
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    };

    const physicalOptions = {
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
            boxHeight: 24
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
          displayColors: true
        }
      },
      scales: {
        y2: {
          position: 'left',
          beginAtZero: true,
          max: 200,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
            drawBorder: false
          },
          ticks: {
            font: {
              size: 12
            },
            callback: (value) => `${value} см`
          }
        },
        y3: {
          position: 'right',
          beginAtZero: true,
          max: 60,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12
            },
            callback: (value) => `${value} кг`
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 12,
              weight: 500
            },
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    };

    return (
      <Box>
        <Box sx={{ height: 400, mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: 'text.secondary' }}>
            Развивающие показатели
          </Typography>
          <Line data={developmentChartData} options={commonOptions} />
        </Box>
        <Box sx={{ height: 400 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: 'text.secondary' }}>
            Физические показатели
          </Typography>
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
    if (!groupId || !selectedYear || !selectedQuarter) {
        console.log('Недостаточно данных для расчета средних:', { groupId, selectedYear, selectedQuarter });
        return {
            active_speech: 0,
            games: 0,
            art_activity: 0,
            constructive_activity: 0,
            sensory_development: 0,
            movement_skills: 0,
            height_cm: 0,
            weight_kg: 0
        };
    }

    console.log('Расчет средних значений для группы:', {
        groupId,
        selectedYear,
        selectedQuarter,
        childrenCount: children.length,
        progressData: childrenProgress
    });

    // Фильтруем детей по группе
    const groupChildren = children.filter(child => {
        const childGroupId = child.original_group_id 
            ? parseInt(child.original_group_id) 
            : parseInt(child.group_id);
        const match = childGroupId === parseInt(groupId);
        console.log('Проверка ребенка:', {
            childName: child.name,
            childGroupId,
            targetGroupId: parseInt(groupId),
            match
        });
        return match;
    });

    if (!groupChildren.length) {
        console.warn('Не найдено детей в группе для расчета средних');
        return {
            active_speech: 0,
            games: 0,
            art_activity: 0,
            constructive_activity: 0,
            sensory_development: 0,
            movement_skills: 0,
            height_cm: 0,
            weight_kg: 0
        };
    }

    console.log('Найдено детей в группе:', groupChildren.length);

    // Инициализируем объекты для подсчета сумм и количества значений
    const sums = {};
    const counts = {};
    
    // Инициализируем все параметры
    developmentParams.forEach(param => {
        sums[param.id] = 0;
        counts[param.id] = 0;
    });

    // Для каждого ребенка в группе
    groupChildren.forEach(child => {
        console.log('Обработка данных ребенка:', child.name);
        
        if (!childrenProgress[child.child_id]) {
            console.log('Нет данных прогресса для ребенка:', child.name);
            return;
        }

        const yearData = childrenProgress[child.child_id][selectedYear];
        if (!yearData) {
            console.log('Нет данных за год для ребенка:', child.name);
            return;
        }

        const quarterData = yearData[selectedQuarter];
        if (!quarterData) {
            console.log('Нет данных за квартал для ребенка:', child.name);
            return;
        }

        console.log('Найдены данные прогресса для ребенка:', {
            childName: child.name,
            quarterData
        });

        // Обрабатываем все параметры развития
        developmentParams.forEach(param => {
            const value = parseFloat(quarterData[param.id]);
            if (!isNaN(value) && value !== null && value !== undefined && value > 0) {
                sums[param.id] += value;
                counts[param.id]++;
                console.log(`Добавлено значение ${value} для параметра ${param.id}, всего значений: ${counts[param.id]}`);
            }
        });
    });

    // Вычисляем средние значения
    const averages = {};
    developmentParams.forEach(param => {
        if (counts[param.id] > 0) {
            averages[param.id] = parseFloat((sums[param.id] / counts[param.id]).toFixed(1));
        } else {
            averages[param.id] = 0;
        }
        console.log(`Среднее значение для ${param.id}: ${averages[param.id]} (из ${counts[param.id]} значений)`);
    });

    console.log('Итоговые средние значения:', averages);
    return averages;
};

  const renderParentContent = () => (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : children.length === 0 ? (
        <Alert severity="info">У вас пока нет привязанных детей</Alert>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="parent-quarter-select-label">Квартал</InputLabel>
                <Select
                  labelId="parent-quarter-select-label"
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
                <InputLabel id="parent-year-select-label">Год</InputLabel>
                <Select
                  labelId="parent-year-select-label"
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

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="parent-child-select-label">Ребенок</InputLabel>
                <Select
                  labelId="parent-child-select-label"
                  value={selectedChild?.child_id || ''}
                  onChange={(e) => {
                    const child = children.find(c => c.child_id === e.target.value);
                    handleChildSelect(child);
                  }}
                  label="Ребенок"
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
                >
                  {children.map((child) => (
                    <MenuItem key={child.child_id} value={child.child_id}>
                      {child.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {selectedChild && selectedQuarter && selectedYears.length > 0 ? (
            <Box>
              {renderChildProgress(selectedChild, progressData)}
            </Box>
          ) : (
            <StyledCard>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  {!selectedChild ? 'Выберите ребенка' : 
                   !selectedQuarter ? 'Выберите квартал' : 
                   !selectedYears.length ? 'Выберите год' : 
                   'Выберите все необходимые параметры'} для просмотра прогресса
                </Typography>
              </CardContent>
            </StyledCard>
          )}
        </>
      )}
    </Box>
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
        {selectedChild && progressData && (
          <IndividualProgress
            child={{
              ...selectedChild,
              progress: progressData[selectedYears[0]]?.[selectedQuarter] || {}
            }}
            onEdit={handleEdit}
          />
        )}
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
            {user.role === 'parent' ? (
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel id="child-select-label">Ребенок</InputLabel>
                <Select
                  labelId="child-select-label"
                  id="child-select"
                  value={selectedChild?.child_id || ''}
                  onChange={(e) => {
                    const child = children.find(c => c.child_id === e.target.value);
                    setSelectedChild(child);
                    if (child) {
                      api.progress.get(child.child_id)
                        .then(response => {
                          if (response && response.data) {
                            const groupedProgress = groupProgressByQuarters(response.data);
                            setProgressData(groupedProgress);
                          }
                        })
                        .catch(error => {
                          console.error('Ошибка при загрузке прогресса:', error);
                          if (error.response) {
                            setError(`Ошибка при загрузке прогресса: ${error.response.data.message}`);
                          } else {
                            setError('Ошибка при загрузке прогресса');
                          }
                        });
                    }
                  }}
                  label="Ребенок"
                  size="small"
                  sx={{ 
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 0, 0, 0.12)'
                    }
                  }}
                >
                  {Array.isArray(children) && children.length > 0 ? (
                    children.map((child) => (
                      <MenuItem key={child.child_id} value={child.child_id}>
                        {child.name}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Нет доступных детей</MenuItem>
                  )}
                </Select>
              </FormControl>
            ) : (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={selectedGroup || ''}
                onChange={handleGroupChange}
                label="Группа"
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                {Array.isArray(groups) && groups.length > 0 ? (
                  groups.map((group) => (
                    <MenuItem key={group.group_id} value={group.group_id}>
                      {group.group_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Нет доступных групп</MenuItem>
                )}
              </Select>
            </FormControl>
            )}
          </Grid>
        )}
      </Grid>

      {selectedTab === 0 && (
        user.role === 'parent' ? (
          selectedChild ? (
            <StyledCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" component="h2">
                    Прогресс развития: {selectedChild.name}
                  </Typography>
                  <Button 
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {/* TODO: Добавить экспорт */}}
                  >
                    Экспорт
                  </Button>
                </Box>
                {renderIndividualProgress(selectedChild.child_id)}
              </CardContent>
            </StyledCard>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: 400 
            }}>
              <Typography variant="body1" color="text.secondary">
                Выберите ребенка для просмотра прогресса
              </Typography>
            </Box>
          )
        ) : (
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
                          sx={{
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            height: '40px',
                            textTransform: 'none',
                            fontWeight: 600
                          }}
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
                          {renderGroupProgress(
                            getGroupAverages(parseInt(selectedGroup), selectedYears[0], selectedQuarter),
                            false
                          )}
                        </Box>
                        <Box sx={{ height: 400 }}>
                          {renderProgressChart(getGroupAverages(parseInt(selectedGroup), selectedYears[0], selectedQuarter))}
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
    if (!user) {
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
            Ошибка авторизации
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Для доступа к этой странице необходимо войти в систему
          </Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 3 }}
            component={Link}
            to="/login"
          >
            Перейти на страницу входа
          </Button>
        </Box>
      );
    }
    
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
          textAlign: 'center',
          p: 3
        }}>
          <Typography variant="h6" color="error" gutterBottom>
            Произошла ошибка
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            startIcon={<RefreshIcon />}
          >
            Попробовать снова
          </Button>
        </Box>
      );
    }

    switch (user.role) {
      case 'parent':
        return renderParentContent();
      case 'teacher':
        return renderTeacherContent();
      case 'admin':
      case 'psychologist':
        return renderAdminContent();
      default:
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
              Доступ запрещен
            </Typography>
            <Typography variant="body1" color="text.secondary">
              У вас нет прав для просмотра этой страницы
            </Typography>
          </Box>
        );
    }
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

  // Добавляем функцию для подготовки данных групп
  const prepareGroupDataForChart = (data) => {
    if (!data) return null;

    const year = selectedYears[0];
    const groupId = selectedGroup;

    // Создаем структуру данных в формате, который ожидает график
    const result = {
      [year]: {
        q1: null,
        q2: null,
        q3: null,
        q4: null
      }
    };

    // Получаем данные для каждого квартала
    ['q1', 'q2', 'q3', 'q4'].forEach(quarter => {
      const quarterData = getGroupAverages(groupId, year, quarter);
      if (quarterData && Object.values(quarterData).some(v => v > 0)) {
        result[year][quarter] = {
          report_date: getStandardQuarterDate(year, quarter),
          ...quarterData
        };
      }
    });

    return result;
  };

  const renderGroupProgress = (data, showAllGroups = false) => {
    if (!data) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {showAllGroups ? 
              'Нет данных о прогрессе групп за выбранный период' :
              'Нет данных о прогрессе группы за выбранный период'
            }
          </Typography>
        </Box>
      );
    }
  
    const hasAnyProgress = Object.values(data).some(value => value > 0);
    
    if (!hasAnyProgress) {
      return (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body1" color="text.secondary">
            {showAllGroups ? 
              'В выбранном периоде нет данных о прогрессе ни для одной из групп' :
              'В выбранном периоде нет данных о прогрессе для этой группы'
            }
          </Typography>
        </Box>
      );
    }

    // Подготавливаем данные для графика
    const chartData = prepareGroupDataForChart(data);

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 600, 
          mb: 3,
          color: 'text.primary'
        }}>
          {showAllGroups ? 'Общий прогресс всех групп' : 'Прогресс группы'}
        </Typography>

        {/* Развивающие показатели */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ 
            fontWeight: 500, 
            mb: 2,
            color: 'text.secondary'
          }}>
            Развивающие показатели
          </Typography>
          {developmentParams
            .filter(param => param.type === 'rating')
            .map(param => {
              const value = data[param.id] || 0;
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
                    <Typography 
                      variant="body1" 
                      color="text.secondary" 
                      sx={{ 
                        fontWeight: 500,
                        minWidth: '70px',
                        textAlign: 'right'
                      }}
                    >
                      {value.toFixed(1)} из 10
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={value * 10} 
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

        {/* Физические показатели */}
        <Box>
          <Typography variant="subtitle1" sx={{ 
            fontWeight: 500, 
            mb: 2,
            color: 'text.secondary'
          }}>
            Физические показатели
          </Typography>
          {developmentParams
            .filter(param => param.type === 'number')
            .map(param => {
              const value = data[param.id] || 0;
              const unit = param.id === 'height_cm' ? 'см' : 'кг';
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
                    <Typography 
                      variant="body1" 
                      color="text.secondary" 
                      sx={{ 
                        fontWeight: 500,
                        minWidth: '70px',
                        textAlign: 'right'
                      }}
                    >
                      {value.toFixed(1)} {unit}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(value / param.max) * 100} 
                    sx={{ 
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: alpha(param.color || '#6B7280', 0.1),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: param.color || '#6B7280',
                        borderRadius: 6
                      }
                    }}
                  />
                </Box>
              );
            })}
        </Box>

        {/* График прогресса */}
        <Box sx={{ minHeight: 450, mt: 6, mb: 4, '& canvas': { maxWidth: '100%' } }}>
          {renderProgressChart(chartData)}
        </Box>
      </Box>
    );
};

  // Удаляем старую версию функции getAllGroupsAverages
  const renderAllGroupsProgressChart = () => {
    if (!selectedYears[0] || !selectedQuarter || !groups.length) return null;

    // Получаем средние показатели для всех кварталов
    const allGroupsData = {};
    
    // Создаем структуру для данных, сгруппированных по фактическим кварталам
    const quarterData = {
      q1: null,
      q2: null,
      q3: null,
      q4: null
    };
    
    // Определяем порядок кварталов
    const quarterOrder = ['q1', 'q2', 'q3', 'q4'];
    
    // Получаем данные для каждого квартала
    quarterOrder.forEach(quarterId => {
      const quarterAverages = getAllGroupsAverages(selectedYears[0], quarterId);
      if (quarterAverages && Object.values(quarterAverages).some(v => v > 0)) {
        quarterData[quarterId] = quarterAverages;
      }
    });
    
    console.log('Данные по всем группам, сгруппированные по кварталам:', quarterData);

    // Проверяем, есть ли данные хотя бы для одного квартала
    if (!Object.values(quarterData).some(v => v !== null)) {
      return (
        <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
          Нет данных для отображения
        </Typography>
      );
    }

    // Получаем только существующие кварталы
    const existingQuarters = quarterOrder.filter(q => quarterData[q] !== null);

    const chartData = {
      labels: existingQuarters.map(q => {
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
          data: existingQuarters.map(q => quarterData[q]?.[param.id] || 0),
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
            boxHeight: 24
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
          displayColors: true
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

  // Функция для получения доступных кварталов
  const getAvailableQuarters = (year) => {
    if (!year) return quarters.slice(1); // Возвращаем все кварталы кроме пустого значения
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (parseInt(year) < currentYear) {
      // Для прошлых лет возвращаем все кварталы
      return quarters.slice(1);
    } else if (parseInt(year) > currentYear) {
      // Для будущих лет возвращаем только первый квартал
      return quarters.slice(1, 3);
    } else {
      // Для текущего года возвращаем кварталы до текущего
      const currentQuarters = [quarters[1]];
      if (currentMonth > 3) currentQuarters.push(quarters[2]);
      if (currentMonth > 6) currentQuarters.push(quarters[3]);
      if (currentMonth > 9) currentQuarters.push(quarters[4]);
      return currentQuarters;
    }
  };

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
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setProgressData(null);
  };

  // Обновляем useEffect для загрузки прогресса при изменении года и квартала
  useEffect(() => {
    const loadAllProgress = async () => {
      if (selectedQuarter && selectedYears[0]) {
        console.log('Загрузка прогресса...');
        setLoading(true);
        
        try {
          if (user.role === 'parent') {
            // Для родителя загружаем прогресс только его детей
            console.log('Загрузка прогресса для детей родителя:', children);
            
            for (const child of children) {
              try {
                if (!childrenProgress[child.child_id]) {
                  console.log('Загрузка прогресса для ребенка:', child.child_id);
                  const progressData = await fetchChildProgress(child.child_id);
                  setChildrenProgress(prev => ({
                    ...prev,
                    [child.child_id]: progressData
                  }));
                }
              } catch (error) {
                console.error(`Ошибка при загрузке прогресса для ребенка ${child.name}:`, error);
              }
            }
          } else {
            // Для остальных ролей оставляем существующую логику
          const response = await groupsApi.getAll();
          console.log('Получены все группы:', response);
          
          if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Неверный формат данных о группах');
          }
          
          for (const group of response.data) {
            try {
              const groupChildren = await axios.get(`/groups/${group.group_id}/children`);
              console.log(`Получены дети группы ${group.group_name}:`, groupChildren.data);
              
              if (Array.isArray(groupChildren.data)) {
                for (const child of groupChildren.data) {
                  try {
                    const progressData = await fetchChildProgress(child.child_id);
                    setChildrenProgress(prev => ({
                      ...prev,
                      [child.child_id]: progressData
                    }));
                  } catch (error) {
                    console.error(`Ошибка при загрузке прогресса для ребенка ${child.name}:`, error);
                  }
                }
              }
            } catch (error) {
              console.error(`Ошибка при загрузке детей группы ${group.group_name}:`, error);
              }
            }
          }
        } catch (error) {
          console.error('Ошибка при загрузке данных:', error);
          setError('Ошибка при загрузке данных прогресса');
        } finally {
          setLoading(false);
        }
      }
    };

    loadAllProgress();
  }, [selectedQuarter, selectedYears[0], user.role, children]);

  // Обновляем useEffect для загрузки прогресса при изменении группы
  useEffect(() => {
    const loadGroupProgress = async () => {
      if (selectedGroup && children.length > 0) {
        console.log('Загрузка прогресса для выбранной группы...');
        
        // Загружаем прогресс только для тех детей, для которых его еще нет
        for (const child of children) {
          try {
            if (!childrenProgress[child.child_id]) {
              console.log('Загрузка прогресса для ребенка:', child.child_id);
              const progressData = await fetchChildProgress(child.child_id);
              
              setChildrenProgress(prev => ({
                ...prev,
                [child.child_id]: progressData
              }));
            }
          } catch (error) {
            console.error('Ошибка при загрузке прогресса для ребенка:', child.child_id, error);
          }
        }
      }
    };

    loadGroupProgress();
  }, [selectedGroup, children]);

  // Добавляем функцию renderIndividualProgress
  const renderIndividualProgress = (childId) => {
    if (!childId || !progressData) {
      return (
        <Typography variant="body1" color="text.secondary">
          Нет данных о прогрессе
        </Typography>
      );
    }

    return renderChildProgress(selectedChild, progressData);
  };

  return (
    <Box sx={{ py: 2, px: { xs: 2, md: 2 } }}>
      <Typography variant="h4" gutterBottom sx={{ 
        fontWeight: 600,
        fontSize: '2rem',
        position: 'relative',
        paddingBottom: '12px',
        marginBottom: '24px',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '48px',
          height: '3px',
          backgroundColor: 'primary.main',
          borderRadius: '2px'
        }
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
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)'
          }
        }}
      >
        {console.log('Состояние диалога:', { openDialog, progressData })}
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {progressData?.report_id ? 'Редактирование прогресса' : 'Новая запись о прогрессе'}
            </Typography>
            <IconButton onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {progressData ? (
            <>
              <TextField
                fullWidth
                type="date"
                label="Дата отчета"
                value={progressData.report_date || ''}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  console.log('Выбранная дата:', selectedDate);
                  setProgressData(prev => ({
                    ...prev,
                    report_date: selectedDate,
                    quarter: getQuarterFromDate(selectedDate)
                  }));
                }}
                required
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />
              <Grid container spacing={3}>
                {developmentParams.map(param => (
                  <Grid item xs={12} sm={6} key={param.id}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {param.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {param.type === 'rating' ? 'Оценка от 0 до 10' : param.id === 'height_cm' ? 'Рост в сантиметрах' : 'Вес в килограммах'}
                      </Typography>
                      {param.type === 'number' ? (
                        <TextField
                          fullWidth
                          type="number"
                          value={progressData[param.id] !== undefined ? progressData[param.id] : ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Number(e.target.value);
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
                          value={Number(progressData[param.id]) || 0}
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
                    value={progressData.details || ''}
                    onChange={(e) => setProgressData(prev => ({
                      ...prev,
                      details: e.target.value
                    }))}
                  />
                </Grid>
              </Grid>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Загрузка данных...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} size="large">
            Отмена
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              if (progressData && selectedChild) {
                handleSaveProgress(selectedChild.child_id, progressData)
                  .catch(error => {
                    console.error('Ошибка при сохранении:', error);
                  });
              } else {
                setSnackbarMessage('Не выбран ребенок или данные не загружены');
                setSnackbarSeverity('error');
                setSnackbarOpen(true);
              }
            }}
            disabled={!progressData || !selectedChild}
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
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Progress; 