const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { validateDate, validateAttendance } = require('../utils/validators');
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false
});

// Middleware для проверки роли
const checkTeacherRole = checkRole(['teacher', 'admin']);

// Валидация для создания записи о посещаемости
const createAttendanceValidation = [
    body('childId').isInt().withMessage('Некорректный ID ребенка'),
    body('date').isDate().withMessage('Некорректная дата'),
    body('isPresent').isBoolean().withMessage('Статус присутствия должен быть true или false'),
];

// Валидация для обновления записи о посещаемости
const updateAttendanceValidation = [
    body('isPresent').isBoolean().withMessage('Статус присутствия должен быть true или false')
];

// Валидация для отметки посещаемости
const markAttendanceValidation = [
    body('child_id').isInt().withMessage('ID ребенка должен быть числом'),
    body('date').isString().withMessage('Дата должна быть строкой'),
    body('is_present').isBoolean().withMessage('is_present должен быть булевым значением')
];

// Получить посещаемость группы за период
router.get('/group/:groupId', async (req, res) => {
    const client = await pool.connect();
    try {
        const { groupId } = req.params;
        const { startDate, endDate } = req.query;

        const result = await client.query(
            `SELECT 
                a.attendance_id,
                a.child_id,
                a.date,
                a.is_present
            FROM 
                attendance a
            JOIN 
                children c ON a.child_id = c.child_id
            WHERE 
                c.group_id = $1 
                AND a.date BETWEEN $2 AND $3
            ORDER BY 
                a.date DESC, c.name ASC`,
            [groupId, startDate, endDate]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении посещаемости:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// Получить посещаемость ребенка за период
router.get('/child/:childId', checkTeacherRole, async (req, res) => {
    const client = await pool.connect();
    try {
        const { childId } = req.params;
        const { startDate, endDate } = req.query;

        console.log(`Запрос посещаемости ребенка: childId=${childId}, startDate=${startDate}, endDate=${endDate}`);

        // Используем индекс по child_id и date для быстрого поиска
        const result = await client.query(
            `SELECT 
                a.attendance_id,
                a.child_id,
                a.date,
                a.is_present,
                c.name AS child_name,
                c.group_id,
                g.group_name
            FROM 
                attendance a
            JOIN 
                children c ON a.child_id = c.child_id
            JOIN 
                groups g ON c.group_id = g.group_id
            WHERE 
                a.child_id = $1 
                AND a.date BETWEEN $2 AND $3
            ORDER BY 
                a.date DESC`,
            [childId, startDate, endDate]
        );

        console.log(`Получено ${result.rows.length} записей посещаемости для ребенка`);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении посещаемости ребенка:', error);
        res.status(500).json({ error: 'Ошибка сервера при получении посещаемости' });
    } finally {
        client.release();
    }
});

// Отметка посещаемости
router.post('/mark', [
    auth,
    (req, res, next) => checkRole(['admin', 'teacher'])(req, res, next),
    markAttendanceValidation
], async (req, res) => {
    const client = await pool.connect();
    try {
        console.log('Получены данные для отметки посещаемости:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Ошибки валидации:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        await client.query('BEGIN');

        const { child_id, date, is_present } = req.body;
        const { user_id, role } = req.user;

        console.log('Проверка прав доступа для:', {
            child_id,
            user_id,
            role,
            date,
            is_present
        });

        // Проверяем существование ребенка и права доступа
        let checkQuery = 'SELECT c.child_id, c.name FROM children c';
        const queryParams = [child_id];

        if (role === 'teacher') {
            checkQuery += ` JOIN users u ON c.group_id = u.group_id 
                          WHERE c.child_id = $1 AND u.user_id = $2`;
            queryParams.push(user_id);
        } else {
            checkQuery += ' WHERE c.child_id = $1';
        }

        console.log('Выполняем проверку существования ребенка:', {
            query: checkQuery,
            params: queryParams
        });

        const childCheck = await client.query(checkQuery, queryParams);
        console.log('Результат проверки ребенка:', childCheck.rows);
        
        if (childCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                error: 'Ребенок не найден или у вас нет прав для отметки его посещаемости' 
            });
        }

        // Проверяем корректность даты
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                error: 'Некорректный формат даты. Ожидается YYYY-MM-DD' 
            });
        }

        // Проверяем существующую запись
        const existingRecordQuery = 'SELECT attendance_id FROM attendance WHERE child_id = $1 AND date = $2::date';
        console.log('Проверка существующей записи:', {
            query: existingRecordQuery,
            params: [child_id, date]
        });

        const existingRecord = await client.query(existingRecordQuery, [child_id, date]);
        console.log('Результат проверки существующей записи:', existingRecord.rows);

        let result;
        try {
            if (existingRecord.rows.length > 0) {
                // Обновляем существующую запись
                const updateQuery = `UPDATE attendance 
                                   SET is_present = $2
                                   WHERE attendance_id = $1
                                   RETURNING attendance_id, child_id, date, is_present`;
                const updateParams = [existingRecord.rows[0].attendance_id, is_present];
                
                console.log('Обновление существующей записи:', {
                    query: updateQuery,
                    params: updateParams
                });
                
                result = await client.query(updateQuery, updateParams);
            } else {
                // Создаем новую запись
                const insertQuery = `INSERT INTO attendance (child_id, date, is_present)
                                   VALUES ($1, $2::date, $3)
                                   RETURNING attendance_id, child_id, date, is_present`;
                const insertParams = [child_id, date, is_present];
                
                console.log('Создание новой записи:', {
                    query: insertQuery,
                    params: insertParams
                });
                
                result = await client.query(insertQuery, insertParams);
            }

            await client.query('COMMIT');
            console.log('Результат операции:', result.rows[0]);
            res.json(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Ошибка при выполнении запроса:', error);
            throw error;
        }
    } catch (error) {
        console.error('Детальная информация об ошибке:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            where: error.where,
            schema: error.schema,
            table: error.table,
            column: error.column,
            dataType: error.dataType,
            constraint: error.constraint
        });
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Ошибка сервера', 
                details: error.message,
                code: error.code 
            });
        }
    } finally {
        client.release();
    }
});

// Удаление записи о посещаемости (только для админа)
// Обычно не используется, лучше обновлять статус
router.delete('/:attendance_id', [
    auth,
    (req, res, next) => checkRole(['admin'])(req, res, next),
    param('attendance_id').isInt()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { attendance_id } = req.params;
        const result = await db.query('DELETE FROM attendance WHERE attendance_id = $1 RETURNING *', [attendance_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Запись о посещаемости не найдена' });
        }

        res.json({ message: 'Запись о посещаемости успешно удалена' });
    } catch (err) {
        console.error('Ошибка при удалении посещаемости:', err);
        res.status(500).json({ message: 'Ошибка сервера при удалении посещаемости' });
    }
});

// Получить посещаемость за дату
router.get('/by-date/:date', [auth, param('date').isISO8601()], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { date } = req.params;
        const { user_id, role } = req.user;

        let query = `
            SELECT a.*, c.name as child_name
            FROM attendance a
            JOIN children c ON a.child_id = c.child_id
        `;

        const queryParams = [date];
        
        // Фильтрация по правам доступа
        if (role === 'teacher') {
            query += ` JOIN users u ON c.group_id = u.group_id WHERE u.user_id = $2 AND a.date = $1`;
            queryParams.push(user_id);
        } else if (role === 'parent') {
            query += ` WHERE c.parent_id = $2 AND a.date = $1`;
            queryParams.push(user_id);
        } else {
            query += ` WHERE a.date = $1`;
        }

        query += ` ORDER BY c.name`;

        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        logger.error('Ошибка при получении посещаемости за дату:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получить посещаемость ребенка за период
router.get('/by-child/:childId', [
    auth,
    param('childId').isInt(),
    query('startDate').isISO8601(),
    query('endDate').isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { childId } = req.params;
        const { startDate, endDate } = req.query;
        const { user_id, role } = req.user;

        // Проверка прав доступа
        if (role === 'parent') {
            const isParent = await db.query(
                'SELECT 1 FROM children WHERE child_id = $1 AND parent_id = $2',
                [childId, user_id]
            );
            if (!isParent.rows.length) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }
        } else if (role === 'teacher') {
            const teacherGroup = await db.query(`
                SELECT 1 FROM children c
                JOIN users u ON c.group_id = u.group_id
                WHERE c.child_id = $1 AND u.user_id = $2
            `, [childId, user_id]);
            if (!teacherGroup.rows.length) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }
        }

        const result = await db.query(`
            SELECT a.*, c.name as child_name
            FROM attendance a
            JOIN children c ON a.child_id = c.child_id
            WHERE a.child_id = $1 AND a.date BETWEEN $2 AND $3
            ORDER BY a.date
        `, [childId, startDate, endDate]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Ошибка при получении посещаемости ребенка:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Получение посещаемости
router.get('/', auth, async (req, res) => {
  try {
    const { groupId, startDate, endDate } = req.query;
    logger.info('Запрос на получение посещаемости', { groupId, startDate, endDate });
    // TODO: Реализовать получение посещаемости из базы данных
    res.json([]);
  } catch (error) {
    logger.error('Ошибка при получении посещаемости:', error);
    res.status(500).json({ error: 'Ошибка при получении посещаемости' });
  }
});

// Отметка посещаемости
router.post('/mark', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
  try {
    const attendanceData = req.body;
    logger.info('Запрос на отметку посещаемости', { data: attendanceData });

    const validation = validateAttendance(attendanceData);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // TODO: Реализовать сохранение посещаемости в базе данных
    res.status(201).json(attendanceData);
  } catch (error) {
    logger.error('Ошибка при отметке посещаемости:', error);
    res.status(500).json({ error: 'Ошибка при отметке посещаемости' });
  }
});

// Получение посещаемости группы
router.get('/group/:groupId', auth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate } = req.query;
    logger.info('Запрос на получение посещаемости группы', { groupId, startDate, endDate });
    // TODO: Реализовать получение посещаемости группы из базы данных
    res.json([]);
  } catch (error) {
    logger.error('Ошибка при получении посещаемости группы:', error);
    res.status(500).json({ error: 'Ошибка при получении посещаемости группы' });
  }
});

// Получить посещаемость по группе
router.get('/group', auth, async (req, res) => {
    try {
        const { group_id, start_date, end_date } = req.query;
        
        logger.info('GET /attendance/group request', {
            group_id,
            start_date,
            end_date,
            query_params: req.query
        });

        if (!group_id || !start_date || !end_date) {
            return res.status(400).json({
                error: 'Необходимо указать group_id, start_date и end_date'
            });
        }

        const query = `
            SELECT a.attendance_id, a.child_id, a.date, a.is_present
            FROM attendance a
            JOIN children c ON a.child_id = c.child_id
            WHERE c.group_id = $1
            AND a.date BETWEEN $2 AND $3
            ORDER BY a.date, c.name
        `;

        const result = await db.query(query, [group_id, start_date, end_date]);
        
        logger.info('Attendance data retrieved', {
            count: result.rowCount,
            sample: result.rows[0]
        });

        res.json(result.rows);
    } catch (error) {
        logger.error('Error in GET /attendance/group', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Ошибка при получении данных посещаемости'
        });
    }
});

// Отметить посещаемость
router.post('/', auth, async (req, res) => {
    try {
        const { child_id, date, is_present } = req.body;

        if (!child_id || !date) {
            return res.status(400).json({
                error: 'Необходимо указать child_id и date'
            });
        }

        const query = `
            INSERT INTO attendance (child_id, date, is_present)
            VALUES ($1, $2, $3)
            ON CONFLICT (child_id, date)
            DO UPDATE SET is_present = $3
            RETURNING *
        `;

        const result = await db.query(query, [child_id, date, is_present]);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error in POST /attendance', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            error: 'Ошибка при сохранении посещаемости'
        });
    }
});

module.exports = router; 