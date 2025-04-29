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
        
        // Валидация child_id
        if (!child_id || isNaN(parseInt(child_id))) {
            return res.status(400).json({ message: 'Некорректный ID ребенка' });
        }

        // Проверка существования ребенка
        const childResult = await db.query(
            'SELECT child_id, name, group_id FROM children WHERE child_id = $1',
            [child_id]
        );

        if (!childResult.rows.length) {
            return res.status(404).json({ message: 'Ребенок не найден' });
        }

        const child = childResult.rows[0];
        
        // Проверка доступа (родитель может видеть только своего ребенка)
        if (req.user.role === 'parent') {
            const isParent = await db.query(
                'SELECT 1 FROM children WHERE child_id = $1 AND parent_id = $2',
                [child_id, req.user.user_id]
            );
            if (!isParent.rows.length) {
                return res.status(403).json({ message: 'Доступ запрещен' });
            }
        }

        // Получаем отчеты о прогрессе
        const reports = await db.query(
            `SELECT 
                report_id,
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
             FROM progress_reports
             WHERE child_id = $1
             ORDER BY report_date DESC`,
            [child_id]
        );
        
        // Форматируем данные перед отправкой
        const formattedReports = reports.rows.map(report => ({
            report_id: report.report_id,
            report_date: report.report_date ? new Date(report.report_date).toISOString() : null,
            details: report.details,
            active_speech: report.active_speech !== null ? Number(report.active_speech) : null,
            games: report.games !== null ? Number(report.games) : null,
            art_activity: report.art_activity !== null ? Number(report.art_activity) : null,
            constructive_activity: report.constructive_activity !== null ? Number(report.constructive_activity) : null,
            sensory_development: report.sensory_development !== null ? Number(report.sensory_development) : null,
            movement_skills: report.movement_skills !== null ? Number(report.movement_skills) : null,
            height_cm: report.height_cm !== null ? Number(report.height_cm) : null,
            weight_kg: report.weight_kg !== null ? Number(report.weight_kg) : null
        }));
        
        res.json({
            child: {
                child_id: child.child_id,
                name: child.name,
                group_id: child.group_id
            },
            progress: formattedReports
        });
    } catch (err) {
        console.error('Ошибка при получении прогресса ребенка:', err);
        res.status(500).json({ 
            message: 'Ошибка сервера',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    body('child_id').isInt(),
    body('category').isString(),
    body('score').isFloat({ min: 0 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
    body('height_cm').optional().isFloat({ min: 30, max: 200 }),
    body('weight_kg').optional().isFloat({ min: 2, max: 100 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { child_id, category, score, notes, height_cm, weight_kg } = req.body;
        
        const report = await db.query(
            `INSERT INTO progress_reports 
             (child_id, report_date, category, score, notes, teacher_id, height_cm, weight_kg)
             VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [child_id, category, score, notes, req.user.user_id, height_cm, weight_kg]
        );
        
        res.status(201).json(report.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
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

// Создать новый отчет о прогрессе
router.post('/create', [
    checkRole(['admin', 'psychologist']),
    body('child_id').isInt().withMessage('ID ребенка должен быть числом'),
    body('report_date').isDate().withMessage('Неверный формат даты'),
    body('active_speech').optional().isInt({ min: 1, max: 10 }),
    body('games').optional().isInt({ min: 1, max: 10 }),
    body('art_activity').optional().isInt({ min: 1, max: 10 }),
    body('constructive_activity').optional().isInt({ min: 1, max: 10 }),
    body('sensory_development').optional().isInt({ min: 1, max: 10 }),
    body('naming_skills').optional().isInt({ min: 1, max: 10 }),
    body('movement_skills').optional().isInt({ min: 1, max: 10 }),
    body('height_cm').optional().isFloat({ min: 0 }),
    body('weight_kg').optional().isFloat({ min: 0 }),
    body('details').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { child_id, report_date, ...progressData } = req.body;

        // Проверяем существование ребенка
        const childExists = await db.query(
            'SELECT * FROM children WHERE child_id = $1',
            [child_id]
        );

        if (childExists.rows.length === 0) {
            return res.status(404).json({ error: 'Ребенок не найден' });
        }

        // Создаем запись о прогрессе
        const result = await db.query(
            `INSERT INTO progress_reports 
             (child_id, report_date, active_speech, games, art_activity, 
              constructive_activity, sensory_development, naming_skills, 
              movement_skills, height_cm, weight_kg, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                child_id,
                report_date,
                progressData.active_speech || null,
                progressData.games || null,
                progressData.art_activity || null,
                progressData.constructive_activity || null,
                progressData.sensory_development || null,
                progressData.naming_skills || null,
                progressData.movement_skills || null,
                progressData.height_cm || null,
                progressData.weight_kg || null,
                progressData.details || null
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при создании записи о прогрессе:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// Обновить запись о прогрессе
router.put('/:report_id', [
    auth,
    checkRole(['admin', 'psychologist']),
    param('report_id').isInt(),
    body('report_date').isDate(),
    body('active_speech').optional().isInt({ min: 1, max: 10 }),
    body('games').optional().isInt({ min: 1, max: 10 }),
    body('art_activity').optional().isInt({ min: 1, max: 10 }),
    body('constructive_activity').optional().isInt({ min: 1, max: 10 }),
    body('sensory_development').optional().isInt({ min: 1, max: 10 }),
    body('naming_skills').optional().isInt({ min: 1, max: 10 }),
    body('movement_skills').optional().isInt({ min: 1, max: 10 }),
    body('height_cm').optional().isFloat({ min: 0 }),
    body('weight_kg').optional().isFloat({ min: 0 }),
    body('details').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { report_id } = req.params;
        const updateData = req.body;

        // Проверяем существование записи
        const existingReport = await db.query(
            'SELECT * FROM progress_reports WHERE report_id = $1',
            [report_id]
        );

        if (existingReport.rows.length === 0) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        // Обновляем запись
        const result = await db.query(
            `UPDATE progress_reports 
             SET report_date = $1,
                 active_speech = $2,
                 games = $3,
                 art_activity = $4,
                 constructive_activity = $5,
                 sensory_development = $6,
                 naming_skills = $7,
                 movement_skills = $8,
                 height_cm = $9,
                 weight_kg = $10,
                 details = $11
             WHERE report_id = $12
             RETURNING *`,
            [
                updateData.report_date,
                updateData.active_speech,
                updateData.games,
                updateData.art_activity,
                updateData.constructive_activity,
                updateData.sensory_development,
                updateData.naming_skills,
                updateData.movement_skills,
                updateData.height_cm,
                updateData.weight_kg,
                updateData.details,
                report_id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении записи о прогрессе:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router; 