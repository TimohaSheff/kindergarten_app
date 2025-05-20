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
    body('teachers').optional().trim(),
    body('category').optional().trim()
];

// Получение списка заявок на услуги
router.get('/requests', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log('Getting service requests for user:', { userId, userRole });

        let queryText = `
            SELECT 
                sa.application_id as request_id,
                sa.child_id,
                s.service_id,
                CASE 
                    WHEN sa.is_accepted IS NULL THEN 'pending'
                    WHEN sa.is_accepted = true THEN 'approved'
                    ELSE 'rejected'
                END as status,
                s.service_name,
                s.description,
                s.price,
                c.name as child_name,
                CONCAT(u.first_name, ' ', u.last_name) as parent_name,
                u.user_id as parent_id,
                sa.teacher_id,
                string_agg(DISTINCT CONCAT(t.first_name, ' ', t.last_name), ', ') as teacher_names
            FROM service_application sa
            JOIN services s ON sa.service_id = s.service_id
            JOIN children c ON sa.child_id = c.child_id
            JOIN users u ON c.parent_id = u.user_id
            LEFT JOIN LATERAL unnest(sa.teacher_id::integer[]) AS teacher_ids(id) ON true
            LEFT JOIN users t ON teacher_ids.id = t.user_id
            LEFT JOIN groups g ON c.group_id = g.group_id
        `;

        let queryParams = [];
        
        // Если пользователь - родитель, показываем только его заявки
        if (userRole === 'parent') {
            queryText += ` WHERE c.parent_id = $1`;
            queryParams.push(userId);
        }
        // Если пользователь - воспитатель, показываем заявки где он указан как teacher_id
        else if (userRole === 'teacher') {
            queryText += ` WHERE $1 = ANY(sa.teacher_id)`;
            queryParams.push(userId);
        }

        queryText += ` GROUP BY 
            sa.application_id,
            sa.child_id,
            s.service_id,
            sa.is_accepted,
            s.service_name,
            s.description,
            s.price,
            c.name,
            u.first_name,
            u.last_name,
            u.user_id,
            sa.teacher_id
        ORDER BY sa.application_id DESC`;

        console.log('Executing query:', queryText);
        console.log('Query parameters:', queryParams);

        const result = await query(queryText, queryParams);
        console.log('Query result:', { 
            rowCount: result.rows.length,
            firstRow: result.rows[0] 
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Detailed error in service requests:', {
            error: err,
            message: err.message,
            code: err.code,
            stack: err.stack,
            query: err.query,
            parameters: err.parameters
        });
        
        res.status(500).json({ 
            message: 'Ошибка при получении заявок на услуги', 
            error: err.message,
            code: err.code
        });
    }
});

// Создание заявки на услугу родителем
router.post('/requests', auth, async (req, res) => {
    try {
        const { service_id, child_id } = req.body;
        const parentId = req.user.id;

        console.log('Creating service request - Initial data:', {
            service_id,
            child_id,
            parentId,
            userRole: req.user.role,
            body: req.body
        });

        // Проверяем, что все необходимые данные предоставлены
        if (!service_id || !child_id) {
            console.log('Missing required fields:', { service_id, child_id });
            return res.status(400).json({
                message: 'Необходимо указать service_id и child_id'
            });
        }

        // Проверяем существование услуги
        const serviceResult = await query(`
            SELECT * FROM services WHERE service_id = $1
        `, [service_id]);

        console.log('Service check result:', {
            exists: serviceResult.rows.length > 0,
            serviceId: service_id
        });

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Услуга не найдена'
            });
        }

        // Получаем информацию о ребенке, его группе и учителях
        const childResult = await query(`
            SELECT 
                c.*,
                g.teacher_id,
                g.group_id
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            WHERE c.child_id = $1 AND c.parent_id = $2
        `, [child_id, parentId]);

        console.log('Child check result:', {
            exists: childResult.rows.length > 0,
            childId: child_id,
            parentId: parentId,
            childData: childResult.rows[0]
        });

        if (childResult.rows.length === 0) {
            return res.status(403).json({ 
                message: 'У вас нет прав для создания заявки для этого ребенка' 
            });
        }

        // Проверяем, нет ли уже активной заявки
        const existingRequest = await query(`
            SELECT * FROM service_application 
            WHERE child_id = $1 
            AND service_id = $2 
            AND is_accepted IS NULL
        `, [child_id, service_id]);

        console.log('Existing request check:', {
            hasExisting: existingRequest.rows.length > 0,
            existingData: existingRequest.rows[0]
        });

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ 
                message: 'У вас уже есть активная заявка на эту услугу' 
            });
        }

        // Получаем массив teacher_id из группы
        const teacherIds = childResult.rows[0].teacher_id;

        console.log('Teacher IDs for request:', {
            teacherIds,
            rawTeacherData: childResult.rows[0].teacher_id
        });

        // Создаем одну заявку с массивом teacher_id
        const result = await query(`
            INSERT INTO service_application 
            (child_id, service_id, parent_id, teacher_id, is_accepted)
            VALUES ($1, $2, $3, $4::integer[], NULL)
            RETURNING application_id, child_id, service_id, parent_id, teacher_id, is_accepted
        `, [child_id, service_id, parentId, teacherIds]);

        console.log('Insert result:', {
            success: result.rows.length > 0,
            insertedData: result.rows[0]
        });

        if (!result.rows[0]) {
            throw new Error('Не удалось создать заявку');
        }

        // Получаем полную информацию о созданной заявке
        const requestInfo = await query(`
            SELECT 
                sa.application_id as request_id,
                sa.child_id,
                s.service_id,
                CASE 
                    WHEN sa.is_accepted IS NULL THEN 'pending'
                    WHEN sa.is_accepted = true THEN 'approved'
                    ELSE 'rejected'
                END as status,
                s.service_name,
                s.description,
                s.price,
                c.name as child_name,
                CONCAT(u.first_name, ' ', u.last_name) as parent_name,
                u.user_id as parent_id,
                sa.teacher_id,
                string_agg(DISTINCT CONCAT(t.first_name, ' ', t.last_name), ', ') as teacher_names
            FROM service_application sa
            JOIN services s ON sa.service_id = s.service_id
            JOIN children c ON sa.child_id = c.child_id
            JOIN users u ON c.parent_id = u.user_id
            LEFT JOIN LATERAL unnest(sa.teacher_id::integer[]) AS teacher_ids(id) ON true
            LEFT JOIN users t ON teacher_ids.id = t.user_id
            WHERE sa.application_id = $1
            GROUP BY 
                sa.application_id,
                sa.child_id,
                s.service_id,
                sa.is_accepted,
                s.service_name,
                s.description,
                s.price,
                c.name,
                u.first_name,
                u.last_name,
                u.user_id,
                sa.teacher_id
        `, [result.rows[0].application_id]);

        console.log('Final request info:', {
            success: requestInfo.rows.length > 0,
            requestData: requestInfo.rows[0]
        });

        if (!requestInfo.rows[0]) {
            throw new Error('Не удалось получить информацию о созданной заявке');
        }

        res.status(201).json(requestInfo.rows[0]);
    } catch (err) {
        console.error('Error creating service request:', {
            error: err,
            message: err.message,
            code: err.code,
            stack: err.stack,
            query: err.query,
            parameters: err.parameters,
            user: {
                id: req.user.id,
                role: req.user.role
            },
            body: req.body
        });
        res.status(500).json({ 
            message: 'Ошибка при создании заявки',
            error: err.message,
            code: err.code
        });
    }
});

// Одобрение заявки на услугу воспитателем
router.put('/requests/:id/approve', [auth, checkRole(['teacher', 'admin'])], async (req, res) => {
    try {
        const requestId = req.params.id;
        const teacherId = req.user.id;

        // Проверяем, что заявка существует и принадлежит этому воспитателю
        const requestResult = await query(`
            SELECT sa.* 
            FROM service_application sa
            WHERE sa.application_id = $1 
            AND $2 = ANY(sa.teacher_id)
        `, [requestId, teacherId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Заявка не найдена или у вас нет прав на её обработку' 
            });
        }

        // Обновляем статус заявки
        const result = await query(`
            UPDATE service_application 
            SET is_accepted = true
            WHERE application_id = $1 
            RETURNING *
        `, [requestId]);

        res.json({ 
            message: 'Заявка успешно одобрена',
            request: result.rows[0]
        });
    } catch (err) {
        console.error('Error approving service request:', err);
        res.status(500).json({ message: 'Ошибка при одобрении заявки' });
    }
});

// Отклонение заявки на услугу воспитателем
router.put('/requests/:id/reject', [auth, checkRole(['teacher', 'admin'])], async (req, res) => {
    try {
        const requestId = req.params.id;
        const teacherId = req.user.id;

        // Проверяем, что заявка существует и принадлежит этому воспитателю
        const requestResult = await query(`
            SELECT sa.* 
            FROM service_application sa
            WHERE sa.application_id = $1 
            AND $2 = ANY(sa.teacher_id)
        `, [requestId, teacherId]);

        if (requestResult.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Заявка не найдена или у вас нет прав на её обработку' 
            });
        }

        // Обновляем статус заявки на отклонено
        const result = await query(`
            UPDATE service_application 
            SET is_accepted = false
            WHERE application_id = $1 
            RETURNING *
        `, [requestId]);

        res.json({ 
            message: 'Заявка отклонена',
            request: result.rows[0]
        });
    } catch (err) {
        console.error('Error rejecting service request:', err);
        res.status(500).json({ message: 'Ошибка при отклонении заявки' });
    }
});

// Удаление заявки
router.delete('/requests/:id', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Проверяем права на удаление
        let deleteQuery = `
            DELETE FROM service_application 
            WHERE application_id = $1
        `;

        if (userRole === 'parent') {
            deleteQuery += ` AND parent_id = $2`;
        } else if (userRole === 'teacher') {
            deleteQuery += ` AND $2 = ANY(teacher_id)`;
        }

        deleteQuery += ` RETURNING *`;

        const result = await query(deleteQuery, [requestId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Заявка не найдена или у вас нет прав на её удаление' 
            });
        }

        res.json({ 
            message: 'Заявка успешно удалена',
            request: result.rows[0]
        });
    } catch (err) {
        console.error('Error deleting service request:', err);
        res.status(500).json({ message: 'Ошибка при удалении заявки' });
    }
});

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
router.post('/', [auth, checkRole(['admin', 'teacher']), ...serviceValidation], async (req, res) => {
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
            teachers = null,
            category = null
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
                teachers,
                category
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [service_name, description, price, duration, total_price, days_of_week, time, teachers, category]);

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
router.put('/:id', [auth, checkRole(['admin', 'teacher']), ...serviceValidation], async (req, res) => {
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
            'teachers',
            'category'
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
router.delete('/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
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
            SELECT 
                psa.*,
                c.name as child_name
            FROM paid_services_attendance psa
            JOIN children c ON psa.child_id = c.child_id
            WHERE psa.service_id = $1
            ORDER BY psa.date DESC
        `, [req.params.id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;