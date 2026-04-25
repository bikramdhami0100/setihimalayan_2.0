import { useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UIContext } from '../context/UIContext';

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
  } = useContext(AuthContext);
  const { showSnackbar } = useContext(UIContext);

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