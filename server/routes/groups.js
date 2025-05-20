const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const logger = require('../utils/logger');
const { pool, query } = require('../config/db');

// Получение всех групп
router.get('/', auth, async (req, res) => {
  try {
    logger.info('Запрос на получение всех групп');
    logger.info('Токен получен и проверен:', { userId: req.user.id, role: req.user.role });

    // Сначала получаем базовую информацию о группах
    const baseQuery = `
      SELECT 
        g.group_id,
        g.group_name,
        g.age_range,
        g.teacher_id
      FROM groups g
      ORDER BY g.group_name;
    `;

    logger.info('Выполнение базового запроса групп');
    const result = await pool.query(baseQuery).catch(err => {
      logger.error('Ошибка SQL запроса:', { 
        error: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint
      });
      throw err;
    });
    
    logger.info('Получены группы:', { count: result?.rows?.length || 0 });

    // Получаем количество детей для каждой группы
    const childrenCountQuery = `
      SELECT 
        group_id,
        COUNT(DISTINCT child_id) as children_count
      FROM children
      GROUP BY group_id;
    `;

    logger.info('Получение количества детей для групп');
    const childrenCounts = await pool.query(childrenCountQuery);
    const countsMap = new Map(
      childrenCounts.rows.map(row => [row.group_id, parseInt(row.children_count)])
    );

    // Получаем информацию об учителях
    const teachersQuery = `
      SELECT 
        user_id,
        first_name,
        last_name
      FROM users
      WHERE role = 'teacher';
    `;

    logger.info('Получение информации об учителях');
    const teachersResult = await pool.query(teachersQuery);
    const teachersMap = new Map(
      teachersResult.rows.map(teacher => [
        teacher.user_id,
        { id: teacher.user_id, name: `${teacher.first_name} ${teacher.last_name}` }
      ])
    );

    // Нормализация данных
    const groups = result.rows.map(group => {
      const teacherIds = Array.isArray(group.teacher_id) ? group.teacher_id : [];
      const teachers = teacherIds
        .map(id => teachersMap.get(id))
        .filter(Boolean);

      return {
        id: group.group_id,
        group_id: group.group_id,
        name: group.group_name,
        group_name: group.group_name,
        age_range: group.age_range,
        teachers: teachers,
        children_count: countsMap.get(group.group_id) || 0
      };
    });

    logger.info('Данные групп обработаны:', { 
      groupCount: groups.length,
      sampleGroup: groups[0] ? {
        id: groups[0].id,
        name: groups[0].name,
        teacherCount: groups[0].teachers.length,
        childrenCount: groups[0].children_count
      } : null
    });

    res.json(groups);
  } catch (error) {
    logger.error('Ошибка при получении групп:', { 
      error: error.message,
      code: error.code,
      stack: error.stack,
      detail: error.detail,
      hint: error.hint
    });
    
    if (error.code === '28P01') {
      return res.status(401).json({ error: 'Ошибка аутентификации базы данных' });
    } else if (error.code === '3D000') {
      return res.status(503).json({ error: 'База данных недоступна' });
    } else if (error.code === '57P03') {
      return res.status(503).json({ error: 'База данных не запущена' });
    } else if (error.code === '42P01') {
      return res.status(503).json({ error: 'Таблица не существует' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Получение конкретной группы
router.get('/:id', auth, async (req, res) => {
  let client;
  try {
    const { id } = req.params;
    logger.info('Запрос на получение группы', { groupId: id });

    // Получаем подключение к базе данных
    try {
      client = await pool.connect();
    } catch (dbError) {
      logger.error('Ошибка подключения к базе данных:', { 
        error: dbError.message,
        stack: dbError.stack 
      });
      return res.status(503).json({ error: 'База данных недоступна' });
    }

    // Получаем информацию о группе
    const groupResult = await client.query(`
      SELECT 
        g.*,
        COUNT(c.child_id) as children_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.user_id,
              'name', CONCAT(u.first_name, ' ', u.last_name)
            )
          ) FILTER (WHERE u.user_id IS NOT NULL),
          '[]'
        ) as teachers
      FROM groups g
      LEFT JOIN children c ON c.group_id = g.group_id
      LEFT JOIN LATERAL unnest(g.teacher_id) as t(teacher_id) ON true
      LEFT JOIN users u ON u.user_id = t.teacher_id AND u.role = 'teacher'
      WHERE g.group_id = $1
      GROUP BY g.group_id, g.group_name
    `, [id]);

    if (groupResult.rows.length === 0) {
      logger.warn('Группа не найдена:', { groupId: id });
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    // Нормализация данных группы
    const group = {
      ...groupResult.rows[0],
      id: groupResult.rows[0].group_id,
      group_id: groupResult.rows[0].group_id,
      name: groupResult.rows[0].group_name,
      group_name: groupResult.rows[0].group_name,
      teachers: Array.isArray(groupResult.rows[0].teachers) ? 
        groupResult.rows[0].teachers.filter(t => t && t.id) : [],
      children_count: parseInt(groupResult.rows[0].children_count) || 0
    };

    logger.info('Отправка данных группы:', { 
      groupId: id, 
      groupName: group.name,
      teacherCount: group.teachers?.length || 0,
      childrenCount: group.children_count 
    });

    res.json(group);
  } catch (error) {
    logger.error('Ошибка при получении группы:', { 
      groupId: req.params.id, 
      error: error.message,
      stack: error.stack 
    });
    
    // Определяем тип ошибки и отправляем соответствующий статус
    if (error.code === '28P01') {
      res.status(401).json({ error: 'Ошибка аутентификации базы данных' });
    } else if (error.code === '3D000') {
      res.status(503).json({ error: 'База данных недоступна' });
    } else if (error.code === '57P03') {
      res.status(503).json({ error: 'База данных не запущена' });
    } else {
      res.status(500).json({ 
        error: 'Ошибка при получении информации о группе',
        details: error.message
      });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Создание новой группы
router.post('/', [auth, checkRole(['admin'])], async (req, res) => {
  const client = await pool.connect();
  try {
    const groupData = req.body;
    logger.info('Запрос на создание группы', { data: groupData });
    const { group_name, age_range, teacher_id } = groupData;

    await client.query('BEGIN');

    // Преобразуем teacher_id в массив целых чисел
    const normalizedTeacherIds = Array.isArray(teacher_id) ? teacher_id.map(Number).filter(id => !isNaN(id)) : 
                                typeof teacher_id === 'string' ? teacher_id.split(',').map(Number).filter(id => !isNaN(id)) :
                                [];

    logger.info('Нормализованные ID учителей:', normalizedTeacherIds);

    // Проверяем существование учителей
    if (normalizedTeacherIds.length > 0) {
      const teachersResult = await client.query(`
        SELECT user_id, role, first_name, last_name
        FROM users 
        WHERE user_id = ANY($1::int[]) AND role = 'teacher'
      `, [normalizedTeacherIds]);

      logger.info('Найденные учителя:', teachersResult.rows);

      if (teachersResult.rows.length !== normalizedTeacherIds.length) {
        const foundIds = teachersResult.rows.map(t => t.user_id);
        const missingIds = normalizedTeacherIds.filter(id => !foundIds.includes(id));
        logger.error('Несоответствие учителей:', {
          requested: normalizedTeacherIds,
          found: foundIds,
          missing: missingIds
        });
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Один или несколько учителей не найдены',
          details: {
            requested: normalizedTeacherIds,
            found: foundIds,
            missing: missingIds
          }
        });
      }
    }

    const result = await client.query(
      'INSERT INTO groups (group_name, age_range, teacher_id) VALUES ($1, $2, $3::integer[]) RETURNING *',
      [group_name.trim(), age_range ? age_range.trim() : '', normalizedTeacherIds]
    );

    logger.info('Группа создана:', result.rows[0]);

    // Получаем информацию об учителях
    let teachers = [];
    if (normalizedTeacherIds.length > 0) {
      const teachersResult = await client.query(`
        SELECT user_id, first_name, last_name
        FROM users
        WHERE user_id = ANY($1::int[]) AND role = 'teacher'
        ORDER BY first_name, last_name
      `, [normalizedTeacherIds]);

      teachers = teachersResult.rows.map(teacher => ({
        id: teacher.user_id,
        name: `${teacher.first_name} ${teacher.last_name}`
      }));
    }

    await client.query('COMMIT');

    const group = {
      ...result.rows[0],
      teachers,
      children_count: 0
    };

    logger.info('Отправка ответа:', group);
    res.status(201).json(group);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Ошибка при создании группы:', { 
      error: error.message,
      stack: error.stack,
      data: req.body
    });
    res.status(500).json({ error: 'Ошибка при создании группы', details: error.message });
  } finally {
    client.release();
  }
});

// Обновление группы
router.put('/:id', [auth, checkRole(['admin'])], async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.info('Запрос на обновление группы:', { 
      groupId: req.params.id,
      data: updateData
    });
    const { group_name, age_range, teacher_id } = updateData;
    
    if (!group_name) {
      return res.status(400).json({ message: 'Название группы обязательно' });
    }

    await client.query('BEGIN');

    // Проверяем существование группы
    const checkGroup = await client.query(
      'SELECT group_id FROM groups WHERE group_id = $1 FOR UPDATE',
      [id]
    );

    if (checkGroup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Группа не найдена' });
    }

    // Преобразуем teacher_id в массив целых чисел
    const normalizedTeacherIds = Array.isArray(teacher_id) ? teacher_id.map(Number).filter(id => !isNaN(id)) : 
                                typeof teacher_id === 'string' ? teacher_id.split(',').map(Number).filter(id => !isNaN(id)) :
                                [];

    logger.info('Нормализованные ID учителей:', normalizedTeacherIds);

    // Проверяем существование учителей
    if (normalizedTeacherIds.length > 0) {
      const teachersExist = await client.query(`
        SELECT user_id, role, first_name, last_name
        FROM users 
        WHERE user_id = ANY($1::int[]) AND role = 'teacher'
      `, [normalizedTeacherIds]);

      logger.info('Найденные учителя:', teachersExist.rows);

      if (teachersExist.rows.length !== normalizedTeacherIds.length) {
        const foundIds = teachersExist.rows.map(t => t.user_id);
        const missingIds = normalizedTeacherIds.filter(id => !foundIds.includes(id));
        logger.error('Несоответствие учителей:', {
          requested: normalizedTeacherIds,
          found: foundIds,
          missing: missingIds
        });
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Один или несколько учителей не найдены',
          details: {
            requested: normalizedTeacherIds,
            found: foundIds,
            missing: missingIds
          }
        });
      }
    }

    // Обновляем группу
    const result = await client.query(
      `UPDATE groups 
       SET group_name = $1, 
           age_range = $2, 
           teacher_id = $3::integer[]
       WHERE group_id = $4 
       RETURNING *`,
      [group_name.trim(), age_range ? age_range.trim() : '', normalizedTeacherIds, id]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      throw new Error('Не удалось обновить группу');
    }

    // Получаем информацию об учителях
    let teachers = [];
    if (normalizedTeacherIds.length > 0) {
      const teachersResult = await client.query(`
        SELECT user_id, first_name, last_name
        FROM users
        WHERE user_id = ANY($1::int[]) AND role = 'teacher'
        ORDER BY first_name, last_name
      `, [normalizedTeacherIds]);

      teachers = teachersResult.rows.map(teacher => ({
        id: teacher.user_id,
        name: `${teacher.first_name} ${teacher.last_name}`
      }));
    }

    // Получаем количество детей
    const childrenCount = await client.query(
      'SELECT COUNT(*) as count FROM children WHERE group_id = $1',
      [id]
    );

    await client.query('COMMIT');

    const updatedGroup = {
      ...result.rows[0],
      id: result.rows[0].group_id,
      teachers,
      children_count: parseInt(childrenCount.rows[0]?.count || 0)
    };

    logger.info('Группа успешно обновлена:', { 
      groupId: id,
      teacherCount: teachers.length,
      childrenCount: updatedGroup.children_count
    });

    res.json(updatedGroup);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Ошибка при обновлении группы:', { 
      groupId: req.params.id,
      error: error.message,
      stack: error.stack
    });

    // Определяем тип ошибки и отправляем соответствующий статус
    if (error.code === '28P01') {
      res.status(401).json({ error: 'Ошибка аутентификации базы данных' });
    } else if (error.code === '3D000') {
      res.status(503).json({ error: 'База данных недоступна' });
    } else if (error.code === '57P03') {
      res.status(503).json({ error: 'База данных не запущена' });
    } else {
      res.status(500).json({ 
        error: 'Ошибка при обновлении группы',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Удаление группы
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    logger.info('Запрос на удаление группы', { groupId: id });

    await client.query('BEGIN');

    // Проверяем существование группы
    const groupCheck = await client.query(
      'SELECT group_id FROM groups WHERE group_id = $1',
      [id]
    );

    if (groupCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn('Попытка удаления несуществующей группы:', { groupId: id });
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    // Проверяем, есть ли дети в группе
    const childrenCheck = await client.query(
      'SELECT COUNT(*) as count FROM children WHERE group_id = $1',
      [id]
    );

    if (parseInt(childrenCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      logger.warn('Попытка удаления группы с активными детьми:', { 
        groupId: id, 
        childrenCount: childrenCheck.rows[0].count 
      });
      return res.status(400).json({ 
        error: 'Невозможно удалить группу, в которой есть дети' 
      });
    }

    // Удаляем саму группу
    const deleteResult = await client.query(
      'DELETE FROM groups WHERE group_id = $1 RETURNING group_id',
      [id]
    );

    await client.query('COMMIT');

    logger.info('Группа успешно удалена:', { groupId: id });
    res.json({ 
      message: 'Группа успешно удалена',
      deletedGroupId: deleteResult.rows[0].group_id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Ошибка при удалении группы:', { 
      groupId: req.params.id, 
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Ошибка при удалении группы',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Получить детей группы
router.get('/:id/children', auth, async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    logger.info('Запрос на получение детей группы:', { 
      groupId: id,
      userId: req.user?.user_id,
      userRole: req.user?.role
    });

    try {
      client = await pool.connect();
      logger.info('Успешное подключение к базе данных');
    } catch (dbError) {
      logger.error('Ошибка подключения к базе данных:', { 
        error: dbError.message,
        stack: dbError.stack 
      });
      return res.status(503).json({ error: 'База данных недоступна' });
    }

    // Проверяем существование группы
    logger.info('Проверка существования группы:', { groupId: id });
    const groupCheck = await client.query(
      'SELECT group_id, group_name FROM groups WHERE group_id = $1',
      [id]
    );

    if (!groupCheck.rows.length) {
      logger.warn('Группа не найдена:', { groupId: id });
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    logger.info('Группа найдена, начинаем запрос детей');

    try {
        // Сначала попробуем получить только базовую информацию
        const baseQuery = `
            SELECT 
                c.child_id,
                c.name,
                c.date_of_birth,
                c.parent_id,
                c.group_id
            FROM children c
            WHERE c.group_id = $1
        `;

        logger.info('Выполнение базового запроса:', { 
            query: baseQuery, 
            groupId: id 
        });

        const baseResult = await client.query(baseQuery, [id]);
        logger.info('Результат базового запроса:', { 
            rowCount: baseResult.rowCount,
            firstRow: baseResult.rows[0]
        });

        if (!baseResult.rows.length) {
            logger.info('Дети в группе не найдены');
            return res.json([]);
        }

        // Теперь получим дополнительную информацию
        const fullQuery = `
            SELECT 
                c.child_id,
                COALESCE(c.name, 'Без имени') as name,
                c.date_of_birth,
                c.parent_id,
                c.group_id,
                COALESCE(c.allergies, ARRAY[]::text[]) as allergies,
                c.photo_path,
                COALESCE(c.services, ARRAY[]::integer[]) as service_ids,
                (
                    SELECT array_agg(s.service_name)
                    FROM services s
                    WHERE s.service_id = ANY(c.services)
                ) as service_names,
                g.group_name,
                u.first_name as parent_first_name,
                u.last_name as parent_last_name,
                u.email as parent_email,
                u.phone as parent_phone
            FROM children c
            LEFT JOIN groups g ON c.group_id = g.group_id
            LEFT JOIN users u ON c.parent_id = u.user_id
            WHERE c.group_id = $1
            ORDER BY c.name
        `;

        logger.info('Выполнение полного запроса:', { 
            query: fullQuery, 
            groupId: id 
        });

        const result = await client.query(fullQuery, [id]);
        logger.info('Результат полного запроса:', { 
            rowCount: result.rowCount,
            firstRow: result.rows[0]
        });

        // Форматируем данные
        logger.info('Начало форматирования данных');
        const children = result.rows.map(child => {
            try {
                const serviceIds = Array.isArray(child.service_ids) ? child.service_ids : [];
                const serviceNames = Array.isArray(child.service_names) ? child.service_names : [];
                    
                logger.info('Обработка данных ребенка:', {
                    childId: child.child_id,
                    name: child.name,
                    serviceIds,
                    serviceNames,
                    parent: {
                        id: child.parent_id,
                        firstName: child.parent_first_name,
                        lastName: child.parent_last_name
                    }
                });
                    
                return {
                    id: child.child_id,
                    child_id: child.child_id,
                    name: child.name,
                    date_of_birth: child.date_of_birth,
                    parent_id: child.parent_id,
                    group_id: child.group_id,
                    group_name: child.group_name || 'Без группы',
                    allergies: Array.isArray(child.allergies) ? child.allergies : [],
                    photo_path: child.photo_path,
                    parent: {
                        id: child.parent_id,
                        name: child.parent_first_name && child.parent_last_name 
                            ? `${child.parent_first_name} ${child.parent_last_name}`.trim()
                            : 'Не указан',
                        phone: child.parent_phone || 'Не указан',
                        email: child.parent_email || 'Не указан'
                    },
                    services: serviceIds.map((id, index) => ({
                        id: id,
                        name: serviceNames[index] || `Услуга ${id}`
                    }))
                };
            } catch (formatError) {
                logger.error('Ошибка при форматировании данных ребенка:', {
                    error: formatError.message,
                    childData: child
                });
                throw formatError;
            }
        });

        logger.info('Данные успешно отформатированы:', { 
            childrenCount: children.length,
            sampleChild: children[0] ? {
                id: children[0].id,
                name: children[0].name,
                serviceCount: children[0].services.length
            } : null
        });

        res.json(children);
    } catch (queryError) {
        logger.error('Ошибка при выполнении запроса:', {
            error: queryError.message,
            stack: queryError.stack,
            code: queryError.code,
            detail: queryError.detail,
            query: queryError.query,
            parameters: queryError.parameters
        });
        throw queryError;
    }
  } catch (error) {
    logger.error('Ошибка при получении детей группы:', { 
      groupId: req.params.id, 
      error: error.message,
      stack: error.stack,
      query: error.query,
      parameters: error.parameters
    });
    
    res.status(500).json({ 
      error: 'Ошибка при получении списка детей группы',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (client) {
      try {
        await client.release();
        logger.info('Соединение с базой данных закрыто');
      } catch (releaseError) {
        logger.error('Ошибка при закрытии соединения:', {
          error: releaseError.message
        });
      }
    }
  }
});

// Получить количество детей в группе
router.get('/:id/children/count', auth, async (req, res) => {
  let client;
  
  try {
    const { id } = req.params;
    logger.info('Запрос на получение количества детей группы:', { groupId: id });

    // Получаем подключение к базе данных
    try {
      client = await pool.connect();
    } catch (dbError) {
      logger.error('Ошибка подключения к базе данных:', { 
        error: dbError.message,
        stack: dbError.stack 
      });
      return res.status(503).json({ error: 'База данных недоступна' });
    }

    // Проверяем существование группы
    const groupCheck = await client.query(
      'SELECT group_id, group_name FROM groups WHERE group_id = $1',
      [id]
    );

    if (!groupCheck.rows.length) {
      logger.warn('Группа не найдена:', { groupId: id });
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    // Получаем количество детей в группе (точный подсчет)
    const countResult = await client.query(`
      SELECT COUNT(DISTINCT child_id) as count
      FROM children
      WHERE group_id = $1
    `, [id]);

    if (!countResult || !countResult.rows || !countResult.rows[0]) {
      logger.error('Ошибка при получении данных из базы:', { groupId: id });
      return res.status(500).json({ error: 'Ошибка при получении данных' });
    }

    const count = parseInt(countResult.rows[0].count) || 0;
    
    logger.info('Отправка данных о количестве детей группы:', { 
      groupId: id, 
      childrenCount: count
    });

    res.json({ count, groupId: id });
  } catch (error) {
    logger.error('Ошибка при получении количества детей группы:', { 
      groupId: req.params.id, 
      error: error.message,
      stack: error.stack 
    });
    
    // Определяем тип ошибки и отправляем соответствующий статус
    if (error.code === '28P01') {
      res.status(401).json({ error: 'Ошибка аутентификации базы данных' });
    } else if (error.code === '3D000') {
      res.status(503).json({ error: 'База данных недоступна' });
    } else if (error.code === '57P03') {
      res.status(503).json({ error: 'База данных не запущена' });
    } else {
      res.status(500).json({ 
        error: 'Ошибка при получении количества детей группы',
        details: error.message
      });
    }
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;