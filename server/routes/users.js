const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { query } = require('../config/db');

// Получить всех пользователей (только для админа и психолога)
router.get('/', [auth, checkRole(['admin', 'psychologist'])], async (req, res) => {
    try {
        const users = await query('SELECT * FROM users ORDER BY role, last_name, first_name');
        res.json(users.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получить текущего пользователя
router.get('/me', [auth], async (req, res) => {
    try {
        const user = await query(
            'SELECT user_id, email, role, first_name, last_name FROM users WHERE user_id = $1',
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

        const result = await query(query, [req.user.user_id, ...values]);
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
        
        // Проверяем, не пытается ли админ удалить сам себя
        if (parseInt(id) === req.user.user_id) {
            return res.status(400).json({ message: 'Нельзя удалить свой собственный аккаунт' });
        }

        const result = await query('DELETE FROM users WHERE user_id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        res.json({ message: 'Пользователь успешно удален' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 