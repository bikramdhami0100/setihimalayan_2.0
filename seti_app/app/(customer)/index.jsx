import React, { useState, useContext, useRef } from "react";
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
  Animated,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Calendar } from "react-native-calendars";
import dayjs from "dayjs";
import { AuthContext } from "../../context/AuthContext";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

const POPULAR_ROUTES = [
  {
    from: "Kathmandu",
    to: "Pokhara",
    duration: "7h",
    price: "NPR 1,200",
    tag: "Popular",
    tagColor: "#38bdf8",
    img: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&auto=format&fit=crop",
  },
  {
    from: "Kathmandu",
    to: "Chitwan",
    duration: "5h",
    price: "NPR 900",
    tag: "Daily",
    tagColor: "#34d399",
    img: "https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=600&auto=format&fit=crop",
  },
  {
    from: "Pokhara",
    to: "Lumbini",
    duration: "6h",
    price: "NPR 1,100",
    tag: "Express",
    tagColor: "#f97316",
    img: "https://images.unsplash.com/photo-1625813986671-f4a9d66e1827?w=600&auto=format&fit=crop",
  },
];

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const [from, setFrom] = useState("Kathmandu");
  const [to, setTo] = useState("Pokhara");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'from' | 'to'

  const displayName = user?.name?.split(" ")[0] || "Traveler";

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSearch = () => {
    if (!from.trim() || !to.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(customer)/search-results/all",
      params: { origin: from.trim(), destination: to.trim(), date },
    });
  };

  const handleRoutePress = (route) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrom(route.from);
    setTo(route.to);
    setDate(dayjs().format("YYYY-MM-DD"));
    router.push({
      pathname: "/(customer)/search-results/all",
      params: { origin: route.from, destination: route.to, date: dayjs().format("YYYY-MM-DD") },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ─── HERO HEADER ─── */}
        <View style={{ backgroundColor: "#0f172a", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
          {/* Top bar */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text style={{ color: "#94a3b8", fontSize: 12, fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase" }}>
                SETI HIMALAYAN
              </Text>
              <Text style={{ color: "#f1f5f9", fontSize: 22, fontWeight: "800", marginTop: 2 }}>
                Hello, {displayName} 👋
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, backgroundColor: "#1e293b", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                onPress={() => router.push("/(customer)/profile")}
              >
                <Ionicons name="notifications-outline" size={20} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ width: 40, height: 40, backgroundColor: "#38bdf8", borderRadius: 12, alignItems: "center", justifyContent: "center" }}
                onPress={() => router.push("/(customer)/profile")}
              >
                <Ionicons name="person" size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tagline */}
          <Text style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
            Where would you like to travel today?
          </Text>

          {/* ─── SEARCH CARD ─── */}
          <View style={{
            backgroundColor: "#1e293b",
            borderRadius: 24,
            padding: 20,
            borderWidth: 1,
            borderColor: "#334155",
            shadowColor: "#38bdf8",
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 8,
          }}>

            {/* From → To with swap */}
            <View style={{ flexDirection: "row", alignItems: "stretch", marginBottom: 14 }}>
              <View style={{ flex: 1, gap: 10 }}>
                {/* FROM */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#0f172a",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: activeField === "from" ? "#38bdf8" : "#334155",
                  }}
                  onPress={() => setActiveField("from")}
                >
                  <Text style={{ color: "#38bdf8", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 }}>FROM</Text>
                  <TextInput
                    value={from}
                    onChangeText={setFrom}
                    onFocus={() => setActiveField("from")}
                    onBlur={() => setActiveField(null)}
                    style={{ color: "#f1f5f9", fontSize: 16, fontWeight: "700", padding: 0 }}
                    placeholder="City or stop"
                    placeholderTextColor="#475569"
                  />
                </TouchableOpacity>

                {/* TO */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#0f172a",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderWidth: 1,
                    borderColor: activeField === "to" ? "#38bdf8" : "#334155",
                  }}
                  onPress={() => setActiveField("to")}
                >
                  <Text style={{ color: "#f97316", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 }}>TO</Text>
                  <TextInput
                    value={to}
                    onChangeText={setTo}
                    onFocus={() => setActiveField("to")}
                    onBlur={() => setActiveField(null)}
                    style={{ color: "#f1f5f9", fontSize: 16, fontWeight: "700", padding: 0 }}
                    placeholder="City or stop"
                    placeholderTextColor="#475569"
                  />
                </TouchableOpacity>
              </View>

              {/* Swap button */}
              <View style={{ width: 44, alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity
                  onPress={handleSwap}
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: "#334155",
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "#475569",
                  }}
                >
                  <Ionicons name="swap-vertical" size={18} color="#38bdf8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date picker */}
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={{
                backgroundColor: "#0f172a",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: "#334155",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#38bdf8" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#38bdf8", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 2 }}>DEPARTURE</Text>
                <Text style={{ color: "#f1f5f9", fontSize: 15, fontWeight: "700" }}>
                  {dayjs(date).format("ddd, DD MMM YYYY")}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color="#475569" />
            </TouchableOpacity>

            {/* Search button */}
            <TouchableOpacity
              onPress={handleSearch}
              style={{
                backgroundColor: "#38bdf8",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="search" size={18} color="#0f172a" />
              <Text style={{ color: "#0f172a", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 }}>Find Buses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── STATS ROW ─── */}
        <View style={{ backgroundColor: "#0f172a", flexDirection: "row", paddingHorizontal: 20, paddingBottom: 28, gap: 10 }}>
          {[
            { icon: "bus", value: "200+", label: "Daily Buses" },
            { icon: "map", value: "50+", label: "Routes" },
            { icon: "people", value: "10K+", label: "Travelers" },
          ].map((stat, i) => (
            <View key={i} style={{
              flex: 1,
              backgroundColor: "#1e293b",
              borderRadius: 16,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#334155",
            }}>
              <Ionicons name={stat.icon} size={20} color="#38bdf8" />
              <Text style={{ color: "#f1f5f9", fontSize: 16, fontWeight: "800", marginTop: 6 }}>{stat.value}</Text>
              <Text style={{ color: "#64748b", fontSize: 10, marginTop: 2, textAlign: "center" }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ─── POPULAR ROUTES ─── */}
        <View style={{ backgroundColor: "#f8fafc", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 28 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a" }}>Popular Routes</Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 13, color: "#38bdf8", fontWeight: "600" }}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
            {POPULAR_ROUTES.map((route, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleRoutePress(route)}
                style={{
                  width: 220,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                <ImageBackground
                  source={{ uri: route.img }}
                  style={{ height: 110, justifyContent: "flex-end", padding: 10 }}
                  imageStyle={{ borderRadius: 0 }}
                >
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.45)" }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800" }}>{route.from} → {route.to}</Text>
                    <View style={{ backgroundColor: route.tagColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ color: "#0f172a", fontSize: 9, fontWeight: "800" }}>{route.tag}</Text>
                    </View>
                  </View>
                </ImageBackground>
                <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="time-outline" size={13} color="#64748b" />
                    <Text style={{ color: "#64748b", fontSize: 12 }}>{route.duration}</Text>
                  </View>
                  <Text style={{ color: "#f97316", fontSize: 14, fontWeight: "800" }}>{route.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ─── WHY CHOOSE US ─── */}
          <View style={{ marginTop: 28, paddingHorizontal: 20, marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 14 }}>Why Seti Himalayan?</Text>
            <View style={{ gap: 10 }}>
              {[
                { icon: "shield-checkmark", color: "#34d399", title: "Safe & Verified", desc: "All operators are licensed & verified" },
                { icon: "flash", color: "#f97316", title: "Instant Confirmation", desc: "Get your e-ticket in seconds" },
                { icon: "headset", color: "#38bdf8", title: "24/7 Support", desc: "We're always here to help you" },
              ].map((item, i) => (
                <View key={i} style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}>
                  <View style={{
                    width: 44, height: 44,
                    borderRadius: 14,
                    backgroundColor: item.color + "18",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
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

      {/* ─── CALENDAR MODAL ─── */}
      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{ backgroundColor: "#1e293b", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "#f1f5f9", fontSize: 17, fontWeight: "700" }}>Select Departure Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close-circle" size={28} color="#475569" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setDate(day.dateString);
                setShowCalendar(false);
              }}
              markedDates={{
                [date]: { selected: true, selectedColor: "#38bdf8" },
              }}
              minDate={dayjs().format("YYYY-MM-DD")}
              theme={{
                backgroundColor: "#1e293b",
                calendarBackground: "#1e293b",
                textSectionTitleColor: "#64748b",
                selectedDayBackgroundColor: "#38bdf8",
                selectedDayTextColor: "#0f172a",
                todayTextColor: "#f97316",
                dayTextColor: "#f1f5f9",
                textDisabledColor: "#334155",
                arrowColor: "#38bdf8",
                monthTextColor: "#f1f5f9",
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
