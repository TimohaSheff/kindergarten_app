export const ROLE_NAMES = {
  admin: 'Администратор',
  teacher: 'Воспитатель',
  parent: 'Родитель',
  psychologist: 'Психолог'
};

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
  PSYCHOLOGIST: 'psychologist'
};

export const getRoleName = (role) => ROLE_NAMES[role] || role; 