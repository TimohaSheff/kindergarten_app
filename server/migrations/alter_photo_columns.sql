-- Изменение структуры таблицы children
ALTER TABLE children 
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS photo_mime_type,
    ADD COLUMN photo_path VARCHAR(255);

-- Изменение структуры таблицы users
ALTER TABLE users
    DROP COLUMN IF EXISTS photo,
    DROP COLUMN IF EXISTS photo_mime_type,
    ADD COLUMN photo_path VARCHAR(255);

-- Создание директории для хранения фотографий
CREATE OR REPLACE FUNCTION create_photos_directory() RETURNS void AS $$
BEGIN
    EXECUTE format('CREATE DIRECTORY IF NOT EXISTS %L', 'uploads/photos');
END;
$$ LANGUAGE plpgsql; 