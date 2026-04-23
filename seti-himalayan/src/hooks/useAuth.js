import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    loadUser,
    updateProfile,
    changePassword,
    clearError,
  } = useAuthStore();
  const { showSnackbar } = useUIStore();

  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
      clearError();
    }
  }, [error]);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loadUser();
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
  };
};