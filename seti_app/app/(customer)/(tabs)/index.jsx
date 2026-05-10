import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Alert,
  Dimensions,
  StyleSheet,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import dayjs from "dayjs";
import { useCustomerData } from "../../../context/CustomerContext";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const {
    routes,
    popularRoutes,
    loading,
    fetchRoutes,
    fetchPopularRoutes,
    userProfile,
  } = useCustomerData();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [showCalendar, setShowCalendar] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const blurTimeoutRef = useRef(null);

  const hour = dayjs().hour();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const allLocations = useMemo(() => {
    if (!routes || routes.length === 0) return [];
    const set = new Set();
    routes.forEach((r) => { if (r.origin) set.add(r.origin); if (r.destination) set.add(r.destination); });
    return Array.from(set).sort();
  }, [routes]);

  const filterSuggestions = useCallback((input) => {
    if (!input?.trim()) return [];
    const q = input.toLowerCase();
    return allLocations.filter((l) => l.toLowerCase().includes(q)).slice(0, 8);
  }, [allLocations]);

  const handleFromChange = (text) => {
    setFrom(text);
    const s = filterSuggestions(text);
    setFromSuggestions(s);
    setShowFromSuggestions(s.length > 0 && text.trim().length > 0);
  };

  const handleToChange = (text) => {
    setTo(text);
    const s = filterSuggestions(text);
    setToSuggestions(s);
    setShowToSuggestions(s.length > 0 && text.trim().length > 0);
  };

  const selectFromSuggestion = (loc) => { clearBlurTimeout(); setFrom(loc); setFromSuggestions([]); setShowFromSuggestions(false); Keyboard.dismiss(); };
  const selectToSuggestion = (loc) => { clearBlurTimeout(); setTo(loc); setToSuggestions([]); setShowToSuggestions(false); Keyboard.dismiss(); };
  const clearBlurTimeout = () => { if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; } };
  const handleFromBlur = () => { blurTimeoutRef.current = setTimeout(() => { setShowFromSuggestions(false); }, 300); };
  const handleToBlur = () => { blurTimeoutRef.current = setTimeout(() => { setShowToSuggestions(false); }, 300); };

  useEffect(() => () => clearBlurTimeout(), []);

  useEffect(() => {
    Promise.all([fetchRoutes({ limit: 100 }), fetchPopularRoutes()])
      .catch(() => Alert.alert("Network Error", "Could not load routes."));
  }, []);

  const handleSwap = () => { setFrom(to); setTo(from); setFromSuggestions([]); setToSuggestions([]); setShowFromSuggestions(false); setShowToSuggestions(false); };

  const handleSearch = () => {
    if (!from.trim() || !to.trim()) {
      Alert.alert("Missing Information", "Please enter both origin and destination.");
      return;
    }
    router.push({ pathname: "/(customer)/search-results/all", params: { origin: from.trim(), destination: to.trim(), date } });
  };

  const handleRoutePress = (route) => {
    router.push({ pathname: "/(customer)/search-results/all", params: { origin: route.origin, destination: route.destination, date: dayjs().format("YYYY-MM-DD") } });
  };

  const displayName = userProfile?.full_name?.split(" ")[0] || "Traveler";
  const totalRoutes = routes?.length || 0;
  const isLoadingPopular = loading.popularRoutes;
  const isLoadingRoutes = loading.routes;

  const renderSuggestionList = (suggestions, onSelect, field) => {
    if (!suggestions.length) return null;
    return (
      <Animated.View entering={FadeInUp.duration(200)} style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
                  <Ionicons name={field === "from" ? "arrow-down-circle" : "arrow-up-circle"} size={12} color="#64748b" />
          <Text style={styles.suggestionHeaderText}>SUGGESTED {field === "from" ? "ORIGINS" : "DESTINATIONS"}</Text>
        </View>
        <FlatList data={suggestions} keyExtractor={(item, idx) => `${item}-${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.6} style={styles.suggestionItem}>
              <View style={[styles.suggestionIcon, { backgroundColor: field === "from" ? "#ecfdf5" : "#fef2f2" }]}>
                <Ionicons name={field === "from" ? "location" : "map-outline"} size={14} color={field === "from" ? "#059669" : "#dc2626"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionText}>{item}</Text>
                <Text style={styles.suggestionSubtext}>{field === "from" ? "Departure" : "Arrival"} point, Nepal</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator keyboardShouldPersistTaps="always"
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      <View style={styles.topCircle} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View entering={FadeInUp.duration(800).delay(100)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandText}>SETI HIMALAYAN</Text>
              <Text style={styles.greeting}>{greeting}, {displayName}</Text>
              <Text style={styles.headerSubtext}>Ready for your next journey?</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => router.push("/(customer)/notifications")} style={styles.iconBtn}>
                <View style={{ position: "relative" }}>
                  <Ionicons name="notifications-outline" size={20} color="#1e3a8a" />
                  <View style={styles.notifDot} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push("/(customer)/(tabs)/profile")} style={[styles.iconBtn, { backgroundColor: "#1e3a8a" }]}>
                <Ionicons name="person" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(300)} style={styles.searchCard}>
          <View style={styles.searchCardHeader}>
            <View style={styles.searchCardIcon}>
              <Ionicons name="search" size={16} color="#1e3a8a" />
            </View>
            <Text style={styles.searchCardTitle}>Book Your Bus Ticket</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1, gap: 10 }}>
              <View>
                <TouchableOpacity onPress={() => {}} activeOpacity={1} style={styles.inputField}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e" }} />
                    <Text style={styles.inputLabel}>FROM DISTRICT</Text>
                  </View>
                  <TextInput value={from} onChangeText={handleFromChange}
                    onFocus={() => { clearBlurTimeout(); if (from.trim()) { const s = filterSuggestions(from); setFromSuggestions(s); setShowFromSuggestions(s.length > 0); } }}
                    onBlur={handleFromBlur}
                    style={styles.textInput} placeholder="Search your district or city" placeholderTextColor="#94a3b8" underlineColorAndroid="transparent" selectionColor="#1e3a8a" />
                </TouchableOpacity>
                {showFromSuggestions && renderSuggestionList(fromSuggestions, selectFromSuggestion, "from")}
              </View>
              <View>
                <TouchableOpacity onPress={() => {}} activeOpacity={1} style={styles.inputField}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" }} />
                    <Text style={[styles.inputLabel, { color: "#dc2626" }]}>TO DISTRICT</Text>
                  </View>
                  <TextInput value={to} onChangeText={handleToChange}
                    onFocus={() => { clearBlurTimeout(); if (to.trim()) { const s = filterSuggestions(to); setToSuggestions(s); setShowToSuggestions(s.length > 0); } }}
                    onBlur={handleToBlur}
                    style={styles.textInput} placeholder="Search your district or city" placeholderTextColor="#94a3b8" underlineColorAndroid="transparent" selectionColor="#1e3a8a" />
                </TouchableOpacity>
                {showToSuggestions && renderSuggestionList(toSuggestions, selectToSuggestion, "to")}
              </View>
            </View>
            <TouchableOpacity onPress={handleSwap} style={styles.swapBtn}>
              <Ionicons name="swap-vertical" size={18} color="#1e3a8a" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.dateField}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
              <Ionicons name="calendar-outline" size={16} color="#1e3a8a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>DEPARTURE</Text>
              <Text style={styles.dateValue}>{dayjs(date).format("ddd, DD MMM YYYY")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSearch} activeOpacity={0.85} style={styles.searchBtn}>
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.searchBtnText}>Search Buses</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { icon: "bus", label: "Book Bus", color: "#1e3a8a", bg: "#eff6ff" },
              { icon: "wallet-outline", label: "My Wallet", color: "#059669", bg: "#ecfdf5" },
              { icon: "gift-outline", label: "Offers", color: "#d97706", bg: "#fffbeb" },
              { icon: "headset", label: "Support", color: "#dc2626", bg: "#fef2f2" },
            ].map((item, i) => (
              <TouchableOpacity key={i} activeOpacity={0.7} style={styles.quickAction}>
                <View style={[styles.quickActionIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.quickActionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(500)} style={[styles.section, { flexDirection: "row", gap: 10 }]}>
          {[
            { icon: "bus", value: "200+", label: "Daily Buses", color: "#1e3a8a", bg: "#eff6ff" },
            { icon: "map", value: isLoadingRoutes ? "..." : totalRoutes, label: "Routes", color: "#059669", bg: "#ecfdf5" },
            { icon: "people", value: "10K+", label: "Travelers", color: "#d97706", bg: "#fffbeb" },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon} size={18} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={{ marginTop: 8 }}>
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: "#1e3a8a" }} />
              <Text style={styles.sectionTitle}>Popular Routes</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(customer)/popular-routes")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 13, color: "#3b82f6", fontWeight: "800" }}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color="#3b82f6" />
            </TouchableOpacity>
          </Animated.View>

          {isLoadingPopular ? (
            <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator size="large" color="#1e3a8a" /></View>
          ) : popularRoutes?.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}><Text style={{ color: "#94a3b8", fontSize: 14 }}>No routes available</Text></View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 4 }}>
              {popularRoutes.map((route, idx) => (
                <Animated.View key={route.route_id} entering={FadeInUp.duration(800).delay(700 + idx * 100)}>
                  <TouchableOpacity onPress={() => handleRoutePress(route)} activeOpacity={0.9} style={styles.routeCard}>
                    <ImageBackground source={{ uri: route.route_image || `https://source.unsplash.com/featured/?${route.origin},${route.destination},bus` }}
                      style={styles.routeImage} imageStyle={styles.routeImageStyle}>
                      <View style={styles.routeImageOverlay} />
                      <View style={styles.routeCardTop}>
                        <Text style={styles.routeName}>{route.origin} → {route.destination}</Text>
                        <View style={styles.routeBadge}>
                          <Text style={styles.routeBadgeText}>POPULAR</Text>
                        </View>
                      </View>
                    </ImageBackground>
                    <View style={styles.routeFooter}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="time-outline" size={13} color="#94a3b8" />
                        <Text style={styles.routeDuration}>
                          ~{Math.floor(route.duration_minutes / 60)}h{route.duration_minutes % 60 > 0 ? ` ${route.duration_minutes % 60}m` : ""}
                        </Text>
                      </View>
                      <Text style={styles.routePrice}>NPR {parseInt(route.base_price || route.average_revenue || 1200).toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          )}
        </View>

        <Animated.View entering={FadeInUp.duration(800).delay(800)} style={{ marginTop: 28, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: "#059669" }} />
            <Text style={styles.sectionTitle}>Why Choose Us</Text>
          </View>
          <View style={{ gap: 10 }}>
            {[
              { icon: "shield-checkmark", color: "#059669", bg: "#ecfdf5", title: "Safe Travel", desc: "All operators are verified and licensed" },
              { icon: "flash", color: "#d97706", bg: "#fffbeb", title: "Instant Booking", desc: "Confirm your seat in just a few taps" },
              { icon: "headset", color: "#1e3a8a", bg: "#eff6ff", title: "24/7 Support", desc: "We are always here to help you" },
            ].map((item, i) => (
              <Animated.View key={i} entering={FadeInUp.duration(800).delay(900 + i * 80)} style={styles.whyCard}>
                <View style={[styles.whyIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whyTitle}>{item.title}</Text>
                  <Text style={styles.whyDesc}>{item.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#1e40af" />
          <Text style={styles.securityText}>SECURE & ENCRYPTED BOOKING</Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <Animated.View entering={FadeInUp.duration(300)} style={styles.calendarModal}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#0f172a", fontSize: 17, fontWeight: "900" }}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}><Ionicons name="close-circle" size={26} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Calendar onDayPress={(day) => { setDate(day.dateString); setShowCalendar(false); }}
              markedDates={{ [date]: { selected: true, selectedColor: "#1e3a8a" } }} minDate={dayjs().format("YYYY-MM-DD")}
              theme={{ backgroundColor: "#fff", calendarBackground: "#fff", textSectionTitleColor: "#94a3b8", selectedDayBackgroundColor: "#1e3a8a", selectedDayTextColor: "#fff", todayTextColor: "#1e3a8a", dayTextColor: "#0f172a", textDisabledColor: "#cbd5e1", arrowColor: "#1e3a8a", monthTextColor: "#0f172a", textDayFontWeight: "600", textMonthFontWeight: "800", textDayHeaderFontWeight: "700" }} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  topCircle: {
    position: "absolute",
    top: -width * 0.4,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe",
    zIndex: -1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandText: {
    color: "#1e3a8a",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 32,
  },
  headerSubtext: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notifDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  searchCard: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 24,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  searchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  searchCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchCardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
  },
  inputField: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  inputLabel: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  textInput: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
    padding: 0,
    marginLeft: 14,
    outlineColor: "transparent",
  },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
    marginTop: 28,
  },
  dateField: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateLabel: {
    color: "#1e3a8a",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  dateValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  searchBtn: {
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },
  routeCard: {
    width: 240,
    backgroundColor: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  routeImage: {
    height: 110,
    justifyContent: "flex-end",
    padding: 14,
  },
  routeImageStyle: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  routeImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  routeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  routeName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  routeBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  routeFooter: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  routeDuration: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  routePrice: {
    color: "#059669",
    fontSize: 15,
    fontWeight: "800",
  },
  whyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  whyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  whyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  whyDesc: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    backgroundColor: "#eff6ff",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dbeafe",
    gap: 8,
  },
  securityText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1e40af",
    letterSpacing: 1,
  },
  suggestionCard: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: 220,
    overflow: "hidden",
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fafafa",
  },
  suggestionHeaderText: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionSubtext: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 1,
  },
  calendarModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
  },
});
