export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3002/api',
  TIMEOUT: 15000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export const AUTH_CONFIG = {
  tokenKey: 'token',
  refreshTokenKey: 'refreshToken',
  tokenExpiry: '1h',
  refreshTokenExpiry: '7d'
};

export const REQUEST_CONFIG = {
  timeout: 15000,
  retries: 3,
  retryDelay: 1000,
  errorHandling: {
    retryOnNetworkError: true,
    retryOnServerError: true,
    retryStatusCodes: [408, 500, 502, 503, 504]
  }
}; 