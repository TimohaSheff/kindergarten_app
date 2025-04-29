-- Удаление существующих таблиц
DROP TABLE IF EXISTS child_benefits CASCADE;
DROP TABLE IF EXISTS child_services CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS progress_reports CASCADE;
DROP TABLE IF EXISTS benefits CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS menu CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS daily_schedule CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_group_attendance CASCADE;

-- Создание таблицы users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    photo BYTEA,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы groups
CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    age_range VARCHAR(50) NOT NULL,
    caretaker_full_name TEXT,
    description TEXT
);

-- Создание таблицы children
CREATE TABLE children (
    child_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    parent_id INTEGER REFERENCES users(user_id),
    group_id INTEGER REFERENCES groups(group_id),
    allergies TEXT,
    photo BYTEA,
    photo_mime_type VARCHAR(50),
    services INTEGER[]
);

-- Создание таблицы daily_schedule
CREATE TABLE daily_schedule (
    schedule_id SERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    time_of_day VARCHAR(50) NOT NULL,
    group_name VARCHAR(100) NOT NULL
);

-- Создание таблицы services
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    duration VARCHAR(50),
    total_price DECIMAL(10,2),
    days_of_week VARCHAR(255),
    time VARCHAR(100),
    teachers TEXT
);

-- Создание таблицы menu
CREATE TABLE menu (
    menu_id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    dish_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    weight VARCHAR(50) NOT NULL,
    group_name VARCHAR(100) NOT NULL
);

-- Создание таблицы attendance с оптимизированной структурой
CREATE TABLE attendance (
    attendance_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id),
    date DATE NOT NULL,
    is_present BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, date)
) PARTITION BY RANGE (date);

-- Создание партиций для таблицы attendance по месяцам
CREATE TABLE attendance_y2023m01 PARTITION OF attendance
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
CREATE TABLE attendance_y2023m02 PARTITION OF attendance
    FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
CREATE TABLE attendance_y2023m03 PARTITION OF attendance
    FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
CREATE TABLE attendance_y2023m04 PARTITION OF attendance
    FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
CREATE TABLE attendance_y2023m05 PARTITION OF attendance
    FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
CREATE TABLE attendance_y2023m06 PARTITION OF attendance
    FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
CREATE TABLE attendance_y2023m07 PARTITION OF attendance
    FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
CREATE TABLE attendance_y2023m08 PARTITION OF attendance
    FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
CREATE TABLE attendance_y2023m09 PARTITION OF attendance
    FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
CREATE TABLE attendance_y2023m10 PARTITION OF attendance
    FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
CREATE TABLE attendance_y2023m11 PARTITION OF attendance
    FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
CREATE TABLE attendance_y2023m12 PARTITION OF attendance
    FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');

-- Создание партиций для текущего года
CREATE TABLE attendance_y2024m01 PARTITION OF attendance
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE attendance_y2024m02 PARTITION OF attendance
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE attendance_y2024m03 PARTITION OF attendance
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE attendance_y2024m04 PARTITION OF attendance
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE attendance_y2024m05 PARTITION OF attendance
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE attendance_y2024m06 PARTITION OF attendance
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE attendance_y2024m07 PARTITION OF attendance
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE attendance_y2024m08 PARTITION OF attendance
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE attendance_y2024m09 PARTITION OF attendance
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE attendance_y2024m10 PARTITION OF attendance
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE attendance_y2024m11 PARTITION OF attendance
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE attendance_y2024m12 PARTITION OF attendance
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- Создание партиций для следующего года
CREATE TABLE attendance_y2025m01 PARTITION OF attendance
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE attendance_y2025m02 PARTITION OF attendance
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE attendance_y2025m03 PARTITION OF attendance
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE attendance_y2025m04 PARTITION OF attendance
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE attendance_y2025m05 PARTITION OF attendance
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE attendance_y2025m06 PARTITION OF attendance
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE attendance_y2025m07 PARTITION OF attendance
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE attendance_y2025m08 PARTITION OF attendance
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE attendance_y2025m09 PARTITION OF attendance
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE attendance_y2025m10 PARTITION OF attendance
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE attendance_y2025m11 PARTITION OF attendance
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE attendance_y2025m12 PARTITION OF attendance
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Создание партиции по умолчанию для будущих дат
CREATE TABLE attendance_default PARTITION OF attendance DEFAULT;

-- Добавляем индексы для оптимизации запросов
CREATE INDEX idx_attendance_child_date ON attendance(child_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_child_id ON attendance(child_id);
CREATE INDEX idx_attendance_is_present ON attendance(is_present);
CREATE INDEX idx_attendance_date_range ON attendance(date, child_id);
CREATE INDEX idx_children_group_id ON children(group_id);
CREATE INDEX idx_children_parent_id ON children(parent_id);

-- Создание материализованного представления для часто запрашиваемых данных о посещаемости
CREATE MATERIALIZED VIEW mv_group_attendance AS
SELECT 
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
    groups g ON c.group_id = g.group_id;

-- Индекс для материализованного представления
CREATE UNIQUE INDEX idx_mv_group_attendance_id ON mv_group_attendance(attendance_id);
CREATE INDEX idx_mv_group_attendance_group_date ON mv_group_attendance(group_id, date);
CREATE INDEX idx_mv_group_attendance_child_date ON mv_group_attendance(child_id, date);

-- Создание таблицы payments
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL
);

-- Создание таблицы benefits
CREATE TABLE benefits (
    benefit_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    benefit_type VARCHAR(100) NOT NULL
);

-- Создание таблицы progress_reports
CREATE TABLE progress_reports (
    report_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id),
    report_date DATE NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('physical', 'cognitive', 'social', 'emotional', 'language')),
    score INTEGER CHECK (score BETWEEN 1 AND 5),
    notes TEXT,
    teacher_id INTEGER REFERENCES users(user_id),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы recommendations
CREATE TABLE recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id),
    user_id INTEGER REFERENCES users(user_id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recommendation_text TEXT NOT NULL
);

-- Создание таблицы child_services
CREATE TABLE child_services (
    child_service_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id),
    service_id INTEGER REFERENCES services(service_id),
    registration_date DATE NOT NULL
);

-- Создание таблицы child_benefits
CREATE TABLE child_benefits (
    child_benefit_id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(child_id),
    benefit_type VARCHAR(100) NOT NULL,
    valid_until DATE NOT NULL
);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_progress_reports_updated_at
    BEFORE UPDATE ON progress_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Триггер для обновления updated_at в таблице attendance
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления материализованного представления
CREATE OR REPLACE FUNCTION refresh_mv_group_attendance()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_group_attendance;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Триггер для обновления материализованного представления при изменении данных в таблице attendance
CREATE TRIGGER refresh_mv_group_attendance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_mv_group_attendance();

-- Функция для автоматического создания партиций для будущих месяцев
CREATE OR REPLACE FUNCTION create_attendance_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    -- Получаем дату из новой записи
    partition_date := NEW.date;
    
    -- Формируем имя партиции
    partition_name := 'attendance_y' || 
                     EXTRACT(YEAR FROM partition_date)::TEXT || 
                     'm' || 
                     LPAD(EXTRACT(MONTH FROM partition_date)::TEXT, 2, '0');
    
    -- Формируем диапазон дат для партиции
    partition_start := TO_CHAR(DATE_TRUNC('month', partition_date), 'YYYY-MM-DD');
    partition_end := TO_CHAR(DATE_TRUNC('month', partition_date + INTERVAL '1 month'), 'YYYY-MM-DD');
    
    -- Проверяем, существует ли уже партиция
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
    ) THEN
        -- Создаем новую партицию
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF attendance FOR VALUES FROM (%L) TO (%L)',
            partition_name, partition_start, partition_end
        );
        
        RAISE NOTICE 'Created new partition: %', partition_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания партиций
CREATE TRIGGER create_attendance_partition_trigger
    BEFORE INSERT ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION create_attendance_partition(); 