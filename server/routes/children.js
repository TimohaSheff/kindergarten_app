const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const db = require('../config/db');
const photoUtils = require('../utils/photoUtils');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Создаем директории для загрузки фотографий
const uploadDir = path.join(__dirname, '..', 'uploads');
const photosDir = path.join(uploadDir, 'photos');

[uploadDir, photosDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        logger.info(`Создана директория ${dir}`);
    }
});

// Получить всех детей
router.get('/', auth, async (req, res) => {
    try {
        const { group_id } = req.query;
        const userId = String(req.user.user_id);
        const userRole = req.user.role;
        
        logger.info('GET /children request', { 
            userId, 
            userRole, 
            group_id,
            query_params: req.query,
            userIdType: typeof userId,
            originalUserIdType: typeof req.user.user_id
        });

        let query;
        let params = [];

        if (userRole === 'parent') {
            // Преобразуем ID обратно в число для SQL-запроса
            const numericUserId = parseInt(userId, 10);
            logger.info('Parent query params:', {
                stringUserId: userId,
                numericUserId,
                userIdType: typeof userId,
                numericUserIdType: typeof numericUserId
            });
            
            query = `
                SELECT 
                    c.child_id,
                    c.name,
                    c.date_of_birth,
                    c.parent_id,
                    c.group_id,
                    c.allergies,
                    c.photo_path,
                    c.services,
                    g.group_name,
                    g.age_range,
                    t.user_id as teacher_id,
                    t.first_name as teacher_first_name,
                    t.last_name as teacher_last_name,
                    t.email as teacher_email,
                    t.phone as teacher_phone,
                    COALESCE(
                        (
                            SELECT json_agg(json_build_object(
                                'id', s.service_id,
                                'name', s.service_name
                            ))
                            FROM services s
                            WHERE s.service_id = ANY(c.services)
                        ),
                        '[]'::json
                    ) as services
                FROM children c
                LEFT JOIN groups g ON c.group_id = g.group_id
                LEFT JOIN LATERAL unnest(g.teacher_id::integer[]) AS teacher_ids(id) ON true
                LEFT JOIN users t ON teacher_ids.id = t.user_id AND t.role = 'teacher'
                WHERE c.parent_id = $1
                GROUP BY 
                    c.child_id,
                    c.name,
                    c.date_of_birth,
                    c.parent_id,
                    c.group_id,
                    c.allergies,
                    c.photo_path,
                    c.services,
                    g.group_name,
                    g.age_range,
                    t.user_id,
                    t.first_name,
                    t.last_name,
                    t.email,
                    t.phone
                ORDER BY c.name
            `;
            params = [numericUserId]; // Используем числовой ID
        } else if (userRole === 'teacher') {
            query = `
                SELECT 
                    c.*,
                    g.group_name,
                    u.first_name as parent_first_name,
                    u.last_name as parent_last_name,
                    u.email as parent_email,
                    u.phone as parent_phone,
                    COALESCE(
                        (
                            SELECT json_agg(json_build_object(
                                'id', s.service_id,
                                'name', s.service_name
                            ))
                            FROM services s
                            WHERE s.service_id = ANY(c.services)
                        ),
                        '[]'::json
                    ) as services
                FROM children c
                LEFT JOIN groups g ON c.group_id = g.group_id
                LEFT JOIN users u ON c.parent_id = u.user_id
                WHERE $1 = ANY(g.teacher_id::integer[])
                GROUP BY 
                    c.child_id,
                    c.name,
                    c.date_of_birth,
                    c.parent_id,
                    c.group_id,
                    c.allergies,
                    c.photo_path,
                    c.services,
                    g.group_name,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone
                ORDER BY c.name
            `;
            params = [userId];
        } else {
            // Для admin и psychologist
            query = `
                SELECT 
                    c.*,
                    g.group_name,
                    u.first_name as parent_first_name,
                    u.last_name as parent_last_name,
                    u.email as parent_email,
                    u.phone as parent_phone,
                    COALESCE(
                        (
                            SELECT json_agg(json_build_object(
                                'id', s.service_id,
                                'name', s.service_name
                            ))
                            FROM services s
                            WHERE s.service_id = ANY(c.services)
                        ),
                        '[]'::json
                    ) as services
                FROM children c
                LEFT JOIN groups g ON c.group_id = g.group_id
                LEFT JOIN users u ON c.parent_id = u.user_id
                ${group_id ? 'WHERE c.group_id = $1' : ''}
                GROUP BY 
                    c.child_id,
                    c.name,
                    c.date_of_birth,
                    c.parent_id,
                    c.group_id,
                    c.allergies,
                    c.photo_path,
                    c.services,
                    g.group_name,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone
                ORDER BY c.name
            `;
            if (group_id) {
                params = [group_id];
            }
        }

        logger.info('Executing query:', { 
            userRole,
            userId,
            hasGroupId: !!group_id
        });

        const result = await db.query(query, params);
        
        if (!result || !result.rows) {
            logger.error('No data returned from database');
            return res.status(404).json({ 
                error: 'Дети не найдены' 
            });
        }

        const children = result.rows.map(child => {
            try {
                return {
                    id: String(child.child_id),
                    child_id: String(child.child_id),
                    name: child.name,
                    date_of_birth: child.date_of_birth,
                    parent_id: String(child.parent_id),
                    group_id: child.group_id,
                    group_name: child.group_name,
                    allergies: Array.isArray(child.allergies) ? child.allergies : [],
                    photo_path: child.photo_path,
                    teacher: child.teacher_id ? {
                        id: String(child.teacher_id),
                        name: `${child.teacher_first_name} ${child.teacher_last_name}`.trim(),
                        email: child.teacher_email || 'Не указан',
                        phone: child.teacher_phone || 'Не указан'
                    } : null,
                    parent: userRole !== 'parent' ? {
                        id: String(child.parent_id),
                        name: child.parent_first_name && child.parent_last_name 
                            ? `${child.parent_first_name} ${child.parent_last_name}`.trim()
                            : 'Не указан',
                        phone: child.parent_phone || 'Не указан',
                        email: child.parent_email || 'Не указан'
                    } : undefined,
                    services: Array.isArray(child.services) ? child.services.filter(Boolean) : []
                };
            } catch (error) {
                logger.error('Error processing child data:', {
                    error: error.message,
                    childData: child
                });
                return null;
            }
        }).filter(Boolean);

        logger.info('Подготовленные данные:', { 
            childrenCount: children.length,
            firstChild: children[0],
            isArray: Array.isArray(children)
        });

        res.json(children);
    } catch (error) {
        logger.error('Error in GET /children:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.user_id,
            userRole: req.user?.role
        });
        res.status(500).json({ 
            error: 'Ошибка при получении списка детей',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Получить конкретного ребенка
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role === 'parent') {
            const isParent = await db.query(
                'SELECT 1 FROM children WHERE child_id = $1 AND parent_id = $2',
                [id, req.user.user_id]
            );
            if (!isParent.rows.length) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
        }

        const result = await db.query(`
            SELECT c.*, 
                   g.group_name as group_name,
                   u.first_name as parent_first_name,
                   u.last_name as parent_last_name,
                   u.phone as parent_phone
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users u ON c.parent_id = u.user_id
            WHERE c.child_id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Ребенок не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error in GET /children/:id', { error: error.message, childId: req.params.id });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать нового ребенка
router.post('/', [
    auth,
    checkRole(['admin']),
    body('name').trim().notEmpty().withMessage('Имя обязательно для заполнения'),
    body('date_of_birth').isDate().withMessage('Некорректная дата рождения'),
    body('parent_id').isInt().withMessage('Некорректный ID родителя'),
    body('group_id').isInt().withMessage('Некорректный ID группы'),
    body('allergies').optional().trim(),
    body('services').optional().isArray().withMessage('Некорректный формат услуг'),
    body('photo').optional(),
    body('photo_mime_type').optional().isIn(['image/jpeg', 'image/png', 'image/webp'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, date_of_birth, parent_id, group_id, allergies, services, photo } = req.body;
        let photoPath = null;

        if (photo) {
            try {
                photoPath = await photoUtils.savePhoto(photo, 'child');
                logger.info('Photo saved successfully', { photoPath });
            } catch (photoError) {
                logger.error('Error saving photo', { error: photoError.message });
            }
        }

        await db.query('BEGIN');

        try {
            const result = await db.query(`
                INSERT INTO children (name, date_of_birth, parent_id, group_id, allergies, photo_path)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING child_id`,
                [name, date_of_birth, parent_id, group_id, allergies, photoPath]
            );

            if (services?.length) {
                // Обновляем массив services в записи ребенка
                await db.query(`
                    UPDATE children 
                    SET services = $1 
                    WHERE child_id = $2`,
                    [services, result.rows[0].child_id]
                );
            }

            await db.query('COMMIT');

            res.status(201).json({
                message: 'Ребенок успешно добавлен',
                child_id: result.rows[0].child_id
            });
        } catch (error) {
            await db.query('ROLLBACK');
            logger.error('Error in POST /children:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    } catch (error) {
        logger.error('Error in POST /children:', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Ошибка при создании записи ребенка',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Обновить данные ребенка
router.put('/:id', [
    auth,
    checkRole(['admin']),
    body('name').trim().notEmpty().withMessage('Имя обязательно для заполнения'),
    body('date_of_birth').isDate().withMessage('Некорректная дата рождения'),
    body('parent_id').isInt().withMessage('Некорректный ID родителя'),
    body('group_id').isInt().withMessage('Некорректный ID группы'),
    body('allergies').optional().trim(),
    body('services').optional().isArray().withMessage('Некорректный формат услуг'),
    body('photo').optional(),
    body('photo_mime_type').optional().isIn(['image/jpeg', 'image/png', 'image/webp'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { name, date_of_birth, parent_id, group_id, allergies, services, photo } = req.body;

        // Проверяем существование ребенка
        const childExists = await db.query(
            'SELECT 1 FROM children WHERE child_id = $1',
            [id]
        );

        if (!childExists.rows.length) {
            return res.status(404).json({ 
                error: 'Ребенок не найден' 
            });
        }

        let photoPath = null;
        if (photo) {
            try {
                photoPath = await photoUtils.savePhoto(photo, 'child');
                logger.info('Photo saved successfully', { photoPath });
            } catch (photoError) {
                logger.error('Error saving photo', { error: photoError.message });
            }
        }

        await db.query('BEGIN');

        try {
            // Обновляем основные данные ребенка
            const updateQuery = `
                UPDATE children 
                SET 
                    name = $1,
                    date_of_birth = $2,
                    parent_id = $3,
                    group_id = $4,
                    allergies = $5
                    ${photoPath ? ', photo_path = $6' : ''}
                WHERE child_id = $${photoPath ? '7' : '6'}
                RETURNING child_id
            `;

            const updateValues = [
                name,
                date_of_birth,
                parent_id,
                group_id,
                allergies,
                ...(photoPath ? [photoPath] : []),
                id
            ];

            const result = await db.query(updateQuery, updateValues);

            if (services?.length) {
                // Обновляем массив services в записи ребенка
                await db.query(`
                    UPDATE children 
                    SET services = $1 
                    WHERE child_id = $2`,
                    [services, id]
                );
            }

            await db.query('COMMIT');

            res.json({
                message: 'Данные ребенка успешно обновлены',
                child_id: result.rows[0].child_id
            });
        } catch (error) {
            await db.query('ROLLBACK');
            logger.error('Error in PUT /children/:id transaction:', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    } catch (error) {
        logger.error('Error in PUT /children/:id:', {
            error: error.message,
            stack: error.stack,
            childId: req.params.id
        });
        res.status(500).json({ 
            error: 'Ошибка при обновлении данных ребенка',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Удалить ребенка
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const { id } = req.params;
        logger.info('Запрос на удаление ребенка:', { childId: id });

        // Проверяем существование ребенка и получаем информацию о фото
        const childExists = await db.query(
            'SELECT photo_path FROM children WHERE child_id = $1',
            [id]
        );

        if (!childExists.rows.length) {
            logger.warn('Попытка удаления несуществующего ребенка:', { childId: id });
            return res.status(404).json({ error: 'Ребенок не найден' });
        }

        // Если есть фото, удаляем его
        const { photo_path } = childExists.rows[0];
        if (photo_path) {
            try {
                const fullPath = path.join(__dirname, '..', 'uploads', 'photos', photo_path);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    logger.info('Фото удалено:', fullPath);
                }
            } catch (photoError) {
                logger.error('Ошибка при удалении фото:', photoError);
            }
        }

        // Начинаем транзакцию
        await db.query('BEGIN');

        try {
            // Удаляем все связанные рекомендации
            await db.query(
                'DELETE FROM recommendations WHERE child_id = $1',
                [id]
            );

            // Удаляем все записи о посещаемости
            await db.query(
                'DELETE FROM attendance WHERE child_id = $1',
                [id]
            );

            // Удаляем самого ребенка
            const deleteResult = await db.query(
                'DELETE FROM children WHERE child_id = $1 RETURNING child_id',
                [id]
            );

            await db.query('COMMIT');

            logger.info('Ребенок успешно удален:', { childId: id });
            res.json({
                message: 'Ребенок успешно удален',
                deletedChildId: deleteResult.rows[0].child_id
            });
        } catch (error) {
            await db.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        logger.error('Ошибка при удалении ребенка:', {
            error: error.message,
            stack: error.stack,
            childId: req.params.id
        });
        res.status(500).json({
            error: 'Ошибка при удалении ребенка',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;