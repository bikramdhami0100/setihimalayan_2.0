import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
import { Slot, Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { BookingProvider } from "../context/BookingContext";
import { UIProvider } from "../context/UIContext";
import { AdminProvider } from "../context/AdminContext";
import "../global.css";
// import * as Notifications from 'expo-notifications';

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

import { PaperProvider } from 'react-native-paper';
import { CustomerProvider } from '../context/CustomerContext';

export default function RootLayout() {
  let isUserLogin="passenger";
  // get token from async storage or native storage, this is just a placeholder
  return (
    <PaperProvider>
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
