import React, { createContext, useState, useEffect } from 'react';
import { setSnackbarHandler } from '../api/client';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info');
  const [themeMode, setThemeMode] = useState('light');
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    setSnackbarHandler(showSnackbar);
  }, []);

  const setLoading = (loading) => setIsLoading(loading);
  const setOffline = (offline) => setIsOffline(offline);

  const showSnackbar = (message, type = 'info') => {
    setSnackbarVisible(true);
    setSnackbarMessage(message);
    setSnackbarType(type);
    
    setTimeout(() => {
      setSnackbarVisible(false);
    }, 3000);
  };

  const hideSnackbar = () => setSnackbarVisible(false);

  return (
    <UIContext.Provider
      value={{
        isLoading,
        isOffline,
        snackbarVisible,
        snackbarMessage,
        snackbarType,
        themeMode,
        selectedScheduleId,
        socketConnected,
        setLoading,
        setOffline,
        showSnackbar,
        hideSnackbar,
        setThemeMode,
        setSelectedScheduleId,
        setSocketConnected,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
