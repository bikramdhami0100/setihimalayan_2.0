import { useEffect, useState } from 'react';
import { NetInfo } from '@react-native-community/netinfo';
import useUIStore from '../store/uiStore';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const { setOffline, showSnackbar } = useUIStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected;
      setIsConnected(connected);
      setOffline(!connected);
      if (!connected) {
        showSnackbar('No internet connection', 'warning');
      } else {
        showSnackbar('Back online', 'success');
      }
    });
    return () => unsubscribe();
  }, []);

  return isConnected;
};