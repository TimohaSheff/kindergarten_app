export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

export const AUTH_CONFIG = {
  tokenKey: 'token',
  refreshTokenKey: 'refreshToken'
};

export const REQUEST_CONFIG = {
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}; 