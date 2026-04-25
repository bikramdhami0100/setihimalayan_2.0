import 'react-native-gesture-handler';
import { Slot, Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { BookingProvider } from "../context/BookingContext";
import { UIProvider } from "../context/UIContext";
import { AdminProvider } from "../context/AdminContext";
import "../global.css";
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  return (
    <PaperProvider>
      <UIProvider>
        <AuthProvider>
          <AdminProvider>
            <BookingProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(customer)" />
                <Stack.Screen name="(admin)" />
              </Stack>
            </BookingProvider>
          </AdminProvider>
        </AuthProvider>
      </UIProvider>
    </PaperProvider>
  );
}
