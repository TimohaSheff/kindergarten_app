const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const app = express();

// Настройка CORS
app.use(cors());

// Централизованное логирование запросов
app.use((req, res, next) => {
    logger.info('Входящий запрос', {
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params
    });
    next();
});

// Парсинг JSON с увеличенным лимитом
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Настройка статических файлов
const uploadsDir = path.join(__dirname, 'uploads');

// Создаем директорию при запуске
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Создана директория:', uploadsDir);
}

// Проверяем содержимое директории uploads
fs.readdir(uploadsDir, (err, files) => {
    if (err) {
        logger.error('Ошибка при чтении директории uploads:', err);
    } else {
        logger.info('Содержимое директории uploads:', {
            directory: uploadsDir,
            files: files
        });
        // Проверяем каждый файл
        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            try {
                const stats = fs.statSync(filePath);
                logger.info('Информация о файле:', {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    isFile: stats.isFile(),
                    permissions: stats.mode.toString(8),
                    created: stats.birthtime,
                    modified: stats.mtime
                });
            } catch (error) {
                logger.error('Ошибка при проверке файла:', {
                    file,
                    error: error.message
                });
            }
        });
    }
});

// Настройка обработки статических файлов
app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res) => {
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
    }
}));

// Логирование запросов к файлам
app.use('/uploads', (req, res, next) => {
    const requestedPath = req.path;
    const fullPath = path.join(uploadsDir, requestedPath);
    
    logger.info('Запрос файла:', {
        requestedPath,
        fullPath,
        exists: fs.existsSync(fullPath),
        method: req.method,
        headers: req.headers,
        dirContents: {
            uploads: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
        }
    });
    
    next();
});

// Подключаем маршрутизаторы
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const childrenRouter = require('./routes/children');
const groupsRouter = require('./routes/groups');
const servicesRouter = require('./routes/services');
const menuRouter = require('./routes/menu');

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/children', childrenRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/menu', menuRouter);

// Обработка ошибок
app.use((err, req, res, next) => {
    logger.error('Ошибка сервера:', err);
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app; 