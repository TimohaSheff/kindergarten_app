export const validateGroup = (data) => {
  const errors = {};

  if (!data.group_name?.trim()) {
    errors.group_name = 'Название группы обязательно';
  }

  if (!data.age_range?.trim()) {
    errors.age_range = 'Возрастной диапазон обязателен';
  }

  if (!Array.isArray(data.teacher_id) || data.teacher_id.length === 0) {
    errors.teacher_id = 'Выберите хотя бы одного воспитателя';
  }

  return errors;
}; 