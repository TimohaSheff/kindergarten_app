const Attendance = require('../models/attendance');
const { validateDate } = require('../utils/validators');

// Создание записи о посещаемости
exports.createAttendance = async (req, res) => {
    try {
        const { childId, date, isPresent } = req.body;
        
        if (!validateDate(date)) {
            return res.status(400).json({ message: 'Неверный формат даты' });
        }

        const attendance = new Attendance({
            childId,
            date: new Date(date),
            isPresent,
            userId: req.user._id
        });

        await attendance.save();
        res.status(201).json(attendance);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Запись о посещаемости на эту дату уже существует' });
        }
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Получение записей о посещаемости для ребенка
exports.getChildAttendance = async (req, res) => {
    try {
        const { childId } = req.params;
        const { startDate, endDate } = req.query;

        const query = { childId };
        
        if (startDate && endDate) {
            if (!validateDate(startDate) || !validateDate(endDate)) {
                return res.status(400).json({ message: 'Неверный формат даты' });
            }
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const attendance = await Attendance.find(query)
            .sort({ date: -1 })
            .populate('userId', 'name');

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Обновление записи о посещаемости
exports.updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPresent } = req.body;

        const attendance = await Attendance.findByIdAndUpdate(
            id,
            { isPresent },
            { new: true }
        );

        if (!attendance) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Удаление записи о посещаемости
exports.deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        
        const attendance = await Attendance.findByIdAndDelete(id);
        
        if (!attendance) {
            return res.status(404).json({ message: 'Запись не найдена' });
        }

        res.json({ message: 'Запись удалена' });
    } catch (error) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
}; 