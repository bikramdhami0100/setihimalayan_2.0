import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';
import DashboardScreen from '../screens/admin/DashboardScreen';
import BusesScreen from '../screens/admin/BusesScreen';
import RoutesScreen from '../screens/admin/RoutesScreen';
import SchedulesScreen from '../screens/admin/SchedulesScreen';
import BookingsScreen from '../screens/admin/BookingsScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import { colors } from '../utils/colors';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <Stack.Screen name="DashboardMain" component={DashboardScreen} options={{ title: 'Admin Dashboard' }} />
  </Stack.Navigator>
);

const BusesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="BusesMain" component={BusesScreen} options={{ title: 'Manage Buses' }} />
  </Stack.Navigator>
);

const RoutesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="RoutesMain" component={RoutesScreen} options={{ title: 'Manage Routes' }} />
  </Stack.Navigator>
);

const SchedulesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="SchedulesMain" component={SchedulesScreen} options={{ title: 'Manage Schedules' }} />
  </Stack.Navigator>
);

const BookingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="BookingsMain" component={BookingsScreen} options={{ title: 'All Bookings' }} />
  </Stack.Navigator>
);

const UsersStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="UsersMain" component={UsersScreen} options={{ title: 'Manage Users' }} />
  </Stack.Navigator>
);

const ReportsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="ReportsMain" component={ReportsScreen} options={{ title: 'Reports & Analytics' }} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.backgroundDark },
      headerTintColor: colors.textLight,
    }}
  >
    <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Admin Settings' }} />
  </Stack.Navigator>
);

const AdminNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerStyle: { backgroundColor: colors.backgroundDark, width: 280 },
        drawerLabelStyle: { color: colors.textLight },
        drawerActiveTintColor: colors.accent,
        drawerInactiveTintColor: colors.textSecondary,
        headerStyle: { backgroundColor: colors.backgroundDark },
        headerTintColor: colors.textLight,
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="view-dashboard" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Buses" 
        component={BusesStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="bus" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Routes" 
        component={RoutesStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="map-marker-path" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Schedules" 
        component={SchedulesStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="calendar-clock" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Bookings" 
        component={BookingsStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="ticket" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Users" 
        component={UsersStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="account-group" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Reports" 
        component={ReportsStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="chart-line" size={24} color={color} /> }}
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsStack} 
        options={{ drawerIcon: ({ color }) => <Icon source="cog" size={24} color={color} /> }}
      />
    </Drawer.Navigator>
  );
};

export default AdminNavigator;