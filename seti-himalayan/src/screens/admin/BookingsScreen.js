import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { getSchedules } from '../../api/schedules';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';
import { formatDateTime } from '../../utils/helpers';

export default function BookingsScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();

  const fetchSchedules = async () => {
    try {
      const response = await getSchedules();
      setSchedules(response.data.data.schedules);
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Failed to load schedules', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'cancelled': return colors.error;
      case 'pending_payment': return colors.warning;
      default: return colors.disabled;
    }
  };

  const renderScheduleCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium">{item.origin} → {item.destination}</Text>
        <Text variant="bodySmall">Departure: {formatDateTime(item.departure_time)}</Text>
        <Text variant="bodySmall">Bus: {item.bus_number} ({item.bus_type})</Text>
        <Text variant="bodySmall">Available Seats: {item.available_seats}/{item.total_seats}</Text>
        <Button mode="outlined" onPress={() => Alert.alert('View Bookings', `Show bookings for schedule ${item.id}`)}>
          View Bookings
        </Button>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderScheduleCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No schedules found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: { marginBottom: 12, elevation: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, color: colors.textSecondary },
});