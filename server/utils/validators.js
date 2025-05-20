const validateDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

const validateTime = (time) => {
  if (!time) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

const validateAttendance = (data) => {
  const errors = {};

  if (!data.child_id) {
    errors.child_id = 'ID ребенка обязателен';
  }

  if (!validateDate(data.date)) {
    errors.date = 'Некорректная дата';
  }

  if (data.arrival_time && !validateTime(data.arrival_time)) {
    errors.arrival_time = 'Некорректное время прибытия';
  }

  if (data.departure_time && !validateTime(data.departure_time)) {
    errors.departure_time = 'Некорректное время ухода';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = {
  validateDate,
  validateTime,
  validateAttendance
}; 