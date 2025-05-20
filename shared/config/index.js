// Базовые URL и API конфигурация
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_BASE_URL || 'http://localhost:3002',
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Конфигурация загрузки файлов
export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  UPLOAD_PATH: 'uploads',
  PHOTOS_PATH: 'uploads/photos'
};

// Конфигурация аутентификации
export const AUTH_CONFIG = {
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 6
};

// Роли пользователей и их права
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
  PSYCHOLOGIST: 'psychologist'
};

// Маршруты для ролей
export const ROLE_ROUTES = {
  [ROLES.ADMIN]: [
    '/dashboard',
    '/children',
    '/groups',
    '/users',
    '/schedule',
    '/menu',
    '/progress',
    '/attendance',
    '/services'
  ],
  [ROLES.TEACHER]: [
    '/dashboard',
    '/children',
    '/schedule',
    '/menu',
    '/progress',
    '/attendance'
  ],
  [ROLES.PARENT]: [
    '/dashboard',
    '/children',
    '/schedule',
    '/menu',
    '/progress',
    '/attendance',
    '/services'
  ],
  [ROLES.PSYCHOLOGIST]: [
    '/dashboard',
    '/children',
    '/progress'
  ]
};

// Конфигурация базы данных
export const DB_CONFIG = {
  MAX_POOL_SIZE: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 10000,
  QUERY_TIMEOUT: 10000
}; 