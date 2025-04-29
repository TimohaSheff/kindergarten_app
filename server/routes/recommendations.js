const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');

// Валидация для создания/обновления рекомендации
const recommendationValidation = [
    body('child_id').isInt().withMessage('ID ребенка должно быть числом'),
    body('recommendation_text').notEmpty().trim().withMessage('Текст рекомендации не может быть пустым')
];

// Получение списка всех рекомендаций
router.get('/', auth, async (req, res) => {
    try {
        console.log('Getting recommendations for user:', req.user);
        let queryStr = `
            SELECT r.recommendation_id, r.child_id, r.user_id, r.date::date, r.recommendation_text, 
                   c.name as child_name,
                   u.first_name as user_first_name, u.last_name as user_last_name,
                   u.role as user_role
            FROM recommendations r
            JOIN children c ON r.child_id = c.child_id
            JOIN users u ON r.user_id = u.user_id
        `;
        
        // Если пользователь родитель - показываем только его детей
        if (req.user.role === 'parent') {
            queryStr += ` WHERE c.parent_id = $1`;
        }
        
        queryStr += ' ORDER BY r.date DESC';
        
        console.log('Executing query:', queryStr);
        console.log('With parameters:', req.user.role === 'parent' ? [req.user.user_id] : []);
        
        const result = await query(
            queryStr,
            req.user.role === 'parent' ? [req.user.user_id] : []
        );
        
        console.log('Query result:', result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in recommendations route:', err);
        console.error('Error stack:', err.stack);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Получение информации о конкретной рекомендации
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT r.*, 
                   c.name as child_name,
                   u.first_name as user_first_name, u.last_name as user_last_name
            FROM recommendations r
            JOIN children c ON r.child_id = c.child_id
            JOIN users u ON r.user_id = u.user_id
            WHERE r.recommendation_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание новой рекомендации
router.post('/', [
    auth,
    checkRole(['admin', 'teacher', 'psychologist']),
    ...recommendationValidation
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { child_id, recommendation_text } = req.body;

        const result = await query(`
            INSERT INTO recommendations (child_id, user_id, recommendation_text, date)
            VALUES ($1, $2, $3, CURRENT_DATE)
            RETURNING *
        `, [child_id, req.user.user_id, recommendation_text]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating recommendation:', err);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Обновление рекомендации
router.put('/:id', [
    auth,
    checkRole(['admin', 'teacher', 'psychologist']),
    ...recommendationValidation
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { child_id, recommendation_text } = req.body;

        // Проверяем, что рекомендация существует и принадлежит текущему пользователю
        const checkResult = await query(
            'SELECT * FROM recommendations WHERE recommendation_id = $1 AND user_id = $2',
            [req.params.id, req.user.user_id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена или у вас нет прав на её редактирование' });
        }

        const result = await query(`
            UPDATE recommendations
            SET child_id = $1, recommendation_text = $2
            WHERE recommendation_id = $3
            RETURNING *
        `, [child_id, recommendation_text, req.params.id]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удаление рекомендации
router.delete('/:id', [auth, checkRole(['admin', 'teacher', 'psychologist'])], async (req, res) => {
    try {
        // Проверяем, что рекомендация существует и принадлежит текущему пользователю
        const checkResult = await query(
            'SELECT * FROM recommendations WHERE recommendation_id = $1 AND user_id = $2',
            [req.params.id, req.user.user_id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена или у вас нет прав на её удаление' });
        }

        await query('DELETE FROM recommendations WHERE recommendation_id = $1', [req.params.id]);
        res.json({ message: 'Рекомендация успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение рекомендаций для конкретного ребенка
router.get('/child/:child_id', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT r.*, 
                   u.first_name as user_first_name, u.last_name as user_last_name
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

// Отправка рекомендации родителю
router.post('/:id/send', [auth, checkRole(['admin', 'teacher', 'psychologist'])], async (req, res) => {
    try {
        const recommendationId = req.params.id;

        // Получаем информацию о рекомендации
        const recommendationQuery = `
            SELECT r.*, 
                   c.name as child_name,
                   u.first_name as author_first_name, 
                   u.last_name as author_last_name,
                   u.role as author_role,
                   p.email as parent_email,
                   p.first_name as parent_first_name,
                   p.last_name as parent_last_name
            FROM recommendations r
            JOIN children c ON r.child_id = c.child_id
            JOIN users u ON r.user_id = u.user_id
            JOIN users p ON c.parent_id = p.user_id
            WHERE r.recommendation_id = $1
        `;
        
        console.log('Executing recommendation query:', recommendationQuery);
        console.log('With params:', [recommendationId]);
        
        const recommendationResult = await query(recommendationQuery, [recommendationId]);
        
        console.log('Recommendation query result:', recommendationResult.rows[0]);

        if (recommendationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Рекомендация не найдена' });
        }

        const recommendation = recommendationResult.rows[0];

        // TODO: Реализовать отправку email
        console.log('Отправка рекомендации:', {
            to: recommendation.parent_email,
            parent: `${recommendation.parent_first_name} ${recommendation.parent_last_name}`,
            child: recommendation.child_name,
            text: recommendation.recommendation_text,
            author: `${recommendation.author_first_name} ${recommendation.author_last_name} (${recommendation.author_role})`
        });

        res.json({ 
            message: 'Рекомендация успешно отправлена',
            details: {
                parent: { 
                    name: `${recommendation.parent_first_name} ${recommendation.parent_last_name}`,
                    email: recommendation.parent_email 
                },
                recommendation: {
                    id: recommendation.recommendation_id,
                    child_name: recommendation.child_name,
                    text: recommendation.recommendation_text,
                    author: `${recommendation.author_first_name} ${recommendation.author_last_name}`,
                    role: recommendation.author_role
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при отправке рекомендации:', error);
        res.status(500).json({ 
            message: 'Не удалось отправить рекомендацию',
            error: error.message
        });
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