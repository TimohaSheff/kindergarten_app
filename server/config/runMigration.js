const { query } = require('./db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        // Читаем миграцию из файла
        const migrationPath = path.join(__dirname, '../migrations/alter_children_table.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');

        // Выполняем SQL-скрипт
        await query(migration);

        console.log('Миграция успешно выполнена');
    } catch (err) {
        console.error('Ошибка при выполнении миграции:', err);
        throw err;
    }
};

// Запускаем миграцию
runMigration().catch(console.error); 