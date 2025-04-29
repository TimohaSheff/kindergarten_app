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
  Group as GroupIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api, groupsApi, childrenApi } from '../api/api';

const Recommendations = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [children, setChildren] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
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

  const organizeRecommendationsByGroup = (recommendations, groups, children) => {
    const organized = {};
    groups.forEach(group => {
      organized[group.group_id] = {
        groupInfo: group,
        children: {}
      };
    });

    // Организуем детей по группам
    children.forEach(child => {
      if (child.group_id && organized[child.group_id]) {
        organized[child.group_id].children[child.child_id] = {
          childInfo: child,
          recommendations: []
        };
      }
    });

    // Распределяем рекомендации по детям
    recommendations.forEach(rec => {
      const child = children.find(c => c.child_id === rec.child_id);
      if (child && child.group_id && organized[child.group_id]?.children[child.child_id]) {
        organized[child.group_id].children[child.child_id].recommendations.push(rec);
      }
    });

    return organized;
  };

  const [organizedData, setOrganizedData] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching recommendations and children data...');
      
      // Получаем данные о детях с информацией о родителях
      const childrenData = await childrenApi.getAllChildren().catch(err => {
        console.error('Error fetching children:', err);
        setError(err.message);
        setSnackbar({
          open: true,
          message: `Ошибка при загрузке списка детей: ${err.message}`,
          severity: 'error'
        });
        return [];
      });

      console.log('Received children data:', childrenData);

      // Получаем остальные данные
      const [recommendationsData, groupsData] = await Promise.all([
        api.getRecommendations(),
        groupsApi.getGroups()
      ]);
      
      console.log('Fetched all data:', { 
        children: childrenData,
        recommendations: recommendationsData,
        groups: groupsData 
      });
      
      setChildren(childrenData);
      setRecommendations(recommendationsData);
      setGroups(groupsData);

      const organized = organizeRecommendationsByGroup(recommendationsData, groupsData, childrenData);
      setOrganizedData(organized);
      
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError(err.message || 'Ошибка при загрузке данных');
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при загрузке данных',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = (rec = null) => {
    if (rec) {
      setSelectedRec(rec);
      setFormData({
        child_id: rec.child_id,
        recommendation_text: rec.recommendation_text
      });
    } else {
      setSelectedRec(null);
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

  const handleOpenSendDialog = (rec) => {
    setSelectedRec(rec);
    setSelectedChild('');
    setOpenSendDialog(true);
  };

  const getParentInfo = (childId) => {
    const child = children.find(c => c.child_id === childId);
    if (!child) return null;
    return parents[child.parent_id] || null;
  };

  const handleSave = async (recommendation) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Saving recommendation:', recommendation);
      
      let savedRecommendation;
      if (recommendation.id) {
        savedRecommendation = await api.updateRecommendation(recommendation.id, recommendation);
      } else {
        savedRecommendation = await api.createRecommendation(recommendation);
      }
      
      console.log('Saved recommendation:', savedRecommendation);

      // Автоматически отправляем рекомендацию родителю
      await api.sendRecommendation(savedRecommendation.recommendation_id);
      
      setOpenDialog(false);
      await fetchData(); // Обновляем данные после сохранения
      
      setSnackbar({
        open: true,
        message: 'Рекомендация успешно сохранена и отправлена родителю',
        severity: 'success'
      });
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

  const handleChildChange = (childId) => {
    setFormData({ ...formData, child_id: childId });
    const child = children.find(c => c.child_id === childId);
    
    if (child) {
      console.log('Selected child with parent data:', {
        child_id: child.child_id,
        parent_id: child.parent_id,
        parent_first_name: child.parent_first_name,
        parent_last_name: child.parent_last_name,
        parent_email: child.parent_email
      });
      
      // Используем данные родителя из таблицы users
      const parent = {
        id: child.parent_id,
        name: `${child.parent_first_name} ${child.parent_last_name}`.trim() || 'Родитель не указан',
        email: child.parent_email
      };
      
      console.log('Constructed parent object:', parent);
      setSelectedParent(parent);
    } else {
      setSelectedParent(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Deleting recommendation:', id);
      
      await api.deleteRecommendation(id);
      await fetchData(); // Обновляем данные после удаления
      
      setSnackbar({
        open: true,
        message: 'Рекомендация успешно удалена',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting recommendation:', err);
      setError(err.message || 'Ошибка при удалении рекомендации');
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при удалении рекомендации',
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
      
      console.log('Sending recommendation:', {
        recommendationId: recommendation.recommendation_id
      });

      await api.sendRecommendation(recommendation.recommendation_id);
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
    const child = children.find(c => c.child_id === rec.child_id);
    const group = groups.find(g => g.group_id === child?.group_id);

    return (
      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardActionArea onClick={() => handleOpenViewDialog(rec)}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {child?.name || 'Неизвестный ребенок'}
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
                <Typography variant="body1" sx={{ mb: 2, color: 'primary.main', fontStyle: 'italic' }}>
                  Нажмите, чтобы просмотреть рекомендацию
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    icon={<PersonIcon />}
                    label={`${rec.user_first_name} ${rec.user_last_name} (${rec.user_role})`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(rec.date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              <Box>
                {canEdit && (
                  <>
                    {rec.user_id === user.id && (
                      <>
                        <IconButton 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(rec);
                          }} 
                          size="small"
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
                    >
                      <EmailIcon />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    );
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Рекомендации
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Добавить рекомендацию
          </Button>
        )}
      </Box>

      {['admin', 'psychologist'].includes(user?.role) ? (
        // Отображение для админа и психолога - сгруппированное по группам и детям
        <Box>
          {Object.entries(organizedData)
            .filter(([groupId]) => groupId !== 'no_group')
            .map(([groupId, groupData]) => (
              <Accordion key={groupId}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon />
                    <Typography variant="h6">
                      {groupData.groupInfo.group_name}
                    </Typography>
                    <Chip
                      label={`${Object.keys(groupData.children).length} детей`}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(groupData.children).map(([childId, childData]) => (
                    <Accordion key={childId}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{childData.childInfo.name}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {childData.recommendations.length > 0 ? (
                          childData.recommendations.map(rec => (
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
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
        </Box>
      ) : (
        // Отображение для родителей - только их рекомендации
        <Paper sx={{ p: 2 }}>
          {recommendations
            .filter(rec => {
              // Находим ребенка по child_id из рекомендации
              const child = children.find(c => c.child_id === rec.child_id);
              // Проверяем, что родитель этого ребенка - текущий пользователь
              return child?.parent_id === user?.id;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Сортируем по дате, новые сверху
            .map((rec) => (
              <Box key={rec.recommendation_id}>
                {renderRecommendationCard(rec)}
              </Box>
            ))}
          {!recommendations.some(rec => {
            const child = children.find(c => c.child_id === rec.child_id);
            return child?.parent_id === user?.id;
          }) && (
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
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setFormData({ ...formData, child_id: '' });
                }}
                label="Группа"
              >
                <MenuItem value="">
                  <em>Выберите группу</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.group_id} value={group.group_id}>
                    {group.group_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Ребенок</InputLabel>
              <Select
                value={formData.child_id}
                onChange={(e) => handleChildChange(e.target.value)}
                label="Ребенок"
                disabled={!selectedGroup}
              >
                <MenuItem value="">
                  <em>Выберите ребенка</em>
                </MenuItem>
                {children
                  .filter(child => child.group_id === selectedGroup)
                  .map((child) => (
                    <MenuItem key={child.child_id} value={child.child_id}>
                      {child.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {formData.child_id && (
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Родитель:
                </Typography>
                <Typography variant="body1">
                  {selectedParent?.name || 'Родитель не найден'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedParent?.email || ''}
                </Typography>
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
          <Button 
            onClick={() => handleSave(selectedRec ? selectedRec : formData)} 
            variant="contained"
            disabled={!formData.child_id || !formData.recommendation_text.trim()}
          >
            {selectedRec ? 'Сохранить' : 'Добавить и отправить'}
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
              Рекомендация для {children.find(c => c.child_id === selectedRec?.child_id)?.name}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              От {selectedRec?.user_first_name} {selectedRec?.user_last_name} • {new Date(selectedRec?.date).toLocaleDateString()}
            </Typography>
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
              lineHeight: 1.6
            }}
          >
            {selectedRec?.recommendation_text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)} variant="contained">
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
                  {children.find(c => c.child_id === selectedRec.child_id)?.name}
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
                  {(() => {
                    const child = children.find(c => c.child_id === selectedRec.child_id);
                    if (!child) return 'Родитель не найден';
                    return `${child.parent_first_name} ${child.parent_last_name}`.trim() || 'Родитель не указан';
                  })()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    const child = children.find(c => c.child_id === selectedRec.child_id);
                    return child?.parent_email || 'Email не указан';
                  })()}
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