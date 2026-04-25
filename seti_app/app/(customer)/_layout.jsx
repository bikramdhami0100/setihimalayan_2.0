import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import { router } from "expo-router";

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={{ padding: 24, backgroundColor: '#1e3a8a', marginBottom: 12 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', alignItems: 'center', justifyCenter: 'center', marginBottom: 12 }}>
            <Ionicons name="person" size={40} color="#1e3a8a" />
        </View>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Bikram Dhami</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>bikram@example.com</Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
        
        <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 12 }}>
            <DrawerItem
                label="Help & Support"
                onPress={() => {}}
                icon={({ color, size }) => <Ionicons name="help-circle-outline" size={size} color={color} />}
            />
            <DrawerItem
                label="Settings"
                onPress={() => {}}
                icon={({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />}
            />
        </View>
      </View>

      <TouchableOpacity 
        onPress={() => router.replace("/(auth)/login")}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}
      >
        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        <Text style={{ marginLeft: 12, color: '#ef4444', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

import { SearchProvider } from "../../context/SearchContext";

export default function CustomerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SearchProvider>
        <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
            color: '#1e3a8a',
          },
          drawerActiveTintColor: '#1e3a8a',
          drawerInactiveTintColor: '#64748b',
          drawerLabelStyle: {
            fontWeight: 'bold',
            marginLeft: -10,
          },
          drawerItemStyle: {
            borderRadius: 12,
            marginHorizontal: 12,
          }
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Home",
            title: "Seti Himalayan",
            drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="my-bookings"
          options={{
            drawerLabel: "My Bookings",
            title: "Your Trips",
            drawerIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Account Profile",
            title: "My Profile",
            drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          }}
        />
        
        {/* Hidden screens */}
        <Drawer.Screen name="search-results" options={{ drawerItemStyle: { display: 'none' }, title: "Search Results" }} />
        <Drawer.Screen name="seat-selection" options={{ drawerItemStyle: { display: 'none' }, title: "Select Seats" }} />
        <Drawer.Screen name="passenger-details" options={{ drawerItemStyle: { display: 'none' }, title: "Passenger Details" }} />
        <Drawer.Screen name="booking-confirmation" options={{ drawerItemStyle: { display: 'none' }, title: "Confirmation" }} />
        <Drawer.Screen name="booking-detail" options={{ drawerItemStyle: { display: 'none' }, title: "Booking Details" }} />
        <Drawer.Screen name="privacy-policy" options={{ drawerItemStyle: { display: 'none' }, title: "Privacy Policy" }} />
        <Drawer.Screen name="ticket" options={{ drawerItemStyle: { display: 'none' }, title: "E-Ticket" }} />
        <Drawer.Screen name="ticket-pdf" options={{ drawerItemStyle: { display: 'none' }, title: "PDF Ticket" }} />
      </Drawer>
      </SearchProvider>
    </GestureHandlerRootView>
  );
}
