// Уровни логирования
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// Конфигурация логгера
const config = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG,
  prefix: '[KindergartenApp]'
};

// Форматирование сообщения
const formatMessage = (level, message, details = null) => {
  const timestamp = new Date().toISOString();
  const formattedMessage = `${config.prefix} [${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (details) {
    return `${formattedMessage}\n${JSON.stringify(details, null, 2)}`;
  }
  
  return formattedMessage;
};

// Основные методы логирования
export const logger = {
  debug: (message, details = null) => {
    if (config.level === LOG_LEVELS.DEBUG) {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, message, details));
    }
  },

  info: (message, details = null) => {
    if ([LOG_LEVELS.DEBUG, LOG_LEVELS.INFO].includes(config.level)) {
      console.info(formatMessage(LOG_LEVELS.INFO, message, details));
    }
  },

  warn: (message, details = null) => {
    if ([LOG_LEVELS.DEBUG, LOG_LEVELS.INFO, LOG_LEVELS.WARN].includes(config.level)) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, details));
    }
  },

  error: (message, details = null) => {
    console.error(formatMessage(LOG_LEVELS.ERROR, message, details));
  }
};

// Конфигурация логгера
export const configureLogger = (options = {}) => {
  Object.assign(config, options);
};

export default logger; 