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
                m.menu_id as id,
                m.dish_name as name,
                m.category,
                m.weight as default_weight,
                m.meal_type,
                m.group_id
            FROM menu m
            WHERE m.dish_name IS NOT NULL
            ORDER BY m.category, m.dish_name
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
        const { week = 1 } = req.query; // По умолчанию текущая неделя
        
        console.log('Getting weekly menu for group:', group_id, 'week:', week);
        
        // Сначала проверяем существование группы
        const groupCheck = await db.query(
            'SELECT group_id FROM groups WHERE group_id = $1',
            [group_id]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Группа не найдена'
            });
        }
        
        // Получаем меню для конкретной группы и недели с объединением таблиц
        const result = await db.query(`
            SELECT 
                wm.menu_id,
                wm.dish_id,
                wm.meal_day,
                wm.group_id,
                wm.week_number,
                wm.meal_type,
                m.dish_name,
                m.category,
                m.weight,
                m.meal_type as dish_meal_type
            FROM weekly_menu wm
            JOIN menu m ON wm.dish_id = m.menu_id
            WHERE wm.group_id = $1 
            AND wm.week_number = $2
            ORDER BY wm.meal_day, wm.meal_type, m.category
        `, [group_id, week]);
        
        console.log('Found weekly menu items:', result.rows.length);
        
        // Если меню пустое, возвращаем пустой массив
        if (!result.rows || result.rows.length === 0) {
            console.log('No menu found for group:', group_id, 'week:', week);
            return res.json([]);
        }
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error in GET /menu/weekly/:group_id:', err);
        res.status(500).json({ 
            message: 'Ошибка при получении меню',
            error: err.message 
        });
    }
});

// Создать новую запись в weekly_menu
router.post('/weekly', [
    auth,
    checkRole(['admin', 'teacher']),
    body('group_id').isInt().withMessage('group_id должен быть числом'),
    body('meal_day').isInt({ min: 1, max: 5 }).withMessage('meal_day должен быть числом от 1 до 5'),
    body('dish_id').isInt().withMessage('dish_id должен быть числом'),
    body('week_number').isInt({ min: 1, max: 2 }).withMessage('week_number должен быть 1 или 2'),
    body('meal_type').isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']).withMessage('Некорректный тип приема пищи')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Ошибка валидации',
            errors: errors.array() 
        });
    }

    try {
        const { group_id, meal_day, dish_id, week_number, meal_type } = req.body;

        // Проверяем существование блюда
        const dishCheck = await db.query(
            'SELECT menu_id FROM menu WHERE menu_id = $1',
            [dish_id]
        );

        if (dishCheck.rows.length === 0) {
            return res.status(404).json({
                message: 'Блюдо не найдено'
            });
        }

        const result = await db.query(
            `INSERT INTO weekly_menu (group_id, meal_day, dish_id, week_number, meal_type)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING menu_id, group_id, meal_day, dish_id, week_number, meal_type`,
            [group_id, meal_day, dish_id, week_number, meal_type]
        );

        const fullResult = await db.query(`
            SELECT wm.menu_id, wm.group_id, wm.meal_day, wm.dish_id, wm.week_number, wm.meal_type,
                   m.dish_name, m.weight
            FROM weekly_menu wm
            JOIN menu m ON wm.dish_id = m.menu_id
            WHERE wm.menu_id = $1
        `, [result.rows[0].menu_id]);

        res.status(201).json(fullResult.rows[0]);
    } catch (err) {
        console.error('Error in POST /menu/weekly:', err);
        res.status(500).json({ 
            message: 'Ошибка при сохранении меню',
            details: err.message 
        });
    }
});

// Обновить запись в weekly_menu
router.put('/weekly/:id', [
    auth,
    checkRole(['admin', 'teacher']),
    body('meal_type').optional().isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']),
    body('dish_id').optional().isInt(),
    body('meal_day').optional().isInt({ min: 1, max: 5 }),
    body('group_id').optional().isInt(),
    body('week_number').optional().isInt({ min: 1, max: 2 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const updates = req.body;

        // Проверяем существование записи
        const checkResult = await db.query(
            'SELECT menu_id FROM weekly_menu WHERE menu_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(updates);
        const query = `
            UPDATE weekly_menu 
            SET ${setClause}
            WHERE menu_id = $1
            RETURNING menu_id, dish_id, meal_day, group_id, week_number, meal_type
        `;

        const result = await db.query(query, [id, ...values]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        // Получаем полную информацию о блюде
        const fullResult = await db.query(`
            SELECT 
                wm.menu_id,
                wm.dish_id,
                wm.meal_day,
                wm.group_id,
                wm.week_number,
                wm.meal_type,
                m.dish_name,
                m.category,
                m.weight
            FROM weekly_menu wm
            JOIN menu m ON wm.dish_id = m.menu_id
            WHERE wm.menu_id = $1
        `, [id]);

        res.json(fullResult.rows[0]);
    } catch (err) {
        console.error('Error in PUT /menu/weekly/:id:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить запись из weekly_menu
router.delete('/weekly/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Attempting to delete menu item with id:', id);
        
        const result = await db.query(
            'DELETE FROM weekly_menu WHERE menu_id = $1 RETURNING *', 
            [id]
        );

        if (result.rows.length === 0) {
            console.log('Menu item not found:', id);
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        console.log('Successfully deleted menu item:', result.rows[0]);
        res.json({ message: 'Запись успешно удалена' });
    } catch (err) {
        console.error('Error in DELETE /menu/weekly/:id:', err);
        res.status(500).json({ 
            message: 'Ошибка при удалении блюда',
            error: err.message 
        });
    }
});

// Получить меню для группы
router.get('/:group_id', [auth], async (req, res) => {
    try {
        const { group_id } = req.params;
        const { date } = req.query;

        let query = `
            SELECT m.*
            FROM menu m
            WHERE m.group_id = $1
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
    body('group_id').isInt(),
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
        const { group_id, date, meal_type, dish_name, weight } = req.body;

        const result = await db.query(
            `INSERT INTO menu (group_id, date, meal_type, dish_name, weight)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [group_id, date, meal_type, dish_name, weight]
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

// Удалить все меню на неделю для группы
router.delete('/weekly/group/:group_id/week/:week_number', [
    auth, 
    checkRole(['admin', 'teacher'])
], async (req, res) => {
    try {
        const { group_id, week_number } = req.params;

        // Проверяем существование группы
        const groupCheck = await db.query(
            'SELECT group_id FROM groups WHERE group_id = $1',
            [group_id]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }

        // Удаляем все записи для данной группы и недели
        await db.query(
            'DELETE FROM weekly_menu WHERE group_id = $1 AND week_number = $2',
            [group_id, week_number]
        );

        res.json({ message: 'Меню на неделю успешно удалено' });
    } catch (err) {
        console.error('Error deleting weekly menu:', err);
        res.status(500).json({ message: 'Ошибка при удалении меню' });
    }
});

// Создать новое блюдо
router.post('/dishes', [
    auth,
    checkRole(['admin', 'teacher']),
    body('name').notEmpty().withMessage('Название блюда обязательно'),
    body('weight').notEmpty().withMessage('Вес блюда обязателен'),
    body('category').isIn(['Первое блюдо', 'Второе блюдо', 'Третье блюдо', 'Напиток']).withMessage('Некорректная категория'),
    body('meal_type').isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']).withMessage('Некорректный тип приема пищи'),
    body('group_id').isInt().withMessage('group_id должен быть числом'),
    body('date').notEmpty().withMessage('Дата обязательна')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Ошибка валидации',
            errors: errors.array() 
        });
    }

    try {
        const { name, weight, category, meal_type, group_id, date } = req.body;

        const result = await db.query(
            `INSERT INTO menu (dish_name, weight, category, meal_type, group_id, date)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING menu_id as id, dish_name as name, weight, category, meal_type, group_id, date`,
            [name, weight, category, meal_type, group_id, date]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error in POST /menu/dishes:', err);
        res.status(500).json({ 
            message: 'Ошибка при создании блюда',
            details: err.message 
        });
    }
});

// Обновить существующее блюдо
router.put('/dishes/:id', [
    auth,
    checkRole(['admin', 'teacher']),
    body('name').notEmpty().withMessage('Название блюда обязательно'),
    body('weight').notEmpty().withMessage('Вес блюда обязателен'),
    body('category').isIn(['Первое блюдо', 'Второе блюдо', 'Третье блюдо', 'Напиток']).withMessage('Некорректная категория'),
    body('meal_type').isIn(['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин']).withMessage('Некорректный тип приема пищи'),
    body('group_id').isInt().withMessage('group_id должен быть числом'),
    body('date').notEmpty().withMessage('Дата обязательна')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: 'Ошибка валидации',
            errors: errors.array() 
        });
    }

    try {
        const { id } = req.params;
        const { name, weight, category, meal_type, group_id, date } = req.body;

        // Проверяем существование блюда
        const checkResult = await db.query(
            'SELECT menu_id FROM menu WHERE menu_id = $1',
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Блюдо не найдено' });
        }

        const result = await db.query(
            `UPDATE menu 
             SET dish_name = $1, weight = $2, category = $3, meal_type = $4, group_id = $5, date = $6
             WHERE menu_id = $7
             RETURNING menu_id as id, dish_name as name, weight, category, meal_type, group_id, date`,
            [name, weight, category, meal_type, group_id, date, id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error in PUT /menu/dishes/:id:', err);
        res.status(500).json({ 
            message: 'Ошибка при обновлении блюда',
            details: err.message 
        });
    }
});

// Удалить блюдо
router.delete('/dishes/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const { id } = req.params;

        // Проверяем, используется ли блюдо в weekly_menu
        const weeklyMenuCheck = await db.query(
            'SELECT menu_id FROM weekly_menu WHERE dish_id = $1',
            [id]
        );

        // Если блюдо используется в weekly_menu, сначала удаляем его оттуда
        if (weeklyMenuCheck.rows.length > 0) {
            await db.query(
                'DELETE FROM weekly_menu WHERE dish_id = $1',
                [id]
            );
        }

        // Удаляем само блюдо
        const result = await db.query(
            'DELETE FROM menu WHERE menu_id = $1 RETURNING menu_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Блюдо не найдено' });
        }

        res.json({ message: 'Блюдо успешно удалено' });
    } catch (err) {
        console.error('Error in DELETE /menu/dishes/:id:', err);
        res.status(500).json({ 
            message: 'Ошибка при удалении блюда',
            details: err.message 
        });
    }
});

module.exports = router; 