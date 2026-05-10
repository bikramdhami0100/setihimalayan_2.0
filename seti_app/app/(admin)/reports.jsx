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
import dayjs from "dayjs";
import axios from "axios";
import { API_URL } from "../../utils/constants";
import {
  getAdminDashboard,
  getDailyRevenue,
  getPopularRoutes,
  getBookingStats,
  getUtilizationReport,
} from "../../api/reports";

const BASE_URL = API_URL.replace("/api", "");

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return "रु 0";
  return `रु ${Number(amount).toLocaleString()}`;
};

const TIME_OPTIONS = [
  { key: "7days", label: "7 Days", days: 6 },
  { key: "30days", label: "30 Days", days: 29 },
  { key: "90days", label: "90 Days", days: 89 },
];

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [apiConnected, setApiConnected] = useState(null); // null=checking, true=ok, false=down
  const [timeframe, setTimeframe] = useState("30days");

  const [dashboardStats, setDashboardStats] = useState(null);
  const [bookingStats, setBookingStats] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [popularRoutes, setPopularRoutes] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  const checkApiHealth = useCallback(async () => {
    try {
      await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      setApiConnected(true);
    } catch {
      setApiConnected(false);
    }
  }, []);

  const currentTimeframe = TIME_OPTIONS.find((t) => t.key === timeframe);
  const daysOffset = currentTimeframe?.days || 29;

  const fetchData = useCallback(async () => {
    try {
      const endDate = dayjs().format("YYYY-MM-DD");
      const startDate = dayjs()
        .subtract(daysOffset, "day")
        .format("YYYY-MM-DD");

      const [dashRes, statsRes, utilRes, popRes, revRes] = await Promise.all([
        getAdminDashboard(),
        getBookingStats(startDate, endDate),
        getUtilizationReport(),
        getPopularRoutes(),
        getDailyRevenue(startDate, endDate),
      ]);

      setDashboardStats(dashRes.data.data);
      setBookingStats(statsRes.data.data?.stats || []);
      setUtilization(utilRes.data.data?.utilization || []);
      setPopularRoutes(popRes.data.data?.routes || []);
      setRevenueData(revRes.data.data?.report || []);
      setError(null);
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError("Failed to load reports. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [daysOffset]);

  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    setError(null);
    Promise.all([checkApiHealth(), fetchData()]);
  };

  const handleTimeframeChange = (key) => {
    if (key === timeframe) return;
    setLoading(true);
    setTimeframe(key);
  };

  const totalBookings = bookingStats.reduce(
    (s, d) => s + (d.total_bookings || 0), 0
  );
  const totalConfirmed = bookingStats.reduce(
    (s, d) => s + (d.confirmed_bookings || 0), 0
  );
  const totalCancelled = bookingStats.reduce(
    (s, d) => s + (d.cancelled_bookings || 0), 0
  );
  const totalRevenue = bookingStats.reduce(
    (s, d) => s + Number(d.total_revenue || 0), 0
  );
  const conversionRate =
    totalBookings > 0
      ? ((totalConfirmed / totalBookings) * 100).toFixed(1)
      : "0";

  const maxRevenue = Math.max(
    ...revenueData.map((d) => Number(d.total_revenue) || 0), 1
  );
  const maxBookingsDay = Math.max(
    ...bookingStats.map((d) => d.total_bookings || 0), 1
  );
  const maxUtilization = Math.max(
    ...utilization.map((u) => Number(u.avg_occupancy) || 0), 1
  );
  const maxRouteBookings = Math.max(
    ...popularRoutes.map((r) => r.booking_count || 0), 1
  );

  const summaryCards = [
    {
      label: "Total Bookings",
      value: totalBookings.toLocaleString(),
      icon: "ticket-outline",
      bg: "#E0E7FF",
      color: "#6366F1",
    },
    {
      label: "Confirmed",
      value: totalConfirmed.toLocaleString(),
      icon: "checkmark-circle-outline",
      bg: "#D1FAE5",
      color: "#10B981",
    },
    {
      label: "Cancelled",
      value: totalCancelled.toLocaleString(),
      icon: "close-circle-outline",
      bg: "#FEE2E2",
      color: "#EF4444",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: "cash-outline",
      bg: "#DBEAFE",
      color: "#3B82F6",
    },
  ];

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Loading reports...</Text>
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1e3a8a"]}
            tintColor="#1e3a8a"
          />
        }
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.pageTitle}>Reports</Text>
            <Text style={styles.pageSubtitle}>
              {dayjs().format("dddd, MMMM D, YYYY")}
            </Text>
          </View>
          {/* API Status Badge */}
          <TouchableOpacity
            style={[
              styles.apiBadge,
              apiConnected === true && styles.apiBadgeOk,
              apiConnected === false && styles.apiBadgeDown,
              apiConnected === null && styles.apiBadgeChecking,
            ]}
            onPress={() => { checkApiHealth(); }}
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
              {apiConnected === true ? "API OK" : apiConnected === false ? "API Down" : "..."}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Error Banner ─────────────────────────────────── */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Timeframe Selector ───────────────────────────── */}
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

        {/* ── Summary Cards ────────────────────────────────── */}
        <View style={styles.statsGrid}>
          {summaryCards.map((card, idx) => (
            <View key={idx} style={styles.statCard}>
              <View style={[styles.statIconBox, { backgroundColor: card.bg }]}>
                <Ionicons name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Revenue Trend Chart (Dashboard Style) ────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Revenue Trend</Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>
                {timeframe === "7days" ? "7D" : timeframe === "30days" ? "30D" : "90D"}
              </Text>
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
                        {
                          height: `${Math.max(pct, 1)}%`,
                        },
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
              <Text style={styles.emptyText}>No revenue data for this period</Text>
            </View>
          )}
        </View>

        {/* ── Daily Bookings Trend Chart ───────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="chart-bar"
              size={20}
              color="#1E3A8A"
            />
            <Text style={styles.cardTitle}>Daily Bookings</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendDotConfirmed} />
              <Text style={styles.legendText}>Confirmed</Text>
              <View style={[styles.legendDot, { backgroundColor: "#FCA5A5" }]} />
              <Text style={styles.legendText}>Cancelled</Text>
            </View>
          </View>
          {bookingStats.length > 0 ? (
            <View style={[styles.chartContainer, { height: 140 }]}>
              {bookingStats.map((item, idx) => {
                const confPct =
                  (item.confirmed_bookings || 0) / maxBookingsDay * 100;
                const cancPct =
                  (item.cancelled_bookings || 0) / maxBookingsDay * 100;
                return (
                  <View key={idx} style={styles.chartBarWrap}>
                    <View style={styles.stackedBar}>
                      <View
                        style={[
                          styles.stackedBarSegment,
                          {
                            height: `${Math.max(confPct, 0)}%`,
                            backgroundColor: "#10B981",
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.stackedBarSegment,
                          {
                            height: `${Math.max(cancPct, 0)}%`,
                            backgroundColor: "#FCA5A5",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartLabel}>
                      {dayjs(item.date).format("DD/MM")}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="chart-bar"
                size={36}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>No booking data for this period</Text>
            </View>
          )}
        </View>

        {/* ── Conversion Rate ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="percent" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Conversion Rate</Text>
          </View>
          <View style={styles.conversionRow}>
            <Text style={styles.conversionNum}>{conversionRate}%</Text>
            <View style={styles.conversionBarOuter}>
              <View
                style={[
                  styles.conversionBarFill,
                  { width: `${Math.min(conversionRate, 100)}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.conversionMeta}>
            <Ionicons name="information-circle-outline" size={12} color="#94A3B8" />
            <Text style={styles.conversionMetaText}>
              {totalConfirmed} confirmed of {totalBookings} total
            </Text>
          </View>
        </View>

        {/* ── Popular Routes ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Popular Routes</Text>
            <Text style={styles.cardCount}>{popularRoutes.length}</Text>
          </View>
          {popularRoutes.length > 0 ? (
            popularRoutes.slice(0, 6).map((route, idx) => {
              const pct = (route.booking_count / maxRouteBookings) * 100;
              return (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.listItemTop}>
                    <View style={styles.listItemLeft}>
                      <MaterialCommunityIcons
                        name="routes"
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {route.origin} → {route.destination}
                      </Text>
                    </View>
                    <Text style={styles.listItemRight}>{route.booking_count}</Text>
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
              <Text style={styles.emptyText}>No popular routes data</Text>
            </View>
          )}
        </View>

        {/* ── Bus Utilization ──────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bus-outline" size={20} color="#1E3A8A" />
            <Text style={styles.cardTitle}>Bus Utilization</Text>
            <Text style={styles.cardBadgeText}>30 days</Text>
          </View>
          {utilization.length > 0 ? (
            utilization.map((item, idx) => {
              const occ = Number(item.avg_occupancy || 0);
              const occPct = occ.toFixed(1);
              const barPct = (occ / maxUtilization) * 100;
              const barColor =
                occ >= 70 ? "#10B981" : occ >= 40 ? "#F59E0B" : "#EF4444";
              return (
                <View key={idx} style={styles.listItem}>
                  <View style={styles.listItemTop}>
                    <View style={styles.listItemLeft}>
                      <MaterialCommunityIcons
                        name="bus"
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.listItemTitle}>{item.bus_number}</Text>
                    </View>
                    <Text style={[styles.listItemRight, { color: barColor }]}>
                      {occPct}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(barPct, 100)}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.utilMeta}>
                    {item.total_passengers || 0} passengers · {item.total_schedules || 0} trips
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No utilization data</Text>
            </View>
          )}
        </View>

        {/* ── Platform Overview ────────────────────────────── */}
        {dashboardStats && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="grid-outline" size={20} color="#1E3A8A" />
              <Text style={styles.cardTitle}>Platform Overview</Text>
            </View>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.overviewValue}>
                  {dashboardStats.upcoming_schedules || 0}
                </Text>
                <Text style={styles.overviewLabel}>Upcoming Trips</Text>
              </View>
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="people-outline" size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.overviewValue}>
                  {dashboardStats.total_users || 0}
                </Text>
                <Text style={styles.overviewLabel}>Total Users</Text>
              </View>
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: "#D1FAE5" }]}>
                  <Ionicons name="cash-outline" size={22} color="#10B981" />
                </View>
                <Text style={styles.overviewValue}>
                  {formatCurrency(dashboardStats.total_revenue)}
                </Text>
                <Text style={styles.overviewLabel}>Lifetime Revenue</Text>
              </View>
              <View style={styles.overviewItem}>
                <View style={[styles.overviewIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="ticket-outline" size={22} color="#D97706" />
                </View>
                <Text style={styles.overviewValue}>
                  {dashboardStats.total_bookings || 0}
                </Text>
                <Text style={styles.overviewLabel}>All-time Bookings</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  centerContainer: { flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#94A3B8", fontWeight: "700", fontSize: 14 },
  scrollContent: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  /* Header */
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  headerLeft: { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: "900", color: "#1E3A8A" },
  pageSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

  /* API Badge */
  apiBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  apiBadgeOk: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  apiBadgeDown: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  apiBadgeChecking: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  apiDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  apiDotOk: { backgroundColor: "#22C55E" },
  apiDotDown: { backgroundColor: "#EF4444" },
  apiDotChecking: { backgroundColor: "#94A3B8" },
  apiBadgeText: { fontSize: 10, fontWeight: "700", color: "#475569", letterSpacing: 0.5 },

  /* Error Banner */
  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { color: "#DC2626", fontSize: 12, fontWeight: "600", marginLeft: 8, flex: 1 },

  /* Timeframe Selector */
  timeframeRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", borderRadius: 12,
    padding: 4, marginBottom: 16,
    borderWidth: 1, borderColor: "#F1F5F9",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  timeframeBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginLeft: 4,
  },
  timeframeBtnActive: { backgroundColor: "#1E3A8A" },
  timeframeBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  timeframeBtnTextActive: { color: "#FFFFFF" },

  /* Stats Grid */
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    marginBottom: 12, width: "48%",
    borderWidth: 1, borderColor: "#F1F5F9",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: "900", color: "#1E293B" },
  statLabel: {
    fontSize: 10, fontWeight: "700", color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 2,
  },

  /* Card */
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    marginBottom: 16,
    borderWidth: 1, borderColor: "#F1F5F9",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", marginBottom: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginLeft: 8, flex: 1 },
  cardBadge: {
    backgroundColor: "#E0E7FF", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  cardBadgeText: { fontSize: 10, fontWeight: "700", color: "#6366F1" },
  cardCount: { fontSize: 14, fontWeight: "900", color: "#1E3A8A" },

  /* Legend */
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  legendDotConfirmed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" },
  legendText: { fontSize: 9, color: "#94A3B8", marginLeft: 4, fontWeight: "600" },

  /* Revenue Chart (Dashboard Style) */
  chartContainer: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", paddingHorizontal: 4,
  },
  chartBarWrap: { alignItems: "center", flex: 1, marginHorizontal: 2 },
  chartBar: {
    width: "65%", borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  chartBarLatest: { backgroundColor: "#1E3A8A" },
  chartBarPast: { backgroundColor: "#DBEAFE" },
  chartLabel: { fontSize: 7, color: "#94A3B8", marginTop: 4 },

  /* Stacked Bar for Bookings */
  stackedBar: {
    width: "70%", flex: 1,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    overflow: "hidden",
  },
  stackedBarSegment: {
    width: "100%",
  },

  /* Conversion */
  conversionRow: { flexDirection: "row", alignItems: "center" },
  conversionNum: { fontSize: 34, fontWeight: "900", color: "#1E3A8A", marginRight: 16 },
  conversionBarOuter: {
    flex: 1, height: 10, backgroundColor: "#F1F5F9",
    borderRadius: 999, overflow: "hidden",
  },
  conversionBarFill: { height: "100%", backgroundColor: "#1E3A8A", borderRadius: 999 },
  conversionMeta: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  conversionMetaText: { fontSize: 10, color: "#94A3B8", marginLeft: 4, fontWeight: "500" },

  /* List Items */
  listItem: { marginBottom: 14 },
  listItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  listItemLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  listItemTitle: { fontSize: 13, fontWeight: "600", color: "#334155", marginLeft: 6, flex: 1 },
  listItemRight: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },

  /* Progress Bar */
  progressTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#1E3A8A", borderRadius: 999 },

  /* Util Meta */
  utilMeta: { fontSize: 9, color: "#94A3B8", marginTop: 4 },

  /* Empty State */
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 28 },
  emptyText: { fontSize: 12, color: "#94A3B8", marginTop: 8 },

  /* Platform Overview */
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  overviewItem: {
    width: "48%", alignItems: "center", paddingVertical: 12,
    backgroundColor: "#F8FAFC", borderRadius: 14, marginBottom: 8,
  },
  overviewIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  overviewValue: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginTop: 8 },
  overviewLabel: {
    fontSize: 9, fontWeight: "700", color: "#94A3B8",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 2,
  },
});
