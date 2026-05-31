import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from "../context/AuthContext";
import { BookingProvider } from "../context/BookingContext";
import { UIProvider } from "../context/UIContext";
import { AdminProvider } from "../context/AdminContext";

import { PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import { theme } from '../utils/theme';
import { CustomerProvider } from '../context/CustomerContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

// Suppress LogBox warnings for unhandled 401 promise rejections
LogBox.ignoreLogs(['Request failed with status code 401']);

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      setReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
    <PaperProvider theme={theme}>
      <UIProvider>
        <AuthProvider>
          <AdminProvider>
          <CustomerProvider>
            <BookingProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(admin)" />
              </Stack>
            </BookingProvider>
          </CustomerProvider>
          </AdminProvider>
        </AuthProvider>
      </UIProvider>
    </PaperProvider>
    </ErrorBoundary>
  );
}
