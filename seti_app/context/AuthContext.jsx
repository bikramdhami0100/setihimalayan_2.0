import React, { createContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';
import { 
  setAccessToken, 
  setRefreshToken, 
  clearAuthData, 
  getUser as getStoredUser, 
  setUser as setStoredUser,
  getAccessToken,
  getRefreshToken
} from '../utils/storage';
import { setAuthToken } from '../api/client';

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
      // Retry storage access up to 5 times with 500ms delay
      let storedUser, token;
      for (let i = 0; i < 5; i++) {
        try {
          storedUser = await getStoredUser();
          token = await getAccessToken();
          break;
        } catch (err) {
          if (i === 4) throw err;
          await new Promise(r => setTimeout(r, 500));
        }
      }
        
        if (token) {
          setAuthToken(token);
        }

        if (!storedUser || !token) {
          setIsLoading(false);
          return;
        }

        // Try to verify the token is still valid by fetching profile
        // If it fails with 401, the interceptor will auto-refresh using refresh token
        try {
          const response = await authApi.getProfile();
          const userData = response.data.data.user;
          await setStoredUser(userData);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (err) {
          // Token might be expired - try refresh via stored refresh token
          const refreshToken = await getRefreshToken();
          if (refreshToken) {
            try {
              const refreshResponse = await authApi.refreshToken(refreshToken);
              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
              setAuthToken(newAccessToken);
              await setAccessToken(newAccessToken);
              await setRefreshToken(newRefreshToken);
              // Fetch fresh profile with new token
              const profileRes = await authApi.getProfile();
              const freshUser = profileRes.data.data.user;
              await setStoredUser(freshUser);
              setUser(freshUser);
              setIsAuthenticated(true);
            } catch (refreshErr) {
              setAuthToken(null);
              await clearAuthData();
              setUser(null);
              setIsAuthenticated(false);
            }
          } else {
            setAuthToken(null);
            await clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (e) {
        console.error("Failed to load auth state", e);
        setAuthToken(null);
        await clearAuthData();
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
      setAuthToken(accessToken);
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
      setAuthToken(null);
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
    
    setAuthToken(token);
    setIsLoading(true);
    try {
      const response = await authApi.getProfile();
      const userData = response.data.data.user;
      await setStoredUser(userData);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthToken(null);
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

  const updateLocalUser = async (userData) => {
    await setStoredUser(userData);
    setUser(userData);
  };

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
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
