import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { childrenApi } from '../api/api';

const ChildrenCards = ({ canEdit = false, showOnlyOwnGroup = false }) => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    fullName: '',
    parentName: '',
    birthDate: '',
    group: '',
    photoUrl: '',
    allergies: '',
    activities: [],
    phone: ''
  });

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        let childrenData = await childrenApi.getAll({});
        
        if (showOnlyOwnGroup && user?.role === 'teacher') {
          childrenData = childrenData.filter(child => child.group === user.group);
        }

        setChildren(childrenData);
      } catch (error) {
        console.error('Error fetching children:', error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке данных',
          severity: 'error'
        });
      }
    };

    fetchChildren();
  }, [showOnlyOwnGroup, user]);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleOpenDialog = (child = null) => {
    if (child) {
      setSelectedChild(child);
      setFormData({
        fullName: child.fullName,
        parentName: child.parentName,
        birthDate: child.birthDate,
        group: child.group,
        photoUrl: child.photoUrl,
        allergies: child.allergies,
        activities: child.activities,
        phone: child.phone
      });
    } else {
      setSelectedChild(null);
      setFormData({
        fullName: '',
        parentName: '',
        birthDate: '',
        group: '',
        photoUrl: '',
        allergies: '',
        activities: [],
        phone: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedChild(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedChild) {
        await childrenApi.updateChild(selectedChild.id, formData);
        setChildren(children.map(child =>
          child.id === selectedChild.id ? { ...child, ...formData } : child
        ));
      } else {
        const newChild = await childrenApi.createChild(formData);
        setChildren([...children, newChild]);
      }
      handleCloseDialog();
      setSnackbar({
        open: true,
        message: selectedChild ? 'Данные успешно обновлены' : 'Ребенок успешно добавлен',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving child:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при сохранении данных',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await childrenApi.deleteChild(id);
      setChildren(children.filter(child => child.id !== id));
      setSnackbar({
        open: true,
        message: 'Карточка удалена',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting child:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при удалении',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography 
          variant="h4" 
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Список детей
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
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
            Добавить ребенка
          </Button>
        )}
      </Box>

      <Grid container spacing={3}>
        {canEdit && (
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                height: '100%',
                minHeight: '450px',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(99, 102, 241, 0.04)',
                border: '2px dashed rgba(99, 102, 241, 0.2)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '2px dashed rgba(99, 102, 241, 0.4)',
                }
              }}
              onClick={() => handleOpenDialog()}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 2
              }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: 'primary.main'
                  }}
                >
                  <AddIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'primary.main',
                    fontWeight: 600
                  }}
                >
                  Добавить ребенка
                </Typography>
              </Box>
            </Card>
          </Grid>
        )}
        {children.map((child) => (
          <Grid item xs={12} sm={6} md={4} key={child.id}>
            <Card sx={{ 
              height: '100%',
              minHeight: '450px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
              }
            }}>
              <CardMedia
                component="img"
                height="200"
                image={child.photoUrl || 'https://via.placeholder.com/200'}
                alt={child.fullName}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {child.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Возраст: {calculateAge(child.birthDate)} лет
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Родитель: {child.parentName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Телефон: {child.phone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Группа: {child.group}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Аллергии: {child.allergies}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Занятия:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {child.activities.map((activity, index) => (
                      <Chip
                        key={index}
                        label={activity}
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          color: 'primary.main'
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {canEdit && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <IconButton
                      onClick={() => handleOpenDialog(child)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(child.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedChild ? 'Редактировать данные' : 'Добавить ребенка'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="ФИО ребенка"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <TextField
              fullWidth
              label="ФИО родителя"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
            />
            <TextField
              fullWidth
              label="Телефон"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <TextField
              fullWidth
              label="Дата рождения"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Группа</InputLabel>
              <Select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                label="Группа"
              >
                <MenuItem value="Младшая группа">Младшая группа</MenuItem>
                <MenuItem value="Средняя группа">Средняя группа</MenuItem>
                <MenuItem value="Старшая группа">Старшая группа</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="URL фотографии"
              value={formData.photoUrl}
              onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
            />
            <TextField
              fullWidth
              label="Аллергии"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Занятия (через запятую)"
              value={formData.activities.join(', ')}
              onChange={(e) => setFormData({ 
                ...formData, 
                activities: e.target.value.split(',').map(item => item.trim()).filter(Boolean)
              })}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedChild ? 'Сохранить' : 'Добавить'}
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

export default ChildrenCards; 