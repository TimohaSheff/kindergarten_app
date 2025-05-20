import axios from '../utils/axios';
import { API_CONFIG } from '../config';
import { AUTH_CONFIG, REQUEST_CONFIG } from './config';

const api = {
  // Методы для работы с меню
  menu: {
    getDishes: () => axios.get('/menu/dishes'),
    getWeeklyMenu: (groupId) => axios.get(`/menu/weekly/${groupId}`),
    createMenuItem: (menuItem) => axios.post('/menu/weekly', menuItem),
    updateMenuItem: (id, menuItem) => axios.put(`/menu/weekly/${id}`, menuItem),
    deleteMenuItem: (id) => axios.delete(`/menu/weekly/${id}`),
    deleteWeeklyMenu: (groupId, weekNumber) => axios.delete(`/menu/weekly/group/${groupId}/week/${weekNumber}`),
    createDish: (dish) => axios.post('/menu/dishes', dish),
    updateDish: (id, dish) => axios.put(`/menu/dishes/${id}`, dish),
    deleteDish: (id) => axios.delete(`/menu/dishes/${id}`),
    updateMeal: (groupId, meal) => axios.put(`/menu/${groupId}/meal/${meal.id}`, meal),
    addMeal: (groupId, meal) => axios.post(`/menu/${groupId}/meal`, meal),
    saveWeeklyMenu: async (groupId, week, menuData) => {
      const menu_id = week === 'current' ? 1 : 2;
      await axios.delete(`/menu/weekly/${groupId}/${menu_id}`);
      return axios.post('/menu/weekly/save', { menuItems: menuData });
    }
  },

  // Методы для работы с расписанием
  schedule: {
    getAll: () => axios.get('/schedule/all'),
    getByGroup: async (groupId) => {
      const response = await axios.get(`/schedule/group/${groupId}`);
      return response.data;
    },
    create: (scheduleData) => axios.post('/schedule', scheduleData),
    update: (id, scheduleData) => axios.put(`/schedule/${id}`, scheduleData),
    delete: (id) => axios.delete(`/schedule/${id}`),
    saveGroupSchedule: (groupId, scheduleData) => axios.put(`/schedule/group/${groupId}`, scheduleData)
  },

  // Методы для работы с прогрессом
  progress: {
    get: async (childId) => {
      try {
        // Преобразуем ID в число
        const numericId = Number(childId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID ребенка');
        }
        
        console.log('API: Запрос прогресса ребенка:', {
          childId,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.get(`/progress/child/${numericId}`);
        console.log('API: Ответ с прогрессом:', {
          status: response.status,
          data: response.data
        });
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении прогресса:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      }
    },
    
    getById: async (progressId) => {
      try {
        const numericId = Number(progressId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID прогресса');
        }
        
        console.log('API: Запрос прогресса по ID:', {
          progressId,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.get(`/progress/${numericId}`);
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении прогресса по ID:', error);
        throw error;
      }
    },
    
    getGroupProgress: async (groupId) => {
      try {
        const numericId = Number(groupId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID группы');
        }
        
        console.log('API: Запрос прогресса группы:', {
          groupId,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.get(`/progress/group/${numericId}`);
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении прогресса группы:', error);
        throw error;
      }
    },
    
    create: async (progressData) => {
      try {
        // Проверяем и преобразуем ID ребенка
        if (progressData.child_id) {
          progressData.child_id = Number(progressData.child_id);
          if (isNaN(progressData.child_id)) {
            throw new Error('Некорректный ID ребенка');
          }
        }
        
        console.log('API: Создание прогресса:', progressData);
        const response = await axios.post('/progress', progressData);
        return response;
      } catch (error) {
        console.error('API: Ошибка при создании прогресса:', error);
        throw error;
      }
    },
    
    update: async (progressId, progressData) => {
      try {
        const numericId = Number(progressId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID прогресса');
        }
        
        // Проверяем и преобразуем ID ребенка
        if (progressData.child_id) {
          progressData.child_id = Number(progressData.child_id);
          if (isNaN(progressData.child_id)) {
            throw new Error('Некорректный ID ребенка');
          }
        }
        
        console.log('API: Обновление прогресса:', {
          progressId: numericId,
          data: progressData
        });
        
        const response = await axios.put(`/progress/${numericId}`, progressData);
        return response;
      } catch (error) {
        console.error('API: Ошибка при обновлении прогресса:', error);
        throw error;
      }
    },
    
    delete: async (progressId) => {
      try {
        const numericId = Number(progressId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID прогресса');
        }
        
        console.log('API: Удаление прогресса:', numericId);
        const response = await axios.delete(`/progress/${numericId}`);
        return response;
      } catch (error) {
        console.error('API: Ошибка при удалении прогресса:', error);
        throw error;
      }
    },
    
    saveStructure: async (structureData) => {
      try {
        console.log('API: Сохранение структуры прогресса:', structureData);
        const response = await axios.post('/progress/structure', structureData);
        return response;
      } catch (error) {
        console.error('API: Ошибка при сохранении структуры прогресса:', error);
        throw error;
      }
    }
  },

  // Методы для работы с аутентификацией
  auth: {
    register: async (userData) => {
      const response = await axios.post('/auth/register', userData);
      if (response.token) {
        localStorage.setItem(AUTH_CONFIG.tokenKey, response.token);
      }
      return response;
    },
    
    login: async (credentials) => {
      const response = await axios.post('/auth/login', credentials);
      if (response.token) {
        localStorage.setItem(AUTH_CONFIG.tokenKey, response.token);
      }
      return response;
    },
    
    logout: () => {
      localStorage.removeItem(AUTH_CONFIG.tokenKey);
    },
    
    getCurrentUser: () => axios.get('/auth/me')
  },

  // Методы для работы с группами
  groups: {
    getAll: async () => {
      try {
        console.log('API: Запрос списка групп');
        
        const response = await axios.get('/groups');
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = response.data.map(group => ({
            ...group,
            id: String(group.id || group.group_id),
            group_id: String(group.id || group.group_id),
            teacher_id: Array.isArray(group.teacher_id) ? 
              group.teacher_id.map(String) : 
              group.teacher_id ? [String(group.teacher_id)] : []
          }));
        }
        
        console.log('API: Ответ со списком групп:', {
          status: response.status,
          data: response.data
        });
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении списка групп:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      }
    },
    
    create: async (groupData) => {
      try {
        // Преобразуем ID учителей в числа
        if (groupData.teacher_id) {
          if (Array.isArray(groupData.teacher_id)) {
            groupData.teacher_id = groupData.teacher_id.map(id => {
              const numericId = Number(id);
              if (isNaN(numericId)) {
                throw new Error('Некорректный ID учителя');
              }
              return numericId;
            });
          } else {
            const numericId = Number(groupData.teacher_id);
            if (isNaN(numericId)) {
              throw new Error('Некорректный ID учителя');
            }
            groupData.teacher_id = [numericId];
          }
        }
        
        console.log('API: Создание группы:', groupData);
        
        const response = await axios.post('/groups', groupData);
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = {
            ...response.data,
            id: String(response.data.id || response.data.group_id),
            group_id: String(response.data.id || response.data.group_id),
            teacher_id: Array.isArray(response.data.teacher_id) ? 
              response.data.teacher_id.map(String) : 
              response.data.teacher_id ? [String(response.data.teacher_id)] : []
          };
        }
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при создании группы:', error);
        throw error;
      }
    },
    
    update: async (groupId, groupData) => {
      try {
        const numericId = Number(groupId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID группы');
        }
        
        // Преобразуем ID учителей в числа
        if (groupData.teacher_id) {
          if (Array.isArray(groupData.teacher_id)) {
            groupData.teacher_id = groupData.teacher_id.map(id => {
              const numericTeacherId = Number(id);
              if (isNaN(numericTeacherId)) {
                throw new Error('Некорректный ID учителя');
              }
              return numericTeacherId;
            });
          } else {
            const numericTeacherId = Number(groupData.teacher_id);
            if (isNaN(numericTeacherId)) {
              throw new Error('Некорректный ID учителя');
            }
            groupData.teacher_id = [numericTeacherId];
          }
        }
        
        console.log('API: Обновление группы:', {
          groupId: numericId,
          data: groupData
        });
        
        const response = await axios.put(`/groups/${numericId}`, groupData);
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = {
            ...response.data,
            id: String(response.data.id || response.data.group_id),
            group_id: String(response.data.id || response.data.group_id),
            teacher_id: Array.isArray(response.data.teacher_id) ? 
              response.data.teacher_id.map(String) : 
              response.data.teacher_id ? [String(response.data.teacher_id)] : []
          };
        }
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при обновлении группы:', error);
        throw error;
      }
    },
    
    delete: async (groupId) => {
      try {
        const numericId = Number(groupId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID группы');
        }
        
        console.log('API: Удаление группы:', {
          groupId,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.delete(`/groups/${numericId}`);
        return response;
      } catch (error) {
        console.error('API: Ошибка при удалении группы:', error);
        throw error;
      }
    }
  },

  // Методы для работы с детьми
  children: {
    getAll: async (params = {}) => {
      try {
        // Если есть parent_id в параметрах, преобразуем его в число
        if (params.parent_id) {
          const numericParentId = Number(params.parent_id);
          if (isNaN(numericParentId)) {
            throw new Error('Некорректный ID родителя');
          }
          params.parent_id = numericParentId;
        }
        
        // Если есть group_id в параметрах, преобразуем его в число
        if (params.group_id) {
          const numericGroupId = Number(params.group_id);
          if (isNaN(numericGroupId)) {
            throw new Error('Некорректный ID группы');
          }
          params.group_id = numericGroupId;
        }
        
        console.log('API: Запрос списка детей:', {
          params,
          types: {
            parent_id: typeof params.parent_id,
            group_id: typeof params.group_id
          }
        });
        
        const response = await axios.get('/children', { params });
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = response.data.map(child => ({
            ...child,
            id: String(child.id || child.child_id),
            child_id: String(child.id || child.child_id),
            parent_id: String(child.parent_id),
            group_id: child.group_id ? String(child.group_id) : null
          }));
        }
        
        console.log('API: Ответ со списком детей:', {
          status: response.status,
          data: response.data
        });
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении списка детей:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      }
    },
    
    getById: async (childId) => {
      try {
        const numericId = Number(childId);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID ребенка');
        }
        
        console.log('API: Запрос данных ребенка:', {
          childId,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.get(`/children/${numericId}`);
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = {
            ...response.data,
            id: String(response.data.id || response.data.child_id),
            child_id: String(response.data.id || response.data.child_id),
            parent_id: String(response.data.parent_id),
            group_id: response.data.group_id ? String(response.data.group_id) : null
          };
        }
        
        return response;
      } catch (error) {
        console.error('API: Ошибка при получении данных ребенка:', error);
        throw error;
      }
    },
    
    create: async (data) => {
      try {
        // Преобразуем ID родителя и группы в числа
        if (data.parent_id) {
          data.parent_id = Number(data.parent_id);
          if (isNaN(data.parent_id)) {
            throw new Error('Некорректный ID родителя');
          }
        }
        
        if (data.group_id) {
          data.group_id = Number(data.group_id);
          if (isNaN(data.group_id)) {
            throw new Error('Некорректный ID группы');
          }
        }
        
        console.log('API: Создание ребенка, данные:', {
          ...data,
          parent_id: data.parent_id,
          group_id: data.group_id
        });
        
        const response = await axios.post('/children', data, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = {
            ...response.data,
            id: String(response.data.id || response.data.child_id),
            child_id: String(response.data.id || response.data.child_id),
            parent_id: String(response.data.parent_id),
            group_id: response.data.group_id ? String(response.data.group_id) : null
          };
        }
        
        console.log('API: Успешный ответ:', response.data);
        return response;
      } catch (error) {
        console.error('API: Ошибка при создании ребенка:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          data: error.config?.data
        });
        throw error;
      }
    },
    
    update: async (id, data) => {
      try {
        // Преобразуем ID в число
        const numericId = Number(id);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID ребенка');
        }

        // Преобразуем ID родителя и группы в числа
        if (data.parent_id) {
          data.parent_id = Number(data.parent_id);
          if (isNaN(data.parent_id)) {
            throw new Error('Некорректный ID родителя');
          }
        }
        
        if (data.group_id) {
          data.group_id = Number(data.group_id);
          if (isNaN(data.group_id)) {
            throw new Error('Некорректный ID группы');
          }
        }

        // Подготавливаем данные для отправки
        const requestData = {
          ...data,
          // Проверяем, что allergies в правильном формате
          allergies: typeof data.allergies === 'string' && data.allergies.startsWith('{') ? 
                    data.allergies : 
                    Array.isArray(data.allergies) ? 
                    `{${data.allergies.map(a => `"${a}"`).join(',')}}` : 
                    '{}',
          // Отправляем services как массив чисел
          services: Array.isArray(data.services) ? data.services.map(Number) : []
        };

        console.log('API: Обновление ребенка:', {
          id: numericId,
          data: requestData,
          types: {
            id: typeof numericId,
            parent_id: typeof requestData.parent_id,
            group_id: typeof requestData.group_id
          }
        });

        const response = await axios.put(`/children/${numericId}`, requestData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Преобразуем все ID в строки в ответе
        if (response.data) {
          response.data = {
            ...response.data,
            id: String(response.data.id || response.data.child_id),
            child_id: String(response.data.id || response.data.child_id),
            parent_id: String(response.data.parent_id),
            group_id: response.data.group_id ? String(response.data.group_id) : null
          };
        }
        
        console.log('API: Успешный ответ:', response.data);
        return response;
      } catch (error) {
        console.error('API: Ошибка при обновлении ребенка:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          data: error.config?.data
        });
        throw error;
      }
    },
    
    delete: async (id) => {
      try {
        const numericId = Number(id);
        if (isNaN(numericId)) {
          throw new Error('Некорректный ID ребенка');
        }
        
        console.log('API: Удаление ребенка:', {
          id,
          numericId,
          type: typeof numericId
        });
        
        const response = await axios.delete(`/children/${numericId}`);
        console.log('API: Ответ сервера при удалении:', response.data);
        return response.data;
      } catch (error) {
        console.error('API: Ошибка при удалении ребенка:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        
        // Преобразуем ошибку сервера в понятное пользователю сообщение
        let errorMessage = 'Ошибка при удалении ребенка';
        
        if (error.response) {
          switch (error.response.status) {
            case 403:
              errorMessage = 'У вас нет прав для удаления ребенка';
              break;
            case 404:
              errorMessage = 'Ребенок не найден';
              break;
            case 400:
              errorMessage = error.response.data.error || 'Некорректные данные';
              break;
            case 500:
              errorMessage = 'Ошибка сервера при удалении ребенка';
              break;
          }
        }
        
        throw new Error(errorMessage);
      }
    }
  },

  // Методы для работы с посещаемостью
  attendance: {
    get: (params) => axios.get('/attendance', { params }),
    getGroupAttendance: (groupId, startDate, endDate) => 
      axios.get('/attendance/group', { 
        params: { 
          group_id: String(groupId),
          start_date: startDate,
          end_date: endDate 
        } 
      }),
    markAttendance: (data) => axios.post('/attendance', {
      child_id: data.child_id,
      date: data.date,
      is_present: data.is_present
    })
  },

  // Методы для работы с услугами
  services: {
    getAll: () => axios.get('/services'),
    create: (serviceData) => axios.post('/services', serviceData),
    update: (serviceId, serviceData) => axios.put(`/services/${serviceId}`, serviceData),
    delete: (serviceId) => axios.delete(`/services/${serviceId}`)
  },

  // Методы для работы с заявками на услуги
  serviceRequests: {
    getAll: () => axios.get('/services/requests'),
    create: (requestData) => axios.post('/services/requests', requestData),
    approve: (requestId) => axios.put(`/services/requests/${requestId}/approve`),
    reject: (requestId) => axios.put(`/services/requests/${requestId}/reject`),
    delete: (requestId) => axios.delete(`/services/requests/${requestId}`)
  },

  // Методы для работы с пользователями
  users: {
    getAll: () => axios.get('/users', { 
      params: { 
        include_children: true 
      } 
    }),
    getById: (userId) => axios.get(`/users/${userId}`),
    create: (userData) => axios.post('/users', userData),
    update: (userId, userData) => axios.put(`/users/${userId}`, userData),
    delete: (userId) => axios.delete(`/users/${userId}`),
    getParents: () => axios.get('/users/parents')
  },

  // Методы для работы с персоналом
  staff: {
    getAll: () => axios.get('/staff'),
    getById: (id) => axios.get(`/staff/${id}`),
    create: (data) => axios.post('/staff', data),
    update: (id, data) => axios.put(`/staff/${id}`, data),
    delete: (id) => axios.delete(`/staff/${id}`)
  },

  // Методы для работы с рекомендациями
  recommendations: {
    getAll: async () => {
      try {
        const response = await axios.get('/recommendations');
        console.log('API response for recommendations:', response);
        return response.data;
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        throw error;
      }
    },
    getById: (id) => axios.get(`/recommendations/${id}`),
    create: (data) => axios.post('/recommendations', data),
    update: (id, data) => axios.put(`/recommendations/${id}`, data),
    delete: (id) => axios.delete(`/recommendations/${id}`),
    send: (id) => axios.post(`/recommendations/${id}/send`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  },

  // Методы для работы с профилем пользователя
  profile: {
    get: async () => {
      try {
        // Получаем базовые данные пользователя
        const response = await axios.get('/auth/me');
        console.log('Ответ /auth/me:', response.data);
        
        let userData = response.data;
        
        // Пытаемся получить дополнительные данные через /users/me
        try {
          const detailsResponse = await axios.get('/users/me');
          console.log('Ответ /users/me:', detailsResponse.data);
          userData = {
            ...userData,
            ...detailsResponse.data,
            // Сохраняем дату создания из auth/me, если она есть
            created_at: response.data.created_at || response.data.created || response.data.date_created || detailsResponse.data.created_at
          };
        } catch (error) {
          console.log('Не удалось получить дополнительные данные пользователя:', error);
        }

        return userData;
      } catch (error) {
        console.error('API: Ошибка при получении профиля:', error);
        throw new Error('Ошибка при загрузке профиля');
      }
    },

    update: async (userId, profileData) => {
      try {
        const response = await axios.put(`/users/${userId}`, profileData);
        return response.data;
      } catch (error) {
        console.error('API: Ошибка при обновлении профиля:', error);
        throw new Error('Ошибка при обновлении профиля');
      }
    },

    uploadAvatar: async (userId, formData) => {
      try {
        console.log('API: Начало загрузки аватара:', {
          userId,
          formData: {
            has_avatar: formData.has('avatar'),
            content_type: formData.get('avatar')?.type
          }
        });

        if (!formData.has('avatar')) {
          throw new Error('Файл не выбран');
        }

        const file = formData.get('avatar');
        if (!file || !(file instanceof File)) {
          throw new Error('Некорректный файл');
        }

        // Проверка размера файла (например, максимум 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error('Файл слишком большой (максимум 5MB)');
        }

        // Проверка типа файла
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Неподдерживаемый формат файла. Разрешены только JPEG, PNG и GIF');
        }

        // Конвертируем файл в base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });

        // Отправляем данные как JSON
        const response = await axios.post(`/users/${userId}/profile-photo`, {
          photo: base64Data,
          photo_mime_type: file.type
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('API: Успешная загрузка аватара:', response.data);
        return response.data;
      } catch (error) {
        console.error('API: Ошибка при загрузке аватара:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });

        // Если ошибка от сервера, прокидываем её дальше
        if (error.response) {
          throw error;
        }

        // Если локальная ошибка валидации, создаем объект ошибки в формате axios
        throw {
          response: {
            data: { message: error.message },
            status: 400
          }
        };
      }
    },

    changePassword: async (userId, passwordData) => {
      try {
        const response = await axios.post(`/users/${userId}/change-password`, passwordData);
        return response.data;
      } catch (error) {
        console.error('API: Ошибка при изменении пароля:', error);
        throw new Error('Ошибка при изменении пароля');
      }
    }
  },
};

// Экспортируем отдельные API для различных сущностей
export const authApi = api.auth;
export const groupsApi = api.groups;
export const childrenApi = api.children;
export const scheduleApi = api.schedule;
export const progressApi = api.progress;
export const attendanceApi = api.attendance;
export const servicesApi = api.services;
export const serviceRequestsApi = api.serviceRequests;
export const recommendationsApi = api.recommendations;
export const menuApi = api.menu;
export const profileApi = api.profile;

export { api };
export default api;