const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');

// Валидация для создания/обновления услуги
const serviceValidation = [
    body('service_name').notEmpty().trim().withMessage('Название услуги обязательно'),
    body('description').notEmpty().trim().withMessage('Описание услуги обязательно'),
    body('price').isFloat({ min: 0 }).withMessage('Цена должна быть положительным числом'),
    body('duration').optional().trim(),
    body('total_price').optional().isFloat({ min: 0 }).withMessage('Общая цена должна быть положительным числом'),
    body('days_of_week').optional().trim(),
    body('time').optional().trim(),
    body('teachers').optional().trim()
];

// Получение списка всех услуг
router.get('/', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM services
            ORDER BY service_name
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение информации о конкретной услуге
router.get('/:id', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT * FROM services
            WHERE service_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Услуга не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание новой услуги
router.post('/', [auth, checkRole(['admin']), ...serviceValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: errors.array() 
            });
        }

        const { 
            service_name, 
            description, 
            price, 
            duration = null, 
            total_price = null,
            days_of_week = null,
            time = null,
            teachers = null
        } = req.body;

        const result = await query(`
            INSERT INTO services (
                service_name, 
                description, 
                price, 
                duration, 
                total_price,
                days_of_week,
                time,
                teachers
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [service_name, description, price, duration, total_price, days_of_week, time, teachers]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Услуга с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновление услуги
router.put('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Ошибка валидации',
                errors: errors.array() 
            });
        }

        const updates = req.body;
        const allowedFields = [
            'service_name', 
            'description', 
            'price', 
            'duration', 
            'total_price',
            'days_of_week',
            'time',
            'teachers'
        ];

        // Фильтруем только разрешенные поля
        const filteredUpdates = Object.keys(updates)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({ message: 'Нет данных для обновления' });
        }

        const setClause = Object.keys(filteredUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(filteredUpdates);
        const queryText = `
            UPDATE services
            SET ${setClause}
            WHERE service_id = $1
            RETURNING *
        `;

        const result = await query(queryText, [req.params.id, ...values]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Услуга не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Услуга с таким названием уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удаление услуги
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const result = await query('DELETE FROM services WHERE service_id = $1 RETURNING *', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Услуга не найдена' });
        }

        res.json({ message: 'Услуга успешно удалена' });
    } catch (err) {
        console.error(err);
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Невозможно удалить услугу, так как есть связанные записи' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение записей о посещении платных услуг
router.get('/:id/attendance', auth, async (req, res) => {
    try {
        const result = await query(`
            SELECT psa.*, c.first_name as child_first_name, c.last_name as child_last_name
            FROM paid_services_attendance psa
            JOIN children c ON psa.child_id = c.id
            WHERE psa.service_id = $1
            ORDER BY psa.date DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание записи о посещении платной услуги
router.post('/:id/attendance', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const { child_id, date, status, payment_status } = req.body;

        const result = await query(`
            INSERT INTO paid_services_attendance (service_id, child_id, date, status, payment_status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [req.params.id, child_id, date, status, payment_status]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 