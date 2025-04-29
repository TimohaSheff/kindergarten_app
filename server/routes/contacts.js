const express = require('express');
const router = express.Router();

// Получение контактной информации
router.get('/', async (req, res) => {
  try {
    const contactInfo = {
      phone: '+7 (4922) 12-34-56',
      email: 'info@school4.ru',
      address: 'г. Владимир, ул. Примерная, д. 123',
      mapLink: 'https://yandex.ru/maps/-/CCUBiMTIkD',
      workingHours: 'Пн-Пт: 7:00-19:00'
    };
    
    res.json(contactInfo);
  } catch (error) {
    console.error('Error fetching contact info:', error);
    res.status(500).json({ message: 'Ошибка при получении контактной информации' });
  }
});

// Получение информации о сотрудниках
router.get('/staff', async (req, res) => {
  try {
    const staff = [
      {
        name: 'Иванова Мария Петровна',
        position: 'Директор',
        phone: '+7 (4922) 12-34-57',
        email: 'director@school4.ru',
        color: '#6366F1'
      },
      {
        name: 'Петрова Анна Ивановна',
        position: 'Заместитель директора',
        phone: '+7 (4922) 12-34-58',
        email: 'deputy@school4.ru',
        color: '#10B981'
      }
    ];
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff info:', error);
    res.status(500).json({ message: 'Ошибка при получении информации о сотрудниках' });
  }
});

module.exports = router; 