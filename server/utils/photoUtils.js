const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Создаем папку для фотографий, если она не существует
const PHOTOS_DIR = path.join(__dirname, '../../uploads/photos');
if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

const photoUtils = {
    // Сохранение фотографии
    savePhoto: async (base64Data, prefix = '') => {
        try {
            // Проверяем наличие данных
            if (!base64Data) {
                return null;
            }

            // Генерируем уникальное имя файла
            const fileName = `${prefix}_${crypto.randomBytes(16).toString('hex')}.jpg`;
            const filePath = path.join(PHOTOS_DIR, fileName);

            // Конвертируем base64 в буфер и сохраняем
            const imageBuffer = Buffer.from(base64Data, 'base64');
            await fs.promises.writeFile(filePath, imageBuffer);

            // Возвращаем относительный путь к файлу
            return `uploads/photos/${fileName}`;
        } catch (error) {
            console.error('Ошибка при сохранении фотографии:', error);
            throw error;
        }
    },

    // Удаление фотографии
    deletePhoto: async (photoPath) => {
        try {
            if (!photoPath) return;

            const fullPath = path.join(__dirname, '../../', photoPath);
            
            // Проверяем существование файла
            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }
        } catch (error) {
            console.error('Ошибка при удалении фотографии:', error);
            throw error;
        }
    },

    // Получение полного пути к фотографии
    getPhotoPath: (relativePath) => {
        if (!relativePath) return null;
        return path.join(__dirname, '../../', relativePath);
    }
};

module.exports = photoUtils; 