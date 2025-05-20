const { pool, query } = require('./db/db');
const logger = require('./utils/logger');

module.exports = {
    db: { pool, query },
    logger
}; 