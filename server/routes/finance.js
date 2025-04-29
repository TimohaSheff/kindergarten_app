const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { body, validationResult } = require('express-validator');

// Валидация для создания/обновления финансовой операции
const financeValidation = [
    body('user_id').isInt(),
    body('amount').isFloat({ min: 0 }),
    body('payment_date').isDate()
];

// Получение списка всех финансовых операций
router.get('/', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const { start_date, end_date, user_id } = req.query;
        
        let queryStr = `
            SELECT p.*, u.first_name, u.last_name
            FROM payments p
            JOIN users u ON p.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (start_date) {
            queryStr += ` AND p.payment_date >= $${paramCount}`;
            params.push(start_date);
            paramCount++;
        }

        if (end_date) {
            queryStr += ` AND p.payment_date <= $${paramCount}`;
            params.push(end_date);
            paramCount++;
        }

        if (user_id) {
            queryStr += ` AND p.user_id = $${paramCount}`;
            params.push(user_id);
            paramCount++;
        }

        queryStr += ' ORDER BY p.payment_date DESC';

        const result = await query(queryStr, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение информации о конкретной финансовой операции
router.get('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.first_name, u.last_name
            FROM payments p
            JOIN users u ON p.user_id = u.user_id
            WHERE p.payment_id = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Финансовая операция не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создание новой финансовой операции
router.post('/', [auth, checkRole(['admin']), ...financeValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { user_id, amount, payment_date } = req.body;

        const result = await query(`
            INSERT INTO payments (user_id, amount, payment_date)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [user_id, amount, payment_date]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновление финансовой операции
router.put('/:id', [auth, checkRole(['admin']), ...financeValidation], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { user_id, amount, payment_date } = req.body;

        const result = await query(`
            UPDATE payments
            SET user_id = $1, amount = $2, payment_date = $3
            WHERE payment_id = $4
            RETURNING *
        `, [user_id, amount, payment_date, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Финансовая операция не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удаление финансовой операции
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const result = await query('DELETE FROM payments WHERE payment_id = $1 RETURNING *', [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Финансовая операция не найдена' });
        }

        res.json({ message: 'Финансовая операция успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение финансовой статистики
router.get('/stats/summary', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let queryStr = `
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                MIN(amount) as min_amount,
                MAX(amount) as max_amount
            FROM payments
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (start_date) {
            queryStr += ` AND payment_date >= $${paramCount}`;
            params.push(start_date);
            paramCount++;
        }

        if (end_date) {
            queryStr += ` AND payment_date <= $${paramCount}`;
            params.push(end_date);
        }

        const result = await query(queryStr, params);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 