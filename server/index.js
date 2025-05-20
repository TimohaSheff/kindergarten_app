const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool } = require('./config/db');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const childrenRoutes = require('./routes/children');
const groupsRoutes = require('./routes/groups');
const attendanceRoutes = require('./routes/attendance');
const scheduleRoutes = require('./routes/schedule');
const progressRoutes = require('./routes/progress');
const servicesRoutes = require('./routes/services');
const financeRoutes = require('./routes/finance');
const recommendationsRoutes = require('./routes/recommendations');
const menuRoutes = require('./routes/menu');
const contactsRoutes = require('./routes/contacts');
const usersRoutes = require('./routes/users');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const bodyParser = require('body-parser');

const app = express();

// Настройка CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Логирование запросов
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Middleware для проверки Content-Type
app.use((req, res, next) => {
    if ((req.method === 'POST' || req.method === 'PUT') && !req.is('application/json')) {
        return res.status(400).json({ error: 'Content-Type должен быть application/json' });
    }
    next();
});

// Добавляем обработчик ошибок для запросов к БД
const handleDatabaseError = (err, req, res) => {
    logger.error('Ошибка базы данных:', { 
        error: err.message, 
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    if (err.code === 'ECONNREFUSED' || err.code === '57P03' || err.code === '3D000') {
        return res.status(503).json({ error: 'База данных временно недоступна' });
    } else if (err.code === '28P01') {
        return res.status(401).json({ error: 'Ошибка аутентификации базы данных' });
    } else {
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};

// Подключение маршрутов
app.use('/api/auth', authRoutes);
app.use('/api/children', auth, childrenRoutes);
app.use('/api/groups', auth, groupsRoutes);
app.use('/api/attendance', auth, attendanceRoutes);
app.use('/api/schedule', auth, scheduleRoutes);
app.use('/api/progress', auth, progressRoutes);
app.use('/api/services', auth, servicesRoutes);
app.use('/api/finance', auth, financeRoutes);
app.use('/api/recommendations', auth, recommendationsRoutes);
app.use('/api/menu', auth, menuRoutes);
app.use('/api/contacts', auth, contactsRoutes);
app.use('/api/users', usersRoutes);

// Обработка ошибок
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Внутренняя ошибка сервера';
    
    // Проверяем, является ли ошибка ошибкой базы данных
    if (err.code && (
        err.code === 'ECONNREFUSED' || 
        err.code === '57P03' || 
        err.code === '3D000' || 
        err.code === '28P01'
    )) {
        return handleDatabaseError(err, req, res);
    }
    
    logger.error('Ошибка сервера:', { 
        error: err.message,
        stack: err.stack,
        status,
        path: req.path,
        method: req.method,
        query: req.query,
        body: req.body,
        user: req.user
    });

    res.status(status).json({
        error: message,
        details: process.env.NODE_ENV === 'development' ? {
            stack: err.stack,
            query: req.query,
            path: req.path
        } : undefined
    });
});

// Тестовый маршрут
app.get('/', (req, res) => {
    res.json({ message: 'API детского сада работает' });
});

const PORT = process.env.PORT || 3002;

// Запуск сервера
const start = async () => {
    try {
        const client = await pool.connect();
        client.release();
        logger.info('Подключение к базе данных установлено');

        app.listen(PORT, () => {
            logger.info(`Сервер запущен на порту ${PORT}`);
        });
    } catch (error) {
        logger.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
};

start();

module.exports = app; 