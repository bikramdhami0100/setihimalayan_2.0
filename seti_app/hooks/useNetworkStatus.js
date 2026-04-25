import { useEffect, useState, useContext } from 'react';
import { NetInfo } from '@react-native-community/netinfo';
import { UIContext } from '../context/UIContext';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const { setOffline, showSnackbar } = useContext(UIContext);

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