// app/dashboard.jsx (or AdminDashboard.jsx)
import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAdminData } from "../../context/AdminContext";
import {
  getAdminDashboard,
  getDailyRevenue,
  getPopularRoutes,
} from "../../api/reports";
import dayjs from "dayjs"; // if not installed: npx expo install dayjs

const { width } = Dimensions.get("window");

// ─── Small helper to format currency ─────────────────────────────────────────
const formatCurrency = (amount) => {
  if (!amount) return "रु 0";
  return `रु ${Number(amount).toLocaleString()}`;
};

// ─── Main Dashboard Component ────────────────────────────────────────────────
export default function AdminDashboard() {
  const {
    buses,
    routes,
    schedules,
    bookings,
    fetchBuses,
    fetchRoutes,
    fetchSchedules,
    fetchBookings,
    loading,
    refreshing,
  } = useAdminData();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);   // { date, revenue }
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState("7days"); // 7days or 30days
  const [activeTab, setActiveTab] = useState("Buses"); // tabs for tables

  // ── Fetch dashboard summary and revenue ──────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    try {
      const dashRes = await getAdminDashboard();
      setDashboardStats(dashRes.data.data);

      // Revenue trend
      const endDate = dayjs().format("YYYY-MM-DD");
      const startDate = dayjs()
        .subtract(revenueTimeframe === "7days" ? 6 : 29, "day")
        .format("YYYY-MM-DD");
      const revRes = await getDailyRevenue(startDate, endDate);
      // API returns { date, total_revenue } array
      setRevenueData(revRes.data.data || []);

      // Popular routes
      const popRes = await getPopularRoutes();
      setPopularRoutes(popRes.data.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [revenueTimeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, revenueTimeframe]);

  // Pull-to-refresh also updates context data
  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    fetchBuses(true);
    fetchRoutes(true);
    fetchSchedules(true);
    fetchBookings(true);
  };

  // ── Stats cards data ─────────────────────────────────────────────────────
  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(dashboardStats?.total_revenue),
      icon: "cash-outline",
      iconBg: "bg-blue-100",
      iconColor: "#3b82f6",
    },
    {
      title: "Total Bookings",
      value: dashboardStats?.total_bookings || "0",
      icon: "ticket-outline",
      iconBg: "bg-indigo-100",
      iconColor: "#6366f1",
    },
    {
      title: "Active Users",
      value: dashboardStats?.active_users || "0",
      icon: "person-outline",
      iconBg: "bg-cyan-100",
      iconColor: "#06b6d4",
    },
    {
      title: "Total Buses",
      value: dashboardStats?.total_buses || "0",
      icon: "bus-outline",
      iconBg: "bg-amber-100",
      iconColor: "#d97706",
    },
  ];

  // ── Render bar chart for revenue ──────────────────────────────────────────
  const renderRevenueChart = () => {
    if (!revenueData.length) return null;

    const maxRevenue = Math.max(...revenueData.map((d) => d.total_revenue), 1);
    return (
      <View className="flex-row justify-between items-end mt-4 px-2" style={{ height: 140 }}>
        {revenueData.map((item, idx) => {
          const height = (item.total_revenue / maxRevenue) * 100;
          return (
            <View key={idx} className="items-center flex-1 mx-0.5">
              <View
                className={`w-full rounded-t-lg ${
                  idx === revenueData.length - 1 ? "bg-[#1e3a8a]" : "bg-[#dbeafe]"
                }`}
                style={{ height: `${height}%` }}
              />
              <Text className="text-[8px] text-gray-400 mt-1">
                {dayjs(item.date).format("DD/MM")}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Initial loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f8fafc] justify-center items-center">
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text className="mt-3 text-gray-400 font-bold text-sm">Analyzing data…</Text>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-[#f8fafc]">
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Text className="text-2xl font-black text-blue-900 mb-1">Dashboard</Text>
        <Text className="text-xs text-gray-400 mb-4">
          {dayjs().format("dddd, MMMM D, YYYY")}
        </Text>

        {/* ── Stats Grid ───────────────────────────────────────── */}
        <View className="flex-row flex-wrap justify-between">
          {stats.map((stat, idx) => (
            <View
              key={idx}
              className="bg-white rounded-2xl p-4 mb-4 w-[48%] shadow-sm border border-gray-100"
            >
              <View
                className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${stat.iconBg}`}
              >
                <Ionicons name={stat.icon} size={20} color={stat.iconColor} />
              </View>
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {stat.title}
              </Text>
              <Text className="text-xl font-black text-slate-800 mt-0.5">
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Revenue Trends (chart) ───────────────────────────── */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-[#1d3557]">Revenue Trends</Text>
            <View className="flex-row bg-gray-100 rounded-full p-1">
              {["7days", "30days"].map((tf) => (
                <TouchableOpacity
                  key={tf}
                  onPress={() => setRevenueTimeframe(tf)}
                  className={`px-3 py-1 rounded-full ${
                    revenueTimeframe === tf ? "bg-[#1e3a8a]" : ""
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      revenueTimeframe === tf ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {tf === "7days" ? "7 Days" : "30 Days"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {revenueData.length > 0 ? (
            renderRevenueChart()
          ) : (
            <View className="h-32 items-center justify-center">
              <Text className="text-gray-400 text-xs">No revenue data available</Text>
            </View>
          )}
        </View>

        {/* ── Popular Routes ────────────────────────────────────── */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
          <Text className="text-base font-bold text-[#1d3557] mb-4">
            Popular Routes
          </Text>
          {popularRoutes.length > 0 ? (
            popularRoutes.map((route, idx) => {
              const maxBookings = Math.max(
                ...popularRoutes.map((r) => r.booking_count),
                1
              );
              const pct = (route.booking_count / maxBookings) * 100;
              return (
                <View key={idx} className="mb-3">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs font-semibold text-gray-700">
                      {route.origin} → {route.destination}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-500">
                      {route.booking_count} bookings
                    </Text>
                  </View>
                  <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-[#1e3a8a] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-xs text-gray-400">No data</Text>
          )}
        </View>

        {/* ── Tabs: Recent Buses / Routes / Schedules ───────────── */}
        <View className="bg-white rounded-3xl mb-6 shadow-sm overflow-hidden border border-gray-100">
          <View className="flex-row border-b border-gray-100 px-2 pt-2">
            {["Buses", "Routes", "Schedules"].map((tab) => (
              <TouchableOpacity
                key={tab}
                className={`px-4 py-3 border-b-2 ${
                  activeTab === tab ? "border-[#1e3a8a]" : "border-transparent"
                }`}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  className={`font-semibold text-sm ${
                    activeTab === tab ? "text-[#1e3a8a]" : "text-gray-400"
                  }`}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "Buses" && (
            <View>
              {buses.length > 0 ? (
                buses.slice(0, 5).map((bus) => (
                  <View
                    key={bus.id}
                    className="flex-row items-center px-5 py-4 border-b border-gray-50"
                  >
                    <MaterialCommunityIcons name="bus" size={18} color="#1e3a8a" />
                    <View className="ml-3 flex-1">
                      <Text className="text-xs font-bold text-slate-800">
                        {bus.bus_number}
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        {bus.bus_type} · {bus.total_seats} seats
                      </Text>
                    </View>
                    <View
                      className={`w-2 h-2 rounded-full ${
                        bus.status === "active" ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                  </View>
                ))
              ) : (
                <Text className="p-4 text-xs text-gray-400 text-center">
                  No buses loaded.
                </Text>
              )}
            </View>
          )}

          {activeTab === "Routes" && (
            <View>
              {routes.length > 0 ? (
                routes.slice(0, 5).map((route) => (
                  <View
                    key={route.id}
                    className="flex-row items-center px-5 py-4 border-b border-gray-50"
                  >
                    <MaterialCommunityIcons
                      name="routes"
                      size={18}
                      color="#1e3a8a"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-xs font-bold text-slate-800">
                        {route.origin} → {route.destination}
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        {route.distance_km} km · {route.base_price} NPR
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="p-4 text-xs text-gray-400 text-center">
                  No routes loaded.
                </Text>
              )}
            </View>
          )}

          {activeTab === "Schedules" && (
            <View>
              {schedules.length > 0 ? (
                schedules.slice(0, 5).map((sch) => (
                  <View
                    key={sch.id}
                    className="flex-row items-center px-5 py-4 border-b border-gray-50"
                  >
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={18}
                      color="#1e3a8a"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-xs font-bold text-slate-800">
                        {sch.origin} → {sch.destination}
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        {dayjs(sch.departure_time).format("MMM DD, hh:mm A")} ·{" "}
                        {sch.available_seats} seats left
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        sch.status === "scheduled"
                          ? "bg-blue-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          sch.status === "scheduled"
                            ? "text-blue-700"
                            : "text-red-700"
                        }`}
                      >
                        {sch.status}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="p-4 text-xs text-gray-400 text-center">
                  No schedules loaded.
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}