import axios from 'axios';

// Базовый URL API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';
console.log('API Base URL:', API_BASE_URL);

// Конфигурация axios с токеном
const axiosConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    },
    validateStatus: function (status) {
      return status >= 200 && status < 500; // Принимаем только статусы 2xx-4xx
    }
  };
};

// Функция для обработки ошибок API
const handleApiError = (error) => {
  if (error.response) {
    const errorMessage = error.response.data?.error || 
                       error.response.data?.message || 
                       'Ошибка сервера при выполнении запроса';
    throw new Error(errorMessage);
  } else if (error.request) {
    throw new Error('Не удалось получить ответ от сервера');
  } else {
    throw new Error('Ошибка при выполнении запроса');
  }
};

// Вспомогательная функция для обработки ответов
const handleResponse = async (response) => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorMessage = 'Ошибка сервера';
    let errorData = null;
    
    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          url: response.url
        });
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(err => err.msg || err).join(', ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else {
        const textError = await response.text();
        console.error('API Error (text):', {
          status: response.status,
          statusText: response.statusText,
          text: textError,
          url: response.url
        });
        errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
      }
    } catch (parseError) {
      console.error('Error parsing error response:', {
        error: parseError,
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });
      errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
    }
    
    const error = new Error(errorMessage);
    error.response = response;
    error.data = errorData;
    throw error;
  }
  
  try {
    return await response.json();
  } catch (parseError) {
    console.error('Error parsing success response:', {
      error: parseError,
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    throw new Error('Ошибка при обработке ответа сервера');
  }
};

// Функция для получения конфигурации с токеном
const getConfig = (method = 'GET', body = null) => {
  const token = localStorage.getItem('token');
  console.log('getConfig - Token:', token);
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('getConfig - Headers:', config.headers);
  } else {
    config.credentials = 'include';
    console.log('getConfig - No token, using credentials:include');
  }

  console.log('getConfig - Final config:', config);
  return config;
};

// Создаем объект api со всеми методами
const api = {
  // Методы для работы с меню
  getAllDishes: async () => {
    try {
      console.log('Getting dishes from server...');
      const token = localStorage.getItem('token');
      console.log('Using token:', token ? 'Present' : 'Missing');
      
      const config = {
        ...axiosConfig(),
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      };
      
      console.log('Request config:', {
        headers: config.headers,
        baseURL: API_BASE_URL,
        url: '/menu/dishes',
        timeout: config.timeout
      });

      const response = await axios.get(`${API_BASE_URL}/menu/dishes`, config);
      
      console.log('Server response:', {
        status: response.status,
        data: response.data
      });
      
      if (!response.data) {
        throw new Error('Нет данных от сервера');
      }

      if (!Array.isArray(response.data)) {
        console.error('Unexpected response format:', response.data);
        throw new Error('Некорректный формат данных от сервера');
      }
      
      return response.data.map(dish => ({
        id: dish.id,
        name: dish.name,
        category: dish.category,
        default_weight: dish.default_weight
      }));
    } catch (error) {
      console.error('Error in getAllDishes:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        throw new Error('Необходима авторизация');
      }
      
      throw handleApiError(error);
    }
  },

  getWeeklyMenu: async (groupId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/menu/weekly/${groupId}`, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createWeeklyMenuItem: async (weeklyMenuItem) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/menu/weekly`, weeklyMenuItem, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateWeeklyMenuItem: async (id, weeklyMenuItem) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/menu/weekly/${id}`, weeklyMenuItem, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteWeeklyMenuItem: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/menu/weekly/${id}`, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateMeal: async (groupId, meal) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/menu/${groupId}/meal/${meal.id}`, meal, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  addMeal: async (groupId, meal) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/menu/${groupId}/meal`, meal, axiosConfig());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getTeacherGroups: async (teacherId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teachers/${teacherId}/groups`, axiosConfig());
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка при загрузке групп учителя');
    }
  },

  getParentChildGroup: async (parentId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/parents/${parentId}/child-group`, axiosConfig());
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Ошибка при загрузке группы ребенка');
    }
  },

  // API для аутентификации
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, getConfig('POST', userData));
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, getConfig('POST', credentials));
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, getConfig());
    return handleResponse(response);
  },

  // API для работы с расписанием
  getSchedule: async (groupId) => {
    if (!groupId) {
      console.error('getSchedule - No groupId provided');
      return [];
    }
    
    console.log('getSchedule - Starting request for group:', groupId);
    const config = getConfig();
    console.log('getSchedule - Request config:', config);
    
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/${encodeURIComponent(groupId)}`, config);
      console.log('getSchedule - Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('getSchedule - Error response:', errorText);
        throw new Error(`Ошибка при получении расписания: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('getSchedule - Success response:', data);
      return data;
    } catch (error) {
      console.error('getSchedule - Fetch error:', error);
      throw error;
    }
  },

  getScheduleByGroup: async (groupName) => {
    if (!groupName) {
      console.error('getScheduleByGroup - No group name provided');
      return [];
    }
    
    console.log('getScheduleByGroup - Starting request for group:', groupName);
    const config = getConfig();
    
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/group/${encodeURIComponent(groupName)}`, config);
      console.log('getScheduleByGroup - Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('getScheduleByGroup - Error response:', errorText);
        throw new Error(`Ошибка при получении расписания: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('getScheduleByGroup - Success response:', data);
      return data;
    } catch (error) {
      console.error('getScheduleByGroup - Fetch error:', error);
      throw error;
    }
  },
  
  updateScheduleItem: async (id, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/${id}`, getConfig('PUT', data));
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  },
  
  createScheduleItem: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule`, getConfig('POST', data));
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  },
  
  deleteScheduleItem: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/${id}`, getConfig('DELETE'));
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  },

  getAllSchedules: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/all`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching all schedules:', error);
      throw error;
    }
  },

  // API для работы с группами
  getGroups: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/groups`, axiosConfig());
      
      // Преобразуем данные, добавляя правильные поля
      const groups = response.data.map(group => ({
        id: group.group_id,
        group_id: group.group_id,
        group_name: group.group_name,
        name: group.group_name,
        age_range: group.age_range,
        caretaker_full_name: group.caretaker_full_name,
        description: group.description || '',
        children_count: group.children_count || 0
      }));

      return groups;
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw new Error(error.response?.data?.message || 'Ошибка при загрузке групп');
    }
  },
  
  createGroup: async (data) => {
    const response = await fetch(`${API_BASE_URL}/groups`, getConfig('POST', data));
    return handleResponse(response);
  },
  
  updateGroup: async (id, data) => {
    try {
      console.log('Updating group with data:', data);
      const response = await fetch(`${API_BASE_URL}/groups/${id}`, getConfig('PUT', data));
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error updating group:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(errorData.message || 'Ошибка при обновлении группы');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in updateGroup:', error);
      throw error;
    }
  },
  
  deleteGroup: async (id) => {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, getConfig('DELETE'));
    return handleResponse(response);
  },

  // API для работы с детьми
  getAllChildren: async (groupId = null) => {
    try {
      console.log('Получение списка всех детей, параметр groupId:', groupId);
      
      let url = groupId 
        ? `${API_BASE_URL}/children?groupId=${groupId}`
        : `${API_BASE_URL}/children`;
      
      try {
        // Пробуем основной эндпоинт
        let response = await fetch(url, getConfig());
        
        if (response.ok) {
          return handleResponse(response);
        }
        
        // Пробуем альтернативный эндпоинт, если первый не сработал
        if (groupId) {
          console.log('Пробуем альтернативный эндпоинт для получения детей группы...');
          const altResponse = await fetch(`${API_BASE_URL}/groups/${groupId}/children`, getConfig());
          
          if (altResponse.ok) {
            return handleResponse(altResponse);
          }
        }
        
        // Если не удалось получить детей через API, бросаем исключение с информативным сообщением
        if (groupId) {
          throw new Error(`Не удалось получить детей для группы с ID: ${groupId}`);
        } else {
          throw new Error('Не удалось получить список всех детей');
        }
      } catch (innerError) {
        console.error('Внутренняя ошибка при получении детей:', innerError);
        throw innerError;
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      throw error;
    }
  },

  getChildById: async (id) => {
    try {
      if (!id) {
        throw new Error('ID ребенка не указан');
      }
      
      console.log(`Получение данных о ребенке ${id}...`);
      
      try {
        // Пробуем основной эндпоинт
        const response = await fetch(`${API_BASE_URL}/children/${id}`, getConfig());
        
        if (response.ok) {
          return handleResponse(response);
        }
        
        // Пробуем альтернативный эндпоинт, если первый не сработал
        console.log('Пробуем альтернативный эндпоинт для получения данных ребенка...');
        const altResponse = await fetch(`${API_BASE_URL}/child/${id}`, getConfig());
        
        if (altResponse.ok) {
          return handleResponse(altResponse);
        }
        
        // Если ни один из эндпоинтов не доступен, бросаем исключение
        throw new Error(`Не удалось получить данные ребенка с ID: ${id}`);
      } catch (innerError) {
        console.error('Внутренняя ошибка при получении данных ребенка:', innerError);
        throw innerError;
      }
    } catch (error) {
      console.error('Error fetching child:', error);
      throw error;
    }
  },

  createChild: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/children`, getConfig('POST', data));
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating child:', error);
      throw error;
    }
  },

  updateChild: async (id, data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/children/${id}`, getConfig('PUT', data));
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating child:', error);
      throw error;
    }
  },

  deleteChild: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/children/${id}`, getConfig('DELETE'));
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting child:', error);
      throw error;
    }
  },

  // API для работы с контактами
  getContactInfo: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts`, axiosConfig());
      return response.data;
    } catch (error) {
      console.error('Error fetching contact info:', error);
      throw error;
    }
  },

  getStaff: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacts/staff`, axiosConfig());
      return response.data;
    } catch (error) {
      console.error('Error fetching staff:', error);
      // В случае ошибки авторизации возвращаем defaultStaff
      if (error.response?.status === 401) {
        return [];
      }
      throw error;
    }
  },

  // Методы для работы с рекомендациями
  getRecommendations: async () => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        console.log(`Starting getRecommendations request (attempt ${retryCount + 1}/${maxRetries})...`);
        const response = await fetch(`${API_BASE_URL}/recommendations`, getConfig());
        console.log('getRecommendations response:', response);
        
        if (!response.ok) {
          let errorMessage = 'Ошибка при получении рекомендаций';
          let errorData = null;
          
          try {
            errorData = await response.json();
            console.error('getRecommendations error:', {
              status: response.status,
              statusText: response.statusText,
              data: errorData,
              url: response.url
            });
            
            if (response.status === 500) {
              errorMessage = 'Внутренняя ошибка сервера при получении рекомендаций';
              if (errorData?.message) {
                errorMessage += `: ${errorData.message}`;
              }
            } else if (errorData?.message) {
              errorMessage = errorData.message;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
            errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
          }
          
          if (response.status === 500 && retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Retrying after error (attempt ${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Увеличивающаяся задержка
            continue;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('getRecommendations success:', data);
        return data;
      } catch (error) {
        console.error('getRecommendations catch error:', error);
        if (error.message.includes('Failed to fetch')) {
          if (retryCount < maxRetries - 1) {
            retryCount++;
            console.log(`Retrying after network error (attempt ${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          throw new Error('Не удалось подключиться к серверу');
        }
        throw error;
      }
    }
  },

  createRecommendation: async (recommendationData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations`, getConfig('POST', recommendationData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating recommendation:', error);
      throw error;
    }
  },

  updateRecommendation: async (recommendationId, recommendationData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}`, getConfig('PUT', recommendationData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating recommendation:', error);
      throw error;
    }
  },

  deleteRecommendation: async (recommendationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}`, getConfig('DELETE'));
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      throw error;
    }
  },

  sendRecommendation: async (recommendationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/recommendations/${recommendationId}/send`,
        getConfig('POST')
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error sending recommendation:', error);
      throw error;
    }
  },

  // Методы для работы с услугами
  getServices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/services`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  },

  // Методы для работы с пользователями
  getUsers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Метод для получения прогресса ребенка
  getProgressByChildId: async (childId) => {
    try {
      if (!childId) {
        throw new Error('ID ребенка не указан');
      }
      
      console.log(`Получение данных о прогрессе для ребенка ${childId}...`);
      
      const response = await fetch(`${API_BASE_URL}/progress/child/${childId}`, getConfig());
      
      if (!response.ok) {
        throw new Error(`Ошибка при получении прогресса: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Проверяем и форматируем данные
      if (!data || !data.progress) {
        throw new Error('Некорректный формат данных прогресса');
      }
      
      // Форматируем числовые значения
      const formattedProgress = data.progress.map(p => ({
        ...p,
        report_date: new Date(p.report_date),
        active_speech: p.active_speech ? parseInt(p.active_speech) : null,
        games: p.games ? parseInt(p.games) : null,
        art_activity: p.art_activity ? parseInt(p.art_activity) : null,
        constructive_activity: p.constructive_activity ? parseInt(p.constructive_activity) : null,
        sensory_development: p.sensory_development ? parseInt(p.sensory_development) : null,
        movement_skills: p.movement_skills ? parseInt(p.movement_skills) : null,
        naming_skills: p.naming_skills ? parseInt(p.naming_skills) : null,
        height_cm: p.height_cm ? parseInt(p.height_cm) : null,
        weight_kg: p.weight_kg ? parseInt(p.weight_kg) : null
      }));
      
      return {
        child: data.child,
        progress: formattedProgress
      };
    } catch (error) {
      console.error('Ошибка при получении прогресса ребенка:', error);
      throw error;
    }
  },

  // Методы для работы с платными услугами
  getPaidServices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/paid-services`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching paid services:', error);
      throw error;
    }
  },

  // Методы для работы с посещаемостью
  getAttendance: async (serviceId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(
        `${API_BASE_URL}/attendance/paid-services/${serviceId}?${params}`,
        getConfig()
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  },

  updateAttendance: async (attendanceId, isPresent) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/${attendanceId}`,
        getConfig('PUT', { status: isPresent ? 'present' : 'absent' })
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  },

  // Методы для работы с меню
  saveWeeklyMenu: async (groupId, week, menuData) => {
    try {
      console.log('Saving menu data:', { groupId, week, menuData });
      const menu_id = week === 'current' ? 1 : 2;
      
      // Преобразуем данные меню в формат для сохранения
      const menuItems = menuData.flatMap(dayMenu => {
        return Object.entries(dayMenu)
          .filter(([key]) => key !== 'day') // Исключаем поле day из обработки
          .flatMap(([mealType, dishes]) => {
            return dishes.map(dish => ({
              menu_id,
              group_id: groupId,
              meal_day: dayMenu.day,
              meal_type: mealType,
              dish_id: dish.dish_id,
              dish_name: dish.dish_name,
              category: dish.category,
              weight: dish.weight || 0,
              group_name: dish.group_name
            }));
          });
      });

      console.log('Prepared menu items for saving:', menuItems);
      
      // Сначала удаляем существующие записи для этой группы и menu_id
      await axios.delete(
        `${API_BASE_URL}/menu/weekly/${groupId}/${menu_id}`,
        axiosConfig()
      );

      // Затем сохраняем новые записи
      const response = await axios.post(
        `${API_BASE_URL}/menu/weekly/save`,
        { menuItems },
        axiosConfig()
      );

      console.log('Save menu response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving menu:', error);
      throw new Error(error.response?.data?.message || 'Ошибка при сохранении меню');
    }
  },

  // Методы для работы с обычной посещаемостью
  getRegularAttendance: async (childId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(
        `${API_BASE_URL}/attendance/regular/${childId}?${params}`,
        getConfig()
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching regular attendance:', error);
      throw error;
    }
  },

  updateRegularAttendance: async (childId, date, isPresent) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/regular/${childId}`,
        getConfig('PUT', { 
          date: date.toISOString(),
          status: isPresent ? 'present' : 'absent' 
        })
      );
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating regular attendance:', error);
      throw error;
    }
  },

  // Метод для получения детей в группе
  getGroupChildren: async (groupId) => {
    try {
      if (!groupId) {
        throw new Error('ID группы не указан');
      }
      
      console.log(`Получение детей для группы ${groupId}...`);
      
      const response = await fetch(`${API_BASE_URL}/children?group_id=${groupId}`, getConfig());
      
      if (!response.ok) {
        throw new Error(`Не удалось получить детей для группы с ID: ${groupId}`);
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching group children:', error);
      throw error;
    }
  },

  // Метод для получения ребенка по ID
  getChild: async (childId) => {
    return api.getChildById(childId);
  },

  // Методы для работы с расписанием
  addSchedule: async (scheduleData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule`, getConfig('POST', scheduleData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
  },

  updateSchedule: async (scheduleId, scheduleData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, getConfig('PUT', scheduleData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  },

  deleteSchedule: async (scheduleId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/schedule/${scheduleId}`, getConfig('DELETE'));
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  },

  // Сохранение расписания группы
  saveGroupSchedule: async (groupId, scheduleData) => {
    try {
      // Бэкенд для сохранения расписания не реализован в предоставленном коде.
      // Этот метод - заглушка, предполагающая наличие /schedule/group/:groupId (PUT/POST)
      console.warn('saveGroupSchedule - Backend endpoint not implemented. Simulating success.');
      // const response = await fetch(`${API_BASE_URL}/schedule/group/${groupId}`, getConfig('PUT', scheduleData));
      // return handleResponse(response);
      return Promise.resolve({ success: true, message: 'Расписание (симулировано) сохранено' }); // Заглушка
    } catch (error) {
      console.error(`Error saving schedule for group ${groupId}:`, error);
      throw error;
    }
  },

  // Получение списка активностей
  getActivities: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching activities:', error);
      throw error;
    }
  },

  // Метод для создания новой записи о прогрессе
  createProgress: async (progressData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Необходима авторизация');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/progress`, progressData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при создании прогресса:', error);
      throw error;
    }
  },

  // Метод для обновления записи о прогрессе
  updateProgress: async (reportId, data) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Необходима авторизация');
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/progress/${reportId}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Ошибка при обновлении прогресса:', error);
      throw error;
    }
  },

  // API для работы с заявками на услуги
  getServiceRequests: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests`, getConfig());
      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching service requests:', error);
      throw error;
    }
  },

  createServiceRequest: async (requestData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests`, getConfig('POST', requestData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error creating service request:', error);
      throw error;
    }
  },

  updateServiceRequest: async (requestId, requestData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests/${requestId}`, getConfig('PUT', requestData));
      return handleResponse(response);
    } catch (error) {
      console.error('Error updating service request:', error);
      throw error;
    }
  },

  deleteServiceRequest: async (requestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests/${requestId}`, getConfig('DELETE'));
      return handleResponse(response);
    } catch (error) {
      console.error('Error deleting service request:', error);
      throw error;
    }
  },

  attendanceApi: {
    // Получение посещаемости группы
    getGroupAttendance: async (groupId, startDate, endDate) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/attendance/group/${groupId}`,
          {
            ...axiosConfig(),
            params: { startDate, endDate }
          }
        );
        return response.data;
      } catch (error) {
        console.error('Error in getGroupAttendance:', error);
        throw new Error('Ошибка при получении данных посещаемости');
      }
    },

    // Отметка посещаемости
    markAttendance: async (attendanceData) => {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/attendance/mark`,
          attendanceData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        return response.data;
      } catch (error) {
        console.error('Ошибка при отметке посещаемости:', error);
        throw new Error(error.response?.data?.error || 'Ошибка при отметке посещаемости');
      }
    }
  },

  // Метод для получения списка детей группы
  getGroupChildrenDetails: async (groupId) => {
    try {
      console.log('Request URL:', `${API_BASE_URL}/groups/${groupId}/children`);
      
      const response = await axios.get(`${API_BASE_URL}/groups/${groupId}/children`, axiosConfig());
      console.log('Group children response:', response.data);
      
      // Проверяем, что ответ содержит необходимые данные
      if (!response.data || !response.data.children) {
        console.warn('Некорректный формат данных от сервера:', response.data);
        // Возвращаем пустой массив детей, если данные отсутствуют
        return {
          group: { id: groupId, name: 'Группа', group_name: 'Группа' },
          children: []
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching group children:', error);
      
      // Проверяем тип ошибки и возвращаем соответствующее сообщение
      if (error.response) {
        // Сервер вернул ошибку с кодом состояния
        console.error('Server error response:', error.response.data);
        throw new Error(error.response.data.message || 'Ошибка сервера при получении списка детей');
      } else if (error.request) {
        // Запрос был сделан, но ответ не получен
        console.error('No response received:', error.request);
        throw new Error('Нет ответа от сервера. Проверьте подключение к интернету.');
      } else {
        // Что-то пошло не так при настройке запроса
        console.error('Request setup error:', error.message);
        throw new Error('Ошибка при настройке запроса: ' + error.message);
      }
    }
  },

  getProgressById: async (reportId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Необходима авторизация');
    }

    if (!reportId) {
      throw new Error('ID отчета не указан');
    }

    try {
      // Пробуем основной эндпоинт
      try {
        const response = await axios.get(`${API_BASE_URL}/progress/report/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // Пробуем альтернативный эндпоинт
          const altResponse = await axios.get(`${API_BASE_URL}/progress/${reportId}/details`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          return altResponse.data;
        }
        throw error;
      }
    } catch (error) {
      console.error('Ошибка при получении прогресса:', error);
      if (error.response?.status === 404) {
        throw new Error(`Запись прогресса с ID ${reportId} не найдена`);
      }
      throw new Error(error.response?.data?.message || 'Ошибка при получении данных прогресса');
    }
  }
};

// Экспортируем отдельные API для различных сущностей
export const authApi = {
  register: api.register,
  login: api.login,
  logout: api.logout,
  getCurrentUser: api.getCurrentUser
};

export const groupsApi = {
  getGroups: api.getGroups,
  createGroup: api.createGroup,
  updateGroup: api.updateGroup,
  deleteGroup: api.deleteGroup,
  getGroupChildren: api.getGroupChildren,
  getGroupChildrenDetails: api.getGroupChildrenDetails
};

export const childrenApi = {
  getAllChildren: api.getAllChildren,
  getChild: api.getChildById,
  createChild: api.createChild,
  updateChild: api.updateChild,
  deleteChild: api.deleteChild,
  getGroupChildren: api.getGroupChildren
};

export const scheduleApi = {
  getSchedule: api.getSchedule,
  getScheduleByGroup: api.getScheduleByGroup,
  createScheduleItem: api.createScheduleItem,
  updateScheduleItem: api.updateScheduleItem,
  deleteScheduleItem: api.deleteScheduleItem,
  getAllSchedules: api.getAllSchedules
};

export const attendanceApi = {
  getAttendance: api.getAttendance,
  updateAttendance: api.updateAttendance,
  getRegularAttendance: api.getRegularAttendance,
  updateRegularAttendance: api.updateRegularAttendance,
  markAttendance: api.attendanceApi.markAttendance,
  getGroupAttendance: api.attendanceApi.getGroupAttendance
};

export const progressApi = {
  getProgressByChildId: api.getProgressByChildId,
  createProgress: api.createProgress,
  updateProgress: api.updateProgress,
  getProgressById: api.getProgressById,
  saveProgressStructure: async (params) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/progress/structure`,
        params,
        axiosConfig()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Экспортируем api как именованный экспорт
export { api };

// Экспортируем весь объект api как дефолтный экспорт
export default api;