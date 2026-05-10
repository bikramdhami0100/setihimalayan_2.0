import { Drawer } from "expo-router/drawer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from "react-native";
import { router, Redirect, useRootNavigationState } from "expo-router";
import { useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { API_URL } from "../../utils/constants";
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";

function CustomDrawerContent(props) {
  const { user, logout } = useContext(AuthContext);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${url}`;
  };

  const displayName = user?.full_name || "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* User Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.profile_image ? (
              <Image source={{ uri: getImageUrl(user.profile_image) }} style={styles.profileImageFull} />
            ) : (
              <Text style={styles.avatarInitial}>{initial}</Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.full_name || "Admin"}</Text>
          <View style={styles.roleRow}>
            <View style={styles.statusDot} />
            <Text style={styles.roleText}>
              {user?.role?.replace('_', ' ') || "Administrator"}
            </Text>
          </View>
        </View>

        {/* Drawer Items */}
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Support/Settings Section */}
        <View style={styles.accountSection}>
          <Text style={styles.accountLabel}>Account</Text>
          <DrawerItem
            label="Logout"
            onPress={() => logout()}
            icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color="#ef4444" />}
            labelStyle={{ color: "#ef4444", fontWeight: "700" }}
          />
        </View>
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Seti Himalayan v2.0</Text>
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
      <View style={styles.loadingContainer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#1E3A8A',
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
    borderBottomRightRadius: 40,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  profileImageFull: {
    width: 80,
    height: 80,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  roleText: {
    color: '#DBEAFE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  drawerItemsContainer: {
    paddingHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 24,
    marginVertical: 16,
  },
  accountSection: {
    paddingHorizontal: 16,
  },
  accountLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginLeft: 16,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderColor: '#F8FAFC',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
