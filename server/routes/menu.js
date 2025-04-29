const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const db = require('../config/db');

// Получить все доступные блюда из таблицы menu
router.get('/dishes', [auth], async (req, res) => {
    try {
        console.log('GET /menu/dishes - Starting request');
        const result = await db.query(`
            SELECT DISTINCT
                menu_id as id,
                dish_name as name,
                category,
                weight as default_weight,
                meal_type,
                group_name
            FROM menu 
            WHERE dish_name IS NOT NULL
            ORDER BY category, dish_name
        `);
        console.log('GET /menu/dishes - Query executed, rows:', result.rows.length);
        
        if (!result.rows || result.rows.length === 0) {
            console.log('No dishes found in menu table');
            return res.json([]);
        }
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error in GET /menu/dishes:', err);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении списка блюд',
            details: err.message 
        });
    }
});

// Получить недельное меню для группы из weekly_menu
router.get('/weekly/:group_id', [auth], async (req, res) => {
    try {
        const { group_id } = req.params;
        
        // Получаем информацию о группе
        const groupResult = await db.query(
            'SELECT group_name FROM groups WHERE group_id = $1',
            [group_id]
        );
        
        if (!groupResult.rows[0]) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }
        
        const groupName = groupResult.rows[0].group_name;
        
        // Получаем меню только для конкретной группы
        const result = await db.query(`
            SELECT wm.*, m.dish_name, m.weight, m.category, m.meal_type
            FROM weekly_menu wm
            JOIN menu m ON wm.dish_id = m.menu_id
            WHERE m.group_name = $1
            ORDER BY wm.meal_day, wm.meal_type, m.category
        `, [groupName]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error in GET /menu/weekly/:group_id:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новую запись в weekly_menu
router.post('/weekly', [
    auth,
    checkRole(['admin', 'teacher']),
    body('group_name').isString().trim().notEmpty(),
    body('meal_day').isString().trim().notEmpty(),
    body('meal_type').isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']),
    body('dish_id').isInt(),
    body('category').isString().trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { group_name, meal_day, meal_type, dish_id, category } = req.body;

        const result = await db.query(
            `INSERT INTO weekly_menu (group_name, meal_day, meal_type, dish_id, category)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [group_name, meal_day, meal_type, dish_id, category]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error in POST /menu/weekly:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить запись в weekly_menu
router.put('/weekly/:id', [
    auth,
    checkRole(['admin', 'teacher']),
    body('meal_type').optional().isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']),
    body('dish_id').optional().isInt(),
    body('category').optional().isString().trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const updates = req.body;

        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(updates);
        const query = `
            UPDATE weekly_menu 
            SET ${setClause}
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, ...values]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in PUT /menu/weekly/:id:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить запись из weekly_menu
router.delete('/weekly/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM weekly_menu WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json({ message: 'Запись успешно удалена' });
    } catch (err) {
        console.error('Error in DELETE /menu/weekly/:id:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить меню для группы
router.get('/:group_id', [auth], async (req, res) => {
    try {
        const { group_id } = req.params;
        const { date } = req.query;

        let query = `
            SELECT m.*, g.group_name
            FROM menu m
            JOIN groups g ON m.group_name = g.group_name
            WHERE g.group_id = $1
        `;
        const params = [group_id];

        if (date) {
            query += ' AND m.date = $2';
            params.push(date);
        }

        query += ' ORDER BY m.date DESC, m.meal_type';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in GET /menu/:group_id:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новое меню
router.post('/', [
    auth, 
    checkRole(['admin', 'teacher']),
    body('group_name').isString().trim().notEmpty(),
    body('date').isDate(),
    body('meal_type').isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']),
    body('dish_name').isString().trim().notEmpty(),
    body('weight').isString().trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { group_name, date, meal_type, dish_name, weight } = req.body;

        const result = await db.query(
            `INSERT INTO menu (group_name, date, meal_type, dish_name, weight)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [group_name, date, meal_type, dish_name, weight]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить меню
router.put('/:id', [
    auth,
    checkRole(['admin', 'teacher']),
    body('meal_type').optional().isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']),
    body('dish_name').optional().isString().trim().notEmpty(),
    body('weight').optional().isString().trim().notEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const updates = req.body;

        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(updates);
        const query = `
            UPDATE menu 
            SET ${setClause}
            WHERE menu_id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, ...values]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Меню не найдено' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить меню
router.delete('/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM menu WHERE menu_id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Меню не найдено' });
        }

        res.json({ message: 'Меню успешно удалено' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 