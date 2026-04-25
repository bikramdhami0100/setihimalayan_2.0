import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { setItem, getItem } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  let token;
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Error', 'Failed to get push token for notifications!');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    await setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, token);
  } else {
    Alert.alert('Warning', 'Push notifications require a physical device');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
};

export const sendLocalNotification = (title, body, data = {}) => {
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: Platform.OS === 'android' ? 'default' : undefined,
    },
    trigger: null, // immediate
  });
};

export const scheduleBookingReminder = (bookingReference, departureTime, origin, destination) => {
  const reminderTime = new Date(departureTime);
  reminderTime.setHours(reminderTime.getHours() - 2); // 2 hours before
  if (reminderTime > new Date()) {
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Journey Reminder',
        body: `Your trip from ${origin} to ${destination} (${bookingReference}) departs in 2 hours.`,
        data: { bookingReference, origin, destination },
      },
      trigger: reminderTime,
    });
  }
};

export const cancelAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};