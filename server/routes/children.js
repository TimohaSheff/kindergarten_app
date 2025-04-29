const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const db = require('../config/db');
const photoUtils = require('../utils/photoUtils');

// Получить всех детей
router.get('/', auth, async (req, res) => {
    try {
        let queryText = `
            SELECT 
                c.*,
                g.group_name,
                u.first_name as parent_first_name,
                u.last_name as parent_last_name,
                u.email as parent_email,
                u.user_id as parent_user_id
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users u ON c.parent_id = u.user_id
        `;
        
        const params = [];

        // Если пользователь - родитель, показываем только его детей
        if (req.user.role === 'parent') {
            queryText += ' WHERE c.parent_id = $1';
            params.push(req.user.user_id);
        }
        // Если пользователь - учитель, показываем только детей из его группы
        else if (req.user.role === 'teacher') {
            queryText += ' WHERE g.group_id IN (SELECT group_id FROM users WHERE user_id = $1)';
            params.push(req.user.user_id);
        }
        // Для админа и психолога показываем всех детей без ограничений
        else if (!['admin', 'psychologist'].includes(req.user.role)) {
            return res.status(403).json({ message: 'У вас нет прав для просмотра списка детей' });
        }

        queryText += ' ORDER BY c.name';

        console.log('Executing query:', queryText);
        console.log('With params:', params);

        const result = await db.query(queryText, params);
        
        console.log('Raw database result (first row):', JSON.stringify(result.rows[0], null, 2));
        
        // Преобразуем данные для фронтенда
        const children = result.rows.map(child => {
            console.log('Processing child data:', {
                child_id: child.child_id,
                name: child.name,
                parent_id: child.parent_id,
                parent_user_id: child.parent_user_id,
                parent_first_name: child.parent_first_name,
                parent_last_name: child.parent_last_name,
                parent_email: child.parent_email
            });
            
            return {
                ...child,
                parent_name: child.parent_first_name && child.parent_last_name 
                    ? `${child.parent_first_name} ${child.parent_last_name}`
                    : 'Родитель не указан',
                parent_email: child.parent_email || 'Email не указан'
            };
        });
        
        console.log('Processed children data (first child):', JSON.stringify(children[0], null, 2));
        
        res.json(children);
    } catch (err) {
        console.error('Ошибка при получении списка детей:', err);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Получить конкретного ребенка
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        // Проверка доступа
        if (req.user.role === 'parent') {
            const isParent = await db.query(
                'SELECT 1 FROM children WHERE child_id = $1 AND parent_id = $2',
                [id, req.user.user_id]
            );
            if (!isParent.rows.length) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }
        }

        const result = await db.query(`
            SELECT c.*, 
                   g.group_name,
                   u.first_name as parent_first_name,
                   u.last_name as parent_last_name
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users u ON c.parent_id = u.user_id
            WHERE c.child_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ребенок не найден' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать нового ребенка
router.post('/', [
    auth,
    (req, res, next) => checkRole(['admin'])(req, res, next),
    body('name').trim().notEmpty().withMessage('Имя обязательно для заполнения'),
    body('date_of_birth').isDate().withMessage('Некорректная дата рождения'),
    body('parent_id').isInt().withMessage('Некорректный ID родителя'),
    body('group_id').isInt().withMessage('Некорректный ID группы'),
    body('allergies').optional().trim(),
    body('services').optional().isArray().withMessage('Некорректный формат услуг'),
    body('photo').optional().isArray().withMessage('Фото должно быть массивом байтов'),
    body('photo_mime_type').optional().isIn(['image/jpeg', 'image/png', 'image/webp']).withMessage('Неподдерживаемый формат изображения')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, date_of_birth, parent_id, group_id, allergies, services, photo } = req.body;

        // Сохраняем фото, если оно есть
        let photoPath = null;
        if (photo) {
            try {
                photoPath = await photoUtils.savePhoto(photo, 'child');
            } catch (photoError) {
                console.error('Ошибка при сохранении фото:', photoError);
            }
        }

        const result = await db.query(
            `INSERT INTO children (name, date_of_birth, parent_id, group_id, allergies, services, photo_path)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, date_of_birth, parent_id, group_id, allergies, services, photoPath]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при создании записи ребенка:', error);
        res.status(500).json({ message: 'Ошибка сервера', error: error.message });
    }
});

// Обновить информацию о ребенке
router.put('/:id', [
    auth,
    (req, res, next) => checkRole(['admin'])(req, res, next)
], async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date_of_birth, parent_id, group_id, allergies, services, photo } = req.body;

        // Получаем текущие данные ребенка
        const currentChild = await db.query(
            'SELECT photo_path FROM children WHERE child_id = $1',
            [id]
        );

        // Обрабатываем фото
        let photoPath = currentChild.rows[0]?.photo_path;
        if (photo) {
            // Удаляем старое фото
            if (photoPath) {
                await photoUtils.deletePhoto(photoPath);
            }
            // Сохраняем новое фото
            try {
                photoPath = await photoUtils.savePhoto(photo, 'child');
            } catch (photoError) {
                console.error('Ошибка при сохранении фото:', photoError);
            }
        }

        const result = await db.query(
            `UPDATE children 
             SET name = $1, date_of_birth = $2, parent_id = $3, group_id = $4, 
                 allergies = $5, services = $6, photo_path = $7
             WHERE child_id = $8
             RETURNING *`,
            [name, date_of_birth, parent_id, group_id, allergies, services, photoPath, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ребенок не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении данных ребенка:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера', 
            error: error.message,
            details: error.stack
        });
    }
});

// Удалить ребенка
router.delete('/:id', [
    auth,
    (req, res, next) => checkRole(['admin'])(req, res, next)
], async (req, res) => {
    try {
        const { id } = req.params;

        // Начинаем транзакцию
        await db.query('BEGIN');

        try {
            // Проверяем существование ребенка
            const childCheck = await db.query(
                'SELECT child_id, photo_path FROM children WHERE child_id = $1',
                [id]
            );

            if (childCheck.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ message: 'Ребенок не найден' });
            }

            // Удаляем связанные рекомендации
            await db.query(
                'DELETE FROM recommendations WHERE child_id = $1',
                [id]
            );

            // Удаляем записи посещаемости
            await db.query(
                'DELETE FROM attendance WHERE child_id = $1',
                [id]
            );

            // Удаляем фото, если оно существует
            if (childCheck.rows[0].photo_path) {
                await photoUtils.deletePhoto(childCheck.rows[0].photo_path);
            }

            // Удаляем самого ребенка
            const result = await db.query(
                'DELETE FROM children WHERE child_id = $1 RETURNING *',
                [id]
            );

            // Если все операции успешны, фиксируем транзакцию
            await db.query('COMMIT');

            res.json({ message: 'Ребенок и все связанные данные успешно удалены' });
        } catch (error) {
            // В случае ошибки откатываем все изменения
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при удалении ребенка:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при удалении ребенка', 
            error: error.message 
        });
    }
});

module.exports = router; 