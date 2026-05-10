import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, StatusBar } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { router, Redirect, usePathname } from "expo-router";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext";
import { SearchProvider } from "../../context/SearchContext";
import { API_URL } from "../../utils/constants";
import * as authApi from "../../api/auth";
import Animated, { FadeInDown } from "react-native-reanimated";

const { width } = Dimensions.get("window");

function CustomDrawerContent(props) {
  const { user, logout, updateLocalUser } = useContext(AuthContext);
  const pathname = usePathname();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (user && !user.profile_image) {
      authApi.getProfile().then((res) => {
        const userData = res.data.data.user;
        if (userData?.profile_image) updateLocalUser(userData);
      }).catch(() => {});
    }
  }, [user?.id]);

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${url}`;
  };

  const displayName = user?.full_name || "User";
  const displayEmail = user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();
  const showImage = user?.profile_image && !imgError;

  const navItems = [
    { label: "Home", icon: "home-outline", activeIcon: "home", route: "/(customer)/(tabs)", activeRoute: "/(customer)/(tabs)" },
    { label: "My Bookings", icon: "ticket-outline", activeIcon: "ticket", route: "/(customer)/(tabs)/my-bookings", activeRoute: "/(customer)/(tabs)/my-bookings" },
    { label: "Popular Routes", icon: "map-outline", activeIcon: "map", route: "/(customer)/popular-routes", activeRoute: "/(customer)/popular-routes" },
    { label: "Profile", icon: "person-outline", activeIcon: "person", route: "/(customer)/(tabs)/profile", activeRoute: "/(customer)/(tabs)/profile" },
    { label: "Settings", icon: "settings-outline", activeIcon: "settings", route: "/(customer)/settings", activeRoute: "/(customer)/settings" },
  ];

  return (
    <View style={styles.drawerContainer}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* ─── DECORATIVE CIRCLE ─── */}
        <View style={styles.topCircle} />

        {/* ─── PROFILE HEADER ─── */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {showImage ? (
              <Image
                source={{ uri: getImageUrl(user.profile_image) }}
                style={styles.avatarImage}
                onError={() => setImgError(true)}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>
          <View style={styles.rolePill}>
            <View style={styles.roleDot} />
            <Text style={styles.roleText}>Passenger</Text>
          </View>
        </Animated.View>

        {/* ─── NAV ITEMS ─── */}
        <View style={styles.navSection}>
          {navItems.map((item, idx) => {
            const isActive = pathname.startsWith(item.activeRoute);
            return (
              <Animated.View key={item.label} entering={FadeInDown.duration(400).delay(100 + idx * 60)}>
                <TouchableOpacity
                  onPress={() => router.push(item.route)}
                  activeOpacity={0.7}
                  style={[styles.navItem, isActive && styles.navItemActive]}
                >
                  <View style={[styles.navIconBox, isActive && styles.navIconBoxActive]}>
                    <Ionicons name={isActive ? item.activeIcon : item.icon} size={18} color={isActive ? "#fff" : "#64748b"} />
                  </View>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                  {isActive && <View style={styles.navActiveDot} />}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* ─── DIVIDER ─── */}
        <View style={styles.divider} />

        {/* ─── MORE SECTION ─── */}
        <Animated.View entering={FadeInDown.duration(400).delay(360)} style={styles.moreSection}>
          <Text style={styles.moreTitle}>More</Text>
          {[
            { icon: "help-circle-outline", label: "Help & Support", onPress: () => {} },
            { icon: "shield-checkmark-outline", label: "Privacy Policy", onPress: () => router.push("/(customer)/privacy-policy") },
          ].map((item, idx) => (
            <Animated.View key={item.label} entering={FadeInDown.duration(400).delay(400 + idx * 60)}>
              <TouchableOpacity onPress={item.onPress} activeOpacity={0.7} style={styles.moreItem}>
                <View style={styles.moreIconBox}>
                  <Ionicons name={item.icon} size={16} color="#64748b" />
                </View>
                <Text style={styles.moreLabel}>{item.label}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      </DrawerContentScrollView>

      {/* ─── LOGOUT ─── */}
      <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.logoutSection}>
        <TouchableOpacity
          onPress={() => { logout(); router.replace("/(auth)/login"); }}
          activeOpacity={0.7}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={16} color="#dc2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>Seti Himalayan v2.0</Text>
      </Animated.View>
    </View>
  );
}

export default function CustomerLayout() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SearchProvider>
        <Drawer
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            drawerStyle: { flex: 1, backgroundColor: "#f8fafc" },
            headerShown: true,
            headerStyle: {
              backgroundColor: "white",
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: "#f1f5f9",
            },
            headerTitleStyle: {
              fontWeight: "900",
              fontSize: 18,
              color: "#1e3a8a",
            },
            drawerType: "front",
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ title: "Seti Himalayan", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="settings" options={{ title: "Settings", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="privacy-policy" options={{ title: "Privacy Policy", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="popular-routes" options={{ title: "Popular Routes", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="notifications" options={{ title: "Notifications", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="search-results" options={{ title: "Search Results", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="seat-selection" options={{ title: "Select Seats", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="passenger-details" options={{ title: "Passenger Details", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="booking-confirmation" options={{ title: "Confirmation", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="booking-detail" options={{ title: "Booking Details", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="ticket" options={{ title: "E-Ticket", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="ticket-pdf" options={{ title: "PDF Ticket", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="payment" options={{ title: "Payment", drawerItemStyle: { display: "none" } }} />
          <Drawer.Screen name="paymentResult" options={{ title: "Payment Result", drawerItemStyle: { display: "none" } }} />
        </Drawer>
      </SearchProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },

  // ── Decorative Circle ──
  topCircle: {
    position: "absolute",
    top: -width * 0.25,
    right: -width * 0.15,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: "#e0f2fe",
    zIndex: -1,
  },

  // ── Profile Header ──
  profileHeader: {
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  avatarLetter: { color: "#fff", fontSize: 34, fontWeight: "900" },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2.5,
    borderColor: "#f8fafc",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.5,
  },

  // ── Nav Section ──
  navSection: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 14,
  },
  navItemActive: {
    backgroundColor: "#1e3a8a",
    elevation: 4,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  navIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconBoxActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  navLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  navActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38bdf8",
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 24,
    marginVertical: 16,
  },

  // ── More Section ──
  moreSection: { paddingHorizontal: 16 },
  moreTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 14,
    textTransform: "uppercase",
  },
  moreItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  moreIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  moreLabel: { fontSize: 14, fontWeight: "600", color: "#64748b" },

  // ── Logout ──
  logoutSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  logoutText: { color: "#dc2626", fontSize: 14, fontWeight: "800" },
  footerText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 14,
  },
});
