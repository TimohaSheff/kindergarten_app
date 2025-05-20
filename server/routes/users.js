const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const photoUtils = require('../utils/photoUtils');

// Получить всех пользователей (только для админа и психолога)
router.get('/', [auth, checkRole(['admin', 'psychologist'])], async (req, res) => {
    try {
        // Получаем всех пользователей
        const users = await db.query(`
            SELECT 
                u.user_id,
                u.email,
                u.role,
                u.first_name,
                u.last_name,
                u.phone
            FROM users u 
            ORDER BY u.role, u.last_name, u.first_name
        `);

        console.log('Получены пользователи:', users.rows);

        // Получаем информацию о группах для учителей
        const teacherGroups = await db.query(`
            SELECT 
                UNNEST(teacher_id::int[]) as user_id,
                array_agg(group_name) as groups
            FROM groups 
            GROUP BY UNNEST(teacher_id::int[])
        `);

        console.log('Получены группы учителей:', teacherGroups.rows);

        // Получаем информацию о детях для родителей
        const parentChildren = await db.query(`
            SELECT 
                c.parent_id as user_id,
                array_agg(c.name) as children
            FROM children c
            GROUP BY c.parent_id
        `);

        console.log('Получены дети родителей:', parentChildren.rows);

        // Создаем мапы для быстрого доступа
        const groupsMap = new Map(teacherGroups.rows.map(t => [t.user_id.toString(), t.groups]));
        const childrenMap = new Map(parentChildren.rows.map(p => [p.user_id.toString(), p.children]));

        // Объединяем данные
        const enrichedUsers = users.rows.map(user => {
            const userId = user.user_id.toString();
            return {
                ...user,
                groups: user.role === 'teacher' ? groupsMap.get(userId) || [] : [],
                children: user.role === 'parent' ? childrenMap.get(userId) || [] : []
            };
        });

        console.log('Отправляем обогащенных пользователей:', enrichedUsers);
        res.json(enrichedUsers);
    } catch (err) {
        console.error('Ошибка при получении пользователей:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить текущего пользователя
router.get('/me', [auth], async (req, res) => {
    try {
        const user = await db.query(
            'SELECT user_id, email, role, first_name, last_name, created_at FROM users WHERE user_id = $1',
            [req.user.user_id]
        );
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить профиль пользователя
router.put('/me', [
    auth,
    body('first_name').optional().trim().notEmpty(),
    body('last_name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { first_name, last_name, email, phone } = req.body;
        const updates = {};
        
        if (first_name) updates.first_name = first_name;
        if (last_name) updates.last_name = last_name;
        if (email) updates.email = email;
        if (phone) updates.phone = phone;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Нет данных для обновления' });
        }

        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = Object.values(updates);
        const query = `
            UPDATE users 
            SET ${setClause}
            WHERE user_id = $1
            RETURNING user_id, email, role, first_name, last_name, phone
        `;

        const result = await db.query(query, [req.user.user_id, ...values]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить пользователя (только для админа)
router.put('/:id', [
    auth,
    checkRole(['admin']),
    body('first_name').optional().trim().notEmpty(),
    body('last_name').optional().trim().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'teacher', 'parent', 'psychologist'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone, role } = req.body;
        const updates = {};
        
        if (first_name) updates.first_name = first_name;
        if (last_name) updates.last_name = last_name;
        if (email) updates.email = email;
        if (phone) updates.phone = phone;
        if (role) updates.role = role;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Нет данных для обновления' });
        }

        // Проверяем существование пользователя
        const userExists = await db.query('SELECT user_id FROM users WHERE user_id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Проверяем уникальность email
        if (email) {
            const emailExists = await db.query(
                'SELECT user_id FROM users WHERE email = $1 AND user_id != $2',
                [email, id]
            );
            if (emailExists.rows.length > 0) {
                return res.status(400).json({ message: 'Email уже используется' });
            }
        }

        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = Object.values(updates);
        const updateQuery = `
            UPDATE users 
            SET ${setClause}
            WHERE user_id = $1
            RETURNING user_id, email, role, first_name, last_name, phone
        `;

        const result = await db.query(updateQuery, [id, ...values]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить пользователя (только для админа)
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const { id } = req.params;

        // Проверяем, не пытается ли админ удалить самого себя
        if (id === req.user.user_id) {
            return res.status(400).json({ message: 'Нельзя удалить свой аккаунт' });
        }

        // Проверяем существование пользователя
        const userExists = await db.query('SELECT user_id FROM users WHERE user_id = $1', [id]);
        if (userExists.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        await db.query('DELETE FROM users WHERE user_id = $1', [id]);
        res.json({ message: 'Пользователь успешно удален' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить профиль пользователя
router.get('/:id', [auth, checkRole(['admin', 'psychologist'])], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT user_id, email, role, first_name, last_name, phone, photo_path, created_at FROM users WHERE user_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        // Преобразуем данные перед отправкой
        const userData = {
            ...result.rows[0],
            avatar: result.rows[0].photo_path // Добавляем поле avatar для совместимости
        };

        res.json(userData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать нового пользователя (только для админа)
router.post('/', [
    auth,
    checkRole(['admin']),
    body('first_name').trim().notEmpty().withMessage('Имя обязательно'),
    body('last_name').trim().notEmpty().withMessage('Фамилия обязательна'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').notEmpty().withMessage('Пароль обязателен'),
    body('role').isIn(['admin', 'teacher', 'parent', 'psychologist']).withMessage('Некорректная роль'),
    body('phone').optional().trim()
], async (req, res) => {
    try {
        console.log('Получен запрос на создание пользователя:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { first_name, last_name, email, password, role, phone } = req.body;

        // Проверяем, не существует ли уже пользователь с таким email
        const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }

        // Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Создаем нового пользователя
        const result = await db.query(`
            INSERT INTO users (first_name, last_name, email, password_hash, role, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING user_id, email, role, first_name, last_name, phone
        `, [first_name, last_name, email, hashedPassword, role, phone]);

        console.log('Пользователь успешно создан:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка при создании пользователя:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании пользователя' });
    }
});

// Получить список родителей
router.get('/parents', auth, async (req, res) => {
    try {
        console.log('GET /parents: Начало обработки запроса');
        console.log('GET /parents: Данные пользователя из auth:', req.user);
        
        // Запрос родителей с информацией о детях
        const query = `
            SELECT 
                u.user_id,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                ARRAY_AGG(
                    JSONB_BUILD_OBJECT(
                        'child_id', c.child_id,
                        'name', c.name
                    )
                ) FILTER (WHERE c.child_id IS NOT NULL) as children
            FROM users u
            LEFT JOIN children c ON u.user_id = c.parent_id
            WHERE u.role = 'parent'
            GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.phone
        `;
        console.log('GET /parents: Выполняем запрос:', query);

        let parentResult;
        try {
            parentResult = await db.query(query);
            console.log('GET /parents: Результат запроса:', parentResult);
            console.log('GET /parents: Найдено родителей:', parentResult.rows.length);
        } catch (queryError) {
            console.error('GET /parents: Ошибка при выполнении запроса:', queryError);
            throw queryError;
        }

        // Преобразуем данные в нужный формат
        const parents = parentResult.rows.map(parent => {
            const data = {
                user_id: parent.user_id,
                email: parent.email || '',
                name: `${parent.first_name || ''} ${parent.last_name || ''}`.trim(),
                phone: parent.phone || '',
                children: parent.children || []
            };
            console.log('GET /parents: Подготовлены данные для родителя:', data);
            return data;
        });

        console.log('GET /parents: Отправка ответа с', parents.length, 'родителями');
        return res.json(parents);
    } catch (error) {
        console.error('GET /parents: Ошибка:', error);
        res.status(500).json({ 
            message: 'Ошибка при получении списка родителей',
            error: error.message 
        });
    }
});

// Получение всех пользователей с фильтрацией по роли
router.get('/', auth, async (req, res) => {
  try {
    const { role } = req.query;
    let query = 'SELECT user_id, name, email, role FROM users';
    const values = [];

    if (role) {
      query += ' WHERE role = $1';
      values.push(role);
    }

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// Получить список учителей (доступно для всех аутентифицированных пользователей)
router.get('/teachers', auth, async (req, res) => {
    try {
        // Получаем всех учителей
        const teachers = await db.query(`
            SELECT 
                u.user_id,
                u.email,
                u.role,
                u.first_name,
                u.last_name,
                u.phone
            FROM users u 
            WHERE u.role = 'teacher'
            ORDER BY u.last_name, u.first_name
        `);

        // Получаем информацию о группах для учителей
        const teacherGroups = await db.query(`
            SELECT 
                UNNEST(teacher_id::int[]) as user_id,
                array_agg(group_name) as groups
            FROM groups 
            GROUP BY UNNEST(teacher_id::int[])
        `);

        // Создаем мапу для быстрого доступа к группам
        const groupsMap = new Map(teacherGroups.rows.map(t => [t.user_id.toString(), t.groups]));

        // Объединяем данные
        const enrichedTeachers = teachers.rows.map(teacher => ({
            ...teacher,
            groups: groupsMap.get(teacher.user_id.toString()) || []
        }));

        res.json(enrichedTeachers);
    } catch (err) {
        console.error('Ошибка при получении списка учителей:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
            return cb(new Error('Неподдерживаемый формат файла'));
        }
        cb(null, true);
    }
});

// Загрузка фотографии профиля
router.post('/:id/profile-photo', [
    auth,
    body('photo').notEmpty().withMessage('Фото не предоставлено'),
    body('photo_mime_type').isIn(['image/jpeg', 'image/png', 'image/gif']).withMessage('Неподдерживаемый формат файла')
], async (req, res) => {
    try {
        console.log('Начало обработки запроса загрузки фото');
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Ошибки валидации:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        // Проверяем, что пользователь обновляет свой профиль или является админом
        console.log('Проверка прав пользователя:', {
            requestedId: req.params.id,
            userId: req.user.user_id,
            userRole: req.user.role
        });

        if (req.params.id != req.user.user_id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Нет прав для выполнения операции' });
        }

        const userId = req.params.id;
        const { photo, photo_mime_type } = req.body;

        console.log('Получены данные:', {
            userId,
            hasPhoto: !!photo,
            photoLength: photo?.length,
            mimeType: photo_mime_type
        });

        // Проверяем формат base64
        if (!photo.startsWith('data:image/')) {
            console.error('Некорректный формат base64 данных');
            return res.status(400).json({ message: 'Некорректный формат данных изображения' });
        }

        // Сохраняем фото из base64
        console.log('Начало сохранения фото...');
        const photoPath = await photoUtils.processBase64Photo(photo, userId);

        console.log('Результат сохранения фото:', { photoPath });

        if (!photoPath) {
            console.error('Ошибка: photoPath пустой после сохранения');
            return res.status(400).json({ message: 'Ошибка при обработке фото' });
        }

        // Обновляем путь к фото в базе данных
        console.log('Обновление записи в базе данных...');
        const query = `
            UPDATE users 
            SET photo_path = $1
            WHERE user_id = $2
            RETURNING user_id, photo_path as avatar, first_name, last_name, email, phone, role, created_at
        `;

        const result = await db.query(query, [photoPath, userId]);

        console.log('Результат обновления в БД:', {
            success: result.rows.length > 0,
            userData: result.rows[0]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        const response = { 
            message: 'Фото профиля обновлено',
            avatarUrl: photoPath,
            ...result.rows[0]
        };

        console.log('Отправка успешного ответа:', response);
        res.json(response);

    } catch (err) {
        console.error('Ошибка при загрузке фото:', {
            error: err,
            message: err.message,
            stack: err.stack
        });
        res.status(500).json({ 
            message: 'Ошибка при загрузке фото',
            details: err.message 
        });
    }
});

module.exports = router; 