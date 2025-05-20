import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';

const ScheduleForm = ({
  open,
  onClose,
  onSave,
  formData,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange
}) => {
  const [localFormData, setLocalFormData] = React.useState(formData);

  React.useEffect(() => {
    setLocalFormData(formData);
  }, [formData]);

  const handleActionChange = (e) => {
    setLocalFormData(prev => ({
      ...prev,
      action: e.target.value
    }));
  };

  const handleSubmit = () => {
    onSave({
      ...localFormData,
      time_of_day: `${startTime?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}-${endTime?.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {formData.action ? 'Редактировать расписание' : 'Добавить расписание'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Действие"
          fullWidth
          value={localFormData.action}
          onChange={handleActionChange}
          sx={{ mb: 2 }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <TimePicker
            label="Время начала"
            value={startTime}
            onChange={onStartTimeChange}
            renderInput={(params) => <TextField {...params} fullWidth sx={{ mb: 2 }} />}
          />
          <TimePicker
            label="Время окончания"
            value={endTime}
            onChange={onEndTimeChange}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Сохранить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleForm; 