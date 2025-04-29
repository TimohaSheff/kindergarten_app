import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import 'antd/dist/reset.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <Provider store={store}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          <App />
        </LocalizationProvider>
      </Provider>
    </AuthProvider>
  </React.StrictMode>
);
