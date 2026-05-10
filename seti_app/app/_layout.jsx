import 'react-native-gesture-handler';
import { Buffer as BufferPolyfill } from 'buffer';
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { BookingProvider } from "../context/BookingContext";
import { UIProvider } from "../context/UIContext";
import { AdminProvider } from "../context/AdminContext";

import { PaperProvider } from 'react-native-paper';
import { LogBox } from 'react-native';
import { theme } from '../utils/theme';
import { CustomerProvider } from '../context/CustomerContext';

// Suppress LogBox warnings for unhandled 401 promise rejections
LogBox.ignoreLogs(['Request failed with status code 401']);

if (typeof global.Buffer === 'undefined') {
  global.Buffer = BufferPolyfill;
}

export default function RootLayout() {
  return (
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
  );
}
