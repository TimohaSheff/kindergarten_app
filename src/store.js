import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

// Начальное состояние для auth
const initialAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
};

// Auth reducer
const authReducer = (state = initialAuthState, action) => {
  switch (action.type) {
    case 'AUTH_LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case 'AUTH_LOGOUT':
      return initialAuthState;
    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    default:
      return state;
  }
};

// Корневой reducer
const rootReducer = combineReducers({
  auth: authReducer
});

// Создаем store
export const store = configureStore({
  reducer: rootReducer
});

export default store; 