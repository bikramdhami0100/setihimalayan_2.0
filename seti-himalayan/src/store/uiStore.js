import { create } from 'zustand';

const useUIStore = create((set, get) => ({
  isLoading: false,
  isOffline: false,
  snackbarVisible: false,
  snackbarMessage: '',
  snackbarType: 'info', // 'success', 'error', 'warning', 'info'
  themeMode: 'light', // 'light' or 'dark' for admin vs customer
  selectedScheduleId: null,
  socketConnected: false,

  setLoading: (loading) => set({ isLoading: loading }),
  setOffline: (offline) => set({ isOffline: offline }),

  showSnackbar: (message, type = 'info') => {
    set({ 
      snackbarVisible: true, 
      snackbarMessage: message, 
      snackbarType: type 
    });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (get().snackbarVisible) {
        set({ snackbarVisible: false });
      }
    }, 3000);
  },

  hideSnackbar: () => set({ snackbarVisible: false }),

  setThemeMode: (mode) => set({ themeMode: mode }),
  setSelectedScheduleId: (id) => set({ selectedScheduleId: id }),
  setSocketConnected: (connected) => set({ socketConnected: connected }),
}));

export default useUIStore;