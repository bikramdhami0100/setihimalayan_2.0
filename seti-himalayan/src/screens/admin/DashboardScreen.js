import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { getAdminDashboard } from '../../api/reports';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';
import StatsCard from '../../components/dashboard/StatsCard';
import RevenueChart from '../../components/dashboard/RevenueChart';
import PopularRoutesChart from '../../components/dashboard/PopularRoutesChart';

export default function DashboardScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();

  const fetchDashboard = async () => {
    try {
      const response = await getAdminDashboard();
      setDashboardData(response.data.data);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Dashboard</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Welcome back, Admin</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatsCard
          title="Total Bookings"
          value={dashboardData?.total_bookings || 0}
          icon="ticket"
          color={colors.primary}
        />
        <StatsCard
          title="Total Revenue"
          value={`NPR ${dashboardData?.total_revenue?.toLocaleString() || 0}`}
          icon="currency-usd"
          color={colors.success}
        />
        <StatsCard
          title="Upcoming Schedules"
          value={dashboardData?.upcoming_schedules || 0}
          icon="calendar"
          color={colors.warning}
        />
        <StatsCard
          title="Total Users"
          value={dashboardData?.total_users || 0}
          icon="account"
          color={colors.secondary}
        />
      </View>

      <View style={styles.chartsContainer}>
        <RevenueChart />
        <PopularRoutesChart />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 10 },
  title: { color: colors.text, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 10 },
  chartsContainer: { padding: 16 },
});