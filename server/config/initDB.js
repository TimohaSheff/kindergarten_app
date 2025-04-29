const { query } = require('./db');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
    try {
        // Читаем схему из файла
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Выполняем SQL-скрипт
        await query(schema);

        console.log('База данных успешно инициализирована');
    } catch (err) {
        console.error('Ошибка при инициализации базы данных:', err);
        throw err;
    }
};

module.exports = initDatabase; 