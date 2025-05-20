const { Pool } = require('pg');
const logger = require('../utils/logger');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    client_encoding: 'UTF8',
    options: '-c client_encoding=UTF8',
    connectionTimeoutMillis: 30000,
    statement_timeout: 60000,
    query_timeout: 60000,
    error: (err, client) => {
        console.error('Database error:', err);
        if (client) {
            client.release(true);
        }
    }
});

// Добавляем обработчик подключения
pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
    console.log('Connected to PostgreSQL database with UTF8 encoding');
});

// Добавляем обработчик ошибок
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const query = async (text, params) => {
    let client;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
        try {
            client = await pool.connect();
            await client.query('SET client_encoding TO UTF8');
            const start = Date.now();
            const res = await client.query(text, params);
            const duration = Date.now() - start;
            
            logger.debug('Выполнен запрос:', {
                text,
                duration,
                rows: res.rowCount
            });
            
            return res;
        } catch (err) {
            lastError = err;
            retries--;
            
            logger.error('Ошибка выполнения запроса:', { 
                error: err.message,
                code: err.code,
                query: text,
                retriesLeft: retries
            });
            
            // Если ошибка связана с подключением, пытаемся переподключиться
            if (err.code === 'ECONNREFUSED' || err.code === '57P03' || err.code === '3D000') {
                logger.info('Попытка переподключения к БД...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            // Если это не ошибка подключения, прекращаем попытки
            if (err.code !== 'ECONNREFUSED' && err.code !== '57P03' && err.code !== '3D000') {
                throw err;
            }
            
            if (retries === 0) {
                logger.error('Все попытки подключения исчерпаны:', {
                    error: err.message,
                    code: err.code
                });
                throw err;
            }
            
            // Ждем перед следующей попыткой
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            if (client) {
                client.release();
            }
        }
    }
    
    throw lastError;
};

module.exports = {
    query,
    pool
}; 