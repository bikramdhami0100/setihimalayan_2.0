import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAdminData } from "../../context/AdminContext";
import {
  getAdminDashboard,
  getDailyRevenue,
  getPopularRoutes,
} from "../../api/reports";
import dayjs from "dayjs";
import axios from "axios";
import { API_URL } from "../../utils/constants";

const BASE_URL = API_URL.replace("/api", "");
const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return "रु 0";
  return `रु ${Number(amount).toLocaleString()}`;
};

const TIME_OPTIONS = [
  { key: "7days", label: "7D", days: 6 },
  { key: "30days", label: "30D", days: 29 },
  { key: "90days", label: "90D", days: 89 },
];

export default function AdminDashboard() {
  const {
    buses, routes, schedules, bookings,
    fetchBuses, fetchRoutes, fetchSchedules, fetchBookings,
  } = useAdminData();

  const [dashboardStats, setDashboardStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(null);
  const [timeframe, setTimeframe] = useState("7days");
  const [activeTab, setActiveTab] = useState("Buses");

  const checkApiHealth = useCallback(async () => {
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    }
  }, []);

  const currentTimeframe = TIME_OPTIONS.find((t) => t.key === timeframe);
  const daysOffset = currentTimeframe?.days || 6;

  const fetchDashboardData = useCallback(async () => {
    try {
      const endDate = dayjs().format("YYYY-MM-DD");
      const startDate = dayjs().subtract(daysOffset, "day").format("YYYY-MM-DD");

      const [dashRes, revRes, popRes] = await Promise.all([
        getAdminDashboard(),
        getDailyRevenue(startDate, endDate),
        getPopularRoutes(),
      ]);

      setDashboardStats(dashRes.data.data);
      setRevenueData(revRes.data.data?.report || []);
      setPopularRoutes(popRes.data.data?.routes || []);
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard. Pull down to retry.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [daysOffset]);

  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    checkApiHealth();
    await fetchDashboardData();
    fetchBuses(true);
    fetchRoutes(true);
    fetchSchedules(true);
    fetchBookings(true);
  };

  const handleTimeframeChange = (key) => {
    if (key === timeframe) return;
    setIsLoading(true);
    setTimeframe(key);
  };

  const maxRevenue = Math.max(
    ...revenueData.map((d) => Number(d.total_revenue) || 0), 1
  );

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(dashboardStats?.total_revenue),
      icon: "cash-outline",
      bg: "#DBEAFE",
      color: "#3b82f6",
    },
    {
      title: "Total Bookings",
      value: dashboardStats?.total_bookings || "0",
      icon: "ticket-outline",
      bg: "#E0E7FF",
      color: "#6366f1",
    },
    {
      title: "Active Users",
      value: dashboardStats?.total_users || "0",
      icon: "people-outline",
      bg: "#CFFAFE",
      color: "#06b6d4",
    },
    {
      title: "Upcoming Trips",
      value: dashboardStats?.upcoming_schedules || "0",
      icon: "calendar-outline",
      bg: "#FEF3C7",
      color: "#d97706",
    },
  ];

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Analyzing data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#1e3a8a"]}
            tintColor="#1e3a8a"
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dashboardTitle}>Dashboard</Text>
            <Text style={styles.dashboardSubtitle}>
              {dayjs().format("dddd, MMMM D, YYYY")}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.apiBadge,
              apiConnected === true && styles.apiBadgeOk,
              apiConnected === false && styles.apiBadgeDown,
              apiConnected === null && styles.apiBadgeChecking,
            ]}
            onPress={checkApiHealth}
          >
            <View
              style={[
                styles.apiDot,
                apiConnected === true && styles.apiDotOk,
                apiConnected === false && styles.apiDotDown,
                apiConnected === null && styles.apiDotChecking,
              ]}
            />
            <Text style={styles.apiBadgeText}>
              {apiConnected === true ? "API OK" : apiConnected === false ? "Down" : "..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Timeframe Selector */}
        <View style={styles.timeframeRow}>
          <Ionicons name="options-outline" size={16} color="#64748B" />
          {TIME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleTimeframeChange(opt.key)}
              style={[
                styles.timeframeBtn,
                timeframe === opt.key && styles.timeframeBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.timeframeBtnText,
                  timeframe === opt.key && styles.timeframeBtnTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: stat.bg }]}>
                <Ionicons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Trends Chart */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Revenue Trends</Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{currentTimeframe?.label}</Text>
            </View>
          </View>
          {revenueData.length > 0 ? (
            <View style={[styles.chartContainer, { height: 140 }]}>
              {revenueData.map((item, idx) => {
                const pct = (Number(item.total_revenue) || 0) / maxRevenue * 100;
                return (
                  <View key={idx} style={styles.chartBarWrap}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${Math.max(pct, 1)}%` },
                        idx === revenueData.length - 1
                          ? styles.chartBarLatest
                          : styles.chartBarPast,
                      ]}
                    />
                    <Text style={styles.chartLabel}>
                      {dayjs(item.date).format("DD/MM")}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No revenue for this period</Text>
            </View>
          )}
        </View>

        {/* Popular Routes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Popular Routes</Text>
            <Text style={styles.cardCount}>{popularRoutes.length}</Text>
          </View>
          {popularRoutes.length > 0 ? (
            popularRoutes.map((route, idx) => {
              const maxBookings = Math.max(
                ...popularRoutes.map((r) => r.booking_count), 1
              );
              const pct = (route.booking_count / maxBookings) * 100;
              return (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.listItemTop}>
                    <View style={styles.listItemLeft}>
                      <MaterialCommunityIcons name="routes" size={14} color="#64748B" />
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {route.origin} → {route.destination}
                      </Text>
                    </View>
                    <View style={styles.listItemRight}>
                      <Text style={styles.listItemCount}>{route.booking_count}</Text>
                      <Text style={styles.listItemUnit}>bookings</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No route data</Text>
            </View>
          )}
        </View>

        {/* Recent Activity Tabs */}
        <View style={styles.card}>
          <View style={styles.tabsHeader}>
            {["Buses", "Routes", "Schedules"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}
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
                  <View key={bus.id} style={styles.tableRow}>
                    <MaterialCommunityIcons name="bus" size={18} color="#1e3a8a" />
                    <View style={styles.tableRowContent}>
                      <Text style={styles.tableRowTitle}>{bus.bus_number}</Text>
                      <Text style={styles.tableRowSubtitle}>
                        {bus.bus_type} · {bus.total_seats} seats
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        bus.status === "active"
                          ? styles.statusDotActive
                          : styles.statusDotInactive,
                      ]}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="bus" size={36} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No buses</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "Routes" && (
            <View>
              {routes.length > 0 ? (
                routes.slice(0, 5).map((route) => (
                  <View key={route.id} style={styles.tableRow}>
                    <MaterialCommunityIcons name="routes" size={18} color="#1e3a8a" />
                    <View style={styles.tableRowContent}>
                      <Text style={styles.tableRowTitle}>
                        {route.origin} → {route.destination}
                      </Text>
                      <Text style={styles.tableRowSubtitle}>
                        {route.distance_km} km · रु {Number(route.base_price).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="routes" size={36} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No routes</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === "Schedules" && (
            <View>
              {schedules.length > 0 ? (
                schedules.slice(0, 5).map((sch) => (
                  <View key={sch.id} style={styles.tableRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#1e3a8a" />
                    <View style={styles.tableRowContent}>
                      <Text style={styles.tableRowTitle}>
                        {sch.origin} → {sch.destination}
                      </Text>
                      <Text style={styles.tableRowSubtitle}>
                        {dayjs(sch.departure_time).format("MMM DD, hh:mm A")} ·{" "}
                        {sch.available_seats} seats left
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        sch.status === "scheduled"
                          ? styles.statusBadgeScheduled
                          : styles.statusBadgeCancelled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          sch.status === "scheduled"
                            ? styles.statusBadgeTextScheduled
                            : styles.statusBadgeTextCancelled,
                        ]}
                      >
                        {sch.status}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="clock-outline" size={36} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No schedules</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#94A3B8", fontWeight: "700", fontSize: 14 },
  scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  /* Header */
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  dashboardTitle: { fontSize: 24, fontWeight: "900", color: "#1E3A8A" },
  dashboardSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 0 },

  /* API Badge */
  apiBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  apiBadgeOk: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  apiBadgeDown: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  apiBadgeChecking: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  apiDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  apiDotOk: { backgroundColor: "#22C55E" },
  apiDotDown: { backgroundColor: "#EF4444" },
  apiDotChecking: { backgroundColor: "#94A3B8" },
  apiBadgeText: { fontSize: 10, fontWeight: "700", color: "#475569", letterSpacing: 0.5 },

  /* Error Banner */
  errorBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#DC2626", fontSize: 12, fontWeight: "600", marginLeft: 8, flex: 1 },

  /* Timeframe Selector */
  timeframeRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  timeframeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 4 },
  timeframeBtnActive: { backgroundColor: "#1E3A8A" },
  timeframeBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  timeframeBtnTextActive: { color: "#FFFFFF" },

  /* Stats Grid */
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 12, width: "48%", borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  statIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  statTitle: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 },
  statValue: { fontSize: 20, fontWeight: "900", color: "#1E293B", marginTop: 2 },

  /* Card */
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#F1F5F9", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginLeft: 8, flex: 1 },
  cardBadge: { backgroundColor: "#E0E7FF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  cardBadgeText: { fontSize: 10, fontWeight: "700", color: "#6366F1" },
  cardCount: { fontSize: 14, fontWeight: "900", color: "#1E3A8A" },

  /* Revenue Chart */
  chartContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 4 },
  chartBarWrap: { alignItems: "center", flex: 1, marginHorizontal: 2 },
  chartBar: { width: "65%", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  chartBarLatest: { backgroundColor: "#1E3A8A" },
  chartBarPast: { backgroundColor: "#DBEAFE" },
  chartLabel: { fontSize: 7, color: "#94A3B8", marginTop: 4 },

  /* List Items */
  listItem: { marginBottom: 14 },
  listItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  listItemLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  listItemTitle: { fontSize: 13, fontWeight: "600", color: "#334155", marginLeft: 6, flex: 1 },
  listItemRight: { flexDirection: "row", alignItems: "baseline" },
  listItemCount: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },
  listItemUnit: { fontSize: 9, color: "#94A3B8", marginLeft: 4 },

  /* Progress Bar */
  progressTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1E3A8A", borderRadius: 999 },

  /* Empty State */
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  emptyText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },

  /* Tabs */
  tabsHeader: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#F1F5F9", marginBottom: 4 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderColor: "transparent" },
  tabBtnActive: { borderColor: "#1E3A8A" },
  tabBtnText: { fontWeight: "600", fontSize: 14, color: "#94A3B8" },
  tabBtnTextActive: { color: "#1E3A8A" },

  /* Table Rows */
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#F8FAFC" },
  tableRowContent: { marginLeft: 12, flex: 1 },
  tableRowTitle: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  tableRowSubtitle: { fontSize: 10, color: "#94A3B8" },

  /* Status Dot */
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  statusDotActive: { backgroundColor: "#22C55E" },
  statusDotInactive: { backgroundColor: "#94A3B8" },

  /* Status Badge */
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusBadgeScheduled: { backgroundColor: "#DBEAFE" },
  statusBadgeCancelled: { backgroundColor: "#FEE2E2" },
  statusBadgeText: { fontSize: 9, fontWeight: "700" },
  statusBadgeTextScheduled: { color: "#1D4ED8" },
  statusBadgeTextCancelled: { color: "#B91C1C" },
});
