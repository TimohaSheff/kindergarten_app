// Функции для работы с посещаемостью
const markAttendance = async (childId, date, isPresent) => {
    const query = `
        INSERT INTO attendance (child_id, date, is_present)
        VALUES ($1, $2, $3)
        ON CONFLICT (child_id, date)
        DO UPDATE SET 
            is_present = $3
        RETURNING *;
    `;
    
    try {
        const result = await pool.query(query, [childId, date, isPresent]);
        return result.rows[0];
    } catch (error) {
        logger.error('Error in markAttendance:', error);
        throw error;
    }
};

const getAttendanceByDate = async (date) => {
    const query = `
        SELECT a.*, c.name
        FROM attendance a
        JOIN children c ON a.child_id = c.child_id
        WHERE a.date = $1
        ORDER BY c.name;
    `;
    
    try {
        const result = await pool.query(query, [date]);
        return result.rows;
    } catch (error) {
        logger.error('Error in getAttendanceByDate:', error);
        throw error;
    }
};

const getAttendanceByChildId = async (childId, startDate, endDate) => {
    const query = `
        SELECT *
        FROM attendance
        WHERE child_id = $1
        AND date BETWEEN $2 AND $3
        ORDER BY date;
    `;
    
    try {
        const result = await pool.query(query, [childId, startDate, endDate]);
        return result.rows;
    } catch (error) {
        logger.error('Error in getAttendanceByChildId:', error);
        throw error;
    }
};

module.exports = {
    // ... existing exports ...
    markAttendance,
    getAttendanceByDate,
    getAttendanceByChildId,
}; 