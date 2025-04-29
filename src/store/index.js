import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

// Создаем пустой редьюсер
const emptyReducer = (state = {}, action) => state;

// Импортируем редьюсеры
const rootReducer = combineReducers({
  empty: emptyReducer
});

// Создаем store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Игнорируем эти поля в действиях
        ignoredActionPaths: ['payload.error', 'payload.timestamp'],
        // Игнорируем эти поля в состоянии
        ignoredPaths: ['error'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Экспортируем store
export { store };
export default store; 