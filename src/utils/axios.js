import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:3002/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

instance.interceptors.request.use(
    (config) => {
        // Проверяем, является ли тело запроса FormData
        if (config.data instanceof FormData) {
            // Удаляем Content-Type, чтобы axios автоматически установил правильный boundary
            delete config.headers['Content-Type'];
        }
        
        console.log('Отправка запроса:', {
            url: config.url,
            method: config.method,
            baseURL: config.baseURL,
            headers: config.headers,
            params: config.params,
            data: config.data instanceof FormData ? 
                'FormData: ' + Array.from(config.data.entries()).map(([key, value]) => 
                    `${key}: ${value instanceof File ? 'File' : value}`).join(', ') : 
                config.data
        });
        
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Ошибка при подготовке запроса:', error);
        return Promise.reject(error);
    }
);

instance.interceptors.response.use(
    (response) => {
        console.log('Получен ответ:', {
            url: response.config.url,
            status: response.status,
            data: response.data
        });
        
        const data = response.data;
        
        // Если это запрос учителей, фильтруем только с ролью teacher
        if (response.config.url.includes('/users') && response.config.url.includes('role=teacher')) {
            response.data = Array.isArray(data) ? data.filter(user => user.role === 'teacher') : data;
            return response;
        }
        
        if (data?.success === false) {
            console.error('Сервер вернул ошибку:', data);
            return Promise.reject(new Error(data.message || 'Ошибка операции'));
        }

        // Проверяем наличие данных
        if (data === undefined || data === null) {
            console.error('Сервер вернул пустой ответ');
            return Promise.reject(new Error('Сервер вернул пустой ответ'));
        }

        return response;
    },
    (error) => {
        console.error('Ошибка при выполнении запроса:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        if (error.response) {
            // Сервер вернул ответ с ошибкой
            const message = error.response.data?.message || 
                          error.response.data?.error || 
                          'Ошибка сервера';
            
            // Если ошибка авторизации, очищаем токен
            if (error.response.status === 401) {
                localStorage.removeItem('token');
            }

            return Promise.reject(new Error(message));
        } else if (error.request) {
            // Запрос был сделан, но ответ не получен
            return Promise.reject(new Error('Сервер не отвечает'));
        } else {
            // Ошибка при подготовке запроса
            return Promise.reject(new Error('Ошибка при выполнении запроса'));
        }
    }
);

// Методы для работы с группами
instance.getGroups = () => instance.get('/groups');
instance.createGroup = (data) => instance.post('/groups', data);
instance.updateGroup = (id, data) => instance.put(`/groups/${id}`, data);
instance.deleteGroup = (id) => instance.delete(`/groups/${id}`);
instance.getGroupChildrenDetails = (groupId) => instance.get(`/groups/${groupId}/children`);

// Методы для работы с учителями
instance.getTeachers = () => instance.get('/users?role=teacher');
instance.getCurrentUser = () => instance.get('/auth/me');

// Добавляем методы аутентификации
instance.login = (credentials) => instance.post('/auth/login', credentials);
instance.logout = () => instance.post('/auth/logout');
instance.register = (userData) => instance.post('/auth/register', userData);

export default instance; 