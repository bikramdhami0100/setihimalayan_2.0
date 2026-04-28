import { Drawer } from "expo-router/drawer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { router, Redirect, useRootNavigationState } from "expo-router";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";

function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);

  return (
    <View className="flex-1">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* User Profile Header */}
        <View className="bg-[#1e3a8a] pt-16 pb-8 px-6 mb-4 rounded-br-[40px]">
          <View className="w-20 h-20 bg-white/20 rounded-3xl items-center justify-center mb-4 border border-white/30">
            <Ionicons name="person" size={40} color="white" />
          </View>
          <Text className="text-white text-xl font-black">{user?.full_name || "Admin"}</Text>
          <View className="flex-row items-center mt-1">
            <View className="w-2 h-2 rounded-full bg-green-400 mr-2" />
            <Text className="text-blue-100 text-xs font-bold tracking-widest uppercase">
              {user?.role?.replace('_', ' ') || "Administrator"}
            </Text>
          </View>
        </View>

        {/* Drawer Items */}
        <View className="px-2">
          <DrawerItemList {...props} />
        </View>

        {/* Divider */}
        <View className="h-[1px] bg-gray-100 mx-6 my-4" />

        {/* Support/Settings Section */}
        <View className="px-4">
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-4">Account</Text>
          <DrawerItem
            label="Logout"
            onPress={() => logout()}
            icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color="#ef4444" />}
            labelStyle={{ color: "#ef4444", fontWeight: "700" }}
          />
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View className="p-6 border-t border-gray-50">
        <Text className="text-gray-400 text-[10px] text-center font-medium">Seti Himalayan v2.0</Text>
      </View>
    </View>
  );
}

export default function AdminLayout() {
  const { user, isLoading } = useContext(AuthContext);
  const rootNavigationState = useRootNavigationState();

  const isNavigationReady = rootNavigationState?.key;

  if (isLoading || !isNavigationReady) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  // Use Redirect for safer navigation during initial mount
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
         drawerStyle:{flex:1},
        headerShown: true,
        headerStyle: {
          backgroundColor: 'white',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
        },
        headerTitleStyle: {
          fontWeight: "900",
          fontSize: 18,
          color: "#1e3a8a",
        },
        drawerActiveBackgroundColor: "#eff6ff",
        drawerActiveTintColor: "#1e3a8a",
        drawerInactiveTintColor: "#64748b",
        drawerLabelStyle: {
          fontWeight: "700",
          fontSize: 14,
          marginLeft: -10,
        },
        drawerItemStyle: {
          borderRadius: 12,
          marginVertical: 4,
          paddingHorizontal: 8,
        },
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          drawerLabel: "Dashboard",
          title: "Admin Dashboard",
          drawerIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="buses"
      
        // className="bg-red-500"
        options={{
          drawerLabel: "Manage Buses",
          title: "Buses",
          drawerIcon: ({ color }) => <Ionicons name="bus-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="routes"
        options={{
          drawerLabel: "Manage Routes",
          title: "Routes",
          drawerIcon: ({ color }) => <Ionicons name="map-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="schedules"
        options={{
          drawerLabel: "Schedules",
          title: "Schedules",
          drawerIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="bookings"
        options={{
          drawerLabel: "All Bookings",
          title: "Bookings",
          drawerIcon: ({ color }) => <Ionicons name="ticket-outline" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          drawerLabel: "Users",
          title: "User Management",
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />,
        }}
      />
      {user?.role === 'super_admin' && (
        <Drawer.Screen
          name="roles"
          options={{
            drawerLabel: "Role Management",
            title: "Roles",
            drawerIcon: ({ color }) => <Ionicons name="shield-checkmark-outline" size={22} color={color} />,
          }}
        />
      )}
      <Drawer.Screen
        name="reports"
        options={{
          drawerLabel: "Reports",
          title: "Analytics",
          drawerIcon: ({ color }) => <Ionicons name="stats-chart-outline" size={22} color={color} />,
        }}
      />
    </Drawer>
  );
}
