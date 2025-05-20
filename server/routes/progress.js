const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// Получить все отчеты о прогрессе для конкретного ребенка
router.get('/child/:child_id', [auth], async (req, res) => {
    try {
        const { child_id } = req.params;
        const numericChildId = parseInt(child_id, 10);
        const numericUserId = parseInt(req.user.user_id, 10);
        
        console.log('Запрос прогресса для ребенка:', {
            child_id,
            numericChildId,
            user: {
                id: req.user.user_id,
                numericId: numericUserId,
                role: req.user.role,
                token: req.headers.authorization ? 'Present' : 'Missing'
            }
        });
        
        // Валидация child_id
        if (!child_id || isNaN(numericChildId)) {
            console.log('Некорректный ID ребенка:', child_id);
            return res.status(400).json({ message: 'Некорректный ID ребенка' });
        }

        // Проверка существования ребенка и получение информации о нем
        const childResult = await db.query(
            `SELECT c.child_id, c.name, c.group_id, c.parent_id, g.group_name 
             FROM children c 
             LEFT JOIN groups g ON c.group_id = g.group_id 
             WHERE c.child_id = $1`,
            [numericChildId]
        );

        if (!childResult.rows.length) {
            console.log('Ребенок не найден:', numericChildId);
            return res.status(404).json({ message: 'Ребенок не найден' });
        }

        const child = childResult.rows[0];
        console.log('Данные ребенка:', {
            childId: child.child_id,
            childName: child.name,
            childParentId: child.parent_id,
            requestingUserId: numericUserId,
            requestingUserRole: req.user.role,
            comparison: `${child.parent_id} === ${numericUserId}`,
            typesMatch: typeof child.parent_id === typeof numericUserId
        });
        
        // Проверка доступа (родитель может видеть только своего ребенка)
        if (req.user.role === 'parent') {
            const isParentChild = child.parent_id === numericUserId;
            console.log('Проверка прав доступа:', {
                isParentChild,
                childParentId: child.parent_id,
                childParentIdType: typeof child.parent_id,
                userId: numericUserId,
                userIdType: typeof numericUserId
            });
            
            if (!isParentChild) {
                console.log('Доступ запрещен: несоответствие ID родителя');
                return res.status(403).json({ 
                    message: 'Доступ запрещен',
                    details: 'Вы не являетесь родителем этого ребенка'
                });
            }
        }

        // Получаем отчеты о прогрессе
        const progressQuery = `
            SELECT 
                report_id,
                child_id,
                report_date::text as report_date,
                details,
                COALESCE(active_speech, 0) as active_speech,
                COALESCE(games, 0) as games,
                COALESCE(art_activity, 0) as art_activity,
                COALESCE(constructive_activity, 0) as constructive_activity,
                COALESCE(sensory_development, 0) as sensory_development,
                COALESCE(movement_skills, 0) as movement_skills,
                COALESCE(height_cm, 0) as height_cm,
                COALESCE(weight_kg, 0) as weight_kg
             FROM progress_reports
             WHERE child_id = $1
             ORDER BY report_date DESC`;
        
        const reports = await db.query(progressQuery, [numericChildId]);
        
        // Группируем отчеты по годам и кварталам
        const progressByYear = {};
        
        reports.rows.forEach(report => {
            const [year, month] = report.report_date.split('-');
            const monthNum = parseInt(month);
            
            // Определяем квартал
            let quarter;
            if (monthNum <= 3) quarter = 'q1';
            else if (monthNum <= 6) quarter = 'q2';
            else if (monthNum <= 9) quarter = 'q3';
            else quarter = 'q4';
            
            // Создаем структуру для года если её нет
            if (!progressByYear[year]) {
                progressByYear[year] = {
                    q1: null,
                    q2: null,
                    q3: null,
                    q4: null
                };
            }
            
            // Сохраняем отчет в соответствующий квартал
            progressByYear[year][quarter] = {
                report_id: report.report_id,
                report_date: report.report_date,
                details: report.details || '',
                active_speech: Number(report.active_speech) || 0,
                games: Number(report.games) || 0,
                art_activity: Number(report.art_activity) || 0,
                constructive_activity: Number(report.constructive_activity) || 0,
                sensory_development: Number(report.sensory_development) || 0,
                movement_skills: Number(report.movement_skills) || 0,
                height_cm: Number(report.height_cm) || 0,
                weight_kg: Number(report.weight_kg) || 0
            };
        });

        // Добавляем текущий год, если его нет
        const currentYear = new Date().getFullYear().toString();
        if (!progressByYear[currentYear]) {
            progressByYear[currentYear] = {
                q1: null,
                q2: null,
                q3: null,
                q4: null
            };
        }

        res.json(progressByYear);
    } catch (err) {
        console.error('Ошибка при получении прогресса:', err);
        res.status(500).json({ 
            message: 'Ошибка сервера',
            error: err.message
        });
    }
});

// Получить отчеты о прогрессе для группы
router.get('/group/:group_id', [auth], async (req, res) => {
    try {
        const { group_id } = req.params;
        
        // Получаем всех детей группы
        const children = await db.query(
            `SELECT child_id FROM children WHERE group_id = $1`,
            [group_id]
        );
        
        // Получаем последние отчеты для каждого ребенка
        const reports = await Promise.all(
            children.rows.map(async (child) => {
                const childReports = await db.query(
                    `SELECT pr.*, c.name as child_name
                     FROM progress_reports pr
                     JOIN children c ON pr.child_id = c.child_id
                     WHERE pr.child_id = $1
                     ORDER BY pr.report_date DESC
                     LIMIT 1`,
                    [child.child_id]
                );
                return childReports.rows[0];
            })
        );
        
        // Фильтруем null значения и отправляем результат
        res.json(reports.filter(report => report));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новый отчет о прогрессе
router.post('/', [
    auth,
    checkRole(['admin', 'psychologist']),
    body('child_id').isInt().withMessage('ID ребенка должен быть числом'),
    body('report_date').isString().withMessage('Неверный формат даты'),
    body('active_speech').optional().isFloat({ min: 0, max: 10 }),
    body('games').optional().isFloat({ min: 0, max: 10 }),
    body('art_activity').optional().isFloat({ min: 0, max: 10 }),
    body('constructive_activity').optional().isFloat({ min: 0, max: 10 }),
    body('sensory_development').optional().isFloat({ min: 0, max: 10 }),
    body('movement_skills').optional().isFloat({ min: 0, max: 10 }),
    body('height_cm').optional().isFloat({ min: 0 }),
    body('weight_kg').optional().isFloat({ min: 0 }),
    body('details').optional().isString()
], async (req, res) => {
    try {
        console.log('Получен запрос на создание прогресса:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('Ошибки валидации:', errors.array());
            return res.status(400).json({ 
                message: 'Ошибка валидации данных',
                errors: errors.array() 
            });
        }

        const { child_id, report_date, ...progressData } = req.body;

        // Проверяем существование ребенка
        const childExists = await db.query(
            'SELECT * FROM children WHERE child_id = $1',
            [child_id]
        );

        if (childExists.rows.length === 0) {
            console.error('Ребенок не найден:', child_id);
            return res.status(404).json({ message: 'Ребенок не найден' });
        }

        console.log('Подготовка данных для вставки:', {
            child_id,
            report_date,
            progressData
        });

        // Создаем запись о прогрессе
        const result = await db.query(
            `INSERT INTO progress_reports 
             (child_id, report_date, active_speech, games, art_activity, 
              constructive_activity, sensory_development, 
              movement_skills, height_cm, weight_kg, details)
             VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                child_id,
                report_date,
                progressData.active_speech || null,
                progressData.games || null,
                progressData.art_activity || null,
                progressData.constructive_activity || null,
                progressData.sensory_development || null,
                progressData.movement_skills || null,
                progressData.height_cm || null,
                progressData.weight_kg || null,
                progressData.details || null
            ]
        );

        console.log('Запись успешно создана:', result.rows[0]);

        // Форматируем дату в ответе
        const response = {
            ...result.rows[0],
            report_date: result.rows[0].report_date.toISOString().split('T')[0]
        };

        res.status(201).json(response);
    } catch (error) {
        console.error('Ошибка при создании записи о прогрессе:', error);
        console.error('Детали запроса:', {
            body: req.body,
            user: req.user,
            error: {
                message: error.message,
                stack: error.stack
            }
        });
        res.status(500).json({ 
            message: 'Внутренняя ошибка сервера при создании записи о прогрессе',
            error: error.message 
        });
    }
});

// Получить прогресс за квартал
router.get('/child/:child_id/quarter/:quarter', [auth], async (req, res) => {
    try {
        const { child_id, quarter } = req.params;
        
        // Определяем даты начала и конца квартала
        const year = new Date().getFullYear();
        const quarterDates = {
            q1: { start: `${year}-01-01`, end: `${year}-03-31` },
            q2: { start: `${year}-04-01`, end: `${year}-06-30` },
            q3: { start: `${year}-07-01`, end: `${year}-09-30` },
            q4: { start: `${year}-10-01`, end: `${year}-12-31` }
        };

        if (!quarterDates[quarter]) {
            return res.status(400).json({ message: 'Неверный номер квартала' });
        }

        const reports = await db.query(
            `SELECT * FROM progress_reports
             WHERE child_id = $1
             AND report_date BETWEEN $2 AND $3
             ORDER BY report_date DESC`,
            [child_id, quarterDates[quarter].start, quarterDates[quarter].end]
        );
        
        res.json(reports.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Сохранить прогресс за квартал
router.post('/child/:child_id/quarter/:quarter', [
    auth,
    checkRole(['admin', 'psychologist']),
    body('progress').isObject()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const client = await db.getClient();
    try {
        const { child_id, quarter } = req.params;
        const { progress } = req.body;

        await client.query('BEGIN');

        // Удаляем старые записи за этот квартал
        const year = new Date().getFullYear();
        const quarterDates = {
            q1: { start: `${year}-01-01`, end: `${year}-03-31` },
            q2: { start: `${year}-04-01`, end: `${year}-06-30` },
            q3: { start: `${year}-07-01`, end: `${year}-09-30` },
            q4: { start: `${year}-10-01`, end: `${year}-12-31` }
        };

        await client.query(
            `DELETE FROM progress_reports
             WHERE child_id = $1
             AND report_date BETWEEN $2 AND $3`,
            [child_id, quarterDates[quarter].start, quarterDates[quarter].end]
        );

        // Создаем новые записи
        const reports = await Promise.all(
            Object.entries(progress).map(([category, value]) =>
                client.query(
                    `INSERT INTO progress_reports
                     (child_id, report_date, category, score, teacher_id)
                     VALUES ($1, CURRENT_DATE, $2, $3, $4)
                     RETURNING *`,
                    [child_id, category, value, req.user.user_id]
                )
            )
        );

        await client.query('COMMIT');
        res.json(reports.map(r => r.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    } finally {
        client.release();
    }
});

// Обновить запись о прогрессе
router.put('/:id', checkRole(['teacher', 'admin', 'psychologist']), [
    param('id').isInt().withMessage('ID отчета должен быть числом'),
    body('child_id').isInt().withMessage('ID ребенка должен быть числом'),
    body('report_date').isString().withMessage('Дата должна быть строкой'),
    body('details').optional(),
    body('active_speech').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('games').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('art_activity').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('constructive_activity').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('sensory_development').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('movement_skills').optional().isFloat({ min: 0, max: 10 }).withMessage('Значение должно быть от 0 до 10'),
    body('height_cm').optional().isFloat({ min: 0, max: 200 }).withMessage('Рост должен быть от 0 до 200 см'),
    body('weight_kg').optional().isFloat({ min: 0, max: 100 }).withMessage('Вес должен быть от 0 до 100 кг')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            child_id, 
            report_date, 
            details,
            active_speech,
            games,
            art_activity,
            constructive_activity,
            sensory_development,
            movement_skills,
            height_cm,
            weight_kg
        } = req.body;

        // Простое форматирование: берем только дату без времени
        let formattedDate = report_date;
        if (report_date && report_date.includes('T')) {
            formattedDate = report_date.split('T')[0];
        }

        console.log('Полученная дата:', report_date);
        console.log('Сохраняемая дата:', formattedDate);

        // Проверяем существование записи
        const existingReport = await db.query(
            'SELECT * FROM progress_reports WHERE report_id = $1',
            [req.params.id]
        );

        if (existingReport.rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }

        // Проверяем существование ребенка
        const childExists = await db.query(
            'SELECT * FROM children WHERE child_id = $1',
            [child_id]
        );

        if (childExists.rows.length === 0) {
            return res.status(404).json({ error: 'Ребенок не найден' });
        }

        const result = await db.query(
            `UPDATE progress_reports SET 
                child_id = $1,
                report_date = $2::date,
                details = $3,
                active_speech = $4,
                games = $5,
                art_activity = $6,
                constructive_activity = $7,
                sensory_development = $8,
                movement_skills = $9,
                height_cm = $10,
                weight_kg = $11
            WHERE report_id = $12 
            RETURNING *`,
            [
                child_id,
                formattedDate,
                details || 'Отчет о прогрессе',
                active_speech || null,
                games || null,
                art_activity || null,
                constructive_activity || null,
                sensory_development || null,
                movement_skills || null,
                height_cm || null,
                weight_kg || null,
                req.params.id
            ]
        );

        if (result.rows.length === 0) {
            throw new Error('Не удалось обновить запись');
        }

        // Сохраняем данные как есть, просто форматируем дату в строку без времени
        const response = {
            ...result.rows[0]
        };

        // Простое преобразование даты в строку без времени с проверкой
        if (response.report_date) {
            response.report_date = response.report_date.toISOString ? 
                response.report_date.toISOString().split('T')[0] : 
                String(response.report_date).split('T')[0];
        }

        res.json(response);
    } catch (error) {
        console.error('Ошибка при обновлении записи прогресса:', error);
        console.error('Детали запроса:', {
            id: req.params.id,
            body: req.body
        });
        res.status(500).json({ 
            message: 'Ошибка сервера при обновлении записи прогресса',
            error: error.message 
        });
    }
});

module.exports = router; 