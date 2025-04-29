-- Создаем временную таблицу для хранения старых данных
CREATE TEMP TABLE temp_children_photos AS
SELECT child_id, photo, photo_mime_type
FROM children
WHERE photo IS NOT NULL;

CREATE TEMP TABLE temp_users_photos AS
SELECT user_id, photo, photo_mime_type
FROM users
WHERE photo IS NOT NULL;

-- Обновляем записи в таблице children, устанавливая photo_path в NULL
UPDATE children SET photo_path = NULL;

-- Обновляем записи в таблице users, устанавливая photo_path в NULL
UPDATE users SET photo_path = NULL;

-- Очищаем таблицы от старых колонок
ALTER TABLE children 
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS photo_mime_type;

ALTER TABLE users
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS photo_mime_type;

-- Выводим информацию о количестве перенесенных фотографий
SELECT 'Children photos to migrate: ' || COUNT(*)::text as info FROM temp_children_photos;
SELECT 'User photos to migrate: ' || COUNT(*)::text as info FROM temp_users_photos;

-- Удаляем временные таблицы
DROP TABLE temp_children_photos;
DROP TABLE temp_users_photos; 