module.exports = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });

    // Обработка ошибок валидации
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Ошибка валидации',
            details: err.details
        });
    }

    // Ошибки базы данных
    if (err.code === '23505') { // Уникальное ограничение
        return res.status(409).json({
            error: 'Конфликт данных',
            details: 'Запись с такими данными уже существует'
        });
    }

    if (err.code === '23503') { // Ошибка внешнего ключа
        return res.status(400).json({
            error: 'Ошибка ссылочной целостности',
            details: 'Связанная запись не найдена'
        });
    }

    // Ошибки аутентификации
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Ошибка авторизации',
            message: err.message
        });
    }

    // Ошибки доступа
    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            error: 'Доступ запрещен',
            message: err.message
        });
    }

    // Ошибки "Не найдено"
    if (err.name === 'NotFoundError') {
        return res.status(404).json({
            error: 'Ресурс не найден',
            details: err.message
        });
    }

    // Общая ошибка сервера
    res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Что-то пошло не так'
    });
}; 