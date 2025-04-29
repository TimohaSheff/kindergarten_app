-- Добавление колонки photo_path в таблицу children
ALTER TABLE children
ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255);

-- Добавление колонки photo_path в таблицу users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS photo_path VARCHAR(255);

-- Вывод информации о количестве записей в таблицах
SELECT 'Number of children records: ' || COUNT(*)::text as info FROM children;
SELECT 'Number of users records: ' || COUNT(*)::text as info FROM users; 