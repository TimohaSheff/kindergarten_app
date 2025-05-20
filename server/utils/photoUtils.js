const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const validatePhoto = (file) => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

  if (!file) {
    throw new Error('Файл не предоставлен');
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`Размер файла не должен превышать ${MAX_SIZE / (1024 * 1024)}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Поддерживаются только форматы: ${ALLOWED_TYPES.join(', ')}`);
  }

  return true;
};

async function savePhoto(buffer, fileName) {
  try {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    logger.info('Сохранение фото:', {
      uploadDir,
      fileName,
      bufferSize: buffer.length,
      __dirname
    });

    // Создаем директорию, если она не существует
    if (!fs.existsSync(uploadDir)) {
      await fs.promises.mkdir(uploadDir, { recursive: true });
      logger.info('Создана директория:', uploadDir);
    }
    
    const filePath = path.join(uploadDir, fileName);
    logger.info('Путь для сохранения:', {
      fileName,
      fullPath: filePath,
      uploadDir
    });

    // Проверяем права на запись
    try {
      await fs.promises.access(uploadDir, fs.constants.W_OK);
    } catch (err) {
      logger.error('Ошибка прав доступа:', {
        error: err.message,
        path: uploadDir
      });
      throw new Error(`Нет прав на запись в директорию ${uploadDir}: ${err.message}`);
    }

    // Сохраняем файл
    await fs.promises.writeFile(filePath, buffer);
    
    // Проверяем, что файл создан и доступен для чтения
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      const stats = await fs.promises.stat(filePath);
      logger.info('Файл успешно сохранен:', {
        path: filePath,
        size: stats.size,
        permissions: stats.mode.toString(8)
      });
    } catch (err) {
      logger.error('Ошибка при проверке сохраненного файла:', {
        error: err.message,
        path: filePath
      });
      throw err;
    }
    
    // Возвращаем путь для сохранения в БД
    return fileName;
  } catch (error) {
    logger.error('Ошибка при сохранении файла:', {
      error: error.message,
      fileName
    });
    throw error;
  }
}

const deletePhoto = async (photoPath) => {
  try {
    if (!photoPath) return;

    const fullPath = path.join(__dirname, '..', 'uploads', photoPath);
    await fs.promises.unlink(fullPath);
    logger.info('Файл успешно удален:', fullPath);
  } catch (error) {
    logger.error('Ошибка при удалении файла:', {
      error: error.message,
      path: photoPath
    });
  }
};

const processBase64Photo = async (base64String, userId) => {
  if (!base64String) {
    throw new Error('Base64 строка не предоставлена');
  }

  try {
    logger.info('Начало обработки base64 фото');
    
    // Извлекаем MIME тип и данные
    const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      logger.error('Некорректный формат base64 строки');
      throw new Error('Некорректный формат данных изображения');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    
    logger.info('Проверка MIME типа:', mimeType);

    // Проверяем MIME тип
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
      throw new Error('Неподдерживаемый формат файла');
    }

    // Конвертируем base64 в буфер
    const buffer = Buffer.from(base64Data, 'base64');
    
    logger.info('Размер файла:', buffer.length);

    // Проверяем размер
    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('Размер файла превышает 5MB');
    }

    // Генерируем имя файла
    const ext = mimeType.split('/')[1];
    const fileName = `user_${userId}_${Date.now()}.${ext}`;
    
    logger.info('Сохранение файла:', fileName);

    // Сохраняем файл и получаем путь
    const photoPath = await savePhoto(buffer, fileName);
    logger.info('Файл успешно сохранен:', photoPath);
    return photoPath;
  } catch (error) {
    logger.error('Ошибка при обработке base64 фото:', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  validatePhoto,
  savePhoto,
  deletePhoto,
  processBase64Photo
}; 