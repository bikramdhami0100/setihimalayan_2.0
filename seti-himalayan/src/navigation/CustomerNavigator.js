import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';
import HomeScreen from '../screens/customer/HomeScreen.js';
import SearchResultsScreen from '../screens/customer/SearchResultsScreen.js';
import SeatSelectionScreen from '../screens/customer/SeatSelectionScreen.js';
import BookingConfirmationScreen from '../screens/customer/BookingConfirmationScreen.js';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen.js';
import BookingDetailScreen from '../screens/customer/BookingDetailScreen.js';
import ProfileScreen from '../screens/customer/ProfileScreen.js';
import TicketScreen from '../screens/customer/TicketScreen.js';
import { colors } from '../utils/colors.js';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Search Buses' }} />
    <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{ title: 'Available Buses' }} />
    <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} options={{ title: 'Select Seats' }} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} options={{ title: 'Booking Summary' }} />
    <Stack.Screen name="TicketScreen" component={TicketScreen} options={{ title: 'Your Ticket' }} />
  </Stack.Navigator>
);

const BookingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking Details' }} />
    <Stack.Screen name="TicketDetail" component={TicketScreen} options={{ title: 'Ticket' }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'My Profile' }} />
  </Stack.Navigator>
);

const CustomerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Bookings') iconName = 'ticket';
          else if (route.name === 'Profile') iconName = 'account';
          return <Icon source={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabled,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Bookings" component={BookingsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default CustomerNavigator;