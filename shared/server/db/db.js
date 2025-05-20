const { Pool } = require('pg');
require('dotenv').config();

console.log('Инициализация подключения к базе данных...');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    statement_timeout: 10000
});

// Обработка событий подключения
pool.on('connect', () => {
    console.log('База данных успешно подключена');
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к базе данных:', err);
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
        console.log('Executing query:', {
            text,
            params,
            timestamp: new Date().toISOString()
        });
        
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
                code: err.code,
                query: text,
                params: params
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