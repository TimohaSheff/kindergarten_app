import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import axios from '../utils/axios';
import { useSnackbar } from '../hooks/useSnackbar';
import { CircularProgress, Box } from '@mui/material';

const AuthContext = createContext(null);

const initialState = {
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'AUTH_START':
            return {
                ...state,
                loading: true,
                error: null
            };
        case 'AUTH_SUCCESS':
            return {
                isAuthenticated: true,
                user: action.payload,
                loading: false,
                error: null
            };
        case 'AUTH_FAILURE':
            return {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: action.payload
            };
        case 'AUTH_LOGOUT':
            return {
                isAuthenticated: false,
                user: null,
                loading: false,
                error: null
            };
        default:
            return state;
    }
};

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const { showSnackbar } = useSnackbar();
    const isMounted = useRef(true);
    const initialCheckDone = useRef(false);

    const checkAuth = useCallback(async () => {
        if (!isMounted.current || initialCheckDone.current) return;

        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (!token) {
            dispatch({ type: 'AUTH_FAILURE', payload: 'Токен не найден' });
            initialCheckDone.current = true;
            return false;
        }

        try {
            dispatch({ type: 'AUTH_START' });

            if (savedUser) {
                const userData = JSON.parse(savedUser);
                if (userData && userData.user_id) {
                    dispatch({
                        type: 'AUTH_SUCCESS',
                        payload: userData
                    });
                    initialCheckDone.current = true;
                    return true;
                }
            }

            const response = await axios.getCurrentUser();
            
            if (response && response.user_id && isMounted.current) {
                const userData = {
                    ...response,
                    id: String(response.user_id),
                    user_id: String(response.user_id)
                };
                
                dispatch({ 
                    type: 'AUTH_SUCCESS', 
                    payload: userData
                });
                localStorage.setItem('user', JSON.stringify(userData));
                initialCheckDone.current = true;
                return true;
            } else {
                if (isMounted.current) {
                    dispatch({ type: 'AUTH_FAILURE', payload: 'Ошибка при получении данных пользователя' });
                }
                initialCheckDone.current = true;
                return false;
            }
        } catch (error) {
            console.error('Ошибка при проверке аутентификации:', error);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            if (isMounted.current) {
                dispatch({ type: 'AUTH_FAILURE', payload: error.message || 'Ошибка при проверке аутентификации' });
            }
            initialCheckDone.current = true;
            return false;
        }
    }, []);

    useEffect(() => {
        isMounted.current = true;
        checkAuth();
        return () => {
            isMounted.current = false;
        };
    }, [checkAuth]);

    const login = async (credentials) => {
        try {
            dispatch({ type: 'AUTH_START' });
            console.log('Attempting login with credentials:', credentials);
            
            const response = await axios.login(credentials);
            console.log('Login response:', response);
            
            if (!response || !response.data || !response.data.token || !response.data.user) {
                throw new Error('Неверный формат ответа от сервера');
            }
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            dispatch({
                type: 'AUTH_SUCCESS',
                payload: {
                    ...response.data.user,
                    id: String(response.data.user.id || response.data.user.user_id),
                    user_id: String(response.data.user.id || response.data.user.user_id)
                }
            });
            
            showSnackbar({
                message: 'Вы успешно вошли в систему',
                severity: 'success'
            });
            
            return { success: true, user: response.data.user };
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Ошибка при входе в систему';
            
            dispatch({ 
                type: 'AUTH_FAILURE', 
                payload: errorMessage 
            });
            
            showSnackbar({
                message: errorMessage,
                severity: 'error'
            });
            
            throw new Error(errorMessage);
        }
    };

    const logout = async () => {
        try {
            await axios.logout();
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            dispatch({ type: 'AUTH_LOGOUT' });
            window.location.href = '/';
        }
    };

    if (state.loading && !initialCheckDone.current) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <AuthContext.Provider value={{ 
            ...state,
            login,
            logout,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 