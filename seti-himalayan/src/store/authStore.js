

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- ADD THIS
import * as authApi from '../api/auth';
import { 
  setAccessToken, 
  setRefreshToken, 
  clearAuthData, 
  getUser, 
  setUser,
  getAccessToken 
} from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { accessToken, refreshToken, user } = response.data.data;
          await setAccessToken(accessToken);
          await setRefreshToken(refreshToken);
          await setUser(user);
          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(userData);
          set({ isLoading: false });
          return { success: true, data: response.data.data };
        } catch (error) {
          const message = error.response?.data?.message || 'Registration failed';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout API error:', error);
        } finally {
          await clearAuthData();
          set({ user: null, isAuthenticated: false, error: null });
        }
      },

      loadUser: async () => {
        // If already have user from persisted state, just exit
        const { user, isAuthenticated } = get();
        if (user && isAuthenticated) {
          set({ isLoading: false });
          return;
        }
        // Otherwise check token
        const token = await getAccessToken();
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const response = await authApi.getProfile();
          const user = response.data.data.user;
          await setUser(user);
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          await clearAuthData();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (profileData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.updateProfile(profileData);
          const updatedUser = response.data.data.user;
          await setUser(updatedUser);
          set({ user: updatedUser, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Update failed';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      changePassword: async (passwordData) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.changePassword(passwordData);
          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Password change failed';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      // name: 'auth-storage', // USE A FIXED STRING (NOT STORAGE_KEYS.USER)
      name: STORAGE_KEYS.USER, // <-- USE THIS
      storage: createJSONStorage(() => AsyncStorage), // <-- REPLACE localStorage with AsyncStorage
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;