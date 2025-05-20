import { API_CONFIG } from '../config';

export const getPhotoUrl = (photoPath) => {
  if (!photoPath) {
    console.log('getPhotoUrl: photoPath is null or undefined');
    return null;
  }
  
  if (photoPath.startsWith('data:')) {
    console.log('getPhotoUrl: returning base64 data');
    return photoPath;
  }
  
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
  
  // Формируем URL, используя полный путь из БД
  const url = `${baseUrl}/uploads/${photoPath}?t=${Date.now()}`;
  
  console.log('getPhotoUrl:', {
    input: photoPath,
    baseUrl,
    url
  });
  
  return url;
};

export const validatePhoto = (file) => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

  if (!file) {
    throw new Error('Файл не предоставлен');
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`Размер файла не должен превышать ${MAX_SIZE / (1024 * 1024)}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Поддерживаются только форматы: ${ALLOWED_TYPES.join(', ')}`);
  }

  return true;
};

export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const processPhoto = async (file) => {
  try {
    validatePhoto(file);
    const base64Data = await convertToBase64(file);
    const previewUrl = URL.createObjectURL(file);
    
    return {
      base64Data,
      previewUrl,
      mimeType: file.type
    };
  } catch (error) {
    throw error;
  }
};

export const handlePastedImage = async (e) => {
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (let item of items) {
    if (item.type.indexOf('image') === 0) {
      const file = item.getAsFile();
      return processPhoto(file);
    }
  }
  return null;
}; 