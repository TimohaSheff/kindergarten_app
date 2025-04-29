import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (!token) {
          setUser(null);
          setLoading(false);
          setInitialized(true);
          return;
        }

        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser && parsedUser.role) {
              setUser(parsedUser);
              
              // Проверяем валидность токена
              const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (!response.ok) {
                throw new Error('Token invalid');
              }
              
              setLoading(false);
              setInitialized(true);
              return;
            }
          } catch (error) {
            console.error('Error parsing saved user or validating token:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setLoading(false);
            setInitialized(true);
            return;
          }
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            const normalizedUser = {
              id: userData.user_id || userData.id,
              email: userData.email,
              role: userData.role,
              first_name: userData.first_name,
              last_name: userData.last_name
            };
            
            setUser(normalizedUser);
            localStorage.setItem('user', JSON.stringify(normalizedUser));
          } else {
            throw new Error('Failed to validate token');
          }
        } catch (error) {
          console.error('Auth check error:', error);
          if (error.message !== 'Failed to fetch') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const data = await authApi.login({ email, password });
      
      if (!data || !data.user) {
        throw new Error('Данные пользователя не получены');
      }

      const normalizedUser = {
        id: data.user.id || data.user.user_id,
        email: data.user.email,
        role: data.user.role,
        first_name: data.user.first_name,
        last_name: data.user.last_name
      };

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      
      setUser(normalizedUser);
      return data;
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const data = await authApi.register(userData);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoading(true);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setLoading(false);
  };

  const isAuthenticated = Boolean(user && localStorage.getItem('token'));

  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout,
    isAuthenticated
  };

  if (!initialized) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 