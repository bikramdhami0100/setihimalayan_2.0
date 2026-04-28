import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth';
import { 
  setAccessToken, 
  setRefreshToken, 
  clearAuthData, 
  getUser as getStoredUser, 
  setUser as setStoredUser,
  getAccessToken, 
  setItem
} from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const storedUser = await getStoredUser();
        const token = await getAccessToken();
        setItem('token', token); // Store token in AsyncStorage for API calls if needed
        setAccessToken(token); // Set token in memory for API client
        if (storedUser && token) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Failed to load auth state", e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user: userData } = response.data.data;
      await setAccessToken(accessToken);
      await setRefreshToken(refreshToken);
      await setStoredUser(userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      setIsLoading(false);
      return { success: true, user: userData };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.register(userData);
      setIsLoading(false);
      return { success: true, data: response.data.data };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  const loadUser = async () => {
    if (user && isAuthenticated) return;
    
    const token = await getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await authApi.getProfile();
      const userData = response.data.data.user;
      await setStoredUser(userData);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.updateProfile(profileData);
      const updatedUser = response.data.data.user;
      await setStoredUser(updatedUser);
      setUser(updatedUser);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const changePassword = async (passwordData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.changePassword(passwordData);
      setIsLoading(false);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Password change failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        loading: isLoading,
        error,
        login,
        register,
        logout,
        loadUser,
        updateProfile,
        changePassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
