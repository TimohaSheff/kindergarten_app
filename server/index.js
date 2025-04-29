const express = require('express');
const cors = require('cors');
const { query, pool } = require('./config/db');
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

const app = express();
const PORT = process.env.PORT || 3002;

// Настройки CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-production-domain.com']
        : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    credentials: true
}));

// Добавляем логирование запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

app.use(express.json());

// Middleware для проверки Content-Type
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'Content-Type должен быть application/json' });
        }
    }
    next();
});

// Проверка подключения к базе данных
app.use(async (req, res, next) => {
    try {
        await pool.query('SELECT 1');
        next();
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ error: 'Database connection error' });
    }
});

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
app.use('/api/users', auth, usersRoutes);

// Обработчик ошибок должен быть последним middleware
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 