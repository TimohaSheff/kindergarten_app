const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Настройка CORS
app.use(cors());

// Парсинг JSON с увеличенным лимитом
app.use(express.json({ limit: '50mb' }));

// Создаем директорию для загрузок, если она не существует
const uploadsDir = path.join(__dirname, '../uploads');
const photosDir = path.join(uploadsDir, 'photos');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
    console.log('Created photos directory:', photosDir);
}

// Логирование запросов к статическим файлам
app.use('/uploads', (req, res, next) => {
    const fullPath = path.join(__dirname, '..', req.url);
    const exists = fs.existsSync(fullPath);
    
    console.log('Static file request:', {
        url: req.url,
        fullPath,
        exists,
        method: req.method,
        headers: req.headers
    });

    if (!exists) {
        console.error('File not found:', fullPath);
        return res.status(404).json({ error: 'File not found' });
    }

    // Проверяем права доступа к файлу
    try {
        fs.accessSync(fullPath, fs.constants.R_OK);
    } catch (err) {
        console.error('File access error:', err);
        return res.status(403).json({ error: 'Access denied' });
    }

    next();
});

// Настройка статических файлов
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res, filePath) => {
        // Устанавливаем правильные заголовки CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
        
        // Устанавливаем правильный Content-Type для изображений
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.set('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
            res.set('Content-Type', 'image/png');
        } else if (filePath.endsWith('.webp')) {
            res.set('Content-Type', 'image/webp');
        }
        
        // Отключаем кэширование для отладки
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}));

// Обработка ошибок для статических файлов
app.use((err, req, res, next) => {
    console.error('Server error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    
    if (err.status === 404) {
        res.status(404).json({ error: 'File not found' });
    } else {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Глобальная ошибка:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        headers: req.headers,
        user: req.user
    });

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Неверный формат JSON' });
    }

    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Произошла ошибка'
    });
});

// ... existing code ... 