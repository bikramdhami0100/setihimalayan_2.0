import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Text, Card, ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { getDailyRevenue, getBookingStats, getUtilizationReport } from '../../api/reports';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';
import { formatDate } from '../../utils/helpers';

export default function ReportsScreen() {
  const [revenueData, setRevenueData] = useState([]);
  const [statsData, setStatsData] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { showSnackbar } = useUIStore();

  const fetchReports = async () => {
    try {
      const [revenueRes, statsRes, utilRes] = await Promise.all([
        getDailyRevenue(startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]),
        getBookingStats(startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]),
        getUtilizationReport(),
      ]);
      setRevenueData(revenueRes.data.data.report);
      setStatsData(statsRes.data.data.stats);
      setUtilizationData(utilRes.data.data.utilization);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
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
      <View style={styles.dateFilter}>
        <TextInput
          mode="outlined"
          label="Start Date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          style={styles.dateInput}
        />
        <TextInput
          mode="outlined"
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          style={styles.dateInput}
        />
        <Button mode="contained" onPress={fetchReports} style={styles.filterButton}>
          Apply Filter
        </Button>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Daily Revenue</Text>
          {revenueData.map((item, idx) => (
            <View key={idx} style={styles.reportRow}>
              <Text>{item.date}</Text>
              <Text>NPR {item.total_revenue}</Text>
              <Text>Bookings: {item.total_bookings}</Text>
            </View>
          ))}
          {revenueData.length === 0 && <Text>No revenue data</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Booking Statistics</Text>
          {statsData.map((item, idx) => (
            <View key={idx} style={styles.reportRow}>
              <Text>{item.date}</Text>
              <Text>Confirmed: {item.confirmed_bookings}</Text>
              <Text>Cancelled: {item.cancelled_bookings}</Text>
            </View>
          ))}
          {statsData.length === 0 && <Text>No statistics</Text>}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Bus Utilization</Text>
          {utilizationData.map((item, idx) => (
            <View key={idx} style={styles.reportRow}>
              <Text>{item.bus_number} ({item.bus_type})</Text>
              <Text>Avg Occupancy: {Math.round(item.avg_occupancy)}%</Text>
              <Text>Passengers: {item.total_passengers}</Text>
            </View>
          ))}
          {utilizationData.length === 0 && <Text>No utilization data</Text>}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dateFilter: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dateInput: { flex: 1, marginRight: 8 },
  filterButton: { marginTop: 8, alignSelf: 'flex-start' },
  card: { margin: 16, marginTop: 0 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});