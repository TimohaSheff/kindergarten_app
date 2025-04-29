const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const authenticateToken = (req, res, next) => {
    console.log('Аутентификация - начало');
    console.log('Headers:', req.headers);
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Токен из заголовка:', token);

    if (!token) {
        console.log('Токен не найден');
        return res.status(401).json({ message: 'Требуется аутентификация' });
    }

    try {
        console.log('Попытка верификации токена');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Декодированный токен:', decoded);
        
        req.user = decoded;
        console.log('Пользователь установлен в req.user:', req.user);
        next();
    } catch (error) {
        console.error('Ошибка при верификации токена:', error);
        return res.status(403).json({ message: 'Недействительный токен' });
    }
};

module.exports = authenticateToken; 