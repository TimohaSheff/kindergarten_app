const { query } = require('../config/db');
const logger = require('../utils/logger');

async function seedDatabase() {
    try {
        logger.info('Начало заполнения базы данных');
        
        // Создание таблиц
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(20),
                photo_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS groups (
                group_id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                age_range VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS children (
                child_id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                date_of_birth DATE NOT NULL,
                parent_id INTEGER REFERENCES users(user_id),
                group_id INTEGER REFERENCES groups(group_id),
                allergies TEXT[],
                photo_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS services (
                service_id SERIAL PRIMARY KEY,
                service_name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS child_services (
                child_id INTEGER REFERENCES children(child_id),
                service_id INTEGER REFERENCES services(service_id),
                PRIMARY KEY (child_id, service_id)
            );
        `);

        logger.info('Таблицы успешно созданы');

        // Добавление тестовых данных
        await query(`
            INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
            VALUES 
                ('admin@example.com', '$2b$10$your_hash_here', 'admin', 'Админ', 'Админов', '+7999999999'),
                ('teacher@example.com', '$2b$10$your_hash_here', 'teacher', 'Учитель', 'Учителев', '+7888888888'),
                ('parent@example.com', '$2b$10$your_hash_here', 'parent', 'Родитель', 'Родителев', '+7777777777')
            ON CONFLICT (email) DO NOTHING;
        `);

        logger.info('Тестовые пользователи добавлены');

        await query(`
            INSERT INTO groups (name, age_range)
            VALUES 
                ('Младшая группа', '2-3 года'),
                ('Средняя группа', '3-4 года'),
                ('Старшая группа', '4-5 лет'),
                ('Подготовительная группа', '5-6 лет')
            ON CONFLICT DO NOTHING;
        `);

        logger.info('Тестовые группы добавлены');

        logger.info('База данных успешно заполнена');
    } catch (error) {
        logger.error('Ошибка при заполнении базы данных:', { error: error.message, stack: error.stack });
        throw error;
    }
}

// Запускаем скрипт только если он вызван напрямую
if (require.main === module) {
    seedDatabase()
        .then(() => {
            logger.info('Скрипт успешно завершен');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Скрипт завершился с ошибкой:', { error: error.message });
            process.exit(1);
        });
} 