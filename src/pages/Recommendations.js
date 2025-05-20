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
  Avatar,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  CardActionArea,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Psychology as PsychologyIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api, groupsApi, childrenApi } from '../api/api';
import { useOutletContext } from 'react-router-dom';

const Recommendations = () => {
  const { user } = useAuth();
  const { PageTitle } = useOutletContext();
  console.log('Current authenticated user:', user);

  const [recommendations, setRecommendations] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [children, setChildren] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [expandedChildren, setExpandedChildren] = useState(new Set());
  const [formData, setFormData] = useState({
    child_id: '',
    recommendation_text: ''
  });
  const [childrenByGroup, setChildrenByGroup] = useState({});
  const [selectedChild, setSelectedChild] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parents, setParents] = useState({});
  const [selectedParent, setSelectedParent] = useState(null);

  const canEdit = ['admin', 'teacher', 'psychologist'].includes(user?.role);

  // Функция для проверки прав на редактирование конкретной рекомендации
  const canEditRecommendation = (recommendation) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    // Проверяем, является ли пользователь автором рекомендации
    const currentUserId = user.id || user.user_id;
    const recommendationUserId = Number(recommendation.user_id);
    
    console.log('Checking edit permissions:', {
        currentUserId,
        recommendationUserId,
        userRole: user.role,
        isOwner: currentUserId === recommendationUserId
    });
    
    return ['psychologist', 'teacher'].includes(user.role) && 
           Number(currentUserId) === recommendationUserId;
  };

  const organizeRecommendationsByGroup = (recommendations, groups, children) => {
    console.log('Organizing recommendations:', {
        recommendationsCount: recommendations?.data?.length,
        groupsCount: groups?.data?.length,
        childrenCount: children?.data?.length,
        currentUser: user,
        userRole: user?.role,
        userId: user?.id || user?.user_id,
        rawRecommendations: recommendations?.data
    });

    // Проверяем, что у нас есть все необходимые данные
    if (!recommendations?.data || !groups?.data || !children?.data) {
        console.warn('Missing required data:', {
            hasRecommendations: !!recommendations?.data,
            hasGroups: !!groups?.data,
            hasChildren: !!children?.data
        });
        return {};
    }

    // Для админа показываем все рекомендации без фильтрации
    const filteredRecommendations = user?.role === 'admin' 
        ? recommendations.data 
        : recommendations.data.filter(rec => {
            console.log('Filtering recommendation:', {
                rec,
                userRole: user?.role,
                userId: user?.id || user?.user_id,
                recUserId: rec.user_id,
                recParentId: rec.parent_id,
                isAdmin: user?.role === 'admin'
            });

            if (user?.role === 'parent') {
                return Number(rec.parent_id) === Number(user?.id || user?.user_id);
            }
            
            return Number(rec.user_id) === Number(user?.id || user?.user_id);
        });

    console.log('Filtered recommendations:', {
        total: filteredRecommendations.length,
        recommendations: filteredRecommendations,
        isAdmin: user?.role === 'admin'
    });

    const organized = {};
    
    // Создаем структуру для всех групп
    groups.data.forEach(group => {
        console.log('Processing group:', group);
        organized[group.group_id] = {
            groupInfo: group,
            children: {}
        };
    });

    // Добавляем детей в их группы
    children.data.forEach(child => {
        console.log('Processing child:', {
            child,
            hasGroup: !!child.group_id,
            groupExists: child.group_id ? !!organized[child.group_id] : false
        });
        if (child.group_id) {
            if (!organized[child.group_id]) {
                const group = groups.data.find(g => g.group_id === child.group_id);
                console.log('Creating missing group for child:', {
                    childId: child.child_id,
                    groupId: child.group_id,
                    foundGroup: group
                });
                organized[child.group_id] = {
                    groupInfo: {
                        group_id: child.group_id,
                        group_name: group ? group.group_name : 'Неизвестная группа'
                    },
                    children: {}
                };
            }
            organized[child.group_id].children[child.child_id] = {
                childInfo: child,
                recommendations: []
            };
        }
    });

    // Добавляем рекомендации к соответствующим детям
    filteredRecommendations.forEach(rec => {
        console.log('Processing recommendation:', {
            recommendation: rec,
            childId: rec.child_id,
            childExists: !!children.data.find(c => c.child_id === rec.child_id)
        });
        const child = children.data.find(c => Number(c.child_id) === Number(rec.child_id));
        console.log('Found child for recommendation:', {
            recommendation: rec,
            child: child,
            hasChild: !!child,
            hasGroup: child?.group_id,
            groupExists: child ? !!organized[child.group_id] : false,
            childInGroup: child ? !!organized[child.group_id]?.children[child.child_id] : false
        });
        if (child && child.group_id && organized[child.group_id]?.children[child.child_id]) {
            organized[child.group_id].children[child.child_id].recommendations.push(rec);
            console.log('Added recommendation to child:', {
                childId: child.child_id,
                groupId: child.group_id,
                recommendationId: rec.recommendation_id,
                recommendationsCount: organized[child.group_id].children[child.child_id].recommendations.length
            });
        } else {
            console.warn('Could not add recommendation:', {
                recommendationId: rec.recommendation_id,
                childId: rec.child_id,
                foundChild: child,
                hasGroup: child?.group_id,
                hasOrganizedGroup: child ? !!organized[child.group_id] : false,
                hasChild: child ? !!organized[child.group_id]?.children[child.child_id] : false,
                childIdTypes: {
                    recChildIdType: typeof rec.child_id,
                    recChildId: rec.child_id,
                    childIdType: child ? typeof child.child_id : 'no child',
                    childId: child ? child.child_id : 'no child'
                }
            });
        }
    });

    console.log('Final organized data:', {
        organized,
        childrenWithRecommendations: Object.values(organized).flatMap(group => 
            Object.values(group.children)
        ).filter(child => child.recommendations.length > 0)
    });
    return organized;
  };

  const [organizedData, setOrganizedData] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching data with user role:', user?.role);

      // Получаем все данные параллельно
      const [childrenData, recommendationsData, groupsData] = await Promise.all([
        childrenApi.getAll({ include_parents: true }),
        api.recommendations.getAll(),
        groupsApi.getAll()
      ]);

      console.log('Raw API responses:', {
        children: childrenData,
        recommendations: recommendationsData,
        groups: groupsData
      });

      // Преобразуем данные в нужный формат
      const formattedChildren = Array.isArray(childrenData.data) ? childrenData.data : [];
      const formattedGroups = Array.isArray(groupsData.data) ? groupsData.data : [];
      const formattedRecommendations = Array.isArray(recommendationsData) ? recommendationsData : [];

      console.log('Formatted data:', {
        recommendations: formattedRecommendations,
        children: formattedChildren,
        groups: formattedGroups
      });

      // Сохраняем отформатированные данные
      setChildren({ data: formattedChildren });
      setRecommendations({ data: formattedRecommendations });
      setGroups({ data: formattedGroups });

      // Организуем рекомендации по группам
      const organized = organizeRecommendationsByGroup(
        { data: formattedRecommendations },
        { data: formattedGroups },
        { data: formattedChildren }
      );
      
      console.log('Organized data:', organized);
      setOrganizedData(organized);
      
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message || 'Ошибка при загрузке данных');
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Ошибка при загрузке данных',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = async (rec = null) => {
    if (rec) {
      console.log('Opening dialog for editing recommendation:', rec);
      setSelectedRec(rec);
      setFormData({
        child_id: rec.child_id,
        recommendation_text: rec.recommendation_text
      });

      // Находим группу для ребенка
      const child = children.data.find(c => Number(c.child_id) === Number(rec.child_id));
      console.log('Found child:', child);
      
      if (child) {
        setSelectedGroup(child.group_id || '');
        
        // Устанавливаем информацию о родителе из рекомендации
        const parent = {
          id: rec.parent_id,
          name: `${rec.parent_first_name} ${rec.parent_last_name}`,
          email: rec.parent_email
        };
        console.log('Setting parent from recommendation:', parent);
        setSelectedParent(parent);
      } else {
        console.warn('Child not found for recommendation:', rec);
        setSelectedGroup('');
        setSelectedParent(null);
        setSnackbar({
          open: true,
          message: 'Не удалось найти информацию о ребенке',
          severity: 'warning'
        });
      }
    } else {
      // Новая рекомендация
      console.log('Opening dialog for new recommendation');
      setSelectedRec(null);
      setSelectedGroup('');
      setSelectedParent(null);
      setFormData({
        child_id: '',
        recommendation_text: ''
      });
    }
    setOpenDialog(true);
  };

  const handleOpenViewDialog = (rec) => {
    setSelectedRec(rec);
    setOpenViewDialog(true);
  };

  const handleOpenSendDialog = async (rec) => {
    setSelectedRec(rec);
    setSelectedChild('');
    
    // Устанавливаем информацию о родителе из рекомендации
    const parent = {
      id: rec.parent_id,
      name: `${rec.parent_first_name} ${rec.parent_last_name}`,
      email: rec.parent_email
    };
    console.log('Setting parent for sending:', parent);
    setSelectedParent(parent);
    
    setOpenSendDialog(true);
  };

  const getParentInfo = (childId) => {
    const child = children.find(c => c.child_id === childId);
    if (!child) return null;
    return parents[child.parent_id] || null;
  };

  const handleChildChange = (childId) => {
    // Преобразуем строку в число, если это строка
    const numericChildId = typeof childId === 'string' ? parseInt(childId, 10) : childId;
    
    setFormData(prev => ({ ...prev, child_id: numericChildId }));
    
    if (!numericChildId) {
      setSelectedParent(null);
      return;
    }

    const child = children.data.find(c => Number(c.child_id) === Number(numericChildId));
    
    if (child && child.parent) {
        console.log('Selected child with parent:', child);
        const parent = {
            id: child.parent.id,
            name: child.parent.name,
            email: child.parent.email
        };
        console.log('Setting parent from child:', parent);
        setSelectedParent(parent);
    } else {
        console.warn('Child has no parent info:', child);
        setSelectedParent(null);
        setSnackbar({
            open: true,
            message: 'У ребенка не указан родитель',
            severity: 'warning'
        });
    }
  };

  const handleSave = async (recommendation) => {
    try {
        setLoading(true);
        setError(null);
        console.log('Current user object:', {
            user,
            id: user.id,
            userId: user.user_id,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
        });
        console.log('Saving recommendation:', recommendation);
        console.log('Form data:', formData);
        
        if (!formData.child_id) {
            throw new Error('Необходимо выбрать ребенка');
        }

        // Получаем корректный ID пользователя
        const userId = Number(user.user_id) || Number(user.id);
        if (!userId) {
            console.error('User ID not found in user object:', user);
            throw new Error('Не удалось определить ID пользователя');
        }
        console.log('Using user ID:', userId);

        // Находим ребенка и проверяем его данные
        const child = children.data.find(c => Number(c.child_id) === Number(formData.child_id));
        console.log('Found child for saving:', child);

        if (!child) {
            console.error('Child not found:', formData.child_id);
            throw new Error('Ребенок не найден в базе данных');
        }

        if (!child.parent_id && !child.parent?.id) {
            console.error('Parent ID not found for child:', child);
            throw new Error('У ребенка не указан родитель');
        }

        const parentId = Number(child.parent_id) || Number(child.parent?.id);

        // Добавляем только те поля, которые есть в таблице
        const recommendationData = {
            child_id: Number(formData.child_id),
            recommendation_text: formData.recommendation_text,
            is_sent: false,
            user_id: userId,
            parent_id: parentId,
            date: new Date().toISOString()
        };
        
        console.log('Saving recommendation data:', recommendationData);

        let savedRecommendation;
        if (selectedRec?.recommendation_id) {
            // Обновляем существующую рекомендацию
            savedRecommendation = await api.recommendations.update(
                selectedRec.recommendation_id, 
                recommendationData
            );
            console.log('Updated recommendation:', savedRecommendation);
            setSnackbar({
                open: true,
                message: 'Рекомендация успешно обновлена',
                severity: 'success'
            });
        } else {
            // Создаем новую рекомендацию
            savedRecommendation = await api.recommendations.create(recommendationData);
            console.log('Created recommendation:', savedRecommendation);
            setSnackbar({
                open: true,
                message: 'Рекомендация успешно создана',
                severity: 'success'
            });
        }

        await fetchData(); // Обновляем список рекомендаций
        setOpenDialog(false);
        setFormData({ child_id: '', recommendation_text: '' });
        setSelectedParent(null);
        
    } catch (err) {
        console.error('Error saving recommendation:', err);
        setError(err.message || 'Ошибка при сохранении рекомендации');
        setSnackbar({
            open: true,
            message: err.message || 'Ошибка при сохранении рекомендации',
            severity: 'error'
        });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Attempting to delete recommendation:', id);

      // Находим рекомендацию в текущем списке
      const recommendationToDelete = recommendations.data.find(rec => rec.recommendation_id === id);
      
      if (!recommendationToDelete) {
        console.log('Recommendation not found in current list');
        setSnackbar({
          open: true,
          message: 'Рекомендация уже была удалена',
          severity: 'info'
        });
        await fetchData();
        return;
      }

      // Проверяем права на удаление
      if (recommendationToDelete.user_id !== user.id && user.role !== 'admin') {
        setSnackbar({
          open: true,
          message: 'У вас нет прав на удаление этой рекомендации',
          severity: 'error'
        });
        return;
      }
      
      try {
        await api.recommendations.delete(id);
        console.log('Recommendation successfully deleted');
        setSnackbar({
          open: true,
          message: 'Рекомендация успешно удалена',
          severity: 'success'
        });
      } catch (deleteError) {
        if (deleteError.response?.status === 404) {
          console.log('Recommendation already deleted on server');
          setSnackbar({
            open: true,
            message: 'Рекомендация уже была удалена',
            severity: 'info'
          });
        } else {
          throw deleteError;
        }
      }

      // В любом случае обновляем данные и закрываем диалоги
      await fetchData();
      
      if (openViewDialog) {
        setOpenViewDialog(false);
      }
      
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      setError(err.message || 'Ошибка при удалении рекомендации');
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.message || 'Ошибка при удалении рекомендации',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (recommendation) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Sending recommendation:', recommendation);

      await api.recommendations.send(recommendation.recommendation_id);
      
      // Обновляем статус is_sent в рекомендации
      const updatedRecommendation = {
        ...recommendation,
        is_sent: true
      };
      
      await api.recommendations.update(
        recommendation.recommendation_id,
        updatedRecommendation
      );

      await fetchData(); // Обновляем список рекомендаций
      setOpenSendDialog(false);
      
      setSnackbar({
        open: true,
        message: 'Рекомендация успешно отправлена родителю',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error sending recommendation:', err);
      setError(err.message || 'Ошибка при отправке рекомендации');
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при отправке рекомендации',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderRecommendationCard = (rec) => {
    console.log('Rendering card for recommendation:', rec);
    const child = children?.data?.find(c => Number(c.child_id) === Number(rec.child_id));
    const group = groups?.data?.find(g => g.group_id === child?.group_id);
    const canEditRec = canEditRecommendation(rec);
    
    console.log('Rendering recommendation card:', {
        recommendation: rec,
        foundChild: child,
        foundGroup: group,
        canEdit: canEditRec
    });
    
    return (
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box 
              sx={{ 
                flex: 1, 
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }} 
              onClick={() => handleOpenViewDialog(rec)}
            >
              <Typography variant="h6" gutterBottom>
                {rec.child_name || child?.name || 'Неизвестный ребенок'}
              </Typography>
              {group && (
                <Chip
                  icon={<GroupIcon />}
                  label={group.group_name}
                  size="small"
                  color="secondary"
                  sx={{ mb: 1 }}
                />
              )}
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <InfoIcon fontSize="small" />
                Нажмите, чтобы посмотреть рекомендацию
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  icon={<PersonIcon />}
                  label={`${rec.user_first_name || ''} ${rec.user_last_name || ''}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(rec.date).toLocaleDateString()}
                </Typography>
                {rec.is_sent && (
                  <Chip
                    icon={<EmailIcon />}
                    label="Отправлено"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
            <Box>
              {(canEdit || canEditRec) && (
                <>
                  {(canEditRec || user?.role === 'admin') && (
                    <>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(rec);
                        }} 
                        size="small"
                        title="Редактировать"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rec.recommendation_id);
                        }} 
                        size="small" 
                        color="error"
                        title="Удалить"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSendDialog(rec);
                    }} 
                    size="small" 
                    color="primary"
                    disabled={rec.is_sent}
                    title={rec.is_sent ? "Уже отправлено" : "Отправить"}
                  >
                    <EmailIcon />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Добавим функции для управления состоянием аккордеонов
  const handleGroupExpand = (groupId) => {
    setExpandedGroups(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(groupId)) {
        newExpanded.delete(groupId);
      } else {
        newExpanded.add(groupId);
      }
      return newExpanded;
    });
  };

  const handleChildExpand = (childId) => {
    setExpandedChildren(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(childId)) {
        newExpanded.delete(childId);
      } else {
        newExpanded.add(childId);
      }
      return newExpanded;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={fetchData}
          startIcon={<RefreshIcon />}
        >
          Повторить загрузку
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageTitle>Рекомендации</PageTitle>
      
      {canEdit && (
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 3
        }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: '8px 16px',
              height: '40px',
              backgroundColor: 'primary.main',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: 'primary.dark',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }
            }}
          >
            Добавить рекомендацию
          </Button>
        </Box>
      )}

      {['admin', 'psychologist', 'teacher'].includes(user?.role) ? (
        // Отображение для админа, психолога и воспитателя
        <Box>
          {console.log('Rendering admin/teacher view. Organized data:', organizedData)}
          {Object.entries(organizedData)
            .filter(([groupId]) => groupId !== 'no_group')
            .map(([groupId, groupData]) => {
              console.log('Rendering group:', groupId, groupData);
              return (
                <Accordion 
                  key={groupId} 
                  expanded={expandedGroups.has(groupId)}
                  onChange={() => handleGroupExpand(groupId)}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon />
                      <Typography variant="h6">
                        {groupData.groupInfo.group_name || 'Без названия'}
                      </Typography>
                      <Chip
                        label={`${Object.keys(groupData.children).length} ${
                          Object.keys(groupData.children).length === 1 ? 'ребенок' : 'детей'
                        }`}
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {Object.entries(groupData.children).map(([childId, childData]) => {
                      console.log('Rendering child:', childId, childData);
                      return (
                        <Accordion 
                          key={childId}
                          expanded={expandedChildren.has(childId)}
                          onChange={() => handleChildExpand(childId)}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              width: '100%',
                              justifyContent: 'space-between'
                            }}>
                              <Typography>{childData.childInfo.name}</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={`${childData.recommendations.length} ${
                                    childData.recommendations.length === 1 ? 'рекомендация' : 'рекомендаций'
                                  }`}
                                  size="small"
                                />
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {childData.recommendations.length > 0 ? (
                              childData.recommendations
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map(rec => (
                                  <Box key={rec.recommendation_id}>
                                    {renderRecommendationCard(rec)}
                                  </Box>
                                ))
                            ) : (
                              <Typography color="text.secondary">
                                Нет рекомендаций
                              </Typography>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              );
            })}
        </Box>
      ) : (
        // Отображение для родителей
        <Paper sx={{ p: 2 }}>
          {console.log('Rendering parent view. Recommendations:', recommendations)}
          {recommendations && recommendations.data && recommendations.data.length > 0 ? (
            recommendations.data
              .filter(rec => {
                const isParentMatch = Number(rec.parent_id) === Number(user?.user_id || user?.id);
                console.log('Filtering recommendation:', {
                  rec,
                  userId: user?.user_id || user?.id,
                  isParentMatch
                });
                return isParentMatch;
              })
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((rec) => (
                <Box key={rec.recommendation_id} sx={{ mb: 2 }}>
                  {renderRecommendationCard(rec)}
                </Box>
              ))
          ) : (
            <Typography variant="body1" color="text.secondary" align="center">
              Рекомендации отсутствуют
            </Typography>
          )}
        </Paper>
      )}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedRec ? 'Редактировать рекомендацию' : 'Новая рекомендация'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Группа</InputLabel>
              <Select
                value={selectedGroup || ''}
                onChange={(e) => {
                  const newGroupId = e.target.value;
                  setSelectedGroup(newGroupId ? parseInt(newGroupId, 10) : '');
                  // Сбрасываем выбранного ребенка при смене группы
                  setFormData(prev => ({ ...prev, child_id: '' }));
                }}
                label="Группа"
              >
                <MenuItem value="">
                  <em>Выберите группу</em>
                </MenuItem>
                {groups.data.map((group) => (
                  <MenuItem key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Ребенок</InputLabel>
              <Select
                value={formData.child_id || ''}
                onChange={(e) => handleChildChange(e.target.value)}
                label="Ребенок"
                disabled={!selectedGroup}
              >
                <MenuItem value="">
                  <em>Выберите ребенка</em>
                </MenuItem>
                {children.data
                  .filter(child => child.group_id === selectedGroup)
                  .map((child) => (
                    <MenuItem key={child.child_id} value={child.child_id}>
                      {child.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {formData.child_id && (
              <Box sx={{ 
                bgcolor: 'background.paper', 
                p: 2, 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2">
                    Родитель:
                  </Typography>
                </Box>
                {selectedParent ? (
                  <>
                    <Typography variant="body1" sx={{ mb: 0.5 }}>
                      {selectedParent.name}
                    </Typography>
                    {selectedParent.email && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedParent.email}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography variant="body1" color="error">
                    Родитель не найден
                  </Typography>
                )}
              </Box>
            )}

            <TextField
              fullWidth
              label="Текст рекомендации"
              multiline
              rows={4}
              value={formData.recommendation_text}
              onChange={(e) => setFormData({ ...formData, recommendation_text: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Отмена
          </Button>
          {selectedRec && (canEditRecommendation(selectedRec) || user?.role === 'admin') && (
            <Button
              onClick={() => handleDelete(selectedRec.recommendation_id)}
              color="error"
              startIcon={<DeleteIcon />}
            >
              Удалить
            </Button>
          )}
          <Button 
            onClick={() => handleSave(selectedRec ? selectedRec : formData)} 
            variant="contained"
            disabled={!formData.child_id || !formData.recommendation_text.trim()}
            startIcon={selectedRec ? <EditIcon /> : <AddIcon />}
          >
            {selectedRec ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6">
              Рекомендация для {selectedRec?.child_name || children.data.find(c => c.child_id === selectedRec?.child_id)?.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={<PersonIcon />}
                label={`${selectedRec?.user_first_name} ${selectedRec?.user_last_name}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {selectedRec?.date && new Date(selectedRec.date).toLocaleDateString()}
              </Typography>
              {selectedRec?.is_sent && (
                <Chip
                  icon={<EmailIcon />}
                  label="Отправлено"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body1" 
            paragraph 
            sx={{ 
              mt: 2,
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              bgcolor: 'background.paper',
              p: 2,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {selectedRec?.recommendation_text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenViewDialog(false)} 
            variant="contained"
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openSendDialog}
        onClose={() => setOpenSendDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Отправить рекомендацию родителю</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {selectedRec && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Рекомендация для:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {children.data.find(c => c.child_id === selectedRec.child_id)?.name}
                </Typography>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  Текст рекомендации:
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedRec.recommendation_text}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Родитель:
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedParent ? selectedParent.name : 'Родитель не найден'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedParent ? selectedParent.email : 'Email не указан'}
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => handleSendEmail(selectedRec)}
            variant="contained"
          >
            Отправить
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

export default Recommendations; 