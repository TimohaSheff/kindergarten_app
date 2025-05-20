const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');
const { sendEmail } = require('../config/email');

// Валидация для создания/обновления рекомендации
const recommendationValidation = [
    body('child_id').isInt().withMessage('ID ребенка должно быть числом'),
    body('recommendation_text').notEmpty().trim().withMessage('Текст рекомендации не может быть пустым')
];

// Получение всех рекомендаций
router.get('/', auth, async (req, res) => {
    try {
        // Получаем корректный ID пользователя
        const userId = req.user.user_id || req.user.id;
        
        console.log('Getting recommendations for user:', {
            id: userId,
            role: req.user.role,
            originalUser: req.user,
            isAdmin: req.user.role === 'admin'
        });

        // Сначала проверим наличие рекомендаций
        const recommendationsCheck = await query('SELECT COUNT(*) FROM recommendations');
        console.log('Total recommendations in database:', recommendationsCheck.rows[0].count);

        let queryText = `
            SELECT 
                r.recommendation_id,
                r.child_id,
                r.recommendation_text,
                r.date,
                r.is_sent,
                r.user_id,
                r.parent_id,
                c.name as child_name,
                c.group_id,
                c.parent_id as child_parent_id,
                g.group_id as child_group_id,
                g.group_name,
                u.first_name as user_first_name,
                u.last_name as user_last_name,
                u.role as user_role,
                p.first_name as parent_first_name,
                p.last_name as parent_last_name,
                p.email as parent_email
            FROM recommendations r
            LEFT JOIN children c ON r.child_id = c.child_id
            LEFT JOIN users u ON r.user_id = u.user_id
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users p ON c.parent_id = p.user_id
        `;

        const params = [];

        // Для админа показываем все рекомендации без фильтрации
        if (req.user.role !== 'admin') {
            if (req.user.role === 'parent') {
                queryText += ` WHERE r.parent_id = $1`;
                params.push(userId);
            } else if (['teacher', 'psychologist'].includes(req.user.role)) {
                queryText += ` WHERE r.user_id = $1`;
                params.push(userId);
            }
        }

        queryText += ` ORDER BY r.date DESC`;

        console.log('Executing recommendations query:', {
            text: queryText,
            params,
            userRole: req.user.role,
            userId: userId,
            isAdmin: req.user.role === 'admin'
        });

        const result = await query(queryText, params);
        
        // Добавляем подробное логирование результатов
        console.log('Recommendations query result:', {
            rowCount: result.rows.length,
            rows: result.rows.map(row => ({
                recommendation_id: row.recommendation_id,
                child_id: row.child_id,
                child_name: row.child_name,
                group_id: row.group_id,
                group_name: row.group_name,
                user_id: row.user_id,
                parent_id: row.parent_id,
                user_name: `${row.user_first_name} ${row.user_last_name}`,
                parent_name: `${row.parent_first_name} ${row.parent_last_name}`
            })),
            userRole: req.user.role,
            isAdmin: req.user.role === 'admin'
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Error getting recommendations:', {
            error: err,
            message: err.message,
            stack: err.stack,
            user: {
                id: req.user.user_id || req.user.id,
                role: req.user.role
            }
        });
        res.status(500).json({ 
            message: 'Ошибка при получении рекомендаций',
            error: err.message 
        });
    }
});

// Получение рекомендации по ID
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(
            `SELECT * FROM recommendations WHERE recommendation_id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при получении рекомендации' });
    }
});

// Создание новой рекомендации
router.post('/', auth, async (req, res) => {
    try {
        console.log('Creating recommendation with data:', req.body);
        console.log('User from request:', req.user);

        const { 
            child_id, 
            recommendation_text, 
            parent_id,
            is_sent,
            date
        } = req.body;

        // Получаем корректный ID пользователя из токена
        const user_id = req.user.user_id || req.user.id;
        
        console.log('Using user_id for recommendation:', user_id);

        const result = await query(
            `INSERT INTO recommendations 
            (child_id, recommendation_text, user_id, parent_id, date, is_sent) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
            RETURNING *`,
            [
                child_id, 
                recommendation_text, 
                user_id, 
                parent_id,
                is_sent || false
            ]
        );

        console.log('Created recommendation:', result.rows[0]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating recommendation:', err);
        res.status(500).json({ 
            message: 'Ошибка при создании рекомендации',
            error: err.message,
            stack: err.stack
        });
    }
});

// Обновление рекомендации
router.put('/:id', auth, async (req, res) => {
    try {
        const { recommendation_text, is_sent } = req.body;
        const recommendationId = req.params.id;

        // Проверяем права на редактирование
        const checkResult = await query(
            `SELECT user_id FROM recommendations WHERE recommendation_id = $1`,
            [recommendationId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        if (req.user.role !== 'admin' && checkResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на редактирование этой рекомендации' });
        }

        const result = await query(
            `UPDATE recommendations 
            SET recommendation_text = COALESCE($1, recommendation_text),
                is_sent = COALESCE($2, is_sent)
            WHERE recommendation_id = $3
            RETURNING *`,
            [recommendation_text, is_sent, recommendationId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при обновлении рекомендации' });
    }
});

// Удаление рекомендации
router.delete('/:id', auth, async (req, res) => {
    try {
        const recommendationId = req.params.id;

        // Проверяем права на удаление
        const checkResult = await query(
            `SELECT user_id FROM recommendations WHERE recommendation_id = $1`,
            [recommendationId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        if (req.user.role !== 'admin' && checkResult.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на удаление этой рекомендации' });
        }

        await query(
            'DELETE FROM recommendations WHERE recommendation_id = $1',
            [recommendationId]
        );

        res.json({ message: 'Рекомендация успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при удалении рекомендации' });
    }
});

// Получение рекомендаций для конкретного ребенка
router.get('/child/:child_id', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT r.*, 
                   u.first_name as user_first_name, u.last_name as user_last_name,
                   r.is_sent
            FROM recommendations r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.child_id = $1
            ORDER BY r.date DESC
        `, [req.params.child_id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Отправка рекомендации
router.post('/:id/send', auth, async (req, res) => {
    try {
        const recommendationId = req.params.id;

        // Получаем информацию о рекомендации
        const recResult = await query(
            `SELECT r.*, c.parent_id, u.email as parent_email
            FROM recommendations r
            JOIN children c ON r.child_id = c.child_id
            JOIN users u ON c.parent_id = u.user_id
            WHERE r.recommendation_id = $1`,
            [recommendationId]
        );

        if (recResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        const recommendation = recResult.rows[0];

        // Проверяем права на отправку
        if (req.user.role !== 'admin' && recommendation.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Нет прав на отправку этой рекомендации' });
        }

        // Обновляем статус отправки
        await query(
            `UPDATE recommendations SET is_sent = true WHERE recommendation_id = $1`,
            [recommendationId]
        );

        res.json({ message: 'Рекомендация успешно отправлена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при отправке рекомендации' });
    }
});

// Удаление всех рекомендаций для конкретного ребенка
router.delete('/child/:child_id', [auth, checkRole(['admin', 'teacher', 'psychologist'])], async (req, res) => {
    try {
        await query('DELETE FROM recommendations WHERE child_id = $1', [req.params.child_id]);
        res.json({ message: 'Все рекомендации ребенка успешно удалены' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 