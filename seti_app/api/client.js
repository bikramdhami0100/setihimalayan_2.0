import axios from 'axios';
import { API_URL } from '../utils/constants';
import { setAccessToken, setRefreshToken, getRefreshToken, clearAuthData } from '../utils/storage';

let _accessToken = null;
let _showSnackbar = null;

export const setSnackbarHandler = (handler) => {
  _showSnackbar = handler;
};

export const setAuthToken = (token) => {
  _accessToken = token;
};

export const getAuthToken = () => _accessToken;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add token (synchronous — reads from memory)
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          setAuthToken(accessToken);
          await setAccessToken(accessToken);
          await setRefreshToken(newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          setAuthToken(null);
          await clearAuthData();
          _showSnackbar?.('Session expired. Please login again.', 'error');
          return Promise.reject(refreshError);
        }
      } else {
        _showSnackbar?.('Session expired. Please login again.', 'error');
      }
    } else if (error.response?.status === 401) {
      _showSnackbar?.('Session expired. Please login again.', 'error');
    }
    return Promise.reject(error);
  }
);

export default api;