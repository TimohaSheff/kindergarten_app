const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.error('JWT_SECRET не установлен в переменных окружения');
    process.exit(1);
}

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            logger.debug('Отсутствует заголовок Authorization');
            return res.status(401).json({ 
                message: 'Отсутствует токен авторизации',
                details: 'Заголовок Authorization не найден'
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            logger.debug('Токен не найден в заголовке Authorization');
            return res.status(401).json({ 
                message: 'Отсутствует токен авторизации',
                details: 'Токен не найден в заголовке'
            });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            logger.debug('Токен успешно проверен', { 
                userId: decoded.id,
                role: decoded.role
            });
            req.user = {
                user_id: String(decoded.id),
                role: decoded.role
            };
            logger.debug('Пользователь установлен в req', { 
                user: req.user
            });
            next();
        } catch (jwtError) {
            logger.debug('Ошибка проверки токена:', { 
                error: jwtError.message,
                name: jwtError.name
            });

            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Срок действия токена истек',
                    details: 'Необходимо выполнить повторный вход'
                });
            }

            return res.status(401).json({ 
                message: 'Недействительный токен',
                details: process.env.NODE_ENV === 'development' ? jwtError.message : undefined
            });
        }
    } catch (error) {
        logger.error('Ошибка в middleware аутентификации:', {
            error: error.message,
            stack: error.stack
        });
        return res.status(500).json({ 
            message: 'Ошибка сервера при проверке аутентификации',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 