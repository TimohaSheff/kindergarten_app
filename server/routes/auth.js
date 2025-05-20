const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Проверяем наличие JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.error('JWT_SECRET не установлен в переменных окружения');
    process.exit(1);
}

// Валидация для регистрации
const registerValidation = [
    body('email')
        .isEmail()
        .withMessage('Пожалуйста, введите корректный email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Пароль должен быть не менее 6 символов'),
    body('role')
        .isIn(['admin', 'teacher', 'parent'])
        .withMessage('Роль должна быть admin, teacher или parent'),
    body('first_name')
        .notEmpty()
        .withMessage('Имя обязательно для заполнения'),
    body('last_name')
        .notEmpty()
        .withMessage('Фамилия обязательна для заполнения')
];

// Валидация для входа
const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('Пожалуйста, введите корректный email')
        .normalizeEmail()
        .trim(),
    body('password')
        .notEmpty()
        .withMessage('Пароль обязателен для заполнения')
        .trim()
];

// Регистрация пользователя
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: errors.array() 
            });
        }

        const { email, password, role, first_name, last_name, phone } = req.body;

        // Проверка существования пользователя
        const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // Хеширование пароля
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создание пользователя
        const result = await query(
            'INSERT INTO users (email, password_hash, role, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, email, role, first_name, last_name, created_at',
            [email, hashedPassword, role, first_name, last_name, phone]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            token,
            user: {
                id: String(user.user_id),
                user_id: String(user.user_id),
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('Ошибка при регистрации:', err);
        res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
});

// Вход пользователя
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: errors.array().map(err => err.msg)
            });
        }

        const { email, password } = req.body;
        logger.debug('Попытка входа', { email });

        // Проверяем наличие email и пароля
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email и пароль обязательны для входа'
            });
        }

        // Поиск пользователя
        const result = await query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            logger.debug('Пользователь не найден', { email });
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        // Проверка пароля
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            logger.debug('Неверный пароль', { email });
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { id: String(user.user_id), role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        logger.info('Успешный вход пользователя:', { 
            email: user.email, 
            role: user.role,
            userId: user.user_id,
            decodedToken: jwt.decode(token)
        });

        const userData = {
            id: String(user.user_id),
            user_id: String(user.user_id),
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            created_at: user.created_at
        };

        logger.info('Отправка данных пользователя:', userData);

        res.json({
            token,
            user: userData
        });
    } catch (err) {
        logger.error('Ошибка при входе:', {
            error: err.message,
            stack: err.stack,
            email: req.body.email
        });
        res.status(500).json({ 
            message: 'Ошибка сервера при входе в систему',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Получение информации о текущем пользователе
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            logger.debug('Токен не предоставлен в запросе /me');
            return res.status(401).json({ message: 'Токен не предоставлен' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (jwtError) {
            logger.debug('Ошибка проверки токена:', { error: jwtError.message });
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Недействительный токен' });
            }
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Срок действия токена истек' });
            }
            throw jwtError;
        }

        const result = await query(
            'SELECT user_id, email, role, first_name, last_name, phone, created_at FROM users WHERE user_id = $1',
            [decoded.id]
        );

        const user = result.rows[0];
        if (!user) {
            logger.debug('Пользователь не найден при запросе /me', { userId: decoded.id });
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (err) {
        logger.error('Ошибка при получении данных пользователя:', {
            error: err.message,
            stack: err.stack
        });
        res.status(500).json({ 
            message: 'Ошибка сервера при получении данных пользователя',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router; 