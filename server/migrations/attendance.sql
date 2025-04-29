-- Удаляем существующую таблицу attendance если она существует
DROP TABLE IF EXISTS attendance CASCADE;

-- Создание простой таблицы attendance
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL,
    date DATE NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(child_id, date)
);

-- Индекс для быстрого поиска
CREATE INDEX idx_attendance_child_date ON attendance(child_id, date); 