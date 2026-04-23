import React, { useEffect } from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { theme } from './src/utils/theme';
import useAuthStore from './src/store/authStore';
import { registerForPushNotifications } from './src/services/notificationService';
import { View } from 'react-native';
import { Text } from 'react-native';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export default function App() {
  const { loadUser } = useAuthStore();
 console.log(loadUser)
  useEffect(() => {
    loadUser().catch(err => console.warn('Failed to load user:', err));
    registerForPushNotifications().catch(err => console.warn('Push notification registration failed:', err));
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <StatusBar style="auto" />
          <RootNavigator />
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
    
  );
}