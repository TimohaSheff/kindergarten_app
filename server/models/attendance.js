const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    childId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    isPresent: {
        type: Boolean,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Создаем составной индекс для быстрого поиска по childId и date
attendanceSchema.index({ childId: 1, date: 1 }, { unique: true });

// Обновляем updatedAt перед сохранением
attendanceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance; 