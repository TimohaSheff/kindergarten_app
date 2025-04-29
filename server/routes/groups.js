const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const db = require('../config/db');

// Получить все группы
router.get('/', [auth], async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                g.group_id,
                g.group_name,
                g.age_range,
                g.caretaker_full_name,
                (SELECT COUNT(*) FROM children WHERE group_id = g.group_id) as children_count
            FROM groups g
            ORDER BY g.group_name
        `);
        
        // Преобразуем данные в формат, ожидаемый фронтендом
        const groups = result.rows.map(group => ({
            group_id: group.group_id,
            group_name: group.group_name,
            age_range: group.age_range,
            caretaker_full_name: group.caretaker_full_name || '',
            children_count: parseInt(group.children_count) || 0
        }));
        
        res.json(groups);
    } catch (err) {
        console.error('Ошибка при получении групп:', err);
        res.status(500).json({ message: 'Ошибка сервера', error: err.message });
    }
});

// Получить список детей группы
router.get('/:id/children', [auth], async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Получен запрос на список детей группы:', id);
        
        // Проверка валидности ID
        if (!id || isNaN(id)) {
            console.log('Некорректный ID группы:', id);
            return res.status(400).json({ 
                message: 'Некорректный ID группы',
                details: 'ID группы должен быть числом'
            });
        }

        // Проверяем существование группы
        const groupCheck = await db.query(
            'SELECT group_id, group_name FROM groups WHERE group_id = $1',
            [id]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Группа не найдена',
                details: `Группа с ID ${id} не существует в базе данных`
            });
        }

        // Получаем основную информацию о детях с обновленным запросом
        const childrenResult = await db.query(`
            SELECT 
                c.child_id,
                c.name,
                c.date_of_birth,
                c.allergies,
                c.photo_path,
                c.services,
                c.group_id,
                g.group_name,
                u.user_id as parent_id,
                u.first_name as parent_first_name,
                u.last_name as parent_last_name,
                u.email as parent_email
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users u ON c.parent_id = u.user_id
            WHERE c.group_id = $1
            ORDER BY c.name
        `, [id]);

        // Получаем информацию о сервисах
        const servicesResult = await db.query(`
            SELECT 
                s.service_id,
                s.service_name,
                s.description,
                s.price
            FROM services s
            WHERE s.service_id = ANY(
                SELECT UNNEST(services)
                FROM children
                WHERE group_id = $1 AND services IS NOT NULL
            )
        `, [id]);

        // Создаем Map для быстрого доступа к сервисам
        const servicesMap = new Map(
            servicesResult.rows.map(service => [
                service.service_id,
                {
                    id: service.service_id,
                    name: service.service_name,
                    description: service.description,
                    price: service.price
                }
            ])
        );

        // Обрабатываем данные детей
        const children = childrenResult.rows.map(child => {
            // Обработка аллергий
            let allergies = [];
            if (child.allergies) {
                if (Array.isArray(child.allergies)) {
                    allergies = child.allergies;
                } else if (typeof child.allergies === 'string') {
                    allergies = child.allergies.replace(/[{}]/g, '').split(',').filter(Boolean);
                }
            }

            // Обработка сервисов
            let services_details = [];
            if (child.services) {
                try {
                    if (Array.isArray(child.services)) {
                        services_details = child.services
                            .map(serviceId => servicesMap.get(serviceId))
                            .filter(Boolean);
                    } else if (typeof child.services === 'string') {
                        const serviceIds = child.services.replace(/[{}]/g, '').split(',').filter(Boolean);
                        services_details = serviceIds
                            .map(serviceId => servicesMap.get(parseInt(serviceId)))
                            .filter(Boolean);
                    }
                } catch (e) {
                    console.error('Ошибка при обработке сервисов:', e);
                }
            }

            return {
                id: child.child_id,
                name: child.name,
                date_of_birth: child.date_of_birth,
                photo_path: child.photo_path,
                allergies: allergies,
                services_details: services_details,
                services: child.services,
                parent: {
                    id: child.parent_id,
                    name: child.parent_first_name && child.parent_last_name 
                        ? `${child.parent_first_name} ${child.parent_last_name}`.trim()
                        : 'Не указан',
                    email: child.parent_email || 'Email не указан'
                },
                parent_first_name: child.parent_first_name,
                parent_last_name: child.parent_last_name,
                parent_email: child.parent_email,
                parent_id: child.parent_id,
                group_name: child.group_name
            };
        });

        const response = {
            group: {
                id: parseInt(id),
                name: groupCheck.rows[0].group_name,
                group_name: groupCheck.rows[0].group_name
            },
            total_children: children.length,
            children: children
        };

        console.log('Отправка ответа с данными группы:', {
            groupId: response.group.id,
            groupName: response.group.name,
            totalChildren: response.total_children
        });

        res.json(response);

    } catch (err) {
        console.error('Ошибка при получении списка детей группы:', err);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении списка детей', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Получить конкретную группу
router.get('/:id', [auth], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT g.*, 
                   COUNT(DISTINCT c.child_id) as children_count,
                   STRING_AGG(DISTINCT u.last_name || ' ' || u.first_name, ', ') as teachers
            FROM groups g
            LEFT JOIN children c ON g.group_id = c.group_id
            LEFT JOIN users u ON g.group_id = u.group_id AND u.role = 'teacher'
            WHERE g.group_id = $1
            GROUP BY g.group_id
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новую группу
router.post('/', [
    auth,
    checkRole(['admin']),
    body('group_name').isString().trim().notEmpty(),
    body('age_range').isString().trim().notEmpty(),
    body('caretaker_full_name').optional().isString().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { group_name, age_range, caretaker_full_name } = req.body;
        const result = await db.query(`
            INSERT INTO groups (group_name, age_range, caretaker_full_name)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [group_name, age_range, caretaker_full_name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Обновить группу
router.put('/:id', [
    auth,
    checkRole(['admin']),
    body('group_name').optional().isString().trim().notEmpty(),
    body('age_range').optional().isString().trim().notEmpty(),
    body('caretaker_full_name').optional().isString().trim()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const updates = req.body;

        // Проверяем существование группы
        const groupExists = await db.query('SELECT group_id FROM groups WHERE group_id = $1', [id]);
        if (groupExists.rows.length === 0) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }

        // Формируем безопасный SQL-запрос
        const validFields = ['group_name', 'age_range', 'caretaker_full_name'];
        const filteredUpdates = Object.keys(updates)
            .filter(key => validFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({ message: 'Нет полей для обновления' });
        }

        const setClause = Object.keys(filteredUpdates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');

        const values = Object.values(filteredUpdates);
        const query = `
            UPDATE groups 
            SET ${setClause}
            WHERE group_id = $1
            RETURNING *
        `;

        const result = await db.query(query, [id, ...values]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating group:', err);
        res.status(500).json({ 
            message: 'Ошибка сервера',
            error: err.message
        });
    }
});

// Удалить группу
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const { id } = req.params;

        // Проверяем, есть ли дети в группе
        const childrenCheck = await db.query(
            'SELECT COUNT(*) FROM children WHERE group_id = $1',
            [id]
        );

        if (childrenCheck.rows[0].count > 0) {
            return res.status(400).json({
                message: 'Невозможно удалить группу, в которой есть дети'
            });
        }

        const result = await db.query(
            'DELETE FROM groups WHERE group_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Группа не найдена' });
        }

        res.json({ message: 'Группа успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 