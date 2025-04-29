import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
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
  CircularProgress
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/api';

const Activities = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacher: '',
    schedule: '',
    group: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const activitiesData = await api.getActivities();
        setActivities(activitiesData || []);
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке занятий',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await api.createActivity(formData);
      setOpenDialog(false);
      setSnackbar({
        open: true,
        message: 'Занятие успешно добавлено',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Ошибка при добавлении занятия',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Занятия
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Добавить занятие
          </Button>
        </Box>

        <Grid container spacing={3}>
          {activities.map((activity) => (
            <Grid item xs={12} md={6} key={activity.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {activity.name}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Описание:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {activity.description}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Преподаватель:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {activity.teacher}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Расписание:
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {activity.schedule}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Группа:
                  </Typography>
                  <Typography variant="body1">
                    {activity.group}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Добавить занятие</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Преподаватель"
              value={formData.teacher}
              onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Расписание"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
            <Button onClick={handleSubmit} variant="contained">
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
    </Container>
  );
};

export default Activities; 