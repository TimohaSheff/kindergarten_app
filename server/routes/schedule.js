const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { param, validationResult } = require('express-validator');

// Получение расписания для конкретной группы по имени
router.get('/group/:group_name', [
    auth,
    param('group_name').isString().trim().notEmpty().withMessage('Название группы обязательно')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { group_name } = req.params;

        const result = await db.query(`
            SELECT schedule_id, action, time_of_day
            FROM daily_schedule
            WHERE group_name = $1
            ORDER BY 
                TO_TIMESTAMP(SPLIT_PART(time_of_day, '-', 1), 'HH24:MI')::TIME
        `, [group_name]);

        if (result.rows.length === 0) {
            // Можно вернуть 404 или пустой массив, в зависимости от требований
            // return res.status(404).json({ message: 'Расписание для данной группы не найдено' });
            return res.json([]); // Возвращаем пустой массив, если расписания нет
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении расписания группы:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении расписания' });
    }
});

// Получение расписания для ВСЕХ групп
router.get('/all', auth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT schedule_id, action, time_of_day, group_name
            FROM daily_schedule
            ORDER BY 
                group_name,
                TO_TIMESTAMP(SPLIT_PART(time_of_day, '-', 1), 'HH24:MI')::TIME
        `);

        if (result.rows.length === 0) {
            return res.json({}); // Возвращаем пустой объект, если расписаний нет
        }

        // Группируем результаты по group_name
        const groupedSchedule = result.rows.reduce((acc, item) => {
            const group = item.group_name;
            if (!acc[group]) {
                acc[group] = [];
            }
            acc[group].push({
                schedule_id: item.schedule_id,
                action: item.action,
                time_of_day: item.time_of_day
            });
            return acc;
        }, {});

        res.json(groupedSchedule);
    } catch (err) {
        console.error('Ошибка при получении расписания всех групп:', err);
        res.status(500).json({ message: 'Ошибка сервера при получении расписания' });
    }
});

// Создание нового элемента расписания
router.post('/', auth, async (req, res) => {
    try {
        const { action, time_of_day, group_name } = req.body;

        if (!action || !time_of_day || !group_name) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }

        const result = await db.query(`
            INSERT INTO daily_schedule (action, time_of_day, group_name)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [action, time_of_day, group_name]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка при создании расписания:', err);
        res.status(500).json({ message: 'Ошибка сервера при создании расписания' });
    }
});

// Обновление элемента расписания
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, time_of_day, group_name } = req.body;

        if (!action || !time_of_day || !group_name) {
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });
        }

        const result = await db.query(`
            UPDATE daily_schedule
            SET action = $1, time_of_day = $2, group_name = $3
            WHERE schedule_id = $4
            RETURNING *
        `, [action, time_of_day, group_name, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Элемент расписания не найден' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Ошибка при обновлении расписания:', err);
        res.status(500).json({ message: 'Ошибка сервера при обновлении расписания' });
    }
});

// Удаление элемента расписания
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            DELETE FROM daily_schedule
            WHERE schedule_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Элемент расписания не найден' });
        }

        res.json({ message: 'Элемент расписания успешно удален' });
    } catch (err) {
        console.error('Ошибка при удалении расписания:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении расписания' });
    }
});

// --- Старые маршруты удалены, так как они не соответствуют структуре таблицы daily_schedule ---

module.exports = router; 