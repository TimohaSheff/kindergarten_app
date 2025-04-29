/**
 * Проверяет, является ли строка корректной датой в формате YYYY-MM-DD
 * @param {string} dateString - Строка с датой для проверки
 * @returns {boolean} - true если дата корректна, false если нет
 */
const validateDate = (dateString) => {
    // Проверяем, что дата соответствует формату ISO8601 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
        return false;
    }

    // Проверяем, что дата действительна
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return false;
    }

    return true;
};

module.exports = {
    validateDate
}; 