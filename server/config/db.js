const { Pool } = require('pg');
require('dotenv').config();

console.log('Инициализация подключения к базе данных...');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    client_encoding: 'UTF8',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
    console.log('Новое подключение к базе данных установлено');
});

pool.on('error', (err) => {
    console.error('Ошибка в пуле подключений:', err);
    process.exit(-1);
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        process.exit(-1);
    }
    console.log('Successfully connected to the database');
    release();
});

const query = async (text, params) => {
    const start = Date.now();
    try {
        console.log('Executing query...');
        
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        console.log('Query completed:', {
            duration,
            rows: res.rowCount,
            timestamp: new Date().toISOString()
        });

        return res;
    } catch (err) {
        const duration = Date.now() - start;
        console.error('Query execution failed:', {
            duration,
            error: {
                message: err.message,
                code: err.code
            },
            timestamp: new Date().toISOString()
        });
        throw err;
    }
};

module.exports = {
    query,
    pool
}; 