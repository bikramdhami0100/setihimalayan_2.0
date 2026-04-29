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
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import dayjs from "dayjs";
import { useCustomerData } from "../../context/CustomerContext";

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
  const [activeField, setActiveField] = useState(null);

  const blurTimeoutRef = useRef(null);

  // Extract unique locations from routes data
  const allLocations = useMemo(() => {
    if (!routes || routes.length === 0) return [];
    const locationsSet = new Set();
    routes.forEach((route) => {
      if (route.origin) locationsSet.add(route.origin);
      if (route.destination) locationsSet.add(route.destination);
    });
    return Array.from(locationsSet).sort();
  }, [routes]);

  const filterSuggestions = useCallback(
    (input) => {
      if (!input || input.trim().length === 0) return [];
      const lowerInput = input.toLowerCase();
      return allLocations
        .filter((loc) => loc.toLowerCase().includes(lowerInput))
        .slice(0, 8);
    },
    [allLocations]
  );

  const handleFromChange = (text) => {
    setFrom(text);
    const suggestions = filterSuggestions(text);
    setFromSuggestions(suggestions);
    setShowFromSuggestions(suggestions.length > 0 && text.trim().length > 0);
  };

  const handleToChange = (text) => {
    setTo(text);
    const suggestions = filterSuggestions(text);
    setToSuggestions(suggestions);
    setShowToSuggestions(suggestions.length > 0 && text.trim().length > 0);
  };

  const selectFromSuggestion = (location) => {
    clearBlurTimeout();
    setFrom(location);
    setFromSuggestions([]);
    setShowFromSuggestions(false);
    Keyboard.dismiss();
  };

  const selectToSuggestion = (location) => {
    clearBlurTimeout();
    setTo(location);
    setToSuggestions([]);
    setShowToSuggestions(false);
    Keyboard.dismiss();
  };

  const clearBlurTimeout = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handleFromBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowFromSuggestions(false);
      setActiveField(null);
    }, 300); // increased to allow tap on suggestion
  };

  const handleToBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowToSuggestions(false);
      setActiveField(null);
    }, 300);
  };

  useEffect(() => {
    return () => clearBlurTimeout();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchRoutes({ limit: 100 }), fetchPopularRoutes()]);
      } catch (error) {
        Alert.alert("Network Error", "Could not load routes. Please check your connection.");
      }
    };
    loadData();
  }, []);

  const handleSwap = () => {
    const tempFrom = from;
    const tempTo = to;
    setFrom(tempTo);
    setTo(tempFrom);
    setFromSuggestions([]);
    setToSuggestions([]);
    setShowFromSuggestions(false);
    setShowToSuggestions(false);
  };

  const handleSearch = () => {
    if (!from.trim() || !to.trim()) {
      Alert.alert("Missing Information", "Please enter both origin and destination.");
      return;
    }
    router.push({
      pathname: "/(customer)/search-results/all",
      params: { origin: from.trim(), destination: to.trim(), date },
    });
  };

  const handleRoutePress = (route) => {
    setFrom(route.origin);
    setTo(route.destination);
    setDate(dayjs().format("YYYY-MM-DD"));
    router.push({
      pathname: "/(customer)/search-results/all",
      params: {
        origin: route.origin,
        destination: route.destination,
        date: dayjs().format("YYYY-MM-DD"),
      },
    });
  };

  const displayName = userProfile?.full_name?.split(" ")[0] || "Traveler";
  const totalRoutes = routes?.length || 0;
  const dailyBuses = "200+";
  const isLoadingPopular = loading.popularRoutes;
  const isLoadingRoutes = loading.routes;

  const renderSuggestionList = (suggestions, onSelect) => {
    if (!suggestions.length) return null;
    return (
      <View
        style={{
          marginTop: 8,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "#e2e8f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          maxHeight: 200,
        }}
      >
        <FlatList
          data={suggestions}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f1f5f9",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={18} color="#38bdf8" />
              <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "500" }}>{item}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="always"
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, backgroundColor: "#ffffff" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <View>
              <Text style={{ color: "#38bdf8", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
                SETI HIMALAYAN
              </Text>
              <Text style={{ color: "#0f172a", fontSize: 22, fontWeight: "800", marginTop: 2 }}>
                Hello, {displayName} 👋
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, backgroundColor: "#f1f5f9", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                onPress={() => router.push("/(customer)/notifications")}
              >
                <Ionicons name="notifications-outline" size={20} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ width: 40, height: 40, backgroundColor: "#38bdf8", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                onPress={() => router.push("/(customer)/profile")}
              >
                <Ionicons name="person" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ color: "#475569", fontSize: 14, marginBottom: 20 }}>
            Where would you like to travel today?
          </Text>

          {/* SEARCH CARD */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 24,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
              elevation: 4,
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "stretch", marginBottom: 14 }}>
              <View style={{ flex: 1, gap: 10 }}>
                {/* FROM Field */}
                <View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: activeField === "from" ? "#38bdf8" : "#e2e8f0",
                    }}
                    onPress={() => setActiveField("from")}
                    activeOpacity={1}
                  >
                    <Text style={{ color: "#38bdf8", fontSize: 9, fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>FROM</Text>
                    <TextInput
                      value={from}
                      onChangeText={handleFromChange}
                      onFocus={() => {
                        clearBlurTimeout();
                        setActiveField("from");
                        if (from.trim().length > 0) {
                          const suggestions = filterSuggestions(from);
                          setFromSuggestions(suggestions);
                          setShowFromSuggestions(suggestions.length > 0);
                        }
                      }}
                      onBlur={handleFromBlur}
                      style={{
                        color: "#0f172a",
                        fontSize: 16,
                        fontWeight: "600",
                        padding: 0,
                        outlineColor:"transparent", // ✅ Remove default focus outline
                      }}
                      placeholder="City or stop"
                      placeholderTextColor="#94a3b8"
                      underlineColorAndroid="transparent"   // ✅ Removes default Android underline
                      selectionColor="#38bdf8"              // ✅ Cursor/highlight color
                    />
                  </TouchableOpacity>
                  {showFromSuggestions && renderSuggestionList(fromSuggestions, selectFromSuggestion)}
                </View>

                {/* TO Field */}
                <View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      // outlineColor:"transparent", // ✅ Remove default focus outline
                      borderColor: activeField === "to" ? "#38bdf8" : "#e2e8f0",
                    }}
                    onPress={() => setActiveField("to")}
                    activeOpacity={1}
                  >
                    <Text style={{ color: "#f97316", fontSize: 9, fontWeight: "700", letterSpacing: 1, marginBottom: 4 }}>TO</Text>
                    <TextInput
                      value={to}
                      onChangeText={handleToChange}
                      onFocus={() => {
                        clearBlurTimeout();
                        setActiveField("to");
                        if (to.trim().length > 0) {
                          const suggestions = filterSuggestions(to);
                          setToSuggestions(suggestions);
                          setShowToSuggestions(suggestions.length > 0);
                        }
                      }}
                      onBlur={handleToBlur}
                      style={{
                        color: "#0f172a",
                        fontSize: 16,
                        fontWeight: "600",
                        padding: 0,
                        outlineColor:"transparent", // ✅ Remove default focus outline
                      }}
                      placeholder="City or stop"
                      placeholderTextColor="#94a3b8"
                      underlineColorAndroid="transparent"   // ✅ Removes default Android underline
                      selectionColor="#38bdf8"
                    />
                  </TouchableOpacity>
                  {showToSuggestions && renderSuggestionList(toSuggestions, selectToSuggestion)}
                </View>
              </View>

              {/* Swap Button */}
              <View style={{ width: 44, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity
                  onPress={handleSwap}
                  style={{ width: 36, height: 36, backgroundColor: "#f1f5f9", borderRadius: 18, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="swap-vertical" size={18} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Picker */}
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#38bdf8", fontSize: 9, fontWeight: "700", letterSpacing: 1, marginBottom: 2 }}>DEPARTURE</Text>
                <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: "600" }}>
                  {dayjs(date).format("ddd, DD MMM YYYY")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Search Button */}
            <TouchableOpacity
              onPress={handleSearch}
              style={{
                backgroundColor: "#38bdf8",
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="search" size={18} color="#ffffff" />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Find Buses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STATS ROW */}
        <View style={{ backgroundColor: "#ffffff", flexDirection: "row", paddingHorizontal: 20, paddingBottom: 28, gap: 10 }}>
          {[
            { icon: "bus", value: dailyBuses, label: "Daily Buses" },
            { icon: "map", value: isLoadingRoutes ? "..." : totalRoutes, label: "Routes" },
            { icon: "people", value: "10K+", label: "Travelers" },
          ].map((stat, i) => (
            <View key={i} style={{
              flex: 1,
              backgroundColor: "#f8fafc",
              borderRadius: 16,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#e2e8f0",
            }}>
              <Ionicons name={stat.icon} size={20} color="#38bdf8" />
              <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "800", marginTop: 6 }}>{stat.value}</Text>
              <Text style={{ color: "#64748b", fontSize: 10, marginTop: 2, textAlign: "center" }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* POPULAR ROUTES SECTION */}
        <View style={{ backgroundColor: "#f8fafc", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>Popular Routes</Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/popular-routes")}>
              <Text style={{ fontSize: 13, color: "#38bdf8", fontWeight: "600" }}>See all</Text>
            </TouchableOpacity>
          </View>

          {isLoadingPopular ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
          ) : popularRoutes?.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 14 }}>No popular routes available</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
              {popularRoutes.map((route) => (
                <TouchableOpacity
                  key={route.route_id}
                  onPress={() => handleRoutePress(route)}
                  style={{
                    width: 220,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    overflow: "hidden",
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <ImageBackground
                    source={{
                      uri: route.route_image ||
                        `https://source.unsplash.com/featured/?${route.origin},${route.destination},bus`,
                    }}
                    style={{ height: 110, justifyContent: "flex-end", padding: 10 }}
                    imageStyle={{ borderRadius: 0 }}
                  >
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)" }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>
                        {route.origin} → {route.destination}
                      </Text>
                      <View style={{ backgroundColor: "#38bdf8", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: "#ffffff", fontSize: 9, fontWeight: "800" }}>Popular</Text>
                      </View>
                    </View>
                  </ImageBackground>
                  <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="time-outline" size={13} color="#64748b" />
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        ~{Math.floor(route.duration_minutes / 60)}h {route.duration_minutes % 60 > 0 ? `${route.duration_minutes % 60}m` : ""}
                      </Text>
                    </View>
                    <Text style={{ color: "#f97316", fontSize: 14, fontWeight: "800" }}>
                      NPR {parseInt(route.base_price || route.average_revenue || 1200).toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* WHY CHOOSE US */}
          <View style={{ marginTop: 28, paddingHorizontal: 20, marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 14 }}>Why Seti Himalayan?</Text>
            <View style={{ gap: 10 }}>
              {[
                { icon: "shield-checkmark", color: "#34d399", title: "Safe & Verified", desc: "All operators are licensed & verified" },
                { icon: "flash", color: "#f97316", title: "Instant Confirmation", desc: "Get your e-ticket in seconds" },
                { icon: "headset", color: "#38bdf8", title: "24/7 Support", desc: "We're always here to help you" },
              ].map((item, i) => (
                <View key={i} style={{
                  backgroundColor: "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.color + "18", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* CALENDAR MODAL */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#0f172a", fontSize: 17, fontWeight: "700" }}>Select Departure Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{ [date]: { selected: true, selectedColor: "#38bdf8" } }}
              minDate={dayjs().format("YYYY-MM-DD")}
              theme={{
                backgroundColor: "#ffffff",
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#64748b",
                selectedDayBackgroundColor: "#38bdf8",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#f97316",
                dayTextColor: "#0f172a",
                textDisabledColor: "#cbd5e1",
                arrowColor: "#38bdf8",
                monthTextColor: "#0f172a",
                textDayFontWeight: "600",
                textMonthFontWeight: "800",
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}